/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
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
    constructor(id, depth, frameIdPromise) {
        this.id = id;
        this.depth = depth;
        this.frameIdPromise = frameIdPromise;
        this.frameId = null;
        this.parent = null;
        this.children = [];
        this.container = document.createElement('iframe');
        this.container.id = 'yomichan-float';
        this.container.addEventListener('mousedown', e => e.stopPropagation());
        this.container.addEventListener('scroll', e => e.stopPropagation());
        this.container.style.width = '0px';
        this.container.style.height = '0px';
        this.injectPromise = null;
        this.isInjected = false;
    }

    inject(options) {
        if (this.injectPromise === null) {
            this.injectPromise = this.createInjectPromise(options);
        }
        return this.injectPromise;
    }

    async createInjectPromise(options) {
        try {
            const {frameId} = await this.frameIdPromise;
            if (typeof frameId === 'number') {
                this.frameId = frameId;
            }
        } catch (e) {
            // NOP
        }

        return new Promise((resolve) => {
            const parent = (typeof this.frameId === 'number' ? this.frameId : '');
            this.container.setAttribute('src', chrome.extension.getURL(`/fg/float.html?id=${this.id}&depth=${this.depth}&parent=${parent}`));
            this.container.addEventListener('load', () => {
                this.invokeApi('setOptions', {
                    general: {
                        customPopupCss: options.general.customPopupCss
                    }
                });
                resolve();
            });
            this.observeFullscreen();
            this.onFullscreenChanged();
            this.isInjected = true;
        });
    }

    async show(elementRect, writingMode, options) {
        await this.inject(options);

        const optionsGeneral = options.general;
        const container = this.container;
        const containerRect = container.getBoundingClientRect();
        const getPosition = (
            writingMode === 'horizontal-tb' || optionsGeneral.popupVerticalTextPosition === 'default' ?
            Popup.getPositionForHorizontalText :
            Popup.getPositionForVerticalText
        );

        const [x, y, width, height, below] = getPosition(
            elementRect,
            Math.max(containerRect.width, optionsGeneral.popupWidth),
            Math.max(containerRect.height, optionsGeneral.popupHeight),
            document.body.clientWidth,
            window.innerHeight,
            optionsGeneral,
            writingMode
        );

        container.classList.toggle('yomichan-float-full-width', optionsGeneral.popupDisplayMode === 'full-width');
        container.classList.toggle('yomichan-float-above', !below);
        container.style.left = `${x}px`;
        container.style.top = `${y}px`;
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        container.style.visibility = 'visible';

        this.hideChildren();
    }

    static getPositionForHorizontalText(elementRect, width, height, maxWidth, maxHeight, optionsGeneral) {
        let x = elementRect.left + optionsGeneral.popupHorizontalOffset;
        const overflowX = Math.max(x + width - maxWidth, 0);
        if (overflowX > 0) {
            if (x >= overflowX) {
                x -= overflowX;
            } else {
                width = maxWidth;
                x = 0;
            }
        }

        const preferBelow = (optionsGeneral.popupHorizontalTextPosition === 'below');

        const verticalOffset = optionsGeneral.popupVerticalOffset;
        const [y, h, below] = Popup.limitGeometry(
            elementRect.top - verticalOffset,
            elementRect.bottom + verticalOffset,
            height,
            maxHeight,
            preferBelow
        );

        return [x, y, width, h, below];
    }

    static getPositionForVerticalText(elementRect, width, height, maxWidth, maxHeight, optionsGeneral, writingMode) {
        const preferRight = Popup.isVerticalTextPopupOnRight(optionsGeneral.popupVerticalTextPosition, writingMode);
        const horizontalOffset = optionsGeneral.popupHorizontalOffset2;
        const verticalOffset = optionsGeneral.popupVerticalOffset2;

        const [x, w] = Popup.limitGeometry(
            elementRect.left - horizontalOffset,
            elementRect.right + horizontalOffset,
            width,
            maxWidth,
            preferRight
        );
        const [y, h, below] = Popup.limitGeometry(
            elementRect.bottom - verticalOffset,
            elementRect.top + verticalOffset,
            height,
            maxHeight,
            true
        );
        return [x, y, w, h, below];
    }

    static isVerticalTextPopupOnRight(positionPreference, writingMode) {
        switch (positionPreference) {
            case 'before':
                return !Popup.isWritingModeLeftToRight(writingMode);
            case 'after':
                return Popup.isWritingModeLeftToRight(writingMode);
            case 'left':
                return false;
            case 'right':
                return true;
        }
    }

    static isWritingModeLeftToRight(writingMode) {
        switch (writingMode) {
            case 'vertical-lr':
            case 'sideways-lr':
                return true;
            default:
                return false;
        }
    }

    static limitGeometry(positionBefore, positionAfter, size, limit, preferAfter) {
        let after = preferAfter;
        let position = 0;
        const overflowBefore = Math.max(0, size - positionBefore);
        const overflowAfter = Math.max(0, positionAfter + size - limit);
        if (overflowAfter > 0 || overflowBefore > 0) {
            if (overflowAfter < overflowBefore) {
                size = Math.max(0, size - overflowAfter);
                position = positionAfter;
                after = true;
            } else {
                size = Math.max(0, size - overflowBefore);
                position = Math.max(0, positionBefore - size);
                after = false;
            }
        } else {
            position = preferAfter ? positionAfter : positionBefore - size;
        }

        return [position, size, after];
    }

    async showOrphaned(elementRect, writingMode, options) {
        await this.show(elementRect, writingMode, options);
        this.invokeApi('orphaned');
    }

    hide() {
        this.hideContainer();
        this.container.blur();
        this.hideChildren();
    }

    hideChildren() {
        if (this.children.length === 0) {
            return;
        }

        const targets = this.children.slice(0);
        while (targets.length > 0) {
            const target = targets.shift();
            if (target.isContainerHidden()) { continue; }

            target.hideContainer();
            for (const child of target.children) {
                targets.push(child);
            }
        }
    }

    hideContainer() {
        this.container.style.visibility = 'hidden';
    }

    isContainerHidden() {
        return (this.container.style.visibility === 'hidden');
    }

    isVisible() {
        return this.isInjected && this.container.style.visibility !== 'hidden';
    }

    setVisible(visible) {
        if (visible) {
            this.container.style.setProperty('display', '');
        } else {
            this.container.style.setProperty('display', 'none', 'important');
        }
    }

    containsPoint(point) {
        if (!this.isVisible()) {
            return false;
        }

        const rect = this.container.getBoundingClientRect();
        const contained =
            point.x >= rect.left &&
            point.y >= rect.top &&
            point.x < rect.right &&
            point.y < rect.bottom;

        return contained;
    }

    async containsPointAsync(point) {
        return containsPoint(point);
    }

    containsPointIsAsync() {
        return false;
    }

    async termsShow(elementRect, writingMode, definitions, options, context) {
        await this.show(elementRect, writingMode, options);
        this.invokeApi('termsShow', {definitions, options, context});
    }

    async kanjiShow(elementRect, writingMode, definitions, options, context) {
        await this.show(elementRect, writingMode, options);
        this.invokeApi('kanjiShow', {definitions, options, context});
    }

    clearAutoPlayTimer() {
        if (this.isInjected) {
            this.invokeApi('clearAutoPlayTimer');
        }
    }

    invokeApi(action, params={}) {
        this.container.contentWindow.postMessage({action, params}, '*');
    }

    observeFullscreen() {
        const fullscreenEvents = [
            'fullscreenchange',
            'MSFullscreenChange',
            'mozfullscreenchange',
            'webkitfullscreenchange'
        ];
        for (const eventName of fullscreenEvents) {
            document.addEventListener(eventName, () => this.onFullscreenChanged(), false);
        }
    }

    getFullscreenElement() {
        return (
            document.fullscreenElement ||
            document.msFullscreenElement ||
            document.mozFullScreenElement ||
            document.webkitFullscreenElement
        );
    }

    onFullscreenChanged() {
        const parent = (this.getFullscreenElement() || document.body || null);
        if (parent !== null && this.container.parentNode !== parent) {
            parent.appendChild(this.container);
        }
    }
}
