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

import {TextSourceMap} from '../../ext/js/general/text-source-map.js';

export type LanguageProperties = {
    name: string;
    iso: string;
    flag: string;
    exampleText: string;
};

export type LanguagePropertiesArray = LanguageProperties[];

export type TextTransformationOption<T = unknown> = [
    value: string,
    label: string,
    option: T[],
];

export type TextTransformation<T = unknown> = {
    id: string;
    name: string;
    description: string;
    options: TextTransformationOption<T>[];
    transform: (str: string, setting: T, sourceMap?: TextSourceMap) => string;
};

export type LanguageFeatures = {
    textTransformations: TextTransformation[];
};

export type Language = LanguageProperties & LanguageFeatures;

export type LanguageMap = Map<string, Language>;