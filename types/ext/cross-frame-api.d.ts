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
import type {Response, Timeout} from './core';
import type {ModifierKey} from './input';
import type {
    ApiMap as BaseApiMap,
    ApiParams as BaseApiParams,
    ApiNames as BaseApiNames,
    ApiMapInit as BaseApiMapInit,
    ApiHandler as BaseApiHandler,
    ApiReturn as BaseApiReturn,
    ApiReturnAny as BaseApiReturnAny,
} from './api-map';
import type {
    DirectApiFrameClientMessageAny as DisplayDirectApiFrameClientMessageAny,
    DirectApiMessageAny as DisplayDirectApiMessageAny,
    DirectApiReturnAny as DisplayDirectApiReturnAny,
} from './display';
import type {ChildFrameRect} from 'frame-offset-forwarder';

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
    data: Response<ApiReturnAny>;
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
    timer: Timeout | null;
};

export type PortDetails = CrossFrameCommunicationPortDetails;

export type CrossFrameCommunicationPortDetails = {
    name: 'cross-frame-communication-port';
    otherTabId: number;
    otherFrameId: number;
};

type ApiSurface = {
    displayPopupMessage1: {
        params: DisplayDirectApiFrameClientMessageAny;
        return: DisplayDirectApiReturnAny;
    };
    displayPopupMessage2: {
        params: DisplayDirectApiMessageAny;
        return: DisplayDirectApiReturnAny;
    };
    'Frontend.closePopup': {
        params: void;
        return: void;
    };
    'Frontend.copySelection': {
        params: void;
        return: void;
    };
    'Frontend.getSelectionText': {
        params: void;
        return: string;
    };
    'Frontend.getPopupInfo': {
        params: void;
        return: {
            popupId: string | null;
        };
    };
    'Frontend.getPageInfo': {
        params: void;
        return: {
            url: string;
            documentTitle: string;
        };
    };
    'FrameOffsetForwarder.getChildFrameRect': {
        params: {
            frameId: number;
        };
        return: ChildFrameRect | null;
    };
    'HotkeyHandler.forwardHotkey': {
        params: {
            key: string;
            modifiers: ModifierKey[];
        };
        return: boolean;
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
