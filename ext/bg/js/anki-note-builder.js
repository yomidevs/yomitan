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

/* global
 * DictionaryDataUtil
 */

class AnkiNoteBuilder {
    constructor({renderTemplate}) {
        this._renderTemplate = renderTemplate;
    }

    async createNote({
        anki=null,
        definition,
        mode,
        context,
        templates,
        tags=[],
        checkForDuplicates=true,
        duplicateScope='collection',
        resultOutputMode='split',
        compactGlossaries=false,
        compactTags=false,
        modeOptions: {fields, deck, model},
        audioDetails=null,
        screenshotDetails=null,
        clipboardDetails=null,
        errors=null
    }) {
        if (anki !== null) {
            await this._injectMedia(anki, definition, fields, mode, audioDetails, screenshotDetails, clipboardDetails);
        }

        let duplicateScopeDeckName = null;
        let duplicateScopeCheckChildren = false;
        if (duplicateScope === 'deck-root') {
            duplicateScope = 'deck';
            duplicateScopeDeckName = this.getRootDeckName(deck);
            duplicateScopeCheckChildren = true;
        }

        const fieldEntries = Object.entries(fields);
        const noteFields = {};
        const note = {
            fields: noteFields,
            tags,
            deckName: deck,
            modelName: model,
            options: {
                allowDuplicate: !checkForDuplicates,
                duplicateScope,
                duplicateScopeOptions: {
                    deckName: duplicateScopeDeckName,
                    checkChildren: duplicateScopeCheckChildren
                }
            }
        };

        const data = this._createNoteData(definition, mode, context, resultOutputMode, compactGlossaries, compactTags);
        const formattedFieldValuePromises = [];
        for (const [, fieldValue] of fieldEntries) {
            const formattedFieldValuePromise = this._formatField(fieldValue, data, templates, errors);
            formattedFieldValuePromises.push(formattedFieldValuePromise);
        }

        const formattedFieldValues = await Promise.all(formattedFieldValuePromises);
        for (let i = 0, ii = fieldEntries.length; i < ii; ++i) {
            const fieldName = fieldEntries[i][0];
            const formattedFieldValue = formattedFieldValues[i];
            noteFields[fieldName] = formattedFieldValue;
        }

        return note;
    }

    containsMarker(fields, marker) {
        marker = `{${marker}}`;
        for (const fieldValue of Object.values(fields)) {
            if (fieldValue.includes(marker)) {
                return true;
            }
        }
        return false;
    }

    getRootDeckName(deckName) {
        const index = deckName.indexOf('::');
        return index >= 0 ? deckName.substring(0, index) : deckName;
    }

    // Private

    _createNoteData(definition, mode, context, resultOutputMode, compactGlossaries, compactTags) {
        const pitches = DictionaryDataUtil.getPitchAccentInfos(definition);
        const pitchCount = pitches.reduce((i, v) => i + v.pitches.length, 0);
        return {
            marker: null,
            definition,
            pitches,
            pitchCount,
            group: resultOutputMode === 'group',
            merge: resultOutputMode === 'merge',
            modeTermKanji: mode === 'term-kanji',
            modeTermKana: mode === 'term-kana',
            modeKanji: mode === 'kanji',
            compactGlossaries,
            compactTags,
            context
        };
    }

    async _formatField(field, data, templates, errors=null) {
        const pattern = /\{([\w-]+)\}/g;
        return await this._stringReplaceAsync(field, pattern, async (g0, marker) => {
            try {
                return await this._renderTemplate(templates, data, marker);
            } catch (e) {
                if (errors) { errors.push(e); }
                return `{${marker}-render-error}`;
            }
        });
    }

    _stringReplaceAsync(str, regex, replacer) {
        let match;
        let index = 0;
        const parts = [];
        while ((match = regex.exec(str)) !== null) {
            parts.push(str.substring(index, match.index), replacer(...match, match.index, str));
            index = regex.lastIndex;
        }
        if (parts.length === 0) {
            return Promise.resolve(str);
        }
        parts.push(str.substring(index));
        return Promise.all(parts).then((v) => v.join(''));
    }
}
