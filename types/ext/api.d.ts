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
import type * as Language from './language';
import type * as Log from './log';
import type * as Settings from './settings';
import type * as SettingsModifications from './settings-modifications';
import type * as Translation from './translation';
import type * as Translator from './translator';
import type {ApiMessageNoFrameIdAny as ApplicationApiMessageNoFrameIdAny} from './application';
import type {
    ApiMap as BaseApiMap,
    ApiMapInit as BaseApiMapInit,
    ApiHandler as BaseApiHandler,
    ApiParams as BaseApiParams,
    ApiReturn as BaseApiReturn,
    ApiNames as BaseApiNames,
    ApiParam as BaseApiParam,
    ApiParamNames as BaseApiParamNames,
    ApiParamsAny as BaseApiParamsAny,
} from './api-map';

export type FindTermsDetails = {
    deinflect?: boolean;
    matchType?: Translation.FindTermsMatchType;
};

export type ParseTextResultItem = {
    content: ParseTextLine[];
    dictionary: null | string;
    id: string;
    source: 'mecab' | 'scanning-parser';
};

export type ParseTextSegment = {
    reading: string;
    text: string;
};

export type ParseTextLine = ParseTextSegment[];

export type InjectAnkiNoteMediaTermDefinitionDetails = {
    reading: string;
    term: string;
    type: 'term';
};

export type InjectAnkiNoteMediaKanjiDefinitionDetails = {
    character: string;
    type: 'kanji';
};

export type InjectAnkiNoteMediaDefinitionDetails = InjectAnkiNoteMediaKanjiDefinitionDetails | InjectAnkiNoteMediaTermDefinitionDetails;

export type InjectAnkiNoteMediaAudioDetails = AnkiNoteBuilder.AudioMediaOptions;

export type InjectAnkiNoteMediaScreenshotDetails = {
    format: Settings.AnkiScreenshotFormat;
    frameId: number;
    quality: number;
    tabId: number;
};

export type InjectAnkiNoteMediaClipboardDetails = {
    image: boolean;
    text: boolean;
};

export type InjectAnkiNoteMediaDictionaryMediaDetails = {
    dictionary: string;
    path: string;
};

export type InjectAnkiNoteDictionaryMediaResult = {
    dictionary: string;
    fileName: null | string;
    path: string;
};

export type GetMediaDetailsTarget = {
    dictionary: string;
    path: string;
};

export type GetTermFrequenciesDetailsTermReadingListItem = {
    reading: null | string;
    term: string;
};

