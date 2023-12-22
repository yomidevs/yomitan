/*
 * Copyright (C) 2023  Yomitan Authors
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
import type * as AnkiNoteBuilder from './anki-note-builder';
import type * as Audio from './audio';
import type * as AudioDownloader from './audio-downloader';
import type * as Backend from './backend';
import type * as Core from './core';
import type * as Dictionary from './dictionary';
import type * as DictionaryDatabase from './dictionary-database';
import type * as DictionaryImporter from './dictionary-importer';
import type * as Environment from './environment';
import type * as Extension from './extension';
import type * as Log from './log';
import type * as Settings from './settings';
import type * as SettingsModifications from './settings-modifications';
import type * as Translation from './translation';
import type * as Translator from './translator';

// Generic

export type Handler<TDetails = unknown, TResult = unknown, THasSender extends boolean = false> = (
    details: TDetails,
    sender: (THasSender extends true ? chrome.runtime.MessageSender : void)
) => (TResult | Promise<TResult>);

// optionsGet

export type OptionsGetDetails = {
    optionsContext: Settings.OptionsContext;
};

export type OptionsGetResult = Settings.ProfileOptions;

// optionsGetFull

export type OptionsGetFullDetails = Record<string, never>;

export type OptionsGetFullResult = Settings.Options;

// termsFind

export type FindTermsDetails = {
    matchType?: Translation.FindTermsMatchType;
    deinflect?: boolean;
};

export type TermsFindDetails = {
    text: string;
    details: FindTermsDetails;
    optionsContext: Settings.OptionsContext;
};

export type TermsFindResult = {
    dictionaryEntries: Dictionary.TermDictionaryEntry[];
    originalTextLength: number;
};

// parseText

export type ParseTextDetails = {
    text: string;
    optionsContext: Settings.OptionsContext;
    scanLength: number;
    useInternalParser: boolean;
    useMecabParser: boolean;
};

export type ParseTextResult = ParseTextResultItem[];

export type ParseTextResultItem = {
    id: string;
    source: 'scanning-parser' | 'mecab';
    dictionary: null | string;
    content: ParseTextLine[];
};

export type ParseTextSegment = {
    text: string;
    reading: string;
};

export type ParseTextLine = ParseTextSegment[];

// kanjiFind

export type KanjiFindDetails = {
    text: string;
    optionsContext: Settings.OptionsContext;
};

export type KanjiFindResult = Dictionary.KanjiDictionaryEntry[];

// isAnkiConnected

export type IsAnkiConnectedDetails = Record<string, never>;

export type IsAnkiConnectedResult = boolean;

// getAnkiConnectVersion

export type GetAnkiConnectVersionDetails = Record<string, never>;

export type GetAnkiConnectVersionResult = number | null;

// addAnkiNote

export type AddAnkiNoteDetails = {
    note: Anki.Note;
};

export type AddAnkiNoteResult = Anki.NoteId | null;

// getAnkiNoteInfo

export type GetAnkiNoteInfoDetails = {
    notes: Anki.Note[];
    fetchAdditionalInfo: boolean;
};

export type GetAnkiNoteInfoResult = Anki.NoteInfoWrapper[];

// injectAnkiNoteMedia

export type InjectAnkiNoteMediaDetails = {
    timestamp: number;
    definitionDetails: InjectAnkiNoteMediaDefinitionDetails;
    audioDetails: InjectAnkiNoteMediaAudioDetails | null;
    screenshotDetails: InjectAnkiNoteMediaScreenshotDetails | null;
    clipboardDetails: InjectAnkiNoteMediaClipboardDetails | null;
    dictionaryMediaDetails: InjectAnkiNoteMediaDictionaryMediaDetails[];
};

export type InjectAnkiNoteMediaTermDefinitionDetails = {
    type: 'term';
    term: string;
    reading: string;
};

export type InjectAnkiNoteMediaKanjiDefinitionDetails = {
    type: 'kanji';
    character: string;
};

export type InjectAnkiNoteMediaDefinitionDetails = InjectAnkiNoteMediaTermDefinitionDetails | InjectAnkiNoteMediaKanjiDefinitionDetails;

export type InjectAnkiNoteMediaAudioDetails = AnkiNoteBuilder.AudioMediaOptions;

export type InjectAnkiNoteMediaScreenshotDetails = {
    tabId: number;
    frameId: number;
    format: Settings.AnkiScreenshotFormat;
    quality: number;
};

export type InjectAnkiNoteMediaClipboardDetails = {
    image: boolean;
    text: boolean;
};

export type InjectAnkiNoteMediaDictionaryMediaDetails = {
    dictionary: string;
    path: string;
};

export type InjectAnkiNoteMediaResult = {
    screenshotFileName: string | null;
    clipboardImageFileName: string | null;
    clipboardText: string | null;
    audioFileName: string | null;
    dictionaryMedia: InjectAnkiNoteDictionaryMediaResult[];
    errors: Core.SerializedError[];
};

export type InjectAnkiNoteDictionaryMediaResult = {
    dictionary: string;
    path: string;
    fileName: string | null;
};

// noteView

export type NoteViewDetails = {
    noteId: Anki.NoteId;
    mode: Settings.AnkiNoteGuiMode;
    allowFallback: boolean;
};

export type NoteViewResult = Settings.AnkiNoteGuiMode;

// suspendAnkiCardsForNote

export type SuspendAnkiCardsForNoteDetails = {
    noteId: Anki.NoteId;
};

export type SuspendAnkiCardsForNoteResult = number;

// getTermAudioInfoList

export type GetTermAudioInfoListDetails = {
    source: Audio.AudioSourceInfo;
    term: string;
    reading: string;
};

export type GetTermAudioInfoListResult = AudioDownloader.Info[];

// commandExec

export type CommandExecDetails = {
    command: string;
    params?: Core.SerializableObject;
};

export type CommandExecResult = boolean;

// sendMessageToFrame

export type SendMessageToFrameDetails = {
    frameId: number;
    action: string;
    params?: Core.SerializableObject;
};

export type SendMessageToFrameResult = boolean;

// broadcastTab

export type BroadcastTabDetails = {
    action: string;
    params?: Core.SerializableObject;
};

export type BroadcastTabResult = boolean;

// frameInformationGet

export type FrameInformationGetDetails = Record<string, never>;

export type FrameInformationGetResult = Extension.ContentOrigin;

// injectStylesheet

export type InjectStylesheetDetails = {
    type: 'file' | 'code';
    value: string;
};

export type InjectStylesheetResult = void;

// getStylesheetContent

export type GetStylesheetContentDetails = {
    url: string;
};

export type GetStylesheetContentResult = string;

// getEnvironmentInfo

export type GetEnvironmentInfoDetails = Record<string, never>;

export type GetEnvironmentInfoResult = Environment.Info;

// clipboardGet

export type ClipboardGetDetails = Record<string, never>;

export type ClipboardGetResult = string;

// getDisplayTemplatesHtml

export type GetDisplayTemplatesHtmlDetails = Record<string, never>;

export type GetDisplayTemplatesHtmlResult = string;

// getZoom

export type GetZoomDetails = Record<string, never>;

export type GetZoomResult = {
    zoomFactor: number;
};

// getDefaultAnkiFieldTemplates

export type GetDefaultAnkiFieldTemplatesDetails = Record<string, never>;

export type GetDefaultAnkiFieldTemplatesResult = string;

// getDictionaryInfo

export type GetDictionaryInfoDetails = Record<string, never>;

export type GetDictionaryInfoResult = DictionaryImporter.Summary[];

// purgeDatabase

export type PurgeDatabaseDetails = Record<string, never>;

export type PurgeDatabaseResult = void;

// getMedia

export type GetMediaDetails = {
    targets: GetMediaDetailsTarget[];
};

export type GetMediaDetailsTarget = {
    path: string;
    dictionary: string;
};

export type GetMediaResult = DictionaryDatabase.MediaDataStringContent[];

// log

export type LogDetails = {
    error: Core.SerializedError;
    level: Log.LogLevel;
    context: Log.LogContext | undefined;
};

export type LogResult = void;

// logIndicatorClear

export type LogIndicatorClearDetails = Record<string, never>;

export type LogIndicatorClearResult = void;

// modifySettings

export type ModifySettingsDetails = {
    targets: SettingsModifications.ScopedModification[];
    source: string;
};

export type ModifySettingsResult = Core.Response<SettingsModifications.ModificationResult>[];

// getSettings

export type GetSettingsDetails = {
    targets: SettingsModifications.ScopedRead[];
};

export type GetSettingsResult = Core.Response<SettingsModifications.ModificationResult>[];

// setAllSettings

export type SetAllSettingsDetails = {
    value: Settings.Options;
    source: string;
};

export type SetAllSettingsResult = void;

// getOrCreateSearchPopup

export type GetOrCreateSearchPopupDetails = {
    focus?: boolean | 'ifCreated';
    text?: string;
};

export type GetOrCreateSearchPopupResult = {
    tabId: number | null;
    windowId: number;
};

// isTabSearchPopup

export type IsTabSearchPopupDetails = {
    tabId: number;
};

export type IsTabSearchPopupResult = boolean;

// triggerDatabaseUpdated

export type TriggerDatabaseUpdatedDetails = {
    type: Backend.DatabaseUpdateType;
    cause: Backend.DatabaseUpdateCause;
};

export type TriggerDatabaseUpdatedResult = void;

// testMecab

export type TestMecabDetails = Record<string, never>;

export type TestMecabResult = true;

// textHasJapaneseCharacters

export type TextHasJapaneseCharactersDetails = {
    text: string;
};

export type TextHasJapaneseCharactersResult = boolean;

// getTermFrequencies

export type GetTermFrequenciesDetails = {
    termReadingList: GetTermFrequenciesDetailsTermReadingListItem[];
    dictionaries: string[];
};

export type GetTermFrequenciesDetailsTermReadingListItem = {
    term: string;
    reading: string | null;
};

export type GetTermFrequenciesResult = Translator.TermFrequencySimple[];

// findAnkiNotes

export type FindAnkiNotesDetails = {
    query: string;
};

export type FindAnkiNotesResult = Anki.NoteId[];

// loadExtensionScripts

export type LoadExtensionScriptsDetails = {
    files: string[];
};

export type LoadExtensionScriptsResult = void;

// openCrossFramePort

export type OpenCrossFramePortDetails = {
    targetTabId: number;
    targetFrameId: number;
};

export type OpenCrossFramePortResult = {
    targetTabId: number;
    targetFrameId: number;
};

// requestBackendReadySignal

export type RequestBackendReadySignalDetails = Record<string, never>;

export type RequestBackendReadySignalResult = boolean;
