/*
 * Copyright (C) 2025-2026  Yomitan Authors
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

import type * as Api from './api';
import type * as Dictionary from './dictionary';
import type * as DictionaryImporter from './dictionary-importer';
import type * as Settings from './settings';

export type termEntriesInput = {
    term: string | string[];
};

export type termEntriesResponse = {
    dictionaryEntries: Dictionary.TermDictionaryEntry[];
    originalTextLength: number;
    index: number;
};

export type kanjiEntriesInput = {
    character: string;
};

export type ankiFieldsInput = {
    text: string;
    type: 'term' | 'kanji';
    markers: [string];
    maxEntries: number;
    includeMedia?: boolean;
};

export type tokenizeInput = {
    text: string | string[];
    scanLength: number;
};

export type ankiCardFormatsInput = {
    profileIndex?: number;
};

export type dictionaryInfoOptions = Pick<Settings.DictionaryOptions, 'alias' | 'enabled' | 'definitionsCollapsible'>;

export type dictionaryInfoResponse = (DictionaryImporter.Summary & {options: dictionaryInfoOptions | null})[];

export type displayGeneralOptionsKey = (
    'language' |
    'resultOutputMode' |
    'glossaryLayoutMode' |
    'compactTags' |
    'averageFrequency' |
    'frequencyDisplayMode' |
    'termDisplayMode' |
    'showPitchAccentDownstepNotation' |
    'showPitchAccentPositionNotation' |
    'showPitchAccentGraph' |
    'popupDisplayMode' |
    'popupTheme' |
    'popupOuterTheme' |
    'fontFamily' |
    'fontSize' |
    'lineHeight' |
    'popupScalingFactor' |
    'customPopupCss' |
    'customPopupOuterCss' |
    'popupCurrentIndicatorMode' |
    'popupActionBarVisibility' |
    'popupActionBarLocation'
);

export type displayGeneralOptions = Pick<Settings.GeneralOptions, displayGeneralOptionsKey>;

export type displayOptionsResponse = {
    general: displayGeneralOptions;
    scanning: Pick<Settings.ScanningOptions, 'enableSearchTags'>;
};

export type dictionaryMediaInput = {
    targets: Api.GetMediaDetailsTarget[];
};

export type remoteVersionResponse = {
    version: number;
};

export type apiDictionaryMediaDetails = {
    dictionary: string;
    path: string;
    mediaType: string;
    width: number;
    height: number;
    content: TContentType;
    ankiFilename: string;
};

export type apiAudioMediaDetails = {
    term: string;
    reading: string;
    mediaType: string;
    content: AudioBinaryBase64;
    ankiFilename: string;
};
