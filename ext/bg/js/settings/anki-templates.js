/*
 * Copyright (C) 2019-2020  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*global getOptionsContext, getOptionsMutable, settingsSaveOptions
ankiGetFieldMarkers, ankiGetFieldMarkersHtml, dictFieldFormat
apiOptionsGet, apiTermsFind, apiGetDefaultAnkiFieldTemplates*/

function onAnkiFieldTemplatesReset(e) {
    e.preventDefault();
    $('#field-template-reset-modal').modal('show');
}

async function onAnkiFieldTemplatesResetConfirm(e) {
    e.preventDefault();

    $('#field-template-reset-modal').modal('hide');

    const value = await apiGetDefaultAnkiFieldTemplates();

    const element = document.querySelector('#field-templates');
    element.value = value;
    element.dispatchEvent(new Event('change'));
}

function ankiTemplatesInitialize() {
    const markers = new Set(ankiGetFieldMarkers('terms').concat(ankiGetFieldMarkers('kanji')));
    const fragment = ankiGetFieldMarkersHtml(markers);

    const list = document.querySelector('#field-templates-list');
    list.appendChild(fragment);
    for (const node of list.querySelectorAll('.marker-link')) {
        node.addEventListener('click', onAnkiTemplateMarkerClicked, false);
    }

    $('#field-templates').on('change', onAnkiFieldTemplatesChanged);
    $('#field-template-render').on('click', onAnkiTemplateRender);
    $('#field-templates-reset').on('click', onAnkiFieldTemplatesReset);
    $('#field-templates-reset-confirm').on('click', onAnkiFieldTemplatesResetConfirm);

    ankiTemplatesUpdateValue();
}

async function ankiTemplatesUpdateValue() {
    const optionsContext = getOptionsContext();
    const options = await apiOptionsGet(optionsContext);
    let templates = options.anki.fieldTemplates;
    if (typeof templates !== 'string') { templates = await apiGetDefaultAnkiFieldTemplates(); }
    $('#field-templates').val(templates);

    onAnkiTemplatesValidateCompile();
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
            let templates = options.anki.fieldTemplates;
            if (typeof templates !== 'string') { templates = await apiGetDefaultAnkiFieldTemplates(); }
            result = await dictFieldFormat(field, definition, mode, options, templates, exceptions);
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

async function onAnkiFieldTemplatesChanged(e) {
    // Get value
    let templates = e.currentTarget.value;
    if (templates === await apiGetDefaultAnkiFieldTemplates()) {
        // Default
        templates = null;
    }

    // Overwrite
    const optionsContext = getOptionsContext();
    const options = await getOptionsMutable(optionsContext);
    options.anki.fieldTemplates = templates;
    await settingsSaveOptions();

    // Compile
    onAnkiTemplatesValidateCompile();
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
