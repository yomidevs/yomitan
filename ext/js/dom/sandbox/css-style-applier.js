/*
 * Copyright (C) 2021-2022  Yomichan Authors
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
 * This class is used to apply CSS styles to elements using a consistent method
 * that is the same across different browsers.
 */
class CssStyleApplier {
    /**
     * @typedef {object} CssRule
     * @property {string} selectors A CSS selector string representing one or more selectors.
     * @property {[string, string][]} styles A list of CSS property and value pairs.
     * @property {string} styles[][0] The CSS property.
     * @property {string} styles[][1] The CSS value.
     */

    /**
     * Creates a new instance of the class.
     * @param styleDataUrl The local URL to the JSON file continaing the style rules.
     *   The style rules should be of the format:
     *   [
     *     {
     *       selectors: [(selector:string)...],
     *       styles: [
     *         [(property:string), (value:string)]...
     *       ]
     *     }...
     *   ]
     */
    constructor(styleDataUrl) {
        this._styleDataUrl = styleDataUrl;
        this._styleData = [];
        this._cachedRules = new Map();
        // eslint-disable-next-line no-control-regex
        this._patternHtmlWhitespace = /[\t\r\n\x0C ]+/g;
        this._patternClassNameCharacter = /[0-9a-zA-Z-_]/;
    }

    /**
     * Loads the data file for use.
     */
    async prepare() {
        let styleData;
        try {
            styleData = await this._fetchJsonAsset(this._styleDataUrl);
        } catch (e) {
            console.error(e);
        }
        if (Array.isArray(styleData)) {
            this._styleData = styleData;
        }
    }

    /**
     * Applies CSS styles directly to the "style" attribute using the "class" attribute.
     * This only works for elements with a single class.
     * @param elements An iterable collection of HTMLElement objects.
     */
    applyClassStyles(elements) {
        const elementStyles = [];
        for (const element of elements) {
            const className = element.getAttribute('class');
            if (className.length === 0) { continue; }
            let cssTextNew = '';
            for (const {selectorText, styles} of this._getCandidateCssRulesForClass(className)) {
                if (!element.matches(selectorText)) { continue; }
                cssTextNew += this._getCssText(styles);
            }
            cssTextNew += element.style.cssText;
            elementStyles.push({element, style: cssTextNew});
        }
        for (const {element, style} of elementStyles) {
            element.removeAttribute('class');
            if (style.length > 0) {
                element.setAttribute('style', style);
            } else {
                element.removeAttribute('style');
            }
        }
    }

    // Private

    async _fetchJsonAsset(url) {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'default',
            credentials: 'omit',
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * Gets an array of candidate CSS rules which might match a specific class.
     * @param {string} className A whitespace-separated list of classes.
     * @returns {CssRule[]} An array of candidate CSS rules.
     */
    _getCandidateCssRulesForClass(className) {
        let rules = this._cachedRules.get(className);
        if (typeof rules !== 'undefined') { return rules; }

        rules = [];
        this._cachedRules.set(className, rules);

        const classList = this._getTokens(className);
        for (const {selectors, styles} of this._styleData) {
            const selectorText = selectors.join(',');
            if (!this._selectorMatches(selectorText, classList)) { continue; }
            rules.push({selectorText, styles});
        }

        return rules;
    }

    _getCssText(styles) {
        let cssText = '';
        for (const [property, value] of styles) {
            cssText += `${property}:${value};`;
        }
        return cssText;
    }

    _selectorMatches(selectorText, classList) {
        const pattern = this._patternClassNameCharacter;
        for (const item of classList) {
            const prefixedItem = `.${item}`;
            let start = 0;
            while (true) {
                const index = selectorText.indexOf(prefixedItem, start);
                if (index < 0) { break; }
                start = index + prefixedItem.length;
                if (start >= selectorText.length || !pattern.test(selectorText[start])) { return true; }
            }
        }
        return false;
    }

    _getTokens(tokenListString) {
        let start = 0;
        const pattern = this._patternHtmlWhitespace;
        pattern.lastIndex = 0;
        const result = [];
        while (true) {
            const match = pattern.exec(tokenListString);
            const end = match === null ? tokenListString.length : match.index;
            if (end > start) { result.push(tokenListString.substring(start, end)); }
            if (match === null) { return result; }
            start = end + match[0].length;
        }
    }
}
