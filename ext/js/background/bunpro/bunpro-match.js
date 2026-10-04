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

import {ExtensionError} from '../../core/extension-error.js';

export const SIGNED_OUT_ERROR_CODE = 'bunpro-signed-out';

/**
 * @param {{kind: import('bunpro').ReviewableKind, id: import('bunpro').ReviewableId}} match
 * @returns {import('bunpro').ItemKey}
 */
export function itemKey({kind, id}) {
    return /** @type {import('bunpro').ItemKey} */ (`${kind}:${id}`);
}

/**
 * @param {import('bunpro').BunproQuery} query
 * @returns {string}
 */
export function queryKey({term, reading}) {
    return `${term}\n${reading}`;
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isSignedOutError(error) {
    if (!(error instanceof ExtensionError)) { return false; }
    const {data} = error;
    return typeof data === 'object' && data !== null && /** @type {{code?: unknown}} */ (data).code === SIGNED_OUT_ERROR_CODE;
}
