#!/usr/bin/env node
/**
 * Close remaining mixed-content i18n gaps: inject data-i18n-html + en/ru messages.
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

const FILES = [
    'ext/settings.html',
    'ext/templates-modals.html',
    'ext/templates-settings.html',
    'ext/templates-display.html',
    'ext/welcome.html',
    'ext/permissions.html',
    'ext/info.html',
    'ext/quick-start-guide.html',
    'ext/issues.html',
    'ext/support.html',
    'ext/legal.html',
    'ext/search.html',
    'ext/popup.html',
    'ext/popup-preview.html',
];

const INLINE = new Set(['A', 'EM', 'STRONG', 'CODE', 'I', 'B', 'SPAN', 'IMG', 'BR', 'WBR']);
const ALLOWED_TAGS = new Set(['p', 'div', 'li', 'label', 'small', 'span', 'h2', 'h3', 'td', 'th', 'legend', 'dd', 'dt']);

/** @type {Array<[string, string]>} */
const PHRASES = /** @type {Array<[string, string]>} */ ([
    ['Privacy Policy', 'Политика конфиденциальности'],
    ['Your system is running low on storage space.', 'На устройстве мало места.'],
    ['Importing dictionaries may fail.', 'Импорт словарей может не удаться.'],
    ['Sort results using a frequency dictionary.', 'Сортировать результаты по словарю частотности.'],
    ['Frequency sorting mode', 'Режим сортировки по частотности'],
    ['Occurrence-based, where the frequency corresponds to a number of occurrences. Large values indicate a more common term.', 'По числу вхождений: больше значение — более частое слово.'],
    ['Rank-based, where the frequency value corresponds to a ranking index. Smaller values indicate a more common term.', 'По рангу: меньше значение — более частое слово.'],
    ['Hold a key while moving the cursor to scan text.', 'Удерживайте клавишу и ведите курсор для сканирования.'],
    ['Configure advanced scanning inputs…', 'Настроить расширенный ввод сканирования…'],
    ['Configure advanced scanning inputs...', 'Настроить расширенный ввод сканирования…'],
    ['Scan delay', 'Задержка сканирования'],
    ['in milliseconds', 'в миллисекундах'],
    ['The non-standard CSS', 'Нестандартное CSS-свойство'],
    ['property interferes with the normal calculation of the pointer coordinates when scanning webpages.', 'мешает обычному расчёту координат указателя при сканировании.'],
    ['Text on the', 'Текст на'],
    ['search page', 'странице поиска'],
    ['can be scanned for definitions, which will open a popup.', 'можно сканировать — откроется всплывающее окно.'],
    ['Show iframe popups in the root frame', 'Показывать popup iframe в корневом фрейме'],
    ['By default, scanning text inside of an embeded', 'По умолчанию сканирование текста внутри встроенного'],
    ['By default, scanning text inside of an embedded', 'По умолчанию сканирование текста внутри встроенного'],
    ['element will open a new popup inside of that frame, which can sometimes be limiting due to the frame\'s size.', 'элемента открывает popup внутри фрейма — из‑за размера это может быть неудобно.'],
    ['Change the font family used in Yomitan.', 'Семейство шрифтов в Yomitan.'],
    ['Japanese only.', 'Только японский.'],
    ['Downstep notation', 'Обозначение понижения'],
    ['Downstep position', 'Позиция понижения'],
    ['Change how related results are grouped.', 'Как группировать связанные результаты.'],
    ['No grouping', 'Без группировки'],
    ['Every definition will be listed as a separate entry.', 'Каждое определение — отдельная запись.'],
    ['Group term-reading pairs', 'Группировать пары термин–чтение'],
    ['Definitions for the same term with the same reading will be grouped together.', 'Определения одного термина с одним чтением вместе.'],
    ['Group by term', 'Группировать по термину'],
    ['Definitions for the same term will be grouped together, regardless of reading variations.', 'Определения одного термина вместе, независимо от чтений.'],
    ['Group related terms', 'Группировать связанные термины'],
    ['Related terms that share the same definitions will be grouped together.', 'Связанные термины с общими определениями вместе.'],
    ['The Primary dictionary option should be assigned to a dictionary which contains related term information, and configuring the Secondary dictionaries will allow looking up related terms from those dictionaries.', 'Основной словарь — с данными о связанных терминах; вторичные — для поиска связанных терминов из них.'],
    ['Change the layout of the popup.', 'Макет всплывающего окна.'],
    ['The Default mode will position the popup relative to the scanned text. The Full Width mode will anchor the popup to the top or bottom of the screen and take up the full width.', 'Режим «По умолчанию» — относительно текста. «Полная ширина» — к верху/низу экрана на всю ширину.'],
    ['Auto-scale', 'Автомасштаб'],
    ['The Deck option will only check for duplicates in the target deck.', 'Параметр «Колода» проверяет дубликаты только в целевой колоде.'],
    ['The Deck root option will additionally check for duplicates in all child decks of the root deck.', '«Корень колоды» также проверяет все дочерние колоды.'],
    ['Standard keyboard shortcuts are controlled by the extension, and can be added, removed, and configured to work on webpages that Yomitan functions on.', 'Стандартные горячие клавиши управляются расширением: их можно добавлять, удалять и настраивать.'],
    ['Native keyboard shortcuts are controlled by the web browser, and function globally within the web browser', 'Системные горячие клавиши управляются браузером и работают глобально'],
    ['or system-wide', 'или во всей системе'],
    ['Notice for macOS users:', 'Примечание для macOS:'],
    ['If Yomitan has issues connecting to AnkiConnect, it may be necessary to adjust some system settings.', 'Если Yomitan не подключается к AnkiConnect, могут понадобиться настройки системы.'],
    ['On supported browsers, a popup\'s iframe element will be embeded inside of a shadow DOM.', 'В поддерживаемых браузерах iframe popup помещается в shadow DOM.'],
    ['Clicking the', 'Нажатие'],
    ['View added note', 'Открыть добавленную заметку'],
    ['button shows this window.', 'показывает это окно.'],
    ['When a duplicate is detected', 'При обнаружении дубликата'],
    ['Enable Google Docs compatibility mode', 'Режим совместимости с Google Docs'],
    ['Use secure popup frame URL', 'Безопасный URL фрейма popup'],
    ['Duplicate card scope', 'Область дубликатов карточек'],
    ['More…', 'Ещё…'],
    ['More...', 'Ещё…'],
    ['Less…', 'Свернуть…'],
    ['installed', 'установлено'],
    ['enabled', 'включено'],
    ['defined', 'задано'],
    ['Primary dictionary', 'Основной словарь'],
    ['Secondary dictionaries', 'Вторичные словари'],
    ['Default', 'По умолчанию'],
    ['Full Width', 'Полная ширина'],
    ['Graph', 'График'],
    ['Delay', 'Задержка'],
    ['optional', 'необязательно'],
    ['(optional)', '(необязательно)'],
    ['Show advanced options', 'Показать расширенные параметры'],
    ['Export Settings', 'Экспорт настроек'],
    ['Permissions page', 'Страница разрешений'],
    ['documentation', 'документации'],
    ['This action cannot be undone.', 'Это действие нельзя отменить.'],
    ['Need help?', 'Нужна помощь?'],
    ['Import', 'Импорт'],
    ['Homepage', 'Сайт'],
    ['Permissions', 'Разрешения'],
    ['Licenses', 'Лицензии'],
    ['Issues', 'Проблемы'],
    ['Support', 'Поддержка'],
    ['for free dictionaries', 'бесплатных словарей'],
    ['or click the', 'или нажмите'],
    ['button below to select a dictionary file to import.', 'ниже, чтобы выбрать файл словаря.'],
    ['Visit the', 'См.'],
    ['for a list of free dictionaries or click the', 'список бесплатных словарей или нажмите'],
    ['Are you sure you want to', 'Вы уверены, что хотите'],
    ['reset the profile', 'сбросить профиль'],
    ['to default?', 'к значениям по умолчанию?'],
    ['delete the dictionary:', 'удалить словарь:'],
    ['update the dictionary:', 'обновить словарь:'],
    ['This dictionary is currently used by the following profiles:', 'Этот словарь используется профилями:'],
].sort((a, b) => b[0].length - a[0].length));

