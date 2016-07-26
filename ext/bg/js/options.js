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
        scanLength:          20,
        activateOnStartup:   false,
        selectMatchedText:   true,
        loadEnamDict:        false,
        enableAudioPlayback: true,
        enableAnkiConnect:   false,
        ankiCardTags:        ['yomichan'],
        sentenceExtent:      200,
        ankiVocabDeck:       '',
        ankiVocabModel:      '',
        ankiVocabFields:     {},
        ankiKanjiDeck:       '',
        ankiKanjiModel:      '',
        ankiKanjiFields:     {}
    };

    for (let key in defaults) {
        if (!options.hasOwnProperty(key)) {
            options[key] = defaults[key];
        }
    }

    options.scanLength = parseInt(options.scanLength);

    return options;
}

function loadOptions(callback) {
    chrome.storage.sync.get(null, (items) => callback(sanitizeOptions(items)));
}

function saveOptions(opts, callback) {
    chrome.storage.sync.set(sanitizeOptions(opts), callback);
}
