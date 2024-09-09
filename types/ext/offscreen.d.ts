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
import type * as DictionaryDatabase from './dictionary-database';
import type * as DictionaryImporter from './dictionary-importer';
import type * as Environment from './environment';
import type * as Translation from './translation';
import type * as Translator from './translator';
import type {
    ApiMap as BaseApiMap,
    ApiMapInit as BaseApiMapInit,
    ApiHandler as BaseApiHandler,
    ApiParams as BaseApiParams,
    ApiReturn as BaseApiReturn,
    ApiNames as BaseApiNames,
} from './api-map';

type ApiSurface = {
    clearDatabaseCachesOffscreen: {
        params: void;
        return: void;
    };
    clipboardGetImageOffscreen: {
        params: void;
        return: null | string;
    };
    clipboardGetTextOffscreen: {
        params: {
            useRichText: boolean;
        };
        return: string;
    };
    clipboardSetBrowserOffscreen: {
        params: {
            value: Environment.Browser | null;
        };
        return: void;
    };
    databaseGetMediaOffscreen: {
        params: {
            targets: DictionaryDatabase.MediaRequest[];
        };
        return: DictionaryDatabase.Media<string>[];
    };
    databasePrepareOffscreen: {
        params: void;
        return: void;
    };
    databasePurgeOffscreen: {
        params: void;
        return: boolean;
    };
    findKanjiOffscreen: {
        params: {
            options: FindKanjiOptionsOffscreen;
            text: string;
        };
        return: Dictionary.KanjiDictionaryEntry[];
    };
    findTermsOffscreen: {
        params: {
            mode: Translator.FindTermsMode;
            options: FindTermsOptionsOffscreen;
            text: string;
        };
        return: Translator.FindTermsResult;
    };
    getDictionaryInfoOffscreen: {
        params: void;
        return: DictionaryImporter.Summary[];
    };
    getTermFrequenciesOffscreen: {
        params: {
            dictionaries: string[];
            termReadingList: Translator.TermReadingList;
        };
        return: Translator.TermFrequencySimple[];
    };
    translatorPrepareOffscreen: {
        params: void;
        return: void;
    };
};

export type ApiMessage<TName extends ApiNames> = (
    ApiParams<TName> extends void ?
        {action: TName, params?: never} :
        {action: TName, params: ApiParams<TName>}
);

export type ApiNames = BaseApiNames<ApiSurface>;

export type FindKanjiOptionsOffscreen = {
    enabledDictionaryMap: [
        key: string,
        options: Translation.FindKanjiDictionary,
    ][];
} & Omit<Translation.FindKanjiOptions, 'enabledDictionaryMap'>;

export type FindTermsOptionsOffscreen = {
    enabledDictionaryMap: [
        key: string,
        options: Translation.FindTermDictionary,
    ][];
    excludeDictionaryDefinitions: null | string[];
    textReplacements: (FindTermsTextReplacementOffscreen[] | null)[];
} & Omit<Translation.FindTermsOptions, 'enabledDictionaryMap' | 'excludeDictionaryDefinitions' | 'textReplacements'>;

export type FindTermsTextReplacementOffscreen = {
    pattern: string;
} & Omit<Translation.FindTermsTextReplacement, 'pattern'>;

export type ApiMap = BaseApiMap<ApiSurface>;

export type ApiMapInit = BaseApiMapInit<ApiSurface>;

export type ApiHandler<TName extends ApiNames> = BaseApiHandler<ApiSurface[TName]>;

export type ApiParams<TName extends ApiNames> = BaseApiParams<ApiSurface[TName]>;

export type ApiReturn<TName extends ApiNames> = BaseApiReturn<ApiSurface[TName]>;

export type ApiMessageAny = {[name in ApiNames]: ApiMessage<name>}[ApiNames];
