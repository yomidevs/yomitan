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
        this.audioCache = {};
        this.sequence = 0;
        this.index = 0;

        $(document).keydown(this.onKeyDown.bind(this));
    }

    definitionAdd(definition, mode) {
        throw 'override me';
    }

    definitionsAddable(definitions, modes) {
        throw 'override me';
    }

    templateRender(template, data) {
        throw 'override me';
    }

    kanjiFind(character) {
        throw 'override me';
    }

    handleError(error) {
        throw 'override me';
    }

    showTermDefs(definitions, options, context) {
        window.focus();

        this.spinner.hide();
        this.definitions = definitions;

        const sequence = ++this.sequence;
        const params = {
            definitions,
            addable: options.anki.enable,
            grouped: options.general.groupResults,
            playback: options.general.audioPlayback
        };

        if (context) {
            for (const definition of definitions) {
                definition.sentence = context.sentence || '';
                definition.url = context.url || '';
            }
        }

        this.templateRender('terms.html', params).then(content => {
            this.container.html(content);

            const index = context && context.hasOwnProperty('index') ? context.index : 0;
            this.entryScroll(index);

            $('.action-add-note').click(this.onActionAddNote.bind(this));
            $('.action-play-audio').click(e => {
                e.preventDefault();
                const index = Display.entryIndexFind($(e.currentTarget));
                Display.audioPlay(this.definitions[index], this.audioCache);
            });
            $('.kanji-link').click(e => {
                e.preventDefault();

                const link = $(e.target);
                context = context || {};
                context.source = {
                    definitions,
                    index: Display.entryIndexFind(link)
                };

                this.kanjiFind(link.text()).then(kanjiDefs => {
                    this.showKanjiDefs(kanjiDefs, options, context);
                }).catch(this.handleError.bind(this));
            });

            return this.adderButtonsUpdate(['term-kanji', 'term-kana'], sequence);
        }).catch(this.handleError.bind(this));
    }

    showKanjiDefs(definitions, options, context) {
        window.focus();

        this.spinner.hide();
        this.definitions = definitions;

        const sequence = ++this.sequence;
        const params = {
            definitions,
            source: context && context.source,
            addable: options.anki.enable
        };

        if (context) {
            for (const definition of definitions) {
                definition.sentence = context.sentence || '';
                definition.url = context.url || '';
            }
        }

        this.templateRender('kanji.html', params).then(content => {
            this.container.html(content);

            const index = context && context.hasOwnProperty('index') ? context.index : 0;
            this.entryScroll(index);

            $('.action-add-note').click(this.onActionAddNote.bind(this));
            $('.source-term').click(e => {
                e.preventDefault();

                if (context && context.source) {
                    context.index = context.source.index;
                    this.showTermDefs(context.source.definitions, options, context);
                }
            });

            return this.adderButtonsUpdate(['kanji'], sequence);
        }).catch(this.handleError.bind(this));
    }

    adderButtonsUpdate(modes, sequence) {
        return this.definitionsAddable(this.definitions, modes).then(states => {
            if (states === null || sequence !== this.sequence) {
                return;
            }

            states.forEach((state, index) => {
                for (const mode in state) {
                    const button = Display.adderButtonFind(index, mode);
                    if (state[mode]) {
                        button.removeClass('disabled');
                    } else {
                        button.addClass('disabled');
                    }

                    button.removeClass('pending');
                }
            });
        });
    }

    entryScroll(index, smooth) {
        if (index < 0 || index >= this.definitions.length) {
            return;
        }

        $('.current').hide().eq(index).show();

        const body = $('body').stop();
        const entry = $('.entry').eq(index);
        const target = index === 0 ? 0 : entry.offset().top;

        if (smooth) {
            body.animate({scrollTop: target}, 200);
        } else {
            body.scrollTop(target);
        }

        this.index = index;
    }

    onActionAddNote(e) {
        e.preventDefault();
        this.spinner.show();

        const link = $(e.currentTarget);
        const mode = link.data('mode');
        const index = Display.entryIndexFind(link);
        const definition = this.definitions[index];

        if (mode !== 'kanji') {
            const url = Display.audioBuildUrl(definition);
            const filename = Display.audioBuildFilename(definition);
            if (url && filename) {
                definition.audio = {url, filename};
            }
        }

        this.definitionAdd(definition, mode).then(success => {
            if (success) {
                Display.adderButtonFind(index, mode).addClass('disabled');
            } else {
                this.handleError('note could not be added');
            }
        }).catch(this.handleError.bind(this)).then(() => this.spinner.hide());
    }

    onKeyDown(e) {
        if (e.keyCode === 36 /* home */) {
            e.preventDefault();
            this.entryScroll(0, true);
        } else if (e.keyCode === 35 /* end */) {
            e.preventDefault();
            this.entryScroll(this.definitions.length - 1, true);
        } if (e.keyCode === 38 /* up */) {
            e.preventDefault();
            this.entryScroll(this.index - 1, true);
        } else if (e.keyCode === 40 /* down */) {
            e.preventDefault();
            this.entryScroll(this.index + 1, true);
        }
    }

    static audioPlay(definition, cache) {
        for (const key in cache) {
            const audio = cache[key];
            if (audio !== null) {
                audio.pause();
            }
        }

        const url = Display.audioBuildUrl(definition);
        if (!url) {
            return;
        }

        let audio = cache[url];
        if (audio) {
            audio.currentTime = 0;
            audio.play();
        } else {
            audio = new Audio(url);
            audio.onloadeddata = () => {
                if (audio.duration === 5.694694 || audio.duration === 5.720718) {
                    audio = new Audio('/mixed/mp3/button.mp3');
                }

                cache[url] = audio;
                audio.play();
            };
        }
    }

    static entryIndexFind(element) {
        return $('.entry').index(element.closest('.entry'));
    }

    static adderButtonFind(index, mode) {
        return $('.entry').eq(index).find(`.action-add-note[data-mode="${mode}"]`);
    }

    static audioBuildUrl(definition) {
        let kana = definition.reading;
        let kanji = definition.expression;

        if (!kana && !kanji) {
            return null;
        }

        if (!kana && wanakana.isHiragana(kanji)) {
            kana = kanji;
            kanji = null;
        }

        const params = [];
        if (kanji) {
            params.push(`kanji=${encodeURIComponent(kanji)}`);
        }
        if (kana) {
            params.push(`kana=${encodeURIComponent(kana)}`);
        }

        return `https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?${params.join('&')}`;
    }

    static audioBuildFilename(definition) {
        if (!definition.reading && !definition.expression) {
            return null;
        }

        let filename = 'yomichan';
        if (definition.reading) {
            filename += `_${definition.reading}`;
        }
        if (definition.expression) {
            filename += `_${definition.expression}`;
        }

        return filename += '.mp3';
    }
}
