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
import {parseJson} from '../dev/json.js';

class DeinflectionNode {
    /**
     * @param {string} text
     * @param {import('deinflector').ReasonTypeRaw[]} ruleNames
     * @param {?RuleNode} ruleNode
     * @param {?DeinflectionNode} previous
     */
    constructor(text, ruleNames, ruleNode, previous) {
        /** @type {string} */
        this.text = text;
        /** @type {import('deinflector').ReasonTypeRaw[]} */
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
     * @param {import('deinflector').ReasonRaw} rule
     */
    constructor(groupName, rule) {
        /** @type {string} */
        this.groupName = groupName;
        /** @type {import('deinflector').ReasonRaw} */
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

/**
 * @template [T=unknown]
 * @param {T[]} rules1
 * @param {T[]} rules2
 * @returns {T[]}
 */
function getIntersection(rules1, rules2) {
    return rules1.filter((item) => rules2.includes(item));
}

const dirname = pathDirname(fileURLToPath(import.meta.url));

/** @type {import('deinflector').ReasonsRaw} */
const content = parseJson(readFileSync(join(dirname, '../ext/data/deinflect.json'), {encoding: 'utf8'}));

/** @type {RuleNode[]} */
const ruleNodes = [];
for (const [groupName, rules] of Object.entries(content)) {
    for (const rule of rules) {
        ruleNodes.push(new RuleNode(groupName, rule));
    }
}

// TODO : Change this value
const checkRules = false;
/** @type {DeinflectionNode[]} */
const deinflectionNodes = [];
for (const ruleNode of ruleNodes) {
    deinflectionNodes.push(new DeinflectionNode(`?${ruleNode.rule.kanaIn}`, [], null, null));
}
for (let i = 0; i < deinflectionNodes.length; ++i) {
    const deinflectionNode = deinflectionNodes[i];
    const {text, ruleNames} = deinflectionNode;
    for (const ruleNode of ruleNodes) {
        const {kanaIn, kanaOut, rulesIn, rulesOut} = ruleNode.rule;
        if (
            (checkRules && ruleNames.length !== 0 && getIntersection(ruleNames, rulesIn).length === 0) ||
            !text.endsWith(kanaIn) ||
            (text.length - kanaIn.length + kanaOut.length) <= 0
        ) {
            continue;
        }

        const newDeinflectionNode = new DeinflectionNode(
            text.substring(0, text.length - kanaIn.length) + kanaOut,
            rulesOut,
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
                    `${item.text} (${item.ruleNode.groupName}, ${item.ruleNode.rule.rulesIn.join(',')}=>${item.ruleNode.rule.rulesOut.join(',')}, ${item.ruleNode.rule.kanaIn}=>${item.ruleNode.rule.kanaOut})`
                );
            }
            console.log(`Cycle detected:\n  ${stack.join('\n  ')}`);
            continue;
        }

        deinflectionNodes.push(newDeinflectionNode);
    }
}
