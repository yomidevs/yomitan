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

const dynamicLoader = (() => {
    function loadStyles(urls) {
        const parent = document.head;
        for (const url of urls) {
            const node = parent.querySelector(`link[href='${escapeCSSAttribute(url)}']`);
            if (node !== null) { continue; }

            const style = document.createElement('link');
            style.rel = 'stylesheet';
            style.type = 'text/css';
            style.href = url;
            parent.appendChild(style);
        }
    }

    function loadScripts(urls) {
        return new Promise((resolve) => {
            const parent = document.body;
            for (const url of urls) {
                const node = parent.querySelector(`script[src='${escapeCSSAttribute(url)}']`);
                if (node !== null) { continue; }

                const script = document.createElement('script');
                script.async = false;
                script.src = url;
                parent.appendChild(script);
            }

            loadScriptSentinel(resolve);
        });
    }

    function loadScriptSentinel(resolve, reject) {
        const script = document.createElement('script');

        const sentinelEventName = 'dynamicLoaderSentinel';
        const sentinelEventCallback = (e) => {
            if (e.script !== script) { return; }
            yomichan.off(sentinelEventName, sentinelEventCallback);
            resolve();
        };
        yomichan.on(sentinelEventName, sentinelEventCallback);

        try {
            script.async = false;
            script.src = '/mixed/js/dynamic-loader-sentinel.js';
            document.body.appendChild(script);
        } catch (e) {
            yomichan.off(sentinelEventName, sentinelEventCallback);
            reject(e);
        }
    }

    function escapeCSSAttribute(value) {
        return value.replace(/['\\]/g, (character) => `\\${character}`);
    }


    return {
        loadStyles,
        loadScripts
    };
})();
