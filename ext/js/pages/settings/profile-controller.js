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
 * ProfileConditionsUI
 */

class ProfileController {
    constructor(settingsController, modalController) {
        this._settingsController = settingsController;
        this._modalController = modalController;
        this._profileConditionsUI = new ProfileConditionsUI(settingsController);
        this._profileConditionsIndex = null;
        this._profileActiveSelect = null;
        this._profileTargetSelect = null;
        this._profileCopySourceSelect = null;
        this._removeProfileNameElement = null;
        this._profileAddButton = null;
        this._profileRemoveConfirmButton = null;
        this._profileCopyConfirmButton = null;
        this._profileEntryListContainer = null;
        this._profileConditionsProfileName = null;
        this._profileRemoveModal = null;
        this._profileCopyModal = null;
        this._profileConditionsModal = null;
        this._profileEntriesSupported = false;
        this._profileEntryList = [];
        this._profiles = [];
        this._profileCurrent = 0;
    }

    get profileCount() {
        return this._profiles.length;
    }

    get profileCurrentIndex() {
        return this._profileCurrent;
    }

    async prepare() {
        const {platform: {os}} = await yomichan.api.getEnvironmentInfo();
        this._profileConditionsUI.os = os;

        this._profileActiveSelect = document.querySelector('#profile-active-select');
        this._profileTargetSelect = document.querySelector('#profile-target-select');
        this._profileCopySourceSelect = document.querySelector('#profile-copy-source-select');
        this._removeProfileNameElement = document.querySelector('#profile-remove-name');
        this._profileAddButton = document.querySelector('#profile-add-button');
        this._profileRemoveConfirmButton = document.querySelector('#profile-remove-confirm-button');
        this._profileCopyConfirmButton = document.querySelector('#profile-copy-confirm-button');
        this._profileEntryListContainer = document.querySelector('#profile-entry-list');
        this._profileConditionsProfileName = document.querySelector('#profile-conditions-profile-name');
        this._profileRemoveModal = this._modalController.getModal('profile-remove');
        this._profileCopyModal = this._modalController.getModal('profile-copy');
        this._profileConditionsModal = this._modalController.getModal('profile-conditions');

        this._profileEntriesSupported = (this._profileEntryListContainer !== null);

        if (this._profileActiveSelect !== null) { this._profileActiveSelect.addEventListener('change', this._onProfileActiveChange.bind(this), false); }
        if (this._profileTargetSelect !== null) { this._profileTargetSelect.addEventListener('change', this._onProfileTargetChange.bind(this), false); }
        if (this._profileAddButton !== null) { this._profileAddButton.addEventListener('click', this._onAdd.bind(this), false); }
        if (this._profileRemoveConfirmButton !== null) { this._profileRemoveConfirmButton.addEventListener('click', this._onDeleteConfirm.bind(this), false); }
        if (this._profileCopyConfirmButton !== null) { this._profileCopyConfirmButton.addEventListener('click', this._onCopyConfirm.bind(this), false); }

        this._profileConditionsUI.on('conditionGroupCountChanged', this._onConditionGroupCountChanged.bind(this));
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
        this._onOptionsChanged();
    }

    async moveProfile(profileIndex, offset) {
        if (this._getProfile(profileIndex) === null) { return; }

        const profileIndexNew = Math.max(0, Math.min(this._profiles.length - 1, profileIndex + offset));
        if (profileIndex === profileIndexNew) { return; }

        await this.swapProfiles(profileIndex, profileIndexNew);
    }

    async setProfileName(profileIndex, value) {
        const profile = this._getProfile(profileIndex);
        if (profile === null) { return; }

        profile.name = value;
        this._updateSelectName(profileIndex, value);

        const profileEntry = this._getProfileEntry(profileIndex);
        if (profileEntry !== null) { profileEntry.setName(value); }

        await this._settingsController.setGlobalSetting(`profiles[${profileIndex}].name`, value);
    }

    async setDefaultProfile(profileIndex) {
        const profile = this._getProfile(profileIndex);
        if (profile === null) { return; }

        this._profileActiveSelect.value = `${profileIndex}`;
        this._profileCurrent = profileIndex;

        const profileEntry = this._getProfileEntry(profileIndex);
        if (profileEntry !== null) { profileEntry.setIsDefault(true); }

        await this._settingsController.setGlobalSetting('profileCurrent', profileIndex);
    }

