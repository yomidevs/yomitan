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

class PopupMenu extends EventDispatcher {
    constructor(sourceElement, containerNode) {
        super();
        this._sourceElement = sourceElement;
        this._containerNode = containerNode;
        this._node = containerNode.querySelector('.popup-menu');
        this._bodyNode = containerNode.querySelector('.popup-menu-body');
        this._isClosed = false;
        this._eventListeners = new EventListenerCollection();
    }

    get sourceElement() {
        return this._sourceElement;
    }

    get containerNode() {
        return this._containerNode;
    }

    get node() {
        return this._node;
    }

    get bodyNode() {
        return this._bodyNode;
    }

    get isClosed() {
        return this._isClosed;
    }

    prepare() {
        const items = this._bodyNode.querySelectorAll('.popup-menu-item');
        this._setPosition();
        this._containerNode.focus();

        this._eventListeners.addEventListener(window, 'resize', this._onWindowResize.bind(this), false);
        this._eventListeners.addEventListener(this._containerNode, 'click', this._onMenuContainerClick.bind(this), false);

        const onMenuItemClick = this._onMenuItemClick.bind(this);
        for (const item of items) {
            this._eventListeners.addEventListener(item, 'click', onMenuItemClick, false);
        }

        PopupMenu.openMenus.add(this);

        this._sourceElement.dispatchEvent(new CustomEvent('menuOpen', {
            bubbles: false,
            cancelable: false,
            detail: {menu: this}
        }));
    }

    close(cancelable=true) {
        return this._close(null, 'close', cancelable);
    }

    // Private

    _onMenuContainerClick(e) {
        if (e.currentTarget !== e.target) { return; }
        this._close(null, 'outside', true);
    }

    _onMenuItemClick(e) {
        const item = e.currentTarget;
        if (item.disabled) { return; }
        this._close(item, 'item', true);
    }

    _onWindowResize() {
        this._close(null, 'resize', true);
    }

    _setPosition() {
        // Get flags
        let horizontal = 1;
        let vertical = 1;
        let horizontalCover = 1;
        let verticalCover = 1;
        const positionInfo = this._sourceElement.dataset.menuPosition;
        if (typeof positionInfo === 'string') {
            const positionInfoSet = new Set(positionInfo.split(' '));

            if (positionInfoSet.has('left')) {
                horizontal = -1;
            } else if (positionInfoSet.has('right')) {
                horizontal = 1;
            } else if (positionInfoSet.has('h-center')) {
                horizontal = 0;
            }

            if (positionInfoSet.has('above')) {
                vertical = -1;
            } else if (positionInfoSet.has('below')) {
                vertical = 1;
            } else if (positionInfoSet.has('v-center')) {
                vertical = 0;
            }

            if (positionInfoSet.has('cover')) {
                horizontalCover = 1;
                verticalCover = 1;
            } else if (positionInfoSet.has('no-cover')) {
                horizontalCover = -1;
                verticalCover = -1;
            }

            if (positionInfoSet.has('h-cover')) {
                horizontalCover = 1;
            } else if (positionInfoSet.has('no-h-cover')) {
                horizontalCover = -1;
            }

            if (positionInfoSet.has('v-cover')) {
                verticalCover = 1;
            } else if (positionInfoSet.has('no-v-cover')) {
                verticalCover = -1;
            }
        }

        // Position
        const menu = this._node;
        const fullRect = this._containerNode.getBoundingClientRect();
        const sourceRect = this._sourceElement.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        let top = menuRect.top;
        let bottom = menuRect.bottom;
        if (verticalCover === 1) {
            const bodyRect = this._bodyNode.getBoundingClientRect();
            top = bodyRect.top;
            bottom = bodyRect.bottom;
        }

        let x = (
            sourceRect.left +
            sourceRect.width * ((-horizontal * horizontalCover + 1) * 0.5) +
            menuRect.width * ((-horizontal + 1) * -0.5)
        );
        let y = (
            sourceRect.top +
            (menuRect.top - top) +
            sourceRect.height * ((-vertical * verticalCover + 1) * 0.5) +
            (bottom - top) * ((-vertical + 1) * -0.5)
        );

        x = Math.max(0.0, Math.min(fullRect.width - menuRect.width, x));
        y = Math.max(0.0, Math.min(fullRect.height - menuRect.height, y));

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
    }

    _close(item, cause, cancelable) {
        if (this._isClosed) { return true; }
        const action = (item !== null ? item.dataset.menuAction : null);

        const detail = {
            menu: this,
            item,
            action,
            cause
        };
        const result = this._sourceElement.dispatchEvent(new CustomEvent('menuClose', {bubbles: false, cancelable, detail}));
        if (cancelable && !result) { return false; }

        PopupMenu.openMenus.delete(this);

        this._isClosed = true;
        this._eventListeners.removeAllEventListeners();
        if (this._containerNode.parentNode !== null) {
            this._containerNode.parentNode.removeChild(this._containerNode);
        }

        this.trigger('close', detail);
        return true;
    }
}

Object.defineProperty(PopupMenu, 'openMenus', {
    configurable: false,
    enumerable: true,
    writable: false,
    value: new Set()
});
