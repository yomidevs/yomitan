/*
 * Copyright (C) 2016-2022  Yomichan Authors
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
 * Handlebars
 */

class TemplateRenderer {
    constructor() {
        this._cache = new Map();
        this._cacheMaxSize = 5;
        this._dataTypes = new Map();
        this._renderSetup = null;
        this._renderCleanup = null;
    }

    registerHelpers(helpers) {
        Handlebars.partials = Handlebars.templates;
        for (const [name, helper] of helpers) {
            this._registerHelper(name, helper);
        }
    }

    registerDataType(name, {modifier=null, composeData=null}) {
        this._dataTypes.set(name, {modifier, composeData});
    }

    setRenderCallbacks(setup, cleanup) {
        this._renderSetup = setup;
        this._renderCleanup = cleanup;
    }

    render(template, data, type) {
        const instance = this._getTemplateInstance(template);
        data = this._getModifiedData(data, void 0, type);
        return this._renderTemplate(instance, data);
    }

    renderMulti(items) {
        const results = [];
        for (const {template, templateItems} of items) {
            const instance = this._getTemplateInstance(template);
            for (const {type, commonData, datas} of templateItems) {
                for (let data of datas) {
                    let result;
                    try {
                        data = this._getModifiedData(data, commonData, type);
                        result = this._renderTemplate(instance, data);
                        result = {result};
                    } catch (error) {
                        result = {error};
                    }
                    results.push(result);
                }
            }
        }
        return results;
    }

    getModifiedData(data, type) {
        return this._getModifiedData(data, void 0, type);
    }

    // Private

    _getTemplateInstance(template) {
        const cache = this._cache;
        let instance = cache.get(template);
        if (typeof instance === 'undefined') {
            this._updateCacheSize(this._cacheMaxSize - 1);
            instance = Handlebars.compile(template);
            cache.set(template, instance);
        }

        return instance;
    }

    _renderTemplate(instance, data) {
        const renderSetup = this._renderSetup;
        const renderCleanup = this._renderCleanup;
        let result;
        let additions1;
        let additions2;
        try {
            additions1 = (typeof renderSetup === 'function' ? renderSetup(data) : null);
            result = instance(data).trim();
        } finally {
            additions2 = (typeof renderCleanup === 'function' ? renderCleanup(data) : null);
        }
        return Object.assign({result}, additions1, additions2);
    }

    _getModifiedData(data, commonData, type) {
        if (typeof type === 'string') {
            const typeInfo = this._dataTypes.get(type);
            if (typeof typeInfo !== 'undefined') {
                if (typeof commonData !== 'undefined') {
                    const {composeData} = typeInfo;
                    if (typeof composeData === 'function') {
                        data = composeData(data, commonData);
                    }
                }
                const {modifier} = typeInfo;
                if (typeof modifier === 'function') {
                    data = modifier(data);
                }
            }
        }
        return data;
    }

    _updateCacheSize(maxSize) {
        const cache = this._cache;
        let removeCount = cache.size - maxSize;
        if (removeCount <= 0) { return; }

        for (const key of cache.keys()) {
            cache.delete(key);
            if (--removeCount <= 0) { break; }
        }
    }

    _registerHelper(name, helper) {
        function wrapper(...args) {
            return helper(this, ...args);
        }
        Handlebars.registerHelper(name, wrapper);
    }
}
