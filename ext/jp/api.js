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


function onFindTerm({term}) {
    return window.trans.findTerm(term);
}

function onMessage(request, sender, callback) {
    const {action, data} = request;

    const handler = {
        findTerm: onFindTerm
    }[action];

    if (handler !== null) {
        const result = handler(data);
        if (callback !== null) {
            callback(result);
        }
    }
}

function onInit() {
    chrome.runtime.onMessage.addListener(onMessage);

    const res1 = window.trans.findTerm('食べられない');
    const res2 = window.trans.findTerm('作られている');
}

(() => {
    const res =  {
        rules:    'jp/data/rules.json',
        edict:    'jp/data/edict.json',
        enamdict: 'jp/data/enamdict.json',
        kanjidic: 'jp/data/kanjidic.json'
    };

    window.trans = new Translator(res, onInit);
})();
