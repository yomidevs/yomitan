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

/**
 * These overrides provide compatibility between the default chrome types and the minor
 * differences that other browsers such as Firefox use.
 */
export type ManifestOverrides = {
    author?: chrome.runtime.Manifest['author'] | string;
};

export type Manifest = ManifestOverrides & Omit<chrome.runtime.Manifest, keyof ManifestOverrides>;

export type ManifestConfig = {
    defaultVariant: string;
    manifest: Manifest;
    variants: ManifestVariant[];
};

export type ManifestVariant = {
    buildable?: boolean;
    excludeFiles?: string[];
    fileCopies?: string[];
    fileName?: string;
    inherit?: string;
    modifications?: Modification[];
    name: string;
};

export type Modification = (
    ModificationAdd |
    ModificationCopy |
    ModificationDelete |
    ModificationMove |
    ModificationRemove |
    ModificationReplace |
    ModificationSet |
    ModificationSplice
);

export type ModificationReplace = {
    action: 'replace';
    path: PropertyPath;
    pattern: string;
    patternFlags: string;
    replacement: string;
};

export type ModificationDelete = {
    action: 'delete';
    path: PropertyPath;
};

export type ModificationSet = {
    action: 'set';
    after?: string;
    before?: string;
    command?: Command;
    index?: number;
    path: PropertyPath;
    value: unknown;
};

export type ModificationAdd = {
    action: 'add';
    items: unknown[];
    path: PropertyPath;
};

export type ModificationRemove = {
    action: 'remove';
    item: unknown;
    path: PropertyPath;
};

export type ModificationSplice = {
    action: 'splice';
    deleteCount: number;
    items: unknown[];
    path: PropertyPath;
    start: number;
};

export type ModificationCopy = {
    action: 'copy';
    after?: string;
    before?: string;
    index?: number;
    newPath: PropertyPath;
    path: PropertyPath;
};

export type ModificationMove = {
    action: 'move';
    after?: string;
    before?: string;
    index?: number;
    newPath: PropertyPath;
    path: PropertyPath;
};

export type PropertyPath = (number | string)[];

export type Command = {
    args: string[];
    command: string;
    trim: boolean;
};
