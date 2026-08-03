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
s = s.replaceAll(
    '<div class="settings-item-label">Delay <span data-i18n="ui_in_milliseconds" class="light">(in milliseconds)</span></div>',
    '<div class="settings-item-label" data-i18n-html="html_delay_in_milliseconds">Delay <span class="light">(in milliseconds)</span></div>',
);
put(
    'html_delay_in_milliseconds',
    'Delay <span class="light">(in milliseconds)</span>',
    'Задержка <span class="light">(в миллисекундах)</span>',
);

if (!s.includes('html_japanese_only_more')) {
    s = s.replace(
        'Japanese only.\n                        <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">More…</a>',
        '<span data-i18n-html="html_japanese_only_more">Japanese only. <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">More…</a></span>',
    );
}
put(
    'html_japanese_only_more',
    'Japanese only. <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">More…</a>',
    'Только японский. <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">Ещё…</a>',
);

if (!s.includes('html_parse_sentences_using_mecab_link')) {
    s = s.replace(
        'Parse sentences using <a data-i18n="ui_mecab" href="https://en.wikipedia.org/wiki/MeCab" target="_blank" rel="noopener noreferrer">MeCab</a>',
        '<span data-i18n-html="html_parse_sentences_using_mecab_link">Parse sentences using <a href="https://en.wikipedia.org/wiki/MeCab" target="_blank" rel="noopener noreferrer">MeCab</a></span>',
    );
}
put(
    'html_parse_sentences_using_mecab_link',
    'Parse sentences using <a href="https://en.wikipedia.org/wiki/MeCab" target="_blank" rel="noopener noreferrer">MeCab</a>',
    'Разбирать предложения с помощью <a href="https://en.wikipedia.org/wiki/MeCab" target="_blank" rel="noopener noreferrer">MeCab</a>',
);
fs.writeFileSync('ext/settings.html', s);

let m = fs.readFileSync('ext/templates-modals.html', 'utf8');
m = m.replace(
    '<p>Are you sure you want to delete <strong data-i18n="ui_all_dictionaries">all dictionaries</strong>?</p>',
    '<p data-i18n-html="html_confirm_delete_all_dictionaries">Are you sure you want to delete <strong>all dictionaries</strong>?</p>',
);
put(
    'html_confirm_delete_all_dictionaries',
    'Are you sure you want to delete <strong>all dictionaries</strong>?',
    'Удалить <strong>все словари</strong>?',
);

/** @type {Record<string, [string, string, string]>} */
const collapse = {
    ui_not_collapsible: [
        'html_mode_not_collapsible',
        'Not collapsible',
        'Не сворачивается',
    ],
    ui_collapsed: [
        'html_mode_collapsed',
        'Collapsed',
        'Свёрнуто',
    ],
    ui_expanded: [
        'html_mode_expanded',
        'Expanded',
        'Развёрнуто',
    ],
    ui_force_collapsed: [
        'html_mode_force_collapsed',
        'Force collapsed',
        'Всегда свёрнуто',
    ],
    ui_force_expanded: [
        'html_mode_force_expanded',
        'Force expanded',
        'Всегда развёрнуто',
    ],
};

m = m.replace(
    /<li>\s*<strong data-i18n="(ui_not_collapsible|ui_collapsed|ui_expanded|ui_force_collapsed|ui_force_expanded)">([^<]+)<\/strong>\s*-\s*([^<]+)<\/li>/g,
    (full, uiKey, title, rest) => {
        const info = collapse[uiKey];
        if (!info) { return full; }
        const [htmlKey, enTitle, ruTitle] = info;
        const enRest = rest.trim();
        const enMsg = `<strong>${enTitle}</strong> - ${enRest}`;
        // Translate rest heuristically
        let ruRest = enRest
            .replace('Definitions will not be collapsed.', 'Определения не сворачиваются.')
            .replace('Definitions will show a collapse button if their size exceeds the max height, and they will start collapsed.', 'Кнопка сворачивания, если высота больше максимума; изначально свёрнуты.')
            .replace('Definitions will show a collapse button if their size exceeds the max height, and they will start expanded.', 'Кнопка сворачивания, если высота больше максимума; изначально развёрнуты.')
            .replace('Definitions will always show a collapse button, and they will be collapsed by default.', 'Всегда кнопка сворачивания; по умолчанию свёрнуты.')
            .replace('Definitions will always show a collapse button, and they will be expanded by default.', 'Всегда кнопка сворачивания; по умолчанию развёрнуты.')
            .replace('Definitions will show a collapse button if their size exceeds the specified line count, and they will start collapsed.', 'Кнопка сворачивания при превышении лимита строк; изначально свёрнуты.')
            .replace('Definitions will show a collapse button if their size exceeds the specified line count, and they will start expanded.', 'Кнопка сворачивания при превышении лимита строк; изначально развёрнуты.')
            .replace('Definitions will always show a collapse button, and they will start collapsed.', 'Всегда кнопка сворачивания; изначально свёрнуты.')
            .replace('Definitions will always show a collapse button, and they will start expanded.', 'Всегда кнопка сворачивания; изначально развёрнуты.');
        put(htmlKey, enMsg, `<strong>${ruTitle}</strong> - ${ruRest}`);
        return `<li data-i18n-html="${htmlKey}"><strong>${enTitle}</strong> - ${enRest}</li>`;
    },
);

