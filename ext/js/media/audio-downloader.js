/*
 * Copyright (C) 2017-2021  Yomichan Authors
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

/* global
 * JsonSchemaValidator
 * NativeSimpleDOMParser
 * SimpleDOMParser
 */

class AudioDownloader {
    constructor({japaneseUtil, requestBuilder}) {
        this._japaneseUtil = japaneseUtil;
        this._requestBuilder = requestBuilder;
        this._customAudioListSchema = null;
        this._schemaValidator = null;
        this._getInfoHandlers = new Map([
            ['jpod101', this._getInfoJpod101.bind(this)],
            ['jpod101-alternate', this._getInfoJpod101Alternate.bind(this)],
            ['jisho', this._getInfoJisho.bind(this)],
            ['text-to-speech', this._getInfoTextToSpeech.bind(this)],
            ['text-to-speech-reading', this._getInfoTextToSpeechReading.bind(this)],
            ['custom', this._getInfoCustom.bind(this)]
        ]);
    }

    async getTermAudioInfoList(source, term, reading, details) {
        const handler = this._getInfoHandlers.get(source);
        if (typeof handler === 'function') {
            try {
                return await handler(term, reading, details);
            } catch (e) {
                // NOP
            }
        }
        return [];
    }

    async downloadTermAudio(sources, preferredAudioIndex, term, reading, details) {
        for (const source of sources) {
            let infoList = await this.getTermAudioInfoList(source, term, reading, details);
            if (typeof preferredAudioIndex === 'number') {
                infoList = (preferredAudioIndex >= 0 && preferredAudioIndex < infoList.length ? [infoList[preferredAudioIndex]] : []);
            }
            for (const info of infoList) {
                switch (info.type) {
                    case 'url':
                        try {
                            return await this._downloadAudioFromUrl(info.url, source);
                        } catch (e) {
                            // NOP
                        }
                        break;
                }
            }
        }

        throw new Error('Could not download audio');
    }

    // Private

    _normalizeUrl(url, base) {
        return new URL(url, base).href;
    }

    async _getInfoJpod101(term, reading) {
        if (reading === term && this._japaneseUtil.isStringEntirelyKana(term)) {
            reading = term;
            term = null;
        }

        const params = new URLSearchParams();
        if (term) {
            params.set('kanji', term);
        }
        if (reading) {
            params.set('kana', reading);
        }

        const url = `https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?${params.toString()}`;
        return [{type: 'url', url}];
    }

    async _getInfoJpod101Alternate(term, reading) {
        const fetchUrl = 'https://www.japanesepod101.com/learningcenter/reference/dictionary_post';
        const data = new URLSearchParams({
            post: 'dictionary_reference',
            match_type: 'exact',
            search_query: term,
            vulgar: 'true'
        });
        const response = await this._requestBuilder.fetchAnonymous(fetchUrl, {
            method: 'POST',
            mode: 'cors',
            cache: 'default',
            credentials: 'omit',
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: data
        });
        const responseText = await response.text();

        const dom = this._createSimpleDOMParser(responseText);
        for (const row of dom.getElementsByClassName('dc-result-row')) {
            try {
                const audio = dom.getElementByTagName('audio', row);
                if (audio === null) { continue; }

                const source = dom.getElementByTagName('source', audio);
                if (source === null) { continue; }

                let url = dom.getAttribute(source, 'src');
                if (url === null) { continue; }

                const htmlReadings = dom.getElementsByClassName('dc-vocab_kana');
                if (htmlReadings.length === 0) { continue; }

                const htmlReading = dom.getTextContent(htmlReadings[0]);
                if (htmlReading && (reading === term || reading === htmlReading)) {
                    url = this._normalizeUrl(url, response.url);
                    return [{type: 'url', url}];
                }
            } catch (e) {
                // NOP
            }
        }

        throw new Error('Failed to find audio URL');
    }

    async _getInfoJisho(term, reading) {
        const fetchUrl = `https://jisho.org/search/${term}`;
        const response = await this._requestBuilder.fetchAnonymous(fetchUrl, {
            method: 'GET',
            mode: 'cors',
            cache: 'default',
            credentials: 'omit',
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
        });
        const responseText = await response.text();

        const dom = this._createSimpleDOMParser(responseText);
        try {
            const audio = dom.getElementById(`audio_${term}:${reading}`);
            if (audio !== null) {
                const source = dom.getElementByTagName('source', audio);
                if (source !== null) {
                    let url = dom.getAttribute(source, 'src');
                    if (url !== null) {
                        url = this._normalizeUrl(url, response.url);
                        return [{type: 'url', url}];
                    }
                }
            }
        } catch (e) {
            // NOP
        }

        throw new Error('Failed to find audio URL');
    }

