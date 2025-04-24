/*
 * Copyright (C) 2025  Yomitan Authors
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
 * Mobile browsers report that keyboards are composing even when they are clearly sending normal input.
 * This conflicts with detection of desktop IME composing which is reported correctly.
 * If the composing input is a single alphabetic letter, it is almost certainly a mobile keyboard pretending to be composing.
 * This is not foolproof. For example a Japanese IME could try to convert `えい` to `A` which would show as "fake composing". But this is unlikely.
 * @param {InputEvent} event
 * @returns {boolean}
 */
export function isFakeComposing(event) {
    return !!event.data?.match(/^[A-Za-z]$/);
}

/**
 * @param {InputEvent} event
 * @param {string} platform
 * @param {string} browser
 * @returns {boolean}
 */
export function isComposing(event, platform, browser) {
    // Desktop Composing
    if (event.isComposing && platform !== 'android') { return true; }

    // Android Composing
    // eslint-disable-next-line sonarjs/prefer-single-boolean-return
    if (event.isComposing && !isFakeComposing(event) && platform === 'android' && browser !== 'firefox-mobile') { return true; }

    return false;
}
