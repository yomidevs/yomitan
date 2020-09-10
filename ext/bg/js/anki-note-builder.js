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
    constructor({renderTemplate, getDefinitionAudio=null, getClipboardImage=null, getScreenshot=null}) {
        this._renderTemplate = renderTemplate;
        this._getDefinitionAudio = getDefinitionAudio;
        this._getClipboardImage = getClipboardImage;
        this._getScreenshot = getScreenshot;
    }

    async createNote({
        anki=null,
        definition,
        mode,
        context,
        templates,
        tags=[],
        duplicateScope='collection',
        resultOutputMode='split',
        compactGlossaries=false,
        modeOptions: {fields, deck, model},
        audioDetails=null,
        screenshotDetails=null,
        clipboardImage=false,
        errors=null
    }) {
        if (anki !== null) {
            await this._injectMedia(anki, definition, fields, mode, audioDetails, screenshotDetails, clipboardImage);
        }

        const fieldEntries = Object.entries(fields);
        const noteFields = {};
        const note = {
            fields: noteFields,
            tags,
            deckName: deck,
            modelName: model,
            options: {duplicateScope}
        };

        const data = this._createNoteData(definition, mode, context, resultOutputMode, compactGlossaries);
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

    // Private

    _createNoteData(definition, mode, context, resultOutputMode, compactGlossaries) {
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

    async _injectMedia(anki, definition, fields, mode, audioDetails, screenshotDetails, clipboardImage) {
        if (screenshotDetails !== null) {
            await this._injectScreenshot(anki, definition, fields, screenshotDetails);
        }
        if (clipboardImage) {
            await this._injectClipboardImage(anki, definition, fields);
        }
        if (mode !== 'kanji' && audioDetails !== null) {
            await this._injectAudio(anki, definition, fields, audioDetails);
        }
    }

    async _injectAudio(anki, definition, fields, details) {
        if (!this._containsMarker(fields, 'audio')) { return; }

        try {
            const {sources, customSourceUrl} = details;
            const expressions = definition.expressions;
            const audioSourceDefinition = Array.isArray(expressions) ? expressions[0] : definition;

            let fileName = this._createInjectedAudioFileName(audioSourceDefinition);
            if (fileName === null) { return; }
            fileName = this._replaceInvalidFileNameCharacters(fileName);

            const {audio: data} = await this._getDefinitionAudio(
                audioSourceDefinition,
                sources,
                {
                    textToSpeechVoice: null,
                    customSourceUrl,
                    binary: true,
                    disableCache: true
                }
            );

            await anki.storeMediaFile(fileName, data);

            definition.audioFileName = fileName;
        } catch (e) {
            // NOP
        }
    }

    async _injectScreenshot(anki, definition, fields, details) {
        if (!this._containsMarker(fields, 'screenshot')) { return; }

        const reading = definition.reading;
        const now = new Date(Date.now());

        try {
            const {windowId, tabId, ownerFrameId, format, quality} = details;
            const dataUrl = await this._getScreenshot(windowId, tabId, ownerFrameId, format, quality);

            const {mediaType, data} = this._getDataUrlInfo(dataUrl);
            const extension = this._getImageExtensionFromMediaType(mediaType);
            if (extension === null) { return; }

            let fileName = `yomichan_browser_screenshot_${reading}_${this._dateToString(now)}.${extension}`;
            fileName = this._replaceInvalidFileNameCharacters(fileName);

            await anki.storeMediaFile(fileName, data);

            definition.screenshotFileName = fileName;
        } catch (e) {
            // NOP
        }
    }

    async _injectClipboardImage(anki, definition, fields) {
        if (!this._containsMarker(fields, 'clipboard-image')) { return; }

        const reading = definition.reading;
        const now = new Date(Date.now());

        try {
            const dataUrl = await this._getClipboardImage();
            if (dataUrl === null) { return; }

            const {mediaType, data} = this._getDataUrlInfo(dataUrl);
            const extension = this._getImageExtensionFromMediaType(mediaType);
            if (extension === null) { return; }

            let fileName = `yomichan_clipboard_image_${reading}_${this._dateToString(now)}.${extension}`;
            fileName = this._replaceInvalidFileNameCharacters(fileName);

            await anki.storeMediaFile(fileName, data);

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

    _getDataUrlInfo(dataUrl) {
        const match = /^data:([^,]*?)(;base64)?,/.exec(dataUrl);
        if (match === null) {
            throw new Error('Invalid data URL');
        }

        let mediaType = match[1];
        if (mediaType.length === 0) { mediaType = 'text/plain'; }

        let data = dataUrl.substring(match[0].length);
        if (typeof match[2] === 'undefined') { data = btoa(data); }

        return {mediaType, data};
    }

    _getImageExtensionFromMediaType(mediaType) {
        switch (mediaType.toLowerCase()) {
            case 'image/png': return 'png';
            case 'image/jpeg': return 'jpeg';
            default: return null;
        }
    }

    _replaceInvalidFileNameCharacters(fileName) {
        // eslint-disable-next-line no-control-regex
        return fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-');
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
