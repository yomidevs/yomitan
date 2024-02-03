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

export type LanguageTransformDescriptor = {
    language: string;
    conditions: ConditionMapObject;
    transforms: Transform[];
};

export type ConditionMapObject = {
    [type: string]: Condition;
};

export type ConditionMapEntry = [type: string, condition: Condition];

export type ConditionMapEntries = ConditionMapEntry[];

export type Condition = {
    name: string;
    partsOfSpeech: string[];
    i18n?: RuleI18n[];
    subConditions?: string[];
};

export type RuleI18n = {
    language: string;
    name: string;
};

export type Transform = {
    name: string;
    description?: string;
    i18n?: TransformI18n[];
    rules: Rule[];
};

export type TransformI18n = {
    language: string;
    name: string;
    description?: string;
};

export type Rule = {
    suffixIn: string;
    suffixOut: string;
    conditionsIn: string[];
    conditionsOut: string[];
};
