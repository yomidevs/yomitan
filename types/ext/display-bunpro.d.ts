/*
 * Copyright (C) 2026  Yomitan Authors
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

import type * as Bunpro from './bunpro';

/** Exists only while an add is running or after it failed. Success is `inReviews` on the match. */
export type AddAttempt =
    | {state: 'adding'}
    | {state: 'failed', error: string};

export type State =
    | {phase: 'off'}
    | {phase: 'loading', entryQueries: (Bunpro.BunproQuery | null)[]}
    | {phase: 'unavailable', reason: Exclude<Bunpro.BunproStatus, 'ready'> | 'error'}
    | {
        phase: 'ready';
        /** Per dictionary entry, the key of its Bunpro match, or null when it has none. */
        entryItems: (Bunpro.ItemKey | null)[];
        items: Map<Bunpro.ItemKey, Bunpro.BunproMatch>;
        attempts: Map<Bunpro.ItemKey, AddAttempt>;
    };

export type ControlView =
    | {kind: 'none'}
    | {kind: 'reserved'}
    | {kind: 'button', text: string, title: string, disabled: boolean};
