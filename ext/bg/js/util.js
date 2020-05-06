/*
 * Copyright (C) 2016-2020  Yomichan Authors
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

function utilIsolate(value) {
    if (value === null) { return null; }

    switch (typeof value) {
        case 'boolean':
        case 'number':
        case 'string':
        case 'bigint':
        case 'symbol':
            return value;
    }

    const stringValue = JSON.stringify(value);
    return typeof stringValue === 'string' ? JSON.parse(stringValue) : null;
}

function utilFunctionIsolate(func) {
    return function isolatedFunction(...args) {
        try {
            args = args.map((v) => utilIsolate(v));
            return func.call(this, ...args);
        } catch (e) {
            try {
                String(func);
            } catch (e2) {
                // Dead object
                return;
            }
            throw e;
        }
    };
}

function utilBackgroundIsolate(data) {
    const backgroundPage = chrome.extension.getBackgroundPage();
    return backgroundPage.utilIsolate(data);
}

function utilBackgroundFunctionIsolate(func) {
    const backgroundPage = chrome.extension.getBackgroundPage();
    return backgroundPage.utilFunctionIsolate(func);
}

function utilBackend() {
    const backend = chrome.extension.getBackgroundPage().yomichanBackend;
    if (!backend.isPrepared()) {
        throw new Error('Backend not ready yet');
    }
    return backend;
}

function utilReadFileArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}
