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

import {spawn} from 'node:child_process';

const repeatCount = Number.parseInt(process.env.MANABITAN_REPEAT_COUNT || '5', 10);
const commandArgs = process.argv.slice(2);

if (!Number.isFinite(repeatCount) || repeatCount <= 0) {
    throw new Error(`Invalid MANABITAN_REPEAT_COUNT value: ${String(process.env.MANABITAN_REPEAT_COUNT || '')}`);
}

if (commandArgs.length === 0) {
    throw new Error('Expected a command to repeat.');
}

const [command, ...args] = commandArgs;

/**
 * @param {number} iteration
 * @returns {Promise<void>}
 */
async function runIteration(iteration) {
    console.log(`[repeat-command] iteration ${String(iteration)}/${String(repeatCount)}: ${command} ${args.join(' ')}`);
    await new Promise(
        /** @type {(resolve: (value: void|PromiseLike<void>) => void, reject: (reason?: unknown) => void) => void} */
        ((resolve, reject) => {
            const child = spawn(command, args, {
                stdio: 'inherit',
                shell: process.platform === 'win32',
                env: process.env,
            });
            child.on('error', reject);
            child.on('exit', (code, signal) => {
                if (code === 0) {
                    resolve();
                    return;
                }
                reject(new Error(`Iteration ${String(iteration)} failed with code=${String(code)} signal=${String(signal)}`));
            });
        }),
    );
}

for (let iteration = 1; iteration <= repeatCount; iteration += 1) {
    await runIteration(iteration);
}

console.log(`[repeat-command] PASS: command succeeded ${String(repeatCount)} consecutive times.`);
