/*
 * Copyright (C) 2017-2020  Yomichan Authors
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


async function requestText(url, method, data, cors=false) {
    const response = await fetch(url, {
        method,
        mode: (cors ? 'cors' : 'no-cors'),
        cache: 'default',
        credentials: 'omit',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: (data ? JSON.stringify(data) : void 0)
    });
    return await response.text();
}

async function requestJson(url, method, data, cors=false) {
    const response = await fetch(url, {
        method,
        mode: (cors ? 'cors' : 'no-cors'),
        cache: 'default',
        credentials: 'omit',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: (data ? JSON.stringify(data) : void 0)
    });
    return await response.json();
}
