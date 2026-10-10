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

import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const AUDIO_CONTEXT_IDLE_CLOSE_DELAY = 1000;

/** @type {typeof import('../ext/js/media/web-audio-local-audio.js').WebAudioLocalAudio} */
let WebAudioLocalAudio;

class MockAudioBufferSourceNode extends EventTarget {
    constructor() {
        super();
        /** @type {?AudioBuffer} */
        this.buffer = null;
        /** @type {boolean} */
        this.started = false;
    }

    /** @returns {void} */
    connect() {}

    /** @returns {void} */
    start() {
        this.started = true;
    }

    /** @returns {void} */
    stop() {
        this.dispatchEvent(new Event('ended'));
    }

    /** @returns {void} */
    finish() {
        this.dispatchEvent(new Event('ended'));
    }
}

class MockGainNode {
    constructor() {
        /** @type {*} */
        this.gain = {value: 1};
    }

    /** @returns {void} */
    connect() {}
}

class MockAudioContext {
    /** @type {MockAudioContext[]} */
    static instances = [];
    /** @type {boolean} */
    static suspendOnCreate = false;
    /** @type {?{promise: Promise<unknown>, resolve: (value?: unknown) => void}} */
    static resumeDeferred = null;
    /** @type {?{promise: Promise<unknown>, resolve: (value?: unknown) => void}} */
    static decodeDeferred = null;

    constructor() {
        MockAudioContext.instances.push(this);
        /** @type {AudioContextState} */
        this.state = MockAudioContext.suspendOnCreate ? 'suspended' : 'running';
        /** @type {*} */
        this.destination = {};
        /** @type {MockAudioBufferSourceNode[]} */
        this.sources = [];
    }

    /**
     * @returns {Promise<AudioBuffer>}
     */
    async decodeAudioData() {
        if (MockAudioContext.decodeDeferred !== null) {
            return /** @type {AudioBuffer} */ (await MockAudioContext.decodeDeferred.promise);
        }
        return /** @type {*} */ ({duration: 0.5});
    }

    /** @returns {Promise<void>} */
    async resume() {
        if (MockAudioContext.resumeDeferred !== null) {
            await MockAudioContext.resumeDeferred.promise;
        }
        this.state = 'running';
    }

    /** @returns {Promise<void>} */
    async close() {
        this.state = 'closed';
    }

    /**
     * @returns {MockAudioBufferSourceNode}
     */
    createBufferSource() {
        const source = new MockAudioBufferSourceNode();
        this.sources.push(source);
        return source;
    }

    /**
     * @returns {MockGainNode}
     */
    createGain() {
        return new MockGainNode();
    }
}

/**
 * @returns {{promise: Promise<unknown>, resolve: (value?: unknown) => void}}
 */
function createDeferred() {
    /** @type {(value?: unknown) => void} */
    let resolve = () => {};
    /** @type {Promise<unknown>} */
    const promise = new Promise((resolvePromise) => {
        resolve = (value) => { resolvePromise(value); };
    });
    return {promise, resolve};
}

