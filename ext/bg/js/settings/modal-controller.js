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

/* global
 * Modal
 */

class ModalController {
    constructor() {
        this._modals = [];
        this._modalMap = new Map();
    }

    prepare() {
        for (const node of document.querySelectorAll('.modal')) {
            const {id} = node;
            const modal = new Modal(node);
            this._modalMap.set(id, modal);
            this._modals.push(modal);
        }

        for (const node of document.querySelectorAll('.modal-container')) {
            const {id} = node;
            const modal = new Modal(node);
            this._modalMap.set(id, modal);
            this._modals.push(modal);
            node.addEventListener('click', this._onModalContainerClick.bind(this, modal), false);
        }
    }

    getModal(name) {
        const modal = this._modalMap.get(name);
        return (typeof modal !== 'undefined' ? modal : null);
    }

    getTopVisibleModal() {
        for (let i = this._modals.length - 1; i >= 0; --i) {
            const modal = this._modals[i];
            if (modal.isVisible()) {
                return modal;
            }
        }
        return null;
    }

    // Private

    _onModalContainerClick(modal, e) {
        if (e.currentTarget !== e.target) { return; }
        modal.setVisible(false);
    }
}
