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
 * MediaUtil
 */

/**
 * Class used for loading and validating media during the dictionary import process.
 */
class DictionaryImporterMediaLoader {
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
            const image = new Image();
            const eventListeners = new EventListenerCollection();
            const cleanup = () => {
                image.removeAttribute('src');
                URL.revokeObjectURL(url);
                eventListeners.removeAllEventListeners();
            };
            eventListeners.addEventListener(image, 'load', () => {
                const {naturalWidth: width, naturalHeight: height} = image;
                cleanup();
                resolve({width, height});
            }, false);
            eventListeners.addEventListener(image, 'error', () => {
                cleanup();
                reject(new Error('Image failed to load'));
            }, false);
            const blob = MediaUtil.createBlobFromBase64Content(content, mediaType);
            const url = URL.createObjectURL(blob);
            image.src = url;
        });
    }
}
