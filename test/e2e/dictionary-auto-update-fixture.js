/*
 * Copyright (C) 2026  Yomitan Authors
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

import os from 'node:os';
import path from 'node:path';
import {copyFile, mkdtemp, readdir, readFile, rm, mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parseJson} from '../../ext/js/core/json.js';
import {createDictionaryArchiveData} from '../../dev/dictionary-archive-util.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..', '..');
const sourceDictionaryDirectory = path.join(root, 'test', 'data', 'dictionaries', 'valid-dictionary1');
const minimalTermBankEntries = [
    ['読む', 'よむ', '', '', 100, ['to read'], 1, ''],
    ['強み', 'つよみ', '', '', 90, ['strong point'], 2, ''],
];
/** @type {[string, unknown][]} */
const minimalDictionaryDataFiles = [
    ['term_bank_1.json', minimalTermBankEntries],
    ['term_bank_2.json', []],
    ['term_meta_bank_1.json', []],
    ['kanji_bank_1.json', []],
    ['kanji_meta_bank_1.json', []],
];
const mediaFixtureFiles = [
    'aosaba_auto.png',
    'aosaba_mono.png',
    'character.gif',
    'character2.gif',
    'character3.gif',
    'image.gif',
];

export const autoUpdateDictionaryFixtureTitles = {
    initial: 'Auto Update Dictionary',
    updated: 'Auto Update Dictionary Updated',
};

export const autoUpdateDictionaryFixtureSettings = {
    alias: 'Custom Auto Update Alias',
    ankiFieldValue: 'auto-update-dictionary-term auto-update-dictionary-reading',
    updatedAnkiFieldValue: 'auto-update-dictionary-updated-term auto-update-dictionary-updated-reading',
};

/**
 * @param {string} sourceDirectory
 * @param {string} targetDirectory
 * @returns {Promise<void>}
 */
async function copyDirectoryFlat(sourceDirectory, targetDirectory) {
    await mkdir(targetDirectory, {recursive: true});
    const entries = await readdir(sourceDirectory, {withFileTypes: true});
    for (const entry of entries) {
        const sourcePath = path.join(sourceDirectory, entry.name);
        const targetPath = path.join(targetDirectory, entry.name);
        if (entry.isDirectory()) {
            await copyDirectoryFlat(sourcePath, targetPath);
            continue;
        }
        await copyFile(sourcePath, targetPath);
    }
}

/**
 * @param {string} directory
 * @param {{
 *   title: string,
 *   revision: string,
 *   indexUrl: string,
 *   downloadUrl: string,
 *   styles: string
 * }} definition
 * @returns {Promise<{archivePath: string, archiveBuffer: Buffer, indexContent: import('dictionary-data').Index}>}
 */
async function createDictionaryVersionArchive(directory, definition) {
    await copyDirectoryFlat(sourceDictionaryDirectory, directory);
    const indexPath = path.join(directory, 'index.json');
    const rawIndex = await readFile(indexPath, 'utf8');
    /** @type {import('dictionary-data').Index} */
    const indexContent = parseJson(rawIndex);
    indexContent.title = definition.title;
    indexContent.revision = definition.revision;
    indexContent.isUpdatable = true;
    indexContent.indexUrl = definition.indexUrl;
    indexContent.downloadUrl = definition.downloadUrl;
    await writeFile(indexPath, `${JSON.stringify(indexContent, null, 4)}\n`, 'utf8');
    await writeFile(path.join(directory, 'styles.css'), definition.styles, 'utf8');
    for (const [fileName, content] of minimalDictionaryDataFiles) {
        await writeFile(path.join(directory, fileName), `${JSON.stringify(content, null, 4)}\n`, 'utf8');
    }
    for (const fileName of mediaFixtureFiles) {
        await rm(path.join(directory, fileName), {force: true});
    }
    const archiveBuffer = Buffer.from(await createDictionaryArchiveData(directory));
    const archivePath = `${directory}.zip`;
    await writeFile(archivePath, archiveBuffer);
    return {archivePath, archiveBuffer, indexContent};
}

/**
 * @param {string} baseUrl
 * @returns {Promise<{
 *   importZipPath: string,
 *   oldIndexUrl: string,
 *   newIndexUrl: string,
 *   oldIndexPath: string,
 *   newIndexPath: string,
 *   oldArchivePath: string,
 *   newArchivePath: string,
 *   oldEtag: string,
 *   newEtag: string,
 *   oldLastModified: string,
 *   newLastModified: string,
 *   initialTitle: string,
 *   updatedTitle: string,
 *   versions: {
 *     v1: {archivePath: string, archiveBuffer: Buffer, indexContent: import('dictionary-data').Index},
 *     v2: {archivePath: string, archiveBuffer: Buffer, indexContent: import('dictionary-data').Index}
 *   },
 *   cleanup: () => Promise<void>
 * }>}
 */
export async function createAutoUpdateDictionaryFixture(baseUrl) {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'manabitan-auto-update-'));
    const oldIndexPath = '/auto-update/v1/index.json';
    const newIndexPath = '/auto-update/v2/index.json';
    const oldArchivePath = '/auto-update/v1/dictionary.zip';
    const newArchivePath = '/auto-update/v2/dictionary.zip';
    const oldIndexUrl = `${baseUrl}${oldIndexPath}`;
    const newIndexUrl = `${baseUrl}${newIndexPath}`;
    const oldArchiveUrl = `${baseUrl}${oldArchivePath}`;
    const newArchiveUrl = `${baseUrl}${newArchivePath}`;

    const v1 = await createDictionaryVersionArchive(path.join(tempRoot, 'v1'), {
        title: autoUpdateDictionaryFixtureTitles.initial,
        revision: '1',
        indexUrl: oldIndexUrl,
        downloadUrl: oldArchiveUrl,
        styles: 'body { color: #114488; }\n',
    });
    const v2 = await createDictionaryVersionArchive(path.join(tempRoot, 'v2'), {
        title: autoUpdateDictionaryFixtureTitles.updated,
        revision: '2',
        indexUrl: newIndexUrl,
        downloadUrl: newArchiveUrl,
        styles: 'body { color: #881144; }\n',
    });

    return {
        importZipPath: v1.archivePath,
        oldIndexUrl,
        newIndexUrl,
        oldIndexPath,
        newIndexPath,
        oldArchivePath,
        newArchivePath,
        oldEtag: '"manabitan-auto-update-v1"',
        newEtag: '"manabitan-auto-update-v2"',
        oldLastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
        newLastModified: 'Tue, 02 Jan 2024 00:00:00 GMT',
        initialTitle: autoUpdateDictionaryFixtureTitles.initial,
        updatedTitle: autoUpdateDictionaryFixtureTitles.updated,
        versions: {v1, v2},
        cleanup: async () => {
            await rm(tempRoot, {recursive: true, force: true});
        },
    };
}
