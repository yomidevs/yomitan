/*
 * Copyright (C) 2024  Yomitan Authors
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

const HANGUL_OFFSET = 0xAC00;

const CHO = [
    'ㄱ',
    'ㄲ',
    'ㄴ',
    'ㄷ',
    'ㄸ',
    'ㄹ',
    'ㅁ',
    'ㅂ',
    'ㅃ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅉ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ'
];

const JUNG = [
    'ㅏ',
    'ㅐ',
    'ㅑ',
    'ㅒ',
    'ㅓ',
    'ㅔ',
    'ㅕ',
    'ㅖ',
    'ㅗ',
    ['ㅗ', 'ㅏ'],
    ['ㅗ', 'ㅐ'],
    ['ㅗ', 'ㅣ'],
    'ㅛ',
    'ㅜ',
    ['ㅜ', 'ㅓ'],
    ['ㅜ', 'ㅔ'],
    ['ㅜ', 'ㅣ'],
    'ㅠ',
    'ㅡ',
    ['ㅡ', 'ㅣ'],
    'ㅣ'
];

const JONG = [
    '',
    'ㄱ',
    'ㄲ',
    ['ㄱ', 'ㅅ'],
    'ㄴ',
    ['ㄴ', 'ㅈ'],
    ['ㄴ', 'ㅎ'],
    'ㄷ',
    'ㄹ',
    ['ㄹ', 'ㄱ'],
    ['ㄹ', 'ㅁ'],
    ['ㄹ', 'ㅂ'],
    ['ㄹ', 'ㅅ'],
    ['ㄹ', 'ㅌ'],
    ['ㄹ', 'ㅍ'],
    ['ㄹ', 'ㅎ'],
    'ㅁ',
    'ㅂ',
    ['ㅂ', 'ㅅ'],
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ'
];

const CONSONANTS = [
    'ㄱ',
    'ㄲ',
    'ㄳ',
    'ㄴ',
    'ㄵ',
    'ㄶ',
    'ㄷ',
    'ㄸ',
    'ㄹ',
    'ㄺ',
    'ㄻ',
    'ㄼ',
    'ㄽ',
    'ㄾ',
    'ㄿ',
    'ㅀ',
    'ㅁ',
    'ㅂ',
    'ㅃ',
    'ㅄ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅉ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ'
];

const COMPLETE_CHO = [
    'ㄱ',
    'ㄲ',
    'ㄴ',
    'ㄷ',
    'ㄸ',
    'ㄹ',
    'ㅁ',
    'ㅂ',
    'ㅃ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅉ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ'
];

const COMPLETE_JUNG = [
    'ㅏ',
    'ㅐ',
    'ㅑ',
    'ㅒ',
    'ㅓ',
    'ㅔ',
    'ㅕ',
    'ㅖ',
    'ㅗ',
    'ㅘ',
    'ㅙ',
    'ㅚ',
    'ㅛ',
    'ㅜ',
    'ㅝ',
    'ㅞ',
    'ㅟ',
    'ㅠ',
    'ㅡ',
    'ㅢ',
    'ㅣ'
];

const COMPLETE_JONG = [
    '',
    'ㄱ',
    'ㄲ',
    'ㄳ',
    'ㄴ',
    'ㄵ',
    'ㄶ',
    'ㄷ',
    'ㄹ',
    'ㄺ',
    'ㄻ',
    'ㄼ',
    'ㄽ',
    'ㄾ',
    'ㄿ',
    'ㅀ',
    'ㅁ',
    'ㅂ',
    'ㅄ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ'
];

const COMPLEX_CONSONANTS = [
    ['ㄱ', 'ㅅ', 'ㄳ'],
    ['ㄴ', 'ㅈ', 'ㄵ'],
    ['ㄴ', 'ㅎ', 'ㄶ'],
    ['ㄹ', 'ㄱ', 'ㄺ'],
    ['ㄹ', 'ㅁ', 'ㄻ'],
    ['ㄹ', 'ㅂ', 'ㄼ'],
    ['ㄹ', 'ㅅ', 'ㄽ'],
    ['ㄹ', 'ㅌ', 'ㄾ'],
    ['ㄹ', 'ㅍ', 'ㄿ'],
    ['ㄹ', 'ㅎ', 'ㅀ'],
    ['ㅂ', 'ㅅ', 'ㅄ']
];

const COMPLEX_VOWELS = [
    ['ㅗ', 'ㅏ', 'ㅘ'],
    ['ㅗ', 'ㅐ', 'ㅙ'],
    ['ㅗ', 'ㅣ', 'ㅚ'],
    ['ㅜ', 'ㅓ', 'ㅝ'],
    ['ㅜ', 'ㅔ', 'ㅞ'],
    ['ㅜ', 'ㅣ', 'ㅟ'],
    ['ㅡ', 'ㅣ', 'ㅢ']
];

const makeHash = (array) => {
    const hash = {0: 0};
    for (let i = 0; i < array.length; i++) {
        if (array[i]) {
            hash[array[i].charCodeAt(0)] = i;
        }
    }
    return hash;
};

const CONSONANTS_HASH = makeHash(CONSONANTS);

const CHO_HASH = makeHash(COMPLETE_CHO);

const JUNG_HASH = makeHash(COMPLETE_JUNG);

const JONG_HASH = makeHash(COMPLETE_JONG);

const makeComplexHash = (array) => {
    const hash = {};
    let code1, code2;
    for (let i = 0; i < array.length; i++) {
        code1 = array[i][0].charCodeAt(0);
        code2 = array[i][1].charCodeAt(0);
        if (typeof hash[code1] === 'undefined') {
            hash[code1] = {};
        }
        hash[code1][code2] = array[i][2].charCodeAt(0);
    }
    return hash;
};

const COMPLEX_CONSONANTS_HASH = makeComplexHash(COMPLEX_CONSONANTS);

const COMPLEX_VOWELS_HASH = makeComplexHash(COMPLEX_VOWELS);

/**
 * Checks if the given character is a Korean consonant.
 * @param {number} c The character to check.
 * @returns {boolean} True if the character is a Korean consonant, false otherwise.
 */
