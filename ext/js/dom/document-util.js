/*
 * Copyright (C) 2023-2024  Yomitan Authors
 * Copyright (C) 2016-2022  Yomichan Authors
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
 * This variable is stateful, but it is only used to do feature detection,
 * and its value should be constant for the lifetime of the extension.
 * @type {?boolean}
 */
let cssZoomSupported = null;

/**
 * Computes the scaling adjustment that is necessary for client space coordinates based on the
 * CSS zoom level.
 * @param {?Node} node A node in the document.
 * @returns {number} The scaling factor.
 */
export function computeZoomScale(node) {
    if (cssZoomSupported === null) {
        cssZoomSupported = computeCssZoomSupported();
    }
    if (!cssZoomSupported) { return 1; }
    // documentElement must be excluded because the computer style of its zoom property is inconsistent.
    // * If CSS `:root{zoom:X;}` is specified, the computed zoom will always report `X`.
    // * If CSS `:root{zoom:X;}` is not specified, the computed zoom report the browser's zoom level.
    // Therefor, if CSS root zoom is specified as a value other than 1, the adjusted {x, y} values
    // would be incorrect, which is not new behaviour.
    let scale = 1;
    const {ELEMENT_NODE, DOCUMENT_FRAGMENT_NODE} = Node;
    const {documentElement} = document;
    for (; node !== null && node !== documentElement; node = node.parentNode) {
        const {nodeType} = node;
        if (nodeType === DOCUMENT_FRAGMENT_NODE) {
            const {host} = /** @type {ShadowRoot} */ (node);
            if (typeof host !== 'undefined') {
                node = host;
            }
            continue;
        } else if (nodeType !== ELEMENT_NODE) {
            continue;
        }
        const zoomString = getComputedStyle(/** @type {HTMLElement} */ (node)).getPropertyValue('zoom');
        if (typeof zoomString !== 'string' || zoomString.length === 0) { continue; }
        const zoom = Number.parseFloat(zoomString);
        if (!Number.isFinite(zoom) || zoom === 0) { continue; }
        scale *= zoom;
    }
    return scale;
}

/**
 * Converts a rect based on the CSS zoom scaling for a given node.
 * @param {DOMRect} rect The rect to convert.
 * @param {Node} node The node to compute the zoom from.
 * @returns {DOMRect} The updated rect, or the same rect if no change is needed.
 */
export function convertRectZoomCoordinates(rect, node) {
    const scale = computeZoomScale(node);
    return (scale === 1 ? rect : new DOMRect(rect.left * scale, rect.top * scale, rect.width * scale, rect.height * scale));
}

/**
 * Converts multiple rects based on the CSS zoom scaling for a given node.
 * @param {DOMRect[]|DOMRectList} rects The rects to convert.
 * @param {Node} node The node to compute the zoom from.
 * @returns {DOMRect[]} The updated rects, or the same rects array if no change is needed.
 */
export function convertMultipleRectZoomCoordinates(rects, node) {
    const scale = computeZoomScale(node);
    if (scale === 1) { return [...rects]; }
    const results = [];
    for (const rect of rects) {
        results.push(new DOMRect(rect.left * scale, rect.top * scale, rect.width * scale, rect.height * scale));
    }
    return results;
}

/**
 * Checks whether a given point is contained within a rect.
 * @param {number} x The horizontal coordinate.
 * @param {number} y The vertical coordinate.
 * @param {DOMRect} rect The rect to check.
 * @returns {boolean} `true` if the point is inside the rect, `false` otherwise.
 */
export function isPointInRect(x, y, rect) {
    return (
        x >= rect.left && x < rect.right &&
        y >= rect.top && y < rect.bottom
    );
}

/**
 * Checks whether a given point is contained within any rect in a list.
 * @param {number} x The horizontal coordinate.
 * @param {number} y The vertical coordinate.
 * @param {DOMRect[]|DOMRectList} rects The rect to check.
 * @returns {boolean} `true` if the point is inside any of the rects, `false` otherwise.
 */
export function isPointInAnyRect(x, y, rects) {
    for (const rect of rects) {
        if (isPointInRect(x, y, rect)) {
            return true;
        }
    }
    return false;
}

