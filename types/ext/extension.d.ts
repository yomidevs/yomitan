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

import type * as Core from './core';

export type ChromeRuntimeSendMessageArgs1 = [
    message: Core.SafeAny,
];

export type ChromeRuntimeSendMessageArgs2 = [
    message: Core.SafeAny,
    responseCallback: (response: Core.SafeAny) => void,
];

export type ChromeRuntimeSendMessageArgs3 = [
    message: Core.SafeAny,
    options: chrome.runtime.MessageOptions,
    responseCallback: (response: Core.SafeAny) => void,
];

export type ChromeRuntimeSendMessageArgs4 = [
    extensionId: string | undefined | null,
    message: Core.SafeAny,
    responseCallback: (response: Core.SafeAny) => void,
];

export type ChromeRuntimeSendMessageArgs5 = [
    extensionId: string | undefined | null,
    message: Core.SafeAny,
    options: chrome.runtime.MessageOptions,
    responseCallback: (response: Core.SafeAny) => void,
];

export type ChromeRuntimeSendMessageArgs = ChromeRuntimeSendMessageArgs1 | ChromeRuntimeSendMessageArgs2 | ChromeRuntimeSendMessageArgs3 | ChromeRuntimeSendMessageArgs4 | ChromeRuntimeSendMessageArgs5;

export type HtmlElementWithContentWindow = HTMLIFrameElement | HTMLFrameElement | HTMLObjectElement;

export type ContentOrigin = {
    tabId?: number;
    frameId?: number;
};

export type ChromeRuntimeOnMessageCallback<TMessage = unknown> = (
    message: TMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: ChromeRuntimeMessageSendResponseFunction,
) => boolean | void;

export type ChromeRuntimeMessageSendResponseFunction = (response?: unknown) => void;
