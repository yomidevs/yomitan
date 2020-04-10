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

class AnkiNoteBuilder {
    constructor({audioSystem, renderTemplate}) {
        this._audioSystem = audioSystem;
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

    async injectAudio(definition, fields, sources, optionsContext) {
        if (!this._containsMarker(fields, 'audio')) { return; }

        try {
            const expressions = definition.expressions;
            const audioSourceDefinition = Array.isArray(expressions) ? expressions[0] : definition;

            const {uri} = await this._audioSystem.getDefinitionAudio(audioSourceDefinition, sources, {tts: false, optionsContext});
            const filename = this._createInjectedAudioFileName(audioSourceDefinition);
            if (filename !== null) {
                definition.audio = {url: uri, filename};
            }
        } catch (e) {
            // NOP
        }
    }

    async injectScreenshot(definition, fields, screenshot, anki) {
        if (!this._containsMarker(fields, 'screenshot')) { return; }

        const now = new Date(Date.now());
        const filename = `yomichan_browser_screenshot_${definition.reading}_${this._dateToString(now)}.${screenshot.format}`;
        const data = screenshot.dataUrl.replace(/^data:[\w\W]*?,/, '');

        try {
            await anki.storeMediaFile(filename, data);
        } catch (e) {
            return;
        }

        definition.screenshotFileName = filename;
    }

    _createInjectedAudioFileName(definition) {
        const {reading, expression} = definition;
        if (!reading && !expression) { return null; }

        let filename = 'yomichan';
        if (reading) { filename += `_${reading}`; }
        if (expression) { filename += `_${expression}`; }
        filename += '.mp3';
        return filename;
    }

    _dateToString(date) {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth().toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const seconds = date.getUTCSeconds().toString().padStart(2, '0');
        return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
    }

    _containsMarker(fields, marker) {
        marker = `{${marker}}`;
        for (const fieldValue of Object.values(fields)) {
            if (fieldValue.includes(marker)) {
                return true;
            }
        }
        return false;
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
