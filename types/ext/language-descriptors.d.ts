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

import type {TextProcessor, ReadingNormalizer, BidirectionalConversionPreprocessor} from './language';
import type {LanguageTransformDescriptor} from './language-transformer';
import type {SafeAny} from './core';

export type IsTextLookupWorthyFunction = (text: string) => boolean;

type LanguageDescriptor<
    TIso extends string,
    TTextPreprocessorDescriptor extends TextProcessorDescriptor = Record<string, never>,
    TTextPostprocessorDescriptor extends TextProcessorDescriptor = Record<string, never>,
> = {
    exampleText: string;
    iso: TIso;
    iso639_3: string;
    /**
     * An optional function which returns whether or not a given string may be translatable.
     * This is used as a filter for several situations, such as whether the clipboard monitor
     * window should activate when text is copied to the clipboard.
     * If no value is provided, `true` is assumed for all inputs.
     */
    isTextLookupWorthy?: IsTextLookupWorthyFunction;
    languageTransforms?: LanguageTransformDescriptor;
    name: string;
    readingNormalizer?: ReadingNormalizer;
    textPostprocessors?: TTextPostprocessorDescriptor;
    textPreprocessors?: TTextPreprocessorDescriptor;
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

type AlphabeticDiacriticsProcessor = {
    removeAlphabeticDiacritics: TextProcessor<boolean>;
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
    cs: {
        pre: CapitalizationPreprocessors;
    };
    da: {
        pre: CapitalizationPreprocessors;
    };
    de: {
        pre: {
            eszettPreprocessor: BidirectionalConversionPreprocessor;
        } & CapitalizationPreprocessors;
    };
    el: {
        pre: CapitalizationPreprocessors;
    };
    en: {
        pre: CapitalizationPreprocessors;
    };
    eo: {
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
        pre: AlphabeticDiacriticsProcessor & CapitalizationPreprocessors;
    };
    hi: Record<string, never>;
    hu: {
        pre: CapitalizationPreprocessors;
    };
    id: {
        pre: CapitalizationPreprocessors;
    };
    it: {
        pre: AlphabeticDiacriticsProcessor & CapitalizationPreprocessors;
    };
    ja: {
        pre: {
            alphabeticToHiragana: TextProcessor<boolean>;
            alphanumericWidthVariants: BidirectionalConversionPreprocessor;
            collapseEmphaticSequences: TextProcessor<[collapseEmphatic: boolean, collapseEmphaticFull: boolean]>;
            convertHalfWidthCharacters: TextProcessor<boolean>;
            convertHiraganaToKatakana: BidirectionalConversionPreprocessor;
            normalizeCombiningCharacters: TextProcessor<boolean>;
        };
    };
    km: Record<string, never>;
    kn: Record<string, never>;
    ko: {
        post: {
            reassembleHangul: TextProcessor<boolean>;
        };
        pre: {
            disassembleHangul: TextProcessor<boolean>;
        };
    };
    la: {
        pre: AlphabeticDiacriticsProcessor & CapitalizationPreprocessors;
    };
    lo: Record<string, never>;
    lv: {
        pre: CapitalizationPreprocessors;
    };
    mn: {
        pre: CapitalizationPreprocessors;
    };
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
        pre: AlphabeticDiacriticsProcessor & CapitalizationPreprocessors;
    };
    ru: {
        pre: {
            removeRussianDiacritics: TextProcessor<boolean>;
            yoToE: TextProcessor<boolean>;
        } & CapitalizationPreprocessors;
    };
    sga: {
        pre: AlphabeticDiacriticsProcessor & CapitalizationPreprocessors;
    };
    sh: {
        pre: {
            removeSerboCroatianAccentMarks: TextProcessor<boolean>;
        } & CapitalizationPreprocessors;
    };
    sq: {
        pre: CapitalizationPreprocessors;
    };
    sv: {
        pre: CapitalizationPreprocessors;
    };
    th: Record<string, never>;
    tl: {
        pre: AlphabeticDiacriticsProcessor & CapitalizationPreprocessors;
    };
    tr: {
        pre: CapitalizationPreprocessors;
    };
    uk: {
        pre: CapitalizationPreprocessors;
    };
    vi: {
        pre: {
            normalizeDiacritics: TextProcessor<'new' | 'off' | 'old'>;
        } & CapitalizationPreprocessors;
    };
    yue: Record<string, never>;
    zh: Record<string, never>;
};
