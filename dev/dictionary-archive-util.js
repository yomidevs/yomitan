/*
 * Copyright (C) 2024-2025  Yomitan Authors
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

import {BlobWriter, TextReader, TextWriter, Uint8ArrayReader, ZipReader, ZipWriter} from '@zip.js/zip.js';
import {readFileSync, readdirSync} from 'fs';
import {join} from 'path';
import {parseJson} from './json.js';

/**
 * Creates a zip archive from the given dictionary directory.
 * @param {string} dictionaryDirectory
 * @param {string} [dictionaryName]
 * @returns {Promise<ArrayBuffer>}
 */
export async function createDictionaryArchiveData(dictionaryDirectory, dictionaryName) {
    const fileNames = readdirSync(dictionaryDirectory);
    const zipFileWriter = new BlobWriter();
    // Level 0 compression used since decompression in the node environment is not supported.
    // See dev/lib/zip.js for more details.
    const zipWriter = new ZipWriter(zipFileWriter, {
        level: 0,
    });
    for (const fileName of fileNames) {
        if (/\.json$/.test(fileName)) {
            const content = readFileSync(join(dictionaryDirectory, fileName), {encoding: 'utf8'});
            /** @type {import('dictionary-data').Index} */
            const json = parseJson(content);
            if (fileName === 'index.json' && typeof dictionaryName === 'string') {
                json.title = dictionaryName;
            }
            await zipWriter.add(fileName, new TextReader(JSON.stringify(json, null, 0)));
        } else {
            const content = readFileSync(join(dictionaryDirectory, fileName), {encoding: null});
            await zipWriter.add(fileName, new Blob([content]).stream());
        }
    }
    const blob = await zipWriter.close();
    return await blob.arrayBuffer();
}

/**
 * @param {import('@zip.js/zip.js').Entry} entry
 * @returns {Promise<string>}
 */
export async function readArchiveEntryDataString(entry) {
    if (typeof entry.getData === 'undefined') { throw new Error('Cannot get index data'); }
    return await entry.getData(new TextWriter());
}

/**
 * @template [T=unknown]
 * @param {import('@zip.js/zip.js').Entry} entry
 * @returns {Promise<T>}
 */
export async function readArchiveEntryDataJson(entry) {
    const indexContent = await readArchiveEntryDataString(entry);
    return parseJson(indexContent);
}

/**
 * @param {ArrayBuffer} data
 * @returns {Promise<import('@zip.js/zip.js').Entry[]>}
 */
export async function getDictionaryArchiveEntries(data) {
    const zipFileReader = new Uint8ArrayReader(new Uint8Array(data));
    const zipReader = new ZipReader(zipFileReader);
    return await zipReader.getEntries();
}

/**
 * @template T
 * @param {import('@zip.js/zip.js').Entry[]} entries
 * @param {string} fileName
 * @returns {Promise<T>}
 */
export async function getDictionaryArchiveJson(entries, fileName) {
    const entry = entries.find((item) => item.filename === fileName);
    if (typeof entry === 'undefined') { throw new Error(`File not found: ${fileName}`); }
    return await readArchiveEntryDataJson(entry);
}

/**
 * @returns {string}
 */
export function getIndexFileName() {
    return 'index.json';
}

/**
 * @param {ArrayBuffer} data
 * @returns {Promise<import('dictionary-data').Index>}
 */
export async function getDictionaryArchiveIndex(data) {
    const entries = await getDictionaryArchiveEntries(data);
    return await getDictionaryArchiveJson(entries, getIndexFileName());
}
