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

/* global
 * AnkiNoteDataCreator
 * AnkiTemplateRendererContentManager
 * CssStyleApplier
 * DictionaryDataUtil
 * Handlebars
 * JapaneseUtil
 * PronunciationGenerator
 * StructuredContentGenerator
 * TemplateRenderer
 * TemplateRendererMediaProvider
 */

/**
 * This class contains all Anki-specific template rendering functionality. It is built on
 * the generic TemplateRenderer class and various other Anki-related classes.
 */
class AnkiTemplateRenderer {
    /**
     * Creates a new instance of the class.
     */
    constructor() {
        this._structuredContentStyleApplier = new CssStyleApplier('/data/structured-content-style.json');
        this._pronunciationStyleApplier = new CssStyleApplier('/data/pronunciation-style.json');
        this._structuredContentDatasetKeyIgnorePattern = /^sc([^a-z]|$)/;
        this._japaneseUtil = new JapaneseUtil(null);
        this._templateRenderer = new TemplateRenderer();
        this._ankiNoteDataCreator = new AnkiNoteDataCreator(this._japaneseUtil);
        this._mediaProvider = new TemplateRendererMediaProvider();
        this._pronunciationGenerator = new PronunciationGenerator(this._japaneseUtil);
        this._stateStack = null;
        this._requirements = null;
        this._cleanupCallbacks = null;
        this._temporaryElement = null;
    }

    /**
     * Gets the generic TemplateRenderer instance.
     * @type {TemplateRenderer}
     */
    get templateRenderer() {
        return this._templateRenderer;
    }

    /**
     * Prepares the data that is necessary before the template renderer can be safely used.
     */
    async prepare() {
        this._templateRenderer.registerHelpers([
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
            ['pitchCategories',  this._pitchCategories.bind(this)],
            ['formatGlossary',   this._formatGlossary.bind(this)],
            ['hasMedia',         this._hasMedia.bind(this)],
            ['getMedia',         this._getMedia.bind(this)],
            ['pronunciation',    this._pronunciation.bind(this)],
            ['hiragana',         this._hiragana.bind(this)],
            ['katakana',         this._katakana.bind(this)]
        ]);
        this._templateRenderer.registerDataType('ankiNote', {
            modifier: ({marker, commonData}) => this._ankiNoteDataCreator.create(marker, commonData),
            composeData: (marker, commonData) => ({marker, commonData})
        });
        this._templateRenderer.setRenderCallbacks(
            this._onRenderSetup.bind(this),
            this._onRenderCleanup.bind(this)
        );
        await Promise.all([
            this._structuredContentStyleApplier.prepare(),
            this._pronunciationStyleApplier.prepare()
        ]);
    }

    // Private

    _onRenderSetup() {
        const requirements = [];
        this._stateStack = [new Map()];
        this._requirements = requirements;
        this._mediaProvider.requirements = requirements;
        this._cleanupCallbacks = [];
        return {requirements};
    }

    _onRenderCleanup() {
        for (const callback of this._cleanupCallbacks) { callback(); }
        this._stateStack = null;
        this._requirements = null;
        this._mediaProvider.requirements = null;
        this._cleanupCallbacks = null;
    }

    _escape(text) {
        return Handlebars.Utils.escapeExpression(text);
    }

    // Template helpers

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

    _stringToMultiLineHtml(string) {
        return string.split('\n').join('<br>');
    }

    _multiLine(context, options) {
        return this._stringToMultiLineHtml(options.fn(context));
    }

    _sanitizeCssClass(context, options) {
        return options.fn(context).replace(/[^_a-z0-9\u00a0-\uffff]/ig, '_');
    }

