#!/usr/bin/env node
/**
 * Direct key→RU overrides for remaining untranslated UI messages.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const enPath = path.join(root, 'ext', '_locales', 'en', 'messages.json');
const ruPath = path.join(root, 'ext', '_locales', 'ru', 'messages.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));

/**
 * Full Russian message bodies for specific keys (HTML preserved from EN where needed).
 * When value is a function, it receives the English message.
 * @type {Record<string, string | ((en: string) => string)>}
 */
const KEY_RU = {
    html_anki_card_fields_can_be_populated_with_i_2:
        'Поля карточки Anki можно заполнять сведениями о термине или кандзи с помощью маркеров полей. При создании карточки маркеры заменяются данными термина или кандзи.',
    html_ankiconnect_releases_after_around_2022_0:
        'В выпусках AnkiConnect примерно после 2022-05-29 поддерживается новое окно редактора заметок при нажатии <em>Открыть добавленную заметку</em>. Проверьте кнопками ниже. Если появляется ошибка, возможно, AnkiConnect устарел.',
    html_ankiconnect_version_anki_not_running_or_:
        (s) => s
            .replace('AnkiConnect version:', 'Версия AnkiConnect:')
            .replace('Anki not running or connected', 'Anki не запущен или не подключён'),
    html_attempting_to_connect_to_anki_can_someti:
        'При подключении к Anki иногда возвращается ошибка «Invalid response» — возможно, неверно указан <em>адрес сервера AnkiConnect</em>.',
    html_enter_a_newline_separated_list_of_terms_:
        'Введите термины по одному на строку, чтобы отправить заметки в колоду Anki или экспортировать в файл <code>Notes in plain text (.txt)</code>.',
    html_further_configuration_is_available_on_th:
        (s) => s
            .replace('Further configuration is available on the', 'Дополнительные параметры — на')
            .replace('Permissions page', 'странице разрешений')
            .replace("and the web browser's", 'и на')
            .replace('extension settings page', 'странице настроек расширения')
            .replace('extension settings pages', 'страницах настроек расширения'),
    html_further_configuration_is_available_on_th_2:
        'Дополнительные параметры — на <a data-i18n="ui_permissions_page" href="/permissions.html" rel="noopener">странице разрешений</a> и на странице настроек расширения браузера.',
    html_information_and_user_guide_homepage:
        'Сведения и руководство: <a data-i18n="ui_homepage" href="https://yomitan.wiki" rel="noreferrer noopener">Сайт</a>',
    html_more_extension_information_permissions_l:
        (s) => s
            .replace('More extension information:', 'Дополнительно:')
            .replace('>Permissions<', '>Разрешения<')
            .replace('>Licenses<', '>Лицензии<')
            .replace('>Issues<', '>Проблемы<'),
    html_native_keyboard_shortcuts_are_controlled:
        '<strong>Системные</strong> горячие клавиши управляются браузером и работают глобально в браузере<span data-show-for-browser="chrome edge"> или во всей системе</span>.',
    html_notice_for_macos_users_if_yomitan_has_is:
        '<strong>Примечание для macOS:</strong> если Yomitan не подключается к AnkiConnect, могут понадобиться настройки системы. См. <a href="https://foosoft.net/projects/anki-connect/#notes-for-macOS-users" target="_blank" rel="noopener noreferrer">заметки для macOS</a>.',
    html_on_firefox_and_firefox_for_android_the_s:
        'В Firefox и Firefox для Android сведения о хранилище могут быть скрыты флагом. Откройте <a href="about:config" target="_blank" rel="noopener">about:config</a> и найдите соответствующий параметр.',
    html_open_chrome_extensions_shortcuts_in_a_ne:
        (s) => s.replace('Open', 'Откройте').replace('in a new tab.', 'в новой вкладке.'),
    html_open_chrome_extensions_shortcuts_in_a_ne_2:
        (s) => s.replace('Open', 'Откройте').replace('in a new tab.', 'в новой вкладке.'),
    html_open_edge_extensions_shortcuts_in_a_new_:
        (s) => s.replace('Open', 'Откройте').replace('in a new tab.', 'в новой вкладке.'),
    html_open_edge_extensions_shortcuts_in_a_new__2:
        (s) => s.replace('Open', 'Откройте').replace('in a new tab.', 'в новой вкладке.'),
    html_parse_sentences_using_mecab:
        'Разбирать предложения с помощью <a href="https://en.wikipedia.org/wiki/MeCab" target="_blank" rel="noopener noreferrer">MeCab</a>',
    html_prefix_wildcard_searches_supported:
        'Поддерживаются поиски с подстановочным префиксом <a tabindex="0" class="more-toggle more-only" data-parent-distance="4" data-i18n="ui_str">(?)</a>',
    html_prefix_wildcard_searches_supported_2:
        'Поддерживаются поиски с подстановочным префиксом <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">(?)</a>',
    html_recommended_dictionaries_yomitan_diction:
        'Рекомендуемые словари: <a data-i18n="ui_yomitan_dictionaries" href="https://yomitan.wiki/dictionaries/">Словари Yomitan</a>',
    html_release_notes_this_version_all_versions:
        (s) => s
            .replace('Release notes:', 'Заметки о выпуске:')
            .replace('>This version<', '>Эта версия<')
            .replace('>All versions<', '>Все версии<'),
    html_show_iframe_popups_in_the_root_frame:
        'Показывать popup iframe в корневом фрейме <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">(?)</a>',
    html_some_additional_scanning_and_search_opti:
        'Дополнительные параметры сканирования и поиска — в меню: <em data-i18n="ui_show_advanced_options">Показать расширенные параметры</em>.',
    html_some_additional_scanning_and_search_opti_2:
        'Дополнительные параметры сканирования и поиска — в меню: <em>Показать расширенные параметры</em>.',
    html_source_code_github:
        'Исходный код: <a data-i18n="ui_github" href="https://github.com/yomidevs/yomitan" rel="noreferrer noopener">GitHub</a>',
    html_standard_keyboard_shortcuts_are_controll:
        '<strong>Стандартные</strong> горячие клавиши управляются расширением: их можно добавлять, удалять и настраивать для страниц, где работает Yomitan.',
    html_storage_and_unlimitedstorage:
        '<code data-i18n="ui_storage_2">storage</code> и <code data-i18n="ui_unlimitedstorage">unlimitedStorage</code>',
    html_text_on_the_search_page_can_be_scanned_f:
        'Текст на <a href="/search.html" target="_blank" rel="noopener">странице поиска</a> можно сканировать — откроется всплывающее окно.',
    html_text_scanning_is_performed_when_a_pointe:
        'Сканирование выполняется при движении указателя и определённом состоянии ввода. Поле <em data-i18n="ui_required_inputs_2">Обязательные вводы</em> задаёт, какие вводы <em>должны</em> быть нажаты.',
    html_text_scanning_is_performed_when_a_pointe_2:
        'Сканирование выполняется при движении указателя и определённом состоянии ввода. Поле <em>Обязательные вводы</em> задаёт, какие вводы <em>должны</em> быть нажаты, а исключённые — какие не должны.',
    html_the_correct_mode_can_be_determined_based:
        'Подходящий режим зависит от содержимого словаря; кнопка <em>Авто</em> пытается определить его автоматически.',
    html_the_deck_option_will_only_check_for_dupl:
        'Параметр <em>Колода</em> проверяет дубликаты только в целевой колоде. <em>Корень колоды</em> — также во всех дочерних. Так удобнее добавлять карточки в подколоды.',
    html_the_default_address_for_a_server_on_the_:
        'Адрес сервера на том же устройстве по умолчанию: <a href="http://127.0.0.1:8765" target="_blank" rel="noopener noreferrer">http://127.0.0.1:8765</a>. Если Anki запущен и AnkiConnect установлен, версия отобразится выше.',
    html_the_non_standard_css_zoom_property_inter:
        'Нестандартное CSS-свойство <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/zoom" target="_blank" rel="noopener noreferrer"><code>zoom</code></a> мешает обычному расчёту координат указателя при сканировании.',
    html_the_question_mark_button_will_open_the_i:
        'Кнопка <img src="/images/question-mark-circle.svg" class="inline-icon" alt=""> <em data-i18n="ui_question_mark">вопросительный знак</em> откроет <a data-i18n="actionPopup_infoTitle" href="/info.html">страницу сведений</a>.',
    html_this_option_can_be_configured_from_the_w:
        (s) => s
            .replace("This option can be configured from the web browser's", 'Этот параметр настраивается на')
            .replace('extension settings pages', 'страницах настроек расширения')
            .replace('extension settings page', 'странице настроек расширения'),
    html_this_option_can_be_configured_from_the_w_2:
        'Этот параметр настраивается на страницах настроек расширения браузера. В адресной строке откройте <code data-i18n="ui_about_addons">about:addons</code> и перейдите к настройкам.',
    html_this_request_may_contain_the_term_readin:
        'В запросе могут быть термин, чтение и/или язык словарной статьи. <b>Персональные данные не отправляются.</b>',
    html_to_clear_inputs_select_the_input_field_a:
        'Чтобы очистить ввод, выберите поле и нажмите <em data-i18n="ui_escape">Escape</em> или пункт меню <em data-i18n="ui_clear_inputs">Очистить вводы</em>.',
    html_to_clear_inputs_select_the_input_field_a_2:
        'Чтобы очистить ввод, выберите поле и нажмите <em>Escape</em> или пункт меню <em>Очистить вводы</em>.',
    html_to_comply_with_firefox_add_on_policies_y:
        (s) => s
            .replace('To comply with', 'Чтобы соответствовать')
            .replace('Firefox Add-On Policies', 'политикам дополнений Firefox')
            .replace(', Yomitan is required to get your verification that you are comfortable with any data transmission that may occur.', ', Yomitan должен получить ваше подтверждение, что вы согласны с возможной передачей данных.'),
    html_to_comply_with_firefox_add_on_policies_y_2:
        'Чтобы соответствовать <a href="https://extensionworkshop.com/documentation/publish/add-on-policies/">политикам дополнений Firefox</a>, Yomitan должен получить ваше подтверждение согласия на возможную передачу данных.',
    html_use_a_native_browser_window_instead_of_a:
        'Использовать системное окно браузера вместо встроенного popup <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">(?)</a>',
    html_use_a_secure_container_around_popups:
        'Безопасный контейнер вокруг popup <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">(?)</a>',
    html_user_agent:
        'User agent: <span id="user-agent"></span>',
    html_when_a_duplicate_is_detected:
        'При обнаружении дубликата <a tabindex="0" class="more-toggle more-only warning-text" id="anki-overwrite-warning" data-parent-distance="4">(?)</a>',
    html_when_this_option_is_enabled_the_url_of_t:
        'Если включено, URL элемента <code>iframe</code> задаётся сменой location внутреннего документа, а не атрибута <code>src</code> — так безопаснее в ряде сценариев.',
    html_yomitan_is_able_to_scan_the_sentence_sur:
        'Yomitan может сканировать предложение вокруг термина и разбирать слова запроса на <a href="/search.html" target="_blank" rel="noopener">странице поиска</a>. Эти данные также можно добавить в карточки Anki.',
    html_yomitan_supports_automatic_flashcard_cre:
        'Yomitan поддерживает автоматическое создание карточек для <a href="https://apps.ankiweb.net/" target="_blank" rel="noopener noreferrer">Anki</a> — бесплатного приложения для запоминания.',
    html_yomitan_supports_simulating_the_ctrl_c_c:
        'Yomitan может имитировать <code data-i18n="ui_ctrl_c">Ctrl+C</code> (копирование в буфер), когда открыто и в фокусе окно определений.',
    html_yomitan_uses_storage_permissions_in_orde:
        'Yomitan использует разрешения хранилища для настроек и словарей. <code data-i18n="ui_unlimitedstorage">unlimitedStorage</code> помогает браузеру не удалять данные при нехватке места.',
    html_yomitan_uses_this_permission_to_ensure_c:
        'Это разрешение нужно, чтобы заголовки запросов были корректными и безопасными. Иногда изменяется или убирается заголовок <code data-i18n="ui_origin">Origin</code>.',
    html_you_are_about_to_reset_all_yomitan_setti:
        'Вы собираетесь сбросить все настройки Yomitan. Пользовательские профили будут удалены. <strong data-i18n="ui_this_action_cannot_be_undone">Это действие нельзя отменить.</strong>',
    html_you_are_about_to_reset_all_yomitan_setti_2:
        'Вы собираетесь сбросить все настройки Yomitan. Пользовательские профили будут удалены. <strong>Это действие нельзя отменить.</strong>',
    // keep technical tokens as-is
    ui_escape: 'Escape',
    ui_iframe_2: 'iframe',
    ui_jpeg: 'JPEG',
    ui_monospace: 'monospace',
    ui_sans_serif: 'sans-serif',
    ui_serif: 'serif',
    ui_url: 'URL:',
    ui_yomichan_data_exporter: 'yomichan-data-exporter',
    html_browser: 'Браузер: <span id="browser"></span>',
    html_extension_version: 'Версия расширения: <span id="version"></span>',
    html_language: (s) => s.replace('Language:', 'Язык:'),
    html_platform: (s) => s.replace('Platform:', 'Платформа:'),
};

