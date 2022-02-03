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
const path = require('path');
const {testMain} = require('./util');
const {formatRulesJson, generateRules} = require('./css-to-json-util');

function getTargets() {
    return [
        {
            cssFile: path.join(__dirname, '..', 'ext/css/structured-content.css'),
            overridesCssFile: path.join(__dirname, 'data/structured-content-overrides.css'),
            outputPath: path.join(__dirname, '..', 'ext/data/structured-content-style.json')
        },
        {
            cssFile: path.join(__dirname, '..', 'ext/css/display-pronunciation.css'),
            overridesCssFile: path.join(__dirname, 'data/display-pronunciation-overrides.css'),
            outputPath: path.join(__dirname, '..', 'ext/data/pronunciation-style.json')
        }
    ];
}

function main() {
    for (const {cssFile, overridesCssFile, outputPath} of getTargets()) {
        const json = formatRulesJson(generateRules(cssFile, overridesCssFile));
        fs.writeFileSync(outputPath, json, {encoding: 'utf8'});
    }
}


if (require.main === module) {
    testMain(main, process.argv.slice(2));
}


module.exports = {
    getTargets
};
