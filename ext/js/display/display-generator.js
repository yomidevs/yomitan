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
 * DictionaryDataUtil
 * HtmlTemplateCollection
 */

class DisplayGenerator {
    constructor({japaneseUtil, mediaLoader, hotkeyHelpController=null}) {
        this._japaneseUtil = japaneseUtil;
        this._mediaLoader = mediaLoader;
        this._hotkeyHelpController = hotkeyHelpController;
        this._templates = null;
        this._termPitchAccentStaticTemplateIsSetup = false;
    }

    async prepare() {
        const html = await yomichan.api.getDisplayTemplatesHtml();
        this._templates = new HtmlTemplateCollection(html);
        this.updateHotkeys();
    }

    updateHotkeys() {
        const hotkeyHelpController = this._hotkeyHelpController;
        if (hotkeyHelpController === null) { return; }
        for (const template of this._templates.getAllTemplates()) {
            hotkeyHelpController.setupNode(template.content);
        }
    }

    preparePitchAccents() {
        if (this._termPitchAccentStaticTemplateIsSetup) { return; }
        this._termPitchAccentStaticTemplateIsSetup = true;
        const t = this._templates.instantiate('pitch-accent-static');
        document.head.appendChild(t);
    }

    createTermEntry(details) {
        const node = this._templates.instantiate('term-entry');

        const expressionsContainer = node.querySelector('.expression-list');
        const reasonsContainer = node.querySelector('.inflection-list');
        const pitchesContainer = node.querySelector('.pitch-accent-group-list');
        const frequencyGroupListContainer = node.querySelector('.frequency-group-list');
        const definitionsContainer = node.querySelector('.definition-list');
        const termTagsContainer = node.querySelector('.expression-list-tag-list');

        const {expressions, type, reasons, frequencies} = details;
        const definitions = (type === 'term' ? [details] : details.definitions);
        const merged = (type === 'termMerged' || type === 'termMergedByGlossary');
        const pitches = DictionaryDataUtil.getPitchAccentInfos(details);
        const pitchCount = pitches.reduce((i, v) => i + v.pitches.length, 0);
        const groupedFrequencies = DictionaryDataUtil.groupTermFrequencies(frequencies);
        const termTags = DictionaryDataUtil.groupTermTags(details);

        const uniqueExpressions = new Set();
        const uniqueReadings = new Set();
        for (let {expression, reading} of expressions) {
            if (reading.length === 0) { reading = expression; }
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
        node.dataset.frequencyCount = `${frequencies.length}`;
        node.dataset.groupedFrequencyCount = `${groupedFrequencies.length}`;

        this._appendMultiple(expressionsContainer, this._createTermExpression.bind(this), expressions);
        this._appendMultiple(reasonsContainer, this._createTermReason.bind(this), reasons);
        this._appendMultiple(frequencyGroupListContainer, this._createFrequencyGroup.bind(this), groupedFrequencies, false);
        this._appendMultiple(pitchesContainer, this._createPitches.bind(this), pitches);
        this._appendMultiple(termTagsContainer, this._createTermTag.bind(this), termTags, expressions.length);

        for (const expression of uniqueExpressions) {
            termTagsContainer.appendChild(this._createSearchTag(expression));
        }
        for (const reading of uniqueReadings) {
            if (uniqueExpressions.has(reading)) { continue; }
            termTagsContainer.appendChild(this._createSearchTag(reading));
        }

        // Add definitions
        const dictionaryTag = this._createDictionaryTag(null);
        for (let i = 0, ii = definitions.length; i < ii; ++i) {
            const definition = definitions[i];
            const {dictionary} = definition;

            if (dictionaryTag.dictionary === dictionary) {
                dictionaryTag.redundant = true;
            } else {
                dictionaryTag.redundant = false;
                dictionaryTag.dictionary = dictionary;
                dictionaryTag.name = dictionary;
            }

            const node2 = this._createTermDefinitionItem(definition, dictionaryTag);
            node2.dataset.index = `${i}`;
            definitionsContainer.appendChild(node2);
        }
        definitionsContainer.dataset.count = `${definitions.length}`;

        return node;
    }

    createKanjiEntry(details) {
        const node = this._templates.instantiate('kanji-entry');

        const glyphContainer = node.querySelector('.kanji-glyph');
        const frequencyGroupListContainer = node.querySelector('.frequency-group-list');
        const tagContainer = node.querySelector('.kanji-tag-list');
        const glossaryContainer = node.querySelector('.kanji-glossary-list');
        const chineseReadingsContainer = node.querySelector('.kanji-readings-chinese');
        const japaneseReadingsContainer = node.querySelector('.kanji-readings-japanese');
        const statisticsContainer = node.querySelector('.kanji-statistics');
        const classificationsContainer = node.querySelector('.kanji-classifications');
        const codepointsContainer = node.querySelector('.kanji-codepoints');
        const dictionaryIndicesContainer = node.querySelector('.kanji-dictionary-indices');

        this._setTextContent(glyphContainer, details.character, 'ja');
        const groupedFrequencies = DictionaryDataUtil.groupKanjiFrequencies(details.frequencies);

        const dictionaryTag = this._createDictionaryTag(details.dictionary);

        this._appendMultiple(frequencyGroupListContainer, this._createFrequencyGroup.bind(this), groupedFrequencies, true);
        this._appendMultiple(tagContainer, this._createTag.bind(this), [...details.tags, dictionaryTag]);
        this._appendMultiple(glossaryContainer, this._createKanjiGlossaryItem.bind(this), details.glossary);
        this._appendMultiple(chineseReadingsContainer, this._createKanjiReading.bind(this), details.onyomi);
        this._appendMultiple(japaneseReadingsContainer, this._createKanjiReading.bind(this), details.kunyomi);

        statisticsContainer.appendChild(this._createKanjiInfoTable(details.stats.misc));
        classificationsContainer.appendChild(this._createKanjiInfoTable(details.stats.class));
        codepointsContainer.appendChild(this._createKanjiInfoTable(details.stats.code));
        dictionaryIndicesContainer.appendChild(this._createKanjiInfoTable(details.stats.index));

        return node;
    }

    createEmptyFooterNotification() {
        return this._templates.instantiate('footer-notification');
    }

    createTagFooterNotificationDetails(tagNode) {
        const node = this._templates.instantiateFragment('footer-notification-tag-details');

        const details = tagNode.dataset.details;
        this._setTextContent(node.querySelector('.tag-details'), details);

        let disambiguation = null;
        try {
            let a = tagNode.dataset.disambiguation;
            if (typeof a !== 'undefined') {
                a = JSON.parse(a);
                if (Array.isArray(a)) { disambiguation = a; }
            }
        } catch (e) {
            // NOP
        }

        if (disambiguation !== null) {
            const disambiguationContainer = node.querySelector('.tag-details-disambiguation-list');
            const copyAttributes = ['totalExpressionCount', 'matchedExpressionCount', 'unmatchedExpressionCount'];
            for (const attribute of copyAttributes) {
                const value = tagNode.dataset[attribute];
                if (typeof value === 'undefined') { continue; }
                disambiguationContainer.dataset[attribute] = value;
            }
            for (const {expression, reading} of disambiguation) {
                const segments = this._japaneseUtil.distributeFurigana(expression, reading);
                const disambiguationItem = document.createElement('span');
                disambiguationItem.className = 'tag-details-disambiguation';
                disambiguationItem.lang = 'ja';
                this._appendFurigana(disambiguationItem, segments, (container, text) => {
                    container.appendChild(document.createTextNode(text));
                });
                disambiguationContainer.appendChild(disambiguationItem);
            }
        }

        return node;
    }

    createAnkiNoteErrorsNotificationContent(errors) {
        const content = this._templates.instantiate('footer-notification-anki-errors-content');

        const header = content.querySelector('.anki-note-error-header');
        this._setTextContent(header, (errors.length === 1 ? 'An error occurred:' : `${errors.length} errors occurred:`), 'en');

        const list = content.querySelector('.anki-note-error-list');
        for (const error of errors) {
            const div = document.createElement('li');
            div.className = 'anki-note-error-message';
            this._setTextContent(div, isObject(error) && typeof error.message === 'string' ? error.message : `${error}`);
            list.appendChild(div);
        }

        return content;
    }

    createProfileListItem() {
        return this._templates.instantiate('profile-list-item');
    }

    instantiateTemplate(name) {
        return this._templates.instantiate(name);
    }

    // Private

    _createTermExpression(details) {
        const {termFrequency, furiganaSegments, expression, reading, termTags} = details;

        const searchQueries = [];
        if (expression) { searchQueries.push(expression); }
        if (reading) { searchQueries.push(reading); }

        const node = this._templates.instantiate('expression');

        const expressionContainer = node.querySelector('.expression-text');
        const tagContainer = node.querySelector('.expression-tag-list');

        node.dataset.readingIsSame = `${!reading || reading === expression}`;
        node.dataset.frequency = termFrequency;

        this._setTextContent(node.querySelector('.expression-reading'), reading.length > 0 ? reading : expression);

        this._appendFurigana(expressionContainer, furiganaSegments, this._appendKanjiLinks.bind(this));
        this._appendMultiple(tagContainer, this._createTag.bind(this), termTags);
        this._appendMultiple(tagContainer, this._createSearchTag.bind(this), searchQueries);

        return node;
    }

    _createTermReason(reason) {
        const fragment = this._templates.instantiateFragment('inflection');
        const node = fragment.querySelector('.inflection');
        this._setTextContent(node, reason);
        node.dataset.reason = reason;
        return fragment;
    }

    _createTermDefinitionItem(details, dictionaryTag) {
        const node = this._templates.instantiate('definition-item');

        const tagListContainer = node.querySelector('.definition-tag-list');
        const onlyListContainer = node.querySelector('.definition-disambiguation-list');
        const glossaryContainer = node.querySelector('.glossary-list');

        const {dictionary, definitionTags} = details;
        node.dataset.dictionary = dictionary;

        this._appendMultiple(tagListContainer, this._createTag.bind(this), [...definitionTags, dictionaryTag]);
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
        const node = this._templates.instantiate('glossary-item');
        const container = node.querySelector('.glossary');
        this._setTextContent(container, glossary);
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

        const node = this._templates.instantiate('glossary-item-image');
        node.dataset.path = path;
        node.dataset.dictionary = dictionary;
        node.dataset.imageLoadState = 'not-loaded';

        const imageContainer = node.querySelector('.glossary-image-container');
        imageContainer.style.width = `${usedWidth}em`;
        if (typeof title === 'string') {
            imageContainer.title = title;
        }

        const aspectRatioSizer = node.querySelector('.glossary-image-aspect-ratio-sizer');
        aspectRatioSizer.style.paddingTop = `${aspectRatio * 100.0}%`;

        const image = node.querySelector('img.glossary-image');
        const imageLink = node.querySelector('.glossary-image-link');
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
            const container = node.querySelector('.glossary-image-description');
            this._setTextContent(container, description);
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
        const node = this._templates.instantiate('definition-disambiguation');
        node.dataset.term = disambiguation;
        this._setTextContent(node, disambiguation, 'ja');
        return node;
    }

    _createKanjiLink(character) {
        const node = document.createElement('a');
        node.className = 'expression-kanji-link';
        this._setTextContent(node, character, 'ja');
        return node;
    }

    _createKanjiGlossaryItem(glossary) {
        const node = this._templates.instantiate('kanji-glossary-item');
        const container = node.querySelector('.kanji-glossary');
        this._setTextContent(container, glossary);
        return node;
    }

    _createKanjiReading(reading) {
        const node = this._templates.instantiate('kanji-reading');
        this._setTextContent(node, reading, 'ja');
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
        this._setTextContent(nameNode, details.notes || details.name);
        this._setTextContent(valueNode, details.value);
        return node;
    }

    _createKanjiInfoTableItemEmpty() {
        return this._templates.instantiate('kanji-info-table-empty');
    }

    _createTag(details) {
        const {notes, name, category, redundant} = details;
        const node = this._templates.instantiate('tag');

        const inner = node.querySelector('.tag-label-content');

        node.title = notes;
        this._setTextContent(inner, name);
        node.dataset.details = notes || name;
        node.dataset.category = category;
        if (redundant) { node.dataset.redundant = 'true'; }

        return node;
    }

    _createTermTag(details, totalExpressionCount) {
        const {tag, expressions} = details;
        const node = this._createTag(tag);
        node.dataset.disambiguation = `${JSON.stringify(expressions)}`;
        node.dataset.totalExpressionCount = `${totalExpressionCount}`;
        node.dataset.matchedExpressionCount = `${expressions.length}`;
        node.dataset.unmatchedExpressionCount = `${Math.max(0, totalExpressionCount - expressions.length)}`;
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

        const node = this._templates.instantiate('pitch-accent-group');
        node.dataset.dictionary = dictionary;
        node.dataset.pitchesMulti = 'true';
        node.dataset.pitchesCount = `${pitches.length}`;

        const tag = this._createTag({notes: '', name: dictionary, category: 'pitch-accent-dictionary'});
        node.querySelector('.pitch-accent-group-tag-list').appendChild(tag);

        let hasTags = false;
        for (const {tags} of pitches) {
            if (tags.length > 0) {
                hasTags = true;
                break;
            }
        }

        const n = node.querySelector('.pitch-accent-list');
        n.dataset.hasTags = `${hasTags}`;
        this._appendMultiple(n, this._createPitch.bind(this), pitches);

        return node;
    }

    _createPitch(details) {
        const jp = this._japaneseUtil;
        const {reading, position, tags, exclusiveExpressions, exclusiveReadings} = details;
        const morae = jp.getKanaMorae(reading);

        const node = this._templates.instantiate('pitch-accent');

        node.dataset.pitchAccentPosition = `${position}`;
        node.dataset.tagCount = `${tags.length}`;

        let n = node.querySelector('.pitch-accent-position');
        this._setTextContent(n, `${position}`, '');

        n = node.querySelector('.pitch-accent-tag-list');
        this._appendMultiple(n, this._createTag.bind(this), tags);

        n = node.querySelector('.pitch-accent-disambiguation-list');
        this._createPitchAccentDisambiguations(n, exclusiveExpressions, exclusiveReadings);

        n = node.querySelector('.pitch-accent-characters');
        for (let i = 0, ii = morae.length; i < ii; ++i) {
            const mora = morae[i];
            const highPitch = jp.isMoraPitchHigh(i, position);
            const highPitchNext = jp.isMoraPitchHigh(i + 1, position);

            const n1 = this._templates.instantiate('pitch-accent-character');
            const n2 = n1.querySelector('.pitch-accent-character-inner');

            n1.dataset.position = `${i}`;
            n1.dataset.pitch = highPitch ? 'high' : 'low';
            n1.dataset.pitchNext = highPitchNext ? 'high' : 'low';
            this._setTextContent(n2, mora, 'ja');

            n.appendChild(n1);
        }

        if (morae.length > 0) {
            this._populatePitchGraph(node.querySelector('.pitch-accent-graph'), position, morae);
        }

        return node;
    }

    _createPitchAccentDisambiguations(container, exclusiveExpressions, exclusiveReadings) {
        const templateName = 'pitch-accent-disambiguation';
        for (const exclusiveExpression of exclusiveExpressions) {
            const node = this._templates.instantiate(templateName);
            node.dataset.type = 'expression';
            this._setTextContent(node, exclusiveExpression, 'ja');
            container.appendChild(node);
        }

        for (const exclusiveReading of exclusiveReadings) {
            const node = this._templates.instantiate(templateName);
            node.dataset.type = 'reading';
            this._setTextContent(node, exclusiveReading, 'ja');
            container.appendChild(node);
        }

        container.dataset.count = `${exclusiveExpressions.length + exclusiveReadings.length}`;
        container.dataset.expressionCount = `${exclusiveExpressions.length}`;
        container.dataset.readingCount = `${exclusiveReadings.length}`;
    }

    _populatePitchGraph(svg, position, morae) {
        const jp = this._japaneseUtil;
        const svgns = svg.getAttribute('xmlns');
        const ii = morae.length;
        svg.setAttribute('viewBox', `0 0 ${50 * (ii + 1)} 100`);

        const pathPoints = [];
        for (let i = 0; i < ii; ++i) {
            const highPitch = jp.isMoraPitchHigh(i, position);
            const highPitchNext = jp.isMoraPitchHigh(i + 1, position);
            const graphic = (highPitch && !highPitchNext ? '#pitch-accent-graph-dot-downstep' : '#pitch-accent-graph-dot');
            const x = `${i * 50 + 25}`;
            const y = highPitch ? '25' : '75';
            const use = document.createElementNS(svgns, 'use');
            use.setAttribute('href', graphic);
            use.setAttribute('x', x);
            use.setAttribute('y', y);
            svg.appendChild(use);
            pathPoints.push(`${x} ${y}`);
        }

        let path = svg.querySelector('.pitch-accent-graph-line');
        path.setAttribute('d', `M${pathPoints.join(' L')}`);

        pathPoints.splice(0, ii - 1);
        {
            const highPitch = jp.isMoraPitchHigh(ii, position);
            const x = `${ii * 50 + 25}`;
            const y = highPitch ? '25' : '75';
            const use = document.createElementNS(svgns, 'use');
            use.setAttribute('href', '#pitch-accent-graph-triangle');
            use.setAttribute('x', x);
            use.setAttribute('y', y);
            svg.appendChild(use);
            pathPoints.push(`${x} ${y}`);
        }

        path = svg.querySelector('.pitch-accent-graph-line-tail');
        path.setAttribute('d', `M${pathPoints.join(' L')}`);
    }

    _createFrequencyGroup(details, kanji) {
        const {dictionary, frequencyData} = details;

        const node = this._templates.instantiate('frequency-group-item');
        const body = node.querySelector('.tag-body-content');

        this._setTextContent(node.querySelector('.tag-label-content'), dictionary);
        node.dataset.details = dictionary;

        for (let i = 0, ii = frequencyData.length; i < ii; ++i) {
            const item = frequencyData[i];
            const itemNode = (kanji ? this._createKanjiFrequency(item, dictionary) : this._createTermFrequency(item, dictionary));
            itemNode.dataset.index = `${i}`;
            body.appendChild(itemNode);
        }

        body.dataset.count = `${frequencyData.length}`;
        node.dataset.count = `${frequencyData.length}`;

        return node;
    }

    _createTermFrequency(details, dictionary) {
        const {expression, reading, frequencies} = details;
        const node = this._templates.instantiate('term-frequency-item');

        this._setTextContent(node.querySelector('.tag-label-content'), dictionary);

        const frequency = frequencies.join(', ');

        this._setTextContent(node.querySelector('.frequency-disambiguation-expression'), expression, 'ja');
        this._setTextContent(node.querySelector('.frequency-disambiguation-reading'), (reading !== null ? reading : ''), 'ja');
        this._setTextContent(node.querySelector('.frequency-value'), frequency, 'ja');

        node.dataset.expression = expression;
        node.dataset.reading = reading;
        node.dataset.hasReading = `${reading !== null}`;
        node.dataset.readingIsSame = `${reading === expression}`;
        node.dataset.dictionary = dictionary;
        node.dataset.frequency = `${frequency}`;

        return node;
    }

    _createKanjiFrequency(details, dictionary) {
        const {character, frequencies} = details;
        const node = this._templates.instantiate('kanji-frequency-item');

        const frequency = frequencies.join(', ');

        this._setTextContent(node.querySelector('.tag-label-content'), dictionary);
        this._setTextContent(node.querySelector('.frequency-value'), frequency, 'ja');

        node.dataset.character = character;
        node.dataset.dictionary = dictionary;
        node.dataset.frequency = `${frequency}`;

        return node;
    }

    _appendKanjiLinks(container, text) {
        container.lang = 'ja';
        const jp = this._japaneseUtil;
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

    _createDictionaryTag(dictionary) {
        return {
            name: dictionary,
            category: 'dictionary',
            notes: '',
            order: 100,
            score: 0,
            dictionary,
            redundant: false
        };
    }

    _setTextContent(node, value, language) {
        node.textContent = value;
        if (typeof language === 'string') {
            node.lang = language;
        } else if (this._japaneseUtil.isStringPartiallyJapanese(value)) {
            node.lang = 'ja';
        }
    }
}
