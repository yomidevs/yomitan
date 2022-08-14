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

class StructuredContentGenerator {
    constructor(contentManager, japaneseUtil, document) {
        this._contentManager = contentManager;
        this._japaneseUtil = japaneseUtil;
        this._document = document;
    }

    appendStructuredContent(node, content, dictionary) {
        node.classList.add('structured-content');
        this._appendStructuredContent(node, content, dictionary, null);
    }

    createStructuredContent(content, dictionary) {
        const node = this._createElement('span', 'structured-content');
        this._appendStructuredContent(node, content, dictionary, null);
        return node;
    }

    createDefinitionImage(data, dictionary) {
        const {
            path,
            width,
            height,
            preferredWidth,
            preferredHeight,
            title,
            pixelated,
            imageRendering,
            appearance,
            background,
            collapsed,
            collapsible,
            verticalAlign,
            sizeUnits
        } = data;

        const hasPreferredWidth = (typeof preferredWidth === 'number');
        const hasPreferredHeight = (typeof preferredHeight === 'number');
        const invAspectRatio = (
            hasPreferredWidth && hasPreferredHeight ?
            preferredHeight / preferredWidth :
            height / width
        );
        const usedWidth = (
            hasPreferredWidth ?
            preferredWidth :
            (hasPreferredHeight ? preferredHeight / invAspectRatio : width)
        );

        const node = this._createElement('a', 'gloss-image-link');
        node.target = '_blank';
        node.rel = 'noreferrer noopener';

        const imageContainer = this._createElement('span', 'gloss-image-container');
        node.appendChild(imageContainer);

        const aspectRatioSizer = this._createElement('span', 'gloss-image-sizer');
        imageContainer.appendChild(aspectRatioSizer);

        const imageBackground = this._createElement('span', 'gloss-image-background');
        imageContainer.appendChild(imageBackground);

        const image = this._createElement('img', 'gloss-image');
        image.alt = '';
        imageContainer.appendChild(image);

        const overlay = this._createElement('span', 'gloss-image-container-overlay');
        imageContainer.appendChild(overlay);

        const linkText = this._createElement('span', 'gloss-image-link-text');
        linkText.textContent = 'Image';
        node.appendChild(linkText);

        node.dataset.path = path;
        node.dataset.dictionary = dictionary;
        node.dataset.imageLoadState = 'not-loaded';
        node.dataset.hasAspectRatio = 'true';
        node.dataset.imageRendering = typeof imageRendering === 'string' ? imageRendering : (pixelated ? 'pixelated' : 'auto');
        node.dataset.appearance = typeof appearance === 'string' ? appearance : 'auto';
        node.dataset.background = typeof background === 'boolean' ? `${background}` : 'true';
        node.dataset.collapsed = typeof collapsed === 'boolean' ? `${collapsed}` : 'false';
        node.dataset.collapsible = typeof collapsible === 'boolean' ? `${collapsible}` : 'true';
        if (typeof verticalAlign === 'string') {
            node.dataset.verticalAlign = verticalAlign;
        }
        if (typeof sizeUnits === 'string' && (hasPreferredWidth || hasPreferredHeight)) {
            node.dataset.sizeUnits = sizeUnits;
        }

        imageContainer.style.width = `${usedWidth}em`;
        if (typeof title === 'string') {
            imageContainer.title = title;
        }

        aspectRatioSizer.style.paddingTop = `${invAspectRatio * 100.0}%`;

        if (this._contentManager !== null) {
            this._contentManager.loadMedia(
                path,
                dictionary,
                (url) => this._setImageData(node, image, imageBackground, url, false),
                () => this._setImageData(node, image, imageBackground, null, true)
            );
        }

        return node;
    }

    // Private

    _appendStructuredContent(container, content, dictionary, language) {
        if (typeof content === 'string') {
            if (content.length > 0) {
                container.appendChild(this._createTextNode(content));
                if (language === null && this._japaneseUtil.isStringPartiallyJapanese(content)) {
                    container.lang = 'ja';
                }
            }
            return;
        }
        if (!(typeof content === 'object' && content !== null)) {
            return;
        }
        if (Array.isArray(content)) {
            for (const item of content) {
                this._appendStructuredContent(container, item, dictionary, language);
            }
            return;
        }
        const node = this._createStructuredContentGenericElement(content, dictionary, language);
        if (node !== null) {
            container.appendChild(node);
        }
    }

    _createElement(tagName, className) {
        const node = this._document.createElement(tagName);
        node.className = className;
        return node;
    }

    _createTextNode(data) {
        return this._document.createTextNode(data);
    }

    _setElementDataset(element, data) {
        for (let [key, value] of Object.entries(data)) {
            if (key.length > 0) {
                key = `${key[0].toUpperCase()}${key.substring(1)}`;
            }
            key = `sc${key}`;
            try {
                element.dataset[key] = value;
            } catch (e) {
                // DOMException if key is malformed
            }
        }
    }

