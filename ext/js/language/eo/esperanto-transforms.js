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

const conditions = {
    n: {
        name: 'Noun',
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
    v: {
        name: 'Verb',
        isDictionaryForm: true,
    },
};

/** @type {import('language-transformer').LanguageTransformDescriptor<keyof typeof conditions>} */
export const esperantoTransforms = {
    language: 'eo',
    conditions,
    transforms: {
        // general inflections
        'accusative': {
            name: 'accusative',
            description: 'Accusative form of a word',
            rules: [
                suffixInflection('n', '', [], []),
            ],
        },
        'plural': {
            name: 'plural',
            description: 'Plural form of a word',
            rules: [
                suffixInflection('j', '', [], []),
            ],
        },
        'diminutive': {
            name: 'diminutive',
            description: 'Diminutive form of a noun',
            rules: [
                suffixInflection('eto', 'o', [], ['n']),
            ],
        },
        'directional': {
            name: 'directional',
            description: [
                'An adverb in accusative case indicates direction',
                'kie: where',
                'kien: to where',
            ].join('\n'),
            rules: [
                suffixInflection('en', 'e', [], ['adv']),
            ],
        },
        'locational': {
            name: 'locational',
            description: [
                'A noun becoming an adverb indicates location',
                'surpinto : peak, tip, top',
                'surpinte: at the peak, at the tip, at the top',
                'ĉambro : room',
                'ĉambre: at the room, in the room',
            ].join('\n'),
            rules: [
                suffixInflection('e', 'o', [], ['n']),
            ],
        },
        'adjectival': {
            name: 'adjectival',
            description: 'Adjectival form of a noun',
            rules: [
                suffixInflection('a', 'o', [], ['n']),
            ],
        },
        'adverbial (adj -> adv)': {
            name: 'adverbial',
            description: 'Adverbial form of an adjective',
            rules: [
                suffixInflection('e', 'a', [], ['adj']),
            ],
        },
        'adverbial (v -> adv)': {
            name: 'adverbial',
            description: 'Adverbial form of a verb',
            rules: [
                suffixInflection('e', 'i', [], ['v']),
            ],
        },
        // suffixes
        '-ejo (noun)': {
            name: '-ejo',
            description: [
                'Suffix which turns a word into a place designed for that specific thing',
                'kafo: coffee',
                'kafejo: café',
            ].join('\n'),
            rules: [
                suffixInflection('ejo', 'o', [], ['n']),
            ],
        },
        '-ejo (verb)': {
            name: '-ejo',
            description: [
                'Suffix which turns a word into a place designed for that specific action',
                'kuiri: to cook',
                'kuirejo: kitchen',
            ].join('\n'),
            rules: [
                suffixInflection('ejo', 'i', [], ['v']),
            ],
        },
        '-ujo (noun)': {
            name: '-ujo',
            description: [
                'Suffix which turns a word into a box or container for that specific thing',
                'abelo: a bee',
                'abelujo: a beehive',
                '',
                'Suffix which turns a word into a place where a type of people can be found',
                'patro: father',
                'patrujo: fatherland',
                '',
                'Suffix which turns a flower or fruit into a plant or tree which the flower or fruit can be found in',
                'pomo: an apple',
                'pomujo: an apple tree',
            ].join('\n'),
            rules: [
                suffixInflection('ujo', 'o', [], ['n']),
            ],
        },
        '-ujo (adjective)': {
            name: '-ujo',
            description: [
                'Suffix which turns a descriptive word into a box or container for that specific type of thing',
                'frida: cold',
                'fridujo: a refrigerator',
            ].join('\n'),
            rules: [
                suffixInflection('ujo', 'a', [], ['adj']),
            ],
        },
        '-ujo (verb)': {
            name: '-ujo',
            description: [
                'Suffix which turns an action into a box or container for that specific type of activity',
                'lavi: to wash',
                'lavujo: a sink',
            ].join('\n'),
            rules: [
                suffixInflection('ujo', 'i', [], ['v']),
            ],
        },
        '-ebla': {
            name: '-ebla',
            description: [
                'Suffix which shows possibility',
                'kompreni: to understand',
                'komprenebla: understandable',
            ].join('\n'),
            rules: [
                suffixInflection('ebla', 'i', [], ['v']),
            ],
        },
        '-ado': {
            name: '-ado',
            description: [
                'Suffix which turns an action into a thing representing the action',
                'vivi: to live',
                'vivado: life',
                'spiri: to breathe',
                'spirado: respiration',
            ].join('\n'),
            rules: [
                suffixInflection('ado', 'i', [], ['v']),
            ],
        },
        // prefixes
        'mal-': {
            name: 'mal-',
            description: 'Prefix which turns an action, description, thing, or direction into its opposite meaning',
            rules: [
                prefixInflection('mal', '', [], []),
            ],
        },
        'kun-': {
            name: 'kun-',
            description: [
                'Prefix meaning to do the action together with other people',
                'labori: to work',
                'kunlabori: to collaborate',
            ].join('\n'),
            rules: [
                prefixInflection('kun', '', [], []),
            ],
        },
        'ekster-': {
            name: 'ekster-',
            description: [
                'Prefix meaning "outside of"',
                'lando: country',
                'eksterlando: foreign country',
            ].join('\n'),
            rules: [
                prefixInflection('ekster', '', [], []),
            ],
        },
        'ek-': {
            name: 'ek-',
            description: [
                'Prefix meaning to begin the action',
                'kanti: to sing',
                'ekkanti: to begin to sing',
            ].join('\n'),
            rules: [
                prefixInflection('ek', '', [], []),
            ],
        },
        'ĵus-': {
            name: 'ĵus-',
            description: [
                'Prefix meaning something is newly or recently done',
                'vekita: awakened',
                'ĵusvekita: newly/recently awakened',
            ].join('\n'),
            rules: [
                prefixInflection('ĵus', '', [], []),
            ],
        },
        'el-': {
            name: 'el-',
            description: [
                'Prefix meaning to do the action in an outward direction',
                'tiri: to pull',
                'eltiri: to pull out',
                '',
                'Prefix meaning to do the action all the way to completion',
                'trinki: to drink',
                'eltrinki: to drink up, to drink all of something',
                'lerni: to learn',
                'ellerni: to learn all that you can, to master',
                'uzi: to use',
                'eluzi: to use up, wear out',
            ].join('\n'),
            rules: [
                prefixInflection('el', '', [], []),
            ],
        },
        'dis-': {
            name: 'dis-',
            description: [
                'Prefix meaning "separation, being apart, spreading out"',
                'ŝvebi: to float',
                'disŝvebi: to float out/separately',
                'fali: to fall',
                'disfali: to fall apart',
                'doni: to give',
                'disdoni: to give out, to distribute',
                'sendo: a thing that is sent',
                'dissendo: a broadcast',
            ].join('\n'),
            rules: [
                prefixInflection('dis', '', [], []),
            ],
        },
        'for-': {
            name: 'for-',
            description: [
                'Prefix meaning "movement to a far distance"',
                'flugi: to fly',
                'forflugi: to fly away',
                '',
                'Prefix meaning "disappearance/annihilation"',
                'uzi: to use',
                'foruzi: to use up (until nothing is left)',
            ].join('\n'),
            rules: [
                prefixInflection('for', '', [], []),
            ],
        },
        'mis-': {
            name: 'mis-',
            description: [
                'Prefix meaning "wrong, erroneous"',
                'kompreni: to understand',
                'miskompreni: to misunderstand',
                'paroli: to speak',
                'misparoli: to misspeak',
            ].join('\n'),
            rules: [
                prefixInflection('mis', '', [], []),
            ],
        },
    },
};
