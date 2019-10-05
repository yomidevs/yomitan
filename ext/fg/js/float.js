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
        this.styleNode = null;

        this.optionsContext = {
            depth: 0,
            url: window.location.href
        };

        this.dependencies = Object.assign({}, this.dependencies, {docRangeFromPoint, docSentenceExtract});

        window.addEventListener('message', (e) => this.onMessage(e), false);
    }

    onError(error) {
        if (window.yomichan_orphaned) {
            this.onOrphaned();
        } else {
            window.alert(`Error: ${error.toString ? error.toString() : error}`);
        }
    }

    onOrphaned() {
        const definitions = document.querySelector('#definitions');
        const errorOrphaned = document.querySelector('#error-orphaned');

        if (definitions !== null) {
            definitions.style.setProperty('display', 'none', 'important');
        }

        if (errorOrphaned !== null) {
            errorOrphaned.style.setProperty('display', 'block', 'important');
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
        if (handlers.hasOwnProperty(action)) {
            const handler = handlers[action];
            handler(this, params);
        }
    }

    onKeyDown(e) {
        const key = Display.getKeyFromEvent(e);
        const handlers = DisplayFloat.onKeyDownHandlers;
        if (handlers.hasOwnProperty(key)) {
            const handler = handlers[key];
            if (handler(this, e)) {
                e.preventDefault();
                return;
            }
        }
        super.onKeyDown(e);
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

    initialize(options, popupInfo, url) {
        const css = options.general.customPopupCss;
        if (css) {
            this.setStyle(css);
        }

        const {id, depth, parentFrameId} = popupInfo;
        this.optionsContext.depth = depth;
        this.optionsContext.url = url;
        popupNestedInitialize(id, depth, parentFrameId, url);
    }

    setStyle(css) {
        const parent = document.head;

        if (this.styleNode === null) {
            this.styleNode = document.createElement('style');
        }

        this.styleNode.textContent = css;

        if (this.styleNode.parentNode !== parent) {
            parent.appendChild(this.styleNode);
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
    termsShow: (self, {definitions, options, context}) => self.termsShow(definitions, options, context),
    kanjiShow: (self, {definitions, options, context}) => self.kanjiShow(definitions, options, context),
    clearAutoPlayTimer: (self) => self.clearAutoPlayTimer(),
    orphaned: (self) => self.onOrphaned(),
    initialize: (self, {options, popupInfo, url}) => self.initialize(options, popupInfo, url)
};

window.yomichan_display = new DisplayFloat();
