#!/usr/bin/env node
/**
 * Sync recommended-dictionaries.json descriptions into _locales/{en,ru}/messages.json
 * as rec_dict_desc_* keys so every dictionary blurb is translatable via chrome.i18n.
 *
 * Usage: node dev/bin/i18n-sync-recommended-dicts.js
 * Safe to re-run: keeps existing non-English translations when English source is unchanged.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dictPath = path.join(root, 'ext', 'data', 'recommended-dictionaries.json');
const enPath = path.join(root, 'ext', '_locales', 'en', 'messages.json');
const ruPath = path.join(root, 'ext', '_locales', 'ru', 'messages.json');
const mapPath = path.join(root, 'ext', 'data', 'recommended-dictionaries-i18n-keys.json');

/**
 * Stable chrome.i18n message key for a recommended dictionary description.
 * Must stay in sync with ext/js/data/recommended-dictionary-i18n.js
 * @param {string} name
 * @returns {string}
 */
export function recommendedDictDescriptionKey(name) {
    const hash = createHash('sha1').update(name, 'utf8').digest('hex').slice(0, 8);
    let base = name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
    if (base.length === 0) {
        base = 'dict';
    }
    if (base.length > 40) {
        base = base.slice(0, 40);
    }
    return `rec_dict_desc_${base}_${hash}`;
}

/**
 * Best-effort Russian for common English description templates.
 * @param {string} eng
 * @returns {string|null}
 */
function autoRu(eng) {
    /** @type {Record<string, string>} */
    const known = {
        'Based on the Balanced Corpus of Contemporary Written Japanese covering books, magazines, newspapers, blogs, forums, textbooks, and legal documents among others.':
            'На основе Balanced Corpus of Contemporary Written Japanese: книги, журналы, газеты, блоги, форумы, учебники, юридические тексты и др.',
        'A frequency dictionary based on the corpus from the online Japanese dictionary and SRS system at https://jpdb.io.':
            'Словарь частотности по корпусу онлайн-словаря и SRS-системы https://jpdb.io.',
        'A frequency dictionary based on the corpus from the media stats database at https://jiten.moe':
            'Словарь частотности по базе медиа-статистики https://jiten.moe.',
        'An English dictionary with readings, meanings, stroke order diagrams, frequency, grade level, JLPT level and frequency of kanji characters.':
            'Английский словарь кандзи: чтения, значения, порядок черт, частотность, школьный уровень, JLPT и частота употребления.',
        'A free and openly licensed Japanese-to-English dictionary with example sentences, usage notes, etymology notes, cross references, antonyms, definition notes.':
            'Бесплатный открытый японско-английский словарь с примерами, пометками об употреблении, этимологией, перекрёстными ссылками, антонимами и пояснениями к значениям.',
        'A dictionary of Japanese proper names maintained by the Electronic Dictionary Research and Development Group.':
            'Словарь японских имён собственных, поддерживаемый Electronic Dictionary Research and Development Group.',
        'OpenRussian is a user-contributed, libre Russian dictionary including the accents, examples, audio, related words and synonyms.':
            'OpenRussian — свободный словарь русского языка с участием пользователей: ударения, примеры, аудио, связанные слова и синонимы.',
        'Frequency list of Cantonese terms and honzi provided by words.hk.':
            'Список частотности кантонских слов и иероглифов (honzi) от words.hk.',
        'A free and open Cantonese dictionary with definitions and example sentences in Cantonese and English.':
            'Бесплатный открытый кантонский словарь с определениями и примерами на кантонском и английском.',
        'CC-Canto is an open source Cantonese dictionary project created by Pleco, intended to be used alongside the CC-CEDICT dictionary.':
            'CC-Canto — открытый кантонский словарь от Pleco, рассчитанный на использование вместе с CC-CEDICT.',
        'CC-CEDICT is a continuation of the CEDICT project with the aim to provide a complete downloadable Chinese to English dictionary.':
            'CC-CEDICT — продолжение проекта CEDICT: полный скачиваемый китайско-английский словарь.',
        'CantoDict was a Cantonese-English dictionary created and maintained by Adam Sheik and public contributors.':
            'CantoDict — кантонско-английский словарь, созданный Адамом Шейком и сообществом.',
        'A free and open Chinese-English dictionary provided by the CC-CEDICT project.':
            'Бесплатный открытый китайско-английский словарь проекта CC-CEDICT.',
        'English to Hawaiian Dictionary from Pukui-Elbert in 1986':
            'Англо-гавайский словарь Pukui-Elbert (1986).',
        'English to Hawaiian Dictionary from Stephen (Kepano) Trussel':
            'Англо-гавайский словарь Stephen (Kepano) Trussel.',
        'Hawaiian Place Names, published 2002':
            'Гавайские топонимы (издание 2002).',
    };
    if (Object.hasOwn(known, eng)) {
        return known[eng];
    }

    let m = /^(.+) to English dictionary created from Wiktionary data\.?$/i.exec(eng);
    if (m) {
        return `Словарь «${m[1]}» → английский (данные Wiktionary).`;
    }
    m = /^(.+) IPA dictionary created from Wiktionary data\.?$/i.exec(eng);
    if (m) {
        return `Словарь IPA «${m[1]}» (данные Wiktionary).`;
    }
    m = /^Toki Pona to (.+) dictionary$/i.exec(eng);
    if (m) {
        return `Словарь Toki Pona → ${m[1]}.`;
    }
    return null;
}

