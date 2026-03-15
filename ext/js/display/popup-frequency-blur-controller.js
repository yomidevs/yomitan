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

const numberRegex = /[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?/;

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
        /** @type {import('settings').SortFrequencyDictionaryOrder|null} */
        this._order = null;
        /** @type {number} */
        this._unblurDelay = 0;
        /** @type {boolean} */
        this._pointerHovered = false;
        /** @type {?number} */
        this._autoRevealTimeout = null;
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

    /** */
    _updateOverlayText() {
        const {dictionary, order, threshold, unblurDelay} = this;
        this._overlayLabel.textContent = (
            Number.isFinite(unblurDelay) && unblurDelay > 0 ?
            `Hover or wait ${this._formatDelaySeconds(unblurDelay)} to reveal` :
            'Hover to reveal'
        );
        this._overlaySublabel.textContent = (
            dictionary !== null && order !== null && Number.isFinite(threshold) ?
            `${dictionary} · ${order === 'ascending' ? 'rank <=' : 'occurrences >='} ${threshold}` :
            ''
        );
    }

    /** */
    _updateStateFromContent() {
        const desiredState = this._getDesiredState();
        if (desiredState === 'blurred') {
            this._scheduleAutoReveal();
        } else if (desiredState === 'off') {
            this._clearAutoRevealTimeout();
        }
        this._setState(desiredState);
    }

    /**
     * @returns {'off'|'blurred'|'revealed'}
     */
    _getDesiredState() {
        if (document.documentElement.dataset.pageType !== 'popup') { return 'off'; }
        if (!this._enabled || this._dictionary === null || this._order === null || !Number.isFinite(this._threshold)) {
            return 'off';
        }

        const {dictionaryEntries} = this._display;
        if (dictionaryEntries.length === 0) { return 'off'; }

        const firstDictionaryEntry = dictionaryEntries[0];
        if (firstDictionaryEntry.type !== 'term') { return 'off'; }

        const comparableFrequency = this._getComparableFrequency(firstDictionaryEntry);
        if (comparableFrequency === null) { return 'off'; }

        const qualifies = (
            this._order === 'ascending' ?
            comparableFrequency <= this._threshold :
            comparableFrequency >= this._threshold
        );
        if (!qualifies) { return 'off'; }

        return (this._pointerHovered || this._autoRevealTriggered) ? 'revealed' : 'blurred';
    }

    /**
     * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
     * @returns {?number}
     */
    _getComparableFrequency(dictionaryEntry) {
        const {dictionary, order} = this;
        if (dictionary === null || order === null) { return null; }

        let result = null;
        for (const frequency of dictionaryEntry.frequencies) {
            if (frequency.dictionary !== dictionary) { continue; }
            const value = this._getUsableFrequencyValue(frequency);
            if (value === null) { continue; }
            if (result === null) {
                result = value;
            } else {
                result = (
                    order === 'ascending' ?
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
    _getUsableFrequencyValue(frequency) {
        const {frequency: value, displayValue, displayValueParsed} = frequency;
        if (!Number.isFinite(value)) { return null; }
        if (displayValueParsed && typeof displayValue === 'string' && !numberRegex.test(displayValue)) {
            return null;
        }
        return value;
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

        this._autoRevealTimeout = window.setTimeout(() => {
            this._autoRevealTimeout = null;
            this._autoRevealTriggered = true;
            this._updateStateFromContent();
        }, this._unblurDelay * 1000);
    }

    /** */
    _clearAutoRevealTimeout() {
        if (this._autoRevealTimeout === null) { return; }
        window.clearTimeout(this._autoRevealTimeout);
        this._autoRevealTimeout = null;
    }

    /**
     * @param {number} delay
     * @returns {string}
     */
    _formatDelaySeconds(delay) {
        const formattedDelay = (delay % 1 === 0 ? delay.toFixed(0) : `${delay}`);
        return `${formattedDelay}s`;
    }

    /** @type {?string} */
    get dictionary() {
        return this._dictionary;
    }

    /** @type {import('settings').SortFrequencyDictionaryOrder|null} */
    get order() {
        return this._order;
    }

    /** @type {number} */
    get threshold() {
        return this._threshold;
    }

    /** @type {number} */
    get unblurDelay() {
        return this._unblurDelay;
    }
}
