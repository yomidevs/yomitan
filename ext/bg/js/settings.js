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
 * Utilities
 */

function utilAnkiGetModelNames() {
    return backend().anki.getModelNames();
}

function utilAnkiGetDeckNames() {
    return backend().anki.getDeckNames();
}

function utilAnkiGetModelFieldNames(modelName) {
    return backend().anki.getModelFieldNames(modelName);
}

function utilDatabaseGetDictionaries() {
    return backend().translator.database.getDictionaries();
}

function utilDatabasePurge() {
    return backend().translator.database.purge();
}

function utilDatabaseImport(data, progress) {
    return backend().translator.database.importDictionary(data, progress);
}


/*
 * General
 */

async function formRead() {
    const optionsOld = await optionsLoad();
    const optionsNew = $.extend(true, {}, optionsOld);

    optionsNew.general.showGuide = $('#show-usage-guide').prop('checked');
    optionsNew.general.audioSource = $('#audio-playback-source').val();
    optionsNew.general.audioVolume = parseFloat($('#audio-playback-volume').val());
    optionsNew.general.groupResults = $('#group-terms-results').prop('checked');
    optionsNew.general.debugInfo = $('#show-debug-info').prop('checked');
    optionsNew.general.showAdvanced = $('#show-advanced-options').prop('checked');
    optionsNew.general.maxResults = parseInt($('#max-displayed-results').val(), 10);
    optionsNew.general.popupWidth = parseInt($('#popup-width').val(), 10);
    optionsNew.general.popupHeight = parseInt($('#popup-height').val(), 10);
    optionsNew.general.popupOffset = parseInt($('#popup-offset').val(), 10);

    optionsNew.scanning.middleMouse = $('#middle-mouse-button-scan').prop('checked');
    optionsNew.scanning.selectText = $('#select-matched-text').prop('checked');
    optionsNew.scanning.alphanumeric = $('#search-alphanumeric').prop('checked');
    optionsNew.scanning.delay = parseInt($('#scan-delay').val(), 10);
    optionsNew.scanning.length = parseInt($('#scan-length').val(), 10);
    optionsNew.scanning.modifier = $('#scan-modifier-key').val();

    optionsNew.anki.enable = $('#anki-enable').prop('checked');
    optionsNew.anki.tags = $('#card-tags').val().split(/[,; ]+/);
    optionsNew.anki.htmlCards = $('#generate-html-cards').prop('checked');
    optionsNew.anki.sentenceExt = parseInt($('#sentence-detection-extent').val(), 10);
    optionsNew.anki.server = $('#interface-server').val();

    if (optionsOld.anki.enable && !ankiErrorShown()) {
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
}

function formUpdateVisibility(options) {
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

    const debug = $('#debug');
    if (options.general.debugInfo) {
        const text = JSON.stringify(options, null, 4);
        debug.html(handlebarsEscape(text));
        debug.show();
    } else {
        debug.hide();
    }
}

async function onFormOptionsChanged(e) {(async () => {
    if (!e.originalEvent && !e.isTrigger) {
        return;
    }

    try {
        ankiErrorShow();
        ankiSpinnerShow(true);

        const {optionsNew, optionsOld} = await formRead();
        await optionsSave(optionsNew);

        formUpdateVisibility(optionsNew);

        const ankiUpdated =
            optionsNew.anki.enable !== optionsOld.anki.enable ||
            optionsNew.anki.server !== optionsOld.anki.server;

        if (ankiUpdated) {
            await ankiDeckAndModelPopulate(optionsNew);
        }
    } catch (e) {
        ankiErrorShow(e);
    } finally {
        ankiSpinnerShow(false);
    }
})();}

function onReady() {(async () => {
    const options = await optionsLoad();

    $('#show-usage-guide').prop('checked', options.general.showGuide);
    $('#audio-playback-source').val(options.general.audioSource);
    $('#audio-playback-volume').val(options.general.audioVolume);
    $('#group-terms-results').prop('checked', options.general.groupResults);
    $('#show-debug-info').prop('checked', options.general.debugInfo);
    $('#show-advanced-options').prop('checked', options.general.showAdvanced);
    $('#max-displayed-results').val(options.general.maxResults);
    $('#popup-width').val(options.general.popupWidth);
    $('#popup-height').val(options.general.popupHeight);
    $('#popup-offset').val(options.general.popupOffset);

    $('#middle-mouse-button-scan').prop('checked', options.scanning.middleMouse);
    $('#select-matched-text').prop('checked', options.scanning.selectText);
    $('#search-alphanumeric').prop('checked', options.scanning.alphanumeric);
    $('#scan-delay').val(options.scanning.delay);
    $('#scan-length').val(options.scanning.length);
    $('#scan-modifier-key').val(options.scanning.modifier);

    $('#dict-purge').click(onDictionaryPurge);
    $('#dict-file').change(onDictionaryImport);

    $('#anki-enable').prop('checked', options.anki.enable);
    $('#card-tags').val(options.anki.tags.join(' '));
    $('#generate-html-cards').prop('checked', options.anki.htmlCards);
    $('#sentence-detection-extent').val(options.anki.sentenceExt);
    $('#interface-server').val(options.anki.server);
    $('input, select').not('.anki-model').change(onFormOptionsChanged);
    $('.anki-model').change(onAnkiModelChanged);

    try {
        await dictionaryGroupsPopulate(options);
    } catch (e) {
        dictionaryErrorShow(e);
    }

    try {
        await ankiDeckAndModelPopulate(options);
    } catch (e) {
        ankiErrorShow(e);
    }

    formUpdateVisibility(options);
})();}

$(document).ready(onReady);


/*
 * Dictionary
 */

function dictionaryErrorShow(error) {
    const dialog = $('#dict-error');
    if (error) {
        dialog.show().find('span').text(error);
    } else {
        dialog.hide();
    }
}

function dictionarySpinnerShow(show) {
    const spinner = $('#dict-spinner');
    if (show) {
        spinner.show();
    } else {
        spinner.hide();
    }
}

function dictionaryGroupsSort() {
    const dictGroups = $('#dict-groups');
    const dictGroupChildren = dictGroups.children('.dict-group').sort((ca, cb) => {
        const pa = parseInt($(ca).find('.dict-priority').val(), 10);
        const pb = parseInt($(cb).find('.dict-priority').val(), 10);
        if (pa < pb) {
            return 1;
        } else if (pa > pb) {
            return -1;
        } else {
            return 0;
        }
    });

    dictGroups.append(dictGroupChildren);
}

async function dictionaryGroupsPopulate(options) {
    const dictGroups = $('#dict-groups').empty();
    const dictWarning = $('#dict-warning').hide();

    const dictRows = await utilDatabaseGetDictionaries();
    if (dictRows.length === 0) {
        dictWarning.show();
    }

    for (const dictRow of dictRowsSort(dictRows, options)) {
        const dictOptions = options.dictionaries[dictRow.title] || {enabled: false, priority: 0};
        const dictHtml = handlebarsRender('dictionary.html', {
            title: dictRow.title,
            version: dictRow.version,
            revision: dictRow.revision,
            priority: dictOptions.priority,
            enabled: dictOptions.enabled
        });

        dictGroups.append($(dictHtml));
    }

    formUpdateVisibility(options);

    $('.dict-enabled, .dict-priority').change(e => {
        dictionaryGroupsSort();
        onFormOptionsChanged(e);
    });
}

async function onDictionaryPurge(e) {(async () => {
    e.preventDefault();

    const dictControls = $('#dict-importer, #dict-groups').hide();
    const dictProgress = $('#dict-purge-progress').show();

    try {
        dictionaryErrorShow();
        dictionarySpinnerShow(true);

        await utilDatabasePurge();
        const options = await optionsLoad();
        options.dictionaries = {};
        await optionsSave(options);

        await dictionaryGroupsPopulate(options);
    } catch (e) {
        dictionaryErrorShow(e);
    } finally {
        dictionarySpinnerShow(false);

        dictControls.show();
        dictProgress.hide();
    }
})();}

function onDictionaryImport(e) {(async () => {
    const dictFile = $('#dict-file');
    const dictControls = $('#dict-importer').hide();
    const dictProgress = $('#dict-import-progress').show();

    try {
        dictionaryErrorShow();
        dictionarySpinnerShow(true);

        const setProgress = percent => dictProgress.find('.progress-bar').css('width', `${percent}%`);
        const updateProgress = (total, current) => setProgress(current / total * 100.0);
        setProgress(0.0);

        const options = await optionsLoad();
        const summary = await utilDatabaseImport(e.target.files[0], updateProgress);
        options.dictionaries[summary.title] = {enabled: true, priority: 0};
        await optionsSave(options);

        await dictionaryGroupsPopulate(options);
    } catch (e) {
        dictionaryErrorShow(e);
    } finally {
        dictionarySpinnerShow(false);

        dictFile.val('');
        dictControls.show();
        dictProgress.hide();
    }
})();}


/*
 * Anki
 */

function ankiSpinnerShow(show) {
    const spinner = $('#anki-spinner');
    if (show) {
        spinner.show();
    } else {
        spinner.hide();
    }
}

function ankiErrorShow(error) {
    const dialog = $('#anki-error');
    if (error) {
        dialog.show().find('span').text(error);
    }
    else {
        dialog.hide();
    }
}

function ankiErrorShown() {
    return $('#anki-error').is(':visible');
}

function ankiFieldsToDict(selection) {
    const result = {};
    selection.each((index, element) => {
        result[$(element).data('field')] = $(element).val();
    });

    return result;
}

async function ankiDeckAndModelPopulate(options) {
    const ankiFormat = $('#anki-format').hide();
    const ankiTermsModel = $('#anki-terms-model').val(options.anki.terms.model);
    const ankiKanjiModel = $('#anki-kanji-model').val(options.anki.kanji.model);

    $('#anki-terms-deck').val(options.anki.terms.deck);
    $('#anki-kanji-deck').val(options.anki.kanji.deck);

    const deckNames = await utilAnkiGetDeckNames();
    const ankiDeck = $('.anki-deck');
    ankiDeck.find('option').remove();
    deckNames.sort().forEach(name => ankiDeck.append($('<option/>', {value: name, text: name})));

    const modelNames = await utilAnkiGetModelNames();
    const ankiModel = $('.anki-model');
    ankiModel.find('option').remove();
    modelNames.sort().forEach(name => ankiModel.append($('<option/>', {value: name, text: name})));

    await ankiFieldsPopulate(ankiTermsModel, options);
    await ankiFieldsPopulate(ankiKanjiModel, options);

    ankiFormat.show();
}

async function ankiFieldsPopulate(element, options) {
    const modelName = element.val();
    if (!modelName) {
        return;
    }

    const tab = element.closest('.tab-pane');
    const tabId = tab.attr('id');
    const container = tab.find('tbody').empty();

    const markers = {
        'terms': [
            'audio',
            'cloze-body',
            'cloze-prefix',
            'cloze-suffix',
            'dictionary',
            'expression',
            'furigana',
            'glossary',
            'glossary-brief',
            'reading',
            'sentence',
            'tags',
            'url'
        ],
        'kanji': [
            'character',
            'dictionary',
            'glossary',
            'kunyomi',
            'onyomi',
            'sentence',
            'tags',
            'url'
        ]
    }[tabId] || {};

    for (const name of await utilAnkiGetModelFieldNames(modelName)) {
        const value = options.anki[tabId].fields[name] || '';
        const html = Handlebars.templates['model.html']({name, markers, value});
        container.append($(html));
    }

    tab.find('.anki-field-value').change(onFormOptionsChanged);
    tab.find('.marker-link').click(onAnkiMarkerClicked);
}

function onAnkiMarkerClicked(e) {
    e.preventDefault();
    const link = e.target;
    $(link).closest('.input-group').find('.anki-field-value').val(`{${link.text}}`).trigger('change');
}

function onAnkiModelChanged(e) {(async () => {
    if (!e.originalEvent) {
        return;
    }

    try {
        ankiErrorShow();
        ankiSpinnerShow(true);

        const element = $(this);
        const tab = element.closest('.tab-pane');
        const tabId = tab.attr('id');

        const {optionsNew, optionsOld} = await formRead();
        optionsNew.anki[tabId].fields = {};
        await optionsSave(optionsNew);

        await ankiFieldsPopulate(element, optionsNew);
    } catch (e) {
        ankiErrorShow(e);
    } finally {
        ankiSpinnerShow(false);
    }
})();}
