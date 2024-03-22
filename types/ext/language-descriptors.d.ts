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

import type {TextPreprocessor, BidirectionalConversionPreprocessor} from './language';
import type {LanguageTransformDescriptor} from './language-transformer';
import type {SafeAny} from './core';

export type IsTextLookupWorthyFunction = (text: string) => boolean;

type LanguageDescriptor<TIso extends string, TTextPreprocessorDescriptor extends TextPreprocessorDescriptor> = {
    iso: TIso;
    name: string;
    exampleText: string;
    /**
     * An optional function which returns whether or not a given string may be translatable.
     * This is used as a filter for several situations, such as whether the clipboard monitor
     * window should activate when text is copied to the clipboard.
     * If no value is provided, `true` is assumed for all inputs.
     */
    isTextLookupWorthy?: IsTextLookupWorthyFunction;
    textPreprocessors: TTextPreprocessorDescriptor;
    languageTransforms?: LanguageTransformDescriptor;
};

type TextPreprocessorDescriptor = {
    [key: string]: TextPreprocessor<SafeAny>;
};

type LanguageDescriptorObjectMap = {
    [key in keyof AllTextPreprocessors]: LanguageDescriptor<key, AllTextPreprocessors[key]>;
};

export type LanguageDescriptorAny = LanguageDescriptorObjectMap[keyof LanguageDescriptorObjectMap];

type CapitalizationPreprocessors = {
    capitalizeFirstLetter: TextPreprocessor<boolean>;
    decapitalize: TextPreprocessor<boolean>;
};

/**
 * This is a mapping of the iso tag to all of the preprocessors for that language.
 * Any new language should be added to this object.
 */
type AllTextPreprocessors = {
    ar: {
        removeArabicScriptDiacritics: TextPreprocessor<boolean>;
    };
    de: CapitalizationPreprocessors & {
        eszettPreprocessor: BidirectionalConversionPreprocessor;
    };
    el: CapitalizationPreprocessors;
    en: CapitalizationPreprocessors;
    es: CapitalizationPreprocessors;
    fa: {
        removeArabicScriptDiacritics: TextPreprocessor<boolean>;
    };
    fr: CapitalizationPreprocessors;
    grc: CapitalizationPreprocessors;
    hu: CapitalizationPreprocessors;
    id: CapitalizationPreprocessors;
    it: CapitalizationPreprocessors;
    la: CapitalizationPreprocessors & {
        removeLatinDiacritics: TextPreprocessor<boolean>;
    };
    ja: {
        convertHalfWidthCharacters: TextPreprocessor<boolean>;
        convertNumericCharacters: TextPreprocessor<boolean>;
        convertAlphabeticCharacters: TextPreprocessor<boolean>;
        convertHiraganaToKatakana: BidirectionalConversionPreprocessor;
        collapseEmphaticSequences: TextPreprocessor<[collapseEmphatic: boolean, collapseEmphaticFull: boolean]>;
    };
    km: Record<string, never>;
    pl: CapitalizationPreprocessors;
    pt: CapitalizationPreprocessors;
    ro: CapitalizationPreprocessors;
    ru: CapitalizationPreprocessors & {
        yoToE: TextPreprocessor<boolean>;
        removeRussianDiacritics: TextPreprocessor<boolean>;
    };
    sh: CapitalizationPreprocessors;
    sq: CapitalizationPreprocessors;
    sv: CapitalizationPreprocessors;
    th: Record<string, never>;
    vi: CapitalizationPreprocessors;
    zh: Record<string, never>;
};
