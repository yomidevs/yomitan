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

import {describe, expect, test, vi} from 'vitest';
import {StartupDictionaryUpdater} from '../ext/js/background/startup-dictionary-updater.js';

describe('StartupDictionaryUpdater', () => {
    test('skips work when the feature is disabled', async () => {
        const getDictionaryInfo = vi.fn(async () => []);
        const updater = new StartupDictionaryUpdater({
            isEnabled: async () => false,
            hasRunThisSession: async () => false,
            markRunThisSession: async () => {},
            getDictionaryInfo,
            checkForUpdate: async () => null,
            updateDictionary: async () => {},
            onError: () => {},
        });

        expect(await updater.run()).toBe(0);
        expect(getDictionaryInfo).not.toHaveBeenCalled();
    });

    test('updates dictionaries sequentially and continues after failures', async () => {
        const updatedTitles = [];
        const errors = [];
        const markRunThisSession = vi.fn(async () => {});
        const updater = new StartupDictionaryUpdater({
            isEnabled: async () => true,
            hasRunThisSession: async () => false,
            markRunThisSession,
            getDictionaryInfo: async () => [
                {title: 'Dictionary A'},
                {title: 'Dictionary B'},
                {title: 'Dictionary C'},
            ],
            checkForUpdate: async ({title}) => {
                if (title === 'Dictionary A') { return 'https://example.invalid/a.zip'; }
                if (title === 'Dictionary B') { return 'https://example.invalid/b.zip'; }
                return null;
            },
            updateDictionary: async (dictionaryTitle) => {
                updatedTitles.push(dictionaryTitle);
                if (dictionaryTitle === 'Dictionary B') {
                    throw new Error('Update failed');
                }
            },
            onError: (error, details) => {
                errors.push({error, details});
            },
        });

        expect(await updater.run()).toBe(1);
        expect(markRunThisSession).toHaveBeenCalledTimes(1);
        expect(updatedTitles).toStrictEqual(['Dictionary A', 'Dictionary B']);
        expect(errors).toHaveLength(1);
        expect(errors[0].details).toStrictEqual({dictionaryTitle: 'Dictionary B', phase: 'update'});
    });
});
