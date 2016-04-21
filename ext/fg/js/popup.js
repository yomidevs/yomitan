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


class Popup {
    constructor() {
        this.offset = 10;

        this.popup = document.createElement('iframe');
        this.popup.id = 'yomichan-popup';
        this.popup.addEventListener('mousedown', (e) => e.stopPropagation());
        this.popup.addEventListener('scroll', (e) => e.stopPropagation());

        document.body.appendChild(this.popup);
    }

    show(cont, pos) {
        this.popup.style.left = pos.x + 'px';
        this.popup.style.top  = pos.y + 'px';
        this.popup.style.visibility = 'visible';
    }

    hide() {
        this.popup.style.visibility = 'hidden';
    }

    update(cont) {
        this.popup.setAttribute('srcdoc', cont);
    }
}
