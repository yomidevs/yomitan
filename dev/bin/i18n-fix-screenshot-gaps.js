#!/usr/bin/env node
/**
 * Fix untranslated / broken Russian strings found during Firefox manual QA.
 */
import fs from 'node:fs';

const enPath = 'ext/_locales/en/messages.json';
const ruPath = 'ext/_locales/ru/messages.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));

/**
 * @param {string} key
 * @param {string} eng
 * @param {string} rus
 */
function set(key, eng, rus) {
    if (!en[key]) {
        en[key] = {message: eng, description: 'UI string'};
    } else if (typeof eng === 'string' && eng.length > 0 && en[key].message !== eng && !/[а-яА-ЯёЁ]/.test(eng)) {
        // keep existing en message as source of truth when key already exists
    }
    ru[key] = {
        message: rus,
        description: en[key].description || 'UI string',
    };
    if (en[key].placeholders) {
        ru[key].placeholders = en[key].placeholders;
    }
}

// --- Known broken / missing RU for keys already in catalog ---
const FIXES = {
    html_to_comply_with_firefox_add_on_policies_yom:
        'Чтобы соответствовать <a href="https://extensionworkshop.com/documentation/publish/add-on-policies/">политикам дополнений Firefox</a>, Yomitan должен получить ваше подтверждение, что вы согласны с любой передачей данных по умолчанию, которую выполняет расширение.',
    html_to_comply_with_firefox_add_on_policies_y:
        'Чтобы соответствовать <a href="https://extensionworkshop.com/documentation/publish/add-on-policies/">политикам дополнений Firefox</a>, Yomitan должен получить ваше подтверждение согласия на возможную передачу данных.',
    html_to_comply_with_firefox_add_on_policies_y_2:
        'Чтобы соответствовать <a href="https://extensionworkshop.com/documentation/publish/add-on-policies/">политикам дополнений Firefox</a>, Yomitan должен получить ваше подтверждение согласия на возможную передачу данных.',
    ui_yomitan_does_very_little_data_transmission_as_yo:
        'Yomitan почти не передаёт данные — они хранятся локально на устройстве. Yomitan не продаёт и не собирает пользовательские данные снаружи.',
    ui_the_only_place_data_transmission_is_done_by_defa:
        'По умолчанию данные уходят только при нажатии на значок аудио во всплывающем окне Yomitan для воспроизведения произношения термина; в этом случае запрос отправляется провайдеру аудио из настроек.',
    html_this_request_may_contain_the_term_readin:
        'В запросе могут быть термин, чтение и/или язык словарной статьи. <b>Персональные данные не отправляются.</b>',
    html_full_details_on_yomitan_s_use_of_data_tr:
        'Подробности о передаче данных Yomitan — в <a href="https://addons.mozilla.org/en-US/firefox/addon/yomitan/privacy/">политике конфиденциальности Yomitan</a>.',
    html_full_details_on_yomitan_s_use_of_data_tr_2:
        'Подробности о передаче данных Yomitan — в <a href="https://addons.mozilla.org/en-US/firefox/addon/yomitan/privacy/">политике конфиденциальности Yomitan</a>.',
    ui_decline_data_transmission_disable_audio_playback:
        'Отклонить передачу данных\n(отключить воспроизведение аудио)',
    ui_agree_to_data_transmission_enable_audio_playback:
        'Согласиться на передачу данных\n(включить воспроизведение аудио)',
    // chrome i18n doesn't use \n the same way for buttons - use space or keep as single line with br via html
    html_this_option_may_send_term_reading_and_or:
        'Эта опция может отправлять термин, чтение и/или язык за пределы Yomitan для получения аудио<span data-show-for-browser="firefox firefox-mobile"> (<a href="https://addons.mozilla.org/en-US/firefox/addon/yomitan/privacy/">Политика конфиденциальности</a>)</span>.',
    html_this_option_may_send_limited_information:
        'Эта опция может отправлять ограниченные сведения о текущей веб-странице, данные из словарных статей Yomitan и/или релевантные настройки пользователя во внешний Anki<span data-show-for-browser="firefox firefox-mobile"> (<a href="https://addons.mozilla.org/en-US/firefox/addon/yomitan/privacy/">Политика конфиденциальности</a>)</span>.',
    html_anki_requires_the_first_field_in_a_model:
        'Anki требует, чтобы первое поле модели было уникальным для карточки; поэтому для терминов рекомендуется маркер <code class="anki-field-marker">{expression}</code>, а для кандзи — <code class="anki-field-marker">{character}</code>.',
    html_change_the_url_of_the_ankiconnect_server:
        'Изменить URL сервера AnkiConnect. <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">Ещё…</a>',
    html_change_the_url_of_the_ankiconnect_server_m:
        'Изменить URL сервера AnkiConnect. <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">Ещё…</a>',
    html_you_can_try_to_export_the_entire_collectio:
        'Можно экспортировать всю коллекцию словарей в один большой файл и затем импортировать его в другом браузере или на другом устройстве. Такой импорт <strong>разрушителен</strong>: он заменит текущую базу словарей — действуйте осторожно. Операции могут занять много времени в зависимости от размера базы. <br><br> Инструкции по экспорту данных из старых установок Yomichan: <a href="https://github.com/yomidevs/yomichan-data-exporter" target="_blank" rel="noopener noreferrer">yomichan-data-exporter</a>.',
    html_when_enabled_yomitan_is_able_to_scan_tex:
        'Если включено, Yomitan может сканировать текст и показывать определения на локальных HTML-файлах по схеме <code>file://*</code>.',
    ui_when_enabled_yomitan_is_able_to_scan_text_and_sh:
        'Если включено, Yomitan может сканировать текст и показывать определения в приватных/инкогнито-окнах браузера.',
    ui_disabling_this_option_will_disallow_pronunciatio:
        'Отключение запретит воспроизведение произношения для найденных терминов.',
    ui_data_transmission_consent: 'Согласие на передачу данных',
    ui_data_transmission: 'Передача данных',
    ui_kana_reading_for_the_term_or_empty_for_terms_whe:
        'Чтение каной для термина или пусто, если выражение и есть чтение.',
    ui_the_harmonic_mean_of_frequency_data_for_the_curr:
        'Гармоническое среднее частотности текущего термина или кандзи. Без данных — ранг 9999999 (очень редкое употребление).',
    ui_the_harmonic_mean_of_frequency_data_for_the_curr_2:
        'Гармоническое среднее частотности текущего термина или кандзи. Без данных — 0 вхождений (минимум).',
    ui_the_average_of_frequency_data_for_the_current_te:
        'Средняя частотность текущего термина или кандзи. Без данных — ранг 9999999 (очень редкое употребление).',
    ui_the_average_of_frequency_data_for_the_current_te_2:
        'Средняя частотность текущего термина или кандзи. Без данных — 0 вхождений (минимум).',
    ui_term_expressed_as_kanji_with_furigana_displayed_:
        'Термин кандзи с фуриганой рядом в скобках. Пример: 日本語[にほんご].',
    ui_first_definition_for_the_term_except_the_diction:
        'Первое определение термина без метки словаря.',
    ui_list_of_definitions_for_the_term_except_the_dict:
        'Список определений термина без метки словаря.',
};

