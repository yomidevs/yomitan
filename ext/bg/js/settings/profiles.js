/*
 * Copyright (C) 2019-2020  Yomichan Authors
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
 * api
 * utilBackgroundIsolate
 */

class ProfileController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._profileConditionsUI = new ProfileConditionsUI(settingsController);
    }

    async prepare() {
        const {platform: {os}} = await api.getEnvironmentInfo();
        this._profileConditionsUI.os = os;

        $('#profile-target').change(this._onTargetProfileChanged.bind(this));
        $('#profile-name').change(this._onNameChanged.bind(this));
        $('#profile-add').click(this._onAdd.bind(this));
        $('#profile-remove').click(this._onRemove.bind(this));
        $('#profile-remove-confirm').click(this._onRemoveConfirm.bind(this));
        $('#profile-copy').click(this._onCopy.bind(this));
        $('#profile-copy-confirm').click(this._onCopyConfirm.bind(this));
        $('#profile-move-up').click(() => this._onMove(-1));
        $('#profile-move-down').click(() => this._onMove(1));
        $('.profile-form').find('input, select, textarea').not('.profile-form-manual').change(this._onInputChanged.bind(this));

        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));

        this._onOptionsChanged();
    }

    // Private

    async _onOptionsChanged() {
        const optionsFull = await this._settingsController.getOptionsFullMutable();
        this._formWrite(optionsFull);
    }

    _tryGetIntegerValue(selector, min, max) {
        const value = parseInt($(selector).val(), 10);
        return (
            typeof value === 'number' &&
            Number.isFinite(value) &&
            Math.floor(value) === value &&
            value >= min &&
            value < max
        ) ? value : null;
    }

    async _formRead(optionsFull) {
        const currentProfileIndex = this._settingsController.profileIndex;
        const profile = optionsFull.profiles[currentProfileIndex];

        // Current profile
        const index = this._tryGetIntegerValue('#profile-active', 0, optionsFull.profiles.length);
        if (index !== null) {
            optionsFull.profileCurrent = index;
        }

        // Profile name
        profile.name = $('#profile-name').val();
    }

    _formWrite(optionsFull) {
        const currentProfileIndex = this._settingsController.profileIndex;
        const profile = optionsFull.profiles[currentProfileIndex];

        this._populateSelect($('#profile-active'), optionsFull.profiles, optionsFull.profileCurrent, null);
        this._populateSelect($('#profile-target'), optionsFull.profiles, currentProfileIndex, null);
        $('#profile-remove').prop('disabled', optionsFull.profiles.length <= 1);
        $('#profile-copy').prop('disabled', optionsFull.profiles.length <= 1);
        $('#profile-move-up').prop('disabled', currentProfileIndex <= 0);
        $('#profile-move-down').prop('disabled', currentProfileIndex >= optionsFull.profiles.length - 1);

        $('#profile-name').val(profile.name);

        this._refreshProfileConditions(optionsFull);
    }

    _refreshProfileConditions(optionsFull) {
        this._profileConditionsUI.cleanup();

        const profileIndex = this._settingsController.profileIndex;
        if (profileIndex < 0 || profileIndex >= optionsFull.profiles.length) { return; }

        const {conditionGroups} = optionsFull.profiles[profileIndex];
        this._profileConditionsUI.prepare(conditionGroups);
    }

    _populateSelect(select, profiles, currentValue, ignoreIndices) {
        select.empty();


        for (let i = 0; i < profiles.length; ++i) {
            if (ignoreIndices !== null && ignoreIndices.indexOf(i) >= 0) {
                continue;
            }
            const profile = profiles[i];
            select.append($(`<option value="${i}">${profile.name}</option>`));
        }

        select.val(`${currentValue}`);
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

    async _onInputChanged(e) {
        if (!e.originalEvent && !e.isTrigger) {
            return;
        }

        const optionsFull = await this._settingsController.getOptionsFullMutable();
        await this._formRead(optionsFull);
        await this._settingsController.save();
    }

    async _onTargetProfileChanged() {
        const optionsFull = await this._settingsController.getOptionsFullMutable();
        const currentProfileIndex = this._settingsController.profileIndex;
        const index = this._tryGetIntegerValue('#profile-target', 0, optionsFull.profiles.length);
        if (index === null || currentProfileIndex === index) {
            return;
        }

        this._settingsController.profileIndex = index;
    }

    async _onAdd() {
        const optionsFull = await this._settingsController.getOptionsFullMutable();
        const currentProfileIndex = this._settingsController.profileIndex;
        const profile = utilBackgroundIsolate(optionsFull.profiles[currentProfileIndex]);
        profile.name = this._createCopyName(profile.name, optionsFull.profiles, 100);
        optionsFull.profiles.push(profile);

        this._settingsController.profileIndex = optionsFull.profiles.length - 1;

        await this._settingsController.save();
    }

    async _onRemove(e) {
        if (e.shiftKey) {
            return await this._onRemoveConfirm();
        }

        const optionsFull = await this._settingsController.getOptionsFull();
        if (optionsFull.profiles.length <= 1) {
            return;
        }

        const currentProfileIndex = this._settingsController.profileIndex;
        const profile = optionsFull.profiles[currentProfileIndex];

        $('#profile-remove-modal-profile-name').text(profile.name);
        $('#profile-remove-modal').modal('show');
    }

    async _onRemoveConfirm() {
        $('#profile-remove-modal').modal('hide');

        const optionsFull = await this._settingsController.getOptionsFullMutable();
        if (optionsFull.profiles.length <= 1) {
            return;
        }

        const currentProfileIndex = this._settingsController.profileIndex;
        optionsFull.profiles.splice(currentProfileIndex, 1);

        if (currentProfileIndex >= optionsFull.profiles.length) {
            this._settingsController.profileIndex = optionsFull.profiles.length - 1;
        }

        if (optionsFull.profileCurrent >= optionsFull.profiles.length) {
            optionsFull.profileCurrent = optionsFull.profiles.length - 1;
        }

        await this._settingsController.save();
    }

    _onNameChanged() {
        const currentProfileIndex = this._settingsController.profileIndex;
        $('#profile-active, #profile-target').find(`[value="${currentProfileIndex}"]`).text(this.value);
    }

    async _onMove(offset) {
        const optionsFull = await this._settingsController.getOptionsFullMutable();
        const currentProfileIndex = this._settingsController.profileIndex;
        const index = currentProfileIndex + offset;
        if (index < 0 || index >= optionsFull.profiles.length) {
            return;
        }

        const profile = optionsFull.profiles[currentProfileIndex];
        optionsFull.profiles.splice(currentProfileIndex, 1);
        optionsFull.profiles.splice(index, 0, profile);

        if (optionsFull.profileCurrent === currentProfileIndex) {
            optionsFull.profileCurrent = index;
        }

        this._settingsController.profileIndex = index;

        await this._settingsController.save();
    }

    async _onCopy() {
        const optionsFull = await this._settingsController.getOptionsFullMutable();
        if (optionsFull.profiles.length <= 1) {
            return;
        }

        const currentProfileIndex = this._settingsController.profileIndex;
        this._populateSelect($('#profile-copy-source'), optionsFull.profiles, currentProfileIndex === 0 ? 1 : 0, [currentProfileIndex]);
        $('#profile-copy-modal').modal('show');
    }

    async _onCopyConfirm() {
        $('#profile-copy-modal').modal('hide');

        const optionsFull = await this._settingsController.getOptionsFullMutable();
        const index = this._tryGetIntegerValue('#profile-copy-source', 0, optionsFull.profiles.length);
        const currentProfileIndex = this._settingsController.profileIndex;
        if (index === null || index === currentProfileIndex) {
            return;
        }

        const profileOptions = utilBackgroundIsolate(optionsFull.profiles[index].options);
        optionsFull.profiles[currentProfileIndex].options = profileOptions;

        await this._settingsController.save();
    }
}
