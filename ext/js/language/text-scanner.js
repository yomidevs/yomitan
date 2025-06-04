/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2019-2022  Yomichan Authors
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

import {ThemeController} from '../app/theme-controller.js';
import {EventDispatcher} from '../core/event-dispatcher.js';
import {EventListenerCollection} from '../core/event-listener-collection.js';
import {log} from '../core/log.js';
import {safePerformance} from '../core/safe-performance.js';
import {clone} from '../core/utilities.js';
import {anyNodeMatchesSelector, everyNodeMatchesSelector, getActiveModifiers, getActiveModifiersAndButtons, isPointInSelection} from '../dom/document-util.js';
import {TextSourceElement} from '../dom/text-source-element.js';

const SCAN_RESOLUTION_EXCLUDED_LANGUAGES = new Set(['ja', 'zh', 'yue', 'ko']);

/**
 * @augments EventDispatcher<import('text-scanner').Events>
 */
export class TextScanner extends EventDispatcher {
    /**
     * @param {import('text-scanner').ConstructorDetails} details
     */
    constructor({
        api,
        node,
        getSearchContext,
        ignoreElements = null,
        ignorePoint = null,
        searchTerms = false,
        searchKanji = false,
        searchOnClick = false,
        searchOnClickOnly = false,
        textSourceGenerator,
    }) {
        super();
        /** @type {import('../comm/api.js').API} */
        this._api = api;
        /** @type {HTMLElement|Window} */
        this._node = node;
        /** @type {import('text-scanner').GetSearchContextCallback} */
        this._getSearchContext = getSearchContext;
        /** @type {?(() => Element[])} */
        this._ignoreElements = ignoreElements;
        /** @type {?((x: number, y: number) => Promise<boolean>)} */
        this._ignorePoint = ignorePoint;
        /** @type {boolean} */
        this._searchTerms = searchTerms;
        /** @type {boolean} */
        this._searchKanji = searchKanji;
        /** @type {boolean} */
        this._searchOnClick = searchOnClick;
        /** @type {boolean} */
        this._searchOnClickOnly = searchOnClickOnly;
        /** @type {import('../dom/text-source-generator').TextSourceGenerator} */
        this._textSourceGenerator = textSourceGenerator;

        /** @type {boolean} */
        this._isPrepared = false;
        /** @type {?string} */
        this._includeSelector = null;
        /** @type {?string} */
        this._excludeSelector = null;
        /** @type {?string} */
        this._touchExcludeSelector = null;
        /** @type {?string} */
        this._language = null;

        /** @type {?import('text-scanner').InputInfo} */
        this._inputInfoCurrent = null;
        /** @type {?Promise<boolean>} */
        this._scanTimerPromise = null;
        /** @type {?(value: boolean) => void} */
        this._scanTimerPromiseResolve = null;
        /** @type {?import('text-source').TextSource} */
        this._textSourceCurrent = null;
        /** @type {boolean} */
        this._textSourceCurrentSelected = false;
        /** @type {boolean} */
        this._pendingLookup = false;
        /** @type {?import('text-scanner').SelectionRestoreInfo} */
        this._selectionRestoreInfo = null;

        /** @type {PointerEvent | null} */
        this._lastMouseMove = null;

        /** @type {boolean} */
        this._deepContentScan = false;
        /** @type {boolean} */
        this._normalizeCssZoom = true;
        /** @type {boolean} */
        this._selectText = false;
        /** @type {number} */
        this._delay = 0;
        /** @type {number} */
        this._scanLength = 1;
        /** @type {boolean} */
        this._layoutAwareScan = false;
        /** @type {boolean} */
        this._preventMiddleMouse = false;
        /** @type {boolean} */
        this._matchTypePrefix = false;
        /** @type {number} */
        this._sentenceScanExtent = 0;
        /** @type {boolean} */
        this._sentenceTerminateAtNewlines = true;
        /** @type {import('text-scanner').SentenceTerminatorMap} */
        this._sentenceTerminatorMap = new Map();
        /** @type {import('text-scanner').SentenceForwardQuoteMap} */
        this._sentenceForwardQuoteMap = new Map();
        /** @type {import('text-scanner').SentenceBackwardQuoteMap} */
        this._sentenceBackwardQuoteMap = new Map();
        /** @type {import('text-scanner').InputConfig[]} */
        this._inputs = [];

        /** @type {boolean} */
        this._enabled = false;
        /** @type {boolean} */
        this._enabledValue = false;
        /** @type {EventListenerCollection} */
        this._eventListeners = new EventListenerCollection();

        /** @type {boolean} */
        this._preventNextClickScan = false;
        /** @type {?import('core').Timeout} */
        this._preventNextClickScanTimer = null;
        /** @type {number} */
        this._preventNextClickScanTimerDuration = 50;
        /** @type {() => void} */
        this._preventNextClickScanTimerCallback = this._onPreventNextClickScanTimeout.bind(this);

        /** @type {boolean} */
        this._touchTapValid = false;
        /** @type {number} */
        this._touchPressTime = 0;
        /** @type {?number} */
        this._primaryTouchIdentifier = null;
        /** @type {boolean} */
        this._preventNextContextMenu = false;
        /** @type {boolean} */
        this._preventNextMouseDown = false;
        /** @type {boolean} */
        this._preventNextClick = false;
        /** @type {boolean} */
        this._preventScroll = false;
        /** @type {import('input').PenPointerState} */
        this._penPointerState = 0;
        /** @type {Map<number, string>} */
        this._pointerIdTypeMap = new Map();

        /** @type {boolean} */
        this._canClearSelection = true;

        /** @type {?import('core').Timeout} */
        this._textSelectionTimer = null;
        /** @type {boolean} */
        this._yomitanIsChangingTextSelectionNow = false;
        /** @type {boolean} */
        this._userHasNotSelectedAnythingManually = true;
    }

    /** @type {boolean} */
    get canClearSelection() {
        return this._canClearSelection;
    }

    set canClearSelection(value) {
        this._canClearSelection = value;
    }

    /** @type {?string} */
    get includeSelector() {
        return this._includeSelector;
    }

    set includeSelector(value) {
        this._includeSelector = value;
    }

    /** @type {?string} */
    get excludeSelector() {
        return this._excludeSelector;
    }

    set excludeSelector(value) {
        this._excludeSelector = value;
    }

    /** @type {?string} */
    get touchEventExcludeSelector() {
        return this._touchExcludeSelector;
    }

    set touchEventExcludeSelector(value) {
        this._touchExcludeSelector = value;
    }

    /** @type {?string} */
    get language() { return this._language; }
    set language(value) { this._language = value; }

