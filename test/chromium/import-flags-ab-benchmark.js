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

import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {parseJson} from '../../ext/js/core/json.js';

const execFileAsync = promisify(execFile);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..', '..');
const buildsDir = path.join(root, 'builds');
const timestamp = new Date().toISOString()
    .replaceAll(':', '')
    .replaceAll('.', '')
    .replaceAll('-', '');
const baselineImportFlags = {};
const referenceIterations = Number.parseInt(process.env.MANABITAN_AB_REFERENCE_ITERATIONS ?? '10', 10);
const iterationPercent = Number.parseFloat(process.env.MANABITAN_AB_ITERATION_PERCENT ?? '10');
const pairIterationsOverride = Number.parseInt(process.env.MANABITAN_AB_PAIR_ITERATIONS ?? '', 10);
const pairIterationsFromPercent = Math.round(referenceIterations * (iterationPercent / 100));
const pairIterations = Number.isFinite(pairIterationsOverride) && pairIterationsOverride > 0 ?
    pairIterationsOverride :
    Math.max(1, Number.isFinite(pairIterationsFromPercent) ? pairIterationsFromPercent : 1);
const quickMode = (process.env.MANABITAN_AB_QUICK_MODE ?? '1').trim() !== '0';

/**
 * @typedef {object} VariantSpec
 * @property {string} id
 * @property {string} label
 * @property {Record<string, unknown>} importFlags
 * @property {string} targetedMetricLabel
 */

/**
 * @type {VariantSpec[]}
 */
const variants = [
];

/**
 * @param {string} reportPath
 * @returns {string}
 */
function toJsonPath(reportPath) {
    return reportPath.replace(/\.html$/i, '.json');
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function asNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * @param {unknown} details
 * @returns {Record<string, unknown>|null}
 */
function parseStep4Breakdown(details) {
    if (typeof details !== 'string') {
        return null;
    }
    const text = details;
    const match = text.match(/step4Breakdown=({[\s\S]*})$/);
    if (!match) { return null; }
    try {
        const parsed = /** @type {unknown} */ (parseJson(match[1]));
        if (!(typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed))) {
            return null;
        }
        return /** @type {Record<string, unknown>} */ (parsed);
    } catch (_) {
        return null;
    }
}

/**
 * @param {Record<string, unknown>} report
 * @returns {{totalImportMs: number, step4BulkAddTermsMs: number, step4AccountedMs: number}}
 * @throws {Error}
 */
function summarizeReport(report) {
    const phases = Array.isArray(report.phases) ? /** @type {unknown[]} */ (report.phases) : [];
    /** @type {Record<string, unknown>|null} */
    let totalImportPhase = null;
    for (const phase of phases) {
        if (!(typeof phase === 'object' && phase !== null && !Array.isArray(phase))) {
            continue;
        }
        const phaseRecord = /** @type {Record<string, unknown>} */ (phase);
        const phaseName = typeof phaseRecord.name === 'string' ? phaseRecord.name : '';
        if (phaseName.endsWith(': total import')) {
            totalImportPhase = phaseRecord;
            break;
        }
    }
    if (totalImportPhase === null) {
        throw new Error('Missing "*: total import" phase');
    }
    const step4Breakdown = parseStep4Breakdown(totalImportPhase.details);
    if (step4Breakdown === null) {
        throw new Error('Missing step4Breakdown in total import phase details');
    }
    const aggregateRaw = step4Breakdown.aggregate;
    if (!(typeof aggregateRaw === 'object' && aggregateRaw !== null && !Array.isArray(aggregateRaw))) {
        throw new Error('Missing step4Breakdown.aggregate');
    }
    const aggregate = /** @type {Record<string, unknown>} */ (aggregateRaw);
    return {
        totalImportMs: asNumber(totalImportPhase.durationMs),
        step4BulkAddTermsMs: asNumber(aggregate.bulkAddTermsMs),
        step4AccountedMs: asNumber(aggregate.accountedMs),
    };
}

/**
 * @param {number} base
 * @param {number} next
 * @returns {number}
 */
function percentDelta(base, next) {
    return base > 0 ? ((next - base) / base) * 100 : 0;
}

/**
 * @param {number[]} values
 * @returns {number}
 */