/**
 * @param {string} text
 */
function trText(text) {
    if (!/[A-Za-z]/.test(text)) { return text; }
    const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!m) { return text; }
    let core = m[2];
    if (/^(Yomitan|Anki|MeCab|Chrome|Firefox|GitHub|URL|API|CSS|HTML|JSON|iframe)$/i.test(core.trim())) {
        return text;
    }
    for (const [e, r] of PHRASES) {
        if (core.includes(e)) { core = core.split(e).join(r); }
    }
    return m[1] + core + m[3];
}

/**
 * @param {string} html
 */
function translateHtml(html) {
    try {
        const {document} = parseHTML(`<div id="__x">${html}</div>`);
        const root = document.querySelector('#__x');
        if (!root) { return html; }
        const w = document.createTreeWalker(root, 4);
        /** @type {Text[]} */
        const nodes = [];
        while (w.nextNode()) { nodes.push(/** @type {Text} */ (w.currentNode)); }
        for (const n of nodes) { n.textContent = trText(n.textContent || ''); }
        return root.innerHTML;
    } catch (e) {
        return html;
    }
}

/**
 * @param {string} plain
 * @param {string} usedAsMessage
 */
function makeKey(plain, usedAsMessage) {
    let slug = plain.replace(/[^\w\s-]/g, ' ').trim().toLowerCase().replace(/[\s-]+/g, '_').slice(0, 42) || 'mixed';
    if (/^\d/.test(slug)) { slug = `n_${slug}`; }
    let key = `html_${slug}`;
    let n = 2;
    while (Object.hasOwn(en, key) && en[key].message !== usedAsMessage) {
        key = `html_${slug}_${n++}`;
    }
    return key;
}