    /** */
    prepare() {
        this._isPrepared = true;
        this.setEnabled(this._enabled);
    }

    /**
     * @returns {boolean}
     */
    isEnabled() {
        return this._enabled;
    }

    /**
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this._enabled = enabled;

        const value = enabled && this._isPrepared;
        if (this._enabledValue === value) { return; }

        this._eventListeners.removeAllEventListeners();
        this._primaryTouchIdentifier = null;
        this._preventNextContextMenu = false;
        this._preventNextMouseDown = false;
        this._preventNextClick = false;
        this._preventScroll = false;
        this._penPointerState = 0;
        this._pointerIdTypeMap.clear();

        this._enabledValue = value;

        if (value) {
            this._hookEvents();
            this._userHasNotSelectedAnythingManually = this._computeUserHasNotSelectedAnythingManually();
        }
    }

    /**
     * @param {import('text-scanner').Options} options
     */
    setOptions({
        inputs,
        deepContentScan,
        normalizeCssZoom,
        selectText,
        delay,
        scanLength,
        layoutAwareScan,
        preventMiddleMouse,
        sentenceParsingOptions,
        matchTypePrefix,
        scanWithoutMousemove,
        scanResolution,
    }) {
        if (Array.isArray(inputs)) {
            this._inputs = inputs.map((input) => this._convertInput(input));
        }
        if (typeof deepContentScan === 'boolean') {
            this._deepContentScan = deepContentScan;
        }
        if (typeof normalizeCssZoom === 'boolean') {
            this._normalizeCssZoom = normalizeCssZoom;
        }
        if (typeof selectText === 'boolean') {
            this._selectText = selectText;
        }
        if (typeof delay === 'number') {
            this._delay = delay;
        }
        if (typeof scanLength === 'number') {
            this._scanLength = scanLength;
        }
        if (typeof layoutAwareScan === 'boolean') {
            this._layoutAwareScan = layoutAwareScan;
        }
        if (typeof preventMiddleMouse === 'boolean') {
            this._preventMiddleMouse = preventMiddleMouse;
        }
        if (typeof matchTypePrefix === 'boolean') {
            this._matchTypePrefix = matchTypePrefix;
        }
        if (typeof scanWithoutMousemove === 'boolean') {
            this._scanWithoutMousemove = scanWithoutMousemove;
        }
        if (typeof scanResolution === 'string') {
            this._scanResolution = scanResolution;
        }
        if (typeof sentenceParsingOptions === 'object' && sentenceParsingOptions !== null) {
            const {scanExtent, terminationCharacterMode, terminationCharacters} = sentenceParsingOptions;
            if (typeof scanExtent === 'number') {
                this._sentenceScanExtent = scanExtent;
            }
            if (typeof terminationCharacterMode === 'string') {
                this._sentenceTerminateAtNewlines = (terminationCharacterMode === 'custom' || terminationCharacterMode === 'newlines');
                const sentenceTerminatorMap = this._sentenceTerminatorMap;
                const sentenceForwardQuoteMap = this._sentenceForwardQuoteMap;
                const sentenceBackwardQuoteMap = this._sentenceBackwardQuoteMap;
                sentenceTerminatorMap.clear();
                sentenceForwardQuoteMap.clear();
                sentenceBackwardQuoteMap.clear();
                if (
                    typeof terminationCharacters === 'object' &&
                    Array.isArray(terminationCharacters) &&
                    (terminationCharacterMode === 'custom' || terminationCharacterMode === 'custom-no-newlines')
                ) {
                    for (const {enabled, character1, character2, includeCharacterAtStart, includeCharacterAtEnd} of terminationCharacters) {
                        if (!enabled) { continue; }
                        if (character2 === null) {
                            sentenceTerminatorMap.set(character1, [includeCharacterAtStart, includeCharacterAtEnd]);
                        } else {
                            sentenceForwardQuoteMap.set(character1, [character2, includeCharacterAtStart]);
                            sentenceBackwardQuoteMap.set(character2, [character1, includeCharacterAtEnd]);
                        }
                    }
                }
            }
        }
    }

    /**
     * @param {import('text-source').TextSource} textSource
     * @param {number} length
     * @param {boolean} layoutAwareScan
     * @param {import('input').PointerType | undefined} pointerType
     * @returns {string}
     */
    getTextSourceContent(textSource, length, layoutAwareScan, pointerType) {
        const clonedTextSource = textSource.clone();

        clonedTextSource.setEndOffset(length, false, layoutAwareScan);

        const includeSelector = this._includeSelector;
        const excludeSelector = this._getExcludeSelectorForPointerType(pointerType);
        if (includeSelector !== null || excludeSelector !== null) {
            this._constrainTextSource(clonedTextSource, includeSelector, excludeSelector, layoutAwareScan);
        }

        return clonedTextSource.text();
    }

    /**
     * @returns {boolean}
     */
    hasSelection() {
        return (this._textSourceCurrent !== null);
    }

    /** */
    clearSelection() {
        if (!this._canClearSelection) { return; }
        if (this._textSourceCurrent !== null) {
            if (this._textSourceCurrentSelected) {
                this._textSourceCurrent.deselect();
                if (this._selectionRestoreInfo !== null) {
                    this._restoreSelection(this._selectionRestoreInfo);
                    this._selectionRestoreInfo = null;
                }
            }
            this._textSourceCurrent = null;
            this._textSourceCurrentSelected = false;
            this._inputInfoCurrent = null;
        }
    }

    /** */
    clearMousePosition() {
        this._lastMouseMove = null;
    }

    /**
     * @returns {?import('text-source').TextSource}
     */
    getCurrentTextSource() {
        return this._textSourceCurrent;
    }

    /**
     * @param {?import('text-source').TextSource} textSource
     */
    setCurrentTextSource(textSource) {
        this._textSourceCurrent = textSource;
        if (this._selectText && this._userHasNotSelectedAnythingManually && textSource !== null) {
            this._yomitanIsChangingTextSelectionNow = true;
            textSource.select();
            if (this._textSelectionTimer !== null) { clearTimeout(this._textSelectionTimer); }
            // This timeout uses a 50ms delay to ensure that the selectionchange event has time to occur.
            // If the delay is 0ms, the timeout will sometimes complete before the event.
            this._textSelectionTimer = setTimeout(() => {
                this._yomitanIsChangingTextSelectionNow = false;
                this._textSelectionTimer = null;
            }, 50);
            this._textSourceCurrentSelected = true;
        } else {
            this._textSourceCurrentSelected = false;
        }
    }