function median(values) {
    if (values.length === 0) { return 0; }
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if ((sorted.length % 2) === 1) {
        return sorted[mid];
    }
    return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * @param {string} runId
 * @param {Record<string, string>} envOverrides
 * @returns {Promise<{runId: string, reportPath: string, reportJsonPath: string, summary: ReturnType<typeof summarizeReport>}>}
 * @throws {Error}
 */
async function runOnce(runId, envOverrides) {
    const reportPath = envOverrides.MANABITAN_CHROMIUM_E2E_REPORT;
    if (typeof reportPath !== 'string' || reportPath.length === 0) {
        throw new Error(`Missing report path for ${runId}`);
    }
    const reportJsonPath = toJsonPath(reportPath);
    console.log(`[flags-ab] running runId="${runId}" report=${reportPath}`);
    await execFileAsync(
        'node',
        ['./test/chromium/extension-two-dictionary-import.e2e.js'],
        {
            cwd: root,
            env: {
                ...process.env,
                ...envOverrides,
            },
            maxBuffer: 64 * 1024 * 1024,
        },
    );
    const reportRaw = await readFile(reportJsonPath, 'utf8');
    const report = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (parseJson(reportRaw)));
    return {
        runId,
        reportPath,
        reportJsonPath,
        summary: summarizeReport(report),
    };
}

/**
 * @param {VariantSpec} variant
 * @param {boolean} skipBuildForFirstBaseline
 * @returns {Promise<{variant: VariantSpec, runPairs: Array<{iteration: number, baseline: Awaited<ReturnType<typeof runOnce>>, variant: Awaited<ReturnType<typeof runOnce>>, deltas: {totalImportMsDelta: number, totalImportPercentDelta: number, targetedMetricDelta: number, targetedMetricPercentDelta: number}}>, medians: {baselineTotalImportMs: number, variantTotalImportMs: number, baselineTargetedMetricMs: number, variantTargetedMetricMs: number, totalImportMsDelta: number, totalImportPercentDelta: number, targetedMetricDelta: number, targetedMetricPercentDelta: number}}>}
 */
async function runPairedVariant(variant, skipBuildForFirstBaseline) {
    /** @type {Array<{iteration: number, baseline: Awaited<ReturnType<typeof runOnce>>, variant: Awaited<ReturnType<typeof runOnce>>, deltas: {totalImportMsDelta: number, totalImportPercentDelta: number, targetedMetricDelta: number, targetedMetricPercentDelta: number}}>} */
    const runPairs = [];
    const baselineTotals = [];
    const variantTotals = [];
    const baselineTargeted = [];
    const variantTargeted = [];
    const totalDeltas = [];
    const targetedDeltas = [];
    const totalPercentDeltas = [];
    const targetedPercentDeltas = [];

    for (let iteration = 1; iteration <= pairIterations; ++iteration) {
        const runIdPrefix = `${variant.id}-iter${String(iteration)}`;
        const baselineReportPath = path.join(buildsDir, `chromium-e2e-import-report-iso-${runIdPrefix}-baseline-${timestamp}.html`);
        const variantReportPath = path.join(buildsDir, `chromium-e2e-import-report-iso-${runIdPrefix}-variant-${timestamp}.html`);
        const baseline = await runOnce(`${runIdPrefix}:baseline`, {
            MANABITAN_CHROMIUM_E2E_REPORT: baselineReportPath,
            MANABITAN_E2E_SKIP_BUILD: (iteration === 1 && !skipBuildForFirstBaseline) ? '0' : '1',
            MANABITAN_E2E_IMPORT_FLAGS_JSON: JSON.stringify(baselineImportFlags),
            MANABITAN_E2E_IMPORT_BENCH_QUICK: quickMode ? '1' : '0',
        });
        const variantImportFlags = {
            ...baselineImportFlags,
            ...variant.importFlags,
        };
        const variantRun = await runOnce(`${runIdPrefix}:variant`, {
            MANABITAN_CHROMIUM_E2E_REPORT: variantReportPath,
            MANABITAN_E2E_SKIP_BUILD: '1',
            MANABITAN_E2E_IMPORT_FLAGS_JSON: JSON.stringify(variantImportFlags),
            MANABITAN_E2E_IMPORT_BENCH_QUICK: quickMode ? '1' : '0',
        });
        const totalImportMsDelta = variantRun.summary.totalImportMs - baseline.summary.totalImportMs;
        const totalImportPercentDelta = percentDelta(baseline.summary.totalImportMs, variantRun.summary.totalImportMs);
        const targetedMetricDelta = variantRun.summary.step4BulkAddTermsMs - baseline.summary.step4BulkAddTermsMs;
        const targetedMetricPercentDelta = percentDelta(baseline.summary.step4BulkAddTermsMs, variantRun.summary.step4BulkAddTermsMs);
        runPairs.push({
            iteration,
            baseline,
            variant: variantRun,
            deltas: {
                totalImportMsDelta,
                totalImportPercentDelta,
                targetedMetricDelta,
                targetedMetricPercentDelta,
            },
        });
        baselineTotals.push(baseline.summary.totalImportMs);
        variantTotals.push(variantRun.summary.totalImportMs);
        baselineTargeted.push(baseline.summary.step4BulkAddTermsMs);
        variantTargeted.push(variantRun.summary.step4BulkAddTermsMs);
        totalDeltas.push(totalImportMsDelta);
        targetedDeltas.push(targetedMetricDelta);
        totalPercentDeltas.push(totalImportPercentDelta);
        targetedPercentDeltas.push(targetedMetricPercentDelta);
    }

    const medians = {
        baselineTotalImportMs: median(baselineTotals),
        variantTotalImportMs: median(variantTotals),
        baselineTargetedMetricMs: median(baselineTargeted),
        variantTargetedMetricMs: median(variantTargeted),
        totalImportMsDelta: median(totalDeltas),
        totalImportPercentDelta: median(totalPercentDeltas),
        targetedMetricDelta: median(targetedDeltas),
        targetedMetricPercentDelta: median(targetedPercentDeltas),
    };

    return {variant, runPairs, medians};
}

