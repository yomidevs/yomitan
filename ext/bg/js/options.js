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
 * General
 */

function getFormData() {
    return optionsLoad().then(optionsOld => {
        const optionsNew = $.extend(true, {}, optionsOld);

        optionsNew.general.audioPlayback = $('#audio-playback-buttons').prop('checked');
        optionsNew.general.groupResults = $('#group-terms-results').prop('checked');
        optionsNew.general.softKatakana = $('#soft-katakana-search').prop('checked');
        optionsNew.general.showAdvanced = $('#show-advanced-options').prop('checked');
        optionsNew.general.maxResults = parseInt($('#max-displayed-results').val(), 10);

        optionsNew.scanning.requireShift = $('#hold-shift-to-scan').prop('checked');
        optionsNew.scanning.selectText = $('#select-matched-text').prop('checked');
        optionsNew.scanning.imposter = $('#search-form-text-fields').prop('checked');
        optionsNew.scanning.delay = parseInt($('#scan-delay').val(), 10);
        optionsNew.scanning.length = parseInt($('#scan-length').val(), 10);

        optionsNew.anki.enable = $('#anki-enable').prop('checked');
        optionsNew.anki.tags = $('#card-tags').val().split(/[,; ]+/);
        optionsNew.anki.htmlCards = $('#generate-html-cards').prop('checked');
        optionsNew.anki.sentenceExt = parseInt($('#sentence-detection-extent').val(), 10);
        optionsNew.anki.server = $('#interface-server').val();
        if (optionsOld.anki.enable) {
            optionsNew.anki.terms.deck = $('#anki-terms-deck').val();
            optionsNew.anki.terms.model = $('#anki-terms-model').val();
            optionsNew.anki.terms.fields = ankiFieldsToDict($('#terms .anki-field-value'));
            optionsNew.anki.kanji.deck = $('#anki-kanji-deck').val();
            optionsNew.anki.kanji.model = $('#anki-kanji-model').val();
            optionsNew.anki.kanji.fields = ankiFieldsToDict($('#kanji .anki-field-value'));
        }

        $('.dict-group').each((index, element) => {
            const dictionary = $(element);
            const title = dictionary.data('title');
            const priority = parseInt(dictionary.find('.dict-priority').val(), 10);
            const enabled = dictionary.find('.dict-enabled').prop('checked');
            optionsNew.dictionaries[title] = {priority, enabled};
        });

        return {optionsNew, optionsOld};
    });
}

function updateVisibility(options) {
    const general = $('#anki-general');
    if (options.anki.enable) {
        general.show();
    } else {
        general.hide();
    }

    const advanced = $('.options-advanced');
    if (options.general.showAdvanced) {
        advanced.show();
    } else {
        advanced.hide();
    }
}

$(document).ready(() => {
    handlebarsRegister();

    optionsLoad().then(options => {
        $('#audio-playback-buttons').prop('checked', options.general.audioPlayback);
        $('#group-terms-results').prop('checked', options.general.groupResults);
        $('#soft-katakana-search').prop('checked', options.general.softKatakana);
        $('#show-advanced-options').prop('checked', options.general.showAdvanced);
        $('#max-displayed-results').val(options.general.maxResults);

        $('#hold-shift-to-scan').prop('checked', options.scanning.requireShift);
        $('#select-matched-text').prop('checked', options.scanning.selectText);
        $('#search-form-text-fields').prop('checked', options.scanning.imposter);
        $('#scan-delay').val(options.scanning.delay);
        $('#scan-length').val(options.scanning.length);

        $('#dict-purge').click(onDictionaryPurge);
        $('#dict-importer a').click(onDictionarySetUrl);
        $('#dict-import').click(onDictionaryImport);
        $('#dict-url').on('input', onDictionaryUpdateUrl);

        $('#anki-enable').prop('checked', options.anki.enable);
        $('#card-tags').val(options.anki.tags.join(' '));
        $('#generate-html-cards').prop('checked', options.anki.htmlCards);
        $('#sentence-detection-extent').val(options.anki.sentenceExt);
        $('#interface-server').val(options.anki.server);
        $('input, select').not('.anki-model').change(onOptionsChanged);
        $('.anki-model').change(onAnkiModelChanged);

        populateDictionaries(options);
        populateAnkiDeckAndModel(options);
        updateVisibility(options);
    });
});


/*
 * Dictionary
 */

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

