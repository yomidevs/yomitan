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


function invokeApiBg(action, params) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({action, params}, (result, error) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}

function getEnabled() {
    return invokeApiBg('getEnabled', {});
}

function getOptions() {
    return invokeApiBg('getOptions', {});
}

function findTerm(text) {
    return invokeApiBg('findTerm', {text});
}

function findKanji(text) {
    return invokeApiBg('findKanji', {text});
}

function renderText(data, template) {
    return invokeApiBg('renderText', {data, template});
}

function canAddDefinitions(definitions, modes) {
    return invokeApiBg('canAddDefinitions', {definitions, modes});
}

function addDefinition(definition, mode) {
    return invokeApiBg('addDefinition', {definition, mode});
}

function textSourceFromPoint(point) {
    const element = document.elementFromPoint(point.x, point.y);
    if (element !== null) {
        const names = ['IMG', 'INPUT', 'BUTTON', 'TEXTAREA'];
        if (names.includes(element.nodeName)) {
            return new TextSourceElement(element);
        }
    }

    const range = document.caretRangeFromPoint(point.x, point.y);
    if (range !== null) {
        return new TextSourceRange(range);
    }

    return null;
}

function extractSentence(source, extent) {
    const quotesFwd = {'「': '」', '『': '』', "'": "'", '"': '"'};
    const quotesBwd = {'」': '「', '』': '『', "'": "'", '"': '"'};
    const terminators = '…。．.？?！!';

    const sourceLocal = source.clone();
    const position = sourceLocal.setStartOffset(extent);
    sourceLocal.setEndOffset(position + extent);
    const content = sourceLocal.text();

    let quoteStack = [];

    let startPos = 0;
    for (let i = position; i >= startPos; --i) {
        const c = content[i];

        if (quoteStack.length === 0 && (terminators.includes(c) || c in quotesFwd)) {
            startPos = i + 1;
            break;
        }

        if (quoteStack.length > 0 && c === quoteStack[0]) {
            quoteStack.pop();
        } else if (c in quotesBwd) {
            quoteStack = [quotesBwd[c]].concat(quoteStack);
        }
    }

    quoteStack = [];

    let endPos = content.length;
    for (let i = position; i < endPos; ++i) {
        const c = content[i];

        if (quoteStack.length === 0) {
            if (terminators.includes(c)) {
                endPos = i + 1;
                break;
            }
            else if (c in quotesBwd) {
                endPos = i;
                break;
            }
        }

        if (quoteStack.length > 0 && c === quoteStack[0]) {
            quoteStack.pop();
        } else if (c in quotesFwd) {
            quoteStack = [quotesFwd[c]].concat(quoteStack);
        }
    }

    return content.substring(startPos, endPos).trim();
}
