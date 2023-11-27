/*
 * Copyright (C) 2023  Yomitan Authors
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

import {EventListenerCollection} from '../../core.js';

export class TranslationTextReplacementsController {
    /**
     * @param {SettingsController} settingsController
     */
    constructor(settingsController) {
        /** @type {SettingsController} */
        this._settingsController = settingsController;
        /** @type {?HTMLElement} */
        this._entryContainer = null;
        /** @type {TranslationTextReplacementsEntry[]} */
        this._entries = [];
    }

    /** */
    async prepare() {
        this._entryContainer = /** @type {HTMLElement} */ (document.querySelector('#translation-text-replacement-list'));
        const addButton = /** @type {HTMLButtonElement} */ (document.querySelector('#translation-text-replacement-add'));

        addButton.addEventListener('click', this._onAdd.bind(this), false);
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));

        await this._updateOptions();
    }

    /** */
    async addGroup() {
        const options = await this._settingsController.getOptions();
        const {groups} = options.translation.textReplacements;
        const newEntry = this._createNewEntry();
        /** @type {import('settings-modifications').Modification} */
        const target = (
            (groups.length === 0) ?
            {
                action: 'splice',
                path: 'translation.textReplacements.groups',
                start: 0,
                deleteCount: 0,
                items: [[newEntry]]
            } :
            {
                action: 'splice',
                path: 'translation.textReplacements.groups[0]',
                start: groups[0].length,
                deleteCount: 0,
                items: [newEntry]
            }
        );

        await this._settingsController.modifyProfileSettings([target]);
        await this._updateOptions();
    }

    /**
     * @param {number} index
     * @returns {Promise<boolean>}
     */
    async deleteGroup(index) {
        const options = await this._settingsController.getOptions();
        const {groups} = options.translation.textReplacements;
        if (groups.length === 0) { return false; }

        const group0 = groups[0];
        if (index < 0 || index >= group0.length) { return false; }

        /** @type {import('settings-modifications').Modification} */
        const target = (
            (group0.length > 1) ?
            {
                action: 'splice',
                path: 'translation.textReplacements.groups[0]',
                start: index,
                deleteCount: 1,
                items: []
            } :
            {
                action: 'splice',
                path: 'translation.textReplacements.groups',
                start: 0,
                deleteCount: group0.length,
                items: []
            }
        );

        await this._settingsController.modifyProfileSettings([target]);
        await this._updateOptions();
        return true;
    }

    // Private

    /**
     * @param {import('settings-controller').OptionsChangedEvent} details
     */
    _onOptionsChanged({options}) {
        for (const entry of this._entries) {
            entry.cleanup();
        }
        this._entries = [];

        const {groups} = options.translation.textReplacements;
        if (groups.length > 0) {
            const group0 = groups[0];
            for (let i = 0, ii = group0.length; i < ii; ++i) {
                const node = /** @type {HTMLElement} */ (this._settingsController.instantiateTemplate('translation-text-replacement-entry'));
                /** @type {HTMLElement} */ (this._entryContainer).appendChild(node);
                const entry = new TranslationTextReplacementsEntry(this, node, i);
                this._entries.push(entry);
                entry.prepare();
            }
        }
    }

    /** */
    _onAdd() {
        this.addGroup();
    }

    /** */
    async _updateOptions() {
        const options = await this._settingsController.getOptions();
        const optionsContext = this._settingsController.getOptionsContext();
        this._onOptionsChanged({options, optionsContext});
    }

    /**
     * @returns {import('settings').TranslationTextReplacementGroup}
     */
    _createNewEntry() {
        return {pattern: '', ignoreCase: false, replacement: ''};
    }
}

class TranslationTextReplacementsEntry {
    /**
     * @param {TranslationTextReplacementsController} parent
     * @param {HTMLElement} node
     * @param {number} index
     */
    constructor(parent, node, index) {
        /** @type {TranslationTextReplacementsController} */
        this._parent = parent;
        /** @type {HTMLElement} */
        this._node = node;
        /** @type {number} */
        this._index = index;
        /** @type {EventListenerCollection} */
        this._eventListeners = new EventListenerCollection();
        /** @type {?HTMLInputElement} */
        this._patternInput = null;
        /** @type {?HTMLInputElement} */
        this._replacementInput = null;
        /** @type {?HTMLInputElement} */
        this._ignoreCaseToggle = null;
        /** @type {?HTMLInputElement} */
        this._testInput = null;
        /** @type {?HTMLInputElement} */
        this._testOutput = null;
    }

