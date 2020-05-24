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

/* global
 * TaskAccumulator
 */

class DOMDataBinder {
    constructor({selector, ignoreSelectors=[], createElementMetadata, compareElementMetadata, getValues, setValues, onError=null}) {
        this._selector = selector;
        this._ignoreSelectors = ignoreSelectors;
        this._createElementMetadata = createElementMetadata;
        this._compareElementMetadata = compareElementMetadata;
        this._getValues = getValues;
        this._setValues = setValues;
        this._onError = onError;
        this._updateTasks = new TaskAccumulator(this._onBulkUpdate.bind(this));
        this._assignTasks = new TaskAccumulator(this._onBulkAssign.bind(this));
        this._mutationObserver = new MutationObserver(this._onMutation.bind(this));
        this._observingElement = null;
        this._elementMap = new Map(); // Map([element => observer]...)
        this._elementAncestorMap = new Map(); // Map([element => Set([observer]...))
    }

    observe(element) {
        if (this._isObserving) { return; }

        this._observingElement = element;
        this._mutationObserver.observe(element, {
            attributes: true,
            attributeOldValue: true,
            childList: true,
            subtree: true
        });
        this._onMutation([{
            type: 'childList',
            target: element.parentNode,
            addedNodes: [element],
            removedNodes: []
        }]);
    }

    disconnect() {
        if (!this._isObserving) { return; }

        this._mutationObserver.disconnect();
        this._observingElement = null;

        for (const observer of this._elementMap.values()) {
            this._removeObserver(observer);
        }
    }

    async refresh() {
        await this._updateTasks.enqueue(null, {all: true});
    }

    // Private

    _onMutation(mutationList) {
        for (const mutation of mutationList) {
            switch (mutation.type) {
                case 'childList':
                    this._onChildListMutation(mutation);
                    break;
                case 'attributes':
                    this._onAttributeMutation(mutation);
                    break;
            }
        }
    }

    _onChildListMutation({addedNodes, removedNodes, target}) {
        const selector = this._selector;
        const ELEMENT_NODE = Node.ELEMENT_NODE;

        for (const node of removedNodes) {
            const observers = this._elementAncestorMap.get(node);
            if (typeof observers === 'undefined') { continue; }
            for (const observer of observers) {
                this._removeObserver(observer);
            }
        }

        for (const node of addedNodes) {
            if (node.nodeType !== ELEMENT_NODE) { continue; }
            if (node.matches(selector)) {
                this._createObserver(node);
            }
            for (const childNode of node.querySelectorAll(selector)) {
                this._createObserver(childNode);
            }
        }

        if (addedNodes.length !== 0 || addedNodes.length !== 0) {
            const observer = this._elementMap.get(target);
            if (typeof observer !== 'undefined') {
                observer.updateValue();
            }
        }
    }

    _onAttributeMutation({target}) {
        const selector = this._selector;
        const observers = this._elementAncestorMap.get(target);
        if (typeof observers !== 'undefined') {
            for (const observer of observers) {
                const element = observer.element;
                if (
                    !element.matches(selector) ||
                    this._shouldIgnoreElement(element) ||
                    this._isObserverStale(observer)
                ) {
                    this._removeObserver(observer);
                }
            }
        }

        if (target.matches(selector)) {
            this._createObserver(target);
        }
    }

    async _onBulkUpdate(tasks) {
        let all = false;
        const targets = [];
        for (const [observer, task] of tasks) {
            if (observer === null) {
                if (task.data.all) {
                    all = true;
                    break;
                }
            } else {
                targets.push([observer, task]);
            }
        }
        if (all) {
            targets.length = 0;
            for (const observer of this._elementMap.values()) {
                targets.push([observer, null]);
            }
        }

        const args = targets.map(([observer]) => ({
            element: observer.element,
            metadata: observer.metadata
        }));
        const responses = await this._getValues(args);
        this._applyValues(targets, responses, true);
    }

    async _onBulkAssign(tasks) {
        const targets = tasks;
        const args = targets.map(([observer, task]) => ({
            element: observer.element,
            metadata: observer.metadata,
            value: task.data.value
        }));
        const responses = await this._setValues(args);
        this._applyValues(targets, responses, false);
    }

    _onElementChange(observer) {
        const value = this._getElementValue(observer.element);
        observer.value = value;
        observer.hasValue = true;
        this._assignTasks.enqueue(observer, {value});
    }

