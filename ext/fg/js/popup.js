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
        this.container = null;
        this.offset = 10;
    }

    show(rect, content) {
        this.inject();

        this.container.style.left = rect.x + 'px';
        this.container.style.top = rect.y + 'px';
        this.container.style.height = rect.height + 'px';
        this.container.style.width = rect.width + 'px';
        this.container.style.visibility = 'visible';

        this.setContent(content);
    }

    showNextTo(elementRect, content) {
        this.inject();

        const containerRect = this.container.getBoundingClientRect();

        let x = elementRect.left;
        let width = containerRect.width;
        if (x + width >= window.innerWidth) {
            const widthMax = window.innerWidth - x;
            width = Math.min(width, widthMax);
            x = window.innerWidth - width;
        }

        let y = elementRect.bottom + this.offset;
        let height = containerRect.height;
        if (y + height >= window.innerHeight) {
            const heightMax = window.innerHeight - y - this.offset;
            height = Math.min(height, heightMax);
            y = elementRect.top - height - this.offset;
        }

        this.show({x, y, width, height}, content);
    }

    visible() {
        return this.container !== null && this.container.style.visibility !== 'hidden';
    }

    hide() {
        if (this.container !== null) {
            this.container.style.visibility = 'hidden';
        }
    }

    setContent(content) {
        if (this.container === null) {
            return;
        }

        this.container.contentWindow.scrollTo(0, 0);

        const doc = this.container.contentDocument;
        doc.open();
        doc.write(content);
        doc.close();
    }

    invokeApi(action, params) {
        if (this.container !== null) {
            this.container.contentWindow.postMessage({action, params}, '*');
        }
    }

    inject() {
        if (this.container !== null) {
            return;
        }

        this.container = document.createElement('iframe');
        this.container.id = 'yomichan-popup';
        this.container.addEventListener('mousedown', e => e.stopPropagation());
        this.container.addEventListener('scroll', e => e.stopPropagation());

        document.body.appendChild(this.container);
    }
}
