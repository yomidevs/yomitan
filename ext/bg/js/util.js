/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
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

function utilAsync(func) {
    return function(...args) {
        func.apply(this, args);
    };
}

function utilIsolate(data) {
    return JSON.parse(JSON.stringify(data));
}

function utilSetEqual(setA, setB) {
    if (setA.size !== setB.size) {
        return false;
    }

    for (const value of setA) {
        if (!setB.has(value)) {
            return false;
        }
    }

    return true;
}

function utilSetIntersection(setA, setB) {
    return new Set(
        [...setA].filter(value => setB.has(value))
    );
}

function utilSetDifference(setA, setB) {
    return new Set(
        [...setA].filter(value => !setB.has(value))
    );
}

function utilStringHashCode(string) {
    let hashCode = 0;

    for (let i = 0, charCode = string.charCodeAt(i); i < string.length; charCode = string.charCodeAt(++i)) {
        hashCode = ((hashCode << 5) - hashCode) + charCode;
        hashCode |= 0;
    }

    return hashCode;
}

function utilBackend() {
    return chrome.extension.getBackgroundPage().yomichan_backend;
}

function utilAnkiGetModelNames() {
    return utilBackend().anki.getModelNames();
}

function utilAnkiGetDeckNames() {
    return utilBackend().anki.getDeckNames();
}

function utilDatabaseSummarize() {
    return utilBackend().translator.database.summarize();
}

function utilAnkiGetModelFieldNames(modelName) {
    return utilBackend().anki.getModelFieldNames(modelName);
}

function utilDatabasePurge() {
    return utilBackend().translator.database.purge();
}

async function utilDatabaseImport(data, progress, exceptions) {
    // Edge cannot read data on the background page due to the File object
    // being created from a different window. Read on the same page instead.
    if (EXTENSION_IS_BROWSER_EDGE) {
        data = await utilReadFile(data);
    }
    return utilBackend().translator.database.importDictionary(data, progress, exceptions);
}

function utilReadFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsBinaryString(file);
    });
}

function utilIsObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
