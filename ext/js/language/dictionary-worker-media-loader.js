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
     * @param params Details of the response.
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
     * Attempts to load an image using a base64 encoded content and a media type
     * and returns its resolution.
     * @param mediaType The media type for the image content.
     * @param content The binary content for the image, encoded in base64.
     * @returns A Promise which resolves with {width, height} on success,
     *   otherwise an error is thrown.
     */
    getImageResolution(mediaType, content) {
        return new Promise((resolve, reject) => {
            const id = generateId(16);
            this._requests.set(id, {resolve, reject});
            self.postMessage({
                action: 'getImageResolution',
                params: {id, mediaType, content}
            });
        });
    }
}
