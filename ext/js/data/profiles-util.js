/*
 * Copyright (C) 2024  Yomitan Authors
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

/**
 * @param {number} direction
 * @param {import('../application.js').Application} application
 */
export async function setProfile(direction, application) {
    const optionsFull = await application.api.optionsGetFull();

    const profileCount = optionsFull.profiles.length;
    const newProfile = (optionsFull.profileCurrent + direction + profileCount) % profileCount;

    /** @type {import('settings-modifications').ScopedModificationSet} */
    const modification = {
        action: 'set',
        path: 'profileCurrent',
        value: newProfile,
        scope: 'global',
        optionsContext: null,
    };
    await application.api.modifySettings([modification], 'search');
}
