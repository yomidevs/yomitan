/*
 * Copyright (C) 2020-2022  Yomichan Authors
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
 * HtmlTemplateCollection
 * OptionsUtil
 * PermissionsUtil
 */

class SettingsController extends EventDispatcher {
    constructor() {
        super();
        this._profileIndex = 0;
        this._source = generateId(16);
        this._pageExitPreventions = new Set();
        this._pageExitPreventionEventListeners = new EventListenerCollection();
        this._templates = new HtmlTemplateCollection(document);
        this._permissionsUtil = new PermissionsUtil();
    }

    get source() {
        return this._source;
    }

    get profileIndex() {
        return this._profileIndex;
    }

    set profileIndex(value) {
        if (this._profileIndex === value) { return; }
        this._setProfileIndex(value, true);
    }

    get permissionsUtil() {
        return this._permissionsUtil;
    }

    async prepare() {
        yomichan.on('optionsUpdated', this._onOptionsUpdated.bind(this));
        if (this._canObservePermissionsChanges()) {
            chrome.permissions.onAdded.addListener(this._onPermissionsChanged.bind(this));
            chrome.permissions.onRemoved.addListener(this._onPermissionsChanged.bind(this));
        }
        const optionsFull = await this.getOptionsFull();
        const {profiles, profileCurrent} = optionsFull;
        if (profileCurrent >= 0 && profileCurrent < profiles.length) {
            this._profileIndex = profileCurrent;
        }
    }

    async refresh() {
        await this._onOptionsUpdatedInternal(true);
    }

    async getOptions() {
        const optionsContext = this.getOptionsContext();
        return await yomichan.api.optionsGet(optionsContext);
    }

    async getOptionsFull() {
        return await yomichan.api.optionsGetFull();
    }

    async setAllSettings(value) {
        const profileIndex = value.profileCurrent;
        await yomichan.api.setAllSettings(value, this._source);
        this._setProfileIndex(profileIndex, true);
    }

    async getSettings(targets) {
        return await this._getSettings(targets, {});
    }

    async getGlobalSettings(targets) {
        return await this._getSettings(targets, {scope: 'global'});
    }

    async getProfileSettings(targets) {
        return await this._getSettings(targets, {scope: 'profile'});
    }

    async modifySettings(targets) {
        return await this._modifySettings(targets, {});
    }

    async modifyGlobalSettings(targets) {
        return await this._modifySettings(targets, {scope: 'global'});
    }

    async modifyProfileSettings(targets) {
        return await this._modifySettings(targets, {scope: 'profile'});
    }

    async setGlobalSetting(path, value) {
        return await this.modifyGlobalSettings([{action: 'set', path, value}]);
    }

    async setProfileSetting(path, value) {
        return await this.modifyProfileSettings([{action: 'set', path, value}]);
    }

    async getDictionaryInfo() {
        return await yomichan.api.getDictionaryInfo();
    }

    getOptionsContext() {
        return {index: this._profileIndex};
    }

    preventPageExit() {
        const obj = {end: null};
        obj.end = this._endPreventPageExit.bind(this, obj);
        if (this._pageExitPreventionEventListeners.size === 0) {
            this._pageExitPreventionEventListeners.addEventListener(window, 'beforeunload', this._onBeforeUnload.bind(this), false);
        }
        this._pageExitPreventions.add(obj);
        return obj;
    }

    instantiateTemplate(name) {
        return this._templates.instantiate(name);
    }

    instantiateTemplateFragment(name) {
        return this._templates.instantiateFragment(name);
    }

    async getDefaultOptions() {
        const optionsUtil = new OptionsUtil();
        await optionsUtil.prepare();
        const optionsFull = optionsUtil.getDefault();
        return optionsFull;
    }

    // Private

    _setProfileIndex(value, canUpdateProfileIndex) {
        this._profileIndex = value;
        this.trigger('optionsContextChanged');
        this._onOptionsUpdatedInternal(canUpdateProfileIndex);
    }

    _onOptionsUpdated({source}) {
        if (source === this._source) { return; }
        this._onOptionsUpdatedInternal(true);
    }

    async _onOptionsUpdatedInternal(canUpdateProfileIndex) {
        const optionsContext = this.getOptionsContext();
        try {
            const options = await this.getOptions();
            this.trigger('optionsChanged', {options, optionsContext});
        } catch (e) {
            if (canUpdateProfileIndex) {
                this._setProfileIndex(0, false);
                return;
            }
            throw e;
        }
    }

    _setupTargets(targets, extraFields) {
        return targets.map((target) => {
            target = Object.assign({}, extraFields, target);
            if (target.scope === 'profile') {
                target.optionsContext = this.getOptionsContext();
            }
            return target;
        });
    }

    async _getSettings(targets, extraFields) {
        targets = this._setupTargets(targets, extraFields);
        return await yomichan.api.getSettings(targets);
    }

    async _modifySettings(targets, extraFields) {
        targets = this._setupTargets(targets, extraFields);
        return await yomichan.api.modifySettings(targets, this._source);
    }

    _onBeforeUnload(e) {
        if (this._pageExitPreventions.size === 0) {
            return;
        }

        e.preventDefault();
        e.returnValue = '';
        return '';
    }

    _endPreventPageExit(obj) {
        this._pageExitPreventions.delete(obj);
        if (this._pageExitPreventions.size === 0) {
            this._pageExitPreventionEventListeners.removeAllEventListeners();
        }
    }

    _onPermissionsChanged() {
        this._triggerPermissionsChanged();
    }

    async _triggerPermissionsChanged() {
        const event = 'permissionsChanged';
        if (!this.hasListeners(event)) { return; }

        const permissions = await this._permissionsUtil.getAllPermissions();
        this.trigger(event, {permissions});
    }

    _canObservePermissionsChanges() {
        return isObject(chrome.permissions) && isObject(chrome.permissions.onAdded) && isObject(chrome.permissions.onRemoved);
    }
}
