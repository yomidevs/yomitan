#!/usr/bin/env node
/**
 * Translate remaining ru messages that still equal English (non-brand).
 * Preserves HTML tags; translates text content.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseHTML} from 'linkedom';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const enPath = path.join(root, 'ext', '_locales', 'en', 'messages.json');
const ruPath = path.join(root, 'ext', '_locales', 'ru', 'messages.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));

/** Exact full-string translations (after strip tags for match, or full HTML). */
/** @type {Record<string, string>} */
const EXACT_PLAIN = {
    'Allow access to file URLs (optional)': 'Разрешить доступ к file URL (необязательно)',
    'Allow in private windows (optional)': 'Разрешить в приватных окнах (необязательно)',
    'Auto-scale (?)': 'Автомасштаб (?)',
    'Browser:': 'Браузер:',
    'Extension version:': 'Версия расширения:',
    'Language:': 'Язык:',
    'Platform:': 'Платформа:',
    'User agent:': 'User agent:',
    'Frequency sorting mode (?)': 'Режим сортировки по частотности (?)',
    'Duplicate card scope (?)': 'Область дубликатов карточек (?)',
    'Use deinflections (?)': 'Использовать деинфлектию (?)',
    'Part of speech filtering (?)': 'Фильтр по части речи (?)',
    'Show card tags and flags (?)': 'Показывать метки и флаги карточек (?)',
    'Use secure popup frame URL (?)': 'Безопасный URL фрейма popup (?)',
    'Enable Google Docs compatibility mode': 'Режим совместимости с Google Docs',
    'Enable support for prefix wildcard searches': 'Поддержка поиска с подстановочным префиксом',
    'Check for duplicates across all models': 'Проверять дубликаты по всем моделям',
    'Configure advanced scanning inputs…': 'Настроить расширенный ввод сканирования…',
    'Conditions for profile': 'Условия профиля',
    'Find the Yomitan section and configure the shortcuts.': 'Найдите раздел Yomitan и настройте горячие клавиши.',
    'Open the extensions page (about:addons)': 'Откройте страницу дополнений (about:addons)',
    'Click the button on the right with the gear icon, then click Manage Extension Shortcuts.': 'Нажмите кнопку с шестерёнкой справа, затем «Manage Extension Shortcuts».',
    'Not collapsible - Definitions will not be collapsed.': 'Не сворачивается — определения не сворачиваются.',
    'No grouping - Every definition will be listed as a separate entry.': 'Без группировки — каждое определение отдельной записью.',
    'Group related terms - Related terms that share the same definitions will be grouped together.': 'Группировать связанные термины — связанные термины с общими определениями вместе.',
    'Collapsed - Definitions will show a collapse button if their size exceeds the specified line count, and they will start collapsed.': 'Свёрнуто — кнопка сворачивания, если длиннее лимита строк; изначально свёрнуты.',
    'Expanded - Definitions will show a collapse button if their size exceeds the specified line count, and they will start expanded.': 'Развёрнуто — кнопка сворачивания при превышении лимита; изначально развёрнуты.',
    'Force collapsed - Definitions will always show a collapse button, and they will start collapsed.': 'Всегда свёрнуто — всегда кнопка сворачивания; изначально свёрнуты.',
    'Force expanded - Definitions will always show a collapse button, and they will start expanded.': 'Всегда развёрнуто — всегда кнопка сворачивания; изначально развёрнуты.',
    'Are you sure you want to reset the profile to default?': 'Сбросить профиль к значениям по умолчанию?',
    'Input the display name for dictionary:': 'Введите отображаемое имя словаря:',
    'Input the location the dictionary should be moved to:': 'Куда переместить словарь:',
    'This setting does not have any effect in Firefox, as it does not implement the zoom property.': 'В Firefox не действует: свойство zoom не реализовано.',
    'You can customize overwriting for each field in the Configure Anki card format… menu.': 'Перезапись полей настраивается в меню «Настроить формат карточки Anki…».',
    'Consider making a backup using the Export Settings button before resetting if you want to be able to revert the changes.': 'Перед сбросом сделайте резервную копию через «Экспорт настроек», чтобы можно было откатить изменения.',
    'For more information check the documentation.': 'Подробнее — в документации.',
    'Enjoying Yomitan? Help us by leaving a review on the Firefox/Chrome/Edge store!': 'Нравится Yomitan? Оставьте отзыв в магазине Firefox/Chrome/Edge!',
};

