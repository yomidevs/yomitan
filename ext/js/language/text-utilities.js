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

import {isStringPartiallyJapanese} from './ja/japanese.js';
import {isStringPartiallyChinese} from './zh/chinese.js';

/**
 * Returns the language that the string might be by using some heuristic checks.
 * Values returned are ISO codes. `null` is returned if no language can be determined.
 * @param {string} text
 * @param {?string} language
 * @returns {?string}
 */
export function getLanguageFromText(text, language) {
    const partiallyJapanese = isStringPartiallyJapanese(text);
    const partiallyChinese = isStringPartiallyChinese(text);
    if (!['zh', 'yue'].includes(language ?? '')) {
        if (partiallyJapanese) { return 'ja'; }
        if (partiallyChinese) { return 'zh'; }
    }
    return language;
}