// Also fill any remaining by scanning still-need if keys missing above - load from en and apply simple patterns
const SIMPLE = [
    [/^Browser:/, 'Браузер:'],
    [/^Language:/, 'Язык:'],
    [/^Platform:/, 'Платформа:'],
    [/^User agent:/, 'User agent:'],
    [/^Extension version:/, 'Версия расширения:'],
    [/^Information and user guide:/, 'Сведения и руководство:'],
    [/^Source code:/, 'Исходный код:'],
    [/^Release notes:/, 'Заметки о выпуске:'],
    [/^Recommended dictionaries:/, 'Рекомендуемые словари:'],
    [/^More extension information:/, 'Дополнительно:'],
    [/^Open /, 'Откройте '],
    [/ in a new tab\.$/, ' в новой вкладке.'],
];

let updated = 0;
for (const [key, val] of Object.entries(KEY_RU)) {
    if (!en[key]) { continue; }
    const em = en[key].message;
    const next = typeof val === 'function' ? val(em) : val;
    if (next && next !== em) {
        ru[key] = {
            message: next,
            description: en[key].description || ru[key]?.description,
        };
        if (en[key].placeholders) {
            ru[key].placeholders = en[key].placeholders;
        }
        updated++;
    }
}

// Second pass: remaining identical
for (const key of Object.keys(en)) {
    if (ru[key]?.message !== en[key].message) { continue; }
    let m = en[key].message;
    if (!/[A-Za-z]{4,}/.test(m)) { continue; }
    let out = m;
    for (const [re, rep] of SIMPLE) {
        out = out.replace(re, rep);
    }
    if (out !== m) {
        ru[key] = {message: out, description: en[key].description};
        updated++;
    }
}

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

