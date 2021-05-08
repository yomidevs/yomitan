/*
 * Copyright (C) 2021  Yomichan Authors
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
 */

/**
 * This class is used to convert the internal dictionary entry format to the
 * format used by Anki, for backwards compatibility.
 */
class AnkiNoteDataCreator {
    /**
     * Creates a new instance.
     * @param japaneseUtil An instance of `JapaneseUtil`.
     */
    constructor(japaneseUtil) {
        this._japaneseUtil = japaneseUtil;
    }

    /**
     * Creates a compatibility representation of the specified data.
     * @param marker The marker that is being used for template rendering.
     * @returns An object used for rendering Anki templates.
     */
    create(marker, {
        dictionaryEntry,
        resultOutputMode,
        mode,
        glossaryLayoutMode,
        compactTags,
        context,
        injectedMedia=null
    }) {
        const self = this;
        const definition = this.createCachedValue(this._getDefinition.bind(this, dictionaryEntry, injectedMedia, context, resultOutputMode));
        const uniqueExpressions = this.createCachedValue(this._getUniqueExpressions.bind(this, dictionaryEntry));
        const uniqueReadings = this.createCachedValue(this._getUniqueReadings.bind(this, dictionaryEntry));
        const context2 = this.createCachedValue(this._getPublicContext.bind(this, context));
        const pitches = this.createCachedValue(this._getPitches.bind(this, dictionaryEntry));
        const pitchCount = this.createCachedValue(this._getPitchCount.bind(this, pitches));
        const result = {
            marker,
            get definition() { return self.getCachedValue(definition); },
            glossaryLayoutMode,
            compactTags,
            group: (resultOutputMode === 'group'),
            merge: (resultOutputMode === 'merge'),
            modeTermKanji: (mode === 'term-kanji'),
            modeTermKana: (mode === 'term-kana'),
            modeKanji: (mode === 'kanji'),
            compactGlossaries: (glossaryLayoutMode === 'compact'),
            get uniqueExpressions() { return self.getCachedValue(uniqueExpressions); },
            get uniqueReadings() { return self.getCachedValue(uniqueReadings); },
            get pitches() { return self.getCachedValue(pitches); },
            get pitchCount() { return self.getCachedValue(pitchCount); },
            get context() { return self.getCachedValue(context2); }
        };
        Object.defineProperty(result, 'dictionaryEntry', {
            configurable: false,
            enumerable: false,
            writable: false,
            value: dictionaryEntry
        });
        return result;
    }

    /**
     * Creates a deferred-evaluation value.
     * @param getter The function to invoke to get the return value.
     * @returns An object which can be passed into `getCachedValue`.
     */
    createCachedValue(getter) {
        return {getter, hasValue: false, value: void 0};
    }

    /**
     * Gets the value of a cached object.
     * @param item An object that was returned from `createCachedValue`.
     * @returns The result of evaluating the getter, which is cached after the first invocation.
     */
    getCachedValue(item) {
        if (item.hasValue) { return item.value; }
        const value = item.getter();
        item.value = value;
        item.hasValue = true;
        return value;
    }

    // Private

    _asObject(value) {
        return (typeof value === 'object' && value !== null ? value : {});
    }

    _getPrimarySource(dictionaryEntry) {
        for (const headword of dictionaryEntry.headwords) {
            for (const source of headword.sources) {
                if (source.isPrimary) { return source; }
            }
        }
        return null;
    }

    _getUniqueExpressions(dictionaryEntry) {
        if (dictionaryEntry.type === 'term') {
            const results = new Set();
            for (const {term} of dictionaryEntry.headwords) {
                results.add(term);
            }
            return [...results];
        } else {
            return [];
        }
    }

    _getUniqueReadings(dictionaryEntry) {
        if (dictionaryEntry.type === 'term') {
            const results = new Set();
            for (const {reading} of dictionaryEntry.headwords) {
                results.add(reading);
            }
            return [...results];
        } else {
            return [];
        }
    }

    _getPublicContext(context) {
        let {documentTitle} = this._asObject(context);
        if (typeof documentTitle !== 'string') { documentTitle = ''; }
        return {
            document: {
                title: documentTitle
            }
        };
    }