    _setImageData(node, image, imageBackground, url, unloaded) {
        if (url !== null) {
            image.src = url;
            node.href = url;
            node.dataset.imageLoadState = 'loaded';
            imageBackground.style.setProperty('--image', `url("${url}")`);
        } else {
            image.removeAttribute('src');
            node.removeAttribute('href');
            node.dataset.imageLoadState = unloaded ? 'unloaded' : 'load-error';
            imageBackground.style.removeProperty('--image');
        }
    }

    _createStructuredContentGenericElement(content, dictionary, language) {
        const {tag} = content;
        switch (tag) {
            case 'br':
                return this._createStructuredContentElement(tag, content, dictionary, language, 'simple', false, false);
            case 'ruby':
            case 'rt':
            case 'rp':
                return this._createStructuredContentElement(tag, content, dictionary, language, 'simple', true, false);
            case 'table':
                return this._createStructuredContentTableElement(tag, content, dictionary, language);
            case 'thead':
            case 'tbody':
            case 'tfoot':
            case 'tr':
                return this._createStructuredContentElement(tag, content, dictionary, language, 'table', true, false);
            case 'th':
            case 'td':
                return this._createStructuredContentElement(tag, content, dictionary, language, 'table-cell', true, true);
            case 'div':
            case 'span':
            case 'ol':
            case 'ul':
            case 'li':
                return this._createStructuredContentElement(tag, content, dictionary, language, 'simple', true, true);
            case 'img':
                return this.createDefinitionImage(content, dictionary);
            case 'a':
                return this._createLinkElement(content, dictionary, language);
        }
        return null;
    }

    _createStructuredContentTableElement(tag, content, dictionary, language) {
        const container = this._createElement('div', 'gloss-sc-table-container');
        const table = this._createStructuredContentElement(tag, content, dictionary, language, 'table', true, false);
        container.appendChild(table);
        return container;
    }

    _createStructuredContentElement(tag, content, dictionary, language, type, hasChildren, hasStyle) {
        const node = this._createElement(tag, `gloss-sc-${tag}`);
        const {data, lang} = content;
        if (typeof data === 'object' && data !== null) { this._setElementDataset(node, data); }
        if (typeof lang === 'string') {
            node.lang = lang;
            language = lang;
        }
        switch (type) {
            case 'table-cell':
                {
                    const {colSpan, rowSpan} = content;
                    if (typeof colSpan === 'number') { node.colSpan = colSpan; }
                    if (typeof rowSpan === 'number') { node.rowSpan = rowSpan; }
                }
                break;
        }
        if (hasStyle) {
            const {style} = content;
            if (typeof style === 'object' && style !== null) {
                this._setStructuredContentElementStyle(node, style);
            }
        }
        if (hasChildren) {
            this._appendStructuredContent(node, content.content, dictionary, language);
        }
        return node;
    }

    _setStructuredContentElementStyle(node, contentStyle) {
        const {style} = node;
        const {
            fontStyle,
            fontWeight,
            fontSize,
            textDecorationLine,
            verticalAlign,
            textAlign,
            marginTop,
            marginLeft,
            marginRight,
            marginBottom,
            listStyleType
        } = contentStyle;
        if (typeof fontStyle === 'string') { style.fontStyle = fontStyle; }
        if (typeof fontWeight === 'string') { style.fontWeight = fontWeight; }
        if (typeof fontSize === 'string') { style.fontSize = fontSize; }
        if (typeof verticalAlign === 'string') { style.verticalAlign = verticalAlign; }
        if (typeof textAlign === 'string') { style.textAlign = textAlign; }
        if (typeof textDecorationLine === 'string') {
            style.textDecoration = textDecorationLine;
        } else if (Array.isArray(textDecorationLine)) {
            style.textDecoration = textDecorationLine.join(' ');
        }
        if (typeof marginTop === 'number') { style.marginTop = `${marginTop}em`; }
        if (typeof marginLeft === 'number') { style.marginLeft = `${marginLeft}em`; }
        if (typeof marginRight === 'number') { style.marginRight = `${marginRight}em`; }
        if (typeof marginBottom === 'number') { style.marginBottom = `${marginBottom}em`; }
        if (typeof listStyleType === 'string') { style.listStyleType = listStyleType; }
    }

    _createLinkElement(content, dictionary, language) {
        let {href} = content;
        const internal = href.startsWith('?');
        if (internal) {
            href = `${location.protocol}//${location.host}/search.html${href.length > 1 ? href : ''}`;
        }

        const node = this._createElement('a', 'gloss-link');
        node.dataset.external = `${!internal}`;

        const text = this._createElement('span', 'gloss-link-text');
        node.appendChild(text);

        const {lang} = content;
        if (typeof lang === 'string') {
            node.lang = lang;
            language = lang;
        }

        this._appendStructuredContent(text, content.content, dictionary, language);

        if (!internal) {
            const icon = this._createElement('span', 'gloss-link-external-icon icon');
            icon.dataset.icon = 'external-link';
            node.appendChild(icon);
        }

        this._contentManager.prepareLink(node, href, internal);
        return node;
    }
}