// Apply FIXES: update Russian for known keys (do not overwrite English with Russian)
for (const [key, rus] of Object.entries(FIXES)) {
    if (!en[key]) {
        console.warn('FIXES key missing in en:', key);
        continue;
    }
    ru[key] = {
        message: rus,
        description: en[key].description || 'UI string',
    };
    if (en[key].placeholders) {
        ru[key].placeholders = en[key].placeholders;
    }
}

// Keyboard shortcut bullets (keys already in HTML)
if (en.html_standard_keyboard_shortcuts_are_controlled) {
    set(
        'html_standard_keyboard_shortcuts_are_controlled',
        en.html_standard_keyboard_shortcuts_are_controlled.message,
        '<strong>Стандартные</strong> горячие клавиши управляются расширением: их можно добавлять, удалять и настраивать на страницах, где работает Yomitan.',
    );
}
if (en.html_native_keyboard_shortcuts_are_controlled_b) {
    set(
        'html_native_keyboard_shortcuts_are_controlled_b',
        en.html_native_keyboard_shortcuts_are_controlled_b.message,
        '<strong>Системные</strong> горячие клавиши управляются браузером и работают глобально в браузере.',
    );
}

// Button keys need HTML with <br> for line breaks in buttons - use i18n-html style messages
// chrome.i18n textContent won't parse <br> - use data-i18n-html on buttons or two spans
// Store messages with $1 style - for buttons we'll use data-i18n-html

