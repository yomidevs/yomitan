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


/*
 * Promise
 */

function promiseCallback(promise, callback) {
    return promise.then(result => {
        callback({result});
    }).catch(error => {
        callback({error});
    });
}


/*
 * Commands
 */

function commandExec(command) {
    instYomi().onCommand(command);
}


/*
 * Instance
 */

function instYomi() {
    return chrome.extension.getBackgroundPage().yomichan;
}

function instDb() {
    return instYomi().translator.database;
}

function instAnki() {
    return instYomi().anki;
}


/*
 * Foreground
 */

function fgBroadcast(action, params) {
    chrome.tabs.query({}, tabs => {
        for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {action, params}, () => null);
        }
    });
}

function fgOptionsSet(options) {
    fgBroadcast('optionsSet', options);
}


/*
 * JSON
 */

function jsonRequest(url, action, params) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.overrideMimeType('application/json');
        xhr.addEventListener('load', () => resolve(xhr.responseText));
        xhr.addEventListener('error', () => reject('failed to execute network request'));
        xhr.open(action, url);
        if (params) {
            xhr.send(JSON.stringify(params));
        } else {
            xhr.send();
        }
    }).then(responseText => {
        try {
            return JSON.parse(responseText);
        }
        catch (e) {
            return Promise.reject('invalid JSON response');
        }
    });
}

/*
 * Helpers
 */

function handlebarsEscape(text) {
    return Handlebars.Utils.escapeExpression(text);
}

function handlebarsDumpObject(options) {
    const dump = JSON.stringify(options.fn(this), null, 4);
    return handlebarsEscape(dump);
}

function handlebarsKanjiLinks(options) {
    let result = '';
    for (const c of options.fn(this)) {
        if (jpIsKanji(c)) {
            result += `<a href="#" class="kanji-link">${c}</a>`;
        } else {
            result += c;
        }
    }

    return result;
}

function handlebarsMultiLine(options) {
    return options.fn(this).split('\n').join('<br>');
}

function handlebarsRegister() {
    Handlebars.partials = Handlebars.templates;
    Handlebars.registerHelper('dumpObject', handlebarsDumpObject);
    Handlebars.registerHelper('kanjiLinks', handlebarsKanjiLinks);
    Handlebars.registerHelper('multiLine', handlebarsMultiLine);
}

function handlebarsRender(template, data) {
    return Handlebars.templates[template](data);
}
