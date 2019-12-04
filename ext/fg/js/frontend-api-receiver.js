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


class FrontendApiReceiver {
    constructor(source='', handlers={}) {
        this.source = source;
        this.handlers = handlers;

        chrome.runtime.onConnect.addListener(this.onConnect.bind(this));
    }

    onConnect(port) {
        if (port.name !== 'frontend-api-receiver') { return; }

        port.onMessage.addListener(this.onMessage.bind(this, port));
    }

    onMessage(port, {id, action, params, target, senderId}) {
        if (
            target !== this.source ||
            !hasOwn(this.handlers, action)
        ) {
            return;
        }

        this.sendAck(port, id, senderId);

        const handler = this.handlers[action];
        handler(params).then(
            (result) => {
                this.sendResult(port, id, senderId, {result});
            },
            (error) => {
                this.sendResult(port, id, senderId, {error: errorToJson(error)});
            });
    }

    sendAck(port, id, senderId) {
        port.postMessage({type: 'ack', id, senderId});
    }

    sendResult(port, id, senderId, data) {
        port.postMessage({type: 'result', id, senderId, data});
    }
}
