/*
 * Copyright (C) 2023  Yomitan Authors
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

const destExtensionIds = [
    'pogpimfgfjodmnhpbpejcpbbhboaceco', // local chrome build
    'glnaenfapkkecknnmginabpmgkenenml', // chrome web store - dev build
    'likgccmbimhjbgkjambclfkhldnlhbnn' // chrome web store - stable build
];
const extensionResponses = new Map();
const destExtensionId = await (async () => {
    for (const id of destExtensionIds) {
        chrome.runtime.sendMessage(
            id,
            {action: 'hello', params: {}},
            (yomitanResponse) => {
                if (yomitanResponse !== undefined && yomitanResponse.result) {
                    extensionResponses.set(id, yomitanResponse.result);
                }
            }
        );
    }
    await (new Promise((r) => setTimeout(r, 2000)));
    if (extensionResponses.size === 0) {
        throw new Error('No instances of yomitan found running');
    } else if (extensionResponses.size > 1) {
        // ask the user which extension to use
        let i = 1;
        console.log('Multiple instances of yomitan found:');
        for (const [id, name] of extensionResponses) {
            console.log(`${i}. ${id}: ${name}`);
            i++;
        }
        let ext = prompt('Enter the number of which extension to export to:');
        if (ext === null || ext === '') {
            throw new Error('No extension selected');
        }
        ext = parseInt(ext, 10);
        if (Number.isNaN(ext) || ext < 1 || ext > extensionResponses.size) {
            throw new Error('Invalid extension selected');
        }
        return Array.from(extensionResponses.keys())[ext - 1];
    } else {
        return Array.from(extensionResponses.keys())[0];
    }
})();

console.log('Starting transfer to ' + destExtensionId + ': ' + extensionResponses.get(destExtensionId) + '...');

const db = window.indexedDB.open('dict');
db.onsuccess = () => {
    let total = 0;
    let completed = 0;
    const progress = () => {
        if (total === 0) {
            setTimeout(progress, 1000);
            return;
        }
        console.log('Progress: ' + Math.round(completed/total*100) + '%');
        if (completed === total) {
            console.log('DONE');
        } else {
            setTimeout(progress, 1000);
        }
    };
    progress();

    const tables = ['dictionaries', 'kanji', 'kanjiMeta', 'media', 'tagMeta', 'termMeta', 'terms'];
    for (const table of tables) {
        console.log(table, 'started...');
        const transaction = db.result.transaction(table, 'readonly');
        const os = transaction.objectStore(table);

        os.count().onsuccess = (e) => {
            total += e.target.result;
        };
        const batchSize = 5000;
        let keys, values, keyRange = null;

        const fetchMore = () => {
            // If there could be more results, fetch them
            if (keys && values && values.length === batchSize) {
                // Find keys greater than the last key
                keyRange = IDBKeyRange.lowerBound(keys.at(-1), true);
                // eslint-disable-next-line no-undefined
                keys = values = undefined;
                next();
            }
        };

        const next = () => {
            os.getAllKeys(keyRange, batchSize).onsuccess = (e) => {
                keys = e.target.result;
                fetchMore();
            };
            os.getAll(keyRange, batchSize).onsuccess = (e) => {
                values = e.target.result;
                // eslint-disable-next-line no-undefined
                if (values !== undefined) {
                    const len = values.length;
                    chrome.runtime.sendMessage(
                        destExtensionId, // yomitan extension ID
                        {action: 'dbBulkAdd', params: {objectStoreType: table, entries: values}},
                        (_yomitanResponse) => {
                            completed += len;
                        }
                    );
                    fetchMore();
                }
            };
        };

        next();
    }
};
