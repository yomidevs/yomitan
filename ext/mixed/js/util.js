/*
 * Copyright (C) 2017  Alex Yatskov <alex@foosoft.net>
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


/*
 * Audio
 */

function audioBuildUrl(definition, mode, cache={}) {
    if (mode === 'jpod101') {
        let kana = definition.reading;
        let kanji = definition.expression;

        if (!kana && wanakana.isHiragana(kanji)) {
            kana = kanji;
            kanji = null;
        }

        const params = [];
        if (kanji) {
            params.push(`kanji=${encodeURIComponent(kanji)}`);
        }
        if (kana) {
            params.push(`kana=${encodeURIComponent(kana)}`);
        }

        const url = `https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?${params.join('&')}`;
        return Promise.resolve(url);
    } else if (mode === 'jpod101-alternate') {
        return new Promise((resolve, reject) => {
            const response = cache[definition.expression];
            if (response) {
                resolve(response);
            } else {
                const data = {
                    post: 'dictionary_reference',
                    match_type: 'exact',
                    search_query: definition.expression
                };

                const params = [];
                for (const key in data) {
                    params.push(`${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`);
                }

                const xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://www.japanesepod101.com/learningcenter/reference/dictionary_post');
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.addEventListener('error', () => reject('failed to scrape audio data'));
                xhr.addEventListener('load', () => {
                    cache[definition.expression] = xhr.responseText;
                    resolve(xhr.responseText);
                });

                xhr.send(params.join('&'));
            }
        }).then(response => {
            const dom = new DOMParser().parseFromString(response, 'text/html');
            for (const row of dom.getElementsByClassName('dc-result-row')) {
                try {
                    const url = row.getElementsByClassName('ill-onebuttonplayer').item(0).getAttribute('data-url');
                    const reading = row.getElementsByClassName('dc-vocab_kana').item(0).innerText;
                    if (url && reading && (!definition.reading || definition.reading === reading)) {
                        return url;
                    }
                } catch (e) {
                    // NOP
                }
            }
        });
    } else {
        return Promise.reject('unsupported audio source');
    }
}

function audioBuildFilename(definition) {
    if (definition.reading && definition.expression) {
        let filename = 'yomichan';
        if (definition.reading) {
            filename += `_${definition.reading}`;
        }
        if (definition.expression) {
            filename += `_${definition.expression}`;
        }

        return filename += '.mp3';
    }
}

function audioInject(definition, fields, mode) {
    if (mode === 'disabled') {
        return Promise.resolve(true);
    }

    const filename = audioBuildFilename(definition);
    if (!filename) {
        return Promise.resolve(true);
    }

    let usesAudio = false;
    for (const name in fields) {
        if (fields[name].includes('{audio}')) {
            usesAudio = true;
            break;
        }
    }

    if (!usesAudio) {
        return Promise.resolve(true);
    }

    return audioBuildUrl(definition, mode).then(url => {
        definition.audio = {url, filename};
        return true;
    }).catch(() => false);
}
