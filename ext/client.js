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


class Client {
    constructor() {
        $('body').append('<div class="yomichan-popup"/>');

        this.popup       = $('.yomichan-popup');
        this.popupOffset = 10;

        window.addEventListener('mousemove', whenEnabled(this.onMouseMove.bind(this)));
    }

    onMouseMove(e) {
        const range = getRangeAtCursor(e, 10);
        if (range === null) {
            this.hidePopup();
            return;
        }

        const rect = getRangePaddedRect(range);
        if (e.clientX < rect.left || e.clientX > rect.right) {
            this.hidePopup();
            return;
        }

        this.showPopup(range);
    }

    showPopup(range) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        const pos = getPopupPositionForRange(this.popup, range, this.popupOffset);
        this.popup.css({left: pos.x, top: pos.y, visibility: 'visible'});
    }

    hidePopup() {
        const selection = window.getSelection();
        selection.removeAllRanges();

        this.popup.css({visibility: 'hidden'});
    }
}

window.yomiClient = new Client();
