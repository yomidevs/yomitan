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
        this._eventListeners = new EventListenerCollection();
        this._mutationObserver = null;
        this._visible = false;
        this._visibleClassName = 'modal-container-open';
    }

    get node() {
        return this._node;
    }

    isVisible() {
        if (this._useJqueryModal()) {
            return !!(this._getWrappedNode().data('bs.modal') || {}).isShown;
        } else {
            return this._node.classList.contains(this._visibleClassName);
        }
    }

    setVisible(value) {
        value = !!value;
        if (this._useJqueryModal()) {
            this._getWrappedNode().modal(value ? 'show' : 'hide');
        } else {
            const {classList} = this._node;
            if (classList.contains(this._visibleClassName) === value) { return; }
            classList.toggle(this._visibleClassName, value);
            if (value) { this._node.focus(); }
        }
    }

    on(eventName, callback) {
        if (eventName === 'visibilityChanged') {
            if (this._useJqueryModal()) {
                if (this._eventListeners.size === 0) {
                    const wrappedNode = this._getWrappedNode();
                    this._eventListeners.on(wrappedNode, 'hidden.bs.modal', this._onModalHide.bind(this));
                    this._eventListeners.on(wrappedNode, 'shown.bs.modal', this._onModalShow.bind(this));
                }
            } else {
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
            this._eventListeners.removeAllEventListeners();
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

    _useJqueryModal() {
        return (typeof jQuery !== 'undefined');
    }

    _getWrappedNode() {
        return $(this._node);
    }
}
