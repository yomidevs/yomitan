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
function suffixInflection(inflectedSuffix, deinflectedSuffix, rulesIn, rulesOut){
    return {
        inflected: new RegExp('.*' + inflectedSuffix + '$'),
        deinflected: deinflectedSuffix,
        uninflect: (term) =>  term.replace(new RegExp(inflectedSuffix + '$'), deinflectedSuffix),
        rulesIn,
        rulesOut
    };
}

function prefixInflection(inflectedPrefix, deinflectedPrefix, rulesIn, rulesOut){
    return {
        inflected: new RegExp('^' + inflectedPrefix + '.*'),
        deinflected: deinflectedPrefix,
        uninflect: (term) =>  term.replace(new RegExp('^' + inflectedPrefix), deinflectedPrefix),
        rulesIn,
        rulesOut
    };
}

function infixInflection(inflectedInfix, deinflectedInfix, rulesIn, rulesOut){
    return {
        inflected: new RegExp('.*' + inflectedInfix + '.*'),
        deinflected: deinflectedInfix,
        uninflect: (term) =>  term.replace(new RegExp(inflectedInfix), deinflectedInfix),
        rulesIn,
        rulesOut
    };
}

function separatedPrefix(prefix, rulesIn, rulesOut) {
    const de = 'a-zA-ZäöüÄÖÜß';
    const regex = new RegExp(`^([${de}]+) .+ ${prefix}$`);
    return {
        inflected: regex,
        uninflect: (term) => {
            return term.replace(regex, '$1 ' + prefix);
        },
        rulesIn,
        rulesOut
    };
}

function wholeWordInflection(inflected, deinflected, rulesIn, rulesOut){
    return {
        inflected: new RegExp('^' + inflected + '$'),
        deinflected,
        uninflect: () =>  deinflected,
        rulesIn,
        rulesOut
    };
}