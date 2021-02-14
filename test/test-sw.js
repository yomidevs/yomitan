/*
 * Copyright (C) 2020-2021  Yomichan Authors
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
const {JSDOM} = require('jsdom');
const {VM} = require('../dev/vm');
const assert = require('assert');


function getAllHtmlScriptPaths(fileName) {
    const domSource = fs.readFileSync(fileName, {encoding: 'utf8'});
    const dom = new JSDOM(domSource);
    const {window} = dom;
    const {document} = window;
    try {
        const scripts = document.querySelectorAll('script');
        return [...scripts].map(({src}) => src);
    } finally {
        window.close();
    }
}

function convertBackgroundScriptsToServiceWorkerScripts(scripts) {
    // Use parse5-based SimpleDOMParser
    scripts.splice(0, 0, '/lib/parse5.js');
    const index = scripts.indexOf('/bg/js/native-simple-dom-parser.js');
    assert.ok(index >= 0);
    scripts[index] = '/bg/js/simple-dom-parser.js';
}

function main() {
    try {
        // Verify that sw.js scripts match background.html scripts
        const rootDir = path.join(__dirname, '..');
        const extDirName = 'ext';
        const extDir = path.join(rootDir, extDirName);

        const scripts = getAllHtmlScriptPaths(path.join(extDir, 'background.html'));
        convertBackgroundScriptsToServiceWorkerScripts(scripts);
        const importedScripts = [];

        const importScripts = (...scripts2) => {
            importedScripts.push(...scripts2);
        };

        const vm = new VM({importScripts});
        vm.context.self = vm.context;
        vm.execute(['sw.js']);

        vm.assert.deepStrictEqual(scripts, importedScripts);

        // Verify that eslint config lists files correctly
        const expectedSwRulesFiles = scripts.filter((src) => !src.startsWith('/lib/')).map((src) => `${extDirName}${src}`);
        const eslintConfig = JSON.parse(fs.readFileSync(path.join(rootDir, '.eslintrc.json'), {encoding: 'utf8'}));
        const swRules = eslintConfig.overrides.find((item) => (
            typeof item.env === 'object' &&
            item.env !== null &&
            item.env.serviceworker === true
        ));
        assert.ok(typeof swRules !== 'undefined');
        assert.ok(Array.isArray(swRules.files));
        assert.deepStrictEqual(swRules.files, expectedSwRulesFiles);
    } catch (e) {
        console.error(e);
        process.exit(-1);
        return;
    }
    process.exit(0);
}


if (require.main === module) { main(); }
