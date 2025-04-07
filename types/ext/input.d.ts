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

export type ModifierKey = 'alt' | 'ctrl' | 'meta' | 'shift';

export type ModifierMouseButton = 'mouse0' | 'mouse1' | 'mouse2' | 'mouse3' | 'mouse4' | 'mouse5';

export type Modifier = ModifierKey | ModifierMouseButton;

export type ModifierType = 'key' | 'mouse';

export type PointerType = (
    'pen' |
    'mouse' |
    'touch' |
    'script'
);

export type PointerEventType = (
    'mouseMove' |
    'pointerOver' |
    'pointerDown' |
    'pointerMove' |
    'pointerUp' |
    'touchStart' |
    'touchEnd' |
    'touchMove' |
    'click' |
    'script'
);

/**
 * An enum representing the pen pointer state.
 * - `0` - Not active.
 * - `1` - Hovering.
 * - `2` - Touching.
 * - `3` - Hovering after touching.
 */
export type PenPointerState = 0 | 1 | 2 | 3;
