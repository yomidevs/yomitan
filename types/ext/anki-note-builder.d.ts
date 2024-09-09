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
    compactTags: boolean;
    context: AnkiTemplatesInternal.Context;
    deckName: string;
    dictionaryEntry: Dictionary.DictionaryEntry;
    dictionaryStylesMap: Map<string, string>;
    duplicateScope: Settings.AnkiDuplicateScope;
    duplicateScopeCheckAllModels: boolean;
    fields: Field[];
    glossaryLayoutMode: Settings.GlossaryLayoutMode;
    mediaOptions: MediaOptions | null;
    mode: AnkiTemplatesInternal.CreateMode;
    modelName: string;
    requirements: Requirement[];
    resultOutputMode: Settings.ResultOutputMode;
    tags: string[];
    template: string;
};

export type Field = [
    name: string,
    value: string,
];

export type CreateNoteResult = {
    errors: Error[];
    note: Anki.Note;
    requirements: Requirement[];
};

export type GetRenderingDataDetails = {
    compactTags?: boolean;
    context: AnkiTemplatesInternal.Context;
    dictionaryEntry: Dictionary.DictionaryEntry;
    dictionaryStylesMap: Map<string, string>;
    glossaryLayoutMode?: Settings.GlossaryLayoutMode;
    marker: string;
    mode: AnkiTemplatesInternal.CreateMode;
    resultOutputMode?: Settings.ResultOutputMode;
};

export type CommonData = AnkiTemplatesInternal.CreateDetails;

export type RequirementGeneric = {
    type: 'audio' | 'clipboardImage' | 'clipboardText' | 'popupSelectionText' | 'screenshot';
};

export type RequirementTextFurigana = {
    readingMode: AnkiTemplates.TextFuriganaReadingMode;
    text: string;
    type: 'textFurigana';
};

export type RequirementDictionaryMedia = {
    dictionary: string;
    path: string;
    type: 'dictionaryMedia';
};

export type Requirement = RequirementDictionaryMedia | RequirementGeneric | RequirementTextFurigana;

export type AudioMediaOptions = {
    idleTimeout: null | number;
    languageSummary: Language.LanguageSummary;
    preferredAudioIndex: null | number;
    sources: Audio.AudioSourceInfo[];
};

export type MediaOptions = {
    audio: AudioMediaOptions | null;
    screenshot: {
        contentOrigin: Extension.ContentOrigin;
        format: Settings.AnkiScreenshotFormat;
        quality: number;
    };
    textParsing: {
        optionsContext: Settings.OptionsContext;
        scanLength: number;
    };
};

export type TextFuriganaDetails = {
    readingMode: AnkiTemplates.TextFuriganaReadingMode;
    text: string;
};

export type BatchedRequestGroup = {
    commonDataRequestsMap: Map<CommonData, BatchedRequestData[]>;
    template: string;
};

export type BatchedRequestData = {
    marker: string;
    reject: (reason?: unknown) => void;
    resolve: (result: TemplateRenderer.RenderResult) => void;
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
