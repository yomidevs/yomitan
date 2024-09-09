/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

export type RecommendedDictionaries = {
    [key: string]: LanguageRecommendedDictionaries;
};

export type LanguageRecommendedDictionaries = {
    frequency: RecommendedDictionary[];
    grammar: RecommendedDictionary[];
    kanji: RecommendedDictionary[];
    pronunciation: RecommendedDictionary[];
    terms: RecommendedDictionary[];
};

export type RecommendedDictionary = {
    description: string;
    downloadUrl: string;
    homepage?: string;
    name: string;
};

export type RecommendedDictionariesTest = {
    recommendedDictionaries: RecommendedDictionaries;
    type: 'recommendedDictionaries';
};

export type RecommendedDictionaryElementMap = {
    element: HTMLElement;
    property: 'frequency' | 'grammar' | 'kanji' | 'pronunciation' | 'terms';
};
