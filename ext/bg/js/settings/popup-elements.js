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

class PopupElement extends EventDispatcher {
    constructor({node, visibleClassName, openingClassName, closingClassName, closingAnimationDuration}) {
        super();
        this._node = node;
        this._visibleClassName = visibleClassName;
        this._openingClassName = openingClassName;
        this._closingClassName = closingClassName;
        this._closingAnimationDuration = closingAnimationDuration;
        this._mutationObserver = null;
        this._visible = false;
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
            this._completeClose(classList, true);
        }

        if (value) {
            if (animate) { classList.add(this._openingClassName); }
            getComputedStyle(this._node).getPropertyValue('display'); // Force update of CSS display property, allowing animation
            classList.add(this._visibleClassName);
            if (animate) { classList.remove(this._openingClassName); }
            this._node.focus();
        } else {
            if (animate) { classList.add(this._closingClassName); }
            classList.remove(this._visibleClassName);
            if (animate) {
                this._closeTimer = setTimeout(() => this._completeClose(classList, false), this._closingAnimationDuration);
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

    _onMutation() {
        const visible = this._node.classList.contains(this._visibleClassName);
        if (this._visible === visible) { return; }
        this._visible = visible;
        this.trigger('visibilityChanged', {visible});
    }

    _completeClose(classList, reopening) {
        this._closeTimer = null;
        classList.remove(this._closingClassName);
        this.trigger('closeCompleted', {reopening});
    }
}

class Modal extends PopupElement {
    constructor(node) {
        super({
            node,
            visibleClassName: 'modal-container-open',
            openingClassName: 'modal-container-opening',
            closingClassName: 'modal-container-closing',
            closingAnimationDuration: 375 // Milliseconds; includes buffer
        });
        this._canCloseOnClick = false;
    }

    prepare() {
        const node = this._node;
        node.addEventListener('mousedown', this._onModalContainerMouseDown.bind(this), false);
        node.addEventListener('mouseup', this._onModalContainerMouseUp.bind(this), false);
        node.addEventListener('click', this._onModalContainerClick.bind(this), false);
    }

    // Private

    _onModalContainerMouseDown(e) {
        this._canCloseOnClick = (e.currentTarget === e.target);
    }

    _onModalContainerMouseUp(e) {
        if (!this._canCloseOnClick) { return; }
        this._canCloseOnClick = (e.currentTarget === e.target);
    }

    _onModalContainerClick(e) {
        if (!this._canCloseOnClick) { return; }
        this._canCloseOnClick = false;
        if (e.currentTarget !== e.target) { return; }
        this.setVisible(false);
    }
}

class StatusFooter extends PopupElement {
    constructor(node) {
        super({
            node,
            visibleClassName: 'status-footer-container-open',
            openingClassName: 'status-footer-container-opening',
            closingClassName: 'status-footer-container-closing',
            closingAnimationDuration: 375 // Milliseconds; includes buffer
        });
        this._body = node.querySelector('.status-footer');
    }

    prepare() {
        this.on('closeCompleted', this._onCloseCompleted.bind(this), false);
        this._body.querySelector('.status-footer-header-close').addEventListener('click', this._onCloseClick.bind(this), false);
    }

    getTaskContainer(selector) {
        return this._body.querySelector(selector);
    }

    isTaskActive(selector) {
        const target = this.getTaskContainer(selector);
        return (target !== null && target.dataset.active);
    }

    setTaskActive(selector, active) {
        const target = this.getTaskContainer(selector);
        if (target === null) { return; }

        const activeElements = new Set();
        for (const element of this._body.querySelectorAll('.status-footer-item')) {
            if (element.dataset.active) {
                activeElements.add(element);
            }
        }

        if (active) {
            target.dataset.active = true;
            if (!this.isVisible()) {
                this.setVisible(true);
            }
            target.hidden = false;
        } else {
            delete target.dataset.active;
            if (activeElements.size <= 1) {
                this.setVisible(false);
            }
        }
    }

    // Private

    _onCloseClick(e) {
        e.preventDefault();
        this.setVisible(false);
    }

    _onCloseCompleted() {
        for (const element of this._body.querySelectorAll('.status-footer-item')) {
            if (!element.dataset.active) {
                element.hidden = true;
            }
        }
    }
}
