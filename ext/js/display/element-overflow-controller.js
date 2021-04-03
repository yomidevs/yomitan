/*
 * Copyright (C) 2021  Yomichan Authors
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

class ElementOverflowController {
    constructor() {
        this._elements = [];
        this._checkTimer = null;
        this._eventListeners = new EventListenerCollection();
        this._windowEventListeners = new EventListenerCollection();
        this._dictionaries = new Map();
        this._updateBind = this._update.bind(this);
        this._onWindowResizeBind = this._onWindowResize.bind(this);
        this._onToggleButtonClickBind = this._onToggleButtonClick.bind(this);
    }

    setOptions(options) {
        this._dictionaries.clear();
        for (const {name, definitionsCollapsible} of options.dictionaries) {
            let collapsible = false;
            let collapsed = false;
            switch (definitionsCollapsible) {
                case 'expanded':
                    collapsible = true;
                    break;
                case 'collapsed':
                    collapsible = true;
                    collapsed = true;
                    break;
            }
            if (!collapsible) { continue; }
            this._dictionaries.set(name, {collapsed});
        }
    }

    addElements(entry) {
        if (this._dictionaries.size === 0) { return; }

        const elements = entry.querySelectorAll('.definition-item-inner');
        let any = false;
        for (const element of elements) {
            const {dictionary} = element.parentNode.dataset;
            const dictionaryInfo = this._dictionaries.get(dictionary);
            if (typeof dictionaryInfo === 'undefined') { continue; }

            this._updateElement(element);
            this._elements.push(element);

            if (dictionaryInfo.collapsed) {
                element.classList.add('collapsed');
            }

            const button = element.querySelector('.definition-item-expansion-button');
            if (button !== null) {
                this._eventListeners.addEventListener(button, 'click', this._onToggleButtonClickBind, false);
            }

            any = true;
        }

        if (any && this._windowEventListeners.size === 0) {
            this._windowEventListeners.addEventListener(window, 'resize', this._onWindowResizeBind, false);
        }
    }

    clearElements() {
        if (this._elements.length === 0) { return; }
        this._elements = [];
        this._windowEventListeners.removeAllEventListeners();
    }

    // Private

    _onWindowResize() {
        if (this._checkTimer !== null) {
            this._cancelIdleCallback(this._checkTimer);
        }
        this._checkTimer = this._requestIdleCallback(this._updateBind, 100);
    }

    _onToggleButtonClick(e) {
        const container = e.currentTarget.closest('.definition-item-inner');
        if (container === null) { return; }
        container.classList.toggle('collapsed');
    }

    _update() {
        for (const element of this._elements) {
            this._updateElement(element);
        }
    }

    _updateElement(element) {
        const {classList} = element;
        classList.add('collapse-test');
        const collapsible = element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
        classList.toggle('collapsible', collapsible);
        classList.remove('collapse-test');
    }

    _requestIdleCallback(callback, timeout) {
        if (typeof requestIdleCallback === 'function') {
            return requestIdleCallback(callback, {timeout});
        } else {
            return setTimeout(callback, timeout);
        }
    }

    _cancelIdleCallback(handle) {
        if (typeof cancelIdleCallback === 'function') {
            cancelIdleCallback(handle);
        } else {
            clearTimeout(handle);
        }
    }
}
