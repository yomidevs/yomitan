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

class ClipboardPopupsController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._checkbox = document.querySelector('#enable-clipboard-popups');
    }

    async prepare() {
        this._checkbox.addEventListener('change', this._onEnableClipboardPopupsChanged.bind(this), false);
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));

        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    // Private

    _onOptionsChanged({options}) {
        this._checkbox.checked = options.general.enableClipboardPopups;
    }

    async _onEnableClipboardPopupsChanged(e) {
        const enableClipboardPopups = e.target.checked;
        const options = await this._settingsController.getOptionsMutable();

        if (enableClipboardPopups) {
            options.general.enableClipboardPopups = await new Promise((resolve) => {
                chrome.permissions.request(
                    {permissions: ['clipboardRead']},
                    (granted) => {
                        if (!granted) {
                            this._checkbox.checked = false;
                        }
                        resolve(granted);
                    }
                );
            });
        } else {
            options.general.enableClipboardPopups = false;
        }

        await this._settingsController.save();
    }
}
