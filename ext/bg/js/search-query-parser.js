/*
 * Copyright (C) 2019-2020  Yomichan Authors
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
 * apiModifySettings
 * apiTermsFind
 * apiTextParse
 * docSentenceExtract
 */

class QueryParser {
    constructor({getOptionsContext, setContent, setSpinnerVisible}) {
        this._options = null;
        this.getOptionsContext = getOptionsContext;
        this.setContent = setContent;
        this.setSpinnerVisible = setSpinnerVisible;

        this.parseResults = [];

        this.queryParser = document.querySelector('#query-parser-content');
        this.queryParserSelect = document.querySelector('#query-parser-select-container');

        this.queryParserGenerator = new QueryParserGenerator();

        this._textScanner = new TextScanner(
            this.queryParser,
            () => [],
            []
        );
        this._textScanner.onSearchSource = this.onSearchSource.bind(this);
    }

    async prepare() {
        await this.queryParserGenerator.prepare();
        this.queryParser.addEventListener('click', this.onClick2.bind(this));
    }

    onClick2(e) {
        this._textScanner.searchAt(e.clientX, e.clientY, 'click');
    }

    async onSearchSource(textSource, cause) {
        if (textSource === null) { return null; }

        const searchText = this._textScanner.getTextSourceContent(textSource, this._options.scanning.length);
        if (searchText.length === 0) { return; }

        const {definitions, length} = await apiTermsFind(searchText, {}, this.getOptionsContext());
        if (definitions.length === 0) { return null; }

        const sentence = docSentenceExtract(textSource, this._options.anki.sentenceExt);

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
        const value = e.target.value;
        apiModifySettings([{
            action: 'set',
            path: 'parsing.selectedParser',
            value,
            scope: 'profile',
            optionsContext: this.getOptionsContext()
        }], 'search');
    }

    setOptions(options) {
        this._options = options;
        this._textScanner.setOptions(options);
        this._textScanner.setEnabled(true);
        this.queryParser.dataset.termSpacing = `${options.parsing.termSpacing}`;
    }

    refreshSelectedParser() {
        if (this.parseResults.length > 0) {
            if (!this.getParseResult()) {
                const value = this.parseResults[0].id;
                apiModifySettings([{
                    action: 'set',
                    path: 'parsing.selectedParser',
                    value,
                    scope: 'profile',
                    optionsContext: this.getOptionsContext()
                }], 'search');
            }
        }
    }

    getParseResult() {
        const {selectedParser} = this._options.parsing;
        return this.parseResults.find((r) => r.id === selectedParser);
    }

    async setText(text) {
        this.setSpinnerVisible(true);

        this.setPreview(text);

        this.parseResults = await apiTextParse(text, this.getOptionsContext());
        this.refreshSelectedParser();

        this.renderParserSelect();
        this.renderParseResult();

        this.setSpinnerVisible(false);
    }

    setPreview(text) {
        const previewTerms = [];
        for (let i = 0, ii = text.length; i < ii; i += 2) {
            const tempText = text.substring(i, i + 2);
            previewTerms.push([{text: tempText, reading: ''}]);
        }
        this.queryParser.textContent = '';
        this.queryParser.appendChild(this.queryParserGenerator.createParseResult(previewTerms, true));
    }

    renderParserSelect() {
        this.queryParserSelect.textContent = '';
        if (this.parseResults.length > 1) {
            const {selectedParser} = this._options.parsing;
            const select = this.queryParserGenerator.createParserSelect(this.parseResults, selectedParser);
            select.addEventListener('change', this.onParserChange.bind(this));
            this.queryParserSelect.appendChild(select);
        }
    }

    renderParseResult() {
        const parseResult = this.getParseResult();
        this.queryParser.textContent = '';
        if (!parseResult) { return; }
        this.queryParser.appendChild(this.queryParserGenerator.createParseResult(parseResult.content));
    }
}
