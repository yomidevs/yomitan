/*
 * Copyright (C) 2016-2021  Yomichan Authors
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

/* global
 * DictionaryDataUtil
 * Handlebars
 */

class TemplateRenderer {
    constructor(japaneseUtil) {
        this._japaneseUtil = japaneseUtil;
        this._cache = new Map();
        this._cacheMaxSize = 5;
        this._helpersRegistered = false;
        this._stateStack = null;
        this._dataTypes = new Map();
    }

    registerDataType(name, {modifier=null, composeData=null}) {
        this._dataTypes.set(name, {modifier, composeData});
    }

    render(template, data, type) {
        const instance = this._getTemplateInstance(template);
        data = this._getModifiedData(data, void 0, type);
        return this._renderTemplate(instance, data);
    }

    renderMulti(items) {
        const results = [];
        for (const {template, templateItems} of items) {
            const instance = this._getTemplateInstance(template);
            for (const {type, commonData, datas} of templateItems) {
                for (let data of datas) {
                    let result;
                    try {
                        data = this._getModifiedData(data, commonData, type);
                        result = this._renderTemplate(instance, data);
                        result = {result};
                    } catch (error) {
                        result = {error};
                    }
                    results.push(result);
                }
            }
        }
        return results;
    }

    getModifiedData(data, type) {
        return this._getModifiedData(data, void 0, type);
    }

    // Private

    _getTemplateInstance(template) {
        if (!this._helpersRegistered) {
            this._registerHelpers();
        }

        const cache = this._cache;
        let instance = cache.get(template);
        if (typeof instance === 'undefined') {
            this._updateCacheSize(this._cacheMaxSize - 1);
            instance = Handlebars.compile(template);
            cache.set(template, instance);
        }

        return instance;
    }

    _renderTemplate(instance, data) {
        try {
            this._stateStack = [new Map()];
            return instance(data).trim();
        } finally {
            this._stateStack = null;
        }
    }

    _getModifiedData(data, commonData, type) {
        if (typeof type === 'string') {
            const typeInfo = this._dataTypes.get(type);
            if (typeof typeInfo !== 'undefined') {
                if (typeof commonData !== 'undefined') {
                    const {composeData} = typeInfo;
                    if (typeof composeData === 'function') {
                        data = composeData(data, commonData);
                    }
                }
                const {modifier} = typeInfo;
                if (typeof modifier === 'function') {
                    data = modifier(data);
                }
            }
        }
        return data;
    }

    _updateCacheSize(maxSize) {
        const cache = this._cache;
        let removeCount = cache.size - maxSize;
        if (removeCount <= 0) { return; }

        for (const key of cache.keys()) {
            cache.delete(key);
            if (--removeCount <= 0) { break; }
        }
    }

    _registerHelpers() {
        Handlebars.partials = Handlebars.templates;

        const helpers = [
            ['dumpObject',       this._dumpObject.bind(this)],
            ['furigana',         this._furigana.bind(this)],
            ['furiganaPlain',    this._furiganaPlain.bind(this)],
            ['kanjiLinks',       this._kanjiLinks.bind(this)],
            ['multiLine',        this._multiLine.bind(this)],
            ['sanitizeCssClass', this._sanitizeCssClass.bind(this)],
            ['regexReplace',     this._regexReplace.bind(this)],
            ['regexMatch',       this._regexMatch.bind(this)],
            ['mergeTags',        this._mergeTags.bind(this)],
            ['eachUpTo',         this._eachUpTo.bind(this)],
            ['spread',           this._spread.bind(this)],
            ['op',               this._op.bind(this)],
            ['get',              this._get.bind(this)],
            ['set',              this._set.bind(this)],
            ['scope',            this._scope.bind(this)],
            ['property',         this._property.bind(this)],
            ['noop',             this._noop.bind(this)],
            ['isMoraPitchHigh',  this._isMoraPitchHigh.bind(this)],
            ['getKanaMorae',     this._getKanaMorae.bind(this)],
            ['typeof',           this._getTypeof.bind(this)],
            ['join',             this._join.bind(this)],
            ['concat',           this._concat.bind(this)],
            ['pitchCategories',  this._pitchCategories.bind(this)]
        ];

        for (const [name, helper] of helpers) {
            this._registerHelper(name, helper);
        }

        this._helpersRegistered = true;
    }

    _registerHelper(name, helper) {
        function wrapper(...args) {
            return helper(this, ...args);
        }
        Handlebars.registerHelper(name, wrapper);
    }

