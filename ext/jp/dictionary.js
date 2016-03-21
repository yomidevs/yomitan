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
        this.termDicts  = [];
        this.kanjiDicts = [];
    }

    addTermDict(termDict) {
        this.termDicts.push(termDict);
    }

    addKanjiDict(kanjiDict) {
        this.kanjiDicts.push(kanjiDict);
    }


    findTerm(term) {
        let results = [];
        for (let dict of this.termDicts) {
            results = results.concat(this.findTermInDict(term, dict));
        }

        return results;
    }

    findKanji(kanji) {
        const results = [];
        for (let dict of this.kanjiDicts) {
            const result = this.findKanjiInDict(kanji, dict);
            if (result !== null) {
                results.push(result);
            }
        }

        return results;
    }

    findTermInDict(term, dict) {
        return (dict.indices[term] || []).map(index => {
            const [e, r, g, t] = dict.defs[index];
            return {expression: e, reading: r, glossary: g, tags: t};
        });
    }

    findKanjiInDict(kanji, dict) {
        const def = dict.defs[kanji];
        if (def === null) {
            return null;
        }

        const [c, k, o, g] = def;
        return {character: c, kunyomi: k, onyomi: o, glossary: g};
    }
}
