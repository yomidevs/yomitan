/*
 * Copyright (C) 2021-2022  Yomichan Authors
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

const fs = require('fs');
const css = require('css');

function indexOfRule(rules, selectors) {
    const jj = selectors.length;
    for (let i = 0, ii = rules.length; i < ii; ++i) {
        const ruleSelectors = rules[i].selectors;
        if (ruleSelectors.length !== jj) { continue; }
        let okay = true;
        for (let j = 0; j < jj; ++j) {
            if (selectors[j] !== ruleSelectors[j]) {
                okay = false;
                break;
            }
        }
        if (okay) { return i; }
    }
    return -1;
}

function removeProperty(styles, property, removedProperties) {
    let removeCount = removedProperties.get(property);
    if (typeof removeCount !== 'undefined') { return removeCount; }
    removeCount = 0;
    for (let i = 0, ii = styles.length; i < ii; ++i) {
        const key = styles[i][0];
        if (key !== property) { continue; }
        styles.splice(i, 1);
        --i;
        --ii;
        ++removeCount;
    }
    removedProperties.set(property, removeCount);
    return removeCount;
}

function formatRulesJson(rules) {
    // Manually format JSON, for improved compactness
    // return JSON.stringify(rules, null, 4);
    const indent1 = '    ';
    const indent2 = indent1.repeat(2);
    const indent3 = indent1.repeat(3);
    let result = '';
    result += '[';
    let index1 = 0;
    for (const {selectors, styles} of rules) {
        if (index1 > 0) { result += ','; }
        result += `\n${indent1}{\n${indent2}"selectors": `;
        if (selectors.length === 1) {
            result += `[${JSON.stringify(selectors[0], null, 4)}]`;
        } else {
            result += JSON.stringify(selectors, null, 4).replace(/\n/g, '\n' + indent2);
        }
        result += `,\n${indent2}"styles": [`;
        let index2 = 0;
        for (const [key, value] of styles) {
            if (index2 > 0) { result += ','; }
            result += `\n${indent3}[${JSON.stringify(key)}, ${JSON.stringify(value)}]`;
            ++index2;
        }
        if (index2 > 0) { result += `\n${indent2}`; }
        result += `]\n${indent1}}`;
        ++index1;
    }
    if (index1 > 0) { result += '\n'; }
    result += ']';
    return result;
}

function generateRules(cssFile, overridesCssFile) {
    const content1 = fs.readFileSync(cssFile, {encoding: 'utf8'});
    const content2 = fs.readFileSync(overridesCssFile, {encoding: 'utf8'});
    const stylesheet1 = css.parse(content1, {}).stylesheet;
    const stylesheet2 = css.parse(content2, {}).stylesheet;

    const removePropertyPattern = /^remove-property\s+([\w\W]+)$/;
    const removeRulePattern = /^remove-rule$/;
    const propertySeparator = /\s+/;

    const rules = [];

    // Default stylesheet
    for (const rule of stylesheet1.rules) {
        if (rule.type !== 'rule') { continue; }
        const {selectors, declarations} = rule;
        const styles = [];
        for (const declaration of declarations) {
            if (declaration.type !== 'declaration') { console.log(declaration); continue; }
            const {property, value} = declaration;
            styles.push([property, value]);
        }
        if (styles.length > 0) {
            rules.push({selectors, styles});
        }
    }

    // Overrides
    for (const rule of stylesheet2.rules) {
        if (rule.type !== 'rule') { continue; }
        const {selectors, declarations} = rule;
        const removedProperties = new Map();
        for (const declaration of declarations) {
            switch (declaration.type) {
                case 'declaration':
                    {
                        const index = indexOfRule(rules, selectors);
                        let entry;
                        if (index >= 0) {
                            entry = rules[index];
                        } else {
                            entry = {selectors, styles: []};
                            rules.push(entry);
                        }
                        const {property, value} = declaration;
                        removeProperty(entry.styles, property, removedProperties);
                        entry.styles.push([property, value]);
                    }
                    break;
                case 'comment':
                    {
                        const index = indexOfRule(rules, selectors);
                        if (index < 0) { throw new Error('Could not find rule with matching selectors'); }
                        const comment = declaration.comment.trim();
                        let m;
                        if ((m = removePropertyPattern.exec(comment)) !== null) {
                            for (const property of m[1].split(propertySeparator)) {
                                const removeCount = removeProperty(rules[index].styles, property, removedProperties);
                                if (removeCount === 0) { throw new Error(`Property removal is unnecessary; ${property} does not exist`); }
                            }
                        } else if (removeRulePattern.test(comment)) {
                            rules.splice(index, 1);
                        }
                    }
                    break;
            }
        }
    }

    // Remove empty
    for (let i = 0, ii = rules.length; i < ii; ++i) {
        if (rules[i].styles.length > 0) { continue; }
        rules.splice(i, 1);
        --i;
        --ii;
    }

    return rules;
}


module.exports = {
    formatRulesJson,
    generateRules
};
