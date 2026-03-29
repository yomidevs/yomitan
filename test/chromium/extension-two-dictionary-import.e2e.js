/*
 * Copyright (C) 2023-2025  Yomitan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/* eslint-disable @stylistic/max-statements-per-line, @stylistic/multiline-ternary, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-base-to-string, @typescript-eslint/no-shadow, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, jsdoc/require-jsdoc, no-empty, no-shadow, no-undefined, unicorn/no-useless-undefined, unicorn/prefer-spread */

// @ts-nocheck

import {createServer} from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {existsSync, readFileSync} from 'node:fs';
import {access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {parseJson} from '../../ext/js/core/json.js';
import {safePerformance} from '../../ext/js/core/safe-performance.js';
import {writeCombinedTabbedReport} from '../e2e/report-tabs.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..', '..');
const dictionaryCacheDir = path.join(root, 'builds', 'e2e-dictionary-cache');
const wagahaiHtmlPath = path.join(root, 'test', 'firefox', 'data', 'wagahai-neko.html');
const fallbackJmdictUrl = 'https://github.com/yomidevs/jmdict-yomitan/releases/latest/download/JMdict_english.zip';
const execFileAsync = promisify(execFile);
const browserFlavorRaw = (process.env.MANABITAN_CHROMIUM_BROWSER ?? 'chromium').trim().toLowerCase();
const browserFlavor = (browserFlavorRaw === 'edge' || browserFlavorRaw === 'msedge') ? 'edge' : 'chromium';
const e2eLogTag = `[${browserFlavor}-e2e]`;
const browserChannel = browserFlavor === 'edge' ? 'msedge' : 'chromium';
const expectedLookupDictionaries = ['Jitendex', 'JMdict'];
const extendedLookupDictionaries = ['Jitendex', 'JMdict', 'JMnedict'];
const overlapLookupCandidates = [
    '日本',
    '名前',
    '学生',
    '食べる',
    '見る',
    '行く',
    '言う',
    '猫',
    '水',
    '暗記',
    '人',
    '日',
    '月',
    '本',
    '大',
    '小',
    'する',
    'ある',
    'いる',
    '家',
    '言葉',
    '学校',
    '先生',
    '時間',
    '今日',
];
const lookupWords = ['暗記', '名前', '日本', '学生', '食べる', '見る', '言う', '行く', '水', '猫'];

/**
 * @returns {string | null}
 */
function getEdgeExecutablePath() {
    if (process.platform === 'darwin') {
        return '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
    }
    return null;
}

function fail(message) {
    throw new Error(`${e2eLogTag} ${message}`);
}

function withE2ETag(message) {
    const text = String(message);
    return text.startsWith(`${e2eLogTag} `) ? text : `${e2eLogTag} ${text}`;
}

function errorMessage(value) {
    return value instanceof Error ? value.message : String(value);
}

function parseBooleanEnv(value, defaultValue) {
    if (typeof value !== 'string') {
        return defaultValue;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
        return true;
    }
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
        return false;
    }
    return defaultValue;
}

function resolveInstalledDictionaryTitle(installedTitles, expectedName) {
    if (!Array.isArray(installedTitles)) { return null; }
    for (const title of installedTitles) {
        if (matchesDictionaryName(title, expectedName)) {
            return String(title);
        }
    }
    return null;
}

const strictUnsupportedRuntime = parseBooleanEnv(
    process.env.MANABITAN_E2E_STRICT_RUNTIME,
    parseBooleanEnv(process.env.CI, false),
);
const maxReportLogLinesRaw = Number.parseInt(process.env.MANABITAN_CHROMIUM_E2E_MAX_LOG_LINES ?? '1000', 10);
const maxReportLogLines = Number.isFinite(maxReportLogLinesRaw) && maxReportLogLinesRaw > 0 ? maxReportLogLinesRaw : 1000;
const quickImportBenchmarkMode = parseBooleanEnv(process.env.MANABITAN_E2E_IMPORT_BENCH_QUICK, false);
const stopAfterIsolatedProbes = parseBooleanEnv(process.env.MANABITAN_E2E_STOP_AFTER_ISOLATED_PROBES, false);
const stopAfterUpdate = parseBooleanEnv(process.env.MANABITAN_E2E_STOP_AFTER_UPDATE, false);
const stopAfterCrashRecovery = parseBooleanEnv(process.env.MANABITAN_E2E_STOP_AFTER_CRASH_RECOVERY, false);
const focusedUpdateOnlyMode = stopAfterUpdate || stopAfterCrashRecovery;
const verifyRestartPersistence = parseBooleanEnv(process.env.MANABITAN_E2E_VERIFY_RESTART_PERSISTENCE, true);
const verifyBatchRestartPersistence = parseBooleanEnv(process.env.MANABITAN_E2E_VERIFY_BATCH_RESTART_PERSISTENCE, true);
const verifyCrashRecoveryDuringUpdate = parseBooleanEnv(process.env.MANABITAN_E2E_VERIFY_CRASH_RECOVERY_DURING_UPDATE, true);
const concurrentDbOpenPressureEnabled = (
    !quickImportBenchmarkMode &&
    parseBooleanEnv(process.env.MANABITAN_E2E_DB_OPEN_PRESSURE, true)
);
const contentIntegrityProbeLimitRaw = Number.parseInt(process.env.MANABITAN_E2E_CONTENT_PROBE_LIMIT ?? '', 10);
const contentIntegrityProbeLimit = Number.isFinite(contentIntegrityProbeLimitRaw) && contentIntegrityProbeLimitRaw > 0 ?
    Math.trunc(contentIntegrityProbeLimitRaw) :
    null;
const e2eImportFlagsJsonRaw = process.env.MANABITAN_E2E_IMPORT_FLAGS_JSON;
let e2eImportFlags = null;
if (typeof e2eImportFlagsJsonRaw === 'string') {
    const normalizedImportFlagsJson = e2eImportFlagsJsonRaw.trim();
    if (normalizedImportFlagsJson.length > 0) {
        try {
            const parsedImportFlags = parseJson(normalizedImportFlagsJson);
            if (typeof parsedImportFlags === 'object' && parsedImportFlags !== null && !Array.isArray(parsedImportFlags)) {
                e2eImportFlags = /** @type {Record<string, unknown>} */ (parsedImportFlags);
            } else {
                fail(`MANABITAN_E2E_IMPORT_FLAGS_JSON must be a JSON object, got: ${normalizedImportFlagsJson}`);
            }
        } catch (e) {
            fail(`MANABITAN_E2E_IMPORT_FLAGS_JSON parse failed: ${errorMessage(e)}`);
        }
    }
}
function getUnsupportedRuntimeSkipReason(message) {
    const text = String(message);
    if (text.includes('OPFS runtime unavailable for')) {
        return `${browserFlavor} extension runtime does not expose OPFS VFS in this local launch stack; skipping this lane locally without enabling any OPFS fallback.`;
    }
    if (browserFlavor === 'edge' && text.includes('Edge browser executable was not found')) {
        return 'Microsoft Edge is not installed on this machine; skipping local Edge extension E2E.';
    }
    return '';
}

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatDuration(valueMs) {
    return `${valueMs.toFixed(1)} ms`;
}

function formatMemoryMb(value) {
    return `${value.toFixed(1)} MB`;
}

function createReport() {
    return {
        startedAtIso: new Date().toISOString(),
        status: 'running',
        failureReason: '',
        browserFlavor,
        launchMode: 'unknown',
        runtimeDiagnostics: null,
        skippedVerification: false,
        skipReason: '',
        phases: [],
        logs: [],
    };
}

function createReportJsonSummary(report) {
    return {
        startedAtIso: report.startedAtIso,
        status: report.status,
        failureReason: report.failureReason,
        browserFlavor: report.browserFlavor,
        launchMode: report.launchMode,
        runtimeDiagnostics: report.runtimeDiagnostics,
        skippedVerification: report.skippedVerification,
        skipReason: report.skipReason,
        phaseCount: Array.isArray(report.phases) ? report.phases.length : 0,
        phases: (Array.isArray(report.phases) ? report.phases : []).map((phase) => ({
            name: phase.name,
            details: phase.details,
            durationMs: phase.durationMs,
            resourceUsage: phase.resourceUsage ?? null,
            perfMetrics: phase.perfMetrics ?? null,
            hotspots: Array.isArray(phase.hotspots) ? phase.hotspots : [],
        })),
        logs: Array.isArray(report.logs) ? report.logs : [],
    };
}

function startProcessSampler(pid) {
    if (!(typeof pid === 'number' && Number.isFinite(pid) && pid > 0)) {
        return {
            summarize: () => null,
            stop: async () => {},
        };
    }
    const samples = [];
    let running = false;
    const sampleOnce = async () => {
        if (running) { return; }
        running = true;
        try {
            const {stdout} = await execFileAsync('ps', ['-p', String(pid), '-o', '%cpu=,rss=']);
            const line = stdout.trim().split('\n').find((v) => v.trim().length > 0) || '';
            const [cpuRaw, rssRaw] = line.trim().split(/\s+/);
            const cpuPercent = Number(cpuRaw);
            const rssKb = Number(rssRaw);
            if (Number.isFinite(cpuPercent) && Number.isFinite(rssKb)) {
                samples.push({
                    atMs: safePerformance.now(),
                    cpuPercent,
                    rssMb: rssKb / 1024,
                });
            }
        } catch (_) {
            // Best effort sampling.
        } finally {
            running = false;
        }
    };
    const interval = setInterval(() => { void sampleOnce(); }, 500);
    void sampleOnce();
    return {
        sampleNow: sampleOnce,
        summarize: (startMs, endMs) => {
            const phaseSamples = samples.filter((sample) => sample.atMs >= startMs && sample.atMs <= endMs);
            if (phaseSamples.length === 0) {
                return null;
            }
            const cpuValues = phaseSamples.map((v) => v.cpuPercent);
            const rssValues = phaseSamples.map((v) => v.rssMb);
            return {
                sampleCount: phaseSamples.length,
                avgCpuPercent: cpuValues.reduce((sum, value) => sum + value, 0) / cpuValues.length,
                peakCpuPercent: Math.max(...cpuValues),
                avgRssMb: rssValues.reduce((sum, value) => sum + value, 0) / rssValues.length,
                peakRssMb: Math.max(...rssValues),
            };
        },
        stop: async () => {
            clearInterval(interval);
            await sampleOnce();
        },
    };
}

async function findChromiumPidByProfileDir(profileDir) {
    if (typeof profileDir !== 'string' || profileDir.length === 0) {
        return null;
    }
    try {
        const {stdout} = await execFileAsync('ps', ['-axo', 'pid=,command=']);
        const lines = stdout.split('\n');
        for (const line of lines) {
            if (!line.includes(profileDir)) { continue; }
            if (!line.includes('Chromium') && !line.includes('chrome')) { continue; }
            const match = /^\s*(\d+)\s+/.exec(line);
            if (!match) { continue; }
            const pid = Number(match[1]);
            if (Number.isFinite(pid) && pid > 0) {
                return pid;
            }
        }
    } catch (_) {
        // Best effort PID lookup.
    }
    return null;
}

function summarizeCpuProfile(profile) {
    if (!(profile && typeof profile === 'object')) {
        return [];
    }
    const nodes = Array.isArray(profile.nodes) ? profile.nodes : [];
    const samples = Array.isArray(profile.samples) ? profile.samples : [];
    if (nodes.length === 0 || samples.length === 0) {
        return [];
    }
    const totalSampleCount = samples.length;
    const countByNodeId = new Map();
    for (const sampleNodeId of samples) {
        countByNodeId.set(sampleNodeId, (countByNodeId.get(sampleNodeId) || 0) + 1);
    }
    const rows = [];
    for (const node of nodes) {
        const sampleCount = countByNodeId.get(node.id) || 0;
        if (sampleCount <= 0) { continue; }
        const callFrame = node.callFrame || {};
        const url = String(callFrame.url || '');
        if (!(url.startsWith('chrome-extension://') || url.startsWith('moz-extension://'))) {
            continue;
        }
        rows.push({
            functionName: String(callFrame.functionName || '(anonymous)'),
            url,
            lineNumber: Number(callFrame.lineNumber || 0) + 1,
            sampleCount,
            samplePercentOfPhase: totalSampleCount > 0 ? (sampleCount / totalSampleCount) * 100 : 0,
        });
    }
    rows.sort((a, b) => b.sampleCount - a.sampleCount);
    return rows.slice(0, 10);
}

function getMetric(metrics, name) {
    if (!(metrics && Array.isArray(metrics.metrics))) {
        return null;
    }
    for (const metric of metrics.metrics) {
        if (metric && metric.name === name) {
            const value = Number(metric.value);
            return Number.isFinite(value) ? value : null;
        }
    }
    return null;
}

function getLookupDebugStateView(diagnostics) {
    if (!(diagnostics && typeof diagnostics === 'object')) {
        return null;
    }
    if (diagnostics.offscreenState && typeof diagnostics.offscreenState === 'object') {
        return diagnostics.offscreenState;
    }
    if (diagnostics.localState && typeof diagnostics.localState === 'object') {
        return diagnostics.localState;
    }
    return diagnostics;
}

function summarizePerfMetrics(before, after) {
    if (!before || !after) { return null; }
    const heapBefore = getMetric(before, 'JSHeapUsedSize');
    const heapAfter = getMetric(after, 'JSHeapUsedSize');
    const taskBefore = getMetric(before, 'TaskDuration');
    const taskAfter = getMetric(after, 'TaskDuration');
    return {
        heapUsedBeforeMb: heapBefore === null ? null : heapBefore / (1024 * 1024),
        heapUsedAfterMb: heapAfter === null ? null : heapAfter / (1024 * 1024),
        heapDeltaMb: (heapBefore === null || heapAfter === null) ? null : (heapAfter - heapBefore) / (1024 * 1024),
        taskDurationDeltaMs: (taskBefore === null || taskAfter === null) ? null : (taskAfter - taskBefore) * 1000,
    };
}

function isOpfsRuntimeAvailable(runtimeDiagnostics) {
    if (!(runtimeDiagnostics && typeof runtimeDiagnostics === 'object')) {
        return false;
    }
    const hasStorageDir = runtimeDiagnostics.hasStorageGetDirectory === true;
    const workerRuntimeContext = (
        runtimeDiagnostics.openStorageDiagnostics &&
        typeof runtimeDiagnostics.openStorageDiagnostics === 'object' &&
        !Array.isArray(runtimeDiagnostics.openStorageDiagnostics) &&
        runtimeDiagnostics.openStorageDiagnostics.runtimeContext &&
        typeof runtimeDiagnostics.openStorageDiagnostics.runtimeContext === 'object' &&
        !Array.isArray(runtimeDiagnostics.openStorageDiagnostics.runtimeContext)
    ) ? runtimeDiagnostics.openStorageDiagnostics.runtimeContext : null;
    const hasSyncAccessHandle = (
        runtimeDiagnostics.hasCreateSyncAccessHandle === true ||
        workerRuntimeContext?.hasCreateSyncAccessHandle === true
    );
    const hasSahpoolVfs = runtimeDiagnostics.hasOpfsSahpoolVfs === true;
    const installResult = typeof runtimeDiagnostics.opfsSahpoolInstallResult === 'string' ? runtimeDiagnostics.opfsSahpoolInstallResult : null;
    const mode = typeof runtimeDiagnostics.openStorageMode === 'string' ? runtimeDiagnostics.openStorageMode : null;
    return hasStorageDir && hasSyncAccessHandle && hasSahpoolVfs && installResult !== 'failed' && mode === 'opfs-sahpool';
}

function appendLog(report, level, message) {
    if (!(report && Array.isArray(report.logs))) { return; }
    const line = `[${new Date().toISOString()}] [${level}] ${message}`;
    report.logs.push(line);
    if (report.logs.length > maxReportLogLines) {
        report.logs.shift();
    }
}

function resolveHotspotSourcePath(url) {
    try {
        const parsed = new URL(String(url));
        const extensionPath = parsed.pathname.replace(/^\/+/, '');
        if (extensionPath.length === 0) {
            return null;
        }
        const candidate = path.join(root, 'ext', extensionPath);
        if (existsSync(candidate)) {
            return candidate;
        }
    } catch (_) {
        // Ignore invalid URL.
    }
    return null;
}

function getHotspotSourceView(url, lineNumber) {
    const sourcePath = resolveHotspotSourcePath(url);
    if (sourcePath === null) {
        return null;
    }
    try {
        const raw = readFileSync(sourcePath, 'utf8');
        const lines = raw.split('\n');
        const targetLine = Math.max(1, Math.trunc(Number(lineNumber) || 1));
        const startLine = Math.max(1, targetLine - 10);
        const endLine = Math.min(lines.length, targetLine + 10);
        const lineRows = [];
        for (let line = startLine; line <= endLine; ++line) {
            const content = lines[line - 1] || '';
            lineRows.push({
                line,
                content,
                isHit: line === targetLine,
            });
        }
        return {
            sourcePath,
            startLine,
            endLine,
            targetLine,
            lineRows,
        };
    } catch (_) {
        return null;
    }
}

async function runPhaseProfile(cdpSession, action) {
    if (cdpSession === null) {
        return {result: await action(), hotspots: [], perfMetrics: null};
    }
    let profileBefore = null;
    let profileAfter = null;
    try {
        profileBefore = await cdpSession.send('Performance.getMetrics');
    } catch (_) {
        // Ignore.
    }
    let profilerStarted = false;
    try {
        await cdpSession.send('Profiler.start');
        profilerStarted = true;
    } catch (_) {
        profilerStarted = false;
    }
    let result;
    let caughtError = null;
    try {
        result = await action();
    } catch (error) {
        caughtError = error;
    }
    let profilePayload = null;
    if (profilerStarted) {
        try {
            profilePayload = await cdpSession.send('Profiler.stop');
        } catch (_) {
            profilePayload = null;
        }
    }
    try {
        profileAfter = await cdpSession.send('Performance.getMetrics');
    } catch (_) {
        profileAfter = null;
    }
    const output = {
        result,
        hotspots: summarizeCpuProfile(profilePayload?.profile),
        perfMetrics: summarizePerfMetrics(profileBefore, profileAfter),
    };
    if (caughtError !== null) {
        throw (caughtError instanceof Error ? caughtError : new Error(String(caughtError)));
    }
    return output;
}

async function addReportPhase(report, page, name, details, startMs, endMs, profileData = null, processSampler = null) {
    console.log(`[chromium-e2e] phase: ${name} (${formatDuration(Math.max(0, endMs - startMs))})`);
    if (processSampler !== null && typeof processSampler.sampleNow === 'function') {
        try { await processSampler.sampleNow(); } catch (_) {}
    }
    const screenshotBuffer = await page.screenshot({fullPage: true});
    const resourceUsage = processSampler?.summarize(startMs, endMs) ?? null;
    report.phases.push({
        name,
        details,
        startMs,
        endMs,
        durationMs: Math.max(0, endMs - startMs),
        resourceUsage,
        hotspots: profileData?.hotspots ?? [],
        perfMetrics: profileData?.perfMetrics ?? null,
        screenshotBase64: screenshotBuffer.toString('base64'),
        screenshotMimeType: 'image/png',
    });
}

