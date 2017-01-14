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
    return optionsLoad().then(optsOld => {
        const optsNew = $.extend({}, optsOld);

        optsNew.general.autoStart = $('#activate-on-startup').prop('checked');
        optsNew.general.audioPlayback = $('#enable-audio-playback').prop('checked');
        optsNew.general.softKatakana = $('#enable-soft-katakana-search').prop('checked');
        optsNew.general.groupResults = $('#group-term-results').prop('checked');
        optsNew.general.showAdvanced = $('#show-advanced-options').prop('checked');

        optsNew.scanning.requireShift = $('#hold-shift-to-scan').prop('checked');
        optsNew.scanning.selectText = $('#select-matched-text').prop('checked');
        optsNew.scanning.delay = parseInt($('#scan-delay').val(), 10);
        optsNew.scanning.length = parseInt($('#scan-length').val(), 10);

        optsNew.anki.enable = $('#anki-enable').prop('checked');
        optsNew.anki.tags = $('#anki-card-tags').val().split(/[,; ]+/);
        optsNew.anki.sentenceExt = parseInt($('#sentence-extent').val(), 10);
        optsNew.anki.terms.deck = $('#anki-term-deck').val();
        optsNew.anki.terms.model = $('#anki-term-model').val();
        optsNew.anki.terms.fields = fieldsToDict($('#term .anki-field-value'));
        optsNew.anki.kanji.deck = $('#anki-kanji-deck').val();
        optsNew.anki.kanji.model = $('#anki-kanji-model').val();
        optsNew.anki.kanji.fields = fieldsToDict($('#kanji .anki-field-value'));

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
    if (opts.anki.enable) {
        $('#anki-general').show();
    } else {
        $('#anki-general').hide();
    }

    if (opts.general.showAdvanced) {
        $('.options-advanced').show();
    } else {
        $('.options-advanced').hide();
    }
}

$(document).ready(() => {
    Handlebars.partials = Handlebars.templates;

    optionsLoad().then(opts => {
        $('#activate-on-startup').prop('checked', opts.general.autoStart);
        $('#enable-audio-playback').prop('checked', opts.general.audioPlayback);
        $('#enable-soft-katakana-search').prop('checked', opts.general.softKatakana);
        $('#group-term-results').prop('checked', opts.general.groupResults);
        $('#show-advanced-options').prop('checked', opts.general.showAdvanced);

        $('#hold-shift-to-scan').prop('checked', opts.scanning.requireShift);
        $('#select-matched-text').prop('checked', opts.scanning.selectText);
        $('#scan-delay').val(opts.scanning.delay);
        $('#scan-length').val(opts.scanning.length);

        $('#anki-enable').prop('checked', opts.anki.enable);
        $('#anki-card-tags').val(opts.anki.tags.join(' '));
        $('#sentence-extent').val(opts.anki.sentenceExt);

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
        return optionsLoad().then(opts => populateDictionaries(opts));
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
        return optionsLoad().then(opts => populateDictionaries(opts));
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

    optionsLoad().then(opts => {
        database().importDictionary(dictUrl.val(), (total, current) => setProgress(current / total * 100.0)).then(summary => {
            opts.dictionaries[summary.title] = {enableTerms: summary.hasTerms, enableKanji: summary.hasKanji};
            return optionsSave(opts).then(() => yomichan().setOptions(opts));
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
        'anki-term-model': 'anki.terms.fields',
        'anki-kanji-model': 'anki.kanji.fields'
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

        $('#anki-term-deck').val(opts.anki.terms.deck);
        $('#anki-kanji-deck').val(opts.anki.kanji.deck);

        const ankiModel = $('.anki-model');
        ankiModel.find('option').remove();
        modelNames.forEach(name => ankiModel.append($('<option/>', {value: name, text: name})));

        return Promise.all([
            populateAnkiFields($('#anki-term-model').val(opts.anki.terms.model), opts),
            populateAnkiFields($('#anki-kanji-model').val(opts.anki.kanji.model), opts)
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
            optionsSave(optsNew).then(() => yomichan().setOptions(optsNew));
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
        return optionsSave(optsNew).then(() => {
            yomichan().setOptions(optsNew);
            updateVisibility(optsNew);
            if (optsNew.anki.enable !== optsOld.anki.enable) {
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
