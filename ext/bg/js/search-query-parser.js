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
        this.pendingLookup = false;

        this.queryParser = document.querySelector('#query-parser');

        this.queryParser.addEventListener('click', (e) => this.onClick(e));
    }

    onError(error) {
        logError(error, false);
    }

    onClick(e) {
        this.onTermLookup(e, {disableScroll: true, selectText: true});
    }

    onMouseEnter(e) {
        if (
            this.pendingLookup ||
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

        this.onTermLookup(e, {disableScroll: true, selectText: true, disableHistory: true});
    }

    onTermLookup(e, params) {
        this.pendingLookup = true;
        (async () => {
            await this.search.onTermLookup(e, params);
            this.pendingLookup = false;
        })();
    }

    async setText(text) {
        this.search.setSpinnerVisible(true);
        await this.setPreview(text);

        // const results = await apiTextParse(text, this.search.getOptionsContext());
        const results = await apiTextParseMecab(text, this.search.getOptionsContext());

        const content = await apiTemplateRender('query-parser.html', {
            terms: results.map((term) => {
                return term.filter(part => part.text.trim()).map((part) => {
                    return {
                        text: Array.from(part.text),
                        reading: part.reading,
                        raw: !part.reading || !part.reading.trim(),
                    };
                });
            })
        });

        this.queryParser.innerHTML = content;

        this.queryParser.querySelectorAll('.query-parser-char').forEach((charElement) => {
            this.activateScanning(charElement);
        });

        this.search.setSpinnerVisible(false);
    }

    async setPreview(text) {
        const previewTerms = [];
        while (text) {
            const tempText = text.slice(0, 2);
            previewTerms.push([{text: Array.from(tempText)}]);
            text = text.slice(2);
        }

        this.queryParser.innerHTML = await apiTemplateRender('query-parser.html', {
            terms: previewTerms,
            preview: true
        });

        this.queryParser.querySelectorAll('.query-parser-char').forEach((charElement) => {
            this.activateScanning(charElement);
        });
    }

    activateScanning(element) {
        element.addEventListener('mouseenter', (e) => {
            e.target.dataset.timer = setTimeout(() => {
                this.onMouseEnter(e);
                delete e.target.dataset.timer;
            }, this.search.options.scanning.delay);
        });
        element.addEventListener('mouseleave', (e) => {
            clearTimeout(e.target.dataset.timer);
            delete e.target.dataset.timer;
        });
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
