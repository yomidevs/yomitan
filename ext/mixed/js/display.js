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


class Display {
    constructor(spinner, container) {
        this.spinner = spinner;
        this.container = container;
        this.definitions = [];
        this.options = null;
        this.context = null;
        this.sequence = 0;
        this.index = 0;
        this.audioCache = {};

        $(document).keydown(this.onKeyDown.bind(this));
    }

    onError(error) {
        throw 'override me';
    }

    onSearchClear() {
        throw 'override me';
    }

    onSourceTermView(e) {
        e.preventDefault();
        this.sourceTermView();
    }

    async onKanjiLookup(e) {
        try {
            e.preventDefault();

            const link = $(e.target);
            const context = {
                source: {
                    definitions: this.definitions,
                    index: Display.entryIndexFind(link)
                }
            };

            if (this.context) {
                context.sentence = this.context.sentence;
                context.url = this.context.url;
            }

            const kanjiDefs = await apiKanjiFind(link.text());
            this.kanjiShow(kanjiDefs, this.options, context);
        } catch (e) {
            this.onError(e);
        }
    }

    onAudioPlay(e) {
        e.preventDefault();
        const index = Display.entryIndexFind($(e.currentTarget));
        this.audioPlay(this.definitions[index]);
    }

    onNoteAdd(e) {
        e.preventDefault();
        const link = $(e.currentTarget);
        const index = Display.entryIndexFind(link);
        this.noteAdd(this.definitions[index], link.data('mode'));
    }

    onNoteView(e) {
        e.preventDefault();
        const link = $(e.currentTarget);
        const index = Display.entryIndexFind(link);
        apiNoteView(link.data('noteId'));
    }

