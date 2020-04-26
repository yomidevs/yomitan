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

function appearanceInitialize() {
    let previewVisible = false;
    $('#settings-popup-preview-button').on('click', () => {
        if (previewVisible) { return; }
        showAppearancePreview();
        previewVisible = true;
    });
}

function showAppearancePreview() {
    const container = $('#settings-popup-preview-container');
    const buttonContainer = $('#settings-popup-preview-button-container');
    const settings = $('#settings-popup-preview-settings');
    const text = $('#settings-popup-preview-text');
    const customCss = $('#custom-popup-css');
    const customOuterCss = $('#custom-popup-outer-css');

    const frame = document.createElement('iframe');
    frame.src = '/bg/settings-popup-preview.html';
    frame.id = 'settings-popup-preview-frame';

    wanakana.bind(text[0]);

    const targetOrigin = chrome.runtime.getURL('/').replace(/\/$/, '');

    text.on('input', () => {
        const action = 'setText';
        const params = {text: text.val()};
        frame.contentWindow.postMessage({action, params}, targetOrigin);
    });
    customCss.on('input', () => {
        const action = 'setCustomCss';
        const params = {css: customCss.val()};
        frame.contentWindow.postMessage({action, params}, targetOrigin);
    });
    customOuterCss.on('input', () => {
        const action = 'setCustomOuterCss';
        const params = {css: customOuterCss.val()};
        frame.contentWindow.postMessage({action, params}, targetOrigin);
    });

    const updateOptionsContext = () => {
        const action = 'updateOptionsContext';
        const params = {
            optionsContext: getOptionsContext()
        };
        frame.contentWindow.postMessage({action, params}, targetOrigin);
    };
    yomichan.on('modifyingProfileChange', updateOptionsContext);

    frame.addEventListener('load', () => {
        const action = 'prepare';
        const params = {
            optionsContext: getOptionsContext()
        };
        frame.contentWindow.postMessage({action, params}, targetOrigin);
    });

    container.append(frame);
    buttonContainer.remove();
    settings.css('display', '');
}
