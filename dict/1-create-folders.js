/*
 * Copyright (C) 2023  Yezichak Authors
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
const {mkdirSync} = require('fs');

const folders = [
    'freq',
    'freq/metadata',
    'kaikki',
    'sentences',
    'tidy',
    'ipa',
    'language',
    'temp',
    'temp/dict',
    'temp/freq',
    'temp/ipa'
];

for (const folder of folders) {
    mkdirSync(`data/${folder}`, {recursive: true});
}