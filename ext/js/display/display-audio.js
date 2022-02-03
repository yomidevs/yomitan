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

/* global
 * AudioSystem
 * PopupMenu
 */

class DisplayAudio {
    constructor(display) {
        this._display = display;
        this._audioPlaying = null;
        this._audioSystem = new AudioSystem();
        this._playbackVolume = 1.0;
        this._autoPlay = false;
        this._autoPlayAudioTimer = null;
        this._autoPlayAudioDelay = 400;
        this._eventListeners = new EventListenerCollection();
        this._cache = new Map();
        this._menuContainer = document.querySelector('#popup-menus');
        this._entriesToken = {};
        this._openMenus = new Set();
        this._audioSources = [];
        this._audioSourceTypeNames = new Map([
            ['jpod101', 'JapanesePod101'],
            ['jpod101-alternate', 'JapanesePod101 (Alternate)'],
            ['jisho', 'Jisho.org'],
            ['text-to-speech', 'Text-to-speech'],
            ['text-to-speech-reading', 'Text-to-speech (Kana reading)'],
            ['custom', 'Custom URL'],
            ['custom-json', 'Custom URL (JSON)']
        ]);
        this._onAudioPlayButtonClickBind = this._onAudioPlayButtonClick.bind(this);
        this._onAudioPlayButtonContextMenuBind = this._onAudioPlayButtonContextMenu.bind(this);
        this._onAudioPlayMenuCloseClickBind = this._onAudioPlayMenuCloseClick.bind(this);
    }

    get autoPlayAudioDelay() {
        return this._autoPlayAudioDelay;
    }

    set autoPlayAudioDelay(value) {
        this._autoPlayAudioDelay = value;
    }

    prepare() {
        this._audioSystem.prepare();
        this._display.hotkeyHandler.registerActions([
            ['playAudio',           this._onHotkeyActionPlayAudio.bind(this)],
            ['playAudioFromSource', this._onHotkeyActionPlayAudioFromSource.bind(this)]
        ]);
        this._display.registerDirectMessageHandlers([
            ['Display.clearAutoPlayTimer', {async: false, handler: this._onMessageClearAutoPlayTimer.bind(this)}]
        ]);
        this._display.on('optionsUpdated', this._onOptionsUpdated.bind(this));
        this._display.on('contentClear', this._onContentClear.bind(this));
        this._display.on('contentUpdateEntry', this._onContentUpdateEntry.bind(this));
        this._display.on('contentUpdateComplete', this._onContentUpdateComplete.bind(this));
        this._display.on('frameVisibilityChange', this._onFrameVisibilityChange.bind(this));
        this._onOptionsUpdated({options: this._display.getOptions()});
    }

    clearAutoPlayTimer() {
        if (this._autoPlayAudioTimer === null) { return; }
        clearTimeout(this._autoPlayAudioTimer);
        this._autoPlayAudioTimer = null;
    }

    stopAudio() {
        if (this._audioPlaying === null) { return; }
        this._audioPlaying.pause();
        this._audioPlaying = null;
    }

    async playAudio(dictionaryEntryIndex, headwordIndex, sourceType=null) {
        let sources = this._audioSources;
        if (sourceType !== null) {
            sources = [];
            for (const source of this._audioSources) {
                if (source.type === sourceType) {
                    sources.push(source);
                }
            }
        }
        await this._playAudio(dictionaryEntryIndex, headwordIndex, sources, null);
    }

    getAnkiNoteMediaAudioDetails(term, reading) {
        const sources = [];
        let preferredAudioIndex = null;
        const primaryCardAudio = this._getPrimaryCardAudio(term, reading);
        if (primaryCardAudio !== null) {
            const {index, subIndex} = primaryCardAudio;
            const source = this._audioSources[index];
            sources.push(this._getSourceData(source));
            preferredAudioIndex = subIndex;
        } else {
            for (const source of this._audioSources) {
                if (!source.isInOptions) { continue; }
                sources.push(this._getSourceData(source));
            }
        }
        return {sources, preferredAudioIndex};
    }

    // Private

