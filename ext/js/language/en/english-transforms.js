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

/**
 * @param {string} consonants
 * @param {string} suffix
 * @param {string[]} conditionsIn
 * @param {string[]} conditionsOut
 * @returns {import('language-transformer').SuffixRule[]}
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
const phrasalVerbPrepositions = ['aback', 'about', 'above', 'across', 'after', 'against', 'ahead', 'along', 'among', 'apart', 'around', 'as', 'aside', 'at', 'away', 'back', 'before', 'behind', 'below', 'between', 'beyond', 'by', 'down', 'even', 'for', 'forth', 'forward', 'from', 'in', 'into', 'it', 'of', 'off', 'on', 'one', 'onto', 'open', 'out', 'over', 'past', 'round', 'through', 'to', 'together', 'toward', 'towards', 'under', 'up', 'upon', 'way', 'with', 'without'];

const particlesDisjunction = phrasalVerbParticles.join('|');
const phrasalVerbWordSet = new Set([...phrasalVerbParticles, ...phrasalVerbPrepositions]);
const phrasalVerbWordDisjunction = [...phrasalVerbWordSet].join('|');
/** @type {import('language-transformer').Rule} */
const phrasalVerbInterposedObjectRule = {
    type: 'other',
    isInflected: new RegExp(`^\\w* (?:(?!\\b(${phrasalVerbWordDisjunction})\\b).)+ (?:${particlesDisjunction})`),
    deinflect: (term) => {
        return term.replace(new RegExp(`(?<=\\w) (?:(?!\\b(${phrasalVerbWordDisjunction})\\b).)+ (?=(?:${particlesDisjunction}))`), ' ');
    },
    conditionsIn: [],
    conditionsOut: ['v_phr'],
};

/**
 * @param {string} inflected
 * @param {string} deinflected
 * @returns {import('language-transformer').Rule}
 */
function createPhrasalVerbInflection(inflected, deinflected) {
    return {
        type: 'other',
        isInflected: new RegExp(`^\\w*${inflected} (?:${phrasalVerbWordDisjunction})`),
        deinflect: (term) => {
            return term.replace(new RegExp(`(?<=)${inflected}(?= (?:${phrasalVerbWordDisjunction}))`), deinflected);
        },
        conditionsIn: ['v_phr'],
        conditionsOut: ['v_phr'],
    };
}

/**
 * @param {import('language-transformer').SuffixRule[]} sourceRules
 * @returns {import('language-transformer').Rule[]}
 */
function createPhrasalVerbInflectionsFromSuffixInflections(sourceRules) {
    return sourceRules.flatMap(({isInflected, deinflected}) => {
        if (typeof deinflected === 'undefined') { return []; }
        const inflectedSuffix = isInflected.source.replace('$', '');
        const deinflectedSuffix = deinflected;
        return [createPhrasalVerbInflection(inflectedSuffix, deinflectedSuffix)];
    });
}

