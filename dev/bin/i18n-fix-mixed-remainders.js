#!/usr/bin/env node
import fs from 'node:fs';

const enPath = 'ext/_locales/en/messages.json';
const ruPath = 'ext/_locales/ru/messages.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));

/** @type {Record<string, string>} */
const fixes = {
    html_this_option_may_send_data_outside_of_yom:
        'Эта опция может отправлять данные за пределы Yomitan локальным приложениям, которые их запрашивают<span data-show-for-browser="firefox firefox-mobile"> (<a href="https://addons.mozilla.org/en-US/firefox/addon/yomitan/privacy/">Политика конфиденциальности</a>)</span>. <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">Ещё…</a>',
    html_this_option_may_send_search_query_data_o:
        'Эта опция может отправлять поисковый запрос за пределы Yomitan для разбора<span data-show-for-browser="firefox firefox-mobile"> (<a href="https://addons.mozilla.org/en-US/firefox/addon/yomitan/privacy/">Политика конфиденциальности</a>)</span>. <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">Ещё…</a>',
    html_native_keyboard_shortcuts_are_controlled_b:
        '<strong>Системные</strong> горячие клавиши управляются браузером и работают глобально в браузере<span data-show-for-browser="chrome edge"> или во всей системе</span>.',
    html_full_details_on_yomitan_s_use_of_data_tr:
        'Подробности о передаче данных Yomitan — в <a href="https://addons.mozilla.org/en-US/firefox/addon/yomitan/privacy/" data-i18n="ui_yomitan_privacy_policy">политике конфиденциальности Yomitan</a>.',
    html_full_details_on_yomitan_s_use_of_data_tr_2:
        'Подробности о передаче данных Yomitan — в <a href="https://addons.mozilla.org/en-US/firefox/addon/yomitan/privacy/">политике конфиденциальности Yomitan</a>.',
    html_to_comply_with_firefox_add_on_policies_y:
        'Чтобы соответствовать <a href="https://extensionworkshop.com/documentation/publish/add-on-policies/" data-i18n="ui_firefox_add_on_policies">политикам дополнений Firefox</a>, Yomitan должен получить ваше подтверждение согласия на возможную передачу данных.',
};

for (const [k, v] of Object.entries(fixes)) {
    if (!en[k]) {
        console.warn('missing en key', k);
        continue;
    }
    ru[k] = {
        message: v,
        description: en[k].description || 'UI string',
    };
    if (en[k].placeholders) {
        ru[k].placeholders = en[k].placeholders;
    }
}

const engWords = /\b(the|and|for|with|when|this|that|are|is|from|may|send|option|require|enabled|export|import|except|fragment|defaults|average|harmonic|controlled|browser|extension|dictionary|frequency|personally|identifying)\b/i;
/** @type {string[]} */
const mixed = [];
for (const [k, entry] of Object.entries(ru)) {
    const m = entry?.message || '';
    if (/[а-яА-ЯёЁ]/.test(m) && engWords.test(m)) {
        mixed.push(`${k}: ${m.slice(0, 120)}`);
    }
}

const sorted = Object.fromEntries(Object.keys(ru).sort().map((k) => [k, ru[k]]));
fs.writeFileSync(ruPath, `${JSON.stringify(sorted, null, 4)}\n`);
console.log('fixed', Object.keys(fixes).length);
console.log('remaining mixed-like', mixed.length);
for (const line of mixed.slice(0, 50)) {
    console.log(line);
}
