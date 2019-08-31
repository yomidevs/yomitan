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

        this.dependencies = {};

        $(document).keydown(this.onKeyDown.bind(this));
        $(document).on('wheel', this.onWheel.bind(this));
    }

    onError(error) {
        throw 'Override me';
    }

    onSearchClear() {
        throw 'Override me';
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
                    index: Display.entryIndexFind(link),
                    scroll: $('html,body').scrollTop()
                }
            };

            if (this.context) {
                context.sentence = this.context.sentence;
                context.url = this.context.url;
                context.source.source = this.context.source;
            }

            const kanjiDefs = await apiKanjiFind(link.text());
            this.kanjiShow(kanjiDefs, this.options, context);
        } catch (e) {
            this.onError(e);
        }
    }

    async onTermLookup(e) {
        try {
            e.preventDefault();

            const {docRangeFromPoint, docSentenceExtract} = this.dependencies;

            const clickedElement = $(e.target);
            const textSource = docRangeFromPoint({x: e.clientX, y: e.clientY});
            if (textSource === null) {
                return false;
            }

            let definitions, length, sentence;
            try {
                textSource.setEndOffset(this.options.scanning.length);

                ({definitions, length} = await apiTermsFind(textSource.text()));
                if (definitions.length === 0) {
                    return false;
                }

                textSource.setEndOffset(length);

                sentence = docSentenceExtract(textSource, this.options.anki.sentenceExt);
            } finally {
                textSource.cleanup();
            }

            const context = {
                source: {
                    definitions: this.definitions,
                    index: Display.entryIndexFind(clickedElement),
                    scroll: $('html,body').scrollTop()
                }
            };

            if (this.context) {
                context.sentence = sentence;
                context.url = this.context.url;
                context.source.source = this.context.source;
            }

            this.termsShow(definitions, this.options, context);
        } catch (e) {
            this.onError(e);
        }
    }

    onAudioPlay(e) {
        e.preventDefault();
        const link = $(e.currentTarget);
        const definitionIndex = Display.entryIndexFind(link);
        const expressionIndex = link.closest('.entry').find('.expression .action-play-audio').index(link);
        this.audioPlay(this.definitions[definitionIndex], expressionIndex);
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
                    this.entryScrollIntoView(this.index - 3, null, true);
                    return true;
                }
            },

            34: /* page down */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index + 3, null, true);
                    return true;
                }
            },

            35: /* end */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.definitions.length - 1, null, true);
                    return true;
                }
            },

            36: /* home */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(0, null, true);
                    return true;
                }
            },

            38: /* up */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index - 1, null, true);
                    return true;
                }
            },

            40: /* down */ () => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index + 1, null, true);
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
                        this.audioPlay(this.definitions[this.index], this.firstExpressionIndex);
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

    onWheel(e) {
        const event = e.originalEvent;
        const handler = () => {
            if (event.altKey) {
                if (event.deltaY < 0) { // scroll up
                    this.entryScrollIntoView(this.index - 1, null, true);
                    return true;
                } else if (event.deltaY > 0) { // scroll down
                    this.entryScrollIntoView(this.index + 1, null, true);
                    return true;
                }
            }
        };

        if (handler()) {
            event.preventDefault();
        }
    }

    async termsShow(definitions, options, context) {
        try {
            if (!context || context.focus !== false) {
                window.focus();
            }

            this.definitions = definitions;
            this.options = options;
            this.context = context;

            const sequence = ++this.sequence;
            const params = {
                definitions,
                source: context && context.source,
                addable: options.anki.enable,
                grouped: options.general.resultOutputMode === 'group',
                merged: options.general.resultOutputMode === 'merge',
                playback: options.general.audioSource !== 'disabled',
                compactGlossaries: options.general.compactGlossaries,
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
            const {index, scroll} = context || {};
            this.entryScrollIntoView(index || 0, scroll);

            if (this.options.general.autoPlayAudio && this.options.general.audioSource !== 'disabled') {
                this.autoPlayAudio();
            }

            $('.action-add-note').click(this.onNoteAdd.bind(this));
            $('.action-view-note').click(this.onNoteView.bind(this));
            $('.action-play-audio').click(this.onAudioPlay.bind(this));
            $('.kanji-link').click(this.onKanjiLookup.bind(this));
            $('.source-term').click(this.onSourceTermView.bind(this));
            $('.glossary-item').click(this.onTermLookup.bind(this));

            await this.adderButtonUpdate(['term-kanji', 'term-kana'], sequence);
        } catch (e) {
            this.onError(e);
        }
    }

    async kanjiShow(definitions, options, context) {
        try {
            if (!context || context.focus !== false) {
                window.focus();
            }

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
            const {index, scroll} = context || {};
            this.entryScrollIntoView(index || 0, scroll);

            $('.action-add-note').click(this.onNoteAdd.bind(this));
            $('.action-view-note').click(this.onNoteView.bind(this));
            $('.source-term').click(this.onSourceTermView.bind(this));

            await this.adderButtonUpdate(['kanji'], sequence);
        } catch (e) {
            this.onError(e);
        }
    }

    autoPlayAudio() {
        this.audioPlay(this.definitions[0], this.firstExpressionIndex);
    }

    async adderButtonUpdate(modes, sequence) {
        try {
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
        }
    }

    entryScrollIntoView(index, scroll, smooth) {
        index = Math.min(index, this.definitions.length - 1);
        index = Math.max(index, 0);

        $('.current').hide().eq(index).show();

        const container = $('html,body').stop();
        const entry = $('.entry').eq(index);
        let target;

        if (scroll) {
            target = scroll;
        } else {
            target = index === 0 ? 0 : entry.offset().top;
        }

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
                index: this.context.source.index,
                scroll: this.context.source.scroll,
                source: this.context.source.source
            };

            this.termsShow(this.context.source.definitions, this.options, context);
        }
    }

    async noteAdd(definition, mode) {
        try {
            this.spinner.show();

            const context = {};
            if (this.noteUsesScreenshot()) {
                const screenshot = await this.getScreenshot();
                if (screenshot) {
                    context.screenshot = screenshot;
                }
            }

            const noteId = await apiDefinitionAdd(definition, mode, context);
            if (noteId) {
                const index = this.definitions.indexOf(definition);
                Display.adderButtonFind(index, mode).addClass('disabled');
                Display.viewerButtonFind(index).removeClass('pending disabled').data('noteId', noteId);
            } else {
                throw 'Note could note be added';
            }
        } catch (e) {
            this.onError(e);
        } finally {
            this.spinner.hide();
        }
    }

    async audioPlay(definition, expressionIndex) {
        try {
            this.spinner.show();

            const expression = expressionIndex === -1 ? definition : definition.expressions[expressionIndex];
            let url = await apiAudioGetUrl(expression, this.options.general.audioSource);
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

    noteUsesScreenshot() {
        const fields = this.options.anki.terms.fields;
        for (const name in fields) {
            if (fields[name].includes('{screenshot}')) {
                return true;
            }
        }
        return false;
    }

    async getScreenshot() {
        try {
            await this.setPopupVisible(false);
            await Display.delay(1); // Wait for popup to be hidden.

            const {format, quality} = this.options.anki.screenshot;
            const dataUrl = await apiScreenshotGet({format, quality});
            if (!dataUrl || dataUrl.error) { return; }

            return {dataUrl, format};
        } finally {
            await this.setPopupVisible(true);
        }
    }

    get firstExpressionIndex() {
        return this.options.general.resultOutputMode === 'merge' ? 0 : -1;
    }

    setPopupVisible(visible) {
        return apiForward('popupSetVisible', {visible});
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

    static delay(time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }
}
