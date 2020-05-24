/*
 * Copyright (C) 2020  Yomichan Authors
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
 * DisplayFloat
 * api
 * dynamicLoader
 */

async function injectPopupNested() {
    await dynamicLoader.loadScripts([
        '/mixed/js/text-scanner.js',
        '/fg/js/frontend-api-sender.js',
        '/fg/js/popup.js',
        '/fg/js/popup-proxy.js',
        '/fg/js/frontend.js',
        '/fg/js/content-script-main.js'
    ]);
}

async function popupNestedInitialize(id, depth, parentFrameId, url) {
    let optionsApplied = false;

    const applyOptions = async () => {
        const optionsContext = {depth, url};
        const options = await api.optionsGet(optionsContext);
        const maxPopupDepthExceeded = !(typeof depth === 'number' && depth < options.scanning.popupNestingMaxDepth);
        if (maxPopupDepthExceeded || optionsApplied) { return; }

        optionsApplied = true;
        yomichan.off('optionsUpdated', applyOptions);

        window.frontendInitializationData = {id, depth, parentFrameId, url, proxy: true};
        await injectPopupNested();
    };

    yomichan.on('optionsUpdated', applyOptions);

    await applyOptions();
}

(async () => {
    api.forwardLogsToBackend();
    const display = new DisplayFloat();
    await display.prepare();
})();
