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
 * HotkeyUtil
 */

class HotkeyHelpController {
    constructor() {
        this._hotkeyUtil = new HotkeyUtil();
        this._localActionHotseys = new Map();
        this._globalActionHotkeys = new Map();
        this._replacementPattern = /\{0\}/g;
    }

    async prepare() {
        const {platform: {os}} = await yomichan.api.getEnvironmentInfo();
        this._hotkeyUtil.os = os;
        await this._setupGlobalCommands(this._globalActionHotkeys);
    }

    setOptions(options) {
        const hotkeys = options.inputs.hotkeys;
        const hotkeyMap = this._localActionHotseys;
        hotkeyMap.clear();
        for (const {enabled, action, key, modifiers} of hotkeys) {
            if (!enabled || key === null || action === '' || hotkeyMap.has(action)) { continue; }
            hotkeyMap.set(action, this._hotkeyUtil.getInputDisplayValue(key, modifiers));
        }
    }

    setupNode(node) {
        const globalPrexix = 'global:';
        const replacementPattern = this._replacementPattern;
        for (const node2 of node.querySelectorAll('[data-hotkey]')) {
            const data = JSON.parse(node2.dataset.hotkey);
            let [action, attributes, values] = data;
            if (!Array.isArray(attributes)) { attributes = [attributes]; }
            const multipleValues = Array.isArray(values);

            const actionIsGlobal = action.startsWith(globalPrexix);
            if (actionIsGlobal) { action = action.substring(globalPrexix.length); }

            const defaultAttributeValues = this._getDefaultAttributeValues(node2, data, attributes);

            const hotkey = (actionIsGlobal ? this._globalActionHotkeys : this._localActionHotseys).get(action);

            for (let i = 0, ii = attributes.length; i < ii; ++i) {
                const attribute = attributes[i];
                let value = null;
                if (typeof hotkey !== 'undefined') {
                    value = (multipleValues ? values[i] : values);
                    value = value.replace(replacementPattern, hotkey);
                } else {
                    value = defaultAttributeValues[i];
                }

                if (typeof value === 'string') {
                    node2.setAttribute(attribute, value);
                } else {
                    node2.removeAttribute(attribute);
                }
            }
        }
    }

    // Private

    async _setupGlobalCommands(commandMap) {
        const commands = await new Promise((resolve, reject) => {
            if (!(isObject(chrome.commands) && typeof chrome.commands.getAll === 'function')) {
                resolve([]);
                return;
            }

            chrome.commands.getAll((result) => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve(result);
                }
            });
        });

        commandMap.clear();
        for (const {name, shortcut} of commands) {
            if (shortcut.length === 0) { continue; }
            const {key, modifiers} = this._hotkeyUtil.convertCommandToInput(shortcut);
            commandMap.set(name, this._hotkeyUtil.getInputDisplayValue(key, modifiers));
        }
        return commandMap;
    }

    _getDefaultAttributeValues(node, data, attributes) {
        if (data.length > 3) {
            return data[3];
        }

        const defaultAttributeValues = [];
        for (let i = 0, ii = attributes.length; i < ii; ++i) {
            const attribute = attributes[i];
            const value = node.hasAttribute(attribute) ? node.getAttribute(attribute) : null;
            defaultAttributeValues.push(value);
        }
        data[3] = defaultAttributeValues;
        node.dataset.hotkey = JSON.stringify(data);
        return defaultAttributeValues;
    }
}
