#!/usr/bin/env node
/** Build dev/i18n-ru-overrides.json from en vs ru message diffs. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const en = JSON.parse(fs.readFileSync(path.join(root, 'ext', '_locales', 'en', 'messages.json'), 'utf8'));
const ru = JSON.parse(fs.readFileSync(path.join(root, 'ext', '_locales', 'ru', 'messages.json'), 'utf8'));

/** @type {Record<string, string>} */
const overrides = {};
let same = 0;
let translated = 0;
/** @type {string[]} */
const still = [];

for (const key of Object.keys(en).sort()) {
    const eng = en[key]?.message;
    const rus = ru[key]?.message;
    if (typeof eng !== 'string' || typeof rus !== 'string') { continue; }
    if (eng !== rus) {
        overrides[eng] = rus;
        translated++;
    } else {
        same++;
        if (/[A-Za-z]{3,}/.test(eng)) {
            still.push(`${key}\t${eng}`);
        }
    }
}

const out = path.join(root, 'dev', 'i18n-ru-overrides.json');
fs.writeFileSync(out, `${JSON.stringify(overrides, null, 4)}\n`, 'utf8');
fs.writeFileSync(path.join(root, 'dev', 'i18n-still-english.txt'), still.map((s) => s.split('\t')[1]).filter((v, i, a) => a.indexOf(v) === i).join('\n') + '\n', 'utf8');
console.log(JSON.stringify({
    enKeys: Object.keys(en).length,
    ruKeys: Object.keys(ru).length,
    translatedPairs: translated,
    overrideMapSize: Object.keys(overrides).length,
    stillIdentical: same,
    stillWithLetters: still.length,
}, null, 2));
console.log('--- still sample ---');
console.log(still.slice(0, 60).join('\n'));
