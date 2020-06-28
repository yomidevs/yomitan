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
 * TextSourceRange
 * api
 */

class PopupPreviewFrame {
    constructor(frameId, popupFactory) {
        this._frameId = frameId;
        this._popupFactory = popupFactory;
        this._frontend = null;
        this._frontendGetOptionsContextOld = null;
        this._apiOptionsGetOld = null;
        this._popupSetCustomOuterCssOld = null;
        this._popupShown = false;
        this._themeChangeTimeout = null;
        this._textSource = null;
        this._optionsContext = null;
        this._targetOrigin = chrome.runtime.getURL('/').replace(/\/$/, '');

        this._windowMessageHandlers = new Map([
            ['setText',              this._setText.bind(this)],
            ['setCustomCss',         this._setCustomCss.bind(this)],
            ['setCustomOuterCss',    this._setCustomOuterCss.bind(this)],
            ['updateOptionsContext', this._updateOptionsContext.bind(this)]
        ]);
    }

    async prepare() {
        window.addEventListener('message', this._onMessage.bind(this), false);

        // Setup events
        document.querySelector('#theme-dark-checkbox').addEventListener('change', this._onThemeDarkCheckboxChanged.bind(this), false);

        // Overwrite API functions
        this._apiOptionsGetOld = api.optionsGet.bind(api);
        api.optionsGet = this._apiOptionsGet.bind(this);

        // Overwrite frontend
        this._frontend = new Frontend(
            this._frameId,
            this._popupFactory,
            {
                allowRootFramePopupProxy: false
            }
        );
        this._frontendGetOptionsContextOld = this._frontend.getOptionsContext.bind(this._frontend);
        this._frontend.getOptionsContext = this._getOptionsContext.bind(this);
        await this._frontend.prepare();
        this._frontend.setDisabledOverride(true);
        this._frontend.canClearSelection = false;

        const popup = this._frontend.popup;
        popup.setChildrenSupported(false);

        this._popupSetCustomOuterCssOld = popup.setCustomOuterCss.bind(popup);
        popup.setCustomOuterCss = this._popupSetCustomOuterCss.bind(this);

        // Update search
        this._updateSearch();
    }

    // Private

    async _getOptionsContext() {
        let optionsContext = this._optionsContext;
        if (optionsContext === null) {
            optionsContext = this._frontendGetOptionsContextOld();
        }
        return optionsContext;
    }

    async _apiOptionsGet(...args) {
        const options = await this._apiOptionsGetOld(...args);
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

    async _popupSetCustomOuterCss(...args) {
        // This simulates the stylesheet priorities when injecting using the web extension API.
        const result = await this._popupSetCustomOuterCssOld(...args);

        const node = document.querySelector('#client-css');
        if (node !== null && result !== null) {
            node.parentNode.insertBefore(result, node);
        }

        return result;
    }

    _onMessage(e) {
        if (e.origin !== this._targetOrigin) { return; }

        const {action, params} = e.data;
        const handler = this._windowMessageHandlers.get(action);
        if (typeof handler !== 'function') { return; }

        handler(params);
    }

    _onThemeDarkCheckboxChanged(e) {
        document.documentElement.classList.toggle('dark', e.target.checked);
        if (this._themeChangeTimeout !== null) {
            clearTimeout(this._themeChangeTimeout);
        }
        this._themeChangeTimeout = setTimeout(() => {
            this._themeChangeTimeout = null;
            const popup = this._frontend.popup;
            if (popup === null) { return; }
            popup.updateTheme();
        }, 300);
    }

    _setText({text}) {
        const exampleText = document.querySelector('#example-text');
        if (exampleText === null) { return; }

        exampleText.textContent = text;
        if (this._frontend === null) { return; }
        this._updateSearch();
    }

    _setInfoVisible(visible) {
        const node = document.querySelector('.placeholder-info');
        if (node === null) { return; }

        node.classList.toggle('placeholder-info-visible', visible);
    }

    _setCustomCss({css}) {
        if (this._frontend === null) { return; }
        const popup = this._frontend.popup;
        if (popup === null) { return; }
        popup.setCustomCss(css);
    }

    _setCustomOuterCss({css}) {
        if (this._frontend === null) { return; }
        const popup = this._frontend.popup;
        if (popup === null) { return; }
        popup.setCustomOuterCss(css, false);
    }

    async _updateOptionsContext({optionsContext}) {
        this._optionsContext = optionsContext;
        if (this._frontend === null) { return; }
        await this._frontend.updateOptions();
        await this._updateSearch();
    }

    async _updateSearch() {
        const exampleText = document.querySelector('#example-text');
        if (exampleText === null) { return; }

        const textNode = exampleText.firstChild;
        if (textNode === null) { return; }

        const range = document.createRange();
        range.selectNode(textNode);
        const source = new TextSourceRange(range, range.toString(), null, null);

        try {
            await this._frontend.setTextSource(source);
        } finally {
            source.cleanup();
        }
        this._textSource = source;
        await this._frontend.showContentCompleted();

        const popup = this._frontend.popup;
        if (popup !== null && popup.isVisibleSync()) {
            this._popupShown = true;
        }

        this._setInfoVisible(!this._popupShown);
    }
}
