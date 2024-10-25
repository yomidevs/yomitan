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

import {DrawMediaRequest, DrawImageBitmapRequest as DrawImageBitmapRequest} from 'dictionary-database';

export type OnProgressCallback = (...args: unknown[]) => void;

export type MessageToWorker = (
    DrawMediaMessage | DrawImageBitmapsMessage
);

export type DrawMediaMessage = {
    action: 'drawMedia';
    params: DrawMediaMessageParams;
};

export type DrawMediaMessageParams = {
    items: DrawMediaRequest[];
};

export type DrawImageBitmapsMessage = {
    action: 'drawImageBitmaps';
    params: DrawImageBitmapsMessageParams;
};

export type DrawImageBitmapsMessageParams = {
    requests: DrawImageBitmapRequest[];
};
