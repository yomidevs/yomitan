/*
 * Copyright (C) 2026  Yomitan Authors
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


/** @type {?AudioContext} */
let sharedAudioContext = null;

/**
 * @returns {AudioContext}
 */
function getSharedAudioContext() {
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
        sharedAudioContext = new AudioContext();
    }
    return sharedAudioContext;
}

export class WebAudioLocalAudio {
    /**
     * @param {string} base64Data
     * @param {string} contentType
     */
    constructor(base64Data, contentType) {
        /** @type {string} */
        this._base64Data = base64Data;
        /** @type {string} */
        this._contentType = contentType;
        /** @type {number} */
        this._volume = 1;
        /** @type {number} */
        this._currentTime = 0;
        /** @type {AudioContext} */
        this._audioContext = getSharedAudioContext();
        /** @type {?AudioBufferSourceNode} */
        this._bufferSource = null;
        /** @type {?GainNode} */
        this._gainNode = null;
        /** @type {?AudioBuffer} */
        this._decodedBuffer = null;
        /** @type {?Error} */
        this._error = null;
        /** @type {?(() => void)} */
        this._errorCallback = null;
    }

    /** @type {number} */
    get currentTime() { return this._currentTime; }

    set currentTime(value) { this._currentTime = value; }

    /** @type {number} */
    get volume() { return this._volume; }

    set volume(value) {
        this._volume = value;
        if (this._gainNode) { this._gainNode.gain.value = value; }
    }

    /** @type {number} */
    get duration() { return this._decodedBuffer ? this._decodedBuffer.duration : 0; }

    /** @type {?Error} */
    get error() { return this._error; }

    /** */
    async prepare() {
        const byteCharacters = atob(this._base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        this._decodedBuffer = await this._audioContext.decodeAudioData(byteArray.buffer);
    }

    /**
     * @returns {Promise<void>}
     */
    async play() {
        if (!this._decodedBuffer || !this._audioContext) { return; }
        if (this._audioContext.state === 'suspended') {
            await this._audioContext.resume();
        }
        this.pause();

        this._bufferSource = this._audioContext.createBufferSource();
        this._bufferSource.buffer = this._decodedBuffer;

        this._gainNode = this._audioContext.createGain();
        this._gainNode.gain.value = this._volume;

        this._bufferSource.connect(this._gainNode);
        this._gainNode.connect(this._audioContext.destination);
        this._bufferSource.start(0, this._currentTime);
    }

    /**
     * @returns {void}
     */
    pause() {
        if (this._bufferSource) {
            try { this._bufferSource.stop(); } catch (e) { /* NOP */ }
            this._bufferSource = null;
        }
    }
}
