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

import fs from 'fs';
import {fileURLToPath} from 'node:url';
import path from 'path';
import {describe, expect, test} from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNPRO_DIRECTORY = 'ext/js/background/bunpro/';

/**
 * @param {string} directory
 * @returns {string[]} Paths relative to the repository root, with forward slashes.
 */
function listSourceFiles(directory) {
    return fs.readdirSync(path.join(root, directory), {recursive: true, withFileTypes: true})
        .filter((entry) => entry.isFile() && /\.(js|ts|html|json)$/.test(entry.name))
        .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
        .filter((file) => !file.startsWith('ext/lib/'))
        .sort();
}

const sourceFiles = [...listSourceFiles('ext'), ...listSourceFiles('types'), ...listSourceFiles('test')];

/**
 * @param {string} moduleName
 * @returns {string[]}
 */
function findImporters(moduleName) {
    const importPattern = new RegExp(`from\\s+['"][^'"]*/${moduleName.replace('.', '\\.')}['"]`);
    return sourceFiles.filter((file) => importPattern.test(fs.readFileSync(path.join(root, file), {encoding: 'utf8'})));
}

describe('Bunpro import boundary', () => {
    test('only the backend and the client test import the client', () => {
        expect(findImporters('bunpro-client.js')).toStrictEqual(['ext/js/background/backend.js', 'test/bunpro-client.test.js']);
    });

    test('only the client and the protocol test import the protocol', () => {
        expect(findImporters('bunpro-protocol.js')).toStrictEqual([`${BUNPRO_DIRECTORY}bunpro-client.js`, 'test/bunpro-protocol.test.js']);
    });

    test('the request header is built only in the client', () => {
        const productFiles = sourceFiles.filter((file) => !file.startsWith('test/'));
        const namingFiles = productFiles.filter((file) => /Token token=/.test(fs.readFileSync(path.join(root, file), {encoding: 'utf8'})));
        expect(namingFiles).toStrictEqual([`${BUNPRO_DIRECTORY}bunpro-client.js`]);
    });

    test('the cookie name is read in the client and shown in the settings instructions', () => {
        const productFiles = sourceFiles.filter((file) => !file.startsWith('test/'));
        const namingFiles = productFiles.filter((file) => /frontend_api_token/.test(fs.readFileSync(path.join(root, file), {encoding: 'utf8'})));
        expect(namingFiles).toStrictEqual([`${BUNPRO_DIRECTORY}bunpro-client.js`, 'ext/settings.html']);
    });
});
