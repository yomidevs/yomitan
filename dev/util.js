/*
 * Copyright (C) 2023  Yomitan Authors
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

import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

export function getArgs(args, argMap) {
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

export function getAllFiles(baseDirectory, predicate=null) {
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

export function createDictionaryArchive(dictionaryDirectory, dictionaryName) {
    const fileNames = fs.readdirSync(dictionaryDirectory);

    // const zipFileWriter = new BlobWriter();
    // const zipWriter = new ZipWriter(zipFileWriter);
    const archive = new JSZip();

    for (const fileName of fileNames) {
        if (/\.json$/.test(fileName)) {
            const content = fs.readFileSync(path.join(dictionaryDirectory, fileName), {encoding: 'utf8'});
            const json = JSON.parse(content);
            if (fileName === 'index.json' && typeof dictionaryName === 'string') {
                json.title = dictionaryName;
            }
            archive.file(fileName, JSON.stringify(json, null, 0));

            // await zipWriter.add(fileName, new TextReader(JSON.stringify(json, null, 0)));
        } else {
            const content = fs.readFileSync(path.join(dictionaryDirectory, fileName), {encoding: null});
            archive.file(fileName, content);

            // console.log('adding');
            // const r = new TextReader(content);
            // console.log(r.readUint8Array(0, 10));
            // console.log('reader done');
            // await zipWriter.add(fileName, r);
            // console.log('??');
        }
    }
    // await zipWriter.close();

    // Retrieves the Blob object containing the zip content into `zipFileBlob`. It
    // is also returned by zipWriter.close() for more convenience.
    // const zipFileBlob = await zipFileWriter.getData();
    return archive;

    // return zipFileBlob;
}

export async function testMain(func, ...args) {
    try {
        await func(...args);
    } catch (e) {
        console.log(e);
        process.exit(-1);
    }
}
