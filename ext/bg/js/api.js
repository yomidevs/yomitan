/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
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


function apiOptionsGet(optionsContext) {
    return utilBackend()._onApiOptionsGet({optionsContext});
}

function apiOptionsSet(changedOptions, optionsContext, source) {
    return utilBackend()._onApiOptionsSet({changedOptions, optionsContext, source});
}

function apiOptionsGetFull() {
    return utilBackend()._onApiOptionsGetFull();
}

function apiOptionsSave(source) {
    return utilBackend()._onApiOptionsSave({source});
}

function apiTermsFind(text, details, optionsContext) {
    return utilBackend()._onApiTermsFind({text, details, optionsContext});
}

function apiTextParse(text, optionsContext) {
    return utilBackend()._onApiTextParse({text, optionsContext});
}

function apiTextParseMecab(text, optionsContext) {
    return utilBackend()._onApiTextParseMecab({text, optionsContext});
}

function apiKanjiFind(text, optionsContext) {
    return utilBackend()._onApiKanjiFind({text, optionsContext});
}

function apiDefinitionAdd(definition, mode, context, optionsContext) {
    return utilBackend()._onApiDefinitionAdd({definition, mode, context, optionsContext});
}

function apiDefinitionsAddable(definitions, modes, optionsContext) {
    return utilBackend()._onApiDefinitionsAddable({definitions, modes, optionsContext});
}

function apiNoteView(noteId) {
    return utilBackend()._onApiNoteView({noteId});
}

function apiTemplateRender(template, data, dynamic) {
    return utilBackend()._onApiTemplateRender({template, data, dynamic});
}

function apiCommandExec(command, params) {
    return utilBackend()._onApiCommandExec({command, params});
}

function apiAudioGetUrl(definition, source, optionsContext) {
    return utilBackend()._onApiAudioGetUrl({definition, source, optionsContext});
}

function apiScreenshotGet(options, sender) {
    return utilBackend()._onApiScreenshotGet({options}, sender);
}

function apiForward(action, params, sender) {
    return utilBackend()._onApiForward({action, params}, sender);
}

function apiFrameInformationGet(sender) {
    return utilBackend()._onApiFrameInformationGet(null, sender);
}

function apiInjectStylesheet(css, sender) {
    return utilBackend()._onApiInjectStylesheet({css}, sender);
}

function apiGetEnvironmentInfo() {
    return utilBackend()._onApiGetEnvironmentInfo();
}

async function apiClipboardGet() {
    const clipboardPasteTarget = utilBackend().clipboardPasteTarget;
    clipboardPasteTarget.innerText = '';
    clipboardPasteTarget.focus();
    document.execCommand('paste');
    return clipboardPasteTarget.innerText;
}