if (!m.includes('html_replacement_tags_term_reading')) {
    m = m.replace(
        'The replacement tags <code data-select-on-click="">{term}</code> and <code data-select-on-click="">{reading}</code>',
        '<span data-i18n-html="html_replacement_tags_term_reading">The replacement tags <code data-select-on-click="">{term}</code> and <code data-select-on-click="">{reading}</code></span>',
    );
}
put(
    'html_replacement_tags_term_reading',
    'The replacement tags <code data-select-on-click="">{term}</code> and <code data-select-on-click="">{reading}</code>',
    'Подстановочные теги <code data-select-on-click="">{term}</code> и <code data-select-on-click="">{reading}</code>',
);

m = m.replace(
    /<li>Open <a tabindex="0" data-special-url="edge:\/\/extensions\/shortcuts" data-i18n="ui_edge_extensions_shortcuts">edge:\/\/extensions\/shortcuts<\/a> in a new tab\.<\/li>/,
    '<li data-i18n-html="html_open_edge_shortcuts_tab">Open <a tabindex="0" data-special-url="edge://extensions/shortcuts">edge://extensions/shortcuts</a> in a new tab.</li>',
);
put(
    'html_open_edge_shortcuts_tab',
    'Open <a tabindex="0" data-special-url="edge://extensions/shortcuts">edge://extensions/shortcuts</a> in a new tab.',
    'Откройте <a tabindex="0" data-special-url="edge://extensions/shortcuts">edge://extensions/shortcuts</a> в новой вкладке.',
);

m = m.replaceAll(
    'Find the <em data-i18n="extensionActionTitle">Yomitan</em> section and configure the shortcuts.',
    '<span data-i18n-html="html_find_yomitan_configure_shortcuts">Find the <em>Yomitan</em> section and configure the shortcuts.</span>',
);
m = m.replaceAll(
    'Find the <em>Yomitan</em> section and configure the shortcuts.',
    '<span data-i18n-html="html_find_yomitan_configure_shortcuts">Find the <em>Yomitan</em> section and configure the shortcuts.</span>',
);
// avoid double-wrap
m = m.replaceAll(
    '<span data-i18n-html="html_find_yomitan_configure_shortcuts"><span data-i18n-html="html_find_yomitan_configure_shortcuts">Find the <em>Yomitan</em> section and configure the shortcuts.</span></span>',
    '<span data-i18n-html="html_find_yomitan_configure_shortcuts">Find the <em>Yomitan</em> section and configure the shortcuts.</span>',
);
put(
    'html_find_yomitan_configure_shortcuts',
    'Find the <em>Yomitan</em> section and configure the shortcuts.',
    'Найдите раздел <em>Yomitan</em> и настройте горячие клавиши.',
);

m = m.replace(
    /Example:<br>\s*<a tabindex="0" data-select-on-click="">http:\/\/localhost\/audio\.json\?term=\{term\}&reading=\{reading\}<\/a>/,
    '<span data-i18n-html="html_example_audio_json_url">Example:<br> <a tabindex="0" data-select-on-click="">http://localhost/audio.json?term={term}&reading={reading}</a></span>',
);
put(
    'html_example_audio_json_url',
    'Example:<br> <a tabindex="0" data-select-on-click="">http://localhost/audio.json?term={term}&reading={reading}</a>',
    'Пример:<br> <a tabindex="0" data-select-on-click="">http://localhost/audio.json?term={term}&reading={reading}</a>',
);

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

console.log('done', {
    delay: (s.match(/html_delay_in_milliseconds/g) || []).length,
    jp: s.includes('html_japanese_only_more'),
    mecab: s.includes('html_parse_sentences_using_mecab_link'),
    del: m.includes('html_confirm_delete_all_dictionaries'),
    force: m.includes('html_mode_force_expanded'),
    edge: m.includes('html_open_edge_shortcuts_tab'),
    find: (m.match(/html_find_yomitan_configure_shortcuts/g) || []).length,
    keys: Object.keys(en).length,
});
