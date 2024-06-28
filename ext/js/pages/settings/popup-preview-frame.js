/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import * as wanakana from '../../../lib/wanakana.js';
import {Frontend} from '../../app/frontend.js';
import {ThemeController} from '../../app/theme-controller.js';
import {createApiMap, invokeApiMapHandler} from '../../core/api-map.js';
import {querySelectorNotNull} from '../../dom/query-selector.js';
import {TextSourceRange} from '../../dom/text-source-range.js';

export class PopupPreviewFrame {
    /**
     * @param {import('../../application.js').Application} application
     * @param {import('../../app/popup-factory.js').PopupFactory} popupFactory
     * @param {import('../../input/hotkey-handler.js').HotkeyHandler} hotkeyHandler
     */
    constructor(application, popupFactory, hotkeyHandler) {
        /** @type {import('../../application.js').Application} */
        this._application = application;
        /** @type {import('../../app/popup-factory.js').PopupFactory} */
        this._popupFactory = popupFactory;
        /** @type {import('../../input/hotkey-handler.js').HotkeyHandler} */
        this._hotkeyHandler = hotkeyHandler;
        /** @type {?Frontend} */
        this._frontend = null;
        /** @type {?(optionsContext: import('settings').OptionsContext) => Promise<import('settings').ProfileOptions>} */
        this._apiOptionsGetOld = null;
        /** @type {boolean} */
        this._popupShown = false;
        /** @type {?import('core').Timeout} */
        this._themeChangeTimeout = null;
        /** @type {?import('text-source').TextSource} */
        this._textSource = null;
        /** @type {?import('settings').OptionsContext} */
        this._optionsContext = null;
        /** @type {HTMLElement} */
        this._exampleText = querySelectorNotNull(document, '#example-text');
        /** @type {HTMLInputElement} */
        this._exampleTextInput = querySelectorNotNull(document, '#example-text-input');
        /** @type {string} */
        this._targetOrigin = chrome.runtime.getURL('/').replace(/\/$/, '');
        /** @type {import('language').LanguageSummary[]} */
        this._languageSummaries = [];
        /** @type {boolean} */
        this._wanakanaBound = false;
        /** @type {ThemeController} */
        this._themeController = new ThemeController(document.documentElement);

        /* eslint-disable @stylistic/no-multi-spaces */
        /** @type {import('popup-preview-frame').ApiMap} */
        this._windowMessageHandlers = createApiMap([
            ['setText',                this._onSetText.bind(this)],
            ['setCustomCss',           this._setCustomCss.bind(this)],
            ['setCustomOuterCss',      this._setCustomOuterCss.bind(this)],
            ['updateOptionsContext',   this._updateOptionsContext.bind(this)],
            ['setLanguageExampleText', this._setLanguageExampleText.bind(this)],
        ]);
        /* eslint-enable @stylistic/no-multi-spaces */
    }

    /** */
    async prepare() {
        window.addEventListener('message', this._onMessage.bind(this), false);

        this._themeController.prepare();

        // Setup events
        this._exampleText.addEventListener('click', this._onExampleTextClick.bind(this), false);
        this._exampleTextInput.addEventListener('blur', this._onExampleTextInputBlur.bind(this), false);
        this._exampleTextInput.addEventListener('input', this._onExampleTextInputInput.bind(this), false);

        // Overwrite API functions
        /** @type {?(optionsContext: import('settings').OptionsContext) => Promise<import('settings').ProfileOptions>} */
        this._apiOptionsGetOld = this._application.api.optionsGet.bind(this._application.api);
        this._application.api.optionsGet = this._apiOptionsGet.bind(this);

        this._languageSummaries = await this._application.api.getLanguageSummaries();
        const options = await this._application.api.optionsGet({current: true});
        void this._setLanguageExampleText({language: options.general.language});

        // Overwrite frontend
        this._frontend = new Frontend({
            application: this._application,
            popupFactory: this._popupFactory,
            depth: 0,
            parentPopupId: null,
            parentFrameId: null,
            useProxyPopup: false,
            canUseWindowPopup: false,
            pageType: 'web',
            allowRootFramePopupProxy: false,
            childrenSupported: false,
            hotkeyHandler: this._hotkeyHandler,
        });
        this._frontend.setOptionsContextOverride(this._optionsContext);
        await this._frontend.prepare();
        this._frontend.setDisabledOverride(true);
        this._frontend.canClearSelection = false;
        const {popup} = this._frontend;
        if (popup !== null) {
            popup.on('customOuterCssChanged', this._onCustomOuterCssChanged.bind(this));
        }

        // Update search
        void this._updateSearch();
    }

    // Private

    /**
     * @param {import('settings').OptionsContext} optionsContext
     * @returns {Promise<import('settings').ProfileOptions>}
     */
    async _apiOptionsGet(optionsContext) {
        const options = await /** @type {(optionsContext: import('settings').OptionsContext) => Promise<import('settings').ProfileOptions>} */ (this._apiOptionsGetOld)(optionsContext);
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
        this._themeController.theme = options.general.popupTheme;
        this._themeController.siteOverride = true;
        this._themeController.updateTheme();
        return options;
    }

