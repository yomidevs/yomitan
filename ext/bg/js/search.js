/*
 * Copyright (C) 2016-2020  Yomichan Authors
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
 * Display
 * DocumentUtil
 * api
 * wanakana
 */

class DisplaySearch extends Display {
    constructor(japaneseUtil) {
        super('search', japaneseUtil);
        this._searchButton = document.querySelector('#search-button');
        this._queryInput = document.querySelector('#search-textbox');
        this._introElement = document.querySelector('#intro');
        this._clipboardMonitorEnableCheckbox = document.querySelector('#clipboard-monitor-enable');
        this._wanakanaEnableCheckbox = document.querySelector('#wanakana-enable');
        this._queryInputEvents = new EventListenerCollection();
        this._wanakanaEnabled = false;
        this._isPrepared = false;
        this._introVisible = true;
        this._introAnimationTimer = null;
        this._clipboardMonitorEnabled = false;
        this._clipboardMonitor = new ClipboardMonitor({
            japaneseUtil,
            clipboardReader: {
                getText: async () => (await api.clipboardGet())
            }
        });
        this._onKeyDownIgnoreKeys = new Map([
            ['ANY_MOD', new Set([
                'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageDown', 'PageUp', 'Home', 'End', 'Enter', 'Escape',
                'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10',
                'F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20',
                'F21', 'F22', 'F23', 'F24'
            ])],
            ['Control', new Set(['C', 'A', 'Z', 'Y', 'X', 'F', 'G'])],
            ['Meta', new Set(['C', 'A', 'Z', 'Y', 'X', 'F', 'G'])],
            ['OS', new Set()],
            ['Alt', new Set()],
            ['AltGraph', new Set()],
            ['Shift', new Set()]
        ]);
        this.autoPlayAudioDelay = 0;
    }

    async prepare() {
        await super.prepare();
        await this.updateOptions();
        yomichan.on('optionsUpdated', this._onOptionsUpdated.bind(this));

        this.on('contentUpdating', this._onContentUpdating.bind(this));
        this.on('modeChange', this._onModeChange.bind(this));

        this.registerMessageHandlers([
            ['updateSearchQuery', {async: false, handler: this._onExternalSearchUpdate.bind(this)}]
        ]);

        this.queryParserVisible = true;
        this.setHistorySettings({useBrowserHistory: true});

        const enableWanakana = !!this.getOptions().general.enableWanakana;
        this._wanakanaEnableCheckbox.checked = enableWanakana;
        this._setWanakanaEnabled(enableWanakana);

        this._searchButton.addEventListener('click', this._onSearch.bind(this), false);
        this._wanakanaEnableCheckbox.addEventListener('change', this._onWanakanaEnableChange.bind(this));
        window.addEventListener('copy', this._onCopy.bind(this));
        this._clipboardMonitor.on('change', this._onExternalSearchUpdate.bind(this));
        this._clipboardMonitorEnableCheckbox.addEventListener('change', this._onClipboardMonitorEnableChange.bind(this));

        this._onModeChange();

        this.initializeState();

        this._isPrepared = true;
    }

    onEscape() {
        if (this._queryInput === null) {
            return;
        }

        this._queryInput.focus();
        this._queryInput.select();
    }

    onKeyDown(e) {
        const key = DocumentUtil.getKeyFromEvent(e);
        const ignoreKeys = this._onKeyDownIgnoreKeys;

        const activeModifierMap = new Map([
            ['Control', e.ctrlKey],
            ['Meta', e.metaKey],
            ['Shift', e.shiftKey],
            ['Alt', e.altKey],
            ['ANY_MOD', true]
        ]);

        let preventFocus = false;
        for (const [modifier, keys] of ignoreKeys.entries()) {
            const modifierActive = activeModifierMap.get(modifier);
            if (key === modifier || (modifierActive && keys.has(key))) {
                preventFocus = true;
                break;
            }
        }

        if (!super.onKeyDown(e) && !preventFocus && document.activeElement !== this._queryInput) {
            this._queryInput.focus({preventScroll: true});
        }
    }

