/*
 * Copyright (C) 2023-2025  Yomitan Authors
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
    pos1?: string;
    pos2?: string;
    pos3?: string;
    pos4?: string;
    inflection_type?: string;
};

/** The resulting data from an invocation of `parseText`. */
export type ParseResult = {
    /** The dictionary name for the parsed result. */
    name: string;
    /** The resulting parsed terms. */
    lines: ParseFragment[][];
};

/** A fragment of the parsed text. */
export type ParseFragment = {
    /** The term. */
    term: string;
    /** The reading of the term. */
    reading: string;
    /** The source text. */
    source: string;
    /** The part of speech (major category). */
    pos: string;
    /** The part of speech (minor category). */
    pos2: string;
};
