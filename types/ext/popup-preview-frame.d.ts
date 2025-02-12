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

import type {
    ApiMap as BaseApiMap,
    ApiHandler as BaseApiHandler,
    ApiParams as BaseApiParams,
    ApiNames as BaseApiNames,
    ApiReturn as BaseApiReturn,
} from './api-map';
import type {OptionsContext} from './settings';

export type ApiSurface = {
    setText: {
        params: {
            text: string;
        };
        return: void;
    };
    setCustomCss: {
        params: {
            css: string;
        };
        return: void;
    };
    setCustomOuterCss: {
        params: {
            css: string;
        };
        return: void;
    };
    updateOptionsContext: {
        params: {
            optionsContext: OptionsContext;
        };
        return: void;
    };
    setLanguageExampleText: {
        params: {
            language: string;
        };
        return: void;
    };
    updateSearch: {
        params: Record<string, never>;
        return: void;
    };
};

export type ApiParams<TName extends ApiNames> = BaseApiParams<ApiSurface[TName]>;

export type ApiNames = BaseApiNames<ApiSurface>;

export type ApiMap = BaseApiMap<ApiSurface>;

export type ApiHandler<TName extends ApiNames> = BaseApiHandler<ApiSurface[TName]>;

export type ApiReturn<TName extends ApiNames> = BaseApiReturn<ApiSurface[TName]>;

type ApiMessage<TName extends ApiNames> = {
    action: TName;
    params: ApiParams<TName>;
};

export type ApiMessageAny = {[name in ApiNames]: ApiMessage<name>}[ApiNames];
