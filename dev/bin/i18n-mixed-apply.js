#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseHTML} from 'linkedom';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const enPath = path.join(root, 'ext', '_locales', 'en', 'messages.json');
const ruPath = path.join(root, 'ext', '_locales', 'ru', 'messages.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));

const PHRASES = [
    ['welcome guide', 'руководство'],
    ['Privacy Policy', 'Политика конфиденциальности'],
    ['More…', 'Ещё…'],
    ['More...', 'Ещё…'],
    ['Less…', 'Свернуть…'],
    ['No key', 'Нет клавиши'],
    ['Import', 'Импорт'],
    ['here', 'здесь'],
    ['installed', 'установлено'],
    ['enabled', 'включено'],
    ['in milliseconds', 'в миллисекундах'],
    ['Character', 'Символ'],
    ['Word', 'Слово'],
    ['Default', 'По умолчанию'],
    ['Full Width', 'Полная ширина'],
    ['Advanced', 'Расширенные'],
    ['Auto', 'Авто'],
    ['Primary dictionary', 'Основной словарь'],
    ['Secondary dictionaries', 'Вторичные словари'],
    ['No grouping', 'Без группировки'],
    ['Group term-reading pairs', 'Группировать пары термин–чтение'],
    ['Group by term', 'Группировать по термину'],
    ['Group related terms', 'Группировать связанные термины'],
    ['Configure advanced scanning inputs', 'Настроить расширенный ввод сканирования'],
    ['Frequency sorting mode', 'Режим сортировки по частотности'],
    ['Sort results using a frequency dictionary.', 'Сортировать результаты по словарю частотности.'],
    ['Show the ', 'Показывать '],
    [' on browser startup', ' при запуске браузера'],
    ['A setup guide can be found ', 'Руководство по установке: '],
    ['To activate the Yomitan API, a native messaging component must be installed. ', 'Чтобы включить Yomitan API, установите компонент native messaging. '],
    ['free dictionaries', 'бесплатных словарей'],
    ['or click the ', 'или нажмите '],
    [' button below to select a dictionary file to import.', ' ниже, чтобы выбрать файл словаря для импорта.'],
    ['for a list of ', 'список '],
    ['Visit the ', 'См. '],
    ['Are you sure you want to delete the dictionary:', 'Удалить словарь:'],
    ['Are you sure you want to update the dictionary:', 'Обновить словарь:'],
    ['Are you sure you want to delete ', 'Удалить '],
    ['all dictionaries', 'все словари'],
    ['This dictionary is currently used by the following profiles:', 'Этот словарь используется профилями:'],
    ['Need help?', 'Нужна помощь?'],
    ['Due to a bug in Safari, it may be necessary to click the ', 'Из‑за ошибки Safari может потребоваться нажать '],
    [' button in the browser bar to fully load the page', ' на панели браузера, чтобы полностью загрузить страницу'],
    ['This option may send data outside of Yomitan to local applications that request it', 'Эта опция может отправлять данные из Yomitan локальным приложениям по запросу'],
    ['Only enable this option if you trust the authors of your dictionaries', 'Включайте только если доверяете авторам словарей'],
    ['Enable to help prevent the browser from unexpectedly clearing the database.', 'Помогает предотвратить неожиданную очистку базы браузером.'],
    ['Hold a key while moving the cursor to scan text.', 'Удерживайте клавишу и ведите курсор для сканирования.'],
    ['Start the lookup scan at the word or character of the cursor position.', 'Начинать поиск со слова или символа под курсором.'],
    ['Scan delay', 'Задержка сканирования'],
    ['Correct the pointer location on webpages where CSS zoom is used.', 'Корректировать позицию указателя при CSS zoom.'],
    ['Enable suffix wildcard when looking up scanned webpage text.', 'Подстановочный суффикс при поиске отсканированного текста.'],
    ['Show iframe popups in the root frame', 'Показывать popup iframe в корневом фрейме'],
    ['Change the font family used in Yomitan.', 'Семейство шрифтов в Yomitan.'],
    ['Japanese only.', 'Только японский.'],
    ['Change how related results are grouped.', 'Как группировать связанные результаты.'],
    ['Change the layout of the popup.', 'Макет всплывающего окна.'],
    ['Auto-scale', 'Автомасштаб'],
    ['Text on the search page can be scanned for definitions, which will open a popup.', 'Текст на странице поиска можно сканировать — откроется всплывающее окно.'],
    ['More advanced scanning input customization can be set up by enabling the ', 'Расширенный ввод сканирования: включите '],
    [' option and clicking ', ' и нажмите '],
].sort((a, b) => b[0].length - a[0].length);

/**
 * @param {string} text
 * @returns {string}
 */
function trText(text) {
    if (!/[A-Za-z]/.test(text)) { return text; }
    const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!m) { return text; }
    let core = m[2];
    for (const [e, r] of PHRASES) {
        if (core.includes(e)) {
            core = core.split(e).join(r);
        }
    }
    return m[1] + core + m[3];
}

/**
 * @param {Element} el
 */
function trEl(el) {
    const w = el.ownerDocument.createTreeWalker(el, 4);
    /** @type {Text[]} */
    const nodes = [];
    while (w.nextNode()) {
        nodes.push(/** @type {Text} */ (w.currentNode));
    }
    for (const n of nodes) {
        if (n.parentElement && ['SCRIPT', 'STYLE'].includes(n.parentElement.tagName)) { continue; }
        n.textContent = trText(n.textContent || '');
    }
}

/**
 * @param {string} s
 * @returns {string}
 */