/** Ordered phrase replacements inside text nodes (longer first). */
const PHRASES = [
    ['Are you sure you want to export', 'Экспортировать'],
    ['Are you sure you want to send', 'Отправить'],
    ['Are you sure you want to reset the profile', 'Сбросить профиль'],
    ['Are you sure you want to delete the dictionary:', 'Удалить словарь:'],
    ['Are you sure you want to update the dictionary:', 'Обновить словарь:'],
    ['Are you sure you want to delete', 'Удалить'],
    ['A card is considered a duplicate if the value of the first field matches that of any other card.', 'Карточка считается дубликатом, если значение первого поля совпадает с другой карточкой.'],
    ['A custom URL can be used to play audio from any URL.', 'Свой URL можно использовать для аудио с любого адреса.'],
    ['The replacement tags', 'Подстановочные теги'],
    ['A custom URL to a JSON file which lists one or more audio URLs for a given term.', 'Свой URL JSON-файла со списком URL аудио для термина.'],
    ['The format of the file is described', 'Формат файла описан'],
    ['A keyboard modifier key can be used to activate text scanning when the cursor is moved.', 'Клавиша-модификатор включает сканирование при движении курсора.'],
    ['Alternatively, the', 'Либо'],
    ['option can be used to scan text whenever the cursor is moved.', '— сканировать при любом движении курсора.'],
    ['Allow access to file URLs', 'Разрешить доступ к file URL'],
    ['Allow in private windows', 'Разрешить в приватных окнах'],
    ['(optional)', '(необязательно)'],
    ['Attempting to connect to Anki can sometimes return an error message which includes "Invalid response".', 'При подключении к Anki иногда бывает ошибка «Invalid response».'],
    ['Auto-scale', 'Автомасштаб'],
    ['Auto-scaling will scale the popup automatically based on the browser\'s zoom levels in order to keep the popup at a constant physical size, regardless of the zoom level.', 'Автомасштаб подстраивает окно под zoom браузера, чтобы физический размер оставался постоянным.'],
    ['Browser:', 'Браузер:'],
    ['Language:', 'Язык:'],
    ['Platform:', 'Платформа:'],
    ['User agent:', 'User agent:'],
    ['Extension version:', 'Версия расширения:'],
    ['By default, duplicate checks are only performed for notes created with the same model.', 'По умолчанию дубликаты ищутся только среди заметок той же модели.'],
    ['Enabling this option will check for duplicates across all models.', 'Эта опция проверяет дубликаты по всем моделям.'],
    ['By default, scanning text inside of an embeded', 'По умолчанию сканирование текста внутри встроенного'],
    ['By default, scanning text inside of an embedded', 'По умолчанию сканирование текста внутри встроенного'],
    ['element will open a new popup inside of that frame, which can sometimes be limiting due to the frame\'s size.', 'элемента открывает popup внутри фрейма — из‑за размера фрейма это может быть неудобно.'],
    ['By default, the number of lines shown for a definition is 3.', 'По умолчанию для определения показывается 3 строки.'],
    ['This can be configured by adjusting the', 'Это настраивается через'],
    ['Check for duplicates across all models', 'Проверять дубликаты по всем моделям'],
    ['Click the button on the right with the gear icon, then click', 'Нажмите кнопку с шестерёнкой справа, затем'],
    ['Manage Extension Shortcuts', 'Manage Extension Shortcuts'],
    ['Clicking the', 'Нажатие'],
    ['button of an entry', 'кнопки у записи'],
    ['will play audio for the term.', 'воспроизводит аудио термина.'],
    ['button in the browser bar will open the action popup.', 'кнопки на панели браузера открывает панель расширения.'],
    ['Collapsed', 'Свёрнуто'],
    ['Definitions will show a collapse button if their size exceeds the specified line count, and they will start collapsed.', 'Показывается кнопка сворачивания при превышении лимита строк; изначально свёрнуты.'],
    ['Definitions will show a collapse button if their size exceeds the specified line count, and they will start expanded.', 'Показывается кнопка сворачивания при превышении лимита; изначально развёрнуты.'],
    ['Definitions will always show a collapse button, and they will start collapsed.', 'Всегда кнопка сворачивания; изначально свёрнуты.'],
    ['Definitions will always show a collapse button, and they will start expanded.', 'Всегда кнопка сворачивания; изначально развёрнуты.'],
    ['Definitions will not be collapsed.', 'Определения не сворачиваются.'],
    ['Conditions for profile', 'Условия профиля'],
    ['Configure advanced scanning inputs…', 'Настроить расширенный ввод сканирования…'],
    ['defined', 'задано'],
    ['Consider making a backup using the', 'Сделайте резервную копию через'],
    ['Export Settings', 'Экспорт настроек'],
    ['button before resetting if you want to be able to revert the changes.', 'перед сбросом, чтобы можно было откатить изменения.'],
    ['Duplicate card scope', 'Область дубликатов карточек'],
    ['Enable Google Docs compatibility mode', 'Режим совместимости с Google Docs'],
    ['Enable support for prefix wildcard searches', 'Поддержка поиска с подстановочным префиксом'],
    ['Enjoying Yomitan? Help us by leaving a review on the Firefox/Chrome/Edge store!', 'Нравится Yomitan? Оставьте отзыв в магазине Firefox/Chrome/Edge!'],
    ['Enter a newline separated list of terms below to send notes directly to an Anki deck or export them to a file.', 'Введите термины по одному на строку, чтобы отправить заметки в колоду Anki или экспортировать в файл.'],
    ['Example:', 'Пример:'],
    ['Example:', 'Пример:'],
    ['Expanded', 'Развёрнуто'],
    ['Force collapsed', 'Всегда свёрнуто'],
    ['Force expanded', 'Всегда развёрнуто'],
    ['Find the', 'Найдите'],
    ['section and configure the shortcuts.', 'и настройте горячие клавиши.'],
    ['For more information check the', 'Подробнее — в'],
    ['documentation', 'документации'],
    ['For non-English dictionaries, please refer to the list of available', 'Для неанглийских словарей см. список'],
    ['Frequency sorting mode', 'Режим сортировки по частотности'],
    ['Group related terms', 'Группировать связанные термины'],
    ['Related terms that share the same definitions will be grouped together.', 'Связанные термины с общими определениями группируются вместе.'],
    ['Group by term', 'Группировать по термину'],
    ['Definitions for the same term will be grouped together, regardless of reading variations.', 'Определения одного термина вместе, независимо от чтений.'],
    ['Group term-reading pairs', 'Группировать пары термин–чтение'],
    ['Definitions for the same term with the same reading will be grouped together.', 'Определения одного термина с одним чтением вместе.'],
    ['No grouping', 'Без группировки'],
    ['Every definition will be listed as a separate entry.', 'Каждое определение — отдельная запись.'],
    ['Not collapsible', 'Не сворачивается'],
    ['Input the display name for', 'Введите отображаемое имя для'],
    ['dictionary:', 'словаря:'],
    ['Input the location the dictionary', 'Куда переместить словарь'],
    ['should be moved to:', ':'],
    ['Open the extensions page', 'Откройте страницу расширений'],
    ['Part of speech filtering', 'Фильтр по части речи'],
    ['Show card tags and flags', 'Показывать метки и флаги карточек'],
    ['Use deinflections', 'Использовать деинфлектию'],
    ['Use secure popup frame URL', 'Безопасный URL фрейма popup'],
    ['This setting does not have any effect in Firefox, as it does not implement the', 'В Firefox не действует: не реализовано'],
    ['property.', '.'],
    ['You can customize overwriting for each field in the', 'Перезапись полей настраивается в'],
    ['Configure Anki card format…', 'Настроить формат карточки Anki…'],
    ['menu.', '.'],
    ['terms to Anki?', 'терминов в Anki?'],
    ['terms to a file?', 'терминов в файл?'],
    ['to default?', 'к значениям по умолчанию?'],
    ['More…', 'Ещё…'],
    ['More...', 'Ещё…'],
    ['Less…', 'Свернуть…'],
    ['optional', 'необязательно'],
    ['Primary dictionary', 'Основной словарь'],
    ['Secondary dictionaries', 'Вторичные словари'],
    ['welcome guide', 'руководство'],
    ['Privacy Policy', 'Политика конфиденциальности'],
    ['Import', 'Импорт'],
    ['Export', 'Экспорт'],
    ['Settings', 'Настройки'],
    ['Advanced', 'Расширенные'],
    ['Default', 'По умолчанию'],
    ['Full Width', 'Полная ширина'],
    ['No key', 'Нет клавиши'],
    ['in milliseconds', 'в миллисекундах'],
    ['storage', 'storage'],
    ['unlimitedStorage', 'unlimitedStorage'],
].sort((a, b) => b[0].length - a[0].length);

