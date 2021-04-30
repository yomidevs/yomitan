/*
 * Copyright (C) 2016-2021  Yomichan Authors
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
 * AnkiUtil
 */

class AnkiConnect {
    constructor() {
        this._enabled = false;
        this._server = null;
        this._localVersion = 2;
        this._remoteVersion = 0;
        this._versionCheckPromise = null;
    }

    get server() {
        return this._server;
    }

    set server(value) {
        this._server = value;
    }

    get enabled() {
        return this._enabled;
    }

    set enabled(value) {
        this._enabled = value;
    }

    async isConnected() {
        try {
            await this._invoke('version');
            return true;
        } catch (e) {
            return false;
        }
    }

    async getVersion() {
        if (!this._enabled) { return null; }
        await this._checkVersion();
        return await this._invoke('version', {});
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

    async notesInfo(notes) {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        return await this._invoke('notesInfo', {notes});
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

    async guiBrowseNote(noteId) {
        return await this.guiBrowse(`nid:${noteId}`);
    }

    async storeMediaFile(fileName, dataBase64) {
        if (!this._enabled) {
            throw new Error('AnkiConnect not enabled');
        }
        await this._checkVersion();
        return await this._invoke('storeMediaFile', {filename: fileName, data: dataBase64});
    }

    async findNoteIds(notes) {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        const actions = notes.map((note) => {
            let query = '';
            switch (this._getDuplicateScopeFromNote(note)) {
                case 'deck':
                    query = `"deck:${this._escapeQuery(note.deckName)}" `;
                    break;
                case 'deck-root':
                    query = `"deck:${this._escapeQuery(AnkiUtil.getRootDeckName(note.deckName))}" `;
                    break;
            }
            query += this._fieldsToQuery(note.fields);
            return {action: 'findNotes', params: {query}};
        });
        return await this._invoke('multi', {actions});
    }

    async suspendCards(cardIds) {
        if (!this._enabled) { return false; }
        await this._checkVersion();
        return await this._invoke('suspend', {cards: cardIds});
    }

    async findCards(query) {
        if (!this._enabled) { return []; }
        await this._checkVersion();
        return await this._invoke('findCards', {query});
    }

    async findCardsForNote(noteId) {
        return await this.findCards(`nid:${noteId}`);
    }

    // Private

    async _checkVersion() {
        if (this._remoteVersion < this._localVersion) {
            if (this._versionCheckPromise === null) {
                const promise = this._invoke('version');
                promise
                    .catch(() => {})
                    .finally(() => { this._versionCheckPromise = null; });
                this._versionCheckPromise = promise;
            }
            this._remoteVersion = await this._versionCheckPromise;
            if (this._remoteVersion < this._localVersion) {
                throw new Error('Extension and plugin versions incompatible');
            }
        }
    }

    async _invoke(action, params) {
        let response;
        try {
            response = await fetch(this._server, {
                method: 'POST',
                mode: 'cors',
                cache: 'default',
                credentials: 'omit',
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
                body: JSON.stringify({action, params, version: this._localVersion})
            });
        } catch (e) {
            const error = new Error('Anki connection failure');
            error.data = {action, params};
            throw error;
        }

        if (!response.ok) {
            const error = new Error(`Anki connection error: ${response.status}`);
            error.data = {action, params, status: response.status};
            throw error;
        }

        let responseText = null;
        let result;
        try {
            responseText = await response.text();
            result = JSON.parse(responseText);
        } catch (e) {
            const error = new Error('Invalid Anki response');
            error.data = {action, params, status: response.status, responseText};
            throw error;
        }

        if (isObject(result)) {
            const apiError = result.error;
            if (typeof apiError !== 'undefined') {
                const error = new Error(`Anki error: ${apiError}`);
                error.data = {action, params, status: response.status, apiError};
                throw error;
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

    _getDuplicateScopeFromNote(note) {
        const {options} = note;
        if (typeof options === 'object' && options !== null) {
            const {duplicateScope} = options;
            if (typeof duplicateScope !== 'undefined') {
                return duplicateScope;
            }
        }
        return null;
    }
}
