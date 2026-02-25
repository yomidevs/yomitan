/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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

import * as ajvSchemas0 from '../../lib/validate-schemas.js';
import {
    BlobWriter as BlobWriter0,
    TextWriter as TextWriter0,
    Uint8ArrayReader as Uint8ArrayReader0,
    ZipReader as ZipReader0,
    configure,
} from '../../lib/zip.js';
import {ExtensionError} from '../core/extension-error.js';
import {parseJson} from '../core/json.js';
import {toError} from '../core/to-error.js';
import {stringReverse} from '../core/utilities.js';
import {getFileExtensionFromImageMediaType, getImageMediaTypeFromFileName} from '../media/media-util.js';
import {compareRevisions} from './dictionary-data-util.js';

const ajvSchemas = /** @type {import('dictionary-importer').CompiledSchemaValidators} */ (/** @type {unknown} */ (ajvSchemas0));
const BlobWriter = /** @type {typeof import('@zip.js/zip.js').BlobWriter} */ (/** @type {unknown} */ (BlobWriter0));
const TextWriter = /** @type {typeof import('@zip.js/zip.js').TextWriter} */ (/** @type {unknown} */ (TextWriter0));
const Uint8ArrayReader = /** @type {typeof import('@zip.js/zip.js').Uint8ArrayReader} */ (/** @type {unknown} */ (Uint8ArrayReader0));
const ZipReader = /** @type {typeof import('@zip.js/zip.js').ZipReader} */ (/** @type {unknown} */ (ZipReader0));

const INDEX_FILE_NAME = 'index.json';

export class DictionaryImporter {
    /**
     * @param {import('dictionary-importer-media-loader').GenericMediaLoader} mediaLoader
     * @param {import('dictionary-importer').OnProgressCallback} [onProgress]
     */
    constructor(mediaLoader, onProgress) {
        /** @type {import('dictionary-importer-media-loader').GenericMediaLoader} */
        this._mediaLoader = mediaLoader;
        /** @type {import('dictionary-importer').OnProgressCallback} */
        this._onProgress = typeof onProgress === 'function' ? onProgress : () => {};
        /** @type {import('dictionary-importer').ProgressData} */
        this._progressData = this._createProgressData();
        /** @type {number} */
        this._lastProgressTimestamp = 0;
        /** @type {boolean} */
        this._disableProgressEvents = false;
        /** @type {boolean} */
        this._skipImageMetadata = false;
        /** @type {boolean} */
        this._skipMediaImport = false;
        /** @type {number} */
        this._mediaResolutionConcurrency = 1;
        /** @type {Map<string, Promise<import('dictionary-database').MediaDataArrayBufferContent>>} */
        this._pendingImageMediaByPath = new Map();
        /** @type {Map<string, {mediaType: string, width: number, height: number}>} */
        this._imageMetadataByPath = new Map();
        /** @type {boolean} */
        this._debugImportLogging = false;
        /** @type {boolean} */
        this._structuredContentImportFastPath = false;
        /** @type {TextEncoder} */
        this._textEncoder = new TextEncoder();
    }

