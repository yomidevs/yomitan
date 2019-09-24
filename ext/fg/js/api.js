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
    return utilInvoke('optionsGet', {optionsContext});
}

function apiTermsFind(text, optionsContext) {
    return utilInvoke('termsFind', {text, optionsContext});
}

function apiKanjiFind(text, optionsContext) {
    return utilInvoke('kanjiFind', {text, optionsContext});
}

function apiDefinitionAdd(definition, mode, context, optionsContext) {
    return utilInvoke('definitionAdd', {definition, mode, context, optionsContext});
}

function apiDefinitionsAddable(definitions, modes, optionsContext) {
    return utilInvoke('definitionsAddable', {definitions, modes, optionsContext}).catch(() => null);
}

function apiNoteView(noteId) {
    return utilInvoke('noteView', {noteId});
}

function apiTemplateRender(template, data, dynamic) {
    return utilInvoke('templateRender', {data, template, dynamic});
}

function apiAudioGetUrl(definition, source) {
    return utilInvoke('audioGetUrl', {definition, source});
}

function apiCommandExec(command) {
    return utilInvoke('commandExec', {command});
}

function apiScreenshotGet(options) {
    return utilInvoke('screenshotGet', {options});
}

function apiForward(action, params) {
    return utilInvoke('forward', {action, params});
}

function apiFrameInformationGet() {
    return utilInvoke('frameInformationGet');
}
