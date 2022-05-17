/*
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

const path = require('path');
const {createDictionaryArchive, testMain} = require('../dev/util');
const dictionaryValidate = require('../dev/dictionary-validate');


function createTestDictionaryArchive(dictionary, dictionaryName) {
    const dictionaryDirectory = path.join(__dirname, 'data', 'dictionaries', dictionary);
    return createDictionaryArchive(dictionaryDirectory, dictionaryName);
}


async function main() {
    const dictionaries = [
        {name: 'valid-dictionary1', valid: true},
        {name: 'invalid-dictionary1', valid: false},
        {name: 'invalid-dictionary2', valid: false},
        {name: 'invalid-dictionary3', valid: false},
        {name: 'invalid-dictionary4', valid: false},
        {name: 'invalid-dictionary5', valid: false},
        {name: 'invalid-dictionary6', valid: false}
    ];

    const schemas = dictionaryValidate.getSchemas();

    for (const {name, valid} of dictionaries) {
        const archive = createTestDictionaryArchive(name);

        let error = null;
        try {
            await dictionaryValidate.validateDictionary(null, archive, schemas);
        } catch (e) {
            error = e;
        }

        if (valid) {
            if (error !== null) {
                throw error;
            }
        } else {
            if (error === null) {
                throw new Error(`Expected dictionary ${name} to be invalid`);
            }
        }
    }
}


if (require.main === module) { testMain(main); }
