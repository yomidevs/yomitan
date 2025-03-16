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

import type * as Settings from './settings';

export type OptionsScope = {
    scope: OptionsScopeType;
    optionsContext: Settings.OptionsContext | null;
};

export type OptionsScopeType = 'profile' | 'global';

export type Read = {
    path: string;
};

export type ModificationSet = {
    action: 'set';
    path: string;
    value: unknown;
};

export type ModificationDelete = {
    action: 'delete';
    path: string;
};

export type ModificationSwap = {
    action: 'swap';
    path1: string;
    path2: string;
};

export type ModificationSplice = {
    action: 'splice';
    path: string;
    start: number;
    deleteCount: number;
    items: unknown[];
};

export type ModificationPush = {
    action: 'push';
    path: string;
    items: unknown[];
};

export type Modification = (
    ModificationSet |
    ModificationDelete |
    ModificationSwap |
    ModificationSplice |
    ModificationPush
);

export type ScopedRead = Read & OptionsScope;

export type ScopedModificationSet = ModificationSet & OptionsScope;

export type ScopedModificationDelete = ModificationDelete & OptionsScope;

export type ScopedModificationSwap = ModificationSwap & OptionsScope;

export type ScopedModificationSplice = ModificationSplice & OptionsScope;

export type ScopedModificationPush = ModificationPush & OptionsScope;

export type ScopedModification = (
    ScopedModificationSet |
    ScopedModificationDelete |
    ScopedModificationSwap |
    ScopedModificationSplice |
    ScopedModificationPush
);

export type ModificationSetResult = unknown;

export type ModificationDeleteResult = true;

export type ModificationSwapResult = true;

export type ModificationSpliceResult = unknown[];

export type ModificationPushResult = number;

// There is some redundancy with this type currently due to the `unknown`s used in it.
// For now, this is fine, but the types could be improved in the future.
export type ModificationResult = (
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    ModificationSetResult |
    ModificationDeleteResult |
    // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
    ModificationSwapResult |
    ModificationSpliceResult |
    ModificationPushResult
);
