/*
 * Copyright (C) 2019-2021  Yomichan Authors
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
 * CacheMap
 * TextToSpeechAudio
 */

class AudioSystem {
    constructor({getAudioInfo, cacheSize=32}) {
        this._cache = new CacheMap(cacheSize);
        this._getAudioInfo = getAudioInfo;
    }

    prepare() {
        // speechSynthesis.getVoices() will not be populated unless some API call is made.
        if (typeof speechSynthesis === 'undefined') { return; }

        const eventListeners = new EventListenerCollection();
        const onVoicesChanged = () => { eventListeners.removeAllEventListeners(); };
        eventListeners.addEventListener(speechSynthesis, 'voiceschanged', onVoicesChanged, false);
    }

    async createDefinitionAudio(sources, expression, reading, details) {
        const key = [expression, reading];

        const cacheValue = this._cache.get(key);
        if (typeof cacheValue !== 'undefined') {
            const {audio, source} = cacheValue;
            const index = sources.indexOf(source);
            if (index >= 0) {
                return {audio, index};
            }
        }

        for (let i = 0, ii = sources.length; i < ii; ++i) {
            const source = sources[i];
            const info = await this._getAudioInfo(source, expression, reading, details);
            if (info === null) { continue; }

            let audio;
            try {
                switch (info.type) {
                    case 'url':
                        {
                            const {details: {url}} = info;
                            audio = await this.createAudio(url);
                        }
                        break;
                    case 'tts':
                        {
                            const {details: {text, voice}} = info;
                            audio = this.createTextToSpeechAudio(text, voice);
                        }
                        break;
                    default:
                        throw new Error(`Unsupported type: ${info.type}`);
                }
            } catch (e) {
                continue;
            }

            this._cache.set(key, {audio, source});
            return {audio, index: i};
        }

        throw new Error('Could not create audio');
    }

    createAudio(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(url);
            audio.addEventListener('loadeddata', () => {
                if (!this._isAudioValid(audio)) {
                    reject(new Error('Could not retrieve audio'));
                } else {
                    resolve(audio);
                }
            });
            audio.addEventListener('error', () => reject(audio.error));
        });
    }

    createTextToSpeechAudio(text, voiceUri) {
        const voice = this._getTextToSpeechVoiceFromVoiceUri(voiceUri);
        if (voice === null) {
            throw new Error('Invalid text-to-speech voice');
        }
        return new TextToSpeechAudio(text, voice);
    }

    // Private

    _isAudioValid(audio) {
        const duration = audio.duration;
        return (
            duration !== 5.694694 && // jpod101 invalid audio (Chrome)
            duration !== 5.720718 // jpod101 invalid audio (Firefox)
        );
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
}
