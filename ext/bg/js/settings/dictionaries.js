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
 * api
 * utilBackgroundIsolate
 */

class SettingsDictionaryListUI extends EventDispatcher {
    constructor(container, template, extraContainer, extraTemplate) {
        super();
        this.container = container;
        this.template = template;
        this.extraContainer = extraContainer;
        this.extraTemplate = extraTemplate;
        this.optionsDictionaries = null;
        this.dictionaries = null;
        this.dictionaryEntries = [];
        this.extra = null;

        document.querySelector('#dict-delete-confirm').addEventListener('click', this.onDictionaryConfirmDelete.bind(this), false);
    }

    setOptionsDictionaries(optionsDictionaries) {
        this.optionsDictionaries = optionsDictionaries;
        if (this.dictionaries !== null) {
            this.setDictionaries(this.dictionaries);
        }
    }

    setDictionaries(dictionaries) {
        for (const dictionaryEntry of this.dictionaryEntries) {
            dictionaryEntry.cleanup();
        }

        this.dictionaryEntries = [];
        this.dictionaries = toIterable(dictionaries);

        if (this.optionsDictionaries === null) {
            return;
        }

        let changed = false;
        for (const dictionaryInfo of this.dictionaries) {
            if (this.createEntry(dictionaryInfo)) {
                changed = true;
            }
        }

        this.updateDictionaryOrder();

        const titles = this.dictionaryEntries.map((e) => e.dictionaryInfo.title);
        const removeKeys = Object.keys(this.optionsDictionaries).filter((key) => titles.indexOf(key) < 0);
        if (removeKeys.length > 0) {
            for (const key of toIterable(removeKeys)) {
                delete this.optionsDictionaries[key];
            }
            changed = true;
        }

        if (changed) {
            this.save();
        }
    }

    createEntry(dictionaryInfo) {
        const title = dictionaryInfo.title;
        let changed = false;
        let optionsDictionary;
        const optionsDictionaries = this.optionsDictionaries;
        if (hasOwn(optionsDictionaries, title)) {
            optionsDictionary = optionsDictionaries[title];
        } else {
            optionsDictionary = SettingsDictionaryListUI.createDictionaryOptions();
            optionsDictionaries[title] = optionsDictionary;
            changed = true;
        }

        const content = document.importNode(this.template.content, true).firstChild;

        this.dictionaryEntries.push(new SettingsDictionaryEntryUI(this, dictionaryInfo, content, optionsDictionary));

        return changed;
    }

    static createDictionaryOptions() {
        return utilBackgroundIsolate({
            priority: 0,
            enabled: false,
            allowSecondarySearches: false
        });
    }

    createExtra(totalCounts, remainders, totalRemainder) {
        const content = document.importNode(this.extraTemplate.content, true).firstChild;
        this.extraContainer.appendChild(content);
        return new SettingsDictionaryExtraUI(this, totalCounts, remainders, totalRemainder, content);
    }

    setCounts(dictionaryCounts, totalCounts) {
        const remainders = Object.assign({}, totalCounts);
        const keys = Object.keys(remainders);

        for (let i = 0, ii = Math.min(this.dictionaryEntries.length, dictionaryCounts.length); i < ii; ++i) {
            const counts = dictionaryCounts[i];
            this.dictionaryEntries[i].setCounts(counts);

            for (const key of keys) {
                remainders[key] -= counts[key];
            }
        }

        let totalRemainder = 0;
        for (const key of keys) {
            totalRemainder += remainders[key];
        }

        if (this.extra !== null) {
            this.extra.cleanup();
            this.extra = null;
        }

        if (totalRemainder > 0) {
            this.extra = this.createExtra(totalCounts, remainders, totalRemainder);
        }
    }

    updateDictionaryOrder() {
        const sortInfo = this.dictionaryEntries.map((e, i) => [e, i]);
        sortInfo.sort((a, b) => {
            const i = b[0].optionsDictionary.priority - a[0].optionsDictionary.priority;
            return (i !== 0 ? i : a[1] - b[1]);
        });

        for (const [e] of sortInfo) {
            this.container.appendChild(e.content);
        }
    }

