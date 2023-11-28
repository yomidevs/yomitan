/*
 * Copyright (C) 2023  Yezichak Authors
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
const {readFileSync, writeFileSync, existsSync} = require('fs');

const maxSentences = parseInt(process.env.MAX_SENTENCES);

const lang_short = process.env.language_short;

const lemmaDict = JSON.parse(readFileSync(`data/tidy/${lang_short}-lemmas.json`));
const formDict = JSON.parse(readFileSync(`data/tidy/${lang_short}-forms.json`));

const formPointer = {};

for (const [form, info] of Object.entries(formDict)) {
    const [lemma] = Object.entries(info)[0] || '';

    if (lemma && !formPointer[form]) {
        formPointer[form] = lemma;
    }
}

const nameDict = new Set();

for (const [lemma, info] of Object.entries(lemmaDict)) {
    if (Object.keys(info).length === 1 && info.name) {
        nameDict.add(lemma);
    }
}

const sentencesFile = `data/sentences/${lang_short}-sentences.json`;
const sentences = existsSync(sentencesFile)
  ? JSON.parse(readFileSync(sentencesFile))
  : [];

if (sentences.length === 0) {
    console.log(`No sentences found for ${lang_short}. Exiting...`);
    process.exit(1);
}

const freqList = new Map();
const missingList = new Map();
let totalWords = 0;
let missedWords = 0;
const sentenceLimit = maxSentences;

console.log('Parsing corpus...');

let index = 0;
const updateInterval = 1000; // Update progress and ETA every updateInterval sentences
const totalSentences = sentences.length;
const startTime = Date.now();
let progress = 0;

for (const sentence of sentences) {
    if (index % updateInterval === 0 || index === totalSentences) {
        const currentTime = Date.now();
        const elapsedTimeInSeconds = (currentTime - startTime) / 1000;
        progress = (index / totalSentences) * 100;
        const remainingSentences = totalSentences - index;
        const estimatedTotalTime = (elapsedTimeInSeconds / (index || 1)) * totalSentences;
        const estimatedRemainingTime = estimatedTotalTime - elapsedTimeInSeconds;

        process.stdout.clearLine();
        process.stdout.cursorTo(0); // Move the cursor to the beginning of the line
        process.stdout.write(
            `Progress: ${progress.toFixed(2)}% (${index.toLocaleString()} of ${totalSentences.toLocaleString()} sentences parsed), ETA: ${formatTime(estimatedRemainingTime)}, elapsed time: ${formatTime(elapsedTimeInSeconds)}`
        );
    }

    index++;

    if (index === sentenceLimit) {
        console.log(`(${sentenceLimit.toLocaleString()} sentence limit reached. moving on...)`);
        break;
    }

    const words = getWords(sentence);

    const customWords = getCustomWords(words);

    // console.log(customWords);

    for (const {word, surface} of customWords) {
        if (word !== '' && /\p{L}/u.test(word) && /\p{L}/u.test(surface) && !nameDict.has(word)) {
            totalWords++;
            freqList.set(word, (freqList.get(word) || 0) + 1);
        }

        if (word === '' && /\p{L}/u.test(surface)) {
            missingList.set(surface, (missingList.get(surface) || 0) + 1);
            missedWords++;
        }
    }
}

console.log('Done parsing.');

const freqArr = [];

for (const [word, count] of freqList) {
    freqArr.push({word, count});
}

freqArr.sort((a, b) => b.count - a.count);

const nineFive = [];
const nineEight = [];
const nineNine = [];
const thousand = {};

let percSoFar = 0.0;

for (const {word, count} of freqArr) {
    percSoFar += count / totalWords;

    if (0.95 >= percSoFar) {
        nineFive.push(word);
    }

    if (0.98 >= percSoFar) {
        nineEight.push(word);
    }

    if (0.99 >= percSoFar) {
        nineNine.push(word);
    }

    if (nineFive.length === 1000) {
        thousand.words = [...nineFive];
        thousand.coverage = `${+(percSoFar * 100).toFixed(2)}%`;
    }
}

const message = `
Your corpus is made up of ${totalWords.toLocaleString()} words.
The 1000 most common words cover ${thousand.coverage}.
${nineFive.length} words cover 95%.
${nineEight.length} words cover 98%.
${nineNine.length} words cover 99%.

Frequency list contains ${freqArr.length.toLocaleString()} unique word(s).

${(totalWords / (totalWords + missedWords) * 100).toFixed(2)}% of words were able to find a definition.
`;

console.log(message);

const frequencies = {
    'nine-five': nineFive,
    'nine-eight': nineEight,
    'nine-nine': nineNine,
    '1k': thousand,
    'hundred': freqArr,
    'missing': mapToSortedObj(missingList)
};

frequencies[`${lang_short}-freq`] = mapToSortedObj(freqList);

for (const [file, data] of Object.entries(frequencies)) {
    writeFileSync(`data/freq/${file}.json`, JSON.stringify(data));
}

writeFileSync('data/freq/info.txt', message);

function getWords(sentence) {
    return sentence.replace(/^-/, '- ').split(/(?=\s)|(?<=\s)|(?=[.,!?—\]\[\)":¡¿…])|(?<=[.,!?—\]\[\(":¡¿…])/g)
        .map((word) => {
            if (/[.,!?:"]|\s/.test(word)) {
                return {word, lemma: word};
            }

            for (const text of [word, word.toLowerCase(), toCapitalCase(word)]) {
                if (formPointer[text]) {
                    return {word, lemma: formPointer[text]};
                }

                if (lemmaDict[text]) {
                    return {word, lemma: text};
                }
            }

            return {word, lemma: word};
        });
}

function getCustomWords(words) {
    const customWordList = [];

    const outer = [...words];

    while (outer.length > 0) {
        const inner = [...outer];

        let matches = 0;
        while (inner.length > 0) {
            const lemmaText = getLemmaText(inner);
            const surfaceText = getSurfaceText(inner);

            let targetText = '';

            const surfaceTextEntries = [surfaceText, surfaceText.toLowerCase(), toCapitalCase(surfaceText)];
            const lemmaTextEntries = [lemmaText, lemmaText.toLowerCase(), toCapitalCase(lemmaText)];

            for (const text of [...surfaceTextEntries, lemmaTextEntries]) {
                if (!targetText) {
                    if (lemmaDict[text]) { targetText = text; }
                }
            }

            if (!targetText) {
                for (const text of surfaceTextEntries) {
                    if (!targetText) {
                        if (formPointer[text]) { targetText = formPointer[text]; }
                    }
                }
            }

            if (targetText !== '') {
                customWordList.push({word: targetText, surface: surfaceText});
                matches = inner.length;
                inner.splice(0, inner.length);
            }

            inner.pop();
        }
        if (matches === 0) {
            const [missing] = [...outer];

            const {word} = missing;

            customWordList.push({word: '', surface: word});
            outer.shift();
        } else { outer.splice(0, matches); }
    }

    return customWordList;
}

function toCapitalCase(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function getLemmaText(input) {
    return input.reduce((output, entry) => output + entry.lemma, '');
}

function getSurfaceText(input) {
    return input.reduce((output, entry) => output + entry.word, '');
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = (seconds % 60).toFixed(0);
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

function mapToSortedObj(map) {
    const mapEntries = Array.from(map);

    mapEntries.sort((a, b) => b[1] - a[1]);
    const sortedObject = {};
    mapEntries.forEach(([key, value]) => {
        sortedObject[key] = value;
    });
    return sortedObject;
}