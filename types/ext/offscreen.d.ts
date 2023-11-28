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

import type * as Core from './core';
import type * as Deinflector from './deinflector';
import type * as Dictionary from './dictionary';
import type * as DictionaryDatabase from './dictionary-database';
import type * as DictionaryImporter from './dictionary-importer';
import type * as Environment from './environment';
import type * as Translation from './translation';
import type * as Translator from './translator';

export type MessageAny2 = Message<keyof MessageDetailsMap>;

export type Message<T extends MessageType> = (
    MessageDetailsMap[T] extends undefined ?
        {action: T} :
        {action: T, params: MessageDetailsMap[T]}
);

export type MessageReturn<T extends MessageType> = MessageReturnMap[T];

type MessageDetailsMap = {
    databasePrepareOffscreen: undefined;
    getDictionaryInfoOffscreen: undefined;
    databasePurgeOffscreen: undefined;
    databaseGetMediaOffscreen: {
        targets: DictionaryDatabase.MediaRequest[];
    };
    translatorPrepareOffscreen: {
        deinflectionReasons: Deinflector.ReasonsRaw;
    };
    findKanjiOffscreen: {
        text: string;
        options: FindKanjiOptionsOffscreen;
    };
    findTermsOffscreen: {
        mode: Translator.FindTermsMode;
        text: string;
        options: FindTermsOptionsOffscreen;
    };
    getTermFrequenciesOffscreen: {
        termReadingList: Translator.TermReadingList;
        dictionaries: string[];
    };
    clearDatabaseCachesOffscreen: undefined;
    clipboardSetBrowserOffscreen: {
        value: Environment.Browser | null;
    };
    clipboardGetTextOffscreen: {
        useRichText: boolean;
    };
    clipboardGetImageOffscreen: undefined;
};

type MessageReturnMap = {
    databasePrepareOffscreen: void;
    getDictionaryInfoOffscreen: DictionaryImporter.Summary[];
    databasePurgeOffscreen: boolean;
    databaseGetMediaOffscreen: DictionaryDatabase.Media<string>[];
    translatorPrepareOffscreen: void;
    findKanjiOffscreen: Dictionary.KanjiDictionaryEntry[];
    findTermsOffscreen: Translator.FindTermsResult;
    getTermFrequenciesOffscreen: Translator.TermFrequencySimple[];
    clearDatabaseCachesOffscreen: void;
    clipboardSetBrowserOffscreen: void;
    clipboardGetTextOffscreen: string;
    clipboardGetImageOffscreen: string | null;
};

export type MessageType = keyof MessageDetailsMap;

export type FindKanjiOptionsOffscreen = Omit<Translation.FindKanjiOptions, 'enabledDictionaryMap'> & {
    enabledDictionaryMap: [
        key: string,
        options: Translation.FindKanjiDictionary,
    ][];
};


export type FindTermsOptionsOffscreen = Omit<Translation.FindTermsOptions, 'enabledDictionaryMap' | 'excludeDictionaryDefinitions' | 'textReplacements'> & {
    enabledDictionaryMap: [
        key: string,
        options: Translation.FindTermDictionary,
    ][];
    excludeDictionaryDefinitions: string[] | null;
    textReplacements: (FindTermsTextReplacementOffscreen[] | null)[];
};

export type FindTermsTextReplacementOffscreen = Omit<Translation.FindTermsTextReplacement, 'pattern'> & {
    pattern: string;
};

export type MessageHandler<
    TMessage extends MessageType,
    TIsAsync extends boolean,
> = (
    details: MessageDetailsMap[TMessage],
) => (TIsAsync extends true ? Promise<MessageReturn<TMessage>> : MessageReturn<TMessage>);

export type MessageHandlerMap<T = MessageType> = Map<T, Core.MessageHandlerDetails>;
