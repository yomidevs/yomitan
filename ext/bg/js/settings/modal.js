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

class Modal extends EventDispatcher {
    constructor(node) {
        super();
        this._node = node;
        this._mutationObserver = null;
        this._visible = false;
        this._visibleClassName = 'modal-container-open';
        this._openingClassName = 'modal-container-opening';
        this._closingClassName = 'modal-container-closing';
        this._closingAnimationDuration = 375; // Milliseconds; includes buffer
        this._closeTimer = null;
    }

    get node() {
        return this._node;
    }

    isVisible() {
        return this._node.classList.contains(this._visibleClassName);
    }

    setVisible(value, animate=true) {
        value = !!value;
        const {classList} = this._node;
        if (classList.contains(this._visibleClassName) === value) { return; }

        if (this._closeTimer !== null) {
            clearTimeout(this._closeTimer);
            this._closeTimer = null;
        }

        if (value) {
            if (animate) { classList.add(this._openingClassName); }
            classList.remove(this._closingClassName);
            getComputedStyle(this._node).getPropertyValue('display'); // Force update of CSS display property, allowing animation
            classList.add(this._visibleClassName);
            if (animate) { classList.remove(this._openingClassName); }
            this._node.focus();
        } else {
            if (animate) { classList.add(this._closingClassName); }
            classList.remove(this._visibleClassName);
            if (animate) {
                this._closeTimer = setTimeout(() => {
                    this._closeTimer = null;
                    classList.remove(this._closingClassName);
                }, this._closingAnimationDuration);
            }
        }
    }

    on(eventName, callback) {
        if (eventName === 'visibilityChanged') {
            if (this._mutationObserver === null) {
                this._visible = this._node.classList.contains(this._visibleClassName);
                this._mutationObserver = new MutationObserver(this._onMutation.bind(this));
                this._mutationObserver.observe(this._node, {
                    attributes: true,
                    attributeFilter: ['class'],
                    attributeOldValue: true
                });
            }
        }
        return super.on(eventName, callback);
    }

    off(eventName, callback) {
        const result = super.off(eventName, callback);
        if (eventName === 'visibilityChanged' && !this.hasListeners(eventName)) {
            if (this._mutationObserver !== null) {
                this._mutationObserver.disconnect();
                this._mutationObserver = null;
            }
        }
        return result;
    }

    // Private

    _onModalHide() {
        this.trigger('visibilityChanged', {visible: false});
    }

    _onModalShow() {
        this.trigger('visibilityChanged', {visible: true});
    }

    _onMutation() {
        const visible = this._node.classList.contains(this._visibleClassName);
        if (this._visible === visible) { return; }
        this._visible = visible;
        this.trigger('visibilityChanged', {visible});
    }
}
