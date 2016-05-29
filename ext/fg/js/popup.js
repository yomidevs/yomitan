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


class Popup {
    constructor() {
        this.popup  = null;
        this.offset = 10;
    }

    showAt(pos, content) {
        this.inject();

        this.popup.style.left       = pos.x + 'px';
        this.popup.style.top        = pos.y + 'px';
        this.popup.style.visibility = 'visible';

        this.setContent(content);
    }

    showNextTo(elementRect, content) {
        this.inject();

        const popupRect = this.popup.getBoundingClientRect();

        let posX = elementRect.left;
        if (posX + popupRect.width >= window.innerWidth) {
            posX = window.innerWidth - popupRect.width;
        }

        let posY = elementRect.bottom + this.offset;
        if (posY + popupRect.height >= window.innerHeight) {
            posY = elementRect.top - popupRect.height - this.offset;
        }

        this.showAt({x: posX, y: posY}, content);
    }

    hide() {
        if (this.popup !== null) {
            this.popup.style.visibility = 'hidden';
        }
    }

    setContent(content) {
        if (this.popup === null) {
            return;
        }

        const doc = this.popup.contentDocument;
        doc.open();
        doc.write(content);
        doc.close();
    }

    sendMessage(action, params, callback) {
        if (this.popup !== null) {
            this.popup.contentWindow.postMessage({action, params}, '*');
        }
    }

    inject() {
        if (this.popup !== null) {
            return;
        }

        this.popup = document.createElement('iframe');
        this.popup.id = 'yomichan-popup';
        this.popup.addEventListener('mousedown', (e) => e.stopPropagation());
        this.popup.addEventListener('scroll', (e) => e.stopPropagation());

        document.body.appendChild(this.popup);
    }
}