/**
 * @returns {Promise<void>}
 * @throws {Error}
 */
async function main() {
    if (!Number.isFinite(pairIterations) || pairIterations < 1) {
        throw new Error(`Invalid pair iteration count derived from referenceIterations=${String(referenceIterations)} iterationPercent=${String(iterationPercent)}`);
    }
    await mkdir(buildsDir, {recursive: true});

    /** @type {Array<{ok: true, result: Awaited<ReturnType<typeof runPairedVariant>>} | {ok: false, variant: VariantSpec, error: string}>} */
    const results = [];
    for (let i = 0; i < variants.length; ++i) {
        const variant = variants[i];
        const skipBuildForFirstBaseline = i > 0;
        try {
            const result = await runPairedVariant(variant, skipBuildForFirstBaseline);
            results.push({ok: true, result});
        } catch (e) {
            const error = e instanceof Error ? e.message : String(e);
            results.push({ok: false, variant, error});
            console.error(`[flags-ab] variant failed id="${variant.id}" error=${error}`);
        }
    }

    const summary = {
        timestamp,
        baselineImportFlags,
        variants,
        referenceIterations,
        iterationPercent,
        pairIterations,
        quickMode,
        note: 'Each variant is tested in isolation against an immediate paired baseline run.',
        results: results.map((entry) => {
            if (!entry.ok) {
                return {
                    id: entry.variant.id,
                    label: entry.variant.label,
                    targetedMetricLabel: entry.variant.targetedMetricLabel,
                    importFlags: entry.variant.importFlags,
                    status: 'failed',
                    error: entry.error,
                };
            }
            return {
                id: entry.result.variant.id,
                label: entry.result.variant.label,
                targetedMetricLabel: entry.result.variant.targetedMetricLabel,
                importFlags: entry.result.variant.importFlags,
                status: 'ok',
                medians: entry.result.medians,
                runPairs: entry.result.runPairs,
            };
        }),
    };
    const summaryPath = path.join(buildsDir, `chromium-e2e-import-flags-isolated-summary-${timestamp}.json`);
    await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

    console.log('[flags-ab] summary');
    console.log(JSON.stringify({
        timestamp,
        referenceIterations,
        iterationPercent,
        pairIterations,
        quickMode,
        baselineImportFlags,
        variants: results.map((entry) => {
            if (!entry.ok) {
                return {
                    id: entry.variant.id,
                    label: entry.variant.label,
                    status: 'failed',
                    error: entry.error,
                };
            }
            const result = entry.result;
            return {
                id: result.variant.id,
                label: result.variant.label,
                targetedMetricLabel: result.variant.targetedMetricLabel,
                status: 'ok',
                totalImportMs: {
                    baselineMedian: Math.round(result.medians.baselineTotalImportMs),
                    variantMedian: Math.round(result.medians.variantTotalImportMs),
                    deltaMedian: Math.round(result.medians.totalImportMsDelta),
                    percentDeltaMedian: Number(result.medians.totalImportPercentDelta.toFixed(2)),
                },
                targetedMetricMs: {
                    baselineMedian: Math.round(result.medians.baselineTargetedMetricMs),
                    variantMedian: Math.round(result.medians.variantTargetedMetricMs),
                    deltaMedian: Math.round(result.medians.targetedMetricDelta),
                    percentDeltaMedian: Number(result.medians.targetedMetricPercentDelta.toFixed(2)),
                },
            };
        }),
        summaryPath,
    }, null, 2));
}

await main();
