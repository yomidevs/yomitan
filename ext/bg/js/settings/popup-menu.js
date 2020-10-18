/*
 * Copyright (C) 2020  Yomichan Authors
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
    constructor(sourceElement, container) {
        super();
        this._sourceElement = sourceElement;
        this._container = container;
        this._menu = container.querySelector('.popup-menu');
        this._isClosed = false;
        this._eventListeners = new EventListenerCollection();
    }

    get isClosed() {
        return this._isClosed;
    }

    prepare() {
        const items = this._menu.querySelectorAll('.popup-menu-item');
        this._setPosition(items);
        this._container.focus();

        this._eventListeners.addEventListener(window, 'resize', this._onWindowResize.bind(this), false);
        this._eventListeners.addEventListener(this._container, 'click', this._onMenuContainerClick.bind(this), false);

        const onMenuItemClick = this._onMenuItemClick.bind(this);
        for (const item of items) {
            this._eventListeners.addEventListener(item, 'click', onMenuItemClick, false);
        }

        this._sourceElement.dispatchEvent(new CustomEvent('menuOpened', {
            bubbles: false,
            cancelable: false,
            detail: {
                popupMenu: this,
                container: this._container,
                menu: this._menu
            }
        }));
    }

    close() {
        return this._close(null, 'close');
    }

    // Private

    _onMenuContainerClick(e) {
        if (e.currentTarget !== e.target) { return; }
        this._close(null, 'outside');
    }

    _onMenuItemClick(e) {
        const item = e.currentTarget;
        if (item.disabled) { return; }
        this._close(item, 'item');
    }

    _onWindowResize() {
        this._close(null, 'resize');
    }

    _setPosition(items) {
        // Get flags
        let horizontal = 1;
        let vertical = 1;
        let horizontalCover = 1;
        let verticalCover = 1;
        const positionInfo = this._sourceElement.dataset.menuPosition;
        if (typeof positionInfo === 'string') {
            const positionInfoSet = new Set(positionInfo.split(','));

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
        const menu = this._menu;
        const fullRect = this._container.getBoundingClientRect();
        const sourceRect = this._sourceElement.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        let top = menuRect.top;
        let bottom = menuRect.bottom;
        if (verticalCover === 1 && items.length > 0) {
            const rect1 = items[0].getBoundingClientRect();
            const rect2 = items[items.length - 1].getBoundingClientRect();
            top = rect1.top;
            bottom = rect2.bottom;
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

    _close(item, cause) {
        if (this._isClosed) { return true; }
        const action = (item !== null ? item.dataset.menuAction : null);

        const result = this._sourceElement.dispatchEvent(new CustomEvent('menuClosed', {
            bubbles: false,
            cancelable: true,
            detail: {
                popupMenu: this,
                container: this._container,
                menu: this._menu,
                item,
                action,
                cause
            }
        }));
        if (!result) { return false; }

        this._eventListeners.removeAllEventListeners();
        if (this._container.parentNode !== null) {
            this._container.parentNode.removeChild(this._container);
        }

        this.trigger('closed', {
            popupMenu: this,
            container: this._container,
            menu: this._menu,
            item,
            action,
            cause
        });
        return true;
    }
}
