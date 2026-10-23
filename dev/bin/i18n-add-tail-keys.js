#!/usr/bin/env node
import fs from 'node:fs';

const en = JSON.parse(fs.readFileSync('ext/_locales/en/messages.json', 'utf8'));
const ru = JSON.parse(fs.readFileSync('ext/_locales/ru/messages.json', 'utf8'));

/**
 * @param {string} key
 * @param {string} e
 * @param {string} r
 * @param {Record<string, unknown>} [extra]
 */
function add(key, e, r, extra = {}) {
    en[key] = {message: e, description: 'JS/UI string', ...extra};
    ru[key] = {message: r, description: 'JS/UI string', ...extra};
}

add('js_recSetting', 'Setting ', 'Параметр ');
add('js_recEquals', ' = ', ' = ');
add('js_recDeleting', 'Deleting ', 'Удаление ');
add('js_recSwapping', 'Swapping ', 'Обмен ');
add('js_recAnd', ' and ', ' и ');
add('js_recSplicing', 'Splicing ', 'Изменение ');

const ph3 = {
    1: {content: '$1', example: '0'},
    2: {content: '$2', example: '1'},
    3: {content: '$3', example: '2'},
};
en.js_recSpliceDetail = {
    message: ' at $1$ deleting $2$ items and inserting $3$ items',
    description: 'JS/UI string',
    placeholders: ph3,
};
ru.js_recSpliceDetail = {
    message: ' с позиции $1$: удалить $2$, вставить $3$',
    description: 'JS/UI string',
    placeholders: ph3,
};

const ph1 = {1: {content: '$1', example: '2'}};
en.js_recPushing = {
    message: 'Pushing $1$ items to ',
    description: 'JS/UI string',
    placeholders: ph1,
};
ru.js_recPushing = {
    message: 'Добавление $1$ элем. в ',
    description: 'JS/UI string',
    placeholders: ph1,
};

add('js_ankiConnectFailedAddCards', 'Ankiconnect error: Failed to add cards', 'Ошибка AnkiConnect: не удалось добавить карточки');
en.js_ankiConnectError = {
    message: 'Ankiconnect error: $1$',
    description: 'JS/UI string',
    placeholders: {1: {content: '$1', example: 'msg'}},
};
ru.js_ankiConnectError = {
    message: 'Ошибка AnkiConnect: $1$',
    description: 'JS/UI string',
    placeholders: {1: {content: '$1', example: 'msg'}},
};

add('popupPreview_pageTitle', 'Yomitan Popup Preview', 'Yomitan — предпросмотр окна');
add(
    'popupPreview_placeholder',
    'This page uses the dictionaries you have installed in order to show a preview. If you see this message, make sure you have a dictionary installed.',
    'На этой странице для предпросмотра используются установленные словари. Если вы видите это сообщение, установите словарь.',
);

/**
 * @param {Record<string, unknown>} obj
 */
function sortObj(obj) {
    /** @type {Record<string, unknown>} */
    const o = {};
    for (const k of Object.keys(obj).sort()) {
        o[k] = obj[k];
    }
    return o;
}

fs.writeFileSync('ext/_locales/en/messages.json', `${JSON.stringify(sortObj(en), null, 4)}\n`);
fs.writeFileSync('ext/_locales/ru/messages.json', `${JSON.stringify(sortObj(ru), null, 4)}\n`);
console.log('total keys', Object.keys(en).length);
