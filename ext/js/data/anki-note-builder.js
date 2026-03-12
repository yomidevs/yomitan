/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import {ExtensionError} from '../core/extension-error.js';
import {deferPromise, sanitizeCSS} from '../core/utilities.js';
import {convertHiraganaToKatakana, convertKatakanaToHiragana} from '../language/ja/japanese.js';
import {cloneFieldMarkerPattern, getRootDeckName, stringContainsAnyFieldMarker} from './anki-util.js';

const exactFieldMarkerPattern = /^\{([\p{Letter}\p{Number}_-]+)\}$/u;
const htmlEscapePattern = /[&<>"'`=]/g;
const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#x27;',
    '`': '&#x60;',
    '=': '&#x3D;',
};

export class AnkiNoteBuilder {
    /**
     * Initiate an instance of AnkiNoteBuilder.
     * @param {import('anki-note-builder').MinimalApi} api
     * @param {import('../templates/template-renderer-proxy.js').TemplateRendererProxy|import('../templates/template-renderer.js').TemplateRenderer} templateRenderer
     */
    constructor(api, templateRenderer) {
        /** @type {import('anki-note-builder').MinimalApi} */
        this._api = api;
        /** @type {RegExp} */
        this._markerPattern = cloneFieldMarkerPattern(true);
        /** @type {import('../templates/template-renderer-proxy.js').TemplateRendererProxy|import('../templates/template-renderer.js').TemplateRenderer} */
        this._templateRenderer = templateRenderer;
        /** @type {import('anki-note-builder').BatchedRequestGroup[]} */
        this._batchedRequests = [];
        /** @type {boolean} */
        this._batchedRequestsQueued = false;
    }

    /**
     * @param {import('anki-note-builder').CreateNoteDetails} details
     * @returns {Promise<import('anki-note-builder').CreateNoteResult>}
     */
    async createNote({
        dictionaryEntry,
        cardFormat,
        context,
        template,
        tags = [],
        requirements = [],
        duplicateScope = 'collection',
        duplicateScopeCheckAllModels = false,
        resultOutputMode = 'split',
        glossaryLayoutMode = 'default',
        compactTags = false,
        mediaOptions = null,
        dictionaryStylesMap = new Map(),
    }) {
        const fields = this._getCardFormatFields(cardFormat);
        /** @type {Error[]} */
        const allErrors = [];
        let media;
        if (requirements.length > 0 && mediaOptions !== null) {
            let errors;
            ({media, errors} = await this._injectMedia(dictionaryEntry, requirements, mediaOptions));
            for (const error of errors) {
                allErrors.push(ExtensionError.deserialize(error));
            }
        }

        const normalizedContext = this._normalizeContext(context);
        const commonData = this._createData(dictionaryEntry, cardFormat, normalizedContext, resultOutputMode, glossaryLayoutMode, compactTags, media, dictionaryStylesMap);
        const formattedFieldValuePromises = [];
        for (const [, {value: fieldValue}] of fields) {
            const formattedFieldValuePromise = this._formatField(fieldValue, commonData, template);
            formattedFieldValuePromises.push(formattedFieldValuePromise);
        }

        const formattedFieldValues = await Promise.all(formattedFieldValuePromises);
        /** @type {Map<string, import('anki-note-builder').Requirement>} */
        const uniqueRequirements = new Map();
        /** @type {import('anki').NoteFields} */
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

        const note = this._createBaseNote(cardFormat, tags, duplicateScope, duplicateScopeCheckAllModels, noteFields);
        return {note, errors: allErrors, requirements: [...uniqueRequirements.values()]};
    }

