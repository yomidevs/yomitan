#!/usr/bin/env node
/**
 * Fix mixed EN/RU on quick-start guide and empty dictionaries warning.
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
    }
    ru[key] = {
        message: rus,
        description: en[key].description || 'UI string',
    };
    if (en[key].placeholders) {
        ru[key].placeholders = en[key].placeholders;
    }
}

// --- Catalog fixes (full Russian, no mixed hybrids) ---
const FIXES = {
    html_clicking_the_yomitan_button_in_the_brows:
        'Нажатие <img src="/images/yomitan-icon.svg" class="inline-icon" alt=""> <em>Yomitan</em> на панели браузера откроет всплывающее окно быстрых действий.',

    html_the_cog_button_will_open_the_settings_pa:
        'Кнопка <img src="/images/cog.svg" class="inline-icon" alt=""> <em>шестерёнки</em> откроет страницу <a href="/settings.html" target="_blank" rel="noopener">Настройки</a>.',

    html_the_magnifying_glass_button_will_open_th:
        'Кнопка <img src="/images/magnifying-glass.svg" class="inline-icon" alt=""> <em>лупы</em> откроет страницу <a href="/search.html" target="_blank" rel="noopener">Поиск</a>: там можно искать текст и термины по установленным словарям, в том числе офлайн.',

    html_the_question_mark_button_will_open_the_i:
        'Кнопка <img src="/images/question-mark-circle.svg" class="inline-icon" alt=""> <em>вопросительного знака</em> откроет <a href="/info.html" target="_blank" rel="noopener">страницу сведений</a> с полезной информацией и ссылками о Yomitan.',

    html_yomitan_requires_one_or_more_dictionaries_:
        'Для поиска терминов, кандзи и другой информации Yomitan нужен один или несколько словарей. <br><br> Для начала выберите язык на странице <a href="/settings.html#general" rel="noopener">Настройки</a>. Затем в разделе <a href="/settings.html#dictionaries" rel="noopener">Словари</a> нажмите <i>Получить рекомендуемые словари</i>, чтобы найти словари для вашего языка. Подробнее — в <a href="https://yomitan.wiki/dictionaries/" target="_blank" rel="noopener noreferrer">Yomitan Wiki</a>. После загрузки словари настраиваются и управляются на той же странице <a href="/settings.html#dictionaries" rel="noopener">Настройки</a>. <br><br> <img class="quick-start-img" src="/images/settings-dictionaries-popup.webp" alt="settings-dictionaries-popup">',

    html_after_dictionaries_have_been_installed_sc:
        'После установки словарей можно сканировать текст на веб-странице: двигайте курсор, удерживая клавишу-модификатор. По умолчанию это <kbd>Shift</kbd>; её можно отключить или изменить на странице <a href="/settings.html" rel="noopener">Настройки</a>.',

    html_clicking_the_speaker_button_of_an_entry_:
        'Нажатие <img src="/images/play-audio.svg" class="inline-icon" alt=""> <em>динамика</em> у записи в результатах поиска воспроизведёт произношение термина из онлайн-словаря, если оно доступно.',

    html_clicking_on_a_kanji_character_in_a_term_:
        'Нажатие на кандзи в определении термина покажет дополнительную информацию об этом знаке. <span class="light">(Нужен установленный словарь кандзи.)</span>',

    html_you_can_also_import_an_exported_collection:
        'Также можно импортировать экспортированную коллекцию словарей из раздела <a href="/settings.html#backup">Резервное копирование</a> на странице настроек. <br><br> Если вы переходите с Yomichan, данные можно импортировать в Yomitan — инструкции в <a href="https://yomitan.wiki/yomichan-migration/#migrating-from-yomichan" target="_blank" rel="noopener noreferrer">Yomitan Wiki</a>. <br><br> Если вы используете или планируете использовать свои шаблоны для Anki, учтите, что <a href="https://yomitan.wiki/yomichan-migration/#custom-templates" target="_blank" rel="noopener noreferrer">часть синтаксиса изменилась по сравнению с Yomichan и Yomibaba</a>. Проверьте, что шаблоны используют обновлённый синтаксис.',

    html_no_dictionaries_have_been_installed_yet_vi:
        'Словари ещё не установлены. Список бесплатных словарей — на <a href="https://github.com/yomidevs/yomitan/blob/master/docs/dictionaries.md#dictionaries" target="_blank" rel="noopener noreferrer">странице словарей Yomitan</a>, либо нажмите <em>Импорт</em> ниже и выберите файл словаря.',
};

// Ensure EN exists for scanning paragraph (may be new key)
if (!en.html_after_dictionaries_have_been_installed_sc) {
    en.html_after_dictionaries_have_been_installed_sc = {
        message:
            'After dictionaries have been installed, webpage text can be scanned by moving the cursor while holding a modifier key. The default key is <kbd>Shift</kbd>, which can be disabled or configured in the <a href="/settings.html" rel="noopener">Settings</a> page.',
        description: 'UI string from ext/quick-start-guide.html',
    };
}

for (const [key, rus] of Object.entries(FIXES)) {
    if (!en[key]) {
        console.warn('missing en key', key);
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

// Ensure question mark key has EN if missing
if (!en.html_the_question_mark_button_will_open_the_i) {
    set(
        'html_the_question_mark_button_will_open_the_i',
        'The <img src="/images/question-mark-circle.svg" class="inline-icon" alt=""> <em>question mark</em> button will open the <a href="/info.html" target="_blank" rel="noopener">Information</a> page, which has some helpful information and links about Yomitan.',
        FIXES.html_the_question_mark_button_will_open_the_i,
    );
}

// Related short keys used nested
for (const [k, v] of Object.entries({
    ui_cog: 'шестерёнка',
    ui_magnifying_glass: 'лупа',
    ui_speaker: 'динамик',
    ui_question_mark: 'вопросительный знак',
    ui_backup_section_of_the_settings: 'Резервное копирование в настройках',
    ui_some_syntax_has_changed_from_yomichan_and_yomiba: 'часть синтаксиса изменилась по сравнению с Yomichan и Yomibaba',
    ui_get_recommended_dictionaries_2: 'Получить рекомендуемые словари',
    ui_requires_a_kanji_dictionary_to_be_installed: '(Нужен установленный словарь кандзи.)',
})) {
    if (en[k]) {
        ru[k] = {message: v, description: en[k].description || 'UI string'};
    }
}

/** @param {Record<string, unknown>} obj */
function sortObj(obj) {
    return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

fs.writeFileSync(enPath, `${JSON.stringify(sortObj(en), null, 4)}\n`);
fs.writeFileSync(ruPath, `${JSON.stringify(sortObj(ru), null, 4)}\n`);

// Tag scanning paragraph in quick-start-guide.html
let qsg = fs.readFileSync('ext/quick-start-guide.html', 'utf8');
const untaggedScan =
    `<div class="settings-item-inner"><div class="settings-item-left"><div class="settings-item-label">
                After dictionaries have been installed, webpage text can be scanned by moving the cursor while holding a modifier key.
                The default key is <kbd>Shift</kbd>, which can be disabled or configured in the <a data-i18n="actionPopup_settingsTitle" href="/settings.html#backup">Settings</a> page.
            </div></div></div>`;
const taggedScan =
    `<div class="settings-item-inner"><div class="settings-item-left"><div class="settings-item-label" data-i18n-html="html_after_dictionaries_have_been_installed_sc">
                After dictionaries have been installed, webpage text can be scanned by moving the cursor while holding a modifier key.
                The default key is <kbd>Shift</kbd>, which can be disabled or configured in the <a href="/settings.html" rel="noopener">Settings</a> page.
            </div></div></div>`;
if (qsg.includes(untaggedScan)) {
    qsg = qsg.replace(untaggedScan, taggedScan);
    console.log('tagged scanning paragraph');
} else if (qsg.includes('html_after_dictionaries_have_been_installed_sc')) {
    console.log('scanning already tagged');
} else {
    // fallback looser replace
    qsg = qsg.replace(
        /(<div class="settings-item-inner"><div class="settings-item-left"><div class="settings-item-label">)\s*After dictionaries have been installed[\s\S]*?<\/div><\/div><\/div>/,
        `<div class="settings-item-inner"><div class="settings-item-left"><div class="settings-item-label" data-i18n-html="html_after_dictionaries_have_been_installed_sc">
                After dictionaries have been installed, webpage text can be scanned by moving the cursor while holding a modifier key.
                The default key is <kbd>Shift</kbd>, which can be disabled or configured in the <a href="/settings.html" rel="noopener">Settings</a> page.
            </div></div></div>`,
    );
    console.log('scanning tagged via fallback');
}
fs.writeFileSync('ext/quick-start-guide.html', qsg);

console.log('keys', Object.keys(en).length, Object.keys(ru).length);
console.log('dict empty', ru.html_no_dictionaries_have_been_installed_yet_vi.message.slice(0, 60));
console.log('yomitan btn', ru.html_clicking_the_yomitan_button_in_the_brows.message.slice(0, 60));
console.log('scan', ru.html_after_dictionaries_have_been_installed_sc.message.slice(0, 60));
