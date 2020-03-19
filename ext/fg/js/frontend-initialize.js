/*
 * Copyright (C) 2019-2020  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/* global
 * FrameOffsetForwarder
 * Frontend
 * PopupProxy
 * PopupProxyHost
 * apiForward
 */

async function main() {
    await yomichan.prepare();

    const data = window.frontendInitializationData || {};
    const {id, depth=0, parentFrameId, url, proxy=false} = data;

    let popup;
    if (!proxy && (window !== window.parent)) {
        let rootPopupInformationResolve;
        const rootPopupInformationPromise = new Promise((resolve) => (rootPopupInformationResolve = resolve));

        const runtimeMessageCallback = ({action, params}, sender, callback) => {
            if (action === 'rootPopupInformation') {
                chrome.runtime.onMessage.removeListener(runtimeMessageCallback);
                callback();
                rootPopupInformationResolve(params);
                return false;
            }
        };
        chrome.runtime.onMessage.addListener(runtimeMessageCallback);
        apiForward('rootPopupInformationGet');

        const {popupId, frameId} = await rootPopupInformationPromise;

        window._frameOffsetForwarder = new FrameOffsetForwarder();
        const applyFrameOffset = window._frameOffsetForwarder.applyOffset.bind(window._frameOffsetForwarder);
        popup = new PopupProxy(popupId, 0, null, frameId, url, applyFrameOffset);
        await popup.prepare();
    } else if (proxy) {
        popup = new PopupProxy(null, depth + 1, id, parentFrameId, url);
        await popup.prepare();
    } else {
        window._frameOffsetForwarder = new FrameOffsetForwarder();
        const popupHost = new PopupProxyHost();
        await popupHost.prepare();

        popup = popupHost.getOrCreatePopup(null, null, depth);
    }

    const frontend = new Frontend(popup);
    await frontend.prepare();
}

main();