    _onOptionsUpdated({options}) {
        if (options === null) { return; }
        const {enabled, autoPlay, volume, sources} = options.audio;
        this._autoPlay = enabled && autoPlay;
        this._playbackVolume = Number.isFinite(volume) ? Math.max(0.0, Math.min(1.0, volume / 100.0)) : 1.0;

        const requiredAudioSources = new Set([
            'jpod101',
            'jpod101-alternate',
            'jisho'
        ]);
        const nameMap = new Map();
        this._audioSources.length = 0;
        for (const {type, url, voice} of sources) {
            this._addAudioSourceInfo(type, url, voice, true, nameMap);
            requiredAudioSources.delete(type);
        }
        for (const type of requiredAudioSources) {
            this._addAudioSourceInfo(type, '', '', false, nameMap);
        }

        const data = document.documentElement.dataset;
        data.audioEnabled = `${enabled && sources.length > 0}`;

        this._cache.clear();
    }

    _onContentClear() {
        this._entriesToken = {};
        this._cache.clear();
        this.clearAutoPlayTimer();
        this._eventListeners.removeAllEventListeners();
    }

    _onContentUpdateEntry({element}) {
        const eventListeners = this._eventListeners;
        for (const button of element.querySelectorAll('.action-button[data-action=play-audio]')) {
            eventListeners.addEventListener(button, 'click', this._onAudioPlayButtonClickBind, false);
            eventListeners.addEventListener(button, 'contextmenu', this._onAudioPlayButtonContextMenuBind, false);
            eventListeners.addEventListener(button, 'menuClose', this._onAudioPlayMenuCloseClickBind, false);
        }
    }

    _onContentUpdateComplete() {
        if (!this._autoPlay || !this._display.frameVisible) { return; }

        this.clearAutoPlayTimer();

        const {dictionaryEntries} = this._display;
        if (dictionaryEntries.length === 0) { return; }

        const firstDictionaryEntries = dictionaryEntries[0];
        if (firstDictionaryEntries.type === 'kanji') { return; }

        const callback = () => {
            this._autoPlayAudioTimer = null;
            this.playAudio(0, 0);
        };

        if (this._autoPlayAudioDelay > 0) {
            this._autoPlayAudioTimer = setTimeout(callback, this._autoPlayAudioDelay);
        } else {
            callback();
        }
    }

    _onFrameVisibilityChange({value}) {
        if (!value) {
            // The auto-play timer is stopped, but any audio that has already started playing
            // is not stopped, as this is a valid use case for some users.
            this.clearAutoPlayTimer();
        }
    }

    _onHotkeyActionPlayAudio() {
        this.playAudio(this._display.selectedIndex, 0);
    }

    _onHotkeyActionPlayAudioFromSource(source) {
        this.playAudio(this._display.selectedIndex, 0, source);
    }

    _onMessageClearAutoPlayTimer() {
        this.clearAutoPlayTimer();
    }

    _addAudioSourceInfo(type, url, voice, isInOptions, nameMap) {
        const index = this._audioSources.length;
        const downloadable = this._sourceIsDownloadable(type);
        let name = this._audioSourceTypeNames.get(type);
        if (typeof name === 'undefined') { name = 'Unknown'; }

        let entries = nameMap.get(name);
        if (typeof entries === 'undefined') {
            entries = [];
            nameMap.set(name, entries);
        }
        const nameIndex = entries.length;
        if (nameIndex === 1) {
            entries[0].nameUnique = false;
        }

        const source = {
            index,
            type,
            url,
            voice,
            isInOptions,
            downloadable,
            name,
            nameIndex,
            nameUnique: (nameIndex === 0)
        };

        entries.push(source);
        this._audioSources.push(source);
    }

    _onAudioPlayButtonClick(e) {
        e.preventDefault();

        const button = e.currentTarget;
        const headwordIndex = this._getAudioPlayButtonHeadwordIndex(button);
        const dictionaryEntryIndex = this._display.getElementDictionaryEntryIndex(button);

        if (e.shiftKey) {
            this._showAudioMenu(e.currentTarget, dictionaryEntryIndex, headwordIndex);
        } else {
            this.playAudio(dictionaryEntryIndex, headwordIndex);
        }
    }

    _onAudioPlayButtonContextMenu(e) {
        e.preventDefault();

        const button = e.currentTarget;
        const headwordIndex = this._getAudioPlayButtonHeadwordIndex(button);
        const dictionaryEntryIndex = this._display.getElementDictionaryEntryIndex(button);

        this._showAudioMenu(e.currentTarget, dictionaryEntryIndex, headwordIndex);
    }

