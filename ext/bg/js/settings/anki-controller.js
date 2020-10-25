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
 * AnkiConnect
 * ObjectPropertyAccessor
 * SelectorObserver
 */

class AnkiController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._ankiConnect = new AnkiConnect();
        this._selectorObserver = new SelectorObserver({
            selector: '.anki-card',
            ignoreSelector: null,
            onAdded: this._createCardController.bind(this),
            onRemoved: this._removeCardController.bind(this),
            isStale: this._isCardControllerStale.bind(this)
        });
        this._fieldMarkersRequiringClipboardPermission = new Set([
            'clipboard-image',
            'clipboard-text'
        ]);
        this._stringComparer = new Intl.Collator(); // Locale does not matter
        this._ankiOptions = null;
        this._getAnkiDataPromise = null;
        this._ankiErrorContainer = null;
        this._ankiErrorMessageContainer = null;
        this._ankiErrorMessageDetailsContainer = null;
        this._ankiErrorMessageDetailsToggle = null;
        this._ankiErrorInvalidResponseInfo = null;
    }

    async prepare() {
        this._ankiErrorContainer = document.querySelector('#anki-error');
        this._ankiErrorMessageContainer = document.querySelector('#anki-error-message');
        this._ankiErrorMessageDetailsContainer = document.querySelector('#anki-error-message-details');
        this._ankiErrorMessageDetailsToggle = document.querySelector('#anki-error-message-details-toggle');
        this._ankiErrorInvalidResponseInfo = document.querySelector('#anki-error-invalid-response-info');
        this._ankiEnableCheckbox = document.querySelector('[data-setting="anki.enable"]');

        this._ankiErrorMessageDetailsToggle.addEventListener('click', this._onAnkiErrorMessageDetailsToggleClick.bind(this), false);
        if (this._ankiEnableCheckbox !== null) { this._ankiEnableCheckbox.addEventListener('settingChanged', this._onAnkiEnableChanged.bind(this), false); }

        const options = await this._settingsController.getOptions();
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
        this._onOptionsChanged({options});
    }

    getFieldMarkers(type) {
        switch (type) {
            case 'terms':
                return [
                    'audio',
                    'clipboard-image',
                    'clipboard-text',
                    'cloze-body',
                    'cloze-prefix',
                    'cloze-suffix',
                    'dictionary',
                    'document-title',
                    'expression',
                    'furigana',
                    'furigana-plain',
                    'glossary',
                    'glossary-brief',
                    'pitch-accents',
                    'pitch-accent-graphs',
                    'pitch-accent-positions',
                    'reading',
                    'screenshot',
                    'sentence',
                    'tags',
                    'url'
                ];
            case 'kanji':
                return [
                    'character',
                    'clipboard-image',
                    'clipboard-text',
                    'cloze-body',
                    'cloze-prefix',
                    'cloze-suffix',
                    'dictionary',
                    'document-title',
                    'glossary',
                    'kunyomi',
                    'onyomi',
                    'screenshot',
                    'sentence',
                    'tags',
                    'url'
                ];
            default:
                return [];
        }
    }

    getFieldMarkersHtml(markers) {
        const fragment = document.createDocumentFragment();
        for (const marker of markers) {
            const markerNode = this._settingsController.instantiateTemplate('anki-card-field-marker');
            markerNode.querySelector('.marker-link').textContent = marker;
            fragment.appendChild(markerNode);
        }
        return fragment;
    }

    async getAnkiData() {
        let promise = this._getAnkiDataPromise;
        if (promise === null) {
            promise = this._getAnkiData();
            this._getAnkiDataPromise = promise;
            promise.finally(() => { this._getAnkiDataPromise = null; });
        }
        return promise;
    }

    async getModelFieldNames(model) {
        return await this._ankiConnect.getModelFieldNames(model);
    }

    validateFieldPermissions(fieldValue) {
        let requireClipboard = false;
        const markers = this._getFieldMarkers(fieldValue);
        for (const marker of markers) {
            if (this._fieldMarkersRequiringClipboardPermission.has(marker)) {
                requireClipboard = true;
            }
        }

        if (requireClipboard) {
            this._requestClipboardReadPermission();
        }
    }

    // Private

    async _onOptionsChanged({options: {anki}}) {
        this._ankiOptions = anki;
        this._ankiConnect.server = anki.server;
        this._ankiConnect.enabled = anki.enable;

        this._selectorObserver.disconnect();
        this._selectorObserver.observe(document.documentElement, true);
    }

    _onAnkiErrorMessageDetailsToggleClick() {
        const node = this._ankiErrorMessageDetailsContainer;
        node.hidden = !node.hidden;
    }

    _onAnkiEnableChanged({detail: {value}}) {
        if (this._ankiOptions === null) { return; }
        this._ankiConnect.enabled = value;

        for (const cardController of this._selectorObserver.datas()) {
            cardController.updateAnkiState();
        }
    }

    _createCardController(node) {
        const cardController = new AnkiCardController(this._settingsController, this, node);
        cardController.prepare(this._ankiOptions);
        return cardController;
    }

    _removeCardController(node, cardController) {
        cardController.cleanup();
    }

    _isCardControllerStale(node, cardController) {
        return cardController.isStale();
    }

    async _getAnkiData() {
        const [
            [deckNames, error1],
            [modelNames, error2]
        ] = await Promise.all([
            this._getDeckNames(),
            this._getModelNames()
        ]);

        if (error1 !== null) {
            this._showAnkiError(error1);
        } else if (error2 !== null) {
            this._showAnkiError(error2);
        } else {
            this._hideAnkiError();
        }

        return {deckNames, modelNames};
    }

    async _getDeckNames() {
        try {
            const result = await this._ankiConnect.getDeckNames();
            this._sortStringArray(result);
            return [result, null];
        } catch (e) {
            return [[], e];
        }
    }

    async _getModelNames() {
        try {
            const result = await this._ankiConnect.getModelNames();
            this._sortStringArray(result);
            return [result, null];
        } catch (e) {
            return [[], e];
        }
    }

    _hideAnkiError() {
        this._ankiErrorContainer.hidden = true;
        this._ankiErrorMessageDetailsContainer.hidden = true;
        this._ankiErrorInvalidResponseInfo.hidden = true;
        this._ankiErrorMessageContainer.textContent = '';
        this._ankiErrorMessageDetailsContainer.textContent = '';
    }

    _showAnkiError(error) {
        const errorString = `${error}`;
        this._ankiErrorMessageContainer.textContent = errorString;

        const data = error.data;
        let details = '';
        if (typeof data !== 'undefined') {
            details += `${JSON.stringify(data, null, 4)}\n\n`;
        }
        details += `${error.stack}`.trimRight();
        this._ankiErrorMessageDetailsContainer.textContent = details;

        this._ankiErrorContainer.hidden = false;
        this._ankiErrorMessageDetailsContainer.hidden = true;
        this._ankiErrorInvalidResponseInfo.hidden = (errorString.indexOf('Invalid response') < 0);
    }

    async _requestClipboardReadPermission() {
        const permissions = ['clipboardRead'];

        if (await new Promise((resolve) => chrome.permissions.contains({permissions}, resolve))) {
            // Already has permission
            return;
        }

        return await new Promise((resolve) => chrome.permissions.request({permissions}, resolve));
    }

    _getFieldMarkers(fieldValue) {
        const pattern = /\{([\w-]+)\}/g;
        const markers = [];
        let match;
        while ((match = pattern.exec(fieldValue)) !== null) {
            markers.push(match[1]);
        }
        return markers;
    }

    _sortStringArray(array) {
        const stringComparer = this._stringComparer;
        array.sort((a, b) => stringComparer.compare(a, b));
    }
}

