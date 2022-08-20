/*
 * Copyright (C) 2020-2022  Yomichan Authors
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
 * AnkiUtil
 * TemplateRendererProxy
 */

class AnkiNoteBuilder {
    constructor({japaneseUtil}) {
        this._japaneseUtil = japaneseUtil;
        this._markerPattern = AnkiUtil.cloneFieldMarkerPattern(true);
        this._templateRenderer = new TemplateRendererProxy();
        this._batchedRequests = [];
        this._batchedRequestsQueued = false;
    }

    async createNote({
        dictionaryEntry,
        mode,
        context,
        template,
        deckName,
        modelName,
        fields,
        tags=[],
        requirements=[],
        checkForDuplicates=true,
        duplicateScope='collection',
        duplicateScopeCheckAllModels=false,
        resultOutputMode='split',
        glossaryLayoutMode='default',
        compactTags=false,
        mediaOptions=null
    }) {
        let duplicateScopeDeckName = null;
        let duplicateScopeCheckChildren = false;
        if (duplicateScope === 'deck-root') {
            duplicateScope = 'deck';
            duplicateScopeDeckName = AnkiUtil.getRootDeckName(deckName);
            duplicateScopeCheckChildren = true;
        }

        const allErrors = [];
        let media;
        if (requirements.length > 0 && mediaOptions !== null) {
            let errors;
            ({media, errors} = await this._injectMedia(dictionaryEntry, requirements, mediaOptions));
            for (const error of errors) {
                allErrors.push(deserializeError(error));
            }
        } else {
            media = {};
        }

        const commonData = this._createData(dictionaryEntry, mode, context, resultOutputMode, glossaryLayoutMode, compactTags, media);
        const formattedFieldValuePromises = [];
        for (const [, fieldValue] of fields) {
            const formattedFieldValuePromise = this._formatField(fieldValue, commonData, template);
            formattedFieldValuePromises.push(formattedFieldValuePromise);
        }

        const formattedFieldValues = await Promise.all(formattedFieldValuePromises);
        const uniqueRequirements = new Map();
        const noteFields = {};
        for (let i = 0, ii = fields.length; i < ii; ++i) {
            const fieldName = fields[i][0];
            const {value, errors: fieldErrors, requirements: fieldRequirements} = formattedFieldValues[i];
            noteFields[fieldName] = value;
            allErrors.push(...fieldErrors);
            for (const requirement of fieldRequirements) {
                const key = JSON.stringify(requirement);
                if (uniqueRequirements.has(key)) { continue; }
                uniqueRequirements.set(key, requirement);
            }
        }

        const note = {
            fields: noteFields,
            tags,
            deckName,
            modelName,
            options: {
                allowDuplicate: !checkForDuplicates,
                duplicateScope,
                duplicateScopeOptions: {
                    deckName: duplicateScopeDeckName,
                    checkChildren: duplicateScopeCheckChildren,
                    checkAllModels: duplicateScopeCheckAllModels
                }
            }
        };
        return {note, errors: allErrors, requirements: [...uniqueRequirements.values()]};
    }

    async getRenderingData({
        dictionaryEntry,
        mode,
        context,
        resultOutputMode='split',
        glossaryLayoutMode='default',
        compactTags=false,
        marker=null
    }) {
        const commonData = this._createData(dictionaryEntry, mode, context, resultOutputMode, glossaryLayoutMode, compactTags, {});
        return await this._templateRenderer.getModifiedData({marker, commonData}, 'ankiNote');
    }

    getDictionaryEntryDetailsForNote(dictionaryEntry) {
        const {type} = dictionaryEntry;
        if (type === 'kanji') {
            const {character} = dictionaryEntry;
            return {type, character};
        }

        const {headwords} = dictionaryEntry;
        let bestIndex = -1;
        for (let i = 0, ii = headwords.length; i < ii; ++i) {
            const {term, reading, sources} = headwords[i];
            for (const {deinflectedText} of sources) {
                if (term === deinflectedText) {
                    bestIndex = i;
                    i = ii;
                    break;
                } else if (reading === deinflectedText && bestIndex < 0) {
                    bestIndex = i;
                    break;
                }
            }
        }

        const {term, reading} = headwords[Math.max(0, bestIndex)];
        return {type, term, reading};
    }

    // Private

    _createData(dictionaryEntry, mode, context, resultOutputMode, glossaryLayoutMode, compactTags, media) {
        return {
            dictionaryEntry,
            mode,
            context,
            resultOutputMode,
            glossaryLayoutMode,
            compactTags,
            media
        };
    }