    _regexReplace(context, ...args) {
        // Usage:
        // {{#regexReplace regex string [flags] [content]...}}content{{/regexReplace}}
        // regex: regular expression string
        // string: string to replace
        // flags: optional flags for regular expression
        //   e.g. "i" for case-insensitive, "g" for replace all
        const argCount = args.length - 1;
        const options = args[argCount];
        let value = typeof options.fn === 'function' ? options.fn(context) : '';
        if (argCount > 3) {
            value = `${args.slice(3).join('')}${value}`;
        }
        if (argCount > 1) {
            try {
                const flags = argCount > 2 ? args[2] : 'g';
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
        // {{#regexMatch regex [flags] [content]...}}content{{/regexMatch}}
        // regex: regular expression string
        // flags: optional flags for regular expression
        //   e.g. "i" for case-insensitive, "g" for match all
        const argCount = args.length - 1;
        const options = args[argCount];
        let value = typeof options.fn === 'function' ? options.fn(context) : '';
        if (argCount > 2) {
            value = `${args.slice(2).join('')}${value}`;
        }
        if (argCount > 0) {
            try {
                const flags = argCount > 1 ? args[1] : '';
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
        const stateStack = this._stateStack;
        for (let i = stateStack.length; --i >= 0;) {
            const map = stateStack[i];
            if (map.has(key)) {
                return map.get(key);
            }
        }
        return void 0;
    }

    _set(context, ...args) {
        const stateStack = this._stateStack;
        switch (args.length) {
            case 2:
                {
                    const [key, options] = args;
                    const value = options.fn(context);
                    stateStack[stateStack.length - 1].set(key, value);
                }
                break;
            case 3:
                {
                    const [key, value] = args;
                    stateStack[stateStack.length - 1].set(key, value);
                }
                break;
        }
        return '';
    }

    _scope(context, options) {
        const stateStack = this._stateStack;
        try {
            stateStack.push(new Map());
            return options.fn(context);
        } finally {
            if (stateStack.length > 1) {
                stateStack.pop();
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

    _getTemporaryElement() {
        let element = this._temporaryElement;
        if (element === null) {
            element = document.createElement('div');
            this._temporaryElement = element;
        }
        return element;
    }

    _getStructuredContentHtml(node) {
        return this._getHtml(node, this._structuredContentStyleApplier, this._structuredContentDatasetKeyIgnorePattern);
    }

    _getPronunciationHtml(node) {
        return this._getHtml(node, this._pronunciationStyleApplier, null);
    }

    _getHtml(node, styleApplier, datasetKeyIgnorePattern) {
        const container = this._getTemporaryElement();
        container.appendChild(node);
        this._normalizeHtml(container, styleApplier, datasetKeyIgnorePattern);
        const result = container.innerHTML;
        container.textContent = '';
        return result;
    }

    _normalizeHtml(root, styleApplier, datasetKeyIgnorePattern) {
        const {ELEMENT_NODE, TEXT_NODE} = Node;
        const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        const elements = [];
        const textNodes = [];
        while (true) {
            const node = treeWalker.nextNode();
            if (node === null) { break; }
            switch (node.nodeType) {
                case ELEMENT_NODE:
                    elements.push(node);
                    break;
                case TEXT_NODE:
                    textNodes.push(node);
                    break;
            }
        }
        styleApplier.applyClassStyles(elements);
        for (const element of elements) {
            const {dataset} = element;
            for (const key of Object.keys(dataset)) {
                if (datasetKeyIgnorePattern !== null && datasetKeyIgnorePattern.test(key)) { continue; }
                delete dataset[key];
            }
        }
        for (const textNode of textNodes) {
            this._replaceNewlines(textNode);
        }
    }

    _replaceNewlines(textNode) {
        const parts = textNode.nodeValue.split('\n');
        if (parts.length <= 1) { return; }
        const {parentNode} = textNode;
        if (parentNode === null) { return; }
        const fragment = document.createDocumentFragment();
        for (let i = 0, ii = parts.length; i < ii; ++i) {
            if (i > 0) { fragment.appendChild(document.createElement('br')); }
            fragment.appendChild(document.createTextNode(parts[i]));
        }
        parentNode.replaceChild(fragment, textNode);
    }

    _createStructuredContentGenerator(data) {
        const contentManager = new AnkiTemplateRendererContentManager(this._mediaProvider, data);
        const instance = new StructuredContentGenerator(contentManager, this._japaneseUtil, document);
        this._cleanupCallbacks.push(() => contentManager.unloadAll());
        return instance;
    }

    _formatGlossary(context, dictionary, options) {
        const data = options.data.root;
        const content = options.fn(context);
        if (typeof content === 'string') { return this._stringToMultiLineHtml(this._escape(content)); }
        if (!(typeof content === 'object' && content !== null)) { return ''; }
        switch (content.type) {
            case 'image': return this._formatGlossaryImage(content, dictionary, data);
            case 'structured-content': return this._formatStructuredContent(content, dictionary, data);
        }
        return '';
    }

    _formatGlossaryImage(content, dictionary, data) {
        const structuredContentGenerator = this._createStructuredContentGenerator(data);
        const node = structuredContentGenerator.createDefinitionImage(content, dictionary);
        return this._getStructuredContentHtml(node);
    }

    _formatStructuredContent(content, dictionary, data) {
        const structuredContentGenerator = this._createStructuredContentGenerator(data);
        const node = structuredContentGenerator.createStructuredContent(content.content, dictionary);
        return node !== null ? this._getStructuredContentHtml(node) : '';
    }

    _hasMedia(context, ...args) {
        const ii = args.length - 1;
        const options = args[ii];
        return this._mediaProvider.hasMedia(options.data.root, args.slice(0, ii), options.hash);
    }

    _getMedia(context, ...args) {
        const ii = args.length - 1;
        const options = args[ii];
        return this._mediaProvider.getMedia(options.data.root, args.slice(0, ii), options.hash);
    }

    _pronunciation(context, ...args) {
        const ii = args.length - 1;
        const options = args[ii];
        let {format, reading, downstepPosition, nasalPositions, devoicePositions} = options.hash;

        if (typeof reading !== 'string' || reading.length === 0) { return ''; }
        if (typeof downstepPosition !== 'number') { return ''; }
        if (!Array.isArray(nasalPositions)) { nasalPositions = []; }
        if (!Array.isArray(devoicePositions)) { devoicePositions = []; }
        const morae = this._japaneseUtil.getKanaMorae(reading);

        switch (format) {
            case 'text':
                return this._getPronunciationHtml(this._pronunciationGenerator.createPronunciationText(morae, downstepPosition, nasalPositions, devoicePositions));
            case 'graph':
                return this._getPronunciationHtml(this._pronunciationGenerator.createPronunciationGraph(morae, downstepPosition));
            case 'position':
                return this._getPronunciationHtml(this._pronunciationGenerator.createPronunciationDownstepPosition(downstepPosition));
            default:
                return '';
        }
    }

    _hiragana(context, ...args) {
        const ii = args.length - 1;
        const options = args[ii];
        const {keepProlongedSoundMarks} = options.hash;
        const value = (ii > 0 ? args[0] : options.fn(context));
        return this._japaneseUtil.convertKatakanaToHiragana(value, keepProlongedSoundMarks === true);
    }

    _katakana(context, ...args) {
        const ii = args.length - 1;
        const options = args[ii];
        const value = (ii > 0 ? args[0] : options.fn(context));
        return this._japaneseUtil.convertHiraganaToKatakana(value);
    }
}
