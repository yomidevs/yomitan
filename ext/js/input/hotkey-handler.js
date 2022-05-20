/*
 * Copyright (C) 2021-2022  Yomichan Authors
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

/**
 * Class which handles hotkey events and actions.
 */
class HotkeyHandler extends EventDispatcher {
    /**
     * Information describing a hotkey.
     * @typedef {object} HotkeyDefinition
     * @property {string} action A string indicating which action to perform.
     * @property {string} key A keyboard key code indicating which key needs to be pressed.
     * @property {string[]} modifiers An array of keyboard modifiers which also need to be pressed. Supports: `'alt', 'ctrl', 'shift', 'meta'`.
     * @property {string[]} scopes An array of scopes for which the hotkey is valid. If this array does not contain `this.scope`, the hotkey will not be registered.
     * @property {boolean} enabled A boolean indicating whether the hotkey is currently enabled.
     */

    /**
     * Creates a new instance of the class.
     */
    constructor() {
        super();
        this._actions = new Map();
        this._hotkeys = new Map();
        this._hotkeyRegistrations = new Map();
        this._eventListeners = new EventListenerCollection();
        this._isPrepared = false;
        this._hasEventListeners = false;
    }

    /**
     * Begins listening to key press events in order to detect hotkeys.
     */
    prepare() {
        this._isPrepared = true;
        this._updateEventHandlers();
        yomichan.crossFrame.registerHandlers([
            ['HotkeyHandler.forwardHotkey', {async: false, handler: this._onMessageForwardHotkey.bind(this)}]
        ]);
    }

    /**
     * Registers a set of actions that this hotkey handler supports.
     * @param {*[][]} actions An array of `[name, handler]` entries, where `name` is a string and `handler` is a function.
     */
    registerActions(actions) {
        for (const [name, handler] of actions) {
            this._actions.set(name, handler);
        }
    }

    /**
     * Registers a set of hotkeys for a given scope.
     * @param {string} scope The scope that the hotkey definitions must be for in order to be activated.
     * @param {HotkeyDefinition[]} hotkeys An array of hotkey definitions.
     */
    registerHotkeys(scope, hotkeys) {
        let registrations = this._hotkeyRegistrations.get(scope);
        if (typeof registrations === 'undefined') {
            registrations = [];
            this._hotkeyRegistrations.set(scope, registrations);
        }
        registrations.push(...hotkeys);
        this._updateHotkeyRegistrations();
    }

    /**
     * Removes all registered hotkeys for a given scope.
     * @param {string} scope The scope that the hotkey definitions were registered in.
     */
    clearHotkeys(scope) {
        const registrations = this._hotkeyRegistrations.get(scope);
        if (typeof registrations !== 'undefined') {
            registrations.length = 0;
        }
        this._updateHotkeyRegistrations();
    }

    /**
     * Assigns a set of hotkeys for a given scope. This is an optimized shorthand for calling
     * `clearHotkeys`, then calling `registerHotkeys`.
     * @param {string} scope The scope that the hotkey definitions must be for in order to be activated.
     * @param {HotkeyDefinition[]} hotkeys An array of hotkey definitions.
     */
    setHotkeys(scope, hotkeys) {
        let registrations = this._hotkeyRegistrations.get(scope);
        if (typeof registrations === 'undefined') {
            registrations = [];
            this._hotkeyRegistrations.set(scope, registrations);
        } else {
            registrations.length = 0;
        }
        registrations.push(...hotkeys);
        this._updateHotkeyRegistrations();
    }

    /**
     * Adds a single event listener to a specific event.
     * @param {string} eventName The string representing the event's name.
     * @param {Function} callback The event listener callback to add.
     * @returns {void}
     */
    on(eventName, callback) {
        const result = super.on(eventName, callback);
        this._updateHasEventListeners();
        this._updateEventHandlers();
        return result;
    }

