/*
 * Copyright (C) 2023  Yomitan Authors
 * Copyright (C) 2021-2022  Yomichan Authors
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

import {AnkiTemplateRenderer} from '../sandbox/anki-template-renderer.js';

export class TemplateRendererProxy {
    constructor() {
        this._preparePromise = null;
        this._ankiTemplateRenderer = new AnkiTemplateRenderer();
    }

    async render(template, data, type) {
        await this._prepare();
        return await this._ankiTemplateRenderer.templateRenderer.render(template, data, type);
    }

    async renderMulti(items) {
        await this._prepare();
        return await this._serializeMulti(this._ankiTemplateRenderer.templateRenderer.renderMulti(items));
    }

    _prepare() {
        if (this._preparePromise === null) {
            this._preparePromise = this._prepareInternal();
        }
        return this._preparePromise;
    }

    async _prepareInternal() {
        await this._ankiTemplateRenderer.prepare();
    }

    _serializeError(error) {
        try {
            if (typeof error === 'object' && error !== null) {
                const result = {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                };
                if (Object.prototype.hasOwnProperty.call(error, 'data')) {
                    result.data = error.data;
                }
                return result;
            }
        } catch (e) {
            // NOP
        }
        return {
            value: error,
            hasValue: true
        };
    }

    _serializeMulti(array) {
        for (let i = 0, ii = array.length; i < ii; ++i) {
            const value = array[i];
            const {error} = value;
            if (typeof error !== 'undefined') {
                value.error = this._serializeError(error);
            }
        }
        return array;
    }
}