describe('WebAudioLocalAudio', () => {
    beforeEach(async () => {
        vi.useFakeTimers();
        MockAudioContext.instances = [];
        MockAudioContext.suspendOnCreate = false;
        MockAudioContext.resumeDeferred = null;
        MockAudioContext.decodeDeferred = null;
        vi.stubGlobal('AudioContext', MockAudioContext);
        vi.resetModules();
        ({WebAudioLocalAudio} = await import('../ext/js/media/web-audio-local-audio.js'));
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    test('closes the shared AudioContext after playback stops', async () => {
        const audio = new WebAudioLocalAudio('dGVzdA==', 'audio/mpeg');
        await audio.prepare();
        await audio.play();

        expect(MockAudioContext.instances).toHaveLength(1);
        const [audioContext] = MockAudioContext.instances;

        audio.pause();
        vi.advanceTimersByTime(AUDIO_CONTEXT_IDLE_CLOSE_DELAY - 1);
        expect(audioContext.state).toBe('running');

        vi.advanceTimersByTime(1);
        expect(audioContext.state).toBe('closed');
    });

    test('closes the shared AudioContext after playback finishes', async () => {
        const audio = new WebAudioLocalAudio('dGVzdA==', 'audio/mpeg');
        await audio.prepare();
        await audio.play();

        const [audioContext] = MockAudioContext.instances;
        audioContext.sources[audioContext.sources.length - 1].finish();

        vi.advanceTimersByTime(AUDIO_CONTEXT_IDLE_CLOSE_DELAY);
        expect(audioContext.state).toBe('closed');
    });

    test('reuses the shared AudioContext when playback resumes before the idle timeout', async () => {
        const audio = new WebAudioLocalAudio('dGVzdA==', 'audio/mpeg');
        await audio.prepare();
        await audio.play();
        audio.pause();

        vi.advanceTimersByTime(AUDIO_CONTEXT_IDLE_CLOSE_DELAY - 1);
        await audio.play();

        expect(MockAudioContext.instances).toHaveLength(1);
        expect(MockAudioContext.instances[0].state).toBe('running');
    });

    test('creates a new AudioContext after the previous one was closed', async () => {
        const audio = new WebAudioLocalAudio('dGVzdA==', 'audio/mpeg');
        await audio.prepare();
        await audio.play();
        audio.pause();
        vi.advanceTimersByTime(AUDIO_CONTEXT_IDLE_CLOSE_DELAY);
        expect(MockAudioContext.instances[0].state).toBe('closed');

        await audio.play();

        expect(MockAudioContext.instances).toHaveLength(2);
        expect(MockAudioContext.instances[1].state).toBe('running');
        expect(MockAudioContext.instances[1].sources[0].started).toBe(true);
    });

    test('keeps the context open while a clip is playing', async () => {
        const audio = new WebAudioLocalAudio('dGVzdA==', 'audio/mpeg');
        await audio.prepare();
        await audio.play();
        const [audioContext] = MockAudioContext.instances;

        vi.advanceTimersByTime(AUDIO_CONTEXT_IDLE_CLOSE_DELAY * 10);
        expect(audioContext.state).toBe('running');

        audio.pause();
        vi.advanceTimersByTime(AUDIO_CONTEXT_IDLE_CLOSE_DELAY);
        expect(audioContext.state).toBe('closed');
    });

    test('does not close a context that is in use when an idle instance is paused', async () => {
        const playing = new WebAudioLocalAudio('dGVzdA==', 'audio/mpeg');
        await playing.prepare();
        await playing.play();
        const [audioContext] = MockAudioContext.instances;

        const idle = new WebAudioLocalAudio('dGVzdA==', 'audio/mpeg');
        await idle.prepare();
        idle.pause();

        vi.advanceTimersByTime(AUDIO_CONTEXT_IDLE_CLOSE_DELAY * 10);
        expect(audioContext.state).toBe('running');

        playing.pause();
        vi.advanceTimersByTime(AUDIO_CONTEXT_IDLE_CLOSE_DELAY);
        expect(audioContext.state).toBe('closed');
    });

    test('keeps the context open while a clip is being decoded', async () => {
        const decodeDeferred = createDeferred();
        MockAudioContext.decodeDeferred = decodeDeferred;

        const audio = new WebAudioLocalAudio('dGVzdA==', 'audio/mpeg');
        const preparePromise = audio.prepare();

        vi.advanceTimersByTime(AUDIO_CONTEXT_IDLE_CLOSE_DELAY * 10);
        const [audioContext] = MockAudioContext.instances;
        expect(audioContext.state).toBe('running');

        decodeDeferred.resolve();
        await preparePromise;

        vi.advanceTimersByTime(AUDIO_CONTEXT_IDLE_CLOSE_DELAY);
        expect(audioContext.state).toBe('closed');
    });

    test('cancels a play that is paused while starting', async () => {
        MockAudioContext.suspendOnCreate = true;
        const resumeDeferred = createDeferred();
        MockAudioContext.resumeDeferred = resumeDeferred;

        const audio = new WebAudioLocalAudio('dGVzdA==', 'audio/mpeg');
        await audio.prepare();
        const [audioContext] = MockAudioContext.instances;

        const playPromise = audio.play();
        audio.pause();
        resumeDeferred.resolve();
        await playPromise;

        expect(audioContext.sources).toHaveLength(0);

        vi.advanceTimersByTime(AUDIO_CONTEXT_IDLE_CLOSE_DELAY);
        expect(audioContext.state).toBe('closed');
    });
});
