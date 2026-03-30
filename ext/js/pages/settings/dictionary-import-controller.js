/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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

import {ExtensionError} from '../../core/extension-error.js';
import {reportDiagnostics} from '../../core/diagnostics-reporter.js';
import {parseJson, readResponseJson} from '../../core/json.js';
import {log} from '../../core/log.js';
import {safePerformance} from '../../core/safe-performance.js';
import {toError} from '../../core/to-error.js';
import {getKebabCase} from '../../data/anki-template-util.js';
import {querySelectorNotNull} from '../../dom/query-selector.js';
import {DictionaryController} from './dictionary-controller.js';

const OPFS_REQUIRED_USER_MESSAGE = 'Manabitan requires OPFS storage support.';

/**
 * @param {number} valueMs
 * @returns {string}
 */
function formatDurationMs(valueMs) {
    return `${valueMs.toFixed(1)}ms`;
}

/**
 * @returns {{source: 'performance.memory'|'unavailable', usedJSHeapSize: number|null, totalJSHeapSize: number|null, jsHeapSizeLimit: number|null, usedHeapPercent: number|null}}
 */
function getImportMemorySnapshot() {
    const performanceValue = Reflect.get(globalThis, 'performance');
    if (!(typeof performanceValue === 'object' && performanceValue !== null)) {
        return {
            source: 'unavailable',
            usedJSHeapSize: null,
            totalJSHeapSize: null,
            jsHeapSizeLimit: null,
            usedHeapPercent: null,
        };
    }
    const memoryValue = Reflect.get(/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (performanceValue)), 'memory');
    if (!(typeof memoryValue === 'object' && memoryValue !== null)) {
        return {
            source: 'unavailable',
            usedJSHeapSize: null,
            totalJSHeapSize: null,
            jsHeapSizeLimit: null,
            usedHeapPercent: null,
        };
    }
    const memoryRecord = /** @type {Record<string, unknown>} */ (memoryValue);
    const usedJSHeapSizeRaw = Reflect.get(memoryRecord, 'usedJSHeapSize');
    const totalJSHeapSizeRaw = Reflect.get(memoryRecord, 'totalJSHeapSize');
    const jsHeapSizeLimitRaw = Reflect.get(memoryRecord, 'jsHeapSizeLimit');
    const usedJSHeapSize = typeof usedJSHeapSizeRaw === 'number' && Number.isFinite(usedJSHeapSizeRaw) ? usedJSHeapSizeRaw : null;
    const totalJSHeapSize = typeof totalJSHeapSizeRaw === 'number' && Number.isFinite(totalJSHeapSizeRaw) ? totalJSHeapSizeRaw : null;
    const jsHeapSizeLimit = typeof jsHeapSizeLimitRaw === 'number' && Number.isFinite(jsHeapSizeLimitRaw) ? jsHeapSizeLimitRaw : null;
    let usedHeapPercent = null;
    if (
        usedJSHeapSize !== null &&
        totalJSHeapSize !== null &&
        totalJSHeapSize > 0
    ) {
        usedHeapPercent = (usedJSHeapSize / totalJSHeapSize) * 100;
    }
    return {
        source: 'performance.memory',
        usedJSHeapSize,
        totalJSHeapSize,
        jsHeapSizeLimit,
        usedHeapPercent,
    };
}

/**
 * @param {{source: 'performance.memory'|'unavailable', usedJSHeapSize: number|null}} start
 * @param {{source: 'performance.memory'|'unavailable', usedJSHeapSize: number|null}} end
 * @returns {number|null}
 */
function getHeapDeltaBytes(start, end) {
    if (start.source !== 'performance.memory' || end.source !== 'performance.memory') { return null; }
    if (typeof start.usedJSHeapSize !== 'number' || typeof end.usedJSHeapSize !== 'number') { return null; }
    return end.usedJSHeapSize - start.usedJSHeapSize;
}

/**
 * @param {unknown} value
 * @returns {Array<{phase: string, elapsedMs: number, details?: Record<string, string|number|boolean|null>}>}
 */
function normalizeImporterPhaseTimings(value) {
    if (!Array.isArray(value)) { return []; }
    /** @type {Array<{phase: string, elapsedMs: number, details?: Record<string, string|number|boolean|null>}>} */
    const results = [];
    for (const item of value) {
        if (!(typeof item === 'object' && item !== null && !Array.isArray(item))) {
            continue;
        }
        const phaseRaw = /** @type {unknown} */ (Reflect.get(item, 'phase'));
        const elapsedMsRaw = /** @type {unknown} */ (Reflect.get(item, 'elapsedMs'));
        const detailsRaw = /** @type {unknown} */ (Reflect.get(item, 'details'));
        if (typeof phaseRaw !== 'string' || typeof elapsedMsRaw !== 'number' || !Number.isFinite(elapsedMsRaw)) {
            continue;
        }
        if (typeof detailsRaw === 'object' && detailsRaw !== null && !Array.isArray(detailsRaw)) {
            results.push({
                phase: phaseRaw,
                elapsedMs: Math.max(0, elapsedMsRaw),
                details: /** @type {Record<string, string|number|boolean|null>} */ (detailsRaw),
            });
            continue;
        }
        results.push({
            phase: phaseRaw,
            elapsedMs: Math.max(0, elapsedMsRaw),
        });
    }
    return results;
}

/**
 * @param {string} url
 * @returns {string}
 */
function summarizeUrlForDiagnostics(url) {
    const trimmed = url.trim();
    if (trimmed.startsWith('manabitan-e2e-dict:')) { return trimmed; }
    try {
        const parsed = new URL(trimmed);
        return `${parsed.origin}${parsed.pathname}`;
    } catch (_) {
        return trimmed;
    }
}

/**
 * @param {string} message
 * @returns {boolean}
 */
function isOpfsUnavailableMessage(message) {
    return (
        message.includes('OPFS is required') ||
        message.includes('OPFS unlink API is unavailable') ||
        message.includes('OPFS importDb API is unavailable') ||
        message.includes('no such vfs: opfs') ||
        message.includes('opfs-sahpool') ||
        message.includes('DedicatedWorkerGlobalScope') ||
        message.includes('createSyncAccessHandle')
    );
}

/**
 * @param {string} message
 * @returns {string}
 */
function getOpfsUnavailableUserMessage(message) {
    const base = OPFS_REQUIRED_USER_MESSAGE;
    const userAgent = typeof navigator?.userAgent === 'string' ? navigator.userAgent : '';
    const isFirefoxRuntime = /Firefox\//i.test(userAgent);
    const storageValue = /** @type {Record<string, unknown>} */ (Reflect.get(navigator ?? {}, 'storage') ?? {});
    const hasStorageGetDirectoryFallback = typeof Reflect.get(storageValue, 'getDirectory') === 'function';
    const hasCreateSyncAccessHandleFallback = (
        typeof Reflect.get(globalThis, 'FileSystemFileHandle') === 'function' &&
        typeof Reflect.get(
            /** @type {{prototype?: Record<string, unknown>}} */ (/** @type {unknown} */ (Reflect.get(globalThis, 'FileSystemFileHandle'))).prototype ?? {},
            'createSyncAccessHandle',
        ) === 'function'
    );
    const formatFallbackDiagnostics = () => (
        `Runtime diagnostics: storage.getDirectory=${String(hasStorageGetDirectoryFallback)}, ` +
        `createSyncAccessHandle=${String(hasCreateSyncAccessHandleFallback)}.`
    );
    const diagnosticsMatch = message.match(/diagnostics=(\{.*\})/);
    if (diagnosticsMatch === null) {
        if (isFirefoxRuntime) {
            return `${base} This Firefox extension runtime is missing the worker OPFS APIs required for SQLite + opfs-sahpool. ${formatFallbackDiagnostics()}`;
        }
        return `${base} Update to a browser/runtime which exposes worker OPFS SyncAccessHandle support and reload the extension. ${formatFallbackDiagnostics()}`;
    }
    try {
        const diagnostics = parseJson(diagnosticsMatch[1]);
        if (!(typeof diagnostics === 'object' && diagnostics !== null && !Array.isArray(diagnostics))) {
            if (isFirefoxRuntime) {
                return `${base} This Firefox extension runtime is missing the worker OPFS APIs required for SQLite + opfs-sahpool. ${formatFallbackDiagnostics()}`;
            }
            return `${base} Update to a browser/runtime which exposes worker OPFS SyncAccessHandle support and reload the extension. ${formatFallbackDiagnostics()}`;
        }
        const runtimeContext = Reflect.get(diagnostics, 'runtimeContext');
        const mode = typeof Reflect.get(diagnostics, 'mode') === 'string' ? Reflect.get(diagnostics, 'mode') : 'unknown';
        const hasStorageGetDirectory = typeof Reflect.get(runtimeContext ?? {}, 'hasStorageGetDirectory') === 'boolean' ? Reflect.get(runtimeContext ?? {}, 'hasStorageGetDirectory') : null;
        const hasCreateSyncAccessHandle = typeof Reflect.get(runtimeContext ?? {}, 'hasCreateSyncAccessHandle') === 'boolean' ? Reflect.get(runtimeContext ?? {}, 'hasCreateSyncAccessHandle') : null;
        const opfsSahpoolInstallResult = typeof Reflect.get(diagnostics, 'opfsSahpoolInstallResult') === 'string' ? Reflect.get(diagnostics, 'opfsSahpoolInstallResult') : null;
        const opfsSahpoolInstallError = typeof Reflect.get(diagnostics, 'opfsSahpoolInstallError') === 'string' ? Reflect.get(diagnostics, 'opfsSahpoolInstallError') : null;
        const opfsSahpoolVfs = typeof Reflect.get(diagnostics, 'hasOpfsSahpoolVfs') === 'boolean' ? Reflect.get(diagnostics, 'hasOpfsSahpoolVfs') : null;
        const attempts = Array.isArray(Reflect.get(diagnostics, 'attempts')) ? Reflect.get(diagnostics, 'attempts') : [];
        const lastSahpoolOpenError = attempts
            .filter((attempt) => typeof Reflect.get(attempt ?? {}, 'strategy') === 'string' && Reflect.get(attempt ?? {}, 'strategy') === 'uri-opfs-sahpool')
            .map((attempt) => typeof Reflect.get(attempt ?? {}, 'error') === 'string' ? Reflect.get(attempt ?? {}, 'error') : '')
            .filter((value) => value.length > 0)
            .at(-1) ?? null;
        const runtimeUserAgent = typeof Reflect.get(runtimeContext ?? {}, 'userAgent') === 'string' ? Reflect.get(runtimeContext ?? {}, 'userAgent') : '';
        const isFirefoxRuntimeFromDiagnostics = /Firefox\//i.test(runtimeUserAgent) || isFirefoxRuntime;
        let reason = 'Update to a browser/runtime which exposes worker OPFS SyncAccessHandle support and reload the extension.';
        if (isFirefoxRuntimeFromDiagnostics) {
            if (hasStorageGetDirectory !== true) {
                reason = 'This Firefox runtime does not expose navigator.storage.getDirectory() to the extension worker runtime.';
            } else if (hasCreateSyncAccessHandle !== true) {
                reason = 'This Firefox runtime does not expose createSyncAccessHandle() to the extension worker runtime.';
            } else {
                reason = 'This Firefox extension runtime still rejected opfs-sahpool even though the basic worker OPFS APIs are present.';
            }
        } else if (hasStorageGetDirectory !== true) {
            reason = 'This browser runtime does not expose navigator.storage.getDirectory() to the extension worker runtime.';
        } else if (hasCreateSyncAccessHandle !== true) {
            reason = 'This browser runtime does not expose createSyncAccessHandle() to the extension worker runtime.';
        }
        let sahpoolDetails = '';
        if (opfsSahpoolInstallResult !== null || opfsSahpoolVfs !== null || opfsSahpoolInstallError !== null || lastSahpoolOpenError !== null) {
            sahpoolDetails = ` opfs-sahpool: install=${String(opfsSahpoolInstallResult)}, vfs=${String(opfsSahpoolVfs)}, installError=${String(opfsSahpoolInstallError)}, openError=${String(lastSahpoolOpenError)}.`;
        }
        return `${base} ${reason} Runtime diagnostics: mode=${mode}, storage.getDirectory=${String(hasStorageGetDirectory)}, createSyncAccessHandle=${String(hasCreateSyncAccessHandle)}.${sahpoolDetails}`;
    } catch (_) {
        if (isFirefoxRuntime) {
            return `${base} This Firefox extension runtime is missing the worker OPFS APIs required for SQLite + opfs-sahpool. ${formatFallbackDiagnostics()}`;
        }
        return `${base} Update to a browser/runtime which exposes worker OPFS SyncAccessHandle support and reload the extension. ${formatFallbackDiagnostics()}`;
    }
}

