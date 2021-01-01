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
 * DOMDataBinder
 */

class NestedPopupsController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._popupNestingMaxDepth = 0;
    }

    async prepare() {
        this._nestedPopupsEnabled = document.querySelector('#nested-popups-enabled');
        this._nestedPopupsCount = document.querySelector('#nested-popups-count');
        this._nestedPopupsEnabledMoreOptions = document.querySelector('#nested-popups-enabled-more-options');

        const options = await this._settingsController.getOptions();

        this._nestedPopupsEnabled.addEventListener('change', this._onNestedPopupsEnabledChange.bind(this), false);
        this._nestedPopupsCount.addEventListener('change', this._onNestedPopupsCountChange.bind(this), false);
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
        this._onOptionsChanged({options});
    }

    // Private

    _onOptionsChanged({options}) {
        this._updatePopupNestingMaxDepth(options.scanning.popupNestingMaxDepth);
    }

    _onNestedPopupsEnabledChange(e) {
        const value = e.currentTarget.checked;
        if (value && this._popupNestingMaxDepth > 0) { return; }
        this._setPopupNestingMaxDepth(value ? 1 : 0);
    }

    _onNestedPopupsCountChange(e) {
        const node = e.currentTarget;
        const value = Math.max(1, DOMDataBinder.convertToNumber(node.value, node));
        this._setPopupNestingMaxDepth(value);
    }

    _updatePopupNestingMaxDepth(value) {
        const enabled = (value > 0);
        this._popupNestingMaxDepth = value;
        this._nestedPopupsEnabled.checked = enabled;
        this._nestedPopupsCount.value = `${value}`;
        this._nestedPopupsEnabledMoreOptions.hidden = !enabled;
    }

    async _setPopupNestingMaxDepth(value) {
        this._updatePopupNestingMaxDepth(value);
        await this._settingsController.setProfileSetting('scanning.popupNestingMaxDepth', value);
    }
}
