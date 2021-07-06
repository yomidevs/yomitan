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
            const {format} = namedArgs;
            const result = this._getFormattedValue(data, format);
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

    _getFormattedValue(data, format) {
        switch (format) {
            case 'fileName':
                {
                    const {fileName} = data;
                    if (typeof fileName === 'string') { return fileName; }
                }
                break;
            case 'text':
                {
                    const {text} = data;
                    if (typeof text === 'string') { return text; }
                }
                break;
        }
        return null;
    }

    _getMediaData(media, args, namedArgs) {
        const type = args[0];
        switch (type) {
            case 'audio': return this._getSimpleMediaData(media, 'audio');
            case 'screenshot': return this._getSimpleMediaData(media, 'screenshot');
            case 'clipboardImage': return this._getSimpleMediaData(media, 'clipboardImage');
            case 'clipboardText': return this._getSimpleMediaData(media, 'clipboardText');
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
}