    _escape(text) {
        return Handlebars.Utils.escapeExpression(text);
    }

    _dumpObject(context, options) {
        const dump = JSON.stringify(options.fn(context), null, 4);
        return this._escape(dump);
    }

    _furigana(context, ...args) {
        const {expression, reading} = this._getFuriganaExpressionAndReading(context, ...args);
        const segs = this._japaneseUtil.distributeFurigana(expression, reading);

        let result = '';
        for (const {text, reading: reading2} of segs) {
            if (reading2.length > 0) {
                result += `<ruby>${text}<rt>${reading2}</rt></ruby>`;
            } else {
                result += text;
            }
        }

        return result;
    }

    _furiganaPlain(context, ...args) {
        const {expression, reading} = this._getFuriganaExpressionAndReading(context, ...args);
        const segs = this._japaneseUtil.distributeFurigana(expression, reading);

        let result = '';
        for (const {text, reading: reading2} of segs) {
            if (reading2.length > 0) {
                if (result.length > 0) { result += ' '; }
                result += `${text}[${reading2}]`;
            } else {
                result += text;
            }
        }

        return result;
    }

    _getFuriganaExpressionAndReading(context, ...args) {
        const options = args[args.length - 1];
        if (args.length >= 3) {
            return {expression: args[0], reading: args[1]};
        } else {
            const {expression, reading} = options.fn(context);
            return {expression, reading};
        }
    }

    _kanjiLinks(context, options) {
        const jp = this._japaneseUtil;
        let result = '';
        for (const c of options.fn(context)) {
            if (jp.isCodePointKanji(c.codePointAt(0))) {
                result += `<a href="#" class="kanji-link">${c}</a>`;
            } else {
                result += c;
            }
        }

        return result;
    }

    _multiLine(context, options) {
        return options.fn(context).split('\n').join('<br>');
    }

    _sanitizeCssClass(context, options) {
        return options.fn(context).replace(/[^_a-z0-9\u00a0-\uffff]/ig, '_');
    }

    _regexReplace(context, ...args) {
        // Usage:
        // {{#regexReplace regex string [flags]}}content{{/regexReplace}}
        // regex: regular expression string
        // string: string to replace
        // flags: optional flags for regular expression
        //   e.g. "i" for case-insensitive, "g" for replace all
        let value = args[args.length - 1].fn(context);
        if (args.length >= 3) {
            try {
                const flags = args.length > 3 ? args[2] : 'g';
                const regex = new RegExp(args[0], flags);
                value = value.replace(regex, args[1]);
            } catch (e) {
                return `${e}`;
            }
        }
        return value;
    }

    _regexMatch(context, ...args) {
        // Usage:
        // {{#regexMatch regex [flags]}}content{{/regexMatch}}
        // regex: regular expression string
        // flags: optional flags for regular expression
        //   e.g. "i" for case-insensitive, "g" for match all
        let value = args[args.length - 1].fn(context);
        if (args.length >= 2) {
            try {
                const flags = args.length > 2 ? args[1] : '';
                const regex = new RegExp(args[0], flags);
                const parts = [];
                value.replace(regex, (g0) => parts.push(g0));
                value = parts.join('');
            } catch (e) {
                return `${e}`;
            }
        }
        return value;
    }

    _mergeTags(context, object, isGroupMode, isMergeMode) {
        const tagSources = [];
        if (isGroupMode || isMergeMode) {
            for (const definition of object.definitions) {
                tagSources.push(definition.definitionTags);
            }
        } else {
            tagSources.push(object.definitionTags);
        }

        const tags = new Set();
        for (const tagSource of tagSources) {
            if (!Array.isArray(tagSource)) { continue; }
            for (const tag of tagSource) {
                tags.add(tag.name);
            }
        }

        return [...tags].join(', ');
    }

    _eachUpTo(context, iterable, maxCount, options) {
        if (iterable) {
            const results = [];
            let any = false;
            for (const entry of iterable) {
                any = true;
                if (results.length >= maxCount) { break; }
                const processedEntry = options.fn(entry);
                results.push(processedEntry);
            }
            if (any) {
                return results.join('');
            }
        }
        return options.inverse(context);
    }

    _spread(context, ...args) {
        const result = [];
        for (let i = 0, ii = args.length - 1; i < ii; ++i) {
            try {
                result.push(...args[i]);
            } catch (e) {
                // NOP
            }
        }
        return result;
    }

