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

class FrameEndpoint {
    constructor() {
        this._secret = generateId(16);
        this._token = null;
        this._eventListeners = new EventListenerCollection();
        this._eventListenersSetup = false;
    }

    signal() {
        if (!this._eventListenersSetup) {
            this._eventListeners.addEventListener(window, 'message', this._onMessage.bind(this), false);
            this._eventListenersSetup = true;
        }
        yomichan.api.broadcastTab('frameEndpointReady', {secret: this._secret});
    }

    authenticate(message) {
        return (
            this._token !== null &&
            isObject(message) &&
            this._token === message.token &&
            this._secret === message.secret
        );
    }

    _onMessage(e) {
        if (this._token !== null) { return; } // Already initialized

        const data = e.data;
        if (!isObject(data) || data.action !== 'frameEndpointConnect') { return; } // Invalid message

        const params = data.params;
        if (!isObject(params)) { return; } // Invalid data

        const secret = params.secret;
        if (secret !== this._secret) { return; } // Invalid authentication

        const {token, hostFrameId} = params;
        this._token = token;

        this._eventListeners.removeAllEventListeners();
        yomichan.api.sendMessageToFrame(hostFrameId, 'frameEndpointConnected', {secret, token});
    }
}
