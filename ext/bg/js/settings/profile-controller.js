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
 * ProfileConditionsUI
 * api
 */

class ProfileController {
    constructor(settingsController, modalController) {
        this._settingsController = settingsController;
        this._modalController = modalController;
        this._profileConditionsUI = new ProfileConditionsUI(settingsController);
        this._profileActiveSelect = null;
        this._profileTargetSelect = null;
        this._profileCopySourceSelect = null;
        this._profileNameInput = null;
        this._removeProfileNameElement = null;
        this._profileRemoveButton = null;
        this._profileCopyButton = null;
        this._profileMoveUpButton = null;
        this._profileMoveDownButton = null;
        this._profileRemoveModal = null;
        this._profileCopyModal = null;
        this._optionsFull = null;
    }

    async prepare() {
        const {platform: {os}} = await api.getEnvironmentInfo();
        this._profileConditionsUI.os = os;

        this._profileActiveSelect = document.querySelector('#profile-active');
        this._profileTargetSelect = document.querySelector('#profile-target');
        this._profileCopySourceSelect = document.querySelector('#profile-copy-source');
        this._profileNameInput = document.querySelector('#profile-name');
        this._removeProfileNameElement = document.querySelector('#profile-remove-modal-profile-name');
        this._profileRemoveButton = document.querySelector('#profile-remove');
        this._profileCopyButton = document.querySelector('#profile-copy');
        this._profileMoveUpButton = document.querySelector('#profile-move-up');
        this._profileMoveDownButton = document.querySelector('#profile-move-down');
        this._profileRemoveModal = this._modalController.getModal('profile-remove-modal');
        this._profileCopyModal = this._modalController.getModal('profile-copy-modal');

        this._profileActiveSelect.addEventListener('change', this._onProfileActiveChange.bind(this), false);
        this._profileTargetSelect.addEventListener('change', this._onProfileTargetChange.bind(this), false);
        this._profileNameInput.addEventListener('change', this._onNameChanged.bind(this), false);
        document.querySelector('#profile-add').addEventListener('click', this._onAdd.bind(this), false);
        this._profileRemoveButton.addEventListener('click', this._onRemove.bind(this), false);
        document.querySelector('#profile-remove-confirm').addEventListener('click', this._onRemoveConfirm.bind(this), false);
        this._profileCopyButton.addEventListener('click', this._onCopy.bind(this), false);
        document.querySelector('#profile-copy-confirm').addEventListener('click', this._onCopyConfirm.bind(this), false);
        this._profileMoveUpButton.addEventListener('click', this._onMove.bind(this, -1), false);
        this._profileMoveDownButton.addEventListener('click', this._onMove.bind(this, 1), false);

        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
        this._onOptionsChanged();
    }

    // Private

    async _onOptionsChanged() {
        this._optionsFull = await this._settingsController.getOptionsFull();

        this._profileConditionsUI.cleanup();

        const {profiles, profileCurrent} = this._optionsFull;
        const profileIndex = this._settingsController.profileIndex;

        this._updateSelectOptions(this._profileActiveSelect);
        this._updateSelectOptions(this._profileTargetSelect);
        this._updateSelectOptions(this._profileCopySourceSelect, [profileIndex]);

        this._profileActiveSelect.value = `${profileCurrent}`;
        this._profileTargetSelect.value = `${profileIndex}`;

        this._profileRemoveButton.disabled = (profiles.length <= 1);
        this._profileCopyButton.disabled = (profiles.length <= 1);
        this._profileMoveUpButton.disabled = (profileIndex <= 0);
        this._profileMoveDownButton.disabled = (profileIndex >= profiles.length - 1);

        if (profileIndex >= 0 && profileIndex < profiles.length) {
            const currentProfile = profiles[profileIndex];
            this._profileNameInput.value = currentProfile.name;

            const {conditionGroups} = currentProfile;
            this._profileConditionsUI.prepare(conditionGroups);
        }
    }

    _onProfileActiveChange(e) {
        const max = this._optionsFull.profiles.length;
        const value = this._tryGetIntegerValue(e.currentTarget.value, 0, max);
        if (value === null) { return; }
        this._settingsController.setGlobalSetting('profileCurrent', value);
    }

    _onProfileTargetChange(e) {
        const max = this._optionsFull.profiles.length;
        const value = this._tryGetIntegerValue(e.currentTarget.value, 0, max);
        if (value === null) { return; }
        this._settingsController.profileIndex = value;
    }

    _onNameChanged(e) {
        const value = e.currentTarget.value;
        const profileIndex = this._settingsController.profileIndex;
        this._settingsController.setGlobalSetting(`profiles[${profileIndex}].name`, value);
        this._updateSelectName(profileIndex, value);
    }

    _onAdd() {
        this._addProfile();
    }

    _onRemove(e) {
        if (e.shiftKey) {
            return this._onRemoveConfirm();
        }

        if (this._optionsFull.profiles.length <= 1) { return; }

        const profileIndex = this._settingsController.profileIndex;
        const profile = this._optionsFull.profiles[profileIndex];
        this._removeProfileNameElement.textContent = profile.name;
        this._profileRemoveModal.setVisible(true);
    }

