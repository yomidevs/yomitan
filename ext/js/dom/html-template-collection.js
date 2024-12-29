/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import {fetchText} from '../core/fetch-utilities.js';

export class HtmlTemplateCollection {
    constructor() {
        /** @type {Map<string, HTMLTemplateElement>} */
        this._templates = new Map();
    }

    /**
     * @param {string[]} urls
     */
    async loadFromFiles(urls) {
        const htmlRawArray = await Promise.all(urls.map((url) => fetchText(url)));
        const domParser = new DOMParser();
        for (const htmlRaw of htmlRawArray) {
            const templatesDocument = domParser.parseFromString(htmlRaw, 'text/html');
            this.load(templatesDocument);
        }
    }

    /**
     * @param {Document} source
     */
    load(source) {
        const pattern = /^([\w\W]+)-template$/;
        for (const template of source.querySelectorAll('template')) {
            const match = pattern.exec(template.id);
            if (match === null) { continue; }
            this._prepareTemplate(template);
            this._templates.set(match[1], template);
        }
    }

    /**
     * @template {Element} T
     * @param {string} name
     * @returns {T}
     * @throws {Error}
     */
    instantiate(name) {
        const {firstElementChild} = this.getTemplateContent(name);
        if (firstElementChild === null) { throw new Error(`Failed to find template content element: ${name}`); }
        return /** @type {T} */ (document.importNode(firstElementChild, true));
    }

    /**
     * @param {string} name
     * @returns {DocumentFragment}
     */
    instantiateFragment(name) {
        return document.importNode(this.getTemplateContent(name), true);
    }

    /**
     * @param {string} name
     * @returns {DocumentFragment}
     * @throws {Error}
     */
    getTemplateContent(name) {
        const template = this._templates.get(name);
        if (typeof template === 'undefined') { throw new Error(`Failed to find template: ${name}`); }
        return template.content;
    }

    /**
     * @returns {IterableIterator<HTMLTemplateElement>}
     */
    getAllTemplates() {
        return this._templates.values();
    }

    // Private

    /**
     * @param {HTMLTemplateElement} template
     */
    _prepareTemplate(template) {
        if (template.dataset.removeWhitespaceText === 'true') {
            this._removeWhitespaceText(template);
        }
    }

    /**
     * @param {HTMLTemplateElement} template
     */
    _removeWhitespaceText(template) {
        const {content} = template;
        const {TEXT_NODE} = Node;
        const iterator = document.createNodeIterator(content, NodeFilter.SHOW_TEXT);
        const removeNodes = [];
        while (true) {
            const node = iterator.nextNode();
            if (node === null) { break; }
            if (node.nodeType === TEXT_NODE && /** @type {string} */ (node.nodeValue).trim().length === 0) {
                removeNodes.push(node);
            }
        }
        for (const node of removeNodes) {
            const {parentNode} = node;
            if (parentNode !== null) {
                parentNode.removeChild(node);
            }
        }
    }
}
