#!/usr/bin/env node
/*
 * Copyright (C) 2026  Manabitan authors
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

import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'path';

const nodeMajorVersion = Number.parseInt(process.versions.node.split('.')[0], 10);
if (!Number.isFinite(nodeMajorVersion) || nodeMajorVersion < 18 || nodeMajorVersion > 22) {
    console.error(
        `Playwright tests require Node.js 18-22. Detected ${process.version}. ` +
        'Use a supported Node version for deterministic Playwright execution.',
    );
    process.exit(1);
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..', '..');
const playwrightBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
const args = process.argv.slice(2);

const child = spawn(playwrightBin, args, {
    stdio: 'inherit',
    // On Windows, playwright resolves to a .cmd shim which must run through the shell.
    shell: process.platform === 'win32',
});

const timeoutSeconds = Number.parseInt(process.env.PLAYWRIGHT_HARD_TIMEOUT_SECONDS ?? '900', 10);
let timeout = null;
if (Number.isFinite(timeoutSeconds) && timeoutSeconds > 0) {
    timeout = setTimeout(() => {
        console.error(`Playwright run exceeded hard timeout (${timeoutSeconds}s).`);
        child.kill('SIGTERM');
    }, timeoutSeconds * 1000);
}

child.on('error', (error) => {
    if (timeout !== null) {
        clearTimeout(timeout);
    }
    console.error(error);
    process.exit(1);
});

child.on('exit', (code, signal) => {
    if (timeout !== null) {
        clearTimeout(timeout);
    }
    if (signal) {
        process.exit(1);
    }
    process.exit(code ?? 1);
});