    /**
     * @returns {Promise<boolean>}
     */
    async searchLast() {
        if (this._textSourceCurrent !== null && this._inputInfoCurrent !== null) {
            await this._search(this._textSourceCurrent, this._searchTerms, this._searchKanji, this._inputInfoCurrent);
            return true;
        }
        return false;
    }

    /**
     * @param {import('text-source').TextSource} textSource
     * @param {import('text-scanner').InputInfoDetail?} [inputDetail]
     * @param {boolean} showEmpty shows a "No results found" popup if no results are found
     * @param {boolean} disallowExpandStartOffset disallows expanding the start offset of the range
     */
    async search(textSource, inputDetail, showEmpty = false, disallowExpandStartOffset = false) {
        const inputInfo = this._createInputInfo(null, 'script', 'script', true, [], [], inputDetail);
        await this._search(textSource, this._searchTerms, this._searchKanji, inputInfo, showEmpty, disallowExpandStartOffset);
    }

    // Private

    /**
     * @param {import('settings').OptionsContext} baseOptionsContext
     * @param {import('text-scanner').InputInfo} inputInfo
     * @returns {import('settings').OptionsContext}
     */
    _createOptionsContextForInput(baseOptionsContext, inputInfo) {
        const optionsContext = clone(baseOptionsContext);
        const {modifiers, modifierKeys, pointerType} = inputInfo;
        optionsContext.modifiers = [...modifiers];
        optionsContext.modifierKeys = [...modifierKeys];
        optionsContext.pointerType = pointerType;
        return optionsContext;
    }

    /**
     * @param {import('text-source').TextSource} textSource
     * @param {boolean} searchTerms
     * @param {boolean} searchKanji
     * @param {import('text-scanner').InputInfo} inputInfo
     * @param {boolean} showEmpty shows a "No results found" popup if no results are found
     * @param {boolean} disallowExpandStartOffset disallows expanding the start offset of the range
     */
    async _search(textSource, searchTerms, searchKanji, inputInfo, showEmpty = false, disallowExpandStartOffset = false) {
        try {
            safePerformance.mark('scanner:_search:start');
            const isAltText = textSource instanceof TextSourceElement;
            if (inputInfo.pointerType === 'touch') {
                if (isAltText) {
                    return;
                }
                const {imposterSourceElement, rangeStartOffset} = textSource;
                if (imposterSourceElement instanceof HTMLTextAreaElement || imposterSourceElement instanceof HTMLInputElement) {
                    const isFocused = imposterSourceElement === document.activeElement;
                    if (!isFocused || imposterSourceElement.selectionStart !== rangeStartOffset) {
                        return;
                    }
                }
            }

            const inputInfoDetail = inputInfo.detail;
            const selectionRestoreInfo = (
                (typeof inputInfoDetail === 'object' && inputInfoDetail !== null && inputInfoDetail.restoreSelection) ?
                (this._inputInfoCurrent === null ? this._createSelectionRestoreInfo() : null) :
                null
            );

            if (this._scanResolution === 'word' && !disallowExpandStartOffset &&
            (this._language === null || !SCAN_RESOLUTION_EXCLUDED_LANGUAGES.has(this._language))) {
                // Move the start offset to the beginning of the word
                textSource.setStartOffset(this._scanLength, this._layoutAwareScan, true);
            }

            if (this._textSourceCurrent !== null && this._textSourceCurrent.hasSameStart(textSource)) {
                return;
            }

            const getSearchContextPromise = this._getSearchContext();
            const getSearchContextResult = getSearchContextPromise instanceof Promise ? await getSearchContextPromise : getSearchContextPromise;
            const {detail} = getSearchContextResult;
            const optionsContext = this._createOptionsContextForInput(getSearchContextResult.optionsContext, inputInfo);

            /** @type {?import('dictionary').DictionaryEntry[]} */
            let dictionaryEntries = null;
            /** @type {?import('display').HistoryStateSentence} */
            let sentence = null;
            /** @type {'terms'|'kanji'} */
            let type = 'terms';
            const result = await this._findDictionaryEntries(textSource, searchTerms, searchKanji, optionsContext);
            if (result !== null) {
                ({dictionaryEntries, sentence, type} = result);
            } else if (showEmpty || (textSource !== null && isAltText && await this._isTextLookupWorthy(textSource.content))) {
                // Shows a "No results found" message
                dictionaryEntries = [];
                sentence = {text: '', offset: 0};
            }

            if (dictionaryEntries !== null && sentence !== null) {
                this._inputInfoCurrent = inputInfo;
                this.setCurrentTextSource(textSource);
                this._selectionRestoreInfo = selectionRestoreInfo;

                /** @type {ThemeController} */
                this._themeController = new ThemeController(document.documentElement);
                const pageTheme = this._themeController.computeSiteTheme();

                this.trigger('searchSuccess', {
                    type,
                    dictionaryEntries,
                    sentence,
                    inputInfo,
                    textSource,
                    optionsContext,
                    detail,
                    pageTheme,
                });
            } else {
                this._triggerSearchEmpty(inputInfo);
            }
            safePerformance.mark('scanner:_search:end');
            safePerformance.measure('scanner:_search', 'scanner:_search:start', 'scanner:_search:end');
        } catch (error) {
            this.trigger('searchError', {
                error: error instanceof Error ? error : new Error(`A search error occurred: ${error}`),
                textSource,
                inputInfo,
            });
        }
    }

    /**
     * @param {import('text-scanner').InputInfo} inputInfo
     */
    _triggerSearchEmpty(inputInfo) {
        this.trigger('searchEmpty', {inputInfo});
    }

    /** */
    _resetPreventNextClickScan() {
        this._preventNextClickScan = false;
        if (this._preventNextClickScanTimer !== null) { clearTimeout(this._preventNextClickScanTimer); }
        this._preventNextClickScanTimer = setTimeout(this._preventNextClickScanTimerCallback, this._preventNextClickScanTimerDuration);
    }

    /** */
    _onPreventNextClickScanTimeout() {
        this._preventNextClickScanTimer = null;
    }

    /** */
    _onSelectionChange() {
        if (this._preventNextClickScanTimer !== null) { return; } // Ignore deselection that occurs at the start of the click
        this._preventNextClickScan = true;
    }

    /** */
    _onSelectionChangeCheckUserSelection() {
        if (this._yomitanIsChangingTextSelectionNow) { return; }
        this._userHasNotSelectedAnythingManually = this._computeUserHasNotSelectedAnythingManually();
    }

    /**
     * @param {PointerEvent} e
     */
    _onSearchClickPointerDown(e) {
        if (e.button !== 0) { return; }
        this._resetPreventNextClickScan();
    }

