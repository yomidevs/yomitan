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

import {DocumentUtil} from './document-util.js';

export class TextSourceGenerator {
    constructor() {
        /** @type {import('text-source-generator').GetRangeFromPointHandler[]} @readonly */
        this._getRangeFromPointHandlers = [];
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {import('document-util').GetRangeFromPointOptions} options
     * @returns {?import('text-source').TextSource}
     */
    getRangeFromPoint(x, y, options) {
        for (const handler of this._getRangeFromPointHandlers) {
            const result = handler(x, y, options);
            if (result !== null) { return result; }
        }
        return DocumentUtil.getRangeFromPoint(x, y, options);
    }

    /**
     * Registers a custom handler for scanning for text or elements at the input position.
     * @param {import('text-source-generator').GetRangeFromPointHandler} handler The handler callback which will be invoked when calling `getRangeFromPoint`.
     */
    registerGetRangeFromPointHandler(handler) {
        this._getRangeFromPointHandlers.push(handler);
    }
}
