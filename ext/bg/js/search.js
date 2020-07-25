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
 * DOM
 * Display
 * QueryParser
 * api
 * wanakana
 */

class DisplaySearch extends Display {
    constructor() {
        super(document.querySelector('#spinner'), document.querySelector('#content'));
        this._isPrepared = false;
        this._search = document.querySelector('#search');
        this._query = document.querySelector('#query');
        this._intro = document.querySelector('#intro');
        this._clipboardMonitorEnable = document.querySelector('#clipboard-monitor-enable');
        this._wanakanaEnable = document.querySelector('#wanakana-enable');
        this._introVisible = true;
        this._introAnimationTimer = null;
        this._clipboardMonitor = new ClipboardMonitor({
            getClipboard: api.clipboardGet.bind(api)
        });
        this._queryParser = new QueryParser({
            getOptionsContext: this.getOptionsContext.bind(this),
            setSpinnerVisible: this.setSpinnerVisible.bind(this)
        });
        this._onKeyDownIgnoreKeys = new Map([
            ['ANY_MOD', new Set([
                'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageDown', 'PageUp', 'Home', 'End',
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
        this._runtimeMessageHandlers = new Map([
            ['updateSearchQuery', {async: false, handler: this._onExternalSearchUpdate.bind(this)}]
        ]);
    }

    async prepare() {
        await super.prepare();
        await this.updateOptions();
        yomichan.on('optionsUpdated', () => this.updateOptions());
        await this._queryParser.prepare();

        this._queryParser.on('searched', this._onQueryParserSearch.bind(this));

        const options = this.getOptions();

        const {queryParams: {query='', mode=''}} = parseUrl(window.location.href);

        document.documentElement.dataset.searchMode = mode;

        if (options.general.enableWanakana === true) {
            this._wanakanaEnable.checked = true;
            wanakana.bind(this._query);
        } else {
            this._wanakanaEnable.checked = false;
        }

        this._setQuery(query);
        this._onSearchQueryUpdated(this._query.value, false);

        if (mode !== 'popup') {
            if (options.general.enableClipboardMonitor === true) {
                this._clipboardMonitorEnable.checked = true;
                this._clipboardMonitor.start();
            } else {
                this._clipboardMonitorEnable.checked = false;
            }
            this._clipboardMonitorEnable.addEventListener('change', this._onClipboardMonitorEnableChange.bind(this));
        }

        chrome.runtime.onMessage.addListener(this._onRuntimeMessage.bind(this));

        this._search.addEventListener('click', this._onSearch.bind(this), false);
        this._query.addEventListener('input', this._onSearchInput.bind(this), false);
        this._wanakanaEnable.addEventListener('change', this._onWanakanaEnableChange.bind(this));
        window.addEventListener('popstate', this._onPopState.bind(this));
        window.addEventListener('copy', this._onCopy.bind(this));
        this._clipboardMonitor.on('change', this._onExternalSearchUpdate.bind(this));

        this._updateSearchButton();

        await this._prepareNestedPopups();

        this._isPrepared = true;
    }

    onEscape() {
        if (this._query === null) {
            return;
        }

        this._query.focus();
        this._query.select();
    }

    onKeyDown(e) {
        const key = DOM.getKeyFromEvent(e);
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

        if (!super.onKeyDown(e) && !preventFocus && document.activeElement !== this._query) {
            this._query.focus({preventScroll: true});
        }
    }

    async updateOptions() {
        await super.updateOptions();
        const options = this.getOptions();
        this._queryParser.setOptions(options);
        if (!this._isPrepared) { return; }
        const query = this._query.value;
        if (query) {
            this._setQuery(query);
            this._onSearchQueryUpdated(query, false);
        }
    }

    async setContent(...args) {
        this._query.blur();
        this._closePopups();
        return await super.setContent(...args);
    }

    clearContent() {
        this._closePopups();
        return super.clearContent();
    }

    // Private

    _onQueryParserSearch({type, definitions, sentence, cause, textSource}) {
        this.setContent({
            focus: false,
            history: cause !== 'mouse',
            type,
            source: textSource.text(),
            definitions,
            context: {
                sentence,
                url: window.location.href
            }
        });
    }

    _onSearchInput() {
        this._updateSearchButton();

        const queryElementRect = this._query.getBoundingClientRect();
        if (queryElementRect.top < 0 || queryElementRect.bottom > window.innerHeight) {
            this._query.scrollIntoView();
        }
    }

    _onSearch(e) {
        if (this._query === null) {
            return;
        }

        e.preventDefault();

        const query = this._query.value;

        this._queryParser.setText(query);

        const url = new URL(window.location.href);
        url.searchParams.set('query', query);
        window.history.pushState(null, '', url.toString());

        this._onSearchQueryUpdated(query, true);
    }

    _onPopState() {
        const {queryParams: {query=''}} = parseUrl(window.location.href);
        this._setQuery(query);
        this._onSearchQueryUpdated(this._query.value, false);
    }

    _onRuntimeMessage({action, params}, sender, callback) {
        const messageHandler = this._runtimeMessageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return false; }
        return yomichan.invokeMessageHandler(messageHandler, params, callback, sender);
    }

    _onCopy() {
        // ignore copy from search page
        this._clipboardMonitor.setPreviousText(window.getSelection().toString().trim());
    }

    _onExternalSearchUpdate({text, animate=true}) {
        this._setQuery(text);
        const url = new URL(window.location.href);
        url.searchParams.set('query', text);
        window.history.pushState(null, '', url.toString());
        this._onSearchQueryUpdated(this._query.value, animate);
    }

    async _onSearchQueryUpdated(query, animate) {
        try {
            const details = {};
            const match = /^([*\uff0a]*)([\w\W]*?)([*\uff0a]*)$/.exec(query);
            if (match !== null) {
                if (match[1]) {
                    details.wildcard = 'prefix';
                } else if (match[3]) {
                    details.wildcard = 'suffix';
                }
                query = match[2];
            }

            const valid = (query.length > 0);
            this._setIntroVisible(!valid, animate);
            this._updateSearchButton();
            if (valid) {
                const {definitions} = await api.termsFind(query, details, this.getOptionsContext());
                this.setContent({
                    focus: false,
                    history: false,
                    definitions,
                    source: query,
                    type: 'terms',
                    context: {
                        sentence: {text: query, offset: 0},
                        url: window.location.href
                    }
                });
            } else {
                this.clearContent();
            }
            this._setTitleText(query);
        } catch (e) {
            this.onError(e);
        }
    }

    _onWanakanaEnableChange(e) {
        const value = e.target.checked;
        if (value) {
            wanakana.bind(this._query);
        } else {
            wanakana.unbind(this._query);
        }
        api.modifySettings([{
            action: 'set',
            path: 'general.enableWanakana',
            value,
            scope: 'profile',
            optionsContext: this.getOptionsContext()
        }], 'search');
    }

    _onClipboardMonitorEnableChange(e) {
        if (e.target.checked) {
            chrome.permissions.request(
                {permissions: ['clipboardRead']},
                (granted) => {
                    if (granted) {
                        this._clipboardMonitor.start();
                        api.modifySettings([{
                            action: 'set',
                            path: 'general.enableClipboardMonitor',
                            value: true,
                            scope: 'profile',
                            optionsContext: this.getOptionsContext()
                        }], 'search');
                    } else {
                        e.target.checked = false;
                    }
                }
            );
        } else {
            this._clipboardMonitor.stop();
            api.modifySettings([{
                action: 'set',
                path: 'general.enableClipboardMonitor',
                value: false,
                scope: 'profile',
                optionsContext: this.getOptionsContext()
            }], 'search');
        }
    }

    _isWanakanaEnabled() {
        return this._wanakanaEnable !== null && this._wanakanaEnable.checked;
    }

    _setQuery(query) {
        let interpretedQuery = query;
        if (this._isWanakanaEnabled()) {
            try {
                interpretedQuery = wanakana.toKana(query);
            } catch (e) {
                // NOP
            }
        }
        this._query.value = interpretedQuery;
        this._queryParser.setText(interpretedQuery);
    }

    _setIntroVisible(visible, animate) {
        if (this._introVisible === visible) {
            return;
        }

        this._introVisible = visible;

        if (this._intro === null) {
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
            this._intro.style.transition = '';
            this._intro.style.height = '';
            const size = this._intro.getBoundingClientRect();
            this._intro.style.height = '0px';
            this._intro.style.transition = `height ${duration}s ease-in-out 0s`;
            window.getComputedStyle(this._intro).getPropertyValue('height'); // Commits height so next line can start animation
            this._intro.style.height = `${size.height}px`;
            this._introAnimationTimer = setTimeout(() => {
                this._intro.style.height = '';
                this._introAnimationTimer = null;
            }, duration * 1000);
        } else {
            this._intro.style.transition = '';
            this._intro.style.height = '';
        }
    }

    _hideIntro(animate) {
        if (animate) {
            const duration = 0.4;
            const size = this._intro.getBoundingClientRect();
            this._intro.style.height = `${size.height}px`;
            this._intro.style.transition = `height ${duration}s ease-in-out 0s`;
            window.getComputedStyle(this._intro).getPropertyValue('height'); // Commits height so next line can start animation
        } else {
            this._intro.style.transition = '';
        }
        this._intro.style.height = '0';
    }

    _updateSearchButton() {
        this._search.disabled = this._introVisible && (this._query === null || this._query.value.length === 0);
    }

    _setTitleText(text) {
        // Chrome limits title to 1024 characters
        if (text.length > 1000) {
            text = text.substring(0, 1000) + '...';
        }

        if (text.length === 0) {
            document.title = 'Yomichan Search';
        } else {
            document.title = `${text} - Yomichan Search`;
        }
    }

    async _prepareNestedPopups() {
        let complete = false;

        const onOptionsUpdated = async () => {
            const optionsContext = this.getOptionsContext();
            const options = await api.optionsGet(optionsContext);
            if (!options.scanning.enableOnSearchPage || complete) { return; }

            complete = true;
            yomichan.off('optionsUpdated', onOptionsUpdated);

            try {
                await this.setupNestedPopups({
                    depth: 1,
                    proxy: false,
                    isSearchPage: true
                });
            } catch (e) {
                yomichan.logError(e);
            }
        };

        yomichan.on('optionsUpdated', onOptionsUpdated);

        await onOptionsUpdated();
    }

    _closePopups() {
        yomichan.trigger('closePopups');
    }
}