/**
 * Checks whether a given point is contained within a selection range.
 * @param {number} x The horizontal coordinate.
 * @param {number} y The vertical coordinate.
 * @param {Selection} selection The selection to check.
 * @returns {boolean} `true` if the point is inside the selection, `false` otherwise.
 */
export function isPointInSelection(x, y, selection) {
    for (let i = 0; i < selection.rangeCount; ++i) {
        const range = selection.getRangeAt(i);
        if (isPointInAnyRect(x, y, range.getClientRects())) {
            return true;
        }
    }
    return false;
}

/**
 * Gets an array of the active modifier keys.
 * @param {KeyboardEvent|MouseEvent|TouchEvent} event The event to check.
 * @returns {import('input').ModifierKey[]} An array of modifiers.
 */
export function getActiveModifiers(event) {
    /** @type {import('input').ModifierKey[]} */
    const modifiers = [];
    if (event.altKey) { modifiers.push('alt'); }
    if (event.ctrlKey) { modifiers.push('ctrl'); }
    if (event.metaKey) { modifiers.push('meta'); }
    if (event.shiftKey) { modifiers.push('shift'); }

    // For KeyboardEvent, when modifiers are pressed on Firefox without any other keys, the keydown event does not always contain the last pressed modifier as event.{modifier}
    // This occurs when the focus is in a textarea element, an input element, or when the raw keycode is not a modifier but the virtual keycode is (this often occurs due to OS level keyboard remapping)
    // Chrome and Firefox (outside of textareas, inputs, and virtual keycodes) do report the modifier in both the event.{modifier} and the event.code
    // We must check if the modifier has already been added to not duplicate it
    if (event instanceof KeyboardEvent) {
        if ((event.code === 'AltLeft' || event.code === 'AltRight' || event.key === 'Alt') && !modifiers.includes('alt')) { modifiers.push('alt'); }
        if ((event.code === 'ControlLeft' || event.code === 'ControlRight' || event.key === 'Control') && !modifiers.includes('ctrl')) { modifiers.push('ctrl'); }
        if ((event.code === 'MetaLeft' || event.code === 'MetaRight' || event.key === 'Meta') && !modifiers.includes('meta')) { modifiers.push('meta'); }
        if ((event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.key === 'Shift') && !modifiers.includes('shift')) { modifiers.push('shift'); }
    }
    return modifiers;
}

/**
 * Gets an array of the active modifier keys and buttons.
 * @param {KeyboardEvent|MouseEvent|TouchEvent} event The event to check.
 * @returns {import('input').Modifier[]} An array of modifiers and buttons.
 */
export function getActiveModifiersAndButtons(event) {
    /** @type {import('input').Modifier[]} */
    const modifiers = getActiveModifiers(event);
    if (event instanceof MouseEvent) {
        getActiveButtonsInternal(event, modifiers);
    }
    return modifiers;
}

/**
 * Gets an array of the active buttons.
 * @param {MouseEvent} event The event to check.
 * @returns {import('input').ModifierMouseButton[]} An array of modifiers and buttons.
 */
export function getActiveButtons(event) {
    /** @type {import('input').ModifierMouseButton[]} */
    const buttons = [];
    getActiveButtonsInternal(event, buttons);
    return buttons;
}

/**
 * Adds a fullscreen change event listener. This function handles all of the browser-specific variants.
 * @param {EventListener} onFullscreenChanged The event callback.
 * @param {?import('../core/event-listener-collection.js').EventListenerCollection} eventListenerCollection An optional `EventListenerCollection` to add the registration to.
 */
export function addFullscreenChangeEventListener(onFullscreenChanged, eventListenerCollection = null) {
    const target = document;
    const options = false;
    const fullscreenEventNames = [
        'fullscreenchange',
        'MSFullscreenChange',
        'mozfullscreenchange',
        'webkitfullscreenchange',
    ];
    for (const eventName of fullscreenEventNames) {
        if (eventListenerCollection === null) {
            target.addEventListener(eventName, onFullscreenChanged, options);
        } else {
            eventListenerCollection.addEventListener(target, eventName, onFullscreenChanged, options);
        }
    }
}

/**
 * Returns the current fullscreen element. This function handles all of the browser-specific variants.
 * @returns {?Element} The current fullscreen element, or `null` if the window is not fullscreen.
 */
