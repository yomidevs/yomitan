/*
 * Copyright (C) 2020-2021  Yomichan Authors
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

/**
 * Class which caches a map of values, keeping the most recently accessed values.
 */
class CacheMap {
    /**
     * Creates a new CacheMap.
     * @param maxSize The maximum number of entries able to be stored in the cache.
     */
    constructor(maxSize) {
        if (!(
            typeof maxSize === 'number' &&
            Number.isFinite(maxSize) &&
            maxSize >= 0 &&
            Math.floor(maxSize) === maxSize
        )) {
            throw new Error('Invalid maxCount');
        }

        this._maxSize = maxSize;
        this._map = new Map();
        this._listFirst = this._createNode(null, null);
        this._listLast = this._createNode(null, null);
        this._resetEndNodes();
    }

    /**
     * Returns the number of items in the cache.
     */
    get size() {
        return this._map.size;
    }

    /**
     * Returns the maximum number of items that can be added to the cache.
     */
    get maxSize() {
        return this._maxSize;
    }

    /**
     * Returns whether or not an element exists at the given key.
     * @param key The key of the element.
     * @returns `true` if an element with the specified key exists, `false` otherwise.
     */
    has(key) {
        return this._map.has(key);
    }

    /**
     * Gets an element at the given key, if it exists. Otherwise, returns undefined.
     * @param key The key of the element.
     * @returns The existing value at the key, if any; `undefined` otherwise.
     */
    get(key) {
        const node = this._map.get(key);
        if (typeof node === 'undefined') { return void 0; }
        this._updateRecency(node);
        return node.value;
    }

    /**
     * Sets a value at a given key.
     * @param key The key of the element.
     * @param value The value to store in the cache.
     */
    set(key, value) {
        let node = this._map.get(key);
        if (typeof node !== 'undefined') {
            this._updateRecency(node);
            node.value = value;
        } else {
            if (this._maxSize <= 0) { return; }

            node = this._createNode(key, value);
            this._addNode(node, this._listFirst);
            this._map.set(key, node);

            // Remove
            for (let removeCount = this._map.size - this._maxSize; removeCount > 0; --removeCount) {
                node = this._listLast.previous;
                this._removeNode(node);
                this._map.delete(node.key);
            }
        }
    }

    /**
     * Clears the cache.
     */
    clear() {
        this._map.clear();
        this._resetEndNodes();
    }

    // Private

    _updateRecency(node) {
        this._removeNode(node);
        this._addNode(node, this._listFirst);
    }

    _createNode(key, value) {
        return {key, value, previous: null, next: null};
    }

    _addNode(node, previous) {
        const next = previous.next;
        node.next = next;
        node.previous = previous;
        previous.next = node;
        next.previous = node;
    }

    _removeNode(node) {
        node.next.previous = node.previous;
        node.previous.next = node.next;
    }

    _resetEndNodes() {
        this._listFirst.next = this._listLast;
        this._listLast.previous = this._listFirst;
    }
}