    _applyValues(targets, response, ignoreStale) {
        if (!Array.isArray(response)) { return; }

        for (let i = 0, ii = targets.length; i < ii; ++i) {
            const [observer, task] = targets[i];
            const {error, result} = response[i];
            const stale = (task !== null && task.stale);

            if (error) {
                if (typeof this._onError === 'function') {
                    this._onError(error, stale, observer.element, observer.metadata);
                }
                continue;
            }

            if (stale && !ignoreStale) { continue; }

            observer.value = result;
            observer.hasValue = true;
            this._setElementValue(observer.element, result);
        }
    }

    _createObserver(element) {
        if (this._elementMap.has(element) || this._shouldIgnoreElement(element)) { return; }

        const metadata = this._createElementMetadata(element);
        const nodeName = element.nodeName.toUpperCase();
        const ancestors = this._getAncestors(element);
        const observer = {
            element,
            ancestors,
            type: (nodeName === 'INPUT' ? element.type : null),
            value: null,
            hasValue: false,
            onChange: null,
            metadata
        };
        observer.onChange = this._onElementChange.bind(this, observer);
        this._elementMap.set(element, observer);

        element.addEventListener('change', observer.onChange, false);

        for (const ancestor of ancestors) {
            let observers = this._elementAncestorMap.get(ancestor);
            if (typeof observers === 'undefined') {
                observers = new Set();
                this._elementAncestorMap.set(ancestor, observers);
            }
            observers.add(observer);
        }

        this._updateTasks.enqueue(observer);
    }

    _removeObserver(observer) {
        const {element, ancestors} = observer;

        element.removeEventListener('change', observer.onChange, false);
        observer.onChange = null;

        this._elementMap.delete(element);

        for (const ancestor of ancestors) {
            const observers = this._elementAncestorMap.get(ancestor);
            if (typeof observers === 'undefined') { continue; }

            observers.delete(observer);
            if (observers.size === 0) {
                this._elementAncestorMap.delete(ancestor);
            }
        }
    }

    _isObserverStale(observer) {
        const {element, type, metadata} = observer;
        const nodeName = element.nodeName.toUpperCase();
        return !(
            type === (nodeName === 'INPUT' ? element.type : null) &&
            this._compareElementMetadata(metadata, this._createElementMetadata(element))
        );
    }

    _shouldIgnoreElement(element) {
        for (const selector of this._ignoreSelectors) {
            if (element.matches(selector)) {
                return true;
            }
        }
        return false;
    }

    _getAncestors(node) {
        const root = this._observingElement;
        const results = [];
        while (true) {
            results.push(node);
            if (node === root) { break; }
            node = node.parentNode;
            if (node === null) { break; }
        }
        return results;
    }

    _setElementValue(element, value) {
        switch (element.nodeName.toUpperCase()) {
            case 'INPUT':
                switch (element.type) {
                    case 'checkbox':
                        element.checked = value;
                        break;
                    case 'text':
                    case 'number':
                        element.value = value;
                        break;
                }
                break;
            case 'TEXTAREA':
            case 'SELECT':
                element.value = value;
                break;
        }
    }

    _getElementValue(element) {
        switch (element.nodeName.toUpperCase()) {
            case 'INPUT':
                switch (element.type) {
                    case 'checkbox':
                        return !!element.checked;
                    case 'text':
                        return `${element.value}`;
                    case 'number':
                        return this._getInputNumberValue(element);
                }
                break;
            case 'TEXTAREA':
            case 'SELECT':
                return element.value;
        }
        return null;
    }

    _getInputNumberValue(element) {
        let value = parseFloat(element.value);
        if (!Number.isFinite(value)) { return 0; }

        let {min, max, step} = element;
        min = this._stringValueToNumberOrNull(min);
        max = this._stringValueToNumberOrNull(max);
        step = this._stringValueToNumberOrNull(step);
        if (typeof min === 'number') { value = Math.max(value, min); }
        if (typeof max === 'number') { value = Math.min(value, max); }
        if (typeof step === 'number' && step !== 0) { value = Math.round(value / step) * step; }
        return value;
    }

    _stringValueToNumberOrNull(value) {
        if (typeof value !== 'string' || value.length === 0) {
            return null;
        }

        const number = parseFloat(value);
        return !Number.isNaN(number) ? number : null;
    }
}
