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

import {createApiMap, invokeApiMapHandler} from '../core/api-map.js';
import {log} from '../core/log.js';

/**
 * This serves as a bridge between the application and the backend on Firefox
 * where we don't have service workers.
 *
 * It is designed to have extremely short lifetime on the application side,
 * as otherwise it will stay alive across extension updates (which only restart
 * the backend) which can lead to extremely difficult to debug situations where
 * the bridge is running an old version of the code.
 *
 * All it does is broker a handshake between the application and the backend,
 * where they establish a connection between each other with a MessageChannel.
 *
 * # On backend startup
 *  backend
 *    ↓↓<"registerBackendPort" via SharedWorker.port.postMessage>↓↓
 *  bridge: store the port in state
 *
 * # On application startup
 *  application: create a new MessageChannel, bind event listeners to one of the ports, and send the other port to the bridge
 *    ↓↓<"connectToBackend1" via SharedWorker.port.postMessage>↓↓
 *  bridge
 *    ↓↓<"connectToBackend2" via MessageChannel.port.postMessage which is stored in state from backend startup phase>↓↓
 *  backend: bind event listeners to the other port
 */
export class SharedWorkerBridge {
    constructor() {
        /** @type {MessagePort?} */
        this._backendPort = null;

        /** @type {import('shared-worker').ApiMap} */
        this._apiMap = createApiMap([
            ['registerBackendPort', this._onRegisterBackendPort.bind(this)],
            ['connectToBackend1', this._onConnectToBackend1.bind(this)],
        ]);
    }

    /**
     *
     */
    prepare() {
        addEventListener('connect', (connectEvent) => {
            const interlocutorPort = (/** @type {MessageEvent} */ (connectEvent)).ports[0];
            interlocutorPort.addEventListener('message', (/** @type {MessageEvent<import('shared-worker').ApiMessageAny>} */ event) => {
                const {action, params} = event.data;
                return invokeApiMapHandler(this._apiMap, action, params, [interlocutorPort, event.ports], () => {});
            });
            interlocutorPort.start();
        });
    }

    /** @type {import('shared-worker').ApiHandler<'registerBackendPort'>} */
    _onRegisterBackendPort(_params, interlocutorPort, _ports) {
        this._backendPort = interlocutorPort;
    }

    /** @type {import('shared-worker').ApiHandler<'connectToBackend1'>} */
    _onConnectToBackend1(_params, _interlocutorPort, ports) {
        if (this._backendPort !== null) {
            this._backendPort.postMessage(void 0, [ports[0]]); // connectToBackend2
        } else {
            log.error('SharedWorkerBridge: backend port is not registered');
        }
    }
}

const bridge = new SharedWorkerBridge();
bridge.prepare();
