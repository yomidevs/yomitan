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

import {execFile} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {mkdir, readdir, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import JSZip from 'jszip';
import {safePerformance} from '../../ext/js/core/safe-performance.js';
import {runAnkiDedupeContractMatrix} from '../e2e/anki-dedupe-matrix.js';
import {createAnkiMockState} from '../e2e/anki-mock-state.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..', '..');
const execFileAsync = promisify(execFile);
const logTag = '[chromium-android-anki-dedupe-e2e]';
const candidateChromiumPackages = [
    'com.kiwibrowser.browser',
    'com.kiwibrowser.browser.beta',
];

function errorMessage(value) {
    return value instanceof Error ? value.message : String(value);
}

function fail(message) {
    throw new Error(`${logTag} ${message}`);
}

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&#39;');
}

function createReport() {
    return {
        startedAtIso: new Date().toISOString(),
        finishedAtIso: '',
        status: 'running',
        failureReason: '',
        adbDevice: '',
        chromiumPackage: '',
        archivePath: '',
        stagedArchivePath: '',
        phases: [],
        contract: null,
    };
}

function addPhase(report, name, details, startMs, endMs) {
    const durationMs = Math.max(0, endMs - startMs);
    report.phases.push({name, details, durationMs});
    console.log(`${logTag} phase: ${name} (${durationMs.toFixed(1)} ms)`);
}

