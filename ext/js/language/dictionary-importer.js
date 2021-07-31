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

/* global
 * JSZip
 * JsonSchema
 * MediaUtil
 */

class DictionaryImporter {
    constructor(mediaLoader) {
        this._mediaLoader = mediaLoader;
        this._schemas = new Map();
    }

    async importDictionary(dictionaryDatabase, archiveContent, details, onProgress) {
        if (!dictionaryDatabase) {
            throw new Error('Invalid database');
        }
        if (!dictionaryDatabase.isPrepared()) {
            throw new Error('Database is not ready');
        }

        const hasOnProgress = (typeof onProgress === 'function');

        // Read archive
        const archive = await JSZip.loadAsync(archiveContent);

        // Read and validate index
        const indexFileName = 'index.json';
        const indexFile = archive.file(indexFileName);
        if (!indexFile) {
            throw new Error('No dictionary index found in archive');
        }

        const index = JSON.parse(await indexFile.async('string'));

        const indexSchema = await this._getSchema('/data/schemas/dictionary-index-schema.json');
        this._validateJsonSchema(index, indexSchema, indexFileName);

        const dictionaryTitle = index.title;
        const version = index.format || index.version;

        if (!dictionaryTitle || !index.revision) {
            throw new Error('Unrecognized dictionary format');
        }

        // Verify database is not already imported
        if (await dictionaryDatabase.dictionaryExists(dictionaryTitle)) {
            throw new Error('Dictionary is already imported');
        }

        // Data format converters
        const convertTermBankEntry = (version === 1 ? this._convertTermBankEntryV1.bind(this) : this._convertTermBankEntryV3.bind(this));
        const convertTermMetaBankEntry = this._convertTermMetaBankEntry.bind(this);
        const convertKanjiBankEntry = (version === 1 ? this._convertKanjiBankEntryV1.bind(this) : this._convertKanjiBankEntryV3.bind(this));
        const convertKanjiMetaBankEntry = this._convertKanjiMetaBankEntry.bind(this);
        const convertTagBankEntry = this._convertTagBankEntry.bind(this);

        // Load schemas
        const dataBankSchemaPaths = this._getDataBankSchemaPaths(version);
        const dataBankSchemas = await Promise.all(dataBankSchemaPaths.map((path) => this._getSchema(path)));

        // Files
        const termFiles      = this._getArchiveFiles(archive, 'term_bank_?.json');
        const termMetaFiles  = this._getArchiveFiles(archive, 'term_meta_bank_?.json');
        const kanjiFiles     = this._getArchiveFiles(archive, 'kanji_bank_?.json');
        const kanjiMetaFiles = this._getArchiveFiles(archive, 'kanji_meta_bank_?.json');
        const tagFiles       = this._getArchiveFiles(archive, 'tag_bank_?.json');

        // Load data
        const termList      = await this._readFileSequence(termFiles,      convertTermBankEntry,      dataBankSchemas[0], dictionaryTitle);
        const termMetaList  = await this._readFileSequence(termMetaFiles,  convertTermMetaBankEntry,  dataBankSchemas[1], dictionaryTitle);
        const kanjiList     = await this._readFileSequence(kanjiFiles,     convertKanjiBankEntry,     dataBankSchemas[2], dictionaryTitle);
        const kanjiMetaList = await this._readFileSequence(kanjiMetaFiles, convertKanjiMetaBankEntry, dataBankSchemas[3], dictionaryTitle);
        const tagList       = await this._readFileSequence(tagFiles,       convertTagBankEntry,       dataBankSchemas[4], dictionaryTitle);
        this._addOldIndexTags(index, tagList, dictionaryTitle);

        // Prefix wildcard support
        const prefixWildcardsSupported = !!details.prefixWildcardsSupported;
        if (prefixWildcardsSupported) {
            for (const entry of termList) {
                entry.expressionReverse = stringReverse(entry.expression);
                entry.readingReverse = stringReverse(entry.reading);
            }
        }

        // Extended data support
        const requirements = [];
        for (const entry of termList) {
            const glossaryList = entry.glossary;
            for (let i = 0, ii = glossaryList.length; i < ii; ++i) {
                const glossary = glossaryList[i];
                if (typeof glossary !== 'object' || glossary === null) { continue; }
                glossaryList[i] = this._formatDictionaryTermGlossaryObject(glossary, entry, requirements);
            }
        }

        // Async requirements
        const {media} = await this._resolveAsyncRequirements(requirements, archive);

        // Add dictionary
        const summary = this._createSummary(dictionaryTitle, version, index, {prefixWildcardsSupported});

        dictionaryDatabase.bulkAdd('dictionaries', [summary], 0, 1);

        // Add data
        const errors = [];
        const total = (
            termList.length +
            termMetaList.length +
            kanjiList.length +
            kanjiMetaList.length +
            tagList.length
        );
        let loadedCount = 0;
        const maxTransactionLength = 1000;

        const bulkAdd = async (objectStoreName, entries) => {
            const ii = entries.length;
            for (let i = 0; i < ii; i += maxTransactionLength) {
                const count = Math.min(maxTransactionLength, ii - i);

                try {
                    await dictionaryDatabase.bulkAdd(objectStoreName, entries, i, count);
                } catch (e) {
                    errors.push(e);
                }

                loadedCount += count;
                if (hasOnProgress) {
                    onProgress(total, loadedCount);
                }
            }
        };

        await bulkAdd('terms', termList);
        await bulkAdd('termMeta', termMetaList);
        await bulkAdd('kanji', kanjiList);
        await bulkAdd('kanjiMeta', kanjiMetaList);
        await bulkAdd('tagMeta', tagList);
        await bulkAdd('media', media);

        return {result: summary, errors};
    }

