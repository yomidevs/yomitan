#!/usr/bin/env node
/**
 * Inject data-i18n into HTML leaf nodes by matching text against en/messages.json.
 * Works on <template> source files without relying on DOM serialization.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const en = JSON.parse(fs.readFileSync(path.join(root, 'ext', '_locales', 'en', 'messages.json'), 'utf8'));

/** @type {Map<string, string>} */
const textToKey = new Map();
for (const [key, entry] of Object.entries(en)) {
    if (entry?.message && !textToKey.has(entry.message)) {
        textToKey.set(entry.message, key);
    }
}

const files = [
    'ext/templates-modals.html',
    'ext/templates-settings.html',
    'ext/templates-display.html',
];

const TAGS = 'div|span|p|a|button|h1|h2|h3|h4|label|li|th|td|strong|em|small|option|legend|summary|figcaption';

/**
 * @param {string} s
 * @returns {string}
 */
function flexPattern(s) {
    let e = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    e = e.replace(/&/g, '(?:&|&amp;)');
    e = e.replace(/…/g, '(?:…|\\.\\.\\.)');
    e = e.replace(/'/g, "(?:'|&#39;|&apos;)");
    e = e.replace(/"/g, '(?:"|&quot;|&#34;)');
    return e;
}

let total = 0;
for (const rel of files) {
    const abs = path.join(root, rel);
    let html = fs.readFileSync(abs, 'utf8');
    let count = 0;
    const messages = [...textToKey.keys()].sort((a, b) => b.length - a.length);

    for (const message of messages) {
        if (message.length < 2) { continue; }
        // Skip pure technical tokens that are also brand names with no spaces and short
        const key = /** @type {string} */ (textToKey.get(message));
        const pat = flexPattern(message);
        const re = new RegExp(
            `(<(?:${TAGS})(?![^>]*\\bdata-i18n=)[^>]*?)>(\\s*)(${pat})(\\s*)(</(?:${TAGS})>)`,
            'gi',
        );
        html = html.replace(re, (full, open, ws1, text, ws2, close) => {
            if (/\bdata-i18n\s*=/.test(open)) { return full; }
            // Don't tag icon-only / empty class noise
            if (/\bclass="[^"]*\bicon\b[^"]*"/.test(open) && message.length < 20 && !/\s/.test(message)) {
                return full;
            }
            count++;
            return `${open} data-i18n="${key}">${ws1}${text}${ws2}${close}`;
        });
    }

    fs.writeFileSync(abs, html, 'utf8');
    console.log(`${rel}: ${count} tags`);
    total += count;
}
console.log('total', total);
