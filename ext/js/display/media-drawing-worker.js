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

import {API} from '../comm/api.js';
import {createApiMap, invokeApiMapHandler} from '../core/api-map.js';
import {log} from '../core/log.js';
import {WebExtension} from '../extension/web-extension.js';

export class MediaDrawingWorker {
    constructor() {
        /** @type {number} */
        this._generation = 0;

        /** @type {MessagePort?} */
        this._dbPort = null;

        /** @type {import('api').PmApiMap} */
        this._fromApplicationApiMap = createApiMap([
            ['drawMedia', this._onDrawMedia.bind(this)],
            ['connectToDatabaseWorker', this._onConnectToDatabaseWorker.bind(this)],
        ]);

        /** @type {import('api').PmApiMap} */
        this._fromDatabaseApiMap = createApiMap([
            ['drawBufferToCanvases', this._onDrawBufferToCanvases.bind(this)],
            ['drawDecodedImageToCanvases', this._onDrawDecodedImageToCanvases.bind(this)],
        ]);

        /** @type {Map<number, OffscreenCanvas[]>} */
        this._canvasesByGeneration = new Map();

        /**
         * @type {API}
         */
        this._api = new API(new WebExtension());
    }

    /**
     *
     */
    async prepare() {
        addEventListener('message', (event) => {
            /** @type {import('api').PmApiMessageAny} */
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const message = event.data;
            return invokeApiMapHandler(this._fromApplicationApiMap, message.action, message.params, [event.ports], () => {});
        });
    }

    /** @type {import('api').PmApiHandler<'drawMedia'>} */
    async _onDrawMedia({requests}) {
        this._generation++;
        this._canvasesByGeneration.set(this._generation, requests.map((request) => request.canvas));
        this._cleanOldGenerations();
        const newRequests = requests.map((request, index) => ({...request, canvas: null, generation: this._generation, canvasIndex: index, canvasWidth: request.canvas.width, canvasHeight: request.canvas.height}));
        if (this._dbPort !== null) {
            this._dbPort.postMessage({action: 'drawMedia', params: {requests: newRequests}});
        } else {
            log.error('no database port available');
        }
    }

    /** @type {import('api').PmApiHandler<'drawBufferToCanvases'>} */
    async _onDrawBufferToCanvases({buffer, width, height, canvasIndexes, generation}) {
        try {
            const canvases = this._canvasesByGeneration.get(generation);
            if (typeof canvases === 'undefined') {
                return;
            }
            const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
            for (const ci of canvasIndexes) {
                const c = canvases[ci];
                c.getContext('2d')?.putImageData(imageData, 0, 0);
            }
        } catch (e) {
            log.error(e);
        }
    }

    /** @type {import('api').PmApiHandler<'drawDecodedImageToCanvases'>} */
    async _onDrawDecodedImageToCanvases({decodedImage, canvasIndexes, generation}) {
        try {
            const canvases = this._canvasesByGeneration.get(generation);
            if (typeof canvases === 'undefined') {
                return;
            }
            for (const ci of canvasIndexes) {
                const c = canvases[ci];
                c.getContext('2d')?.drawImage(decodedImage, 0, 0, c.width, c.height);
            }
        } catch (e) {
            log.error(e);
        }
    }

    /** @type {import('api').PmApiHandler<'connectToDatabaseWorker'>} */
    async _onConnectToDatabaseWorker(_params, ports) {
        if (ports === null) {
            return;
        }
        const dbPort = ports[0];
        this._dbPort = dbPort;
        dbPort.addEventListener('message', (/** @type {MessageEvent<import('api').PmApiMessageAny>} */ event) => {
            const message = event.data;
            return invokeApiMapHandler(this._fromDatabaseApiMap, message.action, message.params, [event.ports], () => {});
        });
        dbPort.start();
    }

    /**
     * @param {number} keepNGenerations Number of generations to keep, defaults to 2 (the current generation and the one before it).
     */
    _cleanOldGenerations(keepNGenerations = 2) {
        const generations = [...this._canvasesByGeneration.keys()];
        for (const g of generations) {
            if (g <= this._generation - keepNGenerations) {
                this._canvasesByGeneration.delete(g);
            }
        }
    }
}

const mediaDrawingWorker = new MediaDrawingWorker();
await mediaDrawingWorker.prepare();
