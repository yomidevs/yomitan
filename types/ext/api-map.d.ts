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
    [name: string]: ApiItem;
};

type ApiItem = {
    params: void | {[name: string]: unknown};
    return: unknown;
};

export type ApiHandler<TApiItem extends ApiItem> = (params: TApiItem['params']) => TApiItem['return'] | Promise<TApiItem['return']>;

type ApiHandlerSurface<TApiSurface extends ApiSurface> = {[name in ApiNames<TApiSurface>]: ApiHandler<TApiSurface[name]>};

export type ApiHandlerAny<TApiSurface extends ApiSurface> = ApiHandlerSurface<TApiSurface>[ApiNames<TApiSurface>];

export type ApiNames<TApiSurface extends ApiSurface> = keyof TApiSurface;

export type ApiParams<TApiItem extends ApiItem> = TApiItem['params'];

export type ApiReturn<TApiItem extends ApiItem> = TApiItem['return'];

export type ApiMap<TApiSurface extends ApiSurface> = Map<ApiNames<TApiSurface>, ApiHandlerAny<TApiSurface>>;

export type ApiMapInit<TApiSurface extends ApiSurface> = ApiMapInitItemAny<TApiSurface>[];

export type ApiMapInitLax<TApiSurface extends ApiSurface> = ApiMapInitLaxItem<TApiSurface>[];

export type ApiMapInitLaxItem<TApiSurface extends ApiSurface> = [
    name: ApiNames<TApiSurface>,
    handler: ApiHandlerAny<TApiSurface>,
];

type ApiMapInitItem<TApiSurface extends ApiSurface, TName extends ApiNames<TApiSurface>> = [
    name: TName,
    handler: ApiHandler<TApiSurface[TName]>,
];

type ApiMapInitItemAny<TApiSurface extends ApiSurface> = {[key in ApiNames<TApiSurface>]: ApiMapInitItem<TApiSurface, key>}[ApiNames<TApiSurface>];
