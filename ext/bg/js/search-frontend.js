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
 * apiOptionsGet
 */

async function searchFrontendSetup() {
    await yomichan.prepare();

    const optionsContext = {
        depth: 0,
        url: window.location.href
    };
    const options = await apiOptionsGet(optionsContext);
    if (!options.scanning.enableOnSearchPage) { return; }

    const ignoreNodes = ['.scan-disable', '.scan-disable *'];
    if (!options.scanning.enableOnPopupExpressions) {
        ignoreNodes.push('.source-text', '.source-text *');
    }

    window.frontendInitializationData = {depth: 1, ignoreNodes, proxy: false};

    const scriptSrcs = [
        '/mixed/js/text-scanner.js',
        '/fg/js/frontend-api-receiver.js',
        '/fg/js/popup.js',
        '/fg/js/popup-proxy-host.js',
        '/fg/js/frontend.js',
        '/fg/js/frontend-initialize.js'
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

searchFrontendSetup();