// New keys for missing anki marker rows and keyboard bullets
set(
    'html_only_data_transmission_audio_default',
    '<b>The only place data transmission is done by default is when the audio icon in the Yomitan popup is clicked to play the audio for a term; in this case a request will be sent to the audio provider configured in your settings.</b>',
    '<b>По умолчанию данные уходят только при нажатии на значок аудио во всплывающем окне Yomitan для воспроизведения произношения термина; в этом случае запрос отправляется провайдеру аудио из настроек.</b>',
);
set(
    'html_decline_data_transmission_btn',
    'Decline data transmission<br>(disable audio playback)',
    'Отклонить передачу данных<br>(отключить воспроизведение аудио)',
);
set(
    'html_agree_data_transmission_btn',
    'Agree to data transmission<br>(enable audio playback)',
    'Согласиться на передачу данных<br>(включить воспроизведение аудио)',
);
set(
    'html_cloze_body_kana_desc',
    'Kana reading for <code class="anki-field-marker">{cloze-body}</code>.',
    'Чтение каной для <code class="anki-field-marker">{cloze-body}</code>.',
);
set(
    'html_furigana_above_desc',
    'Term expressed as kanji with furigana displayed above it. Example: <ruby>日本語<rt>にほんご</rt></ruby>.',
    'Термин кандзи с фуриганой сверху. Пример: <ruby>日本語<rt>にほんご</rt></ruby>.',
);
set(
    'html_furigana_plain_desc',
    'Term expressed as kanji with furigana displayed next to it in brackets. Example: 日本語[にほんご].',
    'Термин кандзи с фуриганой рядом в скобках. Пример: 日本語[にほんご].',
);
set(
    'html_glossary_plain_no_dict_desc',
    '<code class="anki-field-marker">{glossary-plain}</code> except the dictionary tag is omitted.',
    '<code class="anki-field-marker">{glossary-plain}</code>, но без метки словаря.',
);
set(
    'html_cloze_prefix_desc',
    'Fragment of the containing <code class="anki-field-marker">{sentence}</code> starting at the beginning of <code class="anki-field-marker">{sentence}</code> until the beginning of <code class="anki-field-marker">{cloze-body}</code>.',
    'Фрагмент <code class="anki-field-marker">{sentence}</code> от начала предложения до начала <code class="anki-field-marker">{cloze-body}</code>.',
);
set(
    'html_cloze_suffix_desc',
    'Fragment of the containing <code class="anki-field-marker">{sentence}</code> starting at the end of <code class="anki-field-marker">{cloze-body}</code> until the end of <code class="anki-field-marker">{sentence}</code>.',
    'Фрагмент <code class="anki-field-marker">{sentence}</code> от конца <code class="anki-field-marker">{cloze-body}</code> до конца предложения.',
);
set(
    'html_url_plain_desc',
    'The raw <code class="anki-field-marker">{url}</code> without HTML.',
    '«Сырой» <code class="anki-field-marker">{url}</code> без HTML.',
);
set(
    'html_standard_shortcuts_bullet',
    '<strong>Standard</strong> keyboard shortcuts are controlled by the extension, and can be added, removed, and configured to work on webpages that Yomitan functions on.',
    '<strong>Стандартные</strong> горячие клавиши управляются расширением: их можно добавлять, удалять и настраивать на страницах, где работает Yomitan.',
);
set(
    'html_native_shortcuts_bullet',
    '<strong>Native</strong> keyboard shortcuts are controlled by the web browser, and function globally within the web browser.',
    '<strong>Системные</strong> горячие клавиши управляются браузером и работают глобально в браузере.',
);
set(
    'html_audio_option_may_send_welcome',
    'This option may send term, reading, and/or language outside of Yomitan to fetch audio when the speaker icon is clicked. Personally identifying information is never sent<span data-show-for-browser="firefox firefox-mobile"> (<a href="https://addons.mozilla.org/en-US/firefox/addon/yomitan/privacy/">Privacy Policy</a>)</span>.',
    'Эта опция может отправлять термин, чтение и/или язык за пределы Yomitan для получения аудио при нажатии на значок динамика. Персональные данные не отправляются<span data-show-for-browser="firefox firefox-mobile"> (<a href="https://addons.mozilla.org/en-US/firefox/addon/yomitan/privacy/">Политика конфиденциальности</a>)</span>.',
);

