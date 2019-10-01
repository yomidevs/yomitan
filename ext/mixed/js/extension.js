/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


// toIterable is required on Edge for cross-window origin objects.
function toIterable(value) {
    if (typeof Symbol !== 'undefined' && typeof value[Symbol.iterator] !== 'undefined') {
        return value;
    }

    if (value !== null && typeof value === 'object') {
        const length = value.length;
        if (typeof length === 'number' && Number.isFinite(length)) {
            const array = [];
            for (let i = 0; i < length; ++i) {
                array.push(value[i]);
            }
            return array;
        }
    }

    throw 'Could not convert to iterable';
}

function extensionHasChrome() {
    try {
        return typeof chrome === 'object' && chrome !== null;
    } catch (e) {
        return false;
    }
}

function extensionHasBrowser() {
    try {
        return typeof browser === 'object' && browser !== null;
    } catch (e) {
        return false;
    }
}

const EXTENSION_IS_BROWSER_EDGE = (
    extensionHasBrowser() &&
    (!extensionHasChrome() || (typeof chrome.runtime === 'undefined' && typeof browser.runtime !== 'undefined'))
);

if (EXTENSION_IS_BROWSER_EDGE) {
    // Edge does not have chrome defined.
    chrome = browser;
}
