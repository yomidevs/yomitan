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

export type OnAddedCallback<T = unknown> = (element: Element) => T | undefined;

export type OnRemovedCallback<T = unknown> = (element: Element, data: T) => void;

export type OnChildrenUpdatedCallback<T = unknown> = (element: Element, data: T) => void;

export type IsStaleCallback<T = unknown> = (element: Element, data: T) => boolean;

export type ConstructorDetails<T = unknown> = {
    /** A string CSS selector used to filter elements, or `null` for no filtering. */
    ignoreSelector?: null | string;
    /**
     * A function which checks if the data is stale for a given element, or `null`.
     * If the element is stale, it will be removed and potentially re-added.
     */
    isStale?: IsStaleCallback<T> | null;
    /** A function which is invoked for each element that is added that matches the selector. */
    onAdded?: null | OnAddedCallback<T>;
    /** A function which is invoked for each element which has its children updated, or `null`. */
    onChildrenUpdated?: null | OnChildrenUpdatedCallback<T>;
    /** A function which is invoked for each element that is removed, or `null`. */
    onRemoved?: null | OnRemovedCallback<T>;
    /** A string CSS selector used to find elements. */
    selector: string;
};

export type MutationRecordLike = {
    addedNodes: Node[];
    removedNodes: Node[];
    target: Node;
    type: string;
};

export type Observer<T = unknown> = {
    ancestors: Node[];
    data: T;
    element: Element;
};
