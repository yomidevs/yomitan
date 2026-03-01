/*
 * Copyright (C) 2026  Manabitan authors
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

const DEFAULT_DEV_DIAGNOSTICS_ENDPOINT = 'http://127.0.0.1:17352/ingest';

/**
 * @returns {chrome.runtime.Manifest|null}
 */
function getManifestOrNull() {
    const chromeValue = Reflect.get(globalThis, 'chrome');
    const runtime = /** @type {{runtime?: {getManifest?: () => chrome.runtime.Manifest}}} */ (chromeValue)?.runtime;
    if (typeof runtime?.getManifest !== 'function') { return null; }
    try {
        return runtime.getManifest();
    } catch (_) {
        return null;
    }
}

/**
 * @param {chrome.runtime.Manifest} manifest
 * @returns {boolean}
 */
function isDevBuildManifest(manifest) {
    return typeof manifest.name === 'string' && manifest.name.includes('(dev)');
}

/**
 * @returns {Promise<string|null>}
 */
async function getDiagnosticsEndpoint() {
    const manifest = getManifestOrNull();
    if (manifest === null || !isDevBuildManifest(manifest)) {
        return null;
    }
    const chromeValue = Reflect.get(globalThis, 'chrome');
    const storage = /** @type {{storage?: {local?: {get?: (keys: string[]|string, callback: (result: Record<string, unknown>) => void) => void}}}} */ (chromeValue)?.storage;
    const localGet = storage?.local?.get;
    if (typeof localGet !== 'function') {
        return DEFAULT_DEV_DIAGNOSTICS_ENDPOINT;
    }
    try {
        const result = await new Promise(/** @type {(resolve: (value: Record<string, unknown>) => void, reject: (reason?: unknown) => void) => void} */ ((resolve, reject) => {
            localGet(['manabitanDiagnosticsEndpoint'], (value) => {
                const runtimeError = /** @type {{runtime?: {lastError?: {message?: string}}}} */ (chromeValue)?.runtime?.lastError;
                if (runtimeError) {
                    reject(new Error(runtimeError.message || 'storage.local.get failed'));
                    return;
                }
                resolve(/** @type {Record<string, unknown>} */ (value));
            });
        }));
        const endpointValue = Reflect.get(result, 'manabitanDiagnosticsEndpoint');
        if (typeof endpointValue === 'string' && endpointValue.length > 0) {
            return endpointValue;
        }
    } catch (_) {
        // Fall back to default dev endpoint.
    }
    return DEFAULT_DEV_DIAGNOSTICS_ENDPOINT;
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} payload
 * @returns {void}
 */
export function reportDiagnostics(event, payload = {}) {
    void (async () => {
        const endpoint = await getDiagnosticsEndpoint();
        if (endpoint === null) { return; }
        const manifest = getManifestOrNull();
        const chromeValue = Reflect.get(globalThis, 'chrome');
        const runtimeId = /** @type {{runtime?: {id?: string}}} */ (chromeValue)?.runtime?.id;
        const contextUrlRaw = Reflect.get(globalThis, 'location');
        const hasContextUrl = (
            typeof contextUrlRaw === 'object' &&
            contextUrlRaw !== null &&
            typeof Reflect.get(contextUrlRaw, 'href') === 'string'
        );
        let contextUrl = null;
        if (hasContextUrl) {
            contextUrl = /** @type {string} */ (Reflect.get(contextUrlRaw, 'href'));
        }

        let extensionId = null;
        if (typeof runtimeId === 'string') {
            extensionId = runtimeId;
        }

        let manifestInfo = null;
        if (manifest !== null) {
            manifestInfo = {
                name: manifest.name,
                version: manifest.version,
            };
        }

        const body = {
            timestampIso: new Date().toISOString(),
            event,
            extensionId,
            manifest: manifestInfo,
            contextUrl,
            payload,
        };
        try {
            await fetch(endpoint, {
                method: 'POST',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify(body),
                keepalive: true,
                mode: 'cors',
                cache: 'no-store',
                credentials: 'omit',
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
            });
        } catch (_) {
            // Best-effort diagnostics channel.
        }
    })();
}
