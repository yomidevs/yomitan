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

/* globals
 * DOMSettingsBinder
 * utilBackgroundIsolate
 */

class GenericSettingController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._settingsBinder = null;
    }

    async prepare() {
        this._settingsBinder = new DOMSettingsBinder({
            getOptionsContext: () => this._settingsController.getOptionsContext(),
            source: this._settingsController.source,
            transforms: [
                ['setDocumentAttribute', this._setDocumentAttribute.bind(this)],
                ['splitTags', this._splitTags.bind(this)],
                ['joinTags', this._joinTags.bind(this)]
            ]
        });
        this._settingsBinder.observe(document.body);

        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
    }

    // Private

    _onOptionsChanged() {
        this._settingsBinder.refresh();
    }

    _setDocumentAttribute(value, metadata, element) {
        document.documentElement.setAttribute(element.dataset.documentAttribute, `${value}`);
        return value;
    }

    _splitTags(value) {
        return `${value}`.split(/[,; ]+/).filter((v) => !!v);
    }

    _joinTags(value) {
        return value.join(' ');
    }
}
