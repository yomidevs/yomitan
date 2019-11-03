/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
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


class Mecab {
    constructor() {
        this.listeners = {};
        this.sequence = 0;
        this.startListener();
    }

    async parseText(text) {
        return await this.invoke('parse_text', {text});
    }

    startListener() {
        this.port = chrome.runtime.connectNative('mecab');
        this.port.onMessage.addListener((message) => {
            const {sequence, data} = message;
            const {callback, timer} = this.listeners[sequence] || {};
            if (timer) {
                clearTimeout(timer);
                delete this.listeners[sequence];
                callback(data);
            }
        });
    }

    invoke(action, params) {
        return new Promise((resolve, reject) => {
            const sequence = this.sequence++;

            this.listeners[sequence] = {
                callback: (data) => {
                    resolve(data);
                },
                timer: setTimeout(() => {
                    delete this.listeners[sequence];
                    reject(`Mecab invoke timed out in ${Mecab.timeout} ms`);
                }, Mecab.timeout)
            }

            this.port.postMessage({action, params, sequence});
        });
    }
}

Mecab.timeout = 1000;
