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


//
// Background APIs
//

function bgSendMessage(action, params, callback) {
    chrome.runtime.sendMessage({action: action, params: params}, callback);
}

function bgFindTerm(text, callback) {
    bgSendMessage('findTerm', text, callback);
}

function bgFindKanji(text, callback) {
    bgSendMessage('findKanji', text, callback);
}

function bgRenderText(data, template, callback) {
    bgSendMessage('renderText', {data: data, template: template}, callback);
}

function bgGetOptions(callback) {
    bgSendMessage('getOptions', null, callback);
}

function bgGetState(callback) {
    bgSendMessage('getState', null, callback);
}

function bgCanAddNotes(definitions, modes, callback) {
    bgSendMessage('canAddNotes', {definitions, modes}, callback);
}

function bgAddNote(definition, mode, callback) {
    bgSendMessage('addNote', {definition: definition, mode: mode}, callback);
}
