/*
 * Copyright (C) 2020-2021  Yomichan Authors
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
 * PopupMenu
 * SelectorObserver
 */

class SettingsDisplayController {
    constructor(settingsController, modalController) {
        this._settingsController = settingsController;
        this._modalController = modalController;
        this._contentNode = null;
        this._menuContainer = null;
        this._onMoreToggleClickBind = null;
        this._onMenuButtonClickBind = null;
    }

    prepare() {
        this._contentNode = document.querySelector('.content');
        this._menuContainer = document.querySelector('#popup-menus');

        const onFabButtonClick = this._onFabButtonClick.bind(this);
        for (const fabButton of document.querySelectorAll('.fab-button')) {
            fabButton.addEventListener('click', onFabButtonClick, false);
        }

        const onModalAction = this._onModalAction.bind(this);
        for (const node of document.querySelectorAll('[data-modal-action]')) {
            node.addEventListener('click', onModalAction, false);
        }

        const onSelectOnClickElementClick = this._onSelectOnClickElementClick.bind(this);
        for (const node of document.querySelectorAll('[data-select-on-click]')) {
            node.addEventListener('click', onSelectOnClickElementClick, false);
        }

        const onInputTabActionKeyDown = this._onInputTabActionKeyDown.bind(this);
        for (const node of document.querySelectorAll('[data-tab-action]')) {
            node.addEventListener('keydown', onInputTabActionKeyDown, false);
        }

        const onSpecialUrlLinkClick = this._onSpecialUrlLinkClick.bind(this);
        const onSpecialUrlLinkMouseDown = this._onSpecialUrlLinkMouseDown.bind(this);
        for (const node of document.querySelectorAll('[data-special-url]')) {
            node.addEventListener('click', onSpecialUrlLinkClick, false);
            node.addEventListener('auxclick', onSpecialUrlLinkClick, false);
            node.addEventListener('mousedown', onSpecialUrlLinkMouseDown, false);
        }

        for (const node of document.querySelectorAll('.defer-load-iframe')) {
            this._setupDeferLoadIframe(node);
        }

        this._onMoreToggleClickBind = this._onMoreToggleClick.bind(this);
        const moreSelectorObserver = new SelectorObserver({
            selector: '.more-toggle',
            onAdded: this._onMoreSetup.bind(this),
            onRemoved: this._onMoreCleanup.bind(this)
        });
        moreSelectorObserver.observe(document.documentElement, false);

        this._onMenuButtonClickBind = this._onMenuButtonClick.bind(this);
        const menuSelectorObserver = new SelectorObserver({
            selector: '[data-menu]',
            onAdded: this._onMenuSetup.bind(this),
            onRemoved: this._onMenuCleanup.bind(this)
        });
        menuSelectorObserver.observe(document.documentElement, false);

        window.addEventListener('keydown', this._onKeyDown.bind(this), false);
        window.addEventListener('popstate', this._onPopState.bind(this), false);
        this._updateScrollTarget();
    }

    // Private

    _onMoreSetup(element) {
        element.addEventListener('click', this._onMoreToggleClickBind, false);
        return null;
    }

    _onMoreCleanup(element) {
        element.removeEventListener('click', this._onMoreToggleClickBind, false);
    }

    _onMenuSetup(element) {
        element.addEventListener('click', this._onMenuButtonClickBind, false);
        return null;
    }

    _onMenuCleanup(element) {
        element.removeEventListener('click', this._onMenuButtonClickBind, false);
    }

    _onMenuButtonClick(e) {
        const element = e.currentTarget;
        const {menu} = element.dataset;
        this._showMenu(element, menu);
    }

    _onFabButtonClick(e) {
        const action = e.currentTarget.dataset.action;
        switch (action) {
            case 'toggle-sidebar':
                document.body.classList.toggle('sidebar-visible');
                break;
            case 'toggle-preview-sidebar':
                document.body.classList.toggle('preview-sidebar-visible');
                break;
        }
    }

    _onMoreToggleClick(e) {
        const container = this._getMoreContainer(e.currentTarget);
        if (container === null) { return; }

        const more = container.querySelector('.more');
        if (more === null) { return; }

        const moreVisible = more.hidden;
        more.hidden = !moreVisible;
        for (const moreToggle of container.querySelectorAll('.more-toggle')) {
            const container2 = this._getMoreContainer(moreToggle);
            if (container2 === null) { continue; }

            const more2 = container2.querySelector('.more');
            if (more2 === null || more2 !== more) { continue; }

            moreToggle.dataset.expanded = `${moreVisible}`;
        }

        e.preventDefault();
        return false;
    }

    _onPopState() {
        this._updateScrollTarget();
    }

    _onKeyDown(e) {
        switch (e.code) {
            case 'Escape':
                if (!this._isElementAnInput(document.activeElement)) {
                    this._closeTopMenuOrModal();
                    e.preventDefault();
                }
                break;
        }
    }

    _onModalAction(e) {
        const node = e.currentTarget;
        const {modalAction} = node.dataset;
        if (typeof modalAction !== 'string') { return; }

        let [action, target] = modalAction.split(',');
        if (typeof target === 'undefined') {
            const currentModal = node.closest('.modal');
            if (currentModal === null) { return; }
            target = currentModal;
        }

        const modal = this._modalController.getModal(target);
        if (modal === null) { return; }

        switch (action) {
            case 'show':
                modal.setVisible(true);
                break;
            case 'hide':
                modal.setVisible(false);
                break;
            case 'toggle':
                modal.setVisible(!modal.isVisible());
                break;
        }

        e.preventDefault();
    }

