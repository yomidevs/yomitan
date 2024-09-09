/*
 * Copyright (C) 2024  Yomitan Authors
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

import {prefixInflection, suffixInflection} from '../language-transforms.js';

/** @typedef {keyof typeof conditions} Condition */

/**
 * @param {string} consonants
 * @param {string} suffix
 * @param {Condition[]} conditionsIn
 * @param {Condition[]} conditionsOut
 * @returns {import('language-transformer').SuffixRule<Condition>[]}
 */
function doubledConsonantInflection(consonants, suffix, conditionsIn, conditionsOut) {
    const inflections = [];
    for (const consonant of consonants) {
        inflections.push(suffixInflection(`${consonant}${consonant}${suffix}`, consonant, conditionsIn, conditionsOut));
    }
    return inflections;
}

const pastSuffixInflections = [
    suffixInflection('ed', '', ['v'], ['v']), // 'walked'
    suffixInflection('ed', 'e', ['v'], ['v']), // 'hoped'
    suffixInflection('ied', 'y', ['v'], ['v']), // 'tried'
    suffixInflection('cked', 'c', ['v'], ['v']), // 'frolicked'
    ...doubledConsonantInflection('bdgklmnprstz', 'ed', ['v'], ['v']),

    suffixInflection('laid', 'lay', ['v'], ['v']),
    suffixInflection('paid', 'pay', ['v'], ['v']),
    suffixInflection('said', 'say', ['v'], ['v']),
];

const ingSuffixInflections = [
    suffixInflection('ing', '', ['v'], ['v']), // 'walking'
    suffixInflection('ing', 'e', ['v'], ['v']), // 'driving'
    suffixInflection('ying', 'ie', ['v'], ['v']), // 'lying'
    suffixInflection('cking', 'c', ['v'], ['v']), // 'panicking'
    ...doubledConsonantInflection('bdgklmnprstz', 'ing', ['v'], ['v']),
];

const thirdPersonSgPresentSuffixInflections = [
    suffixInflection('s', '', ['v'], ['v']), // 'walks'
    suffixInflection('es', '', ['v'], ['v']), // 'teaches'
    suffixInflection('ies', 'y', ['v'], ['v']), // 'tries'
];

const phrasalVerbParticles = ['aboard', 'about', 'above', 'across', 'ahead', 'alongside', 'apart', 'around', 'aside', 'astray', 'away', 'back', 'before', 'behind', 'below', 'beneath', 'besides', 'between', 'beyond', 'by', 'close', 'down', 'east', 'west', 'north', 'south', 'eastward', 'westward', 'northward', 'southward', 'forward', 'backward', 'backwards', 'forwards', 'home', 'in', 'inside', 'instead', 'near', 'off', 'on', 'opposite', 'out', 'outside', 'over', 'overhead', 'past', 'round', 'since', 'through', 'throughout', 'together', 'under', 'underneath', 'up', 'within', 'without'];
const phrasalVerbPrepositions = ['aback', 'about', 'above', 'across', 'after', 'against', 'ahead', 'along', 'among', 'apart', 'around', 'as', 'aside', 'at', 'away', 'back', 'before', 'behind', 'below', 'between', 'beyond', 'by', 'down', 'even', 'for', 'forth', 'forward', 'from', 'in', 'into', 'of', 'off', 'on', 'onto', 'open', 'out', 'over', 'past', 'round', 'through', 'to', 'together', 'toward', 'towards', 'under', 'up', 'upon', 'way', 'with', 'without'];

const particlesDisjunction = phrasalVerbParticles.join('|');
const phrasalVerbWordSet = new Set([...phrasalVerbParticles, ...phrasalVerbPrepositions]);
const phrasalVerbWordDisjunction = [...phrasalVerbWordSet].join('|');
/**
 * @type {import('language-transformer').Rule<Condition>}
 */
const phrasalVerbInterposedObjectRule = {
    conditionsIn: [],
    conditionsOut: ['v_phr'],
    deinflect: (term) => {
        return term.replace(new RegExp(`(?<=\\w) (?:(?!\\b(${phrasalVerbWordDisjunction})\\b).)+ (?=(?:${particlesDisjunction}))`), ' ');
    },
    isInflected: new RegExp(`^\\w* (?:(?!\\b(${phrasalVerbWordDisjunction})\\b).)+ (?:${particlesDisjunction})`),
    type: 'other',
};

/**
 * @param {string} inflected
 * @param {string} deinflected
 * @returns {import('language-transformer').Rule<Condition>}
 */
function createPhrasalVerbInflection(inflected, deinflected) {
    return {
        conditionsIn: ['v'],
        conditionsOut: ['v_phr'],
        deinflect: (term) => {
            return term.replace(new RegExp(`(?<=)${inflected}(?= (?:${phrasalVerbWordDisjunction}))`), deinflected);
        },
        isInflected: new RegExp(`^\\w*${inflected} (?:${phrasalVerbWordDisjunction})`),
        type: 'other',
    };
}

/**
 * @param {import('language-transformer').SuffixRule<Condition>[]} sourceRules
 * @returns {import('language-transformer').Rule<Condition>[]}
 */
function createPhrasalVerbInflectionsFromSuffixInflections(sourceRules) {
    return sourceRules.flatMap(({deinflected, isInflected}) => {
        if (typeof deinflected === 'undefined') { return []; }
        const inflectedSuffix = isInflected.source.replace('$', '');
        const deinflectedSuffix = deinflected;
        return [createPhrasalVerbInflection(inflectedSuffix, deinflectedSuffix)];
    });
}

