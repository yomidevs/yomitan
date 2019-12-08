/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


function jpIsKanji(c) {
    const code = c.charCodeAt(0);
    return code >= 0x4e00 && code < 0x9fb0 || code >= 0x3400 && code < 0x4dc0;
}

function jpIsKana(c) {
    return wanakana.isKana(c);
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
