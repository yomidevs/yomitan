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
    deepContentScan?: boolean;
    delay?: number;
    inputs?: InputOptionsOuter[];
    layoutAwareScan?: boolean;
    matchTypePrefix?: boolean;
    normalizeCssZoom?: boolean;
    pointerEventsEnabled?: boolean;
    preventMiddleMouse?: boolean;
    scanAltText?: boolean;
    scanLength?: number;
    scanResolution?: string;
    scanWithoutMousemove?: boolean;
    selectText?: boolean;
    sentenceParsingOptions?: SentenceParsingOptions;
    touchInputEnabled?: boolean;
};

export type InputOptionsOuter = {
    exclude: string;
    include: string;
    options: InputOptions;
    types: {
        mouse: boolean;
        pen: boolean;
        touch: boolean;
    };
};

export type InputOptions = {
    preventPenScrolling: boolean;
    preventTouchScrolling: boolean;
    scanOnPenHover: boolean;
    scanOnPenMove: boolean;
    scanOnPenPress: boolean;
    scanOnPenRelease: boolean;
    scanOnPenReleaseHover: boolean;
    scanOnTouchMove: boolean;
    scanOnTouchPress: boolean;
    scanOnTouchRelease: boolean;
    scanOnTouchTap: boolean;
    searchKanji: boolean;
    searchTerms: boolean;
};

export type SentenceParsingOptions = {
    scanExtent: number;
    terminationCharacterMode: Settings.SentenceTerminationCharacterMode;
    terminationCharacters: Settings.SentenceParsingTerminationCharacterOption[];
};

export type InputConfig = {
    exclude: string[];
    include: string[];
    preventPenScrolling: boolean;
    preventTouchScrolling: boolean;
    scanOnPenHover: boolean;
    scanOnPenMove: boolean;
    scanOnPenPress: boolean;
    scanOnPenRelease: boolean;
    scanOnPenReleaseHover: boolean;
    scanOnTouchMove: boolean;
    scanOnTouchPress: boolean;
    scanOnTouchRelease: boolean;
    scanOnTouchTap: boolean;
    searchKanji: boolean;
    searchTerms: boolean;
    types: Set<PointerType>;
};

export type InputInfo = {
    detail: InputInfoDetail | undefined;
    eventType: PointerEventType;
    input: InputConfig | null;
    modifierKeys: Input.ModifierKey[];
    modifiers: Input.Modifier[];
    passive: boolean;
    pointerType: PointerType;
};

export type InputInfoDetail = {
    focus: boolean;
    restoreSelection: boolean;
};

export type Events = {
    clear: {
        reason: ClearReason;
    };
    searchEmpty: {
        inputInfo: InputInfo;
    };
    searchError: {
        error: Error;
        inputInfo: InputInfo;
        textSource: TextSource.TextSource;
    };
    searchSuccess: {
        detail: SearchResultDetail;
        dictionaryEntries: Dictionary.DictionaryEntry[];
        inputInfo: InputInfo;
        optionsContext: Settings.OptionsContext;
        pageTheme: 'dark' | 'light';
        sentence: Display.HistoryStateSentence;
        textSource: TextSource.TextSource;
        type: 'kanji' | 'terms';
    };
};

export type ClearReason = 'mousedown';

export type EventArgument<TName extends EventNames<Events>> = BaseEventArgument<Events, TName>;

export type GetSearchContextCallback = GetSearchContextCallbackAsync | GetSearchContextCallbackSync;

export type GetSearchContextCallbackSync = () => SearchContext;

export type GetSearchContextCallbackAsync = () => Promise<SearchContext>;

export type ConstructorDetails = {
    api: API;
    getSearchContext: GetSearchContextCallback;
    ignoreElements?: (() => Element[]) | null;
    ignorePoint?: ((x: number, y: number) => Promise<boolean>) | null;
    node: HTMLElement | Window;
    searchKanji?: boolean;
    searchOnClick?: boolean;
    searchOnClickOnly?: boolean;
    searchTerms?: boolean;
    textSourceGenerator: TextSourceGenerator;
};

export type SearchContext = {
    detail: SearchResultDetail;
    optionsContext: Settings.OptionsContext;
};

export type SelectionRestoreInfo = {
    ranges: Range[];
};

export type TermSearchResults = {
    dictionaryEntries: Dictionary.TermDictionaryEntry[];
    sentence: Sentence;
    type: 'terms';
};

export type KanjiSearchResults = {
    dictionaryEntries: Dictionary.KanjiDictionaryEntry[];
    sentence: Sentence;
    type: 'kanji';
};

export type SearchResults = KanjiSearchResults | TermSearchResults;

export type Sentence = {
    offset: number;
    text: string;
};

export type PointerType = (
    'mouse' |
    'pen' |
    'script' |
    'touch'
);

export type PointerEventType = (
    'click' |
    'mouseMove' |
    'pointerDown' |
    'pointerMove' |
    'pointerOver' |
    'pointerUp' |
    'script' |
    'touchEnd' |
    'touchMove' |
    'touchStart'
);

/**
 * An enum representing the pen pointer state.
 * - `0` - Not active.
 * - `1` - Hovering.
 * - `2` - Touching.
 * - `3` - Hovering after touching.
 */
export type PenPointerState = 0 | 1 | 2 | 3;

export type SentenceTerminatorMap = Map<string, [includeCharacterAtStart: boolean, includeCharacterAtEnd: boolean]>;

export type SentenceForwardQuoteMap = Map<string, [character: string, includeCharacterAtStart: boolean]>;

export type SentenceBackwardQuoteMap = Map<string, [character: string, includeCharacterAtEnd: boolean]>;