    /**
     * @param {import('./dictionary-database.js').DictionaryDatabase} dictionaryDatabase
     * @param {ArrayBuffer} archiveContent
     * @param {import('dictionary-importer').ImportDetails} details
     * @returns {Promise<import('dictionary-importer').ImportResult>}
     */
    async importDictionary(dictionaryDatabase, archiveContent, details) {
        if (!dictionaryDatabase) {
            throw new Error('Invalid database');
        }
        if (!dictionaryDatabase.isPrepared()) {
            throw new Error('Database is not ready');
        }

        /** @type {Error[]} */
        const errors = [];
        const maxTransactionLength = 262144;
        const bulkAddProgressAllowance = 1000;
        const skipSchemaValidation = !!details.skipSchemaValidation;
        const enableBulkImportIndexOptimization = details.enableBulkImportIndexOptimization !== false;
        const enableTermEntryContentDedup = true;
        this._skipImageMetadata = details.skipImageMetadata === true;
        this._skipMediaImport = details.skipMediaImport === true;
        this._mediaResolutionConcurrency = Math.max(1, Math.min(32, Math.trunc(details.mediaResolutionConcurrency ?? 8)));
        this._debugImportLogging = details.debugImportLogging === true;
        this._structuredContentImportFastPath = details.structuredContentImportFastPath === true;
        this._pendingImageMediaByPath.clear();
        this._imageMetadataByPath.clear();
        const tImportStart = Date.now();

        /**
         * @template {import('dictionary-database').ObjectStoreName} T
         * @param {T} objectStoreName
         * @param {import('dictionary-database').ObjectStoreData<T>[]} entries
         */
        const bulkAdd = async (objectStoreName, entries) => {
            const entryCount = entries.length;

            let progressIndexIncrease = bulkAddProgressAllowance / Math.ceil(entryCount / maxTransactionLength);
            if (entryCount < maxTransactionLength) { progressIndexIncrease = bulkAddProgressAllowance; }
            if (entryCount === 0) { this._progressData.index += progressIndexIncrease; }

            for (let i = 0, chunkIndex = 0; i < entryCount; i += maxTransactionLength, ++chunkIndex) {
                const count = Math.min(maxTransactionLength, entryCount - i);
                const tChunk = Date.now();

                try {
                    await dictionaryDatabase.bulkAdd(objectStoreName, entries, i, count);
                } catch (e) {
                    errors.push(toError(e));
                }
                this._logImport(
                    `bulkAdd ${objectStoreName} chunk=${chunkIndex + 1} ` +
                    `rows=${count} elapsed=${Date.now() - tChunk}ms`,
                );

                this._progressData.index += progressIndexIncrease;
                if (!this._disableProgressEvents) {
                    const isLastChunk = ((i + count) >= entryCount);
                    if (isLastChunk || (chunkIndex % 64) === 0) {
                        this._progress();
                    }
                }
            }
        };

        this._progressReset();

        configure({
            workerScripts: {
                deflate: ['../../lib/z-worker.js'],
                inflate: ['../../lib/z-worker.js'],
            },
        });

        // Read archive
        const tArchiveStart = Date.now();
        const fileMap = await this._getFilesFromArchive(archiveContent);
        const index = await this._readAndValidateIndex(fileMap, skipSchemaValidation);
        this._logImport(`archive+index ${Date.now() - tArchiveStart}ms files=${fileMap.size}`);

        const dictionaryTitle = index.title;
        const version = /** @type {import('dictionary-data').IndexVersion} */ (index.version);

        // Verify database is not already imported
        if (await dictionaryDatabase.dictionaryExists(dictionaryTitle)) {
            return {
                errors: [new Error(`Dictionary ${dictionaryTitle} is already imported, skipped it.`)],
                result: null,
            };
        }
        dictionaryDatabase.setTermEntryContentDedupEnabled(enableTermEntryContentDedup);
        dictionaryDatabase.setImportDebugLogging(this._debugImportLogging);

        this._disableProgressEvents = !!details.disableProgressEvents;

        // Load schemas
        this._progressNextStep(0);
        const dataBankSchemas = skipSchemaValidation ? [] : this._getDataBankSchemas(version);

        // Files
        /** @type {import('dictionary-importer').QueryDetails} */
        const queryDetails = [
            ['termFiles', /^term_bank_(\d+)\.json$/],
            ['termMetaFiles', /^term_meta_bank_(\d+)\.json$/],
            ['kanjiFiles', /^kanji_bank_(\d+)\.json$/],
            ['kanjiMetaFiles', /^kanji_meta_bank_(\d+)\.json$/],
            ['tagFiles', /^tag_bank_(\d+)\.json$/],
        ];
        const {termFiles, termMetaFiles, kanjiFiles, kanjiMetaFiles, tagFiles} = Object.fromEntries(this._getArchiveFiles(fileMap, queryDetails));
        this._logImport(`banks terms=${termFiles.length} termMeta=${termMetaFiles.length} kanji=${kanjiFiles.length} kanjiMeta=${kanjiMetaFiles.length} tags=${tagFiles.length}`);

        // Load data
        const prefixWildcardsSupported = !!details.prefixWildcardsSupported;

        this._progressNextStep(termFiles.length + termMetaFiles.length + kanjiFiles.length + kanjiMetaFiles.length + tagFiles.length);

        if (!skipSchemaValidation) {
            for (const termFile of termFiles) { await this._validateFile(termFile, dataBankSchemas[0]); }
            for (const termMetaFile of termMetaFiles) { await this._validateFile(termMetaFile, dataBankSchemas[1]); }
            for (const kanjiFile of kanjiFiles) { await this._validateFile(kanjiFile, dataBankSchemas[2]); }
            for (const kanjiMetaFile of kanjiMetaFiles) { await this._validateFile(kanjiMetaFile, dataBankSchemas[3]); }
            for (const tagFile of tagFiles) { await this._validateFile(tagFile, dataBankSchemas[4]); }
        } else {
            this._progressData.index = this._progressData.count;
            this._progress();
        }

        // termFiles is doubled due to media importing
        this._progressNextStep((termFiles.length * 2 + termMetaFiles.length + kanjiFiles.length + kanjiMetaFiles.length + tagFiles.length) * bulkAddProgressAllowance);

        let importSuccess = false;

        /** @type {import('dictionary-importer').SummaryCounts} */
        const counts = {
            terms: {total: 0},
            termMeta: {total: 0},
            kanji: {total: 0},
            kanjiMeta: {total: 0},
            tagMeta: {total: 0},
            media: {total: 0},
        };

        const yomitanVersion = details.yomitanVersion;
        /** @type {import('dictionary-importer').SummaryDetails} */
        let summaryDetails = {prefixWildcardsSupported, counts, styles: '', yomitanVersion, importSuccess};

        let summary = this._createSummary(dictionaryTitle, version, index, summaryDetails);
        const dictionarySummaryPrimaryKey = await dictionaryDatabase.addWithResult('dictionaries', summary);
        if (enableBulkImportIndexOptimization) {
            dictionaryDatabase.startBulkImport();
        }

        try {
            try {
                const useMediaPipeline = !(this._skipMediaImport && this._structuredContentImportFastPath);
                const uniqueMediaPaths = useMediaPipeline ? new Set() : null;
                for (const termFile of termFiles) {
                    const tTermFile = Date.now();
                    /** @type {import('dictionary-importer').ImportRequirement[]|null} */
                    const requirements = useMediaPipeline ? [] : null;
                    let termList = await (
                        version === 1 ?
                            this._readFileSequence([termFile], this._convertTermBankEntryV1.bind(this), dictionaryTitle) :
                            this._readFileSequence([termFile], this._convertTermBankEntryV3.bind(this), dictionaryTitle)
                    );

                    // Prefix wildcard support
                    if (prefixWildcardsSupported) {
                        for (const entry of termList) {
                            entry.expressionReverse = stringReverse(entry.expression);
                            entry.readingReverse = stringReverse(entry.reading);
                        }
                    }

                    if (useMediaPipeline) {
                        // Extended data support
                        for (let i = 0, ii = termList.length; i < ii; ++i) {
                            const entry = termList[i];
                            const glossaryList = entry.glossary;
                            for (let j = 0, jj = glossaryList.length; j < jj; ++j) {
                                const glossary = glossaryList[j];
                                if (typeof glossary !== 'object' || glossary === null || Array.isArray(glossary)) { continue; }
                                glossaryList[j] = this._formatDictionaryTermGlossaryObject(glossary, entry, requirements);
                            }
                        }
                        const alreadyAddedRequirements = requirements.filter((x) => { return uniqueMediaPaths.has(x.source.path); });
                        const notAddedRequirements = requirements.filter((x) => { return !uniqueMediaPaths.has(x.source.path); });
                        for (const requirement of requirements) { uniqueMediaPaths.add(requirement.source.path); }

                        const tResolveExisting = Date.now();
                        await this._resolveAsyncRequirements(alreadyAddedRequirements, fileMap); // already added must also be resolved for the term dict to have correct data
                        const tResolveNew = Date.now();
                        let {media} = await this._resolveAsyncRequirements(notAddedRequirements, fileMap);
                        const tResolved = Date.now();
                        this._logImport(
                            `term file ${termFile.filename}: resolve existing=${alreadyAddedRequirements.length} ` +
                            `${tResolveNew - tResolveExisting}ms new=${notAddedRequirements.length} ` +
                            `${tResolved - tResolveNew}ms`,
                        );
                        this._logImport(`term file ${termFile.filename}: requirements=${requirements.length} newMedia=${media.length}`);
                        const tMediaWriteStart = Date.now();
                        await bulkAdd('media', media);
                        const tMediaWriteEnd = Date.now();
                        counts.media.total += media.length;
                        this._logImport(`term file ${termFile.filename}: media write rows=${media.length} elapsed=${tMediaWriteEnd - tMediaWriteStart}ms`);

                        this._progress();
                        media = [];
                    }

                    this._prepareTermImportSerialization(termList, enableTermEntryContentDedup);
                    const tTermsWriteStart = Date.now();
                    await bulkAdd('terms', termList);
                    const tTermsWriteEnd = Date.now();
                    counts.terms.total += termList.length;
                    this._logImport(`term file ${termFile.filename}: terms write rows=${termList.length} elapsed=${tTermsWriteEnd - tTermsWriteStart}ms`);
                    this._logImport(`term file ${termFile.filename}: total elapsed=${Date.now() - tTermFile}ms`);

                    this._progress();

                    termList = [];
                }

                for (const termMetaFile of termMetaFiles) {
                    const tTermMetaFile = Date.now();
                    let termMetaList = await this._readFileSequence([termMetaFile], this._convertTermMetaBankEntry.bind(this), dictionaryTitle);

                    await bulkAdd('termMeta', termMetaList);
                    for (const [key, value] of Object.entries(this._getMetaCounts(termMetaList))) {
                        if (key in counts.termMeta) {
                            counts.termMeta[key] += value;
                        } else {
                            counts.termMeta[key] = value;
                        }
                    }

                    this._progress();
                    this._logImport(`termMeta file ${termMetaFile.filename}: entries=${termMetaList.length} elapsed=${Date.now() - tTermMetaFile}ms`);

                    termMetaList = [];
                }

                for (const kanjiFile of kanjiFiles) {
                    const tKanjiFile = Date.now();
                    let kanjiList = await (
                        version === 1 ?
                            this._readFileSequence([kanjiFile], this._convertKanjiBankEntryV1.bind(this), dictionaryTitle) :
                            this._readFileSequence([kanjiFile], this._convertKanjiBankEntryV3.bind(this), dictionaryTitle)
                    );

                    await bulkAdd('kanji', kanjiList);
                    counts.kanji.total += kanjiList.length;

                    this._progress();
                    this._logImport(`kanji file ${kanjiFile.filename}: entries=${kanjiList.length} elapsed=${Date.now() - tKanjiFile}ms`);

                    kanjiList = [];
                }

                for (const kanjiMetaFile of kanjiMetaFiles) {
                    const tKanjiMetaFile = Date.now();
                    let kanjiMetaList = await this._readFileSequence([kanjiMetaFile], this._convertKanjiMetaBankEntry.bind(this), dictionaryTitle);

                    await bulkAdd('kanjiMeta', kanjiMetaList);
                    for (const [key, value] of Object.entries(this._getMetaCounts(kanjiMetaList))) {
                        if (key in counts.kanjiMeta) {
                            counts.kanjiMeta[key] += value;
                        } else {
                            counts.kanjiMeta[key] = value;
                        }
                    }

                    this._progress();
                    this._logImport(`kanjiMeta file ${kanjiMetaFile.filename}: entries=${kanjiMetaList.length} elapsed=${Date.now() - tKanjiMetaFile}ms`);

                    kanjiMetaList = [];
                }

                for (const tagFile of tagFiles) {
                    const tTagFile = Date.now();
                    let tagList = await this._readFileSequence([tagFile], this._convertTagBankEntry.bind(this), dictionaryTitle);
                    this._addOldIndexTags(index, tagList, dictionaryTitle);

                    await bulkAdd('tagMeta', tagList);
                    counts.tagMeta.total += tagList.length;

                    this._progress();
                    this._logImport(`tag file ${tagFile.filename}: entries=${tagList.length} elapsed=${Date.now() - tTagFile}ms`);

                    tagList = [];
                }

                importSuccess = true;
            } catch (e) {
                errors.push(toError(e));
            }

            // Update dictionary descriptor
            this._progressNextStep(0);

            const stylesFileName = 'styles.css';
            const stylesFile = fileMap.get(stylesFileName);
            let styles = '';
            if (typeof stylesFile !== 'undefined') {
                styles = await this._getData(stylesFile, new TextWriter());
                const cssErrors = this._validateCss(styles);
                if (cssErrors.length > 0) {
                    return {
                        errors: cssErrors,
                        result: null,
                    };
                }
            }

            summaryDetails = {prefixWildcardsSupported, counts, styles, yomitanVersion, importSuccess};
            summary = this._createSummary(dictionaryTitle, version, index, summaryDetails);
            await dictionaryDatabase.bulkUpdate('dictionaries', [{data: summary, primaryKey: dictionarySummaryPrimaryKey}], 0, 1);
            this._logImport(`import done ${Date.now() - tImportStart}ms terms=${counts.terms.total} media=${counts.media.total}`);

            this._progress();

            return {result: summary, errors};
        } finally {
            dictionaryDatabase.setImportDebugLogging(false);
            if (enableBulkImportIndexOptimization) {
                this._progressNextStep(20);
                this._progressData.index = 0;
                this._progress();
                dictionaryDatabase.finishBulkImport((checkpointIndex, total) => {
                    this._progressData.index = Math.max(1, Math.floor((checkpointIndex / total) * this._progressData.count));
                    this._progress();
                    this._logImport(`bulk finalization ${checkpointIndex}/${total}`);
                });
                this._progressData.index = this._progressData.count;
                this._progress();
            }
            this._disableProgressEvents = false;
        }
    }

