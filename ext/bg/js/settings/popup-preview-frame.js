/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


class SettingsPopupPreview {
    constructor() {
        this.frontend = null;
        this.apiOptionsGetOld = apiOptionsGet;
        this.popupInjectOuterStylesheetOld = Popup.injectOuterStylesheet;
        this.popupShown = false;
        this.themeChangeTimeout = null;
        this.textSource = null;
    }

    static create() {
        const instance = new SettingsPopupPreview();
        instance.prepare();
        return instance;
    }

    async prepare() {
        // Setup events
        window.addEventListener('resize', (e) => this.onWindowResize(e), false);
        window.addEventListener('message', (e) => this.onMessage(e), false);

        const themeDarkCheckbox = document.querySelector('#theme-dark-checkbox');
        if (themeDarkCheckbox !== null) {
            themeDarkCheckbox.addEventListener('change', () => this.onThemeDarkCheckboxChanged(themeDarkCheckbox), false);
        }

        // Overwrite API functions
        window.apiOptionsGet = (...args) => this.apiOptionsGet(...args);

        // Overwrite frontend
        this.frontend = Frontend.create();
        window.yomichan_frontend = this.frontend;

        this.frontend.setEnabled = function () {};
        this.frontend.searchClear = function () {};

        this.frontend.popup.setChildrenSupported(false);

        await this.frontend.isPrepared();

        // Overwrite popup
        Popup.injectOuterStylesheet = (...args) => this.popupInjectOuterStylesheet(...args);

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

    popupInjectOuterStylesheet(...args) {
        // This simulates the stylesheet priorities when injecting using the web extension API.
        const result = this.popupInjectOuterStylesheetOld(...args);

        const outerStylesheet = Popup.outerStylesheet;
        const node = document.querySelector('#client-css');
        if (node !== null && outerStylesheet !== null) {
            node.parentNode.insertBefore(outerStylesheet, node);
        }

        return result;
    }

    onWindowResize() {
        if (this.frontend === null) { return; }
        const textSource = this.textSource;
        if (textSource === null) { return; }

        const elementRect = textSource.getRect();
        const writingMode = textSource.getWritingMode();
        this.frontend.popup.showContent(elementRect, writingMode);
    }

    onMessage(e) {
        const {action, params} = e.data;
        const handler = SettingsPopupPreview._messageHandlers.get(action);
        if (typeof handler !== 'function') { return; }

        handler(this, params);
    }

    onThemeDarkCheckboxChanged(node) {
        document.documentElement.classList.toggle('dark', node.checked);
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
        this.frontend.popup.setCustomOuterCss(css, true);
    }

    async updateSearch() {
        const exampleText = document.querySelector('#example-text');
        if (exampleText === null) { return; }

        const textNode = exampleText.firstChild;
        if (textNode === null) { return; }

        const range = document.createRange();
        range.selectNode(textNode);
        const source = new TextSourceRange(range, range.toString(), null);

        try {
            await this.frontend.onSearchSource(source, 'script');
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

SettingsPopupPreview._messageHandlers = new Map([
    ['setText', (self, {text}) => self.setText(text)],
    ['setCustomCss', (self, {css}) => self.setCustomCss(css)],
    ['setCustomOuterCss', (self, {css}) => self.setCustomOuterCss(css)]
]);

SettingsPopupPreview.instance = SettingsPopupPreview.create();