    async copyProfile(sourceProfileIndex, destinationProfileIndex) {
        const sourceProfile = this._getProfile(sourceProfileIndex);
        if (sourceProfile === null || !this._getProfile(destinationProfileIndex)) { return; }

        const options = clone(sourceProfile.options);
        this._profiles[destinationProfileIndex].options = options;

        this._updateProfileSelectOptions();

        const destinationProfileEntry = this._getProfileEntry(destinationProfileIndex);
        if (destinationProfileEntry !== null) {
            destinationProfileEntry.updateState();
        }

        await this._settingsController.modifyGlobalSettings([{
            action: 'set',
            path: `profiles[${destinationProfileIndex}].options`,
            value: options
        }]);

        await this._settingsController.refresh();
    }

    async duplicateProfile(profileIndex) {
        const profile = this._getProfile(profileIndex);
        if (this.profile === null) { return; }

        // Create new profile
        const newProfile = clone(profile);
        newProfile.name = this._createCopyName(profile.name, this._profiles, 100);

        // Update state
        const index = this._profiles.length;
        this._profiles.push(newProfile);
        if (this._profileEntriesSupported) {
            this._addProfileEntry(index);
        }
        this._updateProfileSelectOptions();

        // Modify settings
        await this._settingsController.modifyGlobalSettings([{
            action: 'splice',
            path: 'profiles',
            start: index,
            deleteCount: 0,
            items: [newProfile]
        }]);

        // Update profile index
        this._settingsController.profileIndex = index;
    }

    async deleteProfile(profileIndex) {
        const profile = this._getProfile(profileIndex);
        if (profile === null || this.profileCount <= 1) { return; }

        // Get indices
        let profileCurrentNew = this._profileCurrent;
        const settingsProfileIndex = this._settingsController.profileIndex;

        // Construct settings modifications
        const modifications = [{
            action: 'splice',
            path: 'profiles',
            start: profileIndex,
            deleteCount: 1,
            items: []
        }];
        if (profileCurrentNew >= profileIndex) {
            profileCurrentNew = Math.min(profileCurrentNew - 1, this._profiles.length - 1);
            modifications.push({
                action: 'set',
                path: 'profileCurrent',
                value: profileCurrentNew
            });
        }

        // Update state
        this._profileCurrent = profileCurrentNew;

        this._profiles.splice(profileIndex, 1);

        if (profileIndex < this._profileEntryList.length) {
            const profileEntry = this._profileEntryList[profileIndex];
            profileEntry.cleanup();
            this._profileEntryList.splice(profileIndex, 1);

            for (let i = profileIndex, ii = this._profileEntryList.length; i < ii; ++i) {
                this._profileEntryList[i].index = i;
            }
        }

        const profileEntry2 = this._getProfileEntry(profileCurrentNew);
        if (profileEntry2 !== null) {
            profileEntry2.setIsDefault(true);
        }

        this._updateProfileSelectOptions();

        // Modify settings
        await this._settingsController.modifyGlobalSettings(modifications);

        // Update profile index
        if (settingsProfileIndex === profileIndex) {
            this._settingsController.profileIndex = profileCurrentNew;
        }
    }

    async swapProfiles(index1, index2) {
        const profile1 = this._getProfile(index1);
        const profile2 = this._getProfile(index2);
        if (profile1 === null || profile2 === null || index1 === index2) { return; }

        // Get swapped indices
        const profileCurrent = this._profileCurrent;
        const profileCurrentNew = this._getSwappedValue(profileCurrent, index1, index2);

        const settingsProfileIndex = this._settingsController.profileIndex;
        const settingsProfileIndexNew = this._getSwappedValue(settingsProfileIndex, index1, index2);

        // Construct settings modifications
        const modifications = [{
            action: 'swap',
            path1: `profiles[${index1}]`,
            path2: `profiles[${index2}]`
        }];
        if (profileCurrentNew !== profileCurrent) {
            modifications.push({
                action: 'set',
                path: 'profileCurrent',
                value: profileCurrentNew
            });
        }

        // Update state
        this._profileCurrent = profileCurrentNew;

        this._profiles[index1] = profile2;
        this._profiles[index2] = profile1;

        const entry1 = this._getProfileEntry(index1);
        const entry2 = this._getProfileEntry(index2);
        if (entry1 !== null && entry2 !== null) {
            entry1.index = index2;
            entry2.index = index1;
            this._swapDomNodes(entry1.node, entry2.node);
            this._profileEntryList[index1] = entry2;
            this._profileEntryList[index2] = entry1;
        }

        this._updateProfileSelectOptions();

        // Modify settings
        await this._settingsController.modifyGlobalSettings(modifications);

        // Update profile index
        if (settingsProfileIndex !== settingsProfileIndexNew) {
            this._settingsController.profileIndex = settingsProfileIndexNew;
        }
    }

