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
        this.translator = new Translator();
        this.res = {
            rules:    'jp/data/rules.json',
            edict:    'jp/data/edict.json',
            enamdict: 'jp/data/enamdict.json',
            kanjidic: 'jp/data/kanjidic.json'
        };

        this.updateState('disabled');

        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
        chrome.browserAction.onClicked.addListener(this.onBrowserAction.bind(this));
    }

    onFindTerm({term}) {
        return this.translator.findTerm(term);
    }

    onMessage(request, sender, callback) {
        const {action, data} = request;
        const handler = {
            findTerm: this.onFindTerm
        }[action];

        if (handler !== null) {
            const result = handler.call(this, data);
            if (callback !== null) {
                callback(result);
            }
        }
    }

    onBrowserAction(tab) {
        switch (this.state) {
            case 'disabled':
                this.updateState('loading');
                this.translator.loadData(this.res, () => this.updateState('enabled'));
                break;
            case 'enabled':
                this.updateState('disabled');
                break;
        }
    }

    updateState(state) {
        const text = {'disabled': '', 'enabled': 'on', 'loading': '...'}[state];
        chrome.browserAction.setBadgeText({text: text});
        this.state = state;
    }
}

window.yomichan = new Yomichan();
