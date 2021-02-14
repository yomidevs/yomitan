/*
 * Copyright (C) 2017-2021  Yomichan Authors
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

class DisplayNotification {
    constructor(container, node) {
        this._container = container;
        this._node = node;
        this._body = node.querySelector('.footer-notification-body');
        this._closeButton = node.querySelector('.footer-notification-close-button');
        this._eventListeners = new EventListenerCollection();
        this._closeTimer = null;
    }

    open() {
        if (!this.isClosed()) { return; }

        this._clearTimer();

        const node = this._node;
        this._container.appendChild(node);
        const style = getComputedStyle(node);
        node.hidden = true;
        style.getPropertyValue('opacity'); // Force CSS update, allowing animation
        node.hidden = false;
        this._eventListeners.addEventListener(this._closeButton, 'click', this._onCloseButtonClick.bind(this), false);
    }

    close(animate=false) {
        if (this.isClosed()) { return; }

        if (animate) {
            if (this._closeTimer !== null) { return; }

            this._node.hidden = true;
            this._closeTimer = setTimeout(this._onDelayClose.bind(this), 200);
        } else {
            this._clearTimer();

            this._eventListeners.removeAllEventListeners();
            const parent = this._node.parentNode;
            if (parent !== null) {
                parent.removeChild(this._node);
            }
        }
    }

    setContent(value) {
        if (typeof value === 'string') {
            this._body.textContent = value;
        } else {
            this._body.textContent = '';
            this._body.appendChild(value);
        }
    }

    isClosing() {
        return this._closeTimer !== null;
    }

    isClosed() {
        return this._node.parentNode === null;
    }

    // Private

    _onCloseButtonClick() {
        this.close(true);
    }

    _onDelayClose() {
        this._closeTimer = null;
        this.close(false);
    }

    _clearTimer() {
        if (this._closeTimer !== null) {
            clearTimeout(this._closeTimer);
            this._closeTimer = null;
        }
    }
}
