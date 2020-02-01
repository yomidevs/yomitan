/*
 * Copyright (C) 2016-2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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

/*global requestJson*/

/*
 * AnkiConnect
 */

class AnkiConnect {
    constructor(server) {
        this.server = server;
        this.localVersion = 2;
        this.remoteVersion = 0;
    }

    async addNote(note) {
        await this.checkVersion();
        return await this.ankiInvoke('addNote', {note});
    }

    async canAddNotes(notes) {
        await this.checkVersion();
        return await this.ankiInvoke('canAddNotes', {notes});
    }

    async getDeckNames() {
        await this.checkVersion();
        return await this.ankiInvoke('deckNames');
    }

    async getModelNames() {
        await this.checkVersion();
        return await this.ankiInvoke('modelNames');
    }

    async getModelFieldNames(modelName) {
        await this.checkVersion();
        return await this.ankiInvoke('modelFieldNames', {modelName});
    }

    async guiBrowse(query) {
        await this.checkVersion();
        return await this.ankiInvoke('guiBrowse', {query});
    }

    async storeMediaFile(filename, dataBase64) {
        await this.checkVersion();
        return await this.ankiInvoke('storeMediaFile', {filename, data: dataBase64});
    }

    async checkVersion() {
        if (this.remoteVersion < this.localVersion) {
            this.remoteVersion = await this.ankiInvoke('version');
            if (this.remoteVersion < this.localVersion) {
                throw new Error('Extension and plugin versions incompatible');
            }
        }
    }

    async findNoteIds(notes) {
        await this.checkVersion();
        const actions = notes.map((note) => ({
            action: 'findNotes',
            params: {
                query: `deck:"${AnkiConnect.escapeQuery(note.deckName)}" ${AnkiConnect.fieldsToQuery(note.fields)}`
            }
        }));
        return await this.ankiInvoke('multi', {actions});
    }

    ankiInvoke(action, params) {
        return requestJson(this.server, 'POST', {action, params, version: this.localVersion});
    }

    static escapeQuery(text) {
        return text.replace(/"/g, '');
    }

    static fieldsToQuery(fields) {
        const fieldNames = Object.keys(fields);
        if (fieldNames.length === 0) {
            return '';
        }

        const key = fieldNames[0];
        return `${key.toLowerCase()}:"${AnkiConnect.escapeQuery(fields[key])}"`;
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
