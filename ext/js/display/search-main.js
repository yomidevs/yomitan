/*
 * Copyright (C) 2023-2024  Yomitan Authors
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
import {DisplayAnki} from './display-anki.js';
import {DisplayAudio} from './display-audio.js';
import {Display} from './display.js';
import {SearchActionPopupController} from './search-action-popup-controller.js';
import {SearchDisplayController} from './search-display-controller.js';
import {SearchPersistentStateController} from './search-persistent-state-controller.js';

await Application.main(true, async (application) => {
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

    const displayAudio = new DisplayAudio(display);
    displayAudio.prepare();

    const displayAnki = new DisplayAnki(display, displayAudio);
    displayAnki.prepare();

    const searchDisplayController = new SearchDisplayController(display, displayAudio, searchPersistentStateController);
    await searchDisplayController.prepare();

    document.body.hidden = false;

    display.initializeState();

    document.documentElement.dataset.loaded = 'true';
});
