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

/* global
 * Handlebars
 */

class TemplateRendererMediaProvider {
    constructor() {
        this._requirements = null;
    }

    get requirements() {
        return this._requirements;
    }

    set requirements(value) {
        this._requirements = value;
    }

    hasMedia(root, args, namedArgs) {
        const {media} = root;
        const data = this._getMediaData(media, args, namedArgs);
        return (data !== null);
    }

    getMedia(root, args, namedArgs) {
        const {media} = root;
        const data = this._getMediaData(media, args, namedArgs);
        if (data !== null) {
            const result = this._getFormattedValue(data, namedArgs);
            if (typeof result === 'string') { return result; }
        }
        const defaultValue = namedArgs.default;
        return typeof defaultValue !== 'undefined' ? defaultValue : '';
    }

    // Private

    _addRequirement(value) {
        if (this._requirements === null) { return; }
        this._requirements.push(value);
    }

    _getFormattedValue(data, namedArgs) {
        let {value} = data;
        const {escape=true} = namedArgs;
        if (escape) {
            value = Handlebars.Utils.escapeExpression(value);
        }
        return value;
    }

    _getMediaData(media, args, namedArgs) {
        const type = args[0];
        switch (type) {
            case 'audio': return this._getSimpleMediaData(media, 'audio');
            case 'screenshot': return this._getSimpleMediaData(media, 'screenshot');
            case 'clipboardImage': return this._getSimpleMediaData(media, 'clipboardImage');
            case 'clipboardText': return this._getSimpleMediaData(media, 'clipboardText');
            case 'selectionText': return this._getSimpleMediaData(media, 'selectionText');
            case 'textFurigana': return this._getTextFurigana(media, args[1], namedArgs);
            case 'dictionaryMedia': return this._getDictionaryMedia(media, args[1], namedArgs);
            default: return null;
        }
    }

    _getSimpleMediaData(media, type) {
        const result = media[type];
        if (typeof result === 'object' && result !== null) { return result; }
        this._addRequirement({type});
        return null;
    }

    _getDictionaryMedia(media, path, namedArgs) {
        const {dictionaryMedia} = media;
        const {dictionary} = namedArgs;
        if (
            typeof dictionaryMedia !== 'undefined' &&
            typeof dictionary === 'string' &&
            Object.prototype.hasOwnProperty.call(dictionaryMedia, dictionary)
        ) {
            const dictionaryMedia2 = dictionaryMedia[dictionary];
            if (Object.prototype.hasOwnProperty.call(dictionaryMedia2, path)) {
                const result = dictionaryMedia2[path];
                if (typeof result === 'object' && result !== null) {
                    return result;
                }
            }
        }
        this._addRequirement({
            type: 'dictionaryMedia',
            dictionary,
            path
        });
        return null;
    }

    _getTextFurigana(media, text, namedArgs) {
        const {readingMode=null} = namedArgs;
        const {textFurigana} = media;
        if (Array.isArray(textFurigana)) {
            for (const entry of textFurigana) {
                if (entry.text !== text || entry.readingMode !== readingMode) { continue; }
                return entry.details;
            }
        }
        this._addRequirement({
            type: 'textFurigana',
            text,
            readingMode
        });
        return null;
    }
}
