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

export type LanguageProperties = {
    name: string;
    iso: string;
    flag: string;
    exampleText: string;
};

export type LanguagePropertiesArray = LanguageProperties[];

export type TextTransformation = {
    id: string;
    name: string;
    description: string;
    options: {
        false: 'Disabled';
        [key: string]: string;
    };
    transform: (str: string) => string;
};

export type LanguageFeatures = {
    textTransformations?: TextTransformation[];
};
export type Language = LanguageProperties & LanguageFeatures;

export type LanguageMap = Map<string, Language>;