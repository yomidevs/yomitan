/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


function conditionsValidateOptionValue(object, value) {
    if (object.hasOwnProperty('validate') && !object.validate(value)) {
        throw new Error('Invalid value for condition');
    }

    if (object.hasOwnProperty('transform')) {
        value = object.transform(value);

        if (object.hasOwnProperty('validateTransformed') && !object.validateTransformed(value)) {
            throw new Error('Invalid value for condition');
        }
    }

    return value;
}

function conditionsNormalizeOptionValue(descriptors, type, operator, optionValue) {
    if (!descriptors.hasOwnProperty(type)) {
        throw new Error('Invalid type');
    }

    const conditionDescriptor = descriptors[type];
    if (!conditionDescriptor.operators.hasOwnProperty(operator)) {
        throw new Error('Invalid operator');
    }

    const operatorDescriptor = conditionDescriptor.operators[operator];

    let transformedValue = conditionsValidateOptionValue(conditionDescriptor, optionValue);
    transformedValue = conditionsValidateOptionValue(operatorDescriptor, transformedValue);

    if (operatorDescriptor.hasOwnProperty('transformReverse')) {
        transformedValue = operatorDescriptor.transformReverse(transformedValue);
    }
    return transformedValue;
}

function conditionsTestValueThrowing(descriptors, type, operator, optionValue, value) {
    if (!descriptors.hasOwnProperty(type)) {
        throw new Error('Invalid type');
    }

    const conditionDescriptor = descriptors[type];
    if (!conditionDescriptor.operators.hasOwnProperty(operator)) {
        throw new Error('Invalid operator');
    }

    const operatorDescriptor = conditionDescriptor.operators[operator];
    if (operatorDescriptor.hasOwnProperty('transform')) {
        if (operatorDescriptor.hasOwnProperty('transformCache')) {
            const key = `${optionValue}`;
            const transformCache = operatorDescriptor.transformCache;
            if (transformCache.hasOwnProperty(key)) {
                optionValue = transformCache[key];
            } else {
                optionValue = operatorDescriptor.transform(optionValue);
                transformCache[key] = optionValue;
            }
        } else {
            optionValue = operatorDescriptor.transform(optionValue);
        }
    }

    return operatorDescriptor.test(value, optionValue);
}

function conditionsTestValue(descriptors, type, operator, optionValue, value) {
    try {
        return conditionsTestValueThrowing(descriptors, type, operator, optionValue, value);
    } catch (e) {
        return false;
    }
}

function conditionsClearCaches(descriptors) {
    for (const type in descriptors) {
        if (!descriptors.hasOwnProperty(type)) {
            continue;
        }

        const conditionDescriptor = descriptors[type];
        if (conditionDescriptor.hasOwnProperty('transformCache')) {
            conditionDescriptor.transformCache = {};
        }

        const operatorDescriptors = conditionDescriptor.operators;
        for (const operator in operatorDescriptors) {
            if (!operatorDescriptors.hasOwnProperty(operator)) {
                continue;
            }

            const operatorDescriptor = operatorDescriptors[operator];
            if (operatorDescriptor.hasOwnProperty('transformCache')) {
                operatorDescriptor.transformCache = {};
            }
        }
    }
}
