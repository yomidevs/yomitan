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


function registerKanjiLinks() {
    for (let link of [].slice.call(document.getElementsByClassName('kanji-link'))) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.parent.postMessage({action: 'displayKanji', params: e.target.innerHTML}, '*');
        });
    }
}

function registerAddNoteLinks() {
    for (let link of [].slice.call(document.getElementsByClassName('action-add-note'))) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const ds = e.currentTarget.dataset;
            window.parent.postMessage({action: 'addNote', params: {index: ds.index, mode: ds.mode}}, '*');
        });
    }
}

function registerAudioLinks() {
    for (let link of [].slice.call(document.getElementsByClassName('action-play-audio'))) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const ds = e.currentTarget.dataset;
            window.parent.postMessage({action: 'playAudio', params: ds.index}, '*');
        });
    }
}

function onDomContentLoaded() {
    registerKanjiLinks();
    registerAddNoteLinks();
    registerAudioLinks();
}

function onMessage(e) {
    const {action, params} = e.data, method = window['api_' + action];
    if (typeof(method) === 'function') {
        method(params);
    }
}

function api_setActionState({index, state, sequence}) {
    for (let mode in state) {
        const matches = document.querySelectorAll(`.action-bar[data-sequence="${sequence}"] .action-add-note[data-index="${index}"][data-mode="${mode}"]`);
        if (matches.length === 0) {
            return;
        }

        const classes = matches[0].classList;
        if (state[mode]) {
            classes.remove('disabled');
        } else {
            classes.add('disabled');
        }
    }
}

document.addEventListener('DOMContentLoaded', onDomContentLoaded, false);
window.addEventListener('message', onMessage);
