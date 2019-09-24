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


$(document).ready(utilAsync(() => {
    $('#open-search').click(() => apiCommandExec('search'));
    $('#open-options').click(() => apiCommandExec('options'));
    $('#open-help').click(() => apiCommandExec('help'));

    const optionsContext = {
        depth: 0,
        url: window.location.href
    };
    apiOptionsGet(optionsContext).then(options => {
        const toggle = $('#enable-search');
        toggle.prop('checked', options.general.enable).change();
        toggle.bootstrapToggle();
        toggle.change(() => apiCommandExec('toggle'));
    });
}));
