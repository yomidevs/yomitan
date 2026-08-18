/*
 * Copyright (C) 2023-2026  Yomitan Authors
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

import {EventListenerCollection} from '../../core/event-listener-collection.js';
import {parseJson} from '../../core/json.js';
import {log} from '../../core/log.js';
import {isObjectNotArray} from '../../core/object-utilities.js';
import {toError} from '../../core/to-error.js';
import {arrayBufferUtf8Decode} from '../../data/array-buffer-util.js';
import {querySelectorNotNull} from '../../dom/query-selector.js';
import {getSettingsExportDateString} from './backup-controller.js';

export class TranslationTextReplacementsController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     * @param {import('./modal-controller.js').ModalController} modalController
     */
    constructor(settingsController, modalController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {import('./modal-controller.js').ModalController} */
        this._modalController = modalController;
        /** @type {HTMLElement} */
        this._entryContainer = querySelectorNotNull(document, '#translation-text-replacement-list');
        /** @type {TranslationTextReplacementsEntry[]} */
        this._entries = [];
        /** @type {?HTMLElement} */
        this._statusNode = null;
        /** @type {?() => void} */
        this._exportRevoke = null;
        /** @type {number} */
        this._currentVersion = 0;
    }

    /** */
    async prepare() {
        /** @type {HTMLButtonElement} */
        const addButton = querySelectorNotNull(document, '#translation-text-replacement-add');
        /** @type {HTMLButtonElement} */
        const importButton = querySelectorNotNull(document, '#translation-text-replacement-import-button');
        /** @type {HTMLInputElement} */
        const importFileInput = querySelectorNotNull(document, '#translation-text-replacement-import-file');
        /** @type {HTMLButtonElement} */
        const exportButton = querySelectorNotNull(document, '#translation-text-replacement-export-button');
        /** @type {HTMLElement} */
        const statusNode = querySelectorNotNull(document, '#translation-text-replacement-import-status');

        this._statusNode = statusNode;

        addButton.addEventListener('click', this._onAdd.bind(this), false);
        importButton.addEventListener('click', this._onImportClick.bind(this), false);
        importFileInput.addEventListener('change', this._onImportFileChange.bind(this), false);
        exportButton.addEventListener('click', this._onExportClick.bind(this), false);
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));

        if (this._modalController !== null) {
            const modal = this._modalController.getModal('translation-text-replacement-patterns');
            if (modal !== null) {
                modal.on('visibilityChanged', this._onModalVisibilityChanged.bind(this));
            }
        }

        await this._updateOptions();
    }

    /** */
    async addGroup() {
        await this._appendEntries([this._createNewEntry()]);
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
                items: [],
            } :
            {
                action: 'splice',
                path: 'translation.textReplacements.groups',
                start: 0,
                deleteCount: group0.length,
                items: [],
            }
        );

        await this._settingsController.modifyProfileSettings([target]);
        await this._updateOptions();
        return true;
    }

    // Private

    /**
     * @param {import('settings-controller').EventArgument<'optionsChanged'>} details
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
        void this.addGroup();
    }

    /**
     * @param {import('panel-element').EventArgument<'visibilityChanged'>} details
     */
    _onModalVisibilityChanged({visible}) {
        if (visible) {
            this._setStatus(null, false);
        }
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

    /**
     * @param {import('settings').TranslationTextReplacementGroup[]} entries
     */
    async _appendEntries(entries) {
        if (entries.length === 0) { return; }

        const options = await this._settingsController.getOptions();
        const {groups} = options.translation.textReplacements;
        /** @type {import('settings-modifications').Modification} */
        const target = (
            (groups.length === 0) ?
            {
                action: 'splice',
                path: 'translation.textReplacements.groups',
                start: 0,
                deleteCount: 0,
                items: [entries],
            } :
            {
                action: 'splice',
                path: 'translation.textReplacements.groups[0]',
                start: groups[0].length,
                deleteCount: 0,
                items: entries,
            }
        );

        await this._settingsController.modifyProfileSettings([target]);
        await this._updateOptions();
    }

    /** */
    _onExportClick() {
        void this._exportPatterns();
    }

    /** */
    async _exportPatterns() {
        this._setStatus(null, false);

        if (this._exportRevoke !== null) {
            this._exportRevoke();
            this._exportRevoke = null;
        }

        const options = await this._settingsController.getOptions();
        const {groups} = options.translation.textReplacements;
        const patterns = groups.length > 0 ? groups[0] : [];
        if (patterns.length === 0) {
            this._setStatus('There are no text replacement patterns to export.', true);
            return;
        }

        const date = new Date(Date.now());
        /** @type {import('translation-text-replacements-controller').TextReplacementsBackupData} */
        const data = {
            version: this._currentVersion,
            patterns: patterns.map(({pattern, ignoreCase, replacement}) => ({pattern, ignoreCase, replacement})),
        };

        const fileName = `yomitan-text-replacements-${getSettingsExportDateString(date, '-', '-', '-', 6)}.json`;
        const blob = new Blob([JSON.stringify(data, null, 4)], {type: 'application/json'});
        this._saveBlob(blob, fileName);
        this._setStatus(`Exported ${patterns.length} ${patterns.length === 1 ? 'pattern' : 'patterns'}.`, false);
    }

    /**
     * @param {Blob} blob
     * @param {string} fileName
     */
    _saveBlob(blob, fileName) {
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        a.rel = 'noopener';
        a.target = '_blank';

        const revoke = () => {
            URL.revokeObjectURL(blobUrl);
            a.href = '';
            this._exportRevoke = null;
        };
        this._exportRevoke = revoke;

        a.dispatchEvent(new MouseEvent('click'));
        setTimeout(revoke, 60000);
    }

    /** */
    _onImportClick() {
        this._setStatus(null, false);
        /** @type {HTMLElement} */
        const element = querySelectorNotNull(document, '#translation-text-replacement-import-file');
        element.click();
    }

    /**
     * @param {Event} e
     */
    async _onImportFileChange(e) {
        const element = /** @type {HTMLInputElement} */ (e.currentTarget);
        const files = element.files;
        if (files === null || files.length === 0) { return; }

        const file = files[0];
        element.value = '';
        try {
            const {added, skipped} = await this._importPatternsFile(file);
            const parts = [`Imported ${added} ${added === 1 ? 'pattern' : 'patterns'}.`];
            if (skipped > 0) {
                parts.push(`Skipped ${skipped} already present.`);
            }
            this._setStatus(parts.join(' '), false);
        } catch (error) {
            const error2 = toError(error);
            log.error(error2);
            this._setStatus(`Import failed: ${error2.message}`, true);
        }
    }

    /**
     * @param {File} file
     * @returns {Promise<import('translation-text-replacements-controller').ImportResult>}
     */
    async _importPatternsFile(file) {
        const dataString = arrayBufferUtf8Decode(await this._readFileArrayBuffer(file));
        /** @type {unknown} */
        const data = parseJson(dataString);
        const patterns = this._parseImportedPatterns(data);

        const options = await this._settingsController.getOptions();
        const {groups} = options.translation.textReplacements;
        const existing = new Set((groups.length > 0 ? groups[0] : []).map((entry) => this._getEntryKey(entry)));

        /** @type {import('settings').TranslationTextReplacementGroup[]} */
        const entries = [];
        let skipped = 0;
        for (const entry of patterns) {
            const key = this._getEntryKey(entry);
            if (existing.has(key)) {
                ++skipped;
                continue;
            }
            existing.add(key);
            entries.push(entry);
        }

        await this._appendEntries(entries);
        return {added: entries.length, skipped};
    }

    /**
     * @param {unknown} data
     * @returns {import('settings').TranslationTextReplacementGroup[]}
     * @throws {Error}
     */
    _parseImportedPatterns(data) {
        /** @type {unknown} */
        let rawPatterns;
        if (Array.isArray(data)) {
            rawPatterns = data;
        } else if (isObjectNotArray(data)) {
            const version = data.version;
            if (typeof version === 'number' && version > this._currentVersion) {
                throw new Error(`Unsupported version: ${version}`);
            }
            rawPatterns = data.patterns;
        }
        if (!Array.isArray(rawPatterns)) {
            throw new Error('Expected an array of patterns, or an object with a "patterns" array');
        }

        /** @type {import('settings').TranslationTextReplacementGroup[]} */
        const result = [];
        for (let i = 0, ii = rawPatterns.length; i < ii; ++i) {
            result.push(this._parseImportedPattern(rawPatterns[i], `Pattern ${i + 1}`));
        }
        return result;
    }

    /**
     * @param {unknown} entry
     * @param {string} label
     * @returns {import('settings').TranslationTextReplacementGroup}
     * @throws {Error}
     */
    _parseImportedPattern(entry, label) {
        if (!isObjectNotArray(entry)) {
            throw new Error(`${label} is not an object`);
        }
        const {pattern, ignoreCase, replacement} = entry;
        if (typeof pattern !== 'string') {
            throw new Error(`${label} is missing a string "pattern" field`);
        }
        if (typeof replacement !== 'string') {
            throw new Error(`${label} is missing a string "replacement" field`);
        }
        if (typeof ignoreCase !== 'undefined' && typeof ignoreCase !== 'boolean') {
            throw new Error(`${label} has a non-boolean "ignoreCase" field`);
        }
        try {
            // eslint-disable-next-line no-new
            new RegExp(pattern, 'g');
        } catch (e) {
            throw new Error(`${label} is not a valid regular expression: ${pattern}`);
        }
        return {pattern, ignoreCase: ignoreCase === true, replacement};
    }

    /**
     * @param {import('settings').TranslationTextReplacementGroup} entry
     * @returns {string}
     */
    _getEntryKey({pattern, ignoreCase, replacement}) {
        return JSON.stringify([pattern, ignoreCase, replacement]);
    }

    /**
     * @param {File} file
     * @returns {Promise<ArrayBuffer>}
     */
    _readFileArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(/** @type {ArrayBuffer} */ (reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * @param {?string} message
     * @param {boolean} isError
     */
    _setStatus(message, isError) {
        const node = this._statusNode;
        if (node === null) { return; }
        node.textContent = message !== null ? message : '';
        node.hidden = (message === null);
        node.classList.toggle('danger-text', isError);
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
        /** @type {HTMLInputElement} */
        const patternInput = querySelectorNotNull(this._node, '.translation-text-replacement-pattern');
        /** @type {HTMLInputElement} */
        const replacementInput = querySelectorNotNull(this._node, '.translation-text-replacement-replacement');
        /** @type {HTMLInputElement} */
        const ignoreCaseToggle = querySelectorNotNull(this._node, '.translation-text-replacement-pattern-ignore-case');
        /** @type {HTMLInputElement} */
        const menuButton = querySelectorNotNull(this._node, '.translation-text-replacement-button');
        /** @type {HTMLInputElement} */
        const testInput = querySelectorNotNull(this._node, '.translation-text-replacement-test-input');
        /** @type {HTMLInputElement} */
        const testOutput = querySelectorNotNull(this._node, '.translation-text-replacement-test-output');

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
        /** @type {HTMLElement} */
        const element1 = querySelectorNotNull(bodyNode, '[data-menu-action=showTest]');
        /** @type {HTMLElement} */
        const element2 = querySelectorNotNull(bodyNode, '[data-menu-action=hideTest]');
        element1.hidden = testVisible;
        element2.hidden = !testVisible;
    }

    /**
     * @param {import('popup-menu').MenuCloseEvent} e
     */
    _onMenuClose(e) {
        switch (e.detail.action) {
            case 'remove':
                void this._parent.deleteGroup(this._index);
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
                // eslint-disable-next-line no-new
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
