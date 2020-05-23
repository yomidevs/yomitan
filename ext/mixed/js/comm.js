/*
 * Copyright (C) 2020  Yomichan Authors
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

class CrossFrameAPIPort extends EventDispatcher {
    constructor(otherFrameId, port, messageHandlers) {
        super();
        this._otherFrameId = otherFrameId;
        this._port = port;
        this._messageHandlers = messageHandlers;
        this._activeInvocations = new Map();
        this._invocationId = 0;
        this._eventListeners = new EventListenerCollection();
    }

    get otherFrameId() {
        return this._otherFrameId;
    }

    prepare() {
        this._eventListeners.addListener(this._port.onDisconnect, this._onDisconnect.bind(this));
        this._eventListeners.addListener(this._port.onMessage, this._onMessage.bind(this));
    }

    invoke(action, params, ackTimeout, responseTimeout) {
        return new Promise((resolve, reject) => {
            if (this._port === null) {
                reject(new Error('Port is disconnected'));
                return;
            }

            const id = this._invocationId++;
            const invocation = {id, resolve, reject, responseTimeout, ack: false, timer: null};
            this._activeInvocations.set(id, invocation);

            if (ackTimeout !== null) {
                try {
                    invocation.timer = setTimeout(() => this._onError(id, new Error('Timeout (ack)')), ackTimeout);
                } catch (e) {
                    this._onError(id, new Error('Failed to set timeout'));
                    return;
                }
            }

            try {
                this._port.postMessage({type: 'invoke', id, data: {action, params}});
            } catch (e) {
                this._onError(id, e);
            }
        });
    }

    disconnect() {
        this._onDisconnect();
    }

    // Private

    _onDisconnect() {
        if (this._port === null) { return; }
        this._eventListeners.removeAllEventListeners();
        this._port = null;
        for (const id of this._activeInvocations.keys()) {
            this._onError(id, new Error('Disconnected'));
        }
        this.trigger('disconnect', this);
    }

    _onMessage({type, id, data}) {
        switch (type) {
            case 'invoke':
                this._onInvoke(id, data);
                break;
            case 'ack':
                this._onAck(id);
                break;
            case 'result':
                this._onResult(id, data);
                break;
        }
    }

    // Response handlers

    _onAck(id) {
        const invocation = this._activeInvocations.get(id);
        if (typeof invocation === 'undefined') {
            yomichan.logWarning(new Error(`Request ${id} not found for ack`));
            return;
        }

        if (invocation.ack) {
            this._onError(id, new Error(`Request ${id} already ack'd`));
            return;
        }

        invocation.ack = true;

        if (invocation.timer !== null) {
            clearTimeout(invocation.timer);
            invocation.timer = null;
        }

        const responseTimeout = invocation.responseTimeout;
        if (responseTimeout !== null) {
            try {
                invocation.timer = setTimeout(() => this._onError(id, new Error('Timeout (response)')), responseTimeout);
            } catch (e) {
                this._onError(id, new Error('Failed to set timeout'));
            }
        }
    }

    _onResult(id, data) {
        const invocation = this._activeInvocations.get(id);
        if (typeof invocation === 'undefined') {
            yomichan.logWarning(new Error(`Request ${id} not found`));
            return;
        }

        if (!invocation.ack) {
            this._onError(id, new Error(`Request ${id} not ack'd`));
            return;
        }

        this._activeInvocations.delete(id);

        if (invocation.timer !== null) {
            clearTimeout(invocation.timer);
            invocation.timer = null;
        }

        const error = data.error;
        if (typeof error !== 'undefined') {
            invocation.reject(jsonToError(error));
        } else {
            invocation.resolve(data.result);
        }
    }

    _onError(id, error) {
        const invocation = this._activeInvocations.get(id);
        if (typeof invocation === 'undefined') { return; }

        this._activeInvocations.delete(id);
        if (invocation.timer !== null) {
            clearTimeout(invocation.timer);
            invocation.timer = null;
        }
        invocation.reject(error);
    }

    // Invocation

    _onInvoke(id, {action, params}) {
        const messageHandler = this._messageHandlers.get(action);
        if (typeof messageHandler === 'undefined') {
            this._sendError(id, new Error(`Unknown action: ${action}`));
            return;
        }

        const {handler, async} = messageHandler;

        this._sendAck(id);
        if (async) {
            this._invokeHandlerAsync(id, handler, params);
        } else {
            this._invokeHandler(id, handler, params);
        }
    }

    _invokeHandler(id, handler, params) {
        try {
            const result = handler(params);
            this._sendResult(id, result);
        } catch (error) {
            this._sendError(id, error);
        }
    }

    async _invokeHandlerAsync(id, handler, params) {
        try {
            const result = await handler(params);
            this._sendResult(id, result);
        } catch (error) {
            this._sendError(id, error);
        }
    }

    _sendResponse(data) {
        if (this._port === null) { return; }
        try {
            this._port.postMessage(data);
        } catch (e) {
            // NOP
        }
    }

    _sendAck(id) {
        this._sendResponse({type: 'ack', id});
    }

    _sendResult(id, result) {
        this._sendResponse({type: 'result', id, data: {result}});
    }

    _sendError(id, error) {
        this._sendResponse({type: 'result', id, data: {error: errorToJson(error)}});
    }
}

class CrossFrameAPI {
    constructor() {
        this._ackTimeout = 3000; // 3 seconds
        this._responseTimeout = 10000; // 10 seconds
        this._commPorts = new Map();
        this._messageHandlers = new Map();
        this._onDisconnectBind = this._onDisconnect.bind(this);
    }

    prepare() {
        chrome.runtime.onConnect.addListener(this._onConnect.bind(this));
    }

    async invoke(targetFrameId, action, params={}) {
        const commPort = this._getOrCreateCommPort(targetFrameId);
        return await commPort.invoke(action, params, this._ackTimeout, this._responseTimeout);
    }

    registerHandlers(messageHandlers) {
        for (const [key, value] of messageHandlers) {
            if (this._messageHandlers.has(key)) {
                throw new Error(`Handler ${key} is already registered`);
            }
            this._messageHandlers.set(key, value);
        }
    }

    _onConnect(port) {
        const match = /^cross-frame-communication-port-(\d+)$/.exec(`${port.name}`);
        if (match === null) { return; }

        const otherFrameId = parseInt(match[1], 10);
        this._setupCommPort(otherFrameId, port);
    }

    _onDisconnect(commPort) {
        commPort.off('disconnect', this._onDisconnectBind);
        this._commPorts.delete(commPort.otherFrameId);
    }

    _getOrCreateCommPort(otherFrameId) {
        const commPort = this._commPorts.get(otherFrameId);
        return (typeof commPort !== 'undefined' ? commPort : this._createCommPort(otherFrameId));
    }

    _createCommPort(otherFrameId) {
        const port = chrome.runtime.connect(null, {name: `background-cross-frame-communication-port-${otherFrameId}`});
        return this._setupCommPort(otherFrameId, port);
    }

    _setupCommPort(otherFrameId, port) {
        const commPort = new CrossFrameAPIPort(otherFrameId, port, this._messageHandlers);
        this._commPorts.set(otherFrameId, commPort);
        commPort.prepare();
        commPort.on('disconnect', this._onDisconnectBind);
        return commPort;
    }
}
