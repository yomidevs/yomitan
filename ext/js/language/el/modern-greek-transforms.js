/*
 * Copyright (C) 2026  Yomitan Authors
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

import {prefixInflection} from '../language-transforms.js';

const conditions = {
    v: {
        name: 'Verb',
        isDictionaryForm: true,
    },
};

/** @type {import('language-transformer').LanguageTransformDescriptor<keyof typeof conditions>} */
export const modernGreekTransforms = {
    language: 'el',
    conditions,
    transforms: {
        'ξανα-': {
            name: 'ξανα-',
            rules: [
                // conditionIn is left empty because most likely the ξανα- form is not in the dictionary
                prefixInflection('ξανα', '', [], ['v']), // ξαναρώτησε > ρώτησε
                prefixInflection('ξανα', 'α', [], ['v']), // ξανανθίζω > ανθίζω
                prefixInflection('ξανά', 'έ', [], ['v']), // ξανάβαλε > έβαλε
                prefixInflection('ξανά', 'ά', [], ['v']), // ξανάρχισε > άρχισε
                prefixInflection('ξανάπα', 'είπα', [], ['v']), // edge case
                {
                    // ξαναπάς > πας, ξαναλές > λες, ξαναφάς > φας, ξαναδεί > δει
                    type: 'other',
                    isInflected: /^ξανα/,
                    // cf. import {removeAlphabeticDiacritics} from '../text-processors.js';
                    deinflect: (term) => term.replace(/^ξανα/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
                    conditionsIn: [],
                    conditionsOut: ['v'],
                },
            ],
        },
    },
};
