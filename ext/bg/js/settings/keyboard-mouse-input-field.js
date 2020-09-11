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
 * DocumentUtil
 */

class KeyboardMouseInputField extends EventDispatcher {
    constructor(inputNode, mouseButton, os, isPointerTypeSupported=null) {
        super();
        this._inputNode = inputNode;
        this._mouseButton = mouseButton;
        this._isPointerTypeSupported = isPointerTypeSupported;
        this._keySeparator = ' + ';
        this._inputNameMap = new Map(DocumentUtil.getModifierKeys(os));
        this._keyPriorities = new Map([
            ['meta', -4],
            ['ctrl', -3],
            ['alt', -2],
            ['shift', -1]
        ]);
        this._mouseInputNamePattern = /^mouse(\d+)$/;
        this._eventListeners = new EventListenerCollection();
        this._value = '';
        this._type = null;
    }

    get value() {
        return this._value;
    }

    prepare(value, type) {
        this.cleanup();

        this._value = value;
        const modifiers = this._splitValue(value);
        const {displayValue} = this._getInputStrings(modifiers);
        const events = [
            [this._inputNode, 'keydown', this._onModifierKeyDown.bind(this), false]
        ];
        if (type === 'modifierInputs' && this._mouseButton !== null) {
            events.push(
                [this._mouseButton, 'mousedown', this._onMouseButtonMouseDown.bind(this), false],
                [this._mouseButton, 'pointerdown', this._onMouseButtonPointerDown.bind(this), false],
                [this._mouseButton, 'mouseup', this._onMouseButtonMouseUp.bind(this), false],
                [this._mouseButton, 'contextmenu', this._onMouseButtonContextMenu.bind(this), false]
            );
        }
        this._inputNode.value = displayValue;
        for (const args of events) {
            this._eventListeners.addEventListener(...args);
        }
    }

    cleanup() {
        this._eventListeners.removeAllEventListeners();
        this._value = '';
        this._type = null;
    }

    // Private

    _splitValue(value) {
        return value.split(/[,;\s]+/).map((v) => v.trim().toLowerCase()).filter((v) => v.length > 0);
    }

    _sortInputs(inputs) {
        const pattern = this._mouseInputNamePattern;
        const keyPriorities = this._keyPriorities;
        const inputInfos = inputs.map((value, index) => {
            const match = pattern.exec(value);
            if (match !== null) {
                return [value, 1, Number.parseInt(match[1], 10), index];
            } else {
                let priority = keyPriorities.get(value);
                if (typeof priority === 'undefined') { priority = 0; }
                return [value, 0, priority, index];
            }
        });
        inputInfos.sort((a, b) => {
            let i = a[1] - b[1];
            if (i !== 0) { return i; }

            i = a[2] - b[2];
            if (i !== 0) { return i; }

            i = a[0].localeCompare(b[0], 'en-US'); // Ensure an invariant culture
            if (i !== 0) { return i; }

            i = a[3] - b[3];
            return i;
        });
        return inputInfos.map(([value]) => value);
    }

    _getInputStrings(inputs) {
        let value = '';
        let displayValue = '';
        let first = true;
        for (const input of inputs) {
            const {name} = this._getInputName(input);
            if (first) {
                first = false;
            } else {
                value += ', ';
                displayValue += this._keySeparator;
            }
            value += input;
            displayValue += name;
        }
        return {value, displayValue};
    }

    _getInputName(value) {
        const pattern = this._mouseInputNamePattern;
        const match = pattern.exec(value);
        if (match !== null) {
            return {name: `Mouse ${match[1]}`, type: 'mouse'};
        }

        let name = this._inputNameMap.get(value);
        if (typeof name === 'undefined') { name = value; }
        return {name, type: 'key'};
    }

    _getModifierKeys(e) {
        const modifiers = DocumentUtil.getActiveModifiers(e);
        // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/metaKey
        // https://askubuntu.com/questions/567731/why-is-shift-alt-being-mapped-to-meta
        // It works with mouse events on some platforms, so try to determine if metaKey is pressed.
        // This is a hack and only works when both Shift and Alt are not pressed.
        if (
            !modifiers.has('meta') &&
            DocumentUtil.getKeyFromEvent(e) === 'Meta' &&
            !(
                modifiers.size === 2 &&
                modifiers.has('shift') &&
                modifiers.has('alt')
            )
        ) {
            modifiers.add('meta');
        }
        return modifiers;
    }

    _onModifierKeyDown(e) {
        e.preventDefault();

        const key = DocumentUtil.getKeyFromEvent(e);
        switch (key) {
            case 'Escape':
            case 'Backspace':
                this._updateInputs([]);
                break;
            default:
                this._addInputs(this._getModifierKeys(e));
                break;
        }
    }

    _onMouseButtonMouseDown(e) {
        e.preventDefault();
        this._addInputs(DocumentUtil.getActiveButtons(e));
    }

    _onMouseButtonPointerDown(e) {
        const {isPrimary, pointerType} = e;
        if (
            !isPrimary ||
            typeof this._isPointerTypeSupported !== 'function' ||
            !this._isPointerTypeSupported(pointerType)
        ) {
            return;
        }
        e.preventDefault();
        this._addInputs(DocumentUtil.getActiveButtons(e));
    }

    _onMouseButtonMouseUp(e) {
        e.preventDefault();
    }

    _onMouseButtonContextMenu(e) {
        e.preventDefault();
    }

    _addInputs(newInputs) {
        const inputs = new Set(this._splitValue(this._value));
        for (const input of newInputs) {
            inputs.add(input);
        }
        this._updateInputs([...inputs]);
    }

    _updateInputs(inputs) {
        inputs = this._sortInputs(inputs);

        const node = this._inputNode;
        const {value, displayValue} = this._getInputStrings(inputs);
        node.value = displayValue;
        if (this._value === value) { return; }
        this._value = value;
        this.trigger('change', {value, displayValue});
    }
}
