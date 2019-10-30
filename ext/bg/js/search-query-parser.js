/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
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


class QueryParser {
    constructor(search) {
        this.search = search;

        this.queryParser = document.querySelector('#query-parser');

        this.queryParser.addEventListener('click', (e) => this.onClick(e));
        this.queryParser.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    onError(error) {
        logError(error, false);
    }

    onClick(e) {
        this.onTermLookup(e, {disableScroll: true, selectText: true});
    }

    async onMouseMove(e) {
        if (
            (e.buttons & 0x1) !== 0x0 // Left mouse button
        ) {
            return;
        }

        const scanningOptions = this.search.options.scanning;
        const scanningModifier = scanningOptions.modifier;
        if (!(
            QueryParser.isScanningModifierPressed(scanningModifier, e) ||
            (scanningOptions.middleMouse && (e.buttons & 0x4) !== 0x0) // Middle mouse button
        )) {
            return;
        }

        await this.onTermLookup(e, {disableScroll: true, selectText: true, disableHistory: true})
    }

    onTermLookup(e, params) {
        this.search.onTermLookup(e, params);
    }

    async setText(text) {
        this.search.setSpinnerVisible(true);

        const results = await apiTextParse(text, this.search.getOptionsContext());

        const tempContainer = document.createElement('div');
        for (const {text, furigana} of results) {
            if (furigana) {
                const rubyElement = document.createElement('ruby');
                const furiganaElement = document.createElement('rt');
                furiganaElement.innerText = furigana;
                rubyElement.appendChild(document.createTextNode(text));
                rubyElement.appendChild(furiganaElement);
                tempContainer.appendChild(rubyElement);
            } else {
                tempContainer.appendChild(document.createTextNode(text));
            }
        }
        this.queryParser.innerHTML = '';
        this.queryParser.appendChild(tempContainer);

        this.search.setSpinnerVisible(false);
    }

    async parseText(text) {
        const results = [];
        while (text) {
            const {definitions, length} =  await apiTermsFind(text, {}, this.search.getOptionsContext());
            if (length) {
                results.push(definitions);
                text = text.slice(length);
            } else {
                results.push(text[0]);
                text = text.slice(1);
            }
        }
        return results;
    }

    popupTimerSet(callback) {
        const delay = this.options.scanning.delay;
        if (delay > 0) {
            this.popupTimer = window.setTimeout(callback, delay);
        } else {
            Promise.resolve().then(callback);
        }
    }

    popupTimerClear() {
        if (this.popupTimer !== null) {
            window.clearTimeout(this.popupTimer);
            this.popupTimer = null;
        }
    }

    static isScanningModifierPressed(scanningModifier, mouseEvent) {
        switch (scanningModifier) {
            case 'alt': return mouseEvent.altKey;
            case 'ctrl': return mouseEvent.ctrlKey;
            case 'shift': return mouseEvent.shiftKey;
            case 'none': return true;
            default: return false;
        }
    }
}
