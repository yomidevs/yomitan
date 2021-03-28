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

/* global
 * SelectorObserver
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
        this._selectorObserver = new SelectorObserver({
            selector,
            ignoreSelector: (ignoreSelectors.length > 0 ? ignoreSelectors.join(',') : null),
            onAdded: this._createObserver.bind(this),
            onRemoved: this._removeObserver.bind(this),
            onChildrenUpdated: this._onObserverChildrenUpdated.bind(this),
            isStale: this._isObserverStale.bind(this)
        });
    }

    observe(element) {
        this._selectorObserver.observe(element, true);
    }

    disconnect() {
        this._selectorObserver.disconnect();
    }

    async refresh() {
        await this._updateTasks.enqueue(null, {all: true});
    }

    // Private

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
            for (const observer of this._selectorObserver.datas()) {
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
        const metadata = this._createElementMetadata(element);
        const nodeName = element.nodeName.toUpperCase();
        const observer = {
            element,
            type: (nodeName === 'INPUT' ? element.type : null),
            value: null,
            hasValue: false,
            onChange: null,
            metadata
        };
        observer.onChange = this._onElementChange.bind(this, observer);

        element.addEventListener('change', observer.onChange, false);

        this._updateTasks.enqueue(observer);

        return observer;
    }

    _removeObserver(element, observer) {
        element.removeEventListener('change', observer.onChange, false);
        observer.onChange = null;
    }

    _onObserverChildrenUpdated(element, observer) {
        if (observer.hasValue) {
            this._setElementValue(element, observer.value);
        }
    }

    _isObserverStale(element, observer) {
        const {type, metadata} = observer;
        const nodeName = element.nodeName.toUpperCase();
        return !(
            type === (nodeName === 'INPUT' ? element.type : null) &&
            this._compareElementMetadata(metadata, this._createElementMetadata(element))
        );
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

        const event = new CustomEvent('settingChanged', {detail: {value}});
        element.dispatchEvent(event);
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
                        return DOMDataBinder.convertToNumber(element.value, element);
                }
                break;
            case 'TEXTAREA':
            case 'SELECT':
                return element.value;
        }
        return null;
    }

    // Utilities

    static convertToNumber(value, constraints) {
        value = parseFloat(value);
        if (!Number.isFinite(value)) { value = 0; }

        let {min, max, step} = constraints;
        min = DOMDataBinder.convertToNumberOrNull(min);
        max = DOMDataBinder.convertToNumberOrNull(max);
        step = DOMDataBinder.convertToNumberOrNull(step);
        if (typeof min === 'number') { value = Math.max(value, min); }
        if (typeof max === 'number') { value = Math.min(value, max); }
        if (typeof step === 'number' && step !== 0) { value = Math.round(value / step) * step; }
        return value;
    }

    static convertToNumberOrNull(value) {
        if (typeof value !== 'number') {
            if (typeof value !== 'string' || value.length === 0) {
                return null;
            }
            value = parseFloat(value);
        }
        return !Number.isNaN(value) ? value : null;
    }
}
