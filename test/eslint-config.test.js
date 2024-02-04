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

import esbuild from 'esbuild';
import {readFileSync} from 'fs';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import {describe, test} from 'vitest';
import {parseJson} from '../dev/json.js';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} scriptPaths
 * @returns {Promise<string[]>}
 */
async function getDependencies(scriptPaths) {
    const v = await esbuild.build({
        entryPoints: scriptPaths,
        bundle: true,
        minify: false,
        sourcemap: true,
        target: 'es2022',
        format: 'esm',
        write: false,
        metafile: true
    });
    const dependencies = Object.keys(v.metafile.inputs);
    const stringComparer = new Intl.Collator('en-US'); // Invariant locale
    dependencies.sort((a, b) => stringComparer.compare(a, b));
    return dependencies;
}

/**
 * @param {string[]} dependencies
 * @returns {string[]}
 */
function removeLibraryDependencies(dependencies) {
    const pattern = /^ext\/lib\//;
    return dependencies.filter((v) => !pattern.test(v));
}

/**
 * @param {{[key: string]: boolean}|undefined} env1
 * @param {{[key: string]: boolean}} env2
 * @returns {boolean}
 */
function envMatches(env1, env2) {
    if (typeof env1 !== 'object' || env1 === null) { return false; }
    const map1 = new Map(Object.entries(env1));
    const map2 = new Map(Object.entries(env2));
    if (map1.size !== map2.size) { return false; }
    for (const [k1, v1] of map1) {
        if (map2.get(k1) !== v1) { return false; }
    }
    return true;
}

/**
 * @param {string[]} files1
 * @param {string[]} files2
 * @returns {boolean}
 */
function filesMatch(files1, files2) {
    if (!Array.isArray(files1)) { return false; }
    const set1 = new Set(files1);
    const set2 = new Set(files2);
    if (set1.size !== set2.size) { return false; }
    for (const v of set1) {
        if (!set2.has(v)) { return false; }
    }
    return true;
}

const targets = [
    {
        name: 'sandbox',
        paths: [
            'ext/js/templates/sandbox/template-renderer-frame-main.js'
        ],
        /** @type {{[key: string]: boolean}} */
        env: {
            webextensions: false
        }
    },
    {
        name: 'worker',
        paths: [
            'ext/js/dictionary/dictionary-worker-main.js'
        ],
        /** @type {{[key: string]: boolean}} */
        env: {
            browser: false,
            worker: true
        }
    },
    {
        name: 'serviceworker',
        paths: [
            'ext/js/background/background-main.js'
        ],
        /** @type {{[key: string]: boolean}} */
        env: {
            browser: false,
            serviceworker: true
        }
    }
];

describe('Eslint configuration', () => {
    const eslintConfigPath = '.eslintrc.json';
    /** @type {import('core').SafeAny} */
    const eslintConfig = parseJson(readFileSync(join(rootDir, eslintConfigPath), 'utf8'));
    describe.each(targets)('Environment is $name', ({name, paths, env}) => {
        test('Entry exists', async ({expect}) => {
            const fullPaths = paths.map((v) => join(rootDir, v));
            const dependencies = removeLibraryDependencies(await getDependencies(fullPaths));

            let okay = false;
            const candidates = [];
            const {overrides} = eslintConfig;
            for (let i = 0, ii = overrides.length; i < ii; ++i) {
                const override = overrides[i];
                if (!envMatches(override.env, env)) { continue; }
                const {files} = override;
                if (!Array.isArray(files)) { continue; }
                candidates.push(i);
                if (filesMatch(files, dependencies)) {
                    okay = true;
                    break;
                }
            }

            if (okay) { return; }
            switch (candidates.length) {
                case 0:
                    {
                        const message = `No override found with "${name}" environment: ${JSON.stringify(env)}`;
                        expect(false, message).toStrictEqual(true);
                    }
                    break;
                case 1:
                    {
                        const index = candidates[0];
                        const message = `Override at index ${index} does not have the expected files for the "${name}" environment.`;
                        expect(overrides[index].files, message).toStrictEqual(dependencies);
                    }
                    break;
                default:
                    {
                        const message = `No override found with the correct file list for the "${name}" environment; candidate indices: [${candidates.join(', ')}].`;
                        expect([], message).toStrictEqual(dependencies);
                    }
                    break;
            }
        });
    });
});
