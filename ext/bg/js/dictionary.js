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
        this.terms       = [];
        this.termIndices = {};

        this.kanji        = [];
        this.kanjiIndices = {};
    }

    addTermData(terms) {
        let index = this.terms.length;
        for (const [e, r, g, t] of terms) {
            this.storeIndex(this.termIndices, e, index);
            this.storeIndex(this.termIndices, r, index++);
            this.terms.push([e, r, g, t]);
        }
    }

    addKanjiData(kanji) {
        let index = this.kanji.length;
        for (const [c, k, o, g] of kanji) {
            this.storeIndex(this.kanjiIndices, c, index++);
            this.kanji.push([c, k, o, g]);
        }
    }

    findTerm(term) {
        return (this.termIndices[term] || []).map(index => {
            const [e, r, g, t] = this.terms[index];
            return {id: index, expression: e, reading: r, glossary: g, tags: t.split(' ')};
        });
    }

    findKanji(kanji) {
        return (this.kanjiIndices[kanji] || []).map(index => {
            const [c, k, o, g] = def;
            return {id: index, character: c, kunyomi: k, onyomi: o, glossary: g};
        });
    }

    storeIndex(indices, term, index) {
        if (term.length > 0) {
            const indices = this.termIndices[term] || [];
            indices.push(index);
            this.termIndices[term] = indices;
        }
    }
}
