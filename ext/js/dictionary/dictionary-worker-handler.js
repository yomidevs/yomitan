/*
 * Copyright (C) 2021-2022  Yomichan Authors
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
 * DictionaryDatabase
 * DictionaryImporter
 * DictionaryWorkerMediaLoader
 */

class DictionaryWorkerHandler {
    constructor() {
        this._mediaLoader = new DictionaryWorkerMediaLoader();
    }

    prepare() {
        self.addEventListener('message', this._onMessage.bind(this), false);
    }

    // Private

    _onMessage(e) {
        const {action, params} = e.data;
        switch (action) {
            case 'importDictionary':
                this._onMessageWithProgress(params, this._importDictionary.bind(this));
                break;
            case 'deleteDictionary':
                this._onMessageWithProgress(params, this._deleteDictionary.bind(this));
                break;
            case 'getDictionaryCounts':
                this._onMessageWithProgress(params, this._getDictionaryCounts.bind(this));
                break;
            case 'getImageDetails.response':
                this._mediaLoader.handleMessage(params);
                break;
        }
    }

    async _onMessageWithProgress(params, handler) {
        const onProgress = (...args) => {
            self.postMessage({
                action: 'progress',
                params: {args}
            });
        };
        let response;
        try {
            const result = await handler(params, onProgress);
            response = {result};
        } catch (e) {
            response = {error: serializeError(e)};
        }
        self.postMessage({action: 'complete', params: response});
    }

    async _importDictionary({details, archiveContent}, onProgress) {
        const dictionaryDatabase = await this._getPreparedDictionaryDatabase();
        try {
            const dictionaryImporter = new DictionaryImporter(this._mediaLoader, onProgress);
            const {result, errors} = await dictionaryImporter.importDictionary(dictionaryDatabase, archiveContent, details);
            return {
                result,
                errors: errors.map((error) => serializeError(error))
            };
        } finally {
            dictionaryDatabase.close();
        }
    }

    async _deleteDictionary({dictionaryTitle}, onProgress) {
        const dictionaryDatabase = await this._getPreparedDictionaryDatabase();
        try {
            return await dictionaryDatabase.deleteDictionary(dictionaryTitle, 1000, onProgress);
        } finally {
            dictionaryDatabase.close();
        }
    }

    async _getDictionaryCounts({dictionaryNames, getTotal}) {
        const dictionaryDatabase = await this._getPreparedDictionaryDatabase();
        try {
            return await dictionaryDatabase.getDictionaryCounts(dictionaryNames, getTotal);
        } finally {
            dictionaryDatabase.close();
        }
    }

    async _getPreparedDictionaryDatabase() {
        const dictionaryDatabase = new DictionaryDatabase();
        await dictionaryDatabase.prepare();
        return dictionaryDatabase;
    }
}