/**
 * @param {string} message
 * @returns {'unsupported-opfs'|'lock-contention'|'corruption'|'transient-open-race'|'readonly-race'|'unknown'}
 */
function classifyImportOpenFailure(message) {
    const text = message.toLowerCase();
    if (
        text.includes('no such vfs') ||
        text.includes('opfs is required') ||
        text.includes('createSyncAccessHandle'.toLowerCase()) ||
        text.includes('dedicatedworkerglobalscope') ||
        text.includes('opfs-sahpool')
    ) {
        return 'unsupported-opfs';
    }
    if (
        text.includes('sqlite_busy') ||
        text.includes('database is locked') ||
        text.includes('database table is locked') ||
        text.includes('locked')
    ) {
        return 'lock-contention';
    }
    if (
        text.includes('sqlite_corrupt') ||
        text.includes('database disk image is malformed') ||
        text.includes('file is not a database')
    ) {
        return 'corruption';
    }
    if (
        text.includes('sqlite_cantopen') ||
        text.includes('unable to open database file')
    ) {
        return 'transient-open-race';
    }
    if (
        text.includes('sqlite_readonly') ||
        text.includes('readonly database') ||
        text.includes('attempt to write a readonly database')
    ) {
        return 'readonly-race';
    }
    return 'unknown';
}

/**
 * @param {number} attempt
 * @returns {number}
 */
function getImportRetryDelayMs(attempt) {
    const base = Math.min(1200, 100 * (2 ** (attempt - 1)));
    const jitter = Math.floor(Math.random() * 50);
    return base + jitter;
}

/**
 * @returns {{name: string, version: string, id: string}|null}
 */
function getExtensionBuildStamp() {
    try {
        const manifest = chrome.runtime.getManifest();
        const id = typeof chrome.runtime.id === 'string' ? chrome.runtime.id : '';
        return {
            name: typeof manifest.name === 'string' ? manifest.name : '',
            version: typeof manifest.version === 'string' ? manifest.version : '',
            id,
        };
    } catch (_) {
        return null;
    }
}

