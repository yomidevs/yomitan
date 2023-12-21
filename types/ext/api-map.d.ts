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

/**
 * This type describes the structure of an API surface.
 * It is effectively just an object containing a list of items which describe a basic API functionality.
 */
type ApiSurface = {
    [name: string]: ApiDescriptor;
};

/**
 * This type describes the structure of a single API function.
 */
type ApiDescriptor = {
    /** The parameters for the function. If there are no parameters, `void` should be used. */
    params: void | {[name: string]: unknown};
    /** The return type for the function. */
    return: unknown;
};

/**
 * This type represents a mapping of an entire API surface to its handlers.
 */
type ApiHandlerSurface<TSurface extends ApiSurface> = {
    [name in ApiNames<TSurface>]: ApiHandler<TSurface[name]>;
};

/**
 * This type represents a single API map initializer.
 * Type safety is enforced by ensuring that the name and handler signature are valid.
 */
type ApiMapInitItem<TSurface extends ApiSurface, TName extends ApiNames<TSurface>> = [
    name: TName,
    handler: ApiHandler<TSurface[TName]>,
];

/**
 * This type represents a a union of all API map initializers for a given surface.
 */
type ApiMapInitItemAny<TSurface extends ApiSurface> = {[key in ApiNames<TSurface>]: ApiMapInitItem<TSurface, key>}[ApiNames<TSurface>];

/** Type alias for the params member of an descriptor. */
export type ApiParams<TDescriptor extends ApiDescriptor> = TDescriptor['params'];

/** Type alias for the return member of an descriptor. */
export type ApiReturn<TDescriptor extends ApiDescriptor> = TDescriptor['return'];

/** A type representing a synchronous handler. */
export type ApiHandlerSync<TDescriptor extends ApiDescriptor> = (params: ApiParams<TDescriptor>) => ApiReturn<TDescriptor>;

/** A type representing an asynchronous handler. */
export type ApiHandlerAsync<TDescriptor extends ApiDescriptor> = (params: ApiParams<TDescriptor>) => Promise<ApiReturn<TDescriptor>>;

/** A type representing a generic handler. */
export type ApiHandler<TDescriptor extends ApiDescriptor> = (params: ApiParams<TDescriptor>) => ApiReturn<TDescriptor> | Promise<ApiReturn<TDescriptor>>;

/** A union of all of the handlers for a given surface. */
export type ApiHandlerAny<TSurface extends ApiSurface> = ApiHandlerSurface<TSurface>[ApiNames<TSurface>];

/** A union of all of the names for a given surface. */
export type ApiNames<TSurface extends ApiSurface> = keyof TSurface;

/** A mapping of names to the corresponding handler function. */
export type ApiMap<TSurface extends ApiSurface> = Map<ApiNames<TSurface>, ApiHandlerAny<TSurface>>;

/** The initialization array structure for populating an API map. */
export type ApiMapInit<TSurface extends ApiSurface> = ApiMapInitItemAny<TSurface>[];
