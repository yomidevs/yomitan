/*
 * Copyright (C) 2016-2020  Yomichan Authors
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
 * ankiErrorShown
 * ankiFieldsToDict
 * ankiInitialize
 * ankiTemplatesInitialize
 * ankiTemplatesUpdateValue
 * apiForwardLogsToBackend
 * apiGetEnvironmentInfo
 * apiOptionsSave
 * appearanceInitialize
 * audioSettingsInitialize
 * backupInitialize
 * dictSettingsInitialize
 * getOptionsContext
 * onAnkiOptionsChanged
 * onDictionaryOptionsChanged
 * profileOptionsSetup
 * storageInfoInitialize
 * utilBackend
 * utilBackgroundIsolate
 * utilIsolate
 */

function getOptionsMutable(optionsContext) {
    return utilBackend().getOptions(
        utilBackgroundIsolate(optionsContext)
    );
}

function getOptionsFullMutable() {
    return utilBackend().getFullOptions();
}

async function formRead(options) {
    options.general.enable = $('#enable').prop('checked');
    const enableClipboardPopups = $('#enable-clipboard-popups').prop('checked');
    if (enableClipboardPopups) {
        options.general.enableClipboardPopups = await new Promise((resolve, _reject) => {
            chrome.permissions.request(
                {permissions: ['clipboardRead']},
                (granted) => {
                    if (!granted) {
                        $('#enable-clipboard-popups').prop('checked', false);
                    }
                    resolve(granted);
                }
            );
        });
    } else {
        options.general.enableClipboardPopups = false;
    }
    options.general.showGuide = $('#show-usage-guide').prop('checked');
    options.general.compactTags = $('#compact-tags').prop('checked');
    options.general.compactGlossaries = $('#compact-glossaries').prop('checked');
    options.general.resultOutputMode = $('#result-output-mode').val();
    options.general.debugInfo = $('#show-debug-info').prop('checked');
    options.general.showAdvanced = $('#show-advanced-options').prop('checked');
    options.general.maxResults = parseInt($('#max-displayed-results').val(), 10);
    options.general.popupDisplayMode = $('#popup-display-mode').val();
    options.general.popupHorizontalTextPosition = $('#popup-horizontal-text-position').val();
    options.general.popupVerticalTextPosition = $('#popup-vertical-text-position').val();
    options.general.popupWidth = parseInt($('#popup-width').val(), 10);
    options.general.popupHeight = parseInt($('#popup-height').val(), 10);
    options.general.popupHorizontalOffset = parseInt($('#popup-horizontal-offset').val(), 0);
    options.general.popupVerticalOffset = parseInt($('#popup-vertical-offset').val(), 10);
    options.general.popupHorizontalOffset2 = parseInt($('#popup-horizontal-offset2').val(), 0);
    options.general.popupVerticalOffset2 = parseInt($('#popup-vertical-offset2').val(), 10);
    options.general.popupScalingFactor = parseFloat($('#popup-scaling-factor').val());
    options.general.popupScaleRelativeToPageZoom = $('#popup-scale-relative-to-page-zoom').prop('checked');
    options.general.popupScaleRelativeToVisualViewport = $('#popup-scale-relative-to-visual-viewport').prop('checked');
    options.general.showPitchAccentDownstepNotation = $('#show-pitch-accent-downstep-notation').prop('checked');
    options.general.showPitchAccentPositionNotation = $('#show-pitch-accent-position-notation').prop('checked');
    options.general.showPitchAccentGraph = $('#show-pitch-accent-graph').prop('checked');
    options.general.showIframePopupsInRootFrame = $('#show-iframe-popups-in-root-frame').prop('checked');
    options.general.popupTheme = $('#popup-theme').val();
    options.general.popupOuterTheme = $('#popup-outer-theme').val();
    options.general.customPopupCss = $('#custom-popup-css').val();
    options.general.customPopupOuterCss = $('#custom-popup-outer-css').val();

    options.audio.enabled = $('#audio-playback-enabled').prop('checked');
    options.audio.autoPlay = $('#auto-play-audio').prop('checked');
    options.audio.volume = parseFloat($('#audio-playback-volume').val());
    options.audio.customSourceUrl = $('#audio-custom-source').val();
    options.audio.textToSpeechVoice = $('#text-to-speech-voice').val();

    options.scanning.middleMouse = $('#middle-mouse-button-scan').prop('checked');
    options.scanning.touchInputEnabled = $('#touch-input-enabled').prop('checked');
    options.scanning.selectText = $('#select-matched-text').prop('checked');
    options.scanning.alphanumeric = $('#search-alphanumeric').prop('checked');
    options.scanning.autoHideResults = $('#auto-hide-results').prop('checked');
    options.scanning.deepDomScan = $('#deep-dom-scan').prop('checked');
    options.scanning.enablePopupSearch = $('#enable-search-within-first-popup').prop('checked');
    options.scanning.enableOnPopupExpressions = $('#enable-scanning-of-popup-expressions').prop('checked');
    options.scanning.enableOnSearchPage = $('#enable-scanning-on-search-page').prop('checked');
    options.scanning.enableSearchTags = $('#enable-search-tags').prop('checked');
    options.scanning.delay = parseInt($('#scan-delay').val(), 10);
    options.scanning.length = parseInt($('#scan-length').val(), 10);
    options.scanning.modifier = $('#scan-modifier-key').val();
    options.scanning.popupNestingMaxDepth = parseInt($('#popup-nesting-max-depth').val(), 10);

    options.translation.convertHalfWidthCharacters = $('#translation-convert-half-width-characters').val();
    options.translation.convertNumericCharacters = $('#translation-convert-numeric-characters').val();
    options.translation.convertAlphabeticCharacters = $('#translation-convert-alphabetic-characters').val();
    options.translation.convertHiraganaToKatakana = $('#translation-convert-hiragana-to-katakana').val();
    options.translation.convertKatakanaToHiragana = $('#translation-convert-katakana-to-hiragana').val();
    options.translation.collapseEmphaticSequences = $('#translation-collapse-emphatic-sequences').val();

    options.parsing.enableScanningParser = $('#parsing-scan-enable').prop('checked');
    options.parsing.enableMecabParser = $('#parsing-mecab-enable').prop('checked');
    options.parsing.termSpacing = $('#parsing-term-spacing').prop('checked');
    options.parsing.readingMode = $('#parsing-reading-mode').val();

    const optionsAnkiEnableOld = options.anki.enable;
    options.anki.enable = $('#anki-enable').prop('checked');
    options.anki.tags = utilBackgroundIsolate($('#card-tags').val().split(/[,; ]+/));
    options.anki.sentenceExt = parseInt($('#sentence-detection-extent').val(), 10);
    options.anki.server = $('#interface-server').val();
    options.anki.duplicateScope = $('#duplicate-scope').val();
    options.anki.screenshot.format = $('#screenshot-format').val();
    options.anki.screenshot.quality = parseInt($('#screenshot-quality').val(), 10);

    if (optionsAnkiEnableOld && !ankiErrorShown()) {
        options.anki.terms.deck = $('#anki-terms-deck').val();
        options.anki.terms.model = $('#anki-terms-model').val();
        options.anki.terms.fields = utilBackgroundIsolate(ankiFieldsToDict(document.querySelectorAll('#terms .anki-field-value')));
        options.anki.kanji.deck = $('#anki-kanji-deck').val();
        options.anki.kanji.model = $('#anki-kanji-model').val();
        options.anki.kanji.fields = utilBackgroundIsolate(ankiFieldsToDict(document.querySelectorAll('#kanji .anki-field-value')));
    }
}

