/*
 * Copyright (C) 2023  Yomitan Authors
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

import {fetchText} from '../general/helpers.js';
import {languages} from './languages/index.js';

export class LanguageUtil {
    constructor() {
    }

    async prepare() {
        const languagesJSON = JSON.parse(await fetchText('/js/language/languages.json')) || {};
        languagesJSON.forEach(({iso, language, flag, exampleText, i18n}) => {
            languages[iso] = {...languages[iso], iso, language, flag, exampleText, i18n};
        });
    }

    getLanguages() {
        return Object.values(languages).map(({iso, language, flag, exampleText}) =>
            ({iso, language, flag, exampleText}));
    }

    getLocales(){
        return Object.values(languages).filter(({i18n}) => i18n);
    }

    async getDeinflectionReasons(language) {
        try {
            if (!languages[language].deinflectionReasons) {
                languages[language].deinflectionReasons = await languages[language].getDeinflectionReasons();
            }
            return languages[language].deinflectionReasons;
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    async getTextTransformations(language) {
        try {
            return languages[language].textTransformations;
        } catch (e){
            console.error(e);
            return [];
        }
    }

    async getTranslations(locale) {
        try {
            if (!languages[locale].translations) {
                languages[locale].translations = JSON.parse(await fetchText(`/js/language/languages/${locale}/i18n.json`));
            }
            return languages[locale].translations;
        } catch (e){
            console.error(e);
            return {};
        }
    }
}

