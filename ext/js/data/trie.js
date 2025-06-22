/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

/**
 * Trie Node.
 */
export class TrieNode {
    constructor() {
        /** @type {{[key: string]: TrieNode}} */
        this._children = {};
        /** @type {boolean} */
        this._isEnd = false;
    }

    /** @returns {{[key:string]: TrieNode}} */
    get children() {
        return this._children;
    }

    /** @returns {boolean} */
    get isEnd() {
        return this._isEnd;
    }

    /** @param {boolean} value */
    set isEnd(value) {
        this._isEnd = value;
    }
}

/**
 * Trie data structure for storing and searching strings efficiently.
 */
export class Trie {
    constructor() {
        /** @type {TrieNode} */
        this._root = new TrieNode();
        /** @type {number} */
        this._size = 0;
    }

    /**
     * @param {string} word
     * @returns {void}
     * @throws {TypeError}
     */
    insert(word) {
        if (typeof word !== 'string') {
            throw new TypeError('Word must be a string');
        }
        if (word.length === 0) {
            return;
        }
        let currNode = this._root;
        for (const ch of word) {
            if (!currNode.children[ch]) {
                currNode.children[ch] = new TrieNode();
            }
            currNode = currNode.children[ch];
        }
        if (!currNode.isEnd) {
            currNode.isEnd = true;
            this._size++;
        }
    }

    /**
     * Returns autocomplete suggestions for a given prefix.
     * @param {string} prefix The prefix to search for.
     * @param {number} [limit=10] The maximum number of suggestions to return.
     * @returns {string[]} An array of suggested words.
     */
    getSuggestions(prefix, limit = 10) {
        if (typeof prefix !== 'string') {
            return [];
        }
        if (typeof limit !== 'number' || limit < 0) {
            limit = 10;
        }
        /** @type {string[]} */
        const results = [];

        /** @type {TrieNode} */
        let currNode = this._root;
        for (const ch of prefix) {
            if (!currNode.children[ch]) {
                return results;
            }
            currNode = currNode.children[ch];
        }

        /**
         * Depth-first search to collect words from currentNode.
         * @param {TrieNode} node Current node in the trie.
         * @param {string} path Current path (prefix + accumulated characters).
         * @returns {void}
         */
        const dfs = (node, path) => {
            if (results.length >= limit) { return; }
            if (node.isEnd) {
                results.push(path);
            }
            for (const [char, child] of Object.entries(node.children)) {
                dfs(child, path + char);
            }
        };
        dfs(currNode, prefix);
        return results;
    }

    /**
     * @param {string} word
     * @returns {boolean}
     */
    search(word) {
        if (typeof word !== 'string') {
            return false;
        }

        let currNode = this._root;
        for (const ch of word) {
            if (!currNode.children[ch]) {
                return false;
            }
            currNode = currNode.children[ch];
        }
        return currNode.isEnd;
    }

    /**
     * @param {string} prefix
     * @returns {boolean}
     */
    startsWith(prefix) {
        if (typeof prefix !== 'string') {
            return false;
        }

        let currNode = this._root;
        for (const ch of prefix) {
            if (!currNode.children[ch]) {
                return false;
            }
            currNode = currNode.children[ch];
        }
        return true;
    }

    /**
     * Deletes a word from the trie.
     * @param {string} word
     * @returns {boolean}
     */
    delete(word) {
        if (typeof word !== 'string' || word.length === 0) {
            return false;
        }

        return this._deleteHelper(this._root, word, 0);
    }

    /**
     * Helper method for deleting a word from the trie.
     * @param {TrieNode} node Current node.
     * @param {string} word Word to delete.
     * @param {number} idx Current character index.
     * @returns {boolean} True if the word was deleted.
     */
    _deleteHelper(node, word, idx) {
        if (idx === word.length) {
            if (node.isEnd) {
                node.isEnd = false;
                this._size--;
                return true;
            }
            return false;
        }
        const char = word[idx];
        const childNode = node.children[char];
        if (!childNode) {
            return false;
        }
        const shouldDeleteChild = this._deleteHelper(childNode, word, idx + 1);
        if (shouldDeleteChild && !childNode.isEnd && Object.keys(childNode.children).length === 0) {
            delete node.children[char];
        }
        return shouldDeleteChild;
    }

    /** @returns {number} */
    size() {
        return this._size;
    }

    /**
     * Clears all words from the trie.
     * @returns {void}
     */
    clear() {
        this._root = new TrieNode();
        this._size = 0;
    }

    // Testing functions

    /** @returns {string[]} */
    getAllWords() {
        /** @type {string[]} */
        const words = [];
        /**
         * @param {TrieNode} node Current node in the trie.
         * @param {string} path Current path (prefix + accumulated characters).
         */
        const dfs = (node, path) => {
            if (node.isEnd) {
                words.push(path);
            }
            // Sort keys for consistent ordering
            const sortedKeys = Object.keys(node.children).sort();
            for (const ch of sortedKeys) {
                dfs(node.children[ch], path + ch);
            }
        };
        dfs(this._root, '');
        return words;
    }

    /** @returns {boolean}*/
    isEmpty() {
        return this._size === 0;
    }

    /** @returns {number} */
    getHeight() {
        /**
         * @param {TrieNode} node Current node.
         * @returns {number} Height of the subtree rooted at node.
         */
        const getHeightHelper = (node) => {
            if (Object.keys(node.children).length === 0) {
                return 0;
            }
            let maxHeight = 0;
            for (const child of Object.values(node.children)) {
                maxHeight = Math.max(maxHeight, getHeightHelper(child));
            }
            return maxHeight + 1;
        };
        return getHeightHelper(this._root);
    }

    /** @returns {number} */
    getNodeCount() {
        /**
         * @param {TrieNode} node
         * @returns {number}
         */
        const countNodes = (node) => {
            let count = 1;
            for (const child of Object.values(node.children)) {
                count += countNodes(child);
            }
            return count;
        };
        return countNodes(this._root);
    }

    /** @returns {string} */
    toString() {
        const words = this.getAllWords();
        return `Trie(size=${this._size}, words=[${words.join(', ')}])`;
    }

    /**
     * Serializes the trie to a JSON string.
     * @returns {string}
     */
    serialize() {
        return JSON.stringify(this._root);
    }

    /**
     * Deserializes a trie from a JSON string or object.
     * @param {string|object} data
     * @returns {Trie}
     */
    static deserialize(data) {
        /**
         * @param {any} obj
         * @returns {TrieNode}
         */
        const revive = (obj) => {
            const node = new TrieNode();
            node._isEnd = obj && (obj._isEnd || obj.isEnd) || false;
            const children = obj && (obj._children || obj.children) || {};
            for (const key in children) {
                node._children[key] = revive(children[key]);
            }
            return node;
        };
        const trie = new Trie();
        const rootObj = typeof data === 'string' ? JSON.parse(data) : data;
        trie._root = revive(rootObj);
        return trie;
    }
}
