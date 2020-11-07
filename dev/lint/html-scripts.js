/*
 * Copyright (C) 2020  Yomichan Authors
 * Author: Yomichan Authors
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
const path = require('path');
const assert = require('assert');
const {JSDOM} = require('jsdom');
const {getAllFiles} = require('../util');


function lstatSyncSafe(fileName) {
    try {
        return fs.lstatSync(fileName);
    } catch (e) {
        return null;
    }
}

function validatePath(src, fileName, extDir) {
    assert.ok(typeof src === 'string', `<script> missing src attribute in ${fileName}`);
    assert.ok(src.startsWith('/'), `<script> src attribute is not absolute in ${fileName} (src=${JSON.stringify(src)})`);
    const relativeSrc = src.substring(1);
    assert.ok(!path.isAbsolute(relativeSrc), `<script> src attribute is invalid in ${fileName} (src=${JSON.stringify(src)})`);
    const fullSrc = path.join(extDir, relativeSrc);
    const stats = lstatSyncSafe(fullSrc);
    assert.ok(stats !== null, `<script> src file not found in ${fileName} (src=${JSON.stringify(src)})`);
    assert.ok(stats.isFile(), `<script> src file invalid in ${fileName} (src=${JSON.stringify(src)})`);
}

function validateHtmlScripts(fileName, extDir) {
    const domSource = fs.readFileSync(fileName, {encoding: 'utf8'});
    const dom = new JSDOM(domSource);
    const {window} = dom;
    const {document} = window;
    try {
        for (const {src} of document.querySelectorAll('script')) {
            validatePath(src, fileName, extDir);
        }
        for (const {href} of document.querySelectorAll('link')) {
            validatePath(href, fileName, extDir);
        }
    } finally {
        window.close();
    }
}


function main() {
    try {
        const extDir = path.resolve(__dirname, '..', '..', 'ext');
        const pattern = /\.html$/;
        const ignorePattern = /[\\/]ext[\\/]mixed[\\/]lib[\\/]/;
        const fileNames = getAllFiles(extDir, null, (f) => pattern.test(f) && !ignorePattern.test(f));
        for (const fileName of fileNames) {
            validateHtmlScripts(fileName, extDir);
        }
    } catch (e) {
        console.error(e);
        process.exit(-1);
        return;
    }
    process.exit(0);
}


if (require.main === module) { main(); }
