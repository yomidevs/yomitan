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


/**
 * Delay before the shared AudioContext is closed once all leases have been
 * released. Closing the context releases the underlying audio output device,
 * which is otherwise kept open indefinitely and prevents other applications
 * (as well as the OS mixer, e.g. PipeWire) from reconfiguring its parameters.
 * @type {number}
 */
const AUDIO_CONTEXT_IDLE_CLOSE_DELAY = 1000;

/** @type {?AudioContext} */
let sharedAudioContext = null;

/**
 * Number of outstanding leases. The context is kept open while any operation
 * (playback or decoding) is using it, so an idle timer scheduled for one
 * instance can never close a context that another instance is using.
 * @type {number}
 */
let sharedAudioContextLeaseCount = 0;

/** @type {?import('core').Timeout} */
let sharedAudioContextCloseTimer = null;

/**
 * Acquires a lease on the shared AudioContext, cancelling any pending close.
 * Every call must be paired with `releaseSharedAudioContext`.
 * @returns {AudioContext}
 */
function acquireSharedAudioContext() {
    if (sharedAudioContextCloseTimer !== null) {
        clearTimeout(sharedAudioContextCloseTimer);
        sharedAudioContextCloseTimer = null;
    }
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
        sharedAudioContext = new AudioContext();
    }
    ++sharedAudioContextLeaseCount;
    return sharedAudioContext;
}

/**
 * Releases a lease previously acquired with `acquireSharedAudioContext`.
 * Once no leases remain, the context is closed after an idle delay.
 * @returns {void}
 */
function releaseSharedAudioContext() {
    if (sharedAudioContextLeaseCount > 0) {
        --sharedAudioContextLeaseCount;
    }
    if (sharedAudioContextLeaseCount === 0) {
        scheduleSharedAudioContextClose();
    }
}

/**
 * Schedules the shared AudioContext to be closed after a period of inactivity.
 * @returns {void}
 */
function scheduleSharedAudioContextClose() {
    if (sharedAudioContextCloseTimer !== null) { return; }
    sharedAudioContextCloseTimer = setTimeout(() => {
        sharedAudioContextCloseTimer = null;
        // A lease may have been acquired after the timer was scheduled.
        if (sharedAudioContextLeaseCount !== 0) { return; }
        const audioContext = sharedAudioContext;
        sharedAudioContext = null;
        if (audioContext !== null && audioContext.state !== 'closed') {
            audioContext.close().catch(() => { /* NOP */ });
        }
    }, AUDIO_CONTEXT_IDLE_CLOSE_DELAY);
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
        /** @type {?AudioBufferSourceNode} */
        this._bufferSource = null;
        /** @type {?GainNode} */
        this._gainNode = null;
        /** @type {?AudioBuffer} */
        this._decodedBuffer = null;
        /** @type {boolean} */
        this._contextLease = false;
        /**
         * Incremented whenever an in-flight `play()` should be abandoned
         * (i.e. `pause()` was called before it finished starting).
         * @type {number}
         */
        this._playToken = 0;
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

    /** */
    async prepare() {
        const audioContext = acquireSharedAudioContext();
        try {
            const byteCharacters = atob(this._base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);

            this._decodedBuffer = await audioContext.decodeAudioData(byteArray.buffer);
        } finally {
            releaseSharedAudioContext();
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async play() {
        if (!this._decodedBuffer) { return; }

        this.pause();

        const playToken = ++this._playToken;
        const audioContext = acquireSharedAudioContext();
        this._contextLease = true;

        try {
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            if (playToken !== this._playToken) {
                // Cancelled by pause() while starting; it released the lease.
                return;
            }

            this._bufferSource = audioContext.createBufferSource();
            this._bufferSource.buffer = this._decodedBuffer;
            this._bufferSource.addEventListener('ended', this._onBufferSourceEnded.bind(this), {once: true});

            this._gainNode = audioContext.createGain();
            this._gainNode.gain.value = this._volume;

            this._bufferSource.connect(this._gainNode);
            this._gainNode.connect(audioContext.destination);
            this._bufferSource.start(0, this._currentTime);
        } catch (e) {
            // Starting failed (e.g. the context was closed); don't leak the lease.
            this._releaseContextLease();
            throw e;
        }
    }

    /**
     * @returns {void}
     */
    pause() {
        ++this._playToken;
        if (this._bufferSource) {
            try { this._bufferSource.stop(); } catch (e) { /* NOP */ }
            this._bufferSource = null;
        }
        this._gainNode = null;
        this._releaseContextLease();
    }

    /**
     * @param {Event} event
     * @returns {void}
     */
    _onBufferSourceEnded(event) {
        if (event.target !== this._bufferSource) { return; }
        this._bufferSource = null;
        this._gainNode = null;
        this._releaseContextLease();
    }

    /**
     * @returns {void}
     */
    _releaseContextLease() {
        if (!this._contextLease) { return; }
        this._contextLease = false;
        releaseSharedAudioContext();
    }
}
