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

import type {TextProcessor, ReadingNormalizer, BidirectionalConversionPreprocessor} from './language';
import type {LanguageTransformDescriptor} from './language-transformer';
import type {SafeAny} from './core';

export type IsTextLookupWorthyFunction = (text: string) => boolean;

type LanguageDescriptor<
    TIso extends string,
    TTextPreprocessorDescriptor extends TextProcessorDescriptor = Record<string, never>,
    TTextPostprocessorDescriptor extends TextProcessorDescriptor = Record<string, never>,
> = {
    iso: TIso;
    iso639_3: string;
    name: string;
    exampleText: string;
    /**
     * An optional function which returns whether or not a given string may be translatable.
     * This is used as a filter for several situations, such as whether the clipboard monitor
     * window should activate when text is copied to the clipboard.
     * If no value is provided, `true` is assumed for all inputs.
     */
    isTextLookupWorthy?: IsTextLookupWorthyFunction;
    readingNormalizer?: ReadingNormalizer;
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

type AlphabeticDiacriticsProcessor = {
    removeAlphabeticDiacritics: TextProcessor<boolean>;
};

/**
 * This is a mapping of the iso tag to all of the text processors for that language.
 * Any new language should be added to this object.
 */
type AllTextProcessors = {
    aii: {
        pre: {
            removeSyriacScriptDiacritics: TextProcessor<boolean>;
        };
    };
    ar: {
        pre: {
            removeArabicScriptDiacritics: TextProcessor<boolean>;
            removeTatweel: TextProcessor<boolean>;
            normalizeUnicode: TextProcessor<boolean>;
            addHamzaTop: TextProcessor<boolean>;
            addHamzaBottom: TextProcessor<boolean>;
            convertAlifMaqsuraToYaa: TextProcessor<boolean>;
        };
    };
    arz: {
        pre: {
            removeArabicScriptDiacritics: TextProcessor<boolean>;
            removeTatweel: TextProcessor<boolean>;
            normalizeUnicode: TextProcessor<boolean>;
            addHamzaTop: TextProcessor<boolean>;
            addHamzaBottom: TextProcessor<boolean>;
            convertAlifMaqsuraToYaa: TextProcessor<boolean>;
            convertHaToTaMarbuta: TextProcessor<boolean>;
        };
    };
    bg: {
        pre: CapitalizationPreprocessors;
    };
    cs: {
        pre: CapitalizationPreprocessors;
    };
    da: {
        pre: CapitalizationPreprocessors;
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
    eo: {
        pre: CapitalizationPreprocessors;
    };
    es: {
        pre: CapitalizationPreprocessors;
    };
    et: {
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
        pre: CapitalizationPreprocessors & {
            apostropheVariants: BidirectionalConversionPreprocessor;
        };
    };
    ga: {
        pre: CapitalizationPreprocessors;
    };
    grc: {
        pre: CapitalizationPreprocessors & AlphabeticDiacriticsProcessor & {
            convertLatinToGreek: TextProcessor<boolean>;
        };
    };
    haw: {
        pre: CapitalizationPreprocessors;
    };
    he: Record<string, never>;
    hi: Record<string, never>;
    hu: {
        pre: CapitalizationPreprocessors;
    };
    id: {
        pre: CapitalizationPreprocessors & AlphabeticDiacriticsProcessor;
    };
    it: {
        pre: CapitalizationPreprocessors & AlphabeticDiacriticsProcessor;
    };
    la: {
        pre: CapitalizationPreprocessors & AlphabeticDiacriticsProcessor & {
            processDiphtongs: BidirectionalConversionPreprocessor;
        };
    };
    lo: Record<string, never>;
    lv: {
        pre: CapitalizationPreprocessors;
    };
    ja: {
        pre: {
            convertHalfWidthCharacters: TextProcessor<boolean>;
            alphabeticToHiragana: TextProcessor<boolean>;
            normalizeCombiningCharacters: TextProcessor<boolean>;
            normalizeCJKCompatibilityCharacters: TextProcessor<boolean>;
            normalizeRadicalCharacters: TextProcessor<boolean>;
            alphanumericWidthVariants: BidirectionalConversionPreprocessor;
            convertHiraganaToKatakana: BidirectionalConversionPreprocessor;
            collapseEmphaticSequences: TextProcessor<[collapseEmphatic: boolean, collapseEmphaticFull: boolean]>;
            standardizeKanji: TextProcessor<boolean>;
        };
    };
    ka: Record<string, never>;
    ko: {
        pre: {
            disassembleHangul: TextProcessor<boolean>;
        };
        post: {
            reassembleHangul: TextProcessor<boolean>;
        };
    };
    km: Record<string, never>;
    kn: Record<string, never>;
    mn: {
        pre: CapitalizationPreprocessors;
    };
    mt: {
        pre: CapitalizationPreprocessors;
    };
    nl: {
        pre: CapitalizationPreprocessors;
    };
    no: {
        pre: CapitalizationPreprocessors;
    };
    pl: {
        pre: CapitalizationPreprocessors;
    };
    pt: {
        pre: CapitalizationPreprocessors;
    };
    ro: {
        pre: CapitalizationPreprocessors & AlphabeticDiacriticsProcessor;
    };
    ru: {
        pre: CapitalizationPreprocessors & {
            yoToE: BidirectionalConversionPreprocessor;
            removeRussianDiacritics: TextProcessor<boolean>;
        };
    };
    sga: {
        pre: CapitalizationPreprocessors & AlphabeticDiacriticsProcessor;
    };
    sh: {
        pre: CapitalizationPreprocessors & {
            removeSerboCroatianAccentMarks: TextProcessor<boolean>;
        };
    };
    sq: {
        pre: CapitalizationPreprocessors;
    };
    sv: {
        pre: CapitalizationPreprocessors;
    };
    th: Record<string, never>;
    tl: {
        pre: CapitalizationPreprocessors & AlphabeticDiacriticsProcessor;
    };
    tr: {
        pre: CapitalizationPreprocessors;
    };
    tok: {
        pre: CapitalizationPreprocessors;
    };
    uk: {
        pre: CapitalizationPreprocessors;
    };
    vi: {
        pre: CapitalizationPreprocessors & {
            normalizeDiacritics: TextProcessor<'old' | 'new' | 'off'>;
        };
    };
    cy: {
        pre: CapitalizationPreprocessors;
    };
    yi: {
        pre: {
            combineYiddishLigatures: TextProcessor<boolean>;
            removeYiddishDiacritics: TextProcessor<boolean>;
        };
        post: {
            convertFinalLetters: TextProcessor<boolean>;
            convertYiddishLigatures: BidirectionalConversionPreprocessor;
        };
    };
    yue: {
        pre: {
            normalizeRadicalCharacters: TextProcessor<boolean>;
        };
    };
    zh: {
        pre: {
            normalizeRadicalCharacters: TextProcessor<boolean>;
        };
    };
};
