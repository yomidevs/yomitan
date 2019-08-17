/*
 * Copyright (C) 2019 Alex Yatskov <alex@foosoft.net>
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


class FrontendApiSender {
    constructor() {
        this.ackTimeout = 3000; // 3 seconds
        this.responseTimeout = 10000; // 10 seconds
        this.callbacks = {};
        this.disconnected = false;
        this.nextId = 0;

        this.port = chrome.runtime.connect(null, {name: 'backend-api-forwarder'});
        this.port.onDisconnect.addListener(this.onDisconnect.bind(this));
        this.port.onMessage.addListener(this.onMessage.bind(this));
    }

    invoke(action, params, target) {
        if (this.disconnected) {
            return Promise.reject('Disconnected');
        }

        const id = `${this.nextId}`;
        ++this.nextId;

        return new Promise((resolve, reject) => {
            const info = {id, resolve, reject, ack: false, timer: null};
            this.callbacks[id] = info;
            info.timer = setTimeout(() => this.onError(id, 'Timeout (ack)'), this.ackTimeout);

            this.port.postMessage({id, action, params, target});
        });
    }

    onMessage({type, id, data}) {
        switch (type) {
            case 'ack':
                this.onAck(id);
                break;
            case 'result':
                this.onResult(id, data);
                break;
        }
    }

    onDisconnect() {
        this.disconnected = true;

        const ids = Object.keys(this.callbacks);
        for (const id of ids) {
            this.onError(id, 'Disconnected');
        }
    }

    onAck(id) {
        if (!this.callbacks.hasOwnProperty(id)) {
            console.warn(`ID ${id} not found`);
            return;
        }

        const info = this.callbacks[id];
        if (info.ack) {
            console.warn(`Request ${id} already ack'd`);
            return;
        }

        info.ack = true;
        clearTimeout(info.timer);
        info.timer = setTimeout(() => this.onError(id, 'Timeout (response)'), this.responseTimeout);
    }

    onResult(id, data) {
        if (!this.callbacks.hasOwnProperty(id)) {
            console.warn(`ID ${id} not found`);
            return;
        }

        const info = this.callbacks[id];
        if (!info.ack) {
            console.warn(`Request ${id} not ack'd`);
            return;
        }

        delete this.callbacks[id];
        clearTimeout(info.timer);
        info.timer = null;

        if (typeof data.error === 'string') {
            info.reject(data.error);
        } else {
            info.resolve(data.result);
        }
    }

    onError(id, reason) {
        if (!this.callbacks.hasOwnProperty(id)) { return; }
        const info = this.callbacks[id];
        delete this.callbacks[id];
        info.timer = null;
        info.reject(reason);
    }

    static generateId(length) {
        let id = '';
        for (let i = 0; i < length; ++i) {
            id += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        }
        return id;
    }
}