    _onRemoveConfirm() {
        this._profileRemoveModal.setVisible(false);
        if (this._optionsFull.profiles.length <= 1) { return; }
        const profileIndex = this._settingsController.profileIndex;
        this._removeProfile(profileIndex);
    }

    _onCopy() {
        if (this._optionsFull.profiles.length <= 1) { return; }

        const {profiles, profileCurrent} = this._optionsFull;
        const profileIndex = this._settingsController.profileIndex;
        let copyFromIndex = profileCurrent;
        if (copyFromIndex === profileIndex) {
            if (profileIndex !== 0) {
                copyFromIndex = 0;
            } else if (profiles.length > 1) {
                copyFromIndex = 1;
            }
        }
        this._profileCopySourceSelect.value = `${copyFromIndex}`;

        this._profileCopyModal.setVisible(true);
    }

    _onCopyConfirm() {
        this._profileCopyModal.setVisible(false);

        const profileIndex = this._settingsController.profileIndex;
        const max = this._optionsFull.profiles.length;
        const index = this._tryGetIntegerValue('#profile-copy-source', 0, max);
        if (index === null || index === profileIndex) { return; }

        this._copyProfile(profileIndex, index);
    }

    _onMove(offset) {
        const profileIndex = this._settingsController.profileIndex;
        const max = this._optionsFull.profiles.length;
        const profileIndexNew = Math.max(0, Math.min(max - 1, profileIndex + offset));
        if (profileIndex === profileIndexNew) { return; }
        this._swapProfiles(profileIndex, profileIndexNew);
    }

    _updateSelectOptions(select, disabled) {
        const {profiles} = this._optionsFull;
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < profiles.length; ++i) {
            const profile = profiles[i];
            const option = document.createElement('option');
            option.value = `${i}`;
            option.textContent = profile.name;
            option.disabled = (Array.isArray(disabled) && disabled.includes(i));
            fragment.appendChild(option);
        }
        select.textContent = '';
        select.appendChild(fragment);
    }

    _updateSelectName(index, name) {
        const selects = [
            this._profileActiveSelect,
            this._profileTargetSelect,
            this._profileCopySourceSelect
        ];
        const optionValue = `${index}`;
        for (const select of selects) {
            for (const option of select.querySelectorAll('option')) {
                if (option.value === optionValue) {
                    option.textContent = name;
                }
            }
        }
    }

    _tryGetIntegerValue(value, min, max) {
        value = parseInt(value, 10);
        return (
            typeof value === 'number' &&
            Number.isFinite(value) &&
            Math.floor(value) === value &&
            value >= min &&
            value < max
        ) ? value : null;
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
        return null;
    }

    async _addProfile() {
        const profileIndex = this._settingsController.profileIndex;
        const profiles = this._optionsFull.profiles;
        const profile = profiles[profileIndex];
        const newProfile = clone(profile);
        newProfile.name = this._createCopyName(profile.name, profiles, 100);

        const index = profiles.length;
        await this._settingsController.modifyGlobalSettings([{
            action: 'splice',
            path: 'profiles',
            start: index,
            deleteCount: 0,
            items: [newProfile]
        }]);

        this._settingsController.profileIndex = index;
    }

    async _removeProfile(index) {
        const {profiles, profileCurrent} = this._optionsFull;
        let newProfileCurrent = profileCurrent;
        const modifications = [{
            action: 'splice',
            path: 'profiles',
            start: index,
            deleteCount: 1,
            items: []
        }];

        if (profileCurrent >= index) {
            newProfileCurrent = Math.min(newProfileCurrent - 1, profiles.length - 1);
            modifications.push({
                action: 'set',
                path: 'profileCurrent',
                value: newProfileCurrent
            });
        }

        const profileIndex = this._settingsController.profileIndex;

        await this._settingsController.modifyGlobalSettings(modifications);

        if (profileIndex === index) {
            this._settingsController.profileIndex = newProfileCurrent;
        } else {
            await this._onOptionsChanged();
        }
    }

    async _swapProfiles(index1, index2) {
        const {profileCurrent} = this._optionsFull;

        const modifications = [{
            action: 'swap',
            path1: `profiles[${index1}]`,
            path2: `profiles[${index2}]`
        }];

        const newProfileCurrent = this._getSwappedValue(profileCurrent, index1, index2);
        if (newProfileCurrent !== profileCurrent) {
            modifications.push({
                action: 'set',
                path: 'profileCurrent',
                value: newProfileCurrent
            });
        }

        const profileIndex = this._settingsController.profileIndex;
        const newProfileIndex = this._getSwappedValue(profileIndex, index1, index2);

        await this._settingsController.modifyGlobalSettings(modifications);

        if (profileIndex !== newProfileIndex) {
            this._settingsController.profileIndex = newProfileIndex;
        }
    }

    async _copyProfile(index, copyFromIndex) {
        const profiles = this._optionsFull.profiles;
        const copyFromProfile = profiles[copyFromIndex];
        const options = clone(copyFromProfile.options);

        await this._settingsController.modifyGlobalSettings([{
            action: 'set',
            path: `profiles[${index}].options`,
            value: options
        }]);

        await this._settingsController.refresh();
    }
}
