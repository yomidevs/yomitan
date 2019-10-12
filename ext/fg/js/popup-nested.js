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


let popupNestedInitialized = false;

async function popupNestedInitialize(id, depth, parentFrameId, url) {
    if (popupNestedInitialized) {
        return;
    }
    popupNestedInitialized = true;

    const optionsContext = {depth, url};
    const options = await apiOptionsGet(optionsContext);
    const popupNestingMaxDepth = options.scanning.popupNestingMaxDepth;

    if (!(typeof popupNestingMaxDepth === 'number' && typeof depth === 'number' && depth < popupNestingMaxDepth)) {
        return;
    }

    const ignoreNodes = options.scanning.enableOnPopupExpressions ? [] : [ '.expression', '.expression *' ];

    window.frontendInitializationData = {id, depth, parentFrameId, ignoreNodes, url};

    const scriptSrcs = [
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
