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

import type * as DocumentUtil from './document-util';
import type * as SettingsModifications from './settings-modifications';

export type TransformType = TransformData['type'];

export type ElementMetadata = {
    path: string;
    scope: SettingsModifications.OptionsScopeType | undefined;
    transformRaw: string | undefined;
    transforms: TransformData[];
};

export type TransformFunction = (
    value: unknown,
    data: TransformData,
    element: Element,
) => unknown;

export type TransformStep = 'post' | 'pre';

export type TransformData = (
    ConditionalConvertTransformData |
    JoinTagsTransformData |
    SetAttributeTransformData |
    SetVisibilityTransformData |
    SplitTagsTransformData |
    ToBooleanTransformData |
    ToNumberConstraintsTransformData |
    ToStringTransformData
);

export type TransformDataBase = {
    step?: TransformStep;
};

export type SetAttributeTransformData = {
    ancestorDistance?: number;
    attribute: string;
    selector?: string;
    type: 'setAttribute';
} & TransformDataBase;

export type SetVisibilityTransformData = {
    ancestorDistance?: number;
    condition: OperationData;
    selector?: string;
    type: 'setVisibility';
} & TransformDataBase;

export type SplitTagsTransformData = {
    type: 'splitTags';
} & TransformDataBase;

export type JoinTagsTransformData = {
    type: 'joinTags';
} & TransformDataBase;

export type ToNumberConstraintsTransformData = {
    constraints?: DocumentUtil.ToNumberConstraints;
    type: 'toNumber';
} & TransformDataBase;

export type ToBooleanTransformData = {
    type: 'toBoolean';
} & TransformDataBase;

export type ToStringTransformData = {
    type: 'toString';
} & TransformDataBase;

export type ConditionalConvertTransformData = {
    cases?: ConditionalConvertCase[];
    type: 'conditionalConvert';
} & TransformDataBase;

export type ConditionalConvertCase = {
    default?: boolean;
    result: unknown;
} & OperationData;

export type OperationData = {
    op: string;
    value: unknown;
};
