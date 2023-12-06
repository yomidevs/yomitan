/*
 * Copyright (C) 2023  Yomitan Authors
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

export class PopupPreviewController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     */
    constructor(settingsController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {string} */
        this._targetOrigin = chrome.runtime.getURL('/').replace(/\/$/, '');
        /** @type {?HTMLIFrameElement} */
        this._frame = null;
        /** @type {?HTMLTextAreaElement} */
        this._customCss = null;
        /** @type {?HTMLTextAreaElement} */
        this._customOuterCss = null;
        /** @type {?HTMLElement} */
        this._previewFrameContainer = null;
    }

    /** */
    async prepare() {
        if (new URLSearchParams(location.search).get('popup-preview') === 'false') { return; }

        this._frame = /** @type {HTMLIFrameElement} */ (document.querySelector('#popup-preview-frame'));
        this._customCss = /** @type {HTMLTextAreaElement} */ (document.querySelector('#custom-popup-css'));
        this._customOuterCss = /** @type {HTMLTextAreaElement} */ (document.querySelector('#custom-popup-outer-css'));
        this._previewFrameContainer = /** @type {HTMLElement} */ (document.querySelector('.preview-frame-container'));

        this._customCss.addEventListener('input', this._onCustomCssChange.bind(this), false);
        this._customCss.addEventListener('settingChanged', this._onCustomCssChange.bind(this), false);
        this._customOuterCss.addEventListener('input', this._onCustomOuterCssChange.bind(this), false);
        this._customOuterCss.addEventListener('settingChanged', this._onCustomOuterCssChange.bind(this), false);
        this._frame.addEventListener('load', this._onFrameLoad.bind(this), false);
        this._settingsController.on('optionsContextChanged', this._onOptionsContextChange.bind(this));

        this._frame.src = '/popup-preview.html';
    }

    // Private

    /** */
    _onFrameLoad() {
        this._onOptionsContextChange();
        this._onCustomCssChange();
        this._onCustomOuterCssChange();
    }

    /** */
    _onCustomCssChange() {
        const css = /** @type {HTMLTextAreaElement} */ (this._customCss).value;
        this._invoke('PopupPreviewFrame.setCustomCss', {css});
    }

    /** */
    _onCustomOuterCssChange() {
        const css = /** @type {HTMLTextAreaElement} */ (this._customOuterCss).value;
        this._invoke('PopupPreviewFrame.setCustomOuterCss', {css});
    }

    /** */
    _onOptionsContextChange() {
        const optionsContext = this._settingsController.getOptionsContext();
        this._invoke('PopupPreviewFrame.updateOptionsContext', {optionsContext});
    }

    /**
     * @param {string} action
     * @param {import('core').SerializableObject} params
     */
    _invoke(action, params) {
        if (this._frame === null || this._frame.contentWindow === null) { return; }
        this._frame.contentWindow.postMessage({action, params}, this._targetOrigin);
    }
}
