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


let JSZip = null;


function getJSZip() {
    if (JSZip === null) {
        process.noDeprecation = true; // Suppress a warning about JSZip
        JSZip = require(path.join(__dirname, '../ext/lib/jszip.min.js'));
        process.noDeprecation = false;
    }
    return JSZip;
}


function getArgs(args, argMap) {
    let key = null;
    let canKey = true;
    let onKey = false;
    for (const arg of args) {
        onKey = false;

        if (canKey && arg.startsWith('--')) {
            if (arg.length === 2) {
                canKey = false;
                key = null;
                onKey = false;
            } else {
                key = arg.substring(2);
                onKey = true;
            }
        }

        const target = argMap.get(key);
        if (typeof target === 'boolean') {
            argMap.set(key, true);
            key = null;
        } else if (typeof target === 'number') {
            argMap.set(key, target + 1);
            key = null;
        } else if (target === null || typeof target === 'string') {
            if (!onKey) {
                argMap.set(key, arg);
                key = null;
            }
        } else if (Array.isArray(target)) {
            if (!onKey) {
                target.push(arg);
                key = null;
            }
        } else {
            console.error(`Unknown argument: ${arg}`);
            key = null;
        }
    }

    return argMap;
}

function getAllFiles(baseDirectory, predicate=null) {
    const results = [];
    const directories = [baseDirectory];
    while (directories.length > 0) {
        const directory = directories.shift();
        const fileNames = fs.readdirSync(directory);
        for (const fileName of fileNames) {
            const fullFileName = path.join(directory, fileName);
            const relativeFileName = path.relative(baseDirectory, fullFileName);
            const stats = fs.lstatSync(fullFileName);
            if (stats.isFile()) {
                if (typeof predicate !== 'function' || predicate(relativeFileName)) {
                    results.push(relativeFileName);
                }
            } else if (stats.isDirectory()) {
                directories.push(fullFileName);
            }
        }
    }
    return results;
}

function createDictionaryArchive(dictionaryDirectory, dictionaryName) {
    const fileNames = fs.readdirSync(dictionaryDirectory);

    const JSZip2 = getJSZip();
    const archive = new JSZip2();

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


async function testMain(func, ...args) {
    try {
        await func(...args);
    } catch (e) {
        console.log(e);
        process.exit(-1);
    }
}


module.exports = {
    get JSZip() { return getJSZip(); },
    getArgs,
    getAllFiles,
    createDictionaryArchive,
    testMain
};