    /**
     * @param {import('popup').EventArgument<'customOuterCssChanged'>} details
     */
    _onCustomOuterCssChanged({node, inShadow}) {
        if (node === null || inShadow) { return; }

        const node2 = document.querySelector('#popup-outer-css');
        if (node2 === null) { return; }
        const {parentNode} = node2;
        if (parentNode === null) { return; }

        // This simulates the stylesheet priorities when injecting using the web extension API.
        parentNode.insertBefore(node, node2);
    }

    /**
     * @param {MessageEvent<import('popup-preview-frame.js').ApiMessageAny>} event
     */
    _onMessage(event) {
        if (event.origin !== this._targetOrigin) { return; }
        const {action, params} = event.data;
        const callback = () => {}; // NOP
        invokeApiMapHandler(this._windowMessageHandlers, action, params, [], callback);
    }

    /** */
    _onExampleTextClick() {
        if (this._exampleTextInput === null) { return; }
        const visible = this._exampleTextInput.hidden;
        this._exampleTextInput.hidden = !visible;
        if (!visible) { return; }
        this._exampleTextInput.focus();
        this._exampleTextInput.select();
    }

    /** */
    _onExampleTextInputBlur() {
        if (this._exampleTextInput === null) { return; }
        this._exampleTextInput.hidden = true;
    }

    /**
     * @param {Event} e
     */
    _onExampleTextInputInput(e) {
        const element = /** @type {HTMLInputElement} */ (e.currentTarget);
        this._setText(element.value, false);
    }

    /** @type {import('popup-preview-frame').ApiHandler<'setText'>} */
    _onSetText({text}) {
        this._setText(text, true);
    }

    /**
     * @param {string} text
     * @param {boolean} setInput
     */
    _setText(text, setInput) {
        if (setInput && this._exampleTextInput !== null) {
            this._exampleTextInput.value = text;
        }

        if (this._exampleText === null) { return; }

        this._exampleText.textContent = text;
        if (this._frontend === null) { return; }
        void this._updateSearch();
    }

    /**
     * @param {boolean} visible
     */
    _setInfoVisible(visible) {
        const node = document.querySelector('.placeholder-info');
        if (node === null) { return; }

        node.classList.toggle('placeholder-info-visible', visible);
    }

    /** @type {import('popup-preview-frame').ApiHandler<'setCustomCss'>} */
    _setCustomCss({css}) {
        if (this._frontend === null) { return; }
        const popup = this._frontend.popup;
        if (popup === null) { return; }
        void popup.setCustomCss(css);
    }

    /** @type {import('popup-preview-frame').ApiHandler<'setCustomOuterCss'>} */
    _setCustomOuterCss({css}) {
        if (this._frontend === null) { return; }
        const popup = this._frontend.popup;
        if (popup === null) { return; }
        void popup.setCustomOuterCss(css, false);
    }

    /** @type {import('popup-preview-frame').ApiHandler<'updateOptionsContext'>} */
    async _updateOptionsContext(details) {
        const {optionsContext} = details;
        this._optionsContext = optionsContext;
        if (this._frontend === null) { return; }
        this._frontend.setOptionsContextOverride(optionsContext);
        await this._frontend.updateOptions();
        await this._updateSearch();
    }

    /** @type {import('popup-preview-frame').ApiHandler<'setLanguageExampleText'>} */
    _setLanguageExampleText({language}) {
        const activeLanguage = /** @type {import('language').LanguageSummary} */ (this._languageSummaries.find(({iso}) => iso === language));

        if (this._exampleTextInput !== null) {
            if (language === 'ja') {
                wanakana.bind(this._exampleTextInput);
                this._wanakanaBound = true;
            } else if (this._wanakanaBound) {
                wanakana.unbind(this._exampleTextInput);
                this._wanakanaBound = false;
            }
        }

        this._exampleTextInput.lang = language;
        this._exampleTextInput.value = activeLanguage.exampleText;
        this._exampleTextInput.dispatchEvent(new Event('input'));
    }

    /** */
    async _updateSearch() {
        if (this._exampleText === null) { return; }

        const textNode = this._exampleText.firstChild;
        if (textNode === null) { return; }

        const range = document.createRange();
        range.selectNodeContents(textNode);
        const source = TextSourceRange.create(range);
        const frontend = /** @type {Frontend} */ (this._frontend);

        try {
            await frontend.setTextSource(source);
        } finally {
            source.cleanup();
        }
        this._textSource = source;
        await frontend.showContentCompleted();

        const popup = frontend.popup;
        if (popup !== null && popup.isVisibleSync()) {
            this._popupShown = true;
        }

        this._setInfoVisible(!this._popupShown);

        this._themeController.updateTheme();
    }
}
