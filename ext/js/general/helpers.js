/*
 * Copyright (C) 2023  Yomitan Authors
 * Copyright (C) 2016-2022  Yomichan Authors
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

import {readResponseJson} from '../core/json.js';

/**
 * @param {string} url
 * @returns {Promise<Response|string>}
 */

/**
 *
 * @param url
 */
export async function fetchAsset(url) {
    if (typeof global !== 'undefined') {
        const fs = require('fs');
        const path = require('path');

        return fs.readFileSync(path.resolve(__dirname + '/../..' + url), 'utf8');
    } else {
        url = chrome.runtime.getURL(url);
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'default',
            credentials: 'omit',
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        return response;
    }
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function fetchText(url) {
    if (typeof global === 'undefined') {
        const response = await fetchAsset(url);
        return await response.text();
    } else {
        return fetchAsset(url);
    }
}

/**
 * @template [T=unknown]
 * @param {string} url
 * @returns {Promise<T>}
 */
export async function fetchJson(url) {
    const response = await fetchAsset(url);
    return await readResponseJson(response);
}
