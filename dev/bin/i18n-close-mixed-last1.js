#!/usr/bin/env node
import fs from 'node:fs';

const en = JSON.parse(fs.readFileSync('ext/_locales/en/messages.json', 'utf8'));
const ru = JSON.parse(fs.readFileSync('ext/_locales/ru/messages.json', 'utf8'));
let m = fs.readFileSync('ext/templates-modals.html', 'utf8');

const first = m.indexOf('The replacement tags');
const second = m.indexOf('The replacement tags', first + 1);
if (second < 0) {
    console.log('no second');
    process.exit(0);
}
const ps = m.lastIndexOf('<p', second);
const pe = m.indexOf('</p>', second) + 4;
const block = m.slice(ps, pe);
if (block.includes('data-i18n-html')) {
    console.log('already tagged');
    process.exit(0);
}
let inner = block.replace(/^<p[^>]*>/, '').replace(/<\/p>\s*$/, '');
const enHtml = inner.trim().replace(/\s+/g, ' ');
en.html_replacement_tags_json_para = {message: enHtml, description: 'Mixed HTML UI'};
ru.html_replacement_tags_json_para = {
    message: enHtml
        .replace('The replacement tags', 'Подстановочные теги')
        .replace('can be used to specify which term and reading is being looked up.', 'задают термин и чтение для запроса.')
        .replace('is also available for sources that require an iso language string.', 'также доступен для источников, которым нужен ISO-код языка.'),
    description: 'Mixed HTML UI',
};
m = `${m.slice(0, ps)}<p data-i18n-html="html_replacement_tags_json_para">${inner.trim()}</p>${m.slice(pe)}`;
fs.writeFileSync('ext/templates-modals.html', m);

/**
 * @param {Record<string, unknown>} obj
 */
function sortObj(obj) {
    /** @type {Record<string, unknown>} */
    const o = {};
    for (const k of Object.keys(obj).sort()) { o[k] = obj[k]; }
    return o;
}
fs.writeFileSync('ext/_locales/en/messages.json', `${JSON.stringify(sortObj(en), null, 4)}\n`);
fs.writeFileSync('ext/_locales/ru/messages.json', `${JSON.stringify(sortObj(ru), null, 4)}\n`);
console.log('ok keys', Object.keys(en).length);
