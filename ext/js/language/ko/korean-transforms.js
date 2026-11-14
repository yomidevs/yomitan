/*
 * Copyright (C) 2024-2026  Yomitan Authors
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

import {Hangul} from '../../../lib/hangul-js.js';
import {suffixInflection} from '../language-transforms.js';

const conditions = {
    v: {
        name: 'Verb',
        isDictionaryForm: true,
        i18n: [
            {
                language: 'ko',
                name: '동사 / 보조 동사',
            },
        ],
    },
    adj: {
        name: 'Adjective',
        isDictionaryForm: true,
        i18n: [
            {
                language: 'ko',
                name: '형용사 / 보조 형용사',
            },
        ],
    },
    ida: {
        name: 'Postpositional particle ida',
        isDictionaryForm: true,
        i18n: [
            {
                language: 'ko',
                name: '조사 이다',
            },
        ],
    },
    n: {
        name: 'Noun',
        isDictionaryForm: true,
        i18n: [
            {
                language: 'ko',
                name: '명사',
            },
        ],
    },
    pn: {
        name: 'Pronoun, numeral, bound noun or particle',
        isDictionaryForm: true,
        i18n: [
            {
                language: 'ko',
                name: '대명사 / 수사 / 의존 명사 / 조사',
            },
        ],
    },
    p: {
        name: 'Intermediate past tense ending',
        isDictionaryForm: false,
    },
    f: {
        name: 'Intermediate future tense ending',
        isDictionaryForm: false,
    },
    eusi: {
        name: 'Intermediate formal ending',
        isDictionaryForm: false,
    },
    euob: {
        name: 'Intermediate formal ending',
        isDictionaryForm: false,
    },
    euo: {
        name: 'Intermediate formal ending',
        isDictionaryForm: false,
    },
    sao: {
        name: 'Intermediate formal ending',
        isDictionaryForm: false,
    },
    saob: {
        name: 'Intermediate formal ending',
        isDictionaryForm: false,
    },
    sab: {
        name: 'Intermediate formal ending',
        isDictionaryForm: false,
    },
    jaob: {
        name: 'Intermediate formal ending',
        isDictionaryForm: false,
    },
    jao: {
        name: 'Intermediate formal ending',
        isDictionaryForm: false,
    },
    jab: {
        name: 'Intermediate formal ending',
        isDictionaryForm: false,
    },
    do: {
        name: 'Intermediate ending',
        isDictionaryForm: false,
    },
};

/** @typedef {keyof typeof conditions} Condition */
/** @typedef {import('language-transformer').SuffixRule<Condition>} Rule */

// Parts of speech that an ending can attach to.
/** @type {Condition[]} */
const V = ['v'];
/** @type {Condition[]} */
const A = ['adj'];
/** @type {Condition[]} */
const I = ['ida'];
/** @type {Condition[]} */
const VA = ['v', 'adj'];
/** @type {Condition[]} */
const VI = ['v', 'ida'];
/** @type {Condition[]} */
const AI = ['adj', 'ida'];
/** @type {Condition[]} */
const VAI = ['v', 'adj', 'ida'];

/**
 * The text preprocessor disassembles Hangul into jamo before the transforms are applied (먹어서 → ㅁㅓㄱㅇㅓㅅㅓ),
 * so every rule has to match and produce jamo. The rules in this file are written in Hangul and converted here,
 * with the same function the preprocessor uses. A lone jamo stands for itself, which is how a final consonant
 * or a bare vowel is written: 'ㄹ까' is ㄹㄲㅏ and 'ㅘ서' is ㅗㅏㅅㅓ.
 * @param {string} text
 * @returns {string}
 */
function toJamo(text) {
    return Hangul.disassemble(text, false).join('');
}

/**
 * A single rule, written in Hangul.
 * @param {string} inflected
 * @param {string} deinflected
 * @param {Condition[]} conditionsIn
 * @param {Condition[]} conditionsOut
 * @returns {Rule}
 */
function suffix(inflected, deinflected, conditionsIn, conditionsOut) {
    return suffixInflection(toJamo(inflected), toJamo(deinflected), conditionsIn, conditionsOut);
}

/**
 * @param {Condition[]} pos
 * @returns {Condition[]}
 */
function exceptIda(pos) {
    return pos.filter((condition) => condition !== 'ida');
}

/**
 * A stem-final ㄹ drops before endings that start with ㄴ, ㅂ, ㅅ, 오 or a final ㄹ (살다 → 사는, 삽니다, 사세요, 사오, 살).
 * @param {string} ending
 * @returns {boolean}
 */
function dropsRieul(ending) {
    return /^(?:[ㄴㅂㅅ]|ㅇㅗ|ㄹ(?![ㅏ-ㅣ]))/.test(toJamo(ending));
}

/**
 * An ending, or the form of an ending, that is only used after a consonant-final stem and that ㄹ-stems never take:
 * -습니다 (먹습니다), -는다 (먹는다), -소 (먹소), -사오- (먹사오니).
 * @param {string} ending
 * @param {Condition[]} pos Parts of speech the ending attaches to.
 * @param {Condition[]} [prefinals] Pre-final endings the ending can follow (갔습니다).
 * @returns {Rule[]}
 */
function afterConsonant(ending, pos, prefinals = []) {
    /** @type {Rule[]} */
    const rules = [];
    if (pos.length > 0) { rules.push(suffix(ending, '다', [], pos)); }
    if (prefinals.length > 0) { rules.push(suffix(ending, '', [], prefinals)); }
    return rules;
}

/**
 * An ending that has the same form after every stem: -고 (가고, 먹고), -지만, -는 (가는, 먹는, 사는).
 * @param {string} ending
 * @param {Condition[]} pos Parts of speech the ending attaches to.
 * @param {Condition[]} [prefinals] Pre-final endings the ending can follow (갔고, 가시고).
 * @returns {Rule[]}
 */
function plain(ending, pos, prefinals = []) {
    const rules = afterConsonant(ending, pos, prefinals);
    const rieulPos = exceptIda(pos);
    if (dropsRieul(ending) && rieulPos.length > 0) { rules.push(suffix(ending, 'ㄹ다', [], rieulPos)); }
    return rules;
}

/**
 * An ending that takes 으 after a consonant-final stem: -(으)면 (가면, 먹으면), -(으)니까, -(으)ㄹ까.
 * Covers the ㅂ, ㅅ, ㄷ and ㅎ irregular stems (도우면, 지으면, 들으면, 그러면) and ㄹ-stems (살면, 사니까).
 * @param {string} ending The ending without 으.
 * @param {Condition[]} pos Parts of speech the ending attaches to.
 * @param {Condition[]} [prefinals] Pre-final endings the ending follows directly (가시면).
 * @param {Condition[]} [euPrefinals] Pre-final endings the ending follows with 으 (갔으면).
 * @returns {Rule[]}
 */
