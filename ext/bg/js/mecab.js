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
        this.port = null;
        this.listeners = {};
        this.sequence = 0;
    }

    onError(error) {
        logError(error, false);
    }

    async checkVersion() {
        try {
            const {version} = await this.invoke('get_version', {});
            if (version !== Mecab.version) {
                this.stopListener();
                throw new Error(`Unsupported MeCab native messenger version ${version}. Yomichan supports version ${Mecab.version}.`);
            }
        } catch (error) {
            this.onError(error);
        }
    }

    async parseText(text) {
        return await this.invoke('parse_text', {text});
    }

    startListener() {
        if (this.port !== null) { return; }
        this.port = chrome.runtime.connectNative('yomichan_mecab');
        this.port.onMessage.addListener(this.onNativeMessage.bind(this));
        this.checkVersion();
    }

    stopListener() {
        if (this.port === null) { return; }
        this.port.disconnect();
        this.port = null;
        this.listeners = {};
        this.sequence = 0;
    }

    onNativeMessage({sequence, data}) {
        if (this.listeners.hasOwnProperty(sequence)) {
            const {callback, timer} = this.listeners[sequence];
            clearTimeout(timer);
            callback(data);
            delete this.listeners[sequence];
        }
    }

    invoke(action, params) {
        if (this.port === null) {
            return {};
        }
        return new Promise((resolve, reject) => {
            const sequence = this.sequence++;

            this.listeners[sequence] = {
                callback: resolve,
                timer: setTimeout(() => {
                    delete this.listeners[sequence];
                    reject(new Error(`Mecab invoke timed out in ${Mecab.timeout} ms`));
                }, Mecab.timeout)
            }

            this.port.postMessage({action, params, sequence});
        });
    }
}

Mecab.timeout = 5000;
Mecab.version = 1;
