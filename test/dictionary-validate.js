const fs = require('fs');
const path = require('path');

process.noDeprecation = true; // Suppress a warning about JSZip
const JSZip = require(path.join(__dirname, '../ext/mixed/lib/jszip.min.js'));
process.noDeprecation = false;

const jsonSchemaFileName = path.join(__dirname, '../ext/bg/js/json-schema.js');
const jsonSchemaFileSource = fs.readFileSync(jsonSchemaFileName, {encoding: 'utf8'});
const JsonSchema = Function(`'use strict';${jsonSchemaFileSource};return JsonSchema;`)();


function readSchema(relativeFileName) {
    const fileName = path.join(__dirname, relativeFileName);
    const source = fs.readFileSync(fileName, {encoding: 'utf8'});
    return JSON.parse(source);
}


async function validateDictionaryBanks(zip, fileNameFormat, schema) {
    let index = 1;
    while (true) {
        const fileName = fileNameFormat.replace(/%s/, index);

        const file = zip.files[fileName];
        if (!file) { break; }

        const data = JSON.parse(await file.async('string'));
        JsonSchema.validate(data, schema);

        ++index;
    }
}

async function validateDictionary(fileName, schemas) {
    const source = fs.readFileSync(fileName);
    const zip = await JSZip.loadAsync(source);

    const indexFile = zip.files['index.json'];
    if (!indexFile) {
        throw new Error('No dictionary index found in archive');
    }

    const index = JSON.parse(await indexFile.async('string'));
    const version = index.format || index.version;

    JsonSchema.validate(index, schemas.index);

    await validateDictionaryBanks(zip, 'term_bank_%s.json', version === 1 ? schemas.termBankV1 : schemas.termBankV3);
    await validateDictionaryBanks(zip, 'term_meta_bank_%s.json', schemas.termMetaBankV3);
    await validateDictionaryBanks(zip, 'kanji_bank_%s.json', version === 1 ? schemas.kanjiBankV1 : schemas.kanjiBankV3);
    await validateDictionaryBanks(zip, 'kanji_meta_bank_%s.json', schemas.kanjiMetaBankV3);
    await validateDictionaryBanks(zip, 'tag_bank_%s.json', schemas.tagBankV3);
}


async function main() {
    const dictionaryFileNames = process.argv.slice(2);
    if (dictionaryFileNames.length === 0) {
        console.log([
            'Usage:',
            '  node dictionary-validate <dictionary-file-names>...'
        ].join('\n'));
        return;
    }

    const schemas = {
        index: readSchema('../ext/bg/data/dictionary-index-schema.json'),
        kanjiBankV1: readSchema('../ext/bg/data/dictionary-kanji-bank-v1-schema.json'),
        kanjiBankV3: readSchema('../ext/bg/data/dictionary-kanji-bank-v3-schema.json'),
        kanjiMetaBankV3: readSchema('../ext/bg/data/dictionary-kanji-meta-bank-v3-schema.json'),
        tagBankV3: readSchema('../ext/bg/data/dictionary-tag-bank-v3-schema.json'),
        termBankV1: readSchema('../ext/bg/data/dictionary-term-bank-v1-schema.json'),
        termBankV3: readSchema('../ext/bg/data/dictionary-term-bank-v3-schema.json'),
        termMetaBankV3: readSchema('../ext/bg/data/dictionary-term-meta-bank-v3-schema.json')
    };

    for (const dictionaryFileName of dictionaryFileNames) {
        try {
            console.log(`Validating ${dictionaryFileName}...`);
            await validateDictionary(dictionaryFileName, schemas);
            console.log('No issues found');
        } catch (e) {
            console.warn(e);
        }
    }
}


main();
