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

/**
 * @template {import('api-map').ApiSurface} [TApiSurface=never]
 * @param {import('api-map').ApiMapInit<TApiSurface>} init
 * @returns {import('api-map').ApiMap<TApiSurface>}
 */
export function createApiMap(init) {
    return new Map(init);
}

/**
 * @template {import('api-map').ApiSurface} [TApiSurface=never]
 * @param {import('api-map').ApiMap<TApiSurface>} map
 * @param {import('api-map').ApiMapInit<TApiSurface>} init
 * @throws {Error}
 */
export function extendApiMap(map, init) {
    for (const [key, value] of init) {
        if (map.has(key)) { throw new Error(`The handler for ${String(key)} has already been registered`); }
        map.set(key, value);
    }
}
