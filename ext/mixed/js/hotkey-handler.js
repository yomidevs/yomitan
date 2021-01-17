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

/* global
 * DocumentUtil
 */

/**
 * Class which handles hotkey events and actions.
 */
class HotkeyHandler extends EventDispatcher {
    /**
     * Creates a new instance of the class.
     * @param scope The scope required for hotkey definitions.
     */
    constructor(scope) {
        super();
        this._scope = scope;
        this._hotkeys = new Map();
        this._actions = new Map();
        this._eventListeners = new EventListenerCollection();
    }

    /**
     * Gets the scope required for the hotkey definitions.
     */
    get scope() {
        return this._scope;
    }

    /**
     * Sets the scope required for the hotkey definitions.
     */
    set scope(value) {
        this._scope = value;
    }

    /**
     * Begins listening to key press events in order to detect hotkeys.
     */
    prepare() {
        this._eventListeners.addEventListener(document, 'keydown', this._onKeyDown.bind(this), false);
    }

    /**
     * Stops listening to key press events.
     */
    cleanup() {
        this._eventListeners.removeAllEventListeners();
    }

    /**
     * Registers a set of actions that this hotkey handler supports.
     * @param actions An array of `[name, handler]` entries, where `name` is a string and `handler` is a function.
     */
    registerActions(actions) {
        for (const [name, handler] of actions) {
            this._actions.set(name, handler);
        }
    }

    /**
     * Registers a set of hotkeys
     * @param hotkeys An array of hotkey definitions of the format `{action, key, modifiers, scopes, enabled}`.
     * * `action` - a string indicating which action to perform.
     * * `key` - a keyboard key code indicating which key needs to be pressed.
     * * `modifiers` - an array of keyboard modifiers which also need to be pressed. Supports: `'alt', 'ctrl', 'shift', 'meta'`.
     * * `scopes` - an array of scopes for which the hotkey is valid. If this array does not contain `this.scope`, the hotkey will not be registered.
     * * `enabled` - a boolean indicating whether the hotkey is currently enabled.
     */
    registerHotkeys(hotkeys) {
        for (const {action, key, modifiers, scopes, enabled} of hotkeys) {
            if (
                enabled &&
                key !== null &&
                action !== '' &&
                scopes.includes(this._scope)
            ) {
                this._registerHotkey(key, modifiers, action);
            }
        }
    }

    /**
     * Removes all registered hotkeys.
     */
    clearHotkeys() {
        this._hotkeys.clear();
    }

    // Private

    _onKeyDown(e) {
        const key = e.code;
        const handlers = this._hotkeys.get(key);
        if (typeof handlers !== 'undefined') {
            const eventModifiers = DocumentUtil.getActiveModifiers(e);
            for (const {modifiers, action} of handlers) {
                if (!this._areSame(modifiers, eventModifiers)) { continue; }

                const actionHandler = this._actions.get(action);
                if (typeof actionHandler === 'undefined') { continue; }

                const result = actionHandler(e);
                if (result !== false) {
                    e.preventDefault();
                    return true;
                }
            }
        }
        this.trigger('keydownNonHotkey', e);
        return false;
    }

    _registerHotkey(key, modifiers, action) {
        let handlers = this._hotkeys.get(key);
        if (typeof handlers === 'undefined') {
            handlers = [];
            this._hotkeys.set(key, handlers);
        }
        handlers.push({modifiers: new Set(modifiers), action});
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
}
