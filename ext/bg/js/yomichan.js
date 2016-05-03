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


class Yomichan {
    constructor() {
        Handlebars.partials = Handlebars.templates;
        Handlebars.registerHelper('kanjiLinks', function(options) {
            let result = '';
            for (const c of options.fn(this)) {
                if (Translator.isKanji(c)) {
                    result += Handlebars.templates['kanji-link.html']({kanji: c}).trim();
                } else {
                    result += c;
                }
            }

            return result;
        });

        this.translator = new Translator();
        this.updateState('disabled');

        loadOptions((opts) => {
            this.updateOptions(opts);

            chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
            chrome.browserAction.onClicked.addListener(this.onBrowserAction.bind(this));

            if (this.options.loadOnStartup) {
                this.updateState('loading');
            }
        });
    }

    onMessage(request, sender, callback) {
        const {action, data} = request, handlers = {
            findKanji:  ({text}) => this.findKanji(text, callback),
            findTerm:   ({text}) => this.findTerm(text, callback),
            getOptions: () => callback(this.options),
            getState:   () => callback(this.state),
            renderText: ({data, template}) => callback(Handlebars.templates[template](data))
        };

        handlers[action].call(this, data);
    }

    onBrowserAction(tab) {
        switch (this.state) {
            case 'disabled':
                this.updateState('loading');
                break;
            case 'enabled':
                this.updateState('disabled');
                break;
        }
    }

    updateState(state) {
        if (this.state === state) {
            return;
        }

        this.state = state;

        switch (state) {
            case 'disabled':
                chrome.browserAction.setBadgeText({text: ''});
                break;
            case 'enabled':
                chrome.browserAction.setBadgeText({text: 'on'});
                break;
            case 'loading':
                chrome.browserAction.setBadgeText({text: '...'});
                this.translator.loadData(() => this.updateState('enabled'));
                break;
        }

        Yomichan.notifyChange('state', this.state);
    }

    updateOptions(options) {
        this.options = options;
        Yomichan.notifyChange('options', this.options);
    }

    findTerm(text, callback) {
        const results = this.translator.findTerm(text);
        this.callAnkiApi('canAddNotes', results.results, (definitions) => {
            if (definitions !== null) {
                results.results = definitions;
            }

            callback(results);
        });
    }

    findKanji(text, callback) {
        const results = this.translator.findKanji(text);
        this.callAnkiApi('cannAddNotes', results.results, (definitions) => {
            if (definitions !== null) {
                results.results = definitions;
            }

            callback(results);
        });
    }

    callAnkiApi(action, data, callback) {
        if (this.options.enableAnkiConnect) {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('loadend', () => callback(xhr.responseText ? JSON.parse(xhr.responseText) : null));
            xhr.open('POST', 'http://127.0.0.1:8888');
            xhr.withCredentials = true;
            xhr.setRequestHeader('Content-Type', 'text/json');
            xhr.send(JSON.stringify({action: action, data: data}));
        } else {
            callback(null);
        }
    }

    static notifyChange(name, value) {
        chrome.tabs.query({}, (tabs) => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, {name: name, value: value}, () => null);
            }
        });
    }
}

window.yomichan = new Yomichan();