    save() {
        // Overwrite
    }

    preventPageExit() {
        // Overwrite
        return {end: () => {}};
    }

    onDictionaryConfirmDelete(e) {
        e.preventDefault();
        const n = document.querySelector('#dict-delete-modal');
        const title = n.dataset.dict;
        delete n.dataset.dict;
        $(n).modal('hide');

        const index = this.dictionaryEntries.findIndex((entry) => entry.dictionaryInfo.title === title);
        if (index >= 0) {
            this.dictionaryEntries[index].deleteDictionary();
        }
    }
}

class SettingsDictionaryEntryUI {
    constructor(parent, dictionaryInfo, content, optionsDictionary) {
        this.parent = parent;
        this.dictionaryInfo = dictionaryInfo;
        this.optionsDictionary = optionsDictionary;
        this.counts = null;
        this.eventListeners = new EventListenerCollection();
        this.isDeleting = false;

        this.content = content;
        this.enabledCheckbox = this.content.querySelector('.dict-enabled');
        this.allowSecondarySearchesCheckbox = this.content.querySelector('.dict-allow-secondary-searches');
        this.priorityInput = this.content.querySelector('.dict-priority');
        this.deleteButton = this.content.querySelector('.dict-delete-button');
        this.detailsToggleLink = this.content.querySelector('.dict-details-toggle-link');
        this.detailsContainer = this.content.querySelector('.dict-details');
        this.detailsTable = this.content.querySelector('.dict-details-table');

        if (this.dictionaryInfo.version < 3) {
            this.content.querySelector('.dict-outdated').hidden = false;
        }

        this.setupDetails(dictionaryInfo);

        this.content.querySelector('.dict-title').textContent = this.dictionaryInfo.title;
        this.content.querySelector('.dict-revision').textContent = `rev.${this.dictionaryInfo.revision}`;
        this.content.querySelector('.dict-prefix-wildcard-searches-supported').checked = !!this.dictionaryInfo.prefixWildcardsSupported;

        this.applyValues();

        this.eventListeners.addEventListener(this.enabledCheckbox, 'change', this.onEnabledChanged.bind(this), false);
        this.eventListeners.addEventListener(this.allowSecondarySearchesCheckbox, 'change', this.onAllowSecondarySearchesChanged.bind(this), false);
        this.eventListeners.addEventListener(this.priorityInput, 'change', this.onPriorityChanged.bind(this), false);
        this.eventListeners.addEventListener(this.deleteButton, 'click', this.onDeleteButtonClicked.bind(this), false);
        this.eventListeners.addEventListener(this.detailsToggleLink, 'click', this.onDetailsToggleLinkClicked.bind(this), false);
    }

    setupDetails(dictionaryInfo) {
        const targets = [
            ['Author', 'author'],
            ['URL', 'url'],
            ['Description', 'description'],
            ['Attribution', 'attribution']
        ];

        let count = 0;
        for (const [label, key] of targets) {
            const info = dictionaryInfo[key];
            if (typeof info !== 'string') { continue; }

            const n1 = document.createElement('div');
            n1.className = 'dict-details-entry';
            n1.dataset.type = key;

            const n2 = document.createElement('span');
            n2.className = 'dict-details-entry-label';
            n2.textContent = `${label}:`;
            n1.appendChild(n2);

            const n3 = document.createElement('span');
            n3.className = 'dict-details-entry-info';
            n3.textContent = info;
            n1.appendChild(n3);

            this.detailsTable.appendChild(n1);

            ++count;
        }

        if (count === 0) {
            this.detailsContainer.hidden = true;
            this.detailsToggleLink.hidden = true;
        }
    }

    cleanup() {
        if (this.content !== null) {
            if (this.content.parentNode !== null) {
                this.content.parentNode.removeChild(this.content);
            }
            this.content = null;
        }
        this.dictionaryInfo = null;
        this.eventListeners.removeAllEventListeners();
    }

