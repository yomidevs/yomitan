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

/**
 * Utility class to help processing profile conditions.
 */
class ProfileConditionsUtil {
    /**
     * Creates a new instance.
     */
    constructor() {
        this._splitPattern = /[,;\s]+/;
        this._descriptors = new Map([
            [
                'popupLevel',
                {
                    operators: new Map([
                        ['equal',              this._createSchemaPopupLevelEqual.bind(this)],
                        ['notEqual',           this._createSchemaPopupLevelNotEqual.bind(this)],
                        ['lessThan',           this._createSchemaPopupLevelLessThan.bind(this)],
                        ['greaterThan',        this._createSchemaPopupLevelGreaterThan.bind(this)],
                        ['lessThanOrEqual',    this._createSchemaPopupLevelLessThanOrEqual.bind(this)],
                        ['greaterThanOrEqual', this._createSchemaPopupLevelGreaterThanOrEqual.bind(this)]
                    ])
                }
            ],
            [
                'url',
                {
                    operators: new Map([
                        ['matchDomain', this._createSchemaUrlMatchDomain.bind(this)],
                        ['matchRegExp', this._createSchemaUrlMatchRegExp.bind(this)]
                    ])
                }
            ],
            [
                'modifierKeys',
                {
                    operators: new Map([
                        ['are', this._createSchemaModifierKeysAre.bind(this)],
                        ['areNot', this._createSchemaModifierKeysAreNot.bind(this)],
                        ['include', this._createSchemaModifierKeysInclude.bind(this)],
                        ['notInclude', this._createSchemaModifierKeysNotInclude.bind(this)]
                    ])
                }
            ]
        ]);
    }

    /**
     * Creates a new JSON schema descriptor for the given set of condition groups.
     * @param conditionGroups An array of condition groups in the following format:
     *  conditionGroups = [
     *      {
     *          conditions: [
     *              {
     *                  type: (condition type: string),
     *                  operator: (condition sub-type: string),
     *                  value: (value to compare against: string)
     *              },
     *              ...
     *          ]
     *      },
     *      ...
     *  ]
     */
    createSchema(conditionGroups) {
        const anyOf = [];
        for (const {conditions} of conditionGroups) {
            const allOf = [];
            for (const {type, operator, value} of conditions) {
                const conditionDescriptor = this._descriptors.get(type);
                if (typeof conditionDescriptor === 'undefined') { continue; }

                const createSchema = conditionDescriptor.operators.get(operator);
                if (typeof createSchema === 'undefined') { continue; }

                const schema = createSchema(value);
                allOf.push(schema);
            }
            switch (allOf.length) {
                case 0: break;
                case 1: anyOf.push(allOf[0]); break;
                default: anyOf.push({allOf}); break;
            }
        }
        switch (anyOf.length) {
            case 0: return {};
            case 1: return anyOf[0];
            default: return {anyOf};
        }
    }

    /**
     * Creates a normalized version of the context object to test,
     * assigning dependent fields as needed.
     * @param context A context object which is used during schema validation.
     * @returns A normalized context object.
     */
    normalizeContext(context) {
        const normalizedContext = Object.assign({}, context);
        const {url} = normalizedContext;
        if (typeof url === 'string') {
            try {
                normalizedContext.domain = new URL(url).hostname;
            } catch (e) {
                // NOP
            }
        }
        return normalizedContext;
    }

    // Private

    _split(value) {
        return value.split(this._splitPattern);
    }

    _stringToNumber(value) {
        const number = Number.parseFloat(value);
        return Number.isFinite(number) ? number : 0;
    }

    // popupLevel schema creation functions

    _createSchemaPopupLevelEqual(value) {
        value = this._stringToNumber(value);
        return {
            required: ['depth'],
            properties: {
                depth: {const: value}
            }
        };
    }

    _createSchemaPopupLevelNotEqual(value) {
        return {
            not: [this._createSchemaPopupLevelEqual(value)]
        };
    }

    _createSchemaPopupLevelLessThan(value) {
        value = this._stringToNumber(value);
        return {
            required: ['depth'],
            properties: {
                depth: {type: 'number', exclusiveMaximum: value}
            }
        };
    }

    _createSchemaPopupLevelGreaterThan(value) {
        value = this._stringToNumber(value);
        return {
            required: ['depth'],
            properties: {
                depth: {type: 'number', exclusiveMinimum: value}
            }
        };
    }

    _createSchemaPopupLevelLessThanOrEqual(value) {
        value = this._stringToNumber(value);
        return {
            required: ['depth'],
            properties: {
                depth: {type: 'number', maximum: value}
            }
        };
    }

    _createSchemaPopupLevelGreaterThanOrEqual(value) {
        value = this._stringToNumber(value);
        return {
            required: ['depth'],
            properties: {
                depth: {type: 'number', minimum: value}
            }
        };
    }

    // url schema creation functions

    _createSchemaUrlMatchDomain(value) {
        const oneOf = [];
        for (let domain of this._split(value)) {
            if (domain.length === 0) { continue; }
            domain = domain.toLowerCase();
            oneOf.push({const: domain});
        }
        return {
            required: ['domain'],
            properties: {
                domain: {oneOf}
            }
        };
    }

    _createSchemaUrlMatchRegExp(value) {
        return {
            required: ['url'],
            properties: {
                url: {type: 'string', pattern: value, patternFlags: 'i'}
            }
        };
    }

    // modifierKeys schema creation functions

    _createSchemaModifierKeysAre(value) {
        return this._createSchemaModifierKeysGeneric(value, true, false);
    }

    _createSchemaModifierKeysAreNot(value) {
        return {
            not: [this._createSchemaModifierKeysGeneric(value, true, false)]
        };
    }

    _createSchemaModifierKeysInclude(value) {
        return this._createSchemaModifierKeysGeneric(value, false, false);
    }

    _createSchemaModifierKeysNotInclude(value) {
        return this._createSchemaModifierKeysGeneric(value, false, true);
    }

    _createSchemaModifierKeysGeneric(value, exact, none) {
        const containsList = [];
        for (const modifierKey of this._split(value)) {
            if (modifierKey.length === 0) { continue; }
            containsList.push({
                contains: {
                    const: modifierKey
                }
            });
        }
        const containsListCount = containsList.length;
        const modifierKeysSchema = {
            type: 'array'
        };
        if (exact) {
            modifierKeysSchema.maxItems = containsListCount;
        }
        if (none) {
            if (containsListCount > 0) {
                modifierKeysSchema.not = containsList;
            }
        } else {
            modifierKeysSchema.minItems = containsListCount;
            if (containsListCount > 0) {
                modifierKeysSchema.allOf = containsList;
            }
        }
        return {
            required: ['modifierKeys'],
            properties: {
                modifierKeys: modifierKeysSchema
            }
        };
    }
}
