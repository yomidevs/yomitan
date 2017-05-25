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

function formRead() {
    return optionsLoad().then(optionsOld => {
        const optionsNew = $.extend(true, {}, optionsOld);

        optionsNew.general.showGuide = $('#show-usage-guide').prop('checked');
        optionsNew.general.audioSource = $('#audio-playback-source').val();
        optionsNew.general.audioVolume = $('#audio-playback-volume').val();
        optionsNew.general.groupResults = $('#group-terms-results').prop('checked');
        optionsNew.general.debugInfo = $('#show-debug-info').prop('checked');
        optionsNew.general.showAdvanced = $('#show-advanced-options').prop('checked');
        optionsNew.general.maxResults = parseInt($('#max-displayed-results').val(), 10);
        optionsNew.general.popupWidth = parseInt($('#popup-width').val(), 10);
        optionsNew.general.popupHeight = parseInt($('#popup-height').val(), 10);
        optionsNew.general.popupOffset = parseInt($('#popup-offset').val(), 10);

        optionsNew.scanning.requireShift = $('#hold-shift-to-scan').prop('checked');
        optionsNew.scanning.middleMouse = $('#middle-mouse-button-scan').prop('checked');
        optionsNew.scanning.selectText = $('#select-matched-text').prop('checked');
        optionsNew.scanning.alphanumeric = $('#search-alphanumeric').prop('checked');
        optionsNew.scanning.delay = parseInt($('#scan-delay').val(), 10);
        optionsNew.scanning.length = parseInt($('#scan-length').val(), 10);

        optionsNew.anki.enable = $('#anki-enable').prop('checked');
        optionsNew.anki.tags = $('#card-tags').val().split(/[,; ]+/);
        optionsNew.anki.htmlCards = $('#generate-html-cards').prop('checked');
        optionsNew.anki.sentenceExt = parseInt($('#sentence-detection-extent').val(), 10);
        optionsNew.anki.server = $('#interface-server').val();

        if (optionsOld.anki.enable && !$('#anki-error').is(':visible')) {
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

    const debug = $('#debug');
    if (options.general.debugInfo) {
        const text = JSON.stringify(options, null, 4);
        debug.html(handlebarsEscape(text));
        debug.show();
    } else {
        debug.hide();
    }
}

function onOptionsChanged(e) {
    if (!e.originalEvent && !e.isTrigger) {
        return;
    }

    formRead().then(({optionsNew, optionsOld}) => {
        return optionsSave(optionsNew).then(() => {
            updateVisibility(optionsNew);

            const ankiUpdated =
                optionsNew.anki.enable !== optionsOld.anki.enable ||
                optionsNew.anki.server !== optionsOld.anki.server;

            if (ankiUpdated) {
                ankiErrorShow(null);
                ankiSpinnerShow(true);
                return ankiDeckAndModelPopulate(optionsNew);
            }
        });
    }).catch(ankiErrorShow).then(() => ankiSpinnerShow(false));
}

$(document).ready(() => {
    handlebarsRegister();

    optionsLoad().then(options => {
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

        $('#hold-shift-to-scan').prop('checked', options.scanning.requireShift);
        $('#middle-mouse-button-scan').prop('checked', options.scanning.middleMouse);
        $('#select-matched-text').prop('checked', options.scanning.selectText);
        $('#search-alphanumeric').prop('checked', options.scanning.alphanumeric);
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

        dictionaryGroupsPopulate(options);
        ankiDeckAndModelPopulate(options);
        updateVisibility(options);
    });
});


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

function dictionaryGroupsPopulate(options) {
    dictionaryErrorShow(null);
    dictionarySpinnerShow(true);

    const dictGroups = $('#dict-groups').empty();
    const dictWarning = $('#dict-warning').hide();

    return instDb().getDictionaries().then(rows => {
        if (rows.length === 0) {
            dictWarning.show();
        }

        for (const row of dictRowsSort(rows, options)) {
            const dictOptions = options.dictionaries[row.title] || {enabled: false, priority: 0};
            const dictHtml = handlebarsRender('dictionary.html', {
                title: row.title,
                version: row.version,
                revision: row.revision,
                priority: dictOptions.priority,
                enabled: dictOptions.enabled
            });

            dictGroups.append($(dictHtml));
        }

        updateVisibility(options);

        $('.dict-enabled, .dict-priority').change(e => {
            dictionaryGroupsSort();
            onOptionsChanged(e);
        });
    }).catch(dictionaryErrorShow).then(() => dictionarySpinnerShow(false));
}

function onDictionaryPurge(e) {
    e.preventDefault();

    dictionaryErrorShow(null);
    dictionarySpinnerShow(true);

    const dictControls = $('#dict-importer, #dict-groups').hide();
    const dictProgress = $('#dict-purge-progress').show();

    instDb().purge().catch(dictionaryErrorShow).then(() => {
        dictionarySpinnerShow(false);
        dictControls.show();
        dictProgress.hide();
        return optionsLoad();
    }).then(options => {
        options.dictionaries = {};
        optionsSave(options).then(() => dictionaryGroupsPopulate(options));
    });
}

function onDictionaryImport() {
    dictionaryErrorShow(null);
    dictionarySpinnerShow(true);

    const dictUrl = $('#dict-url');
    const dictImporter = $('#dict-importer').hide();
    const dictProgress = $('#dict-import-progress').show();
    const setProgress = percent => dictProgress.find('.progress-bar').css('width', `${percent}%`);

    setProgress(0.0);

    optionsLoad().then(options => {
        instDb().importDictionary(dictUrl.val(), (total, current) => setProgress(current / total * 100.0)).then(summary => {
            options.dictionaries[summary.title] = {enabled: true, priority: 0};
            return optionsSave(options);
        }).then(() => dictionaryGroupsPopulate(options)).catch(dictionaryErrorShow).then(() => {
            dictionarySpinnerShow(false);
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
        dictUrl.val(chrome.extension.getURL(`bg/lang/dict/${url}/index.json`));
    }

    dictUrl.trigger('input');
}

function onDictionaryUpdateUrl() {
    $('#dict-import').prop('disabled', $(this).val().length === 0);
}


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

function ankiFieldsToDict(selection) {
    const result = {};
    selection.each((index, element) => {
        result[$(element).data('field')] = $(element).val();
    });

    return result;
}

function ankiDeckAndModelPopulate(options) {
    ankiErrorShow(null);
    ankiSpinnerShow(true);

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
            ankiFieldsPopulate($('#anki-terms-model').val(options.anki.terms.model), options),
            ankiFieldsPopulate($('#anki-kanji-model').val(options.anki.kanji.model), options)
        ]);
    }).then(() => ankiFormat.show()).catch(ankiErrorShow).then(() => ankiSpinnerShow(false));
}

function ankiFieldsPopulate(element, options) {
    const tab = element.closest('.tab-pane');
    const tabId = tab.attr('id');
    const container = tab.find('tbody').empty();

    const modelName = element.val();
    if (modelName === null) {
        return Promise.resolve();
    }

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

    ankiErrorShow(null);
    ankiSpinnerShow(true);

    const element = $(this);
    formRead().then(({optionsNew, optionsOld}) => {
        const tab = element.closest('.tab-pane');
        const tabId = tab.attr('id');
        optionsNew.anki[tabId].fields = {};
        ankiFieldsPopulate(element, optionsNew).then(() => {
            optionsSave(optionsNew);
        }).catch(ankiErrorShow).then(() => ankiSpinnerShow(false));
    });
}
