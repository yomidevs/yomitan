/*
 * Copyright (C) 2020-2021  Yomichan Authors
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

class MediaLoader {
    constructor() {
        this._token = {};
        this._mediaCache = new Map();
        this._loadMediaData = [];
    }

    async loadMedia(path, dictionary, onLoad, onUnload) {
        const token = this._token;
        const data = {onUnload, loaded: false};

        this._loadMediaData.push(data);

        const media = await this.getMedia(path, dictionary);
        if (token !== this._token) { return; }

        onLoad(media.url);
        data.loaded = true;
    }

    unloadAll() {
        for (const {onUnload, loaded} of this._loadMediaData) {
            if (typeof onUnload === 'function') {
                onUnload(loaded);
            }
        }
        this._loadMediaData = [];

        for (const map of this._mediaCache.values()) {
            for (const {url} of map.values()) {
                if (url !== null) {
                    URL.revokeObjectURL(url);
                }
            }
        }
        this._mediaCache.clear();

        this._token = {};
    }

    async getMedia(path, dictionary) {
        let cachedData;
        let dictionaryCache = this._mediaCache.get(dictionary);
        if (typeof dictionaryCache !== 'undefined') {
            cachedData = dictionaryCache.get(path);
        } else {
            dictionaryCache = new Map();
            this._mediaCache.set(dictionary, dictionaryCache);
        }

        if (typeof cachedData === 'undefined') {
            cachedData = {
                promise: null,
                data: null,
                url: null
            };
            dictionaryCache.set(path, cachedData);
            cachedData.promise = this._getMediaData(path, dictionary, cachedData);
        }

        return cachedData.promise;
    }

    async _getMediaData(path, dictionary, cachedData) {
        const token = this._token;
        const data = (await yomichan.api.getMedia([{path, dictionary}]))[0];
        if (token === this._token && data !== null) {
            const blob = MediaUtil.createBlobFromBase64Content(data.content, data.mediaType);
            const url = URL.createObjectURL(blob);
            cachedData.data = data;
            cachedData.url = url;
        }
        return cachedData;
    }
}
