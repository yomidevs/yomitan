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
const {getAllFiles} = require('../util');


function escapeRegExp(string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

function countOccurences(string, pattern) {
    return (string.match(pattern) || []).length;
}

function getNewline(string) {
    const count1 = countOccurences(string, /(?:^|[^\r])\n/g);
    const count2 = countOccurences(string, /\r\n/g);
    const count3 = countOccurences(string, /\r(?:[^\n]|$)/g);
    if (count2 > count1) {
        return (count3 > count2) ? '\r' : '\r\n';
    } else {
        return (count3 > count1) ? '\r' : '\n';
    }
}

function getSubstringCount(string, substring) {
    let count = 0;
    const pattern = new RegExp(`\\b${escapeRegExp(substring)}\\b`, 'g');
    while (true) {
        const match = pattern.exec(string);
        if (match === null) { break; }
        ++count;
    }
    return count;
}


function validateGlobals(fileName, fix) {
    const pattern = /\/\*\s*global\s+([\w\W]*?)\*\//g;
    const trimPattern = /^[\s,*]+|[\s,*]+$/g;
    const splitPattern = /[\s,*]+/;
    const source = fs.readFileSync(fileName, {encoding: 'utf8'});
    let match;
    let first = true;
    let endIndex = 0;
    let newSource = '';
    const allGlobals = [];
    const newline = getNewline(source);
    while ((match = pattern.exec(source)) !== null) {
        if (!first) {
            console.error(`Encountered more than one global declaration in ${fileName}`);
            return false;
        }
        first = false;

        const parts = match[1].replace(trimPattern, '').split(splitPattern);
        parts.sort();

        const actual = match[0];
        const expected = `/* global${parts.map((v) => `${newline} * ${v}`).join('')}${newline} */`;

        try {
            assert.strictEqual(actual, expected);
        } catch (e) {
            console.error(`Global declaration error encountered in ${fileName}:`);
            console.error(e.message);
            if (!fix) {
                return false;
            }
        }

        newSource += source.substring(0, match.index);
        newSource += expected;
        endIndex = match.index + match[0].length;

        allGlobals.push(...parts);
    }

    newSource += source.substring(endIndex);

    // This is an approximate check to see if a global variable is unused.
    // If the global appears in a comment, string, or similar, the check will pass.
    let errorCount = 0;
    for (const global of allGlobals) {
        if (getSubstringCount(newSource, global) <= 1) {
            console.error(`Global variable ${global} appears to be unused in ${fileName}`);
            ++errorCount;
        }
    }

    if (fix) {
        fs.writeFileSync(fileName, newSource, {encoding: 'utf8'});
    }

    return errorCount === 0;
}


function main() {
    const fix = (process.argv.length >= 2 && process.argv[2] === '--fix');
    const directory = path.resolve(__dirname, '..', '..', 'ext');
    const pattern = /\.js$/;
    const ignorePattern = /^lib[\\/]/;
    const fileNames = getAllFiles(directory, (f) => pattern.test(f) && !ignorePattern.test(f));
    for (const fileName of fileNames) {
        if (!validateGlobals(path.join(directory, fileName), fix)) {
            process.exit(-1);
            return;
        }
    }
    process.exit(0);
}


if (require.main === module) { main(); }
