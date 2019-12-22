/*
 * Copyright (C) 2016-2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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


const jpHalfWidthCharacterMapping = new Map([
    ['ｦ', 'ヲヺ-'],
    ['ｧ', 'ァ--'],
    ['ｨ', 'ィ--'],
    ['ｩ', 'ゥ--'],
    ['ｪ', 'ェ--'],
    ['ｫ', 'ォ--'],
    ['ｬ', 'ャ--'],
    ['ｭ', 'ュ--'],
    ['ｮ', 'ョ--'],
    ['ｯ', 'ッ--'],
    ['ｰ', 'ー--'],
    ['ｱ', 'ア--'],
    ['ｲ', 'イ--'],
    ['ｳ', 'ウヴ-'],
    ['ｴ', 'エ--'],
    ['ｵ', 'オ--'],
    ['ｶ', 'カガ-'],
    ['ｷ', 'キギ-'],
    ['ｸ', 'クグ-'],
    ['ｹ', 'ケゲ-'],
    ['ｺ', 'コゴ-'],
    ['ｻ', 'サザ-'],
    ['ｼ', 'シジ-'],
    ['ｽ', 'スズ-'],
    ['ｾ', 'セゼ-'],
    ['ｿ', 'ソゾ-'],
    ['ﾀ', 'タダ-'],
    ['ﾁ', 'チヂ-'],
    ['ﾂ', 'ツヅ-'],
    ['ﾃ', 'テデ-'],
    ['ﾄ', 'トド-'],
    ['ﾅ', 'ナ--'],
    ['ﾆ', 'ニ--'],
    ['ﾇ', 'ヌ--'],
    ['ﾈ', 'ネ--'],
    ['ﾉ', 'ノ--'],
    ['ﾊ', 'ハバパ'],
    ['ﾋ', 'ヒビピ'],
    ['ﾌ', 'フブプ'],
    ['ﾍ', 'ヘベペ'],
    ['ﾎ', 'ホボポ'],
    ['ﾏ', 'マ--'],
    ['ﾐ', 'ミ--'],
    ['ﾑ', 'ム--'],
    ['ﾒ', 'メ--'],
    ['ﾓ', 'モ--'],
    ['ﾔ', 'ヤ--'],
    ['ﾕ', 'ユ--'],
    ['ﾖ', 'ヨ--'],
    ['ﾗ', 'ラ--'],
    ['ﾘ', 'リ--'],
    ['ﾙ', 'ル--'],
    ['ﾚ', 'レ--'],
    ['ﾛ', 'ロ--'],
    ['ﾜ', 'ワ--'],
    ['ﾝ', 'ン--']
]);

function jpIsKanji(c) {
    const code = c.charCodeAt(0);
    return (
        (code >= 0x4e00 && code < 0x9fb0) ||
        (code >= 0x3400 && code < 0x4dc0)
    );
}

function jpIsKana(c) {
    const code = c.charCodeAt(0);
    return (
        (code >= 0x3041 && code <= 0x3096) || // hiragana
        (code >= 0x30a1 && code <= 0x30fc) // katakana
    );
}

function jpIsJapaneseText(text) {
    for (const c of text) {
        if (jpIsKanji(c) || jpIsKana(c)) {
            return true;
        }
    }
    return false;
}

function jpKatakanaToHiragana(text) {
    let result = '';
    for (const c of text) {
        if (wanakana.isKatakana(c)) {
            result += wanakana.toHiragana(c);
        } else {
            result += c;
        }
    }

    return result;
}

function jpHiraganaToKatakana(text) {
    let result = '';
    for (const c of text) {
        if (wanakana.isHiragana(c)) {
            result += wanakana.toKatakana(c);
        } else {
            result += c;
        }
    }

    return result;
}

function jpToRomaji(text) {
    return wanakana.toRomaji(text);
}

function jpConvertReading(expressionFragment, readingFragment, readingMode) {
    switch (readingMode) {
        case 'hiragana':
            return jpKatakanaToHiragana(readingFragment || '');
        case 'katakana':
            return jpHiraganaToKatakana(readingFragment || '');
        case 'romaji':
            if (readingFragment) {
                return jpToRomaji(readingFragment);
            } else {
                if (jpIsKana(expressionFragment)) {
                    return jpToRomaji(expressionFragment);
                }
            }
            return readingFragment;
        default:
            return readingFragment;
    }
}

function jpDistributeFurigana(expression, reading) {
    const fallback = [{furigana: reading, text: expression}];
    if (!reading) {
        return fallback;
    }

    let isAmbiguous = false;
    const segmentize = (reading, groups) => {
        if (groups.length === 0 || isAmbiguous) {
            return [];
        }

        const group = groups[0];
        if (group.mode === 'kana') {
            if (jpKatakanaToHiragana(reading).startsWith(jpKatakanaToHiragana(group.text))) {
                const readingLeft = reading.substring(group.text.length);
                const segs = segmentize(readingLeft, groups.splice(1));
                if (segs) {
                    return [{text: group.text}].concat(segs);
                }
            }
        } else {
            let foundSegments = null;
            for (let i = reading.length; i >= group.text.length; --i) {
                const readingUsed = reading.substring(0, i);
                const readingLeft = reading.substring(i);
                const segs = segmentize(readingLeft, groups.slice(1));
                if (segs) {
                    if (foundSegments !== null) {
                        // more than one way to segmentize the tail, mark as ambiguous
                        isAmbiguous = true;
                        return null;
                    }
                    foundSegments = [{text: group.text, furigana: readingUsed}].concat(segs);
                }
                // there is only one way to segmentize the last non-kana group
                if (groups.length === 1) {
                    break;
                }
            }
            return foundSegments;
        }
    };

    const groups = [];
    let modePrev = null;
    for (const c of expression) {
        const modeCurr = jpIsKanji(c) || c.charCodeAt(0) === 0x3005 /* noma */ ? 'kanji' : 'kana';
        if (modeCurr === modePrev) {
            groups[groups.length - 1].text += c;
        } else {
            groups.push({mode: modeCurr, text: c});
            modePrev = modeCurr;
        }
    }

    const segments = segmentize(reading, groups);
    if (segments && !isAmbiguous) {
        return segments;
    }
    return fallback;
}

