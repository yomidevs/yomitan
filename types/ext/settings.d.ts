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

import type * as Input from './input';

export type OptionsContextFlag = 'clipboard';

export type OptionsContext1 = {
    current?: undefined;
    depth: number;
    flags?: OptionsContextFlag[];
    index?: undefined;
    modifierKeys?: Input.ModifierKey[];
    modifiers?: Input.Modifier[];
    url: string;
};

export type OptionsContext2 = {
    current?: undefined;
    depth?: undefined;
    flags?: OptionsContextFlag[];
    index: number;
    modifierKeys?: Input.ModifierKey[];
    modifiers?: Input.Modifier[];
    url?: undefined;
};

export type OptionsContext3 = {
    current: true;
    depth?: undefined;
    flags?: OptionsContextFlag[];
    index?: undefined;
    modifierKeys?: Input.ModifierKey[];
    modifiers?: Input.Modifier[];
    url?: undefined;
};

export type OptionsContext = OptionsContext1 | OptionsContext2 | OptionsContext3;

export type Options = {
    global: GlobalOptions;
    profileCurrent: number;
    profiles: Profile[];
    version: number;
};

export type GlobalOptions = {
    database: GlobalDatabaseOptions;
};

export type GlobalDatabaseOptions = {
    prefixWildcardsSupported: boolean;
};

export type Profile = {
    conditionGroups: ProfileConditionGroup[];
    name: string;
    options: ProfileOptions;
};

export type ProfileConditionGroup = {
    conditions: ProfileCondition[];
};

export type ProfileConditionType = 'flags' | 'modifierKeys' | 'popupLevel' | 'url';

export type ProfileCondition = {
    operator: string;
    type: ProfileConditionType;
    value: string;
};

export type ProfileOptions = {
    accessibility: AccessibilityOptions;
    anki: AnkiOptions;
    audio: AudioOptions;
    clipboard: ClipboardOptions;
    dictionaries: DictionariesOptions;
    general: GeneralOptions;
    inputs: InputsOptions;
    parsing: ParsingOptions;
    popupWindow: PopupWindowOptions;
    scanning: ScanningOptions;
    sentenceParsing: SentenceParsingOptions;
    translation: TranslationOptions;
};

export type GeneralOptions = {
    compactTags: boolean;
    customPopupCss: string;
    customPopupOuterCss: string;
    debugInfo: boolean;
    enable: boolean;
    enableContextMenuScanSelected: boolean;
    enableWanakana: boolean;
    fontFamily: string;
    fontSize: number;
    frequencyDisplayMode: FrequencyDisplayMode;
    glossaryLayoutMode: GlossaryLayoutMode;
    language: string;
    lineHeight: string;
    mainDictionary: string;
    maxResults: number;
    popupActionBarLocation: PopupActionBarLocation;
    popupActionBarVisibility: PopupActionBarVisibility;
    popupCurrentIndicatorMode: PopupCurrentIndicatorMode;
    popupDisplayMode: PopupDisplayMode;
    popupHeight: number;
    popupHorizontalOffset: number;
    popupHorizontalOffset2: number;
    popupHorizontalTextPosition: PopupHorizontalTextPosition;
    popupOuterTheme: PopupOuterTheme;
    popupScaleRelativeToPageZoom: boolean;
    popupScaleRelativeToVisualViewport: boolean;
    popupScalingFactor: number;
    popupTheme: PopupTheme;
    popupVerticalOffset: number;
    popupVerticalOffset2: number;
    popupVerticalTextPosition: PopupVerticalTextPosition;
    popupWidth: number;
    resultOutputMode: ResultOutputMode;
    showAdvanced: boolean;
    showGuide: boolean;
    showIframePopupsInRootFrame: boolean;
    showPitchAccentDownstepNotation: boolean;
    showPitchAccentGraph: boolean;
    showPitchAccentPositionNotation: boolean;
    sortFrequencyDictionary: null | string;
    sortFrequencyDictionaryOrder: SortFrequencyDictionaryOrder;
    stickySearchHeader: boolean;
    termDisplayMode: TermDisplayMode;
    usePopupShadowDom: boolean;
    usePopupWindow: boolean;
    useSecurePopupFrameUrl: boolean;
};

