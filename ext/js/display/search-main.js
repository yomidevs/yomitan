/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2019-2022  Yomichan Authors
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

import {Application} from '../application.js';
import {DocumentFocusController} from '../dom/document-focus-controller.js';
import {HotkeyHandler} from '../input/hotkey-handler.js';
import {ModalController} from '../pages/settings/modal-controller.js';
import {SettingsController} from '../pages/settings/settings-controller.js';
import {SettingsDisplayController} from '../pages/settings/settings-display-controller.js';
import {DisplayAnki} from './display-anki.js';
import {DisplayAudio} from './display-audio.js';
import {Display} from './display.js';
import {SearchActionPopupController} from './search-action-popup-controller.js';
import {SearchDisplayController} from './search-display-controller.js';
import {SearchPersistentStateController} from './search-persistent-state-controller.js';

function setSearchDebugState(patch) {
    const state = (typeof globalThis.__manabitanSearchDebug === 'object' && globalThis.__manabitanSearchDebug !== null) ?
        globalThis.__manabitanSearchDebug :
        {};
    globalThis.__manabitanSearchDebug = {
        ...state,
        ...patch,
        updatedAt: Date.now(),
    };
}

/**
 * @param {string} message
 */
function showSearchInitializationError(message) {
    const dictionaryEntries = document.querySelector('#dictionary-entries');
    const noResults = document.querySelector('#no-results');
    const noDictionaries = document.querySelector('#no-dictionaries');
    if (noResults instanceof HTMLElement) { noResults.hidden = true; }
    if (noDictionaries instanceof HTMLElement) { noDictionaries.hidden = true; }
    if (!(dictionaryEntries instanceof HTMLElement)) { return; }

    const entry = document.createElement('div');
    entry.className = 'entry';
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    entry.append(paragraph);

    dictionaryEntries.replaceChildren(entry);
}

let startupFailed = false;
setSearchDebugState({
    initStarted: true,
    initStage: 'boot',
    startupFailed: false,
});
try {
    await Application.main(true, async (application) => {
        let callbackError = false;
        try {
            setSearchDebugState({initStage: 'application-main'});
            const documentFocusController = new DocumentFocusController('#search-textbox');
            documentFocusController.prepare();

            const searchPersistentStateController = new SearchPersistentStateController();
            searchPersistentStateController.prepare();

            const searchActionPopupController = new SearchActionPopupController(searchPersistentStateController);
            searchActionPopupController.prepare();

            const hotkeyHandler = new HotkeyHandler();
            hotkeyHandler.prepare(application.crossFrame);

            const display = new Display(application, 'search', documentFocusController, hotkeyHandler);
            await display.prepare();

            const {browser} = await application.api.getEnvironmentInfo();
            const modalController = new ModalController((browser === 'firefox' || browser === 'firefox-mobile') ? ['settings-modals'] : []);
            await modalController.prepare();

            const displayAudio = new DisplayAudio(display, modalController);
            displayAudio.prepare();

            const displayAnki = new DisplayAnki(display, displayAudio);
            displayAnki.prepare();

            const searchDisplayController = new SearchDisplayController(display, displayAudio, searchPersistentStateController);
            await searchDisplayController.prepare();

            const settingsController = new SettingsController(application);
            await settingsController.prepare();

            const settingsDisplayController = new SettingsDisplayController(settingsController, modalController);
            await settingsDisplayController.prepare();

            documentFocusController.focusElement();
            display.initializeState();
            document.documentElement.dataset.loaded = 'true';
            delete document.documentElement.dataset.loadError;
            setSearchDebugState({
                initStage: 'ready',
                startupFailed: false,
                loaded: true,
                loadError: false,
            });
        } catch (error) {
            callbackError = true;
            startupFailed = true;
            setSearchDebugState({
                initStage: 'callback-error',
                startupFailed: true,
                callbackErrorMessage: error instanceof Error ? error.message : String(error),
            });
            throw error;
        } finally {
            document.body.hidden = false;
            if (callbackError) {
                document.documentElement.dataset.loaded = 'false';
                document.documentElement.dataset.loadError = 'true';
                setSearchDebugState({
                    loaded: false,
                    loadError: true,
                });
                showSearchInitializationError('Search failed to initialize. Reload the extension and try again.');
            }
        }
    });
} catch (_error) {
    startupFailed = true;
    setSearchDebugState({
        initStage: 'outer-error',
        startupFailed: true,
    });
}

if (startupFailed) {
    document.body.hidden = false;
    document.documentElement.dataset.loaded = 'false';
    document.documentElement.dataset.loadError = 'true';
    setSearchDebugState({
        loaded: false,
        loadError: true,
    });
    showSearchInitializationError('Search failed to initialize. Reload the extension and try again.');
}
