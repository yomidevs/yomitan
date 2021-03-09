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
 * This class provides some general utility functions for regular expressions.
 */
class RegexUtil {
    /**
     * Applies string.replace using a regular expression and replacement string as arguments.
     * A source map of the changes is also maintained.
     * @param text A string of the text to replace.
     * @param sourceMap An instance of `TextSourceMap` which corresponds to `text`.
     * @param pattern A regular expression to use as the replacement.
     * @param replacement A replacement string that follows the format of the standard
     *   JavaScript regular expression replacement string.
     * @return A new string with the pattern replacements applied and the source map updated.
     */
    static applyTextReplacement(text, sourceMap, pattern, replacement) {
        const isGlobal = pattern.global;
        if (isGlobal) { pattern.lastIndex = 0; }
        for (let loop = true; loop; loop = isGlobal) {
            const match = pattern.exec(text);
            if (match === null) { break; }

            const matchText = match[0];
            const index = match.index;
            const actualReplacement = this.applyMatchReplacement(replacement, match);
            const actualReplacementLength = actualReplacement.length;
            const delta = actualReplacementLength - (matchText.length > 0 ? matchText.length : -1);

            text = `${text.substring(0, index)}${actualReplacement}${text.substring(index + matchText.length)}`;
            pattern.lastIndex += delta;

            if (actualReplacementLength > 0) {
                sourceMap.insert(index, ...(new Array(actualReplacementLength).fill(0)));
                sourceMap.combine(index - 1 + actualReplacementLength, matchText.length);
            } else {
                sourceMap.combine(index, matchText.length);
            }
        }
        return text;
    }

    /**
     * Applies the replacement string for a given regular expression match.
     * @param replacement The replacement string that follows the format of the standard
     *   JavaScript regular expression replacement string.
     * @param match A match object returned from RegExp.match.
     * @return A new string with the pattern replacement applied.
     */
    static applyMatchReplacement(replacement, match) {
        const pattern = this._matchReplacementPattern;
        pattern.lastIndex = 0;
        return replacement.replace(pattern, (g0, g1, g2) => {
            if (typeof g1 !== 'undefined') {
                const matchIndex = Number.parseInt(g1, 10);
                if (matchIndex >= 1 && matchIndex <= match.length) {
                    return match[matchIndex];
                }
            } else if (typeof g2 !== 'undefined') {
                const {groups} = match;
                if (typeof groups === 'object' && groups !== null && Object.prototype.hasOwnProperty.call(groups, g2)) {
                    return groups[g2];
                }
            } else {
                switch (g0) {
                    case '$': return '$';
                    case '&': return match[0];
                    case '`': return replacement.substring(0, match.index);
                    case '\'': return replacement.substring(match.index + g0.length);
                }
            }
            return g0;
        });
    }
}

// eslint-disable-next-line no-underscore-dangle
RegexUtil._matchReplacementPattern = /\$(?:\$|&|`|'|(\d\d?)|<([^>]*)>)/g;
