/*
 * Copyright (C) 2023-2025  Yomitan Authors
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
import {convertToKana} from '../language/ja/japanese-wanakana.js';
import {isStringEntirelyKana} from '../language/ja/japanese.js';

// Suggestion list size limit for autocomplete UI
const SUGGESTION_LIMIT = 10;

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
        /** @type {boolean} */
        this._isSelectingSuggestion = false;
        /** @type {Map<string, number>} */
        this._termScores = new Map();
        /** @type {Map<string, number>} */
        this._userFrequency = new Map();
        /** @type {Map<string, Set<string>>} */
        this._readingToKanji = new Map();

        // Performance monitoring
        /** @type {number} */
        this._trieUsageCount = 0;
        /** @type {number} */
        this._databaseUsageCount = 0;
        /** @type {number} */
        this._totalRequests = 0;

        this._setupClickOutsideListener();
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
    async renderSuggestions(suggestions) {
        if (this._isSelectingSuggestion) {
            return;
        }

        try {
            this._suggestionsList.innerHTML = '';
            const suggestionArray = Array.isArray(suggestions) ? suggestions : await suggestions;

            // Don't hide suggestions if we already have some displayed and the new suggestions are empty
            if (suggestionArray.length === 0) {
                const currentSuggestions = this._suggestionsList.children.length;
                if (currentSuggestions > 0) {
                    return;
                }
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
            }

            const fragment = document.createDocumentFragment();
            for (const suggestion of suggestionArray) {
                const li = document.createElement('li');
                li.textContent = suggestion;
                li.addEventListener('click', () => {
                    if (searchTextbox instanceof HTMLTextAreaElement) {
                        this._isSelectingSuggestion = true;
                        searchTextbox.value = suggestion;
                        this.hideSuggestions();

                        // Track user selection frequency
                        const currentFreq = this._userFrequency.get(suggestion) || 0;
                        this._userFrequency.set(suggestion, currentFreq + 1);

                        searchTextbox.dispatchEvent(new Event('input', {bubbles: true}));
                        const searchButton = document.getElementById('search-button');
                        if (searchButton) {
                            searchButton.click();
                        }
                        setTimeout(() => {
                            this._isSelectingSuggestion = false;
                        }, 100);
                    }
                });
                fragment.appendChild(li);
            }
            this._suggestionsList.appendChild(fragment);
        } catch (e) {
            this._suggestionsList.style.display = 'none';
        }
    }

    /**
     * Returns autocomplete suggestions for the given input.
     * @param {string} input
     * @returns {Promise<string[]>}
     */
    async getSuggestions(input) {
        try {
            this._totalRequests++;
            const options = this._display.getOptions();
            if (!this._areSuggestionsEnabled(options) || !options) { return []; }

            const searchInput = this._normalizeInput(input, options);

            if (searchInput.length === 0) {
                return await this._getPopularSuggestions();
            }

            const suggestions = this._getTrieSuggestions(searchInput);

            this._addKanjiEquivalentsIfNeeded(searchInput, suggestions);

            if (suggestions.length >= SUGGESTION_LIMIT) {
                this._trieUsageCount++;
                this._logPerformanceStats();
                return this._sortAndLimitSuggestions(suggestions, searchInput, options, 'trie');
            }

            // Fallback to DB
            this._databaseUsageCount++;
            /** @type {{ entries: { reading: string, term: string }[], suggestions: string[] }} */
            const dbResult = await this._getDatabaseSuggestions(searchInput, options);
            /** @type {{ reading: string, term: string }[]} */
            const dbEntries = dbResult.entries;
            /** @type {string[]} */
            let dbsuggestions = dbResult.suggestions;
            // Add kanji terms for prefix-matching readings
            const kanjiSuggestions = [];
            if (isStringEntirelyKana(searchInput)) {
                for (const entry of dbEntries) {
                    if (
                        entry.reading &&
                        entry.reading.startsWith(/** @type {string} */ (searchInput)) &&
                        entry.term &&
                        entry.term !== entry.reading &&
                        this._containsKanji(entry.term)
                    ) {
                        kanjiSuggestions.push(entry.term);
                    }
                }
            }
            dbsuggestions = [...new Set([...dbsuggestions, ...kanjiSuggestions])];

            this._logPerformanceStats();
            return this._sortAndLimitSuggestions(dbsuggestions, searchInput, options, 'database');
        } catch (e) {
            return [];
        }
    }

    /**
     * Gets popular/most recent suggestions when input is empty.
     * @returns {Promise<string[]>}
     */
    async _getPopularSuggestions() {
        // Return terms with highest user frequency first
        return [...this._userFrequency.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([term]) => term)
            .slice(0, SUGGESTION_LIMIT);
    }

    /**
     * @param {Map<string, { term: string, score: number, dictionaryIndex: number }>} suggestions
     * @returns {Promise<string[]>}
     */
    async _sortSuggestionsByScore(suggestions) {
        const options = this._display.getOptions();
        const frequencyDictionary = options?.general.sortFrequencyDictionary;

        // Get frequency data from installed frequency dictionaries if enabled
        /** @type {Map<string, number>} */
        const frequencyMap = new Map();
        if (frequencyDictionary) {
            try {
                const termReadingList = [...suggestions.keys()].map((term) => ({term, reading: null}));
                const frequencies = await this._display.application.api.getTermFrequencies(termReadingList, [frequencyDictionary]);
                for (const freq of frequencies) {
                    frequencyMap.set(freq.term, freq.frequency);
                }
            } catch (e) {
                // Ignore frequency data errors
            }
        }
        /** @type {Array<{ term: string, score: number, dictionaryIndex: number }>} */
        return [...suggestions.values()]
            .sort((a, b) => {
                const freqA = this._userFrequency.get(a.term) || 0;
                const freqB = this._userFrequency.get(b.term) || 0;
                const yomitanFreqA = frequencyMap.get(a.term) || 0;
                const yomitanFreqB = frequencyMap.get(b.term) || 0;

                // Weight: 50% dictionary score + 30% Yomitan frequency + 20% user frequency
                const weightedScoreA = (a.score * 0.5) + (yomitanFreqA * 0.3) + (freqA * 100 * 0.2);
                const weightedScoreB = (b.score * 0.5) + (yomitanFreqB * 0.3) + (freqB * 100 * 0.2);

                if (weightedScoreA !== weightedScoreB) {
                    return weightedScoreB - weightedScoreA;
                }
                return a.dictionaryIndex - b.dictionaryIndex;
            })
            .map((item) => item.term)
            .slice(0, SUGGESTION_LIMIT);
    }

    /**
     * Sorts suggestions with frequency data.
     * @param {string[]} suggestions
     * @param {string} input
     * @param {import('settings').ProfileOptions} options
     * @param {string} _source
     * @returns {Promise<string[]>}
     */
    async _sortSuggestionsWithFrequency(suggestions, input, options, _source) {
        const frequencyDictionary = options.general.sortFrequencyDictionary;
        if (!frequencyDictionary) {
            return suggestions.slice(0, SUGGESTION_LIMIT);
        }

        try {
            // Use ALL suggestions for frequency lookup, including kanji terms
            const termReadingList = suggestions.map((term) => ({term, reading: null}));
            const frequencies = await this._display.application.api.getTermFrequencies(termReadingList, [frequencyDictionary]);

            /** @type {Map<string, number>} */
            const frequencyMap = new Map();
            for (const freq of frequencies) {
                frequencyMap.set(freq.term, freq.frequency);
            }

            const sorted = suggestions.sort((a, b) => this._compareSuggestions(a, b, input, frequencyMap));
            return sorted.slice(0, SUGGESTION_LIMIT);
        } catch (e) {
            return suggestions.slice(0, SUGGESTION_LIMIT);
        }
    }

    /**
     * Compares two suggestions for sorting.
     * @param {string} a First suggestion.
     * @param {string} b Second suggestion.
     * @param {string} input The input text.
     * @param {Map<string, number>} frequencyMap The frequency map.
     * @returns {number} result.
     */
    _compareSuggestions(a, b, input, frequencyMap) {
        const freqA = frequencyMap.get(a) || 0;
        const freqB = frequencyMap.get(b) || 0;
        const userFreqA = this._userFrequency.get(a) || 0;
        const userFreqB = this._userFrequency.get(b) || 0;
        const scoreA = this._termScores.get(a) || 0;
        const scoreB = this._termScores.get(b) || 0;

        // 1. Prioritize exact matches
        const isExactMatchA = a === input;
        const isExactMatchB = b === input;
        if (isExactMatchA && !isExactMatchB) { return -1; }
        if (!isExactMatchA && isExactMatchB) { return 1; }

        // 2. Prioritize kanji terms for kana input
        if (isStringEntirelyKana(input)) {
            const isKanjiA = this._containsKanji(a);
            const isKanjiB = this._containsKanji(b);
            if (isKanjiA && !isKanjiB) { return -1; }
            if (!isKanjiA && isKanjiB) { return 1; }
        }

        // 3. Prioritize shorter terms
        const lengthDiff = a.length - b.length;
        if (lengthDiff !== 0) { return lengthDiff; }

        // 4. Use Yomitans weighting: frequency + score + user frequency
        const weightedScoreA = (freqA * 0.6) + (scoreA * 0.25) + (userFreqA * 100 * 0.15);
        const weightedScoreB = (freqB * 0.6) + (scoreB * 0.25) + (userFreqB * 100 * 0.15);

        return weightedScoreB - weightedScoreA;
    }

    /**
     * Sets up event listener to hide suggestions when clicking outside the search area.
     */
    _setupClickOutsideListener() {
        document.addEventListener('click', (event) => {
            const searchTextbox = document.getElementById('search-textbox');
            const suggestionsList = this._suggestionsList;

            if (searchTextbox && suggestionsList) {
                const target = /** @type {Element} */ (event.target);
                const isClickInSearchArea = searchTextbox.contains(target) || suggestionsList.contains(target);
                if (!isClickInSearchArea && suggestionsList.style.display !== 'none') {
                    this.hideSuggestions();
                }
            }
        });
    }

    /** */
    hideSuggestions() {
        this._suggestionsList.style.display = 'none';
    }

    // --- Helper methods ---

    /**
     * Checks if search suggestions are enabled in the options.
     * @param {import('settings').ProfileOptions | null} options
     * @returns {boolean}
     */
    _areSuggestionsEnabled(options) {
        return !!(options && options.general && options.general.enableSearchSuggestions);
    }

    /**
     * Normalizes the input string based on language and settings.
     * @param {string} input
     * @param {import('settings').ProfileOptions} options
     * @returns {string}
     */
    _normalizeInput(input, options) {
        if (options.general.language === 'ja' && options.general.enableWanakana) {
            return convertToKana(input);
        }
        return input;
    }

    /**
     * Gets suggestions from the Trie for the given input.
     * @param {string} searchInput
     * @returns {string[]}
     */
    _getTrieSuggestions(searchInput) {
        return this._trie.getSuggestions(searchInput);
    }

    /**
     * Adds kanji equivalents to the suggestions if the input is kana.
     * @param {string} searchInput
     * @param {string[]} suggestions
     * @returns {void}
     */
    _addKanjiEquivalentsIfNeeded(searchInput, suggestions) {
        if (isStringEntirelyKana(searchInput)) {
            for (const [reading, kanjiSet] of this._readingToKanji.entries()) {
                if (reading.startsWith(searchInput)) {
                    for (const kanji of kanjiSet) {
                        if (!suggestions.includes(kanji)) {
                            suggestions.push(kanji);
                        }
                    }
                }
            }
        }
    }

    /**
     * Gets suggestions from the database for the given input.
     * @param {string} searchInput
     * @param {import('settings').ProfileOptions} options
     * @returns {Promise<{entries: any[], suggestions: string[]}>}
     */
    async _getDatabaseSuggestions(searchInput, options) {
        /** @type {Map<string, { term: string, score: number, dictionaryIndex: number }>} */
        const suggestions = new Map();
        if (!options) { return {entries: [], suggestions: []}; }

        /** @type {Map<string, number>} */
        const dictionaryMap = new Map();
        let index = 0;
        for (const {name, enabled} of options.dictionaries) {
            if (enabled) {
                dictionaryMap.set(name, index++);
            }
        }
        /** @type {{ term: string, score: number, dictionary: string, reading?: string }[]} */
        let entries = [];
        try {
            entries = await this._dictionaryDatabase.findTermsBulk([searchInput], new Set(dictionaryMap.keys()), 'prefix');
            for (const entry of entries) {
                const dictionaryIndex = dictionaryMap.get(entry.dictionary) ?? -1;
                const existing = suggestions.get(entry.term);
                if (!existing || entry.score > existing.score || (entry.score === existing.score && dictionaryIndex < existing.dictionaryIndex)) {
                    suggestions.set(entry.term, {
                        term: entry.term,
                        score: entry.score,
                        dictionaryIndex,
                    });
                }

                this._termScores.set(entry.term, entry.score);
                this._trie.insert(entry.term);

                if (entry.reading && entry.reading !== entry.term) {
                    this._trie.insert(entry.reading);
                    this._termScores.set(entry.reading, entry.score);

                    if (!this._readingToKanji.has(entry.reading)) {
                        this._readingToKanji.set(entry.reading, new Set());
                    }
                    const kanjiSet = this._readingToKanji.get(entry.reading);
                    if (kanjiSet) {
                        kanjiSet.add(entry.term);
                    }
                }
            }

            // Sort by score and dictionary index
            const sortedEntries = await this._sortSuggestionsByScore(suggestions);
            const sortedSuggestions = sortedEntries
                .slice(0, SUGGESTION_LIMIT);

            return {entries, suggestions: sortedSuggestions};
        } catch (e) {
            return {entries: [], suggestions: /** @type {string[]} */ []};
        }
    }

    /**
     * Sorts and limits the suggestions array.
     * @param {string[] | Map<string, {term: string, score: number, dictionaryIndex: number}>} suggestions
     * @param {string} searchInput
     * @param {import('settings').ProfileOptions} options
     * @param {string} source
     * @returns {Promise<string[]> | string[]}
     */
    _sortAndLimitSuggestions(suggestions, searchInput, options, source) {
        if (suggestions instanceof Map) {
            suggestions = [...suggestions.values()].map((item) => item.term);
        }
        const uniqueSuggestions = [...new Set(suggestions)];

        const frequencyDictionary = options.general.sortFrequencyDictionary;
        if (frequencyDictionary && uniqueSuggestions.length > 0) {
            return this._sortSuggestionsWithFrequency(uniqueSuggestions, searchInput, options, source);
        } else {
            uniqueSuggestions.sort((a, b) => {
                const isExactMatchA = a === searchInput;
                const isExactMatchB = b === searchInput;
                if (isExactMatchA && !isExactMatchB) { return -1; }
                if (!isExactMatchA && isExactMatchB) { return 1; }

                // Prioritize kanji terms that are likely matches for the input
                const isKanjiA = this._containsKanji(a);
                const isKanjiB = this._containsKanji(b);
                if (isKanjiA && !isKanjiB) { return -1; }
                if (!isKanjiA && isKanjiB) { return 1; }

                return a.length - b.length;
            });
            return uniqueSuggestions.slice(0, SUGGESTION_LIMIT);
        }
    }

    /**
     * Checks if a string contains kanji characters.
     * @param {string} text
     * @returns {boolean}
     */
    _containsKanji(text) {
        return /[\u4e00-\u9faf]/.test(text);
    }

    // performance monitoring

    /**
     * Logs performance statistics periodically.
     */
    _logPerformanceStats() {
        if (this._totalRequests % 10 === 0) {
            this._trieUsageCount = 0;
            this._databaseUsageCount = 0;
        }
    }

    /**
     * Gets the current size of the Trie.
     * @returns {number}
     */
    getTrieSize() {
        return this._trie.size();
    }

    /**
     * Gets performance statistics.
     * @returns {{trieUsage: number, databaseUsage: number, totalRequests: number, trieSize: number}}
     */
    getPerformanceStats() {
        return {
            trieUsage: this._trieUsageCount,
            databaseUsage: this._databaseUsageCount,
            totalRequests: this._totalRequests,
            trieSize: this._trie.size(),
        };
    }
}
