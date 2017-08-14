/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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

    async checkVersion() {
        if (this.remoteVersion < this.localVersion) {
            this.remoteVersion = await this.ankiInvoke('version');
            if (this.remoteVersion < this.localVersion) {
                throw 'extension and plugin versions incompatible';
            }
        }
    }

    ankiInvoke(action, params) {
        return requestJson(this.server, 'POST', {action, params, version: this.localVersion});
    }
}

class AnkiNull {
    async addNote(note) {
        return null;
    }

    async canAddNotes(notes) {
        return [];
    }

    async getDeckNames() {
        return [];
    }

    async getModelNames() {
        return [];
    }

    async getModelFieldNames(modelName) {
        return [];
    }

    async guiBrowse(query) {
        return [];
    }
}
