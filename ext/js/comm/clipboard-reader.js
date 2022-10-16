/*
 * Copyright (C) 2020-2022  Yomichan Authors
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

/* global
 * MediaUtil
 */

/**
 * Class which can read text and images from the clipboard.
 */
class ClipboardReader {
    /**
     * Creates a new instances of a clipboard reader.
     * @param {object} details Details about how to set up the instance.
     * @param {?Document} details.document The Document object to be used, or null for no support.
     * @param {?string} details.pasteTargetSelector The selector for the paste target element.
     * @param {?string} details.richContentPasteTargetSelector The selector for the rich content paste target element.
     */
    constructor({document=null, pasteTargetSelector=null, richContentPasteTargetSelector=null}) {
        this._document = document;
        this._browser = null;
        this._pasteTarget = null;
        this._pasteTargetSelector = pasteTargetSelector;
        this._richContentPasteTarget = null;
        this._richContentPasteTargetSelector = richContentPasteTargetSelector;
    }

    /**
     * Gets the browser being used.
     * @type {?string}
     */
    get browser() {
        return this._browser;
    }

    /**
     * Assigns the browser being used.
     */
    set browser(value) {
        this._browser = value;
    }

    /**
     * Gets the text in the clipboard.
     * @param {boolean} useRichText Whether or not to use rich text for pasting, when possible.
     * @returns {string} A string containing the clipboard text.
     * @throws {Error} Error if not supported.
     */
    async getText(useRichText) {
        /*
        Notes:
            document.execCommand('paste') sometimes doesn't work on Firefox.
            See: https://bugzilla.mozilla.org/show_bug.cgi?id=1603985
            Therefore, navigator.clipboard.readText() is used on Firefox.

            navigator.clipboard.readText() can't be used in Chrome for two reasons:
            * Requires page to be focused, else it rejects with an exception.
            * When the page is focused, Chrome will request clipboard permission, despite already
              being an extension with clipboard permissions. It effectively asks for the
              non-extension permission for clipboard access.
        */
        if (this._isFirefox() && !useRichText) {
            try {
                return await navigator.clipboard.readText();
            } catch (e) {
                // Error is undefined, due to permissions
                throw new Error('Cannot read clipboard text; check extension permissions');
            }
        }

        const document = this._document;
        if (document === null) {
            throw new Error('Clipboard reading not supported in this context');
        }

        if (useRichText) {
            const target = this._getRichContentPasteTarget();
            target.focus();
            document.execCommand('paste');
            const result = target.textContent;
            this._clearRichContent(target);
            return result;
        } else {
            const target = this._getPasteTarget();
            target.value = '';
            target.focus();
            document.execCommand('paste');
            const result = target.value;
            target.value = '';
            return (typeof result === 'string' ? result : '');
        }
    }

    /**
     * Gets the first image in the clipboard.
     * @returns {string} A string containing a data URL of the image file, or null if no image was found.
     * @throws {Error} Error if not supported.
     */
    async getImage() {
        // See browser-specific notes in getText
        if (
            this._isFirefox() &&
            typeof navigator.clipboard !== 'undefined' &&
            typeof navigator.clipboard.read === 'function'
        ) {
            // This function is behind the Firefox flag: dom.events.asyncClipboard.read
            // See: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/read#browser_compatibility
            let items;
            try {
                items = await navigator.clipboard.read();
            } catch (e) {
                return null;
            }

            for (const item of items) {
                for (const type of item.types) {
                    if (!MediaUtil.getFileExtensionFromImageMediaType(type)) { continue; }
                    try {
                        const blob = await item.getType(type);
                        return await this._readFileAsDataURL(blob);
                    } catch (e) {
                        // NOP
                    }
                }
            }
            return null;
        }

        const document = this._document;
        if (document === null) {
            throw new Error('Clipboard reading not supported in this context');
        }

        const target = this._getRichContentPasteTarget();
        target.focus();
        document.execCommand('paste');
        const image = target.querySelector('img[src^="data:"]');
        const result = (image !== null ? image.getAttribute('src') : null);
        this._clearRichContent(target);
        return result;
    }

    // Private

    _isFirefox() {
        return (this._browser === 'firefox' || this._browser === 'firefox-mobile');
    }

    _readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    _getPasteTarget() {
        if (this._pasteTarget === null) { this._pasteTarget = this._findPasteTarget(this._pasteTargetSelector); }
        return this._pasteTarget;
    }

    _getRichContentPasteTarget() {
        if (this._richContentPasteTarget === null) { this._richContentPasteTarget = this._findPasteTarget(this._richContentPasteTargetSelector); }
        return this._richContentPasteTarget;
    }

    _findPasteTarget(selector) {
        const target = this._document.querySelector(selector);
        if (target === null) { throw new Error('Clipboard paste target does not exist'); }
        return target;
    }

    _clearRichContent(element) {
        for (const image of element.querySelectorAll('img')) {
            image.removeAttribute('src');
            image.removeAttribute('srcset');
        }
        element.textContent = '';
    }
}
