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

export type Transform = {
    description?: string;
    heuristic: RegExp;
    id: string;
    name: string;
    rules: Rule[];
};

export type Rule = {
    conditionsIn: number;
    conditionsOut: number;
    deinflect: (inflectedWord: string) => string;
    isInflected: RegExp;
    type: 'other' | 'prefix' | 'suffix' | 'wholeWord';
};

export type TransformedText = {
    conditions: number;
    text: string;
    trace: Trace;
};

export type Trace = TraceFrame[];

export type TraceFrame = {
    ruleIndex: number;
    text: string;
    transform: string;
};

export type ConditionTypeToConditionFlagsMap = Map<string, number>;

export type LanguageTransformDescriptorInternal = {
    conditionTypeToConditionFlagsMap: ConditionTypeToConditionFlagsMap;
    partOfSpeechToConditionFlagsMap: ConditionTypeToConditionFlagsMap;
    transforms: Transform[];
};