    _op(context, ...args) {
        switch (args.length) {
            case 3: return this._evaluateUnaryExpression(args[0], args[1]);
            case 4: return this._evaluateBinaryExpression(args[0], args[1], args[2]);
            case 5: return this._evaluateTernaryExpression(args[0], args[1], args[2], args[3]);
            default: return void 0;
        }
    }

    _evaluateUnaryExpression(operator, operand1) {
        switch (operator) {
            case '+': return +operand1;
            case '-': return -operand1;
            case '~': return ~operand1;
            case '!': return !operand1;
            default: return void 0;
        }
    }

    _evaluateBinaryExpression(operator, operand1, operand2) {
        switch (operator) {
            case '+': return operand1 + operand2;
            case '-': return operand1 - operand2;
            case '/': return operand1 / operand2;
            case '*': return operand1 * operand2;
            case '%': return operand1 % operand2;
            case '**': return operand1 ** operand2;
            case '==': return operand1 == operand2; // eslint-disable-line eqeqeq
            case '!=': return operand1 != operand2; // eslint-disable-line eqeqeq
            case '===': return operand1 === operand2;
            case '!==': return operand1 !== operand2;
            case '<':  return operand1 < operand2;
            case '<=': return operand1 <= operand2;
            case '>':  return operand1 > operand2;
            case '>=': return operand1 >= operand2;
            case '<<': return operand1 << operand2;
            case '>>': return operand1 >> operand2;
            case '>>>': return operand1 >>> operand2;
            case '&': return operand1 & operand2;
            case '|': return operand1 | operand2;
            case '^': return operand1 ^ operand2;
            case '&&': return operand1 && operand2;
            case '||': return operand1 || operand2;
            default: return void 0;
        }
    }

    _evaluateTernaryExpression(operator, operand1, operand2, operand3) {
        switch (operator) {
            case '?:': return operand1 ? operand2 : operand3;
            default: return void 0;
        }
    }

    _get(context, key) {
        for (let i = this._stateStack.length; --i >= 0;) {
            const map = this._stateStack[i];
            if (map.has(key)) {
                return map.get(key);
            }
        }
        return void 0;
    }

    _set(context, ...args) {
        switch (args.length) {
            case 2:
                {
                    const [key, options] = args;
                    const value = options.fn(context);
                    this._stateStack[this._stateStack.length - 1].set(key, value);
                }
                break;
            case 3:
                {
                    const [key, value] = args;
                    this._stateStack[this._stateStack.length - 1].set(key, value);
                }
                break;
        }
        return '';
    }

    _scope(context, options) {
        try {
            this._stateStack.push(new Map());
            return options.fn(context);
        } finally {
            if (this._stateStack.length > 1) {
                this._stateStack.pop();
            }
        }
    }

    _property(context, ...args) {
        const ii = args.length - 1;
        if (ii <= 0) { return void 0; }

        try {
            let value = args[0];
            for (let i = 1; i < ii; ++i) {
                value = value[args[i]];
            }
            return value;
        } catch (e) {
            return void 0;
        }
    }

    _noop(context, options) {
        return options.fn(context);
    }

    _isMoraPitchHigh(context, index, position) {
        return this._japaneseUtil.isMoraPitchHigh(index, position);
    }

    _getKanaMorae(context, text) {
        return this._japaneseUtil.getKanaMorae(`${text}`);
    }

    _getTypeof(context, ...args) {
        const ii = args.length - 1;
        const value = (ii > 0 ? args[0] : args[ii].fn(context));
        return typeof value;
    }

    _join(context, ...args) {
        return args.length > 1 ? args.slice(1, args.length - 1).flat().join(args[0]) : '';
    }

    _concat(context, ...args) {
        let result = '';
        for (let i = 0, ii = args.length - 1; i < ii; ++i) {
            result += args[i];
        }
        return result;
    }

    _pitchCategories(context, data) {
        const {pronunciations, headwords} = data.dictionaryEntry;
        const categories = new Set();
        for (const {headwordIndex, pitches} of pronunciations) {
            const {reading, wordClasses} = headwords[headwordIndex];
            const isVerbOrAdjective = DictionaryDataUtil.isNonNounVerbOrAdjective(wordClasses);
            for (const {position} of pitches) {
                const category = this._japaneseUtil.getPitchCategory(reading, position, isVerbOrAdjective);
                if (category !== null) {
                    categories.add(category);
                }
            }
        }
        return [...categories];
    }
}
