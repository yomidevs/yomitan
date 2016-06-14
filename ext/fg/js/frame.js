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
    for (const link of [].slice.call(document.getElementsByClassName('kanji-link'))) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.parent.postMessage({action: 'displayKanji', params: e.target.innerHTML}, '*');
        });
    }
}

function registerLearnLinks() {
    for (const link of [].slice.call(document.getElementsByClassName('action-learn'))) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const ds = e.currentTarget.dataset;
            window.parent.postMessage({action: 'addNote', params: {index: ds.index, mode: ds.mode}}, '*');
        });
    }
}

function registerPronounceLinks() {
    for (const link of [].slice.call(document.getElementsByClassName('action-pronounce'))) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const ds = e.currentTarget.dataset;
            window.parent.postMessage({action: 'pronounce', params: ds.index}, '*');
        });
    }
}

function onDomContentLoaded() {
    registerKanjiLinks();
    registerLearnLinks();
    registerPronounceLinks();
}

function onMessage(e) {
    const {action, params} = e.data, method = window['api_' + action];
    if (typeof(method) === 'function') {
        method(params);
    }
}

function api_setActionState({index, state, sequence}) {
    for (const mode in state) {
        const matches = document.querySelectorAll(`.action-learn[data-sequence="${sequence}"][data-index="${index}"][data-mode="${mode}"]`);
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
