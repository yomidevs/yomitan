/*
 * Copyright (C) 2022  Yomichan Authors
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
const assert = require('assert');
const {getBuildTargets} = require('../dev/build-libs');

async function main() {
    try {
        for (const {path: path2, build} of getBuildTargets()) {
            let expectedContent = await build();
            if (typeof expectedContent !== 'string') {
                // Buffer
                expectedContent = expectedContent.toString('utf8');
            }
            const actualContent = fs.readFileSync(path2, {encoding: 'utf8'});
            assert.strictEqual(actualContent, expectedContent);
        }
    } catch (e) {
        console.error(e);
        process.exit(-1);
        return;
    }
    process.exit(0);
}

if (require.main === module) { main(); }
