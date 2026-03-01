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

import {Application} from '../../application.js';
import {reportDiagnostics} from '../../core/diagnostics-reporter.js';
import {safePerformance} from '../../core/safe-performance.js';
import {DocumentFocusController} from '../../dom/document-focus-controller.js';
import {querySelectorNotNull} from '../../dom/query-selector.js';
import {ExtensionContentController} from '../common/extension-content-controller.js';
import {AnkiController} from './anki-controller.js';
import {AnkiDeckGeneratorController} from './anki-deck-generator-controller.js';
import {AnkiTemplatesController} from './anki-templates-controller.js';
import {AudioController} from './audio-controller.js';
import {BackupController} from './backup-controller.js';
import {CollapsibleDictionaryController} from './collapsible-dictionary-controller.js';
import {DictionaryController} from './dictionary-controller.js';
import {DictionaryImportController} from './dictionary-import-controller.js';
import {ExtensionKeyboardShortcutController} from './extension-keyboard-shortcuts-controller.js';
import {GenericSettingController} from './generic-setting-controller.js';
import {KeyboardShortcutController} from './keyboard-shortcuts-controller.js';
import {LanguagesController} from './languages-controller.js';
import {MecabController} from './mecab-controller.js';
import {ModalController} from './modal-controller.js';
import {NestedPopupsController} from './nested-popups-controller.js';
import {PermissionsToggleController} from './permissions-toggle-controller.js';
import {PersistentStorageController} from './persistent-storage-controller.js';
import {PopupPreviewController} from './popup-preview-controller.js';
import {PopupWindowController} from './popup-window-controller.js';
import {ProfileController} from './profile-controller.js';
import {RecommendedSettingsController} from './recommended-settings-controller.js';
import {ScanInputsController} from './scan-inputs-controller.js';
import {ScanInputsSimpleController} from './scan-inputs-simple-controller.js';
import {SecondarySearchDictionaryController} from './secondary-search-dictionary-controller.js';
import {SentenceTerminationCharactersController} from './sentence-termination-characters-controller.js';
import {SettingsController} from './settings-controller.js';
import {SettingsDisplayController} from './settings-display-controller.js';
import {SortFrequencyDictionaryController} from './sort-frequency-dictionary-controller.js';
import {StatusFooter} from './status-footer.js';
import {StorageController} from './storage-controller.js';
import {TranslationTextReplacementsController} from './translation-text-replacements-controller.js';
import {YomitanApiController} from './yomitan-api-controller.js';

/**
 * @returns {number}
 */
function getNowMs() {
    return safePerformance.now();
}

/**
 * @param {Array<{phase: string, durationMs: number}>} phases
 * @param {string} phase
 * @param {number} startedAt
 */
function recordPhase(phases, phase, startedAt) {
    phases.push({
        phase,
        durationMs: Math.max(0, getNowMs() - startedAt),
    });
}

/**
 * @param {GenericSettingController} genericSettingController
 */
async function setupGenericSettingController(genericSettingController) {
    await genericSettingController.prepare();
    await genericSettingController.refresh();
}

