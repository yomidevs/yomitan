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


function invokeBgApi(action, params) {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage({action, params}, ({result, error}) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        } catch (e) {
            window.orphaned = true;
            reject(e.message);
        }
    });
}

function showError(error) {
    window.alert(`Error: ${error}`);
}

function getOptions() {
    return invokeBgApi('getOptions', {});
}

function findTerms(text) {
    return invokeBgApi('findTerms', {text});
}

function findTermsGrouped(text) {
    return invokeBgApi('findTermsGrouped', {text});
}

function findKanji(text) {
    return invokeBgApi('findKanji', {text});
}

function renderText(data, template) {
    return invokeBgApi('renderText', {data, template});
}

function canAddDefinitions(definitions, modes) {
    return invokeBgApi('canAddDefinitions', {definitions, modes}).catch(() => null);
}

function addDefinition(definition, mode) {
    return invokeBgApi('addDefinition', {definition, mode});
}

function getElementOffset(element) {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft;

    const clientTop = document.documentElement.clientTop || document.body.clientTop || 0;
    const clientLeft = document.documentElement.clientLeft || document.body.clientLeft || 0;

    const rect = element.getBoundingClientRect();
    const top  = Math.round(rect.top +  scrollTop - clientTop);
    const left = Math.round(rect.left + scrollLeft - clientLeft);

    return {top, left};
}

function createImposter(element) {
    const styleProps = window.getComputedStyle(element);
    const stylePairs = [];
    for (const key of styleProps) {
        stylePairs.push(`${key}: ${styleProps[key]};`);
    }

    const offset = getElementOffset(element);
    const imposter = document.createElement('div');
    imposter.className = 'yomichan-imposter';
    imposter.innerText = element.value;
    imposter.style.cssText = stylePairs.join('\n');
    imposter.style.position = 'absolute';
    imposter.style.top = `${offset.top}px`;
    imposter.style.left = `${offset.left}px`;
    imposter.style.zIndex = 2147483646;
    if (element.nodeName === 'TEXTAREA' && styleProps.overflow === 'visible') {
        imposter.style.overflow = 'auto';
    }

    document.body.appendChild(imposter);
    imposter.scrollTop = element.scrollTop;
    imposter.scrollLeft = element.scrollLeft;
}

function destroyImposters() {
    for (const element of document.getElementsByClassName('yomichan-imposter')) {
        element.parentNode.removeChild(element);
    }
}

function hideImposters() {
    for (const element of document.getElementsByClassName('yomichan-imposter')) {
        element.style.visibility = 'hidden';
    }
}

function textSourceFromPoint(point, imposter) {
    const element = document.elementFromPoint(point.x, point.y);
    if (element !== null) {
        if (element.nodeName === 'IMG' || element.nodeName === 'BUTTON') {
            return new TextSourceElement(element);
        } else if (imposter && (element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA')) {
            createImposter(element);
        }
    }

    const range = document.caretRangeFromPoint(point.x, point.y);
    if (range !== null) {
        hideImposters();
        return new TextSourceRange(range);
    }

    destroyImposters();
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

function buildAudioUrl(definition) {
    let kana = definition.reading;
    let kanji = definition.expression;

    if (!kana && !kanji) {
        return null;
    }

    if (!kana && wanakana.isHiragana(kanji)) {
        kana = kanji;
        kanji = null;
    }

    const params = [];
    if (kanji) {
        params.push(`kanji=${encodeURIComponent(kanji)}`);
    }
    if (kana) {
        params.push(`kana=${encodeURIComponent(kana)}`);
    }

    return `https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?${params.join('&')}`;
}

function buildAudioFilename(definition) {
    if (!definition.reading && !definition.expression) {
        return null;
    }

    let filename = 'yomichan';
    if (definition.reading) {
        filename += `_${definition.reading}`;
    }
    if (definition.expression) {
        filename += `_${definition.expression}`;
    }

    return filename += '.mp3';
}
