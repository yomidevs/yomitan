/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
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

async function getOptionsArray() {
    const optionsFull = await apiOptionsGetFull();
    return optionsFull.profiles.map(profile => profile.options);
}

async function formRead(options) {
    options.general.enable = $('#enable').prop('checked');
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
    options.scanning.delay = parseInt($('#scan-delay').val(), 10);
    options.scanning.length = parseInt($('#scan-length').val(), 10);
    options.scanning.modifier = $('#scan-modifier-key').val();
    options.scanning.popupNestingMaxDepth = parseInt($('#popup-nesting-max-depth').val(), 10);

    const optionsAnkiEnableOld = options.anki.enable;
    options.anki.enable = $('#anki-enable').prop('checked');
    options.anki.tags = utilBackgroundIsolate($('#card-tags').val().split(/[,; ]+/));
    options.anki.sentenceExt = parseInt($('#sentence-detection-extent').val(), 10);
    options.anki.server = $('#interface-server').val();
    options.anki.screenshot.format = $('#screenshot-format').val();
    options.anki.screenshot.quality = parseInt($('#screenshot-quality').val(), 10);
    options.anki.fieldTemplates = $('#field-templates').val();

    if (optionsAnkiEnableOld && !ankiErrorShown()) {
        options.anki.terms.deck = $('#anki-terms-deck').val();
        options.anki.terms.model = $('#anki-terms-model').val();
        options.anki.terms.fields = utilBackgroundIsolate(ankiFieldsToDict($('#terms .anki-field-value')));
        options.anki.kanji.deck = $('#anki-kanji-deck').val();
        options.anki.kanji.model = $('#anki-kanji-model').val();
        options.anki.kanji.fields = utilBackgroundIsolate(ankiFieldsToDict($('#kanji .anki-field-value')));
    }

    options.general.mainDictionary = $('#dict-main').val();
    $('.dict-group').each((index, element) => {
        const dictionary = $(element);
        options.dictionaries[dictionary.data('title')] = utilBackgroundIsolate({
            priority: parseInt(dictionary.find('.dict-priority').val(), 10),
            enabled: dictionary.find('.dict-enabled').prop('checked'),
            allowSecondarySearches: dictionary.find('.dict-allow-secondary-searches').prop('checked')
        });
    });
}

async function formWrite(options) {
    $('#enable').prop('checked', options.general.enable);
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
    $('#scan-delay').val(options.scanning.delay);
    $('#scan-length').val(options.scanning.length);
    $('#scan-modifier-key').val(options.scanning.modifier);
    $('#popup-nesting-max-depth').val(options.scanning.popupNestingMaxDepth);

    $('#anki-enable').prop('checked', options.anki.enable);
    $('#card-tags').val(options.anki.tags.join(' '));
    $('#sentence-detection-extent').val(options.anki.sentenceExt);
    $('#interface-server').val(options.anki.server);
    $('#screenshot-format').val(options.anki.screenshot.format);
    $('#screenshot-quality').val(options.anki.screenshot.quality);
    $('#field-templates').val(options.anki.fieldTemplates);

    try {
        await dictionaryGroupsPopulate(options);
        await formMainDictionaryOptionsPopulate(options);
    } catch (e) {
        dictionaryErrorsShow([e]);
    }

    try {
        await ankiDeckAndModelPopulate(options);
    } catch (e) {
        ankiErrorShow(e);
    }

    formUpdateVisibility(options);
}

function formSetupEventListeners() {
    $('#dict-purge-link').click(utilAsync(onDictionaryPurge));
    $('#dict-file').change(utilAsync(onDictionaryImport));
    $('#dict-file-button').click(onDictionaryImportButtonClick);

    $('#field-templates-reset').click(utilAsync(onAnkiFieldTemplatesReset));
    $('input, select, textarea').not('.anki-model').not('.ignore-form-changes *').change(utilAsync(onFormOptionsChanged));
    $('.anki-model').change(utilAsync(onAnkiModelChanged));
}

