/*
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

class Database {
    constructor() {
        this._db = null;
        this._isOpening = false;
    }

    async open(databaseName, version, structure) {
        if (this._db !== null) {
            throw new Error('Database already open');
        }
        if (this._isOpening) {
            throw new Error('Already opening');
        }

        try {
            this._isOpening = true;
            this._db = await this._open(databaseName, version, (db, transaction, oldVersion) => {
                this._upgrade(db, transaction, oldVersion, structure);
            });
        } finally {
            this._isOpening = false;
        }
    }

    close() {
        if (this._db === null) {
            throw new Error('Database is not open');
        }

        this._db.close();
        this._db = null;
    }

    isOpening() {
        return this._isOpening;
    }

    isOpen() {
        return this._db !== null;
    }

    transaction(storeNames, mode) {
        if (this._db === null) {
            throw new Error(this._isOpening ? 'Database not ready' : 'Database not open');
        }
        return this._db.transaction(storeNames, mode);
    }

    bulkAdd(objectStoreName, items, start, count) {
        return new Promise((resolve, reject) => {
            if (start + count > items.length) {
                count = items.length - start;
            }

            if (count <= 0) {
                resolve();
                return;
            }

            const transaction = this._readWriteTransaction([objectStoreName], resolve, reject);
            const objectStore = transaction.objectStore(objectStoreName);
            for (let i = start, ii = start + count; i < ii; ++i) {
                objectStore.add(items[i]);
            }
            transaction.commit();
        });
    }

    getAll(objectStoreOrIndex, query, onSuccess, onError, data) {
        if (typeof objectStoreOrIndex.getAll === 'function') {
            this._getAllFast(objectStoreOrIndex, query, onSuccess, onError, data);
        } else {
            this._getAllUsingCursor(objectStoreOrIndex, query, onSuccess, onError, data);
        }
    }

    getAllKeys(objectStoreOrIndex, query, onSuccess, onError) {
        if (typeof objectStoreOrIndex.getAllKeys === 'function') {
            this._getAllKeysFast(objectStoreOrIndex, query, onSuccess, onError);
        } else {
            this._getAllKeysUsingCursor(objectStoreOrIndex, query, onSuccess, onError);
        }
    }

    find(objectStoreName, indexName, query, predicate, predicateArg, defaultValue) {
        return new Promise((resolve, reject) => {
            const transaction = this.transaction([objectStoreName], 'readonly');
            const objectStore = transaction.objectStore(objectStoreName);
            const objectStoreOrIndex = indexName !== null ? objectStore.index(indexName) : objectStore;
            this.findFirst(objectStoreOrIndex, query, resolve, reject, null, predicate, predicateArg, defaultValue);
        });
    }

    findFirst(objectStoreOrIndex, query, resolve, reject, data, predicate, predicateArg, defaultValue) {
        const noPredicate = (typeof predicate !== 'function');
        const request = objectStoreOrIndex.openCursor(query, 'next');
        request.onerror = (e) => reject(e.target.error, data);
        request.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                const {value} = cursor;
                if (noPredicate || predicate(value, predicateArg)) {
                    resolve(value, data);
                } else {
                    cursor.continue();
                }
            } else {
                resolve(defaultValue, data);
            }
        };
    }

    bulkCount(targets, resolve, reject) {
        const targetCount = targets.length;
        if (targetCount <= 0) {
            resolve();
            return;
        }

        let completedCount = 0;
        const results = new Array(targetCount).fill(null);

        const onError = (e) => reject(e.target.error);
        const onSuccess = (e, index) => {
            const count = e.target.result;
            results[index] = count;
            if (++completedCount >= targetCount) {
                resolve(results);
            }
        };

        for (let i = 0; i < targetCount; ++i) {
            const index = i;
            const [objectStoreOrIndex, query] = targets[i];
            const request = objectStoreOrIndex.count(query);
            request.onerror = onError;
            request.onsuccess = (e) => onSuccess(e, index);
        }
    }

    delete(objectStoreName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this._readWriteTransaction([objectStoreName], resolve, reject);
            const objectStore = transaction.objectStore(objectStoreName);
            objectStore.delete(key);
            transaction.commit();
        });
    }

    bulkDelete(objectStoreName, indexName, query, filterKeys=null, onProgress=null) {
        return new Promise((resolve, reject) => {
            const transaction = this._readWriteTransaction([objectStoreName], resolve, reject);
            const objectStore = transaction.objectStore(objectStoreName);
            const objectStoreOrIndex = indexName !== null ? objectStore.index(indexName) : objectStore;

            const onGetKeys = (keys) => {
                try {
                    if (typeof filterKeys === 'function') {
                        keys = filterKeys(keys);
                    }
                    this._bulkDeleteInternal(objectStore, keys, onProgress);
                    transaction.commit();
                } catch (e) {
                    reject(e);
                }
            };

            this.getAllKeys(objectStoreOrIndex, query, onGetKeys, reject);
        });
    }

    static deleteDatabase(databaseName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(databaseName);
            request.onerror = (e) => reject(e.target.error);
            request.onsuccess = () => resolve();
            request.onblocked = () => reject(new Error('Database deletion blocked'));
        });
    }

    // Private

    _open(name, version, onUpgradeNeeded) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(name, version);

            request.onupgradeneeded = (event) => {
                try {
                    request.transaction.onerror = (e) => reject(e.target.error);
                    onUpgradeNeeded(request.result, request.transaction, event.oldVersion, event.newVersion);
                } catch (e) {
                    reject(e);
                }
            };

            request.onerror = (e) => reject(e.target.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    _upgrade(db, transaction, oldVersion, upgrades) {
        for (const {version, stores} of upgrades) {
            if (oldVersion >= version) { continue; }

            for (const [objectStoreName, {primaryKey, indices}] of Object.entries(stores)) {
                const existingObjectStoreNames = transaction.objectStoreNames || db.objectStoreNames;
                const objectStore = (
                    this._listContains(existingObjectStoreNames, objectStoreName) ?
                    transaction.objectStore(objectStoreName) :
                    db.createObjectStore(objectStoreName, primaryKey)
                );
                const existingIndexNames = objectStore.indexNames;

                for (const indexName of indices) {
                    if (this._listContains(existingIndexNames, indexName)) { continue; }

                    objectStore.createIndex(indexName, indexName, {});
                }
            }
        }
    }

    _listContains(list, value) {
        for (let i = 0, ii = list.length; i < ii; ++i) {
            if (list[i] === value) { return true; }
        }
        return false;
    }

    _getAllFast(objectStoreOrIndex, query, onSuccess, onReject, data) {
        const request = objectStoreOrIndex.getAll(query);
        request.onerror = (e) => onReject(e.target.error, data);
        request.onsuccess = (e) => onSuccess(e.target.result, data);
    }

    _getAllUsingCursor(objectStoreOrIndex, query, onSuccess, onReject, data) {
        const results = [];
        const request = objectStoreOrIndex.openCursor(query, 'next');
        request.onerror = (e) => onReject(e.target.error, data);
        request.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                results.push(cursor.value);
                cursor.continue();
            } else {
                onSuccess(results, data);
            }
        };
    }

    _getAllKeysFast(objectStoreOrIndex, query, onSuccess, onError) {
        const request = objectStoreOrIndex.getAllKeys(query);
        request.onerror = (e) => onError(e.target.error);
        request.onsuccess = (e) => onSuccess(e.target.result);
    }

    _getAllKeysUsingCursor(objectStoreOrIndex, query, onSuccess, onError) {
        const results = [];
        const request = objectStoreOrIndex.openKeyCursor(query, 'next');
        request.onerror = (e) => onError(e.target.error);
        request.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                results.push(cursor.primaryKey);
                cursor.continue();
            } else {
                onSuccess(results);
            }
        };
    }

    _bulkDeleteInternal(objectStore, keys, onProgress) {
        const count = keys.length;
        if (count === 0) { return; }

        let completedCount = 0;
        const onSuccess = () => {
            ++completedCount;
            try {
                onProgress(completedCount, count);
            } catch (e) {
                // NOP
            }
        };

        const hasProgress = (typeof onProgress === 'function');
        for (const key of keys) {
            const request = objectStore.delete(key);
            if (hasProgress) {
                request.onsuccess = onSuccess;
            }
        }
    }

    _readWriteTransaction(storeNames, resolve, reject) {
        const transaction = this.transaction(storeNames, 'readwrite');
        transaction.onerror = (e) => reject(e.target.error);
        transaction.onabort = () => reject(new Error('Transaction aborted'));
        transaction.oncomplete = () => resolve();
        return transaction;
    }
}
