/*
 * Copyright (C) 2023-2025  Yomitan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import {dedupeDictionaryTitle, dedupeSearchTerm} from './anki-dedupe-matrix.js';

/** @type {Map<string, Promise<string>>} */
const dictionaryDatabaseBase64PromiseMap = new Map();

/**
 * @param {string} value
 * @returns {string}
 */
function escapeSqlString(value) {
    return value.replaceAll('\'', '\'\'');
}

/**
 * @param {{
 *   title: string,
 *   revision: string,
 *   expression: string,
 *   reading: string,
 *   glossary: string[],
 * }} options
 * @returns {Promise<string>}
 */
export async function createDictionaryDatabaseBase64(options) {
    const {title, revision, expression, reading, glossary} = options;
    const cacheKey = JSON.stringify({title, revision, expression, reading, glossary});
    let promise = dictionaryDatabaseBase64PromiseMap.get(cacheKey);
    if (typeof promise !== 'undefined') {
        return await promise;
    }

    promise = (async () => {
        const summaryJson = JSON.stringify({
            title,
            revision,
            sequenced: true,
            version: 3,
            importDate: Date.now(),
            prefixWildcardsSupported: false,
            counts: {
                terms: {total: 1},
                termMeta: {total: 0},
                kanji: {total: 0},
                kanjiMeta: {total: 0},
                tagMeta: {total: 0},
                media: {total: 0},
            },
            styles: '',
            importSuccess: true,
        });
        const glossaryJson = JSON.stringify(glossary);
        const sql = `
            PRAGMA journal_mode = DELETE;
            PRAGMA synchronous = NORMAL;
            PRAGMA user_version = 4;

            CREATE TABLE dictionaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                version INTEGER NOT NULL,
                summaryJson TEXT NOT NULL
            );

            CREATE TABLE terms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                expression TEXT NOT NULL,
                reading TEXT NOT NULL,
                expressionReverse TEXT,
                readingReverse TEXT,
                definitionTags TEXT,
                termTags TEXT,
                rules TEXT,
                score INTEGER,
                glossaryJson TEXT NOT NULL,
                sequence INTEGER
            );

            CREATE TABLE termMeta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                expression TEXT NOT NULL,
                mode TEXT NOT NULL,
                dataJson TEXT NOT NULL
            );

            CREATE TABLE kanji (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                character TEXT NOT NULL,
                onyomi TEXT,
                kunyomi TEXT,
                tags TEXT,
                meaningsJson TEXT NOT NULL,
                statsJson TEXT
            );

            CREATE TABLE kanjiMeta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                character TEXT NOT NULL,
                mode TEXT NOT NULL,
                dataJson TEXT NOT NULL
            );

            CREATE TABLE tagMeta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                ord INTEGER,
                notes TEXT,
                score INTEGER
            );

            CREATE TABLE media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                path TEXT NOT NULL,
                mediaType TEXT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                content BLOB NOT NULL
            );

            CREATE INDEX idx_dictionaries_title ON dictionaries(title);
            CREATE INDEX idx_dictionaries_version ON dictionaries(version);
            CREATE INDEX idx_terms_dictionary ON terms(dictionary);
            CREATE INDEX idx_terms_expression ON terms(expression);
            CREATE INDEX idx_terms_reading ON terms(reading);
            CREATE INDEX idx_terms_sequence ON terms(sequence);
            CREATE INDEX idx_terms_expression_reverse ON terms(expressionReverse);
            CREATE INDEX idx_terms_reading_reverse ON terms(readingReverse);
            CREATE INDEX idx_term_meta_dictionary ON termMeta(dictionary);
            CREATE INDEX idx_term_meta_expression ON termMeta(expression);
            CREATE INDEX idx_kanji_dictionary ON kanji(dictionary);
            CREATE INDEX idx_kanji_character ON kanji(character);
            CREATE INDEX idx_kanji_meta_dictionary ON kanjiMeta(dictionary);
            CREATE INDEX idx_kanji_meta_character ON kanjiMeta(character);
            CREATE INDEX idx_tag_meta_dictionary ON tagMeta(dictionary);
            CREATE INDEX idx_tag_meta_name ON tagMeta(name);
            CREATE INDEX idx_media_dictionary ON media(dictionary);
            CREATE INDEX idx_media_path ON media(path);

            INSERT INTO dictionaries(title, version, summaryJson)
            VALUES ('${escapeSqlString(title)}', 3, '${escapeSqlString(summaryJson)}');

            INSERT INTO terms(
                dictionary, expression, reading, expressionReverse, readingReverse,
                definitionTags, termTags, rules, score, glossaryJson, sequence
            ) VALUES (
                '${escapeSqlString(title)}', '${escapeSqlString(expression)}', '${escapeSqlString(reading)}', NULL, NULL,
                '', '', '', 0, '${escapeSqlString(glossaryJson)}', 1
            );
        `;

        const sqlite3 = await sqlite3InitModule();
        const db = new sqlite3.oo1.DB(':memory:', 'ct');
        try {
            if (typeof db.pointer !== 'number') {
                throw new Error('sqlite database pointer is unavailable');
            }
            db.exec(sql);
            const raw = sqlite3.capi.sqlite3_js_db_export(db.pointer);
            const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
            if (bytes.byteLength === 0) {
                throw new Error('Generated dictionary database export was empty');
            }
            return Buffer.from(bytes).toString('base64');
        } finally {
            db.close();
        }
    })();
    dictionaryDatabaseBase64PromiseMap.set(cacheKey, promise);
    return await promise;
}

/**
 * @returns {Promise<string>}
 */
export async function getMinimalDictionaryDatabaseBase64() {
    return await createDictionaryDatabaseBase64({
        title: dedupeDictionaryTitle,
        revision: 'anki-dedupe',
        expression: dedupeSearchTerm,
        reading: 'よむ',
        glossary: ['dedupe fixture definition'],
    });
}