function formUpdateVisibility(options) {
    const general = $('#anki-general');
    if (options.anki.enable) {
        general.show();
    } else {
        general.hide();
    }

    const advanced = $('.options-advanced');
    if (options.general.showAdvanced) {
        advanced.show();
    } else {
        advanced.hide();
    }

    const mainGroup = $('#dict-main-group');
    if (options.general.resultOutputMode === 'merge') {
        mainGroup.show();
    } else {
        mainGroup.hide();
    }

    const debug = $('#debug');
    if (options.general.debugInfo) {
        const temp = utilIsolate(options);
        temp.anki.fieldTemplates = '...';
        const text = JSON.stringify(temp, null, 4);
        debug.html(handlebarsEscape(text));
        debug.show();
    } else {
        debug.hide();
    }
}

async function formMainDictionaryOptionsPopulate(options) {
    const select = $('#dict-main').empty();
    select.append($('<option class="text-muted" value="">Not selected</option>'));

    let mainDictionary = '';
    for (const dictRow of toIterable(await utilDatabaseSummarize())) {
        if (dictRow.sequenced) {
            select.append($(`<option value="${dictRow.title}">${dictRow.title}</option>`));
            if (dictRow.title === options.general.mainDictionary) {
                mainDictionary = dictRow.title;
            }
        }
    }

    select.val(mainDictionary);
}

async function onFormOptionsChanged(e) {
    if (!e.originalEvent && !e.isTrigger) {
        return;
    }

    const optionsContext = getOptionsContext();
    const options = await apiOptionsGet(optionsContext);
    const optionsAnkiEnableOld = options.anki.enable;
    const optionsAnkiServerOld = options.anki.server;

    await formRead(options);
    await settingsSaveOptions();
    formUpdateVisibility(options);

    try {
        const ankiUpdated =
            options.anki.enable !== optionsAnkiEnableOld ||
            options.anki.server !== optionsAnkiServerOld;

        if (ankiUpdated) {
            ankiSpinnerShow(true);
            await ankiDeckAndModelPopulate(options);
            ankiErrorShow();
        }
    } catch (e) {
        ankiErrorShow(e);
    } finally {
        ankiSpinnerShow(false);
    }
}

async function onReady() {
    showExtensionInformation();

    formSetupEventListeners();
    appearanceInitialize();
    await audioSettingsInitialize();
    await profileOptionsSetup();

    storageInfoInitialize();

    chrome.runtime.onMessage.addListener(onMessage);
}

$(document).ready(utilAsync(onReady));


/*
 * Appearance
 */

function appearanceInitialize() {
    let previewVisible = false;
    $('#settings-popup-preview-button').on('click', () => {
        if (previewVisible) { return; }
        showAppearancePreview();
        previewVisible = true;
    });
}

function showAppearancePreview() {
    const container = $('#settings-popup-preview-container');
    const buttonContainer = $('#settings-popup-preview-button-container');
    const settings = $('#settings-popup-preview-settings');
    const text = $('#settings-popup-preview-text');
    const customCss = $('#custom-popup-css');
    const customOuterCss = $('#custom-popup-outer-css');

    const frame = document.createElement('iframe');
    frame.src = '/bg/settings-popup-preview.html';
    frame.id = 'settings-popup-preview-frame';

    window.wanakana.bind(text[0]);

    text.on('input', () => {
        const action = 'setText';
        const params = {text: text.val()};
        frame.contentWindow.postMessage({action, params}, '*');
    });
    customCss.on('input', () => {
        const action = 'setCustomCss';
        const params = {css: customCss.val()};
        frame.contentWindow.postMessage({action, params}, '*');
    });
    customOuterCss.on('input', () => {
        const action = 'setCustomOuterCss';
        const params = {css: customOuterCss.val()};
        frame.contentWindow.postMessage({action, params}, '*');
    });

    container.append(frame);
    buttonContainer.remove();
    settings.css('display', '');
}


/*
 * Audio
 */

let audioSourceUI = null;

