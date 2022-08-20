/*
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

/* global
 * ClipboardMonitor
 * wanakana
 */

class SearchDisplayController {
    constructor(tabId, frameId, display, displayAudio, japaneseUtil, searchPersistentStateController) {
        this._tabId = tabId;
        this._frameId = frameId;
        this._display = display;
        this._displayAudio = displayAudio;
        this._searchPersistentStateController = searchPersistentStateController;
        this._searchButton = document.querySelector('#search-button');
        this._searchBackButton = document.querySelector('#search-back-button');
        this._queryInput = document.querySelector('#search-textbox');
        this._introElement = document.querySelector('#intro');
        this._clipboardMonitorEnableCheckbox = document.querySelector('#clipboard-monitor-enable');
        this._wanakanaEnableCheckbox = document.querySelector('#wanakana-enable');
        this._queryInputEvents = new EventListenerCollection();
        this._queryInputEventsSetup = false;
        this._wanakanaEnabled = false;
        this._wanakanaBound = false;
        this._introVisible = true;
        this._introAnimationTimer = null;
        this._clipboardMonitorEnabled = false;
        this._clipboardMonitor = new ClipboardMonitor({
            japaneseUtil,
            clipboardReader: {
                getText: async () => (await yomichan.api.clipboardGet())
            }
        });
        this._messageHandlers = new Map();
    }

    async prepare() {
        await this._display.updateOptions();

        this._searchPersistentStateController.on('modeChange', this._onModeChange.bind(this));

        chrome.runtime.onMessage.addListener(this._onMessage.bind(this));
        yomichan.on('optionsUpdated', this._onOptionsUpdated.bind(this));

        this._display.on('optionsUpdated', this._onDisplayOptionsUpdated.bind(this));
        this._display.on('contentUpdateStart', this._onContentUpdateStart.bind(this));

        this._display.hotkeyHandler.registerActions([
            ['focusSearchBox', this._onActionFocusSearchBox.bind(this)]
        ]);
        this._registerMessageHandlers([
            ['SearchDisplayController.getMode',           {async: false, handler: this._onMessageGetMode.bind(this)}],
            ['SearchDisplayController.setMode',           {async: false, handler: this._onMessageSetMode.bind(this)}],
            ['SearchDisplayController.updateSearchQuery', {async: false, handler: this._onExternalSearchUpdate.bind(this)}]
        ]);

        this._updateClipboardMonitorEnabled();

        this._displayAudio.autoPlayAudioDelay = 0;
        this._display.queryParserVisible = true;
        this._display.setHistorySettings({useBrowserHistory: true});

        this._searchButton.addEventListener('click', this._onSearch.bind(this), false);
        this._searchBackButton.addEventListener('click', this._onSearchBackButtonClick.bind(this), false);
        this._wanakanaEnableCheckbox.addEventListener('change', this._onWanakanaEnableChange.bind(this));
        window.addEventListener('copy', this._onCopy.bind(this));
        this._clipboardMonitor.on('change', this._onExternalSearchUpdate.bind(this));
        this._clipboardMonitorEnableCheckbox.addEventListener('change', this._onClipboardMonitorEnableChange.bind(this));
        this._display.hotkeyHandler.on('keydownNonHotkey', this._onKeyDown.bind(this));

        this._onDisplayOptionsUpdated({options: this._display.getOptions()});
    }

    setMode(mode) {
        this._setMode(mode, true);
    }

    // Actions

    _onActionFocusSearchBox() {
        if (this._queryInput === null) { return; }
        this._queryInput.focus();
        this._queryInput.select();
    }

    // Messages

    _onMessageSetMode({mode}) {
        this._searchPersistentStateController.mode = mode;
    }

    _onMessageGetMode() {
        return this._searchPersistentStateController.mode;
    }

    // Private