await Application.main(true, async (application) => {
    /** @type {Array<{phase: string, durationMs: number}>} */
    const startupPhases = [];
    const startupStartedAt = getNowMs();
    reportDiagnostics('settings-startup-begin', {
        page: 'settings',
        href: globalThis.location?.href ?? null,
    });

    const documentFocusController = new DocumentFocusController();
    {
        const startedAt = getNowMs();
        documentFocusController.prepare();
        recordPhase(startupPhases, 'documentFocusController.prepare', startedAt);
    }

    const extensionContentController = new ExtensionContentController();
    {
        const startedAt = getNowMs();
        extensionContentController.prepare();
        recordPhase(startupPhases, 'extensionContentController.prepare', startedAt);
    }

    /** @type {HTMLElement} */
    const statusFooterElement = querySelectorNotNull(document, '.status-footer-container');
    const statusFooter = new StatusFooter(statusFooterElement);
    {
        const startedAt = getNowMs();
        statusFooter.prepare();
        recordPhase(startupPhases, 'statusFooter.prepare', startedAt);
    }

    /** @type {?number} */
    let prepareTimer = window.setTimeout(() => {
        prepareTimer = null;
        document.documentElement.dataset.loadingStalled = 'true';
    }, 1000);

    if (prepareTimer !== null) {
        clearTimeout(prepareTimer);
        prepareTimer = null;
    }
    delete document.documentElement.dataset.loadingStalled;

    const preparePromises = [];

    const modalController = new ModalController(['shared-modals', 'settings-modals']);
    {
        const startedAt = getNowMs();
        await modalController.prepare();
        recordPhase(startupPhases, 'modalController.prepare', startedAt);
    }

    const settingsController = new SettingsController(application);
    {
        const startedAt = getNowMs();
        await settingsController.prepare();
        recordPhase(startupPhases, 'settingsController.prepare', startedAt);
    }

    const settingsDisplayController = new SettingsDisplayController(settingsController, modalController);
    {
        const startedAt = getNowMs();
        await settingsDisplayController.prepare();
        recordPhase(startupPhases, 'settingsDisplayController.prepare', startedAt);
    }

    document.body.hidden = false;
    reportDiagnostics('settings-startup-ui-unhidden', {
        page: 'settings',
        elapsedMs: Math.max(0, getNowMs() - startupStartedAt),
        phases: startupPhases,
    });

    const popupPreviewController = new PopupPreviewController(settingsController);
    {
        const startedAt = getNowMs();
        popupPreviewController.prepare();
        recordPhase(startupPhases, 'popupPreviewController.prepare', startedAt);
    }

    const persistentStorageController = new PersistentStorageController(application);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await persistentStorageController.prepare();
        recordPhase(startupPhases, 'persistentStorageController.prepare', startedAt);
    })());

    const storageController = new StorageController(persistentStorageController);
    {
        const startedAt = getNowMs();
        storageController.prepare();
        recordPhase(startupPhases, 'storageController.prepare', startedAt);
    }

    const dictionaryController = new DictionaryController(settingsController, modalController, statusFooter);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await dictionaryController.prepare();
        recordPhase(startupPhases, 'dictionaryController.prepare', startedAt);
    })());

    const dictionaryImportController = new DictionaryImportController(settingsController, modalController, statusFooter);
    {
        const startedAt = getNowMs();
        dictionaryImportController.prepare();
        recordPhase(startupPhases, 'dictionaryImportController.prepare', startedAt);
    }

    const genericSettingController = new GenericSettingController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await setupGenericSettingController(genericSettingController);
        recordPhase(startupPhases, 'genericSettingController.prepare+refresh', startedAt);
    })());

    const audioController = new AudioController(settingsController, modalController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await audioController.prepare();
        recordPhase(startupPhases, 'audioController.prepare', startedAt);
    })());

    const profileController = new ProfileController(settingsController, modalController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await profileController.prepare();
        recordPhase(startupPhases, 'profileController.prepare', startedAt);
    })());

    const settingsBackup = new BackupController(settingsController, modalController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await settingsBackup.prepare();
        recordPhase(startupPhases, 'backupController.prepare', startedAt);
    })());

    const ankiController = new AnkiController(settingsController, application, modalController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await ankiController.prepare();
        recordPhase(startupPhases, 'ankiController.prepare', startedAt);
    })());

    const ankiDeckGeneratorController = new AnkiDeckGeneratorController(application, settingsController, modalController, ankiController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await ankiDeckGeneratorController.prepare();
        recordPhase(startupPhases, 'ankiDeckGeneratorController.prepare', startedAt);
    })());

    const ankiTemplatesController = new AnkiTemplatesController(application, settingsController, modalController, ankiController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await ankiTemplatesController.prepare();
        recordPhase(startupPhases, 'ankiTemplatesController.prepare', startedAt);
    })());

    const scanInputsController = new ScanInputsController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await scanInputsController.prepare();
        recordPhase(startupPhases, 'scanInputsController.prepare', startedAt);
    })());

    const simpleScanningInputController = new ScanInputsSimpleController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await simpleScanningInputController.prepare();
        recordPhase(startupPhases, 'scanInputsSimpleController.prepare', startedAt);
    })());

    const nestedPopupsController = new NestedPopupsController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await nestedPopupsController.prepare();
        recordPhase(startupPhases, 'nestedPopupsController.prepare', startedAt);
    })());

    const permissionsToggleController = new PermissionsToggleController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await permissionsToggleController.prepare();
        recordPhase(startupPhases, 'permissionsToggleController.prepare', startedAt);
    })());

    const secondarySearchDictionaryController = new SecondarySearchDictionaryController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await secondarySearchDictionaryController.prepare();
        recordPhase(startupPhases, 'secondarySearchDictionaryController.prepare', startedAt);
    })());

    const languagesController = new LanguagesController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await languagesController.prepare();
        recordPhase(startupPhases, 'languagesController.prepare', startedAt);
    })());

    const translationTextReplacementsController = new TranslationTextReplacementsController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await translationTextReplacementsController.prepare();
        recordPhase(startupPhases, 'translationTextReplacementsController.prepare', startedAt);
    })());

    const sentenceTerminationCharactersController = new SentenceTerminationCharactersController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await sentenceTerminationCharactersController.prepare();
        recordPhase(startupPhases, 'sentenceTerminationCharactersController.prepare', startedAt);
    })());

    const keyboardShortcutController = new KeyboardShortcutController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await keyboardShortcutController.prepare();
        recordPhase(startupPhases, 'keyboardShortcutController.prepare', startedAt);
    })());

    const extensionKeyboardShortcutController = new ExtensionKeyboardShortcutController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await extensionKeyboardShortcutController.prepare();
        recordPhase(startupPhases, 'extensionKeyboardShortcutController.prepare', startedAt);
    })());

    const popupWindowController = new PopupWindowController(application.api);
    {
        const startedAt = getNowMs();
        popupWindowController.prepare();
        recordPhase(startupPhases, 'popupWindowController.prepare', startedAt);
    }

    const mecabController = new MecabController(application.api);
    {
        const startedAt = getNowMs();
        mecabController.prepare();
        recordPhase(startupPhases, 'mecabController.prepare', startedAt);
    }

    const yomitanApiController = new YomitanApiController(application.api);
    {
        const startedAt = getNowMs();
        yomitanApiController.prepare();
        recordPhase(startupPhases, 'yomitanApiController.prepare', startedAt);
    }

    const collapsibleDictionaryController = new CollapsibleDictionaryController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await collapsibleDictionaryController.prepare();
        recordPhase(startupPhases, 'collapsibleDictionaryController.prepare', startedAt);
    })());

    const sortFrequencyDictionaryController = new SortFrequencyDictionaryController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await sortFrequencyDictionaryController.prepare();
        recordPhase(startupPhases, 'sortFrequencyDictionaryController.prepare', startedAt);
    })());

    const recommendedSettingsController = new RecommendedSettingsController(settingsController);
    preparePromises.push((async () => {
        const startedAt = getNowMs();
        await recommendedSettingsController.prepare();
        recordPhase(startupPhases, 'recommendedSettingsController.prepare', startedAt);
    })());

    await Promise.all(preparePromises);
    const totalElapsedMs = Math.max(0, getNowMs() - startupStartedAt);
    const slowestPhases = [...startupPhases]
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 10);
    reportDiagnostics('settings-startup-complete', {
        page: 'settings',
        totalElapsedMs,
        phaseCount: startupPhases.length,
        slowestPhases,
        phases: startupPhases,
    });

    document.documentElement.dataset.loaded = 'true';
});
