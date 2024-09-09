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

export type TypeofResult = 'bigint' | 'boolean' | 'function' | 'number' | 'object' | 'string' | 'symbol' | 'undefined';

/** This type is used as an explicit way of permitting the `any` type. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SafeAny = any;

/** This type is used as an explicit way of permitting the `Function` type. */
// eslint-disable-next-line @typescript-eslint/ban-types
export type SafeFunction = Function;

/** This type is used as an explicit way of permitting the `any` type. */
export type RejectionReason = SafeAny;

/** This type is used as an explicit way of permitting the `object` type. */
export type SerializableObject = {[key: string]: unknown};

/** This type is used as an explicit way of permitting the `object` type. */
export type UnknownObject = {[key: string | symbol]: unknown};

export type TokenString = string;

export type TokenObject = Record<string, never>;

export type DeferredPromiseDetails<T = unknown> = {
    promise: Promise<T>;
    reject: (reason?: RejectionReason) => void;
    resolve: (value: T) => void;
};

export type SerializedError1 = {
    data?: unknown;
    hasValue?: undefined;
    message: string;
    name: string;
    stack: string;
};

export type SerializedError2 = {
    hasValue: true;
    value: unknown;
};

export type SerializedError = SerializedError1 | SerializedError2;

export type ResponseSuccess<T = unknown> = {
    error?: undefined;
    result: T;
};

export type ResponseError = {
    error: SerializedError;
    result?: undefined;
};

export type Response<T = unknown> = ResponseError | ResponseSuccess<T>;

export type Timeout = NodeJS.Timeout | number;

export type EventSurface = {[name: string]: unknown};

export type EventNames<TSurface extends EventSurface> = keyof TSurface & string;

export type EventArgument<TSurface extends EventSurface, TName extends EventNames<TSurface>> = TSurface[TName];

export type EventDispatcherOffGeneric = {
    off(eventName: string, callback: (...args: SafeAny) => void): boolean;
};

export type EventHandler<TSurface extends EventSurface, TName extends EventNames<TSurface>> = (details: EventArgument<TSurface, TName>) => void;

export type EventHandlerAny = (details: SafeAny) => void;