    _createSummary(dictionaryTitle, version, index, details) {
        const summary = {
            title: dictionaryTitle,
            revision: index.revision,
            sequenced: index.sequenced,
            version
        };

        const {author, url, description, attribution} = index;
        if (typeof author === 'string') { summary.author = author; }
        if (typeof url === 'string') { summary.url = url; }
        if (typeof description === 'string') { summary.description = description; }
        if (typeof attribution === 'string') { summary.attribution = attribution; }

        Object.assign(summary, details);

        return summary;
    }

    async _getSchema(fileName) {
        let schemaPromise = this._schemas.get(fileName);
        if (typeof schemaPromise !== 'undefined') {
            return schemaPromise;
        }

        schemaPromise = this._createSchema(fileName);
        this._schemas.set(fileName, schemaPromise);
        return schemaPromise;
    }

    async _createSchema(fileName) {
        const schema = await this._fetchJsonAsset(fileName);
        return new JsonSchema(schema);
    }

    _validateJsonSchema(value, schema, fileName) {
        try {
            schema.validate(value);
        } catch (e) {
            throw this._formatSchemaError(e, fileName);
        }
    }

    _formatSchemaError(e, fileName) {
        const valuePathString = this._getSchemaErrorPathString(e.valueStack, 'dictionary');
        const schemaPathString = this._getSchemaErrorPathString(e.schemaStack, 'schema');

        const e2 = new Error(`Dictionary has invalid data in '${fileName}' for value '${valuePathString}', validated against '${schemaPathString}': ${e.message}`);
        e2.data = e;

        return e2;
    }

    _getSchemaErrorPathString(infoList, base='') {
        let result = base;
        for (const {path} of infoList) {
            const pathArray = Array.isArray(path) ? path : [path];
            for (const pathPart of pathArray) {
                if (pathPart === null) {
                    result = base;
                } else {
                    switch (typeof pathPart) {
                        case 'string':
                            if (result.length > 0) {
                                result += '.';
                            }
                            result += pathPart;
                            break;
                        case 'number':
                            result += `[${pathPart}]`;
                            break;
                    }
                }
            }
        }
        return result;
    }

    _getDataBankSchemaPaths(version) {
        const termBank = (
            version === 1 ?
            '/data/schemas/dictionary-term-bank-v1-schema.json' :
            '/data/schemas/dictionary-term-bank-v3-schema.json'
        );
        const termMetaBank = '/data/schemas/dictionary-term-meta-bank-v3-schema.json';
        const kanjiBank = (
            version === 1 ?
            '/data/schemas/dictionary-kanji-bank-v1-schema.json' :
            '/data/schemas/dictionary-kanji-bank-v3-schema.json'
        );
        const kanjiMetaBank = '/data/schemas/dictionary-kanji-meta-bank-v3-schema.json';
        const tagBank = '/data/schemas/dictionary-tag-bank-v3-schema.json';

        return [termBank, termMetaBank, kanjiBank, kanjiMetaBank, tagBank];
    }

