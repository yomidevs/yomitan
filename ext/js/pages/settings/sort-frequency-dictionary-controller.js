/*
 * Copyright (C) 2021-2022  Yomichan Authors
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

class SortFrequencyDictionaryController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._sortFrequencyDictionarySelect = null;
        this._sortFrequencyDictionaryOrderSelect = null;
        this._sortFrequencyDictionaryOrderAutoButton = null;
        this._sortFrequencyDictionaryOrderContainerNode = null;
        this._getDictionaryInfoToken = null;
    }

    async prepare() {
        this._sortFrequencyDictionarySelect = document.querySelector('#sort-frequency-dictionary');
        this._sortFrequencyDictionaryOrderSelect = document.querySelector('#sort-frequency-dictionary-order');
        this._sortFrequencyDictionaryOrderAutoButton = document.querySelector('#sort-frequency-dictionary-order-auto');
        this._sortFrequencyDictionaryOrderContainerNode = document.querySelector('#sort-frequency-dictionary-order-container');

        await this._onDatabaseUpdated();

        yomichan.on('databaseUpdated', this._onDatabaseUpdated.bind(this));
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
        this._sortFrequencyDictionarySelect.addEventListener('change', this._onSortFrequencyDictionarySelectChange.bind(this));
        this._sortFrequencyDictionaryOrderSelect.addEventListener('change', this._onSortFrequencyDictionaryOrderSelectChange.bind(this));
        this._sortFrequencyDictionaryOrderAutoButton.addEventListener('click', this._onSortFrequencyDictionaryOrderAutoButtonClick.bind(this));
    }

    // Private

    async _onDatabaseUpdated() {
        const token = {};
        this._getDictionaryInfoToken = token;
        const dictionaries = await this._settingsController.getDictionaryInfo();
        if (this._getDictionaryInfoToken !== token) { return; }
        this._getDictionaryInfoToken = null;

        this._updateDictionaryOptions(dictionaries);

        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    _onOptionsChanged({options}) {
        const {sortFrequencyDictionary, sortFrequencyDictionaryOrder} = options.general;
        this._sortFrequencyDictionarySelect.value = (sortFrequencyDictionary !== null ? sortFrequencyDictionary : '');
        this._sortFrequencyDictionaryOrderSelect.value = sortFrequencyDictionaryOrder;
        this._sortFrequencyDictionaryOrderContainerNode.hidden = (sortFrequencyDictionary === null);
    }

    _onSortFrequencyDictionarySelectChange() {
        let {value} = this._sortFrequencyDictionarySelect;
        if (value === '') { value = null; }
        this._setSortFrequencyDictionaryValue(value);
    }

    _onSortFrequencyDictionaryOrderSelectChange() {
        const {value} = this._sortFrequencyDictionaryOrderSelect;
        this._setSortFrequencyDictionaryOrderValue(value);
    }

    _onSortFrequencyDictionaryOrderAutoButtonClick() {
        const {value} = this._sortFrequencyDictionarySelect;
        if (value === '') { return; }
        this._autoUpdateOrder(value);
    }

    _updateDictionaryOptions(dictionaries) {
        const fragment = document.createDocumentFragment();
        let option = document.createElement('option');
        option.value = '';
        option.textContent = 'None';
        fragment.appendChild(option);
        for (const {title, counts} of dictionaries) {
            if (this._dictionaryHasNoFrequencies(counts)) { continue; }
            option = document.createElement('option');
            option.value = title;
            option.textContent = title;
            fragment.appendChild(option);
        }
        this._sortFrequencyDictionarySelect.textContent = '';
        this._sortFrequencyDictionarySelect.appendChild(fragment);
    }

    async _setSortFrequencyDictionaryValue(value) {
        this._sortFrequencyDictionaryOrderContainerNode.hidden = (value === null);
        await this._settingsController.setProfileSetting('general.sortFrequencyDictionary', value);
        if (value !== null) {
            await this._autoUpdateOrder(value);
        }
    }

    async _setSortFrequencyDictionaryOrderValue(value) {
        await this._settingsController.setProfileSetting('general.sortFrequencyDictionaryOrder', value);
    }

    async _autoUpdateOrder(dictionary) {
        const order = await this._getFrequencyOrder(dictionary);
        if (order === 0) { return; }
        const value = (order > 0 ? 'descending' : 'ascending');
        this._sortFrequencyDictionaryOrderSelect.value = value;
        await this._setSortFrequencyDictionaryOrderValue(value);
    }

    async _getFrequencyOrder(dictionary) {
        const moreCommonTerms = ['来る', '言う', '出る', '入る', '方', '男', '女', '今', '何', '時'];
        const lessCommonTerms = ['行なう', '論じる', '過す', '行方', '人口', '猫', '犬', '滝', '理', '暁'];
        const terms = [...moreCommonTerms, ...lessCommonTerms];

        const frequencies = await yomichan.api.getTermFrequencies(
            terms.map((term) => ({term, reading: null})),
            [dictionary]
        );

        const termDetails = new Map();
        const moreCommonTermDetails = [];
        const lessCommonTermDetails = [];
        for (const term of moreCommonTerms) {
            const details = {hasValue: false, minValue: Number.MAX_SAFE_INTEGER, maxValue: Number.MIN_SAFE_INTEGER};
            termDetails.set(term, details);
            moreCommonTermDetails.push(details);
        }
        for (const term of lessCommonTerms) {
            const details = {hasValue: false, minValue: Number.MAX_SAFE_INTEGER, maxValue: Number.MIN_SAFE_INTEGER};
            termDetails.set(term, details);
            lessCommonTermDetails.push(details);
        }

        for (const {term, frequency} of frequencies) {
            if (typeof frequency !== 'number') { continue; }
            const details = termDetails.get(term);
            if (typeof details === 'undefined') { continue; }
            details.minValue = Math.min(details.minValue, frequency);
            details.maxValue = Math.max(details.maxValue, frequency);
            details.hasValue = true;
        }

        let result = 0;
        for (const details1 of moreCommonTermDetails) {
            if (!details1.hasValue) { continue; }
            for (const details2 of lessCommonTermDetails) {
                if (!details2.hasValue) { continue; }
                result += Math.sign(details1.maxValue - details2.minValue) + Math.sign(details1.minValue - details2.maxValue);
            }
        }
        return Math.sign(result);
    }

    _dictionaryHasNoFrequencies(counts) {
        if (typeof counts !== 'object' || counts === null) { return false; }
        const {termMeta} = counts;
        if (typeof termMeta !== 'object' || termMeta === null) { return false; }
        return termMeta.freq <= 0;
    }
}