function eu(ending, pos, prefinals = [], euPrefinals = []) {
    const rules = plain(ending, pos, prefinals);
    const consonantPos = exceptIda(pos);
    if (consonantPos.length > 0) {
        rules.push(
            suffix('으' + ending, '다', [], consonantPos),
            suffix('우' + ending, 'ㅂ다', [], consonantPos),
            suffix('으' + ending, 'ㅅ다', [], consonantPos),
            suffix('ㄹ으' + ending, 'ㄷ다', [], consonantPos),
        );
    }
    if (pos.includes('adj')) { rules.push(suffix(ending, 'ㅎ다', [], A)); }
    if (euPrefinals.length > 0) { rules.push(suffix('으' + ending, '', [], euPrefinals)); }
    return rules;
}

/**
 * An ending that is -ㅂ… after a vowel-final stem and -습… after a consonant-final one: -(스)ㅂ니다 (갑니다, 먹습니다, 갔습니다).
 * @param {string} ending The ending without the leading ㅂ / 습.
 * @returns {Rule[]}
 */
function seup(ending) {
    return [
        ...plain('ㅂ' + ending, VAI, ['eusi']),
        ...afterConsonant('습' + ending, VA, ['p', 'f']),
    ];
}

/**
 * 있다 and 없다 take the verb form of an ending even where they are adjectives (맛있는, 재미없는데).
 * @param {string} ending
 * @returns {Rule[]}
 */
function existential(ending) {
    return [
        suffix('있' + ending, '있다', [], A),
        suffix('없' + ending, '없다', [], A),
    ];
}

/**
 * An ending that is -(으)ㄴ… after adjectives and 이다 and -는… after verbs: -(으/느)ㄴ데 (예쁜데, 좋은데, 가는데, 갔는데).
 * @param {string} ending The ending without the leading ㄴ / 는.
 * @param {Condition[]} pos Parts of speech that take the -(으)ㄴ… form.
 * @param {Condition[]} [prefinals] Pre-final endings the -(으)ㄴ… form can follow.
 * @returns {Rule[]}
 */
function euNeun(ending, pos, prefinals = ['eusi']) {
    return [
        ...eu('ㄴ' + ending, pos, prefinals),
        ...plain('는' + ending, V, ['p', 'f', 'eusi']),
        ...existential('는' + ending),
    ];
}

/**
 * An ending built on the plain declarative -((느)ㄴ)다: -((느)ㄴ)다고 (간다고, 먹는다고, 예쁘다고, 갔다고).
 * @param {string} ending The ending without the leading ㄴ / 는.
 * @param {Condition[]} pos Parts of speech that take the ending as it is.
 * @param {Condition[]} [ndaPos] Parts of speech that take the -ㄴ… form.
 * @returns {Rule[]}
 */
function nda(ending, pos, ndaPos = V) {
    return [
        ...plain('ㄴ' + ending, ndaPos, ['eusi']),
        ...afterConsonant('는' + ending, V),
        ...plain(ending, pos, ['p', 'f', 'eusi']),
    ];
}

/**
 * 아니다 with an ending that is otherwise only used with 이다 (아니라서, 아니로구나).
 * @param {string} ending
 * @returns {Rule}
 */
function anida(ending) {
    return suffix('아니' + ending, '아니다', [], A);
}

/**
 * An ending that only attaches to 이다 and 아니다: -라서 (이라서, 아니라서), -로구나.
 * @param {string} ending
 * @param {Condition[]} [prefinals] Pre-final endings the ending can follow (이시라서).
 * @returns {Rule[]}
 */
function copula(ending, prefinals = []) {
    return [anida(ending), ...afterConsonant(ending, I, prefinals)];
}

/**
 * How 아/어 combines with the end of a stem, as [inflected, deinflected, parts of speech].
 * @type {[inflected: string, deinflected: string, pos: Condition[]][]}
 */
const aeoStems = [
    ['아', '다', VA], // 잡아 → 잡다
    ['어', '다', VAI], // 먹어 → 먹다
    ['ㅘ', 'ㅗ다', VA], // 봐 → 보다
    ['ㅝ', 'ㅜ다', VA], // 줘 → 주다
    ['ㅙ', 'ㅚ다', VA], // 돼 → 되다
    ['ㅕ', 'ㅣ다', VA], // 마셔 → 마시다
    ['여', '이다', VAI], // 보여 → 보이다
    ['해', '하다', VA], // 해 → 하다
    ['하여', '하다', VA], // 하여 → 하다
    ['ㅏ', 'ㅡ다', VA], // 바빠 → 바쁘다
    ['ㅓ', 'ㅡ다', VA], // 써 → 쓰다
    ['와', 'ㅂ다', VA], // 도와 → 돕다
    ['워', 'ㅂ다', VA], // 추워 → 춥다
    ['아', 'ㅅ다', VA], // 나아 → 낫다
    ['어', 'ㅅ다', VA], // 지어 → 짓다
    ['ㄹ아', 'ㄷ다', VA], // 깨달아 → 깨닫다
    ['ㄹ어', 'ㄷ다', VA], // 들어 → 듣다
    ['ㄹ라', '르다', VA], // 몰라 → 모르다
    ['ㄹ러', '르다', VA], // 불러 → 부르다
    ['르러', '르다', VA], // 이르러 → 이르다
    ['ㅐ', 'ㅏㅎ다', A], // 파래 → 파랗다
    ['ㅐ', 'ㅓㅎ다', A], // 그래 → 그렇다
    ['ㅔ', 'ㅓㅎ다', A], // 꺼메 → 꺼멓다
    ['ㅒ', 'ㅑㅎ다', A], // 하얘 → 하얗다
    ['ㅖ', 'ㅕㅎ다', A], // 허예 → 허옇다
    ['래', '러다', V], // 그래 → 그러다
    ['놔', '놓다', V], // 놔 → 놓다
    ['퍼', '푸다', V], // 퍼 → 푸다
];

/**
 * Stem-final vowels that absorb 아/어, so that the ending follows the stem directly (가서, 서서, 보내서, 세서, 켜서).
 * ㅚ is not one of them (되어서 → 돼서), but 되서 is a common misspelling.
 */
const aeoContractedVowels = ['ㅏ', 'ㅓ', 'ㅐ', 'ㅔ', 'ㅕ', 'ㅚ'];

/**
 * An ending that starts with 아/어: -아/어서 (잡아서, 먹어서, 해서, 가서).
 * @param {string} ending The ending without 아/어.
 * @param {object} [options]
 * @param {boolean} [options.contracted] Whether the ending can follow a stem that has absorbed 아/어 (가서).
 * @param {boolean} [options.ida] Whether the ending attaches to 이다 (이어서, 여서).
 * @param {Condition[]} [options.prefinals] Pre-final endings the ending can follow (갔어도).
 * @param {boolean} [options.honorific] Whether the ending can follow -(으)시- (하셔서, 하시어서).
 * @returns {Rule[]}
 */
