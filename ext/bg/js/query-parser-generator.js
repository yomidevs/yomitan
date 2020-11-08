/*
 * Copyright (C) 2020  Yomichan Authors
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

class QueryParserGenerator {
    createParseResult(terms, preview) {
        const type = preview ? 'preview' : 'normal';
        const fragment = document.createDocumentFragment();
        for (const term of terms) {
            const termNode = document.createElement('span');
            termNode.className = 'query-parser-term';
            termNode.dataset.type = type;
            for (const segment of term) {
                if (!segment.text.trim()) { continue; }
                if (!segment.reading.trim()) {
                    this._addSegmentText(segment.text, termNode);
                } else {
                    termNode.appendChild(this._createSegment(segment));
                }
            }
            fragment.appendChild(termNode);
        }
        return fragment;
    }

    createParserSelect(parseResults, selectedParser) {
        const select = document.createElement('select');
        select.className = 'query-parser-select form-control';
        for (const parseResult of parseResults) {
            const option = document.createElement('option');
            option.className = 'query-parser-select-option';
            option.value = parseResult.id;
            switch (parseResult.source) {
                case 'scanning-parser':
                    option.textContent = 'Scanning parser';
                    break;
                case 'mecab':
                    option.textContent = `MeCab: ${parseResult.dictionary}`;
                    break;
                default:
                    option.textContent = 'Unrecognized dictionary';
                    break;
            }
            option.defaultSelected = selectedParser === parseResult.id;
            select.appendChild(option);
        }
        return select;
    }

    // Private

    _createSegment(segment) {
        const segmentNode = document.createElement('ruby');
        segmentNode.className = 'query-parser-segment';

        const textNode = document.createElement('span');
        textNode.className = 'query-parser-segment-text';

        const readingNode = document.createElement('rt');
        readingNode.className = 'query-parser-segment-reading';

        segmentNode.appendChild(textNode);
        segmentNode.appendChild(readingNode);

        this._addSegmentText(segment.text, textNode);
        readingNode.textContent = segment.reading;

        return segmentNode;
    }

    _addSegmentText(text, container) {
        for (const character of text) {
            const node = document.createElement('span');
            node.className = 'query-parser-char';
            node.textContent = character;
            container.appendChild(node);
        }
    }
}
