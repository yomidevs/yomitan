/*
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

const assert = require('assert');
const {testMain} = require('../dev/util');

/**
 * This function tests the following bug:
 * - https://github.com/jsdom/jsdom/issues/3211
 * - https://github.com/dperini/nwsapi/issues/48
 */
function testJSDOMSelectorBug() {
    // nwsapi is used by JSDOM
    const {JSDOM} = require('jsdom');
    const dom = new JSDOM();
    const {document} = dom.window;
    const div = document.createElement('div');
    div.innerHTML = '<div class="b"><div class="c"></div></div>';
    const c = div.querySelector('.c');
    assert.doesNotThrow(() => { c.matches('.a:nth-last-of-type(1) .b .c'); });
}

function testJSDOM() {
    testJSDOMSelectorBug();
}

function main() {
    testJSDOM();
}

module.exports = {
    testJSDOM
};

if (require.main === module) { testMain(main); }
