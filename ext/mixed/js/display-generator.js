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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* global
 * DictionaryDataUtil
 * HtmlTemplateCollection
 * api
 * jp
 */

class DisplayGenerator {
    constructor({mediaLoader}) {
        this._mediaLoader = mediaLoader;
        this._templates = null;
        this._termPitchAccentStaticTemplateIsSetup = false;
    }

    async prepare() {
        const html = await api.getDisplayTemplatesHtml();
        this._templates = new HtmlTemplateCollection(html);
    }

    preparePitchAccents() {
        if (this._termPitchAccentStaticTemplateIsSetup) { return; }
        this._termPitchAccentStaticTemplateIsSetup = true;
        const t = this._templates.instantiate('term-pitch-accent-static');
        document.head.appendChild(t);
    }

    createTermEntry(details) {
        const node = this._templates.instantiate('term-entry');

        const expressionsContainer = node.querySelector('.term-expression-list');
        const reasonsContainer = node.querySelector('.term-reasons');
        const pitchesContainer = node.querySelector('.term-pitch-accent-group-list');
        const frequenciesContainer = node.querySelector('.frequencies');
        const definitionsContainer = node.querySelector('.term-definition-list');
        const bodyContainer = node.querySelector('.term-entry-body');

        const {expressions, type, reasons, frequencies} = details;
        const definitions = (type === 'term' ? [details] : details.definitions);
        const merged = (type === 'termMerged' || type === 'termMergedByGlossary');
        const pitches = DictionaryDataUtil.getPitchAccentInfos(details);
        const pitchCount = pitches.reduce((i, v) => i + v.pitches.length, 0);

        const uniqueExpressions = new Set();
        const uniqueReadings = new Set();
        for (const {expression, reading} of expressions) {
            uniqueExpressions.add(expression);
            uniqueReadings.add(reading);
        }

        node.dataset.format = type;
        node.dataset.expressionMulti = `${merged}`;
        node.dataset.expressionCount = `${expressions.length}`;
        node.dataset.definitionCount = `${definitions.length}`;
        node.dataset.pitchAccentDictionaryCount = `${pitches.length}`;
        node.dataset.pitchAccentCount = `${pitchCount}`;
        node.dataset.uniqueExpressionCount = `${uniqueExpressions.size}`;
        node.dataset.uniqueReadingCount = `${uniqueReadings.size}`;

        bodyContainer.dataset.sectionCount = `${
            (definitions.length > 0 ? 1 : 0) +
            (pitches.length > 0 ? 1 : 0)
        }`;

        this._appendMultiple(expressionsContainer, this._createTermExpression.bind(this), expressions);
        this._appendMultiple(reasonsContainer, this._createTermReason.bind(this), reasons);
        this._appendMultiple(frequenciesContainer, this._createFrequencyTag.bind(this), frequencies);
        this._appendMultiple(pitchesContainer, this._createPitches.bind(this), pitches);
        this._appendMultiple(definitionsContainer, this._createTermDefinitionItem.bind(this), definitions);

        return node;
    }

    createKanjiEntry(details) {
        const node = this._templates.instantiate('kanji-entry');

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

        glyphContainer.textContent = details.character;

        this._appendMultiple(frequenciesContainer, this._createFrequencyTag.bind(this), details.frequencies);
        this._appendMultiple(tagContainer, this._createTag.bind(this), details.tags);
        this._appendMultiple(glossaryContainer, this._createKanjiGlossaryItem.bind(this), details.glossary);
        this._appendMultiple(chineseReadingsContainer, this._createKanjiReading.bind(this), details.onyomi);
        this._appendMultiple(japaneseReadingsContainer, this._createKanjiReading.bind(this), details.kunyomi);

        statisticsContainer.appendChild(this._createKanjiInfoTable(details.stats.misc));
        classificationsContainer.appendChild(this._createKanjiInfoTable(details.stats.class));
        codepointsContainer.appendChild(this._createKanjiInfoTable(details.stats.code));
        dictionaryIndicesContainer.appendChild(this._createKanjiInfoTable(details.stats.index));

        return node;
    }

    // Private

