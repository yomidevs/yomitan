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
 * apiOptionsGet
 */

function injectPopupNested() {
    const scriptSrcs = [
        '/mixed/js/text-scanner.js',
        '/fg/js/frontend-api-sender.js',
        '/fg/js/popup.js',
        '/fg/js/popup-proxy.js',
        '/fg/js/frontend.js',
        '/fg/js/frontend-initialize.js'
    ];
    for (const src of scriptSrcs) {
        const script = document.createElement('script');
        script.async = false;
        script.src = src;
        document.body.appendChild(script);
    }
}

async function popupNestedInitialize(id, depth, parentFrameId, url) {
    let optionsApplied = false;

    const applyOptions = async () => {
        const optionsContext = {depth, url};
        const options = await apiOptionsGet(optionsContext);
        const popupNestingMaxDepth = options.scanning.popupNestingMaxDepth;

        const maxPopupDepthExceeded = !(
            typeof popupNestingMaxDepth === 'number' &&
            typeof depth === 'number' &&
            depth < popupNestingMaxDepth
        );
        if (maxPopupDepthExceeded || optionsApplied) {
            return;
        }

        optionsApplied = true;

        window.frontendInitializationData = {id, depth, parentFrameId, url, proxy: true};
        injectPopupNested();

        yomichan.off('optionsUpdated', applyOptions);
    };

    yomichan.on('optionsUpdated', applyOptions);

    await applyOptions();
}
