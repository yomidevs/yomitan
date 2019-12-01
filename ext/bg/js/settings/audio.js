/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


let audioSourceUI = null;

async function audioSettingsInitialize() {
    const optionsContext = getOptionsContext();
    const options = await apiOptionsGet(optionsContext);
    audioSourceUI = new AudioSourceUI.Container(options.audio.sources, $('.audio-source-list'), $('.audio-source-add'));
    audioSourceUI.save = () => settingsSaveOptions();

    textToSpeechInitialize();
}

function textToSpeechInitialize() {
    if (typeof speechSynthesis === 'undefined') { return; }

    speechSynthesis.addEventListener('voiceschanged', () => updateTextToSpeechVoices(), false);
    updateTextToSpeechVoices();

    $('#text-to-speech-voice-test').on('click', () => textToSpeechTest());
}

function updateTextToSpeechVoices() {
    const voices = Array.prototype.map.call(speechSynthesis.getVoices(), (voice, index) => ({voice, index}));
    voices.sort(textToSpeechVoiceCompare);
    if (voices.length > 0) {
        $('#text-to-speech-voice-container').css('display', '');
    }

    const select = $('#text-to-speech-voice');
    select.empty();
    select.append($('<option>').val('').text('None'));
    for (const {voice} of voices) {
        select.append($('<option>').val(voice.voiceURI).text(`${voice.name} (${voice.lang})`));
    }

    select.val(select.attr('data-value'));
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

    if (a.index < b.index) { return -1; }
    if (a.index > b.index) { return 1; }
    return 0;
}

function textToSpeechTest() {
    try {
        const text = $('#text-to-speech-voice-test').attr('data-speech-text') || '';
        const voiceURI = $('#text-to-speech-voice').val();
        const voice = audioGetTextToSpeechVoice(voiceURI);
        if (voice === null) { return; }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.voice = voice;
        utterance.volume = 1.0;

        speechSynthesis.speak(utterance);
    } catch (e) {
        // NOP
    }
}
