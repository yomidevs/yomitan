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
    constructor(reasons) {
        // console.log('Deinflector::constructor() reasons = ', reasons);
        this.reasons = Deinflector.normalizeReasons(reasons);
    }

    deinflect(source) {
        // const start = performance.now();

        // console.log('\tDeinflector::deinflect() source = ', source);

        const results = [this._createDeinflection(source, 0, [])];

        // console.log('\tDeinflector::deinflect() results = ', results);

        for (let i = 0; i < results.length && i < 200; ++i) {

            // console.log(`\t\t${i} deinflecting ${results[i].term}`);

            const {rules, term, reasons} = results[i];
            for (const [reason, variants] of this.reasons) {
                // if(reason == 'past') console.log("\treason = ", reason, "variants = ", variants);
                for (const [inflected, uninflect, rulesIn, rulesOut] of variants) {
                    // if(reason == 'past') console.log(inflected, inflected.test(term))
                    if (
                        (rules !== 0 && (rules & rulesIn) === 0) ||
                        !inflected.test(term)
                    ) {
                        continue;
                    }

                    // console.log(`\t\t${reason}, ${inflected}`)

                    results.push(this._createDeinflection(
                        uninflect(term),
                        rulesOut,
                        [reason, ...reasons]
                    ));
                }
            }
        }

        // const end = performance.now();
        // console.log(`\tDeinflector::deinflect() performance = ${end - start}ms`);
        
        return results;
    }

    _createDeinflection(term, rules, reasons) {
        // console.log('Deinflector::_createDeinflection() term = ', term, 'rules = ', rules, 'reasons = ', reasons);
        return {term, rules, reasons};
    }

    static normalizeReasons(reasons) {
        // console.log('Deinflector::normalizeReasons() reasons = ', reasons);
        const normalizedReasons = [];
        for (const [reason, reasonInfo] of Object.entries(reasons)) {
            const variants = [];
            for (const {inflected, uninflect, rulesIn, rulesOut} of reasonInfo) {
                variants.push([
                    inflected,
                    uninflect,
                    this.rulesToRuleFlags(rulesIn),
                    this.rulesToRuleFlags(rulesOut)
                ]);
            }
            normalizedReasons.push([reason, variants]);
        }
        return normalizedReasons;
    }

    static rulesToRuleFlags(rules) {
        // console.log(rules, this._ruleTypes)
        // console.log('Deinflector::rulesToRuleFlags() rules = ', rules);
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

// eslint-disable-next-line no-underscore-dangle
Deinflector._ruleTypes = new Map([
    // ['v',    0b0000011111], // Verb // does not work for some reason, breaks both 'his' and 'belongs' 
    ['v1',    0b0000000001], // Verb ichidan
    ['v5',    0b0000000010], // Verb godan
    ['vs',    0b0000000100], // Verb suru
    ['vk',    0b0000001000], // Verb kuru
    ['vz',    0b0000010000], // Verb zuru
    // ['adj',  0b0000100000], // Adjective
    ['adj-i', 0b0000100000], // Adjective i
    ['iru',   0b0001000000], // Intermediate -iru endings for progressive or perfect tens
    // ['n',     0b0010000000], // Noun
    // ['pn',   0b0100000000], // Pronoun
]);
