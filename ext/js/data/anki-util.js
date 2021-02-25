/*
 * Copyright (C) 2021  Yomichan Authors
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

/**
 * This class has some general utility functions for working with Anki data.
 */
class AnkiUtil {
    /**
     * Gets the root deck name of a full deck name. If the deck is a root deck,
     * the same name is returned. Nested decks are separated using '::'.
     * @param deckName A string of the deck name.
     * @returns A string corresponding to the name of the root deck.
     */
    static getRootDeckName(deckName) {
        const index = deckName.indexOf('::');
        return index >= 0 ? deckName.substring(0, index) : deckName;
    }

    /**
     * Checks whether or not any marker is contained in a string.
     * @param string A string to check.
     * @return `true` if the text contains an Anki field marker, `false` otherwise.
     */
    static stringContainsAnyFieldMarker(string) {
        const result = this._markerPattern.test(string);
        this._markerPattern.lastIndex = 0;
        return result;
    }

    /**
     * Gets a list of all markers that are contained in a string.
     * @param string A string to check.
     * @return An array of marker strings.
     */
    static getFieldMarkers(string) {
        const pattern = this._markerPattern;
        const markers = [];
        while (true) {
            const match = pattern.exec(string);
            if (match === null) { break; }
            markers.push(match[1]);
        }
        return markers;
    }

    /**
     * Checks whether an object of key-value pairs has a value which contains a specific marker.
     * @param fieldsObject An object with key-value pairs, where the value corresponds to the field value.
     * @param marker The marker string to check for, excluding brackets.
     * @returns `true` if any of the fields contains the marker, `false` otherwise.
     */
    static fieldsObjectContainsMarker(fieldsObject, marker) {
        marker = `{${marker}}`;
        for (const [, fieldValue] of fieldsObject) {
            if (fieldValue.includes(marker)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns a regular expression which can be used to find markers in a string.
     * @param global Whether or not the regular expression should have the global flag.
     * @returns A new `RegExp` instance.
     */
    static cloneFieldMarkerPattern(global) {
        return new RegExp(this._markerPattern.source, global ? 'g' : '');
    }

    /**
     * Checks whether or not a note object is valid.
     * @param note A note object to check.
     * @return `true` if the note is valid, `false` otherwise.
     */
    static isNoteDataValid(note) {
        if (!isObject(note)) { return false; }
        const {fields, deckName, modelName} = note;
        return (
            typeof deckName === 'string' &&
            typeof modelName === 'string' &&
            Object.entries(fields).length > 0
        );
    }
}

// eslint-disable-next-line no-underscore-dangle
AnkiUtil._markerPattern = /\{([\w-]+)\}/g;
