/*
 * Copyright (C) 2020-2022  Yomichan Authors
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
        this._text = text;
        this._voice = voice;
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
                this._utterance = new SpeechSynthesisUtterance(typeof this._text === 'string' ? this._text : '');
                this._utterance.lang = 'ja-JP';
                this._utterance.volume = this._volume;
                this._utterance.voice = this._voice;
            }

            speechSynthesis.cancel();

            try {
                console.log('starting recording');

                // Create an audio context and a source node from the utterance
                const audioCtx = new AudioContext();
                const sourceNode = audioCtx.createMediaStreamSource(new MediaStream([this._utterance]));

                // Create a destination node and connect the source node to it
                const destNode = audioCtx.createMediaStreamDestination();
                sourceNode.connect(destNode);

                // Start playing the audio
                const mediaRecorder = new MediaRecorder(destNode.stream);
                mediaRecorder.start();

                console.log('started recording');
            } catch (error) {
                console.error(error);
            }

            speechSynthesis.speak(this._utterance);

            // Stop recording when speech synthesis is finished
            // this._utterance.onend = () => {
            //     console.log('stopping recording');
            //     mediaRecorder.stop();

            //     // When recording is stopped, create a downloadable audio file
            //     mediaRecorder.ondataavailable = (event) => {
            //         const blob = new Blob([event.data], {type: 'audio/mp3'});
            //         const url = URL.createObjectURL(blob);
            //         const link = document.createElement('a');
            //         link.href = url;
            //         link.download = 'speech.mp3';
            //         document.body.appendChild(link);
            //         link.click();
            //     };
            // };
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
