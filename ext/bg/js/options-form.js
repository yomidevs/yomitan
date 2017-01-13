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

//
//  General
//

function yomichan() {
    return chrome.extension.getBackgroundPage().yomichan;
}

function getFormValues() {
    return loadOptions().then(optsOld => {
        const optsNew = $.extend({}, optsOld);

        optsNew.activateOnStartup = $('#activate-on-startup').prop('checked');
        optsNew.enableAudioPlayback = $('#enable-audio-playback').prop('checked');
        optsNew.enableSoftKatakanaSearch = $('#enable-soft-katakana-search').prop('checked');
        optsNew.groupTermResults = $('#group-term-results').prop('checked');
        optsNew.showAdvancedOptions = $('#show-advanced-options').prop('checked');

        optsNew.holdShiftToScan = $('#hold-shift-to-scan').prop('checked');
        optsNew.selectMatchedText = $('#select-matched-text').prop('checked');
        optsNew.scanDelay = parseInt($('#scan-delay').val(), 10);
        optsNew.scanLength = parseInt($('#scan-length').val(), 10);

        optsNew.ankiEnable = $('#anki-enable').prop('checked');
        optsNew.ankiCardTags = $('#anki-card-tags').val().split(/[,; ]+/);
        optsNew.sentenceExtent = parseInt($('#sentence-extent').val(), 10);
        optsNew.ankiTermDeck = $('#anki-term-deck').val();
        optsNew.ankiTermModel = $('#anki-term-model').val();
        optsNew.ankiTermFields = fieldsToDict($('#term .anki-field-value'));
        optsNew.ankiKanjiDeck = $('#anki-kanji-deck').val();
        optsNew.ankiKanjiModel = $('#anki-kanji-model').val();
        optsNew.ankiKanjiFields = fieldsToDict($('#kanji .anki-field-value'));

        $('.dict-group').each((index, element) => {
            const dictionary = $(element);
            const title = dictionary.data('title');
            const enableTerms = dictionary.find('.dict-enable-terms').prop('checked');
            const enableKanji = dictionary.find('.dict-enable-kanji').prop('checked');
            optsNew.dictionaries[title] = {enableTerms, enableKanji};
        });

        return {
            optsNew: sanitizeOptions(optsNew),
            optsOld: sanitizeOptions(optsOld)
        };
    });
}

function updateVisibility(opts) {
    if (opts.ankiEnable) {
        $('#anki-general').show();
    } else {
        $('#anki-general').hide();
    }

    if (opts.showAdvancedOptions) {
        $('.options-advanced').show();
    } else {
        $('.options-advanced').hide();
    }
}

$(document).ready(() => {
    Handlebars.partials = Handlebars.templates;

    loadOptions().then(opts => {
        $('#activate-on-startup').prop('checked', opts.activateOnStartup);
        $('#enable-audio-playback').prop('checked', opts.enableAudioPlayback);
        $('#enable-soft-katakana-search').prop('checked', opts.enableSoftKatakanaSearch);
        $('#group-term-results').prop('checked', opts.groupTermResults);
        $('#show-advanced-options').prop('checked', opts.showAdvancedOptions);

        $('#hold-shift-to-scan').prop('checked', opts.holdShiftToScan);
        $('#select-matched-text').prop('checked', opts.selectMatchedText);
        $('#scan-delay').val(opts.scanDelay);
        $('#scan-length').val(opts.scanLength);

        $('#anki-enable').prop('checked', opts.ankiEnable);
        $('#anki-card-tags').val(opts.ankiCardTags.join(' '));
        $('#sentence-extent').val(opts.sentenceExtent);

        $('input, select').not('.anki-model').change(onOptionsChanged);
        $('.anki-model').change(onAnkiModelChanged);

        $('#dict-purge').click(onDictionaryPurge);
        $('#dict-importer a').click(onDictionarySetUrl);
        $('#dict-import').click(onDictionaryImport);
        $('#dict-url').on('input', onDictionaryUpdateUrl);

        populateDictionaries(opts);
        populateAnkiDeckAndModel(opts);
        updateVisibility(opts);
    });
});

//
//  Dictionary
//

function database() {
    return yomichan().translator.database;
}

function showDictionaryError(error) {
    const dialog = $('#dict-error');
    if (error) {
        dialog.show().find('span').text(error);
    } else {
        dialog.hide();
    }
}

