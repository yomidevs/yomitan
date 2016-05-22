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


function optionsToForm(opts) {
    $('#activateOnStartup').prop('checked', opts.activateOnStartup);
    $('#enableAnkiConnect').prop('checked', opts.enableAnkiConnect);
    $('#loadEnamDict').prop('checked', opts.loadEnamDict);
    $('#scanLength').val(opts.scanLength);
    $('#selectMatchedText').prop('checked', opts.selectMatchedText);
}

function formToOptions() {
    return sanitizeOptions({
        activateOnStartup: $('#activateOnStartup').prop('checked'),
        enableAnkiConnect: $('#enableAnkiConnect').prop('checked'),
        loadEnamDict:      $('#loadEnamDict').prop('checked'),
        scanLength:        $('#scanLength').val(),
        selectMatchedText: $('#selectMatchedText').prop('checked')
    });
}

function updateAnkiFormDataVis(opts) {
    if (opts.enableAnkiConnect) {
        updateAnkiFormData();
        $('.options-anki').show();
    } else {
        $('.options-anki').hide();
    }
}

function updateAnkiFormData() {
    const yomichan = chrome.extension.getBackgroundPage().yomichan;

    const ankiDeck = $('#ankiDeck');
    ankiDeck.find('option').remove();
    yomichan.api_getDeckNames({callback: (names) => {
        if (names !== null) {
            names.forEach((name) => ankiDeck.append($('<option/>', {value: name, text: name})));
        }
    }});

    const ankiModel = $('#ankiModel');
    ankiModel.find('option').remove();
    yomichan.api_getModelNames({callback: (names) => {
        if (names !== null) {
            names.forEach((name) => ankiModel.append($('<option/>', {value: name, text: name})));
        }
    }});
}

function onOptionsChanged() {
    const opts = formToOptions();
    saveOptions(opts, () => {
        chrome.extension.getBackgroundPage().yomichan.setOptions(opts);
        updateAnkiFormDataVis(opts);
    });
}

$(document).ready(() => {
    loadOptions((opts) => {
        optionsToForm(opts);
        updateAnkiFormDataVis(opts);
        $('input').on('input paste change', onOptionsChanged);
    });
});