    /**
     * Creates a minimal note for duplicate checks using only the first configured field.
     * @param {import('anki-note-builder').CreateDuplicateCheckNoteDetails} details
     * @returns {Promise<import('anki').Note>}
     */
    async createDuplicateCheckNote({
        dictionaryEntry,
        cardFormat,
        context,
        template,
        tags = [],
        duplicateScope = 'collection',
        duplicateScopeCheckAllModels = false,
        resultOutputMode = 'split',
        glossaryLayoutMode = 'default',
        compactTags = false,
        dictionaryStylesMap = new Map(),
    }) {
        const fastNote = this.createDuplicateCheckNoteFast({
            dictionaryEntry,
            cardFormat,
            tags,
            duplicateScope,
            duplicateScopeCheckAllModels,
            resultOutputMode,
        });
        if (fastNote !== null) {
            return fastNote;
        }

        const fields = this._getCardFormatFields(cardFormat);
        /** @type {import('anki').NoteFields} */
        const noteFields = {};

        if (fields.length > 0) {
            const [fieldName, {value: fieldValue}] = fields[0];
            const normalizedContext = this._normalizeContext(context);
            const commonData = this._createData(
                dictionaryEntry,
                cardFormat,
                normalizedContext,
                resultOutputMode,
                glossaryLayoutMode,
                compactTags,
                void 0,
                dictionaryStylesMap,
            );
            const {value} = await this._formatField(fieldValue, commonData, template);
            noteFields[fieldName] = value;
        }

        return this._createBaseNote(cardFormat, tags, duplicateScope, duplicateScopeCheckAllModels, noteFields);
    }

    /**
     * Attempts to create a duplicate-check note without template rendering.
     * Returns `null` when the first field requires template evaluation.
     * @param {object} details
     * @param {import('dictionary').DictionaryEntry} details.dictionaryEntry
     * @param {import('settings').AnkiCardFormat} details.cardFormat
     * @param {string[]} [details.tags]
     * @param {import('settings').AnkiDuplicateScope} [details.duplicateScope]
     * @param {boolean} [details.duplicateScopeCheckAllModels]
     * @param {import('settings').ResultOutputMode} [details.resultOutputMode]
     * @returns {import('anki').Note|null}
     */
    createDuplicateCheckNoteFast({
        dictionaryEntry,
        cardFormat,
        tags = [],
        duplicateScope = 'collection',
        duplicateScopeCheckAllModels = false,
        resultOutputMode = 'split',
    }) {
        const fields = this._getCardFormatFields(cardFormat);
        /** @type {import('anki').NoteFields} */
        const noteFields = {};
        if (fields.length > 0) {
            const [fieldName, {value: fieldValue}] = fields[0];
            const fastValue = this._getFastDuplicateCheckFieldValue(fieldValue, dictionaryEntry, resultOutputMode);
            if (typeof fastValue === 'string') {
                noteFields[fieldName] = fastValue;
            } else if (!stringContainsAnyFieldMarker(fieldValue)) {
                noteFields[fieldName] = fieldValue;
            } else {
                return null;
            }
        }

        return this._createBaseNote(cardFormat, tags, duplicateScope, duplicateScopeCheckAllModels, noteFields);
    }

    /**
     * @param {import('anki-note-builder').GetRenderingDataDetails} details
     * @returns {Promise<import('anki-templates').NoteData>}
     */
    async getRenderingData({
        dictionaryEntry,
        cardFormat,
        context,
        resultOutputMode = 'split',
        glossaryLayoutMode = 'default',
        compactTags = false,
        marker,
        dictionaryStylesMap,
    }) {
        const commonData = this._createData(dictionaryEntry, cardFormat, context, resultOutputMode, glossaryLayoutMode, compactTags, void 0, dictionaryStylesMap);
        return await this._templateRenderer.getModifiedData({marker, commonData}, 'ankiNote');
    }

    /**
     * @param {import('dictionary').DictionaryEntry} dictionaryEntry
     * @returns {import('api').InjectAnkiNoteMediaDefinitionDetails}
     */
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