/**
 * @param {Record<string, unknown>} obj
 */
function sortObj(obj) {
    return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

const dicts = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));

/** @type {Record<string, string>} */
const nameToKey = {};
/** @type {Map<string, string>} */
const keyToEn = new Map();

for (const cats of Object.values(dicts)) {
    for (const list of Object.values(cats)) {
        for (const item of /** @type {{name: string, description: string}[]} */ (list)) {
            const key = recommendedDictDescriptionKey(item.name);
            nameToKey[item.name] = key;
            if (keyToEn.has(key) && keyToEn.get(key) !== item.description) {
                throw new Error(`Key collision with different description: ${key} / ${item.name}`);
            }
            keyToEn.set(key, item.description);
        }
    }
}

let addedEn = 0;
let addedRu = 0;
let updatedEn = 0;
let autoRuCount = 0;

for (const [key, eng] of keyToEn) {
    const prevEn = en[key]?.message;
    if (!en[key]) {
        en[key] = {
            message: eng,
            description: 'Recommended dictionary description (from recommended-dictionaries.json)',
        };
        addedEn++;
    } else if (prevEn !== eng) {
        en[key].message = eng;
        updatedEn++;
    }

    const prevRu = ru[key]?.message;
    const prevEnForRu = prevEn || eng;
    if (!ru[key]) {
        const translated = autoRu(eng) || eng;
        ru[key] = {
            message: translated,
            description: en[key].description,
        };
        addedRu++;
        if (translated !== eng) {
            autoRuCount++;
        }
    } else if (prevRu === prevEnForRu && prevEnForRu !== eng) {
        // RU was a copy of old EN; refresh from new EN or autoRu
        const translated = autoRu(eng) || eng;
        ru[key].message = translated;
        if (translated !== eng) {
            autoRuCount++;
        }
    } else if (prevRu === eng) {
        // Still untranslated English — try autoRu
        const translated = autoRu(eng);
        if (translated) {
            ru[key].message = translated;
            autoRuCount++;
        }
    }
}

// Drop obsolete rec_dict_desc_* keys no longer in source
const liveKeys = new Set(keyToEn.keys());
for (const key of Object.keys(en)) {
    if (key.startsWith('rec_dict_desc_') && !liveKeys.has(key)) {
        delete en[key];
        delete ru[key];
    }
}

fs.writeFileSync(enPath, `${JSON.stringify(sortObj(en), null, 4)}\n`);
fs.writeFileSync(ruPath, `${JSON.stringify(sortObj(ru), null, 4)}\n`);
fs.writeFileSync(mapPath, `${JSON.stringify(nameToKey, null, 4)}\n`);

console.log(`dictionaries: ${Object.keys(nameToKey).length}`);
console.log(`keys: ${keyToEn.size}`);
console.log(`en +${addedEn} ~${updatedEn}`);
console.log(`ru +${addedRu} autoRu ${autoRuCount}`);
console.log(`total locale keys en=${Object.keys(en).length} ru=${Object.keys(ru).length}`);
console.log(`map: ${path.relative(root, mapPath)}`);
