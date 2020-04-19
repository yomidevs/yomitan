/*
 * Copyright (C) 2019-2020  Yomichan Authors
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

class TextToSpeechAudio {
    constructor(text, voice) {
        this.text = text;
        this.voice = voice;
        this._utterance = null;
        this._volume = 1;
    }

    get currentTime() {
        return 0;
    }
    set currentTime(value) {
        // NOP
    }

    get volume() {
        return this._volume;
    }
    set volume(value) {
        this._volume = value;
        if (this._utterance !== null) {
            this._utterance.volume = value;
        }
    }

    async play() {
        try {
            if (this._utterance === null) {
                this._utterance = new SpeechSynthesisUtterance(this.text || '');
                this._utterance.lang = 'ja-JP';
                this._utterance.volume = this._volume;
                this._utterance.voice = this.voice;
            }

            speechSynthesis.cancel();
            speechSynthesis.speak(this._utterance);
        } catch (e) {
            // NOP
        }
    }

    pause() {
        try {
            speechSynthesis.cancel();
        } catch (e) {
            // NOP
        }
    }
}

class AudioSystem {
    constructor({audioUriBuilder, useCache}) {
        this._cache = useCache ? new Map() : null;
        this._cacheSizeMaximum = 32;
        this._audioUriBuilder = audioUriBuilder;

        if (typeof speechSynthesis !== 'undefined') {
            // speechSynthesis.getVoices() will not be populated unless some API call is made.
            speechSynthesis.addEventListener('voiceschanged', this._onVoicesChanged.bind(this));
        }
    }

    async getDefinitionAudio(definition, sources, details) {
        const key = `${definition.expression}:${definition.reading}`;
        const hasCache = (this._cache !== null);

        if (hasCache) {
            const cacheValue = this._cache.get(key);
            if (typeof cacheValue !== 'undefined') {
                const {audio, uri, source} = cacheValue;
                const index = sources.indexOf(source);
                if (index >= 0) {
                    return {audio, uri, index};
                }
            }
        }

        for (let i = 0, ii = sources.length; i < ii; ++i) {
            const source = sources[i];
            const uri = await this._getAudioUri(definition, source, details);
            if (uri === null) { continue; }

            try {
                const audio = await this._createAudio(uri);
                if (hasCache) {
                    this._cacheCheck();
                    this._cache.set(key, {audio, uri, source});
                }
                return {audio, uri, index: i};
            } catch (e) {
                // NOP
            }
        }

        throw new Error('Could not create audio');
    }

    createTextToSpeechAudio(text, voiceUri) {
        const voice = this._getTextToSpeechVoiceFromVoiceUri(voiceUri);
        if (voice === null) {
            throw new Error('Invalid text-to-speech voice');
        }
        return new TextToSpeechAudio(text, voice);
    }

    _onVoicesChanged() {
        // NOP
    }

    async _createAudio(uri) {
        const ttsParameters = this._getTextToSpeechParameters(uri);
        if (ttsParameters !== null) {
            const {text, voiceUri} = ttsParameters;
            return this.createTextToSpeechAudio(text, voiceUri);
        }

        return await this._createAudioFromUrl(uri);
    }

    _getAudioUri(definition, source, details) {
        return (
            this._audioUriBuilder !== null ?
            this._audioUriBuilder.getUri(definition, source, details) :
            null
        );
    }

    _createAudioFromUrl(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(url);
            audio.addEventListener('loadeddata', () => {
                const duration = audio.duration;
                if (duration === 5.694694 || duration === 5.720718) {
                    // Hardcoded values for invalid audio
                    reject(new Error('Could not retrieve audio'));
                } else {
                    resolve(audio);
                }
            });
            audio.addEventListener('error', () => reject(audio.error));
        });
    }

    _getTextToSpeechVoiceFromVoiceUri(voiceUri) {
        try {
            for (const voice of speechSynthesis.getVoices()) {
                if (voice.voiceURI === voiceUri) {
                    return voice;
                }
            }
        } catch (e) {
            // NOP
        }
        return null;
    }

    _getTextToSpeechParameters(uri) {
        const m = /^tts:[^#?]*\?([^#]*)/.exec(uri);
        if (m === null) { return null; }

        const searchParameters = new URLSearchParams(m[1]);
        const text = searchParameters.get('text');
        const voiceUri = searchParameters.get('voice');
        return (text !== null && voiceUri !== null ? {text, voiceUri} : null);
    }

    _cacheCheck() {
        const removeCount = this._cache.size - this._cacheSizeMaximum;
        if (removeCount <= 0) { return; }

        const removeKeys = [];
        for (const key of this._cache.keys()) {
            removeKeys.push(key);
            if (removeKeys.length >= removeCount) { break; }
        }

        for (const key of removeKeys) {
            this._cache.delete(key);
        }
    }
}