    /**
     * @param {import('settings').DictionariesOptions} dictionaries
     * @returns {Map<string, string>}
     */
    getDictionaryStylesMap(dictionaries) {
        const styleMap = new Map();
        for (const dictionary of dictionaries) {
            const {name, styles} = dictionary;
            if (typeof styles === 'string') {
                styleMap.set(name, sanitizeCSS(styles));
            }
        }
        return styleMap;
    }

    // Private

    /**
     * @param {import('settings').AnkiCardFormat} cardFormat
     * @returns {import('anki-note-builder').Field[]}
     */
    _getCardFormatFields(cardFormat) {
        return Object.entries(cardFormat.fields);
    }

    /**
     * @param {string} fieldValue
     * @param {import('dictionary').DictionaryEntry} dictionaryEntry
     * @param {import('settings').ResultOutputMode} resultOutputMode
     * @returns {string|undefined}
     */
    _getFastDuplicateCheckFieldValue(fieldValue, dictionaryEntry, resultOutputMode) {
        const match = exactFieldMarkerPattern.exec(fieldValue);
        if (match === null) { return void 0; }

        const marker = match[1];
        switch (marker) {
            case 'character':
                return dictionaryEntry.type === 'kanji' ? escapeAnkiFieldValue(dictionaryEntry.character) : void 0;
            case 'expression':
                return dictionaryEntry.type === 'term' ? this._getFastTermExpressionFieldValue(dictionaryEntry, resultOutputMode) : void 0;
            default:
                return void 0;
        }
    }

    /**
     * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
     * @param {import('settings').ResultOutputMode} resultOutputMode
     * @returns {string}
     */
    _getFastTermExpressionFieldValue(dictionaryEntry, resultOutputMode) {
        const uniqueTerms = [];
        const termSet = new Set();
        for (const {term} of dictionaryEntry.headwords) {
            if (termSet.has(term)) { continue; }
            termSet.add(term);
            uniqueTerms.push(term);
        }

        return escapeAnkiFieldValue(
            resultOutputMode === 'merge' ?
                uniqueTerms.join('、') :
                (uniqueTerms[0] ?? ''),
        );
    }

    /**
     * @param {import('anki-templates-internal').Context} context
     * @returns {import('anki-templates-internal').Context}
     */
    _normalizeContext(context) {
        const normalizedContext = {...context};
        try {
            const url = new URL(normalizedContext.url);
            if (url.protocol === new URL(import.meta.url).protocol) {
                normalizedContext.url = '';
            }
        } catch (e) {
            // Ignore
        }
        return normalizedContext;
    }

    /**
     * @param {import('settings').AnkiCardFormat} cardFormat
     * @param {string[]} tags
     * @param {import('settings').AnkiDuplicateScope} duplicateScope
     * @param {boolean} duplicateScopeCheckAllModels
     * @param {import('anki').NoteFields} fields
     * @returns {import('anki').Note}
     */
    _createBaseNote(cardFormat, tags, duplicateScope, duplicateScopeCheckAllModels, fields) {
        const {deck: deckName, model: modelName} = cardFormat;
        let duplicateScopeDeckName = null;
        let duplicateScopeCheckChildren = false;
        if (duplicateScope === 'deck-root') {
            duplicateScope = 'deck';
            duplicateScopeDeckName = getRootDeckName(deckName);
            duplicateScopeCheckChildren = true;
        }

        return {
            fields,
            tags,
            deckName,
            modelName,
            options: {
                allowDuplicate: true,
                duplicateScope,
                duplicateScopeOptions: {
                    deckName: duplicateScopeDeckName,
                    checkChildren: duplicateScopeCheckChildren,
                    checkAllModels: duplicateScopeCheckAllModels,
                },
            },
        };
    }

