/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

let currentProfileIndex = 0;

function getOptionsContext() {
    return {
        index: currentProfileIndex
    };
}


async function profileOptionsSetup() {
    const optionsFull = await apiOptionsGetFull();
    currentProfileIndex = optionsFull.profileCurrent;

    profileOptionsSetupEventListeners();
    await profileOptionsUpdateTarget(optionsFull);
}

function profileOptionsSetupEventListeners() {
    $('#profile-target').change(utilAsync(onTargetProfileChanged));
    $('#profile-name').change(onProfileNameChanged);
    $('#profile-add').click(utilAsync(onProfileAdd));
    $('#profile-remove').click(utilAsync(onProfileRemove));
    $('#profile-remove-confirm').click(utilAsync(onProfileRemoveConfirm));
    $('.profile-form').find('input, select, textarea').not('.profile-form-manual').change(utilAsync(onProfileOptionsChanged));
}

function tryGetIntegerValue(selector, min, max) {
    const value = parseInt($(selector).val(), 10);
    return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        Math.floor(value) === value &&
        value >= min &&
        value < max
    ) ? value : null;
}

async function profileFormRead(optionsFull) {
    const profile = optionsFull.profiles[currentProfileIndex];

    // Current profile
    const index = tryGetIntegerValue('#profile-active', 0, optionsFull.profiles.length);
    if (index !== null) {
        optionsFull.profileCurrent = index;
    }

    // Profile name
    profile.name = $('#profile-name').val();
}

async function profileFormWrite(optionsFull) {
    const profile = optionsFull.profiles[currentProfileIndex];

    profileOptionsPopulateSelect($('#profile-active'), optionsFull.profiles, optionsFull.profileCurrent);
    profileOptionsPopulateSelect($('#profile-target'), optionsFull.profiles, currentProfileIndex);
    $('#profile-remove').prop('disabled', optionsFull.profiles.length <= 1);

    $('#profile-name').val(profile.name);
}

function profileOptionsPopulateSelect(select, profiles, currentValue) {
    select.empty();

    for (let i = 0; i < profiles.length; ++i) {
        const profile = profiles[i];
        select.append($(`<option value="${i}">${profile.name}</option>`));
    }

    select.val(`${currentValue}`);
}

async function profileOptionsUpdateTarget(optionsFull) {
    profileFormWrite(optionsFull);

    const optionsContext = getOptionsContext();
    const options = await apiOptionsGet(optionsContext);
    await formWrite(options);
}

function profileOptionsCreateCopyName(name, profiles, maxUniqueAttempts) {
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
        if (i++ >= maxUniqueAttempts || profiles.findIndex(profile => profile.name === newName) < 0) {
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

async function onProfileOptionsChanged(e) {
    if (!e.originalEvent && !e.isTrigger) {
        return;
    }

    const optionsFull = await apiOptionsGetFull();
    await profileFormRead(optionsFull);
    await apiOptionsSave();
}

async function onTargetProfileChanged() {
    const optionsFull = await apiOptionsGetFull();
    const index = tryGetIntegerValue('#profile-target', 0, optionsFull.profiles.length);
    if (index === null || currentProfileIndex === index) {
        return;
    }

    currentProfileIndex = index;

    await profileOptionsUpdateTarget(optionsFull);
}

async function onProfileAdd() {
    const optionsFull = await apiOptionsGetFull();
    const profile = utilIsolate(optionsFull.profiles[currentProfileIndex]);
    profile.name = profileOptionsCreateCopyName(profile.name, optionsFull.profiles, 100);
    optionsFull.profiles.push(profile);
    currentProfileIndex = optionsFull.profiles.length - 1;
    await profileOptionsUpdateTarget(optionsFull);
    await apiOptionsSave();
}

async function onProfileRemove() {
    const optionsFull = await apiOptionsGetFull();
    if (optionsFull.profiles.length <= 1) {
        return;
    }

    const profile = optionsFull.profiles[currentProfileIndex];

    $('#profile-remove-modal-profile-name').text(profile.name);
    $('#profile-remove-modal').modal('show');
}

async function onProfileRemoveConfirm() {
    $('#profile-remove-modal').modal('hide');

    const optionsFull = await apiOptionsGetFull();
    if (optionsFull.profiles.length <= 1) {
        return;
    }

    optionsFull.profiles.splice(currentProfileIndex, 1);

    if (currentProfileIndex >= optionsFull.profiles.length) {
        --currentProfileIndex;
    }

    if (optionsFull.profileCurrent >= optionsFull.profiles.length) {
        optionsFull.profileCurrent = optionsFull.profiles.length - 1;
    }

    await profileOptionsUpdateTarget(optionsFull);
    await apiOptionsSave();
}

function onProfileNameChanged() {
    $('#profile-active, #profile-target').find(`[value="${currentProfileIndex}"]`).text(this.value);
}
