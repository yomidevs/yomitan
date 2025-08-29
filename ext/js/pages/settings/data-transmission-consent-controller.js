/*
 * Copyright (C) 2025  Yomitan Authors
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

import {querySelectorNotNull} from '../../dom/query-selector.js';
import {ModalController} from './modal-controller.js';

export class DataTransmissionConsentController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     * @param {ModalController} modalController
     */
    constructor(settingsController, modalController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {ModalController} */
        this._modalController = modalController;
        /** @type {?HTMLButtonElement} */
        this._acceptDataTransmissionButton = null;
        /** @type {?HTMLButtonElement} */
        this._declineDataTransmissionButton = null;
    }

    /** */
    async prepare() {
        const firefoxDataTransmissionModal = this._modalController.getModal('firefox-data-transmission-consent');

        if (firefoxDataTransmissionModal) {
            this._acceptDataTransmissionButton = /** @type {HTMLButtonElement} */ (querySelectorNotNull(document, '#accept-data-transmission'));
            this._declineDataTransmissionButton = /** @type {HTMLButtonElement} */ (querySelectorNotNull(document, '#decline-data-transmission'));

            this._acceptDataTransmissionButton.addEventListener('click', this._onAccept.bind(this));
            this._declineDataTransmissionButton.addEventListener('click', this._onDecline.bind(this));

            const options = await this._settingsController.getOptionsFull();
            firefoxDataTransmissionModal?.setVisible(!options.global.dataTransmissionConsentShown);
        }
    }

    // Private

    /** */
    async _onAccept() {
        await this._settingsController.setGlobalSetting('global.dataTransmissionConsentShown', true);
    }

    /** */
    async _onDecline() {
        await this._settingsController.setGlobalSetting('global.dataTransmissionConsentShown', true);
        await this._settingsController.setProfileSetting('audio.enabled', false);
    }
}