    async _formatField(field, commonData, template) {
        const errors = [];
        const requirements = [];
        const value = await this._stringReplaceAsync(field, this._markerPattern, async (g0, marker) => {
            try {
                const {result, requirements: fieldRequirements} = await this._renderTemplateBatched(template, commonData, marker);
                requirements.push(...fieldRequirements);
                return result;
            } catch (e) {
                const error = new Error(`Template render error for {${marker}}`);
                error.data = {error: e};
                errors.push(error);
                return `{${marker}-render-error}`;
            }
        });
        return {value, errors, requirements};
    }

    async _stringReplaceAsync(str, regex, replacer) {
        let match;
        let index = 0;
        const parts = [];
        while ((match = regex.exec(str)) !== null) {
            parts.push(str.substring(index, match.index), replacer(...match, match.index, str));
            index = regex.lastIndex;
        }
        if (parts.length === 0) {
            return str;
        }
        parts.push(str.substring(index));
        return (await Promise.all(parts)).join('');
    }

    _getBatchedTemplateGroup(template) {
        for (const item of this._batchedRequests) {
            if (item.template === template) {
                return item;
            }
        }

        const result = {template, commonDataRequestsMap: new Map()};
        this._batchedRequests.push(result);
        return result;
    }

    _renderTemplateBatched(template, commonData, marker) {
        const {promise, resolve, reject} = deferPromise();
        const {commonDataRequestsMap} = this._getBatchedTemplateGroup(template);
        let requests = commonDataRequestsMap.get(commonData);
        if (typeof requests === 'undefined') {
            requests = [];
            commonDataRequestsMap.set(commonData, requests);
        }
        requests.push({resolve, reject, marker});
        this._runBatchedRequestsDelayed();
        return promise;
    }

    _runBatchedRequestsDelayed() {
        if (this._batchedRequestsQueued) { return; }
        this._batchedRequestsQueued = true;
        Promise.resolve().then(() => {
            this._batchedRequestsQueued = false;
            this._runBatchedRequests();
        });
    }

    _runBatchedRequests() {
        if (this._batchedRequests.length === 0) { return; }

        const allRequests = [];
        const items = [];
        for (const {template, commonDataRequestsMap} of this._batchedRequests) {
            const templateItems = [];
            for (const [commonData, requests] of commonDataRequestsMap.entries()) {
                const datas = [];
                for (const {marker} of requests) {
                    datas.push(marker);
                }
                allRequests.push(...requests);
                templateItems.push({type: 'ankiNote', commonData, datas});
            }
            items.push({template, templateItems});
        }

        this._batchedRequests.length = 0;

        this._resolveBatchedRequests(items, allRequests);
    }

    async _resolveBatchedRequests(items, requests) {
        let responses;
        try {
            responses = await this._templateRenderer.renderMulti(items);
        } catch (e) {
            for (const {reject} of requests) {
                reject(e);
            }
            return;
        }

        for (let i = 0, ii = requests.length; i < ii; ++i) {
            const request = requests[i];
            try {
                const response = responses[i];
                const {error} = response;
                if (typeof error !== 'undefined') {
                    throw deserializeError(error);
                } else {
                    request.resolve(response.result);
                }
            } catch (e) {
                request.reject(e);
            }
        }
    }

