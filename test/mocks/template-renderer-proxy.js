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

import {AnkiTemplateRenderer} from '../../ext/js/templates/sandbox/anki-template-renderer.js';

export class TemplateRendererProxy {
    constructor() {
        /** @type {?Promise<void>} */
        this._preparePromise = null;
        /** @type {AnkiTemplateRenderer} */
        this._ankiTemplateRenderer = new AnkiTemplateRenderer();
    }

    /**
     * @param {string} template
     * @param {import('template-renderer').PartialOrCompositeRenderData} data
     * @param {import('anki-templates').RenderMode} type
     * @returns {Promise<import('template-renderer').RenderResult>}
     */
    async render(template, data, type) {
        await this._prepare();
        return this._ankiTemplateRenderer.templateRenderer.render(template, data, type);
    }

    /**
     * @param {import('template-renderer').RenderMultiItem[]} items
     * @returns {Promise<import('core').Response<import('template-renderer').RenderResult>[]>}
     */
    async renderMulti(items) {
        await this._prepare();
        return this._ankiTemplateRenderer.templateRenderer.renderMulti(items);
    }

    /**
     * @returns {Promise<void>}
     */
    _prepare() {
        if (this._preparePromise === null) {
            this._preparePromise = this._prepareInternal();
        }
        return this._preparePromise;
    }

    /** */
    async _prepareInternal() {
        await this._ankiTemplateRenderer.prepare();
    }
}
