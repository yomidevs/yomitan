/*
 * Copyright (C) 2019 Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


class BackendApiForwarder {
    constructor() {
        chrome.runtime.onConnect.addListener(this.onConnect.bind(this));
    }

    onConnect(port) {
        if (port.name !== 'backend-api-forwarder') { return; }

        let tabId;
        if (!(
            port.sender &&
            port.sender.tab &&
            (typeof (tabId = port.sender.tab.id)) === 'number'
        )) {
            port.disconnect();
            return;
        }

        const forwardPort = chrome.tabs.connect(tabId, {name: 'frontend-api-receiver'});

        port.onMessage.addListener(message => forwardPort.postMessage(message));
        forwardPort.onMessage.addListener(message => port.postMessage(message));
        port.onDisconnect.addListener(() => forwardPort.disconnect());
        forwardPort.onDisconnect.addListener(() => port.disconnect());
    }
}
