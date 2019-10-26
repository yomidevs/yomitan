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


class DisplaySearch extends Display {
    constructor() {
        super(document.querySelector('#spinner'), document.querySelector('#content'));

        this.optionsContext = {
            depth: 0,
            url: window.location.href
        };

        this.search = document.querySelector('#search');
        this.query = document.querySelector('#query');
        this.intro = document.querySelector('#intro');
        this.introVisible = true;
        this.introAnimationTimer = null;
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

                const query = DisplaySearch.getSearchQueryFromLocation(window.location.href);
                if (query !== null) {
                    this.query.value = window.wanakana.toKana(query);
                    this.onSearchQueryUpdated(query, false);
                }

                window.wanakana.bind(this.query);
            }

            window.addEventListener('popstate', (e) => this.onPopState(e));

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
        const queryString = query.length > 0 ? `?query=${encodeURIComponent(query)}` : '';
        window.history.pushState({query}, '', `${window.location.pathname}${queryString}`);
        this.onSearchQueryUpdated(query, true);
    }

    onPopState(e) {
        let query = '';
        if (e.state && e.state.query) {
            query = e.state.query
        }

        if (this.query !== null) {
            this.query.value = query;
        }

        this.onSearchQueryUpdated(query, false);
    }

    onKeyDown(e) {
        const key = Display.getKeyFromEvent(e);

        let activeModifierMap = {
            'Control': e.ctrlKey,
            'Meta': e.metaKey,
            'ANY_MOD': true
        };

        const ignoreKeys = {
            'ANY_MOD': ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageDown', 'PageUp', 'Home', 'End']
                .concat(
                    Array.from(Array(24).keys())
                    .map(i => `F${i + 1}`)
                ),
            'Control': ['C', 'A', 'Z', 'Y', 'X', 'F', 'G'],
            'Meta': ['C', 'A', 'Z', 'Y', 'X', 'F', 'G'],
            'OS': [],
            'Alt': [],
            'AltGraph': [],
            'Shift': []
        }

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
            const valid = (query.length > 0);
            this.setIntroVisible(!valid, animate);
            this.updateSearchButton();
            if (valid) {
                const {definitions} = await apiTermsFind(query, this.optionsContext);
                this.setContentTerms(definitions, {
                    focus: false,
                    sentence: null,
                    url: window.location.href
                });
            } else {
                this.container.textContent = '';
            }
        } catch (e) {
            this.onError(e);
        }
    }

    onRuntimeMessage({action, params}, sender, callback) {
        const handlers = DisplaySearch.runtimeMessageHandlers;
        if (handlers.hasOwnProperty(action)) {
            const handler = handlers[action];
            const result = handler(this, params);
            callback(result);
        } else {
            return super.onRuntimeMessage({action, params}, sender, callback);
        }
    }

    getOptionsContext() {
        return this.optionsContext;
    }

    setCustomCss() {
        // No custom CSS
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
            this.intro.style.height = `0px`;
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
        let match = /^[^\?#]*\?(?:[^&#]*&)?query=([^&#]*)/.exec(url);
        return match !== null ? decodeURIComponent(match[1]) : null;
    }
}

DisplaySearch.runtimeMessageHandlers = {
    getUrl: () => {
        return {url: window.location.href};
    }
};

window.yomichan_search = DisplaySearch.create();
