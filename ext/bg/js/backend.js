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


class Backend {
    constructor() {
        handlebarsRegister();

        this.translator = new Translator();
        this.anki = new AnkiNull();
        this.options = null;

        this.translator.prepare().then(optionsLoad).then(options => {
            apiOptionsSet(options);

            chrome.commands.onCommand.addListener(utilCommandDispatch);
            chrome.runtime.onMessage.addListener(utilMessageDispatch);

            if (options.general.showGuide) {
                chrome.tabs.create({url: chrome.extension.getURL('/bg/guide.html')});
            }
        });
    }

    static instance() {
        return chrome.extension.getBackgroundPage().yomichanBackend;
    }
};

window.yomichanBackend = new Backend();