// Ensure en messages exist for new keys with English source
for (const key of Object.keys(ru)) {
    if (!en[key] && ru[key]?.message) {
        // skip - set() already added both
    }
}

/**
 * @param {Record<string, unknown>} obj
 */
function sortObj(obj) {
    /** @type {Record<string, unknown>} */
    const o = {};
    for (const k of Object.keys(obj).sort()) { o[k] = obj[k]; }
    return o;
}

// --- HTML patches ---
let modals = fs.readFileSync('ext/templates-modals.html', 'utf8');
modals = modals
    .replace(
        '<p><b>The only place data transmission is done by default is when the audio icon in the Yomitan popup is clicked to play the audio for a term; in this case a request will be sent to the audio provider configured in your settings.</b></p>',
        '<p data-i18n-html="html_only_data_transmission_audio_default"><b>The only place data transmission is done by default is when the audio icon in the Yomitan popup is clicked to play the audio for a term; in this case a request will be sent to the audio provider configured in your settings.</b></p>',
    )
    .replace(
        '<button type="button" class="danger low-emphasis" data-modal-action="hide" id="decline-data-transmission">Decline data transmission<br>(disable audio playback)</button>',
        '<button type="button" class="danger low-emphasis" data-modal-action="hide" id="decline-data-transmission" data-i18n-html="html_decline_data_transmission_btn">Decline data transmission<br>(disable audio playback)</button>',
    )
    .replace(
        '<button type="button" class="low-emphasis" data-modal-action="hide" id="accept-data-transmission">Agree to data transmission<br>(enable audio playback)</button>',
        '<button type="button" class="low-emphasis" data-modal-action="hide" id="accept-data-transmission" data-i18n-html="html_agree_data_transmission_btn">Agree to data transmission<br>(enable audio playback)</button>',
    )
    .replace(
        '<td>Kana reading for <code class="anki-field-marker">{cloze-body}</code>.</td>',
        '<td data-i18n-html="html_cloze_body_kana_desc">Kana reading for <code class="anki-field-marker">{cloze-body}</code>.</td>',
    )
    .replace(
        `<td>
                            Term expressed as kanji with furigana displayed above it.
                            Example: <ruby>日本語<rt>にほんご</rt></ruby>.
                        </td>`,
        '<td data-i18n-html="html_furigana_above_desc">Term expressed as kanji with furigana displayed above it. Example: <ruby>日本語<rt>にほんご</rt></ruby>.</td>',
    )
    .replace(
        `<td>
                            Term expressed as kanji with furigana displayed next to it in brackets.
                            Example: 日本語[にほんご].
                        </td>`,
        '<td data-i18n-html="html_furigana_plain_desc">Term expressed as kanji with furigana displayed next to it in brackets. Example: 日本語[にほんご].</td>',
    )
    .replace(
        '<td><code class="anki-field-marker">{glossary-plain}</code> except the dictionary tag is omitted.</td>',
        '<td data-i18n-html="html_glossary_plain_no_dict_desc"><code class="anki-field-marker">{glossary-plain}</code> except the dictionary tag is omitted.</td>',
    )
    .replace(
        '<td>Fragment of the containing <code class="anki-field-marker">{sentence}</code> starting at the beginning of <code class="anki-field-marker">{sentence}</code> until the beginning of <code class="anki-field-marker">{cloze-body}</code>.</td>',
        '<td data-i18n-html="html_cloze_prefix_desc">Fragment of the containing <code class="anki-field-marker">{sentence}</code> starting at the beginning of <code class="anki-field-marker">{sentence}</code> until the beginning of <code class="anki-field-marker">{cloze-body}</code>.</td>',
    )
    .replace(
        '<td>Fragment of the containing <code class="anki-field-marker">{sentence}</code> starting at the end of <code class="anki-field-marker">{cloze-body}</code> until the end of <code class="anki-field-marker">{sentence}</code>.</td>',
        '<td data-i18n-html="html_cloze_suffix_desc">Fragment of the containing <code class="anki-field-marker">{sentence}</code> starting at the end of <code class="anki-field-marker">{cloze-body}</code> until the end of <code class="anki-field-marker">{sentence}</code>.</td>',
    )
    .replace(
        `<td>
                            Same as <code class="anki-field-marker">{glossary}</code>, but with entries from only a single dictionary.
                            The dictionary name will likely be modified, use the options from the ▼ dropdown.
                        </td>`,
        '<td data-i18n-html="html_single_glossary_dict_desc">Same as <code class="anki-field-marker">{glossary}</code>, but with entries from only a single dictionary. The dictionary name will likely be modified, use the options from the ▼ dropdown.</td>',
    )
    .replace(
        `<td>
                            See <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> and <code class="anki-field-marker">{glossary-brief}</code>.
                        </td>`,
        '<td data-i18n-html="html_see_single_glossary_brief">See <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> and <code class="anki-field-marker">{glossary-brief}</code>.</td>',
    )
    .replace(
        `<td>
                            See <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> and <code class="anki-field-marker">{glossary-no-dictionary}</code>.
                        </td>`,
        '<td data-i18n-html="html_see_single_glossary_no_dict">See <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> and <code class="anki-field-marker">{glossary-no-dictionary}</code>.</td>',
    )
    .replace(
        `<td>
                            See <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> and <code class="anki-field-marker">{glossary-plain}</code>.
                        </td>`,
        '<td data-i18n-html="html_see_single_glossary_plain">See <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> and <code class="anki-field-marker">{glossary-plain}</code>.</td>',
    )
    .replace(
        `<td>
                            See <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> and <code class="anki-field-marker">{glossary-plain-no-dictionary}</code>.
                        </td>`,
        '<td data-i18n-html="html_see_single_glossary_plain_no_dict">See <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> and <code class="anki-field-marker">{glossary-plain-no-dictionary}</code>.</td>',
    )
    .replace(
        `<td>
                            The harmonic mean of frequency data for the current term or kanji.<br>
                            Defaults to rank 9999999 when frequency data is not found, indicating extremely low rank-based term or kanji usage.
                        </td>`,
        '<td data-i18n-html="html_freq_harmonic_rank">The harmonic mean of frequency data for the current term or kanji.<br>Defaults to rank 9999999 when frequency data is not found, indicating extremely low rank-based term or kanji usage.</td>',
    )
    .replace(
        `<td>
                            The harmonic mean of frequency data for the current term or kanji.<br>
                            Defaults to 0 occurrences when frequency data is not found, the lowest possible occurrence-based term or kanji usage.
                        </td>`,
        '<td data-i18n-html="html_freq_harmonic_occurrence">The harmonic mean of frequency data for the current term or kanji.<br>Defaults to 0 occurrences when frequency data is not found, the lowest possible occurrence-based term or kanji usage.</td>',
    )
    .replace(
        `<td>
                            The average of frequency data for the current term or kanji.<br>
                            Defaults to rank 9999999 when frequency data is not found, indicating extremely low rank-based term or kanji usage.
                        </td>`,
        '<td data-i18n-html="html_freq_average_rank">The average of frequency data for the current term or kanji.<br>Defaults to rank 9999999 when frequency data is not found, indicating extremely low rank-based term or kanji usage.</td>',
    )
    .replace(
        `<td>
                            The average of frequency data for the current term or kanji.<br>
                            Defaults to 0 occurrences when frequency data is not found, the lowest possible occurrence-based term or kanji usage.
                        </td>`,
        '<td data-i18n-html="html_freq_average_occurrence">The average of frequency data for the current term or kanji.<br>Defaults to 0 occurrences when frequency data is not found, the lowest possible occurrence-based term or kanji usage.</td>',
    );

