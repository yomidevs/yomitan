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

import type {TextProcessor, BidirectionalConversionPreprocessor} from './language';
import type {LanguageTransformDescriptor} from './language-transformer';
import type {SafeAny} from './core';

export type IsTextLookupWorthyFunction = (text: string) => boolean;

type LanguageDescriptor<
    TIso extends string,
    TTextPreprocessorDescriptor extends TextProcessorDescriptor = Record<string, never>,
    TTextPostprocessorDescriptor extends TextProcessorDescriptor = Record<string, never>,
> = {
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
    textPreprocessors?: TTextPreprocessorDescriptor;
    textPostprocessors?: TTextPostprocessorDescriptor;
    languageTransforms?: LanguageTransformDescriptor;
};

type TextProcessorDescriptor = {
    [key: string]: TextProcessor<SafeAny>;
};

type LanguageDescriptorObjectMap = {
    [key in keyof AllTextProcessors]: LanguageDescriptor<
        key,
        AllTextProcessors[key] extends {pre: TextProcessorDescriptor} ? AllTextProcessors[key]['pre'] : Record<string, never>,
        AllTextProcessors[key] extends {post: TextProcessorDescriptor} ? AllTextProcessors[key]['post'] : Record<string, never>
    >;
};

export type LanguageDescriptorAny = LanguageDescriptorObjectMap[keyof LanguageDescriptorObjectMap];

type CapitalizationPreprocessors = {
    capitalizeFirstLetter: TextProcessor<boolean>;
    decapitalize: TextProcessor<boolean>;
};

/**
 * This is a mapping of the iso tag to all of the text processors for that language.
 * Any new language should be added to this object.
 */
type AllTextProcessors = {
    ar: {
        pre: {
            removeArabicScriptDiacritics: TextProcessor<boolean>;
        };
    };
    de: {
        pre: CapitalizationPreprocessors & {
            eszettPreprocessor: BidirectionalConversionPreprocessor;
        };
    };
    el: {
        pre: CapitalizationPreprocessors;
    };
    en: {
        pre: CapitalizationPreprocessors;
    };
    es: {
        pre: CapitalizationPreprocessors;
    };
    fa: {
        pre: {
            removeArabicScriptDiacritics: TextProcessor<boolean>;
        };
    };
    fi: {
        pre: CapitalizationPreprocessors;
    };
    fr: {
        pre: CapitalizationPreprocessors;
    };
    grc: {
        pre: CapitalizationPreprocessors & {
            removeAlphabeticDiacritics: TextProcessor<boolean>;
        };
    };
    hu: {
        pre: CapitalizationPreprocessors;
    };
    id: {
        pre: CapitalizationPreprocessors;
    };
    it: {
        pre: CapitalizationPreprocessors;
    };
    la: {
        pre: CapitalizationPreprocessors & {
            removeAlphabeticDiacritics: TextProcessor<boolean>;
        };
    };
    ja: {
        pre: {
            convertHalfWidthCharacters: TextProcessor<boolean>;
            convertNumericCharacters: TextProcessor<boolean>;
            convertAlphabeticCharacters: TextProcessor<boolean>;
            convertHiraganaToKatakana: BidirectionalConversionPreprocessor;
            collapseEmphaticSequences: TextProcessor<[collapseEmphatic: boolean, collapseEmphaticFull: boolean]>;
        };
    };
    km: Record<string, never>;
    nl: {
        pre: CapitalizationPreprocessors;
    };
    pl: {
        pre: CapitalizationPreprocessors;
    };
    pt: {
        pre: CapitalizationPreprocessors;
    };
    ro: {
        pre: CapitalizationPreprocessors;
    };
    ru: {
        pre: CapitalizationPreprocessors & {
            yoToE: TextProcessor<boolean>;
            removeRussianDiacritics: TextProcessor<boolean>;
        };
    };
    sga: {
        pre: CapitalizationPreprocessors & {
            removeAlphabeticDiacritics: TextProcessor<boolean>;
        };
    };
    sh: {
        pre: CapitalizationPreprocessors;
    };
    sq: {
        pre: CapitalizationPreprocessors;
    };
    sv: {
        pre: CapitalizationPreprocessors;
    };
    th: Record<string, never>;
    tr: {
        pre: CapitalizationPreprocessors;
    };
    vi: {
        pre: CapitalizationPreprocessors;
    };
    zh: Record<string, never>;
};
