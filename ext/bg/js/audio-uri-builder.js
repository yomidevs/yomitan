/*
 * Copyright (C) 2017-2020  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*global jpIsStringEntirelyKana*/

class AudioUriBuilder {
    constructor() {
        this._getUrlHandlers = new Map([
            ['jpod101', this._getUriJpod101.bind(this)],
            ['jpod101-alternate', this._getUriJpod101Alternate.bind(this)],
            ['jisho', this._getUriJisho.bind(this)],
            ['text-to-speech', this._getUriTextToSpeech.bind(this)],
            ['text-to-speech-reading', this._getUriTextToSpeechReading.bind(this)],
            ['custom', this._getUriCustom.bind(this)]
        ]);
    }

    normalizeUrl(url, baseUrl, basePath) {
        if (url) {
            if (url[0] === '/') {
                if (url.length >= 2 && url[1] === '/') {
                    // Begins with "//"
                    url = baseUrl.substring(0, baseUrl.indexOf(':') + 1) + url;
                } else {
                    // Begins with "/"
                    url = baseUrl + url;
                }
            } else if (!/^[a-z][a-z0-9\-+.]*:/i.test(url)) {
                // No URI scheme => relative path
                url = baseUrl + basePath + url;
            }
        }
        return url;
    }

    async getUri(mode, definition, options) {
        const handler = this._getUrlHandlers.get(mode);
        if (typeof handler === 'function') {
            try {
                return await handler(definition, options);
            } catch (e) {
                // NOP
            }
        }
        return null;
    }

    async _getUriJpod101(definition) {
        let kana = definition.reading;
        let kanji = definition.expression;

        if (!kana && jpIsStringEntirelyKana(kanji)) {
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
    }

    async _getUriJpod101Alternate(definition) {
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
                const reading = row.getElementsByClassName('dc-vocab_kana').item(0).textContent;
                if (url && reading && (!definition.reading || definition.reading === reading)) {
                    return this.normalizeUrl(url, 'https://www.japanesepod101.com', '/learningcenter/reference/');
                }
            } catch (e) {
                // NOP
            }
        }

        throw new Error('Failed to find audio URL');
    }

    async _getUriJisho(definition) {
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
                    return this.normalizeUrl(url, 'https://jisho.org', '/search/');
                }
            }
        } catch (e) {
            // NOP
        }

        throw new Error('Failed to find audio URL');
    }

    async _getUriTextToSpeech(definition, options) {
        const voiceURI = options.audio.textToSpeechVoice;
        if (!voiceURI) {
            throw new Error('No voice');
        }

        return `tts:?text=${encodeURIComponent(definition.expression)}&voice=${encodeURIComponent(voiceURI)}`;
    }

    async _getUriTextToSpeechReading(definition, options) {
        const voiceURI = options.audio.textToSpeechVoice;
        if (!voiceURI) {
            throw new Error('No voice');
        }

        return `tts:?text=${encodeURIComponent(definition.reading || definition.expression)}&voice=${encodeURIComponent(voiceURI)}`;
    }

    async _getUriCustom(definition, options) {
        const customSourceUrl = options.audio.customSourceUrl;
        return customSourceUrl.replace(/\{([^}]*)\}/g, (m0, m1) => (hasOwn(definition, m1) ? `${definition[m1]}` : m0));
    }
}