    setCounts(counts) {
        this.counts = counts;
        const node = this.content.querySelector('.dict-counts');
        node.textContent = JSON.stringify({
            info: this.dictionaryInfo,
            counts
        }, null, 4);
        node.removeAttribute('hidden');
    }

    save() {
        this.parent.save();
    }

    applyValues() {
        this.enabledCheckbox.checked = this.optionsDictionary.enabled;
        this.allowSecondarySearchesCheckbox.checked = this.optionsDictionary.allowSecondarySearches;
        this.priorityInput.value = `${this.optionsDictionary.priority}`;
    }

    async deleteDictionary() {
        if (this.isDeleting) {
            return;
        }

        const progress = this.content.querySelector('.progress');
        progress.hidden = false;
        const progressBar = this.content.querySelector('.progress-bar');
        this.isDeleting = true;

        const prevention = this.parent.preventPageExit();
        try {
            const onProgress = ({processed, count, storeCount, storesProcesed}) => {
                let percent = 0.0;
                if (count > 0 && storesProcesed > 0) {
                    percent = (processed / count) * (storesProcesed / storeCount) * 100.0;
                }
                progressBar.style.width = `${percent}%`;
            };

            await api.deleteDictionary(this.dictionaryInfo.title, onProgress);
        } catch (e) {
            this.dictionaryErrorsShow([e]);
        } finally {
            prevention.end();
            this.isDeleting = false;
            progress.hidden = true;

            this.parent.trigger('databaseUpdated');
        }
    }

    onEnabledChanged(e) {
        this.optionsDictionary.enabled = !!e.target.checked;
        this.save();
    }

    onAllowSecondarySearchesChanged(e) {
        this.optionsDictionary.allowSecondarySearches = !!e.target.checked;
        this.save();
    }

    onPriorityChanged(e) {
        let value = Number.parseFloat(e.target.value);
        if (Number.isNaN(value)) {
            value = this.optionsDictionary.priority;
        } else {
            this.optionsDictionary.priority = value;
            this.save();
        }

        e.target.value = `${value}`;

        this.parent.updateDictionaryOrder();
    }

    onDeleteButtonClicked(e) {
        e.preventDefault();

        if (this.isDeleting) {
            return;
        }

        const title = this.dictionaryInfo.title;
        const n = document.querySelector('#dict-delete-modal');
        n.dataset.dict = title;
        document.querySelector('#dict-remove-modal-dict-name').textContent = title;
        $(n).modal('show');
    }

    onDetailsToggleLinkClicked(e) {
        e.preventDefault();

        this.detailsContainer.hidden = !this.detailsContainer.hidden;
    }
}

class SettingsDictionaryExtraUI {
    constructor(parent, totalCounts, remainders, totalRemainder, content) {
        this.parent = parent;
        this.content = content;

        this.content.querySelector('.dict-total-count').textContent = `${totalRemainder} item${totalRemainder !== 1 ? 's' : ''}`;

        const node = this.content.querySelector('.dict-counts');
        node.textContent = JSON.stringify({
            counts: totalCounts,
            remainders: remainders
        }, null, 4);
        node.removeAttribute('hidden');
    }

    cleanup() {
        if (this.content !== null) {
            if (this.content.parentNode !== null) {
                this.content.parentNode.removeChild(this.content);
            }
            this.content = null;
        }
    }
}

