/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
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


class DisplayFloat extends Display {
    constructor() {
        super(document.querySelector('#spinner'), document.querySelector('#definitions'));
        this.autoPlayAudioTimer = null;

        this.optionsContext = {
            depth: 0,
            url: window.location.href
        };

        window.addEventListener('message', (e) => this.onMessage(e), false);
    }

    onError(error) {
        if (window.yomichan_orphaned) {
            this.setContentOrphaned();
        } else {
            logError(error, true);
        }
    }

    onSearchClear() {
        window.parent.postMessage('popupClose', '*');
    }

    onSelectionCopy() {
        window.parent.postMessage('selectionCopy', '*');
    }

    onMessage(e) {
        const {action, params} = e.data;
        const handlers = DisplayFloat.messageHandlers;
        if (hasOwn(handlers, action)) {
            const handler = handlers[action];
            handler(this, params);
        }
    }

    onKeyDown(e) {
        const key = Display.getKeyFromEvent(e);
        const handlers = DisplayFloat.onKeyDownHandlers;
        if (hasOwn(handlers, key)) {
            const handler = handlers[key];
            if (handler(this, e)) {
                e.preventDefault();
                return;
            }
        }
        super.onKeyDown(e);
    }

    getOptionsContext() {
        return this.optionsContext;
    }

    autoPlayAudio() {
        this.clearAutoPlayTimer();
        this.autoPlayAudioTimer = window.setTimeout(() => super.autoPlayAudio(), 400);
    }

    clearAutoPlayTimer() {
        if (this.autoPlayAudioTimer) {
            window.clearTimeout(this.autoPlayAudioTimer);
            this.autoPlayAudioTimer = null;
        }
    }

    async initialize(options, popupInfo, url, childrenSupported) {
        await super.initialize(options);

        const {id, depth, parentFrameId} = popupInfo;
        this.optionsContext.depth = depth;
        this.optionsContext.url = url;

        if (childrenSupported) {
            popupNestedInitialize(id, depth, parentFrameId, url);
        }
    }
}

DisplayFloat.onKeyDownHandlers = {
    'C': (self, e) => {
        if (e.ctrlKey && !window.getSelection().toString()) {
            self.onSelectionCopy();
            return true;
        }
        return false;
    }
};

DisplayFloat.messageHandlers = {
    setContent: (self, {type, details}) => self.setContent(type, details),
    clearAutoPlayTimer: (self) => self.clearAutoPlayTimer(),
    setCustomCss: (self, {css}) => self.setCustomCss(css),
    initialize: (self, {options, popupInfo, url, childrenSupported}) => self.initialize(options, popupInfo, url, childrenSupported)
};

window.yomichan_display = new DisplayFloat();
