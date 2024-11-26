/*
 * Copyright (C) 2024  Yomitan Authors
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

export class SharedWorkerBridge {
    constructor() {
        /** @type {number} */
        this._count = 0;

        /** @type {MessagePort?} */
        this._backendPort = null;
    }

    /**
     *
     */
    prepare() {
        addEventListener('connect', (/** @type {MessageEvent} */ connectEvent) => {
            const port = connectEvent.ports[0];
            port.addEventListener('message', (messageEvent) => {
                const {data} = messageEvent;
                const {action} = data;
                this._count++;
                if (action === 'registerBackendPort') {
                    this._backendPort = port;
                } else if (action === 'connectToBackend1') {
                    if (this._backendPort !== null) {
                        this._backendPort.postMessage({action: 'connectToBackend2'}, [port]);
                    } else {
                        console.error('SharedWorkerBridge: backend port is not registered');
                    }
                }
                console.log('popup-worker.js received message:', messageEvent.data, this._count);
            });
            port.start();
        });
    }
}

const bridge = new SharedWorkerBridge();
bridge.prepare();