    onKeyDown(e) {
        const noteTryAdd = mode => {
            const button = Display.adderButtonFind(this.index, mode);
            if (button.length !== 0 && !button.hasClass('disabled')) {
                this.noteAdd(this.definitions[this.index], mode);
            }
        };

        const noteTryView = mode => {
            const button = Display.viewerButtonFind(this.index);
            if (button.length !== 0 && !button.hasClass('disabled')) {
                apiNoteView(button.data('noteId'));
            }
        };

        const handlers = {
            27: /* escape */ () => {
                this.onSearchClear();
                return true;
            },

            33: /* page up */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index - 3, true);
                    return true;
                }
            },

            34: /* page down */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index + 3, true);
                    return true;
                }
            },

            35: /* end */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.definitions.length - 1, true);
                    return true;
                }
            },

            36: /* home */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(0, true);
                    return true;
                }
            },

            38: /* up */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index - 1, true);
                    return true;
                }
            },

            40: /* down */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index + 1, true);
                    return true;
                }
            },

            66: /* b */ () => {
                if (e.altKey) {
                    this.sourceTermView();
                    return true;
                }
            },

            69: /* e */ () => {
                if (e.altKey) {
                    noteTryAdd('term-kanji');
                    return true;
                }
            },

            75: /* k */ () => {
                if (e.altKey) {
                    noteTryAdd('kanji');
                    return true;
                }
            },

            82: /* r */ () => {
                if (e.altKey) {
                    noteTryAdd('term-kana');
                    return true;
                }
            },

            80: /* p */ () => {
                if (e.altKey) {
                    if ($('.entry').eq(this.index).data('type') === 'term') {
                        this.audioPlay(this.definitions[this.index]);
                    }

                    return true;
                }
            },

            86: /* v */ () => {
                if (e.altKey) {
                    noteTryView();
                }
            }
        };

        const handler = handlers[e.keyCode];
        if (handler && handler()) {
            e.preventDefault();
        }
    }

    async termsShow(definitions, options, context) {
        try {
            window.focus();

            this.definitions = definitions;
            this.options = options;
            this.context = context;

            const sequence = ++this.sequence;
            const params = {
                definitions,
                addable: options.anki.enable,
                grouped: options.general.groupResults,
                playback: options.general.audioSource !== 'disabled',
                debug: options.general.debugInfo
            };

            if (context) {
                for (const definition of definitions) {
                    if (context.sentence) {
                        definition.cloze = Display.clozeBuild(context.sentence, definition.source);
                    }

                    definition.url = context.url;
                }
            }

            const content = await apiTemplateRender('terms.html', params);
            this.container.html(content);
            this.entryScrollIntoView(context && context.index || 0);

            $('.action-add-note').click(this.onNoteAdd.bind(this));
            $('.action-view-note').click(this.onNoteView.bind(this));
            $('.action-play-audio').click(this.onAudioPlay.bind(this));
            $('.kanji-link').click(this.onKanjiLookup.bind(this));

            await this.adderButtonUpdate(['term-kanji', 'term-kana'], sequence);
        } catch (e) {
            this.onError(e);
        }
    }

    async kanjiShow(definitions, options, context) {
        try {
            window.focus();

            this.definitions = definitions;
            this.options = options;
            this.context = context;

            const sequence = ++this.sequence;
            const params = {
                definitions,
                source: context && context.source,
                addable: options.anki.enable,
                debug: options.general.debugInfo
            };

            if (context) {
                for (const definition of definitions) {
                    if (context.sentence) {
                        definition.cloze = Display.clozeBuild(context.sentence);
                    }

                    definition.url = context.url;
                }
            }

            const content = await apiTemplateRender('kanji.html', params);
            this.container.html(content);
            this.entryScrollIntoView(context && context.index || 0);

            $('.action-add-note').click(this.onNoteAdd.bind(this));
            $('.action-view-note').click(this.onNoteView.bind(this));
            $('.source-term').click(this.onSourceTermView.bind(this));

            await this.adderButtonUpdate(['kanji'], sequence);
        } catch (e) {
            this.onError(e);
        }
    }

    async adderButtonUpdate(modes, sequence) {
        try {
            this.spinner.show();

            const states = await apiDefinitionsAddable(this.definitions, modes);
            if (!states || sequence !== this.sequence) {
                return;
            }

            for (let i = 0; i < states.length; ++i) {
                const state = states[i];
                for (const mode in state) {
                    const button = Display.adderButtonFind(i, mode);
                    if (state[mode]) {
                        button.removeClass('disabled');
                    } else {
                        button.addClass('disabled');
                    }

                    button.removeClass('pending');
                }
            }
        } catch (e) {
            this.onError(e);
        } finally {
            this.spinner.hide();
        }
    }

    entryScrollIntoView(index, smooth) {
        index = Math.min(index, this.definitions.length - 1);
        index = Math.max(index, 0);

        $('.current').hide().eq(index).show();

        const container = $('html,body').stop();
        const entry = $('.entry').eq(index);
        const target = index === 0 ? 0 : entry.offset().top;

        if (smooth) {
            container.animate({scrollTop: target}, 200);
        } else {
            container.scrollTop(target);
        }

        this.index = index;
    }

    sourceTermView() {
        if (this.context && this.context.source) {
            const context = {
                url: this.context.source.url,
                sentence: this.context.source.sentence,
                index: this.context.source.index
            };

            this.termsShow(this.context.source.definitions, this.options, context);
        }
    }

    async noteAdd(definition, mode) {
        try {
            this.spinner.show();

            const noteId = await apiDefinitionAdd(definition, mode);
            if (noteId) {
                const index = this.definitions.indexOf(definition);
                Display.adderButtonFind(index, mode).addClass('disabled');
                Display.viewerButtonFind(index).removeClass('pending disabled').data('noteId', noteId);
            } else {
                throw 'note could note be added';
            }
        } catch (e) {
            this.onError(e);
        } finally {
            this.spinner.hide();
        }
    }

    async audioPlay(definition) {
        try {
            this.spinner.show();

            let url = await apiAudioGetUrl(definition, this.options.general.audioSource);
            if (!url) {
                url = '/mixed/mp3/button.mp3';
            }

            for (const key in this.audioCache) {
                this.audioCache[key].pause();
            }

            let audio = this.audioCache[url];
            if (audio) {
                audio.currentTime = 0;
                audio.volume = this.options.general.audioVolume / 100.0;
                audio.play();
            } else {
                audio = new Audio(url);
                audio.onloadeddata = () => {
                    if (audio.duration === 5.694694 || audio.duration === 5.720718) {
                        audio = new Audio('/mixed/mp3/button.mp3');
                    }

                    this.audioCache[url] = audio;
                    audio.volume = this.options.general.audioVolume / 100.0;
                    audio.play();
                };
            }
        } catch (e) {
            this.onError(e);
        } finally {
            this.spinner.hide();
        }
    }

    static clozeBuild(sentence, source) {
        const result = {
            sentence: sentence.text.trim()
        };

        if (source) {
            result.prefix = sentence.text.substring(0, sentence.offset).trim();
            result.body = source.trim();
            result.suffix = sentence.text.substring(sentence.offset + source.length).trim();
        }

        return result;
    }

    static entryIndexFind(element) {
        return $('.entry').index(element.closest('.entry'));
    }

    static adderButtonFind(index, mode) {
        return $('.entry').eq(index).find(`.action-add-note[data-mode="${mode}"]`);
    }

    static viewerButtonFind(index) {
        return $('.entry').eq(index).find('.action-view-note');
    }
}
