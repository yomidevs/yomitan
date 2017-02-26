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
