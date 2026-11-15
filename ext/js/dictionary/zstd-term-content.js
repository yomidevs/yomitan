/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import {createCCtx, createDCtx, compress, compressUsingDict, decompress, decompressUsingDict, init} from '../../lib/zstd-wasm.js';
import {log} from '../core/log.js';

let isInitialized = false;
/** @type {Promise<void>|null} */
let initializePromise = null;
/** @type {Uint8Array|null} */
let jmdictDict = null;
/** @type {number|null} */
let cctx = null;
/** @type {number|null} */
let dctx = null;

/**
 * @returns {Promise<void>}
 */
export async function initializeTermContentZstd() {
    if (isInitialized) { return; }
    if (initializePromise !== null) {
        await initializePromise;
        return;
    }
    initializePromise = (async () => {
        await init('/lib/zstd.wasm');
        cctx = Number(createCCtx());
        dctx = Number(createDCtx());
        const response = await fetch('/lib/zstd-dicts/jmdict.zdict');
        if (!response.ok) {
            throw new Error(`Failed to load zstd dictionary: ${response.status}`);
        }
        jmdictDict = new Uint8Array(await response.arrayBuffer());
        isInitialized = true;
    })();

    try {
        await initializePromise;
    } catch (e) {
        initializePromise = null;
        throw e;
    }
}

/**
 * @param {string} dictionaryTitle
 * @returns {string|null}
 */
export function resolveTermContentZstdDictName(dictionaryTitle) {
    const normalized = dictionaryTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.includes('jmdict') || normalized.includes('jitendex')) {
        return 'jmdict';
    }
    return null;
}

/**
 * @param {Uint8Array} content
 * @param {string|null} dictName
 * @returns {Uint8Array}
 * @throws {Error}
 */
export function compressTermContentZstd(content, dictName) {
    if (!isInitialized || cctx === null) {
        throw new Error('Term content zstd not initialized');
    }
    if (dictName === 'jmdict' && jmdictDict !== null) {
        return compressUsingDict(cctx, content, jmdictDict, 1);
    }
    return compress(content, 1);
}

/**
 * @param {Uint8Array} content
 * @param {string|null} dictName
 * @returns {Uint8Array}
 * @throws {Error}
 */
export function decompressTermContentZstd(content, dictName) {
    if (!isInitialized || dctx === null) {
        throw new Error('Term content zstd not initialized');
    }
    if (dictName === 'jmdict' && jmdictDict !== null) {
        return decompressUsingDict(dctx, content, jmdictDict);
    }
    return decompress(content);
}

/**
 * @param {unknown} error
 */
export function logTermContentZstdError(error) {
    log.error(error);
}
