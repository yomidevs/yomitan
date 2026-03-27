/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

export class StartupDictionaryUpdater {
    /**
     * @param {import('startup-dictionary-updater').Dependencies} dependencies
     */
    constructor({
        isEnabled,
        hasRunThisSession,
        markRunThisSession,
        getDictionaryInfo,
        checkForUpdate,
        updateDictionary,
        onError,
    }) {
        /** @type {import('startup-dictionary-updater').Dependencies['isEnabled']} */
        this._isEnabled = isEnabled;
        /** @type {import('startup-dictionary-updater').Dependencies['hasRunThisSession']} */
        this._hasRunThisSession = hasRunThisSession;
        /** @type {import('startup-dictionary-updater').Dependencies['markRunThisSession']} */
        this._markRunThisSession = markRunThisSession;
        /** @type {import('startup-dictionary-updater').Dependencies['getDictionaryInfo']} */
        this._getDictionaryInfo = getDictionaryInfo;
        /** @type {import('startup-dictionary-updater').Dependencies['checkForUpdate']} */
        this._checkForUpdate = checkForUpdate;
        /** @type {import('startup-dictionary-updater').Dependencies['updateDictionary']} */
        this._updateDictionary = updateDictionary;
        /** @type {import('startup-dictionary-updater').Dependencies['onError']} */
        this._onError = onError;
    }

    /**
     * @returns {Promise<number>}
     */
    async run() {
        if (!await this._isEnabled()) { return 0; }
        if (await this._hasRunThisSession()) { return 0; }

        await this._markRunThisSession();

        let updateCount = 0;
        const dictionaries = await this._getDictionaryInfo();
        for (const dictionaryInfo of dictionaries) {
            let downloadUrl;
            try {
                downloadUrl = await this._checkForUpdate(dictionaryInfo);
            } catch (e) {
                this._onError(e, {dictionaryTitle: dictionaryInfo.title, phase: 'check'});
                continue;
            }

            if (downloadUrl === null) { continue; }

            try {
                await this._updateDictionary(dictionaryInfo.title, downloadUrl);
                ++updateCount;
            } catch (e) {
                this._onError(e, {dictionaryTitle: dictionaryInfo.title, phase: 'update'});
            }
        }

        return updateCount;
    }
}
