/*
 * Copyright (C) 2023  Yomitan Authors
 * Copyright (C) 2016-2022  Yomichan Authors
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

export class Deinflector {
    /**
     * @param {import('deinflector').ReasonsRaw} reasons
     */
    constructor(reasons) {
        /** @type {import('deinflector').Reason[]} */
        this.reasons = Deinflector.normalizeReasons(reasons);
    }

    /**
     * @param {string} source
     * @returns {import('translation-internal').Deinflection[]}
     */
    deinflect(source) {
        const results = [this._createDeinflection(source, 0, [])];
        for (let i = 0; i < results.length; ++i) {
            const {rules, term, reasons} = results[i];
            for (const [reason, variants] of this.reasons) {
                for (const [kanaIn, kanaOut, rulesIn, rulesOut] of variants) {
                    if (
                        (rules !== 0 && (rules & rulesIn) === 0) ||
                        !term.endsWith(kanaIn) ||
                        (term.length - kanaIn.length + kanaOut.length) <= 0
                    ) {
                        continue;
                    }

                    results.push(this._createDeinflection(
                        term.substring(0, term.length - kanaIn.length) + kanaOut,
                        rulesOut,
                        [reason, ...reasons]
                    ));
                }
            }
        }
        return results;
    }

    /**
     * @param {string} term
     * @param {import('translation-internal').DeinflectionRuleFlags} rules
     * @param {string[]} reasons
     * @returns {import('translation-internal').Deinflection}
     */
    _createDeinflection(term, rules, reasons) {
        return {term, rules, reasons};
    }

    /**
     * @param {import('deinflector').ReasonsRaw} reasons
     * @returns {import('deinflector').Reason[]}
     */
    static normalizeReasons(reasons) {
        /** @type {import('deinflector').Reason[]} */
        const normalizedReasons = [];
        for (const [reason, reasonInfo] of Object.entries(reasons)) {
            /** @type {import('deinflector').ReasonVariant[]} */
            const variants = [];
            for (const {kanaIn, kanaOut, rulesIn, rulesOut} of reasonInfo) {
                variants.push([
                    kanaIn,
                    kanaOut,
                    this.rulesToRuleFlags(rulesIn),
                    this.rulesToRuleFlags(rulesOut)
                ]);
            }
            normalizedReasons.push([reason, variants]);
        }
        return normalizedReasons;
    }

    /**
     * @param {string[]} rules
     * @returns {import('translation-internal').DeinflectionRuleFlags}
     */
    static rulesToRuleFlags(rules) {
        const ruleTypes = this._ruleTypes;
        let value = 0;
        for (const rule of rules) {
            const ruleBits = ruleTypes.get(rule);
            if (typeof ruleBits === 'undefined') { continue; }
            value |= ruleBits;
        }
        return value;
    }
}


/* eslint-disable no-multi-spaces */
/** @type {Map<string, import('translation-internal').DeinflectionRuleFlags>} */
// eslint-disable-next-line no-underscore-dangle
Deinflector._ruleTypes = new Map([
    ['v1',    /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b00000001)], // Verb ichidan
    ['v5',    /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b00000010)], // Verb godan
    ['vs',    /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b00000100)], // Verb suru
    ['vk',    /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b00001000)], // Verb kuru
    ['vz',    /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b00010000)], // Verb zuru
    ['adj-i', /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b00100000)], // Adjective i
    ['iru',   /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b01000000)] // Intermediate -iru endings for progressive or perfect tense
]);
/* eslint-enable no-multi-spaces */
