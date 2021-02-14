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

/* global
 * FrameAncestryHandler
 */

class FrameOffsetForwarder {
    constructor(frameId) {
        this._frameId = frameId;
        this._frameAncestryHandler = new FrameAncestryHandler(frameId);
    }

    prepare() {
        this._frameAncestryHandler.prepare();
        yomichan.crossFrame.registerHandlers([
            ['FrameOffsetForwarder.getChildFrameRect', {async: false, handler: this._onMessageGetChildFrameRect.bind(this)}]
        ]);
    }

    async getOffset() {
        if (this._frameAncestryHandler.isRootFrame()) {
            return [0, 0];
        }

        const ancestorFrameIds = await this._frameAncestryHandler.getFrameAncestryInfo();

        let childFrameId = this._frameId;
        const promises = [];
        for (const frameId of ancestorFrameIds) {
            promises.push(yomichan.crossFrame.invoke(frameId, 'FrameOffsetForwarder.getChildFrameRect', {frameId: childFrameId}));
            childFrameId = frameId;
        }

        const results = await Promise.all(promises);

        let xOffset = 0;
        let yOffset = 0;
        for (const {x, y} of results) {
            xOffset += x;
            yOffset += y;
        }
        return [xOffset, yOffset];
    }

    // Private

    _onMessageGetChildFrameRect({frameId}) {
        const frameElement = this._frameAncestryHandler.getChildFrameElement(frameId);
        if (frameElement === null) { return null; }

        const {x, y, width, height} = frameElement.getBoundingClientRect();
        return {x, y, width, height};
    }
}