// url-plain if present as bare English
modals = modals.replace(
    /(<td><code class="anki-field-marker">\{url-plain\}<\/code><\/td>\s*)<td>([\s\S]*?)<\/td>/,
    '$1<td data-i18n-html="html_url_plain_desc">$2</td>',
);

set(
    'html_single_glossary_dict_desc',
    'Same as <code class="anki-field-marker">{glossary}</code>, but with entries from only a single dictionary. The dictionary name will likely be modified, use the options from the ▼ dropdown.',
    'То же, что <code class="anki-field-marker">{glossary}</code>, но только из одного словаря. Имя словаря, скорее всего, будет изменено — используйте пункты меню ▼.',
);
set(
    'html_see_single_glossary_brief',
    'See <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> and <code class="anki-field-marker">{glossary-brief}</code>.',
    'См. <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> и <code class="anki-field-marker">{glossary-brief}</code>.',
);
set(
    'html_see_single_glossary_no_dict',
    'See <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> and <code class="anki-field-marker">{glossary-no-dictionary}</code>.',
    'См. <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> и <code class="anki-field-marker">{glossary-no-dictionary}</code>.',
);
set(
    'html_see_single_glossary_plain',
    'See <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> and <code class="anki-field-marker">{glossary-plain}</code>.',
    'См. <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> и <code class="anki-field-marker">{glossary-plain}</code>.',
);
set(
    'html_see_single_glossary_plain_no_dict',
    'See <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> and <code class="anki-field-marker">{glossary-plain-no-dictionary}</code>.',
    'См. <code class="anki-field-marker">{single-glossary-DICT-NAME}</code> и <code class="anki-field-marker">{glossary-plain-no-dictionary}</code>.',
);
set(
    'html_freq_harmonic_rank',
    'The harmonic mean of frequency data for the current term or kanji.<br>Defaults to rank 9999999 when frequency data is not found, indicating extremely low rank-based term or kanji usage.',
    'Гармоническое среднее частотности текущего термина или кандзи.<br>Без данных — ранг 9999999 (очень редкое употребление по рангу).',
);
set(
    'html_freq_harmonic_occurrence',
    'The harmonic mean of frequency data for the current term or kanji.<br>Defaults to 0 occurrences when frequency data is not found, the lowest possible occurrence-based term or kanji usage.',
    'Гармоническое среднее частотности текущего термина или кандзи.<br>Без данных — 0 вхождений (минимум).',
);
set(
    'html_freq_average_rank',
    'The average of frequency data for the current term or kanji.<br>Defaults to rank 9999999 when frequency data is not found, indicating extremely low rank-based term or kanji usage.',
    'Средняя частотность текущего термина или кандзи.<br>Без данных — ранг 9999999 (очень редкое употребление по рангу).',
);
set(
    'html_freq_average_occurrence',
    'The average of frequency data for the current term or kanji.<br>Defaults to 0 occurrences when frequency data is not found, the lowest possible occurrence-based term or kanji usage.',
    'Средняя частотность текущего термина или кандзи.<br>Без данных — 0 вхождений (минимум).',
);

