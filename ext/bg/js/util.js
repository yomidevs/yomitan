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

function utilAsync(func) {
    return function(...args) {
        func.apply(this, args);
    };
}

function utilBackend() {
    return chrome.extension.getBackgroundPage().yomichan_backend;
}

function utilAnkiGetModelNames() {
    return utilBackend().anki.getModelNames();
}

function utilAnkiGetDeckNames() {
    return utilBackend().anki.getDeckNames();
}

function utilAnkiGetModelFieldNames(modelName) {
    return utilBackend().anki.getModelFieldNames(modelName);
}

function utilDatabaseGetDictionaries() {
    return utilBackend().translator.database.getDictionaries();
}

function utilDatabasePurge() {
    return utilBackend().translator.database.purge();
}

function utilDatabaseImport(data, progress) {
    return utilBackend().translator.database.importDictionary(data, progress);
}
