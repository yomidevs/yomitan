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
    constructor({node, closingAnimationDuration}) {
        super();
        this._node = node;
        this._closingAnimationDuration = closingAnimationDuration;
        this._hiddenAnimatingClass = 'hidden-animating';
        this._mutationObserver = null;
        this._visible = false;
        this._closeTimer = null;
    }

    get node() {
        return this._node;
    }

    isVisible() {
        return !this._node.hidden;
    }

    setVisible(value, animate=true) {
        value = !!value;
        if (this.isVisible() === value) { return; }

        if (this._closeTimer !== null) {
            clearTimeout(this._closeTimer);
            this._completeClose(true);
        }

        const node = this._node;
        const {classList} = node;
        if (value) {
            if (animate) { classList.add(this._hiddenAnimatingClass); }
            getComputedStyle(node).getPropertyValue('display'); // Force update of CSS display property, allowing animation
            classList.remove(this._hiddenAnimatingClass);
            node.hidden = false;
            node.focus();
        } else {
            if (animate) { classList.add(this._hiddenAnimatingClass); }
            node.hidden = true;
            if (animate) {
                this._closeTimer = setTimeout(() => this._completeClose(false), this._closingAnimationDuration);
            }
        }
    }

    on(eventName, callback) {
        if (eventName === 'visibilityChanged') {
            if (this._mutationObserver === null) {
                this._visible = this.isVisible();
                this._mutationObserver = new MutationObserver(this._onMutation.bind(this));
                this._mutationObserver.observe(this._node, {
                    attributes: true,
                    attributeFilter: ['hidden'],
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
        const visible = this.isVisible();
        if (this._visible === visible) { return; }
        this._visible = visible;
        this.trigger('visibilityChanged', {visible});
    }

    _completeClose(reopening) {
        this._closeTimer = null;
        this._node.classList.remove(this._hiddenAnimatingClass);
        this.trigger('closeCompleted', {reopening});
    }
}

class Modal extends PopupElement {
    constructor(node) {
        super({
            node,
            closingAnimationDuration: 375 // Milliseconds; includes buffer
        });
        this._contentNode = null;
        this._canCloseOnClick = false;
    }

    prepare() {
        const node = this.node;
        this._contentNode = node.querySelector('.modal-content');
        let dimmerNode = node.querySelector('.modal-content-dimmer');
        if (dimmerNode === null) { dimmerNode = node; }
        dimmerNode.addEventListener('mousedown', this._onModalContainerMouseDown.bind(this), false);
        dimmerNode.addEventListener('mouseup', this._onModalContainerMouseUp.bind(this), false);
        dimmerNode.addEventListener('click', this._onModalContainerClick.bind(this), false);

        for (const actionNode of node.querySelectorAll('[data-modal-action]')) {
            actionNode.addEventListener('click', this._onActionNodeClick.bind(this), false);
        }
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

    _onActionNodeClick(e) {
        const {modalAction} = e.currentTarget.dataset;
        switch (modalAction) {
            case 'expand':
                this._setExpanded(true);
                break;
            case 'collapse':
                this._setExpanded(false);
                break;
        }
    }

    _setExpanded(expanded) {
        if (this._contentNode === null) { return; }
        this._contentNode.classList.toggle('modal-content-full', expanded);
    }
}

class StatusFooter extends PopupElement {
    constructor(node) {
        super({
            node,
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
            target.dataset.active = 'true';
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
