/*
 * Copyright (C) 2021  Yomichan Authors
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
 * DisplayNotification
 */

class OptionToggleHotkeyHandler {
    constructor(display) {
        this._display = display;
        this._notification = null;
        this._notificationHideTimer = null;
        this._notificationHideTimeout = 5000;
    }

    get notificationHideTimeout() {
        return this._notificationHideTimeout;
    }

    set notificationHideTimeout(value) {
        this._notificationHideTimeout = value;
    }

    prepare() {
        this._display.hotkeyHandler.registerActions([
            ['toggleOption', this._onHotkeyActionToggleOption.bind(this)]
        ]);
    }

    // Private

    _onHotkeyActionToggleOption(argument) {
        this._toggleOption(argument);
    }

    async _toggleOption(path) {
        let value;
        try {
            const optionsContext = this._display.getOptionsContext();

            const result = (await yomichan.api.getSettings([{
                scope: 'profile',
                path,
                optionsContext
            }]))[0];
            const {error} = result;
            if (typeof error !== 'undefined') {
                throw deserializeError(error);
            }

            value = result.result;
            if (typeof value !== 'boolean') {
                throw new Error(`Option value of type ${typeof value} cannot be toggled`);
            }

            value = !value;

            const result2 = (await yomichan.api.modifySettings([{
                scope: 'profile',
                action: 'set',
                path,
                value,
                optionsContext
            }]))[0];
            const {error: error2} = result2;
            if (typeof error2 !== 'undefined') {
                throw deserializeError(error2);
            }

            this._showNotification(this._createSuccessMessage(path, value), true);
        } catch (e) {
            this._showNotification(this._createErrorMessage(path, e), false);
        }
    }

    _createSuccessMessage(path, value) {
        const fragment = document.createDocumentFragment();
        const n1 = document.createElement('em');
        n1.textContent = path;
        const n2 = document.createElement('strong');
        n2.textContent = value;
        fragment.appendChild(document.createTextNode('Option '));
        fragment.appendChild(n1);
        fragment.appendChild(document.createTextNode(' changed to '));
        fragment.appendChild(n2);
        return fragment;
    }

    _createErrorMessage(path, error) {
        let message;
        try {
            ({message} = error);
        } catch (e) {
            // NOP
        }
        if (typeof message !== 'string') {
            message = `${error}`;
        }

        const fragment = document.createDocumentFragment();
        const n1 = document.createElement('em');
        n1.textContent = path;
        const n2 = document.createElement('div');
        n2.textContent = message;
        n2.className = 'danger-text';
        fragment.appendChild(document.createTextNode('Failed to toggle option '));
        fragment.appendChild(n1);
        fragment.appendChild(document.createTextNode(': '));
        fragment.appendChild(n2);
        return fragment;
    }

    _showNotification(message, autoClose) {
        if (this._notification === null) {
            const node = this._display.displayGenerator.createEmptyFooterNotification();
            node.addEventListener('click', this._onNotificationClick.bind(this), false);
            this._notification = new DisplayNotification(this._display.notificationContainer, node);
        }

        this._notification.setContent(message);
        this._notification.open();

        this._stopHideNotificationTimer();
        if (autoClose) {
            this._notificationHideTimer = setTimeout(this._onNotificationHideTimeout.bind(this), this._notificationHideTimeout);
        }
    }

    _hideNotification(animate) {
        if (this._notification === null) { return; }
        this._notification.close(animate);
        this._stopHideNotificationTimer();
    }

    _stopHideNotificationTimer() {
        if (this._notificationHideTimer !== null) {
            clearTimeout(this._notificationHideTimer);
            this._notificationHideTimer = null;
        }
    }

    _onNotificationHideTimeout() {
        this._notificationHideTimer = null;
        this._hideNotification(true);
    }

    _onNotificationClick() {
        this._stopHideNotificationTimer();
    }
}
