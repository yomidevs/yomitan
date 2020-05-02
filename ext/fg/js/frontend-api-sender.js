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


class FrontendApiSender {
    constructor() {
        this._senderId = yomichan.generateId(16);
        this._ackTimeout = 3000; // 3 seconds
        this._responseTimeout = 10000; // 10 seconds
        this._callbacks = new Map();
        this._disconnected = false;
        this._nextId = 0;
        this._port = null;
    }

    invoke(action, params, target) {
        if (this._disconnected) {
            // attempt to reconnect the next time
            this._disconnected = false;
            return Promise.reject(new Error('Disconnected'));
        }

        if (this._port === null) {
            this._createPort();
        }

        const id = `${this._nextId}`;
        ++this._nextId;

        return new Promise((resolve, reject) => {
            const info = {id, resolve, reject, ack: false, timer: null};
            this._callbacks.set(id, info);
            info.timer = setTimeout(() => this._onError(id, 'Timeout (ack)'), this._ackTimeout);

            this._port.postMessage({id, action, params, target, senderId: this._senderId});
        });
    }

    _createPort() {
        this._port = chrome.runtime.connect(null, {name: 'backend-api-forwarder'});
        this._port.onDisconnect.addListener(this._onDisconnect.bind(this));
        this._port.onMessage.addListener(this._onMessage.bind(this));
    }

    _onMessage({type, id, data, senderId}) {
        if (senderId !== this._senderId) { return; }
        switch (type) {
            case 'ack':
                this._onAck(id);
                break;
            case 'result':
                this._onResult(id, data);
                break;
        }
    }

    _onDisconnect() {
        this._disconnected = true;
        this._port = null;

        for (const id of this._callbacks.keys()) {
            this._onError(id, 'Disconnected');
        }
    }

    _onAck(id) {
        const info = this._callbacks.get(id);
        if (typeof info === 'undefined') {
            yomichan.logWarning(new Error(`ID ${id} not found for ack`));
            return;
        }

        if (info.ack) {
            yomichan.logWarning(new Error(`Request ${id} already ack'd`));
            return;
        }

        info.ack = true;
        clearTimeout(info.timer);
        info.timer = setTimeout(() => this._onError(id, 'Timeout (response)'), this._responseTimeout);
    }

    _onResult(id, data) {
        const info = this._callbacks.get(id);
        if (typeof info === 'undefined') {
            yomichan.logWarning(new Error(`ID ${id} not found`));
            return;
        }

        if (!info.ack) {
            yomichan.logWarning(new Error(`Request ${id} not ack'd`));
            return;
        }

        this._callbacks.delete(id);
        clearTimeout(info.timer);
        info.timer = null;

        if (typeof data.error !== 'undefined') {
            info.reject(jsonToError(data.error));
        } else {
            info.resolve(data.result);
        }
    }

    _onError(id, reason) {
        const info = this._callbacks.get(id);
        if (typeof info === 'undefined') { return; }
        this._callbacks.delete(id);
        info.timer = null;
        info.reject(new Error(reason));
    }
}
