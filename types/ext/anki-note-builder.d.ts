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

import type * as Anki from './anki';
import type * as AnkiTemplates from './anki-templates';
import type * as AnkiTemplatesInternal from './anki-templates-internal';
import type * as Audio from './audio';
import type * as Dictionary from './dictionary';
import type * as Extension from './extension';
import type * as Settings from './settings';
import type * as TemplateRenderer from './template-renderer';
import type * as Api from './api';
import type * as Language from './language';

export type CreateNoteDetails = {
    dictionaryEntry: Dictionary.DictionaryEntry;
    mode: AnkiTemplatesInternal.CreateMode;
    context: AnkiTemplatesInternal.Context;
    template: string;
    deckName: string;
    modelName: string;
    fields: Field[];
    tags: string[];
    requirements: Requirement[];
    duplicateScope: Settings.AnkiDuplicateScope;
    duplicateScopeCheckAllModels: boolean;
    resultOutputMode: Settings.ResultOutputMode;
    glossaryLayoutMode: Settings.GlossaryLayoutMode;
    compactTags: boolean;
    mediaOptions: MediaOptions | null;
    dictionaryStylesMap: Map<string, string>;
};

export type Field = [
    name: string,
    value: string,
];

export type CreateNoteResult = {
    note: Anki.Note;
    errors: Error[];
    requirements: Requirement[];
};

export type GetRenderingDataDetails = {
    dictionaryEntry: Dictionary.DictionaryEntry;
    mode: AnkiTemplatesInternal.CreateMode;
    context: AnkiTemplatesInternal.Context;
    resultOutputMode?: Settings.ResultOutputMode;
    glossaryLayoutMode?: Settings.GlossaryLayoutMode;
    compactTags?: boolean;
    marker: string;
    dictionaryStylesMap: Map<string, string>;
};

export type CommonData = AnkiTemplatesInternal.CreateDetails;

export type RequirementGeneric = {
    type: 'audio' | 'screenshot' | 'clipboardImage' | 'clipboardText' | 'popupSelectionText';
};

export type RequirementTextFurigana = {
    type: 'textFurigana';
    text: string;
    readingMode: AnkiTemplates.TextFuriganaReadingMode;
};

export type RequirementDictionaryMedia = {
    type: 'dictionaryMedia';
    dictionary: string;
    path: string;
};

export type Requirement = RequirementGeneric | RequirementTextFurigana | RequirementDictionaryMedia;

export type AudioMediaOptions = {
    sources: Audio.AudioSourceInfo[];
    preferredAudioIndex: number | null;
    idleTimeout: number | null;
    languageSummary: Language.LanguageSummary;
};

export type MediaOptions = {
    audio: AudioMediaOptions | null;
    screenshot: {
        format: Settings.AnkiScreenshotFormat;
        quality: number;
        contentOrigin: Extension.ContentOrigin;
    };
    textParsing: {
        optionsContext: Settings.OptionsContext;
        scanLength: number;
    };
};

export type TextFuriganaDetails = {
    text: string;
    readingMode: AnkiTemplates.TextFuriganaReadingMode;
};

export type BatchedRequestGroup = {
    template: string;
    commonDataRequestsMap: Map<CommonData, BatchedRequestData[]>;
};

export type BatchedRequestData = {
    resolve: (result: TemplateRenderer.RenderResult) => void;
    reject: (reason?: unknown) => void;
    marker: string;
};

export type MinimalApi = {
    injectAnkiNoteMedia(
        timestamp: Api.ApiParam<'injectAnkiNoteMedia', 'timestamp'>,
        definitionDetails: Api.ApiParam<'injectAnkiNoteMedia', 'definitionDetails'>,
        audioDetails: Api.ApiParam<'injectAnkiNoteMedia', 'audioDetails'>,
        screenshotDetails: Api.ApiParam<'injectAnkiNoteMedia', 'screenshotDetails'>,
        clipboardDetails: Api.ApiParam<'injectAnkiNoteMedia', 'clipboardDetails'>,
        dictionaryMediaDetails: Api.ApiParam<'injectAnkiNoteMedia', 'dictionaryMediaDetails'>,
    ): Promise<Api.ApiReturn<'injectAnkiNoteMedia'>>;

    parseText(
        text: Api.ApiParam<'parseText', 'text'>,
        optionsContext: Api.ApiParam<'parseText', 'optionsContext'>,
        scanLength: Api.ApiParam<'parseText', 'scanLength'>,
        useInternalParser: Api.ApiParam<'parseText', 'useInternalParser'>,
        useMecabParser: Api.ApiParam<'parseText', 'useMecabParser'>,
    ): Promise<Api.ApiReturn<'parseText'>>;
};