function aeo(ending, {contracted = true, ida = true, prefinals = [], honorific = false} = {}) {
    const rules = aeoStems.map(([inflected, deinflected, pos]) => suffix(inflected + ending, deinflected, [], ida ? pos : exceptIda(pos)));
    if (contracted) {
        for (const vowel of aeoContractedVowels) {
            rules.push(suffix(vowel + ending, vowel + '다', [], VA));
        }
    }
    if (prefinals.length > 0) { rules.push(suffix('어' + ending, '', [], prefinals)); }
    if (honorific) {
        rules.push(
            suffix('셔' + ending, '시', [], ['eusi']),
            suffix('시어' + ending, '시', [], ['eusi']),
        );
    }
    return rules;
}

/**
 * Makes rules apply only inside a chain, to text left behind by an outer rule with one of the given conditions.
 * This is how pre-final endings work: -(으)면 leaves 가시 with the condition `eusi`, which -(으)시 then accepts.
 * @param {Condition[]} conditionsIn
 * @param {Rule[]} rules
 * @returns {Rule[]}
 */
function chain(conditionsIn, rules) {
    return rules.map((rule) => ({...rule, conditionsIn}));
}

/**
 * Removes a particle that has contracted into the final syllable of a word (나 + 는 → 난, 이거 + 를 → 이걸).
 * The particle is only removed after a vowel, and only if the word is at least `minSyllables` syllables long.
 * Short nouns are excluded this way because most of them collide with unrelated words (시간 → 시가, 사실 → 사시).
 * @param {string} particle
 * @param {number} minSyllables
 * @param {Condition[]} conditionsOut
 * @returns {Rule}
 */
function contractedParticle(particle, minSyllables, conditionsOut) {
    // In disassembled text every syllable has exactly one run of vowels.
    const precedingSyllables = '(?:[ㅏ-ㅣ]+[ㄱ-ㅎ]+)'.repeat(minSyllables - 1);
    return {
        type: 'suffix',
        isInflected: new RegExp(`${precedingSyllables}[ㅏ-ㅣ]${particle}$`),
        deinflected: '',
        deinflect: (text) => text.slice(0, -particle.length),
        conditionsIn: [],
        conditionsOut,
    };
}

const stemFinals = 'ㅂㅃㅈㅉㄷㄸㄱㄲㅅㅆㅁㄴㅇㄹㅎㅋㅌㅊㅍㅛㅕㅑㅐㅒㅔㅖㅗㅓㅏㅣㅠㅜㅡ';

/**
 * The rules of every ending, keyed by the name of the ending.
 * @type {{[name: string]: Rule[]}}
 */
