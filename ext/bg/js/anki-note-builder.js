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
    constructor({anki, audioSystem, renderTemplate, getClipboardImage=null, getScreenshot=null}) {
        this._anki = anki;
        this._audioSystem = audioSystem;
        this._renderTemplate = renderTemplate;
        this._getClipboardImage = getClipboardImage;
        this._getScreenshot = getScreenshot;
    }

    async createNote({
        definition,
        mode,
        context,
        templates,
        tags=[],
        duplicateScope='collection',
        resultOutputMode='split',
        compactGlossaries=false,
        modeOptions: {fields, deck, model},
        errors=null
    }) {
        const fieldEntries = Object.entries(fields);
        const noteFields = {};
        const note = {
            fields: noteFields,
            tags,
            deckName: deck,
            modelName: model,
            options: {duplicateScope}
        };

        const data = this.createNoteData(definition, mode, context, resultOutputMode, compactGlossaries);
        const formattedFieldValuePromises = [];
        for (const [, fieldValue] of fieldEntries) {
            const formattedFieldValuePromise = this.formatField(fieldValue, data, templates, errors);
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

    createNoteData(definition, mode, context, resultOutputMode, compactGlossaries) {
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
            context
        };
    }

    async formatField(field, data, templates, errors=null) {
        const pattern = /\{([\w-]+)\}/g;
        return await AnkiNoteBuilder.stringReplaceAsync(field, pattern, async (g0, marker) => {
            try {
                return await this._renderTemplate(templates, data, marker);
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

        const reading = definition.reading;
        const now = new Date(Date.now());

        try {
            const {windowId, tabId, ownerFrameId, format, quality} = screenshot;
            const dataUrl = await this._getScreenshot(windowId, tabId, ownerFrameId, format, quality);

            let fileName = `yomichan_browser_screenshot_${reading}_${this._dateToString(now)}.${format}`;
            fileName = AnkiNoteBuilder.replaceInvalidFileNameCharacters(fileName);
            const data = dataUrl.replace(/^data:[\w\W]*?,/, '');

            await this._anki.storeMediaFile(fileName, data);

            definition.screenshotFileName = fileName;
        } catch (e) {
            // NOP
        }
    }

    async injectClipboardImage(definition, fields) {
        if (!this._containsMarker(fields, 'clipboard-image')) { return; }

        const reading = definition.reading;
        const now = new Date(Date.now());

        try {
            const dataUrl = await this._getClipboardImage();
            if (dataUrl === null) { return; }

            const extension = this._getImageExtensionFromDataUrl(dataUrl);
            if (extension === null) { return; }

            let fileName = `yomichan_clipboard_image_${reading}_${this._dateToString(now)}.${extension}`;
            fileName = AnkiNoteBuilder.replaceInvalidFileNameCharacters(fileName);
            const data = dataUrl.replace(/^data:[\w\W]*?,/, '');

            await this._anki.storeMediaFile(fileName, data);

            definition.clipboardImageFileName = fileName;
        } catch (e) {
            // NOP
        }
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

    _getImageExtensionFromDataUrl(dataUrl) {
        const match = /^data:([^;]*);/.exec(dataUrl);
        if (match === null) { return null; }
        switch (match[1].toLowerCase()) {
            case 'image/png': return 'png';
            case 'image/jpeg': return 'jpeg';
            default: return null;
        }
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