    _getPitches(dictionaryEntry) {
        const results = [];
        if (dictionaryEntry.type === 'term') {
            for (const {dictionary, pitches} of DictionaryDataUtil.getPitchAccentInfos(dictionaryEntry)) {
                const pitches2 = [];
                for (const {terms, reading, position, tags, exclusiveTerms, exclusiveReadings} of pitches) {
                    pitches2.push({
                        expressions: terms,
                        reading,
                        position,
                        tags,
                        exclusiveExpressions: exclusiveTerms,
                        exclusiveReadings
                    });
                }
                results.push({dictionary, pitches: pitches2});
            }
        }
        return results;
    }

    _getPitchCount(cachedPitches) {
        const pitches = this.getCachedValue(cachedPitches);
        return pitches.reduce((i, v) => i + v.pitches.length, 0);
    }

    _getDefinition(dictionaryEntry, injectedMedia, context, resultOutputMode) {
        switch (dictionaryEntry.type) {
            case 'term':
                return this._getTermDefinition(dictionaryEntry, injectedMedia, context, resultOutputMode);
            case 'kanji':
                return this._getKanjiDefinition(dictionaryEntry, injectedMedia, context);
            default:
                return {};
        }
    }

    _getKanjiDefinition(dictionaryEntry, injectedMedia, context) {
        const self = this;

        const {character, dictionary, onyomi, kunyomi, definitions} = dictionaryEntry;

        const {
            screenshotFileName=null,
            clipboardImageFileName=null,
            clipboardText=null,
            audioFileName=null
        } = this._asObject(injectedMedia);

        let {url} = this._asObject(context);
        if (typeof url !== 'string') { url = ''; }

        const stats = this.createCachedValue(this._getKanjiStats.bind(this, dictionaryEntry));
        const tags = this.createCachedValue(this._convertTags.bind(this, dictionaryEntry.tags));
        const frequencies = this.createCachedValue(this._getKanjiFrequencies.bind(this, dictionaryEntry));
        const cloze = this.createCachedValue(this._getCloze.bind(this, dictionaryEntry, context));

        return {
            type: 'kanji',
            character,
            dictionary,
            onyomi,
            kunyomi,
            glossary: definitions,
            get tags() { return self.getCachedValue(tags); },
            get stats() { return self.getCachedValue(stats); },
            get frequencies() { return self.getCachedValue(frequencies); },
            screenshotFileName,
            clipboardImageFileName,
            clipboardText,
            audioFileName,
            url,
            get cloze() { return self.getCachedValue(cloze); }
        };
    }

    _getKanjiStats(dictionaryEntry) {
        const results = {};
        for (const [key, value] of Object.entries(dictionaryEntry.stats)) {
            results[key] = value.map(this._convertKanjiStat.bind(this));
        }
        return results;
    }

    _convertKanjiStat({name, category, content, order, score, dictionary, value}) {
        return {
            name,
            category,
            notes: content,
            order,
            score,
            dictionary,
            value
        };
    }

    _getKanjiFrequencies(dictionaryEntry) {
        const results = [];
        for (const {index, dictionary, dictionaryIndex, dictionaryPriority, character, frequency} of dictionaryEntry.frequencies) {
            results.push({
                index,
                dictionary,
                dictionaryOrder: {
                    index: dictionaryIndex,
                    priority: dictionaryPriority
                },
                character,
                frequency
            });
        }
        return results;
    }

