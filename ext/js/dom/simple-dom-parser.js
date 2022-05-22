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

/* globals
 * parse5
 */

class SimpleDOMParser {
    constructor(content) {
        this._document = parse5.parse(content);
        this._patternHtmlWhitespace = /[\t\r\n\f ]+/g;
    }

    getElementById(id, root=null) {
        for (const node of this._allNodes(root)) {
            if (typeof node.tagName === 'string' && this.getAttribute(node, 'id') === id) {
                return node;
            }
        }
        return null;
    }

    getElementByTagName(tagName, root=null) {
        for (const node of this._allNodes(root)) {
            if (node.tagName === tagName) {
                return node;
            }
        }
        return null;
    }

    getElementsByTagName(tagName, root=null) {
        const results = [];
        for (const node of this._allNodes(root)) {
            if (node.tagName === tagName) {
                results.push(node);
            }
        }
        return results;
    }

    getElementsByClassName(className, root=null) {
        const results = [];
        for (const node of this._allNodes(root)) {
            if (typeof node.tagName === 'string') {
                const nodeClassName = this.getAttribute(node, 'class');
                if (nodeClassName !== null && this._hasToken(nodeClassName, className)) {
                    results.push(node);
                }
            }
        }
        return results;
    }

    getAttribute(element, attribute) {
        for (const attr of element.attrs) {
            if (
                attr.name === attribute &&
                typeof attr.namespace === 'undefined'
            ) {
                return attr.value;
            }
        }
        return null;
    }

    getTextContent(element) {
        let source = '';
        for (const node of this._allNodes(element)) {
            if (node.nodeName === '#text') {
                source += node.value;
            }
        }
        return source;
    }

    static isSupported() {
        return typeof parse5 !== 'undefined';
    }

    // Private

    *_allNodes(root) {
        if (root === null) {
            root = this._document;
        }

        // Depth-first pre-order traversal
        const nodeQueue = [root];
        while (nodeQueue.length > 0) {
            const node = nodeQueue.pop();

            yield node;

            const childNodes = node.childNodes;
            if (typeof childNodes !== 'undefined') {
                for (let i = childNodes.length - 1; i >= 0; --i) {
                    nodeQueue.push(childNodes[i]);
                }
            }
        }
    }

    _hasToken(tokenListString, token) {
        let start = 0;
        const pattern = this._patternHtmlWhitespace;
        pattern.lastIndex = 0;
        while (true) {
            const match = pattern.exec(tokenListString);
            const end = match === null ? tokenListString.length : match.index;
            if (end > start && tokenListString.substring(start, end) === token) { return true; }
            if (match === null) { return false; }
            start = end + match[0].length;
        }
    }
}
