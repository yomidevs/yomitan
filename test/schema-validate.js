/*
 * Copyright (C) 2020  Yomichan Authors
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

const fs = require('fs');
const {VM} = require('./yomichan-vm');

const vm = new VM();
vm.execute('bg/js/json-schema.js');
const JsonSchema = vm.get('JsonSchema');


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
