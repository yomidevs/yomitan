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
        return await this._ankiInvoke('addNote', {note});
    }

    async canAddNotes(notes) {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        return await this._ankiInvoke('canAddNotes', {notes});
    }

    async getDeckNames() {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        return await this._ankiInvoke('deckNames');
    }

    async getModelNames() {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        return await this._ankiInvoke('modelNames');
    }

    async getModelFieldNames(modelName) {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        return await this._ankiInvoke('modelFieldNames', {modelName});
    }

    async guiBrowse(query) {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        return await this._ankiInvoke('guiBrowse', {query});
    }

    async storeMediaFile(filename, dataBase64) {
        if (!this._enabled) {
            return {result: null, error: 'AnkiConnect not enabled'};
        }
        await this._checkVersion();
        return await this._ankiInvoke('storeMediaFile', {filename, data: dataBase64});
    }

    async findNoteIds(notes) {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        const actions = notes.map((note) => ({
            action: 'findNotes',
            params: {
                query: `deck:"${this._escapeQuery(note.deckName)}" ${this._fieldsToQuery(note.fields)}`
            }
        }));
        return await this._ankiInvoke('multi', {actions});
    }

    // Private

    async _checkVersion() {
        if (this._remoteVersion < this._localVersion) {
            this._remoteVersion = await this._ankiInvoke('version');
            if (this._remoteVersion < this._localVersion) {
                throw new Error('Extension and plugin versions incompatible');
            }
        }
    }

    _ankiInvoke(action, params) {
        return requestJson(this._server, 'POST', {action, params, version: this._localVersion});
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
        return `${key.toLowerCase()}:"${this._escapeQuery(fields[key])}"`;
    }
}
