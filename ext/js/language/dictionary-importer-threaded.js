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

class DictionaryImporterThreaded {
    importDictionary(archiveContent, details, onProgress) {
        return new Promise((resolve, reject) => {
            const dictionaryImporterMediaLoader = new DictionaryImporterMediaLoader();
            const worker = new Worker('/js/language/dictionary-importer-worker-main.js', {});
            const onMessage = (e) => {
                const {action, params} = e.data;
                switch (action) {
                    case 'complete':
                        worker.removeEventListener('message', onMessage);
                        worker.terminate();
                        this._onComplete(params, resolve, reject);
                        break;
                    case 'progress':
                        this._onProgress(params, onProgress);
                        break;
                    case 'getImageResolution':
                        this._onGetImageResolution(params, worker, dictionaryImporterMediaLoader);
                        break;
                }
            };
            worker.addEventListener('message', onMessage);
            worker.postMessage({
                action: 'import',
                params: {details, archiveContent}
            }, [archiveContent]);
        });
    }

    // Private

    _onComplete(params, resolve, reject) {
        const {error} = params;
        if (typeof error !== 'undefined') {
            reject(deserializeError(error));
        } else {
            resolve(this._formatResult(params.result));
        }
    }

    _formatResult(data) {
        const {result, errors} = data;
        const errors2 = errors.map((error) => deserializeError(error));
        return {result, errors: errors2};
    }

    _onProgress(params, onProgress) {
        if (typeof onProgress !== 'function') { return; }
        const {args} = params;
        onProgress(...args);
    }

    async _onGetImageResolution(params, worker, dictionaryImporterMediaLoader) {
        const {id, mediaType, content} = params;
        let response;
        try {
            const result = await dictionaryImporterMediaLoader.getImageResolution(mediaType, content);
            response = {id, result};
        } catch (e) {
            response = {id, error: serializeError(e)};
        }
        worker.postMessage({action: 'getImageResolution.response', params: response});
    }
}
