/*
 * Copyright (C) 2019-2022  Yomichan Authors
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

class AudioController extends EventDispatcher {
    constructor(settingsController, modalController) {
        super();
        this._settingsController = settingsController;
        this._modalController = modalController;
        this._audioSystem = new AudioSystem();
        this._audioSourceContainer = null;
        this._audioSourceAddButton = null;
        this._audioSourceEntries = [];
        this._voiceTestTextInput = null;
        this._voices = [];
    }

    get settingsController() {
        return this._settingsController;
    }

    get modalController() {
        return this._modalController;
    }

    async prepare() {
        this._audioSystem.prepare();

        this._voiceTestTextInput = document.querySelector('#text-to-speech-voice-test-text');
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

    getVoices() {
        return this._voices;
    }

    setTestVoice(voice) {
        this._voiceTestTextInput.dataset.voice = voice;
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
            const text = this._voiceTestTextInput.value || '';
            const voiceUri = this._voiceTestTextInput.dataset.voice;
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
        this._voices = voices;
        this.trigger('voicesUpdated');
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

    _createAudioSourceEntry(index, source) {
        const node = this._settingsController.instantiateTemplate('audio-source');
        const entry = new AudioSourceEntry(this, index, source, node);
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
        const source = {type, url: '', voice: ''};
        const index = this._audioSourceEntries.length;
        this._createAudioSourceEntry(index, source);
        await this._settingsController.modifyProfileSettings([{
            action: 'splice',
            path: 'audio.sources',
            start: index,
            deleteCount: 0,
            items: [source]
        }]);
    }
}

class AudioSourceEntry {
    constructor(parent, index, source, node) {
        this._parent = parent;
        this._index = index;
        this._type = source.type;
        this._url = source.url;
        this._voice = source.voice;
        this._node = node;
        this._eventListeners = new EventListenerCollection();
        this._typeSelect = null;
        this._urlInput = null;
        this._voiceSelect = null;
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
        this._updateTypeParameter();

        const menuButton = this._node.querySelector('.audio-source-menu-button');
        this._typeSelect = this._node.querySelector('.audio-source-type-select');
        this._urlInput = this._node.querySelector('.audio-source-parameter-container[data-field=url] .audio-source-parameter');
        this._voiceSelect = this._node.querySelector('.audio-source-parameter-container[data-field=voice] .audio-source-parameter');

        this._typeSelect.value = this._type;
        this._urlInput.value = this._url;

        this._eventListeners.addEventListener(this._typeSelect, 'change', this._onTypeSelectChange.bind(this), false);
        this._eventListeners.addEventListener(this._urlInput, 'change', this._onUrlInputChange.bind(this), false);
        this._eventListeners.addEventListener(this._voiceSelect, 'change', this._onVoiceSelectChange.bind(this), false);
        this._eventListeners.addEventListener(menuButton, 'menuOpen', this._onMenuOpen.bind(this), false);
        this._eventListeners.addEventListener(menuButton, 'menuClose', this._onMenuClose.bind(this), false);
        this._eventListeners.on(this._parent, 'voicesUpdated', this._onVoicesUpdated.bind(this));
        this._onVoicesUpdated();
    }

    cleanup() {
        if (this._node.parentNode !== null) {
            this._node.parentNode.removeChild(this._node);
        }
        this._eventListeners.removeAllEventListeners();
    }

    // Private

    _onVoicesUpdated() {
        const voices = this._parent.getVoices();

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

        this._voiceSelect.textContent = '';
        this._voiceSelect.appendChild(fragment);
        this._voiceSelect.value = this._voice;
    }

    _onTypeSelectChange(e) {
        this._setType(e.currentTarget.value);
    }

    _onUrlInputChange(e) {
        this._setUrl(e.currentTarget.value);
    }

    _onVoiceSelectChange(e) {
        this._setVoice(e.currentTarget.value);
    }

    _onMenuOpen(e) {
        const {menu} = e.detail;

        let hasHelp = false;
        switch (this._type) {
            case 'custom':
            case 'custom-json':
            case 'text-to-speech':
            case 'text-to-speech-reading':
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
        this._updateTypeParameter();
        await this._parent.settingsController.setProfileSetting(`audio.sources[${this._index}].type`, value);
    }

    async _setUrl(value) {
        this._url = value;
        await this._parent.settingsController.setProfileSetting(`audio.sources[${this._index}].url`, value);
    }

    async _setVoice(value) {
        this._voice = value;
        await this._parent.settingsController.setProfileSetting(`audio.sources[${this._index}].voice`, value);
    }

    _updateTypeParameter() {
        let field = null;
        switch (this._type) {
            case 'custom':
            case 'custom-json':
                field = 'url';
                break;
            case 'text-to-speech':
            case 'text-to-speech-reading':
                field = 'voice';
                break;
        }
        for (const node of this._node.querySelectorAll('.audio-source-parameter-container')) {
            node.hidden = (field === null || node.dataset.field !== field);
        }
    }

    _showHelp(type) {
        switch (type) {
            case 'custom':
                this._showModal('audio-source-help-custom');
                break;
            case 'custom-json':
                this._showModal('audio-source-help-custom-json');
                break;
            case 'text-to-speech':
            case 'text-to-speech-reading':
                this._parent.setTestVoice(this._voice);
                this._showModal('audio-source-help-text-to-speech');
                break;
        }
    }

    _showModal(name) {
        this._parent.modalController.getModal(name).setVisible(true);
    }
}
