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

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {access, mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {Builder, Browser, By, Key, until} from 'selenium-webdriver';
import * as firefox from 'selenium-webdriver/firefox.js';
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
const autoUpdateStateStorageKey = 'manabitanDictionaryAutoUpdateState';
const autoUpdateAlarmName = 'manabitanDictionaryAutoUpdateHourly';

/**
 * @param {number} value
 * @returns {string}
 */
function formatMemoryMb(value) {
    return `${value.toFixed(1)} MB`;
}

/**
 * @param {{sampleCount: number, avgCpuPercent: number|null, peakCpuPercent: number|null, avgRssMb: number|null, peakRssMb: number|null}} resource
 * @returns {string}
 */
function formatResourceSummary(resource) {
    if (resource.sampleCount <= 0) {
        return 'resource-samples=unavailable';
    }
    return `resource-samples=${String(resource.sampleCount)} avgCpu=${resource.avgCpuPercent?.toFixed(1) ?? 'n/a'}% peakCpu=${resource.peakCpuPercent?.toFixed(1) ?? 'n/a'}% avgRss=${resource.avgRssMb !== null ? formatMemoryMb(resource.avgRssMb) : 'n/a'} peakRss=${resource.peakRssMb !== null ? formatMemoryMb(resource.peakRssMb) : 'n/a'}`;
}

/**
 * @param {number|null} firefoxPid
 * @returns {{stop: () => Promise<{sampleCount: number, avgCpuPercent: number|null, peakCpuPercent: number|null, avgRssMb: number|null, peakRssMb: number|null}>}}
 */
function startFirefoxResourceSampler(firefoxPid) {
    if (!(typeof firefoxPid === 'number' && Number.isFinite(firefoxPid) && firefoxPid > 0)) {
        return {
            stop: async () => ({
                sampleCount: 0,
                avgCpuPercent: null,
                peakCpuPercent: null,
                avgRssMb: null,
                peakRssMb: null,
            }),
        };
    }
    /** @type {Array<{cpuPercent: number, rssMb: number}>} */
    const samples = [];
    let running = false;
    const sampleOnce = async () => {
        if (running) { return; }
        running = true;
        try {
            const {stdout} = await execFileAsync('ps', ['-p', String(firefoxPid), '-o', '%cpu=,rss=']);
            const line = stdout.trim().split('\n').find((current) => current.trim().length > 0) || '';
            const [cpuRaw, rssRaw] = line.trim().split(/\s+/);
            const cpuPercent = Number(cpuRaw);
            const rssKb = Number(rssRaw);
            if (Number.isFinite(cpuPercent) && Number.isFinite(rssKb)) {
                samples.push({cpuPercent, rssMb: rssKb / 1024});
            }
        } catch (_) {
            // Process sampling is best-effort; ignore intermittent failures.
        } finally {
            running = false;
        }
    };
    const interval = setInterval(() => {
        void sampleOnce();
    }, 500);
    void sampleOnce();
    return {
        stop: async () => {
            clearInterval(interval);
            await sampleOnce();
            if (samples.length === 0) {
                return {
                    sampleCount: 0,
                    avgCpuPercent: null,
                    peakCpuPercent: null,
                    avgRssMb: null,
                    peakRssMb: null,
                };
            }
            const cpuValues = samples.map((sample) => sample.cpuPercent);
            const rssValues = samples.map((sample) => sample.rssMb);
            const avgCpuPercent = cpuValues.reduce((sum, value) => sum + value, 0) / cpuValues.length;
            const avgRssMb = rssValues.reduce((sum, value) => sum + value, 0) / rssValues.length;
            return {
                sampleCount: samples.length,
                avgCpuPercent,
                peakCpuPercent: Math.max(...cpuValues),
                avgRssMb,
                peakRssMb: Math.max(...rssValues),
            };
        },
    };
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<number|null>}
 */
async function getFirefoxProcessId(driver) {
    try {
        const capabilities = await driver.getCapabilities();

        const rawPid = capabilities.get('moz:processID');
        const processId = Number(rawPid);
        if (Number.isFinite(processId) && processId > 0) {
            return processId;
        }
    } catch (_) {
        // Fallback below.
    }
    try {
        const {stdout} = await execFileAsync('pgrep', ['-n', 'firefox']);
        const processId = Number(stdout.trim());
        if (Number.isFinite(processId) && processId > 0) {
            return processId;
        }
    } catch (_) {
        // No PID fallback available.
    }
    return null;
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<void>}
 */
async function ensurePageProfiler(driver) {
    await driver.executeScript(`
        if (!globalThis.__manabitanE2EPageProfiler) {
            const state = {
                longTasks: [],
                phaseLongTaskStart: 0,
                phaseMeasureStart: 0,
            };
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        state.longTasks.push({
                            name: String(entry.name || 'longtask'),
                            duration: Number(entry.duration || 0),
                            startTime: Number(entry.startTime || 0),
                        });
                    }
                });
                observer.observe({entryTypes: ['longtask']});
                state.observer = observer;
            } catch (_) {
                // LongTask observer is best-effort.
            }
            globalThis.__manabitanE2EPageProfiler = state;
        }
    `);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<void>}
 */
async function beginPageProfilePhase(driver) {
    await driver.executeScript(`
        const state = globalThis.__manabitanE2EPageProfiler;
        if (!state || typeof state !== 'object') { return; }
        state.phaseLongTaskStart = Array.isArray(state.longTasks) ? state.longTasks.length : 0;
        try {
            state.phaseMeasureStart = performance.getEntriesByType('measure').length;
        } catch (_) {
            state.phaseMeasureStart = 0;
        }
    `);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<{longTaskCount: number, longTaskTotalMs: number, longTaskPeakMs: number, topMeasures: Array<{name: string, totalMs: number}>, topLongTasks: Array<{name: string, duration: number}>}>}
 */
async function endPageProfilePhase(driver) {
    // Selenium executeScript return value is untyped (`any`).

    const summary = await driver.executeScript(`
        const state = globalThis.__manabitanE2EPageProfiler;
        if (!state || typeof state !== 'object') {
            return {longTaskCount: 0, longTaskTotalMs: 0, longTaskPeakMs: 0, topMeasures: [], topLongTasks: []};
        }
        const longTaskStart = Number(state.phaseLongTaskStart || 0);
        const phaseLongTasks = Array.isArray(state.longTasks) ? state.longTasks.slice(longTaskStart) : [];
        const longTaskCount = phaseLongTasks.length;
        const longTaskTotalMs = phaseLongTasks.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
        const longTaskPeakMs = phaseLongTasks.reduce((max, entry) => Math.max(max, Number(entry.duration || 0)), 0);
        const topLongTasks = phaseLongTasks
            .slice()
            .sort((a, b) => Number(b.duration || 0) - Number(a.duration || 0))
            .slice(0, 5)
            .map((entry) => ({name: String(entry.name || 'longtask'), duration: Number(entry.duration || 0)}));
        let topMeasures = [];
        try {
            const measureStart = Number(state.phaseMeasureStart || 0);
            const measures = performance.getEntriesByType('measure').slice(measureStart);
            const totals = new Map();
            for (const entry of measures) {
                const name = String(entry.name || 'measure');
                totals.set(name, (totals.get(name) || 0) + Number(entry.duration || 0));
            }
            topMeasures = [...totals.entries()]
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .slice(0, 5)
                .map(([name, totalMs]) => ({name: String(name), totalMs: Number(totalMs)}));
        } catch (_) {
            topMeasures = [];
        }
        return {longTaskCount, longTaskTotalMs, longTaskPeakMs, topMeasures, topLongTasks};
    `);
    if (typeof summary === 'object' && summary !== null && !Array.isArray(summary)) {
        const normalized = /** @type {Record<string, unknown>} */ (summary);
        const normalizeTopMeasureEntries = (entries) => {
            if (!Array.isArray(entries)) { return []; }
            return entries.map((entry) => {
                const record = (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) ? /** @type {Record<string, unknown>} */ (entry) : {};
                const rawName = record.name;
                const name = (typeof rawName === 'string') ? rawName : '';
                return {
                    name,
                    totalMs: Number(record.totalMs || 0),
                };
            });
        };
        const normalizeTopLongTaskEntries = (entries) => {
            if (!Array.isArray(entries)) { return []; }
            return entries.map((entry) => {
                const record = (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) ? /** @type {Record<string, unknown>} */ (entry) : {};
                const rawName = record.name;
                const name = (typeof rawName === 'string') ? rawName : '';
                return {
                    name,
                    duration: Number(record.duration || 0),
                };
            });
        };
        return {
            longTaskCount: Number(normalized.longTaskCount || 0),
            longTaskTotalMs: Number(normalized.longTaskTotalMs || 0),
            longTaskPeakMs: Number(normalized.longTaskPeakMs || 0),
            topMeasures: normalizeTopMeasureEntries(normalized.topMeasures),
            topLongTasks: normalizeTopLongTaskEntries(normalized.topLongTasks),
        };
    }
    return {longTaskCount: 0, longTaskTotalMs: 0, longTaskPeakMs: 0, topMeasures: [], topLongTasks: []};
}

/**
 * @returns {Promise<{jitendexUrl: string, jmdictUrl: string}>}
 */
async function loadRecommendedDictionaryUrls() {
    const recommendedPath = path.join(root, 'ext', 'data', 'recommended-dictionaries.json');
    const raw = await readFile(recommendedPath, 'utf8');
    const recommended = /** @type {Record<string, unknown>} */ (parseJson(raw));
    const ja = /** @type {Record<string, unknown>|undefined} */ (recommended.ja);
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
        fail(`Unable to resolve recommended dictionary URLs from ext/data/recommended-dictionaries.json (jitendex="${jitendexUrl}", jmdict="${jmdictUrl}")`);
    }
    return {jitendexUrl, jmdictUrl};
}

/**
 * @param {string} url
 * @param {string} outputPath
 * @returns {Promise<void>}
 */
async function ensureCachedDownload(url, outputPath) {
    try {
        await access(outputPath);
        return;
    } catch (_) {
        // Download below when cache file is missing.
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

/**
 * @returns {Promise<{jitendexPath: string, jmdictPath: string, jitendexUrl: string, jmdictUrl: string}>}
 */
async function ensureRealDictionaryCache() {
    await mkdir(dictionaryCacheDir, {recursive: true});
    const {jitendexUrl, jmdictUrl} = await loadRecommendedDictionaryUrls();
    const jitendexPath = path.join(dictionaryCacheDir, 'jitendex-yomitan.zip');
    const jmdictPath = path.join(dictionaryCacheDir, 'JMdict.zip');
    await ensureCachedDownload(jitendexUrl, jitendexPath);
    await ensureCachedDownload(jmdictUrl, jmdictPath);
    return {jitendexPath, jmdictPath, jitendexUrl, jmdictUrl};
}

/**
 * @param {{jitendexPath: string, jmdictPath: string}} paths
 * @returns {Promise<{baseUrl: string, close: () => Promise<void>}>}
 */
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
        const method = String(request.method || 'GET').toUpperCase();
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        };
        if (method === 'OPTIONS') {
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
                method,
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
                response.writeHead(200, {
                    ...headers,
                    'Content-Type': 'application/zip',
                    'Content-Length': String(autoUpdateFixture.versions.v1.archiveBuffer.byteLength),
                });
                response.end(autoUpdateFixture.versions.v1.archiveBuffer);
                return;
            }
            if (requestUrl === autoUpdateFixture.newArchivePath) {
                response.writeHead(200, {
                    ...headers,
                    'Content-Type': 'application/zip',
                    'Content-Length': String(autoUpdateFixture.versions.v2.archiveBuffer.byteLength),
                });
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
            if (method === 'HEAD') {
                response.end();
                return;
            }
            response.end(body);
            return;
        }
        if (requestUrl === '/dictionaries/jitendex.zip') {
            response.writeHead(200, {
                ...headers,
                'Content-Type': 'application/zip',
                'Content-Length': String(jitendexZip.byteLength),
            });
            response.end(jitendexZip);
            return;
        }
        if (requestUrl === '/dictionaries/jmdict.zip') {
            response.writeHead(200, {
                ...headers,
                'Content-Type': 'application/zip',
                'Content-Length': String(jmdictZip.byteLength),
            });
            response.end(jmdictZip);
            return;
        }
        if (requestUrl === '/wagahai-neko.html') {
            response.writeHead(200, {
                ...headers,
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Length': String(wagahaiHtml.byteLength),
            });
            response.end(wagahaiHtml);
            return;
        }
        response.writeHead(404, {
            ...headers,
            'Content-Type': 'text/plain; charset=utf-8',
        });
        response.end('Not found');
    });
    const address = /** @type {import('node:net').AddressInfo|string|null} */ (await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => resolve(/** @type {import('node:net').AddressInfo|string|null} */ (server.address())));
    }));
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
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                });
            });
        },
    };
}