function renderReportHtml(report) {
    const failureBanner = report.status === 'failure' ? `
  <div class="failure-banner">
    <div class="failure-banner-title">FAILED</div>
    <div class="failure-banner-reason">${escapeHtml(report.failureReason || 'Unknown failure')}</div>
  </div>` : '';
    const warningBanner = report.status === 'success-with-skips' ? `
  <div class="warning-banner">
    <div class="warning-banner-title">PASS WITH SKIPPED VERIFICATION</div>
    <div class="warning-banner-reason">${escapeHtml(report.skipReason || 'Installed/search verification was skipped.')}</div>
  </div>` : '';
    const rows = report.phases.map((phase, index) => {
        const imageUrl = `data:${phase.screenshotMimeType};base64,${phase.screenshotBase64}`;
        const hotspotHtml = phase.hotspots.length === 0 ? 'n/a' : phase.hotspots.map((row, hotspotIndex) => {
            const sourceView = getHotspotSourceView(row.url, row.lineNumber);
            const hotspotId = `hotspot-${String(index + 1)}-${String(hotspotIndex + 1)}`;
            const percent = Number(row.samplePercentOfPhase || 0);
            const estimatedMs = Math.max(0, (percent / 100) * phase.durationMs);
            const label = `${percent.toFixed(1)}% (~${formatDuration(estimatedMs)}) ${row.sampleCount}x ${row.functionName} @ ${row.url}:${String(row.lineNumber)}`;
            if (sourceView === null) {
                return `<div class="hotspot-item"><span>${escapeHtml(label)}</span></div>`;
            }
            const sourceRows = sourceView.lineRows.map((lineRow) => `
                <div class="source-line${lineRow.isHit ? ' source-line-hit' : ''}">
                    <span class="source-line-no">${String(lineRow.line)}</span>
                    <code>${escapeHtml(lineRow.content)}</code>
                </div>
            `).join('\n');
            return `
                <div class="hotspot-item">
                    <button type="button" class="hotspot-link" data-hotspot-target="${hotspotId}">
                        ${escapeHtml(label)}
                    </button>
                    <div id="${hotspotId}" class="hotspot-source" hidden>
                        <div class="hotspot-source-meta">
                            ${escapeHtml(sourceView.sourcePath)}:${String(sourceView.targetLine)} (showing ${String(sourceView.startLine)}-${String(sourceView.endLine)})
                        </div>
                        <div class="hotspot-source-body">${sourceRows}</div>
                    </div>
                </div>
            `;
        }).join('\n');
        return `
            <section class="phase">
                <h2>Phase ${index + 1}: ${escapeHtml(phase.name)}</h2>
                <p><strong>Duration:</strong> ${escapeHtml(formatDuration(phase.durationMs))}</p>
                <p><strong>Details:</strong> ${escapeHtml(phase.details)}</p>
                <p><strong>CPU/RSS:</strong> ${phase.resourceUsage === null ? 'n/a' : escapeHtml(`samples=${String(phase.resourceUsage.sampleCount)} avgCpu=${phase.resourceUsage.avgCpuPercent.toFixed(1)}% peakCpu=${phase.resourceUsage.peakCpuPercent.toFixed(1)}% avgRss=${formatMemoryMb(phase.resourceUsage.avgRssMb)} peakRss=${formatMemoryMb(phase.resourceUsage.peakRssMb)}`)}</p>
                <p><strong>JS Heap/Task:</strong> ${phase.perfMetrics === null ? 'n/a' : escapeHtml(`heapBefore=${phase.perfMetrics.heapUsedBeforeMb === null ? 'n/a' : formatMemoryMb(phase.perfMetrics.heapUsedBeforeMb)} heapAfter=${phase.perfMetrics.heapUsedAfterMb === null ? 'n/a' : formatMemoryMb(phase.perfMetrics.heapUsedAfterMb)} heapDelta=${phase.perfMetrics.heapDeltaMb === null ? 'n/a' : formatMemoryMb(phase.perfMetrics.heapDeltaMb)} taskDelta=${phase.perfMetrics.taskDurationDeltaMs === null ? 'n/a' : formatDuration(phase.perfMetrics.taskDurationDeltaMs)}`)}</p>
                <div><strong>Top JS Hotspots:</strong></div>
                <div class="hotspot-list">${hotspotHtml}</div>
                <img src="${imageUrl}" alt="${escapeHtml(phase.name)} screenshot">
            </section>
        `;
    }).join('\n');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Manabitan Chromium E2E Import Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 24px; color: #1d1d1f; }
    h1 { margin-bottom: 8px; }
    .meta { margin-bottom: 24px; padding: 12px 14px; border-radius: 8px; background: #f5f7fa; }
    .failure-banner { margin: 0 0 18px; padding: 14px 16px; border-radius: 10px; border: 2px solid #ef4444; background: #fee2e2; color: #991b1b; }
    .failure-banner-title { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
    .failure-banner-reason { font-size: 14px; font-weight: 600; white-space: pre-wrap; }
    .warning-banner { margin: 0 0 18px; padding: 14px 16px; border-radius: 10px; border: 2px solid #f59e0b; background: #fef3c7; color: #92400e; }
    .warning-banner-title { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
    .warning-banner-reason { font-size: 14px; font-weight: 600; white-space: pre-wrap; }
    .phase { margin: 0 0 28px; padding: 14px; border: 1px solid #d8dee4; border-radius: 10px; }
    .phase h2 { margin: 0 0 8px; font-size: 18px; }
    .phase p { margin: 6px 0; }
    .hotspot-list { margin: 8px 0 0; }
    .hotspot-item { margin: 6px 0; }
    .hotspot-link { border: 0; background: none; color: #0b57d0; text-decoration: underline; cursor: pointer; padding: 0; font: inherit; text-align: left; }
    .hotspot-source { margin-top: 8px; border: 1px solid #d8dee4; border-radius: 8px; overflow: hidden; background: #0f172a; color: #e2e8f0; }
    .hotspot-source-meta { font-size: 12px; padding: 8px 10px; background: #111827; border-bottom: 1px solid #1f2937; color: #93c5fd; }
    .hotspot-source-body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 12px; overflow-x: auto; }
    .source-line { display: flex; gap: 10px; padding: 2px 10px; white-space: pre; }
    .source-line-hit { background: #7f1d1d; }
    .source-line-no { color: #94a3b8; min-width: 38px; text-align: right; user-select: none; }
    .source-line code { color: inherit; background: none; font: inherit; white-space: pre; }
    img { margin-top: 10px; max-width: 100%; border: 1px solid #d8dee4; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>Manabitan Chromium E2E Import Report</h1>
  ${failureBanner}
  ${warningBanner}
  <div class="meta">
    <div><strong>Started:</strong> ${escapeHtml(report.startedAtIso)}</div>
    <div><strong>Status:</strong> ${escapeHtml(report.status)}</div>
    <div><strong>Failure reason:</strong> ${escapeHtml(report.failureReason || 'none')}</div>
    <div><strong>Recorded phases:</strong> ${report.phases.length}</div>
  </div>
  ${rows}
  <section class="phase">
    <h2>Runner Logs</h2>
    <pre>${escapeHtml((Array.isArray(report.logs) ? report.logs : []).join('\n'))}</pre>
  </section>
  <script>
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) { return; }
      if (!target.classList.contains('hotspot-link')) { return; }
      const viewerId = target.dataset.hotspotTarget || '';
      if (viewerId.length === 0) { return; }
      const viewer = document.getElementById(viewerId);
      if (!(viewer instanceof HTMLElement)) { return; }
      viewer.hidden = !viewer.hidden;
    });
  </script>
</body>
</html>`;
}

async function loadRecommendedDictionaryUrls() {
    const recommendedPath = path.join(root, 'ext', 'data', 'recommended-dictionaries.json');
    const raw = await readFile(recommendedPath, 'utf8');
    const recommended = parseJson(raw);
    const ja = recommended.ja;
    const terms = Array.isArray(ja?.terms) ? ja.terms : [];
    const findDownloadUrl = (name) => {
        for (const item of terms) {
            if (!(item && typeof item === 'object')) { continue; }
            const dictionaryName = String(item.name || '');
            if (dictionaryName !== name) { continue; }
            const url = String(item.downloadUrl || '');
            if (url.length > 0) { return url; }
        }
        return '';
    };
    const jitendexUrl = findDownloadUrl('Jitendex');
    const jmnedictUrl = findDownloadUrl('JMnedict');
    const jmdictUrl = findDownloadUrl('JMdict') || fallbackJmdictUrl;
    if (jitendexUrl.length === 0 || jmnedictUrl.length === 0 || jmdictUrl.length === 0) {
        fail(`Unable to resolve recommended dictionary URLs (jitendex="${jitendexUrl}", jmnedict="${jmnedictUrl}", jmdict="${jmdictUrl}")`);
    }
    return {jitendexUrl, jmnedictUrl, jmdictUrl};
}

async function ensureCachedDownload(url, outputPath) {
    try {
        await access(outputPath);
        return;
    } catch (_) {
        // Download when cache file is missing.
    }
    const response = await fetch(url);
    if (!response.ok) {
        fail(`Failed to download dictionary ${url}: ${String(response.status)} ${response.statusText}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength === 0) {
        fail(`Downloaded empty dictionary archive from ${url}`);
    }
    await writeFile(outputPath, bytes);
}

async function ensureRealDictionaryCache() {
    await mkdir(dictionaryCacheDir, {recursive: true});
    const {jitendexUrl, jmnedictUrl, jmdictUrl} = await loadRecommendedDictionaryUrls();
    const jitendexPath = path.join(dictionaryCacheDir, 'jitendex-yomitan.zip');
    const jmnedictPath = path.join(dictionaryCacheDir, 'JMnedict.zip');
    const jmdictPath = path.join(dictionaryCacheDir, 'JMdict.zip');
    await ensureCachedDownload(jitendexUrl, jitendexPath);
    await ensureCachedDownload(jmnedictUrl, jmnedictPath);
    await ensureCachedDownload(jmdictUrl, jmdictPath);
    return {jitendexPath, jmnedictPath, jmdictPath};
}

async function writeSlowZipResponse(response, body) {
    const chunkCount = 6;
    const chunkSize = Math.max(1, Math.ceil(body.byteLength / chunkCount));
    let offset = 0;
    while (offset < body.byteLength) {
        const nextOffset = Math.min(body.byteLength, offset + chunkSize);
        response.write(body.subarray(offset, nextOffset));
        offset = nextOffset;
        if (offset < body.byteLength) {
            await new Promise((resolve) => {
                setTimeout(resolve, 350);
            });
        }
    }
    response.end();
}

async function startE2ELocalServer(paths) {
    const wagahaiHtml = await readFile(wagahaiHtmlPath);
    const jitendexZip = await readFile(paths.jitendexPath);
    const jmnedictZip = await readFile(paths.jmnedictPath);
    const jmdictZip = await readFile(paths.jmdictPath);
    const server = createServer((request, response) => {
        const requestUrl = request.url || '/';
        const headers = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS'};
        if (request.method === 'OPTIONS') {
            response.writeHead(204, headers);
            response.end();
            return;
        }
        if (requestUrl === '/dictionaries/jitendex.zip') {
            response.writeHead(200, {...headers, 'Content-Type': 'application/zip', 'Content-Length': String(jitendexZip.byteLength)});
            response.end(jitendexZip);
            return;
        }
        if (requestUrl === '/dictionaries/jitendex-slow.zip') {
            response.writeHead(200, {...headers, 'Content-Type': 'application/zip', 'Content-Length': String(jitendexZip.byteLength)});
            void writeSlowZipResponse(response, jitendexZip);
            return;
        }
        if (requestUrl === '/dictionaries/jmdict.zip') {
            response.writeHead(200, {...headers, 'Content-Type': 'application/zip', 'Content-Length': String(jmdictZip.byteLength)});
            response.end(jmdictZip);
            return;
        }
        if (requestUrl === '/dictionaries/jmnedict.zip') {
            response.writeHead(200, {...headers, 'Content-Type': 'application/zip', 'Content-Length': String(jmnedictZip.byteLength)});
            response.end(jmnedictZip);
            return;
        }
        if (requestUrl === '/dictionaries/jmdict-slow.zip') {
            response.writeHead(200, {...headers, 'Content-Type': 'application/zip', 'Content-Length': String(jmdictZip.byteLength)});
            void writeSlowZipResponse(response, jmdictZip);
            return;
        }
        if (requestUrl === '/wagahai-neko.html') {
            response.writeHead(200, {...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': String(wagahaiHtml.byteLength)});
            response.end(wagahaiHtml);
            return;
        }
        response.writeHead(404, {...headers, 'Content-Type': 'text/plain; charset=utf-8'});
        response.end('Not found');
    });
    const address = await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => resolve(server.address()));
    });
    if (!(address && typeof address === 'object' && typeof address.port === 'number')) {
        fail('Failed to bind local E2E HTTP server');
    }
    return {
        baseUrl: `http://127.0.0.1:${String(address.port)}`,
        close: async () => {
            await new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) { reject(error); return; }
                    resolve();
                });
            });
        },
    };
}

async function extractExtensionZip(zipPath) {
    let lastError = null;
    for (let attempt = 1; attempt <= 3; ++attempt) {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'manabitan-chromium-ext-'));
        const zipCopyPath = path.join(dir, 'extension.zip');
        try {
            // Copy first to avoid reading a concurrently-mutated source artifact.
            await copyFile(zipPath, zipCopyPath);
            await execFileAsync('unzip', ['-oq', zipCopyPath, '-d', dir]);
            await rm(zipCopyPath, {force: true});
            return dir;
        } catch (e) {
            lastError = e;
            try { await rm(dir, {recursive: true, force: true}); } catch (_) {}
            if (attempt < 3) {
                await new Promise((resolve) => {
                    setTimeout(resolve, 500);
                });
                continue;
            }
        }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function readExtensionIdFromProfilePreferences(userDataDir, extensionDir) {
    if (typeof userDataDir !== 'string' || userDataDir.length === 0) {
        return null;
    }
    if (typeof extensionDir !== 'string' || extensionDir.length === 0) {
        return null;
    }
    const manifestPath = path.join(extensionDir, 'manifest.json');
    let manifestName = '';
    try {
        const manifestRaw = await readFile(manifestPath, 'utf8');
        const manifest = parseJson(manifestRaw);
        manifestName = String(manifest?.name || '').trim();
    } catch (_) {
        manifestName = '';
    }
    const preferencesCandidates = [
        path.join(userDataDir, 'Default', 'Preferences'),
        path.join(userDataDir, 'Preferences'),
    ];
    for (const preferencesPath of preferencesCandidates) {
        try {
            const raw = await readFile(preferencesPath, 'utf8');
            const preferences = parseJson(raw);
            const settings = preferences?.extensions?.settings;
            if (!(settings && typeof settings === 'object' && !Array.isArray(settings))) {
                continue;
            }
            for (const [candidateId, value] of Object.entries(settings)) {
                if (!(value && typeof value === 'object' && !Array.isArray(value))) {
                    continue;
                }
                const candidatePath = String(value.path || '').trim();
                const normalizedCandidatePath = candidatePath.length > 0 ? path.resolve(userDataDir, candidatePath) : '';
                const manifest = (value.manifest && typeof value.manifest === 'object' && !Array.isArray(value.manifest)) ? value.manifest : null;
                const candidateName = String(manifest?.name || '').trim();
                const pathMatches = normalizedCandidatePath.length > 0 && normalizedCandidatePath === extensionDir;
                const nameMatches = manifestName.length > 0 && candidateName === manifestName;
                if (pathMatches || nameMatches) {
                    return candidateId;
                }
            }
        } catch (_) {
            // Preferences file may not exist yet or may still be mid-write.
        }
    }
    return null;
}

async function discoverExtensionId(context, userDataDir = '', extensionDir = '') {
    const parseIdFromUrl = (url) => {
        const match = /^chrome-extension:\/\/([^/]+)\//.exec(String(url));
        return match ? match[1] : null;
    };

    const fromWorkers = () => {
        for (const worker of context.serviceWorkers()) {
            const id = parseIdFromUrl(worker.url());
            if (id) { return id; }
        }
        return null;
    };

    let id = fromWorkers();
    if (id) { return id; }

    await context.waitForEvent('serviceworker', {timeout: 30000}).catch(() => {});
    id = fromWorkers();
    if (!id) {
        for (const page of context.pages()) {
            id = parseIdFromUrl(page.url());
            if (id) { break; }
        }
    }
    if (!id) {
        id = await readExtensionIdFromProfilePreferences(userDataDir, extensionDir);
    }
    if (!id) {
        fail('Unable to discover Chromium extension ID');
    }
    return id;
}

async function evalSendMessage(page, expression, arg = null) {
    return await page.evaluate(async ({expression, arg}) => {
        const send = (action, params) => new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({action, params}, (response) => {
                const runtimeError = chrome.runtime.lastError;
                if (runtimeError) {
                    reject(new Error(runtimeError.message || String(runtimeError)));
                    return;
                }
                if (response && typeof response === 'object' && 'error' in response) {
                    reject(new Error(JSON.stringify(response.error)));
                    return;
                }
                resolve(response && typeof response === 'object' ? response.result : response);
            });
        });
        if (expression === 'purge') {
            await send('purgeDatabase', undefined);
            const optionsFull = await send('optionsGetFull', undefined);
            const nextOptions = structuredClone(optionsFull);
            for (const profile of nextOptions.profiles || []) {
                if (!profile?.options) { continue; }
                profile.options.dictionaries = [];
            }
            await send('setAllSettings', {value: nextOptions, source: 'chromium-e2e'});
            return {ok: true};
        }
        if (expression === 'backendDiagnostics') {
            const term = String(arg || '打');
            const options0 = await send('optionsGet', {optionsContext: {index: 0}});
            const optionsFull = await send('optionsGetFull', undefined);
            const dictionaryInfo = await send('getDictionaryInfo', undefined);
            const installedTitles = (Array.isArray(dictionaryInfo) ? dictionaryInfo : [])
                .map((row) => String(row?.title || '').trim())
                .filter((value) => value.length > 0);
            const collectTermLookup = async (details) => {
                const termsFind = await send('termsFind', {
                    text: term,
                    details: {
                        primaryReading: '',
                        ...details,
                    },
                    optionsContext: {index: 0},
                });
                const termDictionaryNames = [];
                for (const entry of termsFind?.dictionaryEntries || []) {
                    if (entry?.dictionary) { termDictionaryNames.push(String(entry.dictionary)); }
                    for (const definition of entry?.definitions || []) {
                        if (definition?.dictionary) { termDictionaryNames.push(String(definition.dictionary)); }
                    }
                }
                return {
                    termResultCount: Array.isArray(termsFind?.dictionaryEntries) ? termsFind.dictionaryEntries.length : 0,
                    termDictionaryNames: [...new Set(termDictionaryNames)],
                };
            };
            const termLookupDefault = await collectTermLookup({});
            const termLookupExactNoDeinflect = await collectTermLookup({matchType: 'exact', deinflect: false});
            const termLookupPrefixNoDeinflect = await collectTermLookup({matchType: 'prefix', deinflect: false});
            const enabledDictionaryNames = [];
            for (const row of options0?.dictionaries || []) {
                if (row?.enabled !== true) { continue; }
                const name = String(row?.name || '').trim();
                if (name.length > 0) {
                    enabledDictionaryNames.push(name);
                }
            }
            const dictionaryCounts = await send('getDictionaryCounts', {
                dictionaryNames: installedTitles,
                getTotal: true,
            });
            const debugDictionaryStorageState = await send('debugDictionaryStorageState', undefined);
            const enabledInstalledExactMatches = enabledDictionaryNames.filter((name) => installedTitles.includes(name));
            const debugLookupState = await send('debugDictionaryLookupState', {
                text: term,
                dictionaryNames: enabledInstalledExactMatches,
            });
            const profileSelectorState = (optionsFull?.profiles || []).map((profile) => ({
                id: String(profile?.id || ''),
                mainDictionary: String(profile?.options?.general?.mainDictionary || ''),
                sortFrequencyDictionary: String(profile?.options?.general?.sortFrequencyDictionary || ''),
                dictionaryRows: (profile?.options?.dictionaries || []).map((row) => ({
                    name: String(row?.name || '').trim(),
                    enabled: row?.enabled === true,
                })),
                enabledDictionaryNames: (profile?.options?.dictionaries || [])
                    .filter((row) => row?.enabled === true)
                    .map((row) => String(row?.name || '').trim())
                    .filter((value) => value.length > 0),
            }));
            return {
                dictionaryInfo,
                installedTitles,
                dictionaryCounts,
                debugDictionaryStorageState,
                debugLookupState,
                enabledInstalledExactMatches,
                profileLanguage: String(options0?.general?.language || ''),
                profileMainDictionary: String(options0?.general?.mainDictionary || ''),
                profileSortFrequencyDictionary: String(options0?.general?.sortFrequencyDictionary || ''),
                profileSelectorState,
                profileResultOutputMode: String(options0?.general?.resultOutputMode || ''),
                termResultCount: termLookupDefault.termResultCount,
                termDictionaryNames: termLookupDefault.termDictionaryNames,
                termLookupDiagnostics: {
                    default: termLookupDefault,
                    exactNoDeinflect: termLookupExactNoDeinflect,
                    prefixNoDeinflect: termLookupPrefixNoDeinflect,
                },
                enabledDictionaryNames: [...new Set(enabledDictionaryNames)],
            };
        }
        if (expression === 'backendContentIntegrity') {
            const dictionaryNames = Array.isArray(arg?.dictionaryNames) ? arg.dictionaryNames.map((value) => String(value || '').trim()).filter((value) => value.length > 0) : [];
            const candidatesRaw = Array.isArray(arg?.candidates) ? arg.candidates.map((value) => String(value || '').trim()).filter((value) => value.length > 0) : [];
            const probeLimitRaw = Number(arg?.probeLimit ?? -1);
            const probeLimit = Number.isFinite(probeLimitRaw) && probeLimitRaw > 0 ? Math.trunc(probeLimitRaw) : null;
            const candidates = probeLimit === null ? candidatesRaw : candidatesRaw.slice(0, probeLimit);
            const dictionaryInfo = await send('getDictionaryInfo', undefined);
            const installedTitles = (Array.isArray(dictionaryInfo) ? dictionaryInfo : [])
                .map((row) => String(row?.title || '').trim())
                .filter((value) => value.length > 0);
            const matchesDictionaryName = (observedName, expectedName) => {
                const observed = String(observedName || '').trim();
                const expected = String(expectedName || '').trim();
                if (observed.length === 0 || expected.length === 0) { return false; }
                if (observed === expected) { return true; }
                if (observed.startsWith(`${expected} `) || observed.startsWith(`${expected}.`)) { return true; }
                return observed.includes(expected);
            };
            const resolvedDictionaryNames = dictionaryNames.flatMap((expectedName) => (
                installedTitles.filter((title) => matchesDictionaryName(title, expectedName))
            ));
            const targetDictionaryNames = [...new Set(resolvedDictionaryNames.length > 0 ? resolvedDictionaryNames : dictionaryNames)];
            /** @type {Array<Record<string, unknown>>} */
            const probes = [];
            for (const term of candidates) {
                const diagnostics = await send('debugDictionaryLookupState', {text: term, dictionaryNames: targetDictionaryNames});
                const stateView = (
                    diagnostics && typeof diagnostics === 'object' &&
                    diagnostics.offscreenState && typeof diagnostics.offscreenState === 'object'
                ) ? diagnostics.offscreenState : (
                    diagnostics && typeof diagnostics === 'object' &&
                    diagnostics.localState && typeof diagnostics.localState === 'object'
                ) ? diagnostics.localState : diagnostics;
                const store = stateView?.termContentStoreDebugState;
                const totalLength = Number(store?.totalLength ?? -1);
                const rowSample = Array.isArray(stateView?.rowSample) ? stateView.rowSample : [];
                let inBoundsRowCount = 0;
                let outOfBoundsRowCount = 0;
                let glossaryReadyRowCount = 0;
                let readablePreviewRowCount = 0;
                for (const row of rowSample) {
                    const offset = Number(row?.rawEntryContentOffset ?? -1);
                    const length = Number(row?.rawEntryContentLength ?? -1);
                    const glossaryLength = Number(row?.glossaryLength ?? 0);
                    const preview = String(row?.rawContentPreview ?? '');
                    if (Number.isFinite(offset) && Number.isFinite(length) && offset >= 0 && length > 0 && Number.isFinite(totalLength) && totalLength > 0) {
                        if ((offset + length) <= totalLength) {
                            ++inBoundsRowCount;
                        } else {
                            ++outOfBoundsRowCount;
                        }
                    }
                    if (glossaryLength > 0) {
                        ++glossaryReadyRowCount;
                    }
                    if (preview.length > 0 && preview !== '<read-null>' && preview !== '<read-failed>') {
                        ++readablePreviewRowCount;
                    }
                }
                probes.push({
                    term,
                    dictionaryNames: targetDictionaryNames,
                    requestedDictionaryNames: dictionaryNames,
                    requestedCandidateCount: candidatesRaw.length,
                    attemptedCandidateCount: candidates.length,
                    totalLength: Number.isFinite(totalLength) ? totalLength : null,
                    rowSampleCount: rowSample.length,
                    inBoundsRowCount,
                    outOfBoundsRowCount,
                    glossaryReadyRowCount,
                    readablePreviewRowCount,
                    diagnostics,
                });
                if (outOfBoundsRowCount > 0) {
                    return {ok: false, reason: 'out-of-bounds-entry-content-offsets', probes};
                }
                if (glossaryReadyRowCount > 0 || readablePreviewRowCount > 0) {
                    return {ok: true, probes};
                }
            }
            return {ok: false, reason: 'no-readable-entry-content', probes};
        }
        if (expression === 'enableInstalledDictionaries') {
            const dictionaryInfo = await send('getDictionaryInfo', undefined);
            const installedTitles = (Array.isArray(dictionaryInfo) ? dictionaryInfo : [])
                .map((row) => String(row?.title || '').trim())
                .filter((value) => value.length > 0);
            const optionsFull = await send('optionsGetFull', undefined);
            const nextOptions = structuredClone(optionsFull);
            for (const profile of nextOptions.profiles || []) {
                if (!(profile && profile.options && Array.isArray(profile.options.dictionaries))) {
                    continue;
                }
                const existingByName = new Map();
                for (const row of profile.options.dictionaries) {
                    const name = String(row?.name || '').trim();
                    if (name.length > 0) {
                        existingByName.set(name, row);
                    }
                }
                /** @type {Array<Record<string, unknown>>} */
                const nextDictionaries = [];
                for (const title of installedTitles) {
                    const existing = existingByName.get(title);
                    if (existing && typeof existing === 'object') {
                        existing.enabled = true;
                        if (typeof existing.alias !== 'string') {
                            existing.alias = title;
                        }
                        nextDictionaries.push(existing);
                        continue;
                    }
                    nextDictionaries.push({
                        name: title,
                        alias: title,
                        enabled: true,
                        allowSecondarySearches: false,
                        definitionsCollapsible: 'not-collapsible',
                        partsOfSpeechFilter: true,
                        useDeinflections: true,
                        styles: '',
                    });
                }
                profile.options.dictionaries = nextDictionaries;
                if (profile.options?.general && typeof profile.options.general === 'object') {
                    const sortFrequency = profile.options.general.sortFrequencyDictionary;
                    if (typeof sortFrequency === 'string' && sortFrequency.length > 0 && !installedTitles.includes(sortFrequency)) {
                        profile.options.general.sortFrequencyDictionary = null;
                    }
                }
            }
            await send('setAllSettings', {value: nextOptions, source: 'chromium-e2e'});
            const updatedOptions = await send('optionsGetFull', undefined);
            const profileEnabledDictionaryNames = (updatedOptions?.profiles || []).map((profile) => {
                const names = [];
                for (const row of profile?.options?.dictionaries || []) {
                    if (row?.enabled !== true) { continue; }
                    const name = String(row?.name || '').trim();
                    if (name.length > 0) {
                        names.push(name);
                    }
                }
                return names;
            });
            return {ok: true, installedTitles, profileEnabledDictionaryNames};
        }
        if (expression === 'enableTextScanning') {
            const optionsFull = await send('optionsGetFull', undefined);
            const nextOptions = structuredClone(optionsFull);
            for (const profile of nextOptions.profiles || []) {
                if (!(profile && profile.options)) { continue; }
                if (profile.options.general && typeof profile.options.general === 'object') {
                    profile.options.general.enable = true;
                    profile.options.general.usePopupShadowDom = false;
                }
                if (profile.options.scanning && typeof profile.options.scanning === 'object') {
                    profile.options.scanning.delay = 0;
                    profile.options.scanning.hidePopupOnCursorExit = false;
                    profile.options.scanning.hidePopupOnCursorExitDelay = 0;
                    profile.options.scanning.scanWithoutMousemove = true;
                    profile.options.scanning.inputs = [{
                        include: '',
                        exclude: '',
                        types: {mouse: true, touch: false, pen: false},
                        options: {
                            showAdvanced: false,
                            searchTerms: true,
                            searchKanji: true,
                            scanOnTouchTap: true,
                            scanOnTouchMove: false,
                            scanOnTouchPress: false,
                            scanOnTouchRelease: false,
                            scanOnPenMove: true,
                            scanOnPenHover: false,
                            scanOnPenReleaseHover: false,
                            scanOnPenPress: true,
                            scanOnPenRelease: false,
                            preventTouchScrolling: true,
                            preventPenScrolling: true,
                            minimumTouchTime: 0,
                        },
                    }];
                }
            }
            await send('setAllSettings', {value: nextOptions, source: 'chromium-e2e-enable-text-scanning'});
            const updatedOptions = await send('optionsGetFull', undefined);
            return {
                ok: true,
                profileGeneralEnable: (updatedOptions?.profiles || []).map((profile) => Boolean(profile?.options?.general?.enable)),
                profileUsePopupShadowDom: (updatedOptions?.profiles || []).map((profile) => Boolean(profile?.options?.general?.usePopupShadowDom)),
                profileScanningDelay: (updatedOptions?.profiles || []).map((profile) => Number(profile?.options?.scanning?.delay ?? -1)),
                profileScanningInputs: (updatedOptions?.profiles || []).map((profile) => profile?.options?.scanning?.inputs ?? null),
            };
        }
        if (expression === 'configureRestartProfileMatrix') {
            const optionsFull = await send('optionsGetFull', undefined);
            const nextOptions = structuredClone(optionsFull);
            if (!Array.isArray(nextOptions.profiles) || nextOptions.profiles.length === 0) {
                throw new Error('No profiles available for restart profile matrix');
            }
            if (nextOptions.profiles.length === 1) {
                const baseProfile = structuredClone(nextOptions.profiles[0]);
                baseProfile.id = `${String(baseProfile.id || 'profile')}-restart-matrix`;
                baseProfile.name = `${String(baseProfile.name || 'Profile')} Restart Matrix`;
                nextOptions.profiles.push(baseProfile);
            }
            const installedTitles = (await send('getDictionaryInfo', undefined))
                .map((row) => String(row?.title || '').trim())
                .filter((value) => value.length > 0);
            const primaryTitle = installedTitles[0] || '';
            const secondaryTitle = installedTitles[1] || primaryTitle;
            nextOptions.profiles.forEach((profile, index) => {
                if (!profile?.options) { return; }
                const rows = Array.isArray(profile.options.dictionaries) ? profile.options.dictionaries : [];
                if (index > 0) {
                    profile.options.dictionaries = rows.map((row, rowIndex) => ({
                        ...row,
                        enabled: rowIndex === 0,
                    }));
                }
                if (profile.options.general && typeof profile.options.general === 'object' && index > 0) {
                    if (typeof profile.options.general.mainDictionary !== 'string' || profile.options.general.mainDictionary.length === 0) {
                        profile.options.general.mainDictionary = secondaryTitle;
                    }
                    if (
                        (profile.options.general.sortFrequencyDictionary === null || profile.options.general.sortFrequencyDictionary === '') &&
                        primaryTitle.length > 0
                    ) {
                        profile.options.general.sortFrequencyDictionary = primaryTitle;
                    }
                }
                if (profile.options.general && typeof profile.options.general === 'object' && index === 0) {
                    if (typeof profile.options.general.mainDictionary !== 'string' || profile.options.general.mainDictionary.length === 0) {
                        profile.options.general.mainDictionary = primaryTitle;
                    }
                    if (
                        (profile.options.general.sortFrequencyDictionary === null || profile.options.general.sortFrequencyDictionary === '') &&
                        secondaryTitle.length > 0
                    ) {
                        profile.options.general.sortFrequencyDictionary = secondaryTitle;
                    }
                }
            });
            await send('setAllSettings', {value: nextOptions, source: 'chromium-e2e-restart-profile-matrix'});
            return {ok: true, profileCount: nextOptions.profiles.length};
        }
        if (expression === 'setEnabledDictionaries') {
            const targetNames = (Array.isArray(arg) ? arg : [])
                .map((value) => String(value || '').trim())
                .filter((value) => value.length > 0);
            const optionsFull = await send('optionsGetFull', undefined);
            const nextOptions = structuredClone(optionsFull);
            for (const profile of nextOptions.profiles || []) {
                if (!(profile && profile.options && Array.isArray(profile.options.dictionaries))) {
                    continue;
                }
                /** @type {string[]} */
                const enabledNames = [];
                for (const row of profile.options.dictionaries) {
                    const name = String(row?.name || '').trim();
                    const enabled = targetNames.some((targetName) => (
                        name === targetName ||
                        name.startsWith(`${targetName} `) ||
                        name.startsWith(`${targetName}.`) ||
                        name.includes(targetName)
                    ));
                    if (row && typeof row === 'object') {
                        row.enabled = enabled;
                    }
                    if (enabled && name.length > 0) {
                        enabledNames.push(name);
                    }
                }
                if (profile.options?.general && typeof profile.options.general === 'object') {
                    const mainDictionary = String(profile.options.general.mainDictionary || '').trim();
                    if (mainDictionary.length > 0 && !enabledNames.includes(mainDictionary)) {
                        profile.options.general.mainDictionary = '';
                    }
                    const sortFrequency = profile.options.general.sortFrequencyDictionary;
                    if (typeof sortFrequency === 'string' && sortFrequency.length > 0 && !enabledNames.includes(sortFrequency)) {
                        profile.options.general.sortFrequencyDictionary = null;
                    }
                }
            }
            await send('setAllSettings', {value: nextOptions, source: 'chromium-e2e-set-enabled-dictionaries'});
            const updatedOptions = await send('optionsGetFull', undefined);
            const profileEnabledDictionaryNames = (updatedOptions?.profiles || []).map((profile) => {
                const names = [];
                for (const row of profile?.options?.dictionaries || []) {
                    if (row?.enabled !== true) { continue; }
                    const name = String(row?.name || '').trim();
                    if (name.length > 0) {
                        names.push(name);
                    }
                }
                return names;
            });
            const profileMainDictionaries = (updatedOptions?.profiles || []).map((profile) => String(profile?.options?.general?.mainDictionary || '').trim());
            return {ok: true, targetNames, profileEnabledDictionaryNames, profileMainDictionaries};
        }
        if (expression === 'backendProbe') {
            const dictionaryInfo = await send('getDictionaryInfo', undefined);
            return {
                ok: true,
                dictionaryInfoCount: Array.isArray(dictionaryInfo) ? dictionaryInfo.length : null,
            };
        }
        if (expression === 'concurrentDbPressure') {
            const durationMsRaw = Number(arg && typeof arg === 'object' ? arg.durationMs : 10000);
            const batchDelayMsRaw = Number(arg && typeof arg === 'object' ? arg.batchDelayMs : 35);
            const parallelismRaw = Number(arg && typeof arg === 'object' ? arg.parallelism : 6);
            const durationMs = Number.isFinite(durationMsRaw) ? Math.max(1000, durationMsRaw) : 10000;
            const batchDelayMs = Number.isFinite(batchDelayMsRaw) ? Math.max(0, batchDelayMsRaw) : 35;
            const parallelism = Number.isFinite(parallelismRaw) ? Math.min(24, Math.max(1, Math.trunc(parallelismRaw))) : 6;
            const actions = ['termsFind', 'getDictionaryCounts', 'deleteDictionaryByTitle'];
            /**
             * @param {string} action
             * @returns {Record<string, unknown>}
             */
            const getParamsForAction = (action) => {
                switch (action) {
                    case 'termsFind':
                        return {text: '打', details: {primaryReading: ''}, optionsContext: {index: 0}};
                    case 'getDictionaryCounts':
                        return {dictionaryNames: [], getTotal: true};
                    default:
                        return {dictionaryTitle: '__manabitan_e2e_missing_dictionary__'};
                }
            };
            /**
             * @param {string} lowerMessage
             * @returns {string}
             */
            const getErrorBucket = (lowerMessage) => {
                if (lowerMessage.includes('sqlite_cantopen') || lowerMessage.includes('unable to open database file')) {
                    return 'sqlite-cantopen';
                }
                if (lowerMessage.includes('sqlite_busy') || lowerMessage.includes('database is locked')) {
                    return 'sqlite-locked';
                }
                if (lowerMessage.includes('suspended while import is in progress')) {
                    return 'import-mode-suspended';
                }
                return 'other';
            };
            /** @type {Record<string, {ok: number, error: number}>} */
            const perAction = {
                termsFind: {ok: 0, error: 0},
                getDictionaryCounts: {ok: 0, error: 0},
                deleteDictionaryByTitle: {ok: 0, error: 0},
            };
            /** @type {Record<string, number>} */
            const errorBuckets = {};
            /** @type {Array<{action: string, message: string}>} */
            const sampleErrors = [];
            let okCount = 0;
            let errorCount = 0;
            let sqliteCantopenCount = 0;
            let suspendedCount = 0;
            let attemptCount = 0;
            const now = () => Date.now();
            const stopAt = now() + durationMs;
            while (now() < stopAt) {
                const tasks = [];
                for (let i = 0; i < parallelism; ++i) {
                    const action = actions[(attemptCount + i) % actions.length];
                    const params = getParamsForAction(action);
                    tasks.push((async () => {
                        try {
                            await send(action, params);
                            return {action, ok: true, message: ''};
                        } catch (e) {
                            const message = e instanceof Error ? e.message : String(e);
                            return {action, ok: false, message};
                        }
                    })());
                }
                const results = await Promise.all(tasks);
                for (const result of results) {
                    ++attemptCount;
                    const actionStats = perAction[result.action] || (perAction[result.action] = {ok: 0, error: 0});
                    if (result.ok) {
                        ++okCount;
                        ++actionStats.ok;
                        continue;
                    }
                    ++errorCount;
                    ++actionStats.error;
                    const message = String(result.message || '');
                    const lower = message.toLowerCase();
                    if (lower.includes('sqlite_cantopen') || lower.includes('unable to open database file')) {
                        ++sqliteCantopenCount;
                    }
                    if (lower.includes('suspended while import is in progress')) {
                        ++suspendedCount;
                    }
                    const bucket = getErrorBucket(lower);
                    errorBuckets[bucket] = (errorBuckets[bucket] || 0) + 1;
                    if (sampleErrors.length < 24) {
                        sampleErrors.push({action: result.action, message});
                    }
                }
                if (batchDelayMs > 0) {
                    await new Promise((resolve) => {
                        setTimeout(resolve, batchDelayMs);
                    });
                }
            }
            return {
                durationMs,
                parallelism,
                batchDelayMs,
                attemptCount,
                okCount,
                errorCount,
                sqliteCantopenCount,
                suspendedCount,
                errorBuckets,
                perAction,
                sampleErrors,
            };
        }
        return {error: 'unknown expression'};
    }, {expression, arg});
}

