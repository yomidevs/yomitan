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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*global apiGetDisplayTemplatesHtml, TemplateHandler*/

class DisplayGenerator {
    constructor() {
        this._templateHandler = null;
    }

    async prepare() {
        const html = await apiGetDisplayTemplatesHtml();
        this._templateHandler = new TemplateHandler(html);
    }

    createTermEntry(details) {
        const node = this._templateHandler.instantiate('term-entry');

        const expressionsContainer = node.querySelector('.term-expression-list');
        const reasonsContainer = node.querySelector('.term-reasons');
        const frequenciesContainer = node.querySelector('.frequencies');
        const definitionsContainer = node.querySelector('.term-definition-list');
        const debugInfoContainer = node.querySelector('.debug-info');

        const expressionMulti = Array.isArray(details.expressions);
        const definitionMulti = Array.isArray(details.definitions);

        node.dataset.expressionMulti = `${expressionMulti}`;
        node.dataset.definitionMulti = `${definitionMulti}`;
        node.dataset.expressionCount = `${expressionMulti ? details.expressions.length : 1}`;
        node.dataset.definitionCount = `${definitionMulti ? details.definitions.length : 1}`;

        const termTags = details.termTags;
        let expressions = details.expressions;
        expressions = Array.isArray(expressions) ? expressions.map((e) => [e, termTags]) : null;

        DisplayGenerator._appendMultiple(expressionsContainer, this.createTermExpression.bind(this), expressions, [[details, termTags]]);
        DisplayGenerator._appendMultiple(reasonsContainer, this.createTermReason.bind(this), details.reasons);
        DisplayGenerator._appendMultiple(frequenciesContainer, this.createFrequencyTag.bind(this), details.frequencies);
        DisplayGenerator._appendMultiple(definitionsContainer, this.createTermDefinitionItem.bind(this), details.definitions, [details]);

        if (debugInfoContainer !== null) {
            debugInfoContainer.textContent = JSON.stringify(details, null, 4);
        }

        return node;
    }

    createTermExpression([details, termTags]) {
        const node = this._templateHandler.instantiate('term-expression');

        const expressionContainer = node.querySelector('.term-expression-text');
        const tagContainer = node.querySelector('.tags');
        const frequencyContainer = node.querySelector('.frequencies');

        if (details.termFrequency) {
            node.dataset.frequency = details.termFrequency;
        }

        if (expressionContainer !== null) {
            let furiganaSegments = details.furiganaSegments;
            if (!Array.isArray(furiganaSegments)) {
                // This case should not occur
                furiganaSegments = [{text: details.expression, furigana: details.reading}];
            }
            DisplayGenerator._appendFurigana(expressionContainer, furiganaSegments, this._appendKanjiLinks.bind(this));
        }

        if (!Array.isArray(termTags)) {
            // Fallback
            termTags = details.termTags;
        }
        const searchQueries = [details.expression, details.reading]
            .filter((x) => !!x)
            .map((x) => ({query: x}));
        DisplayGenerator._appendMultiple(tagContainer, this.createTag.bind(this), termTags);
        DisplayGenerator._appendMultiple(tagContainer, this.createSearchTag.bind(this), searchQueries);
        DisplayGenerator._appendMultiple(frequencyContainer, this.createFrequencyTag.bind(this), details.frequencies);

        return node;
    }

    createTermReason(reason) {
        const fragment = this._templateHandler.instantiateFragment('term-reason');
        const node = fragment.querySelector('.term-reason');
        node.textContent = reason;
        node.dataset.reason = reason;
        return fragment;
    }

    createTermDefinitionItem(details) {
        const node = this._templateHandler.instantiate('term-definition-item');

        const tagListContainer = node.querySelector('.term-definition-tag-list');
        const onlyListContainer = node.querySelector('.term-definition-only-list');
        const glossaryContainer = node.querySelector('.term-glossary-list');

        node.dataset.dictionary = details.dictionary;

        DisplayGenerator._appendMultiple(tagListContainer, this.createTag.bind(this), details.definitionTags);
        DisplayGenerator._appendMultiple(onlyListContainer, this.createTermOnly.bind(this), details.only);
        DisplayGenerator._appendMultiple(glossaryContainer, this.createTermGlossaryItem.bind(this), details.glossary);

        return node;
    }

    createTermGlossaryItem(glossary) {
        const node = this._templateHandler.instantiate('term-glossary-item');
        const container = node.querySelector('.term-glossary');
        if (container !== null) {
            DisplayGenerator._appendMultilineText(container, glossary);
        }
        return node;
    }

    createTermOnly(only) {
        const node = this._templateHandler.instantiate('term-definition-only');
        node.dataset.only = only;
        node.textContent = only;
        return node;
    }

    createKanjiLink(character) {
        const node = document.createElement('a');
        node.href = '#';
        node.className = 'kanji-link';
        node.textContent = character;
        return node;
    }

