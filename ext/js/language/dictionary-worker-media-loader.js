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

/**
 * Class used for loading and validating media from a worker thread
 * during the dictionary import process.
 */
class DictionaryWorkerMediaLoader {
    /**
     * Creates a new instance of the media loader.
     */
    constructor() {
        this._requests = new Map();
    }

    /**
     * Handles a response message posted to the worker thread.
     * @param {{id: string, error: object|undefined, result: any|undefined}} params Details of the response.
     */
    handleMessage(params) {
        const {id} = params;
        const request = this._requests.get(id);
        if (typeof request === 'undefined') { return; }
        this._requests.delete(id);
        const {error} = params;
        if (typeof error !== 'undefined') {
            request.reject(deserializeError(error));
        } else {
            request.resolve(params.result);
        }
    }

    /**
     * Attempts to load an image using an ArrayBuffer and a media type to return details about it.
     * @param {ArrayBuffer} content The binary content for the image, encoded as an ArrayBuffer.
     * @param {string} mediaType The media type for the image content.
     * @returns {Promise<{content: ArrayBuffer, width: number, height: number}>} Details about the requested image content.
     * @throws {Error} An error can be thrown if the image fails to load.
     */
    getImageDetails(content, mediaType) {
        return new Promise((resolve, reject) => {
            const id = generateId(16);
            this._requests.set(id, {resolve, reject});
            self.postMessage({
                action: 'getImageDetails',
                params: {id, content, mediaType}
            }, [content]);
        });
    }
}