export type PopupWindowOptions = {
    height: number;
    left: number;
    top: number;
    useLeft: boolean;
    useTop: boolean;
    width: number;
    windowState: PopupWindowState;
    windowType: PopupWindowType;
};

export type AudioOptions = {
    autoPlay: boolean;
    enabled: boolean;
    sources: AudioSourceOptions[];
    volume: number;
};

export type AudioSourceOptions = {
    type: AudioSourceType;
    url: string;
    voice: string;
};

export type ScanningOptions = {
    alphanumeric: boolean;
    autoHideResults: boolean;
    deepDomScan: boolean;
    delay: number;
    enableOnPopupExpressions: boolean;
    enableOnSearchPage: boolean;
    enablePopupSearch: boolean;
    enableSearchTags: boolean;
    hideDelay: number;
    hidePopupOnCursorExit: boolean;
    hidePopupOnCursorExitDelay: number;
    inputs: ScanningInput[];
    layoutAwareScan: boolean;
    length: number;
    matchTypePrefix: boolean;
    normalizeCssZoom: boolean;
    pointerEventsEnabled: boolean;
    popupNestingMaxDepth: number;
    preventMiddleMouse: ScanningPreventMiddleMouseOptions;
    scanAltText: boolean;
    scanResolution: string;
    scanWithoutMousemove: boolean;
    selectText: boolean;
    touchInputEnabled: boolean;
};

export type ScanningInput = {
    exclude: string;
    include: string;
    options: ScanningInputOptions;
    types: ScanningInputTypes;
};

export type ScanningInputTypes = {
    mouse: boolean;
    pen: boolean;
    touch: boolean;
};

export type ScanningInputOptions = {
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
    showAdvanced: boolean;
};

export type ScanningPreventMiddleMouseOptions = {
    onPopupPages: boolean;
    onSearchPages: boolean;
    onSearchQuery: boolean;
    onWebPages: boolean;
};

export type TranslationOptions = {
    alphabeticToHiragana: TranslationConvertType;
    collapseEmphaticSequences: TranslationCollapseEmphaticSequences;
    convertHalfWidthCharacters: TranslationConvertType;
    convertHiraganaToKatakana: TranslationConvertType;
    convertKatakanaToHiragana: TranslationConvertType;
    convertNumericCharacters: TranslationConvertType;
    searchResolution: SearchResolution;
    textReplacements: TranslationTextReplacementOptions;
};

export type SearchResolution = 'letter' | 'word';

export type TranslationTextReplacementOptions = {
    groups: TranslationTextReplacementGroup[][];
    searchOriginal: boolean;
};

export type TranslationTextReplacementGroup = {
    ignoreCase: boolean;
    pattern: string;
    replacement: string;
};

export type DictionariesOptions = DictionaryOptions[];

export type DictionaryOptions = {
    alias: string;
    allowSecondarySearches: boolean;
    definitionsCollapsible: DictionaryDefinitionsCollapsible;
    enabled: boolean;
    name: string;
    partsOfSpeechFilter: boolean;
    priority: number;
    styles?: string;
    useDeinflections: boolean;
};

export type ParsingOptions = {
    enableMecabParser: boolean;
    enableScanningParser: boolean;
    readingMode: ParsingReadingMode;
    selectedParser: null | string;
    termSpacing: boolean;
};

export type AnkiOptions = {
    apiKey: string;
    checkForDuplicates: boolean;
    displayTags: AnkiDisplayTags;
    downloadTimeout: number;
    duplicateBehavior: AnkiDuplicateBehavior;
    duplicateScope: AnkiDuplicateScope;
    duplicateScopeCheckAllModels: boolean;
    enable: boolean;
    fieldTemplates: null | string;
    kanji: AnkiNoteOptions;
    noteGuiMode: AnkiNoteGuiMode;
    screenshot: AnkiScreenshotOptions;
    server: string;
    suspendNewCards: boolean;
    tags: string[];
    terms: AnkiNoteOptions;
};

