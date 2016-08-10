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


function bgSendMessage(action, params) {
    return new Promise((resolve, reject) => chrome.runtime.sendMessage({action, params}, resolve));
}

function bgFindTerm(text) {
    return bgSendMessage('findTerm', {text});
}

function bgFindKanji(text) {
    return bgSendMessage('findKanji', {text});
}

function bgRenderText(data, template) {
    return bgSendMessage('renderText', {data, template});
}

function bgCanAddDefinitions(definitions, modes) {
    return bgSendMessage('canAddDefinitions', {definitions, modes});
}

function bgAddDefinition(definition, mode) {
    return bgSendMessage('addDefinition', {definition, mode});
}
