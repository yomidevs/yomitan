/*
 * Copyright (C) 2023  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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

        // Continuously selecting and focusing on an element makes the search
        // Function is unusable manually this code disables the function
        // If the mouse is over the content
        const content = document.querySelector('.content-body-inner');

        let isMouseAbove = false;

        content.addEventListener('mouseover', handleMouseover);
        content.addEventListener('mouseleave', handleMouseleave);

        function handleMouseover() {
            isMouseAbove = true;
        }

        function handleMouseleave() {
            isMouseAbove = false;
        }
        // The token below is used as a unique identifier to ensure that a new clipboard monitor
        // hasn't been started during the await call. The check below the await call
        // will exit early if the reference has changed.
        let canChange = false;
        const token = {};
        const intervalCallback = async () => {
            this._timerId = null;

            let text = null;
            try {
                if (isMouseAbove) { text = this._previousText; } else {
                    text = this.paste();
                }
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

    paste() {
        const previouslyFocusedElement = document.activeElement;
        const ta = document.createElement('textarea');
        ta.style.cssText =
            'opacity:0; position:fixed; width:1px; height:1px; top:0; left:0;';
        document.body.appendChild(ta);

        ta.focus();
        ta.select();
        document.execCommand('paste');
        const a = ta.value;
        ta.remove();
        previouslyFocusedElement.focus();

        return a;
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
