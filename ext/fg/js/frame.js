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


// function renderText(data, template) {
//     return invokeApiBg('renderText', {data, template});
// }

// function canAddDefinitions(definitions, modes) {
//     return invokeApiBg('canAddDefinitions', {definitions, modes}).catch(() => null);
// }

// function addDefinition(definition, mode) {
//     return invokeApiBg('addDefinition', {definition, mode});
// }

// function invokeApi(action, params, target) {
//     target.postMessage({action, params}, '*');
// }

// function showSpinner(show) {
//     const spinner = document.querySelector('.spinner');
//     spinner.style.visibility = show ? 'visible' : 'hidden';
// }

// function registerKanjiLinks() {
//     for (const link of Array.from(document.getElementsByClassName('kanji-link'))) {
//         link.addEventListener('click', e => {
//             e.preventDefault();
//             invokeApi('displayKanji', e.target.innerHTML, window.parent);
//         });
//     }
// }

// function registerAddNoteLinks() {
//     for (const link of Array.from(document.getElementsByClassName('action-add-note'))) {
//         link.addEventListener('click', e => {
//             e.preventDefault();
//             const ds = e.currentTarget.dataset;
//             invokeApi('addNote', {index: ds.index, mode: ds.mode}, window.parent);
//             showSpinner(true);
//         });
//     }
// }

// function registerAudioLinks() {
//     for (const link of Array.from(document.getElementsByClassName('action-play-audio'))) {
//         link.addEventListener('click', e => {
//             e.preventDefault();
//             const ds = e.currentTarget.dataset;
//             invokeApi('playAudio', ds.index, window.parent);
//         });
//     }
// }

// function api_setActionState({index, state, sequence}) {
//     for (const mode in state) {
//         const matches = document.querySelectorAll(`.action-bar[data-sequence="${sequence}"] .action-add-note[data-index="${index}"][data-mode="${mode}"]`);
//         if (matches.length === 0) {
//             return;
//         }

//         const classes = matches[0].classList;
//         if (state[mode]) {
//             classes.remove('disabled');
//         } else {
//             classes.add('disabled');
//         }

//         classes.remove('pending');
//     }
// }

class FrameContext {
    constructor() {
        $(window).on('message', e => {
            const {action, params} = e.originalEvent.data, method = this['api_' + action];
            if (typeof(method) === 'function') {
                method.call(this, params);
            }
        });
    }

    api_showTermDefs({definitions, options}) {
        const context = {
            definitions,
            addable: options.ankiMethod !== 'disabled',
            playback: options.enableAudioPlayback
        };

        this.renderText('term-list.html', context).then(content => {
            $('.content').html(content);
        });
    }

    api_showKanjiDefs({definitions, options}) {
        const context = {
            definitions,
            addable: options.ankiMethod !== 'disabled'
        };

        this.renderText('kanji-list.html', context).then(content => {
            $('.content').html(content);
        });
    }

    renderText(template, data) {
        return this.invokeBgApi('renderText', {data, template});
    }

    invokeBgApi(action, params) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({action, params}, ({result, error}) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }
}

window.frameContext = new FrameContext();

    // api_addNote({index, mode}) {
    //     const state = {[mode]: false};
    //     addDefinition(this.definitions[index], mode).then(success => {
    //         if (success) {
    //             this.popup.invokeApi('setActionState', {index, state, sequence: this.sequence});
    //         } else {
    //             alert('Note could not be added');
    //         }

    //         this.popup.invokeApi('addNoteComplete');
    //     }).catch(error => {
    //         alert('Error: ' + error);
    //     });
    // }

    // api_playAudio(index) {
    //     const definition = this.definitions[index];

    //     let url = `https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?kanji=${encodeURIComponent(definition.expression)}`;
    //     if (definition.reading) {
    //         url += `&kana=${encodeURIComponent(definition.reading)}`;
    //     }

    //     for (const key in this.audio) {
    //         this.audio[key].pause();
    //     }

    //     const audio = this.audio[url] || new Audio(url);
    //     audio.currentTime = 0;
    //     audio.play();

    //     this.audio[url] = audio;
    // }
