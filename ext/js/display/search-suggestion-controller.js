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
import {convertToKana} from '../language/ja/japanese-wanakana.js';
import {isStringEntirelyKana} from '../language/ja/japanese.js';

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
            //console.log('Rendering suggestions:', suggestions);
            this._suggestionsList.innerHTML = '';
            const suggestionArray = Array.isArray(suggestions) ? suggestions : await suggestions;

            // Don't hide suggestions if we already have some displayed and the new suggestions are empty
            if (suggestionArray.length === 0) {
                const currentSuggestions = this._suggestionsList.children.length;
                if (currentSuggestions > 0) {
                    console.log('Ignoring empty suggestions since we already have', currentSuggestions, 'suggestions displayed');
                    return;
                }
                console.log('No suggestions to display - suggestions array:', suggestions);
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
            console.log('Successfully rendered suggestions, list display:', this._suggestionsList.style.display);
        } catch (e) {
            console.error('Error rendering suggestions:', e);
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
            // Check if search suggestions are enabled
            const options = this._display.getOptions();
            if (!options || !options.general.enableSearchSuggestions) {
                return [];
            }

            // Use Yomitan's existing conversion logic (same as _onSearchInput)
            let searchInput = input;
            if (options.general.language === 'ja' && options.general.enableWanakana) {
                // Use the same conversion as the search input handler
                searchInput = convertToKana(input);
            }

            console.log('Getting suggestions for:', searchInput);
            /** @type {Map<string, {term: string, score: number, dictionaryIndex: number}>} */
            const suggestions = new Map();

            // If input is empty, return most recent/popular words
            if (searchInput.length === 0) {
                return await this._getPopularSuggestions(options);
            }

            console.log(this._trie.size())

            // 1. Try trie with the converted input (same logic as database)
            const trieSuggestions = this._trie.getSuggestions(searchInput);

            // If input is hiragana, also check for kanji equivalents
            if (isStringEntirelyKana(searchInput) && this._readingToKanji.has(searchInput)) {
                const kanjiSet = this._readingToKanji.get(searchInput);
                if (kanjiSet) {
                    for (const kanji of kanjiSet) {
                        trieSuggestions.push(kanji);
                    }
                }
            }

            if (trieSuggestions.length >= 10) {
                console.log("returning trie suggestions.")

                // ALWAYS apply hiragana→kanji mapping, regardless of frequency settings
                if (isStringEntirelyKana(searchInput) && this._readingToKanji.has(searchInput)) {
                    const kanjiSet = this._readingToKanji.get(searchInput);
                    if (kanjiSet) {
                        for (const kanji of kanjiSet) {
                            trieSuggestions.push(kanji);
                        }
                    }
                }

                const frequencyDictionary = options.general.sortFrequencyDictionary;
                if (frequencyDictionary) {
                    const sortedSuggestions = await this._sortSuggestionsWithFrequency(trieSuggestions, searchInput, options, 'trie');
                    console.log("heres tries suggestions", sortedSuggestions)
                    const uniqueSuggestions = [...new Set(sortedSuggestions)].slice(0, 10);
                    return uniqueSuggestions;
                } else {
                    // Even without frequency dictionary, sort by exact matches and length
                    const result = trieSuggestions.sort((a, b) => {
                        // Prioritize exact matches
                        const isExactMatchA = a === searchInput;
                        const isExactMatchB = b === searchInput;
                        if (isExactMatchA && !isExactMatchB) return -1;
                        if (!isExactMatchA && isExactMatchB) return 1;

                        // Then by length
                        return a.length - b.length;
                    });
                    console.log('No frequency dictionary, returning trie suggestions:', result);
                    const uniqueResult = [...new Set(result)].slice(0, 10);
                    return uniqueResult;
                }
            }

            console.log("not enough trie, going to db:", trieSuggestions)

            // 2. Search the dictionary with the SAME converted input
            if (searchInput.length > 0) {
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
                        const entries = await this._dictionaryDatabase.findTermsBulk([searchInput], new Set(dictionaryMap.keys()), 'prefix');
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

                            // Store both term and reading in trie for future matching
                            this._termScores.set(entry.term, entry.score);
                            this._trie.insert(entry.term);

                            // Also store the reading if it exists and is different
                            if (entry.reading && entry.reading !== entry.term) {
                                this._trie.insert(entry.reading);
                                this._termScores.set(entry.reading, entry.score);

                                // Map reading to kanji
                                if (!this._readingToKanji.has(entry.reading)) {
                                    this._readingToKanji.set(entry.reading, new Set());
                                }
                                const kanjiSet = this._readingToKanji.get(entry.reading);
                                if (kanjiSet) {
                                    kanjiSet.add(entry.term);
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Error fetching real-time suggestions:', e);
                        return [];
                    }
                }
            }

            // Sort by score (descending) and dictionary index (ascending)
            const result = await this._sortSuggestionsByScore(suggestions);

            // Apply frequency sorting if enabled
            const frequencyDictionary = options.general.sortFrequencyDictionary;
            if (frequencyDictionary && result.length > 0) {
                return await this._sortSuggestionsWithFrequency(result, input, options, 'database');
            }
            // Return the result if no frequency sorting is needed
            const uniqueResult = [...new Set(result)].slice(0, 10);
            return uniqueResult;
        } catch (error) {
            console.error('Error in getSuggestions:', error);
            // Graceful fallback: return empty array so normal search still works
            return [];
        }
    }

    /**
     * Gets popular/most recent suggestions when input is empty.
     * @param {import('settings').ProfileOptions} options The profile options.
     * @returns {Promise<string[]>} Array of popular suggestions.
     */
    async _getPopularSuggestions(options) {
        // Return terms with highest user frequency first
        const popularTerms = [...this._userFrequency.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([term]) => term)
            .slice(0, 10);

        // // If we don't have enough user frequency data, add some common terms
        // if (popularTerms.length < 10) {
        //     const commonTerms = ['日本', '日本語', '英語', '中国語', '韓国語', 'フランス語', 'ドイツ語', 'スペイン語', 'イタリア語', 'ロシア語'];
        //     for (const term of commonTerms) {
        //         if (!popularTerms.includes(term)) {
        //             popularTerms.push(term);
        //         }
        //         if (popularTerms.length >= 10) break;
        //     }
        // }

        return popularTerms;
    }

    /**
     * Sorts suggestions by score and dictionary index.
     * @param {Map<string, {term: string, score: number, dictionaryIndex: number}>} suggestions The suggestions map.
     * @returns {Promise<string[]>} Array of sorted terms.
     */
    async _sortSuggestionsByScore(suggestions) {
        const options = this._display.getOptions();
        const frequencyDictionary = options?.general.sortFrequencyDictionary;

        // Get frequency data if available
        let frequencyMap = new Map();
        if (frequencyDictionary) {
            try {
                // Replace line 304 with:
                const termReadingList = [...suggestions.keys()].map(term => ({term, reading: null}));
                const frequencies = await this._display.application.api.getTermFrequencies(termReadingList, [frequencyDictionary]);
                for (const freq of frequencies) {
                    frequencyMap.set(freq.term, freq.frequency);
                }
            } catch (e) {
                console.warn('Failed to get frequency data for score sorting:', e);
            }
        }

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
            .slice(0, 10);
    }

    /**
     * Sorts suggestions with frequency data.
     * @param {string[]} suggestions The suggestions to sort.
     * @param {string} input The input text.
     * @param {import('settings').ProfileOptions} options The profile options.
     * @param {string} source The source of suggestions ('trie' or 'database').
     * @returns {Promise<string[]>} Array of sorted suggestions.
     */
    async _sortSuggestionsWithFrequency(suggestions, input, options, source) {
        const frequencyDictionary = options.general.sortFrequencyDictionary;
        if (!frequencyDictionary) {
            return suggestions;
        }

        try {
            const termReadingList = suggestions.map(term => ({term, reading: null}));
            const frequencies = await this._display.application.api.getTermFrequencies(termReadingList, [frequencyDictionary]);

            // Create frequency map
            const frequencyMap = new Map();
            for (const freq of frequencies) {
                frequencyMap.set(freq.term, freq.frequency);
            }

            // Sort with frequency data
            console.log('Frequency dictionary:', frequencyDictionary);
            console.log('Original suggestions count:', suggestions.length);
            console.log('Term reading list:', termReadingList);
            console.log('Frequencies returned:', frequencies);
            console.log('Frequency map:', frequencyMap);
            console.log('Final sorted suggestions:', suggestions);
            return suggestions.sort((a, b) => this._compareSuggestions(a, b, input, frequencyMap, source));
        } catch (e) {
            console.warn(`Failed to get frequency data for ${source} suggestions:`, e);
            return suggestions;
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

    /**
     * Compares two suggestions for sorting.
     * @param {string} a First suggestion.
     * @param {string} b Second suggestion.
     * @param {string} input The input text.
     * @param {Map<string, number>} frequencyMap The frequency map.
     * @param {string} source The source of suggestions.
     * @returns {number} Comparison result.
     */
    _compareSuggestions(a, b, input, frequencyMap, source) {
        const freqA = frequencyMap.get(a) || 0;
        const freqB = frequencyMap.get(b) || 0;
        const userFreqA = this._userFrequency.get(a) || 0;
        const userFreqB = this._userFrequency.get(b) || 0;
        const scoreA = this._termScores.get(a) || 0;
        const scoreB = this._termScores.get(b) || 0;

        // 1. Prioritize exact matches (like Yomitan does)
        const isExactMatchA = a === input;
        const isExactMatchB = b === input;
        if (isExactMatchA && !isExactMatchB) return -1;
        if (!isExactMatchA && isExactMatchB) return 1;

        // 2. Prioritize shorter terms (like Yomitan does)
        const lengthDiff = a.length - b.length;
        if (lengthDiff !== 0) return lengthDiff;

        // 3. Use Yomitan's weighting: frequency + score + user frequency
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
}
