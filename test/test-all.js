/*
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

const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {getArgs} = require('../dev/util');


function main() {
    const args = getArgs(process.argv.slice(2), new Map([
        ['skip', []],
        [null, []]
    ]));
    const directories = args.get(null);
    const skip = new Set([__filename, ...args.get('skip')].map((value) => path.resolve(value)));

    const node = process.execPath;
    const fileNamePattern = /\.js$/i;

    let first = true;
    for (const directory of directories) {
        const fileNames = fs.readdirSync(directory);
        for (const fileName of fileNames) {
            if (!fileNamePattern.test(fileName)) { continue; }

            const fullFileName = path.resolve(path.join(directory, fileName));
            if (skip.has(fullFileName)) { continue; }

            const stats = fs.lstatSync(fullFileName);
            if (!stats.isFile()) { continue; }

            process.stdout.write(`${first ? '' : '\n'}Running ${fileName}...\n`);
            first = false;

            const {error, status} = spawnSync(node, [fileName], {cwd: directory, stdio: 'inherit'});

            if (status !== null && status !== 0) {
                process.exit(status);
                return;
            }
            if (error) {
                throw error;
            }
        }
    }

    process.exit(0);
}


if (require.main === module) { main(); }