async function waitForBackendDictionaryReady(page, expectedDictionaryNames, term = '暗記', timeoutMs = 60000, requireLookupNames = false) {
    const deadline = safePerformance.now() + timeoutMs;
    let lastDiagnostics = null;
    while (safePerformance.now() < deadline) {
        try {
            const diagnostics = await evalSendMessage(page, 'backendDiagnostics', term);
            lastDiagnostics = diagnostics;
            const info = Array.isArray(diagnostics?.dictionaryInfo) ? diagnostics.dictionaryInfo : [];
            const loadedNames = new Set();
            for (const row of info) {
                const title = String(row?.title || '').trim();
                if (title.length > 0) {
                    loadedNames.add(title);
                }
            }
            const termNames = new Set((Array.isArray(diagnostics?.termDictionaryNames) ? diagnostics.termDictionaryNames : []).map((value) => String(value || '').trim()).filter((value) => value.length > 0));
            const hasLoadedNames = expectedDictionaryNames.every((expectedName) => (
                [...loadedNames].some((loadedName) => matchesDictionaryName(loadedName, expectedName))
            ));
            const hasLookupNames = expectedDictionaryNames.every((expectedName) => (
                [...termNames].some((termName) => matchesDictionaryName(termName, expectedName))
            ));
            if (hasLoadedNames && (!requireLookupNames || hasLookupNames)) {
                return {ok: true, diagnostics};
            }
        } catch (_) {
            // Retry.
        }
        await page.waitForTimeout(500);
    }
    return {ok: false, diagnostics: lastDiagnostics};
}

async function waitForBackendDictionaryTermsPresent(page, expectedDictionaryNames, timeoutMs = 60000) {
    const deadline = safePerformance.now() + timeoutMs;
    let lastDiagnostics = null;
    while (safePerformance.now() < deadline) {
        try {
            const diagnostics = await evalSendMessage(page, 'backendDiagnostics', '日本');
            lastDiagnostics = diagnostics;
            const counts = Array.isArray(diagnostics?.dictionaryCounts?.counts) ? diagnostics.dictionaryCounts.counts : [];
            const dictionaryInfo = Array.isArray(diagnostics?.dictionaryInfo) ? diagnostics.dictionaryInfo : [];
            const countsByTitle = new Map();
            for (let i = 0; i < dictionaryInfo.length; ++i) {
                const title = String(dictionaryInfo[i]?.title || '').trim();
                const termCount = Number(counts[i]?.terms || 0);
                if (title.length > 0) {
                    countsByTitle.set(title, termCount);
                }
            }
            const hasTerms = expectedDictionaryNames.every((expectedName) => (
                [...countsByTitle.entries()].some(([title, termCount]) => matchesDictionaryName(title, expectedName) && termCount > 0)
            ));
            if (hasTerms) {
                return {ok: true, diagnostics};
            }
        } catch (_) {
            // Retry.
        }
        await page.waitForTimeout(500);
    }
    return {ok: false, diagnostics: lastDiagnostics};
}

async function waitForBackendDictionaryContentIntegrity(page, expectedDictionaryNames, candidates, timeoutMs = 60000) {
    const deadline = Date.now() + timeoutMs;
    /** @type {Array<Record<string, unknown>>} */
    let lastProbes = [];
    /** @type {string|null} */
    let lastReason = null;
    while (Date.now() < deadline) {
        const diagnostics = await evalSendMessage(page, 'backendContentIntegrity', {
            dictionaryNames: expectedDictionaryNames,
            candidates,
            probeLimit: contentIntegrityProbeLimit,
        });
        lastProbes = Array.isArray(diagnostics?.probes) ? diagnostics.probes : [];
        lastReason = typeof diagnostics?.reason === 'string' ? diagnostics.reason : null;
        if (diagnostics && diagnostics.ok === true) {
            return {ok: true, probes: lastProbes, reason: lastReason};
        }
        if (lastReason === 'out-of-bounds-entry-content-offsets') {
            return {ok: false, probes: lastProbes, reason: lastReason};
        }
        await new Promise((resolve) => { setTimeout(resolve, 250); });
    }
    return {ok: false, probes: lastProbes, reason: lastReason};
}

async function findOverlapLookupTerm(page, expectedDictionaryNames, candidates) {
    /** @type {Array<{term: string, termResultCount: number, termDictionaryNames: string[], enabledDictionaryNames: string[], enabledInstalledExactMatches: string[], profileMainDictionary: string, profileResultOutputMode: string, dictionaryCounts: unknown, debugLookupState: unknown}>} */
    const probes = [];
    let lastDiagnostics = null;
    const normalizedCandidates = [...new Set(
        (Array.isArray(candidates) ? candidates : [])
            .map((value) => String(value || '').trim())
            .filter((value) => value.length > 0),
    )];
    for (const term of normalizedCandidates) {
        let diagnostics = null;
        try {
            diagnostics = await evalSendMessage(page, 'backendDiagnostics', term);
        } catch (_) {
            continue;
        }
        lastDiagnostics = diagnostics;
        const termDictionaryNames = (Array.isArray(diagnostics?.termDictionaryNames) ? diagnostics.termDictionaryNames : [])
            .map((value) => String(value || '').trim())
            .filter((value) => value.length > 0);
        probes.push({
            term,
            termResultCount: Number(diagnostics?.termResultCount || 0),
            termDictionaryNames: [...new Set(termDictionaryNames)],
            enabledDictionaryNames: (Array.isArray(diagnostics?.enabledDictionaryNames) ? diagnostics.enabledDictionaryNames : [])
                .map((value) => String(value || '').trim())
                .filter((value) => value.length > 0),
            enabledInstalledExactMatches: (Array.isArray(diagnostics?.enabledInstalledExactMatches) ? diagnostics.enabledInstalledExactMatches : [])
                .map((value) => String(value || '').trim())
                .filter((value) => value.length > 0),
            profileMainDictionary: String(diagnostics?.profileMainDictionary || ''),
            profileResultOutputMode: String(diagnostics?.profileResultOutputMode || ''),
            dictionaryCounts: diagnostics?.dictionaryCounts ?? null,
            debugLookupState: diagnostics?.debugLookupState ?? null,
            termLookupDiagnostics: (typeof diagnostics?.termLookupDiagnostics === 'object' && diagnostics?.termLookupDiagnostics !== null) ?
                diagnostics.termLookupDiagnostics :
                null,
        });
        const hasAllExpected = expectedDictionaryNames.every((expectedName) => (
            termDictionaryNames.some((observedName) => matchesDictionaryName(observedName, expectedName))
        ));
        if (hasAllExpected) {
            return {ok: true, term, diagnostics, probes};
        }
    }
    return {
        ok: false,
        term: normalizedCandidates[0] ?? '暗記',
        diagnostics: lastDiagnostics,
        probes,
    };
}

async function findOverlapLookupTermOnSearchPage(page, expectedDictionaryNames, candidates, timeoutMs = 6000) {
    /** @type {Array<{term: string, expectedCounts: Record<string, number>, observedCounts: Record<string, number>, noResultsVisible: boolean, entriesTextPreview: string}>} */
    const probes = [];
    const normalizedCandidates = [...new Set(
        (Array.isArray(candidates) ? candidates : [])
            .map((value) => String(value || '').trim())
            .filter((value) => value.length > 0),
    )];
    for (const term of normalizedCandidates) {
        const snapshot = await searchTermAndGetDictionaryHitCounts(page, term, expectedDictionaryNames, timeoutMs);
        probes.push({
            term,
            expectedCounts: snapshot.expectedCounts,
            observedCounts: snapshot.observedCounts,
            noResultsVisible: snapshot.noResultsVisible,
            entriesTextPreview: snapshot.entriesTextPreview,
        });
        if (expectedDictionaryNames.every((name) => Number(snapshot.expectedCounts?.[name] ?? 0) >= 1)) {
            return {ok: true, term, snapshot, probes};
        }
    }
    return {
        ok: false,
        term: normalizedCandidates[0] ?? '暗記',
        snapshot: probes[probes.length - 1] ?? null,
        probes,
    };
}

async function setEnabledDictionaries(page, dictionaryNames) {
    const result = await evalSendMessage(page, 'setEnabledDictionaries', dictionaryNames);
    if (!(result && result.ok === true)) {
        throw new Error(`Unable to set enabled dictionaries: ${JSON.stringify(result)}`);
    }
    return result;
}

async function getImportProgressLabel(page) {
    return await page.evaluate(() => {
        const selectors = [
            '#recommended-dictionaries-modal .dictionary-import-progress',
            '#dictionaries-modal .dictionary-import-progress',
        ];
        for (const selector of selectors) {
            const container = document.querySelector(selector);
            if (!(container instanceof HTMLElement) || container.hidden) { continue; }
            const label = container.querySelector('.progress-info');
            if (!(label instanceof HTMLElement)) { continue; }
            const text = (label.textContent || '').trim();
            if (text.length > 0) { return text; }
        }
        return '';
    });
}

async function isImportUiIdle(page) {
    return await page.evaluate(() => {
        const fileInput = document.querySelector('#dictionary-import-file-input');
        if (fileInput instanceof HTMLInputElement && fileInput.disabled) {
            return false;
        }
        const activeProgress = document.querySelector('#dictionaries-modal .dictionary-import-progress:not([hidden]), #recommended-dictionaries-modal .dictionary-import-progress:not([hidden])');
        return activeProgress === null;
    });
}

async function getDictionaryErrorText(page) {
    return await page.evaluate(() => {
        const node = document.querySelector('#dictionary-error');
        if (!(node instanceof HTMLElement) || node.hidden) { return ''; }
        return (node.textContent || '').trim();
    });
}

async function getOpfsOpenDiagnostics(page) {
    try {
        return await page.evaluate(async () => {
            const mod = await import('/js/dictionary/sqlite-wasm.js');
            if (typeof mod.getLastOpenStorageDiagnostics !== 'function') {
                return null;
            }
            return mod.getLastOpenStorageDiagnostics();
        });
    } catch (_) {
        return null;
    }
}

async function getLastImportDebug(page) {
    try {
        return await page.evaluate(() => Reflect.get(globalThis, '__manabitanLastImportDebug') ?? null);
    } catch (_) {
        return null;
    }
}

async function getImportDebugHistory(page) {
    try {
        return await page.evaluate(() => {
            const historyRaw = Reflect.get(globalThis, '__manabitanImportDebugHistory');
            return Array.isArray(historyRaw) ? historyRaw : [];
        });
    } catch (_) {
        return [];
    }
}

async function getImportStepTimingHistory(page) {
    try {
        return await page.evaluate(() => {
            const historyRaw = Reflect.get(globalThis, '__manabitanImportStepTimingHistory');
            return Array.isArray(historyRaw) ? historyRaw : [];
        });
    } catch (_) {
        return [];
    }
}

function summarizeImportStepTimingHistory(historyRaw) {
    const records = Array.isArray(historyRaw) ? historyRaw : [];
    const byDictionary = new Map();
    const aggregateByStep = new Map();
    for (const record of records) {
        if (!(typeof record === 'object' && record !== null && !Array.isArray(record))) {
            continue;
        }
        const dictionaryIndex = Number(record.dictionaryIndex || 0);
        const stepDisplay = String(record.stepDisplay || '').trim();
        const label = String(record.label || '').trim();
        const elapsedMs = Number(record.elapsedMs || 0);
        const heapDeltaBytes = record.heapDeltaBytes === null ? null : Number(record.heapDeltaBytes || 0);
        const finalOpenStep = record.finalOpenStep === true;
        if (dictionaryIndex < 1 || stepDisplay.length === 0 || !Number.isFinite(elapsedMs)) {
            continue;
        }
        const dictionarySteps = byDictionary.get(dictionaryIndex) || [];
        dictionarySteps.push({
            stepDisplay,
            label,
            elapsedMs: Math.max(0, elapsedMs),
            heapDeltaBytes: heapDeltaBytes === null || !Number.isFinite(heapDeltaBytes) ? null : heapDeltaBytes,
            finalOpenStep,
        });
        byDictionary.set(dictionaryIndex, dictionarySteps);

        const aggregate = aggregateByStep.get(stepDisplay) || {
            count: 0,
            totalElapsedMs: 0,
        };
        aggregate.count += 1;
        aggregate.totalElapsedMs += Math.max(0, elapsedMs);
        aggregateByStep.set(stepDisplay, aggregate);
    }
    return {
        dictionaries: [...byDictionary.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([dictionaryIndex, steps]) => ({dictionaryIndex, steps})),
        aggregateByStep: [...aggregateByStep.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([stepDisplay, value]) => ({stepDisplay, ...value})),
    };
}

function summarizeImportStep4Breakdown(historyRaw) {
    const history = Array.isArray(historyRaw) ? historyRaw : [];
    const readTimingValue = (details, key) => {
        const value = Number(details?.[key] ?? 0);
        return Number.isFinite(value) ? Math.max(0, value) : 0;
    };
    const dictionaries = [];
    const aggregate = {
        termParseMs: 0,
        termSerializationMs: 0,
        bulkAddTermsMs: 0,
        bulkAddTagsMetaMs: 0,
        mediaResolveMs: 0,
        mediaWriteMs: 0,
        accountedMs: 0,
        otherMs: 0,
    };
    for (const entry of history) {
        if (!(typeof entry === 'object' && entry !== null && !Array.isArray(entry))) {
            continue;
        }
        const importerPhaseTimings = Array.isArray(entry.importerPhaseTimings) ? entry.importerPhaseTimings : [];
        const importDataBanksTiming = importerPhaseTimings.find((timing) => timing && timing.phase === 'import-data-banks');
        const details = (importDataBanksTiming && typeof importDataBanksTiming === 'object' && importDataBanksTiming !== null && !Array.isArray(importDataBanksTiming.details)) ?
            importDataBanksTiming.details :
            {};
        const timingSummary = {
            title: String(entry.resultTitle || ''),
            termParseMs: readTimingValue(details, 'step4TermParseMs'),
            termSerializationMs: readTimingValue(details, 'step4TermSerializationMs'),
            bulkAddTermsMs: readTimingValue(details, 'step4BulkAddTermsMs'),
            bulkAddTagsMetaMs: readTimingValue(details, 'step4BulkAddTagsMetaMs'),
            mediaResolveMs: readTimingValue(details, 'step4MediaResolveMs'),
            mediaWriteMs: readTimingValue(details, 'step4MediaWriteMs'),
            accountedMs: readTimingValue(details, 'step4AccountedMs'),
            otherMs: readTimingValue(details, 'step4OtherMs'),
        };
        dictionaries.push(timingSummary);
        aggregate.termParseMs += timingSummary.termParseMs;
        aggregate.termSerializationMs += timingSummary.termSerializationMs;
        aggregate.bulkAddTermsMs += timingSummary.bulkAddTermsMs;
        aggregate.bulkAddTagsMetaMs += timingSummary.bulkAddTagsMetaMs;
        aggregate.mediaResolveMs += timingSummary.mediaResolveMs;
        aggregate.mediaWriteMs += timingSummary.mediaWriteMs;
        aggregate.accountedMs += timingSummary.accountedMs;
        aggregate.otherMs += timingSummary.otherMs;
    }
    return {dictionaries, aggregate};
}

async function waitForBodyVisible(page, timeoutMs = 30000) {
    const deadline = safePerformance.now() + timeoutMs;
    while (safePerformance.now() < deadline) {
        const visible = await page.evaluate(() => document.body instanceof HTMLElement && document.body.hidden === false);
        if (visible) {
            return true;
        }
        await page.waitForTimeout(250);
    }
    return false;
}

async function waitForSearchPageInitialized(page, timeoutMs = 30000) {
    await page.waitForSelector('#search-textbox', {state: 'attached', timeout: 30000});
    const deadline = safePerformance.now() + timeoutMs;
    while (safePerformance.now() < deadline) {
        const state = await page.evaluate(() => ({
            loaded: document.documentElement?.dataset?.loaded === 'true',
            loadError: document.documentElement?.dataset?.loadError === 'true',
            bodyVisible: document.body instanceof HTMLElement && document.body.hidden === false,
        }));
        if (state.loadError) {
            throw new Error('Search page reported loadError=true');
        }
        if (state.loaded && state.bodyVisible) {
            return;
        }
        await page.waitForTimeout(250);
    }
    throw new Error('Search page did not finish initialization');
}

async function getSearchPageDebugState(page) {
    try {
        return await page.evaluate(() => ({
            datasetLoaded: document.documentElement?.dataset?.loaded ?? null,
            datasetLoadError: document.documentElement?.dataset?.loadError ?? null,
            bodyHidden: document.body instanceof HTMLElement ? document.body.hidden === true : null,
            hasDebugApi: typeof Reflect.get(globalThis, '__manabitanSearchDebugApi')?.triggerSearch === 'function',
            searchTextboxValue: (() => {
                const input = document.querySelector('#search-textbox');
                return input instanceof HTMLTextAreaElement ? input.value : null;
            })(),
            searchDebug: Reflect.get(globalThis, '__manabitanSearchDebug') ?? null,
        }));
    } catch (e) {
        return {error: errorMessage(e)};
    }
}

async function waitForImportCompletion(page, dictionaryName, timeoutMs = 300000, onStepChange = null) {
    const start = safePerformance.now();
    const deadline = start + timeoutMs;
    let sawStepText = false;
    let emptySince = null;
    let previousLabel = '';
    let previousLabelAt = start;
    while (safePerformance.now() < deadline) {
        const errorText = await getDictionaryErrorText(page);
        if (errorText.length > 0) {
            const opfsDiagnostics = await getOpfsOpenDiagnostics(page);
            const lastImportDebug = await getLastImportDebug(page);
            fail(`${dictionaryName} import reported error before completion: ${errorText}; opfsOpenDiagnostics=${JSON.stringify(opfsDiagnostics)}; lastImportDebug=${JSON.stringify(lastImportDebug)}`);
        }
        const label = await getImportProgressLabel(page);
        const now = safePerformance.now();
        if (label !== previousLabel) {
            if (typeof onStepChange === 'function' && previousLabel.length > 0) {
                await onStepChange(previousLabel, previousLabelAt, now);
            }
            previousLabel = label;
            previousLabelAt = now;
        }
        if (label.includes('Step ')) {
            sawStepText = true;
            emptySince = null;
        }
        if (sawStepText && label.length === 0) {
            emptySince ??= safePerformance.now();
            if (safePerformance.now() - emptySince >= 2000 && await isImportUiIdle(page)) {
                if (typeof onStepChange === 'function' && previousLabel.length > 0) {
                    await onStepChange(previousLabel, previousLabelAt, safePerformance.now());
                }
                return;
            }
        }
        await page.waitForTimeout(250);
    }
    fail(`Timed out waiting for ${dictionaryName} import completion`);
}

