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
 * api
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
        this._cache.clear();
        this.clearAutoPlayTimer();
        this._eventListeners.removeAllEventListeners();
    }

    setupEntry(entry, definitionIndex) {
        for (const button of entry.querySelectorAll('.action-play-audio')) {
            const expressionIndex = this._getAudioPlayButtonExpressionIndex(button);
            this._eventListeners.addEventListener(button, 'click', this._onAudioPlayButtonClick.bind(this, definitionIndex, expressionIndex), false);
            this._eventListeners.addEventListener(button, 'contextmenu', this._onAudioPlayButtonContextMenu.bind(this, definitionIndex, expressionIndex), false);
            this._eventListeners.addEventListener(button, 'menuClose', this._onAudioPlayMenuCloseClick.bind(this, definitionIndex, expressionIndex), false);
        }
    }

    setupEntriesComplete() {
        const audioOptions = this._getAudioOptions();
        if (!audioOptions.enabled || !audioOptions.autoPlay) { return; }

        this.clearAutoPlayTimer();

        const definitions = this._display.definitions;
        if (definitions.length === 0) { return; }

        const firstDefinition = definitions[0];
        if (firstDefinition.type === 'kanji') { return; }

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

    async playAudio(definitionIndex, expressionIndex, sources=null, sourceDetailsMap=null) {
        this.stopAudio();
        this.clearAutoPlayTimer();

        const expressionReading = this._getExpressionAndReading(definitionIndex, expressionIndex);
        if (expressionReading === null) { return; }

        const buttons = this._getAudioPlayButtons(definitionIndex, expressionIndex);

        const {expression, reading} = expressionReading;
        const audioOptions = this._getAudioOptions();
        const {textToSpeechVoice, customSourceUrl, volume} = audioOptions;
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
            const info = await this._createExpressionAudio(sources, sourceDetailsMap, expression, reading, {textToSpeechVoice, customSourceUrl});
            if (info !== null) {
                let source;
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
            const potentialAvailableAudioCount = this._getPotentialAvailableAudioCount(expression, reading);
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
        } finally {
            progressIndicatorVisible.clearOverride(overrideToken);
        }
    }

    // Private

    _onAudioPlayButtonClick(definitionIndex, expressionIndex, e) {
        e.preventDefault();

        if (e.shiftKey) {
            this._showAudioMenu(e.currentTarget, definitionIndex, expressionIndex);
        } else {
            this.playAudio(definitionIndex, expressionIndex);
        }
    }

    _onAudioPlayButtonContextMenu(definitionIndex, expressionIndex, e) {
        e.preventDefault();

        this._showAudioMenu(e.currentTarget, definitionIndex, expressionIndex);
    }

    _onAudioPlayMenuCloseClick(definitionIndex, expressionIndex, e) {
        const {detail: {action, item}} = e;
        switch (action) {
            case 'playAudioFromSource':
                {
                    const {source, index} = item.dataset;
                    let sourceDetailsMap = null;
                    if (typeof index !== 'undefined') {
                        const index2 = Number.parseInt(index, 10);
                        sourceDetailsMap = new Map([
                            [source, {start: index2, end: index2 + 1}]
                        ]);
                    }
                    this.playAudio(definitionIndex, expressionIndex, [source], sourceDetailsMap);
                }
                break;
        }
    }

    _getAudioPlayButtonExpressionIndex(button) {
        const expressionNode = button.closest('.term-expression');
        if (expressionNode !== null) {
            const expressionIndex = parseInt(expressionNode.dataset.index, 10);
            if (Number.isFinite(expressionIndex)) { return expressionIndex; }
        }
        return 0;
    }

    _getAudioPlayButtons(definitionIndex, expressionIndex) {
        const results = [];
        const {definitionNodes} = this._display;
        if (definitionIndex >= 0 && definitionIndex < definitionNodes.length) {
            const node = definitionNodes[definitionIndex];
            const button1 = (expressionIndex === 0 ? node.querySelector('.action-play-audio') : null);
            const button2 = node.querySelector(`.term-expression:nth-of-type(${expressionIndex + 1}) .action-play-audio`);
            if (button1 !== null) { results.push(button1); }
            if (button2 !== null) { results.push(button2); }
        }
        return results;
    }

    async _createExpressionAudio(sources, sourceDetailsMap, expression, reading, details) {
        const key = this._getExpressionReadingKey(expression, reading);

        let sourceMap = this._cache.get(key);
        if (typeof sourceMap === 'undefined') {
            sourceMap = new Map();
            this._cache.set(key, sourceMap);
        }

        for (let i = 0, ii = sources.length; i < ii; ++i) {
            const source = sources[i];

            let infoListPromise;
            let sourceInfo = sourceMap.get(source);
            if (typeof sourceInfo === 'undefined') {
                infoListPromise = this._getExpressionAudioInfoList(source, expression, reading, details);
                sourceInfo = {infoListPromise, infoList: null};
                sourceMap.set(source, sourceInfo);
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

            const audio = await this._createAudioFromInfoList(source, infoList, start, end);
            if (audio !== null) { return audio; }
        }

        return null;
    }

    async _createAudioFromInfoList(source, infoList, start, end) {
        for (let i = start; i < end; ++i) {
            const item = infoList[i];

            let {audio, audioResolved} = item;

            if (!audioResolved) {
                let {audioPromise} = item;
                if (audioPromise === null) {
                    audioPromise = this._createAudioFromInfo(item.info, source);
                    item.audioPromise = audioPromise;
                }

                try {
                    audio = await audioPromise;
                } catch (e) {
                    continue;
                } finally {
                    item.audioResolved = true;
                }

                item.audio = audio;
            }

            if (audio === null) { continue; }

            return {audio, source, infoListIndex: i};
        }
        return null;
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

    async _getExpressionAudioInfoList(source, expression, reading, details) {
        const infoList = await api.getExpressionAudioInfoList(source, expression, reading, details);
        return infoList.map((info) => ({info, audioPromise: null, audioResolved: false, audio: null}));
    }

    _getExpressionAndReading(definitionIndex, expressionIndex) {
        const {definitions} = this._display;
        if (definitionIndex < 0 || definitionIndex >= definitions.length) { return null; }

        const definition = definitions[definitionIndex];
        if (definition.type === 'kanji') { return null; }

        const {expressions} = definition;
        if (expressionIndex < 0 || expressionIndex >= expressions.length) { return null; }

        const {expression, reading} = expressions[expressionIndex];
        return {expression, reading};
    }

    _getExpressionReadingKey(expression, reading) {
        return JSON.stringify([expression, reading]);
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

    _getPotentialAvailableAudioCount(expression, reading) {
        const key = this._getExpressionReadingKey(expression, reading);
        const sourceMap = this._cache.get(key);
        if (typeof sourceMap === 'undefined') { return null; }

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

    _showAudioMenu(button, definitionIndex, expressionIndex) {
        const expressionReading = this._getExpressionAndReading(definitionIndex, expressionIndex);
        if (expressionReading === null) { return; }

        const {expression, reading} = expressionReading;
        const popupMenu = this._createMenu(button, expression, reading);
        popupMenu.prepare();
    }

    _createMenu(button, expression, reading) {
        // Options
        const {sources, textToSpeechVoice, customSourceUrl} = this._getAudioOptions();
        const sourceIndexMap = new Map();
        for (let i = 0, ii = sources.length; i < ii; ++i) {
            sourceIndexMap.set(sources[i], i);
        }

        // Create menu
        const menuNode = this._display.displayGenerator.createPopupMenu('audio-button');

        // Create menu item metadata
        const menuItems = [];
        const menuItemNodes = menuNode.querySelectorAll('.popup-menu-item');
        for (let i = 0, ii = menuItemNodes.length; i < ii; ++i) {
            const node = menuItemNodes[i];
            const {source} = node.dataset;
            let optionsIndex = sourceIndexMap.get(source);
            if (typeof optionsIndex === 'undefined') { optionsIndex = null; }
            menuItems.push({node, source, index: i, optionsIndex});
        }

        // Sort according to source order in options
        menuItems.sort((a, b) => {
            const ai = a.optionsIndex;
            const bi = b.optionsIndex;
            if (ai !== null) {
                if (bi !== null) {
                    const i = ai - bi;
                    if (i !== 0) { return i; }
                } else {
                    return -1;
                }
            } else {
                if (bi !== null) {
                    return 1;
                }
            }
            return a.index - b.index;
        });

        // Set up items based on cache data
        const sourceMap = this._cache.get(this._getExpressionReadingKey(expression, reading));
        const menuEntryMap = new Map();
        let showIcons = false;
        for (let i = 0, ii = menuItems.length; i < ii; ++i) {
            const {node, source, optionsIndex} = menuItems[i];
            const entries = this._getMenuItemEntries(node, sourceMap, source);
            menuEntryMap.set(source, entries);
            for (const {node: node2, valid, index} of entries) {
                if (valid !== null) {
                    const icon = node2.querySelector('.popup-menu-item-icon');
                    icon.dataset.icon = valid ? 'checkmark' : 'cross';
                    showIcons = true;
                }
                if (index !== null) {
                    node2.dataset.index = `${index}`;
                }
                node2.dataset.valid = `${valid}`;
                node2.dataset.sourceInOptions = `${optionsIndex !== null}`;
                node2.style.order = `${i}`;
            }
        }
        menuNode.dataset.showIcons = `${showIcons}`;

        // Hide options
        if (textToSpeechVoice.length === 0) {
            this._setMenuItemEntriesHidden(menuEntryMap, 'text-to-speech', true);
            this._setMenuItemEntriesHidden(menuEntryMap, 'text-to-speech-reading', true);
        }
        if (customSourceUrl.length === 0) {
            this._setMenuItemEntriesHidden(menuEntryMap, 'custom', true);
        }

        // Create popup menu
        this._menuContainer.appendChild(menuNode);
        return new PopupMenu(button, menuNode);
    }

    _getMenuItemEntries(node, sourceMap, source) {
        const entries = [{node, valid: null, index: null}];

        const nextNode = node.nextSibling;

        if (typeof sourceMap === 'undefined') { return entries; }

        const sourceInfo = sourceMap.get(source);
        if (typeof sourceInfo === 'undefined') { return entries; }

        const {infoList} = sourceInfo;
        if (infoList === null) { return entries; }

        if (infoList.length === 0) {
            entries[0].valid = false;
            return entries;
        }

        const defaultLabel = node.querySelector('.popup-menu-item-label').textContent;

        for (let i = 0, ii = infoList.length; i < ii; ++i) {
            // Get/create entry
            let entry;
            if (i < entries.length) {
                entry = entries[i];
            } else {
                const node2 = node.cloneNode(true);
                nextNode.parentNode.insertBefore(node2, nextNode);
                entry = {node: node2, valid: null, index: null};
                entries.push(entry);
            }

            // Entry info
            entry.index = i;

            const {audio, audioResolved, title} = infoList[i];
            if (audioResolved) { entry.valid = (audio !== null); }

            const labelNode = entry.node.querySelector('.popup-menu-item-label');
            let label = defaultLabel;
            if (ii > 1) { label = `${label} ${i + 1}`; }
            if (typeof title === 'string' && title.length > 0) { label += `: ${title}`; }
            labelNode.textContent = label;
        }

        return entries;
    }

    _setMenuItemEntriesHidden(menuEntryMap, source, hidden) {
        const entries = menuEntryMap.get(source);
        if (typeof entries === 'undefined') { return; }

        for (const {node} of entries) {
            node.hidden = hidden;
        }
    }
}
