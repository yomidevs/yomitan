/*
 * Copyright (C) 2020-2022  Yomichan Authors
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
 * ArrayBufferUtil
 */

/**
 * A callback used when a media file has been loaded.
 * @callback DisplayContentManager.OnLoadCallback
 * @param {string} url The URL of the media that was loaded.
 */

/**
 * A callback used when a media file should be unloaded.
 * @callback DisplayContentManager.OnUnloadCallback
 * @param {boolean} fullyLoaded Whether or not the media was fully loaded.
 */

/**
 * The content manager which is used when generating HTML display content.
 */
class DisplayContentManager {
    /**
     * Creates a new instance of the class.
     * @param {Display} display The display instance that owns this object.
     */
    constructor(display) {
        this._display = display;
        this._token = {};
        this._mediaCache = new Map();
        this._loadMediaData = [];
        this._eventListeners = new EventListenerCollection();
    }

    /**
     * Attempts to load the media file from a given dictionary.
     * @param {string} path The path to the media file in the dictionary.
     * @param {string} dictionary The name of the dictionary.
     * @param {DisplayContentManager.OnLoadCallback} onLoad The callback that is executed if the media was loaded successfully.
     *   No assumptions should be made about the synchronicity of this callback.
     * @param {DisplayContentManager.OnUnloadCallback} onUnload The callback that is executed when the media should be unloaded.
     */
    loadMedia(path, dictionary, onLoad, onUnload) {
        this._loadMedia(path, dictionary, onLoad, onUnload);
    }

    /**
     * Unloads all media that has been loaded.
     */
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

        this._eventListeners.removeAllEventListeners();
    }

    /**
     * Sets up attributes and events for a link element.
     * @param {Element} element The link element.
     * @param {string} href The URL.
     * @param {boolean} internal Whether or not the URL is an internal or external link.
     */
    prepareLink(element, href, internal) {
        element.href = href;
        if (!internal) {
            element.target = '_blank';
            element.rel = 'noreferrer noopener';
        }
        this._eventListeners.addEventListener(element, 'click', this._onLinkClick.bind(this));
    }

    async _loadMedia(path, dictionary, onLoad, onUnload) {
        const token = this._token;
        const data = {onUnload, loaded: false};

        this._loadMediaData.push(data);

        const media = await this._getMedia(path, dictionary);
        if (token !== this._token) { return; }

        onLoad(media.url);
        data.loaded = true;
    }

    async _getMedia(path, dictionary) {
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
            const buffer = ArrayBufferUtil.base64ToArrayBuffer(data.content);
            const blob = new Blob([buffer], {type: data.mediaType});
            const url = URL.createObjectURL(blob);
            cachedData.data = data;
            cachedData.url = url;
        }
        return cachedData;
    }

    _onLinkClick(e) {
        const {href} = e.currentTarget;
        if (typeof href !== 'string') { return; }

        const baseUrl = new URL(location.href);
        const url = new URL(href, baseUrl);
        const internal = (url.protocol === baseUrl.protocol && url.host === baseUrl.host);
        if (!internal) { return; }

        e.preventDefault();

        const params = {};
        for (const [key, value] of url.searchParams.entries()) {
            params[key] = value;
        }
        this._display.setContent({
            historyMode: 'new',
            focus: false,
            params,
            state: null,
            content: null
        });
    }
}
