/*
 * Copyright (C) 2019-2020  Yomichan Authors
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
 * getOptionsContext
 * wanakana
 */

class PopupPreviewController {
    constructor() {
        this._previewVisible = false;
        this._targetOrigin = chrome.runtime.getURL('/').replace(/\/$/, '');
        this._frame = null;
        this._previewTextInput = null;
    }

    prepare() {
        document.querySelector('#settings-popup-preview-button').addEventListener('click', this._onShowPopupPreviewButtonClick.bind(this), false);
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

        wanakana.bind(text);

        frame.addEventListener('load', this._onFrameLoad.bind(this), false);
        text.addEventListener('input', this._onTextChange.bind(this), false);
        customCss.addEventListener('input', this._onCustomCssChange.bind(this), false);
        customOuterCss.addEventListener('input', this._onCustomOuterCssChange.bind(this), false);
        yomichan.on('modifyingProfileChange', this._onOptionsContextChange.bind(this));

        frame.src = '/bg/settings-popup-preview.html';
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

    _onTextChange(e) {
        this._setText(e.currentTarget.value);
    }

    _onCustomCssChange(e) {
        this._invoke('setCustomCss', {css: e.currentTarget.value});
    }

    _onCustomOuterCssChange(e) {
        this._invoke('setCustomOuterCss', {css: e.currentTarget.value});
    }

    _onOptionsContextChange() {
        this._invoke('updateOptionsContext', {optionsContext: getOptionsContext()});
    }

    _setText(text) {
        this._invoke('setText', {text});
    }

    _invoke(action, params) {
        if (this._frame === null || this._frame.contentWindow === null) { return; }
        this._frame.contentWindow.postMessage({action, params}, this._targetOrigin);
    }
}
