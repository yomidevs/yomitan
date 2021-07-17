/*
 * Copyright (C) 2021  Yomichan Authors
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
const {formatRulesJson, generateRules: generateRulesGeneric} = require('./css-to-json-util');

function generateRules() {
    const cssFile = path.join(__dirname, '..', 'ext/css/structured-content.css');
    const cssFileOverrides = path.join(__dirname, 'data/structured-content-overrides.css');
    return generateRulesGeneric(cssFile, cssFileOverrides);
}

function generateRulesJson() {
    return formatRulesJson(generateRules());
}

function getOutputPath() {
    return path.join(__dirname, '..', 'ext/data/structured-content-style.json');
}

function main() {
    const outputFileName = getOutputPath();
    const json = generateRulesJson();
    fs.writeFileSync(outputFileName, json, {encoding: 'utf8'});
}


if (require.main === module) {
    testMain(main, process.argv.slice(2));
}


module.exports = {
    generateRules,
    generateRulesJson,
    getOutputPath
};
