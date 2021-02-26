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

class HtmlTemplateCollection {
    constructor(source) {
        this._templates = new Map();

        const sourceNode = (
            typeof source === 'string' ?
            new DOMParser().parseFromString(source, 'text/html') :
            source
        );

        const pattern = /^([\w\W]+)-template$/;
        for (const template of sourceNode.querySelectorAll('template')) {
            const match = pattern.exec(template.id);
            if (match === null) { continue; }
            this._prepareTemplate(template);
            this._templates.set(match[1], template);
        }
    }

    instantiate(name) {
        const template = this._templates.get(name);
        return document.importNode(template.content.firstChild, true);
    }

    instantiateFragment(name) {
        const template = this._templates.get(name);
        return document.importNode(template.content, true);
    }

    getAllTemplates() {
        return this._templates.values();
    }

    // Private

    _prepareTemplate(template) {
        if (template.dataset.removeWhitespaceText === 'true') {
            this._removeWhitespaceText(template);
        }
    }

    _removeWhitespaceText(template) {
        const {content} = template;
        const {TEXT_NODE} = Node;
        const iterator = document.createNodeIterator(content, NodeFilter.SHOW_TEXT);
        const removeNodes = [];
        while (true) {
            const node = iterator.nextNode();
            if (node === null) { break; }
            if (node.nodeType === TEXT_NODE && node.nodeValue.trim().length === 0) {
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
