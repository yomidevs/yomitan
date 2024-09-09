/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import type * as Dictionary from './dictionary';
import type * as DictionaryData from './dictionary-data';
import type * as DictionaryDataUtil from './dictionary-data-util';

export type RenderMode = 'ankiNote';

export type Context = {
    document: {title: string};
    fullQuery: string;
    query: string;
};

export type Media = {
    audio?: MediaObject;
    clipboardImage?: MediaObject;
    clipboardText?: MediaObject;
    dictionaryMedia?: DictionaryMedia;
    popupSelectionText?: MediaObject;
    screenshot?: MediaObject;
    textFurigana?: TextFuriganaSegment[];
};

export type MediaObject = {value: string};

export type MediaSimpleType = (
    'audio' |
    'clipboardImage' |
    'clipboardText' |
    'popupSelectionText' |
    'screenshot'
);

export type TextFuriganaSegment = {
    details: MediaObject;
    readingMode: TextFuriganaReadingMode;
    text: string;
};

export type TextFuriganaReadingMode = 'hiragana' | 'katakana' | null;

export type DictionaryMedia = {
    [dictionary: string]: {
        [path: string]: MediaObject;
    };
};

export type NoteData = {
    compactGlossaries: boolean;
    compactTags: boolean;
    readonly context: Context;
    readonly definition: DictionaryEntry;
    readonly dictionaryEntry: Dictionary.DictionaryEntry;
    glossaryLayoutMode: string;
    group: boolean;
    marker: string;
    media: Media;
    merge: boolean;
    modeKanji: boolean;
    modeTermKana: boolean;
    modeTermKanji: boolean;
    readonly phoneticTranscriptions: TranscriptionGroup[];
    readonly pitchCount: number;
    readonly pitches: PitchGroup[];
    readonly uniqueExpressions: string[];
    readonly uniqueReadings: string[];
};

export type PitchGroup = {
    dictionary: string;
    pitches: Pitch[];
};

export type Pitch = {
    devoicePositions: number[];
    exclusiveExpressions: string[];
    exclusiveReadings: string[];
    expressions: string[];
    nasalPositions: number[];
    position: number;
    reading: string;
    tags: PitchTag[];
};

export type TranscriptionGroup = {
    dictionary: string;
    phoneticTranscriptions: Transcription[];
};

export type Transcription = {
    exclusiveExpressions: string[];
    exclusiveReadings: string[];
    expressions: string[];
    ipa: string;
    reading: string;
    tags: Dictionary.Tag[];
};

/**
 * For legacy reasons, {@link Pitch} has a custom tag type that resembles {@link Dictionary.Tag}.
 */
export type PitchTag = {
    category: string;
    content: string[];
    dictionaries: string[];
    name: string;
    order: number;
    redundant: boolean;
    score: number;
};

export type KanjiDictionaryEntry = {
    character: string;
    readonly cloze: Cloze;
    dictionary: string;
    dictionaryAlias: string;
    readonly frequencies: KanjiFrequency[];
    readonly frequencyAverage: number;
    readonly frequencyHarmonic: number;
    glossary: string[];
    kunyomi: string[];
    onyomi: string[];
    readonly stats: KanjiStatGroups;
    readonly tags: Tag[];
    type: 'kanji';
    url: string;
};

export type KanjiStatGroups = {
    [propName: string]: KanjiStat[];
};

export type KanjiStat = {
    category: string;
    dictionary: string;
    name: string;
    notes: string;
    order: number;
    score: number;
    value: number | string;
};

export type KanjiFrequency = {
    character: string;
    dictionary: string;
    dictionaryAlias: string;
    dictionaryOrder: {
        index: number;
        priority: number;
    };
    frequency: number | string;
    index: number;
};

export type TermDictionaryEntryType = 'term' | 'termGrouped' | 'termMerged';

export type TermDictionaryEntry = {
    readonly cloze: Cloze;
    readonly definitions?: TermDefinition[];
    readonly definitionTags?: Tag[];
    readonly dictionary: string;
    readonly dictionaryAlias: string;
    readonly dictionaryNames: string[];
    dictionaryOrder: {
        index: number;
        priority: number;
    };
    readonly dictScopedStyles?: string;
    readonly expression: string | string[];
    readonly expressions: TermHeadword[];
    readonly frequencies: TermFrequency[];
    readonly frequencyAverage: number;
    readonly frequencyHarmonic: number;
    readonly furiganaSegments?: FuriganaSegment[];
    readonly glossary?: DictionaryData.TermGlossary[];
    readonly glossaryScopedStyles?: string;
    id?: number;
    inflectionRuleChainCandidates: Dictionary.InflectionRuleChainCandidate[];
    isPrimary?: boolean;
    readonly phoneticTranscriptions: TermPhoneticTranscription[];
    readonly pitches: TermPitchAccent[];
    rawSource: null | string;
    readonly reading: string | string[];
    score: number;
    readonly sequence: number;
    source: null | string;
    sourceTerm?: null | string;
    sourceTermExactMatchCount: number;
    readonly termTags?: Tag[];
    type: TermDictionaryEntryType;
    url: string;
};

export type TermDictionaryEntryCommonInfo = {
    definitions?: TermDefinition[];
    definitionTags: Tag[];
    uniqueReadings: string[];
    uniqueTerms: string[];
};

export type UnknownDictionaryEntry = Record<string, never>;

export type DictionaryEntry = KanjiDictionaryEntry | TermDictionaryEntry | UnknownDictionaryEntry;

export type Tag = {
    category: string;
    dictionary: string;
    name: string;
    notes: string;
    order: number;
    redundant: boolean;
    score: number;
};

export type TermDefinition = {
    definitionTags: Tag[];
    dictionary: string;
    dictionaryAlias: string;
    dictScopedStyles: string;
    glossary: DictionaryData.TermGlossary[];
    glossaryScopedStyles: string;
    only?: string[];
    sequence: number;
};

export type TermFrequency = {
    dictionary: string;
    dictionaryAlias: string;
    dictionaryOrder: {
        index: number;
        priority: number;
    };
    expression: string;
    expressionIndex: number;
    frequency: number | string;
    hasReading: boolean;
    index: number;
    reading: string;
};

export type TermPitchAccent = {
    dictionary: string;
    dictionaryAlias: string;
    dictionaryOrder: {
        index: number;
        priority: number;
    };
    expression: string;
    expressionIndex: number;
    index: number;
    readonly pitches: PitchAccent[];
    reading: string;
};

export type PitchAccent = {
    position: number;
    tags: Tag[];
};

export type TermPhoneticTranscription = {
    dictionary: string;
    dictionaryAlias: string;
    dictionaryOrder: {
        index: number;
        priority: number;
    };
    expression: string;
    expressionIndex: number;
    index: number;
    readonly phoneticTranscriptions: PhoneticTranscription[];
    reading: string;
};

export type PhoneticTranscription = {
    ipa: string;
    tags: Tag[];
};

export type TermFrequencyType = DictionaryDataUtil.TermFrequencyType;

export type TermHeadword = {
    expression: string;
    readonly frequencies: TermFrequency[];
    readonly furiganaSegments: FuriganaSegment[];
    readonly pitches: TermPitchAccent[];
    reading: string;
    sourceTerm: string;
    readonly termFrequency: TermFrequencyType;
    readonly termTags: Tag[];
    wordClasses: string[];
};

export type FuriganaSegment = {
    furigana: string;
    text: string;
};

export type Cloze = {
    body: string;
    bodyKana: string;
    prefix: string;
    sentence: string;
    suffix: string;
};
