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

const mediaUtility = (() => {
    function getFileNameExtension(path) {
        const match = /\.[^./\\]*$/.exec(path);
        return match !== null ? match[0] : '';
    }

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

    function loadImage(mediaType, content) {
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
        loadImage
    };
})();
