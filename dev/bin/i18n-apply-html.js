#!/usr/bin/env node
/*
 * Extract leaf UI strings from extension HTML, assign stable keys,
 * write data-i18n* attributes, and merge into en/ru messages.json.
 *
 * Usage:
 *   node dev/bin/i18n-apply-html.js           # apply
 *   node dev/bin/i18n-apply-html.js --dry-run # report only
 */

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseHTML} from 'linkedom';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..', '..');
const dryRun = process.argv.includes('--dry-run');

/** Existing hand-crafted keys (English message → key) preserved when possible. */
const PREFERRED_KEYS = new Map();

const HTML_FILES = [
    'ext/settings.html',
    'ext/templates-settings.html',
    'ext/templates-modals.html',
    'ext/templates-display.html',
    'ext/search.html',
    'ext/welcome.html',
    'ext/popup.html',
    'ext/permissions.html',
    'ext/info.html',
    'ext/quick-start-guide.html',
    'ext/action-popup.html',
    'ext/issues.html',
    'ext/support.html',
    'ext/legal.html',
];

const SKIP_EXACT = new Set([
    'Yomitan',
    '#',
    '…',
    '...',
    '—',
    '–',
    '·',
    '|',
    '/',
    '×',
    '✓',
    'OK',
    'v',
]);

/**
 * @param {string} t
 * @returns {boolean}
 */
