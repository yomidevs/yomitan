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

class TemplateRendererFrameApi {
    constructor(templateRenderer) {
        this._templateRenderer = templateRenderer;
        this._windowMessageHandlers = new Map([
            ['render', {async: false, handler: this._onRender.bind(this)}],
            ['renderMulti', {async: false, handler: this._onRenderMulti.bind(this)}],
            ['getModifiedData', {async: false, handler: this._onGetModifiedData.bind(this)}]
        ]);
    }

    prepare() {
        window.addEventListener('message', this._onWindowMessage.bind(this), false);
    }

    // Private

    _onWindowMessage(e) {
        const {source, data: {action, params, id}} = e;
        const messageHandler = this._windowMessageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return; }

        this._onWindowMessageInner(messageHandler, action, params, source, id);
    }

    async _onWindowMessageInner({handler, async}, action, params, source, id) {
        let response;
        try {
            let result = handler(params);
            if (async) {
                result = await result;
            }
            response = {result};
        } catch (error) {
            response = {error: this._serializeError(error)};
        }

        if (typeof id === 'undefined') { return; }
        source.postMessage({action: `${action}.response`, params: response, id}, '*');
    }

    _onRender({template, data, type}) {
        return this._templateRenderer.render(template, data, type);
    }

    _onRenderMulti({items}) {
        return this._serializeMulti(this._templateRenderer.renderMulti(items));
    }

    _onGetModifiedData({data, type}) {
        const result = this._templateRenderer.getModifiedData(data, type);
        return this._clone(result);
    }

    _serializeError(error) {
        try {
            if (typeof error === 'object' && error !== null) {
                return {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    data: error.data
                };
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

    _clone(value) {
        return JSON.parse(JSON.stringify(value));
    }
}
