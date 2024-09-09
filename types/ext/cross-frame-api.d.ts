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

import type {CrossFrameAPIPort} from '../../ext/js/comm/cross-frame-api.js';
import type {Response, Timeout, TokenString} from './core';
import type {ModifierKey} from './input';
import type {ContentDetails as PopupContentDetails, ValidSize} from './popup';
import type {GetOrCreatePopupDetails} from './popup-factory';
import type {OptionsContext} from './settings';
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
    ContentDetails as DisplayContentDetails,
} from './display';
import type {ChildFrameRect} from 'frame-offset-forwarder';
import type {RequestFrameInfoResponseParams, RequestFrameInfoResponseReturn} from './frame-ancestry-handler';

export type CrossFrameAPIPortEvents = {
    disconnect: CrossFrameAPIPort;
};

export type AcknowledgeMessage = {
    id: number;
    type: 'ack';
};

export type ResultMessage = {
    data: Response<ApiReturnAny>;
    id: number;
    type: 'result';
};

export type InvokeMessage = {
    data: ApiMessageAny;
    id: number;
    type: 'invoke';
};

export type Message = AcknowledgeMessage | InvokeMessage | ResultMessage;

export type Invocation = {
    ack: boolean;
    action: string;
    id: number;
    reject: (reason: Error) => void;
    resolve: (value: ApiReturnAny) => void;
    responseTimeout: number;
    timer: null | Timeout;
};

export type PortDetails = CrossFrameCommunicationPortDetails;

export type CrossFrameCommunicationPortDetails = {
    name: 'cross-frame-communication-port';
    otherFrameId: number;
    otherTabId: number;
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
    frameAncestryHandlerRequestFrameInfoResponse: {
        params: RequestFrameInfoResponseParams;
        return: RequestFrameInfoResponseReturn;
    };
    frameOffsetForwarderGetChildFrameRect: {
        params: {
            frameId: number;
        };
        return: ChildFrameRect | null;
    };
    frontendClosePopup: {
        params: void;
        return: void;
    };
    frontendCopySelection: {
        params: void;
        return: void;
    };
    frontendGetPageInfo: {
        params: void;
        return: {
            documentTitle: string;
            url: string;
        };
    };
    frontendGetPopupInfo: {
        params: void;
        return: {
            popupId: null | string;
        };
    };
    frontendGetPopupSelectionText: {
        params: void;
        return: string;
    };
    hotkeyHandlerForwardHotkey: {
        params: {
            key: string;
            modifiers: ModifierKey[];
        };
        return: boolean;
    };
    popupFactoryClearAutoPlayTimer: {
        params: {
            id: string;
        };
        return: void;
    };
    popupFactoryClearVisibleOverride: {
        params: {
            id: string;
            token: TokenString;
        };
        return: boolean;
    };
    popupFactoryContainsPoint: {
        params: {
            id: string;
            x: number;
            y: number;
        };
        return: boolean;
    };
    popupFactoryGetFrameSize: {
        params: {
            id: string;
        };
        return: ValidSize;
    };
    popupFactoryGetOrCreatePopup: {
        params: GetOrCreatePopupDetails;
        return: {depth: number, frameId: number, id: string};
    };
    popupFactoryHide: {
        params: {
            changeFocus: boolean;
            id: string;
        };
        return: void;
    };
    popupFactoryIsVisible: {
        params: {
            id: string;
        };
        return: boolean;
    };
    popupFactorySetContentScale: {
        params: {
            id: string;
            scale: number;
        };
        return: void;
    };
    popupFactorySetCustomCss: {
        params: {
            css: string;
            id: string;
        };
        return: void;
    };
    popupFactorySetCustomOuterCss: {
        params: {
            css: string;
            id: string;
            useWebExtensionApi: boolean;
        };
        return: void;
    };
    popupFactorySetFrameSize: {
        params: {
            height: number;
            id: string;
            width: number;
        };
        return: boolean;
    };
    popupFactorySetOptionsContext: {
        params: {
            id: string;
            optionsContext: OptionsContext;
        };
        return: void;
    };
    popupFactorySetVisibleOverride: {
        params: {
            id: string;
            priority: number;
            value: boolean;
        };
        return: null | TokenString;
    };
    popupFactoryShowContent: {
        params: {
            details: PopupContentDetails;
            displayDetails: DisplayContentDetails | null;
            id: string;
        };
        return: void;
    };
    popupFactoryUpdateTheme: {
        params: {
            id: string;
        };
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
