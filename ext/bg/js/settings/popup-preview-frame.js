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
 * Frontend
 * Popup
 * PopupProxyHost
 * TextSourceRange
 * apiOptionsGet
 */

class SettingsPopupPreview {
    constructor() {
        this.frontend = null;
        this.apiOptionsGetOld = apiOptionsGet;
        this.popup = null;
        this.popupSetCustomOuterCssOld = null;
        this.popupShown = false;
        this.themeChangeTimeout = null;
        this.textSource = null;
        this.optionsContext = null;
        this._targetOrigin = chrome.runtime.getURL('/').replace(/\/$/, '');

        this._windowMessageHandlers = new Map([
            ['prepare', ({optionsContext}) => this.prepare(optionsContext)],
            ['setText', ({text}) => this.setText(text)],
            ['setCustomCss', ({css}) => this.setCustomCss(css)],
            ['setCustomOuterCss', ({css}) => this.setCustomOuterCss(css)],
            ['updateOptionsContext', ({optionsContext}) => this.updateOptionsContext(optionsContext)]
        ]);

        window.addEventListener('message', this.onMessage.bind(this), false);
    }

    async prepare(optionsContext) {
        this.optionsContext = optionsContext;

        // Setup events
        document.querySelector('#theme-dark-checkbox').addEventListener('change', this.onThemeDarkCheckboxChanged.bind(this), false);

        // Overwrite API functions
        window.apiOptionsGet = this.apiOptionsGet.bind(this);

        // Overwrite frontend
        const popupHost = new PopupProxyHost();
        await popupHost.prepare();

        this.popup = popupHost.getOrCreatePopup();
        this.popup.setChildrenSupported(false);

        this.popupSetCustomOuterCssOld = this.popup.setCustomOuterCss;
        this.popup.setCustomOuterCss = this.popupSetCustomOuterCss.bind(this);

        this.frontend = new Frontend(this.popup);

        this.frontend.getOptionsContext = async () => this.optionsContext;
        this.frontend.setEnabled = () => {};
        this.frontend.onSearchClear = () => {};

        await this.frontend.prepare();

        // Update search
        this.updateSearch();
    }

    async apiOptionsGet(...args) {
        const options = await this.apiOptionsGetOld(...args);
        options.general.enable = true;
        options.general.debugInfo = false;
        options.general.popupWidth = 400;
        options.general.popupHeight = 250;
        options.general.popupHorizontalOffset = 0;
        options.general.popupVerticalOffset = 10;
        options.general.popupHorizontalOffset2 = 10;
        options.general.popupVerticalOffset2 = 0;
        options.general.popupHorizontalTextPosition = 'below';
        options.general.popupVerticalTextPosition = 'before';
        options.scanning.selectText = false;
        return options;
    }

    async popupSetCustomOuterCss(...args) {
        // This simulates the stylesheet priorities when injecting using the web extension API.
        const result = await this.popupSetCustomOuterCssOld.call(this.popup, ...args);

        const node = document.querySelector('#client-css');
        if (node !== null && result !== null) {
            node.parentNode.insertBefore(result, node);
        }

        return result;
    }

    onMessage(e) {
        if (e.origin !== this._targetOrigin) { return; }

        const {action, params} = e.data;
        const handler = this._windowMessageHandlers.get(action);
        if (typeof handler !== 'function') { return; }

        handler(params);
    }

    onThemeDarkCheckboxChanged(e) {
        document.documentElement.classList.toggle('dark', e.target.checked);
        if (this.themeChangeTimeout !== null) {
            clearTimeout(this.themeChangeTimeout);
        }
        this.themeChangeTimeout = setTimeout(() => {
            this.themeChangeTimeout = null;
            this.frontend.popup.updateTheme();
        }, 300);
    }

    setText(text) {
        const exampleText = document.querySelector('#example-text');
        if (exampleText === null) { return; }

        exampleText.textContent = text;
        this.updateSearch();
    }

    setInfoVisible(visible) {
        const node = document.querySelector('.placeholder-info');
        if (node === null) { return; }

        node.classList.toggle('placeholder-info-visible', visible);
    }

    setCustomCss(css) {
        if (this.frontend === null) { return; }
        this.frontend.popup.setCustomCss(css);
    }

    setCustomOuterCss(css) {
        if (this.frontend === null) { return; }
        this.frontend.popup.setCustomOuterCss(css, false);
    }

    async updateOptionsContext(optionsContext) {
        this.optionsContext = optionsContext;
        await this.frontend.updateOptions();
        await this.updateSearch();
    }

    async updateSearch() {
        const exampleText = document.querySelector('#example-text');
        if (exampleText === null) { return; }

        const textNode = exampleText.firstChild;
        if (textNode === null) { return; }

        const range = document.createRange();
        range.selectNode(textNode);
        const source = new TextSourceRange(range, range.toString(), null, null);

        try {
            await this.frontend.onSearchSource(source, 'script');
            this.frontend.setCurrentTextSource(source);
        } finally {
            source.cleanup();
        }
        this.textSource = source;
        await this.frontend.showContentCompleted();

        if (this.frontend.popup.isVisibleSync()) {
            this.popupShown = true;
        }

        this.setInfoVisible(!this.popupShown);
    }
}
