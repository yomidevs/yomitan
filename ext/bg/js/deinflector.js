/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
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


class Deinflection {
    constructor(term, {rules=[], definitions=[], reason=''} = {}) {
        this.term = term;
        this.rules = rules;
        this.definitions = definitions;
        this.reason = reason;
        this.children = [];
    }

    deinflect(definer, reasons) {
        const define = () => {
            return definer(this.term).then(definitions => {
                if (this.rules.length === 0) {
                    this.definitions = definitions;
                } else {
                    for (const rule of this.rules) {
                        for (const definition of definitions) {
                            if (definition.rules.includes(rule)) {
                                this.definitions.push(definition);
                            }
                        }
                    }
                }

                return this.definitions.length > 0;
            });
        };

        const promises = [];
        for (const reason in reasons) {
            for (const variant of reasons[reason]) {
                let accept = this.rules.length === 0;
                if (!accept) {
                    for (const rule of this.rules) {
                        if (variant.rulesIn.includes(rule)) {
                            accept = true;
                            break;
                        }
                    }
                }

                if (!accept || !this.term.endsWith(variant.kanaIn)) {
                    continue;
                }

                const term = this.term.slice(0, -variant.kanaIn.length) + variant.kanaOut;
                if (term.length === 0) {
                    continue;
                }

                const child = new Deinflection(term, {reason, rules: variant.rulesOut});
                promises.push(
                    child.deinflect(definer, reasons).then(valid => valid && this.children.push(child))
                );
            }
        }

        return Promise.all(promises).then(define).then(valid => {
            if (valid && this.children.length > 0) {
                const child = new Deinflection(this.term, {rules: this.rules, definitions: this.definitions});
                this.children.push(child);
            }

            return valid || this.children.length > 0;
        });
    }

    gather() {
        if (this.children.length === 0) {
            return [{
                source: this.term,
                rules: this.rules,
                definitions: this.definitions,
                reasons: [this.reason]
            }];
        }

        const results = [];
        for (const child of this.children) {
            for (const result of child.gather()) {
                if (this.reason.length > 0) {
                    result.reasons.push(this.reason);
                }

                result.source = this.term;
                results.push(result);
            }
        }

        return results;
    }
}


class Deinflector {
    constructor() {
        this.reasons = {};
    }

    setReasons(reasons) {
        this.reasons = reasons;
    }

    deinflect(term, definer) {
        const node = new Deinflection(term);
        return node.deinflect(definer, this.reasons).then(success => success ? node.gather() : []);
    }
}
