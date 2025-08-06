/*
 * Copyright (C) 2024-2025  Yomitan Authors
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

import {HIRAGANA_TO_ROMAJI, ROMAJI_TO_HIRAGANA} from './japanese-kana-romaji-dicts.js';
import {convertHiraganaToKatakana} from './japanese.js';

/**
 * @param {string} text
 * @returns {string}
 */
export function convertToHiragana(text) {
    let newText = text.toLowerCase();
    for (const [romaji, kana] of Object.entries(ROMAJI_TO_HIRAGANA)) {
        newText = newText.replaceAll(romaji, kana);
    }
    return fillSokuonGaps(newText);
}

/**
 * @param {string} text
 * @param {number} selectionStart
 * @returns {import('language').KanaIMEOutput}
 */
export function convertToKanaIME(text, selectionStart) {
    const prevSelectionStart = selectionStart;
    const prevLength = text.length;
    let kanaString = '';

    // If the user starts typing a single `n`, hide it from the converter. (This only applies when using the converter as an IME)
    // The converter must only allow the n to become ん when the user's text cursor is at least one character ahead of it.
    // If `n` occurs directly behind the user's text cursor, it should be hidden from the converter.
    // If `ny` occurs directly behind the user's text cursor, it must also be hidden from the converter as the user may be trying to type `nya` `nyi` `nyu` `nye` `nyo`.
    // Examples (`|` shall be the user's text cursor):
    // `たn|` does not convert to `たん|`. The `n` should be hidden from the converter and `た` should only be sent.
    // `n|の` also does not convert to `ん|の`. Even though the cursor is not at the end of the line, the `n` should still be hidden since it is directly behind the user's text cursor.
    // `ny|` does not convert to `んy|`. The `ny` must be hidden since the user may be trying to type something starting with `ny` such as `nya`.
    // `たnt|` does convert to `たんt|`. The user's text cursor is one character ahead of the `n` so it does not need to be hidden and can be converted.
    // `nとあ|` also converts to `んとあ|` The user's text cursor is two characters away from the `n`.
    // `なno|` will still convert to `なの` instead of `なんお` without issue since the `no` -> `の` conversion will be found before `n` -> `ん` and `o` -> `お`.
    // `nn|` will still convert to `ん` instead of `んん` since `nn` -> `ん` will be found before `n` -> `ん`.
    // If the user pastes in a long string of `n` such as `nnnnn|` it should leave the last `n` and convert to `んんn`
    const textLowered = text.toLowerCase();
    if (textLowered[prevSelectionStart - 1] === 'n' && textLowered.slice(0, prevSelectionStart - 1).replaceAll('nn', '').at(-1) !== 'n') {
        const n = text.slice(prevSelectionStart - 1, prevSelectionStart);
        const beforeN = text.slice(0, prevSelectionStart - 1);
        const afterN = text.slice(prevSelectionStart);
        kanaString = convertToKana(beforeN) + n + convertToKana(afterN);
    } else if (textLowered.slice(prevSelectionStart - 2, prevSelectionStart) === 'ny') {
        const ny = text.slice(prevSelectionStart - 2, prevSelectionStart);
        const beforeN = text.slice(0, prevSelectionStart - 2);
        const afterN = text.slice(prevSelectionStart);
        kanaString = convertToKana(beforeN) + ny + convertToKana(afterN);
    } else {
        kanaString = convertToKana(text);
    }

    const selectionOffset = kanaString.length - prevLength;

    return {kanaString, newSelectionStart: prevSelectionStart + selectionOffset};
}

/**
 * @param {string} text
 * @returns {string}
 */
export function convertToKana(text) {
    let newText = text;
    for (const [romaji, kana] of Object.entries(ROMAJI_TO_HIRAGANA)) {
        newText = newText.replaceAll(romaji, kana);
        // Uppercase text converts to katakana
        newText = newText.replaceAll(romaji.toUpperCase(), convertHiraganaToKatakana(kana).toUpperCase());
    }
    return fillSokuonGaps(newText);
}

/**
 * @param {string} text
 * @returns {string}
 *   Fills gaps in sokuons that replaceAll using ROMAJI_TO_HIRAGANA will miss due to it not running iteratively
 *   Example: `ttttttttttsu` -> `っっっっっっっっっつ` would become `ttttttttttsu` -> `っtっtっtっtっつ` without filling the gaps
 */
function fillSokuonGaps(text) {
    return text.replaceAll(/っ[a-z](?=っ)/g, 'っっ').replaceAll(/ッ[A-Z](?=ッ)/g, 'ッッ');
}

/**
 * @param {string} text
 * @returns {string}
 */
export function convertToRomaji(text) {
    let newText = text;
    for (const [kana, romaji] of Object.entries(HIRAGANA_TO_ROMAJI)) {
        newText = newText.replaceAll(kana, romaji);
        newText = newText.replaceAll(convertHiraganaToKatakana(kana), romaji);
    }
    return newText;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function convertAlphabeticToKana(text) {
    let part = '';
    let result = '';

    for (const char of text) {
        // Note: 0x61 is the character code for 'a'
        let c = /** @type {number} */ (char.codePointAt(0));
        if (c >= 0x41 && c <= 0x5a) { // ['A', 'Z']
            c += (0x61 - 0x41);
        } else if (c >= 0x61 && c <= 0x7a) { // ['a', 'z']
            // NOP; c += (0x61 - 0x61);
        } else if (c >= 0xff21 && c <= 0xff3a) { // ['A', 'Z'] fullwidth
            c += (0x61 - 0xff21);
        } else if (c >= 0xff41 && c <= 0xff5a) { // ['a', 'z'] fullwidth
            c += (0x61 - 0xff41);
        } else if (c === 0x2d || c === 0xff0d) { // '-' or fullwidth dash
            c = 0x2d; // '-'
        } else {
            if (part.length > 0) {
                result += convertToHiragana(part);
                part = '';
            }
            result += char;
            continue;
        }
        part += String.fromCodePoint(c);
    }

    if (part.length > 0) {
        result += convertToHiragana(part);
    }
    return result;
}
