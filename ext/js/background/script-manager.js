/*
 * Copyright (C) 2021  Yomichan Authors
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
 * This class is used to manage script injection into content tabs.
 */
class ScriptManager {
    /**
     * Injects a stylesheet into a specific tab and frame.
     * @param {string} type The type of content to inject; either 'file' or 'code'.
     * @param {string} content The content to inject.
     *   If type is 'file', this argument should be a path to a file.
     *   If type is 'code', this argument should be the CSS content.
     * @param {number} tabId The id of the tab to inject into.
     * @param {number} frameId The id of the frame to inject into.
     * @returns {Promise<void>}
     */
    injectStylesheet(type, content, tabId, frameId) {
        if (isObject(chrome.tabs) && typeof chrome.tabs.insertCSS === 'function') {
            return this._injectStylesheetMV2(type, content, tabId, frameId);
        } else if (isObject(chrome.scripting) && typeof chrome.scripting.insertCSS === 'function') {
            return this._injectStylesheetMV3(type, content, tabId, frameId);
        } else {
            return Promise.reject(new Error('Stylesheet injection not supported'));
        }
    }
    /**
     * Injects a script into a specific tab and frame.
     * @param {string} file The path to a file to inject.
     * @param {number} tabId The id of the tab to inject into.
     * @param {number} frameId The id of the frame to inject into.
     * @returns {Promise<{frameId: number, result: object}>} The id of the frame and the result of the script injection.
     */
    injectScript(file, tabId, frameId) {
        if (isObject(chrome.tabs) && typeof chrome.tabs.executeScript === 'function') {
            return this._injectScriptMV2(file, tabId, frameId);
        } else if (isObject(chrome.scripting) && typeof chrome.scripting.executeScript === 'function') {
            return this._injectScriptMV3(file, tabId, frameId);
        } else {
            return Promise.reject(new Error('Script injection not supported'));
        }
    }

    // Private

    _injectStylesheetMV2(type, content, tabId, frameId) {
        return new Promise((resolve, reject) => {
            const details = (
                type === 'file' ?
                {
                    file: content,
                    runAt: 'document_start',
                    cssOrigin: 'author',
                    allFrames: false,
                    matchAboutBlank: true
                } :
                {
                    code: content,
                    runAt: 'document_start',
                    cssOrigin: 'user',
                    allFrames: false,
                    matchAboutBlank: true
                }
            );
            if (typeof frameId === 'number') {
                details.frameId = frameId;
            }
            chrome.tabs.insertCSS(tabId, details, () => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve();
                }
            });
        });
    }

    _injectStylesheetMV3(type, content, tabId, frameId) {
        return new Promise((resolve, reject) => {
            const details = (
                type === 'file' ?
                {origin: chrome.scripting.StyleOrigin.AUTHOR, files: [content]} :
                {origin: chrome.scripting.StyleOrigin.USER,   css: content}
            );
            details.target = {
                tabId,
                allFrames: false
            };
            if (typeof frameId === 'number') {
                details.target.frameIds = [frameId];
            }
            chrome.scripting.insertCSS(details, () => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve();
                }
            });
        });
    }

    _injectScriptMV2(file, tabId, frameId) {
        return new Promise((resolve, reject) => {
            const details = {
                allFrames: false,
                frameId,
                file,
                matchAboutBlank: true,
                runAt: 'document_start'
            };
            chrome.tabs.executeScript(tabId, details, (results) => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    const result = results[0];
                    resolve({frameId, result});
                }
            });
        });
    }

    _injectScriptMV3(file, tabId, frameId) {
        return new Promise((resolve, reject) => {
            const details = {
                files: [file],
                target: {
                    allFrames: false,
                    frameIds: [frameId],
                    tabId
                }
            };
            chrome.scripting.executeScript(details, (results) => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    const {frameId: frameId2, result} = results[0];
                    resolve({frameId: frameId2, result});
                }
            });
        });
    }
}
