/*
 * Copyright (C) 2023  Yomitan Authors
 * Copyright (C) 2016-2022  Yomichan Authors
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

/* global
 * ClipboardReader
 */

/**
 * This class controls the core logic of the extension, including API calls
 * and various forms of communication between browser tabs and external applications.
 */
class Offscreen {
    /**
     * Creates a new instance.
     */
    constructor() {
        this._clipboardReader = new ClipboardReader({
            // eslint-disable-next-line no-undef
            document: (typeof document === 'object' && document !== null ? document : null),
            pasteTargetSelector: '#clipboard-paste-target',
            richContentPasteTargetSelector: '#clipboard-rich-content-paste-target'
        });

        this._messageHandlers = new Map([
            ['clipboardGetOffscreen',                 {async: true,  contentScript: true,  handler: this._getTextHandler.bind(this)}]
        ]);

        const onMessage = this._onMessage.bind(this);
        chrome.runtime.onMessage.addListener(onMessage);
    }

    _getTextHandler({useRichText}) {
        return this._clipboardReader.getText(useRichText);
    }

    _onMessage({action, params}, sender, callback) {
        const messageHandler = this._messageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return false; }
        this._validatePrivilegedMessageSender(sender);

        return invokeMessageHandler(messageHandler, params, callback, sender);
    }

    _validatePrivilegedMessageSender(sender) {
        let {url} = sender;
        if (typeof url === 'string' && yomichan.isExtensionUrl(url)) { return; }
        const {tab} = url;
        if (typeof tab === 'object' && tab !== null) {
            ({url} = tab);
            if (typeof url === 'string' && yomichan.isExtensionUrl(url)) { return; }
        }
        throw new Error('Invalid message sender');
    }
}
