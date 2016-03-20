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

class Translator {
    constructor() {
        this.rules       = {};
        this.edict       = {};
        this.enamdict    = {};
        this.kanjidic    = {};
        this.initialized = false;
    }

    initialize(paths, callback) {
        if (this.initialized) {
            return;
        }

        const loaders = [];
        for (const key of ['rules', 'edict', 'enamdict', 'kanjidic']) {
            loaders.push(
                $.getJSON(chrome.extension.getURL(paths[key]))
            );
        }

        $.when.apply($, loaders).done((rules, edict, enamdict, kanjidic) => {
            this.rules    = rules;
            this.edict    = edict;
            this.enamdict = enamdict;
            this.kanjidic = kanjidic;

            this.initialized = true;

            if (callback) {
                callback();
            }
        });
    }
}

const trans = new Translator();

trans.initialize({
    rules:    'jp/data/rules.json',
    edict:    'jp/data/edict.json',
    enamdict: 'jp/data/enamdict.json',
    kanjidic: 'jp/data/kanjidic.json',
}, function() {
    alert('Loaded');
});
