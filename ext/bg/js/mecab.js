/*
 * Copyright (C) 2019-2021  Yomichan Authors
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


class Mecab {
    constructor() {
        this.port = null;
        this.listeners = new Map();
        this.sequence = 0;
    }

    onError(error) {
        yomichan.logError(error);
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
        const rawResults = await this.invoke('parse_text', {text});
        // {
        //     'mecab-name': [
        //         // line1
        //         [
        //             {str expression: 'expression', str reading: 'reading', str source: 'source'},
        //             {str expression: 'expression2', str reading: 'reading2', str source: 'source2'}
        //         ],
        //         line2,
        //         ...
        //     ],
        //     'mecab-name2': [...]
        // }
        const results = {};
        for (const [mecabName, parsedLines] of Object.entries(rawResults)) {
            const result = [];
            for (const parsedLine of parsedLines) {
                const line = [];
                for (const {expression, reading, source} of parsedLine) {
                    line.push({
                        expression: expression || '',
                        reading: reading || '',
                        source: source || ''
                    });
                }
                result.push(line);
            }
            results[mecabName] = result;
        }
        return results;
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
        this.listeners.clear();
        this.sequence = 0;
    }

    onNativeMessage({sequence, data}) {
        const listener = this.listeners.get(sequence);
        if (typeof listener === 'undefined') { return; }

        const {callback, timer} = listener;
        clearTimeout(timer);
        callback(data);
        this.listeners.delete(sequence);
    }

    invoke(action, params) {
        if (this.port === null) {
            return Promise.resolve({});
        }
        return new Promise((resolve, reject) => {
            const sequence = this.sequence++;

            this.listeners.set(sequence, {
                callback: resolve,
                timer: setTimeout(() => {
                    this.listeners.delete(sequence);
                    reject(new Error(`Mecab invoke timed out in ${Mecab.timeout} ms`));
                }, Mecab.timeout)
            });

            this.port.postMessage({action, params, sequence});
        });
    }
}

Mecab.timeout = 5000;
Mecab.version = 1;
