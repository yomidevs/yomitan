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
 * TextToSpeechAudio
 */

class AudioSystem extends EventDispatcher {
    constructor() {
        super();
        this._fallbackAudio = null;
    }

    prepare() {
        // speechSynthesis.getVoices() will not be populated unless some API call is made.
        if (
            typeof speechSynthesis !== 'undefined' &&
            typeof speechSynthesis.addEventListener === 'function'
        ) {
            speechSynthesis.addEventListener('voiceschanged', this._onVoicesChanged.bind(this), false);
        }
    }

    getFallbackAudio() {
        if (this._fallbackAudio === null) {
            this._fallbackAudio = new Audio('/data/audio/button.mp3');
        }
        return this._fallbackAudio;
    }

    createAudio(url, source) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(url);
            audio.addEventListener('loadeddata', () => {
                if (!this._isAudioValid(audio, source)) {
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

    _onVoicesChanged(e) {
        this.trigger('voiceschanged', e);
    }

    _isAudioValid(audio, source) {
        switch (source) {
            case 'jpod101':
            {
                const duration = audio.duration;
                return (
                    duration !== 5.694694 && // Invalid audio (Chrome)
                    duration !== 5.720718 // Invalid audio (Firefox)
                );
            }
            default:
                return true;
        }
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
