/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import fs from 'fs';
import path from 'path';

/**
 * @param {string} baseDirectory
 * @param {?(fileName: string, isDirectory: boolean) => boolean} predicate
 * @returns {string[]}
 */
export function getAllFiles(baseDirectory, predicate = null) {
    const results = [];
    const directories = [baseDirectory];
    while (directories.length > 0) {
        const directory = /** @type {string} */ (directories.shift());
        const fileNames = fs.readdirSync(directory);
        for (const fileName of fileNames) {
            const fullFileName = path.join(directory, fileName);
            const relativeFileName = path.relative(baseDirectory, fullFileName);
            const stats = fs.lstatSync(fullFileName);
            if (stats.isFile()) {
                if (typeof predicate !== 'function' || predicate(relativeFileName, false)) {
                    results.push(relativeFileName);
                }
            } else if (stats.isDirectory() && (typeof predicate !== 'function' || predicate(relativeFileName, true))) {
                directories.push(fullFileName);
            }
        }
    }
    return results;
}
