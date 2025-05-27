/*
 * Copyright (C) 2025  Yomitan Authors
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

import {toError} from '../../core/to-error.js';
import {querySelectorNotNull} from '../../dom/query-selector.js';

export class YomitanApiController {
    /**
     * @param {import('../../comm/api.js').API} api
     */
    constructor(api) {
        /** @type {import('../../comm/api.js').API} */
        this._api = api;
        /** @type {HTMLButtonElement} */
        this._testButton = querySelectorNotNull(document, '#test-yomitan-api-button');
        /** @type {HTMLElement} */
        this._resultsContainer = querySelectorNotNull(document, '#test-yomitan-api-results');
        /** @type {HTMLInputElement} */
        this._urlInput = querySelectorNotNull(document, '#test-yomitan-url-input');
        /** @type {boolean} */
        this._testActive = false;
    }

    /** */
    prepare() {
        this._testButton.addEventListener('click', this._onTestButtonClick.bind(this), false);
    }

    // Private

    /**
     * @param {MouseEvent} e
     */
    _onTestButtonClick(e) {
        e.preventDefault();
        void this._testYomitanApi();
    }

    /** */
    async _testYomitanApi() {
        if (this._testActive) { return; }

        try {
            this._testActive = true;
            const resultsContainer = /** @type {HTMLElement} */ (this._resultsContainer);
            /** @type {HTMLButtonElement} */ (this._testButton).disabled = true;
            resultsContainer.textContent = '';
            resultsContainer.hidden = true;
            await this._api.testYomitanApi(this._urlInput.value);
            this._setStatus('Connection was successful', false);
        } catch (e) {
            this._setStatus(toError(e).message, true);
        } finally {
            this._testActive = false;
            /** @type {HTMLButtonElement} */ (this._testButton).disabled = false;
        }
    }

    /**
     * @param {string} message
     * @param {boolean} isError
     */
    _setStatus(message, isError) {
        const resultsContainer = /** @type {HTMLElement} */ (this._resultsContainer);
        resultsContainer.textContent = message;
        resultsContainer.hidden = false;
        resultsContainer.classList.toggle('danger-text', isError);
    }
}
