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


function yomichan() {
    return chrome.extension.getBackgroundPage().yomichan;
}

function fieldsToDict(selection) {
    const result = {};
    selection.each((index, element) => {
        result[$(element).data('field')] = $(element).val();
    });

    return result;
}

function modelIdToFieldOptKey(id) {
    return {'anki-vocab-model': 'ankiVocabFields', 'anki-kanji-model': 'ankiKanjiFields'}[id];
}

function formToOptions(section, callback) {
    loadOptions((optsOld) => {
        const optsNew = $.extend({}, optsOld);

        switch (section) {
            case 'general':
                optsNew.scanLength          = parseInt($('#scan-length').val());
                optsNew.activateOnStartup   = $('#activate-on-startup').prop('checked');
                optsNew.loadEnamDict        = $('#load-enamdict').prop('checked');
                optsNew.selectMatchedText   = $('#select-matched-text').prop('checked');
                optsNew.enableAudioPlayback = $('#enable-audio-playback').prop('checked');
                optsNew.enableAnkiConnect   = $('#enable-anki-connect').prop('checked');
                break;
            case 'anki':
                optsNew.ankiCardTags    = $('#anki-card-tags').val().split(/[,; ]+/);
                optsNew.sentenceExtent  = parseInt($('#sentence-extent').val());
                optsNew.ankiVocabDeck   = $('#anki-vocab-deck').val();
                optsNew.ankiVocabModel  = $('#anki-vocab-model').val();
                optsNew.ankiVocabFields = fieldsToDict($('#vocab .anki-field-value'));
                optsNew.ankiKanjiDeck   = $('#anki-kanji-deck').val();
                optsNew.ankiKanjiModel  = $('#anki-kanji-model').val();
                optsNew.ankiKanjiFields = fieldsToDict($('#kanji .anki-field-value'));
                break;
        }

        callback(sanitizeOptions(optsNew), sanitizeOptions(optsOld));
    });
}

function populateAnkiDeckAndModel(opts) {
    const yomi = yomichan();

    const ankiDeck = $('.anki-deck');
    ankiDeck.find('option').remove();
    yomi.api_getDeckNames({callback: (names) => {
        if (names !== null) {
            names.forEach((name) => ankiDeck.append($('<option/>', {value: name, text: name})));
        }

        $('#anki-vocab-deck').val(opts.ankiVocabDeck);
        $('#anki-kanji-deck').val(opts.ankiKanjiDeck);
    }});

    const ankiModel = $('.anki-model');
    ankiModel.find('option').remove();
    yomi.api_getModelNames({callback: (names) => {
        if (names !== null) {
            names.forEach((name) => ankiModel.append($('<option/>', {value: name, text: name})));
        }

        populateAnkiFields($('#anki-vocab-model').val(opts.ankiVocabModel), opts);
        populateAnkiFields($('#anki-kanji-model').val(opts.ankiKanjiModel), opts);
    }});
}

function updateAnkiStatus() {
    $('.error-dlg').hide();
    yomichan().api_getVersion({callback: (version) => {
        if (version === null) {
            $('.error-dlg-connection').show();
            $('.options-anki-controls').hide();
        } else if (version !== yomichan().getApiVersion()) {
            $('.error-dlg-version').show();
            $('.options-anki-controls').hide();
        } else {
            $('.options-anki-controls').show();
        }
    }});
}

function populateAnkiFields(element, opts) {
    const modelName = element.val();
    if (modelName === null) {
        return;
    }

    const optKey = modelIdToFieldOptKey(element.attr('id'));
    yomichan().api_getModelFieldNames({modelName, callback: (names) => {
        const table = element.closest('.tab-pane').find('.anki-fields');
        table.find('tbody').remove();

        const body = $('<tbody>');
        names.forEach((name) => {
            const row = $('<tr>');
            row.append($('<td>', {class: 'col-sm-2'}).text(name));
            const value = opts[optKey][name] || '';
            row.append($('<td>', {class: 'col-sm-10'}).append($('<input>', {class: 'anki-field-value form-control', value}).data('field', name).change(onOptionsAnkiChanged)));
            body.append(row);
        });

        table.append(body);
    }});
}

function onOptionsGeneralChanged(e) {
    if (!e.originalEvent) {
        return;
    }

    formToOptions('general', (optsNew, optsOld) => {
        saveOptions(optsNew, () => {
            yomichan().setOptions(optsNew);
            if (!optsOld.enableAnkiConnect && optsNew.enableAnkiConnect) {
                updateAnkiStatus();
                populateAnkiDeckAndModel(optsNew);
                $('.options-anki').fadeIn();
            } else if (optsOld.enableAnkiConnect && !optsNew.enableAnkiConnect) {
                $('.options-anki').fadeOut();
            }
        });
    });
}

function onOptionsAnkiChanged(e) {
    if (e.originalEvent) {
        formToOptions('anki', (opts) => {
            saveOptions(opts, () => yomichan().setOptions(opts));
        });
    }
}

function onAnkiModelChanged(e) {
    if (e.originalEvent) {
        formToOptions('anki', (opts) => {
            opts[modelIdToFieldOptKey($(this).id)] = {};
            populateAnkiFields($(this), opts);
            saveOptions(opts, () => yomichan().setOptions(opts));
        });
    }
}

$(document).ready(() => {
    loadOptions((opts) => {
        $('#scan-length').val(opts.scanLength);
        $('#activate-on-startup').prop('checked', opts.activateOnStartup);
        $('#load-enamdict').prop('checked', opts.loadEnamDict);
        $('#select-matched-text').prop('checked', opts.selectMatchedText);
        $('#enable-audio-playback').prop('checked', opts.enableAudioPlayback);
        $('#enable-anki-connect').prop('checked', opts.enableAnkiConnect);

        $('#anki-card-tags').val(opts.ankiCardTags.join(' '));
        $('#sentence-extent').val(opts.sentenceExtent);

        $('.options-general input').change(onOptionsGeneralChanged);
        $('.options-anki input').change(onOptionsAnkiChanged);
        $('.anki-deck').change(onOptionsAnkiChanged);
        $('.anki-model').change(onAnkiModelChanged);

        if (opts.enableAnkiConnect) {
            updateAnkiStatus();
            populateAnkiDeckAndModel(opts);
            $('.options-anki').show();
        }
    });
});