export type AnkiScreenshotOptions = {
    format: AnkiScreenshotFormat;
    quality: number;
};

export type AnkiNoteOptions = {
    deck: string;
    fields: AnkiNoteFields;
    model: string;
};

export type AnkiNoteFields = {
    [key: string]: string;
};

export type SentenceParsingOptions = {
    scanExtent: number;
    terminationCharacterMode: SentenceTerminationCharacterMode;
    terminationCharacters: SentenceParsingTerminationCharacterOption[];
};

export type SentenceParsingTerminationCharacterOption = {
    character1: string;
    character2: null | string;
    enabled: boolean;
    includeCharacterAtEnd: boolean;
    includeCharacterAtStart: boolean;
};

export type InputsOptions = {
    hotkeys: InputsHotkeyOptions[];
};

export type InputsHotkeyOptions = {
    action: string;
    argument: string;
    enabled: boolean;
    key: null | string;
    modifiers: InputsHotkeyModifier[];
    scopes: InputsHotkeyScope[];
};

export type ClipboardOptions = {
    autoSearchContent: boolean;
    enableBackgroundMonitor: boolean;
    enableSearchPageMonitor: boolean;
    maximumSearchLength: number;
};

export type AccessibilityOptions = {
    forceGoogleDocsHtmlRendering: boolean;
};

export type PreventMiddleMouseOptions = {
    onPopupPages: boolean;
    onSearchPages: boolean;
    onSearchQuery: boolean;
    onWebPages: boolean;
};

export type ResultOutputMode = 'group' | 'merge' | 'split';

export type PopupDisplayMode = 'default' | 'full-width';

export type PopupHorizontalTextPosition = 'above' | 'below';

export type PopupVerticalTextPosition = 'after' | 'before' | 'default' | 'left' | 'right';

export type GlossaryLayoutMode = 'compact' | 'default';

export type PopupTheme = 'browser' | 'dark' | 'light';

export type PopupOuterTheme = 'browser' | 'dark' | 'light' | 'site';

export type PopupCurrentIndicatorMode = 'asterisk' | 'bar-left' | 'bar-right' | 'dot-left' | 'dot-right' | 'none' | 'triangle';

export type PopupActionBarVisibility = 'always' | 'auto';

export type PopupActionBarLocation = 'bottom' | 'left' | 'right' | 'top';

export type FrequencyDisplayMode = 'inline-list' | 'list' | 'split-tags' | 'split-tags-grouped' | 'tags' | 'tags-grouped';

export type TermDisplayMode = 'ruby' | 'ruby-and-reading' | 'term-and-reading' | 'term-only';

export type SortFrequencyDictionaryOrder = 'ascending' | 'descending';

export type PopupWindowType = 'normal' | 'popup';

export type PopupWindowState = 'fullscreen' | 'maximized' | 'normal';

export type AudioSourceType = 'custom' | 'custom-json' | 'jisho' | 'jpod101' | 'language-pod-101' | 'lingua-libre' | 'text-to-speech' | 'text-to-speech-reading' | 'wiktionary';

export type TranslationConvertType = 'false' | 'true' | 'variant';

export type TranslationCollapseEmphaticSequences = 'false' | 'full' | 'true';

export type DictionaryDefinitionsCollapsible = 'collapsed' | 'expanded' | 'force-collapsed' | 'force-expanded' | 'not-collapsible';

export type ParsingReadingMode = 'dictionary-reading' | 'hiragana' | 'katakana' | 'none' | 'romaji';

export type AnkiScreenshotFormat = 'jpeg' | 'png';

export type AnkiDuplicateScope = 'collection' | 'deck' | 'deck-root';

export type AnkiDuplicateBehavior = 'new' | 'overwrite' | 'prevent';

export type AnkiDisplayTags = 'always' | 'never' | 'non-standard';

export type AnkiNoteGuiMode = 'browse' | 'edit';

export type SentenceTerminationCharacterMode = 'custom' | 'custom-no-newlines' | 'newlines' | 'none';

export type InputsHotkeyModifier = 'alt' | 'ctrl' | 'meta' | 'shift';

export type InputsHotkeyScope = 'popup' | 'search' | 'web';
