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

import type * as Api from './api';

export type DatabaseUpdateType = 'dictionary';
export type DatabaseUpdateCause = 'purge' | 'delete' | 'import';

export type MecabParseResults = [
    dictionary: string,
    content: Api.ParseTextLine[],
][];

export type TabInfo = {
    tab: chrome.tabs.Tab;
    url: string | null;
};

export type FindTabsPredicate = (tabInfo: TabInfo) => boolean | Promise<boolean>;

/**
 * An enum representing the fetch error thrown by Chrome or Firefox.
 * - `net::ERR_FAILED` - Chrome error. This is potentially an error due to the extension not having enough URL privileges.
 * The message logged to the console looks like this: ```Access to fetch at '\<URL\>' from origin 'chrome-extension://<ID>' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource. If an opaque response serves your needs, set the request's mode to 'no-cors' to fetch the resource with CORS disabled.```
 * - `net::ERR_CERT_DATE_INVALID` - Chrome error.
 * - `Peer’s Certificate has expired.` - Firefox error. This error occurs when a server certificate expires.
 */
export type NetError = 'net::ERR_FAILED' | 'net::ERR_CERT_DATE_INVALID' | 'Peer’s Certificate has expired.';
