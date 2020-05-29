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
 * AudioSystem
 * getOptionsContext
 * getOptionsMutable
 * settingsSaveOptions
 */

class AudioController {
    constructor() {
        this._audioSystem = null;
        this._settingsAudioSources = null;
        this._audioSourceContainer = null;
        this._audioSourceAddButton = null;
        this._audioSourceEntries = [];
    }

    async prepare() {
        this._audioSystem = new AudioSystem({
            audioUriBuilder: null,
            useCache: true
        });

        const optionsContext = getOptionsContext();
        const options = await getOptionsMutable(optionsContext);

        this._settingsAudioSources = options.audio.sources;
        this._audioSourceContainer = document.querySelector('.audio-source-list');
        this._audioSourceAddButton = document.querySelector('.audio-source-add');
        this._audioSourceContainer.textContent = '';

        this._audioSourceAddButton.addEventListener('click', this._onAddAudioSource.bind(this), false);

        for (const audioSource of toIterable(this._settingsAudioSources)) {
            this._createAudioSourceEntry(audioSource);
        }

        this._prepareTextToSpeech();
    }

    // Private

    async _save() {
        await settingsSaveOptions();
    }

    _prepareTextToSpeech() {
        if (typeof speechSynthesis === 'undefined') { return; }

        speechSynthesis.addEventListener('voiceschanged', this._updateTextToSpeechVoices.bind(this), false);
        this._updateTextToSpeechVoices();

        document.querySelector('#text-to-speech-voice').addEventListener('change', this._onTextToSpeechVoiceChange.bind(this), false);
        document.querySelector('#text-to-speech-voice-test').addEventListener('click', this._testTextToSpeech.bind(this), false);
    }

    _updateTextToSpeechVoices() {
        const voices = Array.prototype.map.call(speechSynthesis.getVoices(), (voice, index) => ({voice, index}));
        voices.sort(this._textToSpeechVoiceCompare.bind(this));

        document.querySelector('#text-to-speech-voice-container').hidden = (voices.length === 0);

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

        const select = document.querySelector('#text-to-speech-voice');
        select.textContent = '';
        select.appendChild(fragment);
        select.value = select.dataset.value;
    }

    _textToSpeechVoiceCompare(a, b) {
        const aIsJapanese = this._languageTagIsJapanese(a.voice.lang);
        const bIsJapanese = this._languageTagIsJapanese(b.voice.lang);
        if (aIsJapanese) {
            if (!bIsJapanese) { return -1; }
        } else {
            if (bIsJapanese) { return 1; }
        }

        const aIsDefault = a.voice.default;
        const bIsDefault = b.voice.default;
        if (aIsDefault) {
            if (!bIsDefault) { return -1; }
        } else {
            if (bIsDefault) { return 1; }
        }

        return a.index - b.index;
    }

    _languageTagIsJapanese(languageTag) {
        return (
            languageTag.startsWith('ja-') ||
            languageTag.startsWith('jpn-')
        );
    }

    _testTextToSpeech() {
        try {
            const text = document.querySelector('#text-to-speech-voice-test').dataset.speechText || '';
            const voiceUri = document.querySelector('#text-to-speech-voice').value;

            const audio = this._audioSystem.createTextToSpeechAudio(text, voiceUri);
            audio.volume = 1.0;
            audio.play();
        } catch (e) {
            // NOP
        }
    }

    _instantiateTemplate(templateSelector) {
        const template = document.querySelector(templateSelector);
        const content = document.importNode(template.content, true);
        return content.firstChild;
    }

    _getUnusedAudioSource() {
        const audioSourcesAvailable = [
            'jpod101',
            'jpod101-alternate',
            'jisho',
            'custom'
        ];
        for (const source of audioSourcesAvailable) {
            if (this._settingsAudioSources.indexOf(source) < 0) {
                return source;
            }
        }
        return audioSourcesAvailable[0];
    }

    _createAudioSourceEntry(value) {
        const eventListeners = new EventListenerCollection();
        const container = this._instantiateTemplate('#audio-source-template');
        const select = container.querySelector('.audio-source-select');
        const removeButton = container.querySelector('.audio-source-remove');

        select.value = value;

        const entry = {
            container,
            eventListeners
        };

        eventListeners.addEventListener(select, 'change', this._onAudioSourceSelectChange.bind(this, entry), false);
        eventListeners.addEventListener(removeButton, 'click', this._onAudioSourceRemoveClicked.bind(this, entry), false);

        this._audioSourceContainer.appendChild(container);
        this._audioSourceEntries.push(entry);
    }

    _removeAudioSourceEntry(entry) {
        const index = this._audioSourceEntries.indexOf(entry);
        if (index < 0) { return; }

        const {container, eventListeners} = entry;
        if (container.parentNode !== null) {
            container.parentNode.removeChild(container);
        }
        eventListeners.removeAllEventListeners();

        this._audioSourceEntries.splice(index, 1);
        this._settingsAudioSources.splice(index, 1);

        for (let i = index, ii = this._audioSourceEntries.length; i < ii; ++i) {
            this._audioSourceEntries[i].index = i;
        }
    }

    _onTextToSpeechVoiceChange(e) {
        e.currentTarget.dataset.value = e.currentTarget.value;
    }

    _onAddAudioSource() {
        const audioSource = this._getUnusedAudioSource();
        this._settingsAudioSources.push(audioSource);
        this._createAudioSourceEntry(audioSource);
        this._save();
    }

    _onAudioSourceSelectChange(entry, event) {
        const index = this._audioSourceEntries.indexOf(entry);
        if (index < 0) { return; }

        const value = event.currentTarget.value;
        this._settingsAudioSources[index] = value;
        this._save();
    }

    _onAudioSourceRemoveClicked(entry) {
        this._removeAudioSourceEntry(entry);
        this._save();
    }
}