    _onAudioPlayMenuCloseClick(e) {
        const button = e.currentTarget;
        const headwordIndex = this._getAudioPlayButtonHeadwordIndex(button);
        const dictionaryEntryIndex = this._display.getElementDictionaryEntryIndex(button);

        const {detail: {action, item, menu, shiftKey}} = e;
        switch (action) {
            case 'playAudioFromSource':
                if (shiftKey) {
                    e.preventDefault();
                }
                this._playAudioFromSource(dictionaryEntryIndex, headwordIndex, item);
                break;
            case 'setPrimaryAudio':
                e.preventDefault();
                this._setPrimaryAudio(dictionaryEntryIndex, headwordIndex, item, menu, true);
                break;
        }
    }

    _getCacheItem(term, reading, create) {
        const key = this._getTermReadingKey(term, reading);
        let cacheEntry = this._cache.get(key);
        if (typeof cacheEntry === 'undefined' && create) {
            cacheEntry = {
                sourceMap: new Map(),
                primaryCardAudio: null
            };
            this._cache.set(key, cacheEntry);
        }
        return cacheEntry;
    }

    _getMenuItemSourceInfo(item) {
        const group = item.closest('.popup-menu-item-group');
        if (group !== null) {
            let {index, subIndex} = group.dataset;
            index = Number.parseInt(index, 10);
            if (index >= 0 && index < this._audioSources.length) {
                const source = this._audioSources[index];
                if (typeof subIndex === 'string') {
                    subIndex = Number.parseInt(subIndex, 10);
                } else {
                    subIndex = null;
                }
                return {source, subIndex};
            }
        }
        return {source: null, subIndex: null};
    }

    async _playAudio(dictionaryEntryIndex, headwordIndex, sources, audioInfoListIndex) {
        this.stopAudio();
        this.clearAutoPlayTimer();

        const headword = this._getHeadword(dictionaryEntryIndex, headwordIndex);
        if (headword === null) {
            return {audio: null, source: null, valid: false};
        }

        const buttons = this._getAudioPlayButtons(dictionaryEntryIndex, headwordIndex);

        const {term, reading} = headword;

        const progressIndicatorVisible = this._display.progressIndicatorVisible;
        const overrideToken = progressIndicatorVisible.setOverride(true);
        try {
            // Create audio
            let audio;
            let title;
            let source = null;
            let subIndex = 0;
            const info = await this._createTermAudio(term, reading, sources, audioInfoListIndex);
            const valid = (info !== null);
            if (valid) {
                ({audio, source, subIndex} = info);
                const sourceIndex = sources.indexOf(source);
                title = `From source ${1 + sourceIndex}: ${source.name}`;
            } else {
                audio = this._audioSystem.getFallbackAudio();
                title = 'Could not find audio';
            }

            // Stop any currently playing audio
            this.stopAudio();

            // Update details
            const potentialAvailableAudioCount = this._getPotentialAvailableAudioCount(term, reading);
            for (const button of buttons) {
                const titleDefault = button.dataset.titleDefault || '';
                button.title = `${titleDefault}\n${title}`;
                this._updateAudioPlayButtonBadge(button, potentialAvailableAudioCount);
            }

            // Play
            audio.currentTime = 0;
            audio.volume = this._playbackVolume;

            const playPromise = audio.play();
            this._audioPlaying = audio;

            if (typeof playPromise !== 'undefined') {
                try {
                    await playPromise;
                } catch (e) {
                    // NOP
                }
            }

            return {audio, source, subIndex, valid};
        } finally {
            progressIndicatorVisible.clearOverride(overrideToken);
        }
    }

    async _playAudioFromSource(dictionaryEntryIndex, headwordIndex, item) {
        const {source, subIndex} = this._getMenuItemSourceInfo(item);
        if (source === null) { return; }

        try {
            const token = this._entriesToken;
            const {valid} = await this._playAudio(dictionaryEntryIndex, headwordIndex, [source], subIndex);
            if (valid && token === this._entriesToken) {
                this._setPrimaryAudio(dictionaryEntryIndex, headwordIndex, item, null, false);
            }
        } catch (e) {
            // NOP
        }
    }

