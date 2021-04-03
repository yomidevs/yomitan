/*
 * Copyright (C) 2019-2021  Yomichan Authors
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
 * wanakana
 */

class PopupPreviewController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._previewVisible = false;
        this._targetOrigin = chrome.runtime.getURL('/').replace(/\/$/, '');
        this._frame = null;
        this._previewTextInput = null;
        this._customCss = null;
        this._customOuterCss = null;
        this._previewFrameContainer = null;
    }

    async prepare() {
        this._frame = document.querySelector('#popup-preview-frame');
        this._customCss = document.querySelector('#custom-popup-css');
        this._customOuterCss = document.querySelector('#custom-popup-outer-css');
        this._previewFrameContainer = document.querySelector('.preview-frame-container');

        this._customCss.addEventListener('input', this._onCustomCssChange.bind(this), false);
        this._customCss.addEventListener('settingChanged', this._onCustomCssChange.bind(this), false);
        this._customOuterCss.addEventListener('input', this._onCustomOuterCssChange.bind(this), false);
        this._customOuterCss.addEventListener('settingChanged', this._onCustomOuterCssChange.bind(this), false);
        this._frame.addEventListener('load', this._onFrameLoad2.bind(this), false);
        this._settingsController.on('optionsContextChanged', this._onOptionsContextChange.bind(this));
    }

    // Private

    _onShowPopupPreviewButtonClick() {
        if (this._previewVisible) { return; }
        this._showAppearancePreview();
        this._previewVisible = true;
    }

    _showAppearancePreview() {
        const container = document.querySelector('#settings-popup-preview-container');
        const buttonContainer = document.querySelector('#settings-popup-preview-button-container');
        const settings = document.querySelector('#settings-popup-preview-settings');
        const text = document.querySelector('#settings-popup-preview-text');
        const customCss = document.querySelector('#custom-popup-css');
        const customOuterCss = document.querySelector('#custom-popup-outer-css');
        const frame = document.createElement('iframe');

        this._previewTextInput = text;
        this._frame = frame;
        this._customCss = customCss;
        this._customOuterCss = customOuterCss;

        wanakana.bind(text);

        frame.addEventListener('load', this._onFrameLoad.bind(this), false);
        text.addEventListener('input', this._onTextChange.bind(this), false);
        customCss.addEventListener('input', this._onCustomCssChange.bind(this), false);
        customOuterCss.addEventListener('input', this._onCustomOuterCssChange.bind(this), false);
        this._settingsController.on('optionsContextChanged', this._onOptionsContextChange.bind(this));

        frame.src = '/popup-preview.html';
        frame.id = 'settings-popup-preview-frame';

        container.appendChild(frame);
        if (buttonContainer.parentNode !== null) {
            buttonContainer.parentNode.removeChild(buttonContainer);
        }
        settings.style.display = '';
    }

    _onFrameLoad() {
        this._onOptionsContextChange();
        this._setText(this._previewTextInput.value);
    }

    _onFrameLoad2() {
        this._onOptionsContextChange();
        this._onCustomCssChange();
        this._onCustomOuterCssChange();
    }

    _onTextChange(e) {
        this._setText(e.currentTarget.value);
    }

    _onCustomCssChange() {
        this._invoke('setCustomCss', {css: this._customCss.value});
    }

    _onCustomOuterCssChange() {
        this._invoke('setCustomOuterCss', {css: this._customOuterCss.value});
    }

    _onOptionsContextChange() {
        const optionsContext = this._settingsController.getOptionsContext();
        this._invoke('updateOptionsContext', {optionsContext});
    }

    _setText(text) {
        this._invoke('setText', {text});
    }

    _invoke(action, params) {
        if (this._frame === null || this._frame.contentWindow === null) { return; }
        this._frame.contentWindow.postMessage({action, params}, this._targetOrigin);
    }
}
