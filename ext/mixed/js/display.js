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
        this.resultCache = {};
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

            let offset = 0;
            if (context && context.hasOwnProperty('index') && context.index < definitions.length) {
                const entry = $('.entry').eq(context.index);
                offset = entry.offset().top;
            }

            window.scrollTo(0, offset);

            $('.action-add-note').click(this.onActionAddNote.bind(this));
            $('.action-play-audio').click(e => {
                e.preventDefault();
                const index = Display.entryIndexFind($(e.currentTarget));
                this.audioPlay(this.definitions[index]);
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
            window.scrollTo(0, 0);

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

    onActionAddNote(e) {
        e.preventDefault();
        this.spinner.show();

        const link = $(e.currentTarget);
        const mode = link.data('mode');
        const index = Display.entryIndexFind(link);
        const definition = this.definitions[index];

        if (mode !== 'kanji') {
            const url = Display.audioBuildUrlOld(definition);
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

    audioPlay(definition) {
        this.spinner.show();

        for (const key in this.audioCache) {
            const audio = this.audioCache[key];
            if (audio !== null) {
                audio.pause();
            }
        }

        this.audioBuildUrl(definition).then(url => {
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
        }).catch(this.handleError.bind(this)).then(() => this.spinner.hide());
    }

    audioBuildUrl(definition) {
        return new Promise((resolve, reject) => {
            const response = this.resultCache[definition.expression];
            if (response) {
                resolve(response);
                return;
            }

            const data = {
                post: 'dictionary_reference',
                match_type: 'exact',
                search_query: definition.expression
            };

            const params = [];
            for (const key in data) {
                params.push(`${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`);
            }

            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://www.japanesepod101.com/learningcenter/reference/dictionary_post');
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.addEventListener('error', () => reject('failed to execute network request'));
            xhr.addEventListener('load', () => {
                this.resultCache[definition.expression] = xhr.responseText;
                resolve(xhr.responseText);
            });

            xhr.send(params.join('&'));
        }).then(response => {
            const dom = new DOMParser().parseFromString(response, 'text/html');
            const entries = [];

            for (const row of dom.getElementsByClassName('dc-result-row')) {
                try {
                    const url = row.getElementsByClassName('ill-onebuttonplayer').item(0).getAttribute('data-url');
                    const expression = dom.getElementsByClassName('dc-vocab').item(0).innerText;
                    const reading = dom.getElementsByClassName('dc-vocab_kana').item(0).innerText;

                    if (url && expression && reading) {
                        entries.push({url, expression, reading});
                    }
                } catch (e) {
                    // NOP
                }
            }

            return entries;
        }).then(entries => {
            for (const entry of entries) {
                if (!definition.reading || definition.reading === entry.reading) {
                    return entry.url;
                }
            }

            return '/mixed/mp3/button.mp3';
        });
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

    static entryIndexFind(element) {
        return $('.entry').index(element.closest('.entry'));
    }

    static adderButtonFind(index, mode) {
        return $('.entry').eq(index).find(`.action-add-note[data-mode="${mode}"]`);
    }
}
