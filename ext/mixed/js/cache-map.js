/*
 * Copyright (C) 2020  Yomichan Authors
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
 * Class which caches a map of values using an arbitrary length path,
 * keeping the most recently accessed values.
 */
class CacheMap {
    /**
     * Creates a new CacheMap.
     * @param maxCount The maximum number of entries able to be stored in the cache.
     * @param create A function to create a value for the corresponding path.
     *   The signature is: create(...path)
     */
    constructor(maxCount, create) {
        if (!(
            typeof maxCount === 'number' &&
            Number.isFinite(maxCount) &&
            maxCount >= 0 &&
            Math.floor(maxCount) === maxCount
        )) {
            throw new Error('Invalid maxCount');
        }

        this._maxCount = maxCount;
        this._create = create;
        this._count = 0;
        this._map = new Map();
        this._listFirst = this._createNode(null, null);
        this._listLast = this._createNode(null, null);
        this._resetEndNodes();
    }

    /**
     * Returns the number of items in the cache.
     */
    get count() {
        return this._count;
    }

    /**
     * Returns the maximum number of items that can be added to the cache.
     */
    get maxCount() {
        return this._maxCount;
    }

    /**
     * Gets an item at the given path, if it exists. Otherwise, creates a new item
     * and adds it to the cache. If the count exceeds the maximum count, items will be removed.
     * @param path Arguments corresponding to the key of the cache.
     */
    get(...path) {
        let ii = path.length;
        if (ii === 0) { throw new Error('Invalid path'); }

        let map = this._map;
        let i = 0;
        for (; i < ii; ++i) {
            const map2 = map.get(path[i]);
            if (typeof map2 === 'undefined') { break; }
            map = map2;
        }

        if (i === ii) {
            // Found (map is now a node)
            this._updateRecency(map);
            return map.value;
        }

        // Create new
        const value = this._create(...path);

        // Create mapping
        --ii;
        for (; i < ii; ++i) {
            const map2 = new Map();
            map.set(path[i], map2);
            map = map2;
        }

        // Assign
        const node = this._createNode(value, path);
        this._addNode(node, this._listFirst);
        map.set(path[ii], node);
        ++this._count;

        this._updateCount();

        return value;
    }

    /**
     * Clears the cache.
     */
    clear() {
        this._map.clear();
        this._count = 0;
        this._resetEndNodes();
    }

    // Private

    _updateRecency(node) {
        this._removeNode(node);
        this._addNode(node, this._listFirst);
    }

    _updateCount() {
        for (let removeCount = this._count - this._maxCount; removeCount > 0; --removeCount) {
            const node = this._listLast.previous;
            this._removeNode(node);
            this._removeMapping(node.path);
            --this._count;
        }
    }

    _createNode(value, path) {
        return {value, path, previous: null, next: null};
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

    _removeMapping(path) {
        const ii = path.length - 1;
        let i = 0;
        const maps = [];
        let map = this._map;
        for (; i < ii; ++i) {
            const map2 = map.get(path[i]);
            if (typeof map2 === 'undefined') { return; }
            maps.push([map, map2]);
            map = map2;
        }

        // Delete node
        map.delete(path[ii]);

        // Clear empty paths
        for (i = ii - 1; i >= 0; --i) {
            let map2;
            [map, map2] = maps[i];
            if (map2.size > 0) { return; }
            map.delete(path[i]);
        }
    }

    _resetEndNodes() {
        this._listFirst.next = this._listLast;
        this._listLast.previous = this._listFirst;
    }
}
