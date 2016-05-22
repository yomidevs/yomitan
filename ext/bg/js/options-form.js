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

function updateVisibility() {
    if ($('#enableAnkiConnect').prop('checked')) {
        $('.options-anki').show();
    } else {
        $('.options-anki').hide();
    }
}

function updateAnkiPage() {
    const yomichan = chrome.extension.getBackgroundPage().yomichan;

    $('#ankiDeck').find('option').remove();
    $('#ankiModel').find('option').remove();

    yomichan.getDeckNames((names) => {
        names.forEach((name) => {
            $('#ankiDeck').append($('<option/>', {value: name, text: name}));
        });
    });

    yomichan.getModelNames((names) => {
        names.forEach((name) => {
            $('#ankiModel').append($('<option/>', {value: name, text: name}));
        });
    });
}

function onOptionsChanged() {
    updateVisibility();
    const opts = formToOptions();
    saveOptions(opts, () => {
        chrome.extension.getBackgroundPage().yomichan.setOptions(opts);
    });
}

$(document).ready(() => {
    loadOptions((opts) => {
        optionsToForm(opts);
        updateVisibility();
        updateAnkiPage();
        $('input').on('input paste change', onOptionsChanged);
    });
});
