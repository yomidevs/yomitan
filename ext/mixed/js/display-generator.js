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

/* global
 * TemplateHandler
 * apiGetDisplayTemplatesHtml
 * jp
 */

class DisplayGenerator {
    constructor() {
        this._templateHandler = null;
        this._termPitchAccentStaticTemplateIsSetup = false;
    }

    async prepare() {
        const html = await apiGetDisplayTemplatesHtml();
        this._templateHandler = new TemplateHandler(html);
    }

    createTermEntry(details) {
        const node = this._templateHandler.instantiate('term-entry');

        const expressionsContainer = node.querySelector('.term-expression-list');
        const reasonsContainer = node.querySelector('.term-reasons');
        const pitchesContainer = node.querySelector('.term-pitch-accent-group-list');
        const frequenciesContainer = node.querySelector('.frequencies');
        const definitionsContainer = node.querySelector('.term-definition-list');
        const debugInfoContainer = node.querySelector('.debug-info');
        const bodyContainer = node.querySelector('.term-entry-body');

        const pitches = this._getPitchInfos(details);
        const pitchCount = pitches.reduce((i, v) => i + v[1].length, 0);

        const expressionMulti = Array.isArray(details.expressions);
        const definitionMulti = Array.isArray(details.definitions);
        const expressionCount = expressionMulti ? details.expressions.length : 1;
        const definitionCount = definitionMulti ? details.definitions.length : 1;
        const uniqueExpressionCount = Array.isArray(details.expression) ? new Set(details.expression).size : 1;

        node.dataset.expressionMulti = `${expressionMulti}`;
        node.dataset.definitionMulti = `${definitionMulti}`;
        node.dataset.expressionCount = `${expressionCount}`;
        node.dataset.definitionCount = `${definitionCount}`;
        node.dataset.uniqueExpressionCount = `${uniqueExpressionCount}`;
        node.dataset.pitchAccentDictionaryCount = `${pitches.length}`;
        node.dataset.pitchAccentCount = `${pitchCount}`;

        bodyContainer.dataset.sectionCount = `${
            (definitionCount > 0 ? 1 : 0) +
            (pitches.length > 0 ? 1 : 0)
        }`;

        const termTags = details.termTags;
        let expressions = details.expressions;
        expressions = Array.isArray(expressions) ? expressions.map((e) => [e, termTags]) : null;

        this._appendMultiple(expressionsContainer, this._createTermExpression.bind(this), expressions, [[details, termTags]]);
        this._appendMultiple(reasonsContainer, this._createTermReason.bind(this), details.reasons);
        this._appendMultiple(frequenciesContainer, this._createFrequencyTag.bind(this), details.frequencies);
        this._appendMultiple(pitchesContainer, this._createPitches.bind(this), pitches);
        this._appendMultiple(definitionsContainer, this._createTermDefinitionItem.bind(this), details.definitions, [details]);

        if (debugInfoContainer !== null) {
            debugInfoContainer.textContent = JSON.stringify(details, null, 4);
        }

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

        this._appendMultiple(frequenciesContainer, this._createFrequencyTag.bind(this), details.frequencies);
        this._appendMultiple(tagContainer, this._createTag.bind(this), details.tags);
        this._appendMultiple(glossaryContainer, this._createKanjiGlossaryItem.bind(this), details.glossary);
        this._appendMultiple(chineseReadingsContainer, this._createKanjiReading.bind(this), details.onyomi);
        this._appendMultiple(japaneseReadingsContainer, this._createKanjiReading.bind(this), details.kunyomi);

        if (statisticsContainer !== null) {
            statisticsContainer.appendChild(this._createKanjiInfoTable(details.stats.misc));
        }
        if (classificationsContainer !== null) {
            classificationsContainer.appendChild(this._createKanjiInfoTable(details.stats.class));
        }
        if (codepointsContainer !== null) {
            codepointsContainer.appendChild(this._createKanjiInfoTable(details.stats.code));
        }
        if (dictionaryIndicesContainer !== null) {
            dictionaryIndicesContainer.appendChild(this._createKanjiInfoTable(details.stats.index));
        }

        if (debugInfoContainer !== null) {
            debugInfoContainer.textContent = JSON.stringify(details, null, 4);
        }

        return node;
    }

