/*
 * Copyright (C) 2020  Yomichan Authors
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
        if (/\.json$/.test(fileName)) {
            const content = fs.readFileSync(path.join(dictionaryDirectory, fileName), {encoding: 'utf8'});
            const json = JSON.parse(content);
            if (fileName === 'index.json' && typeof dictionaryName === 'string') {
                json.title = dictionaryName;
            }
            archive.file(fileName, JSON.stringify(json, null, 0));
        } else {
            const content = fs.readFileSync(path.join(dictionaryDirectory, fileName), {encoding: null});
            archive.file(fileName, content);
        }
    }

    return archive;
}

function getAllFiles(baseDirectory, predicate=null) {
    const results = [];
    const directories = [path.resolve(baseDirectory)];
    while (directories.length > 0) {
        const directory = directories.shift();
        for (const fileName of fs.readdirSync(directory)) {
            const fullFileName = path.resolve(directory, fileName);
            const stats = fs.statSync(fullFileName);
            if (stats.isFile()) {
                if (typeof predicate !== 'function' || predicate(fullFileName, directory, baseDirectory)) {
                    results.push(fullFileName);
                }
            } else if (stats.isDirectory()) {
                directories.push(fullFileName);
            }
        }
    }
    return results;
}


module.exports = {
    createTestDictionaryArchive,
    getAllFiles,
    get JSZip() { return getJSZip(); }
};
