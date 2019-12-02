/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
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


let _ankiDataPopulated = false;


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
        dialog.show().text(error);
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

    const deckNames = await utilAnkiGetDeckNames();
    const ankiDeck = $('.anki-deck');
    ankiDeck.find('option').remove();
    deckNames.sort().forEach((name) => ankiDeck.append($('<option/>', {value: name, text: name})));

    const modelNames = await utilAnkiGetModelNames();
    const ankiModel = $('.anki-model');
    ankiModel.find('option').remove();
    modelNames.sort().forEach((name) => ankiModel.append($('<option/>', {value: name, text: name})));

    $('#anki-terms-deck').val(options.anki.terms.deck);
    await ankiFieldsPopulate($('#anki-terms-model').val(options.anki.terms.model), options);

    $('#anki-kanji-deck').val(options.anki.kanji.deck);
    await ankiFieldsPopulate($('#anki-kanji-model').val(options.anki.kanji.model), options);

    ankiFormat.show();
}

function ankiCreateFieldTemplate(name, value, markers) {
    const template = document.querySelector('#anki-field-template').content;
    const content = document.importNode(template, true).firstChild;

    content.querySelector('.anki-field-name').textContent = name;

    const field = content.querySelector('.anki-field-value');
    field.dataset.field = name;
    field.value = value;

    content.querySelector('.anki-field-marker-list').appendChild(ankiGetFieldMarkersHtml(markers));

    return content;
}

function ankiGetFieldMarkersHtml(markers, fragment) {
    const template = document.querySelector('#anki-field-marker-template').content;
    if (!fragment) {
        fragment = new DocumentFragment();
    }
    for (const marker of markers) {
        const markerNode = document.importNode(template, true).firstChild;
        markerNode.querySelector('.marker-link').textContent = marker;
        fragment.appendChild(markerNode);
    }
    return fragment;
}

function ankiGetFieldMarkers(type) {
    switch (type) {
        case 'terms':
            return [
                'audio',
                'cloze-body',
                'cloze-prefix',
                'cloze-suffix',
                'dictionary',
                'expression',
                'furigana',
                'furigana-plain',
                'glossary',
                'glossary-brief',
                'reading',
                'screenshot',
                'sentence',
                'tags',
                'url'
            ];
        case 'kanji':
            return [
                'character',
                'dictionary',
                'glossary',
                'kunyomi',
                'onyomi',
                'screenshot',
                'sentence',
                'tags',
                'url'
            ];
        default:
            return [];
    }
}

async function ankiFieldsPopulate(element, options) {
    const modelName = element.val();
    if (!modelName) {
        return;
    }

    const tab = element.closest('.tab-pane');
    const tabId = tab.attr('id');
    const container = tab.find('tbody').empty();
    const markers = ankiGetFieldMarkers(tabId);

    for (const name of await utilAnkiGetModelFieldNames(modelName)) {
        const value = options.anki[tabId].fields[name] || '';
        const html = ankiCreateFieldTemplate(name, value, markers);
        container.append($(html));
    }

    tab.find('.anki-field-value').change((e) => onFormOptionsChanged(e));
    tab.find('.marker-link').click((e) => onAnkiMarkerClicked(e));
}

function onAnkiMarkerClicked(e) {
    e.preventDefault();
    const link = e.target;
    $(link).closest('.input-group').find('.anki-field-value').val(`{${link.text}}`).trigger('change');
}

async function onAnkiModelChanged(e) {
    try {
        const element = $(e.currentTarget);
        const tab = element.closest('.tab-pane');
        const tabId = tab.attr('id');

        const optionsContext = getOptionsContext();
        const options = await apiOptionsGet(optionsContext);
        await formRead(options);
        options.anki[tabId].fields = utilBackgroundIsolate({});
        await settingsSaveOptions();

        ankiSpinnerShow(true);
        await ankiFieldsPopulate(element, options);
        ankiErrorShow();
    } catch (error) {
        ankiErrorShow(error);
    } finally {
        ankiSpinnerShow(false);
    }
}


function ankiInitialize() {
    for (const node of document.querySelectorAll('#anki-terms-model,#anki-kanji-model')) {
        node.addEventListener('change', (e) => onAnkiModelChanged(e), false);
    }
}

async function onAnkiOptionsChanged(options) {
    if (!options.anki.enable) {
        _ankiDataPopulated = false;
        return;
    }

    if (_ankiDataPopulated) { return; }

    try {
        ankiSpinnerShow(true);
        await ankiDeckAndModelPopulate(options);
        ankiErrorShow();
        _ankiDataPopulated = true;
    } catch (e) {
        ankiErrorShow(e);
    } finally {
        ankiSpinnerShow(false);
    }
}
