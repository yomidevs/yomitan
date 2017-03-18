/*
 * Copyright (C) 2017  Alex Yatskov <alex@foosoft.net>
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


$(document).ready(() => {
    $('#open-search').click(() => commandExec('search'));
    $('#open-options').click(() => chrome.runtime.openOptionsPage());
    $('#open-help').click(() => window.open('http://foosoft.net/projects/yomichan'));

    optionsLoad().then(options => {
        const toggle = $('#enable-search');
        toggle.prop('checked', options.general.enable).change();
        toggle.bootstrapToggle();
        toggle.change(() => commandExec('toggle'));
    });
});