// Fix frequency harmonic cells that already have data-i18n but wrong ru
// (done via FIXES)

fs.writeFileSync('ext/templates-modals.html', modals);

// settings.html keyboard bullets already use data-i18n-html keys; RU fixed via set() above
let settings = fs.readFileSync('ext/settings.html', 'utf8');
fs.writeFileSync('ext/settings.html', settings);

// permissions.html
let perm = fs.readFileSync('ext/permissions.html', 'utf8');
perm = perm.replace(
    'When enabled, Yomitan is able to scan text and show definitions on local HTML files located using the <code>file://*</code> scheme.',
    (m) => {
        // wrap parent if needed
        return m;
    },
);
// Tag description if not tagged
if (!perm.includes('html_when_enabled_yomitan_is_able_to_scan_tex') && perm.includes('file://*')) {
    perm = perm.replace(
        /When enabled, Yomitan is able to scan text and show definitions on local HTML files located using the <code[^>]*>file:\/\/\*<\/code> scheme\./,
        '<span data-i18n-html="html_when_enabled_yomitan_is_able_to_scan_tex">When enabled, Yomitan is able to scan text and show definitions on local HTML files located using the <code>file://*</code> scheme.</span>',
    );
}
fs.writeFileSync('ext/permissions.html', perm);

// welcome.html audio consent description
let welcome = fs.readFileSync('ext/welcome.html', 'utf8');
if (welcome.includes('This option may send term, reading, and/or language outside of Yomitan to fetch audio when the speaker icon is clicked')) {
    welcome = welcome.replace(
        /This option may send term, reading, and\/or language outside of Yomitan to fetch audio when the speaker icon is clicked\. Personally identifying information is never sent<span data-show-for-browser="firefox firefox-mobile"> \(<a data-i18n="ui_privacy_policy" href="https:\/\/addons\.mozilla\.org\/en-US\/firefox\/addon\/yomitan\/privacy\/">Privacy Policy<\/a>\)<\/span>\./,
        '<span data-i18n-html="html_audio_option_may_send_welcome">This option may send term, reading, and/or language outside of Yomitan to fetch audio when the speaker icon is clicked. Personally identifying information is never sent<span data-show-for-browser="firefox firefox-mobile"> (<a href="https://addons.mozilla.org/en-US/firefox/addon/yomitan/privacy/">Privacy Policy</a>)</span>.</span>',
    );
}
fs.writeFileSync('ext/welcome.html', welcome);

