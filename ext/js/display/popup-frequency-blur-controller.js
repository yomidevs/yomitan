/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import {querySelectorNotNull} from '../dom/query-selector.js';

const numberPattern = /[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g;

export class PopupFrequencyBlurController {
    /**
     * @param {import('./display.js').Display} display
     */
    constructor(display) {
        /** @type {import('./display.js').Display} */
        this._display = display;
        /** @type {HTMLElement} */
        this._contentOuter = querySelectorNotNull(document, '.content-outer');
        /** @type {HTMLElement} */
        this._overlay = querySelectorNotNull(document, '#popup-frequency-blur-overlay');
        /** @type {HTMLElement} */
        this._overlayLabel = querySelectorNotNull(document, '#popup-frequency-blur-overlay-label');
        /** @type {HTMLElement} */
        this._overlaySublabel = querySelectorNotNull(document, '#popup-frequency-blur-overlay-sublabel');
        /** @type {boolean} */
        this._enabled = false;
        /** @type {?string} */
        this._dictionary = null;
        /** @type {number} */
        this._threshold = 10000;
        /** @type {import('settings').SortFrequencyDictionaryOrder} */
        this._order = 'descending';
        /** @type {number} */
        this._unblurDelay = 0;
        /** @type {boolean} */
        this._pointerHovered = false;
        /** @type {?number} */
        this._autoRevealTimeout = null;
        /** @type {?number} */
        this._autoRevealCountdownTimeout = null;
        /** @type {?number} */
        this._autoRevealDeadline = null;
        /** @type {boolean} */
        this._autoRevealTriggered = false;
        /** @type {'off'|'blurred'|'revealed'} */
        this._state = 'off';
    }

    /** */
    prepare() {
        this._display.on('optionsUpdated', this._onOptionsUpdated.bind(this));
        this._display.on('contentClear', this._onContentClear.bind(this));
        this._display.on('contentUpdateComplete', this._onContentUpdateComplete.bind(this));

        this._contentOuter.addEventListener('pointerenter', this._onPointerEnter.bind(this), false);
        this._contentOuter.addEventListener('pointerleave', this._onPointerLeave.bind(this), false);

        const options = this._display.getOptions();
        if (options !== null) {
            this._onOptionsUpdated({options});
        } else {
            this._setState('off');
        }
    }

    // Private

    /**
     * @param {import('display').EventArgument<'optionsUpdated'>} details
     */
    _onOptionsUpdated({options}) {
        const {
            popupBlurByFrequencyEnabled,
            popupBlurByFrequencyDictionary,
            popupBlurByFrequencyThreshold,
            popupBlurByFrequencyOrder,
            popupBlurByFrequencyUnblurDelay,
        } = options.general;
        this._enabled = popupBlurByFrequencyEnabled;
        this._dictionary = popupBlurByFrequencyDictionary;
        this._threshold = popupBlurByFrequencyThreshold;
        this._order = popupBlurByFrequencyOrder;
        this._unblurDelay = popupBlurByFrequencyUnblurDelay;
        this._resetAutoReveal();
        this._updateOverlayText();
        this._updateStateFromContent();
    }

    /** */
    _onContentClear() {
        this._resetAutoReveal();
        this._setState('off');
    }

    /**
     * @param {import('display').EventArgument<'contentUpdateComplete'>} details
     */
    _onContentUpdateComplete({type}) {
        this._resetAutoReveal();
        if (type !== 'terms') {
            this._setState('off');
            return;
        }
        this._updateStateFromContent();
    }

    /** */
    _onPointerEnter() {
        this._pointerHovered = true;
        if (this._state === 'blurred') {
            this._setState('revealed');
        }
    }

    /** */
    _onPointerLeave() {
        this._pointerHovered = false;
        this._updateStateFromContent();
    }

    /**
     * @param {?number} [selectedFrequency]
     */
    _updateOverlayText(selectedFrequency = this._getFirstTermEntrySelectedFrequency()) {
        this._overlayLabel.textContent = (
            Number.isFinite(this._unblurDelay) && this._unblurDelay > 0 ?
            `Hover or wait ${this._formatDelaySeconds(this._getOverlayDelaySeconds())} to reveal` :
            'Hover to reveal'
        );
        this._overlaySublabel.textContent = (
            this._enabled && this._dictionary !== null && selectedFrequency !== null ?
            `${this._dictionary} · frequency ${selectedFrequency}` :
            ''
        );
    }

    /** */
    _updateStateFromContent() {
        const selectedFrequency = this._getFirstTermEntrySelectedFrequency();
        this._updateOverlayText(selectedFrequency);
        const desiredState = this._getDesiredState(selectedFrequency);
        if (desiredState === 'blurred') {
            this._scheduleAutoReveal();
        } else if (desiredState === 'off') {
            this._clearAutoRevealTimeout();
        }
        this._setState(desiredState);
    }

    /**
     * @param {?number} selectedFrequency
     * @returns {'off'|'blurred'|'revealed'}
     */
    _getDesiredState(selectedFrequency = this._getFirstTermEntrySelectedFrequency()) {
        if (document.documentElement.dataset.pageType !== 'popup') { return 'off'; }
        if (!this._enabled || this._dictionary === null || !Number.isFinite(this._threshold)) {
            return 'off';
        }
        if (selectedFrequency === null) { return 'off'; }

        const qualifies = (
            this._order === 'ascending' ?
            selectedFrequency <= this._threshold :
            selectedFrequency >= this._threshold
        );
        if (!qualifies) { return 'off'; }

        return (this._pointerHovered || this._autoRevealTriggered) ? 'revealed' : 'blurred';
    }

    /**
     * @returns {?number}
     */
    _getFirstTermEntrySelectedFrequency() {
        const {dictionaryEntries} = this._display;
        if (dictionaryEntries.length === 0) { return null; }

        const firstDictionaryEntry = dictionaryEntries[0];
        return firstDictionaryEntry.type === 'term' ? this._getSelectedFrequency(firstDictionaryEntry) : null;
    }

    /**
     * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
     * @returns {?number}
     */
    _getSelectedFrequency(dictionaryEntry) {
        if (this._dictionary === null) { return null; }

        let result = null;
        for (const frequency of dictionaryEntry.frequencies) {
            if (frequency.dictionary !== this._dictionary) { continue; }
            const value = this._getSelectedFrequencyValue(frequency);
            if (value === null) { continue; }
            if (result === null) {
                result = value;
            } else {
                result = (
                    this._order === 'ascending' ?
                    Math.min(result, value) :
                    Math.max(result, value)
                );
            }
        }

        return result;
    }

    /**
     * @param {import('dictionary').TermFrequency} frequency
     * @returns {?number}
     */
    _getSelectedFrequencyValue(frequency) {
        const displayValue = this._getParsedDisplayFrequencyValue(frequency);
        if (displayValue !== null) { return displayValue; }

        const {frequency: value} = frequency;
        return Number.isFinite(value) ? value : null;
    }

    /**
     * @param {import('dictionary').TermFrequency} frequency
     * @returns {?number}
     */
    _getParsedDisplayFrequencyValue({displayValue, displayValueParsed}) {
        if (!displayValueParsed || typeof displayValue !== 'string') { return null; }

        const matches = displayValue.match(numberPattern);
        if (matches === null) { return null; }

        let result = null;
        for (const match of matches) {
            const value = Number.parseFloat(match);
            if (!Number.isFinite(value)) { continue; }
            if (result === null) {
                result = value;
            } else {
                result = (
                    this._order === 'ascending' ?
                    Math.min(result, value) :
                    Math.max(result, value)
                );
            }
        }

        return result;
    }

    /**
     * @param {'off'|'blurred'|'revealed'} state
     */
    _setState(state) {
        this._state = state;
        document.documentElement.dataset.popupFrequencyBlurState = state;
        this._overlay.hidden = (state !== 'blurred');
    }

    /** */
    _resetAutoReveal() {
        this._autoRevealTriggered = false;
        this._clearAutoRevealTimeout();
    }

    /** */
    _scheduleAutoReveal() {
        if (this._autoRevealTriggered || this._autoRevealTimeout !== null) { return; }
        if (!Number.isFinite(this._unblurDelay) || this._unblurDelay <= 0) { return; }

        this._autoRevealDeadline = Date.now() + (this._unblurDelay * 1000);
        this._updateOverlayText();
        this._scheduleOverlayCountdownUpdate();
        this._autoRevealTimeout = window.setTimeout(() => {
            this._clearAutoRevealTimeout();
            this._autoRevealTriggered = true;
            this._updateStateFromContent();
        }, this._unblurDelay * 1000);
    }

    /** */
    _scheduleOverlayCountdownUpdate() {
        const delaySeconds = this._getOverlayDelaySeconds();
        const displaySeconds = Math.ceil(delaySeconds);
        if (displaySeconds <= 1) { return; }

        const nextUpdateDelay = Math.max(Math.ceil((delaySeconds - (displaySeconds - 1)) * 1000), 1);
        this._autoRevealCountdownTimeout = window.setTimeout(() => {
            this._autoRevealCountdownTimeout = null;
            this._updateOverlayText();
            this._scheduleOverlayCountdownUpdate();
        }, nextUpdateDelay);
    }

    /** */
    _clearAutoRevealTimeout() {
        if (this._autoRevealTimeout !== null) {
            window.clearTimeout(this._autoRevealTimeout);
            this._autoRevealTimeout = null;
        }
        if (this._autoRevealCountdownTimeout !== null) {
            window.clearTimeout(this._autoRevealCountdownTimeout);
            this._autoRevealCountdownTimeout = null;
        }
        this._autoRevealDeadline = null;
    }

    /**
     * @param {number} delay
     * @returns {string}
     */
    _formatDelaySeconds(delay) {
        return `${Math.max(Math.ceil(delay), 0)}s`;
    }

    /**
     * @returns {number}
     */
    _getOverlayDelaySeconds() {
        if (this._autoRevealDeadline === null) {
            return this._unblurDelay;
        }
        return Math.max((this._autoRevealDeadline - Date.now()) / 1000, 0);
    }
}
