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

/* global
 * QueryParserGenerator
 * TextScanner
 * apiOptionsSet
 * apiTermsFind
 * apiTextParse
 * apiTextParseMecab
 * docSentenceExtract
 */

class QueryParser extends TextScanner {
    constructor({getOptionsContext, setContent, setSpinnerVisible}) {
        super(document.querySelector('#query-parser-content'), [], []);

        this.getOptionsContext = getOptionsContext;
        this.setContent = setContent;
        this.setSpinnerVisible = setSpinnerVisible;

        this.parseResults = [];

        this.queryParser = document.querySelector('#query-parser-content');
        this.queryParserSelect = document.querySelector('#query-parser-select-container');

        this.queryParserGenerator = new QueryParserGenerator();
    }

    async prepare() {
        await this.queryParserGenerator.prepare();
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

        this.setTextSourceScanLength(textSource, this.options.scanning.length);
        const searchText = textSource.text();
        if (searchText.length === 0) { return; }

        const {definitions, length} = await apiTermsFind(searchText, {}, this.getOptionsContext());
        if (definitions.length === 0) { return null; }

        const sentence = docSentenceExtract(textSource, this.options.anki.sentenceExt);

        textSource.setEndOffset(length);

        this.setContent('terms', {definitions, context: {
            focus: false,
            disableHistory: cause === 'mouse',
            sentence,
            url: window.location.href
        }});

        return {definitions, type: 'terms'};
    }

    onParserChange(e) {
        const selectedParser = e.target.value;
        apiOptionsSet({parsing: {selectedParser}}, this.getOptionsContext());
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

    setOptions(options) {
        super.setOptions(options);
        this.queryParser.dataset.termSpacing = `${options.parsing.termSpacing}`;
    }

    refreshSelectedParser() {
        if (this.parseResults.length > 0) {
            if (!this.getParseResult()) {
                const selectedParser = this.parseResults[0].id;
                apiOptionsSet({parsing: {selectedParser}}, this.getOptionsContext());
            }
        }
    }

    getParseResult() {
        const {selectedParser} = this.options.parsing;
        return this.parseResults.find((r) => r.id === selectedParser);
    }

    async setText(text) {
        this.setSpinnerVisible(true);

        this.setPreview(text);

        this.parseResults = await this.parseText(text);
        this.refreshSelectedParser();

        this.renderParserSelect();
        this.renderParseResult();

        this.setSpinnerVisible(false);
    }

    async parseText(text) {
        const results = [];
        if (this.options.parsing.enableScanningParser) {
            results.push({
                name: 'Scanning parser',
                id: 'scan',
                parsedText: await apiTextParse(text, this.getOptionsContext())
            });
        }
        if (this.options.parsing.enableMecabParser) {
            const mecabResults = await apiTextParseMecab(text, this.getOptionsContext());
            for (const [mecabDictName, mecabDictResults] of mecabResults) {
                results.push({
                    name: `MeCab: ${mecabDictName}`,
                    id: `mecab-${mecabDictName}`,
                    parsedText: mecabDictResults
                });
            }
        }
        return results;
    }

    setPreview(text) {
        const previewTerms = [];
        for (let i = 0, ii = text.length; i < ii; i += 2) {
            const tempText = text.substring(i, i + 2);
            previewTerms.push([{text: tempText}]);
        }
        this.queryParser.textContent = '';
        this.queryParser.appendChild(this.queryParserGenerator.createParseResult(previewTerms, true));
    }

    renderParserSelect() {
        this.queryParserSelect.textContent = '';
        if (this.parseResults.length > 1) {
            const {selectedParser} = this.options.parsing;
            const select = this.queryParserGenerator.createParserSelect(this.parseResults, selectedParser);
            select.addEventListener('change', this.onParserChange.bind(this));
            this.queryParserSelect.appendChild(select);
        }
    }

    renderParseResult() {
        const parseResult = this.getParseResult();
        this.queryParser.textContent = '';
        if (!parseResult) { return; }
        this.queryParser.appendChild(this.queryParserGenerator.createParseResult(parseResult.parsedText));
    }
}
