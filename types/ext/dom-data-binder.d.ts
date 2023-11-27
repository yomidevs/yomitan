/*
 * Copyright (C) 2023  Yomitan Authors
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

import type * as TaskAccumulator from './task-accumulator';

export type CreateElementMetadataCallback<T> = (element: Element) => T | undefined;

export type CompareElementMetadataCallback<T> = (metadata1: T, metadata2: T) => boolean;

export type GetValuesCallback<T> = (args: GetValuesDetails<T>[]) => Promise<TaskResult[]>;

export type SetValuesCallback<T> = (args: SetValuesDetails<T>[]) => Promise<TaskResult[]>;

export type GetValuesDetails<T> = {
    element: Element;
    metadata: T;
};

export type SetValuesDetails<T> = {
    element: Element;
    metadata: T;
    value: ValueType;
};

export type OnErrorCallback<T> = (error: Error, stale: boolean, element: Element, metadata: T) => void;

export type ConstructorDetails<T> = {
    selector: string;
    createElementMetadata: CreateElementMetadataCallback<T>;
    compareElementMetadata: CompareElementMetadataCallback<T>;
    getValues: GetValuesCallback<T>;
    setValues: SetValuesCallback<T>;
    onError?: OnErrorCallback<T> | null;
};

export type ElementObserver<T> = {
    element: Element;
    type: NormalizedElementType;
    value: unknown;
    hasValue: boolean;
    onChange: null | (() => void);
    metadata: T;
};

export type SettingChangedEventData = {
    value: boolean | string | number;
};

export type SettingChangedEvent = CustomEvent<SettingChangedEventData>;

export type NormalizedElementType = 'textarea' | 'select' | 'text' | 'checkbox' | 'number' | null;

export type UpdateTaskValue = {all: boolean};

export type AssignTaskValue = {value: ValueType};

export type ValueType = boolean | string | number | null;

export type UpdateTask<T> = [
    key: ElementObserver<T> | null,
    task: TaskAccumulator.Task<UpdateTaskValue>,
];

export type AssignTask<T> = [
    key: ElementObserver<T> | null,
    task: TaskAccumulator.Task<AssignTaskValue>,
];

export type ApplyTarget<T> = [
    observer: ElementObserver<T>,
    task: TaskAccumulator.Task<UpdateTaskValue> | TaskAccumulator.Task<AssignTaskValue> | null,
];

export type TaskResultError = {
    error: Error;
    result?: undefined;
};

export type TaskResultSuccess<T = unknown> = {
    error?: undefined;
    result: T;
};

export type TaskResult<T = unknown> = TaskResultError | TaskResultSuccess<T>;
