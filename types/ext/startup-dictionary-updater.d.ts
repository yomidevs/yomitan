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

import type * as DictionaryImporter from './dictionary-importer';

export type Dependencies = {
    isEnabled: () => Promise<boolean> | boolean;
    hasRunThisSession: () => Promise<boolean> | boolean;
    markRunThisSession: () => Promise<void> | void;
    getDictionaryInfo: () => Promise<DictionaryImporter.Summary[]>;
    checkForUpdate: (dictionaryInfo: DictionaryImporter.Summary) => Promise<string | null>;
    updateDictionary: (dictionaryTitle: string, downloadUrl: string) => Promise<void>;
    onError: (error: unknown, details: {dictionaryTitle: string, phase: 'check' | 'update'}) => void;
};
