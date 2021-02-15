/*
 * Copyright (C) 2020-2021  Yomichan Authors
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
 * HotkeyUtil
 * ScanInputsController
 */

class ScanInputsSimpleController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._middleMouseButtonScan = null;
        this._mainScanModifierKeyInput = null;
        this._mainScanModifierKeyInputHasOther = false;
        this._hotkeyUtil = new HotkeyUtil();
    }

    async prepare() {
        this._middleMouseButtonScan = document.querySelector('#middle-mouse-button-scan');
        this._mainScanModifierKeyInput = document.querySelector('#main-scan-modifier-key');

        const {platform: {os}} = await yomichan.api.getEnvironmentInfo();
        this._hotkeyUtil.os = os;

        this._mainScanModifierKeyInputHasOther = false;
        this._populateSelect(this._mainScanModifierKeyInput, this._mainScanModifierKeyInputHasOther);

        const options = await this._settingsController.getOptions();

        this._middleMouseButtonScan.addEventListener('change', this.onMiddleMouseButtonScanChange.bind(this), false);
        this._mainScanModifierKeyInput.addEventListener('change', this._onMainScanModifierKeyInputChange.bind(this), false);

        this._settingsController.on('scanInputsChanged', this._onScanInputsChanged.bind(this));
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
        this._onOptionsChanged({options});
    }

    async refresh() {
        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    // Private

    _onScanInputsChanged({source}) {
        if (source === this) { return; }
        this.refresh();
    }

    _onOptionsChanged({options}) {
        const {scanning: {inputs}} = options;
        const middleMouseSupportedIndex = this._getIndexOfMiddleMouseButtonScanInput(inputs);
        const mainScanInputIndex = this._getIndexOfMainScanInput(inputs);
        const hasMainScanInput = (mainScanInputIndex >= 0);

        let middleMouseSupported = false;
        if (middleMouseSupportedIndex >= 0) {
            const includeValues = this._splitValue(inputs[middleMouseSupportedIndex].include);
            if (includeValues.includes('mouse2')) {
                middleMouseSupported = true;
            }
        }

        let mainScanInput = 'none';
        if (hasMainScanInput) {
            const includeValues = this._splitValue(inputs[mainScanInputIndex].include);
            if (includeValues.length > 0) {
                mainScanInput = includeValues[0];
            }
        } else {
            mainScanInput = 'other';
        }

        this._setHasMainScanInput(hasMainScanInput);

        this._middleMouseButtonScan.checked = middleMouseSupported;
        this._mainScanModifierKeyInput.value = mainScanInput;
    }

    onMiddleMouseButtonScanChange(e) {
        const middleMouseSupported = e.currentTarget.checked;
        this._setMiddleMouseSuppported(middleMouseSupported);
    }

    _onMainScanModifierKeyInputChange(e) {
        const mainScanKey = e.currentTarget.value;
        if (mainScanKey === 'other') { return; }
        const mainScanInputs = (mainScanKey === 'none' ? [] : [mainScanKey]);
        this._setMainScanInputs(mainScanInputs);
    }

    _populateSelect(select, hasOther) {
        const modifierKeys = [
            {value: 'none', name: 'No key'}
        ];
        for (const value of ['alt', 'ctrl', 'shift', 'meta']) {
            const name = this._hotkeyUtil.getModifierDisplayValue(value);
            modifierKeys.push({value, name});
        }

        if (hasOther) {
            modifierKeys.push({value: 'other', name: 'Other'});
        }

        const fragment = document.createDocumentFragment();
        for (const {value, name} of modifierKeys) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = name;
            fragment.appendChild(option);
        }
        select.textContent = '';
        select.appendChild(fragment);
    }

    _splitValue(value) {
        return value.split(/[,;\s]+/).map((v) => v.trim().toLowerCase()).filter((v) => v.length > 0);
    }

    async _setMiddleMouseSuppported(value) {
        // Find target index
        const options = await this._settingsController.getOptions();
        const {scanning: {inputs}} = options;
        const index = this._getIndexOfMiddleMouseButtonScanInput(inputs);

        if (value) {
            // Add new
            if (index >= 0) { return; }
            let insertionPosition = this._getIndexOfMainScanInput(inputs);
            insertionPosition = (insertionPosition >= 0 ? insertionPosition + 1 : inputs.length);
            const input = ScanInputsController.createDefaultMouseInput('mouse2', '');
            await this._modifyProfileSettings([{
                action: 'splice',
                path: 'scanning.inputs',
                start: insertionPosition,
                deleteCount: 0,
                items: [input]
            }]);
        } else {
            // Modify existing
            if (index < 0) { return; }
            await this._modifyProfileSettings([{
                action: 'splice',
                path: 'scanning.inputs',
                start: index,
                deleteCount: 1,
                items: []
            }]);
        }
    }

    async _setMainScanInputs(value) {
        value = value.join(', ');

        // Find target index
        const options = await this._settingsController.getOptions();
        const {scanning: {inputs}} = options;
        const index = this._getIndexOfMainScanInput(inputs);

        this._setHasMainScanInput(true);

        if (index < 0) {
            // Add new
            const input = ScanInputsController.createDefaultMouseInput(value, 'mouse0');
            await this._modifyProfileSettings([{
                action: 'splice',
                path: 'scanning.inputs',
                start: inputs.length,
                deleteCount: 0,
                items: [input]
            }]);
        } else {
            // Modify existing
            await this._modifyProfileSettings([{
                action: 'set',
                path: `scanning.inputs[${index}].include`,
                value
            }]);
        }
    }

    async _modifyProfileSettings(targets) {
        await this._settingsController.modifyProfileSettings(targets);
        this._settingsController.trigger('scanInputsChanged', {source: this});
    }

    _getIndexOfMainScanInput(inputs) {
        for (let i = 0, ii = inputs.length; i < ii; ++i) {
            const {include, exclude, types: {mouse}} = inputs[i];
            if (!mouse) { continue; }
            const includeValues = this._splitValue(include);
            const excludeValues = this._splitValue(exclude);
            if (
                (
                    includeValues.length === 0 ||
                    (includeValues.length === 1 && !this._isMouseInput(includeValues[0]))
                ) &&
                excludeValues.length === 1 &&
                excludeValues[0] === 'mouse0'
            ) {
                return i;
            }
        }
        return -1;
    }

    _getIndexOfMiddleMouseButtonScanInput(inputs) {
        for (let i = 0, ii = inputs.length; i < ii; ++i) {
            const {include, exclude, types: {mouse}} = inputs[i];
            if (!mouse) { continue; }
            const includeValues = this._splitValue(include);
            const excludeValues = this._splitValue(exclude);
            if (
                (includeValues.length === 1 && includeValues[0] === 'mouse2') &&
                excludeValues.length === 0
            ) {
                return i;
            }
        }
        return -1;
    }

    _isMouseInput(input) {
        return /^mouse\d+$/.test(input);
    }

    _setHasMainScanInput(hasMainScanInput) {
        if (this._mainScanModifierKeyInputHasOther !== hasMainScanInput) { return; }
        this._mainScanModifierKeyInputHasOther = !hasMainScanInput;
        this._populateSelect(this._mainScanModifierKeyInput, this._mainScanModifierKeyInputHasOther);
    }
}