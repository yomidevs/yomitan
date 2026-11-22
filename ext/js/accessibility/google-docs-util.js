/*
 * Copyright (C) 2023-2026  Yomitan Authors
 * Copyright (C) 2022  Yomichan Authors
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

import {computeZoomScale, isPointInAnyRect} from '../dom/document-util.js';
import {TextSourceRange} from '../dom/text-source-range.js';

/**
 * Matches characters of scripts which are written without spaces between words.
 */
const noSpaceScriptCharacterPattern = /[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\u3000-\u303f\uff00-\uffef]/u;

/**
 * This class is a helper for handling Google Docs content in content scripts.
 */
export class GoogleDocsUtil {
    constructor() {
        /** @type {?HTMLStyleElement} */
        this._styleNode = null;
    }

    /**
     * Scans the document for text or elements with text information at the given coordinate.
     * Coordinates are provided in [client space](https://developer.mozilla.org/en-US/docs/Web/CSS/CSSOM_View/Coordinate_systems).
     * @param {number} x The x coordinate to search at.
     * @param {number} y The y coordinate to search at.
     * @param {import('document-util').GetRangeFromPointOptions} options Options to configure how element detection is performed.
     * @returns {?TextSourceRange} A range for the hovered text or element, or `null` if no applicable content was found.
     */
    getRangeFromPoint(x, y, {normalizeCssZoom}) {
        const styleNode = this._getStyleNode();
        styleNode.disabled = false;
        const element = document.elementFromPoint(x, y);
        styleNode.disabled = true;
        if (element !== null && element.matches('.kix-canvas-tile-content svg>g>rect')) {
            const ariaLabel = element.getAttribute('aria-label');
            if (typeof ariaLabel === 'string' && ariaLabel.length > 0) {
                return this._createRange(element, x, y, normalizeCssZoom);
            }
        }
        return null;
    }

    /**
     * Gets this <style> node, or creates one if it doesn't exist.
     *
     * A <style> node is necessary to force the SVG <rect> elements to have a fill,
     * which allows them to be included in document.elementsFromPoint's return value.
     * @returns {HTMLStyleElement}
     */
    _getStyleNode() {
        if (this._styleNode === null) {
            const style = document.createElement('style');
            style.textContent = [
                '.kix-canvas-tile-content{pointer-events:none!important;}',
                '.kix-canvas-tile-content svg>g>rect{pointer-events:all!important;}',
            ].join('\n');
            const parent = document.head || document.documentElement;
            if (parent !== null) {
                parent.appendChild(style);
            }
            this._styleNode = style;
        }
        return this._styleNode;
    }

    /**
     * Gets the text of the paragraph containing the given element.
     *
     * Google Docs renders each glyph cluster (typically a single character) as its own <rect>,
     * so the text of the sibling <rect> elements must be combined in order to scan more than one character.
     * @param {Element} element
     * @returns {{text: string, start: number, end: number}} The paragraph text, and the range of `element`'s text within it.
     */
    _getParagraphText(element) {
        const {parentElement} = element;
        const rects = parentElement !== null ? [...parentElement.children].filter((child) => child.matches('rect')) : [element];
        let text = '';
        let start = 0;
        let end = 0;
        /** @type {?Element} */
        let previous = null;
        for (const rect of rects) {
            const label = rect.getAttribute('aria-label');
            if (typeof label !== 'string' || label.length === 0) { continue; }
            if (previous !== null) {
                text += this._getSeparator(previous, rect, text, label);
            }
            if (rect === element) {
                start = text.length;
                end = start + label.length;
            }
            text += label;
            previous = rect;
        }
        return {text, start, end};
    }

    /**
     * Gets the whitespace which should be inserted between the text of two adjacent <rect> elements.
     * Google Docs omits whitespace from the aria-label attributes at line wraps,
     * and between words which are rendered as separate <rect> elements (e.g. right-to-left text).
     * @param {Element} rect1
     * @param {Element} rect2
     * @param {string} text The text preceding `rect2`, ending with the text of `rect1`.
     * @param {string} label The text of `rect2`.
     * @returns {string}
     */
    _getSeparator(rect1, rect2, text, label) {
        if (/\s$/.test(text) || /^\s/.test(label)) { return ''; }

        if (rect1.getAttribute('transform') !== rect2.getAttribute('transform')) {
            // Line wrap
            const lastCharacter = /.$/su.exec(text)?.[0] ?? '';
            const firstCharacter = /^./su.exec(label)?.[0] ?? '';
            if (
                noSpaceScriptCharacterPattern.test(lastCharacter) ||
                noSpaceScriptCharacterPattern.test(firstCharacter) ||
                /[-\u00ad\u2010]/.test(lastCharacter)
            ) {
                return '';
            }
            return ' ';
        }

        // Same line; the gap is measured in both directions to support right-to-left text
        const bounds1 = this._getRectBounds(rect1);
        const bounds2 = this._getRectBounds(rect2);
        if (bounds1 === null || bounds2 === null) { return ''; }
        const gap = Math.max(
            bounds2.x - (bounds1.x + bounds1.width),
            bounds1.x - (bounds2.x + bounds2.width),
        );
        if (gap > bounds1.height * 0.1 && !/^[\p{Pe}\p{Pf}\p{Po}]/u.test(label)) {
            return ' ';
        }
        return '';
    }

