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
 * DictionaryImporterMediaLoader
 */

class DictionaryWorker {
    constructor() {
        this._dictionaryImporterMediaLoader = new DictionaryImporterMediaLoader();
    }

    importDictionary(archiveContent, details, onProgress) {
        return this._invoke(
            'importDictionary',
            {details, archiveContent},
            [archiveContent],
            onProgress,
            this._formatimportDictionaryResult.bind(this)
        );
    }

    deleteDictionary(dictionaryTitle, onProgress) {
        return this._invoke('deleteDictionary', {dictionaryTitle}, [], onProgress);
    }

    getDictionaryCounts(dictionaryNames, getTotal) {
        return this._invoke('getDictionaryCounts', {dictionaryNames, getTotal}, [], null);
    }

    // Private

    _invoke(action, params, transfer, onProgress, formatResult) {
        return new Promise((resolve, reject) => {
            const worker = new Worker('/js/language/dictionary-worker-main.js', {});
            const details = {
                complete: false,
                worker,
                resolve,
                reject,
                onMessage: null,
                onProgress,
                formatResult
            };
            const onMessage = this._onMessage.bind(this, details);
            details.onMessage = onMessage;
            worker.addEventListener('message', onMessage);
            worker.postMessage({action, params}, transfer);
        });
    }

    _onMessage(details, e) {
        if (details.complete) { return; }
        const {action, params} = e.data;
        switch (action) {
            case 'complete':
                {
                    const {worker, resolve, reject, onMessage, formatResult} = details;
                    details.complete = true;
                    details.worker = null;
                    details.resolve = null;
                    details.reject = null;
                    details.onMessage = null;
                    details.onProgress = null;
                    details.formatResult = null;
                    worker.removeEventListener('message', onMessage);
                    worker.terminate();
                    this._onMessageComplete(params, resolve, reject, formatResult);
                }
                break;
            case 'progress':
                this._onMessageProgress(params, details.onProgress);
                break;
            case 'getImageDetails':
                this._onMessageGetImageDetails(params, details.worker);
                break;
        }
    }

    _onMessageComplete(params, resolve, reject, formatResult) {
        const {error} = params;
        if (typeof error !== 'undefined') {
            reject(deserializeError(error));
        } else {
            let {result} = params;
            try {
                if (typeof formatResult === 'function') {
                    result = formatResult(result);
                }
            } catch (e) {
                reject(e);
                return;
            }
            resolve(result);
        }
    }

    _onMessageProgress(params, onProgress) {
        if (typeof onProgress !== 'function') { return; }
        const {args} = params;
        onProgress(...args);
    }

    async _onMessageGetImageDetails(params, worker) {
        const {id, content, mediaType} = params;
        const transfer = [];
        let response;
        try {
            const result = await this._dictionaryImporterMediaLoader.getImageDetails(content, mediaType, transfer);
            response = {id, result};
        } catch (e) {
            response = {id, error: serializeError(e)};
        }
        worker.postMessage({action: 'getImageDetails.response', params: response}, transfer);
    }

    _formatimportDictionaryResult(result) {
        result.errors = result.errors.map((error) => deserializeError(error));
        return result;
    }
}
