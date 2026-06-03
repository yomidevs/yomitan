/*
 * Copyright (C) 2023-2026  Yomitan Authors
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

import {readFileSync} from 'fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, join, resolve} from 'path';

const extDir = join(dirname(fileURLToPath(import.meta.url)), '../../ext');

/** @type {import('test/mocks').ChromeMock} */
export const chrome = {
    runtime: {
        getURL: (path) => {
            return pathToFileURL(join(extDir, path.replace(/^\//, ''))).href;
        },
    },
};

/**
 * @param {string} filePath
 * @returns {string}
 */
function getContentType(filePath) {
    if (filePath.endsWith('.json')) { return 'application/json'; }
    if (filePath.endsWith('.wasm')) { return 'application/wasm'; }
    if (filePath.endsWith('.mjs') || filePath.endsWith('.js')) { return 'text/javascript'; }
    if (filePath.endsWith('.css')) { return 'text/css'; }
    if (filePath.endsWith('.html')) { return 'text/html'; }
    if (filePath.endsWith('.svg')) { return 'image/svg+xml'; }
    if (filePath.endsWith('.ttf')) { return 'font/ttf'; }
    return 'application/octet-stream';
}

/**
 * @param {string|URL|Request} url
 * @returns {Promise<Response>}
 */
export async function fetch(url) {
    let requestUrl;
    if (typeof url === 'string') {
        requestUrl = url;
    } else if (url instanceof URL) {
        requestUrl = url.href;
    } else {
        requestUrl = url.url;
    }

    let filePath;
    try {
        filePath = fileURLToPath(requestUrl);
    } catch (e) {
        filePath = resolve(extDir, requestUrl.replace(/^[/\\]/, ''));
    }
    await Promise.resolve();
    const content = readFileSync(filePath, {encoding: null});
    return new Response(content, {
        status: 200,
        statusText: 'OK',
        headers: {'Content-Type': getContentType(filePath)},
    });
}
