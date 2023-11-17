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

const {readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, createWriteStream, unlinkSync} = require('fs');
const date = require('date-and-time');
const now = new Date();

const {language_short, DEBUG_WORD, DICT_NAME} = process.env;

const currentDate = date.format(now, 'YYYY.MM.DD');

const lemmaDict = JSON.parse(readFileSync(`data/tidy/${language_short}-lemmas.json`));
const formDict = JSON.parse(readFileSync(`data/tidy/${language_short}-forms.json`));

// make folder if doesn't exist
if (!existsSync(`data/language/${language_short}`)) {
    mkdirSync(`data/language/${language_short}`, {recursive: true});
}
const ipaTags = existsSync(`data/language/${language_short}/tag_bank_ipa.json`)
  ? JSON.parse(readFileSync(`data/language/${language_short}/tag_bank_ipa.json`))
  : [];

const commonTermTags = existsSync('data/language/tag_bank_term.json')
  ? JSON.parse(readFileSync('data/language/tag_bank_term.json'))
  : [];

const languageTermTags = existsSync(`data/language/${language_short}/tag_bank_term.json`)
  ? JSON.parse(readFileSync(`data/language/${language_short}/tag_bank_term.json`))
  : [];

const termTags = [...commonTermTags, ...languageTermTags];

const yzk = {
    lemma: [],
    form: [],
    ipa: [],
    dict: []
};

const yzkTags = {
    ipa: {},
    dict: {}
};

const allPOS = new Set();
const skippedIpaTags = {};
const skippedTermTags = {};
const allInfo = Object.entries(lemmaDict);
let ipaCount = 0;
let taggedTermCount = 0;

for (const [lemma, infoMap] of allInfo) {
    function debug(word) {
        if (lemma === DEBUG_WORD) {
            console.log(word);
        }
    }

    const ipa = [];

    for (const [pos, info] of Object.entries(infoMap)) {
        allPOS.add(pos);

        const {glosses} = info;

        const lemmaTags = [pos, ...(info.tags || [])];
        ipa.push(...info.ipa);

        const entries = {};

        glosses.forEach((gloss) => {
            debug(gloss);
            if (typeof gloss !== 'string') { return; }

            function addGlossToEntries(joinedTags) {
                if (entries[joinedTags]) {
                    entries[joinedTags][5].push(gloss);
                } else {
                    entries[joinedTags] = [
                        lemma, // term
                        lemma, // reading
                        joinedTags, // definition_tags
                        pos, // rules
                        0, // frequency
                        [gloss], // definitions
                        0, // sequence
                        '', // term_tags
                        '', // lemma form (if non-lemma)
                        [] // inflection combinations (if non-lemma)
                    ];
                }
            }

            const regex = /^\(([^()]+)\) ?/;
            const parenthesesContent = gloss.match(regex)?.[1];

            if (parenthesesContent) { taggedTermCount++; }

            debug(parenthesesContent);

            const parenthesesTags = parenthesesContent
        ? parenthesesContent.replace(/ or /g, ', ').split(', ').filter(Boolean)
        : [];

            const unrecognizedTags = [];
            const recognizedTags = [];

            parenthesesTags.forEach((tag) => {
                tag = tag.replace(/chiefly /g, '');
                const fullTag = termTags.find((x) => x[3] === tag);
                if (fullTag){
                    recognizedTags.push(fullTag[0]);
                    yzkTags.dict[tag] = fullTag;
                } else {
                    unrecognizedTags.push(tag);
                    skippedTermTags[parenthesesContent] = (skippedTermTags[parenthesesContent] || 0) + 1;
                }
            });

            const leftoverTags = unrecognizedTags.length ? `(${unrecognizedTags.join(', ')}) ` : '';
            gloss = gloss.replace(regex, leftoverTags);

            addGlossToEntries([...lemmaTags, ...recognizedTags].join(' '));
        });

        debug(entries);
        for (const [tags, entry] of Object.entries(entries)) {
            yzk.lemma.push(entry);
        }
    }

    const mergedIpas = ipa.reduce((result, item) => {
        ipaCount++;
        item.tags = item.tags
            .map((tag) => {
                const fullTag = ipaTags.find((x) => x[3] === tag);
                if (fullTag){
                    yzkTags.ipa[tag] = fullTag;
                    return fullTag[0];
                } else {
                    skippedIpaTags[tag] = (skippedIpaTags[tag] || 0) + 1;
                }
            })
            .filter(Boolean);

        const existingIpa = result.find((x) => x.ipa === item.ipa);

        if (existingIpa) {
            existingIpa.tags = [...new Set([...existingIpa.tags, ...item.tags])];
        } else {
            result.push(item);
        }
        return result;
    }, []);

    if (mergedIpas.length) {
        yzk.ipa.push([
            lemma,
            'ipa',
            {
                reading: lemma,
                ipa: mergedIpas
            }
        ]);
    }
}

