/*
 * Copyright (C) 2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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


let JSZip = null;

function requireScript(fileName, exportNames, variables) {
    const absoluteFileName = path.join(__dirname, '..', fileName);
    const source = fs.readFileSync(absoluteFileName, {encoding: 'utf8'});
    const exportNamesString = Array.isArray(exportNames) ? exportNames.join(',') : '';
    const variablesArgumentName = '__variables__';
    let variableString = '';
    if (typeof variables === 'object' && variables !== null) {
        variableString = Object.keys(variables).join(',');
        variableString = `const {${variableString}} = ${variablesArgumentName};`;
    }
    return Function(variablesArgumentName, `'use strict';${variableString}${source}\n;return {${exportNamesString}};`)(variables);
}

function getJSZip() {
    if (JSZip === null) {
        process.noDeprecation = true; // Suppress a warning about JSZip
        JSZip = require(path.join(__dirname, '../ext/mixed/lib/jszip.min.js'));
        process.noDeprecation = false;
    }
    return JSZip;
}

function createTestDictionaryArchive(dictionary, dictionaryName) {
    const dictionaryDirectory = path.join(__dirname, 'data', 'dictionaries', dictionary);
    const fileNames = fs.readdirSync(dictionaryDirectory);

    const archive = new (getJSZip())();

    for (const fileName of fileNames) {
        const source = fs.readFileSync(path.join(dictionaryDirectory, fileName), {encoding: 'utf8'});
        const json = JSON.parse(source);
        if (fileName === 'index.json' && typeof dictionaryName === 'string') {
            json.title = dictionaryName;
        }
        archive.file(fileName, JSON.stringify(json, null, 0));
    }

    return archive;
}


module.exports = {
    requireScript,
    createTestDictionaryArchive,
    get JSZip() { return getJSZip(); }
};
