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

/**
 * A void popup with no functionality, usable as a placeholder.
 */
class PopupVoid {
    constructor(id, depth, frameId, ownerFrameId) {
        this._id = id;
        this._depth = depth;
        this._frameId = frameId;
        this._ownerFrameId = ownerFrameId;
        this._parent = null;
        this._child = null;
    }

    // Public properties

    get id() {
        return this._id;
    }

    get parent() {
        return this._parent;
    }

    set parent(value) {
        this._parent = value;
    }

    get child() {
        return this._child;
    }

    set child(value) {
        this._child = value;
    }

    get depth() {
        return this._depth;
    }

    get frameContentWindow() {
        return null;
    }

    get container() {
        return null;
    }

    // Public functions

    prepare() {
        // NOP
    }

    async setOptionsContext(_optionsContext, _source) {
        // NOP
    }

    hide(_changeFocus) {
        // NOP
    }

    async isVisible() {
        return false;
    }

    setVisibleOverride(_visible) {
        // NOP
    }

    async containsPoint(_x, _y) {
        return false;
    }

    async showContent(_details, _displayDetails) {
        // NOP
    }

    setCustomCss(_css) {
        // NOP
    }

    clearAutoPlayTimer() {
        // NOP
    }

    setContentScale(_scale) {
        // NOP
    }

    isVisibleSync() {
        return false;
    }

    updateTheme() {
        // NOP
    }

    async setCustomOuterCss(_css, _useWebExtensionApi) {
        return null;
    }

    setChildrenSupported(_value) {
        // NOP
    }

    getFrameRect() {
        return new DOMRect(0, 0, 0, 0);
    }
}
