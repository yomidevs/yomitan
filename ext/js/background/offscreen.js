/*
 * Copyright (C) 2023  Yomitan Authors
 * Copyright (C) 2016-2022  Yomichan Authors
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

import * as wanakana from '../../lib/wanakana.js';
import {ClipboardReader} from '../comm/clipboard-reader.js';
import {invokeMessageHandler} from '../core.js';
import {ArrayBufferUtil} from '../data/sandbox/array-buffer-util.js';
import {DictionaryDatabase} from '../language/dictionary-database.js';
import {JapaneseUtil} from '../language/sandbox/japanese-util.js';
import {Translator} from '../language/translator.js';
import {yomitan} from '../yomitan.js';

/**
 * This class controls the core logic of the extension, including API calls
 * and various forms of communication between browser tabs and external applications.
 */
export class Offscreen {
    /**
     * Creates a new instance.
     */
    constructor() {
        this._japaneseUtil = new JapaneseUtil(wanakana);
        this._dictionaryDatabase = new DictionaryDatabase();
        this._translator = new Translator({
            japaneseUtil: this._japaneseUtil,
            database: this._dictionaryDatabase
        });
        this._clipboardReader = new ClipboardReader({
            // eslint-disable-next-line no-undef
            document: (typeof document === 'object' && document !== null ? document : null),
            pasteTargetSelector: '#clipboard-paste-target',
            richContentPasteTargetSelector: '#clipboard-rich-content-paste-target'
        });

        this._messageHandlers = new Map([
            ['clipboardGetTextOffscreen',                 {async: true,  contentScript: true,  handler: this._getTextHandler.bind(this)}],
            ['clipboardGetImageOffscreen',                 {async: true,  contentScript: true,  handler: this._getImageHandler.bind(this)}],
            ['databasePrepareOffscreen',                 {async: true,  contentScript: true,  handler: this._prepareDatabaseHandler.bind(this)}],
            ['getDictionaryInfoOffscreen',                 {async: true,  contentScript: true,  handler: this._getDictionaryInfoHandler.bind(this)}],
            ['databasePurgeOffscreen',                 {async: true,  contentScript: true,  handler: this._purgeDatabaseHandler.bind(this)}],
            ['databaseGetMediaOffscreen',                 {async: true,  contentScript: true,  handler: this._getMediaHandler.bind(this)}],
            ['translatorPrepareOffscreen',                 {async: false,  contentScript: true,  handler: this._prepareTranslatorHandler.bind(this)}],
            ['findKanjiOffscreen',                 {async: true,  contentScript: true,  handler: this._findKanjiHandler.bind(this)}],
            ['findTermsOffscreen',                 {async: true,  contentScript: true,  handler: this._findTermsHandler.bind(this)}],
            ['getTermFrequenciesOffscreen',                 {async: true,  contentScript: true,  handler: this._getTermFrequenciesHandler.bind(this)}],
            ['clearDatabaseCachesOffscreen',                 {async: false,  contentScript: true,  handler: this._clearDatabaseCachesHandler.bind(this)}]

        ]);

        const onMessage = this._onMessage.bind(this);
        chrome.runtime.onMessage.addListener(onMessage);

        this._prepareDatabasePromise = null;
    }

    _getTextHandler({useRichText}) {
        return this._clipboardReader.getText(useRichText);
    }

    _getImageHandler() {
        return this._clipboardReader.getImage();
    }

    _prepareDatabaseHandler() {
        if (this._prepareDatabasePromise !== null) {
            return this._prepareDatabasePromise;
        }
        this._prepareDatabasePromise = this._dictionaryDatabase.prepare();
        return this._prepareDatabasePromise;
    }

    _getDictionaryInfoHandler() {
        return this._dictionaryDatabase.getDictionaryInfo();
    }

    _purgeDatabaseHandler() {
        return this._dictionaryDatabase.purge();
    }

    async _getMediaHandler({targets}) {
        const media = await this._dictionaryDatabase.getMedia(targets);
        const serializedMedia = media.map((m) => ({...m, content: ArrayBufferUtil.arrayBufferToBase64(m.content)}));
        return serializedMedia;
    }

    _prepareTranslatorHandler({deinflectionReasons}) {
        return this._translator.prepare(deinflectionReasons);
    }

    _findKanjiHandler({text, findKanjiOptions}) {
        findKanjiOptions.enabledDictionaryMap = new Map(findKanjiOptions.enabledDictionaryMap);
        return this._translator.findKanji(text, findKanjiOptions);
    }

    _findTermsHandler({mode, text, findTermsOptions}) {
        findTermsOptions.enabledDictionaryMap = new Map(findTermsOptions.enabledDictionaryMap);
        if (findTermsOptions.excludeDictionaryDefinitions) {
            findTermsOptions.excludeDictionaryDefinitions = new Set(findTermsOptions.excludeDictionaryDefinitions);
        }
        findTermsOptions.textReplacements = findTermsOptions.textReplacements.map((group) => {
            if (!group) {
                return group;
            }
            return group.map((opt) => {
                const [, pattern, flags] = opt.pattern.match(/\/(.*?)\/([a-z]*)?$/i); // https://stackoverflow.com/a/33642463
                return {...opt, pattern: new RegExp(pattern, flags ?? '')};
            });
        });
        return this._translator.findTerms(mode, text, findTermsOptions);
    }

    _getTermFrequenciesHandler({termReadingList, dictionaries}) {
        return this._translator.getTermFrequencies(termReadingList, dictionaries);
    }

    _clearDatabaseCachesHandler() {
        return this._translator.clearDatabaseCaches();
    }

    _onMessage({action, params}, sender, callback) {
        const messageHandler = this._messageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return false; }
        this._validatePrivilegedMessageSender(sender);

        return invokeMessageHandler(messageHandler, params, callback, sender);
    }

    _validatePrivilegedMessageSender(sender) {
        let {url} = sender;
        if (typeof url === 'string' && yomitan.isExtensionUrl(url)) { return; }
        const {tab} = url;
        if (typeof tab === 'object' && tab !== null) {
            ({url} = tab);
            if (typeof url === 'string' && yomitan.isExtensionUrl(url)) { return; }
        }
        throw new Error('Invalid message sender');
    }
}