async function formWrite(options) {
    $('#enable').prop('checked', options.general.enable);
    $('#enable-clipboard-popups').prop('checked', options.general.enableClipboardPopups);
    $('#show-usage-guide').prop('checked', options.general.showGuide);
    $('#compact-tags').prop('checked', options.general.compactTags);
    $('#compact-glossaries').prop('checked', options.general.compactGlossaries);
    $('#result-output-mode').val(options.general.resultOutputMode);
    $('#show-debug-info').prop('checked', options.general.debugInfo);
    $('#show-advanced-options').prop('checked', options.general.showAdvanced);
    $('#max-displayed-results').val(options.general.maxResults);
    $('#popup-display-mode').val(options.general.popupDisplayMode);
    $('#popup-horizontal-text-position').val(options.general.popupHorizontalTextPosition);
    $('#popup-vertical-text-position').val(options.general.popupVerticalTextPosition);
    $('#popup-width').val(options.general.popupWidth);
    $('#popup-height').val(options.general.popupHeight);
    $('#popup-horizontal-offset').val(options.general.popupHorizontalOffset);
    $('#popup-vertical-offset').val(options.general.popupVerticalOffset);
    $('#popup-horizontal-offset2').val(options.general.popupHorizontalOffset2);
    $('#popup-vertical-offset2').val(options.general.popupVerticalOffset2);
    $('#popup-scaling-factor').val(options.general.popupScalingFactor);
    $('#popup-scale-relative-to-page-zoom').prop('checked', options.general.popupScaleRelativeToPageZoom);
    $('#popup-scale-relative-to-visual-viewport').prop('checked', options.general.popupScaleRelativeToVisualViewport);
    $('#show-pitch-accent-downstep-notation').prop('checked', options.general.showPitchAccentDownstepNotation);
    $('#show-pitch-accent-position-notation').prop('checked', options.general.showPitchAccentPositionNotation);
    $('#show-pitch-accent-graph').prop('checked', options.general.showPitchAccentGraph);
    $('#show-iframe-popups-in-root-frame').prop('checked', options.general.showIframePopupsInRootFrame);
    $('#popup-theme').val(options.general.popupTheme);
    $('#popup-outer-theme').val(options.general.popupOuterTheme);
    $('#custom-popup-css').val(options.general.customPopupCss);
    $('#custom-popup-outer-css').val(options.general.customPopupOuterCss);

    $('#audio-playback-enabled').prop('checked', options.audio.enabled);
    $('#auto-play-audio').prop('checked', options.audio.autoPlay);
    $('#audio-playback-volume').val(options.audio.volume);
    $('#audio-custom-source').val(options.audio.customSourceUrl);
    $('#text-to-speech-voice').val(options.audio.textToSpeechVoice).attr('data-value', options.audio.textToSpeechVoice);

    $('#middle-mouse-button-scan').prop('checked', options.scanning.middleMouse);
    $('#touch-input-enabled').prop('checked', options.scanning.touchInputEnabled);
    $('#select-matched-text').prop('checked', options.scanning.selectText);
    $('#search-alphanumeric').prop('checked', options.scanning.alphanumeric);
    $('#auto-hide-results').prop('checked', options.scanning.autoHideResults);
    $('#deep-dom-scan').prop('checked', options.scanning.deepDomScan);
    $('#enable-search-within-first-popup').prop('checked', options.scanning.enablePopupSearch);
    $('#enable-scanning-of-popup-expressions').prop('checked', options.scanning.enableOnPopupExpressions);
    $('#enable-scanning-on-search-page').prop('checked', options.scanning.enableOnSearchPage);
    $('#enable-search-tags').prop('checked', options.scanning.enableSearchTags);
    $('#scan-delay').val(options.scanning.delay);
    $('#scan-length').val(options.scanning.length);
    $('#scan-modifier-key').val(options.scanning.modifier);
    $('#popup-nesting-max-depth').val(options.scanning.popupNestingMaxDepth);

    $('#translation-convert-half-width-characters').val(options.translation.convertHalfWidthCharacters);
    $('#translation-convert-numeric-characters').val(options.translation.convertNumericCharacters);
    $('#translation-convert-alphabetic-characters').val(options.translation.convertAlphabeticCharacters);
    $('#translation-convert-hiragana-to-katakana').val(options.translation.convertHiraganaToKatakana);
    $('#translation-convert-katakana-to-hiragana').val(options.translation.convertKatakanaToHiragana);
    $('#translation-collapse-emphatic-sequences').val(options.translation.collapseEmphaticSequences);

    $('#parsing-scan-enable').prop('checked', options.parsing.enableScanningParser);
    $('#parsing-mecab-enable').prop('checked', options.parsing.enableMecabParser);
    $('#parsing-term-spacing').prop('checked', options.parsing.termSpacing);
    $('#parsing-reading-mode').val(options.parsing.readingMode);

    $('#anki-enable').prop('checked', options.anki.enable);
    $('#card-tags').val(options.anki.tags.join(' '));
    $('#sentence-detection-extent').val(options.anki.sentenceExt);
    $('#interface-server').val(options.anki.server);
    $('#duplicate-scope').val(options.anki.duplicateScope);
    $('#screenshot-format').val(options.anki.screenshot.format);
    $('#screenshot-quality').val(options.anki.screenshot.quality);

    await ankiTemplatesUpdateValue();
    await onAnkiOptionsChanged(options);
    await onDictionaryOptionsChanged();

    formUpdateVisibility(options);
}