    /**
     * Removes a single event listener from a specific event.
     * @param {string} eventName The string representing the event's name.
     * @param {Function} callback The event listener callback to add.
     * @returns {boolean} `true` if the callback was removed, `false` otherwise.
     */
    off(eventName, callback) {
        const result = super.off(eventName, callback);
        this._updateHasEventListeners();
        this._updateEventHandlers();
        return result;
    }

    /**
     * Attempts to simulate an action for a given combination of key and modifiers.
     * @param {string} key A keyboard key code indicating which key needs to be pressed.
     * @param {string[]} modifiers An array of keyboard modifiers which also need to be pressed. Supports: `'alt', 'ctrl', 'shift', 'meta'`.
     * @returns {boolean} `true` if an action was performed, `false` otherwise.
     */
    simulate(key, modifiers) {
        const hotkeyInfo = this._hotkeys.get(key);
        return (
            typeof hotkeyInfo !== 'undefined' &&
            this._invokeHandlers(modifiers, hotkeyInfo)
        );
    }

    // Message handlers

    _onMessageForwardHotkey({key, modifiers}) {
        return this.simulate(key, modifiers);
    }

    // Private

    _onKeyDown(e) {
        const hotkeyInfo = this._hotkeys.get(e.code);
        if (typeof hotkeyInfo !== 'undefined') {
            const eventModifiers = DocumentUtil.getActiveModifiers(e);
            if (this._invokeHandlers(eventModifiers, hotkeyInfo, e.key)) {
                e.preventDefault();
                return;
            }
        }
        this.trigger('keydownNonHotkey', e);
    }

    _invokeHandlers(modifiers, hotkeyInfo, key) {
        for (const {modifiers: handlerModifiers, action, argument} of hotkeyInfo.handlers) {
            if (!this._areSame(handlerModifiers, modifiers) || !this._isHotkeyPermitted(modifiers, key)) { continue; }

            const actionHandler = this._actions.get(action);
            if (typeof actionHandler !== 'undefined') {
                const result = actionHandler(argument);
                if (result !== false) {
                    return true;
                }
            }
        }

        return false;
    }

    _areSame(set, array) {
        if (set.size !== array.length) { return false; }
        for (const value of array) {
            if (!set.has(value)) {
                return false;
            }
        }
        return true;
    }

    _updateHotkeyRegistrations() {
        if (this._hotkeys.size === 0 && this._hotkeyRegistrations.size === 0) { return; }

        this._hotkeys.clear();
        for (const [scope, registrations] of this._hotkeyRegistrations.entries()) {
            for (const {action, argument, key, modifiers, scopes, enabled} of registrations) {
                if (!(enabled && key !== null && action !== '' && scopes.includes(scope))) { continue; }

                let hotkeyInfo = this._hotkeys.get(key);
                if (typeof hotkeyInfo === 'undefined') {
                    hotkeyInfo = {handlers: []};
                    this._hotkeys.set(key, hotkeyInfo);
                }

                hotkeyInfo.handlers.push({modifiers: new Set(modifiers), action, argument});
            }
        }
        this._updateEventHandlers();
    }

    _updateHasEventListeners() {
        this._hasEventListeners = this.hasListeners('keydownNonHotkey');
    }

    _updateEventHandlers() {
        if (this._isPrepared && (this._hotkeys.size > 0 || this._hasEventListeners)) {
            if (this._eventListeners.size !== 0) { return; }
            this._eventListeners.addEventListener(document, 'keydown', this._onKeyDown.bind(this), false);
        } else {
            this._eventListeners.removeAllEventListeners();
        }
    }

    _isHotkeyPermitted(modifiers, key) {
        return !(
            (modifiers.length === 0 || (modifiers.length === 1 && modifiers[0] === 'shift')) &&
            DocumentUtil.isInputElementFocused() &&
            this._isKeyCharacterInput(key)
        );
    }

    _isKeyCharacterInput(key) {
        return key.length === 1;
    }
}
