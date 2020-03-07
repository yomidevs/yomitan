/*
 * Copyright (C) 2020  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*global jpIsStringPartiallyJapanese*/

class ClipboardMonitor extends EventDispatcher {
    constructor({getClipboard}) {
        super();
        this.timerId = null;
        this.timerToken = null;
        this.interval = 250;
        this.previousText = null;
        this.getClipboard = getClipboard;
    }

    start() {
        this.stop();

        // The token below is used as a unique identifier to ensure that a new clipboard monitor
        // hasn't been started during the await call. The check below the await this.getClipboard()
        // call will exit early if the reference has changed.
        const token = {};
        const intervalCallback = async () => {
            this.timerId = null;

            let text = null;
            try {
                text = await this.getClipboard();
            } catch (e) {
                // NOP
            }
            if (this.timerToken !== token) { return; }

            if (
                typeof text === 'string' &&
                (text = text.trim()).length > 0 &&
                text !== this.previousText
            ) {
                this.previousText = text;
                if (jpIsStringPartiallyJapanese(text)) {
                    this.trigger('change', {text});
                }
            }

            this.timerId = setTimeout(intervalCallback, this.interval);
        };

        this.timerToken = token;

        intervalCallback();
    }

    stop() {
        this.timerToken = null;
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    setPreviousText(text) {
        this.previousText = text;
    }
}
