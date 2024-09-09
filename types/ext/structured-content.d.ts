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

import type * as DictionaryData from './dictionary-data';

export type VerticalAlign = 'baseline' | 'bottom' | 'middle' | 'sub' | 'super' | 'text-bottom' | 'text-top' | 'top';

export type TextDecorationLine = 'line-through' | 'overline' | 'underline';

export type TextDecorationLineOrNone = 'none' | TextDecorationLine;

export type TextDecorationStyle = 'dashed' | 'dotted' | 'double' | 'solid' | 'wavy';

export type FontStyle = 'italic' | 'normal';

export type FontWeight = 'bold' | 'normal';

export type WordBreak = 'break-all' | 'keep-all' | 'normal';

export type TextAlign = 'center' | 'end' | 'justify' | 'justify-all' | 'left' | 'match-parent' | 'right' | 'start';

export type SizeUnits = 'em' | 'px';

export type ImageRendering = 'auto' | 'crisp-edges' | 'pixelated';

export type ImageAppearance = 'auto' | 'monochrome';

export type Image = {
    border: string;
    borderRadius: string;
    sizeUnits: SizeUnits;
    verticalAlign: VerticalAlign;
} & DictionaryData.TermImage;

export type Data = {
    [key: string]: string;
};

export type StructuredContentStyle = {
    background?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderRadius?: string;
    borderStyle?: string;
    borderWidth?: string;
    clipPath?: string;
    color?: string;
    cursor?: string;
    fontSize?: string;
    fontStyle?: FontStyle;
    fontWeight?: FontWeight;
    listStyleType?: string;
    margin?: string;
    marginBottom?: number | string;
    marginLeft?: number | string;
    marginRight?: number | string;
    marginTop?: number | string;
    padding?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    paddingRight?: string;
    paddingTop?: string;
    textAlign?: TextAlign;
    textDecorationColor?: string;
    textDecorationLine?: TextDecorationLine[] | TextDecorationLineOrNone;
    textDecorationStyle?: TextDecorationStyle;
    textEmphasis?: string;
    textShadow?: string;
    verticalAlign?: VerticalAlign;
    whiteSpace?: string;
    wordBreak?: WordBreak;
};

export type LineBreak = {
    /**
     * This element doesn't support children.
     */
    content?: undefined;
    data?: Data;
    /**
     * This element doesn't support language.
     */
    lang?: undefined;
    tag: 'br';
};

export type UnstyledElement = {
    content?: Content;
    data?: Data;
    /**
     * Defines the language of an element in the format defined by RFC 5646.
     */
    lang?: string;
    tag: 'rp' | 'rt' | 'ruby' | 'table' | 'tbody' | 'tfoot' | 'thead' | 'tr';
};

export type TableElement = {
    colSpan?: number;
    content?: Content;
    data?: Data;
    /**
     * Defines the language of an element in the format defined by RFC 5646.
     */
    lang?: string;
    rowSpan?: number;
    style?: StructuredContentStyle;
    tag: 'td' | 'th';
};

export type StyledElement = {
    content?: Content;
    data?: Data;
    /**
     * Defines the language of an element in the format defined by RFC 5646.
     */
    lang?: string;
    style?: StructuredContentStyle;
    tag: 'details' | 'div' | 'li' | 'ol' | 'span' | 'summary' | 'ul';
    /**
     * Hover text for the element.
     */
    title?: string;
};

export type ImageElementBase = {
    /**
     * Alt text for the image.
     */
    alt?: string;
    /**
     * Controls the appearance of the image. The 'monochrome' value will mask the opaque parts of the image using the current text color.
     */
    appearance?: ImageAppearance;
    /**
     * Whether or not a background color is displayed behind the image.
     */
    background?: boolean;
    /**
     * Whether or not the image is collapsed by default.
     */
    collapsed?: boolean;
    /**
     * Whether or not the image can be collapsed.
     */
    collapsible?: boolean;
    data?: Data;
    /**
     * Description of the image.
     */
    description?: string;
    /**
     * Preferred height of the image.
     */
    height?: number;
    /**
     * Controls how the image is rendered. The value of this field supersedes the pixelated field.
     */
    imageRendering?: ImageRendering;
    /**
     * Path to the image file in the archive.
     */
    path: string;
    /**
     * Whether or not the image should appear pixelated at sizes larger than the image's native resolution.
     */
    pixelated?: boolean;
    /**
     * Preferred height of the image.
     * This is only used in the internal database.
     */
    preferredHeight?: number;
    /**
     * Preferred width of the image.
     * This is only used in the internal database.
     */
    preferredWidth?: number;
    /**
     * Hover text for the image.
     */
    title?: string;
    /**
     * Preferred width of the image.
     */
    width?: number;
};

export type ImageElement = {
    /**
     * Shorthand for border width, style, and color.
     */
    border?: string;
    /**
     * Roundness of the corners of the image's outer border edge.
     */
    borderRadius?: string;
    /**
     * This element doesn't support children.
     */
    content?: undefined;
    /**
     * The units for the width and height.
     */
    sizeUnits?: SizeUnits;
    tag: 'img';
    /**
     * The vertical alignment of the image.
     */
    verticalAlign?: VerticalAlign;
} & ImageElementBase;

export type LinkElement = {
    content?: Content;
    /**
     * The URL for the link. URLs starting with a ? are treated as internal links to other dictionary content.
     */
    href: string;
    /**
     * Defines the language of an element in the format defined by RFC 5646.
     */
    lang?: string;
    tag: 'a';
};

export type Element = ImageElement | LineBreak | LinkElement | StyledElement | TableElement | UnstyledElement;

export type Content = Content[] | Element | string;