/**
 * Needles that actually appear as contiguous substrings in source HTML.
 * Prefer long alphabetic runs from direct text nodes (ignore leading punctuation).
 * @param {Element} el
 * @param {string} raw
 * @returns {string[]}
 */
function directTextNeedles(el, raw) {
    /** @type {string[]} */
    const candidates = [];
    for (const n of el.childNodes) {
        if (n.nodeType === 3) {
            const rawT = n.textContent || '';
            // alphabetic sentence-like run
            const m = rawT.match(/[A-Za-z][\s\S]{8,120}?/);
            if (m) { candidates.push(m[0].replace(/\s+/g, ' ').trim()); }
            const t = rawT.replace(/\s+/g, ' ').trim().replace(/^[\s\-–—:]+/, '');
            if (t.length >= 8) { candidates.push(t); }
            // first long word sequence without leading dash
            const words = t.split(' ').filter(Boolean);
            if (words.length >= 3) {
                candidates.push(words.slice(0, Math.min(10, words.length)).join(' '));
                candidates.push(words.slice(0, 5).join(' '));
            }
        }
    }
    const plain = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (plain.length >= 8) {
        const words = plain.split(' ');
        for (let len = Math.min(10, words.length); len >= 3; len--) {
            candidates.push(words.slice(0, len).join(' '));
        }
        // after " - " explanations
        const afterDash = plain.split(/\s[–—-]\s/).pop();
        if (afterDash && afterDash.length >= 10) {
            candidates.push(afterDash);
            candidates.push(afterDash.split(' ').slice(0, 8).join(' '));
        }
    }

    /** @type {string[]} */
    const out = [];
    for (const c of candidates) {
        if (c.length < 8) { continue; }
        if (raw.includes(c)) {
            out.push(c);
            continue;
        }
        // try first 50 chars of c as contiguous in raw (source may break lines)
        const short = c.slice(0, 50);
        if (raw.includes(short)) {
            out.push(short);
        }
        // try matching with flexible whitespace via regex
        const flex = c.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        try {
            const re = new RegExp(flex);
            const m = re.exec(raw);
            if (m) { out.push(m[0]); }
        } catch (e) {
            // ignore
        }
    }
    return [...new Set(out)].sort((a, b) => b.length - a.length);
}

/**
 * Find the best opening tag before `idx` to attach data-i18n-html.
 * Skips closing tags and non-allowed inline tags (strong/em/a/code).
 * @param {string} raw
 * @param {number} idx
 * @param {string} key
 * @returns {{raw: string, ok: boolean}}
 */
function injectBeforeIndex(raw, idx, key) {
    let pos = idx;
    while (pos > 0 && idx - pos < 2000) {
        // find previous '<'
        while (pos > 0 && raw[pos] !== '<') { pos--; }
        if (raw[pos] !== '<') { return {raw, ok: false}; }
        const gt = raw.indexOf('>', pos);
        if (gt < 0 || gt > idx) { return {raw, ok: false}; }
        const tagChunk = raw.slice(pos, gt + 1);
        // skip comments / closing tags
        if (tagChunk.startsWith('</') || tagChunk.startsWith('<!--') || tagChunk.startsWith('<!')) {
            pos--;
            continue;
        }
        const tm = /^<([a-zA-Z0-9-]+)/.exec(tagChunk);
        if (!tm) {
            pos--;
            continue;
        }
        const tag = tm[1].toLowerCase();
        // skip pure inline wrappers — tag their parent instead
        if (['a', 'em', 'strong', 'code', 'i', 'b', 'img', 'br', 'wbr', 'svg', 'span'].includes(tag) && tag !== 'span') {
            // allow span only if it looks like a label container (has class settings-item-*)
            pos--;
            continue;
        }
        if (tag === 'span' && !/class="[^"]*settings-item|class="[^"]*placeholder|class="[^"]*heading|class="[^"]*modal|class="[^"]*outline/.test(tagChunk)) {
            pos--;
            continue;
        }
        if (!ALLOWED_TAGS.has(tag) && tag !== 'span') {
            pos--;
            continue;
        }
        // Intermediate tags may already have data-i18n (leaf children) — skip them.
        if (tagChunk.includes('data-i18n-html=')) {
            // parent already fully localized
            return {raw, ok: false};
        }
        if (/\bdata-i18n=/.test(tagChunk) && !ALLOWED_TAGS.has(tag)) {
            pos--;
            continue;
        }
        // If this allowed parent already has data-i18n leaf style, upgrade isn't needed
        if (/\bdata-i18n=/.test(tagChunk) && ALLOWED_TAGS.has(tag)) {
            return {raw, ok: false};
        }
        if (/content-outer|sidebar|settings-group|content-center|modal-content/.test(tagChunk)) {
            pos--;
            continue;
        }
        const newOpen = tagChunk.slice(0, -1) + ` data-i18n-html="${key}">`;
        return {raw: raw.slice(0, pos) + newOpen + raw.slice(gt + 1), ok: true};
    }
    return {raw, ok: false};
}

