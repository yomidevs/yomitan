#!/usr/bin/env node
import fs from 'node:fs';

const en = JSON.parse(fs.readFileSync('ext/_locales/en/messages.json', 'utf8'));
const ru = JSON.parse(fs.readFileSync('ext/_locales/ru/messages.json', 'utf8'));
const msg = 'Для неанглийских словарей см. список <a href="https://yomidevs.github.io/wiktionary-to-yomitan/download/" target="_blank">словарей Wiktionary</a>.';
for (const k of ['html_for_non_english_dictionaries_please_refe', 'html_for_non_english_dictionaries_please_refe_2']) {
    if (en[k]) {
        ru[k] = {message: msg, description: en[k].description || 'UI string'};
    }
}
const sorted = Object.fromEntries(Object.keys(ru).sort().map((k) => [k, ru[k]]));
fs.writeFileSync('ext/_locales/ru/messages.json', `${JSON.stringify(sorted, null, 4)}\n`);
console.log('ok');