type ApiSurface = {
    addAnkiNote: {
        params: {
            note: Anki.Note;
        };
        return: Anki.NoteId | null;
    };
    applicationReady: {
        params: void;
        return: void;
    };
    broadcastTab: {
        params: {
            message: ApplicationApiMessageNoFrameIdAny;
        };
        return: boolean;
    };
    clipboardGet: {
        params: void;
        return: string;
    };
    commandExec: {
        params: {
            command: string;
            params?: Core.SerializableObject;
        };
        return: boolean;
    };
    findAnkiNotes: {
        params: {
            query: string;
        };
        return: Anki.NoteId[];
    };
    frameInformationGet: {
        params: void;
        return: Extension.ContentOrigin;
    };
    getAnkiConnectVersion: {
        params: void;
        return: null | number;
    };
    getAnkiNoteInfo: {
        params: {
            fetchAdditionalInfo: boolean;
            notes: Anki.Note[];
        };
        return: Anki.NoteInfoWrapper[];
    };
    getDefaultAnkiFieldTemplates: {
        params: void;
        return: string;
    };
    getDictionaryInfo: {
        params: void;
        return: DictionaryImporter.Summary[];
    };
    getEnvironmentInfo: {
        params: void;
        return: Environment.Info;
    };
    getLanguageSummaries: {
        params: void;
        return: Language.LanguageSummary[];
    };
    getMedia: {
        params: {
            targets: GetMediaDetailsTarget[];
        };
        return: DictionaryDatabase.MediaDataStringContent[];
    };
    getOrCreateSearchPopup: {
        params: {
            focus?: 'ifCreated' | boolean;
            text?: string;
        };
        return: {
            tabId: null | number;
            windowId: number;
        };
    };
    getSettings: {
        params: {
            targets: SettingsModifications.ScopedRead[];
        };
        return: Core.Response<SettingsModifications.ModificationResult>[];
    };
    getStylesheetContent: {
        params: {
            url: string;
        };
        return: string;
    };
    getTermAudioInfoList: {
        params: {
            languageSummary: Language.LanguageSummary;
            reading: string;
            source: Audio.AudioSourceInfo;
            term: string;
        };
        return: AudioDownloader.Info[];
    };
    getTermFrequencies: {
        params: {
            dictionaries: string[];
            termReadingList: GetTermFrequenciesDetailsTermReadingListItem[];
        };
        return: Translator.TermFrequencySimple[];
    };
    getZoom: {
        params: void;
        return: {
            zoomFactor: number;
        };
    };
    injectAnkiNoteMedia: {
        params: {
            audioDetails: InjectAnkiNoteMediaAudioDetails | null;
            clipboardDetails: InjectAnkiNoteMediaClipboardDetails | null;
            definitionDetails: InjectAnkiNoteMediaDefinitionDetails;
            dictionaryMediaDetails: InjectAnkiNoteMediaDictionaryMediaDetails[];
            screenshotDetails: InjectAnkiNoteMediaScreenshotDetails | null;
            timestamp: number;
        };
        return: {
            audioFileName: null | string;
            clipboardImageFileName: null | string;
            clipboardText: null | string;
            dictionaryMedia: InjectAnkiNoteDictionaryMediaResult[];
            errors: Core.SerializedError[];
            screenshotFileName: null | string;
        };
    };
    injectStylesheet: {
        params: {
            type: 'code' | 'file';
            value: string;
        };
        return: void;
    };
    isAnkiConnected: {
        params: void;
        return: boolean;
    };
    isTabSearchPopup: {
        params: {
            tabId: number;
        };
        return: boolean;
    };
    isTextLookupWorthy: {
        params: {
            language: string;
            text: string;
        };
        return: boolean;
    };
    kanjiFind: {
        params: {
            optionsContext: Settings.OptionsContext;
            text: string;
        };
        return: Dictionary.KanjiDictionaryEntry[];
    };
    logGenericErrorBackend: {
        params: {
            context: Log.LogContext | undefined;
            error: Core.SerializedError;
            level: Log.LogLevel;
        };
        return: void;
    };
    logIndicatorClear: {
        params: void;
        return: void;
    };
    modifySettings: {
        params: {
            source: string;
            targets: SettingsModifications.ScopedModification[];
        };
        return: Core.Response<SettingsModifications.ModificationResult>[];
    };
    openCrossFramePort: {
        params: {
            targetFrameId: number;
            targetTabId: number;
        };
        return: {
            targetFrameId: number;
            targetTabId: number;
        };
    };
    optionsGet: {
        params: {
            optionsContext: Settings.OptionsContext;
        };
        return: Settings.ProfileOptions;
    };
    optionsGetFull: {
        params: void;
        return: Settings.Options;
    };
    parseText: {
        params: {
            optionsContext: Settings.OptionsContext;
            scanLength: number;
            text: string;
            useInternalParser: boolean;
            useMecabParser: boolean;
        };
        return: ParseTextResultItem[];
    };
    purgeDatabase: {
        params: void;
        return: void;
    };
    requestBackendReadySignal: {
        params: void;
        return: boolean;
    };
    sendMessageToFrame: {
        params: {
            frameId: number;
            message: ApplicationApiMessageNoFrameIdAny;
        };
        return: boolean;
    };
    setAllSettings: {
        params: {
            source: string;
            value: Settings.Options;
        };
        return: void;
    };
    suspendAnkiCardsForNote: {
        params: {
            noteId: Anki.NoteId;
        };
        return: number;
    };
    termsFind: {
        params: {
            details: FindTermsDetails;
            optionsContext: Settings.OptionsContext;
            text: string;
        };
        return: {
            dictionaryEntries: Dictionary.TermDictionaryEntry[];
            originalTextLength: number;
        };
    };
    testMecab: {
        params: void;
        return: true;
    };
    triggerDatabaseUpdated: {
        params: {
            cause: Backend.DatabaseUpdateCause;
            type: Backend.DatabaseUpdateType;
        };
        return: void;
    };
    updateAnkiNote: {
        params: {
            noteWithId: Anki.NoteWithId;
        };
        return: null;
    };
    viewNotes: {
        params: {
            allowFallback: boolean;
            mode: Settings.AnkiNoteGuiMode;
            noteIds: Anki.NoteId[];
        };
        return: Settings.AnkiNoteGuiMode;
    };
};

type ApiExtraArgs = [sender: chrome.runtime.MessageSender];

export type ApiNames = BaseApiNames<ApiSurface>;

export type ApiMap = BaseApiMap<ApiSurface, ApiExtraArgs>;

export type ApiMapInit = BaseApiMapInit<ApiSurface, ApiExtraArgs>;

export type ApiHandler<TName extends ApiNames> = BaseApiHandler<ApiSurface[TName], ApiExtraArgs>;

export type ApiHandlerNoExtraArgs<TName extends ApiNames> = BaseApiHandler<ApiSurface[TName], []>;

export type ApiParams<TName extends ApiNames> = BaseApiParams<ApiSurface[TName]>;

export type ApiParam<TName extends ApiNames, TParamName extends BaseApiParamNames<ApiSurface[TName]>> = BaseApiParam<ApiSurface[TName], TParamName>;

export type ApiReturn<TName extends ApiNames> = BaseApiReturn<ApiSurface[TName]>;

export type ApiParamsAny = BaseApiParamsAny<ApiSurface>;

export type ApiMessageAny = {[name in ApiNames]: ApiMessage<name>}[ApiNames];

type ApiMessage<TName extends ApiNames> = {
    action: TName;
    params: ApiParams<TName>;
};
