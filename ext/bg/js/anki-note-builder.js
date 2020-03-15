/*
 * Copyright (C) 2020  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

class AnkiNoteBuilder {
    constructor({renderTemplate}) {
        this._renderTemplate = renderTemplate;
    }

    async createNote(definition, mode, context, options, templates) {
        const isKanji = (mode === 'kanji');
        const tags = options.anki.tags;
        const modeOptions = isKanji ? options.anki.kanji : options.anki.terms;
        const modeOptionsFieldEntries = Object.entries(modeOptions.fields);

        const note = {
            fields: {},
            tags,
            deckName: modeOptions.deck,
            modelName: modeOptions.model
        };

        for (const [fieldName, fieldValue] of modeOptionsFieldEntries) {
            note.fields[fieldName] = await this.formatField(fieldValue, definition, mode, context, options, templates, null);
        }

        if (!isKanji && definition.audio) {
            const audioFields = [];

            for (const [fieldName, fieldValue] of modeOptionsFieldEntries) {
                if (fieldValue.includes('{audio}')) {
                    audioFields.push(fieldName);
                }
            }

            if (audioFields.length > 0) {
                note.audio = {
                    url: definition.audio.url,
                    filename: definition.audio.filename,
                    skipHash: '7e2c2f954ef6051373ba916f000168dc', // hash of audio data that should be skipped
                    fields: audioFields
                };
            }
        }

        return note;
    }

    async formatField(field, definition, mode, context, options, templates, errors=null) {
        const data = {
            marker: null,
            definition,
            group: options.general.resultOutputMode === 'group',
            merge: options.general.resultOutputMode === 'merge',
            modeTermKanji: mode === 'term-kanji',
            modeTermKana: mode === 'term-kana',
            modeKanji: mode === 'kanji',
            compactGlossaries: options.general.compactGlossaries,
            context
        };
        const pattern = /\{([\w-]+)\}/g;
        return await AnkiNoteBuilder.stringReplaceAsync(field, pattern, async (g0, marker) => {
            data.marker = marker;
            try {
                return await this._renderTemplate(templates, data);
            } catch (e) {
                if (errors) { errors.push(e); }
                return `{${marker}-render-error}`;
            }
        });
    }

    static stringReplaceAsync(str, regex, replacer) {
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