class DictionaryController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._dictionaryUI = null;
    }

    async prepare() {
        this._dictionaryUI = new SettingsDictionaryListUI(
            document.querySelector('#dict-groups'),
            document.querySelector('#dict-template'),
            document.querySelector('#dict-groups-extra'),
            document.querySelector('#dict-extra-template')
        );
        this._dictionaryUI.save = () => this._settingsController.save();
        this._dictionaryUI.preventPageExit = this._preventPageExit.bind(this);
        this._dictionaryUI.on('databaseUpdated', this._onDatabaseUpdated.bind(this));

        document.querySelector('#dict-main').addEventListener('change', this._onDictionaryMainChanged.bind(this), false);
        document.querySelector('#database-enable-prefix-wildcard-searches').addEventListener('change', this._onDatabaseEnablePrefixWildcardSearchesChanged.bind(this), false);

        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
        this._settingsController.on('databaseUpdated', this._onDatabaseUpdated.bind(this));

        await this._onOptionsChanged();
        await this._onDatabaseUpdated();
    }

    // Private

    async _onOptionsChanged() {
        const options = await this._settingsController.getOptionsMutable();

        this._dictionaryUI.setOptionsDictionaries(options.dictionaries);

        const optionsFull = await this._settingsController.getOptionsFull();
        document.querySelector('#database-enable-prefix-wildcard-searches').checked = optionsFull.global.database.prefixWildcardsSupported;

        await this._updateMainDictionarySelectValue();
    }

    _updateMainDictionarySelectOptions(dictionaries) {
        const select = document.querySelector('#dict-main');
        select.textContent = ''; // Empty

        let option = document.createElement('option');
        option.className = 'text-muted';
        option.value = '';
        option.textContent = 'Not selected';
        select.appendChild(option);

        for (const {title, sequenced} of toIterable(dictionaries)) {
            if (!sequenced) { continue; }

            option = document.createElement('option');
            option.value = title;
            option.textContent = title;
            select.appendChild(option);
        }
    }

    async _updateMainDictionarySelectValue() {
        const options = await this._settingsController.getOptions();

        const value = options.general.mainDictionary;

        const select = document.querySelector('#dict-main');
        let selectValue = null;
        for (const child of select.children) {
            if (child.nodeName.toUpperCase() === 'OPTION' && child.value === value) {
                selectValue = value;
                break;
            }
        }

        let missingNodeOption = select.querySelector('option[data-not-installed=true]');
        if (selectValue === null) {
            if (missingNodeOption === null) {
                missingNodeOption = document.createElement('option');
                missingNodeOption.className = 'text-muted';
                missingNodeOption.value = value;
                missingNodeOption.textContent = `${value} (Not installed)`;
                missingNodeOption.dataset.notInstalled = 'true';
                select.appendChild(missingNodeOption);
            }
        } else {
            if (missingNodeOption !== null) {
                missingNodeOption.parentNode.removeChild(missingNodeOption);
            }
        }

        select.value = value;
    }

    async _onDatabaseUpdated() {
        try {
            const dictionaries = await api.getDictionaryInfo();
            this._dictionaryUI.setDictionaries(dictionaries);

            document.querySelector('#dict-warning').hidden = (dictionaries.length > 0);

            this._updateMainDictionarySelectOptions(dictionaries);
            await this._updateMainDictionarySelectValue();

            const {counts, total} = await api.getDictionaryCounts(dictionaries.map((v) => v.title), true);
            this._dictionaryUI.setCounts(counts, total);
        } catch (e) {
            yomichan.logError(e);
        }
    }

    async _onDictionaryMainChanged(e) {
        const select = e.target;
        const value = select.value;

        const missingNodeOption = select.querySelector('option[data-not-installed=true]');
        if (missingNodeOption !== null && missingNodeOption.value !== value) {
            missingNodeOption.parentNode.removeChild(missingNodeOption);
        }

        const options = await this._settingsController.getOptionsMutable();
        options.general.mainDictionary = value;
        await this._settingsController.save();
    }

    async _onDatabaseEnablePrefixWildcardSearchesChanged(e) {
        const optionsFull = await this._settingsController.getOptionsFullMutable();
        const v = !!e.target.checked;
        if (optionsFull.global.database.prefixWildcardsSupported === v) { return; }
        optionsFull.global.database.prefixWildcardsSupported = !!e.target.checked;
        await this._settingsController.save();
    }

    _preventPageExit() {
        return this._settingsController.preventPageExit();
    }
}