const multiwordInflections = [
    'subjunctive I', // de
    'subjunctive II', // de
    'Archaic form', // de
    'archaic form' // de
];

for (const [form, allInfo] of Object.entries(formDict)) {
    for (const [lemma, info] of Object.entries(allInfo)) {
        for (const [pos, glosses] of Object.entries(info)) {
            const inflectionHypotheses = glosses.flatMap((gloss) => {
                if (!gloss) { return []; }

                gloss = gloss
                    .replace(/-automated- /g, '')
                    .replace(/multiword-construction /g, '')
                    .replace(new RegExp(`of ${escapeRegExp(lemma)}.*$`), '');

                for (const multiwordInflection of multiwordInflections) {
                    gloss = gloss.replace(new RegExp(multiwordInflection), multiwordInflection.replace(' ', '-'));
                }

                const hypotheses = gloss
                    .split(' and ')
                    .filter(Boolean)
                    .map((hypothesis) =>
                        hypothesis.split(' ').filter(Boolean));

                return hypotheses;
            });

            uniqueHypotheses = [];

            for (const hypothesis of inflectionHypotheses) {
                const hypothesisStrings = uniqueHypotheses.map((hypothesis) => hypothesis.sort().join(' '));
                const hypothesisString = hypothesis.sort().join(' ');
                if (!hypothesisStrings.includes(hypothesisString)) {
                    uniqueHypotheses.push(hypothesis);
                }
            }

            yzk.form.push([
                form,
                '',
                'non-lemma',
                '',
                0,
                [''],
                0,
                '',
                lemma,
                uniqueHypotheses
            ]);
        }
    }
}

allPOS.forEach((pos) => {
    yzkTags.dict[pos] = [pos, 'partOfSpeech', -3, pos, 0];
});

['non-lemma', 'masculine', 'feminine', 'neuter'].forEach((tag) => {
    yzkTags.dict[tag] = [tag, '', -3, tag, 0];
});


yzk.dict = [...yzk.lemma, ...yzk.form];

const tempPath = 'data/temp';

const indexJson = {
    format: 4,
    revision: currentDate,
    sequenced: true
};

const folders = ['dict', 'ipa'];

for (const folder of folders) {
    for (const file of readdirSync(`${tempPath}/${folder}`)) {
        if (file.includes('term_')) { unlinkSync(`${tempPath}/${folder}/${file}`); }
    }

    writeFileSync(`${tempPath}/${folder}/index.json`, JSON.stringify({
        ...indexJson,
        title: `${DICT_NAME}-${folder}-${language_short}`
    }));

    writeFileSync(`${tempPath}/${folder}/tag_bank_1.json`, JSON.stringify(Object.values(yzkTags[folder])));

    const filename = folder === 'dict' ? 'term_bank_' : 'term_meta_bank_';

    writeInBatches(yzk[folder], `${folder}/${filename}`);
}

console.log('total ipas', ipaCount, 'skipped ipa tags', Object.values(skippedIpaTags).reduce((a, b) => a + b, 0));
writeFileSync(`data/language/${language_short}/skippedIpaTags.json`, JSON.stringify(sortBreakdown(skippedIpaTags), null, 2));

console.log('total tagged terms', taggedTermCount, 'skipped term tags', Object.values(skippedTermTags).reduce((a, b) => a + b, 0));
writeFileSync(`data/language/${language_short}/skippedTermTags.json`, JSON.stringify(sortBreakdown(skippedTermTags), null, 2));

console.log('5-make-yezichak.js: Done!');

function writeInBatches(inputArray, filenamePrefix, batchSize = 100000) {
    let bankIndex = 0;

    while (inputArray.length > 0) {
        const batch = inputArray.splice(0, batchSize);
        bankIndex += 1;
        const filename = `${tempPath}/${filenamePrefix}${bankIndex}.json`;
        const content = JSON.stringify(batch, null, 2);

        writeFileSync(filename, content);
    }
}

function escapeRegExp(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function sortBreakdown(obj){
    return Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]));
}