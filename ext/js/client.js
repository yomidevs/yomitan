/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
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


class Client {
    constructor() {
        this.popupOffset = 10;
        this.lastMosePos = null;
        this.enabled     = false;
        this.options     = null;

        this.popup = document.createElement('div');
        this.popup.classList.add('yomichan-popup');
        this.popup.addEventListener('mousedown', (e) => e.stopPropagation());
        this.popup.addEventListener('scroll', (e) => e.stopPropagation());
        document.body.appendChild(this.popup);

        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('scroll', (e) => this.hidePopup());
        window.addEventListener('resize', (e) => this.hidePopup());

        getState((state) => this.setEnabled(state === 'enabled'));
    }

    onKeyDown(e) {
        if (this.enabled && this.lastMousePos !== null && (e.keyCode === 16 || e.charCode === 16)) {
            this.searchAtPoint(this.lastMousePos);
        }
    }

    onMouseMove(e) {
        this.lastMousePos = {x: e.clientX, y: e.clientY};
        if (this.enabled && (e.shiftKey || e.which === 2)) {
            this.searchAtPoint(this.lastMousePos);
        }
    }

    onMouseDown(e) {
        this.lastMousePos = {x: e.clientX, y: e.clientY};
        if (this.enabled && (e.shiftKey || e.which === 2)) {
            this.searchAtPoint(this.lastMousePos);
        } else {
            this.hidePopup();
        }
    }

    onMessage({name, value}, sender, callback) {
        switch (name) {
            case 'state':
                this.setEnabled(value === 'enabled');
                break;
            case 'options':
                this.setOptions(value);
                break;
        }

        callback();
    }

    searchAtPoint(point) {
        const range = getRangeAtPoint(point, 10);
        if (range === null) {
            this.hidePopup();
            return;
        }

        const rect = getRangePaddedRect(range);
        if (point.x < rect.left || point.x > rect.right) {
            this.hidePopup();
            return;
        }

        findTerm(range.toString(), ({results, length}) => {
            if (length === 0) {
                this.hidePopup();
            } else {
                range.setEnd(range.endContainer, range.startOffset + length);
                renderTemplate({defs: results}, 'defs.html', (html) => {
                    this.popup.innerHTML = html;
                    this.showPopup(range);
                });
            }
        });
    }

    showPopup(range) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        const pos = getPopupPositionForRange(this.popup, range, this.popupOffset);

        this.popup.style.left       = pos.x + 'px';
        this.popup.style.top        = pos.y + 'px';
        this.popup.style.visibility = 'visible';
    }

    hidePopup() {
        if (this.popup.style.visibility !== 'hidden') {
            const selection = window.getSelection();
            selection.removeAllRanges();
            this.popup.style.visibility = 'hidden';
        }
    }

    setEnabled(enabled) {
        if (!(this.enabled = enabled)) {
            this.hidePopup();
        }
    }

    setOptions(opts) {
        this.options = opts;
    }
}

window.yomiClient = new Client();