function renderReportHtml(report) {
    const isFailure = report.status === 'failure';
    const phasesHtml = report.phases.map((phase, index) => `
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
  <title>Chromium Android Anki Deduplication E2E Report</title>
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
    <div><strong>Chromium package:</strong> ${escapeHtml(report.chromiumPackage || 'unknown')}</div>
    <div><strong>Archive:</strong> ${escapeHtml(report.archivePath || 'unknown')}</div>
    <div><strong>Staged archive:</strong> ${escapeHtml(report.stagedArchivePath || 'unknown')}</div>
  </div>
  ${phasesHtml}
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
        const errorRecord = (typeof e === 'object' && e !== null) ? e : {};
        const stdout = typeof errorRecord.stdout === 'string' ? errorRecord.stdout.trim() : '';
        const stderr = typeof errorRecord.stderr === 'string' ? errorRecord.stderr.trim() : '';
        fail(`Command failed: ${command} ${args.join(' ')} error=${message} stdout=${stdout} stderr=${stderr}`);
    }
}

async function listAdbDevices() {
    const output = await runCommand('adb', ['devices']);
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

function selectAdbDevice(devices) {
    const explicit = String(process.env.MANABITAN_ANDROID_ADB_DEVICE || '').trim();
    if (explicit.length > 0) {
        if (!devices.includes(explicit)) {
            fail(`Requested ADB device "${explicit}" not found. devices=${JSON.stringify(devices)}`);
        }
        return explicit;
    }
    if (devices.length === 1) { return devices[0]; }
    if (devices.length === 0) { fail('No Android device detected.'); }
    fail(`Multiple Android devices detected; set MANABITAN_ANDROID_ADB_DEVICE. devices=${JSON.stringify(devices)}`);
}

async function isPackageInstalled(device, packageName) {
    const output = await runCommand('adb', ['-s', device, 'shell', 'pm', 'list', 'packages', packageName]);
    return output.includes(packageName);
}

async function resolveChromiumPackage(device) {
    const explicit = String(process.env.MANABITAN_ANDROID_CHROMIUM_PACKAGE || '').trim();
    if (explicit.length > 0) {
        if (!await isPackageInstalled(device, explicit)) {
            fail(`Requested Chromium Android package "${explicit}" is not installed on device ${device}.`);
        }
        return explicit;
    }
    for (const packageName of candidateChromiumPackages) {
        if (await isPackageInstalled(device, packageName)) {
            return packageName;
        }
    }
    fail(`No supported Chromium Android package found on ${device}. Install Kiwi Browser or set MANABITAN_ANDROID_CHROMIUM_PACKAGE. tried=${JSON.stringify(candidateChromiumPackages)}`);
}

async function resolveChromiumArchivePath() {
    const configured = String(process.env.MANABITAN_ANDROID_CHROMIUM_ZIP || '').trim();
    if (configured.length > 0) {
        return configured;
    }
    const buildsDir = path.join(root, 'builds');
    const entries = await readdir(buildsDir, {withFileTypes: true});
    const candidates = [];
    for (const entry of entries) {
        if (!entry.isFile()) { continue; }
        if (!/^manabitan-chrome(?:-dev)?\.zip$/u.test(entry.name)) { continue; }
        const candidatePath = path.join(buildsDir, entry.name);
        const candidateStats = await stat(candidatePath);
        candidates.push({path: candidatePath, mtimeMs: Number(candidateStats.mtimeMs || 0)});
    }
    if (candidates.length === 0) {
        fail(`Could not find a Chromium extension archive in ${buildsDir}. Run: npm run build -- --target chrome-dev`);
    }
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return candidates[0].path;
}

async function validateChromiumArchive(archivePath) {
    const archiveStats = await stat(archivePath);
    const zip = await JSZip.loadAsync(readFileSync(archivePath));
    const manifestFile = zip.file('manifest.json');
    if (manifestFile === null) {
        fail(`Chromium archive ${archivePath} does not contain manifest.json.`);
    }
    const manifestText = await manifestFile.async('string');
    const manifest = JSON.parse(manifestText);
    for (const requiredEntry of ['manifest.json', 'settings.html', 'search.html', 'action-popup.html', 'sw.js']) {
        if (zip.file(requiredEntry) === null) {
            fail(`Chromium archive ${archivePath} is missing ${requiredEntry}.`);
        }
    }
    if (manifest.options_ui?.page !== 'settings.html') {
        fail(`Chromium archive ${archivePath} expected options_ui.page=settings.html but got ${String(manifest.options_ui?.page)}`);
    }
    if (manifest.action?.default_popup !== 'action-popup.html') {
        fail(`Chromium archive ${archivePath} expected action.default_popup=action-popup.html but got ${String(manifest.action?.default_popup)}`);
    }
    const requiredPermissions = ['storage', 'unlimitedStorage', 'clipboardWrite', 'offscreen'];
    for (const permission of requiredPermissions) {
        if (!Array.isArray(manifest.permissions) || !manifest.permissions.includes(permission)) {
            fail(`Chromium archive ${archivePath} is missing required permission ${permission}.`);
        }
    }
    if (!Array.isArray(manifest.host_permissions) || !manifest.host_permissions.includes('<all_urls>')) {
        fail(`Chromium archive ${archivePath} is missing required host permission <all_urls>.`);
    }
    if (typeof manifest.commands?.openSearchPage !== 'object') {
        fail(`Chromium archive ${archivePath} is missing the openSearchPage command.`);
    }
    if (typeof manifest.commands?.openSettingsPage !== 'object') {
        fail(`Chromium archive ${archivePath} is missing the openSettingsPage command.`);
    }
    return Number(archiveStats.size || 0);
}

async function stageArchiveOnDevice(device, localArchivePath, remoteArchivePath, expectedSizeBytes) {
    const remoteDirectory = path.posix.dirname(remoteArchivePath.replaceAll('\\', '/'));
    await runCommand('adb', ['-s', device, 'shell', 'mkdir', '-p', remoteDirectory]);
    await runCommand('adb', ['-s', device, 'push', localArchivePath, remoteArchivePath]);
    const remoteSizeRaw = await runCommand('adb', ['-s', device, 'shell', 'wc', '-c', remoteArchivePath]);
    const remoteSizeMatch = remoteSizeRaw.match(/(\d+)/u);
    if (remoteSizeMatch === null) {
        fail(`Could not determine staged archive size from device output: ${remoteSizeRaw}`);
    }
    const remoteSizeBytes = Number(remoteSizeMatch[1]);
    if (remoteSizeBytes !== expectedSizeBytes) {
        fail(`Staged archive size mismatch. expected=${String(expectedSizeBytes)} actual=${String(remoteSizeBytes)} path=${remoteArchivePath}`);
    }
}

async function launchChromiumPackage(device, packageName) {
    await runCommand('adb', ['-s', device, 'shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1']);
    const start = Date.now();
    while ((Date.now() - start) < 15_000) {
        const pidOutput = await runCommand('adb', ['-s', device, 'shell', 'pidof', packageName]);
        if (pidOutput.trim().length > 0) {
            return;
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 500);
        });
    }
    fail(`Package ${packageName} did not appear in process list after launch.`);
}

async function main() {
    const report = createReport();
    const reportPath = process.env.MANABITAN_CHROMIUM_ANDROID_ANKI_DEDUPE_REPORT ?? path.join(root, 'builds', 'chromium-android-e2e-anki-dedupe-report.html');
    const reportJsonPath = reportPath.replace(/\.html$/iu, '.json');
    let runError;
    try {
        const adbDetectStart = safePerformance.now();
        const devices = await listAdbDevices();
        const device = selectAdbDevice(devices);
        report.adbDevice = device;
        const adbDetectEnd = safePerformance.now();
        addPhase(report, 'Detect ADB device', `Detected Android device ${device}; devices=${JSON.stringify(devices)}`, adbDetectStart, adbDetectEnd);

        const packageCheckStart = safePerformance.now();
        const chromiumPackage = await resolveChromiumPackage(device);
        report.chromiumPackage = chromiumPackage;
        const packageCheckEnd = safePerformance.now();
        addPhase(report, 'Ensure Chromium Android package', `Resolved Chromium Android package ${chromiumPackage} on ${device}`, packageCheckStart, packageCheckEnd);

        const archiveResolveStart = safePerformance.now();
        const archivePath = await resolveChromiumArchivePath();
        const archiveSizeBytes = await validateChromiumArchive(archivePath);
        report.archivePath = archivePath;
        const archiveResolveEnd = safePerformance.now();
        addPhase(report, 'Resolve and validate archive', `archive=${archivePath} size=${String(archiveSizeBytes)}`, archiveResolveStart, archiveResolveEnd);

        const stageStart = safePerformance.now();
        const stagedArchivePath = String(process.env.MANABITAN_ANDROID_CHROMIUM_STAGE_PATH || '/sdcard/yomitan/manabitan-kiwi-browser.zip').trim();
        report.stagedArchivePath = stagedArchivePath;
        await stageArchiveOnDevice(device, archivePath, stagedArchivePath, archiveSizeBytes);
        const stageEnd = safePerformance.now();
        addPhase(report, 'Stage archive on device', `Pushed ${archivePath} to ${stagedArchivePath} and verified byte size.`, stageStart, stageEnd);

        const launchStart = safePerformance.now();
        await launchChromiumPackage(device, chromiumPackage);
        const launchEnd = safePerformance.now();
        addPhase(report, 'Launch Chromium Android package', `Launched ${chromiumPackage} and observed a running process.`, launchStart, launchEnd);

        const contractStart = safePerformance.now();
        const contractState = createAnkiMockState();
        const contractResult = runAnkiDedupeContractMatrix(contractState);
        report.contract = contractResult;
        const failingScenarios = contractResult.results.filter((entry) => entry.pass !== true).map((entry) => entry.id);
        const contractEnd = safePerformance.now();
        addPhase(report, 'Run dedupe protocol contract matrix', `Executed ${String(contractResult.results.length)} scenarios. failures=${JSON.stringify(failingScenarios)}`, contractStart, contractEnd);
        if (!contractResult.ok) {
            fail(`Protocol contract failures: ${JSON.stringify(failingScenarios)}`);
        }

        report.status = 'success';
        console.log(`${logTag} PASS: Chromium Android smoke + dedupe contract checks completed.`);
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
