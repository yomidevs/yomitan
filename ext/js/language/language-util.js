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

import {fetchJson} from '../core/utilities.js';
import {languageFeatures} from './languages/index.js';

export class LanguageUtil {
    constructor() {
        /** @type {import('language').LanguageMap}*/
        this.languages = new Map();
    }

    /** */
    async prepare() {
        /** @type {import('language').Language[]} */
        const languages = await fetchJson('/js/language/languages/index.json');
        for (const {iso, name, flag, exampleText} of languages) {
            this.languages.set(iso, {...languageFeatures.get(iso), iso, name, flag, exampleText});
        }
    }

    /** @returns {import('language').Language[]}*/
    getLanguages() {
        return [...this.languages.values()];
    }

    /**
     * @param {string} iso
     * @returns {import('language').TextTransformation[]}
     */
    getTextTransformations(iso) {
        return this.languages.get(iso)?.textTransformations || [];
    }
}

