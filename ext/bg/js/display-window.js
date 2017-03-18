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


window.displayWindow = new class extends Display {
    constructor() {
        super($('#spinner'), $('#content'));

        const search = $('#search');
        search.click(this.onSearch.bind(this));

        const query = $('#query');
        query.on('input', () => search.prop('disabled', query.val().length === 0));
        window.wanakana.bind(query.get(0));
    }

    definitionAdd(definition, mode) {
        return instYomi().definitionAdd(definition, mode);
    }

    definitionsAddable(definitions, modes) {
        return instYomi().definitionsAddable(definitions, modes).catch(() => []);
    }

    templateRender(template, data) {
        return instYomi().templateRender(template, data);
    }

    kanjiFind(character) {
        return instYomi().kanjiFind(character);
    }

    handleError(error) {
        window.alert(`Error: ${error}`);
    }

    onSearch(e) {
        e.preventDefault();
        $('#intro').slideUp();
        instYomi().termsFind($('#query').val()).then(({length, definitions}) => {
            super.showTermDefs(definitions, instYomi().options);
        }).catch(this.handleError.bind(this));
    }
};
