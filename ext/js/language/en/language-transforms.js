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

export const englishTransforms = {
    language: 'en',
    conditions: {
        v: {
            name: 'Verb',
            isDictionaryForm: true
        },
        n: {
            name: 'Noun',
            aliases: ['noun'],
            isDictionaryForm: true,
            subConditions: ['np', 'ns']
        },
        np: {
            name: 'Noun plural',
            isDictionaryForm: true
        },
        ns: {
            name: 'Noun singular',
            isDictionaryForm: true
        },
        adj: {
            name: 'Adjective',
            isDictionaryForm: true
        }
    },
    transforms: [
        {
            name: 'plural',
            description: 'Plural form of a noun',
            rules: [
                {suffixIn: 's', suffixOut: '', conditionsIn: ['np'], conditionsOut: ['ns']},
                {suffixIn: 'es', suffixOut: '', conditionsIn: ['np'], conditionsOut: ['ns']},
                {suffixIn: 'ies', suffixOut: 'y', conditionsIn: ['np'], conditionsOut: ['ns']},
                {suffixIn: 'ves', suffixOut: 'fe', conditionsIn: ['np'], conditionsOut: ['ns']},
                {suffixIn: 'ves', suffixOut: 'f', conditionsIn: ['np'], conditionsOut: ['ns']}
            ]
        }
    ]
};