function populateDictionaries(options) {
    showDictionaryError(null);
    showDictionarySpinner(true);

    const dictGroups = $('#dict-groups').empty();
    const dictWarning = $('#dict-warning').hide();

    let dictCount = 0;
    return instDb().getDictionaries().then(rows => {
        rows.forEach(row => {
            const dictOptions = options.dictionaries[row.title] || {enableTerms: false, enableKanji: false, priority: 0};
            const html = handlebarsRender('dictionary.html', {
                title: row.title,
                version: row.version,
                revision: row.revision,
                priority: dictOptions.priority,
                enabled: dictOptions.enabled
            });

            dictGroups.append($(html));
            ++dictCount;
        });

        updateVisibility(options);

        $('.dict-enabled, .dict-priority').change(onOptionsChanged);
    }).catch(showDictionaryError).then(() => {
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

    return instDb().purge().catch(showDictionaryError).then(() => {
        showDictionarySpinner(false);
        dictControls.show();
        dictProgress.hide();
        return optionsLoad();
    }).then(options => {
        options.dictionaries = {};
        return optionsSave(options).then(() => populateDictionaries(options));
    });
}

function onDictionaryImport() {
    showDictionaryError(null);
    showDictionarySpinner(true);

    const dictUrl = $('#dict-url');
    const dictImporter = $('#dict-importer').hide();
    const dictProgress = $('#dict-import-progress').show();
    const setProgress = percent => dictProgress.find('.progress-bar').css('width', `${percent}%`);

    setProgress(0.0);

    optionsLoad().then(options => {
        instDb().importDictionary(dictUrl.val(), (total, current) => setProgress(current / total * 100.0)).then(summary => {
            options.dictionaries[summary.title] = {enabled: true, priority: 0};
            return optionsSave(options);
        }).then(() => populateDictionaries(options)).catch(showDictionaryError).then(() => {
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


/*
 * Anki
 */

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

function ankiFieldsToDict(selection) {
    const result = {};
    selection.each((index, element) => {
        result[$(element).data('field')] = $(element).val();
    });

    return result;
}

function populateAnkiDeckAndModel(options) {
    showAnkiError(null);
    showAnkiSpinner(true);

    const ankiFormat = $('#anki-format').hide();
    return Promise.all([instAnki().getDeckNames(), instAnki().getModelNames()]).then(([deckNames, modelNames]) => {
        const ankiDeck = $('.anki-deck');
        ankiDeck.find('option').remove();
        deckNames.sort().forEach(name => ankiDeck.append($('<option/>', {value: name, text: name})));

        $('#anki-terms-deck').val(options.anki.terms.deck);
        $('#anki-kanji-deck').val(options.anki.kanji.deck);

        const ankiModel = $('.anki-model');
        ankiModel.find('option').remove();
        modelNames.sort().forEach(name => ankiModel.append($('<option/>', {value: name, text: name})));

        return Promise.all([
            populateAnkiFields($('#anki-terms-model').val(options.anki.terms.model), options),
            populateAnkiFields($('#anki-kanji-model').val(options.anki.kanji.model), options)
        ]);
    }).then(() => ankiFormat.show()).catch(showAnkiError).then(() => showAnkiSpinner(false));
}

function populateAnkiFields(element, options) {
    const tab = element.closest('.tab-pane');
    const tabId = tab.attr('id');
    const container = tab.find('tbody').empty();

    const modelName = element.val();
    if (modelName === null) {
        return Promise.resolve();
    }

    const markers = {
        'terms': ['audio', 'dictionary', 'expression', 'furigana', 'glossary', 'reading', 'sentence', 'tags', 'url'],
        'kanji': ['character', 'dictionary', 'glossary', 'kunyomi', 'onyomi', 'sentence', 'tags', 'url']
    }[tabId] || {};

    return instAnki().getModelFieldNames(modelName).then(names => {
        names.forEach(name => {
            const value = options.anki[tabId].fields[name] || '';
            const html = Handlebars.templates['model.html']({name, markers, value});
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

    const element = $(this);
    getFormData().then(({optionsNew, optionsOld}) => {
        const tab = element.closest('.tab-pane');
        const tabId = tab.attr('id');

        optionsNew.anki[tabId].fields = {};
        populateAnkiFields(element, optionsNew).then(() => {
            optionsSave(optionsNew);
        }).catch(showAnkiError).then(() => showAnkiSpinner(false));
    });
}

function onOptionsChanged(e) {
    if (!e.originalEvent && !e.isTrigger) {
        return;
    }

    getFormData().then(({optionsNew, optionsOld}) => {
        return optionsSave(optionsNew).then(() => {
            updateVisibility(optionsNew);

            const ankiUpdated =
                optionsNew.anki.enable !== optionsOld.anki.enable ||
                optionsNew.anki.server !== optionsOld.anki.server;

            if (ankiUpdated) {
                showAnkiError(null);
                showAnkiSpinner(true);
                return populateAnkiDeckAndModel(optionsNew);
            }
        });
    }).catch(showAnkiError).then(() => showAnkiSpinner(false));
}
