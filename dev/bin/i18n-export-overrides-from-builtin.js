#!/usr/bin/env node
/**
 * Parse BUILTIN from i18n-fill-ru.js and write dev/i18n-ru-overrides.json
 * Also merge en≠ru pairs from messages.json for completeness.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fillSrc = fs.readFileSync(path.join(root, 'dev', 'bin', 'i18n-fill-ru.js'), 'utf8');
const m = /const BUILTIN = (\{[\s\S]*?\n\});/.exec(fillSrc);
if (!m) {
    console.error('Could not extract BUILTIN');
    process.exit(1);
}
/** @type {Record<string, string>} */
const builtin = vm.runInNewContext(`(${m[1]})`);

const en = JSON.parse(fs.readFileSync(path.join(root, 'ext', '_locales', 'en', 'messages.json'), 'utf8'));
const ru = JSON.parse(fs.readFileSync(path.join(root, 'ext', '_locales', 'ru', 'messages.json'), 'utf8'));

/** @type {Record<string, string>} */
const overrides = {...builtin};
let translatedKeys = 0;
let stillIdentical = 0;
/** @type {string[]} */
const still = [];

for (const key of Object.keys(en)) {
    const eng = en[key]?.message;
    const rus = ru[key]?.message;
    if (typeof eng !== 'string' || typeof rus !== 'string') { continue; }
    if (eng !== rus) {
        overrides[eng] = rus;
        translatedKeys++;
    } else {
        stillIdentical++;
        if (/[A-Za-z]{3,}/.test(eng) && eng === rus) {
            still.push(eng);
        }
    }
}

// Drop identity mappings
for (const [k, v] of Object.entries(overrides)) {
    if (k === v) {
        delete overrides[k];
    }
}

const out = path.join(root, 'dev', 'i18n-ru-overrides.json');
fs.writeFileSync(out, `${JSON.stringify(overrides, null, 4)}\n`, 'utf8');

const stillUniq = [...new Set(still)].sort();
fs.writeFileSync(path.join(root, 'dev', 'i18n-still-english.txt'), stillUniq.join('\n') + (stillUniq.length ? '\n' : ''), 'utf8');

console.log(`EN keys: ${Object.keys(en).length}`);
console.log(`RU keys: ${Object.keys(ru).length}`);
console.log(`Keys with RU ≠ EN: ${translatedKeys}`);
console.log(`Keys still identical: ${stillIdentical}`);
console.log(`Override map size: ${Object.keys(overrides).length}`);
console.log(`Still English (meaningful letters): ${stillUniq.length}`);
console.log(stillUniq.join('\n'));
