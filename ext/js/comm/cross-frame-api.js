/*
 * Copyright (C) 2020-2021  Yomichan Authors
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
    constructor(otherTabId, otherFrameId, port, messageHandlers) {
        super();
        this._otherTabId = otherTabId;
        this._otherFrameId = otherFrameId;
        this._port = port;
        this._messageHandlers = messageHandlers;
        this._activeInvocations = new Map();
        this._invocationId = 0;
        this._eventListeners = new EventListenerCollection();
    }

    get otherTabId() {
        return this._otherTabId;
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
                reject(new Error(`Port is disconnected (${action})`));
                return;
            }

            const id = this._invocationId++;
            const invocation = {
                id,
                resolve,
                reject,
                responseTimeout,
                action,
                ack: false,
                timer: null
            };
            this._activeInvocations.set(id, invocation);

            if (ackTimeout !== null) {
                try {
                    invocation.timer = setTimeout(() => this._onError(id, 'Acknowledgement timeout'), ackTimeout);
                } catch (e) {
                    this._onError(id, 'Failed to set timeout');
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
            this._onError(id, 'Disconnected');
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
            log.warn(new Error(`Request ${id} not found for acknowledgement`));
            return;
        }

        if (invocation.ack) {
            this._onError(id, `Request ${id} already acknowledged`);
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
                invocation.timer = setTimeout(() => this._onError(id, 'Response timeout'), responseTimeout);
            } catch (e) {
                this._onError(id, 'Failed to set timeout');
            }
        }
    }

    _onResult(id, data) {
        const invocation = this._activeInvocations.get(id);
        if (typeof invocation === 'undefined') {
            log.warn(new Error(`Request ${id} not found`));
            return;
        }

        if (!invocation.ack) {
            this._onError(id, `Request ${id} not acknowledged`);
            return;
        }

        this._activeInvocations.delete(id);

        if (invocation.timer !== null) {
            clearTimeout(invocation.timer);
            invocation.timer = null;
        }

        const error = data.error;
        if (typeof error !== 'undefined') {
            invocation.reject(deserializeError(error));
        } else {
            invocation.resolve(data.result);
        }
    }

    _onError(id, error) {
        const invocation = this._activeInvocations.get(id);
        if (typeof invocation === 'undefined') { return; }

        if (typeof error === 'string') {
            error = new Error(`${error} (${invocation.action})`);
        }

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
        this._sendAck(id);
        if (typeof messageHandler === 'undefined') {
            this._sendError(id, new Error(`Unknown action: ${action}`));
            return false;
        }

        const callback = (data) => this._sendResult(id, data);
        return invokeMessageHandler(messageHandler, params, callback);
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

    _sendResult(id, data) {
        this._sendResponse({type: 'result', id, data});
    }

    _sendError(id, error) {
        this._sendResponse({type: 'result', id, data: {error: serializeError(error)}});
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

    invoke(targetFrameId, action, params={}) {
        return this.invokeTab(null, targetFrameId, action, params);
    }

    async invokeTab(targetTabId, targetFrameId, action, params={}) {
        if (typeof targetTabId !== 'number') { targetTabId = null; }
        const commPort = this._getOrCreateCommPort(targetTabId, targetFrameId);
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

    unregisterHandler(key) {
        return this._messageHandlers.delete(key);
    }

    // Private

    _onConnect(port) {
        try {
            let details;
            try {
                details = JSON.parse(port.name);
            } catch (e) {
                return;
            }
            if (details.name !== 'cross-frame-communication-port') { return; }

            const otherTabId = details.sourceTabId;
            const otherFrameId = details.sourceFrameId;
            this._setupCommPort(otherTabId, otherFrameId, port);
        } catch (e) {
            port.disconnect();
            log.error(e);
        }
    }

    _onDisconnect(commPort) {
        commPort.off('disconnect', this._onDisconnectBind);
        const {otherTabId, otherFrameId} = commPort;
        const tabPorts = this._commPorts.get(otherTabId);
        if (typeof tabPorts !== 'undefined') {
            tabPorts.delete(otherFrameId);
            if (tabPorts.size === 0) {
                this._commPorts.delete(otherTabId);
            }
        }
    }

    _getOrCreateCommPort(otherTabId, otherFrameId) {
        const tabPorts = this._commPorts.get(otherTabId);
        if (typeof tabPorts !== 'undefined') {
            const commPort = tabPorts.get(otherFrameId);
            if (typeof commPort !== 'undefined') {
                return commPort;
            }
        }
        return this._createCommPort(otherTabId, otherFrameId);
    }

    _createCommPort(otherTabId, otherFrameId) {
        const details = {
            name: 'background-cross-frame-communication-port',
            targetTabId: otherTabId,
            targetFrameId: otherFrameId
        };
        const port = yomichan.connect(null, {name: JSON.stringify(details)});
        return this._setupCommPort(otherTabId, otherFrameId, port);
    }

    _setupCommPort(otherTabId, otherFrameId, port) {
        const commPort = new CrossFrameAPIPort(otherTabId, otherFrameId, port, this._messageHandlers);
        let tabPorts = this._commPorts.get(otherTabId);
        if (typeof tabPorts === 'undefined') {
            tabPorts = new Map();
            this._commPorts.set(otherTabId, tabPorts);
        }
        tabPorts.set(otherFrameId, commPort);
        commPort.prepare();
        commPort.on('disconnect', this._onDisconnectBind);
        return commPort;
    }
}
