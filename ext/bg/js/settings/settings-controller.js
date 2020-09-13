/*
 * Copyright (C) 2020  Yomichan Authors
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
 * utilBackend
 * utilBackgroundIsolate
 */

class SettingsController extends EventDispatcher {
    constructor(profileIndex=0) {
        super();
        this._profileIndex = profileIndex;
        this._source = generateId(16);
        this._pageExitPreventions = new Set();
        this._pageExitPreventionEventListeners = new EventListenerCollection();
    }

    get source() {
        return this._source;
    }

    get profileIndex() {
        return this._profileIndex;
    }

    set profileIndex(value) {
        if (this._profileIndex === value) { return; }
        this._setProfileIndex(value);
    }

    prepare() {
        yomichan.on('optionsUpdated', this._onOptionsUpdated.bind(this));
    }

    async refresh() {
        await this._onOptionsUpdatedInternal();
    }

    async save() {
        await api.optionsSave(this._source);
    }

    async getOptions() {
        const optionsContext = this.getOptionsContext();
        return await api.optionsGet(optionsContext);
    }

    async getOptionsFull() {
        return await api.optionsGetFull();
    }

    async getOptionsMutable() {
        const optionsContext = this.getOptionsContext();
        return utilBackend().getOptions(utilBackgroundIsolate(optionsContext));
    }

    async getOptionsFullMutable() {
        return utilBackend().getFullOptions();
    }

    async setAllSettings(value) {
        const profileIndex = value.profileCurrent;
        await api.setAllSettings(value, this._source);
        this._setProfileIndex(profileIndex);
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

    triggerDatabaseUpdated(cause) {
        this.trigger('databaseUpdated', {cause});
    }

    // Private

    _setProfileIndex(value) {
        this._profileIndex = value;
        this.trigger('optionsContextChanged');
        this._onOptionsUpdatedInternal();
    }

    _onOptionsUpdated({source}) {
        if (source === this._source) { return; }
        this._onOptionsUpdatedInternal();
    }

    async _onOptionsUpdatedInternal() {
        const optionsContext = this.getOptionsContext();
        const options = await this.getOptions();
        this.trigger('optionsChanged', {options, optionsContext});
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
        return await api.getSettings(targets);
    }

    async _modifySettings(targets, extraFields) {
        targets = this._setupTargets(targets, extraFields);
        return await api.modifySettings(targets, this._source);
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
}
