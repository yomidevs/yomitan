/*
 * Copyright (C) 2023-2026  Yomitan Authors
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
import {vi} from 'vitest';

/**
 *
 */
export function setupStubs() {
    vi.stubGlobal('self', {
        constructor: {
            name: 'Window',
        },
    });

    /**
     * @param {string|URL} url
     * @returns {{addEventListener: () => void, terminate: () => void}}
     * @throws {Error}
     */
    function Worker(url) {
        if (String(url).endsWith('/lib/z-worker.js')) {
            throw new Error('Web workers are not available in database tests');
        }
        return {
            addEventListener: () => {},
            terminate: () => {},
        };
    }
    vi.stubGlobal('Worker', Worker);
}