    /**
     * @param {Element} rect
     * @returns {?{x: number, width: number, height: number}}
     */
    _getRectBounds(rect) {
        const x = Number.parseFloat(rect.getAttribute('x') || '');
        const width = Number.parseFloat(rect.getAttribute('width') || '');
        const height = Number.parseFloat(rect.getAttribute('height') || '');
        if (!Number.isFinite(x) || !Number.isFinite(width) || !Number.isFinite(height)) { return null; }
        return {x, width, height};
    }

    /**
     * @param {Element} element
     * @param {number} x
     * @param {number} y
     * @param {boolean} normalizeCssZoom
     * @returns {TextSourceRange}
     */
    _createRange(element, x, y, normalizeCssZoom) {
        const {text, start, end} = this._getParagraphText(element);

        // Create imposter
        const content = document.createTextNode(text);
        const svgText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const transform = element.getAttribute('transform') || '';
        // Using getAttribute instead of dataset because element is an SVG element
        // eslint-disable-next-line unicorn/prefer-dom-node-dataset
        const font = element.getAttribute('data-font-css') || '';
        const elementX = element.getAttribute('x');
        const elementY = element.getAttribute('y');
        if (typeof elementX === 'string') { svgText.setAttribute('x', elementX); }
        if (typeof elementY === 'string') { svgText.setAttribute('y', elementY); }
        svgText.appendChild(content);
        const textStyle = svgText.style;
        this._setImportantStyle(textStyle, 'all', 'initial');
        this._setImportantStyle(textStyle, 'transform', transform);
        this._setImportantStyle(textStyle, 'font', font);
        this._setImportantStyle(textStyle, 'text-anchor', 'start');
        this._setImportantStyle(textStyle, 'white-space', 'pre');
        const {parentNode} = element;
        if (parentNode !== null) {
            parentNode.appendChild(svgText);
        }

        // Adjust offset so that the element's text lines up with the element
        const elementRect = element.getBoundingClientRect();
        const elementTextRange = document.createRange();
        elementTextRange.setStart(content, start);
        elementTextRange.setEnd(content, end);
        const textRect = elementTextRange.getBoundingClientRect();
        const width = Number.parseFloat(element.getAttribute('width') || '');
        const height = Number.parseFloat(element.getAttribute('height') || '');
        const scaleX = width > 0 && elementRect.width > 0 ? elementRect.width / width : 1;
        const scaleY = height > 0 && elementRect.height > 0 ? elementRect.height / height : 1;
        const xOffset = (elementRect.left - textRect.left) / scaleX;
        const yOffset = (((elementRect.top - textRect.top) + (elementRect.bottom - textRect.bottom)) * 0.5) / scaleY;
        this._setImportantStyle(textStyle, 'transform', `translate(${xOffset}px,${yOffset}px) ${transform}`);

        // Create range
        const range = this._getRangeWithPoint(content, x, y, start, end, normalizeCssZoom);
        this._setImportantStyle(textStyle, 'pointer-events', 'none');
        this._setImportantStyle(textStyle, 'opacity', '0');
        return TextSourceRange.createFromImposter(range, svgText, element);
    }

    /**
     * @param {Text} textNode
     * @param {number} x
     * @param {number} y
     * @param {number} start The start of the range of characters to search within.
     * @param {number} end The end of the range of characters to search within.
     * @param {boolean} normalizeCssZoom
     * @returns {Range}
     */
    _getRangeWithPoint(textNode, x, y, start, end, normalizeCssZoom) {
        if (normalizeCssZoom) {
            const scale = computeZoomScale(textNode);
            x /= scale;
            y /= scale;
        }
        const range = document.createRange();
        while (end - start > 1) {
            const mid = Math.floor((start + end) / 2);
            range.setStart(textNode, mid);
            range.setEnd(textNode, end);
            if (isPointInAnyRect(x, y, range.getClientRects(), null, null)) {
                start = mid;
            } else {
                end = mid;
            }
        }
        range.setStart(textNode, start);
        range.setEnd(textNode, start);
        return range;
    }

    /**
     * @param {CSSStyleDeclaration} style
     * @param {string} propertyName
     * @param {string} value
     */
    _setImportantStyle(style, propertyName, value) {
        style.setProperty(propertyName, value, 'important');
    }
}
