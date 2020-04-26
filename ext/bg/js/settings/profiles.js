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
 * ConditionsUI
 * apiOptionsGetFull
 * conditionsClearCaches
 * formWrite
 * getOptionsFullMutable
 * getOptionsMutable
 * profileConditionsDescriptor
 * settingsSaveOptions
 * utilBackgroundIsolate
 */

let currentProfileIndex = 0;
let profileConditionsContainer = null;

function getOptionsContext() {
    return {
        index: currentProfileIndex
    };
}


async function profileOptionsSetup() {
    const optionsFull = await getOptionsFullMutable();
    currentProfileIndex = optionsFull.profileCurrent;

    profileOptionsSetupEventListeners();
    await profileOptionsUpdateTarget(optionsFull);
}

function profileOptionsSetupEventListeners() {
    $('#profile-target').change(onTargetProfileChanged);
    $('#profile-name').change(onProfileNameChanged);
    $('#profile-add').click(onProfileAdd);
    $('#profile-remove').click(onProfileRemove);
    $('#profile-remove-confirm').click(onProfileRemoveConfirm);
    $('#profile-copy').click(onProfileCopy);
    $('#profile-copy-confirm').click(onProfileCopyConfirm);
    $('#profile-move-up').click(() => onProfileMove(-1));
    $('#profile-move-down').click(() => onProfileMove(1));
    $('.profile-form').find('input, select, textarea').not('.profile-form-manual').change(onProfileOptionsChanged);
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

    profileOptionsPopulateSelect($('#profile-active'), optionsFull.profiles, optionsFull.profileCurrent, null);
    profileOptionsPopulateSelect($('#profile-target'), optionsFull.profiles, currentProfileIndex, null);
    $('#profile-remove').prop('disabled', optionsFull.profiles.length <= 1);
    $('#profile-copy').prop('disabled', optionsFull.profiles.length <= 1);
    $('#profile-move-up').prop('disabled', currentProfileIndex <= 0);
    $('#profile-move-down').prop('disabled', currentProfileIndex >= optionsFull.profiles.length - 1);

    $('#profile-name').val(profile.name);

    if (profileConditionsContainer !== null) {
        profileConditionsContainer.cleanup();
    }

    profileConditionsContainer = new ConditionsUI.Container(
        profileConditionsDescriptor,
        'popupLevel',
        profile.conditionGroups,
        $('#profile-condition-groups'),
        $('#profile-add-condition-group')
    );
    profileConditionsContainer.save = () => {
        settingsSaveOptions();
        conditionsClearCaches(profileConditionsDescriptor);
    };
    profileConditionsContainer.isolate = utilBackgroundIsolate;
}

function profileOptionsPopulateSelect(select, profiles, currentValue, ignoreIndices) {
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

async function profileOptionsUpdateTarget(optionsFull) {
    profileFormWrite(optionsFull);

    const optionsContext = getOptionsContext();
    const options = await getOptionsMutable(optionsContext);
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

async function onProfileOptionsChanged(e) {
    if (!e.originalEvent && !e.isTrigger) {
        return;
    }

    const optionsFull = await getOptionsFullMutable();
    await profileFormRead(optionsFull);
    await settingsSaveOptions();
}

async function onTargetProfileChanged() {
    const optionsFull = await getOptionsFullMutable();
    const index = tryGetIntegerValue('#profile-target', 0, optionsFull.profiles.length);
    if (index === null || currentProfileIndex === index) {
        return;
    }

    currentProfileIndex = index;

    await profileOptionsUpdateTarget(optionsFull);

    yomichan.trigger('modifyingProfileChange');
}

async function onProfileAdd() {
    const optionsFull = await getOptionsFullMutable();
    const profile = utilBackgroundIsolate(optionsFull.profiles[currentProfileIndex]);
    profile.name = profileOptionsCreateCopyName(profile.name, optionsFull.profiles, 100);
    optionsFull.profiles.push(profile);

    currentProfileIndex = optionsFull.profiles.length - 1;

    await profileOptionsUpdateTarget(optionsFull);
    await settingsSaveOptions();

    yomichan.trigger('modifyingProfileChange');
}

async function onProfileRemove(e) {
    if (e.shiftKey) {
        return await onProfileRemoveConfirm();
    }

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

    const optionsFull = await getOptionsFullMutable();
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
    await settingsSaveOptions();

    yomichan.trigger('modifyingProfileChange');
}

function onProfileNameChanged() {
    $('#profile-active, #profile-target').find(`[value="${currentProfileIndex}"]`).text(this.value);
}

async function onProfileMove(offset) {
    const optionsFull = await getOptionsFullMutable();
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

    currentProfileIndex = index;

    await profileOptionsUpdateTarget(optionsFull);
    await settingsSaveOptions();

    yomichan.trigger('modifyingProfileChange');
}

async function onProfileCopy() {
    const optionsFull = await apiOptionsGetFull();
    if (optionsFull.profiles.length <= 1) {
        return;
    }

    profileOptionsPopulateSelect($('#profile-copy-source'), optionsFull.profiles, currentProfileIndex === 0 ? 1 : 0, [currentProfileIndex]);
    $('#profile-copy-modal').modal('show');
}

async function onProfileCopyConfirm() {
    $('#profile-copy-modal').modal('hide');

    const optionsFull = await getOptionsFullMutable();
    const index = tryGetIntegerValue('#profile-copy-source', 0, optionsFull.profiles.length);
    if (index === null || index === currentProfileIndex) {
        return;
    }

    const profileOptions = utilBackgroundIsolate(optionsFull.profiles[index].options);
    optionsFull.profiles[currentProfileIndex].options = profileOptions;

    await profileOptionsUpdateTarget(optionsFull);
    await settingsSaveOptions();
}
