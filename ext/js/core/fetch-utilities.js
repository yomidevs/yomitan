/*
 * Copyright (C) 2024  Yomitan Authors
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

import {readResponseJson} from './json.js';

/**
 * @param {string} url
 * @returns {Promise<Response>}
 */
async function fetchAsset(url) {
    const response = await fetch(chrome.runtime.getURL(url), {
        method: 'GET',
        mode: 'no-cors',
        cache: 'default',
        credentials: 'omit',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return response;
}


/**
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function fetchText(url) {
    const response = await fetchAsset(url);
    return await response.text();
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
