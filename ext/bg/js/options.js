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


function sanitizeOptions(options) {
    const defaults = {
        activateOnStartup: true,
        enableAudioPlayback: true,
        enableSoftKatakanaSearch: true,
        showAdvancedOptions: false,
        selectMatchedText: true,
        holdShiftToScan: true,
        scanDelay: 15,
        scanLength: 20,

        dictionaries: {},

        ankiMethod: 'disabled',
        ankiUsername: '',
        ankiPassword: '',
        ankiCardTags: ['yomichan'],
        sentenceExtent: 200,

        ankiTermDeck: '',
        ankiTermModel: '',
        ankiTermFields: {},
        ankiKanjiDeck: '',
        ankiKanjiModel: '',
        ankiKanjiFields: {}
    };

    for (const key in defaults) {
        if (!(key in options)) {
            options[key] = defaults[key];
        }
    }

    return options;
}

function loadOptions() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(null, opts => {
            resolve(sanitizeOptions(opts));
        });
    });
}

function saveOptions(opts) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set(sanitizeOptions(opts), resolve);
    });
}
