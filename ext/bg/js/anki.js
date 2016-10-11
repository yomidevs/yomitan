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
    constructor(apiVersion) {
        this.asyncPools = {};
        this.apiVersion = apiVersion;
        this.ankiConnectVer = 0;
    }

    addNote(note) {
        return this.ankiInvokeSafe('addNote', {note}, null);
    }

    canAddNotes(notes) {
        return this.ankiInvokeSafe('canAddNotes', {notes}, 'notes');
    }

    getDeckNames() {
        return this.ankiInvokeSafe('deckNames', {}, null);
    }

    getModelNames() {
        return this.ankiInvokeSafe('modelNames', {}, null);
    }

    getModelFieldNames(modelName) {
        return this.ankiInvokeSafe('modelFieldNames', {modelName}, null);
    }

    getVersion() {
        return this.ankiInvoke('version', {}, null);
    }

    ankiInvokeSafe(action, params, pool) {
        if (this.ankiConnectVer === this.apiVersion) {
            return this.ankiInvoke(action, params, pool);
        }

        return this.getVersion().then(version => {
            if (version === this.apiVersion) {
                return this.ankiInvoke(action, params, pool);
            }

            return null;
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

                const resp = xhr.responseText;
                resolve(resp ? JSON.parse(resp) : null);
            });

            xhr.open('POST', 'http://127.0.0.1:8765');
            xhr.send(JSON.stringify({action, params}));
        });
    }
}