function isConsonant(c) {
    return typeof CONSONANTS_HASH[c] !== 'undefined';
}

/**
 * Checks if the given character is a Korean initial consonant (cho).
 * @param {number} c The character to check.
 * @returns {boolean} True if the character is a Korean initial consonant, false otherwise.
 */
function isCho(c) {
    return typeof CHO_HASH[c] !== 'undefined';
}

/**
 * Checks if the given character is a Korean vowel (jung).
 * @param {number} c The character to check.
 * @returns {boolean} True if the character is a Korean vowel, false otherwise.
 */
function isJung(c) {
    return typeof JUNG_HASH[c] !== 'undefined';
}

/**
 * Checks if the given character is a Korean final consonant (jong).
 * @param {number} c The character to check.
 * @returns {boolean} True if the character is a Korean final consonant, false otherwise.
 */
function isJong(c) {
    return typeof JONG_HASH[c] !== 'undefined';
}

/**
 * Checks if the given character code represents a Hangul character.
 * @param {number} charCode The character code to check.
 * @returns {boolean} True if the character code represents a Hangul character, false otherwise.
 */
function isHangul(charCode) {
    return HANGUL_OFFSET <= charCode && charCode <= 0xd7a3;
}

/**
 * Retrieves the indices of the initial consonant (cho), vowel (jung), and final consonant (jong)
 * that make up the given Hangul character code.
 * @param {number} charCode The character code of the Hangul character.
 * @returns {object} An object containing the indices of cho, jung, and jong.
 */
function getHangulIndices(charCode) {
    const baseCode = charCode - HANGUL_OFFSET;
    return {
        cho: Math.floor(baseCode / 588),
        jung: Math.floor((baseCode % 588) / 28),
        jong: baseCode % 28
    };
}

/**
 * Checks if the given characters 'a' and 'b' can be combined to form a complex vowel.
 * @param {number} a The character code of the first vowel.
 * @param {number} b The character code of the second vowel.
 * @returns {(number|boolean)} The character code of the combined complex vowel, or false if they cannot be combined.
 */
function isJungJoinable(a, b) {
    return (COMPLEX_VOWELS_HASH[a] && COMPLEX_VOWELS_HASH[a][b]) ? COMPLEX_VOWELS_HASH[a][b] : false;
}

