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
            if (previous !== null && this._hasGapBetween(previous, rect) && !/\s$/.test(text) && !/^\s/.test(label)) {
                text += ' ';
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
     * Checks whether there is horizontal space between two adjacent <rect> elements on the same line,
     * which indicates whitespace that isn't otherwise present in the aria-label attributes.
     * @param {Element} rect1
     * @param {Element} rect2
     * @returns {boolean}
     */
    _hasGapBetween(rect1, rect2) {
        if (rect1.getAttribute('transform') !== rect2.getAttribute('transform')) { return false; }
        const x1 = Number.parseFloat(rect1.getAttribute('x') || '');
        const width1 = Number.parseFloat(rect1.getAttribute('width') || '');
        const height1 = Number.parseFloat(rect1.getAttribute('height') || '');
        const x2 = Number.parseFloat(rect2.getAttribute('x') || '');
        if (!Number.isFinite(x1) || !Number.isFinite(width1) || !Number.isFinite(height1) || !Number.isFinite(x2)) { return false; }
        return x2 - (x1 + width1) > height1 * 0.1;
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
