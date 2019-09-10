/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


const profileConditionsDescriptor = {
    popupLevel: {
        name: 'Popup Level',
        description: 'Use profile depending on the level of the popup.',
        placeholder: 'Number',
        type: 'number',
        step: 1,
        defaultValue: 0,
        defaultOperator: 'equal',
        transform: (optionValue) => parseInt(optionValue, 10),
        transformReverse: (transformedOptionValue) => `${transformedOptionValue}`,
        validateTransformed: (transformedOptionValue) => Number.isFinite(transformedOptionValue),
        operators: {
            equal: {
                name: '=',
                test: (value, optionValue) => (value === optionValue)
            },
            notEqual: {
                name: '\u2260',
                test: (value, optionValue) => (value !== optionValue)
            },
            lessThan: {
                name: '<',
                test: (value, optionValue) => (value < optionValue)
            },
            greaterThan: {
                name: '>',
                test: (value, optionValue) => (value > optionValue)
            },
            lessThanOrEqual: {
                name: '\u2264',
                test: (value, optionValue) => (value <= optionValue)
            },
            greaterThanOrEqual: {
                name: '\u2265',
                test: (value, optionValue) => (value >= optionValue)
            }
        }
    },
    url: {
        name: 'URL',
        description: 'Use profile depending on the URL of the current website.',
        defaultOperator: 'matchDomain',
        operators: {
            matchDomain: {
                name: 'Matches Domain',
                placeholder: 'Comma separated list of domains',
                defaultValue: 'example.com',
                transformCache: {},
                transform: (optionValue) => optionValue.split(/[,;\s]+/).map(v => v.trim().toLowerCase()).filter(v => v.length > 0),
                transformReverse: (transformedOptionValue) => transformedOptionValue.join(', '),
                validateTransformed: (transformedOptionValue) => (transformedOptionValue.length > 0),
                test: (value, transformedOptionValue) => (transformedOptionValue.indexOf(new URL(value).hostname.toLowerCase()) >= 0)
            },
            matchRegExp: {
                name: 'Matches RegExp',
                placeholder: 'Regular expression',
                defaultValue: 'example\\.com',
                transformCache: {},
                transform: (optionValue) => new RegExp(optionValue, 'i'),
                transformReverse: (transformedOptionValue) => transformedOptionValue.source,
                test: (value, transformedOptionValue) => (transformedOptionValue !== null && transformedOptionValue.test(value))
            }
        }
    }
};