/**
 * Checks if the given characters 'a' and 'b' can be combined to form a complex final consonant.
 * @param {number} a The character code of the first final consonant.
 * @param {number} b The character code of the second final consonant.
 * @returns {(number|boolean)} The character code of the combined complex final consonant, or false if they cannot be combined.
 */
function isJongJoinable(a, b) {
    return COMPLEX_CONSONANTS_HASH[a] && COMPLEX_CONSONANTS_HASH[a][b] ? COMPLEX_CONSONANTS_HASH[a][b] : false;
}

/**
 * Disassembles a given string into an array of individual Hangul characters or character components.
 * @param {string} string The string to be disassembled.
 * @param {boolean} [grouped=false] Whether to group the components of each Hangul character.
 * @returns {(string|string[])} An array of individual Hangul characters or character components, or a single string if `grouped` is false.
 * @throws {Error} If the input string is null.
 */
export const disassemble = (string, grouped = false) => {
    if (string === null) {
        throw new Error('Arguments cannot be null');
    }

    string = Array.isArray(string) ? string.join('') : string;

    const result = [];

    for (const character of string) {
        const charCode = character.charCodeAt(0);

        if (isHangul(charCode)) {
            const {cho, jung, jong} = getHangulIndices(charCode);

            const disassembled = [CHO[cho]];

            if (Array.isArray(JUNG[jung])) {
                disassembled.push(JUNG[jung].join('')); // eslint-disable-line @typescript-eslint/no-unsafe-argument
            } else {
                disassembled.push(JUNG[jung]);
            }

            if (JONG[jong]) {
                if (Array.isArray(JONG[jong])) {
                    disassembled.push(JONG[jong].join('')); // eslint-disable-line @typescript-eslint/no-unsafe-argument
                } else {
                    disassembled.push(JONG[jong]);
                }
            }

            if (grouped) {
                result.push(disassembled);
            } else {
                result.push(...disassembled);
            }
        } else if (isConsonant(charCode)) {
            if (isCho(charCode)) {
                result.push(CHO[CHO_HASH[charCode]]);
            } else {
                if (Array.isArray(JONG[JONG_HASH[charCode]])) {
                    result.push(JONG[JONG_HASH[charCode]].join(''));
                } else {
                    result.push(JONG[JONG_HASH[charCode]]);
                }
            }
        } else if (isJung(charCode)) {
            if (Array.isArray(JUNG[JUNG_HASH[charCode]])) {
                result.push(JUNG[JUNG_HASH[charCode]].join(''));
            } else {
                result.push(JUNG[JUNG_HASH[charCode]]);
            }
        } else {
            result.push(character);
        }
    }
    return grouped ? result : result.join('');
};

/**
 * Assembles an array of individual Hangul characters or character components into a single string.
 * @param {string} string The string containing individual Hangul characters or character components to be assembled.
 * @returns {string} The assembled string.
 * @throws {Error} If the input string is null.
 */