    // Private

    _createTermExpression([details, termTags]) {
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
            this._appendFurigana(expressionContainer, furiganaSegments, this._appendKanjiLinks.bind(this));
        }

        if (!Array.isArray(termTags)) {
            // Fallback
            termTags = details.termTags;
        }
        const searchQueries = [details.expression, details.reading]
            .filter((x) => !!x)
            .map((x) => ({query: x}));
        this._appendMultiple(tagContainer, this._createTag.bind(this), termTags);
        this._appendMultiple(tagContainer, this._createSearchTag.bind(this), searchQueries);
        this._appendMultiple(frequencyContainer, this._createFrequencyTag.bind(this), details.frequencies);

        return node;
    }

    _createTermReason(reason) {
        const fragment = this._templateHandler.instantiateFragment('term-reason');
        const node = fragment.querySelector('.term-reason');
        node.textContent = reason;
        node.dataset.reason = reason;
        return fragment;
    }

    _createTermDefinitionItem(details) {
        const node = this._templateHandler.instantiate('term-definition-item');

        const tagListContainer = node.querySelector('.term-definition-tag-list');
        const onlyListContainer = node.querySelector('.term-definition-only-list');
        const glossaryContainer = node.querySelector('.term-glossary-list');

        node.dataset.dictionary = details.dictionary;

        this._appendMultiple(tagListContainer, this._createTag.bind(this), details.definitionTags);
        this._appendMultiple(onlyListContainer, this._createTermOnly.bind(this), details.only);
        this._appendMultiple(glossaryContainer, this._createTermGlossaryItem.bind(this), details.glossary);

        return node;
    }

    _createTermGlossaryItem(glossary) {
        const node = this._templateHandler.instantiate('term-glossary-item');
        const container = node.querySelector('.term-glossary');
        if (container !== null) {
            this._appendMultilineText(container, glossary);
        }
        return node;
    }

    _createTermOnly(only) {
        const node = this._templateHandler.instantiate('term-definition-only');
        node.dataset.only = only;
        node.textContent = only;
        return node;
    }

    _createKanjiLink(character) {
        const node = document.createElement('a');
        node.href = '#';
        node.className = 'kanji-link';
        node.textContent = character;
        return node;
    }

    _createKanjiGlossaryItem(glossary) {
        const node = this._templateHandler.instantiate('kanji-glossary-item');
        const container = node.querySelector('.kanji-glossary');
        if (container !== null) {
            this._appendMultilineText(container, glossary);
        }
        return node;
    }

    _createKanjiReading(reading) {
        const node = this._templateHandler.instantiate('kanji-reading');
        node.textContent = reading;
        return node;
    }

    _createKanjiInfoTable(details) {
        const node = this._templateHandler.instantiate('kanji-info-table');

        const container = node.querySelector('.kanji-info-table-body');

        if (container !== null) {
            const count = this._appendMultiple(container, this._createKanjiInfoTableItem.bind(this), details);
            if (count === 0) {
                const n = this._createKanjiInfoTableItemEmpty();
                container.appendChild(n);
            }
        }

        return node;
    }

    _createKanjiInfoTableItem(details) {
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

    _createKanjiInfoTableItemEmpty() {
        return this._templateHandler.instantiate('kanji-info-table-empty');
    }

    _createTag(details) {
        const node = this._templateHandler.instantiate('tag');

        const inner = node.querySelector('.tag-inner');

        node.title = details.notes;
        inner.textContent = details.name;
        node.dataset.category = details.category;

        return node;
    }

    _createSearchTag(details) {
        const node = this._templateHandler.instantiate('tag-search');

        node.textContent = details.query;

        node.dataset.query = details.query;

        return node;
    }

    _createPitches(details) {
        if (!this._termPitchAccentStaticTemplateIsSetup) {
            this._termPitchAccentStaticTemplateIsSetup = true;
            const t = this._templateHandler.instantiate('term-pitch-accent-static');
            document.head.appendChild(t);
        }

        const [dictionary, dictionaryPitches] = details;

        const node = this._templateHandler.instantiate('term-pitch-accent-group');
        node.dataset.dictionary = dictionary;
        node.dataset.pitchesMulti = 'true';
        node.dataset.pitchesCount = `${dictionaryPitches.length}`;

        const tag = this._createTag({notes: '', name: dictionary, category: 'pitch-accent-dictionary'});
        node.querySelector('.term-pitch-accent-group-tag-list').appendChild(tag);

        const n = node.querySelector('.term-pitch-accent-list');
        this._appendMultiple(n, this._createPitch.bind(this), dictionaryPitches);

        return node;
    }

    _createPitch(details) {
        const {reading, position, tags, exclusiveExpressions, exclusiveReadings} = details;
        const morae = jp.getKanaMorae(reading);

        const node = this._templateHandler.instantiate('term-pitch-accent');

        node.dataset.pitchAccentPosition = `${position}`;
        node.dataset.tagCount = `${tags.length}`;

        let n = node.querySelector('.term-pitch-accent-position');
        n.textContent = `${position}`;

        n = node.querySelector('.term-pitch-accent-tag-list');
        this._appendMultiple(n, this._createTag.bind(this), tags);

        n = node.querySelector('.term-pitch-accent-disambiguation-list');
        this._createPitchAccentDisambiguations(n, exclusiveExpressions, exclusiveReadings);

        n = node.querySelector('.term-pitch-accent-characters');
        for (let i = 0, ii = morae.length; i < ii; ++i) {
            const mora = morae[i];
            const highPitch = jp.isMoraPitchHigh(i, position);
            const highPitchNext = jp.isMoraPitchHigh(i + 1, position);

            const n1 = this._templateHandler.instantiate('term-pitch-accent-character');
            const n2 = n1.querySelector('.term-pitch-accent-character-inner');

            n1.dataset.position = `${i}`;
            n1.dataset.pitch = highPitch ? 'high' : 'low';
            n1.dataset.pitchNext = highPitchNext ? 'high' : 'low';
            n2.textContent = mora;

            n.appendChild(n1);
        }

        if (morae.length > 0) {
            this._populatePitchGraph(node.querySelector('.term-pitch-accent-graph'), position, morae);
        }

        return node;
    }

    _createPitchAccentDisambiguations(container, exclusiveExpressions, exclusiveReadings) {
        const templateName = 'term-pitch-accent-disambiguation';
        for (const exclusiveExpression of exclusiveExpressions) {
            const node = this._templateHandler.instantiate(templateName);
            node.dataset.type = 'expression';
            node.textContent = exclusiveExpression;
            container.appendChild(node);
        }

        for (const exclusiveReading of exclusiveReadings) {
            const node = this._templateHandler.instantiate(templateName);
            node.dataset.type = 'reading';
            node.textContent = exclusiveReading;
            container.appendChild(node);
        }

        container.dataset.count = `${exclusiveExpressions.length + exclusiveReadings.length}`;
        container.dataset.expressionCount = `${exclusiveExpressions.length}`;
        container.dataset.readingCount = `${exclusiveReadings.length}`;
    }

    _populatePitchGraph(svg, position, morae) {
        const svgns = svg.getAttribute('xmlns');
        const ii = morae.length;
        svg.setAttribute('viewBox', `0 0 ${50 * (ii + 1)} 100`);

        const pathPoints = [];
        for (let i = 0; i < ii; ++i) {
            const highPitch = jp.isMoraPitchHigh(i, position);
            const highPitchNext = jp.isMoraPitchHigh(i + 1, position);
            const graphic = (highPitch && !highPitchNext ? '#term-pitch-accent-graph-dot-downstep' : '#term-pitch-accent-graph-dot');
            const x = `${i * 50 + 25}`;
            const y = highPitch ? '25' : '75';
            const use = document.createElementNS(svgns, 'use');
            use.setAttribute('href', graphic);
            use.setAttribute('x', x);
            use.setAttribute('y', y);
            svg.appendChild(use);
            pathPoints.push(`${x} ${y}`);
        }

        let path = svg.querySelector('.term-pitch-accent-graph-line');
        path.setAttribute('d', `M${pathPoints.join(' L')}`);

        pathPoints.splice(0, ii - 1);
        {
            const highPitch = jp.isMoraPitchHigh(ii, position);
            const x = `${ii * 50 + 25}`;
            const y = highPitch ? '25' : '75';
            const use = document.createElementNS(svgns, 'use');
            use.setAttribute('href', '#term-pitch-accent-graph-triangle');
            use.setAttribute('x', x);
            use.setAttribute('y', y);
            svg.appendChild(use);
            pathPoints.push(`${x} ${y}`);
        }

        path = svg.querySelector('.term-pitch-accent-graph-line-tail');
        path.setAttribute('d', `M${pathPoints.join(' L')}`);
    }

    _createFrequencyTag(details) {
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
            if (jp.isCodePointKanji(c.codePointAt(0))) {
                if (part.length > 0) {
                    container.appendChild(document.createTextNode(part));
                    part = '';
                }

                const link = this._createKanjiLink(c);
                container.appendChild(link);
            } else {
                part += c;
            }
        }
        if (part.length > 0) {
            container.appendChild(document.createTextNode(part));
        }
    }

    _appendMultiple(container, createItem, detailsIterable, fallback=[]) {
        if (container === null) { return 0; }

        const multi = (
            detailsIterable !== null &&
            typeof detailsIterable === 'object' &&
            typeof detailsIterable[Symbol.iterator] !== 'undefined'
        );
        if (!multi) { detailsIterable = fallback; }

        let count = 0;
        for (const details of detailsIterable) {
            const item = createItem(details);
            if (item === null) { continue; }
            container.appendChild(item);
            ++count;
        }

        container.dataset.count = `${count}`;

        return count;
    }

    _appendFurigana(container, segments, addText) {
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

    _appendMultilineText(container, text) {
        const parts = text.split('\n');
        container.appendChild(document.createTextNode(parts[0]));
        for (let i = 1, ii = parts.length; i < ii; ++i) {
            container.appendChild(document.createElement('br'));
            container.appendChild(document.createTextNode(parts[i]));
        }
    }

    _getPitchInfos(definition) {
        const results = new Map();

        const allExpressions = new Set();
        const allReadings = new Set();
        const expressions = definition.expressions;
        const sources = Array.isArray(expressions) ? expressions : [definition];
        for (const {pitches: expressionPitches, expression} of sources) {
            allExpressions.add(expression);
            for (const {reading, pitches, dictionary} of expressionPitches) {
                allReadings.add(reading);
                let dictionaryResults = results.get(dictionary);
                if (typeof dictionaryResults === 'undefined') {
                    dictionaryResults = [];
                    results.set(dictionary, dictionaryResults);
                }

                for (const {position, tags} of pitches) {
                    let pitchInfo = this._findExistingPitchInfo(reading, position, tags, dictionaryResults);
                    if (pitchInfo === null) {
                        pitchInfo = {expressions: new Set(), reading, position, tags};
                        dictionaryResults.push(pitchInfo);
                    }
                    pitchInfo.expressions.add(expression);
                }
            }
        }

        for (const dictionaryResults of results.values()) {
            for (const result of dictionaryResults) {
                const exclusiveExpressions = [];
                const exclusiveReadings = [];
                const resultExpressions = result.expressions;
                if (!areSetsEqual(resultExpressions, allExpressions)) {
                    exclusiveExpressions.push(...getSetIntersection(resultExpressions, allExpressions));
                }
                if (allReadings.size > 1) {
                    exclusiveReadings.push(result.reading);
                }
                result.exclusiveExpressions = exclusiveExpressions;
                result.exclusiveReadings = exclusiveReadings;
            }
        }

        return [...results.entries()];
    }

    _findExistingPitchInfo(reading, position, tags, pitchInfoList) {
        for (const pitchInfo of pitchInfoList) {
            if (
                pitchInfo.reading === reading &&
                pitchInfo.position === position &&
                this._areTagListsEqual(pitchInfo.tags, tags)
            ) {
                return pitchInfo;
            }
        }
        return null;
    }

    _areTagListsEqual(tagList1, tagList2) {
        const ii = tagList1.length;
        if (tagList2.length !== ii) { return false; }

        for (let i = 0; i < ii; ++i) {
            const tag1 = tagList1[i];
            const tag2 = tagList2[i];
            if (tag1.name !== tag2.name || tag1.dictionary !== tag2.dictionary) {
                return false;
            }
        }

        return true;
    }
}
