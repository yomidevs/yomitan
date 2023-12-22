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
    // TODO: generalize, extract to language-specific file?
    /* eslint-disable no-multi-spaces */
    /** @type {Map<string, import('translation-internal').DeinflectionRuleFlags>} */
    static _ruleTypes = new Map([
        ['v',       /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b0000011111)], // Verb
        ['verb',    /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b0000011111)], // Verb
        ['v1',      /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b0000000001)], // Verb ichidan
        ['v5',      /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b0000000010)], // Verb godan
        ['vs',      /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b0000000100)], // Verb suru
        ['vk',      /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b0000001000)], // Verb kuru
        ['vz',      /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b0000010000)], // Verb zuru
        ['adj',     /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b0000100000)], // Adjective
        ['adj-i',   /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b0000100000)], // Adjective i
        ['iru',     /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b0001000000)], // Intermediate -iru endings for progressive or perfect tens
        ['n',       /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b0010000000)], // Noun
        ['noun',    /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b0010000000)], // Noun'
        ['pn',      /** @type {import('translation-internal').DeinflectionRuleFlags} */ (0b0100000000)] // Pronoun
    ]);
    /* eslint-enable no-multi-spaces */

    /**
     * @param {import('../language/language-util.js').LanguageUtil} languageUtil
     */
    constructor(languageUtil) {
        this._languageUtil = languageUtil;
    }

    /**
     * Deinflects a term to all of its possible dictionary forms.
     * @param {string} source
     * @param {any} options
     */
    async deinflect(source, options) {
        const checkRules = options.deinflectionPosFilter;
        const results = [this._createDeinflection(source, 0, [])];

        for (let i = 0; i < results.length && i < 200; ++i) {
            const {rules, term, reasons} = results[i];
            const deinflectionReasons = Deinflector.normalizeReasons(await this._languageUtil.getDeinflectionReasons(options.language));
            for (const [reason, variants] of deinflectionReasons) {
                for (const [inflected, uninflect, rulesIn, rulesOut] of variants) {
                    if (
                        (checkRules && !this._rulesFit(rules, rulesIn)) ||
                        !inflected.test(term)
                    ) {
                        continue;
                    }

                    results.push(this._createDeinflection(
                        uninflect(term),
                        rulesOut,
                        [...reason, ...reasons]
                    ));
                }
            }
        }

        return results;
    }

    _rulesFit(rules1, rules2) {
        return rules1 === 0 || (rules1 & rules2) !== 0;
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
     * @returns {Map<string[], import('deinflector').Reason[]>}
     */
    static normalizeReasons(reasons) {
        /** @type {Map<string[], import('deinflector').Reason[]>} */
        const normalizedReasons = new Map();
        for (let [reason, reasonInfo] of reasons) {
            if (!Array.isArray(reason)) {
                reason = [reason];
            }
            const variants = reasonInfo.map(({inflected, uninflect, rulesIn, rulesOut}) => [
                inflected,
                uninflect,
                this.rulesToRuleFlags(rulesIn),
                this.rulesToRuleFlags(rulesOut)
            ]);
            normalizedReasons.set(reason, variants);
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

