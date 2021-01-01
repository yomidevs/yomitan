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

class NativeSimpleDOMParser {
    constructor(content) {
        this._document = new DOMParser().parseFromString(content, 'text/html');
    }

    getElementById(id, root=null) {
        return (root || this._document).querySelector(`[id='${id}']`);
    }

    getElementByTagName(tagName, root=null) {
        return (root || this._document).querySelector(tagName);
    }

    getElementsByTagName(tagName, root=null) {
        return [...(root || this._document).querySelectorAll(tagName)];
    }

    getElementsByClassName(className, root=null) {
        return [...(root || this._document).querySelectorAll(`.${className}`)];
    }

    getAttribute(element, attribute) {
        return element.hasAttribute(attribute) ? element.getAttribute(attribute) : null;
    }

    getTextContent(element) {
        return element.textContent;
    }

    static isSupported() {
        return typeof DOMParser !== 'undefined';
    }
}