fs.writeFileSync(ruPath, `${JSON.stringify(sortObj(ru), null, 4)}\n`, 'utf8');

// report
let still = 0;
/** @type {string[]} */
const rem = [];
for (const key of Object.keys(en)) {
    const em = en[key].message;
    if (ru[key]?.message === em && /[A-Za-z]{4,}/.test(em)) {
        // skip intentional brands
        if (/^(Yomitan|Anki|MeCab|Chrome|Firefox|JPEG|PNG|URL|iframe|monospace|serif|Escape|true|GitHub|Handlebars|EDICT|KANJIDIC|Romaji|Bloop|shadow DOM|<iframe>|about:|chrome:\/\/|edge:\/\/|file:\/\/|clipboard|scripting|nativeMessaging|unlimitedStorage|declarativeNetRequest|contextMenus|yomichan|Noto Sans|Electronic Dictionary|Lingua Libre|\(Commons\)|\(Chrome\)|<all_urls>|Ctrl\+C)/i.test(em) || em.length <= 4) {
            continue;
        }
        still++;
        rem.push(`${key}\t${em.slice(0, 100)}`);
    }
}
fs.writeFileSync(path.join(root, 'dev', 'i18n-still-need.txt'), rem.join('\n') + (rem.length ? '\n' : ''), 'utf8');
console.log('Updated keys:', updated);
console.log('Still need (non-brand):', still);
if (still) {
    console.log(rem.slice(0, 25).join('\n'));
}
