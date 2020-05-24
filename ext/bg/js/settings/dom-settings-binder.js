/*
 * Copyright (C) 2020  Yomichan Authors
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
 * DOMDataBinder
 * api
 * getOptionsContext
 */

class DOMSettingsBinder {
    constructor({getOptionsContext, transforms=null}) {
        this._getOptionsContext = getOptionsContext;
        this._defaultScope = 'profile';
        this._dataBinder = new DOMDataBinder({
            selector: '[data-setting]',
            createElementMetadata: this._createElementMetadata.bind(this),
            compareElementMetadata: this._compareElementMetadata.bind(this),
            getValues: this._getValues.bind(this),
            setValues: this._setValues.bind(this)
        });
        this._transforms = new Map(transforms !== null ? transforms : []);
    }

    observe(element) {
        this._dataBinder.observe(element);
    }

    disconnect() {
        this._dataBinder.disconnect();
    }

    refresh() {
        this._dataBinder.refresh();
    }

    // Private

    _createElementMetadata(element) {
        return {
            path: element.dataset.setting,
            scope: element.dataset.scope,
            transformPre: element.dataset.transformPre,
            transformPost: element.dataset.transformPost
        };
    }

    _compareElementMetadata(metadata1, metadata2) {
        return (
            metadata1.path === metadata2.path &&
            metadata1.scope === metadata2.scope &&
            metadata1.transformPre === metadata2.transformPre &&
            metadata1.transformPost === metadata2.transformPost
        );
    }

    async _getValues(targets) {
        const settingsTargets = [];
        for (const {metadata: {path, scope}} of targets) {
            const target = {
                path,
                scope: scope || this._defaultScope
            };
            if (target.scope === 'profile') {
                target.optionsContext = this._getOptionsContext();
            }
            settingsTargets.push(target);
        }
        return this._transformResults(await api.getSettings(settingsTargets), targets);
    }

    async _setValues(targets) {
        const settingsTargets = [];
        for (const {metadata, value, element} of targets) {
            const {path, scope, transformPre} = metadata;
            const target = {
                path,
                scope: scope || this._defaultScope,
                action: 'set',
                value: this._transform(value, transformPre, metadata, element)
            };
            if (target.scope === 'profile') {
                target.optionsContext = this._getOptionsContext();
            }
            settingsTargets.push(target);
        }
        return this._transformResults(await api.modifySettings(settingsTargets), targets);
    }

    _transform(value, transform, metadata, element) {
        if (typeof transform === 'string') {
            const transformFunction = this._transforms.get(transform);
            if (typeof transformFunction !== 'undefined') {
                value = transformFunction(value, metadata, element);
            }
        }
        return value;
    }

    _transformResults(values, targets) {
        return values.map((value, i) => {
            const error = value.error;
            if (error) { return jsonToError(error); }
            const {metadata, element} = targets[i];
            const result = this._transform(value.result, metadata.transformPost, metadata, element);
            return {result};
        });
    }
}
