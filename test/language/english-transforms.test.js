/*
 * Copyright (C) 2023-2024  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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

import {englishTransforms} from '../../ext/js/language/en/english-transforms.js';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

/* eslint-disable @stylistic/no-multi-spaces */
const tests = [
    {
        category: 'nouns',
        tests: [
            {reasons: ['plural'], rule: 'ns',  source: 'cats', term: 'cat'},
            {reasons: ['possessive'], rule: 'ns',  source: 'cat\'s', term: 'cat'},
            {reasons: ['plural', 'possessive'], rule: 'ns',  source: 'cats\'', term: 'cat'},
            {reasons: ['possessive'], rule: 'ns',  source: 'cats\'', term: 'cats'},
            {reasons: ['-y'], rule: 'ns',  source: 'dirty', term: 'dirt'},
            {reasons: ['-y'], rule: 'ns',  source: 'hazy', term: 'haze'},
            {reasons: ['-y'], rule: 'ns',  source: 'baggy', term: 'bag'},
            {reasons: ['-y'], rule: 'ns',  source: 'scummy', term: 'scum'},
            {reasons: ['-y'], rule: 'ns',  source: 'runny', term: 'run'},
            {reasons: ['-y'], rule: 'ns',  source: 'slippy', term: 'slip'},
            {reasons: ['-y'], rule: 'ns',  source: 'starry', term: 'star'},
            {reasons: ['-y'], rule: 'ns',  source: 'gassy', term: 'gas'},
            {reasons: ['-y'], rule: 'ns',  source: 'witty', term: 'wit'},
        ],
        valid: true,
    },
    {
        category: 'verbs',
        tests: [
            {reasons: ['past'], rule: 'v',  source: 'walked', term: 'walk'},
            {reasons: ['going-to future'], rule: 'v',  source: 'going to walk', term: 'walk'},
            {reasons: ['will future'], rule: 'v',  source: 'will walk', term: 'walk'},
            {reasons: ['imperative negative'], rule: 'v',  source: 'don\'t walk', term: 'walk'},
            {reasons: ['imperative negative'], rule: 'v',  source: 'do not walk', term: 'walk'},
            {reasons: ['past'], rule: 'v',  source: 'hoped', term: 'hope'},
            {reasons: ['past'], rule: 'v',  source: 'tried', term: 'try'},
            {reasons: ['past'], rule: 'v',  source: 'frolicked', term: 'frolic'},
            {reasons: ['past'], rule: 'v',  source: 'rubbed', term: 'rub'},
            {reasons: ['past'], rule: 'v',  source: 'bidded', term: 'bid'},
            {reasons: ['past'], rule: 'v',  source: 'rigged', term: 'rig'},
            {reasons: ['past'], rule: 'v',  source: 'yakked', term: 'yak'},
            {reasons: ['past'], rule: 'v',  source: 'dialled', term: 'dial'},
            {reasons: ['past'], rule: 'v',  source: 'skimmed', term: 'skim'},
            {reasons: ['past'], rule: 'v',  source: 'binned', term: 'bin'},
            {reasons: ['past'], rule: 'v',  source: 'ripped', term: 'rip'},
            {reasons: ['past'], rule: 'v',  source: 'starred', term: 'star'},
            {reasons: ['past'], rule: 'v',  source: 'bussed', term: 'bus'},
            {reasons: ['past'], rule: 'v',  source: 'pitted', term: 'pit'},
            {reasons: ['past'], rule: 'v',  source: 'quizzed', term: 'quiz'},
            {reasons: ['past'], rule: 'v',  source: 'laid', term: 'lay'},
            {reasons: ['past'], rule: 'v',  source: 'paid', term: 'pay'},
            {reasons: ['past'], rule: 'v',  source: 'said', term: 'say'},
            {reasons: ['past', 'archaic'], rule: 'v',  source: 'adorn\'d', term: 'adorn'},
            {reasons: ['ing'], rule: 'v',  source: 'walking', term: 'walk'},
            {reasons: ['ing'], rule: 'v',  source: 'driving', term: 'drive'},
            {reasons: ['ing'], rule: 'v',  source: 'lying', term: 'lie'},
            {reasons: ['ing'], rule: 'v',  source: 'panicking', term: 'panic'},
            {reasons: ['ing'], rule: 'v',  source: 'rubbing', term: 'rub'},
            {reasons: ['ing'], rule: 'v',  source: 'bidding', term: 'bid'},
            {reasons: ['ing'], rule: 'v',  source: 'rigging', term: 'rig'},
            {reasons: ['ing'], rule: 'v',  source: 'yakking', term: 'yak'},
            {reasons: ['ing'], rule: 'v',  source: 'dialling', term: 'dial'},
            {reasons: ['ing'], rule: 'v',  source: 'skimming', term: 'skim'},
            {reasons: ['ing'], rule: 'v',  source: 'binning', term: 'bin'},
            {reasons: ['ing'], rule: 'v',  source: 'ripping', term: 'rip'},
            {reasons: ['ing'], rule: 'v',  source: 'starring', term: 'star'},
            {reasons: ['ing'], rule: 'v',  source: 'bussing', term: 'bus'},
            {reasons: ['ing'], rule: 'v',  source: 'pitting', term: 'pit'},
            {reasons: ['ing'], rule: 'v',  source: 'quizzing', term: 'quiz'},
            {reasons: ['ing', 'dropped g'], rule: 'v',  source: 'runnin\'', term: 'run'},
            {reasons: ['3rd pers. sing. pres'], rule: 'v',  source: 'walks', term: 'walk'},
            {reasons: ['3rd pers. sing. pres'], rule: 'v',  source: 'teaches', term: 'teach'},
            {reasons: ['3rd pers. sing. pres'], rule: 'v',  source: 'tries', term: 'try'},
            {reasons: ['-y'], rule: 'v',  source: 'pushy', term: 'push'},
            {reasons: ['-y'], rule: 'v',  source: 'groovy', term: 'groove'},
            {reasons: ['-y'], rule: 'v',  source: 'saggy', term: 'sag'},
            {reasons: ['-y'], rule: 'v',  source: 'swimmy', term: 'swim'},
            {reasons: ['-y'], rule: 'v',  source: 'slippy', term: 'slip'},
            {reasons: ['-y'], rule: 'v',  source: 'blurry', term: 'blur'},
            {reasons: ['-y'], rule: 'v',  source: 'chatty', term: 'chat'},
            {reasons: ['un-'], rule: 'v',  source: 'unlearn', term: 'learn'},
        ],
        valid: true,
    },
    {
        category: 'phrasal verbs',
        tests: [
            {reasons: ['interposed object'], rule: 'v_phr',  source: 'look something up', term: 'look up'},
            {reasons: ['interposed object'], rule: 'v_phr',  source: 'look it up', term: 'look up'},
            {reasons: ['interposed object'], rule: 'v_phr',  source: 'look one up', term: 'look up'},
            {reasons: ['ing'], rule: 'v_phr',  source: 'looking up', term: 'look up'},
            {reasons: ['past'], rule: 'v_phr',  source: 'looked up', term: 'look up'},
            {reasons: ['3rd pers. sing. pres'], rule: 'v_phr',  source: 'looks up', term: 'look up'},
            {reasons: ['past', 'interposed object'], rule: 'v_phr',  source: 'looked something up', term: 'look up'},
        ],
        valid: true,
    },
    {
        category: 'adverbs',
        tests: [
            {reasons: ['un-'], rule: 'adj',  source: 'uninterestingly', term: 'interestingly'},
        ],
        valid: true,
    },
    {
        category: 'adjectives',
        tests: [
            {reasons: ['un-'], rule: 'adj',  source: 'unfunny', term: 'funny'},
            {reasons: ['comparative'], rule: 'adj',  source: 'cooler', term: 'cool'},
            {reasons: ['comparative'], rule: 'adj',  source: 'subtler', term: 'subtle'},
            {reasons: ['comparative'], rule: 'adj',  source: 'funnier', term: 'funny'},
            {reasons: ['comparative'], rule: 'adj',  source: 'drabber', term: 'drab'},
            {reasons: ['comparative'], rule: 'adj',  source: 'madder', term: 'mad'},
            {reasons: ['comparative'], rule: 'adj',  source: 'bigger', term: 'big'},
            {reasons: ['comparative'], rule: 'adj',  source: 'dimmer', term: 'dim'},
            {reasons: ['comparative'], rule: 'adj',  source: 'tanner', term: 'tan'},
            {reasons: ['comparative'], rule: 'adj',  source: 'hotter', term: 'hot'},
            {reasons: ['superlative'], rule: 'adj',  source: 'coolest', term: 'cool'},
            {reasons: ['superlative'], rule: 'adj',  source: 'subtlest', term: 'subtle'},
            {reasons: ['superlative'], rule: 'adj',  source: 'funniest', term: 'funny'},
            {reasons: ['superlative'], rule: 'adj',  source: 'drabbest', term: 'drab'},
            {reasons: ['superlative'], rule: 'adj',  source: 'maddest', term: 'mad'},
            {reasons: ['superlative'], rule: 'adj',  source: 'biggest', term: 'big'},
            {reasons: ['superlative'], rule: 'adj',  source: 'dimmest', term: 'dim'},
            {reasons: ['superlative'], rule: 'adj',  source: 'tannest', term: 'tan'},
            {reasons: ['superlative'], rule: 'adj',  source: 'hottest', term: 'hot'},
            {reasons: ['adverb'], rule: 'adj',  source: 'quickly', term: 'quick'},
            {reasons: ['adverb'], rule: 'adj',  source: 'happily', term: 'happy'},
            {reasons: ['adverb'], rule: 'adj',  source: 'humbly', term: 'humble'},
        ],
        valid: true,
    },
    {
        category: 'invalid deinflections',
        tests: [
            {reasons: ['plural', 'plural'], rule: 'ns', source: 'bo', term: 'boss'},
            {reasons: ['-able'], rule: 'adj', source: 'stable', term: 'sta'},
        ],
        valid: false,
    },

    {
        category: '-able',
        tests: [
            {reasons: ['un-', '-able'], rule: 'adj', source: 'unforgettable', term: 'forget'},
            {reasons: ['-able'], rule: 'adj', source: 'forgettable', term: 'forget'},
            {reasons: ['-able'], rule: 'adj', source: 'likeable', term: 'like'},
            {reasons: ['-able'], rule: 'adj', source: 'doable', term: 'do'},
            {reasons: ['-able'], rule: 'adj', source: 'desirable', term: 'desire'},
            {reasons: ['-able'], rule: 'adj', source: 'reliable', term: 'rely'},
            {reasons: ['-able'], rule: 'adj', source: 'movable', term: 'move'},
            {reasons: ['-able'], rule: 'adj', source: 'adorable', term: 'adore'},
            {reasons: ['-able'], rule: 'adj', source: 'carriable', term: 'carry'},
        ],
        valid: true,
    },
];
/* eslint-enable @stylistic/no-multi-spaces */

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(englishTransforms);
testLanguageTransformer(languageTransformer, tests);
