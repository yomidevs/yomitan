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
 * DisplaySearch
 * apiForwardLogsToBackend
 * apiOptionsGet
 * dynamicLoader
 */

async function injectSearchFrontend() {
    await dynamicLoader.loadScripts([
        '/mixed/js/text-scanner.js',
        '/fg/js/frontend-api-receiver.js',
        '/fg/js/frame-offset-forwarder.js',
        '/fg/js/popup.js',
        '/fg/js/popup-factory.js',
        '/fg/js/frontend.js',
        '/fg/js/content-script-main.js'
    ]);
}

(async () => {
    apiForwardLogsToBackend();
    await yomichan.prepare();

    const displaySearch = new DisplaySearch();
    await displaySearch.prepare();

    let optionsApplied = false;

    const applyOptions = async () => {
        const optionsContext = {depth: 0, url: window.location.href};
        const options = await apiOptionsGet(optionsContext);
        if (!options.scanning.enableOnSearchPage || optionsApplied) { return; }

        optionsApplied = true;
        yomichan.off('optionsUpdated', applyOptions);

        window.frontendInitializationData = {depth: 1, proxy: false, isSearchPage: true};
        await injectSearchFrontend();
    };

    yomichan.on('optionsUpdated', applyOptions);

    await applyOptions();
})();