    /**
     * @param {import('input').Modifier[]} activeModifiers
     * @returns {boolean}
     */
    _modifierKeySet(activeModifiers) {
        /** @type {string[]} */
        const settingsModifiers = [];
        for (const settingsInput of this._inputs) {
            settingsModifiers.push(...settingsInput.include);
        }
        return activeModifiers.some((modifier) => settingsModifiers.includes(modifier));
    }

    /**
     * @param {KeyboardEvent} e
     */
    _onKeyDown(e) {
        const modifiers = getActiveModifiers(e);
        if (this._lastMouseMove !== null && modifiers.length > 0 && this._modifierKeySet(modifiers)) {
            if (this._inputtingText()) { return; }
            const syntheticMousePointerEvent = new PointerEvent(this._lastMouseMove.type, {
                screenX: this._lastMouseMove.screenX,
                screenY: this._lastMouseMove.screenY,
                clientX: this._lastMouseMove.clientX,
                clientY: this._lastMouseMove.clientY,
                ctrlKey: modifiers.includes('ctrl'),
                shiftKey: modifiers.includes('shift'),
                altKey: modifiers.includes('alt'),
                metaKey: modifiers.includes('meta'),
                button: this._lastMouseMove.button,
                buttons: this._lastMouseMove.buttons,
                relatedTarget: this._lastMouseMove.relatedTarget,
            });
            this._onMousePointerMove(syntheticMousePointerEvent);
        }
    }

    /**
     * @returns {boolean}
     */
    _inputtingText() {
        const activeElement = document.activeElement;
        if (activeElement && activeElement instanceof HTMLElement) {
            if (activeElement.nodeName === 'INPUT' || activeElement.nodeName === 'TEXTAREA') { return true; }
            if (activeElement.isContentEditable) { return true; }
        }
        return false;
    }