    _onSelectOnClickElementClick(e) {
        if (e.button !== 0) { return; }

        const node = e.currentTarget;
        const range = document.createRange();
        range.selectNode(node);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    _onInputTabActionKeyDown(e) {
        if (e.key !== 'Tab' || e.ctrlKey) { return; }

        const node = e.currentTarget;
        const {tabAction} = node.dataset;
        if (typeof tabAction !== 'string') { return; }

        const args = tabAction.split(',');
        switch (args[0]) {
            case 'ignore':
                e.preventDefault();
                break;
            case 'indent':
                e.preventDefault();
                this._indentInput(e, node, args);
                break;
        }
    }

    _onSpecialUrlLinkClick(e) {
        switch (e.button) {
            case 0:
            case 1:
                e.preventDefault();
                this._createTab(e.currentTarget.dataset.specialUrl, true);
                break;
        }
    }

    _onSpecialUrlLinkMouseDown(e) {
        switch (e.button) {
            case 0:
            case 1:
                e.preventDefault();
                break;
        }
    }

    async _createTab(url, useOpener) {
        let openerTabId;
        if (useOpener) {
            try {
                const tab = await new Promise((resolve, reject) => {
                    chrome.tabs.getCurrent((result) => {
                        const e = chrome.runtime.lastError;
                        if (e) {
                            reject(new Error(e.message));
                        } else {
                            resolve(result);
                        }
                    });
                });
                openerTabId = tab.id;
            } catch (e) {
                // NOP
            }
        }

        return await new Promise((resolve, reject) => {
            chrome.tabs.create({url, openerTabId}, (tab2) => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve(tab2);
                }
            });
        });
    }

    _updateScrollTarget() {
        const hash = window.location.hash;
        if (!hash.startsWith('#!')) { return; }

        const content = this._contentNode;
        const target = document.getElementById(hash.substring(2));
        if (content === null || target === null) { return; }

        const rect1 = content.getBoundingClientRect();
        const rect2 = target.getBoundingClientRect();
        content.scrollTop += rect2.top - rect1.top;
    }

    _getMoreContainer(link) {
        const v = link.dataset.parentDistance;
        const distance = v ? parseInt(v, 10) : 1;
        if (Number.isNaN(distance)) { return null; }

        for (let i = 0; i < distance; ++i) {
            link = link.parentNode;
            if (link === null) { break; }
        }
        return link;
    }

    _closeTopMenuOrModal() {
        for (const popupMenu of PopupMenu.openMenus) {
            popupMenu.close();
            return;
        }

        const modal = this._modalController.getTopVisibleModal();
        if (modal !== null) {
            modal.setVisible(false);
        }
    }

    _showMenu(element, menuName) {
        const menu = this._settingsController.instantiateTemplate(menuName);
        if (menu === null) { return; }

        this._menuContainer.appendChild(menu);

        const popupMenu = new PopupMenu(element, menu);
        popupMenu.prepare();
    }

    _indentInput(e, node, args) {
        let indent = '\t';
        if (args.length > 1) {
            const count = parseInt(args[1], 10);
            indent = (Number.isFinite(count) && count >= 0 ? ' '.repeat(count) : args[1]);
        }

        const {selectionStart: start, selectionEnd: end, value} = node;
        const lineStart = value.substring(0, start).lastIndexOf('\n') + 1;
        const lineWhitespace = /^[ \t]*/.exec(value.substring(lineStart))[0];

        if (e.shiftKey) {
            const whitespaceLength = Math.max(0, Math.floor((lineWhitespace.length - 1) / 4) * 4);
            const selectionStartNew = lineStart + whitespaceLength;
            const selectionEndNew = lineStart + lineWhitespace.length;
            const removeCount = selectionEndNew - selectionStartNew;
            if (removeCount > 0) {
                node.selectionStart = selectionStartNew;
                node.selectionEnd = selectionEndNew;
                document.execCommand('delete', false);
                node.selectionStart = Math.max(lineStart, start - removeCount);
                node.selectionEnd = Math.max(lineStart, end - removeCount);
            }
        } else {
            if (indent.length > 0) {
                const indentLength = (Math.ceil((start - lineStart + 1) / indent.length) * indent.length - (start - lineStart));
                document.execCommand('insertText', false, indent.substring(0, indentLength));
            }
        }
    }

    _isElementAnInput(element) {
        const type = element !== null ? element.nodeName.toUpperCase() : null;
        switch (type) {
            case 'INPUT':
            case 'TEXTAREA':
            case 'SELECT':
                return true;
            default:
                return false;
        }
    }

    _setupDeferLoadIframe(element) {
        const parent = this._getMoreContainer(element);
        if (parent === null) { return; }

        let mutationObserver = null;
        const callback = () => {
            if (!this._isElementVisible(element)) { return false; }

            const src = element.dataset.src;
            delete element.dataset.src;
            element.src = src;

            if (mutationObserver === null) { return true; }

            mutationObserver.disconnect();
            mutationObserver = null;
            return true;
        };

        if (callback()) { return; }

        mutationObserver = new MutationObserver(callback);
        mutationObserver.observe(parent, {attributes: true});
    }

    _isElementVisible(element) {
        return (element.offsetParent !== null);
    }
}
