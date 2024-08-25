/*
 * Copyright (C) 2023-2024  Yomitan Authors
 * Copyright (C) 2016-2022  Yomichan Authors
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

import * as wanakana from '../../lib/wanakana.js';
import {ClipboardMonitor} from '../comm/clipboard-monitor.js';
import {createApiMap, invokeApiMapHandler} from '../core/api-map.js';
import {EventListenerCollection} from '../core/event-listener-collection.js';
import {querySelectorNotNull} from '../dom/query-selector.js';

export class SearchDisplayController {
    /**
     * @param {import('./display.js').Display} display
     * @param {import('./display-audio.js').DisplayAudio} displayAudio
     * @param {import('./search-persistent-state-controller.js').SearchPersistentStateController} searchPersistentStateController
     */
    constructor(display, displayAudio, searchPersistentStateController) {
        /** @type {import('./display.js').Display} */
        this._display = display;
        /** @type {import('./display-audio.js').DisplayAudio} */
        this._displayAudio = displayAudio;
        /** @type {import('./search-persistent-state-controller.js').SearchPersistentStateController} */
        this._searchPersistentStateController = searchPersistentStateController;
        /** @type {HTMLButtonElement} */
        this._searchButton = querySelectorNotNull(document, '#search-button');
        /** @type {HTMLButtonElement} */
        this._searchBackButton = querySelectorNotNull(document, '#search-back-button');
        /** @type {HTMLTextAreaElement} */
        this._queryInput = querySelectorNotNull(document, '#search-textbox');
        /** @type {HTMLElement} */
        this._introElement = querySelectorNotNull(document, '#intro');
        /** @type {HTMLInputElement} */
        this._clipboardMonitorEnableCheckbox = querySelectorNotNull(document, '#clipboard-monitor-enable');
        /** @type {HTMLInputElement} */
        this._wanakanaEnableCheckbox = querySelectorNotNull(document, '#wanakana-enable');
        /** @type {HTMLInputElement} */
        this._stickyHeaderEnableCheckbox = querySelectorNotNull(document, '#sticky-header-enable');
        /** @type {HTMLSelectElement} */
        this._profileSelect = querySelectorNotNull(document, '#profile-select');
        /** @type {HTMLElement} */
        this._wanakanaSearchOption = querySelectorNotNull(document, '#search-option-wanakana');
        /** @type {EventListenerCollection} */
        this._queryInputEvents = new EventListenerCollection();
        /** @type {boolean} */
        this._queryInputEventsSetup = false;
        /** @type {boolean} */
        this._wanakanaEnabled = false;
        /** @type {boolean} */
        this._wanakanaBound = false;
        /** @type {boolean} */
        this._introVisible = true;
        /** @type {?import('core').Timeout} */
        this._introAnimationTimer = null;
        /** @type {boolean} */
        this._clipboardMonitorEnabled = false;
        /** @type {import('clipboard-monitor').ClipboardReaderLike} */
        this._clipboardReaderLike = {
            getText: this._display.application.api.clipboardGet.bind(this._display.application.api),
        };
        /** @type {ClipboardMonitor} */
        this._clipboardMonitor = new ClipboardMonitor(this._clipboardReaderLike);
        /** @type {import('application').ApiMap} */
        this._apiMap = createApiMap([
            ['searchDisplayControllerGetMode', this._onMessageGetMode.bind(this)],
            ['searchDisplayControllerSetMode', this._onMessageSetMode.bind(this)],
            ['searchDisplayControllerUpdateSearchQuery', this._onExternalSearchUpdate.bind(this)],
        ]);
    }

    /** */
    async prepare() {
        await this._display.updateOptions();

        this._searchPersistentStateController.on('modeChange', this._onModeChange.bind(this));

        chrome.runtime.onMessage.addListener(this._onMessage.bind(this));
        this._display.application.on('optionsUpdated', this._onOptionsUpdated.bind(this));

        this._display.on('optionsUpdated', this._onDisplayOptionsUpdated.bind(this));
        this._display.on('contentUpdateStart', this._onContentUpdateStart.bind(this));

        this._display.hotkeyHandler.registerActions([
            ['focusSearchBox', this._onActionFocusSearchBox.bind(this)],
        ]);

        this._updateClipboardMonitorEnabled();

        this._displayAudio.autoPlayAudioDelay = 0;
        this._display.queryParserVisible = true;
        this._display.setHistorySettings({useBrowserHistory: true});

        this._searchButton.addEventListener('click', this._onSearch.bind(this), false);
        this._searchBackButton.addEventListener('click', this._onSearchBackButtonClick.bind(this), false);
        this._wanakanaEnableCheckbox.addEventListener('change', this._onWanakanaEnableChange.bind(this));
        window.addEventListener('copy', this._onCopy.bind(this));
        window.addEventListener('paste', this._onPaste.bind(this));
        this._clipboardMonitor.on('change', this._onClipboardMonitorChange.bind(this));
        this._clipboardMonitorEnableCheckbox.addEventListener('change', this._onClipboardMonitorEnableChange.bind(this));
        this._stickyHeaderEnableCheckbox.addEventListener('change', this._onStickyHeaderEnableChange.bind(this));
        this._display.hotkeyHandler.on('keydownNonHotkey', this._onKeyDown.bind(this));

        const displayOptions = this._display.getOptions();
        if (displayOptions !== null) {
            await this._onDisplayOptionsUpdated({options: displayOptions});
        }
    }

    /**
     * @param {import('display').SearchMode} mode
     */
    setMode(mode) {
        this._searchPersistentStateController.mode = mode;
    }

    // Actions

    /** */
    _onActionFocusSearchBox() {
        if (this._queryInput === null) { return; }
        this._queryInput.focus();
        this._queryInput.select();
    }

    // Messages

    /** @type {import('application').ApiHandler<'searchDisplayControllerSetMode'>} */
    _onMessageSetMode({mode}) {
        this.setMode(mode);
    }

    /** @type {import('application').ApiHandler<'searchDisplayControllerGetMode'>} */
    _onMessageGetMode() {
        return this._searchPersistentStateController.mode;
    }

    // Private

    /** @type {import('extension').ChromeRuntimeOnMessageCallback<import('application').ApiMessageAny>} */
    _onMessage({action, params}, _sender, callback) {
        return invokeApiMapHandler(this._apiMap, action, params, [], callback);
    }

    /**
     * @param {KeyboardEvent} e
     */
    _onKeyDown(e) {
        const activeElement = document.activeElement;

        const isInputField = this._isElementInput(activeElement);
        const isAllowedKey = e.key.length === 1 || e.key === 'Backspace';
        const isModifierKey = e.ctrlKey || e.metaKey || e.altKey;
        const isSpaceKey = e.key === ' ';
        const isCtrlBackspace = e.ctrlKey && e.key === 'Backspace';

        if (!isInputField && (!isModifierKey || isCtrlBackspace) && isAllowedKey && !isSpaceKey) {
            this._queryInput.focus({preventScroll: true});
        }
    }

    /** */
    async _onOptionsUpdated() {
        await this._display.updateOptions();
        const query = this._queryInput.value;
        if (query) {
            this._display.searchLast(false);
        }
    }

    /**
     * @param {import('display').EventArgument<'optionsUpdated'>} details
     */
    async _onDisplayOptionsUpdated({options}) {
        this._clipboardMonitorEnabled = options.clipboard.enableSearchPageMonitor;
        this._updateClipboardMonitorEnabled();
        this._updateSearchSettings(options);
        this._queryInput.lang = options.general.language;
        await this._updateProfileSelect();
    }

    /**
     * @param {import('settings').ProfileOptions} options
     */
    _updateSearchSettings(options) {
        const {language, enableWanakana, stickySearchHeader} = options.general;
        const wanakanaEnabled = language === 'ja' && enableWanakana;
        this._wanakanaEnableCheckbox.checked = wanakanaEnabled;
        this._wanakanaSearchOption.style.display = language === 'ja' ? '' : 'none';
        this._setWanakanaEnabled(wanakanaEnabled);
        this._setStickyHeaderEnabled(stickySearchHeader);
    }

    /**
     * @param {import('display').EventArgument<'contentUpdateStart'>} details
     */
    _onContentUpdateStart({type, query}) {
        let animate = false;
        let valid = false;
        let showBackButton = false;
        switch (type) {
            case 'terms':
            case 'kanji':
                {
                    const {content, state} = this._display.history;
                    animate = (typeof content === 'object' && content !== null && content.animate === true);
                    showBackButton = (typeof state === 'object' && state !== null && state.cause === 'queryParser');
                    valid = (typeof query === 'string' && query.length > 0);
                    this._display.blurElement(this._queryInput);
                }
                break;
            case 'clear':
                valid = false;
                animate = true;
                query = '';
                break;
        }

        if (typeof query !== 'string') { query = ''; }

        this._searchBackButton.hidden = !showBackButton;

        if (this._queryInput.value !== query) {
            this._queryInput.value = query;
            this._updateSearchHeight(true);
        }
        this._setIntroVisible(!valid, animate);
    }

    /** */
    _onSearchInput() {
        this._updateSearchHeight(true);
    }

    /**
     * @param {KeyboardEvent} e
     */
    _onSearchKeydown(e) {
        if (e.isComposing) { return; }
        const {code, key} = e;
        if (!((code === 'Enter' || key === 'Enter' || code === 'NumpadEnter') && !e.shiftKey)) { return; }

        // Search
        const element = /** @type {HTMLElement} */ (e.currentTarget);
        e.preventDefault();
        e.stopImmediatePropagation();
        this._display.blurElement(element);
        this._search(true, 'new', true, null);
    }

    /**
     * @param {MouseEvent} e
     */
    _onSearch(e) {
        e.preventDefault();
        this._search(true, 'new', true, null);
    }

    /** */
    _onSearchBackButtonClick() {
        this._display.history.back();
    }

    /** */
    async _onCopy() {
        // Ignore copy from search page
        this._clipboardMonitor.setPreviousText(document.hasFocus() ? await this._clipboardReaderLike.getText(false) : '');
    }

    /**
     * @param {ClipboardEvent} e
     */
    _onPaste(e) {
        if (e.target === this._queryInput) {
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        const text = e.clipboardData?.getData('text');
        if (!text) {
            return;
        }
        if (this._queryInput.value !== text) {
            this._queryInput.value = text;
            this._updateSearchHeight(true);
            this._search(true, 'new', true, null);
        }
    }

    /** @type {import('application').ApiHandler<'searchDisplayControllerUpdateSearchQuery'>} */
    _onExternalSearchUpdate({text, animate}) {
        void this._updateSearchFromClipboard(text, animate, false);
    }

    /**
     * @param {import('clipboard-monitor').Events['change']} event
     */
    _onClipboardMonitorChange({text}) {
        void this._updateSearchFromClipboard(text, true, true);
    }

    /**
     * @param {string} text
     * @param {boolean} animate
     * @param {boolean} checkText
     */
    async _updateSearchFromClipboard(text, animate, checkText) {
        const options = this._display.getOptions();
        if (options === null) { return; }
        if (checkText && !await this._display.application.api.isTextLookupWorthy(text, options.general.language)) { return; }
        const {clipboard: {autoSearchContent, maximumSearchLength}} = options;
        if (text.length > maximumSearchLength) {
            text = text.substring(0, maximumSearchLength);
        }
        this._queryInput.value = text;
        this._updateSearchHeight(true);
        this._search(animate, 'clear', autoSearchContent, ['clipboard']);
    }

    /**
     * @param {Event} e
     */
    _onWanakanaEnableChange(e) {
        const element = /** @type {HTMLInputElement} */ (e.target);
        const value = element.checked;
        this._setWanakanaEnabled(value);
        /** @type {import('settings-modifications').ScopedModificationSet} */
        const modification = {
            action: 'set',
            path: 'general.enableWanakana',
            value,
            scope: 'profile',
            optionsContext: this._display.getOptionsContext(),
        };
        void this._display.application.api.modifySettings([modification], 'search');
    }

    /**
     * @param {Event} e
     */
    _onClipboardMonitorEnableChange(e) {
        const element = /** @type {HTMLInputElement} */ (e.target);
        const enabled = element.checked;
        void this._setClipboardMonitorEnabled(enabled);
    }

    /**
     * @param {Event} e
     */
    _onStickyHeaderEnableChange(e) {
        const element = /** @type {HTMLInputElement} */ (e.target);
        const value = element.checked;
        this._setStickyHeaderEnabled(value);
        /** @type {import('settings-modifications').ScopedModificationSet} */
        const modification = {
            action: 'set',
            path: 'general.stickySearchHeader',
            value,
            scope: 'profile',
            optionsContext: this._display.getOptionsContext(),
        };
        void this._display.application.api.modifySettings([modification], 'search');
    }

    /**
     * @param {boolean} stickySearchHeaderEnabled
     */
    _setStickyHeaderEnabled(stickySearchHeaderEnabled) {
        this._stickyHeaderEnableCheckbox.checked = stickySearchHeaderEnabled;
    }

    /** */
    _onModeChange() {
        this._updateClipboardMonitorEnabled();
    }

    /**
     * @param {Event} event
     */
    async _onProfileSelectChange(event) {
        const node = /** @type {HTMLInputElement} */ (event.currentTarget);
        const value = Number.parseInt(node.value, 10);
        const optionsFull = await this._display.application.api.optionsGetFull();
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= optionsFull.profiles.length) {
            await this._setDefaultProfileIndex(value);
        }
    }

    /**
     * @param {number} value
     */
    async _setDefaultProfileIndex(value) {
        /** @type {import('settings-modifications').ScopedModificationSet} */
        const modification = {
            action: 'set',
            path: 'profileCurrent',
            value,
            scope: 'global',
            optionsContext: null,
        };
        await this._display.application.api.modifySettings([modification], 'search');
    }

    /**
     * @param {boolean} enabled
     */
    _setWanakanaEnabled(enabled) {
        if (this._queryInputEventsSetup && this._wanakanaEnabled === enabled) { return; }

        const input = this._queryInput;
        this._queryInputEvents.removeAllEventListeners();
        this._queryInputEvents.addEventListener(input, 'keydown', this._onSearchKeydown.bind(this), false);

        this._wanakanaEnabled = enabled;
        if (enabled) {
            if (!this._wanakanaBound) {
                wanakana.bind(input);
                this._wanakanaBound = true;
            }
        } else {
            if (this._wanakanaBound) {
                wanakana.unbind(input);
                this._wanakanaBound = false;
            }
        }

        this._queryInputEvents.addEventListener(input, 'input', this._onSearchInput.bind(this), false);
        this._queryInputEventsSetup = true;
    }

    /**
     * @param {boolean} visible
     * @param {boolean} animate
     */
    _setIntroVisible(visible, animate) {
        if (this._introVisible === visible) {
            return;
        }

        this._introVisible = visible;

        if (this._introElement === null) {
            return;
        }

        if (this._introAnimationTimer !== null) {
            clearTimeout(this._introAnimationTimer);
            this._introAnimationTimer = null;
        }

        if (visible) {
            this._showIntro(animate);
        } else {
            this._hideIntro(animate);
        }
    }

    /**
     * @param {boolean} animate
     */
    _showIntro(animate) {
        if (animate) {
            const duration = 0.4;
            this._introElement.style.transition = '';
            this._introElement.style.height = '';
            const size = this._introElement.getBoundingClientRect();
            this._introElement.style.height = '0px';
            this._introElement.style.transition = `height ${duration}s ease-in-out 0s`;
            window.getComputedStyle(this._introElement).getPropertyValue('height'); // Commits height so next line can start animation
            this._introElement.style.height = `${size.height}px`;
            this._introAnimationTimer = setTimeout(() => {
                this._introElement.style.height = '';
                this._introAnimationTimer = null;
            }, duration * 1000);
        } else {
            this._introElement.style.transition = '';
            this._introElement.style.height = '';
        }
    }

    /**
     * @param {boolean} animate
     */
    _hideIntro(animate) {
        if (animate) {
            const duration = 0.4;
            const size = this._introElement.getBoundingClientRect();
            this._introElement.style.height = `${size.height}px`;
            this._introElement.style.transition = `height ${duration}s ease-in-out 0s`;
            window.getComputedStyle(this._introElement).getPropertyValue('height'); // Commits height so next line can start animation
        } else {
            this._introElement.style.transition = '';
        }
        this._introElement.style.height = '0';
    }

    /**
     * @param {boolean} value
     */
    async _setClipboardMonitorEnabled(value) {
        let modify = true;
        if (value) {
            value = await this._requestPermissions(['clipboardRead']);
            modify = value;
        }

        this._clipboardMonitorEnabled = value;
        this._updateClipboardMonitorEnabled();

        if (!modify) { return; }

        /** @type {import('settings-modifications').ScopedModificationSet} */
        const modification = {
            action: 'set',
            path: 'clipboard.enableSearchPageMonitor',
            value,
            scope: 'profile',
            optionsContext: this._display.getOptionsContext(),
        };
        await this._display.application.api.modifySettings([modification], 'search');
    }

    /** */
    _updateClipboardMonitorEnabled() {
        const enabled = this._clipboardMonitorEnabled;
        this._clipboardMonitorEnableCheckbox.checked = enabled;
        if (enabled && this._canEnableClipboardMonitor()) {
            this._clipboardMonitor.start();
        } else {
            this._clipboardMonitor.stop();
        }
    }

    /**
     * @returns {boolean}
     */
    _canEnableClipboardMonitor() {
        switch (this._searchPersistentStateController.mode) {
            case 'action-popup':
                return false;
            default:
                return true;
        }
    }

    /**
     * @param {string[]} permissions
     * @returns {Promise<boolean>}
     */
    _requestPermissions(permissions) {
        return new Promise((resolve) => {
            chrome.permissions.request(
                {permissions},
                (granted) => {
                    const e = chrome.runtime.lastError;
                    resolve(!e && granted);
                },
            );
        });
    }

    /**
     * @param {boolean} animate
     * @param {import('display').HistoryMode} historyMode
     * @param {boolean} lookup
     * @param {?import('settings').OptionsContextFlag[]} flags
     */
    _search(animate, historyMode, lookup, flags) {
        const query = this._queryInput.value;
        const depth = this._display.depth;
        const url = window.location.href;
        const documentTitle = document.title;
        /** @type {import('settings').OptionsContext} */
        const optionsContext = {depth, url};
        if (flags !== null) {
            optionsContext.flags = flags;
        }
        const {tabId, frameId} = this._display.application;
        /** @type {import('display').ContentDetails} */
        const details = {
            focus: false,
            historyMode,
            params: {
                query,
            },
            state: {
                focusEntry: 0,
                optionsContext,
                url,
                sentence: {text: query, offset: 0},
                documentTitle,
            },
            content: {
                dictionaryEntries: void 0,
                animate,
                contentOrigin: {tabId, frameId},
            },
        };
        if (!lookup) { details.params.lookup = 'false'; }
        this._display.setContent(details);
    }

    /**
     * @param {boolean} shrink
     */
    _updateSearchHeight(shrink) {
        const searchTextbox = this._queryInput;
        const searchItems = [this._queryInput, this._searchButton, this._searchBackButton];

        if (shrink) {
            for (const searchButton of searchItems) {
                searchButton.style.height = '0';
            }
        }
        const {scrollHeight} = searchTextbox;
        const currentHeight = searchTextbox.getBoundingClientRect().height;
        if (shrink || scrollHeight >= currentHeight - 1) {
            for (const searchButton of searchItems) {
                searchButton.style.height = `${scrollHeight}px`;
            }
        }
    }

    /**
     * @param {?Element} element
     * @returns {boolean}
     */
    _isElementInput(element) {
        if (element === null) { return false; }
        switch (element.tagName.toLowerCase()) {
            case 'input':
            case 'textarea':
            case 'button':
            case 'select':
                return true;
        }
        return element instanceof HTMLElement && !!element.isContentEditable;
    }

    /** */
    async _updateProfileSelect() {
        const {profiles, profileCurrent} = await this._display.application.api.optionsGetFull();

        /** @type {HTMLElement} */
        const optionGroup = querySelectorNotNull(document, '#profile-select-option-group');
        while (optionGroup.firstChild) {
            optionGroup.removeChild(optionGroup.firstChild);
        }

        const fragment = document.createDocumentFragment();
        for (let i = 0, ii = profiles.length; i < ii; ++i) {
            const {name} = profiles[i];
            const option = document.createElement('option');
            option.textContent = name;
            option.value = `${i}`;
            fragment.appendChild(option);
        }
        optionGroup.textContent = '';
        optionGroup.appendChild(fragment);
        this._profileSelect.value = `${profileCurrent}`;

        this._profileSelect.addEventListener('change', this._onProfileSelectChange.bind(this), false);
    }
}
