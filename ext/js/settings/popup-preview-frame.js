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
 * Frontend
 * TextSourceRange
 * wanakana
 */

class PopupPreviewFrame {
    constructor(tabId, frameId, popupFactory, hotkeyHandler) {
        this._tabId = tabId;
        this._frameId = frameId;
        this._popupFactory = popupFactory;
        this._hotkeyHandler = hotkeyHandler;
        this._frontend = null;
        this._apiOptionsGetOld = null;
        this._popupShown = false;
        this._themeChangeTimeout = null;
        this._textSource = null;
        this._optionsContext = null;
        this._exampleText = null;
        this._exampleTextInput = null;
        this._targetOrigin = chrome.runtime.getURL('/').replace(/\/$/, '');

        this._windowMessageHandlers = new Map([
            ['setText',              this._onSetText.bind(this)],
            ['setCustomCss',         this._setCustomCss.bind(this)],
            ['setCustomOuterCss',    this._setCustomOuterCss.bind(this)],
            ['updateOptionsContext', this._updateOptionsContext.bind(this)]
        ]);
    }

    async prepare() {
        this._exampleText = document.querySelector('#example-text');
        this._exampleTextInput = document.querySelector('#example-text-input');

        if (this._exampleTextInput !== null && typeof wanakana !== 'undefined') {
            wanakana.bind(this._exampleTextInput);
        }

        window.addEventListener('message', this._onMessage.bind(this), false);

        // Setup events
        document.querySelector('#theme-dark-checkbox').addEventListener('change', this._onThemeDarkCheckboxChanged.bind(this), false);
        this._exampleText.addEventListener('click', this._onExampleTextClick.bind(this), false);
        this._exampleTextInput.addEventListener('blur', this._onExampleTextInputBlur.bind(this), false);
        this._exampleTextInput.addEventListener('input', this._onExampleTextInputInput.bind(this), false);

        // Overwrite API functions
        this._apiOptionsGetOld = yomichan.api.optionsGet.bind(yomichan.api);
        yomichan.api.optionsGet = this._apiOptionsGet.bind(this);

        // Overwrite frontend
        this._frontend = new Frontend({
            tabId: this._tabId,
            frameId: this._frameId,
            popupFactory: this._popupFactory,
            depth: 0,
            parentPopupId: null,
            parentFrameId: null,
            useProxyPopup: false,
            canUseWindowPopup: false,
            pageType: 'web',
            allowRootFramePopupProxy: false,
            childrenSupported: false,
            hotkeyHandler: this._hotkeyHandler
        });
        this._frontend.setOptionsContextOverride(this._optionsContext);
        await this._frontend.prepare();
        this._frontend.setDisabledOverride(true);
        this._frontend.canClearSelection = false;
        this._frontend.popup.on('customOuterCssChanged', this._onCustomOuterCssChanged.bind(this));

        // Update search
        this._updateSearch();
    }

    // Private

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

    _onCustomOuterCssChanged({node, inShadow}) {
        if (node === null || inShadow) { return; }

        const node2 = document.querySelector('#popup-outer-css');
        if (node2 === null) { return; }

        // This simulates the stylesheet priorities when injecting using the web extension API.
        node2.parentNode.insertBefore(node, node2);
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

    _onExampleTextClick() {
        if (this._exampleTextInput === null) { return; }
        const visible = this._exampleTextInput.hidden;
        this._exampleTextInput.hidden = !visible;
        if (!visible) { return; }
        this._exampleTextInput.focus();
        this._exampleTextInput.select();
    }

    _onExampleTextInputBlur() {
        if (this._exampleTextInput === null) { return; }
        this._exampleTextInput.hidden = true;
    }

    _onExampleTextInputInput(e) {
        this._setText(e.currentTarget.value);
    }

    _onSetText({text}) {
        this._setText(text, true);
    }

    _setText(text, setInput) {
        if (setInput && this._exampleTextInput !== null) {
            this._exampleTextInput.value = text;
        }

        if (this._exampleText === null) { return; }

        this._exampleText.textContent = text;
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
        this._frontend.setOptionsContextOverride(optionsContext);
        await this._frontend.updateOptions();
        await this._updateSearch();
    }

    async _updateSearch() {
        if (this._exampleText === null) { return; }

        const textNode = this._exampleText.firstChild;
        if (textNode === null) { return; }

        const range = document.createRange();
        range.selectNodeContents(textNode);
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