    _formatDictionaryTermGlossaryObject(data, entry, requirements) {
        switch (data.type) {
            case 'text':
                return data.text;
            case 'image':
                return this._formatDictionaryTermGlossaryImage(data, entry, requirements);
            case 'structured-content':
                return this._formatStructuredContent(data, entry, requirements);
            default:
                throw new Error(`Unhandled data type: ${data.type}`);
        }
    }

    _formatDictionaryTermGlossaryImage(data, entry, requirements) {
        const target = {};
        requirements.push({type: 'image', target, args: [data, entry]});
        return target;
    }

    _formatStructuredContent(data, entry, requirements) {
        const content = this._prepareStructuredContent(data.content, entry, requirements);
        return {
            type: 'structured-content',
            content
        };
    }

    _prepareStructuredContent(content, entry, requirements) {
        if (typeof content === 'string' || !(typeof content === 'object' && content !== null)) {
            return content;
        }
        if (Array.isArray(content)) {
            for (let i = 0, ii = content.length; i < ii; ++i) {
                content[i] = this._prepareStructuredContent(content[i], entry, requirements);
            }
            return content;
        }
        const {tag} = content;
        switch (tag) {
            case 'img':
                return this._prepareStructuredContentImage(content, entry, requirements);
        }
        const childContent = content.content;
        if (typeof childContent !== 'undefined') {
            content.content = this._prepareStructuredContent(childContent, entry, requirements);
        }
        return content;
    }

    _prepareStructuredContentImage(content, entry, requirements) {
        const target = {};
        requirements.push({type: 'structured-content-image', target, args: [content, entry]});
        return target;
    }

    async _resolveAsyncRequirements(requirements, archive) {
        const media = new Map();
        const context = {archive, media};

        const promises = [];
        for (const requirement of requirements) {
            promises.push(this._resolveAsyncRequirement(context, requirement));
        }

        await Promise.all(promises);

        return {
            media: [...media.values()]
        };
    }

    async _resolveAsyncRequirement(context, requirement) {
        const {type, target, args} = requirement;
        let result;
        switch (type) {
            case 'image':
                result = await this._resolveDictionaryTermGlossaryImage(context, ...args);
                break;
            case 'structured-content-image':
                result = await this._resolveStructuredContentImage(context, ...args);
                break;
            default:
                return;
        }
        Object.assign(target, result);
    }

    async _resolveDictionaryTermGlossaryImage(context, data, entry) {
        return await this._createImageData(context, data, entry, {type: 'image'});
    }

    async _resolveStructuredContentImage(context, content, entry) {
        const {verticalAlign, sizeUnits} = content;
        const result = await this._createImageData(context, content, entry, {tag: 'img'});
        if (typeof verticalAlign === 'string') { result.verticalAlign = verticalAlign; }
        if (typeof sizeUnits === 'string') { result.sizeUnits = sizeUnits; }
        return result;
    }

    async _createImageData(context, data, entry, attributes) {
        const {
            path,
            width: preferredWidth,
            height: preferredHeight,
            title,
            description,
            pixelated,
            imageRendering,
            appearance,
            background,
            collapsed,
            collapsible
        } = data;
        const {width, height} = await this._getImageMedia(context, path, entry);
        const newData = Object.assign({}, attributes, {path, width, height});
        if (typeof preferredWidth === 'number') { newData.preferredWidth = preferredWidth; }
        if (typeof preferredHeight === 'number') { newData.preferredHeight = preferredHeight; }
        if (typeof title === 'string') { newData.title = title; }
        if (typeof description === 'string') { newData.description = description; }
        if (typeof pixelated === 'boolean') { newData.pixelated = pixelated; }
        if (typeof imageRendering === 'string') { newData.imageRendering = imageRendering; }
        if (typeof appearance === 'string') { newData.appearance = appearance; }
        if (typeof background === 'boolean') { newData.background = background; }
        if (typeof collapsed === 'boolean') { newData.collapsed = collapsed; }
        if (typeof collapsible === 'boolean') { newData.collapsible = collapsible; }
        return newData;
    }

