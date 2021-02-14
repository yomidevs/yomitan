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

/* global
 * PanelElement
 */

class DisplayProfileSelection {
    constructor(display) {
        this._display = display;
        this._profielList = document.querySelector('#profile-list');
        this._profileButton = document.querySelector('#profile-button');
        this._profilePanel = new PanelElement({
            node: document.querySelector('#profile-panel'),
            closingAnimationDuration: 375 // Milliseconds; includes buffer
        });
        this._profileListNeedsUpdate = false;
        this._eventListeners = new EventListenerCollection();
        this._source = generateId(16);
    }

    async prepare() {
        yomichan.on('optionsUpdated', this._onOptionsUpdated.bind(this));
        this._profileButton.addEventListener('click', this._onProfileButtonClick.bind(this), false);
        this._profileListNeedsUpdate = true;
    }

    // Private

    _onOptionsUpdated({source}) {
        if (source === this._source) { return; }
        this._profileListNeedsUpdate = true;
        if (this._profilePanel.isVisible()) {
            this._updateProfileList();
        }
    }

    _onProfileButtonClick(e) {
        e.preventDefault();
        e.stopPropagation();
        this._setProfilePanelVisible(!this._profilePanel.isVisible());
    }

    _setProfilePanelVisible(visible) {
        this._profilePanel.setVisible(visible);
        this._profileButton.classList.toggle('sidebar-button-highlight', visible);
        document.documentElement.dataset.profilePanelVisible = `${visible}`;
        if (visible && this._profileListNeedsUpdate) {
            this._updateProfileList();
        }
    }

    async _updateProfileList() {
        this._profileListNeedsUpdate = false;
        const options = await yomichan.api.optionsGetFull();

        this._eventListeners.removeAllEventListeners();
        const displayGenerator = this._display.displayGenerator;

        const {profileCurrent, profiles} = options;
        const fragment = document.createDocumentFragment();
        for (let i = 0, ii = profiles.length; i < ii; ++i) {
            const {name} = profiles[i];
            const entry = displayGenerator.createProfileListItem();
            const radio = entry.querySelector('.profile-entry-is-default-radio');
            radio.checked = (i === profileCurrent);
            const nameNode = entry.querySelector('.profile-list-item-name');
            nameNode.textContent = name;
            fragment.appendChild(entry);
            this._eventListeners.addEventListener(radio, 'change', this._onProfileRadioChange.bind(this, i), false);
        }
        this._profielList.textContent = '';
        this._profielList.appendChild(fragment);
    }

    _onProfileRadioChange(index, e) {
        if (e.currentTarget.checked) {
            this._setProfileCurrent(index);
        }
    }

    async _setProfileCurrent(index) {
        await yomichan.api.modifySettings([{
            action: 'set',
            path: 'profileCurrent',
            value: index,
            scope: 'global'
        }], this._source);
        this._setProfilePanelVisible(false);
    }
}
