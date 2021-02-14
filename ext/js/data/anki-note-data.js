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
 * This class represents the data that is exposed to the Anki template renderer.
 * The public properties and data should be backwards compatible.
 */
class AnkiNoteData {
    constructor({
        definition,
        resultOutputMode,
        mode,
        glossaryLayoutMode,
        compactTags,
        context,
        injectedMedia=null
    }, marker) {
        this._definition = definition;
        this._resultOutputMode = resultOutputMode;
        this._mode = mode;
        this._glossaryLayoutMode = glossaryLayoutMode;
        this._compactTags = compactTags;
        this._context = context;
        this._marker = marker;
        this._injectedMedia = injectedMedia;
        this._pitches = null;
        this._pitchCount = null;
        this._uniqueExpressions = null;
        this._uniqueReadings = null;
        this._publicContext = null;
        this._cloze = null;

        this._prepareDefinition(definition, injectedMedia, context);
    }

    get marker() {
        return this._marker;
    }

    set marker(value) {
        this._marker = value;
    }

    get definition() {
        return this._definition;
    }

    get uniqueExpressions() {
        if (this._uniqueExpressions === null) {
            this._uniqueExpressions = this._getUniqueExpressions();
        }
        return this._uniqueExpressions;
    }

    get uniqueReadings() {
        if (this._uniqueReadings === null) {
            this._uniqueReadings = this._getUniqueReadings();
        }
        return this._uniqueReadings;
    }

    get pitches() {
        if (this._pitches === null) {
            this._pitches = DictionaryDataUtil.getPitchAccentInfos(this._definition);
        }
        return this._pitches;
    }

    get pitchCount() {
        if (this._pitchCount === null) {
            this._pitchCount = this.pitches.reduce((i, v) => i + v.pitches.length, 0);
        }
        return this._pitchCount;
    }

    get group() {
        return this._resultOutputMode === 'group';
    }

    get merge() {
        return this._resultOutputMode === 'merge';
    }

    get modeTermKanji() {
        return this._mode === 'term-kanji';
    }

    get modeTermKana() {
        return this._mode === 'term-kana';
    }

    get modeKanji() {
        return this._mode === 'kanji';
    }

    get compactGlossaries() {
        return this._glossaryLayoutMode === 'compact';
    }

    get glossaryLayoutMode() {
        return this._glossaryLayoutMode;
    }

    get compactTags() {
        return this._compactTags;
    }

    get context() {
        if (this._publicContext === null) {
            this._publicContext = this._getPublicContext();
        }
        return this._publicContext;
    }

    createPublic() {
        const self = this;
        return {
            get marker() { return self.marker; },
            set marker(value) { self.marker = value; },
            get definition() { return self.definition; },
            get glossaryLayoutMode() { return self.glossaryLayoutMode; },
            get compactTags() { return self.compactTags; },
            get group() { return self.group; },
            get merge() { return self.merge; },
            get modeTermKanji() { return self.modeTermKanji; },
            get modeTermKana() { return self.modeTermKana; },
            get modeKanji() { return self.modeKanji; },
            get compactGlossaries() { return self.compactGlossaries; },
            get uniqueExpressions() { return self.uniqueExpressions; },
            get uniqueReadings() { return self.uniqueReadings; },
            get pitches() { return self.pitches; },
            get pitchCount() { return self.pitchCount; },
            get context() { return self.context; }
        };
    }

    // Private

    _asObject(value) {
        return (typeof value === 'object' && value !== null ? value : {});
    }

    _getUniqueExpressions() {
        const results = new Set();
        const definition = this._definition;
        if (definition.type !== 'kanji') {
            for (const {expression} of definition.expressions) {
                results.add(expression);
            }
        }
        return [...results];
    }

    _getUniqueReadings() {
        const results = new Set();
        const definition = this._definition;
        if (definition.type !== 'kanji') {
            for (const {reading} of definition.expressions) {
                results.add(reading);
            }
        }
        return [...results];
    }

    _getPublicContext() {
        let {documentTitle} = this._asObject(this._context);
        if (typeof documentTitle !== 'string') { documentTitle = ''; }

        return {
            document: {
                title: documentTitle
            }
        };
    }

    _getCloze() {
        const {sentence} = this._asObject(this._context);
        let {text, offset} = this._asObject(sentence);
        if (typeof text !== 'string') { text = ''; }
        if (typeof offset !== 'number') { offset = 0; }

        const definition = this._definition;
        const source = definition.type === 'kanji' ? definition.character : definition.rawSource;

        return {
            sentence: text,
            prefix: text.substring(0, offset),
            body: text.substring(offset, offset + source.length),
            suffix: text.substring(offset + source.length)
        };
    }

    _getClozeCached() {
        if (this._cloze === null) {
            this._cloze = this._getCloze();
        }
        return this._cloze;
    }

    _prepareDefinition(definition, injectedMedia, context) {
        const {
            screenshotFileName=null,
            clipboardImageFileName=null,
            clipboardText=null,
            audioFileName=null
        } = this._asObject(injectedMedia);

        let {url} = this._asObject(context);
        if (typeof url !== 'string') { url = ''; }

        definition.screenshotFileName = screenshotFileName;
        definition.clipboardImageFileName = clipboardImageFileName;
        definition.clipboardText = clipboardText;
        definition.audioFileName = audioFileName;
        definition.url = url;
        Object.defineProperty(definition, 'cloze', {
            configurable: true,
            enumerable: true,
            get: this._getClozeCached.bind(this)
        });
    }
}
