/*
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

function getSubstringCount(string, pattern) {
    let count = 0;
    while (true) {
        const match = pattern.exec(string);
        if (match === null) { break; }
        ++count;
    }
    return count;
}

function getSortedScriptPaths(scriptPaths) {
    // Sort file names without the extension
    const extensionPattern = /\.[^.]*$/;
    scriptPaths = scriptPaths.map((value) => {
        const match = extensionPattern.exec(value);
        let ext = '';
        if (match !== null) {
            ext = match[0];
            value = value.substring(0, value.length - ext.length);
        }
        return {value, ext};
    });

    const stringComparer = new Intl.Collator('en-US'); // Invariant locale
    scriptPaths.sort((a, b) => stringComparer.compare(a.value, b.value));

    scriptPaths = scriptPaths.map(({value, ext}) => `${value}${ext}`);
    return scriptPaths;
}

function validateScriptOrder(fileName, window) {
    const {document, Node: {ELEMENT_NODE, TEXT_NODE}, NodeFilter} = window;

    const scriptElements = document.querySelectorAll('script');
    if (scriptElements.length === 0) { return; }

    // Assert all scripts are siblings
    const scriptContainerElement = scriptElements[0].parentNode;
    for (const element of scriptElements) {
        if (element.parentNode !== scriptContainerElement) {
            assert.fail('All script nodes are not contained within the same element');
        }
    }

    // Get script groupings and order
    const scriptGroups = [];
    const newlinePattern = /\n/g;
    let separatingText = '';
    const walker = document.createTreeWalker(scriptContainerElement, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    walker.firstChild();
    for (let node = walker.currentNode; node !== null; node = walker.nextSibling()) {
        switch (node.nodeType) {
            case ELEMENT_NODE:
                if (node.tagName.toLowerCase() === 'script') {
                    let scriptGroup;
                    if (scriptGroups.length === 0 || getSubstringCount(separatingText, newlinePattern) >= 2) {
                        scriptGroup = [];
                        scriptGroups.push(scriptGroup);
                    } else {
                        scriptGroup = scriptGroups[scriptGroups.length - 1];
                    }
                    scriptGroup.push(node.src);
                    separatingText = '';
                }
                break;
            case TEXT_NODE:
                separatingText += node.nodeValue;
                break;
        }
    }

    // Ensure core.js is first (if it is present)
    const ignorePattern = /^\/lib\//;
    const index = scriptGroups.flat()
        .filter((value) => !ignorePattern.test(value))
        .findIndex((value) => (value === '/js/core.js'));
    assert.ok(index <= 0, 'core.js is not the first included script');

    // Check script order
    for (let i = 0, ii = scriptGroups.length; i < ii; ++i) {
        const scriptGroup = scriptGroups[i];
        try {
            assert.deepStrictEqual(scriptGroup, getSortedScriptPaths(scriptGroup));
        } catch (e) {
            console.error(`Script order for group ${i + 1} in file ${fileName} is not correct:`);
            throw e;
        }
    }
}

function validateHtmlScripts(fileName, extDir) {
    const fullFileName = path.join(extDir, fileName);
    const domSource = fs.readFileSync(fullFileName, {encoding: 'utf8'});
    const dom = new JSDOM(domSource);
    const {window} = dom;
    const {document} = window;
    try {
        for (const {src} of document.querySelectorAll('script')) {
            validatePath(src, fullFileName, extDir);
        }
        for (const {href} of document.querySelectorAll('link')) {
            validatePath(href, fullFileName, extDir);
        }
        validateScriptOrder(fileName, window);
    } finally {
        window.close();
    }
}


function main() {
    try {
        const extDir = path.resolve(__dirname, '..', '..', 'ext');
        const pattern = /\.html$/;
        const ignorePattern = /^lib[\\/]/;
        const fileNames = getAllFiles(extDir, (f) => pattern.test(f) && !ignorePattern.test(f));
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
