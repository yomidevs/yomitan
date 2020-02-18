const fs = require('fs');
const path = require('path');

const jsonSchemaFileName = path.join(__dirname, '../ext/bg/js/json-schema.js');
const jsonSchemaFileSource = fs.readFileSync(jsonSchemaFileName, {encoding: 'utf8'});
const JsonSchema = Function(`'use strict';${jsonSchemaFileSource};return JsonSchema;`)();


function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log([
            'Usage:',
            '  node schema-validate <schema-file-name> <data-file-names>...'
        ].join('\n'));
        return;
    }

    const schemaSource = fs.readFileSync(args[0], {encoding: 'utf8'});
    const schema = JSON.parse(schemaSource);

    for (const dataFileName of args.slice(1)) {
        try {
            console.log(`Validating ${dataFileName}...`);
            const dataSource = fs.readFileSync(dataFileName, {encoding: 'utf8'});
            const data = JSON.parse(dataSource);
            JsonSchema.validate(data, schema);
            console.log('No issues found');
        } catch (e) {
            console.warn(e);
        }
    }
}


if (require.main === module) { main(); }
