/*
 * Copyright (C) 2020-2021  Yomichan Authors
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
 * A class used to scan text in a document.
 */
class DOMTextScanner {
    /**
     * Creates a new instance of a DOMTextScanner.
     * @param node The DOM Node to start at.
     * @param offset The character offset in to start at when node is a text node.
     *   Use 0 for non-text nodes.
     */
    constructor(node, offset, forcePreserveWhitespace=false, generateLayoutContent=true) {
        const ruby = DOMTextScanner.getParentRubyElement(node);
        const resetOffset = (ruby !== null);
        if (resetOffset) { node = ruby; }

        this._node = node;
        this._offset = offset;
        this._content = '';
        this._remainder = 0;
        this._resetOffset = resetOffset;
        this._newlines = 0;
        this._lineHasWhitespace = false;
        this._lineHasContent = false;
        this._forcePreserveWhitespace = forcePreserveWhitespace;
        this._generateLayoutContent = generateLayoutContent;
    }

    /**
     * Gets the current node being scanned.
     * @returns A DOM Node.
     */
    get node() {
        return this._node;
    }

    /**
     * Gets the current offset corresponding to the node being scanned.
     * This value is only applicable for text nodes.
     * @returns An integer.
     */
    get offset() {
        return this._offset;
    }

    /**
     * Gets the remaining number of characters that weren't scanned in the last seek() call.
     * This value is usually 0 unless the end of the document was reached.
     * @returns An integer.
     */
    get remainder() {
        return this._remainder;
    }

    /**
     * Gets the accumulated content string resulting from calls to seek().
     * @returns A string.
     */
    get content() {
        return this._content;
    }

    /**
     * Seeks a given length in the document and accumulates the text content.
     * @param length A positive or negative integer corresponding to how many characters
     *   should be added to content. Content is only added to the accumulation string,
     *   never removed, so mixing seek calls with differently signed length values
     *   may give unexpected results.
     * @returns this
     */
    seek(length) {
        const forward = (length >= 0);
        this._remainder = (forward ? length : -length);
        if (length === 0) { return this; }

        const TEXT_NODE = Node.TEXT_NODE;
        const ELEMENT_NODE = Node.ELEMENT_NODE;

        const generateLayoutContent = this._generateLayoutContent;
        let node = this._node;
        let lastNode = node;
        let resetOffset = this._resetOffset;
        let newlines = 0;
        while (node !== null) {
            let enterable = false;
            const nodeType = node.nodeType;

            if (nodeType === TEXT_NODE) {
                lastNode = node;
                if (!(
                    forward ?
                    this._seekTextNodeForward(node, resetOffset) :
                    this._seekTextNodeBackward(node, resetOffset)
                )) {
                    // Length reached
                    break;
                }
            } else if (nodeType === ELEMENT_NODE) {
                lastNode = node;
                this._offset = 0;
                [enterable, newlines] = DOMTextScanner.getElementSeekInfo(node);
                if (newlines > this._newlines && generateLayoutContent) {
                    this._newlines = newlines;
                }
            }

            const exitedNodes = [];
            node = DOMTextScanner.getNextNode(node, forward, enterable, exitedNodes);

            for (const exitedNode of exitedNodes) {
                if (exitedNode.nodeType !== ELEMENT_NODE) { continue; }
                newlines = DOMTextScanner.getElementSeekInfo(exitedNode)[1];
                if (newlines > this._newlines && generateLayoutContent) {
                    this._newlines = newlines;
                }
            }

            resetOffset = true;
        }

        this._node = lastNode;
        this._resetOffset = resetOffset;

        return this;
    }

    // Private

