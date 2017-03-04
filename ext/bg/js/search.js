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


function onSearch(e) {
    e.preventDefault();

    instYomi().termsFind($('#query').val()).then(({length, definitions}) => {
        const options = instYomi().options;
        const params = {
            definitions,
            grouped: options.general.groupResults,
            addable: options.anki.enabled,
            playback: options.general.audioPlayback
        };

        return instYomi().textRender('terms.html', params);
    }).then(content => {
        $('#content').html(content);
    });

    // const sequence = ++this.sequence;
    // const params = {
    //     definitions,
    //     grouped: options.general.groupResults,
    //     addable: options.ankiMethod !== 'disabled',
    //     playback: options.general.audioPlayback
    // };

    // definitions.forEach(definition => {
    //     definition.sentence = context.sentence;
    //     definition.url = context.url;
    // });

    // this.definitions = definitions;
    // this.showSpinner(false);
    // window.scrollTo(0, 0);

    // bgTextRender(params, 'terms.html').then(content => {
    //     $('#content').html(content);
    //     $('.action-add-note').click(this.onAddNote.bind(this));

    //     $('.kanji-link').click(e => {
    //         e.preventDefault();
    //         const character = $(e.target).text();
    //         bgKanjiFind(character).then(definitions => this.api_showKanjiDefs({definitions, options, context}));
    //     });

    //     $('.action-play-audio').click(e => {
    //         e.preventDefault();
    //         const index = $(e.currentTarget).data('index');
    //         this.playAudio(this.definitions[index]);
    //     });

    //     this.updateAddNoteButtons(['term_kanji', 'term_kana'], sequence);
    // }).catch(error => {
    //     this.handleError(error);
    // });
}

$(document).ready(() => {
    $('#search').click(onSearch);
});