function formSetupEventListeners() {
    $('input, select, textarea').not('.anki-model').not('.ignore-form-changes *').change(onFormOptionsChanged);
}

function formUpdateVisibility(options) {
    document.documentElement.dataset.optionsAnkiEnable = `${!!options.anki.enable}`;
    document.documentElement.dataset.optionsGeneralDebugInfo = `${!!options.general.debugInfo}`;
    document.documentElement.dataset.optionsGeneralShowAdvanced = `${!!options.general.showAdvanced}`;
    document.documentElement.dataset.optionsGeneralResultOutputMode = `${options.general.resultOutputMode}`;

    if (options.general.debugInfo) {
        const temp = utilIsolate(options);
        if (typeof temp.anki.fieldTemplates === 'string') {
            temp.anki.fieldTemplates = '...';
        }
        const text = JSON.stringify(temp, null, 4);
        $('#debug').text(text);
    }
}

async function onFormOptionsChanged() {
    const optionsContext = getOptionsContext();
    const options = await getOptionsMutable(optionsContext);

    await formRead(options);
    await settingsSaveOptions();
    formUpdateVisibility(options);

    await onAnkiOptionsChanged(options);
}


function settingsGetSource() {
    return new Promise((resolve) => {
        chrome.tabs.getCurrent((tab) => resolve(`settings${tab ? tab.id : ''}`));
    });
}

