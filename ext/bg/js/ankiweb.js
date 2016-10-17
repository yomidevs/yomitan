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

class AnkiWeb {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.noteInfo = null;
    }

    addNote(note) {
        return Promise.resolve(true);
    }

    canAddNotes(notes) {
        return Promise.resolve([]);
    }

    getDeckNames() {
        return this.retrieve().then(info => info.deckNames);
    }

    getModelNames() {
        return this.retrieve().then(info => info.models.map(m => m.name));
    }

    getModelFieldNames(modelName) {
        return this.retrieve().then(info => {
            const model = info.models.find(m => m.name === modelName);
            return model ? model.fields : [];
        });
    }

    retrieve() {
        if (this.noteInfo !== null) {
            return Promise.resolve(this.noteInfo);
        }

        return AnkiWeb.scrape(this.username, this.password).then(({deckNames, models}) => {
            this.noteInfo = {deckNames, models};
            return this.noteInfo;
        });
    }

    static scrape(username, password) {
        return AnkiWeb.loadAccountPage('https://ankiweb.net/edit/', 'GET', null, username, password).then(response => {
            const modelsMatch = /editor\.models = (.*}]);/.exec(response);
            if (modelsMatch === null) {
                return Promise.reject('failed to scrape model data');
            }

            const decksMatch = /editor\.decks = (.*}});/.exec(response);
            if (decksMatch === null) {
                return Promise.reject('failed to scrape deck data');
            }

            const modelsJson = JSON.parse(modelsMatch[1]);
            const decksJson = JSON.parse(decksMatch[1]);

            const deckNames = Object.keys(decksJson).map(d => decksJson[d].name);
            const models = [];
            for (const modelJson of modelsJson) {
                models.push({
                    name: modelJson.name,
                    id: modelJson.id,
                    fields: modelJson.flds.map(f => f.name)
                });
            }

            return {deckNames, models};
        });
    }

    static login(username, password) {
        if (username.length === 0 || password.length === 0) {
            return Promise.reject('unspecified login credentials');
        }

        const form = new FormData();
        form.append('username', username);
        form.append('password', password);
        form.append('submitted', 1);

        return AnkiWeb.loadPage('https://ankiweb.net/account/login', 'POST', form).then(response => {
            if (!response.includes('class="mitem"')) {
                return Promise.reject('failed to authenticate');
            }
        });
    }

    static loadAccountPage(url, method, form, username, password) {
        return AnkiWeb.loadPage(url, method, form).then(response => {
            if (response.includes('name="password"')) {
                return AnkiWeb.login(username, password).then(() => AnkiWeb.loadPage(url, method, form));
            } else {
                return response;
            }
        });
    }

    static loadPage(url, method, form) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('error', () => reject('failed to execute request'));
            xhr.addEventListener('load', () => resolve(xhr.responseText));
            xhr.open(method, url);
            xhr.send(form);
        });
    }
}
