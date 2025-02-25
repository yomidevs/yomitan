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

import {EventDispatcher} from '../core/event-dispatcher.js';

/**
 * @typedef {Object} SimilarWordsEvents
 * @property {{term: string, reading?: string, similarWords: import('dictionary').SimilarWord[]}} similarWordsUpdated
 */

/**
 * Generates and manages similar word content for dictionary entries
 * @extends {EventDispatcher<SimilarWordsEvents>}
 */
export class SimilarWordsGenerator extends EventDispatcher {
    /**
     * Creates a new instance of SimilarWordsGenerator
     * @param {import('../pages/settings/settings-controller').SettingsController} settingsController
     */
    constructor(settingsController) {
        super();
        this._settingsController = settingsController;
    }

    /**
     * Generates structured content for similar words synchronously
     * @param {import('dictionary').SimilarWord[]} similarWords
     * @param {string} term - The term to find similar words for
     * @param {string} [reading] - Optional reading of the term
     * @returns {import('structured-content').Content}
     */
    createSimilarWordsContent(similarWords, term, reading) {
        // Create initial content with existing similar words
        if (Array.isArray(similarWords) && similarWords.length > 0) {
            return this._createSimilarWordsBox(similarWords);
        }

        // Create empty state content
        const emptyContent = this._createEmptyState();

        // Trigger async update if we have term/reading
        if (term) {
            this._updateSimilarWordsAsync(term, reading);
        }

        return emptyContent;
    }

    /**
     * Updates similar words asynchronously
     * @private
     * @param {string} term
     * @param {string} [reading]
     */
    async _updateSimilarWordsAsync(term, reading) {
        try {
            const newWords = await this._getSimilarWordsFromOpenAI(term, reading);
            if (newWords && newWords.length > 0) {
                // Emit event with the new similar words
                this.trigger('similarWordsUpdated', {
                    term,
                    reading,
                    similarWords: newWords
                });
            }
        } catch (error) {
            console.error('Failed to fetch similar words:', error);
        }
    }

    /**
     * Creates the similar words box with content
     * @private
     * @param {import('dictionary').SimilarWord[]} similarWords
     * @returns {import('structured-content').Content}
     */
    _createSimilarWordsBox(similarWords) {
        return {
            tag: 'div',
            data: {
                class: 'similar-words-container'
            },
            content: [
                {
                    tag: 'div',
                    style: {
                        fontWeight: "bold"
                    },
                    content: "Related words"
                },
                {
                    tag: 'div',
                    content: similarWords.map((word) => this._createSimilarWordEntry(word))
                }
            ]
        };
    }

    /**
     * Creates empty state content
     * @private
     * @returns {import('structured-content').Content}
     */
    _createEmptyState() {
        return {
            tag: 'div',
            data: {
                class: 'similar-words-container'
            },
            content: [
                {
                    tag: 'div',
                    style: {
                        fontWeight: "bold"
                    },
                    content: "Related words"
                },
                {
                    tag: 'div',
                    style: {
                        color: '#666666',
                        fontStyle: 'italic'
                    },
                    content: 'No related words found'
                }
            ]
        };
    }

    /**
     * Gets similar words from OpenAI API
     * @private
     * @param {string} term - The term to find similar words for
     * @param {string} [reading] - Optional reading of the term
     * @returns {Promise<import('dictionary').SimilarWord[]>}
     */
    async _getSimilarWordsFromOpenAI(term, reading) {
        const options = await this._settingsController.getOptions();
        const apiKey = options.openAi?.apiKey;
        const model = options.openAi?.model || 'gpt-4o-mini';

        if (!apiKey) {
            return [];
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a Japanese language expert that returns related words in a structured format.'
                        },
                        {
                            role: 'user',
                            content: `Find similar Japanese words for: ${term}${reading ? ` (reading: ${reading})` : ''}`
                        }
                    ],
                    functions: [
                        {
                            name: 'return_similar_words',
                            description: 'Return a list of similar Japanese words with their readings and similarity scores',
                            parameters: {
                                type: 'object',
                                properties: {
                                    similar_words: {
                                        type: 'array',
                                        description: 'List of related words',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                term: {
                                                    type: 'string',
                                                    description: 'The related word in Japanese'
                                                },
                                                reading: {
                                                    type: 'string',
                                                    description: 'The reading of the word in hiragana (optional)'
                                                },
                                                similarity: {
                                                    type: 'number',
                                                    description: 'Relatedness score between 0 and 1'
                                                },
                                                type: {
                                                    type: 'string',
                                                    description: 'Type of relationship',
                                                    enum: ['synonym', 'antonym', 'related']
                                                }
                                            },
                                            required: ['term', 'similarity', 'type']
                                        }
                                    }
                                },
                                required: ['similar_words']
                            }
                        }
                    ],
                    function_call: { name: 'return_similar_words' }
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Extract function call arguments
            const functionCall = data.choices[0]?.message?.function_call;
            if (!functionCall || functionCall.name !== 'return_similar_words') {
                throw new Error('Invalid function call in response');
            }

            // Parse the arguments JSON string
            const { similar_words } = JSON.parse(functionCall.arguments);

            // Validate the response matches our expected format
            if (!Array.isArray(similar_words)) {
                throw new Error('Invalid response format from OpenAI');
            }

            return similar_words;
        } catch (error) {
            console.error('OpenAI API call failed:', error);
            return [];
        }
    }

    /**
     * Creates a structured content entry for a single similar word
     * @private
     * @param {import('dictionary').SimilarWord} word
     * @returns {import('structured-content').StyledElement}
     */
    _createSimilarWordEntry(word) {
        const { term, reading, type, similarity } = word;

        /** @type {Array<import('structured-content').Content>} */
        const content = [];

        // Add type indicator as a tag-like element
        content.push({
            tag: 'span',
            data: {
                type: type,
                role: 'type-indicator'
            },
            style: {
                color: this._getTypeColor(type),
                marginRight: '0.5em',
                fontSize: '0.85em'
            },
            content: this._getTypeLabel(type)
        });

        // Add term with optional reading in a gloss-content-like structure
        if (reading && reading !== term) {
            content.push({
                tag: 'ruby',
                content: [
                    term,
                    {
                        tag: 'rt',
                        content: reading
                    }
                ]
            });
        } else {
            content.push({
                tag: 'span',
                content: term
            });
        }

        // Add similarity score as a subtle indicator
        content.push({
            tag: 'span',
            style: {
                color: '#666666',
                fontSize: '0.85em',
                marginLeft: '0.5em'
            },
            content: `(${Math.round(similarity * 100)}%)`
        });

        return {
            tag: 'div',
            data: {
                role: 'similar-word-entry'
            },
            style: {
                marginBottom: '0.4em'
            },
            content
        };
    }

    /**
     * Gets the display color for a similarity type
     * @private
     * @param {string} type
     * @returns {string}
     */
    _getTypeColor(type) {
        switch (type) {
            case 'synonym': return '#4CAF50';
            case 'antonym': return '#F44336';
            case 'related': return '#2196F3';
            default: return '#757575';
        }
    }

    /**
     * Gets the display label for a similarity type
     * @private
     * @param {string} type
     * @returns {string}
     */
    _getTypeLabel(type) {
        switch (type) {
            case 'synonym': return 'SYN';
            case 'antonym': return 'ANT';
            case 'related': return 'REL';
            default: return '?';
        }
    }
}