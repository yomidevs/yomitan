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


/*
 * Promise
 */

function promiseCallback(promise, callback) {
    return promise.then(result => {
       callback({result});
    }).catch(error => {
        /* eslint-disable */
        console.log(error);
        /* eslint-enable */
        callback({error});
    });
}


/*
 * Instance
 */

function instYomi() {
    return chrome.extension.getBackgroundPage().yomichan;
}

function instDb() {
    return instYomi().translator.database;
}

function instAnki() {
    return instYomi().anki;
}



/*
 * Options
 */

function optionsSetDefaults(options) {
    const defaults = {
        general: {
            enable: true,
            audioPlayback: true,
            groupResults: true,
            softKatakana: true,
            maxResults: 32,
            showAdvanced: false
        },

        scanning: {
            requireShift: true,
            selectText: true,
            imposter: true,
            delay: 15,
            length: 10
        },

        dictionaries: {},

        anki: {
            enable: false,
            server: 'http://127.0.0.1:8765',
            tags: ['yomichan'],
            htmlCards: true,
            sentenceExt: 200,
            terms: {deck: '', model: '', fields: {}},
            kanji: {deck: '', model: '', fields: {}}
        }
    };

    const combine = (target, source) => {
        for (const key in source) {
            if (!target.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
    };

    combine(options, defaults);
    combine(options.general, defaults.general);
    combine(options.scanning, defaults.scanning);
    combine(options.anki, defaults.anki);
    combine(options.anki.terms, defaults.anki.terms);
    combine(options.anki.kanji, defaults.anki.kanji);

    return options;
}

function optionsVersion(options) {
    const fixups = [
        () => {
            const copy = (targetDict, targetKey, sourceDict, sourceKey) => {
                targetDict[targetKey] = sourceDict.hasOwnProperty(sourceKey) ? sourceDict[sourceKey] : targetDict[targetKey];
            };

            copy(options.general, 'autoStart', options, 'activateOnStartup');
            copy(options.general, 'audioPlayback', options, 'enableAudioPlayback');
            copy(options.general, 'softKatakana', options, 'enableSoftKatakanaSearch');
            copy(options.general, 'groupResults', options, 'groupTermResults');
            copy(options.general, 'showAdvanced', options, 'showAdvancedOptions');

            copy(options.scanning, 'requireShift', options, 'holdShiftToScan');
            copy(options.scanning, 'selectText', options, 'selectMatchedText');
            copy(options.scanning, 'delay', options, 'scanDelay');
            copy(options.scanning, 'length', options, 'scanLength');

            options.anki.enable = options.ankiMethod === 'ankiconnect';

            copy(options.anki, 'tags', options, 'ankiCardTags');
            copy(options.anki, 'sentenceExt', options, 'sentenceExtent');
            copy(options.anki.terms, 'deck', options, 'ankiTermDeck');
            copy(options.anki.terms, 'model', options, 'ankiTermModel');
            copy(options.anki.terms, 'fields', options, 'ankiTermFields');
            copy(options.anki.kanji, 'deck', options, 'ankiKanjiDeck');
            copy(options.anki.kanji, 'model', options, 'ankiKanjiModel');
            copy(options.anki.kanji, 'fields', options, 'ankiKanjiFields');

            for (const title in options.dictionaries) {
                const dictionary = options.dictionaries[title];
                dictionary.enabled = dictionary.enableTerms || dictionary.enableKanji;
                dictionary.priority = 0;
            }
        },
        () => {
            const fixupFields = fields => {
                const fixups = {
                    '{expression-furigana}': '{furigana}',
                    '{glossary-list}': '{glossary}'
                };

                for (const name in fields) {
                    for (const fixup in fixups) {
                        fields[name] = fields[name].replace(fixup, fixups[fixup]);
                    }
                }
            };

            fixupFields(options.anki.terms.fields);
            fixupFields(options.anki.kanji.fields);
        }
    ];

    optionsSetDefaults(options);
    if (!options.hasOwnProperty('version')) {
        options.version = fixups.length;
    }

    while (options.version < fixups.length) {
        fixups[options.version++]();
    }

    return options;
}

function optionsLoad() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(null, options => resolve(optionsVersion(options)));
    });
}

function optionsSave(options) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set(options, resolve);
    });
}


/*
 * Dictionary
 */

function dictEnabled(options) {
    const dictionaries = {};
    for (const title in options.dictionaries) {
        const dictionary = options.dictionaries[title];
        if (dictionary.enabled) {
            dictionaries[title] = dictionary;
        }
    }

    return dictionaries;
}

function dictTermsSort(definitions, dictionaries=null) {
    return definitions.sort((v1, v2) => {
        const sl1 = v1.source.length;
        const sl2 = v2.source.length;
        if (sl1 > sl2) {
            return -1;
        } else if (sl1 < sl2) {
            return 1;
        }

        if (dictionaries !== null) {
            const p1 = (dictionaries[v1.dictionary] || {}).priority || 0;
            const p2 = (dictionaries[v2.dictionary] || {}).priority || 0;
            if (p1 > p2) {
                return -1;
            } else if (p1 < p2) {
                return 1;
            }
        }

        const s1 = v1.score;
        const s2 = v2.score;
        if (s1 > s2) {
            return -1;
        } else if (s1 < s2) {
            return 1;
        }

        const rl1 = v1.reasons.length;
        const rl2 = v2.reasons.length;
        if (rl1 < rl2) {
            return -1;
        } else if (rl1 > rl2) {
            return 1;
        }

        return v2.expression.localeCompare(v1.expression);
    });
}

