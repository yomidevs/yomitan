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
    constructor(term, tags=[], rule='') {
        this.children = [];
        this.term = term;
        this.tags = tags;
        this.rule = rule;
    }

    validate(validator) {
        for (const tags of validator(this.term)) {
            if (this.tags.length === 0) {
                return true;
            }

            for (const tag of this.tags) {
                if (tags.indexOf(tag) !== -1) {
                    return true;
                }
            }
        }

        return false;
    }

    deinflect(validator, rules) {
        if (this.validate(validator)) {
            const child = new Deinflection(this.term, this.tags);
            this.children.push(child);
        }

        for (const rule in rules) {
            for (const variant of rules[rule]) {
                let allowed = this.tags.length === 0;
                for (const tag of this.tags) {
                    if (variant.ti.indexOf(tag) !== -1) {
                        allowed = true;
                        break;
                    }
                }

                if (!allowed || !this.term.endsWith(variant.ki)) {
                    continue;
                }

                const term = this.term.slice(0, -variant.ki.length) + variant.ko;
                const child = new Deinflection(term, variant.to, rule);
                if (child.deinflect(validator, rules)) {
                    this.children.push(child);
                }
            }
        }

        return this.children.length > 0;
    }

    gather() {
        if (this.children.length === 0) {
            return [{root: this.term, tags: this.tags, rules: []}];
        }

        const paths = [];
        for (const child of this.children) {
            for (const path of child.gather()) {
                if (this.rule.length > 0) {
                    path.rules.push(this.rule);
                }

                path.source = this.term;
                paths.push(path);
            }
        }

        return paths;
    }
}


class Deinflector {
    constructor() {
        this.rules = {};
    }

    setRules(rules) {
        this.rules = rules;
    }

    deinflect(term, validator) {
        const node = new Deinflection(term);
        if (node.deinflect(validator, this.rules)) {
            return node.gather();
        }

        return null;
    }
}
