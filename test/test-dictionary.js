const yomichanTest = require('./yomichan-test');
const dictionaryValidate = require('./dictionary-validate');


async function main() {
    const dictionaries = [
        {name: 'valid-dictionary1', valid: true},
        {name: 'invalid-dictionary1', valid: false},
        {name: 'invalid-dictionary2', valid: false},
        {name: 'invalid-dictionary3', valid: false},
        {name: 'invalid-dictionary4', valid: false},
        {name: 'invalid-dictionary5', valid: false},
        {name: 'invalid-dictionary6', valid: false}
    ];

    const schemas = dictionaryValidate.getSchemas();

    for (const {name, valid} of dictionaries) {
        const archive = yomichanTest.createTestDictionaryArchive(name);

        let error = null;
        try {
            await dictionaryValidate.validateDictionary(archive, schemas);
        } catch (e) {
            error = e;
        }

        if (valid) {
            if (error !== null) {
                throw error;
            }
        } else {
            if (error === null) {
                throw new Error(`Expected dictionary ${name} to be invalid`);
            }
        }
    }
}


if (require.main === module) { main(); }
