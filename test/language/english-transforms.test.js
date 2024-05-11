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
        valid: true,
        tests: [
            {term: 'cat', source: 'cats',  rule: 'ns', reasons: ['plural']},
            {term: 'cat', source: 'cat\'s',  rule: 'ns', reasons: ['possessive']},
            {term: 'cats', source: 'cats\'',  rule: 'ns', reasons: ['possessive']},
            {term: 'dirt', source: 'dirty',  rule: 'ns', reasons: ['-y']},
            {term: 'haze', source: 'hazy',  rule: 'ns', reasons: ['-y']},
            {term: 'bag', source: 'baggy',  rule: 'ns', reasons: ['-y']},
            {term: 'scum', source: 'scummy',  rule: 'ns', reasons: ['-y']},
            {term: 'run', source: 'runny',  rule: 'ns', reasons: ['-y']},
            {term: 'slip', source: 'slippy',  rule: 'ns', reasons: ['-y']},
            {term: 'star', source: 'starry',  rule: 'ns', reasons: ['-y']},
            {term: 'gas', source: 'gassy',  rule: 'ns', reasons: ['-y']},
            {term: 'wit', source: 'witty',  rule: 'ns', reasons: ['-y']}
        ]
    },
    {
        category: 'verbs',
        valid: true,
        tests: [
            {term: 'walk', source: 'walked',  rule: 'v', reasons: ['past']},
            {term: 'walk', source: 'going to walk',  rule: 'v', reasons: ['going-to future']},
            {term: 'walk', source: 'will walk',  rule: 'v', reasons: ['will future']},
            {term: 'walk', source: 'don\'t walk',  rule: 'v', reasons: ['imperative negative']},
            {term: 'walk', source: 'do not walk',  rule: 'v', reasons: ['imperative negative']},
            {term: 'hope', source: 'hoped',  rule: 'v', reasons: ['past']},
            {term: 'try', source: 'tried',  rule: 'v', reasons: ['past']},
            {term: 'frolic', source: 'frolicked',  rule: 'v', reasons: ['past']},
            {term: 'rub', source: 'rubbed',  rule: 'v', reasons: ['past']},
            {term: 'bid', source: 'bidded',  rule: 'v', reasons: ['past']},
            {term: 'rig', source: 'rigged',  rule: 'v', reasons: ['past']},
            {term: 'yak', source: 'yakked',  rule: 'v', reasons: ['past']},
            {term: 'dial', source: 'dialled',  rule: 'v', reasons: ['past']},
            {term: 'skim', source: 'skimmed',  rule: 'v', reasons: ['past']},
            {term: 'bin', source: 'binned',  rule: 'v', reasons: ['past']},
            {term: 'rip', source: 'ripped',  rule: 'v', reasons: ['past']},
            {term: 'star', source: 'starred',  rule: 'v', reasons: ['past']},
            {term: 'bus', source: 'bussed',  rule: 'v', reasons: ['past']},
            {term: 'pit', source: 'pitted',  rule: 'v', reasons: ['past']},
            {term: 'quiz', source: 'quizzed',  rule: 'v', reasons: ['past']},
            {term: 'lay', source: 'laid',  rule: 'v', reasons: ['past']},
            {term: 'pay', source: 'paid',  rule: 'v', reasons: ['past']},
            {term: 'say', source: 'said',  rule: 'v', reasons: ['past']},
            {term: 'adorn', source: 'adorn\'d',  rule: 'v', reasons: ['past', 'archaic']},
            {term: 'walk', source: 'walking',  rule: 'v', reasons: ['ing']},
            {term: 'drive', source: 'driving',  rule: 'v', reasons: ['ing']},
            {term: 'lie', source: 'lying',  rule: 'v', reasons: ['ing']},
            {term: 'panic', source: 'panicking',  rule: 'v', reasons: ['ing']},
            {term: 'rub', source: 'rubbing',  rule: 'v', reasons: ['ing']},
            {term: 'bid', source: 'bidding',  rule: 'v', reasons: ['ing']},
            {term: 'rig', source: 'rigging',  rule: 'v', reasons: ['ing']},
            {term: 'yak', source: 'yakking',  rule: 'v', reasons: ['ing']},
            {term: 'dial', source: 'dialling',  rule: 'v', reasons: ['ing']},
            {term: 'skim', source: 'skimming',  rule: 'v', reasons: ['ing']},
            {term: 'bin', source: 'binning',  rule: 'v', reasons: ['ing']},
            {term: 'rip', source: 'ripping',  rule: 'v', reasons: ['ing']},
            {term: 'star', source: 'starring',  rule: 'v', reasons: ['ing']},
            {term: 'bus', source: 'bussing',  rule: 'v', reasons: ['ing']},
            {term: 'pit', source: 'pitting',  rule: 'v', reasons: ['ing']},
            {term: 'quiz', source: 'quizzing',  rule: 'v', reasons: ['ing']},
            {term: 'run', source: 'runnin\'',  rule: 'v', reasons: ['ing', 'dropped g']},
            {term: 'walk', source: 'walks',  rule: 'v', reasons: ['3rd pers. sing. pres']},
            {term: 'teach', source: 'teaches',  rule: 'v', reasons: ['3rd pers. sing. pres']},
            {term: 'try', source: 'tries',  rule: 'v', reasons: ['3rd pers. sing. pres']},
            {term: 'push', source: 'pushy',  rule: 'v', reasons: ['-y']},
            {term: 'groove', source: 'groovy',  rule: 'v', reasons: ['-y']},
            {term: 'sag', source: 'saggy',  rule: 'v', reasons: ['-y']},
            {term: 'swim', source: 'swimmy',  rule: 'v', reasons: ['-y']},
            {term: 'slip', source: 'slippy',  rule: 'v', reasons: ['-y']},
            {term: 'blur', source: 'blurry',  rule: 'v', reasons: ['-y']},
            {term: 'chat', source: 'chatty',  rule: 'v', reasons: ['-y']},
            {term: 'learn', source: 'unlearn',  rule: 'v', reasons: ['un-']}
        ]
    },
    {
        category: 'phrasal verbs',
        valid: true,
        tests: [
            {term: 'look up', source: 'look something up',  rule: 'v_phr', reasons: ['interposed object']},
            {term: 'look up', source: 'looking up',  rule: 'v_phr', reasons: ['ing']},
            {term: 'look up', source: 'looked up',  rule: 'v_phr', reasons: ['past']},
            {term: 'look up', source: 'looks up',  rule: 'v_phr', reasons: ['3rd pers. sing. pres']},
            {term: 'look up', source: 'looked something up',  rule: 'v_phr', reasons: ['past', 'interposed object']}
        ]
    },
    {
        category: 'adverbs',
        valid: true,
        tests: [
            {term: 'interestingly', source: 'uninterestingly',  rule: 'adj', reasons: ['un-']}
        ]
    },
    {
        category: 'adjectives',
        valid: true,
        tests: [
            {term: 'funny', source: 'unfunny',  rule: 'adj', reasons: ['un-']},
            {term: 'cool', source: 'cooler',  rule: 'adj', reasons: ['comparative']},
            {term: 'subtle', source: 'subtler',  rule: 'adj', reasons: ['comparative']},
            {term: 'funny', source: 'funnier',  rule: 'adj', reasons: ['comparative']},
            {term: 'drab', source: 'drabber',  rule: 'adj', reasons: ['comparative']},
            {term: 'mad', source: 'madder',  rule: 'adj', reasons: ['comparative']},
            {term: 'big', source: 'bigger',  rule: 'adj', reasons: ['comparative']},
            {term: 'dim', source: 'dimmer',  rule: 'adj', reasons: ['comparative']},
            {term: 'tan', source: 'tanner',  rule: 'adj', reasons: ['comparative']},
            {term: 'hot', source: 'hotter',  rule: 'adj', reasons: ['comparative']},
            {term: 'cool', source: 'coolest',  rule: 'adj', reasons: ['superlative']},
            {term: 'subtle', source: 'subtlest',  rule: 'adj', reasons: ['superlative']},
            {term: 'funny', source: 'funniest',  rule: 'adj', reasons: ['superlative']},
            {term: 'drab', source: 'drabbest',  rule: 'adj', reasons: ['superlative']},
            {term: 'mad', source: 'maddest',  rule: 'adj', reasons: ['superlative']},
            {term: 'big', source: 'biggest',  rule: 'adj', reasons: ['superlative']},
            {term: 'dim', source: 'dimmest',  rule: 'adj', reasons: ['superlative']},
            {term: 'tan', source: 'tannest',  rule: 'adj', reasons: ['superlative']},
            {term: 'hot', source: 'hottest',  rule: 'adj', reasons: ['superlative']},
            {term: 'quick', source: 'quickly',  rule: 'adj', reasons: ['adverb']},
            {term: 'happy', source: 'happily',  rule: 'adj', reasons: ['adverb']},
            {term: 'humble', source: 'humbly',  rule: 'adj', reasons: ['adverb']}
        ]
    }
];
/* eslint-enable @stylistic/no-multi-spaces */

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(englishTransforms);
testLanguageTransformer(languageTransformer, tests);
