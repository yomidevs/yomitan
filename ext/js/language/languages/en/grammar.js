/*
 * Copyright (C) 2016-2022  Yomichan Authors
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

import {fetchAsset} from '../../../general/helpers.js';
import {infixInflection, prefixInflection, suffixInflection, wholeWordInflection} from '../../deinflection-ruleset.js';

export async function getDeinflectionReasons(){
    const pastSuffixInflections = [
        suffixInflection('ed', '', [], ['v']), // 'walked'
        suffixInflection('ed', 'e', [], ['v']), // 'hoped'
        suffixInflection('ied', 'y', [], ['v']), // 'tried'
        suffixInflection('cked', 'c', [], ['v']), // 'frolicked'
        ...doubledConsonantInflection('bdgklmnprstz', 'ed', [], ['v']),

        suffixInflection('laid', 'lay', [], ['v']),
        suffixInflection('paid', 'pay', [], ['v']),
        suffixInflection('said', 'say', [], ['v'])
    ];

    const ingSuffixInflections = [
        suffixInflection('ing', '', [], ['v']),
        suffixInflection('ing', 'e', [], ['v']), // 'driving', but false positive singe for 'singing'
        suffixInflection('ing', 'y', [], ['v']),
        suffixInflection('ying', 'ie', [], ['v']), // 'lying'
        suffixInflection('cking', 'c', [], ['v']), // 'frolicking'
        ...doubledConsonantInflection('bdgklmnprstz', 'ing', [], ['v'])
    ];

    const thirdPersonSgPresentSuffixInflections = [
        suffixInflection('s', '', ['v'], ['v']),
        suffixInflection('es', '', ['v'], ['v']),
        suffixInflection('ies', 'y', ['v'], ['v'])
    ];

    function doubledConsonantInflection(consonants, suffix, inTypes, outTypes){
        return consonants.split('').map((consonant) => suffixInflection(`${consonant}${consonant}${suffix}`, consonant, inTypes, outTypes));
    }

    async function createIrregularVerbInflections(){
        const verbs = {
            'past': [],
            'participle': []
        };

        const irregularVerbs = JSON.parse(await fetchAsset('/js/language/languages/en/irregular-verbs.json'));
        for (const [verb, inflections] of Object.entries(irregularVerbs)){
            for (const [past, participle] of inflections){
                if (past !== verb) { verbs.past.push(suffixInflection(past, verb, ['v'], ['v'])); }
                if (participle !== verb) { verbs.participle.push(suffixInflection(participle, verb, ['v'], ['v'])); }
            }
        }

        return verbs;
    }

    const irregularVerbInflections = createIrregularVerbInflections();

    async function createPhrasalVerbInflections(){
        const phrasalVerbParticles = JSON.parse(await fetchAsset('/js/language/languages/en/phrasal-verb-particles.json'));
        const particlesDisjunction = phrasalVerbParticles.join('|');

        const phrasalVerbPrepositions = JSON.parse(await fetchAsset('/js/language/languages/en/phrasal-verb-prepositions.json'));

        const combinedSet = new Set([...phrasalVerbParticles, ...phrasalVerbPrepositions]);
        const combinedDisjunction = Array.from(combinedSet).join('|');

        function createPhrasalVerbInflection(inflected, deinflected){
            return {
                inflected: new RegExp(`^\\w*${inflected} (?:${combinedDisjunction})`),
                uninflect: (term) => {
                    return term.replace(new RegExp(`(?<=)${inflected}(?= (?:${combinedDisjunction}))`), deinflected);
                },
                rulesIn: [],
                rulesOut: ['v']
            };
        }

        function createPhrasalVerbInflectionsFromRules(sourceRules){
            return sourceRules.map(({inflected, deinflected}) => {
                const inflectedSuffix = inflected.source.replace('.*', '').replace('$', '');
                const deinflectedSuffix = deinflected;

                return createPhrasalVerbInflection(inflectedSuffix, deinflectedSuffix);
            });
        }

        return {
            'past': createPhrasalVerbInflectionsFromRules(pastSuffixInflections),
            'past (irregular)': createPhrasalVerbInflectionsFromRules((await irregularVerbInflections).past),
            '-ing': createPhrasalVerbInflectionsFromRules(ingSuffixInflections),
            '3 sg present': createPhrasalVerbInflectionsFromRules(thirdPersonSgPresentSuffixInflections),
            'interposed object': [
                {
                    inflected: new RegExp(`^\\w* (?:(?!\\b(${combinedDisjunction})\\b).)+ (?:${particlesDisjunction})`),
                    uninflect: (term) => {
                        return term.replace(new RegExp(`(?<=\\w) (?:(?!\\b(${combinedDisjunction})\\b).)+ (?=(?:${particlesDisjunction}))`), ' ');
                    },
                    rulesIn: [],
                    rulesOut: ['v']
                }
            ]
        };
    }

    const phrasalVerbInflections = createPhrasalVerbInflections();

    const mainModalVerbs = ['can', 'could', 'may', 'might', 'shall', 'should', 'will', 'would', 'must'];

    function createModalVerbNegations(){
        return mainModalVerbs.map((modalVerb) => prefixInflection(`${modalVerb} not`, modalVerb, ['v'], ['v']));
    }

    const reasons = new Map([
        ['interposed object', [
            ...(await phrasalVerbInflections)['interposed object']
        ]],
        ['plural', [
            // regular and near-regular plurals
            suffixInflection('s', '', ['n'], ['n']),
            suffixInflection('es', '', ['n'], ['n']),
            suffixInflection('ies', 'y', ['n'], ['n']),
            suffixInflection('ves', 'fe', ['n'], ['n']),
            suffixInflection('ves', 'f', ['n'], ['n']),

            // irregular plurals (-en)
            suffixInflection('children', 'child', ['n'], ['n']),
            suffixInflection('oxen', 'ox', ['n'], ['n']),

            // irregular plurals (apophonic plurals)
            suffixInflection('feet', 'foot', ['n'], ['n']),
            suffixInflection('geese', 'goose', ['n'], ['n']),
            suffixInflection('lice', 'louse', ['n'], ['n']),
            suffixInflection('mice', 'mouse', ['n'], ['n']),
            suffixInflection('men', 'man', ['n'], ['n']),
            suffixInflection('teeth', 'tooth', ['n'], ['n'])

            // TODO:
            // latin plurals ('indices' -> 'index') (also other languages),
            // compound nouns ('passers-by' -> 'passer-by'),
            // ...
        ]],
        ['possessive', [
            suffixInflection('\'s', '', ['n'], ['n']),
            suffixInflection('s\'', 's', ['n'], ['n']),

            wholeWordInflection('my', 'I', ['pn'], ['pn']),
            wholeWordInflection('your', 'you', ['pn'], ['pn']),
            wholeWordInflection('his', 'he', ['pn'], ['pn']),
            wholeWordInflection('her', 'she', ['pn'], ['pn']),
            wholeWordInflection('its', 'it', ['pn'], ['pn']),
            wholeWordInflection('our', 'we', ['pn'], ['pn']),
            wholeWordInflection('their', 'they', ['pn'], ['pn']),
            wholeWordInflection('whose', 'who', ['pn'], ['pn'])
        ]],
        ['accusative', [
            wholeWordInflection('me', 'I', ['pn'], ['pn']),
            wholeWordInflection('him', 'he', ['pn'], ['pn']),
            wholeWordInflection('her', 'she', ['pn'], ['pn']),
            wholeWordInflection('us', 'we', ['pn'], ['pn']),
            wholeWordInflection('them', 'they', ['pn'], ['pn']),
            wholeWordInflection('thee', 'thou', ['pn'], ['pn'])
        ]],
        ['past', [
            ...pastSuffixInflections,
            ...(await phrasalVerbInflections).past
        ]],
        ['past (irregular)', [
            prefixInflection('was', 'am', [], ['v']),
            prefixInflection('was', 'is', [], ['v']),
            prefixInflection('were', 'are', [], ['v']),
            prefixInflection('could', 'can', [], ['v']),

            ...(await irregularVerbInflections).past,
            ...(await phrasalVerbInflections)['past (irregular)']
        ]],
        ['-ing', [
            ...ingSuffixInflections,
            ...(await phrasalVerbInflections)['-ing']
        ]],
        ['archaic', [ // should probably be removed
            wholeWordInflection('thou', 'you', ['pn'], ['pn']),
            wholeWordInflection('thy', 'your', ['pn'], ['pn']),
            wholeWordInflection('thine', 'your', ['pn'], ['pn']),
            wholeWordInflection('ye', 'you', ['pn'], ['pn']),
            wholeWordInflection('thyself', 'yourself', ['pn'], ['pn'])
        ]],
        [['first-person', 'singular', 'present'], [
            wholeWordInflection('am', 'be', ['v'], ['v'])
        ]],
        [['third-person', 'singular', 'present'], [
            wholeWordInflection('is', 'be', ['v'], ['v']),
            wholeWordInflection('has', 'have', ['v'], ['v']),
            ...thirdPersonSgPresentSuffixInflections,
            ...(await phrasalVerbInflections)['3 sg present']
        ]],
        ['participle', [
            ...(await irregularVerbInflections).participle
        ]],
        ['contraction', [
            wholeWordInflection("'m", 'am', [], ['v']),
            wholeWordInflection("'re", 'are', [], ['v']),
            wholeWordInflection("'ve", 'have', [], ['v']),
            prefixInflection("'ll", 'will', [], ['v']),
            wholeWordInflection("'d", 'would', [], ['v']),
            wholeWordInflection("'d", 'had', [], ['v']),
            wholeWordInflection("'d", 'did', [], ['v']),
            wholeWordInflection("'s", 'is', [], ['v']),
            wholeWordInflection("'s", 'has', [], ['v']),
            wholeWordInflection("'em", 'them', [], ['pn']),
            prefixInflection('gonna', 'going to', [], ['pn']),
            prefixInflection('whatcha', 'what are you', [], []),
            wholeWordInflection("c'mon", 'come on', [], []),
            wholeWordInflection('gimme', 'give me', [], []),
            wholeWordInflection('gotta', 'got to', [], []),
            wholeWordInflection('lemme', 'let me', [], []),
            wholeWordInflection('wanna', 'want to', [], []),
            infixInflection("n't", ' not', [], []),
            prefixInflection("won't", 'will not', [], []),
            prefixInflection("can't", 'can not', [], [])
        ]],
        ['adverb', [
            suffixInflection('ly', '', [], ['adj'])
        ]],
        ['comparative', [
            suffixInflection('er', 'e', [], ['adj']),
            suffixInflection('er', '', [], ['adj']),
            suffixInflection('ier', 'y', [], ['adj']),

            ...doubledConsonantInflection('bdgmnt', 'er', [], ['adj']),

            wholeWordInflection('better', 'good', [], ['adj']),
            wholeWordInflection('worse', 'bad', [], ['adj']),
            wholeWordInflection('farther', 'far', [], ['adj']),
            wholeWordInflection('further', 'far', [], ['adj'])

        ]],
        ['superlative', [
            suffixInflection('est', 'e', [], ['adj']),
            suffixInflection('est', '', [], ['adj']),
            suffixInflection('iest', 'y', [], ['adj']),

            ...doubledConsonantInflection('bdgmnt', 'est', [], ['adj']),

            wholeWordInflection('best', 'good', [], ['adj']),
            wholeWordInflection('worst', 'bad', [], ['adj']),
            wholeWordInflection('farthest', 'far', [], ['adj']),
            wholeWordInflection('furthest', 'far', [], ['adj'])
        ]],
        ['dropped g', [
            suffixInflection('in\'', 'ing', [], ['v'])
        ]],
        ['-y', [
            suffixInflection('y', '', [], ['n', 'v']), // dirty
            ...doubledConsonantInflection('glmnprst', 'y', [], ['n', 'v'])
        ]],
        ['un-', [
            prefixInflection('un', '', [], ['adj', 'v'])
        ]],
        ['going-to future', [
            prefixInflection('going to ', '', [], ['v'])
        ]],
        ['will future', [
            prefixInflection('will ', '', [], ['v'])
        ]],
        ['negative', [
            ...createModalVerbNegations(),
            prefixInflection('does not ', ' ', [], []),
            wholeWordInflection('does not', 'does', [], [])
        ]],
        [['imperative', 'negative'], [
            prefixInflection('do not ', '', [], [])
        ]]
    ]);

    return reasons;
}
