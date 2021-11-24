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

(async () => {
    // Reentrant check
    if (self.googleDocsAccessibilitySetup) { return; }
    self.googleDocsAccessibilitySetup = true;

    const invokeApi = (action, params) => {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({action, params}, (response) => {
                void chrome.runtime.lastError;
                if (typeof response !== 'object' || response === null) {
                    reject(new Error('Unexpected response'));
                } else if (typeof response.error !== 'undefined') {
                    reject(new Error('Invalid response'));
                } else {
                    resolve(response.result);
                }
            });
        });
    };

    const optionsContext = {depth: 0, url: location.href};
    let options;
    try {
        options = await invokeApi('optionsGet', {optionsContext});
    } catch (e) {
        return;
    }

    if (!options.accessibility.forceGoogleDocsHtmlRendering) { return; }

    let parent = document.head;
    if (parent === null) {
        parent = document.documentElement;
        if (parent === null) { return; }
    }
    const script = document.createElement('script');
    script.textContent = 'window._docs_force_html_by_ext = true;';
    parent.appendChild(script);
    parent.removeChild(script);
})();
