/*
 * Copyright (C) 2023  Yomitan Authors
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

import {log} from '../core.js';

/**
 * This class controls the registration of accessibility handlers.
 */
export class AccessibilityController {
    /**
     * Creates a new instance.
     * @param {import('../background/script-manager.js').ScriptManager} scriptManager An instance of the `ScriptManager` class.
     */
    constructor(scriptManager) {
        /** @type {import('../background/script-manager.js').ScriptManager} */
        this._scriptManager = scriptManager;
        /** @type {?import('core').TokenObject} */
        this._updateGoogleDocsAccessibilityToken = null;
        /** @type {?Promise<void>} */
        this._updateGoogleDocsAccessibilityPromise = null;
        /** @type {boolean} */
        this._forceGoogleDocsHtmlRenderingAny = false;
    }

    /**
     * Updates the accessibility handlers.
     * @param {import('settings').Options} fullOptions The full options object from the `Backend` instance.
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

    /**
     * @param {boolean} forceGoogleDocsHtmlRenderingAny
     */
    async _updateGoogleDocsAccessibility(forceGoogleDocsHtmlRenderingAny) {
        // Reentrant token
        /** @type {?import('core').TokenObject} */
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

    /**
     * @param {boolean} forceGoogleDocsHtmlRenderingAny
     */
    async _updateGoogleDocsAccessibilityInner(forceGoogleDocsHtmlRenderingAny) {
        if (this._forceGoogleDocsHtmlRenderingAny === forceGoogleDocsHtmlRenderingAny) { return; }

        this._forceGoogleDocsHtmlRenderingAny = forceGoogleDocsHtmlRenderingAny;

        const id = 'googleDocsAccessibility';
        try {
            if (forceGoogleDocsHtmlRenderingAny) {
                if (await this._scriptManager.isContentScriptRegistered(id)) { return; }
                /** @type {import('script-manager').RegistrationDetails} */
                const details = {
                    allFrames: true,
                    matches: ['*://docs.google.com/*'],
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

