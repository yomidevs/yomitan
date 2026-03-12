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

/* eslint-disable @stylistic/max-statements-per-line, @stylistic/multiline-ternary, @typescript-eslint/ban-ts-comment, no-empty, unicorn/no-useless-undefined, unicorn/prefer-spread */

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
import {
    autoUpdateDictionaryFixtureSettings,
    createAutoUpdateDictionaryFixture,
} from '../e2e/dictionary-auto-update-fixture.js';
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
const browserChannel = browserFlavor === 'edge' ? 'msedge' : null;
const expectedLookupDictionaries = ['Jitendex', 'JMdict'];
const autoUpdateStateStorageKey = 'manabitanDictionaryAutoUpdateState';
const autoUpdateAlarmName = 'manabitanDictionaryAutoUpdateHourly';
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

const strictUnsupportedRuntime = parseBooleanEnv(
    process.env.MANABITAN_E2E_STRICT_RUNTIME,
    parseBooleanEnv(process.env.CI, false),
);
const maxReportLogLinesRaw = Number.parseInt(process.env.MANABITAN_CHROMIUM_E2E_MAX_LOG_LINES ?? '1000', 10);
const maxReportLogLines = Number.isFinite(maxReportLogLinesRaw) && maxReportLogLinesRaw > 0 ? maxReportLogLinesRaw : 1000;
const quickImportBenchmarkMode = parseBooleanEnv(process.env.MANABITAN_E2E_IMPORT_BENCH_QUICK, false);
const stopAfterIsolatedProbes = parseBooleanEnv(process.env.MANABITAN_E2E_STOP_AFTER_ISOLATED_PROBES, false);
const concurrentDbOpenPressureEnabled = (
    !quickImportBenchmarkMode &&
    parseBooleanEnv(process.env.MANABITAN_E2E_DB_OPEN_PRESSURE, true)
);
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
    const hasCtor = runtimeDiagnostics.hasOpfsDbCtor === true;
    const hasImportDb = runtimeDiagnostics.hasOpfsImportDb === true;
    const hasStorageDir = runtimeDiagnostics.hasStorageGetDirectory === true;
    const hasVfs = typeof runtimeDiagnostics.opfsVfsPtr === 'number' ? runtimeDiagnostics.opfsVfsPtr > 0 : runtimeDiagnostics.opfsVfsPtr !== null;
    return hasCtor && hasImportDb && hasStorageDir && hasVfs;
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
    let screenshotBase64 = '';
    try {
        const screenshotBuffer = await page.screenshot({fullPage: true, timeout: 10_000});
        screenshotBase64 = screenshotBuffer.toString('base64');
    } catch (error) {
        details = `${String(errorMessage(error))}. ${details}`;
        screenshotBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2X2f8AAAAASUVORK5CYII=';
    }
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
        screenshotBase64,
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
                ${phase.screenshotBase64.length > 0 ? `<img src="${imageUrl}" alt="${escapeHtml(phase.name)} screenshot">` : '<div class="phase-screenshot-missing">Screenshot unavailable.</div>'}
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
    .phase-screenshot-missing { margin-top: 10px; color: #64748b; font-style: italic; }
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
    const jmdictUrl = findDownloadUrl('JMdict') || fallbackJmdictUrl;
    if (jitendexUrl.length === 0 || jmdictUrl.length === 0) {
        fail(`Unable to resolve recommended dictionary URLs (jitendex="${jitendexUrl}", jmdict="${jmdictUrl}")`);
    }
    return {jitendexUrl, jmdictUrl};
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
    const {jitendexUrl, jmdictUrl} = await loadRecommendedDictionaryUrls();
    const jitendexPath = path.join(dictionaryCacheDir, 'jitendex-yomitan.zip');
    const jmdictPath = path.join(dictionaryCacheDir, 'JMdict.zip');
    await ensureCachedDownload(jitendexUrl, jitendexPath);
    await ensureCachedDownload(jmdictUrl, jmdictPath);
    return {jitendexPath, jmdictPath};
}

