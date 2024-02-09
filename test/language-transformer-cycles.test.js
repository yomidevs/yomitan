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

import {readFileSync} from 'fs';
import {join, dirname as pathDirname} from 'path';
import {fileURLToPath} from 'url';
import {describe, test} from 'vitest';
import {parseJson} from '../dev/json.js';
import {LanguageTransformer} from '../ext/js/language/language-transformer.js';

class DeinflectionNode {
    /**
     * @param {string} text
     * @param {string[]} ruleNames
     * @param {?RuleNode} ruleNode
     * @param {?DeinflectionNode} previous
     */
    constructor(text, ruleNames, ruleNode, previous) {
        /** @type {string} */
        this.text = text;
        /** @type {string[]} */
        this.ruleNames = ruleNames;
        /** @type {?RuleNode} */
        this.ruleNode = ruleNode;
        /** @type {?DeinflectionNode} */
        this.previous = previous;
    }

    /**
     * @param {DeinflectionNode} other
     * @returns {boolean}
     */
    historyIncludes(other) {
        /** @type {?DeinflectionNode} */
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let node = this;
        for (; node !== null; node = node.previous) {
            if (
                node.ruleNode === other.ruleNode &&
                node.text === other.text &&
                arraysAreEqual(node.ruleNames, other.ruleNames)
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * @returns {DeinflectionNode[]}
     */
    getHistory() {
        /** @type {DeinflectionNode[]} */
        const results = [];
        /** @type {?DeinflectionNode} */
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let node = this;
        for (; node !== null; node = node.previous) {
            results.unshift(node);
        }
        return results;
    }
}

class RuleNode {
    /**
     * @param {string} groupName
     * @param {import('language-transformer').Rule} rule
     */
    constructor(groupName, rule) {
        /** @type {string} */
        this.groupName = groupName;
        /** @type {import('language-transformer').Rule} */
        this.rule = rule;
    }
}

/**
 * @template [T=unknown]
 * @param {T[]} rules1
 * @param {T[]} rules2
 * @returns {boolean}
 */
function arraysAreEqual(rules1, rules2) {
    if (rules1.length !== rules2.length) { return false; }
    for (const rule1 of rules1) {
        if (!rules2.includes(rule1)) { return false; }
    }
    return true;
}

describe('Deinflection data', () => {
    test('Check for cycles', ({expect}) => {
        const dirname = pathDirname(fileURLToPath(import.meta.url));

        /** @type {import('language-transformer').LanguageTransformDescriptor} */
        const descriptor = parseJson(readFileSync(join(dirname, '../ext/data/language/japanese-transforms.json'), {encoding: 'utf8'}));
        const languageTransformer = new LanguageTransformer();
        languageTransformer.addDescriptor(descriptor);

        /** @type {RuleNode[]} */
        const ruleNodes = [];
        for (const [groupName, reasonInfo] of Object.entries(descriptor.transforms)) {
            for (const rule of reasonInfo.rules) {
                ruleNodes.push(new RuleNode(groupName, rule));
            }
        }

        /** @type {DeinflectionNode[]} */
        const deinflectionNodes = [];
        for (const ruleNode of ruleNodes) {
            deinflectionNodes.push(new DeinflectionNode(`?${ruleNode.rule.suffixIn}`, [], null, null));
        }
        for (let i = 0; i < deinflectionNodes.length; ++i) {
            const deinflectionNode = deinflectionNodes[i];
            const {text, ruleNames} = deinflectionNode;
            for (const ruleNode of ruleNodes) {
                const {suffixIn, suffixOut, conditionsIn, conditionsOut} = ruleNode.rule;
                if (
                    !LanguageTransformer.conditionsMatch(
                        languageTransformer.getConditionFlagsFromConditionTypes(ruleNames),
                        languageTransformer.getConditionFlagsFromConditionTypes(conditionsIn)
                    ) ||
                    !text.endsWith(suffixIn) ||
                    (text.length - suffixIn.length + suffixOut.length) <= 0
                ) {
                    continue;
                }

                const newDeinflectionNode = new DeinflectionNode(
                    text.substring(0, text.length - suffixIn.length) + suffixOut,
                    conditionsOut,
                    ruleNode,
                    deinflectionNode
                );

                // Cycle check
                if (deinflectionNode.historyIncludes(newDeinflectionNode)) {
                    const stack = [];
                    for (const item of newDeinflectionNode.getHistory()) {
                        stack.push(
                            item.ruleNode === null ?
                                `${item.text} (start)` :
                                `${item.text} (${item.ruleNode.groupName}, ${item.ruleNode.rule.conditionsIn.join(',')}=>${item.ruleNode.rule.conditionsOut.join(',')}, ${item.ruleNode.rule.suffixIn}=>${item.ruleNode.rule.suffixOut})`
                        );
                    }
                    const message = `Cycle detected:\n  ${stack.join('\n  ')}`;
                    expect.soft(true, message).toEqual(false);
                    continue;
                }

                deinflectionNodes.push(newDeinflectionNode);
            }
        }
    });
});
