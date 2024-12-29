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
import {HotkeyHandler} from '../input/hotkey-handler.js';
import {Frontend} from './frontend.js';
import {PopupFactory} from './popup-factory.js';

await Application.main(false, async (application) => {
    const hotkeyHandler = new HotkeyHandler();
    hotkeyHandler.prepare(application.crossFrame);

    const popupFactory = new PopupFactory(application);
    popupFactory.prepare();

    const frontend = new Frontend({
        application,
        popupFactory,
        depth: 0,
        parentPopupId: null,
        parentFrameId: null,
        useProxyPopup: false,
        pageType: 'web',
        canUseWindowPopup: true,
        allowRootFramePopupProxy: true,
        childrenSupported: true,
        hotkeyHandler,
    });
    await frontend.prepare();
});
