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

import {parseJson} from './json.js';

const DEFAULT_DEV_DIAGNOSTICS_ENDPOINT = 'http://127.0.0.1:17352/ingest';
const DEFAULT_DEV_DIAGNOSTICS_VERBOSITY = 'basic';
const DIAGNOSTICS_LOG_STORAGE_KEY = 'manabitanDiagnosticsLog';
const DIAGNOSTICS_LOG_SCHEMA_VERSION = 1;
const DIAGNOSTICS_LOG_MAX_ENTRIES = 500;
const BASIC_DIAGNOSTICS_EVENTS = new Set([
    'extension-start',
    'backend-prepare-complete',
    'backend-prepare-failed',
    'startup-health-check',
    'offscreen-opfs-preflight',
    'opfs-sqlite-init',
    'opfs-open-begin',
    'opfs-open-success',
    'opfs-open-failed',
    'opfs-delete-files-unavailable',
    'opfs-import-db-unavailable',
    'dictionary-import-session-begin',
    'dictionary-import-session-complete',
    'dictionary-import-item-complete',
    'dictionary-import-dictionary-start',
    'dictionary-import-step-complete',
    'dictionary-import-step-final',
    'dictionary-import-zip-complete',
    'dictionary-import-worker-phase-summary',
]);
/** @type {Promise<DiagnosticsConfig>|null} */
let diagnosticsConfigPromise = null;

/**
 * @typedef {{
 *   schemaVersion: number,
 *   timestampIso: string,
 *   event: string,
 *   extensionId: string|null,
 *   manifest: {name: string, version: string}|null,
 *   contextUrl: string|null,
 *   payload: unknown
 * }} DiagnosticsLogEntry
 */

/**
 * @typedef {'off'|'basic'|'verbose'} DiagnosticsVerbosity
 */

/**
 * @typedef {{
 *   enabled: boolean,
 *   endpoint: string|null,
 *   verbosity: DiagnosticsVerbosity
 * }} DiagnosticsConfig
 */

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
 * @returns {chrome.storage.LocalStorageArea|null}
 */
function getStorageLocalArea() {
    const chromeValue = Reflect.get(globalThis, 'chrome');
    const local = /** @type {{storage?: {local?: chrome.storage.LocalStorageArea}}} */ (chromeValue)?.storage?.local;
    return (
        typeof local?.get === 'function' &&
        typeof local?.set === 'function'
    ) ?
        local :
        null;
}

/**
 * @param {string[]|string} keys
 * @returns {Promise<Record<string, unknown>>}
 */
async function storageLocalGet(keys) {
    const local = getStorageLocalArea();
    if (local === null) { return {}; }
    return await new Promise((resolve, reject) => {
        local.get(keys, (result) => {
            const chromeValue = Reflect.get(globalThis, 'chrome');
            const lastError = /** @type {{runtime?: {lastError?: {message?: string}}}} */ (chromeValue)?.runtime?.lastError;
            if (lastError) {
                reject(new Error(lastError.message || 'storage.local.get failed'));
                return;
            }
            resolve(/** @type {Record<string, unknown>} */ (result || {}));
        });
    });
}

/**
 * @param {Record<string, unknown>} values
 * @returns {Promise<void>}
 */
async function storageLocalSet(values) {
    const local = getStorageLocalArea();
    if (local === null) { return; }
    await new Promise((resolve, reject) => {
        local.set(values, () => {
            const chromeValue = Reflect.get(globalThis, 'chrome');
            const lastError = /** @type {{runtime?: {lastError?: {message?: string}}}} */ (chromeValue)?.runtime?.lastError;
            if (lastError) {
                reject(new Error(lastError.message || 'storage.local.set failed'));
                return;
            }
            resolve(void 0);
        });
    });
}

/**
 * @param {string[]|string} keys
 * @returns {Promise<void>}
 */
