/*
 * Copyright (C) 2019-2020  Alex Yatskov <alex@foosoft.net>
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


class QueryParser extends TextScanner {
    constructor(search) {
        super(document.querySelector('#query-parser'), [], [], []);
        this.search = search;

        this.parseResults = [];
        this.selectedParser = null;

        this.queryParser = document.querySelector('#query-parser');
        this.queryParserSelect = document.querySelector('#query-parser-select');
    }

    onError(error) {
        logError(error, false);
    }

    onClick(e) {
        super.onClick(e);
        this.searchAt(e.clientX, e.clientY, 'click');
    }

    async onSearchSource(textSource, cause) {
        if (textSource === null) { return null; }

        this.setTextSourceScanLength(textSource, this.search.options.scanning.length);
        const searchText = textSource.text();
        if (searchText.length === 0) { return; }

        const {definitions, length} = await apiTermsFind(searchText, {}, this.search.getOptionsContext());
        if (definitions.length === 0) { return null; }

        textSource.setEndOffset(length);

        this.search.setContent('terms', {definitions, context: {
            focus: false,
            disableHistory: cause === 'mouse' ? true : false,
            sentence: {text: searchText, offset: 0},
            url: window.location.href
        }});

        return {definitions, type: 'terms'};
    }

    onParserChange(e) {
        const selectedParser = e.target.value;
        this.selectedParser = selectedParser;
        apiOptionsSet({parsing: {selectedParser}}, this.search.getOptionsContext());
        this.renderParseResult(this.getParseResult());
    }

    getMouseEventListeners() {
        return [
            [this.node, 'click', this.onClick.bind(this)],
            [this.node, 'mousedown', this.onMouseDown.bind(this)],
            [this.node, 'mousemove', this.onMouseMove.bind(this)],
            [this.node, 'mouseover', this.onMouseOver.bind(this)],
            [this.node, 'mouseout', this.onMouseOut.bind(this)]
        ];
    }

    getTouchEventListeners() {
        return [
            [this.node, 'auxclick', this.onAuxClick.bind(this)],
            [this.node, 'touchstart', this.onTouchStart.bind(this)],
            [this.node, 'touchend', this.onTouchEnd.bind(this)],
            [this.node, 'touchcancel', this.onTouchCancel.bind(this)],
            [this.node, 'touchmove', this.onTouchMove.bind(this), {passive: false}],
            [this.node, 'contextmenu', this.onContextMenu.bind(this)]
        ];
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
        for (let i = 0, ii = text.length; i < ii; i += 2) {
            const tempText = text.substring(i, i + 2);
            previewTerms.push([{text: tempText.split('')}]);
        }
        this.queryParser.innerHTML = await apiTemplateRender('query-parser.html', {
            terms: previewTerms,
            preview: true
        });
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
    }

    static processParseResultForDisplay(result) {
        return result.map((term) => {
            return term.filter((part) => part.text.trim()).map((part) => {
                return {
                    text: part.text.split(''),
                    reading: part.reading,
                    raw: !part.reading || !part.reading.trim()
                };
            });
        });
    }
}
