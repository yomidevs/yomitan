/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
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


class QueryParser {
    constructor(search) {
        this.search = search;

        this.queryParser = document.querySelector('#query-parser');

        // TODO also enable for mouseover scanning
        this.queryParser.addEventListener('click', (e) => this.onTermLookup(e));
    }

    onError(error) {
        logError(error, false);
    }

    async onTermLookup(e) {
        const {textSource} = await this.search.onTermLookup(e, {isQueryParser: true});
        if (textSource) {
            textSource.select();
        }
    }

    setText(text) {
        this.queryParser.innerText = text;
    }
}