export function getFullscreenElement() {
    return (
        document.fullscreenElement ||
        // @ts-expect-error - vendor prefix
        document.msFullscreenElement ||
        // @ts-expect-error - vendor prefix
        document.mozFullScreenElement ||
        // @ts-expect-error - vendor prefix
        document.webkitFullscreenElement ||
        null
    );
}

/**
 * Gets all of the nodes within a `Range`.
 * @param {Range} range The range to check.
 * @returns {Node[]} The list of nodes.
 */
export function getNodesInRange(range) {
    const end = range.endContainer;
    const nodes = [];
    for (let node = /** @type {?Node} */ (range.startContainer); node !== null; node = getNextNode(node)) {
        nodes.push(node);
        if (node === end) { break; }
    }
    return nodes;
}

/**
 * Gets the next node after a specified node. This traverses the DOM in its logical order.
 * @param {Node} node The node to start at.
 * @returns {?Node} The next node, or `null` if there is no next node.
 */
export function getNextNode(node) {
    let next = /** @type {?Node} */ (node.firstChild);
    if (next === null) {
        while (true) {
            next = node.nextSibling;
            if (next !== null) { break; }

            next = node.parentNode;
            if (next === null) { break; }

            node = next;
        }
    }
    return next;
}

/**
 * Checks whether any node in a list of nodes matches a selector.
 * @param {Node[]} nodes The list of ndoes to check.
 * @param {string} selector The selector to test.
 * @returns {boolean} `true` if any element node matches the selector, `false` otherwise.
 */
export function anyNodeMatchesSelector(nodes, selector) {
    const ELEMENT_NODE = Node.ELEMENT_NODE;
    // This is a rather ugly way of getting the "node" variable to be a nullable
    for (let node of /** @type {(?Node)[]} */ (nodes)) {
        while (node !== null) {
            if (node.nodeType !== ELEMENT_NODE) {
                node = node.parentNode;
                continue;
            }
            if (/** @type {HTMLElement} */ (node).matches(selector)) { return true; }
            break;
        }
    }
    return false;
}

/**
 * Checks whether every node in a list of nodes matches a selector.
 * @param {Node[]} nodes The list of ndoes to check.
 * @param {string} selector The selector to test.
 * @returns {boolean} `true` if every element node matches the selector, `false` otherwise.
 */
export function everyNodeMatchesSelector(nodes, selector) {
    const ELEMENT_NODE = Node.ELEMENT_NODE;
    // This is a rather ugly way of getting the "node" variable to be a nullable
    for (let node of /** @type {(?Node)[]} */ (nodes)) {
        while (true) {
            if (node === null) { return false; }
            if (node.nodeType === ELEMENT_NODE && /** @type {HTMLElement} */ (node).matches(selector)) { break; }
            node = node.parentNode;
        }
    }
    return true;
}

/**
 * Checks whether the meta key is supported in the browser on the specified operating system.
 * @param {string} os The operating system to check.
 * @param {string} browser The browser to check.
 * @returns {boolean} `true` if supported, `false` otherwise.
 */
export function isMetaKeySupported(os, browser) {
    return !(browser === 'firefox' || browser === 'firefox-mobile') || os === 'mac';
}

/**
 * Checks whether an element on the page that can accept input is focused.
 * @returns {boolean} `true` if an input element is focused, `false` otherwise.
 */
export function isInputElementFocused() {
    const element = document.activeElement;
    if (element === null) { return false; }
    const type = element.nodeName.toUpperCase();
    switch (type) {
        case 'INPUT':
        case 'TEXTAREA':
        case 'SELECT':
            return true;
        default:
            return element instanceof HTMLElement && element.isContentEditable;
    }
}

/**
 * Offsets an array of DOMRects by a given amount.
 * @param {DOMRect[]} rects The DOMRects to offset.
 * @param {number} x The horizontal offset amount.
 * @param {number} y The vertical offset amount.
 * @returns {DOMRect[]} The DOMRects with the offset applied.
 */
export function offsetDOMRects(rects, x, y) {
    const results = [];
    for (const rect of rects) {
        results.push(new DOMRect(rect.left + x, rect.top + y, rect.width, rect.height));
    }
    return results;
}