// Button labels (textContent fallbacks)
if (en.ui_decline_data_transmission_disable_audio_playback) {
    ru.ui_decline_data_transmission_disable_audio_playback = {
        message: 'Отклонить передачу данных (отключить аудио)',
        description: en.ui_decline_data_transmission_disable_audio_playback.description || 'UI string',
    };
}
if (en.ui_agree_to_data_transmission_enable_audio_playback) {
    ru.ui_agree_to_data_transmission_enable_audio_playback = {
        message: 'Согласиться на передачу данных (включить аудио)',
        description: en.ui_agree_to_data_transmission_enable_audio_playback.description || 'UI string',
    };
}

// Ensure en source strings exist for newly introduced keys
const ensureEn = {
    html_only_data_transmission_audio_default: '<b>The only place data transmission is done by default is when the audio icon in the Yomitan popup is clicked to play the audio for a term; in this case a request will be sent to the audio provider configured in your settings.</b>',
    html_decline_data_transmission_btn: 'Decline data transmission<br>(disable audio playback)',
    html_agree_data_transmission_btn: 'Agree to data transmission<br>(enable audio playback)',
    html_cloze_body_kana_desc: 'Kana reading for <code class="anki-field-marker">{cloze-body}</code>.',
    html_furigana_above_desc: 'Term expressed as kanji with furigana displayed above it. Example: <ruby>日本語<rt>にほんご</rt></ruby>.',
    html_furigana_plain_desc: 'Term expressed as kanji with furigana displayed next to it in brackets. Example: 日本語[にほんご].',
    html_glossary_plain_no_dict_desc: '<code class="anki-field-marker">{glossary-plain}</code> except the dictionary tag is omitted.',
    html_cloze_prefix_desc: 'Fragment of the containing <code class="anki-field-marker">{sentence}</code> starting at the beginning of <code class="anki-field-marker">{sentence}</code> until the beginning of <code class="anki-field-marker">{cloze-body}</code>.',
    html_cloze_suffix_desc: 'Fragment of the containing <code class="anki-field-marker">{sentence}</code> starting at the end of <code class="anki-field-marker">{cloze-body}</code> until the end of <code class="anki-field-marker">{sentence}</code>.',
    html_url_plain_desc: 'The raw <code class="anki-field-marker">{url}</code> without HTML.',
    html_standard_shortcuts_bullet: '<strong>Standard</strong> keyboard shortcuts are controlled by the extension, and can be added, removed, and configured to work on webpages that Yomitan functions on.',
    html_native_shortcuts_bullet: '<strong>Native</strong> keyboard shortcuts are controlled by the web browser, and function globally within the web browser.',
    html_audio_option_may_send_welcome: 'This option may send term, reading, and/or language outside of Yomitan to fetch audio when the speaker icon is clicked. Personally identifying information is never sent<span data-show-for-browser="firefox firefox-mobile"> (<a href="https://addons.mozilla.org/en-US/firefox/addon/yomitan/privacy/">Privacy Policy</a>)</span>.',
};
for (const [key, eng] of Object.entries(ensureEn)) {
    if (!en[key]) {
        en[key] = {message: eng, description: 'UI string'};
    }
}

fs.writeFileSync(enPath, `${JSON.stringify(sortObj(en), null, 4)}\n`);
fs.writeFileSync(ruPath, `${JSON.stringify(sortObj(ru), null, 4)}\n`);
console.log('keys', Object.keys(en).length, Object.keys(ru).length);
console.log('consent btn', modals.includes('html_decline_data_transmission_btn'));
console.log('cloze kana', modals.includes('html_cloze_body_kana_desc'));
console.log('file url', perm.includes('html_when_enabled_yomitan_is_able_to_scan_tex'));
console.log('welcome audio', welcome.includes('html_audio_option_may_send_welcome'));