    openDeleteProfileModal(profileIndex) {
        const profile = this._getProfile(profileIndex);
        if (profile === null || this.profileCount <= 1) { return; }

        this._removeProfileNameElement.textContent = profile.name;
        this._profileRemoveModal.node.dataset.profileIndex = `${profileIndex}`;
        this._profileRemoveModal.setVisible(true);
    }

    openCopyProfileModal(profileIndex) {
        const profile = this._getProfile(profileIndex);
        if (profile === null || this.profileCount <= 1) { return; }

        let copyFromIndex = this._profileCurrent;
        if (copyFromIndex === profileIndex) {
            if (profileIndex !== 0) {
                copyFromIndex = 0;
            } else if (this.profileCount > 1) {
                copyFromIndex = 1;
            }
        }

        const profileIndexString = `${profileIndex}`;
        for (const option of this._profileCopySourceSelect.querySelectorAll('option')) {
            const {value} = option;
            option.disabled = (value === profileIndexString);
        }
        this._profileCopySourceSelect.value = `${copyFromIndex}`;

        this._profileCopyModal.node.dataset.profileIndex = `${profileIndex}`;
        this._profileCopyModal.setVisible(true);
    }

    openProfileConditionsModal(profileIndex) {
        const profile = this._getProfile(profileIndex);
        if (profile === null) { return; }

        if (this._profileConditionsModal === null) { return; }
        this._profileConditionsModal.setVisible(true);

        this._profileConditionsUI.cleanup();
        this._profileConditionsIndex = profileIndex;
        this._profileConditionsUI.prepare(profileIndex);
        if (this._profileConditionsProfileName !== null) {
            this._profileConditionsProfileName.textContent = profile.name;
        }
    }

    // Private

    async _onOptionsChanged() {
        // Update state
        const {profiles, profileCurrent} = await this._settingsController.getOptionsFull();
        this._profiles = profiles;
        this._profileCurrent = profileCurrent;

        const settingsProfileIndex = this._settingsController.profileIndex;

        // Udpate UI
        this._updateProfileSelectOptions();

        this._profileActiveSelect.value = `${profileCurrent}`;
        this._profileTargetSelect.value = `${settingsProfileIndex}`;

        // Update profile conditions
        this._profileConditionsUI.cleanup();
        const conditionsProfile = this._getProfile(this._profileConditionsIndex !== null ? this._profileConditionsIndex : settingsProfileIndex);
        if (conditionsProfile !== null) {
            this._profileConditionsUI.prepare(settingsProfileIndex);
        }

        // Udpate profile entries
        for (const entry of this._profileEntryList) {
            entry.cleanup();
        }
        this._profileEntryList = [];
        if (this._profileEntriesSupported) {
            for (let i = 0, ii = profiles.length; i < ii; ++i) {
                this._addProfileEntry(i);
            }
        }
    }

    _onProfileActiveChange(e) {
        const value = this._tryGetValidProfileIndex(e.currentTarget.value);
        if (value === null) { return; }
        this.setDefaultProfile(value);
    }

    _onProfileTargetChange(e) {
        const value = this._tryGetValidProfileIndex(e.currentTarget.value);
        if (value === null) { return; }
        this._settingsController.profileIndex = value;
    }

    _onAdd() {
        this.duplicateProfile(this._settingsController.profileIndex);
    }

