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

import type {TextPreprocessor} from './language';
import type {SafeAny} from './core';

type LanguageDescriptor<TIso extends string, TTextPreprocessorDescriptor extends TextPreprocessorDescriptor> = {
    iso: TIso;
    name: string;
    exampleText: string;
    textPreprocessors: TTextPreprocessorDescriptor;
};

type TextPreprocessorDescriptor = {
    [key: string]: TextPreprocessor<SafeAny>;
};

type LanguageDescriptorObjectMap = {
    [key in keyof AllTextPreprocessors]: LanguageDescriptor<key, AllTextPreprocessors[key]>;
};

export type LanguageDescriptorAny = LanguageDescriptorObjectMap[keyof LanguageDescriptorObjectMap];

/**
 * This is a mapping of the iso tag to all of the preprocessors for that language.
 * Any new language should be added to this object.
 */
type AllTextPreprocessors = {
    en: {
        capitalizeFirstLetter: TextPreprocessor<boolean>;
        decapitalize: TextPreprocessor<boolean>;
    };
    ja: {
        convertHalfWidthCharacters: TextPreprocessor<boolean>;
        convertNumericCharacters: TextPreprocessor<boolean>;
        convertAlphabeticCharacters: TextPreprocessor<boolean>;
        convertHiraganaToKatakana: TextPreprocessor<boolean>;
        convertKatakanaToHiragana: TextPreprocessor<boolean>;
        collapseEmphaticSequences: TextPreprocessor<[collapseEmphatic: boolean, collapseEmphaticFull: boolean]>;
    };
};
