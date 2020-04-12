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

/*
 * AnkiConnect
 */

class AnkiConnect {
    constructor(server) {
        this._server = server;
        this._localVersion = 2;
        this._remoteVersion = 0;
    }

    async addNote(note) {
        await this._checkVersion();
        return await this._ankiInvoke('addNote', {note});
    }

    async canAddNotes(notes) {
        await this._checkVersion();
        return await this._ankiInvoke('canAddNotes', {notes});
    }

    async getDeckNames() {
        await this._checkVersion();
        return await this._ankiInvoke('deckNames');
    }

    async getModelNames() {
        await this._checkVersion();
        return await this._ankiInvoke('modelNames');
    }

    async getModelFieldNames(modelName) {
        await this._checkVersion();
        return await this._ankiInvoke('modelFieldNames', {modelName});
    }

    async guiBrowse(query) {
        await this._checkVersion();
        return await this._ankiInvoke('guiBrowse', {query});
    }

    async storeMediaFile(filename, dataBase64) {
        await this._checkVersion();
        return await this._ankiInvoke('storeMediaFile', {filename, data: dataBase64});
    }

    async findNoteIds(notes) {
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


/*
 * AnkiNull
 */

class AnkiNull {
    async addNote() {
        return null;
    }

    async canAddNotes() {
        return [];
    }

    async getDeckNames() {
        return [];
    }

    async getModelNames() {
        return [];
    }

    async getModelFieldNames() {
        return [];
    }

    async guiBrowse() {
        return [];
    }

    async findNoteIds() {
        return [];
    }
}
