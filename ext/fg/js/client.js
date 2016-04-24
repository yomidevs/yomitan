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
        this.popup        = new Popup();
        this.lastMousePos = null;
        this.lastRange    = null;
        this.enabled      = false;
        this.options      = {};

        chrome.runtime.onMessage.addListener(this.onBgMessage.bind(this));
        window.addEventListener('message', this.onFrameMessage.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('scroll', (e) => this.hidePopup());
        window.addEventListener('resize', (e) => this.hidePopup());

        getOptions((opts) => {
            this.setOptions(opts);
            getState((state) => this.setEnabled(state === 'enabled'));
        });
    }

    onKeyDown(e) {
        if (this.enabled && this.lastMousePos !== null && (e.keyCode === 16 || e.charCode === 16)) {
            this.searchAt(this.lastMousePos);
        }
    }

    onMouseMove(e) {
        this.lastMousePos = {x: e.clientX, y: e.clientY};
        if (this.enabled && (e.shiftKey || e.which === 2)) {
            this.searchAt(this.lastMousePos);
        }
    }

    onMouseDown(e) {
        this.lastMousePos = {x: e.clientX, y: e.clientY};
        if (this.enabled && (e.shiftKey || e.which === 2)) {
            this.searchAt(this.lastMousePos);
        } else {
            this.hidePopup();
        }
    }

    onBgMessage({name, value}, sender, callback) {
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

    onFrameMessage(e) {
        // const {action, data} = e.data;
        // switch (action) {
        // }
    }

    searchAt(point) {
        const range = Range.fromPoint(point);
        if (range === null || !range.containsPoint(point)) {
            this.popup.hide();
            return;
        }

        range.setLength(this.options.scanLength);

        if (this.lastRange !== null && this.lastRange.equals(range)) {
            return;
        }

        findTerm(range.text(), ({results, length}) => {
            if (length === 0) {
                this.hidePopup();
            } else {
                const params = {
                    defs: results,
                    root: chrome.extension.getURL('fg')
                };

                renderText(
                    params,
                    'term-list.html',
                    (content) => this.showPopup(range, length, content)
                );
            }
        });
    }

    showPopup(range, length, content) {
        this.popup.showNextTo(range, content);

        if (this.options.highlightText) {
            range.select(length);
        }

        this.lastRange = range;
    }

    hidePopup() {
        this.popup.hide();

        if (this.options.highlightText && this.lastRange !== null) {
            this.lastRange.deselect();
        }

        this.lastRange = null;
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