function showDictionarySpinner(show) {
    const spinner = $('#dict-spinner');
    if (show) {
        spinner.show();
    } else {
        spinner.hide();
    }
}

function populateDictionaries(opts) {
    showDictionaryError(null);
    showDictionarySpinner(true);

    const dictGroups = $('#dict-groups').empty();
    const dictWarning = $('#dict-warning').hide();

    let dictCount = 0;
    return database().getDictionaries().then(rows => {
        rows.forEach(row => {
            const dictOpts = opts.dictionaries[row.title] || {enableTerms: false, enableKanji: false};
            const html = Handlebars.templates['dictionary.html']({
                title: row.title,
                version: row.version,
                revision: row.revision,
                hasTerms: row.hasTerms,
                hasKanji: row.hasKanji,
                enableTerms: dictOpts.enableTerms,
                enableKanji: dictOpts.enableKanji
            });

            dictGroups.append($(html));
            ++dictCount;
        });

        $('.dict-enable-terms, .dict-enable-kanji').change(onOptionsChanged);
        $('.dict-delete').click(onDictionaryDelete);
    }).catch(error => {
        showDictionaryError(error);
    }).then(() => {
        showDictionarySpinner(false);
        if (dictCount === 0) {
            dictWarning.show();
        }
    });
}

function onDictionaryPurge(e) {
    e.preventDefault();

    showDictionaryError(null);
    showDictionarySpinner(true);

    const dictControls = $('#dict-importer, #dict-groups').hide();
    const dictProgress = $('#dict-purge-progress').show();

    return database().purge().catch(error => {
        showDictionaryError(error);
    }).then(() => {
        showDictionarySpinner(false);
        dictControls.show();
        dictProgress.hide();
        return loadOptions().then(opts => populateDictionaries(opts));
    });
}

function onDictionaryDelete() {
    showDictionaryError(null);
    showDictionarySpinner(true);

    const dictGroup = $(this).closest('.dict-group');
    const dictProgress = dictGroup.find('.dict-delete-progress').show();
    const dictControls = dictGroup.find('.dict-group-controls').hide();
    const setProgress = percent => {
        dictProgress.find('.progress-bar').css('width', `${percent}%`);
    };

    setProgress(0.0);

    database().deleteDictionary(dictGroup.data('title'), (total, current) => setProgress(current / total * 100.0)).catch(error => {
        showDictionaryError(error);
    }).then(() => {
        showDictionarySpinner(false);
        dictProgress.hide();
        dictControls.show();
        return loadOptions().then(opts => populateDictionaries(opts));
    });
}

function onDictionaryImport() {
    showDictionaryError(null);
    showDictionarySpinner(true);

    const dictUrl = $('#dict-url');
    const dictImporter = $('#dict-importer').hide();
    const dictProgress = $('#dict-import-progress').show();
    const setProgress = percent => {
        dictProgress.find('.progress-bar').css('width', `${percent}%`);
    };

    setProgress(0.0);

    loadOptions().then(opts => {
        database().importDictionary(dictUrl.val(), (total, current) => setProgress(current / total * 100.0)).then(summary => {
            opts.dictionaries[summary.title] = {enableTerms: summary.hasTerms, enableKanji: summary.hasKanji};
            return saveOptions(opts).then(() => yomichan().setOptions(opts));
        }).then(() => {
            return populateDictionaries(opts);
        }).catch(error => {
            showDictionaryError(error);
        }).then(() => {
            showDictionarySpinner(false);
            dictProgress.hide();
            dictImporter.show();
            dictUrl.val('');
            dictUrl.trigger('input');
        });
    });
}

function onDictionarySetUrl(e) {
    e.preventDefault();

    const dictUrl = $('#dict-url');
    const url = $(this).data('url');
    if (url.includes('/')) {
        dictUrl.val(url);
    } else {
        dictUrl.val(chrome.extension.getURL(`bg/lang/data/${url}/index.json`));
    }

    dictUrl.trigger('input');
}

function onDictionaryUpdateUrl() {
    $('#dict-import').prop('disabled', $(this).val().length === 0);
}

//
//  Anki
//

function anki() {
    return yomichan().anki;
}

function showAnkiSpinner(show) {
    const spinner = $('#anki-spinner');
    if (show) {
        spinner.show();
    } else {
        spinner.hide();
    }
}

