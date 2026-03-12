#!/usr/bin/env node
/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {parseJson} from '../../ext/js/core/json.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(dirname, '..', '..');

const {
    values: args,
} = parseArgs({
    options: {
        'help': {
            type: 'boolean',
            default: false,
        },
        'summary': {
            type: 'string',
            default: path.join(rootDir, 'builds', 'coverage', 'coverage-summary.json'),
        },
        'top': {
            type: 'string',
            default: '10',
        },
        'fail-under': {
            type: 'string',
        },
        'fail-under-lines': {
            type: 'string',
        },
        'fail-under-functions': {
            type: 'string',
        },
        'fail-under-branches': {
            type: 'string',
        },
        'fail-under-statements': {
            type: 'string',
        },
    },
});

if (args.help) {
    process.stdout.write('Usage: node ./dev/bin/coverage-monitor.js [options]\n\n');
    process.stdout.write('Options:\n');
    process.stdout.write('  --summary=<path>                Path to coverage-summary.json\n');
    process.stdout.write('  --top=<n>                       Number of lowest-covered files to print (default: 10)\n');
    process.stdout.write('  --fail-under=<pct>              Global minimum percentage threshold (0-100)\n');
    process.stdout.write('  --fail-under-lines=<pct>        Minimum lines coverage threshold\n');
    process.stdout.write('  --fail-under-functions=<pct>    Minimum functions coverage threshold\n');
    process.stdout.write('  --fail-under-branches=<pct>     Minimum branches coverage threshold\n');
    process.stdout.write('  --fail-under-statements=<pct>   Minimum statements coverage threshold\n');
    process.stdout.write('  --help                          Show this help message\n');
    process.exit(0);
}

/**
 * @typedef {'lines' | 'functions' | 'branches' | 'statements'} CoverageMetricKey
 * @typedef {{total: number, covered: number, pct: number}} CoverageMetric
 * @typedef {{total: Record<CoverageMetricKey, CoverageMetric>} & Record<string, unknown>} CoverageSummary
 */

/**
 * @param {string | undefined} value
 * @param {string} option
 * @returns {number | null}
 * @throws {Error}
 */
function parsePercentage(value, option) {
    if (typeof value === 'undefined') {
        return null;
    }
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        throw new Error(`Invalid value for --${option}. Expected a number in range 0-100.`);
    }
    return parsed;
}

/**
 * @param {string} value
 * @returns {number}
 * @throws {Error}
 */
function parsePositiveInteger(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('Invalid value for --top. Expected a positive integer.');
    }
    return parsed;
}

/**
 * @param {unknown} summary
 * @returns {summary is CoverageSummary}
 */
