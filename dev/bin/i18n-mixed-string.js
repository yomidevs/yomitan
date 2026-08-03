#!/usr/bin/env node
import fs from 'node:fs';
import {parseHTML} from 'linkedom';

const en = JSON.parse(fs.readFileSync('ext/_locales/en/messages.json', 'utf8'));
const ru = JSON.parse(fs.readFileSync('ext/_locales/ru/messages.json', 'utf8'));

// Fix welcome guide RU
const wk = 'html_show_welcome_guide_startup';
if (en[wk]) {
    en[wk].message = en[wk].message.replace(/\s*data-i18n="[^"]*"/g, '');
    ru[wk] = {
        message: 'Показывать <a href="/welcome.html" target="_blank" rel="noopener">руководство</a> при запуске браузера',
        description: en[wk].description,
    };
}

const PHRASES = [
    ['Enable support for prefix wildcard searches', 'Включить поддержку поиска с подстановочным префиксом'],
    ['welcome guide', 'руководство'],
    ['Privacy Policy', 'Политика конфиденциальности'],
    ['More…', 'Ещё…'],
    ['More...', 'Ещё…'],
    ['Less…', 'Свернуть…'],
    ['Import', 'Импорт'],
    ['here', 'здесь'],
    ['Are you sure you want to delete the dictionary:', 'Удалить словарь:'],
    ['Are you sure you want to update the dictionary:', 'Обновить словарь:'],
    ['Are you sure you want to delete ', 'Удалить '],
    ['all dictionaries', 'все словари'],
    ['This dictionary is currently used by the following profiles:', 'Этот словарь используется профилями:'],
    ['Visit the ', 'См. '],
    ['for a list of free dictionaries or click the ', 'список бесплатных словарей или нажмите '],
    [' button below to select a dictionary file to import.', ' ниже, чтобы выбрать файл словаря.'],
    ['Need help?', 'Нужна помощь?'],
    ['in milliseconds', 'в миллисекундах'],
    ['Show the ', 'Показывать '],
    [' on browser startup', ' при запуске браузера'],
    ['Due to a bug in Safari, it may be necessary to click the ', 'Из‑за ошибки Safari может потребоваться нажать '],
    [' button in the browser bar to fully load the page', ' на панели браузера, чтобы полностью загрузить страницу'],
].sort((a, b) => b[0].length - a[0].length);

/**
 * @param {string} t
 */
function trText(t) {
    if (!/[A-Za-z]/.test(t)) { return t; }
    let o = t;
    for (const [e, r] of PHRASES) {
        if (o.includes(e)) { o = o.split(e).join(r); }
    }
    return o;
}

/**
 * @param {string} s
 */
function makeKey(s) {
    let slug = s.replace(/<[^>]+>/g, ' ').replace(/[^\w\s-]/g, ' ').trim().toLowerCase().replace(/[\s-]+/g, '_').slice(0, 40) || 'mixed';
    let key = `html_${slug}`;
    let n = 2;
    while (Object.hasOwn(en, key) && en[key].message !== s) {
        key = `html_${slug}_${n++}`;
    }
    return key;
}

const files = [
    'ext/templates-modals.html',
    'ext/welcome.html',
    'ext/permissions.html',
    'ext/info.html',
    'ext/settings.html',
];
const SEL = 'p, div.settings-item-label, div.settings-item-description, li, label, small';
let total = 0;

for (const rel of files) {
    let raw = fs.readFileSync(rel, 'utf8');
    const {document} = parseHTML(raw);
    let count = 0;

    /**
     * @param {Element} el
     */
    function processEl(el) {
        if (el.hasAttribute('data-i18n') || el.hasAttribute('data-i18n-html')) { return; }
        const kids = [...el.children];
        if (kids.length === 0) { return; }
        if (!kids.every((c) => ['A', 'EM', 'STRONG', 'CODE', 'I', 'B', 'SPAN', 'IMG', 'BR'].includes(c.tagName))) {
            return;
        }
        let direct = '';
        for (const n of el.childNodes) {
            if (n.nodeType === 3) { direct += n.textContent || ''; }
        }
        if (direct.replace(/\s+/g, ' ').trim().length < 2) { return; }
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!/[A-Za-z]{3,}/.test(text) || text.length > 400) { return; }

        const enHtml = el.innerHTML.trim().replace(/\s+/g, ' ').replace(/\s*data-i18n="[^"]*"/g, '');
        const key = makeKey(enHtml);
        if (!Object.hasOwn(en, key)) {
            en[key] = {message: enHtml, description: `Mixed HTML ${rel}`};
        }

        const {document: d2} = parseHTML(`<div id="x">${enHtml}</div>`);
        const wrap = d2.querySelector('#x');
        if (wrap) {
            const w = d2.createTreeWalker(wrap, 4);
            /** @type {Text[]} */
            const nodes = [];
            while (w.nextNode()) { nodes.push(/** @type {Text} */ (w.currentNode)); }
            for (const n of nodes) { n.textContent = trText(n.textContent || ''); }
            const ruHtml = wrap.innerHTML.trim().replace(/\s+/g, ' ');
            if (!Object.hasOwn(ru, key) || ru[key].message === en[key].message) {
                ru[key] = {message: ruHtml, description: en[key].description};
            }
        }

        // Inject attribute into source string
        const tag = el.tagName.toLowerCase();
        const cls = el.getAttribute('class');
        let openRe;
        if (cls) {
            openRe = new RegExp(
                `<(${tag})(\\s+[^>]*\\bclass="${cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*?)(?<!data-i18n-html="[^"]*")>`,
                'i',
            );
        } else {
            openRe = new RegExp(`<(${tag})(\\s[^>]*|)?(?<!data-i18n-html="[^"]*")>`, 'i');
        }

        // More reliable: find exact text snippet start near tag
        const needle = text.slice(0, Math.min(50, text.length));
        const idx = raw.indexOf(needle);
        if (idx < 0) { return; }
        // walk back to '<'
        let i = idx;
        while (i > 0 && raw[i] !== '<') { i--; }
        // find end of opening tag
        const gt = raw.indexOf('>', i);
        if (gt < 0 || gt > idx) { return; }
        const openTag = raw.slice(i, gt + 1);
        if (openTag.includes('data-i18n-html=') || openTag.includes('data-i18n=')) { return; }
        if (!openTag.toLowerCase().startsWith(`<${tag}`)) { return; }
        const newOpen = openTag.slice(0, -1) + ` data-i18n-html="${key}">`;
        raw = raw.slice(0, i) + newOpen + raw.slice(gt + 1);
        count++;
    }

    for (const el of document.querySelectorAll(SEL)) {
        processEl(el);
    }
    for (const tpl of document.querySelectorAll('template')) {
        if (!tpl.content) { continue; }
        for (const el of tpl.content.querySelectorAll(SEL)) {
            processEl(el);
        }
    }

    fs.writeFileSync(rel, raw);
    console.log(rel, count);
    total += count;
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

fs.writeFileSync('ext/_locales/en/messages.json', `${JSON.stringify(sortObj(en), null, 4)}\n`);
fs.writeFileSync('ext/_locales/ru/messages.json', `${JSON.stringify(sortObj(ru), null, 4)}\n`);
console.log('total', total, 'keys', Object.keys(en).length);