class AnkiCardController {
    constructor(settingsController, ankiController, node) {
        this._settingsController = settingsController;
        this._ankiController = ankiController;
        this._node = node;
        this._cardType = node.dataset.ankiCardType;
        this._eventListeners = new EventListenerCollection();
        this._fieldEventListeners = new EventListenerCollection();
        this._deck = null;
        this._model = null;
        this._fields = null;
        this._modelChangingTo = null;
        this._ankiCardDeckSelect = null;
        this._ankiCardModelSelect = null;
        this._ankiCardFieldsContainer = null;
    }

    async prepare(ankiOptions) {
        const cardOptions = this._getCardOptions(ankiOptions, this._cardType);
        if (cardOptions === null) { return; }
        const {deck, model, fields} = cardOptions;
        this._deck = deck;
        this._model = model;
        this._fields = fields;

        this._ankiCardDeckSelect = this._node.querySelector('.anki-card-deck');
        this._ankiCardModelSelect = this._node.querySelector('.anki-card-model');
        this._ankiCardFieldsContainer = this._node.querySelector('.anki-card-fields');

        this._setupSelects([], []);
        this._setupFields();

        this._eventListeners.addEventListener(this._ankiCardDeckSelect, 'change', this._onCardDeckChange.bind(this), false);
        this._eventListeners.addEventListener(this._ankiCardModelSelect, 'change', this._onCardModelChange.bind(this), false);

        await this.updateAnkiState();
    }

    cleanup() {
        this._eventListeners.removeAllEventListeners();
    }

