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

import type {TokenString, EventNames, EventArgument as BaseEventArgument} from './core';
import type {SearchMode} from './display';
import type {FrameEndpointReadyDetails, FrameEndpointConnectedDetails} from './frame-client';
import type {DatabaseUpdateType, DatabaseUpdateCause} from './backend';
import type {
    ApiMap as BaseApiMap,
    ApiHandler as BaseApiHandler,
    ApiParams as BaseApiParams,
    ApiNames as BaseApiNames,
    ApiReturn as BaseApiReturn,
} from './api-map';

export type ApiSurface = {
    applicationBackendReady: {
        params: void;
        return: void;
    };
    applicationDatabaseUpdated: {
        params: {
            cause: DatabaseUpdateCause;
            type: DatabaseUpdateType;
        };
        return: void;
    };
    applicationGetUrl: {
        params: void;
        return: {
            url: string;
        };
    };
    applicationIsReady: {
        params: void;
        return: boolean;
    };
    applicationOptionsUpdated: {
        params: {
            source: string;
        };
        return: void;
    };
    applicationZoomChanged: {
        params: {
            newZoomFactor: number;
            oldZoomFactor: number;
        };
        return: void;
    };
    frameEndpointConnected: {
        params: FrameEndpointConnectedDetails;
        return: void;
    };
    frameEndpointReady: {
        params: FrameEndpointReadyDetails;
        return: void;
    };
    frontendClearAllVisibleOverride: {
        params: {
            token: TokenString;
        };
        return: boolean;
    };
    frontendReady: {
        params: {
            frameId: null | number;
        };
        return: void;
    };
    frontendRequestReadyBroadcast: {
        params: {
            frameId: null | number;
        };
        return: void;
    };
    frontendScanSelectedText: {
        params: void;
        return: void;
    };
    frontendSetAllVisibleOverride: {
        params: {
            awaitFrame: boolean;
            priority: number;
            value: boolean;
        };
        return: TokenString;
    };
    searchDisplayControllerGetMode: {
        params: void;
        return: SearchMode;
    };
    searchDisplayControllerSetMode: {
        params: {
            mode: SearchMode;
        };
        return: void;
    };
    searchDisplayControllerUpdateSearchQuery: {
        params: {
            animate: boolean;
            text: string;
        };
        return: void;
    };
};

export type ApiParams<TName extends ApiNames> = BaseApiParams<ApiSurface[TName]>;

export type ApiNames = BaseApiNames<ApiSurface>;

export type ApiMessageNoFrameId<TName extends ApiNames> = (
    ApiParams<TName> extends void ?
        {action: TName, params?: never} :
        {action: TName, params: ApiParams<TName>}
);

export type ApiMessage<TName extends ApiNames> = {
    /**
     * The origin frameId that sent this message.
     * If sent from the backend, this value will be undefined.
     */
    frameId?: number;
} & ApiMessageNoFrameId<TName>;

export type ApiMessageNoFrameIdAny = {[name in ApiNames]: ApiMessageNoFrameId<name>}[ApiNames];

export type ApiMessageAny = {[name in ApiNames]: ApiMessage<name>}[ApiNames];

export type ApiMap = BaseApiMap<ApiSurface>;

export type ApiHandler<TName extends ApiNames> = BaseApiHandler<ApiSurface[TName]>;

export type ApiReturn<TName extends ApiNames> = BaseApiReturn<ApiSurface[TName]>;

export type Events = {
    closePopups: Record<string, never>;
    databaseUpdated: {
        cause: DatabaseUpdateCause;
        type: DatabaseUpdateType;
    };
    extensionUnloaded: Record<string, never>;
    optionsUpdated: {
        source: string;
    };
    storageChanged: Record<string, never>;
    zoomChanged: {
        newZoomFactor: number;
        oldZoomFactor: number;
    };
};

export type EventArgument<TName extends EventNames<Events>> = BaseEventArgument<Events, TName>;