    async _getInfoTextToSpeech(term, reading, {textToSpeechVoice}) {
        if (!textToSpeechVoice) {
            throw new Error('No voice');
        }
        return [{type: 'tts', text: term, voice: textToSpeechVoice}];
    }

    async _getInfoTextToSpeechReading(term, reading, {textToSpeechVoice}) {
        if (!textToSpeechVoice) {
            throw new Error('No voice');
        }
        return [{type: 'tts', text: reading, voice: textToSpeechVoice}];
    }

    async _getInfoCustom(term, reading, {customSourceUrl, customSourceType}) {
        if (typeof customSourceUrl !== 'string') {
            throw new Error('No custom URL defined');
        }
        const data = {term, reading};
        const url = customSourceUrl.replace(/\{([^}]*)\}/g, (m0, m1) => (Object.prototype.hasOwnProperty.call(data, m1) ? `${data[m1]}` : m0));

        switch (customSourceType) {
            case 'json':
                return await this._getInfoCustomJson(url);
            default:
                return [{type: 'url', url}];
        }
    }

    async _getInfoCustomJson(url) {
        const response = await this._requestBuilder.fetchAnonymous(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'default',
            credentials: 'omit',
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
        });

        if (!response.ok) {
            throw new Error(`Invalid response: ${response.status}`);
        }

        const responseJson = await response.json();

        const schema = await this._getCustomAudioListSchema();
        if (this._schemaValidator === null) {
            this._schemaValidator = new JsonSchemaValidator();
        }
        this._schemaValidator.validate(responseJson, schema);

        const results = [];
        for (const {url: url2, name} of responseJson.audioSources) {
            const info = {type: 'url', url: url2};
            if (typeof name === 'string') { info.name = name; }
            results.push(info);
        }
        return results;
    }

    async _downloadAudioFromUrl(url, source) {
        const response = await this._requestBuilder.fetchAnonymous(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'default',
            credentials: 'omit',
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
        });

        if (!response.ok) {
            throw new Error(`Invalid response: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        if (!await this._isAudioBinaryValid(arrayBuffer, source)) {
            throw new Error('Could not retrieve audio');
        }

        const data = this._arrayBufferToBase64(arrayBuffer);
        const contentType = response.headers.get('Content-Type');
        return {data, contentType};
    }

    async _isAudioBinaryValid(arrayBuffer, source) {
        switch (source) {
            case 'jpod101':
            {
                const digest = await this._arrayBufferDigest(arrayBuffer);
                switch (digest) {
                    case 'ae6398b5a27bc8c0a771df6c907ade794be15518174773c58c7c7ddd17098906': // Invalid audio
                        return false;
                    default:
                        return true;
                }
            }
            default:
                return true;
        }
    }

    async _arrayBufferDigest(arrayBuffer) {
        const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(arrayBuffer)));
        let digest = '';
        for (const byte of hash) {
            digest += byte.toString(16).padStart(2, '0');
        }
        return digest;
    }

    _arrayBufferToBase64(arrayBuffer) {
        return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    }

    _createSimpleDOMParser(content) {
        if (typeof NativeSimpleDOMParser !== 'undefined' && NativeSimpleDOMParser.isSupported()) {
            return new NativeSimpleDOMParser(content);
        } else if (typeof SimpleDOMParser !== 'undefined' && SimpleDOMParser.isSupported()) {
            return new SimpleDOMParser(content);
        } else {
            throw new Error('DOM parsing not supported');
        }
    }

    async _getCustomAudioListSchema() {
        let schema = this._customAudioListSchema;
        if (schema === null) {
            const url = chrome.runtime.getURL('/data/schemas/custom-audio-list-schema.json');
            const response = await fetch(url, {
                method: 'GET',
                mode: 'no-cors',
                cache: 'default',
                credentials: 'omit',
                redirect: 'follow',
                referrerPolicy: 'no-referrer'
            });
            schema = await response.json();
            this._customAudioListSchema = schema;
        }
        return schema;
    }
}
