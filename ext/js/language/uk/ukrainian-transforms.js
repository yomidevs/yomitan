/*
 * Copyright (C) 2026  Yomitan Authors
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

import {prefixInflection, suffixInflection, wholeWordInflection} from '../language-transforms.js';

/** @typedef {keyof typeof conditions} Condition */

/** Consonants which can close the final syllable of a stem undergoing the о/е → і alternation. */
const consonants = 'бвгґджзклмнпрстфхцчшщ';

const closedSyllableRegExp = new RegExp(`[${consonants}]$`);

/**
 * Ukrainian stems raise о and е to і when the final syllable becomes closed, so the alternation has
 * to be undone to recover the dictionary form: "стола" → "стіл", "ночі" → "ніч", "солі" → "сіль".
 * @param {string} inflectedSuffix
 * @param {string} deinflectedSuffix
 * @param {Condition[]} conditionsIn
 * @param {Condition[]} conditionsOut
 * @returns {import('language-transformer').Rule<Condition>}
 */
function alternatingSuffixInflection(inflectedSuffix, deinflectedSuffix, conditionsIn, conditionsOut) {
    const regExp = new RegExp(`[ое]([${consonants}]+)${inflectedSuffix}$`);
    return {
        type: 'other',
        isInflected: regExp,
        deinflect: (text) => text.replace(regExp, `і$1${deinflectedSuffix}`),
        conditionsIn,
        conditionsOut,
    };
}

/**
 * The genitive plural of the first and second declensions has no ending, so the nominative singular
 * cannot be recovered by trimming a suffix: "книг" → "книга", "мов" → "мова".
 * @param {string} deinflectedSuffix
 * @returns {import('language-transformer').Rule<Condition>}
 */
function zeroEndingInflection(deinflectedSuffix) {
    return {
        type: 'other',
        isInflected: closedSyllableRegExp,
        deinflect: (text) => text + deinflectedSuffix,
        conditionsIn: [],
        conditionsOut: ['n'],
    };
}

/**
 * Reflexive verbs carry the postfix -ся (or its variant -сь) after the personal ending, and keep it
 * in their dictionary form: "вчуся" → "вчитися". Every verb ending therefore comes in three shapes.
 * @param {string} inflectedSuffix
 * @param {string} deinflectedSuffix
 * @returns {import('language-transformer').Rule<Condition>[]}
 */
function verbInflection(inflectedSuffix, deinflectedSuffix) {
    const rules = [
        suffixInflection(inflectedSuffix, deinflectedSuffix, [], ['v']),
        suffixInflection(`${inflectedSuffix}ся`, `${deinflectedSuffix}ся`, [], ['v']),
        suffixInflection(`${inflectedSuffix}сь`, `${deinflectedSuffix}сь`.replace(/сь$/, 'ся'), [], ['v']),
    ];
    // A third-person singular ending in a vowel keeps its underlying -ть before the postfix:
    // "сміється", not "смієся".
    if (/[еє]$/.test(inflectedSuffix)) {
        rules.push(suffixInflection(`${inflectedSuffix}ться`, `${deinflectedSuffix}ся`, [], ['v']));
    }
    return rules;
}

/**
 * Applies {@link verbInflection} to a whole paradigm.
 * @param {[inflectedSuffix: string, deinflectedSuffix: string][]} endings
 * @returns {import('language-transformer').Rule<Condition>[]}
 */
function verbInflections(endings) {
    return endings.flatMap(([inflectedSuffix, deinflectedSuffix]) => verbInflection(inflectedSuffix, deinflectedSuffix));
}


/**
 * Pronouns, determiners and numerals are closed classes: the full paradigm of each one can simply be
 * listed. Enumerating them cannot over-generate the way a suffix rule can, and their stems alternate
 * too freely ("я" → "мене", "цей" → "цього", "два" → "двома") for suffix rules to reach anyway.
 * @param {string} lemma
 * @param {string} stem
 * @param {string[]} endings
 * @param {Condition} condition
 * @returns {import('language-transformer').Rule<Condition>[]}
 */
function closedClassParadigm(lemma, stem, endings, condition) {
    return endings.flatMap((ending) => (stem + ending === lemma ? [] : [wholeWordInflection(stem + ending, lemma, [], [condition])]));
}

/** Hard-stem determiners: той, який, такий, котрий, сам, наш, ваш. */
const hardDeterminerEndings = ['ого', 'ому', 'им', 'а', 'ої', 'ій', 'у', 'ою', 'е', 'і', 'их', 'ими', 'ім'];
/** Soft-stem determiners: цей. */
const softDeterminerEndings = ['ього', 'ьому', 'им', 'я', 'ієї', 'ій', 'ю', 'ією', 'е', 'і', 'их', 'ими', 'ім'];
/** Possessives on a vowel stem: мій, твій, свій. */
const possessiveEndings = ['го', 'єму', 'їм', 'я', 'єї', 'їй', 'ю', 'єю', 'є', 'ї', 'їх', 'їми'];
/** весь / увесь, whose plural and instrumental take і. */
const vesEndings = ['ього', 'ьому', 'ім', 'я', 'ієї', 'ій', 'ю', 'ією', 'е', 'і', 'іх', 'іма'];
/** їхній-type soft stems. */
const softNijEndings = ['ього', 'ьому', 'ім', 'я', 'ьої', 'ій', 'ю', 'ьою', 'є', 'і', 'іх', 'іми'];

const conditions = {
    n: {
        name: 'Noun',
        isDictionaryForm: true,
    },
    adj: {
        name: 'Adjective',
        isDictionaryForm: true,
    },
    adv: {
        name: 'Adverb',
        isDictionaryForm: true,
    },
    pron: {
        name: 'Pronoun',
        isDictionaryForm: true,
    },
    num: {
        name: 'Numeral',
        isDictionaryForm: true,
    },
    v: {
        name: 'Verb',
        isDictionaryForm: true,
    },
};