    /**
     * Seeks forward in a text node.
     * @param textNode The text node to use.
     * @param resetOffset Whether or not the text offset should be reset.
     * @returns true if scanning should continue, or false if the scan length has been reached.
     */
    _seekTextNodeForward(textNode, resetOffset) {
        const nodeValue = textNode.nodeValue;
        const nodeValueLength = nodeValue.length;
        const [preserveNewlines, preserveWhitespace] = (
            this._forcePreserveWhitespace ?
            [true, true] :
            DOMTextScanner.getWhitespaceSettings(textNode)
        );

        let lineHasWhitespace = this._lineHasWhitespace;
        let lineHasContent = this._lineHasContent;
        let content = this._content;
        let offset = resetOffset ? 0 : this._offset;
        let remainder = this._remainder;
        let newlines = this._newlines;

        while (offset < nodeValueLength) {
            const char = nodeValue[offset];
            const charAttributes = DOMTextScanner.getCharacterAttributes(char, preserveNewlines, preserveWhitespace);
            ++offset;

            if (charAttributes === 0) {
                // Character should be ignored
                continue;
            } else if (charAttributes === 1) {
                // Character is collapsible whitespace
                lineHasWhitespace = true;
            } else {
                // Character should be added to the content
                if (newlines > 0) {
                    if (content.length > 0) {
                        const useNewlineCount = Math.min(remainder, newlines);
                        content += '\n'.repeat(useNewlineCount);
                        remainder -= useNewlineCount;
                        newlines -= useNewlineCount;
                    } else {
                        newlines = 0;
                    }
                    lineHasContent = false;
                    lineHasWhitespace = false;
                    if (remainder <= 0) {
                        --offset; // Revert character offset
                        break;
                    }
                }

                lineHasContent = (charAttributes === 2); // 3 = character is a newline

                if (lineHasWhitespace) {
                    if (lineHasContent) {
                        content += ' ';
                        lineHasWhitespace = false;
                        if (--remainder <= 0) {
                            --offset; // Revert character offset
                            break;
                        }
                    } else {
                        lineHasWhitespace = false;
                    }
                }

                content += char;

                if (--remainder <= 0) { break; }
            }
        }

        this._lineHasWhitespace = lineHasWhitespace;
        this._lineHasContent = lineHasContent;
        this._content = content;
        this._offset = offset;
        this._remainder = remainder;
        this._newlines = newlines;

        return (remainder > 0);
    }

    /**
     * Seeks backward in a text node.
     * This function is nearly the same as _seekTextNodeForward, with the following differences:
     * - Iteration condition is reversed to check if offset is greater than 0.
     * - offset is reset to nodeValueLength instead of 0.
     * - offset is decremented instead of incremented.
     * - offset is decremented before getting the character.
     * - offset is reverted by incrementing instead of decrementing.
     * - content string is prepended instead of appended.
     * @param textNode The text node to use.
     * @param resetOffset Whether or not the text offset should be reset.
     * @returns true if scanning should continue, or false if the scan length has been reached.
     */
    _seekTextNodeBackward(textNode, resetOffset) {
        const nodeValue = textNode.nodeValue;
        const nodeValueLength = nodeValue.length;
        const [preserveNewlines, preserveWhitespace] = (
            this._forcePreserveWhitespace ?
            [true, true] :
            DOMTextScanner.getWhitespaceSettings(textNode)
        );

        let lineHasWhitespace = this._lineHasWhitespace;
        let lineHasContent = this._lineHasContent;
        let content = this._content;
        let offset = resetOffset ? nodeValueLength : this._offset;
        let remainder = this._remainder;
        let newlines = this._newlines;

        while (offset > 0) {
            --offset;
            const char = nodeValue[offset];
            const charAttributes = DOMTextScanner.getCharacterAttributes(char, preserveNewlines, preserveWhitespace);

            if (charAttributes === 0) {
                // Character should be ignored
                continue;
            } else if (charAttributes === 1) {
                // Character is collapsible whitespace
                lineHasWhitespace = true;
            } else {
                // Character should be added to the content
                if (newlines > 0) {
                    if (content.length > 0) {
                        const useNewlineCount = Math.min(remainder, newlines);
                        content = '\n'.repeat(useNewlineCount) + content;
                        remainder -= useNewlineCount;
                        newlines -= useNewlineCount;
                    } else {
                        newlines = 0;
                    }
                    lineHasContent = false;
                    lineHasWhitespace = false;
                    if (remainder <= 0) {
                        ++offset; // Revert character offset
                        break;
                    }
                }

                lineHasContent = (charAttributes === 2); // 3 = character is a newline

                if (lineHasWhitespace) {
                    if (lineHasContent) {
                        content = ' ' + content;
                        lineHasWhitespace = false;
                        if (--remainder <= 0) {
                            ++offset; // Revert character offset
                            break;
                        }
                    } else {
                        lineHasWhitespace = false;
                    }
                }

                content = char + content;

                if (--remainder <= 0) { break; }
            }
        }

        this._lineHasWhitespace = lineHasWhitespace;
        this._lineHasContent = lineHasContent;
        this._content = content;
        this._offset = offset;
        this._remainder = remainder;
        this._newlines = newlines;

        return (remainder > 0);
    }

