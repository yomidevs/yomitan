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


class Frame {
    constructor() {
        this.definitions = [];
        this.audioCache = {};
        this.sequence = 0;

        $(window).on('message', e => {
            const {action, params} = e.originalEvent.data, method = this['api_' + action];
            if (typeof(method) === 'function') {
                method.call(this, params);
            }
        });
    }

    api_showTermDefs({definitions, options, context}) {
        const sequence = ++this.sequence;
        const params = {
            definitions,
            grouped: options.general.groupResults,
            addable: options.anki.enabled,
            playback: options.general.audioPlayback
        };

        definitions.forEach(definition => {
            definition.sentence = context.sentence;
            definition.url = context.url;
        });

        this.definitions = definitions;
        this.showSpinner(false);
        window.scrollTo(0, 0);

        bgTextRender('terms.html', params).then(content => {
            $('#content').html(content);
            $('.action-add-note').click(this.onAddNote.bind(this));

            $('.kanji-link').click(e => {
                e.preventDefault();
                const character = $(e.target).text();
                bgKanjiFind(character).then(definitions => this.api_showKanjiDefs({definitions, options, context}));
            });

            $('.action-play-audio').click(e => {
                e.preventDefault();
                const index = $(e.currentTarget).data('index');
                this.playAudio(this.definitions[index]);
            });

            this.updateAddNoteButtons(['term_kanji', 'term_kana'], sequence);
        }).catch(error => {
            this.handleError(error);
        });
    }

    api_showKanjiDefs({definitions, options, context}) {
        const sequence = ++this.sequence;
        const params = {
            definitions,
            addable: options.anki.enabled
        };

        definitions.forEach(definition => {
            definition.sentence = context.sentence;
            definition.url = context.url;
        });

        this.definitions = definitions;
        this.showSpinner(false);
        window.scrollTo(0, 0);

        bgTextRender('kanji.html', params).then(content => {
            $('#content').html(content);
            $('.action-add-note').click(this.onAddNote.bind(this));

            this.updateAddNoteButtons(['kanji'], sequence);
        }).catch(error => {
            this.handleError(error);
        });
    }

    api_showOrphaned() {
        $('#content').hide();
        $('#orphan').show();
    }

    findAddNoteButton(index, mode) {
        return $(`.action-add-note[data-index="${index}"][data-mode="${mode}"]`);
    }

    onAddNote(e) {
        e.preventDefault();
        this.showSpinner(true);

        const link = $(e.currentTarget);
        const index = link.data('index');
        const mode = link.data('mode');

        const definition = this.definitions[index];
        if (mode !== 'kanji') {
            const url = audioUrlBuild(definition);
            const filename = audioFilenameBuild(definition);
            if (url && filename) {
                definition.audio = {url, filename};
            }
        }

        bgDefinitionAdd(definition, mode).then(success => {
            if (success) {
                const button = this.findAddNoteButton(index, mode);
                button.addClass('disabled');
            } else {
                errorShow('note could not be added');
            }
        }).catch(error => {
            this.handleError(error);
        }).then(() => {
            this.showSpinner(false);
        });
    }

    updateAddNoteButtons(modes, sequence) {
        bgDefinitionsAddable(this.definitions, modes).then(states => {
            if (states === null) {
                return;
            }

            if (sequence !== this.sequence) {
                return;
            }

            states.forEach((state, index) => {
                for (const mode in state) {
                    const button = this.findAddNoteButton(index, mode);
                    if (state[mode]) {
                        button.removeClass('disabled');
                    } else {
                        button.addClass('disabled');
                    }

                    button.removeClass('pending');
                }
            });
        }).catch(error => {
            this.handleError(error);
        });
    }

    showSpinner(show) {
        const spinner = $('#spinner');
        if (show) {
            spinner.show();
        } else {
            spinner.hide();
        }
    }

    playAudio(definition) {
        for (const key in this.audioCache) {
            const audio = this.audioCache[key];
            if (audio !== null) {
                audio.pause();
            }
        }

        const url = audioUrlBuild(definition);
        if (!url) {
            return;
        }

        let audio = this.audioCache[url];
        if (audio) {
            audio.currentTime = 0;
            audio.play();
        } else {
            audio = new Audio(url);
            audio.onloadeddata = () => {
                if (audio.duration === 5.694694 || audio.duration === 5.720718) {
                    audio = new Audio('mp3/button.mp3');
                }

                this.audioCache[url] = audio;
                audio.play();
            };
        }
    }

    handleError(error) {
        if (window.orphaned) {
            this.api_showOrphaned();
        } else {
            errorShow(error);
        }
    }
}

window.frame = new Frame();