    /**
     * @param {import('dictionary').DictionaryEntry} dictionaryEntry
     * @param {import('settings').AnkiCardFormat} cardFormat
     * @param {import('anki-templates-internal').Context} context
     * @param {import('settings').ResultOutputMode} resultOutputMode
     * @param {import('settings').GlossaryLayoutMode} glossaryLayoutMode
     * @param {boolean} compactTags
     * @param {import('anki-templates').Media|undefined} media
     * @param {Map<string, string>} dictionaryStylesMap
     * @returns {import('anki-note-builder').CommonData}
     */
    _createData(dictionaryEntry, cardFormat, context, resultOutputMode, glossaryLayoutMode, compactTags, media, dictionaryStylesMap) {
        return {
            dictionaryEntry,
            cardFormat,
            context,
            resultOutputMode,
            glossaryLayoutMode,
            compactTags,
            media,
            dictionaryStylesMap,
        };
    }

    /**
     * @param {string} field
     * @param {import('anki-note-builder').CommonData} commonData
     * @param {string} template
     * @returns {Promise<{value: string, errors: ExtensionError[], requirements: import('anki-note-builder').Requirement[]}>}
     */
    async _formatField(field, commonData, template) {
        /** @type {ExtensionError[]} */
        const errors = [];
        /** @type {import('anki-note-builder').Requirement[]} */
        const requirements = [];
        const value = await this._stringReplaceAsync(field, this._markerPattern, async (match) => {
            const marker = match[1];
            try {
                const {result, requirements: fieldRequirements} = await this._renderTemplateBatched(template, commonData, marker);
                requirements.push(...fieldRequirements);
                return result;
            } catch (e) {
                const error = new ExtensionError(`Template render error for {${marker}}`);
                error.data = {error: e};
                errors.push(error);
                return `{${marker}-render-error}`;
            }
        });
        return {value, errors, requirements};
    }

    /**
     * @param {string} str
     * @param {RegExp} regex
     * @param {(match: RegExpExecArray, index: number, str: string) => (string|Promise<string>)} replacer
     * @returns {Promise<string>}
     */
    async _stringReplaceAsync(str, regex, replacer) {
        let match;
        let index = 0;
        /** @type {(Promise<string>|string)[]} */
        const parts = [];
        while ((match = regex.exec(str)) !== null) {
            parts.push(str.substring(index, match.index), replacer(match, match.index, str));
            index = regex.lastIndex;
        }
        if (parts.length === 0) {
            return str;
        }
        parts.push(str.substring(index));
        return (await Promise.all(parts)).join('');
    }

    /**
     * @param {string} template
     * @returns {import('anki-note-builder').BatchedRequestGroup}
     */
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

