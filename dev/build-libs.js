/*
 * Copyright (C) 2020-2021  Yomichan Authors
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

async function main() {
    const extLibPath = path.join(__dirname, '..', 'ext', 'mixed', 'lib');
    const parse5Path = require.resolve('parse5');

    const content = await new Promise((resolve, reject) => {
        browserify([parse5Path], {standalone: 'parse5', debug: true}).bundle((error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });

    fs.writeFileSync(path.join(extLibPath, 'parse5.js'), content);
}

main();