/**
 * @param {string} message
 * @throws {Error}
 */
function fail(message) {
    throw new Error(`[firefox-e2e] ${message}`);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function errorMessage(value) {
    return value instanceof Error ? value.message : String(value);
}

/**
 * @param {string | undefined} value
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
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

/**
 * @param {string} message
 * @returns {string}
 */
function getUnsupportedRuntimeSkipReason(message) {
    const text = String(message);
    if (text.includes('OPFS is required but unavailable') || text.includes('no such vfs: opfs')) {
        return 'Firefox automation runtime does not expose OPFS VFS in this local Selenium stack; skipping this lane locally without enabling any OPFS fallback.';
    }
    if (text.includes('background.service_worker is currently disabled')) {
        return 'Firefox automation runtime does not support MV3 background service workers in this local Selenium/browser stack; skipping this lane locally.';
    }
    return '';
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>|null}
 */
function asRecordOrNull(value) {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    ) ?
        /** @type {Record<string, unknown>} */ (value) :
        null;
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

/**
 * @param {number} valueMs
 * @returns {string}
 */
function formatDuration(valueMs) {
    return `${valueMs.toFixed(1)} ms`;
}

/**
 * @typedef {{
 *   name: string,
 *   details: string,
 *   startMs: number,
 *   endMs: number,
 *   durationMs: number,
 *   screenshotBase64: string,
 *   screenshotMimeType: string
 * }} ReportPhase
 */

/**
 * @typedef {{
 *   startedAtIso: string,
 *   status: 'running'|'success'|'success-with-skips'|'failure',
 *   failureReason: string,
 *   skippedVerification: boolean,
 *   skipReason: string,
 *   runtimeDiagnostics: Record<string, unknown>|null,
 *   phases: ReportPhase[]
 * }} E2EReport
 */

/**
 * @returns {E2EReport}
 */
function createReport() {
    return {
        startedAtIso: new Date().toISOString(),
        status: 'running',
        failureReason: '',
        skippedVerification: false,
        skipReason: '',
        runtimeDiagnostics: null,
        phases: [],
    };
}

/**
 * @param {E2EReport} report
 * @returns {{startedAtIso: string, status: E2EReport['status'], failureReason: string, skippedVerification: boolean, skipReason: string, runtimeDiagnostics: Record<string, unknown>|null, phaseCount: number, phases: Array<{name: string, details: string, durationMs: number}>}}
 */
function createReportJsonSummary(report) {
    return {
        startedAtIso: report.startedAtIso,
        status: report.status,
        failureReason: report.failureReason,
        skippedVerification: report.skippedVerification,
        skipReason: report.skipReason,
        runtimeDiagnostics: report.runtimeDiagnostics,
        phaseCount: Array.isArray(report.phases) ? report.phases.length : 0,
        phases: (Array.isArray(report.phases) ? report.phases : []).map((phase) => ({
            name: phase.name,
            details: phase.details,
            durationMs: phase.durationMs,
        })),
    };
}

/**
 * @param {E2EReport} report
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} name
 * @param {string} details
 * @param {number} startMs
 * @param {number} endMs
 * @returns {Promise<void>}
 */
async function addReportPhase(report, driver, name, details, startMs, endMs) {
    console.log(`[firefox-e2e] phase: ${name} (${formatDuration(Math.max(0, endMs - startMs))})`);
    const screenshotBase64 = String(await driver.takeScreenshot());
    report.phases.push({
        name,
        details,
        startMs,
        endMs,
        durationMs: Math.max(0, endMs - startMs),
        screenshotBase64,
        screenshotMimeType: 'image/png',
    });
}

/**
 * @param {E2EReport} report
 * @returns {string}
 */
function renderReportHtml(report) {
    const isFailure = report.status === 'failure';
    const isWarning = report.status === 'success-with-skips';
    let failureBanner = '';
    let warningBanner = '';
    if (isFailure) {
        failureBanner = `
  <div class="failure-banner">
    <div class="failure-banner-title">FAILED</div>
    <div class="failure-banner-reason">${escapeHtml(report.failureReason || 'Unknown failure')}</div>
  </div>`;
    }
    if (isWarning) {
        warningBanner = `
  <div class="warning-banner">
    <div class="warning-banner-title">SKIPPED</div>
    <div class="warning-banner-reason">${escapeHtml(report.skipReason || 'Verification skipped in unsupported local runtime')}</div>
  </div>`;
    }
    const rows = report.phases.map((phase, index) => {
        const imageUrl = `data:${phase.screenshotMimeType};base64,${phase.screenshotBase64}`;
        return `
            <section class="phase">
                <h2>Phase ${index + 1}: ${escapeHtml(phase.name)}</h2>
                <p><strong>Duration:</strong> ${escapeHtml(formatDuration(phase.durationMs))}</p>
                <p><strong>Details:</strong> ${escapeHtml(phase.details)}</p>
                <img src="${imageUrl}" alt="${escapeHtml(phase.name)} screenshot">
            </section>
        `;
    }).join('\n');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Manabitan Firefox E2E Import Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 24px; color: #1d1d1f; }
    h1 { margin-bottom: 8px; }
    .meta { margin-bottom: 24px; padding: 12px 14px; border-radius: 8px; background: #f5f7fa; }
    .failure-banner { margin: 0 0 18px; padding: 14px 16px; border-radius: 10px; border: 2px solid #ef4444; background: #fee2e2; color: #991b1b; }
    .failure-banner-title { font-size: 26px; font-weight: 800; letter-spacing: 0.3px; margin-bottom: 4px; }
    .failure-banner-reason { font-size: 14px; font-weight: 600; white-space: pre-wrap; }
    .warning-banner { margin: 0 0 18px; padding: 14px 16px; border-radius: 10px; border: 2px solid #f59e0b; background: #fef3c7; color: #92400e; }
    .warning-banner-title { font-size: 26px; font-weight: 800; letter-spacing: 0.3px; margin-bottom: 4px; }
    .warning-banner-reason { font-size: 14px; font-weight: 600; white-space: pre-wrap; }
    .phase { margin: 0 0 28px; padding: 14px; border: 1px solid #d8dee4; border-radius: 10px; }
    .phase h2 { margin: 0 0 8px; font-size: 18px; }
    .phase p { margin: 6px 0; }
    img { margin-top: 10px; max-width: 100%; border: 1px solid #d8dee4; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>Manabitan Firefox E2E Import Report</h1>
  ${failureBanner}
  ${warningBanner}
  <div class="meta">
    <div><strong>Started:</strong> ${escapeHtml(report.startedAtIso)}</div>
    <div><strong>Status:</strong> ${escapeHtml(report.status)}</div>
    <div><strong>Failure reason:</strong> ${escapeHtml(report.failureReason || 'none')}</div>
    <div><strong>Skip reason:</strong> ${escapeHtml(report.skipReason || 'none')}</div>
    <div><strong>Recorded phases:</strong> ${report.phases.length}</div>
  </div>
  ${rows}
</body>
</html>`;
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string>}
 */
async function getImportProgressLabel(driver) {
    // Selenium executeScript return value is untyped (`any`).

    const value = await driver.executeScript(`
        const selectors = [
            '#recommended-dictionaries-modal .dictionary-import-progress',
            '#dictionaries-modal .dictionary-import-progress'
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
    `);
    return typeof value === 'string' ? value : '';
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string>}
 */
async function getDictionaryCountsText(driver) {
    const installCount = String(await (await driver.findElement(By.css('#dictionary-install-count'))).getText());
    const enabledCount = String(await (await driver.findElement(By.css('#dictionary-enabled-count'))).getText());
    return `${installCount} installed, ${enabledCount} enabled`;
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string>}
 */
async function getDictionaryErrorText(driver) {
    // Selenium executeScript return value is untyped (`any`).

    const value = await driver.executeScript(`
        const node = document.querySelector('#dictionary-error');
        if (!(node instanceof HTMLElement) || node.hidden) { return ''; }
        return (node.textContent || '').trim();
    `);
    return typeof value === 'string' ? value : '';
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<Record<string, unknown>|null>}
 */
async function getLastImportDebug(driver) {
    // Selenium executeScript return value is untyped (`any`).

    const value = await driver.executeScript('return globalThis.__manabitanLastImportDebug ?? null;');
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return /** @type {Record<string, unknown>} */ (value);
    }
    return null;
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string[]>}
 */
async function getMockSeenUrls(driver) {
    // Selenium executeScript return value is untyped (`any`).

    const value = await driver.executeScript('return Array.isArray(globalThis.__manabitanMockSeenUrls) ? globalThis.__manabitanMockSeenUrls.slice(-8) : [];');
    return Array.isArray(value) ? value.map(String) : [];
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {E2EReport} report
 * @param {string} dictionaryName
 * @param {string} expectedCounts
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
async function waitForImportWithPhaseScreenshots(driver, report, dictionaryName, expectedCounts, timeoutMs) {
    const importStartTime = safePerformance.now();
    let previousLabel = '';
    let previousLabelStart = importStartTime;
    const deadline = importStartTime + timeoutMs;
    let sawStepText = false;
    let clearedAfterStep = false;
    let emptySince = null;
    const emptyStabilityMs = 2_000;

    while (safePerformance.now() < deadline) {
        const now = safePerformance.now();
        const immediateError = await getDictionaryErrorText(driver);
        if (immediateError.length > 0) {
            fail(`${dictionaryName} import reported error before completion: ${immediateError}`);
        }
        const currentLabel = await getImportProgressLabel(driver);
        if (currentLabel.includes('Step ')) {
            sawStepText = true;
            emptySince = null;
        }
        if (currentLabel.length > 0 && currentLabel !== previousLabel) {
            if (previousLabel.length > 0) {
                await addReportPhase(
                    report,
                    driver,
                    `${dictionaryName}: ${previousLabel}`,
                    `${dictionaryName} import progress phase`,
                    previousLabelStart,
                    now,
                );
            }
            previousLabel = currentLabel;
            previousLabelStart = now;
        }

        if (sawStepText && currentLabel.length === 0) {
            emptySince ??= now;
            if ((now - emptySince) >= emptyStabilityMs) {
                clearedAfterStep = true;
                if (previousLabel.length > 0) {
                    await addReportPhase(
                        report,
                        driver,
                        `${dictionaryName}: ${previousLabel}`,
                        `${dictionaryName} import progress phase`,
                        previousLabelStart,
                        now,
                    );
                }
                await addReportPhase(
                    report,
                    driver,
                    `${dictionaryName}: total import`,
                    `Progress text stayed empty for ${String(emptyStabilityMs)}ms after Step text appeared. Expected counts target for this phase: ${expectedCounts}. Current counts=${await getDictionaryCountsText(driver)} dictionary-error="${await getDictionaryErrorText(driver)}" import-debug=${JSON.stringify(await getLastImportDebug(driver))} mock-urls=${JSON.stringify(await getMockSeenUrls(driver))}`,
                    importStartTime,
                    now,
                );
                const importErrorText = await getDictionaryErrorText(driver);
                if (importErrorText.length > 0) {
                    fail(`${dictionaryName} import reported error: ${importErrorText}`);
                }
                return;
            }
        } else if (currentLabel.length > 0) {
            emptySince = null;
        }

        await driver.sleep(250);
    }

    const countsText = await getDictionaryCountsText(driver);
    const errorText = await getDictionaryErrorText(driver);
    fail(`Timed out waiting for ${dictionaryName} completion. sawStepText=${String(sawStepText)} clearedAfterStep=${String(clearedAfterStep)}. Last label="${previousLabel}" counts=${countsText} dictionary-error="${errorText}"`);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string>}
 * @throws {Error}
 */
/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} [installedAddonId]
 * @returns {Promise<string>}
 */
async function waitForExtensionBaseUrl(driver, installedAddonId = '') {
    const normalizedAddonId = String(installedAddonId || '').trim();
    const expectedBaseUrl = normalizedAddonId.length > 0 ? `moz-extension://${normalizedAddonId}` : '';
    const deadline = Date.now() + 30_000;
    let fallbackBaseUrl = '';
    while (Date.now() < deadline) {
        const handlesUnknown = /** @type {unknown} */ (await driver.getAllWindowHandles());
        const handles = Array.isArray(handlesUnknown) ? handlesUnknown.map(String) : [];
        for (const handle of handles) {
            await driver.switchTo().window(handle);
            const url = String(await driver.getCurrentUrl());
            const match = /^(moz-extension:\/\/[^/]+)(?:\/|$)/.exec(url);
            if (match !== null) {
                fallbackBaseUrl = match[1];
                if (expectedBaseUrl.length === 0 || expectedBaseUrl === match[1]) {
                    return match[1];
                }
            }
        }
        await driver.sleep(500);
    }
    if (fallbackBaseUrl.length > 0) {
        return fallbackBaseUrl;
    }
    if (expectedBaseUrl.length > 0) {
        return expectedBaseUrl;
    }
    fail('Failed to discover moz-extension base URL from open tabs.');
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} selector
 * @returns {Promise<void>}
 */
async function clickWithScroll(driver, selector) {
    // Selenium's JS-only API surfaces `any` for located elements.

    const element = await driver.findElement(By.css(selector));
    await driver.executeScript(`
        const element = arguments[0];
        if (!(element instanceof HTMLElement)) {
            throw new Error('Expected an HTMLElement');
        }
        element.scrollIntoView({block: 'center', inline: 'nearest'});
        element.click();
    `, element);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} dictionaryName
 * @returns {Promise<string>}
 */
async function installRecommendedDictionary(driver, dictionaryName) {
    await clickWithScroll(driver, '.settings-item[data-modal-action="show,recommended-dictionaries"]');
    await driver.wait(until.elementLocated(By.css('#recommended-dictionaries-modal')), 30_000);
    await driver.wait(async () => {
        // Selenium's executeScript return value is untyped (`any`).

        const names = await driver.executeScript(`
            return Array.from(document.querySelectorAll('#recommended-dictionaries-modal .settings-item-label'))
                .map((node) => (node.textContent || '').trim());
        `);
        return Array.isArray(names) && names.includes(dictionaryName);
    }, 30_000, `Expected recommended dictionary to render: ${dictionaryName}`);
    // Selenium executeScript return value is untyped (`any`).

    const importUrl = await driver.executeScript(`
        const dictionaryName = arguments[0];
        const items = Array.from(document.querySelectorAll('#recommended-dictionaries-modal .settings-item'));
        const item = items.find((currentItem) => {
            const labelNode = currentItem.querySelector('.settings-item-label');
            return (labelNode && (labelNode.textContent || '').trim() === dictionaryName);
        });
        if (!(item instanceof HTMLElement)) {
            throw new Error(\`Recommended dictionary not found: \${dictionaryName}\`);
        }
        const button = item.querySelector('button[data-action="import-recommended-dictionary"]');
        if (!(button instanceof HTMLButtonElement)) {
            throw new Error(\`Recommended dictionary button not found: \${dictionaryName}\`);
        }
        const importUrl = button.getAttribute('data-import-url') || '';
        button.scrollIntoView({block: 'center', inline: 'nearest'});
        button.click();
        return importUrl;
    `, dictionaryName);
    const normalizedImportUrl = typeof importUrl === 'string' ? importUrl : '';
    console.log(`[firefox-e2e] recommended ${dictionaryName} import-url: ${normalizedImportUrl}`);
    return normalizedImportUrl;
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} modalSelector
 * @returns {Promise<void>}
 */
async function closeModalIfOpen(driver, modalSelector) {
    await driver.executeScript(`
        const modal = document.querySelector(arguments[0]);
        if (!(modal instanceof HTMLElement) || modal.hidden) { return; }
        const closeButton = modal.querySelector('[data-modal-action="hide"]');
        if (closeButton instanceof HTMLElement) {
            closeButton.click();
        }
    `, modalSelector);
    await driver.wait(async () => {
        // Selenium executeScript return value is untyped (`any`).

        const hidden = await driver.executeScript(`
            const modal = document.querySelector(arguments[0]);
            return (modal instanceof HTMLElement) ? modal.hidden : true;
        `, modalSelector);
        return hidden === true;
    }, 15_000, `Expected modal to be hidden: ${modalSelector}`);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string>}
 */
async function openInstalledDictionariesModal(driver) {
    // Selenium executeScript return value is untyped (`any`).

    const triggerDescription = await driver.executeScript(`
        const isHidden = (element) => {
            if (!(element instanceof HTMLElement)) { return true; }
            if (element.hidden) { return true; }
            const style = getComputedStyle(element);
            return style.display === 'none' || style.visibility === 'hidden';
        };
        const clickElement = (element) => {
            if (!(element instanceof HTMLElement)) { return false; }
            element.scrollIntoView({block: 'center', inline: 'nearest'});
            element.click();
            return true;
        };

        const settingsTrigger = Array.from(document.querySelectorAll('.settings-item[data-modal-action="show,dictionaries"]')).find((item) => {
            if (!(item instanceof HTMLElement)) { return false; }
            if (isHidden(item)) { return false; }
            const label = item.querySelector('.settings-item-label');
            const text = (label?.textContent || '').trim();
            return text.includes('Configure installed and enabled dictionaries');
        });
        if (settingsTrigger && clickElement(settingsTrigger)) {
            return 'settings-item:Configure installed and enabled dictionaries';
        }

        throw new Error('Unable to find installed dictionaries modal trigger');
    `);
    await driver.wait(async () => {
        // Selenium executeScript return value is untyped (`any`).

        const open = await driver.executeScript(`
            const dictionariesModal = document.querySelector('#dictionaries-modal');
            const recommendedModal = document.querySelector('#recommended-dictionaries-modal');
            const dictionariesOpen = dictionariesModal instanceof HTMLElement && !dictionariesModal.hidden;
            const recommendedClosed = !(recommendedModal instanceof HTMLElement) || recommendedModal.hidden;
            let hasCheckForUpdatesButton = false;
            if (dictionariesOpen) {
                const footerButtons = Array.from(dictionariesModal.querySelectorAll('.modal-footer button'));
                hasCheckForUpdatesButton = footerButtons.some((button) => {
                    const text = (button.textContent || '').trim();
                    return text === 'Check for Updates';
                });
            }
            return dictionariesOpen && recommendedClosed && hasCheckForUpdatesButton;
        `);
        return open === true;
    }, 30_000, 'Expected installed dictionaries modal to open with Check for Updates button');
    return typeof triggerDescription === 'string' ? triggerDescription : 'unknown-trigger';
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} extensionBaseUrl
 * @returns {Promise<void>}
 */
async function openSearchPageViaActionPopup(driver, extensionBaseUrl) {
    await driver.get(`${extensionBaseUrl}/action-popup.html`);
    await driver.wait(async () => {
        // Selenium executeScript return value is untyped (`any`).

        const loaded = await driver.executeScript('return document.body?.dataset?.loaded === "true";');
        return loaded === true;
    }, 30_000, 'Expected action popup to finish loading');
    await driver.wait(until.elementLocated(By.css('.action-open-search')), 30_000);
    await driver.executeScript(`
        const button = document.querySelector('.action-open-search');
        if (!(button instanceof HTMLElement)) {
            throw new Error('Search button not found in action popup');
        }
        button.scrollIntoView({block: 'center', inline: 'nearest'});
        button.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            composed: true,
            button: 0,
            shiftKey: true,
        }));
    `);
    await driver.wait(async () => {
        const url = String(await driver.getCurrentUrl());
        return /\/search\.html(?:\?|$)/.test(url);
    }, 30_000, 'Expected search page to open from action popup magnifier');
    await driver.wait(until.elementLocated(By.css('#search-textbox')), 30_000);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} term
 * @param {string[]} expectedDictionaryNames
 * @param {number} [timeoutMs]
 * @param {'enter'|'button'} [submitMode]
 * @returns {Promise<Record<string, number>>}
 */
async function searchTermAndGetDictionaryHitCounts(driver, term, expectedDictionaryNames, timeoutMs = 60_000, submitMode = 'enter') {
    await driver.wait(async () => {
        // Selenium executeScript return value is untyped (`any`).

        const submitted = await driver.executeScript(`
            const textbox = document.querySelector('#search-textbox');
            const searchButton = document.querySelector('#search-button');
            const submitMode = String(arguments[1] || 'enter');
            if (!(textbox instanceof HTMLTextAreaElement)) { return false; }
            textbox.value = '';
            textbox.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
            textbox.value = String(arguments[0] || '');
            textbox.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
            if (submitMode === 'button') {
                if (!(searchButton instanceof HTMLElement)) { return false; }
                searchButton.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    button: 0,
                }));
            } else if (submitMode === 'enter') {
                textbox.dispatchEvent(new KeyboardEvent('keydown', {
                    bubbles: true,
                    cancelable: true,
                    key: 'Enter',
                    code: 'Enter',
                }));
            } else {
                return false;
            }
            return true;
        `, term, submitMode);
        return submitted === true;
    }, 30_000, 'Expected search textbox and button to be available on search page');

    const deadline = safePerformance.now() + timeoutMs;
    /** @type {Record<string, number>} */
    let lastCounts = Object.fromEntries(expectedDictionaryNames.map((name) => [name, 0]));
    while (safePerformance.now() < deadline) {
        // Selenium executeScript return value is untyped (`any`).

        const counts = await driver.executeScript(`
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
            // Fallback: if selectors differ, infer by visible dictionary labels in result text.
            const text = (dictionaryEntries.textContent || '');
            for (const name of arguments[0]) {
                if (countMap[name]) { continue; }
                const matchCount = text.length > 0 && name.length > 0 ? Math.max(0, text.split(name).length - 1) : 0;
                if (matchCount > 0) {
                    countMap[name] = matchCount;
                }
            }
            return countMap;
        `, expectedDictionaryNames);
        if (typeof counts === 'object' && counts !== null) {
            // Selenium executeScript return value is untyped (`any`).

            const countRecord = /** @type {Record<string, unknown>} */ (counts);
            const normalizedCounts = /** @type {Record<string, number>} */ ({});
            for (const [key, value] of Object.entries(countRecord)) {
                normalizedCounts[String(key)] = Number(value);
            }
            lastCounts = Object.fromEntries(expectedDictionaryNames.map((name) => [name, normalizedCounts[name] ?? 0]));
            if (expectedDictionaryNames.every((name) => (lastCounts[name] ?? 0) >= 1)) {
                return lastCounts;
            }
        }
        await driver.sleep(250);
    }

    return lastCounts;
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<Record<string, unknown>>}
 */
async function getSearchPageDiagnostics(driver) {
    // Selenium executeScript return value is untyped (`any`).

    const diagnostics = await driver.executeScript(`
        const noResults = document.querySelector('#no-results');
        const noDictionaries = document.querySelector('#no-dictionaries');
        const entries = document.querySelector('#dictionary-entries');
        const valueOrEmpty = (element) => (element instanceof HTMLElement ? (element.textContent || '').trim() : '');
        return {
            url: location.href,
            searchTextboxValue: (() => {
                const input = document.querySelector('#search-textbox');
                return input instanceof HTMLTextAreaElement ? input.value : null;
            })(),
            noResultsVisible: noResults instanceof HTMLElement ? !noResults.hidden : null,
            noDictionariesVisible: noDictionaries instanceof HTMLElement ? !noDictionaries.hidden : null,
            entriesTextPreview: valueOrEmpty(entries).slice(0, 300),
        };
    `);
    if (typeof diagnostics === 'object' && diagnostics !== null && !Array.isArray(diagnostics)) {
        return /** @type {Record<string, unknown>} */ (diagnostics);
    }
    return {error: `Unexpected diagnostics payload: ${String(diagnostics)}`};
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} pageUrl
 * @param {string} targetSelector
 * @param {string[]} expectedDictionaryNames
 * @returns {Promise<string>}
 */
async function hoverLookupOnPage(driver, pageUrl, targetSelector, expectedDictionaryNames) {
    await driver.get(pageUrl);

    const targetElement = /** @type {import('selenium-webdriver').WebElement} */ (await driver.wait(until.elementLocated(By.css(targetSelector)), 30_000));
    await driver.executeScript(`
        const target = arguments[0];
        if (target instanceof HTMLElement) {
            target.scrollIntoView({block: 'center', inline: 'center'});
        }
    `, targetElement);
    const moveOrigin = /** @type {import('selenium-webdriver').WebElement} */ (targetElement);
    /** @type {Array<string|null>} */
    const modifierCandidates = [Key.SHIFT, Key.ALT, Key.CONTROL, null];
    let popupVisible = false;
    for (const modifier of modifierCandidates) {
        if (modifier !== null) {
            await driver.actions({async: true}).keyDown(modifier).perform();
        }
        try {
            await driver.actions({async: true}).move({origin: moveOrigin, x: -12, y: -8}).perform();
            await driver.actions({async: true})
                .move({origin: moveOrigin, x: 2, y: 2})
                .move({origin: moveOrigin, x: 10, y: 2, duration: 220})
                .perform();

            const visibleWithModifier = await driver.wait(async () => {
                const frames = /** @type {import('selenium-webdriver').WebElement[]} */ (await driver.findElements(By.css('iframe.yomitan-popup')));
                for (const frame of frames) {
                    if (await frame.isDisplayed()) { return true; }
                }
                return false;
            }, 5_000).then(() => true, () => false);
            popupVisible = Boolean(visibleWithModifier);
            if (popupVisible) { break; }
        } finally {
            if (modifier !== null) {
                await driver.actions({async: true}).keyUp(modifier).perform();
            }
        }
    }
    if (!popupVisible) {
        fail('Expected yomitan popup iframe to appear after hover scan');
    }
    try {
        const frames = /** @type {import('selenium-webdriver').WebElement[]} */ (await driver.findElements(By.css('iframe.yomitan-popup')));
        let popupFrame = null;
        for (const frame of frames) {
            if (await frame.isDisplayed()) {
                popupFrame = frame;
                break;
            }
        }
        if (popupFrame === null) {
            fail('No visible yomitan popup iframe found');
        }
        await driver.switchTo().frame(popupFrame);
        await driver.wait(until.elementLocated(By.css('#dictionary-entries')), 30_000);
        const popupText = String(await (await driver.findElement(By.css('body'))).getText());
        await driver.switchTo().defaultContent();
        if (!expectedDictionaryNames.every((name) => popupText.includes(name))) {
            fail(`Expected hover popup to include dictionaries ${JSON.stringify(expectedDictionaryNames)}, saw: "${popupText.slice(0, 420)}"`);
        }
        return popupText;
    } finally {
        await driver.switchTo().defaultContent();
    }
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} term
 * @returns {Promise<Record<string, unknown>>}
 */
async function getBackendLookupDiagnostics(driver, term) {
    // Selenium executeAsyncScript return value is untyped (`any`).

    const diagnostics = await driver.executeAsyncScript(`
        const done = arguments[arguments.length - 1];
        const send = (action, params) => new Promise((resolve, reject) => {
            try {
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
            } catch (e) {
                reject(e);
            }
        });
        (async () => {
            const term = arguments[0];
            const dictionaryInfo = await send('getDictionaryInfo', undefined);
            const termsFind = await send('termsFind', {
                text: term,
                details: {primaryReading: ''},
                optionsContext: {},
            });
            const termDictionaryNamesSet = new Set();
            if (Array.isArray(termsFind?.dictionaryEntries)) {
                for (const entry of termsFind.dictionaryEntries) {
                    if (!(entry && typeof entry === 'object')) { continue; }
                    const dictionary = typeof entry.dictionary === 'string' ? entry.dictionary : null;
                    if (dictionary) {
                        termDictionaryNamesSet.add(dictionary);
                    }
                    if (Array.isArray(entry.definitions)) {
                        for (const definition of entry.definitions) {
                            if (!(definition && typeof definition === 'object')) { continue; }
                            const name = typeof definition.dictionary === 'string' ? definition.dictionary : null;
                            if (name) {
                                termDictionaryNamesSet.add(name);
                            }
                        }
                    }
                }
            }
            const optionsFull = await send('optionsGetFull', undefined);
            const profileDictionaries = Array.isArray(optionsFull?.profiles) ?
                optionsFull.profiles.map((profile) => ({
                    id: profile?.id ?? null,
                    dictionaries: Array.isArray(profile?.options?.dictionaries) ?
                        profile.options.dictionaries.map((dictionary) => String(dictionary?.name || '')) :
                        [],
                })) :
                null;
            done({
                dictionaryInfo,
                termResultCount: Array.isArray(termsFind?.dictionaryEntries) ? termsFind.dictionaryEntries.length : null,
                termDictionaryNames: [...termDictionaryNamesSet],
                profileDictionaries,
            });
        })().catch((e) => {
            done({error: String(e && e.message ? e.message : e)});
        });
    `, term);
    if (typeof diagnostics === 'object' && diagnostics !== null && !Array.isArray(diagnostics)) {
        return /** @type {Record<string, unknown>} */ (diagnostics);
    }
    return {error: `Unexpected diagnostics payload: ${String(diagnostics)}`};
}

/**
 * @param {Record<string, unknown>} diagnostics
 * @returns {Array<Record<string, unknown>>}
 */
function getDictionaryInfoEntries(diagnostics) {
    const raw = diagnostics.dictionaryInfo;
    if (!Array.isArray(raw)) { return []; }
    return raw.filter((item) => typeof item === 'object' && item !== null && !Array.isArray(item));
}

/**
 * @param {Array<Record<string, unknown>>} dictionaryInfoEntries
 * @returns {{titles: string[], importFailures: string[], zeroTermDictionaries: string[]}}
 */
function summarizeDictionaryInfoHealth(dictionaryInfoEntries) {
    /** @type {string[]} */
    const titles = [];
    /** @type {string[]} */
    const importFailures = [];
    /** @type {string[]} */
    const zeroTermDictionaries = [];
    for (const entry of dictionaryInfoEntries) {
        const title = typeof entry.title === 'string' && entry.title.length > 0 ? entry.title : '(unknown-title)';
        titles.push(title);
        if (entry.importSuccess !== true) {
            importFailures.push(title);
        }
        const counts = entry.counts;
        let termsTotal = 0;
        if (
            typeof counts === 'object' &&
            counts !== null &&
            !Array.isArray(counts) &&
            typeof Reflect.get(counts, 'terms') === 'object' &&
            Reflect.get(counts, 'terms') !== null &&
            !Array.isArray(Reflect.get(counts, 'terms')) &&
            Number.isFinite(Number(Reflect.get(Reflect.get(counts, 'terms'), 'total')))
        ) {
            termsTotal = Number(Reflect.get(Reflect.get(counts, 'terms'), 'total'));
        }
        if (termsTotal <= 0) {
            zeroTermDictionaries.push(title);
        }
    }
    return {titles, importFailures, zeroTermDictionaries};
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {Record<string, unknown>} recommendedDictionaries
 * @returns {Promise<void>}
 */
async function installRecommendedDictionariesMock(driver, recommendedDictionaries) {
    await driver.executeScript(`
        const data = structuredClone(arguments[0]);
        // Force per-dictionary imports for Firefox E2E to avoid session-final export failures
        // that can leave settings populated while term data is missing.
        globalThis.manabitanImportUseSession = false;

        const originalFetch = window.fetch.bind(window);
        globalThis.__manabitanMockSeenUrls = [];
        window.fetch = async (input, init) => {
            const url = String(typeof input === 'string' ? input : input?.url || '');
            if (Array.isArray(globalThis.__manabitanMockSeenUrls)) {
                globalThis.__manabitanMockSeenUrls.push(url);
                if (globalThis.__manabitanMockSeenUrls.length > 64) {
                    globalThis.__manabitanMockSeenUrls.splice(0, globalThis.__manabitanMockSeenUrls.length - 64);
                }
            }
            if (url.includes('recommended-dictionaries.json')) {
                return new Response(JSON.stringify(data), {
                    status: 200,
                    headers: {'Content-Type': 'application/json'},
                });
            }
            return originalFetch(input, init);
        };
    `, recommendedDictionaries);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} language
 * @returns {Promise<void>}
 */
async function setWelcomeLanguage(driver, language) {
    // Selenium executeScript return value is untyped (`any`).

    const result = await driver.executeScript(`
        const nextLanguage = String(arguments[0] || '');
        const select = document.querySelector('#language-select');
        if (!(select instanceof HTMLSelectElement)) {
            return {ok: false, error: 'Language selector not found'};
        }
        const hasOption = Array.from(select.options).some((option) => option.value === nextLanguage);
        if (!hasOption) {
            return {ok: false, error: \`Language option not found: \${nextLanguage}\`};
        }
        select.value = nextLanguage;
        select.dispatchEvent(new Event('change', {bubbles: true}));
        return {ok: true};
    `, language);
    if (!(result && typeof result === 'object' && !Array.isArray(result) && result.ok === true)) {
        throw new Error(`Unable to set welcome language: ${String(result?.error || 'unknown error')}`);
    }
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string>}
 */
async function getWelcomeAutoImportStatusText(driver) {
    // Selenium executeScript return value is untyped (`any`).

    const value = await driver.executeScript(`
        const node = document.querySelector('#welcome-language-auto-import-status');
        if (!(node instanceof HTMLElement) || node.hidden) { return ''; }
        return (node.textContent || '').trim();
    `);
    return typeof value === 'string' ? value : '';
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} expectedText
 * @param {number} timeoutMs
 * @returns {Promise<string>}
 */
async function waitForWelcomeAutoImportStatus(driver, expectedText, timeoutMs = 30000) {
    const deadline = safePerformance.now() + timeoutMs;
    let lastText = '';
    while (safePerformance.now() < deadline) {
        lastText = await getWelcomeAutoImportStatusText(driver);
        if (lastText.includes(expectedText)) {
            return lastText;
        }
        await driver.sleep(250);
    }
    fail(`Timed out waiting for welcome auto-import status containing "${expectedText}". lastText="${lastText}"`);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<boolean>}
 */
async function welcomeHasRecommendedDictionariesButton(driver) {
    // Selenium executeScript return value is untyped (`any`).

    const value = await driver.executeScript(`
        const node = document.querySelector('[data-modal-action="show,recommended-dictionaries"]');
        return node instanceof HTMLElement && !node.hidden;
    `);
    return value === true;
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<{ok: boolean, dictionaryCount: number|null, error: string|null}>}
 */
async function checkBackendApiAvailability(driver) {
    // Selenium executeAsyncScript return value is untyped (`any`).

    const result = await driver.executeAsyncScript(`
        const done = arguments[arguments.length - 1];
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
        (async () => {
            const dictionaryInfo = await send('getDictionaryInfo', undefined);
            done({
                ok: true,
                dictionaryCount: Array.isArray(dictionaryInfo) ? dictionaryInfo.length : null,
                error: null,
            });
        })().catch((e) => {
            done({
                ok: false,
                dictionaryCount: null,
                error: String(e && e.message ? e.message : e),
            });
        });
    `);
    if (!(typeof result === 'object' && result !== null && !Array.isArray(result))) {
        return {ok: false, dictionaryCount: null, error: `Unexpected backend preflight payload: ${String(result)}`};
    }
    // Selenium executeAsyncScript return value is untyped (`any`).

    const resultRecord = /** @type {Record<string, unknown>} */ (result);
    const dictionaryCountValue = resultRecord.dictionaryCount;
    const errorValue = resultRecord.error;
    return {
        ok: resultRecord.ok === true,
        dictionaryCount: Number.isFinite(Number(dictionaryCountValue)) ? Number(dictionaryCountValue) : null,
        error: typeof errorValue === 'string' ? errorValue : null,
    };
}

async function sendRuntimeMessage(driver, action, params = void 0) {
    return await driver.executeAsyncScript(`
        const [action, params, done] = arguments;
        chrome.runtime.sendMessage({action, params}, (response) => {
            const runtimeError = chrome.runtime.lastError;
            if (runtimeError) {
                done({ok: false, error: runtimeError.message || String(runtimeError)});
                return;
            }
            if (response && typeof response === 'object' && 'error' in response) {
                done({ok: false, error: JSON.stringify(response.error)});
                return;
            }
            done({
                ok: true,
                result: response && typeof response === 'object' ? response.result : response,
            });
        });
    `, action, params).then((payload) => {
        if (!(payload && typeof payload === 'object' && !Array.isArray(payload))) {
            throw new Error(`Unexpected runtime message payload: ${String(payload)}`);
        }
        if (payload.ok !== true) {
            throw new Error(String(payload.error || 'Unknown runtime message error'));
        }
        return payload.result;
    });
}

async function getOptionsFullRuntime(driver) {
    return await sendRuntimeMessage(driver, 'optionsGetFull', void 0);
}

async function getDictionaryInfoRuntime(driver) {
    return await sendRuntimeMessage(driver, 'getDictionaryInfo', void 0);
}

async function setAllSettingsRuntime(driver, value, source) {
    await sendRuntimeMessage(driver, 'setAllSettings', {value, source});
}

async function getStorageLocalRecord(driver, key) {
    return await driver.executeAsyncScript(`
        const [storageKey, done] = arguments;
        chrome.storage.local.get([storageKey], (result) => {
            const runtimeError = chrome.runtime.lastError;
            if (runtimeError) {
                done({ok: false, error: runtimeError.message || String(runtimeError)});
                return;
            }
            done({ok: true, result: result?.[storageKey] ?? null});
        });
    `, key).then((payload) => {
        if (!(payload && typeof payload === 'object' && !Array.isArray(payload))) {
            throw new Error(`Unexpected storage payload: ${String(payload)}`);
        }
        if (payload.ok !== true) {
            throw new Error(String(payload.error || 'Unknown storage error'));
        }
        return payload.result;
    });
}

async function setStorageLocalRecord(driver, key, value) {
    await driver.executeAsyncScript(`
        const [storageKey, storageValue, done] = arguments;
        chrome.storage.local.set({[storageKey]: storageValue}, () => {
            const runtimeError = chrome.runtime.lastError;
            if (runtimeError) {
                done({ok: false, error: runtimeError.message || String(runtimeError)});
                return;
            }
            done({ok: true});
        });
    `, key, value).then((payload) => {
        if (!(payload && typeof payload === 'object' && !Array.isArray(payload))) {
            throw new Error(`Unexpected storage-set payload: ${String(payload)}`);
        }
        if (payload.ok !== true) {
            throw new Error(String(payload.error || 'Unknown storage set error'));
        }
    });
}

async function waitForImportCompletionBasic(driver, dictionaryName, timeoutMs = 300000) {
    const deadline = safePerformance.now() + timeoutMs;
    let sawStepText = false;
    let emptySince = null;
    while (safePerformance.now() < deadline) {
        const errorText = await getDictionaryErrorText(driver);
        if (errorText.length > 0) {
            fail(`${dictionaryName} import reported error before completion: ${errorText}`);
        }
        const label = await getImportProgressLabel(driver);
        if (label.includes('Step ')) {
            sawStepText = true;
            emptySince = null;
        }
        if (sawStepText && label.length === 0) {
            emptySince ??= safePerformance.now();
            if ((safePerformance.now() - emptySince) >= 2000) {
                return;
            }
        }
        await driver.sleep(250);
    }
    fail(`Timed out waiting for ${dictionaryName} import completion`);
}

async function openDictionaryDetailsModal(driver, dictionaryName) {
    await driver.executeScript(`
        const targetName = arguments[0];
        const aliases = Array.from(document.querySelectorAll('#dictionary-list .dictionary-alias'));
        const targetIndex = aliases.findIndex((aliasNode) => {
            const text = (aliasNode.textContent || '').trim();
            return text.length > 0 && text !== 'All' && text !== 'Unassociated Data' && (
                text === targetName ||
                text.startsWith(\`\${targetName} \`) ||
                text.startsWith(\`\${targetName}.\`) ||
                text.includes(targetName)
            );
        });
        if (targetIndex < 0) {
            throw new Error(\`Unable to find installed dictionary row for "\${targetName}"\`);
        }
        const menuButtons = Array.from(document.querySelectorAll('#dictionary-list .dictionary-menu-button'));
        const menuButton = menuButtons[targetIndex];
        if (!(menuButton instanceof HTMLElement)) {
            throw new Error(\`Unable to find dictionary menu button for "\${targetName}"\`);
        }
        menuButton.click();
    `, dictionaryName);
    await driver.wait(async () => {
        const visible = await driver.executeScript(`
            const menus = Array.from(document.querySelectorAll('.popup-menu-container'));
            return menus.some((menuNode) => (
                menuNode instanceof HTMLElement &&
                !menuNode.hidden &&
                menuNode.querySelector('.popup-menu-item[data-menu-action="showDetails"]') !== null
            ));
        `);
        return visible === true;
    }, 30_000, 'Expected dictionary action menu to be visible');
    await driver.executeScript(`
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
    `);
    await driver.wait(until.elementLocated(By.css('#dictionary-details-modal')), 30_000);
    await driver.wait(async () => {
        const visible = await driver.executeScript(`
            const modal = document.querySelector('#dictionary-details-modal');
            const titleNode = modal?.querySelector('.dictionary-title');
            const text = (titleNode?.textContent || '').trim();
            return modal instanceof HTMLElement && !modal.hidden && (
                text === arguments[0] ||
                text.startsWith(\`\${arguments[0]} \`) ||
                text.startsWith(\`\${arguments[0]}.\`) ||
                text.includes(arguments[0])
            );
        `, dictionaryName);
        return visible === true;
    }, 30_000, `Expected dictionary details modal for ${dictionaryName}`);
}

async function closeDictionaryDetailsModal(driver) {
    await driver.executeScript(`
        const modal = document.querySelector('#dictionary-details-modal');
        if (!(modal instanceof HTMLElement) || modal.hidden) { return; }
        const closeButton = modal.querySelector('[data-modal-action="hide"]');
        if (!(closeButton instanceof HTMLElement)) {
            throw new Error('Dictionary details close button missing');
        }
        closeButton.click();
    `);
    await driver.wait(async () => {
        const hidden = await driver.executeScript(`
            const modal = document.querySelector('#dictionary-details-modal');
            return !(modal instanceof HTMLElement) || modal.hidden;
        `);
        return hidden === true;
    }, 30_000, 'Expected dictionary details modal to be hidden');
}

async function setDictionaryAutoUpdateEnabled(driver, dictionaryName, enabled) {
    await openDictionaryDetailsModal(driver, dictionaryName);
    const indexUrl = String(await driver.executeScript(`
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
        if (toggle.checked !== arguments[0]) {
            toggle.click();
        }
        return currentIndexUrl;
    `, enabled));
    const deadline = safePerformance.now() + 30_000;
    while (safePerformance.now() < deadline) {
        const optionsFull = await getOptionsFullRuntime(driver);
        const enabledIndexUrls = Array.isArray(optionsFull?.global?.dictionaryAutoUpdates) ? optionsFull.global.dictionaryAutoUpdates.map(String) : [];
        if (enabledIndexUrls.includes(indexUrl) === enabled) {
            break;
        }
        await driver.sleep(250);
    }
    await closeDictionaryDetailsModal(driver);
    return indexUrl;
}

async function configureAutoUpdateDictionaryProfile(driver, dictionaryName) {
    const optionsFull = structuredClone(await getOptionsFullRuntime(driver));
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
    await setAllSettingsRuntime(driver, optionsFull, 'firefox-e2e-auto-update-configure');
}

async function backdateAutoUpdateLastAttempt(driver, indexUrl) {
    const state = await getStorageLocalRecord(driver, autoUpdateStateStorageKey);
    const nextState = (typeof state === 'object' && state !== null && !Array.isArray(state)) ? structuredClone(state) : {};
    const entry = (typeof nextState[indexUrl] === 'object' && nextState[indexUrl] !== null && !Array.isArray(nextState[indexUrl])) ? nextState[indexUrl] : {};
    entry.lastAttemptAt = 0;
    nextState[indexUrl] = entry;
    await setStorageLocalRecord(driver, autoUpdateStateStorageKey, nextState);
    return entry;
}

async function triggerAutoUpdateAlarm(driver) {
    await driver.executeScript(`
        chrome.alarms.create(arguments[0], {when: Date.now() + 100});
    `, autoUpdateAlarmName);
}

async function waitForAutoUpdateCheck(driver, indexUrl, previousCheckAt, timeoutMs = 60000) {
    const deadline = safePerformance.now() + timeoutMs;
    while (safePerformance.now() < deadline) {
        const state = await getStorageLocalRecord(driver, autoUpdateStateStorageKey);
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
        await driver.sleep(250);
    }
    fail(`Timed out waiting for auto-update check completion for ${indexUrl}`);
}

async function waitForUpdatedDictionaryState(driver, expectedTitle, expectedRevision, expectedIndexUrl, timeoutMs = 120000) {
    const deadline = safePerformance.now() + timeoutMs;
    while (safePerformance.now() < deadline) {
        const dictionaryInfo = await getDictionaryInfoRuntime(driver);
        const titles = Array.isArray(dictionaryInfo) ? dictionaryInfo : [];
        const match = titles.find((dictionary) => (
            String(dictionary?.title || '') === expectedTitle &&
            String(dictionary?.revision || '') === expectedRevision &&
            String(dictionary?.indexUrl || '') === expectedIndexUrl
        ));
        if (match) {
            return dictionaryInfo;
        }
        await driver.sleep(500);
    }
    fail(`Timed out waiting for updated dictionary ${expectedTitle} revision ${expectedRevision}`);
}

function ensureAutoUpdateRequest(condition, message, requests) {
    if (!condition) {
        fail(`${message}; requests=${JSON.stringify(requests)}`);
    }
}

async function runAutoUpdateScenario(driver, extensionBaseUrl, localServer, report) {
    const fixture = await createAutoUpdateDictionaryFixture(localServer.baseUrl);
    localServer.setAutoUpdateFixture(fixture);
    try {
        await driver.get(`${extensionBaseUrl}/settings.html`);
        await driver.wait(until.elementLocated(By.css('#dictionary-import-file-input')), 30_000);

        const importStart = safePerformance.now();
        const fileInput = await driver.findElement(By.css('#dictionary-import-file-input'));
        await fileInput.sendKeys(fixture.importZipPath);
        await waitForImportCompletionBasic(driver, fixture.initialTitle, 240000);
        const importedDictionaryInfo = await getDictionaryInfoRuntime(driver);
        const importEnd = safePerformance.now();
        ensureAutoUpdateRequest(
            Array.isArray(importedDictionaryInfo) && importedDictionaryInfo.some((dictionary) => (
                String(dictionary?.title || '') === fixture.initialTitle &&
                String(dictionary?.revision || '') === '1'
            )),
            'Initial auto-update dictionary import did not complete with revision 1',
            importedDictionaryInfo,
        );
        await addReportPhase(
            report,
            driver,
            'Auto-update import v1 dictionary',
            `Imported local updatable dictionary archive ${fixture.importZipPath}`,
            importStart,
            importEnd,
        );

        const enableToggleStart = safePerformance.now();
        const enabledIndexUrl = await setDictionaryAutoUpdateEnabled(driver, fixture.initialTitle, true);
        await configureAutoUpdateDictionaryProfile(driver, fixture.initialTitle);
        const enableToggleEnd = safePerformance.now();
        ensureAutoUpdateRequest(
            enabledIndexUrl === fixture.oldIndexUrl,
            'Auto-update toggle did not bind to the expected initial index URL',
            enabledIndexUrl,
        );
        await addReportPhase(
            report,
            driver,
            'Enable hourly auto-updates',
            `Enabled automatic hourly updates for ${fixture.initialTitle} using index URL ${fixture.oldIndexUrl}`,
            enableToggleStart,
            enableToggleEnd,
        );

        localServer.clearAutoUpdateRequests();
        localServer.setAutoUpdateVersion('v1');
        localServer.setAutoUpdateConditional304(false);
        const initialState = await getStorageLocalRecord(driver, autoUpdateStateStorageKey);
        const initialCheckAt = Number(initialState?.[fixture.oldIndexUrl]?.lastSuccessfulCheckAt || 0);
        const firstPassStart = safePerformance.now();
        await triggerAutoUpdateAlarm(driver);
        const firstStateEntry = await waitForAutoUpdateCheck(driver, fixture.oldIndexUrl, initialCheckAt);
        const firstPassRequests = localServer.getAutoUpdateRequests();
        const firstPassEnd = safePerformance.now();
        ensureAutoUpdateRequest(firstPassRequests.length === 2, 'Initial hourly auto-update pass should issue exactly two requests', firstPassRequests);
        ensureAutoUpdateRequest(firstPassRequests[0]?.method === 'HEAD' && firstPassRequests[0]?.path === fixture.oldIndexPath, 'Initial hourly auto-update pass should begin with HEAD on the original index URL', firstPassRequests);
        ensureAutoUpdateRequest(firstPassRequests[1]?.method === 'GET' && firstPassRequests[1]?.path === fixture.oldIndexPath, 'Initial hourly auto-update pass should fetch the index JSON after HEAD', firstPassRequests);
        ensureAutoUpdateRequest(!firstPassRequests.some((requestInfo) => requestInfo.path === fixture.oldArchivePath || requestInfo.path === fixture.newArchivePath), 'Initial hourly auto-update pass should not download an archive when no update exists', firstPassRequests);
        await addReportPhase(
            report,
            driver,
            'Hourly auto-update pass (HEAD + GET no-op)',
            `Recorded requests for first due pass: ${JSON.stringify(firstPassRequests)} state=${JSON.stringify(firstStateEntry)}`,
            firstPassStart,
            firstPassEnd,
        );

        localServer.clearAutoUpdateRequests();
        localServer.setAutoUpdateVersion('v1');
        localServer.setAutoUpdateConditional304(true);
        await backdateAutoUpdateLastAttempt(driver, fixture.oldIndexUrl);
        const secondPassStart = safePerformance.now();
        await triggerAutoUpdateAlarm(driver);
        const secondStateEntry = await waitForAutoUpdateCheck(driver, fixture.oldIndexUrl, Number(firstStateEntry.lastSuccessfulCheckAt || 0));
        const secondPassRequests = localServer.getAutoUpdateRequests();
        const secondPassEnd = safePerformance.now();
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
            driver,
            'Hourly auto-update pass (HEAD 304)',
            `Recorded requests for conditional 304 pass: ${JSON.stringify(secondPassRequests)} state=${JSON.stringify(secondStateEntry)}`,
            secondPassStart,
            secondPassEnd,
        );

        localServer.clearAutoUpdateRequests();
        localServer.setAutoUpdateConditional304(false);
        localServer.setAutoUpdateVersion('v2');
        await backdateAutoUpdateLastAttempt(driver, fixture.oldIndexUrl);
        const updatePassStart = safePerformance.now();
        await triggerAutoUpdateAlarm(driver);
        await waitForUpdatedDictionaryState(driver, fixture.updatedTitle, '2', fixture.newIndexUrl, 120000);
        const updatedOptions = await getOptionsFullRuntime(driver);
        const updatedStorageState = await getStorageLocalRecord(driver, autoUpdateStateStorageKey);
        const updateRequests = localServer.getAutoUpdateRequests();
        const updatePassEnd = safePerformance.now();
        ensureAutoUpdateRequest(updateRequests.length === 3, 'Update pass should issue HEAD, GET, and archive download requests', updateRequests);
        ensureAutoUpdateRequest(updateRequests[0]?.method === 'HEAD' && updateRequests[0]?.path === fixture.oldIndexPath, 'Update pass should start with HEAD on the old index URL', updateRequests);
        ensureAutoUpdateRequest(updateRequests[1]?.method === 'GET' && updateRequests[1]?.path === fixture.oldIndexPath, 'Update pass should fetch the old index URL after HEAD', updateRequests);
        ensureAutoUpdateRequest(updateRequests[2]?.method === 'GET' && updateRequests[2]?.path === fixture.newArchivePath, 'Update pass should download the new archive after detecting a newer revision', updateRequests);
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
        ensureAutoUpdateRequest(
            !(fixture.oldIndexUrl in updatedStorageState) &&
            typeof updatedStorageState?.[fixture.newIndexUrl]?.lastSuccessfulUpdateAt === 'number',
            'Runtime auto-update state did not migrate to the new index URL after update',
            updatedStorageState,
        );
        await addReportPhase(
            report,
            driver,
            'Hourly auto-update pass (v1 -> v2 install)',
            `Recorded requests for update pass: ${JSON.stringify(updateRequests)}. Updated options snapshot: ${JSON.stringify({
                globalAutoUpdates,
                updatedDictionarySettings,
                general: profile0?.options?.general ?? null,
                ankiField: profile0?.options?.anki?.cardFormats?.[0]?.fields?.expression?.value ?? null,
            })}`,
            updatePassStart,
            updatePassEnd,
        );
    } finally {
        await fixture.cleanup();
    }
}

/**
 * @returns {Promise<void>}
 * @throws {Error}
 */
async function main() {
    const defaultFirefoxXpiPath = path.join(root, 'builds', 'manabitan-firefox-dev.xpi');
    const defaultFirefoxZipPath = path.join(root, 'builds', 'manabitan-firefox-dev.zip');
    let xpiPath = process.env.MANABITAN_FIREFOX_XPI ?? defaultFirefoxXpiPath;
    const reportPath = process.env.MANABITAN_FIREFOX_E2E_REPORT ?? path.join(root, 'builds', 'firefox-e2e-import-report.html');
    const reportJsonPath = reportPath.replace(/\.html$/i, '.json');
    const chromiumReportPath = path.join(root, 'builds', 'chromium-e2e-import-report.html');
    const edgeReportPath = path.join(root, 'builds', 'edge-e2e-import-report.html');
    const combinedReportPath = path.join(root, 'builds', 'extension-e2e-report.html');
    const report = createReport();
    /** @type {Error | undefined} */
    let runError;
    if (process.env.MANABITAN_FIREFOX_XPI) {
        try {
            await access(xpiPath);
        } catch (_) {
            fail(`Extension package not found at: ${xpiPath}`);
        }
    } else {
        /** @type {Array<{path: string, mtimeMs: number}>} */
        const candidates = [];
        for (const candidatePath of [defaultFirefoxZipPath, defaultFirefoxXpiPath]) {
            try {
                const stats = await stat(candidatePath);
                candidates.push({
                    path: candidatePath,
                    mtimeMs: Number(stats.mtimeMs || 0),
                });
            } catch (_) {
                // Ignore missing candidate.
            }
        }
        if (candidates.length === 0) {
            fail(`Extension package not found at: ${defaultFirefoxZipPath} or ${defaultFirefoxXpiPath}`);
        }
        candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
        xpiPath = candidates[0].path;
    }
    const firefoxOptions = new firefox.Options();
    const headlessEnv = (process.env.MANABITAN_FIREFOX_HEADLESS ?? '1').trim().toLowerCase();
    const headless = !(headlessEnv === '0' || headlessEnv === 'false' || headlessEnv === 'no');
    if (headless) {
        firefoxOptions.addArguments('-headless');
    }
    firefoxOptions.setPreference('xpinstall.signatures.required', false);
    firefoxOptions.setPreference('extensions.manifestV3.enabled', true);
    firefoxOptions.setPreference('extensions.backgroundServiceWorker.enabled', true);
    // Selenium Firefox profiles can start with stricter defaults that keep
    // SharedArrayBuffer unavailable even when extension pages set COOP/COEP.
    // Ensure test runtime exposes the required shared-memory primitives for OPFS.
    firefoxOptions.setPreference('javascript.options.shared_memory', true);
    firefoxOptions.setPreference('dom.postMessage.sharedArrayBuffer.withCOOP_COEP', true);
    firefoxOptions.setPreference('dom.postMessage.sharedArrayBuffer.bypassCOOP_COEP.insecure.enabled', true);
    const configuredFirefoxBinary = String(process.env.MANABITAN_FIREFOX_BINARY || '').trim();
    if (configuredFirefoxBinary.length > 0) {
        try {
            await access(configuredFirefoxBinary);
        } catch (_) {
            fail(`Configured Firefox binary not found: ${configuredFirefoxBinary}`);
        }
        firefoxOptions.setBinary(configuredFirefoxBinary);
    } else {
        const firefoxDeveloperEditionPath = '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox';
        try {
            await access(firefoxDeveloperEditionPath);
            firefoxOptions.setBinary(firefoxDeveloperEditionPath);
        } catch (_) {
            // Use default Firefox binary when Developer Edition is unavailable.
        }
    }
    const driver = /** @type {import('selenium-webdriver').ThenableWebDriver} */ (
        new Builder()
            .forBrowser(Browser.FIREFOX)
            .setFirefoxOptions(firefoxOptions)
            .build()
    );
    /** @type {null|{close: () => Promise<void>, baseUrl: string}} */
    let localServer = null;
    try {
        const cacheWarmupStart = safePerformance.now();
        const cachedDictionaries = await ensureRealDictionaryCache();
        localServer = await startE2ELocalServer({
            jitendexPath: cachedDictionaries.jitendexPath,
            jmdictPath: cachedDictionaries.jmdictPath,
        });
        const cacheWarmupEnd = safePerformance.now();

        const temporaryAddonInstall = parseBooleanEnv(process.env.MANABITAN_FIREFOX_TEMPORARY_ADDON, true);
        const installedAddonId = await driver.installAddon(xpiPath, temporaryAddonInstall);
        const firefoxPid = await getFirefoxProcessId(driver);

        const baseUrlStart = safePerformance.now();
        const extensionBaseUrl = await waitForExtensionBaseUrl(driver, String(installedAddonId || ''));
        const baseUrlEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Install extension and discover base URL', 'Extension installed and moz-extension base URL discovered', baseUrlStart, baseUrlEnd);
        const firefoxPidStart = safePerformance.now();
        const firefoxPidEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Firefox process detection', `Detected Firefox browser PID for profiling: ${firefoxPid !== null ? String(firefoxPid) : 'unavailable'}`, firefoxPidStart, firefoxPidEnd);

        const settingsOpenStart = safePerformance.now();
        await driver.get(`${extensionBaseUrl}/settings.html`);
        await driver.wait(until.elementLocated(By.css('#dictionary-import-file-input')), 30_000);
        await ensurePageProfiler(driver);
        const settingsOpenEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Open settings page', 'Settings loaded and dictionary import controls visible', settingsOpenStart, settingsOpenEnd);
        // Selenium launches Firefox with a fresh profile for this run, so there is
        // no prior dictionary DB state to purge here.
        // Selenium executeScript return value is untyped (`any`).

        const runtimeDiagnostics = await driver.executeAsyncScript(`
            const done = arguments[0];
            (async () => {
                const manifest = chrome.runtime.getManifest();
                let storageDirectoryStatus = 'unknown';
                try {
                    if (navigator.storage && typeof navigator.storage.getDirectory === 'function') {
                        await navigator.storage.getDirectory();
                        storageDirectoryStatus = 'ok';
                    } else {
                        storageDirectoryStatus = 'missing-getDirectory';
                    }
                } catch (e) {
                    storageDirectoryStatus = String(e && e.message ? e.message : e);
                }
                done({
                    crossOriginIsolated: globalThis.crossOriginIsolated === true,
                    hasSharedArrayBuffer: typeof SharedArrayBuffer === 'function',
                    hasAtomics: typeof Atomics === 'object' && Atomics !== null,
                    storageDirectoryStatus,
                    manifestCoop: manifest.cross_origin_opener_policy || null,
                    manifestCoep: manifest.cross_origin_embedder_policy || null,
                });
            })();
        `);
        report.runtimeDiagnostics = asRecordOrNull(runtimeDiagnostics);
        const diagnosticsStart = safePerformance.now();
        const diagnosticsEnd = safePerformance.now();
        await addReportPhase(
            report,
            driver,
            'Runtime diagnostics',
            `OPFS/isolation diagnostics: ${JSON.stringify(runtimeDiagnostics)}`,
            diagnosticsStart,
            diagnosticsEnd,
        );
        const backendPreflightStart = safePerformance.now();
        const backendPreflight = await checkBackendApiAvailability(driver);
        const backendPreflightEnd = safePerformance.now();
        await addReportPhase(
            report,
            driver,
            'Backend API preflight',
            backendPreflight.ok ?
                `Runtime message API reachable; dictionaryInfo count=${String(backendPreflight.dictionaryCount)}` :
                `Runtime message API failed: ${String(backendPreflight.error || 'unknown error')}`,
            backendPreflightStart,
            backendPreflightEnd,
        );
        if (!backendPreflight.ok) {
            fail(`Backend preflight failed: ${String(backendPreflight.error || 'unknown error')}`);
        }

        await addReportPhase(
            report,
            driver,
            'Warmup real dictionary cache',
            `Resolved and cached Jitendex/JMdict archives from recommended feed, then served locally at ${localServer.baseUrl}`,
            cacheWarmupStart,
            cacheWarmupEnd,
        );

        const mockRecommendedDictionaries = {
            ja: {
                terms: [
                    {
                        name: 'Jitendex',
                        description: 'Real Jitendex from recommended dictionaries',
                        homepage: '',
                        downloadUrl: `${localServer.baseUrl}/dictionaries/jitendex.zip`,
                    },
                    {
                        name: 'JMdict',
                        description: 'Real JMdict from recommended dictionaries',
                        homepage: '',
                        downloadUrl: `${localServer.baseUrl}/dictionaries/jmdict.zip`,
                    },
                ],
                kanji: [],
                frequency: [],
                grammar: [],
                pronunciation: [],
            },
        };
        const mockInstallStart = safePerformance.now();
        await installRecommendedDictionariesMock(driver, mockRecommendedDictionaries);
        const mockInstallEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Install mocked recommended dictionary feed', 'recommended-dictionaries.json overridden to use local server URLs for real Jitendex and JMdict archives', mockInstallStart, mockInstallEnd);

        const jitendexClickStart = safePerformance.now();
        const jitendexImportUrl = await installRecommendedDictionary(driver, 'Jitendex');
        const jitendexClickEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Click Jitendex download', `Triggered recommended Jitendex import via URL: ${jitendexImportUrl}`, jitendexClickStart, jitendexClickEnd);
        const jitendexProfileStart = safePerformance.now();
        await beginPageProfilePhase(driver);
        const jitendexSampler = startFirefoxResourceSampler(firefoxPid);
        await waitForImportWithPhaseScreenshots(driver, report, 'Jitendex', '1 installed, 1 enabled', 300_000);
        const jitendexResourceSummary = await jitendexSampler.stop();
        const jitendexPageSummary = await endPageProfilePhase(driver);
        const jitendexProfileEnd = safePerformance.now();
        const jitendexImportDebug = await getLastImportDebug(driver);
        const jitendexUsesFallbackStorage = jitendexImportDebug?.usesFallbackStorage === true;
        if (
            jitendexImportDebug !== null &&
            (
                Number(jitendexImportDebug.errorCount || 0) > 0 ||
                jitendexUsesFallbackStorage
            )
        ) {
            fail(`Jitendex import debug indicates OPFS was not used: ${JSON.stringify(jitendexImportDebug)}`);
        }
        await addReportPhase(
            report,
            driver,
            'Jitendex import resource profile',
            `${formatResourceSummary(jitendexResourceSummary)} longTasks={count:${String(jitendexPageSummary.longTaskCount)},totalMs:${jitendexPageSummary.longTaskTotalMs.toFixed(1)},peakMs:${jitendexPageSummary.longTaskPeakMs.toFixed(1)}} topMeasures=${JSON.stringify(jitendexPageSummary.topMeasures)} topLongTasks=${JSON.stringify(jitendexPageSummary.topLongTasks)} importDebug=${JSON.stringify(jitendexImportDebug)}`,
            jitendexProfileStart,
            jitendexProfileEnd,
        );
        const jitendexSettleStart = safePerformance.now();
        await driver.sleep(2_000);
        const jitendexSettleEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Jitendex: settle after progress clear', 'Waited 2000ms after progress text cleared before starting next import', jitendexSettleStart, jitendexSettleEnd);

        const jmdictClickStart = safePerformance.now();
        const jmdictImportUrl = await installRecommendedDictionary(driver, 'JMdict');
        const jmdictClickEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Click JMdict download', `Triggered recommended JMdict import via URL: ${jmdictImportUrl}`, jmdictClickStart, jmdictClickEnd);
        const jmdictProfileStart = safePerformance.now();
        await beginPageProfilePhase(driver);
        const jmdictSampler = startFirefoxResourceSampler(firefoxPid);
        await waitForImportWithPhaseScreenshots(driver, report, 'JMdict', '2 installed, 2 enabled', 300_000);
        const jmdictResourceSummary = await jmdictSampler.stop();
        const jmdictPageSummary = await endPageProfilePhase(driver);
        const jmdictProfileEnd = safePerformance.now();
        const jmdictImportDebug = await getLastImportDebug(driver);
        const jmdictUsesFallbackStorage = jmdictImportDebug?.usesFallbackStorage === true;
        if (
            jmdictImportDebug !== null &&
            (
                Number(jmdictImportDebug.errorCount || 0) > 0 ||
                jmdictUsesFallbackStorage
            )
        ) {
            fail(`JMdict import debug indicates OPFS was not used: ${JSON.stringify(jmdictImportDebug)}`);
        }
        await addReportPhase(
            report,
            driver,
            'JMdict import resource profile',
            `${formatResourceSummary(jmdictResourceSummary)} longTasks={count:${String(jmdictPageSummary.longTaskCount)},totalMs:${jmdictPageSummary.longTaskTotalMs.toFixed(1)},peakMs:${jmdictPageSummary.longTaskPeakMs.toFixed(1)}} topMeasures=${JSON.stringify(jmdictPageSummary.topMeasures)} topLongTasks=${JSON.stringify(jmdictPageSummary.topLongTasks)} importDebug=${JSON.stringify(jmdictImportDebug)}`,
            jmdictProfileStart,
            jmdictProfileEnd,
        );
        const jmdictSettleStart = safePerformance.now();
        await driver.sleep(2_000);
        const jmdictSettleEnd = safePerformance.now();
        await addReportPhase(report, driver, 'JMdict: settle after progress clear', 'Waited 2000ms after progress text cleared before final verification', jmdictSettleStart, jmdictSettleEnd);
        const postImportDiagnosticsStart = safePerformance.now();
        const postImportDiagnostics = await getBackendLookupDiagnostics(driver, '打');
        const postImportDiagnosticsEnd = safePerformance.now();
        await addReportPhase(
            report,
            driver,
            'Post-import backend diagnostics',
            `After both imports, backend diagnostics: ${JSON.stringify(postImportDiagnostics)}`,
            postImportDiagnosticsStart,
            postImportDiagnosticsEnd,
        );
        const dictionaryInfoEntries = getDictionaryInfoEntries(postImportDiagnostics);
        const dictionaryInfoHealth = summarizeDictionaryInfoHealth(dictionaryInfoEntries);
        const termResultCount = Number(postImportDiagnostics.termResultCount || 0);
        if (dictionaryInfoEntries.length < 2) {
            const dictionaryErrorText = await getDictionaryErrorText(driver);
            fail(`Expected backend dictionaryInfo for two imports, got ${dictionaryInfoEntries.length}. dictionary-error="${dictionaryErrorText}" diagnostics=${JSON.stringify(postImportDiagnostics)}`);
        }
        if (dictionaryInfoHealth.importFailures.length > 0 || dictionaryInfoHealth.zeroTermDictionaries.length > 0 || termResultCount < 1) {
            const dictionaryErrorText = await getDictionaryErrorText(driver);
            fail(
                'Import completed in UI but backend data is not queryable. ' +
                `importFailures=${JSON.stringify(dictionaryInfoHealth.importFailures)} ` +
                `zeroTermDictionaries=${JSON.stringify(dictionaryInfoHealth.zeroTermDictionaries)} ` +
                `termResultCount=${String(termResultCount)} dictionary-error="${dictionaryErrorText}" ` +
                `jitendexUsesFallbackStorage=${String(jitendexUsesFallbackStorage)} ` +
                `jmdictUsesFallbackStorage=${String(jmdictUsesFallbackStorage)} ` +
                `diagnostics=${JSON.stringify(postImportDiagnostics)}`,
            );
        }
        const profileHasBothDictionaries = (() => {
            const profileDictionaries = /** @type {unknown} */ (postImportDiagnostics.profileDictionaries);
            if (!Array.isArray(profileDictionaries)) { return false; }
            /** @type {Set<string>} */
            const names = new Set();
            for (const profile of profileDictionaries) {
                if (!(profile && typeof profile === 'object')) { continue; }
                const dictionaries = /** @type {unknown} */ (profile.dictionaries);
                if (!Array.isArray(dictionaries)) { continue; }
                for (const name of dictionaries) {
                    if (typeof name === 'string' && name.length > 0) {
                        names.add(name);
                    }
                }
            }
            return names.has('Jitendex') && names.has('JMdict');
        })();

        const verifyStart = safePerformance.now();
        await closeModalIfOpen(driver, '#recommended-dictionaries-modal');
        const dictionariesModalTrigger = await openInstalledDictionariesModal(driver);
        const verifyDeadline = safePerformance.now() + 60_000;
        let lastModalText = '';
        while (safePerformance.now() < verifyDeadline) {
            // Selenium's executeScript return value is untyped (`any`).

            const modalText = await driver.executeScript(`
                const dictionariesModal = document.querySelector('#dictionaries-modal');
                const recommendedModal = document.querySelector('#recommended-dictionaries-modal');
                if (!(dictionariesModal instanceof HTMLElement) || dictionariesModal.hidden) { return ''; }
                if (recommendedModal instanceof HTMLElement && !recommendedModal.hidden) { return ''; }
                const dictionaryList = dictionariesModal.querySelector('#dictionary-list');
                if (!(dictionaryList instanceof HTMLElement)) { return ''; }
                return (dictionaryList.textContent || '').trim();
            `);
            if (typeof modalText === 'string') {
                lastModalText = modalText;
                if (lastModalText.includes('Jitendex') && lastModalText.includes('JMdict')) {
                    break;
                }
            }
            await driver.sleep(250);
        }
        if (!(lastModalText.includes('Jitendex') && lastModalText.includes('JMdict'))) {
            const dictionaryErrorText = await getDictionaryErrorText(driver);
            fail(
                'Expected installed dictionary modal text to contain Jitendex and JMdict; ' +
                `saw "${lastModalText.slice(0, 240)}"; dictionary-error="${dictionaryErrorText}" ` +
                `profileHasBothDictionaries=${String(profileHasBothDictionaries)}`,
            );
        }
        const verifyEnd = safePerformance.now();
        await addReportPhase(
            report,
            driver,
            'Verify installed dictionaries list',
            (
                `Opened dictionaries modal via ${dictionariesModalTrigger} and confirmed dictionary list text includes Jitendex + JMdict`
            ),
            verifyStart,
            verifyEnd,
        );

        const searchOpenStart = safePerformance.now();
        await closeModalIfOpen(driver, '#dictionaries-modal');
        await openSearchPageViaActionPopup(driver, extensionBaseUrl);
        await ensurePageProfiler(driver);
        const searchOpenEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Open search page from action popup', 'Closed dictionaries modal, opened action popup, and clicked magnifying-glass search button', searchOpenStart, searchOpenEnd);
        const backendDiagnosticsStart = safePerformance.now();
        const backendDiagnostics = await getBackendLookupDiagnostics(driver, '打');
        const backendDiagnosticsEnd = safePerformance.now();
        await addReportPhase(
            report,
            driver,
            'Backend lookup diagnostics',
            `Database/termsFind diagnostics before UI search: ${JSON.stringify(backendDiagnostics)}`,
            backendDiagnosticsStart,
            backendDiagnosticsEnd,
        );

        const searchVerifyStart = safePerformance.now();
        const searchTerm = '暗記';
        let dictionaryHitCounts = await searchTermAndGetDictionaryHitCounts(driver, searchTerm, ['Jitendex', 'JMdict'], 20_000);
        if ((dictionaryHitCounts.Jitendex ?? 0) < 1 || (dictionaryHitCounts.JMdict ?? 0) < 1) {
            // Retry once after a hard refresh: Firefox extension search page can be flaky in CI.
            await driver.navigate().refresh();
            await driver.wait(until.elementLocated(By.css('#search-textbox')), 30_000);
            dictionaryHitCounts = await searchTermAndGetDictionaryHitCounts(driver, searchTerm, ['Jitendex', 'JMdict'], 20_000);
        }
        if ((dictionaryHitCounts.Jitendex ?? 0) < 1 || (dictionaryHitCounts.JMdict ?? 0) < 1) {
            const searchDiagnostics = await getSearchPageDiagnostics(driver);
            const searchVerifyEnd = safePerformance.now();
            await addReportPhase(
                report,
                driver,
                'Verify search results include both dictionaries (failed)',
                `UI search returned incomplete results. Counts=${JSON.stringify(dictionaryHitCounts)} backend=${JSON.stringify(backendDiagnostics)} diagnostics=${JSON.stringify(searchDiagnostics)}`,
                searchVerifyStart,
                searchVerifyEnd,
            );
            fail(`Expected search results for ${searchTerm} to include both Jitendex and JMdict; saw counts ${JSON.stringify(dictionaryHitCounts)} diagnostics=${JSON.stringify(searchDiagnostics)} backend=${JSON.stringify(backendDiagnostics)}`);
        } else {
            const searchVerifyEnd = safePerformance.now();
            await addReportPhase(report, driver, 'Verify search results include both dictionaries', `Searched ${searchTerm} and observed dictionary hit counts: ${JSON.stringify(dictionaryHitCounts)}`, searchVerifyStart, searchVerifyEnd);
        }

        const lookupWords = ['暗記', '名前', '日本', '学生', '食べる', '見る', '言う', '行く', '水', '猫'];
        const lookupChars = lookupWords.map((word) => String([...word][0] || '').trim()).filter((value) => value.length > 0);
        /** @type {Array<Record<string, unknown>>} */
        const lookupProfiles = [];
        for (const lookupChar of lookupChars) {
            const lookupStart = safePerformance.now();
            await beginPageProfilePhase(driver);
            const sampler = startFirefoxResourceSampler(firefoxPid);
            const lookupCounts = await searchTermAndGetDictionaryHitCounts(driver, lookupChar, ['Jitendex', 'JMdict'], 4_000);
            const lookupDiagnostics = await getSearchPageDiagnostics(driver);
            const resourceSummary = await sampler.stop();
            const pageSummary = await endPageProfilePhase(driver);
            const lookupEnd = safePerformance.now();
            lookupProfiles.push({
                lookupChar,
                durationMs: Math.max(0, lookupEnd - lookupStart),
                counts: lookupCounts,
                resourceSummary,
                pageSummary,
            });
            await addReportPhase(
                report,
                driver,
                `Profile lookup: ${lookupChar}`,
                `lookupChar=${lookupChar} counts=${JSON.stringify(lookupCounts)} ${formatResourceSummary(resourceSummary)} longTasks={count:${String(pageSummary.longTaskCount)},totalMs:${pageSummary.longTaskTotalMs.toFixed(1)},peakMs:${pageSummary.longTaskPeakMs.toFixed(1)}} topMeasures=${JSON.stringify(pageSummary.topMeasures)} topLongTasks=${JSON.stringify(pageSummary.topLongTasks)} diagnostics=${JSON.stringify(lookupDiagnostics)}`,
                lookupStart,
                lookupEnd,
            );
        }
        const hottestCpuLookup = lookupProfiles
            .filter((profile) => {
                const resourceSummary = /** @type {Record<string, unknown>} */ (profile.resourceSummary || {});
                return Number.isFinite(Number(resourceSummary.peakCpuPercent));
            })
            .sort((a, b) => Number((/** @type {Record<string, unknown>} */ (b.resourceSummary || {})).peakCpuPercent || 0) - Number((/** @type {Record<string, unknown>} */ (a.resourceSummary || {})).peakCpuPercent || 0))[0] || null;
        const hottestLongTaskLookup = lookupProfiles
            .sort((a, b) => Number((/** @type {Record<string, unknown>} */ (b.pageSummary || {})).longTaskTotalMs || 0) - Number((/** @type {Record<string, unknown>} */ (a.pageSummary || {})).longTaskTotalMs || 0))[0] || null;
        const drillDownStart = safePerformance.now();
        const drillDownEnd = safePerformance.now();
        await addReportPhase(
            report,
            driver,
            'CPU/memory drilldown summary',
            `lookups=${JSON.stringify(lookupChars)} hottestCpuLookup=${JSON.stringify(hottestCpuLookup)} hottestLongTaskLookup=${JSON.stringify(hottestLongTaskLookup)}`,
            drillDownStart,
            drillDownEnd,
        );

        const hoverLookupStart = safePerformance.now();
        const hoverTargets = ['#target-word', '#target-cat', '#target-name', '#target-kotoba', '#target-born', '#target-mitou'];
        /** @type {Array<{iteration: number, selector: string, popupTextPreview: string}>} */
        const hoverIterationSummaries = [];
        try {
            for (let i = 0; i < 12; ++i) {
                const selector = hoverTargets[i % hoverTargets.length];
                const popupText = await hoverLookupOnPage(
                    driver,
                    `${localServer.baseUrl}/wagahai-neko.html`,
                    selector,
                    ['Jitendex', 'JMdict'],
                );
                hoverIterationSummaries.push({
                    iteration: i + 1,
                    selector,
                    popupTextPreview: popupText.slice(0, 140),
                });
            }
            const hoverLookupEnd = safePerformance.now();
            await addReportPhase(
                report,
                driver,
                'Verify repeated hover lookup on Wagahai page',
                `Ran 12 hover-scan iterations across selectors ${JSON.stringify(hoverTargets)} and confirmed popup includes both dictionaries each time. iterations=${JSON.stringify(hoverIterationSummaries)}`,
                hoverLookupStart,
                hoverLookupEnd,
            );
        } catch (hoverError) {
            const hoverDiagnostics = await getBackendLookupDiagnostics(driver, '暗記');
            const hoverLookupEnd = safePerformance.now();
            await addReportPhase(
                report,
                driver,
                'Verify repeated hover lookup on Wagahai page (failed)',
                `Hover popup verification failed during repeated run. backend=${JSON.stringify(hoverDiagnostics)} error=${errorMessage(hoverError)} completedIterations=${JSON.stringify(hoverIterationSummaries)}`,
                hoverLookupStart,
                hoverLookupEnd,
            );
            fail(`Expected repeated hover popup lookups to include both dictionaries. backend=${JSON.stringify(hoverDiagnostics)} error=${errorMessage(hoverError)} completedIterations=${JSON.stringify(hoverIterationSummaries)}`);
        }

        const postHoverSearchStart = safePerformance.now();
        const postHoverSearchTerm = '暗記';
        let postHoverHitCounts = /** @type {Record<string, number>} */ ({});
        let postHoverSearchError = '';
        try {
            await driver.get(`${extensionBaseUrl}/search.html?query=${encodeURIComponent(postHoverSearchTerm)}&type=terms&wildcards=off`);
            await driver.wait(until.elementLocated(By.css('#search-textbox')), 30_000);
            postHoverHitCounts = await searchTermAndGetDictionaryHitCounts(driver, postHoverSearchTerm, ['Jitendex', 'JMdict'], 20_000, 'button');
            if ((postHoverHitCounts.Jitendex ?? 0) < 1 || (postHoverHitCounts.JMdict ?? 0) < 1) {
                const searchDiagnostics = await getSearchPageDiagnostics(driver);
                throw new Error(`Counts=${JSON.stringify(postHoverHitCounts)} diagnostics=${JSON.stringify(searchDiagnostics)}`);
            }
        } catch (postHoverError) {
            postHoverSearchError = errorMessage(postHoverError);
            fail(`Expected search button flow to include both dictionaries after hover stress. ${postHoverSearchError}`);
        } finally {
            const postHoverSearchEnd = safePerformance.now();
            await addReportPhase(
                report,
                driver,
                'Verify search remains responsive after hover stress',
                postHoverSearchError.length > 0 ?
                    `Search button verification failed after hover stress: ${postHoverSearchError}` :
                    `Search button verification after hover stress succeeded for ${postHoverSearchTerm}. counts=${JSON.stringify(postHoverHitCounts)}`,
                postHoverSearchStart,
                postHoverSearchEnd,
            );
        }

        const autoUpdateStart = safePerformance.now();
        let autoUpdateError = '';
        try {
            if (localServer === null) {
                throw new Error('Local E2E server is unavailable for auto-update verification');
            }
            await runAutoUpdateScenario(driver, extensionBaseUrl, localServer, report);
        } catch (autoUpdateFailure) {
            autoUpdateError = errorMessage(autoUpdateFailure);
            fail(`Expected hourly auto-update verification to pass. ${autoUpdateError}`);
        } finally {
            const autoUpdateEnd = safePerformance.now();
            await addReportPhase(
                report,
                driver,
                'Auto-update end-to-end verification',
                autoUpdateError.length > 0 ?
                    `Auto-update verification failed: ${autoUpdateError}` :
                    'Verified hourly auto-update end to end, including HEAD/GET no-op checks, validator-backed 304 handling, and automatic v1 -> v2 replacement with preserved settings.',
                autoUpdateStart,
                autoUpdateEnd,
            );
        }

        const welcomeAutoImportStart = safePerformance.now();
        let welcomeAutoImportError = '';
        /** @type {{dictionaryCountBefore: number, dictionaryCountAfter: number, noMatchStatus: string, alreadyInstalledStatus: string}|null} */
        let welcomeAutoImportDetails = null;
        try {
            if (localServer === null) {
                throw new Error('Local E2E server is unavailable for welcome auto-import verification');
            }
            const dictionaryInfoBefore = await getDictionaryInfoRuntime(driver);
            const dictionaryCountBefore = Array.isArray(dictionaryInfoBefore) ? dictionaryInfoBefore.length : 0;

            await driver.get(`${extensionBaseUrl}/welcome.html`);
            await driver.wait(until.elementLocated(By.css('#language-select')), 30_000);

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
            await installRecommendedDictionariesMock(driver, mockRecommendedDictionaries);
            if (await welcomeHasRecommendedDictionariesButton(driver)) {
                throw new Error('Welcome page still exposes a manual recommended-dictionaries button');
            }

            await setWelcomeLanguage(driver, 'en');
            const noMatchStatus = await waitForWelcomeAutoImportStatus(driver, 'No recommended dictionaries are currently available for "en".', 30_000);

            await setWelcomeLanguage(driver, 'ja');
            const alreadyInstalledStatus = await waitForWelcomeAutoImportStatus(driver, 'All recommended dictionaries for "ja" are already installed.', 30_000);

            const dictionaryInfoAfter = await getDictionaryInfoRuntime(driver);
            const dictionaryCountAfter = Array.isArray(dictionaryInfoAfter) ? dictionaryInfoAfter.length : 0;
            if (dictionaryCountAfter !== dictionaryCountBefore) {
                throw new Error(`Welcome status-only checks unexpectedly changed dictionary count. before=${String(dictionaryCountBefore)} after=${String(dictionaryCountAfter)}`);
            }
            welcomeAutoImportDetails = {
                dictionaryCountBefore,
                dictionaryCountAfter,
                noMatchStatus,
                alreadyInstalledStatus,
            };
        } catch (welcomeAutoImportFailure) {
            welcomeAutoImportError = errorMessage(welcomeAutoImportFailure);
            fail(`Expected welcome auto-import behavior verification to pass. ${welcomeAutoImportError}`);
        } finally {
            const welcomeAutoImportEnd = safePerformance.now();
            await addReportPhase(
                report,
                driver,
                'Welcome auto-import behavior verification',
                welcomeAutoImportError.length > 0 ?
                    `Welcome auto-import verification failed: ${welcomeAutoImportError}` :
                    `Verified welcome flow has no manual recommended button and shows no-match/already-installed auto-import messages. details=${JSON.stringify(welcomeAutoImportDetails)}`,
                welcomeAutoImportStart,
                welcomeAutoImportEnd,
            );
        }

        report.status = 'success';
        console.log('[firefox-e2e] PASS: Recommended dictionary imports installed Jitendex and JMdict.');
    } catch (e) {
        const failureReason = errorMessage(e);
        const skipReason = strictUnsupportedRuntime ? '' : getUnsupportedRuntimeSkipReason(failureReason);
        if (skipReason.length > 0) {
            report.status = 'success-with-skips';
            report.failureReason = '';
            report.skippedVerification = true;
            report.skipReason = skipReason;
            console.warn(`[firefox-e2e] warning: ${skipReason}`);
        } else {
            report.status = 'failure';
            report.failureReason = failureReason;
            runError = new Error(`[firefox-e2e] ${failureReason}`);
        }
    } finally {
        try {
            await mkdir(path.dirname(reportPath), {recursive: true});
            const reportHtml = renderReportHtml(report);
            await writeFile(reportPath, reportHtml);
            await writeFile(reportJsonPath, JSON.stringify(createReportJsonSummary(report), null, 2), 'utf8');
            console.log(`[firefox-e2e] Wrote report: ${reportPath}`);
            console.log(`[firefox-e2e] Wrote report json: ${reportJsonPath}`);
            await writeCombinedTabbedReport({
                chromiumReportPath,
                edgeReportPath,
                firefoxReportPath: reportPath,
                outputPath: combinedReportPath,
            });
            console.log(`[firefox-e2e] Wrote combined report: ${combinedReportPath}`);
        } catch (reportError) {
            console.error(`[firefox-e2e] Failed to write report: ${errorMessage(reportError)}`);
        }

        if (localServer !== null) {
            try {
                await localServer.close();
            } catch (serverCloseError) {
                console.error(`[firefox-e2e] Failed to close local server: ${errorMessage(serverCloseError)}`);
            }
        }
        await driver.quit();
    }

    if (runError) {
        throw runError;
    }
}

await main();
