/*
 * Copyright (C) 2020-2022  Yomichan Authors
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

async function fetch(url2) {
    const extDir = path.join(__dirname, '..', 'ext');
    let filePath;
    try {
        filePath = url.fileURLToPath(url2);
    } catch (e) {
        filePath = path.resolve(extDir, url2.replace(/^[/\\]/, ''));
    }
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

function atob(data) {
    return Buffer.from(data, 'base64').toString('ascii');
}

class DatabaseVM extends VM {
    constructor(globals={}) {
        super(Object.assign({
            chrome,
            fetch,
            indexedDB: global.indexedDB,
            IDBKeyRange: global.IDBKeyRange,
            JSZip,
            atob
        }, globals));
        this.context.window = this.context;
        this.indexedDB = global.indexedDB;
    }
}

class DatabaseVMDictionaryImporterMediaLoader {
    async getImageDetails(content) {
        // Placeholder values
        return {content, width: 100, height: 100};
    }
}

module.exports = {
    DatabaseVM,
    DatabaseVMDictionaryImporterMediaLoader
};
