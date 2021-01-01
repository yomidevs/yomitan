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
 * PanelElement
 */

class StatusFooter extends PanelElement {
    constructor(node) {
        super({
            node,
            closingAnimationDuration: 375 // Milliseconds; includes buffer
        });
        this._body = node.querySelector('.status-footer');
    }

    prepare() {
        this.on('closeCompleted', this._onCloseCompleted.bind(this), false);
        this._body.querySelector('.status-footer-header-close').addEventListener('click', this._onCloseClick.bind(this), false);
    }

    getTaskContainer(selector) {
        return this._body.querySelector(selector);
    }

    isTaskActive(selector) {
        const target = this.getTaskContainer(selector);
        return (target !== null && target.dataset.active);
    }

    setTaskActive(selector, active) {
        const target = this.getTaskContainer(selector);
        if (target === null) { return; }

        const activeElements = new Set();
        for (const element of this._body.querySelectorAll('.status-footer-item')) {
            if (element.dataset.active) {
                activeElements.add(element);
            }
        }

        if (active) {
            target.dataset.active = 'true';
            if (!this.isVisible()) {
                this.setVisible(true);
            }
            target.hidden = false;
        } else {
            delete target.dataset.active;
            if (activeElements.size <= 1) {
                this.setVisible(false);
            }
        }
    }

    // Private

    _onCloseClick(e) {
        e.preventDefault();
        this.setVisible(false);
    }

    _onCloseCompleted() {
        for (const element of this._body.querySelectorAll('.status-footer-item')) {
            if (!element.dataset.active) {
                element.hidden = true;
            }
        }
    }
}
