/*
 * Copyright (C) 2020-2021  Yomichan Authors
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
    const injectedStylesheets = new Map();
    const injectedStylesheetsWithParent = new WeakMap();

    function getInjectedStylesheet(id, parentNode) {
        if (parentNode === null) {
            return injectedStylesheets.get(id);
        }
        const map = injectedStylesheetsWithParent.get(parentNode);
        return typeof map !== 'undefined' ? map.get(id) : void 0;
    }

    function setInjectedStylesheet(id, parentNode, value) {
        if (parentNode === null) {
            injectedStylesheets.set(id, value);
            return;
        }
        let map = injectedStylesheetsWithParent.get(parentNode);
        if (typeof map === 'undefined') {
            map = new Map();
            injectedStylesheetsWithParent.set(parentNode, map);
        }
        map.set(id, value);
    }

    async function loadStyle(id, type, value, useWebExtensionApi=false, parentNode=null) {
        if (useWebExtensionApi && yomichan.isExtensionUrl(window.location.href)) {
            // Permissions error will occur if trying to use the WebExtension API to inject into an extension page
            useWebExtensionApi = false;
        }

        let styleNode = getInjectedStylesheet(id, parentNode);
        if (typeof styleNode !== 'undefined') {
            if (styleNode === null) {
                // Previously injected via WebExtension API
                throw new Error(`Stylesheet with id ${id} has already been injected using the WebExtension API`);
            }
        } else {
            styleNode = null;
        }

        if (type === 'file-content') {
            value = await yomichan.api.getStylesheetContent(value);
            type = 'code';
            useWebExtensionApi = false;
        }

        if (useWebExtensionApi) {
            // Inject via WebExtension API
            if (styleNode !== null && styleNode.parentNode !== null) {
                styleNode.parentNode.removeChild(styleNode);
            }

            setInjectedStylesheet(id, parentNode, null);
            await yomichan.api.injectStylesheet(type, value);
            return null;
        }

        // Create node in document
        let parentNode2 = parentNode;
        if (parentNode2 === null) {
            parentNode2 = document.head;
            if (parentNode2 === null) {
                throw new Error('No parent node');
            }
        }

        // Create or reuse node
        const isFile = (type === 'file');
        const tagName = isFile ? 'link' : 'style';
        if (styleNode === null || styleNode.nodeName.toLowerCase() !== tagName) {
            if (styleNode !== null && styleNode.parentNode !== null) {
                styleNode.parentNode.removeChild(styleNode);
            }
            styleNode = document.createElement(tagName);
        }

        // Update node style
        if (isFile) {
            styleNode.rel = 'stylesheet';
            styleNode.href = value;
        } else {
            styleNode.textContent = value;
        }

        // Update parent
        if (styleNode.parentNode !== parentNode2) {
            parentNode2.appendChild(styleNode);
        }

        // Add to map
        setInjectedStylesheet(id, parentNode, styleNode);
        return styleNode;
    }

    function loadScripts(urls) {
        return new Promise((resolve, reject) => {
            const parent = document.body;
            if (parent === null) {
                reject(new Error('Missing body'));
                return;
            }

            for (const url of urls) {
                const node = parent.querySelector(`script[src='${escapeCSSAttribute(url)}']`);
                if (node !== null) { continue; }

                const script = document.createElement('script');
                script.async = false;
                script.src = url;
                parent.appendChild(script);
            }

            loadScriptSentinel(parent, resolve, reject);
        });
    }

    function loadScriptSentinel(parent, resolve, reject) {
        const script = document.createElement('script');

        const sentinelEventName = 'dynamicLoaderSentinel';
        const sentinelEventCallback = (e) => {
            if (e.script !== script) { return; }
            yomichan.off(sentinelEventName, sentinelEventCallback);
            parent.removeChild(script);
            resolve();
        };
        yomichan.on(sentinelEventName, sentinelEventCallback);

        try {
            script.async = false;
            script.src = '/js/script/dynamic-loader-sentinel.js';
            parent.appendChild(script);
        } catch (e) {
            yomichan.off(sentinelEventName, sentinelEventCallback);
            reject(e);
        }
    }

    function escapeCSSAttribute(value) {
        return value.replace(/['\\]/g, (character) => `\\${character}`);
    }


    return {
        loadStyle,
        loadScripts
    };
})();
