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
 */

function injectSearchFrontend() {
    const scriptSrcs = [
        '/mixed/js/text-scanner.js',
        '/fg/js/frontend-api-receiver.js',
        '/fg/js/frame-offset-forwarder.js',
        '/fg/js/popup.js',
        '/fg/js/popup-proxy-host.js',
        '/fg/js/frontend.js',
        '/fg/js/content-script-main.js'
    ];
    for (const src of scriptSrcs) {
        const node = document.querySelector(`script[src='${src}']`);
        if (node !== null) { continue; }

        const script = document.createElement('script');
        script.async = false;
        script.src = src;
        document.body.appendChild(script);
    }

    const styleSrcs = [
        '/fg/css/client.css'
    ];
    for (const src of styleSrcs) {
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.type = 'text/css';
        style.href = src;
        document.head.appendChild(style);
    }
}

(async () => {
    apiForwardLogsToBackend();
    await yomichan.prepare();

    const displaySearch = new DisplaySearch();
    await displaySearch.prepare();

    let optionsApplied = false;

    const applyOptions = async () => {
        const optionsContext = {
            depth: 0,
            url: window.location.href
        };
        const options = await apiOptionsGet(optionsContext);
        if (!options.scanning.enableOnSearchPage || optionsApplied) { return; }
        optionsApplied = true;

        window.frontendInitializationData = {depth: 1, proxy: false, isSearchPage: true};
        injectSearchFrontend();

        yomichan.off('optionsUpdated', applyOptions);
    };

    yomichan.on('optionsUpdated', applyOptions);

    await applyOptions();
})();
