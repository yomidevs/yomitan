const yomichanTest = require('./yomichan-test');
const dictionaryValidate = require('./dictionary-validate');


async function main() {
    const archive = yomichanTest.createTestDictionaryArchive();
    const schemas = dictionaryValidate.getSchemas();
    await dictionaryValidate.validateDictionary(archive, schemas);
}


if (require.main === module) { main(); }
