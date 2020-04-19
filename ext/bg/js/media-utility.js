/*
 * Copyright (C) 2020  Yomichan Authors
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
 * mediaUtility is an object containing helper methods related to media processing.
 */
const mediaUtility = (() => {
    /**
     * Gets the file extension of a file path. URL search queries and hash
     * fragments are not handled.
     * @param path The path to the file.
     * @returns The file extension, including the '.', or an empty string
     *   if there is no file extension.
     */
    function getFileNameExtension(path) {
        const match = /\.[^./\\]*$/.exec(path);
        return match !== null ? match[0] : '';
    }

    /**
     * Gets an image file's media type using a file path.
     * @param path The path to the file.
     * @returns The media type string if it can be determined from the file path,
     *   otherwise null.
     */
    function getImageMediaTypeFromFileName(path) {
        switch (getFileNameExtension(path).toLowerCase()) {
            case '.apng':
                return 'image/apng';
            case '.bmp':
                return 'image/bmp';
            case '.gif':
                return 'image/gif';
            case '.ico':
            case '.cur':
                return 'image/x-icon';
            case '.jpg':
            case '.jpeg':
            case '.jfif':
            case '.pjpeg':
            case '.pjp':
                return 'image/jpeg';
            case '.png':
                return 'image/png';
            case '.svg':
                return 'image/svg+xml';
            case '.tif':
            case '.tiff':
                return 'image/tiff';
            case '.webp':
                return 'image/webp';
            default:
                return null;
        }
    }

    /**
     * Attempts to load an image using a base64 encoded content and a media type.
     * @param mediaType The media type for the image content.
     * @param content The binary content for the image, encoded in base64.
     * @returns A Promise which resolves with an HTMLImageElement instance on
     *   successful load, otherwise an error is thrown.
     */
    function loadImageBase64(mediaType, content) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            const eventListeners = new EventListenerCollection();
            eventListeners.addEventListener(image, 'load', () => {
                eventListeners.removeAllEventListeners();
                resolve(image);
            }, false);
            eventListeners.addEventListener(image, 'error', () => {
                eventListeners.removeAllEventListeners();
                reject(new Error('Image failed to load'));
            }, false);
            image.src = `data:${mediaType};base64,${content}`;
        });
    }

    return {
        getImageMediaTypeFromFileName,
        loadImageBase64
    };
})();