    /**
     * @param {string} template
     * @param {import('anki-note-builder').CommonData} commonData
     * @param {string} marker
     * @returns {Promise<import('template-renderer').RenderResult>}
     */
    _renderTemplateBatched(template, commonData, marker) {
        /** @type {import('core').DeferredPromiseDetails<import('template-renderer').RenderResult>} */
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

    /**
     * @returns {void}
     */
    _runBatchedRequestsDelayed() {
        if (this._batchedRequestsQueued) { return; }
        this._batchedRequestsQueued = true;
        void Promise.resolve().then(() => {
            this._batchedRequestsQueued = false;
            this._runBatchedRequests();
        });
    }

    /**
     * @returns {void}
     */
    _runBatchedRequests() {
        if (this._batchedRequests.length === 0) { return; }

        const allRequests = [];
        /** @type {import('template-renderer').RenderMultiItem[]} */
        const items = [];
        for (const {template, commonDataRequestsMap} of this._batchedRequests) {
            /** @type {import('template-renderer').RenderMultiTemplateItem[]} */
            const templateItems = [];
            for (const [commonData, requests] of commonDataRequestsMap.entries()) {
                /** @type {import('template-renderer').PartialOrCompositeRenderData[]} */
                const datas = [];
                for (const {marker} of requests) {
                    datas.push({marker});
                }
                allRequests.push(...requests);
                templateItems.push({
                    type: /** @type {import('anki-templates').RenderMode} */ ('ankiNote'),
                    commonData,
                    datas,
                });
            }
            items.push({template, templateItems});
        }

        this._batchedRequests.length = 0;

        void this._resolveBatchedRequests(items, allRequests);
    }

    /**
     * @param {import('template-renderer').RenderMultiItem[]} items
     * @param {import('anki-note-builder').BatchedRequestData[]} requests
     */
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
                    throw ExtensionError.deserialize(error);
                } else {
                    request.resolve(response.result);
                }
            } catch (e) {
                request.reject(e);
            }
        }
    }

    /**
     * @param {import('dictionary').DictionaryEntry} dictionaryEntry
     * @param {import('anki-note-builder').Requirement[]} requirements
     * @param {import('anki-note-builder').MediaOptions} mediaOptions
     * @returns {Promise<{media: import('anki-templates').Media, errors: import('core').SerializedError[]}>}
     */
    async _injectMedia(dictionaryEntry, requirements, mediaOptions) {
        const timestamp = Date.now();

        // Parse requirements
        let injectAudio = false;
        let injectScreenshot = false;
        let injectClipboardImage = false;
        let injectClipboardText = false;
        let injectPopupSelectionText = false;
        /** @type {import('anki-note-builder').TextFuriganaDetails[]} */
        const textFuriganaDetails = [];
        /** @type {import('api').InjectAnkiNoteMediaDictionaryMediaDetails[]} */
        const dictionaryMediaDetails = [];
        for (const requirement of requirements) {
            const {type} = requirement;
            switch (type) {
                case 'audio': injectAudio = true; break;
                case 'screenshot': injectScreenshot = true; break;
                case 'clipboardImage': injectClipboardImage = true; break;
                case 'clipboardText': injectClipboardText = true; break;
                case 'popupSelectionText': injectPopupSelectionText = true; break;
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
        /** @type {?import('api').InjectAnkiNoteMediaAudioDetails} */
        let audioDetails = null;
        /** @type {?import('api').InjectAnkiNoteMediaScreenshotDetails} */
        let screenshotDetails = null;
        /** @type {import('api').InjectAnkiNoteMediaClipboardDetails} */
        const clipboardDetails = {image: injectClipboardImage, text: injectClipboardText};
        if (injectAudio && dictionaryEntryDetails.type !== 'kanji') {
            const audioOptions = mediaOptions.audio;
            if (typeof audioOptions === 'object' && audioOptions !== null) {
                const {sources, preferredAudioIndex, idleTimeout, languageSummary, enableDefaultAudioSources} = audioOptions;
                audioDetails = {sources, preferredAudioIndex, idleTimeout, languageSummary, enableDefaultAudioSources};
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
                textFuriganaPromise = this._getTextFurigana(textFuriganaDetails, optionsContext, scanLength, dictionaryEntryDetails);
            }
        }

        // Inject media
        const popupSelectionText = injectPopupSelectionText ? this._getPopupSelectionText() : null;
        const injectedMedia = await this._api.injectAnkiNoteMedia(
            timestamp,
            dictionaryEntryDetails,
            audioDetails,
            screenshotDetails,
            clipboardDetails,
            dictionaryMediaDetails,
        );
        const {audioFileName, screenshotFileName, clipboardImageFileName, clipboardText, dictionaryMedia: dictionaryMediaArray, errors} = injectedMedia;
        const textFurigana = textFuriganaPromise !== null ? await textFuriganaPromise : [];

        // Format results
        /** @type {import('anki-templates').DictionaryMedia} */
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
            audio: (typeof audioFileName === 'string' ? {value: audioFileName} : void 0),
            screenshot: (typeof screenshotFileName === 'string' ? {value: screenshotFileName} : void 0),
            clipboardImage: (typeof clipboardImageFileName === 'string' ? {value: clipboardImageFileName} : void 0),
            clipboardText: (typeof clipboardText === 'string' ? {value: clipboardText} : void 0),
            popupSelectionText: (typeof popupSelectionText === 'string' ? {value: popupSelectionText} : void 0),
            textFurigana,
            dictionaryMedia,
        };
        return {media, errors};
    }

    /**
     * @returns {string}
     */
    _getPopupSelectionText() {
        const selection = document.getSelection();
        return selection !== null ? selection.toString() : '';
    }

    /**
     * @param {import('anki-note-builder').TextFuriganaDetails[]} entries
     * @param {import('settings').OptionsContext} optionsContext
     * @param {number} scanLength
     * @param {?import('api.d.ts').InjectAnkiNoteMediaDefinitionDetails} readingOverride
     * @returns {Promise<import('anki-templates').TextFuriganaSegment[]>}
     */
    async _getTextFurigana(entries, optionsContext, scanLength, readingOverride) {
        const results = [];
        for (const {text, readingMode} of entries) {
            const parseResults = await this._api.parseText(text, optionsContext, scanLength, true, false);
            let data = null;
            for (const {source, content} of parseResults) {
                if (source !== 'scanning-parser') { continue; }
                data = content;
                break;
            }
            if (data !== null) {
                const valueHtml = createFuriganaHtml(data, readingMode, readingOverride);
                const valuePlain = createFuriganaPlain(data, readingMode, readingOverride);
                results.push({text, readingMode, detailsHtml: {value: valueHtml}, detailsPlain: {value: valuePlain}});
            }
        }
        return results;
    }
}

