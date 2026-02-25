/*
 * Copyright (C) 2024-2025  Yomitan Authors
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


/** @type {import('language').TextProcessor} */
export const apostropheVariants = {
    name: 'Search for apostrophe variants',
    description: '\' → \u2019 and vice versa',
    process: (str) => [
        str,
        str.replace(/'/g, '\u2019'),
        str.replace(/\u2019/g, '\''),
    ],
};
