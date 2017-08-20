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

function distributeFurigana(word, reading) { 
    reading = reading || wanakana.toHiragana(word); 
    function span(str, pred) { 
        let i = 0; 
        while (i < str.length && pred(str[i])) { 
            i++; 
        } 
        return [str.substring(0, i), str.substring(i)]; 
    } 
    const isKanji = c => jpIsKanji(c) || 
        c == "\u3005"; /* kurikaeshi */ 
    const isKana = c => jpIsKana(c) || 
        c == "\u30fc"; /* chouonpu */ 
    function parse(word) { 
        const res = []; 
        while (word.length > 0) { 
            const c = word.charAt(0); 
            if (isKana(c)) { 
                const [text, rest] = span(word, isKana); 
                res.push({ type: "kana", text }); 
                word = rest; 
            } else if (isKanji(c)) { 
                const [text, rest] = span(word, isKanji); 
                res.push({ type: "kanji", text }); 
                word = rest; 
            } else return null; 
        } 
        return res; 
    } 
 
    let fallback = () => [{ text: word, furigana: reading }]; 
    let parts = parse(word); 
    if (parts == null) return fallback(); 
    let parti = 0; 
    let readingi = 0; 
    let res = []; 
    let current = null; 
    function backtrack() { 
        parti--; 
        const prev = res.pop(); 
        current = prev.furigana; 
    } 
    while (parti < parts.length) { 
        const part = parts[parti]; 
        switch (part.type) { 
            case 'kana': 
                if (reading.startsWith(wanakana.toHiragana(part.text), readingi)) { 
                    if (parti == parts.length - 1 && readingi != reading.length - part.text.length) { 
                        backtrack(); 
                    } else { 
                        readingi += part.text.length; 
                        res.push({ text: part.text }); 
                        parti++; 
                    } 
                } else backtrack(); 
                break; 
            case "kanji": 
                current = current || ""; 
                if (parti == parts.length - 1) { 
                    // last part, consume all 
                    current += reading.substring(readingi); 
                } else { 
                    const nextText = parts[parti + 1].text; 
                    let end = reading.indexOf(nextText, readingi + 1); // consume at least one character 
                    if (end == -1) { 
                        return fallback(); 
                    } 
                    current += reading.substring(readingi, end); 
                    readingi = end; 
                } 
                res.push({ text: part.text, furigana: current }); 
                current = null; 
                parti++; 
        } 
    } 
    return res;
} 