function makeKey(s) {
    let slug = s
        .replace(/<[^>]+>/g, ' ')
        .replace(/[^\w\s-]/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .slice(0, 40);
    if (!slug) { slug = 'mixed'; }
    let key = `html_${slug}`;
    let n = 2;
    while (Object.hasOwn(en, key) && en[key].message !== s) {
        key = `html_${slug}_${n++}`;
    }
    return key;
}

const SEL = 'p, div.settings-item-label, div.settings-item-description, div.modal-title, li, label, h2, h3, small';

/**
 * @param {ParentNode} root
 * @param {(el: Element) => void} onHit
 */
function processRoot(root, onHit) {
    for (const el of root.querySelectorAll(SEL)) {
        if (el.hasAttribute('data-i18n') || el.hasAttribute('data-i18n-html')) { continue; }
        const kids = [...el.children];
        if (kids.length === 0) { continue; }
        if (!kids.every((c) => ['A', 'EM', 'STRONG', 'CODE', 'I', 'B', 'SPAN', 'IMG', 'BR'].includes(c.tagName))) {
            continue;
        }
        let direct = '';
        for (const n of el.childNodes) {
            if (n.nodeType === 3) { direct += n.textContent || ''; }
        }
        if (direct.replace(/\s+/g, ' ').trim().length < 2) { continue; }
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!/[A-Za-z]{3,}/.test(text) || text.length > 400) { continue; }
        onHit(el);
    }
}

const files = [
    'ext/templates-modals.html',
    'ext/templates-settings.html',
    'ext/templates-display.html',
    'ext/welcome.html',
    'ext/permissions.html',
    'ext/info.html',
    'ext/quick-start-guide.html',
];

let total = 0;
for (const rel of files) {
    const abs = path.join(root, rel);
    const raw = fs.readFileSync(abs, 'utf8');
    const {document} = parseHTML(raw);
    let count = 0;
    /** @param {Element} el */
    const hit = (el) => {
        const enHtml = el.innerHTML.trim().replace(/\s+/g, ' ');
        const key = makeKey(enHtml);
        if (!Object.hasOwn(en, key)) {
            en[key] = {message: enHtml, description: `Mixed HTML from ${rel}`};
        }
        const clone = /** @type {Element} */ (el.cloneNode(true));
        trEl(clone);
        const ruHtml = clone.innerHTML.trim().replace(/\s+/g, ' ');
        if (!Object.hasOwn(ru, key) || ru[key].message === en[key].message) {
            ru[key] = {message: ruHtml, description: en[key].description};
        }
        el.setAttribute('data-i18n-html', key);
        for (const c of el.querySelectorAll('[data-i18n]')) {
            c.removeAttribute('data-i18n');
        }
        count++;
    };
    processRoot(document, hit);
    for (const tpl of document.querySelectorAll('template')) {
        if (tpl.content) {
            processRoot(tpl.content, hit);
        }
    }
    const doctype = (raw.startsWith('<!DOCTYPE') || raw.startsWith('<!doctype')) ? '<!DOCTYPE html>\n' : '';
    fs.writeFileSync(abs, `${doctype}${document.documentElement.outerHTML}\n`, 'utf8');
    console.log(rel, count);
    total += count;
}

// settings.html: inject without full re-serialize
const settingsPath = path.join(root, 'ext', 'settings.html');
let settings = fs.readFileSync(settingsPath, 'utf8');
const settingsSnippets = [
    {
        re: /(<div class="settings-item-label")(>)(\s*Show the <a[^>]*>welcome guide<\/a> on browser startup\s*)(<\/div>)/,
        key: 'html_show_welcome_guide_startup',
        ruFrom: (/** @type {string} */ inner) => {
            void inner;
            return 'Показывать <a href="/welcome.html" target="_blank" rel="noopener">руководство</a> при запуске браузера';
        },
    },
    {
        re: /(<div class="settings-item-label")(>)(\s*Scan delay\s*<a[^>]*>[^<]*<\/a>\s*)(<\/div>)/,
        key: 'html_scan_delay_ms_label',
        ruFrom: () => 'Задержка сканирования <a tabindex="0" class="more-toggle more-only" data-parent-distance="4">(?)</a>',
    },
];

for (const snip of settingsSnippets) {
    if (snip.re.test(settings)) {
        settings = settings.replace(snip.re, (full, open, gt, inner, close) => {
            const enHtml = inner.trim().replace(/\s+/g, ' ');
            en[snip.key] = {message: enHtml, description: 'Mixed HTML from settings.html'};
            const cloneWrap = parseHTML(`<div id="x">${inner}</div>`).document.querySelector('#x');
            if (cloneWrap) {
                trEl(cloneWrap);
                ru[snip.key] = {
                    message: cloneWrap.innerHTML.trim().replace(/\s+/g, ' '),
                    description: en[snip.key].description,
                };
            } else {
                ru[snip.key] = {message: snip.ruFrom(inner), description: en[snip.key].description};
            }
            total++;
            return `${open} data-i18n-html="${snip.key}"${gt}${inner}${close}`;
        });
        console.log('settings snippet', snip.key);
    }
}
fs.writeFileSync(settingsPath, settings, 'utf8');

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

fs.writeFileSync(enPath, `${JSON.stringify(sortObj(en), null, 4)}\n`, 'utf8');
fs.writeFileSync(ruPath, `${JSON.stringify(sortObj(ru), null, 4)}\n`, 'utf8');
console.log('total mixed', total, 'keys', Object.keys(en).length);
