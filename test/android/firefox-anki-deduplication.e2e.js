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

import {execFile, spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {access, mkdir, readdir, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {safePerformance} from '../../ext/js/core/safe-performance.js';
import {runAnkiDedupeContractMatrix} from '../e2e/anki-dedupe-matrix.js';
import {createAnkiMockState} from '../e2e/anki-mock-state.js';
import {extractFirefoxAndroidApkUrls, extractFirefoxAndroidStableReleaseVersions, selectPreferredFirefoxAndroidApkUrl} from './firefox-android-release-utils.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..', '..');
const execFileAsync = promisify(execFile);
const logTag = '[firefox-android-anki-dedupe-e2e]';

/**
 * @param {unknown} value
 * @returns {string}
 */
function errorMessage(value) {
    return value instanceof Error ? value.message : String(value);
}

/**
 * @param {string} message
 */
function fail(message) {
    throw new Error(`${logTag} ${message}`);
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
        .replaceAll('\'', '&#39;');
}

/**
 * @returns {{
 *   startedAtIso: string,
 *   finishedAtIso: string,
 *   status: 'running'|'success'|'failure',
 *   failureReason: string,
 *   adbDevice: string,
 *   firefoxPackage: string,
 *   sourceDir: string,
 *   firefoxApkUrl: string,
 *   phases: Array<{name: string, details: string, durationMs: number}>,
 *   contract: {ok: boolean, results: Array<Record<string, unknown>>}|null,
 * }}
 */
function createReport() {
    return {
        startedAtIso: new Date().toISOString(),
        finishedAtIso: '',
        status: 'running',
        failureReason: '',
        adbDevice: '',
        firefoxPackage: '',
        sourceDir: '',
        firefoxApkUrl: '',
        phases: [],
        contract: null,
    };
}

/**
 * @param {ReturnType<typeof createReport>} report
 * @param {string} name
 * @param {string} details
 * @param {number} startMs
 * @param {number} endMs
 */
function addPhase(report, name, details, startMs, endMs) {
    const durationMs = Math.max(0, endMs - startMs);
    report.phases.push({name, details, durationMs});
    console.log(`${logTag} phase: ${name} (${durationMs.toFixed(1)} ms)`);
}

/**
 * @param {ReturnType<typeof createReport>} report
 * @returns {string}
 */
function renderReportHtml(report) {
    const isFailure = report.status === 'failure';
    const rows = report.phases.map((phase, index) => `
        <section class="phase">
            <h3>Phase ${String(index + 1)}: ${escapeHtml(phase.name)}</h3>
            <div><strong>Duration:</strong> ${phase.durationMs.toFixed(1)} ms</div>
            <pre>${escapeHtml(phase.details)}</pre>
        </section>
    `).join('\n');
    const contractRows = (report.contract?.results || []).map((row) => `
        <tr class="${row.pass === true ? 'row-pass' : 'row-fail'}">
            <td>${escapeHtml(String(row.id || ''))}</td>
            <td>${escapeHtml(String(row.description || ''))}</td>
            <td>${escapeHtml(String(row.expectedWriteAction || ''))}</td>
            <td>${escapeHtml(String(row.observedWriteAction || ''))}</td>
            <td>${escapeHtml(String(row.pass === true ? 'PASS' : 'FAIL'))}</td>
        </tr>
    `).join('\n');
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Firefox Android Anki Deduplication E2E Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 24px; color: #111827; }
    .banner { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-weight: 700; }
    .banner.pass { background: #dcfce7; color: #166534; }
    .banner.fail { background: #fee2e2; color: #991b1b; }
    .meta { margin-bottom: 16px; }
    .meta div { margin: 3px 0; }
    .phase { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
    pre { white-space: pre-wrap; word-break: break-word; margin: 8px 0 0; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th, td { border: 1px solid #e5e7eb; text-align: left; padding: 6px; }
    th { background: #f3f4f6; }
    .row-pass { background: #ecfdf5; }
    .row-fail { background: #fef2f2; }
  </style>
</head>
<body>
  <div class="banner ${isFailure ? 'fail' : 'pass'}">${isFailure ? 'FAILED' : 'PASSED'}</div>
  <div class="meta">
    <div><strong>Started:</strong> ${escapeHtml(report.startedAtIso)}</div>
    <div><strong>Finished:</strong> ${escapeHtml(report.finishedAtIso)}</div>
    <div><strong>Status:</strong> ${escapeHtml(report.status)}</div>
    <div><strong>Failure:</strong> ${escapeHtml(report.failureReason || 'none')}</div>
    <div><strong>ADB Device:</strong> ${escapeHtml(report.adbDevice || 'unknown')}</div>
    <div><strong>Firefox package:</strong> ${escapeHtml(report.firefoxPackage || 'unknown')}</div>
    <div><strong>Source directory:</strong> ${escapeHtml(report.sourceDir || 'unknown')}</div>
    <div><strong>Firefox APK URL:</strong> ${escapeHtml(report.firefoxApkUrl || 'not-used')}</div>
  </div>
  ${rows}
  <section class="phase">
    <h3>Protocol Contract Matrix</h3>
    <div><strong>Contract status:</strong> ${escapeHtml(String(report.contract?.ok === true ? 'PASS' : 'FAIL'))}</div>
    <table>
      <thead>
        <tr><th>Scenario</th><th>Description</th><th>Expected Write</th><th>Observed Write</th><th>Result</th></tr>
      </thead>
      <tbody>${contractRows}</tbody>
    </table>
  </section>
</body>
</html>`;
}

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<string>}
 */
async function runCommand(command, args) {
    try {
        const {stdout, stderr} = await execFileAsync(command, args, {
            cwd: root,
            env: process.env,
            maxBuffer: 50 * 1024 * 1024,
        });
        if (typeof stderr === 'string' && stderr.trim().length > 0) {
            console.log(`${logTag} ${command} stderr: ${stderr.trim()}`);
        }
        return String(stdout || '');
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const errorRecord = (typeof e === 'object' && e !== null) ? /** @type {Record<string, unknown>} */ (e) : {};
        const stdout = typeof errorRecord.stdout === 'string' ? errorRecord.stdout.trim() : '';
        const stderr = typeof errorRecord.stderr === 'string' ? errorRecord.stderr.trim() : '';
        fail(`Command failed: ${command} ${args.join(' ')} error=${message} stdout=${stdout} stderr=${stderr}`);
    }
}

/**
 * @returns {Promise<string[]>}
 */
async function listAdbDevices() {
    const output = await runCommand('adb', ['devices']);
    /** @type {string[]} */
    const devices = [];
    for (const rawLine of output.split('\n')) {
        const line = rawLine.trim();
        if (line.length === 0 || line.startsWith('List of devices attached')) { continue; }
        const parts = line.split(/\s+/);
        if (parts.length >= 2 && parts[1] === 'device') {
            devices.push(parts[0]);
        }
    }
    return devices;
}

/**
 * @param {string[]} devices
 * @returns {string}
 */
function selectAdbDevice(devices) {
    const explicit = String(process.env.MANABITAN_ANDROID_ADB_DEVICE || '').trim();
    if (explicit.length > 0) {
        if (!devices.includes(explicit)) {
            fail(`Requested ADB device "${explicit}" not found. devices=${JSON.stringify(devices)}`);
        }
        return explicit;
    }
    if (devices.length === 1) {
        return devices[0];
    }
    if (devices.length === 0) {
        fail('No Android device detected.');
    }
    fail(`Multiple Android devices detected; set MANABITAN_ANDROID_ADB_DEVICE. devices=${JSON.stringify(devices)}`);
}

/**
 * @param {string} device
 * @param {string} packageName
 * @returns {Promise<boolean>}
 */
async function isPackageInstalled(device, packageName) {
    const output = await runCommand('adb', ['-s', device, 'shell', 'pm', 'list', 'packages', packageName]);
    return output.includes(packageName);
}

/**
 * @returns {Promise<string>}
 */
async function resolveLatestFirefoxApkUrl() {
    const baseUrl = 'https://ftp.mozilla.org/pub/fenix/releases/';
    const listingResponse = await fetch(baseUrl);
    if (!listingResponse.ok) {
        fail(`Failed to fetch Firefox Android release listing: ${listingResponse.status} ${listingResponse.statusText}`);
    }
    const listingHtml = await listingResponse.text();
    const versions = extractFirefoxAndroidStableReleaseVersions(listingHtml, baseUrl);
    if (versions.length === 0) {
        fail('No stable Firefox Android versions found.');
    }
    const latestVersion = versions[versions.length - 1];
    const directoryUrl = new URL(`${latestVersion}/android/fenix-${latestVersion}-android-x86_64/`, baseUrl).href;
    const directoryResponse = await fetch(directoryUrl);
    if (!directoryResponse.ok) {
        fail(`Failed to fetch Firefox Android x86_64 listing for ${latestVersion}`);
    }
    const directoryHtml = await directoryResponse.text();
    const apkCandidates = extractFirefoxAndroidApkUrls(directoryHtml, directoryUrl);
    if (apkCandidates.length === 0) {
        fail(`No APK found for Firefox Android ${latestVersion}.`);
    }
    const preferred = selectPreferredFirefoxAndroidApkUrl(apkCandidates, latestVersion);
    if (typeof preferred !== 'string') {
        fail(`Could not determine a preferred Firefox Android x86_64 APK for ${latestVersion}.`);
    }
    return preferred;
}

/**
 * @param {string} url
 * @param {string} outputPath
 * @returns {Promise<void>}
 */
async function downloadFile(url, outputPath) {
    const response = await fetch(url);
    if (!response.ok || response.body === null) {
        fail(`Failed to download ${url}: ${response.status} ${response.statusText}`);
    }
    await mkdir(path.dirname(outputPath), {recursive: true});
    await pipeline(Readable.fromWeb(response.body), createWriteStream(outputPath));
}

/**
 * @returns {Promise<string>}
 */
async function resolveFirefoxAndroidSourceDir() {
    const configured = String(process.env.MANABITAN_ANDROID_SOURCE_DIR || '').trim();
    if (configured.length > 0) {
        await access(configured);
        return configured;
    }
    const buildsDir = path.join(root, 'builds');
    const entries = await readdir(buildsDir, {withFileTypes: true});
    /** @type {Array<{path: string, mtimeMs: number}>} */
    const candidates = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) { continue; }
        if (!entry.name.endsWith('-firefox-android')) { continue; }
        const candidatePath = path.join(buildsDir, entry.name);
        const candidateStats = await stat(candidatePath);
        candidates.push({
            path: candidatePath,
            mtimeMs: Number(candidateStats.mtimeMs || 0),
        });
    }
    if (candidates.length === 0) {
        fail(`Could not find firefox-android build output in ${buildsDir}. Run: npm run build -- --target firefox-android`);
    }
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return candidates[0].path;
}

/**
 * @param {{device: string, packageName: string, sourceDir: string, timeoutMs: number}} options
 * @returns {Promise<string[]>}
 */
async function runWebExtSmoke({device, packageName, sourceDir, timeoutMs}) {
    const args = [
        '--yes',
        'web-ext',
        'run',
        '--target',
        'firefox-android',
        '--adb-device',
        device,
        '--firefox-apk',
        packageName,
        '-s',
        sourceDir,
    ];
    const child = spawn('npx', args, {
        cwd: root,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    /** @type {string[]} */
    const outputLines = [];
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let sawOutput = false;
    let timedOut = false;

    /**
     * @param {string} chunk
     */
    const appendLine = (chunk) => {
        const lines = chunk.split('\n');
        for (let index = 0; index < lines.length - 1; index += 1) {
            const line = lines[index].trimEnd();
            if (line.length === 0) { continue; }
            sawOutput = true;
            outputLines.push(line);
            if (outputLines.length > 200) {
                outputLines.splice(0, outputLines.length - 200);
            }
            console.log(`${logTag} web-ext: ${line}`);
        }
    };

    return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            timedOut = true;
            if (!sawOutput) {
                if (!child.killed) { child.kill('SIGKILL'); }
                reject(new Error('web-ext produced no output before timeout.'));
                return;
            }
            if (!child.killed) {
                child.kill('SIGTERM');
                setTimeout(() => {
                    if (!child.killed) {
                        child.kill('SIGKILL');
                    }
                }, 5_000);
            }
        }, timeoutMs);

        child.stdout.on('data', (chunk) => {
            stdoutBuffer += String(chunk);
            const newlineIndex = stdoutBuffer.lastIndexOf('\n');
            if (newlineIndex === -1) { return; }
            appendLine(stdoutBuffer.slice(0, newlineIndex + 1));
            stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
        });
        child.stderr.on('data', (chunk) => {
            stderrBuffer += String(chunk);
            const newlineIndex = stderrBuffer.lastIndexOf('\n');
            if (newlineIndex === -1) { return; }
            appendLine(stderrBuffer.slice(0, newlineIndex + 1));
            stderrBuffer = stderrBuffer.slice(newlineIndex + 1);
        });
        child.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        child.on('exit', (code, signal) => {
            clearTimeout(timeout);
            if (stdoutBuffer.trim().length > 0) { appendLine(`${stdoutBuffer.trim()}\n`); }
            if (stderrBuffer.trim().length > 0) { appendLine(`${stderrBuffer.trim()}\n`); }
            if (timedOut) {
                resolve(outputLines);
                return;
            }
            reject(new Error(`web-ext exited before timeout (code=${String(code)} signal=${String(signal)}).`));
        });
    });
}

/**
 * @returns {Promise<void>}
 */
async function main() {
    const report = createReport();
    const reportPath = process.env.MANABITAN_FIREFOX_ANDROID_ANKI_DEDUPE_REPORT ?? path.join(root, 'builds', 'firefox-android-e2e-anki-dedupe-report.html');
    const reportJsonPath = reportPath.replace(/\.html$/i, '.json');
    /** @type {Error|undefined} */
    let runError;
    const firefoxPackage = String(process.env.MANABITAN_ANDROID_FIREFOX_PACKAGE || 'org.mozilla.firefox').trim();
    report.firefoxPackage = firefoxPackage;
    try {
        const adbDetectStart = safePerformance.now();
        const devices = await listAdbDevices();
        const device = selectAdbDevice(devices);
        report.adbDevice = device;
        const adbDetectEnd = safePerformance.now();
        addPhase(report, 'Detect ADB device', `Detected Android device ${device}; devices=${JSON.stringify(devices)}`, adbDetectStart, adbDetectEnd);

        const packageCheckStart = safePerformance.now();
        let firefoxInstalled = await isPackageInstalled(device, firefoxPackage);
        const autoInstallFirefox = String(process.env.MANABITAN_ANDROID_AUTO_INSTALL_FIREFOX || '').trim() === '1';
        let firefoxApkUrl = String(process.env.MANABITAN_ANDROID_FIREFOX_APK_URL || '').trim();
        if (!firefoxInstalled && autoInstallFirefox) {
            if (firefoxApkUrl.length === 0) {
                firefoxApkUrl = await resolveLatestFirefoxApkUrl();
            }
            report.firefoxApkUrl = firefoxApkUrl;
            const apkPath = path.join(root, 'builds', 'firefox-android-x86_64.apk');
            await downloadFile(firefoxApkUrl, apkPath);
            await runCommand('adb', ['-s', device, 'install', '-r', '-d', apkPath]);
            firefoxInstalled = await isPackageInstalled(device, firefoxPackage);
        }
        if (!firefoxInstalled) {
            fail(`Firefox Android package "${firefoxPackage}" is not installed on device ${device}. Set MANABITAN_ANDROID_AUTO_INSTALL_FIREFOX=1 to auto-install.`);
        }
        const packageCheckEnd = safePerformance.now();
        addPhase(
            report,
            'Ensure Firefox Android package',
            `Firefox package ${firefoxPackage} is installed on ${device}. autoInstall=${String(autoInstallFirefox)} apkUrl=${firefoxApkUrl || 'not-used'}`,
            packageCheckStart,
            packageCheckEnd,
        );

        const resolveSourceDirStart = safePerformance.now();
        const sourceDir = await resolveFirefoxAndroidSourceDir();
        report.sourceDir = sourceDir;
        const resolveSourceDirEnd = safePerformance.now();
        addPhase(report, 'Resolve extension source directory', `Using extension source directory: ${sourceDir}`, resolveSourceDirStart, resolveSourceDirEnd);

        const timeoutMs = Number(process.env.MANABITAN_ANDROID_WEB_EXT_TIMEOUT_MS || 45_000);
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
            fail(`Invalid MANABITAN_ANDROID_WEB_EXT_TIMEOUT_MS: ${String(process.env.MANABITAN_ANDROID_WEB_EXT_TIMEOUT_MS || '')}`);
        }
        const smokeStart = safePerformance.now();
        const webExtOutputTail = await runWebExtSmoke({
            device,
            packageName: firefoxPackage,
            sourceDir,
            timeoutMs,
        });
        const smokeEnd = safePerformance.now();
        addPhase(
            report,
            'Run Firefox Android web-ext smoke',
            `web-ext run remained alive through timeout (${String(timeoutMs)} ms). outputTail=${JSON.stringify(webExtOutputTail.slice(-20))}`,
            smokeStart,
            smokeEnd,
        );

        const contractStart = safePerformance.now();
        const contractState = createAnkiMockState();
        const contractResult = runAnkiDedupeContractMatrix(contractState);
        report.contract = contractResult;
        const failingScenarios = contractResult.results.filter((entry) => entry.pass !== true).map((entry) => entry.id);
        const contractEnd = safePerformance.now();
        addPhase(
            report,
            'Run dedupe protocol contract matrix',
            `Executed ${String(contractResult.results.length)} scenarios. failures=${JSON.stringify(failingScenarios)}`,
            contractStart,
            contractEnd,
        );
        if (!contractResult.ok) {
            fail(`Protocol contract failures: ${JSON.stringify(failingScenarios)}`);
        }

        report.status = 'success';
        console.log(`${logTag} PASS: Android smoke + dedupe contract checks completed.`);
    } catch (e) {
        report.status = 'failure';
        report.failureReason = errorMessage(e);
        runError = new Error(`${logTag} ${report.failureReason}`);
    } finally {
        report.finishedAtIso = new Date().toISOString();
        await mkdir(path.dirname(reportPath), {recursive: true});
        await writeFile(reportPath, renderReportHtml(report), 'utf8');
        await writeFile(reportJsonPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`${logTag} wrote report: ${reportPath}`);
        console.log(`${logTag} wrote report json: ${reportJsonPath}`);
    }
    if (runError) {
        throw runError;
    }
}

await main();