    async _getImageMedia(context, path, entry) {
        const {media} = context;
        const {dictionary} = entry;

        const createError = (message) => {
            const {expression, reading} = entry;
            const readingSource = reading.length > 0 ? ` (${reading})`: '';
            return new Error(`${message} at path ${JSON.stringify(path)} for ${expression}${readingSource} in ${dictionary}`);
        };

        // Check if already added
        let mediaData = media.get(path);
        if (typeof mediaData !== 'undefined') {
            if (MediaUtil.getFileExtensionFromImageMediaType(mediaData.mediaType) === null) {
                throw createError('Media file is not a valid image');
            }
            return mediaData;
        }

        // Find file in archive
        const file = context.archive.file(path);
        if (file === null) {
            throw createError('Could not find image');
        }

        // Load file content
        const content = await file.async('base64');
        const mediaType = MediaUtil.getImageMediaTypeFromFileName(path);
        if (mediaType === null) {
            throw createError('Could not determine media type for image');
        }

        // Load image data
        let width;
        let height;
        try {
            ({width, height} = await this._mediaLoader.getImageResolution(mediaType, content));
        } catch (e) {
            throw createError('Could not load image');
        }

        // Create image data
        mediaData = {
            dictionary,
            path,
            mediaType,
            width,
            height,
            content
        };
        media.set(path, mediaData);

        return mediaData;
    }

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

    _convertTermBankEntryV1(entry, dictionary) {
        const [expression, reading, definitionTags, rules, score, ...glossary] = entry;
        return {expression, reading, definitionTags, rules, score, glossary, dictionary};
    }

    _convertTermBankEntryV3(entry, dictionary) {
        const [expression, reading, definitionTags, rules, score, glossary, sequence, termTags] = entry;
        return {expression, reading, definitionTags, rules, score, glossary, sequence, termTags, dictionary};
    }

    _convertTermMetaBankEntry(entry, dictionary) {
        const [expression, mode, data] = entry;
        return {expression, mode, data, dictionary};
    }

    _convertKanjiBankEntryV1(entry, dictionary) {
        const [character, onyomi, kunyomi, tags, ...meanings] = entry;
        return {character, onyomi, kunyomi, tags, meanings, dictionary};
    }

    _convertKanjiBankEntryV3(entry, dictionary) {
        const [character, onyomi, kunyomi, tags, meanings, stats] = entry;
        return {character, onyomi, kunyomi, tags, meanings, stats, dictionary};
    }

    _convertKanjiMetaBankEntry(entry, dictionary) {
        const [character, mode, data] = entry;
        return {character, mode, data, dictionary};
    }

    _convertTagBankEntry(entry, dictionary) {
        const [name, category, order, notes, score] = entry;
        return {name, category, order, notes, score, dictionary};
    }

    _addOldIndexTags(index, results, dictionary) {
        const {tagMeta} = index;
        if (typeof tagMeta !== 'object' || tagMeta === null) { return; }
        for (const name of Object.keys(tagMeta)) {
            const {category, order, notes, score} = tagMeta[name];
            results.push({name, category, order, notes, score, dictionary});
        }
    }

    _getArchiveFiles(archive, fileNameFormat) {
        const indexPosition = fileNameFormat.indexOf('?');
        const prefix = fileNameFormat.substring(0, indexPosition);
        const suffix = fileNameFormat.substring(indexPosition + 1);
        const results = [];
        for (let i = 1; true; ++i) {
            const fileName = `${prefix}${i}${suffix}`;
            const file = archive.file(fileName);
            if (!file) { break; }
            results.push(file);
        }
        return results;
    }

    async _readFileSequence(files, convertEntry, schema, dictionaryTitle) {
        const results = [];
        for (const file of files) {
            const entries = JSON.parse(await file.async('string'));
            this._validateJsonSchema(entries, schema, file.name);
            for (const entry of entries) {
                results.push(convertEntry(entry, dictionaryTitle));
            }
        }
        return results;
    }
}
