/*
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


class Deinflector {
    constructor(languageUtil) {
        this._languageUtil = languageUtil;
    }

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
                        [reason, ...reasons]
                    ));
                }
            }
        }

        return results;
    }

    _rulesFit(rules1, rules2) {
        return rules1 === 0 || (rules1 & rules2) !== 0;
    }

    _createDeinflection(term, rules, reasons) {
        return {term, rules, reasons};
    }

    static normalizeReasons(reasons) {
        return Object.entries(reasons).map(([reason, reasonInfo]) => {
            const variants = reasonInfo.map(({inflected, uninflect, rulesIn, rulesOut}) => [
                inflected,
                uninflect,
                this.rulesToRuleFlags(rulesIn),
                this.rulesToRuleFlags(rulesOut)
            ]);
            return [reason, variants];
        });
    }

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

// TODO: generalize, extract to language-specific file?
// eslint-disable-next-line no-underscore-dangle
Deinflector._ruleTypes = new Map([
    ['v',       0b0000011111], // Verb
    ['verb',    0b0000011111], // Verb
    ['v1',      0b0000000001], // Verb ichidan
    ['v5',      0b0000000010], // Verb godan
    ['vs',      0b0000000100], // Verb suru
    ['vk',      0b0000001000], // Verb kuru
    ['vz',      0b0000010000], // Verb zuru
    ['adj',     0b0000100000], // Adjective
    ['adj-i',   0b0000100000], // Adjective i
    ['iru',     0b0001000000], // Intermediate -iru endings for progressive or perfect tens
    ['n',       0b0010000000], // Noun
    ['noun',    0b0010000000], // Noun'
    ['pn',      0b0100000000] // Pronoun
]);
