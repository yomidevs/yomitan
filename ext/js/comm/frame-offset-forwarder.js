/*
 * Copyright (C) 2023-2024  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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

import {FrameAncestryHandler} from './frame-ancestry-handler.js';

export class FrameOffsetForwarder {
    /**
     * @param {import('../comm/cross-frame-api.js').CrossFrameAPI} crossFrameApi
     */
    constructor(crossFrameApi) {
        /** @type {import('../comm/cross-frame-api.js').CrossFrameAPI} */
        this._crossFrameApi = crossFrameApi;
        /** @type {FrameAncestryHandler} */
        this._frameAncestryHandler = new FrameAncestryHandler(crossFrameApi);
    }

    /**
     * @returns {void}
     */
    prepare() {
        this._frameAncestryHandler.prepare();
        this._crossFrameApi.registerHandlers([
            ['frameOffsetForwarderGetChildFrameRect', this._onMessageGetChildFrameRect.bind(this)],
        ]);
    }

    /**
     * @returns {Promise<?[x: number, y: number]>}
     */
    async getOffset() {
        if (this._frameAncestryHandler.isRootFrame()) {
            return [0, 0];
        }

        const {frameId} = this._crossFrameApi;
        if (frameId === null) { return null; }

        try {
            const ancestorFrameIds = await this._frameAncestryHandler.getFrameAncestryInfo();

            let childFrameId = frameId;
            /** @type {Promise<?import('frame-offset-forwarder').ChildFrameRect>[]} */
            const promises = [];
            for (const ancestorFrameId of ancestorFrameIds) {
                promises.push(this._crossFrameApi.invoke(ancestorFrameId, 'frameOffsetForwarderGetChildFrameRect', {frameId: childFrameId}));
                childFrameId = ancestorFrameId;
            }

            const results = await Promise.all(promises);

            let x = 0;
            let y = 0;
            for (const result of results) {
                if (result === null) { return null; }
                x += result.x;
                y += result.y;
            }
            return [x, y];
        } catch (e) {
            return null;
        }
    }

    // Private

    /** @type {import('cross-frame-api').ApiHandler<'frameOffsetForwarderGetChildFrameRect'>} */
    _onMessageGetChildFrameRect({frameId}) {
        const frameElement = this._frameAncestryHandler.getChildFrameElement(frameId);
        if (frameElement === null) { return null; }

        const {left, top, width, height} = frameElement.getBoundingClientRect();
        return {x: left, y: top, width, height};
    }
}
