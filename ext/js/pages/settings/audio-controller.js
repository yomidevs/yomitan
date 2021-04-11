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
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._audioSystem = new AudioSystem();
        this._audioSourceContainer = null;
        this._audioSourceAddButton = null;
        this._audioSourceEntries = [];
        this._ttsVoiceTestTextInput = null;
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

    // Private

    _onOptionsChanged({options}) {
        for (let i = this._audioSourceEntries.length - 1; i >= 0; --i) {
            this._cleanupAudioSourceEntry(i);
        }

        for (const audioSource of options.audio.sources) {
            this._createAudioSourceEntry(audioSource);
        }
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

    _getUnusedAudioSource() {
        const audioSourcesAvailable = [
            'jpod101',
            'jpod101-alternate',
            'jisho',
            'custom'
        ];
        for (const source of audioSourcesAvailable) {
            if (!this._audioSourceEntries.some((metadata) => metadata.value === source)) {
                return source;
            }
        }
        return audioSourcesAvailable[0];
    }

    _createAudioSourceEntry(value) {
        const eventListeners = new EventListenerCollection();
        const container = this._settingsController.instantiateTemplate('audio-source');
        const select = container.querySelector('.audio-source-select');
        const removeButton = container.querySelector('.audio-source-remove');
        const menuButton = container.querySelector('.audio-source-menu-button');

        select.value = value;

        const entry = {
            container,
            eventListeners,
            value
        };

        eventListeners.addEventListener(select, 'change', this._onAudioSourceSelectChange.bind(this, entry), false);
        if (removeButton !== null) {
            eventListeners.addEventListener(removeButton, 'click', this._onAudioSourceRemoveClicked.bind(this, entry), false);
        }
        if (menuButton !== null) {
            eventListeners.addEventListener(menuButton, 'menuClose', this._onMenuClose.bind(this, entry), false);
        }

        this._audioSourceContainer.appendChild(container);
        this._audioSourceEntries.push(entry);
    }

    async _removeAudioSourceEntry(entry) {
        const index = this._audioSourceEntries.indexOf(entry);
        if (index < 0) { return; }

        this._cleanupAudioSourceEntry(index);
        await this._settingsController.modifyProfileSettings([{
            action: 'splice',
            path: 'audio.sources',
            start: index,
            deleteCount: 1,
            items: []
        }]);
    }

    _cleanupAudioSourceEntry(index) {
        const {container, eventListeners} = this._audioSourceEntries[index];
        if (container.parentNode !== null) {
            container.parentNode.removeChild(container);
        }
        eventListeners.removeAllEventListeners();
        this._audioSourceEntries.splice(index, 1);
    }

    async _onAddAudioSource() {
        const audioSource = this._getUnusedAudioSource();
        const index = this._audioSourceEntries.length;
        this._createAudioSourceEntry(audioSource);
        await this._settingsController.modifyProfileSettings([{
            action: 'splice',
            path: 'audio.sources',
            start: index,
            deleteCount: 0,
            items: [audioSource]
        }]);
    }

    async _onAudioSourceSelectChange(entry, event) {
        const index = this._audioSourceEntries.indexOf(entry);
        if (index < 0) { return; }

        const value = event.currentTarget.value;
        entry.value = value;
        await this._settingsController.setProfileSetting(`audio.sources[${index}]`, value);
    }

    _onAudioSourceRemoveClicked(entry) {
        this._removeAudioSourceEntry(entry);
    }

    _onMenuClose(entry, e) {
        switch (e.detail.action) {
            case 'remove':
                this._removeAudioSourceEntry(entry);
                break;
        }
    }
}