    postProcessQuery(query) {
        if (this._wanakanaEnabled) {
            try {
                query = this._japaneseUtil.convertToKana(query);
            } catch (e) {
                // NOP
            }
        }
        return query;
    }

    // Private

    async _onOptionsUpdated() {
        await this.updateOptions();
        const query = this._queryInput.value;
        if (query) {
            this.searchLast();
        }
    }

    _onContentUpdating({type, content, source}) {
        let animate = false;
        let valid = false;
        switch (type) {
            case 'terms':
            case 'kanji':
                animate = !!content.animate;
                valid = content.definitions.length > 0;
                this.blurElement(this._queryInput);
                break;
            case 'clear':
                valid = false;
                animate = true;
                source = '';
                break;
        }

        if (typeof source !== 'string') { source = ''; }

        this._queryInput.value = source;
        this._updateSearchHeight();
        this._setIntroVisible(!valid, animate);
    }

    _onSearchInput() {
        this._updateSearchHeight();
    }

    _onSearchKeydown(e) {
        if (e.code !== 'Enter' || e.shiftKey) { return; }

        // Search
        e.preventDefault();
        e.stopImmediatePropagation();
        this.blurElement(e.currentTarget);
        this._search(true, true);
    }

    _onSearch(e) {
        e.preventDefault();
        this._search(true, true);
    }

    _onCopy() {
        // ignore copy from search page
        this._clipboardMonitor.setPreviousText(window.getSelection().toString().trim());
    }

    _onExternalSearchUpdate({text, animate=true}) {
        const {general: {maximumClipboardSearchLength}} = this.getOptions();
        if (text.length > maximumClipboardSearchLength) {
            text = text.substring(0, maximumClipboardSearchLength);
        }
        this._queryInput.value = text;
        this._search(animate, false);
    }

    _onWanakanaEnableChange(e) {
        const value = e.target.checked;
        this._setWanakanaEnabled(value);
        api.modifySettings([{
            action: 'set',
            path: 'general.enableWanakana',
            value,
            scope: 'profile',
            optionsContext: this.getOptionsContext()
        }], 'search');
    }

    _onClipboardMonitorEnableChange(e) {
        const enabled = e.target.checked;
        this._setClipboardMonitorEnabled(enabled);
    }

    _onModeChange() {
        let mode = this.mode;
        if (mode === null) { mode = ''; }
        document.documentElement.dataset.searchMode = mode;
        this._updateClipboardMonitorEnabled();
    }

    _setWanakanaEnabled(enabled) {
        const input = this._queryInput;
        this._queryInputEvents.removeAllEventListeners();

        this._queryInputEvents.addEventListener(input, 'keydown', this._onSearchKeydown.bind(this), false);

        if (this._wanakanaEnabled !== enabled) {
            this._wanakanaEnabled = enabled;
            if (enabled) {
                wanakana.bind(input);
            } else {
                wanakana.unbind(input);
            }
        }

        this._queryInputEvents.addEventListener(input, 'input', this._onSearchInput.bind(this), false);
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

        await api.modifySettings([{
            action: 'set',
            path: 'general.enableClipboardMonitor',
            value,
            scope: 'profile',
            optionsContext: this.getOptionsContext()
        }], 'search');
    }

    _updateClipboardMonitorEnabled() {
        const mode = this.mode;
        const enabled = this._clipboardMonitorEnabled;
        this._clipboardMonitorEnableCheckbox.checked = enabled;
        if (enabled && mode !== 'popup') {
            this._clipboardMonitor.start();
        } else {
            this._clipboardMonitor.stop();
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

    _search(animate, history) {
        const query = this._queryInput.value;
        const details = {
            focus: false,
            history,
            params: {
                query
            },
            state: {
                focusEntry: 0,
                sentence: {text: query, offset: 0},
                url: window.location.href
            },
            content: {
                definitions: null,
                animate
            }
        };
        this.setContent(details);
    }

    _updateSearchHeight() {
        const node = this._queryInput;
        const {scrollHeight} = node;
        const currentHeight = node.getBoundingClientRect().height;
        if (scrollHeight >= currentHeight - 1) {
            node.style.height = `${scrollHeight}px`;
        }
    }
}