async function waitForImportProgressPhase(page, pattern, timeoutMs = 30000) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(String(pattern));
    const deadline = safePerformance.now() + timeoutMs;
    let lastLabel = '';
    while (safePerformance.now() < deadline) {
        lastLabel = await getImportProgressLabel(page);
        if (regex.test(lastLabel)) {
            return {ok: true, label: lastLabel};
        }
        const errorText = await getDictionaryErrorText(page);
        if (errorText.length > 0) {
            return {ok: false, label: lastLabel, error: errorText};
        }
        await page.waitForTimeout(200);
    }
    return {ok: false, label: lastLabel, error: `Timed out waiting for import progress phase ${regex}`};
}

async function verifyLookupRemainsResponsiveDuringImportPhase(page, lookupPage, phasePattern, term, expectedDictionaryNames, iterationCount = 3) {
    const phaseState = await waitForImportProgressPhase(page, phasePattern, 45000);
    if (!(phaseState && phaseState.ok === true)) {
        throw new Error(`Import phase gate did not reach ${String(phasePattern)}: ${JSON.stringify(phaseState)}`);
    }
    const iterations = [];
    for (let i = 0; i < iterationCount; ++i) {
        const iterationStart = safePerformance.now();
        const lookup = await searchTermAndGetDictionaryHitCounts(lookupPage, term, expectedDictionaryNames, 6000);
        const iterationEnd = safePerformance.now();
        iterations.push({
            iteration: i + 1,
            label: phaseState.label,
            durationMs: Math.max(0, iterationEnd - iterationStart),
            lookup,
        });
        for (const dictionaryName of expectedDictionaryNames) {
            if (Number(lookup?.expectedCounts?.[dictionaryName] ?? 0) < 1) {
                throw new Error(`Lookup dropped dictionary ${dictionaryName} during active import phase: ${JSON.stringify({phaseState, iterations})}`);
            }
        }
        if (i + 1 < iterationCount) {
            await page.waitForTimeout(400);
        }
    }
    return {phaseState, iterations};
}

async function openInstalledDictionariesModal(page) {
    await page.evaluate(() => {
        const triggers = Array.from(document.querySelectorAll('.settings-item[data-modal-action="show,dictionaries"]'));
        const trigger = triggers.find((item) => {
            const label = item.querySelector('.settings-item-label');
            const text = (label?.textContent || '').trim();
            return text.includes('Configure installed and enabled dictionaries');
        });
        if (!(trigger instanceof HTMLElement)) {
            throw new Error('Unable to find installed dictionaries modal trigger');
        }
        trigger.click();
    });
    await page.waitForSelector('#dictionaries-modal:not([hidden])', {timeout: 30000});
}

async function getInstalledDictionaryTitles(page) {
    return await page.evaluate(() => {
        const modal = document.querySelector('#dictionaries-modal');
        if (!(modal instanceof HTMLElement)) { return []; }
        const list = modal.querySelector('#dictionary-list');
        if (!(list instanceof HTMLElement)) { return []; }
        const titles = [];
        const nodes = list.querySelectorAll('.dictionary-title');
        for (const node of nodes) {
            if (!(node instanceof HTMLElement)) { continue; }
            const text = (node.textContent || '').trim();
            if (text.length === 0) { continue; }
            if (text === 'All') { continue; }
            if (text === 'Unassociated Data') { continue; }
            titles.push(text);
        }
        return titles;
    });
}

async function waitForInstalledDictionaryTitles(page, timeoutMs = 30000) {
    const deadline = safePerformance.now() + timeoutMs;
    let lastTitles = [];
    while (safePerformance.now() < deadline) {
        lastTitles = await getInstalledDictionaryTitles(page);
        const text = lastTitles.join(', ');
        if (text.includes('Jitendex') && text.includes('JMdict')) {
            return {ok: true, titles: lastTitles};
        }
        await page.waitForTimeout(500);
    }
    return {ok: false, titles: lastTitles};
}

async function waitForInstalledDictionarySet(page, expectedNames, timeoutMs = 30000) {
    const deadline = safePerformance.now() + timeoutMs;
    let lastTitles = [];
    while (safePerformance.now() < deadline) {
        lastTitles = await getInstalledDictionaryTitles(page);
        const hasExpected = expectedNames.every((expectedName) => (
            lastTitles.some((title) => matchesDictionaryName(title, expectedName))
        ));
        if (hasExpected) {
            return {ok: true, titles: lastTitles};
        }
        await page.waitForTimeout(500);
    }
    return {ok: false, titles: lastTitles};
}

function matchesDictionaryName(observedName, expectedName) {
    const observed = String(observedName || '').trim();
    const expected = String(expectedName || '').trim();
    if (observed.length === 0 || expected.length === 0) { return false; }
    if (observed === expected) { return true; }
    if (observed.startsWith(`${expected} `) || observed.startsWith(`${expected}.`)) { return true; }
    return observed.includes(expected);
}

async function requestDictionaryDeleteFromInstalledModal(page, dictionaryName) {
    await page.evaluate((targetName) => {
        const aliases = Array.from(document.querySelectorAll('#dictionary-list .dictionary-alias'));
        const targetIndex = aliases.findIndex((aliasNode) => {
            const text = (aliasNode.textContent || '').trim();
            return text.length > 0 && text !== 'All' && text !== 'Unassociated Data' && (
                text === targetName ||
                text.startsWith(`${targetName} `) ||
                text.startsWith(`${targetName}.`) ||
                text.includes(targetName)
            );
        });
        if (targetIndex < 0) {
            throw new Error(`Unable to find installed dictionary row for "${targetName}"`);
        }
        const menuButtons = Array.from(document.querySelectorAll('#dictionary-list .dictionary-menu-button'));
        const menuButton = menuButtons[targetIndex];
        if (!(menuButton instanceof HTMLElement)) {
            throw new Error(`Unable to find dictionary menu button for "${targetName}" at row index ${String(targetIndex)}`);
        }
        menuButton.click();
    }, dictionaryName);
    await page.waitForFunction(() => {
        const menus = Array.from(document.querySelectorAll('.popup-menu-container'));
        return menus.some((menuNode) => (
            menuNode instanceof HTMLElement &&
            !menuNode.hidden &&
            menuNode.querySelector('.popup-menu-item[data-menu-action="showDetails"]') !== null &&
            menuNode.querySelector('.popup-menu-item[data-menu-action="delete"]') !== null
        ));
    }, {timeout: 30000});
    await page.evaluate(() => {
        const menu = Array.from(document.querySelectorAll('.popup-menu-container')).find((menuNode) => (
            menuNode instanceof HTMLElement &&
            !menuNode.hidden &&
            menuNode.querySelector('.popup-menu-item[data-menu-action="showDetails"]') !== null &&
            menuNode.querySelector('.popup-menu-item[data-menu-action="delete"]') !== null
        ));
        if (!(menu instanceof HTMLElement)) {
            throw new Error('Dictionary action menu did not become visible');
        }
        const deleteButton = menu.querySelector('.popup-menu-item[data-menu-action="delete"]');
        if (!(deleteButton instanceof HTMLElement)) {
            throw new Error('Dictionary action menu is missing delete button');
        }
        deleteButton.click();
    });
    await page.waitForSelector('#dictionary-confirm-delete-modal:not([hidden])', {timeout: 30000});
    await page.evaluate((targetName) => {
        const modal = document.querySelector('#dictionary-confirm-delete-modal');
        if (!(modal instanceof HTMLElement)) {
            throw new Error('Delete confirmation modal is missing');
        }
        const nameNode = modal.querySelector('#dictionary-confirm-delete-name');
        const shownName = (nameNode?.textContent || '').trim();
        const nameMatches = shownName === targetName || shownName.startsWith(`${targetName} `) || shownName.startsWith(`${targetName}.`) || shownName.includes(targetName);
        if (!nameMatches) {
            throw new Error(`Delete confirmation title mismatch: expected "${targetName}", saw "${shownName}"`);
        }
        const confirmButton = modal.querySelector('#dictionary-confirm-delete-button');
        if (!(confirmButton instanceof HTMLElement)) {
            throw new Error('Delete confirmation button missing');
        }
        confirmButton.click();
    }, dictionaryName);
}

async function waitForDictionaryDeleteCompletion(page, deletedDictionaryName, expectedRemainingNames, timeoutMs = 240000) {
    const startedAt = safePerformance.now();
    const deadline = safePerformance.now() + timeoutMs;
    let sawDeleteProgress = false;
    let progressVisibleMs = 0;
    let lastProgressChangeAt = startedAt;
    let previousProgressVisible = false;
    /** @type {string[]} */
    let lastTitles = [];
    while (safePerformance.now() < deadline) {
        const now = safePerformance.now();
        const progressVisible = await page.evaluate(() => {
            const progress = document.querySelector('#dictionaries-modal .dictionary-delete-progress');
            return progress instanceof HTMLElement && !progress.hidden;
        });
        if (progressVisible !== previousProgressVisible) {
            if (previousProgressVisible) {
                progressVisibleMs += Math.max(0, now - lastProgressChangeAt);
            }
            previousProgressVisible = progressVisible;
            lastProgressChangeAt = now;
        }
        if (progressVisible) {
            sawDeleteProgress = true;
        }
        lastTitles = await getInstalledDictionaryTitles(page);
        const hasDeletedDictionary = lastTitles.some((title) => matchesDictionaryName(title, deletedDictionaryName));
        const hasExpectedRemaining = expectedRemainingNames.every((expectedName) => (
            lastTitles.some((title) => matchesDictionaryName(title, expectedName))
        ));
        if (!progressVisible && !hasDeletedDictionary && hasExpectedRemaining) {
            return {
                ok: true,
                sawDeleteProgress,
                progressVisibleMs: Math.max(0, progressVisibleMs),
                elapsedMs: Math.max(0, safePerformance.now() - startedAt),
                titles: lastTitles,
            };
        }
        await page.waitForTimeout(250);
    }
    if (previousProgressVisible) {
        progressVisibleMs += Math.max(0, safePerformance.now() - lastProgressChangeAt);
    }
    return {
        ok: false,
        sawDeleteProgress,
        progressVisibleMs: Math.max(0, progressVisibleMs),
        elapsedMs: Math.max(0, safePerformance.now() - startedAt),
        titles: lastTitles,
    };
}

async function searchTermAndGetDictionaryHitCounts(page, term, expectedDictionaryNames, timeoutMs = 15000, submitMode = 'enter') {
    await page.bringToFront();
    await waitForSearchPageInitialized(page, 30000);
    await page.waitForSelector('#search-button', {state: 'attached', timeout: 30000});
    if (!(await waitForBodyVisible(page, 30000))) {
        throw new Error('Search page body remained hidden');
    }
    const debugApiResult = await page.evaluate(({term: query}) => {
        const api = Reflect.get(globalThis, '__manabitanSearchDebugApi');
        if (!(api && typeof api === 'object' && typeof api.triggerSearch === 'function')) {
            return {used: false, ok: false, error: 'debug api unavailable'};
        }
        const result = api.triggerSearch(query, {animate: true, historyMode: 'new', lookup: true, flags: null});
        return {used: true, ...(result && typeof result === 'object' ? result : {ok: false, error: 'debug api returned invalid result'})};
    }, {term});
    if (debugApiResult.used && !debugApiResult.ok) {
        throw new Error(`Search debug API trigger failed: ${JSON.stringify(debugApiResult)}`);
    }
    if (!debugApiResult.used) {
        const submitted = await page.evaluate(({query, submitMode: submitModeLocal}) => {
            if (submitModeLocal !== 'enter' && submitModeLocal !== 'button') { return false; }
            window.dispatchEvent(new CustomEvent('manabitan-e2e-trigger-search', {
                detail: {
                    query,
                    animate: true,
                    historyMode: 'new',
                    lookup: true,
                    flags: null,
                },
            }));
            return true;
        }, {query: term, submitMode});
        if (!submitted) {
            throw new Error(`Unable to submit search query using submitMode=${submitMode}`);
        }
    }
    const deadline = safePerformance.now() + timeoutMs;
    let lastResult = {
        expectedCounts: Object.fromEntries(expectedDictionaryNames.map((name) => [name, 0])),
        observedCounts: {},
        noResultsVisible: false,
        entriesTextPreview: '',
    };
    while (safePerformance.now() < deadline) {
        const snapshot = await page.evaluate(() => {
            const dictionaryEntries = document.querySelector('#dictionary-entries');
            if (!(dictionaryEntries instanceof HTMLElement)) {
                return {
                    observedCounts: {},
                    noResultsVisible: false,
                    entriesTextPreview: '',
                };
            }
            const countMap = Object.create(null);
            const dictionaryNodes = dictionaryEntries.querySelectorAll('.definition-item[data-dictionary], .entry [data-dictionary]');
            for (const node of dictionaryNodes) {
                const dictionary = node instanceof HTMLElement ? (node.dataset.dictionary || '').trim() : '';
                if (dictionary.length === 0) { continue; }
                countMap[dictionary] = (countMap[dictionary] || 0) + 1;
            }
            const noResults = document.querySelector('#no-results');
            const noResultsVisible = noResults instanceof HTMLElement ? !noResults.hidden : false;
            const text = (dictionaryEntries.textContent || '').replaceAll(/\s+/g, ' ').trim();
            return {
                observedCounts: countMap,
                noResultsVisible,
                entriesTextPreview: text.slice(0, 200),
            };
        });
        const observedEntries = Object.entries(snapshot?.observedCounts ?? {});
        const expectedCounts = Object.fromEntries(expectedDictionaryNames.map((name) => [name, 0]));
        for (const [observedNameRaw, countRaw] of observedEntries) {
            const observedName = String(observedNameRaw || '').trim();
            const count = Number(countRaw || 0);
            if (!Number.isFinite(count) || count <= 0 || observedName.length === 0) { continue; }
            for (const expectedName of expectedDictionaryNames) {
                if (!matchesDictionaryName(observedName, expectedName)) { continue; }
                expectedCounts[expectedName] = Number(expectedCounts[expectedName] || 0) + count;
            }
        }
        lastResult = {
            expectedCounts,
            observedCounts: snapshot?.observedCounts ?? {},
            noResultsVisible: snapshot?.noResultsVisible === true,
            entriesTextPreview: String(snapshot?.entriesTextPreview || ''),
        };
        if (expectedDictionaryNames.every((name) => (expectedCounts[name] ?? 0) >= 1)) {
            return lastResult;
        }
        await page.waitForTimeout(250);
    }
    return lastResult;
}

async function waitForSearchTermDictionaryHitCounts(page, term, expectedDictionaryNames, timeoutMs = 15000, submitMode = 'enter') {
    const deadline = safePerformance.now() + timeoutMs;
    /** @type {{expectedCounts: Record<string, number>, observedCounts: Record<string, number>, noResultsVisible: boolean, entriesTextPreview: string}|null} */
    let lastResult = null;
    while (safePerformance.now() < deadline) {
        lastResult = await searchTermAndGetDictionaryHitCounts(page, term, expectedDictionaryNames, Math.min(2000, Math.max(250, deadline - safePerformance.now())), submitMode);
        if (expectedDictionaryNames.every((name) => Number(lastResult?.expectedCounts?.[name] ?? 0) >= 1)) {
            return lastResult;
        }
        await page.waitForTimeout(250);
    }
    return lastResult ?? {
        expectedCounts: Object.fromEntries(expectedDictionaryNames.map((name) => [name, 0])),
        observedCounts: {},
        noResultsVisible: false,
        entriesTextPreview: '',
    };
}

async function waitForSearchPageLookupReady(page, extensionBaseUrl, term, expectedDictionaryNames, timeoutMs = 60000, submitMode = 'enter') {
    const deadline = safePerformance.now() + timeoutMs;
    /** @type {{expectedCounts: Record<string, number>, observedCounts: Record<string, number>, noResultsVisible: boolean, entriesTextPreview: string}|null} */
    let lastResult = null;
    let attempt = 0;
    while (safePerformance.now() < deadline) {
        attempt += 1;
        await page.goto(`${extensionBaseUrl}/search.html`);
        await waitForSearchPageInitialized(page, 30000);
        lastResult = await waitForSearchTermDictionaryHitCounts(
            page,
            term,
            expectedDictionaryNames,
            Math.min(12000, Math.max(2000, deadline - safePerformance.now())),
            submitMode,
        );
        if (expectedDictionaryNames.every((name) => Number(lastResult?.expectedCounts?.[name] ?? 0) >= 1)) {
            return {
                ok: true,
                attemptCount: attempt,
                result: lastResult,
            };
        }
        await page.reload({waitUntil: 'domcontentloaded'});
        await waitForSearchPageInitialized(page, 30000);
        lastResult = await waitForSearchTermDictionaryHitCounts(
            page,
            term,
            expectedDictionaryNames,
            Math.min(8000, Math.max(1000, deadline - safePerformance.now())),
            submitMode,
        );
        if (expectedDictionaryNames.every((name) => Number(lastResult?.expectedCounts?.[name] ?? 0) >= 1)) {
            return {
                ok: true,
                attemptCount: attempt,
                result: lastResult,
            };
        }
        await page.waitForTimeout(500);
    }
    return {
        ok: false,
        attemptCount: attempt,
        result: lastResult ?? {
            expectedCounts: Object.fromEntries(expectedDictionaryNames.map((name) => [name, 0])),
            observedCounts: {},
            noResultsVisible: false,
            entriesTextPreview: '',
        },
    };
}

async function waitForVisiblePopupFrameHandle(page, timeoutMs = 6000) {
    const deadline = safePerformance.now() + timeoutMs;
    /** @type {import('@playwright/test').ElementHandle<HTMLElement>|null} */
    let fallbackFrameHandle = null;
    while (safePerformance.now() < deadline) {
        const frameHandles = await page.$$('iframe.yomitan-popup');
        for (const frameHandle of frameHandles) {
            fallbackFrameHandle = frameHandle;
            const box = await frameHandle.boundingBox();
            if (box !== null && box.width > 0 && box.height > 0) {
                return frameHandle;
            }
        }
        await page.waitForTimeout(80);
    }
    return fallbackFrameHandle;
}

async function getPageFrontendDebugState(page) {
    return await page.evaluate(() => {
        const state = {};
        for (const [key, value] of Object.entries(document.documentElement?.dataset ?? {})) {
            if (key.startsWith('manabitan')) {
                state[key] = value;
            }
        }
        return state;
    });
}

async function waitForPageFrontendScanReady(page, timeoutMs = 10000) {
    await page.waitForFunction(() => {
        const data = document.documentElement?.dataset ?? {};
        return (
            data.manabitanContentScriptLoaded === 'true' &&
            data.manabitanContentScriptPrepared === 'true' &&
            data.manabitanPrepareStarted === 'true' &&
            data.manabitanPrepared === 'true' &&
            data.manabitanOptionsLoaded === 'true' &&
            data.manabitanScannerEnabled === 'true'
        );
    }, undefined, {timeout: timeoutMs});
    return await getPageFrontendDebugState(page);
}

async function hoverLookupOnWagahai(page, targetSelector, motionProfile = null) {
    await waitForPageFrontendScanReady(page);
    const target = page.locator(targetSelector).first();
    await target.waitFor({state: 'visible', timeout: 10000});
    await target.scrollIntoViewIfNeeded();
    await page.bringToFront();
    await page.locator('body').click({position: {x: 12, y: 12}});
    const box = await target.boundingBox();
    if (box === null) {
        throw new Error(`Unable to resolve bounding box for selector ${targetSelector}`);
    }
    const hoverX = box.x + Math.max(2, Math.min(10, box.width * 0.25));
    const hoverY = box.y + Math.max(2, Math.min(12, box.height * 0.5));
    const resetX = Math.max(2, hoverX - 120);
    const moveAwaySteps = Math.max(2, Number(motionProfile?.moveAwaySteps ?? 6) || 6);
    const hoverSteps = Math.max(4, Number(motionProfile?.hoverSteps ?? 16) || 16);
    const settleDelayMs = Math.max(0, Number(motionProfile?.settleDelayMs ?? 35) || 35);
    const popupTimeoutMs = Math.max(800, Number(motionProfile?.popupTimeoutMs ?? 3000) || 3000);
    const modifierCandidates = ['Shift', 'Alt', 'Control', null];
    for (const modifier of modifierCandidates) {
        if (modifier !== null) {
            await page.keyboard.down(modifier);
        }
        try {
            for (let attempt = 0; attempt < 3; ++attempt) {
                await page.mouse.move(resetX, hoverY, {steps: moveAwaySteps});
                await page.waitForTimeout(settleDelayMs);
                await page.mouse.move(hoverX, hoverY, {steps: hoverSteps});
                const popupFrameHandle = await waitForVisiblePopupFrameHandle(page, popupTimeoutMs);
                if (popupFrameHandle === null) {
                    continue;
                }
                const popupFrame = await popupFrameHandle.contentFrame();
                if (popupFrame === null) {
                    continue;
                }
                await popupFrame.waitForSelector('#dictionary-entries, #no-results, #no-dictionaries', {timeout: 5000});
                const popupText = (await popupFrame.locator('body').textContent()) ?? '';
                if (popupText.trim().length === 0) {
                    continue;
                }
                const popupState = await popupFrame.evaluate(() => {
                    const entriesNode = document.querySelector('#dictionary-entries');
                    const noResultsNode = document.querySelector('#no-results');
                    const noDictionariesNode = document.querySelector('#no-dictionaries');
                    const entriesText = entriesNode instanceof HTMLElement ? (entriesNode.textContent || '').replaceAll(/\s+/g, ' ').trim() : '';
                    return {
                        hasDictionaryEntries: entriesNode instanceof HTMLElement && entriesText.length > 0,
                        noResultsVisible: noResultsNode instanceof HTMLElement ? !noResultsNode.hidden : false,
                        noDictionariesVisible: noDictionariesNode instanceof HTMLElement ? !noDictionariesNode.hidden : false,
                        entriesTextPreview: entriesText.slice(0, 200),
                    };
                });
                return {
                    popupText,
                    usedModifier: modifier,
                    hasDictionaryEntries: popupState?.hasDictionaryEntries === true,
                    noResultsVisible: popupState?.noResultsVisible === true,
                    noDictionariesVisible: popupState?.noDictionariesVisible === true,
                    entriesTextPreview: String(popupState?.entriesTextPreview || ''),
                };
            }
        } finally {
            if (modifier !== null) {
                await page.keyboard.up(modifier);
            }
        }
    }
    const hoverFailureState = await page.evaluate((selector) => {
        const popupFrames = Array.from(document.querySelectorAll('iframe.yomitan-popup'));
        return {
            hasFocus: document.hasFocus(),
            activeElementTagName: document.activeElement instanceof HTMLElement ? document.activeElement.tagName : null,
            frontendDebugState: Object.fromEntries(
                Object.entries(document.documentElement?.dataset ?? {}).filter(([key]) => key.startsWith('manabitan')),
            ),
            popupFrameCount: popupFrames.length,
            popupFrames: popupFrames.map((frame) => ({
                hidden: frame instanceof HTMLElement ? frame.hidden === true : null,
                width: frame instanceof HTMLElement ? frame.clientWidth : null,
                height: frame instanceof HTMLElement ? frame.clientHeight : null,
                popupDisplayMode: frame instanceof HTMLElement ? frame.dataset.popupDisplayMode ?? null : null,
            })),
            targetText: (() => {
                const node = document.querySelector(selector);
                return node instanceof HTMLElement ? (node.textContent || '').trim() : null;
            })(),
        };
    }, targetSelector);
    throw new Error(`Hover scan did not produce a visible popup for selector ${targetSelector}; state=${JSON.stringify(hoverFailureState)}`);
}

async function loadDictionaryProbeTermsFromArchive(zipPath, maxTerms = 80) {
    const maxTermsSafe = Number.isFinite(maxTerms) ? Math.max(8, Math.trunc(maxTerms)) : 80;
    /** @type {string[]} */
    const terms = [];
    const seen = new Set();
    const hasJapanese = (value) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(value);
    for (let bankIndex = 1; bankIndex <= 12 && terms.length < maxTermsSafe; ++bankIndex) {
        let stdout = '';
        try {
            ({stdout} = await execFileAsync('unzip', ['-p', zipPath, `term_bank_${String(bankIndex)}.json`], {
                maxBuffer: 32 * 1024 * 1024,
            }));
        } catch (_) {
            continue;
        }
        let rows;
        try {
            rows = parseJson(stdout);
        } catch (_) {
            continue;
        }
        if (!Array.isArray(rows)) {
            continue;
        }
        for (const row of rows) {
            const term = String(Array.isArray(row) ? row[0] : '').trim();
            if (term.length === 0 || term.length > 20 || !hasJapanese(term) || seen.has(term)) {
                continue;
            }
            seen.add(term);
            terms.push(term);
            if (terms.length >= maxTermsSafe) {
                break;
            }
        }
    }
    return terms;
}

async function ensureFreshChromeDevBuild(zipPath) {
    const skipBuild = (process.env.MANABITAN_E2E_SKIP_BUILD ?? '0').trim() === '1';
    if (skipBuild) {
        await access(zipPath);
        return;
    }
    const startedAt = safePerformance.now();
    console.log(`${e2eLogTag} rebuilding manabitan-chrome-dev.zip before test run`);
    await execFileAsync('node', ['./dev/bin/build.js', '--target', 'chrome-dev'], {
        cwd: root,
        maxBuffer: 20 * 1024 * 1024,
    });
    await access(zipPath);
    const endedAt = safePerformance.now();
    console.log(`${e2eLogTag} build complete (${formatDuration(endedAt - startedAt)})`);
}

