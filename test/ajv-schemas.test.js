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

import Ajv from 'ajv';
import standaloneCode from 'ajv/dist/standalone/index.js';
import {readFileSync, readdirSync} from 'fs';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import {describe, test} from 'vitest';
import {parseJson} from '../dev/json.js';

/**
 * @param {string} path
 * @returns {import('ajv').AnySchema}
 */
function loadSchema(path) {
    return parseJson(readFileSync(path, {encoding: 'utf8'}));
}

const extDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'ext');

describe('Ajv schema compilation', () => {
    const schemaDir = join(extDir, 'data/schemas/');
    const schemaFileNames = readdirSync(schemaDir);
    /** @type {{name: string, schema: import('ajv').AnySchema}[]} */
    const schemaTestCases = [];
    for (const schemaFileName of schemaFileNames) {
        schemaTestCases.push({name: schemaFileName, schema: loadSchema(join(schemaDir, schemaFileName))});
    }

    describe.each(schemaTestCases)('Validating $name', ({schema}) => {
        test('Compiles without warnings', ({expect}) => {
            /** @type {string[]} */
            const messages = [];
            /**
             * @param {...unknown} args
             */
            const log = (...args) => {
                messages.push(args.join(' '));
            };
            const ajv = new Ajv({
                schemas: [schema],
                code: {source: true, esm: true},
                allowUnionTypes: true,
                logger: {
                    log,
                    warn: log,
                    error: log
                }
            });
            standaloneCode(ajv);
            if (messages.length > 0) {
                expect.fail(messages.join('\n'));
            }
        });
    });
});
