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
        super($('#spinner'), $('#content'));

        this.optionsContext = {
            depth: 0,
            url: window.location.href
        };

        this.search = document.querySelector('#search');
        this.query = document.querySelector('#query');
        this.intro = document.querySelector('#intro');
        this.introHidden = false;

        this.dependencies = Object.assign({}, this.dependencies, {docRangeFromPoint, docSentenceExtract});

        if (this.search !== null) {
            this.search.addEventListener('click', (e) => this.onSearch(e), false);
        }
        if (this.query !== null) {
            this.query.addEventListener('input', () => this.onSearchInput(), false);
            window.wanakana.bind(this.query);
        }
    }

    onError(error) {
        window.alert(`Error: ${error.toString ? error.toString() : error}`);
    }

    onSearchClear() {
        if (this.query === null) {
            return;
        }

        this.query.focus();
        this.query.select();
    }

    onSearchInput() {
        this.search.disabled = (this.query === null || this.query.value.length === 0);
    }

    async onSearch(e) {
        if (this.query === null) {
            return;
        }

        try {
            e.preventDefault();
            this.hideIntro();
            const {length, definitions} = await apiTermsFind(this.query.value, this.optionsContext);
            super.termsShow(definitions, await apiOptionsGet(this.optionsContext));
        } catch (e) {
            this.onError(e);
        }
    }

    hideIntro() {
        if (this.introHidden) {
            return;
        }

        this.introHidden = true;

        if (this.intro === null) {
            return;
        }

        const size = this.intro.getBoundingClientRect();
        this.intro.style.height = `${size.height}px`;
        this.intro.style.transition = 'height 0.4s ease-in-out 0s';
        window.getComputedStyle(this.intro).getPropertyValue('height'); // Commits height so next line can start animation
        this.intro.style.height = '0';
    }
}

window.yomichan_search = new DisplaySearch();
