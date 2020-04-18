/*
 * Copyright (C) 2016-2020  Yomichan Authors
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


function apiOptionsSchemaGet() {
    return _apiInvoke('optionsSchemaGet');
}

function apiOptionsGet(optionsContext) {
    return _apiInvoke('optionsGet', {optionsContext});
}

function apiOptionsGetFull() {
    return _apiInvoke('optionsGetFull');
}

function apiOptionsSet(changedOptions, optionsContext, source) {
    return _apiInvoke('optionsSet', {changedOptions, optionsContext, source});
}

function apiOptionsSave(source) {
    return _apiInvoke('optionsSave', {source});
}

function apiTermsFind(text, details, optionsContext) {
    return _apiInvoke('termsFind', {text, details, optionsContext});
}

function apiTextParse(text, optionsContext) {
    return _apiInvoke('textParse', {text, optionsContext});
}

function apiKanjiFind(text, optionsContext) {
    return _apiInvoke('kanjiFind', {text, optionsContext});
}

function apiDefinitionAdd(definition, mode, context, details, optionsContext) {
    return _apiInvoke('definitionAdd', {definition, mode, context, details, optionsContext});
}

function apiDefinitionsAddable(definitions, modes, context, optionsContext) {
    return _apiInvoke('definitionsAddable', {definitions, modes, context, optionsContext});
}

function apiNoteView(noteId) {
    return _apiInvoke('noteView', {noteId});
}

function apiTemplateRender(template, data) {
    return _apiInvoke('templateRender', {data, template});
}

function apiAudioGetUri(definition, source, optionsContext) {
    return _apiInvoke('audioGetUri', {definition, source, optionsContext});
}

function apiCommandExec(command, params) {
    return _apiInvoke('commandExec', {command, params});
}

function apiScreenshotGet(options) {
    return _apiInvoke('screenshotGet', {options});
}

function apiBroadcastTab(action, params) {
    return _apiInvoke('broadcastTab', {action, params});
}

function apiFrameInformationGet() {
    return _apiInvoke('frameInformationGet');
}

function apiInjectStylesheet(type, value) {
    return _apiInvoke('injectStylesheet', {type, value});
}

function apiGetEnvironmentInfo() {
    return _apiInvoke('getEnvironmentInfo');
}

function apiClipboardGet() {
    return _apiInvoke('clipboardGet');
}

function apiGetDisplayTemplatesHtml() {
    return _apiInvoke('getDisplayTemplatesHtml');
}

function apiGetQueryParserTemplatesHtml() {
    return _apiInvoke('getQueryParserTemplatesHtml');
}

function apiGetZoom() {
    return _apiInvoke('getZoom');
}

function apiGetMessageToken() {
    return _apiInvoke('getMessageToken');
}

function apiGetDefaultAnkiFieldTemplates() {
    return _apiInvoke('getDefaultAnkiFieldTemplates');
}

function apiGetAnkiDeckNames() {
    return _apiInvoke('getAnkiDeckNames');
}

function apiGetAnkiModelNames() {
    return _apiInvoke('getAnkiModelNames');
}

function apiGetAnkiModelFieldNames(modelName) {
    return _apiInvoke('getAnkiModelFieldNames', {modelName});
}

function apiGetDictionaryInfo() {
    return _apiInvoke('getDictionaryInfo');
}

function apiGetDictionaryCounts(dictionaryNames, getTotal) {
    return _apiInvoke('getDictionaryCounts', {dictionaryNames, getTotal});
}

function apiPurgeDatabase() {
    return _apiInvoke('purgeDatabase');
}

function _apiInvoke(action, params={}) {
    const data = {action, params};
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(data, (response) => {
                _apiCheckLastError(chrome.runtime.lastError);
                if (response !== null && typeof response === 'object') {
                    if (typeof response.error !== 'undefined') {
                        reject(jsonToError(response.error));
                    } else {
                        resolve(response.result);
                    }
                } else {
                    const message = response === null ? 'Unexpected null response' : `Unexpected response of type ${typeof response}`;
                    reject(new Error(`${message} (${JSON.stringify(data)})`));
                }
            });
        } catch (e) {
            reject(e);
            yomichan.triggerOrphaned(e);
        }
    });
}

function _apiCheckLastError() {
    // NOP
}
