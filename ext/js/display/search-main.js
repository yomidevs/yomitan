/*
 * Copyright (C) 2019-2021  Yomichan Authors
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

/* global
 * Display
 * DocumentFocusController
 * HotkeyHandler
 * JapaneseUtil
 * SearchDisplayController
 * wanakana
 */

(async () => {
    try {
        const documentFocusController = new DocumentFocusController('#search-textbox');
        documentFocusController.prepare();

        await yomichan.prepare();

        const {tabId, frameId} = await yomichan.api.frameInformationGet();

        const japaneseUtil = new JapaneseUtil(wanakana);

        const hotkeyHandler = new HotkeyHandler();
        hotkeyHandler.prepare();

        const display = new Display(tabId, frameId, 'search', japaneseUtil, documentFocusController, hotkeyHandler);
        await display.prepare();

        const searchDisplayController = new SearchDisplayController(tabId, frameId, display, japaneseUtil);
        await searchDisplayController.prepare();

        display.initializeState();

        document.documentElement.dataset.loaded = 'true';

        yomichan.ready();
    } catch (e) {
        log.error(e);
    }
})();
