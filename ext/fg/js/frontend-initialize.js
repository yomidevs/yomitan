/*
 * Copyright (C) 2019-2020  Yomichan Authors
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
 * apiBroadcastTab
 * apiOptionsGet
 */

async function main() {
    await yomichan.prepare();

    const data = window.frontendInitializationData || {};
    const {id, depth=0, parentFrameId, url, proxy=false, isSearchPage=false} = data;

    const initEventDispatcher = new EventDispatcher();

    yomichan.on('optionsUpdated', async () => {
        const optionsContext = {depth: isSearchPage ? 0 : depth, url};
        const options = await apiOptionsGet(optionsContext);
        if (isSearchPage) {
            const disabled = !options.scanning.enableOnSearchPage;
            initEventDispatcher.trigger('setDisabledOverride', {disabled});
        }
    });

    const optionsContext = {depth, url};
    const options = await apiOptionsGet(optionsContext);

    let popup;
    if (!proxy && (window !== window.parent) && options.general.showIframePopupsInRootFrame) {
        const rootPopupInformationPromise = yomichan.getTemporaryListenerResult(
            chrome.runtime.onMessage,
            ({action, params}, {resolve}) => {
                if (action === 'rootPopupInformation') {
                    resolve(params);
                }
            }
        );
        apiBroadcastTab('rootPopupRequestInformationBroadcast');
        const {popupId, frameId} = await rootPopupInformationPromise;

        const frameOffsetForwarder = new FrameOffsetForwarder();
        frameOffsetForwarder.start();
        const getFrameOffset = frameOffsetForwarder.getOffset.bind(frameOffsetForwarder);

        popup = new PopupProxy(popupId, 0, null, frameId, url, getFrameOffset);
        await popup.prepare();
    } else if (proxy) {
        popup = new PopupProxy(null, depth + 1, id, parentFrameId, url);
        await popup.prepare();
    } else {
        const frameOffsetForwarder = new FrameOffsetForwarder();
        frameOffsetForwarder.start();

        const popupHost = new PopupProxyHost();
        await popupHost.prepare();

        popup = popupHost.getOrCreatePopup(null, null, depth);
    }

    const frontend = new Frontend(popup, initEventDispatcher);
    await frontend.prepare();
}

main();
