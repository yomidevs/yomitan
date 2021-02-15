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

class MecabController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._testButton = null;
        this._resultsContainer = null;
        this._testActive = false;
    }

    prepare() {
        this._testButton = document.querySelector('#test-mecab-button');
        this._resultsContainer = document.querySelector('#test-mecab-results');

        this._testButton.addEventListener('click', this._onTestButtonClick.bind(this), false);
    }

    // Private

    _onTestButtonClick(e) {
        e.preventDefault();
        this._testMecab();
    }

    async _testMecab() {
        if (this._testActive) { return; }

        try {
            this._testActive = true;
            this._testButton.disabled = true;
            this._resultsContainer.textContent = '';
            this._resultsContainer.hidden = true;
            await yomichan.api.testMecab();
            this._setStatus('Connection was successful', false);
        } catch (e) {
            this._setStatus(e.message, true);
        } finally {
            this._testActive = false;
            this._testButton.disabled = false;
        }
    }

    _setStatus(message, isError) {
        this._resultsContainer.textContent = message;
        this._resultsContainer.hidden = false;
        this._resultsContainer.classList.toggle('danger-text', isError);
    }
}
