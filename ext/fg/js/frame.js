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

class FrameContext {
    constructor() {
        this.definitions = [];
        this.audio = {};

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

        this.definitions = definitions;
        this.showSpinner(false);

        renderText(context, 'term-list.html').then(content => {
            $('.content').html(content);

            $('.kanji-link').click(e => {
                e.preventDefault();
                findKanji($(e.target).text()).then(defs => this.api_showKanjiDefs({options, definitions: defs}));
            });

            $('.action-play-audio').click(e => {
                e.preventDefault();
                const index = $(e.currentTarget).data('index');
                this.playAudio(this.definitions[index]);
            });

            $('.action-add-note').click(e => {
                e.preventDefault();
                this.showSpinner(true);

                const link = $(e.currentTarget);
                const index = link.data('index');
                const mode = link.data('mode');

                addDefinition(this.definitions[index], mode).then(success => {
                    if (success) {
                        const button = this.getAddButton(index, mode);
                        button.addClass('disabled');
                    } else {
                        window.alert('Note could not be added');
                    }
                }).catch(error => {
                    window.alert('Error: ' + error);
                }).then(() => {
                    this.showSpinner(false);
                });
            });

            canAddDefinitions(definitions, ['term_kanji', 'term_kana']).then(states => {
                if (states === null) {
                    return;
                }

                states.forEach((state, index) => {
                    for (const mode in state) {
                        const button = this.getAddButton(index, mode);
                        if (state[mode]) {
                            button.removeClass('disabled');
                        } else {
                            button.addClass('disabled');
                        }

                        button.removeClass('pending');
                    }
                });
            });
        });
    }

    api_showKanjiDefs({definitions, options}) {
        const context = {
            definitions,
            addable: options.ankiMethod !== 'disabled'
        };

        this.definitions = definitions;
        this.showSpinner(false);

        renderText(context, 'kanji-list.html').then(content => {
            $('.content').html(content);
        });
    }

    getAddButton(index, mode) {
        return $(`.action-add-note[data-index="${index}"][data-mode="${mode}"]`);
    }

    showSpinner(show) {
        const spinner = document.querySelector('.spinner');
        spinner.style.visibility = show ? 'visible' : 'hidden';
    }

    playAudio(definition) {
        let url = `https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?kanji=${encodeURIComponent(definition.expression)}`;
        if (definition.reading) {
            url += `&kana=${encodeURIComponent(definition.reading)}`;
        }

        for (const key in this.audio) {
            this.audio[key].pause();
        }

        const audio = this.audio[url] || new Audio(url);
        audio.currentTime = 0;
        audio.play();

        this.audio[url] = audio;
    }
}

window.frameContext = new FrameContext();
