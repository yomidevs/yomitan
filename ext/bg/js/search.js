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

        this.isFirefox = false;

        this.clipboardMonitorTimerId = null;
        this.clipboardMonitorTimerToken = null;
        this.clipboardInterval = 250;
        this.clipboardPreviousText = null;
    }

    static create() {
        const instance = new DisplaySearch();
        instance.prepare();
        return instance;
    }

    async prepare() {
        try {
            await this.initialize();
            this.isFirefox = await DisplaySearch._isFirefox();

            if (this.search !== null) {
                this.search.addEventListener('click', (e) => this.onSearch(e), false);
            }
            if (this.query !== null) {
                this.query.addEventListener('input', () => this.onSearchInput(), false);

                if (this.wanakanaEnable !== null) {
                    if (this.options.general.enableWanakana === true) {
                        this.wanakanaEnable.checked = true;
                        window.wanakana.bind(this.query);
                    } else {
                        this.wanakanaEnable.checked = false;
                    }
                    this.wanakanaEnable.addEventListener('change', (e) => {
                        const query = DisplaySearch.getSearchQueryFromLocation(window.location.href) || '';
                        if (e.target.checked) {
                            window.wanakana.bind(this.query);
                            this.setQuery(window.wanakana.toKana(query));
                            apiOptionsSet({general: {enableWanakana: true}}, this.getOptionsContext());
                        } else {
                            window.wanakana.unbind(this.query);
                            this.setQuery(query);
                            apiOptionsSet({general: {enableWanakana: false}}, this.getOptionsContext());
                        }
                        this.onSearchQueryUpdated(this.query.value, false);
                    });
                }

                const query = DisplaySearch.getSearchQueryFromLocation(window.location.href);
                if (query !== null) {
                    if (this.isWanakanaEnabled()) {
                        this.setQuery(window.wanakana.toKana(query));
                    } else {
                        this.setQuery(query);
                    }
                    this.onSearchQueryUpdated(this.query.value, false);
                }
            }
            if (this.clipboardMonitorEnable !== null) {
                if (this.options.general.enableClipboardMonitor === true) {
                    this.clipboardMonitorEnable.checked = true;
                    this.startClipboardMonitor();
                } else {
                    this.clipboardMonitorEnable.checked = false;
                }
                this.clipboardMonitorEnable.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        chrome.permissions.request(
                            {permissions: ['clipboardRead']},
                            (granted) => {
                                if (granted) {
                                    this.startClipboardMonitor();
                                    apiOptionsSet({general: {enableClipboardMonitor: true}}, this.getOptionsContext());
                                } else {
                                    e.target.checked = false;
                                }
                            }
                        );
                    } else {
                        this.stopClipboardMonitor();
                        apiOptionsSet({general: {enableClipboardMonitor: false}}, this.getOptionsContext());
                    }
                });
            }

            window.addEventListener('popstate', (e) => this.onPopState(e));

            this.updateSearchButton();
            this.initClipboardMonitor();
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
        const queryString = query.length > 0 ? `?query=${encodeURIComponent(query)}` : '';
        window.history.pushState(null, '', `${window.location.pathname}${queryString}`);
        this.onSearchQueryUpdated(query, true);
    }

    onPopState() {
        const query = DisplaySearch.getSearchQueryFromLocation(window.location.href) || '';
        if (this.query !== null) {
            if (this.isWanakanaEnabled()) {
                this.setQuery(window.wanakana.toKana(query));
            } else {
                this.setQuery(query);
            }
        }

        this.onSearchQueryUpdated(this.query.value, false);
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

    initClipboardMonitor() {
        // ignore copy from search page
        window.addEventListener('copy', () => {
            this.clipboardPreviousText = document.getSelection().toString().trim();
        });
    }

    startClipboardMonitor() {
        // The token below is used as a unique identifier to ensure that a new clipboard monitor
        // hasn't been started during the await call. The check below the await this.getClipboardText()
        // call will exit early if the reference has changed.
        const token = {};
        const intervalCallback = async () => {
            this.clipboardMonitorTimerId = null;

            let text = await this.getClipboardText();
            if (this.clipboardMonitorTimerToken !== token) { return; }

            if (
                typeof text === 'string' &&
                (text = text.trim()).length > 0 &&
                text !== this.clipboardPreviousText
            ) {
                this.clipboardPreviousText = text;
                if (jpIsJapaneseText(text)) {
                    this.setQuery(this.isWanakanaEnabled() ? window.wanakana.toKana(text) : text);
                    window.history.pushState(null, '', `${window.location.pathname}?query=${encodeURIComponent(text)}`);
                    this.onSearchQueryUpdated(this.query.value, true);
                }
            }

            this.clipboardMonitorTimerId = setTimeout(intervalCallback, this.clipboardInterval);
        };

        this.clipboardMonitorTimerToken = token;

        intervalCallback();
    }

    stopClipboardMonitor() {
        this.clipboardMonitorTimerToken = null;
        if (this.clipboardMonitorTimerId !== null) {
            clearTimeout(this.clipboardMonitorTimerId);
            this.clipboardMonitorTimerId = null;
        }
    }

    async getClipboardText() {
        /*
        Notes:
            apiClipboardGet doesn't work on Firefox because document.execCommand('paste')
            results in an empty string on the web extension background page.
            This may be a bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1603985
            Therefore, navigator.clipboard.readText() is used on Firefox.

            navigator.clipboard.readText() can't be used in Chrome for two reasons:
            * Requires page to be focused, else it rejects with an exception.
            * When the page is focused, Chrome will request clipboard permission, despite already
              being an extension with clipboard permissions. It effectively asks for the
              non-extension permission for clipboard access.
        */
        try {
            return this.isFirefox ? await navigator.clipboard.readText() : await apiClipboardGet();
        } catch (e) {
            return null;
        }
    }

    isWanakanaEnabled() {
        return this.wanakanaEnable !== null && this.wanakanaEnable.checked;
    }

    getOptionsContext() {
        return this.optionsContext;
    }

    setQuery(query) {
        this.query.value = query;
        this.queryParser.setText(query);
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

    static getSearchQueryFromLocation(url) {
        const match = /^[^?#]*\?(?:[^&#]*&)?query=([^&#]*)/.exec(url);
        return match !== null ? decodeURIComponent(match[1]) : null;
    }

    static async _isFirefox() {
        const {browser} = await apiGetEnvironmentInfo();
        switch (browser) {
            case 'firefox':
            case 'firefox-mobile':
                return true;
            default:
                return false;
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

DisplaySearch.instance = DisplaySearch.create();
