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
        this.term     = term;
        this.tags     = tags;
        this.rule     = rule;
    }

    validate(validator) {
        for (let tags of validator(this.term)) {
            if (this.tags.length === 0) {
                return true;
            }

            for (let tag of this.tags) {
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

        for (let rule in rules) {
            const variants = rules[rule];
            for (let v of variants) {
                let allowed = this.tags.length === 0;
                for (let tag of this.tags) {
                    //
                    // TODO: Handle addons through tags.json or rules.json
                    //

                    if (v.tagsIn.indexOf(tag) !== -1) {
                        allowed = true;
                        break;
                    }
                }

                if (!allowed || !this.term.endsWith(v.kanaIn)) {
                    continue;
                }

                const term = this.term.slice(0, -v.kanaIn.length) + v.kanaOut;
                const child = new Deinflection(term, v.tagsOut, rule);
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
        for (let child of this.children) {
            for (let path of child.gather()) {
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
