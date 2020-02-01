/*
 * Copyright (C) 2016-2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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

/*global jpIsStringPartiallyJapanese, apiOptionsSet, apiTermsFind, apiClipboardGet, apiGetEnvironmentInfo
Display, QueryParser*/

class DisplaySearch extends Display {
    constructor() {
        super(document.querySelector('#spinner'), document.querySelector('#content'));

        this.optionsContext = {
            depth: 0,
            url: window.location.href
        };

        this.queryParser = new QueryParser(this);

        this.search = document.querySelector('#search');
        this.query = document.querySelector('#query');
        this.intro = document.querySelector('#intro');
        this.clipboardMonitorEnable = document.querySelector('#clipboard-monitor-enable');
        this.wanakanaEnable = document.querySelector('#wanakana-enable');

        this.introVisible = true;
        this.introAnimationTimer = null;

        this.clipboardMonitor = new ClipboardMonitor();
    }

    static create() {
        const instance = new DisplaySearch();
        instance.prepare();
        return instance;
    }

    async prepare() {
        try {
            await this.initialize();

            await this.queryParser.prepare();

            const {queryParams: {query='', mode=''}} = parseUrl(window.location.href);

            if (this.search !== null) {
                this.search.addEventListener('click', (e) => this.onSearch(e), false);
            }
            if (this.query !== null) {
                document.documentElement.dataset.searchMode = mode;
                this.query.addEventListener('input', () => this.onSearchInput(), false);

                if (this.wanakanaEnable !== null) {
                    if (this.options.general.enableWanakana === true) {
                        this.wanakanaEnable.checked = true;
                        window.wanakana.bind(this.query);
                    } else {
                        this.wanakanaEnable.checked = false;
                    }
                    this.wanakanaEnable.addEventListener('change', (e) => {
                        const {queryParams: {query=''}} = parseUrl(window.location.href);
                        if (e.target.checked) {
                            window.wanakana.bind(this.query);
                            apiOptionsSet({general: {enableWanakana: true}}, this.getOptionsContext());
                        } else {
                            window.wanakana.unbind(this.query);
                            apiOptionsSet({general: {enableWanakana: false}}, this.getOptionsContext());
                        }
                        this.setQuery(query);
                        this.onSearchQueryUpdated(this.query.value, false);
                    });
                }

                this.setQuery(query);
                this.onSearchQueryUpdated(this.query.value, false);
            }
            if (this.clipboardMonitorEnable !== null && mode !== 'popup') {
                if (this.options.general.enableClipboardMonitor === true) {
                    this.clipboardMonitorEnable.checked = true;
                    this.clipboardMonitor.start();
                } else {
                    this.clipboardMonitorEnable.checked = false;
                }
                this.clipboardMonitorEnable.addEventListener('change', (e) => {
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
                });
            }

            chrome.runtime.onMessage.addListener(this.onRuntimeMessage.bind(this));

            window.addEventListener('popstate', (e) => this.onPopState(e));
            window.addEventListener('copy', (e) => this.onCopy(e));

            this.clipboardMonitor.onClipboardText = (text) => this.onExternalSearchUpdate(text);

            this.updateSearchButton();
        } catch (e) {
            this.onError(e);
        }
    }

    onError(error) {
        logError(error, true);
    }

    onSearchClear() {
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
        const handler = DisplaySearch._runtimeMessageHandlers.get(action);
        if (typeof handler !== 'function') { return false; }

        const result = handler(this, params, sender);
        callback(result);
        return false;
    }

    onKeyDown(e) {
        const key = Display.getKeyFromEvent(e);
        const ignoreKeys = DisplaySearch.onKeyDownIgnoreKeys;

        const activeModifierMap = {
            'Control': e.ctrlKey,
            'Meta': e.metaKey,
            'ANY_MOD': true
        };

        let preventFocus = false;
        for (const [modifier, keys] of Object.entries(ignoreKeys)) {
            const modifierActive = activeModifierMap[modifier];
            if (key === modifier || (modifierActive && keys.includes(key))) {
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
        this.clipboardMonitor.setPreviousText(document.getSelection().toString().trim());
    }

    onExternalSearchUpdate(text) {
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
                const {definitions} = await apiTermsFind(query, details, this.optionsContext);
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

    async updateOptions(options) {
        await super.updateOptions(options);
        this.queryParser.setOptions(this.options);
    }

    isWanakanaEnabled() {
        return this.wanakanaEnable !== null && this.wanakanaEnable.checked;
    }

    getOptionsContext() {
        return this.optionsContext;
    }

    setQuery(query) {
        const interpretedQuery = this.isWanakanaEnabled() ? window.wanakana.toKana(query) : query;
        this.query.value = interpretedQuery;
        this.queryParser.setText(interpretedQuery);
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

DisplaySearch.onKeyDownIgnoreKeys = {
    'ANY_MOD': [
        'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageDown', 'PageUp', 'Home', 'End',
        'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10',
        'F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20',
        'F21', 'F22', 'F23', 'F24'
    ],
    'Control': ['C', 'A', 'Z', 'Y', 'X', 'F', 'G'],
    'Meta': ['C', 'A', 'Z', 'Y', 'X', 'F', 'G'],
    'OS': [],
    'Alt': [],
    'AltGraph': [],
    'Shift': []
};

DisplaySearch._runtimeMessageHandlers = new Map([
    ['searchQueryUpdate', (self, {query}) => { self.onExternalSearchUpdate(query); }]
]);

DisplaySearch.instance = DisplaySearch.create();
