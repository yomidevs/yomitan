/*
 * Copyright (C) 2019-2020  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


function apiTemplateRender(template, data, dynamic) {
    return _apiInvoke('templateRender', {data, template, dynamic});
}

function apiAudioGetUrl(definition, source, optionsContext) {
    return _apiInvoke('audioGetUrl', {definition, source, optionsContext});
}

function apiGetDisplayTemplatesHtml() {
    return _apiInvoke('getDisplayTemplatesHtml');
}

function apiClipboardGet() {
    return _apiInvoke('clipboardGet');
}

function _apiInvoke(action, params={}) {
    const data = {action, params};
    return new Promise((resolve, reject) => {
        try {
            const callback = (response) => {
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
            };
            const backend = window.yomichanBackend;
            backend.onMessage({action, params}, null, callback);
        } catch (e) {
            reject(e);
            yomichan.triggerOrphaned(e);
        }
    });
}
