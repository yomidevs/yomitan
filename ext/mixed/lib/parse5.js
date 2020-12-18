(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.parse5 = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

const { DOCUMENT_MODE } = require('./html');

//Const
const VALID_DOCTYPE_NAME = 'html';
const VALID_SYSTEM_ID = 'about:legacy-compat';
const QUIRKS_MODE_SYSTEM_ID = 'http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd';

const QUIRKS_MODE_PUBLIC_ID_PREFIXES = [
    '+//silmaril//dtd html pro v0r11 19970101//',
    '-//as//dtd html 3.0 aswedit + extensions//',
    '-//advasoft ltd//dtd html 3.0 aswedit + extensions//',
    '-//ietf//dtd html 2.0 level 1//',
    '-//ietf//dtd html 2.0 level 2//',
    '-//ietf//dtd html 2.0 strict level 1//',
    '-//ietf//dtd html 2.0 strict level 2//',
    '-//ietf//dtd html 2.0 strict//',
    '-//ietf//dtd html 2.0//',
    '-//ietf//dtd html 2.1e//',
    '-//ietf//dtd html 3.0//',
    '-//ietf//dtd html 3.2 final//',
    '-//ietf//dtd html 3.2//',
    '-//ietf//dtd html 3//',
    '-//ietf//dtd html level 0//',
    '-//ietf//dtd html level 1//',
    '-//ietf//dtd html level 2//',
    '-//ietf//dtd html level 3//',
    '-//ietf//dtd html strict level 0//',
    '-//ietf//dtd html strict level 1//',
    '-//ietf//dtd html strict level 2//',
    '-//ietf//dtd html strict level 3//',
    '-//ietf//dtd html strict//',
    '-//ietf//dtd html//',
    '-//metrius//dtd metrius presentational//',
    '-//microsoft//dtd internet explorer 2.0 html strict//',
    '-//microsoft//dtd internet explorer 2.0 html//',
    '-//microsoft//dtd internet explorer 2.0 tables//',
    '-//microsoft//dtd internet explorer 3.0 html strict//',
    '-//microsoft//dtd internet explorer 3.0 html//',
    '-//microsoft//dtd internet explorer 3.0 tables//',
    '-//netscape comm. corp.//dtd html//',
    '-//netscape comm. corp.//dtd strict html//',
    "-//o'reilly and associates//dtd html 2.0//",
    "-//o'reilly and associates//dtd html extended 1.0//",
    "-//o'reilly and associates//dtd html extended relaxed 1.0//",
    '-//sq//dtd html 2.0 hotmetal + extensions//',
    '-//softquad software//dtd hotmetal pro 6.0::19990601::extensions to html 4.0//',
    '-//softquad//dtd hotmetal pro 4.0::19971010::extensions to html 4.0//',
    '-//spyglass//dtd html 2.0 extended//',
    '-//sun microsystems corp.//dtd hotjava html//',
    '-//sun microsystems corp.//dtd hotjava strict html//',
    '-//w3c//dtd html 3 1995-03-24//',
    '-//w3c//dtd html 3.2 draft//',
    '-//w3c//dtd html 3.2 final//',
    '-//w3c//dtd html 3.2//',
    '-//w3c//dtd html 3.2s draft//',
    '-//w3c//dtd html 4.0 frameset//',
    '-//w3c//dtd html 4.0 transitional//',
    '-//w3c//dtd html experimental 19960712//',
    '-//w3c//dtd html experimental 970421//',
    '-//w3c//dtd w3 html//',
    '-//w3o//dtd w3 html 3.0//',
    '-//webtechs//dtd mozilla html 2.0//',
    '-//webtechs//dtd mozilla html//'
];

const QUIRKS_MODE_NO_SYSTEM_ID_PUBLIC_ID_PREFIXES = QUIRKS_MODE_PUBLIC_ID_PREFIXES.concat([
    '-//w3c//dtd html 4.01 frameset//',
    '-//w3c//dtd html 4.01 transitional//'
]);

const QUIRKS_MODE_PUBLIC_IDS = ['-//w3o//dtd w3 html strict 3.0//en//', '-/w3c/dtd html 4.0 transitional/en', 'html'];
const LIMITED_QUIRKS_PUBLIC_ID_PREFIXES = ['-//w3c//dtd xhtml 1.0 frameset//', '-//w3c//dtd xhtml 1.0 transitional//'];

const LIMITED_QUIRKS_WITH_SYSTEM_ID_PUBLIC_ID_PREFIXES = LIMITED_QUIRKS_PUBLIC_ID_PREFIXES.concat([
    '-//w3c//dtd html 4.01 frameset//',
    '-//w3c//dtd html 4.01 transitional//'
]);

//Utils
function enquoteDoctypeId(id) {
    const quote = id.indexOf('"') !== -1 ? "'" : '"';

    return quote + id + quote;
}

function hasPrefix(publicId, prefixes) {
    for (let i = 0; i < prefixes.length; i++) {
        if (publicId.indexOf(prefixes[i]) === 0) {
            return true;
        }
    }

    return false;
}

//API
exports.isConforming = function(token) {
    return (
        token.name === VALID_DOCTYPE_NAME &&
        token.publicId === null &&
        (token.systemId === null || token.systemId === VALID_SYSTEM_ID)
    );
};

exports.getDocumentMode = function(token) {
    if (token.name !== VALID_DOCTYPE_NAME) {
        return DOCUMENT_MODE.QUIRKS;
    }

    const systemId = token.systemId;

    if (systemId && systemId.toLowerCase() === QUIRKS_MODE_SYSTEM_ID) {
        return DOCUMENT_MODE.QUIRKS;
    }

    let publicId = token.publicId;

    if (publicId !== null) {
        publicId = publicId.toLowerCase();

        if (QUIRKS_MODE_PUBLIC_IDS.indexOf(publicId) > -1) {
            return DOCUMENT_MODE.QUIRKS;
        }

        let prefixes = systemId === null ? QUIRKS_MODE_NO_SYSTEM_ID_PUBLIC_ID_PREFIXES : QUIRKS_MODE_PUBLIC_ID_PREFIXES;

        if (hasPrefix(publicId, prefixes)) {
            return DOCUMENT_MODE.QUIRKS;
        }

        prefixes =
            systemId === null ? LIMITED_QUIRKS_PUBLIC_ID_PREFIXES : LIMITED_QUIRKS_WITH_SYSTEM_ID_PUBLIC_ID_PREFIXES;

        if (hasPrefix(publicId, prefixes)) {
            return DOCUMENT_MODE.LIMITED_QUIRKS;
        }
    }

    return DOCUMENT_MODE.NO_QUIRKS;
};

exports.serializeContent = function(name, publicId, systemId) {
    let str = '!DOCTYPE ';

    if (name) {
        str += name;
    }

    if (publicId) {
        str += ' PUBLIC ' + enquoteDoctypeId(publicId);
    } else if (systemId) {
        str += ' SYSTEM';
    }

    if (systemId !== null) {
        str += ' ' + enquoteDoctypeId(systemId);
    }

    return str;
};

},{"./html":4}],2:[function(require,module,exports){
'use strict';

module.exports = {
    controlCharacterInInputStream: 'control-character-in-input-stream',
    noncharacterInInputStream: 'noncharacter-in-input-stream',
    surrogateInInputStream: 'surrogate-in-input-stream',
    nonVoidHtmlElementStartTagWithTrailingSolidus: 'non-void-html-element-start-tag-with-trailing-solidus',
    endTagWithAttributes: 'end-tag-with-attributes',
    endTagWithTrailingSolidus: 'end-tag-with-trailing-solidus',
    unexpectedSolidusInTag: 'unexpected-solidus-in-tag',
    unexpectedNullCharacter: 'unexpected-null-character',
    unexpectedQuestionMarkInsteadOfTagName: 'unexpected-question-mark-instead-of-tag-name',
    invalidFirstCharacterOfTagName: 'invalid-first-character-of-tag-name',
    unexpectedEqualsSignBeforeAttributeName: 'unexpected-equals-sign-before-attribute-name',
    missingEndTagName: 'missing-end-tag-name',
    unexpectedCharacterInAttributeName: 'unexpected-character-in-attribute-name',
    unknownNamedCharacterReference: 'unknown-named-character-reference',
    missingSemicolonAfterCharacterReference: 'missing-semicolon-after-character-reference',
    unexpectedCharacterAfterDoctypeSystemIdentifier: 'unexpected-character-after-doctype-system-identifier',
    unexpectedCharacterInUnquotedAttributeValue: 'unexpected-character-in-unquoted-attribute-value',
    eofBeforeTagName: 'eof-before-tag-name',
    eofInTag: 'eof-in-tag',
    missingAttributeValue: 'missing-attribute-value',
    missingWhitespaceBetweenAttributes: 'missing-whitespace-between-attributes',
    missingWhitespaceAfterDoctypePublicKeyword: 'missing-whitespace-after-doctype-public-keyword',
    missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers:
        'missing-whitespace-between-doctype-public-and-system-identifiers',
    missingWhitespaceAfterDoctypeSystemKeyword: 'missing-whitespace-after-doctype-system-keyword',
    missingQuoteBeforeDoctypePublicIdentifier: 'missing-quote-before-doctype-public-identifier',
    missingQuoteBeforeDoctypeSystemIdentifier: 'missing-quote-before-doctype-system-identifier',
    missingDoctypePublicIdentifier: 'missing-doctype-public-identifier',
    missingDoctypeSystemIdentifier: 'missing-doctype-system-identifier',
    abruptDoctypePublicIdentifier: 'abrupt-doctype-public-identifier',
    abruptDoctypeSystemIdentifier: 'abrupt-doctype-system-identifier',
    cdataInHtmlContent: 'cdata-in-html-content',
    incorrectlyOpenedComment: 'incorrectly-opened-comment',
    eofInScriptHtmlCommentLikeText: 'eof-in-script-html-comment-like-text',
    eofInDoctype: 'eof-in-doctype',
    nestedComment: 'nested-comment',
    abruptClosingOfEmptyComment: 'abrupt-closing-of-empty-comment',
    eofInComment: 'eof-in-comment',
    incorrectlyClosedComment: 'incorrectly-closed-comment',
    eofInCdata: 'eof-in-cdata',
    absenceOfDigitsInNumericCharacterReference: 'absence-of-digits-in-numeric-character-reference',
    nullCharacterReference: 'null-character-reference',
    surrogateCharacterReference: 'surrogate-character-reference',
    characterReferenceOutsideUnicodeRange: 'character-reference-outside-unicode-range',
    controlCharacterReference: 'control-character-reference',
    noncharacterCharacterReference: 'noncharacter-character-reference',
    missingWhitespaceBeforeDoctypeName: 'missing-whitespace-before-doctype-name',
    missingDoctypeName: 'missing-doctype-name',
    invalidCharacterSequenceAfterDoctypeName: 'invalid-character-sequence-after-doctype-name',
    duplicateAttribute: 'duplicate-attribute',
    nonConformingDoctype: 'non-conforming-doctype',
    missingDoctype: 'missing-doctype',
    misplacedDoctype: 'misplaced-doctype',
    endTagWithoutMatchingOpenElement: 'end-tag-without-matching-open-element',
    closingOfElementWithOpenChildElements: 'closing-of-element-with-open-child-elements',
    disallowedContentInNoscriptInHead: 'disallowed-content-in-noscript-in-head',
    openElementsLeftAfterEof: 'open-elements-left-after-eof',
    abandonedHeadElementChild: 'abandoned-head-element-child',
    misplacedStartTagForHeadElement: 'misplaced-start-tag-for-head-element',
    nestedNoscriptInHead: 'nested-noscript-in-head',
    eofInElementThatCanContainOnlyText: 'eof-in-element-that-can-contain-only-text'
};

},{}],3:[function(require,module,exports){
'use strict';

const Tokenizer = require('../tokenizer');
const HTML = require('./html');

//Aliases
const $ = HTML.TAG_NAMES;
const NS = HTML.NAMESPACES;
const ATTRS = HTML.ATTRS;

//MIME types
const MIME_TYPES = {
    TEXT_HTML: 'text/html',
    APPLICATION_XML: 'application/xhtml+xml'
};

//Attributes
const DEFINITION_URL_ATTR = 'definitionurl';
const ADJUSTED_DEFINITION_URL_ATTR = 'definitionURL';
const SVG_ATTRS_ADJUSTMENT_MAP = {
    attributename: 'attributeName',
    attributetype: 'attributeType',
    basefrequency: 'baseFrequency',
    baseprofile: 'baseProfile',
    calcmode: 'calcMode',
    clippathunits: 'clipPathUnits',
    diffuseconstant: 'diffuseConstant',
    edgemode: 'edgeMode',
    filterunits: 'filterUnits',
    glyphref: 'glyphRef',
    gradienttransform: 'gradientTransform',
    gradientunits: 'gradientUnits',
    kernelmatrix: 'kernelMatrix',
    kernelunitlength: 'kernelUnitLength',
    keypoints: 'keyPoints',
    keysplines: 'keySplines',
    keytimes: 'keyTimes',
    lengthadjust: 'lengthAdjust',
    limitingconeangle: 'limitingConeAngle',
    markerheight: 'markerHeight',
    markerunits: 'markerUnits',
    markerwidth: 'markerWidth',
    maskcontentunits: 'maskContentUnits',
    maskunits: 'maskUnits',
    numoctaves: 'numOctaves',
    pathlength: 'pathLength',
    patterncontentunits: 'patternContentUnits',
    patterntransform: 'patternTransform',
    patternunits: 'patternUnits',
    pointsatx: 'pointsAtX',
    pointsaty: 'pointsAtY',
    pointsatz: 'pointsAtZ',
    preservealpha: 'preserveAlpha',
    preserveaspectratio: 'preserveAspectRatio',
    primitiveunits: 'primitiveUnits',
    refx: 'refX',
    refy: 'refY',
    repeatcount: 'repeatCount',
    repeatdur: 'repeatDur',
    requiredextensions: 'requiredExtensions',
    requiredfeatures: 'requiredFeatures',
    specularconstant: 'specularConstant',
    specularexponent: 'specularExponent',
    spreadmethod: 'spreadMethod',
    startoffset: 'startOffset',
    stddeviation: 'stdDeviation',
    stitchtiles: 'stitchTiles',
    surfacescale: 'surfaceScale',
    systemlanguage: 'systemLanguage',
    tablevalues: 'tableValues',
    targetx: 'targetX',
    targety: 'targetY',
    textlength: 'textLength',
    viewbox: 'viewBox',
    viewtarget: 'viewTarget',
    xchannelselector: 'xChannelSelector',
    ychannelselector: 'yChannelSelector',
    zoomandpan: 'zoomAndPan'
};

const XML_ATTRS_ADJUSTMENT_MAP = {
    'xlink:actuate': { prefix: 'xlink', name: 'actuate', namespace: NS.XLINK },
    'xlink:arcrole': { prefix: 'xlink', name: 'arcrole', namespace: NS.XLINK },
    'xlink:href': { prefix: 'xlink', name: 'href', namespace: NS.XLINK },
    'xlink:role': { prefix: 'xlink', name: 'role', namespace: NS.XLINK },
    'xlink:show': { prefix: 'xlink', name: 'show', namespace: NS.XLINK },
    'xlink:title': { prefix: 'xlink', name: 'title', namespace: NS.XLINK },
    'xlink:type': { prefix: 'xlink', name: 'type', namespace: NS.XLINK },
    'xml:base': { prefix: 'xml', name: 'base', namespace: NS.XML },
    'xml:lang': { prefix: 'xml', name: 'lang', namespace: NS.XML },
    'xml:space': { prefix: 'xml', name: 'space', namespace: NS.XML },
    xmlns: { prefix: '', name: 'xmlns', namespace: NS.XMLNS },
    'xmlns:xlink': { prefix: 'xmlns', name: 'xlink', namespace: NS.XMLNS }
};

//SVG tag names adjustment map
const SVG_TAG_NAMES_ADJUSTMENT_MAP = (exports.SVG_TAG_NAMES_ADJUSTMENT_MAP = {
    altglyph: 'altGlyph',
    altglyphdef: 'altGlyphDef',
    altglyphitem: 'altGlyphItem',
    animatecolor: 'animateColor',
    animatemotion: 'animateMotion',
    animatetransform: 'animateTransform',
    clippath: 'clipPath',
    feblend: 'feBlend',
    fecolormatrix: 'feColorMatrix',
    fecomponenttransfer: 'feComponentTransfer',
    fecomposite: 'feComposite',
    feconvolvematrix: 'feConvolveMatrix',
    fediffuselighting: 'feDiffuseLighting',
    fedisplacementmap: 'feDisplacementMap',
    fedistantlight: 'feDistantLight',
    feflood: 'feFlood',
    fefunca: 'feFuncA',
    fefuncb: 'feFuncB',
    fefuncg: 'feFuncG',
    fefuncr: 'feFuncR',
    fegaussianblur: 'feGaussianBlur',
    feimage: 'feImage',
    femerge: 'feMerge',
    femergenode: 'feMergeNode',
    femorphology: 'feMorphology',
    feoffset: 'feOffset',
    fepointlight: 'fePointLight',
    fespecularlighting: 'feSpecularLighting',
    fespotlight: 'feSpotLight',
    fetile: 'feTile',
    feturbulence: 'feTurbulence',
    foreignobject: 'foreignObject',
    glyphref: 'glyphRef',
    lineargradient: 'linearGradient',
    radialgradient: 'radialGradient',
    textpath: 'textPath'
});

//Tags that causes exit from foreign content
const EXITS_FOREIGN_CONTENT = {
    [$.B]: true,
    [$.BIG]: true,
    [$.BLOCKQUOTE]: true,
    [$.BODY]: true,
    [$.BR]: true,
    [$.CENTER]: true,
    [$.CODE]: true,
    [$.DD]: true,
    [$.DIV]: true,
    [$.DL]: true,
    [$.DT]: true,
    [$.EM]: true,
    [$.EMBED]: true,
    [$.H1]: true,
    [$.H2]: true,
    [$.H3]: true,
    [$.H4]: true,
    [$.H5]: true,
    [$.H6]: true,
    [$.HEAD]: true,
    [$.HR]: true,
    [$.I]: true,
    [$.IMG]: true,
    [$.LI]: true,
    [$.LISTING]: true,
    [$.MENU]: true,
    [$.META]: true,
    [$.NOBR]: true,
    [$.OL]: true,
    [$.P]: true,
    [$.PRE]: true,
    [$.RUBY]: true,
    [$.S]: true,
    [$.SMALL]: true,
    [$.SPAN]: true,
    [$.STRONG]: true,
    [$.STRIKE]: true,
    [$.SUB]: true,
    [$.SUP]: true,
    [$.TABLE]: true,
    [$.TT]: true,
    [$.U]: true,
    [$.UL]: true,
    [$.VAR]: true
};

//Check exit from foreign content
exports.causesExit = function(startTagToken) {
    const tn = startTagToken.tagName;
    const isFontWithAttrs =
        tn === $.FONT &&
        (Tokenizer.getTokenAttr(startTagToken, ATTRS.COLOR) !== null ||
            Tokenizer.getTokenAttr(startTagToken, ATTRS.SIZE) !== null ||
            Tokenizer.getTokenAttr(startTagToken, ATTRS.FACE) !== null);

    return isFontWithAttrs ? true : EXITS_FOREIGN_CONTENT[tn];
};

//Token adjustments
exports.adjustTokenMathMLAttrs = function(token) {
    for (let i = 0; i < token.attrs.length; i++) {
        if (token.attrs[i].name === DEFINITION_URL_ATTR) {
            token.attrs[i].name = ADJUSTED_DEFINITION_URL_ATTR;
            break;
        }
    }
};

exports.adjustTokenSVGAttrs = function(token) {
    for (let i = 0; i < token.attrs.length; i++) {
        const adjustedAttrName = SVG_ATTRS_ADJUSTMENT_MAP[token.attrs[i].name];

        if (adjustedAttrName) {
            token.attrs[i].name = adjustedAttrName;
        }
    }
};

exports.adjustTokenXMLAttrs = function(token) {
    for (let i = 0; i < token.attrs.length; i++) {
        const adjustedAttrEntry = XML_ATTRS_ADJUSTMENT_MAP[token.attrs[i].name];

        if (adjustedAttrEntry) {
            token.attrs[i].prefix = adjustedAttrEntry.prefix;
            token.attrs[i].name = adjustedAttrEntry.name;
            token.attrs[i].namespace = adjustedAttrEntry.namespace;
        }
    }
};

exports.adjustTokenSVGTagName = function(token) {
    const adjustedTagName = SVG_TAG_NAMES_ADJUSTMENT_MAP[token.tagName];

    if (adjustedTagName) {
        token.tagName = adjustedTagName;
    }
};

//Integration points
function isMathMLTextIntegrationPoint(tn, ns) {
    return ns === NS.MATHML && (tn === $.MI || tn === $.MO || tn === $.MN || tn === $.MS || tn === $.MTEXT);
}

function isHtmlIntegrationPoint(tn, ns, attrs) {
    if (ns === NS.MATHML && tn === $.ANNOTATION_XML) {
        for (let i = 0; i < attrs.length; i++) {
            if (attrs[i].name === ATTRS.ENCODING) {
                const value = attrs[i].value.toLowerCase();

                return value === MIME_TYPES.TEXT_HTML || value === MIME_TYPES.APPLICATION_XML;
            }
        }
    }

    return ns === NS.SVG && (tn === $.FOREIGN_OBJECT || tn === $.DESC || tn === $.TITLE);
}

exports.isIntegrationPoint = function(tn, ns, attrs, foreignNS) {
    if ((!foreignNS || foreignNS === NS.HTML) && isHtmlIntegrationPoint(tn, ns, attrs)) {
        return true;
    }

    if ((!foreignNS || foreignNS === NS.MATHML) && isMathMLTextIntegrationPoint(tn, ns)) {
        return true;
    }

    return false;
};

},{"../tokenizer":19,"./html":4}],4:[function(require,module,exports){
'use strict';

const NS = (exports.NAMESPACES = {
    HTML: 'http://www.w3.org/1999/xhtml',
    MATHML: 'http://www.w3.org/1998/Math/MathML',
    SVG: 'http://www.w3.org/2000/svg',
    XLINK: 'http://www.w3.org/1999/xlink',
    XML: 'http://www.w3.org/XML/1998/namespace',
    XMLNS: 'http://www.w3.org/2000/xmlns/'
});

exports.ATTRS = {
    TYPE: 'type',
    ACTION: 'action',
    ENCODING: 'encoding',
    PROMPT: 'prompt',
    NAME: 'name',
    COLOR: 'color',
    FACE: 'face',
    SIZE: 'size'
};

exports.DOCUMENT_MODE = {
    NO_QUIRKS: 'no-quirks',
    QUIRKS: 'quirks',
    LIMITED_QUIRKS: 'limited-quirks'
};

const $ = (exports.TAG_NAMES = {
    A: 'a',
    ADDRESS: 'address',
    ANNOTATION_XML: 'annotation-xml',
    APPLET: 'applet',
    AREA: 'area',
    ARTICLE: 'article',
    ASIDE: 'aside',

    B: 'b',
    BASE: 'base',
    BASEFONT: 'basefont',
    BGSOUND: 'bgsound',
    BIG: 'big',
    BLOCKQUOTE: 'blockquote',
    BODY: 'body',
    BR: 'br',
    BUTTON: 'button',

    CAPTION: 'caption',
    CENTER: 'center',
    CODE: 'code',
    COL: 'col',
    COLGROUP: 'colgroup',

    DD: 'dd',
    DESC: 'desc',
    DETAILS: 'details',
    DIALOG: 'dialog',
    DIR: 'dir',
    DIV: 'div',
    DL: 'dl',
    DT: 'dt',

    EM: 'em',
    EMBED: 'embed',

    FIELDSET: 'fieldset',
    FIGCAPTION: 'figcaption',
    FIGURE: 'figure',
    FONT: 'font',
    FOOTER: 'footer',
    FOREIGN_OBJECT: 'foreignObject',
    FORM: 'form',
    FRAME: 'frame',
    FRAMESET: 'frameset',

    H1: 'h1',
    H2: 'h2',
    H3: 'h3',
    H4: 'h4',
    H5: 'h5',
    H6: 'h6',
    HEAD: 'head',
    HEADER: 'header',
    HGROUP: 'hgroup',
    HR: 'hr',
    HTML: 'html',

    I: 'i',
    IMG: 'img',
    IMAGE: 'image',
    INPUT: 'input',
    IFRAME: 'iframe',

    KEYGEN: 'keygen',

    LABEL: 'label',
    LI: 'li',
    LINK: 'link',
    LISTING: 'listing',

    MAIN: 'main',
    MALIGNMARK: 'malignmark',
    MARQUEE: 'marquee',
    MATH: 'math',
    MENU: 'menu',
    META: 'meta',
    MGLYPH: 'mglyph',
    MI: 'mi',
    MO: 'mo',
    MN: 'mn',
    MS: 'ms',
    MTEXT: 'mtext',

    NAV: 'nav',
    NOBR: 'nobr',
    NOFRAMES: 'noframes',
    NOEMBED: 'noembed',
    NOSCRIPT: 'noscript',

    OBJECT: 'object',
    OL: 'ol',
    OPTGROUP: 'optgroup',
    OPTION: 'option',

    P: 'p',
    PARAM: 'param',
    PLAINTEXT: 'plaintext',
    PRE: 'pre',

    RB: 'rb',
    RP: 'rp',
    RT: 'rt',
    RTC: 'rtc',
    RUBY: 'ruby',

    S: 's',
    SCRIPT: 'script',
    SECTION: 'section',
    SELECT: 'select',
    SOURCE: 'source',
    SMALL: 'small',
    SPAN: 'span',
    STRIKE: 'strike',
    STRONG: 'strong',
    STYLE: 'style',
    SUB: 'sub',
    SUMMARY: 'summary',
    SUP: 'sup',

    TABLE: 'table',
    TBODY: 'tbody',
    TEMPLATE: 'template',
    TEXTAREA: 'textarea',
    TFOOT: 'tfoot',
    TD: 'td',
    TH: 'th',
    THEAD: 'thead',
    TITLE: 'title',
    TR: 'tr',
    TRACK: 'track',
    TT: 'tt',

    U: 'u',
    UL: 'ul',

    SVG: 'svg',

    VAR: 'var',

    WBR: 'wbr',

    XMP: 'xmp'
});

exports.SPECIAL_ELEMENTS = {
    [NS.HTML]: {
        [$.ADDRESS]: true,
        [$.APPLET]: true,
        [$.AREA]: true,
        [$.ARTICLE]: true,
        [$.ASIDE]: true,
        [$.BASE]: true,
        [$.BASEFONT]: true,
        [$.BGSOUND]: true,
        [$.BLOCKQUOTE]: true,
        [$.BODY]: true,
        [$.BR]: true,
        [$.BUTTON]: true,
        [$.CAPTION]: true,
        [$.CENTER]: true,
        [$.COL]: true,
        [$.COLGROUP]: true,
        [$.DD]: true,
        [$.DETAILS]: true,
        [$.DIR]: true,
        [$.DIV]: true,
        [$.DL]: true,
        [$.DT]: true,
        [$.EMBED]: true,
        [$.FIELDSET]: true,
        [$.FIGCAPTION]: true,
        [$.FIGURE]: true,
        [$.FOOTER]: true,
        [$.FORM]: true,
        [$.FRAME]: true,
        [$.FRAMESET]: true,
        [$.H1]: true,
        [$.H2]: true,
        [$.H3]: true,
        [$.H4]: true,
        [$.H5]: true,
        [$.H6]: true,
        [$.HEAD]: true,
        [$.HEADER]: true,
        [$.HGROUP]: true,
        [$.HR]: true,
        [$.HTML]: true,
        [$.IFRAME]: true,
        [$.IMG]: true,
        [$.INPUT]: true,
        [$.LI]: true,
        [$.LINK]: true,
        [$.LISTING]: true,
        [$.MAIN]: true,
        [$.MARQUEE]: true,
        [$.MENU]: true,
        [$.META]: true,
        [$.NAV]: true,
        [$.NOEMBED]: true,
        [$.NOFRAMES]: true,
        [$.NOSCRIPT]: true,
        [$.OBJECT]: true,
        [$.OL]: true,
        [$.P]: true,
        [$.PARAM]: true,
        [$.PLAINTEXT]: true,
        [$.PRE]: true,
        [$.SCRIPT]: true,
        [$.SECTION]: true,
        [$.SELECT]: true,
        [$.SOURCE]: true,
        [$.STYLE]: true,
        [$.SUMMARY]: true,
        [$.TABLE]: true,
        [$.TBODY]: true,
        [$.TD]: true,
        [$.TEMPLATE]: true,
        [$.TEXTAREA]: true,
        [$.TFOOT]: true,
        [$.TH]: true,
        [$.THEAD]: true,
        [$.TITLE]: true,
        [$.TR]: true,
        [$.TRACK]: true,
        [$.UL]: true,
        [$.WBR]: true,
        [$.XMP]: true
    },
    [NS.MATHML]: {
        [$.MI]: true,
        [$.MO]: true,
        [$.MN]: true,
        [$.MS]: true,
        [$.MTEXT]: true,
        [$.ANNOTATION_XML]: true
    },
    [NS.SVG]: {
        [$.TITLE]: true,
        [$.FOREIGN_OBJECT]: true,
        [$.DESC]: true
    }
};

},{}],5:[function(require,module,exports){
'use strict';

const UNDEFINED_CODE_POINTS = [
    0xfffe,
    0xffff,
    0x1fffe,
    0x1ffff,
    0x2fffe,
    0x2ffff,
    0x3fffe,
    0x3ffff,
    0x4fffe,
    0x4ffff,
    0x5fffe,
    0x5ffff,
    0x6fffe,
    0x6ffff,
    0x7fffe,
    0x7ffff,
    0x8fffe,
    0x8ffff,
    0x9fffe,
    0x9ffff,
    0xafffe,
    0xaffff,
    0xbfffe,
    0xbffff,
    0xcfffe,
    0xcffff,
    0xdfffe,
    0xdffff,
    0xefffe,
    0xeffff,
    0xffffe,
    0xfffff,
    0x10fffe,
    0x10ffff
];

exports.REPLACEMENT_CHARACTER = '\uFFFD';

exports.CODE_POINTS = {
    EOF: -1,
    NULL: 0x00,
    TABULATION: 0x09,
    CARRIAGE_RETURN: 0x0d,
    LINE_FEED: 0x0a,
    FORM_FEED: 0x0c,
    SPACE: 0x20,
    EXCLAMATION_MARK: 0x21,
    QUOTATION_MARK: 0x22,
    NUMBER_SIGN: 0x23,
    AMPERSAND: 0x26,
    APOSTROPHE: 0x27,
    HYPHEN_MINUS: 0x2d,
    SOLIDUS: 0x2f,
    DIGIT_0: 0x30,
    DIGIT_9: 0x39,
    SEMICOLON: 0x3b,
    LESS_THAN_SIGN: 0x3c,
    EQUALS_SIGN: 0x3d,
    GREATER_THAN_SIGN: 0x3e,
    QUESTION_MARK: 0x3f,
    LATIN_CAPITAL_A: 0x41,
    LATIN_CAPITAL_F: 0x46,
    LATIN_CAPITAL_X: 0x58,
    LATIN_CAPITAL_Z: 0x5a,
    RIGHT_SQUARE_BRACKET: 0x5d,
    GRAVE_ACCENT: 0x60,
    LATIN_SMALL_A: 0x61,
    LATIN_SMALL_F: 0x66,
    LATIN_SMALL_X: 0x78,
    LATIN_SMALL_Z: 0x7a,
    REPLACEMENT_CHARACTER: 0xfffd
};

exports.CODE_POINT_SEQUENCES = {
    DASH_DASH_STRING: [0x2d, 0x2d], //--
    DOCTYPE_STRING: [0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45], //DOCTYPE
    CDATA_START_STRING: [0x5b, 0x43, 0x44, 0x41, 0x54, 0x41, 0x5b], //[CDATA[
    SCRIPT_STRING: [0x73, 0x63, 0x72, 0x69, 0x70, 0x74], //script
    PUBLIC_STRING: [0x50, 0x55, 0x42, 0x4c, 0x49, 0x43], //PUBLIC
    SYSTEM_STRING: [0x53, 0x59, 0x53, 0x54, 0x45, 0x4d] //SYSTEM
};

//Surrogates
exports.isSurrogate = function(cp) {
    return cp >= 0xd800 && cp <= 0xdfff;
};

exports.isSurrogatePair = function(cp) {
    return cp >= 0xdc00 && cp <= 0xdfff;
};

exports.getSurrogatePairCodePoint = function(cp1, cp2) {
    return (cp1 - 0xd800) * 0x400 + 0x2400 + cp2;
};

//NOTE: excluding NULL and ASCII whitespace
exports.isControlCodePoint = function(cp) {
    return (
        (cp !== 0x20 && cp !== 0x0a && cp !== 0x0d && cp !== 0x09 && cp !== 0x0c && cp >= 0x01 && cp <= 0x1f) ||
        (cp >= 0x7f && cp <= 0x9f)
    );
};

exports.isUndefinedCodePoint = function(cp) {
    return (cp >= 0xfdd0 && cp <= 0xfdef) || UNDEFINED_CODE_POINTS.indexOf(cp) > -1;
};

},{}],6:[function(require,module,exports){
'use strict';

const Mixin = require('../../utils/mixin');

class ErrorReportingMixinBase extends Mixin {
    constructor(host, opts) {
        super(host);

        this.posTracker = null;
        this.onParseError = opts.onParseError;
    }

    _setErrorLocation(err) {
        err.startLine = err.endLine = this.posTracker.line;
        err.startCol = err.endCol = this.posTracker.col;
        err.startOffset = err.endOffset = this.posTracker.offset;
    }

    _reportError(code) {
        const err = {
            code: code,
            startLine: -1,
            startCol: -1,
            startOffset: -1,
            endLine: -1,
            endCol: -1,
            endOffset: -1
        };

        this._setErrorLocation(err);
        this.onParseError(err);
    }

    _getOverriddenMethods(mxn) {
        return {
            _err(code) {
                mxn._reportError(code);
            }
        };
    }
}

module.exports = ErrorReportingMixinBase;

},{"../../utils/mixin":24}],7:[function(require,module,exports){
'use strict';

const ErrorReportingMixinBase = require('./mixin-base');
const ErrorReportingTokenizerMixin = require('./tokenizer-mixin');
const LocationInfoTokenizerMixin = require('../location-info/tokenizer-mixin');
const Mixin = require('../../utils/mixin');

class ErrorReportingParserMixin extends ErrorReportingMixinBase {
    constructor(parser, opts) {
        super(parser, opts);

        this.opts = opts;
        this.ctLoc = null;
        this.locBeforeToken = false;
    }

    _setErrorLocation(err) {
        if (this.ctLoc) {
            err.startLine = this.ctLoc.startLine;
            err.startCol = this.ctLoc.startCol;
            err.startOffset = this.ctLoc.startOffset;

            err.endLine = this.locBeforeToken ? this.ctLoc.startLine : this.ctLoc.endLine;
            err.endCol = this.locBeforeToken ? this.ctLoc.startCol : this.ctLoc.endCol;
            err.endOffset = this.locBeforeToken ? this.ctLoc.startOffset : this.ctLoc.endOffset;
        }
    }

    _getOverriddenMethods(mxn, orig) {
        return {
            _bootstrap(document, fragmentContext) {
                orig._bootstrap.call(this, document, fragmentContext);

                Mixin.install(this.tokenizer, ErrorReportingTokenizerMixin, mxn.opts);
                Mixin.install(this.tokenizer, LocationInfoTokenizerMixin);
            },

            _processInputToken(token) {
                mxn.ctLoc = token.location;

                orig._processInputToken.call(this, token);
            },

            _err(code, options) {
                mxn.locBeforeToken = options && options.beforeToken;
                mxn._reportError(code);
            }
        };
    }
}

module.exports = ErrorReportingParserMixin;

},{"../../utils/mixin":24,"../location-info/tokenizer-mixin":12,"./mixin-base":6,"./tokenizer-mixin":9}],8:[function(require,module,exports){
'use strict';

const ErrorReportingMixinBase = require('./mixin-base');
const PositionTrackingPreprocessorMixin = require('../position-tracking/preprocessor-mixin');
const Mixin = require('../../utils/mixin');

class ErrorReportingPreprocessorMixin extends ErrorReportingMixinBase {
    constructor(preprocessor, opts) {
        super(preprocessor, opts);

        this.posTracker = Mixin.install(preprocessor, PositionTrackingPreprocessorMixin);
        this.lastErrOffset = -1;
    }

    _reportError(code) {
        //NOTE: avoid reporting error twice on advance/retreat
        if (this.lastErrOffset !== this.posTracker.offset) {
            this.lastErrOffset = this.posTracker.offset;
            super._reportError(code);
        }
    }
}

module.exports = ErrorReportingPreprocessorMixin;

},{"../../utils/mixin":24,"../position-tracking/preprocessor-mixin":13,"./mixin-base":6}],9:[function(require,module,exports){
'use strict';

const ErrorReportingMixinBase = require('./mixin-base');
const ErrorReportingPreprocessorMixin = require('./preprocessor-mixin');
const Mixin = require('../../utils/mixin');

class ErrorReportingTokenizerMixin extends ErrorReportingMixinBase {
    constructor(tokenizer, opts) {
        super(tokenizer, opts);

        const preprocessorMixin = Mixin.install(tokenizer.preprocessor, ErrorReportingPreprocessorMixin, opts);

        this.posTracker = preprocessorMixin.posTracker;
    }
}

module.exports = ErrorReportingTokenizerMixin;

},{"../../utils/mixin":24,"./mixin-base":6,"./preprocessor-mixin":8}],10:[function(require,module,exports){
'use strict';

const Mixin = require('../../utils/mixin');

class LocationInfoOpenElementStackMixin extends Mixin {
    constructor(stack, opts) {
        super(stack);

        this.onItemPop = opts.onItemPop;
    }

    _getOverriddenMethods(mxn, orig) {
        return {
            pop() {
                mxn.onItemPop(this.current);
                orig.pop.call(this);
            },

            popAllUpToHtmlElement() {
                for (let i = this.stackTop; i > 0; i--) {
                    mxn.onItemPop(this.items[i]);
                }

                orig.popAllUpToHtmlElement.call(this);
            },

            remove(element) {
                mxn.onItemPop(this.current);
                orig.remove.call(this, element);
            }
        };
    }
}

module.exports = LocationInfoOpenElementStackMixin;

},{"../../utils/mixin":24}],11:[function(require,module,exports){
'use strict';

const Mixin = require('../../utils/mixin');
const Tokenizer = require('../../tokenizer');
const LocationInfoTokenizerMixin = require('./tokenizer-mixin');
const LocationInfoOpenElementStackMixin = require('./open-element-stack-mixin');
const HTML = require('../../common/html');

//Aliases
const $ = HTML.TAG_NAMES;

class LocationInfoParserMixin extends Mixin {
    constructor(parser) {
        super(parser);

        this.parser = parser;
        this.treeAdapter = this.parser.treeAdapter;
        this.posTracker = null;
        this.lastStartTagToken = null;
        this.lastFosterParentingLocation = null;
        this.currentToken = null;
    }

    _setStartLocation(element) {
        let loc = null;

        if (this.lastStartTagToken) {
            loc = Object.assign({}, this.lastStartTagToken.location);
            loc.startTag = this.lastStartTagToken.location;
        }

        this.treeAdapter.setNodeSourceCodeLocation(element, loc);
    }

    _setEndLocation(element, closingToken) {
        const loc = this.treeAdapter.getNodeSourceCodeLocation(element);

        if (loc) {
            if (closingToken.location) {
                const ctLoc = closingToken.location;
                const tn = this.treeAdapter.getTagName(element);

                // NOTE: For cases like <p> <p> </p> - First 'p' closes without a closing
                // tag and for cases like <td> <p> </td> - 'p' closes without a closing tag.
                const isClosingEndTag = closingToken.type === Tokenizer.END_TAG_TOKEN && tn === closingToken.tagName;
                const endLoc = {};
                if (isClosingEndTag) {
                    endLoc.endTag = Object.assign({}, ctLoc);
                    endLoc.endLine = ctLoc.endLine;
                    endLoc.endCol = ctLoc.endCol;
                    endLoc.endOffset = ctLoc.endOffset;
                } else {
                    endLoc.endLine = ctLoc.startLine;
                    endLoc.endCol = ctLoc.startCol;
                    endLoc.endOffset = ctLoc.startOffset;
                }

                this.treeAdapter.updateNodeSourceCodeLocation(element, endLoc);
            }
        }
    }

    _getOverriddenMethods(mxn, orig) {
        return {
            _bootstrap(document, fragmentContext) {
                orig._bootstrap.call(this, document, fragmentContext);

                mxn.lastStartTagToken = null;
                mxn.lastFosterParentingLocation = null;
                mxn.currentToken = null;

                const tokenizerMixin = Mixin.install(this.tokenizer, LocationInfoTokenizerMixin);

                mxn.posTracker = tokenizerMixin.posTracker;

                Mixin.install(this.openElements, LocationInfoOpenElementStackMixin, {
                    onItemPop: function(element) {
                        mxn._setEndLocation(element, mxn.currentToken);
                    }
                });
            },

            _runParsingLoop(scriptHandler) {
                orig._runParsingLoop.call(this, scriptHandler);

                // NOTE: generate location info for elements
                // that remains on open element stack
                for (let i = this.openElements.stackTop; i >= 0; i--) {
                    mxn._setEndLocation(this.openElements.items[i], mxn.currentToken);
                }
            },

            //Token processing
            _processTokenInForeignContent(token) {
                mxn.currentToken = token;
                orig._processTokenInForeignContent.call(this, token);
            },

            _processToken(token) {
                mxn.currentToken = token;
                orig._processToken.call(this, token);

                //NOTE: <body> and <html> are never popped from the stack, so we need to updated
                //their end location explicitly.
                const requireExplicitUpdate =
                    token.type === Tokenizer.END_TAG_TOKEN &&
                    (token.tagName === $.HTML || (token.tagName === $.BODY && this.openElements.hasInScope($.BODY)));

                if (requireExplicitUpdate) {
                    for (let i = this.openElements.stackTop; i >= 0; i--) {
                        const element = this.openElements.items[i];

                        if (this.treeAdapter.getTagName(element) === token.tagName) {
                            mxn._setEndLocation(element, token);
                            break;
                        }
                    }
                }
            },

            //Doctype
            _setDocumentType(token) {
                orig._setDocumentType.call(this, token);

                const documentChildren = this.treeAdapter.getChildNodes(this.document);
                const cnLength = documentChildren.length;

                for (let i = 0; i < cnLength; i++) {
                    const node = documentChildren[i];

                    if (this.treeAdapter.isDocumentTypeNode(node)) {
                        this.treeAdapter.setNodeSourceCodeLocation(node, token.location);
                        break;
                    }
                }
            },

            //Elements
            _attachElementToTree(element) {
                //NOTE: _attachElementToTree is called from _appendElement, _insertElement and _insertTemplate methods.
                //So we will use token location stored in this methods for the element.
                mxn._setStartLocation(element);
                mxn.lastStartTagToken = null;
                orig._attachElementToTree.call(this, element);
            },

            _appendElement(token, namespaceURI) {
                mxn.lastStartTagToken = token;
                orig._appendElement.call(this, token, namespaceURI);
            },

            _insertElement(token, namespaceURI) {
                mxn.lastStartTagToken = token;
                orig._insertElement.call(this, token, namespaceURI);
            },

            _insertTemplate(token) {
                mxn.lastStartTagToken = token;
                orig._insertTemplate.call(this, token);

                const tmplContent = this.treeAdapter.getTemplateContent(this.openElements.current);

                this.treeAdapter.setNodeSourceCodeLocation(tmplContent, null);
            },

            _insertFakeRootElement() {
                orig._insertFakeRootElement.call(this);
                this.treeAdapter.setNodeSourceCodeLocation(this.openElements.current, null);
            },

            //Comments
            _appendCommentNode(token, parent) {
                orig._appendCommentNode.call(this, token, parent);

                const children = this.treeAdapter.getChildNodes(parent);
                const commentNode = children[children.length - 1];

                this.treeAdapter.setNodeSourceCodeLocation(commentNode, token.location);
            },

            //Text
            _findFosterParentingLocation() {
                //NOTE: store last foster parenting location, so we will be able to find inserted text
                //in case of foster parenting
                mxn.lastFosterParentingLocation = orig._findFosterParentingLocation.call(this);

                return mxn.lastFosterParentingLocation;
            },

            _insertCharacters(token) {
                orig._insertCharacters.call(this, token);

                const hasFosterParent = this._shouldFosterParentOnInsertion();

                const parent =
                    (hasFosterParent && mxn.lastFosterParentingLocation.parent) ||
                    this.openElements.currentTmplContent ||
                    this.openElements.current;

                const siblings = this.treeAdapter.getChildNodes(parent);

                const textNodeIdx =
                    hasFosterParent && mxn.lastFosterParentingLocation.beforeElement
                        ? siblings.indexOf(mxn.lastFosterParentingLocation.beforeElement) - 1
                        : siblings.length - 1;

                const textNode = siblings[textNodeIdx];

                //NOTE: if we have location assigned by another token, then just update end position
                const tnLoc = this.treeAdapter.getNodeSourceCodeLocation(textNode);

                if (tnLoc) {
                    const { endLine, endCol, endOffset } = token.location;
                    this.treeAdapter.updateNodeSourceCodeLocation(textNode, { endLine, endCol, endOffset });
                } else {
                    this.treeAdapter.setNodeSourceCodeLocation(textNode, token.location);
                }
            }
        };
    }
}

module.exports = LocationInfoParserMixin;

},{"../../common/html":4,"../../tokenizer":19,"../../utils/mixin":24,"./open-element-stack-mixin":10,"./tokenizer-mixin":12}],12:[function(require,module,exports){
'use strict';

const Mixin = require('../../utils/mixin');
const Tokenizer = require('../../tokenizer');
const PositionTrackingPreprocessorMixin = require('../position-tracking/preprocessor-mixin');

class LocationInfoTokenizerMixin extends Mixin {
    constructor(tokenizer) {
        super(tokenizer);

        this.tokenizer = tokenizer;
        this.posTracker = Mixin.install(tokenizer.preprocessor, PositionTrackingPreprocessorMixin);
        this.currentAttrLocation = null;
        this.ctLoc = null;
    }

    _getCurrentLocation() {
        return {
            startLine: this.posTracker.line,
            startCol: this.posTracker.col,
            startOffset: this.posTracker.offset,
            endLine: -1,
            endCol: -1,
            endOffset: -1
        };
    }

    _attachCurrentAttrLocationInfo() {
        this.currentAttrLocation.endLine = this.posTracker.line;
        this.currentAttrLocation.endCol = this.posTracker.col;
        this.currentAttrLocation.endOffset = this.posTracker.offset;

        const currentToken = this.tokenizer.currentToken;
        const currentAttr = this.tokenizer.currentAttr;

        if (!currentToken.location.attrs) {
            currentToken.location.attrs = Object.create(null);
        }

        currentToken.location.attrs[currentAttr.name] = this.currentAttrLocation;
    }

    _getOverriddenMethods(mxn, orig) {
        const methods = {
            _createStartTagToken() {
                orig._createStartTagToken.call(this);
                this.currentToken.location = mxn.ctLoc;
            },

            _createEndTagToken() {
                orig._createEndTagToken.call(this);
                this.currentToken.location = mxn.ctLoc;
            },

            _createCommentToken() {
                orig._createCommentToken.call(this);
                this.currentToken.location = mxn.ctLoc;
            },

            _createDoctypeToken(initialName) {
                orig._createDoctypeToken.call(this, initialName);
                this.currentToken.location = mxn.ctLoc;
            },

            _createCharacterToken(type, ch) {
                orig._createCharacterToken.call(this, type, ch);
                this.currentCharacterToken.location = mxn.ctLoc;
            },

            _createEOFToken() {
                orig._createEOFToken.call(this);
                this.currentToken.location = mxn._getCurrentLocation();
            },

            _createAttr(attrNameFirstCh) {
                orig._createAttr.call(this, attrNameFirstCh);
                mxn.currentAttrLocation = mxn._getCurrentLocation();
            },

            _leaveAttrName(toState) {
                orig._leaveAttrName.call(this, toState);
                mxn._attachCurrentAttrLocationInfo();
            },

            _leaveAttrValue(toState) {
                orig._leaveAttrValue.call(this, toState);
                mxn._attachCurrentAttrLocationInfo();
            },

            _emitCurrentToken() {
                const ctLoc = this.currentToken.location;

                //NOTE: if we have pending character token make it's end location equal to the
                //current token's start location.
                if (this.currentCharacterToken) {
                    this.currentCharacterToken.location.endLine = ctLoc.startLine;
                    this.currentCharacterToken.location.endCol = ctLoc.startCol;
                    this.currentCharacterToken.location.endOffset = ctLoc.startOffset;
                }

                if (this.currentToken.type === Tokenizer.EOF_TOKEN) {
                    ctLoc.endLine = ctLoc.startLine;
                    ctLoc.endCol = ctLoc.startCol;
                    ctLoc.endOffset = ctLoc.startOffset;
                } else {
                    ctLoc.endLine = mxn.posTracker.line;
                    ctLoc.endCol = mxn.posTracker.col + 1;
                    ctLoc.endOffset = mxn.posTracker.offset + 1;
                }

                orig._emitCurrentToken.call(this);
            },

            _emitCurrentCharacterToken() {
                const ctLoc = this.currentCharacterToken && this.currentCharacterToken.location;

                //NOTE: if we have character token and it's location wasn't set in the _emitCurrentToken(),
                //then set it's location at the current preprocessor position.
                //We don't need to increment preprocessor position, since character token
                //emission is always forced by the start of the next character token here.
                //So, we already have advanced position.
                if (ctLoc && ctLoc.endOffset === -1) {
                    ctLoc.endLine = mxn.posTracker.line;
                    ctLoc.endCol = mxn.posTracker.col;
                    ctLoc.endOffset = mxn.posTracker.offset;
                }

                orig._emitCurrentCharacterToken.call(this);
            }
        };

        //NOTE: patch initial states for each mode to obtain token start position
        Object.keys(Tokenizer.MODE).forEach(modeName => {
            const state = Tokenizer.MODE[modeName];

            methods[state] = function(cp) {
                mxn.ctLoc = mxn._getCurrentLocation();
                orig[state].call(this, cp);
            };
        });

        return methods;
    }
}

module.exports = LocationInfoTokenizerMixin;

},{"../../tokenizer":19,"../../utils/mixin":24,"../position-tracking/preprocessor-mixin":13}],13:[function(require,module,exports){
'use strict';

const Mixin = require('../../utils/mixin');

class PositionTrackingPreprocessorMixin extends Mixin {
    constructor(preprocessor) {
        super(preprocessor);

        this.preprocessor = preprocessor;
        this.isEol = false;
        this.lineStartPos = 0;
        this.droppedBufferSize = 0;

        this.offset = 0;
        this.col = 0;
        this.line = 1;
    }

    _getOverriddenMethods(mxn, orig) {
        return {
            advance() {
                const pos = this.pos + 1;
                const ch = this.html[pos];

                //NOTE: LF should be in the last column of the line
                if (mxn.isEol) {
                    mxn.isEol = false;
                    mxn.line++;
                    mxn.lineStartPos = pos;
                }

                if (ch === '\n' || (ch === '\r' && this.html[pos + 1] !== '\n')) {
                    mxn.isEol = true;
                }

                mxn.col = pos - mxn.lineStartPos + 1;
                mxn.offset = mxn.droppedBufferSize + pos;

                return orig.advance.call(this);
            },

            retreat() {
                orig.retreat.call(this);

                mxn.isEol = false;
                mxn.col = this.pos - mxn.lineStartPos + 1;
            },

            dropParsedChunk() {
                const prevPos = this.pos;

                orig.dropParsedChunk.call(this);

                const reduction = prevPos - this.pos;

                mxn.lineStartPos -= reduction;
                mxn.droppedBufferSize += reduction;
                mxn.offset = mxn.droppedBufferSize + this.pos;
            }
        };
    }
}

module.exports = PositionTrackingPreprocessorMixin;

},{"../../utils/mixin":24}],14:[function(require,module,exports){
'use strict';

const Parser = require('./parser');
const Serializer = require('./serializer');

// Shorthands
exports.parse = function parse(html, options) {
    const parser = new Parser(options);

    return parser.parse(html);
};

exports.parseFragment = function parseFragment(fragmentContext, html, options) {
    if (typeof fragmentContext === 'string') {
        options = html;
        html = fragmentContext;
        fragmentContext = null;
    }

    const parser = new Parser(options);

    return parser.parseFragment(html, fragmentContext);
};

exports.serialize = function(node, options) {
    const serializer = new Serializer(node, options);

    return serializer.serialize();
};

},{"./parser":16,"./serializer":18}],15:[function(require,module,exports){
'use strict';

//Const
const NOAH_ARK_CAPACITY = 3;

//List of formatting elements
class FormattingElementList {
    constructor(treeAdapter) {
        this.length = 0;
        this.entries = [];
        this.treeAdapter = treeAdapter;
        this.bookmark = null;
    }

    //Noah Ark's condition
    //OPTIMIZATION: at first we try to find possible candidates for exclusion using
    //lightweight heuristics without thorough attributes check.
    _getNoahArkConditionCandidates(newElement) {
        const candidates = [];

        if (this.length >= NOAH_ARK_CAPACITY) {
            const neAttrsLength = this.treeAdapter.getAttrList(newElement).length;
            const neTagName = this.treeAdapter.getTagName(newElement);
            const neNamespaceURI = this.treeAdapter.getNamespaceURI(newElement);

            for (let i = this.length - 1; i >= 0; i--) {
                const entry = this.entries[i];

                if (entry.type === FormattingElementList.MARKER_ENTRY) {
                    break;
                }

                const element = entry.element;
                const elementAttrs = this.treeAdapter.getAttrList(element);

                const isCandidate =
                    this.treeAdapter.getTagName(element) === neTagName &&
                    this.treeAdapter.getNamespaceURI(element) === neNamespaceURI &&
                    elementAttrs.length === neAttrsLength;

                if (isCandidate) {
                    candidates.push({ idx: i, attrs: elementAttrs });
                }
            }
        }

        return candidates.length < NOAH_ARK_CAPACITY ? [] : candidates;
    }

    _ensureNoahArkCondition(newElement) {
        const candidates = this._getNoahArkConditionCandidates(newElement);
        let cLength = candidates.length;

        if (cLength) {
            const neAttrs = this.treeAdapter.getAttrList(newElement);
            const neAttrsLength = neAttrs.length;
            const neAttrsMap = Object.create(null);

            //NOTE: build attrs map for the new element so we can perform fast lookups
            for (let i = 0; i < neAttrsLength; i++) {
                const neAttr = neAttrs[i];

                neAttrsMap[neAttr.name] = neAttr.value;
            }

            for (let i = 0; i < neAttrsLength; i++) {
                for (let j = 0; j < cLength; j++) {
                    const cAttr = candidates[j].attrs[i];

                    if (neAttrsMap[cAttr.name] !== cAttr.value) {
                        candidates.splice(j, 1);
                        cLength--;
                    }

                    if (candidates.length < NOAH_ARK_CAPACITY) {
                        return;
                    }
                }
            }

            //NOTE: remove bottommost candidates until Noah's Ark condition will not be met
            for (let i = cLength - 1; i >= NOAH_ARK_CAPACITY - 1; i--) {
                this.entries.splice(candidates[i].idx, 1);
                this.length--;
            }
        }
    }

    //Mutations
    insertMarker() {
        this.entries.push({ type: FormattingElementList.MARKER_ENTRY });
        this.length++;
    }

    pushElement(element, token) {
        this._ensureNoahArkCondition(element);

        this.entries.push({
            type: FormattingElementList.ELEMENT_ENTRY,
            element: element,
            token: token
        });

        this.length++;
    }

    insertElementAfterBookmark(element, token) {
        let bookmarkIdx = this.length - 1;

        for (; bookmarkIdx >= 0; bookmarkIdx--) {
            if (this.entries[bookmarkIdx] === this.bookmark) {
                break;
            }
        }

        this.entries.splice(bookmarkIdx + 1, 0, {
            type: FormattingElementList.ELEMENT_ENTRY,
            element: element,
            token: token
        });

        this.length++;
    }

    removeEntry(entry) {
        for (let i = this.length - 1; i >= 0; i--) {
            if (this.entries[i] === entry) {
                this.entries.splice(i, 1);
                this.length--;
                break;
            }
        }
    }

    clearToLastMarker() {
        while (this.length) {
            const entry = this.entries.pop();

            this.length--;

            if (entry.type === FormattingElementList.MARKER_ENTRY) {
                break;
            }
        }
    }

    //Search
    getElementEntryInScopeWithTagName(tagName) {
        for (let i = this.length - 1; i >= 0; i--) {
            const entry = this.entries[i];

            if (entry.type === FormattingElementList.MARKER_ENTRY) {
                return null;
            }

            if (this.treeAdapter.getTagName(entry.element) === tagName) {
                return entry;
            }
        }

        return null;
    }

    getElementEntry(element) {
        for (let i = this.length - 1; i >= 0; i--) {
            const entry = this.entries[i];

            if (entry.type === FormattingElementList.ELEMENT_ENTRY && entry.element === element) {
                return entry;
            }
        }

        return null;
    }
}

//Entry types
FormattingElementList.MARKER_ENTRY = 'MARKER_ENTRY';
FormattingElementList.ELEMENT_ENTRY = 'ELEMENT_ENTRY';

module.exports = FormattingElementList;

},{}],16:[function(require,module,exports){
'use strict';

const Tokenizer = require('../tokenizer');
const OpenElementStack = require('./open-element-stack');
const FormattingElementList = require('./formatting-element-list');
const LocationInfoParserMixin = require('../extensions/location-info/parser-mixin');
const ErrorReportingParserMixin = require('../extensions/error-reporting/parser-mixin');
const Mixin = require('../utils/mixin');
const defaultTreeAdapter = require('../tree-adapters/default');
const mergeOptions = require('../utils/merge-options');
const doctype = require('../common/doctype');
const foreignContent = require('../common/foreign-content');
const ERR = require('../common/error-codes');
const unicode = require('../common/unicode');
const HTML = require('../common/html');

//Aliases
const $ = HTML.TAG_NAMES;
const NS = HTML.NAMESPACES;
const ATTRS = HTML.ATTRS;

const DEFAULT_OPTIONS = {
    scriptingEnabled: true,
    sourceCodeLocationInfo: false,
    onParseError: null,
    treeAdapter: defaultTreeAdapter
};

//Misc constants
const HIDDEN_INPUT_TYPE = 'hidden';

//Adoption agency loops iteration count
const AA_OUTER_LOOP_ITER = 8;
const AA_INNER_LOOP_ITER = 3;

//Insertion modes
const INITIAL_MODE = 'INITIAL_MODE';
const BEFORE_HTML_MODE = 'BEFORE_HTML_MODE';
const BEFORE_HEAD_MODE = 'BEFORE_HEAD_MODE';
const IN_HEAD_MODE = 'IN_HEAD_MODE';
const IN_HEAD_NO_SCRIPT_MODE = 'IN_HEAD_NO_SCRIPT_MODE';
const AFTER_HEAD_MODE = 'AFTER_HEAD_MODE';
const IN_BODY_MODE = 'IN_BODY_MODE';
const TEXT_MODE = 'TEXT_MODE';
const IN_TABLE_MODE = 'IN_TABLE_MODE';
const IN_TABLE_TEXT_MODE = 'IN_TABLE_TEXT_MODE';
const IN_CAPTION_MODE = 'IN_CAPTION_MODE';
const IN_COLUMN_GROUP_MODE = 'IN_COLUMN_GROUP_MODE';
const IN_TABLE_BODY_MODE = 'IN_TABLE_BODY_MODE';
const IN_ROW_MODE = 'IN_ROW_MODE';
const IN_CELL_MODE = 'IN_CELL_MODE';
const IN_SELECT_MODE = 'IN_SELECT_MODE';
const IN_SELECT_IN_TABLE_MODE = 'IN_SELECT_IN_TABLE_MODE';
const IN_TEMPLATE_MODE = 'IN_TEMPLATE_MODE';
const AFTER_BODY_MODE = 'AFTER_BODY_MODE';
const IN_FRAMESET_MODE = 'IN_FRAMESET_MODE';
const AFTER_FRAMESET_MODE = 'AFTER_FRAMESET_MODE';
const AFTER_AFTER_BODY_MODE = 'AFTER_AFTER_BODY_MODE';
const AFTER_AFTER_FRAMESET_MODE = 'AFTER_AFTER_FRAMESET_MODE';

//Insertion mode reset map
const INSERTION_MODE_RESET_MAP = {
    [$.TR]: IN_ROW_MODE,
    [$.TBODY]: IN_TABLE_BODY_MODE,
    [$.THEAD]: IN_TABLE_BODY_MODE,
    [$.TFOOT]: IN_TABLE_BODY_MODE,
    [$.CAPTION]: IN_CAPTION_MODE,
    [$.COLGROUP]: IN_COLUMN_GROUP_MODE,
    [$.TABLE]: IN_TABLE_MODE,
    [$.BODY]: IN_BODY_MODE,
    [$.FRAMESET]: IN_FRAMESET_MODE
};

//Template insertion mode switch map
const TEMPLATE_INSERTION_MODE_SWITCH_MAP = {
    [$.CAPTION]: IN_TABLE_MODE,
    [$.COLGROUP]: IN_TABLE_MODE,
    [$.TBODY]: IN_TABLE_MODE,
    [$.TFOOT]: IN_TABLE_MODE,
    [$.THEAD]: IN_TABLE_MODE,
    [$.COL]: IN_COLUMN_GROUP_MODE,
    [$.TR]: IN_TABLE_BODY_MODE,
    [$.TD]: IN_ROW_MODE,
    [$.TH]: IN_ROW_MODE
};

//Token handlers map for insertion modes
const TOKEN_HANDLERS = {
    [INITIAL_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: tokenInInitialMode,
        [Tokenizer.NULL_CHARACTER_TOKEN]: tokenInInitialMode,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: doctypeInInitialMode,
        [Tokenizer.START_TAG_TOKEN]: tokenInInitialMode,
        [Tokenizer.END_TAG_TOKEN]: tokenInInitialMode,
        [Tokenizer.EOF_TOKEN]: tokenInInitialMode
    },
    [BEFORE_HTML_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: tokenBeforeHtml,
        [Tokenizer.NULL_CHARACTER_TOKEN]: tokenBeforeHtml,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagBeforeHtml,
        [Tokenizer.END_TAG_TOKEN]: endTagBeforeHtml,
        [Tokenizer.EOF_TOKEN]: tokenBeforeHtml
    },
    [BEFORE_HEAD_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: tokenBeforeHead,
        [Tokenizer.NULL_CHARACTER_TOKEN]: tokenBeforeHead,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: misplacedDoctype,
        [Tokenizer.START_TAG_TOKEN]: startTagBeforeHead,
        [Tokenizer.END_TAG_TOKEN]: endTagBeforeHead,
        [Tokenizer.EOF_TOKEN]: tokenBeforeHead
    },
    [IN_HEAD_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: tokenInHead,
        [Tokenizer.NULL_CHARACTER_TOKEN]: tokenInHead,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: misplacedDoctype,
        [Tokenizer.START_TAG_TOKEN]: startTagInHead,
        [Tokenizer.END_TAG_TOKEN]: endTagInHead,
        [Tokenizer.EOF_TOKEN]: tokenInHead
    },
    [IN_HEAD_NO_SCRIPT_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: tokenInHeadNoScript,
        [Tokenizer.NULL_CHARACTER_TOKEN]: tokenInHeadNoScript,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: misplacedDoctype,
        [Tokenizer.START_TAG_TOKEN]: startTagInHeadNoScript,
        [Tokenizer.END_TAG_TOKEN]: endTagInHeadNoScript,
        [Tokenizer.EOF_TOKEN]: tokenInHeadNoScript
    },
    [AFTER_HEAD_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: tokenAfterHead,
        [Tokenizer.NULL_CHARACTER_TOKEN]: tokenAfterHead,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: misplacedDoctype,
        [Tokenizer.START_TAG_TOKEN]: startTagAfterHead,
        [Tokenizer.END_TAG_TOKEN]: endTagAfterHead,
        [Tokenizer.EOF_TOKEN]: tokenAfterHead
    },
    [IN_BODY_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: characterInBody,
        [Tokenizer.NULL_CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagInBody,
        [Tokenizer.END_TAG_TOKEN]: endTagInBody,
        [Tokenizer.EOF_TOKEN]: eofInBody
    },
    [TEXT_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: insertCharacters,
        [Tokenizer.NULL_CHARACTER_TOKEN]: insertCharacters,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [Tokenizer.COMMENT_TOKEN]: ignoreToken,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: ignoreToken,
        [Tokenizer.END_TAG_TOKEN]: endTagInText,
        [Tokenizer.EOF_TOKEN]: eofInText
    },
    [IN_TABLE_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: characterInTable,
        [Tokenizer.NULL_CHARACTER_TOKEN]: characterInTable,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: characterInTable,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagInTable,
        [Tokenizer.END_TAG_TOKEN]: endTagInTable,
        [Tokenizer.EOF_TOKEN]: eofInBody
    },
    [IN_TABLE_TEXT_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: characterInTableText,
        [Tokenizer.NULL_CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInTableText,
        [Tokenizer.COMMENT_TOKEN]: tokenInTableText,
        [Tokenizer.DOCTYPE_TOKEN]: tokenInTableText,
        [Tokenizer.START_TAG_TOKEN]: tokenInTableText,
        [Tokenizer.END_TAG_TOKEN]: tokenInTableText,
        [Tokenizer.EOF_TOKEN]: tokenInTableText
    },
    [IN_CAPTION_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: characterInBody,
        [Tokenizer.NULL_CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagInCaption,
        [Tokenizer.END_TAG_TOKEN]: endTagInCaption,
        [Tokenizer.EOF_TOKEN]: eofInBody
    },
    [IN_COLUMN_GROUP_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: tokenInColumnGroup,
        [Tokenizer.NULL_CHARACTER_TOKEN]: tokenInColumnGroup,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagInColumnGroup,
        [Tokenizer.END_TAG_TOKEN]: endTagInColumnGroup,
        [Tokenizer.EOF_TOKEN]: eofInBody
    },
    [IN_TABLE_BODY_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: characterInTable,
        [Tokenizer.NULL_CHARACTER_TOKEN]: characterInTable,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: characterInTable,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagInTableBody,
        [Tokenizer.END_TAG_TOKEN]: endTagInTableBody,
        [Tokenizer.EOF_TOKEN]: eofInBody
    },
    [IN_ROW_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: characterInTable,
        [Tokenizer.NULL_CHARACTER_TOKEN]: characterInTable,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: characterInTable,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagInRow,
        [Tokenizer.END_TAG_TOKEN]: endTagInRow,
        [Tokenizer.EOF_TOKEN]: eofInBody
    },
    [IN_CELL_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: characterInBody,
        [Tokenizer.NULL_CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagInCell,
        [Tokenizer.END_TAG_TOKEN]: endTagInCell,
        [Tokenizer.EOF_TOKEN]: eofInBody
    },
    [IN_SELECT_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: insertCharacters,
        [Tokenizer.NULL_CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagInSelect,
        [Tokenizer.END_TAG_TOKEN]: endTagInSelect,
        [Tokenizer.EOF_TOKEN]: eofInBody
    },
    [IN_SELECT_IN_TABLE_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: insertCharacters,
        [Tokenizer.NULL_CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagInSelectInTable,
        [Tokenizer.END_TAG_TOKEN]: endTagInSelectInTable,
        [Tokenizer.EOF_TOKEN]: eofInBody
    },
    [IN_TEMPLATE_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: characterInBody,
        [Tokenizer.NULL_CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagInTemplate,
        [Tokenizer.END_TAG_TOKEN]: endTagInTemplate,
        [Tokenizer.EOF_TOKEN]: eofInTemplate
    },
    [AFTER_BODY_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: tokenAfterBody,
        [Tokenizer.NULL_CHARACTER_TOKEN]: tokenAfterBody,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [Tokenizer.COMMENT_TOKEN]: appendCommentToRootHtmlElement,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagAfterBody,
        [Tokenizer.END_TAG_TOKEN]: endTagAfterBody,
        [Tokenizer.EOF_TOKEN]: stopParsing
    },
    [IN_FRAMESET_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.NULL_CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagInFrameset,
        [Tokenizer.END_TAG_TOKEN]: endTagInFrameset,
        [Tokenizer.EOF_TOKEN]: stopParsing
    },
    [AFTER_FRAMESET_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.NULL_CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: insertCharacters,
        [Tokenizer.COMMENT_TOKEN]: appendComment,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagAfterFrameset,
        [Tokenizer.END_TAG_TOKEN]: endTagAfterFrameset,
        [Tokenizer.EOF_TOKEN]: stopParsing
    },
    [AFTER_AFTER_BODY_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: tokenAfterAfterBody,
        [Tokenizer.NULL_CHARACTER_TOKEN]: tokenAfterAfterBody,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [Tokenizer.COMMENT_TOKEN]: appendCommentToDocument,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagAfterAfterBody,
        [Tokenizer.END_TAG_TOKEN]: tokenAfterAfterBody,
        [Tokenizer.EOF_TOKEN]: stopParsing
    },
    [AFTER_AFTER_FRAMESET_MODE]: {
        [Tokenizer.CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.NULL_CHARACTER_TOKEN]: ignoreToken,
        [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: whitespaceCharacterInBody,
        [Tokenizer.COMMENT_TOKEN]: appendCommentToDocument,
        [Tokenizer.DOCTYPE_TOKEN]: ignoreToken,
        [Tokenizer.START_TAG_TOKEN]: startTagAfterAfterFrameset,
        [Tokenizer.END_TAG_TOKEN]: ignoreToken,
        [Tokenizer.EOF_TOKEN]: stopParsing
    }
};

//Parser
class Parser {
    constructor(options) {
        this.options = mergeOptions(DEFAULT_OPTIONS, options);

        this.treeAdapter = this.options.treeAdapter;
        this.pendingScript = null;

        if (this.options.sourceCodeLocationInfo) {
            Mixin.install(this, LocationInfoParserMixin);
        }

        if (this.options.onParseError) {
            Mixin.install(this, ErrorReportingParserMixin, { onParseError: this.options.onParseError });
        }
    }

    // API
    parse(html) {
        const document = this.treeAdapter.createDocument();

        this._bootstrap(document, null);
        this.tokenizer.write(html, true);
        this._runParsingLoop(null);

        return document;
    }

    parseFragment(html, fragmentContext) {
        //NOTE: use <template> element as a fragment context if context element was not provided,
        //so we will parse in "forgiving" manner
        if (!fragmentContext) {
            fragmentContext = this.treeAdapter.createElement($.TEMPLATE, NS.HTML, []);
        }

        //NOTE: create fake element which will be used as 'document' for fragment parsing.
        //This is important for jsdom there 'document' can't be recreated, therefore
        //fragment parsing causes messing of the main `document`.
        const documentMock = this.treeAdapter.createElement('documentmock', NS.HTML, []);

        this._bootstrap(documentMock, fragmentContext);

        if (this.treeAdapter.getTagName(fragmentContext) === $.TEMPLATE) {
            this._pushTmplInsertionMode(IN_TEMPLATE_MODE);
        }

        this._initTokenizerForFragmentParsing();
        this._insertFakeRootElement();
        this._resetInsertionMode();
        this._findFormInFragmentContext();
        this.tokenizer.write(html, true);
        this._runParsingLoop(null);

        const rootElement = this.treeAdapter.getFirstChild(documentMock);
        const fragment = this.treeAdapter.createDocumentFragment();

        this._adoptNodes(rootElement, fragment);

        return fragment;
    }

    //Bootstrap parser
    _bootstrap(document, fragmentContext) {
        this.tokenizer = new Tokenizer(this.options);

        this.stopped = false;

        this.insertionMode = INITIAL_MODE;
        this.originalInsertionMode = '';

        this.document = document;
        this.fragmentContext = fragmentContext;

        this.headElement = null;
        this.formElement = null;

        this.openElements = new OpenElementStack(this.document, this.treeAdapter);
        this.activeFormattingElements = new FormattingElementList(this.treeAdapter);

        this.tmplInsertionModeStack = [];
        this.tmplInsertionModeStackTop = -1;
        this.currentTmplInsertionMode = null;

        this.pendingCharacterTokens = [];
        this.hasNonWhitespacePendingCharacterToken = false;

        this.framesetOk = true;
        this.skipNextNewLine = false;
        this.fosterParentingEnabled = false;
    }

    //Errors
    _err() {
        // NOTE: err reporting is noop by default. Enabled by mixin.
    }

    //Parsing loop
    _runParsingLoop(scriptHandler) {
        while (!this.stopped) {
            this._setupTokenizerCDATAMode();

            const token = this.tokenizer.getNextToken();

            if (token.type === Tokenizer.HIBERNATION_TOKEN) {
                break;
            }

            if (this.skipNextNewLine) {
                this.skipNextNewLine = false;

                if (token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN && token.chars[0] === '\n') {
                    if (token.chars.length === 1) {
                        continue;
                    }

                    token.chars = token.chars.substr(1);
                }
            }

            this._processInputToken(token);

            if (scriptHandler && this.pendingScript) {
                break;
            }
        }
    }

    runParsingLoopForCurrentChunk(writeCallback, scriptHandler) {
        this._runParsingLoop(scriptHandler);

        if (scriptHandler && this.pendingScript) {
            const script = this.pendingScript;

            this.pendingScript = null;

            scriptHandler(script);

            return;
        }

        if (writeCallback) {
            writeCallback();
        }
    }

    //Text parsing
    _setupTokenizerCDATAMode() {
        const current = this._getAdjustedCurrentElement();

        this.tokenizer.allowCDATA =
            current &&
            current !== this.document &&
            this.treeAdapter.getNamespaceURI(current) !== NS.HTML &&
            !this._isIntegrationPoint(current);
    }

    _switchToTextParsing(currentToken, nextTokenizerState) {
        this._insertElement(currentToken, NS.HTML);
        this.tokenizer.state = nextTokenizerState;
        this.originalInsertionMode = this.insertionMode;
        this.insertionMode = TEXT_MODE;
    }

    switchToPlaintextParsing() {
        this.insertionMode = TEXT_MODE;
        this.originalInsertionMode = IN_BODY_MODE;
        this.tokenizer.state = Tokenizer.MODE.PLAINTEXT;
    }

    //Fragment parsing
    _getAdjustedCurrentElement() {
        return this.openElements.stackTop === 0 && this.fragmentContext
            ? this.fragmentContext
            : this.openElements.current;
    }

    _findFormInFragmentContext() {
        let node = this.fragmentContext;

        do {
            if (this.treeAdapter.getTagName(node) === $.FORM) {
                this.formElement = node;
                break;
            }

            node = this.treeAdapter.getParentNode(node);
        } while (node);
    }

    _initTokenizerForFragmentParsing() {
        if (this.treeAdapter.getNamespaceURI(this.fragmentContext) === NS.HTML) {
            const tn = this.treeAdapter.getTagName(this.fragmentContext);

            if (tn === $.TITLE || tn === $.TEXTAREA) {
                this.tokenizer.state = Tokenizer.MODE.RCDATA;
            } else if (
                tn === $.STYLE ||
                tn === $.XMP ||
                tn === $.IFRAME ||
                tn === $.NOEMBED ||
                tn === $.NOFRAMES ||
                tn === $.NOSCRIPT
            ) {
                this.tokenizer.state = Tokenizer.MODE.RAWTEXT;
            } else if (tn === $.SCRIPT) {
                this.tokenizer.state = Tokenizer.MODE.SCRIPT_DATA;
            } else if (tn === $.PLAINTEXT) {
                this.tokenizer.state = Tokenizer.MODE.PLAINTEXT;
            }
        }
    }

    //Tree mutation
    _setDocumentType(token) {
        const name = token.name || '';
        const publicId = token.publicId || '';
        const systemId = token.systemId || '';

        this.treeAdapter.setDocumentType(this.document, name, publicId, systemId);
    }

    _attachElementToTree(element) {
        if (this._shouldFosterParentOnInsertion()) {
            this._fosterParentElement(element);
        } else {
            const parent = this.openElements.currentTmplContent || this.openElements.current;

            this.treeAdapter.appendChild(parent, element);
        }
    }

    _appendElement(token, namespaceURI) {
        const element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);

        this._attachElementToTree(element);
    }

    _insertElement(token, namespaceURI) {
        const element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);

        this._attachElementToTree(element);
        this.openElements.push(element);
    }

    _insertFakeElement(tagName) {
        const element = this.treeAdapter.createElement(tagName, NS.HTML, []);

        this._attachElementToTree(element);
        this.openElements.push(element);
    }

    _insertTemplate(token) {
        const tmpl = this.treeAdapter.createElement(token.tagName, NS.HTML, token.attrs);
        const content = this.treeAdapter.createDocumentFragment();

        this.treeAdapter.setTemplateContent(tmpl, content);
        this._attachElementToTree(tmpl);
        this.openElements.push(tmpl);
    }

    _insertFakeRootElement() {
        const element = this.treeAdapter.createElement($.HTML, NS.HTML, []);

        this.treeAdapter.appendChild(this.openElements.current, element);
        this.openElements.push(element);
    }

    _appendCommentNode(token, parent) {
        const commentNode = this.treeAdapter.createCommentNode(token.data);

        this.treeAdapter.appendChild(parent, commentNode);
    }

    _insertCharacters(token) {
        if (this._shouldFosterParentOnInsertion()) {
            this._fosterParentText(token.chars);
        } else {
            const parent = this.openElements.currentTmplContent || this.openElements.current;

            this.treeAdapter.insertText(parent, token.chars);
        }
    }

    _adoptNodes(donor, recipient) {
        for (let child = this.treeAdapter.getFirstChild(donor); child; child = this.treeAdapter.getFirstChild(donor)) {
            this.treeAdapter.detachNode(child);
            this.treeAdapter.appendChild(recipient, child);
        }
    }

    //Token processing
    _shouldProcessTokenInForeignContent(token) {
        const current = this._getAdjustedCurrentElement();

        if (!current || current === this.document) {
            return false;
        }

        const ns = this.treeAdapter.getNamespaceURI(current);

        if (ns === NS.HTML) {
            return false;
        }

        if (
            this.treeAdapter.getTagName(current) === $.ANNOTATION_XML &&
            ns === NS.MATHML &&
            token.type === Tokenizer.START_TAG_TOKEN &&
            token.tagName === $.SVG
        ) {
            return false;
        }

        const isCharacterToken =
            token.type === Tokenizer.CHARACTER_TOKEN ||
            token.type === Tokenizer.NULL_CHARACTER_TOKEN ||
            token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN;

        const isMathMLTextStartTag =
            token.type === Tokenizer.START_TAG_TOKEN && token.tagName !== $.MGLYPH && token.tagName !== $.MALIGNMARK;

        if ((isMathMLTextStartTag || isCharacterToken) && this._isIntegrationPoint(current, NS.MATHML)) {
            return false;
        }

        if (
            (token.type === Tokenizer.START_TAG_TOKEN || isCharacterToken) &&
            this._isIntegrationPoint(current, NS.HTML)
        ) {
            return false;
        }

        return token.type !== Tokenizer.EOF_TOKEN;
    }

    _processToken(token) {
        TOKEN_HANDLERS[this.insertionMode][token.type](this, token);
    }

    _processTokenInBodyMode(token) {
        TOKEN_HANDLERS[IN_BODY_MODE][token.type](this, token);
    }

    _processTokenInForeignContent(token) {
        if (token.type === Tokenizer.CHARACTER_TOKEN) {
            characterInForeignContent(this, token);
        } else if (token.type === Tokenizer.NULL_CHARACTER_TOKEN) {
            nullCharacterInForeignContent(this, token);
        } else if (token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN) {
            insertCharacters(this, token);
        } else if (token.type === Tokenizer.COMMENT_TOKEN) {
            appendComment(this, token);
        } else if (token.type === Tokenizer.START_TAG_TOKEN) {
            startTagInForeignContent(this, token);
        } else if (token.type === Tokenizer.END_TAG_TOKEN) {
            endTagInForeignContent(this, token);
        }
    }

    _processInputToken(token) {
        if (this._shouldProcessTokenInForeignContent(token)) {
            this._processTokenInForeignContent(token);
        } else {
            this._processToken(token);
        }

        if (token.type === Tokenizer.START_TAG_TOKEN && token.selfClosing && !token.ackSelfClosing) {
            this._err(ERR.nonVoidHtmlElementStartTagWithTrailingSolidus);
        }
    }

    //Integration points
    _isIntegrationPoint(element, foreignNS) {
        const tn = this.treeAdapter.getTagName(element);
        const ns = this.treeAdapter.getNamespaceURI(element);
        const attrs = this.treeAdapter.getAttrList(element);

        return foreignContent.isIntegrationPoint(tn, ns, attrs, foreignNS);
    }

    //Active formatting elements reconstruction
    _reconstructActiveFormattingElements() {
        const listLength = this.activeFormattingElements.length;

        if (listLength) {
            let unopenIdx = listLength;
            let entry = null;

            do {
                unopenIdx--;
                entry = this.activeFormattingElements.entries[unopenIdx];

                if (entry.type === FormattingElementList.MARKER_ENTRY || this.openElements.contains(entry.element)) {
                    unopenIdx++;
                    break;
                }
            } while (unopenIdx > 0);

            for (let i = unopenIdx; i < listLength; i++) {
                entry = this.activeFormattingElements.entries[i];
                this._insertElement(entry.token, this.treeAdapter.getNamespaceURI(entry.element));
                entry.element = this.openElements.current;
            }
        }
    }

    //Close elements
    _closeTableCell() {
        this.openElements.generateImpliedEndTags();
        this.openElements.popUntilTableCellPopped();
        this.activeFormattingElements.clearToLastMarker();
        this.insertionMode = IN_ROW_MODE;
    }

    _closePElement() {
        this.openElements.generateImpliedEndTagsWithExclusion($.P);
        this.openElements.popUntilTagNamePopped($.P);
    }

    //Insertion modes
    _resetInsertionMode() {
        for (let i = this.openElements.stackTop, last = false; i >= 0; i--) {
            let element = this.openElements.items[i];

            if (i === 0) {
                last = true;

                if (this.fragmentContext) {
                    element = this.fragmentContext;
                }
            }

            const tn = this.treeAdapter.getTagName(element);
            const newInsertionMode = INSERTION_MODE_RESET_MAP[tn];

            if (newInsertionMode) {
                this.insertionMode = newInsertionMode;
                break;
            } else if (!last && (tn === $.TD || tn === $.TH)) {
                this.insertionMode = IN_CELL_MODE;
                break;
            } else if (!last && tn === $.HEAD) {
                this.insertionMode = IN_HEAD_MODE;
                break;
            } else if (tn === $.SELECT) {
                this._resetInsertionModeForSelect(i);
                break;
            } else if (tn === $.TEMPLATE) {
                this.insertionMode = this.currentTmplInsertionMode;
                break;
            } else if (tn === $.HTML) {
                this.insertionMode = this.headElement ? AFTER_HEAD_MODE : BEFORE_HEAD_MODE;
                break;
            } else if (last) {
                this.insertionMode = IN_BODY_MODE;
                break;
            }
        }
    }

    _resetInsertionModeForSelect(selectIdx) {
        if (selectIdx > 0) {
            for (let i = selectIdx - 1; i > 0; i--) {
                const ancestor = this.openElements.items[i];
                const tn = this.treeAdapter.getTagName(ancestor);

                if (tn === $.TEMPLATE) {
                    break;
                } else if (tn === $.TABLE) {
                    this.insertionMode = IN_SELECT_IN_TABLE_MODE;
                    return;
                }
            }
        }

        this.insertionMode = IN_SELECT_MODE;
    }

    _pushTmplInsertionMode(mode) {
        this.tmplInsertionModeStack.push(mode);
        this.tmplInsertionModeStackTop++;
        this.currentTmplInsertionMode = mode;
    }

    _popTmplInsertionMode() {
        this.tmplInsertionModeStack.pop();
        this.tmplInsertionModeStackTop--;
        this.currentTmplInsertionMode = this.tmplInsertionModeStack[this.tmplInsertionModeStackTop];
    }

    //Foster parenting
    _isElementCausesFosterParenting(element) {
        const tn = this.treeAdapter.getTagName(element);

        return tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD || tn === $.TR;
    }

    _shouldFosterParentOnInsertion() {
        return this.fosterParentingEnabled && this._isElementCausesFosterParenting(this.openElements.current);
    }

    _findFosterParentingLocation() {
        const location = {
            parent: null,
            beforeElement: null
        };

        for (let i = this.openElements.stackTop; i >= 0; i--) {
            const openElement = this.openElements.items[i];
            const tn = this.treeAdapter.getTagName(openElement);
            const ns = this.treeAdapter.getNamespaceURI(openElement);

            if (tn === $.TEMPLATE && ns === NS.HTML) {
                location.parent = this.treeAdapter.getTemplateContent(openElement);
                break;
            } else if (tn === $.TABLE) {
                location.parent = this.treeAdapter.getParentNode(openElement);

                if (location.parent) {
                    location.beforeElement = openElement;
                } else {
                    location.parent = this.openElements.items[i - 1];
                }

                break;
            }
        }

        if (!location.parent) {
            location.parent = this.openElements.items[0];
        }

        return location;
    }

    _fosterParentElement(element) {
        const location = this._findFosterParentingLocation();

        if (location.beforeElement) {
            this.treeAdapter.insertBefore(location.parent, element, location.beforeElement);
        } else {
            this.treeAdapter.appendChild(location.parent, element);
        }
    }

    _fosterParentText(chars) {
        const location = this._findFosterParentingLocation();

        if (location.beforeElement) {
            this.treeAdapter.insertTextBefore(location.parent, chars, location.beforeElement);
        } else {
            this.treeAdapter.insertText(location.parent, chars);
        }
    }

    //Special elements
    _isSpecialElement(element) {
        const tn = this.treeAdapter.getTagName(element);
        const ns = this.treeAdapter.getNamespaceURI(element);

        return HTML.SPECIAL_ELEMENTS[ns][tn];
    }
}

module.exports = Parser;

//Adoption agency algorithm
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tree-construction.html#adoptionAgency)
//------------------------------------------------------------------

//Steps 5-8 of the algorithm
function aaObtainFormattingElementEntry(p, token) {
    let formattingElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName(token.tagName);

    if (formattingElementEntry) {
        if (!p.openElements.contains(formattingElementEntry.element)) {
            p.activeFormattingElements.removeEntry(formattingElementEntry);
            formattingElementEntry = null;
        } else if (!p.openElements.hasInScope(token.tagName)) {
            formattingElementEntry = null;
        }
    } else {
        genericEndTagInBody(p, token);
    }

    return formattingElementEntry;
}

//Steps 9 and 10 of the algorithm
function aaObtainFurthestBlock(p, formattingElementEntry) {
    let furthestBlock = null;

    for (let i = p.openElements.stackTop; i >= 0; i--) {
        const element = p.openElements.items[i];

        if (element === formattingElementEntry.element) {
            break;
        }

        if (p._isSpecialElement(element)) {
            furthestBlock = element;
        }
    }

    if (!furthestBlock) {
        p.openElements.popUntilElementPopped(formattingElementEntry.element);
        p.activeFormattingElements.removeEntry(formattingElementEntry);
    }

    return furthestBlock;
}

//Step 13 of the algorithm
function aaInnerLoop(p, furthestBlock, formattingElement) {
    let lastElement = furthestBlock;
    let nextElement = p.openElements.getCommonAncestor(furthestBlock);

    for (let i = 0, element = nextElement; element !== formattingElement; i++, element = nextElement) {
        //NOTE: store next element for the next loop iteration (it may be deleted from the stack by step 9.5)
        nextElement = p.openElements.getCommonAncestor(element);

        const elementEntry = p.activeFormattingElements.getElementEntry(element);
        const counterOverflow = elementEntry && i >= AA_INNER_LOOP_ITER;
        const shouldRemoveFromOpenElements = !elementEntry || counterOverflow;

        if (shouldRemoveFromOpenElements) {
            if (counterOverflow) {
                p.activeFormattingElements.removeEntry(elementEntry);
            }

            p.openElements.remove(element);
        } else {
            element = aaRecreateElementFromEntry(p, elementEntry);

            if (lastElement === furthestBlock) {
                p.activeFormattingElements.bookmark = elementEntry;
            }

            p.treeAdapter.detachNode(lastElement);
            p.treeAdapter.appendChild(element, lastElement);
            lastElement = element;
        }
    }

    return lastElement;
}

//Step 13.7 of the algorithm
function aaRecreateElementFromEntry(p, elementEntry) {
    const ns = p.treeAdapter.getNamespaceURI(elementEntry.element);
    const newElement = p.treeAdapter.createElement(elementEntry.token.tagName, ns, elementEntry.token.attrs);

    p.openElements.replace(elementEntry.element, newElement);
    elementEntry.element = newElement;

    return newElement;
}

//Step 14 of the algorithm
function aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement) {
    if (p._isElementCausesFosterParenting(commonAncestor)) {
        p._fosterParentElement(lastElement);
    } else {
        const tn = p.treeAdapter.getTagName(commonAncestor);
        const ns = p.treeAdapter.getNamespaceURI(commonAncestor);

        if (tn === $.TEMPLATE && ns === NS.HTML) {
            commonAncestor = p.treeAdapter.getTemplateContent(commonAncestor);
        }

        p.treeAdapter.appendChild(commonAncestor, lastElement);
    }
}

//Steps 15-19 of the algorithm
function aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry) {
    const ns = p.treeAdapter.getNamespaceURI(formattingElementEntry.element);
    const token = formattingElementEntry.token;
    const newElement = p.treeAdapter.createElement(token.tagName, ns, token.attrs);

    p._adoptNodes(furthestBlock, newElement);
    p.treeAdapter.appendChild(furthestBlock, newElement);

    p.activeFormattingElements.insertElementAfterBookmark(newElement, formattingElementEntry.token);
    p.activeFormattingElements.removeEntry(formattingElementEntry);

    p.openElements.remove(formattingElementEntry.element);
    p.openElements.insertAfter(furthestBlock, newElement);
}

//Algorithm entry point
function callAdoptionAgency(p, token) {
    let formattingElementEntry;

    for (let i = 0; i < AA_OUTER_LOOP_ITER; i++) {
        formattingElementEntry = aaObtainFormattingElementEntry(p, token, formattingElementEntry);

        if (!formattingElementEntry) {
            break;
        }

        const furthestBlock = aaObtainFurthestBlock(p, formattingElementEntry);

        if (!furthestBlock) {
            break;
        }

        p.activeFormattingElements.bookmark = formattingElementEntry;

        const lastElement = aaInnerLoop(p, furthestBlock, formattingElementEntry.element);
        const commonAncestor = p.openElements.getCommonAncestor(formattingElementEntry.element);

        p.treeAdapter.detachNode(lastElement);
        aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement);
        aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry);
    }
}

//Generic token handlers
//------------------------------------------------------------------
function ignoreToken() {
    //NOTE: do nothing =)
}

function misplacedDoctype(p) {
    p._err(ERR.misplacedDoctype);
}

function appendComment(p, token) {
    p._appendCommentNode(token, p.openElements.currentTmplContent || p.openElements.current);
}

function appendCommentToRootHtmlElement(p, token) {
    p._appendCommentNode(token, p.openElements.items[0]);
}

function appendCommentToDocument(p, token) {
    p._appendCommentNode(token, p.document);
}

function insertCharacters(p, token) {
    p._insertCharacters(token);
}

function stopParsing(p) {
    p.stopped = true;
}

// The "initial" insertion mode
//------------------------------------------------------------------
function doctypeInInitialMode(p, token) {
    p._setDocumentType(token);

    const mode = token.forceQuirks ? HTML.DOCUMENT_MODE.QUIRKS : doctype.getDocumentMode(token);

    if (!doctype.isConforming(token)) {
        p._err(ERR.nonConformingDoctype);
    }

    p.treeAdapter.setDocumentMode(p.document, mode);

    p.insertionMode = BEFORE_HTML_MODE;
}

function tokenInInitialMode(p, token) {
    p._err(ERR.missingDoctype, { beforeToken: true });
    p.treeAdapter.setDocumentMode(p.document, HTML.DOCUMENT_MODE.QUIRKS);
    p.insertionMode = BEFORE_HTML_MODE;
    p._processToken(token);
}

// The "before html" insertion mode
//------------------------------------------------------------------
function startTagBeforeHtml(p, token) {
    if (token.tagName === $.HTML) {
        p._insertElement(token, NS.HTML);
        p.insertionMode = BEFORE_HEAD_MODE;
    } else {
        tokenBeforeHtml(p, token);
    }
}

function endTagBeforeHtml(p, token) {
    const tn = token.tagName;

    if (tn === $.HTML || tn === $.HEAD || tn === $.BODY || tn === $.BR) {
        tokenBeforeHtml(p, token);
    }
}

function tokenBeforeHtml(p, token) {
    p._insertFakeRootElement();
    p.insertionMode = BEFORE_HEAD_MODE;
    p._processToken(token);
}

// The "before head" insertion mode
//------------------------------------------------------------------
function startTagBeforeHead(p, token) {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.HEAD) {
        p._insertElement(token, NS.HTML);
        p.headElement = p.openElements.current;
        p.insertionMode = IN_HEAD_MODE;
    } else {
        tokenBeforeHead(p, token);
    }
}

function endTagBeforeHead(p, token) {
    const tn = token.tagName;

    if (tn === $.HEAD || tn === $.BODY || tn === $.HTML || tn === $.BR) {
        tokenBeforeHead(p, token);
    } else {
        p._err(ERR.endTagWithoutMatchingOpenElement);
    }
}

function tokenBeforeHead(p, token) {
    p._insertFakeElement($.HEAD);
    p.headElement = p.openElements.current;
    p.insertionMode = IN_HEAD_MODE;
    p._processToken(token);
}

// The "in head" insertion mode
//------------------------------------------------------------------
function startTagInHead(p, token) {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.BASE || tn === $.BASEFONT || tn === $.BGSOUND || tn === $.LINK || tn === $.META) {
        p._appendElement(token, NS.HTML);
        token.ackSelfClosing = true;
    } else if (tn === $.TITLE) {
        p._switchToTextParsing(token, Tokenizer.MODE.RCDATA);
    } else if (tn === $.NOSCRIPT) {
        if (p.options.scriptingEnabled) {
            p._switchToTextParsing(token, Tokenizer.MODE.RAWTEXT);
        } else {
            p._insertElement(token, NS.HTML);
            p.insertionMode = IN_HEAD_NO_SCRIPT_MODE;
        }
    } else if (tn === $.NOFRAMES || tn === $.STYLE) {
        p._switchToTextParsing(token, Tokenizer.MODE.RAWTEXT);
    } else if (tn === $.SCRIPT) {
        p._switchToTextParsing(token, Tokenizer.MODE.SCRIPT_DATA);
    } else if (tn === $.TEMPLATE) {
        p._insertTemplate(token, NS.HTML);
        p.activeFormattingElements.insertMarker();
        p.framesetOk = false;
        p.insertionMode = IN_TEMPLATE_MODE;
        p._pushTmplInsertionMode(IN_TEMPLATE_MODE);
    } else if (tn === $.HEAD) {
        p._err(ERR.misplacedStartTagForHeadElement);
    } else {
        tokenInHead(p, token);
    }
}

function endTagInHead(p, token) {
    const tn = token.tagName;

    if (tn === $.HEAD) {
        p.openElements.pop();
        p.insertionMode = AFTER_HEAD_MODE;
    } else if (tn === $.BODY || tn === $.BR || tn === $.HTML) {
        tokenInHead(p, token);
    } else if (tn === $.TEMPLATE) {
        if (p.openElements.tmplCount > 0) {
            p.openElements.generateImpliedEndTagsThoroughly();

            if (p.openElements.currentTagName !== $.TEMPLATE) {
                p._err(ERR.closingOfElementWithOpenChildElements);
            }

            p.openElements.popUntilTagNamePopped($.TEMPLATE);
            p.activeFormattingElements.clearToLastMarker();
            p._popTmplInsertionMode();
            p._resetInsertionMode();
        } else {
            p._err(ERR.endTagWithoutMatchingOpenElement);
        }
    } else {
        p._err(ERR.endTagWithoutMatchingOpenElement);
    }
}

function tokenInHead(p, token) {
    p.openElements.pop();
    p.insertionMode = AFTER_HEAD_MODE;
    p._processToken(token);
}

// The "in head no script" insertion mode
//------------------------------------------------------------------
function startTagInHeadNoScript(p, token) {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (
        tn === $.BASEFONT ||
        tn === $.BGSOUND ||
        tn === $.HEAD ||
        tn === $.LINK ||
        tn === $.META ||
        tn === $.NOFRAMES ||
        tn === $.STYLE
    ) {
        startTagInHead(p, token);
    } else if (tn === $.NOSCRIPT) {
        p._err(ERR.nestedNoscriptInHead);
    } else {
        tokenInHeadNoScript(p, token);
    }
}

function endTagInHeadNoScript(p, token) {
    const tn = token.tagName;

    if (tn === $.NOSCRIPT) {
        p.openElements.pop();
        p.insertionMode = IN_HEAD_MODE;
    } else if (tn === $.BR) {
        tokenInHeadNoScript(p, token);
    } else {
        p._err(ERR.endTagWithoutMatchingOpenElement);
    }
}

function tokenInHeadNoScript(p, token) {
    const errCode =
        token.type === Tokenizer.EOF_TOKEN ? ERR.openElementsLeftAfterEof : ERR.disallowedContentInNoscriptInHead;

    p._err(errCode);
    p.openElements.pop();
    p.insertionMode = IN_HEAD_MODE;
    p._processToken(token);
}

// The "after head" insertion mode
//------------------------------------------------------------------
function startTagAfterHead(p, token) {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.BODY) {
        p._insertElement(token, NS.HTML);
        p.framesetOk = false;
        p.insertionMode = IN_BODY_MODE;
    } else if (tn === $.FRAMESET) {
        p._insertElement(token, NS.HTML);
        p.insertionMode = IN_FRAMESET_MODE;
    } else if (
        tn === $.BASE ||
        tn === $.BASEFONT ||
        tn === $.BGSOUND ||
        tn === $.LINK ||
        tn === $.META ||
        tn === $.NOFRAMES ||
        tn === $.SCRIPT ||
        tn === $.STYLE ||
        tn === $.TEMPLATE ||
        tn === $.TITLE
    ) {
        p._err(ERR.abandonedHeadElementChild);
        p.openElements.push(p.headElement);
        startTagInHead(p, token);
        p.openElements.remove(p.headElement);
    } else if (tn === $.HEAD) {
        p._err(ERR.misplacedStartTagForHeadElement);
    } else {
        tokenAfterHead(p, token);
    }
}

function endTagAfterHead(p, token) {
    const tn = token.tagName;

    if (tn === $.BODY || tn === $.HTML || tn === $.BR) {
        tokenAfterHead(p, token);
    } else if (tn === $.TEMPLATE) {
        endTagInHead(p, token);
    } else {
        p._err(ERR.endTagWithoutMatchingOpenElement);
    }
}

function tokenAfterHead(p, token) {
    p._insertFakeElement($.BODY);
    p.insertionMode = IN_BODY_MODE;
    p._processToken(token);
}

// The "in body" insertion mode
//------------------------------------------------------------------
function whitespaceCharacterInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertCharacters(token);
}

function characterInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertCharacters(token);
    p.framesetOk = false;
}

function htmlStartTagInBody(p, token) {
    if (p.openElements.tmplCount === 0) {
        p.treeAdapter.adoptAttributes(p.openElements.items[0], token.attrs);
    }
}

function bodyStartTagInBody(p, token) {
    const bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();

    if (bodyElement && p.openElements.tmplCount === 0) {
        p.framesetOk = false;
        p.treeAdapter.adoptAttributes(bodyElement, token.attrs);
    }
}

function framesetStartTagInBody(p, token) {
    const bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();

    if (p.framesetOk && bodyElement) {
        p.treeAdapter.detachNode(bodyElement);
        p.openElements.popAllUpToHtmlElement();
        p._insertElement(token, NS.HTML);
        p.insertionMode = IN_FRAMESET_MODE;
    }
}

function addressStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._insertElement(token, NS.HTML);
}

function numberedHeaderStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    const tn = p.openElements.currentTagName;

    if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6) {
        p.openElements.pop();
    }

    p._insertElement(token, NS.HTML);
}

function preStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._insertElement(token, NS.HTML);
    //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
    //on to the next one. (Newlines at the start of pre blocks are ignored as an authoring convenience.)
    p.skipNextNewLine = true;
    p.framesetOk = false;
}

function formStartTagInBody(p, token) {
    const inTemplate = p.openElements.tmplCount > 0;

    if (!p.formElement || inTemplate) {
        if (p.openElements.hasInButtonScope($.P)) {
            p._closePElement();
        }

        p._insertElement(token, NS.HTML);

        if (!inTemplate) {
            p.formElement = p.openElements.current;
        }
    }
}

function listItemStartTagInBody(p, token) {
    p.framesetOk = false;

    const tn = token.tagName;

    for (let i = p.openElements.stackTop; i >= 0; i--) {
        const element = p.openElements.items[i];
        const elementTn = p.treeAdapter.getTagName(element);
        let closeTn = null;

        if (tn === $.LI && elementTn === $.LI) {
            closeTn = $.LI;
        } else if ((tn === $.DD || tn === $.DT) && (elementTn === $.DD || elementTn === $.DT)) {
            closeTn = elementTn;
        }

        if (closeTn) {
            p.openElements.generateImpliedEndTagsWithExclusion(closeTn);
            p.openElements.popUntilTagNamePopped(closeTn);
            break;
        }

        if (elementTn !== $.ADDRESS && elementTn !== $.DIV && elementTn !== $.P && p._isSpecialElement(element)) {
            break;
        }
    }

    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._insertElement(token, NS.HTML);
}

function plaintextStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._insertElement(token, NS.HTML);
    p.tokenizer.state = Tokenizer.MODE.PLAINTEXT;
}

function buttonStartTagInBody(p, token) {
    if (p.openElements.hasInScope($.BUTTON)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped($.BUTTON);
    }

    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.framesetOk = false;
}

function aStartTagInBody(p, token) {
    const activeElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName($.A);

    if (activeElementEntry) {
        callAdoptionAgency(p, token);
        p.openElements.remove(activeElementEntry.element);
        p.activeFormattingElements.removeEntry(activeElementEntry);
    }

    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}

function bStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}

function nobrStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();

    if (p.openElements.hasInScope($.NOBR)) {
        callAdoptionAgency(p, token);
        p._reconstructActiveFormattingElements();
    }

    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}

function appletStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.activeFormattingElements.insertMarker();
    p.framesetOk = false;
}

function tableStartTagInBody(p, token) {
    if (
        p.treeAdapter.getDocumentMode(p.document) !== HTML.DOCUMENT_MODE.QUIRKS &&
        p.openElements.hasInButtonScope($.P)
    ) {
        p._closePElement();
    }

    p._insertElement(token, NS.HTML);
    p.framesetOk = false;
    p.insertionMode = IN_TABLE_MODE;
}

function areaStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._appendElement(token, NS.HTML);
    p.framesetOk = false;
    token.ackSelfClosing = true;
}

function inputStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._appendElement(token, NS.HTML);

    const inputType = Tokenizer.getTokenAttr(token, ATTRS.TYPE);

    if (!inputType || inputType.toLowerCase() !== HIDDEN_INPUT_TYPE) {
        p.framesetOk = false;
    }

    token.ackSelfClosing = true;
}

function paramStartTagInBody(p, token) {
    p._appendElement(token, NS.HTML);
    token.ackSelfClosing = true;
}

function hrStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._appendElement(token, NS.HTML);
    p.framesetOk = false;
    token.ackSelfClosing = true;
}

function imageStartTagInBody(p, token) {
    token.tagName = $.IMG;
    areaStartTagInBody(p, token);
}

function textareaStartTagInBody(p, token) {
    p._insertElement(token, NS.HTML);
    //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
    //on to the next one. (Newlines at the start of textarea elements are ignored as an authoring convenience.)
    p.skipNextNewLine = true;
    p.tokenizer.state = Tokenizer.MODE.RCDATA;
    p.originalInsertionMode = p.insertionMode;
    p.framesetOk = false;
    p.insertionMode = TEXT_MODE;
}

function xmpStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._reconstructActiveFormattingElements();
    p.framesetOk = false;
    p._switchToTextParsing(token, Tokenizer.MODE.RAWTEXT);
}

function iframeStartTagInBody(p, token) {
    p.framesetOk = false;
    p._switchToTextParsing(token, Tokenizer.MODE.RAWTEXT);
}

//NOTE: here we assume that we always act as an user agent with enabled plugins, so we parse
//<noembed> as a rawtext.
function noembedStartTagInBody(p, token) {
    p._switchToTextParsing(token, Tokenizer.MODE.RAWTEXT);
}

function selectStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
    p.framesetOk = false;

    if (
        p.insertionMode === IN_TABLE_MODE ||
        p.insertionMode === IN_CAPTION_MODE ||
        p.insertionMode === IN_TABLE_BODY_MODE ||
        p.insertionMode === IN_ROW_MODE ||
        p.insertionMode === IN_CELL_MODE
    ) {
        p.insertionMode = IN_SELECT_IN_TABLE_MODE;
    } else {
        p.insertionMode = IN_SELECT_MODE;
    }
}

function optgroupStartTagInBody(p, token) {
    if (p.openElements.currentTagName === $.OPTION) {
        p.openElements.pop();
    }

    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
}

function rbStartTagInBody(p, token) {
    if (p.openElements.hasInScope($.RUBY)) {
        p.openElements.generateImpliedEndTags();
    }

    p._insertElement(token, NS.HTML);
}

function rtStartTagInBody(p, token) {
    if (p.openElements.hasInScope($.RUBY)) {
        p.openElements.generateImpliedEndTagsWithExclusion($.RTC);
    }

    p._insertElement(token, NS.HTML);
}

function menuStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope($.P)) {
        p._closePElement();
    }

    p._insertElement(token, NS.HTML);
}

function mathStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();

    foreignContent.adjustTokenMathMLAttrs(token);
    foreignContent.adjustTokenXMLAttrs(token);

    if (token.selfClosing) {
        p._appendElement(token, NS.MATHML);
    } else {
        p._insertElement(token, NS.MATHML);
    }

    token.ackSelfClosing = true;
}

function svgStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();

    foreignContent.adjustTokenSVGAttrs(token);
    foreignContent.adjustTokenXMLAttrs(token);

    if (token.selfClosing) {
        p._appendElement(token, NS.SVG);
    } else {
        p._insertElement(token, NS.SVG);
    }

    token.ackSelfClosing = true;
}

function genericStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, NS.HTML);
}

//OPTIMIZATION: Integer comparisons are low-cost, so we can use very fast tag name length filters here.
//It's faster than using dictionary.
function startTagInBody(p, token) {
    const tn = token.tagName;

    switch (tn.length) {
        case 1:
            if (tn === $.I || tn === $.S || tn === $.B || tn === $.U) {
                bStartTagInBody(p, token);
            } else if (tn === $.P) {
                addressStartTagInBody(p, token);
            } else if (tn === $.A) {
                aStartTagInBody(p, token);
            } else {
                genericStartTagInBody(p, token);
            }

            break;

        case 2:
            if (tn === $.DL || tn === $.OL || tn === $.UL) {
                addressStartTagInBody(p, token);
            } else if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6) {
                numberedHeaderStartTagInBody(p, token);
            } else if (tn === $.LI || tn === $.DD || tn === $.DT) {
                listItemStartTagInBody(p, token);
            } else if (tn === $.EM || tn === $.TT) {
                bStartTagInBody(p, token);
            } else if (tn === $.BR) {
                areaStartTagInBody(p, token);
            } else if (tn === $.HR) {
                hrStartTagInBody(p, token);
            } else if (tn === $.RB) {
                rbStartTagInBody(p, token);
            } else if (tn === $.RT || tn === $.RP) {
                rtStartTagInBody(p, token);
            } else if (tn !== $.TH && tn !== $.TD && tn !== $.TR) {
                genericStartTagInBody(p, token);
            }

            break;

        case 3:
            if (tn === $.DIV || tn === $.DIR || tn === $.NAV) {
                addressStartTagInBody(p, token);
            } else if (tn === $.PRE) {
                preStartTagInBody(p, token);
            } else if (tn === $.BIG) {
                bStartTagInBody(p, token);
            } else if (tn === $.IMG || tn === $.WBR) {
                areaStartTagInBody(p, token);
            } else if (tn === $.XMP) {
                xmpStartTagInBody(p, token);
            } else if (tn === $.SVG) {
                svgStartTagInBody(p, token);
            } else if (tn === $.RTC) {
                rbStartTagInBody(p, token);
            } else if (tn !== $.COL) {
                genericStartTagInBody(p, token);
            }

            break;

        case 4:
            if (tn === $.HTML) {
                htmlStartTagInBody(p, token);
            } else if (tn === $.BASE || tn === $.LINK || tn === $.META) {
                startTagInHead(p, token);
            } else if (tn === $.BODY) {
                bodyStartTagInBody(p, token);
            } else if (tn === $.MAIN || tn === $.MENU) {
                addressStartTagInBody(p, token);
            } else if (tn === $.FORM) {
                formStartTagInBody(p, token);
            } else if (tn === $.CODE || tn === $.FONT) {
                bStartTagInBody(p, token);
            } else if (tn === $.NOBR) {
                nobrStartTagInBody(p, token);
            } else if (tn === $.AREA) {
                areaStartTagInBody(p, token);
            } else if (tn === $.MATH) {
                mathStartTagInBody(p, token);
            } else if (tn === $.MENU) {
                menuStartTagInBody(p, token);
            } else if (tn !== $.HEAD) {
                genericStartTagInBody(p, token);
            }

            break;

        case 5:
            if (tn === $.STYLE || tn === $.TITLE) {
                startTagInHead(p, token);
            } else if (tn === $.ASIDE) {
                addressStartTagInBody(p, token);
            } else if (tn === $.SMALL) {
                bStartTagInBody(p, token);
            } else if (tn === $.TABLE) {
                tableStartTagInBody(p, token);
            } else if (tn === $.EMBED) {
                areaStartTagInBody(p, token);
            } else if (tn === $.INPUT) {
                inputStartTagInBody(p, token);
            } else if (tn === $.PARAM || tn === $.TRACK) {
                paramStartTagInBody(p, token);
            } else if (tn === $.IMAGE) {
                imageStartTagInBody(p, token);
            } else if (tn !== $.FRAME && tn !== $.TBODY && tn !== $.TFOOT && tn !== $.THEAD) {
                genericStartTagInBody(p, token);
            }

            break;

        case 6:
            if (tn === $.SCRIPT) {
                startTagInHead(p, token);
            } else if (
                tn === $.CENTER ||
                tn === $.FIGURE ||
                tn === $.FOOTER ||
                tn === $.HEADER ||
                tn === $.HGROUP ||
                tn === $.DIALOG
            ) {
                addressStartTagInBody(p, token);
            } else if (tn === $.BUTTON) {
                buttonStartTagInBody(p, token);
            } else if (tn === $.STRIKE || tn === $.STRONG) {
                bStartTagInBody(p, token);
            } else if (tn === $.APPLET || tn === $.OBJECT) {
                appletStartTagInBody(p, token);
            } else if (tn === $.KEYGEN) {
                areaStartTagInBody(p, token);
            } else if (tn === $.SOURCE) {
                paramStartTagInBody(p, token);
            } else if (tn === $.IFRAME) {
                iframeStartTagInBody(p, token);
            } else if (tn === $.SELECT) {
                selectStartTagInBody(p, token);
            } else if (tn === $.OPTION) {
                optgroupStartTagInBody(p, token);
            } else {
                genericStartTagInBody(p, token);
            }

            break;

        case 7:
            if (tn === $.BGSOUND) {
                startTagInHead(p, token);
            } else if (
                tn === $.DETAILS ||
                tn === $.ADDRESS ||
                tn === $.ARTICLE ||
                tn === $.SECTION ||
                tn === $.SUMMARY
            ) {
                addressStartTagInBody(p, token);
            } else if (tn === $.LISTING) {
                preStartTagInBody(p, token);
            } else if (tn === $.MARQUEE) {
                appletStartTagInBody(p, token);
            } else if (tn === $.NOEMBED) {
                noembedStartTagInBody(p, token);
            } else if (tn !== $.CAPTION) {
                genericStartTagInBody(p, token);
            }

            break;

        case 8:
            if (tn === $.BASEFONT) {
                startTagInHead(p, token);
            } else if (tn === $.FRAMESET) {
                framesetStartTagInBody(p, token);
            } else if (tn === $.FIELDSET) {
                addressStartTagInBody(p, token);
            } else if (tn === $.TEXTAREA) {
                textareaStartTagInBody(p, token);
            } else if (tn === $.TEMPLATE) {
                startTagInHead(p, token);
            } else if (tn === $.NOSCRIPT) {
                if (p.options.scriptingEnabled) {
                    noembedStartTagInBody(p, token);
                } else {
                    genericStartTagInBody(p, token);
                }
            } else if (tn === $.OPTGROUP) {
                optgroupStartTagInBody(p, token);
            } else if (tn !== $.COLGROUP) {
                genericStartTagInBody(p, token);
            }

            break;

        case 9:
            if (tn === $.PLAINTEXT) {
                plaintextStartTagInBody(p, token);
            } else {
                genericStartTagInBody(p, token);
            }

            break;

        case 10:
            if (tn === $.BLOCKQUOTE || tn === $.FIGCAPTION) {
                addressStartTagInBody(p, token);
            } else {
                genericStartTagInBody(p, token);
            }

            break;

        default:
            genericStartTagInBody(p, token);
    }
}

function bodyEndTagInBody(p) {
    if (p.openElements.hasInScope($.BODY)) {
        p.insertionMode = AFTER_BODY_MODE;
    }
}

function htmlEndTagInBody(p, token) {
    if (p.openElements.hasInScope($.BODY)) {
        p.insertionMode = AFTER_BODY_MODE;
        p._processToken(token);
    }
}

function addressEndTagInBody(p, token) {
    const tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(tn);
    }
}

function formEndTagInBody(p) {
    const inTemplate = p.openElements.tmplCount > 0;
    const formElement = p.formElement;

    if (!inTemplate) {
        p.formElement = null;
    }

    if ((formElement || inTemplate) && p.openElements.hasInScope($.FORM)) {
        p.openElements.generateImpliedEndTags();

        if (inTemplate) {
            p.openElements.popUntilTagNamePopped($.FORM);
        } else {
            p.openElements.remove(formElement);
        }
    }
}

function pEndTagInBody(p) {
    if (!p.openElements.hasInButtonScope($.P)) {
        p._insertFakeElement($.P);
    }

    p._closePElement();
}

function liEndTagInBody(p) {
    if (p.openElements.hasInListItemScope($.LI)) {
        p.openElements.generateImpliedEndTagsWithExclusion($.LI);
        p.openElements.popUntilTagNamePopped($.LI);
    }
}

function ddEndTagInBody(p, token) {
    const tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTagsWithExclusion(tn);
        p.openElements.popUntilTagNamePopped(tn);
    }
}

function numberedHeaderEndTagInBody(p) {
    if (p.openElements.hasNumberedHeaderInScope()) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilNumberedHeaderPopped();
    }
}

function appletEndTagInBody(p, token) {
    const tn = token.tagName;

    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(tn);
        p.activeFormattingElements.clearToLastMarker();
    }
}

function brEndTagInBody(p) {
    p._reconstructActiveFormattingElements();
    p._insertFakeElement($.BR);
    p.openElements.pop();
    p.framesetOk = false;
}

function genericEndTagInBody(p, token) {
    const tn = token.tagName;

    for (let i = p.openElements.stackTop; i > 0; i--) {
        const element = p.openElements.items[i];

        if (p.treeAdapter.getTagName(element) === tn) {
            p.openElements.generateImpliedEndTagsWithExclusion(tn);
            p.openElements.popUntilElementPopped(element);
            break;
        }

        if (p._isSpecialElement(element)) {
            break;
        }
    }
}

//OPTIMIZATION: Integer comparisons are low-cost, so we can use very fast tag name length filters here.
//It's faster than using dictionary.
function endTagInBody(p, token) {
    const tn = token.tagName;

    switch (tn.length) {
        case 1:
            if (tn === $.A || tn === $.B || tn === $.I || tn === $.S || tn === $.U) {
                callAdoptionAgency(p, token);
            } else if (tn === $.P) {
                pEndTagInBody(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 2:
            if (tn === $.DL || tn === $.UL || tn === $.OL) {
                addressEndTagInBody(p, token);
            } else if (tn === $.LI) {
                liEndTagInBody(p, token);
            } else if (tn === $.DD || tn === $.DT) {
                ddEndTagInBody(p, token);
            } else if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6) {
                numberedHeaderEndTagInBody(p, token);
            } else if (tn === $.BR) {
                brEndTagInBody(p, token);
            } else if (tn === $.EM || tn === $.TT) {
                callAdoptionAgency(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 3:
            if (tn === $.BIG) {
                callAdoptionAgency(p, token);
            } else if (tn === $.DIR || tn === $.DIV || tn === $.NAV || tn === $.PRE) {
                addressEndTagInBody(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 4:
            if (tn === $.BODY) {
                bodyEndTagInBody(p, token);
            } else if (tn === $.HTML) {
                htmlEndTagInBody(p, token);
            } else if (tn === $.FORM) {
                formEndTagInBody(p, token);
            } else if (tn === $.CODE || tn === $.FONT || tn === $.NOBR) {
                callAdoptionAgency(p, token);
            } else if (tn === $.MAIN || tn === $.MENU) {
                addressEndTagInBody(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 5:
            if (tn === $.ASIDE) {
                addressEndTagInBody(p, token);
            } else if (tn === $.SMALL) {
                callAdoptionAgency(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 6:
            if (
                tn === $.CENTER ||
                tn === $.FIGURE ||
                tn === $.FOOTER ||
                tn === $.HEADER ||
                tn === $.HGROUP ||
                tn === $.DIALOG
            ) {
                addressEndTagInBody(p, token);
            } else if (tn === $.APPLET || tn === $.OBJECT) {
                appletEndTagInBody(p, token);
            } else if (tn === $.STRIKE || tn === $.STRONG) {
                callAdoptionAgency(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 7:
            if (
                tn === $.ADDRESS ||
                tn === $.ARTICLE ||
                tn === $.DETAILS ||
                tn === $.SECTION ||
                tn === $.SUMMARY ||
                tn === $.LISTING
            ) {
                addressEndTagInBody(p, token);
            } else if (tn === $.MARQUEE) {
                appletEndTagInBody(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 8:
            if (tn === $.FIELDSET) {
                addressEndTagInBody(p, token);
            } else if (tn === $.TEMPLATE) {
                endTagInHead(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        case 10:
            if (tn === $.BLOCKQUOTE || tn === $.FIGCAPTION) {
                addressEndTagInBody(p, token);
            } else {
                genericEndTagInBody(p, token);
            }

            break;

        default:
            genericEndTagInBody(p, token);
    }
}

function eofInBody(p, token) {
    if (p.tmplInsertionModeStackTop > -1) {
        eofInTemplate(p, token);
    } else {
        p.stopped = true;
    }
}

// The "text" insertion mode
//------------------------------------------------------------------
function endTagInText(p, token) {
    if (token.tagName === $.SCRIPT) {
        p.pendingScript = p.openElements.current;
    }

    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
}

function eofInText(p, token) {
    p._err(ERR.eofInElementThatCanContainOnlyText);
    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
    p._processToken(token);
}

// The "in table" insertion mode
//------------------------------------------------------------------
function characterInTable(p, token) {
    const curTn = p.openElements.currentTagName;

    if (curTn === $.TABLE || curTn === $.TBODY || curTn === $.TFOOT || curTn === $.THEAD || curTn === $.TR) {
        p.pendingCharacterTokens = [];
        p.hasNonWhitespacePendingCharacterToken = false;
        p.originalInsertionMode = p.insertionMode;
        p.insertionMode = IN_TABLE_TEXT_MODE;
        p._processToken(token);
    } else {
        tokenInTable(p, token);
    }
}

function captionStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p.activeFormattingElements.insertMarker();
    p._insertElement(token, NS.HTML);
    p.insertionMode = IN_CAPTION_MODE;
}

function colgroupStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertElement(token, NS.HTML);
    p.insertionMode = IN_COLUMN_GROUP_MODE;
}

function colStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertFakeElement($.COLGROUP);
    p.insertionMode = IN_COLUMN_GROUP_MODE;
    p._processToken(token);
}

function tbodyStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertElement(token, NS.HTML);
    p.insertionMode = IN_TABLE_BODY_MODE;
}

function tdStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertFakeElement($.TBODY);
    p.insertionMode = IN_TABLE_BODY_MODE;
    p._processToken(token);
}

function tableStartTagInTable(p, token) {
    if (p.openElements.hasInTableScope($.TABLE)) {
        p.openElements.popUntilTagNamePopped($.TABLE);
        p._resetInsertionMode();
        p._processToken(token);
    }
}

function inputStartTagInTable(p, token) {
    const inputType = Tokenizer.getTokenAttr(token, ATTRS.TYPE);

    if (inputType && inputType.toLowerCase() === HIDDEN_INPUT_TYPE) {
        p._appendElement(token, NS.HTML);
    } else {
        tokenInTable(p, token);
    }

    token.ackSelfClosing = true;
}

function formStartTagInTable(p, token) {
    if (!p.formElement && p.openElements.tmplCount === 0) {
        p._insertElement(token, NS.HTML);
        p.formElement = p.openElements.current;
        p.openElements.pop();
    }
}

function startTagInTable(p, token) {
    const tn = token.tagName;

    switch (tn.length) {
        case 2:
            if (tn === $.TD || tn === $.TH || tn === $.TR) {
                tdStartTagInTable(p, token);
            } else {
                tokenInTable(p, token);
            }

            break;

        case 3:
            if (tn === $.COL) {
                colStartTagInTable(p, token);
            } else {
                tokenInTable(p, token);
            }

            break;

        case 4:
            if (tn === $.FORM) {
                formStartTagInTable(p, token);
            } else {
                tokenInTable(p, token);
            }

            break;

        case 5:
            if (tn === $.TABLE) {
                tableStartTagInTable(p, token);
            } else if (tn === $.STYLE) {
                startTagInHead(p, token);
            } else if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
                tbodyStartTagInTable(p, token);
            } else if (tn === $.INPUT) {
                inputStartTagInTable(p, token);
            } else {
                tokenInTable(p, token);
            }

            break;

        case 6:
            if (tn === $.SCRIPT) {
                startTagInHead(p, token);
            } else {
                tokenInTable(p, token);
            }

            break;

        case 7:
            if (tn === $.CAPTION) {
                captionStartTagInTable(p, token);
            } else {
                tokenInTable(p, token);
            }

            break;

        case 8:
            if (tn === $.COLGROUP) {
                colgroupStartTagInTable(p, token);
            } else if (tn === $.TEMPLATE) {
                startTagInHead(p, token);
            } else {
                tokenInTable(p, token);
            }

            break;

        default:
            tokenInTable(p, token);
    }
}

function endTagInTable(p, token) {
    const tn = token.tagName;

    if (tn === $.TABLE) {
        if (p.openElements.hasInTableScope($.TABLE)) {
            p.openElements.popUntilTagNamePopped($.TABLE);
            p._resetInsertionMode();
        }
    } else if (tn === $.TEMPLATE) {
        endTagInHead(p, token);
    } else if (
        tn !== $.BODY &&
        tn !== $.CAPTION &&
        tn !== $.COL &&
        tn !== $.COLGROUP &&
        tn !== $.HTML &&
        tn !== $.TBODY &&
        tn !== $.TD &&
        tn !== $.TFOOT &&
        tn !== $.TH &&
        tn !== $.THEAD &&
        tn !== $.TR
    ) {
        tokenInTable(p, token);
    }
}

function tokenInTable(p, token) {
    const savedFosterParentingState = p.fosterParentingEnabled;

    p.fosterParentingEnabled = true;
    p._processTokenInBodyMode(token);
    p.fosterParentingEnabled = savedFosterParentingState;
}

// The "in table text" insertion mode
//------------------------------------------------------------------
function whitespaceCharacterInTableText(p, token) {
    p.pendingCharacterTokens.push(token);
}

function characterInTableText(p, token) {
    p.pendingCharacterTokens.push(token);
    p.hasNonWhitespacePendingCharacterToken = true;
}

function tokenInTableText(p, token) {
    let i = 0;

    if (p.hasNonWhitespacePendingCharacterToken) {
        for (; i < p.pendingCharacterTokens.length; i++) {
            tokenInTable(p, p.pendingCharacterTokens[i]);
        }
    } else {
        for (; i < p.pendingCharacterTokens.length; i++) {
            p._insertCharacters(p.pendingCharacterTokens[i]);
        }
    }

    p.insertionMode = p.originalInsertionMode;
    p._processToken(token);
}

// The "in caption" insertion mode
//------------------------------------------------------------------
function startTagInCaption(p, token) {
    const tn = token.tagName;

    if (
        tn === $.CAPTION ||
        tn === $.COL ||
        tn === $.COLGROUP ||
        tn === $.TBODY ||
        tn === $.TD ||
        tn === $.TFOOT ||
        tn === $.TH ||
        tn === $.THEAD ||
        tn === $.TR
    ) {
        if (p.openElements.hasInTableScope($.CAPTION)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped($.CAPTION);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = IN_TABLE_MODE;
            p._processToken(token);
        }
    } else {
        startTagInBody(p, token);
    }
}

function endTagInCaption(p, token) {
    const tn = token.tagName;

    if (tn === $.CAPTION || tn === $.TABLE) {
        if (p.openElements.hasInTableScope($.CAPTION)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped($.CAPTION);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = IN_TABLE_MODE;

            if (tn === $.TABLE) {
                p._processToken(token);
            }
        }
    } else if (
        tn !== $.BODY &&
        tn !== $.COL &&
        tn !== $.COLGROUP &&
        tn !== $.HTML &&
        tn !== $.TBODY &&
        tn !== $.TD &&
        tn !== $.TFOOT &&
        tn !== $.TH &&
        tn !== $.THEAD &&
        tn !== $.TR
    ) {
        endTagInBody(p, token);
    }
}

// The "in column group" insertion mode
//------------------------------------------------------------------
function startTagInColumnGroup(p, token) {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.COL) {
        p._appendElement(token, NS.HTML);
        token.ackSelfClosing = true;
    } else if (tn === $.TEMPLATE) {
        startTagInHead(p, token);
    } else {
        tokenInColumnGroup(p, token);
    }
}

function endTagInColumnGroup(p, token) {
    const tn = token.tagName;

    if (tn === $.COLGROUP) {
        if (p.openElements.currentTagName === $.COLGROUP) {
            p.openElements.pop();
            p.insertionMode = IN_TABLE_MODE;
        }
    } else if (tn === $.TEMPLATE) {
        endTagInHead(p, token);
    } else if (tn !== $.COL) {
        tokenInColumnGroup(p, token);
    }
}

function tokenInColumnGroup(p, token) {
    if (p.openElements.currentTagName === $.COLGROUP) {
        p.openElements.pop();
        p.insertionMode = IN_TABLE_MODE;
        p._processToken(token);
    }
}

// The "in table body" insertion mode
//------------------------------------------------------------------
function startTagInTableBody(p, token) {
    const tn = token.tagName;

    if (tn === $.TR) {
        p.openElements.clearBackToTableBodyContext();
        p._insertElement(token, NS.HTML);
        p.insertionMode = IN_ROW_MODE;
    } else if (tn === $.TH || tn === $.TD) {
        p.openElements.clearBackToTableBodyContext();
        p._insertFakeElement($.TR);
        p.insertionMode = IN_ROW_MODE;
        p._processToken(token);
    } else if (
        tn === $.CAPTION ||
        tn === $.COL ||
        tn === $.COLGROUP ||
        tn === $.TBODY ||
        tn === $.TFOOT ||
        tn === $.THEAD
    ) {
        if (p.openElements.hasTableBodyContextInTableScope()) {
            p.openElements.clearBackToTableBodyContext();
            p.openElements.pop();
            p.insertionMode = IN_TABLE_MODE;
            p._processToken(token);
        }
    } else {
        startTagInTable(p, token);
    }
}

function endTagInTableBody(p, token) {
    const tn = token.tagName;

    if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.clearBackToTableBodyContext();
            p.openElements.pop();
            p.insertionMode = IN_TABLE_MODE;
        }
    } else if (tn === $.TABLE) {
        if (p.openElements.hasTableBodyContextInTableScope()) {
            p.openElements.clearBackToTableBodyContext();
            p.openElements.pop();
            p.insertionMode = IN_TABLE_MODE;
            p._processToken(token);
        }
    } else if (
        (tn !== $.BODY && tn !== $.CAPTION && tn !== $.COL && tn !== $.COLGROUP) ||
        (tn !== $.HTML && tn !== $.TD && tn !== $.TH && tn !== $.TR)
    ) {
        endTagInTable(p, token);
    }
}

// The "in row" insertion mode
//------------------------------------------------------------------
function startTagInRow(p, token) {
    const tn = token.tagName;

    if (tn === $.TH || tn === $.TD) {
        p.openElements.clearBackToTableRowContext();
        p._insertElement(token, NS.HTML);
        p.insertionMode = IN_CELL_MODE;
        p.activeFormattingElements.insertMarker();
    } else if (
        tn === $.CAPTION ||
        tn === $.COL ||
        tn === $.COLGROUP ||
        tn === $.TBODY ||
        tn === $.TFOOT ||
        tn === $.THEAD ||
        tn === $.TR
    ) {
        if (p.openElements.hasInTableScope($.TR)) {
            p.openElements.clearBackToTableRowContext();
            p.openElements.pop();
            p.insertionMode = IN_TABLE_BODY_MODE;
            p._processToken(token);
        }
    } else {
        startTagInTable(p, token);
    }
}

function endTagInRow(p, token) {
    const tn = token.tagName;

    if (tn === $.TR) {
        if (p.openElements.hasInTableScope($.TR)) {
            p.openElements.clearBackToTableRowContext();
            p.openElements.pop();
            p.insertionMode = IN_TABLE_BODY_MODE;
        }
    } else if (tn === $.TABLE) {
        if (p.openElements.hasInTableScope($.TR)) {
            p.openElements.clearBackToTableRowContext();
            p.openElements.pop();
            p.insertionMode = IN_TABLE_BODY_MODE;
            p._processToken(token);
        }
    } else if (tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD) {
        if (p.openElements.hasInTableScope(tn) || p.openElements.hasInTableScope($.TR)) {
            p.openElements.clearBackToTableRowContext();
            p.openElements.pop();
            p.insertionMode = IN_TABLE_BODY_MODE;
            p._processToken(token);
        }
    } else if (
        (tn !== $.BODY && tn !== $.CAPTION && tn !== $.COL && tn !== $.COLGROUP) ||
        (tn !== $.HTML && tn !== $.TD && tn !== $.TH)
    ) {
        endTagInTable(p, token);
    }
}

// The "in cell" insertion mode
//------------------------------------------------------------------
function startTagInCell(p, token) {
    const tn = token.tagName;

    if (
        tn === $.CAPTION ||
        tn === $.COL ||
        tn === $.COLGROUP ||
        tn === $.TBODY ||
        tn === $.TD ||
        tn === $.TFOOT ||
        tn === $.TH ||
        tn === $.THEAD ||
        tn === $.TR
    ) {
        if (p.openElements.hasInTableScope($.TD) || p.openElements.hasInTableScope($.TH)) {
            p._closeTableCell();
            p._processToken(token);
        }
    } else {
        startTagInBody(p, token);
    }
}

function endTagInCell(p, token) {
    const tn = token.tagName;

    if (tn === $.TD || tn === $.TH) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped(tn);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = IN_ROW_MODE;
        }
    } else if (tn === $.TABLE || tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD || tn === $.TR) {
        if (p.openElements.hasInTableScope(tn)) {
            p._closeTableCell();
            p._processToken(token);
        }
    } else if (tn !== $.BODY && tn !== $.CAPTION && tn !== $.COL && tn !== $.COLGROUP && tn !== $.HTML) {
        endTagInBody(p, token);
    }
}

// The "in select" insertion mode
//------------------------------------------------------------------
function startTagInSelect(p, token) {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.OPTION) {
        if (p.openElements.currentTagName === $.OPTION) {
            p.openElements.pop();
        }

        p._insertElement(token, NS.HTML);
    } else if (tn === $.OPTGROUP) {
        if (p.openElements.currentTagName === $.OPTION) {
            p.openElements.pop();
        }

        if (p.openElements.currentTagName === $.OPTGROUP) {
            p.openElements.pop();
        }

        p._insertElement(token, NS.HTML);
    } else if (tn === $.INPUT || tn === $.KEYGEN || tn === $.TEXTAREA || tn === $.SELECT) {
        if (p.openElements.hasInSelectScope($.SELECT)) {
            p.openElements.popUntilTagNamePopped($.SELECT);
            p._resetInsertionMode();

            if (tn !== $.SELECT) {
                p._processToken(token);
            }
        }
    } else if (tn === $.SCRIPT || tn === $.TEMPLATE) {
        startTagInHead(p, token);
    }
}

function endTagInSelect(p, token) {
    const tn = token.tagName;

    if (tn === $.OPTGROUP) {
        const prevOpenElement = p.openElements.items[p.openElements.stackTop - 1];
        const prevOpenElementTn = prevOpenElement && p.treeAdapter.getTagName(prevOpenElement);

        if (p.openElements.currentTagName === $.OPTION && prevOpenElementTn === $.OPTGROUP) {
            p.openElements.pop();
        }

        if (p.openElements.currentTagName === $.OPTGROUP) {
            p.openElements.pop();
        }
    } else if (tn === $.OPTION) {
        if (p.openElements.currentTagName === $.OPTION) {
            p.openElements.pop();
        }
    } else if (tn === $.SELECT && p.openElements.hasInSelectScope($.SELECT)) {
        p.openElements.popUntilTagNamePopped($.SELECT);
        p._resetInsertionMode();
    } else if (tn === $.TEMPLATE) {
        endTagInHead(p, token);
    }
}

//12.2.5.4.17 The "in select in table" insertion mode
//------------------------------------------------------------------
function startTagInSelectInTable(p, token) {
    const tn = token.tagName;

    if (
        tn === $.CAPTION ||
        tn === $.TABLE ||
        tn === $.TBODY ||
        tn === $.TFOOT ||
        tn === $.THEAD ||
        tn === $.TR ||
        tn === $.TD ||
        tn === $.TH
    ) {
        p.openElements.popUntilTagNamePopped($.SELECT);
        p._resetInsertionMode();
        p._processToken(token);
    } else {
        startTagInSelect(p, token);
    }
}

function endTagInSelectInTable(p, token) {
    const tn = token.tagName;

    if (
        tn === $.CAPTION ||
        tn === $.TABLE ||
        tn === $.TBODY ||
        tn === $.TFOOT ||
        tn === $.THEAD ||
        tn === $.TR ||
        tn === $.TD ||
        tn === $.TH
    ) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.popUntilTagNamePopped($.SELECT);
            p._resetInsertionMode();
            p._processToken(token);
        }
    } else {
        endTagInSelect(p, token);
    }
}

// The "in template" insertion mode
//------------------------------------------------------------------
function startTagInTemplate(p, token) {
    const tn = token.tagName;

    if (
        tn === $.BASE ||
        tn === $.BASEFONT ||
        tn === $.BGSOUND ||
        tn === $.LINK ||
        tn === $.META ||
        tn === $.NOFRAMES ||
        tn === $.SCRIPT ||
        tn === $.STYLE ||
        tn === $.TEMPLATE ||
        tn === $.TITLE
    ) {
        startTagInHead(p, token);
    } else {
        const newInsertionMode = TEMPLATE_INSERTION_MODE_SWITCH_MAP[tn] || IN_BODY_MODE;

        p._popTmplInsertionMode();
        p._pushTmplInsertionMode(newInsertionMode);
        p.insertionMode = newInsertionMode;
        p._processToken(token);
    }
}

function endTagInTemplate(p, token) {
    if (token.tagName === $.TEMPLATE) {
        endTagInHead(p, token);
    }
}

function eofInTemplate(p, token) {
    if (p.openElements.tmplCount > 0) {
        p.openElements.popUntilTagNamePopped($.TEMPLATE);
        p.activeFormattingElements.clearToLastMarker();
        p._popTmplInsertionMode();
        p._resetInsertionMode();
        p._processToken(token);
    } else {
        p.stopped = true;
    }
}

// The "after body" insertion mode
//------------------------------------------------------------------
function startTagAfterBody(p, token) {
    if (token.tagName === $.HTML) {
        startTagInBody(p, token);
    } else {
        tokenAfterBody(p, token);
    }
}

function endTagAfterBody(p, token) {
    if (token.tagName === $.HTML) {
        if (!p.fragmentContext) {
            p.insertionMode = AFTER_AFTER_BODY_MODE;
        }
    } else {
        tokenAfterBody(p, token);
    }
}

function tokenAfterBody(p, token) {
    p.insertionMode = IN_BODY_MODE;
    p._processToken(token);
}

// The "in frameset" insertion mode
//------------------------------------------------------------------
function startTagInFrameset(p, token) {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.FRAMESET) {
        p._insertElement(token, NS.HTML);
    } else if (tn === $.FRAME) {
        p._appendElement(token, NS.HTML);
        token.ackSelfClosing = true;
    } else if (tn === $.NOFRAMES) {
        startTagInHead(p, token);
    }
}

function endTagInFrameset(p, token) {
    if (token.tagName === $.FRAMESET && !p.openElements.isRootHtmlElementCurrent()) {
        p.openElements.pop();

        if (!p.fragmentContext && p.openElements.currentTagName !== $.FRAMESET) {
            p.insertionMode = AFTER_FRAMESET_MODE;
        }
    }
}

// The "after frameset" insertion mode
//------------------------------------------------------------------
function startTagAfterFrameset(p, token) {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.NOFRAMES) {
        startTagInHead(p, token);
    }
}

function endTagAfterFrameset(p, token) {
    if (token.tagName === $.HTML) {
        p.insertionMode = AFTER_AFTER_FRAMESET_MODE;
    }
}

// The "after after body" insertion mode
//------------------------------------------------------------------
function startTagAfterAfterBody(p, token) {
    if (token.tagName === $.HTML) {
        startTagInBody(p, token);
    } else {
        tokenAfterAfterBody(p, token);
    }
}

function tokenAfterAfterBody(p, token) {
    p.insertionMode = IN_BODY_MODE;
    p._processToken(token);
}

// The "after after frameset" insertion mode
//------------------------------------------------------------------
function startTagAfterAfterFrameset(p, token) {
    const tn = token.tagName;

    if (tn === $.HTML) {
        startTagInBody(p, token);
    } else if (tn === $.NOFRAMES) {
        startTagInHead(p, token);
    }
}

// The rules for parsing tokens in foreign content
//------------------------------------------------------------------
function nullCharacterInForeignContent(p, token) {
    token.chars = unicode.REPLACEMENT_CHARACTER;
    p._insertCharacters(token);
}

function characterInForeignContent(p, token) {
    p._insertCharacters(token);
    p.framesetOk = false;
}

function startTagInForeignContent(p, token) {
    if (foreignContent.causesExit(token) && !p.fragmentContext) {
        while (
            p.treeAdapter.getNamespaceURI(p.openElements.current) !== NS.HTML &&
            !p._isIntegrationPoint(p.openElements.current)
        ) {
            p.openElements.pop();
        }

        p._processToken(token);
    } else {
        const current = p._getAdjustedCurrentElement();
        const currentNs = p.treeAdapter.getNamespaceURI(current);

        if (currentNs === NS.MATHML) {
            foreignContent.adjustTokenMathMLAttrs(token);
        } else if (currentNs === NS.SVG) {
            foreignContent.adjustTokenSVGTagName(token);
            foreignContent.adjustTokenSVGAttrs(token);
        }

        foreignContent.adjustTokenXMLAttrs(token);

        if (token.selfClosing) {
            p._appendElement(token, currentNs);
        } else {
            p._insertElement(token, currentNs);
        }

        token.ackSelfClosing = true;
    }
}

function endTagInForeignContent(p, token) {
    for (let i = p.openElements.stackTop; i > 0; i--) {
        const element = p.openElements.items[i];

        if (p.treeAdapter.getNamespaceURI(element) === NS.HTML) {
            p._processToken(token);
            break;
        }

        if (p.treeAdapter.getTagName(element).toLowerCase() === token.tagName) {
            p.openElements.popUntilElementPopped(element);
            break;
        }
    }
}

},{"../common/doctype":1,"../common/error-codes":2,"../common/foreign-content":3,"../common/html":4,"../common/unicode":5,"../extensions/error-reporting/parser-mixin":7,"../extensions/location-info/parser-mixin":11,"../tokenizer":19,"../tree-adapters/default":22,"../utils/merge-options":23,"../utils/mixin":24,"./formatting-element-list":15,"./open-element-stack":17}],17:[function(require,module,exports){
'use strict';

const HTML = require('../common/html');

//Aliases
const $ = HTML.TAG_NAMES;
const NS = HTML.NAMESPACES;

//Element utils

//OPTIMIZATION: Integer comparisons are low-cost, so we can use very fast tag name length filters here.
//It's faster than using dictionary.
function isImpliedEndTagRequired(tn) {
    switch (tn.length) {
        case 1:
            return tn === $.P;

        case 2:
            return tn === $.RB || tn === $.RP || tn === $.RT || tn === $.DD || tn === $.DT || tn === $.LI;

        case 3:
            return tn === $.RTC;

        case 6:
            return tn === $.OPTION;

        case 8:
            return tn === $.OPTGROUP;
    }

    return false;
}

function isImpliedEndTagRequiredThoroughly(tn) {
    switch (tn.length) {
        case 1:
            return tn === $.P;

        case 2:
            return (
                tn === $.RB ||
                tn === $.RP ||
                tn === $.RT ||
                tn === $.DD ||
                tn === $.DT ||
                tn === $.LI ||
                tn === $.TD ||
                tn === $.TH ||
                tn === $.TR
            );

        case 3:
            return tn === $.RTC;

        case 5:
            return tn === $.TBODY || tn === $.TFOOT || tn === $.THEAD;

        case 6:
            return tn === $.OPTION;

        case 7:
            return tn === $.CAPTION;

        case 8:
            return tn === $.OPTGROUP || tn === $.COLGROUP;
    }

    return false;
}

function isScopingElement(tn, ns) {
    switch (tn.length) {
        case 2:
            if (tn === $.TD || tn === $.TH) {
                return ns === NS.HTML;
            } else if (tn === $.MI || tn === $.MO || tn === $.MN || tn === $.MS) {
                return ns === NS.MATHML;
            }

            break;

        case 4:
            if (tn === $.HTML) {
                return ns === NS.HTML;
            } else if (tn === $.DESC) {
                return ns === NS.SVG;
            }

            break;

        case 5:
            if (tn === $.TABLE) {
                return ns === NS.HTML;
            } else if (tn === $.MTEXT) {
                return ns === NS.MATHML;
            } else if (tn === $.TITLE) {
                return ns === NS.SVG;
            }

            break;

        case 6:
            return (tn === $.APPLET || tn === $.OBJECT) && ns === NS.HTML;

        case 7:
            return (tn === $.CAPTION || tn === $.MARQUEE) && ns === NS.HTML;

        case 8:
            return tn === $.TEMPLATE && ns === NS.HTML;

        case 13:
            return tn === $.FOREIGN_OBJECT && ns === NS.SVG;

        case 14:
            return tn === $.ANNOTATION_XML && ns === NS.MATHML;
    }

    return false;
}

//Stack of open elements
class OpenElementStack {
    constructor(document, treeAdapter) {
        this.stackTop = -1;
        this.items = [];
        this.current = document;
        this.currentTagName = null;
        this.currentTmplContent = null;
        this.tmplCount = 0;
        this.treeAdapter = treeAdapter;
    }

    //Index of element
    _indexOf(element) {
        let idx = -1;

        for (let i = this.stackTop; i >= 0; i--) {
            if (this.items[i] === element) {
                idx = i;
                break;
            }
        }
        return idx;
    }

    //Update current element
    _isInTemplate() {
        return this.currentTagName === $.TEMPLATE && this.treeAdapter.getNamespaceURI(this.current) === NS.HTML;
    }

    _updateCurrentElement() {
        this.current = this.items[this.stackTop];
        this.currentTagName = this.current && this.treeAdapter.getTagName(this.current);

        this.currentTmplContent = this._isInTemplate() ? this.treeAdapter.getTemplateContent(this.current) : null;
    }

    //Mutations
    push(element) {
        this.items[++this.stackTop] = element;
        this._updateCurrentElement();

        if (this._isInTemplate()) {
            this.tmplCount++;
        }
    }

    pop() {
        this.stackTop--;

        if (this.tmplCount > 0 && this._isInTemplate()) {
            this.tmplCount--;
        }

        this._updateCurrentElement();
    }

    replace(oldElement, newElement) {
        const idx = this._indexOf(oldElement);

        this.items[idx] = newElement;

        if (idx === this.stackTop) {
            this._updateCurrentElement();
        }
    }

    insertAfter(referenceElement, newElement) {
        const insertionIdx = this._indexOf(referenceElement) + 1;

        this.items.splice(insertionIdx, 0, newElement);

        if (insertionIdx === ++this.stackTop) {
            this._updateCurrentElement();
        }
    }

    popUntilTagNamePopped(tagName) {
        while (this.stackTop > -1) {
            const tn = this.currentTagName;
            const ns = this.treeAdapter.getNamespaceURI(this.current);

            this.pop();

            if (tn === tagName && ns === NS.HTML) {
                break;
            }
        }
    }

    popUntilElementPopped(element) {
        while (this.stackTop > -1) {
            const poppedElement = this.current;

            this.pop();

            if (poppedElement === element) {
                break;
            }
        }
    }

    popUntilNumberedHeaderPopped() {
        while (this.stackTop > -1) {
            const tn = this.currentTagName;
            const ns = this.treeAdapter.getNamespaceURI(this.current);

            this.pop();

            if (
                tn === $.H1 ||
                tn === $.H2 ||
                tn === $.H3 ||
                tn === $.H4 ||
                tn === $.H5 ||
                (tn === $.H6 && ns === NS.HTML)
            ) {
                break;
            }
        }
    }

    popUntilTableCellPopped() {
        while (this.stackTop > -1) {
            const tn = this.currentTagName;
            const ns = this.treeAdapter.getNamespaceURI(this.current);

            this.pop();

            if (tn === $.TD || (tn === $.TH && ns === NS.HTML)) {
                break;
            }
        }
    }

    popAllUpToHtmlElement() {
        //NOTE: here we assume that root <html> element is always first in the open element stack, so
        //we perform this fast stack clean up.
        this.stackTop = 0;
        this._updateCurrentElement();
    }

    clearBackToTableContext() {
        while (
            (this.currentTagName !== $.TABLE && this.currentTagName !== $.TEMPLATE && this.currentTagName !== $.HTML) ||
            this.treeAdapter.getNamespaceURI(this.current) !== NS.HTML
        ) {
            this.pop();
        }
    }

    clearBackToTableBodyContext() {
        while (
            (this.currentTagName !== $.TBODY &&
                this.currentTagName !== $.TFOOT &&
                this.currentTagName !== $.THEAD &&
                this.currentTagName !== $.TEMPLATE &&
                this.currentTagName !== $.HTML) ||
            this.treeAdapter.getNamespaceURI(this.current) !== NS.HTML
        ) {
            this.pop();
        }
    }

    clearBackToTableRowContext() {
        while (
            (this.currentTagName !== $.TR && this.currentTagName !== $.TEMPLATE && this.currentTagName !== $.HTML) ||
            this.treeAdapter.getNamespaceURI(this.current) !== NS.HTML
        ) {
            this.pop();
        }
    }

    remove(element) {
        for (let i = this.stackTop; i >= 0; i--) {
            if (this.items[i] === element) {
                this.items.splice(i, 1);
                this.stackTop--;
                this._updateCurrentElement();
                break;
            }
        }
    }

    //Search
    tryPeekProperlyNestedBodyElement() {
        //Properly nested <body> element (should be second element in stack).
        const element = this.items[1];

        return element && this.treeAdapter.getTagName(element) === $.BODY ? element : null;
    }

    contains(element) {
        return this._indexOf(element) > -1;
    }

    getCommonAncestor(element) {
        let elementIdx = this._indexOf(element);

        return --elementIdx >= 0 ? this.items[elementIdx] : null;
    }

    isRootHtmlElementCurrent() {
        return this.stackTop === 0 && this.currentTagName === $.HTML;
    }

    //Element in scope
    hasInScope(tagName) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.treeAdapter.getTagName(this.items[i]);
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (tn === tagName && ns === NS.HTML) {
                return true;
            }

            if (isScopingElement(tn, ns)) {
                return false;
            }
        }

        return true;
    }

    hasNumberedHeaderInScope() {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.treeAdapter.getTagName(this.items[i]);
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (
                (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6) &&
                ns === NS.HTML
            ) {
                return true;
            }

            if (isScopingElement(tn, ns)) {
                return false;
            }
        }

        return true;
    }

    hasInListItemScope(tagName) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.treeAdapter.getTagName(this.items[i]);
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (tn === tagName && ns === NS.HTML) {
                return true;
            }

            if (((tn === $.UL || tn === $.OL) && ns === NS.HTML) || isScopingElement(tn, ns)) {
                return false;
            }
        }

        return true;
    }

    hasInButtonScope(tagName) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.treeAdapter.getTagName(this.items[i]);
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (tn === tagName && ns === NS.HTML) {
                return true;
            }

            if ((tn === $.BUTTON && ns === NS.HTML) || isScopingElement(tn, ns)) {
                return false;
            }
        }

        return true;
    }

    hasInTableScope(tagName) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.treeAdapter.getTagName(this.items[i]);
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (ns !== NS.HTML) {
                continue;
            }

            if (tn === tagName) {
                return true;
            }

            if (tn === $.TABLE || tn === $.TEMPLATE || tn === $.HTML) {
                return false;
            }
        }

        return true;
    }

    hasTableBodyContextInTableScope() {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.treeAdapter.getTagName(this.items[i]);
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (ns !== NS.HTML) {
                continue;
            }

            if (tn === $.TBODY || tn === $.THEAD || tn === $.TFOOT) {
                return true;
            }

            if (tn === $.TABLE || tn === $.HTML) {
                return false;
            }
        }

        return true;
    }

    hasInSelectScope(tagName) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.treeAdapter.getTagName(this.items[i]);
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);

            if (ns !== NS.HTML) {
                continue;
            }

            if (tn === tagName) {
                return true;
            }

            if (tn !== $.OPTION && tn !== $.OPTGROUP) {
                return false;
            }
        }

        return true;
    }

    //Implied end tags
    generateImpliedEndTags() {
        while (isImpliedEndTagRequired(this.currentTagName)) {
            this.pop();
        }
    }

    generateImpliedEndTagsThoroughly() {
        while (isImpliedEndTagRequiredThoroughly(this.currentTagName)) {
            this.pop();
        }
    }

    generateImpliedEndTagsWithExclusion(exclusionTagName) {
        while (isImpliedEndTagRequired(this.currentTagName) && this.currentTagName !== exclusionTagName) {
            this.pop();
        }
    }
}

module.exports = OpenElementStack;

},{"../common/html":4}],18:[function(require,module,exports){
'use strict';

const defaultTreeAdapter = require('../tree-adapters/default');
const mergeOptions = require('../utils/merge-options');
const doctype = require('../common/doctype');
const HTML = require('../common/html');

//Aliases
const $ = HTML.TAG_NAMES;
const NS = HTML.NAMESPACES;

//Default serializer options
const DEFAULT_OPTIONS = {
    treeAdapter: defaultTreeAdapter
};

//Escaping regexes
const AMP_REGEX = /&/g;
const NBSP_REGEX = /\u00a0/g;
const DOUBLE_QUOTE_REGEX = /"/g;
const LT_REGEX = /</g;
const GT_REGEX = />/g;

//Serializer
class Serializer {
    constructor(node, options) {
        this.options = mergeOptions(DEFAULT_OPTIONS, options);
        this.treeAdapter = this.options.treeAdapter;

        this.html = '';
        this.startNode = node;
    }

    //API
    serialize() {
        this._serializeChildNodes(this.startNode);

        return this.html;
    }

    //Internals
    _serializeChildNodes(parentNode) {
        const childNodes = this.treeAdapter.getChildNodes(parentNode);

        if (childNodes) {
            for (let i = 0, cnLength = childNodes.length; i < cnLength; i++) {
                const currentNode = childNodes[i];

                if (this.treeAdapter.isElementNode(currentNode)) {
                    this._serializeElement(currentNode);
                } else if (this.treeAdapter.isTextNode(currentNode)) {
                    this._serializeTextNode(currentNode);
                } else if (this.treeAdapter.isCommentNode(currentNode)) {
                    this._serializeCommentNode(currentNode);
                } else if (this.treeAdapter.isDocumentTypeNode(currentNode)) {
                    this._serializeDocumentTypeNode(currentNode);
                }
            }
        }
    }

    _serializeElement(node) {
        const tn = this.treeAdapter.getTagName(node);
        const ns = this.treeAdapter.getNamespaceURI(node);

        this.html += '<' + tn;
        this._serializeAttributes(node);
        this.html += '>';

        if (
            tn !== $.AREA &&
            tn !== $.BASE &&
            tn !== $.BASEFONT &&
            tn !== $.BGSOUND &&
            tn !== $.BR &&
            tn !== $.COL &&
            tn !== $.EMBED &&
            tn !== $.FRAME &&
            tn !== $.HR &&
            tn !== $.IMG &&
            tn !== $.INPUT &&
            tn !== $.KEYGEN &&
            tn !== $.LINK &&
            tn !== $.META &&
            tn !== $.PARAM &&
            tn !== $.SOURCE &&
            tn !== $.TRACK &&
            tn !== $.WBR
        ) {
            const childNodesHolder =
                tn === $.TEMPLATE && ns === NS.HTML ? this.treeAdapter.getTemplateContent(node) : node;

            this._serializeChildNodes(childNodesHolder);
            this.html += '</' + tn + '>';
        }
    }

    _serializeAttributes(node) {
        const attrs = this.treeAdapter.getAttrList(node);

        for (let i = 0, attrsLength = attrs.length; i < attrsLength; i++) {
            const attr = attrs[i];
            const value = Serializer.escapeString(attr.value, true);

            this.html += ' ';

            if (!attr.namespace) {
                this.html += attr.name;
            } else if (attr.namespace === NS.XML) {
                this.html += 'xml:' + attr.name;
            } else if (attr.namespace === NS.XMLNS) {
                if (attr.name !== 'xmlns') {
                    this.html += 'xmlns:';
                }

                this.html += attr.name;
            } else if (attr.namespace === NS.XLINK) {
                this.html += 'xlink:' + attr.name;
            } else {
                this.html += attr.prefix + ':' + attr.name;
            }

            this.html += '="' + value + '"';
        }
    }

    _serializeTextNode(node) {
        const content = this.treeAdapter.getTextNodeContent(node);
        const parent = this.treeAdapter.getParentNode(node);
        let parentTn = void 0;

        if (parent && this.treeAdapter.isElementNode(parent)) {
            parentTn = this.treeAdapter.getTagName(parent);
        }

        if (
            parentTn === $.STYLE ||
            parentTn === $.SCRIPT ||
            parentTn === $.XMP ||
            parentTn === $.IFRAME ||
            parentTn === $.NOEMBED ||
            parentTn === $.NOFRAMES ||
            parentTn === $.PLAINTEXT ||
            parentTn === $.NOSCRIPT
        ) {
            this.html += content;
        } else {
            this.html += Serializer.escapeString(content, false);
        }
    }

    _serializeCommentNode(node) {
        this.html += '<!--' + this.treeAdapter.getCommentNodeContent(node) + '-->';
    }

    _serializeDocumentTypeNode(node) {
        const name = this.treeAdapter.getDocumentTypeNodeName(node);

        this.html += '<' + doctype.serializeContent(name, null, null) + '>';
    }
}

// NOTE: used in tests and by rewriting stream
Serializer.escapeString = function(str, attrMode) {
    str = str.replace(AMP_REGEX, '&amp;').replace(NBSP_REGEX, '&nbsp;');

    if (attrMode) {
        str = str.replace(DOUBLE_QUOTE_REGEX, '&quot;');
    } else {
        str = str.replace(LT_REGEX, '&lt;').replace(GT_REGEX, '&gt;');
    }

    return str;
};

module.exports = Serializer;

},{"../common/doctype":1,"../common/html":4,"../tree-adapters/default":22,"../utils/merge-options":23}],19:[function(require,module,exports){
'use strict';

const Preprocessor = require('./preprocessor');
const unicode = require('../common/unicode');
const neTree = require('./named-entity-data');
const ERR = require('../common/error-codes');

//Aliases
const $ = unicode.CODE_POINTS;
const $$ = unicode.CODE_POINT_SEQUENCES;

//C1 Unicode control character reference replacements
const C1_CONTROLS_REFERENCE_REPLACEMENTS = {
    0x80: 0x20ac,
    0x82: 0x201a,
    0x83: 0x0192,
    0x84: 0x201e,
    0x85: 0x2026,
    0x86: 0x2020,
    0x87: 0x2021,
    0x88: 0x02c6,
    0x89: 0x2030,
    0x8a: 0x0160,
    0x8b: 0x2039,
    0x8c: 0x0152,
    0x8e: 0x017d,
    0x91: 0x2018,
    0x92: 0x2019,
    0x93: 0x201c,
    0x94: 0x201d,
    0x95: 0x2022,
    0x96: 0x2013,
    0x97: 0x2014,
    0x98: 0x02dc,
    0x99: 0x2122,
    0x9a: 0x0161,
    0x9b: 0x203a,
    0x9c: 0x0153,
    0x9e: 0x017e,
    0x9f: 0x0178
};

// Named entity tree flags
const HAS_DATA_FLAG = 1 << 0;
const DATA_DUPLET_FLAG = 1 << 1;
const HAS_BRANCHES_FLAG = 1 << 2;
const MAX_BRANCH_MARKER_VALUE = HAS_DATA_FLAG | DATA_DUPLET_FLAG | HAS_BRANCHES_FLAG;

//States
const DATA_STATE = 'DATA_STATE';
const RCDATA_STATE = 'RCDATA_STATE';
const RAWTEXT_STATE = 'RAWTEXT_STATE';
const SCRIPT_DATA_STATE = 'SCRIPT_DATA_STATE';
const PLAINTEXT_STATE = 'PLAINTEXT_STATE';
const TAG_OPEN_STATE = 'TAG_OPEN_STATE';
const END_TAG_OPEN_STATE = 'END_TAG_OPEN_STATE';
const TAG_NAME_STATE = 'TAG_NAME_STATE';
const RCDATA_LESS_THAN_SIGN_STATE = 'RCDATA_LESS_THAN_SIGN_STATE';
const RCDATA_END_TAG_OPEN_STATE = 'RCDATA_END_TAG_OPEN_STATE';
const RCDATA_END_TAG_NAME_STATE = 'RCDATA_END_TAG_NAME_STATE';
const RAWTEXT_LESS_THAN_SIGN_STATE = 'RAWTEXT_LESS_THAN_SIGN_STATE';
const RAWTEXT_END_TAG_OPEN_STATE = 'RAWTEXT_END_TAG_OPEN_STATE';
const RAWTEXT_END_TAG_NAME_STATE = 'RAWTEXT_END_TAG_NAME_STATE';
const SCRIPT_DATA_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_LESS_THAN_SIGN_STATE';
const SCRIPT_DATA_END_TAG_OPEN_STATE = 'SCRIPT_DATA_END_TAG_OPEN_STATE';
const SCRIPT_DATA_END_TAG_NAME_STATE = 'SCRIPT_DATA_END_TAG_NAME_STATE';
const SCRIPT_DATA_ESCAPE_START_STATE = 'SCRIPT_DATA_ESCAPE_START_STATE';
const SCRIPT_DATA_ESCAPE_START_DASH_STATE = 'SCRIPT_DATA_ESCAPE_START_DASH_STATE';
const SCRIPT_DATA_ESCAPED_STATE = 'SCRIPT_DATA_ESCAPED_STATE';
const SCRIPT_DATA_ESCAPED_DASH_STATE = 'SCRIPT_DATA_ESCAPED_DASH_STATE';
const SCRIPT_DATA_ESCAPED_DASH_DASH_STATE = 'SCRIPT_DATA_ESCAPED_DASH_DASH_STATE';
const SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE';
const SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE = 'SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE';
const SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE = 'SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE';
const SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE';
const SCRIPT_DATA_DOUBLE_ESCAPED_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_STATE';
const SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE';
const SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE';
const SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE';
const SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE = 'SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE';
const BEFORE_ATTRIBUTE_NAME_STATE = 'BEFORE_ATTRIBUTE_NAME_STATE';
const ATTRIBUTE_NAME_STATE = 'ATTRIBUTE_NAME_STATE';
const AFTER_ATTRIBUTE_NAME_STATE = 'AFTER_ATTRIBUTE_NAME_STATE';
const BEFORE_ATTRIBUTE_VALUE_STATE = 'BEFORE_ATTRIBUTE_VALUE_STATE';
const ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE = 'ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE';
const ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE = 'ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE';
const ATTRIBUTE_VALUE_UNQUOTED_STATE = 'ATTRIBUTE_VALUE_UNQUOTED_STATE';
const AFTER_ATTRIBUTE_VALUE_QUOTED_STATE = 'AFTER_ATTRIBUTE_VALUE_QUOTED_STATE';
const SELF_CLOSING_START_TAG_STATE = 'SELF_CLOSING_START_TAG_STATE';
const BOGUS_COMMENT_STATE = 'BOGUS_COMMENT_STATE';
const MARKUP_DECLARATION_OPEN_STATE = 'MARKUP_DECLARATION_OPEN_STATE';
const COMMENT_START_STATE = 'COMMENT_START_STATE';
const COMMENT_START_DASH_STATE = 'COMMENT_START_DASH_STATE';
const COMMENT_STATE = 'COMMENT_STATE';
const COMMENT_LESS_THAN_SIGN_STATE = 'COMMENT_LESS_THAN_SIGN_STATE';
const COMMENT_LESS_THAN_SIGN_BANG_STATE = 'COMMENT_LESS_THAN_SIGN_BANG_STATE';
const COMMENT_LESS_THAN_SIGN_BANG_DASH_STATE = 'COMMENT_LESS_THAN_SIGN_BANG_DASH_STATE';
const COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH_STATE = 'COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH_STATE';
const COMMENT_END_DASH_STATE = 'COMMENT_END_DASH_STATE';
const COMMENT_END_STATE = 'COMMENT_END_STATE';
const COMMENT_END_BANG_STATE = 'COMMENT_END_BANG_STATE';
const DOCTYPE_STATE = 'DOCTYPE_STATE';
const BEFORE_DOCTYPE_NAME_STATE = 'BEFORE_DOCTYPE_NAME_STATE';
const DOCTYPE_NAME_STATE = 'DOCTYPE_NAME_STATE';
const AFTER_DOCTYPE_NAME_STATE = 'AFTER_DOCTYPE_NAME_STATE';
const AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE = 'AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE';
const BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE = 'BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE';
const DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE = 'DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE';
const DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE = 'DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE';
const AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE = 'AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE';
const BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE = 'BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE';
const AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE = 'AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE';
const BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE = 'BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE';
const DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE = 'DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE';
const DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE = 'DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE';
const AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE = 'AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE';
const BOGUS_DOCTYPE_STATE = 'BOGUS_DOCTYPE_STATE';
const CDATA_SECTION_STATE = 'CDATA_SECTION_STATE';
const CDATA_SECTION_BRACKET_STATE = 'CDATA_SECTION_BRACKET_STATE';
const CDATA_SECTION_END_STATE = 'CDATA_SECTION_END_STATE';
const CHARACTER_REFERENCE_STATE = 'CHARACTER_REFERENCE_STATE';
const NAMED_CHARACTER_REFERENCE_STATE = 'NAMED_CHARACTER_REFERENCE_STATE';
const AMBIGUOUS_AMPERSAND_STATE = 'AMBIGUOS_AMPERSAND_STATE';
const NUMERIC_CHARACTER_REFERENCE_STATE = 'NUMERIC_CHARACTER_REFERENCE_STATE';
const HEXADEMICAL_CHARACTER_REFERENCE_START_STATE = 'HEXADEMICAL_CHARACTER_REFERENCE_START_STATE';
const DECIMAL_CHARACTER_REFERENCE_START_STATE = 'DECIMAL_CHARACTER_REFERENCE_START_STATE';
const HEXADEMICAL_CHARACTER_REFERENCE_STATE = 'HEXADEMICAL_CHARACTER_REFERENCE_STATE';
const DECIMAL_CHARACTER_REFERENCE_STATE = 'DECIMAL_CHARACTER_REFERENCE_STATE';
const NUMERIC_CHARACTER_REFERENCE_END_STATE = 'NUMERIC_CHARACTER_REFERENCE_END_STATE';

//Utils

//OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
//this functions if they will be situated in another module due to context switch.
//Always perform inlining check before modifying this functions ('node --trace-inlining').
function isWhitespace(cp) {
    return cp === $.SPACE || cp === $.LINE_FEED || cp === $.TABULATION || cp === $.FORM_FEED;
}

function isAsciiDigit(cp) {
    return cp >= $.DIGIT_0 && cp <= $.DIGIT_9;
}

function isAsciiUpper(cp) {
    return cp >= $.LATIN_CAPITAL_A && cp <= $.LATIN_CAPITAL_Z;
}

function isAsciiLower(cp) {
    return cp >= $.LATIN_SMALL_A && cp <= $.LATIN_SMALL_Z;
}

function isAsciiLetter(cp) {
    return isAsciiLower(cp) || isAsciiUpper(cp);
}

function isAsciiAlphaNumeric(cp) {
    return isAsciiLetter(cp) || isAsciiDigit(cp);
}

function isAsciiUpperHexDigit(cp) {
    return cp >= $.LATIN_CAPITAL_A && cp <= $.LATIN_CAPITAL_F;
}

function isAsciiLowerHexDigit(cp) {
    return cp >= $.LATIN_SMALL_A && cp <= $.LATIN_SMALL_F;
}

function isAsciiHexDigit(cp) {
    return isAsciiDigit(cp) || isAsciiUpperHexDigit(cp) || isAsciiLowerHexDigit(cp);
}

function toAsciiLowerCodePoint(cp) {
    return cp + 0x0020;
}

//NOTE: String.fromCharCode() function can handle only characters from BMP subset.
//So, we need to workaround this manually.
//(see: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String/fromCharCode#Getting_it_to_work_with_higher_values)
function toChar(cp) {
    if (cp <= 0xffff) {
        return String.fromCharCode(cp);
    }

    cp -= 0x10000;
    return String.fromCharCode(((cp >>> 10) & 0x3ff) | 0xd800) + String.fromCharCode(0xdc00 | (cp & 0x3ff));
}

function toAsciiLowerChar(cp) {
    return String.fromCharCode(toAsciiLowerCodePoint(cp));
}

function findNamedEntityTreeBranch(nodeIx, cp) {
    const branchCount = neTree[++nodeIx];
    let lo = ++nodeIx;
    let hi = lo + branchCount - 1;

    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const midCp = neTree[mid];

        if (midCp < cp) {
            lo = mid + 1;
        } else if (midCp > cp) {
            hi = mid - 1;
        } else {
            return neTree[mid + branchCount];
        }
    }

    return -1;
}

//Tokenizer
class Tokenizer {
    constructor() {
        this.preprocessor = new Preprocessor();

        this.tokenQueue = [];

        this.allowCDATA = false;

        this.state = DATA_STATE;
        this.returnState = '';

        this.charRefCode = -1;
        this.tempBuff = [];
        this.lastStartTagName = '';

        this.consumedAfterSnapshot = -1;
        this.active = false;

        this.currentCharacterToken = null;
        this.currentToken = null;
        this.currentAttr = null;
    }

    //Errors
    _err() {
        // NOTE: err reporting is noop by default. Enabled by mixin.
    }

    _errOnNextCodePoint(err) {
        this._consume();
        this._err(err);
        this._unconsume();
    }

    //API
    getNextToken() {
        while (!this.tokenQueue.length && this.active) {
            this.consumedAfterSnapshot = 0;

            const cp = this._consume();

            if (!this._ensureHibernation()) {
                this[this.state](cp);
            }
        }

        return this.tokenQueue.shift();
    }

    write(chunk, isLastChunk) {
        this.active = true;
        this.preprocessor.write(chunk, isLastChunk);
    }

    insertHtmlAtCurrentPos(chunk) {
        this.active = true;
        this.preprocessor.insertHtmlAtCurrentPos(chunk);
    }

    //Hibernation
    _ensureHibernation() {
        if (this.preprocessor.endOfChunkHit) {
            for (; this.consumedAfterSnapshot > 0; this.consumedAfterSnapshot--) {
                this.preprocessor.retreat();
            }

            this.active = false;
            this.tokenQueue.push({ type: Tokenizer.HIBERNATION_TOKEN });

            return true;
        }

        return false;
    }

    //Consumption
    _consume() {
        this.consumedAfterSnapshot++;
        return this.preprocessor.advance();
    }

    _unconsume() {
        this.consumedAfterSnapshot--;
        this.preprocessor.retreat();
    }

    _reconsumeInState(state) {
        this.state = state;
        this._unconsume();
    }

    _consumeSequenceIfMatch(pattern, startCp, caseSensitive) {
        let consumedCount = 0;
        let isMatch = true;
        const patternLength = pattern.length;
        let patternPos = 0;
        let cp = startCp;
        let patternCp = void 0;

        for (; patternPos < patternLength; patternPos++) {
            if (patternPos > 0) {
                cp = this._consume();
                consumedCount++;
            }

            if (cp === $.EOF) {
                isMatch = false;
                break;
            }

            patternCp = pattern[patternPos];

            if (cp !== patternCp && (caseSensitive || cp !== toAsciiLowerCodePoint(patternCp))) {
                isMatch = false;
                break;
            }
        }

        if (!isMatch) {
            while (consumedCount--) {
                this._unconsume();
            }
        }

        return isMatch;
    }

    //Temp buffer
    _isTempBufferEqualToScriptString() {
        if (this.tempBuff.length !== $$.SCRIPT_STRING.length) {
            return false;
        }

        for (let i = 0; i < this.tempBuff.length; i++) {
            if (this.tempBuff[i] !== $$.SCRIPT_STRING[i]) {
                return false;
            }
        }

        return true;
    }

    //Token creation
    _createStartTagToken() {
        this.currentToken = {
            type: Tokenizer.START_TAG_TOKEN,
            tagName: '',
            selfClosing: false,
            ackSelfClosing: false,
            attrs: []
        };
    }

    _createEndTagToken() {
        this.currentToken = {
            type: Tokenizer.END_TAG_TOKEN,
            tagName: '',
            selfClosing: false,
            attrs: []
        };
    }

    _createCommentToken() {
        this.currentToken = {
            type: Tokenizer.COMMENT_TOKEN,
            data: ''
        };
    }

    _createDoctypeToken(initialName) {
        this.currentToken = {
            type: Tokenizer.DOCTYPE_TOKEN,
            name: initialName,
            forceQuirks: false,
            publicId: null,
            systemId: null
        };
    }

    _createCharacterToken(type, ch) {
        this.currentCharacterToken = {
            type: type,
            chars: ch
        };
    }

    _createEOFToken() {
        this.currentToken = { type: Tokenizer.EOF_TOKEN };
    }

    //Tag attributes
    _createAttr(attrNameFirstCh) {
        this.currentAttr = {
            name: attrNameFirstCh,
            value: ''
        };
    }

    _leaveAttrName(toState) {
        if (Tokenizer.getTokenAttr(this.currentToken, this.currentAttr.name) === null) {
            this.currentToken.attrs.push(this.currentAttr);
        } else {
            this._err(ERR.duplicateAttribute);
        }

        this.state = toState;
    }

    _leaveAttrValue(toState) {
        this.state = toState;
    }

    //Token emission
    _emitCurrentToken() {
        this._emitCurrentCharacterToken();

        const ct = this.currentToken;

        this.currentToken = null;

        //NOTE: store emited start tag's tagName to determine is the following end tag token is appropriate.
        if (ct.type === Tokenizer.START_TAG_TOKEN) {
            this.lastStartTagName = ct.tagName;
        } else if (ct.type === Tokenizer.END_TAG_TOKEN) {
            if (ct.attrs.length > 0) {
                this._err(ERR.endTagWithAttributes);
            }

            if (ct.selfClosing) {
                this._err(ERR.endTagWithTrailingSolidus);
            }
        }

        this.tokenQueue.push(ct);
    }

    _emitCurrentCharacterToken() {
        if (this.currentCharacterToken) {
            this.tokenQueue.push(this.currentCharacterToken);
            this.currentCharacterToken = null;
        }
    }

    _emitEOFToken() {
        this._createEOFToken();
        this._emitCurrentToken();
    }

    //Characters emission

    //OPTIMIZATION: specification uses only one type of character tokens (one token per character).
    //This causes a huge memory overhead and a lot of unnecessary parser loops. parse5 uses 3 groups of characters.
    //If we have a sequence of characters that belong to the same group, parser can process it
    //as a single solid character token.
    //So, there are 3 types of character tokens in parse5:
    //1)NULL_CHARACTER_TOKEN - \u0000-character sequences (e.g. '\u0000\u0000\u0000')
    //2)WHITESPACE_CHARACTER_TOKEN - any whitespace/new-line character sequences (e.g. '\n  \r\t   \f')
    //3)CHARACTER_TOKEN - any character sequence which don't belong to groups 1 and 2 (e.g. 'abcdef1234@@#$%^')
    _appendCharToCurrentCharacterToken(type, ch) {
        if (this.currentCharacterToken && this.currentCharacterToken.type !== type) {
            this._emitCurrentCharacterToken();
        }

        if (this.currentCharacterToken) {
            this.currentCharacterToken.chars += ch;
        } else {
            this._createCharacterToken(type, ch);
        }
    }

    _emitCodePoint(cp) {
        let type = Tokenizer.CHARACTER_TOKEN;

        if (isWhitespace(cp)) {
            type = Tokenizer.WHITESPACE_CHARACTER_TOKEN;
        } else if (cp === $.NULL) {
            type = Tokenizer.NULL_CHARACTER_TOKEN;
        }

        this._appendCharToCurrentCharacterToken(type, toChar(cp));
    }

    _emitSeveralCodePoints(codePoints) {
        for (let i = 0; i < codePoints.length; i++) {
            this._emitCodePoint(codePoints[i]);
        }
    }

    //NOTE: used then we emit character explicitly. This is always a non-whitespace and a non-null character.
    //So we can avoid additional checks here.
    _emitChars(ch) {
        this._appendCharToCurrentCharacterToken(Tokenizer.CHARACTER_TOKEN, ch);
    }

    // Character reference helpers
    _matchNamedCharacterReference(startCp) {
        let result = null;
        let excess = 1;
        let i = findNamedEntityTreeBranch(0, startCp);

        this.tempBuff.push(startCp);

        while (i > -1) {
            const current = neTree[i];
            const inNode = current < MAX_BRANCH_MARKER_VALUE;
            const nodeWithData = inNode && current & HAS_DATA_FLAG;

            if (nodeWithData) {
                //NOTE: we use greedy search, so we continue lookup at this point
                result = current & DATA_DUPLET_FLAG ? [neTree[++i], neTree[++i]] : [neTree[++i]];
                excess = 0;
            }

            const cp = this._consume();

            this.tempBuff.push(cp);
            excess++;

            if (cp === $.EOF) {
                break;
            }

            if (inNode) {
                i = current & HAS_BRANCHES_FLAG ? findNamedEntityTreeBranch(i, cp) : -1;
            } else {
                i = cp === current ? ++i : -1;
            }
        }

        while (excess--) {
            this.tempBuff.pop();
            this._unconsume();
        }

        return result;
    }

    _isCharacterReferenceInAttribute() {
        return (
            this.returnState === ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE ||
            this.returnState === ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE ||
            this.returnState === ATTRIBUTE_VALUE_UNQUOTED_STATE
        );
    }

    _isCharacterReferenceAttributeQuirk(withSemicolon) {
        if (!withSemicolon && this._isCharacterReferenceInAttribute()) {
            const nextCp = this._consume();

            this._unconsume();

            return nextCp === $.EQUALS_SIGN || isAsciiAlphaNumeric(nextCp);
        }

        return false;
    }

    _flushCodePointsConsumedAsCharacterReference() {
        if (this._isCharacterReferenceInAttribute()) {
            for (let i = 0; i < this.tempBuff.length; i++) {
                this.currentAttr.value += toChar(this.tempBuff[i]);
            }
        } else {
            this._emitSeveralCodePoints(this.tempBuff);
        }

        this.tempBuff = [];
    }

    // State machine

    // Data state
    //------------------------------------------------------------------
    [DATA_STATE](cp) {
        this.preprocessor.dropParsedChunk();

        if (cp === $.LESS_THAN_SIGN) {
            this.state = TAG_OPEN_STATE;
        } else if (cp === $.AMPERSAND) {
            this.returnState = DATA_STATE;
            this.state = CHARACTER_REFERENCE_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this._emitCodePoint(cp);
        } else if (cp === $.EOF) {
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    //  RCDATA state
    //------------------------------------------------------------------
    [RCDATA_STATE](cp) {
        this.preprocessor.dropParsedChunk();

        if (cp === $.AMPERSAND) {
            this.returnState = RCDATA_STATE;
            this.state = CHARACTER_REFERENCE_STATE;
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = RCDATA_LESS_THAN_SIGN_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // RAWTEXT state
    //------------------------------------------------------------------
    [RAWTEXT_STATE](cp) {
        this.preprocessor.dropParsedChunk();

        if (cp === $.LESS_THAN_SIGN) {
            this.state = RAWTEXT_LESS_THAN_SIGN_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // Script data state
    //------------------------------------------------------------------
    [SCRIPT_DATA_STATE](cp) {
        this.preprocessor.dropParsedChunk();

        if (cp === $.LESS_THAN_SIGN) {
            this.state = SCRIPT_DATA_LESS_THAN_SIGN_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // PLAINTEXT state
    //------------------------------------------------------------------
    [PLAINTEXT_STATE](cp) {
        this.preprocessor.dropParsedChunk();

        if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // Tag open state
    //------------------------------------------------------------------
    [TAG_OPEN_STATE](cp) {
        if (cp === $.EXCLAMATION_MARK) {
            this.state = MARKUP_DECLARATION_OPEN_STATE;
        } else if (cp === $.SOLIDUS) {
            this.state = END_TAG_OPEN_STATE;
        } else if (isAsciiLetter(cp)) {
            this._createStartTagToken();
            this._reconsumeInState(TAG_NAME_STATE);
        } else if (cp === $.QUESTION_MARK) {
            this._err(ERR.unexpectedQuestionMarkInsteadOfTagName);
            this._createCommentToken();
            this._reconsumeInState(BOGUS_COMMENT_STATE);
        } else if (cp === $.EOF) {
            this._err(ERR.eofBeforeTagName);
            this._emitChars('<');
            this._emitEOFToken();
        } else {
            this._err(ERR.invalidFirstCharacterOfTagName);
            this._emitChars('<');
            this._reconsumeInState(DATA_STATE);
        }
    }

    // End tag open state
    //------------------------------------------------------------------
    [END_TAG_OPEN_STATE](cp) {
        if (isAsciiLetter(cp)) {
            this._createEndTagToken();
            this._reconsumeInState(TAG_NAME_STATE);
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.missingEndTagName);
            this.state = DATA_STATE;
        } else if (cp === $.EOF) {
            this._err(ERR.eofBeforeTagName);
            this._emitChars('</');
            this._emitEOFToken();
        } else {
            this._err(ERR.invalidFirstCharacterOfTagName);
            this._createCommentToken();
            this._reconsumeInState(BOGUS_COMMENT_STATE);
        }
    }

    // Tag name state
    //------------------------------------------------------------------
    [TAG_NAME_STATE](cp) {
        if (isWhitespace(cp)) {
            this.state = BEFORE_ATTRIBUTE_NAME_STATE;
        } else if (cp === $.SOLIDUS) {
            this.state = SELF_CLOSING_START_TAG_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (isAsciiUpper(cp)) {
            this.currentToken.tagName += toAsciiLowerChar(cp);
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.currentToken.tagName += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this.currentToken.tagName += toChar(cp);
        }
    }

    // RCDATA less-than sign state
    //------------------------------------------------------------------
    [RCDATA_LESS_THAN_SIGN_STATE](cp) {
        if (cp === $.SOLIDUS) {
            this.tempBuff = [];
            this.state = RCDATA_END_TAG_OPEN_STATE;
        } else {
            this._emitChars('<');
            this._reconsumeInState(RCDATA_STATE);
        }
    }

    // RCDATA end tag open state
    //------------------------------------------------------------------
    [RCDATA_END_TAG_OPEN_STATE](cp) {
        if (isAsciiLetter(cp)) {
            this._createEndTagToken();
            this._reconsumeInState(RCDATA_END_TAG_NAME_STATE);
        } else {
            this._emitChars('</');
            this._reconsumeInState(RCDATA_STATE);
        }
    }

    // RCDATA end tag name state
    //------------------------------------------------------------------
    [RCDATA_END_TAG_NAME_STATE](cp) {
        if (isAsciiUpper(cp)) {
            this.currentToken.tagName += toAsciiLowerChar(cp);
            this.tempBuff.push(cp);
        } else if (isAsciiLower(cp)) {
            this.currentToken.tagName += toChar(cp);
            this.tempBuff.push(cp);
        } else {
            if (this.lastStartTagName === this.currentToken.tagName) {
                if (isWhitespace(cp)) {
                    this.state = BEFORE_ATTRIBUTE_NAME_STATE;
                    return;
                }

                if (cp === $.SOLIDUS) {
                    this.state = SELF_CLOSING_START_TAG_STATE;
                    return;
                }

                if (cp === $.GREATER_THAN_SIGN) {
                    this.state = DATA_STATE;
                    this._emitCurrentToken();
                    return;
                }
            }

            this._emitChars('</');
            this._emitSeveralCodePoints(this.tempBuff);
            this._reconsumeInState(RCDATA_STATE);
        }
    }

    // RAWTEXT less-than sign state
    //------------------------------------------------------------------
    [RAWTEXT_LESS_THAN_SIGN_STATE](cp) {
        if (cp === $.SOLIDUS) {
            this.tempBuff = [];
            this.state = RAWTEXT_END_TAG_OPEN_STATE;
        } else {
            this._emitChars('<');
            this._reconsumeInState(RAWTEXT_STATE);
        }
    }

    // RAWTEXT end tag open state
    //------------------------------------------------------------------
    [RAWTEXT_END_TAG_OPEN_STATE](cp) {
        if (isAsciiLetter(cp)) {
            this._createEndTagToken();
            this._reconsumeInState(RAWTEXT_END_TAG_NAME_STATE);
        } else {
            this._emitChars('</');
            this._reconsumeInState(RAWTEXT_STATE);
        }
    }

    // RAWTEXT end tag name state
    //------------------------------------------------------------------
    [RAWTEXT_END_TAG_NAME_STATE](cp) {
        if (isAsciiUpper(cp)) {
            this.currentToken.tagName += toAsciiLowerChar(cp);
            this.tempBuff.push(cp);
        } else if (isAsciiLower(cp)) {
            this.currentToken.tagName += toChar(cp);
            this.tempBuff.push(cp);
        } else {
            if (this.lastStartTagName === this.currentToken.tagName) {
                if (isWhitespace(cp)) {
                    this.state = BEFORE_ATTRIBUTE_NAME_STATE;
                    return;
                }

                if (cp === $.SOLIDUS) {
                    this.state = SELF_CLOSING_START_TAG_STATE;
                    return;
                }

                if (cp === $.GREATER_THAN_SIGN) {
                    this._emitCurrentToken();
                    this.state = DATA_STATE;
                    return;
                }
            }

            this._emitChars('</');
            this._emitSeveralCodePoints(this.tempBuff);
            this._reconsumeInState(RAWTEXT_STATE);
        }
    }

    // Script data less-than sign state
    //------------------------------------------------------------------
    [SCRIPT_DATA_LESS_THAN_SIGN_STATE](cp) {
        if (cp === $.SOLIDUS) {
            this.tempBuff = [];
            this.state = SCRIPT_DATA_END_TAG_OPEN_STATE;
        } else if (cp === $.EXCLAMATION_MARK) {
            this.state = SCRIPT_DATA_ESCAPE_START_STATE;
            this._emitChars('<!');
        } else {
            this._emitChars('<');
            this._reconsumeInState(SCRIPT_DATA_STATE);
        }
    }

    // Script data end tag open state
    //------------------------------------------------------------------
    [SCRIPT_DATA_END_TAG_OPEN_STATE](cp) {
        if (isAsciiLetter(cp)) {
            this._createEndTagToken();
            this._reconsumeInState(SCRIPT_DATA_END_TAG_NAME_STATE);
        } else {
            this._emitChars('</');
            this._reconsumeInState(SCRIPT_DATA_STATE);
        }
    }

    // Script data end tag name state
    //------------------------------------------------------------------
    [SCRIPT_DATA_END_TAG_NAME_STATE](cp) {
        if (isAsciiUpper(cp)) {
            this.currentToken.tagName += toAsciiLowerChar(cp);
            this.tempBuff.push(cp);
        } else if (isAsciiLower(cp)) {
            this.currentToken.tagName += toChar(cp);
            this.tempBuff.push(cp);
        } else {
            if (this.lastStartTagName === this.currentToken.tagName) {
                if (isWhitespace(cp)) {
                    this.state = BEFORE_ATTRIBUTE_NAME_STATE;
                    return;
                } else if (cp === $.SOLIDUS) {
                    this.state = SELF_CLOSING_START_TAG_STATE;
                    return;
                } else if (cp === $.GREATER_THAN_SIGN) {
                    this._emitCurrentToken();
                    this.state = DATA_STATE;
                    return;
                }
            }

            this._emitChars('</');
            this._emitSeveralCodePoints(this.tempBuff);
            this._reconsumeInState(SCRIPT_DATA_STATE);
        }
    }

    // Script data escape start state
    //------------------------------------------------------------------
    [SCRIPT_DATA_ESCAPE_START_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this.state = SCRIPT_DATA_ESCAPE_START_DASH_STATE;
            this._emitChars('-');
        } else {
            this._reconsumeInState(SCRIPT_DATA_STATE);
        }
    }

    // Script data escape start dash state
    //------------------------------------------------------------------
    [SCRIPT_DATA_ESCAPE_START_DASH_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this.state = SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
            this._emitChars('-');
        } else {
            this._reconsumeInState(SCRIPT_DATA_STATE);
        }
    }

    // Script data escaped state
    //------------------------------------------------------------------
    [SCRIPT_DATA_ESCAPED_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this.state = SCRIPT_DATA_ESCAPED_DASH_STATE;
            this._emitChars('-');
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._err(ERR.eofInScriptHtmlCommentLikeText);
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // Script data escaped dash state
    //------------------------------------------------------------------
    [SCRIPT_DATA_ESCAPED_DASH_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this.state = SCRIPT_DATA_ESCAPED_DASH_DASH_STATE;
            this._emitChars('-');
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.state = SCRIPT_DATA_ESCAPED_STATE;
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._err(ERR.eofInScriptHtmlCommentLikeText);
            this._emitEOFToken();
        } else {
            this.state = SCRIPT_DATA_ESCAPED_STATE;
            this._emitCodePoint(cp);
        }
    }

    // Script data escaped dash dash state
    //------------------------------------------------------------------
    [SCRIPT_DATA_ESCAPED_DASH_DASH_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this._emitChars('-');
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.state = SCRIPT_DATA_STATE;
            this._emitChars('>');
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.state = SCRIPT_DATA_ESCAPED_STATE;
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._err(ERR.eofInScriptHtmlCommentLikeText);
            this._emitEOFToken();
        } else {
            this.state = SCRIPT_DATA_ESCAPED_STATE;
            this._emitCodePoint(cp);
        }
    }

    // Script data escaped less-than sign state
    //------------------------------------------------------------------
    [SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN_STATE](cp) {
        if (cp === $.SOLIDUS) {
            this.tempBuff = [];
            this.state = SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE;
        } else if (isAsciiLetter(cp)) {
            this.tempBuff = [];
            this._emitChars('<');
            this._reconsumeInState(SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE);
        } else {
            this._emitChars('<');
            this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
        }
    }

    // Script data escaped end tag open state
    //------------------------------------------------------------------
    [SCRIPT_DATA_ESCAPED_END_TAG_OPEN_STATE](cp) {
        if (isAsciiLetter(cp)) {
            this._createEndTagToken();
            this._reconsumeInState(SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE);
        } else {
            this._emitChars('</');
            this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
        }
    }

    // Script data escaped end tag name state
    //------------------------------------------------------------------
    [SCRIPT_DATA_ESCAPED_END_TAG_NAME_STATE](cp) {
        if (isAsciiUpper(cp)) {
            this.currentToken.tagName += toAsciiLowerChar(cp);
            this.tempBuff.push(cp);
        } else if (isAsciiLower(cp)) {
            this.currentToken.tagName += toChar(cp);
            this.tempBuff.push(cp);
        } else {
            if (this.lastStartTagName === this.currentToken.tagName) {
                if (isWhitespace(cp)) {
                    this.state = BEFORE_ATTRIBUTE_NAME_STATE;
                    return;
                }

                if (cp === $.SOLIDUS) {
                    this.state = SELF_CLOSING_START_TAG_STATE;
                    return;
                }

                if (cp === $.GREATER_THAN_SIGN) {
                    this._emitCurrentToken();
                    this.state = DATA_STATE;
                    return;
                }
            }

            this._emitChars('</');
            this._emitSeveralCodePoints(this.tempBuff);
            this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
        }
    }

    // Script data double escape start state
    //------------------------------------------------------------------
    [SCRIPT_DATA_DOUBLE_ESCAPE_START_STATE](cp) {
        if (isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN) {
            this.state = this._isTempBufferEqualToScriptString()
                ? SCRIPT_DATA_DOUBLE_ESCAPED_STATE
                : SCRIPT_DATA_ESCAPED_STATE;
            this._emitCodePoint(cp);
        } else if (isAsciiUpper(cp)) {
            this.tempBuff.push(toAsciiLowerCodePoint(cp));
            this._emitCodePoint(cp);
        } else if (isAsciiLower(cp)) {
            this.tempBuff.push(cp);
            this._emitCodePoint(cp);
        } else {
            this._reconsumeInState(SCRIPT_DATA_ESCAPED_STATE);
        }
    }

    // Script data double escaped state
    //------------------------------------------------------------------
    [SCRIPT_DATA_DOUBLE_ESCAPED_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this.state = SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE;
            this._emitChars('-');
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
            this._emitChars('<');
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._err(ERR.eofInScriptHtmlCommentLikeText);
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // Script data double escaped dash state
    //------------------------------------------------------------------
    [SCRIPT_DATA_DOUBLE_ESCAPED_DASH_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this.state = SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE;
            this._emitChars('-');
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
            this._emitChars('<');
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._err(ERR.eofInScriptHtmlCommentLikeText);
            this._emitEOFToken();
        } else {
            this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
            this._emitCodePoint(cp);
        }
    }

    // Script data double escaped dash dash state
    //------------------------------------------------------------------
    [SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this._emitChars('-');
        } else if (cp === $.LESS_THAN_SIGN) {
            this.state = SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE;
            this._emitChars('<');
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.state = SCRIPT_DATA_STATE;
            this._emitChars('>');
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
            this._emitChars(unicode.REPLACEMENT_CHARACTER);
        } else if (cp === $.EOF) {
            this._err(ERR.eofInScriptHtmlCommentLikeText);
            this._emitEOFToken();
        } else {
            this.state = SCRIPT_DATA_DOUBLE_ESCAPED_STATE;
            this._emitCodePoint(cp);
        }
    }

    // Script data double escaped less-than sign state
    //------------------------------------------------------------------
    [SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN_STATE](cp) {
        if (cp === $.SOLIDUS) {
            this.tempBuff = [];
            this.state = SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE;
            this._emitChars('/');
        } else {
            this._reconsumeInState(SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
        }
    }

    // Script data double escape end state
    //------------------------------------------------------------------
    [SCRIPT_DATA_DOUBLE_ESCAPE_END_STATE](cp) {
        if (isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN) {
            this.state = this._isTempBufferEqualToScriptString()
                ? SCRIPT_DATA_ESCAPED_STATE
                : SCRIPT_DATA_DOUBLE_ESCAPED_STATE;

            this._emitCodePoint(cp);
        } else if (isAsciiUpper(cp)) {
            this.tempBuff.push(toAsciiLowerCodePoint(cp));
            this._emitCodePoint(cp);
        } else if (isAsciiLower(cp)) {
            this.tempBuff.push(cp);
            this._emitCodePoint(cp);
        } else {
            this._reconsumeInState(SCRIPT_DATA_DOUBLE_ESCAPED_STATE);
        }
    }

    // Before attribute name state
    //------------------------------------------------------------------
    [BEFORE_ATTRIBUTE_NAME_STATE](cp) {
        if (isWhitespace(cp)) {
            return;
        }

        if (cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN || cp === $.EOF) {
            this._reconsumeInState(AFTER_ATTRIBUTE_NAME_STATE);
        } else if (cp === $.EQUALS_SIGN) {
            this._err(ERR.unexpectedEqualsSignBeforeAttributeName);
            this._createAttr('=');
            this.state = ATTRIBUTE_NAME_STATE;
        } else {
            this._createAttr('');
            this._reconsumeInState(ATTRIBUTE_NAME_STATE);
        }
    }

    // Attribute name state
    //------------------------------------------------------------------
    [ATTRIBUTE_NAME_STATE](cp) {
        if (isWhitespace(cp) || cp === $.SOLIDUS || cp === $.GREATER_THAN_SIGN || cp === $.EOF) {
            this._leaveAttrName(AFTER_ATTRIBUTE_NAME_STATE);
            this._unconsume();
        } else if (cp === $.EQUALS_SIGN) {
            this._leaveAttrName(BEFORE_ATTRIBUTE_VALUE_STATE);
        } else if (isAsciiUpper(cp)) {
            this.currentAttr.name += toAsciiLowerChar(cp);
        } else if (cp === $.QUOTATION_MARK || cp === $.APOSTROPHE || cp === $.LESS_THAN_SIGN) {
            this._err(ERR.unexpectedCharacterInAttributeName);
            this.currentAttr.name += toChar(cp);
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.currentAttr.name += unicode.REPLACEMENT_CHARACTER;
        } else {
            this.currentAttr.name += toChar(cp);
        }
    }

    // After attribute name state
    //------------------------------------------------------------------
    [AFTER_ATTRIBUTE_NAME_STATE](cp) {
        if (isWhitespace(cp)) {
            return;
        }

        if (cp === $.SOLIDUS) {
            this.state = SELF_CLOSING_START_TAG_STATE;
        } else if (cp === $.EQUALS_SIGN) {
            this.state = BEFORE_ATTRIBUTE_VALUE_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (cp === $.EOF) {
            this._err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this._createAttr('');
            this._reconsumeInState(ATTRIBUTE_NAME_STATE);
        }
    }

    // Before attribute value state
    //------------------------------------------------------------------
    [BEFORE_ATTRIBUTE_VALUE_STATE](cp) {
        if (isWhitespace(cp)) {
            return;
        }

        if (cp === $.QUOTATION_MARK) {
            this.state = ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this.state = ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.missingAttributeValue);
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else {
            this._reconsumeInState(ATTRIBUTE_VALUE_UNQUOTED_STATE);
        }
    }

    // Attribute value (double-quoted) state
    //------------------------------------------------------------------
    [ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE](cp) {
        if (cp === $.QUOTATION_MARK) {
            this.state = AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;
        } else if (cp === $.AMPERSAND) {
            this.returnState = ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE;
            this.state = CHARACTER_REFERENCE_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.currentAttr.value += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this.currentAttr.value += toChar(cp);
        }
    }

    // Attribute value (single-quoted) state
    //------------------------------------------------------------------
    [ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE](cp) {
        if (cp === $.APOSTROPHE) {
            this.state = AFTER_ATTRIBUTE_VALUE_QUOTED_STATE;
        } else if (cp === $.AMPERSAND) {
            this.returnState = ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE;
            this.state = CHARACTER_REFERENCE_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.currentAttr.value += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this.currentAttr.value += toChar(cp);
        }
    }

    // Attribute value (unquoted) state
    //------------------------------------------------------------------
    [ATTRIBUTE_VALUE_UNQUOTED_STATE](cp) {
        if (isWhitespace(cp)) {
            this._leaveAttrValue(BEFORE_ATTRIBUTE_NAME_STATE);
        } else if (cp === $.AMPERSAND) {
            this.returnState = ATTRIBUTE_VALUE_UNQUOTED_STATE;
            this.state = CHARACTER_REFERENCE_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._leaveAttrValue(DATA_STATE);
            this._emitCurrentToken();
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.currentAttr.value += unicode.REPLACEMENT_CHARACTER;
        } else if (
            cp === $.QUOTATION_MARK ||
            cp === $.APOSTROPHE ||
            cp === $.LESS_THAN_SIGN ||
            cp === $.EQUALS_SIGN ||
            cp === $.GRAVE_ACCENT
        ) {
            this._err(ERR.unexpectedCharacterInUnquotedAttributeValue);
            this.currentAttr.value += toChar(cp);
        } else if (cp === $.EOF) {
            this._err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this.currentAttr.value += toChar(cp);
        }
    }

    // After attribute value (quoted) state
    //------------------------------------------------------------------
    [AFTER_ATTRIBUTE_VALUE_QUOTED_STATE](cp) {
        if (isWhitespace(cp)) {
            this._leaveAttrValue(BEFORE_ATTRIBUTE_NAME_STATE);
        } else if (cp === $.SOLIDUS) {
            this._leaveAttrValue(SELF_CLOSING_START_TAG_STATE);
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._leaveAttrValue(DATA_STATE);
            this._emitCurrentToken();
        } else if (cp === $.EOF) {
            this._err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this._err(ERR.missingWhitespaceBetweenAttributes);
            this._reconsumeInState(BEFORE_ATTRIBUTE_NAME_STATE);
        }
    }

    // Self-closing start tag state
    //------------------------------------------------------------------
    [SELF_CLOSING_START_TAG_STATE](cp) {
        if (cp === $.GREATER_THAN_SIGN) {
            this.currentToken.selfClosing = true;
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (cp === $.EOF) {
            this._err(ERR.eofInTag);
            this._emitEOFToken();
        } else {
            this._err(ERR.unexpectedSolidusInTag);
            this._reconsumeInState(BEFORE_ATTRIBUTE_NAME_STATE);
        }
    }

    // Bogus comment state
    //------------------------------------------------------------------
    [BOGUS_COMMENT_STATE](cp) {
        if (cp === $.GREATER_THAN_SIGN) {
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (cp === $.EOF) {
            this._emitCurrentToken();
            this._emitEOFToken();
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.currentToken.data += unicode.REPLACEMENT_CHARACTER;
        } else {
            this.currentToken.data += toChar(cp);
        }
    }

    // Markup declaration open state
    //------------------------------------------------------------------
    [MARKUP_DECLARATION_OPEN_STATE](cp) {
        if (this._consumeSequenceIfMatch($$.DASH_DASH_STRING, cp, true)) {
            this._createCommentToken();
            this.state = COMMENT_START_STATE;
        } else if (this._consumeSequenceIfMatch($$.DOCTYPE_STRING, cp, false)) {
            this.state = DOCTYPE_STATE;
        } else if (this._consumeSequenceIfMatch($$.CDATA_START_STRING, cp, true)) {
            if (this.allowCDATA) {
                this.state = CDATA_SECTION_STATE;
            } else {
                this._err(ERR.cdataInHtmlContent);
                this._createCommentToken();
                this.currentToken.data = '[CDATA[';
                this.state = BOGUS_COMMENT_STATE;
            }
        }

        //NOTE: sequence lookup can be abrupted by hibernation. In that case lookup
        //results are no longer valid and we will need to start over.
        else if (!this._ensureHibernation()) {
            this._err(ERR.incorrectlyOpenedComment);
            this._createCommentToken();
            this._reconsumeInState(BOGUS_COMMENT_STATE);
        }
    }

    // Comment start state
    //------------------------------------------------------------------
    [COMMENT_START_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this.state = COMMENT_START_DASH_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.abruptClosingOfEmptyComment);
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else {
            this._reconsumeInState(COMMENT_STATE);
        }
    }

    // Comment start dash state
    //------------------------------------------------------------------
    [COMMENT_START_DASH_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this.state = COMMENT_END_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.abruptClosingOfEmptyComment);
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (cp === $.EOF) {
            this._err(ERR.eofInComment);
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.data += '-';
            this._reconsumeInState(COMMENT_STATE);
        }
    }

    // Comment state
    //------------------------------------------------------------------
    [COMMENT_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this.state = COMMENT_END_DASH_STATE;
        } else if (cp === $.LESS_THAN_SIGN) {
            this.currentToken.data += '<';
            this.state = COMMENT_LESS_THAN_SIGN_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.currentToken.data += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInComment);
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.data += toChar(cp);
        }
    }

    // Comment less-than sign state
    //------------------------------------------------------------------
    [COMMENT_LESS_THAN_SIGN_STATE](cp) {
        if (cp === $.EXCLAMATION_MARK) {
            this.currentToken.data += '!';
            this.state = COMMENT_LESS_THAN_SIGN_BANG_STATE;
        } else if (cp === $.LESS_THAN_SIGN) {
            this.currentToken.data += '!';
        } else {
            this._reconsumeInState(COMMENT_STATE);
        }
    }

    // Comment less-than sign bang state
    //------------------------------------------------------------------
    [COMMENT_LESS_THAN_SIGN_BANG_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this.state = COMMENT_LESS_THAN_SIGN_BANG_DASH_STATE;
        } else {
            this._reconsumeInState(COMMENT_STATE);
        }
    }

    // Comment less-than sign bang dash state
    //------------------------------------------------------------------
    [COMMENT_LESS_THAN_SIGN_BANG_DASH_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this.state = COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH_STATE;
        } else {
            this._reconsumeInState(COMMENT_END_DASH_STATE);
        }
    }

    // Comment less-than sign bang dash dash state
    //------------------------------------------------------------------
    [COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH_STATE](cp) {
        if (cp !== $.GREATER_THAN_SIGN && cp !== $.EOF) {
            this._err(ERR.nestedComment);
        }

        this._reconsumeInState(COMMENT_END_STATE);
    }

    // Comment end dash state
    //------------------------------------------------------------------
    [COMMENT_END_DASH_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this.state = COMMENT_END_STATE;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInComment);
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.data += '-';
            this._reconsumeInState(COMMENT_STATE);
        }
    }

    // Comment end state
    //------------------------------------------------------------------
    [COMMENT_END_STATE](cp) {
        if (cp === $.GREATER_THAN_SIGN) {
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (cp === $.EXCLAMATION_MARK) {
            this.state = COMMENT_END_BANG_STATE;
        } else if (cp === $.HYPHEN_MINUS) {
            this.currentToken.data += '-';
        } else if (cp === $.EOF) {
            this._err(ERR.eofInComment);
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.data += '--';
            this._reconsumeInState(COMMENT_STATE);
        }
    }

    // Comment end bang state
    //------------------------------------------------------------------
    [COMMENT_END_BANG_STATE](cp) {
        if (cp === $.HYPHEN_MINUS) {
            this.currentToken.data += '--!';
            this.state = COMMENT_END_DASH_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.incorrectlyClosedComment);
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (cp === $.EOF) {
            this._err(ERR.eofInComment);
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.data += '--!';
            this._reconsumeInState(COMMENT_STATE);
        }
    }

    // DOCTYPE state
    //------------------------------------------------------------------
    [DOCTYPE_STATE](cp) {
        if (isWhitespace(cp)) {
            this.state = BEFORE_DOCTYPE_NAME_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._reconsumeInState(BEFORE_DOCTYPE_NAME_STATE);
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this._createDoctypeToken(null);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this._err(ERR.missingWhitespaceBeforeDoctypeName);
            this._reconsumeInState(BEFORE_DOCTYPE_NAME_STATE);
        }
    }

    // Before DOCTYPE name state
    //------------------------------------------------------------------
    [BEFORE_DOCTYPE_NAME_STATE](cp) {
        if (isWhitespace(cp)) {
            return;
        }

        if (isAsciiUpper(cp)) {
            this._createDoctypeToken(toAsciiLowerChar(cp));
            this.state = DOCTYPE_NAME_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this._createDoctypeToken(unicode.REPLACEMENT_CHARACTER);
            this.state = DOCTYPE_NAME_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.missingDoctypeName);
            this._createDoctypeToken(null);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this._createDoctypeToken(null);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this._createDoctypeToken(toChar(cp));
            this.state = DOCTYPE_NAME_STATE;
        }
    }

    // DOCTYPE name state
    //------------------------------------------------------------------
    [DOCTYPE_NAME_STATE](cp) {
        if (isWhitespace(cp)) {
            this.state = AFTER_DOCTYPE_NAME_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (isAsciiUpper(cp)) {
            this.currentToken.name += toAsciiLowerChar(cp);
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.currentToken.name += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.name += toChar(cp);
        }
    }

    // After DOCTYPE name state
    //------------------------------------------------------------------
    [AFTER_DOCTYPE_NAME_STATE](cp) {
        if (isWhitespace(cp)) {
            return;
        }

        if (cp === $.GREATER_THAN_SIGN) {
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else if (this._consumeSequenceIfMatch($$.PUBLIC_STRING, cp, false)) {
            this.state = AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE;
        } else if (this._consumeSequenceIfMatch($$.SYSTEM_STRING, cp, false)) {
            this.state = AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE;
        }
        //NOTE: sequence lookup can be abrupted by hibernation. In that case lookup
        //results are no longer valid and we will need to start over.
        else if (!this._ensureHibernation()) {
            this._err(ERR.invalidCharacterSequenceAfterDoctypeName);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(BOGUS_DOCTYPE_STATE);
        }
    }

    // After DOCTYPE public keyword state
    //------------------------------------------------------------------
    [AFTER_DOCTYPE_PUBLIC_KEYWORD_STATE](cp) {
        if (isWhitespace(cp)) {
            this.state = BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE;
        } else if (cp === $.QUOTATION_MARK) {
            this._err(ERR.missingWhitespaceAfterDoctypePublicKeyword);
            this.currentToken.publicId = '';
            this.state = DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this._err(ERR.missingWhitespaceAfterDoctypePublicKeyword);
            this.currentToken.publicId = '';
            this.state = DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.missingDoctypePublicIdentifier);
            this.currentToken.forceQuirks = true;
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this._err(ERR.missingQuoteBeforeDoctypePublicIdentifier);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(BOGUS_DOCTYPE_STATE);
        }
    }

    // Before DOCTYPE public identifier state
    //------------------------------------------------------------------
    [BEFORE_DOCTYPE_PUBLIC_IDENTIFIER_STATE](cp) {
        if (isWhitespace(cp)) {
            return;
        }

        if (cp === $.QUOTATION_MARK) {
            this.currentToken.publicId = '';
            this.state = DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this.currentToken.publicId = '';
            this.state = DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.missingDoctypePublicIdentifier);
            this.currentToken.forceQuirks = true;
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this._err(ERR.missingQuoteBeforeDoctypePublicIdentifier);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(BOGUS_DOCTYPE_STATE);
        }
    }

    // DOCTYPE public identifier (double-quoted) state
    //------------------------------------------------------------------
    [DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED_STATE](cp) {
        if (cp === $.QUOTATION_MARK) {
            this.state = AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.currentToken.publicId += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.abruptDoctypePublicIdentifier);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.publicId += toChar(cp);
        }
    }

    // DOCTYPE public identifier (single-quoted) state
    //------------------------------------------------------------------
    [DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED_STATE](cp) {
        if (cp === $.APOSTROPHE) {
            this.state = AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.currentToken.publicId += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.abruptDoctypePublicIdentifier);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.publicId += toChar(cp);
        }
    }

    // After DOCTYPE public identifier state
    //------------------------------------------------------------------
    [AFTER_DOCTYPE_PUBLIC_IDENTIFIER_STATE](cp) {
        if (isWhitespace(cp)) {
            this.state = BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (cp === $.QUOTATION_MARK) {
            this._err(ERR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
            this.currentToken.systemId = '';
            this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this._err(ERR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
            this.currentToken.systemId = '';
            this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(BOGUS_DOCTYPE_STATE);
        }
    }

    // Between DOCTYPE public and system identifiers state
    //------------------------------------------------------------------
    [BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS_STATE](cp) {
        if (isWhitespace(cp)) {
            return;
        }

        if (cp === $.GREATER_THAN_SIGN) {
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else if (cp === $.QUOTATION_MARK) {
            this.currentToken.systemId = '';
            this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this.currentToken.systemId = '';
            this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(BOGUS_DOCTYPE_STATE);
        }
    }

    // After DOCTYPE system keyword state
    //------------------------------------------------------------------
    [AFTER_DOCTYPE_SYSTEM_KEYWORD_STATE](cp) {
        if (isWhitespace(cp)) {
            this.state = BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE;
        } else if (cp === $.QUOTATION_MARK) {
            this._err(ERR.missingWhitespaceAfterDoctypeSystemKeyword);
            this.currentToken.systemId = '';
            this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this._err(ERR.missingWhitespaceAfterDoctypeSystemKeyword);
            this.currentToken.systemId = '';
            this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.missingDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(BOGUS_DOCTYPE_STATE);
        }
    }

    // Before DOCTYPE system identifier state
    //------------------------------------------------------------------
    [BEFORE_DOCTYPE_SYSTEM_IDENTIFIER_STATE](cp) {
        if (isWhitespace(cp)) {
            return;
        }

        if (cp === $.QUOTATION_MARK) {
            this.currentToken.systemId = '';
            this.state = DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE;
        } else if (cp === $.APOSTROPHE) {
            this.currentToken.systemId = '';
            this.state = DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.missingDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this.state = DATA_STATE;
            this._emitCurrentToken();
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this._reconsumeInState(BOGUS_DOCTYPE_STATE);
        }
    }

    // DOCTYPE system identifier (double-quoted) state
    //------------------------------------------------------------------
    [DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED_STATE](cp) {
        if (cp === $.QUOTATION_MARK) {
            this.state = AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.currentToken.systemId += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.abruptDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.systemId += toChar(cp);
        }
    }

    // DOCTYPE system identifier (single-quoted) state
    //------------------------------------------------------------------
    [DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED_STATE](cp) {
        if (cp === $.APOSTROPHE) {
            this.state = AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
            this.currentToken.systemId += unicode.REPLACEMENT_CHARACTER;
        } else if (cp === $.GREATER_THAN_SIGN) {
            this._err(ERR.abruptDoctypeSystemIdentifier);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this.currentToken.systemId += toChar(cp);
        }
    }

    // After DOCTYPE system identifier state
    //------------------------------------------------------------------
    [AFTER_DOCTYPE_SYSTEM_IDENTIFIER_STATE](cp) {
        if (isWhitespace(cp)) {
            return;
        }

        if (cp === $.GREATER_THAN_SIGN) {
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInDoctype);
            this.currentToken.forceQuirks = true;
            this._emitCurrentToken();
            this._emitEOFToken();
        } else {
            this._err(ERR.unexpectedCharacterAfterDoctypeSystemIdentifier);
            this._reconsumeInState(BOGUS_DOCTYPE_STATE);
        }
    }

    // Bogus DOCTYPE state
    //------------------------------------------------------------------
    [BOGUS_DOCTYPE_STATE](cp) {
        if (cp === $.GREATER_THAN_SIGN) {
            this._emitCurrentToken();
            this.state = DATA_STATE;
        } else if (cp === $.NULL) {
            this._err(ERR.unexpectedNullCharacter);
        } else if (cp === $.EOF) {
            this._emitCurrentToken();
            this._emitEOFToken();
        }
    }

    // CDATA section state
    //------------------------------------------------------------------
    [CDATA_SECTION_STATE](cp) {
        if (cp === $.RIGHT_SQUARE_BRACKET) {
            this.state = CDATA_SECTION_BRACKET_STATE;
        } else if (cp === $.EOF) {
            this._err(ERR.eofInCdata);
            this._emitEOFToken();
        } else {
            this._emitCodePoint(cp);
        }
    }

    // CDATA section bracket state
    //------------------------------------------------------------------
    [CDATA_SECTION_BRACKET_STATE](cp) {
        if (cp === $.RIGHT_SQUARE_BRACKET) {
            this.state = CDATA_SECTION_END_STATE;
        } else {
            this._emitChars(']');
            this._reconsumeInState(CDATA_SECTION_STATE);
        }
    }

    // CDATA section end state
    //------------------------------------------------------------------
    [CDATA_SECTION_END_STATE](cp) {
        if (cp === $.GREATER_THAN_SIGN) {
            this.state = DATA_STATE;
        } else if (cp === $.RIGHT_SQUARE_BRACKET) {
            this._emitChars(']');
        } else {
            this._emitChars(']]');
            this._reconsumeInState(CDATA_SECTION_STATE);
        }
    }

    // Character reference state
    //------------------------------------------------------------------
    [CHARACTER_REFERENCE_STATE](cp) {
        this.tempBuff = [$.AMPERSAND];

        if (cp === $.NUMBER_SIGN) {
            this.tempBuff.push(cp);
            this.state = NUMERIC_CHARACTER_REFERENCE_STATE;
        } else if (isAsciiAlphaNumeric(cp)) {
            this._reconsumeInState(NAMED_CHARACTER_REFERENCE_STATE);
        } else {
            this._flushCodePointsConsumedAsCharacterReference();
            this._reconsumeInState(this.returnState);
        }
    }

    // Named character reference state
    //------------------------------------------------------------------
    [NAMED_CHARACTER_REFERENCE_STATE](cp) {
        const matchResult = this._matchNamedCharacterReference(cp);

        //NOTE: matching can be abrupted by hibernation. In that case match
        //results are no longer valid and we will need to start over.
        if (this._ensureHibernation()) {
            this.tempBuff = [$.AMPERSAND];
        } else if (matchResult) {
            const withSemicolon = this.tempBuff[this.tempBuff.length - 1] === $.SEMICOLON;

            if (!this._isCharacterReferenceAttributeQuirk(withSemicolon)) {
                if (!withSemicolon) {
                    this._errOnNextCodePoint(ERR.missingSemicolonAfterCharacterReference);
                }

                this.tempBuff = matchResult;
            }

            this._flushCodePointsConsumedAsCharacterReference();
            this.state = this.returnState;
        } else {
            this._flushCodePointsConsumedAsCharacterReference();
            this.state = AMBIGUOUS_AMPERSAND_STATE;
        }
    }

    // Ambiguos ampersand state
    //------------------------------------------------------------------
    [AMBIGUOUS_AMPERSAND_STATE](cp) {
        if (isAsciiAlphaNumeric(cp)) {
            if (this._isCharacterReferenceInAttribute()) {
                this.currentAttr.value += toChar(cp);
            } else {
                this._emitCodePoint(cp);
            }
        } else {
            if (cp === $.SEMICOLON) {
                this._err(ERR.unknownNamedCharacterReference);
            }

            this._reconsumeInState(this.returnState);
        }
    }

    // Numeric character reference state
    //------------------------------------------------------------------
    [NUMERIC_CHARACTER_REFERENCE_STATE](cp) {
        this.charRefCode = 0;

        if (cp === $.LATIN_SMALL_X || cp === $.LATIN_CAPITAL_X) {
            this.tempBuff.push(cp);
            this.state = HEXADEMICAL_CHARACTER_REFERENCE_START_STATE;
        } else {
            this._reconsumeInState(DECIMAL_CHARACTER_REFERENCE_START_STATE);
        }
    }

    // Hexademical character reference start state
    //------------------------------------------------------------------
    [HEXADEMICAL_CHARACTER_REFERENCE_START_STATE](cp) {
        if (isAsciiHexDigit(cp)) {
            this._reconsumeInState(HEXADEMICAL_CHARACTER_REFERENCE_STATE);
        } else {
            this._err(ERR.absenceOfDigitsInNumericCharacterReference);
            this._flushCodePointsConsumedAsCharacterReference();
            this._reconsumeInState(this.returnState);
        }
    }

    // Decimal character reference start state
    //------------------------------------------------------------------
    [DECIMAL_CHARACTER_REFERENCE_START_STATE](cp) {
        if (isAsciiDigit(cp)) {
            this._reconsumeInState(DECIMAL_CHARACTER_REFERENCE_STATE);
        } else {
            this._err(ERR.absenceOfDigitsInNumericCharacterReference);
            this._flushCodePointsConsumedAsCharacterReference();
            this._reconsumeInState(this.returnState);
        }
    }

    // Hexademical character reference state
    //------------------------------------------------------------------
    [HEXADEMICAL_CHARACTER_REFERENCE_STATE](cp) {
        if (isAsciiUpperHexDigit(cp)) {
            this.charRefCode = this.charRefCode * 16 + cp - 0x37;
        } else if (isAsciiLowerHexDigit(cp)) {
            this.charRefCode = this.charRefCode * 16 + cp - 0x57;
        } else if (isAsciiDigit(cp)) {
            this.charRefCode = this.charRefCode * 16 + cp - 0x30;
        } else if (cp === $.SEMICOLON) {
            this.state = NUMERIC_CHARACTER_REFERENCE_END_STATE;
        } else {
            this._err(ERR.missingSemicolonAfterCharacterReference);
            this._reconsumeInState(NUMERIC_CHARACTER_REFERENCE_END_STATE);
        }
    }

    // Decimal character reference state
    //------------------------------------------------------------------
    [DECIMAL_CHARACTER_REFERENCE_STATE](cp) {
        if (isAsciiDigit(cp)) {
            this.charRefCode = this.charRefCode * 10 + cp - 0x30;
        } else if (cp === $.SEMICOLON) {
            this.state = NUMERIC_CHARACTER_REFERENCE_END_STATE;
        } else {
            this._err(ERR.missingSemicolonAfterCharacterReference);
            this._reconsumeInState(NUMERIC_CHARACTER_REFERENCE_END_STATE);
        }
    }

    // Numeric character reference end state
    //------------------------------------------------------------------
    [NUMERIC_CHARACTER_REFERENCE_END_STATE]() {
        if (this.charRefCode === $.NULL) {
            this._err(ERR.nullCharacterReference);
            this.charRefCode = $.REPLACEMENT_CHARACTER;
        } else if (this.charRefCode > 0x10ffff) {
            this._err(ERR.characterReferenceOutsideUnicodeRange);
            this.charRefCode = $.REPLACEMENT_CHARACTER;
        } else if (unicode.isSurrogate(this.charRefCode)) {
            this._err(ERR.surrogateCharacterReference);
            this.charRefCode = $.REPLACEMENT_CHARACTER;
        } else if (unicode.isUndefinedCodePoint(this.charRefCode)) {
            this._err(ERR.noncharacterCharacterReference);
        } else if (unicode.isControlCodePoint(this.charRefCode) || this.charRefCode === $.CARRIAGE_RETURN) {
            this._err(ERR.controlCharacterReference);

            const replacement = C1_CONTROLS_REFERENCE_REPLACEMENTS[this.charRefCode];

            if (replacement) {
                this.charRefCode = replacement;
            }
        }

        this.tempBuff = [this.charRefCode];

        this._flushCodePointsConsumedAsCharacterReference();
        this._reconsumeInState(this.returnState);
    }
}

//Token types
Tokenizer.CHARACTER_TOKEN = 'CHARACTER_TOKEN';
Tokenizer.NULL_CHARACTER_TOKEN = 'NULL_CHARACTER_TOKEN';
Tokenizer.WHITESPACE_CHARACTER_TOKEN = 'WHITESPACE_CHARACTER_TOKEN';
Tokenizer.START_TAG_TOKEN = 'START_TAG_TOKEN';
Tokenizer.END_TAG_TOKEN = 'END_TAG_TOKEN';
Tokenizer.COMMENT_TOKEN = 'COMMENT_TOKEN';
Tokenizer.DOCTYPE_TOKEN = 'DOCTYPE_TOKEN';
Tokenizer.EOF_TOKEN = 'EOF_TOKEN';
Tokenizer.HIBERNATION_TOKEN = 'HIBERNATION_TOKEN';

//Tokenizer initial states for different modes
Tokenizer.MODE = {
    DATA: DATA_STATE,
    RCDATA: RCDATA_STATE,
    RAWTEXT: RAWTEXT_STATE,
    SCRIPT_DATA: SCRIPT_DATA_STATE,
    PLAINTEXT: PLAINTEXT_STATE
};

//Static
Tokenizer.getTokenAttr = function(token, attrName) {
    for (let i = token.attrs.length - 1; i >= 0; i--) {
        if (token.attrs[i].name === attrName) {
            return token.attrs[i].value;
        }
    }

    return null;
};

module.exports = Tokenizer;

},{"../common/error-codes":2,"../common/unicode":5,"./named-entity-data":20,"./preprocessor":21}],20:[function(require,module,exports){
'use strict';

//NOTE: this file contains auto-generated array mapped radix tree that is used for the named entity references consumption
//(details: https://github.com/inikulin/parse5/tree/master/scripts/generate-named-entity-data/README.md)
module.exports = new Uint16Array([4,52,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,106,303,412,810,1432,1701,1796,1987,2114,2360,2420,2484,3170,3251,4140,4393,4575,4610,5106,5512,5728,6117,6274,6315,6345,6427,6516,7002,7910,8733,9323,9870,10170,10631,10893,11318,11386,11467,12773,13092,14474,14922,15448,15542,16419,17666,18166,18611,19004,19095,19298,19397,4,16,69,77,97,98,99,102,103,108,109,110,111,112,114,115,116,117,140,150,158,169,176,194,199,210,216,222,226,242,256,266,283,294,108,105,103,5,198,1,59,148,1,198,80,5,38,1,59,156,1,38,99,117,116,101,5,193,1,59,167,1,193,114,101,118,101,59,1,258,4,2,105,121,182,191,114,99,5,194,1,59,189,1,194,59,1,1040,114,59,3,55349,56580,114,97,118,101,5,192,1,59,208,1,192,112,104,97,59,1,913,97,99,114,59,1,256,100,59,1,10835,4,2,103,112,232,237,111,110,59,1,260,102,59,3,55349,56632,112,108,121,70,117,110,99,116,105,111,110,59,1,8289,105,110,103,5,197,1,59,264,1,197,4,2,99,115,272,277,114,59,3,55349,56476,105,103,110,59,1,8788,105,108,100,101,5,195,1,59,292,1,195,109,108,5,196,1,59,301,1,196,4,8,97,99,101,102,111,114,115,117,321,350,354,383,388,394,400,405,4,2,99,114,327,336,107,115,108,97,115,104,59,1,8726,4,2,118,119,342,345,59,1,10983,101,100,59,1,8966,121,59,1,1041,4,3,99,114,116,362,369,379,97,117,115,101,59,1,8757,110,111,117,108,108,105,115,59,1,8492,97,59,1,914,114,59,3,55349,56581,112,102,59,3,55349,56633,101,118,101,59,1,728,99,114,59,1,8492,109,112,101,113,59,1,8782,4,14,72,79,97,99,100,101,102,104,105,108,111,114,115,117,442,447,456,504,542,547,569,573,577,616,678,784,790,796,99,121,59,1,1063,80,89,5,169,1,59,454,1,169,4,3,99,112,121,464,470,497,117,116,101,59,1,262,4,2,59,105,476,478,1,8914,116,97,108,68,105,102,102,101,114,101,110,116,105,97,108,68,59,1,8517,108,101,121,115,59,1,8493,4,4,97,101,105,111,514,520,530,535,114,111,110,59,1,268,100,105,108,5,199,1,59,528,1,199,114,99,59,1,264,110,105,110,116,59,1,8752,111,116,59,1,266,4,2,100,110,553,560,105,108,108,97,59,1,184,116,101,114,68,111,116,59,1,183,114,59,1,8493,105,59,1,935,114,99,108,101,4,4,68,77,80,84,591,596,603,609,111,116,59,1,8857,105,110,117,115,59,1,8854,108,117,115,59,1,8853,105,109,101,115,59,1,8855,111,4,2,99,115,623,646,107,119,105,115,101,67,111,110,116,111,117,114,73,110,116,101,103,114,97,108,59,1,8754,101,67,117,114,108,121,4,2,68,81,658,671,111,117,98,108,101,81,117,111,116,101,59,1,8221,117,111,116,101,59,1,8217,4,4,108,110,112,117,688,701,736,753,111,110,4,2,59,101,696,698,1,8759,59,1,10868,4,3,103,105,116,709,717,722,114,117,101,110,116,59,1,8801,110,116,59,1,8751,111,117,114,73,110,116,101,103,114,97,108,59,1,8750,4,2,102,114,742,745,59,1,8450,111,100,117,99,116,59,1,8720,110,116,101,114,67,108,111,99,107,119,105,115,101,67,111,110,116,111,117,114,73,110,116,101,103,114,97,108,59,1,8755,111,115,115,59,1,10799,99,114,59,3,55349,56478,112,4,2,59,67,803,805,1,8915,97,112,59,1,8781,4,11,68,74,83,90,97,99,101,102,105,111,115,834,850,855,860,865,888,903,916,921,1011,1415,4,2,59,111,840,842,1,8517,116,114,97,104,100,59,1,10513,99,121,59,1,1026,99,121,59,1,1029,99,121,59,1,1039,4,3,103,114,115,873,879,883,103,101,114,59,1,8225,114,59,1,8609,104,118,59,1,10980,4,2,97,121,894,900,114,111,110,59,1,270,59,1,1044,108,4,2,59,116,910,912,1,8711,97,59,1,916,114,59,3,55349,56583,4,2,97,102,927,998,4,2,99,109,933,992,114,105,116,105,99,97,108,4,4,65,68,71,84,950,957,978,985,99,117,116,101,59,1,180,111,4,2,116,117,964,967,59,1,729,98,108,101,65,99,117,116,101,59,1,733,114,97,118,101,59,1,96,105,108,100,101,59,1,732,111,110,100,59,1,8900,102,101,114,101,110,116,105,97,108,68,59,1,8518,4,4,112,116,117,119,1021,1026,1048,1249,102,59,3,55349,56635,4,3,59,68,69,1034,1036,1041,1,168,111,116,59,1,8412,113,117,97,108,59,1,8784,98,108,101,4,6,67,68,76,82,85,86,1065,1082,1101,1189,1211,1236,111,110,116,111,117,114,73,110,116,101,103,114,97,108,59,1,8751,111,4,2,116,119,1089,1092,59,1,168,110,65,114,114,111,119,59,1,8659,4,2,101,111,1107,1141,102,116,4,3,65,82,84,1117,1124,1136,114,114,111,119,59,1,8656,105,103,104,116,65,114,114,111,119,59,1,8660,101,101,59,1,10980,110,103,4,2,76,82,1149,1177,101,102,116,4,2,65,82,1158,1165,114,114,111,119,59,1,10232,105,103,104,116,65,114,114,111,119,59,1,10234,105,103,104,116,65,114,114,111,119,59,1,10233,105,103,104,116,4,2,65,84,1199,1206,114,114,111,119,59,1,8658,101,101,59,1,8872,112,4,2,65,68,1218,1225,114,114,111,119,59,1,8657,111,119,110,65,114,114,111,119,59,1,8661,101,114,116,105,99,97,108,66,97,114,59,1,8741,110,4,6,65,66,76,82,84,97,1264,1292,1299,1352,1391,1408,114,114,111,119,4,3,59,66,85,1276,1278,1283,1,8595,97,114,59,1,10515,112,65,114,114,111,119,59,1,8693,114,101,118,101,59,1,785,101,102,116,4,3,82,84,86,1310,1323,1334,105,103,104,116,86,101,99,116,111,114,59,1,10576,101,101,86,101,99,116,111,114,59,1,10590,101,99,116,111,114,4,2,59,66,1345,1347,1,8637,97,114,59,1,10582,105,103,104,116,4,2,84,86,1362,1373,101,101,86,101,99,116,111,114,59,1,10591,101,99,116,111,114,4,2,59,66,1384,1386,1,8641,97,114,59,1,10583,101,101,4,2,59,65,1399,1401,1,8868,114,114,111,119,59,1,8615,114,114,111,119,59,1,8659,4,2,99,116,1421,1426,114,59,3,55349,56479,114,111,107,59,1,272,4,16,78,84,97,99,100,102,103,108,109,111,112,113,115,116,117,120,1466,1470,1478,1489,1515,1520,1525,1536,1544,1593,1609,1617,1650,1664,1668,1677,71,59,1,330,72,5,208,1,59,1476,1,208,99,117,116,101,5,201,1,59,1487,1,201,4,3,97,105,121,1497,1503,1512,114,111,110,59,1,282,114,99,5,202,1,59,1510,1,202,59,1,1069,111,116,59,1,278,114,59,3,55349,56584,114,97,118,101,5,200,1,59,1534,1,200,101,109,101,110,116,59,1,8712,4,2,97,112,1550,1555,99,114,59,1,274,116,121,4,2,83,86,1563,1576,109,97,108,108,83,113,117,97,114,101,59,1,9723,101,114,121,83,109,97,108,108,83,113,117,97,114,101,59,1,9643,4,2,103,112,1599,1604,111,110,59,1,280,102,59,3,55349,56636,115,105,108,111,110,59,1,917,117,4,2,97,105,1624,1640,108,4,2,59,84,1631,1633,1,10869,105,108,100,101,59,1,8770,108,105,98,114,105,117,109,59,1,8652,4,2,99,105,1656,1660,114,59,1,8496,109,59,1,10867,97,59,1,919,109,108,5,203,1,59,1675,1,203,4,2,105,112,1683,1689,115,116,115,59,1,8707,111,110,101,110,116,105,97,108,69,59,1,8519,4,5,99,102,105,111,115,1713,1717,1722,1762,1791,121,59,1,1060,114,59,3,55349,56585,108,108,101,100,4,2,83,86,1732,1745,109,97,108,108,83,113,117,97,114,101,59,1,9724,101,114,121,83,109,97,108,108,83,113,117,97,114,101,59,1,9642,4,3,112,114,117,1770,1775,1781,102,59,3,55349,56637,65,108,108,59,1,8704,114,105,101,114,116,114,102,59,1,8497,99,114,59,1,8497,4,12,74,84,97,98,99,100,102,103,111,114,115,116,1822,1827,1834,1848,1855,1877,1882,1887,1890,1896,1978,1984,99,121,59,1,1027,5,62,1,59,1832,1,62,109,109,97,4,2,59,100,1843,1845,1,915,59,1,988,114,101,118,101,59,1,286,4,3,101,105,121,1863,1869,1874,100,105,108,59,1,290,114,99,59,1,284,59,1,1043,111,116,59,1,288,114,59,3,55349,56586,59,1,8921,112,102,59,3,55349,56638,101,97,116,101,114,4,6,69,70,71,76,83,84,1915,1933,1944,1953,1959,1971,113,117,97,108,4,2,59,76,1925,1927,1,8805,101,115,115,59,1,8923,117,108,108,69,113,117,97,108,59,1,8807,114,101,97,116,101,114,59,1,10914,101,115,115,59,1,8823,108,97,110,116,69,113,117,97,108,59,1,10878,105,108,100,101,59,1,8819,99,114,59,3,55349,56482,59,1,8811,4,8,65,97,99,102,105,111,115,117,2005,2012,2026,2032,2036,2049,2073,2089,82,68,99,121,59,1,1066,4,2,99,116,2018,2023,101,107,59,1,711,59,1,94,105,114,99,59,1,292,114,59,1,8460,108,98,101,114,116,83,112,97,99,101,59,1,8459,4,2,112,114,2055,2059,102,59,1,8461,105,122,111,110,116,97,108,76,105,110,101,59,1,9472,4,2,99,116,2079,2083,114,59,1,8459,114,111,107,59,1,294,109,112,4,2,68,69,2097,2107,111,119,110,72,117,109,112,59,1,8782,113,117,97,108,59,1,8783,4,14,69,74,79,97,99,100,102,103,109,110,111,115,116,117,2144,2149,2155,2160,2171,2189,2194,2198,2209,2245,2307,2329,2334,2341,99,121,59,1,1045,108,105,103,59,1,306,99,121,59,1,1025,99,117,116,101,5,205,1,59,2169,1,205,4,2,105,121,2177,2186,114,99,5,206,1,59,2184,1,206,59,1,1048,111,116,59,1,304,114,59,1,8465,114,97,118,101,5,204,1,59,2207,1,204,4,3,59,97,112,2217,2219,2238,1,8465,4,2,99,103,2225,2229,114,59,1,298,105,110,97,114,121,73,59,1,8520,108,105,101,115,59,1,8658,4,2,116,118,2251,2281,4,2,59,101,2257,2259,1,8748,4,2,103,114,2265,2271,114,97,108,59,1,8747,115,101,99,116,105,111,110,59,1,8898,105,115,105,98,108,101,4,2,67,84,2293,2300,111,109,109,97,59,1,8291,105,109,101,115,59,1,8290,4,3,103,112,116,2315,2320,2325,111,110,59,1,302,102,59,3,55349,56640,97,59,1,921,99,114,59,1,8464,105,108,100,101,59,1,296,4,2,107,109,2347,2352,99,121,59,1,1030,108,5,207,1,59,2358,1,207,4,5,99,102,111,115,117,2372,2386,2391,2397,2414,4,2,105,121,2378,2383,114,99,59,1,308,59,1,1049,114,59,3,55349,56589,112,102,59,3,55349,56641,4,2,99,101,2403,2408,114,59,3,55349,56485,114,99,121,59,1,1032,107,99,121,59,1,1028,4,7,72,74,97,99,102,111,115,2436,2441,2446,2452,2467,2472,2478,99,121,59,1,1061,99,121,59,1,1036,112,112,97,59,1,922,4,2,101,121,2458,2464,100,105,108,59,1,310,59,1,1050,114,59,3,55349,56590,112,102,59,3,55349,56642,99,114,59,3,55349,56486,4,11,74,84,97,99,101,102,108,109,111,115,116,2508,2513,2520,2562,2585,2981,2986,3004,3011,3146,3167,99,121,59,1,1033,5,60,1,59,2518,1,60,4,5,99,109,110,112,114,2532,2538,2544,2548,2558,117,116,101,59,1,313,98,100,97,59,1,923,103,59,1,10218,108,97,99,101,116,114,102,59,1,8466,114,59,1,8606,4,3,97,101,121,2570,2576,2582,114,111,110,59,1,317,100,105,108,59,1,315,59,1,1051,4,2,102,115,2591,2907,116,4,10,65,67,68,70,82,84,85,86,97,114,2614,2663,2672,2728,2735,2760,2820,2870,2888,2895,4,2,110,114,2620,2633,103,108,101,66,114,97,99,107,101,116,59,1,10216,114,111,119,4,3,59,66,82,2644,2646,2651,1,8592,97,114,59,1,8676,105,103,104,116,65,114,114,111,119,59,1,8646,101,105,108,105,110,103,59,1,8968,111,4,2,117,119,2679,2692,98,108,101,66,114,97,99,107,101,116,59,1,10214,110,4,2,84,86,2699,2710,101,101,86,101,99,116,111,114,59,1,10593,101,99,116,111,114,4,2,59,66,2721,2723,1,8643,97,114,59,1,10585,108,111,111,114,59,1,8970,105,103,104,116,4,2,65,86,2745,2752,114,114,111,119,59,1,8596,101,99,116,111,114,59,1,10574,4,2,101,114,2766,2792,101,4,3,59,65,86,2775,2777,2784,1,8867,114,114,111,119,59,1,8612,101,99,116,111,114,59,1,10586,105,97,110,103,108,101,4,3,59,66,69,2806,2808,2813,1,8882,97,114,59,1,10703,113,117,97,108,59,1,8884,112,4,3,68,84,86,2829,2841,2852,111,119,110,86,101,99,116,111,114,59,1,10577,101,101,86,101,99,116,111,114,59,1,10592,101,99,116,111,114,4,2,59,66,2863,2865,1,8639,97,114,59,1,10584,101,99,116,111,114,4,2,59,66,2881,2883,1,8636,97,114,59,1,10578,114,114,111,119,59,1,8656,105,103,104,116,97,114,114,111,119,59,1,8660,115,4,6,69,70,71,76,83,84,2922,2936,2947,2956,2962,2974,113,117,97,108,71,114,101,97,116,101,114,59,1,8922,117,108,108,69,113,117,97,108,59,1,8806,114,101,97,116,101,114,59,1,8822,101,115,115,59,1,10913,108,97,110,116,69,113,117,97,108,59,1,10877,105,108,100,101,59,1,8818,114,59,3,55349,56591,4,2,59,101,2992,2994,1,8920,102,116,97,114,114,111,119,59,1,8666,105,100,111,116,59,1,319,4,3,110,112,119,3019,3110,3115,103,4,4,76,82,108,114,3030,3058,3070,3098,101,102,116,4,2,65,82,3039,3046,114,114,111,119,59,1,10229,105,103,104,116,65,114,114,111,119,59,1,10231,105,103,104,116,65,114,114,111,119,59,1,10230,101,102,116,4,2,97,114,3079,3086,114,114,111,119,59,1,10232,105,103,104,116,97,114,114,111,119,59,1,10234,105,103,104,116,97,114,114,111,119,59,1,10233,102,59,3,55349,56643,101,114,4,2,76,82,3123,3134,101,102,116,65,114,114,111,119,59,1,8601,105,103,104,116,65,114,114,111,119,59,1,8600,4,3,99,104,116,3154,3158,3161,114,59,1,8466,59,1,8624,114,111,107,59,1,321,59,1,8810,4,8,97,99,101,102,105,111,115,117,3188,3192,3196,3222,3227,3237,3243,3248,112,59,1,10501,121,59,1,1052,4,2,100,108,3202,3213,105,117,109,83,112,97,99,101,59,1,8287,108,105,110,116,114,102,59,1,8499,114,59,3,55349,56592,110,117,115,80,108,117,115,59,1,8723,112,102,59,3,55349,56644,99,114,59,1,8499,59,1,924,4,9,74,97,99,101,102,111,115,116,117,3271,3276,3283,3306,3422,3427,4120,4126,4137,99,121,59,1,1034,99,117,116,101,59,1,323,4,3,97,101,121,3291,3297,3303,114,111,110,59,1,327,100,105,108,59,1,325,59,1,1053,4,3,103,115,119,3314,3380,3415,97,116,105,118,101,4,3,77,84,86,3327,3340,3365,101,100,105,117,109,83,112,97,99,101,59,1,8203,104,105,4,2,99,110,3348,3357,107,83,112,97,99,101,59,1,8203,83,112,97,99,101,59,1,8203,101,114,121,84,104,105,110,83,112,97,99,101,59,1,8203,116,101,100,4,2,71,76,3389,3405,114,101,97,116,101,114,71,114,101,97,116,101,114,59,1,8811,101,115,115,76,101,115,115,59,1,8810,76,105,110,101,59,1,10,114,59,3,55349,56593,4,4,66,110,112,116,3437,3444,3460,3464,114,101,97,107,59,1,8288,66,114,101,97,107,105,110,103,83,112,97,99,101,59,1,160,102,59,1,8469,4,13,59,67,68,69,71,72,76,78,80,82,83,84,86,3492,3494,3517,3536,3578,3657,3685,3784,3823,3860,3915,4066,4107,1,10988,4,2,111,117,3500,3510,110,103,114,117,101,110,116,59,1,8802,112,67,97,112,59,1,8813,111,117,98,108,101,86,101,114,116,105,99,97,108,66,97,114,59,1,8742,4,3,108,113,120,3544,3552,3571,101,109,101,110,116,59,1,8713,117,97,108,4,2,59,84,3561,3563,1,8800,105,108,100,101,59,3,8770,824,105,115,116,115,59,1,8708,114,101,97,116,101,114,4,7,59,69,70,71,76,83,84,3600,3602,3609,3621,3631,3637,3650,1,8815,113,117,97,108,59,1,8817,117,108,108,69,113,117,97,108,59,3,8807,824,114,101,97,116,101,114,59,3,8811,824,101,115,115,59,1,8825,108,97,110,116,69,113,117,97,108,59,3,10878,824,105,108,100,101,59,1,8821,117,109,112,4,2,68,69,3666,3677,111,119,110,72,117,109,112,59,3,8782,824,113,117,97,108,59,3,8783,824,101,4,2,102,115,3692,3724,116,84,114,105,97,110,103,108,101,4,3,59,66,69,3709,3711,3717,1,8938,97,114,59,3,10703,824,113,117,97,108,59,1,8940,115,4,6,59,69,71,76,83,84,3739,3741,3748,3757,3764,3777,1,8814,113,117,97,108,59,1,8816,114,101,97,116,101,114,59,1,8824,101,115,115,59,3,8810,824,108,97,110,116,69,113,117,97,108,59,3,10877,824,105,108,100,101,59,1,8820,101,115,116,101,100,4,2,71,76,3795,3812,114,101,97,116,101,114,71,114,101,97,116,101,114,59,3,10914,824,101,115,115,76,101,115,115,59,3,10913,824,114,101,99,101,100,101,115,4,3,59,69,83,3838,3840,3848,1,8832,113,117,97,108,59,3,10927,824,108,97,110,116,69,113,117,97,108,59,1,8928,4,2,101,105,3866,3881,118,101,114,115,101,69,108,101,109,101,110,116,59,1,8716,103,104,116,84,114,105,97,110,103,108,101,4,3,59,66,69,3900,3902,3908,1,8939,97,114,59,3,10704,824,113,117,97,108,59,1,8941,4,2,113,117,3921,3973,117,97,114,101,83,117,4,2,98,112,3933,3952,115,101,116,4,2,59,69,3942,3945,3,8847,824,113,117,97,108,59,1,8930,101,114,115,101,116,4,2,59,69,3963,3966,3,8848,824,113,117,97,108,59,1,8931,4,3,98,99,112,3981,4000,4045,115,101,116,4,2,59,69,3990,3993,3,8834,8402,113,117,97,108,59,1,8840,99,101,101,100,115,4,4,59,69,83,84,4015,4017,4025,4037,1,8833,113,117,97,108,59,3,10928,824,108,97,110,116,69,113,117,97,108,59,1,8929,105,108,100,101,59,3,8831,824,101,114,115,101,116,4,2,59,69,4056,4059,3,8835,8402,113,117,97,108,59,1,8841,105,108,100,101,4,4,59,69,70,84,4080,4082,4089,4100,1,8769,113,117,97,108,59,1,8772,117,108,108,69,113,117,97,108,59,1,8775,105,108,100,101,59,1,8777,101,114,116,105,99,97,108,66,97,114,59,1,8740,99,114,59,3,55349,56489,105,108,100,101,5,209,1,59,4135,1,209,59,1,925,4,14,69,97,99,100,102,103,109,111,112,114,115,116,117,118,4170,4176,4187,4205,4212,4217,4228,4253,4259,4292,4295,4316,4337,4346,108,105,103,59,1,338,99,117,116,101,5,211,1,59,4185,1,211,4,2,105,121,4193,4202,114,99,5,212,1,59,4200,1,212,59,1,1054,98,108,97,99,59,1,336,114,59,3,55349,56594,114,97,118,101,5,210,1,59,4226,1,210,4,3,97,101,105,4236,4241,4246,99,114,59,1,332,103,97,59,1,937,99,114,111,110,59,1,927,112,102,59,3,55349,56646,101,110,67,117,114,108,121,4,2,68,81,4272,4285,111,117,98,108,101,81,117,111,116,101,59,1,8220,117,111,116,101,59,1,8216,59,1,10836,4,2,99,108,4301,4306,114,59,3,55349,56490,97,115,104,5,216,1,59,4314,1,216,105,4,2,108,109,4323,4332,100,101,5,213,1,59,4330,1,213,101,115,59,1,10807,109,108,5,214,1,59,4344,1,214,101,114,4,2,66,80,4354,4380,4,2,97,114,4360,4364,114,59,1,8254,97,99,4,2,101,107,4372,4375,59,1,9182,101,116,59,1,9140,97,114,101,110,116,104,101,115,105,115,59,1,9180,4,9,97,99,102,104,105,108,111,114,115,4413,4422,4426,4431,4435,4438,4448,4471,4561,114,116,105,97,108,68,59,1,8706,121,59,1,1055,114,59,3,55349,56595,105,59,1,934,59,1,928,117,115,77,105,110,117,115,59,1,177,4,2,105,112,4454,4467,110,99,97,114,101,112,108,97,110,101,59,1,8460,102,59,1,8473,4,4,59,101,105,111,4481,4483,4526,4531,1,10939,99,101,100,101,115,4,4,59,69,83,84,4498,4500,4507,4519,1,8826,113,117,97,108,59,1,10927,108,97,110,116,69,113,117,97,108,59,1,8828,105,108,100,101,59,1,8830,109,101,59,1,8243,4,2,100,112,4537,4543,117,99,116,59,1,8719,111,114,116,105,111,110,4,2,59,97,4555,4557,1,8759,108,59,1,8733,4,2,99,105,4567,4572,114,59,3,55349,56491,59,1,936,4,4,85,102,111,115,4585,4594,4599,4604,79,84,5,34,1,59,4592,1,34,114,59,3,55349,56596,112,102,59,1,8474,99,114,59,3,55349,56492,4,12,66,69,97,99,101,102,104,105,111,114,115,117,4636,4642,4650,4681,4704,4763,4767,4771,5047,5069,5081,5094,97,114,114,59,1,10512,71,5,174,1,59,4648,1,174,4,3,99,110,114,4658,4664,4668,117,116,101,59,1,340,103,59,1,10219,114,4,2,59,116,4675,4677,1,8608,108,59,1,10518,4,3,97,101,121,4689,4695,4701,114,111,110,59,1,344,100,105,108,59,1,342,59,1,1056,4,2,59,118,4710,4712,1,8476,101,114,115,101,4,2,69,85,4722,4748,4,2,108,113,4728,4736,101,109,101,110,116,59,1,8715,117,105,108,105,98,114,105,117,109,59,1,8651,112,69,113,117,105,108,105,98,114,105,117,109,59,1,10607,114,59,1,8476,111,59,1,929,103,104,116,4,8,65,67,68,70,84,85,86,97,4792,4840,4849,4905,4912,4972,5022,5040,4,2,110,114,4798,4811,103,108,101,66,114,97,99,107,101,116,59,1,10217,114,111,119,4,3,59,66,76,4822,4824,4829,1,8594,97,114,59,1,8677,101,102,116,65,114,114,111,119,59,1,8644,101,105,108,105,110,103,59,1,8969,111,4,2,117,119,4856,4869,98,108,101,66,114,97,99,107,101,116,59,1,10215,110,4,2,84,86,4876,4887,101,101,86,101,99,116,111,114,59,1,10589,101,99,116,111,114,4,2,59,66,4898,4900,1,8642,97,114,59,1,10581,108,111,111,114,59,1,8971,4,2,101,114,4918,4944,101,4,3,59,65,86,4927,4929,4936,1,8866,114,114,111,119,59,1,8614,101,99,116,111,114,59,1,10587,105,97,110,103,108,101,4,3,59,66,69,4958,4960,4965,1,8883,97,114,59,1,10704,113,117,97,108,59,1,8885,112,4,3,68,84,86,4981,4993,5004,111,119,110,86,101,99,116,111,114,59,1,10575,101,101,86,101,99,116,111,114,59,1,10588,101,99,116,111,114,4,2,59,66,5015,5017,1,8638,97,114,59,1,10580,101,99,116,111,114,4,2,59,66,5033,5035,1,8640,97,114,59,1,10579,114,114,111,119,59,1,8658,4,2,112,117,5053,5057,102,59,1,8477,110,100,73,109,112,108,105,101,115,59,1,10608,105,103,104,116,97,114,114,111,119,59,1,8667,4,2,99,104,5087,5091,114,59,1,8475,59,1,8625,108,101,68,101,108,97,121,101,100,59,1,10740,4,13,72,79,97,99,102,104,105,109,111,113,115,116,117,5134,5150,5157,5164,5198,5203,5259,5265,5277,5283,5374,5380,5385,4,2,67,99,5140,5146,72,99,121,59,1,1065,121,59,1,1064,70,84,99,121,59,1,1068,99,117,116,101,59,1,346,4,5,59,97,101,105,121,5176,5178,5184,5190,5195,1,10940,114,111,110,59,1,352,100,105,108,59,1,350,114,99,59,1,348,59,1,1057,114,59,3,55349,56598,111,114,116,4,4,68,76,82,85,5216,5227,5238,5250,111,119,110,65,114,114,111,119,59,1,8595,101,102,116,65,114,114,111,119,59,1,8592,105,103,104,116,65,114,114,111,119,59,1,8594,112,65,114,114,111,119,59,1,8593,103,109,97,59,1,931,97,108,108,67,105,114,99,108,101,59,1,8728,112,102,59,3,55349,56650,4,2,114,117,5289,5293,116,59,1,8730,97,114,101,4,4,59,73,83,85,5306,5308,5322,5367,1,9633,110,116,101,114,115,101,99,116,105,111,110,59,1,8851,117,4,2,98,112,5329,5347,115,101,116,4,2,59,69,5338,5340,1,8847,113,117,97,108,59,1,8849,101,114,115,101,116,4,2,59,69,5358,5360,1,8848,113,117,97,108,59,1,8850,110,105,111,110,59,1,8852,99,114,59,3,55349,56494,97,114,59,1,8902,4,4,98,99,109,112,5395,5420,5475,5478,4,2,59,115,5401,5403,1,8912,101,116,4,2,59,69,5411,5413,1,8912,113,117,97,108,59,1,8838,4,2,99,104,5426,5468,101,101,100,115,4,4,59,69,83,84,5440,5442,5449,5461,1,8827,113,117,97,108,59,1,10928,108,97,110,116,69,113,117,97,108,59,1,8829,105,108,100,101,59,1,8831,84,104,97,116,59,1,8715,59,1,8721,4,3,59,101,115,5486,5488,5507,1,8913,114,115,101,116,4,2,59,69,5498,5500,1,8835,113,117,97,108,59,1,8839,101,116,59,1,8913,4,11,72,82,83,97,99,102,104,105,111,114,115,5536,5546,5552,5567,5579,5602,5607,5655,5695,5701,5711,79,82,78,5,222,1,59,5544,1,222,65,68,69,59,1,8482,4,2,72,99,5558,5563,99,121,59,1,1035,121,59,1,1062,4,2,98,117,5573,5576,59,1,9,59,1,932,4,3,97,101,121,5587,5593,5599,114,111,110,59,1,356,100,105,108,59,1,354,59,1,1058,114,59,3,55349,56599,4,2,101,105,5613,5631,4,2,114,116,5619,5627,101,102,111,114,101,59,1,8756,97,59,1,920,4,2,99,110,5637,5647,107,83,112,97,99,101,59,3,8287,8202,83,112,97,99,101,59,1,8201,108,100,101,4,4,59,69,70,84,5668,5670,5677,5688,1,8764,113,117,97,108,59,1,8771,117,108,108,69,113,117,97,108,59,1,8773,105,108,100,101,59,1,8776,112,102,59,3,55349,56651,105,112,108,101,68,111,116,59,1,8411,4,2,99,116,5717,5722,114,59,3,55349,56495,114,111,107,59,1,358,4,14,97,98,99,100,102,103,109,110,111,112,114,115,116,117,5758,5789,5805,5823,5830,5835,5846,5852,5921,5937,6089,6095,6101,6108,4,2,99,114,5764,5774,117,116,101,5,218,1,59,5772,1,218,114,4,2,59,111,5781,5783,1,8607,99,105,114,59,1,10569,114,4,2,99,101,5796,5800,121,59,1,1038,118,101,59,1,364,4,2,105,121,5811,5820,114,99,5,219,1,59,5818,1,219,59,1,1059,98,108,97,99,59,1,368,114,59,3,55349,56600,114,97,118,101,5,217,1,59,5844,1,217,97,99,114,59,1,362,4,2,100,105,5858,5905,101,114,4,2,66,80,5866,5892,4,2,97,114,5872,5876,114,59,1,95,97,99,4,2,101,107,5884,5887,59,1,9183,101,116,59,1,9141,97,114,101,110,116,104,101,115,105,115,59,1,9181,111,110,4,2,59,80,5913,5915,1,8899,108,117,115,59,1,8846,4,2,103,112,5927,5932,111,110,59,1,370,102,59,3,55349,56652,4,8,65,68,69,84,97,100,112,115,5955,5985,5996,6009,6026,6033,6044,6075,114,114,111,119,4,3,59,66,68,5967,5969,5974,1,8593,97,114,59,1,10514,111,119,110,65,114,114,111,119,59,1,8645,111,119,110,65,114,114,111,119,59,1,8597,113,117,105,108,105,98,114,105,117,109,59,1,10606,101,101,4,2,59,65,6017,6019,1,8869,114,114,111,119,59,1,8613,114,114,111,119,59,1,8657,111,119,110,97,114,114,111,119,59,1,8661,101,114,4,2,76,82,6052,6063,101,102,116,65,114,114,111,119,59,1,8598,105,103,104,116,65,114,114,111,119,59,1,8599,105,4,2,59,108,6082,6084,1,978,111,110,59,1,933,105,110,103,59,1,366,99,114,59,3,55349,56496,105,108,100,101,59,1,360,109,108,5,220,1,59,6115,1,220,4,9,68,98,99,100,101,102,111,115,118,6137,6143,6148,6152,6166,6250,6255,6261,6267,97,115,104,59,1,8875,97,114,59,1,10987,121,59,1,1042,97,115,104,4,2,59,108,6161,6163,1,8873,59,1,10982,4,2,101,114,6172,6175,59,1,8897,4,3,98,116,121,6183,6188,6238,97,114,59,1,8214,4,2,59,105,6194,6196,1,8214,99,97,108,4,4,66,76,83,84,6209,6214,6220,6231,97,114,59,1,8739,105,110,101,59,1,124,101,112,97,114,97,116,111,114,59,1,10072,105,108,100,101,59,1,8768,84,104,105,110,83,112,97,99,101,59,1,8202,114,59,3,55349,56601,112,102,59,3,55349,56653,99,114,59,3,55349,56497,100,97,115,104,59,1,8874,4,5,99,101,102,111,115,6286,6292,6298,6303,6309,105,114,99,59,1,372,100,103,101,59,1,8896,114,59,3,55349,56602,112,102,59,3,55349,56654,99,114,59,3,55349,56498,4,4,102,105,111,115,6325,6330,6333,6339,114,59,3,55349,56603,59,1,926,112,102,59,3,55349,56655,99,114,59,3,55349,56499,4,9,65,73,85,97,99,102,111,115,117,6365,6370,6375,6380,6391,6405,6410,6416,6422,99,121,59,1,1071,99,121,59,1,1031,99,121,59,1,1070,99,117,116,101,5,221,1,59,6389,1,221,4,2,105,121,6397,6402,114,99,59,1,374,59,1,1067,114,59,3,55349,56604,112,102,59,3,55349,56656,99,114,59,3,55349,56500,109,108,59,1,376,4,8,72,97,99,100,101,102,111,115,6445,6450,6457,6472,6477,6501,6505,6510,99,121,59,1,1046,99,117,116,101,59,1,377,4,2,97,121,6463,6469,114,111,110,59,1,381,59,1,1047,111,116,59,1,379,4,2,114,116,6483,6497,111,87,105,100,116,104,83,112,97,99,101,59,1,8203,97,59,1,918,114,59,1,8488,112,102,59,1,8484,99,114,59,3,55349,56501,4,16,97,98,99,101,102,103,108,109,110,111,112,114,115,116,117,119,6550,6561,6568,6612,6622,6634,6645,6672,6699,6854,6870,6923,6933,6963,6974,6983,99,117,116,101,5,225,1,59,6559,1,225,114,101,118,101,59,1,259,4,6,59,69,100,105,117,121,6582,6584,6588,6591,6600,6609,1,8766,59,3,8766,819,59,1,8767,114,99,5,226,1,59,6598,1,226,116,101,5,180,1,59,6607,1,180,59,1,1072,108,105,103,5,230,1,59,6620,1,230,4,2,59,114,6628,6630,1,8289,59,3,55349,56606,114,97,118,101,5,224,1,59,6643,1,224,4,2,101,112,6651,6667,4,2,102,112,6657,6663,115,121,109,59,1,8501,104,59,1,8501,104,97,59,1,945,4,2,97,112,6678,6692,4,2,99,108,6684,6688,114,59,1,257,103,59,1,10815,5,38,1,59,6697,1,38,4,2,100,103,6705,6737,4,5,59,97,100,115,118,6717,6719,6724,6727,6734,1,8743,110,100,59,1,10837,59,1,10844,108,111,112,101,59,1,10840,59,1,10842,4,7,59,101,108,109,114,115,122,6753,6755,6758,6762,6814,6835,6848,1,8736,59,1,10660,101,59,1,8736,115,100,4,2,59,97,6770,6772,1,8737,4,8,97,98,99,100,101,102,103,104,6790,6793,6796,6799,6802,6805,6808,6811,59,1,10664,59,1,10665,59,1,10666,59,1,10667,59,1,10668,59,1,10669,59,1,10670,59,1,10671,116,4,2,59,118,6821,6823,1,8735,98,4,2,59,100,6830,6832,1,8894,59,1,10653,4,2,112,116,6841,6845,104,59,1,8738,59,1,197,97,114,114,59,1,9084,4,2,103,112,6860,6865,111,110,59,1,261,102,59,3,55349,56658,4,7,59,69,97,101,105,111,112,6886,6888,6891,6897,6900,6904,6908,1,8776,59,1,10864,99,105,114,59,1,10863,59,1,8778,100,59,1,8779,115,59,1,39,114,111,120,4,2,59,101,6917,6919,1,8776,113,59,1,8778,105,110,103,5,229,1,59,6931,1,229,4,3,99,116,121,6941,6946,6949,114,59,3,55349,56502,59,1,42,109,112,4,2,59,101,6957,6959,1,8776,113,59,1,8781,105,108,100,101,5,227,1,59,6972,1,227,109,108,5,228,1,59,6981,1,228,4,2,99,105,6989,6997,111,110,105,110,116,59,1,8755,110,116,59,1,10769,4,16,78,97,98,99,100,101,102,105,107,108,110,111,112,114,115,117,7036,7041,7119,7135,7149,7155,7219,7224,7347,7354,7463,7489,7786,7793,7814,7866,111,116,59,1,10989,4,2,99,114,7047,7094,107,4,4,99,101,112,115,7058,7064,7073,7080,111,110,103,59,1,8780,112,115,105,108,111,110,59,1,1014,114,105,109,101,59,1,8245,105,109,4,2,59,101,7088,7090,1,8765,113,59,1,8909,4,2,118,119,7100,7105,101,101,59,1,8893,101,100,4,2,59,103,7113,7115,1,8965,101,59,1,8965,114,107,4,2,59,116,7127,7129,1,9141,98,114,107,59,1,9142,4,2,111,121,7141,7146,110,103,59,1,8780,59,1,1073,113,117,111,59,1,8222,4,5,99,109,112,114,116,7167,7181,7188,7193,7199,97,117,115,4,2,59,101,7176,7178,1,8757,59,1,8757,112,116,121,118,59,1,10672,115,105,59,1,1014,110,111,117,59,1,8492,4,3,97,104,119,7207,7210,7213,59,1,946,59,1,8502,101,101,110,59,1,8812,114,59,3,55349,56607,103,4,7,99,111,115,116,117,118,119,7241,7262,7288,7305,7328,7335,7340,4,3,97,105,117,7249,7253,7258,112,59,1,8898,114,99,59,1,9711,112,59,1,8899,4,3,100,112,116,7270,7275,7281,111,116,59,1,10752,108,117,115,59,1,10753,105,109,101,115,59,1,10754,4,2,113,116,7294,7300,99,117,112,59,1,10758,97,114,59,1,9733,114,105,97,110,103,108,101,4,2,100,117,7318,7324,111,119,110,59,1,9661,112,59,1,9651,112,108,117,115,59,1,10756,101,101,59,1,8897,101,100,103,101,59,1,8896,97,114,111,119,59,1,10509,4,3,97,107,111,7362,7436,7458,4,2,99,110,7368,7432,107,4,3,108,115,116,7377,7386,7394,111,122,101,110,103,101,59,1,10731,113,117,97,114,101,59,1,9642,114,105,97,110,103,108,101,4,4,59,100,108,114,7411,7413,7419,7425,1,9652,111,119,110,59,1,9662,101,102,116,59,1,9666,105,103,104,116,59,1,9656,107,59,1,9251,4,2,49,51,7442,7454,4,2,50,52,7448,7451,59,1,9618,59,1,9617,52,59,1,9619,99,107,59,1,9608,4,2,101,111,7469,7485,4,2,59,113,7475,7478,3,61,8421,117,105,118,59,3,8801,8421,116,59,1,8976,4,4,112,116,119,120,7499,7504,7517,7523,102,59,3,55349,56659,4,2,59,116,7510,7512,1,8869,111,109,59,1,8869,116,105,101,59,1,8904,4,12,68,72,85,86,98,100,104,109,112,116,117,118,7549,7571,7597,7619,7655,7660,7682,7708,7715,7721,7728,7750,4,4,76,82,108,114,7559,7562,7565,7568,59,1,9559,59,1,9556,59,1,9558,59,1,9555,4,5,59,68,85,100,117,7583,7585,7588,7591,7594,1,9552,59,1,9574,59,1,9577,59,1,9572,59,1,9575,4,4,76,82,108,114,7607,7610,7613,7616,59,1,9565,59,1,9562,59,1,9564,59,1,9561,4,7,59,72,76,82,104,108,114,7635,7637,7640,7643,7646,7649,7652,1,9553,59,1,9580,59,1,9571,59,1,9568,59,1,9579,59,1,9570,59,1,9567,111,120,59,1,10697,4,4,76,82,108,114,7670,7673,7676,7679,59,1,9557,59,1,9554,59,1,9488,59,1,9484,4,5,59,68,85,100,117,7694,7696,7699,7702,7705,1,9472,59,1,9573,59,1,9576,59,1,9516,59,1,9524,105,110,117,115,59,1,8863,108,117,115,59,1,8862,105,109,101,115,59,1,8864,4,4,76,82,108,114,7738,7741,7744,7747,59,1,9563,59,1,9560,59,1,9496,59,1,9492,4,7,59,72,76,82,104,108,114,7766,7768,7771,7774,7777,7780,7783,1,9474,59,1,9578,59,1,9569,59,1,9566,59,1,9532,59,1,9508,59,1,9500,114,105,109,101,59,1,8245,4,2,101,118,7799,7804,118,101,59,1,728,98,97,114,5,166,1,59,7812,1,166,4,4,99,101,105,111,7824,7829,7834,7846,114,59,3,55349,56503,109,105,59,1,8271,109,4,2,59,101,7841,7843,1,8765,59,1,8909,108,4,3,59,98,104,7855,7857,7860,1,92,59,1,10693,115,117,98,59,1,10184,4,2,108,109,7872,7885,108,4,2,59,101,7879,7881,1,8226,116,59,1,8226,112,4,3,59,69,101,7894,7896,7899,1,8782,59,1,10926,4,2,59,113,7905,7907,1,8783,59,1,8783,4,15,97,99,100,101,102,104,105,108,111,114,115,116,117,119,121,7942,8021,8075,8080,8121,8126,8157,8279,8295,8430,8446,8485,8491,8707,8726,4,3,99,112,114,7950,7956,8007,117,116,101,59,1,263,4,6,59,97,98,99,100,115,7970,7972,7977,7984,7998,8003,1,8745,110,100,59,1,10820,114,99,117,112,59,1,10825,4,2,97,117,7990,7994,112,59,1,10827,112,59,1,10823,111,116,59,1,10816,59,3,8745,65024,4,2,101,111,8013,8017,116,59,1,8257,110,59,1,711,4,4,97,101,105,117,8031,8046,8056,8061,4,2,112,114,8037,8041,115,59,1,10829,111,110,59,1,269,100,105,108,5,231,1,59,8054,1,231,114,99,59,1,265,112,115,4,2,59,115,8069,8071,1,10828,109,59,1,10832,111,116,59,1,267,4,3,100,109,110,8088,8097,8104,105,108,5,184,1,59,8095,1,184,112,116,121,118,59,1,10674,116,5,162,2,59,101,8112,8114,1,162,114,100,111,116,59,1,183,114,59,3,55349,56608,4,3,99,101,105,8134,8138,8154,121,59,1,1095,99,107,4,2,59,109,8146,8148,1,10003,97,114,107,59,1,10003,59,1,967,114,4,7,59,69,99,101,102,109,115,8174,8176,8179,8258,8261,8268,8273,1,9675,59,1,10691,4,3,59,101,108,8187,8189,8193,1,710,113,59,1,8791,101,4,2,97,100,8200,8223,114,114,111,119,4,2,108,114,8210,8216,101,102,116,59,1,8634,105,103,104,116,59,1,8635,4,5,82,83,97,99,100,8235,8238,8241,8246,8252,59,1,174,59,1,9416,115,116,59,1,8859,105,114,99,59,1,8858,97,115,104,59,1,8861,59,1,8791,110,105,110,116,59,1,10768,105,100,59,1,10991,99,105,114,59,1,10690,117,98,115,4,2,59,117,8288,8290,1,9827,105,116,59,1,9827,4,4,108,109,110,112,8305,8326,8376,8400,111,110,4,2,59,101,8313,8315,1,58,4,2,59,113,8321,8323,1,8788,59,1,8788,4,2,109,112,8332,8344,97,4,2,59,116,8339,8341,1,44,59,1,64,4,3,59,102,108,8352,8354,8358,1,8705,110,59,1,8728,101,4,2,109,120,8365,8371,101,110,116,59,1,8705,101,115,59,1,8450,4,2,103,105,8382,8395,4,2,59,100,8388,8390,1,8773,111,116,59,1,10861,110,116,59,1,8750,4,3,102,114,121,8408,8412,8417,59,3,55349,56660,111,100,59,1,8720,5,169,2,59,115,8424,8426,1,169,114,59,1,8471,4,2,97,111,8436,8441,114,114,59,1,8629,115,115,59,1,10007,4,2,99,117,8452,8457,114,59,3,55349,56504,4,2,98,112,8463,8474,4,2,59,101,8469,8471,1,10959,59,1,10961,4,2,59,101,8480,8482,1,10960,59,1,10962,100,111,116,59,1,8943,4,7,100,101,108,112,114,118,119,8507,8522,8536,8550,8600,8697,8702,97,114,114,4,2,108,114,8516,8519,59,1,10552,59,1,10549,4,2,112,115,8528,8532,114,59,1,8926,99,59,1,8927,97,114,114,4,2,59,112,8545,8547,1,8630,59,1,10557,4,6,59,98,99,100,111,115,8564,8566,8573,8587,8592,8596,1,8746,114,99,97,112,59,1,10824,4,2,97,117,8579,8583,112,59,1,10822,112,59,1,10826,111,116,59,1,8845,114,59,1,10821,59,3,8746,65024,4,4,97,108,114,118,8610,8623,8663,8672,114,114,4,2,59,109,8618,8620,1,8631,59,1,10556,121,4,3,101,118,119,8632,8651,8656,113,4,2,112,115,8639,8645,114,101,99,59,1,8926,117,99,99,59,1,8927,101,101,59,1,8910,101,100,103,101,59,1,8911,101,110,5,164,1,59,8670,1,164,101,97,114,114,111,119,4,2,108,114,8684,8690,101,102,116,59,1,8630,105,103,104,116,59,1,8631,101,101,59,1,8910,101,100,59,1,8911,4,2,99,105,8713,8721,111,110,105,110,116,59,1,8754,110,116,59,1,8753,108,99,116,121,59,1,9005,4,19,65,72,97,98,99,100,101,102,104,105,106,108,111,114,115,116,117,119,122,8773,8778,8783,8821,8839,8854,8887,8914,8930,8944,9036,9041,9058,9197,9227,9258,9281,9297,9305,114,114,59,1,8659,97,114,59,1,10597,4,4,103,108,114,115,8793,8799,8805,8809,103,101,114,59,1,8224,101,116,104,59,1,8504,114,59,1,8595,104,4,2,59,118,8816,8818,1,8208,59,1,8867,4,2,107,108,8827,8834,97,114,111,119,59,1,10511,97,99,59,1,733,4,2,97,121,8845,8851,114,111,110,59,1,271,59,1,1076,4,3,59,97,111,8862,8864,8880,1,8518,4,2,103,114,8870,8876,103,101,114,59,1,8225,114,59,1,8650,116,115,101,113,59,1,10871,4,3,103,108,109,8895,8902,8907,5,176,1,59,8900,1,176,116,97,59,1,948,112,116,121,118,59,1,10673,4,2,105,114,8920,8926,115,104,116,59,1,10623,59,3,55349,56609,97,114,4,2,108,114,8938,8941,59,1,8643,59,1,8642,4,5,97,101,103,115,118,8956,8986,8989,8996,9001,109,4,3,59,111,115,8965,8967,8983,1,8900,110,100,4,2,59,115,8975,8977,1,8900,117,105,116,59,1,9830,59,1,9830,59,1,168,97,109,109,97,59,1,989,105,110,59,1,8946,4,3,59,105,111,9009,9011,9031,1,247,100,101,5,247,2,59,111,9020,9022,1,247,110,116,105,109,101,115,59,1,8903,110,120,59,1,8903,99,121,59,1,1106,99,4,2,111,114,9048,9053,114,110,59,1,8990,111,112,59,1,8973,4,5,108,112,116,117,119,9070,9076,9081,9130,9144,108,97,114,59,1,36,102,59,3,55349,56661,4,5,59,101,109,112,115,9093,9095,9109,9116,9122,1,729,113,4,2,59,100,9102,9104,1,8784,111,116,59,1,8785,105,110,117,115,59,1,8760,108,117,115,59,1,8724,113,117,97,114,101,59,1,8865,98,108,101,98,97,114,119,101,100,103,101,59,1,8966,110,4,3,97,100,104,9153,9160,9172,114,114,111,119,59,1,8595,111,119,110,97,114,114,111,119,115,59,1,8650,97,114,112,111,111,110,4,2,108,114,9184,9190,101,102,116,59,1,8643,105,103,104,116,59,1,8642,4,2,98,99,9203,9211,107,97,114,111,119,59,1,10512,4,2,111,114,9217,9222,114,110,59,1,8991,111,112,59,1,8972,4,3,99,111,116,9235,9248,9252,4,2,114,121,9241,9245,59,3,55349,56505,59,1,1109,108,59,1,10742,114,111,107,59,1,273,4,2,100,114,9264,9269,111,116,59,1,8945,105,4,2,59,102,9276,9278,1,9663,59,1,9662,4,2,97,104,9287,9292,114,114,59,1,8693,97,114,59,1,10607,97,110,103,108,101,59,1,10662,4,2,99,105,9311,9315,121,59,1,1119,103,114,97,114,114,59,1,10239,4,18,68,97,99,100,101,102,103,108,109,110,111,112,113,114,115,116,117,120,9361,9376,9398,9439,9444,9447,9462,9495,9531,9585,9598,9614,9659,9755,9771,9792,9808,9826,4,2,68,111,9367,9372,111,116,59,1,10871,116,59,1,8785,4,2,99,115,9382,9392,117,116,101,5,233,1,59,9390,1,233,116,101,114,59,1,10862,4,4,97,105,111,121,9408,9414,9430,9436,114,111,110,59,1,283,114,4,2,59,99,9421,9423,1,8790,5,234,1,59,9428,1,234,108,111,110,59,1,8789,59,1,1101,111,116,59,1,279,59,1,8519,4,2,68,114,9453,9458,111,116,59,1,8786,59,3,55349,56610,4,3,59,114,115,9470,9472,9482,1,10906,97,118,101,5,232,1,59,9480,1,232,4,2,59,100,9488,9490,1,10902,111,116,59,1,10904,4,4,59,105,108,115,9505,9507,9515,9518,1,10905,110,116,101,114,115,59,1,9191,59,1,8467,4,2,59,100,9524,9526,1,10901,111,116,59,1,10903,4,3,97,112,115,9539,9544,9564,99,114,59,1,275,116,121,4,3,59,115,118,9554,9556,9561,1,8709,101,116,59,1,8709,59,1,8709,112,4,2,49,59,9571,9583,4,2,51,52,9577,9580,59,1,8196,59,1,8197,1,8195,4,2,103,115,9591,9594,59,1,331,112,59,1,8194,4,2,103,112,9604,9609,111,110,59,1,281,102,59,3,55349,56662,4,3,97,108,115,9622,9635,9640,114,4,2,59,115,9629,9631,1,8917,108,59,1,10723,117,115,59,1,10865,105,4,3,59,108,118,9649,9651,9656,1,949,111,110,59,1,949,59,1,1013,4,4,99,115,117,118,9669,9686,9716,9747,4,2,105,111,9675,9680,114,99,59,1,8790,108,111,110,59,1,8789,4,2,105,108,9692,9696,109,59,1,8770,97,110,116,4,2,103,108,9705,9710,116,114,59,1,10902,101,115,115,59,1,10901,4,3,97,101,105,9724,9729,9734,108,115,59,1,61,115,116,59,1,8799,118,4,2,59,68,9741,9743,1,8801,68,59,1,10872,112,97,114,115,108,59,1,10725,4,2,68,97,9761,9766,111,116,59,1,8787,114,114,59,1,10609,4,3,99,100,105,9779,9783,9788,114,59,1,8495,111,116,59,1,8784,109,59,1,8770,4,2,97,104,9798,9801,59,1,951,5,240,1,59,9806,1,240,4,2,109,114,9814,9822,108,5,235,1,59,9820,1,235,111,59,1,8364,4,3,99,105,112,9834,9838,9843,108,59,1,33,115,116,59,1,8707,4,2,101,111,9849,9859,99,116,97,116,105,111,110,59,1,8496,110,101,110,116,105,97,108,101,59,1,8519,4,12,97,99,101,102,105,106,108,110,111,112,114,115,9896,9910,9914,9921,9954,9960,9967,9989,9994,10027,10036,10164,108,108,105,110,103,100,111,116,115,101,113,59,1,8786,121,59,1,1092,109,97,108,101,59,1,9792,4,3,105,108,114,9929,9935,9950,108,105,103,59,1,64259,4,2,105,108,9941,9945,103,59,1,64256,105,103,59,1,64260,59,3,55349,56611,108,105,103,59,1,64257,108,105,103,59,3,102,106,4,3,97,108,116,9975,9979,9984,116,59,1,9837,105,103,59,1,64258,110,115,59,1,9649,111,102,59,1,402,4,2,112,114,10000,10005,102,59,3,55349,56663,4,2,97,107,10011,10016,108,108,59,1,8704,4,2,59,118,10022,10024,1,8916,59,1,10969,97,114,116,105,110,116,59,1,10765,4,2,97,111,10042,10159,4,2,99,115,10048,10155,4,6,49,50,51,52,53,55,10062,10102,10114,10135,10139,10151,4,6,50,51,52,53,54,56,10076,10083,10086,10093,10096,10099,5,189,1,59,10081,1,189,59,1,8531,5,188,1,59,10091,1,188,59,1,8533,59,1,8537,59,1,8539,4,2,51,53,10108,10111,59,1,8532,59,1,8534,4,3,52,53,56,10122,10129,10132,5,190,1,59,10127,1,190,59,1,8535,59,1,8540,53,59,1,8536,4,2,54,56,10145,10148,59,1,8538,59,1,8541,56,59,1,8542,108,59,1,8260,119,110,59,1,8994,99,114,59,3,55349,56507,4,17,69,97,98,99,100,101,102,103,105,106,108,110,111,114,115,116,118,10206,10217,10247,10254,10268,10273,10358,10363,10374,10380,10385,10406,10458,10464,10470,10497,10610,4,2,59,108,10212,10214,1,8807,59,1,10892,4,3,99,109,112,10225,10231,10244,117,116,101,59,1,501,109,97,4,2,59,100,10239,10241,1,947,59,1,989,59,1,10886,114,101,118,101,59,1,287,4,2,105,121,10260,10265,114,99,59,1,285,59,1,1075,111,116,59,1,289,4,4,59,108,113,115,10283,10285,10288,10308,1,8805,59,1,8923,4,3,59,113,115,10296,10298,10301,1,8805,59,1,8807,108,97,110,116,59,1,10878,4,4,59,99,100,108,10318,10320,10324,10345,1,10878,99,59,1,10921,111,116,4,2,59,111,10332,10334,1,10880,4,2,59,108,10340,10342,1,10882,59,1,10884,4,2,59,101,10351,10354,3,8923,65024,115,59,1,10900,114,59,3,55349,56612,4,2,59,103,10369,10371,1,8811,59,1,8921,109,101,108,59,1,8503,99,121,59,1,1107,4,4,59,69,97,106,10395,10397,10400,10403,1,8823,59,1,10898,59,1,10917,59,1,10916,4,4,69,97,101,115,10416,10419,10434,10453,59,1,8809,112,4,2,59,112,10426,10428,1,10890,114,111,120,59,1,10890,4,2,59,113,10440,10442,1,10888,4,2,59,113,10448,10450,1,10888,59,1,8809,105,109,59,1,8935,112,102,59,3,55349,56664,97,118,101,59,1,96,4,2,99,105,10476,10480,114,59,1,8458,109,4,3,59,101,108,10489,10491,10494,1,8819,59,1,10894,59,1,10896,5,62,6,59,99,100,108,113,114,10512,10514,10527,10532,10538,10545,1,62,4,2,99,105,10520,10523,59,1,10919,114,59,1,10874,111,116,59,1,8919,80,97,114,59,1,10645,117,101,115,116,59,1,10876,4,5,97,100,101,108,115,10557,10574,10579,10599,10605,4,2,112,114,10563,10570,112,114,111,120,59,1,10886,114,59,1,10616,111,116,59,1,8919,113,4,2,108,113,10586,10592,101,115,115,59,1,8923,108,101,115,115,59,1,10892,101,115,115,59,1,8823,105,109,59,1,8819,4,2,101,110,10616,10626,114,116,110,101,113,113,59,3,8809,65024,69,59,3,8809,65024,4,10,65,97,98,99,101,102,107,111,115,121,10653,10658,10713,10718,10724,10760,10765,10786,10850,10875,114,114,59,1,8660,4,4,105,108,109,114,10668,10674,10678,10684,114,115,112,59,1,8202,102,59,1,189,105,108,116,59,1,8459,4,2,100,114,10690,10695,99,121,59,1,1098,4,3,59,99,119,10703,10705,10710,1,8596,105,114,59,1,10568,59,1,8621,97,114,59,1,8463,105,114,99,59,1,293,4,3,97,108,114,10732,10748,10754,114,116,115,4,2,59,117,10741,10743,1,9829,105,116,59,1,9829,108,105,112,59,1,8230,99,111,110,59,1,8889,114,59,3,55349,56613,115,4,2,101,119,10772,10779,97,114,111,119,59,1,10533,97,114,111,119,59,1,10534,4,5,97,109,111,112,114,10798,10803,10809,10839,10844,114,114,59,1,8703,116,104,116,59,1,8763,107,4,2,108,114,10816,10827,101,102,116,97,114,114,111,119,59,1,8617,105,103,104,116,97,114,114,111,119,59,1,8618,102,59,3,55349,56665,98,97,114,59,1,8213,4,3,99,108,116,10858,10863,10869,114,59,3,55349,56509,97,115,104,59,1,8463,114,111,107,59,1,295,4,2,98,112,10881,10887,117,108,108,59,1,8259,104,101,110,59,1,8208,4,15,97,99,101,102,103,105,106,109,110,111,112,113,115,116,117,10925,10936,10958,10977,10990,11001,11039,11045,11101,11192,11220,11226,11237,11285,11299,99,117,116,101,5,237,1,59,10934,1,237,4,3,59,105,121,10944,10946,10955,1,8291,114,99,5,238,1,59,10953,1,238,59,1,1080,4,2,99,120,10964,10968,121,59,1,1077,99,108,5,161,1,59,10975,1,161,4,2,102,114,10983,10986,59,1,8660,59,3,55349,56614,114,97,118,101,5,236,1,59,10999,1,236,4,4,59,105,110,111,11011,11013,11028,11034,1,8520,4,2,105,110,11019,11024,110,116,59,1,10764,116,59,1,8749,102,105,110,59,1,10716,116,97,59,1,8489,108,105,103,59,1,307,4,3,97,111,112,11053,11092,11096,4,3,99,103,116,11061,11065,11088,114,59,1,299,4,3,101,108,112,11073,11076,11082,59,1,8465,105,110,101,59,1,8464,97,114,116,59,1,8465,104,59,1,305,102,59,1,8887,101,100,59,1,437,4,5,59,99,102,111,116,11113,11115,11121,11136,11142,1,8712,97,114,101,59,1,8453,105,110,4,2,59,116,11129,11131,1,8734,105,101,59,1,10717,100,111,116,59,1,305,4,5,59,99,101,108,112,11154,11156,11161,11179,11186,1,8747,97,108,59,1,8890,4,2,103,114,11167,11173,101,114,115,59,1,8484,99,97,108,59,1,8890,97,114,104,107,59,1,10775,114,111,100,59,1,10812,4,4,99,103,112,116,11202,11206,11211,11216,121,59,1,1105,111,110,59,1,303,102,59,3,55349,56666,97,59,1,953,114,111,100,59,1,10812,117,101,115,116,5,191,1,59,11235,1,191,4,2,99,105,11243,11248,114,59,3,55349,56510,110,4,5,59,69,100,115,118,11261,11263,11266,11271,11282,1,8712,59,1,8953,111,116,59,1,8949,4,2,59,118,11277,11279,1,8948,59,1,8947,59,1,8712,4,2,59,105,11291,11293,1,8290,108,100,101,59,1,297,4,2,107,109,11305,11310,99,121,59,1,1110,108,5,239,1,59,11316,1,239,4,6,99,102,109,111,115,117,11332,11346,11351,11357,11363,11380,4,2,105,121,11338,11343,114,99,59,1,309,59,1,1081,114,59,3,55349,56615,97,116,104,59,1,567,112,102,59,3,55349,56667,4,2,99,101,11369,11374,114,59,3,55349,56511,114,99,121,59,1,1112,107,99,121,59,1,1108,4,8,97,99,102,103,104,106,111,115,11404,11418,11433,11438,11445,11450,11455,11461,112,112,97,4,2,59,118,11413,11415,1,954,59,1,1008,4,2,101,121,11424,11430,100,105,108,59,1,311,59,1,1082,114,59,3,55349,56616,114,101,101,110,59,1,312,99,121,59,1,1093,99,121,59,1,1116,112,102,59,3,55349,56668,99,114,59,3,55349,56512,4,23,65,66,69,72,97,98,99,100,101,102,103,104,106,108,109,110,111,112,114,115,116,117,118,11515,11538,11544,11555,11560,11721,11780,11818,11868,12136,12160,12171,12203,12208,12246,12275,12327,12509,12523,12569,12641,12732,12752,4,3,97,114,116,11523,11528,11532,114,114,59,1,8666,114,59,1,8656,97,105,108,59,1,10523,97,114,114,59,1,10510,4,2,59,103,11550,11552,1,8806,59,1,10891,97,114,59,1,10594,4,9,99,101,103,109,110,112,113,114,116,11580,11586,11594,11600,11606,11624,11627,11636,11694,117,116,101,59,1,314,109,112,116,121,118,59,1,10676,114,97,110,59,1,8466,98,100,97,59,1,955,103,4,3,59,100,108,11615,11617,11620,1,10216,59,1,10641,101,59,1,10216,59,1,10885,117,111,5,171,1,59,11634,1,171,114,4,8,59,98,102,104,108,112,115,116,11655,11657,11669,11673,11677,11681,11685,11690,1,8592,4,2,59,102,11663,11665,1,8676,115,59,1,10527,115,59,1,10525,107,59,1,8617,112,59,1,8619,108,59,1,10553,105,109,59,1,10611,108,59,1,8610,4,3,59,97,101,11702,11704,11709,1,10923,105,108,59,1,10521,4,2,59,115,11715,11717,1,10925,59,3,10925,65024,4,3,97,98,114,11729,11734,11739,114,114,59,1,10508,114,107,59,1,10098,4,2,97,107,11745,11758,99,4,2,101,107,11752,11755,59,1,123,59,1,91,4,2,101,115,11764,11767,59,1,10635,108,4,2,100,117,11774,11777,59,1,10639,59,1,10637,4,4,97,101,117,121,11790,11796,11811,11815,114,111,110,59,1,318,4,2,100,105,11802,11807,105,108,59,1,316,108,59,1,8968,98,59,1,123,59,1,1083,4,4,99,113,114,115,11828,11832,11845,11864,97,59,1,10550,117,111,4,2,59,114,11840,11842,1,8220,59,1,8222,4,2,100,117,11851,11857,104,97,114,59,1,10599,115,104,97,114,59,1,10571,104,59,1,8626,4,5,59,102,103,113,115,11880,11882,12008,12011,12031,1,8804,116,4,5,97,104,108,114,116,11895,11913,11935,11947,11996,114,114,111,119,4,2,59,116,11905,11907,1,8592,97,105,108,59,1,8610,97,114,112,111,111,110,4,2,100,117,11925,11931,111,119,110,59,1,8637,112,59,1,8636,101,102,116,97,114,114,111,119,115,59,1,8647,105,103,104,116,4,3,97,104,115,11959,11974,11984,114,114,111,119,4,2,59,115,11969,11971,1,8596,59,1,8646,97,114,112,111,111,110,115,59,1,8651,113,117,105,103,97,114,114,111,119,59,1,8621,104,114,101,101,116,105,109,101,115,59,1,8907,59,1,8922,4,3,59,113,115,12019,12021,12024,1,8804,59,1,8806,108,97,110,116,59,1,10877,4,5,59,99,100,103,115,12043,12045,12049,12070,12083,1,10877,99,59,1,10920,111,116,4,2,59,111,12057,12059,1,10879,4,2,59,114,12065,12067,1,10881,59,1,10883,4,2,59,101,12076,12079,3,8922,65024,115,59,1,10899,4,5,97,100,101,103,115,12095,12103,12108,12126,12131,112,112,114,111,120,59,1,10885,111,116,59,1,8918,113,4,2,103,113,12115,12120,116,114,59,1,8922,103,116,114,59,1,10891,116,114,59,1,8822,105,109,59,1,8818,4,3,105,108,114,12144,12150,12156,115,104,116,59,1,10620,111,111,114,59,1,8970,59,3,55349,56617,4,2,59,69,12166,12168,1,8822,59,1,10897,4,2,97,98,12177,12198,114,4,2,100,117,12184,12187,59,1,8637,4,2,59,108,12193,12195,1,8636,59,1,10602,108,107,59,1,9604,99,121,59,1,1113,4,5,59,97,99,104,116,12220,12222,12227,12235,12241,1,8810,114,114,59,1,8647,111,114,110,101,114,59,1,8990,97,114,100,59,1,10603,114,105,59,1,9722,4,2,105,111,12252,12258,100,111,116,59,1,320,117,115,116,4,2,59,97,12267,12269,1,9136,99,104,101,59,1,9136,4,4,69,97,101,115,12285,12288,12303,12322,59,1,8808,112,4,2,59,112,12295,12297,1,10889,114,111,120,59,1,10889,4,2,59,113,12309,12311,1,10887,4,2,59,113,12317,12319,1,10887,59,1,8808,105,109,59,1,8934,4,8,97,98,110,111,112,116,119,122,12345,12359,12364,12421,12446,12467,12474,12490,4,2,110,114,12351,12355,103,59,1,10220,114,59,1,8701,114,107,59,1,10214,103,4,3,108,109,114,12373,12401,12409,101,102,116,4,2,97,114,12382,12389,114,114,111,119,59,1,10229,105,103,104,116,97,114,114,111,119,59,1,10231,97,112,115,116,111,59,1,10236,105,103,104,116,97,114,114,111,119,59,1,10230,112,97,114,114,111,119,4,2,108,114,12433,12439,101,102,116,59,1,8619,105,103,104,116,59,1,8620,4,3,97,102,108,12454,12458,12462,114,59,1,10629,59,3,55349,56669,117,115,59,1,10797,105,109,101,115,59,1,10804,4,2,97,98,12480,12485,115,116,59,1,8727,97,114,59,1,95,4,3,59,101,102,12498,12500,12506,1,9674,110,103,101,59,1,9674,59,1,10731,97,114,4,2,59,108,12517,12519,1,40,116,59,1,10643,4,5,97,99,104,109,116,12535,12540,12548,12561,12564,114,114,59,1,8646,111,114,110,101,114,59,1,8991,97,114,4,2,59,100,12556,12558,1,8651,59,1,10605,59,1,8206,114,105,59,1,8895,4,6,97,99,104,105,113,116,12583,12589,12594,12597,12614,12635,113,117,111,59,1,8249,114,59,3,55349,56513,59,1,8624,109,4,3,59,101,103,12606,12608,12611,1,8818,59,1,10893,59,1,10895,4,2,98,117,12620,12623,59,1,91,111,4,2,59,114,12630,12632,1,8216,59,1,8218,114,111,107,59,1,322,5,60,8,59,99,100,104,105,108,113,114,12660,12662,12675,12680,12686,12692,12698,12705,1,60,4,2,99,105,12668,12671,59,1,10918,114,59,1,10873,111,116,59,1,8918,114,101,101,59,1,8907,109,101,115,59,1,8905,97,114,114,59,1,10614,117,101,115,116,59,1,10875,4,2,80,105,12711,12716,97,114,59,1,10646,4,3,59,101,102,12724,12726,12729,1,9667,59,1,8884,59,1,9666,114,4,2,100,117,12739,12746,115,104,97,114,59,1,10570,104,97,114,59,1,10598,4,2,101,110,12758,12768,114,116,110,101,113,113,59,3,8808,65024,69,59,3,8808,65024,4,14,68,97,99,100,101,102,104,105,108,110,111,112,115,117,12803,12809,12893,12908,12914,12928,12933,12937,13011,13025,13032,13049,13052,13069,68,111,116,59,1,8762,4,4,99,108,112,114,12819,12827,12849,12887,114,5,175,1,59,12825,1,175,4,2,101,116,12833,12836,59,1,9794,4,2,59,101,12842,12844,1,10016,115,101,59,1,10016,4,2,59,115,12855,12857,1,8614,116,111,4,4,59,100,108,117,12869,12871,12877,12883,1,8614,111,119,110,59,1,8615,101,102,116,59,1,8612,112,59,1,8613,107,101,114,59,1,9646,4,2,111,121,12899,12905,109,109,97,59,1,10793,59,1,1084,97,115,104,59,1,8212,97,115,117,114,101,100,97,110,103,108,101,59,1,8737,114,59,3,55349,56618,111,59,1,8487,4,3,99,100,110,12945,12954,12985,114,111,5,181,1,59,12952,1,181,4,4,59,97,99,100,12964,12966,12971,12976,1,8739,115,116,59,1,42,105,114,59,1,10992,111,116,5,183,1,59,12983,1,183,117,115,4,3,59,98,100,12995,12997,13000,1,8722,59,1,8863,4,2,59,117,13006,13008,1,8760,59,1,10794,4,2,99,100,13017,13021,112,59,1,10971,114,59,1,8230,112,108,117,115,59,1,8723,4,2,100,112,13038,13044,101,108,115,59,1,8871,102,59,3,55349,56670,59,1,8723,4,2,99,116,13058,13063,114,59,3,55349,56514,112,111,115,59,1,8766,4,3,59,108,109,13077,13079,13087,1,956,116,105,109,97,112,59,1,8888,97,112,59,1,8888,4,24,71,76,82,86,97,98,99,100,101,102,103,104,105,106,108,109,111,112,114,115,116,117,118,119,13142,13165,13217,13229,13247,13330,13359,13414,13420,13508,13513,13579,13602,13626,13631,13762,13767,13855,13936,13995,14214,14285,14312,14432,4,2,103,116,13148,13152,59,3,8921,824,4,2,59,118,13158,13161,3,8811,8402,59,3,8811,824,4,3,101,108,116,13173,13200,13204,102,116,4,2,97,114,13181,13188,114,114,111,119,59,1,8653,105,103,104,116,97,114,114,111,119,59,1,8654,59,3,8920,824,4,2,59,118,13210,13213,3,8810,8402,59,3,8810,824,105,103,104,116,97,114,114,111,119,59,1,8655,4,2,68,100,13235,13241,97,115,104,59,1,8879,97,115,104,59,1,8878,4,5,98,99,110,112,116,13259,13264,13270,13275,13308,108,97,59,1,8711,117,116,101,59,1,324,103,59,3,8736,8402,4,5,59,69,105,111,112,13287,13289,13293,13298,13302,1,8777,59,3,10864,824,100,59,3,8779,824,115,59,1,329,114,111,120,59,1,8777,117,114,4,2,59,97,13316,13318,1,9838,108,4,2,59,115,13325,13327,1,9838,59,1,8469,4,2,115,117,13336,13344,112,5,160,1,59,13342,1,160,109,112,4,2,59,101,13352,13355,3,8782,824,59,3,8783,824,4,5,97,101,111,117,121,13371,13385,13391,13407,13411,4,2,112,114,13377,13380,59,1,10819,111,110,59,1,328,100,105,108,59,1,326,110,103,4,2,59,100,13399,13401,1,8775,111,116,59,3,10861,824,112,59,1,10818,59,1,1085,97,115,104,59,1,8211,4,7,59,65,97,100,113,115,120,13436,13438,13443,13466,13472,13478,13494,1,8800,114,114,59,1,8663,114,4,2,104,114,13450,13454,107,59,1,10532,4,2,59,111,13460,13462,1,8599,119,59,1,8599,111,116,59,3,8784,824,117,105,118,59,1,8802,4,2,101,105,13484,13489,97,114,59,1,10536,109,59,3,8770,824,105,115,116,4,2,59,115,13503,13505,1,8708,59,1,8708,114,59,3,55349,56619,4,4,69,101,115,116,13523,13527,13563,13568,59,3,8807,824,4,3,59,113,115,13535,13537,13559,1,8817,4,3,59,113,115,13545,13547,13551,1,8817,59,3,8807,824,108,97,110,116,59,3,10878,824,59,3,10878,824,105,109,59,1,8821,4,2,59,114,13574,13576,1,8815,59,1,8815,4,3,65,97,112,13587,13592,13597,114,114,59,1,8654,114,114,59,1,8622,97,114,59,1,10994,4,3,59,115,118,13610,13612,13623,1,8715,4,2,59,100,13618,13620,1,8956,59,1,8954,59,1,8715,99,121,59,1,1114,4,7,65,69,97,100,101,115,116,13647,13652,13656,13661,13665,13737,13742,114,114,59,1,8653,59,3,8806,824,114,114,59,1,8602,114,59,1,8229,4,4,59,102,113,115,13675,13677,13703,13725,1,8816,116,4,2,97,114,13684,13691,114,114,111,119,59,1,8602,105,103,104,116,97,114,114,111,119,59,1,8622,4,3,59,113,115,13711,13713,13717,1,8816,59,3,8806,824,108,97,110,116,59,3,10877,824,4,2,59,115,13731,13734,3,10877,824,59,1,8814,105,109,59,1,8820,4,2,59,114,13748,13750,1,8814,105,4,2,59,101,13757,13759,1,8938,59,1,8940,105,100,59,1,8740,4,2,112,116,13773,13778,102,59,3,55349,56671,5,172,3,59,105,110,13787,13789,13829,1,172,110,4,4,59,69,100,118,13800,13802,13806,13812,1,8713,59,3,8953,824,111,116,59,3,8949,824,4,3,97,98,99,13820,13823,13826,59,1,8713,59,1,8951,59,1,8950,105,4,2,59,118,13836,13838,1,8716,4,3,97,98,99,13846,13849,13852,59,1,8716,59,1,8958,59,1,8957,4,3,97,111,114,13863,13892,13899,114,4,4,59,97,115,116,13874,13876,13883,13888,1,8742,108,108,101,108,59,1,8742,108,59,3,11005,8421,59,3,8706,824,108,105,110,116,59,1,10772,4,3,59,99,101,13907,13909,13914,1,8832,117,101,59,1,8928,4,2,59,99,13920,13923,3,10927,824,4,2,59,101,13929,13931,1,8832,113,59,3,10927,824,4,4,65,97,105,116,13946,13951,13971,13982,114,114,59,1,8655,114,114,4,3,59,99,119,13961,13963,13967,1,8603,59,3,10547,824,59,3,8605,824,103,104,116,97,114,114,111,119,59,1,8603,114,105,4,2,59,101,13990,13992,1,8939,59,1,8941,4,7,99,104,105,109,112,113,117,14011,14036,14060,14080,14085,14090,14106,4,4,59,99,101,114,14021,14023,14028,14032,1,8833,117,101,59,1,8929,59,3,10928,824,59,3,55349,56515,111,114,116,4,2,109,112,14045,14050,105,100,59,1,8740,97,114,97,108,108,101,108,59,1,8742,109,4,2,59,101,14067,14069,1,8769,4,2,59,113,14075,14077,1,8772,59,1,8772,105,100,59,1,8740,97,114,59,1,8742,115,117,4,2,98,112,14098,14102,101,59,1,8930,101,59,1,8931,4,3,98,99,112,14114,14157,14171,4,4,59,69,101,115,14124,14126,14130,14133,1,8836,59,3,10949,824,59,1,8840,101,116,4,2,59,101,14141,14144,3,8834,8402,113,4,2,59,113,14151,14153,1,8840,59,3,10949,824,99,4,2,59,101,14164,14166,1,8833,113,59,3,10928,824,4,4,59,69,101,115,14181,14183,14187,14190,1,8837,59,3,10950,824,59,1,8841,101,116,4,2,59,101,14198,14201,3,8835,8402,113,4,2,59,113,14208,14210,1,8841,59,3,10950,824,4,4,103,105,108,114,14224,14228,14238,14242,108,59,1,8825,108,100,101,5,241,1,59,14236,1,241,103,59,1,8824,105,97,110,103,108,101,4,2,108,114,14254,14269,101,102,116,4,2,59,101,14263,14265,1,8938,113,59,1,8940,105,103,104,116,4,2,59,101,14279,14281,1,8939,113,59,1,8941,4,2,59,109,14291,14293,1,957,4,3,59,101,115,14301,14303,14308,1,35,114,111,59,1,8470,112,59,1,8199,4,9,68,72,97,100,103,105,108,114,115,14332,14338,14344,14349,14355,14369,14376,14408,14426,97,115,104,59,1,8877,97,114,114,59,1,10500,112,59,3,8781,8402,97,115,104,59,1,8876,4,2,101,116,14361,14365,59,3,8805,8402,59,3,62,8402,110,102,105,110,59,1,10718,4,3,65,101,116,14384,14389,14393,114,114,59,1,10498,59,3,8804,8402,4,2,59,114,14399,14402,3,60,8402,105,101,59,3,8884,8402,4,2,65,116,14414,14419,114,114,59,1,10499,114,105,101,59,3,8885,8402,105,109,59,3,8764,8402,4,3,65,97,110,14440,14445,14468,114,114,59,1,8662,114,4,2,104,114,14452,14456,107,59,1,10531,4,2,59,111,14462,14464,1,8598,119,59,1,8598,101,97,114,59,1,10535,4,18,83,97,99,100,101,102,103,104,105,108,109,111,112,114,115,116,117,118,14512,14515,14535,14560,14597,14603,14618,14643,14657,14662,14701,14741,14747,14769,14851,14877,14907,14916,59,1,9416,4,2,99,115,14521,14531,117,116,101,5,243,1,59,14529,1,243,116,59,1,8859,4,2,105,121,14541,14557,114,4,2,59,99,14548,14550,1,8858,5,244,1,59,14555,1,244,59,1,1086,4,5,97,98,105,111,115,14572,14577,14583,14587,14591,115,104,59,1,8861,108,97,99,59,1,337,118,59,1,10808,116,59,1,8857,111,108,100,59,1,10684,108,105,103,59,1,339,4,2,99,114,14609,14614,105,114,59,1,10687,59,3,55349,56620,4,3,111,114,116,14626,14630,14640,110,59,1,731,97,118,101,5,242,1,59,14638,1,242,59,1,10689,4,2,98,109,14649,14654,97,114,59,1,10677,59,1,937,110,116,59,1,8750,4,4,97,99,105,116,14672,14677,14693,14698,114,114,59,1,8634,4,2,105,114,14683,14687,114,59,1,10686,111,115,115,59,1,10683,110,101,59,1,8254,59,1,10688,4,3,97,101,105,14709,14714,14719,99,114,59,1,333,103,97,59,1,969,4,3,99,100,110,14727,14733,14736,114,111,110,59,1,959,59,1,10678,117,115,59,1,8854,112,102,59,3,55349,56672,4,3,97,101,108,14755,14759,14764,114,59,1,10679,114,112,59,1,10681,117,115,59,1,8853,4,7,59,97,100,105,111,115,118,14785,14787,14792,14831,14837,14841,14848,1,8744,114,114,59,1,8635,4,4,59,101,102,109,14802,14804,14817,14824,1,10845,114,4,2,59,111,14811,14813,1,8500,102,59,1,8500,5,170,1,59,14822,1,170,5,186,1,59,14829,1,186,103,111,102,59,1,8886,114,59,1,10838,108,111,112,101,59,1,10839,59,1,10843,4,3,99,108,111,14859,14863,14873,114,59,1,8500,97,115,104,5,248,1,59,14871,1,248,108,59,1,8856,105,4,2,108,109,14884,14893,100,101,5,245,1,59,14891,1,245,101,115,4,2,59,97,14901,14903,1,8855,115,59,1,10806,109,108,5,246,1,59,14914,1,246,98,97,114,59,1,9021,4,12,97,99,101,102,104,105,108,109,111,114,115,117,14948,14992,14996,15033,15038,15068,15090,15189,15192,15222,15427,15441,114,4,4,59,97,115,116,14959,14961,14976,14989,1,8741,5,182,2,59,108,14968,14970,1,182,108,101,108,59,1,8741,4,2,105,108,14982,14986,109,59,1,10995,59,1,11005,59,1,8706,121,59,1,1087,114,4,5,99,105,109,112,116,15009,15014,15019,15024,15027,110,116,59,1,37,111,100,59,1,46,105,108,59,1,8240,59,1,8869,101,110,107,59,1,8241,114,59,3,55349,56621,4,3,105,109,111,15046,15057,15063,4,2,59,118,15052,15054,1,966,59,1,981,109,97,116,59,1,8499,110,101,59,1,9742,4,3,59,116,118,15076,15078,15087,1,960,99,104,102,111,114,107,59,1,8916,59,1,982,4,2,97,117,15096,15119,110,4,2,99,107,15103,15115,107,4,2,59,104,15110,15112,1,8463,59,1,8462,118,59,1,8463,115,4,9,59,97,98,99,100,101,109,115,116,15140,15142,15148,15151,15156,15168,15171,15179,15184,1,43,99,105,114,59,1,10787,59,1,8862,105,114,59,1,10786,4,2,111,117,15162,15165,59,1,8724,59,1,10789,59,1,10866,110,5,177,1,59,15177,1,177,105,109,59,1,10790,119,111,59,1,10791,59,1,177,4,3,105,112,117,15200,15208,15213,110,116,105,110,116,59,1,10773,102,59,3,55349,56673,110,100,5,163,1,59,15220,1,163,4,10,59,69,97,99,101,105,110,111,115,117,15244,15246,15249,15253,15258,15334,15347,15367,15416,15421,1,8826,59,1,10931,112,59,1,10935,117,101,59,1,8828,4,2,59,99,15264,15266,1,10927,4,6,59,97,99,101,110,115,15280,15282,15290,15299,15303,15329,1,8826,112,112,114,111,120,59,1,10935,117,114,108,121,101,113,59,1,8828,113,59,1,10927,4,3,97,101,115,15311,15319,15324,112,112,114,111,120,59,1,10937,113,113,59,1,10933,105,109,59,1,8936,105,109,59,1,8830,109,101,4,2,59,115,15342,15344,1,8242,59,1,8473,4,3,69,97,115,15355,15358,15362,59,1,10933,112,59,1,10937,105,109,59,1,8936,4,3,100,102,112,15375,15378,15404,59,1,8719,4,3,97,108,115,15386,15392,15398,108,97,114,59,1,9006,105,110,101,59,1,8978,117,114,102,59,1,8979,4,2,59,116,15410,15412,1,8733,111,59,1,8733,105,109,59,1,8830,114,101,108,59,1,8880,4,2,99,105,15433,15438,114,59,3,55349,56517,59,1,968,110,99,115,112,59,1,8200,4,6,102,105,111,112,115,117,15462,15467,15472,15478,15485,15491,114,59,3,55349,56622,110,116,59,1,10764,112,102,59,3,55349,56674,114,105,109,101,59,1,8279,99,114,59,3,55349,56518,4,3,97,101,111,15499,15520,15534,116,4,2,101,105,15506,15515,114,110,105,111,110,115,59,1,8461,110,116,59,1,10774,115,116,4,2,59,101,15528,15530,1,63,113,59,1,8799,116,5,34,1,59,15540,1,34,4,21,65,66,72,97,98,99,100,101,102,104,105,108,109,110,111,112,114,115,116,117,120,15586,15609,15615,15620,15796,15855,15893,15931,15977,16001,16039,16183,16204,16222,16228,16285,16312,16318,16363,16408,16416,4,3,97,114,116,15594,15599,15603,114,114,59,1,8667,114,59,1,8658,97,105,108,59,1,10524,97,114,114,59,1,10511,97,114,59,1,10596,4,7,99,100,101,110,113,114,116,15636,15651,15656,15664,15687,15696,15770,4,2,101,117,15642,15646,59,3,8765,817,116,101,59,1,341,105,99,59,1,8730,109,112,116,121,118,59,1,10675,103,4,4,59,100,101,108,15675,15677,15680,15683,1,10217,59,1,10642,59,1,10661,101,59,1,10217,117,111,5,187,1,59,15694,1,187,114,4,11,59,97,98,99,102,104,108,112,115,116,119,15721,15723,15727,15739,15742,15746,15750,15754,15758,15763,15767,1,8594,112,59,1,10613,4,2,59,102,15733,15735,1,8677,115,59,1,10528,59,1,10547,115,59,1,10526,107,59,1,8618,112,59,1,8620,108,59,1,10565,105,109,59,1,10612,108,59,1,8611,59,1,8605,4,2,97,105,15776,15781,105,108,59,1,10522,111,4,2,59,110,15788,15790,1,8758,97,108,115,59,1,8474,4,3,97,98,114,15804,15809,15814,114,114,59,1,10509,114,107,59,1,10099,4,2,97,107,15820,15833,99,4,2,101,107,15827,15830,59,1,125,59,1,93,4,2,101,115,15839,15842,59,1,10636,108,4,2,100,117,15849,15852,59,1,10638,59,1,10640,4,4,97,101,117,121,15865,15871,15886,15890,114,111,110,59,1,345,4,2,100,105,15877,15882,105,108,59,1,343,108,59,1,8969,98,59,1,125,59,1,1088,4,4,99,108,113,115,15903,15907,15914,15927,97,59,1,10551,100,104,97,114,59,1,10601,117,111,4,2,59,114,15922,15924,1,8221,59,1,8221,104,59,1,8627,4,3,97,99,103,15939,15966,15970,108,4,4,59,105,112,115,15950,15952,15957,15963,1,8476,110,101,59,1,8475,97,114,116,59,1,8476,59,1,8477,116,59,1,9645,5,174,1,59,15975,1,174,4,3,105,108,114,15985,15991,15997,115,104,116,59,1,10621,111,111,114,59,1,8971,59,3,55349,56623,4,2,97,111,16007,16028,114,4,2,100,117,16014,16017,59,1,8641,4,2,59,108,16023,16025,1,8640,59,1,10604,4,2,59,118,16034,16036,1,961,59,1,1009,4,3,103,110,115,16047,16167,16171,104,116,4,6,97,104,108,114,115,116,16063,16081,16103,16130,16143,16155,114,114,111,119,4,2,59,116,16073,16075,1,8594,97,105,108,59,1,8611,97,114,112,111,111,110,4,2,100,117,16093,16099,111,119,110,59,1,8641,112,59,1,8640,101,102,116,4,2,97,104,16112,16120,114,114,111,119,115,59,1,8644,97,114,112,111,111,110,115,59,1,8652,105,103,104,116,97,114,114,111,119,115,59,1,8649,113,117,105,103,97,114,114,111,119,59,1,8605,104,114,101,101,116,105,109,101,115,59,1,8908,103,59,1,730,105,110,103,100,111,116,115,101,113,59,1,8787,4,3,97,104,109,16191,16196,16201,114,114,59,1,8644,97,114,59,1,8652,59,1,8207,111,117,115,116,4,2,59,97,16214,16216,1,9137,99,104,101,59,1,9137,109,105,100,59,1,10990,4,4,97,98,112,116,16238,16252,16257,16278,4,2,110,114,16244,16248,103,59,1,10221,114,59,1,8702,114,107,59,1,10215,4,3,97,102,108,16265,16269,16273,114,59,1,10630,59,3,55349,56675,117,115,59,1,10798,105,109,101,115,59,1,10805,4,2,97,112,16291,16304,114,4,2,59,103,16298,16300,1,41,116,59,1,10644,111,108,105,110,116,59,1,10770,97,114,114,59,1,8649,4,4,97,99,104,113,16328,16334,16339,16342,113,117,111,59,1,8250,114,59,3,55349,56519,59,1,8625,4,2,98,117,16348,16351,59,1,93,111,4,2,59,114,16358,16360,1,8217,59,1,8217,4,3,104,105,114,16371,16377,16383,114,101,101,59,1,8908,109,101,115,59,1,8906,105,4,4,59,101,102,108,16394,16396,16399,16402,1,9657,59,1,8885,59,1,9656,116,114,105,59,1,10702,108,117,104,97,114,59,1,10600,59,1,8478,4,19,97,98,99,100,101,102,104,105,108,109,111,112,113,114,115,116,117,119,122,16459,16466,16472,16572,16590,16672,16687,16746,16844,16850,16924,16963,16988,17115,17121,17154,17206,17614,17656,99,117,116,101,59,1,347,113,117,111,59,1,8218,4,10,59,69,97,99,101,105,110,112,115,121,16494,16496,16499,16513,16518,16531,16536,16556,16564,16569,1,8827,59,1,10932,4,2,112,114,16505,16508,59,1,10936,111,110,59,1,353,117,101,59,1,8829,4,2,59,100,16524,16526,1,10928,105,108,59,1,351,114,99,59,1,349,4,3,69,97,115,16544,16547,16551,59,1,10934,112,59,1,10938,105,109,59,1,8937,111,108,105,110,116,59,1,10771,105,109,59,1,8831,59,1,1089,111,116,4,3,59,98,101,16582,16584,16587,1,8901,59,1,8865,59,1,10854,4,7,65,97,99,109,115,116,120,16606,16611,16634,16642,16646,16652,16668,114,114,59,1,8664,114,4,2,104,114,16618,16622,107,59,1,10533,4,2,59,111,16628,16630,1,8600,119,59,1,8600,116,5,167,1,59,16640,1,167,105,59,1,59,119,97,114,59,1,10537,109,4,2,105,110,16659,16665,110,117,115,59,1,8726,59,1,8726,116,59,1,10038,114,4,2,59,111,16679,16682,3,55349,56624,119,110,59,1,8994,4,4,97,99,111,121,16697,16702,16716,16739,114,112,59,1,9839,4,2,104,121,16708,16713,99,121,59,1,1097,59,1,1096,114,116,4,2,109,112,16724,16729,105,100,59,1,8739,97,114,97,108,108,101,108,59,1,8741,5,173,1,59,16744,1,173,4,2,103,109,16752,16770,109,97,4,3,59,102,118,16762,16764,16767,1,963,59,1,962,59,1,962,4,8,59,100,101,103,108,110,112,114,16788,16790,16795,16806,16817,16828,16832,16838,1,8764,111,116,59,1,10858,4,2,59,113,16801,16803,1,8771,59,1,8771,4,2,59,69,16812,16814,1,10910,59,1,10912,4,2,59,69,16823,16825,1,10909,59,1,10911,101,59,1,8774,108,117,115,59,1,10788,97,114,114,59,1,10610,97,114,114,59,1,8592,4,4,97,101,105,116,16860,16883,16891,16904,4,2,108,115,16866,16878,108,115,101,116,109,105,110,117,115,59,1,8726,104,112,59,1,10803,112,97,114,115,108,59,1,10724,4,2,100,108,16897,16900,59,1,8739,101,59,1,8995,4,2,59,101,16910,16912,1,10922,4,2,59,115,16918,16920,1,10924,59,3,10924,65024,4,3,102,108,112,16932,16938,16958,116,99,121,59,1,1100,4,2,59,98,16944,16946,1,47,4,2,59,97,16952,16954,1,10692,114,59,1,9023,102,59,3,55349,56676,97,4,2,100,114,16970,16985,101,115,4,2,59,117,16978,16980,1,9824,105,116,59,1,9824,59,1,8741,4,3,99,115,117,16996,17028,17089,4,2,97,117,17002,17015,112,4,2,59,115,17009,17011,1,8851,59,3,8851,65024,112,4,2,59,115,17022,17024,1,8852,59,3,8852,65024,117,4,2,98,112,17035,17062,4,3,59,101,115,17043,17045,17048,1,8847,59,1,8849,101,116,4,2,59,101,17056,17058,1,8847,113,59,1,8849,4,3,59,101,115,17070,17072,17075,1,8848,59,1,8850,101,116,4,2,59,101,17083,17085,1,8848,113,59,1,8850,4,3,59,97,102,17097,17099,17112,1,9633,114,4,2,101,102,17106,17109,59,1,9633,59,1,9642,59,1,9642,97,114,114,59,1,8594,4,4,99,101,109,116,17131,17136,17142,17148,114,59,3,55349,56520,116,109,110,59,1,8726,105,108,101,59,1,8995,97,114,102,59,1,8902,4,2,97,114,17160,17172,114,4,2,59,102,17167,17169,1,9734,59,1,9733,4,2,97,110,17178,17202,105,103,104,116,4,2,101,112,17188,17197,112,115,105,108,111,110,59,1,1013,104,105,59,1,981,115,59,1,175,4,5,98,99,109,110,112,17218,17351,17420,17423,17427,4,9,59,69,100,101,109,110,112,114,115,17238,17240,17243,17248,17261,17267,17279,17285,17291,1,8834,59,1,10949,111,116,59,1,10941,4,2,59,100,17254,17256,1,8838,111,116,59,1,10947,117,108,116,59,1,10945,4,2,69,101,17273,17276,59,1,10955,59,1,8842,108,117,115,59,1,10943,97,114,114,59,1,10617,4,3,101,105,117,17299,17335,17339,116,4,3,59,101,110,17308,17310,17322,1,8834,113,4,2,59,113,17317,17319,1,8838,59,1,10949,101,113,4,2,59,113,17330,17332,1,8842,59,1,10955,109,59,1,10951,4,2,98,112,17345,17348,59,1,10965,59,1,10963,99,4,6,59,97,99,101,110,115,17366,17368,17376,17385,17389,17415,1,8827,112,112,114,111,120,59,1,10936,117,114,108,121,101,113,59,1,8829,113,59,1,10928,4,3,97,101,115,17397,17405,17410,112,112,114,111,120,59,1,10938,113,113,59,1,10934,105,109,59,1,8937,105,109,59,1,8831,59,1,8721,103,59,1,9834,4,13,49,50,51,59,69,100,101,104,108,109,110,112,115,17455,17462,17469,17476,17478,17481,17496,17509,17524,17530,17536,17548,17554,5,185,1,59,17460,1,185,5,178,1,59,17467,1,178,5,179,1,59,17474,1,179,1,8835,59,1,10950,4,2,111,115,17487,17491,116,59,1,10942,117,98,59,1,10968,4,2,59,100,17502,17504,1,8839,111,116,59,1,10948,115,4,2,111,117,17516,17520,108,59,1,10185,98,59,1,10967,97,114,114,59,1,10619,117,108,116,59,1,10946,4,2,69,101,17542,17545,59,1,10956,59,1,8843,108,117,115,59,1,10944,4,3,101,105,117,17562,17598,17602,116,4,3,59,101,110,17571,17573,17585,1,8835,113,4,2,59,113,17580,17582,1,8839,59,1,10950,101,113,4,2,59,113,17593,17595,1,8843,59,1,10956,109,59,1,10952,4,2,98,112,17608,17611,59,1,10964,59,1,10966,4,3,65,97,110,17622,17627,17650,114,114,59,1,8665,114,4,2,104,114,17634,17638,107,59,1,10534,4,2,59,111,17644,17646,1,8601,119,59,1,8601,119,97,114,59,1,10538,108,105,103,5,223,1,59,17664,1,223,4,13,97,98,99,100,101,102,104,105,111,112,114,115,119,17694,17709,17714,17737,17742,17749,17754,17860,17905,17957,17964,18090,18122,4,2,114,117,17700,17706,103,101,116,59,1,8982,59,1,964,114,107,59,1,9140,4,3,97,101,121,17722,17728,17734,114,111,110,59,1,357,100,105,108,59,1,355,59,1,1090,111,116,59,1,8411,108,114,101,99,59,1,8981,114,59,3,55349,56625,4,4,101,105,107,111,17764,17805,17836,17851,4,2,114,116,17770,17786,101,4,2,52,102,17777,17780,59,1,8756,111,114,101,59,1,8756,97,4,3,59,115,118,17795,17797,17802,1,952,121,109,59,1,977,59,1,977,4,2,99,110,17811,17831,107,4,2,97,115,17818,17826,112,112,114,111,120,59,1,8776,105,109,59,1,8764,115,112,59,1,8201,4,2,97,115,17842,17846,112,59,1,8776,105,109,59,1,8764,114,110,5,254,1,59,17858,1,254,4,3,108,109,110,17868,17873,17901,100,101,59,1,732,101,115,5,215,3,59,98,100,17884,17886,17898,1,215,4,2,59,97,17892,17894,1,8864,114,59,1,10801,59,1,10800,116,59,1,8749,4,3,101,112,115,17913,17917,17953,97,59,1,10536,4,4,59,98,99,102,17927,17929,17934,17939,1,8868,111,116,59,1,9014,105,114,59,1,10993,4,2,59,111,17945,17948,3,55349,56677,114,107,59,1,10970,97,59,1,10537,114,105,109,101,59,1,8244,4,3,97,105,112,17972,17977,18082,100,101,59,1,8482,4,7,97,100,101,109,112,115,116,17993,18051,18056,18059,18066,18072,18076,110,103,108,101,4,5,59,100,108,113,114,18009,18011,18017,18032,18035,1,9653,111,119,110,59,1,9663,101,102,116,4,2,59,101,18026,18028,1,9667,113,59,1,8884,59,1,8796,105,103,104,116,4,2,59,101,18045,18047,1,9657,113,59,1,8885,111,116,59,1,9708,59,1,8796,105,110,117,115,59,1,10810,108,117,115,59,1,10809,98,59,1,10701,105,109,101,59,1,10811,101,122,105,117,109,59,1,9186,4,3,99,104,116,18098,18111,18116,4,2,114,121,18104,18108,59,3,55349,56521,59,1,1094,99,121,59,1,1115,114,111,107,59,1,359,4,2,105,111,18128,18133,120,116,59,1,8812,104,101,97,100,4,2,108,114,18143,18154,101,102,116,97,114,114,111,119,59,1,8606,105,103,104,116,97,114,114,111,119,59,1,8608,4,18,65,72,97,98,99,100,102,103,104,108,109,111,112,114,115,116,117,119,18204,18209,18214,18234,18250,18268,18292,18308,18319,18343,18379,18397,18413,18504,18547,18553,18584,18603,114,114,59,1,8657,97,114,59,1,10595,4,2,99,114,18220,18230,117,116,101,5,250,1,59,18228,1,250,114,59,1,8593,114,4,2,99,101,18241,18245,121,59,1,1118,118,101,59,1,365,4,2,105,121,18256,18265,114,99,5,251,1,59,18263,1,251,59,1,1091,4,3,97,98,104,18276,18281,18287,114,114,59,1,8645,108,97,99,59,1,369,97,114,59,1,10606,4,2,105,114,18298,18304,115,104,116,59,1,10622,59,3,55349,56626,114,97,118,101,5,249,1,59,18317,1,249,4,2,97,98,18325,18338,114,4,2,108,114,18332,18335,59,1,8639,59,1,8638,108,107,59,1,9600,4,2,99,116,18349,18374,4,2,111,114,18355,18369,114,110,4,2,59,101,18363,18365,1,8988,114,59,1,8988,111,112,59,1,8975,114,105,59,1,9720,4,2,97,108,18385,18390,99,114,59,1,363,5,168,1,59,18395,1,168,4,2,103,112,18403,18408,111,110,59,1,371,102,59,3,55349,56678,4,6,97,100,104,108,115,117,18427,18434,18445,18470,18475,18494,114,114,111,119,59,1,8593,111,119,110,97,114,114,111,119,59,1,8597,97,114,112,111,111,110,4,2,108,114,18457,18463,101,102,116,59,1,8639,105,103,104,116,59,1,8638,117,115,59,1,8846,105,4,3,59,104,108,18484,18486,18489,1,965,59,1,978,111,110,59,1,965,112,97,114,114,111,119,115,59,1,8648,4,3,99,105,116,18512,18537,18542,4,2,111,114,18518,18532,114,110,4,2,59,101,18526,18528,1,8989,114,59,1,8989,111,112,59,1,8974,110,103,59,1,367,114,105,59,1,9721,99,114,59,3,55349,56522,4,3,100,105,114,18561,18566,18572,111,116,59,1,8944,108,100,101,59,1,361,105,4,2,59,102,18579,18581,1,9653,59,1,9652,4,2,97,109,18590,18595,114,114,59,1,8648,108,5,252,1,59,18601,1,252,97,110,103,108,101,59,1,10663,4,15,65,66,68,97,99,100,101,102,108,110,111,112,114,115,122,18643,18648,18661,18667,18847,18851,18857,18904,18909,18915,18931,18937,18943,18949,18996,114,114,59,1,8661,97,114,4,2,59,118,18656,18658,1,10984,59,1,10985,97,115,104,59,1,8872,4,2,110,114,18673,18679,103,114,116,59,1,10652,4,7,101,107,110,112,114,115,116,18695,18704,18711,18720,18742,18754,18810,112,115,105,108,111,110,59,1,1013,97,112,112,97,59,1,1008,111,116,104,105,110,103,59,1,8709,4,3,104,105,114,18728,18732,18735,105,59,1,981,59,1,982,111,112,116,111,59,1,8733,4,2,59,104,18748,18750,1,8597,111,59,1,1009,4,2,105,117,18760,18766,103,109,97,59,1,962,4,2,98,112,18772,18791,115,101,116,110,101,113,4,2,59,113,18784,18787,3,8842,65024,59,3,10955,65024,115,101,116,110,101,113,4,2,59,113,18803,18806,3,8843,65024,59,3,10956,65024,4,2,104,114,18816,18822,101,116,97,59,1,977,105,97,110,103,108,101,4,2,108,114,18834,18840,101,102,116,59,1,8882,105,103,104,116,59,1,8883,121,59,1,1074,97,115,104,59,1,8866,4,3,101,108,114,18865,18884,18890,4,3,59,98,101,18873,18875,18880,1,8744,97,114,59,1,8891,113,59,1,8794,108,105,112,59,1,8942,4,2,98,116,18896,18901,97,114,59,1,124,59,1,124,114,59,3,55349,56627,116,114,105,59,1,8882,115,117,4,2,98,112,18923,18927,59,3,8834,8402,59,3,8835,8402,112,102,59,3,55349,56679,114,111,112,59,1,8733,116,114,105,59,1,8883,4,2,99,117,18955,18960,114,59,3,55349,56523,4,2,98,112,18966,18981,110,4,2,69,101,18973,18977,59,3,10955,65024,59,3,8842,65024,110,4,2,69,101,18988,18992,59,3,10956,65024,59,3,8843,65024,105,103,122,97,103,59,1,10650,4,7,99,101,102,111,112,114,115,19020,19026,19061,19066,19072,19075,19089,105,114,99,59,1,373,4,2,100,105,19032,19055,4,2,98,103,19038,19043,97,114,59,1,10847,101,4,2,59,113,19050,19052,1,8743,59,1,8793,101,114,112,59,1,8472,114,59,3,55349,56628,112,102,59,3,55349,56680,59,1,8472,4,2,59,101,19081,19083,1,8768,97,116,104,59,1,8768,99,114,59,3,55349,56524,4,14,99,100,102,104,105,108,109,110,111,114,115,117,118,119,19125,19146,19152,19157,19173,19176,19192,19197,19202,19236,19252,19269,19286,19291,4,3,97,105,117,19133,19137,19142,112,59,1,8898,114,99,59,1,9711,112,59,1,8899,116,114,105,59,1,9661,114,59,3,55349,56629,4,2,65,97,19163,19168,114,114,59,1,10234,114,114,59,1,10231,59,1,958,4,2,65,97,19182,19187,114,114,59,1,10232,114,114,59,1,10229,97,112,59,1,10236,105,115,59,1,8955,4,3,100,112,116,19210,19215,19230,111,116,59,1,10752,4,2,102,108,19221,19225,59,3,55349,56681,117,115,59,1,10753,105,109,101,59,1,10754,4,2,65,97,19242,19247,114,114,59,1,10233,114,114,59,1,10230,4,2,99,113,19258,19263,114,59,3,55349,56525,99,117,112,59,1,10758,4,2,112,116,19275,19281,108,117,115,59,1,10756,114,105,59,1,9651,101,101,59,1,8897,101,100,103,101,59,1,8896,4,8,97,99,101,102,105,111,115,117,19316,19335,19349,19357,19362,19367,19373,19379,99,4,2,117,121,19323,19332,116,101,5,253,1,59,19330,1,253,59,1,1103,4,2,105,121,19341,19346,114,99,59,1,375,59,1,1099,110,5,165,1,59,19355,1,165,114,59,3,55349,56630,99,121,59,1,1111,112,102,59,3,55349,56682,99,114,59,3,55349,56526,4,2,99,109,19385,19389,121,59,1,1102,108,5,255,1,59,19395,1,255,4,10,97,99,100,101,102,104,105,111,115,119,19419,19426,19441,19446,19462,19467,19472,19480,19486,19492,99,117,116,101,59,1,378,4,2,97,121,19432,19438,114,111,110,59,1,382,59,1,1079,111,116,59,1,380,4,2,101,116,19452,19458,116,114,102,59,1,8488,97,59,1,950,114,59,3,55349,56631,99,121,59,1,1078,103,114,97,114,114,59,1,8669,112,102,59,3,55349,56683,99,114,59,3,55349,56527,4,2,106,110,19498,19501,59,1,8205,106,59,1,8204]);
},{}],21:[function(require,module,exports){
'use strict';

const unicode = require('../common/unicode');
const ERR = require('../common/error-codes');

//Aliases
const $ = unicode.CODE_POINTS;

//Const
const DEFAULT_BUFFER_WATERLINE = 1 << 16;

//Preprocessor
//NOTE: HTML input preprocessing
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#preprocessing-the-input-stream)
class Preprocessor {
    constructor() {
        this.html = null;

        this.pos = -1;
        this.lastGapPos = -1;
        this.lastCharPos = -1;

        this.gapStack = [];

        this.skipNextNewLine = false;

        this.lastChunkWritten = false;
        this.endOfChunkHit = false;
        this.bufferWaterline = DEFAULT_BUFFER_WATERLINE;
    }

    _err() {
        // NOTE: err reporting is noop by default. Enabled by mixin.
    }

    _addGap() {
        this.gapStack.push(this.lastGapPos);
        this.lastGapPos = this.pos;
    }

    _processSurrogate(cp) {
        //NOTE: try to peek a surrogate pair
        if (this.pos !== this.lastCharPos) {
            const nextCp = this.html.charCodeAt(this.pos + 1);

            if (unicode.isSurrogatePair(nextCp)) {
                //NOTE: we have a surrogate pair. Peek pair character and recalculate code point.
                this.pos++;

                //NOTE: add gap that should be avoided during retreat
                this._addGap();

                return unicode.getSurrogatePairCodePoint(cp, nextCp);
            }
        }

        //NOTE: we are at the end of a chunk, therefore we can't infer surrogate pair yet.
        else if (!this.lastChunkWritten) {
            this.endOfChunkHit = true;
            return $.EOF;
        }

        //NOTE: isolated surrogate
        this._err(ERR.surrogateInInputStream);

        return cp;
    }

    dropParsedChunk() {
        if (this.pos > this.bufferWaterline) {
            this.lastCharPos -= this.pos;
            this.html = this.html.substring(this.pos);
            this.pos = 0;
            this.lastGapPos = -1;
            this.gapStack = [];
        }
    }

    write(chunk, isLastChunk) {
        if (this.html) {
            this.html += chunk;
        } else {
            this.html = chunk;
        }

        this.lastCharPos = this.html.length - 1;
        this.endOfChunkHit = false;
        this.lastChunkWritten = isLastChunk;
    }

    insertHtmlAtCurrentPos(chunk) {
        this.html = this.html.substring(0, this.pos + 1) + chunk + this.html.substring(this.pos + 1, this.html.length);

        this.lastCharPos = this.html.length - 1;
        this.endOfChunkHit = false;
    }

    advance() {
        this.pos++;

        if (this.pos > this.lastCharPos) {
            this.endOfChunkHit = !this.lastChunkWritten;
            return $.EOF;
        }

        let cp = this.html.charCodeAt(this.pos);

        //NOTE: any U+000A LINE FEED (LF) characters that immediately follow a U+000D CARRIAGE RETURN (CR) character
        //must be ignored.
        if (this.skipNextNewLine && cp === $.LINE_FEED) {
            this.skipNextNewLine = false;
            this._addGap();
            return this.advance();
        }

        //NOTE: all U+000D CARRIAGE RETURN (CR) characters must be converted to U+000A LINE FEED (LF) characters
        if (cp === $.CARRIAGE_RETURN) {
            this.skipNextNewLine = true;
            return $.LINE_FEED;
        }

        this.skipNextNewLine = false;

        if (unicode.isSurrogate(cp)) {
            cp = this._processSurrogate(cp);
        }

        //OPTIMIZATION: first check if code point is in the common allowed
        //range (ASCII alphanumeric, whitespaces, big chunk of BMP)
        //before going into detailed performance cost validation.
        const isCommonValidRange =
            (cp > 0x1f && cp < 0x7f) || cp === $.LINE_FEED || cp === $.CARRIAGE_RETURN || (cp > 0x9f && cp < 0xfdd0);

        if (!isCommonValidRange) {
            this._checkForProblematicCharacters(cp);
        }

        return cp;
    }

    _checkForProblematicCharacters(cp) {
        if (unicode.isControlCodePoint(cp)) {
            this._err(ERR.controlCharacterInInputStream);
        } else if (unicode.isUndefinedCodePoint(cp)) {
            this._err(ERR.noncharacterInInputStream);
        }
    }

    retreat() {
        if (this.pos === this.lastGapPos) {
            this.lastGapPos = this.gapStack.pop();
            this.pos--;
        }

        this.pos--;
    }
}

module.exports = Preprocessor;

},{"../common/error-codes":2,"../common/unicode":5}],22:[function(require,module,exports){
'use strict';

const { DOCUMENT_MODE } = require('../common/html');

//Node construction
exports.createDocument = function() {
    return {
        nodeName: '#document',
        mode: DOCUMENT_MODE.NO_QUIRKS,
        childNodes: []
    };
};

exports.createDocumentFragment = function() {
    return {
        nodeName: '#document-fragment',
        childNodes: []
    };
};

exports.createElement = function(tagName, namespaceURI, attrs) {
    return {
        nodeName: tagName,
        tagName: tagName,
        attrs: attrs,
        namespaceURI: namespaceURI,
        childNodes: [],
        parentNode: null
    };
};

exports.createCommentNode = function(data) {
    return {
        nodeName: '#comment',
        data: data,
        parentNode: null
    };
};

const createTextNode = function(value) {
    return {
        nodeName: '#text',
        value: value,
        parentNode: null
    };
};

//Tree mutation
const appendChild = (exports.appendChild = function(parentNode, newNode) {
    parentNode.childNodes.push(newNode);
    newNode.parentNode = parentNode;
});

const insertBefore = (exports.insertBefore = function(parentNode, newNode, referenceNode) {
    const insertionIdx = parentNode.childNodes.indexOf(referenceNode);

    parentNode.childNodes.splice(insertionIdx, 0, newNode);
    newNode.parentNode = parentNode;
});

exports.setTemplateContent = function(templateElement, contentElement) {
    templateElement.content = contentElement;
};

exports.getTemplateContent = function(templateElement) {
    return templateElement.content;
};

exports.setDocumentType = function(document, name, publicId, systemId) {
    let doctypeNode = null;

    for (let i = 0; i < document.childNodes.length; i++) {
        if (document.childNodes[i].nodeName === '#documentType') {
            doctypeNode = document.childNodes[i];
            break;
        }
    }

    if (doctypeNode) {
        doctypeNode.name = name;
        doctypeNode.publicId = publicId;
        doctypeNode.systemId = systemId;
    } else {
        appendChild(document, {
            nodeName: '#documentType',
            name: name,
            publicId: publicId,
            systemId: systemId
        });
    }
};

exports.setDocumentMode = function(document, mode) {
    document.mode = mode;
};

exports.getDocumentMode = function(document) {
    return document.mode;
};

exports.detachNode = function(node) {
    if (node.parentNode) {
        const idx = node.parentNode.childNodes.indexOf(node);

        node.parentNode.childNodes.splice(idx, 1);
        node.parentNode = null;
    }
};

exports.insertText = function(parentNode, text) {
    if (parentNode.childNodes.length) {
        const prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];

        if (prevNode.nodeName === '#text') {
            prevNode.value += text;
            return;
        }
    }

    appendChild(parentNode, createTextNode(text));
};

exports.insertTextBefore = function(parentNode, text, referenceNode) {
    const prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];

    if (prevNode && prevNode.nodeName === '#text') {
        prevNode.value += text;
    } else {
        insertBefore(parentNode, createTextNode(text), referenceNode);
    }
};

exports.adoptAttributes = function(recipient, attrs) {
    const recipientAttrsMap = [];

    for (let i = 0; i < recipient.attrs.length; i++) {
        recipientAttrsMap.push(recipient.attrs[i].name);
    }

    for (let j = 0; j < attrs.length; j++) {
        if (recipientAttrsMap.indexOf(attrs[j].name) === -1) {
            recipient.attrs.push(attrs[j]);
        }
    }
};

//Tree traversing
exports.getFirstChild = function(node) {
    return node.childNodes[0];
};

exports.getChildNodes = function(node) {
    return node.childNodes;
};

exports.getParentNode = function(node) {
    return node.parentNode;
};

exports.getAttrList = function(element) {
    return element.attrs;
};

//Node data
exports.getTagName = function(element) {
    return element.tagName;
};

exports.getNamespaceURI = function(element) {
    return element.namespaceURI;
};

exports.getTextNodeContent = function(textNode) {
    return textNode.value;
};

exports.getCommentNodeContent = function(commentNode) {
    return commentNode.data;
};

exports.getDocumentTypeNodeName = function(doctypeNode) {
    return doctypeNode.name;
};

exports.getDocumentTypeNodePublicId = function(doctypeNode) {
    return doctypeNode.publicId;
};

exports.getDocumentTypeNodeSystemId = function(doctypeNode) {
    return doctypeNode.systemId;
};

//Node types
exports.isTextNode = function(node) {
    return node.nodeName === '#text';
};

exports.isCommentNode = function(node) {
    return node.nodeName === '#comment';
};

exports.isDocumentTypeNode = function(node) {
    return node.nodeName === '#documentType';
};

exports.isElementNode = function(node) {
    return !!node.tagName;
};

// Source code location
exports.setNodeSourceCodeLocation = function(node, location) {
    node.sourceCodeLocation = location;
};

exports.getNodeSourceCodeLocation = function(node) {
    return node.sourceCodeLocation;
};

exports.updateNodeSourceCodeLocation = function(node, endLocation) {
    node.sourceCodeLocation = Object.assign(node.sourceCodeLocation, endLocation);
};

},{"../common/html":4}],23:[function(require,module,exports){
'use strict';

module.exports = function mergeOptions(defaults, options) {
    options = options || Object.create(null);

    return [defaults, options].reduce((merged, optObj) => {
        Object.keys(optObj).forEach(key => {
            merged[key] = optObj[key];
        });

        return merged;
    }, Object.create(null));
};

},{}],24:[function(require,module,exports){
'use strict';

class Mixin {
    constructor(host) {
        const originalMethods = {};
        const overriddenMethods = this._getOverriddenMethods(this, originalMethods);

        for (const key of Object.keys(overriddenMethods)) {
            if (typeof overriddenMethods[key] === 'function') {
                originalMethods[key] = host[key];
                host[key] = overriddenMethods[key];
            }
        }
    }

    _getOverriddenMethods() {
        throw new Error('Not implemented');
    }
}

Mixin.install = function(host, Ctor, opts) {
    if (!host.__mixins) {
        host.__mixins = [];
    }

    for (let i = 0; i < host.__mixins.length; i++) {
        if (host.__mixins[i].constructor === Ctor) {
            return host.__mixins[i];
        }
    }

    const mixin = new Ctor(host, opts);

    host.__mixins.push(mixin);

    return mixin;
};

module.exports = Mixin;

},{}]},{},[14])(14)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcGFyc2U1L2xpYi9jb21tb24vZG9jdHlwZS5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZTUvbGliL2NvbW1vbi9lcnJvci1jb2Rlcy5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZTUvbGliL2NvbW1vbi9mb3JlaWduLWNvbnRlbnQuanMiLCJub2RlX21vZHVsZXMvcGFyc2U1L2xpYi9jb21tb24vaHRtbC5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZTUvbGliL2NvbW1vbi91bmljb2RlLmpzIiwibm9kZV9tb2R1bGVzL3BhcnNlNS9saWIvZXh0ZW5zaW9ucy9lcnJvci1yZXBvcnRpbmcvbWl4aW4tYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZTUvbGliL2V4dGVuc2lvbnMvZXJyb3ItcmVwb3J0aW5nL3BhcnNlci1taXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZTUvbGliL2V4dGVuc2lvbnMvZXJyb3ItcmVwb3J0aW5nL3ByZXByb2Nlc3Nvci1taXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZTUvbGliL2V4dGVuc2lvbnMvZXJyb3ItcmVwb3J0aW5nL3Rva2VuaXplci1taXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZTUvbGliL2V4dGVuc2lvbnMvbG9jYXRpb24taW5mby9vcGVuLWVsZW1lbnQtc3RhY2stbWl4aW4uanMiLCJub2RlX21vZHVsZXMvcGFyc2U1L2xpYi9leHRlbnNpb25zL2xvY2F0aW9uLWluZm8vcGFyc2VyLW1peGluLmpzIiwibm9kZV9tb2R1bGVzL3BhcnNlNS9saWIvZXh0ZW5zaW9ucy9sb2NhdGlvbi1pbmZvL3Rva2VuaXplci1taXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZTUvbGliL2V4dGVuc2lvbnMvcG9zaXRpb24tdHJhY2tpbmcvcHJlcHJvY2Vzc29yLW1peGluLmpzIiwibm9kZV9tb2R1bGVzL3BhcnNlNS9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcGFyc2U1L2xpYi9wYXJzZXIvZm9ybWF0dGluZy1lbGVtZW50LWxpc3QuanMiLCJub2RlX21vZHVsZXMvcGFyc2U1L2xpYi9wYXJzZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcGFyc2U1L2xpYi9wYXJzZXIvb3Blbi1lbGVtZW50LXN0YWNrLmpzIiwibm9kZV9tb2R1bGVzL3BhcnNlNS9saWIvc2VyaWFsaXplci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZTUvbGliL3Rva2VuaXplci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZTUvbGliL3Rva2VuaXplci9uYW1lZC1lbnRpdHktZGF0YS5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZTUvbGliL3Rva2VuaXplci9wcmVwcm9jZXNzb3IuanMiLCJub2RlX21vZHVsZXMvcGFyc2U1L2xpYi90cmVlLWFkYXB0ZXJzL2RlZmF1bHQuanMiLCJub2RlX21vZHVsZXMvcGFyc2U1L2xpYi91dGlscy9tZXJnZS1vcHRpb25zLmpzIiwibm9kZV9tb2R1bGVzL3BhcnNlNS9saWIvdXRpbHMvbWl4aW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNTRGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbGVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcHBFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgRE9DVU1FTlRfTU9ERSB9ID0gcmVxdWlyZSgnLi9odG1sJyk7XG5cbi8vQ29uc3RcbmNvbnN0IFZBTElEX0RPQ1RZUEVfTkFNRSA9ICdodG1sJztcbmNvbnN0IFZBTElEX1NZU1RFTV9JRCA9ICdhYm91dDpsZWdhY3ktY29tcGF0JztcbmNvbnN0IFFVSVJLU19NT0RFX1NZU1RFTV9JRCA9ICdodHRwOi8vd3d3LmlibS5jb20vZGF0YS9kdGQvdjExL2libXhodG1sMS10cmFuc2l0aW9uYWwuZHRkJztcblxuY29uc3QgUVVJUktTX01PREVfUFVCTElDX0lEX1BSRUZJWEVTID0gW1xuICAgICcrLy9zaWxtYXJpbC8vZHRkIGh0bWwgcHJvIHYwcjExIDE5OTcwMTAxLy8nLFxuICAgICctLy9hcy8vZHRkIGh0bWwgMy4wIGFzd2VkaXQgKyBleHRlbnNpb25zLy8nLFxuICAgICctLy9hZHZhc29mdCBsdGQvL2R0ZCBodG1sIDMuMCBhc3dlZGl0ICsgZXh0ZW5zaW9ucy8vJyxcbiAgICAnLS8vaWV0Zi8vZHRkIGh0bWwgMi4wIGxldmVsIDEvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIDIuMCBsZXZlbCAyLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCAyLjAgc3RyaWN0IGxldmVsIDEvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIDIuMCBzdHJpY3QgbGV2ZWwgMi8vJyxcbiAgICAnLS8vaWV0Zi8vZHRkIGh0bWwgMi4wIHN0cmljdC8vJyxcbiAgICAnLS8vaWV0Zi8vZHRkIGh0bWwgMi4wLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCAyLjFlLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCAzLjAvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIDMuMiBmaW5hbC8vJyxcbiAgICAnLS8vaWV0Zi8vZHRkIGh0bWwgMy4yLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCAzLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCBsZXZlbCAwLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCBsZXZlbCAxLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCBsZXZlbCAyLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCBsZXZlbCAzLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCBzdHJpY3QgbGV2ZWwgMC8vJyxcbiAgICAnLS8vaWV0Zi8vZHRkIGh0bWwgc3RyaWN0IGxldmVsIDEvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIHN0cmljdCBsZXZlbCAyLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCBzdHJpY3QgbGV2ZWwgMy8vJyxcbiAgICAnLS8vaWV0Zi8vZHRkIGh0bWwgc3RyaWN0Ly8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbC8vJyxcbiAgICAnLS8vbWV0cml1cy8vZHRkIG1ldHJpdXMgcHJlc2VudGF0aW9uYWwvLycsXG4gICAgJy0vL21pY3Jvc29mdC8vZHRkIGludGVybmV0IGV4cGxvcmVyIDIuMCBodG1sIHN0cmljdC8vJyxcbiAgICAnLS8vbWljcm9zb2Z0Ly9kdGQgaW50ZXJuZXQgZXhwbG9yZXIgMi4wIGh0bWwvLycsXG4gICAgJy0vL21pY3Jvc29mdC8vZHRkIGludGVybmV0IGV4cGxvcmVyIDIuMCB0YWJsZXMvLycsXG4gICAgJy0vL21pY3Jvc29mdC8vZHRkIGludGVybmV0IGV4cGxvcmVyIDMuMCBodG1sIHN0cmljdC8vJyxcbiAgICAnLS8vbWljcm9zb2Z0Ly9kdGQgaW50ZXJuZXQgZXhwbG9yZXIgMy4wIGh0bWwvLycsXG4gICAgJy0vL21pY3Jvc29mdC8vZHRkIGludGVybmV0IGV4cGxvcmVyIDMuMCB0YWJsZXMvLycsXG4gICAgJy0vL25ldHNjYXBlIGNvbW0uIGNvcnAuLy9kdGQgaHRtbC8vJyxcbiAgICAnLS8vbmV0c2NhcGUgY29tbS4gY29ycC4vL2R0ZCBzdHJpY3QgaHRtbC8vJyxcbiAgICBcIi0vL28ncmVpbGx5IGFuZCBhc3NvY2lhdGVzLy9kdGQgaHRtbCAyLjAvL1wiLFxuICAgIFwiLS8vbydyZWlsbHkgYW5kIGFzc29jaWF0ZXMvL2R0ZCBodG1sIGV4dGVuZGVkIDEuMC8vXCIsXG4gICAgXCItLy9vJ3JlaWxseSBhbmQgYXNzb2NpYXRlcy8vZHRkIGh0bWwgZXh0ZW5kZWQgcmVsYXhlZCAxLjAvL1wiLFxuICAgICctLy9zcS8vZHRkIGh0bWwgMi4wIGhvdG1ldGFsICsgZXh0ZW5zaW9ucy8vJyxcbiAgICAnLS8vc29mdHF1YWQgc29mdHdhcmUvL2R0ZCBob3RtZXRhbCBwcm8gNi4wOjoxOTk5MDYwMTo6ZXh0ZW5zaW9ucyB0byBodG1sIDQuMC8vJyxcbiAgICAnLS8vc29mdHF1YWQvL2R0ZCBob3RtZXRhbCBwcm8gNC4wOjoxOTk3MTAxMDo6ZXh0ZW5zaW9ucyB0byBodG1sIDQuMC8vJyxcbiAgICAnLS8vc3B5Z2xhc3MvL2R0ZCBodG1sIDIuMCBleHRlbmRlZC8vJyxcbiAgICAnLS8vc3VuIG1pY3Jvc3lzdGVtcyBjb3JwLi8vZHRkIGhvdGphdmEgaHRtbC8vJyxcbiAgICAnLS8vc3VuIG1pY3Jvc3lzdGVtcyBjb3JwLi8vZHRkIGhvdGphdmEgc3RyaWN0IGh0bWwvLycsXG4gICAgJy0vL3czYy8vZHRkIGh0bWwgMyAxOTk1LTAzLTI0Ly8nLFxuICAgICctLy93M2MvL2R0ZCBodG1sIDMuMiBkcmFmdC8vJyxcbiAgICAnLS8vdzNjLy9kdGQgaHRtbCAzLjIgZmluYWwvLycsXG4gICAgJy0vL3czYy8vZHRkIGh0bWwgMy4yLy8nLFxuICAgICctLy93M2MvL2R0ZCBodG1sIDMuMnMgZHJhZnQvLycsXG4gICAgJy0vL3czYy8vZHRkIGh0bWwgNC4wIGZyYW1lc2V0Ly8nLFxuICAgICctLy93M2MvL2R0ZCBodG1sIDQuMCB0cmFuc2l0aW9uYWwvLycsXG4gICAgJy0vL3czYy8vZHRkIGh0bWwgZXhwZXJpbWVudGFsIDE5OTYwNzEyLy8nLFxuICAgICctLy93M2MvL2R0ZCBodG1sIGV4cGVyaW1lbnRhbCA5NzA0MjEvLycsXG4gICAgJy0vL3czYy8vZHRkIHczIGh0bWwvLycsXG4gICAgJy0vL3czby8vZHRkIHczIGh0bWwgMy4wLy8nLFxuICAgICctLy93ZWJ0ZWNocy8vZHRkIG1vemlsbGEgaHRtbCAyLjAvLycsXG4gICAgJy0vL3dlYnRlY2hzLy9kdGQgbW96aWxsYSBodG1sLy8nXG5dO1xuXG5jb25zdCBRVUlSS1NfTU9ERV9OT19TWVNURU1fSURfUFVCTElDX0lEX1BSRUZJWEVTID0gUVVJUktTX01PREVfUFVCTElDX0lEX1BSRUZJWEVTLmNvbmNhdChbXG4gICAgJy0vL3czYy8vZHRkIGh0bWwgNC4wMSBmcmFtZXNldC8vJyxcbiAgICAnLS8vdzNjLy9kdGQgaHRtbCA0LjAxIHRyYW5zaXRpb25hbC8vJ1xuXSk7XG5cbmNvbnN0IFFVSVJLU19NT0RFX1BVQkxJQ19JRFMgPSBbJy0vL3czby8vZHRkIHczIGh0bWwgc3RyaWN0IDMuMC8vZW4vLycsICctL3czYy9kdGQgaHRtbCA0LjAgdHJhbnNpdGlvbmFsL2VuJywgJ2h0bWwnXTtcbmNvbnN0IExJTUlURURfUVVJUktTX1BVQkxJQ19JRF9QUkVGSVhFUyA9IFsnLS8vdzNjLy9kdGQgeGh0bWwgMS4wIGZyYW1lc2V0Ly8nLCAnLS8vdzNjLy9kdGQgeGh0bWwgMS4wIHRyYW5zaXRpb25hbC8vJ107XG5cbmNvbnN0IExJTUlURURfUVVJUktTX1dJVEhfU1lTVEVNX0lEX1BVQkxJQ19JRF9QUkVGSVhFUyA9IExJTUlURURfUVVJUktTX1BVQkxJQ19JRF9QUkVGSVhFUy5jb25jYXQoW1xuICAgICctLy93M2MvL2R0ZCBodG1sIDQuMDEgZnJhbWVzZXQvLycsXG4gICAgJy0vL3czYy8vZHRkIGh0bWwgNC4wMSB0cmFuc2l0aW9uYWwvLydcbl0pO1xuXG4vL1V0aWxzXG5mdW5jdGlvbiBlbnF1b3RlRG9jdHlwZUlkKGlkKSB7XG4gICAgY29uc3QgcXVvdGUgPSBpZC5pbmRleE9mKCdcIicpICE9PSAtMSA/IFwiJ1wiIDogJ1wiJztcblxuICAgIHJldHVybiBxdW90ZSArIGlkICsgcXVvdGU7XG59XG5cbmZ1bmN0aW9uIGhhc1ByZWZpeChwdWJsaWNJZCwgcHJlZml4ZXMpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHByZWZpeGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChwdWJsaWNJZC5pbmRleE9mKHByZWZpeGVzW2ldKSA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8vQVBJXG5leHBvcnRzLmlzQ29uZm9ybWluZyA9IGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgdG9rZW4ubmFtZSA9PT0gVkFMSURfRE9DVFlQRV9OQU1FICYmXG4gICAgICAgIHRva2VuLnB1YmxpY0lkID09PSBudWxsICYmXG4gICAgICAgICh0b2tlbi5zeXN0ZW1JZCA9PT0gbnVsbCB8fCB0b2tlbi5zeXN0ZW1JZCA9PT0gVkFMSURfU1lTVEVNX0lEKVxuICAgICk7XG59O1xuXG5leHBvcnRzLmdldERvY3VtZW50TW9kZSA9IGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgaWYgKHRva2VuLm5hbWUgIT09IFZBTElEX0RPQ1RZUEVfTkFNRSkge1xuICAgICAgICByZXR1cm4gRE9DVU1FTlRfTU9ERS5RVUlSS1M7XG4gICAgfVxuXG4gICAgY29uc3Qgc3lzdGVtSWQgPSB0b2tlbi5zeXN0ZW1JZDtcblxuICAgIGlmIChzeXN0ZW1JZCAmJiBzeXN0ZW1JZC50b0xvd2VyQ2FzZSgpID09PSBRVUlSS1NfTU9ERV9TWVNURU1fSUQpIHtcbiAgICAgICAgcmV0dXJuIERPQ1VNRU5UX01PREUuUVVJUktTO1xuICAgIH1cblxuICAgIGxldCBwdWJsaWNJZCA9IHRva2VuLnB1YmxpY0lkO1xuXG4gICAgaWYgKHB1YmxpY0lkICE9PSBudWxsKSB7XG4gICAgICAgIHB1YmxpY0lkID0gcHVibGljSWQudG9Mb3dlckNhc2UoKTtcblxuICAgICAgICBpZiAoUVVJUktTX01PREVfUFVCTElDX0lEUy5pbmRleE9mKHB1YmxpY0lkKSA+IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gRE9DVU1FTlRfTU9ERS5RVUlSS1M7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcHJlZml4ZXMgPSBzeXN0ZW1JZCA9PT0gbnVsbCA/IFFVSVJLU19NT0RFX05PX1NZU1RFTV9JRF9QVUJMSUNfSURfUFJFRklYRVMgOiBRVUlSS1NfTU9ERV9QVUJMSUNfSURfUFJFRklYRVM7XG5cbiAgICAgICAgaWYgKGhhc1ByZWZpeChwdWJsaWNJZCwgcHJlZml4ZXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gRE9DVU1FTlRfTU9ERS5RVUlSS1M7XG4gICAgICAgIH1cblxuICAgICAgICBwcmVmaXhlcyA9XG4gICAgICAgICAgICBzeXN0ZW1JZCA9PT0gbnVsbCA/IExJTUlURURfUVVJUktTX1BVQkxJQ19JRF9QUkVGSVhFUyA6IExJTUlURURfUVVJUktTX1dJVEhfU1lTVEVNX0lEX1BVQkxJQ19JRF9QUkVGSVhFUztcblxuICAgICAgICBpZiAoaGFzUHJlZml4KHB1YmxpY0lkLCBwcmVmaXhlcykpIHtcbiAgICAgICAgICAgIHJldHVybiBET0NVTUVOVF9NT0RFLkxJTUlURURfUVVJUktTO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIERPQ1VNRU5UX01PREUuTk9fUVVJUktTO1xufTtcblxuZXhwb3J0cy5zZXJpYWxpemVDb250ZW50ID0gZnVuY3Rpb24obmFtZSwgcHVibGljSWQsIHN5c3RlbUlkKSB7XG4gICAgbGV0IHN0ciA9ICchRE9DVFlQRSAnO1xuXG4gICAgaWYgKG5hbWUpIHtcbiAgICAgICAgc3RyICs9IG5hbWU7XG4gICAgfVxuXG4gICAgaWYgKHB1YmxpY0lkKSB7XG4gICAgICAgIHN0ciArPSAnIFBVQkxJQyAnICsgZW5xdW90ZURvY3R5cGVJZChwdWJsaWNJZCk7XG4gICAgfSBlbHNlIGlmIChzeXN0ZW1JZCkge1xuICAgICAgICBzdHIgKz0gJyBTWVNURU0nO1xuICAgIH1cblxuICAgIGlmIChzeXN0ZW1JZCAhPT0gbnVsbCkge1xuICAgICAgICBzdHIgKz0gJyAnICsgZW5xdW90ZURvY3R5cGVJZChzeXN0ZW1JZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cjtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNvbnRyb2xDaGFyYWN0ZXJJbklucHV0U3RyZWFtOiAnY29udHJvbC1jaGFyYWN0ZXItaW4taW5wdXQtc3RyZWFtJyxcbiAgICBub25jaGFyYWN0ZXJJbklucHV0U3RyZWFtOiAnbm9uY2hhcmFjdGVyLWluLWlucHV0LXN0cmVhbScsXG4gICAgc3Vycm9nYXRlSW5JbnB1dFN0cmVhbTogJ3N1cnJvZ2F0ZS1pbi1pbnB1dC1zdHJlYW0nLFxuICAgIG5vblZvaWRIdG1sRWxlbWVudFN0YXJ0VGFnV2l0aFRyYWlsaW5nU29saWR1czogJ25vbi12b2lkLWh0bWwtZWxlbWVudC1zdGFydC10YWctd2l0aC10cmFpbGluZy1zb2xpZHVzJyxcbiAgICBlbmRUYWdXaXRoQXR0cmlidXRlczogJ2VuZC10YWctd2l0aC1hdHRyaWJ1dGVzJyxcbiAgICBlbmRUYWdXaXRoVHJhaWxpbmdTb2xpZHVzOiAnZW5kLXRhZy13aXRoLXRyYWlsaW5nLXNvbGlkdXMnLFxuICAgIHVuZXhwZWN0ZWRTb2xpZHVzSW5UYWc6ICd1bmV4cGVjdGVkLXNvbGlkdXMtaW4tdGFnJyxcbiAgICB1bmV4cGVjdGVkTnVsbENoYXJhY3RlcjogJ3VuZXhwZWN0ZWQtbnVsbC1jaGFyYWN0ZXInLFxuICAgIHVuZXhwZWN0ZWRRdWVzdGlvbk1hcmtJbnN0ZWFkT2ZUYWdOYW1lOiAndW5leHBlY3RlZC1xdWVzdGlvbi1tYXJrLWluc3RlYWQtb2YtdGFnLW5hbWUnLFxuICAgIGludmFsaWRGaXJzdENoYXJhY3Rlck9mVGFnTmFtZTogJ2ludmFsaWQtZmlyc3QtY2hhcmFjdGVyLW9mLXRhZy1uYW1lJyxcbiAgICB1bmV4cGVjdGVkRXF1YWxzU2lnbkJlZm9yZUF0dHJpYnV0ZU5hbWU6ICd1bmV4cGVjdGVkLWVxdWFscy1zaWduLWJlZm9yZS1hdHRyaWJ1dGUtbmFtZScsXG4gICAgbWlzc2luZ0VuZFRhZ05hbWU6ICdtaXNzaW5nLWVuZC10YWctbmFtZScsXG4gICAgdW5leHBlY3RlZENoYXJhY3RlckluQXR0cmlidXRlTmFtZTogJ3VuZXhwZWN0ZWQtY2hhcmFjdGVyLWluLWF0dHJpYnV0ZS1uYW1lJyxcbiAgICB1bmtub3duTmFtZWRDaGFyYWN0ZXJSZWZlcmVuY2U6ICd1bmtub3duLW5hbWVkLWNoYXJhY3Rlci1yZWZlcmVuY2UnLFxuICAgIG1pc3NpbmdTZW1pY29sb25BZnRlckNoYXJhY3RlclJlZmVyZW5jZTogJ21pc3Npbmctc2VtaWNvbG9uLWFmdGVyLWNoYXJhY3Rlci1yZWZlcmVuY2UnLFxuICAgIHVuZXhwZWN0ZWRDaGFyYWN0ZXJBZnRlckRvY3R5cGVTeXN0ZW1JZGVudGlmaWVyOiAndW5leHBlY3RlZC1jaGFyYWN0ZXItYWZ0ZXItZG9jdHlwZS1zeXN0ZW0taWRlbnRpZmllcicsXG4gICAgdW5leHBlY3RlZENoYXJhY3RlckluVW5xdW90ZWRBdHRyaWJ1dGVWYWx1ZTogJ3VuZXhwZWN0ZWQtY2hhcmFjdGVyLWluLXVucXVvdGVkLWF0dHJpYnV0ZS12YWx1ZScsXG4gICAgZW9mQmVmb3JlVGFnTmFtZTogJ2VvZi1iZWZvcmUtdGFnLW5hbWUnLFxuICAgIGVvZkluVGFnOiAnZW9mLWluLXRhZycsXG4gICAgbWlzc2luZ0F0dHJpYnV0ZVZhbHVlOiAnbWlzc2luZy1hdHRyaWJ1dGUtdmFsdWUnLFxuICAgIG1pc3NpbmdXaGl0ZXNwYWNlQmV0d2VlbkF0dHJpYnV0ZXM6ICdtaXNzaW5nLXdoaXRlc3BhY2UtYmV0d2Vlbi1hdHRyaWJ1dGVzJyxcbiAgICBtaXNzaW5nV2hpdGVzcGFjZUFmdGVyRG9jdHlwZVB1YmxpY0tleXdvcmQ6ICdtaXNzaW5nLXdoaXRlc3BhY2UtYWZ0ZXItZG9jdHlwZS1wdWJsaWMta2V5d29yZCcsXG4gICAgbWlzc2luZ1doaXRlc3BhY2VCZXR3ZWVuRG9jdHlwZVB1YmxpY0FuZFN5c3RlbUlkZW50aWZpZXJzOlxuICAgICAgICAnbWlzc2luZy13aGl0ZXNwYWNlLWJldHdlZW4tZG9jdHlwZS1wdWJsaWMtYW5kLXN5c3RlbS1pZGVudGlmaWVycycsXG4gICAgbWlzc2luZ1doaXRlc3BhY2VBZnRlckRvY3R5cGVTeXN0ZW1LZXl3b3JkOiAnbWlzc2luZy13aGl0ZXNwYWNlLWFmdGVyLWRvY3R5cGUtc3lzdGVtLWtleXdvcmQnLFxuICAgIG1pc3NpbmdRdW90ZUJlZm9yZURvY3R5cGVQdWJsaWNJZGVudGlmaWVyOiAnbWlzc2luZy1xdW90ZS1iZWZvcmUtZG9jdHlwZS1wdWJsaWMtaWRlbnRpZmllcicsXG4gICAgbWlzc2luZ1F1b3RlQmVmb3JlRG9jdHlwZVN5c3RlbUlkZW50aWZpZXI6ICdtaXNzaW5nLXF1b3RlLWJlZm9yZS1kb2N0eXBlLXN5c3RlbS1pZGVudGlmaWVyJyxcbiAgICBtaXNzaW5nRG9jdHlwZVB1YmxpY0lkZW50aWZpZXI6ICdtaXNzaW5nLWRvY3R5cGUtcHVibGljLWlkZW50aWZpZXInLFxuICAgIG1pc3NpbmdEb2N0eXBlU3lzdGVtSWRlbnRpZmllcjogJ21pc3NpbmctZG9jdHlwZS1zeXN0ZW0taWRlbnRpZmllcicsXG4gICAgYWJydXB0RG9jdHlwZVB1YmxpY0lkZW50aWZpZXI6ICdhYnJ1cHQtZG9jdHlwZS1wdWJsaWMtaWRlbnRpZmllcicsXG4gICAgYWJydXB0RG9jdHlwZVN5c3RlbUlkZW50aWZpZXI6ICdhYnJ1cHQtZG9jdHlwZS1zeXN0ZW0taWRlbnRpZmllcicsXG4gICAgY2RhdGFJbkh0bWxDb250ZW50OiAnY2RhdGEtaW4taHRtbC1jb250ZW50JyxcbiAgICBpbmNvcnJlY3RseU9wZW5lZENvbW1lbnQ6ICdpbmNvcnJlY3RseS1vcGVuZWQtY29tbWVudCcsXG4gICAgZW9mSW5TY3JpcHRIdG1sQ29tbWVudExpa2VUZXh0OiAnZW9mLWluLXNjcmlwdC1odG1sLWNvbW1lbnQtbGlrZS10ZXh0JyxcbiAgICBlb2ZJbkRvY3R5cGU6ICdlb2YtaW4tZG9jdHlwZScsXG4gICAgbmVzdGVkQ29tbWVudDogJ25lc3RlZC1jb21tZW50JyxcbiAgICBhYnJ1cHRDbG9zaW5nT2ZFbXB0eUNvbW1lbnQ6ICdhYnJ1cHQtY2xvc2luZy1vZi1lbXB0eS1jb21tZW50JyxcbiAgICBlb2ZJbkNvbW1lbnQ6ICdlb2YtaW4tY29tbWVudCcsXG4gICAgaW5jb3JyZWN0bHlDbG9zZWRDb21tZW50OiAnaW5jb3JyZWN0bHktY2xvc2VkLWNvbW1lbnQnLFxuICAgIGVvZkluQ2RhdGE6ICdlb2YtaW4tY2RhdGEnLFxuICAgIGFic2VuY2VPZkRpZ2l0c0luTnVtZXJpY0NoYXJhY3RlclJlZmVyZW5jZTogJ2Fic2VuY2Utb2YtZGlnaXRzLWluLW51bWVyaWMtY2hhcmFjdGVyLXJlZmVyZW5jZScsXG4gICAgbnVsbENoYXJhY3RlclJlZmVyZW5jZTogJ251bGwtY2hhcmFjdGVyLXJlZmVyZW5jZScsXG4gICAgc3Vycm9nYXRlQ2hhcmFjdGVyUmVmZXJlbmNlOiAnc3Vycm9nYXRlLWNoYXJhY3Rlci1yZWZlcmVuY2UnLFxuICAgIGNoYXJhY3RlclJlZmVyZW5jZU91dHNpZGVVbmljb2RlUmFuZ2U6ICdjaGFyYWN0ZXItcmVmZXJlbmNlLW91dHNpZGUtdW5pY29kZS1yYW5nZScsXG4gICAgY29udHJvbENoYXJhY3RlclJlZmVyZW5jZTogJ2NvbnRyb2wtY2hhcmFjdGVyLXJlZmVyZW5jZScsXG4gICAgbm9uY2hhcmFjdGVyQ2hhcmFjdGVyUmVmZXJlbmNlOiAnbm9uY2hhcmFjdGVyLWNoYXJhY3Rlci1yZWZlcmVuY2UnLFxuICAgIG1pc3NpbmdXaGl0ZXNwYWNlQmVmb3JlRG9jdHlwZU5hbWU6ICdtaXNzaW5nLXdoaXRlc3BhY2UtYmVmb3JlLWRvY3R5cGUtbmFtZScsXG4gICAgbWlzc2luZ0RvY3R5cGVOYW1lOiAnbWlzc2luZy1kb2N0eXBlLW5hbWUnLFxuICAgIGludmFsaWRDaGFyYWN0ZXJTZXF1ZW5jZUFmdGVyRG9jdHlwZU5hbWU6ICdpbnZhbGlkLWNoYXJhY3Rlci1zZXF1ZW5jZS1hZnRlci1kb2N0eXBlLW5hbWUnLFxuICAgIGR1cGxpY2F0ZUF0dHJpYnV0ZTogJ2R1cGxpY2F0ZS1hdHRyaWJ1dGUnLFxuICAgIG5vbkNvbmZvcm1pbmdEb2N0eXBlOiAnbm9uLWNvbmZvcm1pbmctZG9jdHlwZScsXG4gICAgbWlzc2luZ0RvY3R5cGU6ICdtaXNzaW5nLWRvY3R5cGUnLFxuICAgIG1pc3BsYWNlZERvY3R5cGU6ICdtaXNwbGFjZWQtZG9jdHlwZScsXG4gICAgZW5kVGFnV2l0aG91dE1hdGNoaW5nT3BlbkVsZW1lbnQ6ICdlbmQtdGFnLXdpdGhvdXQtbWF0Y2hpbmctb3Blbi1lbGVtZW50JyxcbiAgICBjbG9zaW5nT2ZFbGVtZW50V2l0aE9wZW5DaGlsZEVsZW1lbnRzOiAnY2xvc2luZy1vZi1lbGVtZW50LXdpdGgtb3Blbi1jaGlsZC1lbGVtZW50cycsXG4gICAgZGlzYWxsb3dlZENvbnRlbnRJbk5vc2NyaXB0SW5IZWFkOiAnZGlzYWxsb3dlZC1jb250ZW50LWluLW5vc2NyaXB0LWluLWhlYWQnLFxuICAgIG9wZW5FbGVtZW50c0xlZnRBZnRlckVvZjogJ29wZW4tZWxlbWVudHMtbGVmdC1hZnRlci1lb2YnLFxuICAgIGFiYW5kb25lZEhlYWRFbGVtZW50Q2hpbGQ6ICdhYmFuZG9uZWQtaGVhZC1lbGVtZW50LWNoaWxkJyxcbiAgICBtaXNwbGFjZWRTdGFydFRhZ0ZvckhlYWRFbGVtZW50OiAnbWlzcGxhY2VkLXN0YXJ0LXRhZy1mb3ItaGVhZC1lbGVtZW50JyxcbiAgICBuZXN0ZWROb3NjcmlwdEluSGVhZDogJ25lc3RlZC1ub3NjcmlwdC1pbi1oZWFkJyxcbiAgICBlb2ZJbkVsZW1lbnRUaGF0Q2FuQ29udGFpbk9ubHlUZXh0OiAnZW9mLWluLWVsZW1lbnQtdGhhdC1jYW4tY29udGFpbi1vbmx5LXRleHQnXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBUb2tlbml6ZXIgPSByZXF1aXJlKCcuLi90b2tlbml6ZXInKTtcbmNvbnN0IEhUTUwgPSByZXF1aXJlKCcuL2h0bWwnKTtcblxuLy9BbGlhc2VzXG5jb25zdCAkID0gSFRNTC5UQUdfTkFNRVM7XG5jb25zdCBOUyA9IEhUTUwuTkFNRVNQQUNFUztcbmNvbnN0IEFUVFJTID0gSFRNTC5BVFRSUztcblxuLy9NSU1FIHR5cGVzXG5jb25zdCBNSU1FX1RZUEVTID0ge1xuICAgIFRFWFRfSFRNTDogJ3RleHQvaHRtbCcsXG4gICAgQVBQTElDQVRJT05fWE1MOiAnYXBwbGljYXRpb24veGh0bWwreG1sJ1xufTtcblxuLy9BdHRyaWJ1dGVzXG5jb25zdCBERUZJTklUSU9OX1VSTF9BVFRSID0gJ2RlZmluaXRpb251cmwnO1xuY29uc3QgQURKVVNURURfREVGSU5JVElPTl9VUkxfQVRUUiA9ICdkZWZpbml0aW9uVVJMJztcbmNvbnN0IFNWR19BVFRSU19BREpVU1RNRU5UX01BUCA9IHtcbiAgICBhdHRyaWJ1dGVuYW1lOiAnYXR0cmlidXRlTmFtZScsXG4gICAgYXR0cmlidXRldHlwZTogJ2F0dHJpYnV0ZVR5cGUnLFxuICAgIGJhc2VmcmVxdWVuY3k6ICdiYXNlRnJlcXVlbmN5JyxcbiAgICBiYXNlcHJvZmlsZTogJ2Jhc2VQcm9maWxlJyxcbiAgICBjYWxjbW9kZTogJ2NhbGNNb2RlJyxcbiAgICBjbGlwcGF0aHVuaXRzOiAnY2xpcFBhdGhVbml0cycsXG4gICAgZGlmZnVzZWNvbnN0YW50OiAnZGlmZnVzZUNvbnN0YW50JyxcbiAgICBlZGdlbW9kZTogJ2VkZ2VNb2RlJyxcbiAgICBmaWx0ZXJ1bml0czogJ2ZpbHRlclVuaXRzJyxcbiAgICBnbHlwaHJlZjogJ2dseXBoUmVmJyxcbiAgICBncmFkaWVudHRyYW5zZm9ybTogJ2dyYWRpZW50VHJhbnNmb3JtJyxcbiAgICBncmFkaWVudHVuaXRzOiAnZ3JhZGllbnRVbml0cycsXG4gICAga2VybmVsbWF0cml4OiAna2VybmVsTWF0cml4JyxcbiAgICBrZXJuZWx1bml0bGVuZ3RoOiAna2VybmVsVW5pdExlbmd0aCcsXG4gICAga2V5cG9pbnRzOiAna2V5UG9pbnRzJyxcbiAgICBrZXlzcGxpbmVzOiAna2V5U3BsaW5lcycsXG4gICAga2V5dGltZXM6ICdrZXlUaW1lcycsXG4gICAgbGVuZ3RoYWRqdXN0OiAnbGVuZ3RoQWRqdXN0JyxcbiAgICBsaW1pdGluZ2NvbmVhbmdsZTogJ2xpbWl0aW5nQ29uZUFuZ2xlJyxcbiAgICBtYXJrZXJoZWlnaHQ6ICdtYXJrZXJIZWlnaHQnLFxuICAgIG1hcmtlcnVuaXRzOiAnbWFya2VyVW5pdHMnLFxuICAgIG1hcmtlcndpZHRoOiAnbWFya2VyV2lkdGgnLFxuICAgIG1hc2tjb250ZW50dW5pdHM6ICdtYXNrQ29udGVudFVuaXRzJyxcbiAgICBtYXNrdW5pdHM6ICdtYXNrVW5pdHMnLFxuICAgIG51bW9jdGF2ZXM6ICdudW1PY3RhdmVzJyxcbiAgICBwYXRobGVuZ3RoOiAncGF0aExlbmd0aCcsXG4gICAgcGF0dGVybmNvbnRlbnR1bml0czogJ3BhdHRlcm5Db250ZW50VW5pdHMnLFxuICAgIHBhdHRlcm50cmFuc2Zvcm06ICdwYXR0ZXJuVHJhbnNmb3JtJyxcbiAgICBwYXR0ZXJudW5pdHM6ICdwYXR0ZXJuVW5pdHMnLFxuICAgIHBvaW50c2F0eDogJ3BvaW50c0F0WCcsXG4gICAgcG9pbnRzYXR5OiAncG9pbnRzQXRZJyxcbiAgICBwb2ludHNhdHo6ICdwb2ludHNBdFonLFxuICAgIHByZXNlcnZlYWxwaGE6ICdwcmVzZXJ2ZUFscGhhJyxcbiAgICBwcmVzZXJ2ZWFzcGVjdHJhdGlvOiAncHJlc2VydmVBc3BlY3RSYXRpbycsXG4gICAgcHJpbWl0aXZldW5pdHM6ICdwcmltaXRpdmVVbml0cycsXG4gICAgcmVmeDogJ3JlZlgnLFxuICAgIHJlZnk6ICdyZWZZJyxcbiAgICByZXBlYXRjb3VudDogJ3JlcGVhdENvdW50JyxcbiAgICByZXBlYXRkdXI6ICdyZXBlYXREdXInLFxuICAgIHJlcXVpcmVkZXh0ZW5zaW9uczogJ3JlcXVpcmVkRXh0ZW5zaW9ucycsXG4gICAgcmVxdWlyZWRmZWF0dXJlczogJ3JlcXVpcmVkRmVhdHVyZXMnLFxuICAgIHNwZWN1bGFyY29uc3RhbnQ6ICdzcGVjdWxhckNvbnN0YW50JyxcbiAgICBzcGVjdWxhcmV4cG9uZW50OiAnc3BlY3VsYXJFeHBvbmVudCcsXG4gICAgc3ByZWFkbWV0aG9kOiAnc3ByZWFkTWV0aG9kJyxcbiAgICBzdGFydG9mZnNldDogJ3N0YXJ0T2Zmc2V0JyxcbiAgICBzdGRkZXZpYXRpb246ICdzdGREZXZpYXRpb24nLFxuICAgIHN0aXRjaHRpbGVzOiAnc3RpdGNoVGlsZXMnLFxuICAgIHN1cmZhY2VzY2FsZTogJ3N1cmZhY2VTY2FsZScsXG4gICAgc3lzdGVtbGFuZ3VhZ2U6ICdzeXN0ZW1MYW5ndWFnZScsXG4gICAgdGFibGV2YWx1ZXM6ICd0YWJsZVZhbHVlcycsXG4gICAgdGFyZ2V0eDogJ3RhcmdldFgnLFxuICAgIHRhcmdldHk6ICd0YXJnZXRZJyxcbiAgICB0ZXh0bGVuZ3RoOiAndGV4dExlbmd0aCcsXG4gICAgdmlld2JveDogJ3ZpZXdCb3gnLFxuICAgIHZpZXd0YXJnZXQ6ICd2aWV3VGFyZ2V0JyxcbiAgICB4Y2hhbm5lbHNlbGVjdG9yOiAneENoYW5uZWxTZWxlY3RvcicsXG4gICAgeWNoYW5uZWxzZWxlY3RvcjogJ3lDaGFubmVsU2VsZWN0b3InLFxuICAgIHpvb21hbmRwYW46ICd6b29tQW5kUGFuJ1xufTtcblxuY29uc3QgWE1MX0FUVFJTX0FESlVTVE1FTlRfTUFQID0ge1xuICAgICd4bGluazphY3R1YXRlJzogeyBwcmVmaXg6ICd4bGluaycsIG5hbWU6ICdhY3R1YXRlJywgbmFtZXNwYWNlOiBOUy5YTElOSyB9LFxuICAgICd4bGluazphcmNyb2xlJzogeyBwcmVmaXg6ICd4bGluaycsIG5hbWU6ICdhcmNyb2xlJywgbmFtZXNwYWNlOiBOUy5YTElOSyB9LFxuICAgICd4bGluazpocmVmJzogeyBwcmVmaXg6ICd4bGluaycsIG5hbWU6ICdocmVmJywgbmFtZXNwYWNlOiBOUy5YTElOSyB9LFxuICAgICd4bGluazpyb2xlJzogeyBwcmVmaXg6ICd4bGluaycsIG5hbWU6ICdyb2xlJywgbmFtZXNwYWNlOiBOUy5YTElOSyB9LFxuICAgICd4bGluazpzaG93JzogeyBwcmVmaXg6ICd4bGluaycsIG5hbWU6ICdzaG93JywgbmFtZXNwYWNlOiBOUy5YTElOSyB9LFxuICAgICd4bGluazp0aXRsZSc6IHsgcHJlZml4OiAneGxpbmsnLCBuYW1lOiAndGl0bGUnLCBuYW1lc3BhY2U6IE5TLlhMSU5LIH0sXG4gICAgJ3hsaW5rOnR5cGUnOiB7IHByZWZpeDogJ3hsaW5rJywgbmFtZTogJ3R5cGUnLCBuYW1lc3BhY2U6IE5TLlhMSU5LIH0sXG4gICAgJ3htbDpiYXNlJzogeyBwcmVmaXg6ICd4bWwnLCBuYW1lOiAnYmFzZScsIG5hbWVzcGFjZTogTlMuWE1MIH0sXG4gICAgJ3htbDpsYW5nJzogeyBwcmVmaXg6ICd4bWwnLCBuYW1lOiAnbGFuZycsIG5hbWVzcGFjZTogTlMuWE1MIH0sXG4gICAgJ3htbDpzcGFjZSc6IHsgcHJlZml4OiAneG1sJywgbmFtZTogJ3NwYWNlJywgbmFtZXNwYWNlOiBOUy5YTUwgfSxcbiAgICB4bWxuczogeyBwcmVmaXg6ICcnLCBuYW1lOiAneG1sbnMnLCBuYW1lc3BhY2U6IE5TLlhNTE5TIH0sXG4gICAgJ3htbG5zOnhsaW5rJzogeyBwcmVmaXg6ICd4bWxucycsIG5hbWU6ICd4bGluaycsIG5hbWVzcGFjZTogTlMuWE1MTlMgfVxufTtcblxuLy9TVkcgdGFnIG5hbWVzIGFkanVzdG1lbnQgbWFwXG5jb25zdCBTVkdfVEFHX05BTUVTX0FESlVTVE1FTlRfTUFQID0gKGV4cG9ydHMuU1ZHX1RBR19OQU1FU19BREpVU1RNRU5UX01BUCA9IHtcbiAgICBhbHRnbHlwaDogJ2FsdEdseXBoJyxcbiAgICBhbHRnbHlwaGRlZjogJ2FsdEdseXBoRGVmJyxcbiAgICBhbHRnbHlwaGl0ZW06ICdhbHRHbHlwaEl0ZW0nLFxuICAgIGFuaW1hdGVjb2xvcjogJ2FuaW1hdGVDb2xvcicsXG4gICAgYW5pbWF0ZW1vdGlvbjogJ2FuaW1hdGVNb3Rpb24nLFxuICAgIGFuaW1hdGV0cmFuc2Zvcm06ICdhbmltYXRlVHJhbnNmb3JtJyxcbiAgICBjbGlwcGF0aDogJ2NsaXBQYXRoJyxcbiAgICBmZWJsZW5kOiAnZmVCbGVuZCcsXG4gICAgZmVjb2xvcm1hdHJpeDogJ2ZlQ29sb3JNYXRyaXgnLFxuICAgIGZlY29tcG9uZW50dHJhbnNmZXI6ICdmZUNvbXBvbmVudFRyYW5zZmVyJyxcbiAgICBmZWNvbXBvc2l0ZTogJ2ZlQ29tcG9zaXRlJyxcbiAgICBmZWNvbnZvbHZlbWF0cml4OiAnZmVDb252b2x2ZU1hdHJpeCcsXG4gICAgZmVkaWZmdXNlbGlnaHRpbmc6ICdmZURpZmZ1c2VMaWdodGluZycsXG4gICAgZmVkaXNwbGFjZW1lbnRtYXA6ICdmZURpc3BsYWNlbWVudE1hcCcsXG4gICAgZmVkaXN0YW50bGlnaHQ6ICdmZURpc3RhbnRMaWdodCcsXG4gICAgZmVmbG9vZDogJ2ZlRmxvb2QnLFxuICAgIGZlZnVuY2E6ICdmZUZ1bmNBJyxcbiAgICBmZWZ1bmNiOiAnZmVGdW5jQicsXG4gICAgZmVmdW5jZzogJ2ZlRnVuY0cnLFxuICAgIGZlZnVuY3I6ICdmZUZ1bmNSJyxcbiAgICBmZWdhdXNzaWFuYmx1cjogJ2ZlR2F1c3NpYW5CbHVyJyxcbiAgICBmZWltYWdlOiAnZmVJbWFnZScsXG4gICAgZmVtZXJnZTogJ2ZlTWVyZ2UnLFxuICAgIGZlbWVyZ2Vub2RlOiAnZmVNZXJnZU5vZGUnLFxuICAgIGZlbW9ycGhvbG9neTogJ2ZlTW9ycGhvbG9neScsXG4gICAgZmVvZmZzZXQ6ICdmZU9mZnNldCcsXG4gICAgZmVwb2ludGxpZ2h0OiAnZmVQb2ludExpZ2h0JyxcbiAgICBmZXNwZWN1bGFybGlnaHRpbmc6ICdmZVNwZWN1bGFyTGlnaHRpbmcnLFxuICAgIGZlc3BvdGxpZ2h0OiAnZmVTcG90TGlnaHQnLFxuICAgIGZldGlsZTogJ2ZlVGlsZScsXG4gICAgZmV0dXJidWxlbmNlOiAnZmVUdXJidWxlbmNlJyxcbiAgICBmb3JlaWdub2JqZWN0OiAnZm9yZWlnbk9iamVjdCcsXG4gICAgZ2x5cGhyZWY6ICdnbHlwaFJlZicsXG4gICAgbGluZWFyZ3JhZGllbnQ6ICdsaW5lYXJHcmFkaWVudCcsXG4gICAgcmFkaWFsZ3JhZGllbnQ6ICdyYWRpYWxHcmFkaWVudCcsXG4gICAgdGV4dHBhdGg6ICd0ZXh0UGF0aCdcbn0pO1xuXG4vL1RhZ3MgdGhhdCBjYXVzZXMgZXhpdCBmcm9tIGZvcmVpZ24gY29udGVudFxuY29uc3QgRVhJVFNfRk9SRUlHTl9DT05URU5UID0ge1xuICAgIFskLkJdOiB0cnVlLFxuICAgIFskLkJJR106IHRydWUsXG4gICAgWyQuQkxPQ0tRVU9URV06IHRydWUsXG4gICAgWyQuQk9EWV06IHRydWUsXG4gICAgWyQuQlJdOiB0cnVlLFxuICAgIFskLkNFTlRFUl06IHRydWUsXG4gICAgWyQuQ09ERV06IHRydWUsXG4gICAgWyQuRERdOiB0cnVlLFxuICAgIFskLkRJVl06IHRydWUsXG4gICAgWyQuRExdOiB0cnVlLFxuICAgIFskLkRUXTogdHJ1ZSxcbiAgICBbJC5FTV06IHRydWUsXG4gICAgWyQuRU1CRURdOiB0cnVlLFxuICAgIFskLkgxXTogdHJ1ZSxcbiAgICBbJC5IMl06IHRydWUsXG4gICAgWyQuSDNdOiB0cnVlLFxuICAgIFskLkg0XTogdHJ1ZSxcbiAgICBbJC5INV06IHRydWUsXG4gICAgWyQuSDZdOiB0cnVlLFxuICAgIFskLkhFQURdOiB0cnVlLFxuICAgIFskLkhSXTogdHJ1ZSxcbiAgICBbJC5JXTogdHJ1ZSxcbiAgICBbJC5JTUddOiB0cnVlLFxuICAgIFskLkxJXTogdHJ1ZSxcbiAgICBbJC5MSVNUSU5HXTogdHJ1ZSxcbiAgICBbJC5NRU5VXTogdHJ1ZSxcbiAgICBbJC5NRVRBXTogdHJ1ZSxcbiAgICBbJC5OT0JSXTogdHJ1ZSxcbiAgICBbJC5PTF06IHRydWUsXG4gICAgWyQuUF06IHRydWUsXG4gICAgWyQuUFJFXTogdHJ1ZSxcbiAgICBbJC5SVUJZXTogdHJ1ZSxcbiAgICBbJC5TXTogdHJ1ZSxcbiAgICBbJC5TTUFMTF06IHRydWUsXG4gICAgWyQuU1BBTl06IHRydWUsXG4gICAgWyQuU1RST05HXTogdHJ1ZSxcbiAgICBbJC5TVFJJS0VdOiB0cnVlLFxuICAgIFskLlNVQl06IHRydWUsXG4gICAgWyQuU1VQXTogdHJ1ZSxcbiAgICBbJC5UQUJMRV06IHRydWUsXG4gICAgWyQuVFRdOiB0cnVlLFxuICAgIFskLlVdOiB0cnVlLFxuICAgIFskLlVMXTogdHJ1ZSxcbiAgICBbJC5WQVJdOiB0cnVlXG59O1xuXG4vL0NoZWNrIGV4aXQgZnJvbSBmb3JlaWduIGNvbnRlbnRcbmV4cG9ydHMuY2F1c2VzRXhpdCA9IGZ1bmN0aW9uKHN0YXJ0VGFnVG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHN0YXJ0VGFnVG9rZW4udGFnTmFtZTtcbiAgICBjb25zdCBpc0ZvbnRXaXRoQXR0cnMgPVxuICAgICAgICB0biA9PT0gJC5GT05UICYmXG4gICAgICAgIChUb2tlbml6ZXIuZ2V0VG9rZW5BdHRyKHN0YXJ0VGFnVG9rZW4sIEFUVFJTLkNPTE9SKSAhPT0gbnVsbCB8fFxuICAgICAgICAgICAgVG9rZW5pemVyLmdldFRva2VuQXR0cihzdGFydFRhZ1Rva2VuLCBBVFRSUy5TSVpFKSAhPT0gbnVsbCB8fFxuICAgICAgICAgICAgVG9rZW5pemVyLmdldFRva2VuQXR0cihzdGFydFRhZ1Rva2VuLCBBVFRSUy5GQUNFKSAhPT0gbnVsbCk7XG5cbiAgICByZXR1cm4gaXNGb250V2l0aEF0dHJzID8gdHJ1ZSA6IEVYSVRTX0ZPUkVJR05fQ09OVEVOVFt0bl07XG59O1xuXG4vL1Rva2VuIGFkanVzdG1lbnRzXG5leHBvcnRzLmFkanVzdFRva2VuTWF0aE1MQXR0cnMgPSBmdW5jdGlvbih0b2tlbikge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW4uYXR0cnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRva2VuLmF0dHJzW2ldLm5hbWUgPT09IERFRklOSVRJT05fVVJMX0FUVFIpIHtcbiAgICAgICAgICAgIHRva2VuLmF0dHJzW2ldLm5hbWUgPSBBREpVU1RFRF9ERUZJTklUSU9OX1VSTF9BVFRSO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5leHBvcnRzLmFkanVzdFRva2VuU1ZHQXR0cnMgPSBmdW5jdGlvbih0b2tlbikge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW4uYXR0cnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgYWRqdXN0ZWRBdHRyTmFtZSA9IFNWR19BVFRSU19BREpVU1RNRU5UX01BUFt0b2tlbi5hdHRyc1tpXS5uYW1lXTtcblxuICAgICAgICBpZiAoYWRqdXN0ZWRBdHRyTmFtZSkge1xuICAgICAgICAgICAgdG9rZW4uYXR0cnNbaV0ubmFtZSA9IGFkanVzdGVkQXR0ck5hbWU7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5leHBvcnRzLmFkanVzdFRva2VuWE1MQXR0cnMgPSBmdW5jdGlvbih0b2tlbikge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW4uYXR0cnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgYWRqdXN0ZWRBdHRyRW50cnkgPSBYTUxfQVRUUlNfQURKVVNUTUVOVF9NQVBbdG9rZW4uYXR0cnNbaV0ubmFtZV07XG5cbiAgICAgICAgaWYgKGFkanVzdGVkQXR0ckVudHJ5KSB7XG4gICAgICAgICAgICB0b2tlbi5hdHRyc1tpXS5wcmVmaXggPSBhZGp1c3RlZEF0dHJFbnRyeS5wcmVmaXg7XG4gICAgICAgICAgICB0b2tlbi5hdHRyc1tpXS5uYW1lID0gYWRqdXN0ZWRBdHRyRW50cnkubmFtZTtcbiAgICAgICAgICAgIHRva2VuLmF0dHJzW2ldLm5hbWVzcGFjZSA9IGFkanVzdGVkQXR0ckVudHJ5Lm5hbWVzcGFjZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmV4cG9ydHMuYWRqdXN0VG9rZW5TVkdUYWdOYW1lID0gZnVuY3Rpb24odG9rZW4pIHtcbiAgICBjb25zdCBhZGp1c3RlZFRhZ05hbWUgPSBTVkdfVEFHX05BTUVTX0FESlVTVE1FTlRfTUFQW3Rva2VuLnRhZ05hbWVdO1xuXG4gICAgaWYgKGFkanVzdGVkVGFnTmFtZSkge1xuICAgICAgICB0b2tlbi50YWdOYW1lID0gYWRqdXN0ZWRUYWdOYW1lO1xuICAgIH1cbn07XG5cbi8vSW50ZWdyYXRpb24gcG9pbnRzXG5mdW5jdGlvbiBpc01hdGhNTFRleHRJbnRlZ3JhdGlvblBvaW50KHRuLCBucykge1xuICAgIHJldHVybiBucyA9PT0gTlMuTUFUSE1MICYmICh0biA9PT0gJC5NSSB8fCB0biA9PT0gJC5NTyB8fCB0biA9PT0gJC5NTiB8fCB0biA9PT0gJC5NUyB8fCB0biA9PT0gJC5NVEVYVCk7XG59XG5cbmZ1bmN0aW9uIGlzSHRtbEludGVncmF0aW9uUG9pbnQodG4sIG5zLCBhdHRycykge1xuICAgIGlmIChucyA9PT0gTlMuTUFUSE1MICYmIHRuID09PSAkLkFOTk9UQVRJT05fWE1MKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXR0cnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChhdHRyc1tpXS5uYW1lID09PSBBVFRSUy5FTkNPRElORykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXR0cnNbaV0udmFsdWUudG9Mb3dlckNhc2UoKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSA9PT0gTUlNRV9UWVBFUy5URVhUX0hUTUwgfHwgdmFsdWUgPT09IE1JTUVfVFlQRVMuQVBQTElDQVRJT05fWE1MO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5zID09PSBOUy5TVkcgJiYgKHRuID09PSAkLkZPUkVJR05fT0JKRUNUIHx8IHRuID09PSAkLkRFU0MgfHwgdG4gPT09ICQuVElUTEUpO1xufVxuXG5leHBvcnRzLmlzSW50ZWdyYXRpb25Qb2ludCA9IGZ1bmN0aW9uKHRuLCBucywgYXR0cnMsIGZvcmVpZ25OUykge1xuICAgIGlmICgoIWZvcmVpZ25OUyB8fCBmb3JlaWduTlMgPT09IE5TLkhUTUwpICYmIGlzSHRtbEludGVncmF0aW9uUG9pbnQodG4sIG5zLCBhdHRycykpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCghZm9yZWlnbk5TIHx8IGZvcmVpZ25OUyA9PT0gTlMuTUFUSE1MKSAmJiBpc01hdGhNTFRleHRJbnRlZ3JhdGlvblBvaW50KHRuLCBucykpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgTlMgPSAoZXhwb3J0cy5OQU1FU1BBQ0VTID0ge1xuICAgIEhUTUw6ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sJyxcbiAgICBNQVRITUw6ICdodHRwOi8vd3d3LnczLm9yZy8xOTk4L01hdGgvTWF0aE1MJyxcbiAgICBTVkc6ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsXG4gICAgWExJTks6ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJyxcbiAgICBYTUw6ICdodHRwOi8vd3d3LnczLm9yZy9YTUwvMTk5OC9uYW1lc3BhY2UnLFxuICAgIFhNTE5TOiAnaHR0cDovL3d3dy53My5vcmcvMjAwMC94bWxucy8nXG59KTtcblxuZXhwb3J0cy5BVFRSUyA9IHtcbiAgICBUWVBFOiAndHlwZScsXG4gICAgQUNUSU9OOiAnYWN0aW9uJyxcbiAgICBFTkNPRElORzogJ2VuY29kaW5nJyxcbiAgICBQUk9NUFQ6ICdwcm9tcHQnLFxuICAgIE5BTUU6ICduYW1lJyxcbiAgICBDT0xPUjogJ2NvbG9yJyxcbiAgICBGQUNFOiAnZmFjZScsXG4gICAgU0laRTogJ3NpemUnXG59O1xuXG5leHBvcnRzLkRPQ1VNRU5UX01PREUgPSB7XG4gICAgTk9fUVVJUktTOiAnbm8tcXVpcmtzJyxcbiAgICBRVUlSS1M6ICdxdWlya3MnLFxuICAgIExJTUlURURfUVVJUktTOiAnbGltaXRlZC1xdWlya3MnXG59O1xuXG5jb25zdCAkID0gKGV4cG9ydHMuVEFHX05BTUVTID0ge1xuICAgIEE6ICdhJyxcbiAgICBBRERSRVNTOiAnYWRkcmVzcycsXG4gICAgQU5OT1RBVElPTl9YTUw6ICdhbm5vdGF0aW9uLXhtbCcsXG4gICAgQVBQTEVUOiAnYXBwbGV0JyxcbiAgICBBUkVBOiAnYXJlYScsXG4gICAgQVJUSUNMRTogJ2FydGljbGUnLFxuICAgIEFTSURFOiAnYXNpZGUnLFxuXG4gICAgQjogJ2InLFxuICAgIEJBU0U6ICdiYXNlJyxcbiAgICBCQVNFRk9OVDogJ2Jhc2Vmb250JyxcbiAgICBCR1NPVU5EOiAnYmdzb3VuZCcsXG4gICAgQklHOiAnYmlnJyxcbiAgICBCTE9DS1FVT1RFOiAnYmxvY2txdW90ZScsXG4gICAgQk9EWTogJ2JvZHknLFxuICAgIEJSOiAnYnInLFxuICAgIEJVVFRPTjogJ2J1dHRvbicsXG5cbiAgICBDQVBUSU9OOiAnY2FwdGlvbicsXG4gICAgQ0VOVEVSOiAnY2VudGVyJyxcbiAgICBDT0RFOiAnY29kZScsXG4gICAgQ09MOiAnY29sJyxcbiAgICBDT0xHUk9VUDogJ2NvbGdyb3VwJyxcblxuICAgIEREOiAnZGQnLFxuICAgIERFU0M6ICdkZXNjJyxcbiAgICBERVRBSUxTOiAnZGV0YWlscycsXG4gICAgRElBTE9HOiAnZGlhbG9nJyxcbiAgICBESVI6ICdkaXInLFxuICAgIERJVjogJ2RpdicsXG4gICAgREw6ICdkbCcsXG4gICAgRFQ6ICdkdCcsXG5cbiAgICBFTTogJ2VtJyxcbiAgICBFTUJFRDogJ2VtYmVkJyxcblxuICAgIEZJRUxEU0VUOiAnZmllbGRzZXQnLFxuICAgIEZJR0NBUFRJT046ICdmaWdjYXB0aW9uJyxcbiAgICBGSUdVUkU6ICdmaWd1cmUnLFxuICAgIEZPTlQ6ICdmb250JyxcbiAgICBGT09URVI6ICdmb290ZXInLFxuICAgIEZPUkVJR05fT0JKRUNUOiAnZm9yZWlnbk9iamVjdCcsXG4gICAgRk9STTogJ2Zvcm0nLFxuICAgIEZSQU1FOiAnZnJhbWUnLFxuICAgIEZSQU1FU0VUOiAnZnJhbWVzZXQnLFxuXG4gICAgSDE6ICdoMScsXG4gICAgSDI6ICdoMicsXG4gICAgSDM6ICdoMycsXG4gICAgSDQ6ICdoNCcsXG4gICAgSDU6ICdoNScsXG4gICAgSDY6ICdoNicsXG4gICAgSEVBRDogJ2hlYWQnLFxuICAgIEhFQURFUjogJ2hlYWRlcicsXG4gICAgSEdST1VQOiAnaGdyb3VwJyxcbiAgICBIUjogJ2hyJyxcbiAgICBIVE1MOiAnaHRtbCcsXG5cbiAgICBJOiAnaScsXG4gICAgSU1HOiAnaW1nJyxcbiAgICBJTUFHRTogJ2ltYWdlJyxcbiAgICBJTlBVVDogJ2lucHV0JyxcbiAgICBJRlJBTUU6ICdpZnJhbWUnLFxuXG4gICAgS0VZR0VOOiAna2V5Z2VuJyxcblxuICAgIExBQkVMOiAnbGFiZWwnLFxuICAgIExJOiAnbGknLFxuICAgIExJTks6ICdsaW5rJyxcbiAgICBMSVNUSU5HOiAnbGlzdGluZycsXG5cbiAgICBNQUlOOiAnbWFpbicsXG4gICAgTUFMSUdOTUFSSzogJ21hbGlnbm1hcmsnLFxuICAgIE1BUlFVRUU6ICdtYXJxdWVlJyxcbiAgICBNQVRIOiAnbWF0aCcsXG4gICAgTUVOVTogJ21lbnUnLFxuICAgIE1FVEE6ICdtZXRhJyxcbiAgICBNR0xZUEg6ICdtZ2x5cGgnLFxuICAgIE1JOiAnbWknLFxuICAgIE1POiAnbW8nLFxuICAgIE1OOiAnbW4nLFxuICAgIE1TOiAnbXMnLFxuICAgIE1URVhUOiAnbXRleHQnLFxuXG4gICAgTkFWOiAnbmF2JyxcbiAgICBOT0JSOiAnbm9icicsXG4gICAgTk9GUkFNRVM6ICdub2ZyYW1lcycsXG4gICAgTk9FTUJFRDogJ25vZW1iZWQnLFxuICAgIE5PU0NSSVBUOiAnbm9zY3JpcHQnLFxuXG4gICAgT0JKRUNUOiAnb2JqZWN0JyxcbiAgICBPTDogJ29sJyxcbiAgICBPUFRHUk9VUDogJ29wdGdyb3VwJyxcbiAgICBPUFRJT046ICdvcHRpb24nLFxuXG4gICAgUDogJ3AnLFxuICAgIFBBUkFNOiAncGFyYW0nLFxuICAgIFBMQUlOVEVYVDogJ3BsYWludGV4dCcsXG4gICAgUFJFOiAncHJlJyxcblxuICAgIFJCOiAncmInLFxuICAgIFJQOiAncnAnLFxuICAgIFJUOiAncnQnLFxuICAgIFJUQzogJ3J0YycsXG4gICAgUlVCWTogJ3J1YnknLFxuXG4gICAgUzogJ3MnLFxuICAgIFNDUklQVDogJ3NjcmlwdCcsXG4gICAgU0VDVElPTjogJ3NlY3Rpb24nLFxuICAgIFNFTEVDVDogJ3NlbGVjdCcsXG4gICAgU09VUkNFOiAnc291cmNlJyxcbiAgICBTTUFMTDogJ3NtYWxsJyxcbiAgICBTUEFOOiAnc3BhbicsXG4gICAgU1RSSUtFOiAnc3RyaWtlJyxcbiAgICBTVFJPTkc6ICdzdHJvbmcnLFxuICAgIFNUWUxFOiAnc3R5bGUnLFxuICAgIFNVQjogJ3N1YicsXG4gICAgU1VNTUFSWTogJ3N1bW1hcnknLFxuICAgIFNVUDogJ3N1cCcsXG5cbiAgICBUQUJMRTogJ3RhYmxlJyxcbiAgICBUQk9EWTogJ3Rib2R5JyxcbiAgICBURU1QTEFURTogJ3RlbXBsYXRlJyxcbiAgICBURVhUQVJFQTogJ3RleHRhcmVhJyxcbiAgICBURk9PVDogJ3Rmb290JyxcbiAgICBURDogJ3RkJyxcbiAgICBUSDogJ3RoJyxcbiAgICBUSEVBRDogJ3RoZWFkJyxcbiAgICBUSVRMRTogJ3RpdGxlJyxcbiAgICBUUjogJ3RyJyxcbiAgICBUUkFDSzogJ3RyYWNrJyxcbiAgICBUVDogJ3R0JyxcblxuICAgIFU6ICd1JyxcbiAgICBVTDogJ3VsJyxcblxuICAgIFNWRzogJ3N2ZycsXG5cbiAgICBWQVI6ICd2YXInLFxuXG4gICAgV0JSOiAnd2JyJyxcblxuICAgIFhNUDogJ3htcCdcbn0pO1xuXG5leHBvcnRzLlNQRUNJQUxfRUxFTUVOVFMgPSB7XG4gICAgW05TLkhUTUxdOiB7XG4gICAgICAgIFskLkFERFJFU1NdOiB0cnVlLFxuICAgICAgICBbJC5BUFBMRVRdOiB0cnVlLFxuICAgICAgICBbJC5BUkVBXTogdHJ1ZSxcbiAgICAgICAgWyQuQVJUSUNMRV06IHRydWUsXG4gICAgICAgIFskLkFTSURFXTogdHJ1ZSxcbiAgICAgICAgWyQuQkFTRV06IHRydWUsXG4gICAgICAgIFskLkJBU0VGT05UXTogdHJ1ZSxcbiAgICAgICAgWyQuQkdTT1VORF06IHRydWUsXG4gICAgICAgIFskLkJMT0NLUVVPVEVdOiB0cnVlLFxuICAgICAgICBbJC5CT0RZXTogdHJ1ZSxcbiAgICAgICAgWyQuQlJdOiB0cnVlLFxuICAgICAgICBbJC5CVVRUT05dOiB0cnVlLFxuICAgICAgICBbJC5DQVBUSU9OXTogdHJ1ZSxcbiAgICAgICAgWyQuQ0VOVEVSXTogdHJ1ZSxcbiAgICAgICAgWyQuQ09MXTogdHJ1ZSxcbiAgICAgICAgWyQuQ09MR1JPVVBdOiB0cnVlLFxuICAgICAgICBbJC5ERF06IHRydWUsXG4gICAgICAgIFskLkRFVEFJTFNdOiB0cnVlLFxuICAgICAgICBbJC5ESVJdOiB0cnVlLFxuICAgICAgICBbJC5ESVZdOiB0cnVlLFxuICAgICAgICBbJC5ETF06IHRydWUsXG4gICAgICAgIFskLkRUXTogdHJ1ZSxcbiAgICAgICAgWyQuRU1CRURdOiB0cnVlLFxuICAgICAgICBbJC5GSUVMRFNFVF06IHRydWUsXG4gICAgICAgIFskLkZJR0NBUFRJT05dOiB0cnVlLFxuICAgICAgICBbJC5GSUdVUkVdOiB0cnVlLFxuICAgICAgICBbJC5GT09URVJdOiB0cnVlLFxuICAgICAgICBbJC5GT1JNXTogdHJ1ZSxcbiAgICAgICAgWyQuRlJBTUVdOiB0cnVlLFxuICAgICAgICBbJC5GUkFNRVNFVF06IHRydWUsXG4gICAgICAgIFskLkgxXTogdHJ1ZSxcbiAgICAgICAgWyQuSDJdOiB0cnVlLFxuICAgICAgICBbJC5IM106IHRydWUsXG4gICAgICAgIFskLkg0XTogdHJ1ZSxcbiAgICAgICAgWyQuSDVdOiB0cnVlLFxuICAgICAgICBbJC5INl06IHRydWUsXG4gICAgICAgIFskLkhFQURdOiB0cnVlLFxuICAgICAgICBbJC5IRUFERVJdOiB0cnVlLFxuICAgICAgICBbJC5IR1JPVVBdOiB0cnVlLFxuICAgICAgICBbJC5IUl06IHRydWUsXG4gICAgICAgIFskLkhUTUxdOiB0cnVlLFxuICAgICAgICBbJC5JRlJBTUVdOiB0cnVlLFxuICAgICAgICBbJC5JTUddOiB0cnVlLFxuICAgICAgICBbJC5JTlBVVF06IHRydWUsXG4gICAgICAgIFskLkxJXTogdHJ1ZSxcbiAgICAgICAgWyQuTElOS106IHRydWUsXG4gICAgICAgIFskLkxJU1RJTkddOiB0cnVlLFxuICAgICAgICBbJC5NQUlOXTogdHJ1ZSxcbiAgICAgICAgWyQuTUFSUVVFRV06IHRydWUsXG4gICAgICAgIFskLk1FTlVdOiB0cnVlLFxuICAgICAgICBbJC5NRVRBXTogdHJ1ZSxcbiAgICAgICAgWyQuTkFWXTogdHJ1ZSxcbiAgICAgICAgWyQuTk9FTUJFRF06IHRydWUsXG4gICAgICAgIFskLk5PRlJBTUVTXTogdHJ1ZSxcbiAgICAgICAgWyQuTk9TQ1JJUFRdOiB0cnVlLFxuICAgICAgICBbJC5PQkpFQ1RdOiB0cnVlLFxuICAgICAgICBbJC5PTF06IHRydWUsXG4gICAgICAgIFskLlBdOiB0cnVlLFxuICAgICAgICBbJC5QQVJBTV06IHRydWUsXG4gICAgICAgIFskLlBMQUlOVEVYVF06IHRydWUsXG4gICAgICAgIFskLlBSRV06IHRydWUsXG4gICAgICAgIFskLlNDUklQVF06IHRydWUsXG4gICAgICAgIFskLlNFQ1RJT05dOiB0cnVlLFxuICAgICAgICBbJC5TRUxFQ1RdOiB0cnVlLFxuICAgICAgICBbJC5TT1VSQ0VdOiB0cnVlLFxuICAgICAgICBbJC5TVFlMRV06IHRydWUsXG4gICAgICAgIFskLlNVTU1BUlldOiB0cnVlLFxuICAgICAgICBbJC5UQUJMRV06IHRydWUsXG4gICAgICAgIFskLlRCT0RZXTogdHJ1ZSxcbiAgICAgICAgWyQuVERdOiB0cnVlLFxuICAgICAgICBbJC5URU1QTEFURV06IHRydWUsXG4gICAgICAgIFskLlRFWFRBUkVBXTogdHJ1ZSxcbiAgICAgICAgWyQuVEZPT1RdOiB0cnVlLFxuICAgICAgICBbJC5USF06IHRydWUsXG4gICAgICAgIFskLlRIRUFEXTogdHJ1ZSxcbiAgICAgICAgWyQuVElUTEVdOiB0cnVlLFxuICAgICAgICBbJC5UUl06IHRydWUsXG4gICAgICAgIFskLlRSQUNLXTogdHJ1ZSxcbiAgICAgICAgWyQuVUxdOiB0cnVlLFxuICAgICAgICBbJC5XQlJdOiB0cnVlLFxuICAgICAgICBbJC5YTVBdOiB0cnVlXG4gICAgfSxcbiAgICBbTlMuTUFUSE1MXToge1xuICAgICAgICBbJC5NSV06IHRydWUsXG4gICAgICAgIFskLk1PXTogdHJ1ZSxcbiAgICAgICAgWyQuTU5dOiB0cnVlLFxuICAgICAgICBbJC5NU106IHRydWUsXG4gICAgICAgIFskLk1URVhUXTogdHJ1ZSxcbiAgICAgICAgWyQuQU5OT1RBVElPTl9YTUxdOiB0cnVlXG4gICAgfSxcbiAgICBbTlMuU1ZHXToge1xuICAgICAgICBbJC5USVRMRV06IHRydWUsXG4gICAgICAgIFskLkZPUkVJR05fT0JKRUNUXTogdHJ1ZSxcbiAgICAgICAgWyQuREVTQ106IHRydWVcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBVTkRFRklORURfQ09ERV9QT0lOVFMgPSBbXG4gICAgMHhmZmZlLFxuICAgIDB4ZmZmZixcbiAgICAweDFmZmZlLFxuICAgIDB4MWZmZmYsXG4gICAgMHgyZmZmZSxcbiAgICAweDJmZmZmLFxuICAgIDB4M2ZmZmUsXG4gICAgMHgzZmZmZixcbiAgICAweDRmZmZlLFxuICAgIDB4NGZmZmYsXG4gICAgMHg1ZmZmZSxcbiAgICAweDVmZmZmLFxuICAgIDB4NmZmZmUsXG4gICAgMHg2ZmZmZixcbiAgICAweDdmZmZlLFxuICAgIDB4N2ZmZmYsXG4gICAgMHg4ZmZmZSxcbiAgICAweDhmZmZmLFxuICAgIDB4OWZmZmUsXG4gICAgMHg5ZmZmZixcbiAgICAweGFmZmZlLFxuICAgIDB4YWZmZmYsXG4gICAgMHhiZmZmZSxcbiAgICAweGJmZmZmLFxuICAgIDB4Y2ZmZmUsXG4gICAgMHhjZmZmZixcbiAgICAweGRmZmZlLFxuICAgIDB4ZGZmZmYsXG4gICAgMHhlZmZmZSxcbiAgICAweGVmZmZmLFxuICAgIDB4ZmZmZmUsXG4gICAgMHhmZmZmZixcbiAgICAweDEwZmZmZSxcbiAgICAweDEwZmZmZlxuXTtcblxuZXhwb3J0cy5SRVBMQUNFTUVOVF9DSEFSQUNURVIgPSAnXFx1RkZGRCc7XG5cbmV4cG9ydHMuQ09ERV9QT0lOVFMgPSB7XG4gICAgRU9GOiAtMSxcbiAgICBOVUxMOiAweDAwLFxuICAgIFRBQlVMQVRJT046IDB4MDksXG4gICAgQ0FSUklBR0VfUkVUVVJOOiAweDBkLFxuICAgIExJTkVfRkVFRDogMHgwYSxcbiAgICBGT1JNX0ZFRUQ6IDB4MGMsXG4gICAgU1BBQ0U6IDB4MjAsXG4gICAgRVhDTEFNQVRJT05fTUFSSzogMHgyMSxcbiAgICBRVU9UQVRJT05fTUFSSzogMHgyMixcbiAgICBOVU1CRVJfU0lHTjogMHgyMyxcbiAgICBBTVBFUlNBTkQ6IDB4MjYsXG4gICAgQVBPU1RST1BIRTogMHgyNyxcbiAgICBIWVBIRU5fTUlOVVM6IDB4MmQsXG4gICAgU09MSURVUzogMHgyZixcbiAgICBESUdJVF8wOiAweDMwLFxuICAgIERJR0lUXzk6IDB4MzksXG4gICAgU0VNSUNPTE9OOiAweDNiLFxuICAgIExFU1NfVEhBTl9TSUdOOiAweDNjLFxuICAgIEVRVUFMU19TSUdOOiAweDNkLFxuICAgIEdSRUFURVJfVEhBTl9TSUdOOiAweDNlLFxuICAgIFFVRVNUSU9OX01BUks6IDB4M2YsXG4gICAgTEFUSU5fQ0FQSVRBTF9BOiAweDQxLFxuICAgIExBVElOX0NBUElUQUxfRjogMHg0NixcbiAgICBMQVRJTl9DQVBJVEFMX1g6IDB4NTgsXG4gICAgTEFUSU5fQ0FQSVRBTF9aOiAweDVhLFxuICAgIFJJR0hUX1NRVUFSRV9CUkFDS0VUOiAweDVkLFxuICAgIEdSQVZFX0FDQ0VOVDogMHg2MCxcbiAgICBMQVRJTl9TTUFMTF9BOiAweDYxLFxuICAgIExBVElOX1NNQUxMX0Y6IDB4NjYsXG4gICAgTEFUSU5fU01BTExfWDogMHg3OCxcbiAgICBMQVRJTl9TTUFMTF9aOiAweDdhLFxuICAgIFJFUExBQ0VNRU5UX0NIQVJBQ1RFUjogMHhmZmZkXG59O1xuXG5leHBvcnRzLkNPREVfUE9JTlRfU0VRVUVOQ0VTID0ge1xuICAgIERBU0hfREFTSF9TVFJJTkc6IFsweDJkLCAweDJkXSwgLy8tLVxuICAgIERPQ1RZUEVfU1RSSU5HOiBbMHg0NCwgMHg0ZiwgMHg0MywgMHg1NCwgMHg1OSwgMHg1MCwgMHg0NV0sIC8vRE9DVFlQRVxuICAgIENEQVRBX1NUQVJUX1NUUklORzogWzB4NWIsIDB4NDMsIDB4NDQsIDB4NDEsIDB4NTQsIDB4NDEsIDB4NWJdLCAvL1tDREFUQVtcbiAgICBTQ1JJUFRfU1RSSU5HOiBbMHg3MywgMHg2MywgMHg3MiwgMHg2OSwgMHg3MCwgMHg3NF0sIC8vc2NyaXB0XG4gICAgUFVCTElDX1NUUklORzogWzB4NTAsIDB4NTUsIDB4NDIsIDB4NGMsIDB4NDksIDB4NDNdLCAvL1BVQkxJQ1xuICAgIFNZU1RFTV9TVFJJTkc6IFsweDUzLCAweDU5LCAweDUzLCAweDU0LCAweDQ1LCAweDRkXSAvL1NZU1RFTVxufTtcblxuLy9TdXJyb2dhdGVzXG5leHBvcnRzLmlzU3Vycm9nYXRlID0gZnVuY3Rpb24oY3ApIHtcbiAgICByZXR1cm4gY3AgPj0gMHhkODAwICYmIGNwIDw9IDB4ZGZmZjtcbn07XG5cbmV4cG9ydHMuaXNTdXJyb2dhdGVQYWlyID0gZnVuY3Rpb24oY3ApIHtcbiAgICByZXR1cm4gY3AgPj0gMHhkYzAwICYmIGNwIDw9IDB4ZGZmZjtcbn07XG5cbmV4cG9ydHMuZ2V0U3Vycm9nYXRlUGFpckNvZGVQb2ludCA9IGZ1bmN0aW9uKGNwMSwgY3AyKSB7XG4gICAgcmV0dXJuIChjcDEgLSAweGQ4MDApICogMHg0MDAgKyAweDI0MDAgKyBjcDI7XG59O1xuXG4vL05PVEU6IGV4Y2x1ZGluZyBOVUxMIGFuZCBBU0NJSSB3aGl0ZXNwYWNlXG5leHBvcnRzLmlzQ29udHJvbENvZGVQb2ludCA9IGZ1bmN0aW9uKGNwKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgKGNwICE9PSAweDIwICYmIGNwICE9PSAweDBhICYmIGNwICE9PSAweDBkICYmIGNwICE9PSAweDA5ICYmIGNwICE9PSAweDBjICYmIGNwID49IDB4MDEgJiYgY3AgPD0gMHgxZikgfHxcbiAgICAgICAgKGNwID49IDB4N2YgJiYgY3AgPD0gMHg5ZilcbiAgICApO1xufTtcblxuZXhwb3J0cy5pc1VuZGVmaW5lZENvZGVQb2ludCA9IGZ1bmN0aW9uKGNwKSB7XG4gICAgcmV0dXJuIChjcCA+PSAweGZkZDAgJiYgY3AgPD0gMHhmZGVmKSB8fCBVTkRFRklORURfQ09ERV9QT0lOVFMuaW5kZXhPZihjcCkgPiAtMTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IE1peGluID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMvbWl4aW4nKTtcblxuY2xhc3MgRXJyb3JSZXBvcnRpbmdNaXhpbkJhc2UgZXh0ZW5kcyBNaXhpbiB7XG4gICAgY29uc3RydWN0b3IoaG9zdCwgb3B0cykge1xuICAgICAgICBzdXBlcihob3N0KTtcblxuICAgICAgICB0aGlzLnBvc1RyYWNrZXIgPSBudWxsO1xuICAgICAgICB0aGlzLm9uUGFyc2VFcnJvciA9IG9wdHMub25QYXJzZUVycm9yO1xuICAgIH1cblxuICAgIF9zZXRFcnJvckxvY2F0aW9uKGVycikge1xuICAgICAgICBlcnIuc3RhcnRMaW5lID0gZXJyLmVuZExpbmUgPSB0aGlzLnBvc1RyYWNrZXIubGluZTtcbiAgICAgICAgZXJyLnN0YXJ0Q29sID0gZXJyLmVuZENvbCA9IHRoaXMucG9zVHJhY2tlci5jb2w7XG4gICAgICAgIGVyci5zdGFydE9mZnNldCA9IGVyci5lbmRPZmZzZXQgPSB0aGlzLnBvc1RyYWNrZXIub2Zmc2V0O1xuICAgIH1cblxuICAgIF9yZXBvcnRFcnJvcihjb2RlKSB7XG4gICAgICAgIGNvbnN0IGVyciA9IHtcbiAgICAgICAgICAgIGNvZGU6IGNvZGUsXG4gICAgICAgICAgICBzdGFydExpbmU6IC0xLFxuICAgICAgICAgICAgc3RhcnRDb2w6IC0xLFxuICAgICAgICAgICAgc3RhcnRPZmZzZXQ6IC0xLFxuICAgICAgICAgICAgZW5kTGluZTogLTEsXG4gICAgICAgICAgICBlbmRDb2w6IC0xLFxuICAgICAgICAgICAgZW5kT2Zmc2V0OiAtMVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX3NldEVycm9yTG9jYXRpb24oZXJyKTtcbiAgICAgICAgdGhpcy5vblBhcnNlRXJyb3IoZXJyKTtcbiAgICB9XG5cbiAgICBfZ2V0T3ZlcnJpZGRlbk1ldGhvZHMobXhuKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBfZXJyKGNvZGUpIHtcbiAgICAgICAgICAgICAgICBteG4uX3JlcG9ydEVycm9yKGNvZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFcnJvclJlcG9ydGluZ01peGluQmFzZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgRXJyb3JSZXBvcnRpbmdNaXhpbkJhc2UgPSByZXF1aXJlKCcuL21peGluLWJhc2UnKTtcbmNvbnN0IEVycm9yUmVwb3J0aW5nVG9rZW5pemVyTWl4aW4gPSByZXF1aXJlKCcuL3Rva2VuaXplci1taXhpbicpO1xuY29uc3QgTG9jYXRpb25JbmZvVG9rZW5pemVyTWl4aW4gPSByZXF1aXJlKCcuLi9sb2NhdGlvbi1pbmZvL3Rva2VuaXplci1taXhpbicpO1xuY29uc3QgTWl4aW4gPSByZXF1aXJlKCcuLi8uLi91dGlscy9taXhpbicpO1xuXG5jbGFzcyBFcnJvclJlcG9ydGluZ1BhcnNlck1peGluIGV4dGVuZHMgRXJyb3JSZXBvcnRpbmdNaXhpbkJhc2Uge1xuICAgIGNvbnN0cnVjdG9yKHBhcnNlciwgb3B0cykge1xuICAgICAgICBzdXBlcihwYXJzZXIsIG9wdHMpO1xuXG4gICAgICAgIHRoaXMub3B0cyA9IG9wdHM7XG4gICAgICAgIHRoaXMuY3RMb2MgPSBudWxsO1xuICAgICAgICB0aGlzLmxvY0JlZm9yZVRva2VuID0gZmFsc2U7XG4gICAgfVxuXG4gICAgX3NldEVycm9yTG9jYXRpb24oZXJyKSB7XG4gICAgICAgIGlmICh0aGlzLmN0TG9jKSB7XG4gICAgICAgICAgICBlcnIuc3RhcnRMaW5lID0gdGhpcy5jdExvYy5zdGFydExpbmU7XG4gICAgICAgICAgICBlcnIuc3RhcnRDb2wgPSB0aGlzLmN0TG9jLnN0YXJ0Q29sO1xuICAgICAgICAgICAgZXJyLnN0YXJ0T2Zmc2V0ID0gdGhpcy5jdExvYy5zdGFydE9mZnNldDtcblxuICAgICAgICAgICAgZXJyLmVuZExpbmUgPSB0aGlzLmxvY0JlZm9yZVRva2VuID8gdGhpcy5jdExvYy5zdGFydExpbmUgOiB0aGlzLmN0TG9jLmVuZExpbmU7XG4gICAgICAgICAgICBlcnIuZW5kQ29sID0gdGhpcy5sb2NCZWZvcmVUb2tlbiA/IHRoaXMuY3RMb2Muc3RhcnRDb2wgOiB0aGlzLmN0TG9jLmVuZENvbDtcbiAgICAgICAgICAgIGVyci5lbmRPZmZzZXQgPSB0aGlzLmxvY0JlZm9yZVRva2VuID8gdGhpcy5jdExvYy5zdGFydE9mZnNldCA6IHRoaXMuY3RMb2MuZW5kT2Zmc2V0O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgX2dldE92ZXJyaWRkZW5NZXRob2RzKG14biwgb3JpZykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgX2Jvb3RzdHJhcChkb2N1bWVudCwgZnJhZ21lbnRDb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgb3JpZy5fYm9vdHN0cmFwLmNhbGwodGhpcywgZG9jdW1lbnQsIGZyYWdtZW50Q29udGV4dCk7XG5cbiAgICAgICAgICAgICAgICBNaXhpbi5pbnN0YWxsKHRoaXMudG9rZW5pemVyLCBFcnJvclJlcG9ydGluZ1Rva2VuaXplck1peGluLCBteG4ub3B0cyk7XG4gICAgICAgICAgICAgICAgTWl4aW4uaW5zdGFsbCh0aGlzLnRva2VuaXplciwgTG9jYXRpb25JbmZvVG9rZW5pemVyTWl4aW4pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX3Byb2Nlc3NJbnB1dFRva2VuKHRva2VuKSB7XG4gICAgICAgICAgICAgICAgbXhuLmN0TG9jID0gdG9rZW4ubG9jYXRpb247XG5cbiAgICAgICAgICAgICAgICBvcmlnLl9wcm9jZXNzSW5wdXRUb2tlbi5jYWxsKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIF9lcnIoY29kZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIG14bi5sb2NCZWZvcmVUb2tlbiA9IG9wdGlvbnMgJiYgb3B0aW9ucy5iZWZvcmVUb2tlbjtcbiAgICAgICAgICAgICAgICBteG4uX3JlcG9ydEVycm9yKGNvZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFcnJvclJlcG9ydGluZ1BhcnNlck1peGluO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBFcnJvclJlcG9ydGluZ01peGluQmFzZSA9IHJlcXVpcmUoJy4vbWl4aW4tYmFzZScpO1xuY29uc3QgUG9zaXRpb25UcmFja2luZ1ByZXByb2Nlc3Nvck1peGluID0gcmVxdWlyZSgnLi4vcG9zaXRpb24tdHJhY2tpbmcvcHJlcHJvY2Vzc29yLW1peGluJyk7XG5jb25zdCBNaXhpbiA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzL21peGluJyk7XG5cbmNsYXNzIEVycm9yUmVwb3J0aW5nUHJlcHJvY2Vzc29yTWl4aW4gZXh0ZW5kcyBFcnJvclJlcG9ydGluZ01peGluQmFzZSB7XG4gICAgY29uc3RydWN0b3IocHJlcHJvY2Vzc29yLCBvcHRzKSB7XG4gICAgICAgIHN1cGVyKHByZXByb2Nlc3Nvciwgb3B0cyk7XG5cbiAgICAgICAgdGhpcy5wb3NUcmFja2VyID0gTWl4aW4uaW5zdGFsbChwcmVwcm9jZXNzb3IsIFBvc2l0aW9uVHJhY2tpbmdQcmVwcm9jZXNzb3JNaXhpbik7XG4gICAgICAgIHRoaXMubGFzdEVyck9mZnNldCA9IC0xO1xuICAgIH1cblxuICAgIF9yZXBvcnRFcnJvcihjb2RlKSB7XG4gICAgICAgIC8vTk9URTogYXZvaWQgcmVwb3J0aW5nIGVycm9yIHR3aWNlIG9uIGFkdmFuY2UvcmV0cmVhdFxuICAgICAgICBpZiAodGhpcy5sYXN0RXJyT2Zmc2V0ICE9PSB0aGlzLnBvc1RyYWNrZXIub2Zmc2V0KSB7XG4gICAgICAgICAgICB0aGlzLmxhc3RFcnJPZmZzZXQgPSB0aGlzLnBvc1RyYWNrZXIub2Zmc2V0O1xuICAgICAgICAgICAgc3VwZXIuX3JlcG9ydEVycm9yKGNvZGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVycm9yUmVwb3J0aW5nUHJlcHJvY2Vzc29yTWl4aW47XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IEVycm9yUmVwb3J0aW5nTWl4aW5CYXNlID0gcmVxdWlyZSgnLi9taXhpbi1iYXNlJyk7XG5jb25zdCBFcnJvclJlcG9ydGluZ1ByZXByb2Nlc3Nvck1peGluID0gcmVxdWlyZSgnLi9wcmVwcm9jZXNzb3ItbWl4aW4nKTtcbmNvbnN0IE1peGluID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMvbWl4aW4nKTtcblxuY2xhc3MgRXJyb3JSZXBvcnRpbmdUb2tlbml6ZXJNaXhpbiBleHRlbmRzIEVycm9yUmVwb3J0aW5nTWl4aW5CYXNlIHtcbiAgICBjb25zdHJ1Y3Rvcih0b2tlbml6ZXIsIG9wdHMpIHtcbiAgICAgICAgc3VwZXIodG9rZW5pemVyLCBvcHRzKTtcblxuICAgICAgICBjb25zdCBwcmVwcm9jZXNzb3JNaXhpbiA9IE1peGluLmluc3RhbGwodG9rZW5pemVyLnByZXByb2Nlc3NvciwgRXJyb3JSZXBvcnRpbmdQcmVwcm9jZXNzb3JNaXhpbiwgb3B0cyk7XG5cbiAgICAgICAgdGhpcy5wb3NUcmFja2VyID0gcHJlcHJvY2Vzc29yTWl4aW4ucG9zVHJhY2tlcjtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRXJyb3JSZXBvcnRpbmdUb2tlbml6ZXJNaXhpbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgTWl4aW4gPSByZXF1aXJlKCcuLi8uLi91dGlscy9taXhpbicpO1xuXG5jbGFzcyBMb2NhdGlvbkluZm9PcGVuRWxlbWVudFN0YWNrTWl4aW4gZXh0ZW5kcyBNaXhpbiB7XG4gICAgY29uc3RydWN0b3Ioc3RhY2ssIG9wdHMpIHtcbiAgICAgICAgc3VwZXIoc3RhY2spO1xuXG4gICAgICAgIHRoaXMub25JdGVtUG9wID0gb3B0cy5vbkl0ZW1Qb3A7XG4gICAgfVxuXG4gICAgX2dldE92ZXJyaWRkZW5NZXRob2RzKG14biwgb3JpZykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcG9wKCkge1xuICAgICAgICAgICAgICAgIG14bi5vbkl0ZW1Qb3AodGhpcy5jdXJyZW50KTtcbiAgICAgICAgICAgICAgICBvcmlnLnBvcC5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcG9wQWxsVXBUb0h0bWxFbGVtZW50KCkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSB0aGlzLnN0YWNrVG9wOyBpID4gMDsgaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgIG14bi5vbkl0ZW1Qb3AodGhpcy5pdGVtc1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgb3JpZy5wb3BBbGxVcFRvSHRtbEVsZW1lbnQuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlbW92ZShlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgbXhuLm9uSXRlbVBvcCh0aGlzLmN1cnJlbnQpO1xuICAgICAgICAgICAgICAgIG9yaWcucmVtb3ZlLmNhbGwodGhpcywgZWxlbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2F0aW9uSW5mb09wZW5FbGVtZW50U3RhY2tNaXhpbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgTWl4aW4gPSByZXF1aXJlKCcuLi8uLi91dGlscy9taXhpbicpO1xuY29uc3QgVG9rZW5pemVyID0gcmVxdWlyZSgnLi4vLi4vdG9rZW5pemVyJyk7XG5jb25zdCBMb2NhdGlvbkluZm9Ub2tlbml6ZXJNaXhpbiA9IHJlcXVpcmUoJy4vdG9rZW5pemVyLW1peGluJyk7XG5jb25zdCBMb2NhdGlvbkluZm9PcGVuRWxlbWVudFN0YWNrTWl4aW4gPSByZXF1aXJlKCcuL29wZW4tZWxlbWVudC1zdGFjay1taXhpbicpO1xuY29uc3QgSFRNTCA9IHJlcXVpcmUoJy4uLy4uL2NvbW1vbi9odG1sJyk7XG5cbi8vQWxpYXNlc1xuY29uc3QgJCA9IEhUTUwuVEFHX05BTUVTO1xuXG5jbGFzcyBMb2NhdGlvbkluZm9QYXJzZXJNaXhpbiBleHRlbmRzIE1peGluIHtcbiAgICBjb25zdHJ1Y3RvcihwYXJzZXIpIHtcbiAgICAgICAgc3VwZXIocGFyc2VyKTtcblxuICAgICAgICB0aGlzLnBhcnNlciA9IHBhcnNlcjtcbiAgICAgICAgdGhpcy50cmVlQWRhcHRlciA9IHRoaXMucGFyc2VyLnRyZWVBZGFwdGVyO1xuICAgICAgICB0aGlzLnBvc1RyYWNrZXIgPSBudWxsO1xuICAgICAgICB0aGlzLmxhc3RTdGFydFRhZ1Rva2VuID0gbnVsbDtcbiAgICAgICAgdGhpcy5sYXN0Rm9zdGVyUGFyZW50aW5nTG9jYXRpb24gPSBudWxsO1xuICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbiA9IG51bGw7XG4gICAgfVxuXG4gICAgX3NldFN0YXJ0TG9jYXRpb24oZWxlbWVudCkge1xuICAgICAgICBsZXQgbG9jID0gbnVsbDtcblxuICAgICAgICBpZiAodGhpcy5sYXN0U3RhcnRUYWdUb2tlbikge1xuICAgICAgICAgICAgbG9jID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5sYXN0U3RhcnRUYWdUb2tlbi5sb2NhdGlvbik7XG4gICAgICAgICAgICBsb2Muc3RhcnRUYWcgPSB0aGlzLmxhc3RTdGFydFRhZ1Rva2VuLmxvY2F0aW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50cmVlQWRhcHRlci5zZXROb2RlU291cmNlQ29kZUxvY2F0aW9uKGVsZW1lbnQsIGxvYyk7XG4gICAgfVxuXG4gICAgX3NldEVuZExvY2F0aW9uKGVsZW1lbnQsIGNsb3NpbmdUb2tlbikge1xuICAgICAgICBjb25zdCBsb2MgPSB0aGlzLnRyZWVBZGFwdGVyLmdldE5vZGVTb3VyY2VDb2RlTG9jYXRpb24oZWxlbWVudCk7XG5cbiAgICAgICAgaWYgKGxvYykge1xuICAgICAgICAgICAgaWYgKGNsb3NpbmdUb2tlbi5sb2NhdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN0TG9jID0gY2xvc2luZ1Rva2VuLmxvY2F0aW9uO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRuID0gdGhpcy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKGVsZW1lbnQpO1xuXG4gICAgICAgICAgICAgICAgLy8gTk9URTogRm9yIGNhc2VzIGxpa2UgPHA+IDxwPiA8L3A+IC0gRmlyc3QgJ3AnIGNsb3NlcyB3aXRob3V0IGEgY2xvc2luZ1xuICAgICAgICAgICAgICAgIC8vIHRhZyBhbmQgZm9yIGNhc2VzIGxpa2UgPHRkPiA8cD4gPC90ZD4gLSAncCcgY2xvc2VzIHdpdGhvdXQgYSBjbG9zaW5nIHRhZy5cbiAgICAgICAgICAgICAgICBjb25zdCBpc0Nsb3NpbmdFbmRUYWcgPSBjbG9zaW5nVG9rZW4udHlwZSA9PT0gVG9rZW5pemVyLkVORF9UQUdfVE9LRU4gJiYgdG4gPT09IGNsb3NpbmdUb2tlbi50YWdOYW1lO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVuZExvYyA9IHt9O1xuICAgICAgICAgICAgICAgIGlmIChpc0Nsb3NpbmdFbmRUYWcpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5kTG9jLmVuZFRhZyA9IE9iamVjdC5hc3NpZ24oe30sIGN0TG9jKTtcbiAgICAgICAgICAgICAgICAgICAgZW5kTG9jLmVuZExpbmUgPSBjdExvYy5lbmRMaW5lO1xuICAgICAgICAgICAgICAgICAgICBlbmRMb2MuZW5kQ29sID0gY3RMb2MuZW5kQ29sO1xuICAgICAgICAgICAgICAgICAgICBlbmRMb2MuZW5kT2Zmc2V0ID0gY3RMb2MuZW5kT2Zmc2V0O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVuZExvYy5lbmRMaW5lID0gY3RMb2Muc3RhcnRMaW5lO1xuICAgICAgICAgICAgICAgICAgICBlbmRMb2MuZW5kQ29sID0gY3RMb2Muc3RhcnRDb2w7XG4gICAgICAgICAgICAgICAgICAgIGVuZExvYy5lbmRPZmZzZXQgPSBjdExvYy5zdGFydE9mZnNldDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLnRyZWVBZGFwdGVyLnVwZGF0ZU5vZGVTb3VyY2VDb2RlTG9jYXRpb24oZWxlbWVudCwgZW5kTG9jKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9nZXRPdmVycmlkZGVuTWV0aG9kcyhteG4sIG9yaWcpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIF9ib290c3RyYXAoZG9jdW1lbnQsIGZyYWdtZW50Q29udGV4dCkge1xuICAgICAgICAgICAgICAgIG9yaWcuX2Jvb3RzdHJhcC5jYWxsKHRoaXMsIGRvY3VtZW50LCBmcmFnbWVudENvbnRleHQpO1xuXG4gICAgICAgICAgICAgICAgbXhuLmxhc3RTdGFydFRhZ1Rva2VuID0gbnVsbDtcbiAgICAgICAgICAgICAgICBteG4ubGFzdEZvc3RlclBhcmVudGluZ0xvY2F0aW9uID0gbnVsbDtcbiAgICAgICAgICAgICAgICBteG4uY3VycmVudFRva2VuID0gbnVsbDtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHRva2VuaXplck1peGluID0gTWl4aW4uaW5zdGFsbCh0aGlzLnRva2VuaXplciwgTG9jYXRpb25JbmZvVG9rZW5pemVyTWl4aW4pO1xuXG4gICAgICAgICAgICAgICAgbXhuLnBvc1RyYWNrZXIgPSB0b2tlbml6ZXJNaXhpbi5wb3NUcmFja2VyO1xuXG4gICAgICAgICAgICAgICAgTWl4aW4uaW5zdGFsbCh0aGlzLm9wZW5FbGVtZW50cywgTG9jYXRpb25JbmZvT3BlbkVsZW1lbnRTdGFja01peGluLCB7XG4gICAgICAgICAgICAgICAgICAgIG9uSXRlbVBvcDogZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXhuLl9zZXRFbmRMb2NhdGlvbihlbGVtZW50LCBteG4uY3VycmVudFRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX3J1blBhcnNpbmdMb29wKHNjcmlwdEhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBvcmlnLl9ydW5QYXJzaW5nTG9vcC5jYWxsKHRoaXMsIHNjcmlwdEhhbmRsZXIpO1xuXG4gICAgICAgICAgICAgICAgLy8gTk9URTogZ2VuZXJhdGUgbG9jYXRpb24gaW5mbyBmb3IgZWxlbWVudHNcbiAgICAgICAgICAgICAgICAvLyB0aGF0IHJlbWFpbnMgb24gb3BlbiBlbGVtZW50IHN0YWNrXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMub3BlbkVsZW1lbnRzLnN0YWNrVG9wOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgICAgICAgICBteG4uX3NldEVuZExvY2F0aW9uKHRoaXMub3BlbkVsZW1lbnRzLml0ZW1zW2ldLCBteG4uY3VycmVudFRva2VuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvL1Rva2VuIHByb2Nlc3NpbmdcbiAgICAgICAgICAgIF9wcm9jZXNzVG9rZW5JbkZvcmVpZ25Db250ZW50KHRva2VuKSB7XG4gICAgICAgICAgICAgICAgbXhuLmN1cnJlbnRUb2tlbiA9IHRva2VuO1xuICAgICAgICAgICAgICAgIG9yaWcuX3Byb2Nlc3NUb2tlbkluRm9yZWlnbkNvbnRlbnQuY2FsbCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBfcHJvY2Vzc1Rva2VuKHRva2VuKSB7XG4gICAgICAgICAgICAgICAgbXhuLmN1cnJlbnRUb2tlbiA9IHRva2VuO1xuICAgICAgICAgICAgICAgIG9yaWcuX3Byb2Nlc3NUb2tlbi5jYWxsKHRoaXMsIHRva2VuKTtcblxuICAgICAgICAgICAgICAgIC8vTk9URTogPGJvZHk+IGFuZCA8aHRtbD4gYXJlIG5ldmVyIHBvcHBlZCBmcm9tIHRoZSBzdGFjaywgc28gd2UgbmVlZCB0byB1cGRhdGVkXG4gICAgICAgICAgICAgICAgLy90aGVpciBlbmQgbG9jYXRpb24gZXhwbGljaXRseS5cbiAgICAgICAgICAgICAgICBjb25zdCByZXF1aXJlRXhwbGljaXRVcGRhdGUgPVxuICAgICAgICAgICAgICAgICAgICB0b2tlbi50eXBlID09PSBUb2tlbml6ZXIuRU5EX1RBR19UT0tFTiAmJlxuICAgICAgICAgICAgICAgICAgICAodG9rZW4udGFnTmFtZSA9PT0gJC5IVE1MIHx8ICh0b2tlbi50YWdOYW1lID09PSAkLkJPRFkgJiYgdGhpcy5vcGVuRWxlbWVudHMuaGFzSW5TY29wZSgkLkJPRFkpKSk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVxdWlyZUV4cGxpY2l0VXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSB0aGlzLm9wZW5FbGVtZW50cy5zdGFja1RvcDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLm9wZW5FbGVtZW50cy5pdGVtc1tpXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZShlbGVtZW50KSA9PT0gdG9rZW4udGFnTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG14bi5fc2V0RW5kTG9jYXRpb24oZWxlbWVudCwgdG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy9Eb2N0eXBlXG4gICAgICAgICAgICBfc2V0RG9jdW1lbnRUeXBlKHRva2VuKSB7XG4gICAgICAgICAgICAgICAgb3JpZy5fc2V0RG9jdW1lbnRUeXBlLmNhbGwodGhpcywgdG9rZW4pO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZG9jdW1lbnRDaGlsZHJlbiA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0Q2hpbGROb2Rlcyh0aGlzLmRvY3VtZW50KTtcbiAgICAgICAgICAgICAgICBjb25zdCBjbkxlbmd0aCA9IGRvY3VtZW50Q2hpbGRyZW4ubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjbkxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBkb2N1bWVudENoaWxkcmVuW2ldO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyZWVBZGFwdGVyLmlzRG9jdW1lbnRUeXBlTm9kZShub2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5zZXROb2RlU291cmNlQ29kZUxvY2F0aW9uKG5vZGUsIHRva2VuLmxvY2F0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy9FbGVtZW50c1xuICAgICAgICAgICAgX2F0dGFjaEVsZW1lbnRUb1RyZWUoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIC8vTk9URTogX2F0dGFjaEVsZW1lbnRUb1RyZWUgaXMgY2FsbGVkIGZyb20gX2FwcGVuZEVsZW1lbnQsIF9pbnNlcnRFbGVtZW50IGFuZCBfaW5zZXJ0VGVtcGxhdGUgbWV0aG9kcy5cbiAgICAgICAgICAgICAgICAvL1NvIHdlIHdpbGwgdXNlIHRva2VuIGxvY2F0aW9uIHN0b3JlZCBpbiB0aGlzIG1ldGhvZHMgZm9yIHRoZSBlbGVtZW50LlxuICAgICAgICAgICAgICAgIG14bi5fc2V0U3RhcnRMb2NhdGlvbihlbGVtZW50KTtcbiAgICAgICAgICAgICAgICBteG4ubGFzdFN0YXJ0VGFnVG9rZW4gPSBudWxsO1xuICAgICAgICAgICAgICAgIG9yaWcuX2F0dGFjaEVsZW1lbnRUb1RyZWUuY2FsbCh0aGlzLCBlbGVtZW50KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIF9hcHBlbmRFbGVtZW50KHRva2VuLCBuYW1lc3BhY2VVUkkpIHtcbiAgICAgICAgICAgICAgICBteG4ubGFzdFN0YXJ0VGFnVG9rZW4gPSB0b2tlbjtcbiAgICAgICAgICAgICAgICBvcmlnLl9hcHBlbmRFbGVtZW50LmNhbGwodGhpcywgdG9rZW4sIG5hbWVzcGFjZVVSSSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBfaW5zZXJ0RWxlbWVudCh0b2tlbiwgbmFtZXNwYWNlVVJJKSB7XG4gICAgICAgICAgICAgICAgbXhuLmxhc3RTdGFydFRhZ1Rva2VuID0gdG9rZW47XG4gICAgICAgICAgICAgICAgb3JpZy5faW5zZXJ0RWxlbWVudC5jYWxsKHRoaXMsIHRva2VuLCBuYW1lc3BhY2VVUkkpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX2luc2VydFRlbXBsYXRlKHRva2VuKSB7XG4gICAgICAgICAgICAgICAgbXhuLmxhc3RTdGFydFRhZ1Rva2VuID0gdG9rZW47XG4gICAgICAgICAgICAgICAgb3JpZy5faW5zZXJ0VGVtcGxhdGUuY2FsbCh0aGlzLCB0b2tlbik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB0bXBsQ29udGVudCA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGVtcGxhdGVDb250ZW50KHRoaXMub3BlbkVsZW1lbnRzLmN1cnJlbnQpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5zZXROb2RlU291cmNlQ29kZUxvY2F0aW9uKHRtcGxDb250ZW50LCBudWxsKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIF9pbnNlcnRGYWtlUm9vdEVsZW1lbnQoKSB7XG4gICAgICAgICAgICAgICAgb3JpZy5faW5zZXJ0RmFrZVJvb3RFbGVtZW50LmNhbGwodGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5zZXROb2RlU291cmNlQ29kZUxvY2F0aW9uKHRoaXMub3BlbkVsZW1lbnRzLmN1cnJlbnQsIG51bGwpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy9Db21tZW50c1xuICAgICAgICAgICAgX2FwcGVuZENvbW1lbnROb2RlKHRva2VuLCBwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICBvcmlnLl9hcHBlbmRDb21tZW50Tm9kZS5jYWxsKHRoaXMsIHRva2VuLCBwYXJlbnQpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRyZW4gPSB0aGlzLnRyZWVBZGFwdGVyLmdldENoaWxkTm9kZXMocGFyZW50KTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb21tZW50Tm9kZSA9IGNoaWxkcmVuW2NoaWxkcmVuLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5zZXROb2RlU291cmNlQ29kZUxvY2F0aW9uKGNvbW1lbnROb2RlLCB0b2tlbi5sb2NhdGlvbik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvL1RleHRcbiAgICAgICAgICAgIF9maW5kRm9zdGVyUGFyZW50aW5nTG9jYXRpb24oKSB7XG4gICAgICAgICAgICAgICAgLy9OT1RFOiBzdG9yZSBsYXN0IGZvc3RlciBwYXJlbnRpbmcgbG9jYXRpb24sIHNvIHdlIHdpbGwgYmUgYWJsZSB0byBmaW5kIGluc2VydGVkIHRleHRcbiAgICAgICAgICAgICAgICAvL2luIGNhc2Ugb2YgZm9zdGVyIHBhcmVudGluZ1xuICAgICAgICAgICAgICAgIG14bi5sYXN0Rm9zdGVyUGFyZW50aW5nTG9jYXRpb24gPSBvcmlnLl9maW5kRm9zdGVyUGFyZW50aW5nTG9jYXRpb24uY2FsbCh0aGlzKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBteG4ubGFzdEZvc3RlclBhcmVudGluZ0xvY2F0aW9uO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX2luc2VydENoYXJhY3RlcnModG9rZW4pIHtcbiAgICAgICAgICAgICAgICBvcmlnLl9pbnNlcnRDaGFyYWN0ZXJzLmNhbGwodGhpcywgdG9rZW4pO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaGFzRm9zdGVyUGFyZW50ID0gdGhpcy5fc2hvdWxkRm9zdGVyUGFyZW50T25JbnNlcnRpb24oKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9XG4gICAgICAgICAgICAgICAgICAgIChoYXNGb3N0ZXJQYXJlbnQgJiYgbXhuLmxhc3RGb3N0ZXJQYXJlbnRpbmdMb2NhdGlvbi5wYXJlbnQpIHx8XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub3BlbkVsZW1lbnRzLmN1cnJlbnRUbXBsQ29udGVudCB8fFxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5FbGVtZW50cy5jdXJyZW50O1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2libGluZ3MgPSB0aGlzLnRyZWVBZGFwdGVyLmdldENoaWxkTm9kZXMocGFyZW50KTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHROb2RlSWR4ID1cbiAgICAgICAgICAgICAgICAgICAgaGFzRm9zdGVyUGFyZW50ICYmIG14bi5sYXN0Rm9zdGVyUGFyZW50aW5nTG9jYXRpb24uYmVmb3JlRWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgPyBzaWJsaW5ncy5pbmRleE9mKG14bi5sYXN0Rm9zdGVyUGFyZW50aW5nTG9jYXRpb24uYmVmb3JlRWxlbWVudCkgLSAxXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHNpYmxpbmdzLmxlbmd0aCAtIDE7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0Tm9kZSA9IHNpYmxpbmdzW3RleHROb2RlSWR4XTtcblxuICAgICAgICAgICAgICAgIC8vTk9URTogaWYgd2UgaGF2ZSBsb2NhdGlvbiBhc3NpZ25lZCBieSBhbm90aGVyIHRva2VuLCB0aGVuIGp1c3QgdXBkYXRlIGVuZCBwb3NpdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IHRuTG9jID0gdGhpcy50cmVlQWRhcHRlci5nZXROb2RlU291cmNlQ29kZUxvY2F0aW9uKHRleHROb2RlKTtcblxuICAgICAgICAgICAgICAgIGlmICh0bkxvYykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGVuZExpbmUsIGVuZENvbCwgZW5kT2Zmc2V0IH0gPSB0b2tlbi5sb2NhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci51cGRhdGVOb2RlU291cmNlQ29kZUxvY2F0aW9uKHRleHROb2RlLCB7IGVuZExpbmUsIGVuZENvbCwgZW5kT2Zmc2V0IH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuc2V0Tm9kZVNvdXJjZUNvZGVMb2NhdGlvbih0ZXh0Tm9kZSwgdG9rZW4ubG9jYXRpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYXRpb25JbmZvUGFyc2VyTWl4aW47XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IE1peGluID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMvbWl4aW4nKTtcbmNvbnN0IFRva2VuaXplciA9IHJlcXVpcmUoJy4uLy4uL3Rva2VuaXplcicpO1xuY29uc3QgUG9zaXRpb25UcmFja2luZ1ByZXByb2Nlc3Nvck1peGluID0gcmVxdWlyZSgnLi4vcG9zaXRpb24tdHJhY2tpbmcvcHJlcHJvY2Vzc29yLW1peGluJyk7XG5cbmNsYXNzIExvY2F0aW9uSW5mb1Rva2VuaXplck1peGluIGV4dGVuZHMgTWl4aW4ge1xuICAgIGNvbnN0cnVjdG9yKHRva2VuaXplcikge1xuICAgICAgICBzdXBlcih0b2tlbml6ZXIpO1xuXG4gICAgICAgIHRoaXMudG9rZW5pemVyID0gdG9rZW5pemVyO1xuICAgICAgICB0aGlzLnBvc1RyYWNrZXIgPSBNaXhpbi5pbnN0YWxsKHRva2VuaXplci5wcmVwcm9jZXNzb3IsIFBvc2l0aW9uVHJhY2tpbmdQcmVwcm9jZXNzb3JNaXhpbik7XG4gICAgICAgIHRoaXMuY3VycmVudEF0dHJMb2NhdGlvbiA9IG51bGw7XG4gICAgICAgIHRoaXMuY3RMb2MgPSBudWxsO1xuICAgIH1cblxuICAgIF9nZXRDdXJyZW50TG9jYXRpb24oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdGFydExpbmU6IHRoaXMucG9zVHJhY2tlci5saW5lLFxuICAgICAgICAgICAgc3RhcnRDb2w6IHRoaXMucG9zVHJhY2tlci5jb2wsXG4gICAgICAgICAgICBzdGFydE9mZnNldDogdGhpcy5wb3NUcmFja2VyLm9mZnNldCxcbiAgICAgICAgICAgIGVuZExpbmU6IC0xLFxuICAgICAgICAgICAgZW5kQ29sOiAtMSxcbiAgICAgICAgICAgIGVuZE9mZnNldDogLTFcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBfYXR0YWNoQ3VycmVudEF0dHJMb2NhdGlvbkluZm8oKSB7XG4gICAgICAgIHRoaXMuY3VycmVudEF0dHJMb2NhdGlvbi5lbmRMaW5lID0gdGhpcy5wb3NUcmFja2VyLmxpbmU7XG4gICAgICAgIHRoaXMuY3VycmVudEF0dHJMb2NhdGlvbi5lbmRDb2wgPSB0aGlzLnBvc1RyYWNrZXIuY29sO1xuICAgICAgICB0aGlzLmN1cnJlbnRBdHRyTG9jYXRpb24uZW5kT2Zmc2V0ID0gdGhpcy5wb3NUcmFja2VyLm9mZnNldDtcblxuICAgICAgICBjb25zdCBjdXJyZW50VG9rZW4gPSB0aGlzLnRva2VuaXplci5jdXJyZW50VG9rZW47XG4gICAgICAgIGNvbnN0IGN1cnJlbnRBdHRyID0gdGhpcy50b2tlbml6ZXIuY3VycmVudEF0dHI7XG5cbiAgICAgICAgaWYgKCFjdXJyZW50VG9rZW4ubG9jYXRpb24uYXR0cnMpIHtcbiAgICAgICAgICAgIGN1cnJlbnRUb2tlbi5sb2NhdGlvbi5hdHRycyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50VG9rZW4ubG9jYXRpb24uYXR0cnNbY3VycmVudEF0dHIubmFtZV0gPSB0aGlzLmN1cnJlbnRBdHRyTG9jYXRpb247XG4gICAgfVxuXG4gICAgX2dldE92ZXJyaWRkZW5NZXRob2RzKG14biwgb3JpZykge1xuICAgICAgICBjb25zdCBtZXRob2RzID0ge1xuICAgICAgICAgICAgX2NyZWF0ZVN0YXJ0VGFnVG9rZW4oKSB7XG4gICAgICAgICAgICAgICAgb3JpZy5fY3JlYXRlU3RhcnRUYWdUb2tlbi5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmxvY2F0aW9uID0gbXhuLmN0TG9jO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX2NyZWF0ZUVuZFRhZ1Rva2VuKCkge1xuICAgICAgICAgICAgICAgIG9yaWcuX2NyZWF0ZUVuZFRhZ1Rva2VuLmNhbGwodGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4ubG9jYXRpb24gPSBteG4uY3RMb2M7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBfY3JlYXRlQ29tbWVudFRva2VuKCkge1xuICAgICAgICAgICAgICAgIG9yaWcuX2NyZWF0ZUNvbW1lbnRUb2tlbi5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmxvY2F0aW9uID0gbXhuLmN0TG9jO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX2NyZWF0ZURvY3R5cGVUb2tlbihpbml0aWFsTmFtZSkge1xuICAgICAgICAgICAgICAgIG9yaWcuX2NyZWF0ZURvY3R5cGVUb2tlbi5jYWxsKHRoaXMsIGluaXRpYWxOYW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5sb2NhdGlvbiA9IG14bi5jdExvYztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIF9jcmVhdGVDaGFyYWN0ZXJUb2tlbih0eXBlLCBjaCkge1xuICAgICAgICAgICAgICAgIG9yaWcuX2NyZWF0ZUNoYXJhY3RlclRva2VuLmNhbGwodGhpcywgdHlwZSwgY2gpO1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudENoYXJhY3RlclRva2VuLmxvY2F0aW9uID0gbXhuLmN0TG9jO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX2NyZWF0ZUVPRlRva2VuKCkge1xuICAgICAgICAgICAgICAgIG9yaWcuX2NyZWF0ZUVPRlRva2VuLmNhbGwodGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4ubG9jYXRpb24gPSBteG4uX2dldEN1cnJlbnRMb2NhdGlvbigpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX2NyZWF0ZUF0dHIoYXR0ck5hbWVGaXJzdENoKSB7XG4gICAgICAgICAgICAgICAgb3JpZy5fY3JlYXRlQXR0ci5jYWxsKHRoaXMsIGF0dHJOYW1lRmlyc3RDaCk7XG4gICAgICAgICAgICAgICAgbXhuLmN1cnJlbnRBdHRyTG9jYXRpb24gPSBteG4uX2dldEN1cnJlbnRMb2NhdGlvbigpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX2xlYXZlQXR0ck5hbWUodG9TdGF0ZSkge1xuICAgICAgICAgICAgICAgIG9yaWcuX2xlYXZlQXR0ck5hbWUuY2FsbCh0aGlzLCB0b1N0YXRlKTtcbiAgICAgICAgICAgICAgICBteG4uX2F0dGFjaEN1cnJlbnRBdHRyTG9jYXRpb25JbmZvKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBfbGVhdmVBdHRyVmFsdWUodG9TdGF0ZSkge1xuICAgICAgICAgICAgICAgIG9yaWcuX2xlYXZlQXR0clZhbHVlLmNhbGwodGhpcywgdG9TdGF0ZSk7XG4gICAgICAgICAgICAgICAgbXhuLl9hdHRhY2hDdXJyZW50QXR0ckxvY2F0aW9uSW5mbygpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX2VtaXRDdXJyZW50VG9rZW4oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3RMb2MgPSB0aGlzLmN1cnJlbnRUb2tlbi5sb2NhdGlvbjtcblxuICAgICAgICAgICAgICAgIC8vTk9URTogaWYgd2UgaGF2ZSBwZW5kaW5nIGNoYXJhY3RlciB0b2tlbiBtYWtlIGl0J3MgZW5kIGxvY2F0aW9uIGVxdWFsIHRvIHRoZVxuICAgICAgICAgICAgICAgIC8vY3VycmVudCB0b2tlbidzIHN0YXJ0IGxvY2F0aW9uLlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbi5sb2NhdGlvbi5lbmRMaW5lID0gY3RMb2Muc3RhcnRMaW5lO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbi5sb2NhdGlvbi5lbmRDb2wgPSBjdExvYy5zdGFydENvbDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q2hhcmFjdGVyVG9rZW4ubG9jYXRpb24uZW5kT2Zmc2V0ID0gY3RMb2Muc3RhcnRPZmZzZXQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFRva2VuLnR5cGUgPT09IFRva2VuaXplci5FT0ZfVE9LRU4pIHtcbiAgICAgICAgICAgICAgICAgICAgY3RMb2MuZW5kTGluZSA9IGN0TG9jLnN0YXJ0TGluZTtcbiAgICAgICAgICAgICAgICAgICAgY3RMb2MuZW5kQ29sID0gY3RMb2Muc3RhcnRDb2w7XG4gICAgICAgICAgICAgICAgICAgIGN0TG9jLmVuZE9mZnNldCA9IGN0TG9jLnN0YXJ0T2Zmc2V0O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGN0TG9jLmVuZExpbmUgPSBteG4ucG9zVHJhY2tlci5saW5lO1xuICAgICAgICAgICAgICAgICAgICBjdExvYy5lbmRDb2wgPSBteG4ucG9zVHJhY2tlci5jb2wgKyAxO1xuICAgICAgICAgICAgICAgICAgICBjdExvYy5lbmRPZmZzZXQgPSBteG4ucG9zVHJhY2tlci5vZmZzZXQgKyAxO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG9yaWcuX2VtaXRDdXJyZW50VG9rZW4uY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIF9lbWl0Q3VycmVudENoYXJhY3RlclRva2VuKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN0TG9jID0gdGhpcy5jdXJyZW50Q2hhcmFjdGVyVG9rZW4gJiYgdGhpcy5jdXJyZW50Q2hhcmFjdGVyVG9rZW4ubG9jYXRpb247XG5cbiAgICAgICAgICAgICAgICAvL05PVEU6IGlmIHdlIGhhdmUgY2hhcmFjdGVyIHRva2VuIGFuZCBpdCdzIGxvY2F0aW9uIHdhc24ndCBzZXQgaW4gdGhlIF9lbWl0Q3VycmVudFRva2VuKCksXG4gICAgICAgICAgICAgICAgLy90aGVuIHNldCBpdCdzIGxvY2F0aW9uIGF0IHRoZSBjdXJyZW50IHByZXByb2Nlc3NvciBwb3NpdGlvbi5cbiAgICAgICAgICAgICAgICAvL1dlIGRvbid0IG5lZWQgdG8gaW5jcmVtZW50IHByZXByb2Nlc3NvciBwb3NpdGlvbiwgc2luY2UgY2hhcmFjdGVyIHRva2VuXG4gICAgICAgICAgICAgICAgLy9lbWlzc2lvbiBpcyBhbHdheXMgZm9yY2VkIGJ5IHRoZSBzdGFydCBvZiB0aGUgbmV4dCBjaGFyYWN0ZXIgdG9rZW4gaGVyZS5cbiAgICAgICAgICAgICAgICAvL1NvLCB3ZSBhbHJlYWR5IGhhdmUgYWR2YW5jZWQgcG9zaXRpb24uXG4gICAgICAgICAgICAgICAgaWYgKGN0TG9jICYmIGN0TG9jLmVuZE9mZnNldCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgY3RMb2MuZW5kTGluZSA9IG14bi5wb3NUcmFja2VyLmxpbmU7XG4gICAgICAgICAgICAgICAgICAgIGN0TG9jLmVuZENvbCA9IG14bi5wb3NUcmFja2VyLmNvbDtcbiAgICAgICAgICAgICAgICAgICAgY3RMb2MuZW5kT2Zmc2V0ID0gbXhuLnBvc1RyYWNrZXIub2Zmc2V0O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG9yaWcuX2VtaXRDdXJyZW50Q2hhcmFjdGVyVG9rZW4uY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvL05PVEU6IHBhdGNoIGluaXRpYWwgc3RhdGVzIGZvciBlYWNoIG1vZGUgdG8gb2J0YWluIHRva2VuIHN0YXJ0IHBvc2l0aW9uXG4gICAgICAgIE9iamVjdC5rZXlzKFRva2VuaXplci5NT0RFKS5mb3JFYWNoKG1vZGVOYW1lID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXRlID0gVG9rZW5pemVyLk1PREVbbW9kZU5hbWVdO1xuXG4gICAgICAgICAgICBtZXRob2RzW3N0YXRlXSA9IGZ1bmN0aW9uKGNwKSB7XG4gICAgICAgICAgICAgICAgbXhuLmN0TG9jID0gbXhuLl9nZXRDdXJyZW50TG9jYXRpb24oKTtcbiAgICAgICAgICAgICAgICBvcmlnW3N0YXRlXS5jYWxsKHRoaXMsIGNwKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBtZXRob2RzO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMb2NhdGlvbkluZm9Ub2tlbml6ZXJNaXhpbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgTWl4aW4gPSByZXF1aXJlKCcuLi8uLi91dGlscy9taXhpbicpO1xuXG5jbGFzcyBQb3NpdGlvblRyYWNraW5nUHJlcHJvY2Vzc29yTWl4aW4gZXh0ZW5kcyBNaXhpbiB7XG4gICAgY29uc3RydWN0b3IocHJlcHJvY2Vzc29yKSB7XG4gICAgICAgIHN1cGVyKHByZXByb2Nlc3Nvcik7XG5cbiAgICAgICAgdGhpcy5wcmVwcm9jZXNzb3IgPSBwcmVwcm9jZXNzb3I7XG4gICAgICAgIHRoaXMuaXNFb2wgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5saW5lU3RhcnRQb3MgPSAwO1xuICAgICAgICB0aGlzLmRyb3BwZWRCdWZmZXJTaXplID0gMDtcblxuICAgICAgICB0aGlzLm9mZnNldCA9IDA7XG4gICAgICAgIHRoaXMuY29sID0gMDtcbiAgICAgICAgdGhpcy5saW5lID0gMTtcbiAgICB9XG5cbiAgICBfZ2V0T3ZlcnJpZGRlbk1ldGhvZHMobXhuLCBvcmlnKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhZHZhbmNlKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBvcyA9IHRoaXMucG9zICsgMTtcbiAgICAgICAgICAgICAgICBjb25zdCBjaCA9IHRoaXMuaHRtbFtwb3NdO1xuXG4gICAgICAgICAgICAgICAgLy9OT1RFOiBMRiBzaG91bGQgYmUgaW4gdGhlIGxhc3QgY29sdW1uIG9mIHRoZSBsaW5lXG4gICAgICAgICAgICAgICAgaWYgKG14bi5pc0VvbCkge1xuICAgICAgICAgICAgICAgICAgICBteG4uaXNFb2wgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgbXhuLmxpbmUrKztcbiAgICAgICAgICAgICAgICAgICAgbXhuLmxpbmVTdGFydFBvcyA9IHBvcztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXG4nIHx8IChjaCA9PT0gJ1xccicgJiYgdGhpcy5odG1sW3BvcyArIDFdICE9PSAnXFxuJykpIHtcbiAgICAgICAgICAgICAgICAgICAgbXhuLmlzRW9sID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBteG4uY29sID0gcG9zIC0gbXhuLmxpbmVTdGFydFBvcyArIDE7XG4gICAgICAgICAgICAgICAgbXhuLm9mZnNldCA9IG14bi5kcm9wcGVkQnVmZmVyU2l6ZSArIHBvcztcblxuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnLmFkdmFuY2UuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJldHJlYXQoKSB7XG4gICAgICAgICAgICAgICAgb3JpZy5yZXRyZWF0LmNhbGwodGhpcyk7XG5cbiAgICAgICAgICAgICAgICBteG4uaXNFb2wgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBteG4uY29sID0gdGhpcy5wb3MgLSBteG4ubGluZVN0YXJ0UG9zICsgMTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGRyb3BQYXJzZWRDaHVuaygpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2UG9zID0gdGhpcy5wb3M7XG5cbiAgICAgICAgICAgICAgICBvcmlnLmRyb3BQYXJzZWRDaHVuay5jYWxsKHRoaXMpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgcmVkdWN0aW9uID0gcHJldlBvcyAtIHRoaXMucG9zO1xuXG4gICAgICAgICAgICAgICAgbXhuLmxpbmVTdGFydFBvcyAtPSByZWR1Y3Rpb247XG4gICAgICAgICAgICAgICAgbXhuLmRyb3BwZWRCdWZmZXJTaXplICs9IHJlZHVjdGlvbjtcbiAgICAgICAgICAgICAgICBteG4ub2Zmc2V0ID0gbXhuLmRyb3BwZWRCdWZmZXJTaXplICsgdGhpcy5wb3M7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvc2l0aW9uVHJhY2tpbmdQcmVwcm9jZXNzb3JNaXhpbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgUGFyc2VyID0gcmVxdWlyZSgnLi9wYXJzZXInKTtcbmNvbnN0IFNlcmlhbGl6ZXIgPSByZXF1aXJlKCcuL3NlcmlhbGl6ZXInKTtcblxuLy8gU2hvcnRoYW5kc1xuZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uIHBhcnNlKGh0bWwsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBwYXJzZXIgPSBuZXcgUGFyc2VyKG9wdGlvbnMpO1xuXG4gICAgcmV0dXJuIHBhcnNlci5wYXJzZShodG1sKTtcbn07XG5cbmV4cG9ydHMucGFyc2VGcmFnbWVudCA9IGZ1bmN0aW9uIHBhcnNlRnJhZ21lbnQoZnJhZ21lbnRDb250ZXh0LCBodG1sLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBmcmFnbWVudENvbnRleHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIG9wdGlvbnMgPSBodG1sO1xuICAgICAgICBodG1sID0gZnJhZ21lbnRDb250ZXh0O1xuICAgICAgICBmcmFnbWVudENvbnRleHQgPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcnNlciA9IG5ldyBQYXJzZXIob3B0aW9ucyk7XG5cbiAgICByZXR1cm4gcGFyc2VyLnBhcnNlRnJhZ21lbnQoaHRtbCwgZnJhZ21lbnRDb250ZXh0KTtcbn07XG5cbmV4cG9ydHMuc2VyaWFsaXplID0gZnVuY3Rpb24obm9kZSwgb3B0aW9ucykge1xuICAgIGNvbnN0IHNlcmlhbGl6ZXIgPSBuZXcgU2VyaWFsaXplcihub2RlLCBvcHRpb25zKTtcblxuICAgIHJldHVybiBzZXJpYWxpemVyLnNlcmlhbGl6ZSgpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy9Db25zdFxuY29uc3QgTk9BSF9BUktfQ0FQQUNJVFkgPSAzO1xuXG4vL0xpc3Qgb2YgZm9ybWF0dGluZyBlbGVtZW50c1xuY2xhc3MgRm9ybWF0dGluZ0VsZW1lbnRMaXN0IHtcbiAgICBjb25zdHJ1Y3Rvcih0cmVlQWRhcHRlcikge1xuICAgICAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuZW50cmllcyA9IFtdO1xuICAgICAgICB0aGlzLnRyZWVBZGFwdGVyID0gdHJlZUFkYXB0ZXI7XG4gICAgICAgIHRoaXMuYm9va21hcmsgPSBudWxsO1xuICAgIH1cblxuICAgIC8vTm9haCBBcmsncyBjb25kaXRpb25cbiAgICAvL09QVElNSVpBVElPTjogYXQgZmlyc3Qgd2UgdHJ5IHRvIGZpbmQgcG9zc2libGUgY2FuZGlkYXRlcyBmb3IgZXhjbHVzaW9uIHVzaW5nXG4gICAgLy9saWdodHdlaWdodCBoZXVyaXN0aWNzIHdpdGhvdXQgdGhvcm91Z2ggYXR0cmlidXRlcyBjaGVjay5cbiAgICBfZ2V0Tm9haEFya0NvbmRpdGlvbkNhbmRpZGF0ZXMobmV3RWxlbWVudCkge1xuICAgICAgICBjb25zdCBjYW5kaWRhdGVzID0gW107XG5cbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID49IE5PQUhfQVJLX0NBUEFDSVRZKSB7XG4gICAgICAgICAgICBjb25zdCBuZUF0dHJzTGVuZ3RoID0gdGhpcy50cmVlQWRhcHRlci5nZXRBdHRyTGlzdChuZXdFbGVtZW50KS5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCBuZVRhZ05hbWUgPSB0aGlzLnRyZWVBZGFwdGVyLmdldFRhZ05hbWUobmV3RWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBuZU5hbWVzcGFjZVVSSSA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKG5ld0VsZW1lbnQpO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5lbnRyaWVzW2ldO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5LnR5cGUgPT09IEZvcm1hdHRpbmdFbGVtZW50TGlzdC5NQVJLRVJfRU5UUlkpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IGVudHJ5LmVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbWVudEF0dHJzID0gdGhpcy50cmVlQWRhcHRlci5nZXRBdHRyTGlzdChlbGVtZW50KTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2FuZGlkYXRlID1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKGVsZW1lbnQpID09PSBuZVRhZ05hbWUgJiZcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkoZWxlbWVudCkgPT09IG5lTmFtZXNwYWNlVVJJICYmXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRBdHRycy5sZW5ndGggPT09IG5lQXR0cnNMZW5ndGg7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNDYW5kaWRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlcy5wdXNoKHsgaWR4OiBpLCBhdHRyczogZWxlbWVudEF0dHJzIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjYW5kaWRhdGVzLmxlbmd0aCA8IE5PQUhfQVJLX0NBUEFDSVRZID8gW10gOiBjYW5kaWRhdGVzO1xuICAgIH1cblxuICAgIF9lbnN1cmVOb2FoQXJrQ29uZGl0aW9uKG5ld0VsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlcyA9IHRoaXMuX2dldE5vYWhBcmtDb25kaXRpb25DYW5kaWRhdGVzKG5ld0VsZW1lbnQpO1xuICAgICAgICBsZXQgY0xlbmd0aCA9IGNhbmRpZGF0ZXMubGVuZ3RoO1xuXG4gICAgICAgIGlmIChjTGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBuZUF0dHJzID0gdGhpcy50cmVlQWRhcHRlci5nZXRBdHRyTGlzdChuZXdFbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IG5lQXR0cnNMZW5ndGggPSBuZUF0dHJzLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IG5lQXR0cnNNYXAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgICAgICAgICAvL05PVEU6IGJ1aWxkIGF0dHJzIG1hcCBmb3IgdGhlIG5ldyBlbGVtZW50IHNvIHdlIGNhbiBwZXJmb3JtIGZhc3QgbG9va3Vwc1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuZUF0dHJzTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZUF0dHIgPSBuZUF0dHJzW2ldO1xuXG4gICAgICAgICAgICAgICAgbmVBdHRyc01hcFtuZUF0dHIubmFtZV0gPSBuZUF0dHIudmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbmVBdHRyc0xlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBjTGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY0F0dHIgPSBjYW5kaWRhdGVzW2pdLmF0dHJzW2ldO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChuZUF0dHJzTWFwW2NBdHRyLm5hbWVdICE9PSBjQXR0ci52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlcy5zcGxpY2UoaiwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjTGVuZ3RoLS07XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlcy5sZW5ndGggPCBOT0FIX0FSS19DQVBBQ0lUWSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL05PVEU6IHJlbW92ZSBib3R0b21tb3N0IGNhbmRpZGF0ZXMgdW50aWwgTm9haCdzIEFyayBjb25kaXRpb24gd2lsbCBub3QgYmUgbWV0XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY0xlbmd0aCAtIDE7IGkgPj0gTk9BSF9BUktfQ0FQQUNJVFkgLSAxOyBpLS0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVudHJpZXMuc3BsaWNlKGNhbmRpZGF0ZXNbaV0uaWR4LCAxKTtcbiAgICAgICAgICAgICAgICB0aGlzLmxlbmd0aC0tO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9NdXRhdGlvbnNcbiAgICBpbnNlcnRNYXJrZXIoKSB7XG4gICAgICAgIHRoaXMuZW50cmllcy5wdXNoKHsgdHlwZTogRm9ybWF0dGluZ0VsZW1lbnRMaXN0Lk1BUktFUl9FTlRSWSB9KTtcbiAgICAgICAgdGhpcy5sZW5ndGgrKztcbiAgICB9XG5cbiAgICBwdXNoRWxlbWVudChlbGVtZW50LCB0b2tlbikge1xuICAgICAgICB0aGlzLl9lbnN1cmVOb2FoQXJrQ29uZGl0aW9uKGVsZW1lbnQpO1xuXG4gICAgICAgIHRoaXMuZW50cmllcy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGU6IEZvcm1hdHRpbmdFbGVtZW50TGlzdC5FTEVNRU5UX0VOVFJZLFxuICAgICAgICAgICAgZWxlbWVudDogZWxlbWVudCxcbiAgICAgICAgICAgIHRva2VuOiB0b2tlblxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmxlbmd0aCsrO1xuICAgIH1cblxuICAgIGluc2VydEVsZW1lbnRBZnRlckJvb2ttYXJrKGVsZW1lbnQsIHRva2VuKSB7XG4gICAgICAgIGxldCBib29rbWFya0lkeCA9IHRoaXMubGVuZ3RoIC0gMTtcblxuICAgICAgICBmb3IgKDsgYm9va21hcmtJZHggPj0gMDsgYm9va21hcmtJZHgtLSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZW50cmllc1tib29rbWFya0lkeF0gPT09IHRoaXMuYm9va21hcmspIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW50cmllcy5zcGxpY2UoYm9va21hcmtJZHggKyAxLCAwLCB7XG4gICAgICAgICAgICB0eXBlOiBGb3JtYXR0aW5nRWxlbWVudExpc3QuRUxFTUVOVF9FTlRSWSxcbiAgICAgICAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXG4gICAgICAgICAgICB0b2tlbjogdG9rZW5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5sZW5ndGgrKztcbiAgICB9XG5cbiAgICByZW1vdmVFbnRyeShlbnRyeSkge1xuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZW50cmllc1tpXSA9PT0gZW50cnkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVudHJpZXMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgIHRoaXMubGVuZ3RoLS07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjbGVhclRvTGFzdE1hcmtlcigpIHtcbiAgICAgICAgd2hpbGUgKHRoaXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBlbnRyeSA9IHRoaXMuZW50cmllcy5wb3AoKTtcblxuICAgICAgICAgICAgdGhpcy5sZW5ndGgtLTtcblxuICAgICAgICAgICAgaWYgKGVudHJ5LnR5cGUgPT09IEZvcm1hdHRpbmdFbGVtZW50TGlzdC5NQVJLRVJfRU5UUlkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vU2VhcmNoXG4gICAgZ2V0RWxlbWVudEVudHJ5SW5TY29wZVdpdGhUYWdOYW1lKHRhZ05hbWUpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5lbnRyaWVzW2ldO1xuXG4gICAgICAgICAgICBpZiAoZW50cnkudHlwZSA9PT0gRm9ybWF0dGluZ0VsZW1lbnRMaXN0Lk1BUktFUl9FTlRSWSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKGVudHJ5LmVsZW1lbnQpID09PSB0YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudHJ5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgZ2V0RWxlbWVudEVudHJ5KGVsZW1lbnQpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5lbnRyaWVzW2ldO1xuXG4gICAgICAgICAgICBpZiAoZW50cnkudHlwZSA9PT0gRm9ybWF0dGluZ0VsZW1lbnRMaXN0LkVMRU1FTlRfRU5UUlkgJiYgZW50cnkuZWxlbWVudCA9PT0gZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlbnRyeTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuLy9FbnRyeSB0eXBlc1xuRm9ybWF0dGluZ0VsZW1lbnRMaXN0Lk1BUktFUl9FTlRSWSA9ICdNQVJLRVJfRU5UUlknO1xuRm9ybWF0dGluZ0VsZW1lbnRMaXN0LkVMRU1FTlRfRU5UUlkgPSAnRUxFTUVOVF9FTlRSWSc7XG5cbm1vZHVsZS5leHBvcnRzID0gRm9ybWF0dGluZ0VsZW1lbnRMaXN0O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBUb2tlbml6ZXIgPSByZXF1aXJlKCcuLi90b2tlbml6ZXInKTtcbmNvbnN0IE9wZW5FbGVtZW50U3RhY2sgPSByZXF1aXJlKCcuL29wZW4tZWxlbWVudC1zdGFjaycpO1xuY29uc3QgRm9ybWF0dGluZ0VsZW1lbnRMaXN0ID0gcmVxdWlyZSgnLi9mb3JtYXR0aW5nLWVsZW1lbnQtbGlzdCcpO1xuY29uc3QgTG9jYXRpb25JbmZvUGFyc2VyTWl4aW4gPSByZXF1aXJlKCcuLi9leHRlbnNpb25zL2xvY2F0aW9uLWluZm8vcGFyc2VyLW1peGluJyk7XG5jb25zdCBFcnJvclJlcG9ydGluZ1BhcnNlck1peGluID0gcmVxdWlyZSgnLi4vZXh0ZW5zaW9ucy9lcnJvci1yZXBvcnRpbmcvcGFyc2VyLW1peGluJyk7XG5jb25zdCBNaXhpbiA9IHJlcXVpcmUoJy4uL3V0aWxzL21peGluJyk7XG5jb25zdCBkZWZhdWx0VHJlZUFkYXB0ZXIgPSByZXF1aXJlKCcuLi90cmVlLWFkYXB0ZXJzL2RlZmF1bHQnKTtcbmNvbnN0IG1lcmdlT3B0aW9ucyA9IHJlcXVpcmUoJy4uL3V0aWxzL21lcmdlLW9wdGlvbnMnKTtcbmNvbnN0IGRvY3R5cGUgPSByZXF1aXJlKCcuLi9jb21tb24vZG9jdHlwZScpO1xuY29uc3QgZm9yZWlnbkNvbnRlbnQgPSByZXF1aXJlKCcuLi9jb21tb24vZm9yZWlnbi1jb250ZW50Jyk7XG5jb25zdCBFUlIgPSByZXF1aXJlKCcuLi9jb21tb24vZXJyb3ItY29kZXMnKTtcbmNvbnN0IHVuaWNvZGUgPSByZXF1aXJlKCcuLi9jb21tb24vdW5pY29kZScpO1xuY29uc3QgSFRNTCA9IHJlcXVpcmUoJy4uL2NvbW1vbi9odG1sJyk7XG5cbi8vQWxpYXNlc1xuY29uc3QgJCA9IEhUTUwuVEFHX05BTUVTO1xuY29uc3QgTlMgPSBIVE1MLk5BTUVTUEFDRVM7XG5jb25zdCBBVFRSUyA9IEhUTUwuQVRUUlM7XG5cbmNvbnN0IERFRkFVTFRfT1BUSU9OUyA9IHtcbiAgICBzY3JpcHRpbmdFbmFibGVkOiB0cnVlLFxuICAgIHNvdXJjZUNvZGVMb2NhdGlvbkluZm86IGZhbHNlLFxuICAgIG9uUGFyc2VFcnJvcjogbnVsbCxcbiAgICB0cmVlQWRhcHRlcjogZGVmYXVsdFRyZWVBZGFwdGVyXG59O1xuXG4vL01pc2MgY29uc3RhbnRzXG5jb25zdCBISURERU5fSU5QVVRfVFlQRSA9ICdoaWRkZW4nO1xuXG4vL0Fkb3B0aW9uIGFnZW5jeSBsb29wcyBpdGVyYXRpb24gY291bnRcbmNvbnN0IEFBX09VVEVSX0xPT1BfSVRFUiA9IDg7XG5jb25zdCBBQV9JTk5FUl9MT09QX0lURVIgPSAzO1xuXG4vL0luc2VydGlvbiBtb2Rlc1xuY29uc3QgSU5JVElBTF9NT0RFID0gJ0lOSVRJQUxfTU9ERSc7XG5jb25zdCBCRUZPUkVfSFRNTF9NT0RFID0gJ0JFRk9SRV9IVE1MX01PREUnO1xuY29uc3QgQkVGT1JFX0hFQURfTU9ERSA9ICdCRUZPUkVfSEVBRF9NT0RFJztcbmNvbnN0IElOX0hFQURfTU9ERSA9ICdJTl9IRUFEX01PREUnO1xuY29uc3QgSU5fSEVBRF9OT19TQ1JJUFRfTU9ERSA9ICdJTl9IRUFEX05PX1NDUklQVF9NT0RFJztcbmNvbnN0IEFGVEVSX0hFQURfTU9ERSA9ICdBRlRFUl9IRUFEX01PREUnO1xuY29uc3QgSU5fQk9EWV9NT0RFID0gJ0lOX0JPRFlfTU9ERSc7XG5jb25zdCBURVhUX01PREUgPSAnVEVYVF9NT0RFJztcbmNvbnN0IElOX1RBQkxFX01PREUgPSAnSU5fVEFCTEVfTU9ERSc7XG5jb25zdCBJTl9UQUJMRV9URVhUX01PREUgPSAnSU5fVEFCTEVfVEVYVF9NT0RFJztcbmNvbnN0IElOX0NBUFRJT05fTU9ERSA9ICdJTl9DQVBUSU9OX01PREUnO1xuY29uc3QgSU5fQ09MVU1OX0dST1VQX01PREUgPSAnSU5fQ09MVU1OX0dST1VQX01PREUnO1xuY29uc3QgSU5fVEFCTEVfQk9EWV9NT0RFID0gJ0lOX1RBQkxFX0JPRFlfTU9ERSc7XG5jb25zdCBJTl9ST1dfTU9ERSA9ICdJTl9ST1dfTU9ERSc7XG5jb25zdCBJTl9DRUxMX01PREUgPSAnSU5fQ0VMTF9NT0RFJztcbmNvbnN0IElOX1NFTEVDVF9NT0RFID0gJ0lOX1NFTEVDVF9NT0RFJztcbmNvbnN0IElOX1NFTEVDVF9JTl9UQUJMRV9NT0RFID0gJ0lOX1NFTEVDVF9JTl9UQUJMRV9NT0RFJztcbmNvbnN0IElOX1RFTVBMQVRFX01PREUgPSAnSU5fVEVNUExBVEVfTU9ERSc7XG5jb25zdCBBRlRFUl9CT0RZX01PREUgPSAnQUZURVJfQk9EWV9NT0RFJztcbmNvbnN0IElOX0ZSQU1FU0VUX01PREUgPSAnSU5fRlJBTUVTRVRfTU9ERSc7XG5jb25zdCBBRlRFUl9GUkFNRVNFVF9NT0RFID0gJ0FGVEVSX0ZSQU1FU0VUX01PREUnO1xuY29uc3QgQUZURVJfQUZURVJfQk9EWV9NT0RFID0gJ0FGVEVSX0FGVEVSX0JPRFlfTU9ERSc7XG5jb25zdCBBRlRFUl9BRlRFUl9GUkFNRVNFVF9NT0RFID0gJ0FGVEVSX0FGVEVSX0ZSQU1FU0VUX01PREUnO1xuXG4vL0luc2VydGlvbiBtb2RlIHJlc2V0IG1hcFxuY29uc3QgSU5TRVJUSU9OX01PREVfUkVTRVRfTUFQID0ge1xuICAgIFskLlRSXTogSU5fUk9XX01PREUsXG4gICAgWyQuVEJPRFldOiBJTl9UQUJMRV9CT0RZX01PREUsXG4gICAgWyQuVEhFQURdOiBJTl9UQUJMRV9CT0RZX01PREUsXG4gICAgWyQuVEZPT1RdOiBJTl9UQUJMRV9CT0RZX01PREUsXG4gICAgWyQuQ0FQVElPTl06IElOX0NBUFRJT05fTU9ERSxcbiAgICBbJC5DT0xHUk9VUF06IElOX0NPTFVNTl9HUk9VUF9NT0RFLFxuICAgIFskLlRBQkxFXTogSU5fVEFCTEVfTU9ERSxcbiAgICBbJC5CT0RZXTogSU5fQk9EWV9NT0RFLFxuICAgIFskLkZSQU1FU0VUXTogSU5fRlJBTUVTRVRfTU9ERVxufTtcblxuLy9UZW1wbGF0ZSBpbnNlcnRpb24gbW9kZSBzd2l0Y2ggbWFwXG5jb25zdCBURU1QTEFURV9JTlNFUlRJT05fTU9ERV9TV0lUQ0hfTUFQID0ge1xuICAgIFskLkNBUFRJT05dOiBJTl9UQUJMRV9NT0RFLFxuICAgIFskLkNPTEdST1VQXTogSU5fVEFCTEVfTU9ERSxcbiAgICBbJC5UQk9EWV06IElOX1RBQkxFX01PREUsXG4gICAgWyQuVEZPT1RdOiBJTl9UQUJMRV9NT0RFLFxuICAgIFskLlRIRUFEXTogSU5fVEFCTEVfTU9ERSxcbiAgICBbJC5DT0xdOiBJTl9DT0xVTU5fR1JPVVBfTU9ERSxcbiAgICBbJC5UUl06IElOX1RBQkxFX0JPRFlfTU9ERSxcbiAgICBbJC5URF06IElOX1JPV19NT0RFLFxuICAgIFskLlRIXTogSU5fUk9XX01PREVcbn07XG5cbi8vVG9rZW4gaGFuZGxlcnMgbWFwIGZvciBpbnNlcnRpb24gbW9kZXNcbmNvbnN0IFRPS0VOX0hBTkRMRVJTID0ge1xuICAgIFtJTklUSUFMX01PREVdOiB7XG4gICAgICAgIFtUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOXTogdG9rZW5JbkluaXRpYWxNb2RlLFxuICAgICAgICBbVG9rZW5pemVyLk5VTExfQ0hBUkFDVEVSX1RPS0VOXTogdG9rZW5JbkluaXRpYWxNb2RlLFxuICAgICAgICBbVG9rZW5pemVyLldISVRFU1BBQ0VfQ0hBUkFDVEVSX1RPS0VOXTogaWdub3JlVG9rZW4sXG4gICAgICAgIFtUb2tlbml6ZXIuQ09NTUVOVF9UT0tFTl06IGFwcGVuZENvbW1lbnQsXG4gICAgICAgIFtUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTl06IGRvY3R5cGVJbkluaXRpYWxNb2RlLFxuICAgICAgICBbVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTl06IHRva2VuSW5Jbml0aWFsTW9kZSxcbiAgICAgICAgW1Rva2VuaXplci5FTkRfVEFHX1RPS0VOXTogdG9rZW5JbkluaXRpYWxNb2RlLFxuICAgICAgICBbVG9rZW5pemVyLkVPRl9UT0tFTl06IHRva2VuSW5Jbml0aWFsTW9kZVxuICAgIH0sXG4gICAgW0JFRk9SRV9IVE1MX01PREVdOiB7XG4gICAgICAgIFtUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOXTogdG9rZW5CZWZvcmVIdG1sLFxuICAgICAgICBbVG9rZW5pemVyLk5VTExfQ0hBUkFDVEVSX1RPS0VOXTogdG9rZW5CZWZvcmVIdG1sLFxuICAgICAgICBbVG9rZW5pemVyLldISVRFU1BBQ0VfQ0hBUkFDVEVSX1RPS0VOXTogaWdub3JlVG9rZW4sXG4gICAgICAgIFtUb2tlbml6ZXIuQ09NTUVOVF9UT0tFTl06IGFwcGVuZENvbW1lbnQsXG4gICAgICAgIFtUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTl06IHN0YXJ0VGFnQmVmb3JlSHRtbCxcbiAgICAgICAgW1Rva2VuaXplci5FTkRfVEFHX1RPS0VOXTogZW5kVGFnQmVmb3JlSHRtbCxcbiAgICAgICAgW1Rva2VuaXplci5FT0ZfVE9LRU5dOiB0b2tlbkJlZm9yZUh0bWxcbiAgICB9LFxuICAgIFtCRUZPUkVfSEVBRF9NT0RFXToge1xuICAgICAgICBbVG9rZW5pemVyLkNIQVJBQ1RFUl9UT0tFTl06IHRva2VuQmVmb3JlSGVhZCxcbiAgICAgICAgW1Rva2VuaXplci5OVUxMX0NIQVJBQ1RFUl9UT0tFTl06IHRva2VuQmVmb3JlSGVhZCxcbiAgICAgICAgW1Rva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLkNPTU1FTlRfVE9LRU5dOiBhcHBlbmRDb21tZW50LFxuICAgICAgICBbVG9rZW5pemVyLkRPQ1RZUEVfVE9LRU5dOiBtaXNwbGFjZWREb2N0eXBlLFxuICAgICAgICBbVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTl06IHN0YXJ0VGFnQmVmb3JlSGVhZCxcbiAgICAgICAgW1Rva2VuaXplci5FTkRfVEFHX1RPS0VOXTogZW5kVGFnQmVmb3JlSGVhZCxcbiAgICAgICAgW1Rva2VuaXplci5FT0ZfVE9LRU5dOiB0b2tlbkJlZm9yZUhlYWRcbiAgICB9LFxuICAgIFtJTl9IRUFEX01PREVdOiB7XG4gICAgICAgIFtUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOXTogdG9rZW5JbkhlYWQsXG4gICAgICAgIFtUb2tlbml6ZXIuTlVMTF9DSEFSQUNURVJfVE9LRU5dOiB0b2tlbkluSGVhZCxcbiAgICAgICAgW1Rva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTl06IGluc2VydENoYXJhY3RlcnMsXG4gICAgICAgIFtUb2tlbml6ZXIuQ09NTUVOVF9UT0tFTl06IGFwcGVuZENvbW1lbnQsXG4gICAgICAgIFtUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTl06IG1pc3BsYWNlZERvY3R5cGUsXG4gICAgICAgIFtUb2tlbml6ZXIuU1RBUlRfVEFHX1RPS0VOXTogc3RhcnRUYWdJbkhlYWQsXG4gICAgICAgIFtUb2tlbml6ZXIuRU5EX1RBR19UT0tFTl06IGVuZFRhZ0luSGVhZCxcbiAgICAgICAgW1Rva2VuaXplci5FT0ZfVE9LRU5dOiB0b2tlbkluSGVhZFxuICAgIH0sXG4gICAgW0lOX0hFQURfTk9fU0NSSVBUX01PREVdOiB7XG4gICAgICAgIFtUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOXTogdG9rZW5JbkhlYWROb1NjcmlwdCxcbiAgICAgICAgW1Rva2VuaXplci5OVUxMX0NIQVJBQ1RFUl9UT0tFTl06IHRva2VuSW5IZWFkTm9TY3JpcHQsXG4gICAgICAgIFtUb2tlbml6ZXIuV0hJVEVTUEFDRV9DSEFSQUNURVJfVE9LRU5dOiBpbnNlcnRDaGFyYWN0ZXJzLFxuICAgICAgICBbVG9rZW5pemVyLkNPTU1FTlRfVE9LRU5dOiBhcHBlbmRDb21tZW50LFxuICAgICAgICBbVG9rZW5pemVyLkRPQ1RZUEVfVE9LRU5dOiBtaXNwbGFjZWREb2N0eXBlLFxuICAgICAgICBbVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTl06IHN0YXJ0VGFnSW5IZWFkTm9TY3JpcHQsXG4gICAgICAgIFtUb2tlbml6ZXIuRU5EX1RBR19UT0tFTl06IGVuZFRhZ0luSGVhZE5vU2NyaXB0LFxuICAgICAgICBbVG9rZW5pemVyLkVPRl9UT0tFTl06IHRva2VuSW5IZWFkTm9TY3JpcHRcbiAgICB9LFxuICAgIFtBRlRFUl9IRUFEX01PREVdOiB7XG4gICAgICAgIFtUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOXTogdG9rZW5BZnRlckhlYWQsXG4gICAgICAgIFtUb2tlbml6ZXIuTlVMTF9DSEFSQUNURVJfVE9LRU5dOiB0b2tlbkFmdGVySGVhZCxcbiAgICAgICAgW1Rva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTl06IGluc2VydENoYXJhY3RlcnMsXG4gICAgICAgIFtUb2tlbml6ZXIuQ09NTUVOVF9UT0tFTl06IGFwcGVuZENvbW1lbnQsXG4gICAgICAgIFtUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTl06IG1pc3BsYWNlZERvY3R5cGUsXG4gICAgICAgIFtUb2tlbml6ZXIuU1RBUlRfVEFHX1RPS0VOXTogc3RhcnRUYWdBZnRlckhlYWQsXG4gICAgICAgIFtUb2tlbml6ZXIuRU5EX1RBR19UT0tFTl06IGVuZFRhZ0FmdGVySGVhZCxcbiAgICAgICAgW1Rva2VuaXplci5FT0ZfVE9LRU5dOiB0b2tlbkFmdGVySGVhZFxuICAgIH0sXG4gICAgW0lOX0JPRFlfTU9ERV06IHtcbiAgICAgICAgW1Rva2VuaXplci5DSEFSQUNURVJfVE9LRU5dOiBjaGFyYWN0ZXJJbkJvZHksXG4gICAgICAgIFtUb2tlbml6ZXIuTlVMTF9DSEFSQUNURVJfVE9LRU5dOiBpZ25vcmVUb2tlbixcbiAgICAgICAgW1Rva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTl06IHdoaXRlc3BhY2VDaGFyYWN0ZXJJbkJvZHksXG4gICAgICAgIFtUb2tlbml6ZXIuQ09NTUVOVF9UT0tFTl06IGFwcGVuZENvbW1lbnQsXG4gICAgICAgIFtUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTl06IHN0YXJ0VGFnSW5Cb2R5LFxuICAgICAgICBbVG9rZW5pemVyLkVORF9UQUdfVE9LRU5dOiBlbmRUYWdJbkJvZHksXG4gICAgICAgIFtUb2tlbml6ZXIuRU9GX1RPS0VOXTogZW9mSW5Cb2R5XG4gICAgfSxcbiAgICBbVEVYVF9NT0RFXToge1xuICAgICAgICBbVG9rZW5pemVyLkNIQVJBQ1RFUl9UT0tFTl06IGluc2VydENoYXJhY3RlcnMsXG4gICAgICAgIFtUb2tlbml6ZXIuTlVMTF9DSEFSQUNURVJfVE9LRU5dOiBpbnNlcnRDaGFyYWN0ZXJzLFxuICAgICAgICBbVG9rZW5pemVyLldISVRFU1BBQ0VfQ0hBUkFDVEVSX1RPS0VOXTogaW5zZXJ0Q2hhcmFjdGVycyxcbiAgICAgICAgW1Rva2VuaXplci5DT01NRU5UX1RPS0VOXTogaWdub3JlVG9rZW4sXG4gICAgICAgIFtUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLkVORF9UQUdfVE9LRU5dOiBlbmRUYWdJblRleHQsXG4gICAgICAgIFtUb2tlbml6ZXIuRU9GX1RPS0VOXTogZW9mSW5UZXh0XG4gICAgfSxcbiAgICBbSU5fVEFCTEVfTU9ERV06IHtcbiAgICAgICAgW1Rva2VuaXplci5DSEFSQUNURVJfVE9LRU5dOiBjaGFyYWN0ZXJJblRhYmxlLFxuICAgICAgICBbVG9rZW5pemVyLk5VTExfQ0hBUkFDVEVSX1RPS0VOXTogY2hhcmFjdGVySW5UYWJsZSxcbiAgICAgICAgW1Rva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTl06IGNoYXJhY3RlckluVGFibGUsXG4gICAgICAgIFtUb2tlbml6ZXIuQ09NTUVOVF9UT0tFTl06IGFwcGVuZENvbW1lbnQsXG4gICAgICAgIFtUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTl06IHN0YXJ0VGFnSW5UYWJsZSxcbiAgICAgICAgW1Rva2VuaXplci5FTkRfVEFHX1RPS0VOXTogZW5kVGFnSW5UYWJsZSxcbiAgICAgICAgW1Rva2VuaXplci5FT0ZfVE9LRU5dOiBlb2ZJbkJvZHlcbiAgICB9LFxuICAgIFtJTl9UQUJMRV9URVhUX01PREVdOiB7XG4gICAgICAgIFtUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOXTogY2hhcmFjdGVySW5UYWJsZVRleHQsXG4gICAgICAgIFtUb2tlbml6ZXIuTlVMTF9DSEFSQUNURVJfVE9LRU5dOiBpZ25vcmVUb2tlbixcbiAgICAgICAgW1Rva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTl06IHdoaXRlc3BhY2VDaGFyYWN0ZXJJblRhYmxlVGV4dCxcbiAgICAgICAgW1Rva2VuaXplci5DT01NRU5UX1RPS0VOXTogdG9rZW5JblRhYmxlVGV4dCxcbiAgICAgICAgW1Rva2VuaXplci5ET0NUWVBFX1RPS0VOXTogdG9rZW5JblRhYmxlVGV4dCxcbiAgICAgICAgW1Rva2VuaXplci5TVEFSVF9UQUdfVE9LRU5dOiB0b2tlbkluVGFibGVUZXh0LFxuICAgICAgICBbVG9rZW5pemVyLkVORF9UQUdfVE9LRU5dOiB0b2tlbkluVGFibGVUZXh0LFxuICAgICAgICBbVG9rZW5pemVyLkVPRl9UT0tFTl06IHRva2VuSW5UYWJsZVRleHRcbiAgICB9LFxuICAgIFtJTl9DQVBUSU9OX01PREVdOiB7XG4gICAgICAgIFtUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOXTogY2hhcmFjdGVySW5Cb2R5LFxuICAgICAgICBbVG9rZW5pemVyLk5VTExfQ0hBUkFDVEVSX1RPS0VOXTogaWdub3JlVG9rZW4sXG4gICAgICAgIFtUb2tlbml6ZXIuV0hJVEVTUEFDRV9DSEFSQUNURVJfVE9LRU5dOiB3aGl0ZXNwYWNlQ2hhcmFjdGVySW5Cb2R5LFxuICAgICAgICBbVG9rZW5pemVyLkNPTU1FTlRfVE9LRU5dOiBhcHBlbmRDb21tZW50LFxuICAgICAgICBbVG9rZW5pemVyLkRPQ1RZUEVfVE9LRU5dOiBpZ25vcmVUb2tlbixcbiAgICAgICAgW1Rva2VuaXplci5TVEFSVF9UQUdfVE9LRU5dOiBzdGFydFRhZ0luQ2FwdGlvbixcbiAgICAgICAgW1Rva2VuaXplci5FTkRfVEFHX1RPS0VOXTogZW5kVGFnSW5DYXB0aW9uLFxuICAgICAgICBbVG9rZW5pemVyLkVPRl9UT0tFTl06IGVvZkluQm9keVxuICAgIH0sXG4gICAgW0lOX0NPTFVNTl9HUk9VUF9NT0RFXToge1xuICAgICAgICBbVG9rZW5pemVyLkNIQVJBQ1RFUl9UT0tFTl06IHRva2VuSW5Db2x1bW5Hcm91cCxcbiAgICAgICAgW1Rva2VuaXplci5OVUxMX0NIQVJBQ1RFUl9UT0tFTl06IHRva2VuSW5Db2x1bW5Hcm91cCxcbiAgICAgICAgW1Rva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTl06IGluc2VydENoYXJhY3RlcnMsXG4gICAgICAgIFtUb2tlbml6ZXIuQ09NTUVOVF9UT0tFTl06IGFwcGVuZENvbW1lbnQsXG4gICAgICAgIFtUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTl06IHN0YXJ0VGFnSW5Db2x1bW5Hcm91cCxcbiAgICAgICAgW1Rva2VuaXplci5FTkRfVEFHX1RPS0VOXTogZW5kVGFnSW5Db2x1bW5Hcm91cCxcbiAgICAgICAgW1Rva2VuaXplci5FT0ZfVE9LRU5dOiBlb2ZJbkJvZHlcbiAgICB9LFxuICAgIFtJTl9UQUJMRV9CT0RZX01PREVdOiB7XG4gICAgICAgIFtUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOXTogY2hhcmFjdGVySW5UYWJsZSxcbiAgICAgICAgW1Rva2VuaXplci5OVUxMX0NIQVJBQ1RFUl9UT0tFTl06IGNoYXJhY3RlckluVGFibGUsXG4gICAgICAgIFtUb2tlbml6ZXIuV0hJVEVTUEFDRV9DSEFSQUNURVJfVE9LRU5dOiBjaGFyYWN0ZXJJblRhYmxlLFxuICAgICAgICBbVG9rZW5pemVyLkNPTU1FTlRfVE9LRU5dOiBhcHBlbmRDb21tZW50LFxuICAgICAgICBbVG9rZW5pemVyLkRPQ1RZUEVfVE9LRU5dOiBpZ25vcmVUb2tlbixcbiAgICAgICAgW1Rva2VuaXplci5TVEFSVF9UQUdfVE9LRU5dOiBzdGFydFRhZ0luVGFibGVCb2R5LFxuICAgICAgICBbVG9rZW5pemVyLkVORF9UQUdfVE9LRU5dOiBlbmRUYWdJblRhYmxlQm9keSxcbiAgICAgICAgW1Rva2VuaXplci5FT0ZfVE9LRU5dOiBlb2ZJbkJvZHlcbiAgICB9LFxuICAgIFtJTl9ST1dfTU9ERV06IHtcbiAgICAgICAgW1Rva2VuaXplci5DSEFSQUNURVJfVE9LRU5dOiBjaGFyYWN0ZXJJblRhYmxlLFxuICAgICAgICBbVG9rZW5pemVyLk5VTExfQ0hBUkFDVEVSX1RPS0VOXTogY2hhcmFjdGVySW5UYWJsZSxcbiAgICAgICAgW1Rva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTl06IGNoYXJhY3RlckluVGFibGUsXG4gICAgICAgIFtUb2tlbml6ZXIuQ09NTUVOVF9UT0tFTl06IGFwcGVuZENvbW1lbnQsXG4gICAgICAgIFtUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTl06IHN0YXJ0VGFnSW5Sb3csXG4gICAgICAgIFtUb2tlbml6ZXIuRU5EX1RBR19UT0tFTl06IGVuZFRhZ0luUm93LFxuICAgICAgICBbVG9rZW5pemVyLkVPRl9UT0tFTl06IGVvZkluQm9keVxuICAgIH0sXG4gICAgW0lOX0NFTExfTU9ERV06IHtcbiAgICAgICAgW1Rva2VuaXplci5DSEFSQUNURVJfVE9LRU5dOiBjaGFyYWN0ZXJJbkJvZHksXG4gICAgICAgIFtUb2tlbml6ZXIuTlVMTF9DSEFSQUNURVJfVE9LRU5dOiBpZ25vcmVUb2tlbixcbiAgICAgICAgW1Rva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTl06IHdoaXRlc3BhY2VDaGFyYWN0ZXJJbkJvZHksXG4gICAgICAgIFtUb2tlbml6ZXIuQ09NTUVOVF9UT0tFTl06IGFwcGVuZENvbW1lbnQsXG4gICAgICAgIFtUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTl06IHN0YXJ0VGFnSW5DZWxsLFxuICAgICAgICBbVG9rZW5pemVyLkVORF9UQUdfVE9LRU5dOiBlbmRUYWdJbkNlbGwsXG4gICAgICAgIFtUb2tlbml6ZXIuRU9GX1RPS0VOXTogZW9mSW5Cb2R5XG4gICAgfSxcbiAgICBbSU5fU0VMRUNUX01PREVdOiB7XG4gICAgICAgIFtUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOXTogaW5zZXJ0Q2hhcmFjdGVycyxcbiAgICAgICAgW1Rva2VuaXplci5OVUxMX0NIQVJBQ1RFUl9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLldISVRFU1BBQ0VfQ0hBUkFDVEVSX1RPS0VOXTogaW5zZXJ0Q2hhcmFjdGVycyxcbiAgICAgICAgW1Rva2VuaXplci5DT01NRU5UX1RPS0VOXTogYXBwZW5kQ29tbWVudCxcbiAgICAgICAgW1Rva2VuaXplci5ET0NUWVBFX1RPS0VOXTogaWdub3JlVG9rZW4sXG4gICAgICAgIFtUb2tlbml6ZXIuU1RBUlRfVEFHX1RPS0VOXTogc3RhcnRUYWdJblNlbGVjdCxcbiAgICAgICAgW1Rva2VuaXplci5FTkRfVEFHX1RPS0VOXTogZW5kVGFnSW5TZWxlY3QsXG4gICAgICAgIFtUb2tlbml6ZXIuRU9GX1RPS0VOXTogZW9mSW5Cb2R5XG4gICAgfSxcbiAgICBbSU5fU0VMRUNUX0lOX1RBQkxFX01PREVdOiB7XG4gICAgICAgIFtUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOXTogaW5zZXJ0Q2hhcmFjdGVycyxcbiAgICAgICAgW1Rva2VuaXplci5OVUxMX0NIQVJBQ1RFUl9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLldISVRFU1BBQ0VfQ0hBUkFDVEVSX1RPS0VOXTogaW5zZXJ0Q2hhcmFjdGVycyxcbiAgICAgICAgW1Rva2VuaXplci5DT01NRU5UX1RPS0VOXTogYXBwZW5kQ29tbWVudCxcbiAgICAgICAgW1Rva2VuaXplci5ET0NUWVBFX1RPS0VOXTogaWdub3JlVG9rZW4sXG4gICAgICAgIFtUb2tlbml6ZXIuU1RBUlRfVEFHX1RPS0VOXTogc3RhcnRUYWdJblNlbGVjdEluVGFibGUsXG4gICAgICAgIFtUb2tlbml6ZXIuRU5EX1RBR19UT0tFTl06IGVuZFRhZ0luU2VsZWN0SW5UYWJsZSxcbiAgICAgICAgW1Rva2VuaXplci5FT0ZfVE9LRU5dOiBlb2ZJbkJvZHlcbiAgICB9LFxuICAgIFtJTl9URU1QTEFURV9NT0RFXToge1xuICAgICAgICBbVG9rZW5pemVyLkNIQVJBQ1RFUl9UT0tFTl06IGNoYXJhY3RlckluQm9keSxcbiAgICAgICAgW1Rva2VuaXplci5OVUxMX0NIQVJBQ1RFUl9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLldISVRFU1BBQ0VfQ0hBUkFDVEVSX1RPS0VOXTogd2hpdGVzcGFjZUNoYXJhY3RlckluQm9keSxcbiAgICAgICAgW1Rva2VuaXplci5DT01NRU5UX1RPS0VOXTogYXBwZW5kQ29tbWVudCxcbiAgICAgICAgW1Rva2VuaXplci5ET0NUWVBFX1RPS0VOXTogaWdub3JlVG9rZW4sXG4gICAgICAgIFtUb2tlbml6ZXIuU1RBUlRfVEFHX1RPS0VOXTogc3RhcnRUYWdJblRlbXBsYXRlLFxuICAgICAgICBbVG9rZW5pemVyLkVORF9UQUdfVE9LRU5dOiBlbmRUYWdJblRlbXBsYXRlLFxuICAgICAgICBbVG9rZW5pemVyLkVPRl9UT0tFTl06IGVvZkluVGVtcGxhdGVcbiAgICB9LFxuICAgIFtBRlRFUl9CT0RZX01PREVdOiB7XG4gICAgICAgIFtUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOXTogdG9rZW5BZnRlckJvZHksXG4gICAgICAgIFtUb2tlbml6ZXIuTlVMTF9DSEFSQUNURVJfVE9LRU5dOiB0b2tlbkFmdGVyQm9keSxcbiAgICAgICAgW1Rva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTl06IHdoaXRlc3BhY2VDaGFyYWN0ZXJJbkJvZHksXG4gICAgICAgIFtUb2tlbml6ZXIuQ09NTUVOVF9UT0tFTl06IGFwcGVuZENvbW1lbnRUb1Jvb3RIdG1sRWxlbWVudCxcbiAgICAgICAgW1Rva2VuaXplci5ET0NUWVBFX1RPS0VOXTogaWdub3JlVG9rZW4sXG4gICAgICAgIFtUb2tlbml6ZXIuU1RBUlRfVEFHX1RPS0VOXTogc3RhcnRUYWdBZnRlckJvZHksXG4gICAgICAgIFtUb2tlbml6ZXIuRU5EX1RBR19UT0tFTl06IGVuZFRhZ0FmdGVyQm9keSxcbiAgICAgICAgW1Rva2VuaXplci5FT0ZfVE9LRU5dOiBzdG9wUGFyc2luZ1xuICAgIH0sXG4gICAgW0lOX0ZSQU1FU0VUX01PREVdOiB7XG4gICAgICAgIFtUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOXTogaWdub3JlVG9rZW4sXG4gICAgICAgIFtUb2tlbml6ZXIuTlVMTF9DSEFSQUNURVJfVE9LRU5dOiBpZ25vcmVUb2tlbixcbiAgICAgICAgW1Rva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTl06IGluc2VydENoYXJhY3RlcnMsXG4gICAgICAgIFtUb2tlbml6ZXIuQ09NTUVOVF9UT0tFTl06IGFwcGVuZENvbW1lbnQsXG4gICAgICAgIFtUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTl06IHN0YXJ0VGFnSW5GcmFtZXNldCxcbiAgICAgICAgW1Rva2VuaXplci5FTkRfVEFHX1RPS0VOXTogZW5kVGFnSW5GcmFtZXNldCxcbiAgICAgICAgW1Rva2VuaXplci5FT0ZfVE9LRU5dOiBzdG9wUGFyc2luZ1xuICAgIH0sXG4gICAgW0FGVEVSX0ZSQU1FU0VUX01PREVdOiB7XG4gICAgICAgIFtUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOXTogaWdub3JlVG9rZW4sXG4gICAgICAgIFtUb2tlbml6ZXIuTlVMTF9DSEFSQUNURVJfVE9LRU5dOiBpZ25vcmVUb2tlbixcbiAgICAgICAgW1Rva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTl06IGluc2VydENoYXJhY3RlcnMsXG4gICAgICAgIFtUb2tlbml6ZXIuQ09NTUVOVF9UT0tFTl06IGFwcGVuZENvbW1lbnQsXG4gICAgICAgIFtUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTl06IHN0YXJ0VGFnQWZ0ZXJGcmFtZXNldCxcbiAgICAgICAgW1Rva2VuaXplci5FTkRfVEFHX1RPS0VOXTogZW5kVGFnQWZ0ZXJGcmFtZXNldCxcbiAgICAgICAgW1Rva2VuaXplci5FT0ZfVE9LRU5dOiBzdG9wUGFyc2luZ1xuICAgIH0sXG4gICAgW0FGVEVSX0FGVEVSX0JPRFlfTU9ERV06IHtcbiAgICAgICAgW1Rva2VuaXplci5DSEFSQUNURVJfVE9LRU5dOiB0b2tlbkFmdGVyQWZ0ZXJCb2R5LFxuICAgICAgICBbVG9rZW5pemVyLk5VTExfQ0hBUkFDVEVSX1RPS0VOXTogdG9rZW5BZnRlckFmdGVyQm9keSxcbiAgICAgICAgW1Rva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTl06IHdoaXRlc3BhY2VDaGFyYWN0ZXJJbkJvZHksXG4gICAgICAgIFtUb2tlbml6ZXIuQ09NTUVOVF9UT0tFTl06IGFwcGVuZENvbW1lbnRUb0RvY3VtZW50LFxuICAgICAgICBbVG9rZW5pemVyLkRPQ1RZUEVfVE9LRU5dOiBpZ25vcmVUb2tlbixcbiAgICAgICAgW1Rva2VuaXplci5TVEFSVF9UQUdfVE9LRU5dOiBzdGFydFRhZ0FmdGVyQWZ0ZXJCb2R5LFxuICAgICAgICBbVG9rZW5pemVyLkVORF9UQUdfVE9LRU5dOiB0b2tlbkFmdGVyQWZ0ZXJCb2R5LFxuICAgICAgICBbVG9rZW5pemVyLkVPRl9UT0tFTl06IHN0b3BQYXJzaW5nXG4gICAgfSxcbiAgICBbQUZURVJfQUZURVJfRlJBTUVTRVRfTU9ERV06IHtcbiAgICAgICAgW1Rva2VuaXplci5DSEFSQUNURVJfVE9LRU5dOiBpZ25vcmVUb2tlbixcbiAgICAgICAgW1Rva2VuaXplci5OVUxMX0NIQVJBQ1RFUl9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLldISVRFU1BBQ0VfQ0hBUkFDVEVSX1RPS0VOXTogd2hpdGVzcGFjZUNoYXJhY3RlckluQm9keSxcbiAgICAgICAgW1Rva2VuaXplci5DT01NRU5UX1RPS0VOXTogYXBwZW5kQ29tbWVudFRvRG9jdW1lbnQsXG4gICAgICAgIFtUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTl06IGlnbm9yZVRva2VuLFxuICAgICAgICBbVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTl06IHN0YXJ0VGFnQWZ0ZXJBZnRlckZyYW1lc2V0LFxuICAgICAgICBbVG9rZW5pemVyLkVORF9UQUdfVE9LRU5dOiBpZ25vcmVUb2tlbixcbiAgICAgICAgW1Rva2VuaXplci5FT0ZfVE9LRU5dOiBzdG9wUGFyc2luZ1xuICAgIH1cbn07XG5cbi8vUGFyc2VyXG5jbGFzcyBQYXJzZXIge1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gbWVyZ2VPcHRpb25zKERFRkFVTFRfT1BUSU9OUywgb3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy50cmVlQWRhcHRlciA9IHRoaXMub3B0aW9ucy50cmVlQWRhcHRlcjtcbiAgICAgICAgdGhpcy5wZW5kaW5nU2NyaXB0ID0gbnVsbDtcblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNvdXJjZUNvZGVMb2NhdGlvbkluZm8pIHtcbiAgICAgICAgICAgIE1peGluLmluc3RhbGwodGhpcywgTG9jYXRpb25JbmZvUGFyc2VyTWl4aW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5vblBhcnNlRXJyb3IpIHtcbiAgICAgICAgICAgIE1peGluLmluc3RhbGwodGhpcywgRXJyb3JSZXBvcnRpbmdQYXJzZXJNaXhpbiwgeyBvblBhcnNlRXJyb3I6IHRoaXMub3B0aW9ucy5vblBhcnNlRXJyb3IgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBUElcbiAgICBwYXJzZShodG1sKSB7XG4gICAgICAgIGNvbnN0IGRvY3VtZW50ID0gdGhpcy50cmVlQWRhcHRlci5jcmVhdGVEb2N1bWVudCgpO1xuXG4gICAgICAgIHRoaXMuX2Jvb3RzdHJhcChkb2N1bWVudCwgbnVsbCk7XG4gICAgICAgIHRoaXMudG9rZW5pemVyLndyaXRlKGh0bWwsIHRydWUpO1xuICAgICAgICB0aGlzLl9ydW5QYXJzaW5nTG9vcChudWxsKTtcblxuICAgICAgICByZXR1cm4gZG9jdW1lbnQ7XG4gICAgfVxuXG4gICAgcGFyc2VGcmFnbWVudChodG1sLCBmcmFnbWVudENvbnRleHQpIHtcbiAgICAgICAgLy9OT1RFOiB1c2UgPHRlbXBsYXRlPiBlbGVtZW50IGFzIGEgZnJhZ21lbnQgY29udGV4dCBpZiBjb250ZXh0IGVsZW1lbnQgd2FzIG5vdCBwcm92aWRlZCxcbiAgICAgICAgLy9zbyB3ZSB3aWxsIHBhcnNlIGluIFwiZm9yZ2l2aW5nXCIgbWFubmVyXG4gICAgICAgIGlmICghZnJhZ21lbnRDb250ZXh0KSB7XG4gICAgICAgICAgICBmcmFnbWVudENvbnRleHQgPSB0aGlzLnRyZWVBZGFwdGVyLmNyZWF0ZUVsZW1lbnQoJC5URU1QTEFURSwgTlMuSFRNTCwgW10pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9OT1RFOiBjcmVhdGUgZmFrZSBlbGVtZW50IHdoaWNoIHdpbGwgYmUgdXNlZCBhcyAnZG9jdW1lbnQnIGZvciBmcmFnbWVudCBwYXJzaW5nLlxuICAgICAgICAvL1RoaXMgaXMgaW1wb3J0YW50IGZvciBqc2RvbSB0aGVyZSAnZG9jdW1lbnQnIGNhbid0IGJlIHJlY3JlYXRlZCwgdGhlcmVmb3JlXG4gICAgICAgIC8vZnJhZ21lbnQgcGFyc2luZyBjYXVzZXMgbWVzc2luZyBvZiB0aGUgbWFpbiBgZG9jdW1lbnRgLlxuICAgICAgICBjb25zdCBkb2N1bWVudE1vY2sgPSB0aGlzLnRyZWVBZGFwdGVyLmNyZWF0ZUVsZW1lbnQoJ2RvY3VtZW50bW9jaycsIE5TLkhUTUwsIFtdKTtcblxuICAgICAgICB0aGlzLl9ib290c3RyYXAoZG9jdW1lbnRNb2NrLCBmcmFnbWVudENvbnRleHQpO1xuXG4gICAgICAgIGlmICh0aGlzLnRyZWVBZGFwdGVyLmdldFRhZ05hbWUoZnJhZ21lbnRDb250ZXh0KSA9PT0gJC5URU1QTEFURSkge1xuICAgICAgICAgICAgdGhpcy5fcHVzaFRtcGxJbnNlcnRpb25Nb2RlKElOX1RFTVBMQVRFX01PREUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5faW5pdFRva2VuaXplckZvckZyYWdtZW50UGFyc2luZygpO1xuICAgICAgICB0aGlzLl9pbnNlcnRGYWtlUm9vdEVsZW1lbnQoKTtcbiAgICAgICAgdGhpcy5fcmVzZXRJbnNlcnRpb25Nb2RlKCk7XG4gICAgICAgIHRoaXMuX2ZpbmRGb3JtSW5GcmFnbWVudENvbnRleHQoKTtcbiAgICAgICAgdGhpcy50b2tlbml6ZXIud3JpdGUoaHRtbCwgdHJ1ZSk7XG4gICAgICAgIHRoaXMuX3J1blBhcnNpbmdMb29wKG51bGwpO1xuXG4gICAgICAgIGNvbnN0IHJvb3RFbGVtZW50ID0gdGhpcy50cmVlQWRhcHRlci5nZXRGaXJzdENoaWxkKGRvY3VtZW50TW9jayk7XG4gICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy50cmVlQWRhcHRlci5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgICAgICAgdGhpcy5fYWRvcHROb2Rlcyhyb290RWxlbWVudCwgZnJhZ21lbnQpO1xuXG4gICAgICAgIHJldHVybiBmcmFnbWVudDtcbiAgICB9XG5cbiAgICAvL0Jvb3RzdHJhcCBwYXJzZXJcbiAgICBfYm9vdHN0cmFwKGRvY3VtZW50LCBmcmFnbWVudENvbnRleHQpIHtcbiAgICAgICAgdGhpcy50b2tlbml6ZXIgPSBuZXcgVG9rZW5pemVyKHRoaXMub3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5zdG9wcGVkID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5pbnNlcnRpb25Nb2RlID0gSU5JVElBTF9NT0RFO1xuICAgICAgICB0aGlzLm9yaWdpbmFsSW5zZXJ0aW9uTW9kZSA9ICcnO1xuXG4gICAgICAgIHRoaXMuZG9jdW1lbnQgPSBkb2N1bWVudDtcbiAgICAgICAgdGhpcy5mcmFnbWVudENvbnRleHQgPSBmcmFnbWVudENvbnRleHQ7XG5cbiAgICAgICAgdGhpcy5oZWFkRWxlbWVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuZm9ybUVsZW1lbnQgPSBudWxsO1xuXG4gICAgICAgIHRoaXMub3BlbkVsZW1lbnRzID0gbmV3IE9wZW5FbGVtZW50U3RhY2sodGhpcy5kb2N1bWVudCwgdGhpcy50cmVlQWRhcHRlcik7XG4gICAgICAgIHRoaXMuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzID0gbmV3IEZvcm1hdHRpbmdFbGVtZW50TGlzdCh0aGlzLnRyZWVBZGFwdGVyKTtcblxuICAgICAgICB0aGlzLnRtcGxJbnNlcnRpb25Nb2RlU3RhY2sgPSBbXTtcbiAgICAgICAgdGhpcy50bXBsSW5zZXJ0aW9uTW9kZVN0YWNrVG9wID0gLTE7XG4gICAgICAgIHRoaXMuY3VycmVudFRtcGxJbnNlcnRpb25Nb2RlID0gbnVsbDtcblxuICAgICAgICB0aGlzLnBlbmRpbmdDaGFyYWN0ZXJUb2tlbnMgPSBbXTtcbiAgICAgICAgdGhpcy5oYXNOb25XaGl0ZXNwYWNlUGVuZGluZ0NoYXJhY3RlclRva2VuID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5mcmFtZXNldE9rID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5za2lwTmV4dE5ld0xpbmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5mb3N0ZXJQYXJlbnRpbmdFbmFibGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy9FcnJvcnNcbiAgICBfZXJyKCkge1xuICAgICAgICAvLyBOT1RFOiBlcnIgcmVwb3J0aW5nIGlzIG5vb3AgYnkgZGVmYXVsdC4gRW5hYmxlZCBieSBtaXhpbi5cbiAgICB9XG5cbiAgICAvL1BhcnNpbmcgbG9vcFxuICAgIF9ydW5QYXJzaW5nTG9vcChzY3JpcHRIYW5kbGVyKSB7XG4gICAgICAgIHdoaWxlICghdGhpcy5zdG9wcGVkKSB7XG4gICAgICAgICAgICB0aGlzLl9zZXR1cFRva2VuaXplckNEQVRBTW9kZSgpO1xuXG4gICAgICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMudG9rZW5pemVyLmdldE5leHRUb2tlbigpO1xuXG4gICAgICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW5pemVyLkhJQkVSTkFUSU9OX1RPS0VOKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnNraXBOZXh0TmV3TGluZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2tpcE5leHROZXdMaW5lID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW5pemVyLldISVRFU1BBQ0VfQ0hBUkFDVEVSX1RPS0VOICYmIHRva2VuLmNoYXJzWzBdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4uY2hhcnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHRva2VuLmNoYXJzID0gdG9rZW4uY2hhcnMuc3Vic3RyKDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fcHJvY2Vzc0lucHV0VG9rZW4odG9rZW4pO1xuXG4gICAgICAgICAgICBpZiAoc2NyaXB0SGFuZGxlciAmJiB0aGlzLnBlbmRpbmdTY3JpcHQpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJ1blBhcnNpbmdMb29wRm9yQ3VycmVudENodW5rKHdyaXRlQ2FsbGJhY2ssIHNjcmlwdEhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fcnVuUGFyc2luZ0xvb3Aoc2NyaXB0SGFuZGxlcik7XG5cbiAgICAgICAgaWYgKHNjcmlwdEhhbmRsZXIgJiYgdGhpcy5wZW5kaW5nU2NyaXB0KSB7XG4gICAgICAgICAgICBjb25zdCBzY3JpcHQgPSB0aGlzLnBlbmRpbmdTY3JpcHQ7XG5cbiAgICAgICAgICAgIHRoaXMucGVuZGluZ1NjcmlwdCA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjcmlwdEhhbmRsZXIoc2NyaXB0KTtcblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHdyaXRlQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIHdyaXRlQ2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vVGV4dCBwYXJzaW5nXG4gICAgX3NldHVwVG9rZW5pemVyQ0RBVEFNb2RlKCkge1xuICAgICAgICBjb25zdCBjdXJyZW50ID0gdGhpcy5fZ2V0QWRqdXN0ZWRDdXJyZW50RWxlbWVudCgpO1xuXG4gICAgICAgIHRoaXMudG9rZW5pemVyLmFsbG93Q0RBVEEgPVxuICAgICAgICAgICAgY3VycmVudCAmJlxuICAgICAgICAgICAgY3VycmVudCAhPT0gdGhpcy5kb2N1bWVudCAmJlxuICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkoY3VycmVudCkgIT09IE5TLkhUTUwgJiZcbiAgICAgICAgICAgICF0aGlzLl9pc0ludGVncmF0aW9uUG9pbnQoY3VycmVudCk7XG4gICAgfVxuXG4gICAgX3N3aXRjaFRvVGV4dFBhcnNpbmcoY3VycmVudFRva2VuLCBuZXh0VG9rZW5pemVyU3RhdGUpIHtcbiAgICAgICAgdGhpcy5faW5zZXJ0RWxlbWVudChjdXJyZW50VG9rZW4sIE5TLkhUTUwpO1xuICAgICAgICB0aGlzLnRva2VuaXplci5zdGF0ZSA9IG5leHRUb2tlbml6ZXJTdGF0ZTtcbiAgICAgICAgdGhpcy5vcmlnaW5hbEluc2VydGlvbk1vZGUgPSB0aGlzLmluc2VydGlvbk1vZGU7XG4gICAgICAgIHRoaXMuaW5zZXJ0aW9uTW9kZSA9IFRFWFRfTU9ERTtcbiAgICB9XG5cbiAgICBzd2l0Y2hUb1BsYWludGV4dFBhcnNpbmcoKSB7XG4gICAgICAgIHRoaXMuaW5zZXJ0aW9uTW9kZSA9IFRFWFRfTU9ERTtcbiAgICAgICAgdGhpcy5vcmlnaW5hbEluc2VydGlvbk1vZGUgPSBJTl9CT0RZX01PREU7XG4gICAgICAgIHRoaXMudG9rZW5pemVyLnN0YXRlID0gVG9rZW5pemVyLk1PREUuUExBSU5URVhUO1xuICAgIH1cblxuICAgIC8vRnJhZ21lbnQgcGFyc2luZ1xuICAgIF9nZXRBZGp1c3RlZEN1cnJlbnRFbGVtZW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcGVuRWxlbWVudHMuc3RhY2tUb3AgPT09IDAgJiYgdGhpcy5mcmFnbWVudENvbnRleHRcbiAgICAgICAgICAgID8gdGhpcy5mcmFnbWVudENvbnRleHRcbiAgICAgICAgICAgIDogdGhpcy5vcGVuRWxlbWVudHMuY3VycmVudDtcbiAgICB9XG5cbiAgICBfZmluZEZvcm1JbkZyYWdtZW50Q29udGV4dCgpIHtcbiAgICAgICAgbGV0IG5vZGUgPSB0aGlzLmZyYWdtZW50Q29udGV4dDtcblxuICAgICAgICBkbyB7XG4gICAgICAgICAgICBpZiAodGhpcy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKG5vZGUpID09PSAkLkZPUk0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZvcm1FbGVtZW50ID0gbm9kZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbm9kZSA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0UGFyZW50Tm9kZShub2RlKTtcbiAgICAgICAgfSB3aGlsZSAobm9kZSk7XG4gICAgfVxuXG4gICAgX2luaXRUb2tlbml6ZXJGb3JGcmFnbWVudFBhcnNpbmcoKSB7XG4gICAgICAgIGlmICh0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSSh0aGlzLmZyYWdtZW50Q29udGV4dCkgPT09IE5TLkhUTUwpIHtcbiAgICAgICAgICAgIGNvbnN0IHRuID0gdGhpcy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKHRoaXMuZnJhZ21lbnRDb250ZXh0KTtcblxuICAgICAgICAgICAgaWYgKHRuID09PSAkLlRJVExFIHx8IHRuID09PSAkLlRFWFRBUkVBKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbml6ZXIuc3RhdGUgPSBUb2tlbml6ZXIuTU9ERS5SQ0RBVEE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgICAgIHRuID09PSAkLlNUWUxFIHx8XG4gICAgICAgICAgICAgICAgdG4gPT09ICQuWE1QIHx8XG4gICAgICAgICAgICAgICAgdG4gPT09ICQuSUZSQU1FIHx8XG4gICAgICAgICAgICAgICAgdG4gPT09ICQuTk9FTUJFRCB8fFxuICAgICAgICAgICAgICAgIHRuID09PSAkLk5PRlJBTUVTIHx8XG4gICAgICAgICAgICAgICAgdG4gPT09ICQuTk9TQ1JJUFRcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHRoaXMudG9rZW5pemVyLnN0YXRlID0gVG9rZW5pemVyLk1PREUuUkFXVEVYVDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuU0NSSVBUKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbml6ZXIuc3RhdGUgPSBUb2tlbml6ZXIuTU9ERS5TQ1JJUFRfREFUQTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuUExBSU5URVhUKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbml6ZXIuc3RhdGUgPSBUb2tlbml6ZXIuTU9ERS5QTEFJTlRFWFQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvL1RyZWUgbXV0YXRpb25cbiAgICBfc2V0RG9jdW1lbnRUeXBlKHRva2VuKSB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSB0b2tlbi5uYW1lIHx8ICcnO1xuICAgICAgICBjb25zdCBwdWJsaWNJZCA9IHRva2VuLnB1YmxpY0lkIHx8ICcnO1xuICAgICAgICBjb25zdCBzeXN0ZW1JZCA9IHRva2VuLnN5c3RlbUlkIHx8ICcnO1xuXG4gICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuc2V0RG9jdW1lbnRUeXBlKHRoaXMuZG9jdW1lbnQsIG5hbWUsIHB1YmxpY0lkLCBzeXN0ZW1JZCk7XG4gICAgfVxuXG4gICAgX2F0dGFjaEVsZW1lbnRUb1RyZWUoZWxlbWVudCkge1xuICAgICAgICBpZiAodGhpcy5fc2hvdWxkRm9zdGVyUGFyZW50T25JbnNlcnRpb24oKSkge1xuICAgICAgICAgICAgdGhpcy5fZm9zdGVyUGFyZW50RWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMub3BlbkVsZW1lbnRzLmN1cnJlbnRUbXBsQ29udGVudCB8fCB0aGlzLm9wZW5FbGVtZW50cy5jdXJyZW50O1xuXG4gICAgICAgICAgICB0aGlzLnRyZWVBZGFwdGVyLmFwcGVuZENoaWxkKHBhcmVudCwgZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBfYXBwZW5kRWxlbWVudCh0b2tlbiwgbmFtZXNwYWNlVVJJKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLnRyZWVBZGFwdGVyLmNyZWF0ZUVsZW1lbnQodG9rZW4udGFnTmFtZSwgbmFtZXNwYWNlVVJJLCB0b2tlbi5hdHRycyk7XG5cbiAgICAgICAgdGhpcy5fYXR0YWNoRWxlbWVudFRvVHJlZShlbGVtZW50KTtcbiAgICB9XG5cbiAgICBfaW5zZXJ0RWxlbWVudCh0b2tlbiwgbmFtZXNwYWNlVVJJKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLnRyZWVBZGFwdGVyLmNyZWF0ZUVsZW1lbnQodG9rZW4udGFnTmFtZSwgbmFtZXNwYWNlVVJJLCB0b2tlbi5hdHRycyk7XG5cbiAgICAgICAgdGhpcy5fYXR0YWNoRWxlbWVudFRvVHJlZShlbGVtZW50KTtcbiAgICAgICAgdGhpcy5vcGVuRWxlbWVudHMucHVzaChlbGVtZW50KTtcbiAgICB9XG5cbiAgICBfaW5zZXJ0RmFrZUVsZW1lbnQodGFnTmFtZSkge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy50cmVlQWRhcHRlci5jcmVhdGVFbGVtZW50KHRhZ05hbWUsIE5TLkhUTUwsIFtdKTtcblxuICAgICAgICB0aGlzLl9hdHRhY2hFbGVtZW50VG9UcmVlKGVsZW1lbnQpO1xuICAgICAgICB0aGlzLm9wZW5FbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuICAgIH1cblxuICAgIF9pbnNlcnRUZW1wbGF0ZSh0b2tlbikge1xuICAgICAgICBjb25zdCB0bXBsID0gdGhpcy50cmVlQWRhcHRlci5jcmVhdGVFbGVtZW50KHRva2VuLnRhZ05hbWUsIE5TLkhUTUwsIHRva2VuLmF0dHJzKTtcbiAgICAgICAgY29uc3QgY29udGVudCA9IHRoaXMudHJlZUFkYXB0ZXIuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuc2V0VGVtcGxhdGVDb250ZW50KHRtcGwsIGNvbnRlbnQpO1xuICAgICAgICB0aGlzLl9hdHRhY2hFbGVtZW50VG9UcmVlKHRtcGwpO1xuICAgICAgICB0aGlzLm9wZW5FbGVtZW50cy5wdXNoKHRtcGwpO1xuICAgIH1cblxuICAgIF9pbnNlcnRGYWtlUm9vdEVsZW1lbnQoKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLnRyZWVBZGFwdGVyLmNyZWF0ZUVsZW1lbnQoJC5IVE1MLCBOUy5IVE1MLCBbXSk7XG5cbiAgICAgICAgdGhpcy50cmVlQWRhcHRlci5hcHBlbmRDaGlsZCh0aGlzLm9wZW5FbGVtZW50cy5jdXJyZW50LCBlbGVtZW50KTtcbiAgICAgICAgdGhpcy5vcGVuRWxlbWVudHMucHVzaChlbGVtZW50KTtcbiAgICB9XG5cbiAgICBfYXBwZW5kQ29tbWVudE5vZGUodG9rZW4sIHBhcmVudCkge1xuICAgICAgICBjb25zdCBjb21tZW50Tm9kZSA9IHRoaXMudHJlZUFkYXB0ZXIuY3JlYXRlQ29tbWVudE5vZGUodG9rZW4uZGF0YSk7XG5cbiAgICAgICAgdGhpcy50cmVlQWRhcHRlci5hcHBlbmRDaGlsZChwYXJlbnQsIGNvbW1lbnROb2RlKTtcbiAgICB9XG5cbiAgICBfaW5zZXJ0Q2hhcmFjdGVycyh0b2tlbikge1xuICAgICAgICBpZiAodGhpcy5fc2hvdWxkRm9zdGVyUGFyZW50T25JbnNlcnRpb24oKSkge1xuICAgICAgICAgICAgdGhpcy5fZm9zdGVyUGFyZW50VGV4dCh0b2tlbi5jaGFycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBwYXJlbnQgPSB0aGlzLm9wZW5FbGVtZW50cy5jdXJyZW50VG1wbENvbnRlbnQgfHwgdGhpcy5vcGVuRWxlbWVudHMuY3VycmVudDtcblxuICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5pbnNlcnRUZXh0KHBhcmVudCwgdG9rZW4uY2hhcnMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgX2Fkb3B0Tm9kZXMoZG9ub3IsIHJlY2lwaWVudCkge1xuICAgICAgICBmb3IgKGxldCBjaGlsZCA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0Rmlyc3RDaGlsZChkb25vcik7IGNoaWxkOyBjaGlsZCA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0Rmlyc3RDaGlsZChkb25vcikpIHtcbiAgICAgICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuZGV0YWNoTm9kZShjaGlsZCk7XG4gICAgICAgICAgICB0aGlzLnRyZWVBZGFwdGVyLmFwcGVuZENoaWxkKHJlY2lwaWVudCwgY2hpbGQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9Ub2tlbiBwcm9jZXNzaW5nXG4gICAgX3Nob3VsZFByb2Nlc3NUb2tlbkluRm9yZWlnbkNvbnRlbnQodG9rZW4pIHtcbiAgICAgICAgY29uc3QgY3VycmVudCA9IHRoaXMuX2dldEFkanVzdGVkQ3VycmVudEVsZW1lbnQoKTtcblxuICAgICAgICBpZiAoIWN1cnJlbnQgfHwgY3VycmVudCA9PT0gdGhpcy5kb2N1bWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbnMgPSB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSShjdXJyZW50KTtcblxuICAgICAgICBpZiAobnMgPT09IE5TLkhUTUwpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZShjdXJyZW50KSA9PT0gJC5BTk5PVEFUSU9OX1hNTCAmJlxuICAgICAgICAgICAgbnMgPT09IE5TLk1BVEhNTCAmJlxuICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW5pemVyLlNUQVJUX1RBR19UT0tFTiAmJlxuICAgICAgICAgICAgdG9rZW4udGFnTmFtZSA9PT0gJC5TVkdcbiAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBpc0NoYXJhY3RlclRva2VuID1cbiAgICAgICAgICAgIHRva2VuLnR5cGUgPT09IFRva2VuaXplci5DSEFSQUNURVJfVE9LRU4gfHxcbiAgICAgICAgICAgIHRva2VuLnR5cGUgPT09IFRva2VuaXplci5OVUxMX0NIQVJBQ1RFUl9UT0tFTiB8fFxuICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW5pemVyLldISVRFU1BBQ0VfQ0hBUkFDVEVSX1RPS0VOO1xuXG4gICAgICAgIGNvbnN0IGlzTWF0aE1MVGV4dFN0YXJ0VGFnID1cbiAgICAgICAgICAgIHRva2VuLnR5cGUgPT09IFRva2VuaXplci5TVEFSVF9UQUdfVE9LRU4gJiYgdG9rZW4udGFnTmFtZSAhPT0gJC5NR0xZUEggJiYgdG9rZW4udGFnTmFtZSAhPT0gJC5NQUxJR05NQVJLO1xuXG4gICAgICAgIGlmICgoaXNNYXRoTUxUZXh0U3RhcnRUYWcgfHwgaXNDaGFyYWN0ZXJUb2tlbikgJiYgdGhpcy5faXNJbnRlZ3JhdGlvblBvaW50KGN1cnJlbnQsIE5TLk1BVEhNTCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgICh0b2tlbi50eXBlID09PSBUb2tlbml6ZXIuU1RBUlRfVEFHX1RPS0VOIHx8IGlzQ2hhcmFjdGVyVG9rZW4pICYmXG4gICAgICAgICAgICB0aGlzLl9pc0ludGVncmF0aW9uUG9pbnQoY3VycmVudCwgTlMuSFRNTClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdG9rZW4udHlwZSAhPT0gVG9rZW5pemVyLkVPRl9UT0tFTjtcbiAgICB9XG5cbiAgICBfcHJvY2Vzc1Rva2VuKHRva2VuKSB7XG4gICAgICAgIFRPS0VOX0hBTkRMRVJTW3RoaXMuaW5zZXJ0aW9uTW9kZV1bdG9rZW4udHlwZV0odGhpcywgdG9rZW4pO1xuICAgIH1cblxuICAgIF9wcm9jZXNzVG9rZW5JbkJvZHlNb2RlKHRva2VuKSB7XG4gICAgICAgIFRPS0VOX0hBTkRMRVJTW0lOX0JPRFlfTU9ERV1bdG9rZW4udHlwZV0odGhpcywgdG9rZW4pO1xuICAgIH1cblxuICAgIF9wcm9jZXNzVG9rZW5JbkZvcmVpZ25Db250ZW50KHRva2VuKSB7XG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOKSB7XG4gICAgICAgICAgICBjaGFyYWN0ZXJJbkZvcmVpZ25Db250ZW50KHRoaXMsIHRva2VuKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi50eXBlID09PSBUb2tlbml6ZXIuTlVMTF9DSEFSQUNURVJfVE9LRU4pIHtcbiAgICAgICAgICAgIG51bGxDaGFyYWN0ZXJJbkZvcmVpZ25Db250ZW50KHRoaXMsIHRva2VuKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi50eXBlID09PSBUb2tlbml6ZXIuV0hJVEVTUEFDRV9DSEFSQUNURVJfVE9LRU4pIHtcbiAgICAgICAgICAgIGluc2VydENoYXJhY3RlcnModGhpcywgdG9rZW4pO1xuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuaXplci5DT01NRU5UX1RPS0VOKSB7XG4gICAgICAgICAgICBhcHBlbmRDb21tZW50KHRoaXMsIHRva2VuKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi50eXBlID09PSBUb2tlbml6ZXIuU1RBUlRfVEFHX1RPS0VOKSB7XG4gICAgICAgICAgICBzdGFydFRhZ0luRm9yZWlnbkNvbnRlbnQodGhpcywgdG9rZW4pO1xuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuaXplci5FTkRfVEFHX1RPS0VOKSB7XG4gICAgICAgICAgICBlbmRUYWdJbkZvcmVpZ25Db250ZW50KHRoaXMsIHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9wcm9jZXNzSW5wdXRUb2tlbih0b2tlbikge1xuICAgICAgICBpZiAodGhpcy5fc2hvdWxkUHJvY2Vzc1Rva2VuSW5Gb3JlaWduQ29udGVudCh0b2tlbikpIHtcbiAgICAgICAgICAgIHRoaXMuX3Byb2Nlc3NUb2tlbkluRm9yZWlnbkNvbnRlbnQodG9rZW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbml6ZXIuU1RBUlRfVEFHX1RPS0VOICYmIHRva2VuLnNlbGZDbG9zaW5nICYmICF0b2tlbi5hY2tTZWxmQ2xvc2luZykge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5ub25Wb2lkSHRtbEVsZW1lbnRTdGFydFRhZ1dpdGhUcmFpbGluZ1NvbGlkdXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9JbnRlZ3JhdGlvbiBwb2ludHNcbiAgICBfaXNJbnRlZ3JhdGlvblBvaW50KGVsZW1lbnQsIGZvcmVpZ25OUykge1xuICAgICAgICBjb25zdCB0biA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZShlbGVtZW50KTtcbiAgICAgICAgY29uc3QgbnMgPSB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSShlbGVtZW50KTtcbiAgICAgICAgY29uc3QgYXR0cnMgPSB0aGlzLnRyZWVBZGFwdGVyLmdldEF0dHJMaXN0KGVsZW1lbnQpO1xuXG4gICAgICAgIHJldHVybiBmb3JlaWduQ29udGVudC5pc0ludGVncmF0aW9uUG9pbnQodG4sIG5zLCBhdHRycywgZm9yZWlnbk5TKTtcbiAgICB9XG5cbiAgICAvL0FjdGl2ZSBmb3JtYXR0aW5nIGVsZW1lbnRzIHJlY29uc3RydWN0aW9uXG4gICAgX3JlY29uc3RydWN0QWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzKCkge1xuICAgICAgICBjb25zdCBsaXN0TGVuZ3RoID0gdGhpcy5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMubGVuZ3RoO1xuXG4gICAgICAgIGlmIChsaXN0TGVuZ3RoKSB7XG4gICAgICAgICAgICBsZXQgdW5vcGVuSWR4ID0gbGlzdExlbmd0aDtcbiAgICAgICAgICAgIGxldCBlbnRyeSA9IG51bGw7XG5cbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICB1bm9wZW5JZHgtLTtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IHRoaXMuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLmVudHJpZXNbdW5vcGVuSWR4XTtcblxuICAgICAgICAgICAgICAgIGlmIChlbnRyeS50eXBlID09PSBGb3JtYXR0aW5nRWxlbWVudExpc3QuTUFSS0VSX0VOVFJZIHx8IHRoaXMub3BlbkVsZW1lbnRzLmNvbnRhaW5zKGVudHJ5LmVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHVub3BlbklkeCsrO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IHdoaWxlICh1bm9wZW5JZHggPiAwKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHVub3BlbklkeDsgaSA8IGxpc3RMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGVudHJ5ID0gdGhpcy5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuZW50cmllc1tpXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9pbnNlcnRFbGVtZW50KGVudHJ5LnRva2VuLCB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSShlbnRyeS5lbGVtZW50KSk7XG4gICAgICAgICAgICAgICAgZW50cnkuZWxlbWVudCA9IHRoaXMub3BlbkVsZW1lbnRzLmN1cnJlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvL0Nsb3NlIGVsZW1lbnRzXG4gICAgX2Nsb3NlVGFibGVDZWxsKCkge1xuICAgICAgICB0aGlzLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzKCk7XG4gICAgICAgIHRoaXMub3BlbkVsZW1lbnRzLnBvcFVudGlsVGFibGVDZWxsUG9wcGVkKCk7XG4gICAgICAgIHRoaXMuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLmNsZWFyVG9MYXN0TWFya2VyKCk7XG4gICAgICAgIHRoaXMuaW5zZXJ0aW9uTW9kZSA9IElOX1JPV19NT0RFO1xuICAgIH1cblxuICAgIF9jbG9zZVBFbGVtZW50KCkge1xuICAgICAgICB0aGlzLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzV2l0aEV4Y2x1c2lvbigkLlApO1xuICAgICAgICB0aGlzLm9wZW5FbGVtZW50cy5wb3BVbnRpbFRhZ05hbWVQb3BwZWQoJC5QKTtcbiAgICB9XG5cbiAgICAvL0luc2VydGlvbiBtb2Rlc1xuICAgIF9yZXNldEluc2VydGlvbk1vZGUoKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLm9wZW5FbGVtZW50cy5zdGFja1RvcCwgbGFzdCA9IGZhbHNlOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgbGV0IGVsZW1lbnQgPSB0aGlzLm9wZW5FbGVtZW50cy5pdGVtc1tpXTtcblxuICAgICAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICAgICAgICBsYXN0ID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZyYWdtZW50Q29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5mcmFnbWVudENvbnRleHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB0biA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZShlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IG5ld0luc2VydGlvbk1vZGUgPSBJTlNFUlRJT05fTU9ERV9SRVNFVF9NQVBbdG5dO1xuXG4gICAgICAgICAgICBpZiAobmV3SW5zZXJ0aW9uTW9kZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5zZXJ0aW9uTW9kZSA9IG5ld0luc2VydGlvbk1vZGU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFsYXN0ICYmICh0biA9PT0gJC5URCB8fCB0biA9PT0gJC5USCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluc2VydGlvbk1vZGUgPSBJTl9DRUxMX01PREU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFsYXN0ICYmIHRuID09PSAkLkhFQUQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluc2VydGlvbk1vZGUgPSBJTl9IRUFEX01PREU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLlNFTEVDVCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Jlc2V0SW5zZXJ0aW9uTW9kZUZvclNlbGVjdChpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuVEVNUExBVEUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluc2VydGlvbk1vZGUgPSB0aGlzLmN1cnJlbnRUbXBsSW5zZXJ0aW9uTW9kZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuSFRNTCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5zZXJ0aW9uTW9kZSA9IHRoaXMuaGVhZEVsZW1lbnQgPyBBRlRFUl9IRUFEX01PREUgOiBCRUZPUkVfSEVBRF9NT0RFO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbnNlcnRpb25Nb2RlID0gSU5fQk9EWV9NT0RFO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgX3Jlc2V0SW5zZXJ0aW9uTW9kZUZvclNlbGVjdChzZWxlY3RJZHgpIHtcbiAgICAgICAgaWYgKHNlbGVjdElkeCA+IDApIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBzZWxlY3RJZHggLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYW5jZXN0b3IgPSB0aGlzLm9wZW5FbGVtZW50cy5pdGVtc1tpXTtcbiAgICAgICAgICAgICAgICBjb25zdCB0biA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZShhbmNlc3Rvcik7XG5cbiAgICAgICAgICAgICAgICBpZiAodG4gPT09ICQuVEVNUExBVEUpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5UQUJMRSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydGlvbk1vZGUgPSBJTl9TRUxFQ1RfSU5fVEFCTEVfTU9ERTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaW5zZXJ0aW9uTW9kZSA9IElOX1NFTEVDVF9NT0RFO1xuICAgIH1cblxuICAgIF9wdXNoVG1wbEluc2VydGlvbk1vZGUobW9kZSkge1xuICAgICAgICB0aGlzLnRtcGxJbnNlcnRpb25Nb2RlU3RhY2sucHVzaChtb2RlKTtcbiAgICAgICAgdGhpcy50bXBsSW5zZXJ0aW9uTW9kZVN0YWNrVG9wKys7XG4gICAgICAgIHRoaXMuY3VycmVudFRtcGxJbnNlcnRpb25Nb2RlID0gbW9kZTtcbiAgICB9XG5cbiAgICBfcG9wVG1wbEluc2VydGlvbk1vZGUoKSB7XG4gICAgICAgIHRoaXMudG1wbEluc2VydGlvbk1vZGVTdGFjay5wb3AoKTtcbiAgICAgICAgdGhpcy50bXBsSW5zZXJ0aW9uTW9kZVN0YWNrVG9wLS07XG4gICAgICAgIHRoaXMuY3VycmVudFRtcGxJbnNlcnRpb25Nb2RlID0gdGhpcy50bXBsSW5zZXJ0aW9uTW9kZVN0YWNrW3RoaXMudG1wbEluc2VydGlvbk1vZGVTdGFja1RvcF07XG4gICAgfVxuXG4gICAgLy9Gb3N0ZXIgcGFyZW50aW5nXG4gICAgX2lzRWxlbWVudENhdXNlc0Zvc3RlclBhcmVudGluZyhlbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IHRuID0gdGhpcy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKGVsZW1lbnQpO1xuXG4gICAgICAgIHJldHVybiB0biA9PT0gJC5UQUJMRSB8fCB0biA9PT0gJC5UQk9EWSB8fCB0biA9PT0gJC5URk9PVCB8fCB0biA9PT0gJC5USEVBRCB8fCB0biA9PT0gJC5UUjtcbiAgICB9XG5cbiAgICBfc2hvdWxkRm9zdGVyUGFyZW50T25JbnNlcnRpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZvc3RlclBhcmVudGluZ0VuYWJsZWQgJiYgdGhpcy5faXNFbGVtZW50Q2F1c2VzRm9zdGVyUGFyZW50aW5nKHRoaXMub3BlbkVsZW1lbnRzLmN1cnJlbnQpO1xuICAgIH1cblxuICAgIF9maW5kRm9zdGVyUGFyZW50aW5nTG9jYXRpb24oKSB7XG4gICAgICAgIGNvbnN0IGxvY2F0aW9uID0ge1xuICAgICAgICAgICAgcGFyZW50OiBudWxsLFxuICAgICAgICAgICAgYmVmb3JlRWxlbWVudDogbnVsbFxuICAgICAgICB9O1xuXG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLm9wZW5FbGVtZW50cy5zdGFja1RvcDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbnN0IG9wZW5FbGVtZW50ID0gdGhpcy5vcGVuRWxlbWVudHMuaXRlbXNbaV07XG4gICAgICAgICAgICBjb25zdCB0biA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZShvcGVuRWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBucyA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKG9wZW5FbGVtZW50KTtcblxuICAgICAgICAgICAgaWYgKHRuID09PSAkLlRFTVBMQVRFICYmIG5zID09PSBOUy5IVE1MKSB7XG4gICAgICAgICAgICAgICAgbG9jYXRpb24ucGFyZW50ID0gdGhpcy50cmVlQWRhcHRlci5nZXRUZW1wbGF0ZUNvbnRlbnQob3BlbkVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5UQUJMRSkge1xuICAgICAgICAgICAgICAgIGxvY2F0aW9uLnBhcmVudCA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0UGFyZW50Tm9kZShvcGVuRWxlbWVudCk7XG5cbiAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24ucGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmJlZm9yZUVsZW1lbnQgPSBvcGVuRWxlbWVudDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5wYXJlbnQgPSB0aGlzLm9wZW5FbGVtZW50cy5pdGVtc1tpIC0gMV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWxvY2F0aW9uLnBhcmVudCkge1xuICAgICAgICAgICAgbG9jYXRpb24ucGFyZW50ID0gdGhpcy5vcGVuRWxlbWVudHMuaXRlbXNbMF07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbG9jYXRpb247XG4gICAgfVxuXG4gICAgX2Zvc3RlclBhcmVudEVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMuX2ZpbmRGb3N0ZXJQYXJlbnRpbmdMb2NhdGlvbigpO1xuXG4gICAgICAgIGlmIChsb2NhdGlvbi5iZWZvcmVFbGVtZW50KSB7XG4gICAgICAgICAgICB0aGlzLnRyZWVBZGFwdGVyLmluc2VydEJlZm9yZShsb2NhdGlvbi5wYXJlbnQsIGVsZW1lbnQsIGxvY2F0aW9uLmJlZm9yZUVsZW1lbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5hcHBlbmRDaGlsZChsb2NhdGlvbi5wYXJlbnQsIGVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgX2Zvc3RlclBhcmVudFRleHQoY2hhcnMpIHtcbiAgICAgICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLl9maW5kRm9zdGVyUGFyZW50aW5nTG9jYXRpb24oKTtcblxuICAgICAgICBpZiAobG9jYXRpb24uYmVmb3JlRWxlbWVudCkge1xuICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5pbnNlcnRUZXh0QmVmb3JlKGxvY2F0aW9uLnBhcmVudCwgY2hhcnMsIGxvY2F0aW9uLmJlZm9yZUVsZW1lbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5pbnNlcnRUZXh0KGxvY2F0aW9uLnBhcmVudCwgY2hhcnMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9TcGVjaWFsIGVsZW1lbnRzXG4gICAgX2lzU3BlY2lhbEVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgICBjb25zdCB0biA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZShlbGVtZW50KTtcbiAgICAgICAgY29uc3QgbnMgPSB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSShlbGVtZW50KTtcblxuICAgICAgICByZXR1cm4gSFRNTC5TUEVDSUFMX0VMRU1FTlRTW25zXVt0bl07XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnNlcjtcblxuLy9BZG9wdGlvbiBhZ2VuY3kgYWxnb3JpdGhtXG4vLyhzZWU6IGh0dHA6Ly93d3cud2hhdHdnLm9yZy9zcGVjcy93ZWItYXBwcy9jdXJyZW50LXdvcmsvbXVsdGlwYWdlL3RyZWUtY29uc3RydWN0aW9uLmh0bWwjYWRvcHRpb25BZ2VuY3kpXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vL1N0ZXBzIDUtOCBvZiB0aGUgYWxnb3JpdGhtXG5mdW5jdGlvbiBhYU9idGFpbkZvcm1hdHRpbmdFbGVtZW50RW50cnkocCwgdG9rZW4pIHtcbiAgICBsZXQgZm9ybWF0dGluZ0VsZW1lbnRFbnRyeSA9IHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLmdldEVsZW1lbnRFbnRyeUluU2NvcGVXaXRoVGFnTmFtZSh0b2tlbi50YWdOYW1lKTtcblxuICAgIGlmIChmb3JtYXR0aW5nRWxlbWVudEVudHJ5KSB7XG4gICAgICAgIGlmICghcC5vcGVuRWxlbWVudHMuY29udGFpbnMoZm9ybWF0dGluZ0VsZW1lbnRFbnRyeS5lbGVtZW50KSkge1xuICAgICAgICAgICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMucmVtb3ZlRW50cnkoZm9ybWF0dGluZ0VsZW1lbnRFbnRyeSk7XG4gICAgICAgICAgICBmb3JtYXR0aW5nRWxlbWVudEVudHJ5ID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIGlmICghcC5vcGVuRWxlbWVudHMuaGFzSW5TY29wZSh0b2tlbi50YWdOYW1lKSkge1xuICAgICAgICAgICAgZm9ybWF0dGluZ0VsZW1lbnRFbnRyeSA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBnZW5lcmljRW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZm9ybWF0dGluZ0VsZW1lbnRFbnRyeTtcbn1cblxuLy9TdGVwcyA5IGFuZCAxMCBvZiB0aGUgYWxnb3JpdGhtXG5mdW5jdGlvbiBhYU9idGFpbkZ1cnRoZXN0QmxvY2socCwgZm9ybWF0dGluZ0VsZW1lbnRFbnRyeSkge1xuICAgIGxldCBmdXJ0aGVzdEJsb2NrID0gbnVsbDtcblxuICAgIGZvciAobGV0IGkgPSBwLm9wZW5FbGVtZW50cy5zdGFja1RvcDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHAub3BlbkVsZW1lbnRzLml0ZW1zW2ldO1xuXG4gICAgICAgIGlmIChlbGVtZW50ID09PSBmb3JtYXR0aW5nRWxlbWVudEVudHJ5LmVsZW1lbnQpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHAuX2lzU3BlY2lhbEVsZW1lbnQoZWxlbWVudCkpIHtcbiAgICAgICAgICAgIGZ1cnRoZXN0QmxvY2sgPSBlbGVtZW50O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFmdXJ0aGVzdEJsb2NrKSB7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsRWxlbWVudFBvcHBlZChmb3JtYXR0aW5nRWxlbWVudEVudHJ5LmVsZW1lbnQpO1xuICAgICAgICBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5yZW1vdmVFbnRyeShmb3JtYXR0aW5nRWxlbWVudEVudHJ5KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVydGhlc3RCbG9jaztcbn1cblxuLy9TdGVwIDEzIG9mIHRoZSBhbGdvcml0aG1cbmZ1bmN0aW9uIGFhSW5uZXJMb29wKHAsIGZ1cnRoZXN0QmxvY2ssIGZvcm1hdHRpbmdFbGVtZW50KSB7XG4gICAgbGV0IGxhc3RFbGVtZW50ID0gZnVydGhlc3RCbG9jaztcbiAgICBsZXQgbmV4dEVsZW1lbnQgPSBwLm9wZW5FbGVtZW50cy5nZXRDb21tb25BbmNlc3RvcihmdXJ0aGVzdEJsb2NrKTtcblxuICAgIGZvciAobGV0IGkgPSAwLCBlbGVtZW50ID0gbmV4dEVsZW1lbnQ7IGVsZW1lbnQgIT09IGZvcm1hdHRpbmdFbGVtZW50OyBpKyssIGVsZW1lbnQgPSBuZXh0RWxlbWVudCkge1xuICAgICAgICAvL05PVEU6IHN0b3JlIG5leHQgZWxlbWVudCBmb3IgdGhlIG5leHQgbG9vcCBpdGVyYXRpb24gKGl0IG1heSBiZSBkZWxldGVkIGZyb20gdGhlIHN0YWNrIGJ5IHN0ZXAgOS41KVxuICAgICAgICBuZXh0RWxlbWVudCA9IHAub3BlbkVsZW1lbnRzLmdldENvbW1vbkFuY2VzdG9yKGVsZW1lbnQpO1xuXG4gICAgICAgIGNvbnN0IGVsZW1lbnRFbnRyeSA9IHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLmdldEVsZW1lbnRFbnRyeShlbGVtZW50KTtcbiAgICAgICAgY29uc3QgY291bnRlck92ZXJmbG93ID0gZWxlbWVudEVudHJ5ICYmIGkgPj0gQUFfSU5ORVJfTE9PUF9JVEVSO1xuICAgICAgICBjb25zdCBzaG91bGRSZW1vdmVGcm9tT3BlbkVsZW1lbnRzID0gIWVsZW1lbnRFbnRyeSB8fCBjb3VudGVyT3ZlcmZsb3c7XG5cbiAgICAgICAgaWYgKHNob3VsZFJlbW92ZUZyb21PcGVuRWxlbWVudHMpIHtcbiAgICAgICAgICAgIGlmIChjb3VudGVyT3ZlcmZsb3cpIHtcbiAgICAgICAgICAgICAgICBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5yZW1vdmVFbnRyeShlbGVtZW50RW50cnkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5yZW1vdmUoZWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50ID0gYWFSZWNyZWF0ZUVsZW1lbnRGcm9tRW50cnkocCwgZWxlbWVudEVudHJ5KTtcblxuICAgICAgICAgICAgaWYgKGxhc3RFbGVtZW50ID09PSBmdXJ0aGVzdEJsb2NrKSB7XG4gICAgICAgICAgICAgICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuYm9va21hcmsgPSBlbGVtZW50RW50cnk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHAudHJlZUFkYXB0ZXIuZGV0YWNoTm9kZShsYXN0RWxlbWVudCk7XG4gICAgICAgICAgICBwLnRyZWVBZGFwdGVyLmFwcGVuZENoaWxkKGVsZW1lbnQsIGxhc3RFbGVtZW50KTtcbiAgICAgICAgICAgIGxhc3RFbGVtZW50ID0gZWxlbWVudDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsYXN0RWxlbWVudDtcbn1cblxuLy9TdGVwIDEzLjcgb2YgdGhlIGFsZ29yaXRobVxuZnVuY3Rpb24gYWFSZWNyZWF0ZUVsZW1lbnRGcm9tRW50cnkocCwgZWxlbWVudEVudHJ5KSB7XG4gICAgY29uc3QgbnMgPSBwLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSShlbGVtZW50RW50cnkuZWxlbWVudCk7XG4gICAgY29uc3QgbmV3RWxlbWVudCA9IHAudHJlZUFkYXB0ZXIuY3JlYXRlRWxlbWVudChlbGVtZW50RW50cnkudG9rZW4udGFnTmFtZSwgbnMsIGVsZW1lbnRFbnRyeS50b2tlbi5hdHRycyk7XG5cbiAgICBwLm9wZW5FbGVtZW50cy5yZXBsYWNlKGVsZW1lbnRFbnRyeS5lbGVtZW50LCBuZXdFbGVtZW50KTtcbiAgICBlbGVtZW50RW50cnkuZWxlbWVudCA9IG5ld0VsZW1lbnQ7XG5cbiAgICByZXR1cm4gbmV3RWxlbWVudDtcbn1cblxuLy9TdGVwIDE0IG9mIHRoZSBhbGdvcml0aG1cbmZ1bmN0aW9uIGFhSW5zZXJ0TGFzdE5vZGVJbkNvbW1vbkFuY2VzdG9yKHAsIGNvbW1vbkFuY2VzdG9yLCBsYXN0RWxlbWVudCkge1xuICAgIGlmIChwLl9pc0VsZW1lbnRDYXVzZXNGb3N0ZXJQYXJlbnRpbmcoY29tbW9uQW5jZXN0b3IpKSB7XG4gICAgICAgIHAuX2Zvc3RlclBhcmVudEVsZW1lbnQobGFzdEVsZW1lbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHRuID0gcC50cmVlQWRhcHRlci5nZXRUYWdOYW1lKGNvbW1vbkFuY2VzdG9yKTtcbiAgICAgICAgY29uc3QgbnMgPSBwLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSShjb21tb25BbmNlc3Rvcik7XG5cbiAgICAgICAgaWYgKHRuID09PSAkLlRFTVBMQVRFICYmIG5zID09PSBOUy5IVE1MKSB7XG4gICAgICAgICAgICBjb21tb25BbmNlc3RvciA9IHAudHJlZUFkYXB0ZXIuZ2V0VGVtcGxhdGVDb250ZW50KGNvbW1vbkFuY2VzdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHAudHJlZUFkYXB0ZXIuYXBwZW5kQ2hpbGQoY29tbW9uQW5jZXN0b3IsIGxhc3RFbGVtZW50KTtcbiAgICB9XG59XG5cbi8vU3RlcHMgMTUtMTkgb2YgdGhlIGFsZ29yaXRobVxuZnVuY3Rpb24gYWFSZXBsYWNlRm9ybWF0dGluZ0VsZW1lbnQocCwgZnVydGhlc3RCbG9jaywgZm9ybWF0dGluZ0VsZW1lbnRFbnRyeSkge1xuICAgIGNvbnN0IG5zID0gcC50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkoZm9ybWF0dGluZ0VsZW1lbnRFbnRyeS5lbGVtZW50KTtcbiAgICBjb25zdCB0b2tlbiA9IGZvcm1hdHRpbmdFbGVtZW50RW50cnkudG9rZW47XG4gICAgY29uc3QgbmV3RWxlbWVudCA9IHAudHJlZUFkYXB0ZXIuY3JlYXRlRWxlbWVudCh0b2tlbi50YWdOYW1lLCBucywgdG9rZW4uYXR0cnMpO1xuXG4gICAgcC5fYWRvcHROb2RlcyhmdXJ0aGVzdEJsb2NrLCBuZXdFbGVtZW50KTtcbiAgICBwLnRyZWVBZGFwdGVyLmFwcGVuZENoaWxkKGZ1cnRoZXN0QmxvY2ssIG5ld0VsZW1lbnQpO1xuXG4gICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuaW5zZXJ0RWxlbWVudEFmdGVyQm9va21hcmsobmV3RWxlbWVudCwgZm9ybWF0dGluZ0VsZW1lbnRFbnRyeS50b2tlbik7XG4gICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMucmVtb3ZlRW50cnkoZm9ybWF0dGluZ0VsZW1lbnRFbnRyeSk7XG5cbiAgICBwLm9wZW5FbGVtZW50cy5yZW1vdmUoZm9ybWF0dGluZ0VsZW1lbnRFbnRyeS5lbGVtZW50KTtcbiAgICBwLm9wZW5FbGVtZW50cy5pbnNlcnRBZnRlcihmdXJ0aGVzdEJsb2NrLCBuZXdFbGVtZW50KTtcbn1cblxuLy9BbGdvcml0aG0gZW50cnkgcG9pbnRcbmZ1bmN0aW9uIGNhbGxBZG9wdGlvbkFnZW5jeShwLCB0b2tlbikge1xuICAgIGxldCBmb3JtYXR0aW5nRWxlbWVudEVudHJ5O1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBBQV9PVVRFUl9MT09QX0lURVI7IGkrKykge1xuICAgICAgICBmb3JtYXR0aW5nRWxlbWVudEVudHJ5ID0gYWFPYnRhaW5Gb3JtYXR0aW5nRWxlbWVudEVudHJ5KHAsIHRva2VuLCBmb3JtYXR0aW5nRWxlbWVudEVudHJ5KTtcblxuICAgICAgICBpZiAoIWZvcm1hdHRpbmdFbGVtZW50RW50cnkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZnVydGhlc3RCbG9jayA9IGFhT2J0YWluRnVydGhlc3RCbG9jayhwLCBmb3JtYXR0aW5nRWxlbWVudEVudHJ5KTtcblxuICAgICAgICBpZiAoIWZ1cnRoZXN0QmxvY2spIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuYm9va21hcmsgPSBmb3JtYXR0aW5nRWxlbWVudEVudHJ5O1xuXG4gICAgICAgIGNvbnN0IGxhc3RFbGVtZW50ID0gYWFJbm5lckxvb3AocCwgZnVydGhlc3RCbG9jaywgZm9ybWF0dGluZ0VsZW1lbnRFbnRyeS5lbGVtZW50KTtcbiAgICAgICAgY29uc3QgY29tbW9uQW5jZXN0b3IgPSBwLm9wZW5FbGVtZW50cy5nZXRDb21tb25BbmNlc3Rvcihmb3JtYXR0aW5nRWxlbWVudEVudHJ5LmVsZW1lbnQpO1xuXG4gICAgICAgIHAudHJlZUFkYXB0ZXIuZGV0YWNoTm9kZShsYXN0RWxlbWVudCk7XG4gICAgICAgIGFhSW5zZXJ0TGFzdE5vZGVJbkNvbW1vbkFuY2VzdG9yKHAsIGNvbW1vbkFuY2VzdG9yLCBsYXN0RWxlbWVudCk7XG4gICAgICAgIGFhUmVwbGFjZUZvcm1hdHRpbmdFbGVtZW50KHAsIGZ1cnRoZXN0QmxvY2ssIGZvcm1hdHRpbmdFbGVtZW50RW50cnkpO1xuICAgIH1cbn1cblxuLy9HZW5lcmljIHRva2VuIGhhbmRsZXJzXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gaWdub3JlVG9rZW4oKSB7XG4gICAgLy9OT1RFOiBkbyBub3RoaW5nID0pXG59XG5cbmZ1bmN0aW9uIG1pc3BsYWNlZERvY3R5cGUocCkge1xuICAgIHAuX2VycihFUlIubWlzcGxhY2VkRG9jdHlwZSk7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZENvbW1lbnQocCwgdG9rZW4pIHtcbiAgICBwLl9hcHBlbmRDb21tZW50Tm9kZSh0b2tlbiwgcC5vcGVuRWxlbWVudHMuY3VycmVudFRtcGxDb250ZW50IHx8IHAub3BlbkVsZW1lbnRzLmN1cnJlbnQpO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRDb21tZW50VG9Sb290SHRtbEVsZW1lbnQocCwgdG9rZW4pIHtcbiAgICBwLl9hcHBlbmRDb21tZW50Tm9kZSh0b2tlbiwgcC5vcGVuRWxlbWVudHMuaXRlbXNbMF0pO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRDb21tZW50VG9Eb2N1bWVudChwLCB0b2tlbikge1xuICAgIHAuX2FwcGVuZENvbW1lbnROb2RlKHRva2VuLCBwLmRvY3VtZW50KTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0Q2hhcmFjdGVycyhwLCB0b2tlbikge1xuICAgIHAuX2luc2VydENoYXJhY3RlcnModG9rZW4pO1xufVxuXG5mdW5jdGlvbiBzdG9wUGFyc2luZyhwKSB7XG4gICAgcC5zdG9wcGVkID0gdHJ1ZTtcbn1cblxuLy8gVGhlIFwiaW5pdGlhbFwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gZG9jdHlwZUluSW5pdGlhbE1vZGUocCwgdG9rZW4pIHtcbiAgICBwLl9zZXREb2N1bWVudFR5cGUodG9rZW4pO1xuXG4gICAgY29uc3QgbW9kZSA9IHRva2VuLmZvcmNlUXVpcmtzID8gSFRNTC5ET0NVTUVOVF9NT0RFLlFVSVJLUyA6IGRvY3R5cGUuZ2V0RG9jdW1lbnRNb2RlKHRva2VuKTtcblxuICAgIGlmICghZG9jdHlwZS5pc0NvbmZvcm1pbmcodG9rZW4pKSB7XG4gICAgICAgIHAuX2VycihFUlIubm9uQ29uZm9ybWluZ0RvY3R5cGUpO1xuICAgIH1cblxuICAgIHAudHJlZUFkYXB0ZXIuc2V0RG9jdW1lbnRNb2RlKHAuZG9jdW1lbnQsIG1vZGUpO1xuXG4gICAgcC5pbnNlcnRpb25Nb2RlID0gQkVGT1JFX0hUTUxfTU9ERTtcbn1cblxuZnVuY3Rpb24gdG9rZW5JbkluaXRpYWxNb2RlKHAsIHRva2VuKSB7XG4gICAgcC5fZXJyKEVSUi5taXNzaW5nRG9jdHlwZSwgeyBiZWZvcmVUb2tlbjogdHJ1ZSB9KTtcbiAgICBwLnRyZWVBZGFwdGVyLnNldERvY3VtZW50TW9kZShwLmRvY3VtZW50LCBIVE1MLkRPQ1VNRU5UX01PREUuUVVJUktTKTtcbiAgICBwLmluc2VydGlvbk1vZGUgPSBCRUZPUkVfSFRNTF9NT0RFO1xuICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG59XG5cbi8vIFRoZSBcImJlZm9yZSBodG1sXCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzdGFydFRhZ0JlZm9yZUh0bWwocCwgdG9rZW4pIHtcbiAgICBpZiAodG9rZW4udGFnTmFtZSA9PT0gJC5IVE1MKSB7XG4gICAgICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIE5TLkhUTUwpO1xuICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBCRUZPUkVfSEVBRF9NT0RFO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRva2VuQmVmb3JlSHRtbChwLCB0b2tlbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBlbmRUYWdCZWZvcmVIdG1sKHAsIHRva2VuKSB7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdOYW1lO1xuXG4gICAgaWYgKHRuID09PSAkLkhUTUwgfHwgdG4gPT09ICQuSEVBRCB8fCB0biA9PT0gJC5CT0RZIHx8IHRuID09PSAkLkJSKSB7XG4gICAgICAgIHRva2VuQmVmb3JlSHRtbChwLCB0b2tlbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0b2tlbkJlZm9yZUh0bWwocCwgdG9rZW4pIHtcbiAgICBwLl9pbnNlcnRGYWtlUm9vdEVsZW1lbnQoKTtcbiAgICBwLmluc2VydGlvbk1vZGUgPSBCRUZPUkVfSEVBRF9NT0RFO1xuICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG59XG5cbi8vIFRoZSBcImJlZm9yZSBoZWFkXCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzdGFydFRhZ0JlZm9yZUhlYWQocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ05hbWU7XG5cbiAgICBpZiAodG4gPT09ICQuSFRNTCkge1xuICAgICAgICBzdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5IRUFEKSB7XG4gICAgICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIE5TLkhUTUwpO1xuICAgICAgICBwLmhlYWRFbGVtZW50ID0gcC5vcGVuRWxlbWVudHMuY3VycmVudDtcbiAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fSEVBRF9NT0RFO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRva2VuQmVmb3JlSGVhZChwLCB0b2tlbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBlbmRUYWdCZWZvcmVIZWFkKHAsIHRva2VuKSB7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdOYW1lO1xuXG4gICAgaWYgKHRuID09PSAkLkhFQUQgfHwgdG4gPT09ICQuQk9EWSB8fCB0biA9PT0gJC5IVE1MIHx8IHRuID09PSAkLkJSKSB7XG4gICAgICAgIHRva2VuQmVmb3JlSGVhZChwLCB0b2tlbik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcC5fZXJyKEVSUi5lbmRUYWdXaXRob3V0TWF0Y2hpbmdPcGVuRWxlbWVudCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0b2tlbkJlZm9yZUhlYWQocCwgdG9rZW4pIHtcbiAgICBwLl9pbnNlcnRGYWtlRWxlbWVudCgkLkhFQUQpO1xuICAgIHAuaGVhZEVsZW1lbnQgPSBwLm9wZW5FbGVtZW50cy5jdXJyZW50O1xuICAgIHAuaW5zZXJ0aW9uTW9kZSA9IElOX0hFQURfTU9ERTtcbiAgICBwLl9wcm9jZXNzVG9rZW4odG9rZW4pO1xufVxuXG4vLyBUaGUgXCJpbiBoZWFkXCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzdGFydFRhZ0luSGVhZChwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIGlmICh0biA9PT0gJC5IVE1MKSB7XG4gICAgICAgIHN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLkJBU0UgfHwgdG4gPT09ICQuQkFTRUZPTlQgfHwgdG4gPT09ICQuQkdTT1VORCB8fCB0biA9PT0gJC5MSU5LIHx8IHRuID09PSAkLk1FVEEpIHtcbiAgICAgICAgcC5fYXBwZW5kRWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgICAgIHRva2VuLmFja1NlbGZDbG9zaW5nID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLlRJVExFKSB7XG4gICAgICAgIHAuX3N3aXRjaFRvVGV4dFBhcnNpbmcodG9rZW4sIFRva2VuaXplci5NT0RFLlJDREFUQSk7XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5OT1NDUklQVCkge1xuICAgICAgICBpZiAocC5vcHRpb25zLnNjcmlwdGluZ0VuYWJsZWQpIHtcbiAgICAgICAgICAgIHAuX3N3aXRjaFRvVGV4dFBhcnNpbmcodG9rZW4sIFRva2VuaXplci5NT0RFLlJBV1RFWFQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJTl9IRUFEX05PX1NDUklQVF9NT0RFO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5OT0ZSQU1FUyB8fCB0biA9PT0gJC5TVFlMRSkge1xuICAgICAgICBwLl9zd2l0Y2hUb1RleHRQYXJzaW5nKHRva2VuLCBUb2tlbml6ZXIuTU9ERS5SQVdURVhUKTtcbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLlNDUklQVCkge1xuICAgICAgICBwLl9zd2l0Y2hUb1RleHRQYXJzaW5nKHRva2VuLCBUb2tlbml6ZXIuTU9ERS5TQ1JJUFRfREFUQSk7XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5URU1QTEFURSkge1xuICAgICAgICBwLl9pbnNlcnRUZW1wbGF0ZSh0b2tlbiwgTlMuSFRNTCk7XG4gICAgICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLmluc2VydE1hcmtlcigpO1xuICAgICAgICBwLmZyYW1lc2V0T2sgPSBmYWxzZTtcbiAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fVEVNUExBVEVfTU9ERTtcbiAgICAgICAgcC5fcHVzaFRtcGxJbnNlcnRpb25Nb2RlKElOX1RFTVBMQVRFX01PREUpO1xuICAgIH0gZWxzZSBpZiAodG4gPT09ICQuSEVBRCkge1xuICAgICAgICBwLl9lcnIoRVJSLm1pc3BsYWNlZFN0YXJ0VGFnRm9ySGVhZEVsZW1lbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRva2VuSW5IZWFkKHAsIHRva2VuKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGVuZFRhZ0luSGVhZChwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIGlmICh0biA9PT0gJC5IRUFEKSB7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBBRlRFUl9IRUFEX01PREU7XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5CT0RZIHx8IHRuID09PSAkLkJSIHx8IHRuID09PSAkLkhUTUwpIHtcbiAgICAgICAgdG9rZW5JbkhlYWQocCwgdG9rZW4pO1xuICAgIH0gZWxzZSBpZiAodG4gPT09ICQuVEVNUExBVEUpIHtcbiAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLnRtcGxDb3VudCA+IDApIHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLmdlbmVyYXRlSW1wbGllZEVuZFRhZ3NUaG9yb3VnaGx5KCk7XG5cbiAgICAgICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5jdXJyZW50VGFnTmFtZSAhPT0gJC5URU1QTEFURSkge1xuICAgICAgICAgICAgICAgIHAuX2VycihFUlIuY2xvc2luZ09mRWxlbWVudFdpdGhPcGVuQ2hpbGRFbGVtZW50cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsVGFnTmFtZVBvcHBlZCgkLlRFTVBMQVRFKTtcbiAgICAgICAgICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLmNsZWFyVG9MYXN0TWFya2VyKCk7XG4gICAgICAgICAgICBwLl9wb3BUbXBsSW5zZXJ0aW9uTW9kZSgpO1xuICAgICAgICAgICAgcC5fcmVzZXRJbnNlcnRpb25Nb2RlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwLl9lcnIoRVJSLmVuZFRhZ1dpdGhvdXRNYXRjaGluZ09wZW5FbGVtZW50KTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHAuX2VycihFUlIuZW5kVGFnV2l0aG91dE1hdGNoaW5nT3BlbkVsZW1lbnQpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdG9rZW5JbkhlYWQocCwgdG9rZW4pIHtcbiAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICBwLmluc2VydGlvbk1vZGUgPSBBRlRFUl9IRUFEX01PREU7XG4gICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbn1cblxuLy8gVGhlIFwiaW4gaGVhZCBubyBzY3JpcHRcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHN0YXJ0VGFnSW5IZWFkTm9TY3JpcHQocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ05hbWU7XG5cbiAgICBpZiAodG4gPT09ICQuSFRNTCkge1xuICAgICAgICBzdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgdG4gPT09ICQuQkFTRUZPTlQgfHxcbiAgICAgICAgdG4gPT09ICQuQkdTT1VORCB8fFxuICAgICAgICB0biA9PT0gJC5IRUFEIHx8XG4gICAgICAgIHRuID09PSAkLkxJTksgfHxcbiAgICAgICAgdG4gPT09ICQuTUVUQSB8fFxuICAgICAgICB0biA9PT0gJC5OT0ZSQU1FUyB8fFxuICAgICAgICB0biA9PT0gJC5TVFlMRVxuICAgICkge1xuICAgICAgICBzdGFydFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5OT1NDUklQVCkge1xuICAgICAgICBwLl9lcnIoRVJSLm5lc3RlZE5vc2NyaXB0SW5IZWFkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0b2tlbkluSGVhZE5vU2NyaXB0KHAsIHRva2VuKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGVuZFRhZ0luSGVhZE5vU2NyaXB0KHAsIHRva2VuKSB7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdOYW1lO1xuXG4gICAgaWYgKHRuID09PSAkLk5PU0NSSVBUKSB7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJTl9IRUFEX01PREU7XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5CUikge1xuICAgICAgICB0b2tlbkluSGVhZE5vU2NyaXB0KHAsIHRva2VuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwLl9lcnIoRVJSLmVuZFRhZ1dpdGhvdXRNYXRjaGluZ09wZW5FbGVtZW50KTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRva2VuSW5IZWFkTm9TY3JpcHQocCwgdG9rZW4pIHtcbiAgICBjb25zdCBlcnJDb2RlID1cbiAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW5pemVyLkVPRl9UT0tFTiA/IEVSUi5vcGVuRWxlbWVudHNMZWZ0QWZ0ZXJFb2YgOiBFUlIuZGlzYWxsb3dlZENvbnRlbnRJbk5vc2NyaXB0SW5IZWFkO1xuXG4gICAgcC5fZXJyKGVyckNvZGUpO1xuICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgIHAuaW5zZXJ0aW9uTW9kZSA9IElOX0hFQURfTU9ERTtcbiAgICBwLl9wcm9jZXNzVG9rZW4odG9rZW4pO1xufVxuXG4vLyBUaGUgXCJhZnRlciBoZWFkXCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzdGFydFRhZ0FmdGVySGVhZChwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIGlmICh0biA9PT0gJC5IVE1MKSB7XG4gICAgICAgIHN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLkJPRFkpIHtcbiAgICAgICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xuICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJTl9CT0RZX01PREU7XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5GUkFNRVNFVCkge1xuICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBOUy5IVE1MKTtcbiAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fRlJBTUVTRVRfTU9ERTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICB0biA9PT0gJC5CQVNFIHx8XG4gICAgICAgIHRuID09PSAkLkJBU0VGT05UIHx8XG4gICAgICAgIHRuID09PSAkLkJHU09VTkQgfHxcbiAgICAgICAgdG4gPT09ICQuTElOSyB8fFxuICAgICAgICB0biA9PT0gJC5NRVRBIHx8XG4gICAgICAgIHRuID09PSAkLk5PRlJBTUVTIHx8XG4gICAgICAgIHRuID09PSAkLlNDUklQVCB8fFxuICAgICAgICB0biA9PT0gJC5TVFlMRSB8fFxuICAgICAgICB0biA9PT0gJC5URU1QTEFURSB8fFxuICAgICAgICB0biA9PT0gJC5USVRMRVxuICAgICkge1xuICAgICAgICBwLl9lcnIoRVJSLmFiYW5kb25lZEhlYWRFbGVtZW50Q2hpbGQpO1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5wdXNoKHAuaGVhZEVsZW1lbnQpO1xuICAgICAgICBzdGFydFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnJlbW92ZShwLmhlYWRFbGVtZW50KTtcbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLkhFQUQpIHtcbiAgICAgICAgcC5fZXJyKEVSUi5taXNwbGFjZWRTdGFydFRhZ0ZvckhlYWRFbGVtZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0b2tlbkFmdGVySGVhZChwLCB0b2tlbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBlbmRUYWdBZnRlckhlYWQocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ05hbWU7XG5cbiAgICBpZiAodG4gPT09ICQuQk9EWSB8fCB0biA9PT0gJC5IVE1MIHx8IHRuID09PSAkLkJSKSB7XG4gICAgICAgIHRva2VuQWZ0ZXJIZWFkKHAsIHRva2VuKTtcbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLlRFTVBMQVRFKSB7XG4gICAgICAgIGVuZFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcC5fZXJyKEVSUi5lbmRUYWdXaXRob3V0TWF0Y2hpbmdPcGVuRWxlbWVudCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0b2tlbkFmdGVySGVhZChwLCB0b2tlbikge1xuICAgIHAuX2luc2VydEZha2VFbGVtZW50KCQuQk9EWSk7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fQk9EWV9NT0RFO1xuICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG59XG5cbi8vIFRoZSBcImluIGJvZHlcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHdoaXRlc3BhY2VDaGFyYWN0ZXJJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIHAuX2luc2VydENoYXJhY3RlcnModG9rZW4pO1xufVxuXG5mdW5jdGlvbiBjaGFyYWN0ZXJJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIHAuX2luc2VydENoYXJhY3RlcnModG9rZW4pO1xuICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xufVxuXG5mdW5jdGlvbiBodG1sU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMudG1wbENvdW50ID09PSAwKSB7XG4gICAgICAgIHAudHJlZUFkYXB0ZXIuYWRvcHRBdHRyaWJ1dGVzKHAub3BlbkVsZW1lbnRzLml0ZW1zWzBdLCB0b2tlbi5hdHRycyk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBib2R5U3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBjb25zdCBib2R5RWxlbWVudCA9IHAub3BlbkVsZW1lbnRzLnRyeVBlZWtQcm9wZXJseU5lc3RlZEJvZHlFbGVtZW50KCk7XG5cbiAgICBpZiAoYm9keUVsZW1lbnQgJiYgcC5vcGVuRWxlbWVudHMudG1wbENvdW50ID09PSAwKSB7XG4gICAgICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xuICAgICAgICBwLnRyZWVBZGFwdGVyLmFkb3B0QXR0cmlidXRlcyhib2R5RWxlbWVudCwgdG9rZW4uYXR0cnMpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZnJhbWVzZXRTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIGNvbnN0IGJvZHlFbGVtZW50ID0gcC5vcGVuRWxlbWVudHMudHJ5UGVla1Byb3Blcmx5TmVzdGVkQm9keUVsZW1lbnQoKTtcblxuICAgIGlmIChwLmZyYW1lc2V0T2sgJiYgYm9keUVsZW1lbnQpIHtcbiAgICAgICAgcC50cmVlQWRhcHRlci5kZXRhY2hOb2RlKGJvZHlFbGVtZW50KTtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wQWxsVXBUb0h0bWxFbGVtZW50KCk7XG4gICAgICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIE5TLkhUTUwpO1xuICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJTl9GUkFNRVNFVF9NT0RFO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYWRkcmVzc1N0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luQnV0dG9uU2NvcGUoJC5QKSkge1xuICAgICAgICBwLl9jbG9zZVBFbGVtZW50KCk7XG4gICAgfVxuXG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG59XG5cbmZ1bmN0aW9uIG51bWJlcmVkSGVhZGVyU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5CdXR0b25TY29wZSgkLlApKSB7XG4gICAgICAgIHAuX2Nsb3NlUEVsZW1lbnQoKTtcbiAgICB9XG5cbiAgICBjb25zdCB0biA9IHAub3BlbkVsZW1lbnRzLmN1cnJlbnRUYWdOYW1lO1xuXG4gICAgaWYgKHRuID09PSAkLkgxIHx8IHRuID09PSAkLkgyIHx8IHRuID09PSAkLkgzIHx8IHRuID09PSAkLkg0IHx8IHRuID09PSAkLkg1IHx8IHRuID09PSAkLkg2KSB7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgIH1cblxuICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIE5TLkhUTUwpO1xufVxuXG5mdW5jdGlvbiBwcmVTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJbkJ1dHRvblNjb3BlKCQuUCkpIHtcbiAgICAgICAgcC5fY2xvc2VQRWxlbWVudCgpO1xuICAgIH1cblxuICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIE5TLkhUTUwpO1xuICAgIC8vTk9URTogSWYgdGhlIG5leHQgdG9rZW4gaXMgYSBVKzAwMEEgTElORSBGRUVEIChMRikgY2hhcmFjdGVyIHRva2VuLCB0aGVuIGlnbm9yZSB0aGF0IHRva2VuIGFuZCBtb3ZlXG4gICAgLy9vbiB0byB0aGUgbmV4dCBvbmUuIChOZXdsaW5lcyBhdCB0aGUgc3RhcnQgb2YgcHJlIGJsb2NrcyBhcmUgaWdub3JlZCBhcyBhbiBhdXRob3JpbmcgY29udmVuaWVuY2UuKVxuICAgIHAuc2tpcE5leHROZXdMaW5lID0gdHJ1ZTtcbiAgICBwLmZyYW1lc2V0T2sgPSBmYWxzZTtcbn1cblxuZnVuY3Rpb24gZm9ybVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgY29uc3QgaW5UZW1wbGF0ZSA9IHAub3BlbkVsZW1lbnRzLnRtcGxDb3VudCA+IDA7XG5cbiAgICBpZiAoIXAuZm9ybUVsZW1lbnQgfHwgaW5UZW1wbGF0ZSkge1xuICAgICAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5CdXR0b25TY29wZSgkLlApKSB7XG4gICAgICAgICAgICBwLl9jbG9zZVBFbGVtZW50KCk7XG4gICAgICAgIH1cblxuICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBOUy5IVE1MKTtcblxuICAgICAgICBpZiAoIWluVGVtcGxhdGUpIHtcbiAgICAgICAgICAgIHAuZm9ybUVsZW1lbnQgPSBwLm9wZW5FbGVtZW50cy5jdXJyZW50O1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBsaXN0SXRlbVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgcC5mcmFtZXNldE9rID0gZmFsc2U7XG5cbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ05hbWU7XG5cbiAgICBmb3IgKGxldCBpID0gcC5vcGVuRWxlbWVudHMuc3RhY2tUb3A7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSBwLm9wZW5FbGVtZW50cy5pdGVtc1tpXTtcbiAgICAgICAgY29uc3QgZWxlbWVudFRuID0gcC50cmVlQWRhcHRlci5nZXRUYWdOYW1lKGVsZW1lbnQpO1xuICAgICAgICBsZXQgY2xvc2VUbiA9IG51bGw7XG5cbiAgICAgICAgaWYgKHRuID09PSAkLkxJICYmIGVsZW1lbnRUbiA9PT0gJC5MSSkge1xuICAgICAgICAgICAgY2xvc2VUbiA9ICQuTEk7XG4gICAgICAgIH0gZWxzZSBpZiAoKHRuID09PSAkLkREIHx8IHRuID09PSAkLkRUKSAmJiAoZWxlbWVudFRuID09PSAkLkREIHx8IGVsZW1lbnRUbiA9PT0gJC5EVCkpIHtcbiAgICAgICAgICAgIGNsb3NlVG4gPSBlbGVtZW50VG47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2xvc2VUbikge1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMuZ2VuZXJhdGVJbXBsaWVkRW5kVGFnc1dpdGhFeGNsdXNpb24oY2xvc2VUbik7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3BVbnRpbFRhZ05hbWVQb3BwZWQoY2xvc2VUbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlbGVtZW50VG4gIT09ICQuQUREUkVTUyAmJiBlbGVtZW50VG4gIT09ICQuRElWICYmIGVsZW1lbnRUbiAhPT0gJC5QICYmIHAuX2lzU3BlY2lhbEVsZW1lbnQoZWxlbWVudCkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luQnV0dG9uU2NvcGUoJC5QKSkge1xuICAgICAgICBwLl9jbG9zZVBFbGVtZW50KCk7XG4gICAgfVxuXG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG59XG5cbmZ1bmN0aW9uIHBsYWludGV4dFN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luQnV0dG9uU2NvcGUoJC5QKSkge1xuICAgICAgICBwLl9jbG9zZVBFbGVtZW50KCk7XG4gICAgfVxuXG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgcC50b2tlbml6ZXIuc3RhdGUgPSBUb2tlbml6ZXIuTU9ERS5QTEFJTlRFWFQ7XG59XG5cbmZ1bmN0aW9uIGJ1dHRvblN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luU2NvcGUoJC5CVVRUT04pKSB7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLmdlbmVyYXRlSW1wbGllZEVuZFRhZ3MoKTtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKCQuQlVUVE9OKTtcbiAgICB9XG5cbiAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIE5TLkhUTUwpO1xuICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xufVxuXG5mdW5jdGlvbiBhU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBjb25zdCBhY3RpdmVFbGVtZW50RW50cnkgPSBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5nZXRFbGVtZW50RW50cnlJblNjb3BlV2l0aFRhZ05hbWUoJC5BKTtcblxuICAgIGlmIChhY3RpdmVFbGVtZW50RW50cnkpIHtcbiAgICAgICAgY2FsbEFkb3B0aW9uQWdlbmN5KHAsIHRva2VuKTtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMucmVtb3ZlKGFjdGl2ZUVsZW1lbnRFbnRyeS5lbGVtZW50KTtcbiAgICAgICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMucmVtb3ZlRW50cnkoYWN0aXZlRWxlbWVudEVudHJ5KTtcbiAgICB9XG5cbiAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIE5TLkhUTUwpO1xuICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLnB1c2hFbGVtZW50KHAub3BlbkVsZW1lbnRzLmN1cnJlbnQsIHRva2VuKTtcbn1cblxuZnVuY3Rpb24gYlN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgcC5fcmVjb25zdHJ1Y3RBY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMoKTtcbiAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBOUy5IVE1MKTtcbiAgICBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5wdXNoRWxlbWVudChwLm9wZW5FbGVtZW50cy5jdXJyZW50LCB0b2tlbik7XG59XG5cbmZ1bmN0aW9uIG5vYnJTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIHAuX3JlY29uc3RydWN0QWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzKCk7XG5cbiAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5TY29wZSgkLk5PQlIpKSB7XG4gICAgICAgIGNhbGxBZG9wdGlvbkFnZW5jeShwLCB0b2tlbik7XG4gICAgICAgIHAuX3JlY29uc3RydWN0QWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzKCk7XG4gICAgfVxuXG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMucHVzaEVsZW1lbnQocC5vcGVuRWxlbWVudHMuY3VycmVudCwgdG9rZW4pO1xufVxuXG5mdW5jdGlvbiBhcHBsZXRTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIHAuX3JlY29uc3RydWN0QWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzKCk7XG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuaW5zZXJ0TWFya2VyKCk7XG4gICAgcC5mcmFtZXNldE9rID0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHRhYmxlU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBpZiAoXG4gICAgICAgIHAudHJlZUFkYXB0ZXIuZ2V0RG9jdW1lbnRNb2RlKHAuZG9jdW1lbnQpICE9PSBIVE1MLkRPQ1VNRU5UX01PREUuUVVJUktTICYmXG4gICAgICAgIHAub3BlbkVsZW1lbnRzLmhhc0luQnV0dG9uU2NvcGUoJC5QKVxuICAgICkge1xuICAgICAgICBwLl9jbG9zZVBFbGVtZW50KCk7XG4gICAgfVxuXG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgcC5mcmFtZXNldE9rID0gZmFsc2U7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fVEFCTEVfTU9ERTtcbn1cblxuZnVuY3Rpb24gYXJlYVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgcC5fcmVjb25zdHJ1Y3RBY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMoKTtcbiAgICBwLl9hcHBlbmRFbGVtZW50KHRva2VuLCBOUy5IVE1MKTtcbiAgICBwLmZyYW1lc2V0T2sgPSBmYWxzZTtcbiAgICB0b2tlbi5hY2tTZWxmQ2xvc2luZyA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIGlucHV0U3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIHAuX2FwcGVuZEVsZW1lbnQodG9rZW4sIE5TLkhUTUwpO1xuXG4gICAgY29uc3QgaW5wdXRUeXBlID0gVG9rZW5pemVyLmdldFRva2VuQXR0cih0b2tlbiwgQVRUUlMuVFlQRSk7XG5cbiAgICBpZiAoIWlucHV0VHlwZSB8fCBpbnB1dFR5cGUudG9Mb3dlckNhc2UoKSAhPT0gSElEREVOX0lOUFVUX1RZUEUpIHtcbiAgICAgICAgcC5mcmFtZXNldE9rID0gZmFsc2U7XG4gICAgfVxuXG4gICAgdG9rZW4uYWNrU2VsZkNsb3NpbmcgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBwYXJhbVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgcC5fYXBwZW5kRWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgdG9rZW4uYWNrU2VsZkNsb3NpbmcgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBoclN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luQnV0dG9uU2NvcGUoJC5QKSkge1xuICAgICAgICBwLl9jbG9zZVBFbGVtZW50KCk7XG4gICAgfVxuXG4gICAgcC5fYXBwZW5kRWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgcC5mcmFtZXNldE9rID0gZmFsc2U7XG4gICAgdG9rZW4uYWNrU2VsZkNsb3NpbmcgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBpbWFnZVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgdG9rZW4udGFnTmFtZSA9ICQuSU1HO1xuICAgIGFyZWFTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG59XG5cbmZ1bmN0aW9uIHRleHRhcmVhU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBOUy5IVE1MKTtcbiAgICAvL05PVEU6IElmIHRoZSBuZXh0IHRva2VuIGlzIGEgVSswMDBBIExJTkUgRkVFRCAoTEYpIGNoYXJhY3RlciB0b2tlbiwgdGhlbiBpZ25vcmUgdGhhdCB0b2tlbiBhbmQgbW92ZVxuICAgIC8vb24gdG8gdGhlIG5leHQgb25lLiAoTmV3bGluZXMgYXQgdGhlIHN0YXJ0IG9mIHRleHRhcmVhIGVsZW1lbnRzIGFyZSBpZ25vcmVkIGFzIGFuIGF1dGhvcmluZyBjb252ZW5pZW5jZS4pXG4gICAgcC5za2lwTmV4dE5ld0xpbmUgPSB0cnVlO1xuICAgIHAudG9rZW5pemVyLnN0YXRlID0gVG9rZW5pemVyLk1PREUuUkNEQVRBO1xuICAgIHAub3JpZ2luYWxJbnNlcnRpb25Nb2RlID0gcC5pbnNlcnRpb25Nb2RlO1xuICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xuICAgIHAuaW5zZXJ0aW9uTW9kZSA9IFRFWFRfTU9ERTtcbn1cblxuZnVuY3Rpb24geG1wU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5CdXR0b25TY29wZSgkLlApKSB7XG4gICAgICAgIHAuX2Nsb3NlUEVsZW1lbnQoKTtcbiAgICB9XG5cbiAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xuICAgIHAuX3N3aXRjaFRvVGV4dFBhcnNpbmcodG9rZW4sIFRva2VuaXplci5NT0RFLlJBV1RFWFQpO1xufVxuXG5mdW5jdGlvbiBpZnJhbWVTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xuICAgIHAuX3N3aXRjaFRvVGV4dFBhcnNpbmcodG9rZW4sIFRva2VuaXplci5NT0RFLlJBV1RFWFQpO1xufVxuXG4vL05PVEU6IGhlcmUgd2UgYXNzdW1lIHRoYXQgd2UgYWx3YXlzIGFjdCBhcyBhbiB1c2VyIGFnZW50IHdpdGggZW5hYmxlZCBwbHVnaW5zLCBzbyB3ZSBwYXJzZVxuLy88bm9lbWJlZD4gYXMgYSByYXd0ZXh0LlxuZnVuY3Rpb24gbm9lbWJlZFN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgcC5fc3dpdGNoVG9UZXh0UGFyc2luZyh0b2tlbiwgVG9rZW5pemVyLk1PREUuUkFXVEVYVCk7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdFN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgcC5fcmVjb25zdHJ1Y3RBY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMoKTtcbiAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBOUy5IVE1MKTtcbiAgICBwLmZyYW1lc2V0T2sgPSBmYWxzZTtcblxuICAgIGlmIChcbiAgICAgICAgcC5pbnNlcnRpb25Nb2RlID09PSBJTl9UQUJMRV9NT0RFIHx8XG4gICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9PT0gSU5fQ0FQVElPTl9NT0RFIHx8XG4gICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9PT0gSU5fVEFCTEVfQk9EWV9NT0RFIHx8XG4gICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9PT0gSU5fUk9XX01PREUgfHxcbiAgICAgICAgcC5pbnNlcnRpb25Nb2RlID09PSBJTl9DRUxMX01PREVcbiAgICApIHtcbiAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fU0VMRUNUX0lOX1RBQkxFX01PREU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fU0VMRUNUX01PREU7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBvcHRncm91cFN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmN1cnJlbnRUYWdOYW1lID09PSAkLk9QVElPTikge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICB9XG5cbiAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIE5TLkhUTUwpO1xufVxuXG5mdW5jdGlvbiByYlN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luU2NvcGUoJC5SVUJZKSkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzKCk7XG4gICAgfVxuXG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG59XG5cbmZ1bmN0aW9uIHJ0U3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5TY29wZSgkLlJVQlkpKSB7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLmdlbmVyYXRlSW1wbGllZEVuZFRhZ3NXaXRoRXhjbHVzaW9uKCQuUlRDKTtcbiAgICB9XG5cbiAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBOUy5IVE1MKTtcbn1cblxuZnVuY3Rpb24gbWVudVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luQnV0dG9uU2NvcGUoJC5QKSkge1xuICAgICAgICBwLl9jbG9zZVBFbGVtZW50KCk7XG4gICAgfVxuXG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG59XG5cbmZ1bmN0aW9uIG1hdGhTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIHAuX3JlY29uc3RydWN0QWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzKCk7XG5cbiAgICBmb3JlaWduQ29udGVudC5hZGp1c3RUb2tlbk1hdGhNTEF0dHJzKHRva2VuKTtcbiAgICBmb3JlaWduQ29udGVudC5hZGp1c3RUb2tlblhNTEF0dHJzKHRva2VuKTtcblxuICAgIGlmICh0b2tlbi5zZWxmQ2xvc2luZykge1xuICAgICAgICBwLl9hcHBlbmRFbGVtZW50KHRva2VuLCBOUy5NQVRITUwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIE5TLk1BVEhNTCk7XG4gICAgfVxuXG4gICAgdG9rZW4uYWNrU2VsZkNsb3NpbmcgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBzdmdTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIHAuX3JlY29uc3RydWN0QWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzKCk7XG5cbiAgICBmb3JlaWduQ29udGVudC5hZGp1c3RUb2tlblNWR0F0dHJzKHRva2VuKTtcbiAgICBmb3JlaWduQ29udGVudC5hZGp1c3RUb2tlblhNTEF0dHJzKHRva2VuKTtcblxuICAgIGlmICh0b2tlbi5zZWxmQ2xvc2luZykge1xuICAgICAgICBwLl9hcHBlbmRFbGVtZW50KHRva2VuLCBOUy5TVkcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIE5TLlNWRyk7XG4gICAgfVxuXG4gICAgdG9rZW4uYWNrU2VsZkNsb3NpbmcgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBnZW5lcmljU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIE5TLkhUTUwpO1xufVxuXG4vL09QVElNSVpBVElPTjogSW50ZWdlciBjb21wYXJpc29ucyBhcmUgbG93LWNvc3QsIHNvIHdlIGNhbiB1c2UgdmVyeSBmYXN0IHRhZyBuYW1lIGxlbmd0aCBmaWx0ZXJzIGhlcmUuXG4vL0l0J3MgZmFzdGVyIHRoYW4gdXNpbmcgZGljdGlvbmFyeS5cbmZ1bmN0aW9uIHN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdOYW1lO1xuXG4gICAgc3dpdGNoICh0bi5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgaWYgKHRuID09PSAkLkkgfHwgdG4gPT09ICQuUyB8fCB0biA9PT0gJC5CIHx8IHRuID09PSAkLlUpIHtcbiAgICAgICAgICAgICAgICBiU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5QKSB7XG4gICAgICAgICAgICAgICAgYWRkcmVzc1N0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuQSkge1xuICAgICAgICAgICAgICAgIGFTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGdlbmVyaWNTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5ETCB8fCB0biA9PT0gJC5PTCB8fCB0biA9PT0gJC5VTCkge1xuICAgICAgICAgICAgICAgIGFkZHJlc3NTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLkgxIHx8IHRuID09PSAkLkgyIHx8IHRuID09PSAkLkgzIHx8IHRuID09PSAkLkg0IHx8IHRuID09PSAkLkg1IHx8IHRuID09PSAkLkg2KSB7XG4gICAgICAgICAgICAgICAgbnVtYmVyZWRIZWFkZXJTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLkxJIHx8IHRuID09PSAkLkREIHx8IHRuID09PSAkLkRUKSB7XG4gICAgICAgICAgICAgICAgbGlzdEl0ZW1TdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLkVNIHx8IHRuID09PSAkLlRUKSB7XG4gICAgICAgICAgICAgICAgYlN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuQlIpIHtcbiAgICAgICAgICAgICAgICBhcmVhU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5IUikge1xuICAgICAgICAgICAgICAgIGhyU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5SQikge1xuICAgICAgICAgICAgICAgIHJiU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5SVCB8fCB0biA9PT0gJC5SUCkge1xuICAgICAgICAgICAgICAgIHJ0U3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biAhPT0gJC5USCAmJiB0biAhPT0gJC5URCAmJiB0biAhPT0gJC5UUikge1xuICAgICAgICAgICAgICAgIGdlbmVyaWNTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5ESVYgfHwgdG4gPT09ICQuRElSIHx8IHRuID09PSAkLk5BVikge1xuICAgICAgICAgICAgICAgIGFkZHJlc3NTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLlBSRSkge1xuICAgICAgICAgICAgICAgIHByZVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuQklHKSB7XG4gICAgICAgICAgICAgICAgYlN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuSU1HIHx8IHRuID09PSAkLldCUikge1xuICAgICAgICAgICAgICAgIGFyZWFTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLlhNUCkge1xuICAgICAgICAgICAgICAgIHhtcFN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuU1ZHKSB7XG4gICAgICAgICAgICAgICAgc3ZnU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5SVEMpIHtcbiAgICAgICAgICAgICAgICByYlN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gIT09ICQuQ09MKSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJpY1N0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgaWYgKHRuID09PSAkLkhUTUwpIHtcbiAgICAgICAgICAgICAgICBodG1sU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5CQVNFIHx8IHRuID09PSAkLkxJTksgfHwgdG4gPT09ICQuTUVUQSkge1xuICAgICAgICAgICAgICAgIHN0YXJ0VGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuQk9EWSkge1xuICAgICAgICAgICAgICAgIGJvZHlTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLk1BSU4gfHwgdG4gPT09ICQuTUVOVSkge1xuICAgICAgICAgICAgICAgIGFkZHJlc3NTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLkZPUk0pIHtcbiAgICAgICAgICAgICAgICBmb3JtU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5DT0RFIHx8IHRuID09PSAkLkZPTlQpIHtcbiAgICAgICAgICAgICAgICBiU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5OT0JSKSB7XG4gICAgICAgICAgICAgICAgbm9iclN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuQVJFQSkge1xuICAgICAgICAgICAgICAgIGFyZWFTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLk1BVEgpIHtcbiAgICAgICAgICAgICAgICBtYXRoU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5NRU5VKSB7XG4gICAgICAgICAgICAgICAgbWVudVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gIT09ICQuSEVBRCkge1xuICAgICAgICAgICAgICAgIGdlbmVyaWNTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgNTpcbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5TVFlMRSB8fCB0biA9PT0gJC5USVRMRSkge1xuICAgICAgICAgICAgICAgIHN0YXJ0VGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuQVNJREUpIHtcbiAgICAgICAgICAgICAgICBhZGRyZXNzU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5TTUFMTCkge1xuICAgICAgICAgICAgICAgIGJTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLlRBQkxFKSB7XG4gICAgICAgICAgICAgICAgdGFibGVTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLkVNQkVEKSB7XG4gICAgICAgICAgICAgICAgYXJlYVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuSU5QVVQpIHtcbiAgICAgICAgICAgICAgICBpbnB1dFN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuUEFSQU0gfHwgdG4gPT09ICQuVFJBQ0spIHtcbiAgICAgICAgICAgICAgICBwYXJhbVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuSU1BR0UpIHtcbiAgICAgICAgICAgICAgICBpbWFnZVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gIT09ICQuRlJBTUUgJiYgdG4gIT09ICQuVEJPRFkgJiYgdG4gIT09ICQuVEZPT1QgJiYgdG4gIT09ICQuVEhFQUQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmljU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIDY6XG4gICAgICAgICAgICBpZiAodG4gPT09ICQuU0NSSVBUKSB7XG4gICAgICAgICAgICAgICAgc3RhcnRUYWdJbkhlYWQocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5DRU5URVIgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5GSUdVUkUgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5GT09URVIgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5IRUFERVIgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5IR1JPVVAgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5ESUFMT0dcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIGFkZHJlc3NTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLkJVVFRPTikge1xuICAgICAgICAgICAgICAgIGJ1dHRvblN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuU1RSSUtFIHx8IHRuID09PSAkLlNUUk9ORykge1xuICAgICAgICAgICAgICAgIGJTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLkFQUExFVCB8fCB0biA9PT0gJC5PQkpFQ1QpIHtcbiAgICAgICAgICAgICAgICBhcHBsZXRTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLktFWUdFTikge1xuICAgICAgICAgICAgICAgIGFyZWFTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLlNPVVJDRSkge1xuICAgICAgICAgICAgICAgIHBhcmFtU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5JRlJBTUUpIHtcbiAgICAgICAgICAgICAgICBpZnJhbWVTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLlNFTEVDVCkge1xuICAgICAgICAgICAgICAgIHNlbGVjdFN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuT1BUSU9OKSB7XG4gICAgICAgICAgICAgICAgb3B0Z3JvdXBTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGdlbmVyaWNTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgNzpcbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5CR1NPVU5EKSB7XG4gICAgICAgICAgICAgICAgc3RhcnRUYWdJbkhlYWQocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5ERVRBSUxTIHx8XG4gICAgICAgICAgICAgICAgdG4gPT09ICQuQUREUkVTUyB8fFxuICAgICAgICAgICAgICAgIHRuID09PSAkLkFSVElDTEUgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5TRUNUSU9OIHx8XG4gICAgICAgICAgICAgICAgdG4gPT09ICQuU1VNTUFSWVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgYWRkcmVzc1N0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuTElTVElORykge1xuICAgICAgICAgICAgICAgIHByZVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuTUFSUVVFRSkge1xuICAgICAgICAgICAgICAgIGFwcGxldFN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuTk9FTUJFRCkge1xuICAgICAgICAgICAgICAgIG5vZW1iZWRTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuICE9PSAkLkNBUFRJT04pIHtcbiAgICAgICAgICAgICAgICBnZW5lcmljU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICBpZiAodG4gPT09ICQuQkFTRUZPTlQpIHtcbiAgICAgICAgICAgICAgICBzdGFydFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLkZSQU1FU0VUKSB7XG4gICAgICAgICAgICAgICAgZnJhbWVzZXRTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLkZJRUxEU0VUKSB7XG4gICAgICAgICAgICAgICAgYWRkcmVzc1N0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuVEVYVEFSRUEpIHtcbiAgICAgICAgICAgICAgICB0ZXh0YXJlYVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuVEVNUExBVEUpIHtcbiAgICAgICAgICAgICAgICBzdGFydFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLk5PU0NSSVBUKSB7XG4gICAgICAgICAgICAgICAgaWYgKHAub3B0aW9ucy5zY3JpcHRpbmdFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZW1iZWRTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJpY1N0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLk9QVEdST1VQKSB7XG4gICAgICAgICAgICAgICAgb3B0Z3JvdXBTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuICE9PSAkLkNPTEdST1VQKSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJpY1N0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgaWYgKHRuID09PSAkLlBMQUlOVEVYVCkge1xuICAgICAgICAgICAgICAgIHBsYWludGV4dFN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJpY1N0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAxMDpcbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5CTE9DS1FVT1RFIHx8IHRuID09PSAkLkZJR0NBUFRJT04pIHtcbiAgICAgICAgICAgICAgICBhZGRyZXNzU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBnZW5lcmljU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgZ2VuZXJpY1N0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJvZHlFbmRUYWdJbkJvZHkocCkge1xuICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblNjb3BlKCQuQk9EWSkpIHtcbiAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gQUZURVJfQk9EWV9NT0RFO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gaHRtbEVuZFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblNjb3BlKCQuQk9EWSkpIHtcbiAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gQUZURVJfQk9EWV9NT0RFO1xuICAgICAgICBwLl9wcm9jZXNzVG9rZW4odG9rZW4pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYWRkcmVzc0VuZFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblNjb3BlKHRuKSkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzKCk7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsVGFnTmFtZVBvcHBlZCh0bik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBmb3JtRW5kVGFnSW5Cb2R5KHApIHtcbiAgICBjb25zdCBpblRlbXBsYXRlID0gcC5vcGVuRWxlbWVudHMudG1wbENvdW50ID4gMDtcbiAgICBjb25zdCBmb3JtRWxlbWVudCA9IHAuZm9ybUVsZW1lbnQ7XG5cbiAgICBpZiAoIWluVGVtcGxhdGUpIHtcbiAgICAgICAgcC5mb3JtRWxlbWVudCA9IG51bGw7XG4gICAgfVxuXG4gICAgaWYgKChmb3JtRWxlbWVudCB8fCBpblRlbXBsYXRlKSAmJiBwLm9wZW5FbGVtZW50cy5oYXNJblNjb3BlKCQuRk9STSkpIHtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMuZ2VuZXJhdGVJbXBsaWVkRW5kVGFncygpO1xuXG4gICAgICAgIGlmIChpblRlbXBsYXRlKSB7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3BVbnRpbFRhZ05hbWVQb3BwZWQoJC5GT1JNKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnJlbW92ZShmb3JtRWxlbWVudCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHBFbmRUYWdJbkJvZHkocCkge1xuICAgIGlmICghcC5vcGVuRWxlbWVudHMuaGFzSW5CdXR0b25TY29wZSgkLlApKSB7XG4gICAgICAgIHAuX2luc2VydEZha2VFbGVtZW50KCQuUCk7XG4gICAgfVxuXG4gICAgcC5fY2xvc2VQRWxlbWVudCgpO1xufVxuXG5mdW5jdGlvbiBsaUVuZFRhZ0luQm9keShwKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luTGlzdEl0ZW1TY29wZSgkLkxJKSkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzV2l0aEV4Y2x1c2lvbigkLkxJKTtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKCQuTEkpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZGRFbmRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ05hbWU7XG5cbiAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5TY29wZSh0bikpIHtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMuZ2VuZXJhdGVJbXBsaWVkRW5kVGFnc1dpdGhFeGNsdXNpb24odG4pO1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3BVbnRpbFRhZ05hbWVQb3BwZWQodG4pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gbnVtYmVyZWRIZWFkZXJFbmRUYWdJbkJvZHkocCkge1xuICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNOdW1iZXJlZEhlYWRlckluU2NvcGUoKSkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzKCk7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsTnVtYmVyZWRIZWFkZXJQb3BwZWQoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFwcGxldEVuZFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblNjb3BlKHRuKSkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzKCk7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsVGFnTmFtZVBvcHBlZCh0bik7XG4gICAgICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLmNsZWFyVG9MYXN0TWFya2VyKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBickVuZFRhZ0luQm9keShwKSB7XG4gICAgcC5fcmVjb25zdHJ1Y3RBY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMoKTtcbiAgICBwLl9pbnNlcnRGYWtlRWxlbWVudCgkLkJSKTtcbiAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICBwLmZyYW1lc2V0T2sgPSBmYWxzZTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJpY0VuZFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIGZvciAobGV0IGkgPSBwLm9wZW5FbGVtZW50cy5zdGFja1RvcDsgaSA+IDA7IGktLSkge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gcC5vcGVuRWxlbWVudHMuaXRlbXNbaV07XG5cbiAgICAgICAgaWYgKHAudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZShlbGVtZW50KSA9PT0gdG4pIHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLmdlbmVyYXRlSW1wbGllZEVuZFRhZ3NXaXRoRXhjbHVzaW9uKHRuKTtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsRWxlbWVudFBvcHBlZChlbGVtZW50KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHAuX2lzU3BlY2lhbEVsZW1lbnQoZWxlbWVudCkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL09QVElNSVpBVElPTjogSW50ZWdlciBjb21wYXJpc29ucyBhcmUgbG93LWNvc3QsIHNvIHdlIGNhbiB1c2UgdmVyeSBmYXN0IHRhZyBuYW1lIGxlbmd0aCBmaWx0ZXJzIGhlcmUuXG4vL0l0J3MgZmFzdGVyIHRoYW4gdXNpbmcgZGljdGlvbmFyeS5cbmZ1bmN0aW9uIGVuZFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIHN3aXRjaCAodG4ubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5BIHx8IHRuID09PSAkLkIgfHwgdG4gPT09ICQuSSB8fCB0biA9PT0gJC5TIHx8IHRuID09PSAkLlUpIHtcbiAgICAgICAgICAgICAgICBjYWxsQWRvcHRpb25BZ2VuY3kocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5QKSB7XG4gICAgICAgICAgICAgICAgcEVuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGdlbmVyaWNFbmRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBpZiAodG4gPT09ICQuREwgfHwgdG4gPT09ICQuVUwgfHwgdG4gPT09ICQuT0wpIHtcbiAgICAgICAgICAgICAgICBhZGRyZXNzRW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuTEkpIHtcbiAgICAgICAgICAgICAgICBsaUVuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLkREIHx8IHRuID09PSAkLkRUKSB7XG4gICAgICAgICAgICAgICAgZGRFbmRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5IMSB8fCB0biA9PT0gJC5IMiB8fCB0biA9PT0gJC5IMyB8fCB0biA9PT0gJC5INCB8fCB0biA9PT0gJC5INSB8fCB0biA9PT0gJC5INikge1xuICAgICAgICAgICAgICAgIG51bWJlcmVkSGVhZGVyRW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuQlIpIHtcbiAgICAgICAgICAgICAgICBickVuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLkVNIHx8IHRuID09PSAkLlRUKSB7XG4gICAgICAgICAgICAgICAgY2FsbEFkb3B0aW9uQWdlbmN5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJpY0VuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5CSUcpIHtcbiAgICAgICAgICAgICAgICBjYWxsQWRvcHRpb25BZ2VuY3kocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5ESVIgfHwgdG4gPT09ICQuRElWIHx8IHRuID09PSAkLk5BViB8fCB0biA9PT0gJC5QUkUpIHtcbiAgICAgICAgICAgICAgICBhZGRyZXNzRW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJpY0VuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5CT0RZKSB7XG4gICAgICAgICAgICAgICAgYm9keUVuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLkhUTUwpIHtcbiAgICAgICAgICAgICAgICBodG1sRW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuRk9STSkge1xuICAgICAgICAgICAgICAgIGZvcm1FbmRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5DT0RFIHx8IHRuID09PSAkLkZPTlQgfHwgdG4gPT09ICQuTk9CUikge1xuICAgICAgICAgICAgICAgIGNhbGxBZG9wdGlvbkFnZW5jeShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLk1BSU4gfHwgdG4gPT09ICQuTUVOVSkge1xuICAgICAgICAgICAgICAgIGFkZHJlc3NFbmRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBnZW5lcmljRW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgaWYgKHRuID09PSAkLkFTSURFKSB7XG4gICAgICAgICAgICAgICAgYWRkcmVzc0VuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLlNNQUxMKSB7XG4gICAgICAgICAgICAgICAgY2FsbEFkb3B0aW9uQWdlbmN5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJpY0VuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5DRU5URVIgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5GSUdVUkUgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5GT09URVIgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5IRUFERVIgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5IR1JPVVAgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5ESUFMT0dcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIGFkZHJlc3NFbmRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5BUFBMRVQgfHwgdG4gPT09ICQuT0JKRUNUKSB7XG4gICAgICAgICAgICAgICAgYXBwbGV0RW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuU1RSSUtFIHx8IHRuID09PSAkLlNUUk9ORykge1xuICAgICAgICAgICAgICAgIGNhbGxBZG9wdGlvbkFnZW5jeShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGdlbmVyaWNFbmRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIDc6XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgdG4gPT09ICQuQUREUkVTUyB8fFxuICAgICAgICAgICAgICAgIHRuID09PSAkLkFSVElDTEUgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5ERVRBSUxTIHx8XG4gICAgICAgICAgICAgICAgdG4gPT09ICQuU0VDVElPTiB8fFxuICAgICAgICAgICAgICAgIHRuID09PSAkLlNVTU1BUlkgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5MSVNUSU5HXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBhZGRyZXNzRW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuTUFSUVVFRSkge1xuICAgICAgICAgICAgICAgIGFwcGxldEVuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGdlbmVyaWNFbmRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICBpZiAodG4gPT09ICQuRklFTERTRVQpIHtcbiAgICAgICAgICAgICAgICBhZGRyZXNzRW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuVEVNUExBVEUpIHtcbiAgICAgICAgICAgICAgICBlbmRUYWdJbkhlYWQocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBnZW5lcmljRW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAxMDpcbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5CTE9DS1FVT1RFIHx8IHRuID09PSAkLkZJR0NBUFRJT04pIHtcbiAgICAgICAgICAgICAgICBhZGRyZXNzRW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJpY0VuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBnZW5lcmljRW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGVvZkluQm9keShwLCB0b2tlbikge1xuICAgIGlmIChwLnRtcGxJbnNlcnRpb25Nb2RlU3RhY2tUb3AgPiAtMSkge1xuICAgICAgICBlb2ZJblRlbXBsYXRlKHAsIHRva2VuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwLnN0b3BwZWQgPSB0cnVlO1xuICAgIH1cbn1cblxuLy8gVGhlIFwidGV4dFwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gZW5kVGFnSW5UZXh0KHAsIHRva2VuKSB7XG4gICAgaWYgKHRva2VuLnRhZ05hbWUgPT09ICQuU0NSSVBUKSB7XG4gICAgICAgIHAucGVuZGluZ1NjcmlwdCA9IHAub3BlbkVsZW1lbnRzLmN1cnJlbnQ7XG4gICAgfVxuXG4gICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gcC5vcmlnaW5hbEluc2VydGlvbk1vZGU7XG59XG5cbmZ1bmN0aW9uIGVvZkluVGV4dChwLCB0b2tlbikge1xuICAgIHAuX2VycihFUlIuZW9mSW5FbGVtZW50VGhhdENhbkNvbnRhaW5Pbmx5VGV4dCk7XG4gICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gcC5vcmlnaW5hbEluc2VydGlvbk1vZGU7XG4gICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbn1cblxuLy8gVGhlIFwiaW4gdGFibGVcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIGNoYXJhY3RlckluVGFibGUocCwgdG9rZW4pIHtcbiAgICBjb25zdCBjdXJUbiA9IHAub3BlbkVsZW1lbnRzLmN1cnJlbnRUYWdOYW1lO1xuXG4gICAgaWYgKGN1clRuID09PSAkLlRBQkxFIHx8IGN1clRuID09PSAkLlRCT0RZIHx8IGN1clRuID09PSAkLlRGT09UIHx8IGN1clRuID09PSAkLlRIRUFEIHx8IGN1clRuID09PSAkLlRSKSB7XG4gICAgICAgIHAucGVuZGluZ0NoYXJhY3RlclRva2VucyA9IFtdO1xuICAgICAgICBwLmhhc05vbldoaXRlc3BhY2VQZW5kaW5nQ2hhcmFjdGVyVG9rZW4gPSBmYWxzZTtcbiAgICAgICAgcC5vcmlnaW5hbEluc2VydGlvbk1vZGUgPSBwLmluc2VydGlvbk1vZGU7XG4gICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IElOX1RBQkxFX1RFWFRfTU9ERTtcbiAgICAgICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0b2tlbkluVGFibGUocCwgdG9rZW4pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY2FwdGlvblN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbikge1xuICAgIHAub3BlbkVsZW1lbnRzLmNsZWFyQmFja1RvVGFibGVDb250ZXh0KCk7XG4gICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuaW5zZXJ0TWFya2VyKCk7XG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fQ0FQVElPTl9NT0RFO1xufVxuXG5mdW5jdGlvbiBjb2xncm91cFN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbikge1xuICAgIHAub3BlbkVsZW1lbnRzLmNsZWFyQmFja1RvVGFibGVDb250ZXh0KCk7XG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fQ09MVU1OX0dST1VQX01PREU7XG59XG5cbmZ1bmN0aW9uIGNvbFN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbikge1xuICAgIHAub3BlbkVsZW1lbnRzLmNsZWFyQmFja1RvVGFibGVDb250ZXh0KCk7XG4gICAgcC5faW5zZXJ0RmFrZUVsZW1lbnQoJC5DT0xHUk9VUCk7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fQ09MVU1OX0dST1VQX01PREU7XG4gICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbn1cblxuZnVuY3Rpb24gdGJvZHlTdGFydFRhZ0luVGFibGUocCwgdG9rZW4pIHtcbiAgICBwLm9wZW5FbGVtZW50cy5jbGVhckJhY2tUb1RhYmxlQ29udGV4dCgpO1xuICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIE5TLkhUTUwpO1xuICAgIHAuaW5zZXJ0aW9uTW9kZSA9IElOX1RBQkxFX0JPRFlfTU9ERTtcbn1cblxuZnVuY3Rpb24gdGRTdGFydFRhZ0luVGFibGUocCwgdG9rZW4pIHtcbiAgICBwLm9wZW5FbGVtZW50cy5jbGVhckJhY2tUb1RhYmxlQ29udGV4dCgpO1xuICAgIHAuX2luc2VydEZha2VFbGVtZW50KCQuVEJPRFkpO1xuICAgIHAuaW5zZXJ0aW9uTW9kZSA9IElOX1RBQkxFX0JPRFlfTU9ERTtcbiAgICBwLl9wcm9jZXNzVG9rZW4odG9rZW4pO1xufVxuXG5mdW5jdGlvbiB0YWJsZVN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbikge1xuICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblRhYmxlU2NvcGUoJC5UQUJMRSkpIHtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKCQuVEFCTEUpO1xuICAgICAgICBwLl9yZXNldEluc2VydGlvbk1vZGUoKTtcbiAgICAgICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGlucHV0U3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKSB7XG4gICAgY29uc3QgaW5wdXRUeXBlID0gVG9rZW5pemVyLmdldFRva2VuQXR0cih0b2tlbiwgQVRUUlMuVFlQRSk7XG5cbiAgICBpZiAoaW5wdXRUeXBlICYmIGlucHV0VHlwZS50b0xvd2VyQ2FzZSgpID09PSBISURERU5fSU5QVVRfVFlQRSkge1xuICAgICAgICBwLl9hcHBlbmRFbGVtZW50KHRva2VuLCBOUy5IVE1MKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0b2tlbkluVGFibGUocCwgdG9rZW4pO1xuICAgIH1cblxuICAgIHRva2VuLmFja1NlbGZDbG9zaW5nID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZm9ybVN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbikge1xuICAgIGlmICghcC5mb3JtRWxlbWVudCAmJiBwLm9wZW5FbGVtZW50cy50bXBsQ291bnQgPT09IDApIHtcbiAgICAgICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgICAgIHAuZm9ybUVsZW1lbnQgPSBwLm9wZW5FbGVtZW50cy5jdXJyZW50O1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIHN3aXRjaCAodG4ubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5URCB8fCB0biA9PT0gJC5USCB8fCB0biA9PT0gJC5UUikge1xuICAgICAgICAgICAgICAgIHRkU3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdG9rZW5JblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgaWYgKHRuID09PSAkLkNPTCkge1xuICAgICAgICAgICAgICAgIGNvbFN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRva2VuSW5UYWJsZShwLCB0b2tlbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5GT1JNKSB7XG4gICAgICAgICAgICAgICAgZm9ybVN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRva2VuSW5UYWJsZShwLCB0b2tlbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgNTpcbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5UQUJMRSkge1xuICAgICAgICAgICAgICAgIHRhYmxlU3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuU1RZTEUpIHtcbiAgICAgICAgICAgICAgICBzdGFydFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLlRCT0RZIHx8IHRuID09PSAkLlRGT09UIHx8IHRuID09PSAkLlRIRUFEKSB7XG4gICAgICAgICAgICAgICAgdGJvZHlTdGFydFRhZ0luVGFibGUocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5JTlBVVCkge1xuICAgICAgICAgICAgICAgIGlucHV0U3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdG9rZW5JblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgaWYgKHRuID09PSAkLlNDUklQVCkge1xuICAgICAgICAgICAgICAgIHN0YXJ0VGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdG9rZW5JblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSA3OlxuICAgICAgICAgICAgaWYgKHRuID09PSAkLkNBUFRJT04pIHtcbiAgICAgICAgICAgICAgICBjYXB0aW9uU3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdG9rZW5JblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgaWYgKHRuID09PSAkLkNPTEdST1VQKSB7XG4gICAgICAgICAgICAgICAgY29sZ3JvdXBTdGFydFRhZ0luVGFibGUocCwgdG9rZW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5URU1QTEFURSkge1xuICAgICAgICAgICAgICAgIHN0YXJ0VGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdG9rZW5JblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRva2VuSW5UYWJsZShwLCB0b2tlbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBlbmRUYWdJblRhYmxlKHAsIHRva2VuKSB7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdOYW1lO1xuXG4gICAgaWYgKHRuID09PSAkLlRBQkxFKSB7XG4gICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblRhYmxlU2NvcGUoJC5UQUJMRSkpIHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsVGFnTmFtZVBvcHBlZCgkLlRBQkxFKTtcbiAgICAgICAgICAgIHAuX3Jlc2V0SW5zZXJ0aW9uTW9kZSgpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5URU1QTEFURSkge1xuICAgICAgICBlbmRUYWdJbkhlYWQocCwgdG9rZW4pO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHRuICE9PSAkLkJPRFkgJiZcbiAgICAgICAgdG4gIT09ICQuQ0FQVElPTiAmJlxuICAgICAgICB0biAhPT0gJC5DT0wgJiZcbiAgICAgICAgdG4gIT09ICQuQ09MR1JPVVAgJiZcbiAgICAgICAgdG4gIT09ICQuSFRNTCAmJlxuICAgICAgICB0biAhPT0gJC5UQk9EWSAmJlxuICAgICAgICB0biAhPT0gJC5URCAmJlxuICAgICAgICB0biAhPT0gJC5URk9PVCAmJlxuICAgICAgICB0biAhPT0gJC5USCAmJlxuICAgICAgICB0biAhPT0gJC5USEVBRCAmJlxuICAgICAgICB0biAhPT0gJC5UUlxuICAgICkge1xuICAgICAgICB0b2tlbkluVGFibGUocCwgdG9rZW4pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdG9rZW5JblRhYmxlKHAsIHRva2VuKSB7XG4gICAgY29uc3Qgc2F2ZWRGb3N0ZXJQYXJlbnRpbmdTdGF0ZSA9IHAuZm9zdGVyUGFyZW50aW5nRW5hYmxlZDtcblxuICAgIHAuZm9zdGVyUGFyZW50aW5nRW5hYmxlZCA9IHRydWU7XG4gICAgcC5fcHJvY2Vzc1Rva2VuSW5Cb2R5TW9kZSh0b2tlbik7XG4gICAgcC5mb3N0ZXJQYXJlbnRpbmdFbmFibGVkID0gc2F2ZWRGb3N0ZXJQYXJlbnRpbmdTdGF0ZTtcbn1cblxuLy8gVGhlIFwiaW4gdGFibGUgdGV4dFwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gd2hpdGVzcGFjZUNoYXJhY3RlckluVGFibGVUZXh0KHAsIHRva2VuKSB7XG4gICAgcC5wZW5kaW5nQ2hhcmFjdGVyVG9rZW5zLnB1c2godG9rZW4pO1xufVxuXG5mdW5jdGlvbiBjaGFyYWN0ZXJJblRhYmxlVGV4dChwLCB0b2tlbikge1xuICAgIHAucGVuZGluZ0NoYXJhY3RlclRva2Vucy5wdXNoKHRva2VuKTtcbiAgICBwLmhhc05vbldoaXRlc3BhY2VQZW5kaW5nQ2hhcmFjdGVyVG9rZW4gPSB0cnVlO1xufVxuXG5mdW5jdGlvbiB0b2tlbkluVGFibGVUZXh0KHAsIHRva2VuKSB7XG4gICAgbGV0IGkgPSAwO1xuXG4gICAgaWYgKHAuaGFzTm9uV2hpdGVzcGFjZVBlbmRpbmdDaGFyYWN0ZXJUb2tlbikge1xuICAgICAgICBmb3IgKDsgaSA8IHAucGVuZGluZ0NoYXJhY3RlclRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdG9rZW5JblRhYmxlKHAsIHAucGVuZGluZ0NoYXJhY3RlclRva2Vuc1tpXSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKDsgaSA8IHAucGVuZGluZ0NoYXJhY3RlclRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcC5faW5zZXJ0Q2hhcmFjdGVycyhwLnBlbmRpbmdDaGFyYWN0ZXJUb2tlbnNbaV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcC5pbnNlcnRpb25Nb2RlID0gcC5vcmlnaW5hbEluc2VydGlvbk1vZGU7XG4gICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbn1cblxuLy8gVGhlIFwiaW4gY2FwdGlvblwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gc3RhcnRUYWdJbkNhcHRpb24ocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ05hbWU7XG5cbiAgICBpZiAoXG4gICAgICAgIHRuID09PSAkLkNBUFRJT04gfHxcbiAgICAgICAgdG4gPT09ICQuQ09MIHx8XG4gICAgICAgIHRuID09PSAkLkNPTEdST1VQIHx8XG4gICAgICAgIHRuID09PSAkLlRCT0RZIHx8XG4gICAgICAgIHRuID09PSAkLlREIHx8XG4gICAgICAgIHRuID09PSAkLlRGT09UIHx8XG4gICAgICAgIHRuID09PSAkLlRIIHx8XG4gICAgICAgIHRuID09PSAkLlRIRUFEIHx8XG4gICAgICAgIHRuID09PSAkLlRSXG4gICAgKSB7XG4gICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblRhYmxlU2NvcGUoJC5DQVBUSU9OKSkge1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMuZ2VuZXJhdGVJbXBsaWVkRW5kVGFncygpO1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKCQuQ0FQVElPTik7XG4gICAgICAgICAgICBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5jbGVhclRvTGFzdE1hcmtlcigpO1xuICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fVEFCTEVfTU9ERTtcbiAgICAgICAgICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBzdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBlbmRUYWdJbkNhcHRpb24ocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ05hbWU7XG5cbiAgICBpZiAodG4gPT09ICQuQ0FQVElPTiB8fCB0biA9PT0gJC5UQUJMRSkge1xuICAgICAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5UYWJsZVNjb3BlKCQuQ0FQVElPTikpIHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLmdlbmVyYXRlSW1wbGllZEVuZFRhZ3MoKTtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsVGFnTmFtZVBvcHBlZCgkLkNBUFRJT04pO1xuICAgICAgICAgICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuY2xlYXJUb0xhc3RNYXJrZXIoKTtcbiAgICAgICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IElOX1RBQkxFX01PREU7XG5cbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5UQUJMRSkge1xuICAgICAgICAgICAgICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICB0biAhPT0gJC5CT0RZICYmXG4gICAgICAgIHRuICE9PSAkLkNPTCAmJlxuICAgICAgICB0biAhPT0gJC5DT0xHUk9VUCAmJlxuICAgICAgICB0biAhPT0gJC5IVE1MICYmXG4gICAgICAgIHRuICE9PSAkLlRCT0RZICYmXG4gICAgICAgIHRuICE9PSAkLlREICYmXG4gICAgICAgIHRuICE9PSAkLlRGT09UICYmXG4gICAgICAgIHRuICE9PSAkLlRIICYmXG4gICAgICAgIHRuICE9PSAkLlRIRUFEICYmXG4gICAgICAgIHRuICE9PSAkLlRSXG4gICAgKSB7XG4gICAgICAgIGVuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgfVxufVxuXG4vLyBUaGUgXCJpbiBjb2x1bW4gZ3JvdXBcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHN0YXJ0VGFnSW5Db2x1bW5Hcm91cChwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIGlmICh0biA9PT0gJC5IVE1MKSB7XG4gICAgICAgIHN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLkNPTCkge1xuICAgICAgICBwLl9hcHBlbmRFbGVtZW50KHRva2VuLCBOUy5IVE1MKTtcbiAgICAgICAgdG9rZW4uYWNrU2VsZkNsb3NpbmcgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAodG4gPT09ICQuVEVNUExBVEUpIHtcbiAgICAgICAgc3RhcnRUYWdJbkhlYWQocCwgdG9rZW4pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRva2VuSW5Db2x1bW5Hcm91cChwLCB0b2tlbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBlbmRUYWdJbkNvbHVtbkdyb3VwKHAsIHRva2VuKSB7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdOYW1lO1xuXG4gICAgaWYgKHRuID09PSAkLkNPTEdST1VQKSB7XG4gICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5jdXJyZW50VGFnTmFtZSA9PT0gJC5DT0xHUk9VUCkge1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJTl9UQUJMRV9NT0RFO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5URU1QTEFURSkge1xuICAgICAgICBlbmRUYWdJbkhlYWQocCwgdG9rZW4pO1xuICAgIH0gZWxzZSBpZiAodG4gIT09ICQuQ09MKSB7XG4gICAgICAgIHRva2VuSW5Db2x1bW5Hcm91cChwLCB0b2tlbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0b2tlbkluQ29sdW1uR3JvdXAocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMuY3VycmVudFRhZ05hbWUgPT09ICQuQ09MR1JPVVApIHtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IElOX1RBQkxFX01PREU7XG4gICAgICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG4gICAgfVxufVxuXG4vLyBUaGUgXCJpbiB0YWJsZSBib2R5XCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzdGFydFRhZ0luVGFibGVCb2R5KHAsIHRva2VuKSB7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdOYW1lO1xuXG4gICAgaWYgKHRuID09PSAkLlRSKSB7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLmNsZWFyQmFja1RvVGFibGVCb2R5Q29udGV4dCgpO1xuICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBOUy5IVE1MKTtcbiAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fUk9XX01PREU7XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5USCB8fCB0biA9PT0gJC5URCkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5jbGVhckJhY2tUb1RhYmxlQm9keUNvbnRleHQoKTtcbiAgICAgICAgcC5faW5zZXJ0RmFrZUVsZW1lbnQoJC5UUik7XG4gICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IElOX1JPV19NT0RFO1xuICAgICAgICBwLl9wcm9jZXNzVG9rZW4odG9rZW4pO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHRuID09PSAkLkNBUFRJT04gfHxcbiAgICAgICAgdG4gPT09ICQuQ09MIHx8XG4gICAgICAgIHRuID09PSAkLkNPTEdST1VQIHx8XG4gICAgICAgIHRuID09PSAkLlRCT0RZIHx8XG4gICAgICAgIHRuID09PSAkLlRGT09UIHx8XG4gICAgICAgIHRuID09PSAkLlRIRUFEXG4gICAgKSB7XG4gICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNUYWJsZUJvZHlDb250ZXh0SW5UYWJsZVNjb3BlKCkpIHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLmNsZWFyQmFja1RvVGFibGVCb2R5Q29udGV4dCgpO1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJTl9UQUJMRV9NT0RFO1xuICAgICAgICAgICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBlbmRUYWdJblRhYmxlQm9keShwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIGlmICh0biA9PT0gJC5UQk9EWSB8fCB0biA9PT0gJC5URk9PVCB8fCB0biA9PT0gJC5USEVBRCkge1xuICAgICAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5UYWJsZVNjb3BlKHRuKSkge1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMuY2xlYXJCYWNrVG9UYWJsZUJvZHlDb250ZXh0KCk7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICAgICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IElOX1RBQkxFX01PREU7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLlRBQkxFKSB7XG4gICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNUYWJsZUJvZHlDb250ZXh0SW5UYWJsZVNjb3BlKCkpIHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLmNsZWFyQmFja1RvVGFibGVCb2R5Q29udGV4dCgpO1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJTl9UQUJMRV9NT0RFO1xuICAgICAgICAgICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICh0biAhPT0gJC5CT0RZICYmIHRuICE9PSAkLkNBUFRJT04gJiYgdG4gIT09ICQuQ09MICYmIHRuICE9PSAkLkNPTEdST1VQKSB8fFxuICAgICAgICAodG4gIT09ICQuSFRNTCAmJiB0biAhPT0gJC5URCAmJiB0biAhPT0gJC5USCAmJiB0biAhPT0gJC5UUilcbiAgICApIHtcbiAgICAgICAgZW5kVGFnSW5UYWJsZShwLCB0b2tlbik7XG4gICAgfVxufVxuXG4vLyBUaGUgXCJpbiByb3dcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHN0YXJ0VGFnSW5Sb3cocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ05hbWU7XG5cbiAgICBpZiAodG4gPT09ICQuVEggfHwgdG4gPT09ICQuVEQpIHtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMuY2xlYXJCYWNrVG9UYWJsZVJvd0NvbnRleHQoKTtcbiAgICAgICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IElOX0NFTExfTU9ERTtcbiAgICAgICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuaW5zZXJ0TWFya2VyKCk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgdG4gPT09ICQuQ0FQVElPTiB8fFxuICAgICAgICB0biA9PT0gJC5DT0wgfHxcbiAgICAgICAgdG4gPT09ICQuQ09MR1JPVVAgfHxcbiAgICAgICAgdG4gPT09ICQuVEJPRFkgfHxcbiAgICAgICAgdG4gPT09ICQuVEZPT1QgfHxcbiAgICAgICAgdG4gPT09ICQuVEhFQUQgfHxcbiAgICAgICAgdG4gPT09ICQuVFJcbiAgICApIHtcbiAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luVGFibGVTY29wZSgkLlRSKSkge1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMuY2xlYXJCYWNrVG9UYWJsZVJvd0NvbnRleHQoKTtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fVEFCTEVfQk9EWV9NT0RFO1xuICAgICAgICAgICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBlbmRUYWdJblJvdyhwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIGlmICh0biA9PT0gJC5UUikge1xuICAgICAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5UYWJsZVNjb3BlKCQuVFIpKSB7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5jbGVhckJhY2tUb1RhYmxlUm93Q29udGV4dCgpO1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJTl9UQUJMRV9CT0RZX01PREU7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLlRBQkxFKSB7XG4gICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblRhYmxlU2NvcGUoJC5UUikpIHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLmNsZWFyQmFja1RvVGFibGVSb3dDb250ZXh0KCk7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICAgICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IElOX1RBQkxFX0JPRFlfTU9ERTtcbiAgICAgICAgICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLlRCT0RZIHx8IHRuID09PSAkLlRGT09UIHx8IHRuID09PSAkLlRIRUFEKSB7XG4gICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblRhYmxlU2NvcGUodG4pIHx8IHAub3BlbkVsZW1lbnRzLmhhc0luVGFibGVTY29wZSgkLlRSKSkge1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMuY2xlYXJCYWNrVG9UYWJsZVJvd0NvbnRleHQoKTtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fVEFCTEVfQk9EWV9NT0RFO1xuICAgICAgICAgICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICh0biAhPT0gJC5CT0RZICYmIHRuICE9PSAkLkNBUFRJT04gJiYgdG4gIT09ICQuQ09MICYmIHRuICE9PSAkLkNPTEdST1VQKSB8fFxuICAgICAgICAodG4gIT09ICQuSFRNTCAmJiB0biAhPT0gJC5URCAmJiB0biAhPT0gJC5USClcbiAgICApIHtcbiAgICAgICAgZW5kVGFnSW5UYWJsZShwLCB0b2tlbik7XG4gICAgfVxufVxuXG4vLyBUaGUgXCJpbiBjZWxsXCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzdGFydFRhZ0luQ2VsbChwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIGlmIChcbiAgICAgICAgdG4gPT09ICQuQ0FQVElPTiB8fFxuICAgICAgICB0biA9PT0gJC5DT0wgfHxcbiAgICAgICAgdG4gPT09ICQuQ09MR1JPVVAgfHxcbiAgICAgICAgdG4gPT09ICQuVEJPRFkgfHxcbiAgICAgICAgdG4gPT09ICQuVEQgfHxcbiAgICAgICAgdG4gPT09ICQuVEZPT1QgfHxcbiAgICAgICAgdG4gPT09ICQuVEggfHxcbiAgICAgICAgdG4gPT09ICQuVEhFQUQgfHxcbiAgICAgICAgdG4gPT09ICQuVFJcbiAgICApIHtcbiAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luVGFibGVTY29wZSgkLlREKSB8fCBwLm9wZW5FbGVtZW50cy5oYXNJblRhYmxlU2NvcGUoJC5USCkpIHtcbiAgICAgICAgICAgIHAuX2Nsb3NlVGFibGVDZWxsKCk7XG4gICAgICAgICAgICBwLl9wcm9jZXNzVG9rZW4odG9rZW4pO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZW5kVGFnSW5DZWxsKHAsIHRva2VuKSB7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdOYW1lO1xuXG4gICAgaWYgKHRuID09PSAkLlREIHx8IHRuID09PSAkLlRIKSB7XG4gICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblRhYmxlU2NvcGUodG4pKSB7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzKCk7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3BVbnRpbFRhZ05hbWVQb3BwZWQodG4pO1xuICAgICAgICAgICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuY2xlYXJUb0xhc3RNYXJrZXIoKTtcbiAgICAgICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IElOX1JPV19NT0RFO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5UQUJMRSB8fCB0biA9PT0gJC5UQk9EWSB8fCB0biA9PT0gJC5URk9PVCB8fCB0biA9PT0gJC5USEVBRCB8fCB0biA9PT0gJC5UUikge1xuICAgICAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5UYWJsZVNjb3BlKHRuKSkge1xuICAgICAgICAgICAgcC5fY2xvc2VUYWJsZUNlbGwoKTtcbiAgICAgICAgICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRuICE9PSAkLkJPRFkgJiYgdG4gIT09ICQuQ0FQVElPTiAmJiB0biAhPT0gJC5DT0wgJiYgdG4gIT09ICQuQ09MR1JPVVAgJiYgdG4gIT09ICQuSFRNTCkge1xuICAgICAgICBlbmRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgIH1cbn1cblxuLy8gVGhlIFwiaW4gc2VsZWN0XCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzdGFydFRhZ0luU2VsZWN0KHAsIHRva2VuKSB7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdOYW1lO1xuXG4gICAgaWYgKHRuID09PSAkLkhUTUwpIHtcbiAgICAgICAgc3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgIH0gZWxzZSBpZiAodG4gPT09ICQuT1BUSU9OKSB7XG4gICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5jdXJyZW50VGFnTmFtZSA9PT0gJC5PUFRJT04pIHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5PUFRHUk9VUCkge1xuICAgICAgICBpZiAocC5vcGVuRWxlbWVudHMuY3VycmVudFRhZ05hbWUgPT09ICQuT1BUSU9OKSB7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5jdXJyZW50VGFnTmFtZSA9PT0gJC5PUFRHUk9VUCkge1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgIH1cblxuICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBOUy5IVE1MKTtcbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLklOUFVUIHx8IHRuID09PSAkLktFWUdFTiB8fCB0biA9PT0gJC5URVhUQVJFQSB8fCB0biA9PT0gJC5TRUxFQ1QpIHtcbiAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luU2VsZWN0U2NvcGUoJC5TRUxFQ1QpKSB7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3BVbnRpbFRhZ05hbWVQb3BwZWQoJC5TRUxFQ1QpO1xuICAgICAgICAgICAgcC5fcmVzZXRJbnNlcnRpb25Nb2RlKCk7XG5cbiAgICAgICAgICAgIGlmICh0biAhPT0gJC5TRUxFQ1QpIHtcbiAgICAgICAgICAgICAgICBwLl9wcm9jZXNzVG9rZW4odG9rZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5TQ1JJUFQgfHwgdG4gPT09ICQuVEVNUExBVEUpIHtcbiAgICAgICAgc3RhcnRUYWdJbkhlYWQocCwgdG9rZW4pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZW5kVGFnSW5TZWxlY3QocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ05hbWU7XG5cbiAgICBpZiAodG4gPT09ICQuT1BUR1JPVVApIHtcbiAgICAgICAgY29uc3QgcHJldk9wZW5FbGVtZW50ID0gcC5vcGVuRWxlbWVudHMuaXRlbXNbcC5vcGVuRWxlbWVudHMuc3RhY2tUb3AgLSAxXTtcbiAgICAgICAgY29uc3QgcHJldk9wZW5FbGVtZW50VG4gPSBwcmV2T3BlbkVsZW1lbnQgJiYgcC50cmVlQWRhcHRlci5nZXRUYWdOYW1lKHByZXZPcGVuRWxlbWVudCk7XG5cbiAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmN1cnJlbnRUYWdOYW1lID09PSAkLk9QVElPTiAmJiBwcmV2T3BlbkVsZW1lbnRUbiA9PT0gJC5PUFRHUk9VUCkge1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocC5vcGVuRWxlbWVudHMuY3VycmVudFRhZ05hbWUgPT09ICQuT1BUR1JPVVApIHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh0biA9PT0gJC5PUFRJT04pIHtcbiAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmN1cnJlbnRUYWdOYW1lID09PSAkLk9QVElPTikge1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLlNFTEVDVCAmJiBwLm9wZW5FbGVtZW50cy5oYXNJblNlbGVjdFNjb3BlKCQuU0VMRUNUKSkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3BVbnRpbFRhZ05hbWVQb3BwZWQoJC5TRUxFQ1QpO1xuICAgICAgICBwLl9yZXNldEluc2VydGlvbk1vZGUoKTtcbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLlRFTVBMQVRFKSB7XG4gICAgICAgIGVuZFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgfVxufVxuXG4vLzEyLjIuNS40LjE3IFRoZSBcImluIHNlbGVjdCBpbiB0YWJsZVwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gc3RhcnRUYWdJblNlbGVjdEluVGFibGUocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ05hbWU7XG5cbiAgICBpZiAoXG4gICAgICAgIHRuID09PSAkLkNBUFRJT04gfHxcbiAgICAgICAgdG4gPT09ICQuVEFCTEUgfHxcbiAgICAgICAgdG4gPT09ICQuVEJPRFkgfHxcbiAgICAgICAgdG4gPT09ICQuVEZPT1QgfHxcbiAgICAgICAgdG4gPT09ICQuVEhFQUQgfHxcbiAgICAgICAgdG4gPT09ICQuVFIgfHxcbiAgICAgICAgdG4gPT09ICQuVEQgfHxcbiAgICAgICAgdG4gPT09ICQuVEhcbiAgICApIHtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKCQuU0VMRUNUKTtcbiAgICAgICAgcC5fcmVzZXRJbnNlcnRpb25Nb2RlKCk7XG4gICAgICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3RhcnRUYWdJblNlbGVjdChwLCB0b2tlbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBlbmRUYWdJblNlbGVjdEluVGFibGUocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ05hbWU7XG5cbiAgICBpZiAoXG4gICAgICAgIHRuID09PSAkLkNBUFRJT04gfHxcbiAgICAgICAgdG4gPT09ICQuVEFCTEUgfHxcbiAgICAgICAgdG4gPT09ICQuVEJPRFkgfHxcbiAgICAgICAgdG4gPT09ICQuVEZPT1QgfHxcbiAgICAgICAgdG4gPT09ICQuVEhFQUQgfHxcbiAgICAgICAgdG4gPT09ICQuVFIgfHxcbiAgICAgICAgdG4gPT09ICQuVEQgfHxcbiAgICAgICAgdG4gPT09ICQuVEhcbiAgICApIHtcbiAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luVGFibGVTY29wZSh0bikpIHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsVGFnTmFtZVBvcHBlZCgkLlNFTEVDVCk7XG4gICAgICAgICAgICBwLl9yZXNldEluc2VydGlvbk1vZGUoKTtcbiAgICAgICAgICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBlbmRUYWdJblNlbGVjdChwLCB0b2tlbik7XG4gICAgfVxufVxuXG4vLyBUaGUgXCJpbiB0ZW1wbGF0ZVwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gc3RhcnRUYWdJblRlbXBsYXRlKHAsIHRva2VuKSB7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdOYW1lO1xuXG4gICAgaWYgKFxuICAgICAgICB0biA9PT0gJC5CQVNFIHx8XG4gICAgICAgIHRuID09PSAkLkJBU0VGT05UIHx8XG4gICAgICAgIHRuID09PSAkLkJHU09VTkQgfHxcbiAgICAgICAgdG4gPT09ICQuTElOSyB8fFxuICAgICAgICB0biA9PT0gJC5NRVRBIHx8XG4gICAgICAgIHRuID09PSAkLk5PRlJBTUVTIHx8XG4gICAgICAgIHRuID09PSAkLlNDUklQVCB8fFxuICAgICAgICB0biA9PT0gJC5TVFlMRSB8fFxuICAgICAgICB0biA9PT0gJC5URU1QTEFURSB8fFxuICAgICAgICB0biA9PT0gJC5USVRMRVxuICAgICkge1xuICAgICAgICBzdGFydFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgbmV3SW5zZXJ0aW9uTW9kZSA9IFRFTVBMQVRFX0lOU0VSVElPTl9NT0RFX1NXSVRDSF9NQVBbdG5dIHx8IElOX0JPRFlfTU9ERTtcblxuICAgICAgICBwLl9wb3BUbXBsSW5zZXJ0aW9uTW9kZSgpO1xuICAgICAgICBwLl9wdXNoVG1wbEluc2VydGlvbk1vZGUobmV3SW5zZXJ0aW9uTW9kZSk7XG4gICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IG5ld0luc2VydGlvbk1vZGU7XG4gICAgICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBlbmRUYWdJblRlbXBsYXRlKHAsIHRva2VuKSB7XG4gICAgaWYgKHRva2VuLnRhZ05hbWUgPT09ICQuVEVNUExBVEUpIHtcbiAgICAgICAgZW5kVGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGVvZkluVGVtcGxhdGUocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMudG1wbENvdW50ID4gMCkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3BVbnRpbFRhZ05hbWVQb3BwZWQoJC5URU1QTEFURSk7XG4gICAgICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLmNsZWFyVG9MYXN0TWFya2VyKCk7XG4gICAgICAgIHAuX3BvcFRtcGxJbnNlcnRpb25Nb2RlKCk7XG4gICAgICAgIHAuX3Jlc2V0SW5zZXJ0aW9uTW9kZSgpO1xuICAgICAgICBwLl9wcm9jZXNzVG9rZW4odG9rZW4pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHAuc3RvcHBlZCA9IHRydWU7XG4gICAgfVxufVxuXG4vLyBUaGUgXCJhZnRlciBib2R5XCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzdGFydFRhZ0FmdGVyQm9keShwLCB0b2tlbikge1xuICAgIGlmICh0b2tlbi50YWdOYW1lID09PSAkLkhUTUwpIHtcbiAgICAgICAgc3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRva2VuQWZ0ZXJCb2R5KHAsIHRva2VuKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGVuZFRhZ0FmdGVyQm9keShwLCB0b2tlbikge1xuICAgIGlmICh0b2tlbi50YWdOYW1lID09PSAkLkhUTUwpIHtcbiAgICAgICAgaWYgKCFwLmZyYWdtZW50Q29udGV4dCkge1xuICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gQUZURVJfQUZURVJfQk9EWV9NT0RFO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdG9rZW5BZnRlckJvZHkocCwgdG9rZW4pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdG9rZW5BZnRlckJvZHkocCwgdG9rZW4pIHtcbiAgICBwLmluc2VydGlvbk1vZGUgPSBJTl9CT0RZX01PREU7XG4gICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbn1cblxuLy8gVGhlIFwiaW4gZnJhbWVzZXRcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHN0YXJ0VGFnSW5GcmFtZXNldChwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIGlmICh0biA9PT0gJC5IVE1MKSB7XG4gICAgICAgIHN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLkZSQU1FU0VUKSB7XG4gICAgICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIE5TLkhUTUwpO1xuICAgIH0gZWxzZSBpZiAodG4gPT09ICQuRlJBTUUpIHtcbiAgICAgICAgcC5fYXBwZW5kRWxlbWVudCh0b2tlbiwgTlMuSFRNTCk7XG4gICAgICAgIHRva2VuLmFja1NlbGZDbG9zaW5nID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLk5PRlJBTUVTKSB7XG4gICAgICAgIHN0YXJ0VGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGVuZFRhZ0luRnJhbWVzZXQocCwgdG9rZW4pIHtcbiAgICBpZiAodG9rZW4udGFnTmFtZSA9PT0gJC5GUkFNRVNFVCAmJiAhcC5vcGVuRWxlbWVudHMuaXNSb290SHRtbEVsZW1lbnRDdXJyZW50KCkpIHtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG5cbiAgICAgICAgaWYgKCFwLmZyYWdtZW50Q29udGV4dCAmJiBwLm9wZW5FbGVtZW50cy5jdXJyZW50VGFnTmFtZSAhPT0gJC5GUkFNRVNFVCkge1xuICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gQUZURVJfRlJBTUVTRVRfTU9ERTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gVGhlIFwiYWZ0ZXIgZnJhbWVzZXRcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHN0YXJ0VGFnQWZ0ZXJGcmFtZXNldChwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIGlmICh0biA9PT0gJC5IVE1MKSB7XG4gICAgICAgIHN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLk5PRlJBTUVTKSB7XG4gICAgICAgIHN0YXJ0VGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGVuZFRhZ0FmdGVyRnJhbWVzZXQocCwgdG9rZW4pIHtcbiAgICBpZiAodG9rZW4udGFnTmFtZSA9PT0gJC5IVE1MKSB7XG4gICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IEFGVEVSX0FGVEVSX0ZSQU1FU0VUX01PREU7XG4gICAgfVxufVxuXG4vLyBUaGUgXCJhZnRlciBhZnRlciBib2R5XCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzdGFydFRhZ0FmdGVyQWZ0ZXJCb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHRva2VuLnRhZ05hbWUgPT09ICQuSFRNTCkge1xuICAgICAgICBzdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdG9rZW5BZnRlckFmdGVyQm9keShwLCB0b2tlbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0b2tlbkFmdGVyQWZ0ZXJCb2R5KHAsIHRva2VuKSB7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gSU5fQk9EWV9NT0RFO1xuICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG59XG5cbi8vIFRoZSBcImFmdGVyIGFmdGVyIGZyYW1lc2V0XCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzdGFydFRhZ0FmdGVyQWZ0ZXJGcmFtZXNldChwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnTmFtZTtcblxuICAgIGlmICh0biA9PT0gJC5IVE1MKSB7XG4gICAgICAgIHN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICB9IGVsc2UgaWYgKHRuID09PSAkLk5PRlJBTUVTKSB7XG4gICAgICAgIHN0YXJ0VGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICB9XG59XG5cbi8vIFRoZSBydWxlcyBmb3IgcGFyc2luZyB0b2tlbnMgaW4gZm9yZWlnbiBjb250ZW50XG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gbnVsbENoYXJhY3RlckluRm9yZWlnbkNvbnRlbnQocCwgdG9rZW4pIHtcbiAgICB0b2tlbi5jaGFycyA9IHVuaWNvZGUuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSO1xuICAgIHAuX2luc2VydENoYXJhY3RlcnModG9rZW4pO1xufVxuXG5mdW5jdGlvbiBjaGFyYWN0ZXJJbkZvcmVpZ25Db250ZW50KHAsIHRva2VuKSB7XG4gICAgcC5faW5zZXJ0Q2hhcmFjdGVycyh0b2tlbik7XG4gICAgcC5mcmFtZXNldE9rID0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0VGFnSW5Gb3JlaWduQ29udGVudChwLCB0b2tlbikge1xuICAgIGlmIChmb3JlaWduQ29udGVudC5jYXVzZXNFeGl0KHRva2VuKSAmJiAhcC5mcmFnbWVudENvbnRleHQpIHtcbiAgICAgICAgd2hpbGUgKFxuICAgICAgICAgICAgcC50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkocC5vcGVuRWxlbWVudHMuY3VycmVudCkgIT09IE5TLkhUTUwgJiZcbiAgICAgICAgICAgICFwLl9pc0ludGVncmF0aW9uUG9pbnQocC5vcGVuRWxlbWVudHMuY3VycmVudClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgY3VycmVudCA9IHAuX2dldEFkanVzdGVkQ3VycmVudEVsZW1lbnQoKTtcbiAgICAgICAgY29uc3QgY3VycmVudE5zID0gcC50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkoY3VycmVudCk7XG5cbiAgICAgICAgaWYgKGN1cnJlbnROcyA9PT0gTlMuTUFUSE1MKSB7XG4gICAgICAgICAgICBmb3JlaWduQ29udGVudC5hZGp1c3RUb2tlbk1hdGhNTEF0dHJzKHRva2VuKTtcbiAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50TnMgPT09IE5TLlNWRykge1xuICAgICAgICAgICAgZm9yZWlnbkNvbnRlbnQuYWRqdXN0VG9rZW5TVkdUYWdOYW1lKHRva2VuKTtcbiAgICAgICAgICAgIGZvcmVpZ25Db250ZW50LmFkanVzdFRva2VuU1ZHQXR0cnModG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yZWlnbkNvbnRlbnQuYWRqdXN0VG9rZW5YTUxBdHRycyh0b2tlbik7XG5cbiAgICAgICAgaWYgKHRva2VuLnNlbGZDbG9zaW5nKSB7XG4gICAgICAgICAgICBwLl9hcHBlbmRFbGVtZW50KHRva2VuLCBjdXJyZW50TnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgY3VycmVudE5zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuLmFja1NlbGZDbG9zaW5nID0gdHJ1ZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGVuZFRhZ0luRm9yZWlnbkNvbnRlbnQocCwgdG9rZW4pIHtcbiAgICBmb3IgKGxldCBpID0gcC5vcGVuRWxlbWVudHMuc3RhY2tUb3A7IGkgPiAwOyBpLS0pIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHAub3BlbkVsZW1lbnRzLml0ZW1zW2ldO1xuXG4gICAgICAgIGlmIChwLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSShlbGVtZW50KSA9PT0gTlMuSFRNTCkge1xuICAgICAgICAgICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHAudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZShlbGVtZW50KS50b0xvd2VyQ2FzZSgpID09PSB0b2tlbi50YWdOYW1lKSB7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3BVbnRpbEVsZW1lbnRQb3BwZWQoZWxlbWVudCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgSFRNTCA9IHJlcXVpcmUoJy4uL2NvbW1vbi9odG1sJyk7XG5cbi8vQWxpYXNlc1xuY29uc3QgJCA9IEhUTUwuVEFHX05BTUVTO1xuY29uc3QgTlMgPSBIVE1MLk5BTUVTUEFDRVM7XG5cbi8vRWxlbWVudCB1dGlsc1xuXG4vL09QVElNSVpBVElPTjogSW50ZWdlciBjb21wYXJpc29ucyBhcmUgbG93LWNvc3QsIHNvIHdlIGNhbiB1c2UgdmVyeSBmYXN0IHRhZyBuYW1lIGxlbmd0aCBmaWx0ZXJzIGhlcmUuXG4vL0l0J3MgZmFzdGVyIHRoYW4gdXNpbmcgZGljdGlvbmFyeS5cbmZ1bmN0aW9uIGlzSW1wbGllZEVuZFRhZ1JlcXVpcmVkKHRuKSB7XG4gICAgc3dpdGNoICh0bi5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgcmV0dXJuIHRuID09PSAkLlA7XG5cbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgcmV0dXJuIHRuID09PSAkLlJCIHx8IHRuID09PSAkLlJQIHx8IHRuID09PSAkLlJUIHx8IHRuID09PSAkLkREIHx8IHRuID09PSAkLkRUIHx8IHRuID09PSAkLkxJO1xuXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIHJldHVybiB0biA9PT0gJC5SVEM7XG5cbiAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgcmV0dXJuIHRuID09PSAkLk9QVElPTjtcblxuICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICByZXR1cm4gdG4gPT09ICQuT1BUR1JPVVA7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc0ltcGxpZWRFbmRUYWdSZXF1aXJlZFRob3JvdWdobHkodG4pIHtcbiAgICBzd2l0Y2ggKHRuLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICByZXR1cm4gdG4gPT09ICQuUDtcblxuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIHRuID09PSAkLlJCIHx8XG4gICAgICAgICAgICAgICAgdG4gPT09ICQuUlAgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5SVCB8fFxuICAgICAgICAgICAgICAgIHRuID09PSAkLkREIHx8XG4gICAgICAgICAgICAgICAgdG4gPT09ICQuRFQgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5MSSB8fFxuICAgICAgICAgICAgICAgIHRuID09PSAkLlREIHx8XG4gICAgICAgICAgICAgICAgdG4gPT09ICQuVEggfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5UUlxuICAgICAgICAgICAgKTtcblxuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICByZXR1cm4gdG4gPT09ICQuUlRDO1xuXG4gICAgICAgIGNhc2UgNTpcbiAgICAgICAgICAgIHJldHVybiB0biA9PT0gJC5UQk9EWSB8fCB0biA9PT0gJC5URk9PVCB8fCB0biA9PT0gJC5USEVBRDtcblxuICAgICAgICBjYXNlIDY6XG4gICAgICAgICAgICByZXR1cm4gdG4gPT09ICQuT1BUSU9OO1xuXG4gICAgICAgIGNhc2UgNzpcbiAgICAgICAgICAgIHJldHVybiB0biA9PT0gJC5DQVBUSU9OO1xuXG4gICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgIHJldHVybiB0biA9PT0gJC5PUFRHUk9VUCB8fCB0biA9PT0gJC5DT0xHUk9VUDtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzU2NvcGluZ0VsZW1lbnQodG4sIG5zKSB7XG4gICAgc3dpdGNoICh0bi5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgaWYgKHRuID09PSAkLlREIHx8IHRuID09PSAkLlRIKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5zID09PSBOUy5IVE1MO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0biA9PT0gJC5NSSB8fCB0biA9PT0gJC5NTyB8fCB0biA9PT0gJC5NTiB8fCB0biA9PT0gJC5NUykge1xuICAgICAgICAgICAgICAgIHJldHVybiBucyA9PT0gTlMuTUFUSE1MO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICBpZiAodG4gPT09ICQuSFRNTCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBucyA9PT0gTlMuSFRNTDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG4gPT09ICQuREVTQykge1xuICAgICAgICAgICAgICAgIHJldHVybiBucyA9PT0gTlMuU1ZHO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICBpZiAodG4gPT09ICQuVEFCTEUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnMgPT09IE5TLkhUTUw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLk1URVhUKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5zID09PSBOUy5NQVRITUw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRuID09PSAkLlRJVExFKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5zID09PSBOUy5TVkc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgIHJldHVybiAodG4gPT09ICQuQVBQTEVUIHx8IHRuID09PSAkLk9CSkVDVCkgJiYgbnMgPT09IE5TLkhUTUw7XG5cbiAgICAgICAgY2FzZSA3OlxuICAgICAgICAgICAgcmV0dXJuICh0biA9PT0gJC5DQVBUSU9OIHx8IHRuID09PSAkLk1BUlFVRUUpICYmIG5zID09PSBOUy5IVE1MO1xuXG4gICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgIHJldHVybiB0biA9PT0gJC5URU1QTEFURSAmJiBucyA9PT0gTlMuSFRNTDtcblxuICAgICAgICBjYXNlIDEzOlxuICAgICAgICAgICAgcmV0dXJuIHRuID09PSAkLkZPUkVJR05fT0JKRUNUICYmIG5zID09PSBOUy5TVkc7XG5cbiAgICAgICAgY2FzZSAxNDpcbiAgICAgICAgICAgIHJldHVybiB0biA9PT0gJC5BTk5PVEFUSU9OX1hNTCAmJiBucyA9PT0gTlMuTUFUSE1MO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLy9TdGFjayBvZiBvcGVuIGVsZW1lbnRzXG5jbGFzcyBPcGVuRWxlbWVudFN0YWNrIHtcbiAgICBjb25zdHJ1Y3Rvcihkb2N1bWVudCwgdHJlZUFkYXB0ZXIpIHtcbiAgICAgICAgdGhpcy5zdGFja1RvcCA9IC0xO1xuICAgICAgICB0aGlzLml0ZW1zID0gW107XG4gICAgICAgIHRoaXMuY3VycmVudCA9IGRvY3VtZW50O1xuICAgICAgICB0aGlzLmN1cnJlbnRUYWdOYW1lID0gbnVsbDtcbiAgICAgICAgdGhpcy5jdXJyZW50VG1wbENvbnRlbnQgPSBudWxsO1xuICAgICAgICB0aGlzLnRtcGxDb3VudCA9IDA7XG4gICAgICAgIHRoaXMudHJlZUFkYXB0ZXIgPSB0cmVlQWRhcHRlcjtcbiAgICB9XG5cbiAgICAvL0luZGV4IG9mIGVsZW1lbnRcbiAgICBfaW5kZXhPZihlbGVtZW50KSB7XG4gICAgICAgIGxldCBpZHggPSAtMTtcblxuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5zdGFja1RvcDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLml0ZW1zW2ldID09PSBlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgaWR4ID0gaTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaWR4O1xuICAgIH1cblxuICAgIC8vVXBkYXRlIGN1cnJlbnQgZWxlbWVudFxuICAgIF9pc0luVGVtcGxhdGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRUYWdOYW1lID09PSAkLlRFTVBMQVRFICYmIHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKHRoaXMuY3VycmVudCkgPT09IE5TLkhUTUw7XG4gICAgfVxuXG4gICAgX3VwZGF0ZUN1cnJlbnRFbGVtZW50KCkge1xuICAgICAgICB0aGlzLmN1cnJlbnQgPSB0aGlzLml0ZW1zW3RoaXMuc3RhY2tUb3BdO1xuICAgICAgICB0aGlzLmN1cnJlbnRUYWdOYW1lID0gdGhpcy5jdXJyZW50ICYmIHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZSh0aGlzLmN1cnJlbnQpO1xuXG4gICAgICAgIHRoaXMuY3VycmVudFRtcGxDb250ZW50ID0gdGhpcy5faXNJblRlbXBsYXRlKCkgPyB0aGlzLnRyZWVBZGFwdGVyLmdldFRlbXBsYXRlQ29udGVudCh0aGlzLmN1cnJlbnQpIDogbnVsbDtcbiAgICB9XG5cbiAgICAvL011dGF0aW9uc1xuICAgIHB1c2goZWxlbWVudCkge1xuICAgICAgICB0aGlzLml0ZW1zWysrdGhpcy5zdGFja1RvcF0gPSBlbGVtZW50O1xuICAgICAgICB0aGlzLl91cGRhdGVDdXJyZW50RWxlbWVudCgpO1xuXG4gICAgICAgIGlmICh0aGlzLl9pc0luVGVtcGxhdGUoKSkge1xuICAgICAgICAgICAgdGhpcy50bXBsQ291bnQrKztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBvcCgpIHtcbiAgICAgICAgdGhpcy5zdGFja1RvcC0tO1xuXG4gICAgICAgIGlmICh0aGlzLnRtcGxDb3VudCA+IDAgJiYgdGhpcy5faXNJblRlbXBsYXRlKCkpIHtcbiAgICAgICAgICAgIHRoaXMudG1wbENvdW50LS07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl91cGRhdGVDdXJyZW50RWxlbWVudCgpO1xuICAgIH1cblxuICAgIHJlcGxhY2Uob2xkRWxlbWVudCwgbmV3RWxlbWVudCkge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLl9pbmRleE9mKG9sZEVsZW1lbnQpO1xuXG4gICAgICAgIHRoaXMuaXRlbXNbaWR4XSA9IG5ld0VsZW1lbnQ7XG5cbiAgICAgICAgaWYgKGlkeCA9PT0gdGhpcy5zdGFja1RvcCkge1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlQ3VycmVudEVsZW1lbnQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGluc2VydEFmdGVyKHJlZmVyZW5jZUVsZW1lbnQsIG5ld0VsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgaW5zZXJ0aW9uSWR4ID0gdGhpcy5faW5kZXhPZihyZWZlcmVuY2VFbGVtZW50KSArIDE7XG5cbiAgICAgICAgdGhpcy5pdGVtcy5zcGxpY2UoaW5zZXJ0aW9uSWR4LCAwLCBuZXdFbGVtZW50KTtcblxuICAgICAgICBpZiAoaW5zZXJ0aW9uSWR4ID09PSArK3RoaXMuc3RhY2tUb3ApIHtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUN1cnJlbnRFbGVtZW50KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwb3BVbnRpbFRhZ05hbWVQb3BwZWQodGFnTmFtZSkge1xuICAgICAgICB3aGlsZSAodGhpcy5zdGFja1RvcCA+IC0xKSB7XG4gICAgICAgICAgICBjb25zdCB0biA9IHRoaXMuY3VycmVudFRhZ05hbWU7XG4gICAgICAgICAgICBjb25zdCBucyA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKHRoaXMuY3VycmVudCk7XG5cbiAgICAgICAgICAgIHRoaXMucG9wKCk7XG5cbiAgICAgICAgICAgIGlmICh0biA9PT0gdGFnTmFtZSAmJiBucyA9PT0gTlMuSFRNTCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcG9wVW50aWxFbGVtZW50UG9wcGVkKGVsZW1lbnQpIHtcbiAgICAgICAgd2hpbGUgKHRoaXMuc3RhY2tUb3AgPiAtMSkge1xuICAgICAgICAgICAgY29uc3QgcG9wcGVkRWxlbWVudCA9IHRoaXMuY3VycmVudDtcblxuICAgICAgICAgICAgdGhpcy5wb3AoKTtcblxuICAgICAgICAgICAgaWYgKHBvcHBlZEVsZW1lbnQgPT09IGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBvcFVudGlsTnVtYmVyZWRIZWFkZXJQb3BwZWQoKSB7XG4gICAgICAgIHdoaWxlICh0aGlzLnN0YWNrVG9wID4gLTEpIHtcbiAgICAgICAgICAgIGNvbnN0IHRuID0gdGhpcy5jdXJyZW50VGFnTmFtZTtcbiAgICAgICAgICAgIGNvbnN0IG5zID0gdGhpcy50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkodGhpcy5jdXJyZW50KTtcblxuICAgICAgICAgICAgdGhpcy5wb3AoKTtcblxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIHRuID09PSAkLkgxIHx8XG4gICAgICAgICAgICAgICAgdG4gPT09ICQuSDIgfHxcbiAgICAgICAgICAgICAgICB0biA9PT0gJC5IMyB8fFxuICAgICAgICAgICAgICAgIHRuID09PSAkLkg0IHx8XG4gICAgICAgICAgICAgICAgdG4gPT09ICQuSDUgfHxcbiAgICAgICAgICAgICAgICAodG4gPT09ICQuSDYgJiYgbnMgPT09IE5TLkhUTUwpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBvcFVudGlsVGFibGVDZWxsUG9wcGVkKCkge1xuICAgICAgICB3aGlsZSAodGhpcy5zdGFja1RvcCA+IC0xKSB7XG4gICAgICAgICAgICBjb25zdCB0biA9IHRoaXMuY3VycmVudFRhZ05hbWU7XG4gICAgICAgICAgICBjb25zdCBucyA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKHRoaXMuY3VycmVudCk7XG5cbiAgICAgICAgICAgIHRoaXMucG9wKCk7XG5cbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5URCB8fCAodG4gPT09ICQuVEggJiYgbnMgPT09IE5TLkhUTUwpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwb3BBbGxVcFRvSHRtbEVsZW1lbnQoKSB7XG4gICAgICAgIC8vTk9URTogaGVyZSB3ZSBhc3N1bWUgdGhhdCByb290IDxodG1sPiBlbGVtZW50IGlzIGFsd2F5cyBmaXJzdCBpbiB0aGUgb3BlbiBlbGVtZW50IHN0YWNrLCBzb1xuICAgICAgICAvL3dlIHBlcmZvcm0gdGhpcyBmYXN0IHN0YWNrIGNsZWFuIHVwLlxuICAgICAgICB0aGlzLnN0YWNrVG9wID0gMDtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ3VycmVudEVsZW1lbnQoKTtcbiAgICB9XG5cbiAgICBjbGVhckJhY2tUb1RhYmxlQ29udGV4dCgpIHtcbiAgICAgICAgd2hpbGUgKFxuICAgICAgICAgICAgKHRoaXMuY3VycmVudFRhZ05hbWUgIT09ICQuVEFCTEUgJiYgdGhpcy5jdXJyZW50VGFnTmFtZSAhPT0gJC5URU1QTEFURSAmJiB0aGlzLmN1cnJlbnRUYWdOYW1lICE9PSAkLkhUTUwpIHx8XG4gICAgICAgICAgICB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSSh0aGlzLmN1cnJlbnQpICE9PSBOUy5IVE1MXG4gICAgICAgICkge1xuICAgICAgICAgICAgdGhpcy5wb3AoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNsZWFyQmFja1RvVGFibGVCb2R5Q29udGV4dCgpIHtcbiAgICAgICAgd2hpbGUgKFxuICAgICAgICAgICAgKHRoaXMuY3VycmVudFRhZ05hbWUgIT09ICQuVEJPRFkgJiZcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUYWdOYW1lICE9PSAkLlRGT09UICYmXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGFnTmFtZSAhPT0gJC5USEVBRCAmJlxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRhZ05hbWUgIT09ICQuVEVNUExBVEUgJiZcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUYWdOYW1lICE9PSAkLkhUTUwpIHx8XG4gICAgICAgICAgICB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSSh0aGlzLmN1cnJlbnQpICE9PSBOUy5IVE1MXG4gICAgICAgICkge1xuICAgICAgICAgICAgdGhpcy5wb3AoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNsZWFyQmFja1RvVGFibGVSb3dDb250ZXh0KCkge1xuICAgICAgICB3aGlsZSAoXG4gICAgICAgICAgICAodGhpcy5jdXJyZW50VGFnTmFtZSAhPT0gJC5UUiAmJiB0aGlzLmN1cnJlbnRUYWdOYW1lICE9PSAkLlRFTVBMQVRFICYmIHRoaXMuY3VycmVudFRhZ05hbWUgIT09ICQuSFRNTCkgfHxcbiAgICAgICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKHRoaXMuY3VycmVudCkgIT09IE5TLkhUTUxcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB0aGlzLnBvcCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVtb3ZlKGVsZW1lbnQpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuc3RhY2tUb3A7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pdGVtc1tpXSA9PT0gZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhY2tUb3AtLTtcbiAgICAgICAgICAgICAgICB0aGlzLl91cGRhdGVDdXJyZW50RWxlbWVudCgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9TZWFyY2hcbiAgICB0cnlQZWVrUHJvcGVybHlOZXN0ZWRCb2R5RWxlbWVudCgpIHtcbiAgICAgICAgLy9Qcm9wZXJseSBuZXN0ZWQgPGJvZHk+IGVsZW1lbnQgKHNob3VsZCBiZSBzZWNvbmQgZWxlbWVudCBpbiBzdGFjaykuXG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLml0ZW1zWzFdO1xuXG4gICAgICAgIHJldHVybiBlbGVtZW50ICYmIHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZShlbGVtZW50KSA9PT0gJC5CT0RZID8gZWxlbWVudCA6IG51bGw7XG4gICAgfVxuXG4gICAgY29udGFpbnMoZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXhPZihlbGVtZW50KSA+IC0xO1xuICAgIH1cblxuICAgIGdldENvbW1vbkFuY2VzdG9yKGVsZW1lbnQpIHtcbiAgICAgICAgbGV0IGVsZW1lbnRJZHggPSB0aGlzLl9pbmRleE9mKGVsZW1lbnQpO1xuXG4gICAgICAgIHJldHVybiAtLWVsZW1lbnRJZHggPj0gMCA/IHRoaXMuaXRlbXNbZWxlbWVudElkeF0gOiBudWxsO1xuICAgIH1cblxuICAgIGlzUm9vdEh0bWxFbGVtZW50Q3VycmVudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhY2tUb3AgPT09IDAgJiYgdGhpcy5jdXJyZW50VGFnTmFtZSA9PT0gJC5IVE1MO1xuICAgIH1cblxuICAgIC8vRWxlbWVudCBpbiBzY29wZVxuICAgIGhhc0luU2NvcGUodGFnTmFtZSkge1xuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5zdGFja1RvcDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbnN0IHRuID0gdGhpcy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKHRoaXMuaXRlbXNbaV0pO1xuICAgICAgICAgICAgY29uc3QgbnMgPSB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSSh0aGlzLml0ZW1zW2ldKTtcblxuICAgICAgICAgICAgaWYgKHRuID09PSB0YWdOYW1lICYmIG5zID09PSBOUy5IVE1MKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpc1Njb3BpbmdFbGVtZW50KHRuLCBucykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBoYXNOdW1iZXJlZEhlYWRlckluU2NvcGUoKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLnN0YWNrVG9wOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgY29uc3QgdG4gPSB0aGlzLnRyZWVBZGFwdGVyLmdldFRhZ05hbWUodGhpcy5pdGVtc1tpXSk7XG4gICAgICAgICAgICBjb25zdCBucyA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKHRoaXMuaXRlbXNbaV0pO1xuXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgKHRuID09PSAkLkgxIHx8IHRuID09PSAkLkgyIHx8IHRuID09PSAkLkgzIHx8IHRuID09PSAkLkg0IHx8IHRuID09PSAkLkg1IHx8IHRuID09PSAkLkg2KSAmJlxuICAgICAgICAgICAgICAgIG5zID09PSBOUy5IVE1MXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGlzU2NvcGluZ0VsZW1lbnQodG4sIG5zKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGhhc0luTGlzdEl0ZW1TY29wZSh0YWdOYW1lKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLnN0YWNrVG9wOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgY29uc3QgdG4gPSB0aGlzLnRyZWVBZGFwdGVyLmdldFRhZ05hbWUodGhpcy5pdGVtc1tpXSk7XG4gICAgICAgICAgICBjb25zdCBucyA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKHRoaXMuaXRlbXNbaV0pO1xuXG4gICAgICAgICAgICBpZiAodG4gPT09IHRhZ05hbWUgJiYgbnMgPT09IE5TLkhUTUwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCgodG4gPT09ICQuVUwgfHwgdG4gPT09ICQuT0wpICYmIG5zID09PSBOUy5IVE1MKSB8fCBpc1Njb3BpbmdFbGVtZW50KHRuLCBucykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBoYXNJbkJ1dHRvblNjb3BlKHRhZ05hbWUpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuc3RhY2tUb3A7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICBjb25zdCB0biA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZSh0aGlzLml0ZW1zW2ldKTtcbiAgICAgICAgICAgIGNvbnN0IG5zID0gdGhpcy50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkodGhpcy5pdGVtc1tpXSk7XG5cbiAgICAgICAgICAgIGlmICh0biA9PT0gdGFnTmFtZSAmJiBucyA9PT0gTlMuSFRNTCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoKHRuID09PSAkLkJVVFRPTiAmJiBucyA9PT0gTlMuSFRNTCkgfHwgaXNTY29waW5nRWxlbWVudCh0biwgbnMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaGFzSW5UYWJsZVNjb3BlKHRhZ05hbWUpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuc3RhY2tUb3A7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICBjb25zdCB0biA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZSh0aGlzLml0ZW1zW2ldKTtcbiAgICAgICAgICAgIGNvbnN0IG5zID0gdGhpcy50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkodGhpcy5pdGVtc1tpXSk7XG5cbiAgICAgICAgICAgIGlmIChucyAhPT0gTlMuSFRNTCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodG4gPT09IHRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRuID09PSAkLlRBQkxFIHx8IHRuID09PSAkLlRFTVBMQVRFIHx8IHRuID09PSAkLkhUTUwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBoYXNUYWJsZUJvZHlDb250ZXh0SW5UYWJsZVNjb3BlKCkge1xuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5zdGFja1RvcDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbnN0IHRuID0gdGhpcy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKHRoaXMuaXRlbXNbaV0pO1xuICAgICAgICAgICAgY29uc3QgbnMgPSB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSSh0aGlzLml0ZW1zW2ldKTtcblxuICAgICAgICAgICAgaWYgKG5zICE9PSBOUy5IVE1MKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0biA9PT0gJC5UQk9EWSB8fCB0biA9PT0gJC5USEVBRCB8fCB0biA9PT0gJC5URk9PVCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodG4gPT09ICQuVEFCTEUgfHwgdG4gPT09ICQuSFRNTCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGhhc0luU2VsZWN0U2NvcGUodGFnTmFtZSkge1xuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5zdGFja1RvcDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbnN0IHRuID0gdGhpcy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKHRoaXMuaXRlbXNbaV0pO1xuICAgICAgICAgICAgY29uc3QgbnMgPSB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSSh0aGlzLml0ZW1zW2ldKTtcblxuICAgICAgICAgICAgaWYgKG5zICE9PSBOUy5IVE1MKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0biA9PT0gdGFnTmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodG4gIT09ICQuT1BUSU9OICYmIHRuICE9PSAkLk9QVEdST1VQKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy9JbXBsaWVkIGVuZCB0YWdzXG4gICAgZ2VuZXJhdGVJbXBsaWVkRW5kVGFncygpIHtcbiAgICAgICAgd2hpbGUgKGlzSW1wbGllZEVuZFRhZ1JlcXVpcmVkKHRoaXMuY3VycmVudFRhZ05hbWUpKSB7XG4gICAgICAgICAgICB0aGlzLnBvcCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVJbXBsaWVkRW5kVGFnc1Rob3JvdWdobHkoKSB7XG4gICAgICAgIHdoaWxlIChpc0ltcGxpZWRFbmRUYWdSZXF1aXJlZFRob3JvdWdobHkodGhpcy5jdXJyZW50VGFnTmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMucG9wKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZW5lcmF0ZUltcGxpZWRFbmRUYWdzV2l0aEV4Y2x1c2lvbihleGNsdXNpb25UYWdOYW1lKSB7XG4gICAgICAgIHdoaWxlIChpc0ltcGxpZWRFbmRUYWdSZXF1aXJlZCh0aGlzLmN1cnJlbnRUYWdOYW1lKSAmJiB0aGlzLmN1cnJlbnRUYWdOYW1lICE9PSBleGNsdXNpb25UYWdOYW1lKSB7XG4gICAgICAgICAgICB0aGlzLnBvcCgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE9wZW5FbGVtZW50U3RhY2s7XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IGRlZmF1bHRUcmVlQWRhcHRlciA9IHJlcXVpcmUoJy4uL3RyZWUtYWRhcHRlcnMvZGVmYXVsdCcpO1xuY29uc3QgbWVyZ2VPcHRpb25zID0gcmVxdWlyZSgnLi4vdXRpbHMvbWVyZ2Utb3B0aW9ucycpO1xuY29uc3QgZG9jdHlwZSA9IHJlcXVpcmUoJy4uL2NvbW1vbi9kb2N0eXBlJyk7XG5jb25zdCBIVE1MID0gcmVxdWlyZSgnLi4vY29tbW9uL2h0bWwnKTtcblxuLy9BbGlhc2VzXG5jb25zdCAkID0gSFRNTC5UQUdfTkFNRVM7XG5jb25zdCBOUyA9IEhUTUwuTkFNRVNQQUNFUztcblxuLy9EZWZhdWx0IHNlcmlhbGl6ZXIgb3B0aW9uc1xuY29uc3QgREVGQVVMVF9PUFRJT05TID0ge1xuICAgIHRyZWVBZGFwdGVyOiBkZWZhdWx0VHJlZUFkYXB0ZXJcbn07XG5cbi8vRXNjYXBpbmcgcmVnZXhlc1xuY29uc3QgQU1QX1JFR0VYID0gLyYvZztcbmNvbnN0IE5CU1BfUkVHRVggPSAvXFx1MDBhMC9nO1xuY29uc3QgRE9VQkxFX1FVT1RFX1JFR0VYID0gL1wiL2c7XG5jb25zdCBMVF9SRUdFWCA9IC88L2c7XG5jb25zdCBHVF9SRUdFWCA9IC8+L2c7XG5cbi8vU2VyaWFsaXplclxuY2xhc3MgU2VyaWFsaXplciB7XG4gICAgY29uc3RydWN0b3Iobm9kZSwgb3B0aW9ucykge1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBtZXJnZU9wdGlvbnMoREVGQVVMVF9PUFRJT05TLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy50cmVlQWRhcHRlciA9IHRoaXMub3B0aW9ucy50cmVlQWRhcHRlcjtcblxuICAgICAgICB0aGlzLmh0bWwgPSAnJztcbiAgICAgICAgdGhpcy5zdGFydE5vZGUgPSBub2RlO1xuICAgIH1cblxuICAgIC8vQVBJXG4gICAgc2VyaWFsaXplKCkge1xuICAgICAgICB0aGlzLl9zZXJpYWxpemVDaGlsZE5vZGVzKHRoaXMuc3RhcnROb2RlKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5odG1sO1xuICAgIH1cblxuICAgIC8vSW50ZXJuYWxzXG4gICAgX3NlcmlhbGl6ZUNoaWxkTm9kZXMocGFyZW50Tm9kZSkge1xuICAgICAgICBjb25zdCBjaGlsZE5vZGVzID0gdGhpcy50cmVlQWRhcHRlci5nZXRDaGlsZE5vZGVzKHBhcmVudE5vZGUpO1xuXG4gICAgICAgIGlmIChjaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgY25MZW5ndGggPSBjaGlsZE5vZGVzLmxlbmd0aDsgaSA8IGNuTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Tm9kZSA9IGNoaWxkTm9kZXNbaV07XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy50cmVlQWRhcHRlci5pc0VsZW1lbnROb2RlKGN1cnJlbnROb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXJpYWxpemVFbGVtZW50KGN1cnJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMudHJlZUFkYXB0ZXIuaXNUZXh0Tm9kZShjdXJyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2VyaWFsaXplVGV4dE5vZGUoY3VycmVudE5vZGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy50cmVlQWRhcHRlci5pc0NvbW1lbnROb2RlKGN1cnJlbnROb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXJpYWxpemVDb21tZW50Tm9kZShjdXJyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnRyZWVBZGFwdGVyLmlzRG9jdW1lbnRUeXBlTm9kZShjdXJyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2VyaWFsaXplRG9jdW1lbnRUeXBlTm9kZShjdXJyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgX3NlcmlhbGl6ZUVsZW1lbnQobm9kZSkge1xuICAgICAgICBjb25zdCB0biA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZShub2RlKTtcbiAgICAgICAgY29uc3QgbnMgPSB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSShub2RlKTtcblxuICAgICAgICB0aGlzLmh0bWwgKz0gJzwnICsgdG47XG4gICAgICAgIHRoaXMuX3NlcmlhbGl6ZUF0dHJpYnV0ZXMobm9kZSk7XG4gICAgICAgIHRoaXMuaHRtbCArPSAnPic7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgdG4gIT09ICQuQVJFQSAmJlxuICAgICAgICAgICAgdG4gIT09ICQuQkFTRSAmJlxuICAgICAgICAgICAgdG4gIT09ICQuQkFTRUZPTlQgJiZcbiAgICAgICAgICAgIHRuICE9PSAkLkJHU09VTkQgJiZcbiAgICAgICAgICAgIHRuICE9PSAkLkJSICYmXG4gICAgICAgICAgICB0biAhPT0gJC5DT0wgJiZcbiAgICAgICAgICAgIHRuICE9PSAkLkVNQkVEICYmXG4gICAgICAgICAgICB0biAhPT0gJC5GUkFNRSAmJlxuICAgICAgICAgICAgdG4gIT09ICQuSFIgJiZcbiAgICAgICAgICAgIHRuICE9PSAkLklNRyAmJlxuICAgICAgICAgICAgdG4gIT09ICQuSU5QVVQgJiZcbiAgICAgICAgICAgIHRuICE9PSAkLktFWUdFTiAmJlxuICAgICAgICAgICAgdG4gIT09ICQuTElOSyAmJlxuICAgICAgICAgICAgdG4gIT09ICQuTUVUQSAmJlxuICAgICAgICAgICAgdG4gIT09ICQuUEFSQU0gJiZcbiAgICAgICAgICAgIHRuICE9PSAkLlNPVVJDRSAmJlxuICAgICAgICAgICAgdG4gIT09ICQuVFJBQ0sgJiZcbiAgICAgICAgICAgIHRuICE9PSAkLldCUlxuICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkTm9kZXNIb2xkZXIgPVxuICAgICAgICAgICAgICAgIHRuID09PSAkLlRFTVBMQVRFICYmIG5zID09PSBOUy5IVE1MID8gdGhpcy50cmVlQWRhcHRlci5nZXRUZW1wbGF0ZUNvbnRlbnQobm9kZSkgOiBub2RlO1xuXG4gICAgICAgICAgICB0aGlzLl9zZXJpYWxpemVDaGlsZE5vZGVzKGNoaWxkTm9kZXNIb2xkZXIpO1xuICAgICAgICAgICAgdGhpcy5odG1sICs9ICc8LycgKyB0biArICc+JztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9zZXJpYWxpemVBdHRyaWJ1dGVzKG5vZGUpIHtcbiAgICAgICAgY29uc3QgYXR0cnMgPSB0aGlzLnRyZWVBZGFwdGVyLmdldEF0dHJMaXN0KG5vZGUpO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBhdHRyc0xlbmd0aCA9IGF0dHJzLmxlbmd0aDsgaSA8IGF0dHJzTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGF0dHIgPSBhdHRyc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gU2VyaWFsaXplci5lc2NhcGVTdHJpbmcoYXR0ci52YWx1ZSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIHRoaXMuaHRtbCArPSAnICc7XG5cbiAgICAgICAgICAgIGlmICghYXR0ci5uYW1lc3BhY2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWwgKz0gYXR0ci5uYW1lO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhdHRyLm5hbWVzcGFjZSA9PT0gTlMuWE1MKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sICs9ICd4bWw6JyArIGF0dHIubmFtZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXR0ci5uYW1lc3BhY2UgPT09IE5TLlhNTE5TKSB7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHIubmFtZSAhPT0gJ3htbG5zJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmh0bWwgKz0gJ3htbG5zOic7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5odG1sICs9IGF0dHIubmFtZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXR0ci5uYW1lc3BhY2UgPT09IE5TLlhMSU5LKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sICs9ICd4bGluazonICsgYXR0ci5uYW1lO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmh0bWwgKz0gYXR0ci5wcmVmaXggKyAnOicgKyBhdHRyLm5hbWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuaHRtbCArPSAnPVwiJyArIHZhbHVlICsgJ1wiJztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9zZXJpYWxpemVUZXh0Tm9kZShub2RlKSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0aGlzLnRyZWVBZGFwdGVyLmdldFRleHROb2RlQ29udGVudChub2RlKTtcbiAgICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy50cmVlQWRhcHRlci5nZXRQYXJlbnROb2RlKG5vZGUpO1xuICAgICAgICBsZXQgcGFyZW50VG4gPSB2b2lkIDA7XG5cbiAgICAgICAgaWYgKHBhcmVudCAmJiB0aGlzLnRyZWVBZGFwdGVyLmlzRWxlbWVudE5vZGUocGFyZW50KSkge1xuICAgICAgICAgICAgcGFyZW50VG4gPSB0aGlzLnRyZWVBZGFwdGVyLmdldFRhZ05hbWUocGFyZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHBhcmVudFRuID09PSAkLlNUWUxFIHx8XG4gICAgICAgICAgICBwYXJlbnRUbiA9PT0gJC5TQ1JJUFQgfHxcbiAgICAgICAgICAgIHBhcmVudFRuID09PSAkLlhNUCB8fFxuICAgICAgICAgICAgcGFyZW50VG4gPT09ICQuSUZSQU1FIHx8XG4gICAgICAgICAgICBwYXJlbnRUbiA9PT0gJC5OT0VNQkVEIHx8XG4gICAgICAgICAgICBwYXJlbnRUbiA9PT0gJC5OT0ZSQU1FUyB8fFxuICAgICAgICAgICAgcGFyZW50VG4gPT09ICQuUExBSU5URVhUIHx8XG4gICAgICAgICAgICBwYXJlbnRUbiA9PT0gJC5OT1NDUklQVFxuICAgICAgICApIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbCArPSBjb250ZW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5odG1sICs9IFNlcmlhbGl6ZXIuZXNjYXBlU3RyaW5nKGNvbnRlbnQsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9zZXJpYWxpemVDb21tZW50Tm9kZShub2RlKSB7XG4gICAgICAgIHRoaXMuaHRtbCArPSAnPCEtLScgKyB0aGlzLnRyZWVBZGFwdGVyLmdldENvbW1lbnROb2RlQ29udGVudChub2RlKSArICctLT4nO1xuICAgIH1cblxuICAgIF9zZXJpYWxpemVEb2N1bWVudFR5cGVOb2RlKG5vZGUpIHtcbiAgICAgICAgY29uc3QgbmFtZSA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0RG9jdW1lbnRUeXBlTm9kZU5hbWUobm9kZSk7XG5cbiAgICAgICAgdGhpcy5odG1sICs9ICc8JyArIGRvY3R5cGUuc2VyaWFsaXplQ29udGVudChuYW1lLCBudWxsLCBudWxsKSArICc+JztcbiAgICB9XG59XG5cbi8vIE5PVEU6IHVzZWQgaW4gdGVzdHMgYW5kIGJ5IHJld3JpdGluZyBzdHJlYW1cblNlcmlhbGl6ZXIuZXNjYXBlU3RyaW5nID0gZnVuY3Rpb24oc3RyLCBhdHRyTW9kZSkge1xuICAgIHN0ciA9IHN0ci5yZXBsYWNlKEFNUF9SRUdFWCwgJyZhbXA7JykucmVwbGFjZShOQlNQX1JFR0VYLCAnJm5ic3A7Jyk7XG5cbiAgICBpZiAoYXR0ck1vZGUpIHtcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoRE9VQkxFX1FVT1RFX1JFR0VYLCAnJnF1b3Q7Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoTFRfUkVHRVgsICcmbHQ7JykucmVwbGFjZShHVF9SRUdFWCwgJyZndDsnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTZXJpYWxpemVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBQcmVwcm9jZXNzb3IgPSByZXF1aXJlKCcuL3ByZXByb2Nlc3NvcicpO1xuY29uc3QgdW5pY29kZSA9IHJlcXVpcmUoJy4uL2NvbW1vbi91bmljb2RlJyk7XG5jb25zdCBuZVRyZWUgPSByZXF1aXJlKCcuL25hbWVkLWVudGl0eS1kYXRhJyk7XG5jb25zdCBFUlIgPSByZXF1aXJlKCcuLi9jb21tb24vZXJyb3ItY29kZXMnKTtcblxuLy9BbGlhc2VzXG5jb25zdCAkID0gdW5pY29kZS5DT0RFX1BPSU5UUztcbmNvbnN0ICQkID0gdW5pY29kZS5DT0RFX1BPSU5UX1NFUVVFTkNFUztcblxuLy9DMSBVbmljb2RlIGNvbnRyb2wgY2hhcmFjdGVyIHJlZmVyZW5jZSByZXBsYWNlbWVudHNcbmNvbnN0IEMxX0NPTlRST0xTX1JFRkVSRU5DRV9SRVBMQUNFTUVOVFMgPSB7XG4gICAgMHg4MDogMHgyMGFjLFxuICAgIDB4ODI6IDB4MjAxYSxcbiAgICAweDgzOiAweDAxOTIsXG4gICAgMHg4NDogMHgyMDFlLFxuICAgIDB4ODU6IDB4MjAyNixcbiAgICAweDg2OiAweDIwMjAsXG4gICAgMHg4NzogMHgyMDIxLFxuICAgIDB4ODg6IDB4MDJjNixcbiAgICAweDg5OiAweDIwMzAsXG4gICAgMHg4YTogMHgwMTYwLFxuICAgIDB4OGI6IDB4MjAzOSxcbiAgICAweDhjOiAweDAxNTIsXG4gICAgMHg4ZTogMHgwMTdkLFxuICAgIDB4OTE6IDB4MjAxOCxcbiAgICAweDkyOiAweDIwMTksXG4gICAgMHg5MzogMHgyMDFjLFxuICAgIDB4OTQ6IDB4MjAxZCxcbiAgICAweDk1OiAweDIwMjIsXG4gICAgMHg5NjogMHgyMDEzLFxuICAgIDB4OTc6IDB4MjAxNCxcbiAgICAweDk4OiAweDAyZGMsXG4gICAgMHg5OTogMHgyMTIyLFxuICAgIDB4OWE6IDB4MDE2MSxcbiAgICAweDliOiAweDIwM2EsXG4gICAgMHg5YzogMHgwMTUzLFxuICAgIDB4OWU6IDB4MDE3ZSxcbiAgICAweDlmOiAweDAxNzhcbn07XG5cbi8vIE5hbWVkIGVudGl0eSB0cmVlIGZsYWdzXG5jb25zdCBIQVNfREFUQV9GTEFHID0gMSA8PCAwO1xuY29uc3QgREFUQV9EVVBMRVRfRkxBRyA9IDEgPDwgMTtcbmNvbnN0IEhBU19CUkFOQ0hFU19GTEFHID0gMSA8PCAyO1xuY29uc3QgTUFYX0JSQU5DSF9NQVJLRVJfVkFMVUUgPSBIQVNfREFUQV9GTEFHIHwgREFUQV9EVVBMRVRfRkxBRyB8IEhBU19CUkFOQ0hFU19GTEFHO1xuXG4vL1N0YXRlc1xuY29uc3QgREFUQV9TVEFURSA9ICdEQVRBX1NUQVRFJztcbmNvbnN0IFJDREFUQV9TVEFURSA9ICdSQ0RBVEFfU1RBVEUnO1xuY29uc3QgUkFXVEVYVF9TVEFURSA9ICdSQVdURVhUX1NUQVRFJztcbmNvbnN0IFNDUklQVF9EQVRBX1NUQVRFID0gJ1NDUklQVF9EQVRBX1NUQVRFJztcbmNvbnN0IFBMQUlOVEVYVF9TVEFURSA9ICdQTEFJTlRFWFRfU1RBVEUnO1xuY29uc3QgVEFHX09QRU5fU1RBVEUgPSAnVEFHX09QRU5fU1RBVEUnO1xuY29uc3QgRU5EX1RBR19PUEVOX1NUQVRFID0gJ0VORF9UQUdfT1BFTl9TVEFURSc7XG5jb25zdCBUQUdfTkFNRV9TVEFURSA9ICdUQUdfTkFNRV9TVEFURSc7XG5jb25zdCBSQ0RBVEFfTEVTU19USEFOX1NJR05fU1RBVEUgPSAnUkNEQVRBX0xFU1NfVEhBTl9TSUdOX1NUQVRFJztcbmNvbnN0IFJDREFUQV9FTkRfVEFHX09QRU5fU1RBVEUgPSAnUkNEQVRBX0VORF9UQUdfT1BFTl9TVEFURSc7XG5jb25zdCBSQ0RBVEFfRU5EX1RBR19OQU1FX1NUQVRFID0gJ1JDREFUQV9FTkRfVEFHX05BTUVfU1RBVEUnO1xuY29uc3QgUkFXVEVYVF9MRVNTX1RIQU5fU0lHTl9TVEFURSA9ICdSQVdURVhUX0xFU1NfVEhBTl9TSUdOX1NUQVRFJztcbmNvbnN0IFJBV1RFWFRfRU5EX1RBR19PUEVOX1NUQVRFID0gJ1JBV1RFWFRfRU5EX1RBR19PUEVOX1NUQVRFJztcbmNvbnN0IFJBV1RFWFRfRU5EX1RBR19OQU1FX1NUQVRFID0gJ1JBV1RFWFRfRU5EX1RBR19OQU1FX1NUQVRFJztcbmNvbnN0IFNDUklQVF9EQVRBX0xFU1NfVEhBTl9TSUdOX1NUQVRFID0gJ1NDUklQVF9EQVRBX0xFU1NfVEhBTl9TSUdOX1NUQVRFJztcbmNvbnN0IFNDUklQVF9EQVRBX0VORF9UQUdfT1BFTl9TVEFURSA9ICdTQ1JJUFRfREFUQV9FTkRfVEFHX09QRU5fU1RBVEUnO1xuY29uc3QgU0NSSVBUX0RBVEFfRU5EX1RBR19OQU1FX1NUQVRFID0gJ1NDUklQVF9EQVRBX0VORF9UQUdfTkFNRV9TVEFURSc7XG5jb25zdCBTQ1JJUFRfREFUQV9FU0NBUEVfU1RBUlRfU1RBVEUgPSAnU0NSSVBUX0RBVEFfRVNDQVBFX1NUQVJUX1NUQVRFJztcbmNvbnN0IFNDUklQVF9EQVRBX0VTQ0FQRV9TVEFSVF9EQVNIX1NUQVRFID0gJ1NDUklQVF9EQVRBX0VTQ0FQRV9TVEFSVF9EQVNIX1NUQVRFJztcbmNvbnN0IFNDUklQVF9EQVRBX0VTQ0FQRURfU1RBVEUgPSAnU0NSSVBUX0RBVEFfRVNDQVBFRF9TVEFURSc7XG5jb25zdCBTQ1JJUFRfREFUQV9FU0NBUEVEX0RBU0hfU1RBVEUgPSAnU0NSSVBUX0RBVEFfRVNDQVBFRF9EQVNIX1NUQVRFJztcbmNvbnN0IFNDUklQVF9EQVRBX0VTQ0FQRURfREFTSF9EQVNIX1NUQVRFID0gJ1NDUklQVF9EQVRBX0VTQ0FQRURfREFTSF9EQVNIX1NUQVRFJztcbmNvbnN0IFNDUklQVF9EQVRBX0VTQ0FQRURfTEVTU19USEFOX1NJR05fU1RBVEUgPSAnU0NSSVBUX0RBVEFfRVNDQVBFRF9MRVNTX1RIQU5fU0lHTl9TVEFURSc7XG5jb25zdCBTQ1JJUFRfREFUQV9FU0NBUEVEX0VORF9UQUdfT1BFTl9TVEFURSA9ICdTQ1JJUFRfREFUQV9FU0NBUEVEX0VORF9UQUdfT1BFTl9TVEFURSc7XG5jb25zdCBTQ1JJUFRfREFUQV9FU0NBUEVEX0VORF9UQUdfTkFNRV9TVEFURSA9ICdTQ1JJUFRfREFUQV9FU0NBUEVEX0VORF9UQUdfTkFNRV9TVEFURSc7XG5jb25zdCBTQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFX1NUQVJUX1NUQVRFID0gJ1NDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVfU1RBUlRfU1RBVEUnO1xuY29uc3QgU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfU1RBVEUgPSAnU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfU1RBVEUnO1xuY29uc3QgU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfREFTSF9TVEFURSA9ICdTQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFRF9EQVNIX1NUQVRFJztcbmNvbnN0IFNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX0RBU0hfREFTSF9TVEFURSA9ICdTQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFRF9EQVNIX0RBU0hfU1RBVEUnO1xuY29uc3QgU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfTEVTU19USEFOX1NJR05fU1RBVEUgPSAnU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfTEVTU19USEFOX1NJR05fU1RBVEUnO1xuY29uc3QgU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRV9FTkRfU1RBVEUgPSAnU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRV9FTkRfU1RBVEUnO1xuY29uc3QgQkVGT1JFX0FUVFJJQlVURV9OQU1FX1NUQVRFID0gJ0JFRk9SRV9BVFRSSUJVVEVfTkFNRV9TVEFURSc7XG5jb25zdCBBVFRSSUJVVEVfTkFNRV9TVEFURSA9ICdBVFRSSUJVVEVfTkFNRV9TVEFURSc7XG5jb25zdCBBRlRFUl9BVFRSSUJVVEVfTkFNRV9TVEFURSA9ICdBRlRFUl9BVFRSSUJVVEVfTkFNRV9TVEFURSc7XG5jb25zdCBCRUZPUkVfQVRUUklCVVRFX1ZBTFVFX1NUQVRFID0gJ0JFRk9SRV9BVFRSSUJVVEVfVkFMVUVfU1RBVEUnO1xuY29uc3QgQVRUUklCVVRFX1ZBTFVFX0RPVUJMRV9RVU9URURfU1RBVEUgPSAnQVRUUklCVVRFX1ZBTFVFX0RPVUJMRV9RVU9URURfU1RBVEUnO1xuY29uc3QgQVRUUklCVVRFX1ZBTFVFX1NJTkdMRV9RVU9URURfU1RBVEUgPSAnQVRUUklCVVRFX1ZBTFVFX1NJTkdMRV9RVU9URURfU1RBVEUnO1xuY29uc3QgQVRUUklCVVRFX1ZBTFVFX1VOUVVPVEVEX1NUQVRFID0gJ0FUVFJJQlVURV9WQUxVRV9VTlFVT1RFRF9TVEFURSc7XG5jb25zdCBBRlRFUl9BVFRSSUJVVEVfVkFMVUVfUVVPVEVEX1NUQVRFID0gJ0FGVEVSX0FUVFJJQlVURV9WQUxVRV9RVU9URURfU1RBVEUnO1xuY29uc3QgU0VMRl9DTE9TSU5HX1NUQVJUX1RBR19TVEFURSA9ICdTRUxGX0NMT1NJTkdfU1RBUlRfVEFHX1NUQVRFJztcbmNvbnN0IEJPR1VTX0NPTU1FTlRfU1RBVEUgPSAnQk9HVVNfQ09NTUVOVF9TVEFURSc7XG5jb25zdCBNQVJLVVBfREVDTEFSQVRJT05fT1BFTl9TVEFURSA9ICdNQVJLVVBfREVDTEFSQVRJT05fT1BFTl9TVEFURSc7XG5jb25zdCBDT01NRU5UX1NUQVJUX1NUQVRFID0gJ0NPTU1FTlRfU1RBUlRfU1RBVEUnO1xuY29uc3QgQ09NTUVOVF9TVEFSVF9EQVNIX1NUQVRFID0gJ0NPTU1FTlRfU1RBUlRfREFTSF9TVEFURSc7XG5jb25zdCBDT01NRU5UX1NUQVRFID0gJ0NPTU1FTlRfU1RBVEUnO1xuY29uc3QgQ09NTUVOVF9MRVNTX1RIQU5fU0lHTl9TVEFURSA9ICdDT01NRU5UX0xFU1NfVEhBTl9TSUdOX1NUQVRFJztcbmNvbnN0IENPTU1FTlRfTEVTU19USEFOX1NJR05fQkFOR19TVEFURSA9ICdDT01NRU5UX0xFU1NfVEhBTl9TSUdOX0JBTkdfU1RBVEUnO1xuY29uc3QgQ09NTUVOVF9MRVNTX1RIQU5fU0lHTl9CQU5HX0RBU0hfU1RBVEUgPSAnQ09NTUVOVF9MRVNTX1RIQU5fU0lHTl9CQU5HX0RBU0hfU1RBVEUnO1xuY29uc3QgQ09NTUVOVF9MRVNTX1RIQU5fU0lHTl9CQU5HX0RBU0hfREFTSF9TVEFURSA9ICdDT01NRU5UX0xFU1NfVEhBTl9TSUdOX0JBTkdfREFTSF9EQVNIX1NUQVRFJztcbmNvbnN0IENPTU1FTlRfRU5EX0RBU0hfU1RBVEUgPSAnQ09NTUVOVF9FTkRfREFTSF9TVEFURSc7XG5jb25zdCBDT01NRU5UX0VORF9TVEFURSA9ICdDT01NRU5UX0VORF9TVEFURSc7XG5jb25zdCBDT01NRU5UX0VORF9CQU5HX1NUQVRFID0gJ0NPTU1FTlRfRU5EX0JBTkdfU1RBVEUnO1xuY29uc3QgRE9DVFlQRV9TVEFURSA9ICdET0NUWVBFX1NUQVRFJztcbmNvbnN0IEJFRk9SRV9ET0NUWVBFX05BTUVfU1RBVEUgPSAnQkVGT1JFX0RPQ1RZUEVfTkFNRV9TVEFURSc7XG5jb25zdCBET0NUWVBFX05BTUVfU1RBVEUgPSAnRE9DVFlQRV9OQU1FX1NUQVRFJztcbmNvbnN0IEFGVEVSX0RPQ1RZUEVfTkFNRV9TVEFURSA9ICdBRlRFUl9ET0NUWVBFX05BTUVfU1RBVEUnO1xuY29uc3QgQUZURVJfRE9DVFlQRV9QVUJMSUNfS0VZV09SRF9TVEFURSA9ICdBRlRFUl9ET0NUWVBFX1BVQkxJQ19LRVlXT1JEX1NUQVRFJztcbmNvbnN0IEJFRk9SRV9ET0NUWVBFX1BVQkxJQ19JREVOVElGSUVSX1NUQVRFID0gJ0JFRk9SRV9ET0NUWVBFX1BVQkxJQ19JREVOVElGSUVSX1NUQVRFJztcbmNvbnN0IERPQ1RZUEVfUFVCTElDX0lERU5USUZJRVJfRE9VQkxFX1FVT1RFRF9TVEFURSA9ICdET0NUWVBFX1BVQkxJQ19JREVOVElGSUVSX0RPVUJMRV9RVU9URURfU1RBVEUnO1xuY29uc3QgRE9DVFlQRV9QVUJMSUNfSURFTlRJRklFUl9TSU5HTEVfUVVPVEVEX1NUQVRFID0gJ0RPQ1RZUEVfUFVCTElDX0lERU5USUZJRVJfU0lOR0xFX1FVT1RFRF9TVEFURSc7XG5jb25zdCBBRlRFUl9ET0NUWVBFX1BVQkxJQ19JREVOVElGSUVSX1NUQVRFID0gJ0FGVEVSX0RPQ1RZUEVfUFVCTElDX0lERU5USUZJRVJfU1RBVEUnO1xuY29uc3QgQkVUV0VFTl9ET0NUWVBFX1BVQkxJQ19BTkRfU1lTVEVNX0lERU5USUZJRVJTX1NUQVRFID0gJ0JFVFdFRU5fRE9DVFlQRV9QVUJMSUNfQU5EX1NZU1RFTV9JREVOVElGSUVSU19TVEFURSc7XG5jb25zdCBBRlRFUl9ET0NUWVBFX1NZU1RFTV9LRVlXT1JEX1NUQVRFID0gJ0FGVEVSX0RPQ1RZUEVfU1lTVEVNX0tFWVdPUkRfU1RBVEUnO1xuY29uc3QgQkVGT1JFX0RPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVJfU1RBVEUgPSAnQkVGT1JFX0RPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVJfU1RBVEUnO1xuY29uc3QgRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUl9ET1VCTEVfUVVPVEVEX1NUQVRFID0gJ0RPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVJfRE9VQkxFX1FVT1RFRF9TVEFURSc7XG5jb25zdCBET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSX1NJTkdMRV9RVU9URURfU1RBVEUgPSAnRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUl9TSU5HTEVfUVVPVEVEX1NUQVRFJztcbmNvbnN0IEFGVEVSX0RPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVJfU1RBVEUgPSAnQUZURVJfRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUl9TVEFURSc7XG5jb25zdCBCT0dVU19ET0NUWVBFX1NUQVRFID0gJ0JPR1VTX0RPQ1RZUEVfU1RBVEUnO1xuY29uc3QgQ0RBVEFfU0VDVElPTl9TVEFURSA9ICdDREFUQV9TRUNUSU9OX1NUQVRFJztcbmNvbnN0IENEQVRBX1NFQ1RJT05fQlJBQ0tFVF9TVEFURSA9ICdDREFUQV9TRUNUSU9OX0JSQUNLRVRfU1RBVEUnO1xuY29uc3QgQ0RBVEFfU0VDVElPTl9FTkRfU1RBVEUgPSAnQ0RBVEFfU0VDVElPTl9FTkRfU1RBVEUnO1xuY29uc3QgQ0hBUkFDVEVSX1JFRkVSRU5DRV9TVEFURSA9ICdDSEFSQUNURVJfUkVGRVJFTkNFX1NUQVRFJztcbmNvbnN0IE5BTUVEX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBVEUgPSAnTkFNRURfQ0hBUkFDVEVSX1JFRkVSRU5DRV9TVEFURSc7XG5jb25zdCBBTUJJR1VPVVNfQU1QRVJTQU5EX1NUQVRFID0gJ0FNQklHVU9TX0FNUEVSU0FORF9TVEFURSc7XG5jb25zdCBOVU1FUklDX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBVEUgPSAnTlVNRVJJQ19DSEFSQUNURVJfUkVGRVJFTkNFX1NUQVRFJztcbmNvbnN0IEhFWEFERU1JQ0FMX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBUlRfU1RBVEUgPSAnSEVYQURFTUlDQUxfQ0hBUkFDVEVSX1JFRkVSRU5DRV9TVEFSVF9TVEFURSc7XG5jb25zdCBERUNJTUFMX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBUlRfU1RBVEUgPSAnREVDSU1BTF9DSEFSQUNURVJfUkVGRVJFTkNFX1NUQVJUX1NUQVRFJztcbmNvbnN0IEhFWEFERU1JQ0FMX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBVEUgPSAnSEVYQURFTUlDQUxfQ0hBUkFDVEVSX1JFRkVSRU5DRV9TVEFURSc7XG5jb25zdCBERUNJTUFMX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBVEUgPSAnREVDSU1BTF9DSEFSQUNURVJfUkVGRVJFTkNFX1NUQVRFJztcbmNvbnN0IE5VTUVSSUNfQ0hBUkFDVEVSX1JFRkVSRU5DRV9FTkRfU1RBVEUgPSAnTlVNRVJJQ19DSEFSQUNURVJfUkVGRVJFTkNFX0VORF9TVEFURSc7XG5cbi8vVXRpbHNcblxuLy9PUFRJTUlaQVRJT046IHRoZXNlIHV0aWxpdHkgZnVuY3Rpb25zIHNob3VsZCBub3QgYmUgbW92ZWQgb3V0IG9mIHRoaXMgbW9kdWxlLiBWOCBDcmFua3NoYWZ0IHdpbGwgbm90IGlubGluZVxuLy90aGlzIGZ1bmN0aW9ucyBpZiB0aGV5IHdpbGwgYmUgc2l0dWF0ZWQgaW4gYW5vdGhlciBtb2R1bGUgZHVlIHRvIGNvbnRleHQgc3dpdGNoLlxuLy9BbHdheXMgcGVyZm9ybSBpbmxpbmluZyBjaGVjayBiZWZvcmUgbW9kaWZ5aW5nIHRoaXMgZnVuY3Rpb25zICgnbm9kZSAtLXRyYWNlLWlubGluaW5nJykuXG5mdW5jdGlvbiBpc1doaXRlc3BhY2UoY3ApIHtcbiAgICByZXR1cm4gY3AgPT09ICQuU1BBQ0UgfHwgY3AgPT09ICQuTElORV9GRUVEIHx8IGNwID09PSAkLlRBQlVMQVRJT04gfHwgY3AgPT09ICQuRk9STV9GRUVEO1xufVxuXG5mdW5jdGlvbiBpc0FzY2lpRGlnaXQoY3ApIHtcbiAgICByZXR1cm4gY3AgPj0gJC5ESUdJVF8wICYmIGNwIDw9ICQuRElHSVRfOTtcbn1cblxuZnVuY3Rpb24gaXNBc2NpaVVwcGVyKGNwKSB7XG4gICAgcmV0dXJuIGNwID49ICQuTEFUSU5fQ0FQSVRBTF9BICYmIGNwIDw9ICQuTEFUSU5fQ0FQSVRBTF9aO1xufVxuXG5mdW5jdGlvbiBpc0FzY2lpTG93ZXIoY3ApIHtcbiAgICByZXR1cm4gY3AgPj0gJC5MQVRJTl9TTUFMTF9BICYmIGNwIDw9ICQuTEFUSU5fU01BTExfWjtcbn1cblxuZnVuY3Rpb24gaXNBc2NpaUxldHRlcihjcCkge1xuICAgIHJldHVybiBpc0FzY2lpTG93ZXIoY3ApIHx8IGlzQXNjaWlVcHBlcihjcCk7XG59XG5cbmZ1bmN0aW9uIGlzQXNjaWlBbHBoYU51bWVyaWMoY3ApIHtcbiAgICByZXR1cm4gaXNBc2NpaUxldHRlcihjcCkgfHwgaXNBc2NpaURpZ2l0KGNwKTtcbn1cblxuZnVuY3Rpb24gaXNBc2NpaVVwcGVySGV4RGlnaXQoY3ApIHtcbiAgICByZXR1cm4gY3AgPj0gJC5MQVRJTl9DQVBJVEFMX0EgJiYgY3AgPD0gJC5MQVRJTl9DQVBJVEFMX0Y7XG59XG5cbmZ1bmN0aW9uIGlzQXNjaWlMb3dlckhleERpZ2l0KGNwKSB7XG4gICAgcmV0dXJuIGNwID49ICQuTEFUSU5fU01BTExfQSAmJiBjcCA8PSAkLkxBVElOX1NNQUxMX0Y7XG59XG5cbmZ1bmN0aW9uIGlzQXNjaWlIZXhEaWdpdChjcCkge1xuICAgIHJldHVybiBpc0FzY2lpRGlnaXQoY3ApIHx8IGlzQXNjaWlVcHBlckhleERpZ2l0KGNwKSB8fCBpc0FzY2lpTG93ZXJIZXhEaWdpdChjcCk7XG59XG5cbmZ1bmN0aW9uIHRvQXNjaWlMb3dlckNvZGVQb2ludChjcCkge1xuICAgIHJldHVybiBjcCArIDB4MDAyMDtcbn1cblxuLy9OT1RFOiBTdHJpbmcuZnJvbUNoYXJDb2RlKCkgZnVuY3Rpb24gY2FuIGhhbmRsZSBvbmx5IGNoYXJhY3RlcnMgZnJvbSBCTVAgc3Vic2V0LlxuLy9Tbywgd2UgbmVlZCB0byB3b3JrYXJvdW5kIHRoaXMgbWFudWFsbHkuXG4vLyhzZWU6IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvU3RyaW5nL2Zyb21DaGFyQ29kZSNHZXR0aW5nX2l0X3RvX3dvcmtfd2l0aF9oaWdoZXJfdmFsdWVzKVxuZnVuY3Rpb24gdG9DaGFyKGNwKSB7XG4gICAgaWYgKGNwIDw9IDB4ZmZmZikge1xuICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShjcCk7XG4gICAgfVxuXG4gICAgY3AgLT0gMHgxMDAwMDtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgoKGNwID4+PiAxMCkgJiAweDNmZikgfCAweGQ4MDApICsgU3RyaW5nLmZyb21DaGFyQ29kZSgweGRjMDAgfCAoY3AgJiAweDNmZikpO1xufVxuXG5mdW5jdGlvbiB0b0FzY2lpTG93ZXJDaGFyKGNwKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUodG9Bc2NpaUxvd2VyQ29kZVBvaW50KGNwKSk7XG59XG5cbmZ1bmN0aW9uIGZpbmROYW1lZEVudGl0eVRyZWVCcmFuY2gobm9kZUl4LCBjcCkge1xuICAgIGNvbnN0IGJyYW5jaENvdW50ID0gbmVUcmVlWysrbm9kZUl4XTtcbiAgICBsZXQgbG8gPSArK25vZGVJeDtcbiAgICBsZXQgaGkgPSBsbyArIGJyYW5jaENvdW50IC0gMTtcblxuICAgIHdoaWxlIChsbyA8PSBoaSkge1xuICAgICAgICBjb25zdCBtaWQgPSAobG8gKyBoaSkgPj4+IDE7XG4gICAgICAgIGNvbnN0IG1pZENwID0gbmVUcmVlW21pZF07XG5cbiAgICAgICAgaWYgKG1pZENwIDwgY3ApIHtcbiAgICAgICAgICAgIGxvID0gbWlkICsgMTtcbiAgICAgICAgfSBlbHNlIGlmIChtaWRDcCA+IGNwKSB7XG4gICAgICAgICAgICBoaSA9IG1pZCAtIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbmVUcmVlW21pZCArIGJyYW5jaENvdW50XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAtMTtcbn1cblxuLy9Ub2tlbml6ZXJcbmNsYXNzIFRva2VuaXplciB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMucHJlcHJvY2Vzc29yID0gbmV3IFByZXByb2Nlc3NvcigpO1xuXG4gICAgICAgIHRoaXMudG9rZW5RdWV1ZSA9IFtdO1xuXG4gICAgICAgIHRoaXMuYWxsb3dDREFUQSA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuc3RhdGUgPSBEQVRBX1NUQVRFO1xuICAgICAgICB0aGlzLnJldHVyblN0YXRlID0gJyc7XG5cbiAgICAgICAgdGhpcy5jaGFyUmVmQ29kZSA9IC0xO1xuICAgICAgICB0aGlzLnRlbXBCdWZmID0gW107XG4gICAgICAgIHRoaXMubGFzdFN0YXJ0VGFnTmFtZSA9ICcnO1xuXG4gICAgICAgIHRoaXMuY29uc3VtZWRBZnRlclNuYXBzaG90ID0gLTE7XG4gICAgICAgIHRoaXMuYWN0aXZlID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5jdXJyZW50Q2hhcmFjdGVyVG9rZW4gPSBudWxsO1xuICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbiA9IG51bGw7XG4gICAgICAgIHRoaXMuY3VycmVudEF0dHIgPSBudWxsO1xuICAgIH1cblxuICAgIC8vRXJyb3JzXG4gICAgX2VycigpIHtcbiAgICAgICAgLy8gTk9URTogZXJyIHJlcG9ydGluZyBpcyBub29wIGJ5IGRlZmF1bHQuIEVuYWJsZWQgYnkgbWl4aW4uXG4gICAgfVxuXG4gICAgX2Vyck9uTmV4dENvZGVQb2ludChlcnIpIHtcbiAgICAgICAgdGhpcy5fY29uc3VtZSgpO1xuICAgICAgICB0aGlzLl9lcnIoZXJyKTtcbiAgICAgICAgdGhpcy5fdW5jb25zdW1lKCk7XG4gICAgfVxuXG4gICAgLy9BUElcbiAgICBnZXROZXh0VG9rZW4oKSB7XG4gICAgICAgIHdoaWxlICghdGhpcy50b2tlblF1ZXVlLmxlbmd0aCAmJiB0aGlzLmFjdGl2ZSkge1xuICAgICAgICAgICAgdGhpcy5jb25zdW1lZEFmdGVyU25hcHNob3QgPSAwO1xuXG4gICAgICAgICAgICBjb25zdCBjcCA9IHRoaXMuX2NvbnN1bWUoKTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLl9lbnN1cmVIaWJlcm5hdGlvbigpKSB7XG4gICAgICAgICAgICAgICAgdGhpc1t0aGlzLnN0YXRlXShjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy50b2tlblF1ZXVlLnNoaWZ0KCk7XG4gICAgfVxuXG4gICAgd3JpdGUoY2h1bmssIGlzTGFzdENodW5rKSB7XG4gICAgICAgIHRoaXMuYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5wcmVwcm9jZXNzb3Iud3JpdGUoY2h1bmssIGlzTGFzdENodW5rKTtcbiAgICB9XG5cbiAgICBpbnNlcnRIdG1sQXRDdXJyZW50UG9zKGNodW5rKSB7XG4gICAgICAgIHRoaXMuYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5wcmVwcm9jZXNzb3IuaW5zZXJ0SHRtbEF0Q3VycmVudFBvcyhjaHVuayk7XG4gICAgfVxuXG4gICAgLy9IaWJlcm5hdGlvblxuICAgIF9lbnN1cmVIaWJlcm5hdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMucHJlcHJvY2Vzc29yLmVuZE9mQ2h1bmtIaXQpIHtcbiAgICAgICAgICAgIGZvciAoOyB0aGlzLmNvbnN1bWVkQWZ0ZXJTbmFwc2hvdCA+IDA7IHRoaXMuY29uc3VtZWRBZnRlclNuYXBzaG90LS0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByZXByb2Nlc3Nvci5yZXRyZWF0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnRva2VuUXVldWUucHVzaCh7IHR5cGU6IFRva2VuaXplci5ISUJFUk5BVElPTl9UT0tFTiB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy9Db25zdW1wdGlvblxuICAgIF9jb25zdW1lKCkge1xuICAgICAgICB0aGlzLmNvbnN1bWVkQWZ0ZXJTbmFwc2hvdCsrO1xuICAgICAgICByZXR1cm4gdGhpcy5wcmVwcm9jZXNzb3IuYWR2YW5jZSgpO1xuICAgIH1cblxuICAgIF91bmNvbnN1bWUoKSB7XG4gICAgICAgIHRoaXMuY29uc3VtZWRBZnRlclNuYXBzaG90LS07XG4gICAgICAgIHRoaXMucHJlcHJvY2Vzc29yLnJldHJlYXQoKTtcbiAgICB9XG5cbiAgICBfcmVjb25zdW1lSW5TdGF0ZShzdGF0ZSkge1xuICAgICAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gICAgICAgIHRoaXMuX3VuY29uc3VtZSgpO1xuICAgIH1cblxuICAgIF9jb25zdW1lU2VxdWVuY2VJZk1hdGNoKHBhdHRlcm4sIHN0YXJ0Q3AsIGNhc2VTZW5zaXRpdmUpIHtcbiAgICAgICAgbGV0IGNvbnN1bWVkQ291bnQgPSAwO1xuICAgICAgICBsZXQgaXNNYXRjaCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHBhdHRlcm5MZW5ndGggPSBwYXR0ZXJuLmxlbmd0aDtcbiAgICAgICAgbGV0IHBhdHRlcm5Qb3MgPSAwO1xuICAgICAgICBsZXQgY3AgPSBzdGFydENwO1xuICAgICAgICBsZXQgcGF0dGVybkNwID0gdm9pZCAwO1xuXG4gICAgICAgIGZvciAoOyBwYXR0ZXJuUG9zIDwgcGF0dGVybkxlbmd0aDsgcGF0dGVyblBvcysrKSB7XG4gICAgICAgICAgICBpZiAocGF0dGVyblBvcyA+IDApIHtcbiAgICAgICAgICAgICAgICBjcCA9IHRoaXMuX2NvbnN1bWUoKTtcbiAgICAgICAgICAgICAgICBjb25zdW1lZENvdW50Kys7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjcCA9PT0gJC5FT0YpIHtcbiAgICAgICAgICAgICAgICBpc01hdGNoID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHBhdHRlcm5DcCA9IHBhdHRlcm5bcGF0dGVyblBvc107XG5cbiAgICAgICAgICAgIGlmIChjcCAhPT0gcGF0dGVybkNwICYmIChjYXNlU2Vuc2l0aXZlIHx8IGNwICE9PSB0b0FzY2lpTG93ZXJDb2RlUG9pbnQocGF0dGVybkNwKSkpIHtcbiAgICAgICAgICAgICAgICBpc01hdGNoID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzTWF0Y2gpIHtcbiAgICAgICAgICAgIHdoaWxlIChjb25zdW1lZENvdW50LS0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl91bmNvbnN1bWUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpc01hdGNoO1xuICAgIH1cblxuICAgIC8vVGVtcCBidWZmZXJcbiAgICBfaXNUZW1wQnVmZmVyRXF1YWxUb1NjcmlwdFN0cmluZygpIHtcbiAgICAgICAgaWYgKHRoaXMudGVtcEJ1ZmYubGVuZ3RoICE9PSAkJC5TQ1JJUFRfU1RSSU5HLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRlbXBCdWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50ZW1wQnVmZltpXSAhPT0gJCQuU0NSSVBUX1NUUklOR1tpXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vVG9rZW4gY3JlYXRpb25cbiAgICBfY3JlYXRlU3RhcnRUYWdUb2tlbigpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4gPSB7XG4gICAgICAgICAgICB0eXBlOiBUb2tlbml6ZXIuU1RBUlRfVEFHX1RPS0VOLFxuICAgICAgICAgICAgdGFnTmFtZTogJycsXG4gICAgICAgICAgICBzZWxmQ2xvc2luZzogZmFsc2UsXG4gICAgICAgICAgICBhY2tTZWxmQ2xvc2luZzogZmFsc2UsXG4gICAgICAgICAgICBhdHRyczogW11cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBfY3JlYXRlRW5kVGFnVG9rZW4oKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFRva2VuID0ge1xuICAgICAgICAgICAgdHlwZTogVG9rZW5pemVyLkVORF9UQUdfVE9LRU4sXG4gICAgICAgICAgICB0YWdOYW1lOiAnJyxcbiAgICAgICAgICAgIHNlbGZDbG9zaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGF0dHJzOiBbXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIF9jcmVhdGVDb21tZW50VG9rZW4oKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFRva2VuID0ge1xuICAgICAgICAgICAgdHlwZTogVG9rZW5pemVyLkNPTU1FTlRfVE9LRU4sXG4gICAgICAgICAgICBkYXRhOiAnJ1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIF9jcmVhdGVEb2N0eXBlVG9rZW4oaW5pdGlhbE5hbWUpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4gPSB7XG4gICAgICAgICAgICB0eXBlOiBUb2tlbml6ZXIuRE9DVFlQRV9UT0tFTixcbiAgICAgICAgICAgIG5hbWU6IGluaXRpYWxOYW1lLFxuICAgICAgICAgICAgZm9yY2VRdWlya3M6IGZhbHNlLFxuICAgICAgICAgICAgcHVibGljSWQ6IG51bGwsXG4gICAgICAgICAgICBzeXN0ZW1JZDogbnVsbFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIF9jcmVhdGVDaGFyYWN0ZXJUb2tlbih0eXBlLCBjaCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbiA9IHtcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICBjaGFyczogY2hcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBfY3JlYXRlRU9GVG9rZW4oKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFRva2VuID0geyB0eXBlOiBUb2tlbml6ZXIuRU9GX1RPS0VOIH07XG4gICAgfVxuXG4gICAgLy9UYWcgYXR0cmlidXRlc1xuICAgIF9jcmVhdGVBdHRyKGF0dHJOYW1lRmlyc3RDaCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRBdHRyID0ge1xuICAgICAgICAgICAgbmFtZTogYXR0ck5hbWVGaXJzdENoLFxuICAgICAgICAgICAgdmFsdWU6ICcnXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgX2xlYXZlQXR0ck5hbWUodG9TdGF0ZSkge1xuICAgICAgICBpZiAoVG9rZW5pemVyLmdldFRva2VuQXR0cih0aGlzLmN1cnJlbnRUb2tlbiwgdGhpcy5jdXJyZW50QXR0ci5uYW1lKSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uYXR0cnMucHVzaCh0aGlzLmN1cnJlbnRBdHRyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuZHVwbGljYXRlQXR0cmlidXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3RhdGUgPSB0b1N0YXRlO1xuICAgIH1cblxuICAgIF9sZWF2ZUF0dHJWYWx1ZSh0b1N0YXRlKSB7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB0b1N0YXRlO1xuICAgIH1cblxuICAgIC8vVG9rZW4gZW1pc3Npb25cbiAgICBfZW1pdEN1cnJlbnRUb2tlbigpIHtcbiAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRDaGFyYWN0ZXJUb2tlbigpO1xuXG4gICAgICAgIGNvbnN0IGN0ID0gdGhpcy5jdXJyZW50VG9rZW47XG5cbiAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4gPSBudWxsO1xuXG4gICAgICAgIC8vTk9URTogc3RvcmUgZW1pdGVkIHN0YXJ0IHRhZydzIHRhZ05hbWUgdG8gZGV0ZXJtaW5lIGlzIHRoZSBmb2xsb3dpbmcgZW5kIHRhZyB0b2tlbiBpcyBhcHByb3ByaWF0ZS5cbiAgICAgICAgaWYgKGN0LnR5cGUgPT09IFRva2VuaXplci5TVEFSVF9UQUdfVE9LRU4pIHtcbiAgICAgICAgICAgIHRoaXMubGFzdFN0YXJ0VGFnTmFtZSA9IGN0LnRhZ05hbWU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3QudHlwZSA9PT0gVG9rZW5pemVyLkVORF9UQUdfVE9LRU4pIHtcbiAgICAgICAgICAgIGlmIChjdC5hdHRycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lbmRUYWdXaXRoQXR0cmlidXRlcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdC5zZWxmQ2xvc2luZykge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihFUlIuZW5kVGFnV2l0aFRyYWlsaW5nU29saWR1cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRva2VuUXVldWUucHVzaChjdCk7XG4gICAgfVxuXG4gICAgX2VtaXRDdXJyZW50Q2hhcmFjdGVyVG9rZW4oKSB7XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbikge1xuICAgICAgICAgICAgdGhpcy50b2tlblF1ZXVlLnB1c2godGhpcy5jdXJyZW50Q2hhcmFjdGVyVG9rZW4pO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50Q2hhcmFjdGVyVG9rZW4gPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgX2VtaXRFT0ZUb2tlbigpIHtcbiAgICAgICAgdGhpcy5fY3JlYXRlRU9GVG9rZW4oKTtcbiAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgIH1cblxuICAgIC8vQ2hhcmFjdGVycyBlbWlzc2lvblxuXG4gICAgLy9PUFRJTUlaQVRJT046IHNwZWNpZmljYXRpb24gdXNlcyBvbmx5IG9uZSB0eXBlIG9mIGNoYXJhY3RlciB0b2tlbnMgKG9uZSB0b2tlbiBwZXIgY2hhcmFjdGVyKS5cbiAgICAvL1RoaXMgY2F1c2VzIGEgaHVnZSBtZW1vcnkgb3ZlcmhlYWQgYW5kIGEgbG90IG9mIHVubmVjZXNzYXJ5IHBhcnNlciBsb29wcy4gcGFyc2U1IHVzZXMgMyBncm91cHMgb2YgY2hhcmFjdGVycy5cbiAgICAvL0lmIHdlIGhhdmUgYSBzZXF1ZW5jZSBvZiBjaGFyYWN0ZXJzIHRoYXQgYmVsb25nIHRvIHRoZSBzYW1lIGdyb3VwLCBwYXJzZXIgY2FuIHByb2Nlc3MgaXRcbiAgICAvL2FzIGEgc2luZ2xlIHNvbGlkIGNoYXJhY3RlciB0b2tlbi5cbiAgICAvL1NvLCB0aGVyZSBhcmUgMyB0eXBlcyBvZiBjaGFyYWN0ZXIgdG9rZW5zIGluIHBhcnNlNTpcbiAgICAvLzEpTlVMTF9DSEFSQUNURVJfVE9LRU4gLSBcXHUwMDAwLWNoYXJhY3RlciBzZXF1ZW5jZXMgKGUuZy4gJ1xcdTAwMDBcXHUwMDAwXFx1MDAwMCcpXG4gICAgLy8yKVdISVRFU1BBQ0VfQ0hBUkFDVEVSX1RPS0VOIC0gYW55IHdoaXRlc3BhY2UvbmV3LWxpbmUgY2hhcmFjdGVyIHNlcXVlbmNlcyAoZS5nLiAnXFxuICBcXHJcXHQgICBcXGYnKVxuICAgIC8vMylDSEFSQUNURVJfVE9LRU4gLSBhbnkgY2hhcmFjdGVyIHNlcXVlbmNlIHdoaWNoIGRvbid0IGJlbG9uZyB0byBncm91cHMgMSBhbmQgMiAoZS5nLiAnYWJjZGVmMTIzNEBAIyQlXicpXG4gICAgX2FwcGVuZENoYXJUb0N1cnJlbnRDaGFyYWN0ZXJUb2tlbih0eXBlLCBjaCkge1xuICAgICAgICBpZiAodGhpcy5jdXJyZW50Q2hhcmFjdGVyVG9rZW4gJiYgdGhpcy5jdXJyZW50Q2hhcmFjdGVyVG9rZW4udHlwZSAhPT0gdHlwZSkge1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRDaGFyYWN0ZXJUb2tlbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuY3VycmVudENoYXJhY3RlclRva2VuKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbi5jaGFycyArPSBjaDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZUNoYXJhY3RlclRva2VuKHR5cGUsIGNoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9lbWl0Q29kZVBvaW50KGNwKSB7XG4gICAgICAgIGxldCB0eXBlID0gVG9rZW5pemVyLkNIQVJBQ1RFUl9UT0tFTjtcblxuICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNwKSkge1xuICAgICAgICAgICAgdHlwZSA9IFRva2VuaXplci5XSElURVNQQUNFX0NIQVJBQ1RFUl9UT0tFTjtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5OVUxMKSB7XG4gICAgICAgICAgICB0eXBlID0gVG9rZW5pemVyLk5VTExfQ0hBUkFDVEVSX1RPS0VOO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fYXBwZW5kQ2hhclRvQ3VycmVudENoYXJhY3RlclRva2VuKHR5cGUsIHRvQ2hhcihjcCkpO1xuICAgIH1cblxuICAgIF9lbWl0U2V2ZXJhbENvZGVQb2ludHMoY29kZVBvaW50cykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvZGVQb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDb2RlUG9pbnQoY29kZVBvaW50c1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvL05PVEU6IHVzZWQgdGhlbiB3ZSBlbWl0IGNoYXJhY3RlciBleHBsaWNpdGx5LiBUaGlzIGlzIGFsd2F5cyBhIG5vbi13aGl0ZXNwYWNlIGFuZCBhIG5vbi1udWxsIGNoYXJhY3Rlci5cbiAgICAvL1NvIHdlIGNhbiBhdm9pZCBhZGRpdGlvbmFsIGNoZWNrcyBoZXJlLlxuICAgIF9lbWl0Q2hhcnMoY2gpIHtcbiAgICAgICAgdGhpcy5fYXBwZW5kQ2hhclRvQ3VycmVudENoYXJhY3RlclRva2VuKFRva2VuaXplci5DSEFSQUNURVJfVE9LRU4sIGNoKTtcbiAgICB9XG5cbiAgICAvLyBDaGFyYWN0ZXIgcmVmZXJlbmNlIGhlbHBlcnNcbiAgICBfbWF0Y2hOYW1lZENoYXJhY3RlclJlZmVyZW5jZShzdGFydENwKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBudWxsO1xuICAgICAgICBsZXQgZXhjZXNzID0gMTtcbiAgICAgICAgbGV0IGkgPSBmaW5kTmFtZWRFbnRpdHlUcmVlQnJhbmNoKDAsIHN0YXJ0Q3ApO1xuXG4gICAgICAgIHRoaXMudGVtcEJ1ZmYucHVzaChzdGFydENwKTtcblxuICAgICAgICB3aGlsZSAoaSA+IC0xKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gbmVUcmVlW2ldO1xuICAgICAgICAgICAgY29uc3QgaW5Ob2RlID0gY3VycmVudCA8IE1BWF9CUkFOQ0hfTUFSS0VSX1ZBTFVFO1xuICAgICAgICAgICAgY29uc3Qgbm9kZVdpdGhEYXRhID0gaW5Ob2RlICYmIGN1cnJlbnQgJiBIQVNfREFUQV9GTEFHO1xuXG4gICAgICAgICAgICBpZiAobm9kZVdpdGhEYXRhKSB7XG4gICAgICAgICAgICAgICAgLy9OT1RFOiB3ZSB1c2UgZ3JlZWR5IHNlYXJjaCwgc28gd2UgY29udGludWUgbG9va3VwIGF0IHRoaXMgcG9pbnRcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBjdXJyZW50ICYgREFUQV9EVVBMRVRfRkxBRyA/IFtuZVRyZWVbKytpXSwgbmVUcmVlWysraV1dIDogW25lVHJlZVsrK2ldXTtcbiAgICAgICAgICAgICAgICBleGNlc3MgPSAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBjcCA9IHRoaXMuX2NvbnN1bWUoKTtcblxuICAgICAgICAgICAgdGhpcy50ZW1wQnVmZi5wdXNoKGNwKTtcbiAgICAgICAgICAgIGV4Y2VzcysrO1xuXG4gICAgICAgICAgICBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpbk5vZGUpIHtcbiAgICAgICAgICAgICAgICBpID0gY3VycmVudCAmIEhBU19CUkFOQ0hFU19GTEFHID8gZmluZE5hbWVkRW50aXR5VHJlZUJyYW5jaChpLCBjcCkgOiAtMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaSA9IGNwID09PSBjdXJyZW50ID8gKytpIDogLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAoZXhjZXNzLS0pIHtcbiAgICAgICAgICAgIHRoaXMudGVtcEJ1ZmYucG9wKCk7XG4gICAgICAgICAgICB0aGlzLl91bmNvbnN1bWUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgX2lzQ2hhcmFjdGVyUmVmZXJlbmNlSW5BdHRyaWJ1dGUoKSB7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICB0aGlzLnJldHVyblN0YXRlID09PSBBVFRSSUJVVEVfVkFMVUVfRE9VQkxFX1FVT1RFRF9TVEFURSB8fFxuICAgICAgICAgICAgdGhpcy5yZXR1cm5TdGF0ZSA9PT0gQVRUUklCVVRFX1ZBTFVFX1NJTkdMRV9RVU9URURfU1RBVEUgfHxcbiAgICAgICAgICAgIHRoaXMucmV0dXJuU3RhdGUgPT09IEFUVFJJQlVURV9WQUxVRV9VTlFVT1RFRF9TVEFURVxuICAgICAgICApO1xuICAgIH1cblxuICAgIF9pc0NoYXJhY3RlclJlZmVyZW5jZUF0dHJpYnV0ZVF1aXJrKHdpdGhTZW1pY29sb24pIHtcbiAgICAgICAgaWYgKCF3aXRoU2VtaWNvbG9uICYmIHRoaXMuX2lzQ2hhcmFjdGVyUmVmZXJlbmNlSW5BdHRyaWJ1dGUoKSkge1xuICAgICAgICAgICAgY29uc3QgbmV4dENwID0gdGhpcy5fY29uc3VtZSgpO1xuXG4gICAgICAgICAgICB0aGlzLl91bmNvbnN1bWUoKTtcblxuICAgICAgICAgICAgcmV0dXJuIG5leHRDcCA9PT0gJC5FUVVBTFNfU0lHTiB8fCBpc0FzY2lpQWxwaGFOdW1lcmljKG5leHRDcCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgX2ZsdXNoQ29kZVBvaW50c0NvbnN1bWVkQXNDaGFyYWN0ZXJSZWZlcmVuY2UoKSB7XG4gICAgICAgIGlmICh0aGlzLl9pc0NoYXJhY3RlclJlZmVyZW5jZUluQXR0cmlidXRlKCkpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZW1wQnVmZi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dHIudmFsdWUgKz0gdG9DaGFyKHRoaXMudGVtcEJ1ZmZbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZW1pdFNldmVyYWxDb2RlUG9pbnRzKHRoaXMudGVtcEJ1ZmYpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50ZW1wQnVmZiA9IFtdO1xuICAgIH1cblxuICAgIC8vIFN0YXRlIG1hY2hpbmVcblxuICAgIC8vIERhdGEgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtEQVRBX1NUQVRFXShjcCkge1xuICAgICAgICB0aGlzLnByZXByb2Nlc3Nvci5kcm9wUGFyc2VkQ2h1bmsoKTtcblxuICAgICAgICBpZiAoY3AgPT09ICQuTEVTU19USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBUQUdfT1BFTl9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5BTVBFUlNBTkQpIHtcbiAgICAgICAgICAgIHRoaXMucmV0dXJuU3RhdGUgPSBEQVRBX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IENIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuTlVMTCkge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi51bmV4cGVjdGVkTnVsbENoYXJhY3Rlcik7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5FT0YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENvZGVQb2ludChjcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAgUkNEQVRBIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbUkNEQVRBX1NUQVRFXShjcCkge1xuICAgICAgICB0aGlzLnByZXByb2Nlc3Nvci5kcm9wUGFyc2VkQ2h1bmsoKTtcblxuICAgICAgICBpZiAoY3AgPT09ICQuQU1QRVJTQU5EKSB7XG4gICAgICAgICAgICB0aGlzLnJldHVyblN0YXRlID0gUkNEQVRBX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IENIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuTEVTU19USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBSQ0RBVEFfTEVTU19USEFOX1NJR05fU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuTlVMTCkge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi51bmV4cGVjdGVkTnVsbENoYXJhY3Rlcik7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnModW5pY29kZS5SRVBMQUNFTUVOVF9DSEFSQUNURVIpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJBV1RFWFQgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtSQVdURVhUX1NUQVRFXShjcCkge1xuICAgICAgICB0aGlzLnByZXByb2Nlc3Nvci5kcm9wUGFyc2VkQ2h1bmsoKTtcblxuICAgICAgICBpZiAoY3AgPT09ICQuTEVTU19USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBSQVdURVhUX0xFU1NfVEhBTl9TSUdOX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKHVuaWNvZGUuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5FT0YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENvZGVQb2ludChjcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTY3JpcHQgZGF0YSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW1NDUklQVF9EQVRBX1NUQVRFXShjcCkge1xuICAgICAgICB0aGlzLnByZXByb2Nlc3Nvci5kcm9wUGFyc2VkQ2h1bmsoKTtcblxuICAgICAgICBpZiAoY3AgPT09ICQuTEVTU19USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTQ1JJUFRfREFUQV9MRVNTX1RIQU5fU0lHTl9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5OVUxMKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycyh1bmljb2RlLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUik7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDb2RlUG9pbnQoY3ApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUExBSU5URVhUIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbUExBSU5URVhUX1NUQVRFXShjcCkge1xuICAgICAgICB0aGlzLnByZXByb2Nlc3Nvci5kcm9wUGFyc2VkQ2h1bmsoKTtcblxuICAgICAgICBpZiAoY3AgPT09ICQuTlVMTCkge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi51bmV4cGVjdGVkTnVsbENoYXJhY3Rlcik7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnModW5pY29kZS5SRVBMQUNFTUVOVF9DSEFSQUNURVIpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRhZyBvcGVuIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbVEFHX09QRU5fU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChjcCA9PT0gJC5FWENMQU1BVElPTl9NQVJLKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gTUFSS1VQX0RFQ0xBUkFUSU9OX09QRU5fU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuU09MSURVUykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IEVORF9UQUdfT1BFTl9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FzY2lpTGV0dGVyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlU3RhcnRUYWdUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShUQUdfTkFNRV9TVEFURSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuUVVFU1RJT05fTUFSSykge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi51bmV4cGVjdGVkUXVlc3Rpb25NYXJrSW5zdGVhZE9mVGFnTmFtZSk7XG4gICAgICAgICAgICB0aGlzLl9jcmVhdGVDb21tZW50VG9rZW4oKTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoQk9HVVNfQ09NTUVOVF9TVEFURSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkJlZm9yZVRhZ05hbWUpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCc8Jyk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuaW52YWxpZEZpcnN0Q2hhcmFjdGVyT2ZUYWdOYW1lKTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPCcpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShEQVRBX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEVuZCB0YWcgb3BlbiBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0VORF9UQUdfT1BFTl9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzQXNjaWlMZXR0ZXIoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLl9jcmVhdGVFbmRUYWdUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShUQUdfTkFNRV9TVEFURSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIubWlzc2luZ0VuZFRhZ05hbWUpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERBVEFfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkJlZm9yZVRhZ05hbWUpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCc8LycpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmludmFsaWRGaXJzdENoYXJhY3Rlck9mVGFnTmFtZSk7XG4gICAgICAgICAgICB0aGlzLl9jcmVhdGVDb21tZW50VG9rZW4oKTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoQk9HVVNfQ09NTUVOVF9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUYWcgbmFtZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW1RBR19OQU1FX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfTkFNRV9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5TT0xJRFVTKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU0VMRl9DTE9TSU5HX1NUQVJUX1RBR19TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5HUkVBVEVSX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERBVEFfU1RBVEU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBc2NpaVVwcGVyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4udGFnTmFtZSArPSB0b0FzY2lpTG93ZXJDaGFyKGNwKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5OVUxMKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLnRhZ05hbWUgKz0gdW5pY29kZS5SRVBMQUNFTUVOVF9DSEFSQUNURVI7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluVGFnKTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4udGFnTmFtZSArPSB0b0NoYXIoY3ApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUkNEQVRBIGxlc3MtdGhhbiBzaWduIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbUkNEQVRBX0xFU1NfVEhBTl9TSUdOX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoY3AgPT09ICQuU09MSURVUykge1xuICAgICAgICAgICAgdGhpcy50ZW1wQnVmZiA9IFtdO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFJDREFUQV9FTkRfVEFHX09QRU5fU1RBVEU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJzwnKTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoUkNEQVRBX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJDREFUQSBlbmQgdGFnIG9wZW4gc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtSQ0RBVEFfRU5EX1RBR19PUEVOX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoaXNBc2NpaUxldHRlcihjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZUVuZFRhZ1Rva2VuKCk7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKFJDREFUQV9FTkRfVEFHX05BTUVfU1RBVEUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCc8LycpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShSQ0RBVEFfU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUkNEQVRBIGVuZCB0YWcgbmFtZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW1JDREFUQV9FTkRfVEFHX05BTUVfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChpc0FzY2lpVXBwZXIoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi50YWdOYW1lICs9IHRvQXNjaWlMb3dlckNoYXIoY3ApO1xuICAgICAgICAgICAgdGhpcy50ZW1wQnVmZi5wdXNoKGNwKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FzY2lpTG93ZXIoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi50YWdOYW1lICs9IHRvQ2hhcihjcCk7XG4gICAgICAgICAgICB0aGlzLnRlbXBCdWZmLnB1c2goY3ApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMubGFzdFN0YXJ0VGFnTmFtZSA9PT0gdGhpcy5jdXJyZW50VG9rZW4udGFnTmFtZSkge1xuICAgICAgICAgICAgICAgIGlmIChpc1doaXRlc3BhY2UoY3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBCRUZPUkVfQVRUUklCVVRFX05BTUVfU1RBVEU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY3AgPT09ICQuU09MSURVUykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU0VMRl9DTE9TSU5HX1NUQVJUX1RBR19TVEFURTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjcCA9PT0gJC5HUkVBVEVSX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gREFUQV9TVEFURTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJzwvJyk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0U2V2ZXJhbENvZGVQb2ludHModGhpcy50ZW1wQnVmZik7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKFJDREFUQV9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSQVdURVhUIGxlc3MtdGhhbiBzaWduIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbUkFXVEVYVF9MRVNTX1RIQU5fU0lHTl9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLlNPTElEVVMpIHtcbiAgICAgICAgICAgIHRoaXMudGVtcEJ1ZmYgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBSQVdURVhUX0VORF9UQUdfT1BFTl9TVEFURTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPCcpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShSQVdURVhUX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJBV1RFWFQgZW5kIHRhZyBvcGVuIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbUkFXVEVYVF9FTkRfVEFHX09QRU5fU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChpc0FzY2lpTGV0dGVyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlRW5kVGFnVG9rZW4oKTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoUkFXVEVYVF9FTkRfVEFHX05BTUVfU1RBVEUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCc8LycpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShSQVdURVhUX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJBV1RFWFQgZW5kIHRhZyBuYW1lIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbUkFXVEVYVF9FTkRfVEFHX05BTUVfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChpc0FzY2lpVXBwZXIoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi50YWdOYW1lICs9IHRvQXNjaWlMb3dlckNoYXIoY3ApO1xuICAgICAgICAgICAgdGhpcy50ZW1wQnVmZi5wdXNoKGNwKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FzY2lpTG93ZXIoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi50YWdOYW1lICs9IHRvQ2hhcihjcCk7XG4gICAgICAgICAgICB0aGlzLnRlbXBCdWZmLnB1c2goY3ApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMubGFzdFN0YXJ0VGFnTmFtZSA9PT0gdGhpcy5jdXJyZW50VG9rZW4udGFnTmFtZSkge1xuICAgICAgICAgICAgICAgIGlmIChpc1doaXRlc3BhY2UoY3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBCRUZPUkVfQVRUUklCVVRFX05BTUVfU1RBVEU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY3AgPT09ICQuU09MSURVUykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU0VMRl9DTE9TSU5HX1NUQVJUX1RBR19TVEFURTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjcCA9PT0gJC5HUkVBVEVSX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBEQVRBX1NUQVRFO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJzwvJyk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0U2V2ZXJhbENvZGVQb2ludHModGhpcy50ZW1wQnVmZik7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKFJBV1RFWFRfU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2NyaXB0IGRhdGEgbGVzcy10aGFuIHNpZ24gc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtTQ1JJUFRfREFUQV9MRVNTX1RIQU5fU0lHTl9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLlNPTElEVVMpIHtcbiAgICAgICAgICAgIHRoaXMudGVtcEJ1ZmYgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTQ1JJUFRfREFUQV9FTkRfVEFHX09QRU5fU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRVhDTEFNQVRJT05fTUFSSykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFNDUklQVF9EQVRBX0VTQ0FQRV9TVEFSVF9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPCEnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPCcpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShTQ1JJUFRfREFUQV9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTY3JpcHQgZGF0YSBlbmQgdGFnIG9wZW4gc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtTQ1JJUFRfREFUQV9FTkRfVEFHX09QRU5fU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChpc0FzY2lpTGV0dGVyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlRW5kVGFnVG9rZW4oKTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoU0NSSVBUX0RBVEFfRU5EX1RBR19OQU1FX1NUQVRFKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPC8nKTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoU0NSSVBUX0RBVEFfU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2NyaXB0IGRhdGEgZW5kIHRhZyBuYW1lIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbU0NSSVBUX0RBVEFfRU5EX1RBR19OQU1FX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoaXNBc2NpaVVwcGVyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4udGFnTmFtZSArPSB0b0FzY2lpTG93ZXJDaGFyKGNwKTtcbiAgICAgICAgICAgIHRoaXMudGVtcEJ1ZmYucHVzaChjcCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBc2NpaUxvd2VyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4udGFnTmFtZSArPSB0b0NoYXIoY3ApO1xuICAgICAgICAgICAgdGhpcy50ZW1wQnVmZi5wdXNoKGNwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmxhc3RTdGFydFRhZ05hbWUgPT09IHRoaXMuY3VycmVudFRva2VuLnRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNwKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9OQU1FX1NUQVRFO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5TT0xJRFVTKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTRUxGX0NMT1NJTkdfU1RBUlRfVEFHX1NUQVRFO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5HUkVBVEVSX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBEQVRBX1NUQVRFO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJzwvJyk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0U2V2ZXJhbENvZGVQb2ludHModGhpcy50ZW1wQnVmZik7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKFNDUklQVF9EQVRBX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNjcmlwdCBkYXRhIGVzY2FwZSBzdGFydCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW1NDUklQVF9EQVRBX0VTQ0FQRV9TVEFSVF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLkhZUEhFTl9NSU5VUykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFNDUklQVF9EQVRBX0VTQ0FQRV9TVEFSVF9EQVNIX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCctJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKFNDUklQVF9EQVRBX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNjcmlwdCBkYXRhIGVzY2FwZSBzdGFydCBkYXNoIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbU0NSSVBUX0RBVEFfRVNDQVBFX1NUQVJUX0RBU0hfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChjcCA9PT0gJC5IWVBIRU5fTUlOVVMpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTQ1JJUFRfREFUQV9FU0NBUEVEX0RBU0hfREFTSF9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnLScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShTQ1JJUFRfREFUQV9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTY3JpcHQgZGF0YSBlc2NhcGVkIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbU0NSSVBUX0RBVEFfRVNDQVBFRF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLkhZUEhFTl9NSU5VUykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFNDUklQVF9EQVRBX0VTQ0FQRURfREFTSF9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnLScpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkxFU1NfVEhBTl9TSUdOKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU0NSSVBUX0RBVEFfRVNDQVBFRF9MRVNTX1RIQU5fU0lHTl9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5OVUxMKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycyh1bmljb2RlLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUik7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluU2NyaXB0SHRtbENvbW1lbnRMaWtlVGV4dCk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDb2RlUG9pbnQoY3ApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2NyaXB0IGRhdGEgZXNjYXBlZCBkYXNoIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbU0NSSVBUX0RBVEFfRVNDQVBFRF9EQVNIX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoY3AgPT09ICQuSFlQSEVOX01JTlVTKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU0NSSVBUX0RBVEFfRVNDQVBFRF9EQVNIX0RBU0hfU1RBVEU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJy0nKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5MRVNTX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFNDUklQVF9EQVRBX0VTQ0FQRURfTEVTU19USEFOX1NJR05fU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuTlVMTCkge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi51bmV4cGVjdGVkTnVsbENoYXJhY3Rlcik7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU0NSSVBUX0RBVEFfRVNDQVBFRF9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycyh1bmljb2RlLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUik7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluU2NyaXB0SHRtbENvbW1lbnRMaWtlVGV4dCk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTQ1JJUFRfREFUQV9FU0NBUEVEX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENvZGVQb2ludChjcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTY3JpcHQgZGF0YSBlc2NhcGVkIGRhc2ggZGFzaCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW1NDUklQVF9EQVRBX0VTQ0FQRURfREFTSF9EQVNIX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoY3AgPT09ICQuSFlQSEVOX01JTlVTKSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJy0nKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5MRVNTX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFNDUklQVF9EQVRBX0VTQ0FQRURfTEVTU19USEFOX1NJR05fU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTQ1JJUFRfREFUQV9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPicpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFNDUklQVF9EQVRBX0VTQ0FQRURfU1RBVEU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnModW5pY29kZS5SRVBMQUNFTUVOVF9DSEFSQUNURVIpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lb2ZJblNjcmlwdEh0bWxDb21tZW50TGlrZVRleHQpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU0NSSVBUX0RBVEFfRVNDQVBFRF9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDb2RlUG9pbnQoY3ApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2NyaXB0IGRhdGEgZXNjYXBlZCBsZXNzLXRoYW4gc2lnbiBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW1NDUklQVF9EQVRBX0VTQ0FQRURfTEVTU19USEFOX1NJR05fU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChjcCA9PT0gJC5TT0xJRFVTKSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBCdWZmID0gW107XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU0NSSVBUX0RBVEFfRVNDQVBFRF9FTkRfVEFHX09QRU5fU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBc2NpaUxldHRlcihjcCkpIHtcbiAgICAgICAgICAgIHRoaXMudGVtcEJ1ZmYgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPCcpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShTQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFX1NUQVJUX1NUQVRFKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPCcpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShTQ1JJUFRfREFUQV9FU0NBUEVEX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNjcmlwdCBkYXRhIGVzY2FwZWQgZW5kIHRhZyBvcGVuIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbU0NSSVBUX0RBVEFfRVNDQVBFRF9FTkRfVEFHX09QRU5fU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChpc0FzY2lpTGV0dGVyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlRW5kVGFnVG9rZW4oKTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoU0NSSVBUX0RBVEFfRVNDQVBFRF9FTkRfVEFHX05BTUVfU1RBVEUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCc8LycpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShTQ1JJUFRfREFUQV9FU0NBUEVEX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNjcmlwdCBkYXRhIGVzY2FwZWQgZW5kIHRhZyBuYW1lIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbU0NSSVBUX0RBVEFfRVNDQVBFRF9FTkRfVEFHX05BTUVfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChpc0FzY2lpVXBwZXIoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi50YWdOYW1lICs9IHRvQXNjaWlMb3dlckNoYXIoY3ApO1xuICAgICAgICAgICAgdGhpcy50ZW1wQnVmZi5wdXNoKGNwKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FzY2lpTG93ZXIoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi50YWdOYW1lICs9IHRvQ2hhcihjcCk7XG4gICAgICAgICAgICB0aGlzLnRlbXBCdWZmLnB1c2goY3ApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMubGFzdFN0YXJ0VGFnTmFtZSA9PT0gdGhpcy5jdXJyZW50VG9rZW4udGFnTmFtZSkge1xuICAgICAgICAgICAgICAgIGlmIChpc1doaXRlc3BhY2UoY3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBCRUZPUkVfQVRUUklCVVRFX05BTUVfU1RBVEU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY3AgPT09ICQuU09MSURVUykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU0VMRl9DTE9TSU5HX1NUQVJUX1RBR19TVEFURTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjcCA9PT0gJC5HUkVBVEVSX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBEQVRBX1NUQVRFO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJzwvJyk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0U2V2ZXJhbENvZGVQb2ludHModGhpcy50ZW1wQnVmZik7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKFNDUklQVF9EQVRBX0VTQ0FQRURfU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2NyaXB0IGRhdGEgZG91YmxlIGVzY2FwZSBzdGFydCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW1NDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVfU1RBUlRfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChpc1doaXRlc3BhY2UoY3ApIHx8IGNwID09PSAkLlNPTElEVVMgfHwgY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLl9pc1RlbXBCdWZmZXJFcXVhbFRvU2NyaXB0U3RyaW5nKClcbiAgICAgICAgICAgICAgICA/IFNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX1NUQVRFXG4gICAgICAgICAgICAgICAgOiBTQ1JJUFRfREFUQV9FU0NBUEVEX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENvZGVQb2ludChjcCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBc2NpaVVwcGVyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy50ZW1wQnVmZi5wdXNoKHRvQXNjaWlMb3dlckNvZGVQb2ludChjcCkpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENvZGVQb2ludChjcCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBc2NpaUxvd2VyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy50ZW1wQnVmZi5wdXNoKGNwKTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDb2RlUG9pbnQoY3ApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShTQ1JJUFRfREFUQV9FU0NBUEVEX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNjcmlwdCBkYXRhIGRvdWJsZSBlc2NhcGVkIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChjcCA9PT0gJC5IWVBIRU5fTUlOVVMpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFRF9EQVNIX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCctJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuTEVTU19USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFRF9MRVNTX1RIQU5fU0lHTl9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPCcpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKHVuaWNvZGUuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5FT0YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuZW9mSW5TY3JpcHRIdG1sQ29tbWVudExpa2VUZXh0KTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENvZGVQb2ludChjcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTY3JpcHQgZGF0YSBkb3VibGUgZXNjYXBlZCBkYXNoIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfREFTSF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLkhZUEhFTl9NSU5VUykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX0RBU0hfREFTSF9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnLScpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkxFU1NfVEhBTl9TSUdOKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfTEVTU19USEFOX1NJR05fU1RBVEU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJzwnKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5OVUxMKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFRF9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycyh1bmljb2RlLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUik7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluU2NyaXB0SHRtbENvbW1lbnRMaWtlVGV4dCk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFRF9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDb2RlUG9pbnQoY3ApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2NyaXB0IGRhdGEgZG91YmxlIGVzY2FwZWQgZGFzaCBkYXNoIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfREFTSF9EQVNIX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoY3AgPT09ICQuSFlQSEVOX01JTlVTKSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJy0nKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5MRVNTX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX0xFU1NfVEhBTl9TSUdOX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCc8Jyk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTQ1JJUFRfREFUQV9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPicpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKHVuaWNvZGUuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5FT0YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuZW9mSW5TY3JpcHRIdG1sQ29tbWVudExpa2VUZXh0KTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENvZGVQb2ludChjcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTY3JpcHQgZGF0YSBkb3VibGUgZXNjYXBlZCBsZXNzLXRoYW4gc2lnbiBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW1NDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX0xFU1NfVEhBTl9TSUdOX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoY3AgPT09ICQuU09MSURVUykge1xuICAgICAgICAgICAgdGhpcy50ZW1wQnVmZiA9IFtdO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVfRU5EX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCcvJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKFNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNjcmlwdCBkYXRhIGRvdWJsZSBlc2NhcGUgZW5kIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRV9FTkRfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChpc1doaXRlc3BhY2UoY3ApIHx8IGNwID09PSAkLlNPTElEVVMgfHwgY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLl9pc1RlbXBCdWZmZXJFcXVhbFRvU2NyaXB0U3RyaW5nKClcbiAgICAgICAgICAgICAgICA/IFNDUklQVF9EQVRBX0VTQ0FQRURfU1RBVEVcbiAgICAgICAgICAgICAgICA6IFNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX1NUQVRFO1xuXG4gICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FzY2lpVXBwZXIoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBCdWZmLnB1c2godG9Bc2NpaUxvd2VyQ29kZVBvaW50KGNwKSk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FzY2lpTG93ZXIoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBCdWZmLnB1c2goY3ApO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENvZGVQb2ludChjcCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKFNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEJlZm9yZSBhdHRyaWJ1dGUgbmFtZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0JFRk9SRV9BVFRSSUJVVEVfTkFNRV9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzV2hpdGVzcGFjZShjcCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjcCA9PT0gJC5TT0xJRFVTIHx8IGNwID09PSAkLkdSRUFURVJfVEhBTl9TSUdOIHx8IGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShBRlRFUl9BVFRSSUJVVEVfTkFNRV9TVEFURSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRVFVQUxTX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZEVxdWFsc1NpZ25CZWZvcmVBdHRyaWJ1dGVOYW1lKTtcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZUF0dHIoJz0nKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBBVFRSSUJVVEVfTkFNRV9TVEFURTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZUF0dHIoJycpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShBVFRSSUJVVEVfTkFNRV9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBdHRyaWJ1dGUgbmFtZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0FUVFJJQlVURV9OQU1FX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNwKSB8fCBjcCA9PT0gJC5TT0xJRFVTIHx8IGNwID09PSAkLkdSRUFURVJfVEhBTl9TSUdOIHx8IGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fbGVhdmVBdHRyTmFtZShBRlRFUl9BVFRSSUJVVEVfTkFNRV9TVEFURSk7XG4gICAgICAgICAgICB0aGlzLl91bmNvbnN1bWUoKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5FUVVBTFNfU0lHTikge1xuICAgICAgICAgICAgdGhpcy5fbGVhdmVBdHRyTmFtZShCRUZPUkVfQVRUUklCVVRFX1ZBTFVFX1NUQVRFKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FzY2lpVXBwZXIoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRyLm5hbWUgKz0gdG9Bc2NpaUxvd2VyQ2hhcihjcCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuUVVPVEFUSU9OX01BUksgfHwgY3AgPT09ICQuQVBPU1RST1BIRSB8fCBjcCA9PT0gJC5MRVNTX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi51bmV4cGVjdGVkQ2hhcmFjdGVySW5BdHRyaWJ1dGVOYW1lKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dHIubmFtZSArPSB0b0NoYXIoY3ApO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0ci5uYW1lICs9IHVuaWNvZGUuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0ci5uYW1lICs9IHRvQ2hhcihjcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZnRlciBhdHRyaWJ1dGUgbmFtZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0FGVEVSX0FUVFJJQlVURV9OQU1FX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNwKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNwID09PSAkLlNPTElEVVMpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTRUxGX0NMT1NJTkdfU1RBUlRfVEFHX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVRVUFMU19TSUdOKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9WQUxVRV9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5HUkVBVEVSX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERBVEFfU1RBVEU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluVGFnKTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlQXR0cignJyk7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKEFUVFJJQlVURV9OQU1FX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEJlZm9yZSBhdHRyaWJ1dGUgdmFsdWUgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtCRUZPUkVfQVRUUklCVVRFX1ZBTFVFX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNwKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNwID09PSAkLlFVT1RBVElPTl9NQVJLKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gQVRUUklCVVRFX1ZBTFVFX0RPVUJMRV9RVU9URURfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuQVBPU1RST1BIRSkge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IEFUVFJJQlVURV9WQUxVRV9TSU5HTEVfUVVPVEVEX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkdSRUFURVJfVEhBTl9TSUdOKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLm1pc3NpbmdBdHRyaWJ1dGVWYWx1ZSk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gREFUQV9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDdXJyZW50VG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoQVRUUklCVVRFX1ZBTFVFX1VOUVVPVEVEX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEF0dHJpYnV0ZSB2YWx1ZSAoZG91YmxlLXF1b3RlZCkgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtBVFRSSUJVVEVfVkFMVUVfRE9VQkxFX1FVT1RFRF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLlFVT1RBVElPTl9NQVJLKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gQUZURVJfQVRUUklCVVRFX1ZBTFVFX1FVT1RFRF9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5BTVBFUlNBTkQpIHtcbiAgICAgICAgICAgIHRoaXMucmV0dXJuU3RhdGUgPSBBVFRSSUJVVEVfVkFMVUVfRE9VQkxFX1FVT1RFRF9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBDSEFSQUNURVJfUkVGRVJFTkNFX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0ci52YWx1ZSArPSB1bmljb2RlLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUjtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5FT0YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuZW9mSW5UYWcpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRyLnZhbHVlICs9IHRvQ2hhcihjcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBdHRyaWJ1dGUgdmFsdWUgKHNpbmdsZS1xdW90ZWQpIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbQVRUUklCVVRFX1ZBTFVFX1NJTkdMRV9RVU9URURfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChjcCA9PT0gJC5BUE9TVFJPUEhFKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gQUZURVJfQVRUUklCVVRFX1ZBTFVFX1FVT1RFRF9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5BTVBFUlNBTkQpIHtcbiAgICAgICAgICAgIHRoaXMucmV0dXJuU3RhdGUgPSBBVFRSSUJVVEVfVkFMVUVfU0lOR0xFX1FVT1RFRF9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBDSEFSQUNURVJfUkVGRVJFTkNFX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0ci52YWx1ZSArPSB1bmljb2RlLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUjtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5FT0YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuZW9mSW5UYWcpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRyLnZhbHVlICs9IHRvQ2hhcihjcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBdHRyaWJ1dGUgdmFsdWUgKHVucXVvdGVkKSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0FUVFJJQlVURV9WQUxVRV9VTlFVT1RFRF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzV2hpdGVzcGFjZShjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2xlYXZlQXR0clZhbHVlKEJFRk9SRV9BVFRSSUJVVEVfTkFNRV9TVEFURSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuQU1QRVJTQU5EKSB7XG4gICAgICAgICAgICB0aGlzLnJldHVyblN0YXRlID0gQVRUUklCVVRFX1ZBTFVFX1VOUVVPVEVEX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IENIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuX2xlYXZlQXR0clZhbHVlKERBVEFfU1RBVEUpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0ci52YWx1ZSArPSB1bmljb2RlLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUjtcbiAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIGNwID09PSAkLlFVT1RBVElPTl9NQVJLIHx8XG4gICAgICAgICAgICBjcCA9PT0gJC5BUE9TVFJPUEhFIHx8XG4gICAgICAgICAgICBjcCA9PT0gJC5MRVNTX1RIQU5fU0lHTiB8fFxuICAgICAgICAgICAgY3AgPT09ICQuRVFVQUxTX1NJR04gfHxcbiAgICAgICAgICAgIGNwID09PSAkLkdSQVZFX0FDQ0VOVFxuICAgICAgICApIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZENoYXJhY3RlckluVW5xdW90ZWRBdHRyaWJ1dGVWYWx1ZSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRyLnZhbHVlICs9IHRvQ2hhcihjcCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluVGFnKTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0ci52YWx1ZSArPSB0b0NoYXIoY3ApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWZ0ZXIgYXR0cmlidXRlIHZhbHVlIChxdW90ZWQpIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbQUZURVJfQVRUUklCVVRFX1ZBTFVFX1FVT1RFRF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzV2hpdGVzcGFjZShjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2xlYXZlQXR0clZhbHVlKEJFRk9SRV9BVFRSSUJVVEVfTkFNRV9TVEFURSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuU09MSURVUykge1xuICAgICAgICAgICAgdGhpcy5fbGVhdmVBdHRyVmFsdWUoU0VMRl9DTE9TSU5HX1NUQVJUX1RBR19TVEFURSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuX2xlYXZlQXR0clZhbHVlKERBVEFfU1RBVEUpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lb2ZJblRhZyk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIubWlzc2luZ1doaXRlc3BhY2VCZXR3ZWVuQXR0cmlidXRlcyk7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKEJFRk9SRV9BVFRSSUJVVEVfTkFNRV9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTZWxmLWNsb3Npbmcgc3RhcnQgdGFnIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbU0VMRl9DTE9TSU5HX1NUQVJUX1RBR19TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLkdSRUFURVJfVEhBTl9TSUdOKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5zZWxmQ2xvc2luZyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gREFUQV9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDdXJyZW50VG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5FT0YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuZW9mSW5UYWcpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLnVuZXhwZWN0ZWRTb2xpZHVzSW5UYWcpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShCRUZPUkVfQVRUUklCVVRFX05BTUVfU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQm9ndXMgY29tbWVudCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0JPR1VTX0NPTU1FTlRfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChjcCA9PT0gJC5HUkVBVEVSX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERBVEFfU1RBVEU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5OVUxMKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmRhdGEgKz0gdW5pY29kZS5SRVBMQUNFTUVOVF9DSEFSQUNURVI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5kYXRhICs9IHRvQ2hhcihjcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBNYXJrdXAgZGVjbGFyYXRpb24gb3BlbiBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW01BUktVUF9ERUNMQVJBVElPTl9PUEVOX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAodGhpcy5fY29uc3VtZVNlcXVlbmNlSWZNYXRjaCgkJC5EQVNIX0RBU0hfU1RSSU5HLCBjcCwgdHJ1ZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZUNvbW1lbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IENPTU1FTlRfU1RBUlRfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fY29uc3VtZVNlcXVlbmNlSWZNYXRjaCgkJC5ET0NUWVBFX1NUUklORywgY3AsIGZhbHNlKSkge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERPQ1RZUEVfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fY29uc3VtZVNlcXVlbmNlSWZNYXRjaCgkJC5DREFUQV9TVEFSVF9TVFJJTkcsIGNwLCB0cnVlKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWxsb3dDREFUQSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBDREFUQV9TRUNUSU9OX1NUQVRFO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmNkYXRhSW5IdG1sQ29udGVudCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3JlYXRlQ29tbWVudFRva2VuKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZGF0YSA9ICdbQ0RBVEFbJztcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gQk9HVVNfQ09NTUVOVF9TVEFURTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vTk9URTogc2VxdWVuY2UgbG9va3VwIGNhbiBiZSBhYnJ1cHRlZCBieSBoaWJlcm5hdGlvbi4gSW4gdGhhdCBjYXNlIGxvb2t1cFxuICAgICAgICAvL3Jlc3VsdHMgYXJlIG5vIGxvbmdlciB2YWxpZCBhbmQgd2Ugd2lsbCBuZWVkIHRvIHN0YXJ0IG92ZXIuXG4gICAgICAgIGVsc2UgaWYgKCF0aGlzLl9lbnN1cmVIaWJlcm5hdGlvbigpKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmluY29ycmVjdGx5T3BlbmVkQ29tbWVudCk7XG4gICAgICAgICAgICB0aGlzLl9jcmVhdGVDb21tZW50VG9rZW4oKTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoQk9HVVNfQ09NTUVOVF9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDb21tZW50IHN0YXJ0IHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbQ09NTUVOVF9TVEFSVF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLkhZUEhFTl9NSU5VUykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IENPTU1FTlRfU1RBUlRfREFTSF9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5HUkVBVEVSX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5hYnJ1cHRDbG9zaW5nT2ZFbXB0eUNvbW1lbnQpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERBVEFfU1RBVEU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKENPTU1FTlRfU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ29tbWVudCBzdGFydCBkYXNoIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbQ09NTUVOVF9TVEFSVF9EQVNIX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoY3AgPT09ICQuSFlQSEVOX01JTlVTKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gQ09NTUVOVF9FTkRfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuYWJydXB0Q2xvc2luZ09mRW1wdHlDb21tZW50KTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBEQVRBX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lb2ZJbkNvbW1lbnQpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5kYXRhICs9ICctJztcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoQ09NTUVOVF9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDb21tZW50IHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbQ09NTUVOVF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLkhZUEhFTl9NSU5VUykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IENPTU1FTlRfRU5EX0RBU0hfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuTEVTU19USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmRhdGEgKz0gJzwnO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IENPTU1FTlRfTEVTU19USEFOX1NJR05fU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuTlVMTCkge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi51bmV4cGVjdGVkTnVsbENoYXJhY3Rlcik7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5kYXRhICs9IHVuaWNvZGUuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lb2ZJbkNvbW1lbnQpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5kYXRhICs9IHRvQ2hhcihjcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDb21tZW50IGxlc3MtdGhhbiBzaWduIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbQ09NTUVOVF9MRVNTX1RIQU5fU0lHTl9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLkVYQ0xBTUFUSU9OX01BUkspIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmRhdGEgKz0gJyEnO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IENPTU1FTlRfTEVTU19USEFOX1NJR05fQkFOR19TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5MRVNTX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZGF0YSArPSAnISc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKENPTU1FTlRfU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ29tbWVudCBsZXNzLXRoYW4gc2lnbiBiYW5nIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbQ09NTUVOVF9MRVNTX1RIQU5fU0lHTl9CQU5HX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoY3AgPT09ICQuSFlQSEVOX01JTlVTKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gQ09NTUVOVF9MRVNTX1RIQU5fU0lHTl9CQU5HX0RBU0hfU1RBVEU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKENPTU1FTlRfU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ29tbWVudCBsZXNzLXRoYW4gc2lnbiBiYW5nIGRhc2ggc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtDT01NRU5UX0xFU1NfVEhBTl9TSUdOX0JBTkdfREFTSF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLkhZUEhFTl9NSU5VUykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IENPTU1FTlRfTEVTU19USEFOX1NJR05fQkFOR19EQVNIX0RBU0hfU1RBVEU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKENPTU1FTlRfRU5EX0RBU0hfU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ29tbWVudCBsZXNzLXRoYW4gc2lnbiBiYW5nIGRhc2ggZGFzaCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0NPTU1FTlRfTEVTU19USEFOX1NJR05fQkFOR19EQVNIX0RBU0hfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChjcCAhPT0gJC5HUkVBVEVSX1RIQU5fU0lHTiAmJiBjcCAhPT0gJC5FT0YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIubmVzdGVkQ29tbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKENPTU1FTlRfRU5EX1NUQVRFKTtcbiAgICB9XG5cbiAgICAvLyBDb21tZW50IGVuZCBkYXNoIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbQ09NTUVOVF9FTkRfREFTSF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLkhZUEhFTl9NSU5VUykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IENPTU1FTlRfRU5EX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lb2ZJbkNvbW1lbnQpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5kYXRhICs9ICctJztcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoQ09NTUVOVF9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDb21tZW50IGVuZCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0NPTU1FTlRfRU5EX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBEQVRBX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVYQ0xBTUFUSU9OX01BUkspIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBDT01NRU5UX0VORF9CQU5HX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkhZUEhFTl9NSU5VUykge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZGF0YSArPSAnLSc7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluQ29tbWVudCk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmRhdGEgKz0gJy0tJztcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoQ09NTUVOVF9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDb21tZW50IGVuZCBiYW5nIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbQ09NTUVOVF9FTkRfQkFOR19TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLkhZUEhFTl9NSU5VUykge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZGF0YSArPSAnLS0hJztcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBDT01NRU5UX0VORF9EQVNIX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkdSRUFURVJfVEhBTl9TSUdOKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmluY29ycmVjdGx5Q2xvc2VkQ29tbWVudCk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gREFUQV9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDdXJyZW50VG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5FT0YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuZW9mSW5Db21tZW50KTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDdXJyZW50VG9rZW4oKTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZGF0YSArPSAnLS0hJztcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoQ09NTUVOVF9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBET0NUWVBFIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbRE9DVFlQRV9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzV2hpdGVzcGFjZShjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBCRUZPUkVfRE9DVFlQRV9OQU1FX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkdSRUFURVJfVEhBTl9TSUdOKSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKEJFRk9SRV9ET0NUWVBFX05BTUVfU1RBVEUpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lb2ZJbkRvY3R5cGUpO1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlRG9jdHlwZVRva2VuKG51bGwpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLm1pc3NpbmdXaGl0ZXNwYWNlQmVmb3JlRG9jdHlwZU5hbWUpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShCRUZPUkVfRE9DVFlQRV9OQU1FX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEJlZm9yZSBET0NUWVBFIG5hbWUgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtCRUZPUkVfRE9DVFlQRV9OQU1FX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNwKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzQXNjaWlVcHBlcihjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZURvY3R5cGVUb2tlbih0b0FzY2lpTG93ZXJDaGFyKGNwKSk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gRE9DVFlQRV9OQU1FX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlRG9jdHlwZVRva2VuKHVuaWNvZGUuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBET0NUWVBFX05BTUVfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIubWlzc2luZ0RvY3R5cGVOYW1lKTtcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZURvY3R5cGVUb2tlbihudWxsKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDdXJyZW50VG9rZW4oKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBEQVRBX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lb2ZJbkRvY3R5cGUpO1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlRG9jdHlwZVRva2VuKG51bGwpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9jcmVhdGVEb2N0eXBlVG9rZW4odG9DaGFyKGNwKSk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gRE9DVFlQRV9OQU1FX1NUQVRFO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRE9DVFlQRSBuYW1lIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbRE9DVFlQRV9OQU1FX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IEFGVEVSX0RPQ1RZUEVfTkFNRV9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5HUkVBVEVSX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERBVEFfU1RBVEU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBc2NpaVVwcGVyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4ubmFtZSArPSB0b0FzY2lpTG93ZXJDaGFyKGNwKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5OVUxMKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLm5hbWUgKz0gdW5pY29kZS5SRVBMQUNFTUVOVF9DSEFSQUNURVI7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluRG9jdHlwZSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLm5hbWUgKz0gdG9DaGFyKGNwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFmdGVyIERPQ1RZUEUgbmFtZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0FGVEVSX0RPQ1RZUEVfTkFNRV9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzV2hpdGVzcGFjZShjcCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjcCA9PT0gJC5HUkVBVEVSX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERBVEFfU1RBVEU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluRG9jdHlwZSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9jb25zdW1lU2VxdWVuY2VJZk1hdGNoKCQkLlBVQkxJQ19TVFJJTkcsIGNwLCBmYWxzZSkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBBRlRFUl9ET0NUWVBFX1BVQkxJQ19LRVlXT1JEX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2NvbnN1bWVTZXF1ZW5jZUlmTWF0Y2goJCQuU1lTVEVNX1NUUklORywgY3AsIGZhbHNlKSkge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IEFGVEVSX0RPQ1RZUEVfU1lTVEVNX0tFWVdPUkRfU1RBVEU7XG4gICAgICAgIH1cbiAgICAgICAgLy9OT1RFOiBzZXF1ZW5jZSBsb29rdXAgY2FuIGJlIGFicnVwdGVkIGJ5IGhpYmVybmF0aW9uLiBJbiB0aGF0IGNhc2UgbG9va3VwXG4gICAgICAgIC8vcmVzdWx0cyBhcmUgbm8gbG9uZ2VyIHZhbGlkIGFuZCB3ZSB3aWxsIG5lZWQgdG8gc3RhcnQgb3Zlci5cbiAgICAgICAgZWxzZSBpZiAoIXRoaXMuX2Vuc3VyZUhpYmVybmF0aW9uKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuaW52YWxpZENoYXJhY3RlclNlcXVlbmNlQWZ0ZXJEb2N0eXBlTmFtZSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKEJPR1VTX0RPQ1RZUEVfU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWZ0ZXIgRE9DVFlQRSBwdWJsaWMga2V5d29yZCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0FGVEVSX0RPQ1RZUEVfUFVCTElDX0tFWVdPUkRfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChpc1doaXRlc3BhY2UoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gQkVGT1JFX0RPQ1RZUEVfUFVCTElDX0lERU5USUZJRVJfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuUVVPVEFUSU9OX01BUkspIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIubWlzc2luZ1doaXRlc3BhY2VBZnRlckRvY3R5cGVQdWJsaWNLZXl3b3JkKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLnB1YmxpY0lkID0gJyc7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gRE9DVFlQRV9QVUJMSUNfSURFTlRJRklFUl9ET1VCTEVfUVVPVEVEX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkFQT1NUUk9QSEUpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIubWlzc2luZ1doaXRlc3BhY2VBZnRlckRvY3R5cGVQdWJsaWNLZXl3b3JkKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLnB1YmxpY0lkID0gJyc7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gRE9DVFlQRV9QVUJMSUNfSURFTlRJRklFUl9TSU5HTEVfUVVPVEVEX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkdSRUFURVJfVEhBTl9TSUdOKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLm1pc3NpbmdEb2N0eXBlUHVibGljSWRlbnRpZmllcik7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gREFUQV9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDdXJyZW50VG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5FT0YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuZW9mSW5Eb2N0eXBlKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDdXJyZW50VG9rZW4oKTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5taXNzaW5nUXVvdGVCZWZvcmVEb2N0eXBlUHVibGljSWRlbnRpZmllcik7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKEJPR1VTX0RPQ1RZUEVfU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQmVmb3JlIERPQ1RZUEUgcHVibGljIGlkZW50aWZpZXIgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtCRUZPUkVfRE9DVFlQRV9QVUJMSUNfSURFTlRJRklFUl9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzV2hpdGVzcGFjZShjcCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjcCA9PT0gJC5RVU9UQVRJT05fTUFSSykge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4ucHVibGljSWQgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBET0NUWVBFX1BVQkxJQ19JREVOVElGSUVSX0RPVUJMRV9RVU9URURfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuQVBPU1RST1BIRSkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4ucHVibGljSWQgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBET0NUWVBFX1BVQkxJQ19JREVOVElGSUVSX1NJTkdMRV9RVU9URURfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIubWlzc2luZ0RvY3R5cGVQdWJsaWNJZGVudGlmaWVyKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBEQVRBX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lb2ZJbkRvY3R5cGUpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLm1pc3NpbmdRdW90ZUJlZm9yZURvY3R5cGVQdWJsaWNJZGVudGlmaWVyKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoQk9HVVNfRE9DVFlQRV9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBET0NUWVBFIHB1YmxpYyBpZGVudGlmaWVyIChkb3VibGUtcXVvdGVkKSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0RPQ1RZUEVfUFVCTElDX0lERU5USUZJRVJfRE9VQkxFX1FVT1RFRF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLlFVT1RBVElPTl9NQVJLKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gQUZURVJfRE9DVFlQRV9QVUJMSUNfSURFTlRJRklFUl9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5OVUxMKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLnB1YmxpY0lkICs9IHVuaWNvZGUuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkdSRUFURVJfVEhBTl9TSUdOKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmFicnVwdERvY3R5cGVQdWJsaWNJZGVudGlmaWVyKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDdXJyZW50VG9rZW4oKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBEQVRBX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lb2ZJbkRvY3R5cGUpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5wdWJsaWNJZCArPSB0b0NoYXIoY3ApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRE9DVFlQRSBwdWJsaWMgaWRlbnRpZmllciAoc2luZ2xlLXF1b3RlZCkgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtET0NUWVBFX1BVQkxJQ19JREVOVElGSUVSX1NJTkdMRV9RVU9URURfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChjcCA9PT0gJC5BUE9TVFJPUEhFKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gQUZURVJfRE9DVFlQRV9QVUJMSUNfSURFTlRJRklFUl9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5OVUxMKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLnB1YmxpY0lkICs9IHVuaWNvZGUuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkdSRUFURVJfVEhBTl9TSUdOKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmFicnVwdERvY3R5cGVQdWJsaWNJZGVudGlmaWVyKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDdXJyZW50VG9rZW4oKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBEQVRBX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lb2ZJbkRvY3R5cGUpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5wdWJsaWNJZCArPSB0b0NoYXIoY3ApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWZ0ZXIgRE9DVFlQRSBwdWJsaWMgaWRlbnRpZmllciBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0FGVEVSX0RPQ1RZUEVfUFVCTElDX0lERU5USUZJRVJfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChpc1doaXRlc3BhY2UoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gQkVUV0VFTl9ET0NUWVBFX1BVQkxJQ19BTkRfU1lTVEVNX0lERU5USUZJRVJTX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkdSRUFURVJfVEhBTl9TSUdOKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gREFUQV9TVEFURTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDdXJyZW50VG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5RVU9UQVRJT05fTUFSSykge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5taXNzaW5nV2hpdGVzcGFjZUJldHdlZW5Eb2N0eXBlUHVibGljQW5kU3lzdGVtSWRlbnRpZmllcnMpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uc3lzdGVtSWQgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSX0RPVUJMRV9RVU9URURfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuQVBPU1RST1BIRSkge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5taXNzaW5nV2hpdGVzcGFjZUJldHdlZW5Eb2N0eXBlUHVibGljQW5kU3lzdGVtSWRlbnRpZmllcnMpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uc3lzdGVtSWQgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSX1NJTkdMRV9RVU9URURfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluRG9jdHlwZSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIubWlzc2luZ1F1b3RlQmVmb3JlRG9jdHlwZVN5c3RlbUlkZW50aWZpZXIpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShCT0dVU19ET0NUWVBFX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEJldHdlZW4gRE9DVFlQRSBwdWJsaWMgYW5kIHN5c3RlbSBpZGVudGlmaWVycyBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0JFVFdFRU5fRE9DVFlQRV9QVUJMSUNfQU5EX1NZU1RFTV9JREVOVElGSUVSU19TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzV2hpdGVzcGFjZShjcCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjcCA9PT0gJC5HUkVBVEVSX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERBVEFfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuUVVPVEFUSU9OX01BUkspIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLnN5c3RlbUlkID0gJyc7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUl9ET1VCTEVfUVVPVEVEX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkFQT1NUUk9QSEUpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLnN5c3RlbUlkID0gJyc7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUl9TSU5HTEVfUVVPVEVEX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lb2ZJbkRvY3R5cGUpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLm1pc3NpbmdRdW90ZUJlZm9yZURvY3R5cGVTeXN0ZW1JZGVudGlmaWVyKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoQk9HVVNfRE9DVFlQRV9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZnRlciBET0NUWVBFIHN5c3RlbSBrZXl3b3JkIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbQUZURVJfRE9DVFlQRV9TWVNURU1fS0VZV09SRF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzV2hpdGVzcGFjZShjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBCRUZPUkVfRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUl9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5RVU9UQVRJT05fTUFSSykge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5taXNzaW5nV2hpdGVzcGFjZUFmdGVyRG9jdHlwZVN5c3RlbUtleXdvcmQpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uc3lzdGVtSWQgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSX0RPVUJMRV9RVU9URURfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuQVBPU1RST1BIRSkge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5taXNzaW5nV2hpdGVzcGFjZUFmdGVyRG9jdHlwZVN5c3RlbUtleXdvcmQpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uc3lzdGVtSWQgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSX1NJTkdMRV9RVU9URURfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIubWlzc2luZ0RvY3R5cGVTeXN0ZW1JZGVudGlmaWVyKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBEQVRBX1NUQVRFO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lb2ZJbkRvY3R5cGUpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLm1pc3NpbmdRdW90ZUJlZm9yZURvY3R5cGVTeXN0ZW1JZGVudGlmaWVyKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoQk9HVVNfRE9DVFlQRV9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBCZWZvcmUgRE9DVFlQRSBzeXN0ZW0gaWRlbnRpZmllciBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0JFRk9SRV9ET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNwKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNwID09PSAkLlFVT1RBVElPTl9NQVJLKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5zeXN0ZW1JZCA9ICcnO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVJfRE9VQkxFX1FVT1RFRF9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5BUE9TVFJPUEhFKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5zeXN0ZW1JZCA9ICcnO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVJfU0lOR0xFX1FVT1RFRF9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5HUkVBVEVSX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5taXNzaW5nRG9jdHlwZVN5c3RlbUlkZW50aWZpZXIpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERBVEFfU1RBVEU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluRG9jdHlwZSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIubWlzc2luZ1F1b3RlQmVmb3JlRG9jdHlwZVN5c3RlbUlkZW50aWZpZXIpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShCT0dVU19ET0NUWVBFX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIERPQ1RZUEUgc3lzdGVtIGlkZW50aWZpZXIgKGRvdWJsZS1xdW90ZWQpIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUl9ET1VCTEVfUVVPVEVEX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoY3AgPT09ICQuUVVPVEFUSU9OX01BUkspIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBBRlRFUl9ET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uc3lzdGVtSWQgKz0gdW5pY29kZS5SRVBMQUNFTUVOVF9DSEFSQUNURVI7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuYWJydXB0RG9jdHlwZVN5c3RlbUlkZW50aWZpZXIpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERBVEFfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluRG9jdHlwZSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLnN5c3RlbUlkICs9IHRvQ2hhcihjcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBET0NUWVBFIHN5c3RlbSBpZGVudGlmaWVyIChzaW5nbGUtcXVvdGVkKSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0RPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVJfU0lOR0xFX1FVT1RFRF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLkFQT1NUUk9QSEUpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBBRlRFUl9ET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uc3lzdGVtSWQgKz0gdW5pY29kZS5SRVBMQUNFTUVOVF9DSEFSQUNURVI7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuYWJydXB0RG9jdHlwZVN5c3RlbUlkZW50aWZpZXIpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERBVEFfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluRG9jdHlwZSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRva2VuLnN5c3RlbUlkICs9IHRvQ2hhcihjcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZnRlciBET0NUWVBFIHN5c3RlbSBpZGVudGlmaWVyIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbQUZURVJfRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUl9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzV2hpdGVzcGFjZShjcCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjcCA9PT0gJC5HUkVBVEVSX1RIQU5fU0lHTikge1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IERBVEFfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuRU9GKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmVvZkluRG9jdHlwZSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q3VycmVudFRva2VuKCk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZENoYXJhY3RlckFmdGVyRG9jdHlwZVN5c3RlbUlkZW50aWZpZXIpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShCT0dVU19ET0NUWVBFX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEJvZ3VzIERPQ1RZUEUgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtCT0dVU19ET0NUWVBFX1NUQVRFXShjcCkge1xuICAgICAgICBpZiAoY3AgPT09ICQuR1JFQVRFUl9USEFOX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDdXJyZW50VG9rZW4oKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBEQVRBX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDREFUQSBzZWN0aW9uIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbQ0RBVEFfU0VDVElPTl9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLlJJR0hUX1NRVUFSRV9CUkFDS0VUKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gQ0RBVEFfU0VDVElPTl9CUkFDS0VUX1NUQVRFO1xuICAgICAgICB9IGVsc2UgaWYgKGNwID09PSAkLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5lb2ZJbkNkYXRhKTtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENvZGVQb2ludChjcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDREFUQSBzZWN0aW9uIGJyYWNrZXQgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtDREFUQV9TRUNUSU9OX0JSQUNLRVRfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChjcCA9PT0gJC5SSUdIVF9TUVVBUkVfQlJBQ0tFVCkge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IENEQVRBX1NFQ1RJT05fRU5EX1NUQVRFO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCddJyk7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKENEQVRBX1NFQ1RJT05fU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ0RBVEEgc2VjdGlvbiBlbmQgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtDREFUQV9TRUNUSU9OX0VORF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSAkLkdSRUFURVJfVEhBTl9TSUdOKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gREFUQV9TVEFURTtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5SSUdIVF9TUVVBUkVfQlJBQ0tFVCkge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCddJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJ11dJyk7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKENEQVRBX1NFQ1RJT05fU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hhcmFjdGVyIHJlZmVyZW5jZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBVEVdKGNwKSB7XG4gICAgICAgIHRoaXMudGVtcEJ1ZmYgPSBbJC5BTVBFUlNBTkRdO1xuXG4gICAgICAgIGlmIChjcCA9PT0gJC5OVU1CRVJfU0lHTikge1xuICAgICAgICAgICAgdGhpcy50ZW1wQnVmZi5wdXNoKGNwKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBOVU1FUklDX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBVEU7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBc2NpaUFscGhhTnVtZXJpYyhjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoTkFNRURfQ0hBUkFDVEVSX1JFRkVSRU5DRV9TVEFURSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9mbHVzaENvZGVQb2ludHNDb25zdW1lZEFzQ2hhcmFjdGVyUmVmZXJlbmNlKCk7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKHRoaXMucmV0dXJuU3RhdGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gTmFtZWQgY2hhcmFjdGVyIHJlZmVyZW5jZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW05BTUVEX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBVEVdKGNwKSB7XG4gICAgICAgIGNvbnN0IG1hdGNoUmVzdWx0ID0gdGhpcy5fbWF0Y2hOYW1lZENoYXJhY3RlclJlZmVyZW5jZShjcCk7XG5cbiAgICAgICAgLy9OT1RFOiBtYXRjaGluZyBjYW4gYmUgYWJydXB0ZWQgYnkgaGliZXJuYXRpb24uIEluIHRoYXQgY2FzZSBtYXRjaFxuICAgICAgICAvL3Jlc3VsdHMgYXJlIG5vIGxvbmdlciB2YWxpZCBhbmQgd2Ugd2lsbCBuZWVkIHRvIHN0YXJ0IG92ZXIuXG4gICAgICAgIGlmICh0aGlzLl9lbnN1cmVIaWJlcm5hdGlvbigpKSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBCdWZmID0gWyQuQU1QRVJTQU5EXTtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaFJlc3VsdCkge1xuICAgICAgICAgICAgY29uc3Qgd2l0aFNlbWljb2xvbiA9IHRoaXMudGVtcEJ1ZmZbdGhpcy50ZW1wQnVmZi5sZW5ndGggLSAxXSA9PT0gJC5TRU1JQ09MT047XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5faXNDaGFyYWN0ZXJSZWZlcmVuY2VBdHRyaWJ1dGVRdWlyayh3aXRoU2VtaWNvbG9uKSkge1xuICAgICAgICAgICAgICAgIGlmICghd2l0aFNlbWljb2xvbikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9lcnJPbk5leHRDb2RlUG9pbnQoRVJSLm1pc3NpbmdTZW1pY29sb25BZnRlckNoYXJhY3RlclJlZmVyZW5jZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy50ZW1wQnVmZiA9IG1hdGNoUmVzdWx0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9mbHVzaENvZGVQb2ludHNDb25zdW1lZEFzQ2hhcmFjdGVyUmVmZXJlbmNlKCk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5yZXR1cm5TdGF0ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2ZsdXNoQ29kZVBvaW50c0NvbnN1bWVkQXNDaGFyYWN0ZXJSZWZlcmVuY2UoKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBBTUJJR1VPVVNfQU1QRVJTQU5EX1NUQVRFO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQW1iaWd1b3MgYW1wZXJzYW5kIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbQU1CSUdVT1VTX0FNUEVSU0FORF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzQXNjaWlBbHBoYU51bWVyaWMoY3ApKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5faXNDaGFyYWN0ZXJSZWZlcmVuY2VJbkF0dHJpYnV0ZSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0ci52YWx1ZSArPSB0b0NoYXIoY3ApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChjcCA9PT0gJC5TRU1JQ09MT04pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoRVJSLnVua25vd25OYW1lZENoYXJhY3RlclJlZmVyZW5jZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUodGhpcy5yZXR1cm5TdGF0ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOdW1lcmljIGNoYXJhY3RlciByZWZlcmVuY2Ugc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFtOVU1FUklDX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBVEVdKGNwKSB7XG4gICAgICAgIHRoaXMuY2hhclJlZkNvZGUgPSAwO1xuXG4gICAgICAgIGlmIChjcCA9PT0gJC5MQVRJTl9TTUFMTF9YIHx8IGNwID09PSAkLkxBVElOX0NBUElUQUxfWCkge1xuICAgICAgICAgICAgdGhpcy50ZW1wQnVmZi5wdXNoKGNwKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBIRVhBREVNSUNBTF9DSEFSQUNURVJfUkVGRVJFTkNFX1NUQVJUX1NUQVRFO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShERUNJTUFMX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBUlRfU1RBVEUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gSGV4YWRlbWljYWwgY2hhcmFjdGVyIHJlZmVyZW5jZSBzdGFydCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0hFWEFERU1JQ0FMX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBUlRfU1RBVEVdKGNwKSB7XG4gICAgICAgIGlmIChpc0FzY2lpSGV4RGlnaXQoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKEhFWEFERU1JQ0FMX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBVEUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5hYnNlbmNlT2ZEaWdpdHNJbk51bWVyaWNDaGFyYWN0ZXJSZWZlcmVuY2UpO1xuICAgICAgICAgICAgdGhpcy5fZmx1c2hDb2RlUG9pbnRzQ29uc3VtZWRBc0NoYXJhY3RlclJlZmVyZW5jZSgpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZSh0aGlzLnJldHVyblN0YXRlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlY2ltYWwgY2hhcmFjdGVyIHJlZmVyZW5jZSBzdGFydCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0RFQ0lNQUxfQ0hBUkFDVEVSX1JFRkVSRU5DRV9TVEFSVF9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzQXNjaWlEaWdpdChjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoREVDSU1BTF9DSEFSQUNURVJfUkVGRVJFTkNFX1NUQVRFKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuYWJzZW5jZU9mRGlnaXRzSW5OdW1lcmljQ2hhcmFjdGVyUmVmZXJlbmNlKTtcbiAgICAgICAgICAgIHRoaXMuX2ZsdXNoQ29kZVBvaW50c0NvbnN1bWVkQXNDaGFyYWN0ZXJSZWZlcmVuY2UoKTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUodGhpcy5yZXR1cm5TdGF0ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBIZXhhZGVtaWNhbCBjaGFyYWN0ZXIgcmVmZXJlbmNlIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbSEVYQURFTUlDQUxfQ0hBUkFDVEVSX1JFRkVSRU5DRV9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzQXNjaWlVcHBlckhleERpZ2l0KGNwKSkge1xuICAgICAgICAgICAgdGhpcy5jaGFyUmVmQ29kZSA9IHRoaXMuY2hhclJlZkNvZGUgKiAxNiArIGNwIC0gMHgzNztcbiAgICAgICAgfSBlbHNlIGlmIChpc0FzY2lpTG93ZXJIZXhEaWdpdChjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhclJlZkNvZGUgPSB0aGlzLmNoYXJSZWZDb2RlICogMTYgKyBjcCAtIDB4NTc7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBc2NpaURpZ2l0KGNwKSkge1xuICAgICAgICAgICAgdGhpcy5jaGFyUmVmQ29kZSA9IHRoaXMuY2hhclJlZkNvZGUgKiAxNiArIGNwIC0gMHgzMDtcbiAgICAgICAgfSBlbHNlIGlmIChjcCA9PT0gJC5TRU1JQ09MT04pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBOVU1FUklDX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfRU5EX1NUQVRFO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5taXNzaW5nU2VtaWNvbG9uQWZ0ZXJDaGFyYWN0ZXJSZWZlcmVuY2UpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25zdW1lSW5TdGF0ZShOVU1FUklDX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfRU5EX1NUQVRFKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlY2ltYWwgY2hhcmFjdGVyIHJlZmVyZW5jZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgW0RFQ0lNQUxfQ0hBUkFDVEVSX1JFRkVSRU5DRV9TVEFURV0oY3ApIHtcbiAgICAgICAgaWYgKGlzQXNjaWlEaWdpdChjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhclJlZkNvZGUgPSB0aGlzLmNoYXJSZWZDb2RlICogMTAgKyBjcCAtIDB4MzA7XG4gICAgICAgIH0gZWxzZSBpZiAoY3AgPT09ICQuU0VNSUNPTE9OKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gTlVNRVJJQ19DSEFSQUNURVJfUkVGRVJFTkNFX0VORF9TVEFURTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIubWlzc2luZ1NlbWljb2xvbkFmdGVyQ2hhcmFjdGVyUmVmZXJlbmNlKTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUoTlVNRVJJQ19DSEFSQUNURVJfUkVGRVJFTkNFX0VORF9TVEFURSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOdW1lcmljIGNoYXJhY3RlciByZWZlcmVuY2UgZW5kIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBbTlVNRVJJQ19DSEFSQUNURVJfUkVGRVJFTkNFX0VORF9TVEFURV0oKSB7XG4gICAgICAgIGlmICh0aGlzLmNoYXJSZWZDb2RlID09PSAkLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIubnVsbENoYXJhY3RlclJlZmVyZW5jZSk7XG4gICAgICAgICAgICB0aGlzLmNoYXJSZWZDb2RlID0gJC5SRVBMQUNFTUVOVF9DSEFSQUNURVI7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5jaGFyUmVmQ29kZSA+IDB4MTBmZmZmKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLmNoYXJhY3RlclJlZmVyZW5jZU91dHNpZGVVbmljb2RlUmFuZ2UpO1xuICAgICAgICAgICAgdGhpcy5jaGFyUmVmQ29kZSA9ICQuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSO1xuICAgICAgICB9IGVsc2UgaWYgKHVuaWNvZGUuaXNTdXJyb2dhdGUodGhpcy5jaGFyUmVmQ29kZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuc3Vycm9nYXRlQ2hhcmFjdGVyUmVmZXJlbmNlKTtcbiAgICAgICAgICAgIHRoaXMuY2hhclJlZkNvZGUgPSAkLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUjtcbiAgICAgICAgfSBlbHNlIGlmICh1bmljb2RlLmlzVW5kZWZpbmVkQ29kZVBvaW50KHRoaXMuY2hhclJlZkNvZGUpKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoRVJSLm5vbmNoYXJhY3RlckNoYXJhY3RlclJlZmVyZW5jZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodW5pY29kZS5pc0NvbnRyb2xDb2RlUG9pbnQodGhpcy5jaGFyUmVmQ29kZSkgfHwgdGhpcy5jaGFyUmVmQ29kZSA9PT0gJC5DQVJSSUFHRV9SRVRVUk4pIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIuY29udHJvbENoYXJhY3RlclJlZmVyZW5jZSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlcGxhY2VtZW50ID0gQzFfQ09OVFJPTFNfUkVGRVJFTkNFX1JFUExBQ0VNRU5UU1t0aGlzLmNoYXJSZWZDb2RlXTtcblxuICAgICAgICAgICAgaWYgKHJlcGxhY2VtZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGFyUmVmQ29kZSA9IHJlcGxhY2VtZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50ZW1wQnVmZiA9IFt0aGlzLmNoYXJSZWZDb2RlXTtcblxuICAgICAgICB0aGlzLl9mbHVzaENvZGVQb2ludHNDb25zdW1lZEFzQ2hhcmFjdGVyUmVmZXJlbmNlKCk7XG4gICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUodGhpcy5yZXR1cm5TdGF0ZSk7XG4gICAgfVxufVxuXG4vL1Rva2VuIHR5cGVzXG5Ub2tlbml6ZXIuQ0hBUkFDVEVSX1RPS0VOID0gJ0NIQVJBQ1RFUl9UT0tFTic7XG5Ub2tlbml6ZXIuTlVMTF9DSEFSQUNURVJfVE9LRU4gPSAnTlVMTF9DSEFSQUNURVJfVE9LRU4nO1xuVG9rZW5pemVyLldISVRFU1BBQ0VfQ0hBUkFDVEVSX1RPS0VOID0gJ1dISVRFU1BBQ0VfQ0hBUkFDVEVSX1RPS0VOJztcblRva2VuaXplci5TVEFSVF9UQUdfVE9LRU4gPSAnU1RBUlRfVEFHX1RPS0VOJztcblRva2VuaXplci5FTkRfVEFHX1RPS0VOID0gJ0VORF9UQUdfVE9LRU4nO1xuVG9rZW5pemVyLkNPTU1FTlRfVE9LRU4gPSAnQ09NTUVOVF9UT0tFTic7XG5Ub2tlbml6ZXIuRE9DVFlQRV9UT0tFTiA9ICdET0NUWVBFX1RPS0VOJztcblRva2VuaXplci5FT0ZfVE9LRU4gPSAnRU9GX1RPS0VOJztcblRva2VuaXplci5ISUJFUk5BVElPTl9UT0tFTiA9ICdISUJFUk5BVElPTl9UT0tFTic7XG5cbi8vVG9rZW5pemVyIGluaXRpYWwgc3RhdGVzIGZvciBkaWZmZXJlbnQgbW9kZXNcblRva2VuaXplci5NT0RFID0ge1xuICAgIERBVEE6IERBVEFfU1RBVEUsXG4gICAgUkNEQVRBOiBSQ0RBVEFfU1RBVEUsXG4gICAgUkFXVEVYVDogUkFXVEVYVF9TVEFURSxcbiAgICBTQ1JJUFRfREFUQTogU0NSSVBUX0RBVEFfU1RBVEUsXG4gICAgUExBSU5URVhUOiBQTEFJTlRFWFRfU1RBVEVcbn07XG5cbi8vU3RhdGljXG5Ub2tlbml6ZXIuZ2V0VG9rZW5BdHRyID0gZnVuY3Rpb24odG9rZW4sIGF0dHJOYW1lKSB7XG4gICAgZm9yIChsZXQgaSA9IHRva2VuLmF0dHJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGlmICh0b2tlbi5hdHRyc1tpXS5uYW1lID09PSBhdHRyTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRva2VuLmF0dHJzW2ldLnZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRva2VuaXplcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy9OT1RFOiB0aGlzIGZpbGUgY29udGFpbnMgYXV0by1nZW5lcmF0ZWQgYXJyYXkgbWFwcGVkIHJhZGl4IHRyZWUgdGhhdCBpcyB1c2VkIGZvciB0aGUgbmFtZWQgZW50aXR5IHJlZmVyZW5jZXMgY29uc3VtcHRpb25cbi8vKGRldGFpbHM6IGh0dHBzOi8vZ2l0aHViLmNvbS9pbmlrdWxpbi9wYXJzZTUvdHJlZS9tYXN0ZXIvc2NyaXB0cy9nZW5lcmF0ZS1uYW1lZC1lbnRpdHktZGF0YS9SRUFETUUubWQpXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBVaW50MTZBcnJheShbNCw1Miw2NSw2Niw2Nyw2OCw2OSw3MCw3MSw3Miw3Myw3NCw3NSw3Niw3Nyw3OCw3OSw4MCw4MSw4Miw4Myw4NCw4NSw4Niw4Nyw4OCw4OSw5MCw5Nyw5OCw5OSwxMDAsMTAxLDEwMiwxMDMsMTA0LDEwNSwxMDYsMTA3LDEwOCwxMDksMTEwLDExMSwxMTIsMTEzLDExNCwxMTUsMTE2LDExNywxMTgsMTE5LDEyMCwxMjEsMTIyLDEwNiwzMDMsNDEyLDgxMCwxNDMyLDE3MDEsMTc5NiwxOTg3LDIxMTQsMjM2MCwyNDIwLDI0ODQsMzE3MCwzMjUxLDQxNDAsNDM5Myw0NTc1LDQ2MTAsNTEwNiw1NTEyLDU3MjgsNjExNyw2Mjc0LDYzMTUsNjM0NSw2NDI3LDY1MTYsNzAwMiw3OTEwLDg3MzMsOTMyMyw5ODcwLDEwMTcwLDEwNjMxLDEwODkzLDExMzE4LDExMzg2LDExNDY3LDEyNzczLDEzMDkyLDE0NDc0LDE0OTIyLDE1NDQ4LDE1NTQyLDE2NDE5LDE3NjY2LDE4MTY2LDE4NjExLDE5MDA0LDE5MDk1LDE5Mjk4LDE5Mzk3LDQsMTYsNjksNzcsOTcsOTgsOTksMTAyLDEwMywxMDgsMTA5LDExMCwxMTEsMTEyLDExNCwxMTUsMTE2LDExNywxNDAsMTUwLDE1OCwxNjksMTc2LDE5NCwxOTksMjEwLDIxNiwyMjIsMjI2LDI0MiwyNTYsMjY2LDI4MywyOTQsMTA4LDEwNSwxMDMsNSwxOTgsMSw1OSwxNDgsMSwxOTgsODAsNSwzOCwxLDU5LDE1NiwxLDM4LDk5LDExNywxMTYsMTAxLDUsMTkzLDEsNTksMTY3LDEsMTkzLDExNCwxMDEsMTE4LDEwMSw1OSwxLDI1OCw0LDIsMTA1LDEyMSwxODIsMTkxLDExNCw5OSw1LDE5NCwxLDU5LDE4OSwxLDE5NCw1OSwxLDEwNDAsMTE0LDU5LDMsNTUzNDksNTY1ODAsMTE0LDk3LDExOCwxMDEsNSwxOTIsMSw1OSwyMDgsMSwxOTIsMTEyLDEwNCw5Nyw1OSwxLDkxMyw5Nyw5OSwxMTQsNTksMSwyNTYsMTAwLDU5LDEsMTA4MzUsNCwyLDEwMywxMTIsMjMyLDIzNywxMTEsMTEwLDU5LDEsMjYwLDEwMiw1OSwzLDU1MzQ5LDU2NjMyLDExMiwxMDgsMTIxLDcwLDExNywxMTAsOTksMTE2LDEwNSwxMTEsMTEwLDU5LDEsODI4OSwxMDUsMTEwLDEwMyw1LDE5NywxLDU5LDI2NCwxLDE5Nyw0LDIsOTksMTE1LDI3MiwyNzcsMTE0LDU5LDMsNTUzNDksNTY0NzYsMTA1LDEwMywxMTAsNTksMSw4Nzg4LDEwNSwxMDgsMTAwLDEwMSw1LDE5NSwxLDU5LDI5MiwxLDE5NSwxMDksMTA4LDUsMTk2LDEsNTksMzAxLDEsMTk2LDQsOCw5Nyw5OSwxMDEsMTAyLDExMSwxMTQsMTE1LDExNywzMjEsMzUwLDM1NCwzODMsMzg4LDM5NCw0MDAsNDA1LDQsMiw5OSwxMTQsMzI3LDMzNiwxMDcsMTE1LDEwOCw5NywxMTUsMTA0LDU5LDEsODcyNiw0LDIsMTE4LDExOSwzNDIsMzQ1LDU5LDEsMTA5ODMsMTAxLDEwMCw1OSwxLDg5NjYsMTIxLDU5LDEsMTA0MSw0LDMsOTksMTE0LDExNiwzNjIsMzY5LDM3OSw5NywxMTcsMTE1LDEwMSw1OSwxLDg3NTcsMTEwLDExMSwxMTcsMTA4LDEwOCwxMDUsMTE1LDU5LDEsODQ5Miw5Nyw1OSwxLDkxNCwxMTQsNTksMyw1NTM0OSw1NjU4MSwxMTIsMTAyLDU5LDMsNTUzNDksNTY2MzMsMTAxLDExOCwxMDEsNTksMSw3MjgsOTksMTE0LDU5LDEsODQ5MiwxMDksMTEyLDEwMSwxMTMsNTksMSw4NzgyLDQsMTQsNzIsNzksOTcsOTksMTAwLDEwMSwxMDIsMTA0LDEwNSwxMDgsMTExLDExNCwxMTUsMTE3LDQ0Miw0NDcsNDU2LDUwNCw1NDIsNTQ3LDU2OSw1NzMsNTc3LDYxNiw2NzgsNzg0LDc5MCw3OTYsOTksMTIxLDU5LDEsMTA2Myw4MCw4OSw1LDE2OSwxLDU5LDQ1NCwxLDE2OSw0LDMsOTksMTEyLDEyMSw0NjQsNDcwLDQ5NywxMTcsMTE2LDEwMSw1OSwxLDI2Miw0LDIsNTksMTA1LDQ3Niw0NzgsMSw4OTE0LDExNiw5NywxMDgsNjgsMTA1LDEwMiwxMDIsMTAxLDExNCwxMDEsMTEwLDExNiwxMDUsOTcsMTA4LDY4LDU5LDEsODUxNywxMDgsMTAxLDEyMSwxMTUsNTksMSw4NDkzLDQsNCw5NywxMDEsMTA1LDExMSw1MTQsNTIwLDUzMCw1MzUsMTE0LDExMSwxMTAsNTksMSwyNjgsMTAwLDEwNSwxMDgsNSwxOTksMSw1OSw1MjgsMSwxOTksMTE0LDk5LDU5LDEsMjY0LDExMCwxMDUsMTEwLDExNiw1OSwxLDg3NTIsMTExLDExNiw1OSwxLDI2Niw0LDIsMTAwLDExMCw1NTMsNTYwLDEwNSwxMDgsMTA4LDk3LDU5LDEsMTg0LDExNiwxMDEsMTE0LDY4LDExMSwxMTYsNTksMSwxODMsMTE0LDU5LDEsODQ5MywxMDUsNTksMSw5MzUsMTE0LDk5LDEwOCwxMDEsNCw0LDY4LDc3LDgwLDg0LDU5MSw1OTYsNjAzLDYwOSwxMTEsMTE2LDU5LDEsODg1NywxMDUsMTEwLDExNywxMTUsNTksMSw4ODU0LDEwOCwxMTcsMTE1LDU5LDEsODg1MywxMDUsMTA5LDEwMSwxMTUsNTksMSw4ODU1LDExMSw0LDIsOTksMTE1LDYyMyw2NDYsMTA3LDExOSwxMDUsMTE1LDEwMSw2NywxMTEsMTEwLDExNiwxMTEsMTE3LDExNCw3MywxMTAsMTE2LDEwMSwxMDMsMTE0LDk3LDEwOCw1OSwxLDg3NTQsMTAxLDY3LDExNywxMTQsMTA4LDEyMSw0LDIsNjgsODEsNjU4LDY3MSwxMTEsMTE3LDk4LDEwOCwxMDEsODEsMTE3LDExMSwxMTYsMTAxLDU5LDEsODIyMSwxMTcsMTExLDExNiwxMDEsNTksMSw4MjE3LDQsNCwxMDgsMTEwLDExMiwxMTcsNjg4LDcwMSw3MzYsNzUzLDExMSwxMTAsNCwyLDU5LDEwMSw2OTYsNjk4LDEsODc1OSw1OSwxLDEwODY4LDQsMywxMDMsMTA1LDExNiw3MDksNzE3LDcyMiwxMTQsMTE3LDEwMSwxMTAsMTE2LDU5LDEsODgwMSwxMTAsMTE2LDU5LDEsODc1MSwxMTEsMTE3LDExNCw3MywxMTAsMTE2LDEwMSwxMDMsMTE0LDk3LDEwOCw1OSwxLDg3NTAsNCwyLDEwMiwxMTQsNzQyLDc0NSw1OSwxLDg0NTAsMTExLDEwMCwxMTcsOTksMTE2LDU5LDEsODcyMCwxMTAsMTE2LDEwMSwxMTQsNjcsMTA4LDExMSw5OSwxMDcsMTE5LDEwNSwxMTUsMTAxLDY3LDExMSwxMTAsMTE2LDExMSwxMTcsMTE0LDczLDExMCwxMTYsMTAxLDEwMywxMTQsOTcsMTA4LDU5LDEsODc1NSwxMTEsMTE1LDExNSw1OSwxLDEwNzk5LDk5LDExNCw1OSwzLDU1MzQ5LDU2NDc4LDExMiw0LDIsNTksNjcsODAzLDgwNSwxLDg5MTUsOTcsMTEyLDU5LDEsODc4MSw0LDExLDY4LDc0LDgzLDkwLDk3LDk5LDEwMSwxMDIsMTA1LDExMSwxMTUsODM0LDg1MCw4NTUsODYwLDg2NSw4ODgsOTAzLDkxNiw5MjEsMTAxMSwxNDE1LDQsMiw1OSwxMTEsODQwLDg0MiwxLDg1MTcsMTE2LDExNCw5NywxMDQsMTAwLDU5LDEsMTA1MTMsOTksMTIxLDU5LDEsMTAyNiw5OSwxMjEsNTksMSwxMDI5LDk5LDEyMSw1OSwxLDEwMzksNCwzLDEwMywxMTQsMTE1LDg3Myw4NzksODgzLDEwMywxMDEsMTE0LDU5LDEsODIyNSwxMTQsNTksMSw4NjA5LDEwNCwxMTgsNTksMSwxMDk4MCw0LDIsOTcsMTIxLDg5NCw5MDAsMTE0LDExMSwxMTAsNTksMSwyNzAsNTksMSwxMDQ0LDEwOCw0LDIsNTksMTE2LDkxMCw5MTIsMSw4NzExLDk3LDU5LDEsOTE2LDExNCw1OSwzLDU1MzQ5LDU2NTgzLDQsMiw5NywxMDIsOTI3LDk5OCw0LDIsOTksMTA5LDkzMyw5OTIsMTE0LDEwNSwxMTYsMTA1LDk5LDk3LDEwOCw0LDQsNjUsNjgsNzEsODQsOTUwLDk1Nyw5NzgsOTg1LDk5LDExNywxMTYsMTAxLDU5LDEsMTgwLDExMSw0LDIsMTE2LDExNyw5NjQsOTY3LDU5LDEsNzI5LDk4LDEwOCwxMDEsNjUsOTksMTE3LDExNiwxMDEsNTksMSw3MzMsMTE0LDk3LDExOCwxMDEsNTksMSw5NiwxMDUsMTA4LDEwMCwxMDEsNTksMSw3MzIsMTExLDExMCwxMDAsNTksMSw4OTAwLDEwMiwxMDEsMTE0LDEwMSwxMTAsMTE2LDEwNSw5NywxMDgsNjgsNTksMSw4NTE4LDQsNCwxMTIsMTE2LDExNywxMTksMTAyMSwxMDI2LDEwNDgsMTI0OSwxMDIsNTksMyw1NTM0OSw1NjYzNSw0LDMsNTksNjgsNjksMTAzNCwxMDM2LDEwNDEsMSwxNjgsMTExLDExNiw1OSwxLDg0MTIsMTEzLDExNyw5NywxMDgsNTksMSw4Nzg0LDk4LDEwOCwxMDEsNCw2LDY3LDY4LDc2LDgyLDg1LDg2LDEwNjUsMTA4MiwxMTAxLDExODksMTIxMSwxMjM2LDExMSwxMTAsMTE2LDExMSwxMTcsMTE0LDczLDExMCwxMTYsMTAxLDEwMywxMTQsOTcsMTA4LDU5LDEsODc1MSwxMTEsNCwyLDExNiwxMTksMTA4OSwxMDkyLDU5LDEsMTY4LDExMCw2NSwxMTQsMTE0LDExMSwxMTksNTksMSw4NjU5LDQsMiwxMDEsMTExLDExMDcsMTE0MSwxMDIsMTE2LDQsMyw2NSw4Miw4NCwxMTE3LDExMjQsMTEzNiwxMTQsMTE0LDExMSwxMTksNTksMSw4NjU2LDEwNSwxMDMsMTA0LDExNiw2NSwxMTQsMTE0LDExMSwxMTksNTksMSw4NjYwLDEwMSwxMDEsNTksMSwxMDk4MCwxMTAsMTAzLDQsMiw3Niw4MiwxMTQ5LDExNzcsMTAxLDEwMiwxMTYsNCwyLDY1LDgyLDExNTgsMTE2NSwxMTQsMTE0LDExMSwxMTksNTksMSwxMDIzMiwxMDUsMTAzLDEwNCwxMTYsNjUsMTE0LDExNCwxMTEsMTE5LDU5LDEsMTAyMzQsMTA1LDEwMywxMDQsMTE2LDY1LDExNCwxMTQsMTExLDExOSw1OSwxLDEwMjMzLDEwNSwxMDMsMTA0LDExNiw0LDIsNjUsODQsMTE5OSwxMjA2LDExNCwxMTQsMTExLDExOSw1OSwxLDg2NTgsMTAxLDEwMSw1OSwxLDg4NzIsMTEyLDQsMiw2NSw2OCwxMjE4LDEyMjUsMTE0LDExNCwxMTEsMTE5LDU5LDEsODY1NywxMTEsMTE5LDExMCw2NSwxMTQsMTE0LDExMSwxMTksNTksMSw4NjYxLDEwMSwxMTQsMTE2LDEwNSw5OSw5NywxMDgsNjYsOTcsMTE0LDU5LDEsODc0MSwxMTAsNCw2LDY1LDY2LDc2LDgyLDg0LDk3LDEyNjQsMTI5MiwxMjk5LDEzNTIsMTM5MSwxNDA4LDExNCwxMTQsMTExLDExOSw0LDMsNTksNjYsODUsMTI3NiwxMjc4LDEyODMsMSw4NTk1LDk3LDExNCw1OSwxLDEwNTE1LDExMiw2NSwxMTQsMTE0LDExMSwxMTksNTksMSw4NjkzLDExNCwxMDEsMTE4LDEwMSw1OSwxLDc4NSwxMDEsMTAyLDExNiw0LDMsODIsODQsODYsMTMxMCwxMzIzLDEzMzQsMTA1LDEwMywxMDQsMTE2LDg2LDEwMSw5OSwxMTYsMTExLDExNCw1OSwxLDEwNTc2LDEwMSwxMDEsODYsMTAxLDk5LDExNiwxMTEsMTE0LDU5LDEsMTA1OTAsMTAxLDk5LDExNiwxMTEsMTE0LDQsMiw1OSw2NiwxMzQ1LDEzNDcsMSw4NjM3LDk3LDExNCw1OSwxLDEwNTgyLDEwNSwxMDMsMTA0LDExNiw0LDIsODQsODYsMTM2MiwxMzczLDEwMSwxMDEsODYsMTAxLDk5LDExNiwxMTEsMTE0LDU5LDEsMTA1OTEsMTAxLDk5LDExNiwxMTEsMTE0LDQsMiw1OSw2NiwxMzg0LDEzODYsMSw4NjQxLDk3LDExNCw1OSwxLDEwNTgzLDEwMSwxMDEsNCwyLDU5LDY1LDEzOTksMTQwMSwxLDg4NjgsMTE0LDExNCwxMTEsMTE5LDU5LDEsODYxNSwxMTQsMTE0LDExMSwxMTksNTksMSw4NjU5LDQsMiw5OSwxMTYsMTQyMSwxNDI2LDExNCw1OSwzLDU1MzQ5LDU2NDc5LDExNCwxMTEsMTA3LDU5LDEsMjcyLDQsMTYsNzgsODQsOTcsOTksMTAwLDEwMiwxMDMsMTA4LDEwOSwxMTEsMTEyLDExMywxMTUsMTE2LDExNywxMjAsMTQ2NiwxNDcwLDE0NzgsMTQ4OSwxNTE1LDE1MjAsMTUyNSwxNTM2LDE1NDQsMTU5MywxNjA5LDE2MTcsMTY1MCwxNjY0LDE2NjgsMTY3Nyw3MSw1OSwxLDMzMCw3Miw1LDIwOCwxLDU5LDE0NzYsMSwyMDgsOTksMTE3LDExNiwxMDEsNSwyMDEsMSw1OSwxNDg3LDEsMjAxLDQsMyw5NywxMDUsMTIxLDE0OTcsMTUwMywxNTEyLDExNCwxMTEsMTEwLDU5LDEsMjgyLDExNCw5OSw1LDIwMiwxLDU5LDE1MTAsMSwyMDIsNTksMSwxMDY5LDExMSwxMTYsNTksMSwyNzgsMTE0LDU5LDMsNTUzNDksNTY1ODQsMTE0LDk3LDExOCwxMDEsNSwyMDAsMSw1OSwxNTM0LDEsMjAwLDEwMSwxMDksMTAxLDExMCwxMTYsNTksMSw4NzEyLDQsMiw5NywxMTIsMTU1MCwxNTU1LDk5LDExNCw1OSwxLDI3NCwxMTYsMTIxLDQsMiw4Myw4NiwxNTYzLDE1NzYsMTA5LDk3LDEwOCwxMDgsODMsMTEzLDExNyw5NywxMTQsMTAxLDU5LDEsOTcyMywxMDEsMTE0LDEyMSw4MywxMDksOTcsMTA4LDEwOCw4MywxMTMsMTE3LDk3LDExNCwxMDEsNTksMSw5NjQzLDQsMiwxMDMsMTEyLDE1OTksMTYwNCwxMTEsMTEwLDU5LDEsMjgwLDEwMiw1OSwzLDU1MzQ5LDU2NjM2LDExNSwxMDUsMTA4LDExMSwxMTAsNTksMSw5MTcsMTE3LDQsMiw5NywxMDUsMTYyNCwxNjQwLDEwOCw0LDIsNTksODQsMTYzMSwxNjMzLDEsMTA4NjksMTA1LDEwOCwxMDAsMTAxLDU5LDEsODc3MCwxMDgsMTA1LDk4LDExNCwxMDUsMTE3LDEwOSw1OSwxLDg2NTIsNCwyLDk5LDEwNSwxNjU2LDE2NjAsMTE0LDU5LDEsODQ5NiwxMDksNTksMSwxMDg2Nyw5Nyw1OSwxLDkxOSwxMDksMTA4LDUsMjAzLDEsNTksMTY3NSwxLDIwMyw0LDIsMTA1LDExMiwxNjgzLDE2ODksMTE1LDExNiwxMTUsNTksMSw4NzA3LDExMSwxMTAsMTAxLDExMCwxMTYsMTA1LDk3LDEwOCw2OSw1OSwxLDg1MTksNCw1LDk5LDEwMiwxMDUsMTExLDExNSwxNzEzLDE3MTcsMTcyMiwxNzYyLDE3OTEsMTIxLDU5LDEsMTA2MCwxMTQsNTksMyw1NTM0OSw1NjU4NSwxMDgsMTA4LDEwMSwxMDAsNCwyLDgzLDg2LDE3MzIsMTc0NSwxMDksOTcsMTA4LDEwOCw4MywxMTMsMTE3LDk3LDExNCwxMDEsNTksMSw5NzI0LDEwMSwxMTQsMTIxLDgzLDEwOSw5NywxMDgsMTA4LDgzLDExMywxMTcsOTcsMTE0LDEwMSw1OSwxLDk2NDIsNCwzLDExMiwxMTQsMTE3LDE3NzAsMTc3NSwxNzgxLDEwMiw1OSwzLDU1MzQ5LDU2NjM3LDY1LDEwOCwxMDgsNTksMSw4NzA0LDExNCwxMDUsMTAxLDExNCwxMTYsMTE0LDEwMiw1OSwxLDg0OTcsOTksMTE0LDU5LDEsODQ5Nyw0LDEyLDc0LDg0LDk3LDk4LDk5LDEwMCwxMDIsMTAzLDExMSwxMTQsMTE1LDExNiwxODIyLDE4MjcsMTgzNCwxODQ4LDE4NTUsMTg3NywxODgyLDE4ODcsMTg5MCwxODk2LDE5NzgsMTk4NCw5OSwxMjEsNTksMSwxMDI3LDUsNjIsMSw1OSwxODMyLDEsNjIsMTA5LDEwOSw5Nyw0LDIsNTksMTAwLDE4NDMsMTg0NSwxLDkxNSw1OSwxLDk4OCwxMTQsMTAxLDExOCwxMDEsNTksMSwyODYsNCwzLDEwMSwxMDUsMTIxLDE4NjMsMTg2OSwxODc0LDEwMCwxMDUsMTA4LDU5LDEsMjkwLDExNCw5OSw1OSwxLDI4NCw1OSwxLDEwNDMsMTExLDExNiw1OSwxLDI4OCwxMTQsNTksMyw1NTM0OSw1NjU4Niw1OSwxLDg5MjEsMTEyLDEwMiw1OSwzLDU1MzQ5LDU2NjM4LDEwMSw5NywxMTYsMTAxLDExNCw0LDYsNjksNzAsNzEsNzYsODMsODQsMTkxNSwxOTMzLDE5NDQsMTk1MywxOTU5LDE5NzEsMTEzLDExNyw5NywxMDgsNCwyLDU5LDc2LDE5MjUsMTkyNywxLDg4MDUsMTAxLDExNSwxMTUsNTksMSw4OTIzLDExNywxMDgsMTA4LDY5LDExMywxMTcsOTcsMTA4LDU5LDEsODgwNywxMTQsMTAxLDk3LDExNiwxMDEsMTE0LDU5LDEsMTA5MTQsMTAxLDExNSwxMTUsNTksMSw4ODIzLDEwOCw5NywxMTAsMTE2LDY5LDExMywxMTcsOTcsMTA4LDU5LDEsMTA4NzgsMTA1LDEwOCwxMDAsMTAxLDU5LDEsODgxOSw5OSwxMTQsNTksMyw1NTM0OSw1NjQ4Miw1OSwxLDg4MTEsNCw4LDY1LDk3LDk5LDEwMiwxMDUsMTExLDExNSwxMTcsMjAwNSwyMDEyLDIwMjYsMjAzMiwyMDM2LDIwNDksMjA3MywyMDg5LDgyLDY4LDk5LDEyMSw1OSwxLDEwNjYsNCwyLDk5LDExNiwyMDE4LDIwMjMsMTAxLDEwNyw1OSwxLDcxMSw1OSwxLDk0LDEwNSwxMTQsOTksNTksMSwyOTIsMTE0LDU5LDEsODQ2MCwxMDgsOTgsMTAxLDExNCwxMTYsODMsMTEyLDk3LDk5LDEwMSw1OSwxLDg0NTksNCwyLDExMiwxMTQsMjA1NSwyMDU5LDEwMiw1OSwxLDg0NjEsMTA1LDEyMiwxMTEsMTEwLDExNiw5NywxMDgsNzYsMTA1LDExMCwxMDEsNTksMSw5NDcyLDQsMiw5OSwxMTYsMjA3OSwyMDgzLDExNCw1OSwxLDg0NTksMTE0LDExMSwxMDcsNTksMSwyOTQsMTA5LDExMiw0LDIsNjgsNjksMjA5NywyMTA3LDExMSwxMTksMTEwLDcyLDExNywxMDksMTEyLDU5LDEsODc4MiwxMTMsMTE3LDk3LDEwOCw1OSwxLDg3ODMsNCwxNCw2OSw3NCw3OSw5Nyw5OSwxMDAsMTAyLDEwMywxMDksMTEwLDExMSwxMTUsMTE2LDExNywyMTQ0LDIxNDksMjE1NSwyMTYwLDIxNzEsMjE4OSwyMTk0LDIxOTgsMjIwOSwyMjQ1LDIzMDcsMjMyOSwyMzM0LDIzNDEsOTksMTIxLDU5LDEsMTA0NSwxMDgsMTA1LDEwMyw1OSwxLDMwNiw5OSwxMjEsNTksMSwxMDI1LDk5LDExNywxMTYsMTAxLDUsMjA1LDEsNTksMjE2OSwxLDIwNSw0LDIsMTA1LDEyMSwyMTc3LDIxODYsMTE0LDk5LDUsMjA2LDEsNTksMjE4NCwxLDIwNiw1OSwxLDEwNDgsMTExLDExNiw1OSwxLDMwNCwxMTQsNTksMSw4NDY1LDExNCw5NywxMTgsMTAxLDUsMjA0LDEsNTksMjIwNywxLDIwNCw0LDMsNTksOTcsMTEyLDIyMTcsMjIxOSwyMjM4LDEsODQ2NSw0LDIsOTksMTAzLDIyMjUsMjIyOSwxMTQsNTksMSwyOTgsMTA1LDExMCw5NywxMTQsMTIxLDczLDU5LDEsODUyMCwxMDgsMTA1LDEwMSwxMTUsNTksMSw4NjU4LDQsMiwxMTYsMTE4LDIyNTEsMjI4MSw0LDIsNTksMTAxLDIyNTcsMjI1OSwxLDg3NDgsNCwyLDEwMywxMTQsMjI2NSwyMjcxLDExNCw5NywxMDgsNTksMSw4NzQ3LDExNSwxMDEsOTksMTE2LDEwNSwxMTEsMTEwLDU5LDEsODg5OCwxMDUsMTE1LDEwNSw5OCwxMDgsMTAxLDQsMiw2Nyw4NCwyMjkzLDIzMDAsMTExLDEwOSwxMDksOTcsNTksMSw4MjkxLDEwNSwxMDksMTAxLDExNSw1OSwxLDgyOTAsNCwzLDEwMywxMTIsMTE2LDIzMTUsMjMyMCwyMzI1LDExMSwxMTAsNTksMSwzMDIsMTAyLDU5LDMsNTUzNDksNTY2NDAsOTcsNTksMSw5MjEsOTksMTE0LDU5LDEsODQ2NCwxMDUsMTA4LDEwMCwxMDEsNTksMSwyOTYsNCwyLDEwNywxMDksMjM0NywyMzUyLDk5LDEyMSw1OSwxLDEwMzAsMTA4LDUsMjA3LDEsNTksMjM1OCwxLDIwNyw0LDUsOTksMTAyLDExMSwxMTUsMTE3LDIzNzIsMjM4NiwyMzkxLDIzOTcsMjQxNCw0LDIsMTA1LDEyMSwyMzc4LDIzODMsMTE0LDk5LDU5LDEsMzA4LDU5LDEsMTA0OSwxMTQsNTksMyw1NTM0OSw1NjU4OSwxMTIsMTAyLDU5LDMsNTUzNDksNTY2NDEsNCwyLDk5LDEwMSwyNDAzLDI0MDgsMTE0LDU5LDMsNTUzNDksNTY0ODUsMTE0LDk5LDEyMSw1OSwxLDEwMzIsMTA3LDk5LDEyMSw1OSwxLDEwMjgsNCw3LDcyLDc0LDk3LDk5LDEwMiwxMTEsMTE1LDI0MzYsMjQ0MSwyNDQ2LDI0NTIsMjQ2NywyNDcyLDI0NzgsOTksMTIxLDU5LDEsMTA2MSw5OSwxMjEsNTksMSwxMDM2LDExMiwxMTIsOTcsNTksMSw5MjIsNCwyLDEwMSwxMjEsMjQ1OCwyNDY0LDEwMCwxMDUsMTA4LDU5LDEsMzEwLDU5LDEsMTA1MCwxMTQsNTksMyw1NTM0OSw1NjU5MCwxMTIsMTAyLDU5LDMsNTUzNDksNTY2NDIsOTksMTE0LDU5LDMsNTUzNDksNTY0ODYsNCwxMSw3NCw4NCw5Nyw5OSwxMDEsMTAyLDEwOCwxMDksMTExLDExNSwxMTYsMjUwOCwyNTEzLDI1MjAsMjU2MiwyNTg1LDI5ODEsMjk4NiwzMDA0LDMwMTEsMzE0NiwzMTY3LDk5LDEyMSw1OSwxLDEwMzMsNSw2MCwxLDU5LDI1MTgsMSw2MCw0LDUsOTksMTA5LDExMCwxMTIsMTE0LDI1MzIsMjUzOCwyNTQ0LDI1NDgsMjU1OCwxMTcsMTE2LDEwMSw1OSwxLDMxMyw5OCwxMDAsOTcsNTksMSw5MjMsMTAzLDU5LDEsMTAyMTgsMTA4LDk3LDk5LDEwMSwxMTYsMTE0LDEwMiw1OSwxLDg0NjYsMTE0LDU5LDEsODYwNiw0LDMsOTcsMTAxLDEyMSwyNTcwLDI1NzYsMjU4MiwxMTQsMTExLDExMCw1OSwxLDMxNywxMDAsMTA1LDEwOCw1OSwxLDMxNSw1OSwxLDEwNTEsNCwyLDEwMiwxMTUsMjU5MSwyOTA3LDExNiw0LDEwLDY1LDY3LDY4LDcwLDgyLDg0LDg1LDg2LDk3LDExNCwyNjE0LDI2NjMsMjY3MiwyNzI4LDI3MzUsMjc2MCwyODIwLDI4NzAsMjg4OCwyODk1LDQsMiwxMTAsMTE0LDI2MjAsMjYzMywxMDMsMTA4LDEwMSw2NiwxMTQsOTcsOTksMTA3LDEwMSwxMTYsNTksMSwxMDIxNiwxMTQsMTExLDExOSw0LDMsNTksNjYsODIsMjY0NCwyNjQ2LDI2NTEsMSw4NTkyLDk3LDExNCw1OSwxLDg2NzYsMTA1LDEwMywxMDQsMTE2LDY1LDExNCwxMTQsMTExLDExOSw1OSwxLDg2NDYsMTAxLDEwNSwxMDgsMTA1LDExMCwxMDMsNTksMSw4OTY4LDExMSw0LDIsMTE3LDExOSwyNjc5LDI2OTIsOTgsMTA4LDEwMSw2NiwxMTQsOTcsOTksMTA3LDEwMSwxMTYsNTksMSwxMDIxNCwxMTAsNCwyLDg0LDg2LDI2OTksMjcxMCwxMDEsMTAxLDg2LDEwMSw5OSwxMTYsMTExLDExNCw1OSwxLDEwNTkzLDEwMSw5OSwxMTYsMTExLDExNCw0LDIsNTksNjYsMjcyMSwyNzIzLDEsODY0Myw5NywxMTQsNTksMSwxMDU4NSwxMDgsMTExLDExMSwxMTQsNTksMSw4OTcwLDEwNSwxMDMsMTA0LDExNiw0LDIsNjUsODYsMjc0NSwyNzUyLDExNCwxMTQsMTExLDExOSw1OSwxLDg1OTYsMTAxLDk5LDExNiwxMTEsMTE0LDU5LDEsMTA1NzQsNCwyLDEwMSwxMTQsMjc2NiwyNzkyLDEwMSw0LDMsNTksNjUsODYsMjc3NSwyNzc3LDI3ODQsMSw4ODY3LDExNCwxMTQsMTExLDExOSw1OSwxLDg2MTIsMTAxLDk5LDExNiwxMTEsMTE0LDU5LDEsMTA1ODYsMTA1LDk3LDExMCwxMDMsMTA4LDEwMSw0LDMsNTksNjYsNjksMjgwNiwyODA4LDI4MTMsMSw4ODgyLDk3LDExNCw1OSwxLDEwNzAzLDExMywxMTcsOTcsMTA4LDU5LDEsODg4NCwxMTIsNCwzLDY4LDg0LDg2LDI4MjksMjg0MSwyODUyLDExMSwxMTksMTEwLDg2LDEwMSw5OSwxMTYsMTExLDExNCw1OSwxLDEwNTc3LDEwMSwxMDEsODYsMTAxLDk5LDExNiwxMTEsMTE0LDU5LDEsMTA1OTIsMTAxLDk5LDExNiwxMTEsMTE0LDQsMiw1OSw2NiwyODYzLDI4NjUsMSw4NjM5LDk3LDExNCw1OSwxLDEwNTg0LDEwMSw5OSwxMTYsMTExLDExNCw0LDIsNTksNjYsMjg4MSwyODgzLDEsODYzNiw5NywxMTQsNTksMSwxMDU3OCwxMTQsMTE0LDExMSwxMTksNTksMSw4NjU2LDEwNSwxMDMsMTA0LDExNiw5NywxMTQsMTE0LDExMSwxMTksNTksMSw4NjYwLDExNSw0LDYsNjksNzAsNzEsNzYsODMsODQsMjkyMiwyOTM2LDI5NDcsMjk1NiwyOTYyLDI5NzQsMTEzLDExNyw5NywxMDgsNzEsMTE0LDEwMSw5NywxMTYsMTAxLDExNCw1OSwxLDg5MjIsMTE3LDEwOCwxMDgsNjksMTEzLDExNyw5NywxMDgsNTksMSw4ODA2LDExNCwxMDEsOTcsMTE2LDEwMSwxMTQsNTksMSw4ODIyLDEwMSwxMTUsMTE1LDU5LDEsMTA5MTMsMTA4LDk3LDExMCwxMTYsNjksMTEzLDExNyw5NywxMDgsNTksMSwxMDg3NywxMDUsMTA4LDEwMCwxMDEsNTksMSw4ODE4LDExNCw1OSwzLDU1MzQ5LDU2NTkxLDQsMiw1OSwxMDEsMjk5MiwyOTk0LDEsODkyMCwxMDIsMTE2LDk3LDExNCwxMTQsMTExLDExOSw1OSwxLDg2NjYsMTA1LDEwMCwxMTEsMTE2LDU5LDEsMzE5LDQsMywxMTAsMTEyLDExOSwzMDE5LDMxMTAsMzExNSwxMDMsNCw0LDc2LDgyLDEwOCwxMTQsMzAzMCwzMDU4LDMwNzAsMzA5OCwxMDEsMTAyLDExNiw0LDIsNjUsODIsMzAzOSwzMDQ2LDExNCwxMTQsMTExLDExOSw1OSwxLDEwMjI5LDEwNSwxMDMsMTA0LDExNiw2NSwxMTQsMTE0LDExMSwxMTksNTksMSwxMDIzMSwxMDUsMTAzLDEwNCwxMTYsNjUsMTE0LDExNCwxMTEsMTE5LDU5LDEsMTAyMzAsMTAxLDEwMiwxMTYsNCwyLDk3LDExNCwzMDc5LDMwODYsMTE0LDExNCwxMTEsMTE5LDU5LDEsMTAyMzIsMTA1LDEwMywxMDQsMTE2LDk3LDExNCwxMTQsMTExLDExOSw1OSwxLDEwMjM0LDEwNSwxMDMsMTA0LDExNiw5NywxMTQsMTE0LDExMSwxMTksNTksMSwxMDIzMywxMDIsNTksMyw1NTM0OSw1NjY0MywxMDEsMTE0LDQsMiw3Niw4MiwzMTIzLDMxMzQsMTAxLDEwMiwxMTYsNjUsMTE0LDExNCwxMTEsMTE5LDU5LDEsODYwMSwxMDUsMTAzLDEwNCwxMTYsNjUsMTE0LDExNCwxMTEsMTE5LDU5LDEsODYwMCw0LDMsOTksMTA0LDExNiwzMTU0LDMxNTgsMzE2MSwxMTQsNTksMSw4NDY2LDU5LDEsODYyNCwxMTQsMTExLDEwNyw1OSwxLDMyMSw1OSwxLDg4MTAsNCw4LDk3LDk5LDEwMSwxMDIsMTA1LDExMSwxMTUsMTE3LDMxODgsMzE5MiwzMTk2LDMyMjIsMzIyNywzMjM3LDMyNDMsMzI0OCwxMTIsNTksMSwxMDUwMSwxMjEsNTksMSwxMDUyLDQsMiwxMDAsMTA4LDMyMDIsMzIxMywxMDUsMTE3LDEwOSw4MywxMTIsOTcsOTksMTAxLDU5LDEsODI4NywxMDgsMTA1LDExMCwxMTYsMTE0LDEwMiw1OSwxLDg0OTksMTE0LDU5LDMsNTUzNDksNTY1OTIsMTEwLDExNywxMTUsODAsMTA4LDExNywxMTUsNTksMSw4NzIzLDExMiwxMDIsNTksMyw1NTM0OSw1NjY0NCw5OSwxMTQsNTksMSw4NDk5LDU5LDEsOTI0LDQsOSw3NCw5Nyw5OSwxMDEsMTAyLDExMSwxMTUsMTE2LDExNywzMjcxLDMyNzYsMzI4MywzMzA2LDM0MjIsMzQyNyw0MTIwLDQxMjYsNDEzNyw5OSwxMjEsNTksMSwxMDM0LDk5LDExNywxMTYsMTAxLDU5LDEsMzIzLDQsMyw5NywxMDEsMTIxLDMyOTEsMzI5NywzMzAzLDExNCwxMTEsMTEwLDU5LDEsMzI3LDEwMCwxMDUsMTA4LDU5LDEsMzI1LDU5LDEsMTA1Myw0LDMsMTAzLDExNSwxMTksMzMxNCwzMzgwLDM0MTUsOTcsMTE2LDEwNSwxMTgsMTAxLDQsMyw3Nyw4NCw4NiwzMzI3LDMzNDAsMzM2NSwxMDEsMTAwLDEwNSwxMTcsMTA5LDgzLDExMiw5Nyw5OSwxMDEsNTksMSw4MjAzLDEwNCwxMDUsNCwyLDk5LDExMCwzMzQ4LDMzNTcsMTA3LDgzLDExMiw5Nyw5OSwxMDEsNTksMSw4MjAzLDgzLDExMiw5Nyw5OSwxMDEsNTksMSw4MjAzLDEwMSwxMTQsMTIxLDg0LDEwNCwxMDUsMTEwLDgzLDExMiw5Nyw5OSwxMDEsNTksMSw4MjAzLDExNiwxMDEsMTAwLDQsMiw3MSw3NiwzMzg5LDM0MDUsMTE0LDEwMSw5NywxMTYsMTAxLDExNCw3MSwxMTQsMTAxLDk3LDExNiwxMDEsMTE0LDU5LDEsODgxMSwxMDEsMTE1LDExNSw3NiwxMDEsMTE1LDExNSw1OSwxLDg4MTAsNzYsMTA1LDExMCwxMDEsNTksMSwxMCwxMTQsNTksMyw1NTM0OSw1NjU5Myw0LDQsNjYsMTEwLDExMiwxMTYsMzQzNywzNDQ0LDM0NjAsMzQ2NCwxMTQsMTAxLDk3LDEwNyw1OSwxLDgyODgsNjYsMTE0LDEwMSw5NywxMDcsMTA1LDExMCwxMDMsODMsMTEyLDk3LDk5LDEwMSw1OSwxLDE2MCwxMDIsNTksMSw4NDY5LDQsMTMsNTksNjcsNjgsNjksNzEsNzIsNzYsNzgsODAsODIsODMsODQsODYsMzQ5MiwzNDk0LDM1MTcsMzUzNiwzNTc4LDM2NTcsMzY4NSwzNzg0LDM4MjMsMzg2MCwzOTE1LDQwNjYsNDEwNywxLDEwOTg4LDQsMiwxMTEsMTE3LDM1MDAsMzUxMCwxMTAsMTAzLDExNCwxMTcsMTAxLDExMCwxMTYsNTksMSw4ODAyLDExMiw2Nyw5NywxMTIsNTksMSw4ODEzLDExMSwxMTcsOTgsMTA4LDEwMSw4NiwxMDEsMTE0LDExNiwxMDUsOTksOTcsMTA4LDY2LDk3LDExNCw1OSwxLDg3NDIsNCwzLDEwOCwxMTMsMTIwLDM1NDQsMzU1MiwzNTcxLDEwMSwxMDksMTAxLDExMCwxMTYsNTksMSw4NzEzLDExNyw5NywxMDgsNCwyLDU5LDg0LDM1NjEsMzU2MywxLDg4MDAsMTA1LDEwOCwxMDAsMTAxLDU5LDMsODc3MCw4MjQsMTA1LDExNSwxMTYsMTE1LDU5LDEsODcwOCwxMTQsMTAxLDk3LDExNiwxMDEsMTE0LDQsNyw1OSw2OSw3MCw3MSw3Niw4Myw4NCwzNjAwLDM2MDIsMzYwOSwzNjIxLDM2MzEsMzYzNywzNjUwLDEsODgxNSwxMTMsMTE3LDk3LDEwOCw1OSwxLDg4MTcsMTE3LDEwOCwxMDgsNjksMTEzLDExNyw5NywxMDgsNTksMyw4ODA3LDgyNCwxMTQsMTAxLDk3LDExNiwxMDEsMTE0LDU5LDMsODgxMSw4MjQsMTAxLDExNSwxMTUsNTksMSw4ODI1LDEwOCw5NywxMTAsMTE2LDY5LDExMywxMTcsOTcsMTA4LDU5LDMsMTA4NzgsODI0LDEwNSwxMDgsMTAwLDEwMSw1OSwxLDg4MjEsMTE3LDEwOSwxMTIsNCwyLDY4LDY5LDM2NjYsMzY3NywxMTEsMTE5LDExMCw3MiwxMTcsMTA5LDExMiw1OSwzLDg3ODIsODI0LDExMywxMTcsOTcsMTA4LDU5LDMsODc4Myw4MjQsMTAxLDQsMiwxMDIsMTE1LDM2OTIsMzcyNCwxMTYsODQsMTE0LDEwNSw5NywxMTAsMTAzLDEwOCwxMDEsNCwzLDU5LDY2LDY5LDM3MDksMzcxMSwzNzE3LDEsODkzOCw5NywxMTQsNTksMywxMDcwMyw4MjQsMTEzLDExNyw5NywxMDgsNTksMSw4OTQwLDExNSw0LDYsNTksNjksNzEsNzYsODMsODQsMzczOSwzNzQxLDM3NDgsMzc1NywzNzY0LDM3NzcsMSw4ODE0LDExMywxMTcsOTcsMTA4LDU5LDEsODgxNiwxMTQsMTAxLDk3LDExNiwxMDEsMTE0LDU5LDEsODgyNCwxMDEsMTE1LDExNSw1OSwzLDg4MTAsODI0LDEwOCw5NywxMTAsMTE2LDY5LDExMywxMTcsOTcsMTA4LDU5LDMsMTA4NzcsODI0LDEwNSwxMDgsMTAwLDEwMSw1OSwxLDg4MjAsMTAxLDExNSwxMTYsMTAxLDEwMCw0LDIsNzEsNzYsMzc5NSwzODEyLDExNCwxMDEsOTcsMTE2LDEwMSwxMTQsNzEsMTE0LDEwMSw5NywxMTYsMTAxLDExNCw1OSwzLDEwOTE0LDgyNCwxMDEsMTE1LDExNSw3NiwxMDEsMTE1LDExNSw1OSwzLDEwOTEzLDgyNCwxMTQsMTAxLDk5LDEwMSwxMDAsMTAxLDExNSw0LDMsNTksNjksODMsMzgzOCwzODQwLDM4NDgsMSw4ODMyLDExMywxMTcsOTcsMTA4LDU5LDMsMTA5MjcsODI0LDEwOCw5NywxMTAsMTE2LDY5LDExMywxMTcsOTcsMTA4LDU5LDEsODkyOCw0LDIsMTAxLDEwNSwzODY2LDM4ODEsMTE4LDEwMSwxMTQsMTE1LDEwMSw2OSwxMDgsMTAxLDEwOSwxMDEsMTEwLDExNiw1OSwxLDg3MTYsMTAzLDEwNCwxMTYsODQsMTE0LDEwNSw5NywxMTAsMTAzLDEwOCwxMDEsNCwzLDU5LDY2LDY5LDM5MDAsMzkwMiwzOTA4LDEsODkzOSw5NywxMTQsNTksMywxMDcwNCw4MjQsMTEzLDExNyw5NywxMDgsNTksMSw4OTQxLDQsMiwxMTMsMTE3LDM5MjEsMzk3MywxMTcsOTcsMTE0LDEwMSw4MywxMTcsNCwyLDk4LDExMiwzOTMzLDM5NTIsMTE1LDEwMSwxMTYsNCwyLDU5LDY5LDM5NDIsMzk0NSwzLDg4NDcsODI0LDExMywxMTcsOTcsMTA4LDU5LDEsODkzMCwxMDEsMTE0LDExNSwxMDEsMTE2LDQsMiw1OSw2OSwzOTYzLDM5NjYsMyw4ODQ4LDgyNCwxMTMsMTE3LDk3LDEwOCw1OSwxLDg5MzEsNCwzLDk4LDk5LDExMiwzOTgxLDQwMDAsNDA0NSwxMTUsMTAxLDExNiw0LDIsNTksNjksMzk5MCwzOTkzLDMsODgzNCw4NDAyLDExMywxMTcsOTcsMTA4LDU5LDEsODg0MCw5OSwxMDEsMTAxLDEwMCwxMTUsNCw0LDU5LDY5LDgzLDg0LDQwMTUsNDAxNyw0MDI1LDQwMzcsMSw4ODMzLDExMywxMTcsOTcsMTA4LDU5LDMsMTA5MjgsODI0LDEwOCw5NywxMTAsMTE2LDY5LDExMywxMTcsOTcsMTA4LDU5LDEsODkyOSwxMDUsMTA4LDEwMCwxMDEsNTksMyw4ODMxLDgyNCwxMDEsMTE0LDExNSwxMDEsMTE2LDQsMiw1OSw2OSw0MDU2LDQwNTksMyw4ODM1LDg0MDIsMTEzLDExNyw5NywxMDgsNTksMSw4ODQxLDEwNSwxMDgsMTAwLDEwMSw0LDQsNTksNjksNzAsODQsNDA4MCw0MDgyLDQwODksNDEwMCwxLDg3NjksMTEzLDExNyw5NywxMDgsNTksMSw4NzcyLDExNywxMDgsMTA4LDY5LDExMywxMTcsOTcsMTA4LDU5LDEsODc3NSwxMDUsMTA4LDEwMCwxMDEsNTksMSw4Nzc3LDEwMSwxMTQsMTE2LDEwNSw5OSw5NywxMDgsNjYsOTcsMTE0LDU5LDEsODc0MCw5OSwxMTQsNTksMyw1NTM0OSw1NjQ4OSwxMDUsMTA4LDEwMCwxMDEsNSwyMDksMSw1OSw0MTM1LDEsMjA5LDU5LDEsOTI1LDQsMTQsNjksOTcsOTksMTAwLDEwMiwxMDMsMTA5LDExMSwxMTIsMTE0LDExNSwxMTYsMTE3LDExOCw0MTcwLDQxNzYsNDE4Nyw0MjA1LDQyMTIsNDIxNyw0MjI4LDQyNTMsNDI1OSw0MjkyLDQyOTUsNDMxNiw0MzM3LDQzNDYsMTA4LDEwNSwxMDMsNTksMSwzMzgsOTksMTE3LDExNiwxMDEsNSwyMTEsMSw1OSw0MTg1LDEsMjExLDQsMiwxMDUsMTIxLDQxOTMsNDIwMiwxMTQsOTksNSwyMTIsMSw1OSw0MjAwLDEsMjEyLDU5LDEsMTA1NCw5OCwxMDgsOTcsOTksNTksMSwzMzYsMTE0LDU5LDMsNTUzNDksNTY1OTQsMTE0LDk3LDExOCwxMDEsNSwyMTAsMSw1OSw0MjI2LDEsMjEwLDQsMyw5NywxMDEsMTA1LDQyMzYsNDI0MSw0MjQ2LDk5LDExNCw1OSwxLDMzMiwxMDMsOTcsNTksMSw5MzcsOTksMTE0LDExMSwxMTAsNTksMSw5MjcsMTEyLDEwMiw1OSwzLDU1MzQ5LDU2NjQ2LDEwMSwxMTAsNjcsMTE3LDExNCwxMDgsMTIxLDQsMiw2OCw4MSw0MjcyLDQyODUsMTExLDExNyw5OCwxMDgsMTAxLDgxLDExNywxMTEsMTE2LDEwMSw1OSwxLDgyMjAsMTE3LDExMSwxMTYsMTAxLDU5LDEsODIxNiw1OSwxLDEwODM2LDQsMiw5OSwxMDgsNDMwMSw0MzA2LDExNCw1OSwzLDU1MzQ5LDU2NDkwLDk3LDExNSwxMDQsNSwyMTYsMSw1OSw0MzE0LDEsMjE2LDEwNSw0LDIsMTA4LDEwOSw0MzIzLDQzMzIsMTAwLDEwMSw1LDIxMywxLDU5LDQzMzAsMSwyMTMsMTAxLDExNSw1OSwxLDEwODA3LDEwOSwxMDgsNSwyMTQsMSw1OSw0MzQ0LDEsMjE0LDEwMSwxMTQsNCwyLDY2LDgwLDQzNTQsNDM4MCw0LDIsOTcsMTE0LDQzNjAsNDM2NCwxMTQsNTksMSw4MjU0LDk3LDk5LDQsMiwxMDEsMTA3LDQzNzIsNDM3NSw1OSwxLDkxODIsMTAxLDExNiw1OSwxLDkxNDAsOTcsMTE0LDEwMSwxMTAsMTE2LDEwNCwxMDEsMTE1LDEwNSwxMTUsNTksMSw5MTgwLDQsOSw5Nyw5OSwxMDIsMTA0LDEwNSwxMDgsMTExLDExNCwxMTUsNDQxMyw0NDIyLDQ0MjYsNDQzMSw0NDM1LDQ0MzgsNDQ0OCw0NDcxLDQ1NjEsMTE0LDExNiwxMDUsOTcsMTA4LDY4LDU5LDEsODcwNiwxMjEsNTksMSwxMDU1LDExNCw1OSwzLDU1MzQ5LDU2NTk1LDEwNSw1OSwxLDkzNCw1OSwxLDkyOCwxMTcsMTE1LDc3LDEwNSwxMTAsMTE3LDExNSw1OSwxLDE3Nyw0LDIsMTA1LDExMiw0NDU0LDQ0NjcsMTEwLDk5LDk3LDExNCwxMDEsMTEyLDEwOCw5NywxMTAsMTAxLDU5LDEsODQ2MCwxMDIsNTksMSw4NDczLDQsNCw1OSwxMDEsMTA1LDExMSw0NDgxLDQ0ODMsNDUyNiw0NTMxLDEsMTA5MzksOTksMTAxLDEwMCwxMDEsMTE1LDQsNCw1OSw2OSw4Myw4NCw0NDk4LDQ1MDAsNDUwNyw0NTE5LDEsODgyNiwxMTMsMTE3LDk3LDEwOCw1OSwxLDEwOTI3LDEwOCw5NywxMTAsMTE2LDY5LDExMywxMTcsOTcsMTA4LDU5LDEsODgyOCwxMDUsMTA4LDEwMCwxMDEsNTksMSw4ODMwLDEwOSwxMDEsNTksMSw4MjQzLDQsMiwxMDAsMTEyLDQ1MzcsNDU0MywxMTcsOTksMTE2LDU5LDEsODcxOSwxMTEsMTE0LDExNiwxMDUsMTExLDExMCw0LDIsNTksOTcsNDU1NSw0NTU3LDEsODc1OSwxMDgsNTksMSw4NzMzLDQsMiw5OSwxMDUsNDU2Nyw0NTcyLDExNCw1OSwzLDU1MzQ5LDU2NDkxLDU5LDEsOTM2LDQsNCw4NSwxMDIsMTExLDExNSw0NTg1LDQ1OTQsNDU5OSw0NjA0LDc5LDg0LDUsMzQsMSw1OSw0NTkyLDEsMzQsMTE0LDU5LDMsNTUzNDksNTY1OTYsMTEyLDEwMiw1OSwxLDg0NzQsOTksMTE0LDU5LDMsNTUzNDksNTY0OTIsNCwxMiw2Niw2OSw5Nyw5OSwxMDEsMTAyLDEwNCwxMDUsMTExLDExNCwxMTUsMTE3LDQ2MzYsNDY0Miw0NjUwLDQ2ODEsNDcwNCw0NzYzLDQ3NjcsNDc3MSw1MDQ3LDUwNjksNTA4MSw1MDk0LDk3LDExNCwxMTQsNTksMSwxMDUxMiw3MSw1LDE3NCwxLDU5LDQ2NDgsMSwxNzQsNCwzLDk5LDExMCwxMTQsNDY1OCw0NjY0LDQ2NjgsMTE3LDExNiwxMDEsNTksMSwzNDAsMTAzLDU5LDEsMTAyMTksMTE0LDQsMiw1OSwxMTYsNDY3NSw0Njc3LDEsODYwOCwxMDgsNTksMSwxMDUxOCw0LDMsOTcsMTAxLDEyMSw0Njg5LDQ2OTUsNDcwMSwxMTQsMTExLDExMCw1OSwxLDM0NCwxMDAsMTA1LDEwOCw1OSwxLDM0Miw1OSwxLDEwNTYsNCwyLDU5LDExOCw0NzEwLDQ3MTIsMSw4NDc2LDEwMSwxMTQsMTE1LDEwMSw0LDIsNjksODUsNDcyMiw0NzQ4LDQsMiwxMDgsMTEzLDQ3MjgsNDczNiwxMDEsMTA5LDEwMSwxMTAsMTE2LDU5LDEsODcxNSwxMTcsMTA1LDEwOCwxMDUsOTgsMTE0LDEwNSwxMTcsMTA5LDU5LDEsODY1MSwxMTIsNjksMTEzLDExNywxMDUsMTA4LDEwNSw5OCwxMTQsMTA1LDExNywxMDksNTksMSwxMDYwNywxMTQsNTksMSw4NDc2LDExMSw1OSwxLDkyOSwxMDMsMTA0LDExNiw0LDgsNjUsNjcsNjgsNzAsODQsODUsODYsOTcsNDc5Miw0ODQwLDQ4NDksNDkwNSw0OTEyLDQ5NzIsNTAyMiw1MDQwLDQsMiwxMTAsMTE0LDQ3OTgsNDgxMSwxMDMsMTA4LDEwMSw2NiwxMTQsOTcsOTksMTA3LDEwMSwxMTYsNTksMSwxMDIxNywxMTQsMTExLDExOSw0LDMsNTksNjYsNzYsNDgyMiw0ODI0LDQ4MjksMSw4NTk0LDk3LDExNCw1OSwxLDg2NzcsMTAxLDEwMiwxMTYsNjUsMTE0LDExNCwxMTEsMTE5LDU5LDEsODY0NCwxMDEsMTA1LDEwOCwxMDUsMTEwLDEwMyw1OSwxLDg5NjksMTExLDQsMiwxMTcsMTE5LDQ4NTYsNDg2OSw5OCwxMDgsMTAxLDY2LDExNCw5Nyw5OSwxMDcsMTAxLDExNiw1OSwxLDEwMjE1LDExMCw0LDIsODQsODYsNDg3Niw0ODg3LDEwMSwxMDEsODYsMTAxLDk5LDExNiwxMTEsMTE0LDU5LDEsMTA1ODksMTAxLDk5LDExNiwxMTEsMTE0LDQsMiw1OSw2Niw0ODk4LDQ5MDAsMSw4NjQyLDk3LDExNCw1OSwxLDEwNTgxLDEwOCwxMTEsMTExLDExNCw1OSwxLDg5NzEsNCwyLDEwMSwxMTQsNDkxOCw0OTQ0LDEwMSw0LDMsNTksNjUsODYsNDkyNyw0OTI5LDQ5MzYsMSw4ODY2LDExNCwxMTQsMTExLDExOSw1OSwxLDg2MTQsMTAxLDk5LDExNiwxMTEsMTE0LDU5LDEsMTA1ODcsMTA1LDk3LDExMCwxMDMsMTA4LDEwMSw0LDMsNTksNjYsNjksNDk1OCw0OTYwLDQ5NjUsMSw4ODgzLDk3LDExNCw1OSwxLDEwNzA0LDExMywxMTcsOTcsMTA4LDU5LDEsODg4NSwxMTIsNCwzLDY4LDg0LDg2LDQ5ODEsNDk5Myw1MDA0LDExMSwxMTksMTEwLDg2LDEwMSw5OSwxMTYsMTExLDExNCw1OSwxLDEwNTc1LDEwMSwxMDEsODYsMTAxLDk5LDExNiwxMTEsMTE0LDU5LDEsMTA1ODgsMTAxLDk5LDExNiwxMTEsMTE0LDQsMiw1OSw2Niw1MDE1LDUwMTcsMSw4NjM4LDk3LDExNCw1OSwxLDEwNTgwLDEwMSw5OSwxMTYsMTExLDExNCw0LDIsNTksNjYsNTAzMyw1MDM1LDEsODY0MCw5NywxMTQsNTksMSwxMDU3OSwxMTQsMTE0LDExMSwxMTksNTksMSw4NjU4LDQsMiwxMTIsMTE3LDUwNTMsNTA1NywxMDIsNTksMSw4NDc3LDExMCwxMDAsNzMsMTA5LDExMiwxMDgsMTA1LDEwMSwxMTUsNTksMSwxMDYwOCwxMDUsMTAzLDEwNCwxMTYsOTcsMTE0LDExNCwxMTEsMTE5LDU5LDEsODY2Nyw0LDIsOTksMTA0LDUwODcsNTA5MSwxMTQsNTksMSw4NDc1LDU5LDEsODYyNSwxMDgsMTAxLDY4LDEwMSwxMDgsOTcsMTIxLDEwMSwxMDAsNTksMSwxMDc0MCw0LDEzLDcyLDc5LDk3LDk5LDEwMiwxMDQsMTA1LDEwOSwxMTEsMTEzLDExNSwxMTYsMTE3LDUxMzQsNTE1MCw1MTU3LDUxNjQsNTE5OCw1MjAzLDUyNTksNTI2NSw1Mjc3LDUyODMsNTM3NCw1MzgwLDUzODUsNCwyLDY3LDk5LDUxNDAsNTE0Niw3Miw5OSwxMjEsNTksMSwxMDY1LDEyMSw1OSwxLDEwNjQsNzAsODQsOTksMTIxLDU5LDEsMTA2OCw5OSwxMTcsMTE2LDEwMSw1OSwxLDM0Niw0LDUsNTksOTcsMTAxLDEwNSwxMjEsNTE3Niw1MTc4LDUxODQsNTE5MCw1MTk1LDEsMTA5NDAsMTE0LDExMSwxMTAsNTksMSwzNTIsMTAwLDEwNSwxMDgsNTksMSwzNTAsMTE0LDk5LDU5LDEsMzQ4LDU5LDEsMTA1NywxMTQsNTksMyw1NTM0OSw1NjU5OCwxMTEsMTE0LDExNiw0LDQsNjgsNzYsODIsODUsNTIxNiw1MjI3LDUyMzgsNTI1MCwxMTEsMTE5LDExMCw2NSwxMTQsMTE0LDExMSwxMTksNTksMSw4NTk1LDEwMSwxMDIsMTE2LDY1LDExNCwxMTQsMTExLDExOSw1OSwxLDg1OTIsMTA1LDEwMywxMDQsMTE2LDY1LDExNCwxMTQsMTExLDExOSw1OSwxLDg1OTQsMTEyLDY1LDExNCwxMTQsMTExLDExOSw1OSwxLDg1OTMsMTAzLDEwOSw5Nyw1OSwxLDkzMSw5NywxMDgsMTA4LDY3LDEwNSwxMTQsOTksMTA4LDEwMSw1OSwxLDg3MjgsMTEyLDEwMiw1OSwzLDU1MzQ5LDU2NjUwLDQsMiwxMTQsMTE3LDUyODksNTI5MywxMTYsNTksMSw4NzMwLDk3LDExNCwxMDEsNCw0LDU5LDczLDgzLDg1LDUzMDYsNTMwOCw1MzIyLDUzNjcsMSw5NjMzLDExMCwxMTYsMTAxLDExNCwxMTUsMTAxLDk5LDExNiwxMDUsMTExLDExMCw1OSwxLDg4NTEsMTE3LDQsMiw5OCwxMTIsNTMyOSw1MzQ3LDExNSwxMDEsMTE2LDQsMiw1OSw2OSw1MzM4LDUzNDAsMSw4ODQ3LDExMywxMTcsOTcsMTA4LDU5LDEsODg0OSwxMDEsMTE0LDExNSwxMDEsMTE2LDQsMiw1OSw2OSw1MzU4LDUzNjAsMSw4ODQ4LDExMywxMTcsOTcsMTA4LDU5LDEsODg1MCwxMTAsMTA1LDExMSwxMTAsNTksMSw4ODUyLDk5LDExNCw1OSwzLDU1MzQ5LDU2NDk0LDk3LDExNCw1OSwxLDg5MDIsNCw0LDk4LDk5LDEwOSwxMTIsNTM5NSw1NDIwLDU0NzUsNTQ3OCw0LDIsNTksMTE1LDU0MDEsNTQwMywxLDg5MTIsMTAxLDExNiw0LDIsNTksNjksNTQxMSw1NDEzLDEsODkxMiwxMTMsMTE3LDk3LDEwOCw1OSwxLDg4MzgsNCwyLDk5LDEwNCw1NDI2LDU0NjgsMTAxLDEwMSwxMDAsMTE1LDQsNCw1OSw2OSw4Myw4NCw1NDQwLDU0NDIsNTQ0OSw1NDYxLDEsODgyNywxMTMsMTE3LDk3LDEwOCw1OSwxLDEwOTI4LDEwOCw5NywxMTAsMTE2LDY5LDExMywxMTcsOTcsMTA4LDU5LDEsODgyOSwxMDUsMTA4LDEwMCwxMDEsNTksMSw4ODMxLDg0LDEwNCw5NywxMTYsNTksMSw4NzE1LDU5LDEsODcyMSw0LDMsNTksMTAxLDExNSw1NDg2LDU0ODgsNTUwNywxLDg5MTMsMTE0LDExNSwxMDEsMTE2LDQsMiw1OSw2OSw1NDk4LDU1MDAsMSw4ODM1LDExMywxMTcsOTcsMTA4LDU5LDEsODgzOSwxMDEsMTE2LDU5LDEsODkxMyw0LDExLDcyLDgyLDgzLDk3LDk5LDEwMiwxMDQsMTA1LDExMSwxMTQsMTE1LDU1MzYsNTU0Niw1NTUyLDU1NjcsNTU3OSw1NjAyLDU2MDcsNTY1NSw1Njk1LDU3MDEsNTcxMSw3OSw4Miw3OCw1LDIyMiwxLDU5LDU1NDQsMSwyMjIsNjUsNjgsNjksNTksMSw4NDgyLDQsMiw3Miw5OSw1NTU4LDU1NjMsOTksMTIxLDU5LDEsMTAzNSwxMjEsNTksMSwxMDYyLDQsMiw5OCwxMTcsNTU3Myw1NTc2LDU5LDEsOSw1OSwxLDkzMiw0LDMsOTcsMTAxLDEyMSw1NTg3LDU1OTMsNTU5OSwxMTQsMTExLDExMCw1OSwxLDM1NiwxMDAsMTA1LDEwOCw1OSwxLDM1NCw1OSwxLDEwNTgsMTE0LDU5LDMsNTUzNDksNTY1OTksNCwyLDEwMSwxMDUsNTYxMyw1NjMxLDQsMiwxMTQsMTE2LDU2MTksNTYyNywxMDEsMTAyLDExMSwxMTQsMTAxLDU5LDEsODc1Niw5Nyw1OSwxLDkyMCw0LDIsOTksMTEwLDU2MzcsNTY0NywxMDcsODMsMTEyLDk3LDk5LDEwMSw1OSwzLDgyODcsODIwMiw4MywxMTIsOTcsOTksMTAxLDU5LDEsODIwMSwxMDgsMTAwLDEwMSw0LDQsNTksNjksNzAsODQsNTY2OCw1NjcwLDU2NzcsNTY4OCwxLDg3NjQsMTEzLDExNyw5NywxMDgsNTksMSw4NzcxLDExNywxMDgsMTA4LDY5LDExMywxMTcsOTcsMTA4LDU5LDEsODc3MywxMDUsMTA4LDEwMCwxMDEsNTksMSw4Nzc2LDExMiwxMDIsNTksMyw1NTM0OSw1NjY1MSwxMDUsMTEyLDEwOCwxMDEsNjgsMTExLDExNiw1OSwxLDg0MTEsNCwyLDk5LDExNiw1NzE3LDU3MjIsMTE0LDU5LDMsNTUzNDksNTY0OTUsMTE0LDExMSwxMDcsNTksMSwzNTgsNCwxNCw5Nyw5OCw5OSwxMDAsMTAyLDEwMywxMDksMTEwLDExMSwxMTIsMTE0LDExNSwxMTYsMTE3LDU3NTgsNTc4OSw1ODA1LDU4MjMsNTgzMCw1ODM1LDU4NDYsNTg1Miw1OTIxLDU5MzcsNjA4OSw2MDk1LDYxMDEsNjEwOCw0LDIsOTksMTE0LDU3NjQsNTc3NCwxMTcsMTE2LDEwMSw1LDIxOCwxLDU5LDU3NzIsMSwyMTgsMTE0LDQsMiw1OSwxMTEsNTc4MSw1NzgzLDEsODYwNyw5OSwxMDUsMTE0LDU5LDEsMTA1NjksMTE0LDQsMiw5OSwxMDEsNTc5Niw1ODAwLDEyMSw1OSwxLDEwMzgsMTE4LDEwMSw1OSwxLDM2NCw0LDIsMTA1LDEyMSw1ODExLDU4MjAsMTE0LDk5LDUsMjE5LDEsNTksNTgxOCwxLDIxOSw1OSwxLDEwNTksOTgsMTA4LDk3LDk5LDU5LDEsMzY4LDExNCw1OSwzLDU1MzQ5LDU2NjAwLDExNCw5NywxMTgsMTAxLDUsMjE3LDEsNTksNTg0NCwxLDIxNyw5Nyw5OSwxMTQsNTksMSwzNjIsNCwyLDEwMCwxMDUsNTg1OCw1OTA1LDEwMSwxMTQsNCwyLDY2LDgwLDU4NjYsNTg5Miw0LDIsOTcsMTE0LDU4NzIsNTg3NiwxMTQsNTksMSw5NSw5Nyw5OSw0LDIsMTAxLDEwNyw1ODg0LDU4ODcsNTksMSw5MTgzLDEwMSwxMTYsNTksMSw5MTQxLDk3LDExNCwxMDEsMTEwLDExNiwxMDQsMTAxLDExNSwxMDUsMTE1LDU5LDEsOTE4MSwxMTEsMTEwLDQsMiw1OSw4MCw1OTEzLDU5MTUsMSw4ODk5LDEwOCwxMTcsMTE1LDU5LDEsODg0Niw0LDIsMTAzLDExMiw1OTI3LDU5MzIsMTExLDExMCw1OSwxLDM3MCwxMDIsNTksMyw1NTM0OSw1NjY1Miw0LDgsNjUsNjgsNjksODQsOTcsMTAwLDExMiwxMTUsNTk1NSw1OTg1LDU5OTYsNjAwOSw2MDI2LDYwMzMsNjA0NCw2MDc1LDExNCwxMTQsMTExLDExOSw0LDMsNTksNjYsNjgsNTk2Nyw1OTY5LDU5NzQsMSw4NTkzLDk3LDExNCw1OSwxLDEwNTE0LDExMSwxMTksMTEwLDY1LDExNCwxMTQsMTExLDExOSw1OSwxLDg2NDUsMTExLDExOSwxMTAsNjUsMTE0LDExNCwxMTEsMTE5LDU5LDEsODU5NywxMTMsMTE3LDEwNSwxMDgsMTA1LDk4LDExNCwxMDUsMTE3LDEwOSw1OSwxLDEwNjA2LDEwMSwxMDEsNCwyLDU5LDY1LDYwMTcsNjAxOSwxLDg4NjksMTE0LDExNCwxMTEsMTE5LDU5LDEsODYxMywxMTQsMTE0LDExMSwxMTksNTksMSw4NjU3LDExMSwxMTksMTEwLDk3LDExNCwxMTQsMTExLDExOSw1OSwxLDg2NjEsMTAxLDExNCw0LDIsNzYsODIsNjA1Miw2MDYzLDEwMSwxMDIsMTE2LDY1LDExNCwxMTQsMTExLDExOSw1OSwxLDg1OTgsMTA1LDEwMywxMDQsMTE2LDY1LDExNCwxMTQsMTExLDExOSw1OSwxLDg1OTksMTA1LDQsMiw1OSwxMDgsNjA4Miw2MDg0LDEsOTc4LDExMSwxMTAsNTksMSw5MzMsMTA1LDExMCwxMDMsNTksMSwzNjYsOTksMTE0LDU5LDMsNTUzNDksNTY0OTYsMTA1LDEwOCwxMDAsMTAxLDU5LDEsMzYwLDEwOSwxMDgsNSwyMjAsMSw1OSw2MTE1LDEsMjIwLDQsOSw2OCw5OCw5OSwxMDAsMTAxLDEwMiwxMTEsMTE1LDExOCw2MTM3LDYxNDMsNjE0OCw2MTUyLDYxNjYsNjI1MCw2MjU1LDYyNjEsNjI2Nyw5NywxMTUsMTA0LDU5LDEsODg3NSw5NywxMTQsNTksMSwxMDk4NywxMjEsNTksMSwxMDQyLDk3LDExNSwxMDQsNCwyLDU5LDEwOCw2MTYxLDYxNjMsMSw4ODczLDU5LDEsMTA5ODIsNCwyLDEwMSwxMTQsNjE3Miw2MTc1LDU5LDEsODg5Nyw0LDMsOTgsMTE2LDEyMSw2MTgzLDYxODgsNjIzOCw5NywxMTQsNTksMSw4MjE0LDQsMiw1OSwxMDUsNjE5NCw2MTk2LDEsODIxNCw5OSw5NywxMDgsNCw0LDY2LDc2LDgzLDg0LDYyMDksNjIxNCw2MjIwLDYyMzEsOTcsMTE0LDU5LDEsODczOSwxMDUsMTEwLDEwMSw1OSwxLDEyNCwxMDEsMTEyLDk3LDExNCw5NywxMTYsMTExLDExNCw1OSwxLDEwMDcyLDEwNSwxMDgsMTAwLDEwMSw1OSwxLDg3NjgsODQsMTA0LDEwNSwxMTAsODMsMTEyLDk3LDk5LDEwMSw1OSwxLDgyMDIsMTE0LDU5LDMsNTUzNDksNTY2MDEsMTEyLDEwMiw1OSwzLDU1MzQ5LDU2NjUzLDk5LDExNCw1OSwzLDU1MzQ5LDU2NDk3LDEwMCw5NywxMTUsMTA0LDU5LDEsODg3NCw0LDUsOTksMTAxLDEwMiwxMTEsMTE1LDYyODYsNjI5Miw2Mjk4LDYzMDMsNjMwOSwxMDUsMTE0LDk5LDU5LDEsMzcyLDEwMCwxMDMsMTAxLDU5LDEsODg5NiwxMTQsNTksMyw1NTM0OSw1NjYwMiwxMTIsMTAyLDU5LDMsNTUzNDksNTY2NTQsOTksMTE0LDU5LDMsNTUzNDksNTY0OTgsNCw0LDEwMiwxMDUsMTExLDExNSw2MzI1LDYzMzAsNjMzMyw2MzM5LDExNCw1OSwzLDU1MzQ5LDU2NjAzLDU5LDEsOTI2LDExMiwxMDIsNTksMyw1NTM0OSw1NjY1NSw5OSwxMTQsNTksMyw1NTM0OSw1NjQ5OSw0LDksNjUsNzMsODUsOTcsOTksMTAyLDExMSwxMTUsMTE3LDYzNjUsNjM3MCw2Mzc1LDYzODAsNjM5MSw2NDA1LDY0MTAsNjQxNiw2NDIyLDk5LDEyMSw1OSwxLDEwNzEsOTksMTIxLDU5LDEsMTAzMSw5OSwxMjEsNTksMSwxMDcwLDk5LDExNywxMTYsMTAxLDUsMjIxLDEsNTksNjM4OSwxLDIyMSw0LDIsMTA1LDEyMSw2Mzk3LDY0MDIsMTE0LDk5LDU5LDEsMzc0LDU5LDEsMTA2NywxMTQsNTksMyw1NTM0OSw1NjYwNCwxMTIsMTAyLDU5LDMsNTUzNDksNTY2NTYsOTksMTE0LDU5LDMsNTUzNDksNTY1MDAsMTA5LDEwOCw1OSwxLDM3Niw0LDgsNzIsOTcsOTksMTAwLDEwMSwxMDIsMTExLDExNSw2NDQ1LDY0NTAsNjQ1Nyw2NDcyLDY0NzcsNjUwMSw2NTA1LDY1MTAsOTksMTIxLDU5LDEsMTA0Niw5OSwxMTcsMTE2LDEwMSw1OSwxLDM3Nyw0LDIsOTcsMTIxLDY0NjMsNjQ2OSwxMTQsMTExLDExMCw1OSwxLDM4MSw1OSwxLDEwNDcsMTExLDExNiw1OSwxLDM3OSw0LDIsMTE0LDExNiw2NDgzLDY0OTcsMTExLDg3LDEwNSwxMDAsMTE2LDEwNCw4MywxMTIsOTcsOTksMTAxLDU5LDEsODIwMyw5Nyw1OSwxLDkxOCwxMTQsNTksMSw4NDg4LDExMiwxMDIsNTksMSw4NDg0LDk5LDExNCw1OSwzLDU1MzQ5LDU2NTAxLDQsMTYsOTcsOTgsOTksMTAxLDEwMiwxMDMsMTA4LDEwOSwxMTAsMTExLDExMiwxMTQsMTE1LDExNiwxMTcsMTE5LDY1NTAsNjU2MSw2NTY4LDY2MTIsNjYyMiw2NjM0LDY2NDUsNjY3Miw2Njk5LDY4NTQsNjg3MCw2OTIzLDY5MzMsNjk2Myw2OTc0LDY5ODMsOTksMTE3LDExNiwxMDEsNSwyMjUsMSw1OSw2NTU5LDEsMjI1LDExNCwxMDEsMTE4LDEwMSw1OSwxLDI1OSw0LDYsNTksNjksMTAwLDEwNSwxMTcsMTIxLDY1ODIsNjU4NCw2NTg4LDY1OTEsNjYwMCw2NjA5LDEsODc2Niw1OSwzLDg3NjYsODE5LDU5LDEsODc2NywxMTQsOTksNSwyMjYsMSw1OSw2NTk4LDEsMjI2LDExNiwxMDEsNSwxODAsMSw1OSw2NjA3LDEsMTgwLDU5LDEsMTA3MiwxMDgsMTA1LDEwMyw1LDIzMCwxLDU5LDY2MjAsMSwyMzAsNCwyLDU5LDExNCw2NjI4LDY2MzAsMSw4Mjg5LDU5LDMsNTUzNDksNTY2MDYsMTE0LDk3LDExOCwxMDEsNSwyMjQsMSw1OSw2NjQzLDEsMjI0LDQsMiwxMDEsMTEyLDY2NTEsNjY2Nyw0LDIsMTAyLDExMiw2NjU3LDY2NjMsMTE1LDEyMSwxMDksNTksMSw4NTAxLDEwNCw1OSwxLDg1MDEsMTA0LDk3LDU5LDEsOTQ1LDQsMiw5NywxMTIsNjY3OCw2NjkyLDQsMiw5OSwxMDgsNjY4NCw2Njg4LDExNCw1OSwxLDI1NywxMDMsNTksMSwxMDgxNSw1LDM4LDEsNTksNjY5NywxLDM4LDQsMiwxMDAsMTAzLDY3MDUsNjczNyw0LDUsNTksOTcsMTAwLDExNSwxMTgsNjcxNyw2NzE5LDY3MjQsNjcyNyw2NzM0LDEsODc0MywxMTAsMTAwLDU5LDEsMTA4MzcsNTksMSwxMDg0NCwxMDgsMTExLDExMiwxMDEsNTksMSwxMDg0MCw1OSwxLDEwODQyLDQsNyw1OSwxMDEsMTA4LDEwOSwxMTQsMTE1LDEyMiw2NzUzLDY3NTUsNjc1OCw2NzYyLDY4MTQsNjgzNSw2ODQ4LDEsODczNiw1OSwxLDEwNjYwLDEwMSw1OSwxLDg3MzYsMTE1LDEwMCw0LDIsNTksOTcsNjc3MCw2NzcyLDEsODczNyw0LDgsOTcsOTgsOTksMTAwLDEwMSwxMDIsMTAzLDEwNCw2NzkwLDY3OTMsNjc5Niw2Nzk5LDY4MDIsNjgwNSw2ODA4LDY4MTEsNTksMSwxMDY2NCw1OSwxLDEwNjY1LDU5LDEsMTA2NjYsNTksMSwxMDY2Nyw1OSwxLDEwNjY4LDU5LDEsMTA2NjksNTksMSwxMDY3MCw1OSwxLDEwNjcxLDExNiw0LDIsNTksMTE4LDY4MjEsNjgyMywxLDg3MzUsOTgsNCwyLDU5LDEwMCw2ODMwLDY4MzIsMSw4ODk0LDU5LDEsMTA2NTMsNCwyLDExMiwxMTYsNjg0MSw2ODQ1LDEwNCw1OSwxLDg3MzgsNTksMSwxOTcsOTcsMTE0LDExNCw1OSwxLDkwODQsNCwyLDEwMywxMTIsNjg2MCw2ODY1LDExMSwxMTAsNTksMSwyNjEsMTAyLDU5LDMsNTUzNDksNTY2NTgsNCw3LDU5LDY5LDk3LDEwMSwxMDUsMTExLDExMiw2ODg2LDY4ODgsNjg5MSw2ODk3LDY5MDAsNjkwNCw2OTA4LDEsODc3Niw1OSwxLDEwODY0LDk5LDEwNSwxMTQsNTksMSwxMDg2Myw1OSwxLDg3NzgsMTAwLDU5LDEsODc3OSwxMTUsNTksMSwzOSwxMTQsMTExLDEyMCw0LDIsNTksMTAxLDY5MTcsNjkxOSwxLDg3NzYsMTEzLDU5LDEsODc3OCwxMDUsMTEwLDEwMyw1LDIyOSwxLDU5LDY5MzEsMSwyMjksNCwzLDk5LDExNiwxMjEsNjk0MSw2OTQ2LDY5NDksMTE0LDU5LDMsNTUzNDksNTY1MDIsNTksMSw0MiwxMDksMTEyLDQsMiw1OSwxMDEsNjk1Nyw2OTU5LDEsODc3NiwxMTMsNTksMSw4NzgxLDEwNSwxMDgsMTAwLDEwMSw1LDIyNywxLDU5LDY5NzIsMSwyMjcsMTA5LDEwOCw1LDIyOCwxLDU5LDY5ODEsMSwyMjgsNCwyLDk5LDEwNSw2OTg5LDY5OTcsMTExLDExMCwxMDUsMTEwLDExNiw1OSwxLDg3NTUsMTEwLDExNiw1OSwxLDEwNzY5LDQsMTYsNzgsOTcsOTgsOTksMTAwLDEwMSwxMDIsMTA1LDEwNywxMDgsMTEwLDExMSwxMTIsMTE0LDExNSwxMTcsNzAzNiw3MDQxLDcxMTksNzEzNSw3MTQ5LDcxNTUsNzIxOSw3MjI0LDczNDcsNzM1NCw3NDYzLDc0ODksNzc4Niw3NzkzLDc4MTQsNzg2NiwxMTEsMTE2LDU5LDEsMTA5ODksNCwyLDk5LDExNCw3MDQ3LDcwOTQsMTA3LDQsNCw5OSwxMDEsMTEyLDExNSw3MDU4LDcwNjQsNzA3Myw3MDgwLDExMSwxMTAsMTAzLDU5LDEsODc4MCwxMTIsMTE1LDEwNSwxMDgsMTExLDExMCw1OSwxLDEwMTQsMTE0LDEwNSwxMDksMTAxLDU5LDEsODI0NSwxMDUsMTA5LDQsMiw1OSwxMDEsNzA4OCw3MDkwLDEsODc2NSwxMTMsNTksMSw4OTA5LDQsMiwxMTgsMTE5LDcxMDAsNzEwNSwxMDEsMTAxLDU5LDEsODg5MywxMDEsMTAwLDQsMiw1OSwxMDMsNzExMyw3MTE1LDEsODk2NSwxMDEsNTksMSw4OTY1LDExNCwxMDcsNCwyLDU5LDExNiw3MTI3LDcxMjksMSw5MTQxLDk4LDExNCwxMDcsNTksMSw5MTQyLDQsMiwxMTEsMTIxLDcxNDEsNzE0NiwxMTAsMTAzLDU5LDEsODc4MCw1OSwxLDEwNzMsMTEzLDExNywxMTEsNTksMSw4MjIyLDQsNSw5OSwxMDksMTEyLDExNCwxMTYsNzE2Nyw3MTgxLDcxODgsNzE5Myw3MTk5LDk3LDExNywxMTUsNCwyLDU5LDEwMSw3MTc2LDcxNzgsMSw4NzU3LDU5LDEsODc1NywxMTIsMTE2LDEyMSwxMTgsNTksMSwxMDY3MiwxMTUsMTA1LDU5LDEsMTAxNCwxMTAsMTExLDExNyw1OSwxLDg0OTIsNCwzLDk3LDEwNCwxMTksNzIwNyw3MjEwLDcyMTMsNTksMSw5NDYsNTksMSw4NTAyLDEwMSwxMDEsMTEwLDU5LDEsODgxMiwxMTQsNTksMyw1NTM0OSw1NjYwNywxMDMsNCw3LDk5LDExMSwxMTUsMTE2LDExNywxMTgsMTE5LDcyNDEsNzI2Miw3Mjg4LDczMDUsNzMyOCw3MzM1LDczNDAsNCwzLDk3LDEwNSwxMTcsNzI0OSw3MjUzLDcyNTgsMTEyLDU5LDEsODg5OCwxMTQsOTksNTksMSw5NzExLDExMiw1OSwxLDg4OTksNCwzLDEwMCwxMTIsMTE2LDcyNzAsNzI3NSw3MjgxLDExMSwxMTYsNTksMSwxMDc1MiwxMDgsMTE3LDExNSw1OSwxLDEwNzUzLDEwNSwxMDksMTAxLDExNSw1OSwxLDEwNzU0LDQsMiwxMTMsMTE2LDcyOTQsNzMwMCw5OSwxMTcsMTEyLDU5LDEsMTA3NTgsOTcsMTE0LDU5LDEsOTczMywxMTQsMTA1LDk3LDExMCwxMDMsMTA4LDEwMSw0LDIsMTAwLDExNyw3MzE4LDczMjQsMTExLDExOSwxMTAsNTksMSw5NjYxLDExMiw1OSwxLDk2NTEsMTEyLDEwOCwxMTcsMTE1LDU5LDEsMTA3NTYsMTAxLDEwMSw1OSwxLDg4OTcsMTAxLDEwMCwxMDMsMTAxLDU5LDEsODg5Niw5NywxMTQsMTExLDExOSw1OSwxLDEwNTA5LDQsMyw5NywxMDcsMTExLDczNjIsNzQzNiw3NDU4LDQsMiw5OSwxMTAsNzM2OCw3NDMyLDEwNyw0LDMsMTA4LDExNSwxMTYsNzM3Nyw3Mzg2LDczOTQsMTExLDEyMiwxMDEsMTEwLDEwMywxMDEsNTksMSwxMDczMSwxMTMsMTE3LDk3LDExNCwxMDEsNTksMSw5NjQyLDExNCwxMDUsOTcsMTEwLDEwMywxMDgsMTAxLDQsNCw1OSwxMDAsMTA4LDExNCw3NDExLDc0MTMsNzQxOSw3NDI1LDEsOTY1MiwxMTEsMTE5LDExMCw1OSwxLDk2NjIsMTAxLDEwMiwxMTYsNTksMSw5NjY2LDEwNSwxMDMsMTA0LDExNiw1OSwxLDk2NTYsMTA3LDU5LDEsOTI1MSw0LDIsNDksNTEsNzQ0Miw3NDU0LDQsMiw1MCw1Miw3NDQ4LDc0NTEsNTksMSw5NjE4LDU5LDEsOTYxNyw1Miw1OSwxLDk2MTksOTksMTA3LDU5LDEsOTYwOCw0LDIsMTAxLDExMSw3NDY5LDc0ODUsNCwyLDU5LDExMyw3NDc1LDc0NzgsMyw2MSw4NDIxLDExNywxMDUsMTE4LDU5LDMsODgwMSw4NDIxLDExNiw1OSwxLDg5NzYsNCw0LDExMiwxMTYsMTE5LDEyMCw3NDk5LDc1MDQsNzUxNyw3NTIzLDEwMiw1OSwzLDU1MzQ5LDU2NjU5LDQsMiw1OSwxMTYsNzUxMCw3NTEyLDEsODg2OSwxMTEsMTA5LDU5LDEsODg2OSwxMTYsMTA1LDEwMSw1OSwxLDg5MDQsNCwxMiw2OCw3Miw4NSw4Niw5OCwxMDAsMTA0LDEwOSwxMTIsMTE2LDExNywxMTgsNzU0OSw3NTcxLDc1OTcsNzYxOSw3NjU1LDc2NjAsNzY4Miw3NzA4LDc3MTUsNzcyMSw3NzI4LDc3NTAsNCw0LDc2LDgyLDEwOCwxMTQsNzU1OSw3NTYyLDc1NjUsNzU2OCw1OSwxLDk1NTksNTksMSw5NTU2LDU5LDEsOTU1OCw1OSwxLDk1NTUsNCw1LDU5LDY4LDg1LDEwMCwxMTcsNzU4Myw3NTg1LDc1ODgsNzU5MSw3NTk0LDEsOTU1Miw1OSwxLDk1NzQsNTksMSw5NTc3LDU5LDEsOTU3Miw1OSwxLDk1NzUsNCw0LDc2LDgyLDEwOCwxMTQsNzYwNyw3NjEwLDc2MTMsNzYxNiw1OSwxLDk1NjUsNTksMSw5NTYyLDU5LDEsOTU2NCw1OSwxLDk1NjEsNCw3LDU5LDcyLDc2LDgyLDEwNCwxMDgsMTE0LDc2MzUsNzYzNyw3NjQwLDc2NDMsNzY0Niw3NjQ5LDc2NTIsMSw5NTUzLDU5LDEsOTU4MCw1OSwxLDk1NzEsNTksMSw5NTY4LDU5LDEsOTU3OSw1OSwxLDk1NzAsNTksMSw5NTY3LDExMSwxMjAsNTksMSwxMDY5Nyw0LDQsNzYsODIsMTA4LDExNCw3NjcwLDc2NzMsNzY3Niw3Njc5LDU5LDEsOTU1Nyw1OSwxLDk1NTQsNTksMSw5NDg4LDU5LDEsOTQ4NCw0LDUsNTksNjgsODUsMTAwLDExNyw3Njk0LDc2OTYsNzY5OSw3NzAyLDc3MDUsMSw5NDcyLDU5LDEsOTU3Myw1OSwxLDk1NzYsNTksMSw5NTE2LDU5LDEsOTUyNCwxMDUsMTEwLDExNywxMTUsNTksMSw4ODYzLDEwOCwxMTcsMTE1LDU5LDEsODg2MiwxMDUsMTA5LDEwMSwxMTUsNTksMSw4ODY0LDQsNCw3Niw4MiwxMDgsMTE0LDc3MzgsNzc0MSw3NzQ0LDc3NDcsNTksMSw5NTYzLDU5LDEsOTU2MCw1OSwxLDk0OTYsNTksMSw5NDkyLDQsNyw1OSw3Miw3Niw4MiwxMDQsMTA4LDExNCw3NzY2LDc3NjgsNzc3MSw3Nzc0LDc3NzcsNzc4MCw3NzgzLDEsOTQ3NCw1OSwxLDk1NzgsNTksMSw5NTY5LDU5LDEsOTU2Niw1OSwxLDk1MzIsNTksMSw5NTA4LDU5LDEsOTUwMCwxMTQsMTA1LDEwOSwxMDEsNTksMSw4MjQ1LDQsMiwxMDEsMTE4LDc3OTksNzgwNCwxMTgsMTAxLDU5LDEsNzI4LDk4LDk3LDExNCw1LDE2NiwxLDU5LDc4MTIsMSwxNjYsNCw0LDk5LDEwMSwxMDUsMTExLDc4MjQsNzgyOSw3ODM0LDc4NDYsMTE0LDU5LDMsNTUzNDksNTY1MDMsMTA5LDEwNSw1OSwxLDgyNzEsMTA5LDQsMiw1OSwxMDEsNzg0MSw3ODQzLDEsODc2NSw1OSwxLDg5MDksMTA4LDQsMyw1OSw5OCwxMDQsNzg1NSw3ODU3LDc4NjAsMSw5Miw1OSwxLDEwNjkzLDExNSwxMTcsOTgsNTksMSwxMDE4NCw0LDIsMTA4LDEwOSw3ODcyLDc4ODUsMTA4LDQsMiw1OSwxMDEsNzg3OSw3ODgxLDEsODIyNiwxMTYsNTksMSw4MjI2LDExMiw0LDMsNTksNjksMTAxLDc4OTQsNzg5Niw3ODk5LDEsODc4Miw1OSwxLDEwOTI2LDQsMiw1OSwxMTMsNzkwNSw3OTA3LDEsODc4Myw1OSwxLDg3ODMsNCwxNSw5Nyw5OSwxMDAsMTAxLDEwMiwxMDQsMTA1LDEwOCwxMTEsMTE0LDExNSwxMTYsMTE3LDExOSwxMjEsNzk0Miw4MDIxLDgwNzUsODA4MCw4MTIxLDgxMjYsODE1Nyw4Mjc5LDgyOTUsODQzMCw4NDQ2LDg0ODUsODQ5MSw4NzA3LDg3MjYsNCwzLDk5LDExMiwxMTQsNzk1MCw3OTU2LDgwMDcsMTE3LDExNiwxMDEsNTksMSwyNjMsNCw2LDU5LDk3LDk4LDk5LDEwMCwxMTUsNzk3MCw3OTcyLDc5NzcsNzk4NCw3OTk4LDgwMDMsMSw4NzQ1LDExMCwxMDAsNTksMSwxMDgyMCwxMTQsOTksMTE3LDExMiw1OSwxLDEwODI1LDQsMiw5NywxMTcsNzk5MCw3OTk0LDExMiw1OSwxLDEwODI3LDExMiw1OSwxLDEwODIzLDExMSwxMTYsNTksMSwxMDgxNiw1OSwzLDg3NDUsNjUwMjQsNCwyLDEwMSwxMTEsODAxMyw4MDE3LDExNiw1OSwxLDgyNTcsMTEwLDU5LDEsNzExLDQsNCw5NywxMDEsMTA1LDExNyw4MDMxLDgwNDYsODA1Niw4MDYxLDQsMiwxMTIsMTE0LDgwMzcsODA0MSwxMTUsNTksMSwxMDgyOSwxMTEsMTEwLDU5LDEsMjY5LDEwMCwxMDUsMTA4LDUsMjMxLDEsNTksODA1NCwxLDIzMSwxMTQsOTksNTksMSwyNjUsMTEyLDExNSw0LDIsNTksMTE1LDgwNjksODA3MSwxLDEwODI4LDEwOSw1OSwxLDEwODMyLDExMSwxMTYsNTksMSwyNjcsNCwzLDEwMCwxMDksMTEwLDgwODgsODA5Nyw4MTA0LDEwNSwxMDgsNSwxODQsMSw1OSw4MDk1LDEsMTg0LDExMiwxMTYsMTIxLDExOCw1OSwxLDEwNjc0LDExNiw1LDE2MiwyLDU5LDEwMSw4MTEyLDgxMTQsMSwxNjIsMTE0LDEwMCwxMTEsMTE2LDU5LDEsMTgzLDExNCw1OSwzLDU1MzQ5LDU2NjA4LDQsMyw5OSwxMDEsMTA1LDgxMzQsODEzOCw4MTU0LDEyMSw1OSwxLDEwOTUsOTksMTA3LDQsMiw1OSwxMDksODE0Niw4MTQ4LDEsMTAwMDMsOTcsMTE0LDEwNyw1OSwxLDEwMDAzLDU5LDEsOTY3LDExNCw0LDcsNTksNjksOTksMTAxLDEwMiwxMDksMTE1LDgxNzQsODE3Niw4MTc5LDgyNTgsODI2MSw4MjY4LDgyNzMsMSw5Njc1LDU5LDEsMTA2OTEsNCwzLDU5LDEwMSwxMDgsODE4Nyw4MTg5LDgxOTMsMSw3MTAsMTEzLDU5LDEsODc5MSwxMDEsNCwyLDk3LDEwMCw4MjAwLDgyMjMsMTE0LDExNCwxMTEsMTE5LDQsMiwxMDgsMTE0LDgyMTAsODIxNiwxMDEsMTAyLDExNiw1OSwxLDg2MzQsMTA1LDEwMywxMDQsMTE2LDU5LDEsODYzNSw0LDUsODIsODMsOTcsOTksMTAwLDgyMzUsODIzOCw4MjQxLDgyNDYsODI1Miw1OSwxLDE3NCw1OSwxLDk0MTYsMTE1LDExNiw1OSwxLDg4NTksMTA1LDExNCw5OSw1OSwxLDg4NTgsOTcsMTE1LDEwNCw1OSwxLDg4NjEsNTksMSw4NzkxLDExMCwxMDUsMTEwLDExNiw1OSwxLDEwNzY4LDEwNSwxMDAsNTksMSwxMDk5MSw5OSwxMDUsMTE0LDU5LDEsMTA2OTAsMTE3LDk4LDExNSw0LDIsNTksMTE3LDgyODgsODI5MCwxLDk4MjcsMTA1LDExNiw1OSwxLDk4MjcsNCw0LDEwOCwxMDksMTEwLDExMiw4MzA1LDgzMjYsODM3Niw4NDAwLDExMSwxMTAsNCwyLDU5LDEwMSw4MzEzLDgzMTUsMSw1OCw0LDIsNTksMTEzLDgzMjEsODMyMywxLDg3ODgsNTksMSw4Nzg4LDQsMiwxMDksMTEyLDgzMzIsODM0NCw5Nyw0LDIsNTksMTE2LDgzMzksODM0MSwxLDQ0LDU5LDEsNjQsNCwzLDU5LDEwMiwxMDgsODM1Miw4MzU0LDgzNTgsMSw4NzA1LDExMCw1OSwxLDg3MjgsMTAxLDQsMiwxMDksMTIwLDgzNjUsODM3MSwxMDEsMTEwLDExNiw1OSwxLDg3MDUsMTAxLDExNSw1OSwxLDg0NTAsNCwyLDEwMywxMDUsODM4Miw4Mzk1LDQsMiw1OSwxMDAsODM4OCw4MzkwLDEsODc3MywxMTEsMTE2LDU5LDEsMTA4NjEsMTEwLDExNiw1OSwxLDg3NTAsNCwzLDEwMiwxMTQsMTIxLDg0MDgsODQxMiw4NDE3LDU5LDMsNTUzNDksNTY2NjAsMTExLDEwMCw1OSwxLDg3MjAsNSwxNjksMiw1OSwxMTUsODQyNCw4NDI2LDEsMTY5LDExNCw1OSwxLDg0NzEsNCwyLDk3LDExMSw4NDM2LDg0NDEsMTE0LDExNCw1OSwxLDg2MjksMTE1LDExNSw1OSwxLDEwMDA3LDQsMiw5OSwxMTcsODQ1Miw4NDU3LDExNCw1OSwzLDU1MzQ5LDU2NTA0LDQsMiw5OCwxMTIsODQ2Myw4NDc0LDQsMiw1OSwxMDEsODQ2OSw4NDcxLDEsMTA5NTksNTksMSwxMDk2MSw0LDIsNTksMTAxLDg0ODAsODQ4MiwxLDEwOTYwLDU5LDEsMTA5NjIsMTAwLDExMSwxMTYsNTksMSw4OTQzLDQsNywxMDAsMTAxLDEwOCwxMTIsMTE0LDExOCwxMTksODUwNyw4NTIyLDg1MzYsODU1MCw4NjAwLDg2OTcsODcwMiw5NywxMTQsMTE0LDQsMiwxMDgsMTE0LDg1MTYsODUxOSw1OSwxLDEwNTUyLDU5LDEsMTA1NDksNCwyLDExMiwxMTUsODUyOCw4NTMyLDExNCw1OSwxLDg5MjYsOTksNTksMSw4OTI3LDk3LDExNCwxMTQsNCwyLDU5LDExMiw4NTQ1LDg1NDcsMSw4NjMwLDU5LDEsMTA1NTcsNCw2LDU5LDk4LDk5LDEwMCwxMTEsMTE1LDg1NjQsODU2Niw4NTczLDg1ODcsODU5Miw4NTk2LDEsODc0NiwxMTQsOTksOTcsMTEyLDU5LDEsMTA4MjQsNCwyLDk3LDExNyw4NTc5LDg1ODMsMTEyLDU5LDEsMTA4MjIsMTEyLDU5LDEsMTA4MjYsMTExLDExNiw1OSwxLDg4NDUsMTE0LDU5LDEsMTA4MjEsNTksMyw4NzQ2LDY1MDI0LDQsNCw5NywxMDgsMTE0LDExOCw4NjEwLDg2MjMsODY2Myw4NjcyLDExNCwxMTQsNCwyLDU5LDEwOSw4NjE4LDg2MjAsMSw4NjMxLDU5LDEsMTA1NTYsMTIxLDQsMywxMDEsMTE4LDExOSw4NjMyLDg2NTEsODY1NiwxMTMsNCwyLDExMiwxMTUsODYzOSw4NjQ1LDExNCwxMDEsOTksNTksMSw4OTI2LDExNyw5OSw5OSw1OSwxLDg5MjcsMTAxLDEwMSw1OSwxLDg5MTAsMTAxLDEwMCwxMDMsMTAxLDU5LDEsODkxMSwxMDEsMTEwLDUsMTY0LDEsNTksODY3MCwxLDE2NCwxMDEsOTcsMTE0LDExNCwxMTEsMTE5LDQsMiwxMDgsMTE0LDg2ODQsODY5MCwxMDEsMTAyLDExNiw1OSwxLDg2MzAsMTA1LDEwMywxMDQsMTE2LDU5LDEsODYzMSwxMDEsMTAxLDU5LDEsODkxMCwxMDEsMTAwLDU5LDEsODkxMSw0LDIsOTksMTA1LDg3MTMsODcyMSwxMTEsMTEwLDEwNSwxMTAsMTE2LDU5LDEsODc1NCwxMTAsMTE2LDU5LDEsODc1MywxMDgsOTksMTE2LDEyMSw1OSwxLDkwMDUsNCwxOSw2NSw3Miw5Nyw5OCw5OSwxMDAsMTAxLDEwMiwxMDQsMTA1LDEwNiwxMDgsMTExLDExNCwxMTUsMTE2LDExNywxMTksMTIyLDg3NzMsODc3OCw4NzgzLDg4MjEsODgzOSw4ODU0LDg4ODcsODkxNCw4OTMwLDg5NDQsOTAzNiw5MDQxLDkwNTgsOTE5Nyw5MjI3LDkyNTgsOTI4MSw5Mjk3LDkzMDUsMTE0LDExNCw1OSwxLDg2NTksOTcsMTE0LDU5LDEsMTA1OTcsNCw0LDEwMywxMDgsMTE0LDExNSw4NzkzLDg3OTksODgwNSw4ODA5LDEwMywxMDEsMTE0LDU5LDEsODIyNCwxMDEsMTE2LDEwNCw1OSwxLDg1MDQsMTE0LDU5LDEsODU5NSwxMDQsNCwyLDU5LDExOCw4ODE2LDg4MTgsMSw4MjA4LDU5LDEsODg2Nyw0LDIsMTA3LDEwOCw4ODI3LDg4MzQsOTcsMTE0LDExMSwxMTksNTksMSwxMDUxMSw5Nyw5OSw1OSwxLDczMyw0LDIsOTcsMTIxLDg4NDUsODg1MSwxMTQsMTExLDExMCw1OSwxLDI3MSw1OSwxLDEwNzYsNCwzLDU5LDk3LDExMSw4ODYyLDg4NjQsODg4MCwxLDg1MTgsNCwyLDEwMywxMTQsODg3MCw4ODc2LDEwMywxMDEsMTE0LDU5LDEsODIyNSwxMTQsNTksMSw4NjUwLDExNiwxMTUsMTAxLDExMyw1OSwxLDEwODcxLDQsMywxMDMsMTA4LDEwOSw4ODk1LDg5MDIsODkwNyw1LDE3NiwxLDU5LDg5MDAsMSwxNzYsMTE2LDk3LDU5LDEsOTQ4LDExMiwxMTYsMTIxLDExOCw1OSwxLDEwNjczLDQsMiwxMDUsMTE0LDg5MjAsODkyNiwxMTUsMTA0LDExNiw1OSwxLDEwNjIzLDU5LDMsNTUzNDksNTY2MDksOTcsMTE0LDQsMiwxMDgsMTE0LDg5MzgsODk0MSw1OSwxLDg2NDMsNTksMSw4NjQyLDQsNSw5NywxMDEsMTAzLDExNSwxMTgsODk1Niw4OTg2LDg5ODksODk5Niw5MDAxLDEwOSw0LDMsNTksMTExLDExNSw4OTY1LDg5NjcsODk4MywxLDg5MDAsMTEwLDEwMCw0LDIsNTksMTE1LDg5NzUsODk3NywxLDg5MDAsMTE3LDEwNSwxMTYsNTksMSw5ODMwLDU5LDEsOTgzMCw1OSwxLDE2OCw5NywxMDksMTA5LDk3LDU5LDEsOTg5LDEwNSwxMTAsNTksMSw4OTQ2LDQsMyw1OSwxMDUsMTExLDkwMDksOTAxMSw5MDMxLDEsMjQ3LDEwMCwxMDEsNSwyNDcsMiw1OSwxMTEsOTAyMCw5MDIyLDEsMjQ3LDExMCwxMTYsMTA1LDEwOSwxMDEsMTE1LDU5LDEsODkwMywxMTAsMTIwLDU5LDEsODkwMyw5OSwxMjEsNTksMSwxMTA2LDk5LDQsMiwxMTEsMTE0LDkwNDgsOTA1MywxMTQsMTEwLDU5LDEsODk5MCwxMTEsMTEyLDU5LDEsODk3Myw0LDUsMTA4LDExMiwxMTYsMTE3LDExOSw5MDcwLDkwNzYsOTA4MSw5MTMwLDkxNDQsMTA4LDk3LDExNCw1OSwxLDM2LDEwMiw1OSwzLDU1MzQ5LDU2NjYxLDQsNSw1OSwxMDEsMTA5LDExMiwxMTUsOTA5Myw5MDk1LDkxMDksOTExNiw5MTIyLDEsNzI5LDExMyw0LDIsNTksMTAwLDkxMDIsOTEwNCwxLDg3ODQsMTExLDExNiw1OSwxLDg3ODUsMTA1LDExMCwxMTcsMTE1LDU5LDEsODc2MCwxMDgsMTE3LDExNSw1OSwxLDg3MjQsMTEzLDExNyw5NywxMTQsMTAxLDU5LDEsODg2NSw5OCwxMDgsMTAxLDk4LDk3LDExNCwxMTksMTAxLDEwMCwxMDMsMTAxLDU5LDEsODk2NiwxMTAsNCwzLDk3LDEwMCwxMDQsOTE1Myw5MTYwLDkxNzIsMTE0LDExNCwxMTEsMTE5LDU5LDEsODU5NSwxMTEsMTE5LDExMCw5NywxMTQsMTE0LDExMSwxMTksMTE1LDU5LDEsODY1MCw5NywxMTQsMTEyLDExMSwxMTEsMTEwLDQsMiwxMDgsMTE0LDkxODQsOTE5MCwxMDEsMTAyLDExNiw1OSwxLDg2NDMsMTA1LDEwMywxMDQsMTE2LDU5LDEsODY0Miw0LDIsOTgsOTksOTIwMyw5MjExLDEwNyw5NywxMTQsMTExLDExOSw1OSwxLDEwNTEyLDQsMiwxMTEsMTE0LDkyMTcsOTIyMiwxMTQsMTEwLDU5LDEsODk5MSwxMTEsMTEyLDU5LDEsODk3Miw0LDMsOTksMTExLDExNiw5MjM1LDkyNDgsOTI1Miw0LDIsMTE0LDEyMSw5MjQxLDkyNDUsNTksMyw1NTM0OSw1NjUwNSw1OSwxLDExMDksMTA4LDU5LDEsMTA3NDIsMTE0LDExMSwxMDcsNTksMSwyNzMsNCwyLDEwMCwxMTQsOTI2NCw5MjY5LDExMSwxMTYsNTksMSw4OTQ1LDEwNSw0LDIsNTksMTAyLDkyNzYsOTI3OCwxLDk2NjMsNTksMSw5NjYyLDQsMiw5NywxMDQsOTI4Nyw5MjkyLDExNCwxMTQsNTksMSw4NjkzLDk3LDExNCw1OSwxLDEwNjA3LDk3LDExMCwxMDMsMTA4LDEwMSw1OSwxLDEwNjYyLDQsMiw5OSwxMDUsOTMxMSw5MzE1LDEyMSw1OSwxLDExMTksMTAzLDExNCw5NywxMTQsMTE0LDU5LDEsMTAyMzksNCwxOCw2OCw5Nyw5OSwxMDAsMTAxLDEwMiwxMDMsMTA4LDEwOSwxMTAsMTExLDExMiwxMTMsMTE0LDExNSwxMTYsMTE3LDEyMCw5MzYxLDkzNzYsOTM5OCw5NDM5LDk0NDQsOTQ0Nyw5NDYyLDk0OTUsOTUzMSw5NTg1LDk1OTgsOTYxNCw5NjU5LDk3NTUsOTc3MSw5NzkyLDk4MDgsOTgyNiw0LDIsNjgsMTExLDkzNjcsOTM3MiwxMTEsMTE2LDU5LDEsMTA4NzEsMTE2LDU5LDEsODc4NSw0LDIsOTksMTE1LDkzODIsOTM5MiwxMTcsMTE2LDEwMSw1LDIzMywxLDU5LDkzOTAsMSwyMzMsMTE2LDEwMSwxMTQsNTksMSwxMDg2Miw0LDQsOTcsMTA1LDExMSwxMjEsOTQwOCw5NDE0LDk0MzAsOTQzNiwxMTQsMTExLDExMCw1OSwxLDI4MywxMTQsNCwyLDU5LDk5LDk0MjEsOTQyMywxLDg3OTAsNSwyMzQsMSw1OSw5NDI4LDEsMjM0LDEwOCwxMTEsMTEwLDU5LDEsODc4OSw1OSwxLDExMDEsMTExLDExNiw1OSwxLDI3OSw1OSwxLDg1MTksNCwyLDY4LDExNCw5NDUzLDk0NTgsMTExLDExNiw1OSwxLDg3ODYsNTksMyw1NTM0OSw1NjYxMCw0LDMsNTksMTE0LDExNSw5NDcwLDk0NzIsOTQ4MiwxLDEwOTA2LDk3LDExOCwxMDEsNSwyMzIsMSw1OSw5NDgwLDEsMjMyLDQsMiw1OSwxMDAsOTQ4OCw5NDkwLDEsMTA5MDIsMTExLDExNiw1OSwxLDEwOTA0LDQsNCw1OSwxMDUsMTA4LDExNSw5NTA1LDk1MDcsOTUxNSw5NTE4LDEsMTA5MDUsMTEwLDExNiwxMDEsMTE0LDExNSw1OSwxLDkxOTEsNTksMSw4NDY3LDQsMiw1OSwxMDAsOTUyNCw5NTI2LDEsMTA5MDEsMTExLDExNiw1OSwxLDEwOTAzLDQsMyw5NywxMTIsMTE1LDk1MzksOTU0NCw5NTY0LDk5LDExNCw1OSwxLDI3NSwxMTYsMTIxLDQsMyw1OSwxMTUsMTE4LDk1NTQsOTU1Niw5NTYxLDEsODcwOSwxMDEsMTE2LDU5LDEsODcwOSw1OSwxLDg3MDksMTEyLDQsMiw0OSw1OSw5NTcxLDk1ODMsNCwyLDUxLDUyLDk1NzcsOTU4MCw1OSwxLDgxOTYsNTksMSw4MTk3LDEsODE5NSw0LDIsMTAzLDExNSw5NTkxLDk1OTQsNTksMSwzMzEsMTEyLDU5LDEsODE5NCw0LDIsMTAzLDExMiw5NjA0LDk2MDksMTExLDExMCw1OSwxLDI4MSwxMDIsNTksMyw1NTM0OSw1NjY2Miw0LDMsOTcsMTA4LDExNSw5NjIyLDk2MzUsOTY0MCwxMTQsNCwyLDU5LDExNSw5NjI5LDk2MzEsMSw4OTE3LDEwOCw1OSwxLDEwNzIzLDExNywxMTUsNTksMSwxMDg2NSwxMDUsNCwzLDU5LDEwOCwxMTgsOTY0OSw5NjUxLDk2NTYsMSw5NDksMTExLDExMCw1OSwxLDk0OSw1OSwxLDEwMTMsNCw0LDk5LDExNSwxMTcsMTE4LDk2NjksOTY4Niw5NzE2LDk3NDcsNCwyLDEwNSwxMTEsOTY3NSw5NjgwLDExNCw5OSw1OSwxLDg3OTAsMTA4LDExMSwxMTAsNTksMSw4Nzg5LDQsMiwxMDUsMTA4LDk2OTIsOTY5NiwxMDksNTksMSw4NzcwLDk3LDExMCwxMTYsNCwyLDEwMywxMDgsOTcwNSw5NzEwLDExNiwxMTQsNTksMSwxMDkwMiwxMDEsMTE1LDExNSw1OSwxLDEwOTAxLDQsMyw5NywxMDEsMTA1LDk3MjQsOTcyOSw5NzM0LDEwOCwxMTUsNTksMSw2MSwxMTUsMTE2LDU5LDEsODc5OSwxMTgsNCwyLDU5LDY4LDk3NDEsOTc0MywxLDg4MDEsNjgsNTksMSwxMDg3MiwxMTIsOTcsMTE0LDExNSwxMDgsNTksMSwxMDcyNSw0LDIsNjgsOTcsOTc2MSw5NzY2LDExMSwxMTYsNTksMSw4Nzg3LDExNCwxMTQsNTksMSwxMDYwOSw0LDMsOTksMTAwLDEwNSw5Nzc5LDk3ODMsOTc4OCwxMTQsNTksMSw4NDk1LDExMSwxMTYsNTksMSw4Nzg0LDEwOSw1OSwxLDg3NzAsNCwyLDk3LDEwNCw5Nzk4LDk4MDEsNTksMSw5NTEsNSwyNDAsMSw1OSw5ODA2LDEsMjQwLDQsMiwxMDksMTE0LDk4MTQsOTgyMiwxMDgsNSwyMzUsMSw1OSw5ODIwLDEsMjM1LDExMSw1OSwxLDgzNjQsNCwzLDk5LDEwNSwxMTIsOTgzNCw5ODM4LDk4NDMsMTA4LDU5LDEsMzMsMTE1LDExNiw1OSwxLDg3MDcsNCwyLDEwMSwxMTEsOTg0OSw5ODU5LDk5LDExNiw5NywxMTYsMTA1LDExMSwxMTAsNTksMSw4NDk2LDExMCwxMDEsMTEwLDExNiwxMDUsOTcsMTA4LDEwMSw1OSwxLDg1MTksNCwxMiw5Nyw5OSwxMDEsMTAyLDEwNSwxMDYsMTA4LDExMCwxMTEsMTEyLDExNCwxMTUsOTg5Niw5OTEwLDk5MTQsOTkyMSw5OTU0LDk5NjAsOTk2Nyw5OTg5LDk5OTQsMTAwMjcsMTAwMzYsMTAxNjQsMTA4LDEwOCwxMDUsMTEwLDEwMywxMDAsMTExLDExNiwxMTUsMTAxLDExMyw1OSwxLDg3ODYsMTIxLDU5LDEsMTA5MiwxMDksOTcsMTA4LDEwMSw1OSwxLDk3OTIsNCwzLDEwNSwxMDgsMTE0LDk5MjksOTkzNSw5OTUwLDEwOCwxMDUsMTAzLDU5LDEsNjQyNTksNCwyLDEwNSwxMDgsOTk0MSw5OTQ1LDEwMyw1OSwxLDY0MjU2LDEwNSwxMDMsNTksMSw2NDI2MCw1OSwzLDU1MzQ5LDU2NjExLDEwOCwxMDUsMTAzLDU5LDEsNjQyNTcsMTA4LDEwNSwxMDMsNTksMywxMDIsMTA2LDQsMyw5NywxMDgsMTE2LDk5NzUsOTk3OSw5OTg0LDExNiw1OSwxLDk4MzcsMTA1LDEwMyw1OSwxLDY0MjU4LDExMCwxMTUsNTksMSw5NjQ5LDExMSwxMDIsNTksMSw0MDIsNCwyLDExMiwxMTQsMTAwMDAsMTAwMDUsMTAyLDU5LDMsNTUzNDksNTY2NjMsNCwyLDk3LDEwNywxMDAxMSwxMDAxNiwxMDgsMTA4LDU5LDEsODcwNCw0LDIsNTksMTE4LDEwMDIyLDEwMDI0LDEsODkxNiw1OSwxLDEwOTY5LDk3LDExNCwxMTYsMTA1LDExMCwxMTYsNTksMSwxMDc2NSw0LDIsOTcsMTExLDEwMDQyLDEwMTU5LDQsMiw5OSwxMTUsMTAwNDgsMTAxNTUsNCw2LDQ5LDUwLDUxLDUyLDUzLDU1LDEwMDYyLDEwMTAyLDEwMTE0LDEwMTM1LDEwMTM5LDEwMTUxLDQsNiw1MCw1MSw1Miw1Myw1NCw1NiwxMDA3NiwxMDA4MywxMDA4NiwxMDA5MywxMDA5NiwxMDA5OSw1LDE4OSwxLDU5LDEwMDgxLDEsMTg5LDU5LDEsODUzMSw1LDE4OCwxLDU5LDEwMDkxLDEsMTg4LDU5LDEsODUzMyw1OSwxLDg1MzcsNTksMSw4NTM5LDQsMiw1MSw1MywxMDEwOCwxMDExMSw1OSwxLDg1MzIsNTksMSw4NTM0LDQsMyw1Miw1Myw1NiwxMDEyMiwxMDEyOSwxMDEzMiw1LDE5MCwxLDU5LDEwMTI3LDEsMTkwLDU5LDEsODUzNSw1OSwxLDg1NDAsNTMsNTksMSw4NTM2LDQsMiw1NCw1NiwxMDE0NSwxMDE0OCw1OSwxLDg1MzgsNTksMSw4NTQxLDU2LDU5LDEsODU0MiwxMDgsNTksMSw4MjYwLDExOSwxMTAsNTksMSw4OTk0LDk5LDExNCw1OSwzLDU1MzQ5LDU2NTA3LDQsMTcsNjksOTcsOTgsOTksMTAwLDEwMSwxMDIsMTAzLDEwNSwxMDYsMTA4LDExMCwxMTEsMTE0LDExNSwxMTYsMTE4LDEwMjA2LDEwMjE3LDEwMjQ3LDEwMjU0LDEwMjY4LDEwMjczLDEwMzU4LDEwMzYzLDEwMzc0LDEwMzgwLDEwMzg1LDEwNDA2LDEwNDU4LDEwNDY0LDEwNDcwLDEwNDk3LDEwNjEwLDQsMiw1OSwxMDgsMTAyMTIsMTAyMTQsMSw4ODA3LDU5LDEsMTA4OTIsNCwzLDk5LDEwOSwxMTIsMTAyMjUsMTAyMzEsMTAyNDQsMTE3LDExNiwxMDEsNTksMSw1MDEsMTA5LDk3LDQsMiw1OSwxMDAsMTAyMzksMTAyNDEsMSw5NDcsNTksMSw5ODksNTksMSwxMDg4NiwxMTQsMTAxLDExOCwxMDEsNTksMSwyODcsNCwyLDEwNSwxMjEsMTAyNjAsMTAyNjUsMTE0LDk5LDU5LDEsMjg1LDU5LDEsMTA3NSwxMTEsMTE2LDU5LDEsMjg5LDQsNCw1OSwxMDgsMTEzLDExNSwxMDI4MywxMDI4NSwxMDI4OCwxMDMwOCwxLDg4MDUsNTksMSw4OTIzLDQsMyw1OSwxMTMsMTE1LDEwMjk2LDEwMjk4LDEwMzAxLDEsODgwNSw1OSwxLDg4MDcsMTA4LDk3LDExMCwxMTYsNTksMSwxMDg3OCw0LDQsNTksOTksMTAwLDEwOCwxMDMxOCwxMDMyMCwxMDMyNCwxMDM0NSwxLDEwODc4LDk5LDU5LDEsMTA5MjEsMTExLDExNiw0LDIsNTksMTExLDEwMzMyLDEwMzM0LDEsMTA4ODAsNCwyLDU5LDEwOCwxMDM0MCwxMDM0MiwxLDEwODgyLDU5LDEsMTA4ODQsNCwyLDU5LDEwMSwxMDM1MSwxMDM1NCwzLDg5MjMsNjUwMjQsMTE1LDU5LDEsMTA5MDAsMTE0LDU5LDMsNTUzNDksNTY2MTIsNCwyLDU5LDEwMywxMDM2OSwxMDM3MSwxLDg4MTEsNTksMSw4OTIxLDEwOSwxMDEsMTA4LDU5LDEsODUwMyw5OSwxMjEsNTksMSwxMTA3LDQsNCw1OSw2OSw5NywxMDYsMTAzOTUsMTAzOTcsMTA0MDAsMTA0MDMsMSw4ODIzLDU5LDEsMTA4OTgsNTksMSwxMDkxNyw1OSwxLDEwOTE2LDQsNCw2OSw5NywxMDEsMTE1LDEwNDE2LDEwNDE5LDEwNDM0LDEwNDUzLDU5LDEsODgwOSwxMTIsNCwyLDU5LDExMiwxMDQyNiwxMDQyOCwxLDEwODkwLDExNCwxMTEsMTIwLDU5LDEsMTA4OTAsNCwyLDU5LDExMywxMDQ0MCwxMDQ0MiwxLDEwODg4LDQsMiw1OSwxMTMsMTA0NDgsMTA0NTAsMSwxMDg4OCw1OSwxLDg4MDksMTA1LDEwOSw1OSwxLDg5MzUsMTEyLDEwMiw1OSwzLDU1MzQ5LDU2NjY0LDk3LDExOCwxMDEsNTksMSw5Niw0LDIsOTksMTA1LDEwNDc2LDEwNDgwLDExNCw1OSwxLDg0NTgsMTA5LDQsMyw1OSwxMDEsMTA4LDEwNDg5LDEwNDkxLDEwNDk0LDEsODgxOSw1OSwxLDEwODk0LDU5LDEsMTA4OTYsNSw2Miw2LDU5LDk5LDEwMCwxMDgsMTEzLDExNCwxMDUxMiwxMDUxNCwxMDUyNywxMDUzMiwxMDUzOCwxMDU0NSwxLDYyLDQsMiw5OSwxMDUsMTA1MjAsMTA1MjMsNTksMSwxMDkxOSwxMTQsNTksMSwxMDg3NCwxMTEsMTE2LDU5LDEsODkxOSw4MCw5NywxMTQsNTksMSwxMDY0NSwxMTcsMTAxLDExNSwxMTYsNTksMSwxMDg3Niw0LDUsOTcsMTAwLDEwMSwxMDgsMTE1LDEwNTU3LDEwNTc0LDEwNTc5LDEwNTk5LDEwNjA1LDQsMiwxMTIsMTE0LDEwNTYzLDEwNTcwLDExMiwxMTQsMTExLDEyMCw1OSwxLDEwODg2LDExNCw1OSwxLDEwNjE2LDExMSwxMTYsNTksMSw4OTE5LDExMyw0LDIsMTA4LDExMywxMDU4NiwxMDU5MiwxMDEsMTE1LDExNSw1OSwxLDg5MjMsMTA4LDEwMSwxMTUsMTE1LDU5LDEsMTA4OTIsMTAxLDExNSwxMTUsNTksMSw4ODIzLDEwNSwxMDksNTksMSw4ODE5LDQsMiwxMDEsMTEwLDEwNjE2LDEwNjI2LDExNCwxMTYsMTEwLDEwMSwxMTMsMTEzLDU5LDMsODgwOSw2NTAyNCw2OSw1OSwzLDg4MDksNjUwMjQsNCwxMCw2NSw5Nyw5OCw5OSwxMDEsMTAyLDEwNywxMTEsMTE1LDEyMSwxMDY1MywxMDY1OCwxMDcxMywxMDcxOCwxMDcyNCwxMDc2MCwxMDc2NSwxMDc4NiwxMDg1MCwxMDg3NSwxMTQsMTE0LDU5LDEsODY2MCw0LDQsMTA1LDEwOCwxMDksMTE0LDEwNjY4LDEwNjc0LDEwNjc4LDEwNjg0LDExNCwxMTUsMTEyLDU5LDEsODIwMiwxMDIsNTksMSwxODksMTA1LDEwOCwxMTYsNTksMSw4NDU5LDQsMiwxMDAsMTE0LDEwNjkwLDEwNjk1LDk5LDEyMSw1OSwxLDEwOTgsNCwzLDU5LDk5LDExOSwxMDcwMywxMDcwNSwxMDcxMCwxLDg1OTYsMTA1LDExNCw1OSwxLDEwNTY4LDU5LDEsODYyMSw5NywxMTQsNTksMSw4NDYzLDEwNSwxMTQsOTksNTksMSwyOTMsNCwzLDk3LDEwOCwxMTQsMTA3MzIsMTA3NDgsMTA3NTQsMTE0LDExNiwxMTUsNCwyLDU5LDExNywxMDc0MSwxMDc0MywxLDk4MjksMTA1LDExNiw1OSwxLDk4MjksMTA4LDEwNSwxMTIsNTksMSw4MjMwLDk5LDExMSwxMTAsNTksMSw4ODg5LDExNCw1OSwzLDU1MzQ5LDU2NjEzLDExNSw0LDIsMTAxLDExOSwxMDc3MiwxMDc3OSw5NywxMTQsMTExLDExOSw1OSwxLDEwNTMzLDk3LDExNCwxMTEsMTE5LDU5LDEsMTA1MzQsNCw1LDk3LDEwOSwxMTEsMTEyLDExNCwxMDc5OCwxMDgwMywxMDgwOSwxMDgzOSwxMDg0NCwxMTQsMTE0LDU5LDEsODcwMywxMTYsMTA0LDExNiw1OSwxLDg3NjMsMTA3LDQsMiwxMDgsMTE0LDEwODE2LDEwODI3LDEwMSwxMDIsMTE2LDk3LDExNCwxMTQsMTExLDExOSw1OSwxLDg2MTcsMTA1LDEwMywxMDQsMTE2LDk3LDExNCwxMTQsMTExLDExOSw1OSwxLDg2MTgsMTAyLDU5LDMsNTUzNDksNTY2NjUsOTgsOTcsMTE0LDU5LDEsODIxMyw0LDMsOTksMTA4LDExNiwxMDg1OCwxMDg2MywxMDg2OSwxMTQsNTksMyw1NTM0OSw1NjUwOSw5NywxMTUsMTA0LDU5LDEsODQ2MywxMTQsMTExLDEwNyw1OSwxLDI5NSw0LDIsOTgsMTEyLDEwODgxLDEwODg3LDExNywxMDgsMTA4LDU5LDEsODI1OSwxMDQsMTAxLDExMCw1OSwxLDgyMDgsNCwxNSw5Nyw5OSwxMDEsMTAyLDEwMywxMDUsMTA2LDEwOSwxMTAsMTExLDExMiwxMTMsMTE1LDExNiwxMTcsMTA5MjUsMTA5MzYsMTA5NTgsMTA5NzcsMTA5OTAsMTEwMDEsMTEwMzksMTEwNDUsMTExMDEsMTExOTIsMTEyMjAsMTEyMjYsMTEyMzcsMTEyODUsMTEyOTksOTksMTE3LDExNiwxMDEsNSwyMzcsMSw1OSwxMDkzNCwxLDIzNyw0LDMsNTksMTA1LDEyMSwxMDk0NCwxMDk0NiwxMDk1NSwxLDgyOTEsMTE0LDk5LDUsMjM4LDEsNTksMTA5NTMsMSwyMzgsNTksMSwxMDgwLDQsMiw5OSwxMjAsMTA5NjQsMTA5NjgsMTIxLDU5LDEsMTA3Nyw5OSwxMDgsNSwxNjEsMSw1OSwxMDk3NSwxLDE2MSw0LDIsMTAyLDExNCwxMDk4MywxMDk4Niw1OSwxLDg2NjAsNTksMyw1NTM0OSw1NjYxNCwxMTQsOTcsMTE4LDEwMSw1LDIzNiwxLDU5LDEwOTk5LDEsMjM2LDQsNCw1OSwxMDUsMTEwLDExMSwxMTAxMSwxMTAxMywxMTAyOCwxMTAzNCwxLDg1MjAsNCwyLDEwNSwxMTAsMTEwMTksMTEwMjQsMTEwLDExNiw1OSwxLDEwNzY0LDExNiw1OSwxLDg3NDksMTAyLDEwNSwxMTAsNTksMSwxMDcxNiwxMTYsOTcsNTksMSw4NDg5LDEwOCwxMDUsMTAzLDU5LDEsMzA3LDQsMyw5NywxMTEsMTEyLDExMDUzLDExMDkyLDExMDk2LDQsMyw5OSwxMDMsMTE2LDExMDYxLDExMDY1LDExMDg4LDExNCw1OSwxLDI5OSw0LDMsMTAxLDEwOCwxMTIsMTEwNzMsMTEwNzYsMTEwODIsNTksMSw4NDY1LDEwNSwxMTAsMTAxLDU5LDEsODQ2NCw5NywxMTQsMTE2LDU5LDEsODQ2NSwxMDQsNTksMSwzMDUsMTAyLDU5LDEsODg4NywxMDEsMTAwLDU5LDEsNDM3LDQsNSw1OSw5OSwxMDIsMTExLDExNiwxMTExMywxMTExNSwxMTEyMSwxMTEzNiwxMTE0MiwxLDg3MTIsOTcsMTE0LDEwMSw1OSwxLDg0NTMsMTA1LDExMCw0LDIsNTksMTE2LDExMTI5LDExMTMxLDEsODczNCwxMDUsMTAxLDU5LDEsMTA3MTcsMTAwLDExMSwxMTYsNTksMSwzMDUsNCw1LDU5LDk5LDEwMSwxMDgsMTEyLDExMTU0LDExMTU2LDExMTYxLDExMTc5LDExMTg2LDEsODc0Nyw5NywxMDgsNTksMSw4ODkwLDQsMiwxMDMsMTE0LDExMTY3LDExMTczLDEwMSwxMTQsMTE1LDU5LDEsODQ4NCw5OSw5NywxMDgsNTksMSw4ODkwLDk3LDExNCwxMDQsMTA3LDU5LDEsMTA3NzUsMTE0LDExMSwxMDAsNTksMSwxMDgxMiw0LDQsOTksMTAzLDExMiwxMTYsMTEyMDIsMTEyMDYsMTEyMTEsMTEyMTYsMTIxLDU5LDEsMTEwNSwxMTEsMTEwLDU5LDEsMzAzLDEwMiw1OSwzLDU1MzQ5LDU2NjY2LDk3LDU5LDEsOTUzLDExNCwxMTEsMTAwLDU5LDEsMTA4MTIsMTE3LDEwMSwxMTUsMTE2LDUsMTkxLDEsNTksMTEyMzUsMSwxOTEsNCwyLDk5LDEwNSwxMTI0MywxMTI0OCwxMTQsNTksMyw1NTM0OSw1NjUxMCwxMTAsNCw1LDU5LDY5LDEwMCwxMTUsMTE4LDExMjYxLDExMjYzLDExMjY2LDExMjcxLDExMjgyLDEsODcxMiw1OSwxLDg5NTMsMTExLDExNiw1OSwxLDg5NDksNCwyLDU5LDExOCwxMTI3NywxMTI3OSwxLDg5NDgsNTksMSw4OTQ3LDU5LDEsODcxMiw0LDIsNTksMTA1LDExMjkxLDExMjkzLDEsODI5MCwxMDgsMTAwLDEwMSw1OSwxLDI5Nyw0LDIsMTA3LDEwOSwxMTMwNSwxMTMxMCw5OSwxMjEsNTksMSwxMTEwLDEwOCw1LDIzOSwxLDU5LDExMzE2LDEsMjM5LDQsNiw5OSwxMDIsMTA5LDExMSwxMTUsMTE3LDExMzMyLDExMzQ2LDExMzUxLDExMzU3LDExMzYzLDExMzgwLDQsMiwxMDUsMTIxLDExMzM4LDExMzQzLDExNCw5OSw1OSwxLDMwOSw1OSwxLDEwODEsMTE0LDU5LDMsNTUzNDksNTY2MTUsOTcsMTE2LDEwNCw1OSwxLDU2NywxMTIsMTAyLDU5LDMsNTUzNDksNTY2NjcsNCwyLDk5LDEwMSwxMTM2OSwxMTM3NCwxMTQsNTksMyw1NTM0OSw1NjUxMSwxMTQsOTksMTIxLDU5LDEsMTExMiwxMDcsOTksMTIxLDU5LDEsMTEwOCw0LDgsOTcsOTksMTAyLDEwMywxMDQsMTA2LDExMSwxMTUsMTE0MDQsMTE0MTgsMTE0MzMsMTE0MzgsMTE0NDUsMTE0NTAsMTE0NTUsMTE0NjEsMTEyLDExMiw5Nyw0LDIsNTksMTE4LDExNDEzLDExNDE1LDEsOTU0LDU5LDEsMTAwOCw0LDIsMTAxLDEyMSwxMTQyNCwxMTQzMCwxMDAsMTA1LDEwOCw1OSwxLDMxMSw1OSwxLDEwODIsMTE0LDU5LDMsNTUzNDksNTY2MTYsMTE0LDEwMSwxMDEsMTEwLDU5LDEsMzEyLDk5LDEyMSw1OSwxLDEwOTMsOTksMTIxLDU5LDEsMTExNiwxMTIsMTAyLDU5LDMsNTUzNDksNTY2NjgsOTksMTE0LDU5LDMsNTUzNDksNTY1MTIsNCwyMyw2NSw2Niw2OSw3Miw5Nyw5OCw5OSwxMDAsMTAxLDEwMiwxMDMsMTA0LDEwNiwxMDgsMTA5LDExMCwxMTEsMTEyLDExNCwxMTUsMTE2LDExNywxMTgsMTE1MTUsMTE1MzgsMTE1NDQsMTE1NTUsMTE1NjAsMTE3MjEsMTE3ODAsMTE4MTgsMTE4NjgsMTIxMzYsMTIxNjAsMTIxNzEsMTIyMDMsMTIyMDgsMTIyNDYsMTIyNzUsMTIzMjcsMTI1MDksMTI1MjMsMTI1NjksMTI2NDEsMTI3MzIsMTI3NTIsNCwzLDk3LDExNCwxMTYsMTE1MjMsMTE1MjgsMTE1MzIsMTE0LDExNCw1OSwxLDg2NjYsMTE0LDU5LDEsODY1Niw5NywxMDUsMTA4LDU5LDEsMTA1MjMsOTcsMTE0LDExNCw1OSwxLDEwNTEwLDQsMiw1OSwxMDMsMTE1NTAsMTE1NTIsMSw4ODA2LDU5LDEsMTA4OTEsOTcsMTE0LDU5LDEsMTA1OTQsNCw5LDk5LDEwMSwxMDMsMTA5LDExMCwxMTIsMTEzLDExNCwxMTYsMTE1ODAsMTE1ODYsMTE1OTQsMTE2MDAsMTE2MDYsMTE2MjQsMTE2MjcsMTE2MzYsMTE2OTQsMTE3LDExNiwxMDEsNTksMSwzMTQsMTA5LDExMiwxMTYsMTIxLDExOCw1OSwxLDEwNjc2LDExNCw5NywxMTAsNTksMSw4NDY2LDk4LDEwMCw5Nyw1OSwxLDk1NSwxMDMsNCwzLDU5LDEwMCwxMDgsMTE2MTUsMTE2MTcsMTE2MjAsMSwxMDIxNiw1OSwxLDEwNjQxLDEwMSw1OSwxLDEwMjE2LDU5LDEsMTA4ODUsMTE3LDExMSw1LDE3MSwxLDU5LDExNjM0LDEsMTcxLDExNCw0LDgsNTksOTgsMTAyLDEwNCwxMDgsMTEyLDExNSwxMTYsMTE2NTUsMTE2NTcsMTE2NjksMTE2NzMsMTE2NzcsMTE2ODEsMTE2ODUsMTE2OTAsMSw4NTkyLDQsMiw1OSwxMDIsMTE2NjMsMTE2NjUsMSw4Njc2LDExNSw1OSwxLDEwNTI3LDExNSw1OSwxLDEwNTI1LDEwNyw1OSwxLDg2MTcsMTEyLDU5LDEsODYxOSwxMDgsNTksMSwxMDU1MywxMDUsMTA5LDU5LDEsMTA2MTEsMTA4LDU5LDEsODYxMCw0LDMsNTksOTcsMTAxLDExNzAyLDExNzA0LDExNzA5LDEsMTA5MjMsMTA1LDEwOCw1OSwxLDEwNTIxLDQsMiw1OSwxMTUsMTE3MTUsMTE3MTcsMSwxMDkyNSw1OSwzLDEwOTI1LDY1MDI0LDQsMyw5Nyw5OCwxMTQsMTE3MjksMTE3MzQsMTE3MzksMTE0LDExNCw1OSwxLDEwNTA4LDExNCwxMDcsNTksMSwxMDA5OCw0LDIsOTcsMTA3LDExNzQ1LDExNzU4LDk5LDQsMiwxMDEsMTA3LDExNzUyLDExNzU1LDU5LDEsMTIzLDU5LDEsOTEsNCwyLDEwMSwxMTUsMTE3NjQsMTE3NjcsNTksMSwxMDYzNSwxMDgsNCwyLDEwMCwxMTcsMTE3NzQsMTE3NzcsNTksMSwxMDYzOSw1OSwxLDEwNjM3LDQsNCw5NywxMDEsMTE3LDEyMSwxMTc5MCwxMTc5NiwxMTgxMSwxMTgxNSwxMTQsMTExLDExMCw1OSwxLDMxOCw0LDIsMTAwLDEwNSwxMTgwMiwxMTgwNywxMDUsMTA4LDU5LDEsMzE2LDEwOCw1OSwxLDg5NjgsOTgsNTksMSwxMjMsNTksMSwxMDgzLDQsNCw5OSwxMTMsMTE0LDExNSwxMTgyOCwxMTgzMiwxMTg0NSwxMTg2NCw5Nyw1OSwxLDEwNTUwLDExNywxMTEsNCwyLDU5LDExNCwxMTg0MCwxMTg0MiwxLDgyMjAsNTksMSw4MjIyLDQsMiwxMDAsMTE3LDExODUxLDExODU3LDEwNCw5NywxMTQsNTksMSwxMDU5OSwxMTUsMTA0LDk3LDExNCw1OSwxLDEwNTcxLDEwNCw1OSwxLDg2MjYsNCw1LDU5LDEwMiwxMDMsMTEzLDExNSwxMTg4MCwxMTg4MiwxMjAwOCwxMjAxMSwxMjAzMSwxLDg4MDQsMTE2LDQsNSw5NywxMDQsMTA4LDExNCwxMTYsMTE4OTUsMTE5MTMsMTE5MzUsMTE5NDcsMTE5OTYsMTE0LDExNCwxMTEsMTE5LDQsMiw1OSwxMTYsMTE5MDUsMTE5MDcsMSw4NTkyLDk3LDEwNSwxMDgsNTksMSw4NjEwLDk3LDExNCwxMTIsMTExLDExMSwxMTAsNCwyLDEwMCwxMTcsMTE5MjUsMTE5MzEsMTExLDExOSwxMTAsNTksMSw4NjM3LDExMiw1OSwxLDg2MzYsMTAxLDEwMiwxMTYsOTcsMTE0LDExNCwxMTEsMTE5LDExNSw1OSwxLDg2NDcsMTA1LDEwMywxMDQsMTE2LDQsMyw5NywxMDQsMTE1LDExOTU5LDExOTc0LDExOTg0LDExNCwxMTQsMTExLDExOSw0LDIsNTksMTE1LDExOTY5LDExOTcxLDEsODU5Niw1OSwxLDg2NDYsOTcsMTE0LDExMiwxMTEsMTExLDExMCwxMTUsNTksMSw4NjUxLDExMywxMTcsMTA1LDEwMyw5NywxMTQsMTE0LDExMSwxMTksNTksMSw4NjIxLDEwNCwxMTQsMTAxLDEwMSwxMTYsMTA1LDEwOSwxMDEsMTE1LDU5LDEsODkwNyw1OSwxLDg5MjIsNCwzLDU5LDExMywxMTUsMTIwMTksMTIwMjEsMTIwMjQsMSw4ODA0LDU5LDEsODgwNiwxMDgsOTcsMTEwLDExNiw1OSwxLDEwODc3LDQsNSw1OSw5OSwxMDAsMTAzLDExNSwxMjA0MywxMjA0NSwxMjA0OSwxMjA3MCwxMjA4MywxLDEwODc3LDk5LDU5LDEsMTA5MjAsMTExLDExNiw0LDIsNTksMTExLDEyMDU3LDEyMDU5LDEsMTA4NzksNCwyLDU5LDExNCwxMjA2NSwxMjA2NywxLDEwODgxLDU5LDEsMTA4ODMsNCwyLDU5LDEwMSwxMjA3NiwxMjA3OSwzLDg5MjIsNjUwMjQsMTE1LDU5LDEsMTA4OTksNCw1LDk3LDEwMCwxMDEsMTAzLDExNSwxMjA5NSwxMjEwMywxMjEwOCwxMjEyNiwxMjEzMSwxMTIsMTEyLDExNCwxMTEsMTIwLDU5LDEsMTA4ODUsMTExLDExNiw1OSwxLDg5MTgsMTEzLDQsMiwxMDMsMTEzLDEyMTE1LDEyMTIwLDExNiwxMTQsNTksMSw4OTIyLDEwMywxMTYsMTE0LDU5LDEsMTA4OTEsMTE2LDExNCw1OSwxLDg4MjIsMTA1LDEwOSw1OSwxLDg4MTgsNCwzLDEwNSwxMDgsMTE0LDEyMTQ0LDEyMTUwLDEyMTU2LDExNSwxMDQsMTE2LDU5LDEsMTA2MjAsMTExLDExMSwxMTQsNTksMSw4OTcwLDU5LDMsNTUzNDksNTY2MTcsNCwyLDU5LDY5LDEyMTY2LDEyMTY4LDEsODgyMiw1OSwxLDEwODk3LDQsMiw5Nyw5OCwxMjE3NywxMjE5OCwxMTQsNCwyLDEwMCwxMTcsMTIxODQsMTIxODcsNTksMSw4NjM3LDQsMiw1OSwxMDgsMTIxOTMsMTIxOTUsMSw4NjM2LDU5LDEsMTA2MDIsMTA4LDEwNyw1OSwxLDk2MDQsOTksMTIxLDU5LDEsMTExMyw0LDUsNTksOTcsOTksMTA0LDExNiwxMjIyMCwxMjIyMiwxMjIyNywxMjIzNSwxMjI0MSwxLDg4MTAsMTE0LDExNCw1OSwxLDg2NDcsMTExLDExNCwxMTAsMTAxLDExNCw1OSwxLDg5OTAsOTcsMTE0LDEwMCw1OSwxLDEwNjAzLDExNCwxMDUsNTksMSw5NzIyLDQsMiwxMDUsMTExLDEyMjUyLDEyMjU4LDEwMCwxMTEsMTE2LDU5LDEsMzIwLDExNywxMTUsMTE2LDQsMiw1OSw5NywxMjI2NywxMjI2OSwxLDkxMzYsOTksMTA0LDEwMSw1OSwxLDkxMzYsNCw0LDY5LDk3LDEwMSwxMTUsMTIyODUsMTIyODgsMTIzMDMsMTIzMjIsNTksMSw4ODA4LDExMiw0LDIsNTksMTEyLDEyMjk1LDEyMjk3LDEsMTA4ODksMTE0LDExMSwxMjAsNTksMSwxMDg4OSw0LDIsNTksMTEzLDEyMzA5LDEyMzExLDEsMTA4ODcsNCwyLDU5LDExMywxMjMxNywxMjMxOSwxLDEwODg3LDU5LDEsODgwOCwxMDUsMTA5LDU5LDEsODkzNCw0LDgsOTcsOTgsMTEwLDExMSwxMTIsMTE2LDExOSwxMjIsMTIzNDUsMTIzNTksMTIzNjQsMTI0MjEsMTI0NDYsMTI0NjcsMTI0NzQsMTI0OTAsNCwyLDExMCwxMTQsMTIzNTEsMTIzNTUsMTAzLDU5LDEsMTAyMjAsMTE0LDU5LDEsODcwMSwxMTQsMTA3LDU5LDEsMTAyMTQsMTAzLDQsMywxMDgsMTA5LDExNCwxMjM3MywxMjQwMSwxMjQwOSwxMDEsMTAyLDExNiw0LDIsOTcsMTE0LDEyMzgyLDEyMzg5LDExNCwxMTQsMTExLDExOSw1OSwxLDEwMjI5LDEwNSwxMDMsMTA0LDExNiw5NywxMTQsMTE0LDExMSwxMTksNTksMSwxMDIzMSw5NywxMTIsMTE1LDExNiwxMTEsNTksMSwxMDIzNiwxMDUsMTAzLDEwNCwxMTYsOTcsMTE0LDExNCwxMTEsMTE5LDU5LDEsMTAyMzAsMTEyLDk3LDExNCwxMTQsMTExLDExOSw0LDIsMTA4LDExNCwxMjQzMywxMjQzOSwxMDEsMTAyLDExNiw1OSwxLDg2MTksMTA1LDEwMywxMDQsMTE2LDU5LDEsODYyMCw0LDMsOTcsMTAyLDEwOCwxMjQ1NCwxMjQ1OCwxMjQ2MiwxMTQsNTksMSwxMDYyOSw1OSwzLDU1MzQ5LDU2NjY5LDExNywxMTUsNTksMSwxMDc5NywxMDUsMTA5LDEwMSwxMTUsNTksMSwxMDgwNCw0LDIsOTcsOTgsMTI0ODAsMTI0ODUsMTE1LDExNiw1OSwxLDg3MjcsOTcsMTE0LDU5LDEsOTUsNCwzLDU5LDEwMSwxMDIsMTI0OTgsMTI1MDAsMTI1MDYsMSw5Njc0LDExMCwxMDMsMTAxLDU5LDEsOTY3NCw1OSwxLDEwNzMxLDk3LDExNCw0LDIsNTksMTA4LDEyNTE3LDEyNTE5LDEsNDAsMTE2LDU5LDEsMTA2NDMsNCw1LDk3LDk5LDEwNCwxMDksMTE2LDEyNTM1LDEyNTQwLDEyNTQ4LDEyNTYxLDEyNTY0LDExNCwxMTQsNTksMSw4NjQ2LDExMSwxMTQsMTEwLDEwMSwxMTQsNTksMSw4OTkxLDk3LDExNCw0LDIsNTksMTAwLDEyNTU2LDEyNTU4LDEsODY1MSw1OSwxLDEwNjA1LDU5LDEsODIwNiwxMTQsMTA1LDU5LDEsODg5NSw0LDYsOTcsOTksMTA0LDEwNSwxMTMsMTE2LDEyNTgzLDEyNTg5LDEyNTk0LDEyNTk3LDEyNjE0LDEyNjM1LDExMywxMTcsMTExLDU5LDEsODI0OSwxMTQsNTksMyw1NTM0OSw1NjUxMyw1OSwxLDg2MjQsMTA5LDQsMyw1OSwxMDEsMTAzLDEyNjA2LDEyNjA4LDEyNjExLDEsODgxOCw1OSwxLDEwODkzLDU5LDEsMTA4OTUsNCwyLDk4LDExNywxMjYyMCwxMjYyMyw1OSwxLDkxLDExMSw0LDIsNTksMTE0LDEyNjMwLDEyNjMyLDEsODIxNiw1OSwxLDgyMTgsMTE0LDExMSwxMDcsNTksMSwzMjIsNSw2MCw4LDU5LDk5LDEwMCwxMDQsMTA1LDEwOCwxMTMsMTE0LDEyNjYwLDEyNjYyLDEyNjc1LDEyNjgwLDEyNjg2LDEyNjkyLDEyNjk4LDEyNzA1LDEsNjAsNCwyLDk5LDEwNSwxMjY2OCwxMjY3MSw1OSwxLDEwOTE4LDExNCw1OSwxLDEwODczLDExMSwxMTYsNTksMSw4OTE4LDExNCwxMDEsMTAxLDU5LDEsODkwNywxMDksMTAxLDExNSw1OSwxLDg5MDUsOTcsMTE0LDExNCw1OSwxLDEwNjE0LDExNywxMDEsMTE1LDExNiw1OSwxLDEwODc1LDQsMiw4MCwxMDUsMTI3MTEsMTI3MTYsOTcsMTE0LDU5LDEsMTA2NDYsNCwzLDU5LDEwMSwxMDIsMTI3MjQsMTI3MjYsMTI3MjksMSw5NjY3LDU5LDEsODg4NCw1OSwxLDk2NjYsMTE0LDQsMiwxMDAsMTE3LDEyNzM5LDEyNzQ2LDExNSwxMDQsOTcsMTE0LDU5LDEsMTA1NzAsMTA0LDk3LDExNCw1OSwxLDEwNTk4LDQsMiwxMDEsMTEwLDEyNzU4LDEyNzY4LDExNCwxMTYsMTEwLDEwMSwxMTMsMTEzLDU5LDMsODgwOCw2NTAyNCw2OSw1OSwzLDg4MDgsNjUwMjQsNCwxNCw2OCw5Nyw5OSwxMDAsMTAxLDEwMiwxMDQsMTA1LDEwOCwxMTAsMTExLDExMiwxMTUsMTE3LDEyODAzLDEyODA5LDEyODkzLDEyOTA4LDEyOTE0LDEyOTI4LDEyOTMzLDEyOTM3LDEzMDExLDEzMDI1LDEzMDMyLDEzMDQ5LDEzMDUyLDEzMDY5LDY4LDExMSwxMTYsNTksMSw4NzYyLDQsNCw5OSwxMDgsMTEyLDExNCwxMjgxOSwxMjgyNywxMjg0OSwxMjg4NywxMTQsNSwxNzUsMSw1OSwxMjgyNSwxLDE3NSw0LDIsMTAxLDExNiwxMjgzMywxMjgzNiw1OSwxLDk3OTQsNCwyLDU5LDEwMSwxMjg0MiwxMjg0NCwxLDEwMDE2LDExNSwxMDEsNTksMSwxMDAxNiw0LDIsNTksMTE1LDEyODU1LDEyODU3LDEsODYxNCwxMTYsMTExLDQsNCw1OSwxMDAsMTA4LDExNywxMjg2OSwxMjg3MSwxMjg3NywxMjg4MywxLDg2MTQsMTExLDExOSwxMTAsNTksMSw4NjE1LDEwMSwxMDIsMTE2LDU5LDEsODYxMiwxMTIsNTksMSw4NjEzLDEwNywxMDEsMTE0LDU5LDEsOTY0Niw0LDIsMTExLDEyMSwxMjg5OSwxMjkwNSwxMDksMTA5LDk3LDU5LDEsMTA3OTMsNTksMSwxMDg0LDk3LDExNSwxMDQsNTksMSw4MjEyLDk3LDExNSwxMTcsMTE0LDEwMSwxMDAsOTcsMTEwLDEwMywxMDgsMTAxLDU5LDEsODczNywxMTQsNTksMyw1NTM0OSw1NjYxOCwxMTEsNTksMSw4NDg3LDQsMyw5OSwxMDAsMTEwLDEyOTQ1LDEyOTU0LDEyOTg1LDExNCwxMTEsNSwxODEsMSw1OSwxMjk1MiwxLDE4MSw0LDQsNTksOTcsOTksMTAwLDEyOTY0LDEyOTY2LDEyOTcxLDEyOTc2LDEsODczOSwxMTUsMTE2LDU5LDEsNDIsMTA1LDExNCw1OSwxLDEwOTkyLDExMSwxMTYsNSwxODMsMSw1OSwxMjk4MywxLDE4MywxMTcsMTE1LDQsMyw1OSw5OCwxMDAsMTI5OTUsMTI5OTcsMTMwMDAsMSw4NzIyLDU5LDEsODg2Myw0LDIsNTksMTE3LDEzMDA2LDEzMDA4LDEsODc2MCw1OSwxLDEwNzk0LDQsMiw5OSwxMDAsMTMwMTcsMTMwMjEsMTEyLDU5LDEsMTA5NzEsMTE0LDU5LDEsODIzMCwxMTIsMTA4LDExNywxMTUsNTksMSw4NzIzLDQsMiwxMDAsMTEyLDEzMDM4LDEzMDQ0LDEwMSwxMDgsMTE1LDU5LDEsODg3MSwxMDIsNTksMyw1NTM0OSw1NjY3MCw1OSwxLDg3MjMsNCwyLDk5LDExNiwxMzA1OCwxMzA2MywxMTQsNTksMyw1NTM0OSw1NjUxNCwxMTIsMTExLDExNSw1OSwxLDg3NjYsNCwzLDU5LDEwOCwxMDksMTMwNzcsMTMwNzksMTMwODcsMSw5NTYsMTE2LDEwNSwxMDksOTcsMTEyLDU5LDEsODg4OCw5NywxMTIsNTksMSw4ODg4LDQsMjQsNzEsNzYsODIsODYsOTcsOTgsOTksMTAwLDEwMSwxMDIsMTAzLDEwNCwxMDUsMTA2LDEwOCwxMDksMTExLDExMiwxMTQsMTE1LDExNiwxMTcsMTE4LDExOSwxMzE0MiwxMzE2NSwxMzIxNywxMzIyOSwxMzI0NywxMzMzMCwxMzM1OSwxMzQxNCwxMzQyMCwxMzUwOCwxMzUxMywxMzU3OSwxMzYwMiwxMzYyNiwxMzYzMSwxMzc2MiwxMzc2NywxMzg1NSwxMzkzNiwxMzk5NSwxNDIxNCwxNDI4NSwxNDMxMiwxNDQzMiw0LDIsMTAzLDExNiwxMzE0OCwxMzE1Miw1OSwzLDg5MjEsODI0LDQsMiw1OSwxMTgsMTMxNTgsMTMxNjEsMyw4ODExLDg0MDIsNTksMyw4ODExLDgyNCw0LDMsMTAxLDEwOCwxMTYsMTMxNzMsMTMyMDAsMTMyMDQsMTAyLDExNiw0LDIsOTcsMTE0LDEzMTgxLDEzMTg4LDExNCwxMTQsMTExLDExOSw1OSwxLDg2NTMsMTA1LDEwMywxMDQsMTE2LDk3LDExNCwxMTQsMTExLDExOSw1OSwxLDg2NTQsNTksMyw4OTIwLDgyNCw0LDIsNTksMTE4LDEzMjEwLDEzMjEzLDMsODgxMCw4NDAyLDU5LDMsODgxMCw4MjQsMTA1LDEwMywxMDQsMTE2LDk3LDExNCwxMTQsMTExLDExOSw1OSwxLDg2NTUsNCwyLDY4LDEwMCwxMzIzNSwxMzI0MSw5NywxMTUsMTA0LDU5LDEsODg3OSw5NywxMTUsMTA0LDU5LDEsODg3OCw0LDUsOTgsOTksMTEwLDExMiwxMTYsMTMyNTksMTMyNjQsMTMyNzAsMTMyNzUsMTMzMDgsMTA4LDk3LDU5LDEsODcxMSwxMTcsMTE2LDEwMSw1OSwxLDMyNCwxMDMsNTksMyw4NzM2LDg0MDIsNCw1LDU5LDY5LDEwNSwxMTEsMTEyLDEzMjg3LDEzMjg5LDEzMjkzLDEzMjk4LDEzMzAyLDEsODc3Nyw1OSwzLDEwODY0LDgyNCwxMDAsNTksMyw4Nzc5LDgyNCwxMTUsNTksMSwzMjksMTE0LDExMSwxMjAsNTksMSw4Nzc3LDExNywxMTQsNCwyLDU5LDk3LDEzMzE2LDEzMzE4LDEsOTgzOCwxMDgsNCwyLDU5LDExNSwxMzMyNSwxMzMyNywxLDk4MzgsNTksMSw4NDY5LDQsMiwxMTUsMTE3LDEzMzM2LDEzMzQ0LDExMiw1LDE2MCwxLDU5LDEzMzQyLDEsMTYwLDEwOSwxMTIsNCwyLDU5LDEwMSwxMzM1MiwxMzM1NSwzLDg3ODIsODI0LDU5LDMsODc4Myw4MjQsNCw1LDk3LDEwMSwxMTEsMTE3LDEyMSwxMzM3MSwxMzM4NSwxMzM5MSwxMzQwNywxMzQxMSw0LDIsMTEyLDExNCwxMzM3NywxMzM4MCw1OSwxLDEwODE5LDExMSwxMTAsNTksMSwzMjgsMTAwLDEwNSwxMDgsNTksMSwzMjYsMTEwLDEwMyw0LDIsNTksMTAwLDEzMzk5LDEzNDAxLDEsODc3NSwxMTEsMTE2LDU5LDMsMTA4NjEsODI0LDExMiw1OSwxLDEwODE4LDU5LDEsMTA4NSw5NywxMTUsMTA0LDU5LDEsODIxMSw0LDcsNTksNjUsOTcsMTAwLDExMywxMTUsMTIwLDEzNDM2LDEzNDM4LDEzNDQzLDEzNDY2LDEzNDcyLDEzNDc4LDEzNDk0LDEsODgwMCwxMTQsMTE0LDU5LDEsODY2MywxMTQsNCwyLDEwNCwxMTQsMTM0NTAsMTM0NTQsMTA3LDU5LDEsMTA1MzIsNCwyLDU5LDExMSwxMzQ2MCwxMzQ2MiwxLDg1OTksMTE5LDU5LDEsODU5OSwxMTEsMTE2LDU5LDMsODc4NCw4MjQsMTE3LDEwNSwxMTgsNTksMSw4ODAyLDQsMiwxMDEsMTA1LDEzNDg0LDEzNDg5LDk3LDExNCw1OSwxLDEwNTM2LDEwOSw1OSwzLDg3NzAsODI0LDEwNSwxMTUsMTE2LDQsMiw1OSwxMTUsMTM1MDMsMTM1MDUsMSw4NzA4LDU5LDEsODcwOCwxMTQsNTksMyw1NTM0OSw1NjYxOSw0LDQsNjksMTAxLDExNSwxMTYsMTM1MjMsMTM1MjcsMTM1NjMsMTM1NjgsNTksMyw4ODA3LDgyNCw0LDMsNTksMTEzLDExNSwxMzUzNSwxMzUzNywxMzU1OSwxLDg4MTcsNCwzLDU5LDExMywxMTUsMTM1NDUsMTM1NDcsMTM1NTEsMSw4ODE3LDU5LDMsODgwNyw4MjQsMTA4LDk3LDExMCwxMTYsNTksMywxMDg3OCw4MjQsNTksMywxMDg3OCw4MjQsMTA1LDEwOSw1OSwxLDg4MjEsNCwyLDU5LDExNCwxMzU3NCwxMzU3NiwxLDg4MTUsNTksMSw4ODE1LDQsMyw2NSw5NywxMTIsMTM1ODcsMTM1OTIsMTM1OTcsMTE0LDExNCw1OSwxLDg2NTQsMTE0LDExNCw1OSwxLDg2MjIsOTcsMTE0LDU5LDEsMTA5OTQsNCwzLDU5LDExNSwxMTgsMTM2MTAsMTM2MTIsMTM2MjMsMSw4NzE1LDQsMiw1OSwxMDAsMTM2MTgsMTM2MjAsMSw4OTU2LDU5LDEsODk1NCw1OSwxLDg3MTUsOTksMTIxLDU5LDEsMTExNCw0LDcsNjUsNjksOTcsMTAwLDEwMSwxMTUsMTE2LDEzNjQ3LDEzNjUyLDEzNjU2LDEzNjYxLDEzNjY1LDEzNzM3LDEzNzQyLDExNCwxMTQsNTksMSw4NjUzLDU5LDMsODgwNiw4MjQsMTE0LDExNCw1OSwxLDg2MDIsMTE0LDU5LDEsODIyOSw0LDQsNTksMTAyLDExMywxMTUsMTM2NzUsMTM2NzcsMTM3MDMsMTM3MjUsMSw4ODE2LDExNiw0LDIsOTcsMTE0LDEzNjg0LDEzNjkxLDExNCwxMTQsMTExLDExOSw1OSwxLDg2MDIsMTA1LDEwMywxMDQsMTE2LDk3LDExNCwxMTQsMTExLDExOSw1OSwxLDg2MjIsNCwzLDU5LDExMywxMTUsMTM3MTEsMTM3MTMsMTM3MTcsMSw4ODE2LDU5LDMsODgwNiw4MjQsMTA4LDk3LDExMCwxMTYsNTksMywxMDg3Nyw4MjQsNCwyLDU5LDExNSwxMzczMSwxMzczNCwzLDEwODc3LDgyNCw1OSwxLDg4MTQsMTA1LDEwOSw1OSwxLDg4MjAsNCwyLDU5LDExNCwxMzc0OCwxMzc1MCwxLDg4MTQsMTA1LDQsMiw1OSwxMDEsMTM3NTcsMTM3NTksMSw4OTM4LDU5LDEsODk0MCwxMDUsMTAwLDU5LDEsODc0MCw0LDIsMTEyLDExNiwxMzc3MywxMzc3OCwxMDIsNTksMyw1NTM0OSw1NjY3MSw1LDE3MiwzLDU5LDEwNSwxMTAsMTM3ODcsMTM3ODksMTM4MjksMSwxNzIsMTEwLDQsNCw1OSw2OSwxMDAsMTE4LDEzODAwLDEzODAyLDEzODA2LDEzODEyLDEsODcxMyw1OSwzLDg5NTMsODI0LDExMSwxMTYsNTksMyw4OTQ5LDgyNCw0LDMsOTcsOTgsOTksMTM4MjAsMTM4MjMsMTM4MjYsNTksMSw4NzEzLDU5LDEsODk1MSw1OSwxLDg5NTAsMTA1LDQsMiw1OSwxMTgsMTM4MzYsMTM4MzgsMSw4NzE2LDQsMyw5Nyw5OCw5OSwxMzg0NiwxMzg0OSwxMzg1Miw1OSwxLDg3MTYsNTksMSw4OTU4LDU5LDEsODk1Nyw0LDMsOTcsMTExLDExNCwxMzg2MywxMzg5MiwxMzg5OSwxMTQsNCw0LDU5LDk3LDExNSwxMTYsMTM4NzQsMTM4NzYsMTM4ODMsMTM4ODgsMSw4NzQyLDEwOCwxMDgsMTAxLDEwOCw1OSwxLDg3NDIsMTA4LDU5LDMsMTEwMDUsODQyMSw1OSwzLDg3MDYsODI0LDEwOCwxMDUsMTEwLDExNiw1OSwxLDEwNzcyLDQsMyw1OSw5OSwxMDEsMTM5MDcsMTM5MDksMTM5MTQsMSw4ODMyLDExNywxMDEsNTksMSw4OTI4LDQsMiw1OSw5OSwxMzkyMCwxMzkyMywzLDEwOTI3LDgyNCw0LDIsNTksMTAxLDEzOTI5LDEzOTMxLDEsODgzMiwxMTMsNTksMywxMDkyNyw4MjQsNCw0LDY1LDk3LDEwNSwxMTYsMTM5NDYsMTM5NTEsMTM5NzEsMTM5ODIsMTE0LDExNCw1OSwxLDg2NTUsMTE0LDExNCw0LDMsNTksOTksMTE5LDEzOTYxLDEzOTYzLDEzOTY3LDEsODYwMyw1OSwzLDEwNTQ3LDgyNCw1OSwzLDg2MDUsODI0LDEwMywxMDQsMTE2LDk3LDExNCwxMTQsMTExLDExOSw1OSwxLDg2MDMsMTE0LDEwNSw0LDIsNTksMTAxLDEzOTkwLDEzOTkyLDEsODkzOSw1OSwxLDg5NDEsNCw3LDk5LDEwNCwxMDUsMTA5LDExMiwxMTMsMTE3LDE0MDExLDE0MDM2LDE0MDYwLDE0MDgwLDE0MDg1LDE0MDkwLDE0MTA2LDQsNCw1OSw5OSwxMDEsMTE0LDE0MDIxLDE0MDIzLDE0MDI4LDE0MDMyLDEsODgzMywxMTcsMTAxLDU5LDEsODkyOSw1OSwzLDEwOTI4LDgyNCw1OSwzLDU1MzQ5LDU2NTE1LDExMSwxMTQsMTE2LDQsMiwxMDksMTEyLDE0MDQ1LDE0MDUwLDEwNSwxMDAsNTksMSw4NzQwLDk3LDExNCw5NywxMDgsMTA4LDEwMSwxMDgsNTksMSw4NzQyLDEwOSw0LDIsNTksMTAxLDE0MDY3LDE0MDY5LDEsODc2OSw0LDIsNTksMTEzLDE0MDc1LDE0MDc3LDEsODc3Miw1OSwxLDg3NzIsMTA1LDEwMCw1OSwxLDg3NDAsOTcsMTE0LDU5LDEsODc0MiwxMTUsMTE3LDQsMiw5OCwxMTIsMTQwOTgsMTQxMDIsMTAxLDU5LDEsODkzMCwxMDEsNTksMSw4OTMxLDQsMyw5OCw5OSwxMTIsMTQxMTQsMTQxNTcsMTQxNzEsNCw0LDU5LDY5LDEwMSwxMTUsMTQxMjQsMTQxMjYsMTQxMzAsMTQxMzMsMSw4ODM2LDU5LDMsMTA5NDksODI0LDU5LDEsODg0MCwxMDEsMTE2LDQsMiw1OSwxMDEsMTQxNDEsMTQxNDQsMyw4ODM0LDg0MDIsMTEzLDQsMiw1OSwxMTMsMTQxNTEsMTQxNTMsMSw4ODQwLDU5LDMsMTA5NDksODI0LDk5LDQsMiw1OSwxMDEsMTQxNjQsMTQxNjYsMSw4ODMzLDExMyw1OSwzLDEwOTI4LDgyNCw0LDQsNTksNjksMTAxLDExNSwxNDE4MSwxNDE4MywxNDE4NywxNDE5MCwxLDg4MzcsNTksMywxMDk1MCw4MjQsNTksMSw4ODQxLDEwMSwxMTYsNCwyLDU5LDEwMSwxNDE5OCwxNDIwMSwzLDg4MzUsODQwMiwxMTMsNCwyLDU5LDExMywxNDIwOCwxNDIxMCwxLDg4NDEsNTksMywxMDk1MCw4MjQsNCw0LDEwMywxMDUsMTA4LDExNCwxNDIyNCwxNDIyOCwxNDIzOCwxNDI0MiwxMDgsNTksMSw4ODI1LDEwOCwxMDAsMTAxLDUsMjQxLDEsNTksMTQyMzYsMSwyNDEsMTAzLDU5LDEsODgyNCwxMDUsOTcsMTEwLDEwMywxMDgsMTAxLDQsMiwxMDgsMTE0LDE0MjU0LDE0MjY5LDEwMSwxMDIsMTE2LDQsMiw1OSwxMDEsMTQyNjMsMTQyNjUsMSw4OTM4LDExMyw1OSwxLDg5NDAsMTA1LDEwMywxMDQsMTE2LDQsMiw1OSwxMDEsMTQyNzksMTQyODEsMSw4OTM5LDExMyw1OSwxLDg5NDEsNCwyLDU5LDEwOSwxNDI5MSwxNDI5MywxLDk1Nyw0LDMsNTksMTAxLDExNSwxNDMwMSwxNDMwMywxNDMwOCwxLDM1LDExNCwxMTEsNTksMSw4NDcwLDExMiw1OSwxLDgxOTksNCw5LDY4LDcyLDk3LDEwMCwxMDMsMTA1LDEwOCwxMTQsMTE1LDE0MzMyLDE0MzM4LDE0MzQ0LDE0MzQ5LDE0MzU1LDE0MzY5LDE0Mzc2LDE0NDA4LDE0NDI2LDk3LDExNSwxMDQsNTksMSw4ODc3LDk3LDExNCwxMTQsNTksMSwxMDUwMCwxMTIsNTksMyw4NzgxLDg0MDIsOTcsMTE1LDEwNCw1OSwxLDg4NzYsNCwyLDEwMSwxMTYsMTQzNjEsMTQzNjUsNTksMyw4ODA1LDg0MDIsNTksMyw2Miw4NDAyLDExMCwxMDIsMTA1LDExMCw1OSwxLDEwNzE4LDQsMyw2NSwxMDEsMTE2LDE0Mzg0LDE0Mzg5LDE0MzkzLDExNCwxMTQsNTksMSwxMDQ5OCw1OSwzLDg4MDQsODQwMiw0LDIsNTksMTE0LDE0Mzk5LDE0NDAyLDMsNjAsODQwMiwxMDUsMTAxLDU5LDMsODg4NCw4NDAyLDQsMiw2NSwxMTYsMTQ0MTQsMTQ0MTksMTE0LDExNCw1OSwxLDEwNDk5LDExNCwxMDUsMTAxLDU5LDMsODg4NSw4NDAyLDEwNSwxMDksNTksMyw4NzY0LDg0MDIsNCwzLDY1LDk3LDExMCwxNDQ0MCwxNDQ0NSwxNDQ2OCwxMTQsMTE0LDU5LDEsODY2MiwxMTQsNCwyLDEwNCwxMTQsMTQ0NTIsMTQ0NTYsMTA3LDU5LDEsMTA1MzEsNCwyLDU5LDExMSwxNDQ2MiwxNDQ2NCwxLDg1OTgsMTE5LDU5LDEsODU5OCwxMDEsOTcsMTE0LDU5LDEsMTA1MzUsNCwxOCw4Myw5Nyw5OSwxMDAsMTAxLDEwMiwxMDMsMTA0LDEwNSwxMDgsMTA5LDExMSwxMTIsMTE0LDExNSwxMTYsMTE3LDExOCwxNDUxMiwxNDUxNSwxNDUzNSwxNDU2MCwxNDU5NywxNDYwMywxNDYxOCwxNDY0MywxNDY1NywxNDY2MiwxNDcwMSwxNDc0MSwxNDc0NywxNDc2OSwxNDg1MSwxNDg3NywxNDkwNywxNDkxNiw1OSwxLDk0MTYsNCwyLDk5LDExNSwxNDUyMSwxNDUzMSwxMTcsMTE2LDEwMSw1LDI0MywxLDU5LDE0NTI5LDEsMjQzLDExNiw1OSwxLDg4NTksNCwyLDEwNSwxMjEsMTQ1NDEsMTQ1NTcsMTE0LDQsMiw1OSw5OSwxNDU0OCwxNDU1MCwxLDg4NTgsNSwyNDQsMSw1OSwxNDU1NSwxLDI0NCw1OSwxLDEwODYsNCw1LDk3LDk4LDEwNSwxMTEsMTE1LDE0NTcyLDE0NTc3LDE0NTgzLDE0NTg3LDE0NTkxLDExNSwxMDQsNTksMSw4ODYxLDEwOCw5Nyw5OSw1OSwxLDMzNywxMTgsNTksMSwxMDgwOCwxMTYsNTksMSw4ODU3LDExMSwxMDgsMTAwLDU5LDEsMTA2ODQsMTA4LDEwNSwxMDMsNTksMSwzMzksNCwyLDk5LDExNCwxNDYwOSwxNDYxNCwxMDUsMTE0LDU5LDEsMTA2ODcsNTksMyw1NTM0OSw1NjYyMCw0LDMsMTExLDExNCwxMTYsMTQ2MjYsMTQ2MzAsMTQ2NDAsMTEwLDU5LDEsNzMxLDk3LDExOCwxMDEsNSwyNDIsMSw1OSwxNDYzOCwxLDI0Miw1OSwxLDEwNjg5LDQsMiw5OCwxMDksMTQ2NDksMTQ2NTQsOTcsMTE0LDU5LDEsMTA2NzcsNTksMSw5MzcsMTEwLDExNiw1OSwxLDg3NTAsNCw0LDk3LDk5LDEwNSwxMTYsMTQ2NzIsMTQ2NzcsMTQ2OTMsMTQ2OTgsMTE0LDExNCw1OSwxLDg2MzQsNCwyLDEwNSwxMTQsMTQ2ODMsMTQ2ODcsMTE0LDU5LDEsMTA2ODYsMTExLDExNSwxMTUsNTksMSwxMDY4MywxMTAsMTAxLDU5LDEsODI1NCw1OSwxLDEwNjg4LDQsMyw5NywxMDEsMTA1LDE0NzA5LDE0NzE0LDE0NzE5LDk5LDExNCw1OSwxLDMzMywxMDMsOTcsNTksMSw5NjksNCwzLDk5LDEwMCwxMTAsMTQ3MjcsMTQ3MzMsMTQ3MzYsMTE0LDExMSwxMTAsNTksMSw5NTksNTksMSwxMDY3OCwxMTcsMTE1LDU5LDEsODg1NCwxMTIsMTAyLDU5LDMsNTUzNDksNTY2NzIsNCwzLDk3LDEwMSwxMDgsMTQ3NTUsMTQ3NTksMTQ3NjQsMTE0LDU5LDEsMTA2NzksMTE0LDExMiw1OSwxLDEwNjgxLDExNywxMTUsNTksMSw4ODUzLDQsNyw1OSw5NywxMDAsMTA1LDExMSwxMTUsMTE4LDE0Nzg1LDE0Nzg3LDE0NzkyLDE0ODMxLDE0ODM3LDE0ODQxLDE0ODQ4LDEsODc0NCwxMTQsMTE0LDU5LDEsODYzNSw0LDQsNTksMTAxLDEwMiwxMDksMTQ4MDIsMTQ4MDQsMTQ4MTcsMTQ4MjQsMSwxMDg0NSwxMTQsNCwyLDU5LDExMSwxNDgxMSwxNDgxMywxLDg1MDAsMTAyLDU5LDEsODUwMCw1LDE3MCwxLDU5LDE0ODIyLDEsMTcwLDUsMTg2LDEsNTksMTQ4MjksMSwxODYsMTAzLDExMSwxMDIsNTksMSw4ODg2LDExNCw1OSwxLDEwODM4LDEwOCwxMTEsMTEyLDEwMSw1OSwxLDEwODM5LDU5LDEsMTA4NDMsNCwzLDk5LDEwOCwxMTEsMTQ4NTksMTQ4NjMsMTQ4NzMsMTE0LDU5LDEsODUwMCw5NywxMTUsMTA0LDUsMjQ4LDEsNTksMTQ4NzEsMSwyNDgsMTA4LDU5LDEsODg1NiwxMDUsNCwyLDEwOCwxMDksMTQ4ODQsMTQ4OTMsMTAwLDEwMSw1LDI0NSwxLDU5LDE0ODkxLDEsMjQ1LDEwMSwxMTUsNCwyLDU5LDk3LDE0OTAxLDE0OTAzLDEsODg1NSwxMTUsNTksMSwxMDgwNiwxMDksMTA4LDUsMjQ2LDEsNTksMTQ5MTQsMSwyNDYsOTgsOTcsMTE0LDU5LDEsOTAyMSw0LDEyLDk3LDk5LDEwMSwxMDIsMTA0LDEwNSwxMDgsMTA5LDExMSwxMTQsMTE1LDExNywxNDk0OCwxNDk5MiwxNDk5NiwxNTAzMywxNTAzOCwxNTA2OCwxNTA5MCwxNTE4OSwxNTE5MiwxNTIyMiwxNTQyNywxNTQ0MSwxMTQsNCw0LDU5LDk3LDExNSwxMTYsMTQ5NTksMTQ5NjEsMTQ5NzYsMTQ5ODksMSw4NzQxLDUsMTgyLDIsNTksMTA4LDE0OTY4LDE0OTcwLDEsMTgyLDEwOCwxMDEsMTA4LDU5LDEsODc0MSw0LDIsMTA1LDEwOCwxNDk4MiwxNDk4NiwxMDksNTksMSwxMDk5NSw1OSwxLDExMDA1LDU5LDEsODcwNiwxMjEsNTksMSwxMDg3LDExNCw0LDUsOTksMTA1LDEwOSwxMTIsMTE2LDE1MDA5LDE1MDE0LDE1MDE5LDE1MDI0LDE1MDI3LDExMCwxMTYsNTksMSwzNywxMTEsMTAwLDU5LDEsNDYsMTA1LDEwOCw1OSwxLDgyNDAsNTksMSw4ODY5LDEwMSwxMTAsMTA3LDU5LDEsODI0MSwxMTQsNTksMyw1NTM0OSw1NjYyMSw0LDMsMTA1LDEwOSwxMTEsMTUwNDYsMTUwNTcsMTUwNjMsNCwyLDU5LDExOCwxNTA1MiwxNTA1NCwxLDk2Niw1OSwxLDk4MSwxMDksOTcsMTE2LDU5LDEsODQ5OSwxMTAsMTAxLDU5LDEsOTc0Miw0LDMsNTksMTE2LDExOCwxNTA3NiwxNTA3OCwxNTA4NywxLDk2MCw5OSwxMDQsMTAyLDExMSwxMTQsMTA3LDU5LDEsODkxNiw1OSwxLDk4Miw0LDIsOTcsMTE3LDE1MDk2LDE1MTE5LDExMCw0LDIsOTksMTA3LDE1MTAzLDE1MTE1LDEwNyw0LDIsNTksMTA0LDE1MTEwLDE1MTEyLDEsODQ2Myw1OSwxLDg0NjIsMTE4LDU5LDEsODQ2MywxMTUsNCw5LDU5LDk3LDk4LDk5LDEwMCwxMDEsMTA5LDExNSwxMTYsMTUxNDAsMTUxNDIsMTUxNDgsMTUxNTEsMTUxNTYsMTUxNjgsMTUxNzEsMTUxNzksMTUxODQsMSw0Myw5OSwxMDUsMTE0LDU5LDEsMTA3ODcsNTksMSw4ODYyLDEwNSwxMTQsNTksMSwxMDc4Niw0LDIsMTExLDExNywxNTE2MiwxNTE2NSw1OSwxLDg3MjQsNTksMSwxMDc4OSw1OSwxLDEwODY2LDExMCw1LDE3NywxLDU5LDE1MTc3LDEsMTc3LDEwNSwxMDksNTksMSwxMDc5MCwxMTksMTExLDU5LDEsMTA3OTEsNTksMSwxNzcsNCwzLDEwNSwxMTIsMTE3LDE1MjAwLDE1MjA4LDE1MjEzLDExMCwxMTYsMTA1LDExMCwxMTYsNTksMSwxMDc3MywxMDIsNTksMyw1NTM0OSw1NjY3MywxMTAsMTAwLDUsMTYzLDEsNTksMTUyMjAsMSwxNjMsNCwxMCw1OSw2OSw5Nyw5OSwxMDEsMTA1LDExMCwxMTEsMTE1LDExNywxNTI0NCwxNTI0NiwxNTI0OSwxNTI1MywxNTI1OCwxNTMzNCwxNTM0NywxNTM2NywxNTQxNiwxNTQyMSwxLDg4MjYsNTksMSwxMDkzMSwxMTIsNTksMSwxMDkzNSwxMTcsMTAxLDU5LDEsODgyOCw0LDIsNTksOTksMTUyNjQsMTUyNjYsMSwxMDkyNyw0LDYsNTksOTcsOTksMTAxLDExMCwxMTUsMTUyODAsMTUyODIsMTUyOTAsMTUyOTksMTUzMDMsMTUzMjksMSw4ODI2LDExMiwxMTIsMTE0LDExMSwxMjAsNTksMSwxMDkzNSwxMTcsMTE0LDEwOCwxMjEsMTAxLDExMyw1OSwxLDg4MjgsMTEzLDU5LDEsMTA5MjcsNCwzLDk3LDEwMSwxMTUsMTUzMTEsMTUzMTksMTUzMjQsMTEyLDExMiwxMTQsMTExLDEyMCw1OSwxLDEwOTM3LDExMywxMTMsNTksMSwxMDkzMywxMDUsMTA5LDU5LDEsODkzNiwxMDUsMTA5LDU5LDEsODgzMCwxMDksMTAxLDQsMiw1OSwxMTUsMTUzNDIsMTUzNDQsMSw4MjQyLDU5LDEsODQ3Myw0LDMsNjksOTcsMTE1LDE1MzU1LDE1MzU4LDE1MzYyLDU5LDEsMTA5MzMsMTEyLDU5LDEsMTA5MzcsMTA1LDEwOSw1OSwxLDg5MzYsNCwzLDEwMCwxMDIsMTEyLDE1Mzc1LDE1Mzc4LDE1NDA0LDU5LDEsODcxOSw0LDMsOTcsMTA4LDExNSwxNTM4NiwxNTM5MiwxNTM5OCwxMDgsOTcsMTE0LDU5LDEsOTAwNiwxMDUsMTEwLDEwMSw1OSwxLDg5NzgsMTE3LDExNCwxMDIsNTksMSw4OTc5LDQsMiw1OSwxMTYsMTU0MTAsMTU0MTIsMSw4NzMzLDExMSw1OSwxLDg3MzMsMTA1LDEwOSw1OSwxLDg4MzAsMTE0LDEwMSwxMDgsNTksMSw4ODgwLDQsMiw5OSwxMDUsMTU0MzMsMTU0MzgsMTE0LDU5LDMsNTUzNDksNTY1MTcsNTksMSw5NjgsMTEwLDk5LDExNSwxMTIsNTksMSw4MjAwLDQsNiwxMDIsMTA1LDExMSwxMTIsMTE1LDExNywxNTQ2MiwxNTQ2NywxNTQ3MiwxNTQ3OCwxNTQ4NSwxNTQ5MSwxMTQsNTksMyw1NTM0OSw1NjYyMiwxMTAsMTE2LDU5LDEsMTA3NjQsMTEyLDEwMiw1OSwzLDU1MzQ5LDU2Njc0LDExNCwxMDUsMTA5LDEwMSw1OSwxLDgyNzksOTksMTE0LDU5LDMsNTUzNDksNTY1MTgsNCwzLDk3LDEwMSwxMTEsMTU0OTksMTU1MjAsMTU1MzQsMTE2LDQsMiwxMDEsMTA1LDE1NTA2LDE1NTE1LDExNCwxMTAsMTA1LDExMSwxMTAsMTE1LDU5LDEsODQ2MSwxMTAsMTE2LDU5LDEsMTA3NzQsMTE1LDExNiw0LDIsNTksMTAxLDE1NTI4LDE1NTMwLDEsNjMsMTEzLDU5LDEsODc5OSwxMTYsNSwzNCwxLDU5LDE1NTQwLDEsMzQsNCwyMSw2NSw2Niw3Miw5Nyw5OCw5OSwxMDAsMTAxLDEwMiwxMDQsMTA1LDEwOCwxMDksMTEwLDExMSwxMTIsMTE0LDExNSwxMTYsMTE3LDEyMCwxNTU4NiwxNTYwOSwxNTYxNSwxNTYyMCwxNTc5NiwxNTg1NSwxNTg5MywxNTkzMSwxNTk3NywxNjAwMSwxNjAzOSwxNjE4MywxNjIwNCwxNjIyMiwxNjIyOCwxNjI4NSwxNjMxMiwxNjMxOCwxNjM2MywxNjQwOCwxNjQxNiw0LDMsOTcsMTE0LDExNiwxNTU5NCwxNTU5OSwxNTYwMywxMTQsMTE0LDU5LDEsODY2NywxMTQsNTksMSw4NjU4LDk3LDEwNSwxMDgsNTksMSwxMDUyNCw5NywxMTQsMTE0LDU5LDEsMTA1MTEsOTcsMTE0LDU5LDEsMTA1OTYsNCw3LDk5LDEwMCwxMDEsMTEwLDExMywxMTQsMTE2LDE1NjM2LDE1NjUxLDE1NjU2LDE1NjY0LDE1Njg3LDE1Njk2LDE1NzcwLDQsMiwxMDEsMTE3LDE1NjQyLDE1NjQ2LDU5LDMsODc2NSw4MTcsMTE2LDEwMSw1OSwxLDM0MSwxMDUsOTksNTksMSw4NzMwLDEwOSwxMTIsMTE2LDEyMSwxMTgsNTksMSwxMDY3NSwxMDMsNCw0LDU5LDEwMCwxMDEsMTA4LDE1Njc1LDE1Njc3LDE1NjgwLDE1NjgzLDEsMTAyMTcsNTksMSwxMDY0Miw1OSwxLDEwNjYxLDEwMSw1OSwxLDEwMjE3LDExNywxMTEsNSwxODcsMSw1OSwxNTY5NCwxLDE4NywxMTQsNCwxMSw1OSw5Nyw5OCw5OSwxMDIsMTA0LDEwOCwxMTIsMTE1LDExNiwxMTksMTU3MjEsMTU3MjMsMTU3MjcsMTU3MzksMTU3NDIsMTU3NDYsMTU3NTAsMTU3NTQsMTU3NTgsMTU3NjMsMTU3NjcsMSw4NTk0LDExMiw1OSwxLDEwNjEzLDQsMiw1OSwxMDIsMTU3MzMsMTU3MzUsMSw4Njc3LDExNSw1OSwxLDEwNTI4LDU5LDEsMTA1NDcsMTE1LDU5LDEsMTA1MjYsMTA3LDU5LDEsODYxOCwxMTIsNTksMSw4NjIwLDEwOCw1OSwxLDEwNTY1LDEwNSwxMDksNTksMSwxMDYxMiwxMDgsNTksMSw4NjExLDU5LDEsODYwNSw0LDIsOTcsMTA1LDE1Nzc2LDE1NzgxLDEwNSwxMDgsNTksMSwxMDUyMiwxMTEsNCwyLDU5LDExMCwxNTc4OCwxNTc5MCwxLDg3NTgsOTcsMTA4LDExNSw1OSwxLDg0NzQsNCwzLDk3LDk4LDExNCwxNTgwNCwxNTgwOSwxNTgxNCwxMTQsMTE0LDU5LDEsMTA1MDksMTE0LDEwNyw1OSwxLDEwMDk5LDQsMiw5NywxMDcsMTU4MjAsMTU4MzMsOTksNCwyLDEwMSwxMDcsMTU4MjcsMTU4MzAsNTksMSwxMjUsNTksMSw5Myw0LDIsMTAxLDExNSwxNTgzOSwxNTg0Miw1OSwxLDEwNjM2LDEwOCw0LDIsMTAwLDExNywxNTg0OSwxNTg1Miw1OSwxLDEwNjM4LDU5LDEsMTA2NDAsNCw0LDk3LDEwMSwxMTcsMTIxLDE1ODY1LDE1ODcxLDE1ODg2LDE1ODkwLDExNCwxMTEsMTEwLDU5LDEsMzQ1LDQsMiwxMDAsMTA1LDE1ODc3LDE1ODgyLDEwNSwxMDgsNTksMSwzNDMsMTA4LDU5LDEsODk2OSw5OCw1OSwxLDEyNSw1OSwxLDEwODgsNCw0LDk5LDEwOCwxMTMsMTE1LDE1OTAzLDE1OTA3LDE1OTE0LDE1OTI3LDk3LDU5LDEsMTA1NTEsMTAwLDEwNCw5NywxMTQsNTksMSwxMDYwMSwxMTcsMTExLDQsMiw1OSwxMTQsMTU5MjIsMTU5MjQsMSw4MjIxLDU5LDEsODIyMSwxMDQsNTksMSw4NjI3LDQsMyw5Nyw5OSwxMDMsMTU5MzksMTU5NjYsMTU5NzAsMTA4LDQsNCw1OSwxMDUsMTEyLDExNSwxNTk1MCwxNTk1MiwxNTk1NywxNTk2MywxLDg0NzYsMTEwLDEwMSw1OSwxLDg0NzUsOTcsMTE0LDExNiw1OSwxLDg0NzYsNTksMSw4NDc3LDExNiw1OSwxLDk2NDUsNSwxNzQsMSw1OSwxNTk3NSwxLDE3NCw0LDMsMTA1LDEwOCwxMTQsMTU5ODUsMTU5OTEsMTU5OTcsMTE1LDEwNCwxMTYsNTksMSwxMDYyMSwxMTEsMTExLDExNCw1OSwxLDg5NzEsNTksMyw1NTM0OSw1NjYyMyw0LDIsOTcsMTExLDE2MDA3LDE2MDI4LDExNCw0LDIsMTAwLDExNywxNjAxNCwxNjAxNyw1OSwxLDg2NDEsNCwyLDU5LDEwOCwxNjAyMywxNjAyNSwxLDg2NDAsNTksMSwxMDYwNCw0LDIsNTksMTE4LDE2MDM0LDE2MDM2LDEsOTYxLDU5LDEsMTAwOSw0LDMsMTAzLDExMCwxMTUsMTYwNDcsMTYxNjcsMTYxNzEsMTA0LDExNiw0LDYsOTcsMTA0LDEwOCwxMTQsMTE1LDExNiwxNjA2MywxNjA4MSwxNjEwMywxNjEzMCwxNjE0MywxNjE1NSwxMTQsMTE0LDExMSwxMTksNCwyLDU5LDExNiwxNjA3MywxNjA3NSwxLDg1OTQsOTcsMTA1LDEwOCw1OSwxLDg2MTEsOTcsMTE0LDExMiwxMTEsMTExLDExMCw0LDIsMTAwLDExNywxNjA5MywxNjA5OSwxMTEsMTE5LDExMCw1OSwxLDg2NDEsMTEyLDU5LDEsODY0MCwxMDEsMTAyLDExNiw0LDIsOTcsMTA0LDE2MTEyLDE2MTIwLDExNCwxMTQsMTExLDExOSwxMTUsNTksMSw4NjQ0LDk3LDExNCwxMTIsMTExLDExMSwxMTAsMTE1LDU5LDEsODY1MiwxMDUsMTAzLDEwNCwxMTYsOTcsMTE0LDExNCwxMTEsMTE5LDExNSw1OSwxLDg2NDksMTEzLDExNywxMDUsMTAzLDk3LDExNCwxMTQsMTExLDExOSw1OSwxLDg2MDUsMTA0LDExNCwxMDEsMTAxLDExNiwxMDUsMTA5LDEwMSwxMTUsNTksMSw4OTA4LDEwMyw1OSwxLDczMCwxMDUsMTEwLDEwMywxMDAsMTExLDExNiwxMTUsMTAxLDExMyw1OSwxLDg3ODcsNCwzLDk3LDEwNCwxMDksMTYxOTEsMTYxOTYsMTYyMDEsMTE0LDExNCw1OSwxLDg2NDQsOTcsMTE0LDU5LDEsODY1Miw1OSwxLDgyMDcsMTExLDExNywxMTUsMTE2LDQsMiw1OSw5NywxNjIxNCwxNjIxNiwxLDkxMzcsOTksMTA0LDEwMSw1OSwxLDkxMzcsMTA5LDEwNSwxMDAsNTksMSwxMDk5MCw0LDQsOTcsOTgsMTEyLDExNiwxNjIzOCwxNjI1MiwxNjI1NywxNjI3OCw0LDIsMTEwLDExNCwxNjI0NCwxNjI0OCwxMDMsNTksMSwxMDIyMSwxMTQsNTksMSw4NzAyLDExNCwxMDcsNTksMSwxMDIxNSw0LDMsOTcsMTAyLDEwOCwxNjI2NSwxNjI2OSwxNjI3MywxMTQsNTksMSwxMDYzMCw1OSwzLDU1MzQ5LDU2Njc1LDExNywxMTUsNTksMSwxMDc5OCwxMDUsMTA5LDEwMSwxMTUsNTksMSwxMDgwNSw0LDIsOTcsMTEyLDE2MjkxLDE2MzA0LDExNCw0LDIsNTksMTAzLDE2Mjk4LDE2MzAwLDEsNDEsMTE2LDU5LDEsMTA2NDQsMTExLDEwOCwxMDUsMTEwLDExNiw1OSwxLDEwNzcwLDk3LDExNCwxMTQsNTksMSw4NjQ5LDQsNCw5Nyw5OSwxMDQsMTEzLDE2MzI4LDE2MzM0LDE2MzM5LDE2MzQyLDExMywxMTcsMTExLDU5LDEsODI1MCwxMTQsNTksMyw1NTM0OSw1NjUxOSw1OSwxLDg2MjUsNCwyLDk4LDExNywxNjM0OCwxNjM1MSw1OSwxLDkzLDExMSw0LDIsNTksMTE0LDE2MzU4LDE2MzYwLDEsODIxNyw1OSwxLDgyMTcsNCwzLDEwNCwxMDUsMTE0LDE2MzcxLDE2Mzc3LDE2MzgzLDExNCwxMDEsMTAxLDU5LDEsODkwOCwxMDksMTAxLDExNSw1OSwxLDg5MDYsMTA1LDQsNCw1OSwxMDEsMTAyLDEwOCwxNjM5NCwxNjM5NiwxNjM5OSwxNjQwMiwxLDk2NTcsNTksMSw4ODg1LDU5LDEsOTY1NiwxMTYsMTE0LDEwNSw1OSwxLDEwNzAyLDEwOCwxMTcsMTA0LDk3LDExNCw1OSwxLDEwNjAwLDU5LDEsODQ3OCw0LDE5LDk3LDk4LDk5LDEwMCwxMDEsMTAyLDEwNCwxMDUsMTA4LDEwOSwxMTEsMTEyLDExMywxMTQsMTE1LDExNiwxMTcsMTE5LDEyMiwxNjQ1OSwxNjQ2NiwxNjQ3MiwxNjU3MiwxNjU5MCwxNjY3MiwxNjY4NywxNjc0NiwxNjg0NCwxNjg1MCwxNjkyNCwxNjk2MywxNjk4OCwxNzExNSwxNzEyMSwxNzE1NCwxNzIwNiwxNzYxNCwxNzY1Niw5OSwxMTcsMTE2LDEwMSw1OSwxLDM0NywxMTMsMTE3LDExMSw1OSwxLDgyMTgsNCwxMCw1OSw2OSw5Nyw5OSwxMDEsMTA1LDExMCwxMTIsMTE1LDEyMSwxNjQ5NCwxNjQ5NiwxNjQ5OSwxNjUxMywxNjUxOCwxNjUzMSwxNjUzNiwxNjU1NiwxNjU2NCwxNjU2OSwxLDg4MjcsNTksMSwxMDkzMiw0LDIsMTEyLDExNCwxNjUwNSwxNjUwOCw1OSwxLDEwOTM2LDExMSwxMTAsNTksMSwzNTMsMTE3LDEwMSw1OSwxLDg4MjksNCwyLDU5LDEwMCwxNjUyNCwxNjUyNiwxLDEwOTI4LDEwNSwxMDgsNTksMSwzNTEsMTE0LDk5LDU5LDEsMzQ5LDQsMyw2OSw5NywxMTUsMTY1NDQsMTY1NDcsMTY1NTEsNTksMSwxMDkzNCwxMTIsNTksMSwxMDkzOCwxMDUsMTA5LDU5LDEsODkzNywxMTEsMTA4LDEwNSwxMTAsMTE2LDU5LDEsMTA3NzEsMTA1LDEwOSw1OSwxLDg4MzEsNTksMSwxMDg5LDExMSwxMTYsNCwzLDU5LDk4LDEwMSwxNjU4MiwxNjU4NCwxNjU4NywxLDg5MDEsNTksMSw4ODY1LDU5LDEsMTA4NTQsNCw3LDY1LDk3LDk5LDEwOSwxMTUsMTE2LDEyMCwxNjYwNiwxNjYxMSwxNjYzNCwxNjY0MiwxNjY0NiwxNjY1MiwxNjY2OCwxMTQsMTE0LDU5LDEsODY2NCwxMTQsNCwyLDEwNCwxMTQsMTY2MTgsMTY2MjIsMTA3LDU5LDEsMTA1MzMsNCwyLDU5LDExMSwxNjYyOCwxNjYzMCwxLDg2MDAsMTE5LDU5LDEsODYwMCwxMTYsNSwxNjcsMSw1OSwxNjY0MCwxLDE2NywxMDUsNTksMSw1OSwxMTksOTcsMTE0LDU5LDEsMTA1MzcsMTA5LDQsMiwxMDUsMTEwLDE2NjU5LDE2NjY1LDExMCwxMTcsMTE1LDU5LDEsODcyNiw1OSwxLDg3MjYsMTE2LDU5LDEsMTAwMzgsMTE0LDQsMiw1OSwxMTEsMTY2NzksMTY2ODIsMyw1NTM0OSw1NjYyNCwxMTksMTEwLDU5LDEsODk5NCw0LDQsOTcsOTksMTExLDEyMSwxNjY5NywxNjcwMiwxNjcxNiwxNjczOSwxMTQsMTEyLDU5LDEsOTgzOSw0LDIsMTA0LDEyMSwxNjcwOCwxNjcxMyw5OSwxMjEsNTksMSwxMDk3LDU5LDEsMTA5NiwxMTQsMTE2LDQsMiwxMDksMTEyLDE2NzI0LDE2NzI5LDEwNSwxMDAsNTksMSw4NzM5LDk3LDExNCw5NywxMDgsMTA4LDEwMSwxMDgsNTksMSw4NzQxLDUsMTczLDEsNTksMTY3NDQsMSwxNzMsNCwyLDEwMywxMDksMTY3NTIsMTY3NzAsMTA5LDk3LDQsMyw1OSwxMDIsMTE4LDE2NzYyLDE2NzY0LDE2NzY3LDEsOTYzLDU5LDEsOTYyLDU5LDEsOTYyLDQsOCw1OSwxMDAsMTAxLDEwMywxMDgsMTEwLDExMiwxMTQsMTY3ODgsMTY3OTAsMTY3OTUsMTY4MDYsMTY4MTcsMTY4MjgsMTY4MzIsMTY4MzgsMSw4NzY0LDExMSwxMTYsNTksMSwxMDg1OCw0LDIsNTksMTEzLDE2ODAxLDE2ODAzLDEsODc3MSw1OSwxLDg3NzEsNCwyLDU5LDY5LDE2ODEyLDE2ODE0LDEsMTA5MTAsNTksMSwxMDkxMiw0LDIsNTksNjksMTY4MjMsMTY4MjUsMSwxMDkwOSw1OSwxLDEwOTExLDEwMSw1OSwxLDg3NzQsMTA4LDExNywxMTUsNTksMSwxMDc4OCw5NywxMTQsMTE0LDU5LDEsMTA2MTAsOTcsMTE0LDExNCw1OSwxLDg1OTIsNCw0LDk3LDEwMSwxMDUsMTE2LDE2ODYwLDE2ODgzLDE2ODkxLDE2OTA0LDQsMiwxMDgsMTE1LDE2ODY2LDE2ODc4LDEwOCwxMTUsMTAxLDExNiwxMDksMTA1LDExMCwxMTcsMTE1LDU5LDEsODcyNiwxMDQsMTEyLDU5LDEsMTA4MDMsMTEyLDk3LDExNCwxMTUsMTA4LDU5LDEsMTA3MjQsNCwyLDEwMCwxMDgsMTY4OTcsMTY5MDAsNTksMSw4NzM5LDEwMSw1OSwxLDg5OTUsNCwyLDU5LDEwMSwxNjkxMCwxNjkxMiwxLDEwOTIyLDQsMiw1OSwxMTUsMTY5MTgsMTY5MjAsMSwxMDkyNCw1OSwzLDEwOTI0LDY1MDI0LDQsMywxMDIsMTA4LDExMiwxNjkzMiwxNjkzOCwxNjk1OCwxMTYsOTksMTIxLDU5LDEsMTEwMCw0LDIsNTksOTgsMTY5NDQsMTY5NDYsMSw0Nyw0LDIsNTksOTcsMTY5NTIsMTY5NTQsMSwxMDY5MiwxMTQsNTksMSw5MDIzLDEwMiw1OSwzLDU1MzQ5LDU2Njc2LDk3LDQsMiwxMDAsMTE0LDE2OTcwLDE2OTg1LDEwMSwxMTUsNCwyLDU5LDExNywxNjk3OCwxNjk4MCwxLDk4MjQsMTA1LDExNiw1OSwxLDk4MjQsNTksMSw4NzQxLDQsMyw5OSwxMTUsMTE3LDE2OTk2LDE3MDI4LDE3MDg5LDQsMiw5NywxMTcsMTcwMDIsMTcwMTUsMTEyLDQsMiw1OSwxMTUsMTcwMDksMTcwMTEsMSw4ODUxLDU5LDMsODg1MSw2NTAyNCwxMTIsNCwyLDU5LDExNSwxNzAyMiwxNzAyNCwxLDg4NTIsNTksMyw4ODUyLDY1MDI0LDExNyw0LDIsOTgsMTEyLDE3MDM1LDE3MDYyLDQsMyw1OSwxMDEsMTE1LDE3MDQzLDE3MDQ1LDE3MDQ4LDEsODg0Nyw1OSwxLDg4NDksMTAxLDExNiw0LDIsNTksMTAxLDE3MDU2LDE3MDU4LDEsODg0NywxMTMsNTksMSw4ODQ5LDQsMyw1OSwxMDEsMTE1LDE3MDcwLDE3MDcyLDE3MDc1LDEsODg0OCw1OSwxLDg4NTAsMTAxLDExNiw0LDIsNTksMTAxLDE3MDgzLDE3MDg1LDEsODg0OCwxMTMsNTksMSw4ODUwLDQsMyw1OSw5NywxMDIsMTcwOTcsMTcwOTksMTcxMTIsMSw5NjMzLDExNCw0LDIsMTAxLDEwMiwxNzEwNiwxNzEwOSw1OSwxLDk2MzMsNTksMSw5NjQyLDU5LDEsOTY0Miw5NywxMTQsMTE0LDU5LDEsODU5NCw0LDQsOTksMTAxLDEwOSwxMTYsMTcxMzEsMTcxMzYsMTcxNDIsMTcxNDgsMTE0LDU5LDMsNTUzNDksNTY1MjAsMTE2LDEwOSwxMTAsNTksMSw4NzI2LDEwNSwxMDgsMTAxLDU5LDEsODk5NSw5NywxMTQsMTAyLDU5LDEsODkwMiw0LDIsOTcsMTE0LDE3MTYwLDE3MTcyLDExNCw0LDIsNTksMTAyLDE3MTY3LDE3MTY5LDEsOTczNCw1OSwxLDk3MzMsNCwyLDk3LDExMCwxNzE3OCwxNzIwMiwxMDUsMTAzLDEwNCwxMTYsNCwyLDEwMSwxMTIsMTcxODgsMTcxOTcsMTEyLDExNSwxMDUsMTA4LDExMSwxMTAsNTksMSwxMDEzLDEwNCwxMDUsNTksMSw5ODEsMTE1LDU5LDEsMTc1LDQsNSw5OCw5OSwxMDksMTEwLDExMiwxNzIxOCwxNzM1MSwxNzQyMCwxNzQyMywxNzQyNyw0LDksNTksNjksMTAwLDEwMSwxMDksMTEwLDExMiwxMTQsMTE1LDE3MjM4LDE3MjQwLDE3MjQzLDE3MjQ4LDE3MjYxLDE3MjY3LDE3Mjc5LDE3Mjg1LDE3MjkxLDEsODgzNCw1OSwxLDEwOTQ5LDExMSwxMTYsNTksMSwxMDk0MSw0LDIsNTksMTAwLDE3MjU0LDE3MjU2LDEsODgzOCwxMTEsMTE2LDU5LDEsMTA5NDcsMTE3LDEwOCwxMTYsNTksMSwxMDk0NSw0LDIsNjksMTAxLDE3MjczLDE3Mjc2LDU5LDEsMTA5NTUsNTksMSw4ODQyLDEwOCwxMTcsMTE1LDU5LDEsMTA5NDMsOTcsMTE0LDExNCw1OSwxLDEwNjE3LDQsMywxMDEsMTA1LDExNywxNzI5OSwxNzMzNSwxNzMzOSwxMTYsNCwzLDU5LDEwMSwxMTAsMTczMDgsMTczMTAsMTczMjIsMSw4ODM0LDExMyw0LDIsNTksMTEzLDE3MzE3LDE3MzE5LDEsODgzOCw1OSwxLDEwOTQ5LDEwMSwxMTMsNCwyLDU5LDExMywxNzMzMCwxNzMzMiwxLDg4NDIsNTksMSwxMDk1NSwxMDksNTksMSwxMDk1MSw0LDIsOTgsMTEyLDE3MzQ1LDE3MzQ4LDU5LDEsMTA5NjUsNTksMSwxMDk2Myw5OSw0LDYsNTksOTcsOTksMTAxLDExMCwxMTUsMTczNjYsMTczNjgsMTczNzYsMTczODUsMTczODksMTc0MTUsMSw4ODI3LDExMiwxMTIsMTE0LDExMSwxMjAsNTksMSwxMDkzNiwxMTcsMTE0LDEwOCwxMjEsMTAxLDExMyw1OSwxLDg4MjksMTEzLDU5LDEsMTA5MjgsNCwzLDk3LDEwMSwxMTUsMTczOTcsMTc0MDUsMTc0MTAsMTEyLDExMiwxMTQsMTExLDEyMCw1OSwxLDEwOTM4LDExMywxMTMsNTksMSwxMDkzNCwxMDUsMTA5LDU5LDEsODkzNywxMDUsMTA5LDU5LDEsODgzMSw1OSwxLDg3MjEsMTAzLDU5LDEsOTgzNCw0LDEzLDQ5LDUwLDUxLDU5LDY5LDEwMCwxMDEsMTA0LDEwOCwxMDksMTEwLDExMiwxMTUsMTc0NTUsMTc0NjIsMTc0NjksMTc0NzYsMTc0NzgsMTc0ODEsMTc0OTYsMTc1MDksMTc1MjQsMTc1MzAsMTc1MzYsMTc1NDgsMTc1NTQsNSwxODUsMSw1OSwxNzQ2MCwxLDE4NSw1LDE3OCwxLDU5LDE3NDY3LDEsMTc4LDUsMTc5LDEsNTksMTc0NzQsMSwxNzksMSw4ODM1LDU5LDEsMTA5NTAsNCwyLDExMSwxMTUsMTc0ODcsMTc0OTEsMTE2LDU5LDEsMTA5NDIsMTE3LDk4LDU5LDEsMTA5NjgsNCwyLDU5LDEwMCwxNzUwMiwxNzUwNCwxLDg4MzksMTExLDExNiw1OSwxLDEwOTQ4LDExNSw0LDIsMTExLDExNywxNzUxNiwxNzUyMCwxMDgsNTksMSwxMDE4NSw5OCw1OSwxLDEwOTY3LDk3LDExNCwxMTQsNTksMSwxMDYxOSwxMTcsMTA4LDExNiw1OSwxLDEwOTQ2LDQsMiw2OSwxMDEsMTc1NDIsMTc1NDUsNTksMSwxMDk1Niw1OSwxLDg4NDMsMTA4LDExNywxMTUsNTksMSwxMDk0NCw0LDMsMTAxLDEwNSwxMTcsMTc1NjIsMTc1OTgsMTc2MDIsMTE2LDQsMyw1OSwxMDEsMTEwLDE3NTcxLDE3NTczLDE3NTg1LDEsODgzNSwxMTMsNCwyLDU5LDExMywxNzU4MCwxNzU4MiwxLDg4MzksNTksMSwxMDk1MCwxMDEsMTEzLDQsMiw1OSwxMTMsMTc1OTMsMTc1OTUsMSw4ODQzLDU5LDEsMTA5NTYsMTA5LDU5LDEsMTA5NTIsNCwyLDk4LDExMiwxNzYwOCwxNzYxMSw1OSwxLDEwOTY0LDU5LDEsMTA5NjYsNCwzLDY1LDk3LDExMCwxNzYyMiwxNzYyNywxNzY1MCwxMTQsMTE0LDU5LDEsODY2NSwxMTQsNCwyLDEwNCwxMTQsMTc2MzQsMTc2MzgsMTA3LDU5LDEsMTA1MzQsNCwyLDU5LDExMSwxNzY0NCwxNzY0NiwxLDg2MDEsMTE5LDU5LDEsODYwMSwxMTksOTcsMTE0LDU5LDEsMTA1MzgsMTA4LDEwNSwxMDMsNSwyMjMsMSw1OSwxNzY2NCwxLDIyMyw0LDEzLDk3LDk4LDk5LDEwMCwxMDEsMTAyLDEwNCwxMDUsMTExLDExMiwxMTQsMTE1LDExOSwxNzY5NCwxNzcwOSwxNzcxNCwxNzczNywxNzc0MiwxNzc0OSwxNzc1NCwxNzg2MCwxNzkwNSwxNzk1NywxNzk2NCwxODA5MCwxODEyMiw0LDIsMTE0LDExNywxNzcwMCwxNzcwNiwxMDMsMTAxLDExNiw1OSwxLDg5ODIsNTksMSw5NjQsMTE0LDEwNyw1OSwxLDkxNDAsNCwzLDk3LDEwMSwxMjEsMTc3MjIsMTc3MjgsMTc3MzQsMTE0LDExMSwxMTAsNTksMSwzNTcsMTAwLDEwNSwxMDgsNTksMSwzNTUsNTksMSwxMDkwLDExMSwxMTYsNTksMSw4NDExLDEwOCwxMTQsMTAxLDk5LDU5LDEsODk4MSwxMTQsNTksMyw1NTM0OSw1NjYyNSw0LDQsMTAxLDEwNSwxMDcsMTExLDE3NzY0LDE3ODA1LDE3ODM2LDE3ODUxLDQsMiwxMTQsMTE2LDE3NzcwLDE3Nzg2LDEwMSw0LDIsNTIsMTAyLDE3Nzc3LDE3NzgwLDU5LDEsODc1NiwxMTEsMTE0LDEwMSw1OSwxLDg3NTYsOTcsNCwzLDU5LDExNSwxMTgsMTc3OTUsMTc3OTcsMTc4MDIsMSw5NTIsMTIxLDEwOSw1OSwxLDk3Nyw1OSwxLDk3Nyw0LDIsOTksMTEwLDE3ODExLDE3ODMxLDEwNyw0LDIsOTcsMTE1LDE3ODE4LDE3ODI2LDExMiwxMTIsMTE0LDExMSwxMjAsNTksMSw4Nzc2LDEwNSwxMDksNTksMSw4NzY0LDExNSwxMTIsNTksMSw4MjAxLDQsMiw5NywxMTUsMTc4NDIsMTc4NDYsMTEyLDU5LDEsODc3NiwxMDUsMTA5LDU5LDEsODc2NCwxMTQsMTEwLDUsMjU0LDEsNTksMTc4NTgsMSwyNTQsNCwzLDEwOCwxMDksMTEwLDE3ODY4LDE3ODczLDE3OTAxLDEwMCwxMDEsNTksMSw3MzIsMTAxLDExNSw1LDIxNSwzLDU5LDk4LDEwMCwxNzg4NCwxNzg4NiwxNzg5OCwxLDIxNSw0LDIsNTksOTcsMTc4OTIsMTc4OTQsMSw4ODY0LDExNCw1OSwxLDEwODAxLDU5LDEsMTA4MDAsMTE2LDU5LDEsODc0OSw0LDMsMTAxLDExMiwxMTUsMTc5MTMsMTc5MTcsMTc5NTMsOTcsNTksMSwxMDUzNiw0LDQsNTksOTgsOTksMTAyLDE3OTI3LDE3OTI5LDE3OTM0LDE3OTM5LDEsODg2OCwxMTEsMTE2LDU5LDEsOTAxNCwxMDUsMTE0LDU5LDEsMTA5OTMsNCwyLDU5LDExMSwxNzk0NSwxNzk0OCwzLDU1MzQ5LDU2Njc3LDExNCwxMDcsNTksMSwxMDk3MCw5Nyw1OSwxLDEwNTM3LDExNCwxMDUsMTA5LDEwMSw1OSwxLDgyNDQsNCwzLDk3LDEwNSwxMTIsMTc5NzIsMTc5NzcsMTgwODIsMTAwLDEwMSw1OSwxLDg0ODIsNCw3LDk3LDEwMCwxMDEsMTA5LDExMiwxMTUsMTE2LDE3OTkzLDE4MDUxLDE4MDU2LDE4MDU5LDE4MDY2LDE4MDcyLDE4MDc2LDExMCwxMDMsMTA4LDEwMSw0LDUsNTksMTAwLDEwOCwxMTMsMTE0LDE4MDA5LDE4MDExLDE4MDE3LDE4MDMyLDE4MDM1LDEsOTY1MywxMTEsMTE5LDExMCw1OSwxLDk2NjMsMTAxLDEwMiwxMTYsNCwyLDU5LDEwMSwxODAyNiwxODAyOCwxLDk2NjcsMTEzLDU5LDEsODg4NCw1OSwxLDg3OTYsMTA1LDEwMywxMDQsMTE2LDQsMiw1OSwxMDEsMTgwNDUsMTgwNDcsMSw5NjU3LDExMyw1OSwxLDg4ODUsMTExLDExNiw1OSwxLDk3MDgsNTksMSw4Nzk2LDEwNSwxMTAsMTE3LDExNSw1OSwxLDEwODEwLDEwOCwxMTcsMTE1LDU5LDEsMTA4MDksOTgsNTksMSwxMDcwMSwxMDUsMTA5LDEwMSw1OSwxLDEwODExLDEwMSwxMjIsMTA1LDExNywxMDksNTksMSw5MTg2LDQsMyw5OSwxMDQsMTE2LDE4MDk4LDE4MTExLDE4MTE2LDQsMiwxMTQsMTIxLDE4MTA0LDE4MTA4LDU5LDMsNTUzNDksNTY1MjEsNTksMSwxMDk0LDk5LDEyMSw1OSwxLDExMTUsMTE0LDExMSwxMDcsNTksMSwzNTksNCwyLDEwNSwxMTEsMTgxMjgsMTgxMzMsMTIwLDExNiw1OSwxLDg4MTIsMTA0LDEwMSw5NywxMDAsNCwyLDEwOCwxMTQsMTgxNDMsMTgxNTQsMTAxLDEwMiwxMTYsOTcsMTE0LDExNCwxMTEsMTE5LDU5LDEsODYwNiwxMDUsMTAzLDEwNCwxMTYsOTcsMTE0LDExNCwxMTEsMTE5LDU5LDEsODYwOCw0LDE4LDY1LDcyLDk3LDk4LDk5LDEwMCwxMDIsMTAzLDEwNCwxMDgsMTA5LDExMSwxMTIsMTE0LDExNSwxMTYsMTE3LDExOSwxODIwNCwxODIwOSwxODIxNCwxODIzNCwxODI1MCwxODI2OCwxODI5MiwxODMwOCwxODMxOSwxODM0MywxODM3OSwxODM5NywxODQxMywxODUwNCwxODU0NywxODU1MywxODU4NCwxODYwMywxMTQsMTE0LDU5LDEsODY1Nyw5NywxMTQsNTksMSwxMDU5NSw0LDIsOTksMTE0LDE4MjIwLDE4MjMwLDExNywxMTYsMTAxLDUsMjUwLDEsNTksMTgyMjgsMSwyNTAsMTE0LDU5LDEsODU5MywxMTQsNCwyLDk5LDEwMSwxODI0MSwxODI0NSwxMjEsNTksMSwxMTE4LDExOCwxMDEsNTksMSwzNjUsNCwyLDEwNSwxMjEsMTgyNTYsMTgyNjUsMTE0LDk5LDUsMjUxLDEsNTksMTgyNjMsMSwyNTEsNTksMSwxMDkxLDQsMyw5Nyw5OCwxMDQsMTgyNzYsMTgyODEsMTgyODcsMTE0LDExNCw1OSwxLDg2NDUsMTA4LDk3LDk5LDU5LDEsMzY5LDk3LDExNCw1OSwxLDEwNjA2LDQsMiwxMDUsMTE0LDE4Mjk4LDE4MzA0LDExNSwxMDQsMTE2LDU5LDEsMTA2MjIsNTksMyw1NTM0OSw1NjYyNiwxMTQsOTcsMTE4LDEwMSw1LDI0OSwxLDU5LDE4MzE3LDEsMjQ5LDQsMiw5Nyw5OCwxODMyNSwxODMzOCwxMTQsNCwyLDEwOCwxMTQsMTgzMzIsMTgzMzUsNTksMSw4NjM5LDU5LDEsODYzOCwxMDgsMTA3LDU5LDEsOTYwMCw0LDIsOTksMTE2LDE4MzQ5LDE4Mzc0LDQsMiwxMTEsMTE0LDE4MzU1LDE4MzY5LDExNCwxMTAsNCwyLDU5LDEwMSwxODM2MywxODM2NSwxLDg5ODgsMTE0LDU5LDEsODk4OCwxMTEsMTEyLDU5LDEsODk3NSwxMTQsMTA1LDU5LDEsOTcyMCw0LDIsOTcsMTA4LDE4Mzg1LDE4MzkwLDk5LDExNCw1OSwxLDM2Myw1LDE2OCwxLDU5LDE4Mzk1LDEsMTY4LDQsMiwxMDMsMTEyLDE4NDAzLDE4NDA4LDExMSwxMTAsNTksMSwzNzEsMTAyLDU5LDMsNTUzNDksNTY2NzgsNCw2LDk3LDEwMCwxMDQsMTA4LDExNSwxMTcsMTg0MjcsMTg0MzQsMTg0NDUsMTg0NzAsMTg0NzUsMTg0OTQsMTE0LDExNCwxMTEsMTE5LDU5LDEsODU5MywxMTEsMTE5LDExMCw5NywxMTQsMTE0LDExMSwxMTksNTksMSw4NTk3LDk3LDExNCwxMTIsMTExLDExMSwxMTAsNCwyLDEwOCwxMTQsMTg0NTcsMTg0NjMsMTAxLDEwMiwxMTYsNTksMSw4NjM5LDEwNSwxMDMsMTA0LDExNiw1OSwxLDg2MzgsMTE3LDExNSw1OSwxLDg4NDYsMTA1LDQsMyw1OSwxMDQsMTA4LDE4NDg0LDE4NDg2LDE4NDg5LDEsOTY1LDU5LDEsOTc4LDExMSwxMTAsNTksMSw5NjUsMTEyLDk3LDExNCwxMTQsMTExLDExOSwxMTUsNTksMSw4NjQ4LDQsMyw5OSwxMDUsMTE2LDE4NTEyLDE4NTM3LDE4NTQyLDQsMiwxMTEsMTE0LDE4NTE4LDE4NTMyLDExNCwxMTAsNCwyLDU5LDEwMSwxODUyNiwxODUyOCwxLDg5ODksMTE0LDU5LDEsODk4OSwxMTEsMTEyLDU5LDEsODk3NCwxMTAsMTAzLDU5LDEsMzY3LDExNCwxMDUsNTksMSw5NzIxLDk5LDExNCw1OSwzLDU1MzQ5LDU2NTIyLDQsMywxMDAsMTA1LDExNCwxODU2MSwxODU2NiwxODU3MiwxMTEsMTE2LDU5LDEsODk0NCwxMDgsMTAwLDEwMSw1OSwxLDM2MSwxMDUsNCwyLDU5LDEwMiwxODU3OSwxODU4MSwxLDk2NTMsNTksMSw5NjUyLDQsMiw5NywxMDksMTg1OTAsMTg1OTUsMTE0LDExNCw1OSwxLDg2NDgsMTA4LDUsMjUyLDEsNTksMTg2MDEsMSwyNTIsOTcsMTEwLDEwMywxMDgsMTAxLDU5LDEsMTA2NjMsNCwxNSw2NSw2Niw2OCw5Nyw5OSwxMDAsMTAxLDEwMiwxMDgsMTEwLDExMSwxMTIsMTE0LDExNSwxMjIsMTg2NDMsMTg2NDgsMTg2NjEsMTg2NjcsMTg4NDcsMTg4NTEsMTg4NTcsMTg5MDQsMTg5MDksMTg5MTUsMTg5MzEsMTg5MzcsMTg5NDMsMTg5NDksMTg5OTYsMTE0LDExNCw1OSwxLDg2NjEsOTcsMTE0LDQsMiw1OSwxMTgsMTg2NTYsMTg2NTgsMSwxMDk4NCw1OSwxLDEwOTg1LDk3LDExNSwxMDQsNTksMSw4ODcyLDQsMiwxMTAsMTE0LDE4NjczLDE4Njc5LDEwMywxMTQsMTE2LDU5LDEsMTA2NTIsNCw3LDEwMSwxMDcsMTEwLDExMiwxMTQsMTE1LDExNiwxODY5NSwxODcwNCwxODcxMSwxODcyMCwxODc0MiwxODc1NCwxODgxMCwxMTIsMTE1LDEwNSwxMDgsMTExLDExMCw1OSwxLDEwMTMsOTcsMTEyLDExMiw5Nyw1OSwxLDEwMDgsMTExLDExNiwxMDQsMTA1LDExMCwxMDMsNTksMSw4NzA5LDQsMywxMDQsMTA1LDExNCwxODcyOCwxODczMiwxODczNSwxMDUsNTksMSw5ODEsNTksMSw5ODIsMTExLDExMiwxMTYsMTExLDU5LDEsODczMyw0LDIsNTksMTA0LDE4NzQ4LDE4NzUwLDEsODU5NywxMTEsNTksMSwxMDA5LDQsMiwxMDUsMTE3LDE4NzYwLDE4NzY2LDEwMywxMDksOTcsNTksMSw5NjIsNCwyLDk4LDExMiwxODc3MiwxODc5MSwxMTUsMTAxLDExNiwxMTAsMTAxLDExMyw0LDIsNTksMTEzLDE4Nzg0LDE4Nzg3LDMsODg0Miw2NTAyNCw1OSwzLDEwOTU1LDY1MDI0LDExNSwxMDEsMTE2LDExMCwxMDEsMTEzLDQsMiw1OSwxMTMsMTg4MDMsMTg4MDYsMyw4ODQzLDY1MDI0LDU5LDMsMTA5NTYsNjUwMjQsNCwyLDEwNCwxMTQsMTg4MTYsMTg4MjIsMTAxLDExNiw5Nyw1OSwxLDk3NywxMDUsOTcsMTEwLDEwMywxMDgsMTAxLDQsMiwxMDgsMTE0LDE4ODM0LDE4ODQwLDEwMSwxMDIsMTE2LDU5LDEsODg4MiwxMDUsMTAzLDEwNCwxMTYsNTksMSw4ODgzLDEyMSw1OSwxLDEwNzQsOTcsMTE1LDEwNCw1OSwxLDg4NjYsNCwzLDEwMSwxMDgsMTE0LDE4ODY1LDE4ODg0LDE4ODkwLDQsMyw1OSw5OCwxMDEsMTg4NzMsMTg4NzUsMTg4ODAsMSw4NzQ0LDk3LDExNCw1OSwxLDg4OTEsMTEzLDU5LDEsODc5NCwxMDgsMTA1LDExMiw1OSwxLDg5NDIsNCwyLDk4LDExNiwxODg5NiwxODkwMSw5NywxMTQsNTksMSwxMjQsNTksMSwxMjQsMTE0LDU5LDMsNTUzNDksNTY2MjcsMTE2LDExNCwxMDUsNTksMSw4ODgyLDExNSwxMTcsNCwyLDk4LDExMiwxODkyMywxODkyNyw1OSwzLDg4MzQsODQwMiw1OSwzLDg4MzUsODQwMiwxMTIsMTAyLDU5LDMsNTUzNDksNTY2NzksMTE0LDExMSwxMTIsNTksMSw4NzMzLDExNiwxMTQsMTA1LDU5LDEsODg4Myw0LDIsOTksMTE3LDE4OTU1LDE4OTYwLDExNCw1OSwzLDU1MzQ5LDU2NTIzLDQsMiw5OCwxMTIsMTg5NjYsMTg5ODEsMTEwLDQsMiw2OSwxMDEsMTg5NzMsMTg5NzcsNTksMywxMDk1NSw2NTAyNCw1OSwzLDg4NDIsNjUwMjQsMTEwLDQsMiw2OSwxMDEsMTg5ODgsMTg5OTIsNTksMywxMDk1Niw2NTAyNCw1OSwzLDg4NDMsNjUwMjQsMTA1LDEwMywxMjIsOTcsMTAzLDU5LDEsMTA2NTAsNCw3LDk5LDEwMSwxMDIsMTExLDExMiwxMTQsMTE1LDE5MDIwLDE5MDI2LDE5MDYxLDE5MDY2LDE5MDcyLDE5MDc1LDE5MDg5LDEwNSwxMTQsOTksNTksMSwzNzMsNCwyLDEwMCwxMDUsMTkwMzIsMTkwNTUsNCwyLDk4LDEwMywxOTAzOCwxOTA0Myw5NywxMTQsNTksMSwxMDg0NywxMDEsNCwyLDU5LDExMywxOTA1MCwxOTA1MiwxLDg3NDMsNTksMSw4NzkzLDEwMSwxMTQsMTEyLDU5LDEsODQ3MiwxMTQsNTksMyw1NTM0OSw1NjYyOCwxMTIsMTAyLDU5LDMsNTUzNDksNTY2ODAsNTksMSw4NDcyLDQsMiw1OSwxMDEsMTkwODEsMTkwODMsMSw4NzY4LDk3LDExNiwxMDQsNTksMSw4NzY4LDk5LDExNCw1OSwzLDU1MzQ5LDU2NTI0LDQsMTQsOTksMTAwLDEwMiwxMDQsMTA1LDEwOCwxMDksMTEwLDExMSwxMTQsMTE1LDExNywxMTgsMTE5LDE5MTI1LDE5MTQ2LDE5MTUyLDE5MTU3LDE5MTczLDE5MTc2LDE5MTkyLDE5MTk3LDE5MjAyLDE5MjM2LDE5MjUyLDE5MjY5LDE5Mjg2LDE5MjkxLDQsMyw5NywxMDUsMTE3LDE5MTMzLDE5MTM3LDE5MTQyLDExMiw1OSwxLDg4OTgsMTE0LDk5LDU5LDEsOTcxMSwxMTIsNTksMSw4ODk5LDExNiwxMTQsMTA1LDU5LDEsOTY2MSwxMTQsNTksMyw1NTM0OSw1NjYyOSw0LDIsNjUsOTcsMTkxNjMsMTkxNjgsMTE0LDExNCw1OSwxLDEwMjM0LDExNCwxMTQsNTksMSwxMDIzMSw1OSwxLDk1OCw0LDIsNjUsOTcsMTkxODIsMTkxODcsMTE0LDExNCw1OSwxLDEwMjMyLDExNCwxMTQsNTksMSwxMDIyOSw5NywxMTIsNTksMSwxMDIzNiwxMDUsMTE1LDU5LDEsODk1NSw0LDMsMTAwLDExMiwxMTYsMTkyMTAsMTkyMTUsMTkyMzAsMTExLDExNiw1OSwxLDEwNzUyLDQsMiwxMDIsMTA4LDE5MjIxLDE5MjI1LDU5LDMsNTUzNDksNTY2ODEsMTE3LDExNSw1OSwxLDEwNzUzLDEwNSwxMDksMTAxLDU5LDEsMTA3NTQsNCwyLDY1LDk3LDE5MjQyLDE5MjQ3LDExNCwxMTQsNTksMSwxMDIzMywxMTQsMTE0LDU5LDEsMTAyMzAsNCwyLDk5LDExMywxOTI1OCwxOTI2MywxMTQsNTksMyw1NTM0OSw1NjUyNSw5OSwxMTcsMTEyLDU5LDEsMTA3NTgsNCwyLDExMiwxMTYsMTkyNzUsMTkyODEsMTA4LDExNywxMTUsNTksMSwxMDc1NiwxMTQsMTA1LDU5LDEsOTY1MSwxMDEsMTAxLDU5LDEsODg5NywxMDEsMTAwLDEwMywxMDEsNTksMSw4ODk2LDQsOCw5Nyw5OSwxMDEsMTAyLDEwNSwxMTEsMTE1LDExNywxOTMxNiwxOTMzNSwxOTM0OSwxOTM1NywxOTM2MiwxOTM2NywxOTM3MywxOTM3OSw5OSw0LDIsMTE3LDEyMSwxOTMyMywxOTMzMiwxMTYsMTAxLDUsMjUzLDEsNTksMTkzMzAsMSwyNTMsNTksMSwxMTAzLDQsMiwxMDUsMTIxLDE5MzQxLDE5MzQ2LDExNCw5OSw1OSwxLDM3NSw1OSwxLDEwOTksMTEwLDUsMTY1LDEsNTksMTkzNTUsMSwxNjUsMTE0LDU5LDMsNTUzNDksNTY2MzAsOTksMTIxLDU5LDEsMTExMSwxMTIsMTAyLDU5LDMsNTUzNDksNTY2ODIsOTksMTE0LDU5LDMsNTUzNDksNTY1MjYsNCwyLDk5LDEwOSwxOTM4NSwxOTM4OSwxMjEsNTksMSwxMTAyLDEwOCw1LDI1NSwxLDU5LDE5Mzk1LDEsMjU1LDQsMTAsOTcsOTksMTAwLDEwMSwxMDIsMTA0LDEwNSwxMTEsMTE1LDExOSwxOTQxOSwxOTQyNiwxOTQ0MSwxOTQ0NiwxOTQ2MiwxOTQ2NywxOTQ3MiwxOTQ4MCwxOTQ4NiwxOTQ5Miw5OSwxMTcsMTE2LDEwMSw1OSwxLDM3OCw0LDIsOTcsMTIxLDE5NDMyLDE5NDM4LDExNCwxMTEsMTEwLDU5LDEsMzgyLDU5LDEsMTA3OSwxMTEsMTE2LDU5LDEsMzgwLDQsMiwxMDEsMTE2LDE5NDUyLDE5NDU4LDExNiwxMTQsMTAyLDU5LDEsODQ4OCw5Nyw1OSwxLDk1MCwxMTQsNTksMyw1NTM0OSw1NjYzMSw5OSwxMjEsNTksMSwxMDc4LDEwMywxMTQsOTcsMTE0LDExNCw1OSwxLDg2NjksMTEyLDEwMiw1OSwzLDU1MzQ5LDU2NjgzLDk5LDExNCw1OSwzLDU1MzQ5LDU2NTI3LDQsMiwxMDYsMTEwLDE5NDk4LDE5NTAxLDU5LDEsODIwNSwxMDYsNTksMSw4MjA0XSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB1bmljb2RlID0gcmVxdWlyZSgnLi4vY29tbW9uL3VuaWNvZGUnKTtcbmNvbnN0IEVSUiA9IHJlcXVpcmUoJy4uL2NvbW1vbi9lcnJvci1jb2RlcycpO1xuXG4vL0FsaWFzZXNcbmNvbnN0ICQgPSB1bmljb2RlLkNPREVfUE9JTlRTO1xuXG4vL0NvbnN0XG5jb25zdCBERUZBVUxUX0JVRkZFUl9XQVRFUkxJTkUgPSAxIDw8IDE2O1xuXG4vL1ByZXByb2Nlc3NvclxuLy9OT1RFOiBIVE1MIGlucHV0IHByZXByb2Nlc3Npbmdcbi8vKHNlZTogaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2UvcGFyc2luZy5odG1sI3ByZXByb2Nlc3NpbmctdGhlLWlucHV0LXN0cmVhbSlcbmNsYXNzIFByZXByb2Nlc3NvciB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuaHRtbCA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5wb3MgPSAtMTtcbiAgICAgICAgdGhpcy5sYXN0R2FwUG9zID0gLTE7XG4gICAgICAgIHRoaXMubGFzdENoYXJQb3MgPSAtMTtcblxuICAgICAgICB0aGlzLmdhcFN0YWNrID0gW107XG5cbiAgICAgICAgdGhpcy5za2lwTmV4dE5ld0xpbmUgPSBmYWxzZTtcblxuICAgICAgICB0aGlzLmxhc3RDaHVua1dyaXR0ZW4gPSBmYWxzZTtcbiAgICAgICAgdGhpcy5lbmRPZkNodW5rSGl0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuYnVmZmVyV2F0ZXJsaW5lID0gREVGQVVMVF9CVUZGRVJfV0FURVJMSU5FO1xuICAgIH1cblxuICAgIF9lcnIoKSB7XG4gICAgICAgIC8vIE5PVEU6IGVyciByZXBvcnRpbmcgaXMgbm9vcCBieSBkZWZhdWx0LiBFbmFibGVkIGJ5IG1peGluLlxuICAgIH1cblxuICAgIF9hZGRHYXAoKSB7XG4gICAgICAgIHRoaXMuZ2FwU3RhY2sucHVzaCh0aGlzLmxhc3RHYXBQb3MpO1xuICAgICAgICB0aGlzLmxhc3RHYXBQb3MgPSB0aGlzLnBvcztcbiAgICB9XG5cbiAgICBfcHJvY2Vzc1N1cnJvZ2F0ZShjcCkge1xuICAgICAgICAvL05PVEU6IHRyeSB0byBwZWVrIGEgc3Vycm9nYXRlIHBhaXJcbiAgICAgICAgaWYgKHRoaXMucG9zICE9PSB0aGlzLmxhc3RDaGFyUG9zKSB7XG4gICAgICAgICAgICBjb25zdCBuZXh0Q3AgPSB0aGlzLmh0bWwuY2hhckNvZGVBdCh0aGlzLnBvcyArIDEpO1xuXG4gICAgICAgICAgICBpZiAodW5pY29kZS5pc1N1cnJvZ2F0ZVBhaXIobmV4dENwKSkge1xuICAgICAgICAgICAgICAgIC8vTk9URTogd2UgaGF2ZSBhIHN1cnJvZ2F0ZSBwYWlyLiBQZWVrIHBhaXIgY2hhcmFjdGVyIGFuZCByZWNhbGN1bGF0ZSBjb2RlIHBvaW50LlxuICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XG5cbiAgICAgICAgICAgICAgICAvL05PVEU6IGFkZCBnYXAgdGhhdCBzaG91bGQgYmUgYXZvaWRlZCBkdXJpbmcgcmV0cmVhdFxuICAgICAgICAgICAgICAgIHRoaXMuX2FkZEdhcCgpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuaWNvZGUuZ2V0U3Vycm9nYXRlUGFpckNvZGVQb2ludChjcCwgbmV4dENwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vTk9URTogd2UgYXJlIGF0IHRoZSBlbmQgb2YgYSBjaHVuaywgdGhlcmVmb3JlIHdlIGNhbid0IGluZmVyIHN1cnJvZ2F0ZSBwYWlyIHlldC5cbiAgICAgICAgZWxzZSBpZiAoIXRoaXMubGFzdENodW5rV3JpdHRlbikge1xuICAgICAgICAgICAgdGhpcy5lbmRPZkNodW5rSGl0ID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiAkLkVPRjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vTk9URTogaXNvbGF0ZWQgc3Vycm9nYXRlXG4gICAgICAgIHRoaXMuX2VycihFUlIuc3Vycm9nYXRlSW5JbnB1dFN0cmVhbSk7XG5cbiAgICAgICAgcmV0dXJuIGNwO1xuICAgIH1cblxuICAgIGRyb3BQYXJzZWRDaHVuaygpIHtcbiAgICAgICAgaWYgKHRoaXMucG9zID4gdGhpcy5idWZmZXJXYXRlcmxpbmUpIHtcbiAgICAgICAgICAgIHRoaXMubGFzdENoYXJQb3MgLT0gdGhpcy5wb3M7XG4gICAgICAgICAgICB0aGlzLmh0bWwgPSB0aGlzLmh0bWwuc3Vic3RyaW5nKHRoaXMucG9zKTtcbiAgICAgICAgICAgIHRoaXMucG9zID0gMDtcbiAgICAgICAgICAgIHRoaXMubGFzdEdhcFBvcyA9IC0xO1xuICAgICAgICAgICAgdGhpcy5nYXBTdGFjayA9IFtdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgd3JpdGUoY2h1bmssIGlzTGFzdENodW5rKSB7XG4gICAgICAgIGlmICh0aGlzLmh0bWwpIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbCArPSBjaHVuaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbCA9IGNodW5rO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sYXN0Q2hhclBvcyA9IHRoaXMuaHRtbC5sZW5ndGggLSAxO1xuICAgICAgICB0aGlzLmVuZE9mQ2h1bmtIaXQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5sYXN0Q2h1bmtXcml0dGVuID0gaXNMYXN0Q2h1bms7XG4gICAgfVxuXG4gICAgaW5zZXJ0SHRtbEF0Q3VycmVudFBvcyhjaHVuaykge1xuICAgICAgICB0aGlzLmh0bWwgPSB0aGlzLmh0bWwuc3Vic3RyaW5nKDAsIHRoaXMucG9zICsgMSkgKyBjaHVuayArIHRoaXMuaHRtbC5zdWJzdHJpbmcodGhpcy5wb3MgKyAxLCB0aGlzLmh0bWwubGVuZ3RoKTtcblxuICAgICAgICB0aGlzLmxhc3RDaGFyUG9zID0gdGhpcy5odG1sLmxlbmd0aCAtIDE7XG4gICAgICAgIHRoaXMuZW5kT2ZDaHVua0hpdCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGFkdmFuY2UoKSB7XG4gICAgICAgIHRoaXMucG9zKys7XG5cbiAgICAgICAgaWYgKHRoaXMucG9zID4gdGhpcy5sYXN0Q2hhclBvcykge1xuICAgICAgICAgICAgdGhpcy5lbmRPZkNodW5rSGl0ID0gIXRoaXMubGFzdENodW5rV3JpdHRlbjtcbiAgICAgICAgICAgIHJldHVybiAkLkVPRjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjcCA9IHRoaXMuaHRtbC5jaGFyQ29kZUF0KHRoaXMucG9zKTtcblxuICAgICAgICAvL05PVEU6IGFueSBVKzAwMEEgTElORSBGRUVEIChMRikgY2hhcmFjdGVycyB0aGF0IGltbWVkaWF0ZWx5IGZvbGxvdyBhIFUrMDAwRCBDQVJSSUFHRSBSRVRVUk4gKENSKSBjaGFyYWN0ZXJcbiAgICAgICAgLy9tdXN0IGJlIGlnbm9yZWQuXG4gICAgICAgIGlmICh0aGlzLnNraXBOZXh0TmV3TGluZSAmJiBjcCA9PT0gJC5MSU5FX0ZFRUQpIHtcbiAgICAgICAgICAgIHRoaXMuc2tpcE5leHROZXdMaW5lID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9hZGRHYXAoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vTk9URTogYWxsIFUrMDAwRCBDQVJSSUFHRSBSRVRVUk4gKENSKSBjaGFyYWN0ZXJzIG11c3QgYmUgY29udmVydGVkIHRvIFUrMDAwQSBMSU5FIEZFRUQgKExGKSBjaGFyYWN0ZXJzXG4gICAgICAgIGlmIChjcCA9PT0gJC5DQVJSSUFHRV9SRVRVUk4pIHtcbiAgICAgICAgICAgIHRoaXMuc2tpcE5leHROZXdMaW5lID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiAkLkxJTkVfRkVFRDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2tpcE5leHROZXdMaW5lID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHVuaWNvZGUuaXNTdXJyb2dhdGUoY3ApKSB7XG4gICAgICAgICAgICBjcCA9IHRoaXMuX3Byb2Nlc3NTdXJyb2dhdGUoY3ApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9PUFRJTUlaQVRJT046IGZpcnN0IGNoZWNrIGlmIGNvZGUgcG9pbnQgaXMgaW4gdGhlIGNvbW1vbiBhbGxvd2VkXG4gICAgICAgIC8vcmFuZ2UgKEFTQ0lJIGFscGhhbnVtZXJpYywgd2hpdGVzcGFjZXMsIGJpZyBjaHVuayBvZiBCTVApXG4gICAgICAgIC8vYmVmb3JlIGdvaW5nIGludG8gZGV0YWlsZWQgcGVyZm9ybWFuY2UgY29zdCB2YWxpZGF0aW9uLlxuICAgICAgICBjb25zdCBpc0NvbW1vblZhbGlkUmFuZ2UgPVxuICAgICAgICAgICAgKGNwID4gMHgxZiAmJiBjcCA8IDB4N2YpIHx8IGNwID09PSAkLkxJTkVfRkVFRCB8fCBjcCA9PT0gJC5DQVJSSUFHRV9SRVRVUk4gfHwgKGNwID4gMHg5ZiAmJiBjcCA8IDB4ZmRkMCk7XG5cbiAgICAgICAgaWYgKCFpc0NvbW1vblZhbGlkUmFuZ2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2NoZWNrRm9yUHJvYmxlbWF0aWNDaGFyYWN0ZXJzKGNwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjcDtcbiAgICB9XG5cbiAgICBfY2hlY2tGb3JQcm9ibGVtYXRpY0NoYXJhY3RlcnMoY3ApIHtcbiAgICAgICAgaWYgKHVuaWNvZGUuaXNDb250cm9sQ29kZVBvaW50KGNwKSkge1xuICAgICAgICAgICAgdGhpcy5fZXJyKEVSUi5jb250cm9sQ2hhcmFjdGVySW5JbnB1dFN0cmVhbSk7XG4gICAgICAgIH0gZWxzZSBpZiAodW5pY29kZS5pc1VuZGVmaW5lZENvZGVQb2ludChjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihFUlIubm9uY2hhcmFjdGVySW5JbnB1dFN0cmVhbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXRyZWF0KCkge1xuICAgICAgICBpZiAodGhpcy5wb3MgPT09IHRoaXMubGFzdEdhcFBvcykge1xuICAgICAgICAgICAgdGhpcy5sYXN0R2FwUG9zID0gdGhpcy5nYXBTdGFjay5wb3AoKTtcbiAgICAgICAgICAgIHRoaXMucG9zLS07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnBvcy0tO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQcmVwcm9jZXNzb3I7XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgRE9DVU1FTlRfTU9ERSB9ID0gcmVxdWlyZSgnLi4vY29tbW9uL2h0bWwnKTtcblxuLy9Ob2RlIGNvbnN0cnVjdGlvblxuZXhwb3J0cy5jcmVhdGVEb2N1bWVudCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIG5vZGVOYW1lOiAnI2RvY3VtZW50JyxcbiAgICAgICAgbW9kZTogRE9DVU1FTlRfTU9ERS5OT19RVUlSS1MsXG4gICAgICAgIGNoaWxkTm9kZXM6IFtdXG4gICAgfTtcbn07XG5cbmV4cG9ydHMuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIG5vZGVOYW1lOiAnI2RvY3VtZW50LWZyYWdtZW50JyxcbiAgICAgICAgY2hpbGROb2RlczogW11cbiAgICB9O1xufTtcblxuZXhwb3J0cy5jcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24odGFnTmFtZSwgbmFtZXNwYWNlVVJJLCBhdHRycykge1xuICAgIHJldHVybiB7XG4gICAgICAgIG5vZGVOYW1lOiB0YWdOYW1lLFxuICAgICAgICB0YWdOYW1lOiB0YWdOYW1lLFxuICAgICAgICBhdHRyczogYXR0cnMsXG4gICAgICAgIG5hbWVzcGFjZVVSSTogbmFtZXNwYWNlVVJJLFxuICAgICAgICBjaGlsZE5vZGVzOiBbXSxcbiAgICAgICAgcGFyZW50Tm9kZTogbnVsbFxuICAgIH07XG59O1xuXG5leHBvcnRzLmNyZWF0ZUNvbW1lbnROb2RlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIG5vZGVOYW1lOiAnI2NvbW1lbnQnLFxuICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICBwYXJlbnROb2RlOiBudWxsXG4gICAgfTtcbn07XG5cbmNvbnN0IGNyZWF0ZVRleHROb2RlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBub2RlTmFtZTogJyN0ZXh0JyxcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBwYXJlbnROb2RlOiBudWxsXG4gICAgfTtcbn07XG5cbi8vVHJlZSBtdXRhdGlvblxuY29uc3QgYXBwZW5kQ2hpbGQgPSAoZXhwb3J0cy5hcHBlbmRDaGlsZCA9IGZ1bmN0aW9uKHBhcmVudE5vZGUsIG5ld05vZGUpIHtcbiAgICBwYXJlbnROb2RlLmNoaWxkTm9kZXMucHVzaChuZXdOb2RlKTtcbiAgICBuZXdOb2RlLnBhcmVudE5vZGUgPSBwYXJlbnROb2RlO1xufSk7XG5cbmNvbnN0IGluc2VydEJlZm9yZSA9IChleHBvcnRzLmluc2VydEJlZm9yZSA9IGZ1bmN0aW9uKHBhcmVudE5vZGUsIG5ld05vZGUsIHJlZmVyZW5jZU5vZGUpIHtcbiAgICBjb25zdCBpbnNlcnRpb25JZHggPSBwYXJlbnROb2RlLmNoaWxkTm9kZXMuaW5kZXhPZihyZWZlcmVuY2VOb2RlKTtcblxuICAgIHBhcmVudE5vZGUuY2hpbGROb2Rlcy5zcGxpY2UoaW5zZXJ0aW9uSWR4LCAwLCBuZXdOb2RlKTtcbiAgICBuZXdOb2RlLnBhcmVudE5vZGUgPSBwYXJlbnROb2RlO1xufSk7XG5cbmV4cG9ydHMuc2V0VGVtcGxhdGVDb250ZW50ID0gZnVuY3Rpb24odGVtcGxhdGVFbGVtZW50LCBjb250ZW50RWxlbWVudCkge1xuICAgIHRlbXBsYXRlRWxlbWVudC5jb250ZW50ID0gY29udGVudEVsZW1lbnQ7XG59O1xuXG5leHBvcnRzLmdldFRlbXBsYXRlQ29udGVudCA9IGZ1bmN0aW9uKHRlbXBsYXRlRWxlbWVudCkge1xuICAgIHJldHVybiB0ZW1wbGF0ZUVsZW1lbnQuY29udGVudDtcbn07XG5cbmV4cG9ydHMuc2V0RG9jdW1lbnRUeXBlID0gZnVuY3Rpb24oZG9jdW1lbnQsIG5hbWUsIHB1YmxpY0lkLCBzeXN0ZW1JZCkge1xuICAgIGxldCBkb2N0eXBlTm9kZSA9IG51bGw7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRvY3VtZW50LmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGRvY3VtZW50LmNoaWxkTm9kZXNbaV0ubm9kZU5hbWUgPT09ICcjZG9jdW1lbnRUeXBlJykge1xuICAgICAgICAgICAgZG9jdHlwZU5vZGUgPSBkb2N1bWVudC5jaGlsZE5vZGVzW2ldO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZG9jdHlwZU5vZGUpIHtcbiAgICAgICAgZG9jdHlwZU5vZGUubmFtZSA9IG5hbWU7XG4gICAgICAgIGRvY3R5cGVOb2RlLnB1YmxpY0lkID0gcHVibGljSWQ7XG4gICAgICAgIGRvY3R5cGVOb2RlLnN5c3RlbUlkID0gc3lzdGVtSWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYXBwZW5kQ2hpbGQoZG9jdW1lbnQsIHtcbiAgICAgICAgICAgIG5vZGVOYW1lOiAnI2RvY3VtZW50VHlwZScsXG4gICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgcHVibGljSWQ6IHB1YmxpY0lkLFxuICAgICAgICAgICAgc3lzdGVtSWQ6IHN5c3RlbUlkXG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuc2V0RG9jdW1lbnRNb2RlID0gZnVuY3Rpb24oZG9jdW1lbnQsIG1vZGUpIHtcbiAgICBkb2N1bWVudC5tb2RlID0gbW9kZTtcbn07XG5cbmV4cG9ydHMuZ2V0RG9jdW1lbnRNb2RlID0gZnVuY3Rpb24oZG9jdW1lbnQpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQubW9kZTtcbn07XG5cbmV4cG9ydHMuZGV0YWNoTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBpZiAobm9kZS5wYXJlbnROb2RlKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IG5vZGUucGFyZW50Tm9kZS5jaGlsZE5vZGVzLmluZGV4T2Yobm9kZSk7XG5cbiAgICAgICAgbm9kZS5wYXJlbnROb2RlLmNoaWxkTm9kZXMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIG5vZGUucGFyZW50Tm9kZSA9IG51bGw7XG4gICAgfVxufTtcblxuZXhwb3J0cy5pbnNlcnRUZXh0ID0gZnVuY3Rpb24ocGFyZW50Tm9kZSwgdGV4dCkge1xuICAgIGlmIChwYXJlbnROb2RlLmNoaWxkTm9kZXMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IHByZXZOb2RlID0gcGFyZW50Tm9kZS5jaGlsZE5vZGVzW3BhcmVudE5vZGUuY2hpbGROb2Rlcy5sZW5ndGggLSAxXTtcblxuICAgICAgICBpZiAocHJldk5vZGUubm9kZU5hbWUgPT09ICcjdGV4dCcpIHtcbiAgICAgICAgICAgIHByZXZOb2RlLnZhbHVlICs9IHRleHQ7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhcHBlbmRDaGlsZChwYXJlbnROb2RlLCBjcmVhdGVUZXh0Tm9kZSh0ZXh0KSk7XG59O1xuXG5leHBvcnRzLmluc2VydFRleHRCZWZvcmUgPSBmdW5jdGlvbihwYXJlbnROb2RlLCB0ZXh0LCByZWZlcmVuY2VOb2RlKSB7XG4gICAgY29uc3QgcHJldk5vZGUgPSBwYXJlbnROb2RlLmNoaWxkTm9kZXNbcGFyZW50Tm9kZS5jaGlsZE5vZGVzLmluZGV4T2YocmVmZXJlbmNlTm9kZSkgLSAxXTtcblxuICAgIGlmIChwcmV2Tm9kZSAmJiBwcmV2Tm9kZS5ub2RlTmFtZSA9PT0gJyN0ZXh0Jykge1xuICAgICAgICBwcmV2Tm9kZS52YWx1ZSArPSB0ZXh0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGluc2VydEJlZm9yZShwYXJlbnROb2RlLCBjcmVhdGVUZXh0Tm9kZSh0ZXh0KSwgcmVmZXJlbmNlTm9kZSk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5hZG9wdEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihyZWNpcGllbnQsIGF0dHJzKSB7XG4gICAgY29uc3QgcmVjaXBpZW50QXR0cnNNYXAgPSBbXTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVjaXBpZW50LmF0dHJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHJlY2lwaWVudEF0dHJzTWFwLnB1c2gocmVjaXBpZW50LmF0dHJzW2ldLm5hbWUpO1xuICAgIH1cblxuICAgIGZvciAobGV0IGogPSAwOyBqIDwgYXR0cnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKHJlY2lwaWVudEF0dHJzTWFwLmluZGV4T2YoYXR0cnNbal0ubmFtZSkgPT09IC0xKSB7XG4gICAgICAgICAgICByZWNpcGllbnQuYXR0cnMucHVzaChhdHRyc1tqXSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vL1RyZWUgdHJhdmVyc2luZ1xuZXhwb3J0cy5nZXRGaXJzdENoaWxkID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHJldHVybiBub2RlLmNoaWxkTm9kZXNbMF07XG59O1xuXG5leHBvcnRzLmdldENoaWxkTm9kZXMgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUuY2hpbGROb2Rlcztcbn07XG5cbmV4cG9ydHMuZ2V0UGFyZW50Tm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5wYXJlbnROb2RlO1xufTtcblxuZXhwb3J0cy5nZXRBdHRyTGlzdCA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudC5hdHRycztcbn07XG5cbi8vTm9kZSBkYXRhXG5leHBvcnRzLmdldFRhZ05hbWUgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgcmV0dXJuIGVsZW1lbnQudGFnTmFtZTtcbn07XG5cbmV4cG9ydHMuZ2V0TmFtZXNwYWNlVVJJID0gZnVuY3Rpb24oZWxlbWVudCkge1xuICAgIHJldHVybiBlbGVtZW50Lm5hbWVzcGFjZVVSSTtcbn07XG5cbmV4cG9ydHMuZ2V0VGV4dE5vZGVDb250ZW50ID0gZnVuY3Rpb24odGV4dE5vZGUpIHtcbiAgICByZXR1cm4gdGV4dE5vZGUudmFsdWU7XG59O1xuXG5leHBvcnRzLmdldENvbW1lbnROb2RlQ29udGVudCA9IGZ1bmN0aW9uKGNvbW1lbnROb2RlKSB7XG4gICAgcmV0dXJuIGNvbW1lbnROb2RlLmRhdGE7XG59O1xuXG5leHBvcnRzLmdldERvY3VtZW50VHlwZU5vZGVOYW1lID0gZnVuY3Rpb24oZG9jdHlwZU5vZGUpIHtcbiAgICByZXR1cm4gZG9jdHlwZU5vZGUubmFtZTtcbn07XG5cbmV4cG9ydHMuZ2V0RG9jdW1lbnRUeXBlTm9kZVB1YmxpY0lkID0gZnVuY3Rpb24oZG9jdHlwZU5vZGUpIHtcbiAgICByZXR1cm4gZG9jdHlwZU5vZGUucHVibGljSWQ7XG59O1xuXG5leHBvcnRzLmdldERvY3VtZW50VHlwZU5vZGVTeXN0ZW1JZCA9IGZ1bmN0aW9uKGRvY3R5cGVOb2RlKSB7XG4gICAgcmV0dXJuIGRvY3R5cGVOb2RlLnN5c3RlbUlkO1xufTtcblxuLy9Ob2RlIHR5cGVzXG5leHBvcnRzLmlzVGV4dE5vZGUgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUubm9kZU5hbWUgPT09ICcjdGV4dCc7XG59O1xuXG5leHBvcnRzLmlzQ29tbWVudE5vZGUgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUubm9kZU5hbWUgPT09ICcjY29tbWVudCc7XG59O1xuXG5leHBvcnRzLmlzRG9jdW1lbnRUeXBlTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5ub2RlTmFtZSA9PT0gJyNkb2N1bWVudFR5cGUnO1xufTtcblxuZXhwb3J0cy5pc0VsZW1lbnROb2RlID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHJldHVybiAhIW5vZGUudGFnTmFtZTtcbn07XG5cbi8vIFNvdXJjZSBjb2RlIGxvY2F0aW9uXG5leHBvcnRzLnNldE5vZGVTb3VyY2VDb2RlTG9jYXRpb24gPSBmdW5jdGlvbihub2RlLCBsb2NhdGlvbikge1xuICAgIG5vZGUuc291cmNlQ29kZUxvY2F0aW9uID0gbG9jYXRpb247XG59O1xuXG5leHBvcnRzLmdldE5vZGVTb3VyY2VDb2RlTG9jYXRpb24gPSBmdW5jdGlvbihub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUuc291cmNlQ29kZUxvY2F0aW9uO1xufTtcblxuZXhwb3J0cy51cGRhdGVOb2RlU291cmNlQ29kZUxvY2F0aW9uID0gZnVuY3Rpb24obm9kZSwgZW5kTG9jYXRpb24pIHtcbiAgICBub2RlLnNvdXJjZUNvZGVMb2NhdGlvbiA9IE9iamVjdC5hc3NpZ24obm9kZS5zb3VyY2VDb2RlTG9jYXRpb24sIGVuZExvY2F0aW9uKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbWVyZ2VPcHRpb25zKGRlZmF1bHRzLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwgT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIHJldHVybiBbZGVmYXVsdHMsIG9wdGlvbnNdLnJlZHVjZSgobWVyZ2VkLCBvcHRPYmopID0+IHtcbiAgICAgICAgT2JqZWN0LmtleXMob3B0T2JqKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBtZXJnZWRba2V5XSA9IG9wdE9ialtrZXldO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gbWVyZ2VkO1xuICAgIH0sIE9iamVjdC5jcmVhdGUobnVsbCkpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY2xhc3MgTWl4aW4ge1xuICAgIGNvbnN0cnVjdG9yKGhvc3QpIHtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxNZXRob2RzID0ge307XG4gICAgICAgIGNvbnN0IG92ZXJyaWRkZW5NZXRob2RzID0gdGhpcy5fZ2V0T3ZlcnJpZGRlbk1ldGhvZHModGhpcywgb3JpZ2luYWxNZXRob2RzKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhvdmVycmlkZGVuTWV0aG9kcykpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3ZlcnJpZGRlbk1ldGhvZHNba2V5XSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIG9yaWdpbmFsTWV0aG9kc1trZXldID0gaG9zdFtrZXldO1xuICAgICAgICAgICAgICAgIGhvc3Rba2V5XSA9IG92ZXJyaWRkZW5NZXRob2RzW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBfZ2V0T3ZlcnJpZGRlbk1ldGhvZHMoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG4gICAgfVxufVxuXG5NaXhpbi5pbnN0YWxsID0gZnVuY3Rpb24oaG9zdCwgQ3Rvciwgb3B0cykge1xuICAgIGlmICghaG9zdC5fX21peGlucykge1xuICAgICAgICBob3N0Ll9fbWl4aW5zID0gW107XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBob3N0Ll9fbWl4aW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChob3N0Ll9fbWl4aW5zW2ldLmNvbnN0cnVjdG9yID09PSBDdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gaG9zdC5fX21peGluc1tpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG1peGluID0gbmV3IEN0b3IoaG9zdCwgb3B0cyk7XG5cbiAgICBob3N0Ll9fbWl4aW5zLnB1c2gobWl4aW4pO1xuXG4gICAgcmV0dXJuIG1peGluO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbjtcbiJdfQ==