    async updateAnkiState() {
        if (this._fields === null) { return; }
        const {deckNames, modelNames} = await this._ankiController.getAnkiData();
        this._setupSelects(deckNames, modelNames);
    }

    isStale() {
        return (this._cardType !== this._node.dataset.ankiCardType);
    }

    // Private

    _onCardDeckChange(e) {
        this._setDeck(e.currentTarget.value);
    }

    _onCardModelChange(e) {
        this._setModel(e.currentTarget.value);
    }

    _onFieldChange(e) {
        this._ankiController.validateFieldPermissions(e.currentTarget.value);
    }

    _onFieldMarkerLinkClick(e) {
        e.preventDefault();
        const link = e.currentTarget;
        const input = link.closest('.anki-card-field-value-container').querySelector('.anki-card-field-value');
        input.value = `{${link.textContent}}`;
        input.dispatchEvent(new Event('change'));
    }

    _getCardOptions(ankiOptions, cardType) {
        switch (cardType) {
            case 'terms': return ankiOptions.terms;
            case 'kanji': return ankiOptions.kanji;
            default: return null;
        }
    }

    _setupSelects(deckNames, modelNames) {
        const deck = this._deck;
        const model = this._model;
        if (!deckNames.includes(deck)) { deckNames = [...deckNames, deck]; }
        if (!modelNames.includes(model)) { modelNames = [...modelNames, model]; }

        this._setSelectOptions(this._ankiCardDeckSelect, deckNames);
        this._ankiCardDeckSelect.value = deck;

        this._setSelectOptions(this._ankiCardModelSelect, modelNames);
        this._ankiCardModelSelect.value = model;
    }

    _setSelectOptions(select, optionValues) {
        const fragment = document.createDocumentFragment();
        for (const optionValue of optionValues) {
            const option = document.createElement('option');
            option.value = optionValue;
            option.textContent = optionValue;
            fragment.appendChild(option);
        }
        select.textContent = '';
        select.appendChild(fragment);
    }

    _setupFields() {
        this._fieldEventListeners.removeAllEventListeners();

        const markers = this._ankiController.getFieldMarkers(this._cardType);
        const totalFragment = document.createDocumentFragment();
        for (const [fieldName, fieldValue] of Object.entries(this._fields)) {
            const content = this._settingsController.instantiateTemplateFragment('anki-card-field');

            content.querySelector('.anki-card-field-name').textContent = fieldName;

            const inputField = content.querySelector('.anki-card-field-value');
            inputField.value = fieldValue;
            inputField.dataset.setting = ObjectPropertyAccessor.getPathString(['anki', this._cardType, 'fields', fieldName]);
            this._fieldEventListeners.addEventListener(inputField, 'change', this._onFieldChange.bind(this), false);

            const markerList = content.querySelector('.anki-card-field-marker-list');
            if (markerList !== null) {
                const markersFragment = this._ankiController.getFieldMarkersHtml(markers);
                for (const element of markersFragment.querySelectorAll('.marker-link')) {
                    this._fieldEventListeners.addEventListener(element, 'click', this._onFieldMarkerLinkClick.bind(this), false);
                }
                markerList.appendChild(markersFragment);
            }

            totalFragment.appendChild(content);
        }
        this._ankiCardFieldsContainer.textContent = '';
        this._ankiCardFieldsContainer.appendChild(totalFragment);
    }

    async _setDeck(value) {
        if (this._deck === value) { return; }
        this._deck = value;

        await this._settingsController.modifyProfileSettings([{
            action: 'set',
            path: ObjectPropertyAccessor.getPathString(['anki', this._cardType, 'deck']),
            value
        }]);
    }

    async _setModel(value) {
        if (this._modelChangingTo !== null) {
            // Revert
            this._ankiCardModelSelect.value = this._modelChangingTo;
            return;
        }
        if (this._model === value) { return; }

        let fieldNames;
        try {
            this._modelChangingTo = value;
            fieldNames = await this._ankiController.getModelFieldNames(value);
        } catch (e) {
            // Revert
            this._ankiCardModelSelect.value = this._model;
            return;
        } finally {
            this._modelChangingTo = null;
        }

        const fields = {};
        for (const fieldName of fieldNames) {
            fields[fieldName] = '';
        }

        const targets = [
            {
                action: 'set',
                path: ObjectPropertyAccessor.getPathString(['anki', this._cardType, 'model']),
                value
            },
            {
                action: 'set',
                path: ObjectPropertyAccessor.getPathString(['anki', this._cardType, 'fields']),
                value: fields
            }
        ];

        this._model = value;
        this._fields = fields;

        await this._settingsController.modifyProfileSettings(targets);

        this._setupFields();
    }
}