    _onMessage({action, params}, sender, callback) {
        const messageHandler = this._messageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return false; }
        return invokeMessageHandler(messageHandler, params, callback, sender);
    }

    _onKeyDown(e) {
        const {activeElement} = document;
        if (
            activeElement !== this._queryInput &&
            !this._isElementInput(activeElement) &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey &&
            e.key.length === 1 &&
            e.key !== ' '
        ) {
            this._queryInput.focus({preventScroll: true});
        }
    }

    async _onOptionsUpdated() {
        await this._display.updateOptions();
        const query = this._queryInput.value;
        if (query) {
            this._display.searchLast(false);
        }
    }

    _onDisplayOptionsUpdated({options}) {
        this._clipboardMonitorEnabled = options.clipboard.enableSearchPageMonitor;
        this._updateClipboardMonitorEnabled();

        const enableWanakana = !!this._display.getOptions().general.enableWanakana;
        this._wanakanaEnableCheckbox.checked = enableWanakana;
        this._setWanakanaEnabled(enableWanakana);
    }

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

    _onSearchInput() {
        this._updateSearchHeight(false);
    }

    _onSearchKeydown(e) {
        if (e.isComposing) { return; }
        const {code} = e;
        if (!((code === 'Enter' || code === 'NumpadEnter') && !e.shiftKey)) { return; }

        // Search
        e.preventDefault();
        e.stopImmediatePropagation();
        this._display.blurElement(e.currentTarget);
        this._search(true, 'new', true, null);
    }

    _onSearch(e) {
        e.preventDefault();
        this._search(true, 'new', true, null);
    }

    _onSearchBackButtonClick() {
        this._display.history.back();
    }

    _onCopy() {
        // ignore copy from search page
        this._clipboardMonitor.setPreviousText(window.getSelection().toString().trim());
    }

    _onExternalSearchUpdate({text, animate=true}) {
        const {clipboard: {autoSearchContent, maximumSearchLength}} = this._display.getOptions();
        if (text.length > maximumSearchLength) {
            text = text.substring(0, maximumSearchLength);
        }
        this._queryInput.value = text;
        this._updateSearchHeight(true);
        this._search(animate, 'clear', autoSearchContent, ['clipboard']);
    }

    _onWanakanaEnableChange(e) {
        const value = e.target.checked;
        this._setWanakanaEnabled(value);
        yomichan.api.modifySettings([{
            action: 'set',
            path: 'general.enableWanakana',
            value,
            scope: 'profile',
            optionsContext: this._display.getOptionsContext()
        }], 'search');
    }

    _onClipboardMonitorEnableChange(e) {
        const enabled = e.target.checked;
        this._setClipboardMonitorEnabled(enabled);
    }

    _onModeChange() {
        this._updateClipboardMonitorEnabled();
    }

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

    async _setClipboardMonitorEnabled(value) {
        let modify = true;
        if (value) {
            value = await this._requestPermissions(['clipboardRead']);
            modify = value;
        }

        this._clipboardMonitorEnabled = value;
        this._updateClipboardMonitorEnabled();

        if (!modify) { return; }

        await yomichan.api.modifySettings([{
            action: 'set',
            path: 'clipboard.enableSearchPageMonitor',
            value,
            scope: 'profile',
            optionsContext: this._display.getOptionsContext()
        }], 'search');
    }

    _updateClipboardMonitorEnabled() {
        const enabled = this._clipboardMonitorEnabled;
        this._clipboardMonitorEnableCheckbox.checked = enabled;
        if (enabled && this._canEnableClipboardMonitor()) {
            this._clipboardMonitor.start();
        } else {
            this._clipboardMonitor.stop();
        }
    }

    _canEnableClipboardMonitor() {
        switch (this._searchPersistentStateController.mode) {
            case 'popup':
            case 'action-popup':
                return false;
            default:
                return true;
        }
    }

    _requestPermissions(permissions) {
        return new Promise((resolve) => {
            chrome.permissions.request(
                {permissions},
                (granted) => {
                    const e = chrome.runtime.lastError;
                    resolve(!e && granted);
                }
            );
        });
    }

    _search(animate, historyMode, lookup, flags) {
        const query = this._queryInput.value;
        const depth = this._display.depth;
        const url = window.location.href;
        const documentTitle = document.title;
        const optionsContext = {depth, url};
        if (flags !== null) {
            optionsContext.flags = flags;
        }
        const details = {
            focus: false,
            historyMode,
            params: {
                query
            },
            state: {
                focusEntry: 0,
                optionsContext,
                url,
                sentence: {text: query, offset: 0},
                documentTitle
            },
            content: {
                dictionaryEntries: null,
                animate,
                contentOrigin: {
                    tabId: this._tabId,
                    frameId: this._frameId
                }
            }
        };
        if (!lookup) { details.params.lookup = 'false'; }
        this._display.setContent(details);
    }

    _updateSearchHeight(shrink) {
        const node = this._queryInput;
        if (shrink) {
            node.style.height = '0';
        }
        const {scrollHeight} = node;
        const currentHeight = node.getBoundingClientRect().height;
        if (shrink || scrollHeight >= currentHeight - 1) {
            node.style.height = `${scrollHeight}px`;
        }
    }

    _registerMessageHandlers(handlers) {
        for (const [name, handlerInfo] of handlers) {
            this._messageHandlers.set(name, handlerInfo);
        }
    }

    _isElementInput(element) {
        if (element === null) { return false; }
        switch (element.tagName.toLowerCase()) {
            case 'input':
            case 'textarea':
            case 'button':
            case 'select':
                return true;
        }
        if (element.isContentEditable) { return true; }
        return false;
    }
}
