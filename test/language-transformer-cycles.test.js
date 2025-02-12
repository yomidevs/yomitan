/*
 * Copyright (C) 2024-2025  Yomitan Authors
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

import {describe, test} from 'vitest';
import {LanguageTransformer} from '../ext/js/language/language-transformer.js';
import {getAllLanguageTransformDescriptors} from '../ext/js/language/languages.js';

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
     * @param {import('language-transformer').SuffixRule} rule
     */
    constructor(groupName, rule) {
        /** @type {string} */
        this.groupName = groupName;
        /** @type {import('language-transformer').SuffixRule} */
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

const languagesWithTransforms = getAllLanguageTransformDescriptors();

describe.each(languagesWithTransforms)('Cycles Test $iso', ({languageTransforms}) => {
    test('Check for cycles', ({expect}) => {
        const languageTransformer = new LanguageTransformer();
        languageTransformer.addDescriptor(languageTransforms);

        /** @type {RuleNode[]} */
        const ruleNodes = [];
        for (const [groupName, reasonInfo] of Object.entries(languageTransforms.transforms)) {
            for (const rule of reasonInfo.rules) {
                if (rule.type === 'suffix') {
                    ruleNodes.push(new RuleNode(groupName, /** @type {import('language-transformer').SuffixRule}*/ (rule)));
                }
            }
        }

        /** @type {DeinflectionNode[]} */
        const deinflectionNodes = [];
        for (const {rule: {isInflected}} of ruleNodes) {
            const suffixIn = isInflected.source.substring(0, isInflected.source.length - 1);
            deinflectionNodes.push(new DeinflectionNode(`?${suffixIn}`, [], null, null));
        }

        for (let i = 0; i < deinflectionNodes.length; ++i) {
            const deinflectionNode = deinflectionNodes[i];
            const {text, ruleNames} = deinflectionNode;
            for (const ruleNode of ruleNodes) {
                const {isInflected, deinflected: suffixOut, conditionsIn, conditionsOut} = ruleNode.rule;
                const suffixIn = isInflected.source.substring(0, isInflected.source.length - 1);
                if (
                    !LanguageTransformer.conditionsMatch(
                        languageTransformer.getConditionFlagsFromConditionTypes(ruleNames),
                        languageTransformer.getConditionFlagsFromConditionTypes(conditionsIn),
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
                    deinflectionNode,
                );

                // Cycle check
                if (deinflectionNode.historyIncludes(newDeinflectionNode)) {
                    const stack = [];
                    for (const {text: itemText, ruleNode: itemNode} of newDeinflectionNode.getHistory()) {
                        if (itemNode !== null) {
                            const itemSuffixIn = itemNode.rule.isInflected.source.substring(0, itemNode.rule.isInflected.source.length - 1);
                            const itemSuffixOut = itemNode.rule.deinflected;
                            stack.push(`${itemText} (${itemNode.groupName}, ${itemNode.rule.conditionsIn.join(',')}=>${itemNode.rule.conditionsOut.join(',')}, ${itemSuffixIn}=>${itemSuffixOut})`);
                        } else {
                            stack.push(`${itemText} (start)`);
                        }
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