export const assemble = (string) => {
    if (string === null) {
        throw new Error('Arguments cannot be null');
    }

    const array = [...disassemble(string)];

    const result = [];

    let complete_index = -1,
        jong_joined = false;

    /**
     * Helper function to combine jamo into hangul
     * @param {number} index Index of a hangul
     */
    function makeHangul(index) {
        let cho,
            jung1,
            jung2,
            jong1 = 0,
            jong2,
            hangul = '';

        jong_joined = false;

        if (complete_index + 1 > index) {
            return;
        }

        for (let step = 1; ; step++) {
            // eslint-disable-next-line unicorn/prefer-switch
            if (step === 1) {
                cho = array[complete_index + step].charCodeAt(0);
                if (isJung(cho)) {
                    if (complete_index + step + 1 <= index && isJung(jung1 = array[complete_index + step + 1].charCodeAt(0))) {
                        result.push(String.fromCharCode(isJungJoinable(cho, jung1)));
                        complete_index = index;
                        return;
                    } else {
                        result.push(array[complete_index + step]);
                        complete_index = index;
                        return;
                    }
                } else if (!isCho(cho)) {
                    result.push(array[complete_index + step]);
                    complete_index = index;
                    return;
                }
                hangul = array[complete_index + step];
            } else if (step === 2) {
                jung1 = array[complete_index + step].charCodeAt(0);
                if (isCho(jung1)) {
                    result.push(String.fromCharCode(isJongJoinable(cho, jung1)));
                    complete_index = index;
                    return;
                } else {
                    hangul = String.fromCharCode((CHO_HASH[cho] * 21 + JUNG_HASH[jung1]) * 28 + HANGUL_OFFSET);
                }
            } else if (step === 3) {
                jung2 = array[complete_index + step].charCodeAt(0);
                if (isJungJoinable(jung1, jung2)) {
                    jung1 = isJungJoinable(jung1, jung2);
                } else {
                    jong1 = jung2;
                }
                hangul = String.fromCharCode((CHO_HASH[cho] * 21 + JUNG_HASH[jung1]) * 28 + JONG_HASH[jong1] + HANGUL_OFFSET); // eslint-disable-line @typescript-eslint/no-unsafe-argument
            } else if (step === 4) {
                jong2 = array[complete_index + step].charCodeAt(0);
                jong1 = isJongJoinable(jong1, jong2) ?? jong2;
                hangul = String.fromCharCode((CHO_HASH[cho] * 21 + JUNG_HASH[jung1]) * 28 + JONG_HASH[jong1] + HANGUL_OFFSET); // eslint-disable-line @typescript-eslint/no-unsafe-argument
            } else if (step === 5) {
                jong2 = array[complete_index + step].charCodeAt(0);
                jong1 = isJongJoinable(jong1, jong2);
                hangul = String.fromCharCode((CHO_HASH[cho] * 21 + JUNG_HASH[jung1]) * 28 + JONG_HASH[jong1] + HANGUL_OFFSET); // eslint-disable-line @typescript-eslint/no-unsafe-argument
            }
            if (complete_index + step >= index) {
                result.push(hangul);
                complete_index = index;
                return;
            }
        }
    }

    let index,
        stage = 0,
        previousCharCode;

    for (index = 0; index < array.length; index++) {
        const charCode = array[index].charCodeAt(0);

        if (!isCho(charCode) && !isJung(charCode) && !isJong(charCode)) {
            makeHangul(index - 1);
            makeHangul(index);
            stage = 0;
            continue;
        }

        // eslint-disable-next-line unicorn/prefer-switch
        if (stage === 0) {
            if (isCho(charCode)) {
                stage = 1;
            } else if (isJung(charCode)) {
                stage = 4;
            }
        } else if (stage === 1) {
            if (isJung(charCode)) {
                stage = 2;
            } else {
                if (isJongJoinable(previousCharCode, charCode)) {
                    stage = 5;
                } else {
                    makeHangul(index - 1);
                }
            }
        } else if (stage === 2) {
            if (isJong(charCode)) {
                stage = 3;
            } else if (isJung(charCode)) {
                if (!isJungJoinable(previousCharCode, charCode)) {
                    makeHangul(index - 1);
                    stage = 4;
                }
            } else {
                makeHangul(index - 1);
                stage = 1;
            }
        } else if (stage === 3) {
            if (isJong(charCode)) {
                if (!jong_joined && isJongJoinable(previousCharCode, charCode)) {
                    jong_joined = true;
                } else {
                    makeHangul(index - 1);
                    stage = 1;
                }
            } else if (isCho(charCode)) {
                makeHangul(index - 1);
                stage = 1;
            } else if (isJung(charCode)) {
                makeHangul(index - 2);
                stage = 2;
            }
        } else if (stage === 4) {
            if (isJung(charCode)) {
                if (isJungJoinable(previousCharCode, charCode)) {
                    makeHangul(index);
                    stage = 0;
                } else {
                    makeHangul(index - 1);
                }
            } else {
                makeHangul(index - 1);
                stage = 1;
            }
        } else if (stage === 5) {
            if (isJung(charCode)) {
                makeHangul(index - 2);
                stage = 2;
            } else {
                makeHangul(index - 1);
                stage = 1;
            }
        }
        previousCharCode = charCode;
    }
    makeHangul(index - 1);
    return result.join('');
};
