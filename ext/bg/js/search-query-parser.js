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
        this.clickScanPrevent = false;

        this.queryParser = document.querySelector('#query-parser');

        this.queryParser.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.queryParser.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }

    onError(error) {
        logError(error, false);
    }

    onMouseDown(e) {
        if (QueryParser.isMouseButton('primary', e)) {
            this.clickScanPrevent = false;
        }
    }

    onMouseUp(e) {
        if (
            this.search.options.scanning.clickGlossary &&
            !this.clickScanPrevent &&
            QueryParser.isMouseButton('primary', e)
        ) {
            const selectText = this.search.options.scanning.selectText;
            this.onTermLookup(e, {disableScroll: true, selectText});
        }
    }

    onMouseMove(e) {
        if (
            this.pendingLookup ||
            QueryParser.isMouseButton('primary', e)
        ) {
            return;
        }

        const scanningOptions = this.search.options.scanning;
        const scanningModifier = scanningOptions.modifier;
        if (!(
            QueryParser.isScanningModifierPressed(scanningModifier, e) ||
            (scanningOptions.middleMouse && QueryParser.isMouseButton('auxiliary', e))
        )) {
            return;
        }

        const selectText = this.search.options.scanning.selectText;
        this.onTermLookup(e, {disableScroll: true, disableHistory: true, selectText});
    }

    onMouseLeave(e) {
        this.clickScanPrevent = true;
        clearTimeout(e.target.dataset.timer);
        delete e.target.dataset.timer;
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
        element.addEventListener('mousemove', (e) => {
            clearTimeout(e.target.dataset.timer);
            if (this.search.options.scanning.modifier === 'none') {
                e.target.dataset.timer = setTimeout(() => {
                    this.onMouseMove(e);
                    delete e.target.dataset.timer;
                }, this.search.options.scanning.delay);
            } else {
                this.onMouseMove(e);
            }
        });
        element.addEventListener('mouseleave', (e) => {
            this.onMouseLeave(e);
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

    static isMouseButton(button, mouseEvent) {
        if (['mouseup', 'mousedown'].includes(mouseEvent.type)) {
            switch (button) {
                case 'primary': return mouseEvent.button === 0;
                case 'secondary': return mouseEvent.button === 2;
                case 'auxiliary': return mouseEvent.button === 1;
                default: return false;
            }
        }
        switch (button) {
            case 'primary': return (mouseEvent.buttons & 0x1) !== 0x0;
            case 'secondary': return (mouseEvent.buttons & 0x2) !== 0x0;
            case 'auxiliary': return (mouseEvent.buttons & 0x4) !== 0x0;
            default: return false;
        }
    }
}
