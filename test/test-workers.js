/*
 * Copyright (C) 2023  Yomitan Authors
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
const {JSDOM} = require('jsdom');
const {VM} = require('../dev/vm');
const assert = require('assert');


class StubClass {
    /** */
    prepare() {
        // NOP
    }
}


/**
 * @returns {import('core').SafeAny}
 */
function loadEslint() {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.eslintrc.json'), {encoding: 'utf8'}));
}

/**
 * @param {string[]} scriptPaths
 * @returns {string[]}
 */
function filterScriptPaths(scriptPaths) {
    const extDirName = 'ext';
    return scriptPaths.filter((src) => !src.startsWith('/lib/')).map((src) => `${extDirName}${src}`);
}

/**
 * @param {string} fileName
 * @returns {string[]}
 */
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

/**
 * @param {string[]} scripts
 */
function convertBackgroundScriptsToServiceWorkerScripts(scripts) {
    // Use parse5-based SimpleDOMParser
    scripts.splice(0, 0, '/lib/parse5.js');
    const index = scripts.indexOf('/js/dom/native-simple-dom-parser.js');
    assert.ok(index >= 0);
    scripts[index] = '/js/dom/simple-dom-parser.js';
}

/**
 * @param {string} scriptPath
 * @param {import('core').UnknownObject} fields
 * @returns {string[]}
 */
function getImportedScripts(scriptPath, fields) {
    /** @type {string[]} */
    const importedScripts = [];

    /**
     * @param {...string} scripts
     */
    const importScripts = (...scripts) => {
        importedScripts.push(...scripts);
    };

    const vm = new VM(Object.assign({importScripts}, fields));
    vm.context.self = vm.context;
    vm.execute([scriptPath]);

    return importedScripts;
}

/** */
function testServiceWorker() {
    // Verify that sw.js scripts match background.html scripts
    const extDir = path.join(__dirname, '..', 'ext');
    const scripts = getAllHtmlScriptPaths(path.join(extDir, 'background.html'));
    convertBackgroundScriptsToServiceWorkerScripts(scripts);
    const importedScripts = getImportedScripts('sw.js', {});
    assert.deepStrictEqual(scripts, importedScripts);

    // Verify that eslint config lists files correctly
    const expectedSwRulesFiles = filterScriptPaths(scripts);
    const eslintConfig = loadEslint();
    const swRules = /** @type {import('core').SafeAny[]} */ (eslintConfig.overrides).find((item) => (
        typeof item.env === 'object' &&
        item.env !== null &&
        item.env.serviceworker === true
    ));
    assert.ok(typeof swRules !== 'undefined');
    assert.ok(Array.isArray(swRules.files));
    assert.deepStrictEqual(swRules.files, expectedSwRulesFiles);
}

/** */
function testWorkers() {
    testWorker(
        'js/language/dictionary-worker-main.js',
        {DictionaryWorkerHandler: StubClass}
    );
}

/**
 * @param {string} scriptPath
 * @param {import('core').UnknownObject} fields
 */
function testWorker(scriptPath, fields) {
    // Get script paths
    const scripts = getImportedScripts(scriptPath, fields);

    // Verify that eslint config lists files correctly
    const expectedRulesFiles = filterScriptPaths(scripts);
    const expectedRulesFilesSet = new Set(expectedRulesFiles);
    const eslintConfig = loadEslint();
    const rules = /** @type {import('core').SafeAny[]} */ (eslintConfig.overrides).find((item) => (
        typeof item.env === 'object' &&
        item.env !== null &&
        item.env.worker === true
    ));
    assert.ok(typeof rules !== 'undefined');
    assert.ok(Array.isArray(rules.files));
    assert.deepStrictEqual(/** @type {import('core').SafeAny[]} */ (rules.files).filter((v) => expectedRulesFilesSet.has(v)), expectedRulesFiles);
}


/** */
function main() {
    try {
        testServiceWorker();
        testWorkers();
    } catch (e) {
        console.error(e);
        process.exit(-1);
        return;
    }
    process.exit(0);
}


if (require.main === module) { main(); }
