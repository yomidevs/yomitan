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


function utilAsync(func) {
    return function(...args) {
        func.apply(this, args);
    };
}

function utilInvoke(action, params={}) {
    const data = {action, params};
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(data, (response) => {
                utilCheckLastError(chrome.runtime.lastError);
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
            window.yomichan_orphaned = true;
            reject(e);
        }
    });
}

function utilCheckLastError(e) {
    // NOP
}