/** @type {import('language-transformer').LanguageTransformDescriptor} */
export const englishTransforms = {
    language: 'en',
    conditions: {
        v_any: {
            name: 'Verb',
            isDictionaryForm: false,
            subConditions: ['v', 'v_irr', 'v_phr'],
        },
        v: {
            name: 'Regular verb',
            isDictionaryForm: true,
        },
        v_irr: {
            name: 'Irregular verb',
            isDictionaryForm: true,
        },
        v_phr: {
            name: 'Phrasal verb',
            isDictionaryForm: true,
        },
        n: {
            name: 'Noun',
            isDictionaryForm: true,
            subConditions: ['np', 'ns'],
        },
        np: {
            name: 'Noun plural',
            isDictionaryForm: true,
        },
        ns: {
            name: 'Noun singular',
            isDictionaryForm: true,
        },
        adj: {
            name: 'Adjective',
            isDictionaryForm: true,
        },
        adv: {
            name: 'Adverb',
            isDictionaryForm: true,
        },
    },
    transforms: {
        'plural': {
            name: 'plural',
            description: 'Plural form of a noun',
            rules: [
                suffixInflection('s', '', ['np'], ['ns']),
                suffixInflection('es', '', ['np'], ['ns']),
                suffixInflection('ies', 'y', ['np'], ['ns']),
                suffixInflection('ves', 'fe', ['np'], ['ns']),
                suffixInflection('ves', 'f', ['np'], ['ns']),
            ],
        },
        'possessive': {
            name: 'possessive',
            description: 'Possessive form of a noun',
            rules: [
                suffixInflection('\'s', '', ['n'], ['n']),
                suffixInflection('s\'', 's', ['n'], ['n']),
            ],
        },
        'past': {
            name: 'past',
            description: 'Simple past tense of a verb',
            rules: [
                ...pastSuffixInflections,
                ...createPhrasalVerbInflectionsFromSuffixInflections(pastSuffixInflections),
            ],
        },
        'ing': {
            name: 'ing',
            description: 'Present participle of a verb',
            rules: [
                ...ingSuffixInflections,
                ...createPhrasalVerbInflectionsFromSuffixInflections(ingSuffixInflections),
            ],
        },
        '3rd pers. sing. pres': {
            name: '3rd pers. sing. pres',
            description: 'Third person singular present tense of a verb',
            rules: [
                ...thirdPersonSgPresentSuffixInflections,
                ...createPhrasalVerbInflectionsFromSuffixInflections(thirdPersonSgPresentSuffixInflections),
            ],
        },
        'interposed object': {
            name: 'interposed object',
            description: 'Phrasal verb with interposed object',
            rules: [
                phrasalVerbInterposedObjectRule,
            ],
        },
        'archaic': {
            name: 'archaic',
            description: 'Archaic form of a word',
            rules: [
                suffixInflection('\'d', 'ed', ['v'], ['v']),
            ],
        },
        'adverb': {
            name: 'adverb',
            description: 'Adverb form of an adjective',
            rules: [
                suffixInflection('ly', '', ['adv'], ['adj']), // 'quickly'
                suffixInflection('ily', 'y', ['adv'], ['adj']), // 'happily'
                suffixInflection('ly', 'le', ['adv'], ['adj']), // 'humbly'
            ],
        },
        'comparative': {
            name: 'comparative',
            description: 'Comparative form of an adjective',
            rules: [
                suffixInflection('er', '', ['adj'], ['adj']), // 'faster'
                suffixInflection('er', 'e', ['adj'], ['adj']), // 'nicer'
                suffixInflection('ier', 'y', ['adj'], ['adj']), // 'happier'
                ...doubledConsonantInflection('bdgmnt', 'er', ['adj'], ['adj']),
            ],
        },
        'superlative': {
            name: 'superlative',
            description: 'Superlative form of an adjective',
            rules: [
                suffixInflection('est', '', ['adj'], ['adj']), // 'fastest'
                suffixInflection('est', 'e', ['adj'], ['adj']), // 'nicest'
                suffixInflection('iest', 'y', ['adj'], ['adj']), // 'happiest'
                ...doubledConsonantInflection('bdgmnt', 'est', ['adj'], ['adj']),
            ],
        },
        'dropped g': {
            name: 'dropped g',
            description: 'Dropped g in -ing form of a verb',
            rules: [
                suffixInflection('in\'', 'ing', ['v'], ['v']),
            ],
        },
        '-y': {
            name: '-y',
            description: 'Adjective formed from a verb or noun',
            rules: [
                suffixInflection('y', '', ['adj'], ['n', 'v']), // 'dirty', 'pushy'
                suffixInflection('y', 'e', ['adj'], ['n', 'v']), // 'hazy'
                ...doubledConsonantInflection('glmnprst', 'y', [], ['n', 'v']), // 'baggy', 'saggy'
            ],
        },
        'un-': {
            name: 'un-',
            description: 'Negative form of an adjective, adverb, or verb',
            rules: [
                prefixInflection('un', '', ['adj', 'adv', 'v'], ['adj', 'adv', 'v']),
            ],
        },
        'going-to future': {
            name: 'going-to future',
            description: 'Going-to future tense of a verb',
            rules: [
                prefixInflection('going to ', '', ['v'], ['v']),
            ],
        },
        'will future': {
            name: 'will future',
            description: 'Will-future tense of a verb',
            rules: [
                prefixInflection('will ', '', ['v'], ['v']),
            ],
        },
        'imperative negative': {
            name: 'imperative negative',
            description: 'Negative imperative form of a verb',
            rules: [
                prefixInflection('don\'t ', '', ['v'], ['v']),
                prefixInflection('do not ', '', ['v'], ['v']),
            ],
        },
    },
};