/**
 * @param {string} raw
 * @param {string} needle
 * @param {string} key
 * @returns {{raw: string, ok: boolean}}
 */
function injectNearNeedle(raw, needle, key) {
    if (needle.length < 5) { return {raw, ok: false}; }
    let idx = raw.indexOf(needle);
    if (idx < 0) {
        const alt = needle.replace(/&/g, '&amp;');
        idx = raw.indexOf(alt);
    }
    if (idx < 0) {
        idx = raw.indexOf(needle.slice(0, Math.min(45, needle.length)));
    }
    if (idx < 0) { return {raw, ok: false}; }
    return injectBeforeIndex(raw, idx, key);
}

/**
 * @param {ParentNode} root
 * @returns {Element[]}
 */
function findMixed(root) {
    /** @type {Element[]} */
    const out = [];
    for (const el of root.querySelectorAll('p, div, li, label, small, span, h2, h3')) {
        if (el.hasAttribute('data-i18n-html') || el.hasAttribute('data-i18n')) { continue; }
        if (el.closest('script, style')) { continue; }
        const kids = [...el.children];
        if (kids.length === 0) { continue; }
        if (!kids.every((c) => INLINE.has(c.tagName))) { continue; }
        let direct = '';
        for (const n of el.childNodes) {
            if (n.nodeType === 3) { direct += n.textContent || ''; }
        }
        if (direct.replace(/\s+/g, ' ').trim().length < 1) { continue; }
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!/[A-Za-z]{3,}/.test(text) || text.length > 550) { continue; }
        if (el.tagName === 'SPAN' && text.length < 10 && !/[.!?]/.test(text) && !text.includes(' ')) { continue; }
        out.push(el);
    }
    return out;
}

let totalTagged = 0;
let newKeys = 0;
/** @type {string[]} */
const fails = [];

for (const rel of FILES) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) { continue; }
    let raw = fs.readFileSync(abs, 'utf8');
    const {document} = parseHTML(raw);

    /** @type {Element[]} */
    const targets = [...findMixed(document)];
    for (const tpl of document.querySelectorAll('template')) {
        if (tpl.content) { targets.push(...findMixed(tpl.content)); }
    }
    targets.sort((a, b) => (b.textContent || '').length - (a.textContent || '').length);

    let fileOk = 0;
    for (const el of targets) {
        let enHtml = el.innerHTML.trim().replace(/\s+/g, ' ');
        enHtml = enHtml.replace(/\s*data-i18n(?:-html)?="[^"]*"/g, '');
        const plain = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (plain.length < 4) { continue; }

        const key = makeKey(plain, enHtml);
        if (!Object.hasOwn(en, key)) {
            en[key] = {message: enHtml, description: `Mixed HTML from ${rel}`};
            newKeys++;
        }
        const ruHtml = translateHtml(enHtml);
        if (!Object.hasOwn(ru, key) || ru[key].message === en[key].message || ru[key].message === enHtml) {
            ru[key] = {message: ruHtml, description: en[key].description};
        }

        let ok = false;
        for (const needle of directTextNeedles(el, raw)) {
            const res = injectNearNeedle(raw, needle, key);
            if (res.ok) {
                raw = res.raw;
                ok = true;
                break;
            }
        }
        if (ok) {
            fileOk++;
            totalTagged++;
        } else {
            fails.push(`${rel}\t${plain.slice(0, 80)}`);
        }
    }

    fs.writeFileSync(abs, raw, 'utf8');
    console.log(`${rel}: ${fileOk}/${targets.length}`);
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

fs.writeFileSync(enPath, `${JSON.stringify(sortObj(en), null, 4)}\n`, 'utf8');
fs.writeFileSync(ruPath, `${JSON.stringify(sortObj(ru), null, 4)}\n`, 'utf8');
fs.writeFileSync(path.join(root, 'dev', 'i18n-mixed-fail.txt'), fails.join('\n') + (fails.length ? '\n' : ''), 'utf8');
console.log(`Tagged ${totalTagged}, newKeys ${newKeys}, fails ${fails.length}, total keys ${Object.keys(en).length}`);