const endings = {
    '-거나': plain('거나', VAI, ['p', 'f', 'euob', 'eusi']),
    '-거늘': plain('거늘', VAI, ['p', 'f', 'euob', 'eusi']),
    '-거니': plain('거니', VAI, ['p', 'f', 'euob', 'eusi']),
    '-거니와': plain('거니와', VAI, ['p', 'f', 'eusi']),
    '-거던': plain('거던', VAI, ['p', 'f', 'eusi']),
    '-거드면': plain('거드면', VAI, ['p', 'f', 'eusi']),
    '-거든': plain('거든', VAI, ['p', 'f', 'eusi']),
    '-거들랑': plain('거들랑', VAI, ['p', 'f', 'eusi']),
    '-거라': plain('거라', V),
    '-건': plain('건', VAI, ['p', 'f', 'euob', 'eusi']),
    '-건대': plain('건대', V, ['p', 'eusi', 'jaob']),
    '-건마는': plain('건마는', VAI, ['p', 'f', 'eusi']),
    '-건만': plain('건만', VAI, ['p', 'f', 'eusi']),
    '-걸랑': plain('걸랑', VAI, ['p', 'f', 'eusi']),
    '-것다': plain('것다', VAI, ['p', 'eusi']),
    '-것마는': plain('것마는', VAI, ['p', 'f', 'eusi']),
    '-게': plain('게', VAI, ['p', 'eusi']),
    '-게끔': plain('게끔', VA, ['eusi']),
    '-게나': plain('게나', V, ['eusi']),
    '-게시리': plain('게시리', VA, ['eusi']),
    '-겠': chain(['f'], plain('겠', VAI, ['p', 'eusi'])),
    '-고': plain('고', VAI, ['p', 'f', 'eusi', 'saob', 'euob', 'euo', 'sab', 'jaob', 'jab']),
    '-고는 하다': chain(['v'], plain('고는 하다', V, ['eusi'])),
    '-곤 하다': chain(['v'], plain('곤 하다', V, ['eusi'])),
    '-고는': plain('고는', VA, ['eusi']),
    '-곤': plain('곤', VA, ['eusi']),
    '-고도': plain('고도', VAI, ['eusi']),
    '-고말고': plain('고말고', VAI, ['p', 'eusi']),
    '-고서': [...plain('고서', V, ['eusi']), anida('고서')],
    '-고야': plain('고야', V, ['eusi']),
    '-고자': [...plain('고자', V, ['eusi']), ...existential('고자')],
    '-고저': [...plain('고저', V, ['eusi']), ...existential('고저')],
    '-관데': plain('관데', VAI, ['p', 'eusi']),
    '-구나': plain('구나', AI, ['p', 'f', 'eusi']),
    '-구려': plain('구려', VAI, ['p', 'f', 'eusi']),
    '-구료': plain('구료', VAI, ['p', 'f', 'eusi']),
    '-구만': plain('구만', VAI, ['p', 'f', 'eusi']),
    '-구먼': plain('구먼', VAI, ['p', 'f', 'eusi']),
    '-구면': plain('구면', VAI, ['p', 'f', 'eusi']),
    '-군': plain('군', VAI, ['p', 'f', 'eusi']),
    '-기': plain('기', VAI, ['p', 'f', 'eusi']),
    '-기로': plain('기로', VAI, ['p', 'f', 'eusi']),
    '-기로니': plain('기로니', VAI),
    '-기로서': plain('기로서', VAI, ['p']),
    '-기로서니': plain('기로서니', VAI, ['p']),
    '-기로선들': plain('기로선들', VAI, ['p']),
    '-기에': plain('기에', VAI, ['p', 'f', 'eusi']),
    '-긴': plain('긴', VAI, ['p', 'f', 'eusi']),
    '-길': plain('길', VAI, ['p', 'f', 'eusi']),
    '-길래': plain('길래', VAI, ['p', 'eusi']),
    '-(으)ㄹ': eu('ㄹ', VAI, ['eusi'], ['p']),
    '-(으)ㄹ거나': eu('ㄹ거나', VAI, ['eusi'], ['p', 'f']),
    '-(으)ㄹ걸': eu('ㄹ걸', VAI, ['eusi'], ['p']),
    '-(으)ㄹ게': eu('ㄹ게', V),
    '-(으)ㄹ 거야': eu('ㄹ 거야', VAI, ['eusi'], ['p']),
    '-(으)ㄹ 거예요': eu('ㄹ 거예요', VAI, ['eusi'], ['p']),
    '-(으)ㄹ 것이다': eu('ㄹ 것이다', VAI, ['eusi'], ['p']),
    '-(으)ㄹ 것입니다': eu('ㄹ 것입니다', VAI, ['eusi'], ['p']),
    '-(으)ㄹ 거다': eu('ㄹ 거다', VAI, ['eusi'], ['p']),
    '-(으)ㄹ 겁니다': eu('ㄹ 겁니다', VAI, ['eusi'], ['p']),
    '-(으)ㄹ께': eu('ㄹ께', VAI),
    '-(으)나': eu('나', VAI, ['p', 'f', 'eusi', 'sao'], ['p', 'f']),
    '-나니': plain('나니', V, ['p', 'f', 'eusi', 'sab', 'euob']),
    '-(으)나마': eu('나마', VAI, ['eusi'], ['p', 'f']),
    '-나이까': plain('나이까', VA, ['p', 'f', 'eusi', 'saob', 'euob']),
    '-나이다': plain('나이다', VA, ['p', 'f', 'eusi', 'saob', 'jaob', 'jab', 'euob']),
    '-남': plain('남', V, ['p', 'f', 'eusi']),
    '-(으)냐': eu('냐', VAI, ['p', 'f', 'eusi'], ['p', 'f', 'eusi']),
    '-(으)냐고': eu('냐고', VAI, ['p', 'f', 'eusi'], ['p', 'f', 'eusi']),
    '-너라': afterConsonant('너라', V),
    '-네': [...plain('네', VAI, ['p', 'f', 'eusi']), suffix('네', 'ㅎ다', [], A)],
    '-노니': plain('노니', V, ['p', 'f', 'eusi', 'sab', 'euob']),
    '-노라': plain('노라', V, ['p', 'f']),
    '-노라고': plain('노라고', V),
    '-노라니': plain('노라니', VA),
    '-노라니까': plain('노라니까', VA),
    '-노라면': [...plain('노라면', V, ['eusi']), ...existential('노라면')],
    '-(으)뇨': eu('뇨', VAI, ['eusi']),
    '-누': plain('누', VA, ['p', 'f']),
    '-누나': plain('누나', V, ['eusi']),
    '-누만': plain('누만', V, ['eusi']),
    '-누먼': plain('누먼', V, ['eusi']),
    '-느냐': plain('느냐', VA, ['p', 'f', 'eusi']),
    '-느냐고': plain('느냐고', VA, ['p', 'f', 'eusi']),
    '-느뇨': plain('느뇨', VA, ['p', 'f', 'eusi']),
    '-느니': plain('느니', VA, ['p', 'f', 'eusi']),
    '-느니만': chain(['v'], plain('느니만 못하다', VA)),
    '-느라': plain('느라', V, ['eusi']),
    '-느라고': plain('느라고', V, ['eusi']),
    '-는': [...plain('는', V, ['eusi', 'f']), ...existential('는')],
    '-(으)ㄴ': eu('ㄴ', VAI, ['eusi', 'f']),
    '-(으/느)ㄴ가': euNeun('가', AI),
    '-(으/느)ㄴ감': euNeun('감', AI),
    '-(으/느)ㄴ걸': euNeun('걸', VAI),
    '-(으/느)ㄴ고': euNeun('고', AI),
    '-는구나': plain('는구나', V, ['eusi']),
    '-는구려': plain('는구려', V, ['eusi']),
    '-는구료': plain('는구료', V, ['eusi']),
    '-는구만': plain('는구만', V, ['eusi']),
    '-는구먼': plain('는구먼', V, ['eusi']),
    '-는구면': plain('는구면', V, ['eusi']),
    '-는군': plain('는군', V, ['eusi']),
    '-는궈니': [...plain('는궈니', V, ['p', 'f', 'eusi']), ...existential('는궈니')],
    '-는과니': [...plain('는과니', V, ['p', 'f', 'eusi']), ...existential('는과니')],
    '-(느)ㄴ다': [...plain('ㄴ다', V, ['eusi']), ...afterConsonant('는다', V)],
    '-((느)ㄴ)다고': nda('다고', A),
    '-((느)ㄴ)다나': nda('다나', A),
    '-((느)ㄴ)다네': nda('다네', A),
    '-((느)ㄴ)다느니': nda('다느니', A),
    '-((느)ㄴ)다니': nda('다니', VA),
    '-((느)ㄴ)다니까': nda('다니까', A),
    '-((느)ㄴ)다더라': nda('다더라', A),
    '-((느)ㄴ)다마는': nda('다마는', A, VI),
    '-((느)ㄴ)다만': nda('다만', A, VI),
    '-((느)ㄴ)다며': nda('다며', A),
    '-((느)ㄴ)다면': nda('다면', A),
    '-((느)ㄴ)다면서': nda('다면서', A),
    '-((느)ㄴ)다손': nda('다손', A),
    '-((느)ㄴ)다오': nda('다오', VA),
    '-((느)ㄴ)다지': nda('다지', A),
    '-((느)ㄴ)단다': nda('단다', A),
    '-((느)ㄴ)담': nda('담', A),
    '-((느)ㄴ)답니까': nda('답니까', VA),
    '-((느)ㄴ)답니다': nda('답니다', VA),
    '-((느)ㄴ)답시고': nda('답시고', VA),
    '-((느)ㄴ)대': nda('대', VA),
    '-((느)ㄴ)대요': [...nda('대요', VA, VI), ...existential('는대요')],
    '-((느)ㄴ)댄다': nda('댄다', VA),
    '-(으/느)ㄴ데': euNeun('데', AI, ['eusi', 'sao']),
    '-(으/느)ㄴ뎁쇼': euNeun('뎁쇼', AI),
    '-는도다': plain('는도다', V),
    '-(으/느)ㄴ바': euNeun('바', VAI),
    '-(으/느)ㄴ지': euNeun('지', AI),
    '-(으/느)ㄴ지고': euNeun('지고', VAI),
    '-(으/느)ㄴ지라': euNeun('지라', VAI),
    '-(으)니': eu('니', VAI, ['p', 'f', 'eusi', 'euo', 'sao', 'jao'], ['p', 'f']),
    '-(으)니까': eu('니까', VAI, ['eusi'], ['p', 'f']),
    '-(으)니까느루': eu('니까느루', VAI, ['eusi'], ['p', 'f']),
    '-(으)니까는': eu('니까는', VAI, ['eusi'], ['p', 'f']),
    '-(으)니깐': eu('니깐', VAI, ['eusi'], ['p', 'f']),
    '-(으/느)니라': [...eu('니라', AI, ['eusi'], ['p', 'f', 'eusi']), ...plain('느니라', VA, ['p', 'f', 'eusi'])],
    '-(으/느)니만치': [...eu('니만치', VAI, ['eusi'], ['p', 'f']), ...plain('느니만치', VA, ['eusi'])],
    '-(으/느)니만큼': [...eu('니만큼', VAI, ['eusi'], ['p', 'f']), ...plain('느니만큼', VA, ['eusi'])],
    '-다': [suffix('다', '', [], ['p', 'f', 'eusi'])],
    '-다가': plain('다가', VA, ['p', 'eusi']),
    '-다가는': plain('다가는', VAI, ['p', 'f', 'eusi']),
    '-다간': plain('다간', VA, ['p', 'f', 'eusi']),
    '-다마다': plain('다마다', VAI, ['p', 'eusi']),
    '-다시피': [...plain('다시피', VA, ['p', 'f', 'eusi']), ...existential('다시피')],
    '-단': plain('단', VAI, ['p', 'f', 'eusi']),
    '-더': chain(['do'], plain('더', VAI, ['p', 'f', 'eusi'])),
    '-더구나': plain('더구나', VAI, ['p', 'f', 'eusi']),
    '-더구려': plain('더구려', VAI, ['p', 'f', 'eusi']),
    '-더구료': plain('더구료', VAI, ['p', 'f', 'eusi']),
    '-더구만': plain('더구만', VAI, ['p', 'f', 'eusi']),
    '-더구먼': plain('더구먼', VAI, ['p', 'f', 'eusi']),
    '-더구면': plain('더구면', VAI, ['p', 'f', 'eusi']),
    '-더군': plain('더군', VAI, ['p', 'f', 'eusi']),
    '-더냐': plain('더냐', VAI, ['p', 'f', 'eusi']),
    '-더뇨': plain('더뇨', VAI, ['p', 'f', 'eusi']),
    '-더니': plain('더니', VAI, ['p', 'f', 'eusi', 'euob', 'euo', 'sab']),
    '-더니라': plain('더니라', VAI, ['p', 'f', 'eusi']),
    '-더니마는': plain('더니마는', VAI, ['p', 'f', 'eusi']),
    '-더니만': plain('더니만', VAI, ['p', 'f', 'eusi']),
    '-더니이까': plain('더니이까', VAI, ['p', 'f', 'eusi']),
    '-더니이다': plain('더니이다', VAI, ['p', 'f', 'eusi']),
    '-더라도': plain('더라도', VAI, ['p', 'f', 'eusi']),
    '-더이까': plain('더이까', VAI, ['p', 'f', 'eusi']),
    '-더이다': plain('더이다', VAI, ['p', 'f', 'eusi']),
    '-던': plain('던', VAI, ['p', 'f', 'eusi']),
    '-던가': plain('던가', VAI, ['p', 'f', 'eusi']),
    '-던감': plain('던감', VAI, ['p', 'f', 'eusi']),
    '-던걸': plain('던걸', VAI, ['p', 'f', 'eusi']),
    '-던고': plain('던고', VAI, ['p', 'f', 'eusi']),
    '-던데': plain('던데', VAI, ['p', 'f', 'eusi']),
    '-던들': [suffix('던들', '', [], ['p'])],
    '-던바': plain('던바', VAI, ['p', 'f', 'eusi']),
    '-던지': plain('던지', VAI, ['p', 'f', 'eusi']),
    '-데': plain('데', VAI, ['p', 'f', 'eusi']),
    '-데요': plain('데요', VAI, ['p', 'f', 'eusi']),
    '-도다': plain('도다', VAI, ['p', 'f', 'eusi']),
    '-도록': plain('도록', VA, ['eusi']),
    '-(으)되': eu('되', VAI, ['eusi'], ['p', 'f']),
    '-드구나': plain('드구나', VAI, ['p', 'f', 'eusi']),
    '-드구료': plain('드구료', VAI, ['p', 'f', 'eusi']),
    '-드구면': plain('드구면', VAI, ['p', 'f', 'eusi']),
    '-드군': plain('드군', VAI, ['p', 'f', 'eusi']),
    '-드냐': plain('드냐', VAI, ['p', 'f', 'eusi']),
    '-드니': plain('드니', VAI, ['p', 'f', 'eusi']),
    '-드니라': plain('드니라', VAI, ['p', 'f', 'eusi']),
    '-드라': plain('드라', VAI, ['p', 'f', 'eusi']),
    '-드라도': plain('드라도', VAI, ['p', 'f', 'eusi']),
    '-드라면': [suffix('드라면', '', [], ['p'])],
    '-드래도': plain('드래도', VAI, ['p', 'f', 'eusi']),
    '-든': plain('든', VAI, ['p', 'eusi']),
    '-든가': plain('든가', VAI, ['p', 'eusi']),
    '-든걸': plain('든걸', VAI, ['p', 'f', 'eusi']),
    '-든고': plain('든고', VAI, ['p', 'f', 'eusi']),
    '-든데': plain('든데', VAI, ['p', 'f', 'eusi']),
    '-든들': [suffix('든들', '', [], ['p'])],
    '-든지': plain('든지', VAI, ['p', 'eusi']),
    '-듯': plain('듯', VAI, ['p', 'f', 'eusi']),
    '-듯이': plain('듯이', VAI, ['p', 'f', 'eusi']),
    '-디': plain('디', VAI, ['p', 'f', 'eusi']),
    '-(으)라': [...eu('라', VI, ['eusi', 'do']), anida('라')],
    '-(으)라고': [...eu('라고', VI, ['eusi', 'do']), anida('라고')],
    '-(으)라구': [...eu('라구', VI, ['eusi', 'do']), anida('라구')],
    '-(으)라나': [...eu('라나', VI, ['eusi', 'do']), anida('라나')],
    '-(으)라네': [...eu('라네', VI, ['eusi', 'do']), anida('라네')],
    '-(으)라느니': [...eu('라느니', VI, ['eusi', 'do']), anida('라느니')],
    '-(으)라니': [...eu('라니', VI, ['eusi', 'do']), anida('라니')],
    '-(으)라니까': [...eu('라니까', VI, ['eusi', 'do']), anida('라니까')],
    '-라도': copula('라도'),
    '-(으)라며': [...eu('라며', VI, ['eusi', 'do']), anida('라며')],
    '-(으)라면': [...eu('라면', VI, ['eusi', 'do']), anida('라면')],
    '-(으)라면서': [...eu('라면서', VI, ['eusi', 'do']), anida('라면서')],
    '-라서': copula('라서', ['eusi']),
    '-(으)라손': [...eu('라손', VI, ['eusi', 'do']), anida('라손')],
    '-라야': copula('라야', ['eusi']),
    '-라야만': copula('라야만', ['eusi']),
    '-(으)라오': [...eu('라오', VI, ['eusi', 'do']), anida('라오')],
    '-(으)라지': [...eu('라지', VI, ['eusi', 'do']), anida('라지')],
    '-(으)락': eu('락', VA),
    '-(으)란': [...eu('란', VI, ['eusi', 'do']), anida('란')],
    '-(으)란다': [...eu('란다', VI, ['eusi', 'do']), anida('란다')],
    '-(으)람': [...eu('람', VI, ['eusi', 'do']), anida('람')],
    '-(으)랍니까': [...eu('랍니까', VI, ['eusi', 'do']), anida('랍니까')],
    '-(으)랍니다': [...eu('랍니다', VI, ['eusi', 'do']), anida('랍니다')],
    '-랍시고': copula('랍시고', ['eusi']),
    '-(으)래': [...eu('래', VI, ['eusi', 'do']), anida('래')],
    '-(으)래요': [...eu('래요', VI, ['eusi', 'do']), anida('래요')],
    '-(으)랴': eu('랴', VAI, ['eusi'], ['p', 'f']),
    '-(으)러': eu('러', VI, ['eusi']),
    '-러니': copula('러니', ['eusi']),
    '-러니라': copula('러니라', ['eusi']),
    '-러니이까': copula('러니이까', ['eusi']),
    '-러니이다': copula('러니이다', ['eusi']),
    '-러라': copula('러라', ['eusi']),
    '-러이까': copula('러이까', ['eusi']),
    '-러이다': copula('러이다', ['eusi']),
    '-런가': copula('런가', ['eusi']),
    '-런들': copula('런들', ['eusi']),
    '-(으)려': eu('려', V, ['eusi'], ['p']),
    '-(으)려거든': eu('려거든', V, ['eusi'], ['p']),
    '-(으)려고': eu('려고', VA, ['eusi'], ['p']),
    '-(으)려나': eu('려나', VAI, ['eusi'], ['p']),
    '-(으)려니': eu('려니', VAI, ['eusi'], ['p']),
    '-(으)려니와': eu('려니와', VAI, ['eusi'], ['p']),
    '-(으)려든': eu('려든', V, ['eusi'], ['p']),
    '-(으)려마': eu('려마', V, ['eusi'], ['p']),
    '-(으)려면': eu('려면', VAI, ['eusi'], ['p']),
    '-(으)려무나': eu('려무나', V, ['eusi'], ['p']),
    '-(으)련': eu('련', V, ['eusi'], ['p']),
    '-(으)련마는': eu('련마는', VAI, ['eusi'], ['p']),
    '-(으)련만': eu('련만', VAI, ['eusi'], ['p']),
    '-(으)렴': eu('렴', V, ['eusi'], ['p']),
    '-(으)렵니까': eu('렵니까', V, ['eusi'], ['p']),
    '-(으)렵니다': eu('렵니다', V, ['eusi'], ['p']),
    '-(으)렷다': eu('렷다', VAI, ['eusi'], ['p']),
    '-로고': copula('로고', ['eusi']),
    '-로고나': copula('로고나', ['eusi']),
    '-로구나': copula('로구나', ['eusi']),
    '-로구려': copula('로구려', ['eusi']),
    '-로구료': copula('로구료', ['eusi']),
    '-로구만': copula('로구만', ['eusi']),
    '-로구먼': copula('로구먼', ['eusi']),
    '-로구면': copula('로구면', ['eusi']),
    '-로군': copula('로군', ['eusi']),
    '-로다': copula('로다', ['eusi']),
    '-로되': copula('로되', ['eusi']),
    '-로라': copula('로라', ['eusi']),
    '-로서니': copula('로서니', ['eusi']),
    '-로세': copula('로세', ['eusi']),
    '-(으)리': eu('리', VAI, ['eusi', 'euo'], ['p']),
    '-(으)리까': eu('리까', VAI, ['eusi', 'euo'], ['p']),
    '-(으)리니': eu('리니', VAI, ['eusi', 'euo'], ['p']),
    '-(으)리니라': eu('리니라', VAI, ['eusi', 'euo'], ['p']),
    '-(으)리다': eu('리다', VAI, ['eusi', 'euo'], ['p']),
    '-(으)리라': eu('리라', VAI, ['eusi'], ['p']),
    '-(으)리로다': eu('리로다', VAI, ['eusi', 'euo'], ['p']),
    '-(으)리만치': eu('리만치', VAI, ['eusi', 'euo'], ['p']),
    '-(으)리만큼': eu('리만큼', VAI, ['eusi', 'euo'], ['p']),
    '-(으)리오': eu('리오', VAI, ['eusi', 'euo'], ['p']),
    '-(으)마': eu('마', V),
    '-(으)매': eu('매', VAI, ['eusi'], ['p', 'f']),
    '-(으)며': eu('며', VAI, ['eusi'], ['p', 'f']),
    '-(으)면': eu('면', VAI, ['eusi', 'euo', 'jao'], ['p', 'f']),
    '-(으)면서': eu('면서', VAI, ['eusi'], ['p', 'f']),
    '-(으)므로': eu('므로', VAI, ['eusi'], ['p', 'f']),
    '-(으)사': eu('사', VA),
    '-사오': chain(['sao'], afterConsonant('사오', VA, ['p', 'f'])),
    '-사오니까': afterConsonant('사오니까', VA, ['p', 'f']),
    '-사오리까': afterConsonant('사오리까', VA, ['p', 'f']),
    '-사오리다': afterConsonant('사오리다', VA, ['p', 'f']),
    '-사오리이까': afterConsonant('사오리이까', VA, ['p', 'f']),
    '-사오리이다': afterConsonant('사오리이다', VA, ['p', 'f']),
    '-사오이다': afterConsonant('사오이다', VA, ['p', 'f']),
    '-사옵': chain(['saob'], afterConsonant('사옵', VA, ['p', 'f'])),
    '-사옵니까': afterConsonant('사옵니까', VA, ['p', 'f']),
    '-사옵니다': afterConsonant('사옵니다', VA, ['p', 'f']),
    '-사옵디까': afterConsonant('사옵디까', VA, ['p', 'f']),
    '-사옵디다': afterConsonant('사옵디다', VA, ['p', 'f']),
    '-사와': afterConsonant('사와', VA, ['p', 'f']),
    '-사외다': afterConsonant('사외다', VA, ['p', 'f']),
    '-(으)사이다': eu('사이다', VA),
    '-삽': chain(['sab'], afterConsonant('삽', VA, ['p', 'f'])),
    '-(으)세': eu('세', V),
    '-세나': plain('세나', V),
    '-(으)세요': eu('세요', VAI),
    '-(으)셔요': eu('셔요', VAI),
    '-소': afterConsonant('소', VA, ['p', 'f']),
    '-소다': afterConsonant('소다', VA, ['p', 'f']),
    '-(으)소서': eu('소서', VA),
    '-소이까': afterConsonant('소이까', VAI, ['p', 'f']),
    '-소이다': afterConsonant('소이다', VA, ['p', 'f']),
    '-쇠다': afterConsonant('쇠다', VA, ['p', 'f']),
    '-(스)ㅂ네': seup('네'),
    '-(스)ㅂ늰다': seup('늰다'),
    '-(스)ㅂ니까': seup('니까'),
    '-(스)ㅂ니다': seup('니다'),
    '-(스)ㅂ디까': seup('디까'),
    '-(스)ㅂ디다': seup('디다'),
    '-(스)ㅂ딘다': seup('딘다'),
    '-(스)ㅂ죠': seup('죠'),
    '-(스)ㅂ지요': seup('지요'),
    '-(으)시': chain(['eusi'], eu('시', VAI, ['saob', 'euob', 'jaob'])),
    '-(으)시압': eu('시압', V),
    '-(으)시어요': eu('시어요', VAI),
    '-(으)십사': eu('십사', V),
    '-(으)십시다': eu('십시다', V),
    '-(으)십시오': eu('십시오', V),
    '-아/어': aeo('', {contracted: false, prefinals: ['p', 'f'], honorific: true}),
    '-아/어다': aeo('다', {contracted: false, prefinals: ['p', 'f']}),
    '-아/어다가': aeo('다가', {prefinals: ['p', 'f']}),
    '-아/어도': aeo('도', {prefinals: ['p', 'f'], honorific: true}),
    '-아/어라': aeo('라', {prefinals: ['p', 'f']}),
    '-아/어서': aeo('서', {prefinals: ['p', 'f'], honorific: true}),
    '-아/어선': aeo('선', {prefinals: ['p', 'f'], honorific: true}),
    '-아/어야': aeo('야', {prefinals: ['p', 'f'], honorific: true}),
    '-아/어야겠': chain(['f'], aeo('야겠', {honorific: true})),
    '-아/어야만': aeo('야만', {prefinals: ['p', 'f'], honorific: true}),
    '-아/어야지': aeo('야지', {prefinals: ['p', 'f'], honorific: true}),
    '-아/어요': [...aeo('요', {prefinals: ['p', 'f']}), suffix('에요', '다', [], AI), suffix('예요', '이다', [], AI)],
    '-아/어지이다': aeo('지이다', {prefinals: ['p', 'f']}),
    '-아/어지다': chain(['v'], aeo('지다', {ida: false, prefinals: ['p', 'f']})),
    '-았/었': chain(['p'], aeo('ㅆ', {honorific: true})),
    '-았/었었': chain(['p'], aeo('ㅆ었', {honorific: true})),
    '-았/었자': aeo('ㅆ자', {honorific: true}),
    '-야': [suffix('아니야', '아니다', [], A), suffix('이야', '이다', [], I)],
    '-언마는': [suffix('아니언마는', '아니다', [], A), suffix('이언마는', '이다', [], I), suffix('언마는', '', [], ['eusi'])],
    '-언만': plain('언만', VAI, ['p', 'f', 'eusi']),
    '-언정': [suffix('아니언정', '아니다', [], A), suffix('이언정', '이다', [], I), suffix('언정', '', [], ['eusi'])],
    '-에라': [suffix('에라', '', [], ['p'])],
    '-(으)오': chain(['euo'], eu('오', VA, ['eusi'], ['p', 'f'])),
    '-(으)오니까': eu('오니까', VA, ['eusi'], ['p', 'f']),
    '-(으)오리이까': eu('오리이까', VA, ['eusi']),
    '-(으)오리이다': eu('오리이다', VA, ['eusi']),
    '-오이까': plain('오이까', VAI, ['eusi']),
    '-(으)오이다': eu('오이다', VA, ['eusi'], ['p', 'f']),
    '-올습니다': [suffix('아니올습니다', '아니다', [], A), suffix('이올습니다', '이다', [], I)],
    '-올시다': [suffix('아니올시다', '아니다', [], A), suffix('이올시다', '이다', [], I)],
    '-(으)옵': chain(['euob'], eu('옵', VAI, ['eusi'], ['p', 'f'])),
    '-(으)옵니까': eu('옵니까', VAI, ['eusi'], ['p', 'f']),
    '-(으)옵니다': eu('옵니다', VAI, ['eusi'], ['p', 'f']),
    '-(으)옵디까': eu('옵디까', VAI, ['eusi'], ['p', 'f']),
    '-(으)옵디다': eu('옵디다', VAI, ['eusi'], ['p', 'f']),
    '-(으)옵소서': eu('옵소서', VAI, ['eusi'], ['p', 'f']),
    '-(으)와': eu('와', VAI, ['eusi', 'euo', 'jao'], ['p', 'f']),
    '-(으)외다': eu('외다', VAI, ['eusi'], ['p', 'f']),
    '-요': copula('요'),
    '-(으)우': [...eu('우', VAI, ['eusi'], ['p', 'f']), suffix('우', 'ㄹ다', [], VA)],
    '-(으)이': [suffix('이', '다', [], A), suffix('이', 'ㄹ다', [], A), suffix('으이', '다', [], A), suffix('우이', 'ㅂ다', [], A)],
    '-(으)ㄴ들': eu('ㄴ들', VAI, ['eusi']),
    '-(으)ㄴ즉': eu('ㄴ즉', VAI, ['eusi'], ['p']),
    '-(으)ㄴ즉슨': eu('ㄴ즉슨', VAI, ['eusi'], ['p']),
    '-(으)ㄹ까': eu('ㄹ까', VAI, ['eusi'], ['p']),
    '-(으)ㄹ깝쇼': eu('ㄹ깝쇼', VAI, ['eusi'], ['p']),
    '-(으)ㄹ꼬': eu('ㄹ꼬', VAI, ['eusi'], ['p']),
    '-(으)ㄹ는지': eu('ㄹ는지', VAI, ['eusi'], ['p']),
    '-(으)ㄹ데라니': eu('ㄹ데라니', A, ['eusi']),
    '-(으)ㄹ라': eu('ㄹ라', VAI, ['eusi'], ['p']),
    '-(으)ㄹ라고': eu('ㄹ라고', VAI, ['eusi'], ['p']),
    '-(으)ㄹ라치면': eu('ㄹ라치면', V, ['eusi']),
    '-(으)ㄹ락': eu('ㄹ락 말락', V, ['eusi'], ['p']),
    '-(으)ㄹ래': eu('ㄹ래', V, ['eusi']),
    '-(으)ㄹ러니': eu('ㄹ러니', VAI, ['eusi'], ['p']),
    '-(으)ㄹ러라': eu('ㄹ러라', VAI, ['eusi'], ['p']),
    '-(으)ㄹ런가': eu('ㄹ런가', VAI, ['eusi'], ['p']),
    '-(으)ㄹ런고': eu('ㄹ런고', VAI, ['eusi'], ['p']),
    '-(으)ㄹ런지': eu('ㄹ런지', VAI, ['eusi'], ['p']),
    '-(으)ㄹ레': eu('ㄹ레', VAI, ['eusi'], ['p']),
    '-(으)ㄹ레라': eu('ㄹ레라', VAI, ['eusi'], ['p']),
    '-(으)ㄹ려고': eu('ㄹ려고', V, ['eusi']),
    '-(으)ㄹ망정': eu('ㄹ망정', VAI, ['eusi'], ['p']),
    '-(으)ㄹ밖에': eu('ㄹ밖에', VAI, ['eusi'], ['p']),
    '-(으)ㄹ뿐더러': eu('ㄹ뿐더러', VAI, ['eusi'], ['p']),
    '-(으)ㄹ사': eu('ㄹ사', A),
    '-(으)ㄹ새': eu('ㄹ새', VAI, ['eusi'], ['p']),
    '-(으)ㄹ세': eu('ㄹ세', VAI, ['eusi'], ['p']),
    '-(으)ㄹ세라': eu('ㄹ세라', VAI, ['eusi'], ['p']),
    '-(으)ㄹ세말이지': eu('ㄹ세말이지', VAI, ['eusi'], ['p']),
    '-(으)ㄹ소냐': eu('ㄹ소냐', VAI, ['eusi'], ['p']),
    '-(으)ㄹ손가': eu('ㄹ손가', VAI, ['eusi'], ['p']),
    '-(으)ㄹ수록': eu('ㄹ수록', VAI, ['eusi'], ['p']),
    '-(으)ㄹ시': eu('ㄹ시', VAI, ['eusi'], ['p']),
    '-(으)ㄹ시고': eu('ㄹ시고', AI, ['eusi'], ['p']),
    '-(으)ㄹ싸록': eu('ㄹ싸록', VAI, ['eusi'], ['p']),
    '-(으)ㄹ쏘냐': eu('ㄹ쏘냐', VAI, ['eusi'], ['p']),
    '-(으)ㄹ쏜가': eu('ㄹ쏜가', VAI, ['eusi'], ['p']),
    '-(으)ㄹ이만큼': eu('ㄹ이만큼', VAI, ['eusi', 'euo'], ['p']),
    '-(으)ㄹ작시면': eu('ㄹ작시면', V, ['eusi']),
    '-(으)ㄹ지': eu('ㄹ지', VAI, ['eusi'], ['p']),
    '-(으)ㄹ지나': eu('ㄹ지나', VAI, ['eusi'], ['p']),
    '-(으)ㄹ지니': eu('ㄹ지니', VAI, ['eusi'], ['p']),
    '-(으)ㄹ지니라': eu('ㄹ지니라', VAI, ['eusi'], ['p']),
    '-(으)ㄹ지라': eu('ㄹ지라', VAI, ['eusi'], ['p']),
    '-(으)ㄹ지라도': eu('ㄹ지라도', VAI, ['eusi'], ['p']),
    '-(으)ㄹ지로다': eu('ㄹ지로다', VAI, ['eusi'], ['p']),
    '-(으)ㄹ지며': eu('ㄹ지며', VAI, ['eusi'], ['p']),
    '-(으)ㄹ지어다': eu('ㄹ지어다', V, ['eusi']),
    '-(으)ㄹ지언정': eu('ㄹ지언정', VAI, ['eusi'], ['p']),
    '-(으)ㄹ진대': eu('ㄹ진대', VAI, ['eusi'], ['p']),
    '-(으)ㄹ진대는': eu('ㄹ진대는', VAI, ['eusi'], ['p']),
    '-(으)ㄹ진댄': eu('ㄹ진댄', VAI, ['eusi'], ['p']),
    '-(으)ㄹ진저': eu('ㄹ진저', VAI, ['eusi'], ['p']),
    '-(으)ㅁ': eu('ㅁ', VAI, ['eusi'], ['p', 'f']),
    '-(으)ㅁ세': eu('ㅁ세', V),
    '-(으)ㅁ도': eu('ㅁ도', VAI, ['eusi'], ['p', 'f']),
    '-(으)ㅁ에랴': eu('ㅁ에랴', VAI, ['eusi'], ['p', 'f']),
    '-(으)ㅂ쇼': eu('ㅂ쇼', V),
    '-(으)ㅂ시다': eu('ㅂ시다', V),
    '-(으)ㅂ시오': eu('ㅂ시오', V),
    '-자': plain('자', VI),
    '-자고': plain('자고', V),
    '-자구': plain('자구', V),
    '-자꾸나': plain('자꾸나', V),
    '-자느니': plain('자느니', V),
    '-자니까': plain('자니까', V),
    '-자마자': plain('자마자', V, ['eusi']),
    '-자며': plain('자며', V),
    '-자면': plain('자면', V),
    '-자면서': plain('자면서', V),
    '-자손': plain('자손', V),
    '-자오': chain(['jao'], plain('자오', V)),
    '-자옵': chain(['jaob'], plain('자옵', V)),
    '-잡': chain(['jab'], plain('잡', V)),
    '-잖': chain(['v', 'adj'], plain('잖다', VAI, ['p', 'f', 'eusi'])),
    '-죠': plain('죠', VAI, ['p', 'f', 'eusi']),
    '-지': plain('지', VAI, ['p', 'f', 'eusi']),
    '-지마는': plain('지마는', VAI, ['p', 'f', 'eusi']),
    '-지만': plain('지만', VAI, ['p', 'f', 'euo', 'euob', 'eusi']),
    '-지만서도': plain('지만서도', VAI, ['p', 'f', 'eusi']),
    '-지요': plain('지요', VAI, ['p', 'f', 'eusi']),
    '-진': plain('진', VAI, ['p', 'f', 'eusi']),
    '-질': plain('질', VAI, ['p', 'f', 'eusi']),
};

/** @type {import('language-transformer').LanguageTransformDescriptor<Condition>} */
export const koreanTransforms = {
    language: 'ko',
    conditions,
    transforms: {
        어간: {
            name: '어간',
            description: 'Stem',
            rules: [...stemFinals].map((final) => suffixInflection(final, final + 'ㄷㅏ', [], VA)),
        },
        ㄴ: {
            name: 'ㄴ',
            description: 'Contraction of the topic particle 는',
            rules: [
                contractedParticle('ㄴ', 1, ['pn']),
                contractedParticle('ㄴ', 3, ['n']),
            ],
        },
        ㄹ: {
            name: 'ㄹ',
            description: 'Contraction of the object particle 를',
            rules: [
                contractedParticle('ㄹ', 1, ['pn']),
                contractedParticle('ㄹ', 3, ['n']),
            ],
        },
        ...Object.fromEntries(Object.entries(endings).map(([name, rules]) => [name, {name, rules}])),
    },
};