    _getTermDefinition(dictionaryEntry, injectedMedia, context, resultOutputMode) {
        const self = this;

        let type = 'term';
        switch (resultOutputMode) {
            case 'group': type = 'termGrouped'; break;
            case 'merge': type = 'termMerged'; break;
        }

        const {id, inflections, score, dictionaryIndex, dictionaryPriority, sourceTermExactMatchCount} = dictionaryEntry;

        const {
            screenshotFileName=null,
            clipboardImageFileName=null,
            clipboardText=null,
            audioFileName=null
        } = this._asObject(injectedMedia);

        let {url} = this._asObject(context);
        if (typeof url !== 'string') { url = ''; }

        const primarySource = this._getPrimarySource(dictionaryEntry);

        const dictionaryNames = this.createCachedValue(this._getTermDictionaryNames.bind(this, dictionaryEntry));
        const commonInfo = this.createCachedValue(this._getTermDictionaryEntryCommonInfo.bind(this, dictionaryEntry, type));
        const termTags = this.createCachedValue(this._getTermTags.bind(this, dictionaryEntry, type));
        const expressions = this.createCachedValue(this._getTermExpressions.bind(this, dictionaryEntry));
        const frequencies = this.createCachedValue(this._getTermFrequencies.bind(this, dictionaryEntry));
        const pitches = this.createCachedValue(this._getTermPitches.bind(this, dictionaryEntry));
        const glossary = this.createCachedValue(this._getTermGlossaryArray.bind(this, dictionaryEntry, type));
        const cloze = this.createCachedValue(this._getCloze.bind(this, dictionaryEntry, context));
        const furiganaSegments = this.createCachedValue(this._getTermFuriganaSegments.bind(this, dictionaryEntry, type));
        const sequence = this.createCachedValue(this._getTermDictionaryEntrySequence.bind(this, dictionaryEntry));

        return {
            type,
            id: (type === 'term' ? id : void 0),
            source: (primarySource !== null ? primarySource.transformedText : null),
            rawSource: (primarySource !== null ? primarySource.originalText : null),
            sourceTerm: (type !== 'termMerged' ? (primarySource !== null ? primarySource.deinflectedText : null) : void 0),
            reasons: inflections,
            score,
            isPrimary: (type === 'term' ? dictionaryEntry.isPrimary : void 0),
            get sequence() { return self.getCachedValue(sequence); },
            get dictionary() { return self.getCachedValue(dictionaryNames)[0]; },
            dictionaryOrder: {
                index: dictionaryIndex,
                priority: dictionaryPriority
            },
            get dictionaryNames() { return self.getCachedValue(dictionaryNames); },
            get expression() {
                const {uniqueTerms} = self.getCachedValue(commonInfo);
                return (type === 'term' || type === 'termGrouped' ? uniqueTerms[0] : uniqueTerms);
            },
            get reading() {
                const {uniqueReadings} = self.getCachedValue(commonInfo);
                return (type === 'term' || type === 'termGrouped' ? uniqueReadings[0] : uniqueReadings);
            },
            get expressions() { return self.getCachedValue(expressions); },
            get glossary() { return self.getCachedValue(glossary); },
            get definitionTags() { return type === 'term' ? self.getCachedValue(commonInfo).definitionTags : void 0; },
            get termTags() { return self.getCachedValue(termTags); },
            get definitions() { return self.getCachedValue(commonInfo).definitions; },
            get frequencies() { return self.getCachedValue(frequencies); },
            get pitches() { return self.getCachedValue(pitches); },
            sourceTermExactMatchCount,
            screenshotFileName,
            clipboardImageFileName,
            clipboardText,
            audioFileName,
            url,
            get cloze() { return self.getCachedValue(cloze); },
            get furiganaSegments() { return self.getCachedValue(furiganaSegments); }
        };
    }

    _getTermDictionaryNames(dictionaryEntry) {
        const dictionaryNames = new Set();
        for (const {dictionary} of dictionaryEntry.definitions) {
            dictionaryNames.add(dictionary);
        }
        return [...dictionaryNames];
    }

    _getTermDictionaryEntryCommonInfo(dictionaryEntry, type) {
        const merged = (type === 'termMerged');
        const hasDefinitions = (type !== 'term');

        const allTermsSet = new Set();
        const allReadingsSet = new Set();
        for (const {term, reading} of dictionaryEntry.headwords) {
            allTermsSet.add(term);
            allReadingsSet.add(reading);
        }
        const uniqueTerms = [...allTermsSet];
        const uniqueReadings = [...allReadingsSet];

        const definitions = [];
        const definitionTags = [];
        for (const {tags, headwordIndices, entries, dictionary, sequences} of dictionaryEntry.definitions) {
            const definitionTags2 = [];
            for (const tag of tags) {
                definitionTags.push(this._convertTag(tag));
                definitionTags2.push(this._convertTag(tag));
            }
            if (!hasDefinitions) { continue; }
            const only = merged ? DictionaryDataUtil.getDisambiguations(dictionaryEntry.headwords, headwordIndices, allTermsSet, allReadingsSet) : void 0;
            definitions.push({
                sequence: sequences[0],
                dictionary,
                glossary: entries,
                definitionTags: definitionTags2,
                only
            });
        }

        return {
            uniqueTerms,
            uniqueReadings,
            definitionTags,
            definitions: hasDefinitions ? definitions : void 0
        };
    }

