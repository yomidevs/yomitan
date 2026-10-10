#!/usr/bin/env node
import fs from 'node:fs';

const enPath = 'ext/_locales/en/messages.json';
const ruPath = 'ext/_locales/ru/messages.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));

/**
 * @param {string} key
 * @param {string} eng
 * @param {string} rus
 * @param {Record<string, unknown>|undefined} [placeholders]
 */
function set(key, eng, rus, placeholders) {
    if (!en[key]) {
        en[key] = {message: eng, description: 'UI string'};
        if (placeholders) { en[key].placeholders = placeholders; }
    } else if (placeholders && !en[key].placeholders) {
        en[key].placeholders = placeholders;
    }
    ru[key] = {
        message: rus,
        description: en[key].description || 'UI string',
    };
    if (en[key].placeholders) {
        ru[key].placeholders = en[key].placeholders;
    }
}

set(
    'html_yomitan_is_using_approximately',
    'Yomitan is using approximately <span class="storage-usage">?</span> of <span class="storage-quota">?</span>.',
    'Yomitan использует примерно <span class="storage-usage">?</span> из <span class="storage-quota">?</span>.',
);

set(
    'html_yomitan_has_the_ability_to_communicate_w',
    en.html_yomitan_has_the_ability_to_communicate_w?.message ||
        'Yomitan has the ability to communicate with an optional native messaging component in order to support parsing large blocks of Japanese text using <a data-i18n="ui_mecab" href="https://en.wikipedia.org/wiki/MeCab" target="_blank" rel="noopener noreferrer">MeCab</a>. The installation of this component is optional and is not included by default.',
    'Yomitan может взаимодействовать с необязательным компонентом native messaging для разбора больших фрагментов японского текста с помощью <a data-i18n="ui_mecab" href="https://en.wikipedia.org/wiki/MeCab" target="_blank" rel="noopener noreferrer">MeCab</a>. Установка этого компонента необязательна и по умолчанию не выполняется.',
);

// Ensure EN source for the key is clean English (don't leave mixed if any)
if (en.html_yomitan_has_the_ability_to_communicate_w && /необязательно/.test(en.html_yomitan_has_the_ability_to_communicate_w.message)) {
    en.html_yomitan_has_the_ability_to_communicate_w.message =
        'Yomitan has the ability to communicate with an optional native messaging component in order to support parsing large blocks of Japanese text using <a data-i18n="ui_mecab" href="https://en.wikipedia.org/wiki/MeCab" target="_blank" rel="noopener noreferrer">MeCab</a>. The installation of this component is optional and is not included by default.';
}

set('ui_card_format_expression', 'Expression', 'Выражение');
set('ui_card_format_reading', 'Reading', 'Чтение');
set('ui_card_format_kanji', 'Kanji', 'Кандзи');
set('ui_card_format_hanzi', 'Hanzi', 'Ханьцзы');
set('ui_card_format_n', 'Format $1$', 'Формат $1$', {
    1: {content: '$1', example: '1'},
});
set('ui_add_card_format_note', 'Add $1$ note', 'Добавить заметку «$1$»', {
    1: {content: '$1', example: 'Expression'},
});
set('ui_card_format_note', '$1$ note', 'заметка «$1$»', {
    1: {content: '$1', example: 'Expression'},
});

// Related MeCab install blurbs if broken
if (ru.html_in_order_for_yomitan_to_use_it_both_meca) {
    // key may differ
}

const mecabKeys = Object.keys(en).filter((k) => /mecab|native messaging/i.test(en[k].message || ''));
for (const k of mecabKeys) {
    const m = ru[k]?.message || '';
    if (m.includes('необязательно') && /native messaging component in order/i.test(m)) {
        // already fixed via set above for main key
    }
    if (m.includes('здесь') && m.includes('must be installed')) {
        if (k.includes('mecab') || /MeCab and a native/i.test(en[k].message)) {
            ru[k] = {
                message: 'Чтобы Yomitan мог это использовать, нужно установить MeCab и компонент native messaging. Инструкция: <a href="https://github.com/yomidevs/yomitan-mecab-installer/blob/master/README.md" target="_blank" rel="noopener noreferrer">здесь</a>.',
                description: en[k].description || 'UI string',
            };
        }
    }
    if (m.includes('здесь') && /Yomitan API/i.test(en[k].message)) {
        ru[k] = {
            message: 'Чтобы активировать Yomitan API, нужно установить компонент native messaging. Инструкция: <a href="https://github.com/yomidevs/yomitan-api/blob/master/README.md" target="_blank" rel="noopener noreferrer">здесь</a>.',
            description: en[k].description || 'UI string',
        };
    }
}

// Fix optional spacing display: use " (необязательно)" with leading space already in HTML
// ui_optional is fine as "(необязательно)"

function sortObj(/** @type {Record<string, unknown>} */ obj) {
    return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

fs.writeFileSync(enPath, `${JSON.stringify(sortObj(en), null, 4)}\n`);
fs.writeFileSync(ruPath, `${JSON.stringify(sortObj(ru), null, 4)}\n`);
console.log('keys', Object.keys(en).length, Object.keys(ru).length);
console.log('storage', ru.html_yomitan_is_using_approximately?.message);
console.log('native', ru.html_yomitan_has_the_ability_to_communicate_w?.message?.slice(0, 80));
console.log('expression', ru.ui_card_format_expression?.message);
