/*
 * Copyright (C) 2019-2022  Yomichan Authors
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

class PopupPreviewController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._targetOrigin = chrome.runtime.getURL('/').replace(/\/$/, '');
        this._frame = null;
        this._customCss = null;
        this._customOuterCss = null;
        this._previewFrameContainer = null;
    }

    async prepare() {
        if (new URLSearchParams(location.search).get('popup-preview') === 'false') { return; }

        this._frame = document.querySelector('#popup-preview-frame');
        this._customCss = document.querySelector('#custom-popup-css');
        this._customOuterCss = document.querySelector('#custom-popup-outer-css');
        this._previewFrameContainer = document.querySelector('.preview-frame-container');

        this._customCss.addEventListener('input', this._onCustomCssChange.bind(this), false);
        this._customCss.addEventListener('settingChanged', this._onCustomCssChange.bind(this), false);
        this._customOuterCss.addEventListener('input', this._onCustomOuterCssChange.bind(this), false);
        this._customOuterCss.addEventListener('settingChanged', this._onCustomOuterCssChange.bind(this), false);
        this._frame.addEventListener('load', this._onFrameLoad.bind(this), false);
        this._settingsController.on('optionsContextChanged', this._onOptionsContextChange.bind(this));

        this._frame.src = '/popup-preview.html';
    }

    // Private

    _onFrameLoad() {
        this._onOptionsContextChange();
        this._onCustomCssChange();
        this._onCustomOuterCssChange();
    }

    _onCustomCssChange() {
        this._invoke('PopupPreviewFrame.setCustomCss', {css: this._customCss.value});
    }

    _onCustomOuterCssChange() {
        this._invoke('PopupPreviewFrame.setCustomOuterCss', {css: this._customOuterCss.value});
    }

    _onOptionsContextChange() {
        const optionsContext = this._settingsController.getOptionsContext();
        this._invoke('PopupPreviewFrame.updateOptionsContext', {optionsContext});
    }

    _invoke(action, params) {
        if (this._frame === null || this._frame.contentWindow === null) { return; }
        this._frame.contentWindow.postMessage({action, params}, this._targetOrigin);
    }
}
