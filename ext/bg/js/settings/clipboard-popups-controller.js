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
 * ObjectPropertyAccessor
 */

class ClipboardPopupsController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._toggles = null;
    }

    async prepare() {
        this._toggles = document.querySelectorAll('.clipboard-toggle');

        for (const toggle of this._toggles) {
            toggle.addEventListener('change', this._onClipboardToggleChange.bind(this), false);
        }
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));

        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    // Private

    _onOptionsChanged({options}) {
        const accessor = new ObjectPropertyAccessor(options);
        for (const toggle of this._toggles) {
            const path = ObjectPropertyAccessor.getPathArray(toggle.dataset.clipboardSetting);
            let value;
            try {
                value = accessor.get(path, path.length);
            } catch (e) {
                continue;
            }
            toggle.checked = !!value;
        }
    }

    async _onClipboardToggleChange(e) {
        const checkbox = e.currentTarget;
        let value = checkbox.checked;

        if (value) {
            value = await this._settingsController.setPermissionsGranted(['clipboardRead'], true);
            checkbox.checked = value;
        }

        await this._settingsController.setProfileSetting('clipboard.enableBackgroundMonitor', value);
    }
}