const SKIP_EXACT = new Set([
    'Yomitan', 'Anki', 'AnkiConnect', 'MeCab', 'Chrome', 'Firefox', 'Edge', 'Safari',
    'GitHub', 'EDICT', 'KANJIDIC', 'Romaji', 'Bloop', 'Handlebars.js', 'Wiktionary',
    'Jisho.org', 'JapanesePod101', 'LanguagePod101', 'Lingua Libre', '(Chrome)',
    '(Commons) Wiktionary', '(Commons) Lingua Libre', 'shadow DOM', '<iframe>',
    'Electronic Dictionary Research and Development Group',
    '"Noto Sans JP", "Meiryo", sans-serif',
]);

/**
 * @param {string} text
 * @returns {string}
 */
function trText(text) {
    if (!/[A-Za-z]/.test(text)) { return text; }
    const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!m) { return text; }
    const lead = m[1];
    const trail = m[3];
    let core = m[2];
    if (SKIP_EXACT.has(core) || SKIP_EXACT.has(core.trim())) { return text; }

    const plain = core.replace(/\s+/g, ' ').trim();
    if (Object.hasOwn(EXACT_PLAIN, plain)) {
        return lead + EXACT_PLAIN[plain] + trail;
    }

    let out = core;
    for (const [e, r] of PHRASES) {
        if (out.includes(e)) {
            out = out.split(e).join(r);
        }
    }
    return lead + out + trail;
}