/** @type {import('language-transformer').LanguageTransformDescriptor<Condition>} */
export const ukrainianTransforms = {
    language: 'uk',
    conditions,
    transforms: {
        'nominative plural': {
            name: 'nominative plural',
            description: 'Nominative plural of a noun or adjective',
            rules: [
                // First declension
                suffixInflection('и', 'а', [], ['n']), // 'книги' -> 'книга'
                suffixInflection('і', 'я', [], ['n']), // 'землі' -> 'земля'
                suffixInflection('ї', 'я', [], ['n']), // 'мрії' -> 'мрія'
                // Second declension, masculine
                suffixInflection('и', '', [], ['n']), // 'студенти' -> 'студент'
                suffixInflection('ї', 'й', [], ['n']), // 'краї' -> 'край'
                suffixInflection('зі', 'г', [], ['n']), // 'друзі' -> 'друг'
                alternatingSuffixInflection('и', '', [], ['n']), // 'столи' -> 'стіл'
                alternatingSuffixInflection('і', 'ь', [], ['n']), // 'коні' -> 'кінь'
                suffixInflection('ки', 'ок', [], ['n']), // 'підвечірки' -> 'підвечірок'
                suffixInflection('ці', 'ець', [], ['n']), // 'українці' -> 'українець'
                suffixInflection('йці', 'єць', [], ['n']), // 'латвійці' -> 'латвієць'
                // Second declension, neuter
                suffixInflection('а', 'о', [], ['n']), // 'вікна' -> 'вікно'
                suffixInflection('я', 'е', [], ['n']), // 'поля' -> 'поле'
                // Third declension
                alternatingSuffixInflection('і', '', [], ['n']), // 'ночі' -> 'ніч'
                // Fourth declension
                suffixInflection('ята', 'я', [], ['n']), // 'телята' -> 'теля'
                suffixInflection('ата', 'а', [], ['n']), // 'дівчата' -> 'дівча'
                // Adjectives
                suffixInflection('і', 'ий', [], ['adj']), // 'гарні' -> 'гарний'
                suffixInflection('і', 'ій', [], ['adj']), // 'сині' -> 'синій'
            ],
        },
        'genitive': {
            name: 'genitive',
            description: 'Genitive case of a noun or adjective',
            rules: [
                // First declension
                suffixInflection('и', 'а', [], ['n']), // 'книги' -> 'книга'
                suffixInflection('і', 'я', [], ['n']), // 'землі' -> 'земля'
                suffixInflection('ї', 'я', [], ['n']), // 'мрії' -> 'мрія'
                suffixInflection('ок', 'ка', [], ['n']), // 'книжок' -> 'книжка'
                suffixInflection('ер', 'ра', [], ['n']), // 'сестер' -> 'сестра'
                suffixInflection('ель', 'ля', [], ['n']), // 'земель' -> 'земля'
                suffixInflection('ень', 'ня', [], ['n']), // 'пісень' -> 'пісня'
                zeroEndingInflection('а'), // 'книг' -> 'книга'
                suffixInflection('ань', 'ання', [], ['n']), // 'завдань' -> 'завдання'
                suffixInflection('ень', 'ення', [], ['n']), // 'рішень' -> 'рішення'
                suffixInflection('інь', 'іння', [], ['n']), // 'знарядінь' -> 'знаряддя'
                suffixInflection('ищ', 'ище', [], ['n']), // 'училищ' -> 'училище'
                suffixInflection('ць', 'це', [], ['n']), // 'місць' -> 'місце'
                suffixInflection('дець', 'це', [], ['n']), // 'сердець' -> 'серце'
                suffixInflection('ів', 'и', [], ['n']), // 'перегонів' -> 'перегони'
                suffixInflection('ей', 'і', [], ['n']), // 'дверей' -> 'двері'
                suffixInflection('иць', 'иця', [], ['n']), // 'автолюбительниць' -> 'автолюбительниця'
                // Second declension, masculine
                suffixInflection('а', '', [], ['n']), // 'студента' -> 'студент'
                suffixInflection('у', '', [], ['n']), // 'телефону' -> 'телефон'
                suffixInflection('ю', 'й', [], ['n']), // 'краю' -> 'край'
                suffixInflection('ів', '', [], ['n']), // 'студентів' -> 'студент'
                suffixInflection('їв', 'й', [], ['n']), // 'країв' -> 'край'
                alternatingSuffixInflection('а', '', [], ['n']), // 'стола' -> 'стіл'
                alternatingSuffixInflection('у', '', [], ['n']), // 'столу' -> 'стіл'
                alternatingSuffixInflection('я', 'ь', [], ['n']), // 'коня' -> 'кінь'
                alternatingSuffixInflection('ів', '', [], ['n']), // 'столів' -> 'стіл'
                suffixInflection('ка', 'ок', [], ['n']), // 'підвечірка' -> 'підвечірок'
                suffixInflection('ку', 'ок', [], ['n']), // 'підвечірку' -> 'підвечірок'
                suffixInflection('ків', 'ок', [], ['n']), // 'підвечірків' -> 'підвечірок'
                suffixInflection('ця', 'ець', [], ['n']), // 'українця' -> 'українець'
                suffixInflection('цю', 'ець', [], ['n']), // 'українцю' -> 'українець'
                suffixInflection('ців', 'ець', [], ['n']), // 'українців' -> 'українець'
                suffixInflection('йця', 'єць', [], ['n']), // 'латвійця' -> 'латвієць'
                suffixInflection('йців', 'єць', [], ['n']), // 'латвійців' -> 'латвієць'
                suffixInflection('ій', 'ія', [], ['n']), // 'сесій' -> 'сесія'
                alternatingSuffixInflection('и', 'ь', [], ['n']), // 'щільности' -> 'щільність'
                // Second declension, neuter
                suffixInflection('а', 'о', [], ['n']), // 'вікна' -> 'вікно'
                suffixInflection('я', 'е', [], ['n']), // 'поля' -> 'поле'
                suffixInflection('ів', 'е', [], ['n']), // 'полів' -> 'поле'
                suffixInflection('он', 'но', [], ['n']), // 'вікон' -> 'вікно'
                // Third declension
                suffixInflection('ей', 'ь', [], ['n']), // 'тіней' -> 'тінь'
                alternatingSuffixInflection('і', '', [], ['n']), // 'ночі' -> 'ніч'
                alternatingSuffixInflection('і', 'ь', [], ['n']), // 'солі' -> 'сіль'
                alternatingSuffixInflection('ей', '', [], ['n']), // 'ночей' -> 'ніч'
                // Fourth declension
                suffixInflection('яти', 'я', [], ['n']), // 'теляти' -> 'теля'
                suffixInflection('ят', 'я', [], ['n']), // 'телят' -> 'теля'
                suffixInflection('ати', 'а', [], ['n']), // 'дівчати' -> 'дівча'
                suffixInflection('ат', 'а', [], ['n']), // 'дівчат' -> 'дівча'
                // Adjectives
                suffixInflection('ого', 'ий', [], ['adj']), // 'гарного' -> 'гарний'
                suffixInflection('ої', 'ий', [], ['adj']), // 'гарної' -> 'гарний'
                suffixInflection('их', 'ий', [], ['adj']), // 'гарних' -> 'гарний'
                suffixInflection('ього', 'ій', [], ['adj']), // 'синього' -> 'синій'
                suffixInflection('ьої', 'ій', [], ['adj']), // 'синьої' -> 'синій'
                suffixInflection('іх', 'ій', [], ['adj']), // 'синіх' -> 'синій'
            ],
        },
        'dative': {
            name: 'dative',
            description: 'Dative case of a noun or adjective',
            rules: [
                // First declension
                suffixInflection('і', 'а', [], ['n']), // 'сестрі' -> 'сестра'
                suffixInflection('і', 'я', [], ['n']), // 'землі' -> 'земля'
                suffixInflection('ї', 'я', [], ['n']), // 'мрії' -> 'мрія'
                suffixInflection('зі', 'га', [], ['n']), // 'книзі' -> 'книга'
                suffixInflection('ці', 'ка', [], ['n']), // 'руці' -> 'рука'
                suffixInflection('сі', 'ха', [], ['n']), // 'сосі' -> 'соха'
                suffixInflection('ам', 'а', [], ['n']), // 'книгам' -> 'книга'
                suffixInflection('ям', 'я', [], ['n']), // 'землям' -> 'земля'
                // Second declension, masculine
                suffixInflection('ові', '', [], ['n']), // 'студентові' -> 'студент'
                suffixInflection('єві', 'й', [], ['n']), // 'краєві' -> 'край'
                suffixInflection('у', '', [], ['n']), // 'студенту' -> 'студент'
                suffixInflection('ю', 'й', [], ['n']), // 'краю' -> 'край'
                suffixInflection('ам', '', [], ['n']), // 'студентам' -> 'студент'
                alternatingSuffixInflection('ові', '', [], ['n']), // 'столові' -> 'стіл'
                alternatingSuffixInflection('еві', 'ь', [], ['n']), // 'коневі' -> 'кінь'
                alternatingSuffixInflection('ям', 'ь', [], ['n']), // 'коням' -> 'кінь'
                suffixInflection('кові', 'ок', [], ['n']), // 'підвечіркові' -> 'підвечірок'
                suffixInflection('ку', 'ок', [], ['n']), // 'підвечірку' -> 'підвечірок'
                suffixInflection('кам', 'ок', [], ['n']), // 'підвечіркам' -> 'підвечірок'
                suffixInflection('цеві', 'ець', [], ['n']), // 'українцеві' -> 'українець'
                suffixInflection('цям', 'ець', [], ['n']), // 'українцям' -> 'українець'
                // Second declension, neuter
                suffixInflection('у', 'о', [], ['n']), // 'вікну' -> 'вікно'
                suffixInflection('ю', 'е', [], ['n']), // 'полю' -> 'поле'
                suffixInflection('ам', 'о', [], ['n']), // 'вікнам' -> 'вікно'
                suffixInflection('ям', 'е', [], ['n']), // 'полям' -> 'поле'
                // Third declension
                alternatingSuffixInflection('і', '', [], ['n']), // 'ночі' -> 'ніч'
                alternatingSuffixInflection('і', 'ь', [], ['n']), // 'солі' -> 'сіль'
                // Fourth declension
                suffixInflection('яті', 'я', [], ['n']), // 'теляті' -> 'теля'
                suffixInflection('ятам', 'я', [], ['n']), // 'телятам' -> 'теля'
                // Adjectives
                suffixInflection('ому', 'ий', [], ['adj']), // 'гарному' -> 'гарний'
                suffixInflection('ій', 'ий', [], ['adj']), // 'гарній' -> 'гарний'
                suffixInflection('им', 'ий', [], ['adj']), // 'гарним' -> 'гарний'
                suffixInflection('ьому', 'ій', [], ['adj']), // 'синьому' -> 'синій'
                suffixInflection('ім', 'ій', [], ['adj']), // 'синім' -> 'синій'
            ],
        },
        'accusative': {
            name: 'accusative',
            description: 'Accusative case of a noun or adjective',
            rules: [
                // First declension
                suffixInflection('у', 'а', [], ['n']), // 'книгу' -> 'книга'
                suffixInflection('ю', 'я', [], ['n']), // 'землю' -> 'земля'
                // Second declension, animate masculine
                suffixInflection('а', '', [], ['n']), // 'студента' -> 'студент'
                suffixInflection('ів', '', [], ['n']), // 'студентів' -> 'студент'
                alternatingSuffixInflection('а', '', [], ['n']), // 'кота' -> 'кіт'
                // Adjectives
                suffixInflection('у', 'ий', [], ['adj']), // 'гарну' -> 'гарний'
                suffixInflection('ю', 'ій', [], ['adj']), // 'синю' -> 'синій'
            ],
        },
        'instrumental': {
            name: 'instrumental',
            description: 'Instrumental case of a noun or adjective',
            rules: [
                // First declension
                suffixInflection('ою', 'а', [], ['n']), // 'книгою' -> 'книга'
                suffixInflection('ею', 'я', [], ['n']), // 'землею' -> 'земля'
                suffixInflection('єю', 'я', [], ['n']), // 'мрією' -> 'мрія'
                suffixInflection('ами', 'а', [], ['n']), // 'книгами' -> 'книга'
                suffixInflection('ями', 'я', [], ['n']), // 'землями' -> 'земля'
                // Second declension, masculine
                suffixInflection('ом', '', [], ['n']), // 'студентом' -> 'студент'
                suffixInflection('ем', '', [], ['n']), // 'товаришем' -> 'товариш'
                suffixInflection('єм', 'й', [], ['n']), // 'краєм' -> 'край'
                suffixInflection('ами', '', [], ['n']), // 'студентами' -> 'студент'
                alternatingSuffixInflection('ом', '', [], ['n']), // 'столом' -> 'стіл'
                alternatingSuffixInflection('ем', 'ь', [], ['n']), // 'конем' -> 'кінь'
                alternatingSuffixInflection('ями', 'ь', [], ['n']), // 'конями' -> 'кінь'
                suffixInflection('ком', 'ок', [], ['n']), // 'підвечірком' -> 'підвечірок'
                suffixInflection('ками', 'ок', [], ['n']), // 'підвечірками' -> 'підвечірок'
                suffixInflection('цем', 'ець', [], ['n']), // 'українцем' -> 'українець'
                suffixInflection('цями', 'ець', [], ['n']), // 'українцями' -> 'українець'
                suffixInflection('йцем', 'єць', [], ['n']), // 'латвійцем' -> 'латвієць'
                suffixInflection('йцями', 'єць', [], ['n']), // 'латвійцями' -> 'латвієць'
                // Second declension, neuter
                suffixInflection('ом', 'о', [], ['n']), // 'вікном' -> 'вікно'
                suffixInflection('ем', 'е', [], ['n']), // 'полем' -> 'поле'
                suffixInflection('ами', 'о', [], ['n']), // 'вікнами' -> 'вікно'
                suffixInflection('ями', 'е', [], ['n']), // 'полями' -> 'поле'
                // Third declension, where the stem consonant is lengthened before the ending
                suffixInflection('ччю', 'ч', [], ['n']), // 'ніччю' -> 'ніч'
                suffixInflection('ллю', 'ль', [], ['n']), // 'сіллю' -> 'сіль'
                suffixInflection('ттю', 'ть', [], ['n']), // 'миттю' -> 'мить'
                suffixInflection('нню', 'нь', [], ['n']), // 'тінню' -> 'тінь'
                suffixInflection('жжю', 'ж', [], ['n']), // 'подорожжю' -> 'подорож'
                suffixInflection('шшю', 'ш', [], ['n']), // 'розкішшю' -> 'розкіш'
                suffixInflection('стю', 'сть', [], ['n']), // 'радістю' -> 'радість'
                suffixInflection('ссю', 'сь', [], ['n']), // 'віссю' -> 'вісь'
                // Fourth declension
                suffixInflection('ятами', 'я', [], ['n']), // 'телятами' -> 'теля'
                // Adjectives
                suffixInflection('им', 'ий', [], ['adj']), // 'гарним' -> 'гарний'
                suffixInflection('ими', 'ий', [], ['adj']), // 'гарними' -> 'гарний'
                suffixInflection('ою', 'ий', [], ['adj']), // 'гарною' -> 'гарний'
                suffixInflection('ім', 'ій', [], ['adj']), // 'синім' -> 'синій'
                suffixInflection('іми', 'ій', [], ['adj']), // 'синіми' -> 'синій'
                suffixInflection('ьою', 'ій', [], ['adj']), // 'синьою' -> 'синій'
            ],
        },
        'locative': {
            name: 'locative',
            description: 'Locative case of a noun or adjective',
            rules: [
                // First declension
                suffixInflection('і', 'а', [], ['n']), // 'сестрі' -> 'сестра'
                suffixInflection('і', 'я', [], ['n']), // 'землі' -> 'земля'
                suffixInflection('ї', 'я', [], ['n']), // 'мрії' -> 'мрія'
                suffixInflection('зі', 'га', [], ['n']), // 'книзі' -> 'книга'
                suffixInflection('ці', 'ка', [], ['n']), // 'руці' -> 'рука'
                suffixInflection('сі', 'ха', [], ['n']), // 'сосі' -> 'соха'
                suffixInflection('ах', 'а', [], ['n']), // 'книгах' -> 'книга'
                suffixInflection('ях', 'я', [], ['n']), // 'землях' -> 'земля'
                // Second declension, masculine
                suffixInflection('ові', '', [], ['n']), // 'студентові' -> 'студент'
                suffixInflection('у', '', [], ['n']), // 'телефону' -> 'телефон'
                suffixInflection('ю', 'й', [], ['n']), // 'краю' -> 'край'
                suffixInflection('ах', '', [], ['n']), // 'студентах' -> 'студент'
                suffixInflection('зі', 'г', [], ['n']), // 'друзі' -> 'друг'
                alternatingSuffixInflection('і', '', [], ['n']), // 'столі' -> 'стіл'
                alternatingSuffixInflection('ях', 'ь', [], ['n']), // 'конях' -> 'кінь'
                suffixInflection('і', '', [], ['n']), // "харків’янині" -> "харків’янин"
                suffixInflection('ку', 'ок', [], ['n']), // 'підвечірку' -> 'підвечірок'
                suffixInflection('ках', 'ок', [], ['n']), // 'підвечірках' -> 'підвечірок'
                suffixInflection('ці', 'ець', [], ['n']), // 'українці' -> 'українець'
                suffixInflection('цях', 'ець', [], ['n']), // 'українцях' -> 'українець'
                suffixInflection('йці', 'єць', [], ['n']), // 'латвійці' -> 'латвієць'
                // Second declension, neuter
                suffixInflection('і', 'о', [], ['n']), // 'вікні' -> 'вікно'
                suffixInflection('і', 'е', [], ['n']), // 'полі' -> 'поле'
                suffixInflection('ах', 'о', [], ['n']), // 'вікнах' -> 'вікно'
                suffixInflection('ях', 'е', [], ['n']), // 'полях' -> 'поле'
                // Third declension
                alternatingSuffixInflection('і', 'ь', [], ['n']), // 'солі' -> 'сіль'
                // Fourth declension
                suffixInflection('яті', 'я', [], ['n']), // 'теляті' -> 'теля'
                suffixInflection('ятах', 'я', [], ['n']), // 'телятах' -> 'теля'
                // Adjectives
                suffixInflection('ому', 'ий', [], ['adj']), // 'гарному' -> 'гарний'
                suffixInflection('ій', 'ий', [], ['adj']), // 'гарній' -> 'гарний'
                suffixInflection('их', 'ий', [], ['adj']), // 'гарних' -> 'гарний'
                suffixInflection('ьому', 'ій', [], ['adj']), // 'синьому' -> 'синій'
                suffixInflection('іх', 'ій', [], ['adj']), // 'синіх' -> 'синій'
                suffixInflection('ім', 'ий', [], ['adj']), // 'гарнім' -> 'гарний'
                suffixInflection('ім', 'ій', [], ['adj']), // 'синім' -> 'синій'
            ],
        },
        'vocative': {
            name: 'vocative',
            description: 'Vocative case of a noun',
            rules: [
                // First declension
                suffixInflection('о', 'а', [], ['n']), // 'книго' -> 'книга'
                suffixInflection('е', 'я', [], ['n']), // 'земле' -> 'земля'
                suffixInflection('є', 'я', [], ['n']), // 'мріє' -> 'мрія'
                // Second declension, masculine
                suffixInflection('е', '', [], ['n']), // 'студенте' -> 'студент'
                suffixInflection('у', 'о', [], ['n']), // 'батьку' -> 'батько'
                suffixInflection('ю', 'й', [], ['n']), // 'краю' -> 'край'
                suffixInflection('ю', 'ь', [], ['n']), // 'учителю' -> 'учитель'
                alternatingSuffixInflection('е', '', [], ['n']), // 'столе' -> 'стіл'
                alternatingSuffixInflection('е', 'ь', [], ['n']), // 'радосте' -> 'радість'
            ],
        },
        'feminine': {
            name: 'feminine',
            description: 'Feminine form of an adjective',
            rules: [
                suffixInflection('а', 'ий', [], ['adj']), // 'гарна' -> 'гарний'
                suffixInflection('я', 'ій', [], ['adj']), // 'синя' -> 'синій'
            ],
        },
        'neuter': {
            name: 'neuter',
            description: 'Neuter form of an adjective',
            rules: [
                suffixInflection('е', 'ий', [], ['adj']), // 'гарне' -> 'гарний'
                suffixInflection('є', 'ій', [], ['adj']), // 'синє' -> 'синій'
            ],
        },
        'comparative': {
            name: 'comparative',
            description: 'Comparative degree of an adjective or adverb',
            rules: [
                suffixInflection('іший', 'ий', ['adj'], ['adj']), // 'гарніший' -> 'гарний'
                suffixInflection('ший', 'кий', ['adj'], ['adj']), // 'солодший' -> 'солодкий'
                suffixInflection('жчий', 'зький', ['adj'], ['adj']), // 'ближчий' -> 'близький'
                suffixInflection('щий', 'сокий', ['adj'], ['adj']), // 'вищий' -> 'високий'
                suffixInflection('рший', 'рий', ['adj'], ['adj']), // 'старший' -> 'старий'
                suffixInflection('дший', 'дий', ['adj'], ['adj']), // 'молодший' -> 'молодий'
                suffixInflection('ший', 'гий', ['adj'], ['adj']), // 'довший' -> 'довгий'
                suffixInflection('вший', 'вий', ['adj'], ['adj']), // 'дешевший' -> 'дешевий'
                suffixInflection('жчий', 'жкий', ['adj'], ['adj']), // 'тяжчий' -> 'тяжкий'
                suffixInflection('жчий', 'гий', ['adj'], ['adj']), // 'дорожчий' -> 'дорогий'
                suffixInflection('бший', 'бокий', ['adj'], ['adj']), // 'глибший' -> 'глибокий'
                suffixInflection('вщий', 'встий', ['adj'], ['adj']), // 'товщий' -> 'товстий'
                suffixInflection('ирший', 'ирокий', ['adj'], ['adj']), // 'ширший' -> 'широкий'
                // Suppletive degrees share no stem with their base word, so they are listed
                wholeWordInflection('більший', 'великий', ['adj'], ['adj']),
                wholeWordInflection('менший', 'малий', ['adj'], ['adj']),
                wholeWordInflection('кращий', 'добрий', ['adj'], ['adj']),
                wholeWordInflection('кращий', 'хороший', ['adj'], ['adj']),
                wholeWordInflection('ліпший', 'добрий', ['adj'], ['adj']),
                wholeWordInflection('гірший', 'поганий', ['adj'], ['adj']),
                suffixInflection('іше', 'о', ['adv'], ['adv']), // 'гарніше' -> 'гарно'
                suffixInflection('ше', 'ко', ['adv'], ['adv']), // 'швидше' -> 'швидко'
                suffixInflection('ше', 'го', ['adv'], ['adv']), // 'довше' -> 'довго'
                suffixInflection('ще', 'соко', ['adv'], ['adv']), // 'вище' -> 'високо'
                suffixInflection('жче', 'зько', ['adv'], ['adv']), // 'ближче' -> 'близько'
                suffixInflection('жче', 'жко', ['adv'], ['adv']), // 'тяжче' -> 'тяжко'
                suffixInflection('жче', 'го', ['adv'], ['adv']), // 'дорожче' -> 'дорого'
                wholeWordInflection('більше', 'багато', ['adv'], ['adv']),
                wholeWordInflection('менше', 'мало', ['adv'], ['adv']),
                wholeWordInflection('краще', 'добре', ['adv'], ['adv']),
                wholeWordInflection('ліпше', 'добре', ['adv'], ['adv']),
                wholeWordInflection('гірше', 'погано', ['adv'], ['adv']),
            ],
        },
        'superlative': {
            name: 'superlative',
            description: 'Superlative degree of an adjective or adverb',
            rules: [
                prefixInflection('най', '', ['adj'], ['adj']), // 'найкращий' -> 'кращий'
                prefixInflection('най', '', ['adv'], ['adv']), // 'найшвидше' -> 'швидше'
            ],
        },
        'present': {
            name: 'present',
            description: 'Present tense of an imperfective verb, or future tense of a perfective one',
            rules: [
                wholeWordInflection('є', 'бути', [], ['v']), // the only present-tense form of 'бути'
                ...verbInflections([
                // First conjugation, -ати stems: 'читаю' -> 'читати'
                    ['аю', 'ати'],
                    ['аєш', 'ати'],
                    ['ає', 'ати'],
                    ['аємо', 'ати'],
                    ['аєте', 'ати'],
                    ['ають', 'ати'],
                    // First conjugation, -яти stems: 'сіяю' -> 'сіяти'
                    ['яю', 'яти'],
                    ['яєш', 'яти'],
                    ['яє', 'яти'],
                    ['яємо', 'яти'],
                    ['яєте', 'яти'],
                    ['яють', 'яти'],
                    // First conjugation, -яти stems which drop the я before the ending: 'сміюся' -> 'сміятися'
                    ['ю', 'яти'],
                    ['єш', 'яти'],
                    ['є', 'яти'],
                    ['ємо', 'яти'],
                    ['єте', 'яти'],
                    ['ють', 'яти'],
                    // First conjugation, -яти stems whose endings keep a ї: 'стоїш' -> 'стояти'
                    ['їш', 'яти'],
                    ['їть', 'яти'],
                    ['їмо', 'яти'],
                    ['їте', 'яти'],
                    ['ять', 'яти'],
                    // First conjugation, -увати stems: 'друкую' -> 'друкувати'
                    ['ую', 'увати'],
                    ['уєш', 'увати'],
                    ['ує', 'увати'],
                    ['уємо', 'увати'],
                    ['уєте', 'увати'],
                    ['ують', 'увати'],
                    // First conjugation, -ювати stems: 'працюю' -> 'працювати'
                    ['юю', 'ювати'],
                    ['юєш', 'ювати'],
                    ['ює', 'ювати'],
                    ['юємо', 'ювати'],
                    ['юєте', 'ювати'],
                    ['юють', 'ювати'],
                    // First conjugation, -іти stems: 'розумію' -> 'розуміти'
                    ['ію', 'іти'],
                    ['ієш', 'іти'],
                    ['іє', 'іти'],
                    ['іємо', 'іти'],
                    ['ієте', 'іти'],
                    ['іють', 'іти'],
                    // First conjugation, -нути stems: 'гну' -> 'гнути'
                    ['ну', 'нути'],
                    ['неш', 'нути'],
                    ['не', 'нути'],
                    ['немо', 'нути'],
                    ['нете', 'нути'],
                    ['нуть', 'нути'],
                    // First conjugation, consonant stems: 'несу' -> 'нести'
                    ['у', 'ти'],
                    ['еш', 'ти'],
                    ['е', 'ти'],
                    ['емо', 'ти'],
                    ['ете', 'ти'],
                    ['уть', 'ти'],
                    // First conjugation, consonant stems with an с to ш mutation: 'пишу' -> 'писати'
                    ['шу', 'сати'],
                    ['шеш', 'сати'],
                    ['ше', 'сати'],
                    ['шемо', 'сати'],
                    ['шете', 'сати'],
                    ['шуть', 'сати'],
                    // First conjugation, consonant stems with a г to ж mutation: 'можу' -> 'могти'
                    ['жу', 'гти'],
                    ['жеш', 'гти'],
                    ['же', 'гти'],
                    ['жемо', 'гти'],
                    ['жете', 'гти'],
                    ['жуть', 'гти'],
                    // First conjugation, consonant stems with a к to ч mutation: 'печу' -> 'пекти'
                    ['чу', 'кти'],
                    ['чеш', 'кти'],
                    ['че', 'кти'],
                    ['чемо', 'кти'],
                    ['чете', 'кти'],
                    ['чуть', 'кти'],
                    // Second conjugation, -ити stems: 'говорю' -> 'говорити', 'вчу' -> 'вчити'
                    ['ю', 'ити'],
                    ['у', 'ити'],
                    ['иш', 'ити'],
                    ['ить', 'ити'],
                    ['имо', 'ити'],
                    ['ите', 'ити'],
                    ['ять', 'ити'],
                    // Second conjugation, -іти stems: 'летиш' -> 'летіти'
                    ['иш', 'іти'],
                    ['ить', 'іти'],
                    ['имо', 'іти'],
                    ['ите', 'іти'],
                    ['ять', 'іти'],
                    // Second conjugation, -ати stems after a hushing consonant: 'кричу' -> 'кричати'
                    ['у', 'ати'],
                    ['иш', 'ати'],
                    ['ить', 'ати'],
                    ['имо', 'ати'],
                    ['ите', 'ати'],
                    ['ать', 'ати'],
                    // Second conjugation, first-person singular consonant mutations
                    ['джу', 'дити'], // 'ходжу' -> 'ходити'
                    ['шу', 'сити'], // 'ношу' -> 'носити'
                    ['чу', 'тити'], // 'плачу' -> 'платити'
                    ['чу', 'тіти'], // 'лечу' -> 'летіти'
                    ['щу', 'стити'], // 'прощу' -> 'простити'
                    ['блю', 'бити'], // 'роблю' -> 'робити'
                    ['влю', 'вити'], // 'ловлю' -> 'ловити'
                    ['млю', 'мити'], // 'ломлю' -> 'ломити'
                    ['плю', 'пити'], // 'куплю' -> 'купити'
                    ['флю', 'фити'], // 'графлю' -> 'графити'
                    // Irregular and suppletive stems of high-frequency verbs. These are written as suffixes
                    // rather than whole words so that prefixed derivatives come along: 'скажу' -> 'сказати',
                    // 'прийду' -> 'прийти', 'заберу' -> 'забрати'.
                    ['йду', 'йти'], // 'йду' -> 'йти'
                    ['йдеш', 'йти'],
                    ['йде', 'йти'],
                    ['йдемо', 'йти'],
                    ['йдете', 'йти'],
                    ['йдуть', 'йти'],
                    ['їм', 'їсти'], // 'їм' -> 'їсти'
                    ['їси', 'їсти'],
                    ['їсть', 'їсти'],
                    ['їмо', 'їсти'],
                    ['їсте', 'їсти'],
                    ['їдять', 'їсти'],
                    ['дам', 'дати'], // 'дам' -> 'дати'
                    ['даси', 'дати'],
                    ['дасть', 'дати'],
                    ['дамо', 'дати'],
                    ['дасте', 'дати'],
                    ['дадуть', 'дати'],
                    ['ізьму', 'зяти'], // 'візьму' -> 'взяти'
                    ['ізьмеш', 'зяти'],
                    ['ізьме', 'зяти'],
                    ['ізьмемо', 'зяти'],
                    ['ізьмете', 'зяти'],
                    ['ізьмуть', 'зяти'],
                    ['жу', 'зати'], // 'кажу' -> 'казати'
                    ['жеш', 'зати'],
                    ['же', 'зати'],
                    ['жемо', 'зати'],
                    ['жете', 'зати'],
                    ['жуть', 'зати'],
                    ['беру', 'брати'], // 'беру' -> 'брати'
                    ['береш', 'брати'],
                    ['бере', 'брати'],
                    ['беремо', 'брати'],
                    ['берете', 'брати'],
                    ['беруть', 'брати'],
                    ['жиш', 'гти'], // 'біжиш' -> 'бігти'
                    ['жить', 'гти'],
                    ['жимо', 'гти'],
                    ['жите', 'гти'],
                    ['жать', 'гти'],
                    ['ву', 'ти'], // 'живу' -> 'жити'
                    ['веш', 'ти'],
                    ['ве', 'ти'],
                    ['вемо', 'ти'],
                    ['вете', 'ти'],
                    ['вуть', 'ти'],
                    ['плю', 'пати'], // 'сплю' -> 'спати'
                    ['плять', 'пати'],
                    ["'ю", 'ити'], // "п'ю" -> 'пити'
                    ["'єш", 'ити'],
                    ["'є", 'ити'],
                    ["'ємо", 'ити'],
                    ["'єте", 'ити'],
                    ["'ють", 'ити'],
                    ['чеш', 'тіти'], // 'хочеш' -> 'хотіти'
                    ['че', 'тіти'],
                    ['чемо', 'тіти'],
                    ['чете', 'тіти'],
                    ['чуть', 'тіти'],
                ]),
            ],
        },
        'future': {
            name: 'future',
            description: 'Synthetic future tense of an imperfective verb',
            rules: verbInflections([
                // 'читатиму' -> 'читати'
                ['тиму', 'ти'],
                ['тимеш', 'ти'],
                ['тиме', 'ти'],
                ['тимемо', 'ти'],
                ['тимете', 'ти'],
                ['тимуть', 'ти'],
                ['уду', 'ути'], // 'буду' -> 'бути', 'побуду' -> 'побути'
                ['удеш', 'ути'],
                ['уде', 'ути'],
                ['удемо', 'ути'],
                ['удете', 'ути'],
                ['удуть', 'ути'],
            ]),
        },
        'reflexive infinitive': {
            name: 'reflexive infinitive',
            description: 'The -тись variant of a reflexive infinitive, beside the standard -тися',
            rules: [
                suffixInflection('тись', 'тися', [], ['v']), // 'вчитись' -> 'вчитися'
            ],
        },
        'past': {
            name: 'past',
            description: 'Past tense of a verb',
            rules: verbInflections([
                // Vowel stems: 'читав' -> 'читати'
                ['в', 'ти'],
                ['ла', 'ти'],
                ['ло', 'ти'],
                ['ли', 'ти'],
                // Consonant stems in -сти: 'несла' -> 'нести', 'ніс' -> 'нести'
                ['сла', 'сти'],
                ['сло', 'сти'],
                ['сли', 'сти'],
                ['іс', 'ести'],
                // Consonant stems in -ести: 'вела' -> 'вести'
                ['ела', 'ести'],
                ['ело', 'ести'],
                ['ели', 'ести'],
                // Consonant stems in -зти: 'везла' -> 'везти', 'віз' -> 'везти'
                ['зла', 'зти'],
                ['зло', 'зти'],
                ['зли', 'зти'],
                ['із', 'езти'],
                // Consonant stems in -гти: 'могла' -> 'могти', 'міг' -> 'могти'
                ['гла', 'гти'],
                ['гло', 'гти'],
                ['гли', 'гти'],
                ['іг', 'огти'],
                // Consonant stems in -кти: 'пекла' -> 'пекти', 'пік' -> 'пекти'
                ['кла', 'кти'],
                ['кло', 'кти'],
                ['кли', 'кти'],
                ['ік', 'екти'],
                // Irregular past stems
                ['йшов', 'йти'], // 'прийшов' -> 'прийти'
                ['йшла', 'йти'],
                ['йшло', 'йти'],
                ['йшли', 'йти'],
                ['ішов', 'іти'],
                ['ішла', 'іти'],
                ['ішли', 'іти'],
                ['їв', 'їсти'], // "з'їв" -> "з'їсти"
                ['їла', 'їсти'],
                ['їло', 'їсти'],
                ['їли', 'їсти'],
                ['іг', 'ігти'], // 'прибіг' -> 'прибігти'
            ]),
        },
        'imperative': {
            name: 'imperative',
            description: 'Imperative mood of a verb',
            rules: verbInflections([
                // -увати and -ювати stems: 'маринуймо' -> 'маринувати'
                ['уй', 'увати'],
                ['уймо', 'увати'],
                ['уйте', 'увати'],
                ['юй', 'ювати'],
                ['юймо', 'ювати'],
                ['юйте', 'ювати'],
                // Stems with a j before the ending: 'читай' -> 'читати'
                ['й', 'ти'],
                ['ймо', 'ти'],
                ['йте', 'ти'],
                // -ити stems: 'говори' -> 'говорити'
                ['и', 'ити'],
                ['імо', 'ити'],
                ['іть', 'ити'],
                // Consonant stems: 'неси' -> 'нести'
                ['и', 'ти'],
                ['імо', 'ти'],
                ['іть', 'ти'],
                // -ати stems after a hushing consonant: 'кричи' -> 'кричати'
                ['и', 'ати'],
                ['імо', 'ати'],
                ['іть', 'ати'],
                // Irregular imperatives
                ['йди', 'йти'], // 'йди' -> 'йти'
                ['йдіть', 'йти'],
                ['йдімо', 'йти'],
                ['їж', 'їсти'], // 'їж' -> 'їсти'
                ['їжте', 'їсти'],
                ['їжмо', 'їсти'],
                ['бери', 'брати'], // 'бери' -> 'брати'
                ['беріть', 'брати'],
                ['берімо', 'брати'],
                ['ізьми', 'зяти'], // 'візьми' -> 'взяти'
                ['ізьміть', 'зяти'],
                ['удь', 'ути'], // 'будь' -> 'бути'
                ['удьте', 'ути'],
                ['удьмо', 'ути'],
                ['жи', 'зати'], // 'кажи' -> 'казати'
                ['жіть', 'зати'],
                ['жи', 'гти'], // 'біжи' -> 'бігти'
                ['жіть', 'гти'],
                ['ни', 'нути'], // 'крикни' -> 'крикнути'
                ['нім', 'нути'], // truncated: 'бабахнім' beside 'бабахнімо'
                ['ім', 'ити'], // truncated: 'ввалім' beside 'ввалімо'
                ['ім', 'ати'],
                ['ім', 'ти'],
                ['німо', 'нути'],
                ['ніть', 'нути'],
                ['ви', 'ти'], // 'живи' -> 'жити'
                ['віть', 'ти'],
            ]),
        },
        'passive participle': {
            name: 'passive participle',
            description: 'Passive participle of a verb',
            rules: [
                suffixInflection('ний', 'ти', ['adj'], ['v']), // 'читаний' -> 'читати'
                suffixInflection('тий', 'ти', ['adj'], ['v']), // 'митий' -> 'мити'
                suffixInflection('ений', 'ти', ['adj'], ['v']), // 'несений' -> 'нести'
                suffixInflection('ений', 'ити', ['adj'], ['v']), // 'говорений' -> 'говорити'
                suffixInflection('лений', 'ити', ['adj'], ['v']), // 'зроблений' -> 'зробити'
                suffixInflection('джений', 'дити', ['adj'], ['v']), // 'народжений' -> 'народити'
                suffixInflection('шений', 'сити', ['adj'], ['v']), // 'запрошений' -> 'запросити'
                suffixInflection('чений', 'тити', ['adj'], ['v']), // 'сплачений' -> 'сплатити'
                suffixInflection('щений', 'стити', ['adj'], ['v']), // 'прощений' -> 'простити'
                suffixInflection('ований', 'увати', ['adj'], ['v']), // 'маринований' -> 'маринувати'
                suffixInflection('ьований', 'ювати', ['adj'], ['v']), // 'мальований' -> 'малювати'
            ],
        },
        'active participle': {
            name: 'active participle',
            description: 'Active participle of a verb',
            rules: [
                suffixInflection('ючий', 'ти', ['adj'], ['v']), // 'читаючий' -> 'читати'
                suffixInflection('ачий', 'ати', ['adj'], ['v']), // 'кричачий' -> 'кричати'
                suffixInflection('ячий', 'ити', ['adj'], ['v']), // 'говорячий' -> 'говорити'
                suffixInflection('лий', 'ти', ['adj'], ['v']), // 'побілілий' -> 'побіліти'
            ],
        },
        'adverbial participle': {
            name: 'adverbial participle',
            description: 'Adverbial participle of a verb',
            rules: verbInflections([
                ['ючи', 'ти'], // 'читаючи' -> 'читати'
                ['ючи', 'яти'], // 'сміючись' -> 'сміятися'
                ['ачи', 'ати'], // 'кричачи' -> 'кричати'
                ['ячи', 'ити'], // 'говорячи' -> 'говорити'
                ['вши', 'ти'], // 'прочитавши' -> 'прочитати'
                ['уючи', 'увати'], // 'фінансуючи' -> 'фінансувати'
                ['юючи', 'ювати'],
                // Gerunds of the irregular verbs
                ['ївши', 'їсти'], // "з'ївши" -> "з'їсти"
                ['їдячи', 'їсти'],
                ['ідучи', 'іти'], // 'ідучи' -> 'іти'
                ['йдучи', 'йти'],
                ['удучи', 'ути'], // 'будучи' -> 'бути'
                ['еручи', 'рати'], // 'беручи' -> 'брати'
                ['жучи', 'зати'], // 'кажучи' -> 'казати'
                ['вучи', 'ти'], // 'живучи' -> 'жити'
                ['жачи', 'гти'], // 'біжачи' -> 'бігти'
                ['тячи', 'тіти'], // 'хотячи' -> 'хотіти'
                ["'ючи", 'ити'], // "п'ючи" -> 'пити'
            ]),
        },
        'colloquial present': {
            name: 'colloquial present',
            description: 'Colloquial short first-person plural of the present tense, beside the standard -мо',
            rules: verbInflections([
                ['аєм', 'ати'], // 'читаєм' -> 'читати'
                ['яєм', 'яти'],
                ['уєм', 'увати'],
                ['юєм', 'ювати'],
                ['ієм', 'іти'],
                ['нем', 'нути'], // 'крикнем' -> 'крикнути'
            ]),
        },
        'colloquial future': {
            name: 'colloquial future',
            description: 'Colloquial short first-person plural of the synthetic future, beside the standard -мо',
            rules: verbInflections([
                ['тимем', 'ти'], // 'читатимем' -> 'читати'
            ]),
        },
        'pronoun declension': {
            name: 'pronoun declension',
            description: 'Declined form of a pronoun or determiner',
            rules: [
                // Personal, interrogative and negative pronouns are suppletive
                wholeWordInflection('мене', 'я', [], ['pron']),
                wholeWordInflection('мені', 'я', [], ['pron']),
                wholeWordInflection('мною', 'я', [], ['pron']),
                wholeWordInflection('тебе', 'ти', [], ['pron']),
                wholeWordInflection('тобі', 'ти', [], ['pron']),
                wholeWordInflection('тобою', 'ти', [], ['pron']),
                wholeWordInflection('його', 'він', [], ['pron']),
                wholeWordInflection('нього', 'він', [], ['pron']),
                wholeWordInflection('йому', 'він', [], ['pron']),
                wholeWordInflection('ньому', 'він', [], ['pron']),
                wholeWordInflection('ним', 'він', [], ['pron']),
                wholeWordInflection('нім', 'він', [], ['pron']),
                wholeWordInflection('його', 'воно', [], ['pron']),
                wholeWordInflection('нього', 'воно', [], ['pron']),
                wholeWordInflection('йому', 'воно', [], ['pron']),
                wholeWordInflection('ньому', 'воно', [], ['pron']),
                wholeWordInflection('ним', 'воно', [], ['pron']),
                wholeWordInflection('нім', 'воно', [], ['pron']),
                wholeWordInflection('її', 'вона', [], ['pron']),
                wholeWordInflection('неї', 'вона', [], ['pron']),
                wholeWordInflection('їй', 'вона', [], ['pron']),
                wholeWordInflection('ній', 'вона', [], ['pron']),
                wholeWordInflection('нею', 'вона', [], ['pron']),
                wholeWordInflection('нас', 'ми', [], ['pron']),
                wholeWordInflection('нам', 'ми', [], ['pron']),
                wholeWordInflection('нами', 'ми', [], ['pron']),
                wholeWordInflection('вас', 'ви', [], ['pron']),
                wholeWordInflection('вам', 'ви', [], ['pron']),
                wholeWordInflection('вами', 'ви', [], ['pron']),
                wholeWordInflection('їх', 'вони', [], ['pron']),
                wholeWordInflection('них', 'вони', [], ['pron']),
                wholeWordInflection('їм', 'вони', [], ['pron']),
                wholeWordInflection('ним', 'вони', [], ['pron']),
                wholeWordInflection('ними', 'вони', [], ['pron']),
                wholeWordInflection('німи', 'вони', [], ['pron']),
                wholeWordInflection('собі', 'себе', [], ['pron']),
                wholeWordInflection('собою', 'себе', [], ['pron']),
                wholeWordInflection('кого', 'хто', [], ['pron']),
                wholeWordInflection('кому', 'хто', [], ['pron']),
                wholeWordInflection('ким', 'хто', [], ['pron']),
                wholeWordInflection('кім', 'хто', [], ['pron']),
                wholeWordInflection('чого', 'що', [], ['pron']),
                wholeWordInflection('чому', 'що', [], ['pron']),
                wholeWordInflection('чим', 'що', [], ['pron']),
                wholeWordInflection('чім', 'що', [], ['pron']),
                wholeWordInflection('нікого', 'ніхто', [], ['pron']),
                wholeWordInflection('нікому', 'ніхто', [], ['pron']),
                wholeWordInflection('ніким', 'ніхто', [], ['pron']),
                wholeWordInflection('нічого', 'ніщо', [], ['pron']),
                wholeWordInflection('нічому', 'ніщо', [], ['pron']),
                wholeWordInflection('нічим', 'ніщо', [], ['pron']),
                // Indefinite series built on хто / що
                wholeWordInflection('когось', 'хтось', [], ['pron']),
                wholeWordInflection('комусь', 'хтось', [], ['pron']),
                wholeWordInflection('кимось', 'хтось', [], ['pron']),
                wholeWordInflection('чогось', 'щось', [], ['pron']),
                wholeWordInflection('чомусь', 'щось', [], ['pron']),
                wholeWordInflection('чимось', 'щось', [], ['pron']),
                wholeWordInflection('декого', 'дехто', [], ['pron']),
                wholeWordInflection('декому', 'дехто', [], ['pron']),
                wholeWordInflection('деким', 'дехто', [], ['pron']),
                wholeWordInflection('дечого', 'дещо', [], ['pron']),
                wholeWordInflection('дечому', 'дещо', [], ['pron']),
                wholeWordInflection('дечим', 'дещо', [], ['pron']),
                wholeWordInflection('абикого', 'абихто', [], ['pron']),
                wholeWordInflection('абикому', 'абихто', [], ['pron']),
                wholeWordInflection('абиким', 'абихто', [], ['pron']),
                wholeWordInflection('абичого', 'абищо', [], ['pron']),
                wholeWordInflection('абичому', 'абищо', [], ['pron']),
                wholeWordInflection('абичим', 'абищо', [], ['pron']),
                ...closedClassParadigm('чийсь', 'чи', ['йогось', 'ємусь', 'їмсь', 'ясь', 'єїсь', 'їйсь', 'юсь', 'єюсь', 'єсь', 'їсь', 'їхсь', 'їмись'], 'pron'),
                ...closedClassParadigm('нічий', 'нічи', ['його', 'єму', 'їм', 'я', 'єї', 'їй', 'ю', 'єю', 'є', 'ї', 'їх', 'їми'], 'pron'),
                ...closedClassParadigm('ніякий', 'нияк', hardDeterminerEndings, 'pron'),
                ...closedClassParadigm('ніякий', 'ніяк', hardDeterminerEndings, 'pron'),
                // Determiners and possessives decline adjective-like but to an irregular lemma shape
                ...closedClassParadigm('той', 'т', hardDeterminerEndings, 'pron'),
                ...closedClassParadigm('який', 'як', hardDeterminerEndings, 'pron'),
                ...closedClassParadigm('такий', 'так', hardDeterminerEndings, 'pron'),
                ...closedClassParadigm('котрий', 'котр', hardDeterminerEndings, 'pron'),
                ...closedClassParadigm('сам', 'сам', hardDeterminerEndings, 'pron'),
                ...closedClassParadigm('наш', 'наш', hardDeterminerEndings, 'pron'),
                ...closedClassParadigm('ваш', 'ваш', hardDeterminerEndings, 'pron'),
                ...closedClassParadigm('інший', 'інш', hardDeterminerEndings, 'pron'),
                ...closedClassParadigm('кожний', 'кожн', hardDeterminerEndings, 'pron'),
                ...closedClassParadigm('жодний', 'жодн', hardDeterminerEndings, 'pron'),
                ...closedClassParadigm('цей', 'ц', softDeterminerEndings, 'pron'),
                ...closedClassParadigm('мій', 'мо', possessiveEndings, 'pron'),
                ...closedClassParadigm('твій', 'тво', possessiveEndings, 'pron'),
                ...closedClassParadigm('свій', 'сво', possessiveEndings, 'pron'),
                ...closedClassParadigm('чий', 'чи', ['його', 'єму', 'їм', 'я', 'єї', 'їй', 'ю', 'єю', 'є', 'ї', 'їх', 'їми'], 'pron'),
                ...closedClassParadigm('весь', 'вс', vesEndings, 'pron'),
                ...closedClassParadigm('весь', 'ус', vesEndings, 'pron'),
                ...closedClassParadigm('їхній', 'їхн', softNijEndings, 'pron'),
            ],
        },
        'numeral declension': {
            name: 'numeral declension',
            description: 'Declined form of a numeral',
            rules: [
                ...closedClassParadigm('один', 'одн', [...hardDeterminerEndings, 'ієї', 'ією'], 'num'),
                wholeWordInflection('двох', 'два', [], ['num']),
                wholeWordInflection('двом', 'два', [], ['num']),
                wholeWordInflection('двома', 'два', [], ['num']),
                wholeWordInflection('трьох', 'три', [], ['num']),
                wholeWordInflection('трьом', 'три', [], ['num']),
                wholeWordInflection('трьома', 'три', [], ['num']),
                wholeWordInflection('чотирьох', 'чотири', [], ['num']),
                wholeWordInflection('чотирьом', 'чотири', [], ['num']),
                wholeWordInflection('чотирма', 'чотири', [], ['num']),
                wholeWordInflection("п'яти", "п'ять", [], ['num']),
                wholeWordInflection("п'ятьох", "п'ять", [], ['num']),
                wholeWordInflection("п'ятьом", "п'ять", [], ['num']),
                wholeWordInflection("п'ятьма", "п'ять", [], ['num']),
                wholeWordInflection("п'ятьома", "п'ять", [], ['num']),
                wholeWordInflection('шести', 'шість', [], ['num']),
                wholeWordInflection('шістьох', 'шість', [], ['num']),
                wholeWordInflection('шістьом', 'шість', [], ['num']),
                wholeWordInflection('шістьма', 'шість', [], ['num']),
                wholeWordInflection('шістьома', 'шість', [], ['num']),
                wholeWordInflection('семи', 'сім', [], ['num']),
                wholeWordInflection('сімох', 'сім', [], ['num']),
                wholeWordInflection('сімом', 'сім', [], ['num']),
                wholeWordInflection('сьома', 'сім', [], ['num']),
                wholeWordInflection('сімома', 'сім', [], ['num']),
                wholeWordInflection('восьми', 'вісім', [], ['num']),
                wholeWordInflection('вісьмох', 'вісім', [], ['num']),
                wholeWordInflection('вісьмом', 'вісім', [], ['num']),
                wholeWordInflection('вісьма', 'вісім', [], ['num']),
                wholeWordInflection('вісьмома', 'вісім', [], ['num']),
                wholeWordInflection("дев'яти", "дев'ять", [], ['num']),
                wholeWordInflection("дев'ятьох", "дев'ять", [], ['num']),
                wholeWordInflection("дев'ятьом", "дев'ять", [], ['num']),
                wholeWordInflection("дев'ятьма", "дев'ять", [], ['num']),
                wholeWordInflection('десяти', 'десять', [], ['num']),
                wholeWordInflection('десятьох', 'десять', [], ['num']),
                wholeWordInflection('десятьом', 'десять', [], ['num']),
                wholeWordInflection('десятьма', 'десять', [], ['num']),
                wholeWordInflection('сорока', 'сорок', [], ['num']),
                wholeWordInflection('ста', 'сто', [], ['num']),
                wholeWordInflection('обох', 'обидва', [], ['num']),
                wholeWordInflection('обом', 'обидва', [], ['num']),
                wholeWordInflection('обома', 'обидва', [], ['num']),
                wholeWordInflection('багатьох', 'багато', [], ['num']),
                wholeWordInflection('багатьом', 'багато', [], ['num']),
                wholeWordInflection('багатьма', 'багато', [], ['num']),
                wholeWordInflection('кількох', 'кілька', [], ['num']),
                wholeWordInflection('кільком', 'кілька', [], ['num']),
                wholeWordInflection('кількома', 'кілька', [], ['num']),
                wholeWordInflection('скількох', 'скільки', [], ['num']),
                wholeWordInflection('скільком', 'скільки', [], ['num']),
                wholeWordInflection('скількома', 'скільки', [], ['num']),
                wholeWordInflection('декількох', 'декілька', [], ['num']),
                wholeWordInflection('декільком', 'декілька', [], ['num']),
                wholeWordInflection('декількома', 'декілька', [], ['num']),
                // Tens and hundreds decline on both parts
                wholeWordInflection('двохсот', 'двісті', [], ['num']),
                wholeWordInflection('двомстам', 'двісті', [], ['num']),
                wholeWordInflection('двомастами', 'двісті', [], ['num']),
                wholeWordInflection('двохстах', 'двісті', [], ['num']),
                wholeWordInflection('трьохсот', 'триста', [], ['num']),
                wholeWordInflection('трьомстам', 'триста', [], ['num']),
                wholeWordInflection('трьомастами', 'триста', [], ['num']),
                wholeWordInflection('трьохстах', 'триста', [], ['num']),
                wholeWordInflection('чотирьохсот', 'чотириста', [], ['num']),
                wholeWordInflection('чотирьомстам', 'чотириста', [], ['num']),
                wholeWordInflection('чотирмастами', 'чотириста', [], ['num']),
                wholeWordInflection('чотирьохстах', 'чотириста', [], ['num']),
                wholeWordInflection("п'ятисот", "п'ятсот", [], ['num']),
                wholeWordInflection("п'ятистам", "п'ятсот", [], ['num']),
                wholeWordInflection("п'ятьмастами", "п'ятсот", [], ['num']),
                wholeWordInflection("п'ятистах", "п'ятсот", [], ['num']),
                wholeWordInflection('шестисот', 'шістсот', [], ['num']),
                wholeWordInflection('шестистам', 'шістсот', [], ['num']),
                wholeWordInflection('шістьмастами', 'шістсот', [], ['num']),
                wholeWordInflection('шестистах', 'шістсот', [], ['num']),
                wholeWordInflection('семисот', 'сімсот', [], ['num']),
                wholeWordInflection('семистам', 'сімсот', [], ['num']),
                wholeWordInflection('сьомастами', 'сімсот', [], ['num']),
                wholeWordInflection('семистах', 'сімсот', [], ['num']),
                wholeWordInflection('восьмисот', 'вісімсот', [], ['num']),
                wholeWordInflection('восьмистам', 'вісімсот', [], ['num']),
                wholeWordInflection('вісьмастами', 'вісімсот', [], ['num']),
                wholeWordInflection('восьмистах', 'вісімсот', [], ['num']),
                wholeWordInflection("дев'ятисот", "дев'ятсот", [], ['num']),
                wholeWordInflection("дев'ятистам", "дев'ятсот", [], ['num']),
                wholeWordInflection("дев'ятьмастами", "дев'ятсот", [], ['num']),
                wholeWordInflection("дев'ятистах", "дев'ятсот", [], ['num']),
                wholeWordInflection("п'ятдесяти", "п'ятдесят", [], ['num']),
                wholeWordInflection("п'ятдесятьох", "п'ятдесят", [], ['num']),
                wholeWordInflection("п'ятдесятьом", "п'ятдесят", [], ['num']),
                wholeWordInflection("п'ятдесятьма", "п'ятдесят", [], ['num']),
                wholeWordInflection('шістдесяти', 'шістдесят', [], ['num']),
                wholeWordInflection('шістдесятьох', 'шістдесят', [], ['num']),
                wholeWordInflection('шістдесятьом', 'шістдесят', [], ['num']),
                wholeWordInflection('шістдесятьма', 'шістдесят', [], ['num']),
                wholeWordInflection('сімдесяти', 'сімдесят', [], ['num']),
                wholeWordInflection('сімдесятьох', 'сімдесят', [], ['num']),
                wholeWordInflection('сімдесятьом', 'сімдесят', [], ['num']),
                wholeWordInflection('сімдесятьма', 'сімдесят', [], ['num']),
                wholeWordInflection('вісімдесяти', 'вісімдесят', [], ['num']),
                wholeWordInflection('вісімдесятьох', 'вісімдесят', [], ['num']),
                wholeWordInflection('вісімдесятьом', 'вісімдесят', [], ['num']),
                wholeWordInflection('вісімдесятьма', 'вісімдесят', [], ['num']),
                wholeWordInflection("дев'яноста", "дев'яносто", [], ['num']),
                // одинадцять … тридцять share one pattern
                suffixInflection('дцяти', 'дцять', [], ['num']),
                suffixInflection('дцятьох', 'дцять', [], ['num']),
                suffixInflection('дцятьом', 'дцять', [], ['num']),
                suffixInflection('дцятьма', 'дцять', [], ['num']),
                suffixInflection('дцятьома', 'дцять', [], ['num']),
            ],
        },
        'impersonal passive': {
            name: 'impersonal passive',
            description: 'Impersonal passive form of a verb, as in "було зроблено"',
            rules: [
                suffixInflection('ано', 'ати', [], ['v']), // 'написано' -> 'написати'
                suffixInflection('яно', 'яти', [], ['v']),
                suffixInflection('овано', 'увати', [], ['v']), // 'абортовано' -> 'абортувати'
                suffixInflection('ьовано', 'ювати', [], ['v']), // 'мальовано' -> 'малювати'
                suffixInflection('ено', 'ити', [], ['v']), // 'визначено' -> 'визначити'
                suffixInflection('ено', 'ти', [], ['v']), // 'несено' -> 'нести'
                suffixInflection('лено', 'ити', [], ['v']), // 'зроблено' -> 'зробити'
                suffixInflection('дено', 'ти', [], ['v']), // 'знайдено' -> 'знайти'
                suffixInflection('джено', 'дити', [], ['v']), // 'народжено' -> 'народити'
                suffixInflection('шено', 'сити', [], ['v']), // 'запрошено' -> 'запросити'
                suffixInflection('чено', 'тити', [], ['v']), // 'сплачено' -> 'сплатити'
                suffixInflection('щено', 'стити', [], ['v']), // 'прощено' -> 'простити'
                suffixInflection('нено', 'нути', [], ['v']), // 'зігнено' -> 'зігнути'
                suffixInflection('то', 'ти', [], ['v']), // 'вжито' -> 'вжити'
            ],
        },
        'possessive adjective': {
            name: 'possessive adjective',
            description: 'Declined form of a possessive adjective',
            rules: [
                ...['ового', 'овому', 'овим', 'ова', 'ової', 'овій', 'ову', 'овою', 'ове', 'ові', 'ових', 'овими']
                    .map((ending) => suffixInflection(ending, 'ів', [], ['adj'])), // 'батькового' -> 'батьків'
                ...['иного', 'иному', 'иним', 'ина', 'иної', 'иній', 'ину', 'иною', 'ине', 'ині', 'иних', 'иними']
                    .map((ending) => suffixInflection(ending, 'ин', [], ['adj'])), // 'сестриного' -> 'сестрин'
            ],
        },
        'verbal noun': {
            name: 'verbal noun',
            description: 'Verbal noun derived from a verb',
            rules: [
                suffixInflection('ння', 'ти', [], ['v']), // 'читання' -> 'читати'
                suffixInflection('ття', 'ти', [], ['v']), // 'миття' -> 'мити'
            ],
        },
    },
};
