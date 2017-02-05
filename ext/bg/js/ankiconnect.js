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
        this.asyncPools = {};
        this.localVersion = 1;
        this.remoteVersion = null;
    }

    addNote(note) {
        return this.checkVersion().then(() => this.ankiInvoke('addNote', {note}, null));
    }

    canAddNotes(notes) {
        return this.checkVersion().then(() => this.ankiInvoke('canAddNotes', {notes}, 'notes'));
    }

    getDeckNames() {
        return this.checkVersion().then(() => this.ankiInvoke('deckNames', {}, null));
    }

    getModelNames() {
        return this.checkVersion().then(() => this.ankiInvoke('modelNames', {}, null));
    }

    getModelFieldNames(modelName) {
        return this.checkVersion().then(() => this.ankiInvoke('modelFieldNames', {modelName}, null));
    }

    checkVersion() {
        if (this.localVersion === this.remoteVersion) {
            return Promise.resolve(true);
        }

        return this.ankiInvoke('version', {}, null).then(version => {
            this.remoteVersion = version;
            if (this.remoteVersion < this.localVersion) {
                return Promise.reject('extension and plugin versions incompatible');
            }
        });
    }

    ankiInvoke(action, params, pool) {
        return new Promise((resolve, reject) => {
            if (pool !== null && this.asyncPools.hasOwnProperty(pool)) {
                this.asyncPools[pool].abort();
            }

            const xhr = new XMLHttpRequest();
            xhr.addEventListener('loadend', () => {
                if (pool !== null) {
                    delete this.asyncPools[pool];
                }

                if (xhr.responseText) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject('unable to connect to plugin');
                }
            });

            xhr.open('POST', this.server);
            xhr.send(JSON.stringify({action, params}));
        });
    }
}
