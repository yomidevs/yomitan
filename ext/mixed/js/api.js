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

function apiTextParseMecab(text, optionsContext) {
    return _apiInvoke('textParseMecab', {text, optionsContext});
}

function apiKanjiFind(text, optionsContext) {
    return _apiInvoke('kanjiFind', {text, optionsContext});
}

function apiDefinitionAdd(definition, mode, context, optionsContext) {
    return _apiInvoke('definitionAdd', {definition, mode, context, optionsContext});
}

function apiDefinitionsAddable(definitions, modes, optionsContext) {
    return _apiInvoke('definitionsAddable', {definitions, modes, optionsContext}).catch(() => null);
}

function apiNoteView(noteId) {
    return _apiInvoke('noteView', {noteId});
}

function apiTemplateRender(template, data, dynamic) {
    return _apiInvoke('templateRender', {data, template, dynamic});
}

function apiAudioGetUrl(definition, source, optionsContext) {
    return _apiInvoke('audioGetUrl', {definition, source, optionsContext});
}

function apiCommandExec(command, params) {
    return _apiInvoke('commandExec', {command, params});
}

function apiScreenshotGet(options) {
    return _apiInvoke('screenshotGet', {options});
}

function apiForward(action, params) {
    return _apiInvoke('forward', {action, params});
}

function apiFrameInformationGet() {
    return _apiInvoke('frameInformationGet');
}

function apiInjectStylesheet(css) {
    return _apiInvoke('injectStylesheet', {css});
}

function apiGetEnvironmentInfo() {
    return _apiInvoke('getEnvironmentInfo');
}

function apiClipboardGet() {
    return _apiInvoke('clipboardGet');
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
