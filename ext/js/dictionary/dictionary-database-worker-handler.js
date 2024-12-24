/*
 * Copyright (C) 2024  Yomitan Authors
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

import {log} from '../core/log.js';
import {DictionaryDatabase} from './dictionary-database.js';

export class DictionaryDatabaseWorkerHandler {
    constructor() {
        /** @type {DictionaryDatabase?} */
        this._dictionaryDatabase = null;
    }

    /**
     *
     */
    async prepare() {
        this._dictionaryDatabase = new DictionaryDatabase();
        try {
            await this._dictionaryDatabase.prepare();
        } catch (e) {
            log.error(e);
        }
        self.addEventListener('message', this._onMessage.bind(this), false);
    }
    // Private

    /**
     * @param {MessageEvent<import('dictionary-database-worker-handler').MessageToWorker>} event
     */
    _onMessage(event) {
        const {action} = event.data;
        switch (action) {
            case 'connectToDatabaseWorker':
                void this._dictionaryDatabase?.connectToDatabaseWorker(event.ports[0]);
                break;
            default:
                log.error(`Unknown action: ${action}`);
        }
    }
}