    _getTermFrequencies(dictionaryEntry) {
        const results = [];
        const {headwords} = dictionaryEntry;
        for (const {headwordIndex, dictionary, dictionaryIndex, dictionaryPriority, hasReading, frequency} of dictionaryEntry.frequencies) {
            const {term, reading} = headwords[headwordIndex];
            results.push({
                index: results.length,
                expressionIndex: headwordIndex,
                dictionary,
                dictionaryOrder: {
                    index: dictionaryIndex,
                    priority: dictionaryPriority
                },
                expression: term,
                reading,
                hasReading,
                frequency
            });
        }
        return results;
    }

    _getTermPitches(dictionaryEntry) {
        const self = this;
        const results = [];
        const {headwords} = dictionaryEntry;
        for (const {headwordIndex, dictionary, dictionaryIndex, dictionaryPriority, pitches} of dictionaryEntry.pronunciations) {
            const {term, reading} = headwords[headwordIndex];
            const cachedPitches = this.createCachedValue(this._getTermPitchesInner.bind(this, pitches));
            results.push({
                index: results.length,
                expressionIndex: headwordIndex,
                dictionary,
                dictionaryOrder: {
                    index: dictionaryIndex,
                    priority: dictionaryPriority
                },
                expression: term,
                reading,
                get pitches() { return self.getCachedValue(cachedPitches); }
            });
        }
        return results;
    }

    _getTermPitchesInner(pitches) {
        const self = this;
        const results = [];
        for (const {position, tags} of pitches) {
            const cachedTags = this.createCachedValue(this._convertTags.bind(this, tags));
            results.push({
                position,
                get tags() { return self.getCachedValue(cachedTags); }
            });
        }
        return results;
    }

    _getTermExpressions(dictionaryEntry) {
        const self = this;
        const results = [];
        const {headwords} = dictionaryEntry;
        for (let i = 0, ii = headwords.length; i < ii; ++i) {
            const {term, reading, tags, sources: [{deinflectedText}], wordClasses} = headwords[i];
            const termTags = this.createCachedValue(this._convertTags.bind(this, tags));
            const frequencies = this.createCachedValue(this._getTermExpressionFrequencies.bind(this, dictionaryEntry, i));
            const pitches = this.createCachedValue(this._getTermExpressionPitches.bind(this, dictionaryEntry, i));
            const termFrequency = this.createCachedValue(this._getTermExpressionTermFrequency.bind(this, termTags));
            const furiganaSegments = this.createCachedValue(this._getTermHeadwordFuriganaSegments.bind(this, term, reading));
            const item = {
                sourceTerm: deinflectedText,
                expression: term,
                reading,
                get termTags() { return self.getCachedValue(termTags); },
                get frequencies() { return self.getCachedValue(frequencies); },
                get pitches() { return self.getCachedValue(pitches); },
                get furiganaSegments() { return self.getCachedValue(furiganaSegments); },
                get termFrequency() { return self.getCachedValue(termFrequency); },
                wordClasses
            };
            results.push(item);
        }
        return results;
    }

    _getTermExpressionFrequencies(dictionaryEntry, i) {
        const results = [];
        const {headwords, frequencies} = dictionaryEntry;
        for (const {headwordIndex, dictionary, dictionaryIndex, dictionaryPriority, hasReading, frequency} of frequencies) {
            if (headwordIndex !== i) { continue; }
            const {term, reading} = headwords[headwordIndex];
            results.push({
                index: results.length,
                expressionIndex: headwordIndex,
                dictionary,
                dictionaryOrder: {
                    index: dictionaryIndex,
                    priority: dictionaryPriority
                },
                expression: term,
                reading,
                hasReading,
                frequency
            });
        }
        return results;
    }

