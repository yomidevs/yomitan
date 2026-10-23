#!/usr/bin/env node
import fs from 'node:fs';

const en = JSON.parse(fs.readFileSync('ext/_locales/en/messages.json', 'utf8'));
const ru = JSON.parse(fs.readFileSync('ext/_locales/ru/messages.json', 'utf8'));

/**
 * @param {string} key
 * @param {string} e
 * @param {string} r
 */
function put(key, e, r) {
    en[key] = {message: e, description: 'Mixed HTML UI'};
    ru[key] = {message: r, description: 'Mixed HTML UI'};
}

let m = fs.readFileSync('ext/templates-modals.html', 'utf8');

const marker = 'html_replacement_tags_term_reading';
const mi = m.indexOf(marker);
if (mi >= 0) {
    const pStart = m.lastIndexOf('<p', mi);
    const pEnd = m.indexOf('</p>', mi) + 4;
    if (pStart >= 0 && pEnd > pStart) {
        let block = m.slice(pStart, pEnd);
        if (!block.includes('data-i18n-html="html_audio_custom_url_replacement_para"')) {
            let inner = block.replace(/^<p[^>]*>/, '').replace(/<\/p>\s*$/, '');
            inner = inner
                .replace(/<span data-i18n-html="html_replacement_tags_term_reading">/g, '')
                .replace(/<\/span>/g, '')
                .replace(/\s*data-i18n(?:-html)?="[^"]*"/g, '');
            const enHtml = inner.trim().replace(/\s+/g, ' ');
            put(
                'html_audio_custom_url_replacement_para',
                enHtml,
                enHtml
                    .replace('A custom URL can be used to play audio from any URL.', 'Свой URL можно использовать для аудио с любого адреса.')
                    .replace('The replacement tags', 'Подстановочные теги')
                    .replace('can be used to specify which term and reading is being looked up.', 'задают термин и чтение для запроса.')
                    .replace('is also available for sources that require an iso language string.', 'также доступен для источников, которым нужен ISO-код языка.'),
            );
            const newBlock = `<p data-i18n-html="html_audio_custom_url_replacement_para">${inner.trim()}</p>`;
            m = m.slice(0, pStart) + newBlock + m.slice(pEnd);
        }
    }
}

const jsonUrl = 'http://localhost/audio.json?term={term}&amp;reading={reading}';
const ei = m.indexOf(jsonUrl);
if (ei >= 0) {
    const ps = m.lastIndexOf('<p', ei);
    const pe = m.indexOf('</p>', ei) + 4;
    if (ps >= 0 && pe > ps) {
        let block = m.slice(ps, pe);
        if (!block.includes('data-i18n-html=')) {
            put(
                'html_example_audio_json_url',
                'Example:<br> <a tabindex="0" data-select-on-click="">http://localhost/audio.json?term={term}&amp;reading={reading}</a>',
                'Пример:<br> <a tabindex="0" data-select-on-click="">http://localhost/audio.json?term={term}&amp;reading={reading}</a>',
            );
            block = block.replace('<p>', '<p data-i18n-html="html_example_audio_json_url">');
            m = m.slice(0, ps) + block + m.slice(pe);
        }
    }
}

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
console.log({
    para: m.includes('html_audio_custom_url_replacement_para'),
    json: m.includes('html_example_audio_json_url'),
    keys: Object.keys(en).length,
});
