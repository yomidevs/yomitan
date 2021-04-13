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
 * AnkiConnect
 * AnkiUtil
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
        this._stringComparer = new Intl.Collator(); // Locale does not matter
        this._getAnkiDataPromise = null;
        this._ankiErrorContainer = null;
        this._ankiErrorMessageNode = null;
        this._ankiErrorMessageNodeDefaultContent = '';
        this._ankiErrorMessageDetailsNode = null;
        this._ankiErrorMessageDetailsContainer = null;
        this._ankiErrorMessageDetailsToggle = null;
        this._ankiErrorInvalidResponseInfo = null;
        this._ankiCardPrimary = null;
        this._validateFieldsToken = null;
    }

    get settingsController() {
        return this._settingsController;
    }

    async prepare() {
        this._ankiErrorContainer = document.querySelector('#anki-error');
        this._ankiErrorMessageNode = document.querySelector('#anki-error-message');
        this._ankiErrorMessageNodeDefaultContent = this._ankiErrorMessageNode.textContent;
        this._ankiErrorMessageDetailsNode = document.querySelector('#anki-error-message-details');
        this._ankiErrorMessageDetailsContainer = document.querySelector('#anki-error-message-details-container');
        this._ankiErrorMessageDetailsToggle = document.querySelector('#anki-error-message-details-toggle');
        this._ankiErrorInvalidResponseInfo = document.querySelector('#anki-error-invalid-response-info');
        this._ankiEnableCheckbox = document.querySelector('[data-setting="anki.enable"]');
        this._ankiCardPrimary = document.querySelector('#anki-card-primary');
        const ankiCardPrimaryTypeRadios = document.querySelectorAll('input[type=radio][name=anki-card-primary-type]');

        this._setupFieldMenus();

        this._ankiErrorMessageDetailsToggle.addEventListener('click', this._onAnkiErrorMessageDetailsToggleClick.bind(this), false);
        if (this._ankiEnableCheckbox !== null) { this._ankiEnableCheckbox.addEventListener('settingChanged', this._onAnkiEnableChanged.bind(this), false); }
        for (const input of ankiCardPrimaryTypeRadios) {
            input.addEventListener('change', this._onAnkiCardPrimaryTypeRadioChange.bind(this), false);
        }

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
                    'conjugation',
                    'dictionary',
                    'document-title',
                    'expression',
                    'frequencies',
                    'furigana',
                    'furigana-plain',
                    'glossary',
                    'glossary-brief',
                    'glossary-no-dictionary',
                    'part-of-speech',
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
                    'stroke-count',
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

    getRequiredPermissions(fieldValue) {
        return this._settingsController.permissionsUtil.getRequiredPermissionsForAnkiFieldValue(fieldValue);
    }

    // Private

    async _onOptionsChanged({options: {anki}}) {
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
        if (this._ankiConnect.server === null) { return; }
        this._ankiConnect.enabled = value;

        for (const cardController of this._selectorObserver.datas()) {
            cardController.updateAnkiState();
        }
    }

    _onAnkiCardPrimaryTypeRadioChange(e) {
        const node = e.currentTarget;
        if (!node.checked) { return; }

        this._setAnkiCardPrimaryType(node.dataset.value, node.dataset.ankiCardMenu);
    }

    _setAnkiCardPrimaryType(ankiCardType, ankiCardMenu) {
        if (this._ankiCardPrimary === null) { return; }
        this._ankiCardPrimary.dataset.ankiCardType = ankiCardType;
        if (typeof ankiCardMenu !== 'undefined') {
            this._ankiCardPrimary.dataset.ankiCardMenu = ankiCardMenu;
        } else {
            delete this._ankiCardPrimary.dataset.ankiCardMenu;
        }
    }

    _createCardController(node) {
        const cardController = new AnkiCardController(this._settingsController, this, node);
        cardController.prepare();
        return cardController;
    }

    _removeCardController(node, cardController) {
        cardController.cleanup();
    }

    _isCardControllerStale(node, cardController) {
        return cardController.isStale();
    }

    _setupFieldMenus() {
        const fieldMenuTargets = [
            [['terms'], '#anki-card-terms-field-menu-template'],
            [['kanji'], '#anki-card-kanji-field-menu-template'],
            [['terms', 'kanji'], '#anki-card-all-field-menu-template']
        ];
        for (const [types, selector] of fieldMenuTargets) {
            const element = document.querySelector(selector);
            if (element === null) { continue; }

            let markers = [];
            for (const type of types) {
                markers.push(...this.getFieldMarkers(type));
            }
            markers = [...new Set(markers)];

            const container = element.content.querySelector('.popup-menu-body');
            if (container === null) { return; }

            const fragment = document.createDocumentFragment();
            for (const marker of markers) {
                const option = document.createElement('button');
                option.textContent = marker;
                option.className = 'popup-menu-item';
                option.dataset.menuAction = 'setFieldMarker';
                option.dataset.marker = marker;
                fragment.appendChild(option);
            }
            container.appendChild(fragment);
        }
    }

    async _getAnkiData() {
        this._setAnkiStatusChanging();
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

    _setAnkiStatusChanging() {
        this._ankiErrorMessageNode.textContent = this._ankiErrorMessageNodeDefaultContent;
        this._ankiErrorMessageNode.classList.remove('danger-text');
    }

    _hideAnkiError() {
        if (this._ankiErrorContainer !== null) {
            this._ankiErrorContainer.hidden = true;
        }
        this._ankiErrorMessageDetailsContainer.hidden = true;
        this._ankiErrorMessageDetailsToggle.hidden = true;
        this._ankiErrorInvalidResponseInfo.hidden = true;
        this._ankiErrorMessageNode.textContent = (this._ankiConnect.enabled ? 'Connected' : 'Not enabled');
        this._ankiErrorMessageNode.classList.remove('danger-text');
        this._ankiErrorMessageDetailsNode.textContent = '';
    }

    _showAnkiError(error) {
        let errorString = typeof error === 'object' && error !== null ? error.message : null;
        if (!errorString) { errorString = `${error}`; }
        if (!/[.!?]$/.test(errorString)) { errorString += '.'; }
        this._ankiErrorMessageNode.textContent = errorString;
        this._ankiErrorMessageNode.classList.add('danger-text');

        const data = error.data;
        let details = '';
        if (typeof data !== 'undefined') {
            details += `${JSON.stringify(data, null, 4)}\n\n`;
        }
        details += `${error.stack}`.trimRight();
        this._ankiErrorMessageDetailsNode.textContent = details;

        if (this._ankiErrorContainer !== null) {
            this._ankiErrorContainer.hidden = false;
        }
        this._ankiErrorMessageDetailsContainer.hidden = true;
        this._ankiErrorInvalidResponseInfo.hidden = (errorString.indexOf('Invalid response') < 0);
        this._ankiErrorMessageDetailsToggle.hidden = false;
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
        this._cardMenu = node.dataset.ankiCardMenu;
        this._eventListeners = new EventListenerCollection();
        this._fieldEventListeners = new EventListenerCollection();
        this._fields = null;
        this._modelChangingTo = null;
        this._ankiCardFieldsContainer = null;
        this._cleaned = false;
        this._fieldEntries = [];
        this._deckController = new AnkiCardSelectController();
        this._modelController = new AnkiCardSelectController();
    }

    async prepare() {
        const options = await this._settingsController.getOptions();
        const ankiOptions = options.anki;
        if (this._cleaned) { return; }

        const cardOptions = this._getCardOptions(ankiOptions, this._cardType);
        if (cardOptions === null) { return; }
        const {deck, model, fields} = cardOptions;
        this._deckController.prepare(this._node.querySelector('.anki-card-deck'), deck);
        this._modelController.prepare(this._node.querySelector('.anki-card-model'), model);
        this._fields = fields;

        this._ankiCardFieldsContainer = this._node.querySelector('.anki-card-fields');

        this._setupFields();

        this._eventListeners.addEventListener(this._deckController.select, 'change', this._onCardDeckChange.bind(this), false);
        this._eventListeners.addEventListener(this._modelController.select, 'change', this._onCardModelChange.bind(this), false);
        this._eventListeners.on(this._settingsController, 'permissionsChanged', this._onPermissionsChanged.bind(this));

        await this.updateAnkiState();
    }

    cleanup() {
        this._cleaned = true;
        this._fieldEntries = [];
        this._eventListeners.removeAllEventListeners();
    }

    async updateAnkiState() {
        if (this._fields === null) { return; }
        const {deckNames, modelNames} = await this._ankiController.getAnkiData();
        if (this._cleaned) { return; }
        this._deckController.setOptionValues(deckNames);
        this._modelController.setOptionValues(modelNames);
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

    _onFieldChange(index, e) {
        const node = e.currentTarget;
        this._validateFieldPermissions(node, index, true);
        this._validateField(node, index);
    }

    _onFieldInput(index, e) {
        const node = e.currentTarget;
        this._validateField(node, index);
    }

    _onFieldSettingChanged(index, e) {
        const node = e.currentTarget;
        this._validateFieldPermissions(node, index, false);
    }

    _onFieldMenuClose({currentTarget: button, detail: {action, item}}) {
        switch (action) {
            case 'setFieldMarker':
                this._setFieldMarker(button, item.dataset.marker);
                break;
        }
    }

    _onFieldMarkerLinkClick(e) {
        e.preventDefault();
        const link = e.currentTarget;
        this._setFieldMarker(link, link.textContent);
    }

    _validateField(node, index) {
        let valid = (node.dataset.hasPermissions !== 'false');
        if (valid && index === 0 && !AnkiUtil.stringContainsAnyFieldMarker(node.value)) {
            valid = false;
        }
        node.dataset.invalid = `${!valid}`;
    }

    _setFieldMarker(element, marker) {
        const input = element.closest('.anki-card-field-value-container').querySelector('.anki-card-field-value');
        input.value = `{${marker}}`;
        input.dispatchEvent(new Event('change'));
    }

    _getCardOptions(ankiOptions, cardType) {
        switch (cardType) {
            case 'terms': return ankiOptions.terms;
            case 'kanji': return ankiOptions.kanji;
            default: return null;
        }
    }

    _setupFields() {
        this._fieldEventListeners.removeAllEventListeners();

        const markers = this._ankiController.getFieldMarkers(this._cardType);
        const totalFragment = document.createDocumentFragment();
        this._fieldEntries = [];
        let index = 0;
        for (const [fieldName, fieldValue] of Object.entries(this._fields)) {
            const content = this._settingsController.instantiateTemplateFragment('anki-card-field');

            const fieldNameContainerNode = content.querySelector('.anki-card-field-name-container');
            fieldNameContainerNode.dataset.index = `${index}`;
            const fieldNameNode = content.querySelector('.anki-card-field-name');
            fieldNameNode.textContent = fieldName;

            const valueContainer = content.querySelector('.anki-card-field-value-container');
            valueContainer.dataset.index = `${index}`;

            const inputField = content.querySelector('.anki-card-field-value');
            inputField.value = fieldValue;
            inputField.dataset.setting = ObjectPropertyAccessor.getPathString(['anki', this._cardType, 'fields', fieldName]);
            this._validateFieldPermissions(inputField, index, false);

            this._fieldEventListeners.addEventListener(inputField, 'change', this._onFieldChange.bind(this, index), false);
            this._fieldEventListeners.addEventListener(inputField, 'input', this._onFieldInput.bind(this, index), false);
            this._fieldEventListeners.addEventListener(inputField, 'settingChanged', this._onFieldSettingChanged.bind(this, index), false);
            this._validateField(inputField, index);

            const markerList = content.querySelector('.anki-card-field-marker-list');
            if (markerList !== null) {
                const markersFragment = this._ankiController.getFieldMarkersHtml(markers);
                for (const element of markersFragment.querySelectorAll('.marker-link')) {
                    this._fieldEventListeners.addEventListener(element, 'click', this._onFieldMarkerLinkClick.bind(this), false);
                }
                markerList.appendChild(markersFragment);
            }

            const menuButton = content.querySelector('.anki-card-field-value-menu-button');
            if (menuButton !== null) {
                if (typeof this._cardMenu !== 'undefined') {
                    menuButton.dataset.menu = this._cardMenu;
                } else {
                    delete menuButton.dataset.menu;
                }
                this._fieldEventListeners.addEventListener(menuButton, 'menuClose', this._onFieldMenuClose.bind(this), false);
            }

            totalFragment.appendChild(content);
            this._fieldEntries.push({fieldName, inputField, fieldNameContainerNode});

            ++index;
        }

        const ELEMENT_NODE = Node.ELEMENT_NODE;
        const container = this._ankiCardFieldsContainer;
        for (const node of [...container.childNodes]) {
            if (node.nodeType === ELEMENT_NODE && node.dataset.persistent === 'true') { continue; }
            container.removeChild(node);
        }
        container.appendChild(totalFragment);

        this._validateFields();
    }

    async _validateFields() {
        const token = {};
        this._validateFieldsToken = token;

        let fieldNames;
        try {
            fieldNames = await this._ankiController.getModelFieldNames(this._modelController.value);
        } catch (e) {
            return;
        }

        if (token !== this._validateFieldsToken) { return; }

        const fieldNamesSet = new Set(fieldNames);
        let index = 0;
        for (const {fieldName, fieldNameContainerNode} of this._fieldEntries) {
            fieldNameContainerNode.dataset.invalid = `${!fieldNamesSet.has(fieldName)}`;
            fieldNameContainerNode.dataset.orderMatches = `${index < fieldNames.length && fieldName === fieldNames[index]}`;
            ++index;
        }
    }

    async _setDeck(value) {
        if (this._deckController.value === value) { return; }
        this._deckController.value = value;

        await this._settingsController.modifyProfileSettings([{
            action: 'set',
            path: ObjectPropertyAccessor.getPathString(['anki', this._cardType, 'deck']),
            value
        }]);
    }

    async _setModel(value) {
        const select = this._modelController.select;
        if (this._modelChangingTo !== null) {
            // Revert
            select.value = this._modelChangingTo;
            return;
        }
        if (this._modelController.value === value) { return; }

        let fieldNames;
        let options;
        try {
            this._modelChangingTo = value;
            fieldNames = await this._ankiController.getModelFieldNames(value);
            options = await this._ankiController.settingsController.getOptions();
        } catch (e) {
            // Revert
            select.value = this._modelController.value;
            return;
        } finally {
            this._modelChangingTo = null;
        }

        const cardType = this._cardType;
        const cardOptions = this._getCardOptions(options.anki, cardType);
        const oldFields = cardOptions !== null ? cardOptions.fields : null;

        const fields = {};
        for (let i = 0, ii = fieldNames.length; i < ii; ++i) {
            const fieldName = fieldNames[i];
            fields[fieldName] = this._getDefaultFieldValue(fieldName, i, cardType, oldFields);
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

        this._modelController.value = value;
        this._fields = fields;

        await this._settingsController.modifyProfileSettings(targets);

        this._setupFields();
    }

    async _requestPermissions(permissions) {
        try {
            await this._settingsController.permissionsUtil.setPermissionsGranted({permissions}, true);
        } catch (e) {
            log.error(e);
        }
    }

    async _validateFieldPermissions(node, index, request) {
        const fieldValue = node.value;
        const permissions = this._ankiController.getRequiredPermissions(fieldValue);
        if (permissions.length > 0) {
            node.dataset.requiredPermission = permissions.join(' ');
            const hasPermissions = await (
                request ?
                this._settingsController.permissionsUtil.setPermissionsGranted({permissions}, true) :
                this._settingsController.permissionsUtil.hasPermissions({permissions})
            );
            node.dataset.hasPermissions = `${hasPermissions}`;
        } else {
            delete node.dataset.requiredPermission;
            delete node.dataset.hasPermissions;
        }

        this._validateField(node, index);
    }

    _onPermissionsChanged({permissions: {permissions}}) {
        const permissionsSet = new Set(permissions);
        for (let i = 0, ii = this._fieldEntries.length; i < ii; ++i) {
            const {inputField} = this._fieldEntries[i];
            let {requiredPermission} = inputField.dataset;
            if (typeof requiredPermission !== 'string') { continue; }
            requiredPermission = (requiredPermission.length === 0 ? [] : requiredPermission.split(' '));

            let hasPermissions = true;
            for (const permission of requiredPermission) {
                if (!permissionsSet.has(permission)) {
                    hasPermissions = false;
                    break;
                }
            }

            inputField.dataset.hasPermissions = `${hasPermissions}`;
            this._validateField(inputField, i);
        }
    }

    _getDefaultFieldValue(fieldName, index, cardType, oldFields) {
        if (
            typeof oldFields === 'object' &&
            oldFields !== null &&
            Object.prototype.hasOwnProperty.call(oldFields, fieldName)
        ) {
            return oldFields[fieldName];
        }

        if (index === 0) {
            return (cardType === 'kanji' ? '{character}' : '{expression}');
        }

        const markers = this._ankiController.getFieldMarkers(cardType);
        const markerAliases = new Map([
            ['glossary', ['definition', 'meaning']],
            ['audio', ['sound']],
            ['dictionary', ['dict']]
        ]);

        const hyphenPattern = /-/g;
        for (const marker of markers) {
            const names = [marker];
            const aliases = markerAliases.get(marker);
            if (typeof aliases !== 'undefined') {
                names.push(...aliases);
            }

            let pattern = '^(?:';
            for (let i = 0, ii = names.length; i < ii; ++i) {
                const name = names[i];
                if (i > 0) { pattern += '|'; }
                pattern += name.replace(hyphenPattern, '[-_ ]*');
            }
            pattern += ')$';
            pattern = new RegExp(pattern, 'i');

            if (pattern.test(fieldName)) {
                return `{${marker}}`;
            }
        }

        return '';
    }
}

class AnkiCardSelectController {
    constructor() {
        this._value = null;
        this._select = null;
        this._optionValues = null;
        this._hasExtraOption = false;
        this._selectNeedsUpdate = false;
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this._value = value;
        this._updateSelect();
    }

    get select() {
        return this._select;
    }

    prepare(select, value) {
        this._select = select;
        this._value = value;
        this._updateSelect();
    }

    setOptionValues(optionValues) {
        this._optionValues = optionValues;
        this._selectNeedsUpdate = true;
        this._updateSelect();
    }

    // Private

    _updateSelect() {
        const value = this._value;
        let optionValues = this._optionValues;
        const hasOptionValues = Array.isArray(optionValues) && optionValues.length > 0;

        if (!hasOptionValues) {
            optionValues = [];
        }

        const hasExtraOption = !optionValues.includes(value);
        if (hasExtraOption) {
            optionValues = [...optionValues, value];
        }

        const select = this._select;
        if (this._selectNeedsUpdate || hasExtraOption !== this._hasExtraOption) {
            this._setSelectOptions(select, optionValues);
            select.value = value;
            this._hasExtraOption = hasExtraOption;
            this._selectNeedsUpdate = false;
        }

        if (hasOptionValues) {
            select.dataset.invalid = `${hasExtraOption}`;
        } else {
            delete select.dataset.invalid;
        }
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
}