    _setPrimaryAudio(dictionaryEntryIndex, headwordIndex, item, menu, canToggleOff) {
        const {source, subIndex} = this._getMenuItemSourceInfo(item);
        if (source === null || !source.downloadable) { return; }

        const headword = this._getHeadword(dictionaryEntryIndex, headwordIndex);
        if (headword === null) { return; }

        const {index} = source;
        const {term, reading} = headword;
        const cacheEntry = this._getCacheItem(term, reading, true);

        let {primaryCardAudio} = cacheEntry;
        primaryCardAudio = (
            !canToggleOff ||
            primaryCardAudio === null ||
            primaryCardAudio.index !== index ||
            primaryCardAudio.subIndex !== subIndex
        ) ? {index: index, subIndex} : null;
        cacheEntry.primaryCardAudio = primaryCardAudio;

        if (menu !== null) {
            this._updateMenuPrimaryCardAudio(menu.bodyNode, term, reading);
        }
    }

    _getAudioPlayButtonHeadwordIndex(button) {
        const headwordNode = button.closest('.headword');
        if (headwordNode !== null) {
            const headwordIndex = parseInt(headwordNode.dataset.index, 10);
            if (Number.isFinite(headwordIndex)) { return headwordIndex; }
        }
        return 0;
    }

    _getAudioPlayButtons(dictionaryEntryIndex, headwordIndex) {
        const results = [];
        const {dictionaryEntryNodes} = this._display;
        if (dictionaryEntryIndex >= 0 && dictionaryEntryIndex < dictionaryEntryNodes.length) {
            const node = dictionaryEntryNodes[dictionaryEntryIndex];
            const button1 = (headwordIndex === 0 ? node.querySelector('.action-button[data-action=play-audio]') : null);
            const button2 = node.querySelector(`.headword:nth-of-type(${headwordIndex + 1}) .action-button[data-action=play-audio]`);
            if (button1 !== null) { results.push(button1); }
            if (button2 !== null) { results.push(button2); }
        }
        return results;
    }

    async _createTermAudio(term, reading, sources, audioInfoListIndex) {
        const {sourceMap} = this._getCacheItem(term, reading, true);

        for (const source of sources) {
            const {index} = source;

            let cacheUpdated = false;
            let infoListPromise;
            let sourceInfo = sourceMap.get(index);
            if (typeof sourceInfo === 'undefined') {
                infoListPromise = this._getTermAudioInfoList(source, term, reading);
                sourceInfo = {infoListPromise, infoList: null};
                sourceMap.set(index, sourceInfo);
                cacheUpdated = true;
            }

            let {infoList} = sourceInfo;
            if (infoList === null) {
                infoList = await infoListPromise;
                sourceInfo.infoList = infoList;
            }

            const {audio, index: subIndex, cacheUpdated: cacheUpdated2} = await this._createAudioFromInfoList(source, infoList, audioInfoListIndex);
            if (cacheUpdated || cacheUpdated2) { this._updateOpenMenu(); }
            if (audio !== null) {
                return {audio, source, subIndex};
            }
        }

        return null;
    }

    async _createAudioFromInfoList(source, infoList, audioInfoListIndex) {
        let start = 0;
        let end = infoList.length;
        if (audioInfoListIndex !== null) {
            start = Math.max(0, Math.min(end, audioInfoListIndex));
            end = Math.max(0, Math.min(end, audioInfoListIndex + 1));
        }

        const result = {
            audio: null,
            index: -1,
            cacheUpdated: false
        };
        for (let i = start; i < end; ++i) {
            const item = infoList[i];

            let {audio, audioResolved} = item;

            if (!audioResolved) {
                let {audioPromise} = item;
                if (audioPromise === null) {
                    audioPromise = this._createAudioFromInfo(item.info, source);
                    item.audioPromise = audioPromise;
                }

                result.cacheUpdated = true;

                try {
                    audio = await audioPromise;
                } catch (e) {
                    continue;
                } finally {
                    item.audioResolved = true;
                }

                item.audio = audio;
            }

            if (audio !== null) {
                result.audio = audio;
                result.index = i;
                break;
            }
        }
        return result;
    }

    async _createAudioFromInfo(info, source) {
        switch (info.type) {
            case 'url':
                return await this._audioSystem.createAudio(info.url, source.type);
            case 'tts':
                return this._audioSystem.createTextToSpeechAudio(info.text, info.voice);
            default:
                throw new Error(`Unsupported type: ${info.type}`);
        }
    }

