/*
 * Copyright (C) 2022  Yomichan Authors
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
 * A callback used when a media file has been loaded.
 * @callback AnkiTemplateRendererContentManager.OnLoadCallback
 * @param {string} url The URL of the media that was loaded.
 */

/**
 * A callback used when a media file should be unloaded.
 * @callback AnkiTemplateRendererContentManager.OnUnloadCallback
 * @param {boolean} fullyLoaded Whether or not the media was fully loaded.
 */

/**
 * The content manager which is used when generating content for Anki.
 */
class AnkiTemplateRendererContentManager {
    /**
     * Creates a new instance of the class.
     * @param {TemplateRendererMediaProvider} mediaProvider The media provider for the object.
     * @param {object} data The data object passed to the Handlebars template renderer.
     *   See {@link AnkiNoteDataCreator.create}'s return value for structure information.
     */
    constructor(mediaProvider, data) {
        this._mediaProvider = mediaProvider;
        this._data = data;
        this._onUnloadCallbacks = [];
    }

    /**
     * Attempts to load the media file from a given dictionary.
     * @param {string} path The path to the media file in the dictionary.
     * @param {string} dictionary The name of the dictionary.
     * @param {AnkiTemplateRendererContentManager.OnLoadCallback} onLoad The callback that is executed if the media was loaded successfully.
     *   No assumptions should be made about the synchronicity of this callback.
     * @param {AnkiTemplateRendererContentManager.OnUnloadCallback} onUnload The callback that is executed when the media should be unloaded.
     */
    loadMedia(path, dictionary, onLoad, onUnload) {
        const imageUrl = this._mediaProvider.getMedia(this._data, ['dictionaryMedia', path], {dictionary, format: 'fileName', default: null});
        if (imageUrl === null) { return; }
        onLoad(imageUrl);
        if (typeof onUnload === 'function') {
            this._onUnloadCallbacks.push(onUnload);
        }
    }

    /**
     * Unloads all media that has been loaded.
     */
    unloadAll() {
        for (const onUnload of this._onUnloadCallbacks) {
            onUnload(true);
        }
        this._onUnloadCallbacks = [];
    }

    /**
     * Sets up attributes and events for a link element.
     * @param {Element} element The link element.
     * @param {string} href The URL.
     * @param {boolean} internal Whether or not the URL is an internal or external link.
     */
    prepareLink(element, href, internal) {
        element.href = internal ? '#' : href;
    }
}
