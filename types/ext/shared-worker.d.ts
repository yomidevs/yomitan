/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import type {
    ApiMap as BaseApiMap,
    ApiMapInit as BaseApiMapInit,
    ApiHandler as BaseApiHandler,
    ApiParams as BaseApiParams,
    ApiReturn as BaseApiReturn,
    ApiNames as BaseApiNames,
    ApiParam as BaseApiParam,
    ApiParamNames as BaseApiParamNames,
    ApiParamsAny as BaseApiParamsAny,
} from './api-map';

type ApiSurface = {
    registerBackendPort: {
        params: void;
        return: void;
    };
    connectToBackend1: {
        params: void;
        return: void;
    };
};

type ApiExtraArgs = [interlocutorPort: MessagePort, ports: readonly MessagePort[]];

export type ApiNames = BaseApiNames<ApiSurface>;

export type ApiMap = BaseApiMap<ApiSurface, ApiExtraArgs>;

export type ApiMapInit = BaseApiMapInit<ApiSurface, ApiExtraArgs>;

export type ApiHandler<TName extends ApiNames> = BaseApiHandler<ApiSurface[TName], ApiExtraArgs>;

export type ApiHandlerNoExtraArgs<TName extends ApiNames> = BaseApiHandler<ApiSurface[TName], []>;

export type ApiParams<TName extends ApiNames> = BaseApiParams<ApiSurface[TName]>;

export type ApiParam<TName extends ApiNames, TParamName extends BaseApiParamNames<ApiSurface[TName]>> = BaseApiParam<ApiSurface[TName], TParamName>;

export type ApiReturn<TName extends ApiNames> = BaseApiReturn<ApiSurface[TName]>;

export type ApiParamsAny = BaseApiParamsAny<ApiSurface>;

export type ApiMessageAny = {[name in ApiNames]: ApiMessage<name>}[ApiNames];

type ApiMessage<TName extends ApiNames> = {
    action: TName;
    params: ApiParams<TName>;
};