async function startE2ELocalServer(paths) {
    const wagahaiHtml = await readFile(wagahaiHtmlPath);
    const jitendexZip = await readFile(paths.jitendexPath);
    const jmdictZip = await readFile(paths.jmdictPath);
    /** @type {null|Awaited<ReturnType<typeof createAutoUpdateDictionaryFixture>>} */
    let autoUpdateFixture = null;
    /** @type {'v1'|'v2'} */
    let autoUpdateVersion = 'v1';
    let autoUpdateConditional304 = false;
    /** @type {Array<{method: string, path: string, headers: Record<string, string|string[]|undefined>}>} */
    let autoUpdateRequests = [];
    const server = createServer((request, response) => {
        const requestUrl = request.url || '/';
        const headers = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS'};
        if (request.method === 'OPTIONS') {
            response.writeHead(204, headers);
            response.end();
            return;
        }
        if (autoUpdateFixture !== null && (
            requestUrl === autoUpdateFixture.oldIndexPath ||
            requestUrl === autoUpdateFixture.newIndexPath ||
            requestUrl === autoUpdateFixture.oldArchivePath ||
            requestUrl === autoUpdateFixture.newArchivePath
        )) {
            autoUpdateRequests.push({
                method: String(request.method || 'GET').toUpperCase(),
                path: requestUrl,
                headers: {...request.headers},
            });
            const getVersionHeaders = (versionKey) => ({
                ETag: versionKey === 'v2' ? autoUpdateFixture.newEtag : autoUpdateFixture.oldEtag,
                'Last-Modified': versionKey === 'v2' ? autoUpdateFixture.newLastModified : autoUpdateFixture.oldLastModified,
            });
            const validatorMatches = (versionHeaders) => (
                request.headers['if-none-match'] === versionHeaders.ETag &&
                request.headers['if-modified-since'] === versionHeaders['Last-Modified']
            );
            if (requestUrl === autoUpdateFixture.oldArchivePath) {
                response.writeHead(200, {...headers, 'Content-Type': 'application/zip', 'Content-Length': String(autoUpdateFixture.versions.v1.archiveBuffer.byteLength)});
                response.end(autoUpdateFixture.versions.v1.archiveBuffer);
                return;
            }
            if (requestUrl === autoUpdateFixture.newArchivePath) {
                response.writeHead(200, {...headers, 'Content-Type': 'application/zip', 'Content-Length': String(autoUpdateFixture.versions.v2.archiveBuffer.byteLength)});
                response.end(autoUpdateFixture.versions.v2.archiveBuffer);
                return;
            }
            const versionKey = requestUrl === autoUpdateFixture.newIndexPath ? 'v2' : autoUpdateVersion;
            const versionHeaders = getVersionHeaders(versionKey);
            if (autoUpdateConditional304 && validatorMatches(versionHeaders)) {
                response.writeHead(304, {...headers, ...versionHeaders});
                response.end();
                return;
            }
            const body = JSON.stringify(autoUpdateFixture.versions[versionKey].indexContent);
            response.writeHead(200, {
                ...headers,
                ...versionHeaders,
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': String(Buffer.byteLength(body)),
            });
            if (request.method === 'HEAD') {
                response.end();
                return;
            }
            response.end(body);
            return;
        }
        if (requestUrl === '/dictionaries/jitendex.zip') {
            response.writeHead(200, {...headers, 'Content-Type': 'application/zip', 'Content-Length': String(jitendexZip.byteLength)});
            response.end(jitendexZip);
            return;
        }
        if (requestUrl === '/dictionaries/jmdict.zip') {
            response.writeHead(200, {...headers, 'Content-Type': 'application/zip', 'Content-Length': String(jmdictZip.byteLength)});
            response.end(jmdictZip);
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
        setAutoUpdateFixture(fixture) {
            autoUpdateFixture = fixture;
            autoUpdateVersion = 'v1';
            autoUpdateConditional304 = false;
            autoUpdateRequests = [];
        },
        setAutoUpdateVersion(version) {
            autoUpdateVersion = version;
        },
        setAutoUpdateConditional304(enabled) {
            autoUpdateConditional304 = enabled;
        },
        clearAutoUpdateRequests() {
            autoUpdateRequests = [];
        },
        getAutoUpdateRequests() {
            return autoUpdateRequests.map((requestInfo) => ({
                method: requestInfo.method,
                path: requestInfo.path,
                headers: {...requestInfo.headers},
            }));
        },
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

async function discoverExtensionId(context) {
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
        fail('Unable to discover Chromium extension ID');
    }
    return id;
}

async function sendRuntimeMessage(page, action, params = void 0) {
    return await page.evaluate(async ({action, params}) => {
        return await new Promise((resolve, reject) => {
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
    }, {action, params});
}

async function getOptionsFullRuntime(page) {
    return await sendRuntimeMessage(page, 'optionsGetFull', void 0);
}

async function getDictionaryInfoRuntime(page) {
    return await sendRuntimeMessage(page, 'getDictionaryInfo', void 0);
}

async function installRecommendedDictionariesMock(page, recommendedDictionaries) {
    await page.evaluate((data) => {
        const recommendedData = structuredClone(data);
        const originalFetch = window.fetch.bind(window);
        window.fetch = async (input, init) => {
            const url = String(typeof input === 'string' ? input : input?.url || '');
            if (url.includes('recommended-dictionaries.json')) {
                return new Response(JSON.stringify(recommendedData), {
                    status: 200,
                    headers: {'Content-Type': 'application/json'},
                });
            }
            return originalFetch(input, init);
        };
    }, recommendedDictionaries);
}

async function setWelcomeLanguage(page, language) {
    const result = await page.evaluate((nextLanguage) => {
        const select = document.querySelector('#language-select');
        if (!(select instanceof HTMLSelectElement)) {
            return {ok: false, error: 'Language selector not found'};
        }
        const hasOption = Array.from(select.options).some((option) => option.value === nextLanguage);
        if (!hasOption) {
            return {ok: false, error: `Language option not found: ${nextLanguage}`};
        }
        select.value = nextLanguage;
        select.dispatchEvent(new Event('change', {bubbles: true}));
        return {ok: true};
    }, language);
    if (!(result && result.ok === true)) {
        throw new Error(`Unable to set welcome language: ${String(result?.error || 'unknown error')}`);
    }
}

async function getWelcomeAutoImportStatusText(page) {
    return await page.evaluate(() => {
        const node = document.querySelector('#welcome-language-auto-import-status');
        if (!(node instanceof HTMLElement) || node.hidden) { return ''; }
        return (node.textContent || '').trim();
    });
}

async function waitForWelcomeAutoImportStatus(page, expectedText, timeoutMs = 30000) {
    const deadline = safePerformance.now() + timeoutMs;
    let lastText = '';
    while (safePerformance.now() < deadline) {
        lastText = await getWelcomeAutoImportStatusText(page);
        if (lastText.includes(expectedText)) {
            return lastText;
        }
        await page.waitForTimeout(250);
    }
    fail(`Timed out waiting for welcome auto-import status containing "${expectedText}". lastText="${lastText}"`);
}

async function welcomeHasRecommendedDictionariesButton(page) {
    return await page.evaluate(() => {
        const node = document.querySelector('[data-modal-action="show,recommended-dictionaries"]');
        if (!(node instanceof HTMLElement)) { return false; }
        return !node.hidden;
    });
}

async function setAllSettingsRuntime(page, value, source) {
    await sendRuntimeMessage(page, 'setAllSettings', {value, source});
}

async function getStorageLocalRecord(page, key) {
    return await page.evaluate(async (storageKey) => {
        return await new Promise((resolve, reject) => {
            chrome.storage.local.get([storageKey], (result) => {
                const runtimeError = chrome.runtime.lastError;
                if (runtimeError) {
                    reject(new Error(runtimeError.message || String(runtimeError)));
                    return;
                }
                resolve(result?.[storageKey] ?? null);
            });
        });
    }, key);
}

async function setStorageLocalRecord(page, key, value) {
    await page.evaluate(async ({storageKey, storageValue}) => {
        await new Promise((resolve, reject) => {
            chrome.storage.local.set({[storageKey]: storageValue}, () => {
                const runtimeError = chrome.runtime.lastError;
                if (runtimeError) {
                    reject(new Error(runtimeError.message || String(runtimeError)));
                    return;
                }
                resolve();
            });
        });
    }, {storageKey: key, storageValue: value});
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
            const enabledInstalledExactMatches = enabledDictionaryNames.filter((name) => installedTitles.includes(name));
            return {
                dictionaryInfo,
                installedTitles,
                dictionaryCounts,
                enabledInstalledExactMatches,
                profileLanguage: String(options0?.general?.language || ''),
                profileMainDictionary: String(options0?.general?.mainDictionary || ''),
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
                    const currentMain = String(profile.options.general.mainDictionary || '').trim();
                    if (currentMain.length === 0 || !installedTitles.includes(currentMain)) {
                        profile.options.general.mainDictionary = installedTitles[0] ?? '';
                    }
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
                    profile.options.general.mainDictionary = enabledNames[0] || '';
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

async function findOverlapLookupTerm(page, expectedDictionaryNames, candidates) {
    /** @type {Array<{term: string, termResultCount: number, termDictionaryNames: string[], enabledDictionaryNames: string[], enabledInstalledExactMatches: string[], profileMainDictionary: string, profileResultOutputMode: string}>} */
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
    await page.waitForSelector('#search-textbox', {state: 'attached', timeout: 30000});
    await page.waitForSelector('#search-button', {state: 'attached', timeout: 30000});
    if (!(await waitForBodyVisible(page, 30000))) {
        throw new Error('Search page body remained hidden');
    }
    await page.fill('#search-textbox', '');
    await page.fill('#search-textbox', term);
    switch (submitMode) {
        case 'enter':
            await page.keyboard.press('Enter');
            break;
        case 'button':
            await page.click('#search-button');
            break;
        default:
            throw new Error(`Unsupported search submit mode: ${submitMode}`);
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

async function waitForVisiblePopupFrameHandle(page, timeoutMs = 6000) {
    const deadline = safePerformance.now() + timeoutMs;
    while (safePerformance.now() < deadline) {
        const frameHandles = await page.$$('iframe.yomitan-popup');
        for (const frameHandle of frameHandles) {
            const box = await frameHandle.boundingBox();
            if (box !== null && box.width > 0 && box.height > 0) {
                return frameHandle;
            }
        }
        await page.waitForTimeout(80);
    }
    return null;
}

async function hoverLookupOnWagahai(page, targetSelector) {
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
    const modifierCandidates = ['Shift', 'Alt', 'Control', null];
    for (const modifier of modifierCandidates) {
        if (modifier !== null) {
            await page.keyboard.down(modifier);
        }
        try {
            for (let attempt = 0; attempt < 3; ++attempt) {
                await page.mouse.move(resetX, hoverY, {steps: 6});
                await page.waitForTimeout(35);
                await page.mouse.move(hoverX, hoverY, {steps: 16});
                const popupFrameHandle = await waitForVisiblePopupFrameHandle(page, 3000);
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
                return {
                    popupText,
                    usedModifier: modifier,
                };
            }
        } finally {
            if (modifier !== null) {
                await page.keyboard.up(modifier);
            }
        }
    }
    throw new Error(`Hover scan did not produce a visible popup for selector ${targetSelector}`);
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

async function openDictionaryDetailsModal(page, dictionaryName) {
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
            menuNode.querySelector('.popup-menu-item[data-menu-action="showDetails"]') !== null
        ));
    }, {timeout: 30000});
    await page.evaluate(() => {
        const menu = Array.from(document.querySelectorAll('.popup-menu-container')).find((menuNode) => (
            menuNode instanceof HTMLElement &&
            !menuNode.hidden &&
            menuNode.querySelector('.popup-menu-item[data-menu-action="showDetails"]') !== null
        ));
        if (!(menu instanceof HTMLElement)) {
            throw new Error('Dictionary action menu did not become visible');
        }
        const detailsButton = menu.querySelector('.popup-menu-item[data-menu-action="showDetails"]');
        if (!(detailsButton instanceof HTMLElement)) {
            throw new Error('Dictionary action menu is missing showDetails button');
        }
        detailsButton.click();
    });
    await page.waitForSelector('#dictionary-details-modal:not([hidden])', {timeout: 30000});
    await page.waitForFunction((targetName) => {
        const modal = document.querySelector('#dictionary-details-modal');
        const titleNode = modal?.querySelector('.dictionary-title');
        const text = (titleNode?.textContent || '').trim();
        return text === targetName || text.startsWith(`${targetName} `) || text.startsWith(`${targetName}.`) || text.includes(targetName);
    }, dictionaryName, {timeout: 30000});
}

async function closeDictionaryDetailsModal(page) {
    await page.evaluate(() => {
        const modal = document.querySelector('#dictionary-details-modal');
        if (!(modal instanceof HTMLElement) || modal.hidden) { return; }
        const closeButton = modal.querySelector('[data-modal-action="hide"]');
        if (!(closeButton instanceof HTMLElement)) {
            throw new Error('Dictionary details close button missing');
        }
        closeButton.click();
    });
    await page.waitForSelector('#dictionary-details-modal[hidden]', {timeout: 30000});
}

async function setDictionaryAutoUpdateEnabled(page, dictionaryName, enabled) {
    await openDictionaryDetailsModal(page, dictionaryName);
    const indexUrl = await page.evaluate((nextEnabled) => {
        const modal = document.querySelector('#dictionary-details-modal');
        if (!(modal instanceof HTMLElement)) {
            throw new Error('Dictionary details modal missing');
        }
        const setting = modal.querySelector('.dictionary-auto-update-setting');
        if (!(setting instanceof HTMLElement) || setting.hidden) {
            throw new Error('Dictionary auto-update setting is hidden');
        }
        const toggle = setting.querySelector('.dictionary-auto-update-toggle');
        if (!(toggle instanceof HTMLInputElement)) {
            throw new Error('Dictionary auto-update toggle missing');
        }
        const currentIndexUrl = String(toggle.dataset.indexUrl || '');
        if (currentIndexUrl.length === 0) {
            throw new Error('Dictionary auto-update toggle is missing data-index-url');
        }
        if (toggle.checked !== nextEnabled) {
            toggle.click();
        }
        return currentIndexUrl;
    }, enabled);
    const deadline = safePerformance.now() + 30_000;
    while (safePerformance.now() < deadline) {
        const optionsFull = await getOptionsFullRuntime(page);
        const enabledIndexUrls = Array.isArray(optionsFull?.global?.dictionaryAutoUpdates) ? optionsFull.global.dictionaryAutoUpdates.map(String) : [];
        if (enabledIndexUrls.includes(indexUrl) === enabled) {
            break;
        }
        await page.waitForTimeout(250);
    }
    await closeDictionaryDetailsModal(page);
    return indexUrl;
}

async function configureAutoUpdateDictionaryProfile(page, dictionaryName) {
    const optionsFull = structuredClone(await getOptionsFullRuntime(page));
    const profiles = Array.isArray(optionsFull?.profiles) ? optionsFull.profiles : [];
    for (const profile of profiles) {
        if (!(profile?.options && Array.isArray(profile.options.dictionaries))) {
            continue;
        }
        let dictionary = profile.options.dictionaries.find((current) => String(current?.name || '') === dictionaryName);
        if (!(dictionary && typeof dictionary === 'object')) {
            dictionary = {
                name: dictionaryName,
                alias: dictionaryName,
                enabled: true,
                allowSecondarySearches: false,
                definitionsCollapsible: 'not-collapsible',
                partsOfSpeechFilter: true,
                useDeinflections: true,
                styles: '',
            };
            profile.options.dictionaries.push(dictionary);
        }
        dictionary.alias = autoUpdateDictionaryFixtureSettings.alias;
        dictionary.enabled = true;
        dictionary.partsOfSpeechFilter = false;
        dictionary.useDeinflections = false;
        profile.options.general.mainDictionary = dictionaryName;
        profile.options.general.sortFrequencyDictionary = dictionaryName;
        const expressionField = profile.options?.anki?.cardFormats?.[0]?.fields?.expression;
        if (expressionField && typeof expressionField === 'object') {
            expressionField.value = autoUpdateDictionaryFixtureSettings.ankiFieldValue;
        }
    }
    await setAllSettingsRuntime(page, optionsFull, 'chromium-e2e-auto-update-configure');
}

async function backdateAutoUpdateLastAttempt(page, indexUrl) {
    const state = await getStorageLocalRecord(page, autoUpdateStateStorageKey);
    const nextState = (typeof state === 'object' && state !== null && !Array.isArray(state)) ? structuredClone(state) : {};
    const entry = (typeof nextState[indexUrl] === 'object' && nextState[indexUrl] !== null && !Array.isArray(nextState[indexUrl])) ? nextState[indexUrl] : {};
    entry.lastAttemptAt = 0;
    nextState[indexUrl] = entry;
    await setStorageLocalRecord(page, autoUpdateStateStorageKey, nextState);
    return entry;
}

async function triggerAutoUpdateAlarm(page) {
    await page.evaluate((alarmName) => {
        chrome.alarms.create(alarmName, {when: Date.now() + 100});
    }, autoUpdateAlarmName);
}

async function waitForAutoUpdateCheck(page, indexUrl, previousCheckAt, timeoutMs = 60000) {
    const deadline = safePerformance.now() + timeoutMs;
    while (safePerformance.now() < deadline) {
        const state = await getStorageLocalRecord(page, autoUpdateStateStorageKey);
        if (typeof state === 'object' && state !== null && !Array.isArray(state)) {
            const entry = state[indexUrl];
            if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
                const lastError = typeof entry.lastError === 'string' ? entry.lastError : null;
                if (lastError && lastError.length > 0) {
                    fail(`Auto-update check failed for ${indexUrl}: ${lastError}`);
                }
                const lastSuccessfulCheckAt = Number(entry.lastSuccessfulCheckAt || 0);
                if (lastSuccessfulCheckAt > previousCheckAt) {
                    return /** @type {Record<string, unknown>} */ (entry);
                }
            }
        }
        await page.waitForTimeout(250);
    }
    fail(`Timed out waiting for auto-update check completion for ${indexUrl}`);
}

async function waitForUpdatedDictionaryState(page, expectedTitle, expectedRevision, expectedIndexUrl, timeoutMs = 120000) {
    const deadline = safePerformance.now() + timeoutMs;
    while (safePerformance.now() < deadline) {
        const dictionaryInfo = await getDictionaryInfoRuntime(page);
        const titles = Array.isArray(dictionaryInfo) ? dictionaryInfo : [];
        const match = titles.find((dictionary) => (
            String(dictionary?.title || '') === expectedTitle &&
            String(dictionary?.revision || '') === expectedRevision &&
            String(dictionary?.indexUrl || '') === expectedIndexUrl
        ));
        if (match) {
            return dictionaryInfo;
        }
        await page.waitForTimeout(500);
    }
    fail(`Timed out waiting for updated dictionary ${expectedTitle} revision ${expectedRevision}`);
}

function ensureAutoUpdateRequest(condition, message, requests) {
    if (!condition) {
        fail(`${message}; requests=${JSON.stringify(requests)}`);
    }
}

async function runAutoUpdateScenario(page, extensionBaseUrl, localServer, report, cdpSession, processSampler) {
    const fixture = await createAutoUpdateDictionaryFixture(localServer.baseUrl);
    localServer.setAutoUpdateFixture(fixture);
    try {
        await page.goto(`${extensionBaseUrl}/settings.html?popup-preview=false`);
        await page.waitForSelector('#dictionary-import-file-input', {state: 'attached', timeout: 30000});

        const importStart = safePerformance.now();
        const importProfile = await runPhaseProfile(cdpSession, async () => {
            await page.setInputFiles('#dictionary-import-file-input', [fixture.importZipPath]);
            await waitForImportCompletion(page, fixture.initialTitle, 240000);
            return await getDictionaryInfoRuntime(page);
        });
        const importEnd = safePerformance.now();
        ensureAutoUpdateRequest(
            Array.isArray(importProfile.result) && importProfile.result.some((dictionary) => (
                String(dictionary?.title || '') === fixture.initialTitle &&
                String(dictionary?.revision || '') === '1'
            )),
            'Initial auto-update dictionary import did not complete with revision 1',
            importProfile.result,
        );
        await addReportPhase(
            report,
            page,
            'Auto-update import v1 dictionary',
            `Imported local updatable dictionary archive ${fixture.importZipPath}`,
            importStart,
            importEnd,
            importProfile,
            processSampler,
        );

        const enableToggleStart = safePerformance.now();
        const enableToggleProfile = await runPhaseProfile(cdpSession, async () => {
            const enabledIndexUrl = await setDictionaryAutoUpdateEnabled(page, fixture.initialTitle, true);
            await configureAutoUpdateDictionaryProfile(page, fixture.initialTitle);
            const optionsFull = await getOptionsFullRuntime(page);
            return {enabledIndexUrl, optionsFull};
        });
        const enableToggleEnd = safePerformance.now();
        ensureAutoUpdateRequest(
            String(enableToggleProfile.result?.enabledIndexUrl || '') === fixture.oldIndexUrl,
            'Auto-update toggle did not bind to the expected initial index URL',
            enableToggleProfile.result,
        );
        await addReportPhase(
            report,
            page,
            'Enable hourly auto-updates',
            `Enabled automatic hourly updates for ${fixture.initialTitle} using index URL ${fixture.oldIndexUrl}`,
            enableToggleStart,
            enableToggleEnd,
            enableToggleProfile,
            processSampler,
        );

        localServer.clearAutoUpdateRequests();
        localServer.setAutoUpdateVersion('v1');
        localServer.setAutoUpdateConditional304(false);
        const initialState = await getStorageLocalRecord(page, autoUpdateStateStorageKey);
        const initialCheckAt = Number(initialState?.[fixture.oldIndexUrl]?.lastSuccessfulCheckAt || 0);
        const firstPassStart = safePerformance.now();
        const firstPassProfile = await runPhaseProfile(cdpSession, async () => {
            await triggerAutoUpdateAlarm(page);
            const stateEntry = await waitForAutoUpdateCheck(page, fixture.oldIndexUrl, initialCheckAt);
            return {stateEntry, requests: localServer.getAutoUpdateRequests()};
        });
        const firstPassEnd = safePerformance.now();
        const firstPassRequests = Array.isArray(firstPassProfile.result?.requests) ? firstPassProfile.result.requests : [];
        ensureAutoUpdateRequest(firstPassRequests.length === 2, 'Initial hourly auto-update pass should issue exactly two requests', firstPassRequests);
        ensureAutoUpdateRequest(firstPassRequests[0]?.method === 'HEAD' && firstPassRequests[0]?.path === fixture.oldIndexPath, 'Initial hourly auto-update pass should begin with HEAD on the original index URL', firstPassRequests);
        ensureAutoUpdateRequest(firstPassRequests[1]?.method === 'GET' && firstPassRequests[1]?.path === fixture.oldIndexPath, 'Initial hourly auto-update pass should fetch the index JSON after HEAD', firstPassRequests);
        ensureAutoUpdateRequest(!firstPassRequests.some((requestInfo) => requestInfo.path === fixture.oldArchivePath || requestInfo.path === fixture.newArchivePath), 'Initial hourly auto-update pass should not download an archive when no update exists', firstPassRequests);
        await addReportPhase(
            report,
            page,
            'Hourly auto-update pass (HEAD + GET no-op)',
            `Recorded requests for first due pass: ${JSON.stringify(firstPassRequests)}`,
            firstPassStart,
            firstPassEnd,
            firstPassProfile,
            processSampler,
        );

        localServer.clearAutoUpdateRequests();
        localServer.setAutoUpdateVersion('v1');
        localServer.setAutoUpdateConditional304(true);
        await backdateAutoUpdateLastAttempt(page, fixture.oldIndexUrl);
        const firstSuccessfulCheckAt = Number(firstPassProfile.result?.stateEntry?.lastSuccessfulCheckAt || 0);
        const secondPassStart = safePerformance.now();
        const secondPassProfile = await runPhaseProfile(cdpSession, async () => {
            await triggerAutoUpdateAlarm(page);
            const stateEntry = await waitForAutoUpdateCheck(page, fixture.oldIndexUrl, firstSuccessfulCheckAt);
            return {stateEntry, requests: localServer.getAutoUpdateRequests()};
        });
        const secondPassEnd = safePerformance.now();
        const secondPassRequests = Array.isArray(secondPassProfile.result?.requests) ? secondPassProfile.result.requests : [];
        ensureAutoUpdateRequest(secondPassRequests.length === 1, 'Conditional 304 auto-update pass should only issue one request', secondPassRequests);
        ensureAutoUpdateRequest(secondPassRequests[0]?.method === 'HEAD' && secondPassRequests[0]?.path === fixture.oldIndexPath, 'Conditional 304 auto-update pass should use HEAD on the original index URL', secondPassRequests);
        ensureAutoUpdateRequest(
            secondPassRequests[0]?.headers?.['if-none-match'] === fixture.oldEtag &&
            secondPassRequests[0]?.headers?.['if-modified-since'] === fixture.oldLastModified,
            'Conditional 304 auto-update pass should send both cache validators',
            secondPassRequests,
        );
        await addReportPhase(
            report,
            page,
            'Hourly auto-update pass (HEAD 304)',
            `Recorded requests for conditional 304 pass: ${JSON.stringify(secondPassRequests)}`,
            secondPassStart,
            secondPassEnd,
            secondPassProfile,
            processSampler,
        );

        localServer.clearAutoUpdateRequests();
        localServer.setAutoUpdateConditional304(false);
        localServer.setAutoUpdateVersion('v2');
        await backdateAutoUpdateLastAttempt(page, fixture.oldIndexUrl);
        const updatePassStart = safePerformance.now();
        const updatePassProfile = await runPhaseProfile(cdpSession, async () => {
            await triggerAutoUpdateAlarm(page);
            await waitForUpdatedDictionaryState(page, fixture.updatedTitle, '2', fixture.newIndexUrl, 120000);
            const optionsFull = await getOptionsFullRuntime(page);
            const storageState = await getStorageLocalRecord(page, autoUpdateStateStorageKey);
            return {
                optionsFull,
                storageState,
                requests: localServer.getAutoUpdateRequests(),
                dictionaryInfo: await getDictionaryInfoRuntime(page),
            };
        });
        const updatePassEnd = safePerformance.now();
        const updateRequests = Array.isArray(updatePassProfile.result?.requests) ? updatePassProfile.result.requests : [];
        ensureAutoUpdateRequest(updateRequests.length === 3, 'Update pass should issue HEAD, GET, and archive download requests', updateRequests);
        ensureAutoUpdateRequest(updateRequests[0]?.method === 'HEAD' && updateRequests[0]?.path === fixture.oldIndexPath, 'Update pass should start with HEAD on the old index URL', updateRequests);
        ensureAutoUpdateRequest(updateRequests[1]?.method === 'GET' && updateRequests[1]?.path === fixture.oldIndexPath, 'Update pass should fetch the old index URL after HEAD', updateRequests);
        ensureAutoUpdateRequest(updateRequests[2]?.method === 'GET' && updateRequests[2]?.path === fixture.newArchivePath, 'Update pass should download the new archive after detecting a newer revision', updateRequests);
        const updatedOptions = updatePassProfile.result?.optionsFull;
        const profile0 = Array.isArray(updatedOptions?.profiles) ? updatedOptions.profiles[0] : null;
        const updatedDictionarySettings = Array.isArray(profile0?.options?.dictionaries) ?
            profile0.options.dictionaries.find((dictionary) => String(dictionary?.name || '') === fixture.updatedTitle) :
            null;
        ensureAutoUpdateRequest(
            updatedDictionarySettings?.alias === autoUpdateDictionaryFixtureSettings.alias &&
            updatedDictionarySettings?.enabled === true &&
            updatedDictionarySettings?.partsOfSpeechFilter === false &&
            updatedDictionarySettings?.useDeinflections === false,
            'Updated dictionary settings were not preserved after automatic re-import',
            updatedDictionarySettings,
        );
        ensureAutoUpdateRequest(
            String(profile0?.options?.general?.mainDictionary || '') === fixture.updatedTitle &&
            String(profile0?.options?.general?.sortFrequencyDictionary || '') === fixture.updatedTitle,
            'Main or sort-frequency dictionary selection did not migrate to the updated title',
            profile0?.options?.general,
        );
        ensureAutoUpdateRequest(
            String(profile0?.options?.anki?.cardFormats?.[0]?.fields?.expression?.value || '') === autoUpdateDictionaryFixtureSettings.updatedAnkiFieldValue,
            'Anki dictionary-title field migration did not preserve the expected updated kebab-case value',
            profile0?.options?.anki?.cardFormats?.[0]?.fields?.expression,
        );
        const globalAutoUpdates = Array.isArray(updatedOptions?.global?.dictionaryAutoUpdates) ? updatedOptions.global.dictionaryAutoUpdates.map(String) : [];
        ensureAutoUpdateRequest(
            globalAutoUpdates.length === 1 && globalAutoUpdates[0] === fixture.newIndexUrl,
            'Global auto-update settings did not migrate from the old index URL to the new one',
            globalAutoUpdates,
        );
        const updatedStorageState = (typeof updatePassProfile.result?.storageState === 'object' && updatePassProfile.result.storageState !== null && !Array.isArray(updatePassProfile.result.storageState)) ?
            updatePassProfile.result.storageState :
            {};
        ensureAutoUpdateRequest(
            !(fixture.oldIndexUrl in updatedStorageState) &&
            typeof updatedStorageState?.[fixture.newIndexUrl]?.lastSuccessfulUpdateAt === 'number',
            'Runtime auto-update state did not migrate to the new index URL after update',
            updatedStorageState,
        );
        await addReportPhase(
            report,
            page,
            'Hourly auto-update pass (v1 -> v2 install)',
            `Recorded requests for update pass: ${JSON.stringify(updateRequests)}. Updated options snapshot: ${JSON.stringify({
                globalAutoUpdates,
                updatedDictionarySettings,
                general: profile0?.options?.general ?? null,
                ankiField: profile0?.options?.anki?.cardFormats?.[0]?.fields?.expression?.value ?? null,
            })}`,
            updatePassStart,
            updatePassEnd,
            updatePassProfile,
            processSampler,
        );
    } finally {
        await fixture.cleanup();
    }
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
        userDataDir = await mkdtemp(path.join(os.tmpdir(), 'manabitan-chromium-profile-'));

        const cacheWarmupStart = safePerformance.now();
        const cachedDictionaries = await ensureRealDictionaryCache();
        const jitendexProbeTerms = await loadDictionaryProbeTermsFromArchive(cachedDictionaries.jitendexPath, 80);
        const jmdictProbeTerms = await loadDictionaryProbeTermsFromArchive(cachedDictionaries.jmdictPath, 80);
        const lookupProbeCandidates = [...new Set([...overlapLookupCandidates, ...jitendexProbeTerms, ...jmdictProbeTerms])];
        localServer = await startE2ELocalServer({
            jitendexPath: cachedDictionaries.jitendexPath,
            jmdictPath: cachedDictionaries.jmdictPath,
        });
        const cacheWarmupEnd = safePerformance.now();
        const runHeadless = (process.env.MANABITAN_CHROMIUM_HEADLESS ?? '1').trim() === '1';
        const hideWindow = (process.env.MANABITAN_CHROMIUM_HIDE_WINDOW ?? (process.platform === 'darwin' ? '1' : '0')).trim() === '1';
        const allowHeadedFallback = (process.env.MANABITAN_CHROMIUM_ALLOW_HEADED_FALLBACK ?? '1').trim() === '1';
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
        let extensionId = '';
        let launchModeLabel = runHeadless ? 'headless' : (hideWindow ? 'headed-hidden' : 'headed-visible');
        try {
            context = await launchContext(runHeadless, hideWindow);
            extensionId = await discoverExtensionId(context);
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
            extensionId = await discoverExtensionId(context);
            launchModeLabel = 'headed-hidden-fallback';
        }
        report.launchMode = launchModeLabel;
        appendLog(report, 'info', `${browserFlavor} launch mode: ${launchModeLabel}`);
        const extensionBaseUrl = `chrome-extension://${extensionId}`;
        const page = context.pages()[0] ?? await context.newPage();
        page.on('console', (message) => {
            const text = message.text();
            appendLog(report, `console:${message.type()}`, text);
        });
        page.on('pageerror', (error) => {
            appendLog(report, 'pageerror', errorMessage(error));
        });
        const browserProcess = context.browser()?.process?.();
        const browserPidFromPlaywright = (browserProcess && typeof browserProcess.pid === 'number') ? browserProcess.pid : null;
        const browserPid = browserPidFromPlaywright ?? await findChromiumPidByProfileDir(userDataDir);
        processSampler = startProcessSampler(browserPid);
        try {
            cdpSession = await context.newCDPSession(page);
            await cdpSession.send('Profiler.enable');
            await cdpSession.send('Performance.enable');
        } catch (_) {
            cdpSession = null;
        }

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
                let opfsVfsPtr = null;
                if (typeof (capi && capi.sqlite3_vfs_find) === 'function') {
                    opfsVfsPtr = capi.sqlite3_vfs_find('opfs');
                }
                return {
                    crossOriginIsolated: globalThis.crossOriginIsolated === true,
                    hasSharedArrayBuffer: typeof SharedArrayBuffer === 'function',
                    hasAtomics: typeof Atomics === 'object' && Atomics !== null,
                    hasStorageGetDirectory: !!(navigator.storage && typeof navigator.storage.getDirectory === 'function'),
                    hasOpfsDbCtor: typeof (sqlite3 && sqlite3.oo1 && sqlite3.oo1.OpfsDb) === 'function',
                    hasOpfsImportDb: typeof (sqlite3 && sqlite3.opfs && sqlite3.opfs.importDb) === 'function',
                    opfsVfsPtr,
                    manifestCoop: manifest.cross_origin_opener_policy || null,
                    manifestCoep: manifest.cross_origin_embedder_policy || null,
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
                globalThis.manabitanImportUseSession = true;
                globalThis.manabitanDisableIntegrityCounts = true;
                globalThis.manabitanImportPerformanceFlags = (flagsFromRunner && typeof flagsFromRunner === 'object') ? {...flagsFromRunner} : {};
            }, importFlags);
        });
        const configureImportSessionEnd = safePerformance.now();
        const importSessionDetails = (e2eImportFlags !== null) ?
            `Set globalThis.manabitanImportUseSession=true; applied explicit import flags ${JSON.stringify(e2eImportFlags)}` :
            'Set globalThis.manabitanImportUseSession=true for shared backend session reuse during import profiling';
        await addReportPhase(report, page, 'Enable import session reuse', importSessionDetails, configureImportSessionStart, configureImportSessionEnd, configureImportSessionProfile, processSampler);

        await addReportPhase(
            report,
            page,
            'Warmup real dictionary cache',
            `Resolved and cached Jitendex/JMdict archives from recommended feed, then served locally at ${localServer.baseUrl}. quickImportBenchmarkMode=${quickImportBenchmarkMode}. probeTerms: jitendex=${String(jitendexProbeTerms.length)} jmdict=${String(jmdictProbeTerms.length)} merged=${String(lookupProbeCandidates.length)}`,
            cacheWarmupStart,
            cacheWarmupEnd,
            null,
            processSampler,
        );

        const importFiles = quickImportBenchmarkMode ?
            [cachedDictionaries.jitendexPath] :
            [cachedDictionaries.jitendexPath, cachedDictionaries.jmdictPath];
        const importSessionLabel = quickImportBenchmarkMode ? 'Jitendex' : 'Jitendex + JMdict';
        const importTriggerDescription = quickImportBenchmarkMode ?
            `Triggered quick one-file import session using cached archive ${cachedDictionaries.jitendexPath}` :
            `Triggered a single two-file import session using cached archives ${cachedDictionaries.jitendexPath} and ${cachedDictionaries.jmdictPath}`;

        const importTriggerStart = safePerformance.now();
        const importTriggerProfile = await runPhaseProfile(cdpSession, async () => {
            await page.setInputFiles('#dictionary-import-file-input', importFiles);
        });
        const importTriggerEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            quickImportBenchmarkMode ? 'Import Jitendex via file input' : 'Import Jitendex + JMdict via file input',
            importTriggerDescription,
            importTriggerStart,
            importTriggerEnd,
            importTriggerProfile,
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
        const importTotalStart = safePerformance.now();
        const importStepIndexByLabel = new Map();
        const importTotalProfile = await runPhaseProfile(cdpSession, async () => {
            await waitForImportCompletion(
                page,
                importSessionLabel,
                300000,
                async (label, stepStart, stepEnd) => {
                    const baseName = `Import progress: ${label}`;
                    const previousCount = importStepIndexByLabel.get(baseName) || 0;
                    const nextCount = previousCount + 1;
                    importStepIndexByLabel.set(baseName, nextCount);
                    const phaseName = nextCount > 1 ? `${baseName} (#${String(nextCount)})` : baseName;
                    await addReportPhase(
                        report,
                        page,
                        phaseName,
                        `Observed import progress state transition for two-dictionary session: ${label}`,
                        stepStart,
                        stepEnd,
                        null,
                        processSampler,
                    );
                },
            );
        });
        const importTotalEnd = safePerformance.now();
        const importDebug = await getLastImportDebug(page);
        const importDebugHistory = await getImportDebugHistory(page);
        const importStepTimingHistory = await getImportStepTimingHistory(page);
        const importStepTimingSummary = summarizeImportStepTimingHistory(importStepTimingHistory);
        const importStep4Breakdown = summarizeImportStep4Breakdown(importDebugHistory);
        const expectedResultDictionary = quickImportBenchmarkMode ? 'Jitendex' : 'JMdict';
        if (!(importDebug && importDebug.hasResult === true && typeof importDebug.resultTitle === 'string' && importDebug.resultTitle.includes(expectedResultDictionary))) {
            fail(`Import did not finish with expected ${expectedResultDictionary} success debug payload: ${JSON.stringify(importDebug)}`);
        }
        await addReportPhase(
            report,
            page,
            `${importSessionLabel}: total import`,
            `Waited for progress clear for import session (${importSessionLabel}). debug=${JSON.stringify(importDebug)} history=${JSON.stringify(importDebugHistory)} stepTimingSummary=${JSON.stringify(importStepTimingSummary)} step4Breakdown=${JSON.stringify(importStep4Breakdown)}`,
            importTotalStart,
            importTotalEnd,
            importTotalProfile,
            processSampler,
        );
        if (concurrentDbPressurePromise !== null) {
            const concurrentDbPressureEnd = safePerformance.now();
            const concurrentDbPressureProfile = await concurrentDbPressurePromise;
            const concurrentDbPressureResult = concurrentDbPressureProfile.result;
            await addReportPhase(
                report,
                page,
                'Concurrent DB-open pressure during import',
                `Ran parallel termsFind/getDictionaryCounts/deleteDictionaryByTitle requests during import to force DB-open contention and classify failures: ${JSON.stringify(concurrentDbPressureResult)}`,
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

        if (quickImportBenchmarkMode) {
            report.status = 'success';
            console.log(`${e2eLogTag} PASS: Quick import benchmark mode completed (${importSessionLabel}).`);
            return;
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
        await setEnabledDictionaries(page, expectedLookupDictionaries);
        const overlapProbeStart = safePerformance.now();
        const overlapProbeProfile = await runPhaseProfile(cdpSession, async () => {
            return await findOverlapLookupTerm(page, expectedLookupDictionaries, lookupProbeCandidates);
        });
        const overlapProbeEnd = safePerformance.now();
        const hasOverlapLookupTerm = overlapProbeProfile.result && overlapProbeProfile.result.ok === true;
        let overlapLookupTerm = String(overlapProbeProfile.result?.term || '暗記');
        await addReportPhase(
            report,
            page,
            'Discover overlap lookup term',
            hasOverlapLookupTerm ?
                `Selected lookup term "${overlapLookupTerm}" that resolves to ${expectedLookupDictionaries.join(' + ')}. probes=${JSON.stringify(overlapProbeProfile.result?.probes ?? [])}` :
                `Could not find dual-dictionary overlap term; probing dictionaries in isolated mode. probes=${JSON.stringify(overlapProbeProfile.result?.probes ?? [])}`,
            overlapProbeStart,
            overlapProbeEnd,
            overlapProbeProfile,
            processSampler,
        );
        if (!hasOverlapLookupTerm) {
            /** @type {string[]} */
            const isolatedLookupUnavailable = [];
            for (const dictionaryName of expectedLookupDictionaries) {
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
                return await setEnabledDictionaries(page, expectedLookupDictionaries);
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
            if (isolatedLookupUnavailable.length >= expectedLookupDictionaries.length) {
                fail(`Unable to find lookup terms for any isolated dictionary in ${expectedLookupDictionaries.join(' + ')}. unavailable=${JSON.stringify(isolatedLookupUnavailable)}`);
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
            return await waitForBackendDictionaryReady(page, expectedLookupDictionaries, readinessTerm, 60000, hasOverlapLookupTerm);
        });
        const backendReadyEnd = safePerformance.now();
        if (!(backendReadyProfile.result && backendReadyProfile.result.ok === true)) {
            fail(`Backend dictionary readiness did not stabilize for ${expectedLookupDictionaries.join(' + ')} within timeout using term "${readinessTerm}". diagnostics=${JSON.stringify(backendReadyProfile.result?.diagnostics ?? null)}`);
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
        const installedTitlesResult = await waitForInstalledDictionaryTitles(page, 30000);
        const installedTitlesText = installedTitlesResult.titles.join(', ');
        if (!installedTitlesResult.ok) {
            verificationErrors.push(`Installed dictionary list missing expected dictionaries: ${installedTitlesText}`);
        }
        const verifyListEnd = safePerformance.now();
        await addReportPhase(report, page, 'Verify installed dictionaries list', `Expected Jitendex + JMdict in installed dictionaries modal. observed="${installedTitlesText}"`, verifyListStart, verifyListEnd, verifyListProfile, processSampler);

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

        const autoUpdateStart = safePerformance.now();
        let autoUpdateProfile = null;
        let autoUpdateError = '';
        try {
            autoUpdateProfile = await runPhaseProfile(cdpSession, async () => {
                if (localServer === null) {
                    throw new Error('Local E2E server is unavailable for auto-update verification');
                }
                await runAutoUpdateScenario(page, extensionBaseUrl, localServer, report, cdpSession, processSampler);
                return {ok: true};
            });
        } catch (e) {
            autoUpdateError = errorMessage(e);
            verificationErrors.push(`Auto-update end-to-end verification failed: ${autoUpdateError}`);
        }
        const autoUpdateEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Auto-update end-to-end verification',
            autoUpdateError.length > 0 ?
                `Auto-update verification failed: ${autoUpdateError}` :
                'Verified hourly auto-update end to end, including HEAD/GET no-op checks, validator-backed 304 handling, and automatic v1 -> v2 replacement with preserved settings.',
            autoUpdateStart,
            autoUpdateEnd,
            autoUpdateProfile,
            processSampler,
        );

        const welcomeAutoImportStart = safePerformance.now();
        let welcomeAutoImportProfile = null;
        let welcomeAutoImportError = '';
        try {
            welcomeAutoImportProfile = await runPhaseProfile(cdpSession, async () => {
                await page.goto(`${extensionBaseUrl}/welcome.html`);
                await page.waitForSelector('#language-select', {state: 'attached', timeout: 30000});
                if (!(await waitForBodyVisible(page, 30000))) {
                    throw new Error('Welcome page body remained hidden');
                }
                if (localServer === null) {
                    throw new Error('Local E2E server is unavailable for welcome auto-import verification');
                }

                const mockRecommendedDictionaries = {
                    ja: {
                        terms: [
                            {
                                name: 'Jitendex',
                                description: 'Real Jitendex from recommended dictionaries',
                                homepage: '',
                                downloadUrl: `${localServer.baseUrl}/dictionaries/jitendex.zip`,
                            },
                        ],
                        kanji: [],
                        frequency: [],
                        grammar: [],
                        pronunciation: [],
                    },
                };
                await installRecommendedDictionariesMock(page, mockRecommendedDictionaries);
                if (!(await welcomeHasRecommendedDictionariesButton(page))) {
                    throw new Error('Welcome page is missing the manual recommended-dictionaries button');
                }

                await setWelcomeLanguage(page, 'ja');
                await waitForWelcomeAutoImportStatus(page, 'Downloading 1 recommended dictionaries for "ja"', 30000);
                await waitForImportCompletion(page, 'Welcome auto-import (Jitendex)', 300000);

                const dictionaryInfo = await getDictionaryInfoRuntime(page);
                const installedTitles = (Array.isArray(dictionaryInfo) ? dictionaryInfo : [])
                    .map((entry) => String(entry?.title || '').trim())
                    .filter((value) => value.length > 0);
                if (!installedTitles.some((title) => matchesDictionaryName(title, 'Jitendex'))) {
                    throw new Error(`Welcome auto-import did not install Jitendex. installedTitles=${JSON.stringify(installedTitles)}`);
                }

                await setWelcomeLanguage(page, 'en');
                await waitForWelcomeAutoImportStatus(page, 'No recommended dictionaries are currently available for "en".', 30000);

                return {
                    installedTitles,
                    welcomeStatus: await getWelcomeAutoImportStatusText(page),
                };
            });
        } catch (e) {
            welcomeAutoImportError = errorMessage(e);
            verificationErrors.push(`Welcome auto-import verification failed: ${welcomeAutoImportError}`);
        }
        const welcomeAutoImportEnd = safePerformance.now();
        await addReportPhase(
            report,
            page,
            'Welcome auto-import verification',
            welcomeAutoImportError.length > 0 ?
                `Welcome auto-import verification failed: ${welcomeAutoImportError}` :
                `Verified welcome language-change auto-import and inline status messaging. details=${JSON.stringify(welcomeAutoImportProfile?.result ?? null)}`,
            welcomeAutoImportStart,
            welcomeAutoImportEnd,
            welcomeAutoImportProfile,
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
/* eslint-enable @stylistic/max-statements-per-line, @stylistic/multiline-ternary, @typescript-eslint/ban-ts-comment, no-empty, unicorn/no-useless-undefined, unicorn/prefer-spread */
