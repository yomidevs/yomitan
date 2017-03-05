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
        const sequence = ++this.sequence;
        const params = {
            definitions,
            grouped: options.general.groupResults,
            playback: options.general.audioPlayback
        };

        if (context) {
            definitions.forEach(definition => {
                definition.sentence = context.sentence;
                definition.url = context.url;
            });
        }

        this.definitions = definitions;
        this.spinner.hide();

        this.templateRender('terms.html', params).then(content => {
            this.container.html(content);
            $('.action-add-note').click(this.onActionAddNote.bind(this));
            $('.action-play-audio').click(this.onActionPlayAudio.bind(this));
            $('.kanji-link').click(e => this.onKanjiSearch(e, options));
            return this.adderButtonsUpdate(['term_kanji', 'term_kana'], sequence);
        }).catch(this.handleError.bind(this));
    }

    showKanjiDefs(definitions, options, context) {
        const sequence = ++this.sequence;
        const params = {
            definitions,
            addable: options.anki.enabled
        };

        if (context) {
            definitions.forEach(definition => {
                definition.sentence = context.sentence;
                definition.url = context.url;
            });
        }

        this.definitions = definitions;
        this.spinner.hide();

        this.templateRender('kanji.html', params).then(content => {
            this.container.html(content);
            $('.action-add-note').click(this.onActionAddNote.bind(this));
            return this.adderButtonsUpdate(['kanji'], sequence);
        }).catch(this.handleError.bind(this));
    }

    adderButtonFind(index, mode) {
        return $(`.action-add-note[data-index="${index}"][data-mode="${mode}"]`);
    }

    adderButtonsUpdate(modes, sequence) {
        return this.definitionsAddable(this.definitions, modes).then(states => {
            if (states === null || sequence !== this.sequence) {
                return;
            }

            states.forEach((state, index) => {
                for (const mode in state) {
                    const button = this.adderButtonFind(index, mode);
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

    onKanjiSearch(e, options) {
        e.preventDefault();
        const character = $(e.target).text();
        this.kanjiFind(character).then(definitions => {
            this.showKanjiDefs(definitions, options, context);
        }).catch(this.handleError.bind(this));
    }

    onActionPlayAudio(e) {
        e.preventDefault();
        const index = $(e.currentTarget).data('index');
        this.audioPlay(this.definitions[index]);
    }

    onActionAddNote(e) {
        e.preventDefault();
        this.showSpinner(true);

        const link = $(e.currentTarget);
        const index = link.data('index');
        const mode = link.data('mode');

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
                const button = this.adderButtonFind(index, mode);
                button.addClass('disabled');
            } else {
                this.handleError('note could not be added');
            }
        }).catch(this.handleError.bind(this)).then(() => this.spinner.hide());
    }

    audioPlay(definition) {
        for (const key in this.audioCache) {
            const audio = this.audioCache[key];
            if (audio !== null) {
                audio.pause();
            }
        }

        const url = Display.audioBuildUrl(definition);
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
                    audio = new Audio('/mixed/mp3/button.mp3');
                }

                this.audioCache[url] = audio;
                audio.play();
            };
        }
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