function isValidSummary(summary) {
    if (!summary || typeof summary !== 'object') {
        return false;
    }
    const total = /** @type {{total?: unknown}} */ (summary).total;
    if (!total || typeof total !== 'object') {
        return false;
    }
    for (const key of ['lines', 'functions', 'branches', 'statements']) {
        const metric = /** @type {Record<string, unknown>} */ (total)[key];
        if (!metric || typeof metric !== 'object') {
            return false;
        }
        const {total: totalCount, covered, pct} = /** @type {{total?: unknown, covered?: unknown, pct?: unknown}} */ (metric);
        if (!Number.isFinite(totalCount) || !Number.isFinite(covered) || !Number.isFinite(pct)) {
            return false;
        }
    }
    return true;
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function toRelativePath(filePath) {
    if (!path.isAbsolute(filePath)) {
        return filePath.replaceAll('\\', '/');
    }
    return path.relative(rootDir, filePath).replaceAll('\\', '/');
}

/**
 * @param {{total: number, covered: number, pct: number}} metric
 * @returns {string}
 */
function formatMetric(metric) {
    const pct = metric.pct.toFixed(2).padStart(6, ' ');
    return `${pct}% (${metric.covered}/${metric.total})`;
}

/**
 * @param {string} value
 * @returns {string}
 */
function formatName(value) {
    return value[0].toUpperCase() + value.slice(1);
}

try {
    const summaryPath = path.resolve(args.summary);
    const topCount = parsePositiveInteger(args.top);
    const globalThreshold = parsePercentage(args['fail-under'], 'fail-under');
    const metricThresholds = {
        lines: parsePercentage(args['fail-under-lines'], 'fail-under-lines'),
        functions: parsePercentage(args['fail-under-functions'], 'fail-under-functions'),
        branches: parsePercentage(args['fail-under-branches'], 'fail-under-branches'),
        statements: parsePercentage(args['fail-under-statements'], 'fail-under-statements'),
    };

    if (!fs.existsSync(summaryPath)) {
        throw new Error(`Coverage summary not found at ${summaryPath}`);
    }

    const raw = fs.readFileSync(summaryPath, 'utf8');
    const summary = parseJson(raw);

    if (!isValidSummary(summary)) {
        throw new Error(`Invalid coverage summary format in ${summaryPath}`);
    }

    /** @type {CoverageMetricKey[]} */
    const metricKeys = ['lines', 'functions', 'branches', 'statements'];
    const totals = summary.total;

    process.stdout.write('Coverage monitor\n');
    process.stdout.write(`Summary file: ${summaryPath}\n`);
    process.stdout.write(`Generated at: ${new Date().toISOString()}\n\n`);
    for (const key of metricKeys) {
        process.stdout.write(`${formatName(key).padEnd(10, ' ')} ${formatMetric(totals[key])}\n`);
    }

    /** @type {Array<{file: string, linesPct: number, uncoveredLines: number}>} */
    const fileMetrics = Object.entries(summary)
        .filter(([name, value]) => name !== 'total' && value && typeof value === 'object')
        .map(([file, value]) => {
            const rawLines = /** @type {{lines?: unknown}} */ (value).lines;
            const lines = (rawLines && typeof rawLines === 'object') ? /** @type {Partial<CoverageMetric>} */ (rawLines) : {};
            const pct = (typeof lines.pct === 'number' && Number.isFinite(lines.pct)) ? lines.pct : 0;
            const total = (typeof lines.total === 'number' && Number.isFinite(lines.total)) ? lines.total : 0;
            const covered = (typeof lines.covered === 'number' && Number.isFinite(lines.covered)) ? lines.covered : 0;
            return {
                file: toRelativePath(file),
                linesPct: pct,
                uncoveredLines: Math.max(total - covered, 0),
            };
        })
        .sort((a, b) => (
            a.linesPct - b.linesPct ||
            b.uncoveredLines - a.uncoveredLines ||
            a.file.localeCompare(b.file)
        ));

    if (fileMetrics.length > 0) {
        process.stdout.write('\n');
        process.stdout.write(`Lowest line coverage files (top ${Math.min(topCount, fileMetrics.length)}):\n`);
        for (const [index, entry] of fileMetrics.slice(0, topCount).entries()) {
            process.stdout.write(
                `${String(index + 1).padStart(2, ' ')}. ${entry.linesPct.toFixed(2).padStart(6, ' ')}% ` +
                `(${entry.uncoveredLines} uncovered lines) ${entry.file}\n`,
            );
        }
    }

    /** @type {Array<string>} */
    const thresholdFailures = [];
    for (const key of metricKeys) {
        const threshold = metricThresholds[key] ?? globalThreshold;
        if (threshold === null) { continue; }
        const actual = totals[key].pct;
        if (actual < threshold) {
            thresholdFailures.push(`${key} ${actual.toFixed(2)}% < ${threshold.toFixed(2)}%`);
        }
    }

    if (thresholdFailures.length > 0) {
        process.stdout.write('\n');
        process.stderr.write('Coverage threshold check failed:\n');
        for (const failure of thresholdFailures) {
            process.stderr.write(`- ${failure}\n`);
        }
        process.exitCode = 1;
    } else if (globalThreshold !== null || Object.values(metricThresholds).some((value) => value !== null)) {
        process.stdout.write('\n');
        process.stdout.write('Coverage thresholds met.\n');
    }
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
}
