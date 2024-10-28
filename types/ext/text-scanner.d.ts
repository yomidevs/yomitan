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

import type {TextSourceGenerator} from '../../ext/js/dom/text-source-generator';
import type {API} from '../../ext/js/comm/api';
import type * as Dictionary from './dictionary';
import type * as Display from './display';
import type * as Input from './input';
import type * as Settings from './settings';
import type * as TextSource from './text-source';
import type {EventNames, EventArgument as BaseEventArgument} from './core';

export type SearchResultDetail = {
    documentTitle: string;
};

export type Options = {
    inputs?: InputOptionsOuter[];
    deepContentScan?: boolean;
    normalizeCssZoom?: boolean;
    selectText?: boolean;
    delay?: number;
    touchInputEnabled?: boolean;
    pointerEventsEnabled?: boolean;
    scanLength?: number;
    layoutAwareScan?: boolean;
    preventMiddleMouse?: boolean;
    matchTypePrefix?: boolean;
    sentenceParsingOptions?: SentenceParsingOptions;
    scanWithoutMousemove?: boolean;
    scanResolution?: string;
};

export type InputOptionsOuter = {
    include: string;
    exclude: string;
    types: {
        mouse: boolean;
        touch: boolean;
        pen: boolean;
    };
    options: InputOptions;
};

export type InputOptions = {
    searchTerms: boolean;
    searchKanji: boolean;
    scanOnTouchMove: boolean;
    scanOnTouchPress: boolean;
    scanOnTouchRelease: boolean;
    scanOnTouchTap: boolean;
    scanOnPenMove: boolean;
    scanOnPenHover: boolean;
    scanOnPenReleaseHover: boolean;
    scanOnPenPress: boolean;
    scanOnPenRelease: boolean;
    preventTouchScrolling: boolean;
    preventPenScrolling: boolean;
};

export type SentenceParsingOptions = {
    scanExtent: number;
    terminationCharacterMode: Settings.SentenceTerminationCharacterMode;
    terminationCharacters: Settings.SentenceParsingTerminationCharacterOption[];
};

export type InputConfig = {
    include: string[];
    exclude: string[];
    types: Set<Input.PointerType>;
    searchTerms: boolean;
    searchKanji: boolean;
    scanOnTouchMove: boolean;
    scanOnTouchPress: boolean;
    scanOnTouchRelease: boolean;
    scanOnTouchTap: boolean;
    scanOnPenMove: boolean;
    scanOnPenHover: boolean;
    scanOnPenReleaseHover: boolean;
    scanOnPenPress: boolean;
    scanOnPenRelease: boolean;
    preventTouchScrolling: boolean;
    preventPenScrolling: boolean;
};

export type InputInfo = {
    input: InputConfig | null;
    pointerType: Input.PointerType;
    eventType: Input.PointerEventType;
    passive: boolean;
    modifiers: Input.Modifier[];
    modifierKeys: Input.ModifierKey[];
    detail: InputInfoDetail | undefined;
};

export type InputInfoDetail = {
    focus: boolean;
    restoreSelection: boolean;
};

export type Events = {
    clear: {
        reason: ClearReason;
    };
    searchSuccess: {
        type: 'terms' | 'kanji';
        dictionaryEntries: Dictionary.DictionaryEntry[];
        sentence: Display.HistoryStateSentence;
        inputInfo: InputInfo;
        textSource: TextSource.TextSource;
        optionsContext: Settings.OptionsContext;
        detail: SearchResultDetail;
        pageTheme: 'dark' | 'light';
    };
    searchEmpty: {
        inputInfo: InputInfo;
    };
    searchError: {
        error: Error;
        textSource: TextSource.TextSource;
        inputInfo: InputInfo;
    };
};

export type ClearReason = 'mousedown';

export type EventArgument<TName extends EventNames<Events>> = BaseEventArgument<Events, TName>;

export type GetSearchContextCallback = GetSearchContextCallbackSync | GetSearchContextCallbackAsync;

export type GetSearchContextCallbackSync = () => SearchContext;

export type GetSearchContextCallbackAsync = () => Promise<SearchContext>;

export type ConstructorDetails = {
    api: API;
    node: HTMLElement | Window;
    getSearchContext: GetSearchContextCallback;
    ignoreElements?: (() => Element[]) | null;
    ignorePoint?: ((x: number, y: number) => Promise<boolean>) | null;
    searchTerms?: boolean;
    searchKanji?: boolean;
    textSourceGenerator: TextSourceGenerator;
};

export type SearchContext = {
    optionsContext: Settings.OptionsContext;
    detail: SearchResultDetail;
};

export type SelectionRestoreInfo = {
    ranges: Range[];
};

export type TermSearchResults = {
    type: 'terms';
    dictionaryEntries: Dictionary.TermDictionaryEntry[];
    sentence: Sentence;
};

export type KanjiSearchResults = {
    type: 'kanji';
    dictionaryEntries: Dictionary.KanjiDictionaryEntry[];
    sentence: Sentence;
};

export type SearchResults = TermSearchResults | KanjiSearchResults;

export type Sentence = {
    text: string;
    offset: number;
};

export type SentenceTerminatorMap = Map<string, [includeCharacterAtStart: boolean, includeCharacterAtEnd: boolean]>;

export type SentenceForwardQuoteMap = Map<string, [character: string, includeCharacterAtStart: boolean]>;

export type SentenceBackwardQuoteMap = Map<string, [character: string, includeCharacterAtEnd: boolean]>;
