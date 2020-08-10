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


function getAllFiles(baseDirectory, relativeTo=null, predicate=null) {
    const results = [];
    const directories = [baseDirectory];
    while (directories.length > 0) {
        const directory = directories.shift();
        const fileNames = fs.readdirSync(directory);
        for (const fileName of fileNames) {
            const fullFileName = path.join(directory, fileName);
            const relativeFileName = (relativeTo !== null ? path.relative(relativeTo, fullFileName) : fullFileName);
            const stats = fs.lstatSync(fullFileName);
            if (stats.isFile()) {
                if (typeof predicate !== 'function' || predicate(fullFileName, directory, baseDirectory)) {
                    results.push(relativeFileName);
                }
            } else if (stats.isDirectory()) {
                directories.push(fullFileName);
            }
        }
    }
    return results;
}

function getDefaultManifest() {
    const {manifest} = getDefaultManifestAndVariants();
    return manifest;
}

function getDefaultManifestAndVariants() {
    const fileName = path.join(__dirname, 'data', 'manifest-variants.json');
    const {manifest, variants} = JSON.parse(fs.readFileSync(fileName));
    return {manifest, variants};
}

function createManifestString(manifest) {
    return JSON.stringify(manifest, null, 4) + '\n';
}


module.exports = {
    get JSZip() { return getJSZip(); },
    getAllFiles,
    getDefaultManifest,
    getDefaultManifestAndVariants,
    createManifestString
};
