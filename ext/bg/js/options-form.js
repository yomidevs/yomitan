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

function optionsToForm(opts) {
    $('#activate-on-startup').prop('checked', opts.activateOnStartup);
    $('#enable-anki-connect').prop('checked', opts.enableAnkiConnect);
    $('#load-enamdict').prop('checked', opts.loadEnamDict);
    $('#scan-length').val(opts.scanLength);
    $('#select-matched-text').prop('checked', opts.selectMatchedText);
}

function formToOptions() {
    return sanitizeOptions({
        activateOnStartup: $('#activate-on-startup').prop('checked'),
        enableAnkiConnect: $('#enable-anki-connect').prop('checked'),
        loadEnamDict:      $('#load-enamdict').prop('checked'),
        scanLength:        $('#scan-length').val(),
        selectMatchedText: $('#select-matched-text').prop('checked')
    });
}

function updateAnkiFormVis(opts) {
    if (opts.enableAnkiConnect) {
        populateAnkiDeckAndModel();
        $('.options-anki').fadeIn();
    } else {
        $('.options-anki').fadeOut();
    }
}

function populateAnkiDeckAndModel() {
    const yomi = yomichan();

    const ankiDeck = $('.anki-deck');
    ankiDeck.find('option').remove();
    yomi.api_getDeckNames({callback: (names) => {
        if (names !== null) {
            names.forEach((name) => ankiDeck.append($('<option/>', {value: name, text: name})));
        }
    }});

    const ankiModel = $('.anki-model');
    ankiModel.find('option').remove();
    yomi.api_getModelNames({callback: (names) => {
        if (names !== null) {
            names.forEach((name) => ankiModel.append($('<option/>', {value: name, text: name})));
            $('.anki-model').trigger('change');
        }
    }});

}

function onOptionsChanged() {
    const opts = formToOptions();
    saveOptions(opts, () => {
        yomichan().setOptions(opts);
        updateAnkiFormVis(opts);
    });
}

function onModelChanged() {
    const modelName = $(this).val();
    if (modelName === null) {
        return;
    }

    yomichan().api_getModelFieldNames({modelName, callback: (names) => {
        const table = $(this).closest('.tab-pane').find('.anki-fields');
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

$(document).ready(() => {
    loadOptions((opts) => {
        optionsToForm(opts);

        $('input').on('input paste change', onOptionsChanged);
        $('.anki-model').change(onModelChanged);

        updateAnkiFormVis(opts);
    });
});
