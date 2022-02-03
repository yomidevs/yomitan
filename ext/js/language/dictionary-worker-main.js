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

/* global
 * DictionaryWorkerHandler
 */

self.importScripts(
    '/lib/jszip.min.js',
    '/js/core.js',
    '/js/data/database.js',
    '/js/data/json-schema.js',
    '/js/general/cache-map.js',
    '/js/language/dictionary-database.js',
    '/js/language/dictionary-importer.js',
    '/js/language/dictionary-worker-handler.js',
    '/js/language/dictionary-worker-media-loader.js',
    '/js/media/media-util.js'
);

(() => {
    try {
        const dictionaryWorkerHandler = new DictionaryWorkerHandler();
        dictionaryWorkerHandler.prepare();
    } catch (e) {
        log.error(e);
    }
})();
