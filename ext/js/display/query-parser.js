/*
 * Copyright (C) 2019-2021  Yomichan Authors
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
 * TextScanner
 */

class QueryParser extends EventDispatcher {
    constructor({getSearchContext, documentUtil}) {
        super();
        this._getSearchContext = getSearchContext;
        this._documentUtil = documentUtil;
        this._text = '';
        this._setTextToken = null;
        this._selectedParser = null;
        this._parseResults = [];
        this._queryParser = document.querySelector('#query-parser-content');
        this._queryParserModeContainer = document.querySelector('#query-parser-mode-container');
        this._queryParserModeSelect = document.querySelector('#query-parser-mode-select');
        this._textScanner = new TextScanner({
            node: this._queryParser,
            getSearchContext,
            documentUtil,
            searchTerms: true,
            searchKanji: false,
            searchOnClick: true
        });
    }

    get text() {
        return this._text;
    }

    prepare() {
        this._textScanner.prepare();
        this._textScanner.on('searched', this._onSearched.bind(this));
        this._queryParserModeSelect.addEventListener('change', this._onParserChange.bind(this), false);
    }

    setOptions({selectedParser, termSpacing, scanning}) {
        let selectedParserChanged = false;
        if (selectedParser === null || typeof selectedParser === 'string') {
            selectedParserChanged = (this._selectedParser !== selectedParser);
            this._selectedParser = selectedParser;
        }
        if (typeof termSpacing === 'boolean') {
            this._queryParser.dataset.termSpacing = `${termSpacing}`;
        }
        if (scanning !== null && typeof scanning === 'object') {
            this._textScanner.setOptions(scanning);
        }
        this._textScanner.setEnabled(true);
        if (selectedParserChanged && this._parseResults.length > 0) {
            this._renderParseResult();
        }
    }

    async setText(text) {
        this._text = text;
        this._setPreview(text);

        const token = {};
        this._setTextToken = token;
        this._parseResults = await yomichan.api.textParse(text, this._getOptionsContext());
        if (this._setTextToken !== token) { return; }

        this._refreshSelectedParser();

        this._renderParserSelect();
        this._renderParseResult();
    }

    // Private

    _onSearched(e) {
        const {error} = e;
        if (error !== null) {
            log.error(error);
            return;
        }
        if (e.type === null) { return; }

        this.trigger('searched', e);
    }

    _onParserChange(e) {
        const value = e.currentTarget.value;
        this._setSelectedParser(value);
    }

    _getOptionsContext() {
        return this._getSearchContext().optionsContext;
    }

    _refreshSelectedParser() {
        if (this._parseResults.length > 0 && !this._getParseResult()) {
            const value = this._parseResults[0].id;
            this._setSelectedParser(value);
        }
    }

    _setSelectedParser(value) {
        const optionsContext = this._getOptionsContext();
        yomichan.api.modifySettings([{
            action: 'set',
            path: 'parsing.selectedParser',
            value,
            scope: 'profile',
            optionsContext
        }], 'search');
    }

    _getParseResult() {
        const selectedParser = this._selectedParser;
        return this._parseResults.find((r) => r.id === selectedParser);
    }

    _setPreview(text) {
        const terms = [[{text, reading: ''}]];
        this._queryParser.textContent = '';
        this._queryParser.dataset.parsed = 'false';
        this._queryParser.appendChild(this._createParseResult(terms));
    }

    _renderParserSelect() {
        const visible = (this._parseResults.length > 1);
        if (visible) {
            this._updateParserModeSelect(this._queryParserModeSelect, this._parseResults, this._selectedParser);
        }
        this._queryParserModeContainer.hidden = !visible;
    }

    _renderParseResult() {
        const parseResult = this._getParseResult();
        this._queryParser.textContent = '';
        this._queryParser.dataset.parsed = 'true';
        if (!parseResult) { return; }
        this._queryParser.appendChild(this._createParseResult(parseResult.content));
    }

    _updateParserModeSelect(select, parseResults, selectedParser) {
        const fragment = document.createDocumentFragment();

        let index = 0;
        let selectedIndex = -1;
        for (const parseResult of parseResults) {
            const option = document.createElement('option');
            option.value = parseResult.id;
            switch (parseResult.source) {
                case 'scanning-parser':
                    option.textContent = 'Scanning parser';
                    break;
                case 'mecab':
                    option.textContent = `MeCab: ${parseResult.dictionary}`;
                    break;
                default:
                    option.textContent = `Unknown source: ${parseResult.source}`;
                    break;
            }
            fragment.appendChild(option);

            if (selectedParser === parseResult.id) {
                selectedIndex = index;
            }
            ++index;
        }

        select.textContent = '';
        select.appendChild(fragment);
        select.selectedIndex = selectedIndex;
    }

    _createParseResult(terms) {
        const fragment = document.createDocumentFragment();
        for (const term of terms) {
            const termNode = document.createElement('span');
            termNode.className = 'query-parser-term';
            for (const segment of term) {
                if (segment.reading.trim().length === 0) {
                    termNode.appendChild(document.createTextNode(segment.text));
                } else {
                    termNode.appendChild(this._createSegment(segment));
                }
            }
            fragment.appendChild(termNode);
        }
        return fragment;
    }

    _createSegment(segment) {
        const segmentNode = document.createElement('ruby');
        segmentNode.className = 'query-parser-segment';

        const textNode = document.createElement('span');
        textNode.className = 'query-parser-segment-text';

        const readingNode = document.createElement('rt');
        readingNode.className = 'query-parser-segment-reading';

        segmentNode.appendChild(textNode);
        segmentNode.appendChild(readingNode);

        textNode.textContent = segment.text;
        readingNode.textContent = segment.reading;

        return segmentNode;
    }
}
