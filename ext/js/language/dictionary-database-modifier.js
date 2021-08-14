/*
 * Copyright (C) 2021  Yomichan Authors
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

class DictionaryDatabaseModifier {
    constructor() {
        this._dictionaryImporterMediaLoader = new DictionaryImporterMediaLoader();
    }

    importDictionary(archiveContent, details, onProgress) {
        return this._invoke('importDictionary', {details, archiveContent}, [archiveContent], onProgress);
    }

    // Private

    _invoke(action, params, transfer, onProgress) {
        return new Promise((resolve, reject) => {
            const worker = new Worker('/js/language/dictionary-worker-main.js', {});
            const details = {
                complete: false,
                worker,
                resolve,
                reject,
                onMessage: null,
                onProgress
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
                    const {worker, resolve, reject, onMessage} = details;
                    details.complete = true;
                    details.worker = null;
                    details.resolve = null;
                    details.reject = null;
                    details.onMessage = null;
                    worker.removeEventListener('message', onMessage);
                    worker.terminate();
                    this._onMessageComplete(params, resolve, reject);
                }
                break;
            case 'progress':
                this._onMessageProgress(params, details.onProgress);
                break;
            case 'getImageResolution':
                this._onMessageGetImageResolution(params, details.worker);
                break;
        }
    }

    _onMessageComplete(params, resolve, reject) {
        const {error} = params;
        if (typeof error !== 'undefined') {
            reject(deserializeError(error));
        } else {
            resolve(this._formatResult(params.result));
        }
    }

    _onMessageProgress(params, onProgress) {
        if (typeof onProgress !== 'function') { return; }
        const {args} = params;
        onProgress(...args);
    }

    async _onMessageGetImageResolution(params, worker) {
        const {id, mediaType, content} = params;
        let response;
        try {
            const result = await this._dictionaryImporterMediaLoader.getImageResolution(mediaType, content);
            response = {id, result};
        } catch (e) {
            response = {id, error: serializeError(e)};
        }
        worker.postMessage({action: 'getImageResolution.response', params: response});
    }

    _formatResult(data) {
        const {result, errors} = data;
        const errors2 = errors.map((error) => deserializeError(error));
        return {result, errors: errors2};
    }
}
