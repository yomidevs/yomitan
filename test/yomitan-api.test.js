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
import {ExternalExtensionPort, NativeComponentPort, YomitanApi} from '../ext/js/comm/yomitan-api.js';
import {createApiMap} from '../ext/js/core/api-map.js';
import {log} from '../ext/js/core/log.js';

/**
 * @typedef {object} FakeClientPort
 * @property {{id: string}|undefined} sender
 * @property {{addListener: import('vitest').Mock<(listener: (message: *, port: *) => void) => void>}} onMessage
 * @property {{addListener: import('vitest').Mock<(listener: (port: *) => void) => void>}} onDisconnect
 * @property {import('vitest').Mock<() => void>} disconnect
 */

/**
 * @typedef {object} FakeResponsePort
 * @property {import('vitest').Mock<(message: unknown) => void>} postMessage
 */

/**
 * @param {string|void} senderId
 * @returns {FakeClientPort}
 */
function createClientPort(senderId) {
    return {
        sender: senderId === void 0 ? void 0 : {id: senderId},
        onMessage: {addListener: vi.fn(() => {})},
        onDisconnect: {addListener: vi.fn(() => {})},
        disconnect: vi.fn(() => {}),
    };
}

/**
 * @returns {FakeResponsePort}
 */
function createResponsePort() {
    return {
        postMessage: vi.fn(() => {}),
    };
}

/**
 * @param {ExternalExtensionPort} port
 * @param {FakeClientPort} clientPort
 * @param {unknown} message
 * @returns {unknown[]}
 */
function deliverMessage(port, clientPort, message) {
    /** @type {unknown[]} */
    const received = [];
    port.onMessage.addListener((receivedMessage) => {
        received.push(receivedMessage);
    });
    const messageHandler = /** @type {(message: unknown) => void} */ (clientPort.onMessage.addListener.mock.calls[0][0]);
    messageHandler(message);
    return received;
}

describe('ExternalExtensionPort', () => {
    test.each(/** @type {[string, string|void, number][]} */ ([
        ['Admits authorized sender', 'id-a', 0],
        ['Rejects unauthorized sender', 'id-b', 1],
        ['Rejects missing sender', void 0, 1],
    ]))('%s', (_name, senderId, expectedDisconnectCount) => {
        const port = new ExternalExtensionPort(() => ['id-a']);
        const clientPort = createClientPort(senderId);

        port.handleConnect(clientPort);

        expect(clientPort.disconnect).toHaveBeenCalledTimes(expectedDisconnectCount);

        if (expectedDisconnectCount === 0) {
            const message = {action: 'yomitanVersion', params: {}, body: ''};
            const received = deliverMessage(port, clientPort, message);
            expect(received).toStrictEqual([message]);
        }
    });

    test('Evicts removed ids', () => {
        /** @type {string[]} */
        let allowedIds = ['id-a', 'id-b'];
        const port = new ExternalExtensionPort(() => allowedIds);
        const evictedPort = createClientPort('id-a');
        const authorizedPort = createClientPort('id-b');

        port.handleConnect(evictedPort);
        port.handleConnect(authorizedPort);
        expect(evictedPort.disconnect).not.toHaveBeenCalled();
        expect(authorizedPort.disconnect).not.toHaveBeenCalled();

        allowedIds = ['id-b'];
        const received = deliverMessage(port, authorizedPort, {action: 'yomitanVersion', params: {}, body: ''});

        expect(evictedPort.disconnect).toHaveBeenCalledTimes(1);
        expect(authorizedPort.disconnect).not.toHaveBeenCalled();
        expect(received).toStrictEqual([{action: 'yomitanVersion', params: {}, body: ''}]);
    });

    test('Replays queued messages', () => {
        const port = new ExternalExtensionPort(() => ['id-a']);
        const clientPort = createClientPort('id-a');
        /** @type {unknown[]} */
        const received = [];
        port.onMessage.addListener((message) => { received.push(message); });

        port.handleConnect(clientPort, [{action: 'yomitanVersion', params: {}, body: ''}]);

        expect(received).toStrictEqual([{action: 'yomitanVersion', params: {}, body: ''}]);
    });
});

