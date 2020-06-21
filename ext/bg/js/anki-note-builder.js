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
    constructor({anki, audioSystem, renderTemplate}) {
        this._anki = anki;
        this._audioSystem = audioSystem;
        this._renderTemplate = renderTemplate;
    }

    async createNote(definition, mode, context, options, templates) {
        const isKanji = (mode === 'kanji');
        const tags = options.anki.tags;
        const modeOptions = isKanji ? options.anki.kanji : options.anki.terms;
        const modeOptionsFieldEntries = Object.entries(modeOptions.fields);

        const fields = {};
        const note = {
            fields,
            tags,
            deckName: modeOptions.deck,
            modelName: modeOptions.model,
            options: {
                duplicateScope: options.anki.duplicateScope
            }
        };

        const formattedFieldValuePromises = [];
        for (const [, fieldValue] of modeOptionsFieldEntries) {
            const formattedFieldValuePromise = this.formatField(fieldValue, definition, mode, context, options, templates, null);
            formattedFieldValuePromises.push(formattedFieldValuePromise);
        }

        const formattedFieldValues = await Promise.all(formattedFieldValuePromises);
        for (let i = 0, ii = modeOptionsFieldEntries.length; i < ii; ++i) {
            const fieldName = modeOptionsFieldEntries[i][0];
            const formattedFieldValue = formattedFieldValues[i];
            fields[fieldName] = formattedFieldValue;
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

    async injectAudio(definition, fields, sources, customSourceUrl) {
        if (!this._containsMarker(fields, 'audio')) { return; }

        try {
            const expressions = definition.expressions;
            const audioSourceDefinition = Array.isArray(expressions) ? expressions[0] : definition;

            let fileName = this._createInjectedAudioFileName(audioSourceDefinition);
            if (fileName === null) { return; }
            fileName = AnkiNoteBuilder.replaceInvalidFileNameCharacters(fileName);

            const {audio} = await this._audioSystem.getDefinitionAudio(
                audioSourceDefinition,
                sources,
                {
                    textToSpeechVoice: null,
                    customSourceUrl,
                    binary: true,
                    disableCache: true
                }
            );

            const data = AnkiNoteBuilder.arrayBufferToBase64(audio);
            await this._anki.storeMediaFile(fileName, data);

            definition.audioFileName = fileName;
        } catch (e) {
            // NOP
        }
    }

    async injectScreenshot(definition, fields, screenshot) {
        if (!this._containsMarker(fields, 'screenshot')) { return; }

        const now = new Date(Date.now());
        let fileName = `yomichan_browser_screenshot_${definition.reading}_${this._dateToString(now)}.${screenshot.format}`;
        fileName = AnkiNoteBuilder.replaceInvalidFileNameCharacters(fileName);
        const data = screenshot.dataUrl.replace(/^data:[\w\W]*?,/, '');

        try {
            await this._anki.storeMediaFile(fileName, data);
        } catch (e) {
            return;
        }

        definition.screenshotFileName = fileName;
    }

    _createInjectedAudioFileName(definition) {
        const {reading, expression} = definition;
        if (!reading && !expression) { return null; }

        let fileName = 'yomichan';
        if (reading) { fileName += `_${reading}`; }
        if (expression) { fileName += `_${expression}`; }
        fileName += '.mp3';
        fileName = fileName.replace(/\]/g, '');
        return fileName;
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

    static replaceInvalidFileNameCharacters(fileName) {
        // eslint-disable-next-line no-control-regex
        return fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-');
    }

    static arrayBufferToBase64(arrayBuffer) {
        return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
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