    // Static helpers

    /**
     * Gets the next node in the document for a specified scanning direction.
     * @param node The current DOM Node.
     * @param forward Whether to scan forward in the document or backward.
     * @param visitChildren Whether the children of the current node should be visited.
     * @param exitedNodes An array which stores nodes which were exited.
     * @returns The next node in the document, or null if there is no next node.
     */
    static getNextNode(node, forward, visitChildren, exitedNodes) {
        let next = visitChildren ? (forward ? node.firstChild : node.lastChild) : null;
        if (next === null) {
            while (true) {
                exitedNodes.push(node);

                next = (forward ? node.nextSibling : node.previousSibling);
                if (next !== null) { break; }

                next = node.parentNode;
                if (next === null) { break; }

                node = next;
            }
        }
        return next;
    }

    /**
     * Gets the parent element of a given Node.
     * @param node The node to check.
     * @returns The parent element if one exists, otherwise null.
     */
    static getParentElement(node) {
        while (node !== null && node.nodeType !== Node.ELEMENT_NODE) {
            node = node.parentNode;
        }
        return node;
    }

    /**
     * Gets the parent <ruby> element of a given node, if one exists. For efficiency purposes,
     * this only checks the immediate parent elements and does not check all ancestors, so
     * there are cases where the node may be in a ruby element but it is not returned.
     * @param node The node to check.
     * @returns A <ruby> node if the input node is contained in one, otherwise null.
     */
    static getParentRubyElement(node) {
        node = DOMTextScanner.getParentElement(node);
        if (node !== null && node.nodeName.toUpperCase() === 'RT') {
            node = node.parentNode;
            if (node !== null && node.nodeName.toUpperCase() === 'RUBY') {
                return node;
            }
        }
        return null;
    }

    /**
     * @returns [enterable: boolean, newlines: integer]
     *   The enterable value indicates whether the content of this node should be entered.
     *   The newlines value corresponds to the number of newline characters that should be added.
     *     1 newline corresponds to a simple new line in the layout.
     *     2 newlines corresponds to a significant visual distinction since the previous content.
     */
    static getElementSeekInfo(element) {
        let enterable = true;
        switch (element.nodeName.toUpperCase()) {
            case 'HEAD':
            case 'RT':
            case 'SCRIPT':
            case 'STYLE':
                return [false, 0];
            case 'BR':
                return [false, 1];
            case 'TEXTAREA':
            case 'INPUT':
            case 'BUTTON':
                enterable = false;
                break;
        }

        const style = window.getComputedStyle(element);
        const display = style.display;

        const visible = (display !== 'none' && DOMTextScanner.isStyleVisible(style));
        let newlines = 0;

        if (!visible) {
            enterable = false;
        } else {
            switch (style.position) {
                case 'absolute':
                case 'fixed':
                case 'sticky':
                    newlines = 2;
                    break;
            }
            if (newlines === 0 && DOMTextScanner.doesCSSDisplayChangeLayout(display)) {
                newlines = 1;
            }
        }

        return [enterable, newlines];
    }