async function main() {
    const defaultZipPath = path.join(root, 'builds', 'manabitan-chrome-dev.zip');
    const defaultReportName = browserFlavor === 'edge' ? 'edge-e2e-import-report.html' : 'chromium-e2e-import-report.html';
    const reportPath = process.env.MANABITAN_CHROMIUM_E2E_REPORT ?? path.join(root, 'builds', defaultReportName);
    const reportJsonPath = reportPath.replace(/\.html$/i, '.json');
    const combinedReportPath = path.join(root, 'builds', 'extension-e2e-report.html');
    const firefoxReportPath = path.join(root, 'builds', 'firefox-e2e-import-report.html');
    const chromiumReportPath = browserFlavor === 'chromium' ? reportPath : path.join(root, 'builds', 'chromium-e2e-import-report.html');
    const edgeReportPath = browserFlavor === 'edge' ? reportPath : path.join(root, 'builds', 'edge-e2e-import-report.html');
    const report = createReport();
    let runError;
    let localServer = null;
    let context = null;
    let cdpSession = null;
    let processSampler = null;
    let extensionDir = null;
    let userDataDir = null;
    let page = null;

    try {
        if (browserFlavor === 'edge') {
            const edgeExecutablePath = getEdgeExecutablePath();
            if (edgeExecutablePath !== null && !existsSync(edgeExecutablePath)) {
                fail(
                    `Edge browser executable was not found at "${edgeExecutablePath}". ` +
                    'Install Microsoft Edge on this machine first, then rerun npm run test:e2e:edge-extension.',
                );
            }
        }
        await ensureFreshChromeDevBuild(defaultZipPath);
        extensionDir = await extractExtensionZip(defaultZipPath);
        const profileIterationTag = String(process.env.MANABITAN_E2E_PROFILE_ITERATION_TAG || '').trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '');
        const profilePrefix = profileIterationTag.length > 0 ?
            `manabitan-chromium-profile-${profileIterationTag}-` :
            'manabitan-chromium-profile-';
        userDataDir = await mkdtemp(path.join(os.tmpdir(), profilePrefix));

        const cacheWarmupStart = safePerformance.now();
        const cachedDictionaries = await ensureRealDictionaryCache();
        const jitendexProbeTerms = await loadDictionaryProbeTermsFromArchive(cachedDictionaries.jitendexPath, 80);
        const jmdictProbeTerms = await loadDictionaryProbeTermsFromArchive(cachedDictionaries.jmdictPath, 80);
        const jmnedictProbeTerms = await loadDictionaryProbeTermsFromArchive(cachedDictionaries.jmnedictPath, 80);
        const lookupProbeCandidates = [...new Set([...overlapLookupCandidates, ...jitendexProbeTerms, ...jmdictProbeTerms])];
        const jitendexLookupProbeCandidates = [...new Set([...lookupWords, ...jitendexProbeTerms])];
        const extendedLookupProbeCandidates = [...new Set([...lookupWords, ...lookupProbeCandidates, ...jmnedictProbeTerms])];
        localServer = await startE2ELocalServer({
            jitendexPath: cachedDictionaries.jitendexPath,
            jmnedictPath: cachedDictionaries.jmnedictPath,
            jmdictPath: cachedDictionaries.jmdictPath,
        });
        const cacheWarmupEnd = safePerformance.now();
        const runHeadless = (process.env.MANABITAN_CHROMIUM_HEADLESS ?? '1').trim() === '1';
        const hideWindow = (process.env.MANABITAN_CHROMIUM_HIDE_WINDOW ?? (process.platform === 'darwin' ? '1' : '0')).trim() === '1';
        const allowHeadedFallback = (process.env.MANABITAN_CHROMIUM_ALLOW_HEADED_FALLBACK ?? '1').trim() === '1';
        let currentHeadless = runHeadless;
        let currentHideWindow = hideWindow;
        /**
         * @param {boolean} headless
         * @param {boolean} hideWindowForHeaded
         * @returns {Promise<import('@playwright/test').BrowserContext>}
         */
        const launchContext = async (headless, hideWindowForHeaded) => {
            /** @type {string[]} */
            const launchArgs = [
                `--disable-extensions-except=${extensionDir}`,
                `--load-extension=${extensionDir}`,
            ];
            if (!headless && hideWindowForHeaded) {
                launchArgs.push('--window-position=3000,3000', '--window-size=1280,800', '--start-minimized');
            }
            /** @type {import('@playwright/test').LaunchPersistentContextOptions} */
            const launchOptions = {
                headless,
                args: launchArgs,
            };
            if (browserChannel !== null) {
                launchOptions.channel = browserChannel;
            }
            return await chromium.launchPersistentContext(userDataDir, {
                ...launchOptions,
            });
        };
        /**
         * @param {import('@playwright/test').Page} targetPage
         * @returns {void}
         */
        const attachPageLogging = (targetPage) => {
            targetPage.on('console', (message) => {
                const text = message.text();
                appendLog(report, `console:${message.type()}`, text);
            });
            targetPage.on('pageerror', (error) => {
                appendLog(report, 'pageerror', errorMessage(error));
            });
        };
        /**
         * @param {import('@playwright/test').Page} targetPage
         * @returns {Promise<import('@playwright/test').CDPSession|null>}
         */
        const createCdpSessionForPage = async (targetPage) => {
            try {
                const nextCdpSession = await context.newCDPSession(targetPage);
                await nextCdpSession.send('Profiler.enable');
                await nextCdpSession.send('Performance.enable');
                return nextCdpSession;
            } catch (_) {
                return null;
            }
        };
        /**
         * @returns {Promise<string>}
         */
        const relaunchPersistentContext = async () => {
            if (context !== null) {
                try { await context.close(); } catch (_) {}
            }
            if (processSampler !== null) {
                await processSampler.stop();
            }
            context = await launchContext(currentHeadless, currentHideWindow);
            const relaunchedExtensionId = await discoverExtensionId(context, userDataDir, extensionDir);
            page = context.pages()[0] ?? await context.newPage();
            attachPageLogging(page);
            const browserProcess = context.browser()?.process?.();
            const browserPidFromPlaywright = (browserProcess && typeof browserProcess.pid === 'number') ? browserProcess.pid : null;
            const browserPid = browserPidFromPlaywright ?? await findChromiumPidByProfileDir(userDataDir);
            processSampler = startProcessSampler(browserPid);
            cdpSession = await createCdpSessionForPage(page);
            return `chrome-extension://${relaunchedExtensionId}`;
        };
        /**
         * @param {string[]} titles
         * @returns {string[]}
         */
        const getTransientUpdateTitles = (titles) => (
            titles.filter((title) => /\[(?:update-staging|cutover|replaced) [^\]]+\]/.test(String(title || '')))
        );
        /**
         * @param {{
         *   expectedInstalledTitles: string[],
         *   backendReadyDictionaryNames: string[],
         *   backendReadyTerm: string,
         *   searchChecks: Array<{label: string, term: string, dictionaryNames: string[]}>,
         *   ensureNoStagedTitles?: boolean,
         * }} options
         * @returns {Promise<{
         *   extensionBaseUrl: string,
         *   installedTitles: string[],
         *   stagedTitles: string[],
         *   backendDiagnostics: unknown,
         *   searchChecks: Array<{label: string, term: string, dictionaryNames: string[], result: unknown}>,
         * }>}
         */
        const relaunchAndVerifyPersistence = async ({
            expectedInstalledTitles,
            backendReadyDictionaryNames,
            backendReadyTerm,
            searchChecks,
            ensureNoStagedTitles = false,
        }) => {
            const normalizeNameSet = (values) => [...new Set(
                (Array.isArray(values) ? values : [])
                    .map((value) => String(value || '').trim())
                    .filter((value) => value.length > 0),
            )].sort((a, b) => a.localeCompare(b));
            const normalizeDictionaryRows = (rows) => (Array.isArray(rows) ? rows : [])
                .map((row) => ({
                    name: String(row?.name || '').trim(),
                    enabled: row?.enabled === true,
                }))
                .filter((row) => row.name.length > 0)
                .sort((a, b) => a.name.localeCompare(b.name) || Number(a.enabled) - Number(b.enabled));
            const preRestartDiagnostics = await evalSendMessage(page, 'backendDiagnostics', backendReadyTerm);
            const mainDictionaryBeforeRestart = String(preRestartDiagnostics?.profileMainDictionary || '').trim();
            const sortFrequencyDictionaryBeforeRestart = String(preRestartDiagnostics?.profileSortFrequencyDictionary || '').trim();
            const profileSelectorStateBeforeRestart = Array.isArray(preRestartDiagnostics?.profileSelectorState) ? preRestartDiagnostics.profileSelectorState : [];
            if (concurrentSearchPage !== null) {
                try { await concurrentSearchPage.close(); } catch (_) {}
                concurrentSearchPage = null;
            }
            const restartedExtensionBaseUrl = await relaunchPersistentContext();
            await page.goto(`${restartedExtensionBaseUrl}/settings.html?popup-preview=false`);
            await page.waitForSelector('#dictionary-import-file-input', {state: 'attached', timeout: 30000});
            await openInstalledDictionariesModal(page);
            const restartedInstalledTitles = await getInstalledDictionaryTitles(page);
            const hasExpectedInstalledSet = expectedInstalledTitles.every((expectedTitle) => (
                restartedInstalledTitles.some((title) => matchesDictionaryName(title, expectedTitle))
            ));
            if (!hasExpectedInstalledSet) {
                throw new Error(`Installed dictionary set did not persist across restart. titles=${JSON.stringify(restartedInstalledTitles)} expected=${JSON.stringify(expectedInstalledTitles)}`);
            }
            const transientTitles = getTransientUpdateTitles(restartedInstalledTitles);
            if (ensureNoStagedTitles && transientTitles.length > 0) {
                throw new Error(`Transient update dictionaries remained after restart: ${JSON.stringify(transientTitles)}`);
            }
            const preVerificationDiagnostics = await evalSendMessage(page, 'backendDiagnostics', backendReadyTerm);
            const profileSelectorStateAfterRestart = Array.isArray(preVerificationDiagnostics?.profileSelectorState) ? preVerificationDiagnostics.profileSelectorState : [];
            const enabledDictionaryNames = Array.isArray(preVerificationDiagnostics?.enabledDictionaryNames) ?
                preVerificationDiagnostics.enabledDictionaryNames.map((value) => String(value || '').trim()).filter((value) => value.length > 0) :
                [];
            const missingEnabledDictionaryNames = backendReadyDictionaryNames.filter((expectedTitle) => (
                !enabledDictionaryNames.some((title) => matchesDictionaryName(title, expectedTitle))
            ));
            if (missingEnabledDictionaryNames.length > 0) {
                throw new Error(`Enabled dictionary state did not persist across restart. enabled=${JSON.stringify(enabledDictionaryNames)} missing=${JSON.stringify(missingEnabledDictionaryNames)} diagnostics=${JSON.stringify(preVerificationDiagnostics)}`);
            }
            const mainDictionaryAfterRestart = String(preVerificationDiagnostics?.profileMainDictionary || '').trim();
            if (
                mainDictionaryAfterRestart.length === 0 ||
                !backendReadyDictionaryNames.some((expectedTitle) => matchesDictionaryName(mainDictionaryAfterRestart, expectedTitle))
            ) {
                throw new Error(`Main dictionary selection did not persist across restart. mainDictionary=${JSON.stringify(mainDictionaryAfterRestart)} expectedDictionaryNames=${JSON.stringify(backendReadyDictionaryNames)} diagnostics=${JSON.stringify(preVerificationDiagnostics)}`);
            }
            if (mainDictionaryBeforeRestart.length > 0 && mainDictionaryAfterRestart !== mainDictionaryBeforeRestart) {
                throw new Error(`Main dictionary selection changed across restart. before=${JSON.stringify(mainDictionaryBeforeRestart)} after=${JSON.stringify(mainDictionaryAfterRestart)} diagnostics=${JSON.stringify(preVerificationDiagnostics)}`);
            }
            const sortFrequencyDictionaryAfterRestart = String(preVerificationDiagnostics?.profileSortFrequencyDictionary || '').trim();
            if (sortFrequencyDictionaryBeforeRestart.length > 0 && sortFrequencyDictionaryAfterRestart.length === 0) {
                throw new Error(`Sort frequency dictionary selection was cleared across restart. before=${JSON.stringify(sortFrequencyDictionaryBeforeRestart)} diagnostics=${JSON.stringify(preVerificationDiagnostics)}`);
            }
            if (sortFrequencyDictionaryBeforeRestart.length > 0 && sortFrequencyDictionaryAfterRestart !== sortFrequencyDictionaryBeforeRestart) {
                throw new Error(`Sort frequency dictionary selection changed across restart. before=${JSON.stringify(sortFrequencyDictionaryBeforeRestart)} after=${JSON.stringify(sortFrequencyDictionaryAfterRestart)} diagnostics=${JSON.stringify(preVerificationDiagnostics)}`);
            }
            if (
                sortFrequencyDictionaryAfterRestart.length > 0 &&
                !backendReadyDictionaryNames.some((expectedTitle) => matchesDictionaryName(sortFrequencyDictionaryAfterRestart, expectedTitle))
            ) {
                throw new Error(`Sort frequency dictionary selection did not persist across restart. sortFrequencyDictionary=${JSON.stringify(sortFrequencyDictionaryAfterRestart)} expectedDictionaryNames=${JSON.stringify(backendReadyDictionaryNames)} diagnostics=${JSON.stringify(preVerificationDiagnostics)}`);
            }
            if (profileSelectorStateBeforeRestart.length !== profileSelectorStateAfterRestart.length) {
                throw new Error(`Profile selector state count changed across restart. before=${JSON.stringify(profileSelectorStateBeforeRestart)} after=${JSON.stringify(profileSelectorStateAfterRestart)}`);
            }
            for (let i = 0; i < profileSelectorStateBeforeRestart.length; ++i) {
                const before = profileSelectorStateBeforeRestart[i];
                const after = profileSelectorStateAfterRestart[i];
                if (
                    String(before?.id || '') !== String(after?.id || '') ||
                    String(before?.mainDictionary || '') !== String(after?.mainDictionary || '') ||
                    String(before?.sortFrequencyDictionary || '') !== String(after?.sortFrequencyDictionary || '') ||
                    JSON.stringify(normalizeDictionaryRows(before?.dictionaryRows)) !==
                        JSON.stringify(normalizeDictionaryRows(after?.dictionaryRows)) ||
                    JSON.stringify(normalizeNameSet(before?.enabledDictionaryNames)) !==
                        JSON.stringify(normalizeNameSet(after?.enabledDictionaryNames))
                ) {
                    throw new Error(`Profile selector state changed across restart. before=${JSON.stringify(profileSelectorStateBeforeRestart)} after=${JSON.stringify(profileSelectorStateAfterRestart)}`);
                }
            }
            const backendReadyAfterRestart = await waitForBackendDictionaryReady(page, backendReadyDictionaryNames, backendReadyTerm, 60000, false);
            if (!(backendReadyAfterRestart && backendReadyAfterRestart.ok === true)) {
                throw new Error(`Backend dictionary readiness did not persist across restart. diagnostics=${JSON.stringify(backendReadyAfterRestart?.diagnostics ?? null)}`);
            }
            /** @type {Array<{label: string, term: string, dictionaryNames: string[], result: unknown}>} */
            const searchResults = [];
            if (Array.isArray(searchChecks) && searchChecks.length > 0) {
                await page.goto(`${restartedExtensionBaseUrl}/search.html`);
                await page.waitForSelector('#search-textbox', {state: 'attached', timeout: 30000});
                for (const searchCheck of searchChecks) {
                    const searchResult = await searchTermAndGetDictionaryHitCounts(page, searchCheck.term, searchCheck.dictionaryNames, 20000);
                    const missingDictionaryNames = searchCheck.dictionaryNames.filter((dictionaryName) => (
                        Number(searchResult.expectedCounts?.[dictionaryName] ?? 0) < 1
                    ));
                    if (missingDictionaryNames.length > 0) {
                        throw new Error(`Search after restart did not include expected dictionaries for ${searchCheck.label}. missing=${JSON.stringify(missingDictionaryNames)} result=${JSON.stringify(searchResult)}`);
                    }
                    searchResults.push({
                        label: searchCheck.label,
                        term: searchCheck.term,
                        dictionaryNames: searchCheck.dictionaryNames,
                        result: searchResult,
                    });
                }
            }
            return {
                extensionBaseUrl: restartedExtensionBaseUrl,
                installedTitles: restartedInstalledTitles,
                stagedTitles: transientTitles,
                preVerificationDiagnostics,
                backendDiagnostics: backendReadyAfterRestart?.diagnostics ?? null,
                searchChecks: searchResults,
            };
        };
        /**
         * @param {string} warmupTerm
         * @returns {Promise<{
         *   page: import('@playwright/test').Page,
         *   backendReady: unknown,
         *   searchReady: unknown,
         *   searchDebug: unknown,
         * }>}
         */
        const openConcurrentSearchPageAndWarm = async (warmupTerm) => {
            const concurrentSearchPagePromise = context.waitForEvent('page', {timeout: 30000});
            await page.evaluate(() => {
                window.open(chrome.runtime.getURL('search.html'), '_blank', 'noopener');
            });
            concurrentSearchPage = await concurrentSearchPagePromise;
            await concurrentSearchPage.waitForLoadState('domcontentloaded');
            await waitForSearchPageInitialized(concurrentSearchPage, 30000);
            const backendReady = await waitForBackendDictionaryReady(concurrentSearchPage, ['JMdict'], warmupTerm, 60000, true);
            if (!(backendReady && backendReady.ok === true)) {
                throw new Error(`Concurrent search backend readiness failed: ${JSON.stringify(backendReady)}`);
            }
            const searchReady = await waitForSearchPageLookupReady(concurrentSearchPage, extensionBaseUrl, warmupTerm, ['JMdict'], 30000, 'button');
            if (!(searchReady && searchReady.ok === true)) {
                throw new Error(`Concurrent search warmup failed: ${JSON.stringify(searchReady)}`);
            }
            const searchDebug = await getSearchPageDebugState(concurrentSearchPage);
            return {
                page: concurrentSearchPage,
                backendReady,
                searchReady,
                searchDebug,
            };
        };
        let extensionId = '';
        let launchModeLabel = runHeadless ? 'headless' : (hideWindow ? 'headed-hidden' : 'headed-visible');
        try {
            context = await launchContext(runHeadless, hideWindow);
            extensionId = await discoverExtensionId(context, userDataDir, extensionDir);
        } catch (e) {
            if (!runHeadless || !allowHeadedFallback) {
                throw e;
            }
            appendLog(report, 'warning', `Headless ${browserFlavor} extension discovery failed; retrying with headed hidden window. error=${errorMessage(e)}`);
            if (context !== null) {
                try { await context.close(); } catch (_) {}
                context = null;
            }
            context = await launchContext(false, true);
            extensionId = await discoverExtensionId(context, userDataDir, extensionDir);
            currentHeadless = false;
            currentHideWindow = true;
            launchModeLabel = 'headed-hidden-fallback';
        }
        report.launchMode = launchModeLabel;
        appendLog(report, 'info', `${browserFlavor} launch mode: ${launchModeLabel}`);
        const extensionBaseUrl = `chrome-extension://${extensionId}`;
        page = context.pages()[0] ?? await context.newPage();
        /** @type {import('@playwright/test').Page|null} */
        let concurrentSearchPage = null;
        attachPageLogging(page);
        const browserProcess = context.browser()?.process?.();
        const browserPidFromPlaywright = (browserProcess && typeof browserProcess.pid === 'number') ? browserProcess.pid : null;
        const browserPid = browserPidFromPlaywright ?? await findChromiumPidByProfileDir(userDataDir);
        processSampler = startProcessSampler(browserPid);
        cdpSession = await createCdpSessionForPage(page);

        const settingsOpenStart = safePerformance.now();
        await page.goto(`${extensionBaseUrl}/settings.html?popup-preview=false`);
        await page.waitForSelector('#dictionary-import-file-input', {state: 'attached', timeout: 30000});
        const settingsOpenEnd = safePerformance.now();
        await addReportPhase(report, page, 'Open settings page', 'Settings loaded and dictionary import controls visible', settingsOpenStart, settingsOpenEnd, null, processSampler);

        const runtimeDiagnosticsStart = safePerformance.now();
        const runtimeProfile = await runPhaseProfile(cdpSession, async () => {
            return await page.evaluate(async () => {
                const manifest = chrome.runtime.getManifest();
                const mod = await import('/js/dictionary/sqlite-wasm.js');
                const sqlite3 = await mod.getSqlite3();
                const capi = sqlite3 && sqlite3.capi;
                const startupDiagnosticsSnapshot = await new Promise((resolve) => {
                    const localStorageArea = chrome.storage && chrome.storage.local;
                    if (!localStorageArea || typeof localStorageArea.get !== 'function') {
                        resolve(null);
                        return;
                    }
                    localStorageArea.get(['manabitanStartupDiagnostics'], (value) => {
                        const runtimeError = chrome.runtime.lastError;
                        if (runtimeError) {
                            resolve({error: runtimeError.message || String(runtimeError)});
                            return;
                        }
                        const snapshot = value && typeof value === 'object' ? value.manabitanStartupDiagnostics : null;
                        resolve(snapshot ?? null);
                    });
                });
                let opfsSahpoolVfsPtr = null;
                if (typeof (capi && capi.sqlite3_vfs_find) === 'function') {
                    opfsSahpoolVfsPtr = capi.sqlite3_vfs_find('opfs-sahpool');
                }
                const startupOpenStorageDiagnostics = (
                    startupDiagnosticsSnapshot &&
                    typeof startupDiagnosticsSnapshot === 'object' &&
                    !Array.isArray(startupDiagnosticsSnapshot) &&
                    typeof startupDiagnosticsSnapshot.dictionaryOpenStorageDiagnostics === 'object' &&
                    startupDiagnosticsSnapshot.dictionaryOpenStorageDiagnostics !== null
                ) ? startupDiagnosticsSnapshot.dictionaryOpenStorageDiagnostics : null;
                return {
                    hasStorageGetDirectory: !!(navigator.storage && typeof navigator.storage.getDirectory === 'function'),
                    hasCreateSyncAccessHandle: !!(
                        globalThis.FileSystemFileHandle &&
                        globalThis.FileSystemFileHandle.prototype &&
                        typeof globalThis.FileSystemFileHandle.prototype.createSyncAccessHandle === 'function'
                    ),
                    hasOpfsSahpoolVfs: (
                        startupOpenStorageDiagnostics &&
                        typeof startupOpenStorageDiagnostics.hasOpfsSahpoolVfs === 'boolean'
                    ) ? startupOpenStorageDiagnostics.hasOpfsSahpoolVfs : false,
                    opfsSahpoolVfsPtr,
                    opfsSahpoolInstallResult: (
                        startupOpenStorageDiagnostics &&
                        typeof startupOpenStorageDiagnostics.opfsSahpoolInstallResult === 'string'
                    ) ? startupOpenStorageDiagnostics.opfsSahpoolInstallResult : null,
                    openStorageMode: (
                        startupOpenStorageDiagnostics &&
                        typeof startupOpenStorageDiagnostics.mode === 'string'
                    ) ? startupOpenStorageDiagnostics.mode : null,
                    openStorageDiagnostics: startupOpenStorageDiagnostics,
                    startupDiagnosticsSnapshot,
                };
            });
        });
        const runtimeDiagnostics = runtimeProfile.result;
        report.runtimeDiagnostics = runtimeDiagnostics ?? null;
        const runtimeDiagnosticsEnd = safePerformance.now();
        await addReportPhase(report, page, 'Runtime diagnostics', `Chromium OPFS/isolation diagnostics: ${JSON.stringify(runtimeDiagnostics)}`, runtimeDiagnosticsStart, runtimeDiagnosticsEnd, runtimeProfile, processSampler);
        if (!isOpfsRuntimeAvailable(runtimeDiagnostics)) {
            appendLog(
                report,
                'warning',
                `Settings-page sqlite diagnostics indicate incomplete OPFS surface; verifying backend runtime directly. diagnostics=${JSON.stringify(runtimeDiagnostics)}`,
            );
        }

        const backendRuntimeProbeStart = safePerformance.now();
        let backendRuntimeProbeProfile = null;
        try {
            backendRuntimeProbeProfile = await runPhaseProfile(cdpSession, async () => {
                return await evalSendMessage(page, 'backendProbe');
            });
        } catch (e) {
            fail(
                `OPFS runtime unavailable for ${browserFlavor} extension E2E in launchMode=${launchModeLabel}. ` +
                `backendProbeError=${errorMessage(e)} diagnostics=${JSON.stringify(runtimeDiagnostics)}. ` +
                `Use a ${browserFlavor} launch mode/environment where extension OPFS is available ` +
                '(for local debugging: MANABITAN_CHROMIUM_HEADLESS=0 MANABITAN_CHROMIUM_HIDE_WINDOW=1).',
            );
        }
        const backendRuntimeProbeEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Backend OPFS probe',
            `Verified backend dictionary database call path responds in extension runtime: ${JSON.stringify(backendRuntimeProbeProfile?.result ?? null)}`,
            backendRuntimeProbeStart,
            backendRuntimeProbeEnd,
            backendRuntimeProbeProfile,
            processSampler,
        );

        const resetSettingsStart = safePerformance.now();
        const resetSettingsProfile = await runPhaseProfile(cdpSession, async () => {
            return await evalSendMessage(page, 'purge');
        });
        const resetSettingsResult = resetSettingsProfile.result;
        if (!(resetSettingsResult && resetSettingsResult.ok === true)) {
            fail(`settings reset failed: ${JSON.stringify(resetSettingsResult)}`);
        }
        const resetSettingsEnd = safePerformance.now();
        await addReportPhase(report, page, 'Reset dictionary settings', 'Cleared profile dictionary enablement state before import (fresh browser profile is used for DB isolation)', resetSettingsStart, resetSettingsEnd, resetSettingsProfile, processSampler);

        const configureImportSessionStart = safePerformance.now();
        const configureImportSessionProfile = await runPhaseProfile(cdpSession, async () => {
            const importFlags = e2eImportFlags;
            await page.evaluate((flagsFromRunner) => {
                globalThis.manabitanImportUseSession = false;
                globalThis.manabitanDisableIntegrityCounts = true;
                globalThis.manabitanImportPerformanceFlags = (flagsFromRunner && typeof flagsFromRunner === 'object') ? {...flagsFromRunner} : {};
            }, importFlags);
        });
        const configureImportSessionEnd = safePerformance.now();
        const importSessionDetails = (e2eImportFlags !== null) ?
            `Set globalThis.manabitanImportUseSession=false; applied explicit import flags ${JSON.stringify(e2eImportFlags)}` :
            'Set globalThis.manabitanImportUseSession=false for functional import/update availability verification';
        await addReportPhase(report, page, 'Configure functional import mode', importSessionDetails, configureImportSessionStart, configureImportSessionEnd, configureImportSessionProfile, processSampler);

        await addReportPhase(
            report,
            page,
            'Warmup real dictionary cache',
            `Resolved and cached Jitendex/JMdict/JMnedict archives from recommended feed, then served locally at ${localServer.baseUrl}. quickImportBenchmarkMode=${quickImportBenchmarkMode}. probeTerms: jitendex=${String(jitendexProbeTerms.length)} jmdict=${String(jmdictProbeTerms.length)} jmnedict=${String(jmnedictProbeTerms.length)} merged=${String(extendedLookupProbeCandidates.length)}`,
            cacheWarmupStart,
            cacheWarmupEnd,
            null,
            processSampler,
        );

        const recordImportProgress = async (importLabel, details, runImport) => {
            const importStepIndexByLabel = new Map();
            const importTotalStart = safePerformance.now();
            const importTotalProfile = await runPhaseProfile(cdpSession, async () => {
                await runImport(async (label, stepStart, stepEnd) => {
                    const baseName = `Import progress: ${label}`;
                    const previousCount = importStepIndexByLabel.get(baseName) || 0;
                    const nextCount = previousCount + 1;
                    importStepIndexByLabel.set(baseName, nextCount);
                    const phaseName = nextCount > 1 ? `${baseName} (#${String(nextCount)})` : baseName;
                    await addReportPhase(
                        report,
                        page,
                        phaseName,
                        `Observed import progress state transition for ${importLabel}: ${label}`,
                        stepStart,
                        stepEnd,
                        null,
                        processSampler,
                    );
                });
            });
            const importTotalEnd = safePerformance.now();
            const importDebug = await getLastImportDebug(page);
            const importDebugHistory = await getImportDebugHistory(page);
            const importStepTimingHistory = await getImportStepTimingHistory(page);
            const importStepTimingSummary = summarizeImportStepTimingHistory(importStepTimingHistory);
            const importStep4Breakdown = summarizeImportStep4Breakdown(importDebugHistory);
            await addReportPhase(
                report,
                page,
                `${importLabel}: total import`,
                `${details}. debug=${JSON.stringify(importDebug)} history=${JSON.stringify(importDebugHistory)} stepTimingSummary=${JSON.stringify(importStepTimingSummary)} step4Breakdown=${JSON.stringify(importStep4Breakdown)}`,
                importTotalStart,
                importTotalEnd,
                importTotalProfile,
                processSampler,
            );
            return importDebug;
        };

        const jmdictImportTriggerStart = safePerformance.now();
        const jmdictImportTriggerProfile = await runPhaseProfile(cdpSession, async () => {
            await page.setInputFiles('#dictionary-import-file-input', [cachedDictionaries.jmdictPath]);
        });
        const jmdictImportTriggerEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Import JMdict via file input',
            `Triggered initial JMdict import using cached archive ${cachedDictionaries.jmdictPath}`,
            jmdictImportTriggerStart,
            jmdictImportTriggerEnd,
            jmdictImportTriggerProfile,
            processSampler,
        );
        const jmdictImportDebug = await recordImportProgress(
            'JMdict',
            'Waited for progress clear for initial JMdict import',
            async (onStepChange) => {
                await waitForImportCompletion(page, 'JMdict', 300000, onStepChange);
            },
        );
        if (!(jmdictImportDebug && jmdictImportDebug.hasResult === true && typeof jmdictImportDebug.resultTitle === 'string' && jmdictImportDebug.resultTitle.includes('JMdict'))) {
            fail(`Initial JMdict import did not finish with expected debug payload: ${JSON.stringify(jmdictImportDebug)}`);
        }

        if (quickImportBenchmarkMode) {
            report.status = 'success';
            console.log(`${e2eLogTag} PASS: Quick import benchmark mode completed (JMdict).`);
            return;
        }

        const reloadAfterJmdictImportStart = safePerformance.now();
        await page.goto(`${extensionBaseUrl}/settings.html?popup-preview=false`);
        await page.waitForSelector('#dictionary-import-file-input', {state: 'attached', timeout: 30000});
        const reloadAfterJmdictImportEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Reload settings page after JMdict import',
            'Reloaded settings after the initial import so backend dictionary state and modal controls are refreshed before concurrent lookup checks.',
            reloadAfterJmdictImportStart,
            reloadAfterJmdictImportEnd,
            null,
            processSampler,
        );

        const enableJmdictStart = safePerformance.now();
        const enableJmdictProfile = await runPhaseProfile(cdpSession, async () => {
            const enableAllResult = await evalSendMessage(page, 'enableInstalledDictionaries');
            if (!(enableAllResult && enableAllResult.ok === true)) {
                throw new Error(`enableInstalledDictionaries failed before concurrent-import verification: ${JSON.stringify(enableAllResult)}`);
            }
            return await setEnabledDictionaries(page, ['JMdict']);
        });
        const enableJmdictEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Enable JMdict before concurrent import verification',
            `Enabled installed dictionaries and restricted active profile to JMdict before starting Jitendex import: ${JSON.stringify(enableJmdictProfile.result ?? null)}`,
            enableJmdictStart,
            enableJmdictEnd,
            enableJmdictProfile,
            processSampler,
        );
        const waitForJmdictTermsStart = safePerformance.now();
        const waitForJmdictTermsProfile = await runPhaseProfile(cdpSession, async () => {
            return await waitForBackendDictionaryTermsPresent(page, ['JMdict'], 60000);
        });
        const waitForJmdictTermsEnd = safePerformance.now();
        if (!(waitForJmdictTermsProfile.result && waitForJmdictTermsProfile.result.ok === true)) {
            fail(`JMdict backend term index did not become visible after import. diagnostics=${JSON.stringify(waitForJmdictTermsProfile.result?.diagnostics ?? null)}`);
        }
        await addReportPhase(
            report,
            page,
            'Wait for JMdict backend term index after import',
            `Waited for offscreen/backend refresh to report positive JMdict term counts before discovering a concurrent-search warmup term: ${JSON.stringify(waitForJmdictTermsProfile.result?.diagnostics ?? null)}`,
            waitForJmdictTermsStart,
            waitForJmdictTermsEnd,
            waitForJmdictTermsProfile,
            processSampler,
        );
        const verifyJmdictContentStart = safePerformance.now();
        const verifyJmdictContentProfile = await runPhaseProfile(cdpSession, async () => {
            return await waitForBackendDictionaryContentIntegrity(page, ['JMdict'], [...jmdictProbeTerms, ...lookupProbeCandidates], 15000);
        });
        const verifyJmdictContentEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Verify JMdict backend content integrity after import',
            `Checked that imported JMdict term-content spans are readable and in bounds before concurrent lookup warmup: ${JSON.stringify(verifyJmdictContentProfile.result ?? null)}`,
            verifyJmdictContentStart,
            verifyJmdictContentEnd,
            verifyJmdictContentProfile,
            processSampler,
        );
        if (!(verifyJmdictContentProfile.result && verifyJmdictContentProfile.result.ok === true)) {
            fail(`JMdict backend content integrity failed after import. diagnostics=${JSON.stringify(verifyJmdictContentProfile.result ?? null)}`);
        }
        const discoverConcurrentWarmupTermStart = safePerformance.now();
        const discoverConcurrentWarmupTermProfile = await runPhaseProfile(cdpSession, async () => {
            return await findOverlapLookupTerm(page, ['JMdict'], [...jmdictProbeTerms, ...lookupProbeCandidates]);
        });
        const discoverConcurrentWarmupTermEnd = safePerformance.now();
        if (!(discoverConcurrentWarmupTermProfile.result && discoverConcurrentWarmupTermProfile.result.ok === true)) {
            fail(`Unable to discover a JMdict warmup term before concurrent import verification. probes=${JSON.stringify(discoverConcurrentWarmupTermProfile.result?.probes ?? [])}`);
        }
        const concurrentWarmupTerm = String(discoverConcurrentWarmupTermProfile.result.term || jmdictProbeTerms[0] || lookupProbeCandidates[0] || '日本');
        await addReportPhase(
            report,
            page,
            'Discover JMdict warmup term for concurrent search tab',
            `Selected JMdict warmup term "${concurrentWarmupTerm}" from backend diagnostics before opening the concurrent search tab. probes=${JSON.stringify(discoverConcurrentWarmupTermProfile.result?.probes ?? [])}`,
            discoverConcurrentWarmupTermStart,
            discoverConcurrentWarmupTermEnd,
            discoverConcurrentWarmupTermProfile,
            processSampler,
        );
        const concurrentSearchOpenStart = safePerformance.now();
        const concurrentSearchPagePromise = context.waitForEvent('page', {timeout: 30000});
        await page.evaluate(() => {
            window.open(chrome.runtime.getURL('search.html'), '_blank', 'noopener');
        });
        concurrentSearchPage = await concurrentSearchPagePromise;
        await concurrentSearchPage.waitForLoadState('domcontentloaded');
        await waitForSearchPageInitialized(concurrentSearchPage, 30000);
        const concurrentSearchOpenEnd = safePerformance.now();
        await addReportPhase(
            report,
            concurrentSearchPage,
            'Open dedicated concurrent lookup tab',
            'Opened a second extension search tab so dictionary search can be exercised while settings continues importing/updating dictionaries.',
            concurrentSearchOpenStart,
            concurrentSearchOpenEnd,
            null,
            processSampler,
        );

        const concurrentWarmupReadyStart = safePerformance.now();
        const concurrentWarmupReadyProfile = await runPhaseProfile(cdpSession, async () => {
            const backendReady = await waitForBackendDictionaryReady(concurrentSearchPage, ['JMdict'], concurrentWarmupTerm, 60000, true);
            if (!(backendReady && backendReady.ok === true)) {
                return {
                    ok: false,
                    backendReady,
                    result: {
                        expectedCounts: {JMdict: 0},
                        observedCounts: {},
                        noResultsVisible: false,
                        entriesTextPreview: '',
                    },
                };
            }
            const searchReady = await waitForSearchPageLookupReady(concurrentSearchPage, extensionBaseUrl, concurrentWarmupTerm, ['JMdict'], 30000, 'button');
            return {
                ...searchReady,
                backendReady,
            };
        });
        const concurrentWarmupReadyEnd = safePerformance.now();
        const concurrentWarmupSearchDebug = await getSearchPageDebugState(concurrentSearchPage);
        if (!(concurrentWarmupReadyProfile.result && concurrentWarmupReadyProfile.result.ok === true)) {
            fail(
                `Dedicated JMdict lookup tab did not become lookup-ready before probe discovery: ` +
                `${JSON.stringify(concurrentWarmupReadyProfile.result ?? null)} ` +
                `searchDebug=${JSON.stringify(concurrentWarmupSearchDebug)}`,
            );
        }
        await addReportPhase(
            report,
            concurrentSearchPage,
            'Warm up dedicated concurrent lookup tab after enabling JMdict',
            `Dedicated search tab confirmed JMdict lookup readiness on warmup term "${concurrentWarmupTerm}" before concurrent verification: ${JSON.stringify(concurrentWarmupReadyProfile.result ?? null)} searchDebug=${JSON.stringify(concurrentWarmupSearchDebug)}`,
            concurrentWarmupReadyStart,
            concurrentWarmupReadyEnd,
            concurrentWarmupReadyProfile,
            processSampler,
        );

        const concurrentProbeTermStart = safePerformance.now();
        const concurrentProbeTermProfile = await runPhaseProfile(cdpSession, async () => {
            return await findOverlapLookupTermOnSearchPage(concurrentSearchPage, ['JMdict'], [...jmdictProbeTerms, ...lookupProbeCandidates]);
        });
        const concurrentProbeTermEnd = safePerformance.now();
        if (!(concurrentProbeTermProfile.result && concurrentProbeTermProfile.result.ok === true)) {
            fail(`Unable to discover a JMdict lookup probe term for concurrent verification: ${JSON.stringify(concurrentProbeTermProfile.result?.probes ?? [])}`);
        }
        const concurrentProbeTerm = String(concurrentProbeTermProfile.result.term || '');
        await addReportPhase(
            report,
            page,
            'Discover JMdict probe term for concurrent verification',
            `Selected JMdict probe term "${concurrentProbeTerm}" for concurrent import/update verification. probes=${JSON.stringify(concurrentProbeTermProfile.result?.probes ?? [])}`,
            concurrentProbeTermStart,
            concurrentProbeTermEnd,
            concurrentProbeTermProfile,
            processSampler,
        );

        const concurrentBackendReadyStart = safePerformance.now();
        const concurrentBackendReadyProfile = await runPhaseProfile(cdpSession, async () => {
            return await searchTermAndGetDictionaryHitCounts(concurrentSearchPage, concurrentProbeTerm, ['JMdict'], 60000);
        });
        const concurrentBackendReadyEnd = safePerformance.now();
        if (Number(concurrentBackendReadyProfile.result?.expectedCounts?.JMdict ?? 0) < 1) {
            fail(`JMdict lookup backend did not become ready before concurrent import verification: ${JSON.stringify(concurrentBackendReadyProfile.result ?? null)}`);
        }
        await addReportPhase(
            report,
            concurrentSearchPage,
            'Wait for JMdict lookup backend readiness before concurrent import',
            `Dedicated search tab confirmed JMdict lookup backend readiness before Jitendex import: ${JSON.stringify(concurrentBackendReadyProfile.result ?? null)}`,
            concurrentBackendReadyStart,
            concurrentBackendReadyEnd,
            concurrentBackendReadyProfile,
            processSampler,
        );

        const baselineConcurrentSearchStart = safePerformance.now();
        const baselineConcurrentLookupProfile = await runPhaseProfile(cdpSession, async () => {
            return await searchTermAndGetDictionaryHitCounts(concurrentSearchPage, concurrentProbeTerm, ['JMdict'], 6000);
        });
        const baselineConcurrentLookup = baselineConcurrentLookupProfile.result;
        const baselineConcurrentSearchEnd = safePerformance.now();
        await addReportPhase(
            report,
            concurrentSearchPage,
            'Verify baseline JMdict lookup backend from search tab before concurrent Jitendex import',
            `Dedicated search tab resolved backend diagnostics before Jitendex import: ${JSON.stringify(baselineConcurrentLookup)}`,
            baselineConcurrentSearchStart,
            baselineConcurrentSearchEnd,
            baselineConcurrentLookupProfile,
            processSampler,
        );
        if (Number(baselineConcurrentLookup?.expectedCounts?.JMdict ?? 0) < 1) {
            fail(`Expected baseline JMdict lookup backend before Jitendex import; saw ${JSON.stringify(baselineConcurrentLookup)}`);
        }

        if (!focusedUpdateOnlyMode) {
            const jitendexImportTriggerStart = safePerformance.now();
            const jitendexImportTriggerProfile = await runPhaseProfile(cdpSession, async () => {
                await page.setInputFiles('#dictionary-import-file-input', [cachedDictionaries.jitendexPath]);
            });
            const jitendexImportTriggerEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Import Jitendex via file input',
                `Triggered Jitendex import using cached archive ${cachedDictionaries.jitendexPath}`,
                jitendexImportTriggerStart,
                jitendexImportTriggerEnd,
                jitendexImportTriggerProfile,
                processSampler,
            );
            let concurrentDbPressurePromise = null;
            let concurrentDbPressureStart = 0;
            if (concurrentDbOpenPressureEnabled) {
                concurrentDbPressureStart = safePerformance.now();
                concurrentDbPressurePromise = runPhaseProfile(cdpSession, async () => {
                    return await evalSendMessage(page, 'concurrentDbPressure', {
                        durationMs: 15000,
                        batchDelayMs: 35,
                        parallelism: 6,
                    });
                });
            }
            await page.waitForTimeout(700);
            const searchDuringImportStart = safePerformance.now();
            const searchDuringImportProfile = await runPhaseProfile(cdpSession, async () => {
                return await searchTermAndGetDictionaryHitCounts(concurrentSearchPage, concurrentProbeTerm, ['JMdict'], 6000);
            });
            const searchDuringImportLookup = searchDuringImportProfile.result;
            const searchDuringImportEnd = safePerformance.now();
            await addReportPhase(
                report,
                concurrentSearchPage,
                'Verify JMdict lookup backend during Jitendex import',
                `While Jitendex import was in progress, dedicated search tab resolved backend diagnostics: ${JSON.stringify(searchDuringImportLookup)}`,
                searchDuringImportStart,
                searchDuringImportEnd,
                searchDuringImportProfile,
                processSampler,
            );
            if (Number(searchDuringImportLookup?.expectedCounts?.JMdict ?? 0) < 1) {
                fail(`Expected JMdict lookup backend to remain available during Jitendex import; saw ${JSON.stringify(searchDuringImportLookup)}`);
            }

            const jitendexImportDebug = await recordImportProgress(
                'Jitendex',
                'Waited for progress clear for Jitendex import after the concurrent-search check',
                async (onStepChange) => {
                    await waitForImportCompletion(page, 'Jitendex', 300000, onStepChange);
                },
            );
            if (!(jitendexImportDebug && jitendexImportDebug.hasResult === true && typeof jitendexImportDebug.resultTitle === 'string' && jitendexImportDebug.resultTitle.includes('Jitendex'))) {
                fail(`Jitendex import did not finish with expected debug payload: ${JSON.stringify(jitendexImportDebug)}`);
            }
            const verifyJitendexContentStart = safePerformance.now();
            const verifyJitendexContentProfile = await runPhaseProfile(cdpSession, async () => {
                return await waitForBackendDictionaryContentIntegrity(page, ['Jitendex'], jitendexLookupProbeCandidates, 15000);
            });
            const verifyJitendexContentEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Verify Jitendex backend content integrity after import',
                `Checked that imported Jitendex term-content spans are readable and in bounds before broader post-import verification: ${JSON.stringify(verifyJitendexContentProfile.result ?? null)}`,
                verifyJitendexContentStart,
                verifyJitendexContentEnd,
                verifyJitendexContentProfile,
                processSampler,
            );
            if (!(verifyJitendexContentProfile.result && verifyJitendexContentProfile.result.ok === true)) {
                fail(`Jitendex backend content integrity failed after import. diagnostics=${JSON.stringify(verifyJitendexContentProfile.result ?? null)}`);
            }
            if (concurrentDbPressurePromise !== null) {
                const concurrentDbPressureEnd = safePerformance.now();
                const concurrentDbPressureProfile = await concurrentDbPressurePromise;
                const concurrentDbPressureResult = concurrentDbPressureProfile.result;
                await addReportPhase(
                    report,
                    page,
                    'Concurrent DB-open pressure during JMdict import',
                    `Ran parallel termsFind/getDictionaryCounts/deleteDictionaryByTitle requests during JMdict import to classify DB contention: ${JSON.stringify(concurrentDbPressureResult)}`,
                    concurrentDbPressureStart,
                    concurrentDbPressureEnd,
                    concurrentDbPressureProfile,
                    processSampler,
                );
                const sqliteCantopenCount = Number(concurrentDbPressureResult?.sqliteCantopenCount ?? 0);
                if (Number.isFinite(sqliteCantopenCount) && sqliteCantopenCount > 0) {
                    fail(`Concurrent DB pressure observed SQLITE_CANTOPEN failures during import: ${JSON.stringify(concurrentDbPressureResult)}`);
                }
            }
        }

        const diagnosticsStart = safePerformance.now();
        let diagnosticsProfile = null;
        let postImportDiagnostics = null;
        let backendDiagnosticsError = '';
        try {
            diagnosticsProfile = await runPhaseProfile(cdpSession, async () => {
                return await evalSendMessage(page, 'backendDiagnostics', '打');
            });
            postImportDiagnostics = diagnosticsProfile.result;
        } catch (e) {
            backendDiagnosticsError = errorMessage(e);
        }
        const diagnosticsEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Post-import backend diagnostics',
            backendDiagnosticsError.length > 0 ?
                `Backend diagnostics unavailable in this Chromium harness: ${backendDiagnosticsError}` :
                `After imports, backend diagnostics: ${JSON.stringify(postImportDiagnostics)}`,
            diagnosticsStart,
            diagnosticsEnd,
            diagnosticsProfile,
            processSampler,
        );
        const enableImportedDictionariesStart = safePerformance.now();
        const enableImportedDictionariesProfile = await runPhaseProfile(cdpSession, async () => {
            return await evalSendMessage(page, 'enableInstalledDictionaries');
        });
        const enableImportedDictionariesEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Enable imported dictionaries in profile options',
            `Enabled installed dictionaries for active profiles: ${JSON.stringify(enableImportedDictionariesProfile.result ?? null)}`,
            enableImportedDictionariesStart,
            enableImportedDictionariesEnd,
            enableImportedDictionariesProfile,
            processSampler,
        );
        const updatePhaseLookupDictionaries = focusedUpdateOnlyMode ? ['JMdict'] : expectedLookupDictionaries;
        const installedTitles = [
            ...(Array.isArray(enableImportedDictionariesProfile.result?.installedTitles) ? enableImportedDictionariesProfile.result.installedTitles : []),
            ...(Array.isArray(postImportDiagnostics?.installedTitles) ? postImportDiagnostics.installedTitles : []),
        ];
        const resolvedJmdictTitle = resolveInstalledDictionaryTitle(installedTitles, 'JMdict') ?? 'JMdict';
        await setEnabledDictionaries(page, updatePhaseLookupDictionaries);
        const overlapProbeStart = safePerformance.now();
        const overlapProbeProfile = await runPhaseProfile(cdpSession, async () => {
            return await findOverlapLookupTerm(page, updatePhaseLookupDictionaries, lookupProbeCandidates);
        });
        const overlapProbeEnd = safePerformance.now();
        const hasOverlapLookupTerm = overlapProbeProfile.result && overlapProbeProfile.result.ok === true;
        let overlapLookupTerm = String(overlapProbeProfile.result?.term || '暗記');
        await addReportPhase(
            report,
            page,
            'Discover overlap lookup term',
            hasOverlapLookupTerm ?
                `Selected lookup term "${overlapLookupTerm}" that resolves to ${updatePhaseLookupDictionaries.join(' + ')}. probes=${JSON.stringify(overlapProbeProfile.result?.probes ?? [])}` :
                `Could not find dual-dictionary overlap term; probing dictionaries in isolated mode. probes=${JSON.stringify(overlapProbeProfile.result?.probes ?? [])}`,
            overlapProbeStart,
            overlapProbeEnd,
            overlapProbeProfile,
            processSampler,
        );
        if (!hasOverlapLookupTerm) {
            /** @type {string[]} */
            const isolatedLookupUnavailable = [];
            for (const dictionaryName of updatePhaseLookupDictionaries) {
                const isolatedEnableStart = safePerformance.now();
                const isolatedEnableProfile = await runPhaseProfile(cdpSession, async () => {
                    await setEnabledDictionaries(page, [dictionaryName]);
                    return await findOverlapLookupTerm(page, [dictionaryName], lookupProbeCandidates);
                });
                const isolatedEnableEnd = safePerformance.now();
                const isolatedResult = isolatedEnableProfile.result;
                await addReportPhase(
                    report,
                    page,
                    `Isolated lookup probe: ${dictionaryName}`,
                    `Enabled only ${dictionaryName}; probe result=${JSON.stringify(isolatedResult ?? null)}`,
                    isolatedEnableStart,
                    isolatedEnableEnd,
                    isolatedEnableProfile,
                    processSampler,
                );
                if (!(isolatedResult && isolatedResult.ok === true)) {
                    isolatedLookupUnavailable.push(dictionaryName);
                }
            }
            const restoreDictionariesStart = safePerformance.now();
            const restoreDictionariesProfile = await runPhaseProfile(cdpSession, async () => {
                return await setEnabledDictionaries(page, updatePhaseLookupDictionaries);
            });
            const restoreDictionariesEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Restore dual-dictionary enablement',
                `Restored enabled dictionaries after isolated probes: ${JSON.stringify(restoreDictionariesProfile.result ?? null)}`,
                restoreDictionariesStart,
                restoreDictionariesEnd,
                restoreDictionariesProfile,
                processSampler,
            );
            if (isolatedLookupUnavailable.length >= updatePhaseLookupDictionaries.length) {
                fail(`Unable to find lookup terms for any isolated dictionary in ${updatePhaseLookupDictionaries.join(' + ')}. unavailable=${JSON.stringify(isolatedLookupUnavailable)}`);
            }
            if (isolatedLookupUnavailable.length > 0) {
                report.logs.push(
                    `${e2eLogTag} warning: isolated lookup probes returned no hits for ${isolatedLookupUnavailable.join(', ')}; continuing with combined-mode verification.`,
                );
            }
            overlapLookupTerm = String(lookupProbeCandidates[0] || '暗記');
        }
        if (stopAfterIsolatedProbes) {
            report.status = 'success';
            appendLog(report, 'info', 'Stopped after isolated dictionary probes by MANABITAN_E2E_STOP_AFTER_ISOLATED_PROBES=1.');
            console.log(`${e2eLogTag} PASS: Stopped after isolated probes by MANABITAN_E2E_STOP_AFTER_ISOLATED_PROBES=1.`);
            return;
        }
        const readinessTerm = hasOverlapLookupTerm ? overlapLookupTerm : String(lookupProbeCandidates[0] || '暗記');

        const backendReadyStart = safePerformance.now();
        const backendReadyProfile = await runPhaseProfile(cdpSession, async () => {
            return await waitForBackendDictionaryReady(page, updatePhaseLookupDictionaries, readinessTerm, 60000, hasOverlapLookupTerm);
        });
        const backendReadyEnd = safePerformance.now();
        if (!(backendReadyProfile.result && backendReadyProfile.result.ok === true)) {
            fail(`Backend dictionary readiness did not stabilize for ${updatePhaseLookupDictionaries.join(' + ')} within timeout using term "${readinessTerm}". diagnostics=${JSON.stringify(backendReadyProfile.result?.diagnostics ?? null)}`);
        }
        await addReportPhase(
            report,
            page,
            'Wait for backend dictionary readiness',
            hasOverlapLookupTerm ?
                `Backend confirms loaded + lookup-visible dictionaries for "${readinessTerm}": ${JSON.stringify(backendReadyProfile.result?.diagnostics ?? null)}` :
                `Backend confirms dictionaries are loaded (lookup overlap unavailable in combined mode) for "${readinessTerm}": ${JSON.stringify(backendReadyProfile.result?.diagnostics ?? null)}`,
            backendReadyStart,
            backendReadyEnd,
            backendReadyProfile,
            processSampler,
        );

        if (verifyCrashRecoveryDuringUpdate) {
            const crashRecoveryStart = safePerformance.now();
            let crashRecoveryError = '';
            let crashRecoveryResult = null;
            try {
                const crashRecoveryUpdateTriggerProfile = await runPhaseProfile(cdpSession, async () => {
                    await page.evaluate(({dictionaryTitle, downloadUrl}) => {
                        const modal = document.querySelector('#dictionary-confirm-update-modal');
                        const button = document.querySelector('#dictionary-confirm-update-button');
                        if (!(modal instanceof HTMLElement) || !(button instanceof HTMLElement)) {
                            throw new Error('Update modal/button missing');
                        }
                        modal.dataset.dictionaryTitle = dictionaryTitle;
                        modal.dataset.downloadUrl = downloadUrl;
                        button.click();
                    }, {
                        dictionaryTitle: resolvedJmdictTitle,
                        downloadUrl: `${localServer.baseUrl}/dictionaries/jmdict-slow.zip`,
                    });
                });
                await page.waitForTimeout(700);
                const crashRecoveryLookupProfile = await runPhaseProfile(cdpSession, async () => {
                    return await searchTermAndGetDictionaryHitCounts(concurrentSearchPage, readinessTerm, ['JMdict'], 6000);
                });
                if (Number(crashRecoveryLookupProfile.result?.expectedCounts?.JMdict ?? 0) < 1) {
                    throw new Error(`Expected JMdict lookup backend to remain available during crash-recovery update preflight; saw ${JSON.stringify(crashRecoveryLookupProfile.result)}`);
                }
                const crashRecoveryPhase = await waitForImportProgressPhase(page, /Step 4 of 5: Importing data/i, 60000);
                if (!(crashRecoveryPhase && crashRecoveryPhase.ok === true)) {
                    throw new Error(`Slow JMdict update did not reach active import phase before crash recovery. result=${JSON.stringify(crashRecoveryPhase)}`);
                }
                const restartVerification = await relaunchAndVerifyPersistence({
                    expectedInstalledTitles: [resolvedJmdictTitle],
                    backendReadyDictionaryNames: [resolvedJmdictTitle],
                    backendReadyTerm: readinessTerm,
                    searchChecks: [{
                        label: 'JMdict after mid-update crash',
                        term: readinessTerm,
                        dictionaryNames: ['JMdict'],
                    }],
                    ensureNoStagedTitles: true,
                });
                const reopenConcurrentSearchStart = safePerformance.now();
                await page.goto(`${restartVerification.extensionBaseUrl}/settings.html?popup-preview=false`);
                await page.waitForSelector('#dictionary-import-file-input', {state: 'attached', timeout: 30000});
                const reopenConcurrentSearchProfile = await runPhaseProfile(cdpSession, async () => {
                    return await openConcurrentSearchPageAndWarm(concurrentProbeTerm);
                });
                const reopenConcurrentSearchEnd = safePerformance.now();
                await addReportPhase(
                    report,
                    concurrentSearchPage,
                    'Restore concurrent lookup tab after update crash recovery',
                    `Reopened concurrent search tab after simulated browser crash during staged update: ${JSON.stringify({
                        backendReady: reopenConcurrentSearchProfile.result?.backendReady ?? null,
                        searchReady: reopenConcurrentSearchProfile.result?.searchReady ?? null,
                        searchDebug: reopenConcurrentSearchProfile.result?.searchDebug ?? null,
                    })}`,
                    reopenConcurrentSearchStart,
                    reopenConcurrentSearchEnd,
                    reopenConcurrentSearchProfile,
                    processSampler,
                );
                crashRecoveryResult = {
                    trigger: crashRecoveryUpdateTriggerProfile.result ?? null,
                    preflightLookup: crashRecoveryLookupProfile.result ?? null,
                    importPhase: crashRecoveryPhase,
                    restartVerification,
                };
            } catch (e) {
                crashRecoveryError = errorMessage(e);
            }
            const crashRecoveryEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Verify crash recovery during staged JMdict update',
                crashRecoveryError.length > 0 ?
                    `Crash recovery verification failed: ${crashRecoveryError}` :
                    `Forced a browser restart during JMdict update Step 4 and verified the live dictionary remained usable with no staged-title leftovers: ${JSON.stringify(crashRecoveryResult)}`,
                crashRecoveryStart,
                crashRecoveryEnd,
                null,
                processSampler,
            );
            if (crashRecoveryError.length > 0) {
                fail(`Crash recovery verification failed: ${crashRecoveryError}`);
            }
            if (stopAfterCrashRecovery) {
                report.status = 'success';
                appendLog(report, 'info', 'Stopped after crash recovery verification by MANABITAN_E2E_STOP_AFTER_CRASH_RECOVERY=1.');
                console.log(`${e2eLogTag} PASS: Stopped after crash recovery verification by MANABITAN_E2E_STOP_AFTER_CRASH_RECOVERY=1.`);
                return;
            }
        }

        const updateTriggerStart = safePerformance.now();
        const updateTriggerProfile = await runPhaseProfile(cdpSession, async () => {
            await page.evaluate(({dictionaryTitle, downloadUrl}) => {
                const modal = document.querySelector('#dictionary-confirm-update-modal');
                const button = document.querySelector('#dictionary-confirm-update-button');
                if (!(modal instanceof HTMLElement) || !(button instanceof HTMLElement)) {
                    throw new Error('Update modal/button missing');
                }
                modal.dataset.dictionaryTitle = dictionaryTitle;
                modal.dataset.downloadUrl = downloadUrl;
                button.click();
            }, {
                dictionaryTitle: resolvedJmdictTitle,
                downloadUrl: `${localServer.baseUrl}/dictionaries/jmdict-slow.zip`,
            });
        });
        const updateTriggerEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Trigger slow JMdict update',
            `Queued a JMdict update for "${resolvedJmdictTitle}" against a throttled local ZIP endpoint while keeping the dedicated search tab open. probeTerm="${readinessTerm}"`,
            updateTriggerStart,
            updateTriggerEnd,
            updateTriggerProfile,
            processSampler,
        );

        if (concurrentSearchPage === null) {
            fail('Concurrent search page was not available for update verification');
        }
        await page.waitForTimeout(700);
        const searchDuringUpdateStart = safePerformance.now();
        const searchDuringUpdateProfile = await runPhaseProfile(cdpSession, async () => {
            return await searchTermAndGetDictionaryHitCounts(concurrentSearchPage, readinessTerm, ['JMdict'], 6000);
        });
        const searchDuringUpdateLookup = searchDuringUpdateProfile.result;
        const searchDuringUpdateEnd = safePerformance.now();
        await addReportPhase(
            report,
            concurrentSearchPage,
            'Verify JMdict lookup backend during JMdict update download',
            `While slow JMdict update was in progress, dedicated search tab resolved backend diagnostics: ${JSON.stringify(searchDuringUpdateLookup)}`,
            searchDuringUpdateStart,
            searchDuringUpdateEnd,
            searchDuringUpdateProfile,
            processSampler,
        );
        if (Number(searchDuringUpdateLookup?.expectedCounts?.JMdict ?? 0) < 1) {
            fail(`Expected JMdict lookup backend to remain available during JMdict update; saw ${JSON.stringify(searchDuringUpdateLookup)}`);
        }

        const searchDuringActiveUpdateImportStart = safePerformance.now();
        const searchDuringActiveUpdateImportProfile = await runPhaseProfile(cdpSession, async () => {
            return await verifyLookupRemainsResponsiveDuringImportPhase(
                page,
                concurrentSearchPage,
                /Step 4 of 5: Importing data/i,
                readinessTerm,
                ['JMdict'],
                4,
            );
        });
        const searchDuringActiveUpdateImportEnd = safePerformance.now();
        await addReportPhase(
            report,
            concurrentSearchPage,
            'Verify JMdict lookup backend during active JMdict update import step',
            `While the update UI was in Step 4 import processing, dedicated search tab kept returning JMdict results: ${JSON.stringify(searchDuringActiveUpdateImportProfile.result ?? null)}`,
            searchDuringActiveUpdateImportStart,
            searchDuringActiveUpdateImportEnd,
            searchDuringActiveUpdateImportProfile,
            processSampler,
        );

        const updateImportDebug = await recordImportProgress(
            'JMdict update',
            'Waited for progress clear for the JMdict update after concurrent popup verification',
            async (onStepChange) => {
                await waitForImportCompletion(page, 'JMdict', 300000, onStepChange);
            },
        );
        if (!(updateImportDebug && updateImportDebug.hasResult === true && typeof updateImportDebug.resultTitle === 'string' && updateImportDebug.resultTitle.includes('JMdict'))) {
            fail(`JMdict update did not finish with expected debug payload: ${JSON.stringify(updateImportDebug)}`);
        }
        const updatedJmdictTitle = String(updateImportDebug.resultTitle || '').trim();
        const backendReadyAfterUpdateStart = safePerformance.now();
        const backendReadyAfterUpdateProfile = await runPhaseProfile(cdpSession, async () => {
            return await waitForBackendDictionaryReady(page, [updatedJmdictTitle], readinessTerm, 60000, false);
        });
        const backendReadyAfterUpdateEnd = safePerformance.now();
        if (!(backendReadyAfterUpdateProfile.result && backendReadyAfterUpdateProfile.result.ok === true)) {
            fail(`Backend dictionary readiness did not stabilize after JMdict update using term "${readinessTerm}" and title "${updatedJmdictTitle}". diagnostics=${JSON.stringify(backendReadyAfterUpdateProfile.result?.diagnostics ?? null)}`);
        }
        await addReportPhase(
            report,
            page,
            'Wait for backend dictionary readiness after update',
            `Backend refreshed "${updatedJmdictTitle}" after update for "${readinessTerm}": ${JSON.stringify(backendReadyAfterUpdateProfile.result?.diagnostics ?? null)}`,
            backendReadyAfterUpdateStart,
            backendReadyAfterUpdateEnd,
            backendReadyAfterUpdateProfile,
            processSampler,
        );
        const enableUpdatedDictionariesStart = safePerformance.now();
        const enableUpdatedDictionariesProfile = await runPhaseProfile(cdpSession, async () => {
            return await evalSendMessage(page, 'enableInstalledDictionaries');
        });
        const enableUpdatedDictionariesEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Refresh enabled dictionaries after update',
            `Refreshed profile dictionary enablement after JMdict update renamed installed titles: ${JSON.stringify(enableUpdatedDictionariesProfile.result ?? null)}`,
            enableUpdatedDictionariesStart,
            enableUpdatedDictionariesEnd,
            enableUpdatedDictionariesProfile,
            processSampler,
        );
        const verifyUpdatedJmdictContentStart = safePerformance.now();
        const verifyUpdatedJmdictContentProfile = await runPhaseProfile(cdpSession, async () => {
            return await waitForBackendDictionaryContentIntegrity(page, [updatedJmdictTitle], [...jmdictProbeTerms, ...lookupProbeCandidates], 15000);
        });
        const verifyUpdatedJmdictContentEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Verify JMdict backend content integrity after update',
            `Checked that JMdict term-content spans remain readable and in bounds after the slow update path: ${JSON.stringify(verifyUpdatedJmdictContentProfile.result ?? null)}`,
            verifyUpdatedJmdictContentStart,
            verifyUpdatedJmdictContentEnd,
            verifyUpdatedJmdictContentProfile,
            processSampler,
        );
        if (!(verifyUpdatedJmdictContentProfile.result && verifyUpdatedJmdictContentProfile.result.ok === true)) {
            fail(`JMdict backend content integrity failed after update. diagnostics=${JSON.stringify(verifyUpdatedJmdictContentProfile.result ?? null)}`);
        }

        const reloadSettingsStart = safePerformance.now();
        await page.goto(`${extensionBaseUrl}/settings.html?popup-preview=false`);
        await page.waitForSelector('#dictionary-import-file-input', {state: 'attached', timeout: 30000});
        const reloadSettingsEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Reload settings page for modal verification',
            'Reloaded settings to ensure dictionary modal list reflects latest installed/enabled state before verification.',
            reloadSettingsStart,
            reloadSettingsEnd,
            null,
            processSampler,
        );

        /** @type {string[]} */
        const verificationErrors = [];
        const verifyListProfile = await runPhaseProfile(cdpSession, async () => {
            await openInstalledDictionariesModal(page);
        });
        const verifyListStart = safePerformance.now();
        const expectedInstalledAfterUpdate = focusedUpdateOnlyMode ? [updatedJmdictTitle] : ['Jitendex', updatedJmdictTitle];
        const installedTitlesResult = await waitForInstalledDictionarySet(page, expectedInstalledAfterUpdate, 30000);
        const installedTitlesText = installedTitlesResult.titles.join(', ');
        if (!installedTitlesResult.ok) {
            verificationErrors.push(`Installed dictionary list missing expected dictionaries: ${installedTitlesText}`);
        }
        const verifyListEnd = safePerformance.now();
        await addReportPhase(report, page, 'Verify installed dictionaries list', `Expected ${expectedInstalledAfterUpdate.join(' + ')} in installed dictionaries modal. observed="${installedTitlesText}"`, verifyListStart, verifyListEnd, verifyListProfile, processSampler);

        if (verifyRestartPersistence) {
            const restartPersistenceStart = safePerformance.now();
            let restartPersistenceError = '';
            let restartPersistenceResult = null;
            try {
                const configureRestartProfileStart = safePerformance.now();
                const configureRestartProfileResult = await evalSendMessage(page, 'configureRestartProfileMatrix');
                const configureRestartProfileEnd = safePerformance.now();
                await addReportPhase(
                    report,
                    page,
                    'Configure restart profile matrix',
                    `Prepared richer multi-profile enabled/disabled dictionary state before restart verification: ${JSON.stringify(configureRestartProfileResult)}`,
                    configureRestartProfileStart,
                    configureRestartProfileEnd,
                    null,
                    processSampler,
                );
                const expectedPostRestartTitles = focusedUpdateOnlyMode ? [updatedJmdictTitle] : ['Jitendex', updatedJmdictTitle];
                restartPersistenceResult = await relaunchAndVerifyPersistence({
                    expectedInstalledTitles: expectedPostRestartTitles,
                    backendReadyDictionaryNames: expectedPostRestartTitles,
                    backendReadyTerm: readinessTerm,
                    searchChecks: [{
                        label: 'post-update restart search',
                        term: readinessTerm,
                        dictionaryNames: updatePhaseLookupDictionaries,
                    }],
                });
            } catch (e) {
                restartPersistenceError = errorMessage(e);
                verificationErrors.push(`Restart persistence verification failed: ${restartPersistenceError}`);
            }
            const restartPersistenceEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Verify restart persistence after update',
                restartPersistenceError.length > 0 ?
                    `Restart persistence verification failed: ${restartPersistenceError}` :
                    `Relaunched ${browserFlavor} with the same extension profile after update and verified installed dictionaries plus search/backend persistence: ${JSON.stringify(restartPersistenceResult)}`,
                restartPersistenceStart,
                restartPersistenceEnd,
                null,
                processSampler,
            );
        }

        if (stopAfterUpdate) {
            if (verificationErrors.length > 0) {
                fail(`Verification failures (${verificationErrors.length}): ${verificationErrors.join(' | ')}`);
            }
            report.status = 'success';
            appendLog(report, 'info', 'Stopped after update verification by MANABITAN_E2E_STOP_AFTER_UPDATE=1.');
            console.log(`${e2eLogTag} PASS: Stopped after update verification by MANABITAN_E2E_STOP_AFTER_UPDATE=1.`);
            return;
        }

        const openSearchStart = safePerformance.now();
        let searchReady = false;
        let searchReadyError = '';
        try {
            await page.goto(`${extensionBaseUrl}/search.html`);
            await page.waitForSelector('#search-textbox', {state: 'attached', timeout: 30000});
            if (!(await waitForBodyVisible(page, 30000))) {
                const forceUnhideStart = safePerformance.now();
                const forceUnhideResult = await page.evaluate(() => {
                    if (!(document.body instanceof HTMLElement)) {
                        return {hadBody: false, wasHidden: null, nowHidden: null};
                    }
                    const wasHidden = document.body.hidden === true;
                    document.body.hidden = false;
                    return {hadBody: true, wasHidden, nowHidden: document.body.hidden === true};
                });
                const forceUnhideEnd = safePerformance.now();
                await addReportPhase(
                    report,
                    page,
                    'Force unhide search page',
                    `Search page body was hidden after load; forced body.hidden=false. result=${JSON.stringify(forceUnhideResult)}`,
                    forceUnhideStart,
                    forceUnhideEnd,
                    null,
                    processSampler,
                );
                if (!(await waitForBodyVisible(page, 5000))) {
                    throw new Error('Search page body remained hidden');
                }
            }
            searchReady = true;
        } catch (e) {
            searchReadyError = errorMessage(e);
        }
        const openSearchEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Open search page',
            searchReady ? 'Opened search page and found textbox.' : `Failed to fully initialize search page: ${searchReadyError}`,
            openSearchStart,
            openSearchEnd,
            null,
            processSampler,
        );

        const searchVerificationTerm = hasOverlapLookupTerm ? overlapLookupTerm : readinessTerm;

        if (!searchReady) {
            verificationErrors.push(`Unable to initialize search page: ${searchReadyError}`);
            const searchStart = safePerformance.now();
            const searchEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Verify search results include both dictionaries',
                `Skipped direct search verification because search page was not ready: ${searchReadyError}`,
                searchStart,
                searchEnd,
                null,
                processSampler,
            );
            for (const word of lookupWords) {
                const lookupChar = String([...word][0] || '').trim();
                if (lookupChar.length === 0) { continue; }
                const lookupStart = safePerformance.now();
                const lookupEnd = safePerformance.now();
                await addReportPhase(
                    report,
                    page,
                    `Profile lookup: ${lookupChar}`,
                    `lookupChar=${lookupChar} skipped because search page was not ready: ${searchReadyError}`,
                    lookupStart,
                    lookupEnd,
                    null,
                    processSampler,
                );
            }
        } else {
            const searchStart = safePerformance.now();
            let searchProfile = null;
            let searchResult = {
                expectedCounts: {Jitendex: 0, JMdict: 0},
                observedCounts: {},
                noResultsVisible: false,
                entriesTextPreview: '',
            };
            let searchError = '';
            try {
                searchProfile = await runPhaseProfile(cdpSession, async () => {
                    return await searchTermAndGetDictionaryHitCounts(page, searchVerificationTerm, expectedLookupDictionaries);
                });
                searchResult = searchProfile.result;
            } catch (e) {
                searchError = errorMessage(e);
                verificationErrors.push(`Search for ${searchVerificationTerm} failed: ${searchError}`);
            }
            if (searchError.length === 0) {
                if (
                    hasOverlapLookupTerm &&
                    expectedLookupDictionaries.some((name) => (searchResult.expectedCounts?.[name] ?? 0) < 1)
                ) {
                    verificationErrors.push(
                        `Expected search result counts for ${searchVerificationTerm} from both dictionaries, saw ` +
                        `${JSON.stringify(searchResult.expectedCounts)} observed=${JSON.stringify(searchResult.observedCounts)} ` +
                        `noResultsVisible=${String(searchResult.noResultsVisible)} preview=${JSON.stringify(searchResult.entriesTextPreview)}`,
                    );
                }
                if (!hasOverlapLookupTerm) {
                    const totalHits = expectedLookupDictionaries.reduce((sum, dictionaryName) => (
                        sum + Number(searchResult.expectedCounts?.[dictionaryName] || 0)
                    ), 0);
                    if (totalHits < 1) {
                        verificationErrors.push(
                            `Combined-mode search for ${searchVerificationTerm} returned no recognized dictionary hits. expected=${JSON.stringify(searchResult.expectedCounts)} observed=${JSON.stringify(searchResult.observedCounts)} noResultsVisible=${String(searchResult.noResultsVisible)} preview=${JSON.stringify(searchResult.entriesTextPreview)}`,
                        );
                    }
                }
            }
            const searchEnd = safePerformance.now();
            let searchPhaseDetails = '';
            if (searchError.length > 0) {
                searchPhaseDetails = `Search attempt failed: ${searchError}`;
            } else if (hasOverlapLookupTerm) {
                searchPhaseDetails = `Searched ${searchVerificationTerm} and observed expected hit counts=${JSON.stringify(searchResult.expectedCounts)} observed=${JSON.stringify(searchResult.observedCounts)} noResultsVisible=${String(searchResult.noResultsVisible)} preview=${JSON.stringify(searchResult.entriesTextPreview)}`;
            } else {
                searchPhaseDetails = `Searched ${searchVerificationTerm} in combined mode (no overlap-term available); observed expected hit counts=${JSON.stringify(searchResult.expectedCounts)} observed=${JSON.stringify(searchResult.observedCounts)} noResultsVisible=${String(searchResult.noResultsVisible)} preview=${JSON.stringify(searchResult.entriesTextPreview)}`;
            }
            await addReportPhase(
                report,
                page,
                'Verify search results include both dictionaries',
                searchPhaseDetails,
                searchStart,
                searchEnd,
                searchProfile,
                processSampler,
            );

            /** @type {Record<string, number>} */
            const aggregateLookupCounts = Object.fromEntries(expectedLookupDictionaries.map((name) => [name, 0]));
            for (const word of lookupWords) {
                const lookupChar = String([...word][0] || '').trim();
                if (lookupChar.length === 0) { continue; }
                const lookupStart = safePerformance.now();
                let lookupProfile = null;
                let lookupResult = {
                    expectedCounts: {Jitendex: 0, JMdict: 0},
                    observedCounts: {},
                    noResultsVisible: false,
                    entriesTextPreview: '',
                };
                let lookupError = '';
                try {
                    lookupProfile = await runPhaseProfile(cdpSession, async () => {
                        return await searchTermAndGetDictionaryHitCounts(page, lookupChar, expectedLookupDictionaries, 6000);
                    });
                    lookupResult = lookupProfile.result;
                } catch (e) {
                    lookupError = errorMessage(e);
                    verificationErrors.push(`Lookup ${lookupChar} failed: ${lookupError}`);
                }
                if (lookupError.length === 0) {
                    const totalHits = expectedLookupDictionaries.reduce((sum, dictionaryName) => (
                        sum + Number(lookupResult.expectedCounts?.[dictionaryName] || 0)
                    ), 0);
                    if (totalHits < 1) {
                        verificationErrors.push(
                            `Lookup ${lookupChar} returned no recognized dictionary hits. expected=${JSON.stringify(lookupResult.expectedCounts)} observed=${JSON.stringify(lookupResult.observedCounts)} noResultsVisible=${String(lookupResult.noResultsVisible)} preview=${JSON.stringify(lookupResult.entriesTextPreview)}`,
                        );
                    }
                    for (const dictionaryName of expectedLookupDictionaries) {
                        aggregateLookupCounts[dictionaryName] = Number(aggregateLookupCounts[dictionaryName] || 0) + Number(lookupResult.expectedCounts?.[dictionaryName] || 0);
                    }
                }
                const lookupEnd = safePerformance.now();
                await addReportPhase(
                    report,
                    page,
                    `Profile lookup: ${lookupChar}`,
                    lookupError.length > 0 ?
                        `lookupChar=${lookupChar} failed: ${lookupError}` :
                        `lookupChar=${lookupChar} expectedCounts=${JSON.stringify(lookupResult.expectedCounts)} observed=${JSON.stringify(lookupResult.observedCounts)} noResultsVisible=${String(lookupResult.noResultsVisible)} preview=${JSON.stringify(lookupResult.entriesTextPreview)}`,
                    lookupStart,
                    lookupEnd,
                    lookupProfile,
                    processSampler,
                );
            }
            await addReportPhase(
                report,
                page,
                'Lookup aggregate coverage',
                `Aggregate recognized dictionary hits across lookup profiling words=${JSON.stringify(lookupWords)} counts=${JSON.stringify(aggregateLookupCounts)}`,
                safePerformance.now(),
                safePerformance.now(),
                null,
                processSampler,
            );

            const deleteJmdictBeforeBatchStart = safePerformance.now();
            const deleteJmdictBeforeBatchProfile = await runPhaseProfile(cdpSession, async () => {
                await page.goto(`${extensionBaseUrl}/settings.html?popup-preview=false`);
                await page.waitForSelector('#dictionary-import-file-input', {state: 'attached', timeout: 30000});
                const installedTitles = await getInstalledDictionaryTitles(page);
                const installedJmdictTitle = resolveInstalledDictionaryTitle(installedTitles, 'JMdict') ?? 'JMdict';
                await openInstalledDictionariesModal(page);
                await requestDictionaryDeleteFromInstalledModal(page, installedJmdictTitle);
                return await waitForDictionaryDeleteCompletion(page, installedJmdictTitle, ['Jitendex'], 240000);
            });
            const deleteJmdictBeforeBatchEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Delete JMdict before batch import',
                `Removed JMdict before batch import so the multi-file stress uses two fresh archives: ${JSON.stringify(deleteJmdictBeforeBatchProfile.result ?? null)}`,
                deleteJmdictBeforeBatchStart,
                deleteJmdictBeforeBatchEnd,
                deleteJmdictBeforeBatchProfile,
                processSampler,
            );
            if (!(deleteJmdictBeforeBatchProfile.result && deleteJmdictBeforeBatchProfile.result.ok === true)) {
                fail(`JMdict delete did not complete before batch import. result=${JSON.stringify(deleteJmdictBeforeBatchProfile.result ?? null)}`);
            }

            const multiImportTriggerStart = safePerformance.now();
            const multiImportTriggerProfile = await runPhaseProfile(cdpSession, async () => {
                await page.goto(`${extensionBaseUrl}/settings.html?popup-preview=false`);
                await page.waitForSelector('#dictionary-import-file-input', {state: 'attached', timeout: 30000});
                await page.setInputFiles('#dictionary-import-file-input', [
                    cachedDictionaries.jmdictPath,
                    cachedDictionaries.jmnedictPath,
                ]);
                return {
                    filePaths: [cachedDictionaries.jmdictPath, cachedDictionaries.jmnedictPath],
                };
            });
            const multiImportTriggerEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Trigger multi-file dictionary import stress',
                `Triggered a single multi-file import selection with ${JSON.stringify(multiImportTriggerProfile.result?.filePaths ?? [])} to stress importing two fresh dictionaries in one batch after deleting JMdict.`,
                multiImportTriggerStart,
                multiImportTriggerEnd,
                multiImportTriggerProfile,
                processSampler,
            );
            const multiImportDebug = await recordImportProgress(
                'JMdict + JMnedict batch import',
                'Waited for progress clear for a multi-file batch import containing fresh JMdict and JMnedict archives after deleting JMdict.',
                async (onStepChange) => {
                    await waitForImportCompletion(page, 'JMdict + JMnedict batch import', 300000, onStepChange);
                },
            );
            await page.goto(`${extensionBaseUrl}/settings.html?popup-preview=false`);
            await page.waitForSelector('#dictionary-import-file-input', {state: 'attached', timeout: 30000});
            const multiImportListStart = safePerformance.now();
            const multiImportListProfile = await runPhaseProfile(cdpSession, async () => {
                await openInstalledDictionariesModal(page);
                return await waitForInstalledDictionarySet(page, extendedLookupDictionaries, 30000);
            });
            const multiImportListEnd = safePerformance.now();
            if (!(multiImportListProfile.result && multiImportListProfile.result.ok === true)) {
                fail(`Installed dictionary list did not stabilize to ${extendedLookupDictionaries.join(', ')} after multi-file import. result=${JSON.stringify(multiImportListProfile.result ?? null)} lastImportDebug=${JSON.stringify(multiImportDebug)}`);
            }
            await addReportPhase(
                report,
                page,
                'Verify installed dictionaries after multi-file import',
                `Installed dictionary set after multi-file import: ${JSON.stringify(multiImportListProfile.result?.titles ?? [])}. lastImportDebug=${JSON.stringify(multiImportDebug)}`,
                multiImportListStart,
                multiImportListEnd,
                multiImportListProfile,
                processSampler,
            );
            const verifyBatchJmdictContentStart = safePerformance.now();
            const verifyBatchJmdictContentProfile = await runPhaseProfile(cdpSession, async () => {
                return await waitForBackendDictionaryContentIntegrity(page, ['JMdict'], extendedLookupProbeCandidates, 15000);
            });
            const verifyBatchJmdictContentEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Verify JMdict backend content integrity after multi-file import',
                `Checked that JMdict term-content spans remain readable and in bounds after the JMdict + JMnedict batch import: ${JSON.stringify(verifyBatchJmdictContentProfile.result ?? null)}`,
                verifyBatchJmdictContentStart,
                verifyBatchJmdictContentEnd,
                verifyBatchJmdictContentProfile,
                processSampler,
            );
            if (!(verifyBatchJmdictContentProfile.result && verifyBatchJmdictContentProfile.result.ok === true)) {
                fail(`JMdict backend content integrity failed after multi-file import. diagnostics=${JSON.stringify(verifyBatchJmdictContentProfile.result ?? null)}`);
            }
            const verifyBatchJmnedictContentStart = safePerformance.now();
            const verifyBatchJmnedictContentProfile = await runPhaseProfile(cdpSession, async () => {
                return await waitForBackendDictionaryContentIntegrity(page, ['JMnedict'], extendedLookupProbeCandidates, 15000);
            });
            const verifyBatchJmnedictContentEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Verify JMnedict backend content integrity after multi-file import',
                `Checked that JMnedict term-content spans are readable and in bounds after the JMdict + JMnedict batch import: ${JSON.stringify(verifyBatchJmnedictContentProfile.result ?? null)}`,
                verifyBatchJmnedictContentStart,
                verifyBatchJmnedictContentEnd,
                verifyBatchJmnedictContentProfile,
                processSampler,
            );
            if (!(verifyBatchJmnedictContentProfile.result && verifyBatchJmnedictContentProfile.result.ok === true)) {
                fail(`JMnedict backend content integrity failed after multi-file import. diagnostics=${JSON.stringify(verifyBatchJmnedictContentProfile.result ?? null)}`);
            }
            const enableExtendedDictionariesStart = safePerformance.now();
            const enableExtendedDictionariesProfile = await runPhaseProfile(cdpSession, async () => {
                return await setEnabledDictionaries(page, extendedLookupDictionaries);
            });
            const enableExtendedDictionariesEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Enable JMnedict for extended lookup stress',
                `Enabled ${extendedLookupDictionaries.join(', ')} after multi-file import: ${JSON.stringify(enableExtendedDictionariesProfile.result ?? null)}`,
                enableExtendedDictionariesStart,
                enableExtendedDictionariesEnd,
                enableExtendedDictionariesProfile,
                processSampler,
            );
            if (verifyBatchRestartPersistence) {
                const batchRestartPersistenceStart = safePerformance.now();
                let batchRestartPersistenceError = '';
                let batchRestartPersistenceResult = null;
                try {
                    const jmnedictRestartTerm = String(jmnedictProbeTerms[0] || extendedLookupProbeCandidates[0] || readinessTerm);
                    batchRestartPersistenceResult = await relaunchAndVerifyPersistence({
                        expectedInstalledTitles: extendedLookupDictionaries,
                        backendReadyDictionaryNames: extendedLookupDictionaries,
                        backendReadyTerm: readinessTerm,
                        searchChecks: [
                            {
                                label: 'post-batch JMdict + Jitendex restart search',
                                term: readinessTerm,
                                dictionaryNames: expectedLookupDictionaries,
                            },
                            {
                                label: 'post-batch JMnedict restart search',
                                term: jmnedictRestartTerm,
                                dictionaryNames: ['JMnedict'],
                            },
                        ],
                    });
                } catch (e) {
                    batchRestartPersistenceError = errorMessage(e);
                    verificationErrors.push(`Batch restart persistence verification failed: ${batchRestartPersistenceError}`);
                }
                const batchRestartPersistenceEnd = safePerformance.now();
                await addReportPhase(
                    report,
                    page,
                    'Verify restart persistence after multi-file import',
                    batchRestartPersistenceError.length > 0 ?
                        `Batch restart persistence verification failed: ${batchRestartPersistenceError}` :
                        `Relaunched ${browserFlavor} after the JMdict + JMnedict batch import and re-verified installed dictionaries plus restart lookups: ${JSON.stringify(batchRestartPersistenceResult)}`,
                    batchRestartPersistenceStart,
                    batchRestartPersistenceEnd,
                    null,
                    processSampler,
                );
                if (batchRestartPersistenceError.length > 0) {
                    fail(`Batch restart persistence verification failed: ${batchRestartPersistenceError}`);
                }
            }
            const enableTextScanningStart = safePerformance.now();
            const enableTextScanningProfile = await runPhaseProfile(cdpSession, async () => {
                return await evalSendMessage(page, 'enableTextScanning');
            });
            const enableTextScanningEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Enable text scanning for hover stress',
                `Enabled profile text scanning before Wagahai hover verification: ${JSON.stringify(enableTextScanningProfile.result ?? null)}`,
                enableTextScanningStart,
                enableTextScanningEnd,
                enableTextScanningProfile,
                processSampler,
            );

            const hoverSpeedStressStart = safePerformance.now();
            let hoverSpeedStressProfile = null;
            let hoverSpeedStressError = '';
            let hoverSpeedStressResult = null;
            try {
                hoverSpeedStressProfile = await runPhaseProfile(cdpSession, async () => {
                    if (localServer === null) {
                        throw new Error('Local E2E server is unavailable for hover-speed stress test');
                    }
                    await page.goto(`${localServer.baseUrl}/wagahai-neko.html`);
                    await waitForPageFrontendScanReady(page);
                    const scanTargets = [
                        '#target-word',
                        '#target-cat',
                        '#target-name',
                        '#target-kotoba',
                        '#target-born',
                        '#target-mitou',
                    ];
                    const motionProfiles = [
                        {label: 'slow', moveAwaySteps: 10, hoverSteps: 28, settleDelayMs: 70, popupTimeoutMs: 3400},
                        {label: 'medium', moveAwaySteps: 6, hoverSteps: 16, settleDelayMs: 35, popupTimeoutMs: 3000},
                        {label: 'fast', moveAwaySteps: 3, hoverSteps: 7, settleDelayMs: 5, popupTimeoutMs: 2600},
                    ];
                    const iterations = [];
                    for (let i = 0; i < 18; ++i) {
                        const selector = scanTargets[i % scanTargets.length];
                        const motionProfile = motionProfiles[i % motionProfiles.length];
                        const iterationStart = safePerformance.now();
                        const hoverResult = await hoverLookupOnWagahai(page, selector, motionProfile);
                        const iterationEnd = safePerformance.now();
                        const hasDictionaryResult = hoverResult.hasDictionaryEntries === true && /jmdict|jitendex/i.test(hoverResult.popupText);
                        iterations.push({
                            iteration: i + 1,
                            selector,
                            speed: motionProfile.label,
                            usedModifier: hoverResult.usedModifier,
                            durationMs: Math.max(0, iterationEnd - iterationStart),
                            hasDictionaryEntries: hoverResult.hasDictionaryEntries === true,
                            noResultsVisible: hoverResult.noResultsVisible === true,
                            noDictionariesVisible: hoverResult.noDictionariesVisible === true,
                            hasDictionaryResult,
                            entriesTextPreview: hoverResult.entriesTextPreview,
                        });
                        if (!hasDictionaryResult) {
                            throw new Error(
                                `Hover iteration ${String(i + 1)} (${selector}, ${motionProfile.label}) did not show dictionary results. ` +
                                `entries=${JSON.stringify(hoverResult.entriesTextPreview)} popup=${JSON.stringify(hoverResult.popupText.slice(0, 200))} ` +
                                `noResults=${String(hoverResult.noResultsVisible)} noDictionaries=${String(hoverResult.noDictionariesVisible)}`,
                            );
                        }
                        await page.mouse.move(8, 8, {steps: 4});
                        await page.waitForTimeout(25);
                    }
                    return {
                        iterationCount: iterations.length,
                        iterations,
                    };
                });
                hoverSpeedStressResult = hoverSpeedStressProfile.result;
            } catch (e) {
                hoverSpeedStressError = errorMessage(e);
                verificationErrors.push(`Hover-speed stress became unresponsive or returned no results: ${hoverSpeedStressError}`);
            }
            const hoverSpeedStressEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Verify hover lookup responsiveness at varying speeds',
                hoverSpeedStressError.length > 0 ?
                    `Hover-speed stress failed: ${hoverSpeedStressError} result=${JSON.stringify(hoverSpeedStressResult)}` :
                    `Ran rapid hover lookups across fixture words at varying movement speeds and verified popup dictionary results appeared on every iteration: ${JSON.stringify(hoverSpeedStressResult)}`,
                hoverSpeedStressStart,
                hoverSpeedStressEnd,
                hoverSpeedStressProfile,
                processSampler,
            );

            const scanningStressStart = safePerformance.now();
            let scanningStressProfile = null;
            let scanningStressError = '';
            let scanningStressResult = null;
            let scanningStressSkippedReason = '';
            try {
                scanningStressProfile = await runPhaseProfile(cdpSession, async () => {
                    if (localServer === null) {
                        throw new Error('Local E2E server is unavailable for scanning stress test');
                    }
                    await page.goto(`${localServer.baseUrl}/wagahai-neko.html`);
                    await waitForPageFrontendScanReady(page);
                    const scanTargets = [
                        '#target-word',
                        '#target-cat',
                        '#target-name',
                        '#target-kotoba',
                        '#target-born',
                        '#target-mitou',
                    ];
                    const iterations = [];
                    for (let i = 0; i < 12; ++i) {
                        const selector = scanTargets[i % scanTargets.length];
                        const iterationStart = safePerformance.now();
                        const {popupText, usedModifier} = await hoverLookupOnWagahai(page, selector);
                        const iterationEnd = safePerformance.now();
                        const hasDictionaryResult = /jmdict|jitendex/i.test(popupText);
                        iterations.push({
                            iteration: i + 1,
                            selector,
                            usedModifier,
                            durationMs: Math.max(0, iterationEnd - iterationStart),
                            hasDictionaryResult,
                            popupTextPreview: popupText.replaceAll(/\s+/g, ' ').trim().slice(0, 180),
                        });
                        if (!hasDictionaryResult) {
                            throw new Error(`Scan iteration ${String(i + 1)} (${selector}) produced popup without dictionary result`);
                        }
                        await page.mouse.move(8, 8, {steps: 4});
                        await page.waitForTimeout(80);
                    }
                    return {
                        iterationCount: iterations.length,
                        iterations,
                    };
                });
                scanningStressResult = scanningStressProfile.result;
            } catch (e) {
                scanningStressError = errorMessage(e);
                const canSkipVisibilityFailure = (
                    !strictUnsupportedRuntime &&
                    launchModeLabel === 'headed-hidden-fallback' &&
                    /did not produce a visible popup/i.test(scanningStressError)
                );
                if (canSkipVisibilityFailure) {
                    scanningStressSkippedReason =
                        'Skipping hover-scanning verification in headed-hidden-fallback mode; popup visibility is unreliable in this local runtime.';
                    appendLog(report, 'warning', `${scanningStressSkippedReason} error=${scanningStressError}`);
                    console.warn(`${e2eLogTag} warning: ${scanningStressSkippedReason}`);
                } else {
                    verificationErrors.push(`Repeated hover scanning became unresponsive: ${scanningStressError}`);
                }
            }
            const scanningStressEnd = safePerformance.now();
            const scanningStressDetails = scanningStressSkippedReason.length > 0 ?
                `${scanningStressSkippedReason} error=${scanningStressError} result=${JSON.stringify(scanningStressResult)}` :
                (
                    scanningStressError.length > 0 ?
                        `Hover scanning stress failed: ${scanningStressError} result=${JSON.stringify(scanningStressResult)}` :
                        `Ran repeated hover scanning on local Wagahai fixture and observed dictionary popup results for all iterations: ${JSON.stringify(scanningStressResult)}`
                );
            await addReportPhase(
                report,
                page,
                'Verify repeated hover scanning remains responsive',
                scanningStressDetails,
                scanningStressStart,
                scanningStressEnd,
                scanningStressProfile,
                processSampler,
            );

            const postUsageSearchStart = safePerformance.now();
            let postUsageSearchProfile = null;
            let postUsageSearchResult = null;
            let postUsageSearchError = '';
            try {
                postUsageSearchProfile = await runPhaseProfile(cdpSession, async () => {
                    await page.goto(`${extensionBaseUrl}/search.html`);
                    return await searchTermAndGetDictionaryHitCounts(
                        page,
                        searchVerificationTerm,
                        expectedLookupDictionaries,
                        20000,
                        'button',
                    );
                });
                postUsageSearchResult = postUsageSearchProfile.result;
                if (hasOverlapLookupTerm) {
                    const hasAllDictionaryHits = expectedLookupDictionaries.every((name) => (
                        Number(postUsageSearchResult?.expectedCounts?.[name] || 0) >= 1
                    ));
                    if (!hasAllDictionaryHits) {
                        throw new Error(
                            'Post-usage button-search did not include both dictionaries. ' +
                            `expected=${JSON.stringify(postUsageSearchResult?.expectedCounts)} ` +
                            `observed=${JSON.stringify(postUsageSearchResult?.observedCounts)} ` +
                            `noResultsVisible=${String(postUsageSearchResult?.noResultsVisible)} ` +
                            `preview=${JSON.stringify(postUsageSearchResult?.entriesTextPreview)}`,
                        );
                    }
                } else {
                    const totalHits = expectedLookupDictionaries.reduce((sum, dictionaryName) => (
                        sum + Number(postUsageSearchResult?.expectedCounts?.[dictionaryName] || 0)
                    ), 0);
                    if (totalHits < 1) {
                        throw new Error(
                            'Post-usage button-search returned no recognized dictionary hits in combined mode. ' +
                            `expected=${JSON.stringify(postUsageSearchResult?.expectedCounts)} ` +
                            `observed=${JSON.stringify(postUsageSearchResult?.observedCounts)} ` +
                            `noResultsVisible=${String(postUsageSearchResult?.noResultsVisible)} ` +
                            `preview=${JSON.stringify(postUsageSearchResult?.entriesTextPreview)}`,
                        );
                    }
                }
            } catch (e) {
                postUsageSearchError = errorMessage(e);
                verificationErrors.push(`Post-usage search button verification failed: ${postUsageSearchError}`);
            }
            const postUsageSearchEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Verify search remains responsive after hover stress',
                postUsageSearchError.length > 0 ?
                    `Button-triggered search failed after hover stress for ${searchVerificationTerm}: ${postUsageSearchError}` :
                    `Button-triggered search after hover stress succeeded for ${searchVerificationTerm}. counts=${JSON.stringify(postUsageSearchResult?.expectedCounts)} observed=${JSON.stringify(postUsageSearchResult?.observedCounts)} noResultsVisible=${String(postUsageSearchResult?.noResultsVisible)} preview=${JSON.stringify(postUsageSearchResult?.entriesTextPreview)}`,
                postUsageSearchStart,
                postUsageSearchEnd,
                postUsageSearchProfile,
                processSampler,
            );
        }

        const reloadSettingsForDeleteStart = safePerformance.now();
        await page.goto(`${extensionBaseUrl}/settings.html?popup-preview=false`);
        await page.waitForSelector('#dictionary-import-file-input', {state: 'attached', timeout: 30000});
        const reloadSettingsForDeleteEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Reload settings page for deletion profiling',
            'Reloaded settings page after lookup profiling so dictionary delete flow runs through the real settings modal path.',
            reloadSettingsForDeleteStart,
            reloadSettingsForDeleteEnd,
            null,
            processSampler,
        );

        const deletionTarget = 'Jitendex';
        const deletionExpectedRemaining = ['JMdict'];
        const deletePhaseStart = safePerformance.now();
        let deletePhaseProfile = null;
        let deletePhaseResult = null;
        let deletePhaseError = '';
        try {
            deletePhaseProfile = await runPhaseProfile(cdpSession, async () => {
                await openInstalledDictionariesModal(page);
                await requestDictionaryDeleteFromInstalledModal(page, deletionTarget);
                return await waitForDictionaryDeleteCompletion(page, deletionTarget, deletionExpectedRemaining, 240000);
            });
            deletePhaseResult = deletePhaseProfile.result;
            if (!(deletePhaseResult && deletePhaseResult.ok === true)) {
                throw new Error(`Dictionary delete did not converge. result=${JSON.stringify(deletePhaseResult)}`);
            }
        } catch (e) {
            deletePhaseError = errorMessage(e);
            verificationErrors.push(`Dictionary deletion profiling failed (${deletionTarget}): ${deletePhaseError}`);
        }
        const deletePhaseEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            `Delete dictionary: ${deletionTarget}`,
            deletePhaseError.length > 0 ?
                `Delete failed for ${deletionTarget}: ${deletePhaseError}` :
                `Deleted ${deletionTarget} via dictionaries modal. result=${JSON.stringify(deletePhaseResult)}`,
            deletePhaseStart,
            deletePhaseEnd,
            deletePhaseProfile,
            processSampler,
        );

        const postDeleteDiagnosticsStart = safePerformance.now();
        let postDeleteDiagnosticsProfile = null;
        let postDeleteDiagnosticsError = '';
        let postDeleteDiagnostics = null;
        try {
            postDeleteDiagnosticsProfile = await runPhaseProfile(cdpSession, async () => {
                return await evalSendMessage(page, 'backendDiagnostics', '暗記');
            });
            postDeleteDiagnostics = postDeleteDiagnosticsProfile.result;
            const loadedNames = (Array.isArray(postDeleteDiagnostics?.dictionaryInfo) ? postDeleteDiagnostics.dictionaryInfo : [])
                .map((entry) => String(entry?.title || '').trim())
                .filter((value) => value.length > 0);
            const hasExpectedRemaining = deletionExpectedRemaining.every((expectedName) => (
                loadedNames.some((loadedName) => matchesDictionaryName(loadedName, expectedName))
            ));
            const deletedStillPresent = loadedNames.some((loadedName) => matchesDictionaryName(loadedName, deletionTarget));
            if (!hasExpectedRemaining || deletedStillPresent) {
                throw new Error(
                    `Post-delete backend dictionary set mismatch. loaded=${JSON.stringify(loadedNames)} expectedRemaining=${JSON.stringify(deletionExpectedRemaining)} deletedTarget=${deletionTarget}`,
                );
            }
        } catch (e) {
            postDeleteDiagnosticsError = errorMessage(e);
            verificationErrors.push(`Post-delete backend diagnostics failed: ${postDeleteDiagnosticsError}`);
        }
        const postDeleteDiagnosticsEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Post-delete backend verification (lookup + metadata)',
            postDeleteDiagnosticsError.length > 0 ?
                `Post-delete verification failed: ${postDeleteDiagnosticsError}` :
                `Ran getDictionaryInfo + termsFind('暗記') after delete to confirm remaining dictionaries and lookup path: ${JSON.stringify(postDeleteDiagnostics)}`,
            postDeleteDiagnosticsStart,
            postDeleteDiagnosticsEnd,
            postDeleteDiagnosticsProfile,
            processSampler,
        );

        if (verificationErrors.length > 0) {
            fail(`Verification failures (${verificationErrors.length}): ${verificationErrors.join(' | ')}`);
        }
        report.status = 'success';
        console.log(`${e2eLogTag} PASS: Two-dictionary import profiling and verification completed.`);
    } catch (e) {
        const failureReason = errorMessage(e);
        const skipReason = strictUnsupportedRuntime ? '' : getUnsupportedRuntimeSkipReason(failureReason);
        if (skipReason.length > 0) {
            report.status = 'success-with-skips';
            report.failureReason = '';
            report.skippedVerification = true;
            report.skipReason = skipReason;
            appendLog(report, 'warning', `${skipReason} originalError=${failureReason}`);
            console.warn(`${e2eLogTag} warning: ${skipReason}`);
            runError = undefined;
        } else {
            report.status = 'failure';
            report.failureReason = failureReason;
            appendLog(report, 'failure', report.failureReason);
            runError = new Error(withE2ETag(failureReason));
        }
    } finally {
        try {
            await mkdir(path.dirname(reportPath), {recursive: true});
            await writeFile(reportPath, renderReportHtml(report), 'utf8');
            await writeFile(reportJsonPath, JSON.stringify(createReportJsonSummary(report), null, 2), 'utf8');
            await writeCombinedTabbedReport({
                chromiumReportPath,
                edgeReportPath,
                firefoxReportPath,
                outputPath: combinedReportPath,
            });
            console.log(`${e2eLogTag} Wrote report: ${reportPath}`);
            console.log(`${e2eLogTag} Wrote report json: ${reportJsonPath}`);
            console.log(`${e2eLogTag} Wrote combined report: ${combinedReportPath}`);
        } catch (reportError) {
            console.error(`${e2eLogTag} Failed to write report: ${errorMessage(reportError)}`);
        }
        if (localServer !== null) {
            try { await localServer.close(); } catch (_) {}
        }
        if (context !== null) {
            try { await context.close(); } catch (_) {}
        }
        if (processSampler !== null) {
            try { await processSampler.stop(); } catch (_) {}
        }
        if (extensionDir !== null) {
            try { await rm(extensionDir, {recursive: true, force: true}); } catch (_) {}
        }
        if (userDataDir !== null) {
            try { await rm(userDataDir, {recursive: true, force: true}); } catch (_) {}
        }
    }

    if (runError) {
        throw runError;
    }
}

await main();
/* eslint-enable @stylistic/max-statements-per-line, @stylistic/multiline-ternary, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-base-to-string, @typescript-eslint/no-shadow, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, jsdoc/require-jsdoc, no-empty, no-shadow, no-undefined, unicorn/no-useless-undefined, unicorn/prefer-spread */
