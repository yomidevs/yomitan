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
const {writeFileSync} = require('fs');

const LineByLineReader = require('line-by-line');

const {language_short, DEBUG_WORD, filename} = process.env;

const lr = new LineByLineReader(`data/kaikki/${filename}`);

const lemmaDict = {};
const formDict = {};

const formStuff = [];
const automatedForms = {};

const blacklistedTags = [
    'inflection-template',
    'table-tags',
    'nominative',
    'canonical',
    'class',
    'error-unknown-tag',
    'error-unrecognized-form',
    'infinitive',
    'includes-article',
    'obsolete',
    'archaic',
    'used-in-the-form'
];

const uniqueTags = [];

lr.on('line', (line) => {
    if (line) {
        const {word, pos, senses, sounds = [], forms} = JSON.parse(line);

        if (forms) {
            for (const {form, tags} of forms) {
                if (form && tags && !tags.some((value) => blacklistedTags.includes(value))) {
                    for (const tag of tags) {
                        if (!uniqueTags.includes(tag)) {
                            uniqueTags.push(tag);
                        }
                    }
                    automatedForms[form] ??= {};
                    automatedForms[form][word] ??= {};
                    automatedForms[form][word][pos] ??= [];

                    automatedForms[form][word][pos].push(tags.join(' '));
                }
            }
        }

        const ipa = sounds
            .filter((sound) => sound?.ipa)
            .map((sound) => {
                if (DEBUG_WORD === word) { console.log(sound); }
                return {
                    ipa: sound.ipa,
                    tags: sound.tags || []
                };
            });

        let nestedGlossObj = {};

        let senseIndex = 0;
        for (const sense of senses) {
            const {raw_glosses, form_of, tags} = sense;

            const glosses = raw_glosses || sense.glosses;

            if (glosses && glosses.length > 0) {
                if (form_of) {
                    formStuff.push([word, sense, pos]);
                } else {
                    if (!JSON.stringify(glosses).includes('inflection of ')) {
                        lemmaDict[word] ??= {};
                        lemmaDict[word][pos] ??= {};

                        lemmaDict[word][pos].ipa ??= ipa;
                        lemmaDict[word][pos].senses ??= [];

                        const currSense = {
                            'glosses': [],
                            'tags': tags || []
                        };

                        if (glosses.length > 1) {
                            let nestedObj = nestedGlossObj;
                            for (const level of glosses) {
                                nestedObj[level] = nestedObj[level] || {};
                                nestedObj = nestedObj[level];
                            }

                            if (senseIndex === senses.length - 1) {
                                if (Object.keys(nestedGlossObj).length > 0) {
                                    handleNest(nestedGlossObj, currSense);
                                    nestedGlossObj = {};
                                }
                            }
                        } else if (glosses.length === 1) {
                            if (Object.keys(nestedGlossObj).length > 0) {
                                handleNest(nestedGlossObj, currSense);
                                nestedGlossObj = {};
                            }

                            const [gloss] = glosses;

                            if (!JSON.stringify(currSense.glosses).includes(gloss)) {
                                currSense.glosses.push(gloss);
                            }
                        }

                        if (currSense.glosses.length > 0){
                            lemmaDict[word][pos].senses.push(currSense);
                        }
                    }

                    if (JSON.stringify(glosses).includes('inflection of ')) {
                        const lemma = sense.glosses[0]
                            .replace(/.+(?=inflection of)/, '')
                            .replace(/ \(.+?\)/, '')
                            .replace(/:$/, '')
                            .replace(/:\\n.+/, '')
                            .replace('inflection of ', '')
                            .replace(/:.+/s, '')
                            .trim();

                        const inflection = sense.glosses[1];

                        if (inflection && !inflection.includes('inflection of ') && word !== lemma) {
                            formDict[word] ??= {};
                            formDict[word][lemma] ??= {};
                            formDict[word][lemma][pos] ??= [];

                            formDict[word][lemma][pos].push(inflection);
                        }
                    }
                }
            }
            senseIndex += 1;
        }
    }
});

lr.on('end', () => {
    for (const [form, info, pos] of formStuff) {
        const {glosses, form_of} = info;
        const lemma = form_of[0].word;

        if (form !== lemma) {
            formDict[form] ??= {};
            formDict[form][lemma] ??= {};
            formDict[form][lemma][pos] ??= [];

            // handle nested form glosses
            const formInfo = !glosses[0].includes('##') ? glosses[0] : glosses[1];

            formDict[form][lemma][pos].push(formInfo);
        }
    }

    let missingForms = 0;

    for (const [form, info] of Object.entries(automatedForms)) {
        if (!formDict[form]) {
            missingForms += 1;

            // limit forms that point to too many lemmas
            if (Object.keys(info).length < 5) {
                for (const [lemma, parts] of Object.entries(info)) {
                    for (const [pos, glosses] of Object.entries(parts)) {
                        if (form !== lemma) {
                            formDict[form] ??= {};
                            formDict[form][lemma] ??= {};
                            formDict[form][lemma][pos] ??= [];

                            const modifiedGlosses = glosses.map((gloss) => `-automated- ${gloss}`);
                            formDict[form][lemma][pos].push(...modifiedGlosses);
                        }
                    }
                }
            }
        }
    }

    console.log(`There were ${missingForms.toLocaleString()} missing forms that have now been automatically populated.`);

    writeFileSync(`data/tidy/${language_short}-lemmas.json`, JSON.stringify(lemmaDict));
    writeFileSync(`data/tidy/${language_short}-forms.json`, JSON.stringify(formDict));


    console.log('2-tidy-up.js finished.');
});

function handleLevel(nest, level) {
    const nestDefs = [];
    let defIndex = 0;

    for (const [def, children] of Object.entries(nest)) {
        defIndex += 1;

        if (Object.keys(children).length > 0) {
            const nextLevel = level + 1;
            const childDefs = handleLevel(children, nextLevel);

            const listType = level === 1 ? 'li' : 'number';
            const content = level === 1 ? def : [{'tag': 'span', 'data': {'listType': 'number'}, 'content': `${defIndex}. `}, def];

            nestDefs.push([{'tag': 'div', 'data': {'listType': listType}, 'content': content}, {'tag': 'div', 'data': {'listType': 'ol'}, 'content': childDefs}]);
        } else {
            nestDefs.push({'tag': 'div', 'data': {'listType': 'li'}, 'content': [{'tag': 'span', 'data': {'listType': 'number'}, 'content': `${defIndex}. `}, def]});
        }
    }

    return nestDefs;
}

function handleNest(nestedGlossObj, sense) {
    const nestedGloss = handleLevel(nestedGlossObj, 1);

    if (nestedGloss.length > 0) {
        for (const entry of nestedGloss) {
            sense.glosses.push({'type': 'structured-content', 'content': entry});
        }
    }
}
