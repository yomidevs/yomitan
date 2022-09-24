/*
 * Copyright (C) 2021-2022  Yomichan Authors
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
     * Creates a new instance of the class.
     */
    constructor() {
        this._contentScriptRegistrations = new Map();
    }

    /**
     * Injects a stylesheet into a tab.
     * @param {string} type The type of content to inject; either 'file' or 'code'.
     * @param {string} content The content to inject.
     *   If type is 'file', this argument should be a path to a file.
     *   If type is 'code', this argument should be the CSS content.
     * @param {number} tabId The id of the tab to inject into.
     * @param {number} [frameId] The id of the frame to inject into.
     * @param {boolean} [allFrames] Whether or not the stylesheet should be injected into all frames.
     * @param {boolean} [matchAboutBlank] Whether or not the stylesheet should be injected into about:blank frames.
     * @param {string} [runAt] The time to inject the stylesheet at.
     * @returns {Promise<void>}
     */
    injectStylesheet(type, content, tabId, frameId, allFrames, matchAboutBlank, runAt) {
        if (isObject(chrome.tabs) && typeof chrome.tabs.insertCSS === 'function') {
            return this._injectStylesheetMV2(type, content, tabId, frameId, allFrames, matchAboutBlank, runAt);
        } else if (isObject(chrome.scripting) && typeof chrome.scripting.insertCSS === 'function') {
            return this._injectStylesheetMV3(type, content, tabId, frameId, allFrames);
        } else {
            return Promise.reject(new Error('Stylesheet injection not supported'));
        }
    }

    /**
     * Injects a script into a tab.
     * @param {string} file The path to a file to inject.
     * @param {number} tabId The id of the tab to inject into.
     * @param {number} [frameId] The id of the frame to inject into.
     * @param {boolean} [allFrames] Whether or not the script should be injected into all frames.
     * @param {boolean} [matchAboutBlank] Whether or not the script should be injected into about:blank frames.
     * @param {string} [runAt] The time to inject the script at.
     * @returns {Promise<{frameId: number, result: object}>} The id of the frame and the result of the script injection.
     */
    injectScript(file, tabId, frameId, allFrames, matchAboutBlank, runAt) {
        if (isObject(chrome.tabs) && typeof chrome.tabs.executeScript === 'function') {
            return this._injectScriptMV2(file, tabId, frameId, allFrames, matchAboutBlank, runAt);
        } else if (isObject(chrome.scripting) && typeof chrome.scripting.executeScript === 'function') {
            return this._injectScriptMV3(file, tabId, frameId, allFrames);
        } else {
            return Promise.reject(new Error('Script injection not supported'));
        }
    }

    /**
     * Checks whether or not a content script is registered.
     * @param {string} id The identifier used with a call to `registerContentScript`.
     * @returns {Promise<boolean>} `true` if a script is registered, `false` otherwise.
     */
    async isContentScriptRegistered(id) {
        if (this._contentScriptRegistrations.has(id)) {
            return true;
        }
        if (isObject(chrome.scripting) && typeof chrome.scripting.getRegisteredContentScripts === 'function') {
            const scripts = await new Promise((resolve, reject) => {
                chrome.scripting.getRegisteredContentScripts({ids: [id]}, (result) => {
                    const e = chrome.runtime.lastError;
                    if (e) {
                        reject(new Error(e.message));
                    } else {
                        resolve(result);
                    }
                });
            });
            for (const script of scripts) {
                if (script.id === id) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Registers a dynamic content script.
     * Note: if the fallback handler is used and the 'webNavigation' permission isn't granted,
     * there is a possibility that the script can be injected more than once due to the events used.
     * Therefore, a reentrant check may need to be performed by the content script.
     * @param {string} id A unique identifier for the registration.
     * @param {object} details The script registration details.
     * @param {boolean} [details.allFrames] Same as `all_frames` in the `content_scripts` manifest key.
     * @param {string[]} [details.css] List of CSS paths.
     * @param {string[]} [details.excludeMatches] Same as `exclude_matches` in the `content_scripts` manifest key.
     * @param {string[]} [details.js] List of script paths.
     * @param {boolean} [details.matchAboutBlank] Same as `match_about_blank` in the `content_scripts` manifest key.
     * @param {string[]} details.matches Same as `matches` in the `content_scripts` manifest key.
     * @param {string} [details.urlMatches] Regex match pattern to use as a fallback
     *   when native content script registration isn't supported. Should be equivalent to `matches`.
     * @param {string} [details.runAt] Same as `run_at` in the `content_scripts` manifest key.
     * @throws An error is thrown if the id is already in use.
     */
    async registerContentScript(id, details) {
        if (await this.isContentScriptRegistered(id)) {
            throw new Error('Registration already exists');
        }

        // Firefox
        if (
            typeof browser === 'object' && browser !== null &&
            isObject(browser.contentScripts) &&
            typeof browser.contentScripts.register === 'function'
        ) {
            const details2 = this._convertContentScriptRegistrationDetails(details, id, true);
            const registration = await browser.contentScripts.register(details2);
            this._contentScriptRegistrations.set(id, registration);
            return;
        }

        // Chrome
        if (isObject(chrome.scripting) && typeof chrome.scripting.registerContentScripts === 'function') {
            const details2 = this._convertContentScriptRegistrationDetails(details, id, false);
            await new Promise((resolve, reject) => {
                chrome.scripting.registerContentScripts([details2], () => {
                    const e = chrome.runtime.lastError;
                    if (e) {
                        reject(new Error(e.message));
                    } else {
                        resolve();
                    }
                });
            });
            this._contentScriptRegistrations.set(id, null);
            return;
        }

        // Fallback
        this._registerContentScriptFallback(id, details);
    }

    /**
     * Unregisters a previously registered content script.
     * @param {string} id The identifier passed to a previous call to `registerContentScript`.
     * @returns {Promise<boolean>} `true` if the content script was unregistered, `false` otherwise.
     */
    async unregisterContentScript(id) {
        // Chrome
        if (isObject(chrome.scripting) && typeof chrome.scripting.unregisterContentScripts === 'function') {
            this._contentScriptRegistrations.delete(id);
            try {
                await this._unregisterContentScriptChrome(id);
                return true;
            } catch (e) {
                return false;
            }
        }

        // Firefox or fallback
        const registration = this._contentScriptRegistrations.get(id);
        if (typeof registration === 'undefined') { return false; }
        this._contentScriptRegistrations.delete(id);
        if (isObject(registration) && typeof registration.unregister === 'function') {
            await registration.unregister();
        }
        return true;
    }

    /**
     * Gets the optional permissions required to register a content script.
     * @returns {string[]} An array of the required permissions, which may be empty.
     */
    getRequiredContentScriptRegistrationPermissions() {
        if (
            // Firefox
            (
                typeof browser === 'object' && browser !== null &&
                isObject(browser.contentScripts) &&
                typeof browser.contentScripts.register === 'function'
            ) ||
            // Chrome
            (
                isObject(chrome.scripting) &&
                typeof chrome.scripting.registerContentScripts === 'function'
            )
        ) {
            return [];
        }

        // Fallback
        return ['webNavigation'];
    }

    // Private

    _injectStylesheetMV2(type, content, tabId, frameId, allFrames, matchAboutBlank, runAt) {
        return new Promise((resolve, reject) => {
            const details = (
                type === 'file' ?
                {
                    file: content,
                    runAt,
                    cssOrigin: 'author',
                    allFrames,
                    matchAboutBlank
                } :
                {
                    code: content,
                    runAt,
                    cssOrigin: 'user',
                    allFrames,
                    matchAboutBlank
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

    _injectStylesheetMV3(type, content, tabId, frameId, allFrames) {
        return new Promise((resolve, reject) => {
            const details = (
                type === 'file' ?
                {origin: chrome.scripting.StyleOrigin.AUTHOR, files: [content]} :
                {origin: chrome.scripting.StyleOrigin.USER,   css: content}
            );
            details.target = {
                tabId,
                allFrames
            };
            if (!allFrames && typeof frameId === 'number') {
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

    _injectScriptMV2(file, tabId, frameId, allFrames, matchAboutBlank, runAt) {
        return new Promise((resolve, reject) => {
            const details = {
                allFrames,
                frameId,
                file,
                matchAboutBlank,
                runAt
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

    _injectScriptMV3(file, tabId, frameId, allFrames) {
        return new Promise((resolve, reject) => {
            const details = {
                injectImmediately: true,
                files: [file],
                target: {tabId, allFrames}
            };
            if (!allFrames && typeof frameId === 'number') {
                details.target.frameIds = [frameId];
            }
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

    _unregisterContentScriptChrome(id) {
        return new Promise((resolve, reject) => {
            chrome.scripting.unregisterContentScripts({ids: [id]}, () => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve();
                }
            });
        });
    }

    _convertContentScriptRegistrationDetails(details, id, firefoxConvention) {
        const {allFrames, css, excludeMatches, js, matchAboutBlank, matches, runAt} = details;
        const details2 = {};
        if (!firefoxConvention) {
            details2.id = id;
            details2.persistAcrossSessions = true;
        }
        if (typeof allFrames !== 'undefined') {
            details2.allFrames = allFrames;
        }
        if (Array.isArray(excludeMatches)) {
            details2.excludeMatches = [...excludeMatches];
        }
        if (Array.isArray(matches)) {
            details2.matches = [...matches];
        }
        if (typeof runAt !== 'undefined') {
            details2.runAt = runAt;
        }
        if (firefoxConvention && typeof matchAboutBlank !== 'undefined') {
            details2.matchAboutBlank = matchAboutBlank;
        }
        if (Array.isArray(css)) {
            details2.css = this._convertFileArray(css, firefoxConvention);
        }
        if (Array.isArray(js)) {
            details2.js = this._convertFileArray(js, firefoxConvention);
        }
        return details2;
    }

    _convertFileArray(array, firefoxConvention) {
        return firefoxConvention ? array.map((file) => ({file})) : [...array];
    }

    _registerContentScriptFallback(id, details) {
        const {allFrames, css, js, matchAboutBlank, runAt, urlMatches} = details;
        const details2 = {allFrames, css, js, matchAboutBlank, runAt, urlRegex: null};
        let unregister;
        const webNavigationEvent = this._getWebNavigationEvent(runAt);
        if (isObject(webNavigationEvent)) {
            const onTabCommitted = ({url, tabId, frameId}) => {
                this._injectContentScript(true, details2, null, url, tabId, frameId);
            };
            const filter = {url: [{urlMatches}]};
            webNavigationEvent.addListener(onTabCommitted, filter);
            unregister = () => webNavigationEvent.removeListener(onTabCommitted);
        } else {
            const onTabUpdated = (tabId, {status}, {url}) => {
                if (typeof status === 'string' && typeof url === 'string') {
                    this._injectContentScript(false, details2, status, url, tabId, void 0);
                }
            };
            const extraParameters = {url: [urlMatches], properties: ['status']};
            try {
                // Firefox
                chrome.tabs.onUpdated.addListener(onTabUpdated, extraParameters);
            } catch (e) {
                // Chrome
                details2.urlRegex = new RegExp(urlMatches);
                chrome.tabs.onUpdated.addListener(onTabUpdated);
            }
            unregister = () => chrome.tabs.onUpdated.removeListener(onTabUpdated);
        }
        this._contentScriptRegistrations.set(id, {unregister});
    }

    _getWebNavigationEvent(runAt) {
        const {webNavigation} = chrome;
        if (!isObject(webNavigation)) { return null; }
        switch (runAt) {
            case 'document_start':
                return webNavigation.onCommitted;
            case 'document_end':
                return webNavigation.onDOMContentLoaded;
            default: // 'document_idle':
                return webNavigation.onCompleted;
        }
    }

    async _injectContentScript(isWebNavigation, details, status, url, tabId, frameId) {
        const {urlRegex} = details;
        if (urlRegex !== null && !urlRegex.test(url)) { return; }

        let {allFrames, css, js, matchAboutBlank, runAt} = details;

        if (isWebNavigation) {
            if (allFrames) {
                allFrames = false;
            } else {
                if (frameId !== 0) { return; }
            }
        } else {
            if (runAt === 'document_start') {
                if (status !== 'loading') { return; }
            } else { // 'document_end', 'document_idle'
                if (status !== 'complete') { return; }
            }
        }

        const promises = [];
        if (Array.isArray(css)) {
            const runAtCss = (typeof runAt === 'string' ? runAt : 'document_start');
            for (const file of css) {
                promises.push(this.injectStylesheet('file', file, tabId, frameId, allFrames, matchAboutBlank, runAtCss));
            }
        }
        if (Array.isArray(js)) {
            for (const file of js) {
                promises.push(this.injectScript(file, tabId, frameId, allFrames, matchAboutBlank, runAt));
            }
        }
        await Promise.all(promises);
    }
}
