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

export type NormalizedWritingMode = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr' | 'sideways-rl' | 'sideways-lr';

/**
 * Options to configure how element detection is performed.
 */
export type GetRangeFromPointOptions = {
    /**
     * Whether or deep content scanning should be performed. When deep content scanning is enabled,
     * some transparent overlay elements will be ignored when looking for the element at the input position.
     */
    deepContentScan: boolean;
    /**
     * Whether or not zoom coordinates should be normalized.
     */
    normalizeCssZoom: boolean;
};

export type ToNumberConstraints = {
    min?: string | number;
    max?: string | number;
    step?: string | number;
};
