/*
 * Copyright (C) 2023  Yomitan Authors
 * Copyright (C) 2021-2022  Yomichan Authors
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

import {JSDOM} from 'jsdom';
import {expect, test} from 'vitest';

/**
 * This function tests the following bug:
 * - https://github.com/jsdom/jsdom/issues/3211
 * - https://github.com/dperini/nwsapi/issues/48
 */
function testJSDOMSelectorBug() {
    test('JSDOMSelectorBug', () => {
        // nwsapi is used by JSDOM
        const dom = new JSDOM();
        const {document} = dom.window;
        const div = document.createElement('div');
        div.innerHTML = '<div class="b"><div class="c"></div></div>';
        const c = div.querySelector('.c');
        expect(() => {
            if (c === null) { throw new Error('Element not found'); }
            c.matches('.a:nth-last-of-type(1) .b .c');
        }).not.toThrow();
    });
}

/** */
export function testJSDOM() {
    testJSDOMSelectorBug();
}

/** */
function main() {
    testJSDOM();
}

main();