    /**
     * @param {ArrayBuffer} archiveContent
     * @returns {Promise<import('dictionary-importer').ArchiveFileMap>}
     */
    async _getFilesFromArchive(archiveContent) {
        const zipFileReader = new Uint8ArrayReader(new Uint8Array(archiveContent));
        const zipReader = new ZipReader(zipFileReader);
        const zipEntries = await zipReader.getEntries();
        /** @type {import('dictionary-importer').ArchiveFileMap} */
        const fileMap = new Map();
        for (const entry of zipEntries) {
            fileMap.set(entry.filename, entry);
        }
        return fileMap;
    }

    /**
     * @param {import('dictionary-importer').ArchiveFileMap} fileMap
     * @returns {?string}
     */
    _findRedundantDirectories(fileMap) {
        let indexPath = '';
        for (const file of fileMap) {
            if (file[0].replace(/.*\//, '') === INDEX_FILE_NAME) {
                indexPath = file[0];
            }
        }
        const redundantDirectoriesRegex = new RegExp(`.*(?=${INDEX_FILE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`);
        const redundantDirectories = indexPath.match(redundantDirectoriesRegex);
        return redundantDirectories ? redundantDirectories[0] : null;
    }

    /**
     * @param {import('dictionary-importer').ArchiveFileMap} fileMap
     * @param {boolean} skipSchemaValidation
     * @returns {Promise<import('dictionary-data').Index>}
     * @throws {Error}
     */
    async _readAndValidateIndex(fileMap, skipSchemaValidation = false) {
        const indexFile = fileMap.get(INDEX_FILE_NAME);
        if (typeof indexFile === 'undefined') {
            const redundantDirectories = this._findRedundantDirectories(fileMap);
            if (redundantDirectories) {
                throw new Error('Dictionary index found nested in redundant directories: "' + redundantDirectories + '" when it must be in the archive\'s root directory');
            }
            throw new Error('No dictionary index found in archive');
        }
        const indexFile2 = /** @type {import('@zip.js/zip.js').Entry} */ (indexFile);

        const indexContent = await this._getData(indexFile2, new TextWriter());
        const index = /** @type {unknown} */ (parseJson(indexContent));

        if (!skipSchemaValidation && !ajvSchemas.dictionaryIndex(index)) {
            throw this._formatAjvSchemaError(ajvSchemas.dictionaryIndex, INDEX_FILE_NAME);
        }

        const validIndex = /** @type {import('dictionary-data').Index} */ (index);

        const version = typeof validIndex.format === 'number' ? validIndex.format : validIndex.version;
        validIndex.version = version;

        const {title, revision} = validIndex;
        if (typeof version !== 'number' || !title || !revision) {
            throw new Error('Unrecognized dictionary format');
        }

        return validIndex;
    }

    /**
     * @returns {import('dictionary-importer').ProgressData}
     */
    _createProgressData() {
        return {
            index: 0,
            count: 0,
        };
    }

    /** */
    _progressReset() {
        this._progressData = this._createProgressData();
        this._lastProgressTimestamp = 0;
        this._progress(true);
    }

    /**
     * @param {number} count
     */
    _progressNextStep(count) {
        this._progressData.index = 0;
        this._progressData.count = count;
        this._progress(true);
    }

    /**
     * @param {boolean} nextStep
     */
    _progress(nextStep = false) {
        const now = Date.now();
        const minInterval = this._disableProgressEvents ? 10000 : 1000;
        if (!nextStep && (now - this._lastProgressTimestamp) < minInterval) {
            return;
        }
        this._lastProgressTimestamp = now;
        this._onProgress({...this._progressData, nextStep});
    }

    /**
     * @param {string} message
     */
    _logImport(message) {
        if (!this._debugImportLogging) {
            return;
        }
        // eslint-disable-next-line no-console
        console.log(`[manabitan-import] ${message}`);
    }

    /**
     * @param {string} dictionaryTitle
     * @param {number} version
     * @param {import('dictionary-data').Index} index
     * @param {import('dictionary-importer').SummaryDetails} details
     * @returns {import('dictionary-importer').Summary}
     * @throws {Error}
     */
    _createSummary(dictionaryTitle, version, index, details) {
        const indexSequenced = index.sequenced;
        const {prefixWildcardsSupported, counts, styles, importSuccess} = details;
        /** @type {import('dictionary-importer').Summary} */
        const summary = {
            title: dictionaryTitle,
            revision: index.revision,
            sequenced: typeof indexSequenced === 'boolean' && indexSequenced,
            version,
            importDate: Date.now(),
            prefixWildcardsSupported,
            counts,
            styles,
            importSuccess,
        };

        const {minimumYomitanVersion, author, url, description, attribution, frequencyMode, isUpdatable, sourceLanguage, targetLanguage} = index;
        if (typeof minimumYomitanVersion === 'string') {
            if (details.yomitanVersion === '0.0.0.0') {
                // Running a development version of Yomitan
            } else if (compareRevisions(details.yomitanVersion, minimumYomitanVersion)) {
                throw new Error(`Dictionary is incompatible with this version of Yomitan (${details.yomitanVersion}; minimum required: ${minimumYomitanVersion})`);
            }
            summary.minimumYomitanVersion = minimumYomitanVersion;
        }
        if (typeof author === 'string') { summary.author = author; }
        if (typeof url === 'string') { summary.url = url; }
        if (typeof description === 'string') { summary.description = description; }
        if (typeof attribution === 'string') { summary.attribution = attribution; }
        if (typeof frequencyMode === 'string') { summary.frequencyMode = frequencyMode; }
        if (typeof sourceLanguage === 'string') { summary.sourceLanguage = sourceLanguage; }
        if (typeof targetLanguage === 'string') { summary.targetLanguage = targetLanguage; }
        if (typeof isUpdatable === 'boolean') {
            const {indexUrl, downloadUrl} = index;
            if (!isUpdatable || !this._validateUrl(indexUrl) || !this._validateUrl(downloadUrl)) {
                throw new Error('Invalid index data for updatable dictionary');
            }
            summary.isUpdatable = isUpdatable;
            summary.indexUrl = indexUrl;
            summary.downloadUrl = downloadUrl;
        }
        return summary;
    }

    /**
     * @param {string|undefined} string
     * @returns {boolean}
     */
    _validateUrl(string) {
        if (typeof string !== 'string') {
            return false;
        }

        let url;
        try {
            url = new URL(string);
        } catch (_) {
            return false;
        }

        return url.protocol === 'http:' || url.protocol === 'https:';
    }

    /**
     * @param {import('ajv').ValidateFunction} schema
     * @param {string} fileName
     * @returns {ExtensionError}
     */
    _formatAjvSchemaError(schema, fileName) {
        const e = new ExtensionError(`Dictionary has invalid data in '${fileName}' '${JSON.stringify(schema.errors)}'`);
        e.data = schema.errors;
        return e;
    }

    /**
     * @param {number} version
     * @returns {import('dictionary-importer').CompiledSchemaNameArray}
     */
    _getDataBankSchemas(version) {
        const termBank = (
            version === 1 ?
            'dictionaryTermBankV1' :
            'dictionaryTermBankV3'
        );
        const termMetaBank = 'dictionaryTermMetaBankV3';
        const kanjiBank = (
            version === 1 ?
            'dictionaryKanjiBankV1' :
            'dictionaryKanjiBankV3'
        );
        const kanjiMetaBank = 'dictionaryKanjiMetaBankV3';
        const tagBank = 'dictionaryTagBankV3';

        return [termBank, termMetaBank, kanjiBank, kanjiMetaBank, tagBank];
    }

    /**
     * @param {string} css
     * @returns {Error[]}
     */
    _validateCss(css) {
        return css ? [] : [new Error('No styles found')];
    }

    /**
     * @param {import('dictionary-data').TermGlossaryText|import('dictionary-data').TermGlossaryImage|import('dictionary-data').TermGlossaryStructuredContent} data
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @param {import('dictionary-importer').ImportRequirement[]} requirements
     * @returns {import('dictionary-data').TermGlossary}
     * @throws {Error}
     */
    _formatDictionaryTermGlossaryObject(data, entry, requirements) {
        switch (data.type) {
            case 'text':
                return data.text;
            case 'image':
                return this._formatDictionaryTermGlossaryImage(data, entry, requirements);
            case 'structured-content':
                return this._formatStructuredContent(data, entry, requirements);
            default:
                throw new Error(`Unhandled data type: ${/** @type {import('core').SerializableObject} */ (data).type}`);
        }
    }

    /**
     * @param {import('dictionary-data').TermGlossaryImage} data
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @param {import('dictionary-importer').ImportRequirement[]} requirements
     * @returns {import('dictionary-data').TermGlossaryImage}
     */
    _formatDictionaryTermGlossaryImage(data, entry, requirements) {
        if (this._skipMediaImport) {
            return {
                ...data,
                type: 'image',
            };
        }
        /** @type {import('dictionary-data').TermGlossaryImage} */
        const target = {
            type: 'image',
            path: '', // Will be populated during requirement resolution
        };
        requirements.push({type: 'image', target, source: data, entry});
        return target;
    }

    /**
     * @param {import('dictionary-data').TermGlossaryStructuredContent} data
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @param {import('dictionary-importer').ImportRequirement[]} requirements
     * @returns {import('dictionary-data').TermGlossaryStructuredContent}
     */
    _formatStructuredContent(data, entry, requirements) {
        if (this._structuredContentImportFastPath) {
            return data;
        }
        const content = this._prepareStructuredContent(data.content, entry, requirements);
        return {
            type: 'structured-content',
            content,
        };
    }

    /**
     * @param {import('structured-content').Content} content
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @param {import('dictionary-importer').ImportRequirement[]} requirements
     * @returns {import('structured-content').Content}
     */
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

    /**
     * @param {import('structured-content').ImageElement} content
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @param {import('dictionary-importer').ImportRequirement[]} requirements
     * @returns {import('structured-content').ImageElement}
     */
    _prepareStructuredContentImage(content, entry, requirements) {
        if (this._skipMediaImport) {
            return {...content};
        }
        /** @type {import('structured-content').ImageElement} */
        const target = {
            tag: 'img',
            path: '', // Will be populated during requirement resolution
        };
        requirements.push({type: 'structured-content-image', target, source: content, entry});
        return target;
    }

    /**
     * @param {import('dictionary-importer').ImportRequirement[]} requirements
     * @param {import('dictionary-importer').ArchiveFileMap} fileMap
     * @returns {Promise<{media: import('dictionary-database').MediaDataArrayBufferContent[]}>}
     */
    async _resolveAsyncRequirements(requirements, fileMap) {
        /** @type {Map<string, import('dictionary-database').MediaDataArrayBufferContent>} */
        const media = new Map();
        /** @type {import('dictionary-importer').ImportRequirementContext} */
        const context = {fileMap, media};

        await this._runWithConcurrencyLimit(requirements, this._mediaResolutionConcurrency, async (requirement) => {
            await this._resolveAsyncRequirement(context, requirement);
        });

        return {
            media: [...media.values()],
        };
    }

    /**
     * @param {import('dictionary-importer').ImportRequirementContext} context
     * @param {import('dictionary-importer').ImportRequirement} requirement
     */
    async _resolveAsyncRequirement(context, requirement) {
        switch (requirement.type) {
            case 'image':
                await this._resolveDictionaryTermGlossaryImage(
                    context,
                    requirement.target,
                    requirement.source,
                    requirement.entry,
                );
                break;
            case 'structured-content-image':
                await this._resolveStructuredContentImage(
                    context,
                    requirement.target,
                    requirement.source,
                    requirement.entry,
                );
                break;
            default:
                return;
        }
    }

    /**
     * @param {import('dictionary-importer').ImportRequirementContext} context
     * @param {import('dictionary-data').TermGlossaryImage} target
     * @param {import('dictionary-data').TermGlossaryImage} source
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     */
    async _resolveDictionaryTermGlossaryImage(context, target, source, entry) {
        await this._createImageData(context, target, source, entry);
    }

    /**
     * @param {import('dictionary-importer').ImportRequirementContext} context
     * @param {import('structured-content').ImageElement} target
     * @param {import('structured-content').ImageElement} source
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     */
    async _resolveStructuredContentImage(context, target, source, entry) {
        const {
            verticalAlign,
            border,
            borderRadius,
            sizeUnits,
        } = source;
        await this._createImageData(context, target, source, entry);
        if (typeof verticalAlign === 'string') { target.verticalAlign = verticalAlign; }
        if (typeof border === 'string') { target.border = border; }
        if (typeof borderRadius === 'string') { target.borderRadius = borderRadius; }
        if (typeof sizeUnits === 'string') { target.sizeUnits = sizeUnits; }
    }

    /**
     * @param {import('dictionary-importer').ImportRequirementContext} context
     * @param {import('structured-content').ImageElementBase} target
     * @param {import('structured-content').ImageElementBase} source
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     */
    async _createImageData(context, target, source, entry) {
        const {
            path,
            width: preferredWidth,
            height: preferredHeight,
            title,
            alt,
            description,
            pixelated,
            imageRendering,
            appearance,
            background,
            collapsed,
            collapsible,
        } = source;
        const {width, height} = await this._getImageMedia(context, path, entry);
        target.path = path;
        target.width = width;
        target.height = height;
        if (typeof preferredWidth === 'number') { target.preferredWidth = preferredWidth; }
        if (typeof preferredHeight === 'number') { target.preferredHeight = preferredHeight; }
        if (typeof title === 'string') { target.title = title; }
        if (typeof alt === 'string') { target.alt = alt; }
        if (typeof description === 'string') { target.description = description; }
        if (typeof pixelated === 'boolean') { target.pixelated = pixelated; }
        if (typeof imageRendering === 'string') { target.imageRendering = imageRendering; }
        if (typeof appearance === 'string') { target.appearance = appearance; }
        if (typeof background === 'boolean') { target.background = background; }
        if (typeof collapsed === 'boolean') { target.collapsed = collapsed; }
        if (typeof collapsible === 'boolean') { target.collapsible = collapsible; }
    }

    /**
     * @param {import('dictionary-importer').ImportRequirementContext} context
     * @param {string} path
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @returns {Promise<import('dictionary-database').MediaDataArrayBufferContent>}
     */
    async _getImageMedia(context, path, entry) {
        const {media} = context;
        const {dictionary} = entry;

        /**
         * @param {string} message
         * @returns {Error}
         */
        const createError = (message) => {
            const {expression, reading} = entry;
            const readingSource = reading.length > 0 ? ` (${reading})` : '';
            return new Error(`${message} at path ${JSON.stringify(path)} for ${expression}${readingSource} in ${dictionary}`);
        };

        // Check if already added
        const mediaData = media.get(path);
        if (typeof mediaData !== 'undefined') {
            if (getFileExtensionFromImageMediaType(mediaData.mediaType) === null) {
                throw createError('Media file is not a valid image');
            }
            return mediaData;
        }
        const pending = this._pendingImageMediaByPath.get(path);
        if (typeof pending !== 'undefined') {
            return await pending;
        }
        const cachedMetadata = this._imageMetadataByPath.get(path);
        if (typeof cachedMetadata !== 'undefined') {
            return {
                dictionary,
                path,
                mediaType: cachedMetadata.mediaType,
                width: cachedMetadata.width,
                height: cachedMetadata.height,
                content: new ArrayBuffer(0),
            };
        }
        const promise = (async () => {
            // Find file in archive
            const file = context.fileMap.get(path);
            if (typeof file === 'undefined') {
                throw createError('Could not find image');
            }

            // Load file content
            let content = await (await this._getData(file, new BlobWriter())).arrayBuffer();

            const mediaType = getImageMediaTypeFromFileName(path);
            if (mediaType === null) {
                throw createError('Could not determine media type for image');
            }

            let width = 0;
            let height = 0;
            if (!this._skipImageMetadata) {
                // Decode image only when metadata extraction is explicitly enabled.
                try {
                    ({content, width, height} = await this._mediaLoader.getImageDetails(content, mediaType));
                } catch (e) {
                    throw createError('Could not load image');
                }
            }

            const created = {
                dictionary,
                path,
                mediaType,
                width,
                height,
                content,
            };
            this._imageMetadataByPath.set(path, {mediaType, width, height});
            media.set(path, created);
            return created;
        })();
        this._pendingImageMediaByPath.set(path, promise);
        try {
            return await promise;
        } finally {
            this._pendingImageMediaByPath.delete(path);
        }
    }

    /**
     * @template T
     * @param {T[]} items
     * @param {number} concurrency
     * @param {(item: T) => Promise<void>} fn
     * @returns {Promise<void>}
     */
    async _runWithConcurrencyLimit(items, concurrency, fn) {
        if (items.length === 0) {
            return;
        }
        let nextIndex = 0;
        const workerCount = Math.min(concurrency, items.length);
        /** @type {Promise<void>[]} */
        const workers = [];
        for (let i = 0; i < workerCount; ++i) {
            workers.push((async () => {
                while (true) {
                    const index = nextIndex++;
                    if (index >= items.length) {
                        return;
                    }
                    await fn(items[index]);
                }
            })());
        }
        await Promise.all(workers);
    }

    /**
     * @param {import('dictionary-data').TermV1} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').DatabaseTermEntry}
     */
    _convertTermBankEntryV1(entry, dictionary) {
        let [expression, reading, definitionTags, rules, score, ...glossary] = entry;
        reading = reading.length > 0 ? reading : expression;
        return {expression, reading, definitionTags, rules, score, glossary, dictionary};
    }

    /**
     * @param {import('dictionary-data').TermV3} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').DatabaseTermEntry}
     */
    _convertTermBankEntryV3(entry, dictionary) {
        let [expression, reading, definitionTags, rules, score, glossary, sequence, termTags] = entry;
        reading = reading.length > 0 ? reading : expression;
        return {expression, reading, definitionTags, rules, score, glossary, sequence, termTags, dictionary};
    }

    /**
     * @param {import('dictionary-database').DatabaseTermEntry[]} termList
     * @param {boolean} enableTermEntryContentDedup
     */
    _prepareTermImportSerialization(termList, enableTermEntryContentDedup) {
        for (const entry of termList) {
            const glossaryJson = JSON.stringify(entry.glossary);
            if (!enableTermEntryContentDedup) {
                entry.glossaryJson = glossaryJson;
            }
            const definitionTags = entry.definitionTags ?? entry.tags ?? '';
            const termTags = entry.termTags ?? '';
            const contentJson = this._createTermEntryContentJson(entry.rules, definitionTags, termTags, glossaryJson);
            entry.termEntryContentHash = this._hashEntryContent(contentJson);
            entry.termEntryContentBytes = this._textEncoder.encode(contentJson);
        }
    }

    /**
     * @param {string} rules
     * @param {string} definitionTags
     * @param {string} termTags
     * @param {string} glossaryJson
     * @returns {string}
     */
    _createTermEntryContentJson(rules, definitionTags, termTags, glossaryJson) {
        return `{"rules":${JSON.stringify(rules)},"definitionTags":${JSON.stringify(definitionTags)},"termTags":${JSON.stringify(termTags)},"glossary":${glossaryJson}}`;
    }

    /**
     * @param {string} contentJson
     * @returns {string}
     */
    _hashEntryContent(contentJson) {
        let h1 = 0x811c9dc5;
        let h2 = 0x9e3779b9;
        for (let i = 0, ii = contentJson.length; i < ii; ++i) {
            const code = contentJson.charCodeAt(i);
            h1 = Math.imul((h1 ^ code) >>> 0, 0x01000193);
            h2 = Math.imul((h2 ^ code) >>> 0, 0x85ebca6b);
            h2 = (h2 ^ (h2 >>> 13)) >>> 0;
        }
        if ((h1 | h2) === 0) {
            h1 = 1;
        }
        return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
    }

    /**
     * @param {import('dictionary-data').TermMeta} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').DatabaseTermMeta}
     */
    _convertTermMetaBankEntry(entry, dictionary) {
        const [expression, mode, data] = entry;
        return /** @type {import('dictionary-database').DatabaseTermMeta} */ ({expression, mode, data, dictionary});
    }

    /**
     * @param {import('dictionary-data').KanjiV1} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').DatabaseKanjiEntry}
     */
    _convertKanjiBankEntryV1(entry, dictionary) {
        const [character, onyomi, kunyomi, tags, ...meanings] = entry;
        return {character, onyomi, kunyomi, tags, meanings, dictionary};
    }

    /**
     * @param {import('dictionary-data').KanjiV3} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').DatabaseKanjiEntry}
     */
    _convertKanjiBankEntryV3(entry, dictionary) {
        const [character, onyomi, kunyomi, tags, meanings, stats] = entry;
        return {character, onyomi, kunyomi, tags, meanings, stats, dictionary};
    }

    /**
     * @param {import('dictionary-data').KanjiMeta} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').DatabaseKanjiMeta}
     */
    _convertKanjiMetaBankEntry(entry, dictionary) {
        const [character, mode, data] = entry;
        return {character, mode, data, dictionary};
    }

    /**
     * @param {import('dictionary-data').Tag} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').Tag}
     */
    _convertTagBankEntry(entry, dictionary) {
        const [name, category, order, notes, score] = entry;
        return {name, category, order, notes, score, dictionary};
    }

    /**
     * @param {import('dictionary-data').Index} index
     * @param {import('dictionary-database').Tag[]} results
     * @param {string} dictionary
     */
    _addOldIndexTags(index, results, dictionary) {
        const {tagMeta} = index;
        if (typeof tagMeta !== 'object' || tagMeta === null) { return; }
        for (const [name, value] of Object.entries(tagMeta)) {
            const {category, order, notes, score} = value;
            results.push({name, category, order, notes, score, dictionary});
        }
    }

    /**
     * @param {import('dictionary-importer').ArchiveFileMap} fileMap
     * @param {import('dictionary-importer').QueryDetails} queryDetails
     * @returns {import('dictionary-importer').QueryResult}
     */
    _getArchiveFiles(fileMap, queryDetails) {
        /** @type {import('dictionary-importer').QueryResult} */
        const results = new Map();

        for (const [fileType] of queryDetails) {
            results.set(fileType, []);
        }

        for (const [fileName, fileEntry] of fileMap.entries()) {
            for (const [fileType, fileNameFormat] of queryDetails) {
                if (!fileNameFormat.test(fileName)) { continue; }
                const entries = results.get(fileType);

                if (typeof entries !== 'undefined') {
                    entries.push(fileEntry);
                    break;
                }
            }
        }
        return results;
    }

    /**
     * @template [TEntry=unknown]
     * @template [TResult=unknown]
     * @param {import('@zip.js/zip.js').Entry[]} files
     * @param {(entry: TEntry, dictionaryTitle: string) => TResult} convertEntry
     * @param {string} dictionaryTitle
     * @returns {Promise<TResult[]>}
     */
    async _readFileSequence(files, convertEntry, dictionaryTitle) {
        const results = [];
        for (const file of files) {
            const content = await this._getData(file, new TextWriter());
            let entries;

            try {
                /** @type {unknown} */
                entries = parseJson(content);
            } catch (error) {
                if (error instanceof Error) {
                    throw new Error(error.message + ` in '${file.filename}'`);
                }
            }

            if (Array.isArray(entries)) {
                for (const entry of /** @type {TEntry[]} */ (entries)) {
                    results.push(convertEntry(entry, dictionaryTitle));
                }
            }
        }
        return results;
    }

    /**
     * @param {import('@zip.js/zip.js').Entry} file
     * @param {import('dictionary-importer').CompiledSchemaName} schemaName
     * @returns {Promise<boolean>}
     */
    async _validateFile(file, schemaName) {
        const content = await this._getData(file, new TextWriter());
        let entries;

        try {
            /** @type {unknown} */
            entries = parseJson(content);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(error.message + ` in '${file.filename}'`);
            }
        }

        const schema = ajvSchemas[schemaName];
        if (!schema(entries)) {
            throw this._formatAjvSchemaError(schema, file.filename);
        }

        ++this._progressData.index;
        this._progress();

        return true;
    }

    /**
     * @param {import('dictionary-database').DatabaseTermMeta[]|import('dictionary-database').DatabaseKanjiMeta[]} metaList
     * @returns {import('dictionary-importer').SummaryMetaCount}
     */
    _getMetaCounts(metaList) {
        /** @type {Map<string, number>} */
        const countsMap = new Map();
        for (const {mode} of metaList) {
            let count = countsMap.get(mode);
            count = typeof count !== 'undefined' ? count + 1 : 1;
            countsMap.set(mode, count);
        }
        /** @type {import('dictionary-importer').SummaryMetaCount} */
        const counts = {total: metaList.length};
        for (const [key, value] of countsMap.entries()) {
            if (Object.prototype.hasOwnProperty.call(counts, key)) { continue; }
            counts[key] = value;
        }
        return counts;
    }

    /**
     * @template [T=unknown]
     * @param {import('@zip.js/zip.js').Entry} entry
     * @param {import('@zip.js/zip.js').Writer<T>|import('@zip.js/zip.js').WritableWriter} writer
     * @returns {Promise<T>}
     */
    async _getData(entry, writer) {
        if (typeof entry.getData === 'undefined') {
            throw new Error(`Cannot read ${entry.filename}`);
        }
        return await entry.getData(writer);
    }
}
