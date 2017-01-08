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
        this.offset = 10;

        this.container = document.createElement('iframe');
        this.container.id = 'yomichan-popup';
        this.container.addEventListener('mousedown', e => e.stopPropagation());
        this.container.addEventListener('scroll', e => e.stopPropagation());
        this.container.setAttribute('src', chrome.extension.getURL('fg/frame.html'));

        document.body.appendChild(this.container);
    }

    showAt(rect) {
        this.container.style.left = rect.x + 'px';
        this.container.style.top = rect.y + 'px';
        this.container.style.height = rect.height + 'px';
        this.container.style.width = rect.width + 'px';
        this.container.style.visibility = 'visible';
    }

    showNextTo(elementRect) {
        const containerStyle = window.getComputedStyle(this.container);
        const containerHeight = parseInt(containerStyle.height);
        const containerWidth = parseInt(containerStyle.width);

        let x = elementRect.left;
        let width = containerWidth;
        if (x + width >= window.innerWidth) {
            const widthMax = window.innerWidth - x;
            width = Math.min(width, widthMax);
            x = window.innerWidth - width;
        }

        let y = elementRect.bottom + this.offset;
        let height = containerHeight;
        if (y + height >= window.innerHeight) {
            const heightMax = window.innerHeight - y - this.offset;
            height = Math.min(height, heightMax);
            y = elementRect.top - height - this.offset;
        }

        this.showAt({x, y, width, height});
    }

    hide() {
        this.container.style.visibility = 'hidden';
    }

    isVisible() {
        return this.container.style.visibility !== 'hidden';
    }

    showTermDefs(definitions, options) {
        this.invokeApi('showTermDefs', {definitions, options});
    }

    showKanjiDefs(definitions, options) {
        this.invokeApi('showKanjiDefs', {definitions, options});
    }

    invokeApi(action, params) {
        this.container.contentWindow.postMessage({action, params}, '*');
    }
}
