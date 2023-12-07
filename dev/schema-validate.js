/*
 * Copyright (C) 2023  Yomitan Authors
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

import Ajv from 'ajv';
import {JsonSchema} from '../ext/js/data/json-schema.js';

class JsonSchemaAjv {
    constructor(schema) {
        const ajv = new Ajv({
            meta: false,
            strictTuples: false,
            allowUnionTypes: true
        });
        ajv.addMetaSchema(require('ajv/dist/refs/json-schema-draft-07.json'));
        this._validate = ajv.compile(schema);
    }

    validate(data) {
        if (this._validate(data)) { return; }
        const {errors} = this._validate;
        const error = new Error('Schema validation failed');
        error.data = JSON.parse(JSON.stringify(errors));
        throw error;
    }
}

export function createJsonSchema(mode, schema) {
    switch (mode) {
        case 'ajv': return new JsonSchemaAjv(schema);
        default: return new JsonSchema(schema);
    }
}