const conditions = {
    adj: {
        isDictionaryForm: true,
        name: 'Adjective',
    },
    adv: {
        isDictionaryForm: true,
        name: 'Adverb',
    },
    n: {
        isDictionaryForm: true,
        name: 'Noun',
        subConditions: ['np', 'ns'],
    },
    np: {
        isDictionaryForm: true,
        name: 'Noun plural',
    },
    ns: {
        isDictionaryForm: true,
        name: 'Noun singular',
    },
    v: {
        isDictionaryForm: true,
        name: 'Verb',
        subConditions: ['v_phr'],
    },
    v_phr: {
        isDictionaryForm: true,
        name: 'Phrasal verb',
    },
};

/** @type {import('language-transformer').LanguageTransformDescriptor<Condition>} */
export const englishTransforms = {
    conditions,
    language: 'en',
    transforms: {
        '-able': {
            description: 'Adjective formed from a verb',
            name: '-able',
            rules: [
                suffixInflection('able', '', ['v'], ['adj']),
                suffixInflection('able', 'e', ['v'], ['adj']),
                suffixInflection('iable', 'y', ['v'], ['adj']),
                ...doubledConsonantInflection('bdgklmnprstz', 'able', ['v'], ['adj']),
            ],
        },
        '-y': {
            description: 'Adjective formed from a verb or noun',
            name: '-y',
            rules: [
                suffixInflection('y', '', ['adj'], ['n', 'v']), // 'dirty', 'pushy'
                suffixInflection('y', 'e', ['adj'], ['n', 'v']), // 'hazy'
                ...doubledConsonantInflection('glmnprst', 'y', [], ['n', 'v']), // 'baggy', 'saggy'
            ],
        },
        '3rd pers. sing. pres': {
            description: 'Third person singular present tense of a verb',
            name: '3rd pers. sing. pres',
            rules: [
                ...thirdPersonSgPresentSuffixInflections,
                ...createPhrasalVerbInflectionsFromSuffixInflections(thirdPersonSgPresentSuffixInflections),
            ],
        },
        'adverb': {
            description: 'Adverb form of an adjective',
            name: 'adverb',
            rules: [
                suffixInflection('ly', '', ['adv'], ['adj']), // 'quickly'
                suffixInflection('ily', 'y', ['adv'], ['adj']), // 'happily'
                suffixInflection('ly', 'le', ['adv'], ['adj']), // 'humbly'
            ],
        },
        'archaic': {
            description: 'Archaic form of a word',
            name: 'archaic',
            rules: [
                suffixInflection('\'d', 'ed', ['v'], ['v']),
            ],
        },
        'comparative': {
            description: 'Comparative form of an adjective',
            name: 'comparative',
            rules: [
                suffixInflection('er', '', ['adj'], ['adj']), // 'faster'
                suffixInflection('er', 'e', ['adj'], ['adj']), // 'nicer'
                suffixInflection('ier', 'y', ['adj'], ['adj']), // 'happier'
                ...doubledConsonantInflection('bdgmnt', 'er', ['adj'], ['adj']),
            ],
        },
        'dropped g': {
            description: 'Dropped g in -ing form of a verb',
            name: 'dropped g',
            rules: [
                suffixInflection('in\'', 'ing', ['v'], ['v']),
            ],
        },
        'going-to future': {
            description: 'Going-to future tense of a verb',
            name: 'going-to future',
            rules: [
                prefixInflection('going to ', '', ['v'], ['v']),
            ],
        },
        'imperative negative': {
            description: 'Negative imperative form of a verb',
            name: 'imperative negative',
            rules: [
                prefixInflection('don\'t ', '', ['v'], ['v']),
                prefixInflection('do not ', '', ['v'], ['v']),
            ],
        },
        'ing': {
            description: 'Present participle of a verb',
            name: 'ing',
            rules: [
                ...ingSuffixInflections,
                ...createPhrasalVerbInflectionsFromSuffixInflections(ingSuffixInflections),
            ],
        },
        'interposed object': {
            description: 'Phrasal verb with interposed object',
            name: 'interposed object',
            rules: [
                phrasalVerbInterposedObjectRule,
            ],
        },
        'past': {
            description: 'Simple past tense of a verb',
            name: 'past',
            rules: [
                ...pastSuffixInflections,
                ...createPhrasalVerbInflectionsFromSuffixInflections(pastSuffixInflections),
            ],
        },
        'plural': {
            description: 'Plural form of a noun',
            name: 'plural',
            rules: [
                suffixInflection('s', '', ['np'], ['ns']),
                suffixInflection('es', '', ['np'], ['ns']),
                suffixInflection('ies', 'y', ['np'], ['ns']),
                suffixInflection('ves', 'fe', ['np'], ['ns']),
                suffixInflection('ves', 'f', ['np'], ['ns']),
            ],
        },
        'possessive': {
            description: 'Possessive form of a noun',
            name: 'possessive',
            rules: [
                suffixInflection('\'s', '', ['n'], ['n']),
                suffixInflection('s\'', 's', ['n'], ['n']),
            ],
        },
        'superlative': {
            description: 'Superlative form of an adjective',
            name: 'superlative',
            rules: [
                suffixInflection('est', '', ['adj'], ['adj']), // 'fastest'
                suffixInflection('est', 'e', ['adj'], ['adj']), // 'nicest'
                suffixInflection('iest', 'y', ['adj'], ['adj']), // 'happiest'
                ...doubledConsonantInflection('bdgmnt', 'est', ['adj'], ['adj']),
            ],
        },
        'un-': {
            description: 'Negative form of an adjective, adverb, or verb',
            name: 'un-',
            rules: [
                prefixInflection('un', '', ['adj', 'adv', 'v'], ['adj', 'adv', 'v']),
            ],
        },
        'will future': {
            description: 'Will-future tense of a verb',
            name: 'will future',
            rules: [
                prefixInflection('will ', '', ['v'], ['v']),
            ],
        },
    },
};