function jpDistributeFuriganaInflected(expression, reading, source) {
    const output = [];

    let stemLength = 0;
    const shortest = Math.min(source.length, expression.length);
    const sourceHiragana = jpKatakanaToHiragana(source);
    const expressionHiragana = jpKatakanaToHiragana(expression);
    while (stemLength < shortest && sourceHiragana[stemLength] === expressionHiragana[stemLength]) {
        ++stemLength;
    }
    const offset = source.length - stemLength;

    const stemExpression = source.substring(0, source.length - offset);
    const stemReading = reading.substring(
        0,
        offset === 0 ? reading.length : reading.length - expression.length + stemLength
    );
    for (const segment of jpDistributeFurigana(stemExpression, stemReading)) {
        output.push(segment);
    }

    if (stemLength !== source.length) {
        output.push({text: source.substring(stemLength)});
    }

    return output;
}

function jpConvertHalfWidthKanaToFullWidth(text, sourceMapping) {
    let result = '';
    const ii = text.length;
    const hasSourceMapping = Array.isArray(sourceMapping);

    for (let i = 0; i < ii; ++i) {
        const c = text[i];
        const mapping = jpHalfWidthCharacterMapping.get(c);
        if (typeof mapping !== 'string') {
            result += c;
            continue;
        }

        let index = 0;
        switch (text.charCodeAt(i + 1)) {
            case 0xff9e: // dakuten
                index = 1;
                break;
            case 0xff9f: // handakuten
                index = 2;
                break;
        }

        let c2 = mapping[index];
        if (index > 0) {
            if (c2 === '-') { // invalid
                index = 0;
                c2 = mapping[0];
            } else {
                ++i;
            }
        }

        if (hasSourceMapping && index > 0) {
            index = result.length;
            const v = sourceMapping.splice(index + 1, 1)[0];
            sourceMapping[index] += v;
        }
        result += c2;
    }

    return result;
}

function jpConvertNumericTofullWidth(text) {
    let result = '';
    for (let i = 0, ii = text.length; i < ii; ++i) {
        let c = text.charCodeAt(i);
        if (c >= 0x30 && c <= 0x39) { // ['0', '9']
            c += 0xff10 - 0x30; // 0xff10 = '0' full width
            result += String.fromCharCode(c);
        } else {
            result += text[i];
        }
    }
    return result;
}

function jpConvertAlphabeticToKana(text, sourceMapping) {
    let part = '';
    let result = '';
    const ii = text.length;

    if (sourceMapping.length === ii) {
        sourceMapping.length = ii;
        sourceMapping.fill(1);
    }

    for (let i = 0; i < ii; ++i) {
        let c = text.charCodeAt(i);
        if (c >= 0x41 && c <= 0x5a) { // ['A', 'Z']
            c -= 0x41;
        } else if (c >= 0x61 && c <= 0x7a) { // ['a', 'z']
            c -= 0x61;
        } else if (c >= 0xff21 && c <= 0xff3a) { // ['A', 'Z'] full width
            c -= 0xff21;
        } else if (c >= 0xff41 && c <= 0xff5a) { // ['a', 'z'] full width
            c -= 0xff41;
        } else {
            if (part.length > 0) {
                result += jpToHiragana(part, sourceMapping, result.length);
                part = '';
            }
            result += text[i];
            continue;
        }
        part += String.fromCharCode(c + 0x61); // + 'a'
    }

    if (part.length > 0) {
        result += jpToHiragana(part, sourceMapping, result.length);
    }
    return result;
}

function jpToHiragana(text, sourceMapping, sourceMappingStart) {
    const result = wanakana.toHiragana(text);

    // Generate source mapping
    if (Array.isArray(sourceMapping)) {
        if (typeof sourceMappingStart !== 'number') { sourceMappingStart = 0; }
        let i = 0;
        let resultPos = 0;
        const ii = text.length;
        while (i < ii) {
            // Find smallest matching substring
            let iNext = i + 1;
            let resultPosNext = result.length;
            while (iNext < ii) {
                const t = wanakana.toHiragana(text.substring(0, iNext));
                if (t === result.substring(0, t.length)) {
                    resultPosNext = t.length;
                    break;
                }
                ++iNext;
            }

            // Merge characters
            const removals = iNext - i - 1;
            if (removals > 0) {
                let sum = 0;
                const vs = sourceMapping.splice(sourceMappingStart + 1, removals);
                for (const v of vs) { sum += v; }
                sourceMapping[sourceMappingStart] += sum;
            }
            ++sourceMappingStart;

            // Empty elements
            const additions = resultPosNext - resultPos - 1;
            for (let j = 0; j < additions; ++j) {
                sourceMapping.splice(sourceMappingStart, 0, 0);
                ++sourceMappingStart;
            }

            i = iNext;
            resultPos = resultPosNext;
        }
    }

    return result;
}
