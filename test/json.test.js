/*
 * Copyright (C) 2023  Yomitan Authors
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
import {readFileSync} from 'fs';
import {join, dirname as pathDirname} from 'path';
import {createGenerator} from 'ts-json-schema-generator';
import {fileURLToPath} from 'url';
import {describe, expect, test} from 'vitest';
import {getAllFiles} from '../dev/util.js';

const dirname = pathDirname(fileURLToPath(import.meta.url));
const rootDir = join(dirname, '..');

/**
 * @param {string} path
 * @param {string} type
 * @returns {import('ajv').ValidateFunction<unknown>}
 */
function createValidatorFunction(path, type) {
    /** @type {import('ts-json-schema-generator/dist/src/Config').Config} */
    const config = {
        path,
        tsconfig: join(dirname, '../jsconfig.json'),
        type,
        jsDoc: 'none',
        additionalProperties: false,
        minify: false,
        expose: 'all',
        strictTuples: true
    };
    const schema = createGenerator(config).createSchema(config.type);
    const ajv = new Ajv();
    return ajv.compile(schema);
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizePathDirectorySeparators(value) {
    return value.replace(/\\/g, '/');
}


describe.concurrent('JSON validation', () => {
    const ignoreDirectories = new Set([
        'builds',
        'dictionaries',
        'node_modules',
        'playwright-report',
        'playwright',
        'test-results',
        'dev/lib',
        'test/playwright'
    ]);

    const existingJsonFiles = getAllFiles(rootDir, (path, isDirectory) => {
        const fileNameNormalized = normalizePathDirectorySeparators(path);
        if (isDirectory) {
            return !ignoreDirectories.has(fileNameNormalized);
        } else {
            return /\.json$/i.test(fileNameNormalized);
        }
    });
    /** @type {Set<string>} */
    const existingJsonFileSet = new Set();
    for (const path of existingJsonFiles) {
        existingJsonFileSet.add(normalizePathDirectorySeparators(path));
    }

    const jsonFileName = 'json.json';

    /** @type {import('test/json').JsonInfo} */
    const jsonFileData = JSON.parse(readFileSync(join(dirname, `data/${jsonFileName}`), {encoding: 'utf8'}));

    test(`Each item in ${jsonFileName} must have a unique path`, () => {
        /** @type {Set<string>} */
        const set = new Set();
        for (const {path} of jsonFileData.files) {
            set.add(path);
        }
        expect(set.size).toBe(jsonFileData.files.length);
    });

    /** @type {Map<string, import('test/json').JsonFileInfo>} */
    const jsonFileMap = new Map();
    for (const item of jsonFileData.files) {
        jsonFileMap.set(item.path, item);
    }

    // Validate file existance
    const requiredFiles = jsonFileData.files.filter((v) => !v.ignore);
    test.each(requiredFiles)('File must exist in project: $path', ({path}) => {
        expect(existingJsonFileSet.has(path)).toBe(true);
    });

    // Validate new files
    const existingJsonFiles2 = existingJsonFiles.map((path) => ({path: normalizePathDirectorySeparators(path)}));
    test.each(existingJsonFiles2)(`File must exist in ${jsonFileName}: $path`, ({path}) => {
        expect(jsonFileMap.has(path)).toBe(true);
    });

    // Validate schemas
    /** @type {import('test/json').JsonFileParseInfo[]} */
    const schemaValidationTargets = [];
    for (const info of jsonFileData.files) {
        if (info.ignore || !existingJsonFileSet.has(info.path)) { continue; }
        // TODO : Remove next line
        if (info.type === null || info.typeFile === null) { continue; }
        schemaValidationTargets.push(info);
    }
    test.each(schemaValidationTargets)('Validating file: $path', ({path, typeFile, type}) => {
        const validate = createValidatorFunction(join(rootDir, typeFile), type);
        const data = JSON.parse(readFileSync(join(rootDir, path), {encoding: 'utf8'}));
        const valid = validate(data);
        const {errors} = validate;
        expect(errors).toBe(null);
        expect(valid).toBe(true);
    });
});
