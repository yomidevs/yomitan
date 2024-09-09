/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

export type ParseResultRaw = {
    [key: string]: ParseResultLineRaw[];
};

export type ParseResultLineRaw = ParseResultTermRaw[];

export type ParseResultTermRaw = {
    expression?: string;
    reading?: string;
    source?: string;
};

/** The resulting data from an invocation of `parseText`. */
export type ParseResult = {
    /** The resulting parsed terms. */
    lines: ParseFragment[][];
    /** The dictionary name for the parsed result. */
    name: string;
};

/** A fragment of the parsed text. */
export type ParseFragment = {
    /** The reading of the term. */
    reading: string;
    /** The source text. */
    source: string;
    /** The term. */
    term: string;
};
