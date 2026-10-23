#!/usr/bin/env node
/*
 * Copyright (C) 2023-2026  Yomitan Authors
 *
 * Checks that non-default locale message files contain every English key.
 * Exit code 1 if any locale is missing keys (or has invalid JSON).
 */

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const localesRoot = path.join(dirname, '..', '..', 'ext', '_locales');
const defaultLocale = 'en';

/**
 * @param {string} filePath
 * @returns {Record<string, unknown>}
 */
function loadMessages(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(`Expected object in ${filePath}`);
    }
    return data;
}

/**
 * @returns {{ok: boolean, lines: string[], summaryMarkdown: string}}
 */
function check() {
    const lines = [];
    /** @type {string[]} */
    const summaryParts = [];
    let ok = true;

    if (!fs.existsSync(localesRoot)) {
        lines.push(`ERROR: locales directory not found: ${localesRoot}`);
        return {ok: false, lines, summaryMarkdown: '- **error**: `_locales` directory missing\n'};
    }

    const enPath = path.join(localesRoot, defaultLocale, 'messages.json');
    if (!fs.existsSync(enPath)) {
        lines.push(`ERROR: missing default locale file: ${enPath}`);
        return {ok: false, lines, summaryMarkdown: `- **error**: missing \`${defaultLocale}/messages.json\`\n`};
    }

    const en = loadMessages(enPath);
    const enKeys = Object.keys(en).sort();
    lines.push(`Default locale (${defaultLocale}): ${enKeys.length} keys`);

    const localeDirs = fs.readdirSync(localesRoot, {withFileTypes: true})
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();

    for (const lang of localeDirs) {
        if (lang === defaultLocale) { continue; }
        const messagesPath = path.join(localesRoot, lang, 'messages.json');
        if (!fs.existsSync(messagesPath)) {
            ok = false;
            lines.push(`ERROR: ${lang}: missing messages.json`);
            summaryParts.push(`- **${lang}**: missing \`messages.json\``);
            continue;
        }

        let langMessages;
        try {
            langMessages = loadMessages(messagesPath);
        } catch (e) {
            ok = false;
            const msg = e instanceof Error ? e.message : String(e);
            lines.push(`ERROR: ${lang}: invalid JSON — ${msg}`);
            summaryParts.push(`- **${lang}**: invalid JSON`);
            continue;
        }

        const langKeys = new Set(Object.keys(langMessages));
        const missing = enKeys.filter((k) => !langKeys.has(k));
        const extra = Object.keys(langMessages).filter((k) => !Object.hasOwn(en, k)).sort();

        // Validate entry shape for present keys
        /** @type {string[]} */
        const invalid = [];
        for (const key of Object.keys(langMessages)) {
            const entry = langMessages[key];
            if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
                invalid.push(key);
                continue;
            }
            if (typeof /** @type {{message?: unknown}} */ (entry).message !== 'string') {
                invalid.push(key);
            }
        }

        // Count messages still identical to English (likely untranslated UI).
        // Brands / technical tokens are excluded from the "lag" count.
        const intentionalSame = (/** @type {string} */ msg) => {
            if (msg.length <= 4) { return true; }
            if (/^(Yomitan|Anki|AnkiConnect|MeCab|EDICT|KANJIDIC|Jisho\.org|Wiktionary|JapanesePod101|LanguagePod101|Handlebars\.js|GitHub|Chrome|Firefox|Edge|Safari|Bloop|Romaji|Discord|JPEG|PNG|URL|API|CSS|HTML|JSON|DOM|OK|ID|Ctrl\+C|Escape|true|px|src|iframe|monospace|sans-serif|serif|speaker|storage|zoom|cog|Web|Body|Graph|EDRDG|Lingua Libre)/i.test(msg)) {
                return true;
            }
            if (/^(about:|chrome:\/\/|edge:\/\/|file:\/\/|<all_urls>|clipboard|scripting|nativeMessaging|unlimitedStorage|declarativeNetRequest|contextMenus|yomichan|Electronic Dictionary|Noto Sans|\(Chrome\)|\(Commons\))/i.test(msg)) {
                return true;
            }
            // Technical / brand-like snippets that may include markup or punctuation
            if (/iframe|shadow DOM|User agent:|Noto Sans|Meiryo/i.test(msg)) {
                return true;
            }
            return false;
        };

        let untranslated = 0;
        for (const key of enKeys) {
            if (!langKeys.has(key)) { continue; }
            const em = /** @type {{message?: string}} */ (en[key]).message;
            const lm = /** @type {{message?: string}} */ (langMessages[key]).message;
            if (typeof em !== 'string' || typeof lm !== 'string') { continue; }
            if (em === lm && /[A-Za-z]{3,}/.test(em) && !intentionalSame(em)) {
                untranslated++;
            }
        }

        if (missing.length > 0) {
            ok = false;
            lines.push(`FAIL: ${lang} is missing ${missing.length} key(s): ${missing.join(', ')}`);
            let lag = `- **${lang}**: missing ${missing.length} key(s)`;
            if (untranslated > 0) {
                lag += `; ${untranslated} string(s) still in English`;
            }
            summaryParts.push(lag);
        } else {
            lines.push(`OK: ${lang} has all ${enKeys.length} keys`);
            if (untranslated > 0) {
                lines.push(`WARN: ${lang} has ${untranslated} message(s) still identical to ${defaultLocale} (likely untranslated UI)`);
                summaryParts.push(`- **${lang}**: all keys present (${enKeys.length}); **${untranslated}** string(s) still in English`);
            } else {
                summaryParts.push(`- **${lang}**: up to date (${enKeys.length} strings)`);
            }
        }

        if (extra.length > 0) {
            lines.push(`WARN: ${lang} has ${extra.length} extra key(s) not in ${defaultLocale}: ${extra.join(', ')}`);
        }
        if (invalid.length > 0) {
            ok = false;
            lines.push(`FAIL: ${lang} has ${invalid.length} invalid entr(y/ies) (need { "message": "..." }): ${invalid.join(', ')}`);
        }
    }

    if (localeDirs.filter((l) => l !== defaultLocale).length === 0) {
        lines.push('WARN: no non-default locales found');
        summaryParts.push('- no additional locales');
    }

    const summaryMarkdown = summaryParts.length > 0 ? `${summaryParts.join('\n')}\n` : '';
    return {ok, lines, summaryMarkdown};
}

const {ok, lines, summaryMarkdown} = check();
for (const line of lines) {
    console.log(line);
}

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (typeof summaryPath === 'string' && summaryPath.length > 0) {
    const body = `## i18n check\n\n${summaryMarkdown || '_No locale diffs._\n'}\n`;
    fs.appendFileSync(summaryPath, body, 'utf8');
}

const outputPath = process.env.GITHUB_OUTPUT;
if (typeof outputPath === 'string' && outputPath.length > 0) {
    const missingOnly = lines
        .filter((l) => l.startsWith('FAIL:') && l.includes('missing'))
        .map((l) => {
            const m = /^FAIL: (\S+) is missing (\d+)/.exec(l);
            return m ? `- **${m[1]}**: missing ${m[2]} key(s)` : null;
        })
        .filter(Boolean);
    const summary = missingOnly.length > 0 ? `${missingOnly.join('\\n')}\\n` : '';
    fs.appendFileSync(outputPath, `ok=${ok}\n`, 'utf8');
    fs.appendFileSync(outputPath, `summary<<EOF\n${summaryMarkdown}\nEOF\n`, 'utf8');
    fs.appendFileSync(outputPath, `has_missing=${missingOnly.length > 0}\n`, 'utf8');
}

process.exit(ok ? 0 : 1);
