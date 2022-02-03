/*
 * Copyright (C) 2021-2022  Yomichan Authors
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
const {testMain} = require('../dev/util');
const {formatRulesJson, generateRules} = require('../dev/css-to-json-util');
const {getTargets} = require('../dev/generate-css-json');


function main() {
    for (const {cssFile, overridesCssFile, outputPath} of getTargets()) {
        const actual = fs.readFileSync(outputPath, {encoding: 'utf8'});
        const expected = formatRulesJson(generateRules(cssFile, overridesCssFile));
        assert.deepStrictEqual(actual, expected);
    }
}


if (require.main === module) {
    testMain(main, process.argv.slice(2));
}
