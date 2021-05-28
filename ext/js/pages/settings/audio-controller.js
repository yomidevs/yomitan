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
 * AudioSystem
 */

class AudioController {
    constructor(settingsController, modalController) {
        this._settingsController = settingsController;
        this._modalController = modalController;
        this._audioSystem = new AudioSystem();
        this._audioSourceContainer = null;
        this._audioSourceAddButton = null;
        this._audioSourceEntries = [];
        this._ttsVoiceTestTextInput = null;
    }

    get settingsController() {
        return this._settingsController;
    }

    get modalController() {
        return this._modalController;
    }

    async prepare() {
        this._audioSystem.prepare();

        this._ttsVoiceTestTextInput = document.querySelector('#text-to-speech-voice-test-text');
        this._audioSourceContainer = document.querySelector('#audio-source-list');
        this._audioSourceAddButton = document.querySelector('#audio-source-add');
        this._audioSourceContainer.textContent = '';

        this._audioSourceAddButton.addEventListener('click', this._onAddAudioSource.bind(this), false);

        this._audioSystem.on('voiceschanged', this._updateTextToSpeechVoices.bind(this), false);
        this._updateTextToSpeechVoices();

        document.querySelector('#text-to-speech-voice-test').addEventListener('click', this._onTestTextToSpeech.bind(this), false);

        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));

        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    async removeSource(entry) {
        const {index} = entry;
        this._audioSourceEntries.splice(index, 1);
        entry.cleanup();
        for (let i = index, ii = this._audioSourceEntries.length; i < ii; ++i) {
            this._audioSourceEntries[i].index = i;
        }

        await this._settingsController.modifyProfileSettings([{
            action: 'splice',
            path: 'audio.sources',
            start: index,
            deleteCount: 1,
            items: []
        }]);
    }

    // Private

    _onOptionsChanged({options}) {
        for (const entry of this._audioSourceEntries) {
            entry.cleanup();
        }
        this._audioSourceEntries = [];

        const {sources} = options.audio;
        for (let i = 0, ii = sources.length; i < ii; ++i) {
            this._createAudioSourceEntry(i, sources[i]);
        }
    }

    _onAddAudioSource() {
        this._addAudioSource();
    }

    _onTestTextToSpeech() {
        try {
            const text = this._ttsVoiceTestTextInput.value || '';
            const voiceUri = document.querySelector('[data-setting="audio.textToSpeechVoice"]').value;

            const audio = this._audioSystem.createTextToSpeechAudio(text, voiceUri);
            audio.volume = 1.0;
            audio.play();
        } catch (e) {
            // NOP
        }
    }

    _updateTextToSpeechVoices() {
        const voices = (
            typeof speechSynthesis !== 'undefined' ?
            [...speechSynthesis.getVoices()].map((voice, index) => ({
                voice,
                isJapanese: this._languageTagIsJapanese(voice.lang),
                index
            })) :
            []
        );
        voices.sort(this._textToSpeechVoiceCompare.bind(this));

        for (const select of document.querySelectorAll('[data-setting="audio.textToSpeechVoice"]')) {
            const fragment = document.createDocumentFragment();

            let option = document.createElement('option');
            option.value = '';
            option.textContent = 'None';
            fragment.appendChild(option);

            for (const {voice} of voices) {
                option = document.createElement('option');
                option.value = voice.voiceURI;
                option.textContent = `${voice.name} (${voice.lang})`;
                fragment.appendChild(option);
            }

            select.textContent = '';
            select.appendChild(fragment);
        }
    }

    _textToSpeechVoiceCompare(a, b) {
        if (a.isJapanese) {
            if (!b.isJapanese) { return -1; }
        } else {
            if (b.isJapanese) { return 1; }
        }

        if (a.voice.default) {
            if (!b.voice.default) { return -1; }
        } else {
            if (b.voice.default) { return 1; }
        }

        return a.index - b.index;
    }

    _languageTagIsJapanese(languageTag) {
        return (
            languageTag.startsWith('ja_') ||
            languageTag.startsWith('ja-') ||
            languageTag.startsWith('jpn-')
        );
    }

    _createAudioSourceEntry(index, type) {
        const node = this._settingsController.instantiateTemplate('audio-source');
        const entry = new AudioSourceEntry(this, index, type, node);
        this._audioSourceEntries.push(entry);
        this._audioSourceContainer.appendChild(node);
        entry.prepare();
    }

    _getUnusedAudioSourceType() {
        const typesAvailable = [
            'jpod101',
            'jpod101-alternate',
            'jisho',
            'custom'
        ];
        for (const type of typesAvailable) {
            if (!this._audioSourceEntries.some((entry) => entry.type === type)) {
                return type;
            }
        }
        return typesAvailable[0];
    }

    async _addAudioSource() {
        const type = this._getUnusedAudioSourceType();
        const index = this._audioSourceEntries.length;
        this._createAudioSourceEntry(index, type);
        await this._settingsController.modifyProfileSettings([{
            action: 'splice',
            path: 'audio.sources',
            start: index,
            deleteCount: 0,
            items: [type]
        }]);
    }
}

class AudioSourceEntry {
    constructor(parent, index, type, node) {
        this._parent = parent;
        this._index = index;
        this._type = type;
        this._node = node;
        this._eventListeners = new EventListenerCollection();
    }

    get index() {
        return this._index;
    }

    set index(value) {
        this._index = value;
    }

    get type() {
        return this._type;
    }

    prepare() {
        const select = this._node.querySelector('.audio-source-select');
        const menuButton = this._node.querySelector('.audio-source-menu-button');

        select.value = this._type;

        this._eventListeners.addEventListener(select, 'change', this._onAudioSourceSelectChange.bind(this), false);
        this._eventListeners.addEventListener(menuButton, 'menuOpen', this._onMenuOpen.bind(this), false);
        this._eventListeners.addEventListener(menuButton, 'menuClose', this._onMenuClose.bind(this), false);
    }

    cleanup() {
        if (this._node.parentNode !== null) {
            this._node.parentNode.removeChild(this._node);
        }
        this._eventListeners.removeAllEventListeners();
    }

    // Private

    _onAudioSourceSelectChange(event) {
        this._setType(event.currentTarget.value);
    }

    _onMenuOpen(e) {
        const {menu} = e.detail;

        let hasHelp = false;
        switch (this._type) {
            case 'custom':
            case 'custom-json':
                hasHelp = true;
                break;
        }

        menu.bodyNode.querySelector('.popup-menu-item[data-menu-action=help]').hidden = !hasHelp;
    }

    _onMenuClose(e) {
        switch (e.detail.action) {
            case 'help':
                this._showHelp(this._type);
                break;
            case 'remove':
                this._parent.removeSource(this);
                break;
        }
    }

    async _setType(value) {
        this._type = value;
        await this._parent.settingsController.setProfileSetting(`audio.sources[${this._index}]`, value);
    }

    _showHelp(type) {
        switch (type) {
            case 'custom':
                this._showModal('audio-source-help-custom');
                break;
            case 'custom-json':
                this._showModal('audio-source-help-custom-json');
                break;
        }
    }

    _showModal(name) {
        this._parent.modalController.getModal(name).setVisible(true);
    }
}
