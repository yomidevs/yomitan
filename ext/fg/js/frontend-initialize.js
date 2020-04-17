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

async function createIframePopupProxy(url, frameOffsetForwarder) {
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

    const getFrameOffset = frameOffsetForwarder.getOffset.bind(frameOffsetForwarder);

    const popup = new PopupProxy(popupId, 0, null, frameId, url, getFrameOffset);
    await popup.prepare();

    return popup;
}

async function getOrCreatePopup(depth) {
    const popupHost = new PopupProxyHost();
    await popupHost.prepare();

    const popup = popupHost.getOrCreatePopup(null, null, depth);

    return popup;
}

async function createPopupProxy(depth, id, parentFrameId, url) {
    const popup = new PopupProxy(null, depth + 1, id, parentFrameId, url);
    await popup.prepare();

    return popup;
}

async function main() {
    await yomichan.prepare();

    const data = window.frontendInitializationData || {};
    const {id, depth=0, parentFrameId, url=window.location.href, proxy=false, isSearchPage=false} = data;

    const isIframe = !proxy && (window !== window.parent);

    const popups = {
        iframe: null,
        proxy: null,
        normal: null
    };

    let frontend = null;
    let frontendPreparePromise = null;
    let frameOffsetForwarder = null;

    const applyOptions = async () => {
        const optionsContext = {depth: isSearchPage ? 0 : depth, url};
        const options = await apiOptionsGet(optionsContext);

        if (!proxy && frameOffsetForwarder === null) {
            frameOffsetForwarder = new FrameOffsetForwarder();
            frameOffsetForwarder.start();
        }

        let popup;
        if (isIframe && options.general.showIframePopupsInRootFrame && !document.fullscreen) {
            popup = popups.iframe || await createIframePopupProxy(url, frameOffsetForwarder);
            popups.iframe = popup;
        } else if (proxy) {
            popup = popups.proxy || await createPopupProxy(depth, id, parentFrameId, url);
            popups.proxy = popup;
        } else {
            popup = popups.normal || await getOrCreatePopup(depth);
            popups.normal = popup;
        }

        if (frontend === null) {
            frontend = new Frontend(popup);
            frontendPreparePromise = frontend.prepare();
            await frontendPreparePromise;
        } else {
            await frontendPreparePromise;
            if (isSearchPage) {
                const disabled = !options.scanning.enableOnSearchPage;
                frontend.setDisabledOverride(disabled);
            }

            if (isIframe) {
                await frontend.setPopup(popup);
            }
        }
    };

    yomichan.on('optionsUpdated', applyOptions);
    window.addEventListener('fullscreenchange', applyOptions, false);

    await applyOptions();
}

main();
