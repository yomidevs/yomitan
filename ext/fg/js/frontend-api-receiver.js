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

    onMessage(port, {id, action, params, target}) {
        if (
            target !== this.source ||
            !this.handlers.hasOwnProperty(action)
        ) {
            return;
        }

        this.sendAck(port, id);

        const handler = this.handlers[action];
        handler(params).then(
            result => {
                this.sendResult(port, id, {result});
            },
            e => {
                const error = typeof e.toString === 'function' ? e.toString() : e;
                this.sendResult(port, id, {error});
            });
    }

    sendAck(port, id) {
        port.postMessage({type: 'ack', id});
    }

    sendResult(port, id, data) {
        port.postMessage({type: 'result', id, data});
    }
}