async function storageLocalRemove(keys) {
    const local = getStorageLocalArea();
    if (local === null || typeof local.remove !== 'function') { return; }
    await new Promise((resolve, reject) => {
        local.remove(keys, () => {
            const chromeValue = Reflect.get(globalThis, 'chrome');
            const lastError = /** @type {{runtime?: {lastError?: {message?: string}}}} */ (chromeValue)?.runtime?.lastError;
            if (lastError) {
                reject(new Error(lastError.message || 'storage.local.remove failed'));
                return;
            }
            resolve(void 0);
        });
    });
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function toSerializableValue(value) {
    try {
        return parseJson(JSON.stringify(value));
    } catch (_) {
        return String(value);
    }
}

/**
 * @param {unknown} value
 * @returns {DiagnosticsLogEntry[]}
 */
function normalizeDiagnosticsLogEntries(value) {
    if (!Array.isArray(value)) { return []; }
    /** @type {DiagnosticsLogEntry[]} */
    const entries = [];
    for (const item of value) {
        if (!(typeof item === 'object' && item !== null)) { continue; }
        const timestampIso = /** @type {unknown} */ (Reflect.get(item, 'timestampIso'));
        const event = /** @type {unknown} */ (Reflect.get(item, 'event'));
        if (!(typeof timestampIso === 'string' && timestampIso.length > 0)) { continue; }
        if (!(typeof event === 'string' && event.length > 0)) { continue; }
        entries.push({
            schemaVersion: DIAGNOSTICS_LOG_SCHEMA_VERSION,
            timestampIso,
            event,
            extensionId: typeof Reflect.get(item, 'extensionId') === 'string' ? /** @type {string} */ (Reflect.get(item, 'extensionId')) : null,
            manifest: (() => {
                const manifest = /** @type {unknown} */ (Reflect.get(item, 'manifest'));
                if (!(typeof manifest === 'object' && manifest !== null)) { return null; }
                const name = /** @type {unknown} */ (Reflect.get(manifest, 'name'));
                const version = /** @type {unknown} */ (Reflect.get(manifest, 'version'));
                return (typeof name === 'string' && typeof version === 'string') ? {name, version} : null;
            })(),
            contextUrl: typeof Reflect.get(item, 'contextUrl') === 'string' ? /** @type {string} */ (Reflect.get(item, 'contextUrl')) : null,
            payload: Reflect.get(item, 'payload'),
        });
    }
    if (entries.length <= DIAGNOSTICS_LOG_MAX_ENTRIES) {
        return entries;
    }
    return entries.slice(entries.length - DIAGNOSTICS_LOG_MAX_ENTRIES);
}

/**
 * @param {DiagnosticsLogEntry} entry
 * @returns {Promise<void>}
 */
async function appendDiagnosticsLogEntry(entry) {
    try {
        const result = await storageLocalGet([DIAGNOSTICS_LOG_STORAGE_KEY]);
        const existing = normalizeDiagnosticsLogEntries(Reflect.get(result, DIAGNOSTICS_LOG_STORAGE_KEY));
        existing.push({
            schemaVersion: DIAGNOSTICS_LOG_SCHEMA_VERSION,
            timestampIso: entry.timestampIso,
            event: entry.event,
            extensionId: entry.extensionId,
            manifest: entry.manifest,
            contextUrl: entry.contextUrl,
            payload: toSerializableValue(entry.payload),
        });
        const startIndex = Math.max(0, existing.length - DIAGNOSTICS_LOG_MAX_ENTRIES);
        await storageLocalSet({
            [DIAGNOSTICS_LOG_STORAGE_KEY]: existing.slice(startIndex),
        });
    } catch (_) {
        // Best-effort local diagnostics buffer.
    }
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
 * @returns {Promise<DiagnosticsConfig>}
 */
async function getDiagnosticsConfig() {
    if (diagnosticsConfigPromise !== null) {
        return await diagnosticsConfigPromise;
    }
    diagnosticsConfigPromise = (async () => {
        const endpoint = await getDiagnosticsEndpoint();
        let enabled = true;
        /** @type {DiagnosticsVerbosity} */
        let verbosity = /** @type {DiagnosticsVerbosity} */ (DEFAULT_DEV_DIAGNOSTICS_VERBOSITY);
        const chromeValue = Reflect.get(globalThis, 'chrome');
        const storage = /** @type {{storage?: {local?: {get?: (keys: string[]|string, callback: (result: Record<string, unknown>) => void) => void}}}} */ (chromeValue)?.storage;
        const localGet = storage?.local?.get;
        if (typeof localGet === 'function') {
            try {
                const result = await new Promise(/** @type {(resolve: (value: Record<string, unknown>) => void, reject: (reason?: unknown) => void) => void} */ ((resolve, reject) => {
                    localGet(['manabitanDiagnosticsEnabled', 'manabitanDiagnosticsVerbosity'], (value) => {
                        const runtimeError = /** @type {{runtime?: {lastError?: {message?: string}}}} */ (chromeValue)?.runtime?.lastError;
                        if (runtimeError) {
                            reject(new Error(runtimeError.message || 'storage.local.get failed'));
                            return;
                        }
                        resolve(/** @type {Record<string, unknown>} */ (value));
                    });
                }));
                const enabledValue = Reflect.get(result, 'manabitanDiagnosticsEnabled');
                if (typeof enabledValue === 'boolean') {
                    enabled = enabledValue;
                }
                const verbosityValue = Reflect.get(result, 'manabitanDiagnosticsVerbosity');
                if (verbosityValue === 'off' || verbosityValue === 'basic' || verbosityValue === 'verbose') {
                    verbosity = verbosityValue;
                }
            } catch (_) {
                // Fall back to defaults.
            }
        }
        return {
            enabled,
            endpoint,
            verbosity,
        };
    })();
    return await diagnosticsConfigPromise;
}

/**
 * @param {string} event
 * @param {DiagnosticsVerbosity} verbosity
 * @returns {boolean}
 */
function shouldReportDiagnosticsEvent(event, verbosity) {
    if (verbosity === 'off') { return false; }
    if (verbosity === 'verbose') { return true; }
    return (
        BASIC_DIAGNOSTICS_EVENTS.has(event) ||
        event.endsWith('-failed') ||
        event.endsWith('-error') ||
        event.endsWith('-summary')
    );
}

/**
 * @param {number} [limit]
 * @returns {Promise<{schemaVersion: number, entryCount: number, entries: DiagnosticsLogEntry[]}>}
 */
export async function getDiagnosticsLogSnapshot(limit = DIAGNOSTICS_LOG_MAX_ENTRIES) {
    const normalizedLimit = (
        typeof limit === 'number' &&
        Number.isFinite(limit) &&
        limit > 0
    ) ?
        Math.floor(limit) :
        DIAGNOSTICS_LOG_MAX_ENTRIES;
    const result = await storageLocalGet([DIAGNOSTICS_LOG_STORAGE_KEY]);
    const entries = normalizeDiagnosticsLogEntries(Reflect.get(result, DIAGNOSTICS_LOG_STORAGE_KEY));
    const startIndex = Math.max(0, entries.length - normalizedLimit);
    return {
        schemaVersion: DIAGNOSTICS_LOG_SCHEMA_VERSION,
        entryCount: entries.length,
        entries: entries.slice(startIndex),
    };
}

/**
 * @returns {Promise<void>}
 */
export async function clearDiagnosticsLogSnapshot() {
    await storageLocalRemove(DIAGNOSTICS_LOG_STORAGE_KEY);
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} payload
 * @returns {void}
 */
export function reportDiagnostics(event, payload = {}) {
    void (async () => {
        const {enabled, endpoint, verbosity} = await getDiagnosticsConfig();
        if (!enabled) { return; }
        if (!shouldReportDiagnosticsEvent(event, verbosity)) { return; }
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
            schemaVersion: DIAGNOSTICS_LOG_SCHEMA_VERSION,
            timestampIso: new Date().toISOString(),
            event,
            extensionId,
            manifest: manifestInfo,
            contextUrl,
            payload,
        };
        await appendDiagnosticsLogEntry(body);
        if (endpoint === null) { return; }
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
