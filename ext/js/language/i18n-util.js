/*
 * Copyright (C) 2023-2026  Yomitan Authors
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
 * Chrome extension i18n helpers.
 * HTML localization attributes:
 * - data-i18n="key" — sets textContent
 * - data-i18n-html="key" — sets innerHTML (messages may contain simple markup)
 * - data-i18n-title="key" — sets title
 * - data-i18n-placeholder="key" — sets placeholder
 * - data-i18n-aria-label="key" — sets aria-label
 * - data-i18n-value="key" — sets value (inputs/buttons)
 * - data-i18n-args="a,b" — optional comma-separated substitution args for $1, $2, ...
 */

/**
 * @param {string} key
 * @param {string[]|undefined} [substitutions]
 * @returns {string}
 */
export function getMessage(key, substitutions) {
    try {
        const message = typeof substitutions === 'undefined' ?
            chrome.i18n.getMessage(key) :
            chrome.i18n.getMessage(key, substitutions);
        return message || '';
    } catch (e) {
        return '';
    }
}

/**
 * @param {string|null|undefined} raw
 * @returns {string[]|undefined}
 */
function parseArgs(raw) {
    if (typeof raw !== 'string' || raw.length === 0) { return void 0; }
    return raw.split(',').map((part) => part.trim());
}

/**
 * @param {Element} element
 */
export function applyI18nToElement(element) {
    if (!(element instanceof HTMLElement) && !(element instanceof Element)) { return; }
    const el = /** @type {HTMLElement} */ (element);
    const {dataset} = el;

    if (typeof dataset.i18n === 'string' && dataset.i18n.length > 0) {
        const message = getMessage(dataset.i18n, parseArgs(dataset.i18nArgs));
        if (message) { el.textContent = message; }
    }

    if (typeof dataset.i18nHtml === 'string' && dataset.i18nHtml.length > 0) {
        const message = getMessage(dataset.i18nHtml, parseArgs(dataset.i18nArgs));
        if (message) {
            // Trusted extension locale strings (ext/_locales/*/messages.json), not user input.
            // eslint-disable-next-line no-unsanitized/property
            el.innerHTML = message;
        }
    }

    if (typeof dataset.i18nTitle === 'string' && dataset.i18nTitle.length > 0) {
        const message = getMessage(dataset.i18nTitle, parseArgs(dataset.i18nTitleArgs));
        if (message) { el.title = message; }
    }

    if (typeof dataset.i18nPlaceholder === 'string' && dataset.i18nPlaceholder.length > 0) {
        const message = getMessage(dataset.i18nPlaceholder, parseArgs(dataset.i18nPlaceholderArgs));
        if (message && 'placeholder' in el) {
            /** @type {HTMLInputElement} */ (el).placeholder = message;
        }
    }

    if (typeof dataset.i18nAriaLabel === 'string' && dataset.i18nAriaLabel.length > 0) {
        const message = getMessage(dataset.i18nAriaLabel, parseArgs(dataset.i18nAriaLabelArgs));
        if (message) { el.setAttribute('aria-label', message); }
    }

    if (typeof dataset.i18nValue === 'string' && dataset.i18nValue.length > 0) {
        const message = getMessage(dataset.i18nValue, parseArgs(dataset.i18nValueArgs));
        if (message && 'value' in el) {
            /** @type {HTMLInputElement} */ (el).value = message;
        }
    }
}

/**
 * @param {ParentNode} root
 */
export function applyI18nToRoot(root) {
    const selector = [
        '[data-i18n]',
        '[data-i18n-html]',
        '[data-i18n-title]',
        '[data-i18n-placeholder]',
        '[data-i18n-aria-label]',
        '[data-i18n-value]',
    ].join(',');

    if (root instanceof Element && root.matches(selector)) {
        applyI18nToElement(root);
    }

    const nodes = root.querySelectorAll(selector);
    for (const node of nodes) {
        applyI18nToElement(node);
    }

    // Document title
    if (root instanceof Document) {
        const titleKey = root.documentElement?.dataset?.i18nTitleKey;
        if (typeof titleKey === 'string' && titleKey.length > 0) {
            const message = getMessage(titleKey);
            if (message) { root.title = message; }
        }
    }
}

/**
 * Localize the current document (static HTML).
 */
export function applyI18nToDocument() {
    applyI18nToRoot(document);
    const lang = getUILanguage();
    if (lang) {
        document.documentElement.lang = lang.split('-')[0];
    }
}

/**
 * @returns {string}
 */
export function getUILanguage() {
    try {
        return chrome.i18n.getUILanguage() || 'en';
    } catch (e) {
        return 'en';
    }
}

/**
 * Localize well-known default Anki card format names (stored as English in options).
 * Custom user names are returned unchanged.
 * @param {string} name
 * @returns {string}
 */
export function localizeCardFormatName(name) {
    /** @type {Record<string, string>} */
    const known = {
        Expression: 'ui_card_format_expression',
        Reading: 'ui_card_format_reading',
        Kanji: 'ui_card_format_kanji',
        Hanzi: 'ui_card_format_hanzi',
    };
    const key = known[name];
    if (typeof key === 'string') {
        const message = getMessage(key);
        if (message) { return message; }
    }
    const formatMatch = /^Format (\d+)$/.exec(name);
    if (formatMatch !== null) {
        const message = getMessage('ui_card_format_n', [formatMatch[1]]);
        if (message) { return message; }
    }
    return name;
}
