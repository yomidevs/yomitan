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

function formToOptions(section, callback) {
    loadOptions((optsOld) => {
        const optsNew = $.extend({}, optsOld);

        switch (section) {
            case 'general':
                optsNew.scanLength        = $('#scan-length').val();
                optsNew.activateOnStartup = $('#activate-on-startup').prop('checked');
                optsNew.loadEnamDict      = $('#load-enamdict').prop('checked');
                optsNew.selectMatchedText = $('#select-matched-text').prop('checked');
                optsNew.enableAnkiConnect = $('#enable-anki-connect').prop('checked');
                break;
            case 'anki':
                optsNew.ankiVocabDeck  = $('#anki-vocab-deck').val();
                optsNew.ankiVocabModel = $('#anki-vocab-model').val();
                optsNew.ankiKanjiDeck  = $('#anki-kanji-deck').val();
                optsNew.ankiKanjiModel = $('#anki-kanji-model').val();
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

        const ankiModel = $('.anki-model');
        ankiModel.find('option').remove();
        yomi.api_getModelNames({callback: (names) => {
            if (names !== null) {
                names.forEach((name) => ankiModel.append($('<option/>', {value: name, text: name})));
            }

            $('#anki-vocab-deck').val(opts.ankiVocabDeck);
            populateAnkiFields($('#anki-vocab-model').val(opts.ankiVocabModel), opts);
            $('#anki-kanji-deck').val(opts.ankiKanjiDeck);
            populateAnkiFields($('#anki-kanji-model').val(opts.ankiKanjiModel), opts);
        }});
    }});
}

function populateAnkiFields(element, opts) {
    const modelName = element.val();
    if (modelName === null) {
        return;
    }

    yomichan().api_getModelFieldNames({modelName, callback: (names) => {
        const table = element.closest('.tab-pane').find('.anki-fields');
        table.find('tbody').remove();

        const body = $('<tbody>');
        names.forEach((name) => {
            const row = $('<tr>');
            row.append($('<td>').text(name));
            row.append($('<input>', {class: 'anki-field-value form-control'}).data('field', name));
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
                populateAnkiDeckAndModel(optsNew);
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

$(document).ready(() => {
    loadOptions((opts) => {
        $('#scan-length').val(opts.scanLength);
        $('#activate-on-startup').prop('checked', opts.activateOnStartup);
        $('#load-enamdict').prop('checked', opts.loadEnamDict);
        $('#select-matched-text').prop('checked', opts.selectMatchedText);
        $('#enable-anki-connect').prop('checked', opts.enableAnkiConnect);

        $('.options-general input').change(onOptionsGeneralChanged);
        $('.options-anki input, .options-anki select').change(onOptionsAnkiChanged);
        $('.anki-model').change((e) => {
            loadOptions((opts) => populateAnkiFields($(e.currentTarget), opts));
        });
        $('#enable-anki-connect').change((e) => {
            if ($(e.currentTarget).prop('checked')) {
                $('.options-anki').fadeIn();
            } else {
                $('.options-anki').fadeOut();
            }
        });

        if (opts.enableAnkiConnect) {
            populateAnkiDeckAndModel(opts);
            $('.options-anki').show();
        }
    });
});
