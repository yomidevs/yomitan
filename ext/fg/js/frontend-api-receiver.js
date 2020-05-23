/*
 * Copyright (C) 2019-2020  Yomichan Authors
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


class FrontendApiReceiver {
    constructor(source, messageHandlers) {
        this._source = source;
        this._messageHandlers = messageHandlers;
    }

    prepare() {
        chrome.runtime.onConnect.addListener(this._onConnect.bind(this));
    }

    _onConnect(port) {
        if (port.name !== 'frontend-api-receiver') { return; }

        port.onMessage.addListener(this._onMessage.bind(this, port));
    }

    _onMessage(port, {id, action, params, target, senderId}) {
        if (target !== this._source) { return; }

        const messageHandler = this._messageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return; }

        const {handler, async} = messageHandler;

        this._sendAck(port, id, senderId);
        if (async) {
            this._invokeHandlerAsync(handler, params, port, id, senderId);
        } else {
            this._invokeHandler(handler, params, port, id, senderId);
        }
    }

    _invokeHandler(handler, params, port, id, senderId) {
        try {
            const result = handler(params);
            this._sendResult(port, id, senderId, {result});
        } catch (error) {
            this._sendResult(port, id, senderId, {error: errorToJson(error)});
        }
    }

    async _invokeHandlerAsync(handler, params, port, id, senderId) {
        try {
            const result = await handler(params);
            this._sendResult(port, id, senderId, {result});
        } catch (error) {
            this._sendResult(port, id, senderId, {error: errorToJson(error)});
        }
    }

    _sendAck(port, id, senderId) {
        port.postMessage({type: 'ack', id, senderId});
    }

    _sendResult(port, id, senderId, data) {
        port.postMessage({type: 'result', id, senderId, data});
    }
}
