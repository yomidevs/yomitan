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
 * loadModule
 * removeScript
 * getDeinflectionReasons
 * fetchAsset
 */

export class LanguageUtil {
    constructor() {
        this.languages = [];
    }

    async prepare() {
        this.languages = JSON.parse(await fetchAsset('/js/language/languages.json'));
        window.languages = window.languages || {};
        this.languages.forEach(({iso}) => {
            window.languages[iso] = window.languages[iso] || {};
        });
    }

    getLanguages() {
        return this.languages;
    }

    async getDeinflectionReasons(language) {
        try {
            if (!window.languages[language].deinflectionReasons) {
                if (!window.languages[language].getDeinflectionReasons) {
                    await loadModule(`/js/language/languages/${language}/grammar.js`);
                    window.languages[language].getDeinflectionReasons ??= () => [];
                }
                window.languages[language].deinflectionReasons = await window.languages[language].getDeinflectionReasons();
            }
            return window.languages[language].deinflectionReasons;
        } catch (e){
            console.error(e);
            return [];
        }
    }

    async getTextTransformations(language) {
        try {
            if (!window.languages[language].textTransformations) {
                await loadModule(`/js/language/languages/${language}/constants.js`);
                await loadModule(`/js/language/languages/${language}/util.js`);
                await loadModule(`/js/language/languages/${language}/textTransformations.js`);
            }
            return window.languages[language].textTransformations;
        } catch (e){
            console.error(e);
            return [];
        }
    }
}

