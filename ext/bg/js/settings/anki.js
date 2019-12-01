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
        if (!e.originalEvent) {
            return;
        }

        const element = $(this);
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

function onAnkiFieldTemplatesReset(e) {
    e.preventDefault();
    $('#field-template-reset-modal').modal('show');
}

async function onAnkiFieldTemplatesResetConfirm(e) {
    try {
        e.preventDefault();

        $('#field-template-reset-modal').modal('hide');

        const optionsContext = getOptionsContext();
        const options = await apiOptionsGet(optionsContext);
        const fieldTemplates = profileOptionsGetDefaultFieldTemplates();
        options.anki.fieldTemplates = fieldTemplates;
        $('#field-templates').val(fieldTemplates);
        onAnkiTemplatesValidateCompile();
        await settingsSaveOptions();
    } catch (error) {
        ankiErrorShow(error);
    }
}

function ankiTemplatesInitialize() {
    const markers = new Set(ankiGetFieldMarkers('terms').concat(ankiGetFieldMarkers('kanji')));
    const fragment = ankiGetFieldMarkersHtml(markers);

    const list = document.querySelector('#field-templates-list');
    list.appendChild(fragment);
    for (const node of list.querySelectorAll('.marker-link')) {
        node.addEventListener('click', onAnkiTemplateMarkerClicked, false);
    }

    $('#field-templates').on('change', (e) => onAnkiTemplatesValidateCompile(e));
    $('#field-template-render').on('click', (e) => onAnkiTemplateRender(e));
    $('#field-templates-reset').on('click', (e) => onAnkiFieldTemplatesReset(e));
    $('#field-templates-reset-confirm').on('click', (e) => onAnkiFieldTemplatesResetConfirm(e));
}

const ankiTemplatesValidateGetDefinition = (() => {
    let cachedValue = null;
    let cachedText = null;

    return async (text, optionsContext) => {
        if (cachedText !== text) {
            const {definitions} = await apiTermsFind(text, {}, optionsContext);
            if (definitions.length === 0) { return null; }

            cachedValue = definitions[0];
            cachedText = text;
        }
        return cachedValue;
    };
})();

async function ankiTemplatesValidate(infoNode, field, mode, showSuccessResult, invalidateInput) {
    const text = document.querySelector('#field-templates-preview-text').value || '';
    const exceptions = [];
    let result = `No definition found for ${text}`;
    try {
        const optionsContext = getOptionsContext();
        const definition = await ankiTemplatesValidateGetDefinition(text, optionsContext);
        if (definition !== null) {
            const options = await apiOptionsGet(optionsContext);
            result = await dictFieldFormat(field, definition, mode, options, exceptions);
        }
    } catch (e) {
        exceptions.push(e);
    }

    const hasException = exceptions.length > 0;
    infoNode.hidden = !(showSuccessResult || hasException);
    infoNode.textContent = hasException ? exceptions.map((e) => `${e}`).join('\n') : (showSuccessResult ? result : '');
    infoNode.classList.toggle('text-danger', hasException);
    if (invalidateInput) {
        const input = document.querySelector('#field-templates');
        input.classList.toggle('is-invalid', hasException);
    }
}

function onAnkiTemplatesValidateCompile() {
    const infoNode = document.querySelector('#field-template-compile-result');
    ankiTemplatesValidate(infoNode, '{expression}', 'term-kanji', false, true);
}

function onAnkiTemplateMarkerClicked(e) {
    e.preventDefault();
    document.querySelector('#field-template-render-text').value = `{${e.target.textContent}}`;
}

function onAnkiTemplateRender(e) {
    e.preventDefault();

    const field = document.querySelector('#field-template-render-text').value;
    const infoNode = document.querySelector('#field-template-render-result');
    infoNode.hidden = true;
    ankiTemplatesValidate(infoNode, field, 'term-kanji', true, false);
}
