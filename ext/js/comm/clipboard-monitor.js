/*
 * Copyright (C) 2020-2021  Yomichan Authors
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

class ClipboardMonitor extends EventDispatcher {
    constructor({japaneseUtil, clipboardReader}) {
        super();
        this._japaneseUtil = japaneseUtil;
        this._clipboardReader = clipboardReader;
        this._timerId = null;
        this._timerToken = null;
        this._interval = 250;
        this._previousText = null;
    }

    start() {
        this.stop();

        // The token below is used as a unique identifier to ensure that a new clipboard monitor
        // hasn't been started during the await call. The check below the await call
        // will exit early if the reference has changed.
        let canChange = false;
        const token = {};
        const intervalCallback = async () => {
            this._timerId = null;

            let text = null;
            try {
                text = await this._clipboardReader.getText();
            } catch (e) {
                // NOP
            }
            if (this._timerToken !== token) { return; }

            if (
                typeof text === 'string' &&
                (text = text.trim()).length > 0 &&
                text !== this._previousText
            ) {
                this._previousText = text;
                if (canChange && this._japaneseUtil.isStringPartiallyJapanese(text)) {
                    this.trigger('change', {text});
                }
            }

            canChange = true;
            this._timerId = setTimeout(intervalCallback, this._interval);
        };

        this._timerToken = token;

        intervalCallback();
    }

    stop() {
        this._timerToken = null;
        this._previousText = null;
        if (this._timerId !== null) {
            clearTimeout(this._timerId);
            this._timerId = null;
        }
    }

    setPreviousText(text) {
        this._previousText = text;
    }
}
