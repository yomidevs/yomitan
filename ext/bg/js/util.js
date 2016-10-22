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


function kanjiLinks(options) {
    let result = '';
    for (const c of options.fn(this)) {
        if (isKanji(c)) {
            result += Handlebars.templates['kanji-link.html']({kanji: c}).trim();
        } else {
            result += c;
        }
    }

    return result;
}

function isKanji(c) {
    const code = c.charCodeAt(0);
    return code >= 0x4e00 && code < 0x9fb0 || code >= 0x3400 && code < 0x4dc0;
}

function promiseCallback(promise, callback) {
    return promise.then(result => {
       callback({result});
    }).catch(error => {
        callback({error});
    });
}

function loadJson(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load', () => resolve(JSON.parse(xhr.responseText)));
        xhr.open('GET', chrome.extension.getURL(url));
        xhr.send();
    });
}

function sortTags(tags) {
    return tags.sort((v1, v2) => {
        const order1 = v1.order;
        const order2 = v2.order;
        if (order1 < order2) {
            return -1;
        } else if (order1 > order2) {
            return 1;
        }

        const name1 = v1.name;
        const name2 = v2.name;
        if (name1 < name2) {
            return -1;
        } else if (name1 > name2) {
            return 1;
        }

        return 0;
    });
}

function sortTermDefs(definitions) {
    return definitions.sort((v1, v2) => {
        const sl1 = v1.source.length;
        const sl2 = v2.source.length;
        if (sl1 > sl2) {
            return -1;
        } else if (sl1 < sl2) {
            return 1;
        }

        const s1 = v1.score;
        const s2 = v2.score;
        if (s1 > s2) {
            return -1;
        } else if (s1 < s2) {
            return 1;
        }

        const rl1 = v1.rules.length;
        const rl2 = v2.rules.length;
        if (rl1 < rl2) {
            return -1;
        } else if (rl1 > rl2) {
            return 1;
        }

        return v2.expression.localeCompare(v1.expression);
    });
}

function applyTagMeta(tag, meta) {
    const symbol = tag.name.split(':')[0];
    for (const prop in meta[symbol] || {}) {
        tag[prop] = meta[symbol][prop];
    }

    return tag;
}

function splitField(field) {
    return field.length === 0 ? [] : field.split(' ');
}
