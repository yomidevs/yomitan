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
 * This class controls the registration of accessibility handlers.
 */
class AccessibilityController {
    /**
     * Creates a new instance.
     * @param {ScriptManager} scriptManager An instance of the `ScriptManager` class.
     */
    constructor(scriptManager) {
        this._scriptManager = scriptManager;
        this._updateGoogleDocsAccessibilityToken = null;
        this._updateGoogleDocsAccessibilityPromise = null;
        this._forceGoogleDocsHtmlRenderingAny = false;
    }

    /**
     * Updates the accessibility handlers.
     * @param {object} fullOptions The full options object from the `Backend` instance.
     *   The value is treated as read-only and is not modified.
     */
    async update(fullOptions) {
        let forceGoogleDocsHtmlRenderingAny = false;
        for (const {options} of fullOptions.profiles) {
            if (options.accessibility.forceGoogleDocsHtmlRendering) {
                forceGoogleDocsHtmlRenderingAny = true;
                break;
            }
        }

        await this._updateGoogleDocsAccessibility(forceGoogleDocsHtmlRenderingAny);
    }

    // Private

    async _updateGoogleDocsAccessibility(forceGoogleDocsHtmlRenderingAny) {
        // Reentrant token
        const token = {};
        this._updateGoogleDocsAccessibilityToken = token;

        // Wait for previous
        let promise = this._updateGoogleDocsAccessibilityPromise;
        if (promise !== null) { await promise; }

        // Reentrant check
        if (this._updateGoogleDocsAccessibilityToken !== token) { return; }

        // Update
        promise = this._updateGoogleDocsAccessibilityInner(forceGoogleDocsHtmlRenderingAny);
        this._updateGoogleDocsAccessibilityPromise = promise;
        await promise;
        this._updateGoogleDocsAccessibilityPromise = null;
    }

    async _updateGoogleDocsAccessibilityInner(forceGoogleDocsHtmlRenderingAny) {
        if (this._forceGoogleDocsHtmlRenderingAny === forceGoogleDocsHtmlRenderingAny) { return; }

        this._forceGoogleDocsHtmlRenderingAny = forceGoogleDocsHtmlRenderingAny;

        const id = 'googleDocsAccessibility';
        try {
            if (forceGoogleDocsHtmlRenderingAny) {
                if (await this._scriptManager.isContentScriptRegistered(id)) { return; }
                const details = {
                    allFrames: true,
                    matchAboutBlank: true,
                    matches: ['*://docs.google.com/*'],
                    urlMatches: '^[^:]*://docs.google.com/[\\w\\W]*$',
                    runAt: 'document_start',
                    js: ['js/accessibility/google-docs.js']
                };
                await this._scriptManager.registerContentScript(id, details);
            } else {
                await this._scriptManager.unregisterContentScript(id);
            }
        } catch (e) {
            log.error(e);
        }
    }
}

