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
 * apiClipboardGet
 * apiOptionsSet
 * apiTermsFind
 * wanakana
 */

class DisplaySearch extends Display {
    constructor() {
        super(document.querySelector('#spinner'), document.querySelector('#content'));

        this._isPrepared = false;

        this.optionsContext = {
            depth: 0,
            url: window.location.href
        };

        this.queryParser = new QueryParser({
            getOptionsContext: this.getOptionsContext.bind(this),
            setContent: this.setContent.bind(this),
            setSpinnerVisible: this.setSpinnerVisible.bind(this)
        });

        this.search = document.querySelector('#search');
        this.query = document.querySelector('#query');
        this.intro = document.querySelector('#intro');
        this.clipboardMonitorEnable = document.querySelector('#clipboard-monitor-enable');
        this.wanakanaEnable = document.querySelector('#wanakana-enable');

        this.introVisible = true;
        this.introAnimationTimer = null;

        this.clipboardMonitor = new ClipboardMonitor({getClipboard: apiClipboardGet});

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
            ['searchQueryUpdate', this.onExternalSearchUpdate.bind(this)]
        ]);
    }

    async prepare() {
        try {
            await super.prepare();
            await this.updateOptions();
            yomichan.on('optionsUpdated', () => this.updateOptions());
            await this.queryParser.prepare();

            const {queryParams: {query='', mode=''}} = parseUrl(window.location.href);

            document.documentElement.dataset.searchMode = mode;

            if (this.options.general.enableWanakana === true) {
                this.wanakanaEnable.checked = true;
                wanakana.bind(this.query);
            } else {
                this.wanakanaEnable.checked = false;
            }

            this.setQuery(query);
            this.onSearchQueryUpdated(this.query.value, false);

            if (mode !== 'popup') {
                if (this.options.general.enableClipboardMonitor === true) {
                    this.clipboardMonitorEnable.checked = true;
                    this.clipboardMonitor.start();
                } else {
                    this.clipboardMonitorEnable.checked = false;
                }
                this.clipboardMonitorEnable.addEventListener('change', this.onClipboardMonitorEnableChange.bind(this));
            }

            chrome.runtime.onMessage.addListener(this.onRuntimeMessage.bind(this));

            this.search.addEventListener('click', this.onSearch.bind(this), false);
            this.query.addEventListener('input', this.onSearchInput.bind(this), false);
            this.wanakanaEnable.addEventListener('change', this.onWanakanaEnableChange.bind(this));
            window.addEventListener('popstate', this.onPopState.bind(this));
            window.addEventListener('copy', this.onCopy.bind(this));
            this.clipboardMonitor.on('change', this.onExternalSearchUpdate.bind(this));

            this.updateSearchButton();

            this._isPrepared = true;
        } catch (e) {
            this.onError(e);
        }
    }

    onError(error) {
        yomichan.logError(error);
    }

    onEscape() {
        if (this.query === null) {
            return;
        }

        this.query.focus();
        this.query.select();
    }

    onSearchInput() {
        this.updateSearchButton();

        const queryElementRect = this.query.getBoundingClientRect();
        if (queryElementRect.top < 0 || queryElementRect.bottom > window.innerHeight) {
            this.query.scrollIntoView();
        }
    }

    onSearch(e) {
        if (this.query === null) {
            return;
        }

        e.preventDefault();

        const query = this.query.value;

        this.queryParser.setText(query);

        const url = new URL(window.location.href);
        url.searchParams.set('query', query);
        window.history.pushState(null, '', url.toString());

        this.onSearchQueryUpdated(query, true);
    }

    onPopState() {
        const {queryParams: {query='', mode=''}} = parseUrl(window.location.href);
        document.documentElement.dataset.searchMode = mode;
        this.setQuery(query);
        this.onSearchQueryUpdated(this.query.value, false);
    }

    onRuntimeMessage({action, params}, sender, callback) {
        const handler = this._runtimeMessageHandlers.get(action);
        if (typeof handler !== 'function') { return false; }

        const result = handler(params, sender);
        callback(result);
        return false;
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

        if (!super.onKeyDown(e) && !preventFocus && document.activeElement !== this.query) {
            this.query.focus({preventScroll: true});
        }
    }

    onCopy() {
        // ignore copy from search page
        this.clipboardMonitor.setPreviousText(window.getSelection().toString().trim());
    }

    onExternalSearchUpdate({text}) {
        this.setQuery(text);
        const url = new URL(window.location.href);
        url.searchParams.set('query', text);
        window.history.pushState(null, '', url.toString());
        this.onSearchQueryUpdated(this.query.value, true);
    }

    async onSearchQueryUpdated(query, animate) {
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
            this.setIntroVisible(!valid, animate);
            this.updateSearchButton();
            if (valid) {
                const {definitions} = await apiTermsFind(query, details, this.getOptionsContext());
                this.setContent('terms', {definitions, context: {
                    focus: false,
                    disableHistory: true,
                    sentence: {text: query, offset: 0},
                    url: window.location.href
                }});
            } else {
                this.container.textContent = '';
            }
            this.setTitleText(query);
            window.parent.postMessage('popupClose', '*');
        } catch (e) {
            this.onError(e);
        }
    }

    onWanakanaEnableChange(e) {
        const enableWanakana = e.target.checked;
        if (enableWanakana) {
            wanakana.bind(this.query);
        } else {
            wanakana.unbind(this.query);
        }
        apiOptionsSet({general: {enableWanakana}}, this.getOptionsContext());
    }

    onClipboardMonitorEnableChange(e) {
        if (e.target.checked) {
            chrome.permissions.request(
                {permissions: ['clipboardRead']},
                (granted) => {
                    if (granted) {
                        this.clipboardMonitor.start();
                        apiOptionsSet({general: {enableClipboardMonitor: true}}, this.getOptionsContext());
                    } else {
                        e.target.checked = false;
                    }
                }
            );
        } else {
            this.clipboardMonitor.stop();
            apiOptionsSet({general: {enableClipboardMonitor: false}}, this.getOptionsContext());
        }
    }

    async updateOptions() {
        await super.updateOptions();
        this.queryParser.setOptions(this.options);
        if (!this._isPrepared) { return; }
        const query = this.query.value;
        if (query) {
            this.setQuery(query);
            this.onSearchQueryUpdated(query, false);
        }
    }

    isWanakanaEnabled() {
        return this.wanakanaEnable !== null && this.wanakanaEnable.checked;
    }

    setQuery(query) {
        const interpretedQuery = this.isWanakanaEnabled() ? wanakana.toKana(query) : query;
        this.query.value = interpretedQuery;
        this.queryParser.setText(interpretedQuery);
    }

    async setContent(type, details) {
        this.query.blur();
        await super.setContent(type, details);
    }

    setIntroVisible(visible, animate) {
        if (this.introVisible === visible) {
            return;
        }

        this.introVisible = visible;

        if (this.intro === null) {
            return;
        }

        if (this.introAnimationTimer !== null) {
            clearTimeout(this.introAnimationTimer);
            this.introAnimationTimer = null;
        }

        if (visible) {
            this.showIntro(animate);
        } else {
            this.hideIntro(animate);
        }
    }

    showIntro(animate) {
        if (animate) {
            const duration = 0.4;
            this.intro.style.transition = '';
            this.intro.style.height = '';
            const size = this.intro.getBoundingClientRect();
            this.intro.style.height = '0px';
            this.intro.style.transition = `height ${duration}s ease-in-out 0s`;
            window.getComputedStyle(this.intro).getPropertyValue('height'); // Commits height so next line can start animation
            this.intro.style.height = `${size.height}px`;
            this.introAnimationTimer = setTimeout(() => {
                this.intro.style.height = '';
                this.introAnimationTimer = null;
            }, duration * 1000);
        } else {
            this.intro.style.transition = '';
            this.intro.style.height = '';
        }
    }

    hideIntro(animate) {
        if (animate) {
            const duration = 0.4;
            const size = this.intro.getBoundingClientRect();
            this.intro.style.height = `${size.height}px`;
            this.intro.style.transition = `height ${duration}s ease-in-out 0s`;
            window.getComputedStyle(this.intro).getPropertyValue('height'); // Commits height so next line can start animation
        } else {
            this.intro.style.transition = '';
        }
        this.intro.style.height = '0';
    }

    updateSearchButton() {
        this.search.disabled = this.introVisible && (this.query === null || this.query.value.length === 0);
    }

    setTitleText(text) {
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
}
