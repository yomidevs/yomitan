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

        this.translator = new Translator();
        this.updateState('disabled');

        loadOptions((opts) => {
            this.updateOptions(opts);

            chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
            chrome.browserAction.onClicked.addListener(this.onBrowserAction.bind(this));
        });
    }

    onMessage(request, sender, callback) {
        const {action, data} = request;
        const handlers = {
            findKanji:  ({text}) => this.translator.onFindKanji(text),
            findTerm:   ({text}) => this.translator.findTerm(text),
            getState:   () => this.state,
            getOptions: () => this.options,
            renderText: ({data, template}) => Handlebars.templates[template](data)
        };

        const result = handlers[action].call(this, data);
        if (callback !== null) {
            callback(result);
        }
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

    static notifyChange(name, value) {
        chrome.tabs.query({}, (tabs) => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, {name: name, value: value}, () => null);
            }
        });
    }
}

window.yomichan = new Yomichan();
