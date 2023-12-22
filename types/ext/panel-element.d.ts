/*
 * Copyright (C) 2023  Yomitan Authors
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

export type EventType = 'visibilityChanged' | 'closeCompleted';

export type VisibilityChangedEvent = {
    visible: boolean;
};

export type CloseCompletedEvent = {
    reopening: boolean;
};

/* eslint-disable @stylistic/ts/indent */
export type Event<T extends EventType> = (
    T extends 'visibilityChanged' ? VisibilityChangedEvent :
    T extends 'closeCompleted' ? CloseCompletedEvent :
    never
);
/* eslint-enable @stylistic/ts/indent */

export type ConstructorDetails = {
    node: HTMLElement;
    closingAnimationDuration: number;
};
