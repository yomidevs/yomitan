/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import {Trie} from '../data/trie.js';
import {DictionaryDatabase} from '../dictionary/dictionary-database.js';
import {querySelectorNotNull} from '../dom/query-selector.js';

/**
 * Controller for managing search suggestions using a trie.
 */
export class SearchSuggestionController {
    /**
     * @param {import('./search-persistent-state-controller.js').SearchPersistentStateController} searchPersistentStateController
     * @param {import('./display.js').Display} display
     */
    constructor(searchPersistentStateController, display) {
        /** @type {Trie} */
        this._trie = new Trie();
        /** @type {import('./search-persistent-state-controller.js').SearchPersistentStateController} */
        this._searchPersistentStateController = searchPersistentStateController;
        /** @type {import('./display.js').Display} */
        this._display = display;
        /** @type {DictionaryDatabase} */
        this._dictionaryDatabase = new DictionaryDatabase();
        /** @type {HTMLUListElement} */
        this._suggestionsList = querySelectorNotNull(document, '#suggestions-list');
    }

    /**
     * Prepares the suggestion trie with initial terms.
     * @returns {Promise<void>}
     */
    async prepare() {
        await this._dictionaryDatabase.prepare();
    }

    /**
     * Renders the list of search suggestions.
     * @param {string[] | Promise<string[]>} suggestions
     */
    async _renderSuggestions(suggestions) {
        console.log('Rendering suggestions:', suggestions);
        this._suggestionsList.innerHTML = '';

        // Handle both Promise and array cases
        const suggestionArray = Array.isArray(suggestions) ? suggestions : await suggestions;

        if (suggestionArray.length === 0) {
            console.log('No suggestions to display');
            this._suggestionsList.style.display = 'none';
            return;
        }

        this._suggestionsList.style.display = 'block';
        const searchTextbox = document.getElementById('search-textbox');
        if (searchTextbox instanceof HTMLTextAreaElement) {
            const rect = searchTextbox.getBoundingClientRect();
            this._suggestionsList.style.top = `${rect.bottom}px`;
            this._suggestionsList.style.left = `${rect.left}px`;
            this._suggestionsList.style.width = `${rect.width}px`;
            console.log('Positioned suggestions at:', rect);
        }

        for (const suggestion of suggestionArray) {
            const li = document.createElement('li');
            li.textContent = suggestion;
            li.addEventListener('click', () => {
                if (searchTextbox instanceof HTMLTextAreaElement) {
                    searchTextbox.value = suggestion;
                    this._suggestionsList.innerHTML = '';
                    this._suggestionsList.style.display = 'none';
                    // Trigger input event to update search
                    searchTextbox.dispatchEvent(new Event('input', {bubbles: true}));
                }
            });
            this._suggestionsList.appendChild(li);
        }
    }

    /**
     * Returns autocomplete suggestions for the given input.
     * @param {string} input
     * @returns {Promise<string[]>}
     */
    async getSuggestions(input) {
        console.log('Getting suggestions for:', input);
        /** @type {Map<string, {term: string, score: number, dictionaryIndex: number}>} */
        const suggestions = new Map();

        // Get suggestions from the trie (what we've already seen)
        const trieSuggestions = this._trie.getSuggestions(input);
        for (const suggestion of trieSuggestions) {
            suggestions.set(suggestion, {term: suggestion, score: 0, dictionaryIndex: -1});
        }

        // If input is not empty, search the dictionary in real-time
        if (input.length > 0) {
            const options = this._display.getOptions();
            if (options !== null) {
                /** @type {Map<string, number>} */
                const dictionaryMap = new Map();
                let index = 0;
                for (const {name, enabled} of options.dictionaries) {
                    if (enabled) {
                        dictionaryMap.set(name, index++);
                    }
                }

                try {
                    const entries = await this._dictionaryDatabase.findTermsBulk([input], new Set(dictionaryMap.keys()), 'prefix');
                    for (const entry of entries) {
                        const dictionaryIndex = dictionaryMap.get(entry.dictionary) ?? -1;
                        const existing = suggestions.get(entry.term);
                        // Keep the entry with the highest score and lowest dictionary index
                        if (!existing || entry.score > existing.score || (entry.score === existing.score && dictionaryIndex < existing.dictionaryIndex)) {
                            suggestions.set(entry.term, {
                                term: entry.term,
                                score: entry.score,
                                dictionaryIndex,
                            });
                        }
                        // Add to trie for future suggestions
                        this._trie.insert(entry.term);
                    }
                } catch (e) {
                    console.error('Error fetching real-time suggestions:', e);
                }
            }
        }

        // Sort by score (descending) and dictionary index (ascending)
        const result = [...suggestions.values()]
            .sort((a, b) => {
                if (a.score !== b.score) {
                    return b.score - a.score; // Higher score first
                }
                return a.dictionaryIndex - b.dictionaryIndex; // Lower index (higher priority) first
            })
            .map((item) => item.term)
            .slice(0, 10);

        console.log('Found suggestions:', result);
        return result;
    }
}
