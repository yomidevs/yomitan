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
const browserify = require('browserify');

async function buildParse5() {
    const parse5Path = require.resolve('parse5');
    const cwd = process.cwd();
    try {
        const baseDir = path.dirname(parse5Path);
        process.chdir(baseDir); // This is necessary to ensure relative source map file names are consistent
        return await new Promise((resolve, reject) => {
            browserify({
                entries: [parse5Path],
                standalone: 'parse5',
                debug: true,
                baseDir
            }).bundle((error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    } finally {
        process.chdir(cwd);
    }
}

function getBuildTargets() {
    const extLibPath = path.join(__dirname, '..', 'ext', 'lib');
    return [
        {path: path.join(extLibPath, 'parse5.js'), build: buildParse5}
    ];
}

async function main() {
    for (const {path: path2, build} of getBuildTargets()) {
        const content = await build();
        fs.writeFileSync(path2, content);
    }
}

if (require.main === module) { main(); }

module.exports = {
    getBuildTargets
};
