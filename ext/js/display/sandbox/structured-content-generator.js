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
    constructor(mediaLoader, document) {
        this._mediaLoader = mediaLoader;
        this._document = document;
    }

    createStructuredContent(content, dictionary) {
        if (typeof content === 'string') {
            return this._createTextNode(content);
        }
        if (!(typeof content === 'object' && content !== null)) {
            return null;
        }
        if (Array.isArray(content)) {
            const fragment = this._createDocumentFragment();
            for (const item of content) {
                const child = this.createStructuredContent(item, dictionary);
                if (child !== null) { fragment.appendChild(child); }
            }
            return fragment;
        }
        const {tag} = content;
        switch (tag) {
            case 'br':
                return this._createStructuredContentElement(tag, content, dictionary, 'simple', false, false);
            case 'ruby':
            case 'rt':
            case 'rp':
                return this._createStructuredContentElement(tag, content, dictionary, 'simple', true, false);
            case 'table':
                return this._createStructuredContentTableElement(tag, content, dictionary);
            case 'thead':
            case 'tbody':
            case 'tfoot':
            case 'tr':
                return this._createStructuredContentElement(tag, content, dictionary, 'table', true, false);
            case 'th':
            case 'td':
                return this._createStructuredContentElement(tag, content, dictionary, 'table-cell', true, true);
            case 'div':
            case 'span':
                return this._createStructuredContentElement(tag, content, dictionary, 'simple', true, true);
            case 'img':
                return this.createDefinitionImage(content, dictionary);
        }
        return null;
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

        if (this._mediaLoader !== null) {
            this._mediaLoader.loadMedia(
                path,
                dictionary,
                (url) => this._setImageData(node, image, imageBackground, url, false),
                () => this._setImageData(node, image, imageBackground, null, true)
            );
        }

        return node;
    }

    // Private

    _createElement(tagName, className) {
        const node = this._document.createElement(tagName);
        node.className = className;
        return node;
    }

    _createTextNode(data) {
        return this._document.createTextNode(data);
    }

    _createDocumentFragment() {
        return this._document.createDocumentFragment();
    }

    _setElementDataset(element, data) {
        for (let [key, value] of Object.entries(data)) {
            if (key.length > 0) {
                key = `${key[0].toUpperCase()}${key.substring(1)}`;
            }
            key = `sc${key}`;
            element.dataset[key] = value;
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

    _createStructuredContentTableElement(tag, content, dictionary) {
        const container = this._createElement('div', 'gloss-sc-table-container');
        const table = this._createStructuredContentElement(tag, content, dictionary, 'table', true, false);
        container.appendChild(table);
        return container;
    }

    _createStructuredContentElement(tag, content, dictionary, type, hasChildren, hasStyle) {
        const node = this._createElement(tag, `gloss-sc-${tag}`);
        const {data} = content;
        if (typeof data === 'object' && data !== null) { this._setElementDataset(node, data); }
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
            const child = this.createStructuredContent(content.content, dictionary);
            if (child !== null) { node.appendChild(child); }
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
            marginTop,
            marginLeft,
            marginRight,
            marginBottom
        } = contentStyle;
        if (typeof fontStyle === 'string') { style.fontStyle = fontStyle; }
        if (typeof fontWeight === 'string') { style.fontWeight = fontWeight; }
        if (typeof fontSize === 'string') { style.fontSize = fontSize; }
        if (typeof verticalAlign === 'string') { style.verticalAlign = verticalAlign; }
        if (typeof textDecorationLine === 'string') {
            style.textDecoration = textDecorationLine;
        } else if (Array.isArray(textDecorationLine)) {
            style.textDecoration = textDecorationLine.join(' ');
        }
        if (typeof marginTop === 'number') { style.marginTop = `${marginTop}em`; }
        if (typeof marginLeft === 'number') { style.marginLeft = `${marginLeft}em`; }
        if (typeof marginRight === 'number') { style.marginRight = `${marginRight}em`; }
        if (typeof marginBottom === 'number') { style.marginBottom = `${marginBottom}em`; }
    }
}