function shouldSkipText(t) {
    if (!t || t.length < 2) { return true; }
    if (SKIP_EXACT.has(t)) { return true; }
    if (/^[\d#.\-–—\s:%+/×·|\\]+$/.test(t)) { return true; }
    if (t.startsWith('http')) { return true; }
    if (t.startsWith('{') || t.startsWith('[')) { return true; }
    // options path-like tokens
    if (/^[a-z]+(\.[a-zA-Z0-9_]+)+$/.test(t)) { return true; }
    // pure code-ish identifiers
    if (/^[a-z]+([A-Z][a-z0-9]+)+$/.test(t) && t.length < 20 && !/\s/.test(t)) { return false; }
    return false;
}

/**
 * @param {string} text
 * @param {string} kind
 * @returns {string}
 */
function makeKey(text, kind) {
    if (PREFERRED_KEYS.has(text)) {
        return /** @type {string} */ (PREFERRED_KEYS.get(text));
    }
    let slug = text
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 48);
    if (!slug) { slug = 'str'; }
    if (/^\d/.test(slug)) { slug = `n_${slug}`; }
    const prefix = kind === 'text' ? 'ui' : `ui_${kind.replace(/-/g, '_')}`;
    return `${prefix}_${slug}`;
}

/**
 * Load existing en messages into PREFERRED_KEYS and return objects.
 */
function loadExistingLocales() {
    const enPath = path.join(root, 'ext', '_locales', 'en', 'messages.json');
    const ruPath = path.join(root, 'ext', '_locales', 'ru', 'messages.json');
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
    for (const [key, entry] of Object.entries(en)) {
        if (entry && typeof entry.message === 'string') {
            PREFERRED_KEYS.set(entry.message, key);
            // also map curly apostrophe / ellipsis variants
            PREFERRED_KEYS.set(entry.message.replace(/…/g, '...'), key);
            PREFERRED_KEYS.set(entry.message.replace(/\u2026/g, '...'), key);
        }
    }
    return {en, ru, enPath, ruPath};
}

/**
 * Minimal Russian dictionary for common UI words / full phrases.
 * Keys are English source strings.
 * @type {Record<string, string>}
 */
const RU = {
    // filled programmatically below + explicit overrides
};

/**
 * @param {string} en
 * @returns {string}
 */
function translateRu(en) {
    if (Object.hasOwn(RU, en)) { return RU[en]; }
    // keep brand / product tokens
    if (en === 'Anki' || en === 'MeCab' || en === 'Yomitan API') { return en; }
    // fallback: mark for manual review but still provide something readable
    return en;
}

// --- large phrase dictionary (quality translations) ---
Object.assign(RU, {
    'Loading...': 'Загрузка…',
    'Loading…': 'Загрузка…',
    Profile: 'Профиль',
    On: 'Вкл.',
    Off: 'Выкл.',
    Settings: 'Настройки',
    Search: 'Поиск',
    Information: 'Сведения',
    General: 'Общие',
    Dictionaries: 'Словари',
    Scanning: 'Сканирование',
    'Popup Behavior': 'Поведение всплывающего окна',
    Appearance: 'Оформление',
    'Result Display': 'Отображение результатов',
    'Position & Size': 'Положение и размер',
    'Search Window': 'Окно поиска',
    Audio: 'Аудио',
    'Text Parsing': 'Разбор текста',
    Translation: 'Перевод',
    Anki: 'Anki',
    Clipboard: 'Буфер обмена',
    Shortcuts: 'Горячие клавиши',
    Backup: 'Резервное копирование',
    Accessibility: 'Специальные возможности',
    Security: 'Безопасность',
    Advanced: 'Расширенные',
    Debug: 'Отладка',
    'About Yomitan': 'О Yomitan',
    'Yomitan Settings': 'Настройки Yomitan',
    'Active profile': 'Активный профиль',
    'Switch the active profile that is used for scanning.': 'Переключение активного профиля, используемого при сканировании.',
    'Configure profiles…': 'Настроить профили…',
    'Configure profiles...': 'Настроить профили…',
    'Enable Yomitan': 'Включить Yomitan',
    Language: 'Язык',
    'Language of the text that is being looked up.': 'Язык текста, который просматривается.',
    More: 'Ещё',
    'More…': 'Ещё…',
    'More...': 'Ещё…',
    Less: 'Свернуть',
    'Less…': 'Свернуть…',
    'Less...': 'Свернуть…',
    Test: 'Проверить',
    None: 'Нет',
    Default: 'По умолчанию',
    Enabled: 'Включено',
    Disabled: 'Отключено',
    Cancel: 'Отмена',
    Close: 'Закрыть',
    Save: 'Сохранить',
    Delete: 'Удалить',
    Remove: 'Удалить',
    Add: 'Добавить',
    Import: 'Импорт',
    Export: 'Экспорт',
    Reset: 'Сброс',
    Apply: 'Применить',
    Confirm: 'Подтвердить',
    Warning: 'Предупреждение',
    Error: 'Ошибка',
    Success: 'Успешно',
    Help: 'Справка',
    Options: 'Параметры',
    Yes: 'Да',
    No: 'Нет',
    Auto: 'Авто',
    Custom: 'Свой',
    Light: 'Светлая',
    Dark: 'Тёмная',
    System: 'Системная',
    Width: 'Ширина',
    Height: 'Высота',
    Horizontal: 'Горизонтально',
    Vertical: 'Вертикально',
    Left: 'Слева',
    Right: 'Справа',
    Top: 'Сверху',
    Bottom: 'Снизу',
    Center: 'По центру',
    Frequency: 'Частотность',
    Pitch: 'Тон',
    Tags: 'Метки',
    Glossary: 'Глоссарий',
    Expression: 'Выражение',
    Reading: 'Чтение',
    Sentence: 'Предложение',
    Definition: 'Определение',
    Note: 'Заметка',
    Deck: 'Колода',
    Model: 'Модель',
    Field: 'Поле',
    Fields: 'Поля',
    Template: 'Шаблон',
    Templates: 'Шаблоны',
    Permissions: 'Разрешения',
    Storage: 'Хранилище',
    Theme: 'Тема',
    Font: 'Шрифт',
    Size: 'Размер',
    Color: 'Цвет',
    Opacity: 'Прозрачность',
    Offset: 'Смещение',
    Scale: 'Масштаб',
    Duration: 'Длительность',
    Delay: 'Задержка',
    Timeout: 'Таймаут',
    Volume: 'Громкость',
    Playback: 'Воспроизведение',
    Source: 'Источник',
    Sources: 'Источники',
    Download: 'Скачать',
    Upload: 'Загрузить',
    Browse: 'Обзор',
    Select: 'Выбрать',
    Clear: 'Очистить',
    Copy: 'Копировать',
    Paste: 'Вставить',
    Refresh: 'Обновить',
    Reload: 'Перезагрузить',
    Open: 'Открыть',
    Show: 'Показать',
    Hide: 'Скрыть',
    Expand: 'Развернуть',
    Collapse: 'Свернуть',
    Next: 'Далее',
    Previous: 'Назад',
    Back: 'Назад',
    Continue: 'Продолжить',
    Finish: 'Готово',
    Skip: 'Пропустить',
    'Learn more': 'Подробнее',
    'Learn more…': 'Подробнее…',
    'Learn more...': 'Подробнее…',
    'Get started': 'Начать',
    Welcome: 'Добро пожаловать',
    Support: 'Поддержка',
    Legal: 'Правовая информация',
    Issues: 'Проблемы',
    Info: 'Сведения',
    Dictionary: 'Словарь',
    Install: 'Установить',
    Uninstall: 'Удалить',
    Update: 'Обновить',
    Configure: 'Настроить',
    Recommended: 'Рекомендуемые',
    Optional: 'Необязательно',
    Required: 'Обязательно',
    Experimental: 'Экспериментально',
    Preview: 'Предпросмотр',
    Example: 'Пример',
    Name: 'Имя',
    Value: 'Значение',
    Type: 'Тип',
    Order: 'Порядок',
    Priority: 'Приоритет',
    Action: 'Действие',
    Actions: 'Действия',
    Input: 'Ввод',
    Output: 'Вывод',
    Filter: 'Фильтр',
    Sort: 'Сортировка',
    Group: 'Группа',
    Groups: 'Группы',
    Condition: 'Условие',
    Conditions: 'Условия',
    Match: 'Совпадение',
    Exact: 'Точное',
    Prefix: 'Префикс',
    Suffix: 'Суффикс',
    Contains: 'Содержит',
    Regex: 'Регулярное выражение',
    Case: 'Регистр',
    'Case sensitive': 'С учётом регистра',
    'Ignore case': 'Без учёта регистра',
    'Hotkey': 'Горячая клавиша',
    'Keyboard shortcuts': 'Горячие клавиши',
    'Mouse button': 'Кнопка мыши',
    Modifier: 'Модификатор',
    Modifiers: 'Модификаторы',
    'Scan length': 'Длина сканирования',
    'Deep content scan': 'Глубокое сканирование содержимого',
    'Select text': 'Выделять текст',
    'Layout-aware scan': 'Сканирование с учётом вёрстки',
    Popup: 'Всплывающее окно',
    Popups: 'Всплывающие окна',
    'Current page': 'Текущая страница',
    'Search page': 'Страница поиска',
    'Action popup': 'Панель расширения',
    'This page is taking longer than expected to load.': 'Страница загружается дольше, чем обычно.',
    'Show the welcome guide on browser startup': 'Показывать руководство при запуске браузера',
    'Maximum number of results': 'Максимальное число результатов',
    'Adjust the maximum number of results shown for lookups.': 'Ограничение числа результатов поиска.',
    'Enable Yomitan API': 'Включить Yomitan API',
    'Allow bypassing css sanitization': 'Разрешить обход очистки CSS',
    'Lookup in Yomitan': 'Найти в Yomitan',
    'Show "Lookup in Yomitan" in right-click menu': 'Показывать «Найти в Yomitan» в контекстном меню',
    'Theme type': 'Тип темы',
    'Popup theme': 'Тема всплывающего окна',
    'Use the system color scheme when available.': 'Использовать системную цветовую схему, если доступна.',
    'Custom CSS': 'Свой CSS',
    'Font family': 'Семейство шрифтов',
    'Font size': 'Размер шрифта',
    'Line height': 'Межстрочный интервал',
    'Glossary layout mode': 'Режим раскладки глоссария',
    'Compact tags': 'Компактные метки',
    'Compact glossaries': 'Компактные глоссарии',
    'Show pitch accent downstep notation': 'Показывать обозначение понижения тона',
    'Show pitch accent graph': 'Показывать график тона',
    'Show pitch accent position': 'Показывать позицию тона',
    'Show average frequency': 'Показывать среднюю частотность',
    'Show debug information': 'Показывать отладочную информацию',
    'AnkiConnect URL': 'URL AnkiConnect',
    'Enable Anki integration': 'Включить интеграцию с Anki',
    'Check for duplicates': 'Проверять дубликаты',
    'Card format': 'Формат карточки',
    'Sentence parsing': 'Разбор предложений',
    'Termination characters': 'Символы конца предложения',
    'Text replacements': 'Замены текста',
    'Scanning inputs': 'Ввод для сканирования',
    'Middle mouse button': 'Средняя кнопка мыши',
    'Touch inputs': 'Сенсорный ввод',
    'Prevent middle mouse button scrolling': 'Не прокручивать средней кнопкой мыши',
    'Scan without modifiers': 'Сканировать без модификаторов',
    'Scan delay': 'Задержка сканирования',
    'Maximum scan length': 'Максимальная длина сканирования',
    'Popup scale': 'Масштаб всплывающего окна',
    'Horizontal offset': 'Горизонтальное смещение',
    'Vertical offset': 'Вертикальное смещение',
    'Restrict to text content': 'Ограничить текстовым содержимым',
    'Normalize text': 'Нормализовать текст',
    'Convert half-width characters': 'Преобразовывать полуширинные символы',
    'Convert numeric characters': 'Преобразовывать цифровые символы',
    'Convert alphabetic characters': 'Преобразовывать буквенные символы',
    'Convert hiragana to katakana': 'Преобразовывать хирагану в катакану',
    'Convert katakana to hiragana': 'Преобразовывать катакану в хирагану',
    'Collapse emojis': 'Сворачивать эмодзи',
    'Audio playback': 'Воспроизведение аудио',
    'Auto play audio': 'Автовоспроизведение аудио',
    'Audio volume': 'Громкость аудио',
    'Fallback audio sources': 'Резервные источники аудио',
    'Enable clipboard monitoring': 'Включить мониторинг буфера обмена',
    'Search when text is copied': 'Искать при копировании текста',
    'Background': 'Фон',
    'Foreground': 'Передний план',
    'Persistent storage': 'Постоянное хранилище',
    'Clear storage': 'Очистить хранилище',
    'Import settings': 'Импорт настроек',
    'Export settings': 'Экспорт настроек',
    'Reset settings': 'Сбросить настройки',
    'Default profiles': 'Профили по умолчанию',
    'Add profile': 'Добавить профиль',
    'Remove profile': 'Удалить профиль',
    'Duplicate profile': 'Дублировать профиль',
    'Move up': 'Выше',
    'Move down': 'Ниже',
    'Conditions for profile': 'Условия профиля',
    'Domain': 'Домен',
    'URL regex': 'Регулярное выражение URL',
    'Modifier keys': 'Клавиши-модификаторы',
    'Secondary search': 'Вторичный поиск',
    'Main dictionary': 'Основной словарь',
    'Title': 'Заголовок',
    'Revision': 'Редакция',
    'Sequenced': 'С порядком',
    'Version': 'Версия',
    'Author': 'Автор',
    'URL': 'URL',
    'Description': 'Описание',
    'Attribution': 'Атрибуция',
    'Frequency mode': 'Режим частотности',
    'Counts': 'Количество',
    'Terms': 'Термины',
    'Kanji': 'Кандзи',
    'Media': 'Медиа',
    'Styles': 'Стили',
    'Yomi style': 'Стиль Yomi',
    'Installed': 'Установлено',
    'Enabled dictionaries': 'Включённые словари',
    'No dictionaries installed': 'Словари не установлены',
    'Import dictionary': 'Импорт словаря',
    'Delete dictionary': 'Удалить словарь',
    'Dictionary options': 'Параметры словаря',
    'Update dictionary': 'Обновить словарь',
    'Recommended dictionaries': 'Рекомендуемые словари',
    'Details': 'Подробности',
    'Details…': 'Подробности…',
    'Details...': 'Подробности…',
    'Open in new tab': 'Открыть в новой вкладке',
    'View note': 'Открыть заметку',
    'Add note': 'Добавить заметку',
    'View': 'Просмотр',
    'Edit': 'Изменить',
    'Overwrite': 'Перезаписать',
    'Duplicate': 'Дубликат',
    'Suspend': 'Приостановить',
    'Unsuspend': 'Возобновить',
    'Bury': 'Отложить',
    'Unbury': 'Вернуть',
    'Learning': 'Изучение',
    'Review': 'Повторение',
    'New': 'Новые',
    'Unknown': 'Неизвестно',
    'Varies': 'Различается',
    'Not selected': 'Не выбрано',
    'Deleting dictionary...': 'Удаление словаря…',
    'Deleting dictionary…': 'Удаление словаря…',
    'Scanning parser': 'Парсер сканирования',
    'Image': 'Изображение',
    'More info': 'Подробнее',
    'No results found': 'Ничего не найдено',
    'No results': 'Нет результатов',
    'Query': 'Запрос',
    'History': 'История',
    'Clear history': 'Очистить историю',
    'Toggle text scanning': 'Переключить сканирование текста',
    'Open settings': 'Открыть настройки',
    'Open search': 'Открыть поиск',
    'Open info': 'Открыть сведения',
    'Yomitan Search': 'Поиск Yomitan',
    'Yomitan Popup': 'Всплывающее окно Yomitan',
    'Welcome to Yomitan!': 'Добро пожаловать в Yomitan!',
    'Get Started': 'Начать',
    'Permissions required': 'Требуются разрешения',
    'Grant permissions': 'Выдать разрешения',
    'Required permissions': 'Обязательные разрешения',
    'Optional permissions': 'Необязательные разрешения',
    'Origin permissions': 'Разрешения для сайтов',
    'Allow access': 'Разрешить доступ',
    'Persistent storage is enabled': 'Постоянное хранилище включено',
    'Persistent storage is not enabled': 'Постоянное хранилище не включено',
    'Request persistent storage': 'Запросить постоянное хранилище',
    'Invalid': 'Недопустимо',
    'Valid': 'Допустимо',
    'Connected': 'Подключено',
    'Disconnected': 'Отключено',
    'Checking…': 'Проверка…',
    'Checking...': 'Проверка…',
    'Connection successful': 'Соединение успешно',
    'Connection failed': 'Ошибка соединения',
    'Try again': 'Повторить',
    'See documentation': 'См. документацию',
    'Documentation': 'Документация',
    'Community': 'Сообщество',
    'Discord': 'Discord',
    'GitHub': 'GitHub',
    'Report a bug': 'Сообщить об ошибке',
    'Feature request': 'Предложение функции',
    'License': 'Лицензия',
    'Third-party libraries': 'Сторонние библиотеки',
    'Credits': 'Авторы',
    'Changelog': 'Список изменений',
    'This action cannot be undone.': 'Это действие нельзя отменить.',
    'Are you sure?': 'Вы уверены?',
    'Please wait…': 'Подождите…',
    'Please wait...': 'Подождите…',
    'Done': 'Готово',
    'Failed': 'Ошибка',
    'In progress': 'Выполняется',
    'Not available': 'Недоступно',
    'Unavailable': 'Недоступно',
    'Available': 'Доступно',
    'Always': 'Всегда',
    'Never': 'Никогда',
    'Sometimes': 'Иногда',
    'Only when': 'Только когда',
    'All': 'Все',
    'Any': 'Любой',
    'Both': 'Оба',
    'Other': 'Другое',
    'Global': 'Глобально',
    'Local': 'Локально',
    'Page': 'Страница',
    'Site': 'Сайт',
    'Everywhere': 'Везде',
    'Nowhere': 'Нигде',
    'Click': 'Щелчок',
    'Double click': 'Двойной щелчок',
    'Hover': 'Наведение',
    'Press': 'Нажатие',
    'Release': 'Отпускание',
    'Touch': 'Касание',
    'Pen': 'Перо',
    'Keyboard': 'Клавиатура',
    'Mouse': 'Мышь',
    'Primary': 'Основная',
    'Secondary': 'Дополнительная',
    'Tertiary': 'Третья',
    'Alt': 'Alt',
    'Ctrl': 'Ctrl',
    'Shift': 'Shift',
    'Meta': 'Meta',
    'Command': 'Command',
    'Windows': 'Windows',
    'Escape': 'Escape',
    'Enter': 'Enter',
    'Space': 'Пробел',
    'Tab': 'Tab',
    'Backspace': 'Backspace',
    'Delete key': 'Delete',
    'Arrow keys': 'Стрелки',
    'Home': 'Home',
    'End': 'End',
    'Page Up': 'Page Up',
    'Page Down': 'Page Down',
    'Insert': 'Insert',
    'Context menu': 'Контекстное меню',
    'Browser action': 'Кнопка расширения',
    'Omnibox': 'Омнибокс',
    'Service worker': 'Service worker',
    'Content script': 'Скрипт содержимого',
    'Background page': 'Фоновая страница',
    'Options page': 'Страница параметров',
    'Popup window': 'Окно popup',
    'Search window': 'Окно поиска',
    'Fullscreen': 'Полный экран',
    'Windowed': 'В окне',
    'Resizable': 'Изменяемый размер',
    'Fixed size': 'Фиксированный размер',
    'Minimum': 'Минимум',
    'Maximum': 'Максимум',
    'Average': 'Среднее',
    'Sum': 'Сумма',
    'Count': 'Число',
    'Percent': 'Процент',
    'Relative': 'Относительно',
    'Absolute': 'Абсолютно',
    'Inherit': 'Наследовать',
    'Override': 'Переопределить',
    'Fallback': 'Запасной вариант',
    'Primary language': 'Основной язык',
    'Secondary language': 'Дополнительный язык',
    'Target language': 'Целевой язык',
    'Source language': 'Исходный язык',
    'Japanese': 'Японский',
    'English': 'Английский',
    'Chinese': 'Китайский',
    'Korean': 'Корейский',
    'German': 'Немецкий',
    'Spanish': 'Испанский',
    'French': 'Французский',
    'Italian': 'Итальянский',
    'Portuguese': 'Португальский',
    'Russian': 'Русский',
    'Arabic': 'Арабский',
    'Latin': 'Латынь',
    'Greek': 'Греческий',
    'Vietnamese': 'Вьетнамский',
    'Thai': 'Тайский',
    'Indonesian': 'Индонезийский',
    'Esperanto': 'Эсперанто',
    'Yiddish': 'Идиш',
    'Irish': 'Ирландский',
    'Albanian': 'Албанский',
    'Tagalog': 'Тагальский',
    'Serbo-Croatian': 'Сербохорватский',
    'Ancient Greek': 'Древнегреческий',
    'Modern Greek': 'Новогреческий',
});

/**
 * @param {Element} root
 * @param {(el: Element, kind: string, text: string) => void} onHit
 */
function walkLeaves(root, onHit) {
    const tags = new Set([
        'H1', 'H2', 'H3', 'H4', 'H5', 'BUTTON', 'OPTION', 'LABEL', 'P', 'TH', 'TD',
        'LEGEND', 'SUMMARY', 'A', 'SPAN', 'DIV', 'LI', 'DT', 'DD', 'STRONG', 'EM',
        'SMALL', 'B', 'I', 'CODE', 'FIGCAPTION',
    ]);
    for (const el of root.querySelectorAll('*')) {
        if (!tags.has(el.tagName)) { continue; }
        if (el.closest('script, style')) { continue; }
        if (el.hasAttribute('data-i18n') || el.hasAttribute('data-i18n-html')) { continue; }

        const meaningfulChildren = [...el.children].filter((c) => {
            if (['BR', 'WBR', 'IMG', 'SVG', 'PATH', 'USE'].includes(c.tagName)) { return false; }
            // icon spans without text
            if (c.tagName === 'SPAN' && typeof c.className === 'string' && c.className.split(/\s+/).includes('icon')) { return false; }
            if (c.tagName === 'SPAN' && c.getAttribute('data-icon')) { return false; }
            return true;
        });

        if (meaningfulChildren.length === 0) {
            const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!shouldSkipText(t) && !el.hasAttribute('data-i18n')) {
                onHit(el, 'text', t);
            }
        }

        if (!el.hasAttribute('data-i18n-placeholder')) {
            const ph = el.getAttribute('placeholder');
            if (ph && !shouldSkipText(ph.trim())) {
                onHit(el, 'placeholder', ph.trim());
            }
        }
        if (!el.hasAttribute('data-i18n-title') && !el.hasAttribute('data-hotkey')) {
            const ti = el.getAttribute('title');
            if (ti && !shouldSkipText(ti.trim()) && ti.length < 180) {
                onHit(el, 'title', ti.trim());
            }
        }
        if (!el.hasAttribute('data-i18n-aria-label')) {
            const ar = el.getAttribute('aria-label');
            if (ar && !shouldSkipText(ar.trim())) {
                onHit(el, 'aria-label', ar.trim());
            }
        }
    }
}