describe('NativeComponentPort', () => {
    /**
     * @typedef {object} FakeNativePort
     * @property {{addListener: import('vitest').Mock<(listener: (message: unknown) => void) => void>, removeListener: import('vitest').Mock<(listener: (message: unknown) => void) => void>}} onMessage
     * @property {{addListener: import('vitest').Mock<(listener: (port: unknown) => void) => void>, removeListener: import('vitest').Mock<(listener: (port: unknown) => void) => void>}} onDisconnect
     * @property {import('vitest').Mock<(message: unknown) => void>} postMessage
     * @property {import('vitest').Mock<() => void>} disconnect
     */

    test('Responds on native port', async () => {
        /** @type {FakeNativePort} */
        const nativePort = {
            onMessage: {addListener: vi.fn(() => {}), removeListener: vi.fn(() => {})},
            onDisconnect: {addListener: vi.fn(() => {}), removeListener: vi.fn(() => {})},
            postMessage: vi.fn(() => {}),
            disconnect: vi.fn(() => {}),
        };
        vi.stubGlobal('chrome', {
            runtime: {
                connectNative: () => nativePort,
                getManifest: () => ({version: '0.0.0.0'}),
            },
        });

        const yomitanApi = new YomitanApi(
            createApiMap([
                ['optionsGetFull', async () => /** @type {*} */ ({profileCurrent: 0, profiles: []})],
            ]),
            null,
            () => new NativeComponentPort(),
        );
        await yomitanApi.setEnabled(true);

        const rawListener = nativePort.onMessage.addListener.mock.calls[0][0];
        rawListener({action: 'yomitanVersion', params: {}, body: '', requestId: 'request-1'});
        await new Promise((resolve) => { setTimeout(resolve, 0); });

        expect(nativePort.postMessage).toHaveBeenCalledWith({
            action: 'yomitanVersion',
            params: {},
            body: '',
            data: {version: '0.0.0.0'},
            requestId: 'request-1',
            responseStatusCode: 200,
        });
    });
});

describe('YomitanApi._onMessage', () => {
    beforeEach(() => {
        vi.stubGlobal('chrome', {runtime: {getManifest: () => ({version: '0.0.0.0'})}});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    /**
     * @param {unknown} message
     * @param {FakeResponsePort} responsePort
     * @returns {Promise<void>}
     */
    async function handleMessage(message, responsePort) {
        const apiMap = createApiMap([
            ['optionsGetFull', async () => /** @type {*} */ ({profileCurrent: 0, profiles: []})],
        ]);
        // eslint-disable-next-line no-underscore-dangle, @typescript-eslint/unbound-method
        const invoke = YomitanApi.prototype._invoke;
        // eslint-disable-next-line no-underscore-dangle, @typescript-eslint/unbound-method
        const method = /** @type {(this: unknown, message: unknown, port: unknown) => Promise<void>} */ (YomitanApi.prototype._onMessage);
        const context = /** @type {{_apiMap: *, _invoke: *}} */ ({_apiMap: apiMap, _invoke: invoke});
        await method.call(context, message, responsePort);
    }

    test('YomitanVersion', async () => {
        const responsePort = createResponsePort();
        const message = {action: 'yomitanVersion', params: {}, body: '', requestId: 'request-1'};

        await handleMessage(message, responsePort);

        expect(responsePort.postMessage).toHaveBeenCalledTimes(1);
        expect(responsePort.postMessage).toHaveBeenCalledWith({
            action: 'yomitanVersion',
            params: {},
            body: '',
            data: {version: '0.0.0.0'},
            requestId: 'request-1',
            responseStatusCode: 200,
        });
    });

    test('Malformed message', async () => {
        const responsePort = createResponsePort();
        const message = {action: 1, params: {}, body: '', requestId: 'request-2'};

        await handleMessage(message, responsePort);

        expect(responsePort.postMessage).toHaveBeenCalledWith({
            action: 1,
            params: {},
            body: '',
            data: 'null',
            requestId: 'request-2',
            responseStatusCode: 400,
        });
    });

    test('Unknown action', async () => {
        const responsePort = createResponsePort();
        const message = {action: 'invalidAction', params: {}, body: '', requestId: 'request-3'};

        await handleMessage(message, responsePort);

        expect(responsePort.postMessage).toHaveBeenCalledWith({
            action: 'invalidAction',
            params: {},
            body: '',
            data: null,
            requestId: 'request-3',
            responseStatusCode: 400,
        });
    });

    test('Invalid body', async () => {
        vi.spyOn(log, 'error').mockImplementation(() => {});
        const responsePort = createResponsePort();
        const message = {action: 'yomitanVersion', params: {}, body: '{', requestId: 'request-4'};

        await handleMessage(message, responsePort);

        expect(responsePort.postMessage).toHaveBeenCalledTimes(1);
        const response = /** @type {*} */ (responsePort.postMessage.mock.calls[0][0]);
        expect(response.responseStatusCode).toBe(500);
        expect(response.requestId).toBe('request-4');
        expect(typeof response.data).toBe('string');
    });
});
