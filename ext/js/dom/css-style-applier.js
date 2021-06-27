/*
 * Copyright (C) 2021  Yomichan Authors
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
    }

    /**
     * Loads the data file for use.
     */
    async prepare() {
        this._styleData = await this._fetchJsonAsset(this._styleDataUrl);
    }

    /**
     * Applies CSS styles directly to the "style" attribute using the "class" attribute.
     * This only works for elements with a single class.
     * @param elements An iterable collection of HTMLElement objects.
     */
    applyClassStyles(elements) {
        const elementStyles = [];
        for (const element of elements) {
            const {className} = element;
            if (className.length === 0) { continue; }
            let cssTextNew = '';
            if (className.indexOf('th') >= 0) {
                console.log(className, this._getRulesForClass(className));
            }
            for (const {selectorText, styles} of this._getRulesForClass(className)) {
                if (!element.matches(selectorText)) { continue; }
                cssTextNew += this._getCssText(styles);
            }
            cssTextNew += element.style.cssText;
            elementStyles.push({element, style: cssTextNew});
        }
        for (const {element, style} of elementStyles) {
            element.removeAttribute('class');
            element.setAttribute('style', style);
        }
    }

    // Private

    async _fetchJsonAsset(url) {
        const response = await fetch(chrome.runtime.getURL(url), {
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

    _getRulesForClass(className) {
        let rules = this._cachedRules.get(className);
        if (typeof rules !== 'undefined') { return rules; }

        rules = [];
        this._cachedRules.set(className, rules);

        const classNamePattern = new RegExp(`.${className}(?![0-9a-zA-Z-])`, '');
        for (const {selectors, styles} of this._styleData) {
            const selectorText = selectors.join(',');
            if (!classNamePattern.test(selectorText)) { continue; }
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
}
