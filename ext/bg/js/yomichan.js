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
        this.xhr        = null;

        this.setState('disabled');

        loadOptions((opts) => {
            this.setOptions(opts);

            chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
            chrome.browserAction.onClicked.addListener(this.onBrowserAction.bind(this));

            if (this.options.loadOnStartup) {
                this.setState('loading');
            }
        });
    }

    onMessage(request, sender, callback) {
        const {action, params} = request, handlers = {
            findKanji:  ({text}) => this.actionFindKanji(text, callback),
            findTerm:   ({text}) => this.actionFindTerm(text, callback),
            getOptions: () => callback(this.options),
            getState:   () => callback(this.state),
            renderText: ({data, template}) => callback(Handlebars.templates[template](data))
        };

        handlers[action].call(this, params);
        return true;
    }

    onBrowserAction(tab) {
        switch (this.state) {
            case 'disabled':
                this.setState('loading');
                break;
            case 'enabled':
                this.setState('disabled');
                break;
        }
    }

    setState(state) {
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
                this.translator.loadData(() => this.setState('enabled'));
                break;
        }

        Yomichan.notifyChange('state', this.state);
    }

    setOptions(options) {
        this.options = options;
        Yomichan.notifyChange('options', this.options);
    }

    actionFindTerm(text, callback) {
        const results = this.translator.findTerm(text);
        this.callAnkiApi('canAddNotes', results.results, (definitions) => {
            if (definitions !== null) {
                results.results = definitions;
            }

            callback(results);
        });
    }

    actionFindKanji(text, callback) {
        const results = this.translator.findKanji(text);
        this.callAnkiApi('cannAddNotes', results.results, (definitions) => {
            if (definitions !== null) {
                results.results = definitions;
            }

            callback(results);
        });
    }

    callAnkiApi(action, params, callback) {
        if (!this.options.enableAnkiConnect) {
            callback(null);
            return;
        }

        if (this.xhr !== null) {
            this.xhr.abort();
        }

        this.xhr = new XMLHttpRequest();
        this.xhr.addEventListener('loadend', () => {
            const resp = this.xhr.responseText;
            callback(resp ? JSON.parse(resp) : null);
            this.xhr = null;
        });

        this.xhr.open('POST', 'http://127.0.0.1:8888');
        this.xhr.withCredentials = true;
        this.xhr.setRequestHeader('Content-Type', 'text/json');
        this.xhr.send(JSON.stringify({action: action, params: params}));
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