    _onDeleteConfirm() {
        const modal = this._profileRemoveModal;
        modal.setVisible(false);
        const {node} = modal;
        let profileIndex = node.dataset.profileIndex;
        delete node.dataset.profileIndex;

        profileIndex = this._tryGetValidProfileIndex(profileIndex);
        if (profileIndex === null) { return; }

        this.deleteProfile(profileIndex);
    }

    _onCopyConfirm() {
        const modal = this._profileCopyModal;
        modal.setVisible(false);
        const {node} = modal;
        let destinationProfileIndex = node.dataset.profileIndex;
        delete node.dataset.profileIndex;

        destinationProfileIndex = this._tryGetValidProfileIndex(destinationProfileIndex);
        if (destinationProfileIndex === null) { return; }

        const sourceProfileIndex = this._tryGetValidProfileIndex(this._profileCopySourceSelect.value);
        if (sourceProfileIndex === null) { return; }

        this.copyProfile(sourceProfileIndex, destinationProfileIndex);
    }

    _onConditionGroupCountChanged({count, profileIndex}) {
        if (profileIndex >= 0 && profileIndex < this._profileEntryList.length) {
            const profileEntry = this._profileEntryList[profileIndex];
            profileEntry.setConditionGroupsCount(count);
        }
    }

    _addProfileEntry(profileIndex) {
        const profile = this._profiles[profileIndex];
        const node = this._settingsController.instantiateTemplate('profile-entry');
        const entry = new ProfileEntry(this, node);
        this._profileEntryList.push(entry);
        entry.prepare(profile, profileIndex);
        this._profileEntryListContainer.appendChild(node);
    }

    _updateProfileSelectOptions() {
        for (const select of this._getAllProfileSelects()) {
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < this._profiles.length; ++i) {
                const profile = this._profiles[i];
                const option = document.createElement('option');
                option.value = `${i}`;
                option.textContent = profile.name;
                fragment.appendChild(option);
            }
            select.textContent = '';
            select.appendChild(fragment);
        }
    }

    _updateSelectName(index, name) {
        const optionValue = `${index}`;
        for (const select of this._getAllProfileSelects()) {
            for (const option of select.querySelectorAll('option')) {
                if (option.value === optionValue) {
                    option.textContent = name;
                }
            }
        }
    }

    _getAllProfileSelects() {
        return [
            this._profileActiveSelect,
            this._profileTargetSelect,
            this._profileCopySourceSelect
        ];
    }

    _tryGetValidProfileIndex(stringValue) {
        if (typeof stringValue !== 'string') { return null; }
        const intValue = parseInt(stringValue, 10);
        return (
            Number.isFinite(intValue) &&
            intValue >= 0 &&
            intValue < this.profileCount ?
            intValue : null
        );
    }

    _createCopyName(name, profiles, maxUniqueAttempts) {
        let space, index, prefix, suffix;
        const match = /^([\w\W]*\(Copy)((\s+)(\d+))?(\)\s*)$/.exec(name);
        if (match === null) {
            prefix = `${name} (Copy`;
            space = '';
            index = '';
            suffix = ')';
        } else {
            prefix = match[1];
            suffix = match[5];
            if (typeof match[2] === 'string') {
                space = match[3];
                index = parseInt(match[4], 10) + 1;
            } else {
                space = ' ';
                index = 2;
            }
        }

        let i = 0;
        while (true) {
            const newName = `${prefix}${space}${index}${suffix}`;
            if (i++ >= maxUniqueAttempts || profiles.findIndex((profile) => profile.name === newName) < 0) {
                return newName;
            }
            if (typeof index !== 'number') {
                index = 2;
                space = ' ';
            } else {
                ++index;
            }
        }
    }

    _getSwappedValue(currentValue, value1, value2) {
        if (currentValue === value1) { return value2; }
        if (currentValue === value2) { return value1; }
        return currentValue;
    }

    _getProfile(profileIndex) {
        return (profileIndex >= 0 && profileIndex < this._profiles.length ? this._profiles[profileIndex] : null);
    }

    _getProfileEntry(profileIndex) {
        return (profileIndex >= 0 && profileIndex < this._profileEntryList.length ? this._profileEntryList[profileIndex] : null);
    }

    _swapDomNodes(node1, node2) {
        const parent1 = node1.parentNode;
        const parent2 = node2.parentNode;
        const next1 = node1.nextSibling;
        const next2 = node2.nextSibling;
        if (node2 !== next1) { parent1.insertBefore(node2, next1); }
        if (node1 !== next2) { parent2.insertBefore(node1, next2); }
    }
}