/**
 * @param {string} relativePath
 * @param {Record<string, {message: string, description?: string}>} en
 * @param {Record<string, {message: string, description?: string}>} ru
 * @param {Map<string, string>} textToKey
 * @returns {{tagged: number, file: string}}
 */
function processFile(relativePath, en, ru, textToKey) {
    const abs = path.join(root, relativePath);
    let html = fs.readFileSync(abs, 'utf8');
    const {document} = parseHTML(html);
    let tagged = 0;

    /**
     * @param {Element} el
     * @param {string} kind
     * @param {string} text
     */
    const onHit = (el, kind, text) => {
        let key = textToKey.get(`${kind}::${text}`);
        if (!key) {
            key = makeKey(text, kind);
            // ensure uniqueness
            let n = 2;
            const base = key;
            while (Object.hasOwn(en, key) && en[key].message !== text) {
                key = `${base}_${n++}`;
            }
            textToKey.set(`${kind}::${text}`, key);
        }

        if (!Object.hasOwn(en, key)) {
            en[key] = {
                message: text,
                description: `Auto-extracted UI string (${kind}) from ${relativePath}`,
            };
        }
        if (!Object.hasOwn(ru, key)) {
            ru[key] = {
                message: translateRu(text),
                description: en[key].description,
            };
        } else if (ru[key].message === en[key].message && translateRu(text) !== text) {
            // upgrade untranslated placeholder
            ru[key].message = translateRu(text);
        }

        if (kind === 'text') {
            el.setAttribute('data-i18n', key);
        } else if (kind === 'placeholder') {
            el.setAttribute('data-i18n-placeholder', key);
        } else if (kind === 'title') {
            el.setAttribute('data-i18n-title', key);
        } else if (kind === 'aria-label') {
            el.setAttribute('data-i18n-aria-label', key);
        }
        tagged++;
    };

    walkLeaves(document.documentElement, onHit);
    for (const tpl of document.querySelectorAll('template')) {
        // linkedom: template.content may work
        const content = tpl.content || null;
        if (content) {
            walkLeaves(/** @type {any} */ (content), onHit);
        } else {
            const {document: innerDoc} = parseHTML(`<div id="__t">${tpl.innerHTML}</div>`);
            const rootEl = innerDoc.querySelector('#__t');
            if (rootEl) {
                walkLeaves(rootEl, onHit);
                tpl.innerHTML = rootEl.innerHTML;
            }
        }
    }

    // Serialize: linkedom outer HTML of document
    // Prefer writing via document.documentElement outerHTML + doctype
    const doctype = html.startsWith('<!DOCTYPE') || html.startsWith('<!doctype') ?
        '<!DOCTYPE html>\n' :
        '';
    let out = doctype + document.documentElement.outerHTML;
    // linkedom may lowercase attrs; keep as produced

    if (!dryRun) {
        fs.writeFileSync(abs, out.endsWith('\n') ? out : `${out}\n`, 'utf8');
    }

    return {tagged, file: relativePath};
}