    async _injectMedia(dictionaryEntry, requirements, mediaOptions) {
        const timestamp = Date.now();

        // Parse requirements
        let injectAudio = false;
        let injectScreenshot = false;
        let injectClipboardImage = false;
        let injectClipboardText = false;
        let injectSelectionText = false;
        const textFuriganaDetails = [];
        const dictionaryMediaDetails = [];
        for (const requirement of requirements) {
            const {type} = requirement;
            switch (type) {
                case 'audio': injectAudio = true; break;
                case 'screenshot': injectScreenshot = true; break;
                case 'clipboardImage': injectClipboardImage = true; break;
                case 'clipboardText': injectClipboardText = true; break;
                case 'selectionText': injectSelectionText = true; break;
                case 'textFurigana':
                    {
                        const {text, readingMode} = requirement;
                        textFuriganaDetails.push({text, readingMode});
                    }
                    break;
                case 'dictionaryMedia':
                    {
                        const {dictionary, path} = requirement;
                        dictionaryMediaDetails.push({dictionary, path});
                    }
                    break;
            }
        }

        // Generate request data
        const dictionaryEntryDetails = this.getDictionaryEntryDetailsForNote(dictionaryEntry);
        let audioDetails = null;
        let screenshotDetails = null;
        const clipboardDetails = {image: injectClipboardImage, text: injectClipboardText};
        if (injectAudio && dictionaryEntryDetails.type !== 'kanji') {
            const audioOptions = mediaOptions.audio;
            if (typeof audioOptions === 'object' && audioOptions !== null) {
                const {sources, preferredAudioIndex, idleTimeout} = audioOptions;
                audioDetails = {sources, preferredAudioIndex, idleTimeout};
            }
        }
        if (injectScreenshot) {
            const screenshotOptions = mediaOptions.screenshot;
            if (typeof screenshotOptions === 'object' && screenshotOptions !== null) {
                const {format, quality, contentOrigin: {tabId, frameId}} = screenshotOptions;
                if (typeof tabId === 'number' && typeof frameId === 'number') {
                    screenshotDetails = {tabId, frameId, format, quality};
                }
            }
        }
        let textFuriganaPromise = null;
        if (textFuriganaDetails.length > 0) {
            const textParsingOptions = mediaOptions.textParsing;
            if (typeof textParsingOptions === 'object' && textParsingOptions !== null) {
                const {optionsContext, scanLength} = textParsingOptions;
                textFuriganaPromise = this._getTextFurigana(textFuriganaDetails, optionsContext, scanLength);
            }
        }

        // Inject media
        const selectionText = injectSelectionText ? this._getSelectionText() : null;
        const injectedMedia = await yomichan.api.injectAnkiNoteMedia(
            timestamp,
            dictionaryEntryDetails,
            audioDetails,
            screenshotDetails,
            clipboardDetails,
            dictionaryMediaDetails
        );
        const {audioFileName, screenshotFileName, clipboardImageFileName, clipboardText, dictionaryMedia: dictionaryMediaArray, errors} = injectedMedia;
        const textFurigana = textFuriganaPromise !== null ? await textFuriganaPromise : [];

        // Format results
        const dictionaryMedia = {};
        for (const {dictionary, path, fileName} of dictionaryMediaArray) {
            if (fileName === null) { continue; }
            const dictionaryMedia2 = (
                Object.prototype.hasOwnProperty.call(dictionaryMedia, dictionary) ?
                (dictionaryMedia[dictionary]) :
                (dictionaryMedia[dictionary] = {})
            );
            dictionaryMedia2[path] = {value: fileName};
        }
        const media = {
            audio: (typeof audioFileName === 'string' ? {value: audioFileName} : null),
            screenshot: (typeof screenshotFileName === 'string' ? {value: screenshotFileName} : null),
            clipboardImage: (typeof clipboardImageFileName === 'string' ? {value: clipboardImageFileName} : null),
            clipboardText: (typeof clipboardText === 'string' ? {value: clipboardText} : null),
            selectionText: (typeof selectionText === 'string' ? {value: selectionText} : null),
            textFurigana,
            dictionaryMedia
        };
        return {media, errors};
    }

    _getSelectionText() {
        return document.getSelection().toString();
    }

    async _getTextFurigana(entries, optionsContext, scanLength) {
        const results = [];
        for (const {text, readingMode} of entries) {
            const parseResults = await yomichan.api.parseText(text, optionsContext, scanLength, true, false);
            let data = null;
            for (const {source, content} of parseResults) {
                if (source !== 'scanning-parser') { continue; }
                data = content;
                break;
            }
            if (data !== null) {
                const value = this._createFuriganaHtml(data, readingMode);
                results.push({text, readingMode, details: {value}});
            }
        }
        return results;
    }

    _createFuriganaHtml(data, readingMode) {
        let result = '';
        for (const term of data) {
            result += '<span class="term">';
            for (const {text, reading} of term) {
                if (reading.length > 0) {
                    const reading2 = this._convertReading(reading, readingMode);
                    result += `<ruby>${text}<rt>${reading2}</rt></ruby>`;
                } else {
                    result += text;
                }
            }
            result += '</span>';
        }
        return result;
    }

    _convertReading(reading, readingMode) {
        switch (readingMode) {
            case 'hiragana':
                return this._japaneseUtil.convertKatakanaToHiragana(reading);
            case 'katakana':
                return this._japaneseUtil.convertHiraganaToKatakana(reading);
            default:
                return reading;
        }
    }
}
