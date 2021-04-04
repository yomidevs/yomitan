/*
 * Copyright (C) 2021  Yomichan Authors
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
        this._autoPlayAudioTimer = null;
        this._autoPlayAudioDelay = 400;
        this._eventListeners = new EventListenerCollection();
        this._cache = new Map();
        this._menuContainer = document.querySelector('#popup-menus');
        this._entriesToken = {};
        this._openMenus = new Set();
    }

    get autoPlayAudioDelay() {
        return this._autoPlayAudioDelay;
    }

    set autoPlayAudioDelay(value) {
        this._autoPlayAudioDelay = value;
    }

    prepare() {
        this._audioSystem.prepare();
    }

    updateOptions(options) {
        const data = document.documentElement.dataset;
        data.audioEnabled = `${options.audio.enabled && options.audio.sources.length > 0}`;
    }

    cleanupEntries() {
        this._entriesToken = {};
        this._cache.clear();
        this.clearAutoPlayTimer();
        this._eventListeners.removeAllEventListeners();
    }

    setupEntry(entry, dictionaryEntryIndex) {
        for (const button of entry.querySelectorAll('.action-play-audio')) {
            const headwordIndex = this._getAudioPlayButtonHeadwordIndex(button);
            this._eventListeners.addEventListener(button, 'click', this._onAudioPlayButtonClick.bind(this, dictionaryEntryIndex, headwordIndex), false);
            this._eventListeners.addEventListener(button, 'contextmenu', this._onAudioPlayButtonContextMenu.bind(this, dictionaryEntryIndex, headwordIndex), false);
            this._eventListeners.addEventListener(button, 'menuClose', this._onAudioPlayMenuCloseClick.bind(this, dictionaryEntryIndex, headwordIndex), false);
        }
    }

    setupEntriesComplete() {
        const audioOptions = this._getAudioOptions();
        if (!audioOptions.enabled || !audioOptions.autoPlay) { return; }

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

    async playAudio(dictionaryEntryIndex, headwordIndex, sources=null, sourceDetailsMap=null) {
        this.stopAudio();
        this.clearAutoPlayTimer();

        const headword = this._getHeadword(dictionaryEntryIndex, headwordIndex);
        if (headword === null) {
            return {audio: null, source: null, valid: false};
        }

        const buttons = this._getAudioPlayButtons(dictionaryEntryIndex, headwordIndex);

        const {term, reading} = headword;
        const audioOptions = this._getAudioOptions();
        const {textToSpeechVoice, customSourceUrl, customSourceType, volume} = audioOptions;
        if (!Array.isArray(sources)) {
            ({sources} = audioOptions);
        }
        if (!(sourceDetailsMap instanceof Map)) {
            sourceDetailsMap = null;
        }

        const progressIndicatorVisible = this._display.progressIndicatorVisible;
        const overrideToken = progressIndicatorVisible.setOverride(true);
        try {
            // Create audio
            let audio;
            let title;
            let source = null;
            const info = await this._createTermAudio(sources, sourceDetailsMap, term, reading, {textToSpeechVoice, customSourceUrl, customSourceType});
            const valid = (info !== null);
            if (valid) {
                ({audio, source} = info);
                const sourceIndex = sources.indexOf(source);
                title = `From source ${1 + sourceIndex}: ${source}`;
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
            audio.volume = Number.isFinite(volume) ? Math.max(0.0, Math.min(1.0, volume / 100.0)) : 1.0;

            const playPromise = audio.play();
            this._audioPlaying = audio;

            if (typeof playPromise !== 'undefined') {
                try {
                    await playPromise;
                } catch (e) {
                    // NOP
                }
            }

            return {audio, source, valid};
        } finally {
            progressIndicatorVisible.clearOverride(overrideToken);
        }
    }

    getPrimaryCardAudio(term, reading) {
        const cacheEntry = this._getCacheItem(term, reading, false);
        const primaryCardAudio = typeof cacheEntry !== 'undefined' ? cacheEntry.primaryCardAudio : null;
        return primaryCardAudio;
    }

    // Private

    _onAudioPlayButtonClick(dictionaryEntryIndex, headwordIndex, e) {
        e.preventDefault();

        if (e.shiftKey) {
            this._showAudioMenu(e.currentTarget, dictionaryEntryIndex, headwordIndex);
        } else {
            this.playAudio(dictionaryEntryIndex, headwordIndex);
        }
    }

    _onAudioPlayButtonContextMenu(dictionaryEntryIndex, headwordIndex, e) {
        e.preventDefault();

        this._showAudioMenu(e.currentTarget, dictionaryEntryIndex, headwordIndex);
    }

    _onAudioPlayMenuCloseClick(dictionaryEntryIndex, headwordIndex, e) {
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
        if (group === null) { return null; }

        let {source, index} = group.dataset;
        if (typeof index !== 'undefined') {
            index = Number.parseInt(index, 10);
        }
        const hasIndex = (Number.isFinite(index) && Math.floor(index) === index);
        if (!hasIndex) {
            index = 0;
        }
        return {source, index, hasIndex};
    }

    async _playAudioFromSource(dictionaryEntryIndex, headwordIndex, item) {
        const sourceInfo = this._getMenuItemSourceInfo(item);
        if (sourceInfo === null) { return; }

        const {source, index, hasIndex} = sourceInfo;
        const sourceDetailsMap = hasIndex ? new Map([[source, {start: index, end: index + 1}]]) : null;

        try {
            const token = this._entriesToken;
            const {valid} = await this.playAudio(dictionaryEntryIndex, headwordIndex, [source], sourceDetailsMap);
            if (valid && token === this._entriesToken) {
                this._setPrimaryAudio(dictionaryEntryIndex, headwordIndex, item, null, false);
            }
        } catch (e) {
            // NOP
        }
    }

    _setPrimaryAudio(dictionaryEntryIndex, headwordIndex, item, menu, canToggleOff) {
        const sourceInfo = this._getMenuItemSourceInfo(item);
        if (sourceInfo === null) { return; }

        const {source, index} = sourceInfo;
        if (!this._sourceIsDownloadable(source)) { return; }

        const headword = this._getHeadword(dictionaryEntryIndex, headwordIndex);
        if (headword === null) { return; }

        const {term, reading} = headword;
        const cacheEntry = this._getCacheItem(term, reading, true);

        let {primaryCardAudio} = cacheEntry;
        primaryCardAudio = (!canToggleOff || primaryCardAudio === null || primaryCardAudio.source !== source || primaryCardAudio.index !== index) ? {source, index} : null;
        cacheEntry.primaryCardAudio = primaryCardAudio;

        if (menu !== null) {
            this._updateMenuPrimaryCardAudio(menu.bodyNode, term, reading);
        }
    }

    _getAudioPlayButtonHeadwordIndex(button) {
        const headwordNode = button.closest('.expression');
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
            const button1 = (headwordIndex === 0 ? node.querySelector('.action-play-audio') : null);
            const button2 = node.querySelector(`.expression:nth-of-type(${headwordIndex + 1}) .action-play-audio`);
            if (button1 !== null) { results.push(button1); }
            if (button2 !== null) { results.push(button2); }
        }
        return results;
    }

    async _createTermAudio(sources, sourceDetailsMap, term, reading, details) {
        const {sourceMap} = this._getCacheItem(term, reading, true);

        for (let i = 0, ii = sources.length; i < ii; ++i) {
            const source = sources[i];

            let cacheUpdated = false;
            let infoListPromise;
            let sourceInfo = sourceMap.get(source);
            if (typeof sourceInfo === 'undefined') {
                infoListPromise = this._getTermAudioInfoList(source, term, reading, details);
                sourceInfo = {infoListPromise, infoList: null};
                sourceMap.set(source, sourceInfo);
                cacheUpdated = true;
            }

            let {infoList} = sourceInfo;
            if (infoList === null) {
                infoList = await infoListPromise;
                sourceInfo.infoList = infoList;
            }

            let start = 0;
            let end = infoList.length;

            if (sourceDetailsMap !== null) {
                const sourceDetails = sourceDetailsMap.get(source);
                if (typeof sourceDetails !== 'undefined') {
                    const {start: start2, end: end2} = sourceDetails;
                    if (this._isInteger(start2)) { start = this._clamp(start2, start, end); }
                    if (this._isInteger(end2)) { end = this._clamp(end2, start, end); }
                }
            }

            const {result, cacheUpdated: cacheUpdated2} = await this._createAudioFromInfoList(source, infoList, start, end);
            if (cacheUpdated || cacheUpdated2) { this._updateOpenMenu(); }
            if (result !== null) { return result; }
        }

        return null;
    }

    async _createAudioFromInfoList(source, infoList, start, end) {
        let result = null;
        let cacheUpdated = false;
        for (let i = start; i < end; ++i) {
            const item = infoList[i];

            let {audio, audioResolved} = item;

            if (!audioResolved) {
                let {audioPromise} = item;
                if (audioPromise === null) {
                    audioPromise = this._createAudioFromInfo(item.info, source);
                    item.audioPromise = audioPromise;
                }

                cacheUpdated = true;

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
                result = {audio, source, infoListIndex: i};
                break;
            }
        }
        return {result, cacheUpdated};
    }

    async _createAudioFromInfo(info, source) {
        switch (info.type) {
            case 'url':
                return await this._audioSystem.createAudio(info.url, source);
            case 'tts':
                return this._audioSystem.createTextToSpeechAudio(info.text, info.voice);
            default:
                throw new Error(`Unsupported type: ${info.type}`);
        }
    }

    async _getTermAudioInfoList(source, term, reading, details) {
        const infoList = await yomichan.api.getTermAudioInfoList(source, term, reading, details);
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

    _getAudioOptions() {
        return this._display.getOptions().audio;
    }

    _isInteger(value) {
        return (
            typeof value === 'number' &&
            Number.isFinite(value) &&
            Math.floor(value) === value
        );
    }

    _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
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

    _getAudioSources(audioOptions) {
        const {sources, textToSpeechVoice, customSourceUrl} = audioOptions;
        const ttsSupported = (textToSpeechVoice.length > 0);
        const customSupported = (customSourceUrl.length > 0);

        const sourceIndexMap = new Map();
        const optionsSourcesCount = sources.length;
        for (let i = 0; i < optionsSourcesCount; ++i) {
            sourceIndexMap.set(sources[i], i);
        }

        const rawSources = [
            ['jpod101', 'JapanesePod101', true],
            ['jpod101-alternate', 'JapanesePod101 (Alternate)', true],
            ['jisho', 'Jisho.org', true],
            ['text-to-speech', 'Text-to-speech', ttsSupported],
            ['text-to-speech-reading', 'Text-to-speech (Kana reading)', ttsSupported],
            ['custom', 'Custom', customSupported]
        ];

        const results = [];
        for (const [source, displayName, supported] of rawSources) {
            if (!supported) { continue; }
            const downloadable = this._sourceIsDownloadable(source);
            let optionsIndex = sourceIndexMap.get(source);
            const isInOptions = typeof optionsIndex !== 'undefined';
            if (!isInOptions) {
                optionsIndex = optionsSourcesCount;
            }
            results.push({
                source,
                displayName,
                index: results.length,
                optionsIndex,
                isInOptions,
                downloadable
            });
        }

        // Sort according to source order in options
        results.sort((a, b) => {
            const i = a.optionsIndex - b.optionsIndex;
            return i !== 0 ? i : a.index - b.index;
        });

        return results;
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
        const sources = this._getAudioSources(this._getAudioOptions());
        const {displayGenerator} = this._display;
        let showIcons = false;
        const currentItems = [...menuItemContainer.children];
        for (const {source, displayName, isInOptions, downloadable} of sources) {
            const entries = this._getMenuItemEntries(source, term, reading);
            for (let i = 0, ii = entries.length; i < ii; ++i) {
                const {valid, index, name} = entries[i];
                let node = this._getOrCreateMenuItem(currentItems, source, index);
                if (node === null) {
                    node = displayGenerator.instantiateTemplate('audio-button-popup-menu-item');
                }

                const labelNode = node.querySelector('.popup-menu-item-audio-button .popup-menu-item-label');
                let label = displayName;
                if (ii > 1) { label = `${label} ${i + 1}`; }
                if (typeof name === 'string' && name.length > 0) { label += `: ${name}`; }
                labelNode.textContent = label;

                const cardButton = node.querySelector('.popup-menu-item-set-primary-audio-button');
                cardButton.hidden = !downloadable;

                if (valid !== null) {
                    const icon = node.querySelector('.popup-menu-item-audio-button .popup-menu-item-icon');
                    icon.dataset.icon = valid ? 'checkmark' : 'cross';
                    showIcons = true;
                }
                node.dataset.source = source;
                if (index !== null) {
                    node.dataset.index = `${index}`;
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

    _getOrCreateMenuItem(currentItems, source, index) {
        if (index === null) { index = 0; }
        index = `${index}`;
        for (let i = 0, ii = currentItems.length; i < ii; ++i) {
            const node = currentItems[i];
            if (source !== node.dataset.source) { continue; }

            let index2 = node.dataset.index;
            if (typeof index2 === 'undefined') { index2 = '0'; }
            if (index !== index2) { continue; }

            currentItems.splice(i, 1);
            return node;
        }
        return null;
    }

    _getMenuItemEntries(source, term, reading) {
        const cacheEntry = this._getCacheItem(term, reading, false);
        if (typeof cacheEntry !== 'undefined') {
            const {sourceMap} = cacheEntry;
            const sourceInfo = sourceMap.get(source);
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

    _updateMenuPrimaryCardAudio(menuBodyNode, term, reading) {
        const primaryCardAudio = this.getPrimaryCardAudio(term, reading);
        const {source: primaryCardAudioSource, index: primaryCardAudioIndex} = (primaryCardAudio !== null ? primaryCardAudio : {source: null, index: -1});

        const itemGroups = menuBodyNode.querySelectorAll('.popup-menu-item-group');
        let sourceIndex = 0;
        let sourcePre = null;
        for (const node of itemGroups) {
            const {source} = node.dataset;
            if (source !== sourcePre) {
                sourcePre = source;
                sourceIndex = 0;
            } else {
                ++sourceIndex;
            }

            const isPrimaryCardAudio = (source === primaryCardAudioSource && sourceIndex === primaryCardAudioIndex);
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
}
