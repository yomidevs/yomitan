/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import {ExtensionError} from '../core/extension-error.js';
import {toError} from '../core/to-error.js';
import {DictionaryImporterMediaLoader} from './dictionary-importer-media-loader.js';

export class DictionaryWorker {
    /**
     * @param {{reuseWorker?: boolean}} [options]
     */
    constructor(options = {}) {
        /** @type {DictionaryImporterMediaLoader} */
        this._dictionaryImporterMediaLoader = new DictionaryImporterMediaLoader();
        /** @type {boolean} */
        this._reuseWorker = options.reuseWorker === true;
        /** @type {Worker|null} */
        this._worker = null;
    }

    /**
     * @param {ArrayBuffer} archiveContent
     * @param {import('dictionary-importer').ImportDetails} details
     * @param {?import('dictionary-worker').ImportProgressCallback} onProgress
     * @returns {Promise<import('dictionary-importer').ImportResult>}
     */
    importDictionary(archiveContent, details, onProgress) {
        return this._invoke(
            'importDictionary',
            {details, archiveContent},
            [archiveContent],
            onProgress,
            this._formatImportDictionaryResult.bind(this),
        );
    }

    /**
     * @param {string} dictionaryTitle
     * @param {?import('dictionary-worker').DeleteProgressCallback} onProgress
     * @returns {Promise<void>}
     */
    deleteDictionary(dictionaryTitle, onProgress) {
        return this._invoke('deleteDictionary', {dictionaryTitle}, [], onProgress, null);
    }

    /**
     * @param {string[]} dictionaryNames
     * @param {boolean} getTotal
     * @returns {Promise<import('dictionary-database').DictionaryCounts>}
     */
    getDictionaryCounts(dictionaryNames, getTotal) {
        return this._invoke('getDictionaryCounts', {dictionaryNames, getTotal}, [], null, null);
    }

    /** */
    destroy() {
        if (this._worker !== null) {
            this._worker.terminate();
            this._worker = null;
        }
    }

    // Private

    /**
     * @template [TParams=import('core').SerializableObject]
     * @template [TResponseRaw=unknown]
     * @template [TResponse=unknown]
     * @param {string} action
     * @param {TParams} params
     * @param {Transferable[]} transfer
     * @param {?(arg: import('core').SafeAny) => void} onProgress
     * @param {?(result: TResponseRaw) => TResponse} formatResult
     */
    _invoke(action, params, transfer, onProgress, formatResult) {
        return new Promise((resolve, reject) => {
            const worker = this._worker ?? new Worker('/js/dictionary/dictionary-worker-main.js', {type: 'module'});
            if (this._reuseWorker && this._worker === null) {
                this._worker = worker;
            }
            /** @type {import('dictionary-worker').InvokeDetails<TResponseRaw, TResponse> | null} */
            let detailsRef = null;
            /**
             * @param {Error} error
             */
            const fail = (error) => {
                const details = detailsRef;
                if (details === null || details.complete) { return; }
                const {worker: worker2, reject: reject2, onMessage, onError: onError2, onMessageError: onMessageError2} = details;
                if (worker2 === null || reject2 === null || onMessage === null) { return; }
                details.complete = true;
                details.worker = null;
                details.resolve = null;
                details.reject = null;
                details.onMessage = null;
                details.onError = null;
                details.onMessageError = null;
                details.onProgress = null;
                details.formatResult = null;
                worker2.removeEventListener('message', onMessage);
                if (onError2 !== null) { worker2.removeEventListener('error', onError2); }
                if (onMessageError2 !== null) { worker2.removeEventListener('messageerror', onMessageError2); }
                worker2.terminate();
                if (this._worker === worker2) {
                    this._worker = null;
                }
                reject2(error);
            };
            /**
             * @param {ErrorEvent} event
             */
            const onError = (event) => {
                const detail = event.message ? `: ${event.message}` : '';
                fail(new Error(`Dictionary worker failed${detail}`));
            };
            /**
             * @param {MessageEvent} _event
             */
            const onMessageError = (_event) => {
                fail(new Error('Dictionary worker message deserialization failed'));
            };
            /** @type {import('dictionary-worker').InvokeDetails<TResponseRaw, TResponse>} */
            const details = {
                complete: false,
                worker,
                resolve,
                reject,
                onMessage: null,
                onError: null,
                onMessageError: null,
                onProgress,
                formatResult,
            };
            // Ugly typecast below due to not being able to explicitly state the template types
            /** @type {(event: MessageEvent<import('dictionary-worker').MessageData<TResponseRaw>>) => void} */
            const onMessage = /** @type {(details: import('dictionary-worker').InvokeDetails<TResponseRaw, TResponse>, event: MessageEvent<import('dictionary-worker').MessageData<TResponseRaw>>) => void} */ (this._onMessage).bind(this, details);
            details.onMessage = onMessage;
            details.onError = onError;
            details.onMessageError = onMessageError;
            detailsRef = details;
            worker.addEventListener('message', onMessage);
            worker.addEventListener('error', onError);
            worker.addEventListener('messageerror', onMessageError);
            try {
                worker.postMessage({action, params}, transfer);
            } catch (e) {
                fail(toError(e));
            }
        });
    }