/**
 * @param {import('api').ParseTextLine[]} data
 * @param {?import('anki-templates').TextFuriganaReadingMode} readingMode
 * @param {?import('api.d.ts').InjectAnkiNoteMediaDefinitionDetails} readingOverride
 * @returns {string}
 */
export function createFuriganaHtml(data, readingMode, readingOverride) {
    let result = '';
    for (const term of data) {
        result += '<span class="term">';
        for (const {text, reading} of term) {
            if (reading.length > 0) {
                const reading2 = getReading(text, reading, readingMode, readingOverride);
                result += `<ruby>${text}<rt>${reading2}</rt></ruby>`;
            } else {
                result += text;
            }
        }
        result += '</span>';
    }
    return result;
}

/**
 * @param {import('api').ParseTextLine[]} data
 * @param {?import('anki-templates').TextFuriganaReadingMode} readingMode
 * @param {?import('api.d.ts').InjectAnkiNoteMediaDefinitionDetails} readingOverride
 * @returns {string}
 */
export function createFuriganaPlain(data, readingMode, readingOverride) {
    let result = '';
    for (const term of data) {
        for (const {text, reading} of term) {
            if (reading.length > 0) {
                const reading2 = getReading(text, reading, readingMode, readingOverride);
                result += ` ${text}[${reading2}]`;
            } else {
                result += text;
            }
        }
    }
    result = result.trimStart();
    return result;
}

/**
 * @param {string} reading
 * @param {?import('anki-templates').TextFuriganaReadingMode} readingMode
 * @returns {string}
 */
function convertReading(reading, readingMode) {
    switch (readingMode) {
        case 'hiragana':
            return convertKatakanaToHiragana(reading);
        case 'katakana':
            return convertHiraganaToKatakana(reading);
        default:
            return reading;
    }
}

/**
 * @param {string} text
 * @param {string} reading
 * @param {?import('anki-templates').TextFuriganaReadingMode} readingMode
 * @param {?import('api.d.ts').InjectAnkiNoteMediaDefinitionDetails} readingOverride
 * @returns {string}
 */
function getReading(text, reading, readingMode, readingOverride) {
    const shouldOverride = readingOverride?.type === 'term' && readingOverride.term === text && readingOverride.reading.length > 0;
    return convertReading(shouldOverride ? readingOverride.reading : reading, readingMode);
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeAnkiFieldValue(value) {
    return value.replace(htmlEscapePattern, (character) => htmlEscapeMap[character]);
}
