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
 * AudioSourceUI
 * AudioSystem
 * getOptionsContext
 * getOptionsMutable
 * settingsSaveOptions
 */

let audioSourceUI = null;
let audioSystem = null;

async function audioSettingsInitialize() {
    audioSystem = new AudioSystem({
        audioUriBuilder: null,
        useCache: true
    });

    const optionsContext = getOptionsContext();
    const options = await getOptionsMutable(optionsContext);
    audioSourceUI = new AudioSourceUI.Container(
        options.audio.sources,
        document.querySelector('.audio-source-list'),
        document.querySelector('.audio-source-add')
    );
    audioSourceUI.save = settingsSaveOptions;

    textToSpeechInitialize();
}

function textToSpeechInitialize() {
    if (typeof speechSynthesis === 'undefined') { return; }

    speechSynthesis.addEventListener('voiceschanged', updateTextToSpeechVoices, false);
    updateTextToSpeechVoices();

    document.querySelector('#text-to-speech-voice').addEventListener('change', onTextToSpeechVoiceChange, false);
    document.querySelector('#text-to-speech-voice-test').addEventListener('click', textToSpeechTest, false);
}

function updateTextToSpeechVoices() {
    const voices = Array.prototype.map.call(speechSynthesis.getVoices(), (voice, index) => ({voice, index}));
    voices.sort(textToSpeechVoiceCompare);

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

function languageTagIsJapanese(languageTag) {
    return (
        languageTag.startsWith('ja-') ||
        languageTag.startsWith('jpn-')
    );
}

function textToSpeechVoiceCompare(a, b) {
    const aIsJapanese = languageTagIsJapanese(a.voice.lang);
    const bIsJapanese = languageTagIsJapanese(b.voice.lang);
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

function textToSpeechTest() {
    try {
        const text = document.querySelector('#text-to-speech-voice-test').dataset.speechText || '';
        const voiceUri = document.querySelector('#text-to-speech-voice').value;

        const audio = audioSystem.createTextToSpeechAudio(text, voiceUri);
        audio.volume = 1.0;
        audio.play();
    } catch (e) {
        // NOP
    }
}

function onTextToSpeechVoiceChange(e) {
    e.currentTarget.dataset.value = e.currentTarget.value;
}
