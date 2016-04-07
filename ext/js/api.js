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


function sendMessage(action, data, callback) {
    chrome.runtime.sendMessage({action: action, data: data}, callback);
}

function findTerm(text, callback) {
    sendMessage('findTerm', {text: text}, callback);
}

function findKanji(text, callback) {
    sendMessage('findKanji', {text: text}, callback);
}

function renderText(data, template, callback) {
    sendMessage('renderText', {data: data, template: template}, callback);
}

function getOptions(callback) {
    sendMessage('getOptions', null, callback);
}

function getState(callback) {
    sendMessage('getState', null, callback);
}