class ProfileEntry {
    constructor(profileController, node) {
        this._profileController = profileController;
        this._node = node;
        this._profile = null;
        this._index = 0;
        this._isDefaultRadio = null;
        this._nameInput = null;
        this._countLink = null;
        this._countText = null;
        this._menuButton = null;
        this._eventListeners = new EventListenerCollection();
    }

    get index() {
        return this._index;
    }

    set index(value) {
        this._index = value;
    }

    get node() {
        return this._node;
    }

    prepare(profile, index) {
        this._profile = profile;
        this._index = index;

        const node = this._node;
        this._isDefaultRadio = node.querySelector('.profile-entry-is-default-radio');
        this._nameInput = node.querySelector('.profile-entry-name-input');
        this._countLink = node.querySelector('.profile-entry-condition-count-link');
        this._countText = node.querySelector('.profile-entry-condition-count');
        this._menuButton = node.querySelector('.profile-entry-menu-button');

        this.updateState();

        this._eventListeners.addEventListener(this._isDefaultRadio, 'change', this._onIsDefaultRadioChange.bind(this), false);
        this._eventListeners.addEventListener(this._nameInput, 'input', this._onNameInputInput.bind(this), false);
        this._eventListeners.addEventListener(this._countLink, 'click', this._onConditionsCountLinkClick.bind(this), false);
        this._eventListeners.addEventListener(this._menuButton, 'menuOpen', this._onMenuOpen.bind(this), false);
        this._eventListeners.addEventListener(this._menuButton, 'menuClose', this._onMenuClose.bind(this), false);
    }

    cleanup() {
        this._eventListeners.removeAllEventListeners();
        if (this._node.parentNode !== null) {
            this._node.parentNode.removeChild(this._node);
        }
    }

    setName(value) {
        if (this._nameInput.value === value) { return; }
        this._nameInput.value = value;
    }

    setIsDefault(value) {
        this._isDefaultRadio.checked = value;
    }

    updateState() {
        this._nameInput.value = this._profile.name;
        this._countText.textContent = `${this._profile.conditionGroups.length}`;
        this._isDefaultRadio.checked = (this._index === this._profileController.profileCurrentIndex);
    }

    setConditionGroupsCount(count) {
        this._countText.textContent = `${count}`;
    }

    // Private

    _onIsDefaultRadioChange(e) {
        if (!e.currentTarget.checked) { return; }
        this._profileController.setDefaultProfile(this._index);
    }

    _onNameInputInput(e) {
        const name = e.currentTarget.value;
        this._profileController.setProfileName(this._index, name);
    }

    _onConditionsCountLinkClick() {
        this._profileController.openProfileConditionsModal(this._index);
    }

    _onMenuOpen(e) {
        const bodyNode = e.detail.menu.bodyNode;
        const count = this._profileController.profileCount;
        this._setMenuActionEnabled(bodyNode, 'moveUp', this._index > 0);
        this._setMenuActionEnabled(bodyNode, 'moveDown', this._index < count - 1);
        this._setMenuActionEnabled(bodyNode, 'copyFrom', count > 1);
        this._setMenuActionEnabled(bodyNode, 'delete', count > 1);
    }

    _onMenuClose(e) {
        switch (e.detail.action) {
            case 'moveUp':
                this._profileController.moveProfile(this._index, -1);
                break;
            case 'moveDown':
                this._profileController.moveProfile(this._index, 1);
                break;
            case 'copyFrom':
                this._profileController.openCopyProfileModal(this._index);
                break;
            case 'editConditions':
                this._profileController.openProfileConditionsModal(this._index);
                break;
            case 'duplicate':
                this._profileController.duplicateProfile(this._index);
                break;
            case 'delete':
                this._profileController.openDeleteProfileModal(this._index);
                break;
        }
    }

    _setMenuActionEnabled(menu, action, enabled) {
        const element = menu.querySelector(`[data-menu-action="${action}"]`);
        if (element === null) { return; }
        element.disabled = !enabled;
    }
}