/**
 * @param {string} html
 * @returns {string}
 */
function translateHtml(html) {
    if (!html.includes('<')) {
        return trText(html);
    }
    try {
        const {document} = parseHTML(`<div id="__r">${html}</div>`);
        const root = document.querySelector('#__r');
        if (!root) { return trText(html); }
        const w = document.createTreeWalker(root, 4);
        /** @type {Text[]} */
        const nodes = [];
        while (w.nextNode()) {
            nodes.push(/** @type {Text} */ (w.currentNode));
        }
        for (const n of nodes) {
            n.textContent = trText(n.textContent || '');
        }
        return root.innerHTML;
    } catch (e) {
        return trText(html);
    }
}

/**
 * @param {string} em
 * @returns {boolean}
 */
function shouldSkip(em) {
    if (SKIP_EXACT.has(em)) { return true; }
    if (em.length <= 3) { return true; }
    if (/^(about:|chrome:\/\/|edge:\/\/|file:\/\/)/.test(em)) { return true; }
    if (/^(clipboard|scripting|nativeMessaging|unlimitedStorage|declarativeNetRequest|contextMenus)/.test(em)) { return true; }
    if (em.includes('Noto Sans')) { return true; }
    if (em === '<all_urls>' || em === 'true' || em === 'Ctrl+C') { return true; }
    return false;
}

let updated = 0;
let still = 0;
/** @type {string[]} */
const remaining = [];

for (const key of Object.keys(en)) {
    const em = en[key].message;
    const rm = ru[key]?.message;
    if (rm !== em) { continue; }
    if (!/[A-Za-z]{3,}/.test(em)) { continue; }
    if (shouldSkip(em)) { continue; }

    const translated = translateHtml(em);
    if (translated !== em) {
        ru[key] = {
            message: translated,
            description: en[key].description || ru[key]?.description,
        };
        if (en[key].placeholders) {
            ru[key].placeholders = en[key].placeholders;
        }
        updated++;
    } else {
        still++;
        remaining.push(`${key}\t${em.slice(0, 120)}`);
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
fs.writeFileSync(path.join(root, 'dev', 'i18n-still-need.txt'), remaining.join('\n') + (remaining.length ? '\n' : ''), 'utf8');
console.log(`Updated: ${updated}`);
console.log(`Still English-like: ${still}`);
