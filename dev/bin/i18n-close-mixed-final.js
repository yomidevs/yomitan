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

let s = fs.readFileSync('ext/settings.html', 'utf8');
s = s.replace(
    `<div class="settings-item-description">
                        Japanese only.
                        <a data-i18n="ui_more" tabindex="0" class="more-toggle more-only" data-parent-distance="4">More…</a>
                    </div>`,
    `<div class="settings-item-description" data-i18n-html="html_japanese_only_more">Japanese only. <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">More…</a></div>`,
);
put(
    'html_japanese_only_more',
    'Japanese only. <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">More…</a>',
    'Только японский. <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">Ещё…</a>',
);
fs.writeFileSync('ext/settings.html', s);

let m = fs.readFileSync('ext/templates-modals.html', 'utf8');

// Full custom URL audio paragraph (mp3 variant)
const audioRe = /<p>\s*A custom URL can be used to play audio from any URL\.<br>[\s\S]*?<\/p>/g;
m = m.replace(audioRe, (block) => {
    if (block.includes('data-i18n-html="html_custom_url_audio_full"')) { return block; }
    let inner = block.replace(/^<p[^>]*>/, '').replace(/<\/p>$/, '');
    inner = inner
        .replace(/\s*data-i18n(?:-html)?="[^"]*"/g, '')
        .replace(/<\/?span[^>]*>/g, '');
    const enHtml = inner.trim().replace(/\s+/g, ' ');
    const ruHtml = enHtml
        .replace('A custom URL can be used to play audio from any URL.', 'Свой URL можно использовать для аудио с любого адреса.')
        .replace('The replacement tags', 'Подстановочные теги')
        .replace('can be used to specify which term and reading is being looked up.', 'задают термин и чтение для запроса.')
        .replace('Example:', 'Пример:');
    put('html_custom_url_audio_full', enHtml, ruHtml);
    return `<p data-i18n-html="html_custom_url_audio_full">${inner.trim()}</p>`;
});

// JSON custom URL paragraph
const jsonRe = /<p>\s*A custom URL to a JSON file[\s\S]*?<\/p>/g;
m = m.replace(jsonRe, (block) => {
    if (block.includes('data-i18n-html=')) { return block; }
    let inner = block.replace(/^<p[^>]*>/, '').replace(/<\/p>$/, '');
    inner = inner.replace(/\s*data-i18n(?:-html)?="[^"]*"/g, '').replace(/<\/?span[^>]*>/g, '');
    const enHtml = inner.trim().replace(/\s+/g, ' ');
    const ruHtml = enHtml
        .replace('A custom URL to a JSON file which lists one or more audio URLs for a given term.', 'Свой URL JSON-файла со списком URL аудио для термина.')
        .replace('The format of the file is described', 'Формат файла описан')
        .replace('Example:', 'Пример:');
    put('html_custom_url_json_audio_full', enHtml, ruHtml);
    return `<p data-i18n-html="html_custom_url_json_audio_full">${inner.trim()}</p>`;
});

// Fix collapse mode RU messages with whitespace
for (const key of Object.keys(ru)) {
    if (!key.startsWith('html_mode_')) { continue; }
    let msg = ru[key].message;
    msg = msg
        .replace(/Definitions will not be collapsed\./g, 'Определения не сворачиваются.')
        .replace(/Definitions will show a collapse button if their size exceeds the max height,\s*and they will start collapsed\./g, 'Кнопка сворачивания, если высота больше максимума; изначально свёрнуты.')
        .replace(/Definitions will show a collapse button if their size exceeds the max height,\s*and they will start expanded\./g, 'Кнопка сворачивания, если высота больше максимума; изначально развёрнуты.')
        .replace(/Definitions will always show a collapse button,\s*and they will be collapsed by default\./g, 'Всегда кнопка сворачивания; по умолчанию свёрнуты.')
        .replace(/Definitions will always show a collapse button,\s*and they will be expanded by default\./g, 'Всегда кнопка сворачивания; по умолчанию развёрнуты.')
        .replace(/Definitions will show a collapse button if their size exceeds the specified line count,\s*and they will start collapsed\./g, 'Кнопка сворачивания при превышении лимита строк; изначально свёрнуты.')
        .replace(/Definitions will show a collapse button if their size exceeds the specified line count,\s*and they will start expanded\./g, 'Кнопка сворачивания при превышении лимита строк; изначально развёрнуты.')
        .replace(/Definitions will always show a collapse button,\s*and they will start collapsed\./g, 'Всегда кнопка сворачивания; изначально свёрнуты.')
        .replace(/Definitions will always show a collapse button,\s*and they will start expanded\./g, 'Всегда кнопка сворачивания; изначально развёрнуты.');
    ru[key].message = msg;
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
    jp: s.includes('html_japanese_only_more'),
    audio: m.includes('html_custom_url_audio_full'),
    json: m.includes('html_custom_url_json_audio_full'),
    forceRu: ru.html_mode_force_expanded?.message,
    keys: Object.keys(en).length,
});
