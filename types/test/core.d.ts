/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

type Operation = 'clearOverride' | 'set.defaultValue' | 'setOverride';

type DynamicPropertyTestOperation = {
    args: [value: number, priority?: number];
    expectedDefaultValue: number;
    expectedEventOccurred: boolean;
    expectedOverrideCount: number;
    expectedValue: number;
    operation: null | Operation;
};

export type DynamicPropertyTestData = {
    initialValue: number;
    operations: DynamicPropertyTestOperation[];
}[];

export type DeepEqualTestData = {
    expected: boolean;
    value1: unknown;
    value2: unknown;
}[];