    /**
     * @template [TResponseRaw=unknown]
     * @template [TResponse=unknown]
     * @param {import('dictionary-worker').InvokeDetails<TResponseRaw, TResponse>} details
     * @param {MessageEvent<import('dictionary-worker').MessageData<TResponseRaw>>} event
     */
    _onMessage(details, event) {
        if (details.complete) { return; }
        const {action, params} = event.data;
        switch (action) {
            case 'complete':
                {
                    const {worker, resolve, reject, onMessage, onError, onMessageError, formatResult} = details;
                    if (worker === null || onMessage === null || resolve === null || reject === null) { return; }
                    details.complete = true;
                    details.worker = null;
                    details.resolve = null;
                    details.reject = null;
                    details.onMessage = null;
                    details.onError = null;
                    details.onMessageError = null;
                    details.onProgress = null;
                    details.formatResult = null;
                    worker.removeEventListener('message', onMessage);
                    if (this._reuseWorker) {
                        if (onError !== null) { worker.removeEventListener('error', onError); }
                        if (onMessageError !== null) { worker.removeEventListener('messageerror', onMessageError); }
                    } else {
                        worker.terminate();
                    }
                    this._onMessageComplete(params, resolve, reject, formatResult);
                }
                break;
            case 'progress':
                this._onMessageProgress(params, details.onProgress);
                break;
            case 'getImageDetails':
                {
                    const {worker} = details;
                    if (worker === null) { return; }
                    void this._onMessageGetImageDetails(params, worker);
                }
                break;
        }
    }

    /**
     * @template [TResponseRaw=unknown]
     * @template [TResponse=unknown]
     * @param {import('dictionary-worker').MessageCompleteParams<TResponseRaw>} params
     * @param {(result: TResponse) => void} resolve
     * @param {(reason?: import('core').RejectionReason) => void} reject
     * @param {?(result: TResponseRaw) => TResponse} formatResult
     */
    _onMessageComplete(params, resolve, reject, formatResult) {
        const {error} = params;
        if (typeof error !== 'undefined') {
            reject(ExtensionError.deserialize(error));
        } else {
            const {result} = params;
            if (typeof formatResult === 'function') {
                let result2;
                try {
                    result2 = formatResult(result);
                } catch (e) {
                    reject(e);
                    return;
                }
                resolve(result2);
            } else {
                // If formatResult is not provided, the response is assumed to be the same type
                // For some reason, eslint thinks the TResponse type is undefined
                // eslint-disable-next-line jsdoc/no-undefined-types
                resolve(/** @type {TResponse} */ (/** @type {unknown} */ (result)));
            }
        }
    }

    /**
     * @param {import('dictionary-worker').MessageProgressParams} params
     * @param {?(...args: unknown[]) => void} onProgress
     */
    _onMessageProgress(params, onProgress) {
        if (typeof onProgress !== 'function') { return; }
        const {args} = params;
        onProgress(...args);
    }

    /**
     * @param {import('dictionary-worker').MessageGetImageDetailsParams} params
     * @param {Worker} worker
     */
    async _onMessageGetImageDetails(params, worker) {
        const {id, content, mediaType} = params;
        /** @type {Transferable[]} */
        const transfer = [];
        let response;
        try {
            const result = await this._dictionaryImporterMediaLoader.getImageDetails(content, mediaType, transfer);
            response = {id, result};
        } catch (e) {
            response = {id, error: ExtensionError.serialize(e)};
        }
        worker.postMessage({action: 'getImageDetails.response', params: response}, transfer);
    }

    /**
     * @param {import('dictionary-worker').MessageCompleteResultSerialized} response
     * @returns {import('dictionary-worker').MessageCompleteResult}
     */
    _formatImportDictionaryResult(response) {
        const {result, errors, debug} = response;
        const debugResult = (typeof debug === 'object' && debug !== null && !Array.isArray(debug)) ? debug : null;
        return {
            result,
            errors: errors.map((error) => ExtensionError.deserialize(error)),
            debug: debugResult,
        };
    }
}