    async _getTermAudioInfoList(source, term, reading) {
        const sourceData = this._getSourceData(source);
        const infoList = await yomichan.api.getTermAudioInfoList(sourceData, term, reading);
        return infoList.map((info) => ({info, audioPromise: null, audioResolved: false, audio: null}));
    }

    _getHeadword(dictionaryEntryIndex, headwordIndex) {
        const {dictionaryEntries} = this._display;
        if (dictionaryEntryIndex < 0 || dictionaryEntryIndex >= dictionaryEntries.length) { return null; }

        const dictionaryEntry = dictionaryEntries[dictionaryEntryIndex];
        if (dictionaryEntry.type === 'kanji') { return null; }

        const {headwords} = dictionaryEntry;
        if (headwordIndex < 0 || headwordIndex >= headwords.length) { return null; }

        return headwords[headwordIndex];
    }

    _getTermReadingKey(term, reading) {
        return JSON.stringify([term, reading]);
    }

    _updateAudioPlayButtonBadge(button, potentialAvailableAudioCount) {
        if (potentialAvailableAudioCount === null) {
            delete button.dataset.potentialAvailableAudioCount;
        } else {
            button.dataset.potentialAvailableAudioCount = `${potentialAvailableAudioCount}`;
        }

        const badge = button.querySelector('.action-button-badge');
        if (badge === null) { return; }

        const badgeData = badge.dataset;
        switch (potentialAvailableAudioCount) {
            case 0:
                badgeData.icon = 'cross';
                badgeData.hidden = false;
                break;
            case 1:
            case null:
                delete badgeData.icon;
                badgeData.hidden = true;
                break;
            default:
                badgeData.icon = 'plus-thick';
                badgeData.hidden = false;
                break;
        }
    }

    _getPotentialAvailableAudioCount(term, reading) {
        const cacheEntry = this._getCacheItem(term, reading, false);
        if (typeof cacheEntry === 'undefined') { return null; }

        const {sourceMap} = cacheEntry;
        let count = 0;
        for (const {infoList} of sourceMap.values()) {
            if (infoList === null) { continue; }
            for (const {audio, audioResolved} of infoList) {
                if (!audioResolved || audio !== null) {
                    ++count;
                }
            }
        }
        return count;
    }

    _showAudioMenu(button, dictionaryEntryIndex, headwordIndex) {
        const headword = this._getHeadword(dictionaryEntryIndex, headwordIndex);
        if (headword === null) { return; }

        const {term, reading} = headword;
        const popupMenu = this._createMenu(button, term, reading);
        this._openMenus.add(popupMenu);
        popupMenu.prepare();
        popupMenu.on('close', this._onPopupMenuClose.bind(this));
    }

    _onPopupMenuClose({menu}) {
        this._openMenus.delete(menu);
    }

    _sourceIsDownloadable(source) {
        switch (source) {
            case 'text-to-speech':
            case 'text-to-speech-reading':
                return false;
            default:
                return true;
        }
    }

    _createMenu(sourceButton, term, reading) {
        // Create menu
        const menuContainerNode = this._display.displayGenerator.instantiateTemplate('audio-button-popup-menu');
        const menuBodyNode = menuContainerNode.querySelector('.popup-menu-body');
        menuContainerNode.dataset.term = term;
        menuContainerNode.dataset.reading = reading;

        // Set up items based on options and cache data
        this._createMenuItems(menuContainerNode, menuBodyNode, term, reading);

        // Update primary card audio display
        this._updateMenuPrimaryCardAudio(menuBodyNode, term, reading);

        // Create popup menu
        this._menuContainer.appendChild(menuContainerNode);
        return new PopupMenu(sourceButton, menuContainerNode);
    }