    createKanjiEntry(details) {
        const node = this._templateHandler.instantiate('kanji-entry');

        const glyphContainer = node.querySelector('.kanji-glyph');
        const frequenciesContainer = node.querySelector('.frequencies');
        const tagContainer = node.querySelector('.tags');
        const glossaryContainer = node.querySelector('.kanji-glossary-list');
        const chineseReadingsContainer = node.querySelector('.kanji-readings-chinese');
        const japaneseReadingsContainer = node.querySelector('.kanji-readings-japanese');
        const statisticsContainer = node.querySelector('.kanji-statistics');
        const classificationsContainer = node.querySelector('.kanji-classifications');
        const codepointsContainer = node.querySelector('.kanji-codepoints');
        const dictionaryIndicesContainer = node.querySelector('.kanji-dictionary-indices');
        const debugInfoContainer = node.querySelector('.debug-info');

        if (glyphContainer !== null) {
            glyphContainer.textContent = details.character;
        }

        DisplayGenerator._appendMultiple(frequenciesContainer, this.createFrequencyTag.bind(this), details.frequencies);
        DisplayGenerator._appendMultiple(tagContainer, this.createTag.bind(this), details.tags);
        DisplayGenerator._appendMultiple(glossaryContainer, this.createKanjiGlossaryItem.bind(this), details.glossary);
        DisplayGenerator._appendMultiple(chineseReadingsContainer, this.createKanjiReading.bind(this), details.onyomi);
        DisplayGenerator._appendMultiple(japaneseReadingsContainer, this.createKanjiReading.bind(this), details.kunyomi);

        if (statisticsContainer !== null) {
            statisticsContainer.appendChild(this.createKanjiInfoTable(details.stats.misc));
        }
        if (classificationsContainer !== null) {
            classificationsContainer.appendChild(this.createKanjiInfoTable(details.stats.class));
        }
        if (codepointsContainer !== null) {
            codepointsContainer.appendChild(this.createKanjiInfoTable(details.stats.code));
        }
        if (dictionaryIndicesContainer !== null) {
            dictionaryIndicesContainer.appendChild(this.createKanjiInfoTable(details.stats.index));
        }

        if (debugInfoContainer !== null) {
            debugInfoContainer.textContent = JSON.stringify(details, null, 4);
        }

        return node;
    }

    createKanjiGlossaryItem(glossary) {
        const node = this._templateHandler.instantiate('kanji-glossary-item');
        const container = node.querySelector('.kanji-glossary');
        if (container !== null) {
            DisplayGenerator._appendMultilineText(container, glossary);
        }
        return node;
    }

    createKanjiReading(reading) {
        const node = this._templateHandler.instantiate('kanji-reading');
        node.textContent = reading;
        return node;
    }

    createKanjiInfoTable(details) {
        const node = this._templateHandler.instantiate('kanji-info-table');

        const container = node.querySelector('.kanji-info-table-body');

        if (container !== null) {
            const count = DisplayGenerator._appendMultiple(container, this.createKanjiInfoTableItem.bind(this), details);
            if (count === 0) {
                const n = this.createKanjiInfoTableItemEmpty();
                container.appendChild(n);
            }
        }

        return node;
    }

    createKanjiInfoTableItem(details) {
        const node = this._templateHandler.instantiate('kanji-info-table-item');
        const nameNode = node.querySelector('.kanji-info-table-item-header');
        const valueNode = node.querySelector('.kanji-info-table-item-value');
        if (nameNode !== null) {
            nameNode.textContent = details.notes || details.name;
        }
        if (valueNode !== null) {
            valueNode.textContent = details.value;
        }
        return node;
    }

    createKanjiInfoTableItemEmpty() {
        return this._templateHandler.instantiate('kanji-info-table-empty');
    }

    createTag(details) {
        const node = this._templateHandler.instantiate('tag');

        const inner = node.querySelector('.tag-inner');

        node.title = details.notes;
        inner.textContent = details.name;
        node.dataset.category = details.category;

        return node;
    }

    createSearchTag(details) {
        const node = this._templateHandler.instantiate('tag-search');

        node.textContent = details.query;

        node.dataset.query = details.query;

        return node;
    }

    createFrequencyTag(details) {
        const node = this._templateHandler.instantiate('tag-frequency');

        let n = node.querySelector('.term-frequency-dictionary-name');
        if (n !== null) {
            n.textContent = details.dictionary;
        }

        n = node.querySelector('.term-frequency-value');
        if (n !== null) {
            n.textContent = `${details.frequency}`;
        }

        node.dataset.dictionary = details.dictionary;
        node.dataset.frequency = details.frequency;

        return node;
    }

    _appendKanjiLinks(container, text) {
        let part = '';
        for (const c of text) {
            if (DisplayGenerator._isCharacterKanji(c)) {
                if (part.length > 0) {
                    container.appendChild(document.createTextNode(part));
                    part = '';
                }

                const link = this.createKanjiLink(c);
                container.appendChild(link);
            } else {
                part += c;
            }
        }
        if (part.length > 0) {
            container.appendChild(document.createTextNode(part));
        }
    }

    static _isCharacterKanji(c) {
        const code = c.charCodeAt(0);
        return (
            code >= 0x4e00 && code < 0x9fb0 ||
            code >= 0x3400 && code < 0x4dc0
        );
    }

    static _appendMultiple(container, createItem, detailsArray, fallback=[]) {
        if (container === null) { return 0; }

        const isArray = Array.isArray(detailsArray);
        if (!isArray) { detailsArray = fallback; }

        container.dataset.multi = `${isArray}`;
        container.dataset.count = `${detailsArray.length}`;

        for (const details of detailsArray) {
            const item = createItem(details);
            if (item === null) { continue; }
            container.appendChild(item);
        }

        return detailsArray.length;
    }

    static _appendFurigana(container, segments, addText) {
        for (const {text, furigana} of segments) {
            if (furigana) {
                const ruby = document.createElement('ruby');
                const rt = document.createElement('rt');
                addText(ruby, text);
                ruby.appendChild(rt);
                rt.appendChild(document.createTextNode(furigana));
                container.appendChild(ruby);
            } else {
                addText(container, text);
            }
        }
    }

    static _appendMultilineText(container, text) {
        const parts = text.split('\n');
        container.appendChild(document.createTextNode(parts[0]));
        for (let i = 1, ii = parts.length; i < ii; ++i) {
            container.appendChild(document.createElement('br'));
            container.appendChild(document.createTextNode(parts[i]));
        }
    }
}
