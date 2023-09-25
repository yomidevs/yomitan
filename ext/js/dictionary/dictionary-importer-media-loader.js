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
 * Class used for loading and validating media during the dictionary import process.
 */
class DictionaryImporterMediaLoader {
    /**
     * Attempts to load an image using an ArrayBuffer and a media type to return details about it.
     * @param {ArrayBuffer} content The binary content for the image, encoded as an ArrayBuffer.
     * @param {string} mediaType The media type for the image content.
     * @param {Transferable[]} [transfer] An optional array of data that should be transferred in `postMessage` calls.
     *   When the resulting promise resolves, this array will contain the `content` object.
     * @returns {Promise<{content: ArrayBuffer, width: number, height: number}>} Details about the requested image content.
     * @throws {Error} An error can be thrown if the image fails to load.
     */
    getImageDetails(content, mediaType, transfer) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            const eventListeners = new EventListenerCollection();
            const cleanup = () => {
                image.removeAttribute('src');
                URL.revokeObjectURL(url);
                eventListeners.removeAllEventListeners();
            };
            eventListeners.addEventListener(image, 'load', () => {
                const {naturalWidth: width, naturalHeight: height} = image;
                if (Array.isArray(transfer)) { transfer.push(content); }
                cleanup();
                resolve({content, width, height});
            }, false);
            eventListeners.addEventListener(image, 'error', () => {
                cleanup();
                reject(new Error('Image failed to load'));
            }, false);
            const blob = new Blob([content], {type: mediaType});
            const url = URL.createObjectURL(blob);
            image.src = url;
        });
    }
}