export class DictionaryImportController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     * @param {import('./modal-controller.js').ModalController} modalController
     * @param {import('./status-footer.js').StatusFooter} statusFooter
     */
    constructor(settingsController, modalController, statusFooter) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {import('./modal-controller.js').ModalController} */
        this._modalController = modalController;
        /** @type {import('./status-footer.js').StatusFooter} */
        this._statusFooter = statusFooter;
        /** @type {boolean} */
        this._modifying = false;
        /** @type {HTMLButtonElement} */
        this._purgeButton = querySelectorNotNull(document, '#dictionary-delete-all-button');
        /** @type {HTMLButtonElement} */
        this._purgeConfirmButton = querySelectorNotNull(document, '#dictionary-confirm-delete-all-button');
        /** @type {HTMLButtonElement} */
        this._importFileInput = querySelectorNotNull(document, '#dictionary-import-file-input');
        /** @type {HTMLButtonElement} */
        this._importFileDrop = querySelectorNotNull(document, '#dictionary-drop-file-zone');
        /** @type {number} */
        this._importFileDropItemCount = 0;
        /** @type {HTMLInputElement} */
        this._importButton = querySelectorNotNull(document, '#dictionary-import-button');
        /** @type {HTMLInputElement} */
        this._importURLButton = querySelectorNotNull(document, '#dictionary-import-url-button');
        /** @type {HTMLInputElement} */
        this._importURLText = querySelectorNotNull(document, '#dictionary-import-url-text');
        /** @type {?import('./modal.js').Modal} */
        this._purgeConfirmModal = null;
        /** @type {?import('./modal.js').Modal} */
        this._recommendedDictionariesModal = null;
        /** @type {HTMLElement} */
        this._errorContainer = querySelectorNotNull(document, '#dictionary-error');
        /** @type {HTMLElement|null} */
        this._recommendedDiagnosticsContainer = document.querySelector('#recommended-dictionaries-diagnostics');
        /** @type {HTMLElement|null} */
        this._recommendedErrorContainer = document.querySelector('#recommended-dictionaries-error');
        /** @type {boolean} */
        this._showRecommendedDiagnosticsInUi = (Reflect.get(globalThis, 'manabitanShowRecommendedDiagnosticsInUi') === true);
        /** @type {[originalMessage: string, newMessage: string][]} */
        this._errorToStringOverrides = [
            [
                'A mutation operation was attempted on a database that did not allow mutations.',
                'Access to IndexedDB appears to be restricted. Firefox seems to require that the history preference is set to "Remember history" before IndexedDB use of any kind is allowed.',
            ],
            [
                'The operation failed for reasons unrelated to the database itself and not covered by any other error code.',
                'Unable to access IndexedDB due to a possibly corrupt user profile. Try using the "Refresh Firefox" feature to reset your user profile.',
            ],
            [
                'OPFS is required',
                getOpfsUnavailableUserMessage('OPFS is required'),
            ],
            [
                'no such vfs: opfs',
                getOpfsUnavailableUserMessage('no such vfs: opfs'),
            ],
        ];
        /** @type {string[]} */
        this._recommendedDictionaryQueue = [];
        /** @type {boolean} */
        this._recommendedDictionaryActiveImport = false;
        /** @type {boolean} */
        this._recommendedDictionariesRenderPending = false;
        /** @type {boolean} */
        this._recommendedDictionariesPrimed = false;
        /** @type {(event: MouseEvent) => void} */
        this._onDocumentClickCaptureBind = this._onDocumentClickCapture.bind(this);
        /** @type {(event: Event) => void} */
        this._onModalVisibilityChangedEventBind = this._onModalVisibilityChangedEvent.bind(this);
        /** @type {(details: {visible: boolean}) => void} */
        this._onRecommendedDictionariesModalVisibilityChangedBind = this._onRecommendedDictionariesModalVisibilityChanged.bind(this);
        reportDiagnostics('dictionary-import-controller-constructed', {
            href: globalThis.location?.href ?? null,
        });
    }

    /** */
    prepare() {
        reportDiagnostics('dictionary-import-controller-prepare-begin', {
            href: globalThis.location?.href ?? null,
        });
        this._importModal = this._modalController.getModal('dictionary-import');
        this._purgeConfirmModal = this._modalController.getModal('dictionary-confirm-delete-all');
        this._recommendedDictionariesModal = this._modalController.getModal('recommended-dictionaries');

        this._purgeButton.addEventListener('click', this._onPurgeButtonClick.bind(this), false);
        this._purgeConfirmButton.addEventListener('click', this._onPurgeConfirmButtonClick.bind(this), false);
        this._importButton.addEventListener('click', this._onImportButtonClick.bind(this), false);
        this._importURLButton.addEventListener('click', this._onImportFromURL.bind(this), false);
        this._importFileInput.addEventListener('change', this._onImportFileChange.bind(this), false);

        this._importFileDrop.addEventListener('click', this._onImportFileButtonClick.bind(this), false);
        this._importFileDrop.addEventListener('dragenter', this._onFileDropEnter.bind(this), false);
        this._importFileDrop.addEventListener('dragover', this._onFileDropOver.bind(this), false);
        this._importFileDrop.addEventListener('dragleave', this._onFileDropLeave.bind(this), false);
        this._importFileDrop.addEventListener('drop', this._onFileDrop.bind(this), false);

        this._settingsController.on('importDictionaryFromUrl', this._onEventImportDictionaryFromUrl.bind(this));
        this._settingsController.on('importDictionaryFromFile', this._onEventImportDictionaryFromFile.bind(this));
        this._settingsController.on('downloadDictionaryFromUrl', this._onEventDownloadDictionaryFromUrl.bind(this));

        document.addEventListener('click', this._onDocumentClickCaptureBind, true);
        globalThis.addEventListener('manabitan:modal-visibility-changed', this._onModalVisibilityChangedEventBind, false);
        this._recommendedDictionariesModal?.on('visibilityChanged', this._onRecommendedDictionariesModalVisibilityChangedBind);
        globalThis.addEventListener('beforeunload', this._onBeforeUnload.bind(this), {once: true});
        reportDiagnostics('dictionary-import-controller-prepare-complete', {
            hasRecommendedModal: this._recommendedDictionariesModal !== null,
            href: globalThis.location?.href ?? null,
        });
    }

    // Private

    /**
     * @param {File} archiveContent
     * @param {import('dictionary-importer').ImportDetails} details
     * @param {?import('dictionary-worker').ImportProgressCallback} onProgress
     * @returns {Promise<import('dictionary-importer').ImportResult & {debug?: {usesFallbackStorage?: boolean, openStorageDiagnostics?: unknown, useImportSession?: boolean, finalizeImportSession?: boolean, importerDebug?: {phaseTimings?: Array<{phase: string, elapsedMs: number, details?: Record<string, string|number|boolean|null>}>|null}|null}}>}
     */
    async _tryImportDictionaryOffscreen(archiveContent, details, onProgress) {
        if (!(archiveContent instanceof Blob)) {
            throw new Error('Dictionary import requires Blob-backed archive content');
        }
        return /** @type {import('dictionary-importer').ImportResult & {debug?: {usesFallbackStorage?: boolean, openStorageDiagnostics?: unknown, useImportSession?: boolean, finalizeImportSession?: boolean, importerDebug?: {phaseTimings?: Array<{phase: string, elapsedMs: number, details?: Record<string, string|number|boolean|null>}>|null}|null}}} */ (
            await this._settingsController.application.api.importDictionaryOffscreen(archiveContent, details, onProgress)
        );
    }

    /** */
    _onBeforeUnload() {
        document.removeEventListener('click', this._onDocumentClickCaptureBind, true);
        globalThis.removeEventListener('manabitan:modal-visibility-changed', this._onModalVisibilityChangedEventBind, false);
        this._recommendedDictionariesModal?.off('visibilityChanged', this._onRecommendedDictionariesModalVisibilityChangedBind);
    }

    /**
     * @param {{visible: boolean}} details
     */
    _onRecommendedDictionariesModalVisibilityChanged({visible}) {
        if (!visible || this._recommendedDictionariesRenderPending) { return; }
        this._recommendedDictionariesRenderPending = true;
        void this._onRecommendedDictionariesOpen();
    }

    /**
     * @param {MouseEvent} e
     */
    _onDocumentClickCapture(e) {
        const target = e.target;
        if (!(target instanceof Element)) { return; }
        const actionNode = target.closest('[data-modal-action="show,recommended-dictionaries"]');
        if (!(actionNode instanceof HTMLElement)) { return; }
        reportDiagnostics('recommended-dictionaries-click-capture', {
            pending: this._recommendedDictionariesRenderPending,
            href: globalThis.location?.href ?? null,
        });
        if (this._recommendedDictionariesRenderPending) { return; }
        this._recommendedDictionariesRenderPending = true;
        void this._onRecommendedDictionariesOpen();
    }

    /**
     * @param {Event} event
     */
    _onModalVisibilityChangedEvent(event) {
        if (!(event instanceof CustomEvent)) { return; }
        const detail = /** @type {unknown} */ (event.detail);
        if (!(typeof detail === 'object' && detail !== null)) { return; }
        if (Reflect.get(detail, 'modalId') !== 'recommended-dictionaries') { return; }
        if (Reflect.get(detail, 'visible') !== true) { return; }
        reportDiagnostics('recommended-dictionaries-modal-visibility-listener', {
            pending: this._recommendedDictionariesRenderPending,
            source: Reflect.get(detail, 'source'),
            animate: Reflect.get(detail, 'animate'),
            href: globalThis.location?.href ?? null,
        });
        if (this._recommendedDictionariesRenderPending) { return; }
        reportDiagnostics('recommended-dictionaries-modal-visible-event', {
            source: Reflect.get(detail, 'source'),
            animate: Reflect.get(detail, 'animate'),
        });
        this._recommendedDictionariesRenderPending = true;
        void this._onRecommendedDictionariesOpen();
    }

    /**
     * @param {string} source
     */
    _primeRecommendedDictionaries(source) {
        if (this._recommendedDictionariesPrimed || this._recommendedDictionariesRenderPending) { return; }
        this._recommendedDictionariesRenderPending = true;
        const startedAt = safePerformance.now();
        reportDiagnostics('recommended-dictionaries-prime-begin', {
            source,
            href: globalThis.location?.href ?? null,
        });
        void (async () => {
            try {
                await this._renderRecommendedDictionaries();
                this._recommendedDictionariesPrimed = true;
                reportDiagnostics('recommended-dictionaries-prime-complete', {
                    source,
                    elapsedMs: Math.max(0, safePerformance.now() - startedAt),
                });
            } catch (error) {
                const e = toError(error);
                reportDiagnostics('recommended-dictionaries-prime-failed', {
                    source,
                    message: e.message,
                });
                log.error(e);
            } finally {
                this._recommendedDictionariesRenderPending = false;
            }
        })();
    }

    /**
     * @param {MouseEvent} e
     */
    async _onRecommendedImportClick(e) {
        if (!e.target || !(e.target instanceof HTMLButtonElement)) {
            reportDiagnostics('recommended-dictionaries-import-click-ignored', {
                reason: 'target-not-button',
                targetType: typeof e.target,
            });
            return;
        }

        const import_url = e.target.attributes.getNamedItem('data-import-url');
        if (!import_url) {
            reportDiagnostics('recommended-dictionaries-import-click-ignored', {
                reason: 'missing-data-import-url',
                buttonText: e.target.textContent ?? '',
            });
            return;
        }
        const importUrl = import_url.value;
        this._recommendedDictionaryQueue.push(importUrl);

        e.target.disabled = true;
        reportDiagnostics('recommended-dictionaries-import-clicked', {
            importUrl: summarizeUrlForDiagnostics(importUrl),
            queueLength: this._recommendedDictionaryQueue.length,
        });

        if (this._recommendedDictionaryActiveImport) { return; }

        this._recommendedDictionaryActiveImport = true;
        try {
            while (this._recommendedDictionaryQueue.length > 0) {
                const url = this._recommendedDictionaryQueue[0];
                if (!url) {
                    void this._recommendedDictionaryQueue.shift();
                    continue;
                }
                reportDiagnostics('recommended-dictionaries-import-queue-item-start', {
                    importUrl: summarizeUrlForDiagnostics(url),
                    queueLength: this._recommendedDictionaryQueue.length,
                });

                try {
                    const importProgressTracker = new ImportProgressTracker(this._getUrlImportSteps(), 1);
                    const onProgress = importProgressTracker.onProgress.bind(importProgressTracker);
                    await this._importDictionaries(
                        this._generateFilesFromUrls([url], onProgress),
                        null,
                        null,
                        importProgressTracker,
                    );
                } catch (error) {
                    const e2 = toError(error);
                    log.error(e2);
                    this._showErrors([e2]);
                    reportDiagnostics('recommended-dictionaries-import-failed', {
                        importUrl: summarizeUrlForDiagnostics(url),
                        message: e2.message,
                    });
                    this._setRecommendedImportButtonDisabled(url, false);
                } finally {
                    void this._recommendedDictionaryQueue.shift();
                    reportDiagnostics('recommended-dictionaries-import-queue-item-finished', {
                        importUrl: summarizeUrlForDiagnostics(url),
                        queueLength: this._recommendedDictionaryQueue.length,
                    });
                }
            }
        } finally {
            this._recommendedDictionaryActiveImport = false;
            reportDiagnostics('recommended-dictionaries-import-queue-idle', {
                queueLength: this._recommendedDictionaryQueue.length,
            });
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async _onRecommendedDictionariesOpen() {
        const startedAt = safePerformance.now();
        log.log('[recommended-dictionaries] open requested');
        const buildStamp = getExtensionBuildStamp();
        let buildStampText = 'build=unknown';
        if (buildStamp !== null) {
            buildStampText = `build=${buildStamp.name} v${buildStamp.version} id=${buildStamp.id}`;
        }
        this._clearRecommendedError();
        this._setRecommendedDiagnostics(`${buildStampText}\nLoading recommended dictionaries...`);
        reportDiagnostics('recommended-dictionaries-open-requested', {
            buildStamp,
        });
        try {
            await this._renderRecommendedDictionaries();
            const endedAt = safePerformance.now();
            log.log(`[recommended-dictionaries] render completed in ${formatDurationMs(endedAt - startedAt)}`);
        } catch (error) {
            const e = toError(error);
            log.error(e);
            const userError = this._errorToString(e);
            this._setRecommendedError(userError);
            this._setRecommendedDiagnostics(`FAILED to render recommended dictionaries:\n${e.message}`);
            reportDiagnostics('recommended-dictionaries-open-failed', {
                message: e.message,
            });
            if (!isOpfsUnavailableMessage(e.message)) {
                this._showErrors([e]);
            }
        } finally {
            this._recommendedDictionariesRenderPending = false;
        }
    }

    /** */
    async _renderRecommendedDictionaries() {
        const url = '../../data/recommended-dictionaries.json';
        /** @type {string[]} */
        const diagnostics = [];
        diagnostics.push(`source=${url}`);
        /** @type {import('dictionary-recommended.js').RecommendedDictionaries|null} */
        let recommendedDictionaries = null;
        try {
            const response = await fetch(url, {
                method: 'GET',
                mode: 'no-cors',
                cache: 'default',
                credentials: 'omit',
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.status}`);
            }
            recommendedDictionaries = (await readResponseJson(response));
            diagnostics.push('fetch=ok');
        } catch (error) {
            log.warn(`Using fallback recommended dictionaries due to fetch/parse error: ${toError(error).message}`);
            diagnostics.push(`fetch=failed:${toError(error).message}`);
        }
        if (!(recommendedDictionaries && typeof recommendedDictionaries === 'object' && !Array.isArray(recommendedDictionaries))) {
            recommendedDictionaries = this._getFallbackRecommendedDictionaries();
            diagnostics.push('feed=fallback');
        } else {
            diagnostics.push('feed=extension-data');
        }

        /** @type {import('dictionary-recommended.js').RecommendedDictionaryElementMap[]} */
        const recommendedDictionaryCategories = [
            {property: 'terms', element: querySelectorNotNull(querySelectorNotNull(document, '#recommended-term-dictionaries'), '.recommended-dictionary-list')},
            {property: 'kanji', element: querySelectorNotNull(querySelectorNotNull(document, '#recommended-kanji-dictionaries'), '.recommended-dictionary-list')},
            {property: 'frequency', element: querySelectorNotNull(querySelectorNotNull(document, '#recommended-frequency-dictionaries'), '.recommended-dictionary-list')},
            {property: 'grammar', element: querySelectorNotNull(querySelectorNotNull(document, '#recommended-grammar-dictionaries'), '.recommended-dictionary-list')},
            {property: 'pronunciation', element: querySelectorNotNull(querySelectorNotNull(document, '#recommended-pronunciation-dictionaries'), '.recommended-dictionary-list')},
        ];

        const language = String((await this._settingsController.getOptions()).general.language || '').trim();
        const languageCandidates = [];
        if (language.length > 0) {
            languageCandidates.push(language);
            const baseLanguage = language.split('-')[0];
            if (baseLanguage.length > 0 && baseLanguage !== language) {
                languageCandidates.push(baseLanguage);
            }
        }
        if (!languageCandidates.includes('ja')) {
            languageCandidates.push('ja');
        }
        const categories = ['terms', 'kanji', 'frequency', 'grammar', 'pronunciation'];
        let resolvedLanguage = languageCandidates.find((candidate) => candidate in recommendedDictionaries);
        if (typeof resolvedLanguage === 'string') {
            const languageConfig = /** @type {Record<string, unknown>} */ (recommendedDictionaries[resolvedLanguage]);
            const hasAnyRecommendedEntries = categories.some((category) => {
                const values = Reflect.get(languageConfig, category);
                return Array.isArray(values) && values.length > 0;
            });
            if (!hasAnyRecommendedEntries && resolvedLanguage !== 'ja' && ('ja' in recommendedDictionaries)) {
                resolvedLanguage = 'ja';
            }
        }

        if (typeof resolvedLanguage !== 'string') {
            diagnostics.push(`requestedLanguage="${language}" resolvedLanguage=none`);
            this._setRecommendedDiagnostics(diagnostics.join('\n'));
            for (const {element} of recommendedDictionaryCategories) {
                const dictionaryCategoryParent = element.parentElement;
                if (dictionaryCategoryParent) {
                    dictionaryCategoryParent.hidden = true;
                }
            }
            return;
        }

        /** @type {import('dictionary-importer').Summary[]} */
        let installedDictionaries = [];
        try {
            installedDictionaries = await this._settingsController.getDictionaryInfo();
            diagnostics.push(`installedQuery=ok count=${String(installedDictionaries.length)}`);
        } catch (error) {
            const e = toError(error);
            if (isOpfsUnavailableMessage(e.message)) {
                diagnostics.push(`installedQuery=opfs-unavailable:${e.message}`);
                this._setRecommendedDiagnostics(diagnostics.join('\n'));
                throw new Error(getOpfsUnavailableUserMessage(e.message));
            }
            log.warn(`[recommended-dictionaries] getDictionaryInfo failed; continuing with empty installed set. ${e.message}`);
            diagnostics.push(`installedQuery=failed:${e.message}`);
        }
        /** @type {Set<string>} */
        const installedDictionaryNames = new Set();
        /** @type {Set<string>} */
        const installedDictionaryDownloadUrls = new Set();
        for (const dictionary of installedDictionaries) {
            if (!(typeof dictionary === 'object' && dictionary !== null && !Array.isArray(dictionary))) {
                continue;
            }
            const titleValue = /** @type {unknown} */ (Reflect.get(dictionary, 'title'));
            const downloadUrlValue = /** @type {unknown} */ (Reflect.get(dictionary, 'downloadUrl'));
            const title = typeof titleValue === 'string' ? titleValue : '';
            const downloadUrl = typeof downloadUrlValue === 'string' ? downloadUrlValue : '';
            if (title.length > 0) {
                installedDictionaryNames.add(title);
            }
            if (downloadUrl.length > 0) {
                installedDictionaryDownloadUrls.add(downloadUrl);
            }
        }

        /** @type {number} */
        let renderedRecommendationCount = 0;
        for (const {property, element} of recommendedDictionaryCategories) {
            const languageConfig = /** @type {Record<string, unknown>} */ (recommendedDictionaries[resolvedLanguage]);
            const values = Reflect.get(languageConfig, property);
            const dictionariesForCategory = /** @type {import('dictionary-recommended.js').RecommendedDictionary[]} */ (Array.isArray(values) ? values : []);
            renderedRecommendationCount += dictionariesForCategory.length;
            this._renderRecommendedDictionaryGroup(dictionariesForCategory, element, installedDictionaryNames, installedDictionaryDownloadUrls);
        }

        if (renderedRecommendationCount === 0 && resolvedLanguage !== 'ja' && ('ja' in recommendedDictionaries)) {
            log.warn(`[recommended-dictionaries] zero entries for "${resolvedLanguage}", falling back to "ja"`);
            for (const {property, element} of recommendedDictionaryCategories) {
                const jaConfig = /** @type {Record<string, unknown>} */ (recommendedDictionaries.ja);
                const values = Reflect.get(jaConfig, property);
                const dictionariesForCategory = /** @type {import('dictionary-recommended.js').RecommendedDictionary[]} */ (Array.isArray(values) ? values : []);
                this._renderRecommendedDictionaryGroup(dictionariesForCategory, element, installedDictionaryNames, installedDictionaryDownloadUrls);
            }
            diagnostics.push('renderedFrom=ja-fallback');
        } else {
            diagnostics.push(`renderedFrom=${resolvedLanguage}`);
        }
        log.log(`[recommended-dictionaries] resolvedLanguage="${resolvedLanguage}" renderedCount=${String(renderedRecommendationCount)}`);
        diagnostics.push(
            `requestedLanguage="${language}" resolvedLanguage="${resolvedLanguage}"`,
            `renderedRecommendationCount=${String(renderedRecommendationCount)}`,
        );
        this._setRecommendedDiagnostics(diagnostics.join('\n'));
        reportDiagnostics('recommended-dictionaries-render', {
            requestedLanguage: language,
            resolvedLanguage,
            renderedRecommendationCount,
            diagnostics,
        });

        /** @type {NodeListOf<HTMLElement>} */
        const buttons = document.querySelectorAll('.action-button[data-action=import-recommended-dictionary]');
        for (const button of buttons) {
            button.addEventListener('click', this._onRecommendedImportClick.bind(this), false);
        }
    }

    /**
     * @param {string} text
     */
    _setRecommendedDiagnostics(text) {
        const container = this._recommendedDiagnosticsContainer;
        if (!(container instanceof HTMLElement)) { return; }
        if (!this._showRecommendedDiagnosticsInUi) {
            container.textContent = '';
            container.hidden = true;
            return;
        }
        container.textContent = text;
        container.hidden = false;
    }

    /**
     * @param {string} text
     */
    _setRecommendedError(text) {
        const container = this._recommendedErrorContainer;
        if (!(container instanceof HTMLElement)) { return; }
        container.textContent = text;
        container.hidden = false;
    }

    /** */
    _clearRecommendedError() {
        const container = this._recommendedErrorContainer;
        if (!(container instanceof HTMLElement)) { return; }
        container.textContent = '';
        container.hidden = true;
    }

    /**
     * @returns {import('dictionary-recommended.js').RecommendedDictionaries}
     */
    _getFallbackRecommendedDictionaries() {
        return {
            ja: {
                terms: [
                    {
                        name: 'Jitendex',
                        description: 'Japanese-to-English dictionary with example sentences and usage notes.',
                        homepage: 'https://jitendex.org',
                        downloadUrl: 'https://github.com/stephenmk/stephenmk.github.io/releases/latest/download/jitendex-yomitan.zip',
                    },
                    {
                        name: 'JMdict',
                        description: 'Large Japanese multilingual dictionary from the Electronic Dictionary Research and Development Group.',
                        homepage: 'https://www.edrdg.org/jmdict/j_jmdict.html',
                        downloadUrl: 'https://github.com/yomidevs/jmdict-yomitan/releases/latest/download/JMdict_english.zip',
                    },
                ],
                kanji: [],
                frequency: [],
                grammar: [],
                pronunciation: [],
            },
        };
    }

    /**
     *
     * @param {import('dictionary-recommended.js').RecommendedDictionary[]} recommendedDictionaries
     * @param {HTMLElement} dictionariesList
     * @param {Set<string>} installedDictionaryNames
     * @param {Set<string>} installedDictionaryDownloadUrls
     */
    _renderRecommendedDictionaryGroup(recommendedDictionaries, dictionariesList, installedDictionaryNames, installedDictionaryDownloadUrls) {
        const dictionariesListParent = dictionariesList.parentElement;
        dictionariesList.innerHTML = '';
        // Hide section if no dictionaries are available
        if (dictionariesListParent) {
            dictionariesListParent.hidden = recommendedDictionaries.length === 0;
        }
        for (const dictionary of recommendedDictionaries) {
            if (dictionariesList) {
                if (dictionariesListParent) {
                    dictionariesListParent.hidden = false;
                }
                const template = this._settingsController.instantiateTemplate('recommended-dictionaries-list-item');
                const label = querySelectorNotNull(template, '.settings-item-label');
                const description = querySelectorNotNull(template, '.description');
                /** @type {HTMLAnchorElement} */
                const homepage = querySelectorNotNull(template, '.homepage');
                /** @type {HTMLButtonElement} */
                const button = querySelectorNotNull(template, '.action-button[data-action=import-recommended-dictionary]');
                button.disabled = (
                    installedDictionaryNames.has(dictionary.name) ||
                    installedDictionaryDownloadUrls.has(dictionary.downloadUrl) ||
                    this._recommendedDictionaryQueue.includes(dictionary.downloadUrl)
                );

                const urlAttribute = document.createAttribute('data-import-url');
                urlAttribute.value = dictionary.downloadUrl;
                button.attributes.setNamedItem(urlAttribute);

                label.textContent = dictionary.name;
                description.textContent = dictionary.description;
                if (dictionary.homepage) {
                    homepage.target = '_blank';
                    homepage.href = dictionary.homepage;
                } else {
                    homepage.remove();
                }

                dictionariesList.append(template);
            }
        }
    }

    /**
     * @param {string} importUrl
     * @param {boolean} disabled
     */
    _setRecommendedImportButtonDisabled(importUrl, disabled) {
        /** @type {NodeListOf<HTMLButtonElement>} */
        const buttons = document.querySelectorAll('.action-button[data-action=import-recommended-dictionary]');
        for (const button of buttons) {
            if (button.dataset.importUrl !== importUrl) { continue; }
            button.disabled = disabled;
        }
    }

    /**
     * @param {import('settings-controller').EventArgument<'importDictionaryFromUrl'>} details
     */
    _onEventImportDictionaryFromUrl({url, profilesDictionarySettings, onImportDone, importDetailsOverrides}) {
        void this.importFilesFromURLs(url, profilesDictionarySettings, onImportDone, importDetailsOverrides ?? null);
    }

    /**
     * @param {import('settings-controller').EventArgument<'importDictionaryFromFile'>} details
     */
    _onEventImportDictionaryFromFile({files, profilesDictionarySettings, onImportDone, importDetailsOverrides}) {
        void this.importFiles(files, profilesDictionarySettings, onImportDone, importDetailsOverrides ?? null);
    }

    /**
     * @param {import('settings-controller').EventArgument<'downloadDictionaryFromUrl'>} details
     */
    _onEventDownloadDictionaryFromUrl({url, onDownloadDone}) {
        void (async () => {
            let file = null;
            try {
                file = await this.downloadDictionaryFileFromURL(url);
            } catch (error) {
                const e = toError(error);
                log.error(e);
                this._showErrors([e]);
            } finally {
                if (typeof onDownloadDone === 'function') {
                    onDownloadDone(file);
                }
            }
        })();
    }

    /** */
    _onImportFileButtonClick() {
        /** @type {HTMLInputElement} */ (this._importFileInput).click();
    }

    /**
     * @param {DragEvent} e
     */
    _onFileDropEnter(e) {
        e.preventDefault();
        if (!e.dataTransfer) { return; }
        for (const item of e.dataTransfer.items) {
            // Directories and files with no extension both show as ''
            if (item.type === '' || item.type === 'application/zip') {
                this._importFileDrop.classList.add('drag-over');
                break;
            }
        }
    }

    /**
     * @param {DragEvent} e
     */
    _onFileDropOver(e) {
        e.preventDefault();
    }

    /**
     * @param {DragEvent} e
     */
    _onFileDropLeave(e) {
        e.preventDefault();
        this._importFileDrop.classList.remove('drag-over');
    }

    /**
     * @param {DragEvent} e
     */
    async _onFileDrop(e) {
        e.preventDefault();
        this._importFileDrop.classList.remove('drag-over');
        if (e.dataTransfer === null) { return; }
        /** @type {import('./modal.js').Modal} */ (this._importModal).setVisible(false);
        /** @type {File[]} */
        const fileArray = [];
        for (const fileEntry of await this._getAllFileEntries(e.dataTransfer.items)) {
            if (!fileEntry) { return; }
            try {
                fileArray.push(await new Promise((resolve, reject) => { fileEntry.file(resolve, reject); }));
            } catch (error) {
                log.error(error);
            }
        }
        const importProgressTracker = new ImportProgressTracker(this._getFileImportSteps(), fileArray.length);
        void this._importDictionaries(
            this._arrayToAsyncGenerator(fileArray),
            null,
            null,
            importProgressTracker,
        );
    }

    /**
     * @param {DataTransferItemList} dataTransferItemList
     * @returns {Promise<FileSystemFileEntry[]>}
     */
    async _getAllFileEntries(dataTransferItemList) {
        /** @type {(FileSystemFileEntry)[]} */
        const fileEntries = [];
        /** @type {(FileSystemEntry | null)[]} */
        const entries = [];
        for (let i = 0; i < dataTransferItemList.length; i++) {
            entries.push(dataTransferItemList[i].webkitGetAsEntry());
        }
        this._importFileDropItemCount = entries.length - 1;
        while (entries.length > 0) {
            this._importFileDropItemCount += 1;
            this._validateDirectoryItemCount();

            /** @type {(FileSystemEntry | null) | undefined} */
            const entry = entries.shift();
            if (!entry) { continue; }
            if (entry.isFile) {
                if (entry.name.substring(entry.name.lastIndexOf('.'), entry.name.length) === '.zip') {
                    // @ts-expect-error - ts does not recognize `if (entry.isFile)` as verifying `entry` is type `FileSystemFileEntry` and instanceof does not work
                    fileEntries.push(entry);
                }
            } else if (entry.isDirectory) {
                // @ts-expect-error - ts does not recognize `if (entry.isDirectory)` as verifying `entry` is type `FileSystemDirectoryEntry` and instanceof does not work
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                entries.push(...await this._readAllDirectoryEntries(entry.createReader()));
            }
        }
        return fileEntries;
    }

    /**
     * @param {FileSystemDirectoryReader} directoryReader
     * @returns {Promise<(FileSystemEntry)[]>}
     */
    async _readAllDirectoryEntries(directoryReader) {
        const entries = [];
        /** @type {(FileSystemEntry)[]} */
        let readEntries = await new Promise((resolve) => { directoryReader.readEntries(resolve); });
        while (readEntries.length > 0) {
            this._importFileDropItemCount += readEntries.length;
            this._validateDirectoryItemCount();

            entries.push(...readEntries);
            readEntries = await new Promise((resolve) => { directoryReader.readEntries(resolve); });
        }
        return entries;
    }

    /**
     * @throws
     */
    _validateDirectoryItemCount() {
        if (this._importFileDropItemCount > 1000) {
            this._importFileDropItemCount = 0;
            const errorText = 'Directory upload item count too large';
            this._showErrors([new Error(errorText)]);
            throw new Error(errorText);
        }
    }

    /**
     * @param {MouseEvent} e
     */
    _onImportButtonClick(e) {
        e.preventDefault();
        /** @type {import('./modal.js').Modal} */ (this._importModal).setVisible(true);
    }

    /**
     * @param {MouseEvent} e
     */
    _onPurgeButtonClick(e) {
        e.preventDefault();
        /** @type {import('./modal.js').Modal} */ (this._purgeConfirmModal).setVisible(true);
    }

    /**
     * @param {MouseEvent} e
     */
    _onPurgeConfirmButtonClick(e) {
        e.preventDefault();
        /** @type {import('./modal.js').Modal} */ (this._purgeConfirmModal).setVisible(false);
        void this._purgeDatabase();
    }

    /**
     * @param {Event} e
     */
    async _onImportFileChange(e) {
        /** @type {import('./modal.js').Modal} */ (this._importModal).setVisible(false);
        const node = /** @type {HTMLInputElement} */ (e.currentTarget);
        const {files} = node;
        if (files === null) { return; }
        const files2 = [...files];
        node.value = '';
        void this._importDictionaries(
            this._arrayToAsyncGenerator(files2),
            null,
            null,
            new ImportProgressTracker(this._getFileImportSteps(), files2.length),
        );
    }

    /** */
    async _onImportFromURL() {
        const text = this._importURLText.value.trim();
        if (!text) { return; }
        await this.importFilesFromURLs(text, null, null);
    }

    /**
     * @param {string} text
     * @param {import('settings-controller').ProfilesDictionarySettings} profilesDictionarySettings
     * @param {import('settings-controller').ImportDictionaryDoneCallback} onImportDone
     */
    async importFilesFromURLs(text, profilesDictionarySettings, onImportDone, importDetailsOverrides = null) {
        const urls = text.split('\n');

        const importProgressTracker = new ImportProgressTracker(this._getUrlImportSteps(), urls.length);
        const onProgress = importProgressTracker.onProgress.bind(importProgressTracker);
        void this._importDictionaries(
            this._generateFilesFromUrls(urls, onProgress),
            profilesDictionarySettings,
            onImportDone,
            importProgressTracker,
            importDetailsOverrides,
        );
    }

    /**
     * @param {File[]} files
     * @param {import('settings-controller').ProfilesDictionarySettings} profilesDictionarySettings
     * @param {import('settings-controller').ImportDictionaryDoneCallback} onImportDone
     */
    async importFiles(files, profilesDictionarySettings, onImportDone, importDetailsOverrides = null) {
        const importProgressTracker = new ImportProgressTracker(this._getFileImportSteps(), files.length);
        void this._importDictionaries(
            this._arrayToAsyncGenerator(files),
            profilesDictionarySettings,
            onImportDone,
            importProgressTracker,
            importDetailsOverrides,
        );
    }

    /**
     * @param {string} url
     * @returns {Promise<File>}
     */
    async downloadDictionaryFileFromURL(url) {
        const generator = this._generateFilesFromUrls([url], () => {});
        const result = await generator.next();
        if (result.done || !(result.value instanceof File)) {
            throw new Error(`Failed to download dictionary from ${url}`);
        }
        return result.value;
    }

    /**
     * @param {string[]} urls
     * @param {import('dictionary-worker').ImportProgressCallback} onProgress
     * @yields {Promise<File>}
     * @returns {AsyncGenerator<File, void, void>}
     */
    async *_generateFilesFromUrls(urls, onProgress) {
        for (const url of urls) {
            onProgress({nextStep: true, index: 0, count: 0});
            const trimmedUrl = url.trim();
            const downloadStartTime = safePerformance.now();
            log.log(`[ImportTiming] download started: ${trimmedUrl}`);
            reportDiagnostics('dictionary-url-download-begin', {
                url: summarizeUrlForDiagnostics(trimmedUrl),
            });

            try {
                if (trimmedUrl.startsWith('manabitan-e2e-dict:')) {
                    const inlineArchiveBase64 = this._getInlineArchiveBase64ForUrl(trimmedUrl);
                    if (typeof inlineArchiveBase64 !== 'string') {
                        throw new Error(`Missing inline archive for ${trimmedUrl}`);
                    }
                    const tokenName = trimmedUrl.slice('manabitan-e2e-dict:'.length).trim();
                    const safeName = tokenName.length > 0 ? tokenName.replaceAll(/[^a-zA-Z0-9._-]/g, '-') : 'fileFromURL';
                    const file = new File([this._base64ToUint8Array(inlineArchiveBase64)], `${safeName}.zip`, {type: 'application/zip'});
                    const downloadEndTime = safePerformance.now();
                    log.log(`[ImportTiming] download completed in ${formatDurationMs(downloadEndTime - downloadStartTime)}: ${trimmedUrl} (inline archive)`);
                    reportDiagnostics('dictionary-url-download-complete', {
                        url: summarizeUrlForDiagnostics(trimmedUrl),
                        inline: true,
                        elapsedMs: Math.max(0, downloadEndTime - downloadStartTime),
                        sizeBytes: file.size,
                    });
                    yield file;
                    continue;
                }

                const xhr = new XMLHttpRequest();
                xhr.open('GET', trimmedUrl, true);
                xhr.responseType = 'blob';

                xhr.onprogress = (event) => {
                    if (event.lengthComputable) {
                        onProgress({nextStep: false, index: event.loaded, count: event.total});
                    }
                };

                /** @type {Promise<File>} */
                const blobPromise = new Promise((resolve, reject) => {
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            if (xhr.response instanceof Blob) {
                                resolve(new File([xhr.response], 'fileFromURL'));
                            } else {
                                reject(new Error(`Failed to fetch blob from ${trimmedUrl}`));
                            }
                        } else {
                            reject(new Error(`Failed to fetch the URL: ${trimmedUrl}`));
                        }
                    };

                    xhr.onerror = () => {
                        reject(new Error(`Error fetching URL: ${trimmedUrl}`));
                    };
                });

                xhr.send();

                const file = await blobPromise;
                const downloadEndTime = safePerformance.now();
                log.log(`[ImportTiming] download completed in ${formatDurationMs(downloadEndTime - downloadStartTime)}: ${trimmedUrl}`);
                reportDiagnostics('dictionary-url-download-complete', {
                    url: summarizeUrlForDiagnostics(trimmedUrl),
                    inline: false,
                    elapsedMs: Math.max(0, downloadEndTime - downloadStartTime),
                    sizeBytes: file.size,
                });
                yield file;
            } catch (error) {
                const downloadEndTime = safePerformance.now();
                log.log(`[ImportTiming] download failed after ${formatDurationMs(downloadEndTime - downloadStartTime)}: ${trimmedUrl}`);
                reportDiagnostics('dictionary-url-download-failed', {
                    url: summarizeUrlForDiagnostics(trimmedUrl),
                    elapsedMs: Math.max(0, downloadEndTime - downloadStartTime),
                    message: toError(error).message,
                });
                if (trimmedUrl.startsWith('manabitan-e2e-dict:')) {
                    throw error;
                }
                log.error(error);
            }
        }
    }

    /**
     * @param {string} url
     * @returns {string|null}
     */
    _getInlineArchiveBase64ForUrl(url) {
        if (!url.startsWith('manabitan-e2e-dict:')) { return null; }
        const source = globalThis.localStorage?.getItem('manabitanE2eArchiveMap') || '';
        if (source.length === 0) { return null; }
        /** @type {unknown} */
        let value;
        try {
            value = parseJson(source);
        } catch (_error) {
            return null;
        }
        if (!(value && typeof value === 'object' && !Array.isArray(value))) { return null; }
        const content = /** @type {unknown} */ (Reflect.get(value, url));
        return (typeof content === 'string' && content.length > 0) ? content : null;
    }

    /**
     * @param {string} base64
     * @returns {Uint8Array}
     */
    _base64ToUint8Array(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; ++i) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /** */
    async _purgeDatabase() {
        if (this._modifying) { return; }

        const prevention = this._preventPageExit();

        try {
            this._setModifying(true);
            this._hideErrors();

            await this._settingsController.application.api.purgeDatabase();
            const errors = await this._clearDictionarySettings();

            if (errors.length > 0) {
                this._showErrors(errors);
            }
        } catch (error) {
            this._showErrors([toError(error)]);
        } finally {
            prevention.end();
            this._setModifying(false);
            this._triggerStorageChanged();
        }
    }

    /**
     * @param {AsyncGenerator<File, void, void>} dictionaries
     * @param {import('settings-controller').ProfilesDictionarySettings} profilesDictionarySettings
     * @param {import('settings-controller').ImportDictionaryDoneCallback} onImportDone
     * @param {ImportProgressTracker} importProgressTracker
     */
    async _importDictionaries(dictionaries, profilesDictionarySettings, onImportDone, importProgressTracker, importDetailsOverrides = null) {
        if (this._modifying) { return; }

        const statusFooter = this._statusFooter;
        const progressSelector = '.dictionary-import-progress';
        const progressContainers = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll(`#dictionaries-modal ${progressSelector}`));
        const recommendedProgressContainers = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll(`#recommended-dictionaries-modal ${progressSelector}`));

        const prevention = this._preventPageExit();

        const onProgress = importProgressTracker.onProgress.bind(importProgressTracker);
        Reflect.set(globalThis, '__manabitanImportStepTimingHistory', []);

        /** @type {Error[]} */
        let errors = [];
        const useImportSession = this._getUseImportSession();
        log.log(`[ImportTiming] import session reuse enabled=${String(useImportSession)} (globalOverride=${String(this._getUseImportSession())})`);
        reportDiagnostics('dictionary-import-session-begin', {
            dictionaryCount: importProgressTracker.dictionaryCount,
            useImportSession,
            hasProfilesDictionarySettings: profilesDictionarySettings !== null,
        });
        let importModeEnabled = false;
        const importStartTime = safePerformance.now();
        try {
            this._setModifying(true);
            this._hideErrors();
            await this._settingsController.application.api.setDictionaryImportMode(true);
            importModeEnabled = true;

            for (const progress of [...progressContainers, ...recommendedProgressContainers]) { progress.hidden = false; }

            const optionsFull = await this._settingsController.getOptionsFull();
            const {
                skipImageMetadata,
                mediaResolutionConcurrency,
                debugImportLogging,
                enableTermEntryContentDedup,
                termContentStorageMode,
            } = this._getImportPerformanceFlags();
            const importDetails = {
                prefixWildcardsSupported: optionsFull.global.database.prefixWildcardsSupported,
                yomitanVersion: chrome.runtime.getManifest().version,
                skipImageMetadata,
                mediaResolutionConcurrency,
                debugImportLogging,
                enableTermEntryContentDedup,
                termContentStorageMode,
                ...(importDetailsOverrides && typeof importDetailsOverrides === 'object' && !Array.isArray(importDetailsOverrides) ? importDetailsOverrides : {}),
            };

            for (let i = 0; i < importProgressTracker.dictionaryCount; ++i) {
                importProgressTracker.onNextDictionary();
                if (statusFooter !== null) { statusFooter.setTaskActive(progressSelector, true); }
                const dictionaryLoopStartTime = safePerformance.now();
                const finalizeImportSession = useImportSession && i >= (importProgressTracker.dictionaryCount - 1);
                reportDiagnostics('dictionary-import-item-begin', {
                    index: i + 1,
                    dictionaryCount: importProgressTracker.dictionaryCount,
                    finalizeImportSession,
                });
                const nextDictionary = await dictionaries.next();
                const fileValue = nextDictionary.done ? null : nextDictionary.value;
                /** @type {File} */
                let file;
                if (fileValue instanceof File) {
                    file = fileValue;
                } else if (fileValue && typeof fileValue === 'object') {
                    const blobPart = /** @type {BlobPart} */ (fileValue);
                    file = new File([blobPart], 'fileFromURL.zip', {type: 'application/zip'});
                } else {
                    errors.push(new Error(`Failed to read file ${i + 1} of ${importProgressTracker.dictionaryCount} (value-type=${typeof fileValue}, value=${String(fileValue)}).`));
                    reportDiagnostics('dictionary-import-item-invalid-file', {
                        index: i + 1,
                        dictionaryCount: importProgressTracker.dictionaryCount,
                        valueType: typeof fileValue,
                    });
                    continue;
                }
                errors = [
                    ...errors,
                    ...(await this._importDictionaryFromZip(
                        file,
                        profilesDictionarySettings,
                        importDetails,
                        useImportSession,
                        finalizeImportSession,
                        onProgress,
                    ) ?? []),
                ];
                const dictionaryLoopEndTime = safePerformance.now();
                log.log(`[ImportTiming] dictionary ${i + 1}/${importProgressTracker.dictionaryCount} total ${formatDurationMs(dictionaryLoopEndTime - dictionaryLoopStartTime)}`);
                reportDiagnostics('dictionary-import-item-complete', {
                    index: i + 1,
                    dictionaryCount: importProgressTracker.dictionaryCount,
                    elapsedMs: Math.max(0, dictionaryLoopEndTime - dictionaryLoopStartTime),
                    cumulativeErrorCount: errors.length,
                    fileName: file.name || null,
                    memory: getImportMemorySnapshot(),
                });
            }
        } catch (error) {
            errors.push(toError(error));
            reportDiagnostics('dictionary-import-session-error', {
                message: toError(error).message,
            });
        } finally {
            importProgressTracker.onImportComplete(errors.length);
            Reflect.set(globalThis, '__manabitanImportStepTimingHistory', importProgressTracker.getStepTimingHistory());
            const importEndTime = safePerformance.now();
            log.log(`[ImportTiming] import session complete in ${formatDurationMs(importEndTime - importStartTime)} (errors=${errors.length})`);
            reportDiagnostics('dictionary-import-session-complete', {
                dictionaryCount: importProgressTracker.dictionaryCount,
                elapsedMs: Math.max(0, importEndTime - importStartTime),
                errorCount: errors.length,
                memory: getImportMemorySnapshot(),
            });
            this._showErrors(errors);
            prevention.end();
            for (const progress of [...progressContainers, ...recommendedProgressContainers]) { progress.hidden = true; }
            if (statusFooter !== null) { statusFooter.setTaskActive(progressSelector, false); }
            this._setModifying(false);
            if (importModeEnabled) {
                try {
                    await this._settingsController.application.api.setDictionaryImportMode(false);
                } catch (error) {
                    log.error(error);
                }
            }
            this._triggerStorageChanged();
            if (onImportDone) { onImportDone(); }
        }
    }

    /**
     * @returns {import('dictionary-importer').ImportSteps}
     */
    _getFileImportSteps() {
        return [
            {label: ''}, // Dictionary import is uninitialized
            {label: 'Initializing import'}, // Dictionary import is uninitialized
            {label: 'Loading dictionary'}, // Load dictionary archive and read index
            {label: 'Importing data'}, // Parse archive banks and import data
            {label: 'Finalizing import'}, // Update dictionary descriptor
        ];
    }

    /**
     * @returns {import('dictionary-importer').ImportSteps}
     */
    _getUrlImportSteps() {
        const urlImportSteps = this._getFileImportSteps();
        urlImportSteps.splice(2, 0, {label: 'Downloading dictionary'});
        return urlImportSteps;
    }

    /**
     * @returns {{skipImageMetadata: boolean, mediaResolutionConcurrency: number, debugImportLogging: boolean, enableTermEntryContentDedup: boolean, termContentStorageMode: 'baseline'|'raw-bytes', preserveCompressedMedia: boolean}}
     */
    _getImportPerformanceFlags() {
        const flags = /** @type {unknown} */ (Reflect.get(globalThis, 'manabitanImportPerformanceFlags'));
        if (typeof flags !== 'object' || flags === null || Array.isArray(flags)) {
            return {
                skipImageMetadata: false,
                mediaResolutionConcurrency: 8,
                debugImportLogging: false,
                enableTermEntryContentDedup: true,
                termContentStorageMode: 'raw-bytes',
                preserveCompressedMedia: false,
            };
        }
        const flagsRecord = /** @type {Record<string, unknown>} */ (flags);
        const mediaResolutionConcurrency = Number.isFinite(flagsRecord.mediaResolutionConcurrency) ? Math.trunc(/** @type {number} */ (flagsRecord.mediaResolutionConcurrency)) : 8;
        const termContentStorageModeRaw = flagsRecord.termContentStorageMode;
        const termContentStorageMode = (termContentStorageModeRaw === 'raw-bytes') ?
            termContentStorageModeRaw :
            'raw-bytes';
        return {
            skipImageMetadata: flagsRecord.skipImageMetadata === true,
            mediaResolutionConcurrency: Math.max(1, Math.min(32, mediaResolutionConcurrency)),
            debugImportLogging: flagsRecord.debugImportLogging === true,
            enableTermEntryContentDedup: flagsRecord.enableTermEntryContentDedup !== false,
            termContentStorageMode,
            preserveCompressedMedia: flagsRecord.preserveCompressedMedia === true,
        };
    }

    /**
     * @returns {boolean}
     */
    _getUseImportSession() {
        return Reflect.get(globalThis, 'manabitanImportUseSession') !== false;
    }

    /**
     * @param {Record<string, unknown>} snapshot
     */
    _recordImportDebugSnapshot(snapshot) {
        Reflect.set(globalThis, '__manabitanLastImportDebug', snapshot);
        const historyRaw = /** @type {unknown} */ (Reflect.get(globalThis, '__manabitanImportDebugHistory'));
        /** @type {Record<string, unknown>[]} */
        const history = [];
        if (Array.isArray(historyRaw)) {
            for (const entry of /** @type {unknown[]} */ (historyRaw)) {
                if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
                    history.push(/** @type {Record<string, unknown>} */ (entry));
                }
            }
        }
        history.push(snapshot);
        if (history.length > 20) {
            history.splice(0, history.length - 20);
        }
        Reflect.set(globalThis, '__manabitanImportDebugHistory', history);
    }

    /**
     * @template T
     * @param {T[]} arr
     * @yields {Promise<T>}
     * @returns {AsyncGenerator<T, void, void>}
     */
    async *_arrayToAsyncGenerator(arr) {
        for (const item of arr) {
            yield item;
        }
    }

    /**
     * @param {File} file
     * @param {import('settings-controller').ProfilesDictionarySettings} profilesDictionarySettings
     * @param {import('dictionary-importer').ImportDetails} importDetails
     * @param {boolean} useImportSession
     * @param {boolean} finalizeImportSession
     * @param {import('dictionary-worker').ImportProgressCallback} onProgress
     * @returns {Promise<Error[] | undefined>}
     */
    async _importDictionaryFromZip(file, profilesDictionarySettings, importDetails, useImportSession, finalizeImportSession, onProgress) {
        const dictionaryTitle = file.name || 'unknown-dictionary';
        const importStartTime = safePerformance.now();
        /** @type {Array<{phase: string, elapsedMs: number, details?: Record<string, string|number|boolean|null>}>} */
        const localPhaseTimings = [];
        /**
         * @param {string} phase
         * @param {number} startTime
         * @param {number} endTime
         * @param {Record<string, string|number|boolean|null>} [details]
         */
        const recordLocalPhase = (phase, startTime, endTime, details = {}) => {
            const elapsedMs = Math.max(0, endTime - startTime);
            localPhaseTimings.push({phase, elapsedMs, details});
            log.log(`[ImportTiming] [${dictionaryTitle}] phase ${phase} ${formatDurationMs(elapsedMs)} details=${JSON.stringify(details)}`);
        };
        log.log(`[ImportTiming] [${dictionaryTitle}] starting import`);
        reportDiagnostics('dictionary-import-zip-begin', {
            dictionaryTitle,
            sizeBytes: file.size,
            useImportSession,
            finalizeImportSession,
        });

        const readStartTime = safePerformance.now();
        const archiveContent = file;
        const readEndTime = safePerformance.now();
        log.log(`[ImportTiming] [${dictionaryTitle}] prepared archive handle ${formatDurationMs(readEndTime - readStartTime)}`);
        recordLocalPhase('read-archive', readStartTime, readEndTime, {
            sizeBytes: file.size,
            source: 'file-handle',
        });

        const workerImportStartTime = safePerformance.now();
        /** @type {import('dictionary-importer').ImportResult & {debug?: {usesFallbackStorage?: boolean, openStorageDiagnostics?: unknown, useImportSession?: boolean, finalizeImportSession?: boolean, importerDebug?: {phaseTimings?: Array<{phase: string, elapsedMs: number, details?: Record<string, string|number|boolean|null>}>|null}|null}}} */
        let importResult;
        const maxImportAttempts = 6;
        const cleanupStagedDictionaryBeforeRetry = async () => {
            const stagedDictionaryTitle = (
                typeof importDetails.dictionaryTitleOverride === 'string' &&
                importDetails.dictionaryTitleOverride.trim().length > 0
            ) ?
                importDetails.dictionaryTitleOverride.trim() :
                null;
            if (stagedDictionaryTitle === null) { return; }
            try {
                await this._settingsController.application.api.deleteDictionaryByTitle(stagedDictionaryTitle);
            } catch (_) {
                // NOP - best effort cleanup before retry.
            }
        };
        for (let attempt = 1; ; ++attempt) {
            try {
                const useImportSessionAttempt = (
                    typeof importDetails.useImportSession === 'boolean' ?
                        importDetails.useImportSession :
                        useImportSession
                );
                const finalizeImportSessionAttempt = (
                    typeof importDetails.finalizeImportSession === 'boolean' ?
                        importDetails.finalizeImportSession :
                        finalizeImportSession
                );
                const detailsAttempt = {
                    ...importDetails,
                    ...(useImportSessionAttempt ? {useImportSession: true, finalizeImportSession: finalizeImportSessionAttempt} : {}),
                };
                const archiveContentAttempt = (attempt === 1 ? archiveContent : file);
                importResult = /** @type {import('dictionary-importer').ImportResult & {debug?: {usesFallbackStorage?: boolean, openStorageDiagnostics?: unknown, useImportSession?: boolean, finalizeImportSession?: boolean, importerDebug?: {phaseTimings?: Array<{phase: string, elapsedMs: number, details?: Record<string, string|number|boolean|null>}>|null}|null}}} */ (
                    await this._tryImportDictionaryOffscreen(archiveContentAttempt, detailsAttempt, onProgress)
                );
            } catch (error) {
                const message = (error instanceof Error) ? error.message : String(error);
                const failureClass = classifyImportOpenFailure(message);
                const isRetryableThrown = (
                    failureClass === 'lock-contention' ||
                    failureClass === 'transient-open-race' ||
                    failureClass === 'readonly-race'
                );
                if (!isRetryableThrown || attempt >= maxImportAttempts) {
                    throw error;
                }
                log.log(`[ImportTiming] [${dictionaryTitle}] retrying import after transient open failure (${failureClass}) attempt ${attempt}`);
                await cleanupStagedDictionaryBeforeRetry();
                await new Promise((resolve) => {
                    setTimeout(resolve, getImportRetryDelayMs(attempt));
                });
                continue;
            }
            const retryableImportError = Array.isArray(importResult.errors) && importResult.errors.some((error) => {
                const message = (error instanceof Error) ? error.message : String(error);
                const failureClass = classifyImportOpenFailure(message);
                return (
                    failureClass === 'lock-contention' ||
                    failureClass === 'transient-open-race' ||
                    failureClass === 'readonly-race'
                );
            });
            if (!retryableImportError || attempt >= maxImportAttempts) {
                break;
            }
            log.log(`[ImportTiming] [${dictionaryTitle}] retrying import after transient open failure in importer result (attempt ${attempt})`);
            await cleanupStagedDictionaryBeforeRetry();
            await new Promise((resolve) => {
                setTimeout(resolve, getImportRetryDelayMs(attempt));
            });
        }
        const workerImportEndTime = safePerformance.now();
        log.log(`[ImportTiming] [${dictionaryTitle}] worker importDictionary ${formatDurationMs(workerImportEndTime - workerImportStartTime)}`);
        recordLocalPhase('worker-import-dictionary', workerImportStartTime, workerImportEndTime, {
            useImportSession,
            finalizeImportSession,
        });

        const {result, errors, debug} = importResult;
        const importerPhaseTimings = normalizeImporterPhaseTimings(debug?.importerDebug?.phaseTimings ?? null);
        reportDiagnostics('dictionary-import-worker-phase-summary', {
            dictionaryTitle,
            elapsedMs: Math.max(0, workerImportEndTime - workerImportStartTime),
            importerPhaseTimings,
            localPhaseTimings,
            memory: getImportMemorySnapshot(),
        });
        for (const phase of importerPhaseTimings) {
            log.log(
                `[ImportTiming] [${dictionaryTitle}] worker phase "${phase.phase}" ${formatDurationMs(phase.elapsedMs)}` +
                `${phase.details ? ` details=${JSON.stringify(phase.details)}` : ''}`,
            );
        }
        if (!result) {
            reportDiagnostics('dictionary-import-zip-no-result', {
                dictionaryTitle,
                errorCount: Array.isArray(errors) ? errors.length : -1,
                usesFallbackStorage: debug?.usesFallbackStorage ?? null,
                importerPhaseTimings,
                localPhaseTimings,
            });
            this._recordImportDebugSnapshot({
                dictionaryTitle,
                hasResult: false,
                resultTitle: null,
                errorCount: Array.isArray(errors) ? errors.length : -1,
                addSettingsErrorCount: null,
                fallbackDatabaseContentBase64Length: null,
                usesFallbackStorage: debug?.usesFallbackStorage ?? null,
                openStorageDiagnostics: debug?.openStorageDiagnostics ?? null,
                useImportSession: debug?.useImportSession ?? null,
                finalizeImportSession: debug?.finalizeImportSession ?? null,
                importerPhaseTimings,
                localPhaseTimings,
            });
            return errors;
        }

        if (debug?.usesFallbackStorage === true) {
            const fallbackError = new Error(`OPFS is required for import but fallback storage was detected. diagnostics=${JSON.stringify(debug.openStorageDiagnostics ?? null)}`);
            const errorsWithOpfsRequirement = [...errors, fallbackError];
            reportDiagnostics('dictionary-import-zip-opfs-fallback-detected', {
                dictionaryTitle,
                errorCount: errorsWithOpfsRequirement.length,
            });
            this._recordImportDebugSnapshot({
                dictionaryTitle,
                hasResult: false,
                resultTitle: result.title || null,
                errorCount: errorsWithOpfsRequirement.length,
                addSettingsErrorCount: null,
                fallbackDatabaseContentBase64Length: null,
                usesFallbackStorage: debug.usesFallbackStorage,
                openStorageDiagnostics: debug.openStorageDiagnostics ?? null,
                useImportSession: debug.useImportSession ?? null,
                finalizeImportSession: debug.finalizeImportSession ?? null,
                importerPhaseTimings,
                localPhaseTimings,
            });
            return errorsWithOpfsRequirement;
        }

        const replacementDictionaryTitle = (
            typeof importDetails.replacementDictionaryTitle === 'string' &&
            importDetails.replacementDictionaryTitle.trim().length > 0
        ) ?
            importDetails.replacementDictionaryTitle.trim() :
            null;
        const sourceDictionaryTitle = (
            typeof result.sourceTitle === 'string' &&
            result.sourceTitle.trim().length > 0
        ) ?
            result.sourceTitle.trim() :
            String(result.title || '').trim();
        if (
            replacementDictionaryTitle !== null &&
            sourceDictionaryTitle.length > 0 &&
            result.title !== sourceDictionaryTitle
        ) {
            const replacementStartTime = safePerformance.now();
            const replacementSummary = {
                ...result,
                title: sourceDictionaryTitle,
                updateSessionToken: (
                    typeof importDetails.updateSessionToken === 'string' &&
                    importDetails.updateSessionToken.trim().length > 0
                ) ? importDetails.updateSessionToken.trim() : null,
            };
            await this._settingsController.application.api.replaceDictionaryTitle({
                fromDictionaryTitle: result.title,
                toDictionaryTitle: sourceDictionaryTitle,
                replacedDictionaryTitle: replacementDictionaryTitle,
                summary: replacementSummary,
            });
            result.title = sourceDictionaryTitle;
            result.sourceTitle = sourceDictionaryTitle;
            const replacementEndTime = safePerformance.now();
            recordLocalPhase('replace-imported-dictionary-title', replacementStartTime, replacementEndTime, {
                replacedDictionaryTitle: replacementDictionaryTitle,
                sourceDictionaryTitle,
            });
        } else if (replacementDictionaryTitle !== null && sourceDictionaryTitle.length > 0) {
            localPhaseTimings.push({
                phase: 'replace-imported-dictionary-title',
                elapsedMs: 0,
                details: {
                    skipped: true,
                    alreadyAppliedInWorker: true,
                    replacedDictionaryTitle: replacementDictionaryTitle,
                    sourceDictionaryTitle,
                },
            });
        }

        const shouldAddDictionarySettings = (
            replacementDictionaryTitle === null ||
            sourceDictionaryTitle !== replacementDictionaryTitle
        );
        const addSettingsStartTime = safePerformance.now();
        const errors2 = shouldAddDictionarySettings ? await this._addDictionarySettings(result, profilesDictionarySettings) : [];
        const addSettingsEndTime = safePerformance.now();
        log.log(`[ImportTiming] [${dictionaryTitle}] add dictionary settings ${formatDurationMs(addSettingsEndTime - addSettingsStartTime)}`);
        recordLocalPhase('add-dictionary-settings', addSettingsStartTime, addSettingsEndTime, {
            settingsErrorCount: errors2.length,
            skipped: !shouldAddDictionarySettings,
        });
        if (replacementDictionaryTitle !== null && shouldAddDictionarySettings) {
            const removeOldSettingsStartTime = safePerformance.now();
            await this._removeDictionarySettingsByName(replacementDictionaryTitle);
            const removeOldSettingsEndTime = safePerformance.now();
            recordLocalPhase('remove-replaced-dictionary-settings', removeOldSettingsStartTime, removeOldSettingsEndTime, {
                removedDictionaryTitle: replacementDictionaryTitle,
            });
        }
        this._recordImportDebugSnapshot({
            dictionaryTitle,
            hasResult: true,
            resultTitle: result.title || null,
            sourceTitle: sourceDictionaryTitle || null,
            errorCount: Array.isArray(errors) ? errors.length : -1,
            addSettingsErrorCount: errors2.length,
            fallbackDatabaseContentBase64Length: null,
            usesFallbackStorage: debug?.usesFallbackStorage ?? null,
            openStorageDiagnostics: debug?.openStorageDiagnostics ?? null,
            useImportSession: debug?.useImportSession ?? null,
            finalizeImportSession: debug?.finalizeImportSession ?? null,
            importerPhaseTimings,
            localPhaseTimings,
        });

        if (!(useImportSession && !finalizeImportSession)) {
            const triggerDatabaseUpdatedStartTime = safePerformance.now();
            await this._settingsController.application.api.triggerDatabaseUpdated('dictionary', 'import');
            const triggerDatabaseUpdatedEndTime = safePerformance.now();
            log.log(`[ImportTiming] [${dictionaryTitle}] triggerDatabaseUpdated ${formatDurationMs(triggerDatabaseUpdatedEndTime - triggerDatabaseUpdatedStartTime)}`);
            recordLocalPhase('trigger-database-updated', triggerDatabaseUpdatedStartTime, triggerDatabaseUpdatedEndTime);
        } else {
            log.log(`[ImportTiming] [${dictionaryTitle}] triggerDatabaseUpdated deferred until import session finalize`);
            localPhaseTimings.push({
                phase: 'trigger-database-updated',
                elapsedMs: 0,
                details: {deferred: true},
            });
        }

        // Only runs if updating a dictionary
        if (profilesDictionarySettings !== null && shouldAddDictionarySettings) {
            const profileUpdateStartTime = safePerformance.now();
            const options = await this._settingsController.getOptionsFull();
            const {profiles} = options;

            for (const profile of profiles) {
                for (const cardFormat of profile.options.anki.cardFormats) {
                    const ankiTermFields = cardFormat.fields;
                    const oldFieldSegmentRegex = new RegExp(getKebabCase(profilesDictionarySettings[profile.id].name), 'g');
                    const newFieldSegment = getKebabCase(result.title);
                    for (const key of Object.keys(ankiTermFields)) {
                        ankiTermFields[key].value = ankiTermFields[key].value.replace(oldFieldSegmentRegex, newFieldSegment);
                    }
                }
            }
            await this._settingsController.setAllSettings(options);
            const profileUpdateEndTime = safePerformance.now();
            log.log(`[ImportTiming] [${dictionaryTitle}] update profile dictionary references ${formatDurationMs(profileUpdateEndTime - profileUpdateStartTime)}`);
            recordLocalPhase('update-profile-dictionary-references', profileUpdateStartTime, profileUpdateEndTime);
        }

        const importEndTime = safePerformance.now();
        log.log(`[ImportTiming] [${dictionaryTitle}] total import path ${formatDurationMs(importEndTime - importStartTime)} (errors=${errors.length + errors2.length})`);
        reportDiagnostics('dictionary-import-zip-complete', {
            dictionaryTitle,
            elapsedMs: Math.max(0, importEndTime - importStartTime),
            importErrors: errors.length,
            settingsErrors: errors2.length,
            resultTitle: result.title || null,
            importerPhaseTimings,
            localPhaseTimings,
            memory: getImportMemorySnapshot(),
        });

        if (errors.length > 0) {
            errors.push(new Error(`Dictionary may not have been imported properly: ${errors.length} error${errors.length === 1 ? '' : 's'} reported.`));
            this._showErrors([...errors, ...errors2]);
        } else if (errors2.length > 0) {
            this._showErrors(errors2);
        }
    }

    /**
     * @param {import('dictionary-importer').Summary} summary
     * @param {import('settings-controller').ProfilesDictionarySettings} profilesDictionarySettings
     * @returns {Promise<Error[]>}
     */
    async _addDictionarySettings(summary, profilesDictionarySettings) {
        const {title, sequenced, styles} = summary;
        const sourceTitle = (
            typeof summary.sourceTitle === 'string' &&
            summary.sourceTitle.trim().length > 0
        ) ? summary.sourceTitle.trim() : null;
        const replacedTitle = (
            typeof summary.replacedDictionaryTitle === 'string' &&
            summary.replacedDictionaryTitle.trim().length > 0
        ) ? summary.replacedDictionaryTitle.trim() : null;
        const selectorSourceTitle = sourceTitle ?? replacedTitle;
        let optionsFull;
        // Workaround Firefox bug sometimes causing getOptionsFull to fail
        for (let i = 0, success = false; (i < 10) && (success === false); i++) {
            try {
                optionsFull = await this._settingsController.getOptionsFull();
                success = true;
            } catch (error) {
                log.error(error);
            }
        }
        if (!optionsFull) { return [new Error('Failed to automatically set dictionary settings. A page refresh and manual enabling of the dictionary may be required.')]; }

        const profileIndex = this._settingsController.profileIndex;
        /** @type {import('settings-modifications').Modification[]} */
        const targets = [];
        const profileCount = optionsFull.profiles.length;
        for (let i = 0; i < profileCount; ++i) {
            const {options, id: profileId} = optionsFull.profiles[i];
            const enabled = profileIndex === i;
            const defaultSettings = DictionaryController.createDefaultDictionarySettings(title, enabled, styles);
            const path1 = `profiles[${i}].options.dictionaries`;

            if (profilesDictionarySettings === null || typeof profilesDictionarySettings[profileId] === 'undefined') {
                targets.push({action: 'push', path: path1, items: [defaultSettings]});
                if (selectorSourceTitle !== null && options.general.mainDictionary === selectorSourceTitle) {
                    targets.push({
                        action: 'set',
                        path: `profiles[${i}].options.general.mainDictionary`,
                        value: title,
                    });
                } else if (sequenced && options.general.mainDictionary === '') {
                    const path2 = `profiles[${i}].options.general.mainDictionary`;
                    targets.push({action: 'set', path: path2, value: title});
                }
                if (selectorSourceTitle !== null && options.general.sortFrequencyDictionary === selectorSourceTitle) {
                    targets.push({
                        action: 'set',
                        path: `profiles[${i}].options.general.sortFrequencyDictionary`,
                        value: title,
                    });
                }
            } else {
                const {index, alias, name, ...currentSettings} = profilesDictionarySettings[profileId];
                const newAlias = alias === name ? title : alias;
                targets.push({
                    action: 'splice',
                    path: path1,
                    start: index,
                    items: [{
                        ...currentSettings,
                        styles,
                        name: title,
                        alias: newAlias,
                    }],
                    deleteCount: 0,
                });
                if (
                    options.general.mainDictionary === name ||
                    (selectorSourceTitle !== null && options.general.mainDictionary === selectorSourceTitle)
                ) {
                    targets.push({
                        action: 'set',
                        path: `profiles[${i}].options.general.mainDictionary`,
                        value: title,
                    });
                } else if (sequenced && options.general.mainDictionary === '') {
                    targets.push({
                        action: 'set',
                        path: `profiles[${i}].options.general.mainDictionary`,
                        value: title,
                    });
                }
                if (
                    options.general.sortFrequencyDictionary === name ||
                    (selectorSourceTitle !== null && options.general.sortFrequencyDictionary === selectorSourceTitle)
                ) {
                    targets.push({
                        action: 'set',
                        path: `profiles[${i}].options.general.sortFrequencyDictionary`,
                        value: title,
                    });
                }
                continue;
            }
        }
        return await this._modifyGlobalSettings(targets);
    }

    /**
     * @param {string} dictionaryTitle
     * @returns {Promise<void>}
     */
    async _removeDictionarySettingsByName(dictionaryTitle) {
        const optionsFull = await this._settingsController.getOptionsFull();
        const {profiles} = optionsFull;
        /** @type {import('settings-modifications').Modification[]} */
        const targets = [];
        for (let i = 0, ii = profiles.length; i < ii; ++i) {
            const {options} = profiles[i];
            const {dictionaries, general} = options;
            for (let j = dictionaries.length - 1; j >= 0; --j) {
                if (dictionaries[j].name !== dictionaryTitle) { continue; }
                targets.push({
                    action: 'splice',
                    path: `profiles[${i}].options.dictionaries`,
                    start: j,
                    deleteCount: 1,
                    items: [],
                });
            }
            if (general.mainDictionary === dictionaryTitle) {
                targets.push({
                    action: 'set',
                    path: `profiles[${i}].options.general.mainDictionary`,
                    value: '',
                });
            }
            if (general.sortFrequencyDictionary === dictionaryTitle) {
                targets.push({
                    action: 'set',
                    path: `profiles[${i}].options.general.sortFrequencyDictionary`,
                    value: null,
                });
            }
        }
        if (targets.length > 0) {
            await this._modifyGlobalSettings(targets);
        }
    }

    /**
     * @returns {Promise<Error[]>}
     */
    async _clearDictionarySettings() {
        const optionsFull = await this._settingsController.getOptionsFull();
        /** @type {import('settings-modifications').Modification[]} */
        const targets = [];
        const profileCount = optionsFull.profiles.length;
        for (let i = 0; i < profileCount; ++i) {
            const path1 = `profiles[${i}].options.dictionaries`;
            targets.push({action: 'set', path: path1, value: []});
            const path2 = `profiles[${i}].options.general.mainDictionary`;
            targets.push({action: 'set', path: path2, value: ''});
        }
        return await this._modifyGlobalSettings(targets);
    }

    /**
     * @returns {import('settings-controller').PageExitPrevention}
     */
    _preventPageExit() {
        return this._settingsController.preventPageExit();
    }

    /**
     * @param {Error[]} errors
     */
    _showErrors(errors) {
        reportDiagnostics('dictionary-import-errors-shown', {
            errorCount: errors.length,
            messages: errors.slice(0, 5).map((error) => this._errorToString(error)),
        });
        /** @type {Map<string, number>} */
        const uniqueErrors = new Map();
        for (const error of errors) {
            log.error(error);
            const errorString = this._errorToString(error);
            let count = uniqueErrors.get(errorString);
            if (typeof count === 'undefined') {
                count = 0;
            }
            uniqueErrors.set(errorString, count + 1);
        }

        const fragment = document.createDocumentFragment();
        for (const [e, count] of uniqueErrors.entries()) {
            const div = document.createElement('p');
            if (count > 1) {
                div.textContent = `${e} `;
                const em = document.createElement('em');
                em.textContent = `(${count})`;
                div.appendChild(em);
            } else {
                div.textContent = `${e}`;
            }
            fragment.appendChild(div);
        }

        const errorContainer = /** @type {HTMLElement} */ (this._errorContainer);
        errorContainer.appendChild(fragment);
        errorContainer.hidden = false;
    }

    /** */
    _hideErrors() {
        const errorContainer = /** @type {HTMLElement} */ (this._errorContainer);
        errorContainer.textContent = '';
        errorContainer.hidden = true;
    }

    /**
     * @param {File} file
     * @returns {Promise<ArrayBuffer>}
     */
    _readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(/** @type {ArrayBuffer} */ (reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * @param {Error} error
     * @returns {string}
     */
    _errorToString(error) {
        const errorMessage = error.toString();

        if (isOpfsUnavailableMessage(errorMessage)) {
            return getOpfsUnavailableUserMessage(errorMessage);
        }

        for (const [match, newErrorString] of this._errorToStringOverrides) {
            if (errorMessage.includes(match)) {
                return newErrorString;
            }
        }

        return errorMessage;
    }

    /**
     * @param {boolean} value
     */
    _setModifying(value) {
        this._modifying = value;
        this._setButtonsEnabled(!value);
    }

    /**
     * @param {boolean} value
     */
    _setButtonsEnabled(value) {
        value = !value;
        for (const node of /** @type {NodeListOf<HTMLInputElement>} */ (document.querySelectorAll('.dictionary-database-mutating-input'))) {
            node.disabled = value;
        }
    }

    /**
     * @param {import('settings-modifications').Modification[]} targets
     * @returns {Promise<Error[]>}
     */
    async _modifyGlobalSettings(targets) {
        const results = await this._settingsController.modifyGlobalSettings(targets);
        const errors = [];
        for (const {error} of results) {
            if (typeof error !== 'undefined') {
                errors.push(ExtensionError.deserialize(error));
            }
        }
        return errors;
    }

    /** */
    _triggerStorageChanged() {
        this._settingsController.application.triggerStorageChanged();
    }
}

export class ImportProgressTracker {
    /**
     * @param {import('dictionary-importer').ImportSteps} steps
     * @param {number} dictionaryCount
     */
    constructor(steps, dictionaryCount) {
        /** @type {import('dictionary-importer').ImportSteps} */
        this._steps = steps;
        /** @type {number} */
        this._dictionaryCount = dictionaryCount;

        /** @type {number} */
        this._stepIndex = 0;
        /** @type {number} */
        this._dictionaryIndex = 0;
        /** @type {number} */
        this._importStartTime = safePerformance.now();
        /** @type {number} */
        this._dictionaryStartTime = this._importStartTime;
        /** @type {number} */
        this._stepStartTime = this._importStartTime;
        /** @type {number} */
        this._stepChangeCount = 0;
        /** @type {Array<Record<string, unknown>>} */
        this._stepTimingHistory = [];
        /** @type {ReturnType<typeof getImportMemorySnapshot>} */
        this._stepStartMemory = getImportMemorySnapshot();
        /** @type {ReturnType<typeof getImportMemorySnapshot>} */
        this._dictionaryStartMemory = this._stepStartMemory;

        const progressSelector = '.dictionary-import-progress';
        /** @type {NodeListOf<HTMLElement>} */
        this._progressBars = (document.querySelectorAll(`${progressSelector} .progress-bar`));
        /** @type {NodeListOf<HTMLElement>} */
        this._infoLabels = (document.querySelectorAll(`${progressSelector} .progress-info`));
        /** @type {NodeListOf<HTMLElement>} */
        this._statusLabels = (document.querySelectorAll(`${progressSelector} .progress-status`));
        /** @type {string} */
        this._lastInfoLabelText = '';
        /** @type {string} */
        this._lastStatusText = '';
        /** @type {number} */
        this._lastPercent = -1;

        this.onProgress({nextStep: false, index: 0, count: 0});
    }

    /** @type {string} */
    get statusPrefix() {
        return `Importing dictionary${this._dictionaryCount > 1 ? ` (${this._dictionaryIndex} of ${this._dictionaryCount})` : ''}`;
    }

    /** @type {import('dictionary-importer').ImportStep} */
    get currentStep() {
        return this._steps[this._stepIndex];
    }

    /** @type {number} */
    get stepCount() {
        return this._steps.length;
    }

    /** @type {number} */
    get dictionaryCount() {
        return this._dictionaryCount;
    }

    /**
     * @returns {Array<Record<string, unknown>>}
     */
    getStepTimingHistory() {
        return this._stepTimingHistory.map((item) => ({...item}));
    }

    /** @type {import('dictionary-worker').ImportProgressCallback} */
    onProgress(data) {
        const {nextStep, index, count} = data;
        const previousStepIndex = this._stepIndex;
        if (nextStep && this._steps.length > 0) {
            this._stepIndex = Math.min(this._stepIndex + 1, this._steps.length - 1);
        }
        const currentStep = this.currentStep;
        const currentLabel = currentStep?.label ?? 'Working';
        const currentStepDisplay = `Step ${this._stepIndex + 1} of ${this.stepCount}`;
        const labelText = `${this.statusPrefix} - ${currentStepDisplay}: ${currentLabel}...`;
        if (labelText !== this._lastInfoLabelText) {
            this._lastInfoLabelText = labelText;
            for (const label of this._infoLabels) { label.textContent = labelText; }
        }

        const hasFiniteCount = Number.isFinite(count) && count > 0;
        let percentRaw = hasFiniteCount ? (index / count * 100) : 0;
        // Avoid showing a misleading 100% while a non-final step is still open.
        if (!nextStep && hasFiniteCount && this._stepIndex < (this.stepCount - 1) && index >= count) {
            percentRaw = 99.99;
        }
        const percent = Math.max(0, Math.min(100, percentRaw));
        if (this._lastPercent < 0 || Math.abs(percent - this._lastPercent) >= 0.1) {
            this._lastPercent = percent;
            const cssString = `${percent.toFixed(2)}%`;
            for (const progressBar of this._progressBars) { progressBar.style.width = cssString; }
        }
        const statusString = `${Math.floor(percent).toFixed(0)}%`;
        if (statusString !== this._lastStatusText) {
            this._lastStatusText = statusString;
            for (const label of this._statusLabels) { label.textContent = statusString; }
        }

        if (currentStep && typeof currentStep.callback === 'function') {
            currentStep.callback();
        }

        if (nextStep && this._steps.length > 0 && this._stepIndex !== previousStepIndex) {
            const now = safePerformance.now();
            const completedStep = this._steps[previousStepIndex];
            const completedLabel = (typeof completedStep?.label === 'string' && completedStep.label.length > 0) ? completedStep.label : 'Starting import state';
            const stepDuration = now - this._stepStartTime;
            const stepEndMemory = getImportMemorySnapshot();
            const stepHeapDeltaBytes = getHeapDeltaBytes(this._stepStartMemory, stepEndMemory);
            log.log(`[ImportTiming] ${this.statusPrefix} completed Step ${previousStepIndex + 1} of ${this.stepCount} "${completedLabel}" in ${formatDurationMs(stepDuration)}`);
            const stepTiming = {
                dictionaryIndex: this._dictionaryIndex,
                dictionaryCount: this._dictionaryCount,
                stepIndex: previousStepIndex + 1,
                stepCount: this.stepCount,
                stepDisplay: `Step ${previousStepIndex + 1} of ${this.stepCount}`,
                label: completedLabel,
                uiLabelText: `${this.statusPrefix} - Step ${previousStepIndex + 1} of ${this.stepCount}: ${completedLabel}...`,
                nextUiLabelText: labelText,
                elapsedMs: Math.max(0, stepDuration),
                dictionaryElapsedMs: Math.max(0, now - this._dictionaryStartTime),
                totalElapsedMs: Math.max(0, now - this._importStartTime),
                memoryStart: this._stepStartMemory,
                memoryEnd: stepEndMemory,
                heapDeltaBytes: stepHeapDeltaBytes,
            };
            this._stepTimingHistory.push(stepTiming);
            if (this._stepTimingHistory.length > 256) {
                this._stepTimingHistory.splice(0, this._stepTimingHistory.length - 256);
            }
            reportDiagnostics('dictionary-import-step-complete', stepTiming);
            this._stepStartTime = now;
            this._stepStartMemory = stepEndMemory;
            this._stepChangeCount += 1;
        }
    }

    /** */
    onNextDictionary() {
        const now = safePerformance.now();
        if (this._dictionaryIndex > 0) {
            const previousDictionaryDuration = now - this._dictionaryStartTime;
            log.log(`[ImportTiming] dictionary ${this._dictionaryIndex}/${this._dictionaryCount} total progress phase time ${formatDurationMs(previousDictionaryDuration)}`);
        }
        this._dictionaryIndex += 1;
        this._stepIndex = 0;
        this._dictionaryStartTime = now;
        this._stepStartTime = now;
        this._dictionaryStartMemory = getImportMemorySnapshot();
        this._stepStartMemory = this._dictionaryStartMemory;
        log.log(`[ImportTiming] dictionary ${this._dictionaryIndex}/${this._dictionaryCount} started`);
        reportDiagnostics('dictionary-import-dictionary-start', {
            dictionaryIndex: this._dictionaryIndex,
            dictionaryCount: this._dictionaryCount,
            stepDisplay: `Step 1 of ${this.stepCount}`,
            totalElapsedMs: Math.max(0, now - this._importStartTime),
            memoryStart: this._dictionaryStartMemory,
        });
        this.onProgress({
            nextStep: true,
            index: 0,
            count: 0,
        });
    }

    /**
     * @param {number} errorCount
     */
    onImportComplete(errorCount) {
        const now = safePerformance.now();
        const currentStepLabel = this.currentStep?.label ?? `Step ${this._stepIndex + 1}`;
        const currentStepDuration = now - this._stepStartTime;
        const currentDictionaryDuration = now - this._dictionaryStartTime;
        const totalDuration = now - this._importStartTime;
        const memoryEnd = getImportMemorySnapshot();
        log.log(`[ImportTiming] ${this.statusPrefix} current step "${currentStepLabel}" open for ${formatDurationMs(currentStepDuration)}`);
        log.log(`[ImportTiming] dictionary ${this._dictionaryIndex}/${this._dictionaryCount} total progress phase time ${formatDurationMs(currentDictionaryDuration)}`);
        log.log(`[ImportTiming] all dictionaries progress phases complete in ${formatDurationMs(totalDuration)} (step-transitions=${this._stepChangeCount}, errors=${errorCount})`);
        const finalStepTiming = {
            dictionaryIndex: this._dictionaryIndex,
            dictionaryCount: this._dictionaryCount,
            stepIndex: this._stepIndex + 1,
            stepCount: this.stepCount,
            stepDisplay: `Step ${this._stepIndex + 1} of ${this.stepCount}`,
            label: currentStepLabel,
            elapsedMs: Math.max(0, currentStepDuration),
            dictionaryElapsedMs: Math.max(0, currentDictionaryDuration),
            totalElapsedMs: Math.max(0, totalDuration),
            memoryStart: this._stepStartMemory,
            memoryEnd,
            heapDeltaBytes: getHeapDeltaBytes(this._stepStartMemory, memoryEnd),
            finalOpenStep: true,
        };
        this._stepTimingHistory.push(finalStepTiming);
        if (this._stepTimingHistory.length > 256) {
            this._stepTimingHistory.splice(0, this._stepTimingHistory.length - 256);
        }
        reportDiagnostics('dictionary-import-step-final', finalStepTiming);
        reportDiagnostics('dictionary-import-progress-summary', {
            dictionaryIndex: this._dictionaryIndex,
            dictionaryCount: this._dictionaryCount,
            currentStepIndex: this._stepIndex + 1,
            currentStepDisplay: `Step ${this._stepIndex + 1} of ${this.stepCount}`,
            currentStepLabel,
            currentStepElapsedMs: Math.max(0, currentStepDuration),
            currentDictionaryElapsedMs: Math.max(0, currentDictionaryDuration),
            totalElapsedMs: Math.max(0, totalDuration),
            stepTransitions: this._stepChangeCount,
            errorCount,
            memoryStart: this._dictionaryStartMemory,
            memoryEnd,
            dictionaryHeapDeltaBytes: getHeapDeltaBytes(this._dictionaryStartMemory, memoryEnd),
            currentStepHeapDeltaBytes: getHeapDeltaBytes(this._stepStartMemory, memoryEnd),
        });
    }
}