function dictTermsUndupe(definitions) {
    const definitionGroups = {};
    for (const definition of definitions) {
        const definitionExisting = definitionGroups[definition.id];
        if (!definitionGroups.hasOwnProperty(definition.id) || definition.expression.length > definitionExisting.expression.length) {
            definitionGroups[definition.id] = definition;
        }
    }

    const definitionsUnique = [];
    for (const key in definitionGroups) {
        definitionsUnique.push(definitionGroups[key]);
    }

    return definitionsUnique;
}

function dictTermsGroup(definitions, dictionaries) {
    const groups = {};
    for (const definition of definitions) {
        const key = [definition.source, definition.expression].concat(definition.reasons);
        if (definition.reading) {
            key.push(definition.reading);
        }

        const group = groups[key];
        if (group) {
            group.push(definition);
        } else {
            groups[key] = [definition];
        }
    }

    const results = [];
    for (const key in groups) {
        const groupDefs = groups[key];
        const firstDef = groupDefs[0];
        dictTermsSort(groupDefs, dictionaries);
        results.push({
            definitions: groupDefs,
            expression: firstDef.expression,
            reading: firstDef.reading,
            reasons: firstDef.reasons,
            score: groupDefs.reduce((x, y) => x.score > y.score ? x.score : y.score, Number.MIN_SAFE_INTEGER),
            source: firstDef.source
        });
    }

    return dictTermsSort(results);
}

function dictTagBuildSource(name) {
    return dictTagSanitize({name, category: 'dictionary', order: 100});
}

function dictTagBuild(name, meta) {
    const tag = {name};
    const symbol = name.split(':')[0];
    for (const prop in meta[symbol] || {}) {
        tag[prop] = meta[symbol][prop];
    }

    return dictTagSanitize(tag);
}

function dictTagSanitize(tag) {
    tag.name = tag.name || 'untitled';
    tag.category = tag.category || 'default';
    tag.notes = tag.notes || '';
    tag.order = tag.order || 0;
    return tag;
}

function dictTagsSort(tags) {
    return tags.sort((v1, v2) => {
        const order1 = v1.order;
        const order2 = v2.order;
        if (order1 < order2) {
            return -1;
        } else if (order1 > order2) {
            return 1;
        }

        const name1 = v1.name;
        const name2 = v2.name;
        if (name1 < name2) {
            return -1;
        } else if (name1 > name2) {
            return 1;
        }

        return 0;
    });
}

function dictFieldSplit(field) {
    return field.length === 0 ? [] : field.split(' ');
}

function dictFieldFormat(field, definition, mode, options) {
    const markers = [
        'audio',
        'character',
        'dictionary',
        'expression',
        'furigana',
        'glossary',
        'kunyomi',
        'onyomi',
        'reading',
        'sentence',
        'tags',
        'url'
    ];

    for (const marker of markers) {
        const data = {
            marker,
            definition,
            group: options.general.groupResults,
            html: options.anki.htmlCards,
            modeTermKanji: mode === 'term_kanji',
            modeTermKana: mode === 'term_kana',
            modeKanji: mode === 'kanji'
        };

        field = field.replace(
            `{${marker}}`,
            Handlebars.templates['fields.html'](data).trim()
        );
    }

    return field;
}


/*
 * Json
 */

function jsonLoad(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.overrideMimeType('application/json');
        xhr.addEventListener('load', () => resolve(xhr.responseText));
        xhr.addEventListener('error', () => reject('failed to execute network request'));
        xhr.open('GET', url);
        xhr.send();
    }).then(responseText => {
        try {
            return JSON.parse(responseText);
        }
        catch (e) {
            return Promise.reject('invalid JSON response');
        }
    });
}

function jsonLoadInt(url) {
    return jsonLoad(chrome.extension.getURL(url));
}

function jsonLoadDb(indexUrl, indexLoaded, termsLoaded, kanjiLoaded) {
    const indexDir = indexUrl.slice(0, indexUrl.lastIndexOf('/'));
    return jsonLoad(indexUrl).then(index => {
        if (!index.title || !index.version || !index.revision) {
            return Promise.reject('unrecognized dictionary format');
        }

        if (indexLoaded !== null) {
            return indexLoaded(
                index.title,
                index.version,
                index.revision,
                index.tagMeta || {},
                index.termBanks > 0,
                index.kanjiBanks > 0
            ).then(() => index);
        }

        return index;
    }).then(index => {
        const loaders = [];
        const banksTotal = index.termBanks + index.kanjiBanks;
        let banksLoaded = 0;

        for (let i = 1; i <= index.termBanks; ++i) {
            const bankUrl = `${indexDir}/term_bank_${i}.json`;
            loaders.push(() => jsonLoad(bankUrl).then(entries => termsLoaded(
                index.title,
                entries,
                banksTotal,
                banksLoaded++
            )));
        }

        for (let i = 1; i <= index.kanjiBanks; ++i) {
            const bankUrl = `${indexDir}/kanji_bank_${i}.json`;
            loaders.push(() => jsonLoad(bankUrl).then(entries => kanjiLoaded(
                index.title,
                entries,
                banksTotal,
                banksLoaded++
            )));
        }

        let chain = Promise.resolve();
        for (const loader of loaders) {
            chain = chain.then(loader);
        }

        return chain;
    });
}


/*
 * Helpers
 */

function helperKanjiLinks(options) {
    const isKanji = c => {
        const code = c.charCodeAt(0);
        return code >= 0x4e00 && code < 0x9fb0 || code >= 0x3400 && code < 0x4dc0;
    };

    let result = '';
    for (const c of options.fn(this)) {
        if (isKanji(c)) {
            result += `<a href="#" class="kanji-link">${c}</a>`;
        } else {
            result += c;
        }
    }

    return result;
}

function helperMultiLine(options) {
    return options.fn(this).split('\n').join('<br>');
}
