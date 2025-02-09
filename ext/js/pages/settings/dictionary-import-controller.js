/*
 * Copyright (C) 2023-2024  Yomitan Authors
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
import {readResponseJson} from '../../core/json.js';
import {log} from '../../core/log.js';
import {toError} from '../../core/to-error.js';
import {DictionaryWorker} from '../../dictionary/dictionary-worker.js';
import {querySelectorNotNull} from '../../dom/query-selector.js';
import {DictionaryController} from './dictionary-controller.js';

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
        /** @type {HTMLElement} */
        this._errorContainer = querySelectorNotNull(document, '#dictionary-error');
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
    }

    /** */
    prepare() {
        this._importModal = this._modalController.getModal('dictionary-import');
        this._purgeConfirmModal = this._modalController.getModal('dictionary-confirm-delete-all');

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

        const recommendedDictionaryButton = document.querySelector('[data-modal-action="show,recommended-dictionaries"]');
        if (recommendedDictionaryButton) {
            recommendedDictionaryButton.addEventListener('click', this._renderRecommendedDictionaries.bind(this), false);
        }
    }

    // Private

    /**
     * @param {MouseEvent} e
     */
    async _onRecommendedImportClick(e) {
        if (!e.target || !(e.target instanceof HTMLButtonElement)) { return; }

        const import_url = e.target.attributes.getNamedItem('data-import-url');
        if (!import_url) { return; }
        this._recommendedDictionaryQueue.push(import_url.value);

        e.target.disabled = true;

        if (this._recommendedDictionaryActiveImport) { return; }

        while (this._recommendedDictionaryQueue.length > 0) {
            this._recommendedDictionaryActiveImport = true;
            try {
                const url = this._recommendedDictionaryQueue[0];
                if (!url) { continue; }

                const importProgressTracker = new ImportProgressTracker(this._getUrlImportSteps(), 1);
                const onProgress = importProgressTracker.onProgress.bind(importProgressTracker);
                await this._importDictionaries(
                    this._generateFilesFromUrls([url], onProgress),
                    null,
                    null,
                    importProgressTracker,
                );
                void this._recommendedDictionaryQueue.shift();
            } catch (error) {
                log.error(error);
            }
        }
        this._recommendedDictionaryActiveImport = false;
    }

    /** */
    async _renderRecommendedDictionaries() {
        const url = '../../data/recommended-dictionaries.json';
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

        /** @type {import('dictionary-recommended.js').RecommendedDictionaryElementMap[]} */
        const recommendedDictionaryCategories = [
            {property: 'terms', element: querySelectorNotNull(querySelectorNotNull(document, '#recommended-term-dictionaries'), '.recommended-dictionary-list')},
            {property: 'kanji', element: querySelectorNotNull(querySelectorNotNull(document, '#recommended-kanji-dictionaries'), '.recommended-dictionary-list')},
            {property: 'frequency', element: querySelectorNotNull(querySelectorNotNull(document, '#recommended-frequency-dictionaries'), '.recommended-dictionary-list')},
            {property: 'grammar', element: querySelectorNotNull(querySelectorNotNull(document, '#recommended-grammar-dictionaries'), '.recommended-dictionary-list')},
            {property: 'pronunciation', element: querySelectorNotNull(querySelectorNotNull(document, '#recommended-pronunciation-dictionaries'), '.recommended-dictionary-list')},
        ];

        const language = (await this._settingsController.getOptions()).general.language;
        /** @type {import('dictionary-recommended.js').RecommendedDictionaries} */
        const recommendedDictionaries = (await readResponseJson(response));

        if (!(language in recommendedDictionaries)) {
            for (const {element} of recommendedDictionaryCategories) {
                const dictionaryCategoryParent = element.parentElement;
                if (dictionaryCategoryParent) {
                    dictionaryCategoryParent.hidden = true;
                }
            }
            return;
        }

        const installedDictionaries = await this._settingsController.getDictionaryInfo();
        /** @type {Set<string>} */
        const installedDictionaryNames = new Set();
        /** @type {Set<string>} */
        const installedDictionaryDownloadUrls = new Set();
        for (const dictionary of installedDictionaries) {
            installedDictionaryNames.add(dictionary.title);
            if (dictionary.downloadUrl) {
                installedDictionaryDownloadUrls.add(dictionary.downloadUrl);
            }
        }

        for (const {property, element} of recommendedDictionaryCategories) {
            this._renderRecommendedDictionaryGroup(recommendedDictionaries[language][property], element, installedDictionaryNames, installedDictionaryDownloadUrls);
        }

        /** @type {NodeListOf<HTMLElement>} */
        const buttons = document.querySelectorAll('.action-button[data-action=import-recommended-dictionary]');
        for (const button of buttons) {
            button.addEventListener('click', this._onRecommendedImportClick.bind(this), false);
        }
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

            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url.trim(), true);
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
                                reject(new Error(`Failed to fetch blob from ${url}`));
                            }
                        } else {
                            reject(new Error(`Failed to fetch the URL: ${url}`));
                        }
                    };

                    xhr.onerror = () => {
                        reject(new Error(`Error fetching URL: ${url}`));
                    };
                });

                xhr.send();

                const file = await blobPromise;
                yield file;
            } catch (error) {
                log.error(error);
            }
        }
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
        try {
            this._setModifying(true);
            this._hideErrors();

            for (const progress of [...progressContainers, ...recommendedProgressContainers]) { progress.hidden = false; }

            const optionsFull = await this._settingsController.getOptionsFull();
            const importDetails = {
                prefixWildcardsSupported: optionsFull.global.database.prefixWildcardsSupported,
                yomitanVersion: chrome.runtime.getManifest().version,
            };

            for (let i = 0; i < importProgressTracker.dictionaryCount; ++i) {
                importProgressTracker.onNextDictionary();
                if (statusFooter !== null) { statusFooter.setTaskActive(progressSelector, true); }
                const file = (await dictionaries.next()).value;
                if (!file || !(file instanceof File)) {
                    errors.push(new Error(`Failed to read file ${i + 1} of ${importProgressTracker.dictionaryCount}.`));
                    continue;
                }
                errors = [
                    ...errors,
                    ...(await this._importDictionaryFromZip(
                        file,
                        profilesDictionarySettings,
                        importDetails,
                        onProgress,
                    ) ?? []),
                ];
            }
        } catch (error) {
            errors.push(toError(error));
        } finally {
            this._showErrors(errors);
            prevention.end();
            for (const progress of [...progressContainers, ...recommendedProgressContainers]) { progress.hidden = true; }
            if (statusFooter !== null) { statusFooter.setTaskActive(progressSelector, false); }
            this._setModifying(false);
            this._triggerStorageChanged();
            if (onImportDone) { onImportDone(); }
        }
    }

    /**
     * @returns {import('dictionary-importer').ImportSteps}
     */
    _getFileImportSteps() {
        return [
            {label: '', callback: this._triggerStorageChanged.bind(this)}, // Dictionary import is uninitialized
            {label: 'Initializing import'}, // Dictionary import is uninitialized
            {label: 'Loading dictionary'}, // Load dictionary archive and validate index
            {label: 'Loading schemas'}, // Load schemas and get archive files
            {label: 'Validating data'}, // Load and validate dictionary data
            {label: 'Formatting data'}, // Format dictionary data and extended data support
            {label: 'Importing media'}, // Resolve async requirements and import media
            {label: 'Importing data', callback: this._triggerStorageChanged.bind(this)}, // Add dictionary descriptor and import data
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
     * @param {import('dictionary-worker').ImportProgressCallback} onProgress
     * @returns {Promise<Error[] | undefined>}
     */
    async _importDictionaryFromZip(file, profilesDictionarySettings, importDetails, onProgress) {
        const archiveContent = await this._readFile(file);
        const {result, errors} = await new DictionaryWorker().importDictionary(archiveContent, importDetails, onProgress);
        if (!result) {
            return errors;
        }

        const errors2 = await this._addDictionarySettings(result, profilesDictionarySettings);

        await this._settingsController.application.api.triggerDatabaseUpdated('dictionary', 'import');

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
        if (nextStep) {
            this._stepIndex++;
        }
        const labelText = `${this.statusPrefix} - Step ${this._stepIndex + 1} of ${this.stepCount}: ${this.currentStep.label}...`;
        for (const label of this._infoLabels) { label.textContent = labelText; }

        const percent = count > 0 ? (index / count * 100) : 0;
        const cssString = `${percent}%`;
        const statusString = `${Math.floor(percent).toFixed(0)}%`;
        for (const progressBar of this._progressBars) { progressBar.style.width = cssString; }
        for (const label of this._statusLabels) { label.textContent = statusString; }

        const callback = this.currentStep?.callback;
        if (typeof callback === 'function') {
            callback();
        }
    }

    /**
     *
     */
    onNextDictionary() {
        this._dictionaryIndex += 1;
        this._stepIndex = 0;
        this.onProgress({
            nextStep: true,
            index: 0,
            count: 0,
        });
    }
}