async function audioSettingsInitialize() {
    const optionsContext = getOptionsContext();
    const options = await apiOptionsGet(optionsContext);
    audioSourceUI = new AudioSourceUI.Container(options.audio.sources, $('.audio-source-list'), $('.audio-source-add'));
    audioSourceUI.save = () => apiOptionsSave();

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

function compareLanguageTags(a, b) {
    if (a.substr(0, 3) === 'ja-') {
        return (b.substr(0, 3) === 'ja-') ? 0 : -1;
    } else {
        return (b.substr(0, 3) === 'ja-') ? 1 : 0;
    }
}

function textToSpeechVoiceCompare(a, b) {
    const i = compareLanguageTags(a.voice.lang, b.voice.lang);
    if (i !== 0) { return i; }

    if (a.voice.default) {
        if (!b.voice.default) {
            return -1;
        }
    } else if (b.voice.default) {
        return 1;
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


/*
 * Remote options updates
 */

function settingsGetSource() {
    return new Promise((resolve) => {
        chrome.tabs.getCurrent((tab) => resolve(`settings${tab ? tab.id : ''}`));
    });
}

async function settingsSaveOptions() {
    const source = await settingsGetSource();
    await apiOptionsSave(source);
}

async function onOptionsUpdate({source}) {
    const thisSource = await settingsGetSource();
    if (source === thisSource) { return; }

    const optionsContext = getOptionsContext();
    const options = await apiOptionsGet(optionsContext);
    await formWrite(options);
}

function onMessage({action, params}) {
    if (action === 'optionsUpdate') {
        onOptionsUpdate(params);
    }
}


/*
 * Dictionary
 */

function dictionaryErrorToString(error) {
    if (error.toString) {
        error = error.toString();
    } else {
        error = `${error}`;
    }

    for (const [match, subst] of dictionaryErrorToString.overrides) {
        if (error.includes(match)) {
            error = subst;
            break;
        }
    }

    return error;
}
dictionaryErrorToString.overrides = [
    [
        'A mutation operation was attempted on a database that did not allow mutations.',
        'Access to IndexedDB appears to be restricted. Firefox seems to require that the history preference is set to "Remember history" before IndexedDB use of any kind is allowed.'
    ],
    [
        'The operation failed for reasons unrelated to the database itself and not covered by any other error code.',
        'Unable to access IndexedDB due to a possibly corrupt user profile. Try using the "Refresh Firefox" feature to reset your user profile.'
    ],
    [
        'BulkError',
        'Unable to finish importing dictionary data into IndexedDB. This may indicate that you do not have sufficient disk space available to complete this operation.'
    ]
];

function dictionaryErrorsShow(errors) {
    const dialog = $('#dict-error');
    dialog.show().text('');

    if (errors !== null && errors.length > 0) {
        const uniqueErrors = {};
        for (let e of errors) {
            e = dictionaryErrorToString(e);
            uniqueErrors[e] = uniqueErrors.hasOwnProperty(e) ? uniqueErrors[e] + 1 : 1;
        }

        for (const e in uniqueErrors) {
            const count = uniqueErrors[e];
            const div = document.createElement('p');
            if (count > 1) {
                div.textContent = `${e} `;
                const em = document.createElement('em');
                em.textContent = `(${count})`;
                div.appendChild(em);
            } else {
                div.textContent = `${e}`;
            }
            dialog.append($(div));
        }

        dialog.show();
    } else {
        dialog.hide();
    }
}

function dictionarySpinnerShow(show) {
    const spinner = $('#dict-spinner');
    if (show) {
        spinner.show();
    } else {
        spinner.hide();
    }
}

function dictionaryGroupsSort() {
    const dictGroups = $('#dict-groups');
    const dictGroupChildren = dictGroups.children('.dict-group').sort((ca, cb) => {
        const pa = parseInt($(ca).find('.dict-priority').val(), 10);
        const pb = parseInt($(cb).find('.dict-priority').val(), 10);
        if (pa < pb) {
            return 1;
        } else if (pa > pb) {
            return -1;
        } else {
            return 0;
        }
    });

    dictGroups.append(dictGroupChildren);
}

async function dictionaryGroupsPopulate(options) {
    const dictGroups = $('#dict-groups').empty();
    const dictWarning = $('#dict-warning').hide();

    const dictRows = toIterable(await utilDatabaseSummarize());
    if (dictRows.length === 0) {
        dictWarning.show();
    }

    for (const dictRow of toIterable(dictRowsSort(dictRows, options))) {
        const dictOptions = options.dictionaries[dictRow.title] || {
            enabled: false,
            priority: 0,
            allowSecondarySearches: false
        };

        const dictHtml = await apiTemplateRender('dictionary.html', {
            enabled: dictOptions.enabled,
            priority: dictOptions.priority,
            allowSecondarySearches: dictOptions.allowSecondarySearches,
            title: dictRow.title,
            version: dictRow.version,
            revision: dictRow.revision,
            outdated: dictRow.version < 3
        });

        dictGroups.append($(dictHtml));
    }

    formUpdateVisibility(options);

    $('.dict-enabled, .dict-priority, .dict-allow-secondary-searches').change(e => {
        dictionaryGroupsSort();
        onFormOptionsChanged(e);
    });
}

async function onDictionaryPurge(e) {
    e.preventDefault();

    const dictControls = $('#dict-importer, #dict-groups, #dict-main-group').hide();
    const dictProgress = $('#dict-purge').show();

    try {
        dictionaryErrorsShow(null);
        dictionarySpinnerShow(true);

        await utilDatabasePurge();
        for (const options of toIterable(await getOptionsArray())) {
            options.dictionaries = utilBackgroundIsolate({});
            options.general.mainDictionary = '';
        }
        await settingsSaveOptions();

        const optionsContext = getOptionsContext();
        const options = await apiOptionsGet(optionsContext);
        await dictionaryGroupsPopulate(options);
        await formMainDictionaryOptionsPopulate(options);
    } catch (e) {
        dictionaryErrorsShow([e]);
    } finally {
        dictionarySpinnerShow(false);

        dictControls.show();
        dictProgress.hide();

        if (storageEstimate.mostRecent !== null) {
            storageUpdateStats();
        }
    }
}

function onDictionaryImportButtonClick() {
    const dictFile = document.querySelector('#dict-file');
    dictFile.click();
}

async function onDictionaryImport(e) {
    const dictFile = $('#dict-file');
    const dictControls = $('#dict-importer').hide();
    const dictProgress = $('#dict-import-progress').show();

    try {
        dictionaryErrorsShow(null);
        dictionarySpinnerShow(true);

        const setProgress = percent => dictProgress.find('.progress-bar').css('width', `${percent}%`);
        const updateProgress = (total, current) => {
            setProgress(current / total * 100.0);
            if (storageEstimate.mostRecent !== null && !storageUpdateStats.isUpdating) {
                storageUpdateStats();
            }
        };
        setProgress(0.0);

        const exceptions = [];
        const summary = await utilDatabaseImport(e.target.files[0], updateProgress, exceptions);
        for (const options of toIterable(await getOptionsArray())) {
            options.dictionaries[summary.title] = utilBackgroundIsolate({
                enabled: true,
                priority: 0,
                allowSecondarySearches: false
            });
            if (summary.sequenced && options.general.mainDictionary === '') {
                options.general.mainDictionary = summary.title;
            }
        }
        await settingsSaveOptions();

        if (exceptions.length > 0) {
            exceptions.push(`Dictionary may not have been imported properly: ${exceptions.length} error${exceptions.length === 1 ? '' : 's'} reported.`);
            dictionaryErrorsShow(exceptions);
        }

        const optionsContext = getOptionsContext();
        const options = await apiOptionsGet(optionsContext);
        await dictionaryGroupsPopulate(options);
        await formMainDictionaryOptionsPopulate(options);
    } catch (e) {
        dictionaryErrorsShow([e]);
    } finally {
        dictionarySpinnerShow(false);

        dictFile.val('');
        dictControls.show();
        dictProgress.hide();
    }
}


/*
 * Anki
 */

function ankiSpinnerShow(show) {
    const spinner = $('#anki-spinner');
    if (show) {
        spinner.show();
    } else {
        spinner.hide();
    }
}

function ankiErrorShow(error) {
    const dialog = $('#anki-error');
    if (error) {
        dialog.show().text(error);
    }
    else {
        dialog.hide();
    }
}

function ankiErrorShown() {
    return $('#anki-error').is(':visible');
}

function ankiFieldsToDict(selection) {
    const result = {};
    selection.each((index, element) => {
        result[$(element).data('field')] = $(element).val();
    });

    return result;
}

async function ankiDeckAndModelPopulate(options) {
    const ankiFormat = $('#anki-format').hide();

    const deckNames = await utilAnkiGetDeckNames();
    const ankiDeck = $('.anki-deck');
    ankiDeck.find('option').remove();
    deckNames.sort().forEach(name => ankiDeck.append($('<option/>', {value: name, text: name})));

    const modelNames = await utilAnkiGetModelNames();
    const ankiModel = $('.anki-model');
    ankiModel.find('option').remove();
    modelNames.sort().forEach(name => ankiModel.append($('<option/>', {value: name, text: name})));

    $('#anki-terms-deck').val(options.anki.terms.deck);
    await ankiFieldsPopulate($('#anki-terms-model').val(options.anki.terms.model), options);

    $('#anki-kanji-deck').val(options.anki.kanji.deck);
    await ankiFieldsPopulate($('#anki-kanji-model').val(options.anki.kanji.model), options);

    ankiFormat.show();
}

async function ankiFieldsPopulate(element, options) {
    const modelName = element.val();
    if (!modelName) {
        return;
    }

    const tab = element.closest('.tab-pane');
    const tabId = tab.attr('id');
    const container = tab.find('tbody').empty();

    const markers = {
        'terms': [
            'audio',
            'cloze-body',
            'cloze-prefix',
            'cloze-suffix',
            'dictionary',
            'expression',
            'furigana',
            'furigana-plain',
            'glossary',
            'glossary-brief',
            'reading',
            'screenshot',
            'sentence',
            'tags',
            'url'
        ],
        'kanji': [
            'character',
            'dictionary',
            'glossary',
            'kunyomi',
            'onyomi',
            'screenshot',
            'sentence',
            'tags',
            'url'
        ]
    }[tabId] || {};

    for (const name of await utilAnkiGetModelFieldNames(modelName)) {
        const value = options.anki[tabId].fields[name] || '';
        const html = Handlebars.templates['model.html']({name, markers, value});
        container.append($(html));
    }

    tab.find('.anki-field-value').change(utilAsync(onFormOptionsChanged));
    tab.find('.marker-link').click(onAnkiMarkerClicked);
}

function onAnkiMarkerClicked(e) {
    e.preventDefault();
    const link = e.target;
    $(link).closest('.input-group').find('.anki-field-value').val(`{${link.text}}`).trigger('change');
}

async function onAnkiModelChanged(e) {
    try {
        if (!e.originalEvent) {
            return;
        }

        const element = $(this);
        const tab = element.closest('.tab-pane');
        const tabId = tab.attr('id');

        const optionsContext = getOptionsContext();
        const options = await apiOptionsGet(optionsContext);
        await formRead(options);
        options.anki[tabId].fields = utilBackgroundIsolate({});
        await settingsSaveOptions();

        ankiSpinnerShow(true);
        await ankiFieldsPopulate(element, options);
        ankiErrorShow();
    } catch (e) {
        ankiErrorShow(e);
    } finally {
        ankiSpinnerShow(false);
    }
}

async function onAnkiFieldTemplatesReset(e) {
    try {
        e.preventDefault();
        const optionsContext = getOptionsContext();
        const options = await apiOptionsGet(optionsContext);
        const fieldTemplates = profileOptionsGetDefaultFieldTemplates();
        options.anki.fieldTemplates = fieldTemplates;
        $('#field-templates').val(fieldTemplates);
        await settingsSaveOptions();
    } catch (e) {
        ankiErrorShow(e);
    }
}


/*
 * Storage
 */

async function getBrowser() {
    if (EXTENSION_IS_BROWSER_EDGE) {
        return 'edge';
    }
    if (typeof browser !== 'undefined') {
        try {
            const info = await browser.runtime.getBrowserInfo();
            if (info.name === 'Fennec') {
                return 'firefox-mobile';
            }
        } catch (e) { }
        return 'firefox';
    } else {
        return 'chrome';
    }
}

function storageBytesToLabeledString(size) {
    const base = 1000;
    const labels = [' bytes', 'KB', 'MB', 'GB'];
    let labelIndex = 0;
    while (size >= base) {
        size /= base;
        ++labelIndex;
    }
    const label = labelIndex === 0 ? `${size}` : size.toFixed(1);
    return `${label}${labels[labelIndex]}`;
}

async function storageEstimate() {
    try {
        return (storageEstimate.mostRecent = await navigator.storage.estimate());
    } catch (e) { }
    return null;
}
storageEstimate.mostRecent = null;

async function isStoragePeristent() {
    try {
        return await navigator.storage.persisted();
    } catch (e) { }
    return false;
}

async function storageInfoInitialize() {
    storagePersistInitialize();
    const browser = await getBrowser();
    const container = document.querySelector('#storage-info');
    container.setAttribute('data-browser', browser);

    await storageShowInfo();

    document.querySelector('#storage-refresh').addEventListener('click', () => storageShowInfo(), false);
}

async function storageUpdateStats() {
    storageUpdateStats.isUpdating = true;

    const estimate = await storageEstimate();
    const valid = (estimate !== null);

    if (valid) {
        // Firefox reports usage as 0 when persistent storage is enabled.
        const finite = (estimate.usage > 0 || !(await isStoragePeristent()));
        if (finite) {
            document.querySelector('#storage-usage').textContent = storageBytesToLabeledString(estimate.usage);
            document.querySelector('#storage-quota').textContent = storageBytesToLabeledString(estimate.quota);
        }
        document.querySelector('#storage-use-finite').classList.toggle('storage-hidden', !finite);
        document.querySelector('#storage-use-infinite').classList.toggle('storage-hidden', finite);
    }

    storageUpdateStats.isUpdating = false;
    return valid;
}
storageUpdateStats.isUpdating = false;

async function storageShowInfo() {
    storageSpinnerShow(true);

    const valid = await storageUpdateStats();
    document.querySelector('#storage-use').classList.toggle('storage-hidden', !valid);
    document.querySelector('#storage-error').classList.toggle('storage-hidden', valid);

    storageSpinnerShow(false);
}

function storageSpinnerShow(show) {
    const spinner = $('#storage-spinner');
    if (show) {
        spinner.show();
    } else {
        spinner.hide();
    }
}

async function storagePersistInitialize() {
    if (!(navigator.storage && navigator.storage.persist)) {
        // Not supported
        return;
    }

    const info = document.querySelector('#storage-persist-info');
    const button = document.querySelector('#storage-persist-button');
    const checkbox = document.querySelector('#storage-persist-button-checkbox');

    info.classList.remove('storage-hidden');
    button.classList.remove('storage-hidden');

    let persisted = await isStoragePeristent();
    if (persisted) {
        checkbox.checked = true;
    }

    button.addEventListener('click', async () => {
        if (persisted) {
            return;
        }
        if (await navigator.storage.persist()) {
            persisted = true;
            checkbox.checked = true;
            storageShowInfo();
        }
    }, false);
}


/*
 * Information
 */

function showExtensionInformation() {
    const node = document.getElementById('extension-info');
    if (node === null) { return; }

    const manifest = chrome.runtime.getManifest();
    node.textContent = `${manifest.name} v${manifest.version}`;
}