    _createTermExpression(details) {
        const {termFrequency, furiganaSegments, expression, reading, termTags, frequencies} = details;

        const searchQueries = [];
        if (expression) { searchQueries.push(expression); }
        if (reading) { searchQueries.push(reading); }

        const node = this._templates.instantiate('term-expression');

        const expressionContainer = node.querySelector('.term-expression-text');
        const tagContainer = node.querySelector('.tags');
        const frequencyContainer = node.querySelector('.frequencies');

        node.dataset.readingIsSame = `${!reading || reading === expression}`;
        node.dataset.frequency = termFrequency;

        this._appendFurigana(expressionContainer, furiganaSegments, this._appendKanjiLinks.bind(this));
        this._appendMultiple(tagContainer, this._createTag.bind(this), termTags);
        this._appendMultiple(tagContainer, this._createSearchTag.bind(this), searchQueries);
        this._appendMultiple(frequencyContainer, this._createFrequencyTag.bind(this), frequencies);

        return node;
    }

    _createTermReason(reason) {
        const fragment = this._templates.instantiateFragment('term-reason');
        const node = fragment.querySelector('.term-reason');
        node.textContent = reason;
        node.dataset.reason = reason;
        return fragment;
    }

    _createTermDefinitionItem(details) {
        const node = this._templates.instantiate('term-definition-item');

        const tagListContainer = node.querySelector('.term-definition-tag-list');
        const onlyListContainer = node.querySelector('.term-definition-disambiguation-list');
        const glossaryContainer = node.querySelector('.term-glossary-list');

        const dictionary = details.dictionary;
        node.dataset.dictionary = dictionary;

        this._appendMultiple(tagListContainer, this._createTag.bind(this), details.definitionTags);
        this._appendMultiple(onlyListContainer, this._createTermDisambiguation.bind(this), details.only);
        this._appendMultiple(glossaryContainer, this._createTermGlossaryItem.bind(this), details.glossary, dictionary);

        return node;
    }

    _createTermGlossaryItem(glossary, dictionary) {
        if (typeof glossary === 'string') {
            return this._createTermGlossaryItemText(glossary);
        } else if (typeof glossary === 'object' && glossary !== null) {
            switch (glossary.type) {
                case 'image':
                    return this._createTermGlossaryItemImage(glossary, dictionary);
            }
        }

        return null;
    }

    _createTermGlossaryItemText(glossary) {
        const node = this._templates.instantiate('term-glossary-item');
        const container = node.querySelector('.term-glossary');
        this._appendMultilineText(container, glossary);
        return node;
    }

    _createTermGlossaryItemImage(data, dictionary) {
        const {path, width, height, preferredWidth, preferredHeight, title, description, pixelated} = data;

        const usedWidth = (
            typeof preferredWidth === 'number' ?
            preferredWidth :
            width
        );
        const aspectRatio = (
            typeof preferredWidth === 'number' &&
            typeof preferredHeight === 'number' ?
            preferredWidth / preferredHeight :
            width / height
        );

        const node = this._templates.instantiate('term-glossary-item-image');
        node.dataset.path = path;
        node.dataset.dictionary = dictionary;
        node.dataset.imageLoadState = 'not-loaded';

        const imageContainer = node.querySelector('.term-glossary-image-container');
        imageContainer.style.width = `${usedWidth}em`;
        if (typeof title === 'string') {
            imageContainer.title = title;
        }

        const aspectRatioSizer = node.querySelector('.term-glossary-image-aspect-ratio-sizer');
        aspectRatioSizer.style.paddingTop = `${aspectRatio * 100.0}%`;

        const image = node.querySelector('img.term-glossary-image');
        const imageLink = node.querySelector('.term-glossary-image-link');
        image.dataset.pixelated = `${pixelated === true}`;

        if (this._mediaLoader !== null) {
            this._mediaLoader.loadMedia(
                path,
                dictionary,
                (url) => this._setImageData(node, image, imageLink, url, false),
                () => this._setImageData(node, image, imageLink, null, true)
            );
        }

        if (typeof description === 'string') {
            const container = node.querySelector('.term-glossary-image-description');
            this._appendMultilineText(container, description);
        }

        return node;
    }

    _setImageData(container, image, imageLink, url, unloaded) {
        if (url !== null) {
            image.src = url;
            imageLink.href = url;
            container.dataset.imageLoadState = 'loaded';
        } else {
            image.removeAttribute('src');
            imageLink.removeAttribute('href');
            container.dataset.imageLoadState = unloaded ? 'unloaded' : 'load-error';
        }
    }

    _createTermDisambiguation(disambiguation) {
        const node = this._templates.instantiate('term-definition-disambiguation');
        node.dataset.term = disambiguation;
        node.textContent = disambiguation;
        return node;
    }