async function settingsSaveOptions() {
    const source = await settingsGetSource();
    await apiOptionsSave(source);
}

async function onOptionsUpdated({source}) {
    const thisSource = await settingsGetSource();
    if (source === thisSource) { return; }

    const optionsContext = getOptionsContext();
    const options = await getOptionsMutable(optionsContext);
    await formWrite(options);
}


function showExtensionInformation() {
    const node = document.getElementById('extension-info');
    if (node === null) { return; }

    const manifest = chrome.runtime.getManifest();
    node.textContent = `${manifest.name} v${manifest.version}`;
}

async function settingsPopulateModifierKeys() {
    const scanModifierKeySelect = document.querySelector('#scan-modifier-key');
    scanModifierKeySelect.textContent = '';

    const environment = await apiGetEnvironmentInfo();
    const modifierKeys = [
        {value: 'none', name: 'None'},
        ...environment.modifiers.keys
    ];
    for (const {value, name} of modifierKeys) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = name;
        scanModifierKeySelect.appendChild(option);
    }
}


async function onReady() {
    apiForwardLogsToBackend();
    await yomichan.prepare();

    showExtensionInformation();

    await settingsPopulateModifierKeys();
    formSetupEventListeners();
    appearanceInitialize();
    await audioSettingsInitialize();
    await profileOptionsSetup();
    await dictSettingsInitialize();
    ankiInitialize();
    ankiTemplatesInitialize();
    backupInitialize();

    storageInfoInitialize();

    yomichan.on('optionsUpdated', onOptionsUpdated);
}

$(document).ready(() => onReady());
