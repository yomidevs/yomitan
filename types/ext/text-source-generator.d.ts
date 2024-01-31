/*
 * Copyright (C) 2024  Yomitan Authors
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

import type {TextSource} from './text-source';
import type {GetRangeFromPointOptions} from './document-util';

/**
 * Scans the document for text or elements with text information at the given coordinate.
 * Coordinates are provided in [client space](https://developer.mozilla.org/en-US/docs/Web/CSS/CSSOM_View/Coordinate_systems).
 * @returns A range for the hovered text or element, or `null` if no applicable content was found.
 */
export type GetRangeFromPointHandler = (
    /** The x coordinate to search at. */
    x: number,
    /** The y coordinate to search at. */
    y: number,
    /** Options to configure how element detection is performed. */
    options: GetRangeFromPointOptions,
) => (TextSource | null);
