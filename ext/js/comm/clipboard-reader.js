/*
 * Copyright (C) 2020-2021  Yomichan Authors
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
     * @param document The Document object to be used, or null for no support.
     * @param pasteTargetSelector The selector for the paste target element.
     * @param imagePasteTargetSelector The selector for the image paste target element.
     */
    constructor({document=null, pasteTargetSelector=null, imagePasteTargetSelector=null}) {
        this._document = document;
        this._browser = null;
        this._pasteTarget = null;
        this._pasteTargetSelector = pasteTargetSelector;
        this._imagePasteTarget = null;
        this._imagePasteTargetSelector = imagePasteTargetSelector;
    }

    /**
     * Gets the browser being used.
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
     * @returns A string containing the clipboard text.
     * @throws Error if not supported.
     */
    async getText() {
        /*
        Notes:
            document.execCommand('paste') doesn't work on Firefox.
            See: https://bugzilla.mozilla.org/show_bug.cgi?id=1603985
            Therefore, navigator.clipboard.readText() is used on Firefox.

            navigator.clipboard.readText() can't be used in Chrome for two reasons:
            * Requires page to be focused, else it rejects with an exception.
            * When the page is focused, Chrome will request clipboard permission, despite already
              being an extension with clipboard permissions. It effectively asks for the
              non-extension permission for clipboard access.
        */
        if (this._isFirefox()) {
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

        let target = this._pasteTarget;
        if (target === null) {
            target = document.querySelector(this._pasteTargetSelector);
            if (target === null) {
                throw new Error('Clipboard paste target does not exist');
            }
            this._pasteTarget = target;
        }

        target.value = '';
        target.focus();
        document.execCommand('paste');
        const result = target.value;
        target.value = '';
        return (typeof result === 'string' ? result : '');
    }

    /**
     * Gets the first image in the clipboard.
     * @returns A string containing a data URL of the image file, or null if no image was found.
     * @throws Error if not supported.
     */
    async getImage() {
        // See browser-specific notes in getText
        if (
            this._isFirefox() &&
            typeof navigator.clipboard !== 'undefined' &&
            typeof navigator.clipboard.read === 'function'
        ) {
            // This function is behind the Firefox flag: dom.events.asyncClipboard.dataTransfer
            let files;
            try {
                ({files} = await navigator.clipboard.read());
            } catch (e) {
                return null;
            }

            for (const file of files) {
                if (MediaUtil.getFileExtensionFromImageMediaType(file.type) !== null) {
                    return await this._readFileAsDataURL(file);
                }
            }
            return null;
        }

        const document = this._document;
        if (document === null) {
            throw new Error('Clipboard reading not supported in this context');
        }

        let target = this._imagePasteTarget;
        if (target === null) {
            target = document.querySelector(this._imagePasteTargetSelector);
            if (target === null) {
                throw new Error('Clipboard paste target does not exist');
            }
            this._imagePasteTarget = target;
        }

        target.focus();
        document.execCommand('paste');
        const image = target.querySelector('img[src^="data:"]');
        const result = (image !== null ? image.getAttribute('src') : null);
        for (const image2 of target.querySelectorAll('img')) {
            image2.removeAttribute('src');
        }
        target.textContent = '';
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
}
