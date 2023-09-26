/*
 * Copyright (C) 2016-2022  Yomichan Authors
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
 * loadScript
 * removeScript
 * getDeinflectionReasons
 */

class LanguageUtil {
    constructor() {
        this.language = null;
        this.deinflectionReasons = [];
    }

    decapitalize(str) {
        return str.toLowerCase();
    }

    capitalizeFirstLetter(str){
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    async setLanguage(newLanguage){
        let reasons = [];
        try {
            if (this.language !== newLanguage) {
                removeScript(`/js/language/languages/${this.language}/grammar.js`);

                this.language = newLanguage;

                await loadScript(`/js/language/languages/${this.language}/grammar.js`);
                reasons = await getDeinflectionReasons();
            } else {
                reasons = this.deinflectionReasons;
            }

            this.deinflectionReasons = reasons;
        } catch (e) {
            console.log(e);
        }
    }
}

