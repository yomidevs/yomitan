/*
 * Copyright (C) 2019-2020  Yomichan Authors
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
 * Frontend
 * PopupFactory
 * api
 */

(async () => {
    try {
        api.forwardLogsToBackend();
        await yomichan.backendReady();

        const {frameId} = await api.frameInformationGet();
        if (typeof frameId !== 'number') {
            throw new Error('Failed to get frameId');
        }

        const popupFactory = new PopupFactory(frameId);
        popupFactory.prepare();

        const frontend = new Frontend({
            frameId,
            popupFactory,
            depth: 0,
            parentPopupId: null,
            parentFrameId: null,
            useProxyPopup: false,
            isSearchPage: false,
            allowRootFramePopupProxy: true
        });
        await frontend.prepare();

        yomichan.ready();
    } catch (e) {
        yomichan.logError(e);
    }
})();
