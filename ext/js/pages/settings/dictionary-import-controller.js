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
import {DictionaryWorker} from '../../dictionary/dictionary-worker.js';
import {querySelectorNotNull} from '../../dom/query-selector.js';
import {DictionaryController} from './dictionary-controller.js';

/**
 * @param {number} valueMs
 * @returns {string}
 */
function formatDurationMs(valueMs) {
    return `${valueMs.toFixed(1)}ms`;
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
        ];
        /** @type {string[]} */
        this._recommendedDictionaryQueue = [];
        /** @type {boolean} */
        this._recommendedDictionaryActiveImport = false;
        /** @type {DictionaryWorker|null} */
        this._sessionDictionaryWorker = null;
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

        document.addEventListener('click', this._onDocumentClickCaptureBind, true);
        globalThis.addEventListener('manabitan:modal-visibility-changed', this._onModalVisibilityChangedEventBind, false);
        this._recommendedDictionariesModal?.on('visibilityChanged', this._onRecommendedDictionariesModalVisibilityChangedBind);
        globalThis.addEventListener('beforeunload', this._onBeforeUnload.bind(this), {once: true});
        reportDiagnostics('dictionary-import-controller-prepare-complete', {
            hasRecommendedModal: this._recommendedDictionariesModal !== null,
            href: globalThis.location?.href ?? null,
        });
        this._primeRecommendedDictionaries('prepare');
    }

    // Private

    /**
     * @param {boolean} useImportSession
     * @returns {DictionaryWorker}
     */
    _getDictionaryWorker(useImportSession) {
        if (!useImportSession) {
            return new DictionaryWorker({reuseWorker: false});
        }
        if (this._sessionDictionaryWorker === null) {
            this._sessionDictionaryWorker = new DictionaryWorker({reuseWorker: true});
        }
        return this._sessionDictionaryWorker;
    }

    /**
     * @param {DictionaryWorker} dictionaryWorker
     * @param {boolean} useImportSession
     */
    _releaseDictionaryWorker(dictionaryWorker, useImportSession) {
        if (useImportSession) {
            if (this._sessionDictionaryWorker === dictionaryWorker) {
                this._sessionDictionaryWorker.destroy();
                this._sessionDictionaryWorker = null;
            }
            return;
        }
        dictionaryWorker.destroy();
    }

    /** */
    _onBeforeUnload() {
        document.removeEventListener('click', this._onDocumentClickCaptureBind, true);
        globalThis.removeEventListener('manabitan:modal-visibility-changed', this._onModalVisibilityChangedEventBind, false);
        this._recommendedDictionariesModal?.off('visibilityChanged', this._onRecommendedDictionariesModalVisibilityChangedBind);
        if (this._sessionDictionaryWorker !== null) {
            this._sessionDictionaryWorker.destroy();
            this._sessionDictionaryWorker = null;
        }
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
            this._setRecommendedDiagnostics(`FAILED to render recommended dictionaries:\n${e.message}`);
            reportDiagnostics('recommended-dictionaries-open-failed', {
                message: e.message,
            });
            this._showErrors([e]);
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
    _onEventImportDictionaryFromUrl({url, profilesDictionarySettings, onImportDone}) {
        void this.importFilesFromURLs(url, profilesDictionarySettings, onImportDone);
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
    async importFilesFromURLs(text, profilesDictionarySettings, onImportDone) {
        const urls = text.split('\n');

        const importProgressTracker = new ImportProgressTracker(this._getUrlImportSteps(), urls.length);
        const onProgress = importProgressTracker.onProgress.bind(importProgressTracker);
        void this._importDictionaries(
            this._generateFilesFromUrls(urls, onProgress),
            profilesDictionarySettings,
            onImportDone,
            importProgressTracker,
        );
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
    async _importDictionaries(dictionaries, profilesDictionarySettings, onImportDone, importProgressTracker) {
        if (this._modifying) { return; }

        const statusFooter = this._statusFooter;
        const progressSelector = '.dictionary-import-progress';
        const progressContainers = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll(`#dictionaries-modal ${progressSelector}`));
        const recommendedProgressContainers = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll(`#recommended-dictionaries-modal ${progressSelector}`));

        const prevention = this._preventPageExit();

        const onProgress = importProgressTracker.onProgress.bind(importProgressTracker);

        /** @type {Error[]} */
        let errors = [];
        const useImportSession = this._getUseImportSession();
        log.log(`[ImportTiming] import session reuse enabled=${String(useImportSession)} (globalOverride=${String(this._getUseImportSession())})`);
        reportDiagnostics('dictionary-import-session-begin', {
            dictionaryCount: importProgressTracker.dictionaryCount,
            useImportSession,
            hasProfilesDictionarySettings: profilesDictionarySettings !== null,
        });
        const dictionaryWorker = this._getDictionaryWorker(useImportSession);
        const importStartTime = safePerformance.now();
        try {
            this._setModifying(true);
            this._hideErrors();

            for (const progress of [...progressContainers, ...recommendedProgressContainers]) { progress.hidden = false; }

            const optionsFull = await this._settingsController.getOptionsFull();
            const {
                skipImageMetadata,
                skipMediaImport,
                mediaResolutionConcurrency,
                debugImportLogging,
            } = this._getImportPerformanceFlags();
            const importDetails = {
                prefixWildcardsSupported: optionsFull.global.database.prefixWildcardsSupported,
                yomitanVersion: chrome.runtime.getManifest().version,
                skipImageMetadata,
                skipMediaImport,
                mediaResolutionConcurrency,
                debugImportLogging,
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
                        dictionaryWorker,
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
                });
            }
        } catch (error) {
            errors.push(toError(error));
            reportDiagnostics('dictionary-import-session-error', {
                message: toError(error).message,
            });
        } finally {
            importProgressTracker.onImportComplete(errors.length);
            const importEndTime = safePerformance.now();
            log.log(`[ImportTiming] import session complete in ${formatDurationMs(importEndTime - importStartTime)} (errors=${errors.length})`);
            reportDiagnostics('dictionary-import-session-complete', {
                dictionaryCount: importProgressTracker.dictionaryCount,
                elapsedMs: Math.max(0, importEndTime - importStartTime),
                errorCount: errors.length,
            });
            this._showErrors(errors);
            prevention.end();
            for (const progress of [...progressContainers, ...recommendedProgressContainers]) { progress.hidden = true; }
            if (statusFooter !== null) { statusFooter.setTaskActive(progressSelector, false); }
            this._setModifying(false);
            this._releaseDictionaryWorker(dictionaryWorker, useImportSession);
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
            {label: 'Loading dictionary'}, // Load dictionary archive and index metadata
            {label: 'Importing data'}, // Add dictionary descriptor, load, and import data
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
     * @returns {{skipImageMetadata: boolean, skipMediaImport: boolean, mediaResolutionConcurrency: number, debugImportLogging: boolean}}
     */
    _getImportPerformanceFlags() {
        const flags = /** @type {unknown} */ (Reflect.get(globalThis, 'manabitanImportPerformanceFlags'));
        if (typeof flags !== 'object' || flags === null || Array.isArray(flags)) {
            return {
                skipImageMetadata: false,
                skipMediaImport: false,
                mediaResolutionConcurrency: 8,
                debugImportLogging: false,
            };
        }
        const flagsRecord = /** @type {Record<string, unknown>} */ (flags);
        const mediaResolutionConcurrency = Number.isFinite(flagsRecord.mediaResolutionConcurrency) ? Math.trunc(/** @type {number} */ (flagsRecord.mediaResolutionConcurrency)) : 8;
        return {
            skipImageMetadata: flagsRecord.skipImageMetadata === true,
            skipMediaImport: flagsRecord.skipMediaImport === true,
            mediaResolutionConcurrency: Math.max(1, Math.min(32, mediaResolutionConcurrency)),
            debugImportLogging: flagsRecord.debugImportLogging === true,
        };
    }

    /**
     * @returns {boolean}
     */
    _getUseImportSession() {
        return Reflect.get(globalThis, 'manabitanImportUseSession') !== false;
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
     * @param {DictionaryWorker} dictionaryWorker
     * @param {boolean} useImportSession
     * @param {boolean} finalizeImportSession
     * @param {import('dictionary-worker').ImportProgressCallback} onProgress
     * @returns {Promise<Error[] | undefined>}
     */
    async _importDictionaryFromZip(file, profilesDictionarySettings, importDetails, dictionaryWorker, useImportSession, finalizeImportSession, onProgress) {
        const dictionaryTitle = file.name || 'unknown-dictionary';
        const importStartTime = safePerformance.now();
        log.log(`[ImportTiming] [${dictionaryTitle}] starting import`);
        reportDiagnostics('dictionary-import-zip-begin', {
            dictionaryTitle,
            sizeBytes: file.size,
            useImportSession,
            finalizeImportSession,
        });

        const readStartTime = safePerformance.now();
        const archiveContent = await this._readFile(file);
        const archiveContentBytes = new Uint8Array(archiveContent);
        const readEndTime = safePerformance.now();
        log.log(`[ImportTiming] [${dictionaryTitle}] read archive ${formatDurationMs(readEndTime - readStartTime)}`);

        const workerImportStartTime = safePerformance.now();
        /** @type {import('dictionary-importer').ImportResult & {debug?: {usesFallbackStorage?: boolean, openStorageDiagnostics?: unknown, useImportSession?: boolean, finalizeImportSession?: boolean}}} */
        let importResult;
        const maxImportAttempts = 15;
        for (let attempt = 1; ; ++attempt) {
            try {
                const archiveContentAttempt = new Uint8Array(archiveContentBytes).buffer;
                importResult = /** @type {import('dictionary-importer').ImportResult & {debug?: {usesFallbackStorage?: boolean, openStorageDiagnostics?: unknown, useImportSession?: boolean, finalizeImportSession?: boolean}}} */ (
                    await dictionaryWorker.importDictionary(
                        archiveContentAttempt,
                        {
                            ...importDetails,
                            ...(useImportSession ? {useImportSession: true, finalizeImportSession} : {}),
                        },
                        onProgress,
                    )
                );
            } catch (error) {
                const message = (error instanceof Error) ? error.message : String(error);
                const isCantOpenThrown = message.includes('SQLITE_CANTOPEN');
                if (!isCantOpenThrown || attempt >= maxImportAttempts) {
                    throw error;
                }
                log.log(`[ImportTiming] [${dictionaryTitle}] retrying import after thrown SQLITE_CANTOPEN (attempt ${attempt})`);
                await new Promise((resolve) => {
                    setTimeout(resolve, 1000);
                });
                continue;
            }
            const isCantOpenError = Array.isArray(importResult.errors) && importResult.errors.some((error) => {
                const message = (error instanceof Error) ? error.message : String(error);
                return message.includes('SQLITE_CANTOPEN');
            });
            if (!isCantOpenError || attempt >= maxImportAttempts) {
                break;
            }
            log.log(`[ImportTiming] [${dictionaryTitle}] retrying import after SQLITE_CANTOPEN (attempt ${attempt})`);
            await new Promise((resolve) => {
                setTimeout(resolve, 1000);
            });
        }
        const workerImportEndTime = safePerformance.now();
        log.log(`[ImportTiming] [${dictionaryTitle}] worker importDictionary ${formatDurationMs(workerImportEndTime - workerImportStartTime)}`);

        const {result, errors, debug} = importResult;
        if (!result) {
            reportDiagnostics('dictionary-import-zip-no-result', {
                dictionaryTitle,
                errorCount: Array.isArray(errors) ? errors.length : -1,
                usesFallbackStorage: debug?.usesFallbackStorage ?? null,
            });
            Reflect.set(globalThis, '__manabitanLastImportDebug', {
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
            Reflect.set(globalThis, '__manabitanLastImportDebug', {
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
            });
            return errorsWithOpfsRequirement;
        }

        const addSettingsStartTime = safePerformance.now();
        const errors2 = await this._addDictionarySettings(result, profilesDictionarySettings);
        const addSettingsEndTime = safePerformance.now();
        log.log(`[ImportTiming] [${dictionaryTitle}] add dictionary settings ${formatDurationMs(addSettingsEndTime - addSettingsStartTime)}`);
        Reflect.set(globalThis, '__manabitanLastImportDebug', {
            dictionaryTitle,
            hasResult: true,
            resultTitle: result.title || null,
            errorCount: Array.isArray(errors) ? errors.length : -1,
            addSettingsErrorCount: errors2.length,
            fallbackDatabaseContentBase64Length: null,
            usesFallbackStorage: debug?.usesFallbackStorage ?? null,
            openStorageDiagnostics: debug?.openStorageDiagnostics ?? null,
            useImportSession: debug?.useImportSession ?? null,
            finalizeImportSession: debug?.finalizeImportSession ?? null,
        });

        if (!(useImportSession && !finalizeImportSession)) {
            const triggerDatabaseUpdatedStartTime = safePerformance.now();
            await this._settingsController.application.api.triggerDatabaseUpdated('dictionary', 'import');
            const triggerDatabaseUpdatedEndTime = safePerformance.now();
            log.log(`[ImportTiming] [${dictionaryTitle}] triggerDatabaseUpdated ${formatDurationMs(triggerDatabaseUpdatedEndTime - triggerDatabaseUpdatedStartTime)}`);
        } else {
            log.log(`[ImportTiming] [${dictionaryTitle}] triggerDatabaseUpdated deferred until import session finalize`);
        }

        // Only runs if updating a dictionary
        if (profilesDictionarySettings !== null) {
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
        }

        const importEndTime = safePerformance.now();
        log.log(`[ImportTiming] [${dictionaryTitle}] total import path ${formatDurationMs(importEndTime - importStartTime)} (errors=${errors.length + errors2.length})`);
        reportDiagnostics('dictionary-import-zip-complete', {
            dictionaryTitle,
            elapsedMs: Math.max(0, importEndTime - importStartTime),
            importErrors: errors.length,
            settingsErrors: errors2.length,
            resultTitle: result.title || null,
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
            }

            if (sequenced && options.general.mainDictionary === '') {
                const path2 = `profiles[${i}].options.general.mainDictionary`;
                targets.push({action: 'set', path: path2, value: title});
            }
        }
        return await this._modifyGlobalSettings(targets);
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

        const progressSelector = '.dictionary-import-progress';
        /** @type {NodeListOf<HTMLElement>} */
        this._progressBars = (document.querySelectorAll(`${progressSelector} .progress-bar`));
        /** @type {NodeListOf<HTMLElement>} */
        this._infoLabels = (document.querySelectorAll(`${progressSelector} .progress-info`));
        /** @type {NodeListOf<HTMLElement>} */
        this._statusLabels = (document.querySelectorAll(`${progressSelector} .progress-status`));

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

    /** @type {import('dictionary-worker').ImportProgressCallback} */
    onProgress(data) {
        const {nextStep, index, count} = data;
        const previousStepIndex = this._stepIndex;
        if (nextStep && this._steps.length > 0) {
            this._stepIndex = Math.min(this._stepIndex + 1, this._steps.length - 1);
        }
        const currentStep = this.currentStep;
        const currentLabel = currentStep?.label ?? 'Working';
        const labelText = `${this.statusPrefix} - Step ${this._stepIndex + 1} of ${this.stepCount}: ${currentLabel}...`;
        for (const label of this._infoLabels) { label.textContent = labelText; }

        const percent = count > 0 ? (index / count * 100) : 0;
        const cssString = `${percent}%`;
        const statusString = `${Math.floor(percent).toFixed(0)}%`;
        for (const progressBar of this._progressBars) { progressBar.style.width = cssString; }
        for (const label of this._statusLabels) { label.textContent = statusString; }

        if (currentStep && typeof currentStep.callback === 'function') {
            currentStep.callback();
        }

        if (nextStep && this._steps.length > 0 && this._stepIndex !== previousStepIndex) {
            const now = safePerformance.now();
            const completedStep = this._steps[previousStepIndex];
            const completedLabel = completedStep?.label ?? `Step ${previousStepIndex + 1}`;
            const stepDuration = now - this._stepStartTime;
            log.log(`[ImportTiming] ${this.statusPrefix} completed "${completedLabel}" in ${formatDurationMs(stepDuration)}`);
            this._stepStartTime = now;
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
        log.log(`[ImportTiming] dictionary ${this._dictionaryIndex}/${this._dictionaryCount} started`);
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
        log.log(`[ImportTiming] ${this.statusPrefix} current step "${currentStepLabel}" open for ${formatDurationMs(currentStepDuration)}`);
        log.log(`[ImportTiming] dictionary ${this._dictionaryIndex}/${this._dictionaryCount} total progress phase time ${formatDurationMs(currentDictionaryDuration)}`);
        log.log(`[ImportTiming] all dictionaries progress phases complete in ${formatDurationMs(totalDuration)} (step-transitions=${this._stepChangeCount}, errors=${errorCount})`);
    }
}