    _getTermExpressionPitches(dictionaryEntry, i) {
        const self = this;
        const results = [];
        const {headwords, pronunciations} = dictionaryEntry;
        for (const {headwordIndex, dictionary, dictionaryIndex, dictionaryPriority, pitches} of pronunciations) {
            if (headwordIndex !== i) { continue; }
            const {term, reading} = headwords[headwordIndex];
            const cachedPitches = this.createCachedValue(this._getTermPitchesInner.bind(this, pitches));
            results.push({
                index: results.length,
                expressionIndex: headwordIndex,
                dictionary,
                dictionaryOrder: {
                    index: dictionaryIndex,
                    priority: dictionaryPriority
                },
                expression: term,
                reading,
                get pitches() { return self.getCachedValue(cachedPitches); }
            });
        }
        return results;
    }

    _getTermExpressionTermFrequency(cachedTermTags) {
        const termTags = this.getCachedValue(cachedTermTags);
        return DictionaryDataUtil.getTermFrequency(termTags);
    }

    _getTermGlossaryArray(dictionaryEntry, type) {
        if (type === 'term') {
            const results = [];
            for (const {entries} of dictionaryEntry.definitions) {
                results.push(...entries);
            }
            return results;
        }
        return void 0;
    }

    _getTermTags(dictionaryEntry, type) {
        if (type !== 'termMerged') {
            const results = [];
            for (const {tag} of DictionaryDataUtil.groupTermTags(dictionaryEntry)) {
                results.push(this._convertTag(tag));
            }
            return results;
        }
        return void 0;
    }

    _convertTags(tags) {
        const results = [];
        for (const tag of tags) {
            results.push(this._convertTag(tag));
        }
        return results;
    }

    _convertTag({name, category, content, order, score, dictionaries, redundant}) {
        return {
            name,
            category,
            notes: (content.length > 0 ? content[0] : ''),
            order,
            score,
            dictionary: (dictionaries.length > 0 ? dictionaries[0] : ''),
            redundant
        };
    }

    _getCloze(dictionaryEntry, context) {
        let originalText = '';
        switch (dictionaryEntry.type) {
            case 'term':
                {
                    const primarySource = this._getPrimarySource(dictionaryEntry);
                    if (primarySource !== null) { originalText = primarySource.originalText; }
                }
                break;
            case 'kanji':
                originalText = dictionaryEntry.character;
                break;
        }

        const {sentence} = this._asObject(context);
        let {text, offset} = this._asObject(sentence);
        if (typeof text !== 'string') { text = ''; }
        if (typeof offset !== 'number') { offset = 0; }

        return {
            sentence: text,
            prefix: text.substring(0, offset),
            body: text.substring(offset, offset + originalText.length),
            suffix: text.substring(offset + originalText.length)
        };
    }

    _getTermFuriganaSegments(dictionaryEntry, type) {
        if (type === 'term') {
            for (const {term, reading} of dictionaryEntry.headwords) {
                return this._getTermHeadwordFuriganaSegments(term, reading);
            }
        }
        return void 0;
    }

    _getTermHeadwordFuriganaSegments(term, reading) {
        const result = [];
        for (const {text, reading: reading2} of this._japaneseUtil.distributeFurigana(term, reading)) {
            result.push({text, furigana: reading2});
        }
        return result;
    }

    _getTermDictionaryEntrySequence(dictionaryEntry) {
        let hasSequence = false;
        let mainSequence = -1;
        for (const {sequences, isPrimary} of dictionaryEntry.definitions) {
            if (!isPrimary) { continue; }
            const sequence = sequences[0];
            if (!hasSequence) {
                mainSequence = sequence;
                hasSequence = true;
                if (mainSequence === -1) { break; }
            } else if (mainSequence !== sequence) {
                mainSequence = -1;
                break;
            }
        }
        return mainSequence;
    }
}