/**
 * Gets the parent writing mode of an element.
 * See: https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode.
 * @param {?Element} element The HTML element to check.
 * @returns {import('document-util').NormalizedWritingMode} The writing mode.
 */
export function getElementWritingMode(element) {
    if (element !== null) {
        const {writingMode} = getComputedStyle(element);
        if (typeof writingMode === 'string') {
            return normalizeWritingMode(writingMode);
        }
    }
    return 'horizontal-tb';
}

/**
 * Normalizes a CSS writing mode value by converting non-standard and deprecated values
 * into their corresponding standard vaules.
 * @param {string} writingMode The writing mode to normalize.
 * @returns {import('document-util').NormalizedWritingMode} The normalized writing mode.
 */
export function normalizeWritingMode(writingMode) {
    switch (writingMode) {
        case 'tb':
            return 'vertical-lr';
        case 'tb-rl':
            return 'vertical-rl';
        case 'horizontal-tb':
        case 'vertical-rl':
        case 'vertical-lr':
        case 'sideways-rl':
        case 'sideways-lr':
            return writingMode;
        default: // 'lr', 'lr-tb', 'rl'
            return 'horizontal-tb';
    }
}

/**
 * Converts a value from an element to a number.
 * @param {string} valueString A string representation of a number.
 * @param {import('document-util').ToNumberConstraints} constraints An object which might contain `min`, `max`, and `step` fields which are used to constrain the value.
 * @returns {number} The parsed and constrained number.
 */
export function convertElementValueToNumber(valueString, constraints) {
    let value = Number.parseFloat(valueString);
    if (!Number.isFinite(value)) { value = 0; }

    const min = convertToNumberOrNull(constraints.min);
    const max = convertToNumberOrNull(constraints.max);
    const step = convertToNumberOrNull(constraints.step);
    if (typeof min === 'number') { value = Math.max(value, min); }
    if (typeof max === 'number') { value = Math.min(value, max); }
    if (typeof step === 'number' && step !== 0) { value = Math.round(value / step) * step; }
    return value;
}

/**
 * @param {string} value
 * @returns {?import('input').Modifier}
 */
export function normalizeModifier(value) {
    switch (value) {
        case 'alt':
        case 'ctrl':
        case 'meta':
        case 'shift':
        case 'mouse0':
        case 'mouse1':
        case 'mouse2':
        case 'mouse3':
        case 'mouse4':
        case 'mouse5':
            return value;
        default:
            return null;
    }
}

/**
 * @param {string} value
 * @returns {?import('input').ModifierKey}
 */
export function normalizeModifierKey(value) {
    switch (value) {
        case 'alt':
        case 'ctrl':
        case 'meta':
        case 'shift':
            return value;
        default:
            return null;
    }
}

/**
 * @param {MouseEvent} event The event to check.
 * @param {import('input').ModifierMouseButton[]|import('input').Modifier[]} array
 */
function getActiveButtonsInternal(event, array) {
    let {buttons} = event;
    if (typeof buttons === 'number' && buttons > 0) {
        for (let i = 0; i < 6; ++i) {
            const buttonFlag = (1 << i);
            if ((buttons & buttonFlag) !== 0) {
                array.push(/** @type {import('input').ModifierMouseButton} */ (`mouse${i}`));
                buttons &= ~buttonFlag;
                if (buttons === 0) { break; }
            }
        }
    }
}

/**
 * @param {string|number|undefined} value
 * @returns {?number}
 */
function convertToNumberOrNull(value) {
    if (typeof value !== 'number') {
        if (typeof value !== 'string' || value.length === 0) {
            return null;
        }
        value = Number.parseFloat(value);
    }
    return !Number.isNaN(value) ? value : null;
}

/**
 * Computes whether or not this browser and document supports CSS zoom, which is primarily a legacy Chromium feature.
 * @returns {boolean}
 */
function computeCssZoomSupported() {
    // 'style' can be undefined in certain contexts, such as when document is an SVG document.
    const {style} = document.createElement('div');
    return (
        typeof style === 'object' &&
        style !== null &&
        // @ts-expect-error - zoom is a non-standard property.
        typeof style.zoom === 'string'
    );
}
