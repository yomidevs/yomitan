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

type ApiSurface = {
    [name: string]: ApiDescriptor;
};

type ApiDescriptor = {
    params: void | {[name: string]: unknown};
    return: unknown;
};

export type ApiParams<TDescriptor extends ApiDescriptor> = TDescriptor['params'];

export type ApiReturn<TDescriptor extends ApiDescriptor> = TDescriptor['return'];

export type ApiHandlerSync<TDescriptor extends ApiDescriptor> = (params: ApiParams<TDescriptor>) => ApiReturn<TDescriptor>;

export type ApiHandlerAsync<TDescriptor extends ApiDescriptor> = (params: ApiParams<TDescriptor>) => Promise<ApiReturn<TDescriptor>>;

export type ApiHandler<TDescriptor extends ApiDescriptor> = (params: ApiParams<TDescriptor>) => ApiReturn<TDescriptor> | Promise<ApiReturn<TDescriptor>>;

type ApiHandlerSurface<TSurface extends ApiSurface> = {[name in ApiNames<TSurface>]: ApiHandler<TSurface[name]>};

export type ApiHandlerAny<TSurface extends ApiSurface> = ApiHandlerSurface<TSurface>[ApiNames<TSurface>];

export type ApiNames<TSurface extends ApiSurface> = keyof TSurface;

export type ApiMap<TSurface extends ApiSurface> = Map<ApiNames<TSurface>, ApiHandlerAny<TSurface>>;

export type ApiMapInit<TSurface extends ApiSurface> = ApiMapInitItemAny<TSurface>[];

type ApiMapInitItem<TSurface extends ApiSurface, TName extends ApiNames<TSurface>> = [
    name: TName,
    handler: ApiHandler<TSurface[TName]>,
];

type ApiMapInitItemAny<TSurface extends ApiSurface> = {[key in ApiNames<TSurface>]: ApiMapInitItem<TSurface, key>}[ApiNames<TSurface>];
