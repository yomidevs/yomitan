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

export type LanguageTransformDescriptor<TCondition extends string = string> = {
    language: string;
    conditions: ConditionMapObject<TCondition>;
    transforms: TransformMapObject<TCondition>;
};

export type ConditionMapObject<TCondition extends string> = {
    [type in TCondition]: Condition;
};

export type TransformMapObject<TCondition> = {
    [name: string]: Transform<TCondition>;
};

export type ConditionMapEntry = [type: string, condition: Condition];

export type ConditionMapEntries = ConditionMapEntry[];

export type Condition = {
    name: string;
    isDictionaryForm: boolean;
    i18n?: RuleI18n[];
    subConditions?: string[];
};

export type RuleI18n = {
    language: string;
    name: string;
};

export type Transform<TCondition> = {
    name: string;
    description?: string;
    i18n?: TransformI18n[];
    rules: Rule<TCondition>[];
};

export type TransformI18n = {
    language: string;
    name: string;
    description?: string;
};

export type DeinflectFunction = (inflectedWord: string) => string;

export type Rule<TCondition = string> = {
    type: 'suffix' | 'prefix' | 'wholeWord' | 'other';
    isInflected: RegExp; // If evaluates true, will try to deinflect
    deinflect: DeinflectFunction;
    conditionsIn: TCondition[];
    conditionsOut: TCondition[];
};

export type SuffixRule<TCondition = string> = {
    type: 'suffix';
    isInflected: RegExp;
    deinflected: string;
    deinflect: DeinflectFunction;
    conditionsIn: TCondition[];
    conditionsOut: TCondition[];
};