    _createMenuItems(menuContainerNode, menuItemContainer, term, reading) {
        const {displayGenerator} = this._display;
        let showIcons = false;
        const currentItems = [...menuItemContainer.children];
        for (const source of this._audioSources) {
            const {index, name, nameIndex, nameUnique, isInOptions, downloadable} = source;
            const entries = this._getMenuItemEntries(source, term, reading);
            for (let i = 0, ii = entries.length; i < ii; ++i) {
                const {valid, index: subIndex, name: subName} = entries[i];
                let node = this._getOrCreateMenuItem(currentItems, index, subIndex);
                if (node === null) {
                    node = displayGenerator.instantiateTemplate('audio-button-popup-menu-item');
                }

                const labelNode = node.querySelector('.popup-menu-item-audio-button .popup-menu-item-label');
                let label = name;
                if (!nameUnique) {
                    label = `${label} ${nameIndex + 1}`;
                    if (ii > 1) { label = `${label} -`; }
                }
                if (ii > 1) { label = `${label} ${i + 1}`; }
                if (typeof subName === 'string' && subName.length > 0) { label += `: ${subName}`; }
                labelNode.textContent = label;

                const cardButton = node.querySelector('.popup-menu-item-set-primary-audio-button');
                cardButton.hidden = !downloadable;

                if (valid !== null) {
                    const icon = node.querySelector('.popup-menu-item-audio-button .popup-menu-item-icon');
                    icon.dataset.icon = valid ? 'checkmark' : 'cross';
                    showIcons = true;
                }
                node.dataset.index = `${index}`;
                if (subIndex !== null) {
                    node.dataset.subIndex = `${subIndex}`;
                }
                node.dataset.valid = `${valid}`;
                node.dataset.sourceInOptions = `${isInOptions}`;
                node.dataset.downloadable = `${downloadable}`;

                menuItemContainer.appendChild(node);
            }
        }
        for (const node of currentItems) {
            const {parentNode} = node;
            if (parentNode === null) { continue; }
            parentNode.removeChild(node);
        }
        menuContainerNode.dataset.showIcons = `${showIcons}`;
    }

    _getOrCreateMenuItem(currentItems, index, subIndex) {
        index = `${index}`;
        subIndex = `${subIndex !== null ? subIndex : 0}`;
        for (let i = 0, ii = currentItems.length; i < ii; ++i) {
            const node = currentItems[i];
            if (index !== node.dataset.index) { continue; }

            let subIndex2 = node.dataset.subIndex;
            if (typeof subIndex2 === 'undefined') { subIndex2 = '0'; }
            if (subIndex !== subIndex2) { continue; }

            currentItems.splice(i, 1);
            return node;
        }
        return null;
    }

    _getMenuItemEntries(source, term, reading) {
        const cacheEntry = this._getCacheItem(term, reading, false);
        if (typeof cacheEntry !== 'undefined') {
            const {sourceMap} = cacheEntry;
            const sourceInfo = sourceMap.get(source.index);
            if (typeof sourceInfo !== 'undefined') {
                const {infoList} = sourceInfo;
                if (infoList !== null) {
                    const ii = infoList.length;
                    if (ii === 0) {
                        return [{valid: false, index: null, name: null}];
                    }

                    const results = [];
                    for (let i = 0; i < ii; ++i) {
                        const {audio, audioResolved, info: {name}} = infoList[i];
                        const valid = audioResolved ? (audio !== null) : null;
                        const entry = {valid, index: i, name};
                        results.push(entry);
                    }
                    return results;
                }
            }
        }
        return [{valid: null, index: null, name: null}];
    }

    _getPrimaryCardAudio(term, reading) {
        const cacheEntry = this._getCacheItem(term, reading, false);
        return typeof cacheEntry !== 'undefined' ? cacheEntry.primaryCardAudio : null;
    }

    _updateMenuPrimaryCardAudio(menuBodyNode, term, reading) {
        const primaryCardAudio = this._getPrimaryCardAudio(term, reading);
        const primaryCardAudioIndex = (primaryCardAudio !== null ? primaryCardAudio.index : null);
        const primaryCardAudioSubIndex = (primaryCardAudio !== null ? primaryCardAudio.subIndex : null);
        const itemGroups = menuBodyNode.querySelectorAll('.popup-menu-item-group');
        for (const node of itemGroups) {
            let {index, subIndex} = node.dataset;
            index = Number.parseInt(index, 10);
            subIndex = typeof subIndex === 'string' ? Number.parseInt(subIndex, 10) : null;
            const isPrimaryCardAudio = (index === primaryCardAudioIndex && subIndex === primaryCardAudioSubIndex);
            node.dataset.isPrimaryCardAudio = `${isPrimaryCardAudio}`;
        }
    }

    _updateOpenMenu() {
        for (const menu of this._openMenus) {
            const menuContainerNode = menu.containerNode;
            const {term, reading} = menuContainerNode.dataset;
            this._createMenuItems(menuContainerNode, menu.bodyNode, term, reading);
            menu.updatePosition();
        }
    }

    _getSourceData(source) {
        const {type, url, voice} = source;
        return {type, url, voice};
    }
}
