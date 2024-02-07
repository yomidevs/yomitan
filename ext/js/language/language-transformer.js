/*
 * Copyright (C) 2024  Yomitan Authors
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

import {escapeRegExp} from '../core/utilities.js';

export class LanguageTransformer {
    constructor() {
        /** @type {number} */
        this._nextFlagIndex = 0;
        /** @type {import('language-transformer-internal').Transform[]} */
        this._transforms = [];
        /** @type {Map<string, number>} */
        this._conditionTypeToConditionFlagsMap = new Map();
        /** @type {Map<string, number>} */
        this._partOfSpeechToConditionFlagsMap = new Map();
    }

    /** */
    clear() {
        this._nextFlagIndex = 0;
        this._transforms = [];
        this._conditionTypeToConditionFlagsMap.clear();
        this._partOfSpeechToConditionFlagsMap.clear();
    }

    /**
     * Note: this function does not currently combine properly with previous descriptors,
     * they are treated as completely separate collections. This should eventually be changed.
     * @param {import('language-transformer').LanguageTransformDescriptor} descriptor
     * @throws {Error}
     */
    addDescriptor(descriptor) {
        const {conditions, transforms} = descriptor;
        const conditionEntries = Object.entries(conditions);
        const {conditionFlagsMap, nextFlagIndex} = this._getConditionFlagsMap(conditionEntries, this._nextFlagIndex);

        /** @type {import('language-transformer-internal').Transform[]} */
        const transforms2 = [];
        for (let i = 0, ii = transforms.length; i < ii; ++i) {
            const {name, rules} = transforms[i];
            /** @type {import('language-transformer-internal').Rule[]} */
            const rules2 = [];
            for (let j = 0, jj = rules.length; j < jj; ++j) {
                const {suffixIn, suffixOut, conditionsIn, conditionsOut} = rules[j];
                const conditionFlagsIn = this._getConditionFlags(conditionFlagsMap, conditionsIn);
                if (conditionFlagsIn === null) { throw new Error(`Invalid conditionsIn for transform[${i}].rules[${j}]`); }
                const conditionFlagsOut = this._getConditionFlags(conditionFlagsMap, conditionsOut);
                if (conditionFlagsOut === null) { throw new Error(`Invalid conditionsOut for transform[${i}].rules[${j}]`); }
                rules2.push({
                    suffixIn,
                    suffixOut,
                    conditionsIn: conditionFlagsIn,
                    conditionsOut: conditionFlagsOut
                });
            }
            const suffixes = rules.map((rule) => rule.suffixIn);
            const suffixHeuristic = new RegExp(`(${suffixes.map((suffix) => escapeRegExp(suffix)).join('|')})$`);
            transforms2.push({name, rules: rules2, suffixHeuristic});
        }

        this._nextFlagIndex = nextFlagIndex;
        for (const transform of transforms2) {
            this._transforms.push(transform);
        }

        for (const [type, condition] of conditionEntries) {
            const flags = conditionFlagsMap.get(type);
            if (typeof flags === 'undefined') { continue; } // This case should never happen
            this._conditionTypeToConditionFlagsMap.set(type, flags);
            for (const partOfSpeech of condition.partsOfSpeech) {
                this._partOfSpeechToConditionFlagsMap.set(partOfSpeech, this.getConditionFlagsFromPartOfSpeech(partOfSpeech) | flags);
            }
        }
    }

    /**
     * @param {string} partOfSpeech
     * @returns {number}
     */
    getConditionFlagsFromPartOfSpeech(partOfSpeech) {
        const conditionFlags = this._partOfSpeechToConditionFlagsMap.get(partOfSpeech);
        return typeof conditionFlags !== 'undefined' ? conditionFlags : 0;
    }

    /**
     * @param {string[]} partsOfSpeech
     * @returns {number}
     */
    getConditionFlagsFromPartsOfSpeech(partsOfSpeech) {
        let result = 0;
        for (const partOfSpeech of partsOfSpeech) {
            result |= this.getConditionFlagsFromPartOfSpeech(partOfSpeech);
        }
        return result;
    }

    /**
     * @param {string} conditionType
     * @returns {number}
     */
    getConditionFlagsFromConditionType(conditionType) {
        const conditionFlags = this._conditionTypeToConditionFlagsMap.get(conditionType);
        return typeof conditionFlags !== 'undefined' ? conditionFlags : 0;
    }

    /**
     * @param {string[]} conditionTypes
     * @returns {number}
     */
    getConditionFlagsFromConditionTypes(conditionTypes) {
        let result = 0;
        for (const conditionType of conditionTypes) {
            result |= this.getConditionFlagsFromConditionType(conditionType);
        }
        return result;
    }

    /**
     * @param {string} sourceText
     * @returns {import('language-transformer-internal').TransformedText[]}
     */
    transform(sourceText) {
        const results = [this._createTransformedText(sourceText, 0, [])];
        for (let i = 0; i < results.length; ++i) {
            const {text, conditions, trace} = results[i];
            for (const transform of this._transforms) {
                if (!transform.suffixHeuristic.test(text)) { continue; }

                const {name, rules} = transform;
                for (let j = 0, jj = rules.length; j < jj; ++j) {
                    const rule = rules[j];
                    if (!LanguageTransformer.conditionsMatch(conditions, rule.conditionsIn)) { continue; }
                    const {suffixIn, suffixOut} = rule;
                    if (!text.endsWith(suffixIn) || (text.length - suffixIn.length + suffixOut.length) <= 0) { continue; }
                    results.push(this._createTransformedText(
                        text.substring(0, text.length - suffixIn.length) + suffixOut,
                        rule.conditionsOut,
                        this._extendTrace(trace, {transform: name, ruleIndex: j})
                    ));
                }
            }
        }
        return results;
    }

    /**
     * @param {import('language-transformer').ConditionMapEntries} conditions
     * @param {number} nextFlagIndex
     * @returns {{conditionFlagsMap: Map<string, number>, nextFlagIndex: number}}
     * @throws {Error}
     */
    _getConditionFlagsMap(conditions, nextFlagIndex) {
        /** @type {Map<string, number>} */
        const conditionFlagsMap = new Map();
        /** @type {import('language-transformer').ConditionMapEntries} */
        let targets = conditions;
        while (targets.length > 0) {
            const nextTargets = [];
            for (const target of targets) {
                const [type, condition] = target;
                const {subConditions} = condition;
                let flags = 0;
                if (typeof subConditions === 'undefined') {
                    if (nextFlagIndex >= 32) {
                        // Flags greater than or equal to 32 don't work because JavaScript only supports up to 32-bit integer operations
                        throw new Error('Maximum number of conditions was exceeded');
                    }
                    flags = 1 << nextFlagIndex;
                    ++nextFlagIndex;
                } else {
                    const multiFlags = this._getConditionFlags(conditionFlagsMap, subConditions);
                    if (multiFlags === null) {
                        nextTargets.push(target);
                        continue;
                    } else {
                        flags = multiFlags;
                    }
                }
                conditionFlagsMap.set(type, flags);
            }
            if (nextTargets.length === targets.length) {
                // Cycle in subRule declaration
                throw new Error('Maximum number of conditions was exceeded');
            }
            targets = nextTargets;
        }
        return {conditionFlagsMap, nextFlagIndex};
    }

    /**
     * @param {Map<string, number>} conditionFlagsMap
     * @param {string[]} conditionTypes
     * @returns {?number}
     */
    _getConditionFlags(conditionFlagsMap, conditionTypes) {
        let flags = 0;
        for (const conditionType of conditionTypes) {
            const flags2 = conditionFlagsMap.get(conditionType);
            if (typeof flags2 === 'undefined') { return null; }
            flags |= flags2;
        }
        return flags;
    }

    /**
     * @param {string} text
     * @param {number} conditions
     * @param {import('language-transformer-internal').Trace} trace
     * @returns {import('language-transformer-internal').TransformedText}
     */
    _createTransformedText(text, conditions, trace) {
        return {text, conditions, trace};
    }

    /**
     * @param {import('language-transformer-internal').Trace} trace
     * @param {import('language-transformer-internal').TraceFrame} newFrame
     * @returns {import('language-transformer-internal').Trace}
     */
    _extendTrace(trace, newFrame) {
        const newTrace = [newFrame];
        for (const {transform, ruleIndex} of trace) {
            newTrace.push({transform, ruleIndex});
        }
        return newTrace;
    }

    /**
     * If `currentConditions` is `0`, then `nextConditions` is ignored and `true` is returned.
     * Otherwise, there must be at least one shared condition between `currentConditions` and `nextConditions`.
     * @param {number} currentConditions
     * @param {number} nextConditions
     * @returns {boolean}
     */
    static conditionsMatch(currentConditions, nextConditions) {
        return currentConditions === 0 || (currentConditions & nextConditions) !== 0;
    }
}
