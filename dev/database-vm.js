/*
 * Copyright (C) 2020  Yomichan Authors
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

const fs = require('fs');
const url = require('url');
const path = require('path');
const {JSZip} = require('./util');
const {VM} = require('./vm');
require('fake-indexeddb/auto');

const chrome = {
    runtime: {
        getURL: (path2) => {
            return url.pathToFileURL(path.join(__dirname, '..', 'ext', path2.replace(/^\//, ''))).href;
        }
    }
};

class Image {
    constructor() {
        this._src = '';
        this._loadCallbacks = [];
    }

    get src() {
        return this._src;
    }

    set src(value) {
        this._src = value;
        this._delayTriggerLoad();
    }

    get naturalWidth() {
        return 100;
    }

    get naturalHeight() {
        return 100;
    }

    addEventListener(eventName, callback) {
        if (eventName === 'load') {
            this._loadCallbacks.push(callback);
        }
    }

    removeEventListener(eventName, callback) {
        if (eventName === 'load') {
            const index = this._loadCallbacks.indexOf(callback);
            if (index >= 0) {
                this._loadCallbacks.splice(index, 1);
            }
        }
    }

    async _delayTriggerLoad() {
        await Promise.resolve();
        for (const callback of this._loadCallbacks) {
            callback();
        }
    }
}

async function fetch(url2) {
    const filePath = url.fileURLToPath(url2);
    await Promise.resolve();
    const content = fs.readFileSync(filePath, {encoding: null});
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => Promise.resolve(content.toString('utf8')),
        json: async () => Promise.resolve(JSON.parse(content.toString('utf8')))
    };
}

class DatabaseVM extends VM {
    constructor() {
        super({
            chrome,
            Image,
            fetch,
            indexedDB: global.indexedDB,
            IDBKeyRange: global.IDBKeyRange,
            JSZip
        });
        this.context.window = this.context;
        this.indexedDB = global.indexedDB;
    }
}

module.exports = {
    DatabaseVM
};