    /**
     * Gets information about how whitespace characters are treated.
     * @param textNode The Text node to check.
     * @returns [preserveNewlines: boolean, preserveWhitespace: boolean]
     *   The value of preserveNewlines indicates whether or not newline characters are treated as line breaks.
     *   The value of preserveWhitespace indicates whether or not sequences of whitespace characters are collapsed.
     */
    static getWhitespaceSettings(textNode) {
        const element = DOMTextScanner.getParentElement(textNode);
        if (element !== null) {
            const style = window.getComputedStyle(element);
            switch (style.whiteSpace) {
                case 'pre':
                case 'pre-wrap':
                case 'break-spaces':
                    return [true, true];
                case 'pre-line':
                    return [true, false];
            }
        }
        return [false, false];
    }

    /**
     * Gets attributes for the specified character.
     * @param character A string containing a single character.
     * @returns An integer representing the attributes of the character.
     *   0: Character should be ignored.
     *   1: Character is collapsible whitespace.
     *   2: Character should be added to the content.
     *   3: Character should be added to the content and is a newline.
     */
    static getCharacterAttributes(character, preserveNewlines, preserveWhitespace) {
        switch (character.charCodeAt(0)) {
            case 0x09: // Tab ('\t')
            case 0x0c: // Form feed ('\f')
            case 0x0d: // Carriage return ('\r')
            case 0x20: // Space (' ')
                return preserveWhitespace ? 2 : 1;
            case 0x0a: // Line feed ('\n')
                return preserveNewlines ? 3 : 1;
            case 0x200b: // Zero-width space
            case 0x200c: // Zero-width non-joiner
                return 0;
            default: // Other
                return 2;
        }
    }

    /**
     * Checks whether a given style is visible or not.
     * This function does not check style.display === 'none'.
     * @param style An object implementing the CSSStyleDeclaration interface.
     * @returns true if the style should result in an element being visible, otherwise false.
     */
    static isStyleVisible(style) {
        return !(
            style.visibility === 'hidden' ||
            parseFloat(style.opacity) <= 0 ||
            parseFloat(style.fontSize) <= 0 ||
            (
                !DOMTextScanner.isStyleSelectable(style) &&
                (
                    DOMTextScanner.isCSSColorTransparent(style.color) ||
                    DOMTextScanner.isCSSColorTransparent(style.webkitTextFillColor)
                )
            )
        );
    }

    /**
     * Checks whether a given style is selectable or not.
     * @param style An object implementing the CSSStyleDeclaration interface.
     * @returns true if the style is selectable, otherwise false.
     */
    static isStyleSelectable(style) {
        return !(
            style.userSelect === 'none' ||
            style.webkitUserSelect === 'none' ||
            style.MozUserSelect === 'none' ||
            style.msUserSelect === 'none'
        );
    }

    /**
     * Checks whether a CSS color is transparent or not.
     * @param cssColor A CSS color string, expected to be encoded in rgb(a) form.
     * @returns true if the color is transparent, otherwise false.
     */
    static isCSSColorTransparent(cssColor) {
        return (
            typeof cssColor === 'string' &&
            cssColor.startsWith('rgba(') &&
            /,\s*0.?0*\)$/.test(cssColor)
        );
    }

    /**
     * Checks whether a CSS display value will cause a layout change for text.
     * @param cssDisplay A CSS string corresponding to the value of the display property.
     * @returns true if the layout is changed by this value, otherwise false.
     */
    static doesCSSDisplayChangeLayout(cssDisplay) {
        let pos = cssDisplay.indexOf(' ');
        if (pos >= 0) {
            // Truncate to <display-outside> part
            cssDisplay = cssDisplay.substring(0, pos);
        }

        pos = cssDisplay.indexOf('-');
        if (pos >= 0) {
            // Truncate to first part of kebab-case value
            cssDisplay = cssDisplay.substring(0, pos);
        }

        switch (cssDisplay) {
            case 'block':
            case 'flex':
            case 'grid':
            case 'list': // list-item
            case 'table': // table, table-*
                return true;
            case 'ruby': // rubt-*
                return (pos >= 0);
            default:
                return false;
        }
    }
}
