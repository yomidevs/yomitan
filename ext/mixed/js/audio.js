/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
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

    play() {
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

    static createFromUri(ttsUri) {
        const m = /^tts:[^#\?]*\?([^#]*)/.exec(ttsUri);
        if (m === null) { return null; }

        const searchParameters = {};
        for (const group of m[1].split('&')) {
            const sep = group.indexOf('=');
            if (sep < 0) { continue; }
            searchParameters[decodeURIComponent(group.substring(0, sep))] = decodeURIComponent(group.substring(sep + 1));
        }

        if (!searchParameters.text) { return null; }

        const voice = audioGetTextToSpeechVoice(searchParameters.voice);
        if (voice === null) { return null; }

        return new TextToSpeechAudio(searchParameters.text, voice);
    }

}

function audioGetFromUrl(url, willDownload) {
    const tts = TextToSpeechAudio.createFromUri(url);
    if (tts !== null) {
        if (willDownload) {
            throw new Error('AnkiConnect does not support downloading text-to-speech audio.');
        }
        return Promise.resolve(tts);
    }

    return new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.addEventListener('loadeddata', () => {
            if (audio.duration === 5.694694 || audio.duration === 5.720718) {
                // Hardcoded values for invalid audio
                reject(new Error('Could not retrieve audio'));
            } else {
                resolve(audio);
            }
        });
        audio.addEventListener('error', () => reject(audio.error));
    });
}

async function audioGetFromSources(expression, sources, optionsContext, willDownload, cache=null) {
    const key = `${expression.expression}:${expression.reading}`;
    if (cache !== null && hasOwn(cache, expression)) {
        return cache[key];
    }

    for (let i = 0, ii = sources.length; i < ii; ++i) {
        const source = sources[i];
        const url = await apiAudioGetUrl(expression, source, optionsContext);
        if (url === null) {
            continue;
        }

        try {
            let audio = await audioGetFromUrl(url, willDownload);
            if (willDownload) {
                // AnkiConnect handles downloading URLs into cards
                audio = null;
            }
            const result = {audio, url, source};
            if (cache !== null) {
                cache[key] = result;
            }
            return result;
        } catch (e) {
            // NOP
        }
    }
    return {audio: null, url: null, source: null};
}

function audioGetTextToSpeechVoice(voiceURI) {
    try {
        for (const voice of speechSynthesis.getVoices()) {
            if (voice.voiceURI === voiceURI) {
                return voice;
            }
        }
    } catch (e) {
        // NOP
    }
    return null;
}

function audioPrepareTextToSpeech(options) {
    if (
        audioPrepareTextToSpeech.state ||
        !options.audio.textToSpeechVoice ||
        !(
            options.audio.sources.includes('text-to-speech') ||
            options.audio.sources.includes('text-to-speech-reading')
        )
    ) {
        // Text-to-speech not in use.
        return;
    }

    // Chrome needs this value called once before it will become populated.
    // The first call will return an empty list.
    audioPrepareTextToSpeech.state = true;
    try {
        speechSynthesis.getVoices();
    } catch (e) {
        // NOP
    }
}
audioPrepareTextToSpeech.state = false;
