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

        this.parseResults = [];
        this.selectedParser = null;

        this.queryParser = document.querySelector('#query-parser');
        this.queryParserSelect = document.querySelector('#query-parser-select');

        this.queryParser.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.queryParser.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }

    onError(error) {
        logError(error, false);
    }

    onMouseDown(e) {
        if (DOM.isMouseButtonPressed(e, 'primary')) {
            this.clickScanPrevent = false;
        }
    }

    onMouseUp(e) {
        if (
            this.search.options.scanning.enablePopupSearch &&
            !this.clickScanPrevent &&
            DOM.isMouseButtonPressed(e, 'primary')
        ) {
            const selectText = this.search.options.scanning.selectText;
            this.onTermLookup(e, {disableScroll: true, selectText});
        }
    }

    onMouseMove(e) {
        if (this.pendingLookup || DOM.isMouseButtonDown(e, 'primary')) {
            return;
        }

        const scanningOptions = this.search.options.scanning;
        const scanningModifier = scanningOptions.modifier;
        if (!(
            Frontend.isScanningModifierPressed(scanningModifier, e) ||
            (scanningOptions.middleMouse && DOM.isMouseButtonDown(e, 'auxiliary'))
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

    onParserChange(e) {
        const selectedParser = e.target.value;
        this.selectedParser = selectedParser;
        apiOptionsSet({parsing: {selectedParser}}, this.search.getOptionsContext());
        this.renderParseResult(this.getParseResult());
    }

    refreshSelectedParser() {
        if (this.parseResults.length > 0) {
            if (this.selectedParser === null) {
                this.selectedParser = this.search.options.parsing.selectedParser;
            }
            if (this.selectedParser === null || !this.getParseResult()) {
                const selectedParser = this.parseResults[0].id;
                this.selectedParser = selectedParser;
                apiOptionsSet({parsing: {selectedParser}}, this.search.getOptionsContext());
            }
        }
    }

    getParseResult() {
        return this.parseResults.find((r) => r.id === this.selectedParser);
    }

    async setText(text) {
        this.search.setSpinnerVisible(true);

        await this.setPreview(text);

        this.parseResults = await this.parseText(text);
        this.refreshSelectedParser();

        this.renderParserSelect();
        await this.renderParseResult();

        this.search.setSpinnerVisible(false);
    }

    async parseText(text) {
        const results = [];
        if (this.search.options.parsing.enableScanningParser) {
            results.push({
                name: 'Scanning parser',
                id: 'scan',
                parsedText: await apiTextParse(text, this.search.getOptionsContext())
            });
        }
        if (this.search.options.parsing.enableMecabParser) {
            const mecabResults = await apiTextParseMecab(text, this.search.getOptionsContext());
            for (const mecabDictName in mecabResults) {
                results.push({
                    name: `MeCab: ${mecabDictName}`,
                    id: `mecab-${mecabDictName}`,
                    parsedText: mecabResults[mecabDictName]
                });
            }
        }
        return results;
    }

    async setPreview(text) {
        const previewTerms = [];
        while (text.length > 0) {
            const tempText = text.slice(0, 2);
            previewTerms.push([{text: Array.from(tempText)}]);
            text = text.slice(2);
        }
        this.queryParser.innerHTML = await apiTemplateRender('query-parser.html', {
            terms: previewTerms,
            preview: true
        });

        for (const charElement of this.queryParser.querySelectorAll('.query-parser-char')) {
            this.activateScanning(charElement);
        }
    }

    renderParserSelect() {
        this.queryParserSelect.innerHTML = '';
        if (this.parseResults.length > 1) {
            const select = document.createElement('select');
            select.classList.add('form-control');
            for (const parseResult of this.parseResults) {
                const option = document.createElement('option');
                option.value = parseResult.id;
                option.innerText = parseResult.name;
                option.defaultSelected = this.selectedParser === parseResult.id;
                select.appendChild(option);
            }
            select.addEventListener('change', this.onParserChange.bind(this));
            this.queryParserSelect.appendChild(select);
        }
    }

    async renderParseResult() {
        const parseResult = this.getParseResult();
        if (!parseResult) {
            this.queryParser.innerHTML = '';
            return;
        }

        this.queryParser.innerHTML = await apiTemplateRender(
            'query-parser.html',
            {terms: QueryParser.processParseResultForDisplay(parseResult.parsedText)}
        );

        for (const charElement of this.queryParser.querySelectorAll('.query-parser-char')) {
            this.activateScanning(charElement);
        }
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

    static processParseResultForDisplay(result) {
        return result.map((term) => {
            return term.filter((part) => part.text.trim()).map((part) => {
                return {
                    text: Array.from(part.text),
                    reading: part.reading,
                    raw: !part.reading || !part.reading.trim()
                };
            });
        });
    }
}
