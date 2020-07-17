/*
 * Copyright (C) 2016-2020  Yomichan Authors
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
 * requestJson
 */

class AnkiConnect {
    constructor(server) {
        this._enabled = false;
        this._server = server;
        this._localVersion = 2;
        this._remoteVersion = 0;
    }

    setServer(server) {
        this._server = server;
    }

    getServer() {
        return this._server;
    }

    setEnabled(enabled) {
        this._enabled = enabled;
    }

    isEnabled() {
        return this._enabled;
    }

    async addNote(note) {
        if (!this._enabled) { return null; }
        await this._checkVersion();
        return await this._invoke('addNote', {note});
    }

    async canAddNotes(notes) {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        return await this._invoke('canAddNotes', {notes});
    }

    async getDeckNames() {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        return await this._invoke('deckNames');
    }

    async getModelNames() {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        return await this._invoke('modelNames');
    }

    async getModelFieldNames(modelName) {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        return await this._invoke('modelFieldNames', {modelName});
    }

    async guiBrowse(query) {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        return await this._invoke('guiBrowse', {query});
    }

    async storeMediaFile(fileName, dataBase64) {
        if (!this._enabled) {
            throw new Error('AnkiConnect not enabled');
        }
        await this._checkVersion();
        return await this._invoke('storeMediaFile', {filename: fileName, data: dataBase64});
    }

    async findNoteIds(notes, duplicateScope) {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        const actions = notes.map((note) => {
            let query = (duplicateScope === 'deck' ? `"deck:${this._escapeQuery(note.deckName)}" ` : '');
            query += this._fieldsToQuery(note.fields);
            return {action: 'findNotes', params: {query}};
        });
        return await this._invoke('multi', {actions});
    }

    // Private

    async _checkVersion() {
        if (this._remoteVersion < this._localVersion) {
            this._remoteVersion = await this._invoke('version');
            if (this._remoteVersion < this._localVersion) {
                throw new Error('Extension and plugin versions incompatible');
            }
        }
    }

    async _invoke(action, params) {
        const result = await requestJson(this._server, 'POST', {action, params, version: this._localVersion}, true);
        if (isObject(result)) {
            const error = result.error;
            if (typeof error !== 'undefined') {
                throw new Error(`AnkiConnect error: ${error}`);
            }
        }
        return result;
    }

    _escapeQuery(text) {
        return text.replace(/"/g, '');
    }

    _fieldsToQuery(fields) {
        const fieldNames = Object.keys(fields);
        if (fieldNames.length === 0) {
            return '';
        }

        const key = fieldNames[0];
        return `"${key.toLowerCase()}:${this._escapeQuery(fields[key])}"`;
    }
}