function showAnkiError(error) {
    const dialog = $('#anki-error');
    if (error) {
        dialog.show().find('span').text(error);
    }
    else {
        dialog.hide();
    }
}

function fieldsToDict(selection) {
    const result = {};
    selection.each((index, element) => {
        result[$(element).data('field')] = $(element).val();
    });

    return result;
}

function modelIdToFieldOptKey(id) {
    return {
        'anki-term-model': 'ankiTermFields',
        'anki-kanji-model': 'ankiKanjiFields'
    }[id];
}

function modelIdToMarkers(id) {
    return {
        'anki-term-model': [
            'audio',
            'dictionary',
            'expression',
            'expression-furigana',
            'glossary',
            'glossary-list',
            'reading',
            'sentence',
            'tags',
            'url'
        ],
        'anki-kanji-model': [
            'character',
            'dictionary',
            'glossary',
            'glossary-list',
            'kunyomi',
            'onyomi',
            'url'
        ],
    }[id];
}

function populateAnkiDeckAndModel(opts) {
    showAnkiError(null);
    showAnkiSpinner(true);

    const ankiFormat = $('#anki-format').hide();
    return Promise.all([anki().getDeckNames(), anki().getModelNames()]).then(([deckNames, modelNames]) => {
        const ankiDeck = $('.anki-deck');
        ankiDeck.find('option').remove();
        deckNames.forEach(name => ankiDeck.append($('<option/>', {value: name, text: name})));

        $('#anki-term-deck').val(opts.ankiTermDeck);
        $('#anki-kanji-deck').val(opts.ankiKanjiDeck);

        const ankiModel = $('.anki-model');
        ankiModel.find('option').remove();
        modelNames.forEach(name => ankiModel.append($('<option/>', {value: name, text: name})));

        return Promise.all([
            populateAnkiFields($('#anki-term-model').val(opts.ankiTermModel), opts),
            populateAnkiFields($('#anki-kanji-model').val(opts.ankiKanjiModel), opts)
        ]);
    }).then(() => {
        ankiFormat.show();
    }).catch(error => {
        showAnkiError(error);
    }).then(() => {
        showAnkiSpinner(false);
    });
}

function populateAnkiFields(element, opts) {
    const tab = element.closest('.tab-pane');
    const container = tab.find('tbody').empty();

    const modelName = element.val();
    if (modelName === null) {
        return Promise.resolve();
    }

    const modelId = element.attr('id');
    const optKey = modelIdToFieldOptKey(modelId);
    const markers = modelIdToMarkers(modelId);

    return anki().getModelFieldNames(modelName).then(names => {
        names.forEach(name => {
            const html = Handlebars.templates['model.html']({name, markers, value: opts[optKey][name] || ''});
            container.append($(html));
        });

        tab.find('.anki-field-value').change(onOptionsChanged);
        tab.find('.marker-link').click(e => {
            e.preventDefault();
            const link = e.target;
            $(link).closest('.input-group').find('.anki-field-value').val(`{${link.text}}`).trigger('change');
        });
    });
}

function onAnkiModelChanged(e) {
    if (!e.originalEvent) {
        return;
    }

    showAnkiError(null);
    showAnkiSpinner(true);

    getFormValues().then(({optsNew, optsOld}) => {
        optsNew[modelIdToFieldOptKey($(this).id)] = {};
        populateAnkiFields($(this), optsNew).then(() => {
            saveOptions(optsNew).then(() => yomichan().setOptions(optsNew));
        }).catch(error => {
            showAnkiError(error);
        }).then(() => {
            showAnkiSpinner(false);
        });
    });
}

function onOptionsChanged(e) {
    if (!e.originalEvent && !e.isTrigger) {
        return;
    }

    getFormValues().then(({optsNew, optsOld}) => {
        return saveOptions(optsNew).then(() => {
            yomichan().setOptions(optsNew);
            updateVisibility(optsNew);
            if (optsNew.ankiEnable !== optsOld.ankiEnable) {
                showAnkiError(null);
                showAnkiSpinner(true);
                return populateAnkiDeckAndModel(optsNew);
            }
        });
    }).catch(error => {
        showAnkiError(error);
    }).then(() => {
        showAnkiSpinner(false);
    });
}
