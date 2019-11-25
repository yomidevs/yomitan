/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


let IS_FIREFOX = null;
(async () => {
    const {browser} = await apiGetEnvironmentInfo();
    IS_FIREFOX = ['firefox', 'firefox-mobile'].includes(browser);
})();

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

        this.clipboardMonitorIntervalId = null;
        this.clipboardPrevText = null;
    }

    static create() {
        const instance = new DisplaySearch();
        instance.prepare();
        return instance;
    }

    async prepare() {
        try {
            await this.initialize();

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
            const match = /[*\uff0a]+$/.exec(query);
            if (match !== null) {
                details.wildcard = true;
                query = query.substring(0, query.length - match[0].length);
            }

            const valid = (query.length > 0);
            this.setIntroVisible(!valid, animate);
            this.updateSearchButton();
            if (valid) {
                const {definitions} = await apiTermsFind(query, details, this.optionsContext);
                this.setContentTerms(definitions, {
                    focus: false,
                    sentence: {text: query, offset: 0},
                    url: window.location.href
                });
            } else {
                this.container.textContent = '';
            }
            window.parent.postMessage('popupClose', '*');
        } catch (e) {
            this.onError(e);
        }
    }

    onRuntimeMessage({action, params}, sender, callback) {
        const handlers = DisplaySearch.runtimeMessageHandlers;
        if (hasOwn(handlers, action)) {
            const handler = handlers[action];
            const result = handler(this, params);
            callback(result);
        } else {
            return super.onRuntimeMessage({action, params}, sender, callback);
        }
    }

    initClipboardMonitor() {
        // ignore copy from search page
        window.addEventListener('copy', () => {
            this.clipboardPrevText = document.getSelection().toString().trim();
        });
    }

    startClipboardMonitor() {
        this.clipboardMonitorIntervalId = setInterval(async () => {
            let curText = null;
            // TODO get rid of this and figure out why apiClipboardGet doesn't work on Firefox
            if (IS_FIREFOX) {
                curText = (await navigator.clipboard.readText()).trim();
            } else if (IS_FIREFOX === false) {
                curText = (await apiClipboardGet()).trim();
            }
            if (curText && (curText !== this.clipboardPrevText) && jpIsJapaneseText(curText)) {
                if (this.isWanakanaEnabled()) {
                    this.setQuery(window.wanakana.toKana(curText));
                } else {
                    this.setQuery(curText);
                }

                const queryString = curText.length > 0 ? `?query=${encodeURIComponent(curText)}` : '';
                window.history.pushState(null, '', `${window.location.pathname}${queryString}`);
                this.onSearchQueryUpdated(this.query.value, true);

                this.clipboardPrevText = curText;
            }
        }, 100);
    }

    stopClipboardMonitor() {
        if (this.clipboardMonitorIntervalId) {
            clearInterval(this.clipboardMonitorIntervalId);
            this.clipboardMonitorIntervalId = null;
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

    static getSearchQueryFromLocation(url) {
        const match = /^[^?#]*\?(?:[^&#]*&)?query=([^&#]*)/.exec(url);
        return match !== null ? decodeURIComponent(match[1]) : null;
    }
}

DisplaySearch.runtimeMessageHandlers = {
    getUrl: () => {
        return {url: window.location.href};
    }
};

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

window.yomichan_search = DisplaySearch.create();
