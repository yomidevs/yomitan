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


const audioUrlBuilders = {
    'jpod101': async (definition) => {
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

        return `https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?${params.join('&')}`;
    },
    'jpod101-alternate': async (definition) => {
        const response = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://www.japanesepod101.com/learningcenter/reference/dictionary_post');
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.addEventListener('error', () => reject(new Error('Failed to scrape audio data')));
            xhr.addEventListener('load', () => resolve(xhr.responseText));
            xhr.send(`post=dictionary_reference&match_type=exact&search_query=${encodeURIComponent(definition.expression)}`);
        });

        const dom = new DOMParser().parseFromString(response, 'text/html');
        for (const row of dom.getElementsByClassName('dc-result-row')) {
            try {
                const url = row.querySelector('audio>source[src]').getAttribute('src');
                const reading = row.getElementsByClassName('dc-vocab_kana').item(0).innerText;
                if (url && reading && (!definition.reading || definition.reading === reading)) {
                    return audioUrlNormalize(url, 'https://www.japanesepod101.com', '/learningcenter/reference/');
                }
            } catch (e) {
                // NOP
            }
        }

        throw new Error('Failed to find audio URL');
    },
    'jisho': async (definition) => {
        const response = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `https://jisho.org/search/${definition.expression}`);
            xhr.addEventListener('error', () => reject(new Error('Failed to scrape audio data')));
            xhr.addEventListener('load', () => resolve(xhr.responseText));
            xhr.send();
        });

        const dom = new DOMParser().parseFromString(response, 'text/html');
        try {
            const audio = dom.getElementById(`audio_${definition.expression}:${definition.reading}`);
            if (audio !== null) {
                const url = audio.getElementsByTagName('source').item(0).getAttribute('src');
                if (url) {
                    return audioUrlNormalize(url, 'https://jisho.org', '/search/');
                }
            }
        } catch (e) {
            // NOP
        }

        throw new Error('Failed to find audio URL');
    }
};

async function audioBuildUrl(definition, mode, optionsContext, cache={}) {
    const cacheKey = `${mode}:${definition.expression}`;
    if (cache.hasOwnProperty(cacheKey)) {
        return Promise.resolve(cache[cacheKey]);
    }

    if (audioUrlBuilders.hasOwnProperty(mode)) {
        const handler = audioUrlBuilders[mode];
        return handler(definition, optionsContext).then(
            (url) => {
                cache[cacheKey] = url;
                return url;
            },
            () => null);
    }
    return null;
}

function audioUrlNormalize(url, baseUrl, basePath) {
    if (url) {
        if (url[0] === '/') {
            if (url.length >= 2 && url[1] === '/') {
                // Begins with "//"
                url = baseUrl.substr(0, baseUrl.indexOf(':') + 1) + url;
            } else {
                // Begins with "/"
                url = baseUrl + url;
            }
        } else if (!/^[a-z][a-z0-9\+\-\.]*:/i.test(url)) {
            // No URI scheme => relative path
            url = baseUrl + basePath + url;
        }
    }
    return url;
}

function audioBuildFilename(definition) {
    if (definition.reading || definition.expression) {
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

async function audioInject(definition, fields, mode, optionsContext) {
    let usesAudio = false;
    for (const name in fields) {
        if (fields[name].includes('{audio}')) {
            usesAudio = true;
            break;
        }
    }

    if (!usesAudio) {
        return true;
    }

    try {
        let audioSourceDefinition = definition;
        if (definition.hasOwnProperty('expressions')) {
            audioSourceDefinition = definition.expressions[0];
        }

        const url = await audioBuildUrl(audioSourceDefinition, mode, optionsContext);
        const filename = audioBuildFilename(audioSourceDefinition);

        if (url && filename) {
            definition.audio = {url, filename};
        }

        return true;
    } catch (e) {
        return false;
    }
}
