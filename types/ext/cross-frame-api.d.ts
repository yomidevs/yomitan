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

import type {CrossFrameAPIPort} from '../../ext/js/comm/cross-frame-api.js';
import type * as Core from './core';
import type {
    ApiMap as BaseApiMap,
    ApiParams as BaseApiParams,
    ApiNames as BaseApiNames,
    ApiMapInit as BaseApiMapInit,
    ApiHandler as BaseApiHandler,
    ApiReturn as BaseApiReturn,
    ApiReturnAny as BaseApiReturnAny,
} from './api-map';

export type CrossFrameAPIPortEvents = {
    disconnect: CrossFrameAPIPort;
};

export type AcknowledgeMessage = {
    type: 'ack';
    id: number;
};

export type ResultMessage = {
    type: 'result';
    id: number;
    data: Core.Response<ApiReturnAny>;
};

export type InvokeMessage = {
    type: 'invoke';
    id: number;
    data: ApiMessageAny;
};

export type Message = AcknowledgeMessage | ResultMessage | InvokeMessage;

export type Invocation = {
    id: number;
    resolve: (value: ApiReturnAny) => void;
    reject: (reason: Error) => void;
    responseTimeout: number;
    action: string;
    ack: boolean;
    timer: Core.Timeout | null;
};

export type PortDetails = CrossFrameCommunicationPortDetails;

export type CrossFrameCommunicationPortDetails = {
    name: 'cross-frame-communication-port';
    otherTabId: number;
    otherFrameId: number;
};

export type ApiSurface = {
    displayExtensionUnloaded: {
        params: void;
        return: void;
    };
};

export type ApiNames = BaseApiNames<ApiSurface>;

export type ApiMapInit = BaseApiMapInit<ApiSurface>;

export type ApiMap = BaseApiMap<ApiSurface, []>;

export type ApiHandler<TName extends ApiNames> = BaseApiHandler<ApiSurface[TName]>;

export type ApiParams<TName extends ApiNames> = BaseApiParams<ApiSurface[TName]>;

export type ApiReturn<TName extends ApiNames> = BaseApiReturn<ApiSurface[TName]>;

export type ApiReturnAny = BaseApiReturnAny<ApiSurface>;

export type ApiMessageAny = {[name in ApiNames]: ApiMessage<name>}[ApiNames];

type ApiMessage<TName extends ApiNames> = {
    action: TName;
    params: ApiParams<TName>;
};
