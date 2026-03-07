/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import Ajv from 'ajv';
import standaloneCode from 'ajv/dist/standalone/index.js';
import esbuild from 'esbuild';
import fs from 'fs';
import {createRequire} from 'module';
import {execFileSync} from 'node:child_process';
import os from 'os';
import path from 'path';
import {fileURLToPath} from 'url';
import {parseJson} from './json.js';

const require = createRequire(import.meta.url);

const dirname = path.dirname(fileURLToPath(import.meta.url));
const extDir = path.join(dirname, '..', 'ext');

/**
 * @param {string} compiler
 * @returns {boolean}
 */
function canBuildWasmTarget(compiler) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manabitan-wasm-'));
    const sourcePath = path.join(tempDir, 'probe.c');
    const outputPath = path.join(tempDir, 'probe.wasm');
    try {
        fs.writeFileSync(sourcePath, 'void probe(void) {}\n', 'utf8');
        execFileSync(
            compiler,
            [
                '--target=wasm32',
                '-nostdlib',
                '-Wl,--no-entry',
                '-Wl,--export=probe',
                '-Wl,--strip-all',
                '-o',
                outputPath,
                sourcePath,
            ],
            {stdio: 'ignore'},
        );
        return true;
    } catch {
        return false;
    } finally {
        fs.rmSync(tempDir, {recursive: true, force: true});
    }
}

/**
 * @returns {string}
 * @throws {Error}
 */
function getWasmCapableClang() {
    const candidates = /** @type {string[]} */ ([
        process.env.MANABITAN_CLANG,
        process.env.CLANG,
        'clang',
        'clang-18',
        'clang-17',
        '/opt/homebrew/opt/llvm/bin/clang',
        '/usr/bin/clang',
    ].filter((value) => typeof value === 'string' && value.length > 0));
    for (const candidate of candidates) {
        try {
            execFileSync(candidate, ['--version'], {stdio: 'ignore'});
        } catch {
            continue;
        }
        if (canBuildWasmTarget(candidate)) {
            return candidate;
        }
    }
    throw new Error(
        'Missing a wasm32-capable clang required to build dictionary wasm assets. ' +
        'Set MANABITAN_CLANG or CLANG to a compiler that can link --target=wasm32.',
    );
}

/**
 * @param {string} out
 */
async function copyWasm(out) {
    // copy from node modules '@resvg/resvg-wasm/index_bg.wasm' to out
    const resvgWasmPath = path.dirname(require.resolve('@resvg/resvg-wasm'));
    const wasmPath = path.join(resvgWasmPath, 'index_bg.wasm');
    fs.copyFileSync(wasmPath, path.join(out, 'resvg.wasm'));
}

/**
 * @param {string} out
 */
async function copySqliteWasm(out) {
    const sqliteWasmPath = path.dirname(require.resolve('@sqlite.org/sqlite-wasm/package.json'));
    const sqliteDistPath = path.join(sqliteWasmPath, 'dist');
    const sqliteOutPath = path.join(out, 'sqlite');
    fs.mkdirSync(sqliteOutPath, {recursive: true});
    for (const fileName of fs.readdirSync(sqliteDistPath)) {
        const source = path.join(sqliteDistPath, fileName);
        const destination = path.join(sqliteOutPath, fileName);
        fs.copyFileSync(source, destination);
    }
}

/**
 * @param {string} out
 */
async function copyZstdAssets(out) {
    const zstdEntryPath = require.resolve('@bokuweb/zstd-wasm');
    const zstdPkgPath = path.resolve(path.dirname(zstdEntryPath), '..', '..');
    const zstdWasmPath = path.join(zstdPkgPath, 'dist/esm/zstd.wasm');
    fs.copyFileSync(zstdWasmPath, path.join(out, 'zstd.wasm'));

    const zstdDictOutPath = path.join(out, 'zstd-dicts');
    fs.mkdirSync(zstdDictOutPath, {recursive: true});
    const jmdictDictPath = path.join(dirname, 'data', 'zstd-dicts', 'jmdict.zdict');
    if (!fs.existsSync(jmdictDictPath)) {
        throw new Error(`Missing vendored zstd dictionary asset: ${jmdictDictPath}`);
    }
    fs.copyFileSync(jmdictDictPath, path.join(zstdDictOutPath, 'jmdict.zdict'));
}

/**
 * @param {string} out
 */
async function buildDictionaryWasm(out) {
    const wasmSources = [
        {
            sourcePath: path.join(extDir, 'js', 'dictionary', 'wasm', 'term-bank-parser.c'),
            outputPath: path.join(out, 'term-bank-parser.wasm'),
            exports: ['wasm_reset_heap', 'wasm_alloc', 'parse_term_bank', 'encode_term_content'],
        },
        {
            sourcePath: path.join(extDir, 'js', 'dictionary', 'wasm', 'term-record-encoder.c'),
            outputPath: path.join(out, 'term-record-encoder.wasm'),
            exports: ['wasm_reset_heap', 'wasm_alloc', 'calc_encoded_size', 'encode_records'],
        },
    ];

    const clang = getWasmCapableClang();

    for (const target of wasmSources) {
        const args = [
            '--target=wasm32',
            '-O3',
            '-nostdlib',
            '-Wl,--no-entry',
        ];
        for (const exportName of target.exports) {
            args.push(`-Wl,--export=${exportName}`);
        }
        args.push('-Wl,--strip-all', '-o', target.outputPath, target.sourcePath);
        execFileSync(clang, args, {stdio: 'inherit'});
    }
}


/**
 * @param {string} scriptPath
 */
async function buildLib(scriptPath) {
    await esbuild.build({
        entryPoints: [scriptPath],
        bundle: true,
        minify: false,
        sourcemap: true,
        target: 'es2020',
        format: 'esm',
        outfile: path.join(extDir, 'lib', path.basename(scriptPath)),
        external: ['fs'],
        banner: {
            js: '// @ts-nocheck',
        },
    });
}

/**
 * Bundles libraries.
 */
export async function buildLibs() {
    const devLibPath = path.join(dirname, 'lib');
    const files = await fs.promises.readdir(devLibPath, {
        withFileTypes: true,
    });
    for (const f of files) {
        if (f.isFile()) {
            await buildLib(path.join(devLibPath, f.name));
        }
    }

    const schemaDir = path.join(extDir, 'data/schemas/');
    const schemaFileNames = fs.readdirSync(schemaDir);
    const schemas = schemaFileNames.map((schemaFileName) => {
        /** @type {import('ajv').AnySchema} */
        // eslint-disable-next-line sonarjs/prefer-immediate-return
        const result = parseJson(fs.readFileSync(path.join(schemaDir, schemaFileName), {encoding: 'utf8'}));
        return result;
    });
    const ajv = new Ajv({
        schemas,
        code: {source: true, esm: true},
        allowUnionTypes: true,
    });
    const moduleCode = standaloneCode(ajv);

    // https://github.com/ajv-validator/ajv/issues/2209
    const patchedModuleCode = "// @ts-nocheck\nimport {ucs2length} from './ucs2length.js';" + moduleCode.replaceAll('require("ajv/dist/runtime/ucs2length").default', 'ucs2length');

    fs.writeFileSync(path.join(extDir, 'lib/validate-schemas.js'), patchedModuleCode);

    await copyWasm(path.join(extDir, 'lib'));
    await copySqliteWasm(path.join(extDir, 'lib'));
    await copyZstdAssets(path.join(extDir, 'lib'));
    await buildDictionaryWasm(path.join(extDir, 'lib'));
}
