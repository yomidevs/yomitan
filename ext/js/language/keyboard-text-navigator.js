/*
 * Copyright (C) 2023-2026  Yomitan Authors
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

/**
 * @param {string} character
 * @returns {boolean}
 */
function isIgnorableCharacter(character) {
    return /\s/.test(character);
}

/**
 * Tracks a position within a container element's live text content so that
 * "scan next word" / "scan previous word" hotkeys can step through scannable
 * candidates without relying on the mouse. The container is always re-queried
 * from the live DOM by the caller, so this class only needs to know how to
 * turn a linear character offset into a `Range`, and how to remember which
 * offsets have already been confirmed to contain a dictionary match.
 */
export class KeyboardTextNavigator {
    constructor() {
        /** @type {?Element} */
        this._containerElement = null;
        /** @type {number[]} */
        this._offsets = [];
        /** @type {number} */
        this._historyIndex = -1;
        /** @type {number} */
        this._probeOffset = 0;
        /** @type {boolean} */
        this._pendingIsReplay = false;
    }

    /** @type {?Element} */
    get containerElement() {
        return this._containerElement;
    }

    /**
     * Returns the `Range` that a "scan next word" press should try, or `null` if
     * there is nothing left to try (the container's text has been fully consumed).
     * Does not mutate any state; call reportSuccess() or reportFailure()
     * with the result of attempting a scan on the returned range.
     * @param {Element} containerElement
     * @returns {?{offset: number, range: Range}}
     */
    getNextCandidate(containerElement) {
        this._setContainer(containerElement);

        if (this._historyIndex < this._offsets.length - 1) {
            const offset = /** @type {number} */ (this._offsets[this._historyIndex + 1]);
            const range = this._createRangeAtOffset(containerElement, offset);
            if (range !== null) {
                this._pendingIsReplay = true;
                return {offset, range};
            }
            // The recorded offset no longer resolves to a position in the container
            // (its text changed). Drop the now-stale history and probe forward instead.
            this._offsets.length = this._historyIndex + 1;
        }

        this._pendingIsReplay = false;
        return this._nextProbeCandidate(containerElement);
    }

    /**
     * Returns the `Range` that a "scan previous word" press should show, or `null`
     * if there is no earlier recorded offset to go back to.
     * @param {Element} containerElement
     * @returns {?Range}
     */
    getPrevious(containerElement) {
        this._setContainer(containerElement);
        let index = this._historyIndex;
        while (index > 0) {
            --index;
            const offset = /** @type {number} */ (this._offsets[index]);
            const range = this._createRangeAtOffset(containerElement, offset);
            if (range !== null) {
                this._historyIndex = index;
                return range;
            }
            // The recorded offset no longer resolves (container text changed); skip it.
        }
        return null;
    }

    /**
     * Records that the candidate at `offset` produced a dictionary match of the
     * given length, so that future "next"/"previous" presses can resume correctly.
     * @param {number} offset
     * @param {number} matchLength
     * @returns {void}
     */
    reportSuccess(offset, matchLength) {
        if (this._pendingIsReplay) {
            ++this._historyIndex;
        } else {
            this._offsets.push(offset);
            this._historyIndex = this._offsets.length - 1;
        }
        this._probeOffset = offset + Math.max(1, matchLength);
    }

    /**
     * Records that the candidate at `offset` did not produce a dictionary match,
     * so forward probing should resume just past it.
     * @param {number} offset
     * @returns {void}
     */
    reportFailure(offset) {
        if (this._pendingIsReplay) {
            // The container's text has changed since this offset was recorded;
            // drop it (and anything after it) so it's never replayed again.
            this._offsets.length = this._historyIndex + 1;
        }
        this._probeOffset = offset + 1;
    }

    // Private

    /**
     * @param {Element} containerElement
     * @returns {void}
     */
    _setContainer(containerElement) {
        if (this._containerElement !== containerElement) {
            this._containerElement = containerElement;
            this._offsets = [];
            this._historyIndex = -1;
            this._probeOffset = 0;
            this._pendingIsReplay = false;
        }
    }

    /**
     * @param {Element} containerElement
     * @returns {?{offset: number, range: Range}}
     */
    _nextProbeCandidate(containerElement) {
        const text = containerElement.textContent ?? '';
        let offset = this._probeOffset;
        while (offset < text.length && isIgnorableCharacter(text.charAt(offset))) {
            ++offset;
        }
        this._probeOffset = offset;
        if (offset >= text.length) { return null; }
        const range = this._createRangeAtOffset(containerElement, offset);
        return range === null ? null : {offset, range};
    }

    /**
     * Converts a linear character offset into the container's flattened text
     * content into a `Range` starting at that position and ending at the end
     * of the container, so the caller can hand it to the dictionary scanner.
     * @param {Element} containerElement
     * @param {number} offset
     * @returns {?Range}
     */
    _createRangeAtOffset(containerElement, offset) {
        const walker = document.createTreeWalker(containerElement, NodeFilter.SHOW_TEXT);
        let remaining = offset;
        let node = walker.nextNode();
        while (node !== null) {
            const length = /** @type {Text} */ (node).data.length;
            if (remaining < length) {
                const range = document.createRange();
                range.setStart(node, remaining);
                range.setEnd(containerElement, containerElement.childNodes.length);
                return range;
            }
            remaining -= length;
            node = walker.nextNode();
        }
        return null;
    }
}
