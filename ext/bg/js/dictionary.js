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


class Dictionary {
    constructor() {
        this.termDicts  = {};
        this.kanjiDicts = {};
    }

    addTermDict(name, dict) {
        this.termDicts[name] = dict;
    }

    addKanjiDict(name, dict) {
        this.kanjiDicts[name] = dict;
    }

    findTerm(term) {
        let results = [];

        for (let name in this.termDicts) {
            const dict    = this.termDicts[name];
            const indices = dict.indices[term] || [];

            results = results.concat(
                indices.map(index => {
                    const [e, r, t, ...g] = dict.defs[index];
                    const addons          = [];
                    const tags            = t.split(' ');

                    //
                    // TODO: Handle addons through data.
                    //

                    for (let tag of tags) {
                        if (tag.startsWith('v5') && tag !== 'v5') {
                            addons.push('v5');
                        } else if (tag.startsWith('vs-')) {
                            addons.push('vs');
                        }
                    }

                    return {
                        id:         index,
                        expression: e,
                        reading:    r,
                        glossary:   g,
                        tags:       tags.concat(addons),
                        addons:     addons
                    };
                })
            );
        }

        return results;
    }

    findKanji(kanji) {
        const results = [];

        for (let name in this.kanjiDicts) {
            const def = this.kanjiDicts[name][kanji];
            if (def) {
                const [k, o, g] = def;
                results.push({
                    character: kanji,
                    kunyomi:   k.split(' '),
                    onyomi:    o.split(' '),
                    glossary:  g
                });
            }
        }

        return results;
    }
}
