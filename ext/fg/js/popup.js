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
        this.minWidth = 400;
        this.minHeight = 250;

        this.container = document.createElement('iframe');
        this.container.id = 'yomichan-popup';
        this.container.addEventListener('mousedown', e => e.stopPropagation());
        this.container.addEventListener('scroll', e => e.stopPropagation());
        this.container.setAttribute('src', chrome.extension.getURL('/fg/frame.html'));
        this.container.style.width=`${this.minWidth}px`;
        this.container.style.height=`${this.minHeight}px`;

        document.body.appendChild(this.container);
    }

    showAt(rect) {
        this.container.style.left = `${rect.x}px`;
        this.container.style.top = `${rect.y}px`;
        this.container.style.height = `${rect.height}px`;
        this.container.style.width = `${rect.width}px`;
        this.container.style.visibility = 'visible';
    }

    showNextTo(elementRect) {
        const containerStyle = window.getComputedStyle(this.container);
        const containerHeight = parseInt(containerStyle.height);
        const containerWidth = parseInt(containerStyle.width);

        const limitX = document.body.clientWidth;
        const limitY = window.innerHeight;

        let x = elementRect.left;
        let width = Math.max(containerWidth, this.minWidth);
        const overflowX = Math.max(x + width - limitX, 0);
        if (overflowX > 0) {
            if (x >= overflowX) {
                x -= overflowX;
            } else {
                width = limitX;
                x = 0;
            }
        }

        let y = 0;
        let height = Math.max(containerHeight, this.minHeight);
        const yBelow = elementRect.bottom + this.offset;
        const yAbove = elementRect.top - this.offset;
        const overflowBelow = Math.max(yBelow + height - limitY, 0);
        const overflowAbove = Math.max(height - yAbove, 0);
        if (overflowBelow > 0 || overflowAbove > 0) {
            if (overflowBelow < overflowAbove) {
                height = Math.max(height - overflowBelow, 0);
                y = yBelow;
            } else {
                height = Math.max(height - overflowAbove, 0);
                y = Math.max(yAbove - height, 0);
            }
        } else {
            y = yBelow;
        }

        this.showAt({x, y, width, height});
    }

    hide() {
        this.container.style.visibility = 'hidden';
    }

    isVisible() {
        return this.container.style.visibility !== 'hidden';
    }

    showTermDefs(definitions, options, context) {
        this.invokeApi('showTermDefs', {definitions, options, context});
    }

    showKanjiDefs(definitions, options, context) {
        this.invokeApi('showKanjiDefs', {definitions, options, context});
    }

    showOrphaned() {
        this.invokeApi('showOrphaned');
    }

    invokeApi(action, params={}) {
        this.container.contentWindow.postMessage({action, params}, '*');
    }
}
