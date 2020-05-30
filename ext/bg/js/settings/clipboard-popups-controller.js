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
 * getOptionsContext
 * getOptionsMutable
 * settingsSaveOptions
 */

class ClipboardPopupsController {
    prepare() {
        document.querySelector('#enable-clipboard-popups').addEventListener('change', this._onEnableClipboardPopupsChanged.bind(this), false);
    }

    async _onEnableClipboardPopupsChanged(e) {
        const optionsContext = getOptionsContext();
        const options = await getOptionsMutable(optionsContext);

        const enableClipboardPopups = e.target.checked;
        if (enableClipboardPopups) {
            options.general.enableClipboardPopups = await new Promise((resolve) => {
                chrome.permissions.request(
                    {permissions: ['clipboardRead']},
                    (granted) => {
                        if (!granted) {
                            $('#enable-clipboard-popups').prop('checked', false);
                        }
                        resolve(granted);
                    }
                );
            });
        } else {
            options.general.enableClipboardPopups = false;
        }

        await settingsSaveOptions();
    }
}
