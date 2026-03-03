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
const browserChannel = browserFlavor === 'edge' ? 'msedge' : null;

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
const quickImportBenchmarkMode = parseBooleanEnv(process.env.MANABITAN_E2E_IMPORT_BENCH_QUICK, false);
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
    if (report.logs.length > 300) {
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
            const termsFind = await send('termsFind', {text: term, details: {primaryReading: ''}, optionsContext: {index: 0}});
            const termDictionaryNames = [];
            for (const entry of termsFind?.dictionaryEntries || []) {
                if (entry?.dictionary) { termDictionaryNames.push(String(entry.dictionary)); }
                for (const definition of entry?.definitions || []) {
                    if (definition?.dictionary) { termDictionaryNames.push(String(definition.dictionary)); }
                }
            }
            const enabledDictionaryNames = [];
            for (const row of options0?.dictionaries || []) {
                if (row?.enabled !== true) { continue; }
                const name = String(row?.name || '').trim();
                if (name.length > 0) {
                    enabledDictionaryNames.push(name);
                }
            }
            return {
                dictionaryInfo,
                termResultCount: Array.isArray(termsFind?.dictionaryEntries) ? termsFind.dictionaryEntries.length : 0,
                termDictionaryNames: [...new Set(termDictionaryNames)],
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

async function searchTermAndGetDictionaryHitCounts(page, term, expectedDictionaryNames, timeoutMs = 15000) {
    await page.waitForSelector('#search-textbox', {state: 'attached', timeout: 30000});
    if (!(await waitForBodyVisible(page, 30000))) {
        throw new Error('Search page body remained hidden');
    }
    await page.fill('#search-textbox', '');
    await page.fill('#search-textbox', term);
    await page.keyboard.press('Enter');
    const deadline = safePerformance.now() + timeoutMs;
    let lastCounts = Object.fromEntries(expectedDictionaryNames.map((name) => [name, 0]));
    while (safePerformance.now() < deadline) {
        const counts = await page.evaluate((names) => {
            const dictionaryEntries = document.querySelector('#dictionary-entries');
            if (!(dictionaryEntries instanceof HTMLElement)) {
                return {};
            }
            const countMap = Object.create(null);
            const dictionaryNodes = dictionaryEntries.querySelectorAll('.definition-item[data-dictionary], .entry [data-dictionary]');
            for (const node of dictionaryNodes) {
                const dictionary = node instanceof HTMLElement ? (node.dataset.dictionary || '').trim() : '';
                if (dictionary.length === 0) { continue; }
                countMap[dictionary] = (countMap[dictionary] || 0) + 1;
            }
            const text = (dictionaryEntries.textContent || '');
            for (const name of names) {
                if (countMap[name]) { continue; }
                const matchCount = text.length > 0 && name.length > 0 ? Math.max(0, text.split(name).length - 1) : 0;
                if (matchCount > 0) {
                    countMap[name] = matchCount;
                }
            }
            return countMap;
        }, expectedDictionaryNames);
        lastCounts = Object.fromEntries(expectedDictionaryNames.map((name) => [name, Number(counts[name] || 0)]));
        if (expectedDictionaryNames.every((name) => (lastCounts[name] ?? 0) >= 1)) {
            return lastCounts;
        }
        await page.waitForTimeout(250);
    }
    return lastCounts;
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
            `Resolved and cached Jitendex/JMdict archives from recommended feed, then served locally at ${localServer.baseUrl}. quickImportBenchmarkMode=${quickImportBenchmarkMode}`,
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
        const backendReadyStart = safePerformance.now();
        const backendReadyProfile = await runPhaseProfile(cdpSession, async () => {
            return await waitForBackendDictionaryReady(page, ['Jitendex', 'JMdict'], '暗記', 60000);
        });
        const backendReadyEnd = safePerformance.now();
        if (!(backendReadyProfile.result && backendReadyProfile.result.ok === true)) {
            fail(`Backend dictionary readiness did not stabilize for Jitendex + JMdict within timeout. diagnostics=${JSON.stringify(backendReadyProfile.result?.diagnostics ?? null)}`);
        }
        await addReportPhase(
            report,
            page,
            'Wait for backend dictionary readiness',
            `Backend confirms loaded + lookup-visible dictionaries for 暗記: ${JSON.stringify(backendReadyProfile.result?.diagnostics ?? null)}`,
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
            const lookupWords = ['暗記', '名前', '日本', '学生', '食べる', '見る', '言う', '行く', '水', '猫'];
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
            let searchCounts = {Jitendex: 0, JMdict: 0};
            let searchError = '';
            try {
                searchProfile = await runPhaseProfile(cdpSession, async () => {
                    return await searchTermAndGetDictionaryHitCounts(page, '暗記', ['Jitendex', 'JMdict']);
                });
                searchCounts = searchProfile.result;
            } catch (e) {
                searchError = errorMessage(e);
                verificationErrors.push(`Search for 暗記 failed: ${searchError}`);
            }
            if (searchError.length === 0 && ((searchCounts.Jitendex ?? 0) < 1 || (searchCounts.JMdict ?? 0) < 1)) {
                verificationErrors.push(`Expected search result counts for 暗記 from both dictionaries, saw ${JSON.stringify(searchCounts)}`);
            }
            const searchEnd = safePerformance.now();
            await addReportPhase(
                report,
                page,
                'Verify search results include both dictionaries',
                searchError.length > 0 ?
                    `Search attempt failed: ${searchError}` :
                    `Searched 暗記 and observed dictionary hit counts: ${JSON.stringify(searchCounts)}`,
                searchStart,
                searchEnd,
                searchProfile,
                processSampler,
            );

            const lookupWords = ['暗記', '名前', '日本', '学生', '食べる', '見る', '言う', '行く', '水', '猫'];
            for (const word of lookupWords) {
                const lookupChar = String([...word][0] || '').trim();
                if (lookupChar.length === 0) { continue; }
                const lookupStart = safePerformance.now();
                let lookupProfile = null;
                let lookupCounts = {Jitendex: 0, JMdict: 0};
                let lookupError = '';
                try {
                    lookupProfile = await runPhaseProfile(cdpSession, async () => {
                        return await searchTermAndGetDictionaryHitCounts(page, lookupChar, ['Jitendex', 'JMdict'], 6000);
                    });
                    lookupCounts = lookupProfile.result;
                } catch (e) {
                    lookupError = errorMessage(e);
                    verificationErrors.push(`Lookup ${lookupChar} failed: ${lookupError}`);
                }
                if (lookupError.length === 0 && ((lookupCounts.Jitendex ?? 0) < 1 || (lookupCounts.JMdict ?? 0) < 1)) {
                    verificationErrors.push(`Lookup ${lookupChar} missing dictionary hits: ${JSON.stringify(lookupCounts)}`);
                }
                const lookupEnd = safePerformance.now();
                await addReportPhase(
                    report,
                    page,
                    `Profile lookup: ${lookupChar}`,
                    lookupError.length > 0 ?
                        `lookupChar=${lookupChar} failed: ${lookupError}` :
                        `lookupChar=${lookupChar} counts=${JSON.stringify(lookupCounts)}`,
                    lookupStart,
                    lookupEnd,
                    lookupProfile,
                    processSampler,
                );
            }
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
