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

import {PopupFactory} from '../../app/popup-factory.js';
import {Application} from '../../application.js';
import {HotkeyHandler} from '../../input/hotkey-handler.js';
import {PopupPreviewFrame} from './popup-preview-frame.js';

await Application.main(async (application) => {
    const {tabId, frameId} = await application.api.frameInformationGet();
    if (typeof tabId === 'undefined') {
        throw new Error('Failed to get tabId');
    }
    if (typeof frameId === 'undefined') {
        throw new Error('Failed to get frameId');
    }

    const hotkeyHandler = new HotkeyHandler();
    hotkeyHandler.prepare(application.crossFrame);

    const popupFactory = new PopupFactory(application, frameId);
    popupFactory.prepare();

    const preview = new PopupPreviewFrame(application, tabId, frameId, popupFactory, hotkeyHandler);
    await preview.prepare();

    document.documentElement.dataset.loaded = 'true';
});
