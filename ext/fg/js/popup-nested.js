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


async function popupNestedSetup() {
    const options = await apiOptionsGet();
    const popupNestingMaxDepth = options.scanning.popupNestingMaxDepth;

    let depth = null;
    const match = /[&?]depth=([^&]*?)(?:&|$)/.exec(location.href);
    if (match !== null) {
        depth = parseInt(match[1], 10);
    }

    if (!(typeof popupNestingMaxDepth === 'number' && typeof depth === 'number' && depth < popupNestingMaxDepth)) {
        return;
    }

    const scriptSrcs = [
        '/fg/js/frontend-api-sender.js',
        '/fg/js/popup.js',
        '/fg/js/popup-proxy.js',
        '/fg/js/frontend.js'
    ];
    for (const src of scriptSrcs) {
        const script = document.createElement('script');
        script.async = false;
        script.src = src;
        document.body.appendChild(script);
    }
}

popupNestedSetup();
