/*
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

class SearchPersistentStateController extends EventDispatcher {
    constructor() {
        super();
        this._mode = null;
    }

    get mode() {
        return this._mode;
    }

    set mode(value) {
        this._setMode(value, true);
    }

    prepare() {
        this._updateMode();
    }

    // Private

    _updateMode() {
        let mode = null;
        try {
            mode = sessionStorage.getItem('mode');
        } catch (e) {
            // Browsers can throw a SecurityError when cookie blocking is enabled.
        }
        this._setMode(mode, false);
    }

    _setMode(mode, save) {
        if (mode === this._mode) { return; }
        if (save) {
            try {
                if (mode === null) {
                    sessionStorage.removeItem('mode');
                } else {
                    sessionStorage.setItem('mode', mode);
                }
            } catch (e) {
                // Browsers can throw a SecurityError when cookie blocking is enabled.
            }
        }
        this._mode = mode;
        document.documentElement.dataset.searchMode = (mode !== null ? mode : '');
        this.trigger('modeChange', {mode});
    }
}
