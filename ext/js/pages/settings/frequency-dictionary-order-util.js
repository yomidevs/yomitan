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

/** @type {Record<string, string[]>} */
const moreCommonTerms = {
    ja: ['来る', '言う', '出る', '入る', '方', '男', '女', '今', '何', '時'],
};

/** @type {Record<string, string[]>} */
const lessCommonTerms = {
    ja: ['行なう', '論じる', '過す', '行方', '人口', '猫', '犬', '滝', '理', '暁'],
};

/**
 * @param {import('dictionary-importer').Summary[]} dictionaries
 * @returns {string[]}
 */
export function getTermFrequencyDictionaryTitles(dictionaries) {
    const results = [];
    for (const {title, counts} of dictionaries) {
        if (counts && counts.termMeta && counts.termMeta.freq > 0) {
            results.push(title);
        }
    }
    return results;
}

/**
 * @param {import('../../comm/api.js').API} api
 * @param {string} dictionary
 * @returns {Promise<?import('settings').SortFrequencyDictionaryOrder>}
 */
export async function getFrequencyDictionaryOrder(api, dictionary) {
    const dictionaryInfo = await api.getDictionaryInfo();
    const dictionaryLang = dictionaryInfo.find(({title}) => title === dictionary)?.sourceLanguage ?? '';

    const {
        moreCommonTerms: langMoreCommonTerms,
        lessCommonTerms: langLessCommonTerms,
    } = getFrequencyDictionaryComparisonTerms(dictionaryLang);
    const terms = [...langMoreCommonTerms, ...langLessCommonTerms];
    if (terms.length === 0) { return null; }

    const frequencies = await api.getTermFrequencies(
        terms.map((term) => ({term, reading: null})),
        [dictionary],
    );

    /** @type {Map<string, {hasValue: boolean, minValue: number, maxValue: number}>} */
    const termDetails = new Map();
    const moreCommonTermDetails = [];
    const lessCommonTermDetails = [];
    for (const term of langMoreCommonTerms) {
        const details = {hasValue: false, minValue: Number.MAX_SAFE_INTEGER, maxValue: Number.MIN_SAFE_INTEGER};
        termDetails.set(term, details);
        moreCommonTermDetails.push(details);
    }
    for (const term of langLessCommonTerms) {
        const details = {hasValue: false, minValue: Number.MAX_SAFE_INTEGER, maxValue: Number.MIN_SAFE_INTEGER};
        termDetails.set(term, details);
        lessCommonTermDetails.push(details);
    }

    for (const {term, frequency} of frequencies) {
        const details = termDetails.get(term);
        if (typeof details === 'undefined') { continue; }
        details.minValue = Math.min(details.minValue, frequency);
        details.maxValue = Math.max(details.maxValue, frequency);
        details.hasValue = true;
    }

    let result = 0;
    for (const details1 of moreCommonTermDetails) {
        if (!details1.hasValue) { continue; }
        for (const details2 of lessCommonTermDetails) {
            if (!details2.hasValue) { continue; }
            result += Math.sign(details1.maxValue - details2.minValue) + Math.sign(details1.minValue - details2.maxValue);
        }
    }

    switch (Math.sign(result)) {
        case -1: return 'ascending';
        case 1: return 'descending';
        default: return null;
    }
}

/**
 * @param {string} dictionaryLanguage
 * @returns {{moreCommonTerms: string[], lessCommonTerms: string[]}}
 */
function getFrequencyDictionaryComparisonTerms(dictionaryLanguage) {
    let langMoreCommonTerms = moreCommonTerms[dictionaryLanguage];
    let langLessCommonTerms = lessCommonTerms[dictionaryLanguage];
    if (dictionaryLanguage === '') {
        langMoreCommonTerms = [];
        for (const key in moreCommonTerms) {
            if (Object.hasOwn(moreCommonTerms, key)) {
                langMoreCommonTerms.push(...moreCommonTerms[key]);
            }
        }
        langLessCommonTerms = [];
        for (const key in lessCommonTerms) {
            if (Object.hasOwn(lessCommonTerms, key)) {
                langLessCommonTerms.push(...lessCommonTerms[key]);
            }
        }
    }

    return {
        moreCommonTerms: langMoreCommonTerms ?? [],
        lessCommonTerms: langLessCommonTerms ?? [],
    };
}