    /** */
    prepare() {
        const patternInput = /** @type {HTMLInputElement} */ (this._node.querySelector('.translation-text-replacement-pattern'));
        const replacementInput = /** @type {HTMLInputElement} */ (this._node.querySelector('.translation-text-replacement-replacement'));
        const ignoreCaseToggle = /** @type {HTMLInputElement} */ (this._node.querySelector('.translation-text-replacement-pattern-ignore-case'));
        const menuButton = /** @type {HTMLInputElement} */ (this._node.querySelector('.translation-text-replacement-button'));
        const testInput = /** @type {HTMLInputElement} */ (this._node.querySelector('.translation-text-replacement-test-input'));
        const testOutput = /** @type {HTMLInputElement} */ (this._node.querySelector('.translation-text-replacement-test-output'));

        this._patternInput = patternInput;
        this._replacementInput = replacementInput;
        this._ignoreCaseToggle = ignoreCaseToggle;
        this._testInput = testInput;
        this._testOutput = testOutput;

        const pathBase = `translation.textReplacements.groups[0][${this._index}]`;
        patternInput.dataset.setting = `${pathBase}.pattern`;
        replacementInput.dataset.setting = `${pathBase}.replacement`;
        ignoreCaseToggle.dataset.setting = `${pathBase}.ignoreCase`;

        this._eventListeners.addEventListener(menuButton, 'menuOpen', this._onMenuOpen.bind(this), false);
        this._eventListeners.addEventListener(menuButton, 'menuClose', this._onMenuClose.bind(this), false);
        this._eventListeners.addEventListener(patternInput, 'settingChanged', this._onPatternChanged.bind(this), false);
        this._eventListeners.addEventListener(ignoreCaseToggle, 'settingChanged', this._updateTestInput.bind(this), false);
        this._eventListeners.addEventListener(replacementInput, 'settingChanged', this._updateTestInput.bind(this), false);
        this._eventListeners.addEventListener(testInput, 'input', this._updateTestInput.bind(this), false);
    }

    /** */
    cleanup() {
        this._eventListeners.removeAllEventListeners();
        if (this._node.parentNode !== null) {
            this._node.parentNode.removeChild(this._node);
        }
    }

    // Private

    /**
     * @param {import('popup-menu').MenuOpenEvent} e
     */
    _onMenuOpen(e) {
        const bodyNode = e.detail.menu.bodyNode;
        const testVisible = this._isTestVisible();
        /** @type {HTMLElement} */ (bodyNode.querySelector('[data-menu-action=showTest]')).hidden = testVisible;
        /** @type {HTMLElement} */ (bodyNode.querySelector('[data-menu-action=hideTest]')).hidden = !testVisible;
    }

    /**
     * @param {import('popup-menu').MenuCloseEvent} e
     */
    _onMenuClose(e) {
        switch (e.detail.action) {
            case 'remove':
                this._parent.deleteGroup(this._index);
                break;
            case 'showTest':
                this._setTestVisible(true);
                break;
            case 'hideTest':
                this._setTestVisible(false);
                break;
        }
    }

    /**
     * @param {import('dom-data-binder').SettingChangedEvent} deatils
     */
    _onPatternChanged({detail: {value}}) {
        this._validatePattern(value);
        this._updateTestInput();
    }

    /**
     * @param {unknown} value
     */
    _validatePattern(value) {
        let okay = false;
        try {
            if (typeof value === 'string') {
                new RegExp(value, 'g');
                okay = true;
            }
        } catch (e) {
            // NOP
        }

        if (this._patternInput !== null) {
            this._patternInput.dataset.invalid = `${!okay}`;
        }
    }

    /**
     * @returns {boolean}
     */
    _isTestVisible() {
        return this._node.dataset.testVisible === 'true';
    }

    /**
     * @param {boolean} visible
     */
    _setTestVisible(visible) {
        this._node.dataset.testVisible = `${visible}`;
        this._updateTestInput();
    }

    /** */
    _updateTestInput() {
        if (
            !this._isTestVisible() ||
            this._ignoreCaseToggle === null ||
            this._patternInput === null ||
            this._replacementInput === null ||
            this._testInput === null ||
            this._testOutput === null
        ) { return; }

        const ignoreCase = this._ignoreCaseToggle.checked;
        const pattern = this._patternInput.value;
        let regex;
        try {
            regex = new RegExp(pattern, ignoreCase ? 'gi' : 'g');
        } catch (e) {
            return;
        }

        const replacement = this._replacementInput.value;
        const input = this._testInput.value;
        const output = input.replace(regex, replacement);
        this._testOutput.value = output;
    }
}
