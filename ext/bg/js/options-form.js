/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
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


function optionsToForm(opts) {
    $('#enableAnkiConnect').prop('checked', opts.enableAnkiConnect);
    $('#selectMatchedText').prop('checked', opts.selectMatchedText);
    $('#loadOnStartup').prop('checked', opts.loadOnStartup);
    $('#scanLength').val(opts.scanLength);
}

function formToOptions() {
    return sanitizeOptions({
        loadOnStartup:     $('#loadOnStartup').prop('checked'),
        selectMatchedText: $('#selectMatchedText').prop('checked'),
        enableAnkiConnect: $('#enableAnkiConnect').prop('checked'),
        scanLength:        $('#scanLength').val()
    });
}

$('#saveOptions').click(() => {
    const opts = formToOptions();
    saveOptions(opts, () => {
        $('.notifyAlerts').hide();
        $('#notifySave').slideDown();
        chrome.extension.getBackgroundPage().yomichan.updateOptions(opts);
    });
});

$('#resetOptions').click(() => {
    optionsToForm(sanitizeOptions({}));
    $('.notifyAlerts').hide();
    $('#notifyReset').slideDown();
});

$('[data-hide]').on('click', function() {
    $('#' + $(this).attr('data-hide')).hide();
});

$(document).ready(() => loadOptions((opts) => optionsToForm(opts)));