    _createKanjiLink(character) {
        const node = document.createElement('a');
        node.className = 'kanji-link';
        node.textContent = character;
        return node;
    }

    _createKanjiGlossaryItem(glossary) {
        const node = this._templates.instantiate('kanji-glossary-item');
        const container = node.querySelector('.kanji-glossary');
        this._appendMultilineText(container, glossary);
        return node;
    }

    _createKanjiReading(reading) {
        const node = this._templates.instantiate('kanji-reading');
        node.textContent = reading;
        return node;
    }

    _createKanjiInfoTable(details) {
        const node = this._templates.instantiate('kanji-info-table');
        const container = node.querySelector('.kanji-info-table-body');

        const count = this._appendMultiple(container, this._createKanjiInfoTableItem.bind(this), details);
        if (count === 0) {
            const n = this._createKanjiInfoTableItemEmpty();
            container.appendChild(n);
        }

        return node;
    }

    _createKanjiInfoTableItem(details) {
        const node = this._templates.instantiate('kanji-info-table-item');
        const nameNode = node.querySelector('.kanji-info-table-item-header');
        const valueNode = node.querySelector('.kanji-info-table-item-value');
        nameNode.textContent = details.notes || details.name;
        valueNode.textContent = details.value;
        return node;
    }

    _createKanjiInfoTableItemEmpty() {
        return this._templates.instantiate('kanji-info-table-empty');
    }

    _createTag(details) {
        const node = this._templates.instantiate('tag');

        const inner = node.querySelector('.tag-inner');

        node.title = details.notes;
        inner.textContent = details.name;
        node.dataset.category = details.category;
        if (details.redundant) { node.dataset.redundant = 'true'; }

        return node;
    }

    _createSearchTag(text) {
        return this._createTag({
            notes: '',
            name: text,
            category: 'search',
            redundant: false
        });
    }

    _createPitches(details) {
        this.preparePitchAccents();

        const {dictionary, pitches} = details;

        const node = this._templates.instantiate('term-pitch-accent-group');
        node.dataset.dictionary = dictionary;
        node.dataset.pitchesMulti = 'true';
        node.dataset.pitchesCount = `${pitches.length}`;

        const tag = this._createTag({notes: '', name: dictionary, category: 'pitch-accent-dictionary'});
        node.querySelector('.term-pitch-accent-group-tag-list').appendChild(tag);

        let hasTags = false;
        for (const {tags} of pitches) {
            if (tags.length > 0) {
                hasTags = true;
                break;
            }
        }

        const n = node.querySelector('.term-pitch-accent-list');
        n.dataset.hasTags = `${hasTags}`;
        this._appendMultiple(n, this._createPitch.bind(this), pitches);

        return node;
    }

    _createPitch(details) {
        const {reading, position, tags, exclusiveExpressions, exclusiveReadings} = details;
        const morae = jp.getKanaMorae(reading);

        const node = this._templates.instantiate('term-pitch-accent');

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

            const n1 = this._templates.instantiate('term-pitch-accent-character');
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
            const node = this._templates.instantiate(templateName);
            node.dataset.type = 'expression';
            node.textContent = exclusiveExpression;
            container.appendChild(node);
        }

        for (const exclusiveReading of exclusiveReadings) {
            const node = this._templates.instantiate(templateName);
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
        const {expression, reading, dictionary, frequency} = details;
        const node = this._templates.instantiate('tag-frequency');

        node.querySelector('.term-frequency-disambiguation-expression').textContent = expression;
        node.querySelector('.term-frequency-disambiguation-reading').textContent = reading;
        node.querySelector('.term-frequency-dictionary-name').textContent = dictionary;
        node.querySelector('.term-frequency-value').textContent = frequency;

        node.dataset.expression = expression;
        node.dataset.reading = reading;
        node.dataset.readingIsSame = `${reading === expression}`;
        node.dataset.dictionary = dictionary;
        node.dataset.frequency = frequency;

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

    _appendMultiple(container, createItem, detailsArray, ...args) {
        let count = 0;
        const {ELEMENT_NODE} = Node;
        if (Array.isArray(detailsArray)) {
            for (const details of detailsArray) {
                const item = createItem(details, ...args);
                if (item === null) { continue; }
                container.appendChild(item);
                if (item.nodeType === ELEMENT_NODE) {
                    item.dataset.index = `${count}`;
                }
                ++count;
            }
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
}