function main() {
    const {en, ru, enPath, ruPath} = loadExistingLocales();
    /** @type {Map<string, string>} */
    const textToKey = new Map();
    // seed from existing
    for (const [key, entry] of Object.entries(en)) {
        if (entry?.message) {
            textToKey.set(`text::${entry.message}`, key);
        }
    }

    let total = 0;
    for (const f of HTML_FILES) {
        const abs = path.join(root, f);
        if (!fs.existsSync(abs)) {
            console.log(`skip missing ${f}`);
            continue;
        }
        const {tagged, file} = processFile(f, en, ru, textToKey);
        console.log(`${file}: +${tagged} attributes`);
        total += tagged;
    }

    // sort keys for stable diffs
    const sortObj = (/** @type {Record<string, unknown>} */ obj) => {
        /** @type {Record<string, unknown>} */
        const out = {};
        for (const k of Object.keys(obj).sort()) {
            out[k] = obj[k];
        }
        return out;
    };

    const enSorted = sortObj(en);
    const ruSorted = sortObj(ru);

    console.log(`Total tags applied: ${total}`);
    console.log(`en keys: ${Object.keys(enSorted).length}, ru keys: ${Object.keys(ruSorted).length}`);

    // report untranslated ru (same as en)
    let untranslated = 0;
    for (const k of Object.keys(enSorted)) {
        const em = /** @type {{message: string}} */ (enSorted[k]).message;
        const rm = /** @type {{message: string}} */ (ruSorted[k])?.message;
        if (rm === em && /[A-Za-z]{3,}/.test(em) && !/^(Anki|MeCab|Yomitan|URL|API|CSS|HTML|JSON|GitHub|Discord|OK|ID)$/i.test(em)) {
            untranslated++;
        }
    }
    console.log(`Possibly untranslated RU entries: ${untranslated}`);

    if (!dryRun) {
        fs.writeFileSync(enPath, `${JSON.stringify(enSorted, null, 4)}\n`, 'utf8');
        fs.writeFileSync(ruPath, `${JSON.stringify(ruSorted, null, 4)}\n`, 'utf8');
        console.log('Wrote locale files.');
    } else {
        console.log('Dry run — no files written.');
    }
}

main();