    /**
     * @param {PointerEvent} e
     * @returns {boolean|void}
     */
    _onMouseDown(e) {
        if (this._preventNextMouseDown) {
            this._preventNextMouseDown = false;
            this._preventNextClick = true;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        switch (e.button) {
            case 0: // Primary
                if (this._searchOnClick) { this._resetPreventNextClickScan(); }
                this._scanTimerClear();
                this._triggerClear('mousedown');
                break;
            case 1: // Middle
                if (this._preventMiddleMouse) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                break;
        }

        this._onMousePointerMove(e);
    }

    /** */
    _onMouseOut() {
        this._scanTimerClear();
        this.clearMousePosition();
    }

    /**
     * @param {PointerEvent} e
     * @returns {boolean|void}
     */
    _onClick(e) {
        if (this._preventNextClick) {
            this._preventNextClick = false;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        if (this._searchOnClick) {
            this._onSearchClick(e);
            return;
        }

        this._onMousePointerMove(e);
    }

    /**
     * @param {PointerEvent} e
     */
    _onSearchClick(e) {
        const preventNextClickScan = this._preventNextClickScan;
        this._preventNextClickScan = false;
        if (this._preventNextClickScanTimer !== null) {
            clearTimeout(this._preventNextClickScanTimer);
            this._preventNextClickScanTimer = null;
        }

        if (preventNextClickScan) { return; }

        const modifiers = getActiveModifiersAndButtons(e);
        const modifierKeys = getActiveModifiers(e);
        const inputInfo = this._createInputInfo(null, 'mouse', 'click', false, modifiers, modifierKeys);
        void this._searchAt(e.clientX, e.clientY, inputInfo);
    }

    /** */
    _onAuxClick() {
        this._preventNextContextMenu = false;
    }

    /**
     * @param {PointerEvent} e
     * @returns {boolean|void}
     */
    _onContextMenu(e) {
        if (this._preventNextContextMenu) {
            this._preventNextContextMenu = false;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    /**
     * @param {TouchEvent|PointerEvent} e
     * @param {number} x
     * @param {number} y
     * @param {number} identifier
     */
    _onPrimaryTouchStart(e, x, y, identifier) {
        this._preventScroll = false;
        this._preventNextContextMenu = false;
        this._preventNextMouseDown = false;
        this._preventNextClick = false;
        this._touchTapValid = true;
        this._touchPressTime = Date.now();

        const languageNotNull = this._language !== null ? this._language : '';
        const selection = window.getSelection();
        if (selection !== null && isPointInSelection(x, y, selection, languageNotNull)) {
            return;
        }

        this._primaryTouchIdentifier = identifier;

        if (this._pendingLookup) { return; }

        const inputInfo = this._getMatchingInputGroupFromEvent('touch', 'touchStart', e);
        if (inputInfo === null || !(inputInfo.input !== null && inputInfo.input.scanOnTouchPress)) { return; }

        void this._searchAtFromTouchStart(x, y, inputInfo);
    }

    /**
     * @param {TouchEvent} e
     */
    _onTouchEnd(e) {
        if (this._primaryTouchIdentifier === null) { return; }

        const primaryTouch = this._getTouch(e.changedTouches, this._primaryTouchIdentifier);
        if (primaryTouch === null) { return; }

        const {clientX, clientY} = primaryTouch;
        this._onPrimaryTouchEnd(e, clientX, clientY, true);
    }

    /**
     * @param {TouchEvent|PointerEvent} e
     * @param {number} x
     * @param {number} y
     * @param {boolean} allowSearch
     */
    _onPrimaryTouchEnd(e, x, y, allowSearch) {
        const touchReleaseTime = Date.now();
        this._primaryTouchIdentifier = null;
        this._preventScroll = false;
        this._preventNextClick = false;
        // Don't revert context menu and mouse down prevention, since these events can occur after the touch has ended.
        // I.e. this._preventNextContextMenu and this._preventNextMouseDown should not be assigned to false.

        if (!allowSearch) { return; }

        const inputInfo = this._getMatchingInputGroupFromEvent('touch', 'touchEnd', e);
        if (inputInfo === null || inputInfo.input === null) { return; }
        if (touchReleaseTime - this._touchPressTime < inputInfo.input.minimumTouchTime) { return; }
        if (inputInfo.input.scanOnTouchRelease || (inputInfo.input.scanOnTouchTap && this._touchTapValid)) {
            void this._searchAtFromTouchEnd(x, y, inputInfo);
        }
    }

    /**
     * @param {PointerEvent} e
     * @returns {void}
     */
    _onPointerOver(e) {
        const {pointerType, pointerId, isPrimary} = e;
        if (pointerType === 'pen') {
            this._pointerIdTypeMap.set(pointerId, pointerType);
        }

        if (!isPrimary) { return; }
        switch (pointerType) {
            case 'mouse': return this._onMousePointerOver(e);
            case 'touch': return this._onTouchPointerOver();
            case 'pen': return this._onPenPointerOver(e);
        }
    }

    /**
     * @param {PointerEvent} e
     * @returns {boolean|void}
     */
    _onPointerDown(e) {
        if (!e.isPrimary) { return; }
        switch (this._getPointerEventType(e)) {
            case 'mouse': return this._onMousePointerDown(e);
            case 'touch': return this._onTouchPointerDown(e);
            case 'pen': return this._onPenPointerDown(e);
        }
    }

    /**
     * @param {PointerEvent} e
     * @returns {void}
     */
    _onPointerMove(e) {
        if (!e.isPrimary) { return; }
        switch (this._getPointerEventType(e)) {
            case 'mouse': return this._onMousePointerMove(e);
            case 'touch': return this._onTouchPointerMove(e);
            case 'pen': return this._onPenPointerMove(e);
        }
    }

    /**
     * @param {PointerEvent} e
     * @returns {void}
     */
    _onPointerUp(e) {
        if (!e.isPrimary) { return; }
        switch (this._getPointerEventType(e)) {
            case 'mouse': return this._onMousePointerUp();
            case 'touch': return this._onTouchPointerUp(e);
            case 'pen': return this._onPenPointerUp(e);
        }
    }

    /**
     * @param {PointerEvent} e
     * @returns {void}
     */
    _onPointerCancel(e) {
        this._pointerIdTypeMap.delete(e.pointerId);
        if (!e.isPrimary) { return; }
        switch (e.pointerType) {
            case 'mouse': return this._onMousePointerCancel();
            case 'touch': return this._onTouchPointerCancel(e);
            case 'pen': return this._onPenPointerCancel();
        }
    }

    /**
     * @param {PointerEvent} e
     * @returns {void}
     */
    _onPointerOut(e) {
        this._pointerIdTypeMap.delete(e.pointerId);
        if (!e.isPrimary) { return; }
        switch (e.pointerType) {
            case 'mouse': return this._onMousePointerOut();
            case 'touch': return this._onTouchPointerOut();
            case 'pen': return this._onPenPointerOut();
        }
    }

    /**
     * @param {PointerEvent} e
     * @returns {void}
     */
    _onMousePointerOver(e) {
        if (this._ignoreElements !== null && this._ignoreElements().includes(/** @type {Element} */ (e.target))) {
            this._scanTimerClear();
        }
    }

    /**
     * @param {PointerEvent} e
     * @returns {boolean|void}
     */
    _onMousePointerDown(e) {
        return this._onMouseDown(e);
    }

    /**
     * @param {PointerEvent} e
     * @returns {void}
     */
    _onMousePointerMove(e) {
        this._scanTimerClear();
        this._lastMouseMove = e;

        const inputInfo = this._getMatchingInputGroupFromEvent('mouse', 'mouseMove', e);
        if (inputInfo === null) { return; }

        void this._searchAtFromMouseMove(e.clientX, e.clientY, inputInfo);
    }

    /** */
    _onMousePointerUp() {
        // NOP
    }

    /**
     * @returns {void}
     */
    _onMousePointerCancel() {
        this._onMouseOut();
    }

    /**
     * @returns {void}
     */
    _onMousePointerOut() {
        this._onMouseOut();
    }

    /** */
    _onTouchPointerOver() {
        // NOP
    }

    /**
     * @param {PointerEvent} e
     * @returns {void}
     */
    _onTouchPointerDown(e) {
        const {clientX, clientY, pointerId} = e;
        this._onPrimaryTouchStart(e, clientX, clientY, pointerId);
    }

    /**
     * @param {PointerEvent} e
     * @returns {void}
     */
    _onTouchPointerMove(e) {
        if (!this._preventScroll || !e.cancelable) {
            return;
        }
        this._touchTapValid = false;

        const inputInfo = this._getMatchingInputGroupFromEvent('touch', 'touchMove', e);
        if (inputInfo === null || !(inputInfo.input !== null && inputInfo.input.scanOnTouchMove)) { return; }

        void this._searchAt(e.clientX, e.clientY, inputInfo);
    }

    /**
     * @param {PointerEvent} e
     * @returns {void}
     */
    _onTouchPointerUp(e) {
        const {clientX, clientY} = e;
        this._onPrimaryTouchEnd(e, clientX, clientY, true);
    }

    /**
     * @param {PointerEvent} e
     * @returns {void}
     */
    _onTouchPointerCancel(e) {
        this._onPrimaryTouchEnd(e, 0, 0, false);
    }

    /** */
    _onTouchPointerOut() {
        // NOP
    }

    /**
     * @param {PointerEvent} e
     */
    _onTouchMove(e) {
        this._touchTapValid = false;

        if (!this._preventScroll) { return; }

        if (e.cancelable) {
            e.preventDefault();
        } else {
            this._preventScroll = false;
        }
    }

    /**
     * @param {PointerEvent} e
     */
    _onPenPointerOver(e) {
        this._penPointerState = 1;
        void this._searchAtFromPen(e, 'pointerOver', false);
    }

    /**
     * @param {PointerEvent} e
     */
    _onPenPointerDown(e) {
        this._penPointerState = 2;
        void this._searchAtFromPen(e, 'pointerDown', true);
    }

    /**
     * @param {PointerEvent} e
     */
    _onPenPointerMove(e) {
        if (this._penPointerState === 2 && (!this._preventScroll || !e.cancelable)) { return; }
        void this._searchAtFromPen(e, 'pointerMove', true);
    }

    /**
     * @param {PointerEvent} e
     */
    _onPenPointerUp(e) {
        this._penPointerState = 3;
        this._preventScroll = false;
        void this._searchAtFromPen(e, 'pointerUp', false);
    }

    /** */
    _onPenPointerCancel() {
        this._onPenPointerOut();
    }

    /** */
    _onPenPointerOut() {
        this._penPointerState = 0;
        this._preventScroll = false;
        this._preventNextContextMenu = false;
        this._preventNextMouseDown = false;
        this._preventNextClick = false;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async _scanTimerWait() {
        const delay = this._delay;
        const promise = /** @type {Promise<boolean>} */ (new Promise((resolve) => {
            /** @type {?import('core').Timeout} */
            let timeout = setTimeout(() => {
                timeout = null;
                resolve(true);
            }, delay);
            this._scanTimerPromiseResolve = (value) => {
                if (timeout === null) { return; }
                clearTimeout(timeout);
                timeout = null;
                resolve(value);
            };
        }));
        this._scanTimerPromise = promise;
        try {
            return await promise;
        } finally {
            if (this._scanTimerPromise === promise) {
                this._scanTimerPromise = null;
                this._scanTimerPromiseResolve = null;
            }
        }
    }

    /** */
    _scanTimerClear() {
        if (this._scanTimerPromiseResolve === null) { return; }
        this._scanTimerPromiseResolve(false);
        this._scanTimerPromiseResolve = null;
        this._scanTimerPromise = null;
    }

    /** */
    _hookEvents() {
        const capture = true;
        /** @type {import('event-listener-collection').AddEventListenerArgs[]} */
        const eventListenerInfos = [];
        eventListenerInfos.push(...this._getClickEventListeners(capture));
        if (!this._searchOnClickOnly) {
            eventListenerInfos.push(...this._getPointerEventListeners(capture));
            if (this._scanWithoutMousemove) {
                eventListenerInfos.push(...this._getKeyboardEventListeners(capture));
            }
        }
        if (this._searchOnClick) {
            eventListenerInfos.push(...this._getSearchOnClickEventListeners(capture));
        }

        eventListenerInfos.push(this._getSelectionChangeCheckUserSelectionListener());

        for (const args of eventListenerInfos) {
            this._eventListeners.addEventListener(...args);
        }
    }

    /**
     * @param {boolean} capture
     * @returns {import('event-listener-collection').AddEventListenerArgs[]}
     */
    _getPointerEventListeners(capture) {
        return [
            [this._node, 'pointerover', this._onPointerOver.bind(this), capture],
            [this._node, 'pointerdown', this._onPointerDown.bind(this), capture],
            [this._node, 'pointermove', this._onPointerMove.bind(this), capture],
            [this._node, 'pointerup', this._onPointerUp.bind(this), capture],
            [this._node, 'pointercancel', this._onPointerCancel.bind(this), capture],
            [this._node, 'pointerout', this._onPointerOut.bind(this), capture],
            [this._node, 'mousedown', this._onMouseDown.bind(this), capture],
            [this._node, 'touchmove', this._onTouchMove.bind(this), {passive: false, capture}],
            [this._node, 'touchend', this._onTouchEnd.bind(this), capture],
            [this._node, 'auxclick', this._onAuxClick.bind(this), capture],
            [this._node, 'contextmenu', this._onContextMenu.bind(this), capture],
        ];
    }

    /**
     * @param {boolean} capture
     * @returns {import('event-listener-collection').AddEventListenerArgs[]}
     */
    _getKeyboardEventListeners(capture) {
        return [
            [this._node, 'keydown', this._onKeyDown.bind(this), capture],
        ];
    }

    /**
     * @param {boolean} capture
     * @returns {import('event-listener-collection').AddEventListenerArgs[]}
     */
    _getClickEventListeners(capture) {
        return [
            [this._node, 'click', this._onClick.bind(this), capture],
        ];
    }

    /**
     * @param {boolean} capture
     * @returns {import('event-listener-collection').AddEventListenerArgs[]}
     */
    _getSearchOnClickEventListeners(capture) {
        const {documentElement} = document;
        /** @type {import('event-listener-collection').AddEventListenerArgs[]} */
        const entries = [
            [document, 'selectionchange', this._onSelectionChange.bind(this)],
        ];
        if (documentElement !== null) {
            entries.push([documentElement, 'pointerdown', this._onSearchClickPointerDown.bind(this), capture]);
        }
        return entries;
    }

    /**
     * @returns {import('event-listener-collection').AddEventListenerArgs}
     */
    _getSelectionChangeCheckUserSelectionListener() {
        return [document, 'selectionchange', this._onSelectionChangeCheckUserSelection.bind(this)];
    }

    /**
     * @param {TouchList} touchList
     * @param {number} identifier
     * @returns {?Touch}
     */
    _getTouch(touchList, identifier) {
        for (const touch of touchList) {
            if (touch.identifier === identifier) {
                return touch;
            }
        }
        return null;
    }

    /**
     * @param {import('text-source').TextSource} textSource
     * @param {boolean} searchTerms
     * @param {boolean} searchKanji
     * @param {import('settings').OptionsContext} optionsContext
     * @returns {Promise<?import('text-scanner').SearchResults>}
     */
    async _findDictionaryEntries(textSource, searchTerms, searchKanji, optionsContext) {
        if (textSource === null) {
            return null;
        }
        if (searchTerms) {
            const results = await this._findTermDictionaryEntries(textSource, optionsContext);
            if (results !== null) { return results; }
        }
        if (searchKanji) {
            const results = await this._findKanjiDictionaryEntries(textSource, optionsContext);
            if (results !== null) { return results; }
        }
        return null;
    }

    /**
     * @param {import('text-source').TextSource} textSource
     * @param {import('settings').OptionsContext} optionsContext
     * @returns {Promise<?import('text-scanner').TermSearchResults>}
     */
    async _findTermDictionaryEntries(textSource, optionsContext) {
        const scanLength = this._scanLength;
        const sentenceScanExtent = this._sentenceScanExtent;
        const sentenceTerminateAtNewlines = this._sentenceTerminateAtNewlines;
        const sentenceTerminatorMap = this._sentenceTerminatorMap;
        const sentenceForwardQuoteMap = this._sentenceForwardQuoteMap;
        const sentenceBackwardQuoteMap = this._sentenceBackwardQuoteMap;
        const layoutAwareScan = this._layoutAwareScan;
        const searchText = this.getTextSourceContent(textSource, scanLength, layoutAwareScan, optionsContext.pointerType);
        if (searchText.length === 0) { return null; }

        /** @type {import('api').FindTermsDetails} */
        const details = {};
        if (this._matchTypePrefix) { details.matchType = 'prefix'; }
        const {dictionaryEntries, originalTextLength} = await this._api.termsFind(searchText, details, optionsContext);
        if (dictionaryEntries.length === 0) { return null; }

        textSource.setEndOffset(originalTextLength, false, layoutAwareScan);
        const sentence = this._textSourceGenerator.extractSentence(
            textSource,
            layoutAwareScan,
            sentenceScanExtent,
            sentenceTerminateAtNewlines,
            sentenceTerminatorMap,
            sentenceForwardQuoteMap,
            sentenceBackwardQuoteMap,
        );

        return {dictionaryEntries, sentence, type: 'terms'};
    }

    /**
     * @param {import('text-source').TextSource} textSource
     * @param {import('settings').OptionsContext} optionsContext
     * @returns {Promise<?import('text-scanner').KanjiSearchResults>}
     */
    async _findKanjiDictionaryEntries(textSource, optionsContext) {
        const sentenceScanExtent = this._sentenceScanExtent;
        const sentenceTerminateAtNewlines = this._sentenceTerminateAtNewlines;
        const sentenceTerminatorMap = this._sentenceTerminatorMap;
        const sentenceForwardQuoteMap = this._sentenceForwardQuoteMap;
        const sentenceBackwardQuoteMap = this._sentenceBackwardQuoteMap;
        const layoutAwareScan = this._layoutAwareScan;
        const searchText = this.getTextSourceContent(textSource, 1, layoutAwareScan, optionsContext.pointerType);
        if (searchText.length === 0) { return null; }

        const dictionaryEntries = await this._api.kanjiFind(searchText, optionsContext);
        if (dictionaryEntries.length === 0) { return null; }

        textSource.setEndOffset(1, false, layoutAwareScan);
        const sentence = this._textSourceGenerator.extractSentence(
            textSource,
            layoutAwareScan,
            sentenceScanExtent,
            sentenceTerminateAtNewlines,
            sentenceTerminatorMap,
            sentenceForwardQuoteMap,
            sentenceBackwardQuoteMap,
        );

        return {dictionaryEntries, sentence, type: 'kanji'};
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {import('text-scanner').InputInfo} inputInfo
     */
    async _searchAt(x, y, inputInfo) {
        if (this._pendingLookup) { return; }

        try {
            safePerformance.mark('scanner:_searchAt:start');
            const sourceInput = inputInfo.input;
            let searchTerms = this._searchTerms;
            let searchKanji = this._searchKanji;
            if (sourceInput !== null) {
                if (searchTerms && !sourceInput.searchTerms) { searchTerms = false; }
                if (searchKanji && !sourceInput.searchKanji) { searchKanji = false; }
            }

            this._pendingLookup = true;
            this._scanTimerClear();

            if (typeof this._ignorePoint === 'function' && await this._ignorePoint(x, y)) {
                return;
            }

            const textSource = this._textSourceGenerator.getRangeFromPoint(x, y, {
                deepContentScan: this._deepContentScan,
                normalizeCssZoom: this._normalizeCssZoom,
                language: this._language,
            });
            if (textSource !== null) {
                try {
                    await this._search(textSource, searchTerms, searchKanji, inputInfo);
                } finally {
                    textSource.cleanup();
                }
            } else {
                this._triggerSearchEmpty(inputInfo);
            }
            safePerformance.mark('scanner:_searchAt:end');
            safePerformance.measure('scanner:_searchAt', 'scanner:_searchAt:start', 'scanner:_searchAt:end');
        } catch (e) {
            log.error(e);
        } finally {
            this._pendingLookup = false;
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {import('text-scanner').InputInfo} inputInfo
     */
    async _searchAtFromMouseMove(x, y, inputInfo) {
        if (this._pendingLookup) { return; }

        if (inputInfo.passive && !await this._scanTimerWait()) {
            // Aborted
            return;
        }

        await this._searchAt(x, y, inputInfo);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {import('text-scanner').InputInfo} inputInfo
     */
    async _searchAtFromTouchStart(x, y, inputInfo) {
        const textSourceCurrentPrevious = this._textSourceCurrent !== null ? this._textSourceCurrent.clone() : null;
        const {input} = inputInfo;
        const preventScroll = input !== null && input.preventTouchScrolling;

        await this._searchAt(x, y, inputInfo);

        if (
            this._textSourceCurrent !== null &&
            !(textSourceCurrentPrevious !== null && this._textSourceCurrent.hasSameStart(textSourceCurrentPrevious))
        ) {
            this._preventScroll = preventScroll;
            this._preventNextContextMenu = true;
            this._preventNextMouseDown = true;
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {import('text-scanner').InputInfo} inputInfo
     */
    async _searchAtFromTouchEnd(x, y, inputInfo) {
        const textSourceCurrentPrevious = this._textSourceCurrent !== null ? this._textSourceCurrent.clone() : null;

        await this._searchAt(x, y, inputInfo);

        if (
            this._textSourceCurrent !== null &&
            !(textSourceCurrentPrevious !== null && this._textSourceCurrent.hasSameStart(textSourceCurrentPrevious))
        ) {
            this._preventNextMouseDown = true;
        }
    }

    /**
     * @param {PointerEvent} e
     * @param {import('input').PointerEventType} eventType
     * @param {boolean} prevent
     */
    async _searchAtFromPen(e, eventType, prevent) {
        if (this._pendingLookup) { return; }

        const inputInfo = this._getMatchingInputGroupFromEvent('pen', eventType, e);
        if (inputInfo === null) { return; }

        const {input} = inputInfo;
        if (input === null || !this._isPenEventSupported(eventType, input)) { return; }

        const preventScroll = input !== null && input.preventPenScrolling;

        await this._searchAt(e.clientX, e.clientY, inputInfo);

        if (
            prevent &&
            this._textSourceCurrent !== null
        ) {
            this._preventScroll = preventScroll;
            this._preventNextContextMenu = true;
            this._preventNextMouseDown = true;
            this._preventNextClick = true;
        }
    }

    /**
     * @param {import('input').PointerEventType} eventType
     * @param {import('text-scanner').InputConfig} input
     * @returns {boolean}
     */
    _isPenEventSupported(eventType, input) {
        switch (eventType) {
            case 'pointerDown':
                return input.scanOnPenPress;
            case 'pointerUp':
                return input.scanOnPenRelease;
        }
        switch (this._penPointerState) {
            case 1:
                return input.scanOnPenHover;
            case 2:
                return input.scanOnPenMove;
            case 3:
                return input.scanOnPenReleaseHover;
            case 0:
                return false;
        }
    }

    /**
     * @param {import('input').PointerType} pointerType
     * @param {import('input').PointerEventType} eventType
     * @param {PointerEvent|TouchEvent} event
     * @returns {?import('text-scanner').InputInfo}
     */
    _getMatchingInputGroupFromEvent(pointerType, eventType, event) {
        const modifiers = getActiveModifiersAndButtons(event);
        const modifierKeys = getActiveModifiers(event);
        return this._getMatchingInputGroup(pointerType, eventType, modifiers, modifierKeys);
    }

    /**
     * @param {import('input').PointerType} pointerType
     * @param {import('input').PointerEventType} eventType
     * @param {import('input').Modifier[]} modifiers
     * @param {import('input').ModifierKey[]} modifierKeys
     * @returns {?import('text-scanner').InputInfo}
     */
    _getMatchingInputGroup(pointerType, eventType, modifiers, modifierKeys) {
        let fallbackIndex = -1;
        const modifiersSet = new Set(modifiers);
        for (let i = 0, ii = this._inputs.length; i < ii; ++i) {
            const input = this._inputs[i];
            const {include, exclude, types} = input;
            if (!types.has(pointerType)) { continue; }
            if (this._setHasAll(modifiersSet, include) && (exclude.length === 0 || !this._setHasAll(modifiersSet, exclude))) {
                if (include.length > 0) {
                    return this._createInputInfo(input, pointerType, eventType, false, modifiers, modifierKeys);
                } else if (fallbackIndex < 0) {
                    fallbackIndex = i;
                }
            }
        }

        return (
            fallbackIndex >= 0 ?
            this._createInputInfo(this._inputs[fallbackIndex], pointerType, eventType, true, modifiers, modifierKeys) :
            null
        );
    }

    /**
     * @param {?import('text-scanner').InputConfig} input
     * @param {import('input').PointerType} pointerType
     * @param {import('input').PointerEventType} eventType
     * @param {boolean} passive
     * @param {import('input').Modifier[]} modifiers
     * @param {import('input').ModifierKey[]} modifierKeys
     * @param {import('text-scanner').InputInfoDetail?} [detail]
     * @returns {import('text-scanner').InputInfo}
     */
    _createInputInfo(input, pointerType, eventType, passive, modifiers, modifierKeys, detail) {
        return {input, pointerType, eventType, passive, modifiers, modifierKeys, detail};
    }

    /**
     * @param {Set<string>} set
     * @param {string[]} values
     * @returns {boolean}
     */
    _setHasAll(set, values) {
        for (const value of values) {
            if (!set.has(value)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param {import('text-scanner').InputOptionsOuter} input
     * @returns {import('text-scanner').InputConfig}
     */
    _convertInput(input) {
        const {options} = input;
        return {
            include: this._getInputArray(input.include),
            exclude: this._getInputArray(input.exclude),
            types: this._getInputTypeSet(input.types),
            searchTerms: this._getInputBoolean(options.searchTerms),
            searchKanji: this._getInputBoolean(options.searchKanji),
            scanOnTouchMove: this._getInputBoolean(options.scanOnTouchMove),
            scanOnTouchPress: this._getInputBoolean(options.scanOnTouchPress),
            scanOnTouchRelease: this._getInputBoolean(options.scanOnTouchRelease),
            scanOnTouchTap: this._getInputBoolean(options.scanOnTouchTap),
            scanOnPenMove: this._getInputBoolean(options.scanOnPenMove),
            scanOnPenHover: this._getInputBoolean(options.scanOnPenHover),
            scanOnPenReleaseHover: this._getInputBoolean(options.scanOnPenReleaseHover),
            scanOnPenPress: this._getInputBoolean(options.scanOnPenPress),
            scanOnPenRelease: this._getInputBoolean(options.scanOnPenRelease),
            preventTouchScrolling: this._getInputBoolean(options.preventTouchScrolling),
            preventPenScrolling: this._getInputBoolean(options.preventPenScrolling),
            minimumTouchTime: this._getInputNumber(options.minimumTouchTime),
        };
    }

    /**
     * @param {string} value
     * @returns {string[]}
     */
    _getInputArray(value) {
        return (
            typeof value === 'string' ?
            value.split(/[,;\s]+/).map((v) => v.trim().toLowerCase()).filter((v) => v.length > 0) :
            []
        );
    }

    /**
     * @param {{mouse: boolean, touch: boolean, pen: boolean}} details
     * @returns {Set<'mouse'|'touch'|'pen'>}
     */
    _getInputTypeSet({mouse, touch, pen}) {
        const set = new Set();
        if (mouse) { set.add('mouse'); }
        if (touch) { set.add('touch'); }
        if (pen) { set.add('pen'); }
        return set;
    }

    /**
     * @param {unknown} value
     * @returns {boolean}
     */
    _getInputBoolean(value) {
        return typeof value === 'boolean' && value;
    }

    /**
     * @param {unknown} value
     * @returns {number}
     */
    _getInputNumber(value) {
        return typeof value === 'number' ? value : -1;
    }

    /**
     * @param {PointerEvent} e
     * @returns {string}
     */
    _getPointerEventType(e) {
        // Workaround for Firefox bug not detecting certain 'touch' events as 'pen' events.
        const cachedPointerType = this._pointerIdTypeMap.get(e.pointerId);
        return (typeof cachedPointerType !== 'undefined' ? cachedPointerType : e.pointerType);
    }

    /**
     * @param {import('text-source').TextSource} textSource
     * @param {?string} includeSelector
     * @param {?string} excludeSelector
     * @param {boolean} layoutAwareScan
     */
    _constrainTextSource(textSource, includeSelector, excludeSelector, layoutAwareScan) {
        let length = textSource.text().length;

        while (length > 0) {
            const nodes = textSource.getNodesInRange();
            if (
                (includeSelector !== null && !everyNodeMatchesSelector(nodes, includeSelector)) ||
                (excludeSelector !== null && anyNodeMatchesSelector(nodes, excludeSelector))
            ) {
                --length;
                textSource.setEndOffset(length, false, layoutAwareScan);
            } else {
                break;
            }
        }
    }

    /**
     * @param {import('input').PointerType | undefined} pointerType
     * @returns {?string}
     */
    _getExcludeSelectorForPointerType(pointerType) {
        if (pointerType === 'touch') {
            return this._excludeSelector ? `${this._excludeSelector},${this.touchEventExcludeSelector}` : this.touchEventExcludeSelector;
        }
        return this._excludeSelector;
    }

    /**
     * @param {string} text
     * @returns {Promise<boolean>}
     */
    async _isTextLookupWorthy(text) {
        try {
            return this._language !== null && text.length > 0 && await this._api.isTextLookupWorthy(text, this._language);
        } catch (e) {
            return false;
        }
    }

    /**
     * @returns {import('text-scanner').SelectionRestoreInfo}
     */
    _createSelectionRestoreInfo() {
        const ranges = [];
        const selection = window.getSelection();
        if (selection !== null) {
            for (let i = 0, ii = selection.rangeCount; i < ii; ++i) {
                const range = selection.getRangeAt(i);
                ranges.push(range.cloneRange());
            }
        }
        return {ranges};
    }

    /**
     * @param {import('text-scanner').SelectionRestoreInfo} selectionRestoreInfo
     */
    _restoreSelection(selectionRestoreInfo) {
        const {ranges} = selectionRestoreInfo;
        const selection = window.getSelection();
        if (selection === null) { return; }
        selection.removeAllRanges();
        for (const range of ranges) {
            try {
                selection.addRange(range);
            } catch (e) {
                // NOP
            }
        }
    }

    /**
     * @param {import('text-scanner').ClearReason} reason
     */
    _triggerClear(reason) {
        this.trigger('clear', {reason});
    }

    /**
     * @returns {boolean}
     */
    _computeUserHasNotSelectedAnythingManually() {
        const selection = window.getSelection();
        return selection === null || selection.isCollapsed;
    }
}
