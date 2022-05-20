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

const fs = require('fs');
const assert = require('assert');

/**
 * This function patches the following bug:
 * - https://github.com/jsdom/jsdom/issues/3211
 * - https://github.com/dperini/nwsapi/issues/48
 */
function patchNwsapi() {
    const nwsapiPath = require.resolve('nwsapi');
    const nwsapiSource = fs.readFileSync(nwsapiPath, {encoding: 'utf8'});
    const pattern = /(if|while)(\()(?:e&&)?(\(e=e\.parentElement\)\)\{)/g;
    let modifications = 0;
    const nwsapiSourceNew = nwsapiSource.replace(pattern, (g0, g1, g2, g3) => {
        ++modifications;
        return `${g1}${g2}e&&${g3}`;
    });
    assert.strictEqual(modifications, 2);
    fs.writeFileSync(nwsapiPath, nwsapiSourceNew, {encoding: 'utf8'});
    // nwsapi is used by JSDOM
    const {testJSDOM} = require('../test/test-jsdom');
    testJSDOM();
}

function main() {
    patchNwsapi();
}

if (require.main === module) { main(); }
