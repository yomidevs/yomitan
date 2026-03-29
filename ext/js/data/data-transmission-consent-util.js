/*
 * Copyright (C) 2026  Manabitan authors
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
 * @param {unknown} value
 * @returns {'unknown'|'accepted'|'declined'}
 */
export function normalizeDataTransmissionConsentState(value) {
    switch (value) {
        case 'accepted':
        case 'declined':
        case 'unknown':
            return value;
        default:
            return 'unknown';
    }
}

/**
 * @param {unknown} browser
 * @returns {boolean}
 */
export function isDataTransmissionConsentRequiredBrowser(browser) {
    return browser === 'firefox' || browser === 'firefox-mobile';
}

/**
 * @param {unknown} optionsFull
 * @returns {'unknown'|'accepted'|'declined'}
 */
export function getDataTransmissionConsentStateFromOptionsFull(optionsFull) {
    if (!(typeof optionsFull === 'object' && optionsFull !== null && !Array.isArray(optionsFull))) {
        return 'unknown';
    }
    const globalValue = Reflect.get(optionsFull, 'global');
    if (!(typeof globalValue === 'object' && globalValue !== null && !Array.isArray(globalValue))) {
        return 'unknown';
    }
    return normalizeDataTransmissionConsentState(Reflect.get(globalValue, 'dataTransmissionConsentState'));
}

/**
 * @param {'accepted'|'declined'} state
 * @param {boolean} audioEnabled
 * @param {import('settings').OptionsContext} optionsContext
 * @returns {import('settings-modifications').ScopedModificationSet[]}
 */
export function getDataTransmissionConsentUpdateTargets(state, audioEnabled, optionsContext) {
    return [
        {scope: 'global', action: 'set', path: 'global.dataTransmissionConsentState', value: state, optionsContext: null},
        {scope: 'global', action: 'set', path: 'global.dataTransmissionConsentShown', value: true, optionsContext: null},
        {scope: 'profile', action: 'set', path: 'audio.enabled', value: audioEnabled, optionsContext},
    ];
}
