/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import {ClipboardReader} from '../comm/clipboard-reader.js';
import {DictionaryDatabase} from '../dictionary/dictionary-database.js';
import {WebExtension} from '../extension/web-extension.js';
import {Translator} from '../language/translator.js';
import {Backend} from './backend.js';
import {ClipboardReaderProxy, DictionaryDatabaseProxy, OffscreenProxy, TranslatorProxy} from './offscreen-proxy.js';

/** Entry point. */
async function main() {
    const webExtension = new WebExtension();

    /** @type {?import('../dictionary/dictionary-database.js').DictionaryDatabase|import('./offscreen-proxy.js').DictionaryDatabaseProxy} */
    let dictionaryDatabase = null;
    /** @type {?import('../language/translator.js').Translator|import('./offscreen-proxy.js').TranslatorProxy} */
    let translator = null;
    /** @type {?import('../comm/clipboard-reader.js').ClipboardReader|import('./offscreen-proxy.js').ClipboardReaderProxy} */
    let clipboardReader = null;
    if (webExtension.isOffscreenSupported()) {
        const offscreen = new OffscreenProxy(webExtension);
        offscreen.prepare();
        dictionaryDatabase = new DictionaryDatabaseProxy(offscreen);
        translator = new TranslatorProxy(offscreen);
        clipboardReader = new ClipboardReaderProxy(offscreen);
    } else {
        dictionaryDatabase = new DictionaryDatabase();
        translator = new Translator({database: dictionaryDatabase});
        clipboardReader = new ClipboardReader({
            // eslint-disable-next-line no-undef
            document: (typeof document === 'object' && document !== null ? document : null),
            pasteTargetSelector: '#clipboard-paste-target',
            richContentPasteTargetSelector: '#clipboard-rich-content-paste-target'
        });
    }

    const backend = new Backend(webExtension, dictionaryDatabase, translator, clipboardReader);
    await backend.prepare();
}

main();
