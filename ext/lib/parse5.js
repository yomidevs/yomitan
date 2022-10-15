(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.parse5 = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeXML = exports.decodeHTMLStrict = exports.decodeHTML = exports.determineBranch = exports.BinTrieFlags = exports.fromCodePoint = exports.replaceCodePoint = exports.decodeCodePoint = exports.xmlDecodeTree = exports.htmlDecodeTree = void 0;
var decode_data_html_js_1 = __importDefault(require("./generated/decode-data-html.js"));
exports.htmlDecodeTree = decode_data_html_js_1.default;
var decode_data_xml_js_1 = __importDefault(require("./generated/decode-data-xml.js"));
exports.xmlDecodeTree = decode_data_xml_js_1.default;
var decode_codepoint_js_1 = __importDefault(require("./decode_codepoint.js"));
exports.decodeCodePoint = decode_codepoint_js_1.default;
var decode_codepoint_js_2 = require("./decode_codepoint.js");
Object.defineProperty(exports, "replaceCodePoint", { enumerable: true, get: function () { return decode_codepoint_js_2.replaceCodePoint; } });
Object.defineProperty(exports, "fromCodePoint", { enumerable: true, get: function () { return decode_codepoint_js_2.fromCodePoint; } });
var CharCodes;
(function (CharCodes) {
    CharCodes[CharCodes["NUM"] = 35] = "NUM";
    CharCodes[CharCodes["SEMI"] = 59] = "SEMI";
    CharCodes[CharCodes["ZERO"] = 48] = "ZERO";
    CharCodes[CharCodes["NINE"] = 57] = "NINE";
    CharCodes[CharCodes["LOWER_A"] = 97] = "LOWER_A";
    CharCodes[CharCodes["LOWER_F"] = 102] = "LOWER_F";
    CharCodes[CharCodes["LOWER_X"] = 120] = "LOWER_X";
    /** Bit that needs to be set to convert an upper case ASCII character to lower case */
    CharCodes[CharCodes["To_LOWER_BIT"] = 32] = "To_LOWER_BIT";
})(CharCodes || (CharCodes = {}));
var BinTrieFlags;
(function (BinTrieFlags) {
    BinTrieFlags[BinTrieFlags["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
    BinTrieFlags[BinTrieFlags["BRANCH_LENGTH"] = 16256] = "BRANCH_LENGTH";
    BinTrieFlags[BinTrieFlags["JUMP_TABLE"] = 127] = "JUMP_TABLE";
})(BinTrieFlags = exports.BinTrieFlags || (exports.BinTrieFlags = {}));
function getDecoder(decodeTree) {
    return function decodeHTMLBinary(str, strict) {
        var ret = "";
        var lastIdx = 0;
        var strIdx = 0;
        while ((strIdx = str.indexOf("&", strIdx)) >= 0) {
            ret += str.slice(lastIdx, strIdx);
            lastIdx = strIdx;
            // Skip the "&"
            strIdx += 1;
            // If we have a numeric entity, handle this separately.
            if (str.charCodeAt(strIdx) === CharCodes.NUM) {
                // Skip the leading "&#". For hex entities, also skip the leading "x".
                var start = strIdx + 1;
                var base = 10;
                var cp = str.charCodeAt(start);
                if ((cp | CharCodes.To_LOWER_BIT) === CharCodes.LOWER_X) {
                    base = 16;
                    strIdx += 1;
                    start += 1;
                }
                do
                    cp = str.charCodeAt(++strIdx);
                while ((cp >= CharCodes.ZERO && cp <= CharCodes.NINE) ||
                    (base === 16 &&
                        (cp | CharCodes.To_LOWER_BIT) >= CharCodes.LOWER_A &&
                        (cp | CharCodes.To_LOWER_BIT) <= CharCodes.LOWER_F));
                if (start !== strIdx) {
                    var entity = str.substring(start, strIdx);
                    var parsed = parseInt(entity, base);
                    if (str.charCodeAt(strIdx) === CharCodes.SEMI) {
                        strIdx += 1;
                    }
                    else if (strict) {
                        continue;
                    }
                    ret += (0, decode_codepoint_js_1.default)(parsed);
                    lastIdx = strIdx;
                }
                continue;
            }
            var resultIdx = 0;
            var excess = 1;
            var treeIdx = 0;
            var current = decodeTree[treeIdx];
            for (; strIdx < str.length; strIdx++, excess++) {
                treeIdx = determineBranch(decodeTree, current, treeIdx + 1, str.charCodeAt(strIdx));
                if (treeIdx < 0)
                    break;
                current = decodeTree[treeIdx];
                var masked = current & BinTrieFlags.VALUE_LENGTH;
                // If the branch is a value, store it and continue
                if (masked) {
                    // If we have a legacy entity while parsing strictly, just skip the number of bytes
                    if (!strict || str.charCodeAt(strIdx) === CharCodes.SEMI) {
                        resultIdx = treeIdx;
                        excess = 0;
                    }
                    // The mask is the number of bytes of the value, including the current byte.
                    var valueLength = (masked >> 14) - 1;
                    if (valueLength === 0)
                        break;
                    treeIdx += valueLength;
                }
            }
            if (resultIdx !== 0) {
                var valueLength = (decodeTree[resultIdx] & BinTrieFlags.VALUE_LENGTH) >> 14;
                ret +=
                    valueLength === 1
                        ? String.fromCharCode(decodeTree[resultIdx] & ~BinTrieFlags.VALUE_LENGTH)
                        : valueLength === 2
                            ? String.fromCharCode(decodeTree[resultIdx + 1])
                            : String.fromCharCode(decodeTree[resultIdx + 1], decodeTree[resultIdx + 2]);
                lastIdx = strIdx - excess + 1;
            }
        }
        return ret + str.slice(lastIdx);
    };
}
function determineBranch(decodeTree, current, nodeIdx, char) {
    var branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
    var jumpOffset = current & BinTrieFlags.JUMP_TABLE;
    // Case 1: Single branch encoded in jump offset
    if (branchCount === 0) {
        return jumpOffset !== 0 && char === jumpOffset ? nodeIdx : -1;
    }
    // Case 2: Multiple branches encoded in jump table
    if (jumpOffset) {
        var value = char - jumpOffset;
        return value < 0 || value >= branchCount
            ? -1
            : decodeTree[nodeIdx + value] - 1;
    }
    // Case 3: Multiple branches encoded in dictionary
    // Binary search for the character.
    var lo = nodeIdx;
    var hi = lo + branchCount - 1;
    while (lo <= hi) {
        var mid = (lo + hi) >>> 1;
        var midVal = decodeTree[mid];
        if (midVal < char) {
            lo = mid + 1;
        }
        else if (midVal > char) {
            hi = mid - 1;
        }
        else {
            return decodeTree[mid + branchCount];
        }
    }
    return -1;
}
exports.determineBranch = determineBranch;
var htmlDecoder = getDecoder(decode_data_html_js_1.default);
var xmlDecoder = getDecoder(decode_data_xml_js_1.default);
/**
 * Decodes an HTML string, allowing for entities not terminated by a semi-colon.
 *
 * @param str The string to decode.
 * @returns The decoded string.
 */
function decodeHTML(str) {
    return htmlDecoder(str, false);
}
exports.decodeHTML = decodeHTML;
/**
 * Decodes an HTML string, requiring all entities to be terminated by a semi-colon.
 *
 * @param str The string to decode.
 * @returns The decoded string.
 */
function decodeHTMLStrict(str) {
    return htmlDecoder(str, true);
}
exports.decodeHTMLStrict = decodeHTMLStrict;
/**
 * Decodes an XML string, requiring all entities to be terminated by a semi-colon.
 *
 * @param str The string to decode.
 * @returns The decoded string.
 */
function decodeXML(str) {
    return xmlDecoder(str, true);
}
exports.decodeXML = decodeXML;

},{"./decode_codepoint.js":2,"./generated/decode-data-html.js":4,"./generated/decode-data-xml.js":5}],2:[function(require,module,exports){
"use strict";
// Adapted from https://github.com/mathiasbynens/he/blob/36afe179392226cf1b6ccdb16ebbb7a5a844d93a/src/he.js#L106-L134
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceCodePoint = exports.fromCodePoint = void 0;
var decodeMap = new Map([
    [0, 65533],
    [128, 8364],
    [130, 8218],
    [131, 402],
    [132, 8222],
    [133, 8230],
    [134, 8224],
    [135, 8225],
    [136, 710],
    [137, 8240],
    [138, 352],
    [139, 8249],
    [140, 338],
    [142, 381],
    [145, 8216],
    [146, 8217],
    [147, 8220],
    [148, 8221],
    [149, 8226],
    [150, 8211],
    [151, 8212],
    [152, 732],
    [153, 8482],
    [154, 353],
    [155, 8250],
    [156, 339],
    [158, 382],
    [159, 376],
]);
exports.fromCodePoint = 
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, node/no-unsupported-features/es-builtins
(_a = String.fromCodePoint) !== null && _a !== void 0 ? _a : function (codePoint) {
    var output = "";
    if (codePoint > 0xffff) {
        codePoint -= 0x10000;
        output += String.fromCharCode(((codePoint >>> 10) & 0x3ff) | 0xd800);
        codePoint = 0xdc00 | (codePoint & 0x3ff);
    }
    output += String.fromCharCode(codePoint);
    return output;
};
function replaceCodePoint(codePoint) {
    var _a;
    if ((codePoint >= 0xd800 && codePoint <= 0xdfff) || codePoint > 0x10ffff) {
        return 0xfffd;
    }
    return (_a = decodeMap.get(codePoint)) !== null && _a !== void 0 ? _a : codePoint;
}
exports.replaceCodePoint = replaceCodePoint;
function decodeCodePoint(codePoint) {
    return (0, exports.fromCodePoint)(replaceCodePoint(codePoint));
}
exports.default = decodeCodePoint;

},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeText = exports.escapeAttribute = exports.escapeUTF8 = exports.escape = exports.encodeXML = exports.getCodePoint = exports.xmlReplacer = void 0;
exports.xmlReplacer = /["&'<>$\x80-\uFFFF]/g;
var xmlCodeMap = new Map([
    [34, "&quot;"],
    [38, "&amp;"],
    [39, "&apos;"],
    [60, "&lt;"],
    [62, "&gt;"],
]);
// For compatibility with node < 4, we wrap `codePointAt`
exports.getCodePoint = 
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
String.prototype.codePointAt != null
    ? function (str, index) { return str.codePointAt(index); }
    : // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        function (c, index) {
            return (c.charCodeAt(index) & 0xfc00) === 0xd800
                ? (c.charCodeAt(index) - 0xd800) * 0x400 +
                    c.charCodeAt(index + 1) -
                    0xdc00 +
                    0x10000
                : c.charCodeAt(index);
        };
/**
 * Encodes all non-ASCII characters, as well as characters not valid in XML
 * documents using XML entities.
 *
 * If a character has no equivalent entity, a
 * numeric hexadecimal reference (eg. `&#xfc;`) will be used.
 */
function encodeXML(str) {
    var ret = "";
    var lastIdx = 0;
    var match;
    while ((match = exports.xmlReplacer.exec(str)) !== null) {
        var i = match.index;
        var char = str.charCodeAt(i);
        var next = xmlCodeMap.get(char);
        if (next !== undefined) {
            ret += str.substring(lastIdx, i) + next;
            lastIdx = i + 1;
        }
        else {
            ret += "".concat(str.substring(lastIdx, i), "&#x").concat((0, exports.getCodePoint)(str, i).toString(16), ";");
            // Increase by 1 if we have a surrogate pair
            lastIdx = exports.xmlReplacer.lastIndex += Number((char & 0xfc00) === 0xd800);
        }
    }
    return ret + str.substr(lastIdx);
}
exports.encodeXML = encodeXML;
/**
 * Encodes all non-ASCII characters, as well as characters not valid in XML
 * documents using numeric hexadecimal reference (eg. `&#xfc;`).
 *
 * Have a look at `escapeUTF8` if you want a more concise output at the expense
 * of reduced transportability.
 *
 * @param data String to escape.
 */
exports.escape = encodeXML;
function getEscaper(regex, map) {
    return function escape(data) {
        var match;
        var lastIdx = 0;
        var result = "";
        while ((match = regex.exec(data))) {
            if (lastIdx !== match.index) {
                result += data.substring(lastIdx, match.index);
            }
            // We know that this chararcter will be in the map.
            result += map.get(match[0].charCodeAt(0));
            // Every match will be of length 1
            lastIdx = match.index + 1;
        }
        return result + data.substring(lastIdx);
    };
}
/**
 * Encodes all characters not valid in XML documents using XML entities.
 *
 * Note that the output will be character-set dependent.
 *
 * @param data String to escape.
 */
exports.escapeUTF8 = getEscaper(/[&<>'"]/g, xmlCodeMap);
/**
 * Encodes all characters that have to be escaped in HTML attributes,
 * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
 *
 * @param data String to escape.
 */
exports.escapeAttribute = getEscaper(/["&\u00A0]/g, new Map([
    [34, "&quot;"],
    [38, "&amp;"],
    [160, "&nbsp;"],
]));
/**
 * Encodes all characters that have to be escaped in HTML text,
 * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
 *
 * @param data String to escape.
 */
exports.escapeText = getEscaper(/[&<>\u00A0]/g, new Map([
    [38, "&amp;"],
    [60, "&lt;"],
    [62, "&gt;"],
    [160, "&nbsp;"],
]));

},{}],4:[function(require,module,exports){
"use strict";
// Generated using scripts/write-decode-map.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = new Uint16Array(
// prettier-ignore
"\u1d41<\xd5\u0131\u028a\u049d\u057b\u05d0\u0675\u06de\u07a2\u07d6\u080f\u0a4a\u0a91\u0da1\u0e6d\u0f09\u0f26\u10ca\u1228\u12e1\u1415\u149d\u14c3\u14df\u1525\0\0\0\0\0\0\u156b\u16cd\u198d\u1c12\u1ddd\u1f7e\u2060\u21b0\u228d\u23c0\u23fb\u2442\u2824\u2912\u2d08\u2e48\u2fce\u3016\u32ba\u3639\u37ac\u38fe\u3a28\u3a71\u3ae0\u3b2e\u0800EMabcfglmnoprstu\\bfms\x7f\x84\x8b\x90\x95\x98\xa6\xb3\xb9\xc8\xcflig\u803b\xc6\u40c6P\u803b&\u4026cute\u803b\xc1\u40c1reve;\u4102\u0100iyx}rc\u803b\xc2\u40c2;\u4410r;\uc000\ud835\udd04rave\u803b\xc0\u40c0pha;\u4391acr;\u4100d;\u6a53\u0100gp\x9d\xa1on;\u4104f;\uc000\ud835\udd38plyFunction;\u6061ing\u803b\xc5\u40c5\u0100cs\xbe\xc3r;\uc000\ud835\udc9cign;\u6254ilde\u803b\xc3\u40c3ml\u803b\xc4\u40c4\u0400aceforsu\xe5\xfb\xfe\u0117\u011c\u0122\u0127\u012a\u0100cr\xea\xf2kslash;\u6216\u0176\xf6\xf8;\u6ae7ed;\u6306y;\u4411\u0180crt\u0105\u010b\u0114ause;\u6235noullis;\u612ca;\u4392r;\uc000\ud835\udd05pf;\uc000\ud835\udd39eve;\u42d8c\xf2\u0113mpeq;\u624e\u0700HOacdefhilorsu\u014d\u0151\u0156\u0180\u019e\u01a2\u01b5\u01b7\u01ba\u01dc\u0215\u0273\u0278\u027ecy;\u4427PY\u803b\xa9\u40a9\u0180cpy\u015d\u0162\u017aute;\u4106\u0100;i\u0167\u0168\u62d2talDifferentialD;\u6145leys;\u612d\u0200aeio\u0189\u018e\u0194\u0198ron;\u410cdil\u803b\xc7\u40c7rc;\u4108nint;\u6230ot;\u410a\u0100dn\u01a7\u01adilla;\u40b8terDot;\u40b7\xf2\u017fi;\u43a7rcle\u0200DMPT\u01c7\u01cb\u01d1\u01d6ot;\u6299inus;\u6296lus;\u6295imes;\u6297o\u0100cs\u01e2\u01f8kwiseContourIntegral;\u6232eCurly\u0100DQ\u0203\u020foubleQuote;\u601duote;\u6019\u0200lnpu\u021e\u0228\u0247\u0255on\u0100;e\u0225\u0226\u6237;\u6a74\u0180git\u022f\u0236\u023aruent;\u6261nt;\u622fourIntegral;\u622e\u0100fr\u024c\u024e;\u6102oduct;\u6210nterClockwiseContourIntegral;\u6233oss;\u6a2fcr;\uc000\ud835\udc9ep\u0100;C\u0284\u0285\u62d3ap;\u624d\u0580DJSZacefios\u02a0\u02ac\u02b0\u02b4\u02b8\u02cb\u02d7\u02e1\u02e6\u0333\u048d\u0100;o\u0179\u02a5trahd;\u6911cy;\u4402cy;\u4405cy;\u440f\u0180grs\u02bf\u02c4\u02c7ger;\u6021r;\u61a1hv;\u6ae4\u0100ay\u02d0\u02d5ron;\u410e;\u4414l\u0100;t\u02dd\u02de\u6207a;\u4394r;\uc000\ud835\udd07\u0100af\u02eb\u0327\u0100cm\u02f0\u0322ritical\u0200ADGT\u0300\u0306\u0316\u031ccute;\u40b4o\u0174\u030b\u030d;\u42d9bleAcute;\u42ddrave;\u4060ilde;\u42dcond;\u62c4ferentialD;\u6146\u0470\u033d\0\0\0\u0342\u0354\0\u0405f;\uc000\ud835\udd3b\u0180;DE\u0348\u0349\u034d\u40a8ot;\u60dcqual;\u6250ble\u0300CDLRUV\u0363\u0372\u0382\u03cf\u03e2\u03f8ontourIntegra\xec\u0239o\u0274\u0379\0\0\u037b\xbb\u0349nArrow;\u61d3\u0100eo\u0387\u03a4ft\u0180ART\u0390\u0396\u03a1rrow;\u61d0ightArrow;\u61d4e\xe5\u02cang\u0100LR\u03ab\u03c4eft\u0100AR\u03b3\u03b9rrow;\u67f8ightArrow;\u67faightArrow;\u67f9ight\u0100AT\u03d8\u03derrow;\u61d2ee;\u62a8p\u0241\u03e9\0\0\u03efrrow;\u61d1ownArrow;\u61d5erticalBar;\u6225n\u0300ABLRTa\u0412\u042a\u0430\u045e\u047f\u037crrow\u0180;BU\u041d\u041e\u0422\u6193ar;\u6913pArrow;\u61f5reve;\u4311eft\u02d2\u043a\0\u0446\0\u0450ightVector;\u6950eeVector;\u695eector\u0100;B\u0459\u045a\u61bdar;\u6956ight\u01d4\u0467\0\u0471eeVector;\u695fector\u0100;B\u047a\u047b\u61c1ar;\u6957ee\u0100;A\u0486\u0487\u62a4rrow;\u61a7\u0100ct\u0492\u0497r;\uc000\ud835\udc9frok;\u4110\u0800NTacdfglmopqstux\u04bd\u04c0\u04c4\u04cb\u04de\u04e2\u04e7\u04ee\u04f5\u0521\u052f\u0536\u0552\u055d\u0560\u0565G;\u414aH\u803b\xd0\u40d0cute\u803b\xc9\u40c9\u0180aiy\u04d2\u04d7\u04dcron;\u411arc\u803b\xca\u40ca;\u442dot;\u4116r;\uc000\ud835\udd08rave\u803b\xc8\u40c8ement;\u6208\u0100ap\u04fa\u04fecr;\u4112ty\u0253\u0506\0\0\u0512mallSquare;\u65fberySmallSquare;\u65ab\u0100gp\u0526\u052aon;\u4118f;\uc000\ud835\udd3csilon;\u4395u\u0100ai\u053c\u0549l\u0100;T\u0542\u0543\u6a75ilde;\u6242librium;\u61cc\u0100ci\u0557\u055ar;\u6130m;\u6a73a;\u4397ml\u803b\xcb\u40cb\u0100ip\u056a\u056fsts;\u6203onentialE;\u6147\u0280cfios\u0585\u0588\u058d\u05b2\u05ccy;\u4424r;\uc000\ud835\udd09lled\u0253\u0597\0\0\u05a3mallSquare;\u65fcerySmallSquare;\u65aa\u0370\u05ba\0\u05bf\0\0\u05c4f;\uc000\ud835\udd3dAll;\u6200riertrf;\u6131c\xf2\u05cb\u0600JTabcdfgorst\u05e8\u05ec\u05ef\u05fa\u0600\u0612\u0616\u061b\u061d\u0623\u066c\u0672cy;\u4403\u803b>\u403emma\u0100;d\u05f7\u05f8\u4393;\u43dcreve;\u411e\u0180eiy\u0607\u060c\u0610dil;\u4122rc;\u411c;\u4413ot;\u4120r;\uc000\ud835\udd0a;\u62d9pf;\uc000\ud835\udd3eeater\u0300EFGLST\u0635\u0644\u064e\u0656\u065b\u0666qual\u0100;L\u063e\u063f\u6265ess;\u62dbullEqual;\u6267reater;\u6aa2ess;\u6277lantEqual;\u6a7eilde;\u6273cr;\uc000\ud835\udca2;\u626b\u0400Aacfiosu\u0685\u068b\u0696\u069b\u069e\u06aa\u06be\u06caRDcy;\u442a\u0100ct\u0690\u0694ek;\u42c7;\u405eirc;\u4124r;\u610clbertSpace;\u610b\u01f0\u06af\0\u06b2f;\u610dizontalLine;\u6500\u0100ct\u06c3\u06c5\xf2\u06a9rok;\u4126mp\u0144\u06d0\u06d8ownHum\xf0\u012fqual;\u624f\u0700EJOacdfgmnostu\u06fa\u06fe\u0703\u0707\u070e\u071a\u071e\u0721\u0728\u0744\u0778\u078b\u078f\u0795cy;\u4415lig;\u4132cy;\u4401cute\u803b\xcd\u40cd\u0100iy\u0713\u0718rc\u803b\xce\u40ce;\u4418ot;\u4130r;\u6111rave\u803b\xcc\u40cc\u0180;ap\u0720\u072f\u073f\u0100cg\u0734\u0737r;\u412ainaryI;\u6148lie\xf3\u03dd\u01f4\u0749\0\u0762\u0100;e\u074d\u074e\u622c\u0100gr\u0753\u0758ral;\u622bsection;\u62c2isible\u0100CT\u076c\u0772omma;\u6063imes;\u6062\u0180gpt\u077f\u0783\u0788on;\u412ef;\uc000\ud835\udd40a;\u4399cr;\u6110ilde;\u4128\u01eb\u079a\0\u079ecy;\u4406l\u803b\xcf\u40cf\u0280cfosu\u07ac\u07b7\u07bc\u07c2\u07d0\u0100iy\u07b1\u07b5rc;\u4134;\u4419r;\uc000\ud835\udd0dpf;\uc000\ud835\udd41\u01e3\u07c7\0\u07ccr;\uc000\ud835\udca5rcy;\u4408kcy;\u4404\u0380HJacfos\u07e4\u07e8\u07ec\u07f1\u07fd\u0802\u0808cy;\u4425cy;\u440cppa;\u439a\u0100ey\u07f6\u07fbdil;\u4136;\u441ar;\uc000\ud835\udd0epf;\uc000\ud835\udd42cr;\uc000\ud835\udca6\u0580JTaceflmost\u0825\u0829\u082c\u0850\u0863\u09b3\u09b8\u09c7\u09cd\u0a37\u0a47cy;\u4409\u803b<\u403c\u0280cmnpr\u0837\u083c\u0841\u0844\u084dute;\u4139bda;\u439bg;\u67ealacetrf;\u6112r;\u619e\u0180aey\u0857\u085c\u0861ron;\u413ddil;\u413b;\u441b\u0100fs\u0868\u0970t\u0500ACDFRTUVar\u087e\u08a9\u08b1\u08e0\u08e6\u08fc\u092f\u095b\u0390\u096a\u0100nr\u0883\u088fgleBracket;\u67e8row\u0180;BR\u0899\u089a\u089e\u6190ar;\u61e4ightArrow;\u61c6eiling;\u6308o\u01f5\u08b7\0\u08c3bleBracket;\u67e6n\u01d4\u08c8\0\u08d2eeVector;\u6961ector\u0100;B\u08db\u08dc\u61c3ar;\u6959loor;\u630aight\u0100AV\u08ef\u08f5rrow;\u6194ector;\u694e\u0100er\u0901\u0917e\u0180;AV\u0909\u090a\u0910\u62a3rrow;\u61a4ector;\u695aiangle\u0180;BE\u0924\u0925\u0929\u62b2ar;\u69cfqual;\u62b4p\u0180DTV\u0937\u0942\u094cownVector;\u6951eeVector;\u6960ector\u0100;B\u0956\u0957\u61bfar;\u6958ector\u0100;B\u0965\u0966\u61bcar;\u6952ight\xe1\u039cs\u0300EFGLST\u097e\u098b\u0995\u099d\u09a2\u09adqualGreater;\u62daullEqual;\u6266reater;\u6276ess;\u6aa1lantEqual;\u6a7dilde;\u6272r;\uc000\ud835\udd0f\u0100;e\u09bd\u09be\u62d8ftarrow;\u61daidot;\u413f\u0180npw\u09d4\u0a16\u0a1bg\u0200LRlr\u09de\u09f7\u0a02\u0a10eft\u0100AR\u09e6\u09ecrrow;\u67f5ightArrow;\u67f7ightArrow;\u67f6eft\u0100ar\u03b3\u0a0aight\xe1\u03bfight\xe1\u03caf;\uc000\ud835\udd43er\u0100LR\u0a22\u0a2ceftArrow;\u6199ightArrow;\u6198\u0180cht\u0a3e\u0a40\u0a42\xf2\u084c;\u61b0rok;\u4141;\u626a\u0400acefiosu\u0a5a\u0a5d\u0a60\u0a77\u0a7c\u0a85\u0a8b\u0a8ep;\u6905y;\u441c\u0100dl\u0a65\u0a6fiumSpace;\u605flintrf;\u6133r;\uc000\ud835\udd10nusPlus;\u6213pf;\uc000\ud835\udd44c\xf2\u0a76;\u439c\u0480Jacefostu\u0aa3\u0aa7\u0aad\u0ac0\u0b14\u0b19\u0d91\u0d97\u0d9ecy;\u440acute;\u4143\u0180aey\u0ab4\u0ab9\u0aberon;\u4147dil;\u4145;\u441d\u0180gsw\u0ac7\u0af0\u0b0eative\u0180MTV\u0ad3\u0adf\u0ae8ediumSpace;\u600bhi\u0100cn\u0ae6\u0ad8\xeb\u0ad9eryThi\xee\u0ad9ted\u0100GL\u0af8\u0b06reaterGreate\xf2\u0673essLes\xf3\u0a48Line;\u400ar;\uc000\ud835\udd11\u0200Bnpt\u0b22\u0b28\u0b37\u0b3areak;\u6060BreakingSpace;\u40a0f;\u6115\u0680;CDEGHLNPRSTV\u0b55\u0b56\u0b6a\u0b7c\u0ba1\u0beb\u0c04\u0c5e\u0c84\u0ca6\u0cd8\u0d61\u0d85\u6aec\u0100ou\u0b5b\u0b64ngruent;\u6262pCap;\u626doubleVerticalBar;\u6226\u0180lqx\u0b83\u0b8a\u0b9bement;\u6209ual\u0100;T\u0b92\u0b93\u6260ilde;\uc000\u2242\u0338ists;\u6204reater\u0380;EFGLST\u0bb6\u0bb7\u0bbd\u0bc9\u0bd3\u0bd8\u0be5\u626fqual;\u6271ullEqual;\uc000\u2267\u0338reater;\uc000\u226b\u0338ess;\u6279lantEqual;\uc000\u2a7e\u0338ilde;\u6275ump\u0144\u0bf2\u0bfdownHump;\uc000\u224e\u0338qual;\uc000\u224f\u0338e\u0100fs\u0c0a\u0c27tTriangle\u0180;BE\u0c1a\u0c1b\u0c21\u62eaar;\uc000\u29cf\u0338qual;\u62ecs\u0300;EGLST\u0c35\u0c36\u0c3c\u0c44\u0c4b\u0c58\u626equal;\u6270reater;\u6278ess;\uc000\u226a\u0338lantEqual;\uc000\u2a7d\u0338ilde;\u6274ested\u0100GL\u0c68\u0c79reaterGreater;\uc000\u2aa2\u0338essLess;\uc000\u2aa1\u0338recedes\u0180;ES\u0c92\u0c93\u0c9b\u6280qual;\uc000\u2aaf\u0338lantEqual;\u62e0\u0100ei\u0cab\u0cb9verseElement;\u620cghtTriangle\u0180;BE\u0ccb\u0ccc\u0cd2\u62ebar;\uc000\u29d0\u0338qual;\u62ed\u0100qu\u0cdd\u0d0cuareSu\u0100bp\u0ce8\u0cf9set\u0100;E\u0cf0\u0cf3\uc000\u228f\u0338qual;\u62e2erset\u0100;E\u0d03\u0d06\uc000\u2290\u0338qual;\u62e3\u0180bcp\u0d13\u0d24\u0d4eset\u0100;E\u0d1b\u0d1e\uc000\u2282\u20d2qual;\u6288ceeds\u0200;EST\u0d32\u0d33\u0d3b\u0d46\u6281qual;\uc000\u2ab0\u0338lantEqual;\u62e1ilde;\uc000\u227f\u0338erset\u0100;E\u0d58\u0d5b\uc000\u2283\u20d2qual;\u6289ilde\u0200;EFT\u0d6e\u0d6f\u0d75\u0d7f\u6241qual;\u6244ullEqual;\u6247ilde;\u6249erticalBar;\u6224cr;\uc000\ud835\udca9ilde\u803b\xd1\u40d1;\u439d\u0700Eacdfgmoprstuv\u0dbd\u0dc2\u0dc9\u0dd5\u0ddb\u0de0\u0de7\u0dfc\u0e02\u0e20\u0e22\u0e32\u0e3f\u0e44lig;\u4152cute\u803b\xd3\u40d3\u0100iy\u0dce\u0dd3rc\u803b\xd4\u40d4;\u441eblac;\u4150r;\uc000\ud835\udd12rave\u803b\xd2\u40d2\u0180aei\u0dee\u0df2\u0df6cr;\u414cga;\u43a9cron;\u439fpf;\uc000\ud835\udd46enCurly\u0100DQ\u0e0e\u0e1aoubleQuote;\u601cuote;\u6018;\u6a54\u0100cl\u0e27\u0e2cr;\uc000\ud835\udcaaash\u803b\xd8\u40d8i\u016c\u0e37\u0e3cde\u803b\xd5\u40d5es;\u6a37ml\u803b\xd6\u40d6er\u0100BP\u0e4b\u0e60\u0100ar\u0e50\u0e53r;\u603eac\u0100ek\u0e5a\u0e5c;\u63deet;\u63b4arenthesis;\u63dc\u0480acfhilors\u0e7f\u0e87\u0e8a\u0e8f\u0e92\u0e94\u0e9d\u0eb0\u0efcrtialD;\u6202y;\u441fr;\uc000\ud835\udd13i;\u43a6;\u43a0usMinus;\u40b1\u0100ip\u0ea2\u0eadncareplan\xe5\u069df;\u6119\u0200;eio\u0eb9\u0eba\u0ee0\u0ee4\u6abbcedes\u0200;EST\u0ec8\u0ec9\u0ecf\u0eda\u627aqual;\u6aaflantEqual;\u627cilde;\u627eme;\u6033\u0100dp\u0ee9\u0eeeuct;\u620fortion\u0100;a\u0225\u0ef9l;\u621d\u0100ci\u0f01\u0f06r;\uc000\ud835\udcab;\u43a8\u0200Ufos\u0f11\u0f16\u0f1b\u0f1fOT\u803b\"\u4022r;\uc000\ud835\udd14pf;\u611acr;\uc000\ud835\udcac\u0600BEacefhiorsu\u0f3e\u0f43\u0f47\u0f60\u0f73\u0fa7\u0faa\u0fad\u1096\u10a9\u10b4\u10bearr;\u6910G\u803b\xae\u40ae\u0180cnr\u0f4e\u0f53\u0f56ute;\u4154g;\u67ebr\u0100;t\u0f5c\u0f5d\u61a0l;\u6916\u0180aey\u0f67\u0f6c\u0f71ron;\u4158dil;\u4156;\u4420\u0100;v\u0f78\u0f79\u611cerse\u0100EU\u0f82\u0f99\u0100lq\u0f87\u0f8eement;\u620builibrium;\u61cbpEquilibrium;\u696fr\xbb\u0f79o;\u43a1ght\u0400ACDFTUVa\u0fc1\u0feb\u0ff3\u1022\u1028\u105b\u1087\u03d8\u0100nr\u0fc6\u0fd2gleBracket;\u67e9row\u0180;BL\u0fdc\u0fdd\u0fe1\u6192ar;\u61e5eftArrow;\u61c4eiling;\u6309o\u01f5\u0ff9\0\u1005bleBracket;\u67e7n\u01d4\u100a\0\u1014eeVector;\u695dector\u0100;B\u101d\u101e\u61c2ar;\u6955loor;\u630b\u0100er\u102d\u1043e\u0180;AV\u1035\u1036\u103c\u62a2rrow;\u61a6ector;\u695biangle\u0180;BE\u1050\u1051\u1055\u62b3ar;\u69d0qual;\u62b5p\u0180DTV\u1063\u106e\u1078ownVector;\u694feeVector;\u695cector\u0100;B\u1082\u1083\u61bear;\u6954ector\u0100;B\u1091\u1092\u61c0ar;\u6953\u0100pu\u109b\u109ef;\u611dndImplies;\u6970ightarrow;\u61db\u0100ch\u10b9\u10bcr;\u611b;\u61b1leDelayed;\u69f4\u0680HOacfhimoqstu\u10e4\u10f1\u10f7\u10fd\u1119\u111e\u1151\u1156\u1161\u1167\u11b5\u11bb\u11bf\u0100Cc\u10e9\u10eeHcy;\u4429y;\u4428FTcy;\u442ccute;\u415a\u0280;aeiy\u1108\u1109\u110e\u1113\u1117\u6abcron;\u4160dil;\u415erc;\u415c;\u4421r;\uc000\ud835\udd16ort\u0200DLRU\u112a\u1134\u113e\u1149ownArrow\xbb\u041eeftArrow\xbb\u089aightArrow\xbb\u0fddpArrow;\u6191gma;\u43a3allCircle;\u6218pf;\uc000\ud835\udd4a\u0272\u116d\0\0\u1170t;\u621aare\u0200;ISU\u117b\u117c\u1189\u11af\u65a1ntersection;\u6293u\u0100bp\u118f\u119eset\u0100;E\u1197\u1198\u628fqual;\u6291erset\u0100;E\u11a8\u11a9\u6290qual;\u6292nion;\u6294cr;\uc000\ud835\udcaear;\u62c6\u0200bcmp\u11c8\u11db\u1209\u120b\u0100;s\u11cd\u11ce\u62d0et\u0100;E\u11cd\u11d5qual;\u6286\u0100ch\u11e0\u1205eeds\u0200;EST\u11ed\u11ee\u11f4\u11ff\u627bqual;\u6ab0lantEqual;\u627dilde;\u627fTh\xe1\u0f8c;\u6211\u0180;es\u1212\u1213\u1223\u62d1rset\u0100;E\u121c\u121d\u6283qual;\u6287et\xbb\u1213\u0580HRSacfhiors\u123e\u1244\u1249\u1255\u125e\u1271\u1276\u129f\u12c2\u12c8\u12d1ORN\u803b\xde\u40deADE;\u6122\u0100Hc\u124e\u1252cy;\u440by;\u4426\u0100bu\u125a\u125c;\u4009;\u43a4\u0180aey\u1265\u126a\u126fron;\u4164dil;\u4162;\u4422r;\uc000\ud835\udd17\u0100ei\u127b\u1289\u01f2\u1280\0\u1287efore;\u6234a;\u4398\u0100cn\u128e\u1298kSpace;\uc000\u205f\u200aSpace;\u6009lde\u0200;EFT\u12ab\u12ac\u12b2\u12bc\u623cqual;\u6243ullEqual;\u6245ilde;\u6248pf;\uc000\ud835\udd4bipleDot;\u60db\u0100ct\u12d6\u12dbr;\uc000\ud835\udcafrok;\u4166\u0ae1\u12f7\u130e\u131a\u1326\0\u132c\u1331\0\0\0\0\0\u1338\u133d\u1377\u1385\0\u13ff\u1404\u140a\u1410\u0100cr\u12fb\u1301ute\u803b\xda\u40dar\u0100;o\u1307\u1308\u619fcir;\u6949r\u01e3\u1313\0\u1316y;\u440eve;\u416c\u0100iy\u131e\u1323rc\u803b\xdb\u40db;\u4423blac;\u4170r;\uc000\ud835\udd18rave\u803b\xd9\u40d9acr;\u416a\u0100di\u1341\u1369er\u0100BP\u1348\u135d\u0100ar\u134d\u1350r;\u405fac\u0100ek\u1357\u1359;\u63dfet;\u63b5arenthesis;\u63ddon\u0100;P\u1370\u1371\u62c3lus;\u628e\u0100gp\u137b\u137fon;\u4172f;\uc000\ud835\udd4c\u0400ADETadps\u1395\u13ae\u13b8\u13c4\u03e8\u13d2\u13d7\u13f3rrow\u0180;BD\u1150\u13a0\u13a4ar;\u6912ownArrow;\u61c5ownArrow;\u6195quilibrium;\u696eee\u0100;A\u13cb\u13cc\u62a5rrow;\u61a5own\xe1\u03f3er\u0100LR\u13de\u13e8eftArrow;\u6196ightArrow;\u6197i\u0100;l\u13f9\u13fa\u43d2on;\u43a5ing;\u416ecr;\uc000\ud835\udcb0ilde;\u4168ml\u803b\xdc\u40dc\u0480Dbcdefosv\u1427\u142c\u1430\u1433\u143e\u1485\u148a\u1490\u1496ash;\u62abar;\u6aeby;\u4412ash\u0100;l\u143b\u143c\u62a9;\u6ae6\u0100er\u1443\u1445;\u62c1\u0180bty\u144c\u1450\u147aar;\u6016\u0100;i\u144f\u1455cal\u0200BLST\u1461\u1465\u146a\u1474ar;\u6223ine;\u407ceparator;\u6758ilde;\u6240ThinSpace;\u600ar;\uc000\ud835\udd19pf;\uc000\ud835\udd4dcr;\uc000\ud835\udcb1dash;\u62aa\u0280cefos\u14a7\u14ac\u14b1\u14b6\u14bcirc;\u4174dge;\u62c0r;\uc000\ud835\udd1apf;\uc000\ud835\udd4ecr;\uc000\ud835\udcb2\u0200fios\u14cb\u14d0\u14d2\u14d8r;\uc000\ud835\udd1b;\u439epf;\uc000\ud835\udd4fcr;\uc000\ud835\udcb3\u0480AIUacfosu\u14f1\u14f5\u14f9\u14fd\u1504\u150f\u1514\u151a\u1520cy;\u442fcy;\u4407cy;\u442ecute\u803b\xdd\u40dd\u0100iy\u1509\u150drc;\u4176;\u442br;\uc000\ud835\udd1cpf;\uc000\ud835\udd50cr;\uc000\ud835\udcb4ml;\u4178\u0400Hacdefos\u1535\u1539\u153f\u154b\u154f\u155d\u1560\u1564cy;\u4416cute;\u4179\u0100ay\u1544\u1549ron;\u417d;\u4417ot;\u417b\u01f2\u1554\0\u155boWidt\xe8\u0ad9a;\u4396r;\u6128pf;\u6124cr;\uc000\ud835\udcb5\u0be1\u1583\u158a\u1590\0\u15b0\u15b6\u15bf\0\0\0\0\u15c6\u15db\u15eb\u165f\u166d\0\u1695\u169b\u16b2\u16b9\0\u16becute\u803b\xe1\u40e1reve;\u4103\u0300;Ediuy\u159c\u159d\u15a1\u15a3\u15a8\u15ad\u623e;\uc000\u223e\u0333;\u623frc\u803b\xe2\u40e2te\u80bb\xb4\u0306;\u4430lig\u803b\xe6\u40e6\u0100;r\xb2\u15ba;\uc000\ud835\udd1erave\u803b\xe0\u40e0\u0100ep\u15ca\u15d6\u0100fp\u15cf\u15d4sym;\u6135\xe8\u15d3ha;\u43b1\u0100ap\u15dfc\u0100cl\u15e4\u15e7r;\u4101g;\u6a3f\u0264\u15f0\0\0\u160a\u0280;adsv\u15fa\u15fb\u15ff\u1601\u1607\u6227nd;\u6a55;\u6a5clope;\u6a58;\u6a5a\u0380;elmrsz\u1618\u1619\u161b\u161e\u163f\u164f\u1659\u6220;\u69a4e\xbb\u1619sd\u0100;a\u1625\u1626\u6221\u0461\u1630\u1632\u1634\u1636\u1638\u163a\u163c\u163e;\u69a8;\u69a9;\u69aa;\u69ab;\u69ac;\u69ad;\u69ae;\u69aft\u0100;v\u1645\u1646\u621fb\u0100;d\u164c\u164d\u62be;\u699d\u0100pt\u1654\u1657h;\u6222\xbb\xb9arr;\u637c\u0100gp\u1663\u1667on;\u4105f;\uc000\ud835\udd52\u0380;Eaeiop\u12c1\u167b\u167d\u1682\u1684\u1687\u168a;\u6a70cir;\u6a6f;\u624ad;\u624bs;\u4027rox\u0100;e\u12c1\u1692\xf1\u1683ing\u803b\xe5\u40e5\u0180cty\u16a1\u16a6\u16a8r;\uc000\ud835\udcb6;\u402amp\u0100;e\u12c1\u16af\xf1\u0288ilde\u803b\xe3\u40e3ml\u803b\xe4\u40e4\u0100ci\u16c2\u16c8onin\xf4\u0272nt;\u6a11\u0800Nabcdefiklnoprsu\u16ed\u16f1\u1730\u173c\u1743\u1748\u1778\u177d\u17e0\u17e6\u1839\u1850\u170d\u193d\u1948\u1970ot;\u6aed\u0100cr\u16f6\u171ek\u0200ceps\u1700\u1705\u170d\u1713ong;\u624cpsilon;\u43f6rime;\u6035im\u0100;e\u171a\u171b\u623dq;\u62cd\u0176\u1722\u1726ee;\u62bded\u0100;g\u172c\u172d\u6305e\xbb\u172drk\u0100;t\u135c\u1737brk;\u63b6\u0100oy\u1701\u1741;\u4431quo;\u601e\u0280cmprt\u1753\u175b\u1761\u1764\u1768aus\u0100;e\u010a\u0109ptyv;\u69b0s\xe9\u170cno\xf5\u0113\u0180ahw\u176f\u1771\u1773;\u43b2;\u6136een;\u626cr;\uc000\ud835\udd1fg\u0380costuvw\u178d\u179d\u17b3\u17c1\u17d5\u17db\u17de\u0180aiu\u1794\u1796\u179a\xf0\u0760rc;\u65efp\xbb\u1371\u0180dpt\u17a4\u17a8\u17adot;\u6a00lus;\u6a01imes;\u6a02\u0271\u17b9\0\0\u17becup;\u6a06ar;\u6605riangle\u0100du\u17cd\u17d2own;\u65bdp;\u65b3plus;\u6a04e\xe5\u1444\xe5\u14adarow;\u690d\u0180ako\u17ed\u1826\u1835\u0100cn\u17f2\u1823k\u0180lst\u17fa\u05ab\u1802ozenge;\u69ebriangle\u0200;dlr\u1812\u1813\u1818\u181d\u65b4own;\u65beeft;\u65c2ight;\u65b8k;\u6423\u01b1\u182b\0\u1833\u01b2\u182f\0\u1831;\u6592;\u65914;\u6593ck;\u6588\u0100eo\u183e\u184d\u0100;q\u1843\u1846\uc000=\u20e5uiv;\uc000\u2261\u20e5t;\u6310\u0200ptwx\u1859\u185e\u1867\u186cf;\uc000\ud835\udd53\u0100;t\u13cb\u1863om\xbb\u13cctie;\u62c8\u0600DHUVbdhmptuv\u1885\u1896\u18aa\u18bb\u18d7\u18db\u18ec\u18ff\u1905\u190a\u1910\u1921\u0200LRlr\u188e\u1890\u1892\u1894;\u6557;\u6554;\u6556;\u6553\u0280;DUdu\u18a1\u18a2\u18a4\u18a6\u18a8\u6550;\u6566;\u6569;\u6564;\u6567\u0200LRlr\u18b3\u18b5\u18b7\u18b9;\u655d;\u655a;\u655c;\u6559\u0380;HLRhlr\u18ca\u18cb\u18cd\u18cf\u18d1\u18d3\u18d5\u6551;\u656c;\u6563;\u6560;\u656b;\u6562;\u655fox;\u69c9\u0200LRlr\u18e4\u18e6\u18e8\u18ea;\u6555;\u6552;\u6510;\u650c\u0280;DUdu\u06bd\u18f7\u18f9\u18fb\u18fd;\u6565;\u6568;\u652c;\u6534inus;\u629flus;\u629eimes;\u62a0\u0200LRlr\u1919\u191b\u191d\u191f;\u655b;\u6558;\u6518;\u6514\u0380;HLRhlr\u1930\u1931\u1933\u1935\u1937\u1939\u193b\u6502;\u656a;\u6561;\u655e;\u653c;\u6524;\u651c\u0100ev\u0123\u1942bar\u803b\xa6\u40a6\u0200ceio\u1951\u1956\u195a\u1960r;\uc000\ud835\udcb7mi;\u604fm\u0100;e\u171a\u171cl\u0180;bh\u1968\u1969\u196b\u405c;\u69c5sub;\u67c8\u016c\u1974\u197el\u0100;e\u1979\u197a\u6022t\xbb\u197ap\u0180;Ee\u012f\u1985\u1987;\u6aae\u0100;q\u06dc\u06db\u0ce1\u19a7\0\u19e8\u1a11\u1a15\u1a32\0\u1a37\u1a50\0\0\u1ab4\0\0\u1ac1\0\0\u1b21\u1b2e\u1b4d\u1b52\0\u1bfd\0\u1c0c\u0180cpr\u19ad\u19b2\u19ddute;\u4107\u0300;abcds\u19bf\u19c0\u19c4\u19ca\u19d5\u19d9\u6229nd;\u6a44rcup;\u6a49\u0100au\u19cf\u19d2p;\u6a4bp;\u6a47ot;\u6a40;\uc000\u2229\ufe00\u0100eo\u19e2\u19e5t;\u6041\xee\u0693\u0200aeiu\u19f0\u19fb\u1a01\u1a05\u01f0\u19f5\0\u19f8s;\u6a4don;\u410ddil\u803b\xe7\u40e7rc;\u4109ps\u0100;s\u1a0c\u1a0d\u6a4cm;\u6a50ot;\u410b\u0180dmn\u1a1b\u1a20\u1a26il\u80bb\xb8\u01adptyv;\u69b2t\u8100\xa2;e\u1a2d\u1a2e\u40a2r\xe4\u01b2r;\uc000\ud835\udd20\u0180cei\u1a3d\u1a40\u1a4dy;\u4447ck\u0100;m\u1a47\u1a48\u6713ark\xbb\u1a48;\u43c7r\u0380;Ecefms\u1a5f\u1a60\u1a62\u1a6b\u1aa4\u1aaa\u1aae\u65cb;\u69c3\u0180;el\u1a69\u1a6a\u1a6d\u42c6q;\u6257e\u0261\u1a74\0\0\u1a88rrow\u0100lr\u1a7c\u1a81eft;\u61baight;\u61bb\u0280RSacd\u1a92\u1a94\u1a96\u1a9a\u1a9f\xbb\u0f47;\u64c8st;\u629birc;\u629aash;\u629dnint;\u6a10id;\u6aefcir;\u69c2ubs\u0100;u\u1abb\u1abc\u6663it\xbb\u1abc\u02ec\u1ac7\u1ad4\u1afa\0\u1b0aon\u0100;e\u1acd\u1ace\u403a\u0100;q\xc7\xc6\u026d\u1ad9\0\0\u1ae2a\u0100;t\u1ade\u1adf\u402c;\u4040\u0180;fl\u1ae8\u1ae9\u1aeb\u6201\xee\u1160e\u0100mx\u1af1\u1af6ent\xbb\u1ae9e\xf3\u024d\u01e7\u1afe\0\u1b07\u0100;d\u12bb\u1b02ot;\u6a6dn\xf4\u0246\u0180fry\u1b10\u1b14\u1b17;\uc000\ud835\udd54o\xe4\u0254\u8100\xa9;s\u0155\u1b1dr;\u6117\u0100ao\u1b25\u1b29rr;\u61b5ss;\u6717\u0100cu\u1b32\u1b37r;\uc000\ud835\udcb8\u0100bp\u1b3c\u1b44\u0100;e\u1b41\u1b42\u6acf;\u6ad1\u0100;e\u1b49\u1b4a\u6ad0;\u6ad2dot;\u62ef\u0380delprvw\u1b60\u1b6c\u1b77\u1b82\u1bac\u1bd4\u1bf9arr\u0100lr\u1b68\u1b6a;\u6938;\u6935\u0270\u1b72\0\0\u1b75r;\u62dec;\u62dfarr\u0100;p\u1b7f\u1b80\u61b6;\u693d\u0300;bcdos\u1b8f\u1b90\u1b96\u1ba1\u1ba5\u1ba8\u622arcap;\u6a48\u0100au\u1b9b\u1b9ep;\u6a46p;\u6a4aot;\u628dr;\u6a45;\uc000\u222a\ufe00\u0200alrv\u1bb5\u1bbf\u1bde\u1be3rr\u0100;m\u1bbc\u1bbd\u61b7;\u693cy\u0180evw\u1bc7\u1bd4\u1bd8q\u0270\u1bce\0\0\u1bd2re\xe3\u1b73u\xe3\u1b75ee;\u62ceedge;\u62cfen\u803b\xa4\u40a4earrow\u0100lr\u1bee\u1bf3eft\xbb\u1b80ight\xbb\u1bbde\xe4\u1bdd\u0100ci\u1c01\u1c07onin\xf4\u01f7nt;\u6231lcty;\u632d\u0980AHabcdefhijlorstuwz\u1c38\u1c3b\u1c3f\u1c5d\u1c69\u1c75\u1c8a\u1c9e\u1cac\u1cb7\u1cfb\u1cff\u1d0d\u1d7b\u1d91\u1dab\u1dbb\u1dc6\u1dcdr\xf2\u0381ar;\u6965\u0200glrs\u1c48\u1c4d\u1c52\u1c54ger;\u6020eth;\u6138\xf2\u1133h\u0100;v\u1c5a\u1c5b\u6010\xbb\u090a\u016b\u1c61\u1c67arow;\u690fa\xe3\u0315\u0100ay\u1c6e\u1c73ron;\u410f;\u4434\u0180;ao\u0332\u1c7c\u1c84\u0100gr\u02bf\u1c81r;\u61catseq;\u6a77\u0180glm\u1c91\u1c94\u1c98\u803b\xb0\u40b0ta;\u43b4ptyv;\u69b1\u0100ir\u1ca3\u1ca8sht;\u697f;\uc000\ud835\udd21ar\u0100lr\u1cb3\u1cb5\xbb\u08dc\xbb\u101e\u0280aegsv\u1cc2\u0378\u1cd6\u1cdc\u1ce0m\u0180;os\u0326\u1cca\u1cd4nd\u0100;s\u0326\u1cd1uit;\u6666amma;\u43ddin;\u62f2\u0180;io\u1ce7\u1ce8\u1cf8\u40f7de\u8100\xf7;o\u1ce7\u1cf0ntimes;\u62c7n\xf8\u1cf7cy;\u4452c\u026f\u1d06\0\0\u1d0arn;\u631eop;\u630d\u0280lptuw\u1d18\u1d1d\u1d22\u1d49\u1d55lar;\u4024f;\uc000\ud835\udd55\u0280;emps\u030b\u1d2d\u1d37\u1d3d\u1d42q\u0100;d\u0352\u1d33ot;\u6251inus;\u6238lus;\u6214quare;\u62a1blebarwedg\xe5\xfan\u0180adh\u112e\u1d5d\u1d67ownarrow\xf3\u1c83arpoon\u0100lr\u1d72\u1d76ef\xf4\u1cb4igh\xf4\u1cb6\u0162\u1d7f\u1d85karo\xf7\u0f42\u026f\u1d8a\0\0\u1d8ern;\u631fop;\u630c\u0180cot\u1d98\u1da3\u1da6\u0100ry\u1d9d\u1da1;\uc000\ud835\udcb9;\u4455l;\u69f6rok;\u4111\u0100dr\u1db0\u1db4ot;\u62f1i\u0100;f\u1dba\u1816\u65bf\u0100ah\u1dc0\u1dc3r\xf2\u0429a\xf2\u0fa6angle;\u69a6\u0100ci\u1dd2\u1dd5y;\u445fgrarr;\u67ff\u0900Dacdefglmnopqrstux\u1e01\u1e09\u1e19\u1e38\u0578\u1e3c\u1e49\u1e61\u1e7e\u1ea5\u1eaf\u1ebd\u1ee1\u1f2a\u1f37\u1f44\u1f4e\u1f5a\u0100Do\u1e06\u1d34o\xf4\u1c89\u0100cs\u1e0e\u1e14ute\u803b\xe9\u40e9ter;\u6a6e\u0200aioy\u1e22\u1e27\u1e31\u1e36ron;\u411br\u0100;c\u1e2d\u1e2e\u6256\u803b\xea\u40ealon;\u6255;\u444dot;\u4117\u0100Dr\u1e41\u1e45ot;\u6252;\uc000\ud835\udd22\u0180;rs\u1e50\u1e51\u1e57\u6a9aave\u803b\xe8\u40e8\u0100;d\u1e5c\u1e5d\u6a96ot;\u6a98\u0200;ils\u1e6a\u1e6b\u1e72\u1e74\u6a99nters;\u63e7;\u6113\u0100;d\u1e79\u1e7a\u6a95ot;\u6a97\u0180aps\u1e85\u1e89\u1e97cr;\u4113ty\u0180;sv\u1e92\u1e93\u1e95\u6205et\xbb\u1e93p\u01001;\u1e9d\u1ea4\u0133\u1ea1\u1ea3;\u6004;\u6005\u6003\u0100gs\u1eaa\u1eac;\u414bp;\u6002\u0100gp\u1eb4\u1eb8on;\u4119f;\uc000\ud835\udd56\u0180als\u1ec4\u1ece\u1ed2r\u0100;s\u1eca\u1ecb\u62d5l;\u69e3us;\u6a71i\u0180;lv\u1eda\u1edb\u1edf\u43b5on\xbb\u1edb;\u43f5\u0200csuv\u1eea\u1ef3\u1f0b\u1f23\u0100io\u1eef\u1e31rc\xbb\u1e2e\u0269\u1ef9\0\0\u1efb\xed\u0548ant\u0100gl\u1f02\u1f06tr\xbb\u1e5dess\xbb\u1e7a\u0180aei\u1f12\u1f16\u1f1als;\u403dst;\u625fv\u0100;D\u0235\u1f20D;\u6a78parsl;\u69e5\u0100Da\u1f2f\u1f33ot;\u6253rr;\u6971\u0180cdi\u1f3e\u1f41\u1ef8r;\u612fo\xf4\u0352\u0100ah\u1f49\u1f4b;\u43b7\u803b\xf0\u40f0\u0100mr\u1f53\u1f57l\u803b\xeb\u40ebo;\u60ac\u0180cip\u1f61\u1f64\u1f67l;\u4021s\xf4\u056e\u0100eo\u1f6c\u1f74ctatio\xee\u0559nential\xe5\u0579\u09e1\u1f92\0\u1f9e\0\u1fa1\u1fa7\0\0\u1fc6\u1fcc\0\u1fd3\0\u1fe6\u1fea\u2000\0\u2008\u205allingdotse\xf1\u1e44y;\u4444male;\u6640\u0180ilr\u1fad\u1fb3\u1fc1lig;\u8000\ufb03\u0269\u1fb9\0\0\u1fbdg;\u8000\ufb00ig;\u8000\ufb04;\uc000\ud835\udd23lig;\u8000\ufb01lig;\uc000fj\u0180alt\u1fd9\u1fdc\u1fe1t;\u666dig;\u8000\ufb02ns;\u65b1of;\u4192\u01f0\u1fee\0\u1ff3f;\uc000\ud835\udd57\u0100ak\u05bf\u1ff7\u0100;v\u1ffc\u1ffd\u62d4;\u6ad9artint;\u6a0d\u0100ao\u200c\u2055\u0100cs\u2011\u2052\u03b1\u201a\u2030\u2038\u2045\u2048\0\u2050\u03b2\u2022\u2025\u2027\u202a\u202c\0\u202e\u803b\xbd\u40bd;\u6153\u803b\xbc\u40bc;\u6155;\u6159;\u615b\u01b3\u2034\0\u2036;\u6154;\u6156\u02b4\u203e\u2041\0\0\u2043\u803b\xbe\u40be;\u6157;\u615c5;\u6158\u01b6\u204c\0\u204e;\u615a;\u615d8;\u615el;\u6044wn;\u6322cr;\uc000\ud835\udcbb\u0880Eabcdefgijlnorstv\u2082\u2089\u209f\u20a5\u20b0\u20b4\u20f0\u20f5\u20fa\u20ff\u2103\u2112\u2138\u0317\u213e\u2152\u219e\u0100;l\u064d\u2087;\u6a8c\u0180cmp\u2090\u2095\u209dute;\u41f5ma\u0100;d\u209c\u1cda\u43b3;\u6a86reve;\u411f\u0100iy\u20aa\u20aerc;\u411d;\u4433ot;\u4121\u0200;lqs\u063e\u0642\u20bd\u20c9\u0180;qs\u063e\u064c\u20c4lan\xf4\u0665\u0200;cdl\u0665\u20d2\u20d5\u20e5c;\u6aa9ot\u0100;o\u20dc\u20dd\u6a80\u0100;l\u20e2\u20e3\u6a82;\u6a84\u0100;e\u20ea\u20ed\uc000\u22db\ufe00s;\u6a94r;\uc000\ud835\udd24\u0100;g\u0673\u061bmel;\u6137cy;\u4453\u0200;Eaj\u065a\u210c\u210e\u2110;\u6a92;\u6aa5;\u6aa4\u0200Eaes\u211b\u211d\u2129\u2134;\u6269p\u0100;p\u2123\u2124\u6a8arox\xbb\u2124\u0100;q\u212e\u212f\u6a88\u0100;q\u212e\u211bim;\u62e7pf;\uc000\ud835\udd58\u0100ci\u2143\u2146r;\u610am\u0180;el\u066b\u214e\u2150;\u6a8e;\u6a90\u8300>;cdlqr\u05ee\u2160\u216a\u216e\u2173\u2179\u0100ci\u2165\u2167;\u6aa7r;\u6a7aot;\u62d7Par;\u6995uest;\u6a7c\u0280adels\u2184\u216a\u2190\u0656\u219b\u01f0\u2189\0\u218epro\xf8\u209er;\u6978q\u0100lq\u063f\u2196les\xf3\u2088i\xed\u066b\u0100en\u21a3\u21adrtneqq;\uc000\u2269\ufe00\xc5\u21aa\u0500Aabcefkosy\u21c4\u21c7\u21f1\u21f5\u21fa\u2218\u221d\u222f\u2268\u227dr\xf2\u03a0\u0200ilmr\u21d0\u21d4\u21d7\u21dbrs\xf0\u1484f\xbb\u2024il\xf4\u06a9\u0100dr\u21e0\u21e4cy;\u444a\u0180;cw\u08f4\u21eb\u21efir;\u6948;\u61adar;\u610firc;\u4125\u0180alr\u2201\u220e\u2213rts\u0100;u\u2209\u220a\u6665it\xbb\u220alip;\u6026con;\u62b9r;\uc000\ud835\udd25s\u0100ew\u2223\u2229arow;\u6925arow;\u6926\u0280amopr\u223a\u223e\u2243\u225e\u2263rr;\u61fftht;\u623bk\u0100lr\u2249\u2253eftarrow;\u61a9ightarrow;\u61aaf;\uc000\ud835\udd59bar;\u6015\u0180clt\u226f\u2274\u2278r;\uc000\ud835\udcbdas\xe8\u21f4rok;\u4127\u0100bp\u2282\u2287ull;\u6043hen\xbb\u1c5b\u0ae1\u22a3\0\u22aa\0\u22b8\u22c5\u22ce\0\u22d5\u22f3\0\0\u22f8\u2322\u2367\u2362\u237f\0\u2386\u23aa\u23b4cute\u803b\xed\u40ed\u0180;iy\u0771\u22b0\u22b5rc\u803b\xee\u40ee;\u4438\u0100cx\u22bc\u22bfy;\u4435cl\u803b\xa1\u40a1\u0100fr\u039f\u22c9;\uc000\ud835\udd26rave\u803b\xec\u40ec\u0200;ino\u073e\u22dd\u22e9\u22ee\u0100in\u22e2\u22e6nt;\u6a0ct;\u622dfin;\u69dcta;\u6129lig;\u4133\u0180aop\u22fe\u231a\u231d\u0180cgt\u2305\u2308\u2317r;\u412b\u0180elp\u071f\u230f\u2313in\xe5\u078ear\xf4\u0720h;\u4131f;\u62b7ed;\u41b5\u0280;cfot\u04f4\u232c\u2331\u233d\u2341are;\u6105in\u0100;t\u2338\u2339\u621eie;\u69dddo\xf4\u2319\u0280;celp\u0757\u234c\u2350\u235b\u2361al;\u62ba\u0100gr\u2355\u2359er\xf3\u1563\xe3\u234darhk;\u6a17rod;\u6a3c\u0200cgpt\u236f\u2372\u2376\u237by;\u4451on;\u412ff;\uc000\ud835\udd5aa;\u43b9uest\u803b\xbf\u40bf\u0100ci\u238a\u238fr;\uc000\ud835\udcben\u0280;Edsv\u04f4\u239b\u239d\u23a1\u04f3;\u62f9ot;\u62f5\u0100;v\u23a6\u23a7\u62f4;\u62f3\u0100;i\u0777\u23aelde;\u4129\u01eb\u23b8\0\u23bccy;\u4456l\u803b\xef\u40ef\u0300cfmosu\u23cc\u23d7\u23dc\u23e1\u23e7\u23f5\u0100iy\u23d1\u23d5rc;\u4135;\u4439r;\uc000\ud835\udd27ath;\u4237pf;\uc000\ud835\udd5b\u01e3\u23ec\0\u23f1r;\uc000\ud835\udcbfrcy;\u4458kcy;\u4454\u0400acfghjos\u240b\u2416\u2422\u2427\u242d\u2431\u2435\u243bppa\u0100;v\u2413\u2414\u43ba;\u43f0\u0100ey\u241b\u2420dil;\u4137;\u443ar;\uc000\ud835\udd28reen;\u4138cy;\u4445cy;\u445cpf;\uc000\ud835\udd5ccr;\uc000\ud835\udcc0\u0b80ABEHabcdefghjlmnoprstuv\u2470\u2481\u2486\u248d\u2491\u250e\u253d\u255a\u2580\u264e\u265e\u2665\u2679\u267d\u269a\u26b2\u26d8\u275d\u2768\u278b\u27c0\u2801\u2812\u0180art\u2477\u247a\u247cr\xf2\u09c6\xf2\u0395ail;\u691barr;\u690e\u0100;g\u0994\u248b;\u6a8bar;\u6962\u0963\u24a5\0\u24aa\0\u24b1\0\0\0\0\0\u24b5\u24ba\0\u24c6\u24c8\u24cd\0\u24f9ute;\u413amptyv;\u69b4ra\xee\u084cbda;\u43bbg\u0180;dl\u088e\u24c1\u24c3;\u6991\xe5\u088e;\u6a85uo\u803b\xab\u40abr\u0400;bfhlpst\u0899\u24de\u24e6\u24e9\u24eb\u24ee\u24f1\u24f5\u0100;f\u089d\u24e3s;\u691fs;\u691d\xeb\u2252p;\u61abl;\u6939im;\u6973l;\u61a2\u0180;ae\u24ff\u2500\u2504\u6aabil;\u6919\u0100;s\u2509\u250a\u6aad;\uc000\u2aad\ufe00\u0180abr\u2515\u2519\u251drr;\u690crk;\u6772\u0100ak\u2522\u252cc\u0100ek\u2528\u252a;\u407b;\u405b\u0100es\u2531\u2533;\u698bl\u0100du\u2539\u253b;\u698f;\u698d\u0200aeuy\u2546\u254b\u2556\u2558ron;\u413e\u0100di\u2550\u2554il;\u413c\xec\u08b0\xe2\u2529;\u443b\u0200cqrs\u2563\u2566\u256d\u257da;\u6936uo\u0100;r\u0e19\u1746\u0100du\u2572\u2577har;\u6967shar;\u694bh;\u61b2\u0280;fgqs\u258b\u258c\u0989\u25f3\u25ff\u6264t\u0280ahlrt\u2598\u25a4\u25b7\u25c2\u25e8rrow\u0100;t\u0899\u25a1a\xe9\u24f6arpoon\u0100du\u25af\u25b4own\xbb\u045ap\xbb\u0966eftarrows;\u61c7ight\u0180ahs\u25cd\u25d6\u25derrow\u0100;s\u08f4\u08a7arpoon\xf3\u0f98quigarro\xf7\u21f0hreetimes;\u62cb\u0180;qs\u258b\u0993\u25falan\xf4\u09ac\u0280;cdgs\u09ac\u260a\u260d\u261d\u2628c;\u6aa8ot\u0100;o\u2614\u2615\u6a7f\u0100;r\u261a\u261b\u6a81;\u6a83\u0100;e\u2622\u2625\uc000\u22da\ufe00s;\u6a93\u0280adegs\u2633\u2639\u263d\u2649\u264bppro\xf8\u24c6ot;\u62d6q\u0100gq\u2643\u2645\xf4\u0989gt\xf2\u248c\xf4\u099bi\xed\u09b2\u0180ilr\u2655\u08e1\u265asht;\u697c;\uc000\ud835\udd29\u0100;E\u099c\u2663;\u6a91\u0161\u2669\u2676r\u0100du\u25b2\u266e\u0100;l\u0965\u2673;\u696alk;\u6584cy;\u4459\u0280;acht\u0a48\u2688\u268b\u2691\u2696r\xf2\u25c1orne\xf2\u1d08ard;\u696bri;\u65fa\u0100io\u269f\u26a4dot;\u4140ust\u0100;a\u26ac\u26ad\u63b0che\xbb\u26ad\u0200Eaes\u26bb\u26bd\u26c9\u26d4;\u6268p\u0100;p\u26c3\u26c4\u6a89rox\xbb\u26c4\u0100;q\u26ce\u26cf\u6a87\u0100;q\u26ce\u26bbim;\u62e6\u0400abnoptwz\u26e9\u26f4\u26f7\u271a\u272f\u2741\u2747\u2750\u0100nr\u26ee\u26f1g;\u67ecr;\u61fdr\xeb\u08c1g\u0180lmr\u26ff\u270d\u2714eft\u0100ar\u09e6\u2707ight\xe1\u09f2apsto;\u67fcight\xe1\u09fdparrow\u0100lr\u2725\u2729ef\xf4\u24edight;\u61ac\u0180afl\u2736\u2739\u273dr;\u6985;\uc000\ud835\udd5dus;\u6a2dimes;\u6a34\u0161\u274b\u274fst;\u6217\xe1\u134e\u0180;ef\u2757\u2758\u1800\u65cange\xbb\u2758ar\u0100;l\u2764\u2765\u4028t;\u6993\u0280achmt\u2773\u2776\u277c\u2785\u2787r\xf2\u08a8orne\xf2\u1d8car\u0100;d\u0f98\u2783;\u696d;\u600eri;\u62bf\u0300achiqt\u2798\u279d\u0a40\u27a2\u27ae\u27bbquo;\u6039r;\uc000\ud835\udcc1m\u0180;eg\u09b2\u27aa\u27ac;\u6a8d;\u6a8f\u0100bu\u252a\u27b3o\u0100;r\u0e1f\u27b9;\u601arok;\u4142\u8400<;cdhilqr\u082b\u27d2\u2639\u27dc\u27e0\u27e5\u27ea\u27f0\u0100ci\u27d7\u27d9;\u6aa6r;\u6a79re\xe5\u25f2mes;\u62c9arr;\u6976uest;\u6a7b\u0100Pi\u27f5\u27f9ar;\u6996\u0180;ef\u2800\u092d\u181b\u65c3r\u0100du\u2807\u280dshar;\u694ahar;\u6966\u0100en\u2817\u2821rtneqq;\uc000\u2268\ufe00\xc5\u281e\u0700Dacdefhilnopsu\u2840\u2845\u2882\u288e\u2893\u28a0\u28a5\u28a8\u28da\u28e2\u28e4\u0a83\u28f3\u2902Dot;\u623a\u0200clpr\u284e\u2852\u2863\u287dr\u803b\xaf\u40af\u0100et\u2857\u2859;\u6642\u0100;e\u285e\u285f\u6720se\xbb\u285f\u0100;s\u103b\u2868to\u0200;dlu\u103b\u2873\u2877\u287bow\xee\u048cef\xf4\u090f\xf0\u13d1ker;\u65ae\u0100oy\u2887\u288cmma;\u6a29;\u443cash;\u6014asuredangle\xbb\u1626r;\uc000\ud835\udd2ao;\u6127\u0180cdn\u28af\u28b4\u28c9ro\u803b\xb5\u40b5\u0200;acd\u1464\u28bd\u28c0\u28c4s\xf4\u16a7ir;\u6af0ot\u80bb\xb7\u01b5us\u0180;bd\u28d2\u1903\u28d3\u6212\u0100;u\u1d3c\u28d8;\u6a2a\u0163\u28de\u28e1p;\u6adb\xf2\u2212\xf0\u0a81\u0100dp\u28e9\u28eeels;\u62a7f;\uc000\ud835\udd5e\u0100ct\u28f8\u28fdr;\uc000\ud835\udcc2pos\xbb\u159d\u0180;lm\u2909\u290a\u290d\u43bctimap;\u62b8\u0c00GLRVabcdefghijlmoprstuvw\u2942\u2953\u297e\u2989\u2998\u29da\u29e9\u2a15\u2a1a\u2a58\u2a5d\u2a83\u2a95\u2aa4\u2aa8\u2b04\u2b07\u2b44\u2b7f\u2bae\u2c34\u2c67\u2c7c\u2ce9\u0100gt\u2947\u294b;\uc000\u22d9\u0338\u0100;v\u2950\u0bcf\uc000\u226b\u20d2\u0180elt\u295a\u2972\u2976ft\u0100ar\u2961\u2967rrow;\u61cdightarrow;\u61ce;\uc000\u22d8\u0338\u0100;v\u297b\u0c47\uc000\u226a\u20d2ightarrow;\u61cf\u0100Dd\u298e\u2993ash;\u62afash;\u62ae\u0280bcnpt\u29a3\u29a7\u29ac\u29b1\u29ccla\xbb\u02deute;\u4144g;\uc000\u2220\u20d2\u0280;Eiop\u0d84\u29bc\u29c0\u29c5\u29c8;\uc000\u2a70\u0338d;\uc000\u224b\u0338s;\u4149ro\xf8\u0d84ur\u0100;a\u29d3\u29d4\u666el\u0100;s\u29d3\u0b38\u01f3\u29df\0\u29e3p\u80bb\xa0\u0b37mp\u0100;e\u0bf9\u0c00\u0280aeouy\u29f4\u29fe\u2a03\u2a10\u2a13\u01f0\u29f9\0\u29fb;\u6a43on;\u4148dil;\u4146ng\u0100;d\u0d7e\u2a0aot;\uc000\u2a6d\u0338p;\u6a42;\u443dash;\u6013\u0380;Aadqsx\u0b92\u2a29\u2a2d\u2a3b\u2a41\u2a45\u2a50rr;\u61d7r\u0100hr\u2a33\u2a36k;\u6924\u0100;o\u13f2\u13f0ot;\uc000\u2250\u0338ui\xf6\u0b63\u0100ei\u2a4a\u2a4ear;\u6928\xed\u0b98ist\u0100;s\u0ba0\u0b9fr;\uc000\ud835\udd2b\u0200Eest\u0bc5\u2a66\u2a79\u2a7c\u0180;qs\u0bbc\u2a6d\u0be1\u0180;qs\u0bbc\u0bc5\u2a74lan\xf4\u0be2i\xed\u0bea\u0100;r\u0bb6\u2a81\xbb\u0bb7\u0180Aap\u2a8a\u2a8d\u2a91r\xf2\u2971rr;\u61aear;\u6af2\u0180;sv\u0f8d\u2a9c\u0f8c\u0100;d\u2aa1\u2aa2\u62fc;\u62facy;\u445a\u0380AEadest\u2ab7\u2aba\u2abe\u2ac2\u2ac5\u2af6\u2af9r\xf2\u2966;\uc000\u2266\u0338rr;\u619ar;\u6025\u0200;fqs\u0c3b\u2ace\u2ae3\u2aeft\u0100ar\u2ad4\u2ad9rro\xf7\u2ac1ightarro\xf7\u2a90\u0180;qs\u0c3b\u2aba\u2aealan\xf4\u0c55\u0100;s\u0c55\u2af4\xbb\u0c36i\xed\u0c5d\u0100;r\u0c35\u2afei\u0100;e\u0c1a\u0c25i\xe4\u0d90\u0100pt\u2b0c\u2b11f;\uc000\ud835\udd5f\u8180\xac;in\u2b19\u2b1a\u2b36\u40acn\u0200;Edv\u0b89\u2b24\u2b28\u2b2e;\uc000\u22f9\u0338ot;\uc000\u22f5\u0338\u01e1\u0b89\u2b33\u2b35;\u62f7;\u62f6i\u0100;v\u0cb8\u2b3c\u01e1\u0cb8\u2b41\u2b43;\u62fe;\u62fd\u0180aor\u2b4b\u2b63\u2b69r\u0200;ast\u0b7b\u2b55\u2b5a\u2b5flle\xec\u0b7bl;\uc000\u2afd\u20e5;\uc000\u2202\u0338lint;\u6a14\u0180;ce\u0c92\u2b70\u2b73u\xe5\u0ca5\u0100;c\u0c98\u2b78\u0100;e\u0c92\u2b7d\xf1\u0c98\u0200Aait\u2b88\u2b8b\u2b9d\u2ba7r\xf2\u2988rr\u0180;cw\u2b94\u2b95\u2b99\u619b;\uc000\u2933\u0338;\uc000\u219d\u0338ghtarrow\xbb\u2b95ri\u0100;e\u0ccb\u0cd6\u0380chimpqu\u2bbd\u2bcd\u2bd9\u2b04\u0b78\u2be4\u2bef\u0200;cer\u0d32\u2bc6\u0d37\u2bc9u\xe5\u0d45;\uc000\ud835\udcc3ort\u026d\u2b05\0\0\u2bd6ar\xe1\u2b56m\u0100;e\u0d6e\u2bdf\u0100;q\u0d74\u0d73su\u0100bp\u2beb\u2bed\xe5\u0cf8\xe5\u0d0b\u0180bcp\u2bf6\u2c11\u2c19\u0200;Ees\u2bff\u2c00\u0d22\u2c04\u6284;\uc000\u2ac5\u0338et\u0100;e\u0d1b\u2c0bq\u0100;q\u0d23\u2c00c\u0100;e\u0d32\u2c17\xf1\u0d38\u0200;Ees\u2c22\u2c23\u0d5f\u2c27\u6285;\uc000\u2ac6\u0338et\u0100;e\u0d58\u2c2eq\u0100;q\u0d60\u2c23\u0200gilr\u2c3d\u2c3f\u2c45\u2c47\xec\u0bd7lde\u803b\xf1\u40f1\xe7\u0c43iangle\u0100lr\u2c52\u2c5ceft\u0100;e\u0c1a\u2c5a\xf1\u0c26ight\u0100;e\u0ccb\u2c65\xf1\u0cd7\u0100;m\u2c6c\u2c6d\u43bd\u0180;es\u2c74\u2c75\u2c79\u4023ro;\u6116p;\u6007\u0480DHadgilrs\u2c8f\u2c94\u2c99\u2c9e\u2ca3\u2cb0\u2cb6\u2cd3\u2ce3ash;\u62adarr;\u6904p;\uc000\u224d\u20d2ash;\u62ac\u0100et\u2ca8\u2cac;\uc000\u2265\u20d2;\uc000>\u20d2nfin;\u69de\u0180Aet\u2cbd\u2cc1\u2cc5rr;\u6902;\uc000\u2264\u20d2\u0100;r\u2cca\u2ccd\uc000<\u20d2ie;\uc000\u22b4\u20d2\u0100At\u2cd8\u2cdcrr;\u6903rie;\uc000\u22b5\u20d2im;\uc000\u223c\u20d2\u0180Aan\u2cf0\u2cf4\u2d02rr;\u61d6r\u0100hr\u2cfa\u2cfdk;\u6923\u0100;o\u13e7\u13e5ear;\u6927\u1253\u1a95\0\0\0\0\0\0\0\0\0\0\0\0\0\u2d2d\0\u2d38\u2d48\u2d60\u2d65\u2d72\u2d84\u1b07\0\0\u2d8d\u2dab\0\u2dc8\u2dce\0\u2ddc\u2e19\u2e2b\u2e3e\u2e43\u0100cs\u2d31\u1a97ute\u803b\xf3\u40f3\u0100iy\u2d3c\u2d45r\u0100;c\u1a9e\u2d42\u803b\xf4\u40f4;\u443e\u0280abios\u1aa0\u2d52\u2d57\u01c8\u2d5alac;\u4151v;\u6a38old;\u69bclig;\u4153\u0100cr\u2d69\u2d6dir;\u69bf;\uc000\ud835\udd2c\u036f\u2d79\0\0\u2d7c\0\u2d82n;\u42dbave\u803b\xf2\u40f2;\u69c1\u0100bm\u2d88\u0df4ar;\u69b5\u0200acit\u2d95\u2d98\u2da5\u2da8r\xf2\u1a80\u0100ir\u2d9d\u2da0r;\u69beoss;\u69bbn\xe5\u0e52;\u69c0\u0180aei\u2db1\u2db5\u2db9cr;\u414dga;\u43c9\u0180cdn\u2dc0\u2dc5\u01cdron;\u43bf;\u69b6pf;\uc000\ud835\udd60\u0180ael\u2dd4\u2dd7\u01d2r;\u69b7rp;\u69b9\u0380;adiosv\u2dea\u2deb\u2dee\u2e08\u2e0d\u2e10\u2e16\u6228r\xf2\u1a86\u0200;efm\u2df7\u2df8\u2e02\u2e05\u6a5dr\u0100;o\u2dfe\u2dff\u6134f\xbb\u2dff\u803b\xaa\u40aa\u803b\xba\u40bagof;\u62b6r;\u6a56lope;\u6a57;\u6a5b\u0180clo\u2e1f\u2e21\u2e27\xf2\u2e01ash\u803b\xf8\u40f8l;\u6298i\u016c\u2e2f\u2e34de\u803b\xf5\u40f5es\u0100;a\u01db\u2e3as;\u6a36ml\u803b\xf6\u40f6bar;\u633d\u0ae1\u2e5e\0\u2e7d\0\u2e80\u2e9d\0\u2ea2\u2eb9\0\0\u2ecb\u0e9c\0\u2f13\0\0\u2f2b\u2fbc\0\u2fc8r\u0200;ast\u0403\u2e67\u2e72\u0e85\u8100\xb6;l\u2e6d\u2e6e\u40b6le\xec\u0403\u0269\u2e78\0\0\u2e7bm;\u6af3;\u6afdy;\u443fr\u0280cimpt\u2e8b\u2e8f\u2e93\u1865\u2e97nt;\u4025od;\u402eil;\u6030enk;\u6031r;\uc000\ud835\udd2d\u0180imo\u2ea8\u2eb0\u2eb4\u0100;v\u2ead\u2eae\u43c6;\u43d5ma\xf4\u0a76ne;\u660e\u0180;tv\u2ebf\u2ec0\u2ec8\u43c0chfork\xbb\u1ffd;\u43d6\u0100au\u2ecf\u2edfn\u0100ck\u2ed5\u2eddk\u0100;h\u21f4\u2edb;\u610e\xf6\u21f4s\u0480;abcdemst\u2ef3\u2ef4\u1908\u2ef9\u2efd\u2f04\u2f06\u2f0a\u2f0e\u402bcir;\u6a23ir;\u6a22\u0100ou\u1d40\u2f02;\u6a25;\u6a72n\u80bb\xb1\u0e9dim;\u6a26wo;\u6a27\u0180ipu\u2f19\u2f20\u2f25ntint;\u6a15f;\uc000\ud835\udd61nd\u803b\xa3\u40a3\u0500;Eaceinosu\u0ec8\u2f3f\u2f41\u2f44\u2f47\u2f81\u2f89\u2f92\u2f7e\u2fb6;\u6ab3p;\u6ab7u\xe5\u0ed9\u0100;c\u0ece\u2f4c\u0300;acens\u0ec8\u2f59\u2f5f\u2f66\u2f68\u2f7eppro\xf8\u2f43urlye\xf1\u0ed9\xf1\u0ece\u0180aes\u2f6f\u2f76\u2f7approx;\u6ab9qq;\u6ab5im;\u62e8i\xed\u0edfme\u0100;s\u2f88\u0eae\u6032\u0180Eas\u2f78\u2f90\u2f7a\xf0\u2f75\u0180dfp\u0eec\u2f99\u2faf\u0180als\u2fa0\u2fa5\u2faalar;\u632eine;\u6312urf;\u6313\u0100;t\u0efb\u2fb4\xef\u0efbrel;\u62b0\u0100ci\u2fc0\u2fc5r;\uc000\ud835\udcc5;\u43c8ncsp;\u6008\u0300fiopsu\u2fda\u22e2\u2fdf\u2fe5\u2feb\u2ff1r;\uc000\ud835\udd2epf;\uc000\ud835\udd62rime;\u6057cr;\uc000\ud835\udcc6\u0180aeo\u2ff8\u3009\u3013t\u0100ei\u2ffe\u3005rnion\xf3\u06b0nt;\u6a16st\u0100;e\u3010\u3011\u403f\xf1\u1f19\xf4\u0f14\u0a80ABHabcdefhilmnoprstux\u3040\u3051\u3055\u3059\u30e0\u310e\u312b\u3147\u3162\u3172\u318e\u3206\u3215\u3224\u3229\u3258\u326e\u3272\u3290\u32b0\u32b7\u0180art\u3047\u304a\u304cr\xf2\u10b3\xf2\u03ddail;\u691car\xf2\u1c65ar;\u6964\u0380cdenqrt\u3068\u3075\u3078\u307f\u308f\u3094\u30cc\u0100eu\u306d\u3071;\uc000\u223d\u0331te;\u4155i\xe3\u116emptyv;\u69b3g\u0200;del\u0fd1\u3089\u308b\u308d;\u6992;\u69a5\xe5\u0fd1uo\u803b\xbb\u40bbr\u0580;abcfhlpstw\u0fdc\u30ac\u30af\u30b7\u30b9\u30bc\u30be\u30c0\u30c3\u30c7\u30cap;\u6975\u0100;f\u0fe0\u30b4s;\u6920;\u6933s;\u691e\xeb\u225d\xf0\u272el;\u6945im;\u6974l;\u61a3;\u619d\u0100ai\u30d1\u30d5il;\u691ao\u0100;n\u30db\u30dc\u6236al\xf3\u0f1e\u0180abr\u30e7\u30ea\u30eer\xf2\u17e5rk;\u6773\u0100ak\u30f3\u30fdc\u0100ek\u30f9\u30fb;\u407d;\u405d\u0100es\u3102\u3104;\u698cl\u0100du\u310a\u310c;\u698e;\u6990\u0200aeuy\u3117\u311c\u3127\u3129ron;\u4159\u0100di\u3121\u3125il;\u4157\xec\u0ff2\xe2\u30fa;\u4440\u0200clqs\u3134\u3137\u313d\u3144a;\u6937dhar;\u6969uo\u0100;r\u020e\u020dh;\u61b3\u0180acg\u314e\u315f\u0f44l\u0200;ips\u0f78\u3158\u315b\u109cn\xe5\u10bbar\xf4\u0fa9t;\u65ad\u0180ilr\u3169\u1023\u316esht;\u697d;\uc000\ud835\udd2f\u0100ao\u3177\u3186r\u0100du\u317d\u317f\xbb\u047b\u0100;l\u1091\u3184;\u696c\u0100;v\u318b\u318c\u43c1;\u43f1\u0180gns\u3195\u31f9\u31fcht\u0300ahlrst\u31a4\u31b0\u31c2\u31d8\u31e4\u31eerrow\u0100;t\u0fdc\u31ada\xe9\u30c8arpoon\u0100du\u31bb\u31bfow\xee\u317ep\xbb\u1092eft\u0100ah\u31ca\u31d0rrow\xf3\u0feaarpoon\xf3\u0551ightarrows;\u61c9quigarro\xf7\u30cbhreetimes;\u62ccg;\u42daingdotse\xf1\u1f32\u0180ahm\u320d\u3210\u3213r\xf2\u0feaa\xf2\u0551;\u600foust\u0100;a\u321e\u321f\u63b1che\xbb\u321fmid;\u6aee\u0200abpt\u3232\u323d\u3240\u3252\u0100nr\u3237\u323ag;\u67edr;\u61fer\xeb\u1003\u0180afl\u3247\u324a\u324er;\u6986;\uc000\ud835\udd63us;\u6a2eimes;\u6a35\u0100ap\u325d\u3267r\u0100;g\u3263\u3264\u4029t;\u6994olint;\u6a12ar\xf2\u31e3\u0200achq\u327b\u3280\u10bc\u3285quo;\u603ar;\uc000\ud835\udcc7\u0100bu\u30fb\u328ao\u0100;r\u0214\u0213\u0180hir\u3297\u329b\u32a0re\xe5\u31f8mes;\u62cai\u0200;efl\u32aa\u1059\u1821\u32ab\u65b9tri;\u69celuhar;\u6968;\u611e\u0d61\u32d5\u32db\u32df\u332c\u3338\u3371\0\u337a\u33a4\0\0\u33ec\u33f0\0\u3428\u3448\u345a\u34ad\u34b1\u34ca\u34f1\0\u3616\0\0\u3633cute;\u415bqu\xef\u27ba\u0500;Eaceinpsy\u11ed\u32f3\u32f5\u32ff\u3302\u330b\u330f\u331f\u3326\u3329;\u6ab4\u01f0\u32fa\0\u32fc;\u6ab8on;\u4161u\xe5\u11fe\u0100;d\u11f3\u3307il;\u415frc;\u415d\u0180Eas\u3316\u3318\u331b;\u6ab6p;\u6abaim;\u62e9olint;\u6a13i\xed\u1204;\u4441ot\u0180;be\u3334\u1d47\u3335\u62c5;\u6a66\u0380Aacmstx\u3346\u334a\u3357\u335b\u335e\u3363\u336drr;\u61d8r\u0100hr\u3350\u3352\xeb\u2228\u0100;o\u0a36\u0a34t\u803b\xa7\u40a7i;\u403bwar;\u6929m\u0100in\u3369\xf0nu\xf3\xf1t;\u6736r\u0100;o\u3376\u2055\uc000\ud835\udd30\u0200acoy\u3382\u3386\u3391\u33a0rp;\u666f\u0100hy\u338b\u338fcy;\u4449;\u4448rt\u026d\u3399\0\0\u339ci\xe4\u1464ara\xec\u2e6f\u803b\xad\u40ad\u0100gm\u33a8\u33b4ma\u0180;fv\u33b1\u33b2\u33b2\u43c3;\u43c2\u0400;deglnpr\u12ab\u33c5\u33c9\u33ce\u33d6\u33de\u33e1\u33e6ot;\u6a6a\u0100;q\u12b1\u12b0\u0100;E\u33d3\u33d4\u6a9e;\u6aa0\u0100;E\u33db\u33dc\u6a9d;\u6a9fe;\u6246lus;\u6a24arr;\u6972ar\xf2\u113d\u0200aeit\u33f8\u3408\u340f\u3417\u0100ls\u33fd\u3404lsetm\xe9\u336ahp;\u6a33parsl;\u69e4\u0100dl\u1463\u3414e;\u6323\u0100;e\u341c\u341d\u6aaa\u0100;s\u3422\u3423\u6aac;\uc000\u2aac\ufe00\u0180flp\u342e\u3433\u3442tcy;\u444c\u0100;b\u3438\u3439\u402f\u0100;a\u343e\u343f\u69c4r;\u633ff;\uc000\ud835\udd64a\u0100dr\u344d\u0402es\u0100;u\u3454\u3455\u6660it\xbb\u3455\u0180csu\u3460\u3479\u349f\u0100au\u3465\u346fp\u0100;s\u1188\u346b;\uc000\u2293\ufe00p\u0100;s\u11b4\u3475;\uc000\u2294\ufe00u\u0100bp\u347f\u348f\u0180;es\u1197\u119c\u3486et\u0100;e\u1197\u348d\xf1\u119d\u0180;es\u11a8\u11ad\u3496et\u0100;e\u11a8\u349d\xf1\u11ae\u0180;af\u117b\u34a6\u05b0r\u0165\u34ab\u05b1\xbb\u117car\xf2\u1148\u0200cemt\u34b9\u34be\u34c2\u34c5r;\uc000\ud835\udcc8tm\xee\xf1i\xec\u3415ar\xe6\u11be\u0100ar\u34ce\u34d5r\u0100;f\u34d4\u17bf\u6606\u0100an\u34da\u34edight\u0100ep\u34e3\u34eapsilo\xee\u1ee0h\xe9\u2eafs\xbb\u2852\u0280bcmnp\u34fb\u355e\u1209\u358b\u358e\u0480;Edemnprs\u350e\u350f\u3511\u3515\u351e\u3523\u352c\u3531\u3536\u6282;\u6ac5ot;\u6abd\u0100;d\u11da\u351aot;\u6ac3ult;\u6ac1\u0100Ee\u3528\u352a;\u6acb;\u628alus;\u6abfarr;\u6979\u0180eiu\u353d\u3552\u3555t\u0180;en\u350e\u3545\u354bq\u0100;q\u11da\u350feq\u0100;q\u352b\u3528m;\u6ac7\u0100bp\u355a\u355c;\u6ad5;\u6ad3c\u0300;acens\u11ed\u356c\u3572\u3579\u357b\u3326ppro\xf8\u32faurlye\xf1\u11fe\xf1\u11f3\u0180aes\u3582\u3588\u331bppro\xf8\u331aq\xf1\u3317g;\u666a\u0680123;Edehlmnps\u35a9\u35ac\u35af\u121c\u35b2\u35b4\u35c0\u35c9\u35d5\u35da\u35df\u35e8\u35ed\u803b\xb9\u40b9\u803b\xb2\u40b2\u803b\xb3\u40b3;\u6ac6\u0100os\u35b9\u35bct;\u6abeub;\u6ad8\u0100;d\u1222\u35c5ot;\u6ac4s\u0100ou\u35cf\u35d2l;\u67c9b;\u6ad7arr;\u697bult;\u6ac2\u0100Ee\u35e4\u35e6;\u6acc;\u628blus;\u6ac0\u0180eiu\u35f4\u3609\u360ct\u0180;en\u121c\u35fc\u3602q\u0100;q\u1222\u35b2eq\u0100;q\u35e7\u35e4m;\u6ac8\u0100bp\u3611\u3613;\u6ad4;\u6ad6\u0180Aan\u361c\u3620\u362drr;\u61d9r\u0100hr\u3626\u3628\xeb\u222e\u0100;o\u0a2b\u0a29war;\u692alig\u803b\xdf\u40df\u0be1\u3651\u365d\u3660\u12ce\u3673\u3679\0\u367e\u36c2\0\0\0\0\0\u36db\u3703\0\u3709\u376c\0\0\0\u3787\u0272\u3656\0\0\u365bget;\u6316;\u43c4r\xeb\u0e5f\u0180aey\u3666\u366b\u3670ron;\u4165dil;\u4163;\u4442lrec;\u6315r;\uc000\ud835\udd31\u0200eiko\u3686\u369d\u36b5\u36bc\u01f2\u368b\0\u3691e\u01004f\u1284\u1281a\u0180;sv\u3698\u3699\u369b\u43b8ym;\u43d1\u0100cn\u36a2\u36b2k\u0100as\u36a8\u36aeppro\xf8\u12c1im\xbb\u12acs\xf0\u129e\u0100as\u36ba\u36ae\xf0\u12c1rn\u803b\xfe\u40fe\u01ec\u031f\u36c6\u22e7es\u8180\xd7;bd\u36cf\u36d0\u36d8\u40d7\u0100;a\u190f\u36d5r;\u6a31;\u6a30\u0180eps\u36e1\u36e3\u3700\xe1\u2a4d\u0200;bcf\u0486\u36ec\u36f0\u36f4ot;\u6336ir;\u6af1\u0100;o\u36f9\u36fc\uc000\ud835\udd65rk;\u6ada\xe1\u3362rime;\u6034\u0180aip\u370f\u3712\u3764d\xe5\u1248\u0380adempst\u3721\u374d\u3740\u3751\u3757\u375c\u375fngle\u0280;dlqr\u3730\u3731\u3736\u3740\u3742\u65b5own\xbb\u1dbbeft\u0100;e\u2800\u373e\xf1\u092e;\u625cight\u0100;e\u32aa\u374b\xf1\u105aot;\u65ecinus;\u6a3alus;\u6a39b;\u69cdime;\u6a3bezium;\u63e2\u0180cht\u3772\u377d\u3781\u0100ry\u3777\u377b;\uc000\ud835\udcc9;\u4446cy;\u445brok;\u4167\u0100io\u378b\u378ex\xf4\u1777head\u0100lr\u3797\u37a0eftarro\xf7\u084fightarrow\xbb\u0f5d\u0900AHabcdfghlmoprstuw\u37d0\u37d3\u37d7\u37e4\u37f0\u37fc\u380e\u381c\u3823\u3834\u3851\u385d\u386b\u38a9\u38cc\u38d2\u38ea\u38f6r\xf2\u03edar;\u6963\u0100cr\u37dc\u37e2ute\u803b\xfa\u40fa\xf2\u1150r\u01e3\u37ea\0\u37edy;\u445eve;\u416d\u0100iy\u37f5\u37farc\u803b\xfb\u40fb;\u4443\u0180abh\u3803\u3806\u380br\xf2\u13adlac;\u4171a\xf2\u13c3\u0100ir\u3813\u3818sht;\u697e;\uc000\ud835\udd32rave\u803b\xf9\u40f9\u0161\u3827\u3831r\u0100lr\u382c\u382e\xbb\u0957\xbb\u1083lk;\u6580\u0100ct\u3839\u384d\u026f\u383f\0\0\u384arn\u0100;e\u3845\u3846\u631cr\xbb\u3846op;\u630fri;\u65f8\u0100al\u3856\u385acr;\u416b\u80bb\xa8\u0349\u0100gp\u3862\u3866on;\u4173f;\uc000\ud835\udd66\u0300adhlsu\u114b\u3878\u387d\u1372\u3891\u38a0own\xe1\u13b3arpoon\u0100lr\u3888\u388cef\xf4\u382digh\xf4\u382fi\u0180;hl\u3899\u389a\u389c\u43c5\xbb\u13faon\xbb\u389aparrows;\u61c8\u0180cit\u38b0\u38c4\u38c8\u026f\u38b6\0\0\u38c1rn\u0100;e\u38bc\u38bd\u631dr\xbb\u38bdop;\u630eng;\u416fri;\u65f9cr;\uc000\ud835\udcca\u0180dir\u38d9\u38dd\u38e2ot;\u62f0lde;\u4169i\u0100;f\u3730\u38e8\xbb\u1813\u0100am\u38ef\u38f2r\xf2\u38a8l\u803b\xfc\u40fcangle;\u69a7\u0780ABDacdeflnoprsz\u391c\u391f\u3929\u392d\u39b5\u39b8\u39bd\u39df\u39e4\u39e8\u39f3\u39f9\u39fd\u3a01\u3a20r\xf2\u03f7ar\u0100;v\u3926\u3927\u6ae8;\u6ae9as\xe8\u03e1\u0100nr\u3932\u3937grt;\u699c\u0380eknprst\u34e3\u3946\u394b\u3952\u395d\u3964\u3996app\xe1\u2415othin\xe7\u1e96\u0180hir\u34eb\u2ec8\u3959op\xf4\u2fb5\u0100;h\u13b7\u3962\xef\u318d\u0100iu\u3969\u396dgm\xe1\u33b3\u0100bp\u3972\u3984setneq\u0100;q\u397d\u3980\uc000\u228a\ufe00;\uc000\u2acb\ufe00setneq\u0100;q\u398f\u3992\uc000\u228b\ufe00;\uc000\u2acc\ufe00\u0100hr\u399b\u399fet\xe1\u369ciangle\u0100lr\u39aa\u39afeft\xbb\u0925ight\xbb\u1051y;\u4432ash\xbb\u1036\u0180elr\u39c4\u39d2\u39d7\u0180;be\u2dea\u39cb\u39cfar;\u62bbq;\u625alip;\u62ee\u0100bt\u39dc\u1468a\xf2\u1469r;\uc000\ud835\udd33tr\xe9\u39aesu\u0100bp\u39ef\u39f1\xbb\u0d1c\xbb\u0d59pf;\uc000\ud835\udd67ro\xf0\u0efbtr\xe9\u39b4\u0100cu\u3a06\u3a0br;\uc000\ud835\udccb\u0100bp\u3a10\u3a18n\u0100Ee\u3980\u3a16\xbb\u397en\u0100Ee\u3992\u3a1e\xbb\u3990igzag;\u699a\u0380cefoprs\u3a36\u3a3b\u3a56\u3a5b\u3a54\u3a61\u3a6airc;\u4175\u0100di\u3a40\u3a51\u0100bg\u3a45\u3a49ar;\u6a5fe\u0100;q\u15fa\u3a4f;\u6259erp;\u6118r;\uc000\ud835\udd34pf;\uc000\ud835\udd68\u0100;e\u1479\u3a66at\xe8\u1479cr;\uc000\ud835\udccc\u0ae3\u178e\u3a87\0\u3a8b\0\u3a90\u3a9b\0\0\u3a9d\u3aa8\u3aab\u3aaf\0\0\u3ac3\u3ace\0\u3ad8\u17dc\u17dftr\xe9\u17d1r;\uc000\ud835\udd35\u0100Aa\u3a94\u3a97r\xf2\u03c3r\xf2\u09f6;\u43be\u0100Aa\u3aa1\u3aa4r\xf2\u03b8r\xf2\u09eba\xf0\u2713is;\u62fb\u0180dpt\u17a4\u3ab5\u3abe\u0100fl\u3aba\u17a9;\uc000\ud835\udd69im\xe5\u17b2\u0100Aa\u3ac7\u3acar\xf2\u03cer\xf2\u0a01\u0100cq\u3ad2\u17b8r;\uc000\ud835\udccd\u0100pt\u17d6\u3adcr\xe9\u17d4\u0400acefiosu\u3af0\u3afd\u3b08\u3b0c\u3b11\u3b15\u3b1b\u3b21c\u0100uy\u3af6\u3afbte\u803b\xfd\u40fd;\u444f\u0100iy\u3b02\u3b06rc;\u4177;\u444bn\u803b\xa5\u40a5r;\uc000\ud835\udd36cy;\u4457pf;\uc000\ud835\udd6acr;\uc000\ud835\udcce\u0100cm\u3b26\u3b29y;\u444el\u803b\xff\u40ff\u0500acdefhiosw\u3b42\u3b48\u3b54\u3b58\u3b64\u3b69\u3b6d\u3b74\u3b7a\u3b80cute;\u417a\u0100ay\u3b4d\u3b52ron;\u417e;\u4437ot;\u417c\u0100et\u3b5d\u3b61tr\xe6\u155fa;\u43b6r;\uc000\ud835\udd37cy;\u4436grarr;\u61ddpf;\uc000\ud835\udd6bcr;\uc000\ud835\udccf\u0100jn\u3b85\u3b87;\u600dj;\u600c"
    .split("")
    .map(function (c) { return c.charCodeAt(0); }));

},{}],5:[function(require,module,exports){
"use strict";
// Generated using scripts/write-decode-map.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = new Uint16Array(
// prettier-ignore
"\u0200aglq\t\x15\x18\x1b\u026d\x0f\0\0\x12p;\u4026os;\u4027t;\u403et;\u403cuot;\u4022"
    .split("")
    .map(function (c) { return c.charCodeAt(0); }));

},{}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDocumentMode = exports.isConforming = void 0;
const html_js_1 = require("./html.js");
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
    '-//webtechs//dtd mozilla html//',
];
const QUIRKS_MODE_NO_SYSTEM_ID_PUBLIC_ID_PREFIXES = [
    ...QUIRKS_MODE_PUBLIC_ID_PREFIXES,
    '-//w3c//dtd html 4.01 frameset//',
    '-//w3c//dtd html 4.01 transitional//',
];
const QUIRKS_MODE_PUBLIC_IDS = new Set([
    '-//w3o//dtd w3 html strict 3.0//en//',
    '-/w3c/dtd html 4.0 transitional/en',
    'html',
]);
const LIMITED_QUIRKS_PUBLIC_ID_PREFIXES = ['-//w3c//dtd xhtml 1.0 frameset//', '-//w3c//dtd xhtml 1.0 transitional//'];
const LIMITED_QUIRKS_WITH_SYSTEM_ID_PUBLIC_ID_PREFIXES = [
    ...LIMITED_QUIRKS_PUBLIC_ID_PREFIXES,
    '-//w3c//dtd html 4.01 frameset//',
    '-//w3c//dtd html 4.01 transitional//',
];
//Utils
function hasPrefix(publicId, prefixes) {
    return prefixes.some((prefix) => publicId.startsWith(prefix));
}
//API
function isConforming(token) {
    return (token.name === VALID_DOCTYPE_NAME &&
        token.publicId === null &&
        (token.systemId === null || token.systemId === VALID_SYSTEM_ID));
}
exports.isConforming = isConforming;
function getDocumentMode(token) {
    if (token.name !== VALID_DOCTYPE_NAME) {
        return html_js_1.DOCUMENT_MODE.QUIRKS;
    }
    const { systemId } = token;
    if (systemId && systemId.toLowerCase() === QUIRKS_MODE_SYSTEM_ID) {
        return html_js_1.DOCUMENT_MODE.QUIRKS;
    }
    let { publicId } = token;
    if (publicId !== null) {
        publicId = publicId.toLowerCase();
        if (QUIRKS_MODE_PUBLIC_IDS.has(publicId)) {
            return html_js_1.DOCUMENT_MODE.QUIRKS;
        }
        let prefixes = systemId === null ? QUIRKS_MODE_NO_SYSTEM_ID_PUBLIC_ID_PREFIXES : QUIRKS_MODE_PUBLIC_ID_PREFIXES;
        if (hasPrefix(publicId, prefixes)) {
            return html_js_1.DOCUMENT_MODE.QUIRKS;
        }
        prefixes =
            systemId === null ? LIMITED_QUIRKS_PUBLIC_ID_PREFIXES : LIMITED_QUIRKS_WITH_SYSTEM_ID_PUBLIC_ID_PREFIXES;
        if (hasPrefix(publicId, prefixes)) {
            return html_js_1.DOCUMENT_MODE.LIMITED_QUIRKS;
        }
    }
    return html_js_1.DOCUMENT_MODE.NO_QUIRKS;
}
exports.getDocumentMode = getDocumentMode;

},{"./html.js":9}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERR = void 0;
var ERR;
(function (ERR) {
    ERR["controlCharacterInInputStream"] = "control-character-in-input-stream";
    ERR["noncharacterInInputStream"] = "noncharacter-in-input-stream";
    ERR["surrogateInInputStream"] = "surrogate-in-input-stream";
    ERR["nonVoidHtmlElementStartTagWithTrailingSolidus"] = "non-void-html-element-start-tag-with-trailing-solidus";
    ERR["endTagWithAttributes"] = "end-tag-with-attributes";
    ERR["endTagWithTrailingSolidus"] = "end-tag-with-trailing-solidus";
    ERR["unexpectedSolidusInTag"] = "unexpected-solidus-in-tag";
    ERR["unexpectedNullCharacter"] = "unexpected-null-character";
    ERR["unexpectedQuestionMarkInsteadOfTagName"] = "unexpected-question-mark-instead-of-tag-name";
    ERR["invalidFirstCharacterOfTagName"] = "invalid-first-character-of-tag-name";
    ERR["unexpectedEqualsSignBeforeAttributeName"] = "unexpected-equals-sign-before-attribute-name";
    ERR["missingEndTagName"] = "missing-end-tag-name";
    ERR["unexpectedCharacterInAttributeName"] = "unexpected-character-in-attribute-name";
    ERR["unknownNamedCharacterReference"] = "unknown-named-character-reference";
    ERR["missingSemicolonAfterCharacterReference"] = "missing-semicolon-after-character-reference";
    ERR["unexpectedCharacterAfterDoctypeSystemIdentifier"] = "unexpected-character-after-doctype-system-identifier";
    ERR["unexpectedCharacterInUnquotedAttributeValue"] = "unexpected-character-in-unquoted-attribute-value";
    ERR["eofBeforeTagName"] = "eof-before-tag-name";
    ERR["eofInTag"] = "eof-in-tag";
    ERR["missingAttributeValue"] = "missing-attribute-value";
    ERR["missingWhitespaceBetweenAttributes"] = "missing-whitespace-between-attributes";
    ERR["missingWhitespaceAfterDoctypePublicKeyword"] = "missing-whitespace-after-doctype-public-keyword";
    ERR["missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers"] = "missing-whitespace-between-doctype-public-and-system-identifiers";
    ERR["missingWhitespaceAfterDoctypeSystemKeyword"] = "missing-whitespace-after-doctype-system-keyword";
    ERR["missingQuoteBeforeDoctypePublicIdentifier"] = "missing-quote-before-doctype-public-identifier";
    ERR["missingQuoteBeforeDoctypeSystemIdentifier"] = "missing-quote-before-doctype-system-identifier";
    ERR["missingDoctypePublicIdentifier"] = "missing-doctype-public-identifier";
    ERR["missingDoctypeSystemIdentifier"] = "missing-doctype-system-identifier";
    ERR["abruptDoctypePublicIdentifier"] = "abrupt-doctype-public-identifier";
    ERR["abruptDoctypeSystemIdentifier"] = "abrupt-doctype-system-identifier";
    ERR["cdataInHtmlContent"] = "cdata-in-html-content";
    ERR["incorrectlyOpenedComment"] = "incorrectly-opened-comment";
    ERR["eofInScriptHtmlCommentLikeText"] = "eof-in-script-html-comment-like-text";
    ERR["eofInDoctype"] = "eof-in-doctype";
    ERR["nestedComment"] = "nested-comment";
    ERR["abruptClosingOfEmptyComment"] = "abrupt-closing-of-empty-comment";
    ERR["eofInComment"] = "eof-in-comment";
    ERR["incorrectlyClosedComment"] = "incorrectly-closed-comment";
    ERR["eofInCdata"] = "eof-in-cdata";
    ERR["absenceOfDigitsInNumericCharacterReference"] = "absence-of-digits-in-numeric-character-reference";
    ERR["nullCharacterReference"] = "null-character-reference";
    ERR["surrogateCharacterReference"] = "surrogate-character-reference";
    ERR["characterReferenceOutsideUnicodeRange"] = "character-reference-outside-unicode-range";
    ERR["controlCharacterReference"] = "control-character-reference";
    ERR["noncharacterCharacterReference"] = "noncharacter-character-reference";
    ERR["missingWhitespaceBeforeDoctypeName"] = "missing-whitespace-before-doctype-name";
    ERR["missingDoctypeName"] = "missing-doctype-name";
    ERR["invalidCharacterSequenceAfterDoctypeName"] = "invalid-character-sequence-after-doctype-name";
    ERR["duplicateAttribute"] = "duplicate-attribute";
    ERR["nonConformingDoctype"] = "non-conforming-doctype";
    ERR["missingDoctype"] = "missing-doctype";
    ERR["misplacedDoctype"] = "misplaced-doctype";
    ERR["endTagWithoutMatchingOpenElement"] = "end-tag-without-matching-open-element";
    ERR["closingOfElementWithOpenChildElements"] = "closing-of-element-with-open-child-elements";
    ERR["disallowedContentInNoscriptInHead"] = "disallowed-content-in-noscript-in-head";
    ERR["openElementsLeftAfterEof"] = "open-elements-left-after-eof";
    ERR["abandonedHeadElementChild"] = "abandoned-head-element-child";
    ERR["misplacedStartTagForHeadElement"] = "misplaced-start-tag-for-head-element";
    ERR["nestedNoscriptInHead"] = "nested-noscript-in-head";
    ERR["eofInElementThatCanContainOnlyText"] = "eof-in-element-that-can-contain-only-text";
})(ERR = exports.ERR || (exports.ERR = {}));

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIntegrationPoint = exports.adjustTokenSVGTagName = exports.adjustTokenXMLAttrs = exports.adjustTokenSVGAttrs = exports.adjustTokenMathMLAttrs = exports.causesExit = exports.SVG_TAG_NAMES_ADJUSTMENT_MAP = void 0;
const html_js_1 = require("./html.js");
//MIME types
const MIME_TYPES = {
    TEXT_HTML: 'text/html',
    APPLICATION_XML: 'application/xhtml+xml',
};
//Attributes
const DEFINITION_URL_ATTR = 'definitionurl';
const ADJUSTED_DEFINITION_URL_ATTR = 'definitionURL';
const SVG_ATTRS_ADJUSTMENT_MAP = new Map([
    'attributeName',
    'attributeType',
    'baseFrequency',
    'baseProfile',
    'calcMode',
    'clipPathUnits',
    'diffuseConstant',
    'edgeMode',
    'filterUnits',
    'glyphRef',
    'gradientTransform',
    'gradientUnits',
    'kernelMatrix',
    'kernelUnitLength',
    'keyPoints',
    'keySplines',
    'keyTimes',
    'lengthAdjust',
    'limitingConeAngle',
    'markerHeight',
    'markerUnits',
    'markerWidth',
    'maskContentUnits',
    'maskUnits',
    'numOctaves',
    'pathLength',
    'patternContentUnits',
    'patternTransform',
    'patternUnits',
    'pointsAtX',
    'pointsAtY',
    'pointsAtZ',
    'preserveAlpha',
    'preserveAspectRatio',
    'primitiveUnits',
    'refX',
    'refY',
    'repeatCount',
    'repeatDur',
    'requiredExtensions',
    'requiredFeatures',
    'specularConstant',
    'specularExponent',
    'spreadMethod',
    'startOffset',
    'stdDeviation',
    'stitchTiles',
    'surfaceScale',
    'systemLanguage',
    'tableValues',
    'targetX',
    'targetY',
    'textLength',
    'viewBox',
    'viewTarget',
    'xChannelSelector',
    'yChannelSelector',
    'zoomAndPan',
].map((attr) => [attr.toLowerCase(), attr]));
const XML_ATTRS_ADJUSTMENT_MAP = new Map([
    ['xlink:actuate', { prefix: 'xlink', name: 'actuate', namespace: html_js_1.NS.XLINK }],
    ['xlink:arcrole', { prefix: 'xlink', name: 'arcrole', namespace: html_js_1.NS.XLINK }],
    ['xlink:href', { prefix: 'xlink', name: 'href', namespace: html_js_1.NS.XLINK }],
    ['xlink:role', { prefix: 'xlink', name: 'role', namespace: html_js_1.NS.XLINK }],
    ['xlink:show', { prefix: 'xlink', name: 'show', namespace: html_js_1.NS.XLINK }],
    ['xlink:title', { prefix: 'xlink', name: 'title', namespace: html_js_1.NS.XLINK }],
    ['xlink:type', { prefix: 'xlink', name: 'type', namespace: html_js_1.NS.XLINK }],
    ['xml:base', { prefix: 'xml', name: 'base', namespace: html_js_1.NS.XML }],
    ['xml:lang', { prefix: 'xml', name: 'lang', namespace: html_js_1.NS.XML }],
    ['xml:space', { prefix: 'xml', name: 'space', namespace: html_js_1.NS.XML }],
    ['xmlns', { prefix: '', name: 'xmlns', namespace: html_js_1.NS.XMLNS }],
    ['xmlns:xlink', { prefix: 'xmlns', name: 'xlink', namespace: html_js_1.NS.XMLNS }],
]);
//SVG tag names adjustment map
exports.SVG_TAG_NAMES_ADJUSTMENT_MAP = new Map([
    'altGlyph',
    'altGlyphDef',
    'altGlyphItem',
    'animateColor',
    'animateMotion',
    'animateTransform',
    'clipPath',
    'feBlend',
    'feColorMatrix',
    'feComponentTransfer',
    'feComposite',
    'feConvolveMatrix',
    'feDiffuseLighting',
    'feDisplacementMap',
    'feDistantLight',
    'feFlood',
    'feFuncA',
    'feFuncB',
    'feFuncG',
    'feFuncR',
    'feGaussianBlur',
    'feImage',
    'feMerge',
    'feMergeNode',
    'feMorphology',
    'feOffset',
    'fePointLight',
    'feSpecularLighting',
    'feSpotLight',
    'feTile',
    'feTurbulence',
    'foreignObject',
    'glyphRef',
    'linearGradient',
    'radialGradient',
    'textPath',
].map((tn) => [tn.toLowerCase(), tn]));
//Tags that causes exit from foreign content
const EXITS_FOREIGN_CONTENT = new Set([
    html_js_1.TAG_ID.B,
    html_js_1.TAG_ID.BIG,
    html_js_1.TAG_ID.BLOCKQUOTE,
    html_js_1.TAG_ID.BODY,
    html_js_1.TAG_ID.BR,
    html_js_1.TAG_ID.CENTER,
    html_js_1.TAG_ID.CODE,
    html_js_1.TAG_ID.DD,
    html_js_1.TAG_ID.DIV,
    html_js_1.TAG_ID.DL,
    html_js_1.TAG_ID.DT,
    html_js_1.TAG_ID.EM,
    html_js_1.TAG_ID.EMBED,
    html_js_1.TAG_ID.H1,
    html_js_1.TAG_ID.H2,
    html_js_1.TAG_ID.H3,
    html_js_1.TAG_ID.H4,
    html_js_1.TAG_ID.H5,
    html_js_1.TAG_ID.H6,
    html_js_1.TAG_ID.HEAD,
    html_js_1.TAG_ID.HR,
    html_js_1.TAG_ID.I,
    html_js_1.TAG_ID.IMG,
    html_js_1.TAG_ID.LI,
    html_js_1.TAG_ID.LISTING,
    html_js_1.TAG_ID.MENU,
    html_js_1.TAG_ID.META,
    html_js_1.TAG_ID.NOBR,
    html_js_1.TAG_ID.OL,
    html_js_1.TAG_ID.P,
    html_js_1.TAG_ID.PRE,
    html_js_1.TAG_ID.RUBY,
    html_js_1.TAG_ID.S,
    html_js_1.TAG_ID.SMALL,
    html_js_1.TAG_ID.SPAN,
    html_js_1.TAG_ID.STRONG,
    html_js_1.TAG_ID.STRIKE,
    html_js_1.TAG_ID.SUB,
    html_js_1.TAG_ID.SUP,
    html_js_1.TAG_ID.TABLE,
    html_js_1.TAG_ID.TT,
    html_js_1.TAG_ID.U,
    html_js_1.TAG_ID.UL,
    html_js_1.TAG_ID.VAR,
]);
//Check exit from foreign content
function causesExit(startTagToken) {
    const tn = startTagToken.tagID;
    const isFontWithAttrs = tn === html_js_1.TAG_ID.FONT &&
        startTagToken.attrs.some(({ name }) => name === html_js_1.ATTRS.COLOR || name === html_js_1.ATTRS.SIZE || name === html_js_1.ATTRS.FACE);
    return isFontWithAttrs || EXITS_FOREIGN_CONTENT.has(tn);
}
exports.causesExit = causesExit;
//Token adjustments
function adjustTokenMathMLAttrs(token) {
    for (let i = 0; i < token.attrs.length; i++) {
        if (token.attrs[i].name === DEFINITION_URL_ATTR) {
            token.attrs[i].name = ADJUSTED_DEFINITION_URL_ATTR;
            break;
        }
    }
}
exports.adjustTokenMathMLAttrs = adjustTokenMathMLAttrs;
function adjustTokenSVGAttrs(token) {
    for (let i = 0; i < token.attrs.length; i++) {
        const adjustedAttrName = SVG_ATTRS_ADJUSTMENT_MAP.get(token.attrs[i].name);
        if (adjustedAttrName != null) {
            token.attrs[i].name = adjustedAttrName;
        }
    }
}
exports.adjustTokenSVGAttrs = adjustTokenSVGAttrs;
function adjustTokenXMLAttrs(token) {
    for (let i = 0; i < token.attrs.length; i++) {
        const adjustedAttrEntry = XML_ATTRS_ADJUSTMENT_MAP.get(token.attrs[i].name);
        if (adjustedAttrEntry) {
            token.attrs[i].prefix = adjustedAttrEntry.prefix;
            token.attrs[i].name = adjustedAttrEntry.name;
            token.attrs[i].namespace = adjustedAttrEntry.namespace;
        }
    }
}
exports.adjustTokenXMLAttrs = adjustTokenXMLAttrs;
function adjustTokenSVGTagName(token) {
    const adjustedTagName = exports.SVG_TAG_NAMES_ADJUSTMENT_MAP.get(token.tagName);
    if (adjustedTagName != null) {
        token.tagName = adjustedTagName;
        token.tagID = (0, html_js_1.getTagID)(token.tagName);
    }
}
exports.adjustTokenSVGTagName = adjustTokenSVGTagName;
//Integration points
function isMathMLTextIntegrationPoint(tn, ns) {
    return ns === html_js_1.NS.MATHML && (tn === html_js_1.TAG_ID.MI || tn === html_js_1.TAG_ID.MO || tn === html_js_1.TAG_ID.MN || tn === html_js_1.TAG_ID.MS || tn === html_js_1.TAG_ID.MTEXT);
}
function isHtmlIntegrationPoint(tn, ns, attrs) {
    if (ns === html_js_1.NS.MATHML && tn === html_js_1.TAG_ID.ANNOTATION_XML) {
        for (let i = 0; i < attrs.length; i++) {
            if (attrs[i].name === html_js_1.ATTRS.ENCODING) {
                const value = attrs[i].value.toLowerCase();
                return value === MIME_TYPES.TEXT_HTML || value === MIME_TYPES.APPLICATION_XML;
            }
        }
    }
    return ns === html_js_1.NS.SVG && (tn === html_js_1.TAG_ID.FOREIGN_OBJECT || tn === html_js_1.TAG_ID.DESC || tn === html_js_1.TAG_ID.TITLE);
}
function isIntegrationPoint(tn, ns, attrs, foreignNS) {
    return (((!foreignNS || foreignNS === html_js_1.NS.HTML) && isHtmlIntegrationPoint(tn, ns, attrs)) ||
        ((!foreignNS || foreignNS === html_js_1.NS.MATHML) && isMathMLTextIntegrationPoint(tn, ns)));
}
exports.isIntegrationPoint = isIntegrationPoint;

},{"./html.js":9}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasUnescapedText = exports.isNumberedHeader = exports.SPECIAL_ELEMENTS = exports.getTagID = exports.TAG_ID = exports.TAG_NAMES = exports.DOCUMENT_MODE = exports.ATTRS = exports.NS = void 0;
/** All valid namespaces in HTML. */
var NS;
(function (NS) {
    NS["HTML"] = "http://www.w3.org/1999/xhtml";
    NS["MATHML"] = "http://www.w3.org/1998/Math/MathML";
    NS["SVG"] = "http://www.w3.org/2000/svg";
    NS["XLINK"] = "http://www.w3.org/1999/xlink";
    NS["XML"] = "http://www.w3.org/XML/1998/namespace";
    NS["XMLNS"] = "http://www.w3.org/2000/xmlns/";
})(NS = exports.NS || (exports.NS = {}));
var ATTRS;
(function (ATTRS) {
    ATTRS["TYPE"] = "type";
    ATTRS["ACTION"] = "action";
    ATTRS["ENCODING"] = "encoding";
    ATTRS["PROMPT"] = "prompt";
    ATTRS["NAME"] = "name";
    ATTRS["COLOR"] = "color";
    ATTRS["FACE"] = "face";
    ATTRS["SIZE"] = "size";
})(ATTRS = exports.ATTRS || (exports.ATTRS = {}));
/**
 * The mode of the document.
 *
 * @see {@link https://dom.spec.whatwg.org/#concept-document-limited-quirks}
 */
var DOCUMENT_MODE;
(function (DOCUMENT_MODE) {
    DOCUMENT_MODE["NO_QUIRKS"] = "no-quirks";
    DOCUMENT_MODE["QUIRKS"] = "quirks";
    DOCUMENT_MODE["LIMITED_QUIRKS"] = "limited-quirks";
})(DOCUMENT_MODE = exports.DOCUMENT_MODE || (exports.DOCUMENT_MODE = {}));
var TAG_NAMES;
(function (TAG_NAMES) {
    TAG_NAMES["A"] = "a";
    TAG_NAMES["ADDRESS"] = "address";
    TAG_NAMES["ANNOTATION_XML"] = "annotation-xml";
    TAG_NAMES["APPLET"] = "applet";
    TAG_NAMES["AREA"] = "area";
    TAG_NAMES["ARTICLE"] = "article";
    TAG_NAMES["ASIDE"] = "aside";
    TAG_NAMES["B"] = "b";
    TAG_NAMES["BASE"] = "base";
    TAG_NAMES["BASEFONT"] = "basefont";
    TAG_NAMES["BGSOUND"] = "bgsound";
    TAG_NAMES["BIG"] = "big";
    TAG_NAMES["BLOCKQUOTE"] = "blockquote";
    TAG_NAMES["BODY"] = "body";
    TAG_NAMES["BR"] = "br";
    TAG_NAMES["BUTTON"] = "button";
    TAG_NAMES["CAPTION"] = "caption";
    TAG_NAMES["CENTER"] = "center";
    TAG_NAMES["CODE"] = "code";
    TAG_NAMES["COL"] = "col";
    TAG_NAMES["COLGROUP"] = "colgroup";
    TAG_NAMES["DD"] = "dd";
    TAG_NAMES["DESC"] = "desc";
    TAG_NAMES["DETAILS"] = "details";
    TAG_NAMES["DIALOG"] = "dialog";
    TAG_NAMES["DIR"] = "dir";
    TAG_NAMES["DIV"] = "div";
    TAG_NAMES["DL"] = "dl";
    TAG_NAMES["DT"] = "dt";
    TAG_NAMES["EM"] = "em";
    TAG_NAMES["EMBED"] = "embed";
    TAG_NAMES["FIELDSET"] = "fieldset";
    TAG_NAMES["FIGCAPTION"] = "figcaption";
    TAG_NAMES["FIGURE"] = "figure";
    TAG_NAMES["FONT"] = "font";
    TAG_NAMES["FOOTER"] = "footer";
    TAG_NAMES["FOREIGN_OBJECT"] = "foreignObject";
    TAG_NAMES["FORM"] = "form";
    TAG_NAMES["FRAME"] = "frame";
    TAG_NAMES["FRAMESET"] = "frameset";
    TAG_NAMES["H1"] = "h1";
    TAG_NAMES["H2"] = "h2";
    TAG_NAMES["H3"] = "h3";
    TAG_NAMES["H4"] = "h4";
    TAG_NAMES["H5"] = "h5";
    TAG_NAMES["H6"] = "h6";
    TAG_NAMES["HEAD"] = "head";
    TAG_NAMES["HEADER"] = "header";
    TAG_NAMES["HGROUP"] = "hgroup";
    TAG_NAMES["HR"] = "hr";
    TAG_NAMES["HTML"] = "html";
    TAG_NAMES["I"] = "i";
    TAG_NAMES["IMG"] = "img";
    TAG_NAMES["IMAGE"] = "image";
    TAG_NAMES["INPUT"] = "input";
    TAG_NAMES["IFRAME"] = "iframe";
    TAG_NAMES["KEYGEN"] = "keygen";
    TAG_NAMES["LABEL"] = "label";
    TAG_NAMES["LI"] = "li";
    TAG_NAMES["LINK"] = "link";
    TAG_NAMES["LISTING"] = "listing";
    TAG_NAMES["MAIN"] = "main";
    TAG_NAMES["MALIGNMARK"] = "malignmark";
    TAG_NAMES["MARQUEE"] = "marquee";
    TAG_NAMES["MATH"] = "math";
    TAG_NAMES["MENU"] = "menu";
    TAG_NAMES["META"] = "meta";
    TAG_NAMES["MGLYPH"] = "mglyph";
    TAG_NAMES["MI"] = "mi";
    TAG_NAMES["MO"] = "mo";
    TAG_NAMES["MN"] = "mn";
    TAG_NAMES["MS"] = "ms";
    TAG_NAMES["MTEXT"] = "mtext";
    TAG_NAMES["NAV"] = "nav";
    TAG_NAMES["NOBR"] = "nobr";
    TAG_NAMES["NOFRAMES"] = "noframes";
    TAG_NAMES["NOEMBED"] = "noembed";
    TAG_NAMES["NOSCRIPT"] = "noscript";
    TAG_NAMES["OBJECT"] = "object";
    TAG_NAMES["OL"] = "ol";
    TAG_NAMES["OPTGROUP"] = "optgroup";
    TAG_NAMES["OPTION"] = "option";
    TAG_NAMES["P"] = "p";
    TAG_NAMES["PARAM"] = "param";
    TAG_NAMES["PLAINTEXT"] = "plaintext";
    TAG_NAMES["PRE"] = "pre";
    TAG_NAMES["RB"] = "rb";
    TAG_NAMES["RP"] = "rp";
    TAG_NAMES["RT"] = "rt";
    TAG_NAMES["RTC"] = "rtc";
    TAG_NAMES["RUBY"] = "ruby";
    TAG_NAMES["S"] = "s";
    TAG_NAMES["SCRIPT"] = "script";
    TAG_NAMES["SECTION"] = "section";
    TAG_NAMES["SELECT"] = "select";
    TAG_NAMES["SOURCE"] = "source";
    TAG_NAMES["SMALL"] = "small";
    TAG_NAMES["SPAN"] = "span";
    TAG_NAMES["STRIKE"] = "strike";
    TAG_NAMES["STRONG"] = "strong";
    TAG_NAMES["STYLE"] = "style";
    TAG_NAMES["SUB"] = "sub";
    TAG_NAMES["SUMMARY"] = "summary";
    TAG_NAMES["SUP"] = "sup";
    TAG_NAMES["TABLE"] = "table";
    TAG_NAMES["TBODY"] = "tbody";
    TAG_NAMES["TEMPLATE"] = "template";
    TAG_NAMES["TEXTAREA"] = "textarea";
    TAG_NAMES["TFOOT"] = "tfoot";
    TAG_NAMES["TD"] = "td";
    TAG_NAMES["TH"] = "th";
    TAG_NAMES["THEAD"] = "thead";
    TAG_NAMES["TITLE"] = "title";
    TAG_NAMES["TR"] = "tr";
    TAG_NAMES["TRACK"] = "track";
    TAG_NAMES["TT"] = "tt";
    TAG_NAMES["U"] = "u";
    TAG_NAMES["UL"] = "ul";
    TAG_NAMES["SVG"] = "svg";
    TAG_NAMES["VAR"] = "var";
    TAG_NAMES["WBR"] = "wbr";
    TAG_NAMES["XMP"] = "xmp";
})(TAG_NAMES = exports.TAG_NAMES || (exports.TAG_NAMES = {}));
/**
 * Tag IDs are numeric IDs for known tag names.
 *
 * We use tag IDs to improve the performance of tag name comparisons.
 */
var TAG_ID;
(function (TAG_ID) {
    TAG_ID[TAG_ID["UNKNOWN"] = 0] = "UNKNOWN";
    TAG_ID[TAG_ID["A"] = 1] = "A";
    TAG_ID[TAG_ID["ADDRESS"] = 2] = "ADDRESS";
    TAG_ID[TAG_ID["ANNOTATION_XML"] = 3] = "ANNOTATION_XML";
    TAG_ID[TAG_ID["APPLET"] = 4] = "APPLET";
    TAG_ID[TAG_ID["AREA"] = 5] = "AREA";
    TAG_ID[TAG_ID["ARTICLE"] = 6] = "ARTICLE";
    TAG_ID[TAG_ID["ASIDE"] = 7] = "ASIDE";
    TAG_ID[TAG_ID["B"] = 8] = "B";
    TAG_ID[TAG_ID["BASE"] = 9] = "BASE";
    TAG_ID[TAG_ID["BASEFONT"] = 10] = "BASEFONT";
    TAG_ID[TAG_ID["BGSOUND"] = 11] = "BGSOUND";
    TAG_ID[TAG_ID["BIG"] = 12] = "BIG";
    TAG_ID[TAG_ID["BLOCKQUOTE"] = 13] = "BLOCKQUOTE";
    TAG_ID[TAG_ID["BODY"] = 14] = "BODY";
    TAG_ID[TAG_ID["BR"] = 15] = "BR";
    TAG_ID[TAG_ID["BUTTON"] = 16] = "BUTTON";
    TAG_ID[TAG_ID["CAPTION"] = 17] = "CAPTION";
    TAG_ID[TAG_ID["CENTER"] = 18] = "CENTER";
    TAG_ID[TAG_ID["CODE"] = 19] = "CODE";
    TAG_ID[TAG_ID["COL"] = 20] = "COL";
    TAG_ID[TAG_ID["COLGROUP"] = 21] = "COLGROUP";
    TAG_ID[TAG_ID["DD"] = 22] = "DD";
    TAG_ID[TAG_ID["DESC"] = 23] = "DESC";
    TAG_ID[TAG_ID["DETAILS"] = 24] = "DETAILS";
    TAG_ID[TAG_ID["DIALOG"] = 25] = "DIALOG";
    TAG_ID[TAG_ID["DIR"] = 26] = "DIR";
    TAG_ID[TAG_ID["DIV"] = 27] = "DIV";
    TAG_ID[TAG_ID["DL"] = 28] = "DL";
    TAG_ID[TAG_ID["DT"] = 29] = "DT";
    TAG_ID[TAG_ID["EM"] = 30] = "EM";
    TAG_ID[TAG_ID["EMBED"] = 31] = "EMBED";
    TAG_ID[TAG_ID["FIELDSET"] = 32] = "FIELDSET";
    TAG_ID[TAG_ID["FIGCAPTION"] = 33] = "FIGCAPTION";
    TAG_ID[TAG_ID["FIGURE"] = 34] = "FIGURE";
    TAG_ID[TAG_ID["FONT"] = 35] = "FONT";
    TAG_ID[TAG_ID["FOOTER"] = 36] = "FOOTER";
    TAG_ID[TAG_ID["FOREIGN_OBJECT"] = 37] = "FOREIGN_OBJECT";
    TAG_ID[TAG_ID["FORM"] = 38] = "FORM";
    TAG_ID[TAG_ID["FRAME"] = 39] = "FRAME";
    TAG_ID[TAG_ID["FRAMESET"] = 40] = "FRAMESET";
    TAG_ID[TAG_ID["H1"] = 41] = "H1";
    TAG_ID[TAG_ID["H2"] = 42] = "H2";
    TAG_ID[TAG_ID["H3"] = 43] = "H3";
    TAG_ID[TAG_ID["H4"] = 44] = "H4";
    TAG_ID[TAG_ID["H5"] = 45] = "H5";
    TAG_ID[TAG_ID["H6"] = 46] = "H6";
    TAG_ID[TAG_ID["HEAD"] = 47] = "HEAD";
    TAG_ID[TAG_ID["HEADER"] = 48] = "HEADER";
    TAG_ID[TAG_ID["HGROUP"] = 49] = "HGROUP";
    TAG_ID[TAG_ID["HR"] = 50] = "HR";
    TAG_ID[TAG_ID["HTML"] = 51] = "HTML";
    TAG_ID[TAG_ID["I"] = 52] = "I";
    TAG_ID[TAG_ID["IMG"] = 53] = "IMG";
    TAG_ID[TAG_ID["IMAGE"] = 54] = "IMAGE";
    TAG_ID[TAG_ID["INPUT"] = 55] = "INPUT";
    TAG_ID[TAG_ID["IFRAME"] = 56] = "IFRAME";
    TAG_ID[TAG_ID["KEYGEN"] = 57] = "KEYGEN";
    TAG_ID[TAG_ID["LABEL"] = 58] = "LABEL";
    TAG_ID[TAG_ID["LI"] = 59] = "LI";
    TAG_ID[TAG_ID["LINK"] = 60] = "LINK";
    TAG_ID[TAG_ID["LISTING"] = 61] = "LISTING";
    TAG_ID[TAG_ID["MAIN"] = 62] = "MAIN";
    TAG_ID[TAG_ID["MALIGNMARK"] = 63] = "MALIGNMARK";
    TAG_ID[TAG_ID["MARQUEE"] = 64] = "MARQUEE";
    TAG_ID[TAG_ID["MATH"] = 65] = "MATH";
    TAG_ID[TAG_ID["MENU"] = 66] = "MENU";
    TAG_ID[TAG_ID["META"] = 67] = "META";
    TAG_ID[TAG_ID["MGLYPH"] = 68] = "MGLYPH";
    TAG_ID[TAG_ID["MI"] = 69] = "MI";
    TAG_ID[TAG_ID["MO"] = 70] = "MO";
    TAG_ID[TAG_ID["MN"] = 71] = "MN";
    TAG_ID[TAG_ID["MS"] = 72] = "MS";
    TAG_ID[TAG_ID["MTEXT"] = 73] = "MTEXT";
    TAG_ID[TAG_ID["NAV"] = 74] = "NAV";
    TAG_ID[TAG_ID["NOBR"] = 75] = "NOBR";
    TAG_ID[TAG_ID["NOFRAMES"] = 76] = "NOFRAMES";
    TAG_ID[TAG_ID["NOEMBED"] = 77] = "NOEMBED";
    TAG_ID[TAG_ID["NOSCRIPT"] = 78] = "NOSCRIPT";
    TAG_ID[TAG_ID["OBJECT"] = 79] = "OBJECT";
    TAG_ID[TAG_ID["OL"] = 80] = "OL";
    TAG_ID[TAG_ID["OPTGROUP"] = 81] = "OPTGROUP";
    TAG_ID[TAG_ID["OPTION"] = 82] = "OPTION";
    TAG_ID[TAG_ID["P"] = 83] = "P";
    TAG_ID[TAG_ID["PARAM"] = 84] = "PARAM";
    TAG_ID[TAG_ID["PLAINTEXT"] = 85] = "PLAINTEXT";
    TAG_ID[TAG_ID["PRE"] = 86] = "PRE";
    TAG_ID[TAG_ID["RB"] = 87] = "RB";
    TAG_ID[TAG_ID["RP"] = 88] = "RP";
    TAG_ID[TAG_ID["RT"] = 89] = "RT";
    TAG_ID[TAG_ID["RTC"] = 90] = "RTC";
    TAG_ID[TAG_ID["RUBY"] = 91] = "RUBY";
    TAG_ID[TAG_ID["S"] = 92] = "S";
    TAG_ID[TAG_ID["SCRIPT"] = 93] = "SCRIPT";
    TAG_ID[TAG_ID["SECTION"] = 94] = "SECTION";
    TAG_ID[TAG_ID["SELECT"] = 95] = "SELECT";
    TAG_ID[TAG_ID["SOURCE"] = 96] = "SOURCE";
    TAG_ID[TAG_ID["SMALL"] = 97] = "SMALL";
    TAG_ID[TAG_ID["SPAN"] = 98] = "SPAN";
    TAG_ID[TAG_ID["STRIKE"] = 99] = "STRIKE";
    TAG_ID[TAG_ID["STRONG"] = 100] = "STRONG";
    TAG_ID[TAG_ID["STYLE"] = 101] = "STYLE";
    TAG_ID[TAG_ID["SUB"] = 102] = "SUB";
    TAG_ID[TAG_ID["SUMMARY"] = 103] = "SUMMARY";
    TAG_ID[TAG_ID["SUP"] = 104] = "SUP";
    TAG_ID[TAG_ID["TABLE"] = 105] = "TABLE";
    TAG_ID[TAG_ID["TBODY"] = 106] = "TBODY";
    TAG_ID[TAG_ID["TEMPLATE"] = 107] = "TEMPLATE";
    TAG_ID[TAG_ID["TEXTAREA"] = 108] = "TEXTAREA";
    TAG_ID[TAG_ID["TFOOT"] = 109] = "TFOOT";
    TAG_ID[TAG_ID["TD"] = 110] = "TD";
    TAG_ID[TAG_ID["TH"] = 111] = "TH";
    TAG_ID[TAG_ID["THEAD"] = 112] = "THEAD";
    TAG_ID[TAG_ID["TITLE"] = 113] = "TITLE";
    TAG_ID[TAG_ID["TR"] = 114] = "TR";
    TAG_ID[TAG_ID["TRACK"] = 115] = "TRACK";
    TAG_ID[TAG_ID["TT"] = 116] = "TT";
    TAG_ID[TAG_ID["U"] = 117] = "U";
    TAG_ID[TAG_ID["UL"] = 118] = "UL";
    TAG_ID[TAG_ID["SVG"] = 119] = "SVG";
    TAG_ID[TAG_ID["VAR"] = 120] = "VAR";
    TAG_ID[TAG_ID["WBR"] = 121] = "WBR";
    TAG_ID[TAG_ID["XMP"] = 122] = "XMP";
})(TAG_ID = exports.TAG_ID || (exports.TAG_ID = {}));
const TAG_NAME_TO_ID = new Map([
    [TAG_NAMES.A, TAG_ID.A],
    [TAG_NAMES.ADDRESS, TAG_ID.ADDRESS],
    [TAG_NAMES.ANNOTATION_XML, TAG_ID.ANNOTATION_XML],
    [TAG_NAMES.APPLET, TAG_ID.APPLET],
    [TAG_NAMES.AREA, TAG_ID.AREA],
    [TAG_NAMES.ARTICLE, TAG_ID.ARTICLE],
    [TAG_NAMES.ASIDE, TAG_ID.ASIDE],
    [TAG_NAMES.B, TAG_ID.B],
    [TAG_NAMES.BASE, TAG_ID.BASE],
    [TAG_NAMES.BASEFONT, TAG_ID.BASEFONT],
    [TAG_NAMES.BGSOUND, TAG_ID.BGSOUND],
    [TAG_NAMES.BIG, TAG_ID.BIG],
    [TAG_NAMES.BLOCKQUOTE, TAG_ID.BLOCKQUOTE],
    [TAG_NAMES.BODY, TAG_ID.BODY],
    [TAG_NAMES.BR, TAG_ID.BR],
    [TAG_NAMES.BUTTON, TAG_ID.BUTTON],
    [TAG_NAMES.CAPTION, TAG_ID.CAPTION],
    [TAG_NAMES.CENTER, TAG_ID.CENTER],
    [TAG_NAMES.CODE, TAG_ID.CODE],
    [TAG_NAMES.COL, TAG_ID.COL],
    [TAG_NAMES.COLGROUP, TAG_ID.COLGROUP],
    [TAG_NAMES.DD, TAG_ID.DD],
    [TAG_NAMES.DESC, TAG_ID.DESC],
    [TAG_NAMES.DETAILS, TAG_ID.DETAILS],
    [TAG_NAMES.DIALOG, TAG_ID.DIALOG],
    [TAG_NAMES.DIR, TAG_ID.DIR],
    [TAG_NAMES.DIV, TAG_ID.DIV],
    [TAG_NAMES.DL, TAG_ID.DL],
    [TAG_NAMES.DT, TAG_ID.DT],
    [TAG_NAMES.EM, TAG_ID.EM],
    [TAG_NAMES.EMBED, TAG_ID.EMBED],
    [TAG_NAMES.FIELDSET, TAG_ID.FIELDSET],
    [TAG_NAMES.FIGCAPTION, TAG_ID.FIGCAPTION],
    [TAG_NAMES.FIGURE, TAG_ID.FIGURE],
    [TAG_NAMES.FONT, TAG_ID.FONT],
    [TAG_NAMES.FOOTER, TAG_ID.FOOTER],
    [TAG_NAMES.FOREIGN_OBJECT, TAG_ID.FOREIGN_OBJECT],
    [TAG_NAMES.FORM, TAG_ID.FORM],
    [TAG_NAMES.FRAME, TAG_ID.FRAME],
    [TAG_NAMES.FRAMESET, TAG_ID.FRAMESET],
    [TAG_NAMES.H1, TAG_ID.H1],
    [TAG_NAMES.H2, TAG_ID.H2],
    [TAG_NAMES.H3, TAG_ID.H3],
    [TAG_NAMES.H4, TAG_ID.H4],
    [TAG_NAMES.H5, TAG_ID.H5],
    [TAG_NAMES.H6, TAG_ID.H6],
    [TAG_NAMES.HEAD, TAG_ID.HEAD],
    [TAG_NAMES.HEADER, TAG_ID.HEADER],
    [TAG_NAMES.HGROUP, TAG_ID.HGROUP],
    [TAG_NAMES.HR, TAG_ID.HR],
    [TAG_NAMES.HTML, TAG_ID.HTML],
    [TAG_NAMES.I, TAG_ID.I],
    [TAG_NAMES.IMG, TAG_ID.IMG],
    [TAG_NAMES.IMAGE, TAG_ID.IMAGE],
    [TAG_NAMES.INPUT, TAG_ID.INPUT],
    [TAG_NAMES.IFRAME, TAG_ID.IFRAME],
    [TAG_NAMES.KEYGEN, TAG_ID.KEYGEN],
    [TAG_NAMES.LABEL, TAG_ID.LABEL],
    [TAG_NAMES.LI, TAG_ID.LI],
    [TAG_NAMES.LINK, TAG_ID.LINK],
    [TAG_NAMES.LISTING, TAG_ID.LISTING],
    [TAG_NAMES.MAIN, TAG_ID.MAIN],
    [TAG_NAMES.MALIGNMARK, TAG_ID.MALIGNMARK],
    [TAG_NAMES.MARQUEE, TAG_ID.MARQUEE],
    [TAG_NAMES.MATH, TAG_ID.MATH],
    [TAG_NAMES.MENU, TAG_ID.MENU],
    [TAG_NAMES.META, TAG_ID.META],
    [TAG_NAMES.MGLYPH, TAG_ID.MGLYPH],
    [TAG_NAMES.MI, TAG_ID.MI],
    [TAG_NAMES.MO, TAG_ID.MO],
    [TAG_NAMES.MN, TAG_ID.MN],
    [TAG_NAMES.MS, TAG_ID.MS],
    [TAG_NAMES.MTEXT, TAG_ID.MTEXT],
    [TAG_NAMES.NAV, TAG_ID.NAV],
    [TAG_NAMES.NOBR, TAG_ID.NOBR],
    [TAG_NAMES.NOFRAMES, TAG_ID.NOFRAMES],
    [TAG_NAMES.NOEMBED, TAG_ID.NOEMBED],
    [TAG_NAMES.NOSCRIPT, TAG_ID.NOSCRIPT],
    [TAG_NAMES.OBJECT, TAG_ID.OBJECT],
    [TAG_NAMES.OL, TAG_ID.OL],
    [TAG_NAMES.OPTGROUP, TAG_ID.OPTGROUP],
    [TAG_NAMES.OPTION, TAG_ID.OPTION],
    [TAG_NAMES.P, TAG_ID.P],
    [TAG_NAMES.PARAM, TAG_ID.PARAM],
    [TAG_NAMES.PLAINTEXT, TAG_ID.PLAINTEXT],
    [TAG_NAMES.PRE, TAG_ID.PRE],
    [TAG_NAMES.RB, TAG_ID.RB],
    [TAG_NAMES.RP, TAG_ID.RP],
    [TAG_NAMES.RT, TAG_ID.RT],
    [TAG_NAMES.RTC, TAG_ID.RTC],
    [TAG_NAMES.RUBY, TAG_ID.RUBY],
    [TAG_NAMES.S, TAG_ID.S],
    [TAG_NAMES.SCRIPT, TAG_ID.SCRIPT],
    [TAG_NAMES.SECTION, TAG_ID.SECTION],
    [TAG_NAMES.SELECT, TAG_ID.SELECT],
    [TAG_NAMES.SOURCE, TAG_ID.SOURCE],
    [TAG_NAMES.SMALL, TAG_ID.SMALL],
    [TAG_NAMES.SPAN, TAG_ID.SPAN],
    [TAG_NAMES.STRIKE, TAG_ID.STRIKE],
    [TAG_NAMES.STRONG, TAG_ID.STRONG],
    [TAG_NAMES.STYLE, TAG_ID.STYLE],
    [TAG_NAMES.SUB, TAG_ID.SUB],
    [TAG_NAMES.SUMMARY, TAG_ID.SUMMARY],
    [TAG_NAMES.SUP, TAG_ID.SUP],
    [TAG_NAMES.TABLE, TAG_ID.TABLE],
    [TAG_NAMES.TBODY, TAG_ID.TBODY],
    [TAG_NAMES.TEMPLATE, TAG_ID.TEMPLATE],
    [TAG_NAMES.TEXTAREA, TAG_ID.TEXTAREA],
    [TAG_NAMES.TFOOT, TAG_ID.TFOOT],
    [TAG_NAMES.TD, TAG_ID.TD],
    [TAG_NAMES.TH, TAG_ID.TH],
    [TAG_NAMES.THEAD, TAG_ID.THEAD],
    [TAG_NAMES.TITLE, TAG_ID.TITLE],
    [TAG_NAMES.TR, TAG_ID.TR],
    [TAG_NAMES.TRACK, TAG_ID.TRACK],
    [TAG_NAMES.TT, TAG_ID.TT],
    [TAG_NAMES.U, TAG_ID.U],
    [TAG_NAMES.UL, TAG_ID.UL],
    [TAG_NAMES.SVG, TAG_ID.SVG],
    [TAG_NAMES.VAR, TAG_ID.VAR],
    [TAG_NAMES.WBR, TAG_ID.WBR],
    [TAG_NAMES.XMP, TAG_ID.XMP],
]);
function getTagID(tagName) {
    var _a;
    return (_a = TAG_NAME_TO_ID.get(tagName)) !== null && _a !== void 0 ? _a : TAG_ID.UNKNOWN;
}
exports.getTagID = getTagID;
const $ = TAG_ID;
exports.SPECIAL_ELEMENTS = {
    [NS.HTML]: new Set([
        $.ADDRESS,
        $.APPLET,
        $.AREA,
        $.ARTICLE,
        $.ASIDE,
        $.BASE,
        $.BASEFONT,
        $.BGSOUND,
        $.BLOCKQUOTE,
        $.BODY,
        $.BR,
        $.BUTTON,
        $.CAPTION,
        $.CENTER,
        $.COL,
        $.COLGROUP,
        $.DD,
        $.DETAILS,
        $.DIR,
        $.DIV,
        $.DL,
        $.DT,
        $.EMBED,
        $.FIELDSET,
        $.FIGCAPTION,
        $.FIGURE,
        $.FOOTER,
        $.FORM,
        $.FRAME,
        $.FRAMESET,
        $.H1,
        $.H2,
        $.H3,
        $.H4,
        $.H5,
        $.H6,
        $.HEAD,
        $.HEADER,
        $.HGROUP,
        $.HR,
        $.HTML,
        $.IFRAME,
        $.IMG,
        $.INPUT,
        $.LI,
        $.LINK,
        $.LISTING,
        $.MAIN,
        $.MARQUEE,
        $.MENU,
        $.META,
        $.NAV,
        $.NOEMBED,
        $.NOFRAMES,
        $.NOSCRIPT,
        $.OBJECT,
        $.OL,
        $.P,
        $.PARAM,
        $.PLAINTEXT,
        $.PRE,
        $.SCRIPT,
        $.SECTION,
        $.SELECT,
        $.SOURCE,
        $.STYLE,
        $.SUMMARY,
        $.TABLE,
        $.TBODY,
        $.TD,
        $.TEMPLATE,
        $.TEXTAREA,
        $.TFOOT,
        $.TH,
        $.THEAD,
        $.TITLE,
        $.TR,
        $.TRACK,
        $.UL,
        $.WBR,
        $.XMP,
    ]),
    [NS.MATHML]: new Set([$.MI, $.MO, $.MN, $.MS, $.MTEXT, $.ANNOTATION_XML]),
    [NS.SVG]: new Set([$.TITLE, $.FOREIGN_OBJECT, $.DESC]),
    [NS.XLINK]: new Set(),
    [NS.XML]: new Set(),
    [NS.XMLNS]: new Set(),
};
function isNumberedHeader(tn) {
    return tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6;
}
exports.isNumberedHeader = isNumberedHeader;
const UNESCAPED_TEXT = new Set([
    TAG_NAMES.STYLE,
    TAG_NAMES.SCRIPT,
    TAG_NAMES.XMP,
    TAG_NAMES.IFRAME,
    TAG_NAMES.NOEMBED,
    TAG_NAMES.NOFRAMES,
    TAG_NAMES.PLAINTEXT,
]);
function hasUnescapedText(tn, scriptingEnabled) {
    return UNESCAPED_TEXT.has(tn) || (scriptingEnabled && tn === TAG_NAMES.NOSCRIPT);
}
exports.hasUnescapedText = hasUnescapedText;

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenAttr = exports.TokenType = void 0;
var TokenType;
(function (TokenType) {
    TokenType[TokenType["CHARACTER"] = 0] = "CHARACTER";
    TokenType[TokenType["NULL_CHARACTER"] = 1] = "NULL_CHARACTER";
    TokenType[TokenType["WHITESPACE_CHARACTER"] = 2] = "WHITESPACE_CHARACTER";
    TokenType[TokenType["START_TAG"] = 3] = "START_TAG";
    TokenType[TokenType["END_TAG"] = 4] = "END_TAG";
    TokenType[TokenType["COMMENT"] = 5] = "COMMENT";
    TokenType[TokenType["DOCTYPE"] = 6] = "DOCTYPE";
    TokenType[TokenType["EOF"] = 7] = "EOF";
    TokenType[TokenType["HIBERNATION"] = 8] = "HIBERNATION";
})(TokenType = exports.TokenType || (exports.TokenType = {}));
function getTokenAttr(token, attrName) {
    for (let i = token.attrs.length - 1; i >= 0; i--) {
        if (token.attrs[i].name === attrName) {
            return token.attrs[i].value;
        }
    }
    return null;
}
exports.getTokenAttr = getTokenAttr;

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUndefinedCodePoint = exports.isControlCodePoint = exports.getSurrogatePairCodePoint = exports.isSurrogatePair = exports.isSurrogate = exports.SEQUENCES = exports.CODE_POINTS = exports.REPLACEMENT_CHARACTER = void 0;
const UNDEFINED_CODE_POINTS = new Set([
    65534, 65535, 131070, 131071, 196606, 196607, 262142, 262143, 327678, 327679, 393214,
    393215, 458750, 458751, 524286, 524287, 589822, 589823, 655358, 655359, 720894,
    720895, 786430, 786431, 851966, 851967, 917502, 917503, 983038, 983039, 1048574,
    1048575, 1114110, 1114111,
]);
exports.REPLACEMENT_CHARACTER = '\uFFFD';
var CODE_POINTS;
(function (CODE_POINTS) {
    CODE_POINTS[CODE_POINTS["EOF"] = -1] = "EOF";
    CODE_POINTS[CODE_POINTS["NULL"] = 0] = "NULL";
    CODE_POINTS[CODE_POINTS["TABULATION"] = 9] = "TABULATION";
    CODE_POINTS[CODE_POINTS["CARRIAGE_RETURN"] = 13] = "CARRIAGE_RETURN";
    CODE_POINTS[CODE_POINTS["LINE_FEED"] = 10] = "LINE_FEED";
    CODE_POINTS[CODE_POINTS["FORM_FEED"] = 12] = "FORM_FEED";
    CODE_POINTS[CODE_POINTS["SPACE"] = 32] = "SPACE";
    CODE_POINTS[CODE_POINTS["EXCLAMATION_MARK"] = 33] = "EXCLAMATION_MARK";
    CODE_POINTS[CODE_POINTS["QUOTATION_MARK"] = 34] = "QUOTATION_MARK";
    CODE_POINTS[CODE_POINTS["NUMBER_SIGN"] = 35] = "NUMBER_SIGN";
    CODE_POINTS[CODE_POINTS["AMPERSAND"] = 38] = "AMPERSAND";
    CODE_POINTS[CODE_POINTS["APOSTROPHE"] = 39] = "APOSTROPHE";
    CODE_POINTS[CODE_POINTS["HYPHEN_MINUS"] = 45] = "HYPHEN_MINUS";
    CODE_POINTS[CODE_POINTS["SOLIDUS"] = 47] = "SOLIDUS";
    CODE_POINTS[CODE_POINTS["DIGIT_0"] = 48] = "DIGIT_0";
    CODE_POINTS[CODE_POINTS["DIGIT_9"] = 57] = "DIGIT_9";
    CODE_POINTS[CODE_POINTS["SEMICOLON"] = 59] = "SEMICOLON";
    CODE_POINTS[CODE_POINTS["LESS_THAN_SIGN"] = 60] = "LESS_THAN_SIGN";
    CODE_POINTS[CODE_POINTS["EQUALS_SIGN"] = 61] = "EQUALS_SIGN";
    CODE_POINTS[CODE_POINTS["GREATER_THAN_SIGN"] = 62] = "GREATER_THAN_SIGN";
    CODE_POINTS[CODE_POINTS["QUESTION_MARK"] = 63] = "QUESTION_MARK";
    CODE_POINTS[CODE_POINTS["LATIN_CAPITAL_A"] = 65] = "LATIN_CAPITAL_A";
    CODE_POINTS[CODE_POINTS["LATIN_CAPITAL_F"] = 70] = "LATIN_CAPITAL_F";
    CODE_POINTS[CODE_POINTS["LATIN_CAPITAL_X"] = 88] = "LATIN_CAPITAL_X";
    CODE_POINTS[CODE_POINTS["LATIN_CAPITAL_Z"] = 90] = "LATIN_CAPITAL_Z";
    CODE_POINTS[CODE_POINTS["RIGHT_SQUARE_BRACKET"] = 93] = "RIGHT_SQUARE_BRACKET";
    CODE_POINTS[CODE_POINTS["GRAVE_ACCENT"] = 96] = "GRAVE_ACCENT";
    CODE_POINTS[CODE_POINTS["LATIN_SMALL_A"] = 97] = "LATIN_SMALL_A";
    CODE_POINTS[CODE_POINTS["LATIN_SMALL_F"] = 102] = "LATIN_SMALL_F";
    CODE_POINTS[CODE_POINTS["LATIN_SMALL_X"] = 120] = "LATIN_SMALL_X";
    CODE_POINTS[CODE_POINTS["LATIN_SMALL_Z"] = 122] = "LATIN_SMALL_Z";
    CODE_POINTS[CODE_POINTS["REPLACEMENT_CHARACTER"] = 65533] = "REPLACEMENT_CHARACTER";
})(CODE_POINTS = exports.CODE_POINTS || (exports.CODE_POINTS = {}));
exports.SEQUENCES = {
    DASH_DASH: '--',
    CDATA_START: '[CDATA[',
    DOCTYPE: 'doctype',
    SCRIPT: 'script',
    PUBLIC: 'public',
    SYSTEM: 'system',
};
//Surrogates
function isSurrogate(cp) {
    return cp >= 55296 && cp <= 57343;
}
exports.isSurrogate = isSurrogate;
function isSurrogatePair(cp) {
    return cp >= 56320 && cp <= 57343;
}
exports.isSurrogatePair = isSurrogatePair;
function getSurrogatePairCodePoint(cp1, cp2) {
    return (cp1 - 55296) * 1024 + 9216 + cp2;
}
exports.getSurrogatePairCodePoint = getSurrogatePairCodePoint;
//NOTE: excluding NULL and ASCII whitespace
function isControlCodePoint(cp) {
    return ((cp !== 0x20 && cp !== 0x0a && cp !== 0x0d && cp !== 0x09 && cp !== 0x0c && cp >= 0x01 && cp <= 0x1f) ||
        (cp >= 0x7f && cp <= 0x9f));
}
exports.isControlCodePoint = isControlCodePoint;
function isUndefinedCodePoint(cp) {
    return (cp >= 64976 && cp <= 65007) || UNDEFINED_CODE_POINTS.has(cp);
}
exports.isUndefinedCodePoint = isUndefinedCodePoint;

},{}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFragment = exports.parse = exports.TokenizerMode = exports.Tokenizer = exports.Token = exports.html = exports.foreignContent = exports.serializeOuter = exports.serialize = exports.Parser = exports.defaultTreeAdapter = void 0;
const index_js_1 = require("./parser/index.js");
var default_js_1 = require("./tree-adapters/default.js");
Object.defineProperty(exports, "defaultTreeAdapter", { enumerable: true, get: function () { return default_js_1.defaultTreeAdapter; } });
var index_js_2 = require("./parser/index.js");
Object.defineProperty(exports, "Parser", { enumerable: true, get: function () { return index_js_2.Parser; } });
var index_js_3 = require("./serializer/index.js");
Object.defineProperty(exports, "serialize", { enumerable: true, get: function () { return index_js_3.serialize; } });
Object.defineProperty(exports, "serializeOuter", { enumerable: true, get: function () { return index_js_3.serializeOuter; } });
/** @internal */
exports.foreignContent = require("./common/foreign-content.js");
/** @internal */
exports.html = require("./common/html.js");
/** @internal */
exports.Token = require("./common/token.js");
/** @internal */
var index_js_4 = require("./tokenizer/index.js");
Object.defineProperty(exports, "Tokenizer", { enumerable: true, get: function () { return index_js_4.Tokenizer; } });
Object.defineProperty(exports, "TokenizerMode", { enumerable: true, get: function () { return index_js_4.TokenizerMode; } });
// Shorthands
/**
 * Parses an HTML string.
 *
 * @param html Input HTML string.
 * @param options Parsing options.
 * @returns Document
 *
 * @example
 *
 * ```js
 * const parse5 = require('parse5');
 *
 * const document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
 *
 * console.log(document.childNodes[1].tagName); //> 'html'
 *```
 */
function parse(html, options) {
    return index_js_1.Parser.parse(html, options);
}
exports.parse = parse;
function parseFragment(fragmentContext, html, options) {
    if (typeof fragmentContext === 'string') {
        options = html;
        html = fragmentContext;
        fragmentContext = null;
    }
    const parser = index_js_1.Parser.getFragmentParser(fragmentContext, options);
    parser.tokenizer.write(html, true);
    return parser.getFragment();
}
exports.parseFragment = parseFragment;

},{"./common/foreign-content.js":8,"./common/html.js":9,"./common/token.js":10,"./parser/index.js":14,"./serializer/index.js":16,"./tokenizer/index.js":17,"./tree-adapters/default.js":19}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormattingElementList = exports.EntryType = void 0;
//Const
const NOAH_ARK_CAPACITY = 3;
var EntryType;
(function (EntryType) {
    EntryType[EntryType["Marker"] = 0] = "Marker";
    EntryType[EntryType["Element"] = 1] = "Element";
})(EntryType = exports.EntryType || (exports.EntryType = {}));
const MARKER = { type: EntryType.Marker };
//List of formatting elements
class FormattingElementList {
    constructor(treeAdapter) {
        this.treeAdapter = treeAdapter;
        this.entries = [];
        this.bookmark = null;
    }
    //Noah Ark's condition
    //OPTIMIZATION: at first we try to find possible candidates for exclusion using
    //lightweight heuristics without thorough attributes check.
    _getNoahArkConditionCandidates(newElement, neAttrs) {
        const candidates = [];
        const neAttrsLength = neAttrs.length;
        const neTagName = this.treeAdapter.getTagName(newElement);
        const neNamespaceURI = this.treeAdapter.getNamespaceURI(newElement);
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            if (entry.type === EntryType.Marker) {
                break;
            }
            const { element } = entry;
            if (this.treeAdapter.getTagName(element) === neTagName &&
                this.treeAdapter.getNamespaceURI(element) === neNamespaceURI) {
                const elementAttrs = this.treeAdapter.getAttrList(element);
                if (elementAttrs.length === neAttrsLength) {
                    candidates.push({ idx: i, attrs: elementAttrs });
                }
            }
        }
        return candidates;
    }
    _ensureNoahArkCondition(newElement) {
        if (this.entries.length < NOAH_ARK_CAPACITY)
            return;
        const neAttrs = this.treeAdapter.getAttrList(newElement);
        const candidates = this._getNoahArkConditionCandidates(newElement, neAttrs);
        if (candidates.length < NOAH_ARK_CAPACITY)
            return;
        //NOTE: build attrs map for the new element, so we can perform fast lookups
        const neAttrsMap = new Map(neAttrs.map((neAttr) => [neAttr.name, neAttr.value]));
        let validCandidates = 0;
        //NOTE: remove bottommost candidates, until Noah's Ark condition will not be met
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            // We know that `candidate.attrs.length === neAttrs.length`
            if (candidate.attrs.every((cAttr) => neAttrsMap.get(cAttr.name) === cAttr.value)) {
                validCandidates += 1;
                if (validCandidates >= NOAH_ARK_CAPACITY) {
                    this.entries.splice(candidate.idx, 1);
                }
            }
        }
    }
    //Mutations
    insertMarker() {
        this.entries.unshift(MARKER);
    }
    pushElement(element, token) {
        this._ensureNoahArkCondition(element);
        this.entries.unshift({
            type: EntryType.Element,
            element,
            token,
        });
    }
    insertElementAfterBookmark(element, token) {
        const bookmarkIdx = this.entries.indexOf(this.bookmark);
        this.entries.splice(bookmarkIdx, 0, {
            type: EntryType.Element,
            element,
            token,
        });
    }
    removeEntry(entry) {
        const entryIndex = this.entries.indexOf(entry);
        if (entryIndex >= 0) {
            this.entries.splice(entryIndex, 1);
        }
    }
    /**
     * Clears the list of formatting elements up to the last marker.
     *
     * @see https://html.spec.whatwg.org/multipage/parsing.html#clear-the-list-of-active-formatting-elements-up-to-the-last-marker
     */
    clearToLastMarker() {
        const markerIdx = this.entries.indexOf(MARKER);
        if (markerIdx >= 0) {
            this.entries.splice(0, markerIdx + 1);
        }
        else {
            this.entries.length = 0;
        }
    }
    //Search
    getElementEntryInScopeWithTagName(tagName) {
        const entry = this.entries.find((entry) => entry.type === EntryType.Marker || this.treeAdapter.getTagName(entry.element) === tagName);
        return entry && entry.type === EntryType.Element ? entry : null;
    }
    getElementEntry(element) {
        return this.entries.find((entry) => entry.type === EntryType.Element && entry.element === element);
    }
}
exports.FormattingElementList = FormattingElementList;

},{}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const index_js_1 = require("../tokenizer/index.js");
const open_element_stack_js_1 = require("./open-element-stack.js");
const formatting_element_list_js_1 = require("./formatting-element-list.js");
const default_js_1 = require("../tree-adapters/default.js");
const doctype = require("../common/doctype.js");
const foreignContent = require("../common/foreign-content.js");
const error_codes_js_1 = require("../common/error-codes.js");
const unicode = require("../common/unicode.js");
const html_js_1 = require("../common/html.js");
const token_js_1 = require("../common/token.js");
//Misc constants
const HIDDEN_INPUT_TYPE = 'hidden';
//Adoption agency loops iteration count
const AA_OUTER_LOOP_ITER = 8;
const AA_INNER_LOOP_ITER = 3;
//Insertion modes
var InsertionMode;
(function (InsertionMode) {
    InsertionMode[InsertionMode["INITIAL"] = 0] = "INITIAL";
    InsertionMode[InsertionMode["BEFORE_HTML"] = 1] = "BEFORE_HTML";
    InsertionMode[InsertionMode["BEFORE_HEAD"] = 2] = "BEFORE_HEAD";
    InsertionMode[InsertionMode["IN_HEAD"] = 3] = "IN_HEAD";
    InsertionMode[InsertionMode["IN_HEAD_NO_SCRIPT"] = 4] = "IN_HEAD_NO_SCRIPT";
    InsertionMode[InsertionMode["AFTER_HEAD"] = 5] = "AFTER_HEAD";
    InsertionMode[InsertionMode["IN_BODY"] = 6] = "IN_BODY";
    InsertionMode[InsertionMode["TEXT"] = 7] = "TEXT";
    InsertionMode[InsertionMode["IN_TABLE"] = 8] = "IN_TABLE";
    InsertionMode[InsertionMode["IN_TABLE_TEXT"] = 9] = "IN_TABLE_TEXT";
    InsertionMode[InsertionMode["IN_CAPTION"] = 10] = "IN_CAPTION";
    InsertionMode[InsertionMode["IN_COLUMN_GROUP"] = 11] = "IN_COLUMN_GROUP";
    InsertionMode[InsertionMode["IN_TABLE_BODY"] = 12] = "IN_TABLE_BODY";
    InsertionMode[InsertionMode["IN_ROW"] = 13] = "IN_ROW";
    InsertionMode[InsertionMode["IN_CELL"] = 14] = "IN_CELL";
    InsertionMode[InsertionMode["IN_SELECT"] = 15] = "IN_SELECT";
    InsertionMode[InsertionMode["IN_SELECT_IN_TABLE"] = 16] = "IN_SELECT_IN_TABLE";
    InsertionMode[InsertionMode["IN_TEMPLATE"] = 17] = "IN_TEMPLATE";
    InsertionMode[InsertionMode["AFTER_BODY"] = 18] = "AFTER_BODY";
    InsertionMode[InsertionMode["IN_FRAMESET"] = 19] = "IN_FRAMESET";
    InsertionMode[InsertionMode["AFTER_FRAMESET"] = 20] = "AFTER_FRAMESET";
    InsertionMode[InsertionMode["AFTER_AFTER_BODY"] = 21] = "AFTER_AFTER_BODY";
    InsertionMode[InsertionMode["AFTER_AFTER_FRAMESET"] = 22] = "AFTER_AFTER_FRAMESET";
})(InsertionMode || (InsertionMode = {}));
const BASE_LOC = {
    startLine: -1,
    startCol: -1,
    startOffset: -1,
    endLine: -1,
    endCol: -1,
    endOffset: -1,
};
const TABLE_STRUCTURE_TAGS = new Set([html_js_1.TAG_ID.TABLE, html_js_1.TAG_ID.TBODY, html_js_1.TAG_ID.TFOOT, html_js_1.TAG_ID.THEAD, html_js_1.TAG_ID.TR]);
const defaultParserOptions = {
    scriptingEnabled: true,
    sourceCodeLocationInfo: false,
    treeAdapter: default_js_1.defaultTreeAdapter,
    onParseError: null,
};
//Parser
class Parser {
    constructor(options, document, fragmentContext = null, scriptHandler = null) {
        this.fragmentContext = fragmentContext;
        this.scriptHandler = scriptHandler;
        this.currentToken = null;
        this.stopped = false;
        this.insertionMode = InsertionMode.INITIAL;
        this.originalInsertionMode = InsertionMode.INITIAL;
        this.headElement = null;
        this.formElement = null;
        /** Indicates that the current node is not an element in the HTML namespace */
        this.currentNotInHTML = false;
        /**
         * The template insertion mode stack is maintained from the left.
         * Ie. the topmost element will always have index 0.
         */
        this.tmplInsertionModeStack = [];
        this.pendingCharacterTokens = [];
        this.hasNonWhitespacePendingCharacterToken = false;
        this.framesetOk = true;
        this.skipNextNewLine = false;
        this.fosterParentingEnabled = false;
        this.options = Object.assign(Object.assign({}, defaultParserOptions), options);
        this.treeAdapter = this.options.treeAdapter;
        this.onParseError = this.options.onParseError;
        // Always enable location info if we report parse errors.
        if (this.onParseError) {
            this.options.sourceCodeLocationInfo = true;
        }
        this.document = document !== null && document !== void 0 ? document : this.treeAdapter.createDocument();
        this.tokenizer = new index_js_1.Tokenizer(this.options, this);
        this.activeFormattingElements = new formatting_element_list_js_1.FormattingElementList(this.treeAdapter);
        this.fragmentContextID = fragmentContext ? (0, html_js_1.getTagID)(this.treeAdapter.getTagName(fragmentContext)) : html_js_1.TAG_ID.UNKNOWN;
        this._setContextModes(fragmentContext !== null && fragmentContext !== void 0 ? fragmentContext : this.document, this.fragmentContextID);
        this.openElements = new open_element_stack_js_1.OpenElementStack(this.document, this.treeAdapter, this);
    }
    // API
    static parse(html, options) {
        const parser = new this(options);
        parser.tokenizer.write(html, true);
        return parser.document;
    }
    static getFragmentParser(fragmentContext, options) {
        const opts = Object.assign(Object.assign({}, defaultParserOptions), options);
        //NOTE: use a <template> element as the fragment context if no context element was provided,
        //so we will parse in a "forgiving" manner
        fragmentContext !== null && fragmentContext !== void 0 ? fragmentContext : (fragmentContext = opts.treeAdapter.createElement(html_js_1.TAG_NAMES.TEMPLATE, html_js_1.NS.HTML, []));
        //NOTE: create a fake element which will be used as the `document` for fragment parsing.
        //This is important for jsdom, where a new `document` cannot be created. This led to
        //fragment parsing messing with the main `document`.
        const documentMock = opts.treeAdapter.createElement('documentmock', html_js_1.NS.HTML, []);
        const parser = new this(opts, documentMock, fragmentContext);
        if (parser.fragmentContextID === html_js_1.TAG_ID.TEMPLATE) {
            parser.tmplInsertionModeStack.unshift(InsertionMode.IN_TEMPLATE);
        }
        parser._initTokenizerForFragmentParsing();
        parser._insertFakeRootElement();
        parser._resetInsertionMode();
        parser._findFormInFragmentContext();
        return parser;
    }
    getFragment() {
        const rootElement = this.treeAdapter.getFirstChild(this.document);
        const fragment = this.treeAdapter.createDocumentFragment();
        this._adoptNodes(rootElement, fragment);
        return fragment;
    }
    //Errors
    _err(token, code, beforeToken) {
        var _a;
        if (!this.onParseError)
            return;
        const loc = (_a = token.location) !== null && _a !== void 0 ? _a : BASE_LOC;
        const err = {
            code,
            startLine: loc.startLine,
            startCol: loc.startCol,
            startOffset: loc.startOffset,
            endLine: beforeToken ? loc.startLine : loc.endLine,
            endCol: beforeToken ? loc.startCol : loc.endCol,
            endOffset: beforeToken ? loc.startOffset : loc.endOffset,
        };
        this.onParseError(err);
    }
    //Stack events
    onItemPush(node, tid, isTop) {
        var _a, _b;
        (_b = (_a = this.treeAdapter).onItemPush) === null || _b === void 0 ? void 0 : _b.call(_a, node);
        if (isTop && this.openElements.stackTop > 0)
            this._setContextModes(node, tid);
    }
    onItemPop(node, isTop) {
        var _a, _b;
        if (this.options.sourceCodeLocationInfo) {
            this._setEndLocation(node, this.currentToken);
        }
        (_b = (_a = this.treeAdapter).onItemPop) === null || _b === void 0 ? void 0 : _b.call(_a, node, this.openElements.current);
        if (isTop) {
            let current;
            let currentTagId;
            if (this.openElements.stackTop === 0 && this.fragmentContext) {
                current = this.fragmentContext;
                currentTagId = this.fragmentContextID;
            }
            else {
                ({ current, currentTagId } = this.openElements);
            }
            this._setContextModes(current, currentTagId);
        }
    }
    _setContextModes(current, tid) {
        const isHTML = current === this.document || this.treeAdapter.getNamespaceURI(current) === html_js_1.NS.HTML;
        this.currentNotInHTML = !isHTML;
        this.tokenizer.inForeignNode = !isHTML && !this._isIntegrationPoint(tid, current);
    }
    _switchToTextParsing(currentToken, nextTokenizerState) {
        this._insertElement(currentToken, html_js_1.NS.HTML);
        this.tokenizer.state = nextTokenizerState;
        this.originalInsertionMode = this.insertionMode;
        this.insertionMode = InsertionMode.TEXT;
    }
    switchToPlaintextParsing() {
        this.insertionMode = InsertionMode.TEXT;
        this.originalInsertionMode = InsertionMode.IN_BODY;
        this.tokenizer.state = index_js_1.TokenizerMode.PLAINTEXT;
    }
    //Fragment parsing
    _getAdjustedCurrentElement() {
        return this.openElements.stackTop === 0 && this.fragmentContext
            ? this.fragmentContext
            : this.openElements.current;
    }
    _findFormInFragmentContext() {
        let node = this.fragmentContext;
        while (node) {
            if (this.treeAdapter.getTagName(node) === html_js_1.TAG_NAMES.FORM) {
                this.formElement = node;
                break;
            }
            node = this.treeAdapter.getParentNode(node);
        }
    }
    _initTokenizerForFragmentParsing() {
        if (!this.fragmentContext || this.treeAdapter.getNamespaceURI(this.fragmentContext) !== html_js_1.NS.HTML) {
            return;
        }
        switch (this.fragmentContextID) {
            case html_js_1.TAG_ID.TITLE:
            case html_js_1.TAG_ID.TEXTAREA: {
                this.tokenizer.state = index_js_1.TokenizerMode.RCDATA;
                break;
            }
            case html_js_1.TAG_ID.STYLE:
            case html_js_1.TAG_ID.XMP:
            case html_js_1.TAG_ID.IFRAME:
            case html_js_1.TAG_ID.NOEMBED:
            case html_js_1.TAG_ID.NOFRAMES:
            case html_js_1.TAG_ID.NOSCRIPT: {
                this.tokenizer.state = index_js_1.TokenizerMode.RAWTEXT;
                break;
            }
            case html_js_1.TAG_ID.SCRIPT: {
                this.tokenizer.state = index_js_1.TokenizerMode.SCRIPT_DATA;
                break;
            }
            case html_js_1.TAG_ID.PLAINTEXT: {
                this.tokenizer.state = index_js_1.TokenizerMode.PLAINTEXT;
                break;
            }
            default:
            // Do nothing
        }
    }
    //Tree mutation
    _setDocumentType(token) {
        const name = token.name || '';
        const publicId = token.publicId || '';
        const systemId = token.systemId || '';
        this.treeAdapter.setDocumentType(this.document, name, publicId, systemId);
        if (token.location) {
            const documentChildren = this.treeAdapter.getChildNodes(this.document);
            const docTypeNode = documentChildren.find((node) => this.treeAdapter.isDocumentTypeNode(node));
            if (docTypeNode) {
                this.treeAdapter.setNodeSourceCodeLocation(docTypeNode, token.location);
            }
        }
    }
    _attachElementToTree(element, location) {
        if (this.options.sourceCodeLocationInfo) {
            const loc = location && Object.assign(Object.assign({}, location), { startTag: location });
            this.treeAdapter.setNodeSourceCodeLocation(element, loc);
        }
        if (this._shouldFosterParentOnInsertion()) {
            this._fosterParentElement(element);
        }
        else {
            const parent = this.openElements.currentTmplContentOrNode;
            this.treeAdapter.appendChild(parent, element);
        }
    }
    _appendElement(token, namespaceURI) {
        const element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);
        this._attachElementToTree(element, token.location);
    }
    _insertElement(token, namespaceURI) {
        const element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);
        this._attachElementToTree(element, token.location);
        this.openElements.push(element, token.tagID);
    }
    _insertFakeElement(tagName, tagID) {
        const element = this.treeAdapter.createElement(tagName, html_js_1.NS.HTML, []);
        this._attachElementToTree(element, null);
        this.openElements.push(element, tagID);
    }
    _insertTemplate(token) {
        const tmpl = this.treeAdapter.createElement(token.tagName, html_js_1.NS.HTML, token.attrs);
        const content = this.treeAdapter.createDocumentFragment();
        this.treeAdapter.setTemplateContent(tmpl, content);
        this._attachElementToTree(tmpl, token.location);
        this.openElements.push(tmpl, token.tagID);
        if (this.options.sourceCodeLocationInfo)
            this.treeAdapter.setNodeSourceCodeLocation(content, null);
    }
    _insertFakeRootElement() {
        const element = this.treeAdapter.createElement(html_js_1.TAG_NAMES.HTML, html_js_1.NS.HTML, []);
        if (this.options.sourceCodeLocationInfo)
            this.treeAdapter.setNodeSourceCodeLocation(element, null);
        this.treeAdapter.appendChild(this.openElements.current, element);
        this.openElements.push(element, html_js_1.TAG_ID.HTML);
    }
    _appendCommentNode(token, parent) {
        const commentNode = this.treeAdapter.createCommentNode(token.data);
        this.treeAdapter.appendChild(parent, commentNode);
        if (this.options.sourceCodeLocationInfo) {
            this.treeAdapter.setNodeSourceCodeLocation(commentNode, token.location);
        }
    }
    _insertCharacters(token) {
        let parent;
        let beforeElement;
        if (this._shouldFosterParentOnInsertion()) {
            ({ parent, beforeElement } = this._findFosterParentingLocation());
            if (beforeElement) {
                this.treeAdapter.insertTextBefore(parent, token.chars, beforeElement);
            }
            else {
                this.treeAdapter.insertText(parent, token.chars);
            }
        }
        else {
            parent = this.openElements.currentTmplContentOrNode;
            this.treeAdapter.insertText(parent, token.chars);
        }
        if (!token.location)
            return;
        const siblings = this.treeAdapter.getChildNodes(parent);
        const textNodeIdx = beforeElement ? siblings.lastIndexOf(beforeElement) : siblings.length;
        const textNode = siblings[textNodeIdx - 1];
        //NOTE: if we have a location assigned by another token, then just update the end position
        const tnLoc = this.treeAdapter.getNodeSourceCodeLocation(textNode);
        if (tnLoc) {
            const { endLine, endCol, endOffset } = token.location;
            this.treeAdapter.updateNodeSourceCodeLocation(textNode, { endLine, endCol, endOffset });
        }
        else if (this.options.sourceCodeLocationInfo) {
            this.treeAdapter.setNodeSourceCodeLocation(textNode, token.location);
        }
    }
    _adoptNodes(donor, recipient) {
        for (let child = this.treeAdapter.getFirstChild(donor); child; child = this.treeAdapter.getFirstChild(donor)) {
            this.treeAdapter.detachNode(child);
            this.treeAdapter.appendChild(recipient, child);
        }
    }
    _setEndLocation(element, closingToken) {
        if (this.treeAdapter.getNodeSourceCodeLocation(element) && closingToken.location) {
            const ctLoc = closingToken.location;
            const tn = this.treeAdapter.getTagName(element);
            const endLoc = 
            // NOTE: For cases like <p> <p> </p> - First 'p' closes without a closing
            // tag and for cases like <td> <p> </td> - 'p' closes without a closing tag.
            closingToken.type === token_js_1.TokenType.END_TAG && tn === closingToken.tagName
                ? {
                    endTag: Object.assign({}, ctLoc),
                    endLine: ctLoc.endLine,
                    endCol: ctLoc.endCol,
                    endOffset: ctLoc.endOffset,
                }
                : {
                    endLine: ctLoc.startLine,
                    endCol: ctLoc.startCol,
                    endOffset: ctLoc.startOffset,
                };
            this.treeAdapter.updateNodeSourceCodeLocation(element, endLoc);
        }
    }
    //Token processing
    shouldProcessStartTagTokenInForeignContent(token) {
        // Check that neither current === document, or ns === NS.HTML
        if (!this.currentNotInHTML)
            return false;
        let current;
        let currentTagId;
        if (this.openElements.stackTop === 0 && this.fragmentContext) {
            current = this.fragmentContext;
            currentTagId = this.fragmentContextID;
        }
        else {
            ({ current, currentTagId } = this.openElements);
        }
        if (token.tagID === html_js_1.TAG_ID.SVG &&
            this.treeAdapter.getTagName(current) === html_js_1.TAG_NAMES.ANNOTATION_XML &&
            this.treeAdapter.getNamespaceURI(current) === html_js_1.NS.MATHML) {
            return false;
        }
        return (
        // Check that `current` is not an integration point for HTML or MathML elements.
        this.tokenizer.inForeignNode ||
            // If it _is_ an integration point, then we might have to check that it is not an HTML
            // integration point.
            ((token.tagID === html_js_1.TAG_ID.MGLYPH || token.tagID === html_js_1.TAG_ID.MALIGNMARK) &&
                !this._isIntegrationPoint(currentTagId, current, html_js_1.NS.HTML)));
    }
    _processToken(token) {
        switch (token.type) {
            case token_js_1.TokenType.CHARACTER: {
                this.onCharacter(token);
                break;
            }
            case token_js_1.TokenType.NULL_CHARACTER: {
                this.onNullCharacter(token);
                break;
            }
            case token_js_1.TokenType.COMMENT: {
                this.onComment(token);
                break;
            }
            case token_js_1.TokenType.DOCTYPE: {
                this.onDoctype(token);
                break;
            }
            case token_js_1.TokenType.START_TAG: {
                this._processStartTag(token);
                break;
            }
            case token_js_1.TokenType.END_TAG: {
                this.onEndTag(token);
                break;
            }
            case token_js_1.TokenType.EOF: {
                this.onEof(token);
                break;
            }
            case token_js_1.TokenType.WHITESPACE_CHARACTER: {
                this.onWhitespaceCharacter(token);
                break;
            }
        }
    }
    //Integration points
    _isIntegrationPoint(tid, element, foreignNS) {
        const ns = this.treeAdapter.getNamespaceURI(element);
        const attrs = this.treeAdapter.getAttrList(element);
        return foreignContent.isIntegrationPoint(tid, ns, attrs, foreignNS);
    }
    //Active formatting elements reconstruction
    _reconstructActiveFormattingElements() {
        const listLength = this.activeFormattingElements.entries.length;
        if (listLength) {
            const endIndex = this.activeFormattingElements.entries.findIndex((entry) => entry.type === formatting_element_list_js_1.EntryType.Marker || this.openElements.contains(entry.element));
            const unopenIdx = endIndex < 0 ? listLength - 1 : endIndex - 1;
            for (let i = unopenIdx; i >= 0; i--) {
                const entry = this.activeFormattingElements.entries[i];
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
        this.insertionMode = InsertionMode.IN_ROW;
    }
    _closePElement() {
        this.openElements.generateImpliedEndTagsWithExclusion(html_js_1.TAG_ID.P);
        this.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.P);
    }
    //Insertion modes
    _resetInsertionMode() {
        for (let i = this.openElements.stackTop; i >= 0; i--) {
            //Insertion mode reset map
            switch (i === 0 && this.fragmentContext ? this.fragmentContextID : this.openElements.tagIDs[i]) {
                case html_js_1.TAG_ID.TR:
                    this.insertionMode = InsertionMode.IN_ROW;
                    return;
                case html_js_1.TAG_ID.TBODY:
                case html_js_1.TAG_ID.THEAD:
                case html_js_1.TAG_ID.TFOOT:
                    this.insertionMode = InsertionMode.IN_TABLE_BODY;
                    return;
                case html_js_1.TAG_ID.CAPTION:
                    this.insertionMode = InsertionMode.IN_CAPTION;
                    return;
                case html_js_1.TAG_ID.COLGROUP:
                    this.insertionMode = InsertionMode.IN_COLUMN_GROUP;
                    return;
                case html_js_1.TAG_ID.TABLE:
                    this.insertionMode = InsertionMode.IN_TABLE;
                    return;
                case html_js_1.TAG_ID.BODY:
                    this.insertionMode = InsertionMode.IN_BODY;
                    return;
                case html_js_1.TAG_ID.FRAMESET:
                    this.insertionMode = InsertionMode.IN_FRAMESET;
                    return;
                case html_js_1.TAG_ID.SELECT:
                    this._resetInsertionModeForSelect(i);
                    return;
                case html_js_1.TAG_ID.TEMPLATE:
                    this.insertionMode = this.tmplInsertionModeStack[0];
                    return;
                case html_js_1.TAG_ID.HTML:
                    this.insertionMode = this.headElement ? InsertionMode.AFTER_HEAD : InsertionMode.BEFORE_HEAD;
                    return;
                case html_js_1.TAG_ID.TD:
                case html_js_1.TAG_ID.TH:
                    if (i > 0) {
                        this.insertionMode = InsertionMode.IN_CELL;
                        return;
                    }
                    break;
                case html_js_1.TAG_ID.HEAD:
                    if (i > 0) {
                        this.insertionMode = InsertionMode.IN_HEAD;
                        return;
                    }
                    break;
            }
        }
        this.insertionMode = InsertionMode.IN_BODY;
    }
    _resetInsertionModeForSelect(selectIdx) {
        if (selectIdx > 0) {
            for (let i = selectIdx - 1; i > 0; i--) {
                const tn = this.openElements.tagIDs[i];
                if (tn === html_js_1.TAG_ID.TEMPLATE) {
                    break;
                }
                else if (tn === html_js_1.TAG_ID.TABLE) {
                    this.insertionMode = InsertionMode.IN_SELECT_IN_TABLE;
                    return;
                }
            }
        }
        this.insertionMode = InsertionMode.IN_SELECT;
    }
    //Foster parenting
    _isElementCausesFosterParenting(tn) {
        return TABLE_STRUCTURE_TAGS.has(tn);
    }
    _shouldFosterParentOnInsertion() {
        return this.fosterParentingEnabled && this._isElementCausesFosterParenting(this.openElements.currentTagId);
    }
    _findFosterParentingLocation() {
        for (let i = this.openElements.stackTop; i >= 0; i--) {
            const openElement = this.openElements.items[i];
            switch (this.openElements.tagIDs[i]) {
                case html_js_1.TAG_ID.TEMPLATE:
                    if (this.treeAdapter.getNamespaceURI(openElement) === html_js_1.NS.HTML) {
                        return { parent: this.treeAdapter.getTemplateContent(openElement), beforeElement: null };
                    }
                    break;
                case html_js_1.TAG_ID.TABLE: {
                    const parent = this.treeAdapter.getParentNode(openElement);
                    if (parent) {
                        return { parent, beforeElement: openElement };
                    }
                    return { parent: this.openElements.items[i - 1], beforeElement: null };
                }
                default:
                // Do nothing
            }
        }
        return { parent: this.openElements.items[0], beforeElement: null };
    }
    _fosterParentElement(element) {
        const location = this._findFosterParentingLocation();
        if (location.beforeElement) {
            this.treeAdapter.insertBefore(location.parent, element, location.beforeElement);
        }
        else {
            this.treeAdapter.appendChild(location.parent, element);
        }
    }
    //Special elements
    _isSpecialElement(element, id) {
        const ns = this.treeAdapter.getNamespaceURI(element);
        return html_js_1.SPECIAL_ELEMENTS[ns].has(id);
    }
    onCharacter(token) {
        this.skipNextNewLine = false;
        if (this.tokenizer.inForeignNode) {
            characterInForeignContent(this, token);
            return;
        }
        switch (this.insertionMode) {
            case InsertionMode.INITIAL:
                tokenInInitialMode(this, token);
                break;
            case InsertionMode.BEFORE_HTML:
                tokenBeforeHtml(this, token);
                break;
            case InsertionMode.BEFORE_HEAD:
                tokenBeforeHead(this, token);
                break;
            case InsertionMode.IN_HEAD:
                tokenInHead(this, token);
                break;
            case InsertionMode.IN_HEAD_NO_SCRIPT:
                tokenInHeadNoScript(this, token);
                break;
            case InsertionMode.AFTER_HEAD:
                tokenAfterHead(this, token);
                break;
            case InsertionMode.IN_BODY:
            case InsertionMode.IN_CAPTION:
            case InsertionMode.IN_CELL:
            case InsertionMode.IN_TEMPLATE:
                characterInBody(this, token);
                break;
            case InsertionMode.TEXT:
            case InsertionMode.IN_SELECT:
            case InsertionMode.IN_SELECT_IN_TABLE:
                this._insertCharacters(token);
                break;
            case InsertionMode.IN_TABLE:
            case InsertionMode.IN_TABLE_BODY:
            case InsertionMode.IN_ROW:
                characterInTable(this, token);
                break;
            case InsertionMode.IN_TABLE_TEXT:
                characterInTableText(this, token);
                break;
            case InsertionMode.IN_COLUMN_GROUP:
                tokenInColumnGroup(this, token);
                break;
            case InsertionMode.AFTER_BODY:
                tokenAfterBody(this, token);
                break;
            case InsertionMode.AFTER_AFTER_BODY:
                tokenAfterAfterBody(this, token);
                break;
            default:
            // Do nothing
        }
    }
    onNullCharacter(token) {
        this.skipNextNewLine = false;
        if (this.tokenizer.inForeignNode) {
            nullCharacterInForeignContent(this, token);
            return;
        }
        switch (this.insertionMode) {
            case InsertionMode.INITIAL:
                tokenInInitialMode(this, token);
                break;
            case InsertionMode.BEFORE_HTML:
                tokenBeforeHtml(this, token);
                break;
            case InsertionMode.BEFORE_HEAD:
                tokenBeforeHead(this, token);
                break;
            case InsertionMode.IN_HEAD:
                tokenInHead(this, token);
                break;
            case InsertionMode.IN_HEAD_NO_SCRIPT:
                tokenInHeadNoScript(this, token);
                break;
            case InsertionMode.AFTER_HEAD:
                tokenAfterHead(this, token);
                break;
            case InsertionMode.TEXT:
                this._insertCharacters(token);
                break;
            case InsertionMode.IN_TABLE:
            case InsertionMode.IN_TABLE_BODY:
            case InsertionMode.IN_ROW:
                characterInTable(this, token);
                break;
            case InsertionMode.IN_COLUMN_GROUP:
                tokenInColumnGroup(this, token);
                break;
            case InsertionMode.AFTER_BODY:
                tokenAfterBody(this, token);
                break;
            case InsertionMode.AFTER_AFTER_BODY:
                tokenAfterAfterBody(this, token);
                break;
            default:
            // Do nothing
        }
    }
    onComment(token) {
        this.skipNextNewLine = false;
        if (this.currentNotInHTML) {
            appendComment(this, token);
            return;
        }
        switch (this.insertionMode) {
            case InsertionMode.INITIAL:
            case InsertionMode.BEFORE_HTML:
            case InsertionMode.BEFORE_HEAD:
            case InsertionMode.IN_HEAD:
            case InsertionMode.IN_HEAD_NO_SCRIPT:
            case InsertionMode.AFTER_HEAD:
            case InsertionMode.IN_BODY:
            case InsertionMode.IN_TABLE:
            case InsertionMode.IN_CAPTION:
            case InsertionMode.IN_COLUMN_GROUP:
            case InsertionMode.IN_TABLE_BODY:
            case InsertionMode.IN_ROW:
            case InsertionMode.IN_CELL:
            case InsertionMode.IN_SELECT:
            case InsertionMode.IN_SELECT_IN_TABLE:
            case InsertionMode.IN_TEMPLATE:
            case InsertionMode.IN_FRAMESET:
            case InsertionMode.AFTER_FRAMESET:
                appendComment(this, token);
                break;
            case InsertionMode.IN_TABLE_TEXT:
                tokenInTableText(this, token);
                break;
            case InsertionMode.AFTER_BODY:
                appendCommentToRootHtmlElement(this, token);
                break;
            case InsertionMode.AFTER_AFTER_BODY:
            case InsertionMode.AFTER_AFTER_FRAMESET:
                appendCommentToDocument(this, token);
                break;
            default:
            // Do nothing
        }
    }
    onDoctype(token) {
        this.skipNextNewLine = false;
        switch (this.insertionMode) {
            case InsertionMode.INITIAL:
                doctypeInInitialMode(this, token);
                break;
            case InsertionMode.BEFORE_HEAD:
            case InsertionMode.IN_HEAD:
            case InsertionMode.IN_HEAD_NO_SCRIPT:
            case InsertionMode.AFTER_HEAD:
                this._err(token, error_codes_js_1.ERR.misplacedDoctype);
                break;
            case InsertionMode.IN_TABLE_TEXT:
                tokenInTableText(this, token);
                break;
            default:
            // Do nothing
        }
    }
    onStartTag(token) {
        this.skipNextNewLine = false;
        this.currentToken = token;
        this._processStartTag(token);
        if (token.selfClosing && !token.ackSelfClosing) {
            this._err(token, error_codes_js_1.ERR.nonVoidHtmlElementStartTagWithTrailingSolidus);
        }
    }
    /**
     * Processes a given start tag.
     *
     * `onStartTag` checks if a self-closing tag was recognized. When a token
     * is moved inbetween multiple insertion modes, this check for self-closing
     * could lead to false positives. To avoid this, `_processStartTag` is used
     * for nested calls.
     *
     * @param token The token to process.
     */
    _processStartTag(token) {
        if (this.shouldProcessStartTagTokenInForeignContent(token)) {
            startTagInForeignContent(this, token);
        }
        else {
            this._startTagOutsideForeignContent(token);
        }
    }
    _startTagOutsideForeignContent(token) {
        switch (this.insertionMode) {
            case InsertionMode.INITIAL:
                tokenInInitialMode(this, token);
                break;
            case InsertionMode.BEFORE_HTML:
                startTagBeforeHtml(this, token);
                break;
            case InsertionMode.BEFORE_HEAD:
                startTagBeforeHead(this, token);
                break;
            case InsertionMode.IN_HEAD:
                startTagInHead(this, token);
                break;
            case InsertionMode.IN_HEAD_NO_SCRIPT:
                startTagInHeadNoScript(this, token);
                break;
            case InsertionMode.AFTER_HEAD:
                startTagAfterHead(this, token);
                break;
            case InsertionMode.IN_BODY:
                startTagInBody(this, token);
                break;
            case InsertionMode.IN_TABLE:
                startTagInTable(this, token);
                break;
            case InsertionMode.IN_TABLE_TEXT:
                tokenInTableText(this, token);
                break;
            case InsertionMode.IN_CAPTION:
                startTagInCaption(this, token);
                break;
            case InsertionMode.IN_COLUMN_GROUP:
                startTagInColumnGroup(this, token);
                break;
            case InsertionMode.IN_TABLE_BODY:
                startTagInTableBody(this, token);
                break;
            case InsertionMode.IN_ROW:
                startTagInRow(this, token);
                break;
            case InsertionMode.IN_CELL:
                startTagInCell(this, token);
                break;
            case InsertionMode.IN_SELECT:
                startTagInSelect(this, token);
                break;
            case InsertionMode.IN_SELECT_IN_TABLE:
                startTagInSelectInTable(this, token);
                break;
            case InsertionMode.IN_TEMPLATE:
                startTagInTemplate(this, token);
                break;
            case InsertionMode.AFTER_BODY:
                startTagAfterBody(this, token);
                break;
            case InsertionMode.IN_FRAMESET:
                startTagInFrameset(this, token);
                break;
            case InsertionMode.AFTER_FRAMESET:
                startTagAfterFrameset(this, token);
                break;
            case InsertionMode.AFTER_AFTER_BODY:
                startTagAfterAfterBody(this, token);
                break;
            case InsertionMode.AFTER_AFTER_FRAMESET:
                startTagAfterAfterFrameset(this, token);
                break;
            default:
            // Do nothing
        }
    }
    onEndTag(token) {
        this.skipNextNewLine = false;
        this.currentToken = token;
        if (this.currentNotInHTML) {
            endTagInForeignContent(this, token);
        }
        else {
            this._endTagOutsideForeignContent(token);
        }
    }
    _endTagOutsideForeignContent(token) {
        switch (this.insertionMode) {
            case InsertionMode.INITIAL:
                tokenInInitialMode(this, token);
                break;
            case InsertionMode.BEFORE_HTML:
                endTagBeforeHtml(this, token);
                break;
            case InsertionMode.BEFORE_HEAD:
                endTagBeforeHead(this, token);
                break;
            case InsertionMode.IN_HEAD:
                endTagInHead(this, token);
                break;
            case InsertionMode.IN_HEAD_NO_SCRIPT:
                endTagInHeadNoScript(this, token);
                break;
            case InsertionMode.AFTER_HEAD:
                endTagAfterHead(this, token);
                break;
            case InsertionMode.IN_BODY:
                endTagInBody(this, token);
                break;
            case InsertionMode.TEXT:
                endTagInText(this, token);
                break;
            case InsertionMode.IN_TABLE:
                endTagInTable(this, token);
                break;
            case InsertionMode.IN_TABLE_TEXT:
                tokenInTableText(this, token);
                break;
            case InsertionMode.IN_CAPTION:
                endTagInCaption(this, token);
                break;
            case InsertionMode.IN_COLUMN_GROUP:
                endTagInColumnGroup(this, token);
                break;
            case InsertionMode.IN_TABLE_BODY:
                endTagInTableBody(this, token);
                break;
            case InsertionMode.IN_ROW:
                endTagInRow(this, token);
                break;
            case InsertionMode.IN_CELL:
                endTagInCell(this, token);
                break;
            case InsertionMode.IN_SELECT:
                endTagInSelect(this, token);
                break;
            case InsertionMode.IN_SELECT_IN_TABLE:
                endTagInSelectInTable(this, token);
                break;
            case InsertionMode.IN_TEMPLATE:
                endTagInTemplate(this, token);
                break;
            case InsertionMode.AFTER_BODY:
                endTagAfterBody(this, token);
                break;
            case InsertionMode.IN_FRAMESET:
                endTagInFrameset(this, token);
                break;
            case InsertionMode.AFTER_FRAMESET:
                endTagAfterFrameset(this, token);
                break;
            case InsertionMode.AFTER_AFTER_BODY:
                tokenAfterAfterBody(this, token);
                break;
            default:
            // Do nothing
        }
    }
    onEof(token) {
        switch (this.insertionMode) {
            case InsertionMode.INITIAL:
                tokenInInitialMode(this, token);
                break;
            case InsertionMode.BEFORE_HTML:
                tokenBeforeHtml(this, token);
                break;
            case InsertionMode.BEFORE_HEAD:
                tokenBeforeHead(this, token);
                break;
            case InsertionMode.IN_HEAD:
                tokenInHead(this, token);
                break;
            case InsertionMode.IN_HEAD_NO_SCRIPT:
                tokenInHeadNoScript(this, token);
                break;
            case InsertionMode.AFTER_HEAD:
                tokenAfterHead(this, token);
                break;
            case InsertionMode.IN_BODY:
            case InsertionMode.IN_TABLE:
            case InsertionMode.IN_CAPTION:
            case InsertionMode.IN_COLUMN_GROUP:
            case InsertionMode.IN_TABLE_BODY:
            case InsertionMode.IN_ROW:
            case InsertionMode.IN_CELL:
            case InsertionMode.IN_SELECT:
            case InsertionMode.IN_SELECT_IN_TABLE:
                eofInBody(this, token);
                break;
            case InsertionMode.TEXT:
                eofInText(this, token);
                break;
            case InsertionMode.IN_TABLE_TEXT:
                tokenInTableText(this, token);
                break;
            case InsertionMode.IN_TEMPLATE:
                eofInTemplate(this, token);
                break;
            case InsertionMode.AFTER_BODY:
            case InsertionMode.IN_FRAMESET:
            case InsertionMode.AFTER_FRAMESET:
            case InsertionMode.AFTER_AFTER_BODY:
            case InsertionMode.AFTER_AFTER_FRAMESET:
                stopParsing(this, token);
                break;
            default:
            // Do nothing
        }
    }
    onWhitespaceCharacter(token) {
        if (this.skipNextNewLine) {
            this.skipNextNewLine = false;
            if (token.chars.charCodeAt(0) === unicode.CODE_POINTS.LINE_FEED) {
                if (token.chars.length === 1) {
                    return;
                }
                token.chars = token.chars.substr(1);
            }
        }
        if (this.tokenizer.inForeignNode) {
            this._insertCharacters(token);
            return;
        }
        switch (this.insertionMode) {
            case InsertionMode.IN_HEAD:
            case InsertionMode.IN_HEAD_NO_SCRIPT:
            case InsertionMode.AFTER_HEAD:
            case InsertionMode.TEXT:
            case InsertionMode.IN_COLUMN_GROUP:
            case InsertionMode.IN_SELECT:
            case InsertionMode.IN_SELECT_IN_TABLE:
            case InsertionMode.IN_FRAMESET:
            case InsertionMode.AFTER_FRAMESET:
                this._insertCharacters(token);
                break;
            case InsertionMode.IN_BODY:
            case InsertionMode.IN_CAPTION:
            case InsertionMode.IN_CELL:
            case InsertionMode.IN_TEMPLATE:
            case InsertionMode.AFTER_BODY:
            case InsertionMode.AFTER_AFTER_BODY:
            case InsertionMode.AFTER_AFTER_FRAMESET:
                whitespaceCharacterInBody(this, token);
                break;
            case InsertionMode.IN_TABLE:
            case InsertionMode.IN_TABLE_BODY:
            case InsertionMode.IN_ROW:
                characterInTable(this, token);
                break;
            case InsertionMode.IN_TABLE_TEXT:
                whitespaceCharacterInTableText(this, token);
                break;
            default:
            // Do nothing
        }
    }
}
exports.Parser = Parser;
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
        }
        else if (!p.openElements.hasInScope(token.tagID)) {
            formattingElementEntry = null;
        }
    }
    else {
        genericEndTagInBody(p, token);
    }
    return formattingElementEntry;
}
//Steps 9 and 10 of the algorithm
function aaObtainFurthestBlock(p, formattingElementEntry) {
    let furthestBlock = null;
    let idx = p.openElements.stackTop;
    for (; idx >= 0; idx--) {
        const element = p.openElements.items[idx];
        if (element === formattingElementEntry.element) {
            break;
        }
        if (p._isSpecialElement(element, p.openElements.tagIDs[idx])) {
            furthestBlock = element;
        }
    }
    if (!furthestBlock) {
        p.openElements.shortenToLength(idx < 0 ? 0 : idx);
        p.activeFormattingElements.removeEntry(formattingElementEntry);
    }
    return furthestBlock;
}
//Step 13 of the algorithm
function aaInnerLoop(p, furthestBlock, formattingElement) {
    let lastElement = furthestBlock;
    let nextElement = p.openElements.getCommonAncestor(furthestBlock);
    for (let i = 0, element = nextElement; element !== formattingElement; i++, element = nextElement) {
        //NOTE: store the next element for the next loop iteration (it may be deleted from the stack by step 9.5)
        nextElement = p.openElements.getCommonAncestor(element);
        const elementEntry = p.activeFormattingElements.getElementEntry(element);
        const counterOverflow = elementEntry && i >= AA_INNER_LOOP_ITER;
        const shouldRemoveFromOpenElements = !elementEntry || counterOverflow;
        if (shouldRemoveFromOpenElements) {
            if (counterOverflow) {
                p.activeFormattingElements.removeEntry(elementEntry);
            }
            p.openElements.remove(element);
        }
        else {
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
    const tn = p.treeAdapter.getTagName(commonAncestor);
    const tid = (0, html_js_1.getTagID)(tn);
    if (p._isElementCausesFosterParenting(tid)) {
        p._fosterParentElement(lastElement);
    }
    else {
        const ns = p.treeAdapter.getNamespaceURI(commonAncestor);
        if (tid === html_js_1.TAG_ID.TEMPLATE && ns === html_js_1.NS.HTML) {
            commonAncestor = p.treeAdapter.getTemplateContent(commonAncestor);
        }
        p.treeAdapter.appendChild(commonAncestor, lastElement);
    }
}
//Steps 15-19 of the algorithm
function aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry) {
    const ns = p.treeAdapter.getNamespaceURI(formattingElementEntry.element);
    const { token } = formattingElementEntry;
    const newElement = p.treeAdapter.createElement(token.tagName, ns, token.attrs);
    p._adoptNodes(furthestBlock, newElement);
    p.treeAdapter.appendChild(furthestBlock, newElement);
    p.activeFormattingElements.insertElementAfterBookmark(newElement, token);
    p.activeFormattingElements.removeEntry(formattingElementEntry);
    p.openElements.remove(formattingElementEntry.element);
    p.openElements.insertAfter(furthestBlock, newElement, token.tagID);
}
//Algorithm entry point
function callAdoptionAgency(p, token) {
    for (let i = 0; i < AA_OUTER_LOOP_ITER; i++) {
        const formattingElementEntry = aaObtainFormattingElementEntry(p, token);
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
        if (commonAncestor)
            aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement);
        aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry);
    }
}
//Generic token handlers
//------------------------------------------------------------------
function appendComment(p, token) {
    p._appendCommentNode(token, p.openElements.currentTmplContentOrNode);
}
function appendCommentToRootHtmlElement(p, token) {
    p._appendCommentNode(token, p.openElements.items[0]);
}
function appendCommentToDocument(p, token) {
    p._appendCommentNode(token, p.document);
}
function stopParsing(p, token) {
    p.stopped = true;
    // NOTE: Set end locations for elements that remain on the open element stack.
    if (token.location) {
        // NOTE: If we are not in a fragment, `html` and `body` will stay on the stack.
        // This is a problem, as we might overwrite their end position here.
        const target = p.fragmentContext ? 0 : 2;
        for (let i = p.openElements.stackTop; i >= target; i--) {
            p._setEndLocation(p.openElements.items[i], token);
        }
        // Handle `html` and `body`
        if (!p.fragmentContext && p.openElements.stackTop >= 0) {
            const htmlElement = p.openElements.items[0];
            const htmlLocation = p.treeAdapter.getNodeSourceCodeLocation(htmlElement);
            if (htmlLocation && !htmlLocation.endTag) {
                p._setEndLocation(htmlElement, token);
                if (p.openElements.stackTop >= 1) {
                    const bodyElement = p.openElements.items[1];
                    const bodyLocation = p.treeAdapter.getNodeSourceCodeLocation(bodyElement);
                    if (bodyLocation && !bodyLocation.endTag) {
                        p._setEndLocation(bodyElement, token);
                    }
                }
            }
        }
    }
}
// The "initial" insertion mode
//------------------------------------------------------------------
function doctypeInInitialMode(p, token) {
    p._setDocumentType(token);
    const mode = token.forceQuirks ? html_js_1.DOCUMENT_MODE.QUIRKS : doctype.getDocumentMode(token);
    if (!doctype.isConforming(token)) {
        p._err(token, error_codes_js_1.ERR.nonConformingDoctype);
    }
    p.treeAdapter.setDocumentMode(p.document, mode);
    p.insertionMode = InsertionMode.BEFORE_HTML;
}
function tokenInInitialMode(p, token) {
    p._err(token, error_codes_js_1.ERR.missingDoctype, true);
    p.treeAdapter.setDocumentMode(p.document, html_js_1.DOCUMENT_MODE.QUIRKS);
    p.insertionMode = InsertionMode.BEFORE_HTML;
    p._processToken(token);
}
// The "before html" insertion mode
//------------------------------------------------------------------
function startTagBeforeHtml(p, token) {
    if (token.tagID === html_js_1.TAG_ID.HTML) {
        p._insertElement(token, html_js_1.NS.HTML);
        p.insertionMode = InsertionMode.BEFORE_HEAD;
    }
    else {
        tokenBeforeHtml(p, token);
    }
}
function endTagBeforeHtml(p, token) {
    const tn = token.tagID;
    if (tn === html_js_1.TAG_ID.HTML || tn === html_js_1.TAG_ID.HEAD || tn === html_js_1.TAG_ID.BODY || tn === html_js_1.TAG_ID.BR) {
        tokenBeforeHtml(p, token);
    }
}
function tokenBeforeHtml(p, token) {
    p._insertFakeRootElement();
    p.insertionMode = InsertionMode.BEFORE_HEAD;
    p._processToken(token);
}
// The "before head" insertion mode
//------------------------------------------------------------------
function startTagBeforeHead(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.HEAD: {
            p._insertElement(token, html_js_1.NS.HTML);
            p.headElement = p.openElements.current;
            p.insertionMode = InsertionMode.IN_HEAD;
            break;
        }
        default: {
            tokenBeforeHead(p, token);
        }
    }
}
function endTagBeforeHead(p, token) {
    const tn = token.tagID;
    if (tn === html_js_1.TAG_ID.HEAD || tn === html_js_1.TAG_ID.BODY || tn === html_js_1.TAG_ID.HTML || tn === html_js_1.TAG_ID.BR) {
        tokenBeforeHead(p, token);
    }
    else {
        p._err(token, error_codes_js_1.ERR.endTagWithoutMatchingOpenElement);
    }
}
function tokenBeforeHead(p, token) {
    p._insertFakeElement(html_js_1.TAG_NAMES.HEAD, html_js_1.TAG_ID.HEAD);
    p.headElement = p.openElements.current;
    p.insertionMode = InsertionMode.IN_HEAD;
    p._processToken(token);
}
// The "in head" insertion mode
//------------------------------------------------------------------
function startTagInHead(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.BASE:
        case html_js_1.TAG_ID.BASEFONT:
        case html_js_1.TAG_ID.BGSOUND:
        case html_js_1.TAG_ID.LINK:
        case html_js_1.TAG_ID.META: {
            p._appendElement(token, html_js_1.NS.HTML);
            token.ackSelfClosing = true;
            break;
        }
        case html_js_1.TAG_ID.TITLE: {
            p._switchToTextParsing(token, index_js_1.TokenizerMode.RCDATA);
            break;
        }
        case html_js_1.TAG_ID.NOSCRIPT: {
            if (p.options.scriptingEnabled) {
                p._switchToTextParsing(token, index_js_1.TokenizerMode.RAWTEXT);
            }
            else {
                p._insertElement(token, html_js_1.NS.HTML);
                p.insertionMode = InsertionMode.IN_HEAD_NO_SCRIPT;
            }
            break;
        }
        case html_js_1.TAG_ID.NOFRAMES:
        case html_js_1.TAG_ID.STYLE: {
            p._switchToTextParsing(token, index_js_1.TokenizerMode.RAWTEXT);
            break;
        }
        case html_js_1.TAG_ID.SCRIPT: {
            p._switchToTextParsing(token, index_js_1.TokenizerMode.SCRIPT_DATA);
            break;
        }
        case html_js_1.TAG_ID.TEMPLATE: {
            p._insertTemplate(token);
            p.activeFormattingElements.insertMarker();
            p.framesetOk = false;
            p.insertionMode = InsertionMode.IN_TEMPLATE;
            p.tmplInsertionModeStack.unshift(InsertionMode.IN_TEMPLATE);
            break;
        }
        case html_js_1.TAG_ID.HEAD: {
            p._err(token, error_codes_js_1.ERR.misplacedStartTagForHeadElement);
            break;
        }
        default: {
            tokenInHead(p, token);
        }
    }
}
function endTagInHead(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.HEAD: {
            p.openElements.pop();
            p.insertionMode = InsertionMode.AFTER_HEAD;
            break;
        }
        case html_js_1.TAG_ID.BODY:
        case html_js_1.TAG_ID.BR:
        case html_js_1.TAG_ID.HTML: {
            tokenInHead(p, token);
            break;
        }
        case html_js_1.TAG_ID.TEMPLATE: {
            templateEndTagInHead(p, token);
            break;
        }
        default: {
            p._err(token, error_codes_js_1.ERR.endTagWithoutMatchingOpenElement);
        }
    }
}
function templateEndTagInHead(p, token) {
    if (p.openElements.tmplCount > 0) {
        p.openElements.generateImpliedEndTagsThoroughly();
        if (p.openElements.currentTagId !== html_js_1.TAG_ID.TEMPLATE) {
            p._err(token, error_codes_js_1.ERR.closingOfElementWithOpenChildElements);
        }
        p.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.TEMPLATE);
        p.activeFormattingElements.clearToLastMarker();
        p.tmplInsertionModeStack.shift();
        p._resetInsertionMode();
    }
    else {
        p._err(token, error_codes_js_1.ERR.endTagWithoutMatchingOpenElement);
    }
}
function tokenInHead(p, token) {
    p.openElements.pop();
    p.insertionMode = InsertionMode.AFTER_HEAD;
    p._processToken(token);
}
// The "in head no script" insertion mode
//------------------------------------------------------------------
function startTagInHeadNoScript(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.BASEFONT:
        case html_js_1.TAG_ID.BGSOUND:
        case html_js_1.TAG_ID.HEAD:
        case html_js_1.TAG_ID.LINK:
        case html_js_1.TAG_ID.META:
        case html_js_1.TAG_ID.NOFRAMES:
        case html_js_1.TAG_ID.STYLE: {
            startTagInHead(p, token);
            break;
        }
        case html_js_1.TAG_ID.NOSCRIPT: {
            p._err(token, error_codes_js_1.ERR.nestedNoscriptInHead);
            break;
        }
        default: {
            tokenInHeadNoScript(p, token);
        }
    }
}
function endTagInHeadNoScript(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.NOSCRIPT: {
            p.openElements.pop();
            p.insertionMode = InsertionMode.IN_HEAD;
            break;
        }
        case html_js_1.TAG_ID.BR: {
            tokenInHeadNoScript(p, token);
            break;
        }
        default: {
            p._err(token, error_codes_js_1.ERR.endTagWithoutMatchingOpenElement);
        }
    }
}
function tokenInHeadNoScript(p, token) {
    const errCode = token.type === token_js_1.TokenType.EOF ? error_codes_js_1.ERR.openElementsLeftAfterEof : error_codes_js_1.ERR.disallowedContentInNoscriptInHead;
    p._err(token, errCode);
    p.openElements.pop();
    p.insertionMode = InsertionMode.IN_HEAD;
    p._processToken(token);
}
// The "after head" insertion mode
//------------------------------------------------------------------
function startTagAfterHead(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.BODY: {
            p._insertElement(token, html_js_1.NS.HTML);
            p.framesetOk = false;
            p.insertionMode = InsertionMode.IN_BODY;
            break;
        }
        case html_js_1.TAG_ID.FRAMESET: {
            p._insertElement(token, html_js_1.NS.HTML);
            p.insertionMode = InsertionMode.IN_FRAMESET;
            break;
        }
        case html_js_1.TAG_ID.BASE:
        case html_js_1.TAG_ID.BASEFONT:
        case html_js_1.TAG_ID.BGSOUND:
        case html_js_1.TAG_ID.LINK:
        case html_js_1.TAG_ID.META:
        case html_js_1.TAG_ID.NOFRAMES:
        case html_js_1.TAG_ID.SCRIPT:
        case html_js_1.TAG_ID.STYLE:
        case html_js_1.TAG_ID.TEMPLATE:
        case html_js_1.TAG_ID.TITLE: {
            p._err(token, error_codes_js_1.ERR.abandonedHeadElementChild);
            p.openElements.push(p.headElement, html_js_1.TAG_ID.HEAD);
            startTagInHead(p, token);
            p.openElements.remove(p.headElement);
            break;
        }
        case html_js_1.TAG_ID.HEAD: {
            p._err(token, error_codes_js_1.ERR.misplacedStartTagForHeadElement);
            break;
        }
        default: {
            tokenAfterHead(p, token);
        }
    }
}
function endTagAfterHead(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.BODY:
        case html_js_1.TAG_ID.HTML:
        case html_js_1.TAG_ID.BR: {
            tokenAfterHead(p, token);
            break;
        }
        case html_js_1.TAG_ID.TEMPLATE: {
            templateEndTagInHead(p, token);
            break;
        }
        default: {
            p._err(token, error_codes_js_1.ERR.endTagWithoutMatchingOpenElement);
        }
    }
}
function tokenAfterHead(p, token) {
    p._insertFakeElement(html_js_1.TAG_NAMES.BODY, html_js_1.TAG_ID.BODY);
    p.insertionMode = InsertionMode.IN_BODY;
    modeInBody(p, token);
}
// The "in body" insertion mode
//------------------------------------------------------------------
function modeInBody(p, token) {
    switch (token.type) {
        case token_js_1.TokenType.CHARACTER: {
            characterInBody(p, token);
            break;
        }
        case token_js_1.TokenType.WHITESPACE_CHARACTER: {
            whitespaceCharacterInBody(p, token);
            break;
        }
        case token_js_1.TokenType.COMMENT: {
            appendComment(p, token);
            break;
        }
        case token_js_1.TokenType.START_TAG: {
            startTagInBody(p, token);
            break;
        }
        case token_js_1.TokenType.END_TAG: {
            endTagInBody(p, token);
            break;
        }
        case token_js_1.TokenType.EOF: {
            eofInBody(p, token);
            break;
        }
        default:
        // Do nothing
    }
}
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
        p._insertElement(token, html_js_1.NS.HTML);
        p.insertionMode = InsertionMode.IN_FRAMESET;
    }
}
function addressStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope(html_js_1.TAG_ID.P)) {
        p._closePElement();
    }
    p._insertElement(token, html_js_1.NS.HTML);
}
function numberedHeaderStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope(html_js_1.TAG_ID.P)) {
        p._closePElement();
    }
    if ((0, html_js_1.isNumberedHeader)(p.openElements.currentTagId)) {
        p.openElements.pop();
    }
    p._insertElement(token, html_js_1.NS.HTML);
}
function preStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope(html_js_1.TAG_ID.P)) {
        p._closePElement();
    }
    p._insertElement(token, html_js_1.NS.HTML);
    //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
    //on to the next one. (Newlines at the start of pre blocks are ignored as an authoring convenience.)
    p.skipNextNewLine = true;
    p.framesetOk = false;
}
function formStartTagInBody(p, token) {
    const inTemplate = p.openElements.tmplCount > 0;
    if (!p.formElement || inTemplate) {
        if (p.openElements.hasInButtonScope(html_js_1.TAG_ID.P)) {
            p._closePElement();
        }
        p._insertElement(token, html_js_1.NS.HTML);
        if (!inTemplate) {
            p.formElement = p.openElements.current;
        }
    }
}
function listItemStartTagInBody(p, token) {
    p.framesetOk = false;
    const tn = token.tagID;
    for (let i = p.openElements.stackTop; i >= 0; i--) {
        const elementId = p.openElements.tagIDs[i];
        if ((tn === html_js_1.TAG_ID.LI && elementId === html_js_1.TAG_ID.LI) ||
            ((tn === html_js_1.TAG_ID.DD || tn === html_js_1.TAG_ID.DT) && (elementId === html_js_1.TAG_ID.DD || elementId === html_js_1.TAG_ID.DT))) {
            p.openElements.generateImpliedEndTagsWithExclusion(elementId);
            p.openElements.popUntilTagNamePopped(elementId);
            break;
        }
        if (elementId !== html_js_1.TAG_ID.ADDRESS &&
            elementId !== html_js_1.TAG_ID.DIV &&
            elementId !== html_js_1.TAG_ID.P &&
            p._isSpecialElement(p.openElements.items[i], elementId)) {
            break;
        }
    }
    if (p.openElements.hasInButtonScope(html_js_1.TAG_ID.P)) {
        p._closePElement();
    }
    p._insertElement(token, html_js_1.NS.HTML);
}
function plaintextStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope(html_js_1.TAG_ID.P)) {
        p._closePElement();
    }
    p._insertElement(token, html_js_1.NS.HTML);
    p.tokenizer.state = index_js_1.TokenizerMode.PLAINTEXT;
}
function buttonStartTagInBody(p, token) {
    if (p.openElements.hasInScope(html_js_1.TAG_ID.BUTTON)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.BUTTON);
    }
    p._reconstructActiveFormattingElements();
    p._insertElement(token, html_js_1.NS.HTML);
    p.framesetOk = false;
}
function aStartTagInBody(p, token) {
    const activeElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName(html_js_1.TAG_NAMES.A);
    if (activeElementEntry) {
        callAdoptionAgency(p, token);
        p.openElements.remove(activeElementEntry.element);
        p.activeFormattingElements.removeEntry(activeElementEntry);
    }
    p._reconstructActiveFormattingElements();
    p._insertElement(token, html_js_1.NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}
function bStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, html_js_1.NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}
function nobrStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    if (p.openElements.hasInScope(html_js_1.TAG_ID.NOBR)) {
        callAdoptionAgency(p, token);
        p._reconstructActiveFormattingElements();
    }
    p._insertElement(token, html_js_1.NS.HTML);
    p.activeFormattingElements.pushElement(p.openElements.current, token);
}
function appletStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, html_js_1.NS.HTML);
    p.activeFormattingElements.insertMarker();
    p.framesetOk = false;
}
function tableStartTagInBody(p, token) {
    if (p.treeAdapter.getDocumentMode(p.document) !== html_js_1.DOCUMENT_MODE.QUIRKS && p.openElements.hasInButtonScope(html_js_1.TAG_ID.P)) {
        p._closePElement();
    }
    p._insertElement(token, html_js_1.NS.HTML);
    p.framesetOk = false;
    p.insertionMode = InsertionMode.IN_TABLE;
}
function areaStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._appendElement(token, html_js_1.NS.HTML);
    p.framesetOk = false;
    token.ackSelfClosing = true;
}
function isHiddenInput(token) {
    const inputType = (0, token_js_1.getTokenAttr)(token, html_js_1.ATTRS.TYPE);
    return inputType != null && inputType.toLowerCase() === HIDDEN_INPUT_TYPE;
}
function inputStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._appendElement(token, html_js_1.NS.HTML);
    if (!isHiddenInput(token)) {
        p.framesetOk = false;
    }
    token.ackSelfClosing = true;
}
function paramStartTagInBody(p, token) {
    p._appendElement(token, html_js_1.NS.HTML);
    token.ackSelfClosing = true;
}
function hrStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope(html_js_1.TAG_ID.P)) {
        p._closePElement();
    }
    p._appendElement(token, html_js_1.NS.HTML);
    p.framesetOk = false;
    token.ackSelfClosing = true;
}
function imageStartTagInBody(p, token) {
    token.tagName = html_js_1.TAG_NAMES.IMG;
    token.tagID = html_js_1.TAG_ID.IMG;
    areaStartTagInBody(p, token);
}
function textareaStartTagInBody(p, token) {
    p._insertElement(token, html_js_1.NS.HTML);
    //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
    //on to the next one. (Newlines at the start of textarea elements are ignored as an authoring convenience.)
    p.skipNextNewLine = true;
    p.tokenizer.state = index_js_1.TokenizerMode.RCDATA;
    p.originalInsertionMode = p.insertionMode;
    p.framesetOk = false;
    p.insertionMode = InsertionMode.TEXT;
}
function xmpStartTagInBody(p, token) {
    if (p.openElements.hasInButtonScope(html_js_1.TAG_ID.P)) {
        p._closePElement();
    }
    p._reconstructActiveFormattingElements();
    p.framesetOk = false;
    p._switchToTextParsing(token, index_js_1.TokenizerMode.RAWTEXT);
}
function iframeStartTagInBody(p, token) {
    p.framesetOk = false;
    p._switchToTextParsing(token, index_js_1.TokenizerMode.RAWTEXT);
}
//NOTE: here we assume that we always act as an user agent with enabled plugins, so we parse
//<noembed> as rawtext.
function noembedStartTagInBody(p, token) {
    p._switchToTextParsing(token, index_js_1.TokenizerMode.RAWTEXT);
}
function selectStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, html_js_1.NS.HTML);
    p.framesetOk = false;
    p.insertionMode =
        p.insertionMode === InsertionMode.IN_TABLE ||
            p.insertionMode === InsertionMode.IN_CAPTION ||
            p.insertionMode === InsertionMode.IN_TABLE_BODY ||
            p.insertionMode === InsertionMode.IN_ROW ||
            p.insertionMode === InsertionMode.IN_CELL
            ? InsertionMode.IN_SELECT_IN_TABLE
            : InsertionMode.IN_SELECT;
}
function optgroupStartTagInBody(p, token) {
    if (p.openElements.currentTagId === html_js_1.TAG_ID.OPTION) {
        p.openElements.pop();
    }
    p._reconstructActiveFormattingElements();
    p._insertElement(token, html_js_1.NS.HTML);
}
function rbStartTagInBody(p, token) {
    if (p.openElements.hasInScope(html_js_1.TAG_ID.RUBY)) {
        p.openElements.generateImpliedEndTags();
    }
    p._insertElement(token, html_js_1.NS.HTML);
}
function rtStartTagInBody(p, token) {
    if (p.openElements.hasInScope(html_js_1.TAG_ID.RUBY)) {
        p.openElements.generateImpliedEndTagsWithExclusion(html_js_1.TAG_ID.RTC);
    }
    p._insertElement(token, html_js_1.NS.HTML);
}
function mathStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    foreignContent.adjustTokenMathMLAttrs(token);
    foreignContent.adjustTokenXMLAttrs(token);
    if (token.selfClosing) {
        p._appendElement(token, html_js_1.NS.MATHML);
    }
    else {
        p._insertElement(token, html_js_1.NS.MATHML);
    }
    token.ackSelfClosing = true;
}
function svgStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    foreignContent.adjustTokenSVGAttrs(token);
    foreignContent.adjustTokenXMLAttrs(token);
    if (token.selfClosing) {
        p._appendElement(token, html_js_1.NS.SVG);
    }
    else {
        p._insertElement(token, html_js_1.NS.SVG);
    }
    token.ackSelfClosing = true;
}
function genericStartTagInBody(p, token) {
    p._reconstructActiveFormattingElements();
    p._insertElement(token, html_js_1.NS.HTML);
}
function startTagInBody(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.I:
        case html_js_1.TAG_ID.S:
        case html_js_1.TAG_ID.B:
        case html_js_1.TAG_ID.U:
        case html_js_1.TAG_ID.EM:
        case html_js_1.TAG_ID.TT:
        case html_js_1.TAG_ID.BIG:
        case html_js_1.TAG_ID.CODE:
        case html_js_1.TAG_ID.FONT:
        case html_js_1.TAG_ID.SMALL:
        case html_js_1.TAG_ID.STRIKE:
        case html_js_1.TAG_ID.STRONG: {
            bStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.A: {
            aStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.H1:
        case html_js_1.TAG_ID.H2:
        case html_js_1.TAG_ID.H3:
        case html_js_1.TAG_ID.H4:
        case html_js_1.TAG_ID.H5:
        case html_js_1.TAG_ID.H6: {
            numberedHeaderStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.P:
        case html_js_1.TAG_ID.DL:
        case html_js_1.TAG_ID.OL:
        case html_js_1.TAG_ID.UL:
        case html_js_1.TAG_ID.DIV:
        case html_js_1.TAG_ID.DIR:
        case html_js_1.TAG_ID.NAV:
        case html_js_1.TAG_ID.MAIN:
        case html_js_1.TAG_ID.MENU:
        case html_js_1.TAG_ID.ASIDE:
        case html_js_1.TAG_ID.CENTER:
        case html_js_1.TAG_ID.FIGURE:
        case html_js_1.TAG_ID.FOOTER:
        case html_js_1.TAG_ID.HEADER:
        case html_js_1.TAG_ID.HGROUP:
        case html_js_1.TAG_ID.DIALOG:
        case html_js_1.TAG_ID.DETAILS:
        case html_js_1.TAG_ID.ADDRESS:
        case html_js_1.TAG_ID.ARTICLE:
        case html_js_1.TAG_ID.SECTION:
        case html_js_1.TAG_ID.SUMMARY:
        case html_js_1.TAG_ID.FIELDSET:
        case html_js_1.TAG_ID.BLOCKQUOTE:
        case html_js_1.TAG_ID.FIGCAPTION: {
            addressStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.LI:
        case html_js_1.TAG_ID.DD:
        case html_js_1.TAG_ID.DT: {
            listItemStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.BR:
        case html_js_1.TAG_ID.IMG:
        case html_js_1.TAG_ID.WBR:
        case html_js_1.TAG_ID.AREA:
        case html_js_1.TAG_ID.EMBED:
        case html_js_1.TAG_ID.KEYGEN: {
            areaStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.HR: {
            hrStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.RB:
        case html_js_1.TAG_ID.RTC: {
            rbStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.RT:
        case html_js_1.TAG_ID.RP: {
            rtStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.PRE:
        case html_js_1.TAG_ID.LISTING: {
            preStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.XMP: {
            xmpStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.SVG: {
            svgStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.HTML: {
            htmlStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.BASE:
        case html_js_1.TAG_ID.LINK:
        case html_js_1.TAG_ID.META:
        case html_js_1.TAG_ID.STYLE:
        case html_js_1.TAG_ID.TITLE:
        case html_js_1.TAG_ID.SCRIPT:
        case html_js_1.TAG_ID.BGSOUND:
        case html_js_1.TAG_ID.BASEFONT:
        case html_js_1.TAG_ID.TEMPLATE: {
            startTagInHead(p, token);
            break;
        }
        case html_js_1.TAG_ID.BODY: {
            bodyStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.FORM: {
            formStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.NOBR: {
            nobrStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.MATH: {
            mathStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.TABLE: {
            tableStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.INPUT: {
            inputStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.PARAM:
        case html_js_1.TAG_ID.TRACK:
        case html_js_1.TAG_ID.SOURCE: {
            paramStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.IMAGE: {
            imageStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.BUTTON: {
            buttonStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.APPLET:
        case html_js_1.TAG_ID.OBJECT:
        case html_js_1.TAG_ID.MARQUEE: {
            appletStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.IFRAME: {
            iframeStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.SELECT: {
            selectStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.OPTION:
        case html_js_1.TAG_ID.OPTGROUP: {
            optgroupStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.NOEMBED: {
            noembedStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.FRAMESET: {
            framesetStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.TEXTAREA: {
            textareaStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.NOSCRIPT: {
            if (p.options.scriptingEnabled) {
                noembedStartTagInBody(p, token);
            }
            else {
                genericStartTagInBody(p, token);
            }
            break;
        }
        case html_js_1.TAG_ID.PLAINTEXT: {
            plaintextStartTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.COL:
        case html_js_1.TAG_ID.TH:
        case html_js_1.TAG_ID.TD:
        case html_js_1.TAG_ID.TR:
        case html_js_1.TAG_ID.HEAD:
        case html_js_1.TAG_ID.FRAME:
        case html_js_1.TAG_ID.TBODY:
        case html_js_1.TAG_ID.TFOOT:
        case html_js_1.TAG_ID.THEAD:
        case html_js_1.TAG_ID.CAPTION:
        case html_js_1.TAG_ID.COLGROUP: {
            // Ignore token
            break;
        }
        default: {
            genericStartTagInBody(p, token);
        }
    }
}
function bodyEndTagInBody(p, token) {
    if (p.openElements.hasInScope(html_js_1.TAG_ID.BODY)) {
        p.insertionMode = InsertionMode.AFTER_BODY;
        //NOTE: <body> is never popped from the stack, so we need to updated
        //the end location explicitly.
        if (p.options.sourceCodeLocationInfo) {
            const bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();
            if (bodyElement) {
                p._setEndLocation(bodyElement, token);
            }
        }
    }
}
function htmlEndTagInBody(p, token) {
    if (p.openElements.hasInScope(html_js_1.TAG_ID.BODY)) {
        p.insertionMode = InsertionMode.AFTER_BODY;
        endTagAfterBody(p, token);
    }
}
function addressEndTagInBody(p, token) {
    const tn = token.tagID;
    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(tn);
    }
}
function formEndTagInBody(p) {
    const inTemplate = p.openElements.tmplCount > 0;
    const { formElement } = p;
    if (!inTemplate) {
        p.formElement = null;
    }
    if ((formElement || inTemplate) && p.openElements.hasInScope(html_js_1.TAG_ID.FORM)) {
        p.openElements.generateImpliedEndTags();
        if (inTemplate) {
            p.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.FORM);
        }
        else if (formElement) {
            p.openElements.remove(formElement);
        }
    }
}
function pEndTagInBody(p) {
    if (!p.openElements.hasInButtonScope(html_js_1.TAG_ID.P)) {
        p._insertFakeElement(html_js_1.TAG_NAMES.P, html_js_1.TAG_ID.P);
    }
    p._closePElement();
}
function liEndTagInBody(p) {
    if (p.openElements.hasInListItemScope(html_js_1.TAG_ID.LI)) {
        p.openElements.generateImpliedEndTagsWithExclusion(html_js_1.TAG_ID.LI);
        p.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.LI);
    }
}
function ddEndTagInBody(p, token) {
    const tn = token.tagID;
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
    const tn = token.tagID;
    if (p.openElements.hasInScope(tn)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(tn);
        p.activeFormattingElements.clearToLastMarker();
    }
}
function brEndTagInBody(p) {
    p._reconstructActiveFormattingElements();
    p._insertFakeElement(html_js_1.TAG_NAMES.BR, html_js_1.TAG_ID.BR);
    p.openElements.pop();
    p.framesetOk = false;
}
function genericEndTagInBody(p, token) {
    const tn = token.tagName;
    const tid = token.tagID;
    for (let i = p.openElements.stackTop; i > 0; i--) {
        const element = p.openElements.items[i];
        const elementId = p.openElements.tagIDs[i];
        // Compare the tag name here, as the tag might not be a known tag with an ID.
        if (tid === elementId && (tid !== html_js_1.TAG_ID.UNKNOWN || p.treeAdapter.getTagName(element) === tn)) {
            p.openElements.generateImpliedEndTagsWithExclusion(tid);
            if (p.openElements.stackTop >= i)
                p.openElements.shortenToLength(i);
            break;
        }
        if (p._isSpecialElement(element, elementId)) {
            break;
        }
    }
}
function endTagInBody(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.A:
        case html_js_1.TAG_ID.B:
        case html_js_1.TAG_ID.I:
        case html_js_1.TAG_ID.S:
        case html_js_1.TAG_ID.U:
        case html_js_1.TAG_ID.EM:
        case html_js_1.TAG_ID.TT:
        case html_js_1.TAG_ID.BIG:
        case html_js_1.TAG_ID.CODE:
        case html_js_1.TAG_ID.FONT:
        case html_js_1.TAG_ID.NOBR:
        case html_js_1.TAG_ID.SMALL:
        case html_js_1.TAG_ID.STRIKE:
        case html_js_1.TAG_ID.STRONG: {
            callAdoptionAgency(p, token);
            break;
        }
        case html_js_1.TAG_ID.P: {
            pEndTagInBody(p);
            break;
        }
        case html_js_1.TAG_ID.DL:
        case html_js_1.TAG_ID.UL:
        case html_js_1.TAG_ID.OL:
        case html_js_1.TAG_ID.DIR:
        case html_js_1.TAG_ID.DIV:
        case html_js_1.TAG_ID.NAV:
        case html_js_1.TAG_ID.PRE:
        case html_js_1.TAG_ID.MAIN:
        case html_js_1.TAG_ID.MENU:
        case html_js_1.TAG_ID.ASIDE:
        case html_js_1.TAG_ID.BUTTON:
        case html_js_1.TAG_ID.CENTER:
        case html_js_1.TAG_ID.FIGURE:
        case html_js_1.TAG_ID.FOOTER:
        case html_js_1.TAG_ID.HEADER:
        case html_js_1.TAG_ID.HGROUP:
        case html_js_1.TAG_ID.DIALOG:
        case html_js_1.TAG_ID.ADDRESS:
        case html_js_1.TAG_ID.ARTICLE:
        case html_js_1.TAG_ID.DETAILS:
        case html_js_1.TAG_ID.SECTION:
        case html_js_1.TAG_ID.SUMMARY:
        case html_js_1.TAG_ID.LISTING:
        case html_js_1.TAG_ID.FIELDSET:
        case html_js_1.TAG_ID.BLOCKQUOTE:
        case html_js_1.TAG_ID.FIGCAPTION: {
            addressEndTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.LI: {
            liEndTagInBody(p);
            break;
        }
        case html_js_1.TAG_ID.DD:
        case html_js_1.TAG_ID.DT: {
            ddEndTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.H1:
        case html_js_1.TAG_ID.H2:
        case html_js_1.TAG_ID.H3:
        case html_js_1.TAG_ID.H4:
        case html_js_1.TAG_ID.H5:
        case html_js_1.TAG_ID.H6: {
            numberedHeaderEndTagInBody(p);
            break;
        }
        case html_js_1.TAG_ID.BR: {
            brEndTagInBody(p);
            break;
        }
        case html_js_1.TAG_ID.BODY: {
            bodyEndTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.HTML: {
            htmlEndTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.FORM: {
            formEndTagInBody(p);
            break;
        }
        case html_js_1.TAG_ID.APPLET:
        case html_js_1.TAG_ID.OBJECT:
        case html_js_1.TAG_ID.MARQUEE: {
            appletEndTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.TEMPLATE: {
            templateEndTagInHead(p, token);
            break;
        }
        default: {
            genericEndTagInBody(p, token);
        }
    }
}
function eofInBody(p, token) {
    if (p.tmplInsertionModeStack.length > 0) {
        eofInTemplate(p, token);
    }
    else {
        stopParsing(p, token);
    }
}
// The "text" insertion mode
//------------------------------------------------------------------
function endTagInText(p, token) {
    var _a;
    if (token.tagID === html_js_1.TAG_ID.SCRIPT) {
        (_a = p.scriptHandler) === null || _a === void 0 ? void 0 : _a.call(p, p.openElements.current);
    }
    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
}
function eofInText(p, token) {
    p._err(token, error_codes_js_1.ERR.eofInElementThatCanContainOnlyText);
    p.openElements.pop();
    p.insertionMode = p.originalInsertionMode;
    p.onEof(token);
}
// The "in table" insertion mode
//------------------------------------------------------------------
function characterInTable(p, token) {
    if (TABLE_STRUCTURE_TAGS.has(p.openElements.currentTagId)) {
        p.pendingCharacterTokens.length = 0;
        p.hasNonWhitespacePendingCharacterToken = false;
        p.originalInsertionMode = p.insertionMode;
        p.insertionMode = InsertionMode.IN_TABLE_TEXT;
        switch (token.type) {
            case token_js_1.TokenType.CHARACTER: {
                characterInTableText(p, token);
                break;
            }
            case token_js_1.TokenType.WHITESPACE_CHARACTER: {
                whitespaceCharacterInTableText(p, token);
                break;
            }
            // Ignore null
        }
    }
    else {
        tokenInTable(p, token);
    }
}
function captionStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p.activeFormattingElements.insertMarker();
    p._insertElement(token, html_js_1.NS.HTML);
    p.insertionMode = InsertionMode.IN_CAPTION;
}
function colgroupStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertElement(token, html_js_1.NS.HTML);
    p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
}
function colStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertFakeElement(html_js_1.TAG_NAMES.COLGROUP, html_js_1.TAG_ID.COLGROUP);
    p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
    startTagInColumnGroup(p, token);
}
function tbodyStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertElement(token, html_js_1.NS.HTML);
    p.insertionMode = InsertionMode.IN_TABLE_BODY;
}
function tdStartTagInTable(p, token) {
    p.openElements.clearBackToTableContext();
    p._insertFakeElement(html_js_1.TAG_NAMES.TBODY, html_js_1.TAG_ID.TBODY);
    p.insertionMode = InsertionMode.IN_TABLE_BODY;
    startTagInTableBody(p, token);
}
function tableStartTagInTable(p, token) {
    if (p.openElements.hasInTableScope(html_js_1.TAG_ID.TABLE)) {
        p.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.TABLE);
        p._resetInsertionMode();
        p._processStartTag(token);
    }
}
function inputStartTagInTable(p, token) {
    if (isHiddenInput(token)) {
        p._appendElement(token, html_js_1.NS.HTML);
    }
    else {
        tokenInTable(p, token);
    }
    token.ackSelfClosing = true;
}
function formStartTagInTable(p, token) {
    if (!p.formElement && p.openElements.tmplCount === 0) {
        p._insertElement(token, html_js_1.NS.HTML);
        p.formElement = p.openElements.current;
        p.openElements.pop();
    }
}
function startTagInTable(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.TD:
        case html_js_1.TAG_ID.TH:
        case html_js_1.TAG_ID.TR: {
            tdStartTagInTable(p, token);
            break;
        }
        case html_js_1.TAG_ID.STYLE:
        case html_js_1.TAG_ID.SCRIPT:
        case html_js_1.TAG_ID.TEMPLATE: {
            startTagInHead(p, token);
            break;
        }
        case html_js_1.TAG_ID.COL: {
            colStartTagInTable(p, token);
            break;
        }
        case html_js_1.TAG_ID.FORM: {
            formStartTagInTable(p, token);
            break;
        }
        case html_js_1.TAG_ID.TABLE: {
            tableStartTagInTable(p, token);
            break;
        }
        case html_js_1.TAG_ID.TBODY:
        case html_js_1.TAG_ID.TFOOT:
        case html_js_1.TAG_ID.THEAD: {
            tbodyStartTagInTable(p, token);
            break;
        }
        case html_js_1.TAG_ID.INPUT: {
            inputStartTagInTable(p, token);
            break;
        }
        case html_js_1.TAG_ID.CAPTION: {
            captionStartTagInTable(p, token);
            break;
        }
        case html_js_1.TAG_ID.COLGROUP: {
            colgroupStartTagInTable(p, token);
            break;
        }
        default: {
            tokenInTable(p, token);
        }
    }
}
function endTagInTable(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.TABLE: {
            if (p.openElements.hasInTableScope(html_js_1.TAG_ID.TABLE)) {
                p.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.TABLE);
                p._resetInsertionMode();
            }
            break;
        }
        case html_js_1.TAG_ID.TEMPLATE: {
            templateEndTagInHead(p, token);
            break;
        }
        case html_js_1.TAG_ID.BODY:
        case html_js_1.TAG_ID.CAPTION:
        case html_js_1.TAG_ID.COL:
        case html_js_1.TAG_ID.COLGROUP:
        case html_js_1.TAG_ID.HTML:
        case html_js_1.TAG_ID.TBODY:
        case html_js_1.TAG_ID.TD:
        case html_js_1.TAG_ID.TFOOT:
        case html_js_1.TAG_ID.TH:
        case html_js_1.TAG_ID.THEAD:
        case html_js_1.TAG_ID.TR: {
            // Ignore token
            break;
        }
        default: {
            tokenInTable(p, token);
        }
    }
}
function tokenInTable(p, token) {
    const savedFosterParentingState = p.fosterParentingEnabled;
    p.fosterParentingEnabled = true;
    // Process token in `In Body` mode
    modeInBody(p, token);
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
    }
    else {
        for (; i < p.pendingCharacterTokens.length; i++) {
            p._insertCharacters(p.pendingCharacterTokens[i]);
        }
    }
    p.insertionMode = p.originalInsertionMode;
    p._processToken(token);
}
// The "in caption" insertion mode
//------------------------------------------------------------------
const TABLE_VOID_ELEMENTS = new Set([html_js_1.TAG_ID.CAPTION, html_js_1.TAG_ID.COL, html_js_1.TAG_ID.COLGROUP, html_js_1.TAG_ID.TBODY, html_js_1.TAG_ID.TD, html_js_1.TAG_ID.TFOOT, html_js_1.TAG_ID.TH, html_js_1.TAG_ID.THEAD, html_js_1.TAG_ID.TR]);
function startTagInCaption(p, token) {
    const tn = token.tagID;
    if (TABLE_VOID_ELEMENTS.has(tn)) {
        if (p.openElements.hasInTableScope(html_js_1.TAG_ID.CAPTION)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.CAPTION);
            p.activeFormattingElements.clearToLastMarker();
            p.insertionMode = InsertionMode.IN_TABLE;
            startTagInTable(p, token);
        }
    }
    else {
        startTagInBody(p, token);
    }
}
function endTagInCaption(p, token) {
    const tn = token.tagID;
    switch (tn) {
        case html_js_1.TAG_ID.CAPTION:
        case html_js_1.TAG_ID.TABLE: {
            if (p.openElements.hasInTableScope(html_js_1.TAG_ID.CAPTION)) {
                p.openElements.generateImpliedEndTags();
                p.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.CAPTION);
                p.activeFormattingElements.clearToLastMarker();
                p.insertionMode = InsertionMode.IN_TABLE;
                if (tn === html_js_1.TAG_ID.TABLE) {
                    endTagInTable(p, token);
                }
            }
            break;
        }
        case html_js_1.TAG_ID.BODY:
        case html_js_1.TAG_ID.COL:
        case html_js_1.TAG_ID.COLGROUP:
        case html_js_1.TAG_ID.HTML:
        case html_js_1.TAG_ID.TBODY:
        case html_js_1.TAG_ID.TD:
        case html_js_1.TAG_ID.TFOOT:
        case html_js_1.TAG_ID.TH:
        case html_js_1.TAG_ID.THEAD:
        case html_js_1.TAG_ID.TR: {
            // Ignore token
            break;
        }
        default: {
            endTagInBody(p, token);
        }
    }
}
// The "in column group" insertion mode
//------------------------------------------------------------------
function startTagInColumnGroup(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.COL: {
            p._appendElement(token, html_js_1.NS.HTML);
            token.ackSelfClosing = true;
            break;
        }
        case html_js_1.TAG_ID.TEMPLATE: {
            startTagInHead(p, token);
            break;
        }
        default: {
            tokenInColumnGroup(p, token);
        }
    }
}
function endTagInColumnGroup(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.COLGROUP: {
            if (p.openElements.currentTagId === html_js_1.TAG_ID.COLGROUP) {
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE;
            }
            break;
        }
        case html_js_1.TAG_ID.TEMPLATE: {
            templateEndTagInHead(p, token);
            break;
        }
        case html_js_1.TAG_ID.COL: {
            // Ignore token
            break;
        }
        default: {
            tokenInColumnGroup(p, token);
        }
    }
}
function tokenInColumnGroup(p, token) {
    if (p.openElements.currentTagId === html_js_1.TAG_ID.COLGROUP) {
        p.openElements.pop();
        p.insertionMode = InsertionMode.IN_TABLE;
        p._processToken(token);
    }
}
// The "in table body" insertion mode
//------------------------------------------------------------------
function startTagInTableBody(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.TR: {
            p.openElements.clearBackToTableBodyContext();
            p._insertElement(token, html_js_1.NS.HTML);
            p.insertionMode = InsertionMode.IN_ROW;
            break;
        }
        case html_js_1.TAG_ID.TH:
        case html_js_1.TAG_ID.TD: {
            p.openElements.clearBackToTableBodyContext();
            p._insertFakeElement(html_js_1.TAG_NAMES.TR, html_js_1.TAG_ID.TR);
            p.insertionMode = InsertionMode.IN_ROW;
            startTagInRow(p, token);
            break;
        }
        case html_js_1.TAG_ID.CAPTION:
        case html_js_1.TAG_ID.COL:
        case html_js_1.TAG_ID.COLGROUP:
        case html_js_1.TAG_ID.TBODY:
        case html_js_1.TAG_ID.TFOOT:
        case html_js_1.TAG_ID.THEAD: {
            if (p.openElements.hasTableBodyContextInTableScope()) {
                p.openElements.clearBackToTableBodyContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE;
                startTagInTable(p, token);
            }
            break;
        }
        default: {
            startTagInTable(p, token);
        }
    }
}
function endTagInTableBody(p, token) {
    const tn = token.tagID;
    switch (token.tagID) {
        case html_js_1.TAG_ID.TBODY:
        case html_js_1.TAG_ID.TFOOT:
        case html_js_1.TAG_ID.THEAD: {
            if (p.openElements.hasInTableScope(tn)) {
                p.openElements.clearBackToTableBodyContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE;
            }
            break;
        }
        case html_js_1.TAG_ID.TABLE: {
            if (p.openElements.hasTableBodyContextInTableScope()) {
                p.openElements.clearBackToTableBodyContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE;
                endTagInTable(p, token);
            }
            break;
        }
        case html_js_1.TAG_ID.BODY:
        case html_js_1.TAG_ID.CAPTION:
        case html_js_1.TAG_ID.COL:
        case html_js_1.TAG_ID.COLGROUP:
        case html_js_1.TAG_ID.HTML:
        case html_js_1.TAG_ID.TD:
        case html_js_1.TAG_ID.TH:
        case html_js_1.TAG_ID.TR: {
            // Ignore token
            break;
        }
        default: {
            endTagInTable(p, token);
        }
    }
}
// The "in row" insertion mode
//------------------------------------------------------------------
function startTagInRow(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.TH:
        case html_js_1.TAG_ID.TD: {
            p.openElements.clearBackToTableRowContext();
            p._insertElement(token, html_js_1.NS.HTML);
            p.insertionMode = InsertionMode.IN_CELL;
            p.activeFormattingElements.insertMarker();
            break;
        }
        case html_js_1.TAG_ID.CAPTION:
        case html_js_1.TAG_ID.COL:
        case html_js_1.TAG_ID.COLGROUP:
        case html_js_1.TAG_ID.TBODY:
        case html_js_1.TAG_ID.TFOOT:
        case html_js_1.TAG_ID.THEAD:
        case html_js_1.TAG_ID.TR: {
            if (p.openElements.hasInTableScope(html_js_1.TAG_ID.TR)) {
                p.openElements.clearBackToTableRowContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE_BODY;
                startTagInTableBody(p, token);
            }
            break;
        }
        default: {
            startTagInTable(p, token);
        }
    }
}
function endTagInRow(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.TR: {
            if (p.openElements.hasInTableScope(html_js_1.TAG_ID.TR)) {
                p.openElements.clearBackToTableRowContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE_BODY;
            }
            break;
        }
        case html_js_1.TAG_ID.TABLE: {
            if (p.openElements.hasInTableScope(html_js_1.TAG_ID.TR)) {
                p.openElements.clearBackToTableRowContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE_BODY;
                endTagInTableBody(p, token);
            }
            break;
        }
        case html_js_1.TAG_ID.TBODY:
        case html_js_1.TAG_ID.TFOOT:
        case html_js_1.TAG_ID.THEAD: {
            if (p.openElements.hasInTableScope(token.tagID) || p.openElements.hasInTableScope(html_js_1.TAG_ID.TR)) {
                p.openElements.clearBackToTableRowContext();
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_TABLE_BODY;
                endTagInTableBody(p, token);
            }
            break;
        }
        case html_js_1.TAG_ID.BODY:
        case html_js_1.TAG_ID.CAPTION:
        case html_js_1.TAG_ID.COL:
        case html_js_1.TAG_ID.COLGROUP:
        case html_js_1.TAG_ID.HTML:
        case html_js_1.TAG_ID.TD:
        case html_js_1.TAG_ID.TH: {
            // Ignore end tag
            break;
        }
        default:
            endTagInTable(p, token);
    }
}
// The "in cell" insertion mode
//------------------------------------------------------------------
function startTagInCell(p, token) {
    const tn = token.tagID;
    if (TABLE_VOID_ELEMENTS.has(tn)) {
        if (p.openElements.hasInTableScope(html_js_1.TAG_ID.TD) || p.openElements.hasInTableScope(html_js_1.TAG_ID.TH)) {
            p._closeTableCell();
            startTagInRow(p, token);
        }
    }
    else {
        startTagInBody(p, token);
    }
}
function endTagInCell(p, token) {
    const tn = token.tagID;
    switch (tn) {
        case html_js_1.TAG_ID.TD:
        case html_js_1.TAG_ID.TH: {
            if (p.openElements.hasInTableScope(tn)) {
                p.openElements.generateImpliedEndTags();
                p.openElements.popUntilTagNamePopped(tn);
                p.activeFormattingElements.clearToLastMarker();
                p.insertionMode = InsertionMode.IN_ROW;
            }
            break;
        }
        case html_js_1.TAG_ID.TABLE:
        case html_js_1.TAG_ID.TBODY:
        case html_js_1.TAG_ID.TFOOT:
        case html_js_1.TAG_ID.THEAD:
        case html_js_1.TAG_ID.TR: {
            if (p.openElements.hasInTableScope(tn)) {
                p._closeTableCell();
                endTagInRow(p, token);
            }
            break;
        }
        case html_js_1.TAG_ID.BODY:
        case html_js_1.TAG_ID.CAPTION:
        case html_js_1.TAG_ID.COL:
        case html_js_1.TAG_ID.COLGROUP:
        case html_js_1.TAG_ID.HTML: {
            // Ignore token
            break;
        }
        default: {
            endTagInBody(p, token);
        }
    }
}
// The "in select" insertion mode
//------------------------------------------------------------------
function startTagInSelect(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.OPTION: {
            if (p.openElements.currentTagId === html_js_1.TAG_ID.OPTION) {
                p.openElements.pop();
            }
            p._insertElement(token, html_js_1.NS.HTML);
            break;
        }
        case html_js_1.TAG_ID.OPTGROUP: {
            if (p.openElements.currentTagId === html_js_1.TAG_ID.OPTION) {
                p.openElements.pop();
            }
            if (p.openElements.currentTagId === html_js_1.TAG_ID.OPTGROUP) {
                p.openElements.pop();
            }
            p._insertElement(token, html_js_1.NS.HTML);
            break;
        }
        case html_js_1.TAG_ID.INPUT:
        case html_js_1.TAG_ID.KEYGEN:
        case html_js_1.TAG_ID.TEXTAREA:
        case html_js_1.TAG_ID.SELECT: {
            if (p.openElements.hasInSelectScope(html_js_1.TAG_ID.SELECT)) {
                p.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.SELECT);
                p._resetInsertionMode();
                if (token.tagID !== html_js_1.TAG_ID.SELECT) {
                    p._processStartTag(token);
                }
            }
            break;
        }
        case html_js_1.TAG_ID.SCRIPT:
        case html_js_1.TAG_ID.TEMPLATE: {
            startTagInHead(p, token);
            break;
        }
        default:
        // Do nothing
    }
}
function endTagInSelect(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.OPTGROUP: {
            if (p.openElements.stackTop > 0 &&
                p.openElements.currentTagId === html_js_1.TAG_ID.OPTION &&
                p.openElements.tagIDs[p.openElements.stackTop - 1] === html_js_1.TAG_ID.OPTGROUP) {
                p.openElements.pop();
            }
            if (p.openElements.currentTagId === html_js_1.TAG_ID.OPTGROUP) {
                p.openElements.pop();
            }
            break;
        }
        case html_js_1.TAG_ID.OPTION: {
            if (p.openElements.currentTagId === html_js_1.TAG_ID.OPTION) {
                p.openElements.pop();
            }
            break;
        }
        case html_js_1.TAG_ID.SELECT: {
            if (p.openElements.hasInSelectScope(html_js_1.TAG_ID.SELECT)) {
                p.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.SELECT);
                p._resetInsertionMode();
            }
            break;
        }
        case html_js_1.TAG_ID.TEMPLATE: {
            templateEndTagInHead(p, token);
            break;
        }
        default:
        // Do nothing
    }
}
// The "in select in table" insertion mode
//------------------------------------------------------------------
function startTagInSelectInTable(p, token) {
    const tn = token.tagID;
    if (tn === html_js_1.TAG_ID.CAPTION ||
        tn === html_js_1.TAG_ID.TABLE ||
        tn === html_js_1.TAG_ID.TBODY ||
        tn === html_js_1.TAG_ID.TFOOT ||
        tn === html_js_1.TAG_ID.THEAD ||
        tn === html_js_1.TAG_ID.TR ||
        tn === html_js_1.TAG_ID.TD ||
        tn === html_js_1.TAG_ID.TH) {
        p.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.SELECT);
        p._resetInsertionMode();
        p._processStartTag(token);
    }
    else {
        startTagInSelect(p, token);
    }
}
function endTagInSelectInTable(p, token) {
    const tn = token.tagID;
    if (tn === html_js_1.TAG_ID.CAPTION ||
        tn === html_js_1.TAG_ID.TABLE ||
        tn === html_js_1.TAG_ID.TBODY ||
        tn === html_js_1.TAG_ID.TFOOT ||
        tn === html_js_1.TAG_ID.THEAD ||
        tn === html_js_1.TAG_ID.TR ||
        tn === html_js_1.TAG_ID.TD ||
        tn === html_js_1.TAG_ID.TH) {
        if (p.openElements.hasInTableScope(tn)) {
            p.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.SELECT);
            p._resetInsertionMode();
            p.onEndTag(token);
        }
    }
    else {
        endTagInSelect(p, token);
    }
}
// The "in template" insertion mode
//------------------------------------------------------------------
function startTagInTemplate(p, token) {
    switch (token.tagID) {
        // First, handle tags that can start without a mode change
        case html_js_1.TAG_ID.BASE:
        case html_js_1.TAG_ID.BASEFONT:
        case html_js_1.TAG_ID.BGSOUND:
        case html_js_1.TAG_ID.LINK:
        case html_js_1.TAG_ID.META:
        case html_js_1.TAG_ID.NOFRAMES:
        case html_js_1.TAG_ID.SCRIPT:
        case html_js_1.TAG_ID.STYLE:
        case html_js_1.TAG_ID.TEMPLATE:
        case html_js_1.TAG_ID.TITLE:
            startTagInHead(p, token);
            break;
        // Re-process the token in the appropriate mode
        case html_js_1.TAG_ID.CAPTION:
        case html_js_1.TAG_ID.COLGROUP:
        case html_js_1.TAG_ID.TBODY:
        case html_js_1.TAG_ID.TFOOT:
        case html_js_1.TAG_ID.THEAD:
            p.tmplInsertionModeStack[0] = InsertionMode.IN_TABLE;
            p.insertionMode = InsertionMode.IN_TABLE;
            startTagInTable(p, token);
            break;
        case html_js_1.TAG_ID.COL:
            p.tmplInsertionModeStack[0] = InsertionMode.IN_COLUMN_GROUP;
            p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
            startTagInColumnGroup(p, token);
            break;
        case html_js_1.TAG_ID.TR:
            p.tmplInsertionModeStack[0] = InsertionMode.IN_TABLE_BODY;
            p.insertionMode = InsertionMode.IN_TABLE_BODY;
            startTagInTableBody(p, token);
            break;
        case html_js_1.TAG_ID.TD:
        case html_js_1.TAG_ID.TH:
            p.tmplInsertionModeStack[0] = InsertionMode.IN_ROW;
            p.insertionMode = InsertionMode.IN_ROW;
            startTagInRow(p, token);
            break;
        default:
            p.tmplInsertionModeStack[0] = InsertionMode.IN_BODY;
            p.insertionMode = InsertionMode.IN_BODY;
            startTagInBody(p, token);
    }
}
function endTagInTemplate(p, token) {
    if (token.tagID === html_js_1.TAG_ID.TEMPLATE) {
        templateEndTagInHead(p, token);
    }
}
function eofInTemplate(p, token) {
    if (p.openElements.tmplCount > 0) {
        p.openElements.popUntilTagNamePopped(html_js_1.TAG_ID.TEMPLATE);
        p.activeFormattingElements.clearToLastMarker();
        p.tmplInsertionModeStack.shift();
        p._resetInsertionMode();
        p.onEof(token);
    }
    else {
        stopParsing(p, token);
    }
}
// The "after body" insertion mode
//------------------------------------------------------------------
function startTagAfterBody(p, token) {
    if (token.tagID === html_js_1.TAG_ID.HTML) {
        startTagInBody(p, token);
    }
    else {
        tokenAfterBody(p, token);
    }
}
function endTagAfterBody(p, token) {
    var _a;
    if (token.tagID === html_js_1.TAG_ID.HTML) {
        if (!p.fragmentContext) {
            p.insertionMode = InsertionMode.AFTER_AFTER_BODY;
        }
        //NOTE: <html> is never popped from the stack, so we need to updated
        //the end location explicitly.
        if (p.options.sourceCodeLocationInfo && p.openElements.tagIDs[0] === html_js_1.TAG_ID.HTML) {
            p._setEndLocation(p.openElements.items[0], token);
            // Update the body element, if it doesn't have an end tag
            const bodyElement = p.openElements.items[1];
            if (bodyElement && !((_a = p.treeAdapter.getNodeSourceCodeLocation(bodyElement)) === null || _a === void 0 ? void 0 : _a.endTag)) {
                p._setEndLocation(bodyElement, token);
            }
        }
    }
    else {
        tokenAfterBody(p, token);
    }
}
function tokenAfterBody(p, token) {
    p.insertionMode = InsertionMode.IN_BODY;
    modeInBody(p, token);
}
// The "in frameset" insertion mode
//------------------------------------------------------------------
function startTagInFrameset(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.FRAMESET: {
            p._insertElement(token, html_js_1.NS.HTML);
            break;
        }
        case html_js_1.TAG_ID.FRAME: {
            p._appendElement(token, html_js_1.NS.HTML);
            token.ackSelfClosing = true;
            break;
        }
        case html_js_1.TAG_ID.NOFRAMES: {
            startTagInHead(p, token);
            break;
        }
        default:
        // Do nothing
    }
}
function endTagInFrameset(p, token) {
    if (token.tagID === html_js_1.TAG_ID.FRAMESET && !p.openElements.isRootHtmlElementCurrent()) {
        p.openElements.pop();
        if (!p.fragmentContext && p.openElements.currentTagId !== html_js_1.TAG_ID.FRAMESET) {
            p.insertionMode = InsertionMode.AFTER_FRAMESET;
        }
    }
}
// The "after frameset" insertion mode
//------------------------------------------------------------------
function startTagAfterFrameset(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.NOFRAMES: {
            startTagInHead(p, token);
            break;
        }
        default:
        // Do nothing
    }
}
function endTagAfterFrameset(p, token) {
    if (token.tagID === html_js_1.TAG_ID.HTML) {
        p.insertionMode = InsertionMode.AFTER_AFTER_FRAMESET;
    }
}
// The "after after body" insertion mode
//------------------------------------------------------------------
function startTagAfterAfterBody(p, token) {
    if (token.tagID === html_js_1.TAG_ID.HTML) {
        startTagInBody(p, token);
    }
    else {
        tokenAfterAfterBody(p, token);
    }
}
function tokenAfterAfterBody(p, token) {
    p.insertionMode = InsertionMode.IN_BODY;
    modeInBody(p, token);
}
// The "after after frameset" insertion mode
//------------------------------------------------------------------
function startTagAfterAfterFrameset(p, token) {
    switch (token.tagID) {
        case html_js_1.TAG_ID.HTML: {
            startTagInBody(p, token);
            break;
        }
        case html_js_1.TAG_ID.NOFRAMES: {
            startTagInHead(p, token);
            break;
        }
        default:
        // Do nothing
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
function popUntilHtmlOrIntegrationPoint(p) {
    while (p.treeAdapter.getNamespaceURI(p.openElements.current) !== html_js_1.NS.HTML &&
        !p._isIntegrationPoint(p.openElements.currentTagId, p.openElements.current)) {
        p.openElements.pop();
    }
}
function startTagInForeignContent(p, token) {
    if (foreignContent.causesExit(token)) {
        popUntilHtmlOrIntegrationPoint(p);
        p._startTagOutsideForeignContent(token);
    }
    else {
        const current = p._getAdjustedCurrentElement();
        const currentNs = p.treeAdapter.getNamespaceURI(current);
        if (currentNs === html_js_1.NS.MATHML) {
            foreignContent.adjustTokenMathMLAttrs(token);
        }
        else if (currentNs === html_js_1.NS.SVG) {
            foreignContent.adjustTokenSVGTagName(token);
            foreignContent.adjustTokenSVGAttrs(token);
        }
        foreignContent.adjustTokenXMLAttrs(token);
        if (token.selfClosing) {
            p._appendElement(token, currentNs);
        }
        else {
            p._insertElement(token, currentNs);
        }
        token.ackSelfClosing = true;
    }
}
function endTagInForeignContent(p, token) {
    if (token.tagID === html_js_1.TAG_ID.P || token.tagID === html_js_1.TAG_ID.BR) {
        popUntilHtmlOrIntegrationPoint(p);
        p._endTagOutsideForeignContent(token);
        return;
    }
    for (let i = p.openElements.stackTop; i > 0; i--) {
        const element = p.openElements.items[i];
        if (p.treeAdapter.getNamespaceURI(element) === html_js_1.NS.HTML) {
            p._endTagOutsideForeignContent(token);
            break;
        }
        const tagName = p.treeAdapter.getTagName(element);
        if (tagName.toLowerCase() === token.tagName) {
            //NOTE: update the token tag name for `_setEndLocation`.
            token.tagName = tagName;
            p.openElements.shortenToLength(i);
            break;
        }
    }
}

},{"../common/doctype.js":6,"../common/error-codes.js":7,"../common/foreign-content.js":8,"../common/html.js":9,"../common/token.js":10,"../common/unicode.js":11,"../tokenizer/index.js":17,"../tree-adapters/default.js":19,"./formatting-element-list.js":13,"./open-element-stack.js":15}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenElementStack = void 0;
const html_js_1 = require("../common/html.js");
//Element utils
const IMPLICIT_END_TAG_REQUIRED = new Set([html_js_1.TAG_ID.DD, html_js_1.TAG_ID.DT, html_js_1.TAG_ID.LI, html_js_1.TAG_ID.OPTGROUP, html_js_1.TAG_ID.OPTION, html_js_1.TAG_ID.P, html_js_1.TAG_ID.RB, html_js_1.TAG_ID.RP, html_js_1.TAG_ID.RT, html_js_1.TAG_ID.RTC]);
const IMPLICIT_END_TAG_REQUIRED_THOROUGHLY = new Set([
    ...IMPLICIT_END_TAG_REQUIRED,
    html_js_1.TAG_ID.CAPTION,
    html_js_1.TAG_ID.COLGROUP,
    html_js_1.TAG_ID.TBODY,
    html_js_1.TAG_ID.TD,
    html_js_1.TAG_ID.TFOOT,
    html_js_1.TAG_ID.TH,
    html_js_1.TAG_ID.THEAD,
    html_js_1.TAG_ID.TR,
]);
const SCOPING_ELEMENT_NS = new Map([
    [html_js_1.TAG_ID.APPLET, html_js_1.NS.HTML],
    [html_js_1.TAG_ID.CAPTION, html_js_1.NS.HTML],
    [html_js_1.TAG_ID.HTML, html_js_1.NS.HTML],
    [html_js_1.TAG_ID.MARQUEE, html_js_1.NS.HTML],
    [html_js_1.TAG_ID.OBJECT, html_js_1.NS.HTML],
    [html_js_1.TAG_ID.TABLE, html_js_1.NS.HTML],
    [html_js_1.TAG_ID.TD, html_js_1.NS.HTML],
    [html_js_1.TAG_ID.TEMPLATE, html_js_1.NS.HTML],
    [html_js_1.TAG_ID.TH, html_js_1.NS.HTML],
    [html_js_1.TAG_ID.ANNOTATION_XML, html_js_1.NS.MATHML],
    [html_js_1.TAG_ID.MI, html_js_1.NS.MATHML],
    [html_js_1.TAG_ID.MN, html_js_1.NS.MATHML],
    [html_js_1.TAG_ID.MO, html_js_1.NS.MATHML],
    [html_js_1.TAG_ID.MS, html_js_1.NS.MATHML],
    [html_js_1.TAG_ID.MTEXT, html_js_1.NS.MATHML],
    [html_js_1.TAG_ID.DESC, html_js_1.NS.SVG],
    [html_js_1.TAG_ID.FOREIGN_OBJECT, html_js_1.NS.SVG],
    [html_js_1.TAG_ID.TITLE, html_js_1.NS.SVG],
]);
const NAMED_HEADERS = [html_js_1.TAG_ID.H1, html_js_1.TAG_ID.H2, html_js_1.TAG_ID.H3, html_js_1.TAG_ID.H4, html_js_1.TAG_ID.H5, html_js_1.TAG_ID.H6];
const TABLE_ROW_CONTEXT = [html_js_1.TAG_ID.TR, html_js_1.TAG_ID.TEMPLATE, html_js_1.TAG_ID.HTML];
const TABLE_BODY_CONTEXT = [html_js_1.TAG_ID.TBODY, html_js_1.TAG_ID.TFOOT, html_js_1.TAG_ID.THEAD, html_js_1.TAG_ID.TEMPLATE, html_js_1.TAG_ID.HTML];
const TABLE_CONTEXT = [html_js_1.TAG_ID.TABLE, html_js_1.TAG_ID.TEMPLATE, html_js_1.TAG_ID.HTML];
const TABLE_CELLS = [html_js_1.TAG_ID.TD, html_js_1.TAG_ID.TH];
//Stack of open elements
class OpenElementStack {
    constructor(document, treeAdapter, handler) {
        this.treeAdapter = treeAdapter;
        this.handler = handler;
        this.items = [];
        this.tagIDs = [];
        this.stackTop = -1;
        this.tmplCount = 0;
        this.currentTagId = html_js_1.TAG_ID.UNKNOWN;
        this.current = document;
    }
    get currentTmplContentOrNode() {
        return this._isInTemplate() ? this.treeAdapter.getTemplateContent(this.current) : this.current;
    }
    //Index of element
    _indexOf(element) {
        return this.items.lastIndexOf(element, this.stackTop);
    }
    //Update current element
    _isInTemplate() {
        return this.currentTagId === html_js_1.TAG_ID.TEMPLATE && this.treeAdapter.getNamespaceURI(this.current) === html_js_1.NS.HTML;
    }
    _updateCurrentElement() {
        this.current = this.items[this.stackTop];
        this.currentTagId = this.tagIDs[this.stackTop];
    }
    //Mutations
    push(element, tagID) {
        this.stackTop++;
        this.items[this.stackTop] = element;
        this.current = element;
        this.tagIDs[this.stackTop] = tagID;
        this.currentTagId = tagID;
        if (this._isInTemplate()) {
            this.tmplCount++;
        }
        this.handler.onItemPush(element, tagID, true);
    }
    pop() {
        const popped = this.current;
        if (this.tmplCount > 0 && this._isInTemplate()) {
            this.tmplCount--;
        }
        this.stackTop--;
        this._updateCurrentElement();
        this.handler.onItemPop(popped, true);
    }
    replace(oldElement, newElement) {
        const idx = this._indexOf(oldElement);
        this.items[idx] = newElement;
        if (idx === this.stackTop) {
            this.current = newElement;
        }
    }
    insertAfter(referenceElement, newElement, newElementID) {
        const insertionIdx = this._indexOf(referenceElement) + 1;
        this.items.splice(insertionIdx, 0, newElement);
        this.tagIDs.splice(insertionIdx, 0, newElementID);
        this.stackTop++;
        if (insertionIdx === this.stackTop) {
            this._updateCurrentElement();
        }
        this.handler.onItemPush(this.current, this.currentTagId, insertionIdx === this.stackTop);
    }
    popUntilTagNamePopped(tagName) {
        let targetIdx = this.stackTop + 1;
        do {
            targetIdx = this.tagIDs.lastIndexOf(tagName, targetIdx - 1);
        } while (targetIdx > 0 && this.treeAdapter.getNamespaceURI(this.items[targetIdx]) !== html_js_1.NS.HTML);
        this.shortenToLength(targetIdx < 0 ? 0 : targetIdx);
    }
    shortenToLength(idx) {
        while (this.stackTop >= idx) {
            const popped = this.current;
            if (this.tmplCount > 0 && this._isInTemplate()) {
                this.tmplCount -= 1;
            }
            this.stackTop--;
            this._updateCurrentElement();
            this.handler.onItemPop(popped, this.stackTop < idx);
        }
    }
    popUntilElementPopped(element) {
        const idx = this._indexOf(element);
        this.shortenToLength(idx < 0 ? 0 : idx);
    }
    popUntilPopped(tagNames, targetNS) {
        const idx = this._indexOfTagNames(tagNames, targetNS);
        this.shortenToLength(idx < 0 ? 0 : idx);
    }
    popUntilNumberedHeaderPopped() {
        this.popUntilPopped(NAMED_HEADERS, html_js_1.NS.HTML);
    }
    popUntilTableCellPopped() {
        this.popUntilPopped(TABLE_CELLS, html_js_1.NS.HTML);
    }
    popAllUpToHtmlElement() {
        //NOTE: here we assume that the root <html> element is always first in the open element stack, so
        //we perform this fast stack clean up.
        this.tmplCount = 0;
        this.shortenToLength(1);
    }
    _indexOfTagNames(tagNames, namespace) {
        for (let i = this.stackTop; i >= 0; i--) {
            if (tagNames.includes(this.tagIDs[i]) && this.treeAdapter.getNamespaceURI(this.items[i]) === namespace) {
                return i;
            }
        }
        return -1;
    }
    clearBackTo(tagNames, targetNS) {
        const idx = this._indexOfTagNames(tagNames, targetNS);
        this.shortenToLength(idx + 1);
    }
    clearBackToTableContext() {
        this.clearBackTo(TABLE_CONTEXT, html_js_1.NS.HTML);
    }
    clearBackToTableBodyContext() {
        this.clearBackTo(TABLE_BODY_CONTEXT, html_js_1.NS.HTML);
    }
    clearBackToTableRowContext() {
        this.clearBackTo(TABLE_ROW_CONTEXT, html_js_1.NS.HTML);
    }
    remove(element) {
        const idx = this._indexOf(element);
        if (idx >= 0) {
            if (idx === this.stackTop) {
                this.pop();
            }
            else {
                this.items.splice(idx, 1);
                this.tagIDs.splice(idx, 1);
                this.stackTop--;
                this._updateCurrentElement();
                this.handler.onItemPop(element, false);
            }
        }
    }
    //Search
    tryPeekProperlyNestedBodyElement() {
        //Properly nested <body> element (should be second element in stack).
        return this.stackTop >= 1 && this.tagIDs[1] === html_js_1.TAG_ID.BODY ? this.items[1] : null;
    }
    contains(element) {
        return this._indexOf(element) > -1;
    }
    getCommonAncestor(element) {
        const elementIdx = this._indexOf(element) - 1;
        return elementIdx >= 0 ? this.items[elementIdx] : null;
    }
    isRootHtmlElementCurrent() {
        return this.stackTop === 0 && this.tagIDs[0] === html_js_1.TAG_ID.HTML;
    }
    //Element in scope
    hasInScope(tagName) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);
            if (tn === tagName && ns === html_js_1.NS.HTML) {
                return true;
            }
            if (SCOPING_ELEMENT_NS.get(tn) === ns) {
                return false;
            }
        }
        return true;
    }
    hasNumberedHeaderInScope() {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);
            if ((0, html_js_1.isNumberedHeader)(tn) && ns === html_js_1.NS.HTML) {
                return true;
            }
            if (SCOPING_ELEMENT_NS.get(tn) === ns) {
                return false;
            }
        }
        return true;
    }
    hasInListItemScope(tagName) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);
            if (tn === tagName && ns === html_js_1.NS.HTML) {
                return true;
            }
            if (((tn === html_js_1.TAG_ID.UL || tn === html_js_1.TAG_ID.OL) && ns === html_js_1.NS.HTML) || SCOPING_ELEMENT_NS.get(tn) === ns) {
                return false;
            }
        }
        return true;
    }
    hasInButtonScope(tagName) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);
            if (tn === tagName && ns === html_js_1.NS.HTML) {
                return true;
            }
            if ((tn === html_js_1.TAG_ID.BUTTON && ns === html_js_1.NS.HTML) || SCOPING_ELEMENT_NS.get(tn) === ns) {
                return false;
            }
        }
        return true;
    }
    hasInTableScope(tagName) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);
            if (ns !== html_js_1.NS.HTML) {
                continue;
            }
            if (tn === tagName) {
                return true;
            }
            if (tn === html_js_1.TAG_ID.TABLE || tn === html_js_1.TAG_ID.TEMPLATE || tn === html_js_1.TAG_ID.HTML) {
                return false;
            }
        }
        return true;
    }
    hasTableBodyContextInTableScope() {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);
            if (ns !== html_js_1.NS.HTML) {
                continue;
            }
            if (tn === html_js_1.TAG_ID.TBODY || tn === html_js_1.TAG_ID.THEAD || tn === html_js_1.TAG_ID.TFOOT) {
                return true;
            }
            if (tn === html_js_1.TAG_ID.TABLE || tn === html_js_1.TAG_ID.HTML) {
                return false;
            }
        }
        return true;
    }
    hasInSelectScope(tagName) {
        for (let i = this.stackTop; i >= 0; i--) {
            const tn = this.tagIDs[i];
            const ns = this.treeAdapter.getNamespaceURI(this.items[i]);
            if (ns !== html_js_1.NS.HTML) {
                continue;
            }
            if (tn === tagName) {
                return true;
            }
            if (tn !== html_js_1.TAG_ID.OPTION && tn !== html_js_1.TAG_ID.OPTGROUP) {
                return false;
            }
        }
        return true;
    }
    //Implied end tags
    generateImpliedEndTags() {
        while (IMPLICIT_END_TAG_REQUIRED.has(this.currentTagId)) {
            this.pop();
        }
    }
    generateImpliedEndTagsThoroughly() {
        while (IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId)) {
            this.pop();
        }
    }
    generateImpliedEndTagsWithExclusion(exclusionId) {
        while (this.currentTagId !== exclusionId && IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId)) {
            this.pop();
        }
    }
}
exports.OpenElementStack = OpenElementStack;

},{"../common/html.js":9}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeOuter = exports.serialize = void 0;
const html_js_1 = require("../common/html.js");
const escape_js_1 = require("entities/lib/escape.js");
const default_js_1 = require("../tree-adapters/default.js");
// Sets
const VOID_ELEMENTS = new Set([
    html_js_1.TAG_NAMES.AREA,
    html_js_1.TAG_NAMES.BASE,
    html_js_1.TAG_NAMES.BASEFONT,
    html_js_1.TAG_NAMES.BGSOUND,
    html_js_1.TAG_NAMES.BR,
    html_js_1.TAG_NAMES.COL,
    html_js_1.TAG_NAMES.EMBED,
    html_js_1.TAG_NAMES.FRAME,
    html_js_1.TAG_NAMES.HR,
    html_js_1.TAG_NAMES.IMG,
    html_js_1.TAG_NAMES.INPUT,
    html_js_1.TAG_NAMES.KEYGEN,
    html_js_1.TAG_NAMES.LINK,
    html_js_1.TAG_NAMES.META,
    html_js_1.TAG_NAMES.PARAM,
    html_js_1.TAG_NAMES.SOURCE,
    html_js_1.TAG_NAMES.TRACK,
    html_js_1.TAG_NAMES.WBR,
]);
function isVoidElement(node, options) {
    return (options.treeAdapter.isElementNode(node) &&
        options.treeAdapter.getNamespaceURI(node) === html_js_1.NS.HTML &&
        VOID_ELEMENTS.has(options.treeAdapter.getTagName(node)));
}
const defaultOpts = { treeAdapter: default_js_1.defaultTreeAdapter, scriptingEnabled: true };
/**
 * Serializes an AST node to an HTML string.
 *
 * @example
 *
 * ```js
 * const parse5 = require('parse5');
 *
 * const document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
 *
 * // Serializes a document.
 * const html = parse5.serialize(document);
 *
 * // Serializes the <html> element content.
 * const str = parse5.serialize(document.childNodes[1]);
 *
 * console.log(str); //> '<head></head><body>Hi there!</body>'
 * ```
 *
 * @param node Node to serialize.
 * @param options Serialization options.
 */
function serialize(node, options) {
    const opts = Object.assign(Object.assign({}, defaultOpts), options);
    if (isVoidElement(node, opts)) {
        return '';
    }
    return serializeChildNodes(node, opts);
}
exports.serialize = serialize;
/**
 * Serializes an AST element node to an HTML string, including the element node.
 *
 * @example
 *
 * ```js
 * const parse5 = require('parse5');
 *
 * const document = parse5.parseFragment('<div>Hello, <b>world</b>!</div>');
 *
 * // Serializes the <div> element.
 * const html = parse5.serializeOuter(document.childNodes[0]);
 *
 * console.log(str); //> '<div>Hello, <b>world</b>!</div>'
 * ```
 *
 * @param node Node to serialize.
 * @param options Serialization options.
 */
function serializeOuter(node, options) {
    const opts = Object.assign(Object.assign({}, defaultOpts), options);
    return serializeNode(node, opts);
}
exports.serializeOuter = serializeOuter;
function serializeChildNodes(parentNode, options) {
    let html = '';
    // Get container of the child nodes
    const container = options.treeAdapter.isElementNode(parentNode) &&
        options.treeAdapter.getTagName(parentNode) === html_js_1.TAG_NAMES.TEMPLATE &&
        options.treeAdapter.getNamespaceURI(parentNode) === html_js_1.NS.HTML
        ? options.treeAdapter.getTemplateContent(parentNode)
        : parentNode;
    const childNodes = options.treeAdapter.getChildNodes(container);
    if (childNodes) {
        for (const currentNode of childNodes) {
            html += serializeNode(currentNode, options);
        }
    }
    return html;
}
function serializeNode(node, options) {
    if (options.treeAdapter.isElementNode(node)) {
        return serializeElement(node, options);
    }
    if (options.treeAdapter.isTextNode(node)) {
        return serializeTextNode(node, options);
    }
    if (options.treeAdapter.isCommentNode(node)) {
        return serializeCommentNode(node, options);
    }
    if (options.treeAdapter.isDocumentTypeNode(node)) {
        return serializeDocumentTypeNode(node, options);
    }
    // Return an empty string for unknown nodes
    return '';
}
function serializeElement(node, options) {
    const tn = options.treeAdapter.getTagName(node);
    return `<${tn}${serializeAttributes(node, options)}>${isVoidElement(node, options) ? '' : `${serializeChildNodes(node, options)}</${tn}>`}`;
}
function serializeAttributes(node, { treeAdapter }) {
    let html = '';
    for (const attr of treeAdapter.getAttrList(node)) {
        html += ' ';
        if (!attr.namespace) {
            html += attr.name;
        }
        else
            switch (attr.namespace) {
                case html_js_1.NS.XML: {
                    html += `xml:${attr.name}`;
                    break;
                }
                case html_js_1.NS.XMLNS: {
                    if (attr.name !== 'xmlns') {
                        html += 'xmlns:';
                    }
                    html += attr.name;
                    break;
                }
                case html_js_1.NS.XLINK: {
                    html += `xlink:${attr.name}`;
                    break;
                }
                default: {
                    html += `${attr.prefix}:${attr.name}`;
                }
            }
        html += `="${(0, escape_js_1.escapeAttribute)(attr.value)}"`;
    }
    return html;
}
function serializeTextNode(node, options) {
    const { treeAdapter } = options;
    const content = treeAdapter.getTextNodeContent(node);
    const parent = treeAdapter.getParentNode(node);
    const parentTn = parent && treeAdapter.isElementNode(parent) && treeAdapter.getTagName(parent);
    return parentTn &&
        treeAdapter.getNamespaceURI(parent) === html_js_1.NS.HTML &&
        (0, html_js_1.hasUnescapedText)(parentTn, options.scriptingEnabled)
        ? content
        : (0, escape_js_1.escapeText)(content);
}
function serializeCommentNode(node, { treeAdapter }) {
    return `<!--${treeAdapter.getCommentNodeContent(node)}-->`;
}
function serializeDocumentTypeNode(node, { treeAdapter }) {
    return `<!DOCTYPE ${treeAdapter.getDocumentTypeNodeName(node)}>`;
}

},{"../common/html.js":9,"../tree-adapters/default.js":19,"entities/lib/escape.js":3}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tokenizer = exports.TokenizerMode = void 0;
const preprocessor_js_1 = require("./preprocessor.js");
const unicode_js_1 = require("../common/unicode.js");
const token_js_1 = require("../common/token.js");
const decode_js_1 = require("entities/lib/decode.js");
const error_codes_js_1 = require("../common/error-codes.js");
const html_js_1 = require("../common/html.js");
//C1 Unicode control character reference replacements
const C1_CONTROLS_REFERENCE_REPLACEMENTS = new Map([
    [0x80, 8364],
    [0x82, 8218],
    [0x83, 402],
    [0x84, 8222],
    [0x85, 8230],
    [0x86, 8224],
    [0x87, 8225],
    [0x88, 710],
    [0x89, 8240],
    [0x8a, 352],
    [0x8b, 8249],
    [0x8c, 338],
    [0x8e, 381],
    [0x91, 8216],
    [0x92, 8217],
    [0x93, 8220],
    [0x94, 8221],
    [0x95, 8226],
    [0x96, 8211],
    [0x97, 8212],
    [0x98, 732],
    [0x99, 8482],
    [0x9a, 353],
    [0x9b, 8250],
    [0x9c, 339],
    [0x9e, 382],
    [0x9f, 376],
]);
//States
var State;
(function (State) {
    State[State["DATA"] = 0] = "DATA";
    State[State["RCDATA"] = 1] = "RCDATA";
    State[State["RAWTEXT"] = 2] = "RAWTEXT";
    State[State["SCRIPT_DATA"] = 3] = "SCRIPT_DATA";
    State[State["PLAINTEXT"] = 4] = "PLAINTEXT";
    State[State["TAG_OPEN"] = 5] = "TAG_OPEN";
    State[State["END_TAG_OPEN"] = 6] = "END_TAG_OPEN";
    State[State["TAG_NAME"] = 7] = "TAG_NAME";
    State[State["RCDATA_LESS_THAN_SIGN"] = 8] = "RCDATA_LESS_THAN_SIGN";
    State[State["RCDATA_END_TAG_OPEN"] = 9] = "RCDATA_END_TAG_OPEN";
    State[State["RCDATA_END_TAG_NAME"] = 10] = "RCDATA_END_TAG_NAME";
    State[State["RAWTEXT_LESS_THAN_SIGN"] = 11] = "RAWTEXT_LESS_THAN_SIGN";
    State[State["RAWTEXT_END_TAG_OPEN"] = 12] = "RAWTEXT_END_TAG_OPEN";
    State[State["RAWTEXT_END_TAG_NAME"] = 13] = "RAWTEXT_END_TAG_NAME";
    State[State["SCRIPT_DATA_LESS_THAN_SIGN"] = 14] = "SCRIPT_DATA_LESS_THAN_SIGN";
    State[State["SCRIPT_DATA_END_TAG_OPEN"] = 15] = "SCRIPT_DATA_END_TAG_OPEN";
    State[State["SCRIPT_DATA_END_TAG_NAME"] = 16] = "SCRIPT_DATA_END_TAG_NAME";
    State[State["SCRIPT_DATA_ESCAPE_START"] = 17] = "SCRIPT_DATA_ESCAPE_START";
    State[State["SCRIPT_DATA_ESCAPE_START_DASH"] = 18] = "SCRIPT_DATA_ESCAPE_START_DASH";
    State[State["SCRIPT_DATA_ESCAPED"] = 19] = "SCRIPT_DATA_ESCAPED";
    State[State["SCRIPT_DATA_ESCAPED_DASH"] = 20] = "SCRIPT_DATA_ESCAPED_DASH";
    State[State["SCRIPT_DATA_ESCAPED_DASH_DASH"] = 21] = "SCRIPT_DATA_ESCAPED_DASH_DASH";
    State[State["SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN"] = 22] = "SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN";
    State[State["SCRIPT_DATA_ESCAPED_END_TAG_OPEN"] = 23] = "SCRIPT_DATA_ESCAPED_END_TAG_OPEN";
    State[State["SCRIPT_DATA_ESCAPED_END_TAG_NAME"] = 24] = "SCRIPT_DATA_ESCAPED_END_TAG_NAME";
    State[State["SCRIPT_DATA_DOUBLE_ESCAPE_START"] = 25] = "SCRIPT_DATA_DOUBLE_ESCAPE_START";
    State[State["SCRIPT_DATA_DOUBLE_ESCAPED"] = 26] = "SCRIPT_DATA_DOUBLE_ESCAPED";
    State[State["SCRIPT_DATA_DOUBLE_ESCAPED_DASH"] = 27] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH";
    State[State["SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH"] = 28] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH";
    State[State["SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN"] = 29] = "SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN";
    State[State["SCRIPT_DATA_DOUBLE_ESCAPE_END"] = 30] = "SCRIPT_DATA_DOUBLE_ESCAPE_END";
    State[State["BEFORE_ATTRIBUTE_NAME"] = 31] = "BEFORE_ATTRIBUTE_NAME";
    State[State["ATTRIBUTE_NAME"] = 32] = "ATTRIBUTE_NAME";
    State[State["AFTER_ATTRIBUTE_NAME"] = 33] = "AFTER_ATTRIBUTE_NAME";
    State[State["BEFORE_ATTRIBUTE_VALUE"] = 34] = "BEFORE_ATTRIBUTE_VALUE";
    State[State["ATTRIBUTE_VALUE_DOUBLE_QUOTED"] = 35] = "ATTRIBUTE_VALUE_DOUBLE_QUOTED";
    State[State["ATTRIBUTE_VALUE_SINGLE_QUOTED"] = 36] = "ATTRIBUTE_VALUE_SINGLE_QUOTED";
    State[State["ATTRIBUTE_VALUE_UNQUOTED"] = 37] = "ATTRIBUTE_VALUE_UNQUOTED";
    State[State["AFTER_ATTRIBUTE_VALUE_QUOTED"] = 38] = "AFTER_ATTRIBUTE_VALUE_QUOTED";
    State[State["SELF_CLOSING_START_TAG"] = 39] = "SELF_CLOSING_START_TAG";
    State[State["BOGUS_COMMENT"] = 40] = "BOGUS_COMMENT";
    State[State["MARKUP_DECLARATION_OPEN"] = 41] = "MARKUP_DECLARATION_OPEN";
    State[State["COMMENT_START"] = 42] = "COMMENT_START";
    State[State["COMMENT_START_DASH"] = 43] = "COMMENT_START_DASH";
    State[State["COMMENT"] = 44] = "COMMENT";
    State[State["COMMENT_LESS_THAN_SIGN"] = 45] = "COMMENT_LESS_THAN_SIGN";
    State[State["COMMENT_LESS_THAN_SIGN_BANG"] = 46] = "COMMENT_LESS_THAN_SIGN_BANG";
    State[State["COMMENT_LESS_THAN_SIGN_BANG_DASH"] = 47] = "COMMENT_LESS_THAN_SIGN_BANG_DASH";
    State[State["COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH"] = 48] = "COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH";
    State[State["COMMENT_END_DASH"] = 49] = "COMMENT_END_DASH";
    State[State["COMMENT_END"] = 50] = "COMMENT_END";
    State[State["COMMENT_END_BANG"] = 51] = "COMMENT_END_BANG";
    State[State["DOCTYPE"] = 52] = "DOCTYPE";
    State[State["BEFORE_DOCTYPE_NAME"] = 53] = "BEFORE_DOCTYPE_NAME";
    State[State["DOCTYPE_NAME"] = 54] = "DOCTYPE_NAME";
    State[State["AFTER_DOCTYPE_NAME"] = 55] = "AFTER_DOCTYPE_NAME";
    State[State["AFTER_DOCTYPE_PUBLIC_KEYWORD"] = 56] = "AFTER_DOCTYPE_PUBLIC_KEYWORD";
    State[State["BEFORE_DOCTYPE_PUBLIC_IDENTIFIER"] = 57] = "BEFORE_DOCTYPE_PUBLIC_IDENTIFIER";
    State[State["DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED"] = 58] = "DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED";
    State[State["DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED"] = 59] = "DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED";
    State[State["AFTER_DOCTYPE_PUBLIC_IDENTIFIER"] = 60] = "AFTER_DOCTYPE_PUBLIC_IDENTIFIER";
    State[State["BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS"] = 61] = "BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS";
    State[State["AFTER_DOCTYPE_SYSTEM_KEYWORD"] = 62] = "AFTER_DOCTYPE_SYSTEM_KEYWORD";
    State[State["BEFORE_DOCTYPE_SYSTEM_IDENTIFIER"] = 63] = "BEFORE_DOCTYPE_SYSTEM_IDENTIFIER";
    State[State["DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED"] = 64] = "DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED";
    State[State["DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED"] = 65] = "DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED";
    State[State["AFTER_DOCTYPE_SYSTEM_IDENTIFIER"] = 66] = "AFTER_DOCTYPE_SYSTEM_IDENTIFIER";
    State[State["BOGUS_DOCTYPE"] = 67] = "BOGUS_DOCTYPE";
    State[State["CDATA_SECTION"] = 68] = "CDATA_SECTION";
    State[State["CDATA_SECTION_BRACKET"] = 69] = "CDATA_SECTION_BRACKET";
    State[State["CDATA_SECTION_END"] = 70] = "CDATA_SECTION_END";
    State[State["CHARACTER_REFERENCE"] = 71] = "CHARACTER_REFERENCE";
    State[State["NAMED_CHARACTER_REFERENCE"] = 72] = "NAMED_CHARACTER_REFERENCE";
    State[State["AMBIGUOUS_AMPERSAND"] = 73] = "AMBIGUOUS_AMPERSAND";
    State[State["NUMERIC_CHARACTER_REFERENCE"] = 74] = "NUMERIC_CHARACTER_REFERENCE";
    State[State["HEXADEMICAL_CHARACTER_REFERENCE_START"] = 75] = "HEXADEMICAL_CHARACTER_REFERENCE_START";
    State[State["HEXADEMICAL_CHARACTER_REFERENCE"] = 76] = "HEXADEMICAL_CHARACTER_REFERENCE";
    State[State["DECIMAL_CHARACTER_REFERENCE"] = 77] = "DECIMAL_CHARACTER_REFERENCE";
    State[State["NUMERIC_CHARACTER_REFERENCE_END"] = 78] = "NUMERIC_CHARACTER_REFERENCE_END";
})(State || (State = {}));
//Tokenizer initial states for different modes
exports.TokenizerMode = {
    DATA: State.DATA,
    RCDATA: State.RCDATA,
    RAWTEXT: State.RAWTEXT,
    SCRIPT_DATA: State.SCRIPT_DATA,
    PLAINTEXT: State.PLAINTEXT,
    CDATA_SECTION: State.CDATA_SECTION,
};
//Utils
//OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
//this functions if they will be situated in another module due to context switch.
//Always perform inlining check before modifying this functions ('node --trace-inlining').
function isAsciiDigit(cp) {
    return cp >= unicode_js_1.CODE_POINTS.DIGIT_0 && cp <= unicode_js_1.CODE_POINTS.DIGIT_9;
}
function isAsciiUpper(cp) {
    return cp >= unicode_js_1.CODE_POINTS.LATIN_CAPITAL_A && cp <= unicode_js_1.CODE_POINTS.LATIN_CAPITAL_Z;
}
function isAsciiLower(cp) {
    return cp >= unicode_js_1.CODE_POINTS.LATIN_SMALL_A && cp <= unicode_js_1.CODE_POINTS.LATIN_SMALL_Z;
}
function isAsciiLetter(cp) {
    return isAsciiLower(cp) || isAsciiUpper(cp);
}
function isAsciiAlphaNumeric(cp) {
    return isAsciiLetter(cp) || isAsciiDigit(cp);
}
function isAsciiUpperHexDigit(cp) {
    return cp >= unicode_js_1.CODE_POINTS.LATIN_CAPITAL_A && cp <= unicode_js_1.CODE_POINTS.LATIN_CAPITAL_F;
}
function isAsciiLowerHexDigit(cp) {
    return cp >= unicode_js_1.CODE_POINTS.LATIN_SMALL_A && cp <= unicode_js_1.CODE_POINTS.LATIN_SMALL_F;
}
function isAsciiHexDigit(cp) {
    return isAsciiDigit(cp) || isAsciiUpperHexDigit(cp) || isAsciiLowerHexDigit(cp);
}
function toAsciiLower(cp) {
    return cp + 32;
}
function isWhitespace(cp) {
    return cp === unicode_js_1.CODE_POINTS.SPACE || cp === unicode_js_1.CODE_POINTS.LINE_FEED || cp === unicode_js_1.CODE_POINTS.TABULATION || cp === unicode_js_1.CODE_POINTS.FORM_FEED;
}
function isEntityInAttributeInvalidEnd(nextCp) {
    return nextCp === unicode_js_1.CODE_POINTS.EQUALS_SIGN || isAsciiAlphaNumeric(nextCp);
}
function isScriptDataDoubleEscapeSequenceEnd(cp) {
    return isWhitespace(cp) || cp === unicode_js_1.CODE_POINTS.SOLIDUS || cp === unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN;
}
//Tokenizer
class Tokenizer {
    constructor(options, handler) {
        this.options = options;
        this.handler = handler;
        this.paused = false;
        /** Ensures that the parsing loop isn't run multiple times at once. */
        this.inLoop = false;
        /**
         * Indicates that the current adjusted node exists, is not an element in the HTML namespace,
         * and that it is not an integration point for either MathML or HTML.
         *
         * @see {@link https://html.spec.whatwg.org/multipage/parsing.html#tree-construction}
         */
        this.inForeignNode = false;
        this.lastStartTagName = '';
        this.active = false;
        this.state = State.DATA;
        this.returnState = State.DATA;
        this.charRefCode = -1;
        this.consumedAfterSnapshot = -1;
        this.currentCharacterToken = null;
        this.currentToken = null;
        this.currentAttr = { name: '', value: '' };
        this.preprocessor = new preprocessor_js_1.Preprocessor(handler);
        this.currentLocation = this.getCurrentLocation(-1);
    }
    //Errors
    _err(code) {
        var _a, _b;
        (_b = (_a = this.handler).onParseError) === null || _b === void 0 ? void 0 : _b.call(_a, this.preprocessor.getError(code));
    }
    // NOTE: `offset` may never run across line boundaries.
    getCurrentLocation(offset) {
        if (!this.options.sourceCodeLocationInfo) {
            return null;
        }
        return {
            startLine: this.preprocessor.line,
            startCol: this.preprocessor.col - offset,
            startOffset: this.preprocessor.offset - offset,
            endLine: -1,
            endCol: -1,
            endOffset: -1,
        };
    }
    _runParsingLoop() {
        if (this.inLoop)
            return;
        this.inLoop = true;
        while (this.active && !this.paused) {
            this.consumedAfterSnapshot = 0;
            const cp = this._consume();
            if (!this._ensureHibernation()) {
                this._callState(cp);
            }
        }
        this.inLoop = false;
    }
    //API
    pause() {
        this.paused = true;
    }
    resume(writeCallback) {
        if (!this.paused) {
            throw new Error('Parser was already resumed');
        }
        this.paused = false;
        // Necessary for synchronous resume.
        if (this.inLoop)
            return;
        this._runParsingLoop();
        if (!this.paused) {
            writeCallback === null || writeCallback === void 0 ? void 0 : writeCallback();
        }
    }
    write(chunk, isLastChunk, writeCallback) {
        this.active = true;
        this.preprocessor.write(chunk, isLastChunk);
        this._runParsingLoop();
        if (!this.paused) {
            writeCallback === null || writeCallback === void 0 ? void 0 : writeCallback();
        }
    }
    insertHtmlAtCurrentPos(chunk) {
        this.active = true;
        this.preprocessor.insertHtmlAtCurrentPos(chunk);
        this._runParsingLoop();
    }
    //Hibernation
    _ensureHibernation() {
        if (this.preprocessor.endOfChunkHit) {
            this._unconsume(this.consumedAfterSnapshot);
            this.active = false;
            return true;
        }
        return false;
    }
    //Consumption
    _consume() {
        this.consumedAfterSnapshot++;
        return this.preprocessor.advance();
    }
    _unconsume(count) {
        this.consumedAfterSnapshot -= count;
        this.preprocessor.retreat(count);
    }
    _reconsumeInState(state, cp) {
        this.state = state;
        this._callState(cp);
    }
    _advanceBy(count) {
        this.consumedAfterSnapshot += count;
        for (let i = 0; i < count; i++) {
            this.preprocessor.advance();
        }
    }
    _consumeSequenceIfMatch(pattern, caseSensitive) {
        if (this.preprocessor.startsWith(pattern, caseSensitive)) {
            // We will already have consumed one character before calling this method.
            this._advanceBy(pattern.length - 1);
            return true;
        }
        return false;
    }
    //Token creation
    _createStartTagToken() {
        this.currentToken = {
            type: token_js_1.TokenType.START_TAG,
            tagName: '',
            tagID: html_js_1.TAG_ID.UNKNOWN,
            selfClosing: false,
            ackSelfClosing: false,
            attrs: [],
            location: this.getCurrentLocation(1),
        };
    }
    _createEndTagToken() {
        this.currentToken = {
            type: token_js_1.TokenType.END_TAG,
            tagName: '',
            tagID: html_js_1.TAG_ID.UNKNOWN,
            selfClosing: false,
            ackSelfClosing: false,
            attrs: [],
            location: this.getCurrentLocation(2),
        };
    }
    _createCommentToken(offset) {
        this.currentToken = {
            type: token_js_1.TokenType.COMMENT,
            data: '',
            location: this.getCurrentLocation(offset),
        };
    }
    _createDoctypeToken(initialName) {
        this.currentToken = {
            type: token_js_1.TokenType.DOCTYPE,
            name: initialName,
            forceQuirks: false,
            publicId: null,
            systemId: null,
            location: this.currentLocation,
        };
    }
    _createCharacterToken(type, chars) {
        this.currentCharacterToken = {
            type,
            chars,
            location: this.currentLocation,
        };
    }
    //Tag attributes
    _createAttr(attrNameFirstCh) {
        this.currentAttr = {
            name: attrNameFirstCh,
            value: '',
        };
        this.currentLocation = this.getCurrentLocation(0);
    }
    _leaveAttrName() {
        var _a;
        var _b;
        const token = this.currentToken;
        if ((0, token_js_1.getTokenAttr)(token, this.currentAttr.name) === null) {
            token.attrs.push(this.currentAttr);
            if (token.location && this.currentLocation) {
                const attrLocations = ((_a = (_b = token.location).attrs) !== null && _a !== void 0 ? _a : (_b.attrs = Object.create(null)));
                attrLocations[this.currentAttr.name] = this.currentLocation;
                // Set end location
                this._leaveAttrValue();
            }
        }
        else {
            this._err(error_codes_js_1.ERR.duplicateAttribute);
        }
    }
    _leaveAttrValue() {
        if (this.currentLocation) {
            this.currentLocation.endLine = this.preprocessor.line;
            this.currentLocation.endCol = this.preprocessor.col;
            this.currentLocation.endOffset = this.preprocessor.offset;
        }
    }
    //Token emission
    prepareToken(ct) {
        this._emitCurrentCharacterToken(ct.location);
        this.currentToken = null;
        if (ct.location) {
            ct.location.endLine = this.preprocessor.line;
            ct.location.endCol = this.preprocessor.col + 1;
            ct.location.endOffset = this.preprocessor.offset + 1;
        }
        this.currentLocation = this.getCurrentLocation(-1);
    }
    emitCurrentTagToken() {
        const ct = this.currentToken;
        this.prepareToken(ct);
        ct.tagID = (0, html_js_1.getTagID)(ct.tagName);
        if (ct.type === token_js_1.TokenType.START_TAG) {
            this.lastStartTagName = ct.tagName;
            this.handler.onStartTag(ct);
        }
        else {
            if (ct.attrs.length > 0) {
                this._err(error_codes_js_1.ERR.endTagWithAttributes);
            }
            if (ct.selfClosing) {
                this._err(error_codes_js_1.ERR.endTagWithTrailingSolidus);
            }
            this.handler.onEndTag(ct);
        }
        this.preprocessor.dropParsedChunk();
    }
    emitCurrentComment(ct) {
        this.prepareToken(ct);
        this.handler.onComment(ct);
        this.preprocessor.dropParsedChunk();
    }
    emitCurrentDoctype(ct) {
        this.prepareToken(ct);
        this.handler.onDoctype(ct);
        this.preprocessor.dropParsedChunk();
    }
    _emitCurrentCharacterToken(nextLocation) {
        if (this.currentCharacterToken) {
            //NOTE: if we have a pending character token, make it's end location equal to the
            //current token's start location.
            if (nextLocation && this.currentCharacterToken.location) {
                this.currentCharacterToken.location.endLine = nextLocation.startLine;
                this.currentCharacterToken.location.endCol = nextLocation.startCol;
                this.currentCharacterToken.location.endOffset = nextLocation.startOffset;
            }
            switch (this.currentCharacterToken.type) {
                case token_js_1.TokenType.CHARACTER: {
                    this.handler.onCharacter(this.currentCharacterToken);
                    break;
                }
                case token_js_1.TokenType.NULL_CHARACTER: {
                    this.handler.onNullCharacter(this.currentCharacterToken);
                    break;
                }
                case token_js_1.TokenType.WHITESPACE_CHARACTER: {
                    this.handler.onWhitespaceCharacter(this.currentCharacterToken);
                    break;
                }
            }
            this.currentCharacterToken = null;
        }
    }
    _emitEOFToken() {
        const location = this.getCurrentLocation(0);
        if (location) {
            location.endLine = location.startLine;
            location.endCol = location.startCol;
            location.endOffset = location.startOffset;
        }
        this._emitCurrentCharacterToken(location);
        this.handler.onEof({ type: token_js_1.TokenType.EOF, location });
        this.active = false;
    }
    //Characters emission
    //OPTIMIZATION: specification uses only one type of character tokens (one token per character).
    //This causes a huge memory overhead and a lot of unnecessary parser loops. parse5 uses 3 groups of characters.
    //If we have a sequence of characters that belong to the same group, the parser can process it
    //as a single solid character token.
    //So, there are 3 types of character tokens in parse5:
    //1)TokenType.NULL_CHARACTER - \u0000-character sequences (e.g. '\u0000\u0000\u0000')
    //2)TokenType.WHITESPACE_CHARACTER - any whitespace/new-line character sequences (e.g. '\n  \r\t   \f')
    //3)TokenType.CHARACTER - any character sequence which don't belong to groups 1 and 2 (e.g. 'abcdef1234@@#$%^')
    _appendCharToCurrentCharacterToken(type, ch) {
        if (this.currentCharacterToken) {
            if (this.currentCharacterToken.type !== type) {
                this.currentLocation = this.getCurrentLocation(0);
                this._emitCurrentCharacterToken(this.currentLocation);
                this.preprocessor.dropParsedChunk();
            }
            else {
                this.currentCharacterToken.chars += ch;
                return;
            }
        }
        this._createCharacterToken(type, ch);
    }
    _emitCodePoint(cp) {
        const type = isWhitespace(cp)
            ? token_js_1.TokenType.WHITESPACE_CHARACTER
            : cp === unicode_js_1.CODE_POINTS.NULL
                ? token_js_1.TokenType.NULL_CHARACTER
                : token_js_1.TokenType.CHARACTER;
        this._appendCharToCurrentCharacterToken(type, String.fromCodePoint(cp));
    }
    //NOTE: used when we emit characters explicitly.
    //This is always for non-whitespace and non-null characters, which allows us to avoid additional checks.
    _emitChars(ch) {
        this._appendCharToCurrentCharacterToken(token_js_1.TokenType.CHARACTER, ch);
    }
    // Character reference helpers
    _matchNamedCharacterReference(cp) {
        let result = null;
        let excess = 0;
        let withoutSemicolon = false;
        for (let i = 0, current = decode_js_1.htmlDecodeTree[0]; i >= 0; cp = this._consume()) {
            i = (0, decode_js_1.determineBranch)(decode_js_1.htmlDecodeTree, current, i + 1, cp);
            if (i < 0)
                break;
            excess += 1;
            current = decode_js_1.htmlDecodeTree[i];
            const masked = current & decode_js_1.BinTrieFlags.VALUE_LENGTH;
            // If the branch is a value, store it and continue
            if (masked) {
                // The mask is the number of bytes of the value, including the current byte.
                const valueLength = (masked >> 14) - 1;
                // Attribute values that aren't terminated properly aren't parsed, and shouldn't lead to a parser error.
                // See the example in https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
                if (cp !== unicode_js_1.CODE_POINTS.SEMICOLON &&
                    this._isCharacterReferenceInAttribute() &&
                    isEntityInAttributeInvalidEnd(this.preprocessor.peek(1))) {
                    //NOTE: we don't flush all consumed code points here, and instead switch back to the original state after
                    //emitting an ampersand. This is fine, as alphanumeric characters won't be parsed differently in attributes.
                    result = [unicode_js_1.CODE_POINTS.AMPERSAND];
                    // Skip over the value.
                    i += valueLength;
                }
                else {
                    // If this is a surrogate pair, consume the next two bytes.
                    result =
                        valueLength === 0
                            ? [decode_js_1.htmlDecodeTree[i] & ~decode_js_1.BinTrieFlags.VALUE_LENGTH]
                            : valueLength === 1
                                ? [decode_js_1.htmlDecodeTree[++i]]
                                : [decode_js_1.htmlDecodeTree[++i], decode_js_1.htmlDecodeTree[++i]];
                    excess = 0;
                    withoutSemicolon = cp !== unicode_js_1.CODE_POINTS.SEMICOLON;
                }
                if (valueLength === 0) {
                    // If the value is zero-length, we're done.
                    this._consume();
                    break;
                }
            }
        }
        this._unconsume(excess);
        if (withoutSemicolon && !this.preprocessor.endOfChunkHit) {
            this._err(error_codes_js_1.ERR.missingSemicolonAfterCharacterReference);
        }
        // We want to emit the error above on the code point after the entity.
        // We always consume one code point too many in the loop, and we wait to
        // unconsume it until after the error is emitted.
        this._unconsume(1);
        return result;
    }
    _isCharacterReferenceInAttribute() {
        return (this.returnState === State.ATTRIBUTE_VALUE_DOUBLE_QUOTED ||
            this.returnState === State.ATTRIBUTE_VALUE_SINGLE_QUOTED ||
            this.returnState === State.ATTRIBUTE_VALUE_UNQUOTED);
    }
    _flushCodePointConsumedAsCharacterReference(cp) {
        if (this._isCharacterReferenceInAttribute()) {
            this.currentAttr.value += String.fromCodePoint(cp);
        }
        else {
            this._emitCodePoint(cp);
        }
    }
    // Calling states this way turns out to be much faster than any other approach.
    _callState(cp) {
        switch (this.state) {
            case State.DATA: {
                this._stateData(cp);
                break;
            }
            case State.RCDATA: {
                this._stateRcdata(cp);
                break;
            }
            case State.RAWTEXT: {
                this._stateRawtext(cp);
                break;
            }
            case State.SCRIPT_DATA: {
                this._stateScriptData(cp);
                break;
            }
            case State.PLAINTEXT: {
                this._statePlaintext(cp);
                break;
            }
            case State.TAG_OPEN: {
                this._stateTagOpen(cp);
                break;
            }
            case State.END_TAG_OPEN: {
                this._stateEndTagOpen(cp);
                break;
            }
            case State.TAG_NAME: {
                this._stateTagName(cp);
                break;
            }
            case State.RCDATA_LESS_THAN_SIGN: {
                this._stateRcdataLessThanSign(cp);
                break;
            }
            case State.RCDATA_END_TAG_OPEN: {
                this._stateRcdataEndTagOpen(cp);
                break;
            }
            case State.RCDATA_END_TAG_NAME: {
                this._stateRcdataEndTagName(cp);
                break;
            }
            case State.RAWTEXT_LESS_THAN_SIGN: {
                this._stateRawtextLessThanSign(cp);
                break;
            }
            case State.RAWTEXT_END_TAG_OPEN: {
                this._stateRawtextEndTagOpen(cp);
                break;
            }
            case State.RAWTEXT_END_TAG_NAME: {
                this._stateRawtextEndTagName(cp);
                break;
            }
            case State.SCRIPT_DATA_LESS_THAN_SIGN: {
                this._stateScriptDataLessThanSign(cp);
                break;
            }
            case State.SCRIPT_DATA_END_TAG_OPEN: {
                this._stateScriptDataEndTagOpen(cp);
                break;
            }
            case State.SCRIPT_DATA_END_TAG_NAME: {
                this._stateScriptDataEndTagName(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPE_START: {
                this._stateScriptDataEscapeStart(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPE_START_DASH: {
                this._stateScriptDataEscapeStartDash(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED: {
                this._stateScriptDataEscaped(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_DASH: {
                this._stateScriptDataEscapedDash(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_DASH_DASH: {
                this._stateScriptDataEscapedDashDash(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN: {
                this._stateScriptDataEscapedLessThanSign(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN: {
                this._stateScriptDataEscapedEndTagOpen(cp);
                break;
            }
            case State.SCRIPT_DATA_ESCAPED_END_TAG_NAME: {
                this._stateScriptDataEscapedEndTagName(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPE_START: {
                this._stateScriptDataDoubleEscapeStart(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPED: {
                this._stateScriptDataDoubleEscaped(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH: {
                this._stateScriptDataDoubleEscapedDash(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH: {
                this._stateScriptDataDoubleEscapedDashDash(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN: {
                this._stateScriptDataDoubleEscapedLessThanSign(cp);
                break;
            }
            case State.SCRIPT_DATA_DOUBLE_ESCAPE_END: {
                this._stateScriptDataDoubleEscapeEnd(cp);
                break;
            }
            case State.BEFORE_ATTRIBUTE_NAME: {
                this._stateBeforeAttributeName(cp);
                break;
            }
            case State.ATTRIBUTE_NAME: {
                this._stateAttributeName(cp);
                break;
            }
            case State.AFTER_ATTRIBUTE_NAME: {
                this._stateAfterAttributeName(cp);
                break;
            }
            case State.BEFORE_ATTRIBUTE_VALUE: {
                this._stateBeforeAttributeValue(cp);
                break;
            }
            case State.ATTRIBUTE_VALUE_DOUBLE_QUOTED: {
                this._stateAttributeValueDoubleQuoted(cp);
                break;
            }
            case State.ATTRIBUTE_VALUE_SINGLE_QUOTED: {
                this._stateAttributeValueSingleQuoted(cp);
                break;
            }
            case State.ATTRIBUTE_VALUE_UNQUOTED: {
                this._stateAttributeValueUnquoted(cp);
                break;
            }
            case State.AFTER_ATTRIBUTE_VALUE_QUOTED: {
                this._stateAfterAttributeValueQuoted(cp);
                break;
            }
            case State.SELF_CLOSING_START_TAG: {
                this._stateSelfClosingStartTag(cp);
                break;
            }
            case State.BOGUS_COMMENT: {
                this._stateBogusComment(cp);
                break;
            }
            case State.MARKUP_DECLARATION_OPEN: {
                this._stateMarkupDeclarationOpen(cp);
                break;
            }
            case State.COMMENT_START: {
                this._stateCommentStart(cp);
                break;
            }
            case State.COMMENT_START_DASH: {
                this._stateCommentStartDash(cp);
                break;
            }
            case State.COMMENT: {
                this._stateComment(cp);
                break;
            }
            case State.COMMENT_LESS_THAN_SIGN: {
                this._stateCommentLessThanSign(cp);
                break;
            }
            case State.COMMENT_LESS_THAN_SIGN_BANG: {
                this._stateCommentLessThanSignBang(cp);
                break;
            }
            case State.COMMENT_LESS_THAN_SIGN_BANG_DASH: {
                this._stateCommentLessThanSignBangDash(cp);
                break;
            }
            case State.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH: {
                this._stateCommentLessThanSignBangDashDash(cp);
                break;
            }
            case State.COMMENT_END_DASH: {
                this._stateCommentEndDash(cp);
                break;
            }
            case State.COMMENT_END: {
                this._stateCommentEnd(cp);
                break;
            }
            case State.COMMENT_END_BANG: {
                this._stateCommentEndBang(cp);
                break;
            }
            case State.DOCTYPE: {
                this._stateDoctype(cp);
                break;
            }
            case State.BEFORE_DOCTYPE_NAME: {
                this._stateBeforeDoctypeName(cp);
                break;
            }
            case State.DOCTYPE_NAME: {
                this._stateDoctypeName(cp);
                break;
            }
            case State.AFTER_DOCTYPE_NAME: {
                this._stateAfterDoctypeName(cp);
                break;
            }
            case State.AFTER_DOCTYPE_PUBLIC_KEYWORD: {
                this._stateAfterDoctypePublicKeyword(cp);
                break;
            }
            case State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER: {
                this._stateBeforeDoctypePublicIdentifier(cp);
                break;
            }
            case State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED: {
                this._stateDoctypePublicIdentifierDoubleQuoted(cp);
                break;
            }
            case State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED: {
                this._stateDoctypePublicIdentifierSingleQuoted(cp);
                break;
            }
            case State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER: {
                this._stateAfterDoctypePublicIdentifier(cp);
                break;
            }
            case State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS: {
                this._stateBetweenDoctypePublicAndSystemIdentifiers(cp);
                break;
            }
            case State.AFTER_DOCTYPE_SYSTEM_KEYWORD: {
                this._stateAfterDoctypeSystemKeyword(cp);
                break;
            }
            case State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER: {
                this._stateBeforeDoctypeSystemIdentifier(cp);
                break;
            }
            case State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED: {
                this._stateDoctypeSystemIdentifierDoubleQuoted(cp);
                break;
            }
            case State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED: {
                this._stateDoctypeSystemIdentifierSingleQuoted(cp);
                break;
            }
            case State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER: {
                this._stateAfterDoctypeSystemIdentifier(cp);
                break;
            }
            case State.BOGUS_DOCTYPE: {
                this._stateBogusDoctype(cp);
                break;
            }
            case State.CDATA_SECTION: {
                this._stateCdataSection(cp);
                break;
            }
            case State.CDATA_SECTION_BRACKET: {
                this._stateCdataSectionBracket(cp);
                break;
            }
            case State.CDATA_SECTION_END: {
                this._stateCdataSectionEnd(cp);
                break;
            }
            case State.CHARACTER_REFERENCE: {
                this._stateCharacterReference(cp);
                break;
            }
            case State.NAMED_CHARACTER_REFERENCE: {
                this._stateNamedCharacterReference(cp);
                break;
            }
            case State.AMBIGUOUS_AMPERSAND: {
                this._stateAmbiguousAmpersand(cp);
                break;
            }
            case State.NUMERIC_CHARACTER_REFERENCE: {
                this._stateNumericCharacterReference(cp);
                break;
            }
            case State.HEXADEMICAL_CHARACTER_REFERENCE_START: {
                this._stateHexademicalCharacterReferenceStart(cp);
                break;
            }
            case State.HEXADEMICAL_CHARACTER_REFERENCE: {
                this._stateHexademicalCharacterReference(cp);
                break;
            }
            case State.DECIMAL_CHARACTER_REFERENCE: {
                this._stateDecimalCharacterReference(cp);
                break;
            }
            case State.NUMERIC_CHARACTER_REFERENCE_END: {
                this._stateNumericCharacterReferenceEnd(cp);
                break;
            }
            default: {
                throw new Error('Unknown state');
            }
        }
    }
    // State machine
    // Data state
    //------------------------------------------------------------------
    _stateData(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.TAG_OPEN;
                break;
            }
            case unicode_js_1.CODE_POINTS.AMPERSAND: {
                this.returnState = State.DATA;
                this.state = State.CHARACTER_REFERENCE;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this._emitCodePoint(cp);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    //  RCDATA state
    //------------------------------------------------------------------
    _stateRcdata(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.AMPERSAND: {
                this.returnState = State.RCDATA;
                this.state = State.CHARACTER_REFERENCE;
                break;
            }
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.RCDATA_LESS_THAN_SIGN;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this._emitChars(unicode_js_1.REPLACEMENT_CHARACTER);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // RAWTEXT state
    //------------------------------------------------------------------
    _stateRawtext(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.RAWTEXT_LESS_THAN_SIGN;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this._emitChars(unicode_js_1.REPLACEMENT_CHARACTER);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data state
    //------------------------------------------------------------------
    _stateScriptData(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_LESS_THAN_SIGN;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this._emitChars(unicode_js_1.REPLACEMENT_CHARACTER);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // PLAINTEXT state
    //------------------------------------------------------------------
    _statePlaintext(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this._emitChars(unicode_js_1.REPLACEMENT_CHARACTER);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // Tag open state
    //------------------------------------------------------------------
    _stateTagOpen(cp) {
        if (isAsciiLetter(cp)) {
            this._createStartTagToken();
            this.state = State.TAG_NAME;
            this._stateTagName(cp);
        }
        else
            switch (cp) {
                case unicode_js_1.CODE_POINTS.EXCLAMATION_MARK: {
                    this.state = State.MARKUP_DECLARATION_OPEN;
                    break;
                }
                case unicode_js_1.CODE_POINTS.SOLIDUS: {
                    this.state = State.END_TAG_OPEN;
                    break;
                }
                case unicode_js_1.CODE_POINTS.QUESTION_MARK: {
                    this._err(error_codes_js_1.ERR.unexpectedQuestionMarkInsteadOfTagName);
                    this._createCommentToken(1);
                    this.state = State.BOGUS_COMMENT;
                    this._stateBogusComment(cp);
                    break;
                }
                case unicode_js_1.CODE_POINTS.EOF: {
                    this._err(error_codes_js_1.ERR.eofBeforeTagName);
                    this._emitChars('<');
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(error_codes_js_1.ERR.invalidFirstCharacterOfTagName);
                    this._emitChars('<');
                    this.state = State.DATA;
                    this._stateData(cp);
                }
            }
    }
    // End tag open state
    //------------------------------------------------------------------
    _stateEndTagOpen(cp) {
        if (isAsciiLetter(cp)) {
            this._createEndTagToken();
            this.state = State.TAG_NAME;
            this._stateTagName(cp);
        }
        else
            switch (cp) {
                case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(error_codes_js_1.ERR.missingEndTagName);
                    this.state = State.DATA;
                    break;
                }
                case unicode_js_1.CODE_POINTS.EOF: {
                    this._err(error_codes_js_1.ERR.eofBeforeTagName);
                    this._emitChars('</');
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(error_codes_js_1.ERR.invalidFirstCharacterOfTagName);
                    this._createCommentToken(2);
                    this.state = State.BOGUS_COMMENT;
                    this._stateBogusComment(cp);
                }
            }
    }
    // Tag name state
    //------------------------------------------------------------------
    _stateTagName(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                break;
            }
            case unicode_js_1.CODE_POINTS.SOLIDUS: {
                this.state = State.SELF_CLOSING_START_TAG;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                token.tagName += unicode_js_1.REPLACEMENT_CHARACTER;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                token.tagName += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
            }
        }
    }
    // RCDATA less-than sign state
    //------------------------------------------------------------------
    _stateRcdataLessThanSign(cp) {
        if (cp === unicode_js_1.CODE_POINTS.SOLIDUS) {
            this.state = State.RCDATA_END_TAG_OPEN;
        }
        else {
            this._emitChars('<');
            this.state = State.RCDATA;
            this._stateRcdata(cp);
        }
    }
    // RCDATA end tag open state
    //------------------------------------------------------------------
    _stateRcdataEndTagOpen(cp) {
        if (isAsciiLetter(cp)) {
            this.state = State.RCDATA_END_TAG_NAME;
            this._stateRcdataEndTagName(cp);
        }
        else {
            this._emitChars('</');
            this.state = State.RCDATA;
            this._stateRcdata(cp);
        }
    }
    handleSpecialEndTag(_cp) {
        if (!this.preprocessor.startsWith(this.lastStartTagName, false)) {
            return !this._ensureHibernation();
        }
        this._createEndTagToken();
        const token = this.currentToken;
        token.tagName = this.lastStartTagName;
        const cp = this.preprocessor.peek(this.lastStartTagName.length);
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                this._advanceBy(this.lastStartTagName.length);
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                return false;
            }
            case unicode_js_1.CODE_POINTS.SOLIDUS: {
                this._advanceBy(this.lastStartTagName.length);
                this.state = State.SELF_CLOSING_START_TAG;
                return false;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._advanceBy(this.lastStartTagName.length);
                this.emitCurrentTagToken();
                this.state = State.DATA;
                return false;
            }
            default: {
                return !this._ensureHibernation();
            }
        }
    }
    // RCDATA end tag name state
    //------------------------------------------------------------------
    _stateRcdataEndTagName(cp) {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.RCDATA;
            this._stateRcdata(cp);
        }
    }
    // RAWTEXT less-than sign state
    //------------------------------------------------------------------
    _stateRawtextLessThanSign(cp) {
        if (cp === unicode_js_1.CODE_POINTS.SOLIDUS) {
            this.state = State.RAWTEXT_END_TAG_OPEN;
        }
        else {
            this._emitChars('<');
            this.state = State.RAWTEXT;
            this._stateRawtext(cp);
        }
    }
    // RAWTEXT end tag open state
    //------------------------------------------------------------------
    _stateRawtextEndTagOpen(cp) {
        if (isAsciiLetter(cp)) {
            this.state = State.RAWTEXT_END_TAG_NAME;
            this._stateRawtextEndTagName(cp);
        }
        else {
            this._emitChars('</');
            this.state = State.RAWTEXT;
            this._stateRawtext(cp);
        }
    }
    // RAWTEXT end tag name state
    //------------------------------------------------------------------
    _stateRawtextEndTagName(cp) {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.RAWTEXT;
            this._stateRawtext(cp);
        }
    }
    // Script data less-than sign state
    //------------------------------------------------------------------
    _stateScriptDataLessThanSign(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SOLIDUS: {
                this.state = State.SCRIPT_DATA_END_TAG_OPEN;
                break;
            }
            case unicode_js_1.CODE_POINTS.EXCLAMATION_MARK: {
                this.state = State.SCRIPT_DATA_ESCAPE_START;
                this._emitChars('<!');
                break;
            }
            default: {
                this._emitChars('<');
                this.state = State.SCRIPT_DATA;
                this._stateScriptData(cp);
            }
        }
    }
    // Script data end tag open state
    //------------------------------------------------------------------
    _stateScriptDataEndTagOpen(cp) {
        if (isAsciiLetter(cp)) {
            this.state = State.SCRIPT_DATA_END_TAG_NAME;
            this._stateScriptDataEndTagName(cp);
        }
        else {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA;
            this._stateScriptData(cp);
        }
    }
    // Script data end tag name state
    //------------------------------------------------------------------
    _stateScriptDataEndTagName(cp) {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA;
            this._stateScriptData(cp);
        }
    }
    // Script data escape start state
    //------------------------------------------------------------------
    _stateScriptDataEscapeStart(cp) {
        if (cp === unicode_js_1.CODE_POINTS.HYPHEN_MINUS) {
            this.state = State.SCRIPT_DATA_ESCAPE_START_DASH;
            this._emitChars('-');
        }
        else {
            this.state = State.SCRIPT_DATA;
            this._stateScriptData(cp);
        }
    }
    // Script data escape start dash state
    //------------------------------------------------------------------
    _stateScriptDataEscapeStartDash(cp) {
        if (cp === unicode_js_1.CODE_POINTS.HYPHEN_MINUS) {
            this.state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
            this._emitChars('-');
        }
        else {
            this.state = State.SCRIPT_DATA;
            this._stateScriptData(cp);
        }
    }
    // Script data escaped state
    //------------------------------------------------------------------
    _stateScriptDataEscaped(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.SCRIPT_DATA_ESCAPED_DASH;
                this._emitChars('-');
                break;
            }
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this._emitChars(unicode_js_1.REPLACEMENT_CHARACTER);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data escaped dash state
    //------------------------------------------------------------------
    _stateScriptDataEscapedDash(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
                this._emitChars('-');
                break;
            }
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._emitChars(unicode_js_1.REPLACEMENT_CHARACTER);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data escaped dash dash state
    //------------------------------------------------------------------
    _stateScriptDataEscapedDashDash(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.HYPHEN_MINUS: {
                this._emitChars('-');
                break;
            }
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.SCRIPT_DATA;
                this._emitChars('>');
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._emitChars(unicode_js_1.REPLACEMENT_CHARACTER);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data escaped less-than sign state
    //------------------------------------------------------------------
    _stateScriptDataEscapedLessThanSign(cp) {
        if (cp === unicode_js_1.CODE_POINTS.SOLIDUS) {
            this.state = State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN;
        }
        else if (isAsciiLetter(cp)) {
            this._emitChars('<');
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPE_START;
            this._stateScriptDataDoubleEscapeStart(cp);
        }
        else {
            this._emitChars('<');
            this.state = State.SCRIPT_DATA_ESCAPED;
            this._stateScriptDataEscaped(cp);
        }
    }
    // Script data escaped end tag open state
    //------------------------------------------------------------------
    _stateScriptDataEscapedEndTagOpen(cp) {
        if (isAsciiLetter(cp)) {
            this.state = State.SCRIPT_DATA_ESCAPED_END_TAG_NAME;
            this._stateScriptDataEscapedEndTagName(cp);
        }
        else {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA_ESCAPED;
            this._stateScriptDataEscaped(cp);
        }
    }
    // Script data escaped end tag name state
    //------------------------------------------------------------------
    _stateScriptDataEscapedEndTagName(cp) {
        if (this.handleSpecialEndTag(cp)) {
            this._emitChars('</');
            this.state = State.SCRIPT_DATA_ESCAPED;
            this._stateScriptDataEscaped(cp);
        }
    }
    // Script data double escape start state
    //------------------------------------------------------------------
    _stateScriptDataDoubleEscapeStart(cp) {
        if (this.preprocessor.startsWith(unicode_js_1.SEQUENCES.SCRIPT, false) &&
            isScriptDataDoubleEscapeSequenceEnd(this.preprocessor.peek(unicode_js_1.SEQUENCES.SCRIPT.length))) {
            this._emitCodePoint(cp);
            for (let i = 0; i < unicode_js_1.SEQUENCES.SCRIPT.length; i++) {
                this._emitCodePoint(this._consume());
            }
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
        }
        else if (!this._ensureHibernation()) {
            this.state = State.SCRIPT_DATA_ESCAPED;
            this._stateScriptDataEscaped(cp);
        }
    }
    // Script data double escaped state
    //------------------------------------------------------------------
    _stateScriptDataDoubleEscaped(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH;
                this._emitChars('-');
                break;
            }
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
                this._emitChars('<');
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this._emitChars(unicode_js_1.REPLACEMENT_CHARACTER);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data double escaped dash state
    //------------------------------------------------------------------
    _stateScriptDataDoubleEscapedDash(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH;
                this._emitChars('-');
                break;
            }
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
                this._emitChars('<');
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._emitChars(unicode_js_1.REPLACEMENT_CHARACTER);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data double escaped dash dash state
    //------------------------------------------------------------------
    _stateScriptDataDoubleEscapedDashDash(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.HYPHEN_MINUS: {
                this._emitChars('-');
                break;
            }
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
                this._emitChars('<');
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.SCRIPT_DATA;
                this._emitChars('>');
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._emitChars(unicode_js_1.REPLACEMENT_CHARACTER);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInScriptHtmlCommentLikeText);
                this._emitEOFToken();
                break;
            }
            default: {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._emitCodePoint(cp);
            }
        }
    }
    // Script data double escaped less-than sign state
    //------------------------------------------------------------------
    _stateScriptDataDoubleEscapedLessThanSign(cp) {
        if (cp === unicode_js_1.CODE_POINTS.SOLIDUS) {
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPE_END;
            this._emitChars('/');
        }
        else {
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
            this._stateScriptDataDoubleEscaped(cp);
        }
    }
    // Script data double escape end state
    //------------------------------------------------------------------
    _stateScriptDataDoubleEscapeEnd(cp) {
        if (this.preprocessor.startsWith(unicode_js_1.SEQUENCES.SCRIPT, false) &&
            isScriptDataDoubleEscapeSequenceEnd(this.preprocessor.peek(unicode_js_1.SEQUENCES.SCRIPT.length))) {
            this._emitCodePoint(cp);
            for (let i = 0; i < unicode_js_1.SEQUENCES.SCRIPT.length; i++) {
                this._emitCodePoint(this._consume());
            }
            this.state = State.SCRIPT_DATA_ESCAPED;
        }
        else if (!this._ensureHibernation()) {
            this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
            this._stateScriptDataDoubleEscaped(cp);
        }
    }
    // Before attribute name state
    //------------------------------------------------------------------
    _stateBeforeAttributeName(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case unicode_js_1.CODE_POINTS.SOLIDUS:
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN:
            case unicode_js_1.CODE_POINTS.EOF: {
                this.state = State.AFTER_ATTRIBUTE_NAME;
                this._stateAfterAttributeName(cp);
                break;
            }
            case unicode_js_1.CODE_POINTS.EQUALS_SIGN: {
                this._err(error_codes_js_1.ERR.unexpectedEqualsSignBeforeAttributeName);
                this._createAttr('=');
                this.state = State.ATTRIBUTE_NAME;
                break;
            }
            default: {
                this._createAttr('');
                this.state = State.ATTRIBUTE_NAME;
                this._stateAttributeName(cp);
            }
        }
    }
    // Attribute name state
    //------------------------------------------------------------------
    _stateAttributeName(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED:
            case unicode_js_1.CODE_POINTS.SOLIDUS:
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN:
            case unicode_js_1.CODE_POINTS.EOF: {
                this._leaveAttrName();
                this.state = State.AFTER_ATTRIBUTE_NAME;
                this._stateAfterAttributeName(cp);
                break;
            }
            case unicode_js_1.CODE_POINTS.EQUALS_SIGN: {
                this._leaveAttrName();
                this.state = State.BEFORE_ATTRIBUTE_VALUE;
                break;
            }
            case unicode_js_1.CODE_POINTS.QUOTATION_MARK:
            case unicode_js_1.CODE_POINTS.APOSTROPHE:
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN: {
                this._err(error_codes_js_1.ERR.unexpectedCharacterInAttributeName);
                this.currentAttr.name += String.fromCodePoint(cp);
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this.currentAttr.name += unicode_js_1.REPLACEMENT_CHARACTER;
                break;
            }
            default: {
                this.currentAttr.name += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
            }
        }
    }
    // After attribute name state
    //------------------------------------------------------------------
    _stateAfterAttributeName(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case unicode_js_1.CODE_POINTS.SOLIDUS: {
                this.state = State.SELF_CLOSING_START_TAG;
                break;
            }
            case unicode_js_1.CODE_POINTS.EQUALS_SIGN: {
                this.state = State.BEFORE_ATTRIBUTE_VALUE;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this._createAttr('');
                this.state = State.ATTRIBUTE_NAME;
                this._stateAttributeName(cp);
            }
        }
    }
    // Before attribute value state
    //------------------------------------------------------------------
    _stateBeforeAttributeValue(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case unicode_js_1.CODE_POINTS.QUOTATION_MARK: {
                this.state = State.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.APOSTROPHE: {
                this.state = State.ATTRIBUTE_VALUE_SINGLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(error_codes_js_1.ERR.missingAttributeValue);
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            default: {
                this.state = State.ATTRIBUTE_VALUE_UNQUOTED;
                this._stateAttributeValueUnquoted(cp);
            }
        }
    }
    // Attribute value (double-quoted) state
    //------------------------------------------------------------------
    _stateAttributeValueDoubleQuoted(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.QUOTATION_MARK: {
                this.state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.AMPERSAND: {
                this.returnState = State.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
                this.state = State.CHARACTER_REFERENCE;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this.currentAttr.value += unicode_js_1.REPLACEMENT_CHARACTER;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this.currentAttr.value += String.fromCodePoint(cp);
            }
        }
    }
    // Attribute value (single-quoted) state
    //------------------------------------------------------------------
    _stateAttributeValueSingleQuoted(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.APOSTROPHE: {
                this.state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.AMPERSAND: {
                this.returnState = State.ATTRIBUTE_VALUE_SINGLE_QUOTED;
                this.state = State.CHARACTER_REFERENCE;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this.currentAttr.value += unicode_js_1.REPLACEMENT_CHARACTER;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this.currentAttr.value += String.fromCodePoint(cp);
            }
        }
    }
    // Attribute value (unquoted) state
    //------------------------------------------------------------------
    _stateAttributeValueUnquoted(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                this._leaveAttrValue();
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                break;
            }
            case unicode_js_1.CODE_POINTS.AMPERSAND: {
                this.returnState = State.ATTRIBUTE_VALUE_UNQUOTED;
                this.state = State.CHARACTER_REFERENCE;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._leaveAttrValue();
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                this.currentAttr.value += unicode_js_1.REPLACEMENT_CHARACTER;
                break;
            }
            case unicode_js_1.CODE_POINTS.QUOTATION_MARK:
            case unicode_js_1.CODE_POINTS.APOSTROPHE:
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN:
            case unicode_js_1.CODE_POINTS.EQUALS_SIGN:
            case unicode_js_1.CODE_POINTS.GRAVE_ACCENT: {
                this._err(error_codes_js_1.ERR.unexpectedCharacterInUnquotedAttributeValue);
                this.currentAttr.value += String.fromCodePoint(cp);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this.currentAttr.value += String.fromCodePoint(cp);
            }
        }
    }
    // After attribute value (quoted) state
    //------------------------------------------------------------------
    _stateAfterAttributeValueQuoted(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                this._leaveAttrValue();
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                break;
            }
            case unicode_js_1.CODE_POINTS.SOLIDUS: {
                this._leaveAttrValue();
                this.state = State.SELF_CLOSING_START_TAG;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._leaveAttrValue();
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(error_codes_js_1.ERR.missingWhitespaceBetweenAttributes);
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                this._stateBeforeAttributeName(cp);
            }
        }
    }
    // Self-closing start tag state
    //------------------------------------------------------------------
    _stateSelfClosingStartTag(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                const token = this.currentToken;
                token.selfClosing = true;
                this.state = State.DATA;
                this.emitCurrentTagToken();
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInTag);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(error_codes_js_1.ERR.unexpectedSolidusInTag);
                this.state = State.BEFORE_ATTRIBUTE_NAME;
                this._stateBeforeAttributeName(cp);
            }
        }
    }
    // Bogus comment state
    //------------------------------------------------------------------
    _stateBogusComment(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentComment(token);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                token.data += unicode_js_1.REPLACEMENT_CHARACTER;
                break;
            }
            default: {
                token.data += String.fromCodePoint(cp);
            }
        }
    }
    // Markup declaration open state
    //------------------------------------------------------------------
    _stateMarkupDeclarationOpen(cp) {
        if (this._consumeSequenceIfMatch(unicode_js_1.SEQUENCES.DASH_DASH, true)) {
            this._createCommentToken(unicode_js_1.SEQUENCES.DASH_DASH.length + 1);
            this.state = State.COMMENT_START;
        }
        else if (this._consumeSequenceIfMatch(unicode_js_1.SEQUENCES.DOCTYPE, false)) {
            // NOTE: Doctypes tokens are created without fixed offsets. We keep track of the moment a doctype *might* start here.
            this.currentLocation = this.getCurrentLocation(unicode_js_1.SEQUENCES.DOCTYPE.length + 1);
            this.state = State.DOCTYPE;
        }
        else if (this._consumeSequenceIfMatch(unicode_js_1.SEQUENCES.CDATA_START, true)) {
            if (this.inForeignNode) {
                this.state = State.CDATA_SECTION;
            }
            else {
                this._err(error_codes_js_1.ERR.cdataInHtmlContent);
                this._createCommentToken(unicode_js_1.SEQUENCES.CDATA_START.length + 1);
                this.currentToken.data = '[CDATA[';
                this.state = State.BOGUS_COMMENT;
            }
        }
        //NOTE: Sequence lookups can be abrupted by hibernation. In that case, lookup
        //results are no longer valid and we will need to start over.
        else if (!this._ensureHibernation()) {
            this._err(error_codes_js_1.ERR.incorrectlyOpenedComment);
            this._createCommentToken(2);
            this.state = State.BOGUS_COMMENT;
            this._stateBogusComment(cp);
        }
    }
    // Comment start state
    //------------------------------------------------------------------
    _stateCommentStart(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.COMMENT_START_DASH;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(error_codes_js_1.ERR.abruptClosingOfEmptyComment);
                this.state = State.DATA;
                const token = this.currentToken;
                this.emitCurrentComment(token);
                break;
            }
            default: {
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }
    // Comment start dash state
    //------------------------------------------------------------------
    _stateCommentStartDash(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.COMMENT_END;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(error_codes_js_1.ERR.abruptClosingOfEmptyComment);
                this.state = State.DATA;
                this.emitCurrentComment(token);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += '-';
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }
    // Comment state
    //------------------------------------------------------------------
    _stateComment(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.COMMENT_END_DASH;
                break;
            }
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN: {
                token.data += '<';
                this.state = State.COMMENT_LESS_THAN_SIGN;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                token.data += unicode_js_1.REPLACEMENT_CHARACTER;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += String.fromCodePoint(cp);
            }
        }
    }
    // Comment less-than sign state
    //------------------------------------------------------------------
    _stateCommentLessThanSign(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.EXCLAMATION_MARK: {
                token.data += '!';
                this.state = State.COMMENT_LESS_THAN_SIGN_BANG;
                break;
            }
            case unicode_js_1.CODE_POINTS.LESS_THAN_SIGN: {
                token.data += '<';
                break;
            }
            default: {
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }
    // Comment less-than sign bang state
    //------------------------------------------------------------------
    _stateCommentLessThanSignBang(cp) {
        if (cp === unicode_js_1.CODE_POINTS.HYPHEN_MINUS) {
            this.state = State.COMMENT_LESS_THAN_SIGN_BANG_DASH;
        }
        else {
            this.state = State.COMMENT;
            this._stateComment(cp);
        }
    }
    // Comment less-than sign bang dash state
    //------------------------------------------------------------------
    _stateCommentLessThanSignBangDash(cp) {
        if (cp === unicode_js_1.CODE_POINTS.HYPHEN_MINUS) {
            this.state = State.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH;
        }
        else {
            this.state = State.COMMENT_END_DASH;
            this._stateCommentEndDash(cp);
        }
    }
    // Comment less-than sign bang dash dash state
    //------------------------------------------------------------------
    _stateCommentLessThanSignBangDashDash(cp) {
        if (cp !== unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN && cp !== unicode_js_1.CODE_POINTS.EOF) {
            this._err(error_codes_js_1.ERR.nestedComment);
        }
        this.state = State.COMMENT_END;
        this._stateCommentEnd(cp);
    }
    // Comment end dash state
    //------------------------------------------------------------------
    _stateCommentEndDash(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.HYPHEN_MINUS: {
                this.state = State.COMMENT_END;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += '-';
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }
    // Comment end state
    //------------------------------------------------------------------
    _stateCommentEnd(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentComment(token);
                break;
            }
            case unicode_js_1.CODE_POINTS.EXCLAMATION_MARK: {
                this.state = State.COMMENT_END_BANG;
                break;
            }
            case unicode_js_1.CODE_POINTS.HYPHEN_MINUS: {
                token.data += '-';
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += '--';
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }
    // Comment end bang state
    //------------------------------------------------------------------
    _stateCommentEndBang(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.HYPHEN_MINUS: {
                token.data += '--!';
                this.state = State.COMMENT_END_DASH;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(error_codes_js_1.ERR.incorrectlyClosedComment);
                this.state = State.DATA;
                this.emitCurrentComment(token);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInComment);
                this.emitCurrentComment(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.data += '--!';
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
    }
    // DOCTYPE state
    //------------------------------------------------------------------
    _stateDoctype(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                this.state = State.BEFORE_DOCTYPE_NAME;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.BEFORE_DOCTYPE_NAME;
                this._stateBeforeDoctypeName(cp);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                this._createDoctypeToken(null);
                const token = this.currentToken;
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(error_codes_js_1.ERR.missingWhitespaceBeforeDoctypeName);
                this.state = State.BEFORE_DOCTYPE_NAME;
                this._stateBeforeDoctypeName(cp);
            }
        }
    }
    // Before DOCTYPE name state
    //------------------------------------------------------------------
    _stateBeforeDoctypeName(cp) {
        if (isAsciiUpper(cp)) {
            this._createDoctypeToken(String.fromCharCode(toAsciiLower(cp)));
            this.state = State.DOCTYPE_NAME;
        }
        else
            switch (cp) {
                case unicode_js_1.CODE_POINTS.SPACE:
                case unicode_js_1.CODE_POINTS.LINE_FEED:
                case unicode_js_1.CODE_POINTS.TABULATION:
                case unicode_js_1.CODE_POINTS.FORM_FEED: {
                    // Ignore whitespace
                    break;
                }
                case unicode_js_1.CODE_POINTS.NULL: {
                    this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                    this._createDoctypeToken(unicode_js_1.REPLACEMENT_CHARACTER);
                    this.state = State.DOCTYPE_NAME;
                    break;
                }
                case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(error_codes_js_1.ERR.missingDoctypeName);
                    this._createDoctypeToken(null);
                    const token = this.currentToken;
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this.state = State.DATA;
                    break;
                }
                case unicode_js_1.CODE_POINTS.EOF: {
                    this._err(error_codes_js_1.ERR.eofInDoctype);
                    this._createDoctypeToken(null);
                    const token = this.currentToken;
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._createDoctypeToken(String.fromCodePoint(cp));
                    this.state = State.DOCTYPE_NAME;
                }
            }
    }
    // DOCTYPE name state
    //------------------------------------------------------------------
    _stateDoctypeName(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                this.state = State.AFTER_DOCTYPE_NAME;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                token.name += unicode_js_1.REPLACEMENT_CHARACTER;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.name += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
            }
        }
    }
    // After DOCTYPE name state
    //------------------------------------------------------------------
    _stateAfterDoctypeName(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default:
                if (this._consumeSequenceIfMatch(unicode_js_1.SEQUENCES.PUBLIC, false)) {
                    this.state = State.AFTER_DOCTYPE_PUBLIC_KEYWORD;
                }
                else if (this._consumeSequenceIfMatch(unicode_js_1.SEQUENCES.SYSTEM, false)) {
                    this.state = State.AFTER_DOCTYPE_SYSTEM_KEYWORD;
                }
                //NOTE: sequence lookup can be abrupted by hibernation. In that case lookup
                //results are no longer valid and we will need to start over.
                else if (!this._ensureHibernation()) {
                    this._err(error_codes_js_1.ERR.invalidCharacterSequenceAfterDoctypeName);
                    token.forceQuirks = true;
                    this.state = State.BOGUS_DOCTYPE;
                    this._stateBogusDoctype(cp);
                }
        }
    }
    // After DOCTYPE public keyword state
    //------------------------------------------------------------------
    _stateAfterDoctypePublicKeyword(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                this.state = State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER;
                break;
            }
            case unicode_js_1.CODE_POINTS.QUOTATION_MARK: {
                this._err(error_codes_js_1.ERR.missingWhitespaceAfterDoctypePublicKeyword);
                token.publicId = '';
                this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.APOSTROPHE: {
                this._err(error_codes_js_1.ERR.missingWhitespaceAfterDoctypePublicKeyword);
                token.publicId = '';
                this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(error_codes_js_1.ERR.missingDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(error_codes_js_1.ERR.missingQuoteBeforeDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // Before DOCTYPE public identifier state
    //------------------------------------------------------------------
    _stateBeforeDoctypePublicIdentifier(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case unicode_js_1.CODE_POINTS.QUOTATION_MARK: {
                token.publicId = '';
                this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.APOSTROPHE: {
                token.publicId = '';
                this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(error_codes_js_1.ERR.missingDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(error_codes_js_1.ERR.missingQuoteBeforeDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // DOCTYPE public identifier (double-quoted) state
    //------------------------------------------------------------------
    _stateDoctypePublicIdentifierDoubleQuoted(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.QUOTATION_MARK: {
                this.state = State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                token.publicId += unicode_js_1.REPLACEMENT_CHARACTER;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(error_codes_js_1.ERR.abruptDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.publicId += String.fromCodePoint(cp);
            }
        }
    }
    // DOCTYPE public identifier (single-quoted) state
    //------------------------------------------------------------------
    _stateDoctypePublicIdentifierSingleQuoted(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.APOSTROPHE: {
                this.state = State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                token.publicId += unicode_js_1.REPLACEMENT_CHARACTER;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(error_codes_js_1.ERR.abruptDoctypePublicIdentifier);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.publicId += String.fromCodePoint(cp);
            }
        }
    }
    // After DOCTYPE public identifier state
    //------------------------------------------------------------------
    _stateAfterDoctypePublicIdentifier(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                this.state = State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case unicode_js_1.CODE_POINTS.QUOTATION_MARK: {
                this._err(error_codes_js_1.ERR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.APOSTROPHE: {
                this._err(error_codes_js_1.ERR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(error_codes_js_1.ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // Between DOCTYPE public and system identifiers state
    //------------------------------------------------------------------
    _stateBetweenDoctypePublicAndSystemIdentifiers(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case unicode_js_1.CODE_POINTS.QUOTATION_MARK: {
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.APOSTROPHE: {
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(error_codes_js_1.ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // After DOCTYPE system keyword state
    //------------------------------------------------------------------
    _stateAfterDoctypeSystemKeyword(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                this.state = State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER;
                break;
            }
            case unicode_js_1.CODE_POINTS.QUOTATION_MARK: {
                this._err(error_codes_js_1.ERR.missingWhitespaceAfterDoctypeSystemKeyword);
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.APOSTROPHE: {
                this._err(error_codes_js_1.ERR.missingWhitespaceAfterDoctypeSystemKeyword);
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(error_codes_js_1.ERR.missingDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(error_codes_js_1.ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // Before DOCTYPE system identifier state
    //------------------------------------------------------------------
    _stateBeforeDoctypeSystemIdentifier(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case unicode_js_1.CODE_POINTS.QUOTATION_MARK: {
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.APOSTROPHE: {
                token.systemId = '';
                this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(error_codes_js_1.ERR.missingDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.DATA;
                this.emitCurrentDoctype(token);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(error_codes_js_1.ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // DOCTYPE system identifier (double-quoted) state
    //------------------------------------------------------------------
    _stateDoctypeSystemIdentifierDoubleQuoted(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.QUOTATION_MARK: {
                this.state = State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                token.systemId += unicode_js_1.REPLACEMENT_CHARACTER;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(error_codes_js_1.ERR.abruptDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.systemId += String.fromCodePoint(cp);
            }
        }
    }
    // DOCTYPE system identifier (single-quoted) state
    //------------------------------------------------------------------
    _stateDoctypeSystemIdentifierSingleQuoted(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.APOSTROPHE: {
                this.state = State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                token.systemId += unicode_js_1.REPLACEMENT_CHARACTER;
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this._err(error_codes_js_1.ERR.abruptDoctypeSystemIdentifier);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                token.systemId += String.fromCodePoint(cp);
            }
        }
    }
    // After DOCTYPE system identifier state
    //------------------------------------------------------------------
    _stateAfterDoctypeSystemIdentifier(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.SPACE:
            case unicode_js_1.CODE_POINTS.LINE_FEED:
            case unicode_js_1.CODE_POINTS.TABULATION:
            case unicode_js_1.CODE_POINTS.FORM_FEED: {
                // Ignore whitespace
                break;
            }
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInDoctype);
                token.forceQuirks = true;
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default: {
                this._err(error_codes_js_1.ERR.unexpectedCharacterAfterDoctypeSystemIdentifier);
                this.state = State.BOGUS_DOCTYPE;
                this._stateBogusDoctype(cp);
            }
        }
    }
    // Bogus DOCTYPE state
    //------------------------------------------------------------------
    _stateBogusDoctype(cp) {
        const token = this.currentToken;
        switch (cp) {
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.emitCurrentDoctype(token);
                this.state = State.DATA;
                break;
            }
            case unicode_js_1.CODE_POINTS.NULL: {
                this._err(error_codes_js_1.ERR.unexpectedNullCharacter);
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this.emitCurrentDoctype(token);
                this._emitEOFToken();
                break;
            }
            default:
            // Do nothing
        }
    }
    // CDATA section state
    //------------------------------------------------------------------
    _stateCdataSection(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.RIGHT_SQUARE_BRACKET: {
                this.state = State.CDATA_SECTION_BRACKET;
                break;
            }
            case unicode_js_1.CODE_POINTS.EOF: {
                this._err(error_codes_js_1.ERR.eofInCdata);
                this._emitEOFToken();
                break;
            }
            default: {
                this._emitCodePoint(cp);
            }
        }
    }
    // CDATA section bracket state
    //------------------------------------------------------------------
    _stateCdataSectionBracket(cp) {
        if (cp === unicode_js_1.CODE_POINTS.RIGHT_SQUARE_BRACKET) {
            this.state = State.CDATA_SECTION_END;
        }
        else {
            this._emitChars(']');
            this.state = State.CDATA_SECTION;
            this._stateCdataSection(cp);
        }
    }
    // CDATA section end state
    //------------------------------------------------------------------
    _stateCdataSectionEnd(cp) {
        switch (cp) {
            case unicode_js_1.CODE_POINTS.GREATER_THAN_SIGN: {
                this.state = State.DATA;
                break;
            }
            case unicode_js_1.CODE_POINTS.RIGHT_SQUARE_BRACKET: {
                this._emitChars(']');
                break;
            }
            default: {
                this._emitChars(']]');
                this.state = State.CDATA_SECTION;
                this._stateCdataSection(cp);
            }
        }
    }
    // Character reference state
    //------------------------------------------------------------------
    _stateCharacterReference(cp) {
        if (cp === unicode_js_1.CODE_POINTS.NUMBER_SIGN) {
            this.state = State.NUMERIC_CHARACTER_REFERENCE;
        }
        else if (isAsciiAlphaNumeric(cp)) {
            this.state = State.NAMED_CHARACTER_REFERENCE;
            this._stateNamedCharacterReference(cp);
        }
        else {
            this._flushCodePointConsumedAsCharacterReference(unicode_js_1.CODE_POINTS.AMPERSAND);
            this._reconsumeInState(this.returnState, cp);
        }
    }
    // Named character reference state
    //------------------------------------------------------------------
    _stateNamedCharacterReference(cp) {
        const matchResult = this._matchNamedCharacterReference(cp);
        //NOTE: Matching can be abrupted by hibernation. In that case, match
        //results are no longer valid and we will need to start over.
        if (this._ensureHibernation()) {
            // Stay in the state, try again.
        }
        else if (matchResult) {
            for (let i = 0; i < matchResult.length; i++) {
                this._flushCodePointConsumedAsCharacterReference(matchResult[i]);
            }
            this.state = this.returnState;
        }
        else {
            this._flushCodePointConsumedAsCharacterReference(unicode_js_1.CODE_POINTS.AMPERSAND);
            this.state = State.AMBIGUOUS_AMPERSAND;
        }
    }
    // Ambiguos ampersand state
    //------------------------------------------------------------------
    _stateAmbiguousAmpersand(cp) {
        if (isAsciiAlphaNumeric(cp)) {
            this._flushCodePointConsumedAsCharacterReference(cp);
        }
        else {
            if (cp === unicode_js_1.CODE_POINTS.SEMICOLON) {
                this._err(error_codes_js_1.ERR.unknownNamedCharacterReference);
            }
            this._reconsumeInState(this.returnState, cp);
        }
    }
    // Numeric character reference state
    //------------------------------------------------------------------
    _stateNumericCharacterReference(cp) {
        this.charRefCode = 0;
        if (cp === unicode_js_1.CODE_POINTS.LATIN_SMALL_X || cp === unicode_js_1.CODE_POINTS.LATIN_CAPITAL_X) {
            this.state = State.HEXADEMICAL_CHARACTER_REFERENCE_START;
        }
        // Inlined decimal character reference start state
        else if (isAsciiDigit(cp)) {
            this.state = State.DECIMAL_CHARACTER_REFERENCE;
            this._stateDecimalCharacterReference(cp);
        }
        else {
            this._err(error_codes_js_1.ERR.absenceOfDigitsInNumericCharacterReference);
            this._flushCodePointConsumedAsCharacterReference(unicode_js_1.CODE_POINTS.AMPERSAND);
            this._flushCodePointConsumedAsCharacterReference(unicode_js_1.CODE_POINTS.NUMBER_SIGN);
            this._reconsumeInState(this.returnState, cp);
        }
    }
    // Hexademical character reference start state
    //------------------------------------------------------------------
    _stateHexademicalCharacterReferenceStart(cp) {
        if (isAsciiHexDigit(cp)) {
            this.state = State.HEXADEMICAL_CHARACTER_REFERENCE;
            this._stateHexademicalCharacterReference(cp);
        }
        else {
            this._err(error_codes_js_1.ERR.absenceOfDigitsInNumericCharacterReference);
            this._flushCodePointConsumedAsCharacterReference(unicode_js_1.CODE_POINTS.AMPERSAND);
            this._flushCodePointConsumedAsCharacterReference(unicode_js_1.CODE_POINTS.NUMBER_SIGN);
            this._unconsume(2);
            this.state = this.returnState;
        }
    }
    // Hexademical character reference state
    //------------------------------------------------------------------
    _stateHexademicalCharacterReference(cp) {
        if (isAsciiUpperHexDigit(cp)) {
            this.charRefCode = this.charRefCode * 16 + cp - 0x37;
        }
        else if (isAsciiLowerHexDigit(cp)) {
            this.charRefCode = this.charRefCode * 16 + cp - 0x57;
        }
        else if (isAsciiDigit(cp)) {
            this.charRefCode = this.charRefCode * 16 + cp - 0x30;
        }
        else if (cp === unicode_js_1.CODE_POINTS.SEMICOLON) {
            this.state = State.NUMERIC_CHARACTER_REFERENCE_END;
        }
        else {
            this._err(error_codes_js_1.ERR.missingSemicolonAfterCharacterReference);
            this.state = State.NUMERIC_CHARACTER_REFERENCE_END;
            this._stateNumericCharacterReferenceEnd(cp);
        }
    }
    // Decimal character reference state
    //------------------------------------------------------------------
    _stateDecimalCharacterReference(cp) {
        if (isAsciiDigit(cp)) {
            this.charRefCode = this.charRefCode * 10 + cp - 0x30;
        }
        else if (cp === unicode_js_1.CODE_POINTS.SEMICOLON) {
            this.state = State.NUMERIC_CHARACTER_REFERENCE_END;
        }
        else {
            this._err(error_codes_js_1.ERR.missingSemicolonAfterCharacterReference);
            this.state = State.NUMERIC_CHARACTER_REFERENCE_END;
            this._stateNumericCharacterReferenceEnd(cp);
        }
    }
    // Numeric character reference end state
    //------------------------------------------------------------------
    _stateNumericCharacterReferenceEnd(cp) {
        if (this.charRefCode === unicode_js_1.CODE_POINTS.NULL) {
            this._err(error_codes_js_1.ERR.nullCharacterReference);
            this.charRefCode = unicode_js_1.CODE_POINTS.REPLACEMENT_CHARACTER;
        }
        else if (this.charRefCode > 1114111) {
            this._err(error_codes_js_1.ERR.characterReferenceOutsideUnicodeRange);
            this.charRefCode = unicode_js_1.CODE_POINTS.REPLACEMENT_CHARACTER;
        }
        else if ((0, unicode_js_1.isSurrogate)(this.charRefCode)) {
            this._err(error_codes_js_1.ERR.surrogateCharacterReference);
            this.charRefCode = unicode_js_1.CODE_POINTS.REPLACEMENT_CHARACTER;
        }
        else if ((0, unicode_js_1.isUndefinedCodePoint)(this.charRefCode)) {
            this._err(error_codes_js_1.ERR.noncharacterCharacterReference);
        }
        else if ((0, unicode_js_1.isControlCodePoint)(this.charRefCode) || this.charRefCode === unicode_js_1.CODE_POINTS.CARRIAGE_RETURN) {
            this._err(error_codes_js_1.ERR.controlCharacterReference);
            const replacement = C1_CONTROLS_REFERENCE_REPLACEMENTS.get(this.charRefCode);
            if (replacement !== undefined) {
                this.charRefCode = replacement;
            }
        }
        this._flushCodePointConsumedAsCharacterReference(this.charRefCode);
        this._reconsumeInState(this.returnState, cp);
    }
}
exports.Tokenizer = Tokenizer;

},{"../common/error-codes.js":7,"../common/html.js":9,"../common/token.js":10,"../common/unicode.js":11,"./preprocessor.js":18,"entities/lib/decode.js":1}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Preprocessor = void 0;
const unicode_js_1 = require("../common/unicode.js");
const error_codes_js_1 = require("../common/error-codes.js");
//Const
const DEFAULT_BUFFER_WATERLINE = 1 << 16;
//Preprocessor
//NOTE: HTML input preprocessing
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#preprocessing-the-input-stream)
class Preprocessor {
    constructor(handler) {
        this.handler = handler;
        this.html = '';
        this.pos = -1;
        // NOTE: Initial `lastGapPos` is -2, to ensure `col` on initialisation is 0
        this.lastGapPos = -2;
        this.gapStack = [];
        this.skipNextNewLine = false;
        this.lastChunkWritten = false;
        this.endOfChunkHit = false;
        this.bufferWaterline = DEFAULT_BUFFER_WATERLINE;
        this.isEol = false;
        this.lineStartPos = 0;
        this.droppedBufferSize = 0;
        this.line = 1;
        //NOTE: avoid reporting errors twice on advance/retreat
        this.lastErrOffset = -1;
    }
    /** The column on the current line. If we just saw a gap (eg. a surrogate pair), return the index before. */
    get col() {
        return this.pos - this.lineStartPos + Number(this.lastGapPos !== this.pos);
    }
    get offset() {
        return this.droppedBufferSize + this.pos;
    }
    getError(code) {
        const { line, col, offset } = this;
        return {
            code,
            startLine: line,
            endLine: line,
            startCol: col,
            endCol: col,
            startOffset: offset,
            endOffset: offset,
        };
    }
    _err(code) {
        if (this.handler.onParseError && this.lastErrOffset !== this.offset) {
            this.lastErrOffset = this.offset;
            this.handler.onParseError(this.getError(code));
        }
    }
    _addGap() {
        this.gapStack.push(this.lastGapPos);
        this.lastGapPos = this.pos;
    }
    _processSurrogate(cp) {
        //NOTE: try to peek a surrogate pair
        if (this.pos !== this.html.length - 1) {
            const nextCp = this.html.charCodeAt(this.pos + 1);
            if ((0, unicode_js_1.isSurrogatePair)(nextCp)) {
                //NOTE: we have a surrogate pair. Peek pair character and recalculate code point.
                this.pos++;
                //NOTE: add a gap that should be avoided during retreat
                this._addGap();
                return (0, unicode_js_1.getSurrogatePairCodePoint)(cp, nextCp);
            }
        }
        //NOTE: we are at the end of a chunk, therefore we can't infer the surrogate pair yet.
        else if (!this.lastChunkWritten) {
            this.endOfChunkHit = true;
            return unicode_js_1.CODE_POINTS.EOF;
        }
        //NOTE: isolated surrogate
        this._err(error_codes_js_1.ERR.surrogateInInputStream);
        return cp;
    }
    willDropParsedChunk() {
        return this.pos > this.bufferWaterline;
    }
    dropParsedChunk() {
        if (this.willDropParsedChunk()) {
            this.html = this.html.substring(this.pos);
            this.lineStartPos -= this.pos;
            this.droppedBufferSize += this.pos;
            this.pos = 0;
            this.lastGapPos = -2;
            this.gapStack.length = 0;
        }
    }
    write(chunk, isLastChunk) {
        if (this.html.length > 0) {
            this.html += chunk;
        }
        else {
            this.html = chunk;
        }
        this.endOfChunkHit = false;
        this.lastChunkWritten = isLastChunk;
    }
    insertHtmlAtCurrentPos(chunk) {
        this.html = this.html.substring(0, this.pos + 1) + chunk + this.html.substring(this.pos + 1);
        this.endOfChunkHit = false;
    }
    startsWith(pattern, caseSensitive) {
        // Check if our buffer has enough characters
        if (this.pos + pattern.length > this.html.length) {
            this.endOfChunkHit = !this.lastChunkWritten;
            return false;
        }
        if (caseSensitive) {
            return this.html.startsWith(pattern, this.pos);
        }
        for (let i = 0; i < pattern.length; i++) {
            const cp = this.html.charCodeAt(this.pos + i) | 0x20;
            if (cp !== pattern.charCodeAt(i)) {
                return false;
            }
        }
        return true;
    }
    peek(offset) {
        const pos = this.pos + offset;
        if (pos >= this.html.length) {
            this.endOfChunkHit = !this.lastChunkWritten;
            return unicode_js_1.CODE_POINTS.EOF;
        }
        return this.html.charCodeAt(pos);
    }
    advance() {
        this.pos++;
        //NOTE: LF should be in the last column of the line
        if (this.isEol) {
            this.isEol = false;
            this.line++;
            this.lineStartPos = this.pos;
        }
        if (this.pos >= this.html.length) {
            this.endOfChunkHit = !this.lastChunkWritten;
            return unicode_js_1.CODE_POINTS.EOF;
        }
        let cp = this.html.charCodeAt(this.pos);
        //NOTE: all U+000D CARRIAGE RETURN (CR) characters must be converted to U+000A LINE FEED (LF) characters
        if (cp === unicode_js_1.CODE_POINTS.CARRIAGE_RETURN) {
            this.isEol = true;
            this.skipNextNewLine = true;
            return unicode_js_1.CODE_POINTS.LINE_FEED;
        }
        //NOTE: any U+000A LINE FEED (LF) characters that immediately follow a U+000D CARRIAGE RETURN (CR) character
        //must be ignored.
        if (cp === unicode_js_1.CODE_POINTS.LINE_FEED) {
            this.isEol = true;
            if (this.skipNextNewLine) {
                // `line` will be bumped again in the recursive call.
                this.line--;
                this.skipNextNewLine = false;
                this._addGap();
                return this.advance();
            }
        }
        this.skipNextNewLine = false;
        if ((0, unicode_js_1.isSurrogate)(cp)) {
            cp = this._processSurrogate(cp);
        }
        //OPTIMIZATION: first check if code point is in the common allowed
        //range (ASCII alphanumeric, whitespaces, big chunk of BMP)
        //before going into detailed performance cost validation.
        const isCommonValidRange = this.handler.onParseError === null ||
            (cp > 0x1f && cp < 0x7f) ||
            cp === unicode_js_1.CODE_POINTS.LINE_FEED ||
            cp === unicode_js_1.CODE_POINTS.CARRIAGE_RETURN ||
            (cp > 0x9f && cp < 64976);
        if (!isCommonValidRange) {
            this._checkForProblematicCharacters(cp);
        }
        return cp;
    }
    _checkForProblematicCharacters(cp) {
        if ((0, unicode_js_1.isControlCodePoint)(cp)) {
            this._err(error_codes_js_1.ERR.controlCharacterInInputStream);
        }
        else if ((0, unicode_js_1.isUndefinedCodePoint)(cp)) {
            this._err(error_codes_js_1.ERR.noncharacterInInputStream);
        }
    }
    retreat(count) {
        this.pos -= count;
        while (this.pos < this.lastGapPos) {
            this.lastGapPos = this.gapStack.pop();
            this.pos--;
        }
        this.isEol = false;
    }
}
exports.Preprocessor = Preprocessor;

},{"../common/error-codes.js":7,"../common/unicode.js":11}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTreeAdapter = void 0;
const html_js_1 = require("../common/html.js");
function createTextNode(value) {
    return {
        nodeName: '#text',
        value,
        parentNode: null,
    };
}
exports.defaultTreeAdapter = {
    //Node construction
    createDocument() {
        return {
            nodeName: '#document',
            mode: html_js_1.DOCUMENT_MODE.NO_QUIRKS,
            childNodes: [],
        };
    },
    createDocumentFragment() {
        return {
            nodeName: '#document-fragment',
            childNodes: [],
        };
    },
    createElement(tagName, namespaceURI, attrs) {
        return {
            nodeName: tagName,
            tagName,
            attrs,
            namespaceURI,
            childNodes: [],
            parentNode: null,
        };
    },
    createCommentNode(data) {
        return {
            nodeName: '#comment',
            data,
            parentNode: null,
        };
    },
    //Tree mutation
    appendChild(parentNode, newNode) {
        parentNode.childNodes.push(newNode);
        newNode.parentNode = parentNode;
    },
    insertBefore(parentNode, newNode, referenceNode) {
        const insertionIdx = parentNode.childNodes.indexOf(referenceNode);
        parentNode.childNodes.splice(insertionIdx, 0, newNode);
        newNode.parentNode = parentNode;
    },
    setTemplateContent(templateElement, contentElement) {
        templateElement.content = contentElement;
    },
    getTemplateContent(templateElement) {
        return templateElement.content;
    },
    setDocumentType(document, name, publicId, systemId) {
        const doctypeNode = document.childNodes.find((node) => node.nodeName === '#documentType');
        if (doctypeNode) {
            doctypeNode.name = name;
            doctypeNode.publicId = publicId;
            doctypeNode.systemId = systemId;
        }
        else {
            const node = {
                nodeName: '#documentType',
                name,
                publicId,
                systemId,
                parentNode: null,
            };
            exports.defaultTreeAdapter.appendChild(document, node);
        }
    },
    setDocumentMode(document, mode) {
        document.mode = mode;
    },
    getDocumentMode(document) {
        return document.mode;
    },
    detachNode(node) {
        if (node.parentNode) {
            const idx = node.parentNode.childNodes.indexOf(node);
            node.parentNode.childNodes.splice(idx, 1);
            node.parentNode = null;
        }
    },
    insertText(parentNode, text) {
        if (parentNode.childNodes.length > 0) {
            const prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];
            if (exports.defaultTreeAdapter.isTextNode(prevNode)) {
                prevNode.value += text;
                return;
            }
        }
        exports.defaultTreeAdapter.appendChild(parentNode, createTextNode(text));
    },
    insertTextBefore(parentNode, text, referenceNode) {
        const prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];
        if (prevNode && exports.defaultTreeAdapter.isTextNode(prevNode)) {
            prevNode.value += text;
        }
        else {
            exports.defaultTreeAdapter.insertBefore(parentNode, createTextNode(text), referenceNode);
        }
    },
    adoptAttributes(recipient, attrs) {
        const recipientAttrsMap = new Set(recipient.attrs.map((attr) => attr.name));
        for (let j = 0; j < attrs.length; j++) {
            if (!recipientAttrsMap.has(attrs[j].name)) {
                recipient.attrs.push(attrs[j]);
            }
        }
    },
    //Tree traversing
    getFirstChild(node) {
        return node.childNodes[0];
    },
    getChildNodes(node) {
        return node.childNodes;
    },
    getParentNode(node) {
        return node.parentNode;
    },
    getAttrList(element) {
        return element.attrs;
    },
    //Node data
    getTagName(element) {
        return element.tagName;
    },
    getNamespaceURI(element) {
        return element.namespaceURI;
    },
    getTextNodeContent(textNode) {
        return textNode.value;
    },
    getCommentNodeContent(commentNode) {
        return commentNode.data;
    },
    getDocumentTypeNodeName(doctypeNode) {
        return doctypeNode.name;
    },
    getDocumentTypeNodePublicId(doctypeNode) {
        return doctypeNode.publicId;
    },
    getDocumentTypeNodeSystemId(doctypeNode) {
        return doctypeNode.systemId;
    },
    //Node types
    isTextNode(node) {
        return node.nodeName === '#text';
    },
    isCommentNode(node) {
        return node.nodeName === '#comment';
    },
    isDocumentTypeNode(node) {
        return node.nodeName === '#documentType';
    },
    isElementNode(node) {
        return Object.prototype.hasOwnProperty.call(node, 'tagName');
    },
    // Source code location
    setNodeSourceCodeLocation(node, location) {
        node.sourceCodeLocation = location;
    },
    getNodeSourceCodeLocation(node) {
        return node.sourceCodeLocation;
    },
    updateNodeSourceCodeLocation(node, endLocation) {
        node.sourceCodeLocation = Object.assign(Object.assign({}, node.sourceCodeLocation), endLocation);
    },
};

},{"../common/html.js":9}]},{},[12])(12)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uLy4uLy4uL2VudGl0aWVzL2xpYi9kZWNvZGUuanMiLCIuLi8uLi8uLi9lbnRpdGllcy9saWIvZGVjb2RlX2NvZGVwb2ludC5qcyIsIi4uLy4uLy4uL2VudGl0aWVzL2xpYi9lc2NhcGUuanMiLCIuLi8uLi8uLi9lbnRpdGllcy9saWIvZ2VuZXJhdGVkL2RlY29kZS1kYXRhLWh0bWwuanMiLCIuLi8uLi8uLi9lbnRpdGllcy9saWIvZ2VuZXJhdGVkL2RlY29kZS1kYXRhLXhtbC5qcyIsImNvbW1vbi9kb2N0eXBlLmpzIiwiY29tbW9uL2Vycm9yLWNvZGVzLmpzIiwiY29tbW9uL2ZvcmVpZ24tY29udGVudC5qcyIsImNvbW1vbi9odG1sLmpzIiwiY29tbW9uL3Rva2VuLmpzIiwiY29tbW9uL3VuaWNvZGUuanMiLCJpbmRleC5qcyIsInBhcnNlci9mb3JtYXR0aW5nLWVsZW1lbnQtbGlzdC5qcyIsInBhcnNlci9pbmRleC5qcyIsInBhcnNlci9vcGVuLWVsZW1lbnQtc3RhY2suanMiLCJzZXJpYWxpemVyL2luZGV4LmpzIiwidG9rZW5pemVyL2luZGV4LmpzIiwidG9rZW5pemVyL3ByZXByb2Nlc3Nvci5qcyIsInRyZWUtYWRhcHRlcnMvZGVmYXVsdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaGhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzUrRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19pbXBvcnREZWZhdWx0ID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydERlZmF1bHQpIHx8IGZ1bmN0aW9uIChtb2QpIHtcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IFwiZGVmYXVsdFwiOiBtb2QgfTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmRlY29kZVhNTCA9IGV4cG9ydHMuZGVjb2RlSFRNTFN0cmljdCA9IGV4cG9ydHMuZGVjb2RlSFRNTCA9IGV4cG9ydHMuZGV0ZXJtaW5lQnJhbmNoID0gZXhwb3J0cy5CaW5UcmllRmxhZ3MgPSBleHBvcnRzLmZyb21Db2RlUG9pbnQgPSBleHBvcnRzLnJlcGxhY2VDb2RlUG9pbnQgPSBleHBvcnRzLmRlY29kZUNvZGVQb2ludCA9IGV4cG9ydHMueG1sRGVjb2RlVHJlZSA9IGV4cG9ydHMuaHRtbERlY29kZVRyZWUgPSB2b2lkIDA7XG52YXIgZGVjb2RlX2RhdGFfaHRtbF9qc18xID0gX19pbXBvcnREZWZhdWx0KHJlcXVpcmUoXCIuL2dlbmVyYXRlZC9kZWNvZGUtZGF0YS1odG1sLmpzXCIpKTtcbmV4cG9ydHMuaHRtbERlY29kZVRyZWUgPSBkZWNvZGVfZGF0YV9odG1sX2pzXzEuZGVmYXVsdDtcbnZhciBkZWNvZGVfZGF0YV94bWxfanNfMSA9IF9faW1wb3J0RGVmYXVsdChyZXF1aXJlKFwiLi9nZW5lcmF0ZWQvZGVjb2RlLWRhdGEteG1sLmpzXCIpKTtcbmV4cG9ydHMueG1sRGVjb2RlVHJlZSA9IGRlY29kZV9kYXRhX3htbF9qc18xLmRlZmF1bHQ7XG52YXIgZGVjb2RlX2NvZGVwb2ludF9qc18xID0gX19pbXBvcnREZWZhdWx0KHJlcXVpcmUoXCIuL2RlY29kZV9jb2RlcG9pbnQuanNcIikpO1xuZXhwb3J0cy5kZWNvZGVDb2RlUG9pbnQgPSBkZWNvZGVfY29kZXBvaW50X2pzXzEuZGVmYXVsdDtcbnZhciBkZWNvZGVfY29kZXBvaW50X2pzXzIgPSByZXF1aXJlKFwiLi9kZWNvZGVfY29kZXBvaW50LmpzXCIpO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwicmVwbGFjZUNvZGVQb2ludFwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gZGVjb2RlX2NvZGVwb2ludF9qc18yLnJlcGxhY2VDb2RlUG9pbnQ7IH0gfSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJmcm9tQ29kZVBvaW50XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBkZWNvZGVfY29kZXBvaW50X2pzXzIuZnJvbUNvZGVQb2ludDsgfSB9KTtcbnZhciBDaGFyQ29kZXM7XG4oZnVuY3Rpb24gKENoYXJDb2Rlcykge1xuICAgIENoYXJDb2Rlc1tDaGFyQ29kZXNbXCJOVU1cIl0gPSAzNV0gPSBcIk5VTVwiO1xuICAgIENoYXJDb2Rlc1tDaGFyQ29kZXNbXCJTRU1JXCJdID0gNTldID0gXCJTRU1JXCI7XG4gICAgQ2hhckNvZGVzW0NoYXJDb2Rlc1tcIlpFUk9cIl0gPSA0OF0gPSBcIlpFUk9cIjtcbiAgICBDaGFyQ29kZXNbQ2hhckNvZGVzW1wiTklORVwiXSA9IDU3XSA9IFwiTklORVwiO1xuICAgIENoYXJDb2Rlc1tDaGFyQ29kZXNbXCJMT1dFUl9BXCJdID0gOTddID0gXCJMT1dFUl9BXCI7XG4gICAgQ2hhckNvZGVzW0NoYXJDb2Rlc1tcIkxPV0VSX0ZcIl0gPSAxMDJdID0gXCJMT1dFUl9GXCI7XG4gICAgQ2hhckNvZGVzW0NoYXJDb2Rlc1tcIkxPV0VSX1hcIl0gPSAxMjBdID0gXCJMT1dFUl9YXCI7XG4gICAgLyoqIEJpdCB0aGF0IG5lZWRzIHRvIGJlIHNldCB0byBjb252ZXJ0IGFuIHVwcGVyIGNhc2UgQVNDSUkgY2hhcmFjdGVyIHRvIGxvd2VyIGNhc2UgKi9cbiAgICBDaGFyQ29kZXNbQ2hhckNvZGVzW1wiVG9fTE9XRVJfQklUXCJdID0gMzJdID0gXCJUb19MT1dFUl9CSVRcIjtcbn0pKENoYXJDb2RlcyB8fCAoQ2hhckNvZGVzID0ge30pKTtcbnZhciBCaW5UcmllRmxhZ3M7XG4oZnVuY3Rpb24gKEJpblRyaWVGbGFncykge1xuICAgIEJpblRyaWVGbGFnc1tCaW5UcmllRmxhZ3NbXCJWQUxVRV9MRU5HVEhcIl0gPSA0OTE1Ml0gPSBcIlZBTFVFX0xFTkdUSFwiO1xuICAgIEJpblRyaWVGbGFnc1tCaW5UcmllRmxhZ3NbXCJCUkFOQ0hfTEVOR1RIXCJdID0gMTYyNTZdID0gXCJCUkFOQ0hfTEVOR1RIXCI7XG4gICAgQmluVHJpZUZsYWdzW0JpblRyaWVGbGFnc1tcIkpVTVBfVEFCTEVcIl0gPSAxMjddID0gXCJKVU1QX1RBQkxFXCI7XG59KShCaW5UcmllRmxhZ3MgPSBleHBvcnRzLkJpblRyaWVGbGFncyB8fCAoZXhwb3J0cy5CaW5UcmllRmxhZ3MgPSB7fSkpO1xuZnVuY3Rpb24gZ2V0RGVjb2RlcihkZWNvZGVUcmVlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGRlY29kZUhUTUxCaW5hcnkoc3RyLCBzdHJpY3QpIHtcbiAgICAgICAgdmFyIHJldCA9IFwiXCI7XG4gICAgICAgIHZhciBsYXN0SWR4ID0gMDtcbiAgICAgICAgdmFyIHN0cklkeCA9IDA7XG4gICAgICAgIHdoaWxlICgoc3RySWR4ID0gc3RyLmluZGV4T2YoXCImXCIsIHN0cklkeCkpID49IDApIHtcbiAgICAgICAgICAgIHJldCArPSBzdHIuc2xpY2UobGFzdElkeCwgc3RySWR4KTtcbiAgICAgICAgICAgIGxhc3RJZHggPSBzdHJJZHg7XG4gICAgICAgICAgICAvLyBTa2lwIHRoZSBcIiZcIlxuICAgICAgICAgICAgc3RySWR4ICs9IDE7XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbnVtZXJpYyBlbnRpdHksIGhhbmRsZSB0aGlzIHNlcGFyYXRlbHkuXG4gICAgICAgICAgICBpZiAoc3RyLmNoYXJDb2RlQXQoc3RySWR4KSA9PT0gQ2hhckNvZGVzLk5VTSkge1xuICAgICAgICAgICAgICAgIC8vIFNraXAgdGhlIGxlYWRpbmcgXCImI1wiLiBGb3IgaGV4IGVudGl0aWVzLCBhbHNvIHNraXAgdGhlIGxlYWRpbmcgXCJ4XCIuXG4gICAgICAgICAgICAgICAgdmFyIHN0YXJ0ID0gc3RySWR4ICsgMTtcbiAgICAgICAgICAgICAgICB2YXIgYmFzZSA9IDEwO1xuICAgICAgICAgICAgICAgIHZhciBjcCA9IHN0ci5jaGFyQ29kZUF0KHN0YXJ0KTtcbiAgICAgICAgICAgICAgICBpZiAoKGNwIHwgQ2hhckNvZGVzLlRvX0xPV0VSX0JJVCkgPT09IENoYXJDb2Rlcy5MT1dFUl9YKSB7XG4gICAgICAgICAgICAgICAgICAgIGJhc2UgPSAxNjtcbiAgICAgICAgICAgICAgICAgICAgc3RySWR4ICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRvXG4gICAgICAgICAgICAgICAgICAgIGNwID0gc3RyLmNoYXJDb2RlQXQoKytzdHJJZHgpO1xuICAgICAgICAgICAgICAgIHdoaWxlICgoY3AgPj0gQ2hhckNvZGVzLlpFUk8gJiYgY3AgPD0gQ2hhckNvZGVzLk5JTkUpIHx8XG4gICAgICAgICAgICAgICAgICAgIChiYXNlID09PSAxNiAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgKGNwIHwgQ2hhckNvZGVzLlRvX0xPV0VSX0JJVCkgPj0gQ2hhckNvZGVzLkxPV0VSX0EgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIChjcCB8IENoYXJDb2Rlcy5Ub19MT1dFUl9CSVQpIDw9IENoYXJDb2Rlcy5MT1dFUl9GKSk7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXJ0ICE9PSBzdHJJZHgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVudGl0eSA9IHN0ci5zdWJzdHJpbmcoc3RhcnQsIHN0cklkeCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJzZWQgPSBwYXJzZUludChlbnRpdHksIGJhc2UpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RyLmNoYXJDb2RlQXQoc3RySWR4KSA9PT0gQ2hhckNvZGVzLlNFTUkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cklkeCArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0ICs9ICgwLCBkZWNvZGVfY29kZXBvaW50X2pzXzEuZGVmYXVsdCkocGFyc2VkKTtcbiAgICAgICAgICAgICAgICAgICAgbGFzdElkeCA9IHN0cklkeDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcmVzdWx0SWR4ID0gMDtcbiAgICAgICAgICAgIHZhciBleGNlc3MgPSAxO1xuICAgICAgICAgICAgdmFyIHRyZWVJZHggPSAwO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnQgPSBkZWNvZGVUcmVlW3RyZWVJZHhdO1xuICAgICAgICAgICAgZm9yICg7IHN0cklkeCA8IHN0ci5sZW5ndGg7IHN0cklkeCsrLCBleGNlc3MrKykge1xuICAgICAgICAgICAgICAgIHRyZWVJZHggPSBkZXRlcm1pbmVCcmFuY2goZGVjb2RlVHJlZSwgY3VycmVudCwgdHJlZUlkeCArIDEsIHN0ci5jaGFyQ29kZUF0KHN0cklkeCkpO1xuICAgICAgICAgICAgICAgIGlmICh0cmVlSWR4IDwgMClcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY3VycmVudCA9IGRlY29kZVRyZWVbdHJlZUlkeF07XG4gICAgICAgICAgICAgICAgdmFyIG1hc2tlZCA9IGN1cnJlbnQgJiBCaW5UcmllRmxhZ3MuVkFMVUVfTEVOR1RIO1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBicmFuY2ggaXMgYSB2YWx1ZSwgc3RvcmUgaXQgYW5kIGNvbnRpbnVlXG4gICAgICAgICAgICAgICAgaWYgKG1hc2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbGVnYWN5IGVudGl0eSB3aGlsZSBwYXJzaW5nIHN0cmljdGx5LCBqdXN0IHNraXAgdGhlIG51bWJlciBvZiBieXRlc1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXN0cmljdCB8fCBzdHIuY2hhckNvZGVBdChzdHJJZHgpID09PSBDaGFyQ29kZXMuU0VNSSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0SWR4ID0gdHJlZUlkeDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4Y2VzcyA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlIG1hc2sgaXMgdGhlIG51bWJlciBvZiBieXRlcyBvZiB0aGUgdmFsdWUsIGluY2x1ZGluZyB0aGUgY3VycmVudCBieXRlLlxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWVMZW5ndGggPSAobWFza2VkID4+IDE0KSAtIDE7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZUxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB0cmVlSWR4ICs9IHZhbHVlTGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXN1bHRJZHggIT09IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWVMZW5ndGggPSAoZGVjb2RlVHJlZVtyZXN1bHRJZHhdICYgQmluVHJpZUZsYWdzLlZBTFVFX0xFTkdUSCkgPj4gMTQ7XG4gICAgICAgICAgICAgICAgcmV0ICs9XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlTGVuZ3RoID09PSAxXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFN0cmluZy5mcm9tQ2hhckNvZGUoZGVjb2RlVHJlZVtyZXN1bHRJZHhdICYgfkJpblRyaWVGbGFncy5WQUxVRV9MRU5HVEgpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHZhbHVlTGVuZ3RoID09PSAyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBTdHJpbmcuZnJvbUNoYXJDb2RlKGRlY29kZVRyZWVbcmVzdWx0SWR4ICsgMV0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBTdHJpbmcuZnJvbUNoYXJDb2RlKGRlY29kZVRyZWVbcmVzdWx0SWR4ICsgMV0sIGRlY29kZVRyZWVbcmVzdWx0SWR4ICsgMl0pO1xuICAgICAgICAgICAgICAgIGxhc3RJZHggPSBzdHJJZHggLSBleGNlc3MgKyAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQgKyBzdHIuc2xpY2UobGFzdElkeCk7XG4gICAgfTtcbn1cbmZ1bmN0aW9uIGRldGVybWluZUJyYW5jaChkZWNvZGVUcmVlLCBjdXJyZW50LCBub2RlSWR4LCBjaGFyKSB7XG4gICAgdmFyIGJyYW5jaENvdW50ID0gKGN1cnJlbnQgJiBCaW5UcmllRmxhZ3MuQlJBTkNIX0xFTkdUSCkgPj4gNztcbiAgICB2YXIganVtcE9mZnNldCA9IGN1cnJlbnQgJiBCaW5UcmllRmxhZ3MuSlVNUF9UQUJMRTtcbiAgICAvLyBDYXNlIDE6IFNpbmdsZSBicmFuY2ggZW5jb2RlZCBpbiBqdW1wIG9mZnNldFxuICAgIGlmIChicmFuY2hDb3VudCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ganVtcE9mZnNldCAhPT0gMCAmJiBjaGFyID09PSBqdW1wT2Zmc2V0ID8gbm9kZUlkeCA6IC0xO1xuICAgIH1cbiAgICAvLyBDYXNlIDI6IE11bHRpcGxlIGJyYW5jaGVzIGVuY29kZWQgaW4ganVtcCB0YWJsZVxuICAgIGlmIChqdW1wT2Zmc2V0KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGNoYXIgLSBqdW1wT2Zmc2V0O1xuICAgICAgICByZXR1cm4gdmFsdWUgPCAwIHx8IHZhbHVlID49IGJyYW5jaENvdW50XG4gICAgICAgICAgICA/IC0xXG4gICAgICAgICAgICA6IGRlY29kZVRyZWVbbm9kZUlkeCArIHZhbHVlXSAtIDE7XG4gICAgfVxuICAgIC8vIENhc2UgMzogTXVsdGlwbGUgYnJhbmNoZXMgZW5jb2RlZCBpbiBkaWN0aW9uYXJ5XG4gICAgLy8gQmluYXJ5IHNlYXJjaCBmb3IgdGhlIGNoYXJhY3Rlci5cbiAgICB2YXIgbG8gPSBub2RlSWR4O1xuICAgIHZhciBoaSA9IGxvICsgYnJhbmNoQ291bnQgLSAxO1xuICAgIHdoaWxlIChsbyA8PSBoaSkge1xuICAgICAgICB2YXIgbWlkID0gKGxvICsgaGkpID4+PiAxO1xuICAgICAgICB2YXIgbWlkVmFsID0gZGVjb2RlVHJlZVttaWRdO1xuICAgICAgICBpZiAobWlkVmFsIDwgY2hhcikge1xuICAgICAgICAgICAgbG8gPSBtaWQgKyAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG1pZFZhbCA+IGNoYXIpIHtcbiAgICAgICAgICAgIGhpID0gbWlkIC0gMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkZWNvZGVUcmVlW21pZCArIGJyYW5jaENvdW50XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5leHBvcnRzLmRldGVybWluZUJyYW5jaCA9IGRldGVybWluZUJyYW5jaDtcbnZhciBodG1sRGVjb2RlciA9IGdldERlY29kZXIoZGVjb2RlX2RhdGFfaHRtbF9qc18xLmRlZmF1bHQpO1xudmFyIHhtbERlY29kZXIgPSBnZXREZWNvZGVyKGRlY29kZV9kYXRhX3htbF9qc18xLmRlZmF1bHQpO1xuLyoqXG4gKiBEZWNvZGVzIGFuIEhUTUwgc3RyaW5nLCBhbGxvd2luZyBmb3IgZW50aXRpZXMgbm90IHRlcm1pbmF0ZWQgYnkgYSBzZW1pLWNvbG9uLlxuICpcbiAqIEBwYXJhbSBzdHIgVGhlIHN0cmluZyB0byBkZWNvZGUuXG4gKiBAcmV0dXJucyBUaGUgZGVjb2RlZCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGRlY29kZUhUTUwoc3RyKSB7XG4gICAgcmV0dXJuIGh0bWxEZWNvZGVyKHN0ciwgZmFsc2UpO1xufVxuZXhwb3J0cy5kZWNvZGVIVE1MID0gZGVjb2RlSFRNTDtcbi8qKlxuICogRGVjb2RlcyBhbiBIVE1MIHN0cmluZywgcmVxdWlyaW5nIGFsbCBlbnRpdGllcyB0byBiZSB0ZXJtaW5hdGVkIGJ5IGEgc2VtaS1jb2xvbi5cbiAqXG4gKiBAcGFyYW0gc3RyIFRoZSBzdHJpbmcgdG8gZGVjb2RlLlxuICogQHJldHVybnMgVGhlIGRlY29kZWQgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBkZWNvZGVIVE1MU3RyaWN0KHN0cikge1xuICAgIHJldHVybiBodG1sRGVjb2RlcihzdHIsIHRydWUpO1xufVxuZXhwb3J0cy5kZWNvZGVIVE1MU3RyaWN0ID0gZGVjb2RlSFRNTFN0cmljdDtcbi8qKlxuICogRGVjb2RlcyBhbiBYTUwgc3RyaW5nLCByZXF1aXJpbmcgYWxsIGVudGl0aWVzIHRvIGJlIHRlcm1pbmF0ZWQgYnkgYSBzZW1pLWNvbG9uLlxuICpcbiAqIEBwYXJhbSBzdHIgVGhlIHN0cmluZyB0byBkZWNvZGUuXG4gKiBAcmV0dXJucyBUaGUgZGVjb2RlZCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGRlY29kZVhNTChzdHIpIHtcbiAgICByZXR1cm4geG1sRGVjb2RlcihzdHIsIHRydWUpO1xufVxuZXhwb3J0cy5kZWNvZGVYTUwgPSBkZWNvZGVYTUw7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kZWNvZGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG4vLyBBZGFwdGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL21hdGhpYXNieW5lbnMvaGUvYmxvYi8zNmFmZTE3OTM5MjIyNmNmMWI2Y2NkYjE2ZWJiYjdhNWE4NDRkOTNhL3NyYy9oZS5qcyNMMTA2LUwxMzRcbnZhciBfYTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMucmVwbGFjZUNvZGVQb2ludCA9IGV4cG9ydHMuZnJvbUNvZGVQb2ludCA9IHZvaWQgMDtcbnZhciBkZWNvZGVNYXAgPSBuZXcgTWFwKFtcbiAgICBbMCwgNjU1MzNdLFxuICAgIFsxMjgsIDgzNjRdLFxuICAgIFsxMzAsIDgyMThdLFxuICAgIFsxMzEsIDQwMl0sXG4gICAgWzEzMiwgODIyMl0sXG4gICAgWzEzMywgODIzMF0sXG4gICAgWzEzNCwgODIyNF0sXG4gICAgWzEzNSwgODIyNV0sXG4gICAgWzEzNiwgNzEwXSxcbiAgICBbMTM3LCA4MjQwXSxcbiAgICBbMTM4LCAzNTJdLFxuICAgIFsxMzksIDgyNDldLFxuICAgIFsxNDAsIDMzOF0sXG4gICAgWzE0MiwgMzgxXSxcbiAgICBbMTQ1LCA4MjE2XSxcbiAgICBbMTQ2LCA4MjE3XSxcbiAgICBbMTQ3LCA4MjIwXSxcbiAgICBbMTQ4LCA4MjIxXSxcbiAgICBbMTQ5LCA4MjI2XSxcbiAgICBbMTUwLCA4MjExXSxcbiAgICBbMTUxLCA4MjEyXSxcbiAgICBbMTUyLCA3MzJdLFxuICAgIFsxNTMsIDg0ODJdLFxuICAgIFsxNTQsIDM1M10sXG4gICAgWzE1NSwgODI1MF0sXG4gICAgWzE1NiwgMzM5XSxcbiAgICBbMTU4LCAzODJdLFxuICAgIFsxNTksIDM3Nl0sXG5dKTtcbmV4cG9ydHMuZnJvbUNvZGVQb2ludCA9IFxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bm5lY2Vzc2FyeS1jb25kaXRpb24sIG5vZGUvbm8tdW5zdXBwb3J0ZWQtZmVhdHVyZXMvZXMtYnVpbHRpbnNcbihfYSA9IFN0cmluZy5mcm9tQ29kZVBvaW50KSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiBmdW5jdGlvbiAoY29kZVBvaW50KSB7XG4gICAgdmFyIG91dHB1dCA9IFwiXCI7XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4ZmZmZikge1xuICAgICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMDtcbiAgICAgICAgb3V0cHV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKChjb2RlUG9pbnQgPj4+IDEwKSAmIDB4M2ZmKSB8IDB4ZDgwMCk7XG4gICAgICAgIGNvZGVQb2ludCA9IDB4ZGMwMCB8IChjb2RlUG9pbnQgJiAweDNmZik7XG4gICAgfVxuICAgIG91dHB1dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGVQb2ludCk7XG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5mdW5jdGlvbiByZXBsYWNlQ29kZVBvaW50KGNvZGVQb2ludCkge1xuICAgIHZhciBfYTtcbiAgICBpZiAoKGNvZGVQb2ludCA+PSAweGQ4MDAgJiYgY29kZVBvaW50IDw9IDB4ZGZmZikgfHwgY29kZVBvaW50ID4gMHgxMGZmZmYpIHtcbiAgICAgICAgcmV0dXJuIDB4ZmZmZDtcbiAgICB9XG4gICAgcmV0dXJuIChfYSA9IGRlY29kZU1hcC5nZXQoY29kZVBvaW50KSkgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDogY29kZVBvaW50O1xufVxuZXhwb3J0cy5yZXBsYWNlQ29kZVBvaW50ID0gcmVwbGFjZUNvZGVQb2ludDtcbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludChjb2RlUG9pbnQpIHtcbiAgICByZXR1cm4gKDAsIGV4cG9ydHMuZnJvbUNvZGVQb2ludCkocmVwbGFjZUNvZGVQb2ludChjb2RlUG9pbnQpKTtcbn1cbmV4cG9ydHMuZGVmYXVsdCA9IGRlY29kZUNvZGVQb2ludDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRlY29kZV9jb2RlcG9pbnQuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmVzY2FwZVRleHQgPSBleHBvcnRzLmVzY2FwZUF0dHJpYnV0ZSA9IGV4cG9ydHMuZXNjYXBlVVRGOCA9IGV4cG9ydHMuZXNjYXBlID0gZXhwb3J0cy5lbmNvZGVYTUwgPSBleHBvcnRzLmdldENvZGVQb2ludCA9IGV4cG9ydHMueG1sUmVwbGFjZXIgPSB2b2lkIDA7XG5leHBvcnRzLnhtbFJlcGxhY2VyID0gL1tcIiYnPD4kXFx4ODAtXFx1RkZGRl0vZztcbnZhciB4bWxDb2RlTWFwID0gbmV3IE1hcChbXG4gICAgWzM0LCBcIiZxdW90O1wiXSxcbiAgICBbMzgsIFwiJmFtcDtcIl0sXG4gICAgWzM5LCBcIiZhcG9zO1wiXSxcbiAgICBbNjAsIFwiJmx0O1wiXSxcbiAgICBbNjIsIFwiJmd0O1wiXSxcbl0pO1xuLy8gRm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub2RlIDwgNCwgd2Ugd3JhcCBgY29kZVBvaW50QXRgXG5leHBvcnRzLmdldENvZGVQb2ludCA9IFxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bm5lY2Vzc2FyeS1jb25kaXRpb25cblN0cmluZy5wcm90b3R5cGUuY29kZVBvaW50QXQgIT0gbnVsbFxuICAgID8gZnVuY3Rpb24gKHN0ciwgaW5kZXgpIHsgcmV0dXJuIHN0ci5jb2RlUG9pbnRBdChpbmRleCk7IH1cbiAgICA6IC8vIGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmcjc3Vycm9nYXRlLWZvcm11bGFlXG4gICAgICAgIGZ1bmN0aW9uIChjLCBpbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIChjLmNoYXJDb2RlQXQoaW5kZXgpICYgMHhmYzAwKSA9PT0gMHhkODAwXG4gICAgICAgICAgICAgICAgPyAoYy5jaGFyQ29kZUF0KGluZGV4KSAtIDB4ZDgwMCkgKiAweDQwMCArXG4gICAgICAgICAgICAgICAgICAgIGMuY2hhckNvZGVBdChpbmRleCArIDEpIC1cbiAgICAgICAgICAgICAgICAgICAgMHhkYzAwICtcbiAgICAgICAgICAgICAgICAgICAgMHgxMDAwMFxuICAgICAgICAgICAgICAgIDogYy5jaGFyQ29kZUF0KGluZGV4KTtcbiAgICAgICAgfTtcbi8qKlxuICogRW5jb2RlcyBhbGwgbm9uLUFTQ0lJIGNoYXJhY3RlcnMsIGFzIHdlbGwgYXMgY2hhcmFjdGVycyBub3QgdmFsaWQgaW4gWE1MXG4gKiBkb2N1bWVudHMgdXNpbmcgWE1MIGVudGl0aWVzLlxuICpcbiAqIElmIGEgY2hhcmFjdGVyIGhhcyBubyBlcXVpdmFsZW50IGVudGl0eSwgYVxuICogbnVtZXJpYyBoZXhhZGVjaW1hbCByZWZlcmVuY2UgKGVnLiBgJiN4ZmM7YCkgd2lsbCBiZSB1c2VkLlxuICovXG5mdW5jdGlvbiBlbmNvZGVYTUwoc3RyKSB7XG4gICAgdmFyIHJldCA9IFwiXCI7XG4gICAgdmFyIGxhc3RJZHggPSAwO1xuICAgIHZhciBtYXRjaDtcbiAgICB3aGlsZSAoKG1hdGNoID0gZXhwb3J0cy54bWxSZXBsYWNlci5leGVjKHN0cikpICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBpID0gbWF0Y2guaW5kZXg7XG4gICAgICAgIHZhciBjaGFyID0gc3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIHZhciBuZXh0ID0geG1sQ29kZU1hcC5nZXQoY2hhcik7XG4gICAgICAgIGlmIChuZXh0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldCArPSBzdHIuc3Vic3RyaW5nKGxhc3RJZHgsIGkpICsgbmV4dDtcbiAgICAgICAgICAgIGxhc3RJZHggPSBpICsgMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldCArPSBcIlwiLmNvbmNhdChzdHIuc3Vic3RyaW5nKGxhc3RJZHgsIGkpLCBcIiYjeFwiKS5jb25jYXQoKDAsIGV4cG9ydHMuZ2V0Q29kZVBvaW50KShzdHIsIGkpLnRvU3RyaW5nKDE2KSwgXCI7XCIpO1xuICAgICAgICAgICAgLy8gSW5jcmVhc2UgYnkgMSBpZiB3ZSBoYXZlIGEgc3Vycm9nYXRlIHBhaXJcbiAgICAgICAgICAgIGxhc3RJZHggPSBleHBvcnRzLnhtbFJlcGxhY2VyLmxhc3RJbmRleCArPSBOdW1iZXIoKGNoYXIgJiAweGZjMDApID09PSAweGQ4MDApO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQgKyBzdHIuc3Vic3RyKGxhc3RJZHgpO1xufVxuZXhwb3J0cy5lbmNvZGVYTUwgPSBlbmNvZGVYTUw7XG4vKipcbiAqIEVuY29kZXMgYWxsIG5vbi1BU0NJSSBjaGFyYWN0ZXJzLCBhcyB3ZWxsIGFzIGNoYXJhY3RlcnMgbm90IHZhbGlkIGluIFhNTFxuICogZG9jdW1lbnRzIHVzaW5nIG51bWVyaWMgaGV4YWRlY2ltYWwgcmVmZXJlbmNlIChlZy4gYCYjeGZjO2ApLlxuICpcbiAqIEhhdmUgYSBsb29rIGF0IGBlc2NhcGVVVEY4YCBpZiB5b3Ugd2FudCBhIG1vcmUgY29uY2lzZSBvdXRwdXQgYXQgdGhlIGV4cGVuc2VcbiAqIG9mIHJlZHVjZWQgdHJhbnNwb3J0YWJpbGl0eS5cbiAqXG4gKiBAcGFyYW0gZGF0YSBTdHJpbmcgdG8gZXNjYXBlLlxuICovXG5leHBvcnRzLmVzY2FwZSA9IGVuY29kZVhNTDtcbmZ1bmN0aW9uIGdldEVzY2FwZXIocmVnZXgsIG1hcCkge1xuICAgIHJldHVybiBmdW5jdGlvbiBlc2NhcGUoZGF0YSkge1xuICAgICAgICB2YXIgbWF0Y2g7XG4gICAgICAgIHZhciBsYXN0SWR4ID0gMDtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFwiXCI7XG4gICAgICAgIHdoaWxlICgobWF0Y2ggPSByZWdleC5leGVjKGRhdGEpKSkge1xuICAgICAgICAgICAgaWYgKGxhc3RJZHggIT09IG1hdGNoLmluZGV4KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGRhdGEuc3Vic3RyaW5nKGxhc3RJZHgsIG1hdGNoLmluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFdlIGtub3cgdGhhdCB0aGlzIGNoYXJhcmN0ZXIgd2lsbCBiZSBpbiB0aGUgbWFwLlxuICAgICAgICAgICAgcmVzdWx0ICs9IG1hcC5nZXQobWF0Y2hbMF0uY2hhckNvZGVBdCgwKSk7XG4gICAgICAgICAgICAvLyBFdmVyeSBtYXRjaCB3aWxsIGJlIG9mIGxlbmd0aCAxXG4gICAgICAgICAgICBsYXN0SWR4ID0gbWF0Y2guaW5kZXggKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQgKyBkYXRhLnN1YnN0cmluZyhsYXN0SWR4KTtcbiAgICB9O1xufVxuLyoqXG4gKiBFbmNvZGVzIGFsbCBjaGFyYWN0ZXJzIG5vdCB2YWxpZCBpbiBYTUwgZG9jdW1lbnRzIHVzaW5nIFhNTCBlbnRpdGllcy5cbiAqXG4gKiBOb3RlIHRoYXQgdGhlIG91dHB1dCB3aWxsIGJlIGNoYXJhY3Rlci1zZXQgZGVwZW5kZW50LlxuICpcbiAqIEBwYXJhbSBkYXRhIFN0cmluZyB0byBlc2NhcGUuXG4gKi9cbmV4cG9ydHMuZXNjYXBlVVRGOCA9IGdldEVzY2FwZXIoL1smPD4nXCJdL2csIHhtbENvZGVNYXApO1xuLyoqXG4gKiBFbmNvZGVzIGFsbCBjaGFyYWN0ZXJzIHRoYXQgaGF2ZSB0byBiZSBlc2NhcGVkIGluIEhUTUwgYXR0cmlidXRlcyxcbiAqIGZvbGxvd2luZyB7QGxpbmsgaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2UvcGFyc2luZy5odG1sI2VzY2FwaW5nU3RyaW5nfS5cbiAqXG4gKiBAcGFyYW0gZGF0YSBTdHJpbmcgdG8gZXNjYXBlLlxuICovXG5leHBvcnRzLmVzY2FwZUF0dHJpYnV0ZSA9IGdldEVzY2FwZXIoL1tcIiZcXHUwMEEwXS9nLCBuZXcgTWFwKFtcbiAgICBbMzQsIFwiJnF1b3Q7XCJdLFxuICAgIFszOCwgXCImYW1wO1wiXSxcbiAgICBbMTYwLCBcIiZuYnNwO1wiXSxcbl0pKTtcbi8qKlxuICogRW5jb2RlcyBhbGwgY2hhcmFjdGVycyB0aGF0IGhhdmUgdG8gYmUgZXNjYXBlZCBpbiBIVE1MIHRleHQsXG4gKiBmb2xsb3dpbmcge0BsaW5rIGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvbXVsdGlwYWdlL3BhcnNpbmcuaHRtbCNlc2NhcGluZ1N0cmluZ30uXG4gKlxuICogQHBhcmFtIGRhdGEgU3RyaW5nIHRvIGVzY2FwZS5cbiAqL1xuZXhwb3J0cy5lc2NhcGVUZXh0ID0gZ2V0RXNjYXBlcigvWyY8PlxcdTAwQTBdL2csIG5ldyBNYXAoW1xuICAgIFszOCwgXCImYW1wO1wiXSxcbiAgICBbNjAsIFwiJmx0O1wiXSxcbiAgICBbNjIsIFwiJmd0O1wiXSxcbiAgICBbMTYwLCBcIiZuYnNwO1wiXSxcbl0pKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWVzY2FwZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbi8vIEdlbmVyYXRlZCB1c2luZyBzY3JpcHRzL3dyaXRlLWRlY29kZS1tYXAudHNcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuZGVmYXVsdCA9IG5ldyBVaW50MTZBcnJheShcbi8vIHByZXR0aWVyLWlnbm9yZVxuXCJcXHUxZDQxPFxceGQ1XFx1MDEzMVxcdTAyOGFcXHUwNDlkXFx1MDU3YlxcdTA1ZDBcXHUwNjc1XFx1MDZkZVxcdTA3YTJcXHUwN2Q2XFx1MDgwZlxcdTBhNGFcXHUwYTkxXFx1MGRhMVxcdTBlNmRcXHUwZjA5XFx1MGYyNlxcdTEwY2FcXHUxMjI4XFx1MTJlMVxcdTE0MTVcXHUxNDlkXFx1MTRjM1xcdTE0ZGZcXHUxNTI1XFwwXFwwXFwwXFwwXFwwXFwwXFx1MTU2YlxcdTE2Y2RcXHUxOThkXFx1MWMxMlxcdTFkZGRcXHUxZjdlXFx1MjA2MFxcdTIxYjBcXHUyMjhkXFx1MjNjMFxcdTIzZmJcXHUyNDQyXFx1MjgyNFxcdTI5MTJcXHUyZDA4XFx1MmU0OFxcdTJmY2VcXHUzMDE2XFx1MzJiYVxcdTM2MzlcXHUzN2FjXFx1MzhmZVxcdTNhMjhcXHUzYTcxXFx1M2FlMFxcdTNiMmVcXHUwODAwRU1hYmNmZ2xtbm9wcnN0dVxcXFxiZm1zXFx4N2ZcXHg4NFxceDhiXFx4OTBcXHg5NVxceDk4XFx4YTZcXHhiM1xceGI5XFx4YzhcXHhjZmxpZ1xcdTgwM2JcXHhjNlxcdTQwYzZQXFx1ODAzYiZcXHU0MDI2Y3V0ZVxcdTgwM2JcXHhjMVxcdTQwYzFyZXZlO1xcdTQxMDJcXHUwMTAwaXl4fXJjXFx1ODAzYlxceGMyXFx1NDBjMjtcXHU0NDEwcjtcXHVjMDAwXFx1ZDgzNVxcdWRkMDRyYXZlXFx1ODAzYlxceGMwXFx1NDBjMHBoYTtcXHU0MzkxYWNyO1xcdTQxMDBkO1xcdTZhNTNcXHUwMTAwZ3BcXHg5ZFxceGExb247XFx1NDEwNGY7XFx1YzAwMFxcdWQ4MzVcXHVkZDM4cGx5RnVuY3Rpb247XFx1NjA2MWluZ1xcdTgwM2JcXHhjNVxcdTQwYzVcXHUwMTAwY3NcXHhiZVxceGMzcjtcXHVjMDAwXFx1ZDgzNVxcdWRjOWNpZ247XFx1NjI1NGlsZGVcXHU4MDNiXFx4YzNcXHU0MGMzbWxcXHU4MDNiXFx4YzRcXHU0MGM0XFx1MDQwMGFjZWZvcnN1XFx4ZTVcXHhmYlxceGZlXFx1MDExN1xcdTAxMWNcXHUwMTIyXFx1MDEyN1xcdTAxMmFcXHUwMTAwY3JcXHhlYVxceGYya3NsYXNoO1xcdTYyMTZcXHUwMTc2XFx4ZjZcXHhmODtcXHU2YWU3ZWQ7XFx1NjMwNnk7XFx1NDQxMVxcdTAxODBjcnRcXHUwMTA1XFx1MDEwYlxcdTAxMTRhdXNlO1xcdTYyMzVub3VsbGlzO1xcdTYxMmNhO1xcdTQzOTJyO1xcdWMwMDBcXHVkODM1XFx1ZGQwNXBmO1xcdWMwMDBcXHVkODM1XFx1ZGQzOWV2ZTtcXHU0MmQ4Y1xceGYyXFx1MDExM21wZXE7XFx1NjI0ZVxcdTA3MDBIT2FjZGVmaGlsb3JzdVxcdTAxNGRcXHUwMTUxXFx1MDE1NlxcdTAxODBcXHUwMTllXFx1MDFhMlxcdTAxYjVcXHUwMWI3XFx1MDFiYVxcdTAxZGNcXHUwMjE1XFx1MDI3M1xcdTAyNzhcXHUwMjdlY3k7XFx1NDQyN1BZXFx1ODAzYlxceGE5XFx1NDBhOVxcdTAxODBjcHlcXHUwMTVkXFx1MDE2MlxcdTAxN2F1dGU7XFx1NDEwNlxcdTAxMDA7aVxcdTAxNjdcXHUwMTY4XFx1NjJkMnRhbERpZmZlcmVudGlhbEQ7XFx1NjE0NWxleXM7XFx1NjEyZFxcdTAyMDBhZWlvXFx1MDE4OVxcdTAxOGVcXHUwMTk0XFx1MDE5OHJvbjtcXHU0MTBjZGlsXFx1ODAzYlxceGM3XFx1NDBjN3JjO1xcdTQxMDhuaW50O1xcdTYyMzBvdDtcXHU0MTBhXFx1MDEwMGRuXFx1MDFhN1xcdTAxYWRpbGxhO1xcdTQwYjh0ZXJEb3Q7XFx1NDBiN1xceGYyXFx1MDE3Zmk7XFx1NDNhN3JjbGVcXHUwMjAwRE1QVFxcdTAxYzdcXHUwMWNiXFx1MDFkMVxcdTAxZDZvdDtcXHU2Mjk5aW51cztcXHU2Mjk2bHVzO1xcdTYyOTVpbWVzO1xcdTYyOTdvXFx1MDEwMGNzXFx1MDFlMlxcdTAxZjhrd2lzZUNvbnRvdXJJbnRlZ3JhbDtcXHU2MjMyZUN1cmx5XFx1MDEwMERRXFx1MDIwM1xcdTAyMGZvdWJsZVF1b3RlO1xcdTYwMWR1b3RlO1xcdTYwMTlcXHUwMjAwbG5wdVxcdTAyMWVcXHUwMjI4XFx1MDI0N1xcdTAyNTVvblxcdTAxMDA7ZVxcdTAyMjVcXHUwMjI2XFx1NjIzNztcXHU2YTc0XFx1MDE4MGdpdFxcdTAyMmZcXHUwMjM2XFx1MDIzYXJ1ZW50O1xcdTYyNjFudDtcXHU2MjJmb3VySW50ZWdyYWw7XFx1NjIyZVxcdTAxMDBmclxcdTAyNGNcXHUwMjRlO1xcdTYxMDJvZHVjdDtcXHU2MjEwbnRlckNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbDtcXHU2MjMzb3NzO1xcdTZhMmZjcjtcXHVjMDAwXFx1ZDgzNVxcdWRjOWVwXFx1MDEwMDtDXFx1MDI4NFxcdTAyODVcXHU2MmQzYXA7XFx1NjI0ZFxcdTA1ODBESlNaYWNlZmlvc1xcdTAyYTBcXHUwMmFjXFx1MDJiMFxcdTAyYjRcXHUwMmI4XFx1MDJjYlxcdTAyZDdcXHUwMmUxXFx1MDJlNlxcdTAzMzNcXHUwNDhkXFx1MDEwMDtvXFx1MDE3OVxcdTAyYTV0cmFoZDtcXHU2OTExY3k7XFx1NDQwMmN5O1xcdTQ0MDVjeTtcXHU0NDBmXFx1MDE4MGdyc1xcdTAyYmZcXHUwMmM0XFx1MDJjN2dlcjtcXHU2MDIxcjtcXHU2MWExaHY7XFx1NmFlNFxcdTAxMDBheVxcdTAyZDBcXHUwMmQ1cm9uO1xcdTQxMGU7XFx1NDQxNGxcXHUwMTAwO3RcXHUwMmRkXFx1MDJkZVxcdTYyMDdhO1xcdTQzOTRyO1xcdWMwMDBcXHVkODM1XFx1ZGQwN1xcdTAxMDBhZlxcdTAyZWJcXHUwMzI3XFx1MDEwMGNtXFx1MDJmMFxcdTAzMjJyaXRpY2FsXFx1MDIwMEFER1RcXHUwMzAwXFx1MDMwNlxcdTAzMTZcXHUwMzFjY3V0ZTtcXHU0MGI0b1xcdTAxNzRcXHUwMzBiXFx1MDMwZDtcXHU0MmQ5YmxlQWN1dGU7XFx1NDJkZHJhdmU7XFx1NDA2MGlsZGU7XFx1NDJkY29uZDtcXHU2MmM0ZmVyZW50aWFsRDtcXHU2MTQ2XFx1MDQ3MFxcdTAzM2RcXDBcXDBcXDBcXHUwMzQyXFx1MDM1NFxcMFxcdTA0MDVmO1xcdWMwMDBcXHVkODM1XFx1ZGQzYlxcdTAxODA7REVcXHUwMzQ4XFx1MDM0OVxcdTAzNGRcXHU0MGE4b3Q7XFx1NjBkY3F1YWw7XFx1NjI1MGJsZVxcdTAzMDBDRExSVVZcXHUwMzYzXFx1MDM3MlxcdTAzODJcXHUwM2NmXFx1MDNlMlxcdTAzZjhvbnRvdXJJbnRlZ3JhXFx4ZWNcXHUwMjM5b1xcdTAyNzRcXHUwMzc5XFwwXFwwXFx1MDM3YlxceGJiXFx1MDM0OW5BcnJvdztcXHU2MWQzXFx1MDEwMGVvXFx1MDM4N1xcdTAzYTRmdFxcdTAxODBBUlRcXHUwMzkwXFx1MDM5NlxcdTAzYTFycm93O1xcdTYxZDBpZ2h0QXJyb3c7XFx1NjFkNGVcXHhlNVxcdTAyY2FuZ1xcdTAxMDBMUlxcdTAzYWJcXHUwM2M0ZWZ0XFx1MDEwMEFSXFx1MDNiM1xcdTAzYjlycm93O1xcdTY3ZjhpZ2h0QXJyb3c7XFx1NjdmYWlnaHRBcnJvdztcXHU2N2Y5aWdodFxcdTAxMDBBVFxcdTAzZDhcXHUwM2RlcnJvdztcXHU2MWQyZWU7XFx1NjJhOHBcXHUwMjQxXFx1MDNlOVxcMFxcMFxcdTAzZWZycm93O1xcdTYxZDFvd25BcnJvdztcXHU2MWQ1ZXJ0aWNhbEJhcjtcXHU2MjI1blxcdTAzMDBBQkxSVGFcXHUwNDEyXFx1MDQyYVxcdTA0MzBcXHUwNDVlXFx1MDQ3ZlxcdTAzN2Nycm93XFx1MDE4MDtCVVxcdTA0MWRcXHUwNDFlXFx1MDQyMlxcdTYxOTNhcjtcXHU2OTEzcEFycm93O1xcdTYxZjVyZXZlO1xcdTQzMTFlZnRcXHUwMmQyXFx1MDQzYVxcMFxcdTA0NDZcXDBcXHUwNDUwaWdodFZlY3RvcjtcXHU2OTUwZWVWZWN0b3I7XFx1Njk1ZWVjdG9yXFx1MDEwMDtCXFx1MDQ1OVxcdTA0NWFcXHU2MWJkYXI7XFx1Njk1NmlnaHRcXHUwMWQ0XFx1MDQ2N1xcMFxcdTA0NzFlZVZlY3RvcjtcXHU2OTVmZWN0b3JcXHUwMTAwO0JcXHUwNDdhXFx1MDQ3YlxcdTYxYzFhcjtcXHU2OTU3ZWVcXHUwMTAwO0FcXHUwNDg2XFx1MDQ4N1xcdTYyYTRycm93O1xcdTYxYTdcXHUwMTAwY3RcXHUwNDkyXFx1MDQ5N3I7XFx1YzAwMFxcdWQ4MzVcXHVkYzlmcm9rO1xcdTQxMTBcXHUwODAwTlRhY2RmZ2xtb3Bxc3R1eFxcdTA0YmRcXHUwNGMwXFx1MDRjNFxcdTA0Y2JcXHUwNGRlXFx1MDRlMlxcdTA0ZTdcXHUwNGVlXFx1MDRmNVxcdTA1MjFcXHUwNTJmXFx1MDUzNlxcdTA1NTJcXHUwNTVkXFx1MDU2MFxcdTA1NjVHO1xcdTQxNGFIXFx1ODAzYlxceGQwXFx1NDBkMGN1dGVcXHU4MDNiXFx4YzlcXHU0MGM5XFx1MDE4MGFpeVxcdTA0ZDJcXHUwNGQ3XFx1MDRkY3JvbjtcXHU0MTFhcmNcXHU4MDNiXFx4Y2FcXHU0MGNhO1xcdTQ0MmRvdDtcXHU0MTE2cjtcXHVjMDAwXFx1ZDgzNVxcdWRkMDhyYXZlXFx1ODAzYlxceGM4XFx1NDBjOGVtZW50O1xcdTYyMDhcXHUwMTAwYXBcXHUwNGZhXFx1MDRmZWNyO1xcdTQxMTJ0eVxcdTAyNTNcXHUwNTA2XFwwXFwwXFx1MDUxMm1hbGxTcXVhcmU7XFx1NjVmYmVyeVNtYWxsU3F1YXJlO1xcdTY1YWJcXHUwMTAwZ3BcXHUwNTI2XFx1MDUyYW9uO1xcdTQxMThmO1xcdWMwMDBcXHVkODM1XFx1ZGQzY3NpbG9uO1xcdTQzOTV1XFx1MDEwMGFpXFx1MDUzY1xcdTA1NDlsXFx1MDEwMDtUXFx1MDU0MlxcdTA1NDNcXHU2YTc1aWxkZTtcXHU2MjQybGlicml1bTtcXHU2MWNjXFx1MDEwMGNpXFx1MDU1N1xcdTA1NWFyO1xcdTYxMzBtO1xcdTZhNzNhO1xcdTQzOTdtbFxcdTgwM2JcXHhjYlxcdTQwY2JcXHUwMTAwaXBcXHUwNTZhXFx1MDU2ZnN0cztcXHU2MjAzb25lbnRpYWxFO1xcdTYxNDdcXHUwMjgwY2Zpb3NcXHUwNTg1XFx1MDU4OFxcdTA1OGRcXHUwNWIyXFx1MDVjY3k7XFx1NDQyNHI7XFx1YzAwMFxcdWQ4MzVcXHVkZDA5bGxlZFxcdTAyNTNcXHUwNTk3XFwwXFwwXFx1MDVhM21hbGxTcXVhcmU7XFx1NjVmY2VyeVNtYWxsU3F1YXJlO1xcdTY1YWFcXHUwMzcwXFx1MDViYVxcMFxcdTA1YmZcXDBcXDBcXHUwNWM0ZjtcXHVjMDAwXFx1ZDgzNVxcdWRkM2RBbGw7XFx1NjIwMHJpZXJ0cmY7XFx1NjEzMWNcXHhmMlxcdTA1Y2JcXHUwNjAwSlRhYmNkZmdvcnN0XFx1MDVlOFxcdTA1ZWNcXHUwNWVmXFx1MDVmYVxcdTA2MDBcXHUwNjEyXFx1MDYxNlxcdTA2MWJcXHUwNjFkXFx1MDYyM1xcdTA2NmNcXHUwNjcyY3k7XFx1NDQwM1xcdTgwM2I+XFx1NDAzZW1tYVxcdTAxMDA7ZFxcdTA1ZjdcXHUwNWY4XFx1NDM5MztcXHU0M2RjcmV2ZTtcXHU0MTFlXFx1MDE4MGVpeVxcdTA2MDdcXHUwNjBjXFx1MDYxMGRpbDtcXHU0MTIycmM7XFx1NDExYztcXHU0NDEzb3Q7XFx1NDEyMHI7XFx1YzAwMFxcdWQ4MzVcXHVkZDBhO1xcdTYyZDlwZjtcXHVjMDAwXFx1ZDgzNVxcdWRkM2VlYXRlclxcdTAzMDBFRkdMU1RcXHUwNjM1XFx1MDY0NFxcdTA2NGVcXHUwNjU2XFx1MDY1YlxcdTA2NjZxdWFsXFx1MDEwMDtMXFx1MDYzZVxcdTA2M2ZcXHU2MjY1ZXNzO1xcdTYyZGJ1bGxFcXVhbDtcXHU2MjY3cmVhdGVyO1xcdTZhYTJlc3M7XFx1NjI3N2xhbnRFcXVhbDtcXHU2YTdlaWxkZTtcXHU2MjczY3I7XFx1YzAwMFxcdWQ4MzVcXHVkY2EyO1xcdTYyNmJcXHUwNDAwQWFjZmlvc3VcXHUwNjg1XFx1MDY4YlxcdTA2OTZcXHUwNjliXFx1MDY5ZVxcdTA2YWFcXHUwNmJlXFx1MDZjYVJEY3k7XFx1NDQyYVxcdTAxMDBjdFxcdTA2OTBcXHUwNjk0ZWs7XFx1NDJjNztcXHU0MDVlaXJjO1xcdTQxMjRyO1xcdTYxMGNsYmVydFNwYWNlO1xcdTYxMGJcXHUwMWYwXFx1MDZhZlxcMFxcdTA2YjJmO1xcdTYxMGRpem9udGFsTGluZTtcXHU2NTAwXFx1MDEwMGN0XFx1MDZjM1xcdTA2YzVcXHhmMlxcdTA2YTlyb2s7XFx1NDEyNm1wXFx1MDE0NFxcdTA2ZDBcXHUwNmQ4b3duSHVtXFx4ZjBcXHUwMTJmcXVhbDtcXHU2MjRmXFx1MDcwMEVKT2FjZGZnbW5vc3R1XFx1MDZmYVxcdTA2ZmVcXHUwNzAzXFx1MDcwN1xcdTA3MGVcXHUwNzFhXFx1MDcxZVxcdTA3MjFcXHUwNzI4XFx1MDc0NFxcdTA3NzhcXHUwNzhiXFx1MDc4ZlxcdTA3OTVjeTtcXHU0NDE1bGlnO1xcdTQxMzJjeTtcXHU0NDAxY3V0ZVxcdTgwM2JcXHhjZFxcdTQwY2RcXHUwMTAwaXlcXHUwNzEzXFx1MDcxOHJjXFx1ODAzYlxceGNlXFx1NDBjZTtcXHU0NDE4b3Q7XFx1NDEzMHI7XFx1NjExMXJhdmVcXHU4MDNiXFx4Y2NcXHU0MGNjXFx1MDE4MDthcFxcdTA3MjBcXHUwNzJmXFx1MDczZlxcdTAxMDBjZ1xcdTA3MzRcXHUwNzM3cjtcXHU0MTJhaW5hcnlJO1xcdTYxNDhsaWVcXHhmM1xcdTAzZGRcXHUwMWY0XFx1MDc0OVxcMFxcdTA3NjJcXHUwMTAwO2VcXHUwNzRkXFx1MDc0ZVxcdTYyMmNcXHUwMTAwZ3JcXHUwNzUzXFx1MDc1OHJhbDtcXHU2MjJic2VjdGlvbjtcXHU2MmMyaXNpYmxlXFx1MDEwMENUXFx1MDc2Y1xcdTA3NzJvbW1hO1xcdTYwNjNpbWVzO1xcdTYwNjJcXHUwMTgwZ3B0XFx1MDc3ZlxcdTA3ODNcXHUwNzg4b247XFx1NDEyZWY7XFx1YzAwMFxcdWQ4MzVcXHVkZDQwYTtcXHU0Mzk5Y3I7XFx1NjExMGlsZGU7XFx1NDEyOFxcdTAxZWJcXHUwNzlhXFwwXFx1MDc5ZWN5O1xcdTQ0MDZsXFx1ODAzYlxceGNmXFx1NDBjZlxcdTAyODBjZm9zdVxcdTA3YWNcXHUwN2I3XFx1MDdiY1xcdTA3YzJcXHUwN2QwXFx1MDEwMGl5XFx1MDdiMVxcdTA3YjVyYztcXHU0MTM0O1xcdTQ0MTlyO1xcdWMwMDBcXHVkODM1XFx1ZGQwZHBmO1xcdWMwMDBcXHVkODM1XFx1ZGQ0MVxcdTAxZTNcXHUwN2M3XFwwXFx1MDdjY3I7XFx1YzAwMFxcdWQ4MzVcXHVkY2E1cmN5O1xcdTQ0MDhrY3k7XFx1NDQwNFxcdTAzODBISmFjZm9zXFx1MDdlNFxcdTA3ZThcXHUwN2VjXFx1MDdmMVxcdTA3ZmRcXHUwODAyXFx1MDgwOGN5O1xcdTQ0MjVjeTtcXHU0NDBjcHBhO1xcdTQzOWFcXHUwMTAwZXlcXHUwN2Y2XFx1MDdmYmRpbDtcXHU0MTM2O1xcdTQ0MWFyO1xcdWMwMDBcXHVkODM1XFx1ZGQwZXBmO1xcdWMwMDBcXHVkODM1XFx1ZGQ0MmNyO1xcdWMwMDBcXHVkODM1XFx1ZGNhNlxcdTA1ODBKVGFjZWZsbW9zdFxcdTA4MjVcXHUwODI5XFx1MDgyY1xcdTA4NTBcXHUwODYzXFx1MDliM1xcdTA5YjhcXHUwOWM3XFx1MDljZFxcdTBhMzdcXHUwYTQ3Y3k7XFx1NDQwOVxcdTgwM2I8XFx1NDAzY1xcdTAyODBjbW5wclxcdTA4MzdcXHUwODNjXFx1MDg0MVxcdTA4NDRcXHUwODRkdXRlO1xcdTQxMzliZGE7XFx1NDM5Ymc7XFx1NjdlYWxhY2V0cmY7XFx1NjExMnI7XFx1NjE5ZVxcdTAxODBhZXlcXHUwODU3XFx1MDg1Y1xcdTA4NjFyb247XFx1NDEzZGRpbDtcXHU0MTNiO1xcdTQ0MWJcXHUwMTAwZnNcXHUwODY4XFx1MDk3MHRcXHUwNTAwQUNERlJUVVZhclxcdTA4N2VcXHUwOGE5XFx1MDhiMVxcdTA4ZTBcXHUwOGU2XFx1MDhmY1xcdTA5MmZcXHUwOTViXFx1MDM5MFxcdTA5NmFcXHUwMTAwbnJcXHUwODgzXFx1MDg4ZmdsZUJyYWNrZXQ7XFx1NjdlOHJvd1xcdTAxODA7QlJcXHUwODk5XFx1MDg5YVxcdTA4OWVcXHU2MTkwYXI7XFx1NjFlNGlnaHRBcnJvdztcXHU2MWM2ZWlsaW5nO1xcdTYzMDhvXFx1MDFmNVxcdTA4YjdcXDBcXHUwOGMzYmxlQnJhY2tldDtcXHU2N2U2blxcdTAxZDRcXHUwOGM4XFwwXFx1MDhkMmVlVmVjdG9yO1xcdTY5NjFlY3RvclxcdTAxMDA7QlxcdTA4ZGJcXHUwOGRjXFx1NjFjM2FyO1xcdTY5NTlsb29yO1xcdTYzMGFpZ2h0XFx1MDEwMEFWXFx1MDhlZlxcdTA4ZjVycm93O1xcdTYxOTRlY3RvcjtcXHU2OTRlXFx1MDEwMGVyXFx1MDkwMVxcdTA5MTdlXFx1MDE4MDtBVlxcdTA5MDlcXHUwOTBhXFx1MDkxMFxcdTYyYTNycm93O1xcdTYxYTRlY3RvcjtcXHU2OTVhaWFuZ2xlXFx1MDE4MDtCRVxcdTA5MjRcXHUwOTI1XFx1MDkyOVxcdTYyYjJhcjtcXHU2OWNmcXVhbDtcXHU2MmI0cFxcdTAxODBEVFZcXHUwOTM3XFx1MDk0MlxcdTA5NGNvd25WZWN0b3I7XFx1Njk1MWVlVmVjdG9yO1xcdTY5NjBlY3RvclxcdTAxMDA7QlxcdTA5NTZcXHUwOTU3XFx1NjFiZmFyO1xcdTY5NThlY3RvclxcdTAxMDA7QlxcdTA5NjVcXHUwOTY2XFx1NjFiY2FyO1xcdTY5NTJpZ2h0XFx4ZTFcXHUwMzljc1xcdTAzMDBFRkdMU1RcXHUwOTdlXFx1MDk4YlxcdTA5OTVcXHUwOTlkXFx1MDlhMlxcdTA5YWRxdWFsR3JlYXRlcjtcXHU2MmRhdWxsRXF1YWw7XFx1NjI2NnJlYXRlcjtcXHU2Mjc2ZXNzO1xcdTZhYTFsYW50RXF1YWw7XFx1NmE3ZGlsZGU7XFx1NjI3MnI7XFx1YzAwMFxcdWQ4MzVcXHVkZDBmXFx1MDEwMDtlXFx1MDliZFxcdTA5YmVcXHU2MmQ4ZnRhcnJvdztcXHU2MWRhaWRvdDtcXHU0MTNmXFx1MDE4MG5wd1xcdTA5ZDRcXHUwYTE2XFx1MGExYmdcXHUwMjAwTFJsclxcdTA5ZGVcXHUwOWY3XFx1MGEwMlxcdTBhMTBlZnRcXHUwMTAwQVJcXHUwOWU2XFx1MDllY3Jyb3c7XFx1NjdmNWlnaHRBcnJvdztcXHU2N2Y3aWdodEFycm93O1xcdTY3ZjZlZnRcXHUwMTAwYXJcXHUwM2IzXFx1MGEwYWlnaHRcXHhlMVxcdTAzYmZpZ2h0XFx4ZTFcXHUwM2NhZjtcXHVjMDAwXFx1ZDgzNVxcdWRkNDNlclxcdTAxMDBMUlxcdTBhMjJcXHUwYTJjZWZ0QXJyb3c7XFx1NjE5OWlnaHRBcnJvdztcXHU2MTk4XFx1MDE4MGNodFxcdTBhM2VcXHUwYTQwXFx1MGE0MlxceGYyXFx1MDg0YztcXHU2MWIwcm9rO1xcdTQxNDE7XFx1NjI2YVxcdTA0MDBhY2VmaW9zdVxcdTBhNWFcXHUwYTVkXFx1MGE2MFxcdTBhNzdcXHUwYTdjXFx1MGE4NVxcdTBhOGJcXHUwYThlcDtcXHU2OTA1eTtcXHU0NDFjXFx1MDEwMGRsXFx1MGE2NVxcdTBhNmZpdW1TcGFjZTtcXHU2MDVmbGludHJmO1xcdTYxMzNyO1xcdWMwMDBcXHVkODM1XFx1ZGQxMG51c1BsdXM7XFx1NjIxM3BmO1xcdWMwMDBcXHVkODM1XFx1ZGQ0NGNcXHhmMlxcdTBhNzY7XFx1NDM5Y1xcdTA0ODBKYWNlZm9zdHVcXHUwYWEzXFx1MGFhN1xcdTBhYWRcXHUwYWMwXFx1MGIxNFxcdTBiMTlcXHUwZDkxXFx1MGQ5N1xcdTBkOWVjeTtcXHU0NDBhY3V0ZTtcXHU0MTQzXFx1MDE4MGFleVxcdTBhYjRcXHUwYWI5XFx1MGFiZXJvbjtcXHU0MTQ3ZGlsO1xcdTQxNDU7XFx1NDQxZFxcdTAxODBnc3dcXHUwYWM3XFx1MGFmMFxcdTBiMGVhdGl2ZVxcdTAxODBNVFZcXHUwYWQzXFx1MGFkZlxcdTBhZThlZGl1bVNwYWNlO1xcdTYwMGJoaVxcdTAxMDBjblxcdTBhZTZcXHUwYWQ4XFx4ZWJcXHUwYWQ5ZXJ5VGhpXFx4ZWVcXHUwYWQ5dGVkXFx1MDEwMEdMXFx1MGFmOFxcdTBiMDZyZWF0ZXJHcmVhdGVcXHhmMlxcdTA2NzNlc3NMZXNcXHhmM1xcdTBhNDhMaW5lO1xcdTQwMGFyO1xcdWMwMDBcXHVkODM1XFx1ZGQxMVxcdTAyMDBCbnB0XFx1MGIyMlxcdTBiMjhcXHUwYjM3XFx1MGIzYXJlYWs7XFx1NjA2MEJyZWFraW5nU3BhY2U7XFx1NDBhMGY7XFx1NjExNVxcdTA2ODA7Q0RFR0hMTlBSU1RWXFx1MGI1NVxcdTBiNTZcXHUwYjZhXFx1MGI3Y1xcdTBiYTFcXHUwYmViXFx1MGMwNFxcdTBjNWVcXHUwYzg0XFx1MGNhNlxcdTBjZDhcXHUwZDYxXFx1MGQ4NVxcdTZhZWNcXHUwMTAwb3VcXHUwYjViXFx1MGI2NG5ncnVlbnQ7XFx1NjI2MnBDYXA7XFx1NjI2ZG91YmxlVmVydGljYWxCYXI7XFx1NjIyNlxcdTAxODBscXhcXHUwYjgzXFx1MGI4YVxcdTBiOWJlbWVudDtcXHU2MjA5dWFsXFx1MDEwMDtUXFx1MGI5MlxcdTBiOTNcXHU2MjYwaWxkZTtcXHVjMDAwXFx1MjI0MlxcdTAzMzhpc3RzO1xcdTYyMDRyZWF0ZXJcXHUwMzgwO0VGR0xTVFxcdTBiYjZcXHUwYmI3XFx1MGJiZFxcdTBiYzlcXHUwYmQzXFx1MGJkOFxcdTBiZTVcXHU2MjZmcXVhbDtcXHU2MjcxdWxsRXF1YWw7XFx1YzAwMFxcdTIyNjdcXHUwMzM4cmVhdGVyO1xcdWMwMDBcXHUyMjZiXFx1MDMzOGVzcztcXHU2Mjc5bGFudEVxdWFsO1xcdWMwMDBcXHUyYTdlXFx1MDMzOGlsZGU7XFx1NjI3NXVtcFxcdTAxNDRcXHUwYmYyXFx1MGJmZG93bkh1bXA7XFx1YzAwMFxcdTIyNGVcXHUwMzM4cXVhbDtcXHVjMDAwXFx1MjI0ZlxcdTAzMzhlXFx1MDEwMGZzXFx1MGMwYVxcdTBjMjd0VHJpYW5nbGVcXHUwMTgwO0JFXFx1MGMxYVxcdTBjMWJcXHUwYzIxXFx1NjJlYWFyO1xcdWMwMDBcXHUyOWNmXFx1MDMzOHF1YWw7XFx1NjJlY3NcXHUwMzAwO0VHTFNUXFx1MGMzNVxcdTBjMzZcXHUwYzNjXFx1MGM0NFxcdTBjNGJcXHUwYzU4XFx1NjI2ZXF1YWw7XFx1NjI3MHJlYXRlcjtcXHU2Mjc4ZXNzO1xcdWMwMDBcXHUyMjZhXFx1MDMzOGxhbnRFcXVhbDtcXHVjMDAwXFx1MmE3ZFxcdTAzMzhpbGRlO1xcdTYyNzRlc3RlZFxcdTAxMDBHTFxcdTBjNjhcXHUwYzc5cmVhdGVyR3JlYXRlcjtcXHVjMDAwXFx1MmFhMlxcdTAzMzhlc3NMZXNzO1xcdWMwMDBcXHUyYWExXFx1MDMzOHJlY2VkZXNcXHUwMTgwO0VTXFx1MGM5MlxcdTBjOTNcXHUwYzliXFx1NjI4MHF1YWw7XFx1YzAwMFxcdTJhYWZcXHUwMzM4bGFudEVxdWFsO1xcdTYyZTBcXHUwMTAwZWlcXHUwY2FiXFx1MGNiOXZlcnNlRWxlbWVudDtcXHU2MjBjZ2h0VHJpYW5nbGVcXHUwMTgwO0JFXFx1MGNjYlxcdTBjY2NcXHUwY2QyXFx1NjJlYmFyO1xcdWMwMDBcXHUyOWQwXFx1MDMzOHF1YWw7XFx1NjJlZFxcdTAxMDBxdVxcdTBjZGRcXHUwZDBjdWFyZVN1XFx1MDEwMGJwXFx1MGNlOFxcdTBjZjlzZXRcXHUwMTAwO0VcXHUwY2YwXFx1MGNmM1xcdWMwMDBcXHUyMjhmXFx1MDMzOHF1YWw7XFx1NjJlMmVyc2V0XFx1MDEwMDtFXFx1MGQwM1xcdTBkMDZcXHVjMDAwXFx1MjI5MFxcdTAzMzhxdWFsO1xcdTYyZTNcXHUwMTgwYmNwXFx1MGQxM1xcdTBkMjRcXHUwZDRlc2V0XFx1MDEwMDtFXFx1MGQxYlxcdTBkMWVcXHVjMDAwXFx1MjI4MlxcdTIwZDJxdWFsO1xcdTYyODhjZWVkc1xcdTAyMDA7RVNUXFx1MGQzMlxcdTBkMzNcXHUwZDNiXFx1MGQ0NlxcdTYyODFxdWFsO1xcdWMwMDBcXHUyYWIwXFx1MDMzOGxhbnRFcXVhbDtcXHU2MmUxaWxkZTtcXHVjMDAwXFx1MjI3ZlxcdTAzMzhlcnNldFxcdTAxMDA7RVxcdTBkNThcXHUwZDViXFx1YzAwMFxcdTIyODNcXHUyMGQycXVhbDtcXHU2Mjg5aWxkZVxcdTAyMDA7RUZUXFx1MGQ2ZVxcdTBkNmZcXHUwZDc1XFx1MGQ3ZlxcdTYyNDFxdWFsO1xcdTYyNDR1bGxFcXVhbDtcXHU2MjQ3aWxkZTtcXHU2MjQ5ZXJ0aWNhbEJhcjtcXHU2MjI0Y3I7XFx1YzAwMFxcdWQ4MzVcXHVkY2E5aWxkZVxcdTgwM2JcXHhkMVxcdTQwZDE7XFx1NDM5ZFxcdTA3MDBFYWNkZmdtb3Byc3R1dlxcdTBkYmRcXHUwZGMyXFx1MGRjOVxcdTBkZDVcXHUwZGRiXFx1MGRlMFxcdTBkZTdcXHUwZGZjXFx1MGUwMlxcdTBlMjBcXHUwZTIyXFx1MGUzMlxcdTBlM2ZcXHUwZTQ0bGlnO1xcdTQxNTJjdXRlXFx1ODAzYlxceGQzXFx1NDBkM1xcdTAxMDBpeVxcdTBkY2VcXHUwZGQzcmNcXHU4MDNiXFx4ZDRcXHU0MGQ0O1xcdTQ0MWVibGFjO1xcdTQxNTByO1xcdWMwMDBcXHVkODM1XFx1ZGQxMnJhdmVcXHU4MDNiXFx4ZDJcXHU0MGQyXFx1MDE4MGFlaVxcdTBkZWVcXHUwZGYyXFx1MGRmNmNyO1xcdTQxNGNnYTtcXHU0M2E5Y3JvbjtcXHU0MzlmcGY7XFx1YzAwMFxcdWQ4MzVcXHVkZDQ2ZW5DdXJseVxcdTAxMDBEUVxcdTBlMGVcXHUwZTFhb3VibGVRdW90ZTtcXHU2MDFjdW90ZTtcXHU2MDE4O1xcdTZhNTRcXHUwMTAwY2xcXHUwZTI3XFx1MGUyY3I7XFx1YzAwMFxcdWQ4MzVcXHVkY2FhYXNoXFx1ODAzYlxceGQ4XFx1NDBkOGlcXHUwMTZjXFx1MGUzN1xcdTBlM2NkZVxcdTgwM2JcXHhkNVxcdTQwZDVlcztcXHU2YTM3bWxcXHU4MDNiXFx4ZDZcXHU0MGQ2ZXJcXHUwMTAwQlBcXHUwZTRiXFx1MGU2MFxcdTAxMDBhclxcdTBlNTBcXHUwZTUzcjtcXHU2MDNlYWNcXHUwMTAwZWtcXHUwZTVhXFx1MGU1YztcXHU2M2RlZXQ7XFx1NjNiNGFyZW50aGVzaXM7XFx1NjNkY1xcdTA0ODBhY2ZoaWxvcnNcXHUwZTdmXFx1MGU4N1xcdTBlOGFcXHUwZThmXFx1MGU5MlxcdTBlOTRcXHUwZTlkXFx1MGViMFxcdTBlZmNydGlhbEQ7XFx1NjIwMnk7XFx1NDQxZnI7XFx1YzAwMFxcdWQ4MzVcXHVkZDEzaTtcXHU0M2E2O1xcdTQzYTB1c01pbnVzO1xcdTQwYjFcXHUwMTAwaXBcXHUwZWEyXFx1MGVhZG5jYXJlcGxhblxceGU1XFx1MDY5ZGY7XFx1NjExOVxcdTAyMDA7ZWlvXFx1MGViOVxcdTBlYmFcXHUwZWUwXFx1MGVlNFxcdTZhYmJjZWRlc1xcdTAyMDA7RVNUXFx1MGVjOFxcdTBlYzlcXHUwZWNmXFx1MGVkYVxcdTYyN2FxdWFsO1xcdTZhYWZsYW50RXF1YWw7XFx1NjI3Y2lsZGU7XFx1NjI3ZW1lO1xcdTYwMzNcXHUwMTAwZHBcXHUwZWU5XFx1MGVlZXVjdDtcXHU2MjBmb3J0aW9uXFx1MDEwMDthXFx1MDIyNVxcdTBlZjlsO1xcdTYyMWRcXHUwMTAwY2lcXHUwZjAxXFx1MGYwNnI7XFx1YzAwMFxcdWQ4MzVcXHVkY2FiO1xcdTQzYThcXHUwMjAwVWZvc1xcdTBmMTFcXHUwZjE2XFx1MGYxYlxcdTBmMWZPVFxcdTgwM2JcXFwiXFx1NDAyMnI7XFx1YzAwMFxcdWQ4MzVcXHVkZDE0cGY7XFx1NjExYWNyO1xcdWMwMDBcXHVkODM1XFx1ZGNhY1xcdTA2MDBCRWFjZWZoaW9yc3VcXHUwZjNlXFx1MGY0M1xcdTBmNDdcXHUwZjYwXFx1MGY3M1xcdTBmYTdcXHUwZmFhXFx1MGZhZFxcdTEwOTZcXHUxMGE5XFx1MTBiNFxcdTEwYmVhcnI7XFx1NjkxMEdcXHU4MDNiXFx4YWVcXHU0MGFlXFx1MDE4MGNuclxcdTBmNGVcXHUwZjUzXFx1MGY1NnV0ZTtcXHU0MTU0ZztcXHU2N2ViclxcdTAxMDA7dFxcdTBmNWNcXHUwZjVkXFx1NjFhMGw7XFx1NjkxNlxcdTAxODBhZXlcXHUwZjY3XFx1MGY2Y1xcdTBmNzFyb247XFx1NDE1OGRpbDtcXHU0MTU2O1xcdTQ0MjBcXHUwMTAwO3ZcXHUwZjc4XFx1MGY3OVxcdTYxMWNlcnNlXFx1MDEwMEVVXFx1MGY4MlxcdTBmOTlcXHUwMTAwbHFcXHUwZjg3XFx1MGY4ZWVtZW50O1xcdTYyMGJ1aWxpYnJpdW07XFx1NjFjYnBFcXVpbGlicml1bTtcXHU2OTZmclxceGJiXFx1MGY3OW87XFx1NDNhMWdodFxcdTA0MDBBQ0RGVFVWYVxcdTBmYzFcXHUwZmViXFx1MGZmM1xcdTEwMjJcXHUxMDI4XFx1MTA1YlxcdTEwODdcXHUwM2Q4XFx1MDEwMG5yXFx1MGZjNlxcdTBmZDJnbGVCcmFja2V0O1xcdTY3ZTlyb3dcXHUwMTgwO0JMXFx1MGZkY1xcdTBmZGRcXHUwZmUxXFx1NjE5MmFyO1xcdTYxZTVlZnRBcnJvdztcXHU2MWM0ZWlsaW5nO1xcdTYzMDlvXFx1MDFmNVxcdTBmZjlcXDBcXHUxMDA1YmxlQnJhY2tldDtcXHU2N2U3blxcdTAxZDRcXHUxMDBhXFwwXFx1MTAxNGVlVmVjdG9yO1xcdTY5NWRlY3RvclxcdTAxMDA7QlxcdTEwMWRcXHUxMDFlXFx1NjFjMmFyO1xcdTY5NTVsb29yO1xcdTYzMGJcXHUwMTAwZXJcXHUxMDJkXFx1MTA0M2VcXHUwMTgwO0FWXFx1MTAzNVxcdTEwMzZcXHUxMDNjXFx1NjJhMnJyb3c7XFx1NjFhNmVjdG9yO1xcdTY5NWJpYW5nbGVcXHUwMTgwO0JFXFx1MTA1MFxcdTEwNTFcXHUxMDU1XFx1NjJiM2FyO1xcdTY5ZDBxdWFsO1xcdTYyYjVwXFx1MDE4MERUVlxcdTEwNjNcXHUxMDZlXFx1MTA3OG93blZlY3RvcjtcXHU2OTRmZWVWZWN0b3I7XFx1Njk1Y2VjdG9yXFx1MDEwMDtCXFx1MTA4MlxcdTEwODNcXHU2MWJlYXI7XFx1Njk1NGVjdG9yXFx1MDEwMDtCXFx1MTA5MVxcdTEwOTJcXHU2MWMwYXI7XFx1Njk1M1xcdTAxMDBwdVxcdTEwOWJcXHUxMDllZjtcXHU2MTFkbmRJbXBsaWVzO1xcdTY5NzBpZ2h0YXJyb3c7XFx1NjFkYlxcdTAxMDBjaFxcdTEwYjlcXHUxMGJjcjtcXHU2MTFiO1xcdTYxYjFsZURlbGF5ZWQ7XFx1NjlmNFxcdTA2ODBIT2FjZmhpbW9xc3R1XFx1MTBlNFxcdTEwZjFcXHUxMGY3XFx1MTBmZFxcdTExMTlcXHUxMTFlXFx1MTE1MVxcdTExNTZcXHUxMTYxXFx1MTE2N1xcdTExYjVcXHUxMWJiXFx1MTFiZlxcdTAxMDBDY1xcdTEwZTlcXHUxMGVlSGN5O1xcdTQ0Mjl5O1xcdTQ0MjhGVGN5O1xcdTQ0MmNjdXRlO1xcdTQxNWFcXHUwMjgwO2FlaXlcXHUxMTA4XFx1MTEwOVxcdTExMGVcXHUxMTEzXFx1MTExN1xcdTZhYmNyb247XFx1NDE2MGRpbDtcXHU0MTVlcmM7XFx1NDE1YztcXHU0NDIxcjtcXHVjMDAwXFx1ZDgzNVxcdWRkMTZvcnRcXHUwMjAwRExSVVxcdTExMmFcXHUxMTM0XFx1MTEzZVxcdTExNDlvd25BcnJvd1xceGJiXFx1MDQxZWVmdEFycm93XFx4YmJcXHUwODlhaWdodEFycm93XFx4YmJcXHUwZmRkcEFycm93O1xcdTYxOTFnbWE7XFx1NDNhM2FsbENpcmNsZTtcXHU2MjE4cGY7XFx1YzAwMFxcdWQ4MzVcXHVkZDRhXFx1MDI3MlxcdTExNmRcXDBcXDBcXHUxMTcwdDtcXHU2MjFhYXJlXFx1MDIwMDtJU1VcXHUxMTdiXFx1MTE3Y1xcdTExODlcXHUxMWFmXFx1NjVhMW50ZXJzZWN0aW9uO1xcdTYyOTN1XFx1MDEwMGJwXFx1MTE4ZlxcdTExOWVzZXRcXHUwMTAwO0VcXHUxMTk3XFx1MTE5OFxcdTYyOGZxdWFsO1xcdTYyOTFlcnNldFxcdTAxMDA7RVxcdTExYThcXHUxMWE5XFx1NjI5MHF1YWw7XFx1NjI5Mm5pb247XFx1NjI5NGNyO1xcdWMwMDBcXHVkODM1XFx1ZGNhZWFyO1xcdTYyYzZcXHUwMjAwYmNtcFxcdTExYzhcXHUxMWRiXFx1MTIwOVxcdTEyMGJcXHUwMTAwO3NcXHUxMWNkXFx1MTFjZVxcdTYyZDBldFxcdTAxMDA7RVxcdTExY2RcXHUxMWQ1cXVhbDtcXHU2Mjg2XFx1MDEwMGNoXFx1MTFlMFxcdTEyMDVlZWRzXFx1MDIwMDtFU1RcXHUxMWVkXFx1MTFlZVxcdTExZjRcXHUxMWZmXFx1NjI3YnF1YWw7XFx1NmFiMGxhbnRFcXVhbDtcXHU2MjdkaWxkZTtcXHU2MjdmVGhcXHhlMVxcdTBmOGM7XFx1NjIxMVxcdTAxODA7ZXNcXHUxMjEyXFx1MTIxM1xcdTEyMjNcXHU2MmQxcnNldFxcdTAxMDA7RVxcdTEyMWNcXHUxMjFkXFx1NjI4M3F1YWw7XFx1NjI4N2V0XFx4YmJcXHUxMjEzXFx1MDU4MEhSU2FjZmhpb3JzXFx1MTIzZVxcdTEyNDRcXHUxMjQ5XFx1MTI1NVxcdTEyNWVcXHUxMjcxXFx1MTI3NlxcdTEyOWZcXHUxMmMyXFx1MTJjOFxcdTEyZDFPUk5cXHU4MDNiXFx4ZGVcXHU0MGRlQURFO1xcdTYxMjJcXHUwMTAwSGNcXHUxMjRlXFx1MTI1MmN5O1xcdTQ0MGJ5O1xcdTQ0MjZcXHUwMTAwYnVcXHUxMjVhXFx1MTI1YztcXHU0MDA5O1xcdTQzYTRcXHUwMTgwYWV5XFx1MTI2NVxcdTEyNmFcXHUxMjZmcm9uO1xcdTQxNjRkaWw7XFx1NDE2MjtcXHU0NDIycjtcXHVjMDAwXFx1ZDgzNVxcdWRkMTdcXHUwMTAwZWlcXHUxMjdiXFx1MTI4OVxcdTAxZjJcXHUxMjgwXFwwXFx1MTI4N2Vmb3JlO1xcdTYyMzRhO1xcdTQzOThcXHUwMTAwY25cXHUxMjhlXFx1MTI5OGtTcGFjZTtcXHVjMDAwXFx1MjA1ZlxcdTIwMGFTcGFjZTtcXHU2MDA5bGRlXFx1MDIwMDtFRlRcXHUxMmFiXFx1MTJhY1xcdTEyYjJcXHUxMmJjXFx1NjIzY3F1YWw7XFx1NjI0M3VsbEVxdWFsO1xcdTYyNDVpbGRlO1xcdTYyNDhwZjtcXHVjMDAwXFx1ZDgzNVxcdWRkNGJpcGxlRG90O1xcdTYwZGJcXHUwMTAwY3RcXHUxMmQ2XFx1MTJkYnI7XFx1YzAwMFxcdWQ4MzVcXHVkY2Fmcm9rO1xcdTQxNjZcXHUwYWUxXFx1MTJmN1xcdTEzMGVcXHUxMzFhXFx1MTMyNlxcMFxcdTEzMmNcXHUxMzMxXFwwXFwwXFwwXFwwXFwwXFx1MTMzOFxcdTEzM2RcXHUxMzc3XFx1MTM4NVxcMFxcdTEzZmZcXHUxNDA0XFx1MTQwYVxcdTE0MTBcXHUwMTAwY3JcXHUxMmZiXFx1MTMwMXV0ZVxcdTgwM2JcXHhkYVxcdTQwZGFyXFx1MDEwMDtvXFx1MTMwN1xcdTEzMDhcXHU2MTlmY2lyO1xcdTY5NDlyXFx1MDFlM1xcdTEzMTNcXDBcXHUxMzE2eTtcXHU0NDBldmU7XFx1NDE2Y1xcdTAxMDBpeVxcdTEzMWVcXHUxMzIzcmNcXHU4MDNiXFx4ZGJcXHU0MGRiO1xcdTQ0MjNibGFjO1xcdTQxNzByO1xcdWMwMDBcXHVkODM1XFx1ZGQxOHJhdmVcXHU4MDNiXFx4ZDlcXHU0MGQ5YWNyO1xcdTQxNmFcXHUwMTAwZGlcXHUxMzQxXFx1MTM2OWVyXFx1MDEwMEJQXFx1MTM0OFxcdTEzNWRcXHUwMTAwYXJcXHUxMzRkXFx1MTM1MHI7XFx1NDA1ZmFjXFx1MDEwMGVrXFx1MTM1N1xcdTEzNTk7XFx1NjNkZmV0O1xcdTYzYjVhcmVudGhlc2lzO1xcdTYzZGRvblxcdTAxMDA7UFxcdTEzNzBcXHUxMzcxXFx1NjJjM2x1cztcXHU2MjhlXFx1MDEwMGdwXFx1MTM3YlxcdTEzN2ZvbjtcXHU0MTcyZjtcXHVjMDAwXFx1ZDgzNVxcdWRkNGNcXHUwNDAwQURFVGFkcHNcXHUxMzk1XFx1MTNhZVxcdTEzYjhcXHUxM2M0XFx1MDNlOFxcdTEzZDJcXHUxM2Q3XFx1MTNmM3Jyb3dcXHUwMTgwO0JEXFx1MTE1MFxcdTEzYTBcXHUxM2E0YXI7XFx1NjkxMm93bkFycm93O1xcdTYxYzVvd25BcnJvdztcXHU2MTk1cXVpbGlicml1bTtcXHU2OTZlZWVcXHUwMTAwO0FcXHUxM2NiXFx1MTNjY1xcdTYyYTVycm93O1xcdTYxYTVvd25cXHhlMVxcdTAzZjNlclxcdTAxMDBMUlxcdTEzZGVcXHUxM2U4ZWZ0QXJyb3c7XFx1NjE5NmlnaHRBcnJvdztcXHU2MTk3aVxcdTAxMDA7bFxcdTEzZjlcXHUxM2ZhXFx1NDNkMm9uO1xcdTQzYTVpbmc7XFx1NDE2ZWNyO1xcdWMwMDBcXHVkODM1XFx1ZGNiMGlsZGU7XFx1NDE2OG1sXFx1ODAzYlxceGRjXFx1NDBkY1xcdTA0ODBEYmNkZWZvc3ZcXHUxNDI3XFx1MTQyY1xcdTE0MzBcXHUxNDMzXFx1MTQzZVxcdTE0ODVcXHUxNDhhXFx1MTQ5MFxcdTE0OTZhc2g7XFx1NjJhYmFyO1xcdTZhZWJ5O1xcdTQ0MTJhc2hcXHUwMTAwO2xcXHUxNDNiXFx1MTQzY1xcdTYyYTk7XFx1NmFlNlxcdTAxMDBlclxcdTE0NDNcXHUxNDQ1O1xcdTYyYzFcXHUwMTgwYnR5XFx1MTQ0Y1xcdTE0NTBcXHUxNDdhYXI7XFx1NjAxNlxcdTAxMDA7aVxcdTE0NGZcXHUxNDU1Y2FsXFx1MDIwMEJMU1RcXHUxNDYxXFx1MTQ2NVxcdTE0NmFcXHUxNDc0YXI7XFx1NjIyM2luZTtcXHU0MDdjZXBhcmF0b3I7XFx1Njc1OGlsZGU7XFx1NjI0MFRoaW5TcGFjZTtcXHU2MDBhcjtcXHVjMDAwXFx1ZDgzNVxcdWRkMTlwZjtcXHVjMDAwXFx1ZDgzNVxcdWRkNGRjcjtcXHVjMDAwXFx1ZDgzNVxcdWRjYjFkYXNoO1xcdTYyYWFcXHUwMjgwY2Vmb3NcXHUxNGE3XFx1MTRhY1xcdTE0YjFcXHUxNGI2XFx1MTRiY2lyYztcXHU0MTc0ZGdlO1xcdTYyYzByO1xcdWMwMDBcXHVkODM1XFx1ZGQxYXBmO1xcdWMwMDBcXHVkODM1XFx1ZGQ0ZWNyO1xcdWMwMDBcXHVkODM1XFx1ZGNiMlxcdTAyMDBmaW9zXFx1MTRjYlxcdTE0ZDBcXHUxNGQyXFx1MTRkOHI7XFx1YzAwMFxcdWQ4MzVcXHVkZDFiO1xcdTQzOWVwZjtcXHVjMDAwXFx1ZDgzNVxcdWRkNGZjcjtcXHVjMDAwXFx1ZDgzNVxcdWRjYjNcXHUwNDgwQUlVYWNmb3N1XFx1MTRmMVxcdTE0ZjVcXHUxNGY5XFx1MTRmZFxcdTE1MDRcXHUxNTBmXFx1MTUxNFxcdTE1MWFcXHUxNTIwY3k7XFx1NDQyZmN5O1xcdTQ0MDdjeTtcXHU0NDJlY3V0ZVxcdTgwM2JcXHhkZFxcdTQwZGRcXHUwMTAwaXlcXHUxNTA5XFx1MTUwZHJjO1xcdTQxNzY7XFx1NDQyYnI7XFx1YzAwMFxcdWQ4MzVcXHVkZDFjcGY7XFx1YzAwMFxcdWQ4MzVcXHVkZDUwY3I7XFx1YzAwMFxcdWQ4MzVcXHVkY2I0bWw7XFx1NDE3OFxcdTA0MDBIYWNkZWZvc1xcdTE1MzVcXHUxNTM5XFx1MTUzZlxcdTE1NGJcXHUxNTRmXFx1MTU1ZFxcdTE1NjBcXHUxNTY0Y3k7XFx1NDQxNmN1dGU7XFx1NDE3OVxcdTAxMDBheVxcdTE1NDRcXHUxNTQ5cm9uO1xcdTQxN2Q7XFx1NDQxN290O1xcdTQxN2JcXHUwMWYyXFx1MTU1NFxcMFxcdTE1NWJvV2lkdFxceGU4XFx1MGFkOWE7XFx1NDM5NnI7XFx1NjEyOHBmO1xcdTYxMjRjcjtcXHVjMDAwXFx1ZDgzNVxcdWRjYjVcXHUwYmUxXFx1MTU4M1xcdTE1OGFcXHUxNTkwXFwwXFx1MTViMFxcdTE1YjZcXHUxNWJmXFwwXFwwXFwwXFwwXFx1MTVjNlxcdTE1ZGJcXHUxNWViXFx1MTY1ZlxcdTE2NmRcXDBcXHUxNjk1XFx1MTY5YlxcdTE2YjJcXHUxNmI5XFwwXFx1MTZiZWN1dGVcXHU4MDNiXFx4ZTFcXHU0MGUxcmV2ZTtcXHU0MTAzXFx1MDMwMDtFZGl1eVxcdTE1OWNcXHUxNTlkXFx1MTVhMVxcdTE1YTNcXHUxNWE4XFx1MTVhZFxcdTYyM2U7XFx1YzAwMFxcdTIyM2VcXHUwMzMzO1xcdTYyM2ZyY1xcdTgwM2JcXHhlMlxcdTQwZTJ0ZVxcdTgwYmJcXHhiNFxcdTAzMDY7XFx1NDQzMGxpZ1xcdTgwM2JcXHhlNlxcdTQwZTZcXHUwMTAwO3JcXHhiMlxcdTE1YmE7XFx1YzAwMFxcdWQ4MzVcXHVkZDFlcmF2ZVxcdTgwM2JcXHhlMFxcdTQwZTBcXHUwMTAwZXBcXHUxNWNhXFx1MTVkNlxcdTAxMDBmcFxcdTE1Y2ZcXHUxNWQ0c3ltO1xcdTYxMzVcXHhlOFxcdTE1ZDNoYTtcXHU0M2IxXFx1MDEwMGFwXFx1MTVkZmNcXHUwMTAwY2xcXHUxNWU0XFx1MTVlN3I7XFx1NDEwMWc7XFx1NmEzZlxcdTAyNjRcXHUxNWYwXFwwXFwwXFx1MTYwYVxcdTAyODA7YWRzdlxcdTE1ZmFcXHUxNWZiXFx1MTVmZlxcdTE2MDFcXHUxNjA3XFx1NjIyN25kO1xcdTZhNTU7XFx1NmE1Y2xvcGU7XFx1NmE1ODtcXHU2YTVhXFx1MDM4MDtlbG1yc3pcXHUxNjE4XFx1MTYxOVxcdTE2MWJcXHUxNjFlXFx1MTYzZlxcdTE2NGZcXHUxNjU5XFx1NjIyMDtcXHU2OWE0ZVxceGJiXFx1MTYxOXNkXFx1MDEwMDthXFx1MTYyNVxcdTE2MjZcXHU2MjIxXFx1MDQ2MVxcdTE2MzBcXHUxNjMyXFx1MTYzNFxcdTE2MzZcXHUxNjM4XFx1MTYzYVxcdTE2M2NcXHUxNjNlO1xcdTY5YTg7XFx1NjlhOTtcXHU2OWFhO1xcdTY5YWI7XFx1NjlhYztcXHU2OWFkO1xcdTY5YWU7XFx1NjlhZnRcXHUwMTAwO3ZcXHUxNjQ1XFx1MTY0NlxcdTYyMWZiXFx1MDEwMDtkXFx1MTY0Y1xcdTE2NGRcXHU2MmJlO1xcdTY5OWRcXHUwMTAwcHRcXHUxNjU0XFx1MTY1N2g7XFx1NjIyMlxceGJiXFx4YjlhcnI7XFx1NjM3Y1xcdTAxMDBncFxcdTE2NjNcXHUxNjY3b247XFx1NDEwNWY7XFx1YzAwMFxcdWQ4MzVcXHVkZDUyXFx1MDM4MDtFYWVpb3BcXHUxMmMxXFx1MTY3YlxcdTE2N2RcXHUxNjgyXFx1MTY4NFxcdTE2ODdcXHUxNjhhO1xcdTZhNzBjaXI7XFx1NmE2ZjtcXHU2MjRhZDtcXHU2MjRicztcXHU0MDI3cm94XFx1MDEwMDtlXFx1MTJjMVxcdTE2OTJcXHhmMVxcdTE2ODNpbmdcXHU4MDNiXFx4ZTVcXHU0MGU1XFx1MDE4MGN0eVxcdTE2YTFcXHUxNmE2XFx1MTZhOHI7XFx1YzAwMFxcdWQ4MzVcXHVkY2I2O1xcdTQwMmFtcFxcdTAxMDA7ZVxcdTEyYzFcXHUxNmFmXFx4ZjFcXHUwMjg4aWxkZVxcdTgwM2JcXHhlM1xcdTQwZTNtbFxcdTgwM2JcXHhlNFxcdTQwZTRcXHUwMTAwY2lcXHUxNmMyXFx1MTZjOG9uaW5cXHhmNFxcdTAyNzJudDtcXHU2YTExXFx1MDgwME5hYmNkZWZpa2xub3Byc3VcXHUxNmVkXFx1MTZmMVxcdTE3MzBcXHUxNzNjXFx1MTc0M1xcdTE3NDhcXHUxNzc4XFx1MTc3ZFxcdTE3ZTBcXHUxN2U2XFx1MTgzOVxcdTE4NTBcXHUxNzBkXFx1MTkzZFxcdTE5NDhcXHUxOTcwb3Q7XFx1NmFlZFxcdTAxMDBjclxcdTE2ZjZcXHUxNzFla1xcdTAyMDBjZXBzXFx1MTcwMFxcdTE3MDVcXHUxNzBkXFx1MTcxM29uZztcXHU2MjRjcHNpbG9uO1xcdTQzZjZyaW1lO1xcdTYwMzVpbVxcdTAxMDA7ZVxcdTE3MWFcXHUxNzFiXFx1NjIzZHE7XFx1NjJjZFxcdTAxNzZcXHUxNzIyXFx1MTcyNmVlO1xcdTYyYmRlZFxcdTAxMDA7Z1xcdTE3MmNcXHUxNzJkXFx1NjMwNWVcXHhiYlxcdTE3MmRya1xcdTAxMDA7dFxcdTEzNWNcXHUxNzM3YnJrO1xcdTYzYjZcXHUwMTAwb3lcXHUxNzAxXFx1MTc0MTtcXHU0NDMxcXVvO1xcdTYwMWVcXHUwMjgwY21wcnRcXHUxNzUzXFx1MTc1YlxcdTE3NjFcXHUxNzY0XFx1MTc2OGF1c1xcdTAxMDA7ZVxcdTAxMGFcXHUwMTA5cHR5djtcXHU2OWIwc1xceGU5XFx1MTcwY25vXFx4ZjVcXHUwMTEzXFx1MDE4MGFod1xcdTE3NmZcXHUxNzcxXFx1MTc3MztcXHU0M2IyO1xcdTYxMzZlZW47XFx1NjI2Y3I7XFx1YzAwMFxcdWQ4MzVcXHVkZDFmZ1xcdTAzODBjb3N0dXZ3XFx1MTc4ZFxcdTE3OWRcXHUxN2IzXFx1MTdjMVxcdTE3ZDVcXHUxN2RiXFx1MTdkZVxcdTAxODBhaXVcXHUxNzk0XFx1MTc5NlxcdTE3OWFcXHhmMFxcdTA3NjByYztcXHU2NWVmcFxceGJiXFx1MTM3MVxcdTAxODBkcHRcXHUxN2E0XFx1MTdhOFxcdTE3YWRvdDtcXHU2YTAwbHVzO1xcdTZhMDFpbWVzO1xcdTZhMDJcXHUwMjcxXFx1MTdiOVxcMFxcMFxcdTE3YmVjdXA7XFx1NmEwNmFyO1xcdTY2MDVyaWFuZ2xlXFx1MDEwMGR1XFx1MTdjZFxcdTE3ZDJvd247XFx1NjViZHA7XFx1NjViM3BsdXM7XFx1NmEwNGVcXHhlNVxcdTE0NDRcXHhlNVxcdTE0YWRhcm93O1xcdTY5MGRcXHUwMTgwYWtvXFx1MTdlZFxcdTE4MjZcXHUxODM1XFx1MDEwMGNuXFx1MTdmMlxcdTE4MjNrXFx1MDE4MGxzdFxcdTE3ZmFcXHUwNWFiXFx1MTgwMm96ZW5nZTtcXHU2OWVicmlhbmdsZVxcdTAyMDA7ZGxyXFx1MTgxMlxcdTE4MTNcXHUxODE4XFx1MTgxZFxcdTY1YjRvd247XFx1NjViZWVmdDtcXHU2NWMyaWdodDtcXHU2NWI4aztcXHU2NDIzXFx1MDFiMVxcdTE4MmJcXDBcXHUxODMzXFx1MDFiMlxcdTE4MmZcXDBcXHUxODMxO1xcdTY1OTI7XFx1NjU5MTQ7XFx1NjU5M2NrO1xcdTY1ODhcXHUwMTAwZW9cXHUxODNlXFx1MTg0ZFxcdTAxMDA7cVxcdTE4NDNcXHUxODQ2XFx1YzAwMD1cXHUyMGU1dWl2O1xcdWMwMDBcXHUyMjYxXFx1MjBlNXQ7XFx1NjMxMFxcdTAyMDBwdHd4XFx1MTg1OVxcdTE4NWVcXHUxODY3XFx1MTg2Y2Y7XFx1YzAwMFxcdWQ4MzVcXHVkZDUzXFx1MDEwMDt0XFx1MTNjYlxcdTE4NjNvbVxceGJiXFx1MTNjY3RpZTtcXHU2MmM4XFx1MDYwMERIVVZiZGhtcHR1dlxcdTE4ODVcXHUxODk2XFx1MThhYVxcdTE4YmJcXHUxOGQ3XFx1MThkYlxcdTE4ZWNcXHUxOGZmXFx1MTkwNVxcdTE5MGFcXHUxOTEwXFx1MTkyMVxcdTAyMDBMUmxyXFx1MTg4ZVxcdTE4OTBcXHUxODkyXFx1MTg5NDtcXHU2NTU3O1xcdTY1NTQ7XFx1NjU1NjtcXHU2NTUzXFx1MDI4MDtEVWR1XFx1MThhMVxcdTE4YTJcXHUxOGE0XFx1MThhNlxcdTE4YThcXHU2NTUwO1xcdTY1NjY7XFx1NjU2OTtcXHU2NTY0O1xcdTY1NjdcXHUwMjAwTFJsclxcdTE4YjNcXHUxOGI1XFx1MThiN1xcdTE4Yjk7XFx1NjU1ZDtcXHU2NTVhO1xcdTY1NWM7XFx1NjU1OVxcdTAzODA7SExSaGxyXFx1MThjYVxcdTE4Y2JcXHUxOGNkXFx1MThjZlxcdTE4ZDFcXHUxOGQzXFx1MThkNVxcdTY1NTE7XFx1NjU2YztcXHU2NTYzO1xcdTY1NjA7XFx1NjU2YjtcXHU2NTYyO1xcdTY1NWZveDtcXHU2OWM5XFx1MDIwMExSbHJcXHUxOGU0XFx1MThlNlxcdTE4ZThcXHUxOGVhO1xcdTY1NTU7XFx1NjU1MjtcXHU2NTEwO1xcdTY1MGNcXHUwMjgwO0RVZHVcXHUwNmJkXFx1MThmN1xcdTE4ZjlcXHUxOGZiXFx1MThmZDtcXHU2NTY1O1xcdTY1Njg7XFx1NjUyYztcXHU2NTM0aW51cztcXHU2MjlmbHVzO1xcdTYyOWVpbWVzO1xcdTYyYTBcXHUwMjAwTFJsclxcdTE5MTlcXHUxOTFiXFx1MTkxZFxcdTE5MWY7XFx1NjU1YjtcXHU2NTU4O1xcdTY1MTg7XFx1NjUxNFxcdTAzODA7SExSaGxyXFx1MTkzMFxcdTE5MzFcXHUxOTMzXFx1MTkzNVxcdTE5MzdcXHUxOTM5XFx1MTkzYlxcdTY1MDI7XFx1NjU2YTtcXHU2NTYxO1xcdTY1NWU7XFx1NjUzYztcXHU2NTI0O1xcdTY1MWNcXHUwMTAwZXZcXHUwMTIzXFx1MTk0MmJhclxcdTgwM2JcXHhhNlxcdTQwYTZcXHUwMjAwY2Vpb1xcdTE5NTFcXHUxOTU2XFx1MTk1YVxcdTE5NjByO1xcdWMwMDBcXHVkODM1XFx1ZGNiN21pO1xcdTYwNGZtXFx1MDEwMDtlXFx1MTcxYVxcdTE3MWNsXFx1MDE4MDtiaFxcdTE5NjhcXHUxOTY5XFx1MTk2YlxcdTQwNWM7XFx1NjljNXN1YjtcXHU2N2M4XFx1MDE2Y1xcdTE5NzRcXHUxOTdlbFxcdTAxMDA7ZVxcdTE5NzlcXHUxOTdhXFx1NjAyMnRcXHhiYlxcdTE5N2FwXFx1MDE4MDtFZVxcdTAxMmZcXHUxOTg1XFx1MTk4NztcXHU2YWFlXFx1MDEwMDtxXFx1MDZkY1xcdTA2ZGJcXHUwY2UxXFx1MTlhN1xcMFxcdTE5ZThcXHUxYTExXFx1MWExNVxcdTFhMzJcXDBcXHUxYTM3XFx1MWE1MFxcMFxcMFxcdTFhYjRcXDBcXDBcXHUxYWMxXFwwXFwwXFx1MWIyMVxcdTFiMmVcXHUxYjRkXFx1MWI1MlxcMFxcdTFiZmRcXDBcXHUxYzBjXFx1MDE4MGNwclxcdTE5YWRcXHUxOWIyXFx1MTlkZHV0ZTtcXHU0MTA3XFx1MDMwMDthYmNkc1xcdTE5YmZcXHUxOWMwXFx1MTljNFxcdTE5Y2FcXHUxOWQ1XFx1MTlkOVxcdTYyMjluZDtcXHU2YTQ0cmN1cDtcXHU2YTQ5XFx1MDEwMGF1XFx1MTljZlxcdTE5ZDJwO1xcdTZhNGJwO1xcdTZhNDdvdDtcXHU2YTQwO1xcdWMwMDBcXHUyMjI5XFx1ZmUwMFxcdTAxMDBlb1xcdTE5ZTJcXHUxOWU1dDtcXHU2MDQxXFx4ZWVcXHUwNjkzXFx1MDIwMGFlaXVcXHUxOWYwXFx1MTlmYlxcdTFhMDFcXHUxYTA1XFx1MDFmMFxcdTE5ZjVcXDBcXHUxOWY4cztcXHU2YTRkb247XFx1NDEwZGRpbFxcdTgwM2JcXHhlN1xcdTQwZTdyYztcXHU0MTA5cHNcXHUwMTAwO3NcXHUxYTBjXFx1MWEwZFxcdTZhNGNtO1xcdTZhNTBvdDtcXHU0MTBiXFx1MDE4MGRtblxcdTFhMWJcXHUxYTIwXFx1MWEyNmlsXFx1ODBiYlxceGI4XFx1MDFhZHB0eXY7XFx1NjliMnRcXHU4MTAwXFx4YTI7ZVxcdTFhMmRcXHUxYTJlXFx1NDBhMnJcXHhlNFxcdTAxYjJyO1xcdWMwMDBcXHVkODM1XFx1ZGQyMFxcdTAxODBjZWlcXHUxYTNkXFx1MWE0MFxcdTFhNGR5O1xcdTQ0NDdja1xcdTAxMDA7bVxcdTFhNDdcXHUxYTQ4XFx1NjcxM2Fya1xceGJiXFx1MWE0ODtcXHU0M2M3clxcdTAzODA7RWNlZm1zXFx1MWE1ZlxcdTFhNjBcXHUxYTYyXFx1MWE2YlxcdTFhYTRcXHUxYWFhXFx1MWFhZVxcdTY1Y2I7XFx1NjljM1xcdTAxODA7ZWxcXHUxYTY5XFx1MWE2YVxcdTFhNmRcXHU0MmM2cTtcXHU2MjU3ZVxcdTAyNjFcXHUxYTc0XFwwXFwwXFx1MWE4OHJyb3dcXHUwMTAwbHJcXHUxYTdjXFx1MWE4MWVmdDtcXHU2MWJhaWdodDtcXHU2MWJiXFx1MDI4MFJTYWNkXFx1MWE5MlxcdTFhOTRcXHUxYTk2XFx1MWE5YVxcdTFhOWZcXHhiYlxcdTBmNDc7XFx1NjRjOHN0O1xcdTYyOWJpcmM7XFx1NjI5YWFzaDtcXHU2MjlkbmludDtcXHU2YTEwaWQ7XFx1NmFlZmNpcjtcXHU2OWMydWJzXFx1MDEwMDt1XFx1MWFiYlxcdTFhYmNcXHU2NjYzaXRcXHhiYlxcdTFhYmNcXHUwMmVjXFx1MWFjN1xcdTFhZDRcXHUxYWZhXFwwXFx1MWIwYW9uXFx1MDEwMDtlXFx1MWFjZFxcdTFhY2VcXHU0MDNhXFx1MDEwMDtxXFx4YzdcXHhjNlxcdTAyNmRcXHUxYWQ5XFwwXFwwXFx1MWFlMmFcXHUwMTAwO3RcXHUxYWRlXFx1MWFkZlxcdTQwMmM7XFx1NDA0MFxcdTAxODA7ZmxcXHUxYWU4XFx1MWFlOVxcdTFhZWJcXHU2MjAxXFx4ZWVcXHUxMTYwZVxcdTAxMDBteFxcdTFhZjFcXHUxYWY2ZW50XFx4YmJcXHUxYWU5ZVxceGYzXFx1MDI0ZFxcdTAxZTdcXHUxYWZlXFwwXFx1MWIwN1xcdTAxMDA7ZFxcdTEyYmJcXHUxYjAyb3Q7XFx1NmE2ZG5cXHhmNFxcdTAyNDZcXHUwMTgwZnJ5XFx1MWIxMFxcdTFiMTRcXHUxYjE3O1xcdWMwMDBcXHVkODM1XFx1ZGQ1NG9cXHhlNFxcdTAyNTRcXHU4MTAwXFx4YTk7c1xcdTAxNTVcXHUxYjFkcjtcXHU2MTE3XFx1MDEwMGFvXFx1MWIyNVxcdTFiMjlycjtcXHU2MWI1c3M7XFx1NjcxN1xcdTAxMDBjdVxcdTFiMzJcXHUxYjM3cjtcXHVjMDAwXFx1ZDgzNVxcdWRjYjhcXHUwMTAwYnBcXHUxYjNjXFx1MWI0NFxcdTAxMDA7ZVxcdTFiNDFcXHUxYjQyXFx1NmFjZjtcXHU2YWQxXFx1MDEwMDtlXFx1MWI0OVxcdTFiNGFcXHU2YWQwO1xcdTZhZDJkb3Q7XFx1NjJlZlxcdTAzODBkZWxwcnZ3XFx1MWI2MFxcdTFiNmNcXHUxYjc3XFx1MWI4MlxcdTFiYWNcXHUxYmQ0XFx1MWJmOWFyclxcdTAxMDBsclxcdTFiNjhcXHUxYjZhO1xcdTY5Mzg7XFx1NjkzNVxcdTAyNzBcXHUxYjcyXFwwXFwwXFx1MWI3NXI7XFx1NjJkZWM7XFx1NjJkZmFyclxcdTAxMDA7cFxcdTFiN2ZcXHUxYjgwXFx1NjFiNjtcXHU2OTNkXFx1MDMwMDtiY2Rvc1xcdTFiOGZcXHUxYjkwXFx1MWI5NlxcdTFiYTFcXHUxYmE1XFx1MWJhOFxcdTYyMmFyY2FwO1xcdTZhNDhcXHUwMTAwYXVcXHUxYjliXFx1MWI5ZXA7XFx1NmE0NnA7XFx1NmE0YW90O1xcdTYyOGRyO1xcdTZhNDU7XFx1YzAwMFxcdTIyMmFcXHVmZTAwXFx1MDIwMGFscnZcXHUxYmI1XFx1MWJiZlxcdTFiZGVcXHUxYmUzcnJcXHUwMTAwO21cXHUxYmJjXFx1MWJiZFxcdTYxYjc7XFx1NjkzY3lcXHUwMTgwZXZ3XFx1MWJjN1xcdTFiZDRcXHUxYmQ4cVxcdTAyNzBcXHUxYmNlXFwwXFwwXFx1MWJkMnJlXFx4ZTNcXHUxYjczdVxceGUzXFx1MWI3NWVlO1xcdTYyY2VlZGdlO1xcdTYyY2ZlblxcdTgwM2JcXHhhNFxcdTQwYTRlYXJyb3dcXHUwMTAwbHJcXHUxYmVlXFx1MWJmM2VmdFxceGJiXFx1MWI4MGlnaHRcXHhiYlxcdTFiYmRlXFx4ZTRcXHUxYmRkXFx1MDEwMGNpXFx1MWMwMVxcdTFjMDdvbmluXFx4ZjRcXHUwMWY3bnQ7XFx1NjIzMWxjdHk7XFx1NjMyZFxcdTA5ODBBSGFiY2RlZmhpamxvcnN0dXd6XFx1MWMzOFxcdTFjM2JcXHUxYzNmXFx1MWM1ZFxcdTFjNjlcXHUxYzc1XFx1MWM4YVxcdTFjOWVcXHUxY2FjXFx1MWNiN1xcdTFjZmJcXHUxY2ZmXFx1MWQwZFxcdTFkN2JcXHUxZDkxXFx1MWRhYlxcdTFkYmJcXHUxZGM2XFx1MWRjZHJcXHhmMlxcdTAzODFhcjtcXHU2OTY1XFx1MDIwMGdscnNcXHUxYzQ4XFx1MWM0ZFxcdTFjNTJcXHUxYzU0Z2VyO1xcdTYwMjBldGg7XFx1NjEzOFxceGYyXFx1MTEzM2hcXHUwMTAwO3ZcXHUxYzVhXFx1MWM1YlxcdTYwMTBcXHhiYlxcdTA5MGFcXHUwMTZiXFx1MWM2MVxcdTFjNjdhcm93O1xcdTY5MGZhXFx4ZTNcXHUwMzE1XFx1MDEwMGF5XFx1MWM2ZVxcdTFjNzNyb247XFx1NDEwZjtcXHU0NDM0XFx1MDE4MDthb1xcdTAzMzJcXHUxYzdjXFx1MWM4NFxcdTAxMDBnclxcdTAyYmZcXHUxYzgxcjtcXHU2MWNhdHNlcTtcXHU2YTc3XFx1MDE4MGdsbVxcdTFjOTFcXHUxYzk0XFx1MWM5OFxcdTgwM2JcXHhiMFxcdTQwYjB0YTtcXHU0M2I0cHR5djtcXHU2OWIxXFx1MDEwMGlyXFx1MWNhM1xcdTFjYThzaHQ7XFx1Njk3ZjtcXHVjMDAwXFx1ZDgzNVxcdWRkMjFhclxcdTAxMDBsclxcdTFjYjNcXHUxY2I1XFx4YmJcXHUwOGRjXFx4YmJcXHUxMDFlXFx1MDI4MGFlZ3N2XFx1MWNjMlxcdTAzNzhcXHUxY2Q2XFx1MWNkY1xcdTFjZTBtXFx1MDE4MDtvc1xcdTAzMjZcXHUxY2NhXFx1MWNkNG5kXFx1MDEwMDtzXFx1MDMyNlxcdTFjZDF1aXQ7XFx1NjY2NmFtbWE7XFx1NDNkZGluO1xcdTYyZjJcXHUwMTgwO2lvXFx1MWNlN1xcdTFjZThcXHUxY2Y4XFx1NDBmN2RlXFx1ODEwMFxceGY3O29cXHUxY2U3XFx1MWNmMG50aW1lcztcXHU2MmM3blxceGY4XFx1MWNmN2N5O1xcdTQ0NTJjXFx1MDI2ZlxcdTFkMDZcXDBcXDBcXHUxZDBhcm47XFx1NjMxZW9wO1xcdTYzMGRcXHUwMjgwbHB0dXdcXHUxZDE4XFx1MWQxZFxcdTFkMjJcXHUxZDQ5XFx1MWQ1NWxhcjtcXHU0MDI0ZjtcXHVjMDAwXFx1ZDgzNVxcdWRkNTVcXHUwMjgwO2VtcHNcXHUwMzBiXFx1MWQyZFxcdTFkMzdcXHUxZDNkXFx1MWQ0MnFcXHUwMTAwO2RcXHUwMzUyXFx1MWQzM290O1xcdTYyNTFpbnVzO1xcdTYyMzhsdXM7XFx1NjIxNHF1YXJlO1xcdTYyYTFibGViYXJ3ZWRnXFx4ZTVcXHhmYW5cXHUwMTgwYWRoXFx1MTEyZVxcdTFkNWRcXHUxZDY3b3duYXJyb3dcXHhmM1xcdTFjODNhcnBvb25cXHUwMTAwbHJcXHUxZDcyXFx1MWQ3NmVmXFx4ZjRcXHUxY2I0aWdoXFx4ZjRcXHUxY2I2XFx1MDE2MlxcdTFkN2ZcXHUxZDg1a2Fyb1xceGY3XFx1MGY0MlxcdTAyNmZcXHUxZDhhXFwwXFwwXFx1MWQ4ZXJuO1xcdTYzMWZvcDtcXHU2MzBjXFx1MDE4MGNvdFxcdTFkOThcXHUxZGEzXFx1MWRhNlxcdTAxMDByeVxcdTFkOWRcXHUxZGExO1xcdWMwMDBcXHVkODM1XFx1ZGNiOTtcXHU0NDU1bDtcXHU2OWY2cm9rO1xcdTQxMTFcXHUwMTAwZHJcXHUxZGIwXFx1MWRiNG90O1xcdTYyZjFpXFx1MDEwMDtmXFx1MWRiYVxcdTE4MTZcXHU2NWJmXFx1MDEwMGFoXFx1MWRjMFxcdTFkYzNyXFx4ZjJcXHUwNDI5YVxceGYyXFx1MGZhNmFuZ2xlO1xcdTY5YTZcXHUwMTAwY2lcXHUxZGQyXFx1MWRkNXk7XFx1NDQ1ZmdyYXJyO1xcdTY3ZmZcXHUwOTAwRGFjZGVmZ2xtbm9wcXJzdHV4XFx1MWUwMVxcdTFlMDlcXHUxZTE5XFx1MWUzOFxcdTA1NzhcXHUxZTNjXFx1MWU0OVxcdTFlNjFcXHUxZTdlXFx1MWVhNVxcdTFlYWZcXHUxZWJkXFx1MWVlMVxcdTFmMmFcXHUxZjM3XFx1MWY0NFxcdTFmNGVcXHUxZjVhXFx1MDEwMERvXFx1MWUwNlxcdTFkMzRvXFx4ZjRcXHUxYzg5XFx1MDEwMGNzXFx1MWUwZVxcdTFlMTR1dGVcXHU4MDNiXFx4ZTlcXHU0MGU5dGVyO1xcdTZhNmVcXHUwMjAwYWlveVxcdTFlMjJcXHUxZTI3XFx1MWUzMVxcdTFlMzZyb247XFx1NDExYnJcXHUwMTAwO2NcXHUxZTJkXFx1MWUyZVxcdTYyNTZcXHU4MDNiXFx4ZWFcXHU0MGVhbG9uO1xcdTYyNTU7XFx1NDQ0ZG90O1xcdTQxMTdcXHUwMTAwRHJcXHUxZTQxXFx1MWU0NW90O1xcdTYyNTI7XFx1YzAwMFxcdWQ4MzVcXHVkZDIyXFx1MDE4MDtyc1xcdTFlNTBcXHUxZTUxXFx1MWU1N1xcdTZhOWFhdmVcXHU4MDNiXFx4ZThcXHU0MGU4XFx1MDEwMDtkXFx1MWU1Y1xcdTFlNWRcXHU2YTk2b3Q7XFx1NmE5OFxcdTAyMDA7aWxzXFx1MWU2YVxcdTFlNmJcXHUxZTcyXFx1MWU3NFxcdTZhOTludGVycztcXHU2M2U3O1xcdTYxMTNcXHUwMTAwO2RcXHUxZTc5XFx1MWU3YVxcdTZhOTVvdDtcXHU2YTk3XFx1MDE4MGFwc1xcdTFlODVcXHUxZTg5XFx1MWU5N2NyO1xcdTQxMTN0eVxcdTAxODA7c3ZcXHUxZTkyXFx1MWU5M1xcdTFlOTVcXHU2MjA1ZXRcXHhiYlxcdTFlOTNwXFx1MDEwMDE7XFx1MWU5ZFxcdTFlYTRcXHUwMTMzXFx1MWVhMVxcdTFlYTM7XFx1NjAwNDtcXHU2MDA1XFx1NjAwM1xcdTAxMDBnc1xcdTFlYWFcXHUxZWFjO1xcdTQxNGJwO1xcdTYwMDJcXHUwMTAwZ3BcXHUxZWI0XFx1MWViOG9uO1xcdTQxMTlmO1xcdWMwMDBcXHVkODM1XFx1ZGQ1NlxcdTAxODBhbHNcXHUxZWM0XFx1MWVjZVxcdTFlZDJyXFx1MDEwMDtzXFx1MWVjYVxcdTFlY2JcXHU2MmQ1bDtcXHU2OWUzdXM7XFx1NmE3MWlcXHUwMTgwO2x2XFx1MWVkYVxcdTFlZGJcXHUxZWRmXFx1NDNiNW9uXFx4YmJcXHUxZWRiO1xcdTQzZjVcXHUwMjAwY3N1dlxcdTFlZWFcXHUxZWYzXFx1MWYwYlxcdTFmMjNcXHUwMTAwaW9cXHUxZWVmXFx1MWUzMXJjXFx4YmJcXHUxZTJlXFx1MDI2OVxcdTFlZjlcXDBcXDBcXHUxZWZiXFx4ZWRcXHUwNTQ4YW50XFx1MDEwMGdsXFx1MWYwMlxcdTFmMDZ0clxceGJiXFx1MWU1ZGVzc1xceGJiXFx1MWU3YVxcdTAxODBhZWlcXHUxZjEyXFx1MWYxNlxcdTFmMWFscztcXHU0MDNkc3Q7XFx1NjI1ZnZcXHUwMTAwO0RcXHUwMjM1XFx1MWYyMEQ7XFx1NmE3OHBhcnNsO1xcdTY5ZTVcXHUwMTAwRGFcXHUxZjJmXFx1MWYzM290O1xcdTYyNTNycjtcXHU2OTcxXFx1MDE4MGNkaVxcdTFmM2VcXHUxZjQxXFx1MWVmOHI7XFx1NjEyZm9cXHhmNFxcdTAzNTJcXHUwMTAwYWhcXHUxZjQ5XFx1MWY0YjtcXHU0M2I3XFx1ODAzYlxceGYwXFx1NDBmMFxcdTAxMDBtclxcdTFmNTNcXHUxZjU3bFxcdTgwM2JcXHhlYlxcdTQwZWJvO1xcdTYwYWNcXHUwMTgwY2lwXFx1MWY2MVxcdTFmNjRcXHUxZjY3bDtcXHU0MDIxc1xceGY0XFx1MDU2ZVxcdTAxMDBlb1xcdTFmNmNcXHUxZjc0Y3RhdGlvXFx4ZWVcXHUwNTU5bmVudGlhbFxceGU1XFx1MDU3OVxcdTA5ZTFcXHUxZjkyXFwwXFx1MWY5ZVxcMFxcdTFmYTFcXHUxZmE3XFwwXFwwXFx1MWZjNlxcdTFmY2NcXDBcXHUxZmQzXFwwXFx1MWZlNlxcdTFmZWFcXHUyMDAwXFwwXFx1MjAwOFxcdTIwNWFsbGluZ2RvdHNlXFx4ZjFcXHUxZTQ0eTtcXHU0NDQ0bWFsZTtcXHU2NjQwXFx1MDE4MGlsclxcdTFmYWRcXHUxZmIzXFx1MWZjMWxpZztcXHU4MDAwXFx1ZmIwM1xcdTAyNjlcXHUxZmI5XFwwXFwwXFx1MWZiZGc7XFx1ODAwMFxcdWZiMDBpZztcXHU4MDAwXFx1ZmIwNDtcXHVjMDAwXFx1ZDgzNVxcdWRkMjNsaWc7XFx1ODAwMFxcdWZiMDFsaWc7XFx1YzAwMGZqXFx1MDE4MGFsdFxcdTFmZDlcXHUxZmRjXFx1MWZlMXQ7XFx1NjY2ZGlnO1xcdTgwMDBcXHVmYjAybnM7XFx1NjViMW9mO1xcdTQxOTJcXHUwMWYwXFx1MWZlZVxcMFxcdTFmZjNmO1xcdWMwMDBcXHVkODM1XFx1ZGQ1N1xcdTAxMDBha1xcdTA1YmZcXHUxZmY3XFx1MDEwMDt2XFx1MWZmY1xcdTFmZmRcXHU2MmQ0O1xcdTZhZDlhcnRpbnQ7XFx1NmEwZFxcdTAxMDBhb1xcdTIwMGNcXHUyMDU1XFx1MDEwMGNzXFx1MjAxMVxcdTIwNTJcXHUwM2IxXFx1MjAxYVxcdTIwMzBcXHUyMDM4XFx1MjA0NVxcdTIwNDhcXDBcXHUyMDUwXFx1MDNiMlxcdTIwMjJcXHUyMDI1XFx1MjAyN1xcdTIwMmFcXHUyMDJjXFwwXFx1MjAyZVxcdTgwM2JcXHhiZFxcdTQwYmQ7XFx1NjE1M1xcdTgwM2JcXHhiY1xcdTQwYmM7XFx1NjE1NTtcXHU2MTU5O1xcdTYxNWJcXHUwMWIzXFx1MjAzNFxcMFxcdTIwMzY7XFx1NjE1NDtcXHU2MTU2XFx1MDJiNFxcdTIwM2VcXHUyMDQxXFwwXFwwXFx1MjA0M1xcdTgwM2JcXHhiZVxcdTQwYmU7XFx1NjE1NztcXHU2MTVjNTtcXHU2MTU4XFx1MDFiNlxcdTIwNGNcXDBcXHUyMDRlO1xcdTYxNWE7XFx1NjE1ZDg7XFx1NjE1ZWw7XFx1NjA0NHduO1xcdTYzMjJjcjtcXHVjMDAwXFx1ZDgzNVxcdWRjYmJcXHUwODgwRWFiY2RlZmdpamxub3JzdHZcXHUyMDgyXFx1MjA4OVxcdTIwOWZcXHUyMGE1XFx1MjBiMFxcdTIwYjRcXHUyMGYwXFx1MjBmNVxcdTIwZmFcXHUyMGZmXFx1MjEwM1xcdTIxMTJcXHUyMTM4XFx1MDMxN1xcdTIxM2VcXHUyMTUyXFx1MjE5ZVxcdTAxMDA7bFxcdTA2NGRcXHUyMDg3O1xcdTZhOGNcXHUwMTgwY21wXFx1MjA5MFxcdTIwOTVcXHUyMDlkdXRlO1xcdTQxZjVtYVxcdTAxMDA7ZFxcdTIwOWNcXHUxY2RhXFx1NDNiMztcXHU2YTg2cmV2ZTtcXHU0MTFmXFx1MDEwMGl5XFx1MjBhYVxcdTIwYWVyYztcXHU0MTFkO1xcdTQ0MzNvdDtcXHU0MTIxXFx1MDIwMDtscXNcXHUwNjNlXFx1MDY0MlxcdTIwYmRcXHUyMGM5XFx1MDE4MDtxc1xcdTA2M2VcXHUwNjRjXFx1MjBjNGxhblxceGY0XFx1MDY2NVxcdTAyMDA7Y2RsXFx1MDY2NVxcdTIwZDJcXHUyMGQ1XFx1MjBlNWM7XFx1NmFhOW90XFx1MDEwMDtvXFx1MjBkY1xcdTIwZGRcXHU2YTgwXFx1MDEwMDtsXFx1MjBlMlxcdTIwZTNcXHU2YTgyO1xcdTZhODRcXHUwMTAwO2VcXHUyMGVhXFx1MjBlZFxcdWMwMDBcXHUyMmRiXFx1ZmUwMHM7XFx1NmE5NHI7XFx1YzAwMFxcdWQ4MzVcXHVkZDI0XFx1MDEwMDtnXFx1MDY3M1xcdTA2MWJtZWw7XFx1NjEzN2N5O1xcdTQ0NTNcXHUwMjAwO0VhalxcdTA2NWFcXHUyMTBjXFx1MjEwZVxcdTIxMTA7XFx1NmE5MjtcXHU2YWE1O1xcdTZhYTRcXHUwMjAwRWFlc1xcdTIxMWJcXHUyMTFkXFx1MjEyOVxcdTIxMzQ7XFx1NjI2OXBcXHUwMTAwO3BcXHUyMTIzXFx1MjEyNFxcdTZhOGFyb3hcXHhiYlxcdTIxMjRcXHUwMTAwO3FcXHUyMTJlXFx1MjEyZlxcdTZhODhcXHUwMTAwO3FcXHUyMTJlXFx1MjExYmltO1xcdTYyZTdwZjtcXHVjMDAwXFx1ZDgzNVxcdWRkNThcXHUwMTAwY2lcXHUyMTQzXFx1MjE0NnI7XFx1NjEwYW1cXHUwMTgwO2VsXFx1MDY2YlxcdTIxNGVcXHUyMTUwO1xcdTZhOGU7XFx1NmE5MFxcdTgzMDA+O2NkbHFyXFx1MDVlZVxcdTIxNjBcXHUyMTZhXFx1MjE2ZVxcdTIxNzNcXHUyMTc5XFx1MDEwMGNpXFx1MjE2NVxcdTIxNjc7XFx1NmFhN3I7XFx1NmE3YW90O1xcdTYyZDdQYXI7XFx1Njk5NXVlc3Q7XFx1NmE3Y1xcdTAyODBhZGVsc1xcdTIxODRcXHUyMTZhXFx1MjE5MFxcdTA2NTZcXHUyMTliXFx1MDFmMFxcdTIxODlcXDBcXHUyMThlcHJvXFx4ZjhcXHUyMDllcjtcXHU2OTc4cVxcdTAxMDBscVxcdTA2M2ZcXHUyMTk2bGVzXFx4ZjNcXHUyMDg4aVxceGVkXFx1MDY2YlxcdTAxMDBlblxcdTIxYTNcXHUyMWFkcnRuZXFxO1xcdWMwMDBcXHUyMjY5XFx1ZmUwMFxceGM1XFx1MjFhYVxcdTA1MDBBYWJjZWZrb3N5XFx1MjFjNFxcdTIxYzdcXHUyMWYxXFx1MjFmNVxcdTIxZmFcXHUyMjE4XFx1MjIxZFxcdTIyMmZcXHUyMjY4XFx1MjI3ZHJcXHhmMlxcdTAzYTBcXHUwMjAwaWxtclxcdTIxZDBcXHUyMWQ0XFx1MjFkN1xcdTIxZGJyc1xceGYwXFx1MTQ4NGZcXHhiYlxcdTIwMjRpbFxceGY0XFx1MDZhOVxcdTAxMDBkclxcdTIxZTBcXHUyMWU0Y3k7XFx1NDQ0YVxcdTAxODA7Y3dcXHUwOGY0XFx1MjFlYlxcdTIxZWZpcjtcXHU2OTQ4O1xcdTYxYWRhcjtcXHU2MTBmaXJjO1xcdTQxMjVcXHUwMTgwYWxyXFx1MjIwMVxcdTIyMGVcXHUyMjEzcnRzXFx1MDEwMDt1XFx1MjIwOVxcdTIyMGFcXHU2NjY1aXRcXHhiYlxcdTIyMGFsaXA7XFx1NjAyNmNvbjtcXHU2MmI5cjtcXHVjMDAwXFx1ZDgzNVxcdWRkMjVzXFx1MDEwMGV3XFx1MjIyM1xcdTIyMjlhcm93O1xcdTY5MjVhcm93O1xcdTY5MjZcXHUwMjgwYW1vcHJcXHUyMjNhXFx1MjIzZVxcdTIyNDNcXHUyMjVlXFx1MjI2M3JyO1xcdTYxZmZ0aHQ7XFx1NjIzYmtcXHUwMTAwbHJcXHUyMjQ5XFx1MjI1M2VmdGFycm93O1xcdTYxYTlpZ2h0YXJyb3c7XFx1NjFhYWY7XFx1YzAwMFxcdWQ4MzVcXHVkZDU5YmFyO1xcdTYwMTVcXHUwMTgwY2x0XFx1MjI2ZlxcdTIyNzRcXHUyMjc4cjtcXHVjMDAwXFx1ZDgzNVxcdWRjYmRhc1xceGU4XFx1MjFmNHJvaztcXHU0MTI3XFx1MDEwMGJwXFx1MjI4MlxcdTIyODd1bGw7XFx1NjA0M2hlblxceGJiXFx1MWM1YlxcdTBhZTFcXHUyMmEzXFwwXFx1MjJhYVxcMFxcdTIyYjhcXHUyMmM1XFx1MjJjZVxcMFxcdTIyZDVcXHUyMmYzXFwwXFwwXFx1MjJmOFxcdTIzMjJcXHUyMzY3XFx1MjM2MlxcdTIzN2ZcXDBcXHUyMzg2XFx1MjNhYVxcdTIzYjRjdXRlXFx1ODAzYlxceGVkXFx1NDBlZFxcdTAxODA7aXlcXHUwNzcxXFx1MjJiMFxcdTIyYjVyY1xcdTgwM2JcXHhlZVxcdTQwZWU7XFx1NDQzOFxcdTAxMDBjeFxcdTIyYmNcXHUyMmJmeTtcXHU0NDM1Y2xcXHU4MDNiXFx4YTFcXHU0MGExXFx1MDEwMGZyXFx1MDM5ZlxcdTIyYzk7XFx1YzAwMFxcdWQ4MzVcXHVkZDI2cmF2ZVxcdTgwM2JcXHhlY1xcdTQwZWNcXHUwMjAwO2lub1xcdTA3M2VcXHUyMmRkXFx1MjJlOVxcdTIyZWVcXHUwMTAwaW5cXHUyMmUyXFx1MjJlNm50O1xcdTZhMGN0O1xcdTYyMmRmaW47XFx1NjlkY3RhO1xcdTYxMjlsaWc7XFx1NDEzM1xcdTAxODBhb3BcXHUyMmZlXFx1MjMxYVxcdTIzMWRcXHUwMTgwY2d0XFx1MjMwNVxcdTIzMDhcXHUyMzE3cjtcXHU0MTJiXFx1MDE4MGVscFxcdTA3MWZcXHUyMzBmXFx1MjMxM2luXFx4ZTVcXHUwNzhlYXJcXHhmNFxcdTA3MjBoO1xcdTQxMzFmO1xcdTYyYjdlZDtcXHU0MWI1XFx1MDI4MDtjZm90XFx1MDRmNFxcdTIzMmNcXHUyMzMxXFx1MjMzZFxcdTIzNDFhcmU7XFx1NjEwNWluXFx1MDEwMDt0XFx1MjMzOFxcdTIzMzlcXHU2MjFlaWU7XFx1NjlkZGRvXFx4ZjRcXHUyMzE5XFx1MDI4MDtjZWxwXFx1MDc1N1xcdTIzNGNcXHUyMzUwXFx1MjM1YlxcdTIzNjFhbDtcXHU2MmJhXFx1MDEwMGdyXFx1MjM1NVxcdTIzNTllclxceGYzXFx1MTU2M1xceGUzXFx1MjM0ZGFyaGs7XFx1NmExN3JvZDtcXHU2YTNjXFx1MDIwMGNncHRcXHUyMzZmXFx1MjM3MlxcdTIzNzZcXHUyMzdieTtcXHU0NDUxb247XFx1NDEyZmY7XFx1YzAwMFxcdWQ4MzVcXHVkZDVhYTtcXHU0M2I5dWVzdFxcdTgwM2JcXHhiZlxcdTQwYmZcXHUwMTAwY2lcXHUyMzhhXFx1MjM4ZnI7XFx1YzAwMFxcdWQ4MzVcXHVkY2JlblxcdTAyODA7RWRzdlxcdTA0ZjRcXHUyMzliXFx1MjM5ZFxcdTIzYTFcXHUwNGYzO1xcdTYyZjlvdDtcXHU2MmY1XFx1MDEwMDt2XFx1MjNhNlxcdTIzYTdcXHU2MmY0O1xcdTYyZjNcXHUwMTAwO2lcXHUwNzc3XFx1MjNhZWxkZTtcXHU0MTI5XFx1MDFlYlxcdTIzYjhcXDBcXHUyM2JjY3k7XFx1NDQ1NmxcXHU4MDNiXFx4ZWZcXHU0MGVmXFx1MDMwMGNmbW9zdVxcdTIzY2NcXHUyM2Q3XFx1MjNkY1xcdTIzZTFcXHUyM2U3XFx1MjNmNVxcdTAxMDBpeVxcdTIzZDFcXHUyM2Q1cmM7XFx1NDEzNTtcXHU0NDM5cjtcXHVjMDAwXFx1ZDgzNVxcdWRkMjdhdGg7XFx1NDIzN3BmO1xcdWMwMDBcXHVkODM1XFx1ZGQ1YlxcdTAxZTNcXHUyM2VjXFwwXFx1MjNmMXI7XFx1YzAwMFxcdWQ4MzVcXHVkY2JmcmN5O1xcdTQ0NThrY3k7XFx1NDQ1NFxcdTA0MDBhY2ZnaGpvc1xcdTI0MGJcXHUyNDE2XFx1MjQyMlxcdTI0MjdcXHUyNDJkXFx1MjQzMVxcdTI0MzVcXHUyNDNicHBhXFx1MDEwMDt2XFx1MjQxM1xcdTI0MTRcXHU0M2JhO1xcdTQzZjBcXHUwMTAwZXlcXHUyNDFiXFx1MjQyMGRpbDtcXHU0MTM3O1xcdTQ0M2FyO1xcdWMwMDBcXHVkODM1XFx1ZGQyOHJlZW47XFx1NDEzOGN5O1xcdTQ0NDVjeTtcXHU0NDVjcGY7XFx1YzAwMFxcdWQ4MzVcXHVkZDVjY3I7XFx1YzAwMFxcdWQ4MzVcXHVkY2MwXFx1MGI4MEFCRUhhYmNkZWZnaGpsbW5vcHJzdHV2XFx1MjQ3MFxcdTI0ODFcXHUyNDg2XFx1MjQ4ZFxcdTI0OTFcXHUyNTBlXFx1MjUzZFxcdTI1NWFcXHUyNTgwXFx1MjY0ZVxcdTI2NWVcXHUyNjY1XFx1MjY3OVxcdTI2N2RcXHUyNjlhXFx1MjZiMlxcdTI2ZDhcXHUyNzVkXFx1Mjc2OFxcdTI3OGJcXHUyN2MwXFx1MjgwMVxcdTI4MTJcXHUwMTgwYXJ0XFx1MjQ3N1xcdTI0N2FcXHUyNDdjclxceGYyXFx1MDljNlxceGYyXFx1MDM5NWFpbDtcXHU2OTFiYXJyO1xcdTY5MGVcXHUwMTAwO2dcXHUwOTk0XFx1MjQ4YjtcXHU2YThiYXI7XFx1Njk2MlxcdTA5NjNcXHUyNGE1XFwwXFx1MjRhYVxcMFxcdTI0YjFcXDBcXDBcXDBcXDBcXDBcXHUyNGI1XFx1MjRiYVxcMFxcdTI0YzZcXHUyNGM4XFx1MjRjZFxcMFxcdTI0Zjl1dGU7XFx1NDEzYW1wdHl2O1xcdTY5YjRyYVxceGVlXFx1MDg0Y2JkYTtcXHU0M2JiZ1xcdTAxODA7ZGxcXHUwODhlXFx1MjRjMVxcdTI0YzM7XFx1Njk5MVxceGU1XFx1MDg4ZTtcXHU2YTg1dW9cXHU4MDNiXFx4YWJcXHU0MGFiclxcdTA0MDA7YmZobHBzdFxcdTA4OTlcXHUyNGRlXFx1MjRlNlxcdTI0ZTlcXHUyNGViXFx1MjRlZVxcdTI0ZjFcXHUyNGY1XFx1MDEwMDtmXFx1MDg5ZFxcdTI0ZTNzO1xcdTY5MWZzO1xcdTY5MWRcXHhlYlxcdTIyNTJwO1xcdTYxYWJsO1xcdTY5MzlpbTtcXHU2OTczbDtcXHU2MWEyXFx1MDE4MDthZVxcdTI0ZmZcXHUyNTAwXFx1MjUwNFxcdTZhYWJpbDtcXHU2OTE5XFx1MDEwMDtzXFx1MjUwOVxcdTI1MGFcXHU2YWFkO1xcdWMwMDBcXHUyYWFkXFx1ZmUwMFxcdTAxODBhYnJcXHUyNTE1XFx1MjUxOVxcdTI1MWRycjtcXHU2OTBjcms7XFx1Njc3MlxcdTAxMDBha1xcdTI1MjJcXHUyNTJjY1xcdTAxMDBla1xcdTI1MjhcXHUyNTJhO1xcdTQwN2I7XFx1NDA1YlxcdTAxMDBlc1xcdTI1MzFcXHUyNTMzO1xcdTY5OGJsXFx1MDEwMGR1XFx1MjUzOVxcdTI1M2I7XFx1Njk4ZjtcXHU2OThkXFx1MDIwMGFldXlcXHUyNTQ2XFx1MjU0YlxcdTI1NTZcXHUyNTU4cm9uO1xcdTQxM2VcXHUwMTAwZGlcXHUyNTUwXFx1MjU1NGlsO1xcdTQxM2NcXHhlY1xcdTA4YjBcXHhlMlxcdTI1Mjk7XFx1NDQzYlxcdTAyMDBjcXJzXFx1MjU2M1xcdTI1NjZcXHUyNTZkXFx1MjU3ZGE7XFx1NjkzNnVvXFx1MDEwMDtyXFx1MGUxOVxcdTE3NDZcXHUwMTAwZHVcXHUyNTcyXFx1MjU3N2hhcjtcXHU2OTY3c2hhcjtcXHU2OTRiaDtcXHU2MWIyXFx1MDI4MDtmZ3FzXFx1MjU4YlxcdTI1OGNcXHUwOTg5XFx1MjVmM1xcdTI1ZmZcXHU2MjY0dFxcdTAyODBhaGxydFxcdTI1OThcXHUyNWE0XFx1MjViN1xcdTI1YzJcXHUyNWU4cnJvd1xcdTAxMDA7dFxcdTA4OTlcXHUyNWExYVxceGU5XFx1MjRmNmFycG9vblxcdTAxMDBkdVxcdTI1YWZcXHUyNWI0b3duXFx4YmJcXHUwNDVhcFxceGJiXFx1MDk2NmVmdGFycm93cztcXHU2MWM3aWdodFxcdTAxODBhaHNcXHUyNWNkXFx1MjVkNlxcdTI1ZGVycm93XFx1MDEwMDtzXFx1MDhmNFxcdTA4YTdhcnBvb25cXHhmM1xcdTBmOThxdWlnYXJyb1xceGY3XFx1MjFmMGhyZWV0aW1lcztcXHU2MmNiXFx1MDE4MDtxc1xcdTI1OGJcXHUwOTkzXFx1MjVmYWxhblxceGY0XFx1MDlhY1xcdTAyODA7Y2Rnc1xcdTA5YWNcXHUyNjBhXFx1MjYwZFxcdTI2MWRcXHUyNjI4YztcXHU2YWE4b3RcXHUwMTAwO29cXHUyNjE0XFx1MjYxNVxcdTZhN2ZcXHUwMTAwO3JcXHUyNjFhXFx1MjYxYlxcdTZhODE7XFx1NmE4M1xcdTAxMDA7ZVxcdTI2MjJcXHUyNjI1XFx1YzAwMFxcdTIyZGFcXHVmZTAwcztcXHU2YTkzXFx1MDI4MGFkZWdzXFx1MjYzM1xcdTI2MzlcXHUyNjNkXFx1MjY0OVxcdTI2NGJwcHJvXFx4ZjhcXHUyNGM2b3Q7XFx1NjJkNnFcXHUwMTAwZ3FcXHUyNjQzXFx1MjY0NVxceGY0XFx1MDk4OWd0XFx4ZjJcXHUyNDhjXFx4ZjRcXHUwOTliaVxceGVkXFx1MDliMlxcdTAxODBpbHJcXHUyNjU1XFx1MDhlMVxcdTI2NWFzaHQ7XFx1Njk3YztcXHVjMDAwXFx1ZDgzNVxcdWRkMjlcXHUwMTAwO0VcXHUwOTljXFx1MjY2MztcXHU2YTkxXFx1MDE2MVxcdTI2NjlcXHUyNjc2clxcdTAxMDBkdVxcdTI1YjJcXHUyNjZlXFx1MDEwMDtsXFx1MDk2NVxcdTI2NzM7XFx1Njk2YWxrO1xcdTY1ODRjeTtcXHU0NDU5XFx1MDI4MDthY2h0XFx1MGE0OFxcdTI2ODhcXHUyNjhiXFx1MjY5MVxcdTI2OTZyXFx4ZjJcXHUyNWMxb3JuZVxceGYyXFx1MWQwOGFyZDtcXHU2OTZicmk7XFx1NjVmYVxcdTAxMDBpb1xcdTI2OWZcXHUyNmE0ZG90O1xcdTQxNDB1c3RcXHUwMTAwO2FcXHUyNmFjXFx1MjZhZFxcdTYzYjBjaGVcXHhiYlxcdTI2YWRcXHUwMjAwRWFlc1xcdTI2YmJcXHUyNmJkXFx1MjZjOVxcdTI2ZDQ7XFx1NjI2OHBcXHUwMTAwO3BcXHUyNmMzXFx1MjZjNFxcdTZhODlyb3hcXHhiYlxcdTI2YzRcXHUwMTAwO3FcXHUyNmNlXFx1MjZjZlxcdTZhODdcXHUwMTAwO3FcXHUyNmNlXFx1MjZiYmltO1xcdTYyZTZcXHUwNDAwYWJub3B0d3pcXHUyNmU5XFx1MjZmNFxcdTI2ZjdcXHUyNzFhXFx1MjcyZlxcdTI3NDFcXHUyNzQ3XFx1Mjc1MFxcdTAxMDBuclxcdTI2ZWVcXHUyNmYxZztcXHU2N2VjcjtcXHU2MWZkclxceGViXFx1MDhjMWdcXHUwMTgwbG1yXFx1MjZmZlxcdTI3MGRcXHUyNzE0ZWZ0XFx1MDEwMGFyXFx1MDllNlxcdTI3MDdpZ2h0XFx4ZTFcXHUwOWYyYXBzdG87XFx1NjdmY2lnaHRcXHhlMVxcdTA5ZmRwYXJyb3dcXHUwMTAwbHJcXHUyNzI1XFx1MjcyOWVmXFx4ZjRcXHUyNGVkaWdodDtcXHU2MWFjXFx1MDE4MGFmbFxcdTI3MzZcXHUyNzM5XFx1MjczZHI7XFx1Njk4NTtcXHVjMDAwXFx1ZDgzNVxcdWRkNWR1cztcXHU2YTJkaW1lcztcXHU2YTM0XFx1MDE2MVxcdTI3NGJcXHUyNzRmc3Q7XFx1NjIxN1xceGUxXFx1MTM0ZVxcdTAxODA7ZWZcXHUyNzU3XFx1Mjc1OFxcdTE4MDBcXHU2NWNhbmdlXFx4YmJcXHUyNzU4YXJcXHUwMTAwO2xcXHUyNzY0XFx1Mjc2NVxcdTQwMjh0O1xcdTY5OTNcXHUwMjgwYWNobXRcXHUyNzczXFx1Mjc3NlxcdTI3N2NcXHUyNzg1XFx1Mjc4N3JcXHhmMlxcdTA4YThvcm5lXFx4ZjJcXHUxZDhjYXJcXHUwMTAwO2RcXHUwZjk4XFx1Mjc4MztcXHU2OTZkO1xcdTYwMGVyaTtcXHU2MmJmXFx1MDMwMGFjaGlxdFxcdTI3OThcXHUyNzlkXFx1MGE0MFxcdTI3YTJcXHUyN2FlXFx1MjdiYnF1bztcXHU2MDM5cjtcXHVjMDAwXFx1ZDgzNVxcdWRjYzFtXFx1MDE4MDtlZ1xcdTA5YjJcXHUyN2FhXFx1MjdhYztcXHU2YThkO1xcdTZhOGZcXHUwMTAwYnVcXHUyNTJhXFx1MjdiM29cXHUwMTAwO3JcXHUwZTFmXFx1MjdiOTtcXHU2MDFhcm9rO1xcdTQxNDJcXHU4NDAwPDtjZGhpbHFyXFx1MDgyYlxcdTI3ZDJcXHUyNjM5XFx1MjdkY1xcdTI3ZTBcXHUyN2U1XFx1MjdlYVxcdTI3ZjBcXHUwMTAwY2lcXHUyN2Q3XFx1MjdkOTtcXHU2YWE2cjtcXHU2YTc5cmVcXHhlNVxcdTI1ZjJtZXM7XFx1NjJjOWFycjtcXHU2OTc2dWVzdDtcXHU2YTdiXFx1MDEwMFBpXFx1MjdmNVxcdTI3ZjlhcjtcXHU2OTk2XFx1MDE4MDtlZlxcdTI4MDBcXHUwOTJkXFx1MTgxYlxcdTY1YzNyXFx1MDEwMGR1XFx1MjgwN1xcdTI4MGRzaGFyO1xcdTY5NGFoYXI7XFx1Njk2NlxcdTAxMDBlblxcdTI4MTdcXHUyODIxcnRuZXFxO1xcdWMwMDBcXHUyMjY4XFx1ZmUwMFxceGM1XFx1MjgxZVxcdTA3MDBEYWNkZWZoaWxub3BzdVxcdTI4NDBcXHUyODQ1XFx1Mjg4MlxcdTI4OGVcXHUyODkzXFx1MjhhMFxcdTI4YTVcXHUyOGE4XFx1MjhkYVxcdTI4ZTJcXHUyOGU0XFx1MGE4M1xcdTI4ZjNcXHUyOTAyRG90O1xcdTYyM2FcXHUwMjAwY2xwclxcdTI4NGVcXHUyODUyXFx1Mjg2M1xcdTI4N2RyXFx1ODAzYlxceGFmXFx1NDBhZlxcdTAxMDBldFxcdTI4NTdcXHUyODU5O1xcdTY2NDJcXHUwMTAwO2VcXHUyODVlXFx1Mjg1ZlxcdTY3MjBzZVxceGJiXFx1Mjg1ZlxcdTAxMDA7c1xcdTEwM2JcXHUyODY4dG9cXHUwMjAwO2RsdVxcdTEwM2JcXHUyODczXFx1Mjg3N1xcdTI4N2Jvd1xceGVlXFx1MDQ4Y2VmXFx4ZjRcXHUwOTBmXFx4ZjBcXHUxM2Qxa2VyO1xcdTY1YWVcXHUwMTAwb3lcXHUyODg3XFx1Mjg4Y21tYTtcXHU2YTI5O1xcdTQ0M2Nhc2g7XFx1NjAxNGFzdXJlZGFuZ2xlXFx4YmJcXHUxNjI2cjtcXHVjMDAwXFx1ZDgzNVxcdWRkMmFvO1xcdTYxMjdcXHUwMTgwY2RuXFx1MjhhZlxcdTI4YjRcXHUyOGM5cm9cXHU4MDNiXFx4YjVcXHU0MGI1XFx1MDIwMDthY2RcXHUxNDY0XFx1MjhiZFxcdTI4YzBcXHUyOGM0c1xceGY0XFx1MTZhN2lyO1xcdTZhZjBvdFxcdTgwYmJcXHhiN1xcdTAxYjV1c1xcdTAxODA7YmRcXHUyOGQyXFx1MTkwM1xcdTI4ZDNcXHU2MjEyXFx1MDEwMDt1XFx1MWQzY1xcdTI4ZDg7XFx1NmEyYVxcdTAxNjNcXHUyOGRlXFx1MjhlMXA7XFx1NmFkYlxceGYyXFx1MjIxMlxceGYwXFx1MGE4MVxcdTAxMDBkcFxcdTI4ZTlcXHUyOGVlZWxzO1xcdTYyYTdmO1xcdWMwMDBcXHVkODM1XFx1ZGQ1ZVxcdTAxMDBjdFxcdTI4ZjhcXHUyOGZkcjtcXHVjMDAwXFx1ZDgzNVxcdWRjYzJwb3NcXHhiYlxcdTE1OWRcXHUwMTgwO2xtXFx1MjkwOVxcdTI5MGFcXHUyOTBkXFx1NDNiY3RpbWFwO1xcdTYyYjhcXHUwYzAwR0xSVmFiY2RlZmdoaWpsbW9wcnN0dXZ3XFx1Mjk0MlxcdTI5NTNcXHUyOTdlXFx1Mjk4OVxcdTI5OThcXHUyOWRhXFx1MjllOVxcdTJhMTVcXHUyYTFhXFx1MmE1OFxcdTJhNWRcXHUyYTgzXFx1MmE5NVxcdTJhYTRcXHUyYWE4XFx1MmIwNFxcdTJiMDdcXHUyYjQ0XFx1MmI3ZlxcdTJiYWVcXHUyYzM0XFx1MmM2N1xcdTJjN2NcXHUyY2U5XFx1MDEwMGd0XFx1Mjk0N1xcdTI5NGI7XFx1YzAwMFxcdTIyZDlcXHUwMzM4XFx1MDEwMDt2XFx1Mjk1MFxcdTBiY2ZcXHVjMDAwXFx1MjI2YlxcdTIwZDJcXHUwMTgwZWx0XFx1Mjk1YVxcdTI5NzJcXHUyOTc2ZnRcXHUwMTAwYXJcXHUyOTYxXFx1Mjk2N3Jyb3c7XFx1NjFjZGlnaHRhcnJvdztcXHU2MWNlO1xcdWMwMDBcXHUyMmQ4XFx1MDMzOFxcdTAxMDA7dlxcdTI5N2JcXHUwYzQ3XFx1YzAwMFxcdTIyNmFcXHUyMGQyaWdodGFycm93O1xcdTYxY2ZcXHUwMTAwRGRcXHUyOThlXFx1Mjk5M2FzaDtcXHU2MmFmYXNoO1xcdTYyYWVcXHUwMjgwYmNucHRcXHUyOWEzXFx1MjlhN1xcdTI5YWNcXHUyOWIxXFx1MjljY2xhXFx4YmJcXHUwMmRldXRlO1xcdTQxNDRnO1xcdWMwMDBcXHUyMjIwXFx1MjBkMlxcdTAyODA7RWlvcFxcdTBkODRcXHUyOWJjXFx1MjljMFxcdTI5YzVcXHUyOWM4O1xcdWMwMDBcXHUyYTcwXFx1MDMzOGQ7XFx1YzAwMFxcdTIyNGJcXHUwMzM4cztcXHU0MTQ5cm9cXHhmOFxcdTBkODR1clxcdTAxMDA7YVxcdTI5ZDNcXHUyOWQ0XFx1NjY2ZWxcXHUwMTAwO3NcXHUyOWQzXFx1MGIzOFxcdTAxZjNcXHUyOWRmXFwwXFx1MjllM3BcXHU4MGJiXFx4YTBcXHUwYjM3bXBcXHUwMTAwO2VcXHUwYmY5XFx1MGMwMFxcdTAyODBhZW91eVxcdTI5ZjRcXHUyOWZlXFx1MmEwM1xcdTJhMTBcXHUyYTEzXFx1MDFmMFxcdTI5ZjlcXDBcXHUyOWZiO1xcdTZhNDNvbjtcXHU0MTQ4ZGlsO1xcdTQxNDZuZ1xcdTAxMDA7ZFxcdTBkN2VcXHUyYTBhb3Q7XFx1YzAwMFxcdTJhNmRcXHUwMzM4cDtcXHU2YTQyO1xcdTQ0M2Rhc2g7XFx1NjAxM1xcdTAzODA7QWFkcXN4XFx1MGI5MlxcdTJhMjlcXHUyYTJkXFx1MmEzYlxcdTJhNDFcXHUyYTQ1XFx1MmE1MHJyO1xcdTYxZDdyXFx1MDEwMGhyXFx1MmEzM1xcdTJhMzZrO1xcdTY5MjRcXHUwMTAwO29cXHUxM2YyXFx1MTNmMG90O1xcdWMwMDBcXHUyMjUwXFx1MDMzOHVpXFx4ZjZcXHUwYjYzXFx1MDEwMGVpXFx1MmE0YVxcdTJhNGVhcjtcXHU2OTI4XFx4ZWRcXHUwYjk4aXN0XFx1MDEwMDtzXFx1MGJhMFxcdTBiOWZyO1xcdWMwMDBcXHVkODM1XFx1ZGQyYlxcdTAyMDBFZXN0XFx1MGJjNVxcdTJhNjZcXHUyYTc5XFx1MmE3Y1xcdTAxODA7cXNcXHUwYmJjXFx1MmE2ZFxcdTBiZTFcXHUwMTgwO3FzXFx1MGJiY1xcdTBiYzVcXHUyYTc0bGFuXFx4ZjRcXHUwYmUyaVxceGVkXFx1MGJlYVxcdTAxMDA7clxcdTBiYjZcXHUyYTgxXFx4YmJcXHUwYmI3XFx1MDE4MEFhcFxcdTJhOGFcXHUyYThkXFx1MmE5MXJcXHhmMlxcdTI5NzFycjtcXHU2MWFlYXI7XFx1NmFmMlxcdTAxODA7c3ZcXHUwZjhkXFx1MmE5Y1xcdTBmOGNcXHUwMTAwO2RcXHUyYWExXFx1MmFhMlxcdTYyZmM7XFx1NjJmYWN5O1xcdTQ0NWFcXHUwMzgwQUVhZGVzdFxcdTJhYjdcXHUyYWJhXFx1MmFiZVxcdTJhYzJcXHUyYWM1XFx1MmFmNlxcdTJhZjlyXFx4ZjJcXHUyOTY2O1xcdWMwMDBcXHUyMjY2XFx1MDMzOHJyO1xcdTYxOWFyO1xcdTYwMjVcXHUwMjAwO2Zxc1xcdTBjM2JcXHUyYWNlXFx1MmFlM1xcdTJhZWZ0XFx1MDEwMGFyXFx1MmFkNFxcdTJhZDlycm9cXHhmN1xcdTJhYzFpZ2h0YXJyb1xceGY3XFx1MmE5MFxcdTAxODA7cXNcXHUwYzNiXFx1MmFiYVxcdTJhZWFsYW5cXHhmNFxcdTBjNTVcXHUwMTAwO3NcXHUwYzU1XFx1MmFmNFxceGJiXFx1MGMzNmlcXHhlZFxcdTBjNWRcXHUwMTAwO3JcXHUwYzM1XFx1MmFmZWlcXHUwMTAwO2VcXHUwYzFhXFx1MGMyNWlcXHhlNFxcdTBkOTBcXHUwMTAwcHRcXHUyYjBjXFx1MmIxMWY7XFx1YzAwMFxcdWQ4MzVcXHVkZDVmXFx1ODE4MFxceGFjO2luXFx1MmIxOVxcdTJiMWFcXHUyYjM2XFx1NDBhY25cXHUwMjAwO0VkdlxcdTBiODlcXHUyYjI0XFx1MmIyOFxcdTJiMmU7XFx1YzAwMFxcdTIyZjlcXHUwMzM4b3Q7XFx1YzAwMFxcdTIyZjVcXHUwMzM4XFx1MDFlMVxcdTBiODlcXHUyYjMzXFx1MmIzNTtcXHU2MmY3O1xcdTYyZjZpXFx1MDEwMDt2XFx1MGNiOFxcdTJiM2NcXHUwMWUxXFx1MGNiOFxcdTJiNDFcXHUyYjQzO1xcdTYyZmU7XFx1NjJmZFxcdTAxODBhb3JcXHUyYjRiXFx1MmI2M1xcdTJiNjlyXFx1MDIwMDthc3RcXHUwYjdiXFx1MmI1NVxcdTJiNWFcXHUyYjVmbGxlXFx4ZWNcXHUwYjdibDtcXHVjMDAwXFx1MmFmZFxcdTIwZTU7XFx1YzAwMFxcdTIyMDJcXHUwMzM4bGludDtcXHU2YTE0XFx1MDE4MDtjZVxcdTBjOTJcXHUyYjcwXFx1MmI3M3VcXHhlNVxcdTBjYTVcXHUwMTAwO2NcXHUwYzk4XFx1MmI3OFxcdTAxMDA7ZVxcdTBjOTJcXHUyYjdkXFx4ZjFcXHUwYzk4XFx1MDIwMEFhaXRcXHUyYjg4XFx1MmI4YlxcdTJiOWRcXHUyYmE3clxceGYyXFx1Mjk4OHJyXFx1MDE4MDtjd1xcdTJiOTRcXHUyYjk1XFx1MmI5OVxcdTYxOWI7XFx1YzAwMFxcdTI5MzNcXHUwMzM4O1xcdWMwMDBcXHUyMTlkXFx1MDMzOGdodGFycm93XFx4YmJcXHUyYjk1cmlcXHUwMTAwO2VcXHUwY2NiXFx1MGNkNlxcdTAzODBjaGltcHF1XFx1MmJiZFxcdTJiY2RcXHUyYmQ5XFx1MmIwNFxcdTBiNzhcXHUyYmU0XFx1MmJlZlxcdTAyMDA7Y2VyXFx1MGQzMlxcdTJiYzZcXHUwZDM3XFx1MmJjOXVcXHhlNVxcdTBkNDU7XFx1YzAwMFxcdWQ4MzVcXHVkY2Mzb3J0XFx1MDI2ZFxcdTJiMDVcXDBcXDBcXHUyYmQ2YXJcXHhlMVxcdTJiNTZtXFx1MDEwMDtlXFx1MGQ2ZVxcdTJiZGZcXHUwMTAwO3FcXHUwZDc0XFx1MGQ3M3N1XFx1MDEwMGJwXFx1MmJlYlxcdTJiZWRcXHhlNVxcdTBjZjhcXHhlNVxcdTBkMGJcXHUwMTgwYmNwXFx1MmJmNlxcdTJjMTFcXHUyYzE5XFx1MDIwMDtFZXNcXHUyYmZmXFx1MmMwMFxcdTBkMjJcXHUyYzA0XFx1NjI4NDtcXHVjMDAwXFx1MmFjNVxcdTAzMzhldFxcdTAxMDA7ZVxcdTBkMWJcXHUyYzBicVxcdTAxMDA7cVxcdTBkMjNcXHUyYzAwY1xcdTAxMDA7ZVxcdTBkMzJcXHUyYzE3XFx4ZjFcXHUwZDM4XFx1MDIwMDtFZXNcXHUyYzIyXFx1MmMyM1xcdTBkNWZcXHUyYzI3XFx1NjI4NTtcXHVjMDAwXFx1MmFjNlxcdTAzMzhldFxcdTAxMDA7ZVxcdTBkNThcXHUyYzJlcVxcdTAxMDA7cVxcdTBkNjBcXHUyYzIzXFx1MDIwMGdpbHJcXHUyYzNkXFx1MmMzZlxcdTJjNDVcXHUyYzQ3XFx4ZWNcXHUwYmQ3bGRlXFx1ODAzYlxceGYxXFx1NDBmMVxceGU3XFx1MGM0M2lhbmdsZVxcdTAxMDBsclxcdTJjNTJcXHUyYzVjZWZ0XFx1MDEwMDtlXFx1MGMxYVxcdTJjNWFcXHhmMVxcdTBjMjZpZ2h0XFx1MDEwMDtlXFx1MGNjYlxcdTJjNjVcXHhmMVxcdTBjZDdcXHUwMTAwO21cXHUyYzZjXFx1MmM2ZFxcdTQzYmRcXHUwMTgwO2VzXFx1MmM3NFxcdTJjNzVcXHUyYzc5XFx1NDAyM3JvO1xcdTYxMTZwO1xcdTYwMDdcXHUwNDgwREhhZGdpbHJzXFx1MmM4ZlxcdTJjOTRcXHUyYzk5XFx1MmM5ZVxcdTJjYTNcXHUyY2IwXFx1MmNiNlxcdTJjZDNcXHUyY2UzYXNoO1xcdTYyYWRhcnI7XFx1NjkwNHA7XFx1YzAwMFxcdTIyNGRcXHUyMGQyYXNoO1xcdTYyYWNcXHUwMTAwZXRcXHUyY2E4XFx1MmNhYztcXHVjMDAwXFx1MjI2NVxcdTIwZDI7XFx1YzAwMD5cXHUyMGQybmZpbjtcXHU2OWRlXFx1MDE4MEFldFxcdTJjYmRcXHUyY2MxXFx1MmNjNXJyO1xcdTY5MDI7XFx1YzAwMFxcdTIyNjRcXHUyMGQyXFx1MDEwMDtyXFx1MmNjYVxcdTJjY2RcXHVjMDAwPFxcdTIwZDJpZTtcXHVjMDAwXFx1MjJiNFxcdTIwZDJcXHUwMTAwQXRcXHUyY2Q4XFx1MmNkY3JyO1xcdTY5MDNyaWU7XFx1YzAwMFxcdTIyYjVcXHUyMGQyaW07XFx1YzAwMFxcdTIyM2NcXHUyMGQyXFx1MDE4MEFhblxcdTJjZjBcXHUyY2Y0XFx1MmQwMnJyO1xcdTYxZDZyXFx1MDEwMGhyXFx1MmNmYVxcdTJjZmRrO1xcdTY5MjNcXHUwMTAwO29cXHUxM2U3XFx1MTNlNWVhcjtcXHU2OTI3XFx1MTI1M1xcdTFhOTVcXDBcXDBcXDBcXDBcXDBcXDBcXDBcXDBcXDBcXDBcXDBcXDBcXDBcXHUyZDJkXFwwXFx1MmQzOFxcdTJkNDhcXHUyZDYwXFx1MmQ2NVxcdTJkNzJcXHUyZDg0XFx1MWIwN1xcMFxcMFxcdTJkOGRcXHUyZGFiXFwwXFx1MmRjOFxcdTJkY2VcXDBcXHUyZGRjXFx1MmUxOVxcdTJlMmJcXHUyZTNlXFx1MmU0M1xcdTAxMDBjc1xcdTJkMzFcXHUxYTk3dXRlXFx1ODAzYlxceGYzXFx1NDBmM1xcdTAxMDBpeVxcdTJkM2NcXHUyZDQ1clxcdTAxMDA7Y1xcdTFhOWVcXHUyZDQyXFx1ODAzYlxceGY0XFx1NDBmNDtcXHU0NDNlXFx1MDI4MGFiaW9zXFx1MWFhMFxcdTJkNTJcXHUyZDU3XFx1MDFjOFxcdTJkNWFsYWM7XFx1NDE1MXY7XFx1NmEzOG9sZDtcXHU2OWJjbGlnO1xcdTQxNTNcXHUwMTAwY3JcXHUyZDY5XFx1MmQ2ZGlyO1xcdTY5YmY7XFx1YzAwMFxcdWQ4MzVcXHVkZDJjXFx1MDM2ZlxcdTJkNzlcXDBcXDBcXHUyZDdjXFwwXFx1MmQ4Mm47XFx1NDJkYmF2ZVxcdTgwM2JcXHhmMlxcdTQwZjI7XFx1NjljMVxcdTAxMDBibVxcdTJkODhcXHUwZGY0YXI7XFx1NjliNVxcdTAyMDBhY2l0XFx1MmQ5NVxcdTJkOThcXHUyZGE1XFx1MmRhOHJcXHhmMlxcdTFhODBcXHUwMTAwaXJcXHUyZDlkXFx1MmRhMHI7XFx1NjliZW9zcztcXHU2OWJiblxceGU1XFx1MGU1MjtcXHU2OWMwXFx1MDE4MGFlaVxcdTJkYjFcXHUyZGI1XFx1MmRiOWNyO1xcdTQxNGRnYTtcXHU0M2M5XFx1MDE4MGNkblxcdTJkYzBcXHUyZGM1XFx1MDFjZHJvbjtcXHU0M2JmO1xcdTY5YjZwZjtcXHVjMDAwXFx1ZDgzNVxcdWRkNjBcXHUwMTgwYWVsXFx1MmRkNFxcdTJkZDdcXHUwMWQycjtcXHU2OWI3cnA7XFx1NjliOVxcdTAzODA7YWRpb3N2XFx1MmRlYVxcdTJkZWJcXHUyZGVlXFx1MmUwOFxcdTJlMGRcXHUyZTEwXFx1MmUxNlxcdTYyMjhyXFx4ZjJcXHUxYTg2XFx1MDIwMDtlZm1cXHUyZGY3XFx1MmRmOFxcdTJlMDJcXHUyZTA1XFx1NmE1ZHJcXHUwMTAwO29cXHUyZGZlXFx1MmRmZlxcdTYxMzRmXFx4YmJcXHUyZGZmXFx1ODAzYlxceGFhXFx1NDBhYVxcdTgwM2JcXHhiYVxcdTQwYmFnb2Y7XFx1NjJiNnI7XFx1NmE1NmxvcGU7XFx1NmE1NztcXHU2YTViXFx1MDE4MGNsb1xcdTJlMWZcXHUyZTIxXFx1MmUyN1xceGYyXFx1MmUwMWFzaFxcdTgwM2JcXHhmOFxcdTQwZjhsO1xcdTYyOThpXFx1MDE2Y1xcdTJlMmZcXHUyZTM0ZGVcXHU4MDNiXFx4ZjVcXHU0MGY1ZXNcXHUwMTAwO2FcXHUwMWRiXFx1MmUzYXM7XFx1NmEzNm1sXFx1ODAzYlxceGY2XFx1NDBmNmJhcjtcXHU2MzNkXFx1MGFlMVxcdTJlNWVcXDBcXHUyZTdkXFwwXFx1MmU4MFxcdTJlOWRcXDBcXHUyZWEyXFx1MmViOVxcMFxcMFxcdTJlY2JcXHUwZTljXFwwXFx1MmYxM1xcMFxcMFxcdTJmMmJcXHUyZmJjXFwwXFx1MmZjOHJcXHUwMjAwO2FzdFxcdTA0MDNcXHUyZTY3XFx1MmU3MlxcdTBlODVcXHU4MTAwXFx4YjY7bFxcdTJlNmRcXHUyZTZlXFx1NDBiNmxlXFx4ZWNcXHUwNDAzXFx1MDI2OVxcdTJlNzhcXDBcXDBcXHUyZTdibTtcXHU2YWYzO1xcdTZhZmR5O1xcdTQ0M2ZyXFx1MDI4MGNpbXB0XFx1MmU4YlxcdTJlOGZcXHUyZTkzXFx1MTg2NVxcdTJlOTdudDtcXHU0MDI1b2Q7XFx1NDAyZWlsO1xcdTYwMzBlbms7XFx1NjAzMXI7XFx1YzAwMFxcdWQ4MzVcXHVkZDJkXFx1MDE4MGltb1xcdTJlYThcXHUyZWIwXFx1MmViNFxcdTAxMDA7dlxcdTJlYWRcXHUyZWFlXFx1NDNjNjtcXHU0M2Q1bWFcXHhmNFxcdTBhNzZuZTtcXHU2NjBlXFx1MDE4MDt0dlxcdTJlYmZcXHUyZWMwXFx1MmVjOFxcdTQzYzBjaGZvcmtcXHhiYlxcdTFmZmQ7XFx1NDNkNlxcdTAxMDBhdVxcdTJlY2ZcXHUyZWRmblxcdTAxMDBja1xcdTJlZDVcXHUyZWRka1xcdTAxMDA7aFxcdTIxZjRcXHUyZWRiO1xcdTYxMGVcXHhmNlxcdTIxZjRzXFx1MDQ4MDthYmNkZW1zdFxcdTJlZjNcXHUyZWY0XFx1MTkwOFxcdTJlZjlcXHUyZWZkXFx1MmYwNFxcdTJmMDZcXHUyZjBhXFx1MmYwZVxcdTQwMmJjaXI7XFx1NmEyM2lyO1xcdTZhMjJcXHUwMTAwb3VcXHUxZDQwXFx1MmYwMjtcXHU2YTI1O1xcdTZhNzJuXFx1ODBiYlxceGIxXFx1MGU5ZGltO1xcdTZhMjZ3bztcXHU2YTI3XFx1MDE4MGlwdVxcdTJmMTlcXHUyZjIwXFx1MmYyNW50aW50O1xcdTZhMTVmO1xcdWMwMDBcXHVkODM1XFx1ZGQ2MW5kXFx1ODAzYlxceGEzXFx1NDBhM1xcdTA1MDA7RWFjZWlub3N1XFx1MGVjOFxcdTJmM2ZcXHUyZjQxXFx1MmY0NFxcdTJmNDdcXHUyZjgxXFx1MmY4OVxcdTJmOTJcXHUyZjdlXFx1MmZiNjtcXHU2YWIzcDtcXHU2YWI3dVxceGU1XFx1MGVkOVxcdTAxMDA7Y1xcdTBlY2VcXHUyZjRjXFx1MDMwMDthY2Vuc1xcdTBlYzhcXHUyZjU5XFx1MmY1ZlxcdTJmNjZcXHUyZjY4XFx1MmY3ZXBwcm9cXHhmOFxcdTJmNDN1cmx5ZVxceGYxXFx1MGVkOVxceGYxXFx1MGVjZVxcdTAxODBhZXNcXHUyZjZmXFx1MmY3NlxcdTJmN2FwcHJveDtcXHU2YWI5cXE7XFx1NmFiNWltO1xcdTYyZThpXFx4ZWRcXHUwZWRmbWVcXHUwMTAwO3NcXHUyZjg4XFx1MGVhZVxcdTYwMzJcXHUwMTgwRWFzXFx1MmY3OFxcdTJmOTBcXHUyZjdhXFx4ZjBcXHUyZjc1XFx1MDE4MGRmcFxcdTBlZWNcXHUyZjk5XFx1MmZhZlxcdTAxODBhbHNcXHUyZmEwXFx1MmZhNVxcdTJmYWFsYXI7XFx1NjMyZWluZTtcXHU2MzEydXJmO1xcdTYzMTNcXHUwMTAwO3RcXHUwZWZiXFx1MmZiNFxceGVmXFx1MGVmYnJlbDtcXHU2MmIwXFx1MDEwMGNpXFx1MmZjMFxcdTJmYzVyO1xcdWMwMDBcXHVkODM1XFx1ZGNjNTtcXHU0M2M4bmNzcDtcXHU2MDA4XFx1MDMwMGZpb3BzdVxcdTJmZGFcXHUyMmUyXFx1MmZkZlxcdTJmZTVcXHUyZmViXFx1MmZmMXI7XFx1YzAwMFxcdWQ4MzVcXHVkZDJlcGY7XFx1YzAwMFxcdWQ4MzVcXHVkZDYycmltZTtcXHU2MDU3Y3I7XFx1YzAwMFxcdWQ4MzVcXHVkY2M2XFx1MDE4MGFlb1xcdTJmZjhcXHUzMDA5XFx1MzAxM3RcXHUwMTAwZWlcXHUyZmZlXFx1MzAwNXJuaW9uXFx4ZjNcXHUwNmIwbnQ7XFx1NmExNnN0XFx1MDEwMDtlXFx1MzAxMFxcdTMwMTFcXHU0MDNmXFx4ZjFcXHUxZjE5XFx4ZjRcXHUwZjE0XFx1MGE4MEFCSGFiY2RlZmhpbG1ub3Byc3R1eFxcdTMwNDBcXHUzMDUxXFx1MzA1NVxcdTMwNTlcXHUzMGUwXFx1MzEwZVxcdTMxMmJcXHUzMTQ3XFx1MzE2MlxcdTMxNzJcXHUzMThlXFx1MzIwNlxcdTMyMTVcXHUzMjI0XFx1MzIyOVxcdTMyNThcXHUzMjZlXFx1MzI3MlxcdTMyOTBcXHUzMmIwXFx1MzJiN1xcdTAxODBhcnRcXHUzMDQ3XFx1MzA0YVxcdTMwNGNyXFx4ZjJcXHUxMGIzXFx4ZjJcXHUwM2RkYWlsO1xcdTY5MWNhclxceGYyXFx1MWM2NWFyO1xcdTY5NjRcXHUwMzgwY2RlbnFydFxcdTMwNjhcXHUzMDc1XFx1MzA3OFxcdTMwN2ZcXHUzMDhmXFx1MzA5NFxcdTMwY2NcXHUwMTAwZXVcXHUzMDZkXFx1MzA3MTtcXHVjMDAwXFx1MjIzZFxcdTAzMzF0ZTtcXHU0MTU1aVxceGUzXFx1MTE2ZW1wdHl2O1xcdTY5YjNnXFx1MDIwMDtkZWxcXHUwZmQxXFx1MzA4OVxcdTMwOGJcXHUzMDhkO1xcdTY5OTI7XFx1NjlhNVxceGU1XFx1MGZkMXVvXFx1ODAzYlxceGJiXFx1NDBiYnJcXHUwNTgwO2FiY2ZobHBzdHdcXHUwZmRjXFx1MzBhY1xcdTMwYWZcXHUzMGI3XFx1MzBiOVxcdTMwYmNcXHUzMGJlXFx1MzBjMFxcdTMwYzNcXHUzMGM3XFx1MzBjYXA7XFx1Njk3NVxcdTAxMDA7ZlxcdTBmZTBcXHUzMGI0cztcXHU2OTIwO1xcdTY5MzNzO1xcdTY5MWVcXHhlYlxcdTIyNWRcXHhmMFxcdTI3MmVsO1xcdTY5NDVpbTtcXHU2OTc0bDtcXHU2MWEzO1xcdTYxOWRcXHUwMTAwYWlcXHUzMGQxXFx1MzBkNWlsO1xcdTY5MWFvXFx1MDEwMDtuXFx1MzBkYlxcdTMwZGNcXHU2MjM2YWxcXHhmM1xcdTBmMWVcXHUwMTgwYWJyXFx1MzBlN1xcdTMwZWFcXHUzMGVlclxceGYyXFx1MTdlNXJrO1xcdTY3NzNcXHUwMTAwYWtcXHUzMGYzXFx1MzBmZGNcXHUwMTAwZWtcXHUzMGY5XFx1MzBmYjtcXHU0MDdkO1xcdTQwNWRcXHUwMTAwZXNcXHUzMTAyXFx1MzEwNDtcXHU2OThjbFxcdTAxMDBkdVxcdTMxMGFcXHUzMTBjO1xcdTY5OGU7XFx1Njk5MFxcdTAyMDBhZXV5XFx1MzExN1xcdTMxMWNcXHUzMTI3XFx1MzEyOXJvbjtcXHU0MTU5XFx1MDEwMGRpXFx1MzEyMVxcdTMxMjVpbDtcXHU0MTU3XFx4ZWNcXHUwZmYyXFx4ZTJcXHUzMGZhO1xcdTQ0NDBcXHUwMjAwY2xxc1xcdTMxMzRcXHUzMTM3XFx1MzEzZFxcdTMxNDRhO1xcdTY5MzdkaGFyO1xcdTY5Njl1b1xcdTAxMDA7clxcdTAyMGVcXHUwMjBkaDtcXHU2MWIzXFx1MDE4MGFjZ1xcdTMxNGVcXHUzMTVmXFx1MGY0NGxcXHUwMjAwO2lwc1xcdTBmNzhcXHUzMTU4XFx1MzE1YlxcdTEwOWNuXFx4ZTVcXHUxMGJiYXJcXHhmNFxcdTBmYTl0O1xcdTY1YWRcXHUwMTgwaWxyXFx1MzE2OVxcdTEwMjNcXHUzMTZlc2h0O1xcdTY5N2Q7XFx1YzAwMFxcdWQ4MzVcXHVkZDJmXFx1MDEwMGFvXFx1MzE3N1xcdTMxODZyXFx1MDEwMGR1XFx1MzE3ZFxcdTMxN2ZcXHhiYlxcdTA0N2JcXHUwMTAwO2xcXHUxMDkxXFx1MzE4NDtcXHU2OTZjXFx1MDEwMDt2XFx1MzE4YlxcdTMxOGNcXHU0M2MxO1xcdTQzZjFcXHUwMTgwZ25zXFx1MzE5NVxcdTMxZjlcXHUzMWZjaHRcXHUwMzAwYWhscnN0XFx1MzFhNFxcdTMxYjBcXHUzMWMyXFx1MzFkOFxcdTMxZTRcXHUzMWVlcnJvd1xcdTAxMDA7dFxcdTBmZGNcXHUzMWFkYVxceGU5XFx1MzBjOGFycG9vblxcdTAxMDBkdVxcdTMxYmJcXHUzMWJmb3dcXHhlZVxcdTMxN2VwXFx4YmJcXHUxMDkyZWZ0XFx1MDEwMGFoXFx1MzFjYVxcdTMxZDBycm93XFx4ZjNcXHUwZmVhYXJwb29uXFx4ZjNcXHUwNTUxaWdodGFycm93cztcXHU2MWM5cXVpZ2Fycm9cXHhmN1xcdTMwY2JocmVldGltZXM7XFx1NjJjY2c7XFx1NDJkYWluZ2RvdHNlXFx4ZjFcXHUxZjMyXFx1MDE4MGFobVxcdTMyMGRcXHUzMjEwXFx1MzIxM3JcXHhmMlxcdTBmZWFhXFx4ZjJcXHUwNTUxO1xcdTYwMGZvdXN0XFx1MDEwMDthXFx1MzIxZVxcdTMyMWZcXHU2M2IxY2hlXFx4YmJcXHUzMjFmbWlkO1xcdTZhZWVcXHUwMjAwYWJwdFxcdTMyMzJcXHUzMjNkXFx1MzI0MFxcdTMyNTJcXHUwMTAwbnJcXHUzMjM3XFx1MzIzYWc7XFx1NjdlZHI7XFx1NjFmZXJcXHhlYlxcdTEwMDNcXHUwMTgwYWZsXFx1MzI0N1xcdTMyNGFcXHUzMjRlcjtcXHU2OTg2O1xcdWMwMDBcXHVkODM1XFx1ZGQ2M3VzO1xcdTZhMmVpbWVzO1xcdTZhMzVcXHUwMTAwYXBcXHUzMjVkXFx1MzI2N3JcXHUwMTAwO2dcXHUzMjYzXFx1MzI2NFxcdTQwMjl0O1xcdTY5OTRvbGludDtcXHU2YTEyYXJcXHhmMlxcdTMxZTNcXHUwMjAwYWNocVxcdTMyN2JcXHUzMjgwXFx1MTBiY1xcdTMyODVxdW87XFx1NjAzYXI7XFx1YzAwMFxcdWQ4MzVcXHVkY2M3XFx1MDEwMGJ1XFx1MzBmYlxcdTMyOGFvXFx1MDEwMDtyXFx1MDIxNFxcdTAyMTNcXHUwMTgwaGlyXFx1MzI5N1xcdTMyOWJcXHUzMmEwcmVcXHhlNVxcdTMxZjhtZXM7XFx1NjJjYWlcXHUwMjAwO2VmbFxcdTMyYWFcXHUxMDU5XFx1MTgyMVxcdTMyYWJcXHU2NWI5dHJpO1xcdTY5Y2VsdWhhcjtcXHU2OTY4O1xcdTYxMWVcXHUwZDYxXFx1MzJkNVxcdTMyZGJcXHUzMmRmXFx1MzMyY1xcdTMzMzhcXHUzMzcxXFwwXFx1MzM3YVxcdTMzYTRcXDBcXDBcXHUzM2VjXFx1MzNmMFxcMFxcdTM0MjhcXHUzNDQ4XFx1MzQ1YVxcdTM0YWRcXHUzNGIxXFx1MzRjYVxcdTM0ZjFcXDBcXHUzNjE2XFwwXFwwXFx1MzYzM2N1dGU7XFx1NDE1YnF1XFx4ZWZcXHUyN2JhXFx1MDUwMDtFYWNlaW5wc3lcXHUxMWVkXFx1MzJmM1xcdTMyZjVcXHUzMmZmXFx1MzMwMlxcdTMzMGJcXHUzMzBmXFx1MzMxZlxcdTMzMjZcXHUzMzI5O1xcdTZhYjRcXHUwMWYwXFx1MzJmYVxcMFxcdTMyZmM7XFx1NmFiOG9uO1xcdTQxNjF1XFx4ZTVcXHUxMWZlXFx1MDEwMDtkXFx1MTFmM1xcdTMzMDdpbDtcXHU0MTVmcmM7XFx1NDE1ZFxcdTAxODBFYXNcXHUzMzE2XFx1MzMxOFxcdTMzMWI7XFx1NmFiNnA7XFx1NmFiYWltO1xcdTYyZTlvbGludDtcXHU2YTEzaVxceGVkXFx1MTIwNDtcXHU0NDQxb3RcXHUwMTgwO2JlXFx1MzMzNFxcdTFkNDdcXHUzMzM1XFx1NjJjNTtcXHU2YTY2XFx1MDM4MEFhY21zdHhcXHUzMzQ2XFx1MzM0YVxcdTMzNTdcXHUzMzViXFx1MzM1ZVxcdTMzNjNcXHUzMzZkcnI7XFx1NjFkOHJcXHUwMTAwaHJcXHUzMzUwXFx1MzM1MlxceGViXFx1MjIyOFxcdTAxMDA7b1xcdTBhMzZcXHUwYTM0dFxcdTgwM2JcXHhhN1xcdTQwYTdpO1xcdTQwM2J3YXI7XFx1NjkyOW1cXHUwMTAwaW5cXHUzMzY5XFx4ZjBudVxceGYzXFx4ZjF0O1xcdTY3MzZyXFx1MDEwMDtvXFx1MzM3NlxcdTIwNTVcXHVjMDAwXFx1ZDgzNVxcdWRkMzBcXHUwMjAwYWNveVxcdTMzODJcXHUzMzg2XFx1MzM5MVxcdTMzYTBycDtcXHU2NjZmXFx1MDEwMGh5XFx1MzM4YlxcdTMzOGZjeTtcXHU0NDQ5O1xcdTQ0NDhydFxcdTAyNmRcXHUzMzk5XFwwXFwwXFx1MzM5Y2lcXHhlNFxcdTE0NjRhcmFcXHhlY1xcdTJlNmZcXHU4MDNiXFx4YWRcXHU0MGFkXFx1MDEwMGdtXFx1MzNhOFxcdTMzYjRtYVxcdTAxODA7ZnZcXHUzM2IxXFx1MzNiMlxcdTMzYjJcXHU0M2MzO1xcdTQzYzJcXHUwNDAwO2RlZ2xucHJcXHUxMmFiXFx1MzNjNVxcdTMzYzlcXHUzM2NlXFx1MzNkNlxcdTMzZGVcXHUzM2UxXFx1MzNlNm90O1xcdTZhNmFcXHUwMTAwO3FcXHUxMmIxXFx1MTJiMFxcdTAxMDA7RVxcdTMzZDNcXHUzM2Q0XFx1NmE5ZTtcXHU2YWEwXFx1MDEwMDtFXFx1MzNkYlxcdTMzZGNcXHU2YTlkO1xcdTZhOWZlO1xcdTYyNDZsdXM7XFx1NmEyNGFycjtcXHU2OTcyYXJcXHhmMlxcdTExM2RcXHUwMjAwYWVpdFxcdTMzZjhcXHUzNDA4XFx1MzQwZlxcdTM0MTdcXHUwMTAwbHNcXHUzM2ZkXFx1MzQwNGxzZXRtXFx4ZTlcXHUzMzZhaHA7XFx1NmEzM3BhcnNsO1xcdTY5ZTRcXHUwMTAwZGxcXHUxNDYzXFx1MzQxNGU7XFx1NjMyM1xcdTAxMDA7ZVxcdTM0MWNcXHUzNDFkXFx1NmFhYVxcdTAxMDA7c1xcdTM0MjJcXHUzNDIzXFx1NmFhYztcXHVjMDAwXFx1MmFhY1xcdWZlMDBcXHUwMTgwZmxwXFx1MzQyZVxcdTM0MzNcXHUzNDQydGN5O1xcdTQ0NGNcXHUwMTAwO2JcXHUzNDM4XFx1MzQzOVxcdTQwMmZcXHUwMTAwO2FcXHUzNDNlXFx1MzQzZlxcdTY5YzRyO1xcdTYzM2ZmO1xcdWMwMDBcXHVkODM1XFx1ZGQ2NGFcXHUwMTAwZHJcXHUzNDRkXFx1MDQwMmVzXFx1MDEwMDt1XFx1MzQ1NFxcdTM0NTVcXHU2NjYwaXRcXHhiYlxcdTM0NTVcXHUwMTgwY3N1XFx1MzQ2MFxcdTM0NzlcXHUzNDlmXFx1MDEwMGF1XFx1MzQ2NVxcdTM0NmZwXFx1MDEwMDtzXFx1MTE4OFxcdTM0NmI7XFx1YzAwMFxcdTIyOTNcXHVmZTAwcFxcdTAxMDA7c1xcdTExYjRcXHUzNDc1O1xcdWMwMDBcXHUyMjk0XFx1ZmUwMHVcXHUwMTAwYnBcXHUzNDdmXFx1MzQ4ZlxcdTAxODA7ZXNcXHUxMTk3XFx1MTE5Y1xcdTM0ODZldFxcdTAxMDA7ZVxcdTExOTdcXHUzNDhkXFx4ZjFcXHUxMTlkXFx1MDE4MDtlc1xcdTExYThcXHUxMWFkXFx1MzQ5NmV0XFx1MDEwMDtlXFx1MTFhOFxcdTM0OWRcXHhmMVxcdTExYWVcXHUwMTgwO2FmXFx1MTE3YlxcdTM0YTZcXHUwNWIwclxcdTAxNjVcXHUzNGFiXFx1MDViMVxceGJiXFx1MTE3Y2FyXFx4ZjJcXHUxMTQ4XFx1MDIwMGNlbXRcXHUzNGI5XFx1MzRiZVxcdTM0YzJcXHUzNGM1cjtcXHVjMDAwXFx1ZDgzNVxcdWRjYzh0bVxceGVlXFx4ZjFpXFx4ZWNcXHUzNDE1YXJcXHhlNlxcdTExYmVcXHUwMTAwYXJcXHUzNGNlXFx1MzRkNXJcXHUwMTAwO2ZcXHUzNGQ0XFx1MTdiZlxcdTY2MDZcXHUwMTAwYW5cXHUzNGRhXFx1MzRlZGlnaHRcXHUwMTAwZXBcXHUzNGUzXFx1MzRlYXBzaWxvXFx4ZWVcXHUxZWUwaFxceGU5XFx1MmVhZnNcXHhiYlxcdTI4NTJcXHUwMjgwYmNtbnBcXHUzNGZiXFx1MzU1ZVxcdTEyMDlcXHUzNThiXFx1MzU4ZVxcdTA0ODA7RWRlbW5wcnNcXHUzNTBlXFx1MzUwZlxcdTM1MTFcXHUzNTE1XFx1MzUxZVxcdTM1MjNcXHUzNTJjXFx1MzUzMVxcdTM1MzZcXHU2MjgyO1xcdTZhYzVvdDtcXHU2YWJkXFx1MDEwMDtkXFx1MTFkYVxcdTM1MWFvdDtcXHU2YWMzdWx0O1xcdTZhYzFcXHUwMTAwRWVcXHUzNTI4XFx1MzUyYTtcXHU2YWNiO1xcdTYyOGFsdXM7XFx1NmFiZmFycjtcXHU2OTc5XFx1MDE4MGVpdVxcdTM1M2RcXHUzNTUyXFx1MzU1NXRcXHUwMTgwO2VuXFx1MzUwZVxcdTM1NDVcXHUzNTRicVxcdTAxMDA7cVxcdTExZGFcXHUzNTBmZXFcXHUwMTAwO3FcXHUzNTJiXFx1MzUyOG07XFx1NmFjN1xcdTAxMDBicFxcdTM1NWFcXHUzNTVjO1xcdTZhZDU7XFx1NmFkM2NcXHUwMzAwO2FjZW5zXFx1MTFlZFxcdTM1NmNcXHUzNTcyXFx1MzU3OVxcdTM1N2JcXHUzMzI2cHByb1xceGY4XFx1MzJmYXVybHllXFx4ZjFcXHUxMWZlXFx4ZjFcXHUxMWYzXFx1MDE4MGFlc1xcdTM1ODJcXHUzNTg4XFx1MzMxYnBwcm9cXHhmOFxcdTMzMWFxXFx4ZjFcXHUzMzE3ZztcXHU2NjZhXFx1MDY4MDEyMztFZGVobG1ucHNcXHUzNWE5XFx1MzVhY1xcdTM1YWZcXHUxMjFjXFx1MzViMlxcdTM1YjRcXHUzNWMwXFx1MzVjOVxcdTM1ZDVcXHUzNWRhXFx1MzVkZlxcdTM1ZThcXHUzNWVkXFx1ODAzYlxceGI5XFx1NDBiOVxcdTgwM2JcXHhiMlxcdTQwYjJcXHU4MDNiXFx4YjNcXHU0MGIzO1xcdTZhYzZcXHUwMTAwb3NcXHUzNWI5XFx1MzViY3Q7XFx1NmFiZXViO1xcdTZhZDhcXHUwMTAwO2RcXHUxMjIyXFx1MzVjNW90O1xcdTZhYzRzXFx1MDEwMG91XFx1MzVjZlxcdTM1ZDJsO1xcdTY3YzliO1xcdTZhZDdhcnI7XFx1Njk3YnVsdDtcXHU2YWMyXFx1MDEwMEVlXFx1MzVlNFxcdTM1ZTY7XFx1NmFjYztcXHU2MjhibHVzO1xcdTZhYzBcXHUwMTgwZWl1XFx1MzVmNFxcdTM2MDlcXHUzNjBjdFxcdTAxODA7ZW5cXHUxMjFjXFx1MzVmY1xcdTM2MDJxXFx1MDEwMDtxXFx1MTIyMlxcdTM1YjJlcVxcdTAxMDA7cVxcdTM1ZTdcXHUzNWU0bTtcXHU2YWM4XFx1MDEwMGJwXFx1MzYxMVxcdTM2MTM7XFx1NmFkNDtcXHU2YWQ2XFx1MDE4MEFhblxcdTM2MWNcXHUzNjIwXFx1MzYyZHJyO1xcdTYxZDlyXFx1MDEwMGhyXFx1MzYyNlxcdTM2MjhcXHhlYlxcdTIyMmVcXHUwMTAwO29cXHUwYTJiXFx1MGEyOXdhcjtcXHU2OTJhbGlnXFx1ODAzYlxceGRmXFx1NDBkZlxcdTBiZTFcXHUzNjUxXFx1MzY1ZFxcdTM2NjBcXHUxMmNlXFx1MzY3M1xcdTM2NzlcXDBcXHUzNjdlXFx1MzZjMlxcMFxcMFxcMFxcMFxcMFxcdTM2ZGJcXHUzNzAzXFwwXFx1MzcwOVxcdTM3NmNcXDBcXDBcXDBcXHUzNzg3XFx1MDI3MlxcdTM2NTZcXDBcXDBcXHUzNjViZ2V0O1xcdTYzMTY7XFx1NDNjNHJcXHhlYlxcdTBlNWZcXHUwMTgwYWV5XFx1MzY2NlxcdTM2NmJcXHUzNjcwcm9uO1xcdTQxNjVkaWw7XFx1NDE2MztcXHU0NDQybHJlYztcXHU2MzE1cjtcXHVjMDAwXFx1ZDgzNVxcdWRkMzFcXHUwMjAwZWlrb1xcdTM2ODZcXHUzNjlkXFx1MzZiNVxcdTM2YmNcXHUwMWYyXFx1MzY4YlxcMFxcdTM2OTFlXFx1MDEwMDRmXFx1MTI4NFxcdTEyODFhXFx1MDE4MDtzdlxcdTM2OThcXHUzNjk5XFx1MzY5YlxcdTQzYjh5bTtcXHU0M2QxXFx1MDEwMGNuXFx1MzZhMlxcdTM2YjJrXFx1MDEwMGFzXFx1MzZhOFxcdTM2YWVwcHJvXFx4ZjhcXHUxMmMxaW1cXHhiYlxcdTEyYWNzXFx4ZjBcXHUxMjllXFx1MDEwMGFzXFx1MzZiYVxcdTM2YWVcXHhmMFxcdTEyYzFyblxcdTgwM2JcXHhmZVxcdTQwZmVcXHUwMWVjXFx1MDMxZlxcdTM2YzZcXHUyMmU3ZXNcXHU4MTgwXFx4ZDc7YmRcXHUzNmNmXFx1MzZkMFxcdTM2ZDhcXHU0MGQ3XFx1MDEwMDthXFx1MTkwZlxcdTM2ZDVyO1xcdTZhMzE7XFx1NmEzMFxcdTAxODBlcHNcXHUzNmUxXFx1MzZlM1xcdTM3MDBcXHhlMVxcdTJhNGRcXHUwMjAwO2JjZlxcdTA0ODZcXHUzNmVjXFx1MzZmMFxcdTM2ZjRvdDtcXHU2MzM2aXI7XFx1NmFmMVxcdTAxMDA7b1xcdTM2ZjlcXHUzNmZjXFx1YzAwMFxcdWQ4MzVcXHVkZDY1cms7XFx1NmFkYVxceGUxXFx1MzM2MnJpbWU7XFx1NjAzNFxcdTAxODBhaXBcXHUzNzBmXFx1MzcxMlxcdTM3NjRkXFx4ZTVcXHUxMjQ4XFx1MDM4MGFkZW1wc3RcXHUzNzIxXFx1Mzc0ZFxcdTM3NDBcXHUzNzUxXFx1Mzc1N1xcdTM3NWNcXHUzNzVmbmdsZVxcdTAyODA7ZGxxclxcdTM3MzBcXHUzNzMxXFx1MzczNlxcdTM3NDBcXHUzNzQyXFx1NjViNW93blxceGJiXFx1MWRiYmVmdFxcdTAxMDA7ZVxcdTI4MDBcXHUzNzNlXFx4ZjFcXHUwOTJlO1xcdTYyNWNpZ2h0XFx1MDEwMDtlXFx1MzJhYVxcdTM3NGJcXHhmMVxcdTEwNWFvdDtcXHU2NWVjaW51cztcXHU2YTNhbHVzO1xcdTZhMzliO1xcdTY5Y2RpbWU7XFx1NmEzYmV6aXVtO1xcdTYzZTJcXHUwMTgwY2h0XFx1Mzc3MlxcdTM3N2RcXHUzNzgxXFx1MDEwMHJ5XFx1Mzc3N1xcdTM3N2I7XFx1YzAwMFxcdWQ4MzVcXHVkY2M5O1xcdTQ0NDZjeTtcXHU0NDVicm9rO1xcdTQxNjdcXHUwMTAwaW9cXHUzNzhiXFx1Mzc4ZXhcXHhmNFxcdTE3NzdoZWFkXFx1MDEwMGxyXFx1Mzc5N1xcdTM3YTBlZnRhcnJvXFx4ZjdcXHUwODRmaWdodGFycm93XFx4YmJcXHUwZjVkXFx1MDkwMEFIYWJjZGZnaGxtb3Byc3R1d1xcdTM3ZDBcXHUzN2QzXFx1MzdkN1xcdTM3ZTRcXHUzN2YwXFx1MzdmY1xcdTM4MGVcXHUzODFjXFx1MzgyM1xcdTM4MzRcXHUzODUxXFx1Mzg1ZFxcdTM4NmJcXHUzOGE5XFx1MzhjY1xcdTM4ZDJcXHUzOGVhXFx1MzhmNnJcXHhmMlxcdTAzZWRhcjtcXHU2OTYzXFx1MDEwMGNyXFx1MzdkY1xcdTM3ZTJ1dGVcXHU4MDNiXFx4ZmFcXHU0MGZhXFx4ZjJcXHUxMTUwclxcdTAxZTNcXHUzN2VhXFwwXFx1MzdlZHk7XFx1NDQ1ZXZlO1xcdTQxNmRcXHUwMTAwaXlcXHUzN2Y1XFx1MzdmYXJjXFx1ODAzYlxceGZiXFx1NDBmYjtcXHU0NDQzXFx1MDE4MGFiaFxcdTM4MDNcXHUzODA2XFx1MzgwYnJcXHhmMlxcdTEzYWRsYWM7XFx1NDE3MWFcXHhmMlxcdTEzYzNcXHUwMTAwaXJcXHUzODEzXFx1MzgxOHNodDtcXHU2OTdlO1xcdWMwMDBcXHVkODM1XFx1ZGQzMnJhdmVcXHU4MDNiXFx4ZjlcXHU0MGY5XFx1MDE2MVxcdTM4MjdcXHUzODMxclxcdTAxMDBsclxcdTM4MmNcXHUzODJlXFx4YmJcXHUwOTU3XFx4YmJcXHUxMDgzbGs7XFx1NjU4MFxcdTAxMDBjdFxcdTM4MzlcXHUzODRkXFx1MDI2ZlxcdTM4M2ZcXDBcXDBcXHUzODRhcm5cXHUwMTAwO2VcXHUzODQ1XFx1Mzg0NlxcdTYzMWNyXFx4YmJcXHUzODQ2b3A7XFx1NjMwZnJpO1xcdTY1ZjhcXHUwMTAwYWxcXHUzODU2XFx1Mzg1YWNyO1xcdTQxNmJcXHU4MGJiXFx4YThcXHUwMzQ5XFx1MDEwMGdwXFx1Mzg2MlxcdTM4NjZvbjtcXHU0MTczZjtcXHVjMDAwXFx1ZDgzNVxcdWRkNjZcXHUwMzAwYWRobHN1XFx1MTE0YlxcdTM4NzhcXHUzODdkXFx1MTM3MlxcdTM4OTFcXHUzOGEwb3duXFx4ZTFcXHUxM2IzYXJwb29uXFx1MDEwMGxyXFx1Mzg4OFxcdTM4OGNlZlxceGY0XFx1MzgyZGlnaFxceGY0XFx1MzgyZmlcXHUwMTgwO2hsXFx1Mzg5OVxcdTM4OWFcXHUzODljXFx1NDNjNVxceGJiXFx1MTNmYW9uXFx4YmJcXHUzODlhcGFycm93cztcXHU2MWM4XFx1MDE4MGNpdFxcdTM4YjBcXHUzOGM0XFx1MzhjOFxcdTAyNmZcXHUzOGI2XFwwXFwwXFx1MzhjMXJuXFx1MDEwMDtlXFx1MzhiY1xcdTM4YmRcXHU2MzFkclxceGJiXFx1MzhiZG9wO1xcdTYzMGVuZztcXHU0MTZmcmk7XFx1NjVmOWNyO1xcdWMwMDBcXHVkODM1XFx1ZGNjYVxcdTAxODBkaXJcXHUzOGQ5XFx1MzhkZFxcdTM4ZTJvdDtcXHU2MmYwbGRlO1xcdTQxNjlpXFx1MDEwMDtmXFx1MzczMFxcdTM4ZThcXHhiYlxcdTE4MTNcXHUwMTAwYW1cXHUzOGVmXFx1MzhmMnJcXHhmMlxcdTM4YThsXFx1ODAzYlxceGZjXFx1NDBmY2FuZ2xlO1xcdTY5YTdcXHUwNzgwQUJEYWNkZWZsbm9wcnN6XFx1MzkxY1xcdTM5MWZcXHUzOTI5XFx1MzkyZFxcdTM5YjVcXHUzOWI4XFx1MzliZFxcdTM5ZGZcXHUzOWU0XFx1MzllOFxcdTM5ZjNcXHUzOWY5XFx1MzlmZFxcdTNhMDFcXHUzYTIwclxceGYyXFx1MDNmN2FyXFx1MDEwMDt2XFx1MzkyNlxcdTM5MjdcXHU2YWU4O1xcdTZhZTlhc1xceGU4XFx1MDNlMVxcdTAxMDBuclxcdTM5MzJcXHUzOTM3Z3J0O1xcdTY5OWNcXHUwMzgwZWtucHJzdFxcdTM0ZTNcXHUzOTQ2XFx1Mzk0YlxcdTM5NTJcXHUzOTVkXFx1Mzk2NFxcdTM5OTZhcHBcXHhlMVxcdTI0MTVvdGhpblxceGU3XFx1MWU5NlxcdTAxODBoaXJcXHUzNGViXFx1MmVjOFxcdTM5NTlvcFxceGY0XFx1MmZiNVxcdTAxMDA7aFxcdTEzYjdcXHUzOTYyXFx4ZWZcXHUzMThkXFx1MDEwMGl1XFx1Mzk2OVxcdTM5NmRnbVxceGUxXFx1MzNiM1xcdTAxMDBicFxcdTM5NzJcXHUzOTg0c2V0bmVxXFx1MDEwMDtxXFx1Mzk3ZFxcdTM5ODBcXHVjMDAwXFx1MjI4YVxcdWZlMDA7XFx1YzAwMFxcdTJhY2JcXHVmZTAwc2V0bmVxXFx1MDEwMDtxXFx1Mzk4ZlxcdTM5OTJcXHVjMDAwXFx1MjI4YlxcdWZlMDA7XFx1YzAwMFxcdTJhY2NcXHVmZTAwXFx1MDEwMGhyXFx1Mzk5YlxcdTM5OWZldFxceGUxXFx1MzY5Y2lhbmdsZVxcdTAxMDBsclxcdTM5YWFcXHUzOWFmZWZ0XFx4YmJcXHUwOTI1aWdodFxceGJiXFx1MTA1MXk7XFx1NDQzMmFzaFxceGJiXFx1MTAzNlxcdTAxODBlbHJcXHUzOWM0XFx1MzlkMlxcdTM5ZDdcXHUwMTgwO2JlXFx1MmRlYVxcdTM5Y2JcXHUzOWNmYXI7XFx1NjJiYnE7XFx1NjI1YWxpcDtcXHU2MmVlXFx1MDEwMGJ0XFx1MzlkY1xcdTE0NjhhXFx4ZjJcXHUxNDY5cjtcXHVjMDAwXFx1ZDgzNVxcdWRkMzN0clxceGU5XFx1MzlhZXN1XFx1MDEwMGJwXFx1MzllZlxcdTM5ZjFcXHhiYlxcdTBkMWNcXHhiYlxcdTBkNTlwZjtcXHVjMDAwXFx1ZDgzNVxcdWRkNjdyb1xceGYwXFx1MGVmYnRyXFx4ZTlcXHUzOWI0XFx1MDEwMGN1XFx1M2EwNlxcdTNhMGJyO1xcdWMwMDBcXHVkODM1XFx1ZGNjYlxcdTAxMDBicFxcdTNhMTBcXHUzYTE4blxcdTAxMDBFZVxcdTM5ODBcXHUzYTE2XFx4YmJcXHUzOTdlblxcdTAxMDBFZVxcdTM5OTJcXHUzYTFlXFx4YmJcXHUzOTkwaWd6YWc7XFx1Njk5YVxcdTAzODBjZWZvcHJzXFx1M2EzNlxcdTNhM2JcXHUzYTU2XFx1M2E1YlxcdTNhNTRcXHUzYTYxXFx1M2E2YWlyYztcXHU0MTc1XFx1MDEwMGRpXFx1M2E0MFxcdTNhNTFcXHUwMTAwYmdcXHUzYTQ1XFx1M2E0OWFyO1xcdTZhNWZlXFx1MDEwMDtxXFx1MTVmYVxcdTNhNGY7XFx1NjI1OWVycDtcXHU2MTE4cjtcXHVjMDAwXFx1ZDgzNVxcdWRkMzRwZjtcXHVjMDAwXFx1ZDgzNVxcdWRkNjhcXHUwMTAwO2VcXHUxNDc5XFx1M2E2NmF0XFx4ZThcXHUxNDc5Y3I7XFx1YzAwMFxcdWQ4MzVcXHVkY2NjXFx1MGFlM1xcdTE3OGVcXHUzYTg3XFwwXFx1M2E4YlxcMFxcdTNhOTBcXHUzYTliXFwwXFwwXFx1M2E5ZFxcdTNhYThcXHUzYWFiXFx1M2FhZlxcMFxcMFxcdTNhYzNcXHUzYWNlXFwwXFx1M2FkOFxcdTE3ZGNcXHUxN2RmdHJcXHhlOVxcdTE3ZDFyO1xcdWMwMDBcXHVkODM1XFx1ZGQzNVxcdTAxMDBBYVxcdTNhOTRcXHUzYTk3clxceGYyXFx1MDNjM3JcXHhmMlxcdTA5ZjY7XFx1NDNiZVxcdTAxMDBBYVxcdTNhYTFcXHUzYWE0clxceGYyXFx1MDNiOHJcXHhmMlxcdTA5ZWJhXFx4ZjBcXHUyNzEzaXM7XFx1NjJmYlxcdTAxODBkcHRcXHUxN2E0XFx1M2FiNVxcdTNhYmVcXHUwMTAwZmxcXHUzYWJhXFx1MTdhOTtcXHVjMDAwXFx1ZDgzNVxcdWRkNjlpbVxceGU1XFx1MTdiMlxcdTAxMDBBYVxcdTNhYzdcXHUzYWNhclxceGYyXFx1MDNjZXJcXHhmMlxcdTBhMDFcXHUwMTAwY3FcXHUzYWQyXFx1MTdiOHI7XFx1YzAwMFxcdWQ4MzVcXHVkY2NkXFx1MDEwMHB0XFx1MTdkNlxcdTNhZGNyXFx4ZTlcXHUxN2Q0XFx1MDQwMGFjZWZpb3N1XFx1M2FmMFxcdTNhZmRcXHUzYjA4XFx1M2IwY1xcdTNiMTFcXHUzYjE1XFx1M2IxYlxcdTNiMjFjXFx1MDEwMHV5XFx1M2FmNlxcdTNhZmJ0ZVxcdTgwM2JcXHhmZFxcdTQwZmQ7XFx1NDQ0ZlxcdTAxMDBpeVxcdTNiMDJcXHUzYjA2cmM7XFx1NDE3NztcXHU0NDRiblxcdTgwM2JcXHhhNVxcdTQwYTVyO1xcdWMwMDBcXHVkODM1XFx1ZGQzNmN5O1xcdTQ0NTdwZjtcXHVjMDAwXFx1ZDgzNVxcdWRkNmFjcjtcXHVjMDAwXFx1ZDgzNVxcdWRjY2VcXHUwMTAwY21cXHUzYjI2XFx1M2IyOXk7XFx1NDQ0ZWxcXHU4MDNiXFx4ZmZcXHU0MGZmXFx1MDUwMGFjZGVmaGlvc3dcXHUzYjQyXFx1M2I0OFxcdTNiNTRcXHUzYjU4XFx1M2I2NFxcdTNiNjlcXHUzYjZkXFx1M2I3NFxcdTNiN2FcXHUzYjgwY3V0ZTtcXHU0MTdhXFx1MDEwMGF5XFx1M2I0ZFxcdTNiNTJyb247XFx1NDE3ZTtcXHU0NDM3b3Q7XFx1NDE3Y1xcdTAxMDBldFxcdTNiNWRcXHUzYjYxdHJcXHhlNlxcdTE1NWZhO1xcdTQzYjZyO1xcdWMwMDBcXHVkODM1XFx1ZGQzN2N5O1xcdTQ0MzZncmFycjtcXHU2MWRkcGY7XFx1YzAwMFxcdWQ4MzVcXHVkZDZiY3I7XFx1YzAwMFxcdWQ4MzVcXHVkY2NmXFx1MDEwMGpuXFx1M2I4NVxcdTNiODc7XFx1NjAwZGo7XFx1NjAwY1wiXG4gICAgLnNwbGl0KFwiXCIpXG4gICAgLm1hcChmdW5jdGlvbiAoYykgeyByZXR1cm4gYy5jaGFyQ29kZUF0KDApOyB9KSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kZWNvZGUtZGF0YS1odG1sLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuLy8gR2VuZXJhdGVkIHVzaW5nIHNjcmlwdHMvd3JpdGUtZGVjb2RlLW1hcC50c1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gbmV3IFVpbnQxNkFycmF5KFxuLy8gcHJldHRpZXItaWdub3JlXG5cIlxcdTAyMDBhZ2xxXFx0XFx4MTVcXHgxOFxceDFiXFx1MDI2ZFxceDBmXFwwXFwwXFx4MTJwO1xcdTQwMjZvcztcXHU0MDI3dDtcXHU0MDNldDtcXHU0MDNjdW90O1xcdTQwMjJcIlxuICAgIC5zcGxpdChcIlwiKVxuICAgIC5tYXAoZnVuY3Rpb24gKGMpIHsgcmV0dXJuIGMuY2hhckNvZGVBdCgwKTsgfSkpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGVjb2RlLWRhdGEteG1sLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5nZXREb2N1bWVudE1vZGUgPSBleHBvcnRzLmlzQ29uZm9ybWluZyA9IHZvaWQgMDtcbmNvbnN0IGh0bWxfanNfMSA9IHJlcXVpcmUoXCIuL2h0bWwuanNcIik7XG4vL0NvbnN0XG5jb25zdCBWQUxJRF9ET0NUWVBFX05BTUUgPSAnaHRtbCc7XG5jb25zdCBWQUxJRF9TWVNURU1fSUQgPSAnYWJvdXQ6bGVnYWN5LWNvbXBhdCc7XG5jb25zdCBRVUlSS1NfTU9ERV9TWVNURU1fSUQgPSAnaHR0cDovL3d3dy5pYm0uY29tL2RhdGEvZHRkL3YxMS9pYm14aHRtbDEtdHJhbnNpdGlvbmFsLmR0ZCc7XG5jb25zdCBRVUlSS1NfTU9ERV9QVUJMSUNfSURfUFJFRklYRVMgPSBbXG4gICAgJysvL3NpbG1hcmlsLy9kdGQgaHRtbCBwcm8gdjByMTEgMTk5NzAxMDEvLycsXG4gICAgJy0vL2FzLy9kdGQgaHRtbCAzLjAgYXN3ZWRpdCArIGV4dGVuc2lvbnMvLycsXG4gICAgJy0vL2FkdmFzb2Z0IGx0ZC8vZHRkIGh0bWwgMy4wIGFzd2VkaXQgKyBleHRlbnNpb25zLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCAyLjAgbGV2ZWwgMS8vJyxcbiAgICAnLS8vaWV0Zi8vZHRkIGh0bWwgMi4wIGxldmVsIDIvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIDIuMCBzdHJpY3QgbGV2ZWwgMS8vJyxcbiAgICAnLS8vaWV0Zi8vZHRkIGh0bWwgMi4wIHN0cmljdCBsZXZlbCAyLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCAyLjAgc3RyaWN0Ly8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCAyLjAvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIDIuMWUvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIDMuMC8vJyxcbiAgICAnLS8vaWV0Zi8vZHRkIGh0bWwgMy4yIGZpbmFsLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCAzLjIvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIDMvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIGxldmVsIDAvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIGxldmVsIDEvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIGxldmVsIDIvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIGxldmVsIDMvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIHN0cmljdCBsZXZlbCAwLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCBzdHJpY3QgbGV2ZWwgMS8vJyxcbiAgICAnLS8vaWV0Zi8vZHRkIGh0bWwgc3RyaWN0IGxldmVsIDIvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sIHN0cmljdCBsZXZlbCAzLy8nLFxuICAgICctLy9pZXRmLy9kdGQgaHRtbCBzdHJpY3QvLycsXG4gICAgJy0vL2lldGYvL2R0ZCBodG1sLy8nLFxuICAgICctLy9tZXRyaXVzLy9kdGQgbWV0cml1cyBwcmVzZW50YXRpb25hbC8vJyxcbiAgICAnLS8vbWljcm9zb2Z0Ly9kdGQgaW50ZXJuZXQgZXhwbG9yZXIgMi4wIGh0bWwgc3RyaWN0Ly8nLFxuICAgICctLy9taWNyb3NvZnQvL2R0ZCBpbnRlcm5ldCBleHBsb3JlciAyLjAgaHRtbC8vJyxcbiAgICAnLS8vbWljcm9zb2Z0Ly9kdGQgaW50ZXJuZXQgZXhwbG9yZXIgMi4wIHRhYmxlcy8vJyxcbiAgICAnLS8vbWljcm9zb2Z0Ly9kdGQgaW50ZXJuZXQgZXhwbG9yZXIgMy4wIGh0bWwgc3RyaWN0Ly8nLFxuICAgICctLy9taWNyb3NvZnQvL2R0ZCBpbnRlcm5ldCBleHBsb3JlciAzLjAgaHRtbC8vJyxcbiAgICAnLS8vbWljcm9zb2Z0Ly9kdGQgaW50ZXJuZXQgZXhwbG9yZXIgMy4wIHRhYmxlcy8vJyxcbiAgICAnLS8vbmV0c2NhcGUgY29tbS4gY29ycC4vL2R0ZCBodG1sLy8nLFxuICAgICctLy9uZXRzY2FwZSBjb21tLiBjb3JwLi8vZHRkIHN0cmljdCBodG1sLy8nLFxuICAgIFwiLS8vbydyZWlsbHkgYW5kIGFzc29jaWF0ZXMvL2R0ZCBodG1sIDIuMC8vXCIsXG4gICAgXCItLy9vJ3JlaWxseSBhbmQgYXNzb2NpYXRlcy8vZHRkIGh0bWwgZXh0ZW5kZWQgMS4wLy9cIixcbiAgICBcIi0vL28ncmVpbGx5IGFuZCBhc3NvY2lhdGVzLy9kdGQgaHRtbCBleHRlbmRlZCByZWxheGVkIDEuMC8vXCIsXG4gICAgJy0vL3NxLy9kdGQgaHRtbCAyLjAgaG90bWV0YWwgKyBleHRlbnNpb25zLy8nLFxuICAgICctLy9zb2Z0cXVhZCBzb2Z0d2FyZS8vZHRkIGhvdG1ldGFsIHBybyA2LjA6OjE5OTkwNjAxOjpleHRlbnNpb25zIHRvIGh0bWwgNC4wLy8nLFxuICAgICctLy9zb2Z0cXVhZC8vZHRkIGhvdG1ldGFsIHBybyA0LjA6OjE5OTcxMDEwOjpleHRlbnNpb25zIHRvIGh0bWwgNC4wLy8nLFxuICAgICctLy9zcHlnbGFzcy8vZHRkIGh0bWwgMi4wIGV4dGVuZGVkLy8nLFxuICAgICctLy9zdW4gbWljcm9zeXN0ZW1zIGNvcnAuLy9kdGQgaG90amF2YSBodG1sLy8nLFxuICAgICctLy9zdW4gbWljcm9zeXN0ZW1zIGNvcnAuLy9kdGQgaG90amF2YSBzdHJpY3QgaHRtbC8vJyxcbiAgICAnLS8vdzNjLy9kdGQgaHRtbCAzIDE5OTUtMDMtMjQvLycsXG4gICAgJy0vL3czYy8vZHRkIGh0bWwgMy4yIGRyYWZ0Ly8nLFxuICAgICctLy93M2MvL2R0ZCBodG1sIDMuMiBmaW5hbC8vJyxcbiAgICAnLS8vdzNjLy9kdGQgaHRtbCAzLjIvLycsXG4gICAgJy0vL3czYy8vZHRkIGh0bWwgMy4ycyBkcmFmdC8vJyxcbiAgICAnLS8vdzNjLy9kdGQgaHRtbCA0LjAgZnJhbWVzZXQvLycsXG4gICAgJy0vL3czYy8vZHRkIGh0bWwgNC4wIHRyYW5zaXRpb25hbC8vJyxcbiAgICAnLS8vdzNjLy9kdGQgaHRtbCBleHBlcmltZW50YWwgMTk5NjA3MTIvLycsXG4gICAgJy0vL3czYy8vZHRkIGh0bWwgZXhwZXJpbWVudGFsIDk3MDQyMS8vJyxcbiAgICAnLS8vdzNjLy9kdGQgdzMgaHRtbC8vJyxcbiAgICAnLS8vdzNvLy9kdGQgdzMgaHRtbCAzLjAvLycsXG4gICAgJy0vL3dlYnRlY2hzLy9kdGQgbW96aWxsYSBodG1sIDIuMC8vJyxcbiAgICAnLS8vd2VidGVjaHMvL2R0ZCBtb3ppbGxhIGh0bWwvLycsXG5dO1xuY29uc3QgUVVJUktTX01PREVfTk9fU1lTVEVNX0lEX1BVQkxJQ19JRF9QUkVGSVhFUyA9IFtcbiAgICAuLi5RVUlSS1NfTU9ERV9QVUJMSUNfSURfUFJFRklYRVMsXG4gICAgJy0vL3czYy8vZHRkIGh0bWwgNC4wMSBmcmFtZXNldC8vJyxcbiAgICAnLS8vdzNjLy9kdGQgaHRtbCA0LjAxIHRyYW5zaXRpb25hbC8vJyxcbl07XG5jb25zdCBRVUlSS1NfTU9ERV9QVUJMSUNfSURTID0gbmV3IFNldChbXG4gICAgJy0vL3czby8vZHRkIHczIGh0bWwgc3RyaWN0IDMuMC8vZW4vLycsXG4gICAgJy0vdzNjL2R0ZCBodG1sIDQuMCB0cmFuc2l0aW9uYWwvZW4nLFxuICAgICdodG1sJyxcbl0pO1xuY29uc3QgTElNSVRFRF9RVUlSS1NfUFVCTElDX0lEX1BSRUZJWEVTID0gWyctLy93M2MvL2R0ZCB4aHRtbCAxLjAgZnJhbWVzZXQvLycsICctLy93M2MvL2R0ZCB4aHRtbCAxLjAgdHJhbnNpdGlvbmFsLy8nXTtcbmNvbnN0IExJTUlURURfUVVJUktTX1dJVEhfU1lTVEVNX0lEX1BVQkxJQ19JRF9QUkVGSVhFUyA9IFtcbiAgICAuLi5MSU1JVEVEX1FVSVJLU19QVUJMSUNfSURfUFJFRklYRVMsXG4gICAgJy0vL3czYy8vZHRkIGh0bWwgNC4wMSBmcmFtZXNldC8vJyxcbiAgICAnLS8vdzNjLy9kdGQgaHRtbCA0LjAxIHRyYW5zaXRpb25hbC8vJyxcbl07XG4vL1V0aWxzXG5mdW5jdGlvbiBoYXNQcmVmaXgocHVibGljSWQsIHByZWZpeGVzKSB7XG4gICAgcmV0dXJuIHByZWZpeGVzLnNvbWUoKHByZWZpeCkgPT4gcHVibGljSWQuc3RhcnRzV2l0aChwcmVmaXgpKTtcbn1cbi8vQVBJXG5mdW5jdGlvbiBpc0NvbmZvcm1pbmcodG9rZW4pIHtcbiAgICByZXR1cm4gKHRva2VuLm5hbWUgPT09IFZBTElEX0RPQ1RZUEVfTkFNRSAmJlxuICAgICAgICB0b2tlbi5wdWJsaWNJZCA9PT0gbnVsbCAmJlxuICAgICAgICAodG9rZW4uc3lzdGVtSWQgPT09IG51bGwgfHwgdG9rZW4uc3lzdGVtSWQgPT09IFZBTElEX1NZU1RFTV9JRCkpO1xufVxuZXhwb3J0cy5pc0NvbmZvcm1pbmcgPSBpc0NvbmZvcm1pbmc7XG5mdW5jdGlvbiBnZXREb2N1bWVudE1vZGUodG9rZW4pIHtcbiAgICBpZiAodG9rZW4ubmFtZSAhPT0gVkFMSURfRE9DVFlQRV9OQU1FKSB7XG4gICAgICAgIHJldHVybiBodG1sX2pzXzEuRE9DVU1FTlRfTU9ERS5RVUlSS1M7XG4gICAgfVxuICAgIGNvbnN0IHsgc3lzdGVtSWQgfSA9IHRva2VuO1xuICAgIGlmIChzeXN0ZW1JZCAmJiBzeXN0ZW1JZC50b0xvd2VyQ2FzZSgpID09PSBRVUlSS1NfTU9ERV9TWVNURU1fSUQpIHtcbiAgICAgICAgcmV0dXJuIGh0bWxfanNfMS5ET0NVTUVOVF9NT0RFLlFVSVJLUztcbiAgICB9XG4gICAgbGV0IHsgcHVibGljSWQgfSA9IHRva2VuO1xuICAgIGlmIChwdWJsaWNJZCAhPT0gbnVsbCkge1xuICAgICAgICBwdWJsaWNJZCA9IHB1YmxpY0lkLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChRVUlSS1NfTU9ERV9QVUJMSUNfSURTLmhhcyhwdWJsaWNJZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBodG1sX2pzXzEuRE9DVU1FTlRfTU9ERS5RVUlSS1M7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHByZWZpeGVzID0gc3lzdGVtSWQgPT09IG51bGwgPyBRVUlSS1NfTU9ERV9OT19TWVNURU1fSURfUFVCTElDX0lEX1BSRUZJWEVTIDogUVVJUktTX01PREVfUFVCTElDX0lEX1BSRUZJWEVTO1xuICAgICAgICBpZiAoaGFzUHJlZml4KHB1YmxpY0lkLCBwcmVmaXhlcykpIHtcbiAgICAgICAgICAgIHJldHVybiBodG1sX2pzXzEuRE9DVU1FTlRfTU9ERS5RVUlSS1M7XG4gICAgICAgIH1cbiAgICAgICAgcHJlZml4ZXMgPVxuICAgICAgICAgICAgc3lzdGVtSWQgPT09IG51bGwgPyBMSU1JVEVEX1FVSVJLU19QVUJMSUNfSURfUFJFRklYRVMgOiBMSU1JVEVEX1FVSVJLU19XSVRIX1NZU1RFTV9JRF9QVUJMSUNfSURfUFJFRklYRVM7XG4gICAgICAgIGlmIChoYXNQcmVmaXgocHVibGljSWQsIHByZWZpeGVzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGh0bWxfanNfMS5ET0NVTUVOVF9NT0RFLkxJTUlURURfUVVJUktTO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBodG1sX2pzXzEuRE9DVU1FTlRfTU9ERS5OT19RVUlSS1M7XG59XG5leHBvcnRzLmdldERvY3VtZW50TW9kZSA9IGdldERvY3VtZW50TW9kZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRvY3R5cGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLkVSUiA9IHZvaWQgMDtcbnZhciBFUlI7XG4oZnVuY3Rpb24gKEVSUikge1xuICAgIEVSUltcImNvbnRyb2xDaGFyYWN0ZXJJbklucHV0U3RyZWFtXCJdID0gXCJjb250cm9sLWNoYXJhY3Rlci1pbi1pbnB1dC1zdHJlYW1cIjtcbiAgICBFUlJbXCJub25jaGFyYWN0ZXJJbklucHV0U3RyZWFtXCJdID0gXCJub25jaGFyYWN0ZXItaW4taW5wdXQtc3RyZWFtXCI7XG4gICAgRVJSW1wic3Vycm9nYXRlSW5JbnB1dFN0cmVhbVwiXSA9IFwic3Vycm9nYXRlLWluLWlucHV0LXN0cmVhbVwiO1xuICAgIEVSUltcIm5vblZvaWRIdG1sRWxlbWVudFN0YXJ0VGFnV2l0aFRyYWlsaW5nU29saWR1c1wiXSA9IFwibm9uLXZvaWQtaHRtbC1lbGVtZW50LXN0YXJ0LXRhZy13aXRoLXRyYWlsaW5nLXNvbGlkdXNcIjtcbiAgICBFUlJbXCJlbmRUYWdXaXRoQXR0cmlidXRlc1wiXSA9IFwiZW5kLXRhZy13aXRoLWF0dHJpYnV0ZXNcIjtcbiAgICBFUlJbXCJlbmRUYWdXaXRoVHJhaWxpbmdTb2xpZHVzXCJdID0gXCJlbmQtdGFnLXdpdGgtdHJhaWxpbmctc29saWR1c1wiO1xuICAgIEVSUltcInVuZXhwZWN0ZWRTb2xpZHVzSW5UYWdcIl0gPSBcInVuZXhwZWN0ZWQtc29saWR1cy1pbi10YWdcIjtcbiAgICBFUlJbXCJ1bmV4cGVjdGVkTnVsbENoYXJhY3RlclwiXSA9IFwidW5leHBlY3RlZC1udWxsLWNoYXJhY3RlclwiO1xuICAgIEVSUltcInVuZXhwZWN0ZWRRdWVzdGlvbk1hcmtJbnN0ZWFkT2ZUYWdOYW1lXCJdID0gXCJ1bmV4cGVjdGVkLXF1ZXN0aW9uLW1hcmstaW5zdGVhZC1vZi10YWctbmFtZVwiO1xuICAgIEVSUltcImludmFsaWRGaXJzdENoYXJhY3Rlck9mVGFnTmFtZVwiXSA9IFwiaW52YWxpZC1maXJzdC1jaGFyYWN0ZXItb2YtdGFnLW5hbWVcIjtcbiAgICBFUlJbXCJ1bmV4cGVjdGVkRXF1YWxzU2lnbkJlZm9yZUF0dHJpYnV0ZU5hbWVcIl0gPSBcInVuZXhwZWN0ZWQtZXF1YWxzLXNpZ24tYmVmb3JlLWF0dHJpYnV0ZS1uYW1lXCI7XG4gICAgRVJSW1wibWlzc2luZ0VuZFRhZ05hbWVcIl0gPSBcIm1pc3NpbmctZW5kLXRhZy1uYW1lXCI7XG4gICAgRVJSW1widW5leHBlY3RlZENoYXJhY3RlckluQXR0cmlidXRlTmFtZVwiXSA9IFwidW5leHBlY3RlZC1jaGFyYWN0ZXItaW4tYXR0cmlidXRlLW5hbWVcIjtcbiAgICBFUlJbXCJ1bmtub3duTmFtZWRDaGFyYWN0ZXJSZWZlcmVuY2VcIl0gPSBcInVua25vd24tbmFtZWQtY2hhcmFjdGVyLXJlZmVyZW5jZVwiO1xuICAgIEVSUltcIm1pc3NpbmdTZW1pY29sb25BZnRlckNoYXJhY3RlclJlZmVyZW5jZVwiXSA9IFwibWlzc2luZy1zZW1pY29sb24tYWZ0ZXItY2hhcmFjdGVyLXJlZmVyZW5jZVwiO1xuICAgIEVSUltcInVuZXhwZWN0ZWRDaGFyYWN0ZXJBZnRlckRvY3R5cGVTeXN0ZW1JZGVudGlmaWVyXCJdID0gXCJ1bmV4cGVjdGVkLWNoYXJhY3Rlci1hZnRlci1kb2N0eXBlLXN5c3RlbS1pZGVudGlmaWVyXCI7XG4gICAgRVJSW1widW5leHBlY3RlZENoYXJhY3RlckluVW5xdW90ZWRBdHRyaWJ1dGVWYWx1ZVwiXSA9IFwidW5leHBlY3RlZC1jaGFyYWN0ZXItaW4tdW5xdW90ZWQtYXR0cmlidXRlLXZhbHVlXCI7XG4gICAgRVJSW1wiZW9mQmVmb3JlVGFnTmFtZVwiXSA9IFwiZW9mLWJlZm9yZS10YWctbmFtZVwiO1xuICAgIEVSUltcImVvZkluVGFnXCJdID0gXCJlb2YtaW4tdGFnXCI7XG4gICAgRVJSW1wibWlzc2luZ0F0dHJpYnV0ZVZhbHVlXCJdID0gXCJtaXNzaW5nLWF0dHJpYnV0ZS12YWx1ZVwiO1xuICAgIEVSUltcIm1pc3NpbmdXaGl0ZXNwYWNlQmV0d2VlbkF0dHJpYnV0ZXNcIl0gPSBcIm1pc3Npbmctd2hpdGVzcGFjZS1iZXR3ZWVuLWF0dHJpYnV0ZXNcIjtcbiAgICBFUlJbXCJtaXNzaW5nV2hpdGVzcGFjZUFmdGVyRG9jdHlwZVB1YmxpY0tleXdvcmRcIl0gPSBcIm1pc3Npbmctd2hpdGVzcGFjZS1hZnRlci1kb2N0eXBlLXB1YmxpYy1rZXl3b3JkXCI7XG4gICAgRVJSW1wibWlzc2luZ1doaXRlc3BhY2VCZXR3ZWVuRG9jdHlwZVB1YmxpY0FuZFN5c3RlbUlkZW50aWZpZXJzXCJdID0gXCJtaXNzaW5nLXdoaXRlc3BhY2UtYmV0d2Vlbi1kb2N0eXBlLXB1YmxpYy1hbmQtc3lzdGVtLWlkZW50aWZpZXJzXCI7XG4gICAgRVJSW1wibWlzc2luZ1doaXRlc3BhY2VBZnRlckRvY3R5cGVTeXN0ZW1LZXl3b3JkXCJdID0gXCJtaXNzaW5nLXdoaXRlc3BhY2UtYWZ0ZXItZG9jdHlwZS1zeXN0ZW0ta2V5d29yZFwiO1xuICAgIEVSUltcIm1pc3NpbmdRdW90ZUJlZm9yZURvY3R5cGVQdWJsaWNJZGVudGlmaWVyXCJdID0gXCJtaXNzaW5nLXF1b3RlLWJlZm9yZS1kb2N0eXBlLXB1YmxpYy1pZGVudGlmaWVyXCI7XG4gICAgRVJSW1wibWlzc2luZ1F1b3RlQmVmb3JlRG9jdHlwZVN5c3RlbUlkZW50aWZpZXJcIl0gPSBcIm1pc3NpbmctcXVvdGUtYmVmb3JlLWRvY3R5cGUtc3lzdGVtLWlkZW50aWZpZXJcIjtcbiAgICBFUlJbXCJtaXNzaW5nRG9jdHlwZVB1YmxpY0lkZW50aWZpZXJcIl0gPSBcIm1pc3NpbmctZG9jdHlwZS1wdWJsaWMtaWRlbnRpZmllclwiO1xuICAgIEVSUltcIm1pc3NpbmdEb2N0eXBlU3lzdGVtSWRlbnRpZmllclwiXSA9IFwibWlzc2luZy1kb2N0eXBlLXN5c3RlbS1pZGVudGlmaWVyXCI7XG4gICAgRVJSW1wiYWJydXB0RG9jdHlwZVB1YmxpY0lkZW50aWZpZXJcIl0gPSBcImFicnVwdC1kb2N0eXBlLXB1YmxpYy1pZGVudGlmaWVyXCI7XG4gICAgRVJSW1wiYWJydXB0RG9jdHlwZVN5c3RlbUlkZW50aWZpZXJcIl0gPSBcImFicnVwdC1kb2N0eXBlLXN5c3RlbS1pZGVudGlmaWVyXCI7XG4gICAgRVJSW1wiY2RhdGFJbkh0bWxDb250ZW50XCJdID0gXCJjZGF0YS1pbi1odG1sLWNvbnRlbnRcIjtcbiAgICBFUlJbXCJpbmNvcnJlY3RseU9wZW5lZENvbW1lbnRcIl0gPSBcImluY29ycmVjdGx5LW9wZW5lZC1jb21tZW50XCI7XG4gICAgRVJSW1wiZW9mSW5TY3JpcHRIdG1sQ29tbWVudExpa2VUZXh0XCJdID0gXCJlb2YtaW4tc2NyaXB0LWh0bWwtY29tbWVudC1saWtlLXRleHRcIjtcbiAgICBFUlJbXCJlb2ZJbkRvY3R5cGVcIl0gPSBcImVvZi1pbi1kb2N0eXBlXCI7XG4gICAgRVJSW1wibmVzdGVkQ29tbWVudFwiXSA9IFwibmVzdGVkLWNvbW1lbnRcIjtcbiAgICBFUlJbXCJhYnJ1cHRDbG9zaW5nT2ZFbXB0eUNvbW1lbnRcIl0gPSBcImFicnVwdC1jbG9zaW5nLW9mLWVtcHR5LWNvbW1lbnRcIjtcbiAgICBFUlJbXCJlb2ZJbkNvbW1lbnRcIl0gPSBcImVvZi1pbi1jb21tZW50XCI7XG4gICAgRVJSW1wiaW5jb3JyZWN0bHlDbG9zZWRDb21tZW50XCJdID0gXCJpbmNvcnJlY3RseS1jbG9zZWQtY29tbWVudFwiO1xuICAgIEVSUltcImVvZkluQ2RhdGFcIl0gPSBcImVvZi1pbi1jZGF0YVwiO1xuICAgIEVSUltcImFic2VuY2VPZkRpZ2l0c0luTnVtZXJpY0NoYXJhY3RlclJlZmVyZW5jZVwiXSA9IFwiYWJzZW5jZS1vZi1kaWdpdHMtaW4tbnVtZXJpYy1jaGFyYWN0ZXItcmVmZXJlbmNlXCI7XG4gICAgRVJSW1wibnVsbENoYXJhY3RlclJlZmVyZW5jZVwiXSA9IFwibnVsbC1jaGFyYWN0ZXItcmVmZXJlbmNlXCI7XG4gICAgRVJSW1wic3Vycm9nYXRlQ2hhcmFjdGVyUmVmZXJlbmNlXCJdID0gXCJzdXJyb2dhdGUtY2hhcmFjdGVyLXJlZmVyZW5jZVwiO1xuICAgIEVSUltcImNoYXJhY3RlclJlZmVyZW5jZU91dHNpZGVVbmljb2RlUmFuZ2VcIl0gPSBcImNoYXJhY3Rlci1yZWZlcmVuY2Utb3V0c2lkZS11bmljb2RlLXJhbmdlXCI7XG4gICAgRVJSW1wiY29udHJvbENoYXJhY3RlclJlZmVyZW5jZVwiXSA9IFwiY29udHJvbC1jaGFyYWN0ZXItcmVmZXJlbmNlXCI7XG4gICAgRVJSW1wibm9uY2hhcmFjdGVyQ2hhcmFjdGVyUmVmZXJlbmNlXCJdID0gXCJub25jaGFyYWN0ZXItY2hhcmFjdGVyLXJlZmVyZW5jZVwiO1xuICAgIEVSUltcIm1pc3NpbmdXaGl0ZXNwYWNlQmVmb3JlRG9jdHlwZU5hbWVcIl0gPSBcIm1pc3Npbmctd2hpdGVzcGFjZS1iZWZvcmUtZG9jdHlwZS1uYW1lXCI7XG4gICAgRVJSW1wibWlzc2luZ0RvY3R5cGVOYW1lXCJdID0gXCJtaXNzaW5nLWRvY3R5cGUtbmFtZVwiO1xuICAgIEVSUltcImludmFsaWRDaGFyYWN0ZXJTZXF1ZW5jZUFmdGVyRG9jdHlwZU5hbWVcIl0gPSBcImludmFsaWQtY2hhcmFjdGVyLXNlcXVlbmNlLWFmdGVyLWRvY3R5cGUtbmFtZVwiO1xuICAgIEVSUltcImR1cGxpY2F0ZUF0dHJpYnV0ZVwiXSA9IFwiZHVwbGljYXRlLWF0dHJpYnV0ZVwiO1xuICAgIEVSUltcIm5vbkNvbmZvcm1pbmdEb2N0eXBlXCJdID0gXCJub24tY29uZm9ybWluZy1kb2N0eXBlXCI7XG4gICAgRVJSW1wibWlzc2luZ0RvY3R5cGVcIl0gPSBcIm1pc3NpbmctZG9jdHlwZVwiO1xuICAgIEVSUltcIm1pc3BsYWNlZERvY3R5cGVcIl0gPSBcIm1pc3BsYWNlZC1kb2N0eXBlXCI7XG4gICAgRVJSW1wiZW5kVGFnV2l0aG91dE1hdGNoaW5nT3BlbkVsZW1lbnRcIl0gPSBcImVuZC10YWctd2l0aG91dC1tYXRjaGluZy1vcGVuLWVsZW1lbnRcIjtcbiAgICBFUlJbXCJjbG9zaW5nT2ZFbGVtZW50V2l0aE9wZW5DaGlsZEVsZW1lbnRzXCJdID0gXCJjbG9zaW5nLW9mLWVsZW1lbnQtd2l0aC1vcGVuLWNoaWxkLWVsZW1lbnRzXCI7XG4gICAgRVJSW1wiZGlzYWxsb3dlZENvbnRlbnRJbk5vc2NyaXB0SW5IZWFkXCJdID0gXCJkaXNhbGxvd2VkLWNvbnRlbnQtaW4tbm9zY3JpcHQtaW4taGVhZFwiO1xuICAgIEVSUltcIm9wZW5FbGVtZW50c0xlZnRBZnRlckVvZlwiXSA9IFwib3Blbi1lbGVtZW50cy1sZWZ0LWFmdGVyLWVvZlwiO1xuICAgIEVSUltcImFiYW5kb25lZEhlYWRFbGVtZW50Q2hpbGRcIl0gPSBcImFiYW5kb25lZC1oZWFkLWVsZW1lbnQtY2hpbGRcIjtcbiAgICBFUlJbXCJtaXNwbGFjZWRTdGFydFRhZ0ZvckhlYWRFbGVtZW50XCJdID0gXCJtaXNwbGFjZWQtc3RhcnQtdGFnLWZvci1oZWFkLWVsZW1lbnRcIjtcbiAgICBFUlJbXCJuZXN0ZWROb3NjcmlwdEluSGVhZFwiXSA9IFwibmVzdGVkLW5vc2NyaXB0LWluLWhlYWRcIjtcbiAgICBFUlJbXCJlb2ZJbkVsZW1lbnRUaGF0Q2FuQ29udGFpbk9ubHlUZXh0XCJdID0gXCJlb2YtaW4tZWxlbWVudC10aGF0LWNhbi1jb250YWluLW9ubHktdGV4dFwiO1xufSkoRVJSID0gZXhwb3J0cy5FUlIgfHwgKGV4cG9ydHMuRVJSID0ge30pKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWVycm9yLWNvZGVzLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5pc0ludGVncmF0aW9uUG9pbnQgPSBleHBvcnRzLmFkanVzdFRva2VuU1ZHVGFnTmFtZSA9IGV4cG9ydHMuYWRqdXN0VG9rZW5YTUxBdHRycyA9IGV4cG9ydHMuYWRqdXN0VG9rZW5TVkdBdHRycyA9IGV4cG9ydHMuYWRqdXN0VG9rZW5NYXRoTUxBdHRycyA9IGV4cG9ydHMuY2F1c2VzRXhpdCA9IGV4cG9ydHMuU1ZHX1RBR19OQU1FU19BREpVU1RNRU5UX01BUCA9IHZvaWQgMDtcbmNvbnN0IGh0bWxfanNfMSA9IHJlcXVpcmUoXCIuL2h0bWwuanNcIik7XG4vL01JTUUgdHlwZXNcbmNvbnN0IE1JTUVfVFlQRVMgPSB7XG4gICAgVEVYVF9IVE1MOiAndGV4dC9odG1sJyxcbiAgICBBUFBMSUNBVElPTl9YTUw6ICdhcHBsaWNhdGlvbi94aHRtbCt4bWwnLFxufTtcbi8vQXR0cmlidXRlc1xuY29uc3QgREVGSU5JVElPTl9VUkxfQVRUUiA9ICdkZWZpbml0aW9udXJsJztcbmNvbnN0IEFESlVTVEVEX0RFRklOSVRJT05fVVJMX0FUVFIgPSAnZGVmaW5pdGlvblVSTCc7XG5jb25zdCBTVkdfQVRUUlNfQURKVVNUTUVOVF9NQVAgPSBuZXcgTWFwKFtcbiAgICAnYXR0cmlidXRlTmFtZScsXG4gICAgJ2F0dHJpYnV0ZVR5cGUnLFxuICAgICdiYXNlRnJlcXVlbmN5JyxcbiAgICAnYmFzZVByb2ZpbGUnLFxuICAgICdjYWxjTW9kZScsXG4gICAgJ2NsaXBQYXRoVW5pdHMnLFxuICAgICdkaWZmdXNlQ29uc3RhbnQnLFxuICAgICdlZGdlTW9kZScsXG4gICAgJ2ZpbHRlclVuaXRzJyxcbiAgICAnZ2x5cGhSZWYnLFxuICAgICdncmFkaWVudFRyYW5zZm9ybScsXG4gICAgJ2dyYWRpZW50VW5pdHMnLFxuICAgICdrZXJuZWxNYXRyaXgnLFxuICAgICdrZXJuZWxVbml0TGVuZ3RoJyxcbiAgICAna2V5UG9pbnRzJyxcbiAgICAna2V5U3BsaW5lcycsXG4gICAgJ2tleVRpbWVzJyxcbiAgICAnbGVuZ3RoQWRqdXN0JyxcbiAgICAnbGltaXRpbmdDb25lQW5nbGUnLFxuICAgICdtYXJrZXJIZWlnaHQnLFxuICAgICdtYXJrZXJVbml0cycsXG4gICAgJ21hcmtlcldpZHRoJyxcbiAgICAnbWFza0NvbnRlbnRVbml0cycsXG4gICAgJ21hc2tVbml0cycsXG4gICAgJ251bU9jdGF2ZXMnLFxuICAgICdwYXRoTGVuZ3RoJyxcbiAgICAncGF0dGVybkNvbnRlbnRVbml0cycsXG4gICAgJ3BhdHRlcm5UcmFuc2Zvcm0nLFxuICAgICdwYXR0ZXJuVW5pdHMnLFxuICAgICdwb2ludHNBdFgnLFxuICAgICdwb2ludHNBdFknLFxuICAgICdwb2ludHNBdFonLFxuICAgICdwcmVzZXJ2ZUFscGhhJyxcbiAgICAncHJlc2VydmVBc3BlY3RSYXRpbycsXG4gICAgJ3ByaW1pdGl2ZVVuaXRzJyxcbiAgICAncmVmWCcsXG4gICAgJ3JlZlknLFxuICAgICdyZXBlYXRDb3VudCcsXG4gICAgJ3JlcGVhdER1cicsXG4gICAgJ3JlcXVpcmVkRXh0ZW5zaW9ucycsXG4gICAgJ3JlcXVpcmVkRmVhdHVyZXMnLFxuICAgICdzcGVjdWxhckNvbnN0YW50JyxcbiAgICAnc3BlY3VsYXJFeHBvbmVudCcsXG4gICAgJ3NwcmVhZE1ldGhvZCcsXG4gICAgJ3N0YXJ0T2Zmc2V0JyxcbiAgICAnc3RkRGV2aWF0aW9uJyxcbiAgICAnc3RpdGNoVGlsZXMnLFxuICAgICdzdXJmYWNlU2NhbGUnLFxuICAgICdzeXN0ZW1MYW5ndWFnZScsXG4gICAgJ3RhYmxlVmFsdWVzJyxcbiAgICAndGFyZ2V0WCcsXG4gICAgJ3RhcmdldFknLFxuICAgICd0ZXh0TGVuZ3RoJyxcbiAgICAndmlld0JveCcsXG4gICAgJ3ZpZXdUYXJnZXQnLFxuICAgICd4Q2hhbm5lbFNlbGVjdG9yJyxcbiAgICAneUNoYW5uZWxTZWxlY3RvcicsXG4gICAgJ3pvb21BbmRQYW4nLFxuXS5tYXAoKGF0dHIpID0+IFthdHRyLnRvTG93ZXJDYXNlKCksIGF0dHJdKSk7XG5jb25zdCBYTUxfQVRUUlNfQURKVVNUTUVOVF9NQVAgPSBuZXcgTWFwKFtcbiAgICBbJ3hsaW5rOmFjdHVhdGUnLCB7IHByZWZpeDogJ3hsaW5rJywgbmFtZTogJ2FjdHVhdGUnLCBuYW1lc3BhY2U6IGh0bWxfanNfMS5OUy5YTElOSyB9XSxcbiAgICBbJ3hsaW5rOmFyY3JvbGUnLCB7IHByZWZpeDogJ3hsaW5rJywgbmFtZTogJ2FyY3JvbGUnLCBuYW1lc3BhY2U6IGh0bWxfanNfMS5OUy5YTElOSyB9XSxcbiAgICBbJ3hsaW5rOmhyZWYnLCB7IHByZWZpeDogJ3hsaW5rJywgbmFtZTogJ2hyZWYnLCBuYW1lc3BhY2U6IGh0bWxfanNfMS5OUy5YTElOSyB9XSxcbiAgICBbJ3hsaW5rOnJvbGUnLCB7IHByZWZpeDogJ3hsaW5rJywgbmFtZTogJ3JvbGUnLCBuYW1lc3BhY2U6IGh0bWxfanNfMS5OUy5YTElOSyB9XSxcbiAgICBbJ3hsaW5rOnNob3cnLCB7IHByZWZpeDogJ3hsaW5rJywgbmFtZTogJ3Nob3cnLCBuYW1lc3BhY2U6IGh0bWxfanNfMS5OUy5YTElOSyB9XSxcbiAgICBbJ3hsaW5rOnRpdGxlJywgeyBwcmVmaXg6ICd4bGluaycsIG5hbWU6ICd0aXRsZScsIG5hbWVzcGFjZTogaHRtbF9qc18xLk5TLlhMSU5LIH1dLFxuICAgIFsneGxpbms6dHlwZScsIHsgcHJlZml4OiAneGxpbmsnLCBuYW1lOiAndHlwZScsIG5hbWVzcGFjZTogaHRtbF9qc18xLk5TLlhMSU5LIH1dLFxuICAgIFsneG1sOmJhc2UnLCB7IHByZWZpeDogJ3htbCcsIG5hbWU6ICdiYXNlJywgbmFtZXNwYWNlOiBodG1sX2pzXzEuTlMuWE1MIH1dLFxuICAgIFsneG1sOmxhbmcnLCB7IHByZWZpeDogJ3htbCcsIG5hbWU6ICdsYW5nJywgbmFtZXNwYWNlOiBodG1sX2pzXzEuTlMuWE1MIH1dLFxuICAgIFsneG1sOnNwYWNlJywgeyBwcmVmaXg6ICd4bWwnLCBuYW1lOiAnc3BhY2UnLCBuYW1lc3BhY2U6IGh0bWxfanNfMS5OUy5YTUwgfV0sXG4gICAgWyd4bWxucycsIHsgcHJlZml4OiAnJywgbmFtZTogJ3htbG5zJywgbmFtZXNwYWNlOiBodG1sX2pzXzEuTlMuWE1MTlMgfV0sXG4gICAgWyd4bWxuczp4bGluaycsIHsgcHJlZml4OiAneG1sbnMnLCBuYW1lOiAneGxpbmsnLCBuYW1lc3BhY2U6IGh0bWxfanNfMS5OUy5YTUxOUyB9XSxcbl0pO1xuLy9TVkcgdGFnIG5hbWVzIGFkanVzdG1lbnQgbWFwXG5leHBvcnRzLlNWR19UQUdfTkFNRVNfQURKVVNUTUVOVF9NQVAgPSBuZXcgTWFwKFtcbiAgICAnYWx0R2x5cGgnLFxuICAgICdhbHRHbHlwaERlZicsXG4gICAgJ2FsdEdseXBoSXRlbScsXG4gICAgJ2FuaW1hdGVDb2xvcicsXG4gICAgJ2FuaW1hdGVNb3Rpb24nLFxuICAgICdhbmltYXRlVHJhbnNmb3JtJyxcbiAgICAnY2xpcFBhdGgnLFxuICAgICdmZUJsZW5kJyxcbiAgICAnZmVDb2xvck1hdHJpeCcsXG4gICAgJ2ZlQ29tcG9uZW50VHJhbnNmZXInLFxuICAgICdmZUNvbXBvc2l0ZScsXG4gICAgJ2ZlQ29udm9sdmVNYXRyaXgnLFxuICAgICdmZURpZmZ1c2VMaWdodGluZycsXG4gICAgJ2ZlRGlzcGxhY2VtZW50TWFwJyxcbiAgICAnZmVEaXN0YW50TGlnaHQnLFxuICAgICdmZUZsb29kJyxcbiAgICAnZmVGdW5jQScsXG4gICAgJ2ZlRnVuY0InLFxuICAgICdmZUZ1bmNHJyxcbiAgICAnZmVGdW5jUicsXG4gICAgJ2ZlR2F1c3NpYW5CbHVyJyxcbiAgICAnZmVJbWFnZScsXG4gICAgJ2ZlTWVyZ2UnLFxuICAgICdmZU1lcmdlTm9kZScsXG4gICAgJ2ZlTW9ycGhvbG9neScsXG4gICAgJ2ZlT2Zmc2V0JyxcbiAgICAnZmVQb2ludExpZ2h0JyxcbiAgICAnZmVTcGVjdWxhckxpZ2h0aW5nJyxcbiAgICAnZmVTcG90TGlnaHQnLFxuICAgICdmZVRpbGUnLFxuICAgICdmZVR1cmJ1bGVuY2UnLFxuICAgICdmb3JlaWduT2JqZWN0JyxcbiAgICAnZ2x5cGhSZWYnLFxuICAgICdsaW5lYXJHcmFkaWVudCcsXG4gICAgJ3JhZGlhbEdyYWRpZW50JyxcbiAgICAndGV4dFBhdGgnLFxuXS5tYXAoKHRuKSA9PiBbdG4udG9Mb3dlckNhc2UoKSwgdG5dKSk7XG4vL1RhZ3MgdGhhdCBjYXVzZXMgZXhpdCBmcm9tIGZvcmVpZ24gY29udGVudFxuY29uc3QgRVhJVFNfRk9SRUlHTl9DT05URU5UID0gbmV3IFNldChbXG4gICAgaHRtbF9qc18xLlRBR19JRC5CLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuQklHLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuQkxPQ0tRVU9URSxcbiAgICBodG1sX2pzXzEuVEFHX0lELkJPRFksXG4gICAgaHRtbF9qc18xLlRBR19JRC5CUixcbiAgICBodG1sX2pzXzEuVEFHX0lELkNFTlRFUixcbiAgICBodG1sX2pzXzEuVEFHX0lELkNPREUsXG4gICAgaHRtbF9qc18xLlRBR19JRC5ERCxcbiAgICBodG1sX2pzXzEuVEFHX0lELkRJVixcbiAgICBodG1sX2pzXzEuVEFHX0lELkRMLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuRFQsXG4gICAgaHRtbF9qc18xLlRBR19JRC5FTSxcbiAgICBodG1sX2pzXzEuVEFHX0lELkVNQkVELFxuICAgIGh0bWxfanNfMS5UQUdfSUQuSDEsXG4gICAgaHRtbF9qc18xLlRBR19JRC5IMixcbiAgICBodG1sX2pzXzEuVEFHX0lELkgzLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuSDQsXG4gICAgaHRtbF9qc18xLlRBR19JRC5INSxcbiAgICBodG1sX2pzXzEuVEFHX0lELkg2LFxuICAgIGh0bWxfanNfMS5UQUdfSUQuSEVBRCxcbiAgICBodG1sX2pzXzEuVEFHX0lELkhSLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuSSxcbiAgICBodG1sX2pzXzEuVEFHX0lELklNRyxcbiAgICBodG1sX2pzXzEuVEFHX0lELkxJLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuTElTVElORyxcbiAgICBodG1sX2pzXzEuVEFHX0lELk1FTlUsXG4gICAgaHRtbF9qc18xLlRBR19JRC5NRVRBLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuTk9CUixcbiAgICBodG1sX2pzXzEuVEFHX0lELk9MLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuUCxcbiAgICBodG1sX2pzXzEuVEFHX0lELlBSRSxcbiAgICBodG1sX2pzXzEuVEFHX0lELlJVQlksXG4gICAgaHRtbF9qc18xLlRBR19JRC5TLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuU01BTEwsXG4gICAgaHRtbF9qc18xLlRBR19JRC5TUEFOLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuU1RST05HLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuU1RSSUtFLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuU1VCLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuU1VQLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuVEFCTEUsXG4gICAgaHRtbF9qc18xLlRBR19JRC5UVCxcbiAgICBodG1sX2pzXzEuVEFHX0lELlUsXG4gICAgaHRtbF9qc18xLlRBR19JRC5VTCxcbiAgICBodG1sX2pzXzEuVEFHX0lELlZBUixcbl0pO1xuLy9DaGVjayBleGl0IGZyb20gZm9yZWlnbiBjb250ZW50XG5mdW5jdGlvbiBjYXVzZXNFeGl0KHN0YXJ0VGFnVG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHN0YXJ0VGFnVG9rZW4udGFnSUQ7XG4gICAgY29uc3QgaXNGb250V2l0aEF0dHJzID0gdG4gPT09IGh0bWxfanNfMS5UQUdfSUQuRk9OVCAmJlxuICAgICAgICBzdGFydFRhZ1Rva2VuLmF0dHJzLnNvbWUoKHsgbmFtZSB9KSA9PiBuYW1lID09PSBodG1sX2pzXzEuQVRUUlMuQ09MT1IgfHwgbmFtZSA9PT0gaHRtbF9qc18xLkFUVFJTLlNJWkUgfHwgbmFtZSA9PT0gaHRtbF9qc18xLkFUVFJTLkZBQ0UpO1xuICAgIHJldHVybiBpc0ZvbnRXaXRoQXR0cnMgfHwgRVhJVFNfRk9SRUlHTl9DT05URU5ULmhhcyh0bik7XG59XG5leHBvcnRzLmNhdXNlc0V4aXQgPSBjYXVzZXNFeGl0O1xuLy9Ub2tlbiBhZGp1c3RtZW50c1xuZnVuY3Rpb24gYWRqdXN0VG9rZW5NYXRoTUxBdHRycyh0b2tlbikge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW4uYXR0cnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRva2VuLmF0dHJzW2ldLm5hbWUgPT09IERFRklOSVRJT05fVVJMX0FUVFIpIHtcbiAgICAgICAgICAgIHRva2VuLmF0dHJzW2ldLm5hbWUgPSBBREpVU1RFRF9ERUZJTklUSU9OX1VSTF9BVFRSO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLmFkanVzdFRva2VuTWF0aE1MQXR0cnMgPSBhZGp1c3RUb2tlbk1hdGhNTEF0dHJzO1xuZnVuY3Rpb24gYWRqdXN0VG9rZW5TVkdBdHRycyh0b2tlbikge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW4uYXR0cnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgYWRqdXN0ZWRBdHRyTmFtZSA9IFNWR19BVFRSU19BREpVU1RNRU5UX01BUC5nZXQodG9rZW4uYXR0cnNbaV0ubmFtZSk7XG4gICAgICAgIGlmIChhZGp1c3RlZEF0dHJOYW1lICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRva2VuLmF0dHJzW2ldLm5hbWUgPSBhZGp1c3RlZEF0dHJOYW1lO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5hZGp1c3RUb2tlblNWR0F0dHJzID0gYWRqdXN0VG9rZW5TVkdBdHRycztcbmZ1bmN0aW9uIGFkanVzdFRva2VuWE1MQXR0cnModG9rZW4pIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2VuLmF0dHJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGFkanVzdGVkQXR0ckVudHJ5ID0gWE1MX0FUVFJTX0FESlVTVE1FTlRfTUFQLmdldCh0b2tlbi5hdHRyc1tpXS5uYW1lKTtcbiAgICAgICAgaWYgKGFkanVzdGVkQXR0ckVudHJ5KSB7XG4gICAgICAgICAgICB0b2tlbi5hdHRyc1tpXS5wcmVmaXggPSBhZGp1c3RlZEF0dHJFbnRyeS5wcmVmaXg7XG4gICAgICAgICAgICB0b2tlbi5hdHRyc1tpXS5uYW1lID0gYWRqdXN0ZWRBdHRyRW50cnkubmFtZTtcbiAgICAgICAgICAgIHRva2VuLmF0dHJzW2ldLm5hbWVzcGFjZSA9IGFkanVzdGVkQXR0ckVudHJ5Lm5hbWVzcGFjZTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuYWRqdXN0VG9rZW5YTUxBdHRycyA9IGFkanVzdFRva2VuWE1MQXR0cnM7XG5mdW5jdGlvbiBhZGp1c3RUb2tlblNWR1RhZ05hbWUodG9rZW4pIHtcbiAgICBjb25zdCBhZGp1c3RlZFRhZ05hbWUgPSBleHBvcnRzLlNWR19UQUdfTkFNRVNfQURKVVNUTUVOVF9NQVAuZ2V0KHRva2VuLnRhZ05hbWUpO1xuICAgIGlmIChhZGp1c3RlZFRhZ05hbWUgIT0gbnVsbCkge1xuICAgICAgICB0b2tlbi50YWdOYW1lID0gYWRqdXN0ZWRUYWdOYW1lO1xuICAgICAgICB0b2tlbi50YWdJRCA9ICgwLCBodG1sX2pzXzEuZ2V0VGFnSUQpKHRva2VuLnRhZ05hbWUpO1xuICAgIH1cbn1cbmV4cG9ydHMuYWRqdXN0VG9rZW5TVkdUYWdOYW1lID0gYWRqdXN0VG9rZW5TVkdUYWdOYW1lO1xuLy9JbnRlZ3JhdGlvbiBwb2ludHNcbmZ1bmN0aW9uIGlzTWF0aE1MVGV4dEludGVncmF0aW9uUG9pbnQodG4sIG5zKSB7XG4gICAgcmV0dXJuIG5zID09PSBodG1sX2pzXzEuTlMuTUFUSE1MICYmICh0biA9PT0gaHRtbF9qc18xLlRBR19JRC5NSSB8fCB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5NTyB8fCB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5NTiB8fCB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5NUyB8fCB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5NVEVYVCk7XG59XG5mdW5jdGlvbiBpc0h0bWxJbnRlZ3JhdGlvblBvaW50KHRuLCBucywgYXR0cnMpIHtcbiAgICBpZiAobnMgPT09IGh0bWxfanNfMS5OUy5NQVRITUwgJiYgdG4gPT09IGh0bWxfanNfMS5UQUdfSUQuQU5OT1RBVElPTl9YTUwpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhdHRycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGF0dHJzW2ldLm5hbWUgPT09IGh0bWxfanNfMS5BVFRSUy5FTkNPRElORykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXR0cnNbaV0udmFsdWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPT09IE1JTUVfVFlQRVMuVEVYVF9IVE1MIHx8IHZhbHVlID09PSBNSU1FX1RZUEVTLkFQUExJQ0FUSU9OX1hNTDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnMgPT09IGh0bWxfanNfMS5OUy5TVkcgJiYgKHRuID09PSBodG1sX2pzXzEuVEFHX0lELkZPUkVJR05fT0JKRUNUIHx8IHRuID09PSBodG1sX2pzXzEuVEFHX0lELkRFU0MgfHwgdG4gPT09IGh0bWxfanNfMS5UQUdfSUQuVElUTEUpO1xufVxuZnVuY3Rpb24gaXNJbnRlZ3JhdGlvblBvaW50KHRuLCBucywgYXR0cnMsIGZvcmVpZ25OUykge1xuICAgIHJldHVybiAoKCghZm9yZWlnbk5TIHx8IGZvcmVpZ25OUyA9PT0gaHRtbF9qc18xLk5TLkhUTUwpICYmIGlzSHRtbEludGVncmF0aW9uUG9pbnQodG4sIG5zLCBhdHRycykpIHx8XG4gICAgICAgICgoIWZvcmVpZ25OUyB8fCBmb3JlaWduTlMgPT09IGh0bWxfanNfMS5OUy5NQVRITUwpICYmIGlzTWF0aE1MVGV4dEludGVncmF0aW9uUG9pbnQodG4sIG5zKSkpO1xufVxuZXhwb3J0cy5pc0ludGVncmF0aW9uUG9pbnQgPSBpc0ludGVncmF0aW9uUG9pbnQ7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1mb3JlaWduLWNvbnRlbnQuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmhhc1VuZXNjYXBlZFRleHQgPSBleHBvcnRzLmlzTnVtYmVyZWRIZWFkZXIgPSBleHBvcnRzLlNQRUNJQUxfRUxFTUVOVFMgPSBleHBvcnRzLmdldFRhZ0lEID0gZXhwb3J0cy5UQUdfSUQgPSBleHBvcnRzLlRBR19OQU1FUyA9IGV4cG9ydHMuRE9DVU1FTlRfTU9ERSA9IGV4cG9ydHMuQVRUUlMgPSBleHBvcnRzLk5TID0gdm9pZCAwO1xuLyoqIEFsbCB2YWxpZCBuYW1lc3BhY2VzIGluIEhUTUwuICovXG52YXIgTlM7XG4oZnVuY3Rpb24gKE5TKSB7XG4gICAgTlNbXCJIVE1MXCJdID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCI7XG4gICAgTlNbXCJNQVRITUxcIl0gPSBcImh0dHA6Ly93d3cudzMub3JnLzE5OTgvTWF0aC9NYXRoTUxcIjtcbiAgICBOU1tcIlNWR1wiXSA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIjtcbiAgICBOU1tcIlhMSU5LXCJdID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCI7XG4gICAgTlNbXCJYTUxcIl0gPSBcImh0dHA6Ly93d3cudzMub3JnL1hNTC8xOTk4L25hbWVzcGFjZVwiO1xuICAgIE5TW1wiWE1MTlNcIl0gPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAveG1sbnMvXCI7XG59KShOUyA9IGV4cG9ydHMuTlMgfHwgKGV4cG9ydHMuTlMgPSB7fSkpO1xudmFyIEFUVFJTO1xuKGZ1bmN0aW9uIChBVFRSUykge1xuICAgIEFUVFJTW1wiVFlQRVwiXSA9IFwidHlwZVwiO1xuICAgIEFUVFJTW1wiQUNUSU9OXCJdID0gXCJhY3Rpb25cIjtcbiAgICBBVFRSU1tcIkVOQ09ESU5HXCJdID0gXCJlbmNvZGluZ1wiO1xuICAgIEFUVFJTW1wiUFJPTVBUXCJdID0gXCJwcm9tcHRcIjtcbiAgICBBVFRSU1tcIk5BTUVcIl0gPSBcIm5hbWVcIjtcbiAgICBBVFRSU1tcIkNPTE9SXCJdID0gXCJjb2xvclwiO1xuICAgIEFUVFJTW1wiRkFDRVwiXSA9IFwiZmFjZVwiO1xuICAgIEFUVFJTW1wiU0laRVwiXSA9IFwic2l6ZVwiO1xufSkoQVRUUlMgPSBleHBvcnRzLkFUVFJTIHx8IChleHBvcnRzLkFUVFJTID0ge30pKTtcbi8qKlxuICogVGhlIG1vZGUgb2YgdGhlIGRvY3VtZW50LlxuICpcbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZG9tLnNwZWMud2hhdHdnLm9yZy8jY29uY2VwdC1kb2N1bWVudC1saW1pdGVkLXF1aXJrc31cbiAqL1xudmFyIERPQ1VNRU5UX01PREU7XG4oZnVuY3Rpb24gKERPQ1VNRU5UX01PREUpIHtcbiAgICBET0NVTUVOVF9NT0RFW1wiTk9fUVVJUktTXCJdID0gXCJuby1xdWlya3NcIjtcbiAgICBET0NVTUVOVF9NT0RFW1wiUVVJUktTXCJdID0gXCJxdWlya3NcIjtcbiAgICBET0NVTUVOVF9NT0RFW1wiTElNSVRFRF9RVUlSS1NcIl0gPSBcImxpbWl0ZWQtcXVpcmtzXCI7XG59KShET0NVTUVOVF9NT0RFID0gZXhwb3J0cy5ET0NVTUVOVF9NT0RFIHx8IChleHBvcnRzLkRPQ1VNRU5UX01PREUgPSB7fSkpO1xudmFyIFRBR19OQU1FUztcbihmdW5jdGlvbiAoVEFHX05BTUVTKSB7XG4gICAgVEFHX05BTUVTW1wiQVwiXSA9IFwiYVwiO1xuICAgIFRBR19OQU1FU1tcIkFERFJFU1NcIl0gPSBcImFkZHJlc3NcIjtcbiAgICBUQUdfTkFNRVNbXCJBTk5PVEFUSU9OX1hNTFwiXSA9IFwiYW5ub3RhdGlvbi14bWxcIjtcbiAgICBUQUdfTkFNRVNbXCJBUFBMRVRcIl0gPSBcImFwcGxldFwiO1xuICAgIFRBR19OQU1FU1tcIkFSRUFcIl0gPSBcImFyZWFcIjtcbiAgICBUQUdfTkFNRVNbXCJBUlRJQ0xFXCJdID0gXCJhcnRpY2xlXCI7XG4gICAgVEFHX05BTUVTW1wiQVNJREVcIl0gPSBcImFzaWRlXCI7XG4gICAgVEFHX05BTUVTW1wiQlwiXSA9IFwiYlwiO1xuICAgIFRBR19OQU1FU1tcIkJBU0VcIl0gPSBcImJhc2VcIjtcbiAgICBUQUdfTkFNRVNbXCJCQVNFRk9OVFwiXSA9IFwiYmFzZWZvbnRcIjtcbiAgICBUQUdfTkFNRVNbXCJCR1NPVU5EXCJdID0gXCJiZ3NvdW5kXCI7XG4gICAgVEFHX05BTUVTW1wiQklHXCJdID0gXCJiaWdcIjtcbiAgICBUQUdfTkFNRVNbXCJCTE9DS1FVT1RFXCJdID0gXCJibG9ja3F1b3RlXCI7XG4gICAgVEFHX05BTUVTW1wiQk9EWVwiXSA9IFwiYm9keVwiO1xuICAgIFRBR19OQU1FU1tcIkJSXCJdID0gXCJiclwiO1xuICAgIFRBR19OQU1FU1tcIkJVVFRPTlwiXSA9IFwiYnV0dG9uXCI7XG4gICAgVEFHX05BTUVTW1wiQ0FQVElPTlwiXSA9IFwiY2FwdGlvblwiO1xuICAgIFRBR19OQU1FU1tcIkNFTlRFUlwiXSA9IFwiY2VudGVyXCI7XG4gICAgVEFHX05BTUVTW1wiQ09ERVwiXSA9IFwiY29kZVwiO1xuICAgIFRBR19OQU1FU1tcIkNPTFwiXSA9IFwiY29sXCI7XG4gICAgVEFHX05BTUVTW1wiQ09MR1JPVVBcIl0gPSBcImNvbGdyb3VwXCI7XG4gICAgVEFHX05BTUVTW1wiRERcIl0gPSBcImRkXCI7XG4gICAgVEFHX05BTUVTW1wiREVTQ1wiXSA9IFwiZGVzY1wiO1xuICAgIFRBR19OQU1FU1tcIkRFVEFJTFNcIl0gPSBcImRldGFpbHNcIjtcbiAgICBUQUdfTkFNRVNbXCJESUFMT0dcIl0gPSBcImRpYWxvZ1wiO1xuICAgIFRBR19OQU1FU1tcIkRJUlwiXSA9IFwiZGlyXCI7XG4gICAgVEFHX05BTUVTW1wiRElWXCJdID0gXCJkaXZcIjtcbiAgICBUQUdfTkFNRVNbXCJETFwiXSA9IFwiZGxcIjtcbiAgICBUQUdfTkFNRVNbXCJEVFwiXSA9IFwiZHRcIjtcbiAgICBUQUdfTkFNRVNbXCJFTVwiXSA9IFwiZW1cIjtcbiAgICBUQUdfTkFNRVNbXCJFTUJFRFwiXSA9IFwiZW1iZWRcIjtcbiAgICBUQUdfTkFNRVNbXCJGSUVMRFNFVFwiXSA9IFwiZmllbGRzZXRcIjtcbiAgICBUQUdfTkFNRVNbXCJGSUdDQVBUSU9OXCJdID0gXCJmaWdjYXB0aW9uXCI7XG4gICAgVEFHX05BTUVTW1wiRklHVVJFXCJdID0gXCJmaWd1cmVcIjtcbiAgICBUQUdfTkFNRVNbXCJGT05UXCJdID0gXCJmb250XCI7XG4gICAgVEFHX05BTUVTW1wiRk9PVEVSXCJdID0gXCJmb290ZXJcIjtcbiAgICBUQUdfTkFNRVNbXCJGT1JFSUdOX09CSkVDVFwiXSA9IFwiZm9yZWlnbk9iamVjdFwiO1xuICAgIFRBR19OQU1FU1tcIkZPUk1cIl0gPSBcImZvcm1cIjtcbiAgICBUQUdfTkFNRVNbXCJGUkFNRVwiXSA9IFwiZnJhbWVcIjtcbiAgICBUQUdfTkFNRVNbXCJGUkFNRVNFVFwiXSA9IFwiZnJhbWVzZXRcIjtcbiAgICBUQUdfTkFNRVNbXCJIMVwiXSA9IFwiaDFcIjtcbiAgICBUQUdfTkFNRVNbXCJIMlwiXSA9IFwiaDJcIjtcbiAgICBUQUdfTkFNRVNbXCJIM1wiXSA9IFwiaDNcIjtcbiAgICBUQUdfTkFNRVNbXCJINFwiXSA9IFwiaDRcIjtcbiAgICBUQUdfTkFNRVNbXCJINVwiXSA9IFwiaDVcIjtcbiAgICBUQUdfTkFNRVNbXCJINlwiXSA9IFwiaDZcIjtcbiAgICBUQUdfTkFNRVNbXCJIRUFEXCJdID0gXCJoZWFkXCI7XG4gICAgVEFHX05BTUVTW1wiSEVBREVSXCJdID0gXCJoZWFkZXJcIjtcbiAgICBUQUdfTkFNRVNbXCJIR1JPVVBcIl0gPSBcImhncm91cFwiO1xuICAgIFRBR19OQU1FU1tcIkhSXCJdID0gXCJoclwiO1xuICAgIFRBR19OQU1FU1tcIkhUTUxcIl0gPSBcImh0bWxcIjtcbiAgICBUQUdfTkFNRVNbXCJJXCJdID0gXCJpXCI7XG4gICAgVEFHX05BTUVTW1wiSU1HXCJdID0gXCJpbWdcIjtcbiAgICBUQUdfTkFNRVNbXCJJTUFHRVwiXSA9IFwiaW1hZ2VcIjtcbiAgICBUQUdfTkFNRVNbXCJJTlBVVFwiXSA9IFwiaW5wdXRcIjtcbiAgICBUQUdfTkFNRVNbXCJJRlJBTUVcIl0gPSBcImlmcmFtZVwiO1xuICAgIFRBR19OQU1FU1tcIktFWUdFTlwiXSA9IFwia2V5Z2VuXCI7XG4gICAgVEFHX05BTUVTW1wiTEFCRUxcIl0gPSBcImxhYmVsXCI7XG4gICAgVEFHX05BTUVTW1wiTElcIl0gPSBcImxpXCI7XG4gICAgVEFHX05BTUVTW1wiTElOS1wiXSA9IFwibGlua1wiO1xuICAgIFRBR19OQU1FU1tcIkxJU1RJTkdcIl0gPSBcImxpc3RpbmdcIjtcbiAgICBUQUdfTkFNRVNbXCJNQUlOXCJdID0gXCJtYWluXCI7XG4gICAgVEFHX05BTUVTW1wiTUFMSUdOTUFSS1wiXSA9IFwibWFsaWdubWFya1wiO1xuICAgIFRBR19OQU1FU1tcIk1BUlFVRUVcIl0gPSBcIm1hcnF1ZWVcIjtcbiAgICBUQUdfTkFNRVNbXCJNQVRIXCJdID0gXCJtYXRoXCI7XG4gICAgVEFHX05BTUVTW1wiTUVOVVwiXSA9IFwibWVudVwiO1xuICAgIFRBR19OQU1FU1tcIk1FVEFcIl0gPSBcIm1ldGFcIjtcbiAgICBUQUdfTkFNRVNbXCJNR0xZUEhcIl0gPSBcIm1nbHlwaFwiO1xuICAgIFRBR19OQU1FU1tcIk1JXCJdID0gXCJtaVwiO1xuICAgIFRBR19OQU1FU1tcIk1PXCJdID0gXCJtb1wiO1xuICAgIFRBR19OQU1FU1tcIk1OXCJdID0gXCJtblwiO1xuICAgIFRBR19OQU1FU1tcIk1TXCJdID0gXCJtc1wiO1xuICAgIFRBR19OQU1FU1tcIk1URVhUXCJdID0gXCJtdGV4dFwiO1xuICAgIFRBR19OQU1FU1tcIk5BVlwiXSA9IFwibmF2XCI7XG4gICAgVEFHX05BTUVTW1wiTk9CUlwiXSA9IFwibm9iclwiO1xuICAgIFRBR19OQU1FU1tcIk5PRlJBTUVTXCJdID0gXCJub2ZyYW1lc1wiO1xuICAgIFRBR19OQU1FU1tcIk5PRU1CRURcIl0gPSBcIm5vZW1iZWRcIjtcbiAgICBUQUdfTkFNRVNbXCJOT1NDUklQVFwiXSA9IFwibm9zY3JpcHRcIjtcbiAgICBUQUdfTkFNRVNbXCJPQkpFQ1RcIl0gPSBcIm9iamVjdFwiO1xuICAgIFRBR19OQU1FU1tcIk9MXCJdID0gXCJvbFwiO1xuICAgIFRBR19OQU1FU1tcIk9QVEdST1VQXCJdID0gXCJvcHRncm91cFwiO1xuICAgIFRBR19OQU1FU1tcIk9QVElPTlwiXSA9IFwib3B0aW9uXCI7XG4gICAgVEFHX05BTUVTW1wiUFwiXSA9IFwicFwiO1xuICAgIFRBR19OQU1FU1tcIlBBUkFNXCJdID0gXCJwYXJhbVwiO1xuICAgIFRBR19OQU1FU1tcIlBMQUlOVEVYVFwiXSA9IFwicGxhaW50ZXh0XCI7XG4gICAgVEFHX05BTUVTW1wiUFJFXCJdID0gXCJwcmVcIjtcbiAgICBUQUdfTkFNRVNbXCJSQlwiXSA9IFwicmJcIjtcbiAgICBUQUdfTkFNRVNbXCJSUFwiXSA9IFwicnBcIjtcbiAgICBUQUdfTkFNRVNbXCJSVFwiXSA9IFwicnRcIjtcbiAgICBUQUdfTkFNRVNbXCJSVENcIl0gPSBcInJ0Y1wiO1xuICAgIFRBR19OQU1FU1tcIlJVQllcIl0gPSBcInJ1YnlcIjtcbiAgICBUQUdfTkFNRVNbXCJTXCJdID0gXCJzXCI7XG4gICAgVEFHX05BTUVTW1wiU0NSSVBUXCJdID0gXCJzY3JpcHRcIjtcbiAgICBUQUdfTkFNRVNbXCJTRUNUSU9OXCJdID0gXCJzZWN0aW9uXCI7XG4gICAgVEFHX05BTUVTW1wiU0VMRUNUXCJdID0gXCJzZWxlY3RcIjtcbiAgICBUQUdfTkFNRVNbXCJTT1VSQ0VcIl0gPSBcInNvdXJjZVwiO1xuICAgIFRBR19OQU1FU1tcIlNNQUxMXCJdID0gXCJzbWFsbFwiO1xuICAgIFRBR19OQU1FU1tcIlNQQU5cIl0gPSBcInNwYW5cIjtcbiAgICBUQUdfTkFNRVNbXCJTVFJJS0VcIl0gPSBcInN0cmlrZVwiO1xuICAgIFRBR19OQU1FU1tcIlNUUk9OR1wiXSA9IFwic3Ryb25nXCI7XG4gICAgVEFHX05BTUVTW1wiU1RZTEVcIl0gPSBcInN0eWxlXCI7XG4gICAgVEFHX05BTUVTW1wiU1VCXCJdID0gXCJzdWJcIjtcbiAgICBUQUdfTkFNRVNbXCJTVU1NQVJZXCJdID0gXCJzdW1tYXJ5XCI7XG4gICAgVEFHX05BTUVTW1wiU1VQXCJdID0gXCJzdXBcIjtcbiAgICBUQUdfTkFNRVNbXCJUQUJMRVwiXSA9IFwidGFibGVcIjtcbiAgICBUQUdfTkFNRVNbXCJUQk9EWVwiXSA9IFwidGJvZHlcIjtcbiAgICBUQUdfTkFNRVNbXCJURU1QTEFURVwiXSA9IFwidGVtcGxhdGVcIjtcbiAgICBUQUdfTkFNRVNbXCJURVhUQVJFQVwiXSA9IFwidGV4dGFyZWFcIjtcbiAgICBUQUdfTkFNRVNbXCJURk9PVFwiXSA9IFwidGZvb3RcIjtcbiAgICBUQUdfTkFNRVNbXCJURFwiXSA9IFwidGRcIjtcbiAgICBUQUdfTkFNRVNbXCJUSFwiXSA9IFwidGhcIjtcbiAgICBUQUdfTkFNRVNbXCJUSEVBRFwiXSA9IFwidGhlYWRcIjtcbiAgICBUQUdfTkFNRVNbXCJUSVRMRVwiXSA9IFwidGl0bGVcIjtcbiAgICBUQUdfTkFNRVNbXCJUUlwiXSA9IFwidHJcIjtcbiAgICBUQUdfTkFNRVNbXCJUUkFDS1wiXSA9IFwidHJhY2tcIjtcbiAgICBUQUdfTkFNRVNbXCJUVFwiXSA9IFwidHRcIjtcbiAgICBUQUdfTkFNRVNbXCJVXCJdID0gXCJ1XCI7XG4gICAgVEFHX05BTUVTW1wiVUxcIl0gPSBcInVsXCI7XG4gICAgVEFHX05BTUVTW1wiU1ZHXCJdID0gXCJzdmdcIjtcbiAgICBUQUdfTkFNRVNbXCJWQVJcIl0gPSBcInZhclwiO1xuICAgIFRBR19OQU1FU1tcIldCUlwiXSA9IFwid2JyXCI7XG4gICAgVEFHX05BTUVTW1wiWE1QXCJdID0gXCJ4bXBcIjtcbn0pKFRBR19OQU1FUyA9IGV4cG9ydHMuVEFHX05BTUVTIHx8IChleHBvcnRzLlRBR19OQU1FUyA9IHt9KSk7XG4vKipcbiAqIFRhZyBJRHMgYXJlIG51bWVyaWMgSURzIGZvciBrbm93biB0YWcgbmFtZXMuXG4gKlxuICogV2UgdXNlIHRhZyBJRHMgdG8gaW1wcm92ZSB0aGUgcGVyZm9ybWFuY2Ugb2YgdGFnIG5hbWUgY29tcGFyaXNvbnMuXG4gKi9cbnZhciBUQUdfSUQ7XG4oZnVuY3Rpb24gKFRBR19JRCkge1xuICAgIFRBR19JRFtUQUdfSURbXCJVTktOT1dOXCJdID0gMF0gPSBcIlVOS05PV05cIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiQVwiXSA9IDFdID0gXCJBXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkFERFJFU1NcIl0gPSAyXSA9IFwiQUREUkVTU1wiO1xuICAgIFRBR19JRFtUQUdfSURbXCJBTk5PVEFUSU9OX1hNTFwiXSA9IDNdID0gXCJBTk5PVEFUSU9OX1hNTFwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJBUFBMRVRcIl0gPSA0XSA9IFwiQVBQTEVUXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkFSRUFcIl0gPSA1XSA9IFwiQVJFQVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJBUlRJQ0xFXCJdID0gNl0gPSBcIkFSVElDTEVcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiQVNJREVcIl0gPSA3XSA9IFwiQVNJREVcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiQlwiXSA9IDhdID0gXCJCXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkJBU0VcIl0gPSA5XSA9IFwiQkFTRVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJCQVNFRk9OVFwiXSA9IDEwXSA9IFwiQkFTRUZPTlRcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiQkdTT1VORFwiXSA9IDExXSA9IFwiQkdTT1VORFwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJCSUdcIl0gPSAxMl0gPSBcIkJJR1wiO1xuICAgIFRBR19JRFtUQUdfSURbXCJCTE9DS1FVT1RFXCJdID0gMTNdID0gXCJCTE9DS1FVT1RFXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkJPRFlcIl0gPSAxNF0gPSBcIkJPRFlcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiQlJcIl0gPSAxNV0gPSBcIkJSXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkJVVFRPTlwiXSA9IDE2XSA9IFwiQlVUVE9OXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkNBUFRJT05cIl0gPSAxN10gPSBcIkNBUFRJT05cIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiQ0VOVEVSXCJdID0gMThdID0gXCJDRU5URVJcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiQ09ERVwiXSA9IDE5XSA9IFwiQ09ERVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJDT0xcIl0gPSAyMF0gPSBcIkNPTFwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJDT0xHUk9VUFwiXSA9IDIxXSA9IFwiQ09MR1JPVVBcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiRERcIl0gPSAyMl0gPSBcIkREXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkRFU0NcIl0gPSAyM10gPSBcIkRFU0NcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiREVUQUlMU1wiXSA9IDI0XSA9IFwiREVUQUlMU1wiO1xuICAgIFRBR19JRFtUQUdfSURbXCJESUFMT0dcIl0gPSAyNV0gPSBcIkRJQUxPR1wiO1xuICAgIFRBR19JRFtUQUdfSURbXCJESVJcIl0gPSAyNl0gPSBcIkRJUlwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJESVZcIl0gPSAyN10gPSBcIkRJVlwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJETFwiXSA9IDI4XSA9IFwiRExcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiRFRcIl0gPSAyOV0gPSBcIkRUXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkVNXCJdID0gMzBdID0gXCJFTVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJFTUJFRFwiXSA9IDMxXSA9IFwiRU1CRURcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiRklFTERTRVRcIl0gPSAzMl0gPSBcIkZJRUxEU0VUXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkZJR0NBUFRJT05cIl0gPSAzM10gPSBcIkZJR0NBUFRJT05cIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiRklHVVJFXCJdID0gMzRdID0gXCJGSUdVUkVcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiRk9OVFwiXSA9IDM1XSA9IFwiRk9OVFwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJGT09URVJcIl0gPSAzNl0gPSBcIkZPT1RFUlwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJGT1JFSUdOX09CSkVDVFwiXSA9IDM3XSA9IFwiRk9SRUlHTl9PQkpFQ1RcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiRk9STVwiXSA9IDM4XSA9IFwiRk9STVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJGUkFNRVwiXSA9IDM5XSA9IFwiRlJBTUVcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiRlJBTUVTRVRcIl0gPSA0MF0gPSBcIkZSQU1FU0VUXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkgxXCJdID0gNDFdID0gXCJIMVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJIMlwiXSA9IDQyXSA9IFwiSDJcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiSDNcIl0gPSA0M10gPSBcIkgzXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkg0XCJdID0gNDRdID0gXCJINFwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJINVwiXSA9IDQ1XSA9IFwiSDVcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiSDZcIl0gPSA0Nl0gPSBcIkg2XCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkhFQURcIl0gPSA0N10gPSBcIkhFQURcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiSEVBREVSXCJdID0gNDhdID0gXCJIRUFERVJcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiSEdST1VQXCJdID0gNDldID0gXCJIR1JPVVBcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiSFJcIl0gPSA1MF0gPSBcIkhSXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkhUTUxcIl0gPSA1MV0gPSBcIkhUTUxcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiSVwiXSA9IDUyXSA9IFwiSVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJJTUdcIl0gPSA1M10gPSBcIklNR1wiO1xuICAgIFRBR19JRFtUQUdfSURbXCJJTUFHRVwiXSA9IDU0XSA9IFwiSU1BR0VcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiSU5QVVRcIl0gPSA1NV0gPSBcIklOUFVUXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIklGUkFNRVwiXSA9IDU2XSA9IFwiSUZSQU1FXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIktFWUdFTlwiXSA9IDU3XSA9IFwiS0VZR0VOXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIkxBQkVMXCJdID0gNThdID0gXCJMQUJFTFwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJMSVwiXSA9IDU5XSA9IFwiTElcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiTElOS1wiXSA9IDYwXSA9IFwiTElOS1wiO1xuICAgIFRBR19JRFtUQUdfSURbXCJMSVNUSU5HXCJdID0gNjFdID0gXCJMSVNUSU5HXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIk1BSU5cIl0gPSA2Ml0gPSBcIk1BSU5cIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiTUFMSUdOTUFSS1wiXSA9IDYzXSA9IFwiTUFMSUdOTUFSS1wiO1xuICAgIFRBR19JRFtUQUdfSURbXCJNQVJRVUVFXCJdID0gNjRdID0gXCJNQVJRVUVFXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIk1BVEhcIl0gPSA2NV0gPSBcIk1BVEhcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiTUVOVVwiXSA9IDY2XSA9IFwiTUVOVVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJNRVRBXCJdID0gNjddID0gXCJNRVRBXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIk1HTFlQSFwiXSA9IDY4XSA9IFwiTUdMWVBIXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIk1JXCJdID0gNjldID0gXCJNSVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJNT1wiXSA9IDcwXSA9IFwiTU9cIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiTU5cIl0gPSA3MV0gPSBcIk1OXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIk1TXCJdID0gNzJdID0gXCJNU1wiO1xuICAgIFRBR19JRFtUQUdfSURbXCJNVEVYVFwiXSA9IDczXSA9IFwiTVRFWFRcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiTkFWXCJdID0gNzRdID0gXCJOQVZcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiTk9CUlwiXSA9IDc1XSA9IFwiTk9CUlwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJOT0ZSQU1FU1wiXSA9IDc2XSA9IFwiTk9GUkFNRVNcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiTk9FTUJFRFwiXSA9IDc3XSA9IFwiTk9FTUJFRFwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJOT1NDUklQVFwiXSA9IDc4XSA9IFwiTk9TQ1JJUFRcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiT0JKRUNUXCJdID0gNzldID0gXCJPQkpFQ1RcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiT0xcIl0gPSA4MF0gPSBcIk9MXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIk9QVEdST1VQXCJdID0gODFdID0gXCJPUFRHUk9VUFwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJPUFRJT05cIl0gPSA4Ml0gPSBcIk9QVElPTlwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJQXCJdID0gODNdID0gXCJQXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIlBBUkFNXCJdID0gODRdID0gXCJQQVJBTVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJQTEFJTlRFWFRcIl0gPSA4NV0gPSBcIlBMQUlOVEVYVFwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJQUkVcIl0gPSA4Nl0gPSBcIlBSRVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJSQlwiXSA9IDg3XSA9IFwiUkJcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiUlBcIl0gPSA4OF0gPSBcIlJQXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIlJUXCJdID0gODldID0gXCJSVFwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJSVENcIl0gPSA5MF0gPSBcIlJUQ1wiO1xuICAgIFRBR19JRFtUQUdfSURbXCJSVUJZXCJdID0gOTFdID0gXCJSVUJZXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIlNcIl0gPSA5Ml0gPSBcIlNcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiU0NSSVBUXCJdID0gOTNdID0gXCJTQ1JJUFRcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiU0VDVElPTlwiXSA9IDk0XSA9IFwiU0VDVElPTlwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJTRUxFQ1RcIl0gPSA5NV0gPSBcIlNFTEVDVFwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJTT1VSQ0VcIl0gPSA5Nl0gPSBcIlNPVVJDRVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJTTUFMTFwiXSA9IDk3XSA9IFwiU01BTExcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiU1BBTlwiXSA9IDk4XSA9IFwiU1BBTlwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJTVFJJS0VcIl0gPSA5OV0gPSBcIlNUUklLRVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJTVFJPTkdcIl0gPSAxMDBdID0gXCJTVFJPTkdcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiU1RZTEVcIl0gPSAxMDFdID0gXCJTVFlMRVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJTVUJcIl0gPSAxMDJdID0gXCJTVUJcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiU1VNTUFSWVwiXSA9IDEwM10gPSBcIlNVTU1BUllcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiU1VQXCJdID0gMTA0XSA9IFwiU1VQXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIlRBQkxFXCJdID0gMTA1XSA9IFwiVEFCTEVcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiVEJPRFlcIl0gPSAxMDZdID0gXCJUQk9EWVwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJURU1QTEFURVwiXSA9IDEwN10gPSBcIlRFTVBMQVRFXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIlRFWFRBUkVBXCJdID0gMTA4XSA9IFwiVEVYVEFSRUFcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiVEZPT1RcIl0gPSAxMDldID0gXCJURk9PVFwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJURFwiXSA9IDExMF0gPSBcIlREXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIlRIXCJdID0gMTExXSA9IFwiVEhcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiVEhFQURcIl0gPSAxMTJdID0gXCJUSEVBRFwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJUSVRMRVwiXSA9IDExM10gPSBcIlRJVExFXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIlRSXCJdID0gMTE0XSA9IFwiVFJcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiVFJBQ0tcIl0gPSAxMTVdID0gXCJUUkFDS1wiO1xuICAgIFRBR19JRFtUQUdfSURbXCJUVFwiXSA9IDExNl0gPSBcIlRUXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIlVcIl0gPSAxMTddID0gXCJVXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIlVMXCJdID0gMTE4XSA9IFwiVUxcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiU1ZHXCJdID0gMTE5XSA9IFwiU1ZHXCI7XG4gICAgVEFHX0lEW1RBR19JRFtcIlZBUlwiXSA9IDEyMF0gPSBcIlZBUlwiO1xuICAgIFRBR19JRFtUQUdfSURbXCJXQlJcIl0gPSAxMjFdID0gXCJXQlJcIjtcbiAgICBUQUdfSURbVEFHX0lEW1wiWE1QXCJdID0gMTIyXSA9IFwiWE1QXCI7XG59KShUQUdfSUQgPSBleHBvcnRzLlRBR19JRCB8fCAoZXhwb3J0cy5UQUdfSUQgPSB7fSkpO1xuY29uc3QgVEFHX05BTUVfVE9fSUQgPSBuZXcgTWFwKFtcbiAgICBbVEFHX05BTUVTLkEsIFRBR19JRC5BXSxcbiAgICBbVEFHX05BTUVTLkFERFJFU1MsIFRBR19JRC5BRERSRVNTXSxcbiAgICBbVEFHX05BTUVTLkFOTk9UQVRJT05fWE1MLCBUQUdfSUQuQU5OT1RBVElPTl9YTUxdLFxuICAgIFtUQUdfTkFNRVMuQVBQTEVULCBUQUdfSUQuQVBQTEVUXSxcbiAgICBbVEFHX05BTUVTLkFSRUEsIFRBR19JRC5BUkVBXSxcbiAgICBbVEFHX05BTUVTLkFSVElDTEUsIFRBR19JRC5BUlRJQ0xFXSxcbiAgICBbVEFHX05BTUVTLkFTSURFLCBUQUdfSUQuQVNJREVdLFxuICAgIFtUQUdfTkFNRVMuQiwgVEFHX0lELkJdLFxuICAgIFtUQUdfTkFNRVMuQkFTRSwgVEFHX0lELkJBU0VdLFxuICAgIFtUQUdfTkFNRVMuQkFTRUZPTlQsIFRBR19JRC5CQVNFRk9OVF0sXG4gICAgW1RBR19OQU1FUy5CR1NPVU5ELCBUQUdfSUQuQkdTT1VORF0sXG4gICAgW1RBR19OQU1FUy5CSUcsIFRBR19JRC5CSUddLFxuICAgIFtUQUdfTkFNRVMuQkxPQ0tRVU9URSwgVEFHX0lELkJMT0NLUVVPVEVdLFxuICAgIFtUQUdfTkFNRVMuQk9EWSwgVEFHX0lELkJPRFldLFxuICAgIFtUQUdfTkFNRVMuQlIsIFRBR19JRC5CUl0sXG4gICAgW1RBR19OQU1FUy5CVVRUT04sIFRBR19JRC5CVVRUT05dLFxuICAgIFtUQUdfTkFNRVMuQ0FQVElPTiwgVEFHX0lELkNBUFRJT05dLFxuICAgIFtUQUdfTkFNRVMuQ0VOVEVSLCBUQUdfSUQuQ0VOVEVSXSxcbiAgICBbVEFHX05BTUVTLkNPREUsIFRBR19JRC5DT0RFXSxcbiAgICBbVEFHX05BTUVTLkNPTCwgVEFHX0lELkNPTF0sXG4gICAgW1RBR19OQU1FUy5DT0xHUk9VUCwgVEFHX0lELkNPTEdST1VQXSxcbiAgICBbVEFHX05BTUVTLkRELCBUQUdfSUQuRERdLFxuICAgIFtUQUdfTkFNRVMuREVTQywgVEFHX0lELkRFU0NdLFxuICAgIFtUQUdfTkFNRVMuREVUQUlMUywgVEFHX0lELkRFVEFJTFNdLFxuICAgIFtUQUdfTkFNRVMuRElBTE9HLCBUQUdfSUQuRElBTE9HXSxcbiAgICBbVEFHX05BTUVTLkRJUiwgVEFHX0lELkRJUl0sXG4gICAgW1RBR19OQU1FUy5ESVYsIFRBR19JRC5ESVZdLFxuICAgIFtUQUdfTkFNRVMuREwsIFRBR19JRC5ETF0sXG4gICAgW1RBR19OQU1FUy5EVCwgVEFHX0lELkRUXSxcbiAgICBbVEFHX05BTUVTLkVNLCBUQUdfSUQuRU1dLFxuICAgIFtUQUdfTkFNRVMuRU1CRUQsIFRBR19JRC5FTUJFRF0sXG4gICAgW1RBR19OQU1FUy5GSUVMRFNFVCwgVEFHX0lELkZJRUxEU0VUXSxcbiAgICBbVEFHX05BTUVTLkZJR0NBUFRJT04sIFRBR19JRC5GSUdDQVBUSU9OXSxcbiAgICBbVEFHX05BTUVTLkZJR1VSRSwgVEFHX0lELkZJR1VSRV0sXG4gICAgW1RBR19OQU1FUy5GT05ULCBUQUdfSUQuRk9OVF0sXG4gICAgW1RBR19OQU1FUy5GT09URVIsIFRBR19JRC5GT09URVJdLFxuICAgIFtUQUdfTkFNRVMuRk9SRUlHTl9PQkpFQ1QsIFRBR19JRC5GT1JFSUdOX09CSkVDVF0sXG4gICAgW1RBR19OQU1FUy5GT1JNLCBUQUdfSUQuRk9STV0sXG4gICAgW1RBR19OQU1FUy5GUkFNRSwgVEFHX0lELkZSQU1FXSxcbiAgICBbVEFHX05BTUVTLkZSQU1FU0VULCBUQUdfSUQuRlJBTUVTRVRdLFxuICAgIFtUQUdfTkFNRVMuSDEsIFRBR19JRC5IMV0sXG4gICAgW1RBR19OQU1FUy5IMiwgVEFHX0lELkgyXSxcbiAgICBbVEFHX05BTUVTLkgzLCBUQUdfSUQuSDNdLFxuICAgIFtUQUdfTkFNRVMuSDQsIFRBR19JRC5INF0sXG4gICAgW1RBR19OQU1FUy5INSwgVEFHX0lELkg1XSxcbiAgICBbVEFHX05BTUVTLkg2LCBUQUdfSUQuSDZdLFxuICAgIFtUQUdfTkFNRVMuSEVBRCwgVEFHX0lELkhFQURdLFxuICAgIFtUQUdfTkFNRVMuSEVBREVSLCBUQUdfSUQuSEVBREVSXSxcbiAgICBbVEFHX05BTUVTLkhHUk9VUCwgVEFHX0lELkhHUk9VUF0sXG4gICAgW1RBR19OQU1FUy5IUiwgVEFHX0lELkhSXSxcbiAgICBbVEFHX05BTUVTLkhUTUwsIFRBR19JRC5IVE1MXSxcbiAgICBbVEFHX05BTUVTLkksIFRBR19JRC5JXSxcbiAgICBbVEFHX05BTUVTLklNRywgVEFHX0lELklNR10sXG4gICAgW1RBR19OQU1FUy5JTUFHRSwgVEFHX0lELklNQUdFXSxcbiAgICBbVEFHX05BTUVTLklOUFVULCBUQUdfSUQuSU5QVVRdLFxuICAgIFtUQUdfTkFNRVMuSUZSQU1FLCBUQUdfSUQuSUZSQU1FXSxcbiAgICBbVEFHX05BTUVTLktFWUdFTiwgVEFHX0lELktFWUdFTl0sXG4gICAgW1RBR19OQU1FUy5MQUJFTCwgVEFHX0lELkxBQkVMXSxcbiAgICBbVEFHX05BTUVTLkxJLCBUQUdfSUQuTEldLFxuICAgIFtUQUdfTkFNRVMuTElOSywgVEFHX0lELkxJTktdLFxuICAgIFtUQUdfTkFNRVMuTElTVElORywgVEFHX0lELkxJU1RJTkddLFxuICAgIFtUQUdfTkFNRVMuTUFJTiwgVEFHX0lELk1BSU5dLFxuICAgIFtUQUdfTkFNRVMuTUFMSUdOTUFSSywgVEFHX0lELk1BTElHTk1BUktdLFxuICAgIFtUQUdfTkFNRVMuTUFSUVVFRSwgVEFHX0lELk1BUlFVRUVdLFxuICAgIFtUQUdfTkFNRVMuTUFUSCwgVEFHX0lELk1BVEhdLFxuICAgIFtUQUdfTkFNRVMuTUVOVSwgVEFHX0lELk1FTlVdLFxuICAgIFtUQUdfTkFNRVMuTUVUQSwgVEFHX0lELk1FVEFdLFxuICAgIFtUQUdfTkFNRVMuTUdMWVBILCBUQUdfSUQuTUdMWVBIXSxcbiAgICBbVEFHX05BTUVTLk1JLCBUQUdfSUQuTUldLFxuICAgIFtUQUdfTkFNRVMuTU8sIFRBR19JRC5NT10sXG4gICAgW1RBR19OQU1FUy5NTiwgVEFHX0lELk1OXSxcbiAgICBbVEFHX05BTUVTLk1TLCBUQUdfSUQuTVNdLFxuICAgIFtUQUdfTkFNRVMuTVRFWFQsIFRBR19JRC5NVEVYVF0sXG4gICAgW1RBR19OQU1FUy5OQVYsIFRBR19JRC5OQVZdLFxuICAgIFtUQUdfTkFNRVMuTk9CUiwgVEFHX0lELk5PQlJdLFxuICAgIFtUQUdfTkFNRVMuTk9GUkFNRVMsIFRBR19JRC5OT0ZSQU1FU10sXG4gICAgW1RBR19OQU1FUy5OT0VNQkVELCBUQUdfSUQuTk9FTUJFRF0sXG4gICAgW1RBR19OQU1FUy5OT1NDUklQVCwgVEFHX0lELk5PU0NSSVBUXSxcbiAgICBbVEFHX05BTUVTLk9CSkVDVCwgVEFHX0lELk9CSkVDVF0sXG4gICAgW1RBR19OQU1FUy5PTCwgVEFHX0lELk9MXSxcbiAgICBbVEFHX05BTUVTLk9QVEdST1VQLCBUQUdfSUQuT1BUR1JPVVBdLFxuICAgIFtUQUdfTkFNRVMuT1BUSU9OLCBUQUdfSUQuT1BUSU9OXSxcbiAgICBbVEFHX05BTUVTLlAsIFRBR19JRC5QXSxcbiAgICBbVEFHX05BTUVTLlBBUkFNLCBUQUdfSUQuUEFSQU1dLFxuICAgIFtUQUdfTkFNRVMuUExBSU5URVhULCBUQUdfSUQuUExBSU5URVhUXSxcbiAgICBbVEFHX05BTUVTLlBSRSwgVEFHX0lELlBSRV0sXG4gICAgW1RBR19OQU1FUy5SQiwgVEFHX0lELlJCXSxcbiAgICBbVEFHX05BTUVTLlJQLCBUQUdfSUQuUlBdLFxuICAgIFtUQUdfTkFNRVMuUlQsIFRBR19JRC5SVF0sXG4gICAgW1RBR19OQU1FUy5SVEMsIFRBR19JRC5SVENdLFxuICAgIFtUQUdfTkFNRVMuUlVCWSwgVEFHX0lELlJVQlldLFxuICAgIFtUQUdfTkFNRVMuUywgVEFHX0lELlNdLFxuICAgIFtUQUdfTkFNRVMuU0NSSVBULCBUQUdfSUQuU0NSSVBUXSxcbiAgICBbVEFHX05BTUVTLlNFQ1RJT04sIFRBR19JRC5TRUNUSU9OXSxcbiAgICBbVEFHX05BTUVTLlNFTEVDVCwgVEFHX0lELlNFTEVDVF0sXG4gICAgW1RBR19OQU1FUy5TT1VSQ0UsIFRBR19JRC5TT1VSQ0VdLFxuICAgIFtUQUdfTkFNRVMuU01BTEwsIFRBR19JRC5TTUFMTF0sXG4gICAgW1RBR19OQU1FUy5TUEFOLCBUQUdfSUQuU1BBTl0sXG4gICAgW1RBR19OQU1FUy5TVFJJS0UsIFRBR19JRC5TVFJJS0VdLFxuICAgIFtUQUdfTkFNRVMuU1RST05HLCBUQUdfSUQuU1RST05HXSxcbiAgICBbVEFHX05BTUVTLlNUWUxFLCBUQUdfSUQuU1RZTEVdLFxuICAgIFtUQUdfTkFNRVMuU1VCLCBUQUdfSUQuU1VCXSxcbiAgICBbVEFHX05BTUVTLlNVTU1BUlksIFRBR19JRC5TVU1NQVJZXSxcbiAgICBbVEFHX05BTUVTLlNVUCwgVEFHX0lELlNVUF0sXG4gICAgW1RBR19OQU1FUy5UQUJMRSwgVEFHX0lELlRBQkxFXSxcbiAgICBbVEFHX05BTUVTLlRCT0RZLCBUQUdfSUQuVEJPRFldLFxuICAgIFtUQUdfTkFNRVMuVEVNUExBVEUsIFRBR19JRC5URU1QTEFURV0sXG4gICAgW1RBR19OQU1FUy5URVhUQVJFQSwgVEFHX0lELlRFWFRBUkVBXSxcbiAgICBbVEFHX05BTUVTLlRGT09ULCBUQUdfSUQuVEZPT1RdLFxuICAgIFtUQUdfTkFNRVMuVEQsIFRBR19JRC5URF0sXG4gICAgW1RBR19OQU1FUy5USCwgVEFHX0lELlRIXSxcbiAgICBbVEFHX05BTUVTLlRIRUFELCBUQUdfSUQuVEhFQURdLFxuICAgIFtUQUdfTkFNRVMuVElUTEUsIFRBR19JRC5USVRMRV0sXG4gICAgW1RBR19OQU1FUy5UUiwgVEFHX0lELlRSXSxcbiAgICBbVEFHX05BTUVTLlRSQUNLLCBUQUdfSUQuVFJBQ0tdLFxuICAgIFtUQUdfTkFNRVMuVFQsIFRBR19JRC5UVF0sXG4gICAgW1RBR19OQU1FUy5VLCBUQUdfSUQuVV0sXG4gICAgW1RBR19OQU1FUy5VTCwgVEFHX0lELlVMXSxcbiAgICBbVEFHX05BTUVTLlNWRywgVEFHX0lELlNWR10sXG4gICAgW1RBR19OQU1FUy5WQVIsIFRBR19JRC5WQVJdLFxuICAgIFtUQUdfTkFNRVMuV0JSLCBUQUdfSUQuV0JSXSxcbiAgICBbVEFHX05BTUVTLlhNUCwgVEFHX0lELlhNUF0sXG5dKTtcbmZ1bmN0aW9uIGdldFRhZ0lEKHRhZ05hbWUpIHtcbiAgICB2YXIgX2E7XG4gICAgcmV0dXJuIChfYSA9IFRBR19OQU1FX1RPX0lELmdldCh0YWdOYW1lKSkgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDogVEFHX0lELlVOS05PV047XG59XG5leHBvcnRzLmdldFRhZ0lEID0gZ2V0VGFnSUQ7XG5jb25zdCAkID0gVEFHX0lEO1xuZXhwb3J0cy5TUEVDSUFMX0VMRU1FTlRTID0ge1xuICAgIFtOUy5IVE1MXTogbmV3IFNldChbXG4gICAgICAgICQuQUREUkVTUyxcbiAgICAgICAgJC5BUFBMRVQsXG4gICAgICAgICQuQVJFQSxcbiAgICAgICAgJC5BUlRJQ0xFLFxuICAgICAgICAkLkFTSURFLFxuICAgICAgICAkLkJBU0UsXG4gICAgICAgICQuQkFTRUZPTlQsXG4gICAgICAgICQuQkdTT1VORCxcbiAgICAgICAgJC5CTE9DS1FVT1RFLFxuICAgICAgICAkLkJPRFksXG4gICAgICAgICQuQlIsXG4gICAgICAgICQuQlVUVE9OLFxuICAgICAgICAkLkNBUFRJT04sXG4gICAgICAgICQuQ0VOVEVSLFxuICAgICAgICAkLkNPTCxcbiAgICAgICAgJC5DT0xHUk9VUCxcbiAgICAgICAgJC5ERCxcbiAgICAgICAgJC5ERVRBSUxTLFxuICAgICAgICAkLkRJUixcbiAgICAgICAgJC5ESVYsXG4gICAgICAgICQuREwsXG4gICAgICAgICQuRFQsXG4gICAgICAgICQuRU1CRUQsXG4gICAgICAgICQuRklFTERTRVQsXG4gICAgICAgICQuRklHQ0FQVElPTixcbiAgICAgICAgJC5GSUdVUkUsXG4gICAgICAgICQuRk9PVEVSLFxuICAgICAgICAkLkZPUk0sXG4gICAgICAgICQuRlJBTUUsXG4gICAgICAgICQuRlJBTUVTRVQsXG4gICAgICAgICQuSDEsXG4gICAgICAgICQuSDIsXG4gICAgICAgICQuSDMsXG4gICAgICAgICQuSDQsXG4gICAgICAgICQuSDUsXG4gICAgICAgICQuSDYsXG4gICAgICAgICQuSEVBRCxcbiAgICAgICAgJC5IRUFERVIsXG4gICAgICAgICQuSEdST1VQLFxuICAgICAgICAkLkhSLFxuICAgICAgICAkLkhUTUwsXG4gICAgICAgICQuSUZSQU1FLFxuICAgICAgICAkLklNRyxcbiAgICAgICAgJC5JTlBVVCxcbiAgICAgICAgJC5MSSxcbiAgICAgICAgJC5MSU5LLFxuICAgICAgICAkLkxJU1RJTkcsXG4gICAgICAgICQuTUFJTixcbiAgICAgICAgJC5NQVJRVUVFLFxuICAgICAgICAkLk1FTlUsXG4gICAgICAgICQuTUVUQSxcbiAgICAgICAgJC5OQVYsXG4gICAgICAgICQuTk9FTUJFRCxcbiAgICAgICAgJC5OT0ZSQU1FUyxcbiAgICAgICAgJC5OT1NDUklQVCxcbiAgICAgICAgJC5PQkpFQ1QsXG4gICAgICAgICQuT0wsXG4gICAgICAgICQuUCxcbiAgICAgICAgJC5QQVJBTSxcbiAgICAgICAgJC5QTEFJTlRFWFQsXG4gICAgICAgICQuUFJFLFxuICAgICAgICAkLlNDUklQVCxcbiAgICAgICAgJC5TRUNUSU9OLFxuICAgICAgICAkLlNFTEVDVCxcbiAgICAgICAgJC5TT1VSQ0UsXG4gICAgICAgICQuU1RZTEUsXG4gICAgICAgICQuU1VNTUFSWSxcbiAgICAgICAgJC5UQUJMRSxcbiAgICAgICAgJC5UQk9EWSxcbiAgICAgICAgJC5URCxcbiAgICAgICAgJC5URU1QTEFURSxcbiAgICAgICAgJC5URVhUQVJFQSxcbiAgICAgICAgJC5URk9PVCxcbiAgICAgICAgJC5USCxcbiAgICAgICAgJC5USEVBRCxcbiAgICAgICAgJC5USVRMRSxcbiAgICAgICAgJC5UUixcbiAgICAgICAgJC5UUkFDSyxcbiAgICAgICAgJC5VTCxcbiAgICAgICAgJC5XQlIsXG4gICAgICAgICQuWE1QLFxuICAgIF0pLFxuICAgIFtOUy5NQVRITUxdOiBuZXcgU2V0KFskLk1JLCAkLk1PLCAkLk1OLCAkLk1TLCAkLk1URVhULCAkLkFOTk9UQVRJT05fWE1MXSksXG4gICAgW05TLlNWR106IG5ldyBTZXQoWyQuVElUTEUsICQuRk9SRUlHTl9PQkpFQ1QsICQuREVTQ10pLFxuICAgIFtOUy5YTElOS106IG5ldyBTZXQoKSxcbiAgICBbTlMuWE1MXTogbmV3IFNldCgpLFxuICAgIFtOUy5YTUxOU106IG5ldyBTZXQoKSxcbn07XG5mdW5jdGlvbiBpc051bWJlcmVkSGVhZGVyKHRuKSB7XG4gICAgcmV0dXJuIHRuID09PSAkLkgxIHx8IHRuID09PSAkLkgyIHx8IHRuID09PSAkLkgzIHx8IHRuID09PSAkLkg0IHx8IHRuID09PSAkLkg1IHx8IHRuID09PSAkLkg2O1xufVxuZXhwb3J0cy5pc051bWJlcmVkSGVhZGVyID0gaXNOdW1iZXJlZEhlYWRlcjtcbmNvbnN0IFVORVNDQVBFRF9URVhUID0gbmV3IFNldChbXG4gICAgVEFHX05BTUVTLlNUWUxFLFxuICAgIFRBR19OQU1FUy5TQ1JJUFQsXG4gICAgVEFHX05BTUVTLlhNUCxcbiAgICBUQUdfTkFNRVMuSUZSQU1FLFxuICAgIFRBR19OQU1FUy5OT0VNQkVELFxuICAgIFRBR19OQU1FUy5OT0ZSQU1FUyxcbiAgICBUQUdfTkFNRVMuUExBSU5URVhULFxuXSk7XG5mdW5jdGlvbiBoYXNVbmVzY2FwZWRUZXh0KHRuLCBzY3JpcHRpbmdFbmFibGVkKSB7XG4gICAgcmV0dXJuIFVORVNDQVBFRF9URVhULmhhcyh0bikgfHwgKHNjcmlwdGluZ0VuYWJsZWQgJiYgdG4gPT09IFRBR19OQU1FUy5OT1NDUklQVCk7XG59XG5leHBvcnRzLmhhc1VuZXNjYXBlZFRleHQgPSBoYXNVbmVzY2FwZWRUZXh0O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aHRtbC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuZ2V0VG9rZW5BdHRyID0gZXhwb3J0cy5Ub2tlblR5cGUgPSB2b2lkIDA7XG52YXIgVG9rZW5UeXBlO1xuKGZ1bmN0aW9uIChUb2tlblR5cGUpIHtcbiAgICBUb2tlblR5cGVbVG9rZW5UeXBlW1wiQ0hBUkFDVEVSXCJdID0gMF0gPSBcIkNIQVJBQ1RFUlwiO1xuICAgIFRva2VuVHlwZVtUb2tlblR5cGVbXCJOVUxMX0NIQVJBQ1RFUlwiXSA9IDFdID0gXCJOVUxMX0NIQVJBQ1RFUlwiO1xuICAgIFRva2VuVHlwZVtUb2tlblR5cGVbXCJXSElURVNQQUNFX0NIQVJBQ1RFUlwiXSA9IDJdID0gXCJXSElURVNQQUNFX0NIQVJBQ1RFUlwiO1xuICAgIFRva2VuVHlwZVtUb2tlblR5cGVbXCJTVEFSVF9UQUdcIl0gPSAzXSA9IFwiU1RBUlRfVEFHXCI7XG4gICAgVG9rZW5UeXBlW1Rva2VuVHlwZVtcIkVORF9UQUdcIl0gPSA0XSA9IFwiRU5EX1RBR1wiO1xuICAgIFRva2VuVHlwZVtUb2tlblR5cGVbXCJDT01NRU5UXCJdID0gNV0gPSBcIkNPTU1FTlRcIjtcbiAgICBUb2tlblR5cGVbVG9rZW5UeXBlW1wiRE9DVFlQRVwiXSA9IDZdID0gXCJET0NUWVBFXCI7XG4gICAgVG9rZW5UeXBlW1Rva2VuVHlwZVtcIkVPRlwiXSA9IDddID0gXCJFT0ZcIjtcbiAgICBUb2tlblR5cGVbVG9rZW5UeXBlW1wiSElCRVJOQVRJT05cIl0gPSA4XSA9IFwiSElCRVJOQVRJT05cIjtcbn0pKFRva2VuVHlwZSA9IGV4cG9ydHMuVG9rZW5UeXBlIHx8IChleHBvcnRzLlRva2VuVHlwZSA9IHt9KSk7XG5mdW5jdGlvbiBnZXRUb2tlbkF0dHIodG9rZW4sIGF0dHJOYW1lKSB7XG4gICAgZm9yIChsZXQgaSA9IHRva2VuLmF0dHJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGlmICh0b2tlbi5hdHRyc1tpXS5uYW1lID09PSBhdHRyTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRva2VuLmF0dHJzW2ldLnZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuZXhwb3J0cy5nZXRUb2tlbkF0dHIgPSBnZXRUb2tlbkF0dHI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD10b2tlbi5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuaXNVbmRlZmluZWRDb2RlUG9pbnQgPSBleHBvcnRzLmlzQ29udHJvbENvZGVQb2ludCA9IGV4cG9ydHMuZ2V0U3Vycm9nYXRlUGFpckNvZGVQb2ludCA9IGV4cG9ydHMuaXNTdXJyb2dhdGVQYWlyID0gZXhwb3J0cy5pc1N1cnJvZ2F0ZSA9IGV4cG9ydHMuU0VRVUVOQ0VTID0gZXhwb3J0cy5DT0RFX1BPSU5UUyA9IGV4cG9ydHMuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSID0gdm9pZCAwO1xuY29uc3QgVU5ERUZJTkVEX0NPREVfUE9JTlRTID0gbmV3IFNldChbXG4gICAgNjU1MzQsIDY1NTM1LCAxMzEwNzAsIDEzMTA3MSwgMTk2NjA2LCAxOTY2MDcsIDI2MjE0MiwgMjYyMTQzLCAzMjc2NzgsIDMyNzY3OSwgMzkzMjE0LFxuICAgIDM5MzIxNSwgNDU4NzUwLCA0NTg3NTEsIDUyNDI4NiwgNTI0Mjg3LCA1ODk4MjIsIDU4OTgyMywgNjU1MzU4LCA2NTUzNTksIDcyMDg5NCxcbiAgICA3MjA4OTUsIDc4NjQzMCwgNzg2NDMxLCA4NTE5NjYsIDg1MTk2NywgOTE3NTAyLCA5MTc1MDMsIDk4MzAzOCwgOTgzMDM5LCAxMDQ4NTc0LFxuICAgIDEwNDg1NzUsIDExMTQxMTAsIDExMTQxMTEsXG5dKTtcbmV4cG9ydHMuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSID0gJ1xcdUZGRkQnO1xudmFyIENPREVfUE9JTlRTO1xuKGZ1bmN0aW9uIChDT0RFX1BPSU5UUykge1xuICAgIENPREVfUE9JTlRTW0NPREVfUE9JTlRTW1wiRU9GXCJdID0gLTFdID0gXCJFT0ZcIjtcbiAgICBDT0RFX1BPSU5UU1tDT0RFX1BPSU5UU1tcIk5VTExcIl0gPSAwXSA9IFwiTlVMTFwiO1xuICAgIENPREVfUE9JTlRTW0NPREVfUE9JTlRTW1wiVEFCVUxBVElPTlwiXSA9IDldID0gXCJUQUJVTEFUSU9OXCI7XG4gICAgQ09ERV9QT0lOVFNbQ09ERV9QT0lOVFNbXCJDQVJSSUFHRV9SRVRVUk5cIl0gPSAxM10gPSBcIkNBUlJJQUdFX1JFVFVSTlwiO1xuICAgIENPREVfUE9JTlRTW0NPREVfUE9JTlRTW1wiTElORV9GRUVEXCJdID0gMTBdID0gXCJMSU5FX0ZFRURcIjtcbiAgICBDT0RFX1BPSU5UU1tDT0RFX1BPSU5UU1tcIkZPUk1fRkVFRFwiXSA9IDEyXSA9IFwiRk9STV9GRUVEXCI7XG4gICAgQ09ERV9QT0lOVFNbQ09ERV9QT0lOVFNbXCJTUEFDRVwiXSA9IDMyXSA9IFwiU1BBQ0VcIjtcbiAgICBDT0RFX1BPSU5UU1tDT0RFX1BPSU5UU1tcIkVYQ0xBTUFUSU9OX01BUktcIl0gPSAzM10gPSBcIkVYQ0xBTUFUSU9OX01BUktcIjtcbiAgICBDT0RFX1BPSU5UU1tDT0RFX1BPSU5UU1tcIlFVT1RBVElPTl9NQVJLXCJdID0gMzRdID0gXCJRVU9UQVRJT05fTUFSS1wiO1xuICAgIENPREVfUE9JTlRTW0NPREVfUE9JTlRTW1wiTlVNQkVSX1NJR05cIl0gPSAzNV0gPSBcIk5VTUJFUl9TSUdOXCI7XG4gICAgQ09ERV9QT0lOVFNbQ09ERV9QT0lOVFNbXCJBTVBFUlNBTkRcIl0gPSAzOF0gPSBcIkFNUEVSU0FORFwiO1xuICAgIENPREVfUE9JTlRTW0NPREVfUE9JTlRTW1wiQVBPU1RST1BIRVwiXSA9IDM5XSA9IFwiQVBPU1RST1BIRVwiO1xuICAgIENPREVfUE9JTlRTW0NPREVfUE9JTlRTW1wiSFlQSEVOX01JTlVTXCJdID0gNDVdID0gXCJIWVBIRU5fTUlOVVNcIjtcbiAgICBDT0RFX1BPSU5UU1tDT0RFX1BPSU5UU1tcIlNPTElEVVNcIl0gPSA0N10gPSBcIlNPTElEVVNcIjtcbiAgICBDT0RFX1BPSU5UU1tDT0RFX1BPSU5UU1tcIkRJR0lUXzBcIl0gPSA0OF0gPSBcIkRJR0lUXzBcIjtcbiAgICBDT0RFX1BPSU5UU1tDT0RFX1BPSU5UU1tcIkRJR0lUXzlcIl0gPSA1N10gPSBcIkRJR0lUXzlcIjtcbiAgICBDT0RFX1BPSU5UU1tDT0RFX1BPSU5UU1tcIlNFTUlDT0xPTlwiXSA9IDU5XSA9IFwiU0VNSUNPTE9OXCI7XG4gICAgQ09ERV9QT0lOVFNbQ09ERV9QT0lOVFNbXCJMRVNTX1RIQU5fU0lHTlwiXSA9IDYwXSA9IFwiTEVTU19USEFOX1NJR05cIjtcbiAgICBDT0RFX1BPSU5UU1tDT0RFX1BPSU5UU1tcIkVRVUFMU19TSUdOXCJdID0gNjFdID0gXCJFUVVBTFNfU0lHTlwiO1xuICAgIENPREVfUE9JTlRTW0NPREVfUE9JTlRTW1wiR1JFQVRFUl9USEFOX1NJR05cIl0gPSA2Ml0gPSBcIkdSRUFURVJfVEhBTl9TSUdOXCI7XG4gICAgQ09ERV9QT0lOVFNbQ09ERV9QT0lOVFNbXCJRVUVTVElPTl9NQVJLXCJdID0gNjNdID0gXCJRVUVTVElPTl9NQVJLXCI7XG4gICAgQ09ERV9QT0lOVFNbQ09ERV9QT0lOVFNbXCJMQVRJTl9DQVBJVEFMX0FcIl0gPSA2NV0gPSBcIkxBVElOX0NBUElUQUxfQVwiO1xuICAgIENPREVfUE9JTlRTW0NPREVfUE9JTlRTW1wiTEFUSU5fQ0FQSVRBTF9GXCJdID0gNzBdID0gXCJMQVRJTl9DQVBJVEFMX0ZcIjtcbiAgICBDT0RFX1BPSU5UU1tDT0RFX1BPSU5UU1tcIkxBVElOX0NBUElUQUxfWFwiXSA9IDg4XSA9IFwiTEFUSU5fQ0FQSVRBTF9YXCI7XG4gICAgQ09ERV9QT0lOVFNbQ09ERV9QT0lOVFNbXCJMQVRJTl9DQVBJVEFMX1pcIl0gPSA5MF0gPSBcIkxBVElOX0NBUElUQUxfWlwiO1xuICAgIENPREVfUE9JTlRTW0NPREVfUE9JTlRTW1wiUklHSFRfU1FVQVJFX0JSQUNLRVRcIl0gPSA5M10gPSBcIlJJR0hUX1NRVUFSRV9CUkFDS0VUXCI7XG4gICAgQ09ERV9QT0lOVFNbQ09ERV9QT0lOVFNbXCJHUkFWRV9BQ0NFTlRcIl0gPSA5Nl0gPSBcIkdSQVZFX0FDQ0VOVFwiO1xuICAgIENPREVfUE9JTlRTW0NPREVfUE9JTlRTW1wiTEFUSU5fU01BTExfQVwiXSA9IDk3XSA9IFwiTEFUSU5fU01BTExfQVwiO1xuICAgIENPREVfUE9JTlRTW0NPREVfUE9JTlRTW1wiTEFUSU5fU01BTExfRlwiXSA9IDEwMl0gPSBcIkxBVElOX1NNQUxMX0ZcIjtcbiAgICBDT0RFX1BPSU5UU1tDT0RFX1BPSU5UU1tcIkxBVElOX1NNQUxMX1hcIl0gPSAxMjBdID0gXCJMQVRJTl9TTUFMTF9YXCI7XG4gICAgQ09ERV9QT0lOVFNbQ09ERV9QT0lOVFNbXCJMQVRJTl9TTUFMTF9aXCJdID0gMTIyXSA9IFwiTEFUSU5fU01BTExfWlwiO1xuICAgIENPREVfUE9JTlRTW0NPREVfUE9JTlRTW1wiUkVQTEFDRU1FTlRfQ0hBUkFDVEVSXCJdID0gNjU1MzNdID0gXCJSRVBMQUNFTUVOVF9DSEFSQUNURVJcIjtcbn0pKENPREVfUE9JTlRTID0gZXhwb3J0cy5DT0RFX1BPSU5UUyB8fCAoZXhwb3J0cy5DT0RFX1BPSU5UUyA9IHt9KSk7XG5leHBvcnRzLlNFUVVFTkNFUyA9IHtcbiAgICBEQVNIX0RBU0g6ICctLScsXG4gICAgQ0RBVEFfU1RBUlQ6ICdbQ0RBVEFbJyxcbiAgICBET0NUWVBFOiAnZG9jdHlwZScsXG4gICAgU0NSSVBUOiAnc2NyaXB0JyxcbiAgICBQVUJMSUM6ICdwdWJsaWMnLFxuICAgIFNZU1RFTTogJ3N5c3RlbScsXG59O1xuLy9TdXJyb2dhdGVzXG5mdW5jdGlvbiBpc1N1cnJvZ2F0ZShjcCkge1xuICAgIHJldHVybiBjcCA+PSA1NTI5NiAmJiBjcCA8PSA1NzM0Mztcbn1cbmV4cG9ydHMuaXNTdXJyb2dhdGUgPSBpc1N1cnJvZ2F0ZTtcbmZ1bmN0aW9uIGlzU3Vycm9nYXRlUGFpcihjcCkge1xuICAgIHJldHVybiBjcCA+PSA1NjMyMCAmJiBjcCA8PSA1NzM0Mztcbn1cbmV4cG9ydHMuaXNTdXJyb2dhdGVQYWlyID0gaXNTdXJyb2dhdGVQYWlyO1xuZnVuY3Rpb24gZ2V0U3Vycm9nYXRlUGFpckNvZGVQb2ludChjcDEsIGNwMikge1xuICAgIHJldHVybiAoY3AxIC0gNTUyOTYpICogMTAyNCArIDkyMTYgKyBjcDI7XG59XG5leHBvcnRzLmdldFN1cnJvZ2F0ZVBhaXJDb2RlUG9pbnQgPSBnZXRTdXJyb2dhdGVQYWlyQ29kZVBvaW50O1xuLy9OT1RFOiBleGNsdWRpbmcgTlVMTCBhbmQgQVNDSUkgd2hpdGVzcGFjZVxuZnVuY3Rpb24gaXNDb250cm9sQ29kZVBvaW50KGNwKSB7XG4gICAgcmV0dXJuICgoY3AgIT09IDB4MjAgJiYgY3AgIT09IDB4MGEgJiYgY3AgIT09IDB4MGQgJiYgY3AgIT09IDB4MDkgJiYgY3AgIT09IDB4MGMgJiYgY3AgPj0gMHgwMSAmJiBjcCA8PSAweDFmKSB8fFxuICAgICAgICAoY3AgPj0gMHg3ZiAmJiBjcCA8PSAweDlmKSk7XG59XG5leHBvcnRzLmlzQ29udHJvbENvZGVQb2ludCA9IGlzQ29udHJvbENvZGVQb2ludDtcbmZ1bmN0aW9uIGlzVW5kZWZpbmVkQ29kZVBvaW50KGNwKSB7XG4gICAgcmV0dXJuIChjcCA+PSA2NDk3NiAmJiBjcCA8PSA2NTAwNykgfHwgVU5ERUZJTkVEX0NPREVfUE9JTlRTLmhhcyhjcCk7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkQ29kZVBvaW50ID0gaXNVbmRlZmluZWRDb2RlUG9pbnQ7XG4vLyMgc291cmNlTWFwcGluZ1VSTD11bmljb2RlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5wYXJzZUZyYWdtZW50ID0gZXhwb3J0cy5wYXJzZSA9IGV4cG9ydHMuVG9rZW5pemVyTW9kZSA9IGV4cG9ydHMuVG9rZW5pemVyID0gZXhwb3J0cy5Ub2tlbiA9IGV4cG9ydHMuaHRtbCA9IGV4cG9ydHMuZm9yZWlnbkNvbnRlbnQgPSBleHBvcnRzLnNlcmlhbGl6ZU91dGVyID0gZXhwb3J0cy5zZXJpYWxpemUgPSBleHBvcnRzLlBhcnNlciA9IGV4cG9ydHMuZGVmYXVsdFRyZWVBZGFwdGVyID0gdm9pZCAwO1xuY29uc3QgaW5kZXhfanNfMSA9IHJlcXVpcmUoXCIuL3BhcnNlci9pbmRleC5qc1wiKTtcbnZhciBkZWZhdWx0X2pzXzEgPSByZXF1aXJlKFwiLi90cmVlLWFkYXB0ZXJzL2RlZmF1bHQuanNcIik7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJkZWZhdWx0VHJlZUFkYXB0ZXJcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGRlZmF1bHRfanNfMS5kZWZhdWx0VHJlZUFkYXB0ZXI7IH0gfSk7XG52YXIgaW5kZXhfanNfMiA9IHJlcXVpcmUoXCIuL3BhcnNlci9pbmRleC5qc1wiKTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIlBhcnNlclwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gaW5kZXhfanNfMi5QYXJzZXI7IH0gfSk7XG52YXIgaW5kZXhfanNfMyA9IHJlcXVpcmUoXCIuL3NlcmlhbGl6ZXIvaW5kZXguanNcIik7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJzZXJpYWxpemVcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGluZGV4X2pzXzMuc2VyaWFsaXplOyB9IH0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwic2VyaWFsaXplT3V0ZXJcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGluZGV4X2pzXzMuc2VyaWFsaXplT3V0ZXI7IH0gfSk7XG4vKiogQGludGVybmFsICovXG5leHBvcnRzLmZvcmVpZ25Db250ZW50ID0gcmVxdWlyZShcIi4vY29tbW9uL2ZvcmVpZ24tY29udGVudC5qc1wiKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydHMuaHRtbCA9IHJlcXVpcmUoXCIuL2NvbW1vbi9odG1sLmpzXCIpO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0cy5Ub2tlbiA9IHJlcXVpcmUoXCIuL2NvbW1vbi90b2tlbi5qc1wiKTtcbi8qKiBAaW50ZXJuYWwgKi9cbnZhciBpbmRleF9qc180ID0gcmVxdWlyZShcIi4vdG9rZW5pemVyL2luZGV4LmpzXCIpO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiVG9rZW5pemVyXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBpbmRleF9qc180LlRva2VuaXplcjsgfSB9KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIlRva2VuaXplck1vZGVcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGluZGV4X2pzXzQuVG9rZW5pemVyTW9kZTsgfSB9KTtcbi8vIFNob3J0aGFuZHNcbi8qKlxuICogUGFyc2VzIGFuIEhUTUwgc3RyaW5nLlxuICpcbiAqIEBwYXJhbSBodG1sIElucHV0IEhUTUwgc3RyaW5nLlxuICogQHBhcmFtIG9wdGlvbnMgUGFyc2luZyBvcHRpb25zLlxuICogQHJldHVybnMgRG9jdW1lbnRcbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBwYXJzZTUgPSByZXF1aXJlKCdwYXJzZTUnKTtcbiAqXG4gKiBjb25zdCBkb2N1bWVudCA9IHBhcnNlNS5wYXJzZSgnPCFET0NUWVBFIGh0bWw+PGh0bWw+PGhlYWQ+PC9oZWFkPjxib2R5PkhpIHRoZXJlITwvYm9keT48L2h0bWw+Jyk7XG4gKlxuICogY29uc29sZS5sb2coZG9jdW1lbnQuY2hpbGROb2Rlc1sxXS50YWdOYW1lKTsgLy8+ICdodG1sJ1xuICpgYGBcbiAqL1xuZnVuY3Rpb24gcGFyc2UoaHRtbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbmRleF9qc18xLlBhcnNlci5wYXJzZShodG1sLCBvcHRpb25zKTtcbn1cbmV4cG9ydHMucGFyc2UgPSBwYXJzZTtcbmZ1bmN0aW9uIHBhcnNlRnJhZ21lbnQoZnJhZ21lbnRDb250ZXh0LCBodG1sLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBmcmFnbWVudENvbnRleHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIG9wdGlvbnMgPSBodG1sO1xuICAgICAgICBodG1sID0gZnJhZ21lbnRDb250ZXh0O1xuICAgICAgICBmcmFnbWVudENvbnRleHQgPSBudWxsO1xuICAgIH1cbiAgICBjb25zdCBwYXJzZXIgPSBpbmRleF9qc18xLlBhcnNlci5nZXRGcmFnbWVudFBhcnNlcihmcmFnbWVudENvbnRleHQsIG9wdGlvbnMpO1xuICAgIHBhcnNlci50b2tlbml6ZXIud3JpdGUoaHRtbCwgdHJ1ZSk7XG4gICAgcmV0dXJuIHBhcnNlci5nZXRGcmFnbWVudCgpO1xufVxuZXhwb3J0cy5wYXJzZUZyYWdtZW50ID0gcGFyc2VGcmFnbWVudDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5Gb3JtYXR0aW5nRWxlbWVudExpc3QgPSBleHBvcnRzLkVudHJ5VHlwZSA9IHZvaWQgMDtcbi8vQ29uc3RcbmNvbnN0IE5PQUhfQVJLX0NBUEFDSVRZID0gMztcbnZhciBFbnRyeVR5cGU7XG4oZnVuY3Rpb24gKEVudHJ5VHlwZSkge1xuICAgIEVudHJ5VHlwZVtFbnRyeVR5cGVbXCJNYXJrZXJcIl0gPSAwXSA9IFwiTWFya2VyXCI7XG4gICAgRW50cnlUeXBlW0VudHJ5VHlwZVtcIkVsZW1lbnRcIl0gPSAxXSA9IFwiRWxlbWVudFwiO1xufSkoRW50cnlUeXBlID0gZXhwb3J0cy5FbnRyeVR5cGUgfHwgKGV4cG9ydHMuRW50cnlUeXBlID0ge30pKTtcbmNvbnN0IE1BUktFUiA9IHsgdHlwZTogRW50cnlUeXBlLk1hcmtlciB9O1xuLy9MaXN0IG9mIGZvcm1hdHRpbmcgZWxlbWVudHNcbmNsYXNzIEZvcm1hdHRpbmdFbGVtZW50TGlzdCB7XG4gICAgY29uc3RydWN0b3IodHJlZUFkYXB0ZXIpIHtcbiAgICAgICAgdGhpcy50cmVlQWRhcHRlciA9IHRyZWVBZGFwdGVyO1xuICAgICAgICB0aGlzLmVudHJpZXMgPSBbXTtcbiAgICAgICAgdGhpcy5ib29rbWFyayA9IG51bGw7XG4gICAgfVxuICAgIC8vTm9haCBBcmsncyBjb25kaXRpb25cbiAgICAvL09QVElNSVpBVElPTjogYXQgZmlyc3Qgd2UgdHJ5IHRvIGZpbmQgcG9zc2libGUgY2FuZGlkYXRlcyBmb3IgZXhjbHVzaW9uIHVzaW5nXG4gICAgLy9saWdodHdlaWdodCBoZXVyaXN0aWNzIHdpdGhvdXQgdGhvcm91Z2ggYXR0cmlidXRlcyBjaGVjay5cbiAgICBfZ2V0Tm9haEFya0NvbmRpdGlvbkNhbmRpZGF0ZXMobmV3RWxlbWVudCwgbmVBdHRycykge1xuICAgICAgICBjb25zdCBjYW5kaWRhdGVzID0gW107XG4gICAgICAgIGNvbnN0IG5lQXR0cnNMZW5ndGggPSBuZUF0dHJzLmxlbmd0aDtcbiAgICAgICAgY29uc3QgbmVUYWdOYW1lID0gdGhpcy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKG5ld0VsZW1lbnQpO1xuICAgICAgICBjb25zdCBuZU5hbWVzcGFjZVVSSSA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKG5ld0VsZW1lbnQpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZW50cmllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgZW50cnkgPSB0aGlzLmVudHJpZXNbaV07XG4gICAgICAgICAgICBpZiAoZW50cnkudHlwZSA9PT0gRW50cnlUeXBlLk1hcmtlcikge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgeyBlbGVtZW50IH0gPSBlbnRyeTtcbiAgICAgICAgICAgIGlmICh0aGlzLnRyZWVBZGFwdGVyLmdldFRhZ05hbWUoZWxlbWVudCkgPT09IG5lVGFnTmFtZSAmJlxuICAgICAgICAgICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKGVsZW1lbnQpID09PSBuZU5hbWVzcGFjZVVSSSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnRBdHRycyA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0QXR0ckxpc3QoZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnRBdHRycy5sZW5ndGggPT09IG5lQXR0cnNMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlcy5wdXNoKHsgaWR4OiBpLCBhdHRyczogZWxlbWVudEF0dHJzIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FuZGlkYXRlcztcbiAgICB9XG4gICAgX2Vuc3VyZU5vYWhBcmtDb25kaXRpb24obmV3RWxlbWVudCkge1xuICAgICAgICBpZiAodGhpcy5lbnRyaWVzLmxlbmd0aCA8IE5PQUhfQVJLX0NBUEFDSVRZKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBuZUF0dHJzID0gdGhpcy50cmVlQWRhcHRlci5nZXRBdHRyTGlzdChuZXdFbGVtZW50KTtcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlcyA9IHRoaXMuX2dldE5vYWhBcmtDb25kaXRpb25DYW5kaWRhdGVzKG5ld0VsZW1lbnQsIG5lQXR0cnMpO1xuICAgICAgICBpZiAoY2FuZGlkYXRlcy5sZW5ndGggPCBOT0FIX0FSS19DQVBBQ0lUWSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy9OT1RFOiBidWlsZCBhdHRycyBtYXAgZm9yIHRoZSBuZXcgZWxlbWVudCwgc28gd2UgY2FuIHBlcmZvcm0gZmFzdCBsb29rdXBzXG4gICAgICAgIGNvbnN0IG5lQXR0cnNNYXAgPSBuZXcgTWFwKG5lQXR0cnMubWFwKChuZUF0dHIpID0+IFtuZUF0dHIubmFtZSwgbmVBdHRyLnZhbHVlXSkpO1xuICAgICAgICBsZXQgdmFsaWRDYW5kaWRhdGVzID0gMDtcbiAgICAgICAgLy9OT1RFOiByZW1vdmUgYm90dG9tbW9zdCBjYW5kaWRhdGVzLCB1bnRpbCBOb2FoJ3MgQXJrIGNvbmRpdGlvbiB3aWxsIG5vdCBiZSBtZXRcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjYW5kaWRhdGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBjYW5kaWRhdGUgPSBjYW5kaWRhdGVzW2ldO1xuICAgICAgICAgICAgLy8gV2Uga25vdyB0aGF0IGBjYW5kaWRhdGUuYXR0cnMubGVuZ3RoID09PSBuZUF0dHJzLmxlbmd0aGBcbiAgICAgICAgICAgIGlmIChjYW5kaWRhdGUuYXR0cnMuZXZlcnkoKGNBdHRyKSA9PiBuZUF0dHJzTWFwLmdldChjQXR0ci5uYW1lKSA9PT0gY0F0dHIudmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsaWRDYW5kaWRhdGVzICs9IDE7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkQ2FuZGlkYXRlcyA+PSBOT0FIX0FSS19DQVBBQ0lUWSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVudHJpZXMuc3BsaWNlKGNhbmRpZGF0ZS5pZHgsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvL011dGF0aW9uc1xuICAgIGluc2VydE1hcmtlcigpIHtcbiAgICAgICAgdGhpcy5lbnRyaWVzLnVuc2hpZnQoTUFSS0VSKTtcbiAgICB9XG4gICAgcHVzaEVsZW1lbnQoZWxlbWVudCwgdG9rZW4pIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlTm9haEFya0NvbmRpdGlvbihlbGVtZW50KTtcbiAgICAgICAgdGhpcy5lbnRyaWVzLnVuc2hpZnQoe1xuICAgICAgICAgICAgdHlwZTogRW50cnlUeXBlLkVsZW1lbnQsXG4gICAgICAgICAgICBlbGVtZW50LFxuICAgICAgICAgICAgdG9rZW4sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpbnNlcnRFbGVtZW50QWZ0ZXJCb29rbWFyayhlbGVtZW50LCB0b2tlbikge1xuICAgICAgICBjb25zdCBib29rbWFya0lkeCA9IHRoaXMuZW50cmllcy5pbmRleE9mKHRoaXMuYm9va21hcmspO1xuICAgICAgICB0aGlzLmVudHJpZXMuc3BsaWNlKGJvb2ttYXJrSWR4LCAwLCB7XG4gICAgICAgICAgICB0eXBlOiBFbnRyeVR5cGUuRWxlbWVudCxcbiAgICAgICAgICAgIGVsZW1lbnQsXG4gICAgICAgICAgICB0b2tlbixcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJlbW92ZUVudHJ5KGVudHJ5KSB7XG4gICAgICAgIGNvbnN0IGVudHJ5SW5kZXggPSB0aGlzLmVudHJpZXMuaW5kZXhPZihlbnRyeSk7XG4gICAgICAgIGlmIChlbnRyeUluZGV4ID49IDApIHtcbiAgICAgICAgICAgIHRoaXMuZW50cmllcy5zcGxpY2UoZW50cnlJbmRleCwgMSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBsaXN0IG9mIGZvcm1hdHRpbmcgZWxlbWVudHMgdXAgdG8gdGhlIGxhc3QgbWFya2VyLlxuICAgICAqXG4gICAgICogQHNlZSBodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS9wYXJzaW5nLmh0bWwjY2xlYXItdGhlLWxpc3Qtb2YtYWN0aXZlLWZvcm1hdHRpbmctZWxlbWVudHMtdXAtdG8tdGhlLWxhc3QtbWFya2VyXG4gICAgICovXG4gICAgY2xlYXJUb0xhc3RNYXJrZXIoKSB7XG4gICAgICAgIGNvbnN0IG1hcmtlcklkeCA9IHRoaXMuZW50cmllcy5pbmRleE9mKE1BUktFUik7XG4gICAgICAgIGlmIChtYXJrZXJJZHggPj0gMCkge1xuICAgICAgICAgICAgdGhpcy5lbnRyaWVzLnNwbGljZSgwLCBtYXJrZXJJZHggKyAxKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZW50cmllcy5sZW5ndGggPSAwO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vU2VhcmNoXG4gICAgZ2V0RWxlbWVudEVudHJ5SW5TY29wZVdpdGhUYWdOYW1lKHRhZ05hbWUpIHtcbiAgICAgICAgY29uc3QgZW50cnkgPSB0aGlzLmVudHJpZXMuZmluZCgoZW50cnkpID0+IGVudHJ5LnR5cGUgPT09IEVudHJ5VHlwZS5NYXJrZXIgfHwgdGhpcy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKGVudHJ5LmVsZW1lbnQpID09PSB0YWdOYW1lKTtcbiAgICAgICAgcmV0dXJuIGVudHJ5ICYmIGVudHJ5LnR5cGUgPT09IEVudHJ5VHlwZS5FbGVtZW50ID8gZW50cnkgOiBudWxsO1xuICAgIH1cbiAgICBnZXRFbGVtZW50RW50cnkoZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gdGhpcy5lbnRyaWVzLmZpbmQoKGVudHJ5KSA9PiBlbnRyeS50eXBlID09PSBFbnRyeVR5cGUuRWxlbWVudCAmJiBlbnRyeS5lbGVtZW50ID09PSBlbGVtZW50KTtcbiAgICB9XG59XG5leHBvcnRzLkZvcm1hdHRpbmdFbGVtZW50TGlzdCA9IEZvcm1hdHRpbmdFbGVtZW50TGlzdDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWZvcm1hdHRpbmctZWxlbWVudC1saXN0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5QYXJzZXIgPSB2b2lkIDA7XG5jb25zdCBpbmRleF9qc18xID0gcmVxdWlyZShcIi4uL3Rva2VuaXplci9pbmRleC5qc1wiKTtcbmNvbnN0IG9wZW5fZWxlbWVudF9zdGFja19qc18xID0gcmVxdWlyZShcIi4vb3Blbi1lbGVtZW50LXN0YWNrLmpzXCIpO1xuY29uc3QgZm9ybWF0dGluZ19lbGVtZW50X2xpc3RfanNfMSA9IHJlcXVpcmUoXCIuL2Zvcm1hdHRpbmctZWxlbWVudC1saXN0LmpzXCIpO1xuY29uc3QgZGVmYXVsdF9qc18xID0gcmVxdWlyZShcIi4uL3RyZWUtYWRhcHRlcnMvZGVmYXVsdC5qc1wiKTtcbmNvbnN0IGRvY3R5cGUgPSByZXF1aXJlKFwiLi4vY29tbW9uL2RvY3R5cGUuanNcIik7XG5jb25zdCBmb3JlaWduQ29udGVudCA9IHJlcXVpcmUoXCIuLi9jb21tb24vZm9yZWlnbi1jb250ZW50LmpzXCIpO1xuY29uc3QgZXJyb3JfY29kZXNfanNfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vZXJyb3ItY29kZXMuanNcIik7XG5jb25zdCB1bmljb2RlID0gcmVxdWlyZShcIi4uL2NvbW1vbi91bmljb2RlLmpzXCIpO1xuY29uc3QgaHRtbF9qc18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi9odG1sLmpzXCIpO1xuY29uc3QgdG9rZW5fanNfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vdG9rZW4uanNcIik7XG4vL01pc2MgY29uc3RhbnRzXG5jb25zdCBISURERU5fSU5QVVRfVFlQRSA9ICdoaWRkZW4nO1xuLy9BZG9wdGlvbiBhZ2VuY3kgbG9vcHMgaXRlcmF0aW9uIGNvdW50XG5jb25zdCBBQV9PVVRFUl9MT09QX0lURVIgPSA4O1xuY29uc3QgQUFfSU5ORVJfTE9PUF9JVEVSID0gMztcbi8vSW5zZXJ0aW9uIG1vZGVzXG52YXIgSW5zZXJ0aW9uTW9kZTtcbihmdW5jdGlvbiAoSW5zZXJ0aW9uTW9kZSkge1xuICAgIEluc2VydGlvbk1vZGVbSW5zZXJ0aW9uTW9kZVtcIklOSVRJQUxcIl0gPSAwXSA9IFwiSU5JVElBTFwiO1xuICAgIEluc2VydGlvbk1vZGVbSW5zZXJ0aW9uTW9kZVtcIkJFRk9SRV9IVE1MXCJdID0gMV0gPSBcIkJFRk9SRV9IVE1MXCI7XG4gICAgSW5zZXJ0aW9uTW9kZVtJbnNlcnRpb25Nb2RlW1wiQkVGT1JFX0hFQURcIl0gPSAyXSA9IFwiQkVGT1JFX0hFQURcIjtcbiAgICBJbnNlcnRpb25Nb2RlW0luc2VydGlvbk1vZGVbXCJJTl9IRUFEXCJdID0gM10gPSBcIklOX0hFQURcIjtcbiAgICBJbnNlcnRpb25Nb2RlW0luc2VydGlvbk1vZGVbXCJJTl9IRUFEX05PX1NDUklQVFwiXSA9IDRdID0gXCJJTl9IRUFEX05PX1NDUklQVFwiO1xuICAgIEluc2VydGlvbk1vZGVbSW5zZXJ0aW9uTW9kZVtcIkFGVEVSX0hFQURcIl0gPSA1XSA9IFwiQUZURVJfSEVBRFwiO1xuICAgIEluc2VydGlvbk1vZGVbSW5zZXJ0aW9uTW9kZVtcIklOX0JPRFlcIl0gPSA2XSA9IFwiSU5fQk9EWVwiO1xuICAgIEluc2VydGlvbk1vZGVbSW5zZXJ0aW9uTW9kZVtcIlRFWFRcIl0gPSA3XSA9IFwiVEVYVFwiO1xuICAgIEluc2VydGlvbk1vZGVbSW5zZXJ0aW9uTW9kZVtcIklOX1RBQkxFXCJdID0gOF0gPSBcIklOX1RBQkxFXCI7XG4gICAgSW5zZXJ0aW9uTW9kZVtJbnNlcnRpb25Nb2RlW1wiSU5fVEFCTEVfVEVYVFwiXSA9IDldID0gXCJJTl9UQUJMRV9URVhUXCI7XG4gICAgSW5zZXJ0aW9uTW9kZVtJbnNlcnRpb25Nb2RlW1wiSU5fQ0FQVElPTlwiXSA9IDEwXSA9IFwiSU5fQ0FQVElPTlwiO1xuICAgIEluc2VydGlvbk1vZGVbSW5zZXJ0aW9uTW9kZVtcIklOX0NPTFVNTl9HUk9VUFwiXSA9IDExXSA9IFwiSU5fQ09MVU1OX0dST1VQXCI7XG4gICAgSW5zZXJ0aW9uTW9kZVtJbnNlcnRpb25Nb2RlW1wiSU5fVEFCTEVfQk9EWVwiXSA9IDEyXSA9IFwiSU5fVEFCTEVfQk9EWVwiO1xuICAgIEluc2VydGlvbk1vZGVbSW5zZXJ0aW9uTW9kZVtcIklOX1JPV1wiXSA9IDEzXSA9IFwiSU5fUk9XXCI7XG4gICAgSW5zZXJ0aW9uTW9kZVtJbnNlcnRpb25Nb2RlW1wiSU5fQ0VMTFwiXSA9IDE0XSA9IFwiSU5fQ0VMTFwiO1xuICAgIEluc2VydGlvbk1vZGVbSW5zZXJ0aW9uTW9kZVtcIklOX1NFTEVDVFwiXSA9IDE1XSA9IFwiSU5fU0VMRUNUXCI7XG4gICAgSW5zZXJ0aW9uTW9kZVtJbnNlcnRpb25Nb2RlW1wiSU5fU0VMRUNUX0lOX1RBQkxFXCJdID0gMTZdID0gXCJJTl9TRUxFQ1RfSU5fVEFCTEVcIjtcbiAgICBJbnNlcnRpb25Nb2RlW0luc2VydGlvbk1vZGVbXCJJTl9URU1QTEFURVwiXSA9IDE3XSA9IFwiSU5fVEVNUExBVEVcIjtcbiAgICBJbnNlcnRpb25Nb2RlW0luc2VydGlvbk1vZGVbXCJBRlRFUl9CT0RZXCJdID0gMThdID0gXCJBRlRFUl9CT0RZXCI7XG4gICAgSW5zZXJ0aW9uTW9kZVtJbnNlcnRpb25Nb2RlW1wiSU5fRlJBTUVTRVRcIl0gPSAxOV0gPSBcIklOX0ZSQU1FU0VUXCI7XG4gICAgSW5zZXJ0aW9uTW9kZVtJbnNlcnRpb25Nb2RlW1wiQUZURVJfRlJBTUVTRVRcIl0gPSAyMF0gPSBcIkFGVEVSX0ZSQU1FU0VUXCI7XG4gICAgSW5zZXJ0aW9uTW9kZVtJbnNlcnRpb25Nb2RlW1wiQUZURVJfQUZURVJfQk9EWVwiXSA9IDIxXSA9IFwiQUZURVJfQUZURVJfQk9EWVwiO1xuICAgIEluc2VydGlvbk1vZGVbSW5zZXJ0aW9uTW9kZVtcIkFGVEVSX0FGVEVSX0ZSQU1FU0VUXCJdID0gMjJdID0gXCJBRlRFUl9BRlRFUl9GUkFNRVNFVFwiO1xufSkoSW5zZXJ0aW9uTW9kZSB8fCAoSW5zZXJ0aW9uTW9kZSA9IHt9KSk7XG5jb25zdCBCQVNFX0xPQyA9IHtcbiAgICBzdGFydExpbmU6IC0xLFxuICAgIHN0YXJ0Q29sOiAtMSxcbiAgICBzdGFydE9mZnNldDogLTEsXG4gICAgZW5kTGluZTogLTEsXG4gICAgZW5kQ29sOiAtMSxcbiAgICBlbmRPZmZzZXQ6IC0xLFxufTtcbmNvbnN0IFRBQkxFX1NUUlVDVFVSRV9UQUdTID0gbmV3IFNldChbaHRtbF9qc18xLlRBR19JRC5UQUJMRSwgaHRtbF9qc18xLlRBR19JRC5UQk9EWSwgaHRtbF9qc18xLlRBR19JRC5URk9PVCwgaHRtbF9qc18xLlRBR19JRC5USEVBRCwgaHRtbF9qc18xLlRBR19JRC5UUl0pO1xuY29uc3QgZGVmYXVsdFBhcnNlck9wdGlvbnMgPSB7XG4gICAgc2NyaXB0aW5nRW5hYmxlZDogdHJ1ZSxcbiAgICBzb3VyY2VDb2RlTG9jYXRpb25JbmZvOiBmYWxzZSxcbiAgICB0cmVlQWRhcHRlcjogZGVmYXVsdF9qc18xLmRlZmF1bHRUcmVlQWRhcHRlcixcbiAgICBvblBhcnNlRXJyb3I6IG51bGwsXG59O1xuLy9QYXJzZXJcbmNsYXNzIFBhcnNlciB7XG4gICAgY29uc3RydWN0b3Iob3B0aW9ucywgZG9jdW1lbnQsIGZyYWdtZW50Q29udGV4dCA9IG51bGwsIHNjcmlwdEhhbmRsZXIgPSBudWxsKSB7XG4gICAgICAgIHRoaXMuZnJhZ21lbnRDb250ZXh0ID0gZnJhZ21lbnRDb250ZXh0O1xuICAgICAgICB0aGlzLnNjcmlwdEhhbmRsZXIgPSBzY3JpcHRIYW5kbGVyO1xuICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbiA9IG51bGw7XG4gICAgICAgIHRoaXMuc3RvcHBlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOSVRJQUw7XG4gICAgICAgIHRoaXMub3JpZ2luYWxJbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTklUSUFMO1xuICAgICAgICB0aGlzLmhlYWRFbGVtZW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy5mb3JtRWxlbWVudCA9IG51bGw7XG4gICAgICAgIC8qKiBJbmRpY2F0ZXMgdGhhdCB0aGUgY3VycmVudCBub2RlIGlzIG5vdCBhbiBlbGVtZW50IGluIHRoZSBIVE1MIG5hbWVzcGFjZSAqL1xuICAgICAgICB0aGlzLmN1cnJlbnROb3RJbkhUTUwgPSBmYWxzZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSB0ZW1wbGF0ZSBpbnNlcnRpb24gbW9kZSBzdGFjayBpcyBtYWludGFpbmVkIGZyb20gdGhlIGxlZnQuXG4gICAgICAgICAqIEllLiB0aGUgdG9wbW9zdCBlbGVtZW50IHdpbGwgYWx3YXlzIGhhdmUgaW5kZXggMC5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudG1wbEluc2VydGlvbk1vZGVTdGFjayA9IFtdO1xuICAgICAgICB0aGlzLnBlbmRpbmdDaGFyYWN0ZXJUb2tlbnMgPSBbXTtcbiAgICAgICAgdGhpcy5oYXNOb25XaGl0ZXNwYWNlUGVuZGluZ0NoYXJhY3RlclRva2VuID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZnJhbWVzZXRPayA9IHRydWU7XG4gICAgICAgIHRoaXMuc2tpcE5leHROZXdMaW5lID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZm9zdGVyUGFyZW50aW5nRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRQYXJzZXJPcHRpb25zKSwgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMudHJlZUFkYXB0ZXIgPSB0aGlzLm9wdGlvbnMudHJlZUFkYXB0ZXI7XG4gICAgICAgIHRoaXMub25QYXJzZUVycm9yID0gdGhpcy5vcHRpb25zLm9uUGFyc2VFcnJvcjtcbiAgICAgICAgLy8gQWx3YXlzIGVuYWJsZSBsb2NhdGlvbiBpbmZvIGlmIHdlIHJlcG9ydCBwYXJzZSBlcnJvcnMuXG4gICAgICAgIGlmICh0aGlzLm9uUGFyc2VFcnJvcikge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLnNvdXJjZUNvZGVMb2NhdGlvbkluZm8gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZG9jdW1lbnQgPSBkb2N1bWVudCAhPT0gbnVsbCAmJiBkb2N1bWVudCAhPT0gdm9pZCAwID8gZG9jdW1lbnQgOiB0aGlzLnRyZWVBZGFwdGVyLmNyZWF0ZURvY3VtZW50KCk7XG4gICAgICAgIHRoaXMudG9rZW5pemVyID0gbmV3IGluZGV4X2pzXzEuVG9rZW5pemVyKHRoaXMub3B0aW9ucywgdGhpcyk7XG4gICAgICAgIHRoaXMuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzID0gbmV3IGZvcm1hdHRpbmdfZWxlbWVudF9saXN0X2pzXzEuRm9ybWF0dGluZ0VsZW1lbnRMaXN0KHRoaXMudHJlZUFkYXB0ZXIpO1xuICAgICAgICB0aGlzLmZyYWdtZW50Q29udGV4dElEID0gZnJhZ21lbnRDb250ZXh0ID8gKDAsIGh0bWxfanNfMS5nZXRUYWdJRCkodGhpcy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKGZyYWdtZW50Q29udGV4dCkpIDogaHRtbF9qc18xLlRBR19JRC5VTktOT1dOO1xuICAgICAgICB0aGlzLl9zZXRDb250ZXh0TW9kZXMoZnJhZ21lbnRDb250ZXh0ICE9PSBudWxsICYmIGZyYWdtZW50Q29udGV4dCAhPT0gdm9pZCAwID8gZnJhZ21lbnRDb250ZXh0IDogdGhpcy5kb2N1bWVudCwgdGhpcy5mcmFnbWVudENvbnRleHRJRCk7XG4gICAgICAgIHRoaXMub3BlbkVsZW1lbnRzID0gbmV3IG9wZW5fZWxlbWVudF9zdGFja19qc18xLk9wZW5FbGVtZW50U3RhY2sodGhpcy5kb2N1bWVudCwgdGhpcy50cmVlQWRhcHRlciwgdGhpcyk7XG4gICAgfVxuICAgIC8vIEFQSVxuICAgIHN0YXRpYyBwYXJzZShodG1sLCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IHBhcnNlciA9IG5ldyB0aGlzKG9wdGlvbnMpO1xuICAgICAgICBwYXJzZXIudG9rZW5pemVyLndyaXRlKGh0bWwsIHRydWUpO1xuICAgICAgICByZXR1cm4gcGFyc2VyLmRvY3VtZW50O1xuICAgIH1cbiAgICBzdGF0aWMgZ2V0RnJhZ21lbnRQYXJzZXIoZnJhZ21lbnRDb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRQYXJzZXJPcHRpb25zKSwgb3B0aW9ucyk7XG4gICAgICAgIC8vTk9URTogdXNlIGEgPHRlbXBsYXRlPiBlbGVtZW50IGFzIHRoZSBmcmFnbWVudCBjb250ZXh0IGlmIG5vIGNvbnRleHQgZWxlbWVudCB3YXMgcHJvdmlkZWQsXG4gICAgICAgIC8vc28gd2Ugd2lsbCBwYXJzZSBpbiBhIFwiZm9yZ2l2aW5nXCIgbWFubmVyXG4gICAgICAgIGZyYWdtZW50Q29udGV4dCAhPT0gbnVsbCAmJiBmcmFnbWVudENvbnRleHQgIT09IHZvaWQgMCA/IGZyYWdtZW50Q29udGV4dCA6IChmcmFnbWVudENvbnRleHQgPSBvcHRzLnRyZWVBZGFwdGVyLmNyZWF0ZUVsZW1lbnQoaHRtbF9qc18xLlRBR19OQU1FUy5URU1QTEFURSwgaHRtbF9qc18xLk5TLkhUTUwsIFtdKSk7XG4gICAgICAgIC8vTk9URTogY3JlYXRlIGEgZmFrZSBlbGVtZW50IHdoaWNoIHdpbGwgYmUgdXNlZCBhcyB0aGUgYGRvY3VtZW50YCBmb3IgZnJhZ21lbnQgcGFyc2luZy5cbiAgICAgICAgLy9UaGlzIGlzIGltcG9ydGFudCBmb3IganNkb20sIHdoZXJlIGEgbmV3IGBkb2N1bWVudGAgY2Fubm90IGJlIGNyZWF0ZWQuIFRoaXMgbGVkIHRvXG4gICAgICAgIC8vZnJhZ21lbnQgcGFyc2luZyBtZXNzaW5nIHdpdGggdGhlIG1haW4gYGRvY3VtZW50YC5cbiAgICAgICAgY29uc3QgZG9jdW1lbnRNb2NrID0gb3B0cy50cmVlQWRhcHRlci5jcmVhdGVFbGVtZW50KCdkb2N1bWVudG1vY2snLCBodG1sX2pzXzEuTlMuSFRNTCwgW10pO1xuICAgICAgICBjb25zdCBwYXJzZXIgPSBuZXcgdGhpcyhvcHRzLCBkb2N1bWVudE1vY2ssIGZyYWdtZW50Q29udGV4dCk7XG4gICAgICAgIGlmIChwYXJzZXIuZnJhZ21lbnRDb250ZXh0SUQgPT09IGh0bWxfanNfMS5UQUdfSUQuVEVNUExBVEUpIHtcbiAgICAgICAgICAgIHBhcnNlci50bXBsSW5zZXJ0aW9uTW9kZVN0YWNrLnVuc2hpZnQoSW5zZXJ0aW9uTW9kZS5JTl9URU1QTEFURSk7XG4gICAgICAgIH1cbiAgICAgICAgcGFyc2VyLl9pbml0VG9rZW5pemVyRm9yRnJhZ21lbnRQYXJzaW5nKCk7XG4gICAgICAgIHBhcnNlci5faW5zZXJ0RmFrZVJvb3RFbGVtZW50KCk7XG4gICAgICAgIHBhcnNlci5fcmVzZXRJbnNlcnRpb25Nb2RlKCk7XG4gICAgICAgIHBhcnNlci5fZmluZEZvcm1JbkZyYWdtZW50Q29udGV4dCgpO1xuICAgICAgICByZXR1cm4gcGFyc2VyO1xuICAgIH1cbiAgICBnZXRGcmFnbWVudCgpIHtcbiAgICAgICAgY29uc3Qgcm9vdEVsZW1lbnQgPSB0aGlzLnRyZWVBZGFwdGVyLmdldEZpcnN0Q2hpbGQodGhpcy5kb2N1bWVudCk7XG4gICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGhpcy50cmVlQWRhcHRlci5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIHRoaXMuX2Fkb3B0Tm9kZXMocm9vdEVsZW1lbnQsIGZyYWdtZW50KTtcbiAgICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgIH1cbiAgICAvL0Vycm9yc1xuICAgIF9lcnIodG9rZW4sIGNvZGUsIGJlZm9yZVRva2VuKSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgaWYgKCF0aGlzLm9uUGFyc2VFcnJvcilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgbG9jID0gKF9hID0gdG9rZW4ubG9jYXRpb24pICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IEJBU0VfTE9DO1xuICAgICAgICBjb25zdCBlcnIgPSB7XG4gICAgICAgICAgICBjb2RlLFxuICAgICAgICAgICAgc3RhcnRMaW5lOiBsb2Muc3RhcnRMaW5lLFxuICAgICAgICAgICAgc3RhcnRDb2w6IGxvYy5zdGFydENvbCxcbiAgICAgICAgICAgIHN0YXJ0T2Zmc2V0OiBsb2Muc3RhcnRPZmZzZXQsXG4gICAgICAgICAgICBlbmRMaW5lOiBiZWZvcmVUb2tlbiA/IGxvYy5zdGFydExpbmUgOiBsb2MuZW5kTGluZSxcbiAgICAgICAgICAgIGVuZENvbDogYmVmb3JlVG9rZW4gPyBsb2Muc3RhcnRDb2wgOiBsb2MuZW5kQ29sLFxuICAgICAgICAgICAgZW5kT2Zmc2V0OiBiZWZvcmVUb2tlbiA/IGxvYy5zdGFydE9mZnNldCA6IGxvYy5lbmRPZmZzZXQsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMub25QYXJzZUVycm9yKGVycik7XG4gICAgfVxuICAgIC8vU3RhY2sgZXZlbnRzXG4gICAgb25JdGVtUHVzaChub2RlLCB0aWQsIGlzVG9wKSB7XG4gICAgICAgIHZhciBfYSwgX2I7XG4gICAgICAgIChfYiA9IChfYSA9IHRoaXMudHJlZUFkYXB0ZXIpLm9uSXRlbVB1c2gpID09PSBudWxsIHx8IF9iID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYi5jYWxsKF9hLCBub2RlKTtcbiAgICAgICAgaWYgKGlzVG9wICYmIHRoaXMub3BlbkVsZW1lbnRzLnN0YWNrVG9wID4gMClcbiAgICAgICAgICAgIHRoaXMuX3NldENvbnRleHRNb2Rlcyhub2RlLCB0aWQpO1xuICAgIH1cbiAgICBvbkl0ZW1Qb3Aobm9kZSwgaXNUb3ApIHtcbiAgICAgICAgdmFyIF9hLCBfYjtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zb3VyY2VDb2RlTG9jYXRpb25JbmZvKSB7XG4gICAgICAgICAgICB0aGlzLl9zZXRFbmRMb2NhdGlvbihub2RlLCB0aGlzLmN1cnJlbnRUb2tlbik7XG4gICAgICAgIH1cbiAgICAgICAgKF9iID0gKF9hID0gdGhpcy50cmVlQWRhcHRlcikub25JdGVtUG9wKSA9PT0gbnVsbCB8fCBfYiA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2IuY2FsbChfYSwgbm9kZSwgdGhpcy5vcGVuRWxlbWVudHMuY3VycmVudCk7XG4gICAgICAgIGlmIChpc1RvcCkge1xuICAgICAgICAgICAgbGV0IGN1cnJlbnQ7XG4gICAgICAgICAgICBsZXQgY3VycmVudFRhZ0lkO1xuICAgICAgICAgICAgaWYgKHRoaXMub3BlbkVsZW1lbnRzLnN0YWNrVG9wID09PSAwICYmIHRoaXMuZnJhZ21lbnRDb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgY3VycmVudCA9IHRoaXMuZnJhZ21lbnRDb250ZXh0O1xuICAgICAgICAgICAgICAgIGN1cnJlbnRUYWdJZCA9IHRoaXMuZnJhZ21lbnRDb250ZXh0SUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAoeyBjdXJyZW50LCBjdXJyZW50VGFnSWQgfSA9IHRoaXMub3BlbkVsZW1lbnRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX3NldENvbnRleHRNb2RlcyhjdXJyZW50LCBjdXJyZW50VGFnSWQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9zZXRDb250ZXh0TW9kZXMoY3VycmVudCwgdGlkKSB7XG4gICAgICAgIGNvbnN0IGlzSFRNTCA9IGN1cnJlbnQgPT09IHRoaXMuZG9jdW1lbnQgfHwgdGhpcy50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkoY3VycmVudCkgPT09IGh0bWxfanNfMS5OUy5IVE1MO1xuICAgICAgICB0aGlzLmN1cnJlbnROb3RJbkhUTUwgPSAhaXNIVE1MO1xuICAgICAgICB0aGlzLnRva2VuaXplci5pbkZvcmVpZ25Ob2RlID0gIWlzSFRNTCAmJiAhdGhpcy5faXNJbnRlZ3JhdGlvblBvaW50KHRpZCwgY3VycmVudCk7XG4gICAgfVxuICAgIF9zd2l0Y2hUb1RleHRQYXJzaW5nKGN1cnJlbnRUb2tlbiwgbmV4dFRva2VuaXplclN0YXRlKSB7XG4gICAgICAgIHRoaXMuX2luc2VydEVsZW1lbnQoY3VycmVudFRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgICAgIHRoaXMudG9rZW5pemVyLnN0YXRlID0gbmV4dFRva2VuaXplclN0YXRlO1xuICAgICAgICB0aGlzLm9yaWdpbmFsSW5zZXJ0aW9uTW9kZSA9IHRoaXMuaW5zZXJ0aW9uTW9kZTtcbiAgICAgICAgdGhpcy5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5URVhUO1xuICAgIH1cbiAgICBzd2l0Y2hUb1BsYWludGV4dFBhcnNpbmcoKSB7XG4gICAgICAgIHRoaXMuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuVEVYVDtcbiAgICAgICAgdGhpcy5vcmlnaW5hbEluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX0JPRFk7XG4gICAgICAgIHRoaXMudG9rZW5pemVyLnN0YXRlID0gaW5kZXhfanNfMS5Ub2tlbml6ZXJNb2RlLlBMQUlOVEVYVDtcbiAgICB9XG4gICAgLy9GcmFnbWVudCBwYXJzaW5nXG4gICAgX2dldEFkanVzdGVkQ3VycmVudEVsZW1lbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wZW5FbGVtZW50cy5zdGFja1RvcCA9PT0gMCAmJiB0aGlzLmZyYWdtZW50Q29udGV4dFxuICAgICAgICAgICAgPyB0aGlzLmZyYWdtZW50Q29udGV4dFxuICAgICAgICAgICAgOiB0aGlzLm9wZW5FbGVtZW50cy5jdXJyZW50O1xuICAgIH1cbiAgICBfZmluZEZvcm1JbkZyYWdtZW50Q29udGV4dCgpIHtcbiAgICAgICAgbGV0IG5vZGUgPSB0aGlzLmZyYWdtZW50Q29udGV4dDtcbiAgICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRyZWVBZGFwdGVyLmdldFRhZ05hbWUobm9kZSkgPT09IGh0bWxfanNfMS5UQUdfTkFNRVMuRk9STSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZm9ybUVsZW1lbnQgPSBub2RlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbm9kZSA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0UGFyZW50Tm9kZShub2RlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfaW5pdFRva2VuaXplckZvckZyYWdtZW50UGFyc2luZygpIHtcbiAgICAgICAgaWYgKCF0aGlzLmZyYWdtZW50Q29udGV4dCB8fCB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSSh0aGlzLmZyYWdtZW50Q29udGV4dCkgIT09IGh0bWxfanNfMS5OUy5IVE1MKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoICh0aGlzLmZyYWdtZW50Q29udGV4dElEKSB7XG4gICAgICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVElUTEU6XG4gICAgICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEVYVEFSRUE6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnRva2VuaXplci5zdGF0ZSA9IGluZGV4X2pzXzEuVG9rZW5pemVyTW9kZS5SQ0RBVEE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuU1RZTEU6XG4gICAgICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuWE1QOlxuICAgICAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELklGUkFNRTpcbiAgICAgICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5OT0VNQkVEOlxuICAgICAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELk5PRlJBTUVTOlxuICAgICAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELk5PU0NSSVBUOiB7XG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbml6ZXIuc3RhdGUgPSBpbmRleF9qc18xLlRva2VuaXplck1vZGUuUkFXVEVYVDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5TQ1JJUFQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnRva2VuaXplci5zdGF0ZSA9IGluZGV4X2pzXzEuVG9rZW5pemVyTW9kZS5TQ1JJUFRfREFUQTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5QTEFJTlRFWFQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnRva2VuaXplci5zdGF0ZSA9IGluZGV4X2pzXzEuVG9rZW5pemVyTW9kZS5QTEFJTlRFWFQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gRG8gbm90aGluZ1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vVHJlZSBtdXRhdGlvblxuICAgIF9zZXREb2N1bWVudFR5cGUodG9rZW4pIHtcbiAgICAgICAgY29uc3QgbmFtZSA9IHRva2VuLm5hbWUgfHwgJyc7XG4gICAgICAgIGNvbnN0IHB1YmxpY0lkID0gdG9rZW4ucHVibGljSWQgfHwgJyc7XG4gICAgICAgIGNvbnN0IHN5c3RlbUlkID0gdG9rZW4uc3lzdGVtSWQgfHwgJyc7XG4gICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuc2V0RG9jdW1lbnRUeXBlKHRoaXMuZG9jdW1lbnQsIG5hbWUsIHB1YmxpY0lkLCBzeXN0ZW1JZCk7XG4gICAgICAgIGlmICh0b2tlbi5sb2NhdGlvbikge1xuICAgICAgICAgICAgY29uc3QgZG9jdW1lbnRDaGlsZHJlbiA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0Q2hpbGROb2Rlcyh0aGlzLmRvY3VtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGRvY1R5cGVOb2RlID0gZG9jdW1lbnRDaGlsZHJlbi5maW5kKChub2RlKSA9PiB0aGlzLnRyZWVBZGFwdGVyLmlzRG9jdW1lbnRUeXBlTm9kZShub2RlKSk7XG4gICAgICAgICAgICBpZiAoZG9jVHlwZU5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRyZWVBZGFwdGVyLnNldE5vZGVTb3VyY2VDb2RlTG9jYXRpb24oZG9jVHlwZU5vZGUsIHRva2VuLmxvY2F0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBfYXR0YWNoRWxlbWVudFRvVHJlZShlbGVtZW50LCBsb2NhdGlvbikge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNvdXJjZUNvZGVMb2NhdGlvbkluZm8pIHtcbiAgICAgICAgICAgIGNvbnN0IGxvYyA9IGxvY2F0aW9uICYmIE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgbG9jYXRpb24pLCB7IHN0YXJ0VGFnOiBsb2NhdGlvbiB9KTtcbiAgICAgICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuc2V0Tm9kZVNvdXJjZUNvZGVMb2NhdGlvbihlbGVtZW50LCBsb2MpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9zaG91bGRGb3N0ZXJQYXJlbnRPbkluc2VydGlvbigpKSB7XG4gICAgICAgICAgICB0aGlzLl9mb3N0ZXJQYXJlbnRFbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy5vcGVuRWxlbWVudHMuY3VycmVudFRtcGxDb250ZW50T3JOb2RlO1xuICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5hcHBlbmRDaGlsZChwYXJlbnQsIGVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9hcHBlbmRFbGVtZW50KHRva2VuLCBuYW1lc3BhY2VVUkkpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMudHJlZUFkYXB0ZXIuY3JlYXRlRWxlbWVudCh0b2tlbi50YWdOYW1lLCBuYW1lc3BhY2VVUkksIHRva2VuLmF0dHJzKTtcbiAgICAgICAgdGhpcy5fYXR0YWNoRWxlbWVudFRvVHJlZShlbGVtZW50LCB0b2tlbi5sb2NhdGlvbik7XG4gICAgfVxuICAgIF9pbnNlcnRFbGVtZW50KHRva2VuLCBuYW1lc3BhY2VVUkkpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMudHJlZUFkYXB0ZXIuY3JlYXRlRWxlbWVudCh0b2tlbi50YWdOYW1lLCBuYW1lc3BhY2VVUkksIHRva2VuLmF0dHJzKTtcbiAgICAgICAgdGhpcy5fYXR0YWNoRWxlbWVudFRvVHJlZShlbGVtZW50LCB0b2tlbi5sb2NhdGlvbik7XG4gICAgICAgIHRoaXMub3BlbkVsZW1lbnRzLnB1c2goZWxlbWVudCwgdG9rZW4udGFnSUQpO1xuICAgIH1cbiAgICBfaW5zZXJ0RmFrZUVsZW1lbnQodGFnTmFtZSwgdGFnSUQpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMudHJlZUFkYXB0ZXIuY3JlYXRlRWxlbWVudCh0YWdOYW1lLCBodG1sX2pzXzEuTlMuSFRNTCwgW10pO1xuICAgICAgICB0aGlzLl9hdHRhY2hFbGVtZW50VG9UcmVlKGVsZW1lbnQsIG51bGwpO1xuICAgICAgICB0aGlzLm9wZW5FbGVtZW50cy5wdXNoKGVsZW1lbnQsIHRhZ0lEKTtcbiAgICB9XG4gICAgX2luc2VydFRlbXBsYXRlKHRva2VuKSB7XG4gICAgICAgIGNvbnN0IHRtcGwgPSB0aGlzLnRyZWVBZGFwdGVyLmNyZWF0ZUVsZW1lbnQodG9rZW4udGFnTmFtZSwgaHRtbF9qc18xLk5TLkhUTUwsIHRva2VuLmF0dHJzKTtcbiAgICAgICAgY29uc3QgY29udGVudCA9IHRoaXMudHJlZUFkYXB0ZXIuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICB0aGlzLnRyZWVBZGFwdGVyLnNldFRlbXBsYXRlQ29udGVudCh0bXBsLCBjb250ZW50KTtcbiAgICAgICAgdGhpcy5fYXR0YWNoRWxlbWVudFRvVHJlZSh0bXBsLCB0b2tlbi5sb2NhdGlvbik7XG4gICAgICAgIHRoaXMub3BlbkVsZW1lbnRzLnB1c2godG1wbCwgdG9rZW4udGFnSUQpO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNvdXJjZUNvZGVMb2NhdGlvbkluZm8pXG4gICAgICAgICAgICB0aGlzLnRyZWVBZGFwdGVyLnNldE5vZGVTb3VyY2VDb2RlTG9jYXRpb24oY29udGVudCwgbnVsbCk7XG4gICAgfVxuICAgIF9pbnNlcnRGYWtlUm9vdEVsZW1lbnQoKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLnRyZWVBZGFwdGVyLmNyZWF0ZUVsZW1lbnQoaHRtbF9qc18xLlRBR19OQU1FUy5IVE1MLCBodG1sX2pzXzEuTlMuSFRNTCwgW10pO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNvdXJjZUNvZGVMb2NhdGlvbkluZm8pXG4gICAgICAgICAgICB0aGlzLnRyZWVBZGFwdGVyLnNldE5vZGVTb3VyY2VDb2RlTG9jYXRpb24oZWxlbWVudCwgbnVsbCk7XG4gICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuYXBwZW5kQ2hpbGQodGhpcy5vcGVuRWxlbWVudHMuY3VycmVudCwgZWxlbWVudCk7XG4gICAgICAgIHRoaXMub3BlbkVsZW1lbnRzLnB1c2goZWxlbWVudCwgaHRtbF9qc18xLlRBR19JRC5IVE1MKTtcbiAgICB9XG4gICAgX2FwcGVuZENvbW1lbnROb2RlKHRva2VuLCBwYXJlbnQpIHtcbiAgICAgICAgY29uc3QgY29tbWVudE5vZGUgPSB0aGlzLnRyZWVBZGFwdGVyLmNyZWF0ZUNvbW1lbnROb2RlKHRva2VuLmRhdGEpO1xuICAgICAgICB0aGlzLnRyZWVBZGFwdGVyLmFwcGVuZENoaWxkKHBhcmVudCwgY29tbWVudE5vZGUpO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNvdXJjZUNvZGVMb2NhdGlvbkluZm8pIHtcbiAgICAgICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuc2V0Tm9kZVNvdXJjZUNvZGVMb2NhdGlvbihjb21tZW50Tm9kZSwgdG9rZW4ubG9jYXRpb24pO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9pbnNlcnRDaGFyYWN0ZXJzKHRva2VuKSB7XG4gICAgICAgIGxldCBwYXJlbnQ7XG4gICAgICAgIGxldCBiZWZvcmVFbGVtZW50O1xuICAgICAgICBpZiAodGhpcy5fc2hvdWxkRm9zdGVyUGFyZW50T25JbnNlcnRpb24oKSkge1xuICAgICAgICAgICAgKHsgcGFyZW50LCBiZWZvcmVFbGVtZW50IH0gPSB0aGlzLl9maW5kRm9zdGVyUGFyZW50aW5nTG9jYXRpb24oKSk7XG4gICAgICAgICAgICBpZiAoYmVmb3JlRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuaW5zZXJ0VGV4dEJlZm9yZShwYXJlbnQsIHRva2VuLmNoYXJzLCBiZWZvcmVFbGVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuaW5zZXJ0VGV4dChwYXJlbnQsIHRva2VuLmNoYXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBhcmVudCA9IHRoaXMub3BlbkVsZW1lbnRzLmN1cnJlbnRUbXBsQ29udGVudE9yTm9kZTtcbiAgICAgICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuaW5zZXJ0VGV4dChwYXJlbnQsIHRva2VuLmNoYXJzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRva2VuLmxvY2F0aW9uKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBzaWJsaW5ncyA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0Q2hpbGROb2RlcyhwYXJlbnQpO1xuICAgICAgICBjb25zdCB0ZXh0Tm9kZUlkeCA9IGJlZm9yZUVsZW1lbnQgPyBzaWJsaW5ncy5sYXN0SW5kZXhPZihiZWZvcmVFbGVtZW50KSA6IHNpYmxpbmdzLmxlbmd0aDtcbiAgICAgICAgY29uc3QgdGV4dE5vZGUgPSBzaWJsaW5nc1t0ZXh0Tm9kZUlkeCAtIDFdO1xuICAgICAgICAvL05PVEU6IGlmIHdlIGhhdmUgYSBsb2NhdGlvbiBhc3NpZ25lZCBieSBhbm90aGVyIHRva2VuLCB0aGVuIGp1c3QgdXBkYXRlIHRoZSBlbmQgcG9zaXRpb25cbiAgICAgICAgY29uc3QgdG5Mb2MgPSB0aGlzLnRyZWVBZGFwdGVyLmdldE5vZGVTb3VyY2VDb2RlTG9jYXRpb24odGV4dE5vZGUpO1xuICAgICAgICBpZiAodG5Mb2MpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgZW5kTGluZSwgZW5kQ29sLCBlbmRPZmZzZXQgfSA9IHRva2VuLmxvY2F0aW9uO1xuICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci51cGRhdGVOb2RlU291cmNlQ29kZUxvY2F0aW9uKHRleHROb2RlLCB7IGVuZExpbmUsIGVuZENvbCwgZW5kT2Zmc2V0IH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zb3VyY2VDb2RlTG9jYXRpb25JbmZvKSB7XG4gICAgICAgICAgICB0aGlzLnRyZWVBZGFwdGVyLnNldE5vZGVTb3VyY2VDb2RlTG9jYXRpb24odGV4dE5vZGUsIHRva2VuLmxvY2F0aW9uKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfYWRvcHROb2Rlcyhkb25vciwgcmVjaXBpZW50KSB7XG4gICAgICAgIGZvciAobGV0IGNoaWxkID0gdGhpcy50cmVlQWRhcHRlci5nZXRGaXJzdENoaWxkKGRvbm9yKTsgY2hpbGQ7IGNoaWxkID0gdGhpcy50cmVlQWRhcHRlci5nZXRGaXJzdENoaWxkKGRvbm9yKSkge1xuICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5kZXRhY2hOb2RlKGNoaWxkKTtcbiAgICAgICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuYXBwZW5kQ2hpbGQocmVjaXBpZW50LCBjaGlsZCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX3NldEVuZExvY2F0aW9uKGVsZW1lbnQsIGNsb3NpbmdUb2tlbikge1xuICAgICAgICBpZiAodGhpcy50cmVlQWRhcHRlci5nZXROb2RlU291cmNlQ29kZUxvY2F0aW9uKGVsZW1lbnQpICYmIGNsb3NpbmdUb2tlbi5sb2NhdGlvbikge1xuICAgICAgICAgICAgY29uc3QgY3RMb2MgPSBjbG9zaW5nVG9rZW4ubG9jYXRpb247XG4gICAgICAgICAgICBjb25zdCB0biA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZShlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGVuZExvYyA9IFxuICAgICAgICAgICAgLy8gTk9URTogRm9yIGNhc2VzIGxpa2UgPHA+IDxwPiA8L3A+IC0gRmlyc3QgJ3AnIGNsb3NlcyB3aXRob3V0IGEgY2xvc2luZ1xuICAgICAgICAgICAgLy8gdGFnIGFuZCBmb3IgY2FzZXMgbGlrZSA8dGQ+IDxwPiA8L3RkPiAtICdwJyBjbG9zZXMgd2l0aG91dCBhIGNsb3NpbmcgdGFnLlxuICAgICAgICAgICAgY2xvc2luZ1Rva2VuLnR5cGUgPT09IHRva2VuX2pzXzEuVG9rZW5UeXBlLkVORF9UQUcgJiYgdG4gPT09IGNsb3NpbmdUb2tlbi50YWdOYW1lXG4gICAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgICAgIGVuZFRhZzogT2JqZWN0LmFzc2lnbih7fSwgY3RMb2MpLFxuICAgICAgICAgICAgICAgICAgICBlbmRMaW5lOiBjdExvYy5lbmRMaW5lLFxuICAgICAgICAgICAgICAgICAgICBlbmRDb2w6IGN0TG9jLmVuZENvbCxcbiAgICAgICAgICAgICAgICAgICAgZW5kT2Zmc2V0OiBjdExvYy5lbmRPZmZzZXQsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgICAgICBlbmRMaW5lOiBjdExvYy5zdGFydExpbmUsXG4gICAgICAgICAgICAgICAgICAgIGVuZENvbDogY3RMb2Muc3RhcnRDb2wsXG4gICAgICAgICAgICAgICAgICAgIGVuZE9mZnNldDogY3RMb2Muc3RhcnRPZmZzZXQsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMudHJlZUFkYXB0ZXIudXBkYXRlTm9kZVNvdXJjZUNvZGVMb2NhdGlvbihlbGVtZW50LCBlbmRMb2MpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vVG9rZW4gcHJvY2Vzc2luZ1xuICAgIHNob3VsZFByb2Nlc3NTdGFydFRhZ1Rva2VuSW5Gb3JlaWduQ29udGVudCh0b2tlbikge1xuICAgICAgICAvLyBDaGVjayB0aGF0IG5laXRoZXIgY3VycmVudCA9PT0gZG9jdW1lbnQsIG9yIG5zID09PSBOUy5IVE1MXG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50Tm90SW5IVE1MKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICBsZXQgY3VycmVudDtcbiAgICAgICAgbGV0IGN1cnJlbnRUYWdJZDtcbiAgICAgICAgaWYgKHRoaXMub3BlbkVsZW1lbnRzLnN0YWNrVG9wID09PSAwICYmIHRoaXMuZnJhZ21lbnRDb250ZXh0KSB7XG4gICAgICAgICAgICBjdXJyZW50ID0gdGhpcy5mcmFnbWVudENvbnRleHQ7XG4gICAgICAgICAgICBjdXJyZW50VGFnSWQgPSB0aGlzLmZyYWdtZW50Q29udGV4dElEO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgKHsgY3VycmVudCwgY3VycmVudFRhZ0lkIH0gPSB0aGlzLm9wZW5FbGVtZW50cyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRva2VuLnRhZ0lEID09PSBodG1sX2pzXzEuVEFHX0lELlNWRyAmJlxuICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKGN1cnJlbnQpID09PSBodG1sX2pzXzEuVEFHX05BTUVTLkFOTk9UQVRJT05fWE1MICYmXG4gICAgICAgICAgICB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSShjdXJyZW50KSA9PT0gaHRtbF9qc18xLk5TLk1BVEhNTCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgIC8vIENoZWNrIHRoYXQgYGN1cnJlbnRgIGlzIG5vdCBhbiBpbnRlZ3JhdGlvbiBwb2ludCBmb3IgSFRNTCBvciBNYXRoTUwgZWxlbWVudHMuXG4gICAgICAgIHRoaXMudG9rZW5pemVyLmluRm9yZWlnbk5vZGUgfHxcbiAgICAgICAgICAgIC8vIElmIGl0IF9pc18gYW4gaW50ZWdyYXRpb24gcG9pbnQsIHRoZW4gd2UgbWlnaHQgaGF2ZSB0byBjaGVjayB0aGF0IGl0IGlzIG5vdCBhbiBIVE1MXG4gICAgICAgICAgICAvLyBpbnRlZ3JhdGlvbiBwb2ludC5cbiAgICAgICAgICAgICgodG9rZW4udGFnSUQgPT09IGh0bWxfanNfMS5UQUdfSUQuTUdMWVBIIHx8IHRva2VuLnRhZ0lEID09PSBodG1sX2pzXzEuVEFHX0lELk1BTElHTk1BUkspICYmXG4gICAgICAgICAgICAgICAgIXRoaXMuX2lzSW50ZWdyYXRpb25Qb2ludChjdXJyZW50VGFnSWQsIGN1cnJlbnQsIGh0bWxfanNfMS5OUy5IVE1MKSkpO1xuICAgIH1cbiAgICBfcHJvY2Vzc1Rva2VuKHRva2VuKSB7XG4gICAgICAgIHN3aXRjaCAodG9rZW4udHlwZSkge1xuICAgICAgICAgICAgY2FzZSB0b2tlbl9qc18xLlRva2VuVHlwZS5DSEFSQUNURVI6IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ2hhcmFjdGVyKHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdG9rZW5fanNfMS5Ub2tlblR5cGUuTlVMTF9DSEFSQUNURVI6IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uTnVsbENoYXJhY3Rlcih0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHRva2VuX2pzXzEuVG9rZW5UeXBlLkNPTU1FTlQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ29tbWVudCh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHRva2VuX2pzXzEuVG9rZW5UeXBlLkRPQ1RZUEU6IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uRG9jdHlwZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHRva2VuX2pzXzEuVG9rZW5UeXBlLlNUQVJUX1RBRzoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Byb2Nlc3NTdGFydFRhZyh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHRva2VuX2pzXzEuVG9rZW5UeXBlLkVORF9UQUc6IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uRW5kVGFnKHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdG9rZW5fanNfMS5Ub2tlblR5cGUuRU9GOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbkVvZih0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHRva2VuX2pzXzEuVG9rZW5UeXBlLldISVRFU1BBQ0VfQ0hBUkFDVEVSOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbldoaXRlc3BhY2VDaGFyYWN0ZXIodG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vSW50ZWdyYXRpb24gcG9pbnRzXG4gICAgX2lzSW50ZWdyYXRpb25Qb2ludCh0aWQsIGVsZW1lbnQsIGZvcmVpZ25OUykge1xuICAgICAgICBjb25zdCBucyA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKGVsZW1lbnQpO1xuICAgICAgICBjb25zdCBhdHRycyA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0QXR0ckxpc3QoZWxlbWVudCk7XG4gICAgICAgIHJldHVybiBmb3JlaWduQ29udGVudC5pc0ludGVncmF0aW9uUG9pbnQodGlkLCBucywgYXR0cnMsIGZvcmVpZ25OUyk7XG4gICAgfVxuICAgIC8vQWN0aXZlIGZvcm1hdHRpbmcgZWxlbWVudHMgcmVjb25zdHJ1Y3Rpb25cbiAgICBfcmVjb25zdHJ1Y3RBY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMoKSB7XG4gICAgICAgIGNvbnN0IGxpc3RMZW5ndGggPSB0aGlzLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5lbnRyaWVzLmxlbmd0aDtcbiAgICAgICAgaWYgKGxpc3RMZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGVuZEluZGV4ID0gdGhpcy5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuZW50cmllcy5maW5kSW5kZXgoKGVudHJ5KSA9PiBlbnRyeS50eXBlID09PSBmb3JtYXR0aW5nX2VsZW1lbnRfbGlzdF9qc18xLkVudHJ5VHlwZS5NYXJrZXIgfHwgdGhpcy5vcGVuRWxlbWVudHMuY29udGFpbnMoZW50cnkuZWxlbWVudCkpO1xuICAgICAgICAgICAgY29uc3QgdW5vcGVuSWR4ID0gZW5kSW5kZXggPCAwID8gbGlzdExlbmd0aCAtIDEgOiBlbmRJbmRleCAtIDE7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gdW5vcGVuSWR4OyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuZW50cmllc1tpXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9pbnNlcnRFbGVtZW50KGVudHJ5LnRva2VuLCB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSShlbnRyeS5lbGVtZW50KSk7XG4gICAgICAgICAgICAgICAgZW50cnkuZWxlbWVudCA9IHRoaXMub3BlbkVsZW1lbnRzLmN1cnJlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy9DbG9zZSBlbGVtZW50c1xuICAgIF9jbG9zZVRhYmxlQ2VsbCgpIHtcbiAgICAgICAgdGhpcy5vcGVuRWxlbWVudHMuZ2VuZXJhdGVJbXBsaWVkRW5kVGFncygpO1xuICAgICAgICB0aGlzLm9wZW5FbGVtZW50cy5wb3BVbnRpbFRhYmxlQ2VsbFBvcHBlZCgpO1xuICAgICAgICB0aGlzLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5jbGVhclRvTGFzdE1hcmtlcigpO1xuICAgICAgICB0aGlzLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX1JPVztcbiAgICB9XG4gICAgX2Nsb3NlUEVsZW1lbnQoKSB7XG4gICAgICAgIHRoaXMub3BlbkVsZW1lbnRzLmdlbmVyYXRlSW1wbGllZEVuZFRhZ3NXaXRoRXhjbHVzaW9uKGh0bWxfanNfMS5UQUdfSUQuUCk7XG4gICAgICAgIHRoaXMub3BlbkVsZW1lbnRzLnBvcFVudGlsVGFnTmFtZVBvcHBlZChodG1sX2pzXzEuVEFHX0lELlApO1xuICAgIH1cbiAgICAvL0luc2VydGlvbiBtb2Rlc1xuICAgIF9yZXNldEluc2VydGlvbk1vZGUoKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLm9wZW5FbGVtZW50cy5zdGFja1RvcDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIC8vSW5zZXJ0aW9uIG1vZGUgcmVzZXQgbWFwXG4gICAgICAgICAgICBzd2l0Y2ggKGkgPT09IDAgJiYgdGhpcy5mcmFnbWVudENvbnRleHQgPyB0aGlzLmZyYWdtZW50Q29udGV4dElEIDogdGhpcy5vcGVuRWxlbWVudHMudGFnSURzW2ldKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRSOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX1JPVztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UQk9EWTpcbiAgICAgICAgICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEhFQUQ6XG4gICAgICAgICAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRGT09UOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX1RBQkxFX0JPRFk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ0FQVElPTjpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9DQVBUSU9OO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNPTEdST1VQOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX0NPTFVNTl9HUk9VUDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UQUJMRTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5CT0RZOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX0JPRFk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRlJBTUVTRVQ6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuSU5fRlJBTUVTRVQ7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuU0VMRUNUOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9yZXNldEluc2VydGlvbk1vZGVGb3JTZWxlY3QoaSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEVNUExBVEU6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5zZXJ0aW9uTW9kZSA9IHRoaXMudG1wbEluc2VydGlvbk1vZGVTdGFja1swXTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5IVE1MOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmluc2VydGlvbk1vZGUgPSB0aGlzLmhlYWRFbGVtZW50ID8gSW5zZXJ0aW9uTW9kZS5BRlRFUl9IRUFEIDogSW5zZXJ0aW9uTW9kZS5CRUZPUkVfSEVBRDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5URDpcbiAgICAgICAgICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEg6XG4gICAgICAgICAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9DRUxMO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5IRUFEOlxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuSU5fSEVBRDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX0JPRFk7XG4gICAgfVxuICAgIF9yZXNldEluc2VydGlvbk1vZGVGb3JTZWxlY3Qoc2VsZWN0SWR4KSB7XG4gICAgICAgIGlmIChzZWxlY3RJZHggPiAwKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gc2VsZWN0SWR4IC0gMTsgaSA+IDA7IGktLSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRuID0gdGhpcy5vcGVuRWxlbWVudHMudGFnSURzW2ldO1xuICAgICAgICAgICAgICAgIGlmICh0biA9PT0gaHRtbF9qc18xLlRBR19JRC5URU1QTEFURSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodG4gPT09IGh0bWxfanNfMS5UQUdfSUQuVEFCTEUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9TRUxFQ1RfSU5fVEFCTEU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9TRUxFQ1Q7XG4gICAgfVxuICAgIC8vRm9zdGVyIHBhcmVudGluZ1xuICAgIF9pc0VsZW1lbnRDYXVzZXNGb3N0ZXJQYXJlbnRpbmcodG4pIHtcbiAgICAgICAgcmV0dXJuIFRBQkxFX1NUUlVDVFVSRV9UQUdTLmhhcyh0bik7XG4gICAgfVxuICAgIF9zaG91bGRGb3N0ZXJQYXJlbnRPbkluc2VydGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9zdGVyUGFyZW50aW5nRW5hYmxlZCAmJiB0aGlzLl9pc0VsZW1lbnRDYXVzZXNGb3N0ZXJQYXJlbnRpbmcodGhpcy5vcGVuRWxlbWVudHMuY3VycmVudFRhZ0lkKTtcbiAgICB9XG4gICAgX2ZpbmRGb3N0ZXJQYXJlbnRpbmdMb2NhdGlvbigpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMub3BlbkVsZW1lbnRzLnN0YWNrVG9wOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgY29uc3Qgb3BlbkVsZW1lbnQgPSB0aGlzLm9wZW5FbGVtZW50cy5pdGVtc1tpXTtcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5vcGVuRWxlbWVudHMudGFnSURzW2ldKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRFTVBMQVRFOlxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkob3BlbkVsZW1lbnQpID09PSBodG1sX2pzXzEuTlMuSFRNTCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgcGFyZW50OiB0aGlzLnRyZWVBZGFwdGVyLmdldFRlbXBsYXRlQ29udGVudChvcGVuRWxlbWVudCksIGJlZm9yZUVsZW1lbnQ6IG51bGwgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEFCTEU6IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy50cmVlQWRhcHRlci5nZXRQYXJlbnROb2RlKG9wZW5FbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgcGFyZW50LCBiZWZvcmVFbGVtZW50OiBvcGVuRWxlbWVudCB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHBhcmVudDogdGhpcy5vcGVuRWxlbWVudHMuaXRlbXNbaSAtIDFdLCBiZWZvcmVFbGVtZW50OiBudWxsIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gRG8gbm90aGluZ1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHBhcmVudDogdGhpcy5vcGVuRWxlbWVudHMuaXRlbXNbMF0sIGJlZm9yZUVsZW1lbnQ6IG51bGwgfTtcbiAgICB9XG4gICAgX2Zvc3RlclBhcmVudEVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMuX2ZpbmRGb3N0ZXJQYXJlbnRpbmdMb2NhdGlvbigpO1xuICAgICAgICBpZiAobG9jYXRpb24uYmVmb3JlRWxlbWVudCkge1xuICAgICAgICAgICAgdGhpcy50cmVlQWRhcHRlci5pbnNlcnRCZWZvcmUobG9jYXRpb24ucGFyZW50LCBlbGVtZW50LCBsb2NhdGlvbi5iZWZvcmVFbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudHJlZUFkYXB0ZXIuYXBwZW5kQ2hpbGQobG9jYXRpb24ucGFyZW50LCBlbGVtZW50KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvL1NwZWNpYWwgZWxlbWVudHNcbiAgICBfaXNTcGVjaWFsRWxlbWVudChlbGVtZW50LCBpZCkge1xuICAgICAgICBjb25zdCBucyA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKGVsZW1lbnQpO1xuICAgICAgICByZXR1cm4gaHRtbF9qc18xLlNQRUNJQUxfRUxFTUVOVFNbbnNdLmhhcyhpZCk7XG4gICAgfVxuICAgIG9uQ2hhcmFjdGVyKHRva2VuKSB7XG4gICAgICAgIHRoaXMuc2tpcE5leHROZXdMaW5lID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLnRva2VuaXplci5pbkZvcmVpZ25Ob2RlKSB7XG4gICAgICAgICAgICBjaGFyYWN0ZXJJbkZvcmVpZ25Db250ZW50KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKHRoaXMuaW5zZXJ0aW9uTW9kZSkge1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOSVRJQUw6XG4gICAgICAgICAgICAgICAgdG9rZW5JbkluaXRpYWxNb2RlKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5CRUZPUkVfSFRNTDpcbiAgICAgICAgICAgICAgICB0b2tlbkJlZm9yZUh0bWwodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLkJFRk9SRV9IRUFEOlxuICAgICAgICAgICAgICAgIHRva2VuQmVmb3JlSGVhZCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fSEVBRDpcbiAgICAgICAgICAgICAgICB0b2tlbkluSGVhZCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fSEVBRF9OT19TQ1JJUFQ6XG4gICAgICAgICAgICAgICAgdG9rZW5JbkhlYWROb1NjcmlwdCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQUZURVJfSEVBRDpcbiAgICAgICAgICAgICAgICB0b2tlbkFmdGVySGVhZCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fQk9EWTpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9DQVBUSU9OOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0NFTEw6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEVNUExBVEU6XG4gICAgICAgICAgICAgICAgY2hhcmFjdGVySW5Cb2R5KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5URVhUOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX1NFTEVDVDpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9TRUxFQ1RfSU5fVEFCTEU6XG4gICAgICAgICAgICAgICAgdGhpcy5faW5zZXJ0Q2hhcmFjdGVycyh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEFCTEU6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEFCTEVfQk9EWTpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9ST1c6XG4gICAgICAgICAgICAgICAgY2hhcmFjdGVySW5UYWJsZSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEFCTEVfVEVYVDpcbiAgICAgICAgICAgICAgICBjaGFyYWN0ZXJJblRhYmxlVGV4dCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fQ09MVU1OX0dST1VQOlxuICAgICAgICAgICAgICAgIHRva2VuSW5Db2x1bW5Hcm91cCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQUZURVJfQk9EWTpcbiAgICAgICAgICAgICAgICB0b2tlbkFmdGVyQm9keSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQUZURVJfQUZURVJfQk9EWTpcbiAgICAgICAgICAgICAgICB0b2tlbkFmdGVyQWZ0ZXJCb2R5KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nXG4gICAgICAgIH1cbiAgICB9XG4gICAgb25OdWxsQ2hhcmFjdGVyKHRva2VuKSB7XG4gICAgICAgIHRoaXMuc2tpcE5leHROZXdMaW5lID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLnRva2VuaXplci5pbkZvcmVpZ25Ob2RlKSB7XG4gICAgICAgICAgICBudWxsQ2hhcmFjdGVySW5Gb3JlaWduQ29udGVudCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoICh0aGlzLmluc2VydGlvbk1vZGUpIHtcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTklUSUFMOlxuICAgICAgICAgICAgICAgIHRva2VuSW5Jbml0aWFsTW9kZSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQkVGT1JFX0hUTUw6XG4gICAgICAgICAgICAgICAgdG9rZW5CZWZvcmVIdG1sKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5CRUZPUkVfSEVBRDpcbiAgICAgICAgICAgICAgICB0b2tlbkJlZm9yZUhlYWQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0hFQUQ6XG4gICAgICAgICAgICAgICAgdG9rZW5JbkhlYWQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0hFQURfTk9fU0NSSVBUOlxuICAgICAgICAgICAgICAgIHRva2VuSW5IZWFkTm9TY3JpcHQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLkFGVEVSX0hFQUQ6XG4gICAgICAgICAgICAgICAgdG9rZW5BZnRlckhlYWQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLlRFWFQ6XG4gICAgICAgICAgICAgICAgdGhpcy5faW5zZXJ0Q2hhcmFjdGVycyh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEFCTEU6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEFCTEVfQk9EWTpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9ST1c6XG4gICAgICAgICAgICAgICAgY2hhcmFjdGVySW5UYWJsZSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fQ09MVU1OX0dST1VQOlxuICAgICAgICAgICAgICAgIHRva2VuSW5Db2x1bW5Hcm91cCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQUZURVJfQk9EWTpcbiAgICAgICAgICAgICAgICB0b2tlbkFmdGVyQm9keSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQUZURVJfQUZURVJfQk9EWTpcbiAgICAgICAgICAgICAgICB0b2tlbkFmdGVyQWZ0ZXJCb2R5KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nXG4gICAgICAgIH1cbiAgICB9XG4gICAgb25Db21tZW50KHRva2VuKSB7XG4gICAgICAgIHRoaXMuc2tpcE5leHROZXdMaW5lID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnROb3RJbkhUTUwpIHtcbiAgICAgICAgICAgIGFwcGVuZENvbW1lbnQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAodGhpcy5pbnNlcnRpb25Nb2RlKSB7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5JVElBTDpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5CRUZPUkVfSFRNTDpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5CRUZPUkVfSEVBRDpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9IRUFEOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0hFQURfTk9fU0NSSVBUOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLkFGVEVSX0hFQUQ6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fQk9EWTpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRTpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9DQVBUSU9OOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0NPTFVNTl9HUk9VUDpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRV9CT0RZOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX1JPVzpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9DRUxMOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX1NFTEVDVDpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9TRUxFQ1RfSU5fVEFCTEU6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEVNUExBVEU6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fRlJBTUVTRVQ6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQUZURVJfRlJBTUVTRVQ6XG4gICAgICAgICAgICAgICAgYXBwZW5kQ29tbWVudCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEFCTEVfVEVYVDpcbiAgICAgICAgICAgICAgICB0b2tlbkluVGFibGVUZXh0KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5BRlRFUl9CT0RZOlxuICAgICAgICAgICAgICAgIGFwcGVuZENvbW1lbnRUb1Jvb3RIdG1sRWxlbWVudCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQUZURVJfQUZURVJfQk9EWTpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5BRlRFUl9BRlRFUl9GUkFNRVNFVDpcbiAgICAgICAgICAgICAgICBhcHBlbmRDb21tZW50VG9Eb2N1bWVudCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gRG8gbm90aGluZ1xuICAgICAgICB9XG4gICAgfVxuICAgIG9uRG9jdHlwZSh0b2tlbikge1xuICAgICAgICB0aGlzLnNraXBOZXh0TmV3TGluZSA9IGZhbHNlO1xuICAgICAgICBzd2l0Y2ggKHRoaXMuaW5zZXJ0aW9uTW9kZSkge1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOSVRJQUw6XG4gICAgICAgICAgICAgICAgZG9jdHlwZUluSW5pdGlhbE1vZGUodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLkJFRk9SRV9IRUFEOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0hFQUQ6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fSEVBRF9OT19TQ1JJUFQ6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQUZURVJfSEVBRDpcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIodG9rZW4sIGVycm9yX2NvZGVzX2pzXzEuRVJSLm1pc3BsYWNlZERvY3R5cGUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX1RBQkxFX1RFWFQ6XG4gICAgICAgICAgICAgICAgdG9rZW5JblRhYmxlVGV4dCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gRG8gbm90aGluZ1xuICAgICAgICB9XG4gICAgfVxuICAgIG9uU3RhcnRUYWcodG9rZW4pIHtcbiAgICAgICAgdGhpcy5za2lwTmV4dE5ld0xpbmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4gPSB0b2tlbjtcbiAgICAgICAgdGhpcy5fcHJvY2Vzc1N0YXJ0VGFnKHRva2VuKTtcbiAgICAgICAgaWYgKHRva2VuLnNlbGZDbG9zaW5nICYmICF0b2tlbi5hY2tTZWxmQ2xvc2luZykge1xuICAgICAgICAgICAgdGhpcy5fZXJyKHRva2VuLCBlcnJvcl9jb2Rlc19qc18xLkVSUi5ub25Wb2lkSHRtbEVsZW1lbnRTdGFydFRhZ1dpdGhUcmFpbGluZ1NvbGlkdXMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFByb2Nlc3NlcyBhIGdpdmVuIHN0YXJ0IHRhZy5cbiAgICAgKlxuICAgICAqIGBvblN0YXJ0VGFnYCBjaGVja3MgaWYgYSBzZWxmLWNsb3NpbmcgdGFnIHdhcyByZWNvZ25pemVkLiBXaGVuIGEgdG9rZW5cbiAgICAgKiBpcyBtb3ZlZCBpbmJldHdlZW4gbXVsdGlwbGUgaW5zZXJ0aW9uIG1vZGVzLCB0aGlzIGNoZWNrIGZvciBzZWxmLWNsb3NpbmdcbiAgICAgKiBjb3VsZCBsZWFkIHRvIGZhbHNlIHBvc2l0aXZlcy4gVG8gYXZvaWQgdGhpcywgYF9wcm9jZXNzU3RhcnRUYWdgIGlzIHVzZWRcbiAgICAgKiBmb3IgbmVzdGVkIGNhbGxzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHRva2VuIFRoZSB0b2tlbiB0byBwcm9jZXNzLlxuICAgICAqL1xuICAgIF9wcm9jZXNzU3RhcnRUYWcodG9rZW4pIHtcbiAgICAgICAgaWYgKHRoaXMuc2hvdWxkUHJvY2Vzc1N0YXJ0VGFnVG9rZW5JbkZvcmVpZ25Db250ZW50KHRva2VuKSkge1xuICAgICAgICAgICAgc3RhcnRUYWdJbkZvcmVpZ25Db250ZW50KHRoaXMsIHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXJ0VGFnT3V0c2lkZUZvcmVpZ25Db250ZW50KHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfc3RhcnRUYWdPdXRzaWRlRm9yZWlnbkNvbnRlbnQodG9rZW4pIHtcbiAgICAgICAgc3dpdGNoICh0aGlzLmluc2VydGlvbk1vZGUpIHtcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTklUSUFMOlxuICAgICAgICAgICAgICAgIHRva2VuSW5Jbml0aWFsTW9kZSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQkVGT1JFX0hUTUw6XG4gICAgICAgICAgICAgICAgc3RhcnRUYWdCZWZvcmVIdG1sKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5CRUZPUkVfSEVBRDpcbiAgICAgICAgICAgICAgICBzdGFydFRhZ0JlZm9yZUhlYWQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0hFQUQ6XG4gICAgICAgICAgICAgICAgc3RhcnRUYWdJbkhlYWQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0hFQURfTk9fU0NSSVBUOlxuICAgICAgICAgICAgICAgIHN0YXJ0VGFnSW5IZWFkTm9TY3JpcHQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLkFGVEVSX0hFQUQ6XG4gICAgICAgICAgICAgICAgc3RhcnRUYWdBZnRlckhlYWQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0JPRFk6XG4gICAgICAgICAgICAgICAgc3RhcnRUYWdJbkJvZHkodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX1RBQkxFOlxuICAgICAgICAgICAgICAgIHN0YXJ0VGFnSW5UYWJsZSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEFCTEVfVEVYVDpcbiAgICAgICAgICAgICAgICB0b2tlbkluVGFibGVUZXh0KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9DQVBUSU9OOlxuICAgICAgICAgICAgICAgIHN0YXJ0VGFnSW5DYXB0aW9uKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9DT0xVTU5fR1JPVVA6XG4gICAgICAgICAgICAgICAgc3RhcnRUYWdJbkNvbHVtbkdyb3VwKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRV9CT0RZOlxuICAgICAgICAgICAgICAgIHN0YXJ0VGFnSW5UYWJsZUJvZHkodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX1JPVzpcbiAgICAgICAgICAgICAgICBzdGFydFRhZ0luUm93KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9DRUxMOlxuICAgICAgICAgICAgICAgIHN0YXJ0VGFnSW5DZWxsKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9TRUxFQ1Q6XG4gICAgICAgICAgICAgICAgc3RhcnRUYWdJblNlbGVjdCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fU0VMRUNUX0lOX1RBQkxFOlxuICAgICAgICAgICAgICAgIHN0YXJ0VGFnSW5TZWxlY3RJblRhYmxlKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9URU1QTEFURTpcbiAgICAgICAgICAgICAgICBzdGFydFRhZ0luVGVtcGxhdGUodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLkFGVEVSX0JPRFk6XG4gICAgICAgICAgICAgICAgc3RhcnRUYWdBZnRlckJvZHkodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0ZSQU1FU0VUOlxuICAgICAgICAgICAgICAgIHN0YXJ0VGFnSW5GcmFtZXNldCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQUZURVJfRlJBTUVTRVQ6XG4gICAgICAgICAgICAgICAgc3RhcnRUYWdBZnRlckZyYW1lc2V0KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5BRlRFUl9BRlRFUl9CT0RZOlxuICAgICAgICAgICAgICAgIHN0YXJ0VGFnQWZ0ZXJBZnRlckJvZHkodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLkFGVEVSX0FGVEVSX0ZSQU1FU0VUOlxuICAgICAgICAgICAgICAgIHN0YXJ0VGFnQWZ0ZXJBZnRlckZyYW1lc2V0KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nXG4gICAgICAgIH1cbiAgICB9XG4gICAgb25FbmRUYWcodG9rZW4pIHtcbiAgICAgICAgdGhpcy5za2lwTmV4dE5ld0xpbmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4gPSB0b2tlbjtcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudE5vdEluSFRNTCkge1xuICAgICAgICAgICAgZW5kVGFnSW5Gb3JlaWduQ29udGVudCh0aGlzLCB0b2tlbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lbmRUYWdPdXRzaWRlRm9yZWlnbkNvbnRlbnQodG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9lbmRUYWdPdXRzaWRlRm9yZWlnbkNvbnRlbnQodG9rZW4pIHtcbiAgICAgICAgc3dpdGNoICh0aGlzLmluc2VydGlvbk1vZGUpIHtcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTklUSUFMOlxuICAgICAgICAgICAgICAgIHRva2VuSW5Jbml0aWFsTW9kZSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQkVGT1JFX0hUTUw6XG4gICAgICAgICAgICAgICAgZW5kVGFnQmVmb3JlSHRtbCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQkVGT1JFX0hFQUQ6XG4gICAgICAgICAgICAgICAgZW5kVGFnQmVmb3JlSGVhZCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fSEVBRDpcbiAgICAgICAgICAgICAgICBlbmRUYWdJbkhlYWQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0hFQURfTk9fU0NSSVBUOlxuICAgICAgICAgICAgICAgIGVuZFRhZ0luSGVhZE5vU2NyaXB0KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5BRlRFUl9IRUFEOlxuICAgICAgICAgICAgICAgIGVuZFRhZ0FmdGVySGVhZCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fQk9EWTpcbiAgICAgICAgICAgICAgICBlbmRUYWdJbkJvZHkodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLlRFWFQ6XG4gICAgICAgICAgICAgICAgZW5kVGFnSW5UZXh0KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRTpcbiAgICAgICAgICAgICAgICBlbmRUYWdJblRhYmxlKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRV9URVhUOlxuICAgICAgICAgICAgICAgIHRva2VuSW5UYWJsZVRleHQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0NBUFRJT046XG4gICAgICAgICAgICAgICAgZW5kVGFnSW5DYXB0aW9uKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9DT0xVTU5fR1JPVVA6XG4gICAgICAgICAgICAgICAgZW5kVGFnSW5Db2x1bW5Hcm91cCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEFCTEVfQk9EWTpcbiAgICAgICAgICAgICAgICBlbmRUYWdJblRhYmxlQm9keSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fUk9XOlxuICAgICAgICAgICAgICAgIGVuZFRhZ0luUm93KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9DRUxMOlxuICAgICAgICAgICAgICAgIGVuZFRhZ0luQ2VsbCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fU0VMRUNUOlxuICAgICAgICAgICAgICAgIGVuZFRhZ0luU2VsZWN0KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9TRUxFQ1RfSU5fVEFCTEU6XG4gICAgICAgICAgICAgICAgZW5kVGFnSW5TZWxlY3RJblRhYmxlKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9URU1QTEFURTpcbiAgICAgICAgICAgICAgICBlbmRUYWdJblRlbXBsYXRlKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5BRlRFUl9CT0RZOlxuICAgICAgICAgICAgICAgIGVuZFRhZ0FmdGVyQm9keSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fRlJBTUVTRVQ6XG4gICAgICAgICAgICAgICAgZW5kVGFnSW5GcmFtZXNldCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQUZURVJfRlJBTUVTRVQ6XG4gICAgICAgICAgICAgICAgZW5kVGFnQWZ0ZXJGcmFtZXNldCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQUZURVJfQUZURVJfQk9EWTpcbiAgICAgICAgICAgICAgICB0b2tlbkFmdGVyQWZ0ZXJCb2R5KHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nXG4gICAgICAgIH1cbiAgICB9XG4gICAgb25Fb2YodG9rZW4pIHtcbiAgICAgICAgc3dpdGNoICh0aGlzLmluc2VydGlvbk1vZGUpIHtcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTklUSUFMOlxuICAgICAgICAgICAgICAgIHRva2VuSW5Jbml0aWFsTW9kZSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQkVGT1JFX0hUTUw6XG4gICAgICAgICAgICAgICAgdG9rZW5CZWZvcmVIdG1sKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5CRUZPUkVfSEVBRDpcbiAgICAgICAgICAgICAgICB0b2tlbkJlZm9yZUhlYWQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0hFQUQ6XG4gICAgICAgICAgICAgICAgdG9rZW5JbkhlYWQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0hFQURfTk9fU0NSSVBUOlxuICAgICAgICAgICAgICAgIHRva2VuSW5IZWFkTm9TY3JpcHQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLkFGVEVSX0hFQUQ6XG4gICAgICAgICAgICAgICAgdG9rZW5BZnRlckhlYWQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0JPRFk6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEFCTEU6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fQ0FQVElPTjpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9DT0xVTU5fR1JPVVA6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEFCTEVfQk9EWTpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9ST1c6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fQ0VMTDpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9TRUxFQ1Q6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fU0VMRUNUX0lOX1RBQkxFOlxuICAgICAgICAgICAgICAgIGVvZkluQm9keSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuVEVYVDpcbiAgICAgICAgICAgICAgICBlb2ZJblRleHQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX1RBQkxFX1RFWFQ6XG4gICAgICAgICAgICAgICAgdG9rZW5JblRhYmxlVGV4dCh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEVNUExBVEU6XG4gICAgICAgICAgICAgICAgZW9mSW5UZW1wbGF0ZSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQUZURVJfQk9EWTpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9GUkFNRVNFVDpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5BRlRFUl9GUkFNRVNFVDpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5BRlRFUl9BRlRFUl9CT0RZOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLkFGVEVSX0FGVEVSX0ZSQU1FU0VUOlxuICAgICAgICAgICAgICAgIHN0b3BQYXJzaW5nKHRoaXMsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBEbyBub3RoaW5nXG4gICAgICAgIH1cbiAgICB9XG4gICAgb25XaGl0ZXNwYWNlQ2hhcmFjdGVyKHRva2VuKSB7XG4gICAgICAgIGlmICh0aGlzLnNraXBOZXh0TmV3TGluZSkge1xuICAgICAgICAgICAgdGhpcy5za2lwTmV4dE5ld0xpbmUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh0b2tlbi5jaGFycy5jaGFyQ29kZUF0KDApID09PSB1bmljb2RlLkNPREVfUE9JTlRTLkxJTkVfRkVFRCkge1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi5jaGFycy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0b2tlbi5jaGFycyA9IHRva2VuLmNoYXJzLnN1YnN0cigxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy50b2tlbml6ZXIuaW5Gb3JlaWduTm9kZSkge1xuICAgICAgICAgICAgdGhpcy5faW5zZXJ0Q2hhcmFjdGVycyh0b2tlbik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoICh0aGlzLmluc2VydGlvbk1vZGUpIHtcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9IRUFEOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0hFQURfTk9fU0NSSVBUOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLkFGVEVSX0hFQUQ6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuVEVYVDpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9DT0xVTU5fR1JPVVA6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fU0VMRUNUOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX1NFTEVDVF9JTl9UQUJMRTpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9GUkFNRVNFVDpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5BRlRFUl9GUkFNRVNFVDpcbiAgICAgICAgICAgICAgICB0aGlzLl9pbnNlcnRDaGFyYWN0ZXJzKHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9CT0RZOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLklOX0NBUFRJT046XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fQ0VMTDpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9URU1QTEFURTpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5BRlRFUl9CT0RZOlxuICAgICAgICAgICAgY2FzZSBJbnNlcnRpb25Nb2RlLkFGVEVSX0FGVEVSX0JPRFk6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuQUZURVJfQUZURVJfRlJBTUVTRVQ6XG4gICAgICAgICAgICAgICAgd2hpdGVzcGFjZUNoYXJhY3RlckluQm9keSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEFCTEU6XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEFCTEVfQk9EWTpcbiAgICAgICAgICAgIGNhc2UgSW5zZXJ0aW9uTW9kZS5JTl9ST1c6XG4gICAgICAgICAgICAgICAgY2hhcmFjdGVySW5UYWJsZSh0aGlzLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEluc2VydGlvbk1vZGUuSU5fVEFCTEVfVEVYVDpcbiAgICAgICAgICAgICAgICB3aGl0ZXNwYWNlQ2hhcmFjdGVySW5UYWJsZVRleHQodGhpcywgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIERvIG5vdGhpbmdcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuUGFyc2VyID0gUGFyc2VyO1xuLy9BZG9wdGlvbiBhZ2VuY3kgYWxnb3JpdGhtXG4vLyhzZWU6IGh0dHA6Ly93d3cud2hhdHdnLm9yZy9zcGVjcy93ZWItYXBwcy9jdXJyZW50LXdvcmsvbXVsdGlwYWdlL3RyZWUtY29uc3RydWN0aW9uLmh0bWwjYWRvcHRpb25BZ2VuY3kpXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy9TdGVwcyA1LTggb2YgdGhlIGFsZ29yaXRobVxuZnVuY3Rpb24gYWFPYnRhaW5Gb3JtYXR0aW5nRWxlbWVudEVudHJ5KHAsIHRva2VuKSB7XG4gICAgbGV0IGZvcm1hdHRpbmdFbGVtZW50RW50cnkgPSBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5nZXRFbGVtZW50RW50cnlJblNjb3BlV2l0aFRhZ05hbWUodG9rZW4udGFnTmFtZSk7XG4gICAgaWYgKGZvcm1hdHRpbmdFbGVtZW50RW50cnkpIHtcbiAgICAgICAgaWYgKCFwLm9wZW5FbGVtZW50cy5jb250YWlucyhmb3JtYXR0aW5nRWxlbWVudEVudHJ5LmVsZW1lbnQpKSB7XG4gICAgICAgICAgICBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5yZW1vdmVFbnRyeShmb3JtYXR0aW5nRWxlbWVudEVudHJ5KTtcbiAgICAgICAgICAgIGZvcm1hdHRpbmdFbGVtZW50RW50cnkgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFwLm9wZW5FbGVtZW50cy5oYXNJblNjb3BlKHRva2VuLnRhZ0lEKSkge1xuICAgICAgICAgICAgZm9ybWF0dGluZ0VsZW1lbnRFbnRyeSA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGdlbmVyaWNFbmRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0dGluZ0VsZW1lbnRFbnRyeTtcbn1cbi8vU3RlcHMgOSBhbmQgMTAgb2YgdGhlIGFsZ29yaXRobVxuZnVuY3Rpb24gYWFPYnRhaW5GdXJ0aGVzdEJsb2NrKHAsIGZvcm1hdHRpbmdFbGVtZW50RW50cnkpIHtcbiAgICBsZXQgZnVydGhlc3RCbG9jayA9IG51bGw7XG4gICAgbGV0IGlkeCA9IHAub3BlbkVsZW1lbnRzLnN0YWNrVG9wO1xuICAgIGZvciAoOyBpZHggPj0gMDsgaWR4LS0pIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHAub3BlbkVsZW1lbnRzLml0ZW1zW2lkeF07XG4gICAgICAgIGlmIChlbGVtZW50ID09PSBmb3JtYXR0aW5nRWxlbWVudEVudHJ5LmVsZW1lbnQpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwLl9pc1NwZWNpYWxFbGVtZW50KGVsZW1lbnQsIHAub3BlbkVsZW1lbnRzLnRhZ0lEc1tpZHhdKSkge1xuICAgICAgICAgICAgZnVydGhlc3RCbG9jayA9IGVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFmdXJ0aGVzdEJsb2NrKSB7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnNob3J0ZW5Ub0xlbmd0aChpZHggPCAwID8gMCA6IGlkeCk7XG4gICAgICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLnJlbW92ZUVudHJ5KGZvcm1hdHRpbmdFbGVtZW50RW50cnkpO1xuICAgIH1cbiAgICByZXR1cm4gZnVydGhlc3RCbG9jaztcbn1cbi8vU3RlcCAxMyBvZiB0aGUgYWxnb3JpdGhtXG5mdW5jdGlvbiBhYUlubmVyTG9vcChwLCBmdXJ0aGVzdEJsb2NrLCBmb3JtYXR0aW5nRWxlbWVudCkge1xuICAgIGxldCBsYXN0RWxlbWVudCA9IGZ1cnRoZXN0QmxvY2s7XG4gICAgbGV0IG5leHRFbGVtZW50ID0gcC5vcGVuRWxlbWVudHMuZ2V0Q29tbW9uQW5jZXN0b3IoZnVydGhlc3RCbG9jayk7XG4gICAgZm9yIChsZXQgaSA9IDAsIGVsZW1lbnQgPSBuZXh0RWxlbWVudDsgZWxlbWVudCAhPT0gZm9ybWF0dGluZ0VsZW1lbnQ7IGkrKywgZWxlbWVudCA9IG5leHRFbGVtZW50KSB7XG4gICAgICAgIC8vTk9URTogc3RvcmUgdGhlIG5leHQgZWxlbWVudCBmb3IgdGhlIG5leHQgbG9vcCBpdGVyYXRpb24gKGl0IG1heSBiZSBkZWxldGVkIGZyb20gdGhlIHN0YWNrIGJ5IHN0ZXAgOS41KVxuICAgICAgICBuZXh0RWxlbWVudCA9IHAub3BlbkVsZW1lbnRzLmdldENvbW1vbkFuY2VzdG9yKGVsZW1lbnQpO1xuICAgICAgICBjb25zdCBlbGVtZW50RW50cnkgPSBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5nZXRFbGVtZW50RW50cnkoZWxlbWVudCk7XG4gICAgICAgIGNvbnN0IGNvdW50ZXJPdmVyZmxvdyA9IGVsZW1lbnRFbnRyeSAmJiBpID49IEFBX0lOTkVSX0xPT1BfSVRFUjtcbiAgICAgICAgY29uc3Qgc2hvdWxkUmVtb3ZlRnJvbU9wZW5FbGVtZW50cyA9ICFlbGVtZW50RW50cnkgfHwgY291bnRlck92ZXJmbG93O1xuICAgICAgICBpZiAoc2hvdWxkUmVtb3ZlRnJvbU9wZW5FbGVtZW50cykge1xuICAgICAgICAgICAgaWYgKGNvdW50ZXJPdmVyZmxvdykge1xuICAgICAgICAgICAgICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLnJlbW92ZUVudHJ5KGVsZW1lbnRFbnRyeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5yZW1vdmUoZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50ID0gYWFSZWNyZWF0ZUVsZW1lbnRGcm9tRW50cnkocCwgZWxlbWVudEVudHJ5KTtcbiAgICAgICAgICAgIGlmIChsYXN0RWxlbWVudCA9PT0gZnVydGhlc3RCbG9jaykge1xuICAgICAgICAgICAgICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLmJvb2ttYXJrID0gZWxlbWVudEVudHJ5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcC50cmVlQWRhcHRlci5kZXRhY2hOb2RlKGxhc3RFbGVtZW50KTtcbiAgICAgICAgICAgIHAudHJlZUFkYXB0ZXIuYXBwZW5kQ2hpbGQoZWxlbWVudCwgbGFzdEVsZW1lbnQpO1xuICAgICAgICAgICAgbGFzdEVsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsYXN0RWxlbWVudDtcbn1cbi8vU3RlcCAxMy43IG9mIHRoZSBhbGdvcml0aG1cbmZ1bmN0aW9uIGFhUmVjcmVhdGVFbGVtZW50RnJvbUVudHJ5KHAsIGVsZW1lbnRFbnRyeSkge1xuICAgIGNvbnN0IG5zID0gcC50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkoZWxlbWVudEVudHJ5LmVsZW1lbnQpO1xuICAgIGNvbnN0IG5ld0VsZW1lbnQgPSBwLnRyZWVBZGFwdGVyLmNyZWF0ZUVsZW1lbnQoZWxlbWVudEVudHJ5LnRva2VuLnRhZ05hbWUsIG5zLCBlbGVtZW50RW50cnkudG9rZW4uYXR0cnMpO1xuICAgIHAub3BlbkVsZW1lbnRzLnJlcGxhY2UoZWxlbWVudEVudHJ5LmVsZW1lbnQsIG5ld0VsZW1lbnQpO1xuICAgIGVsZW1lbnRFbnRyeS5lbGVtZW50ID0gbmV3RWxlbWVudDtcbiAgICByZXR1cm4gbmV3RWxlbWVudDtcbn1cbi8vU3RlcCAxNCBvZiB0aGUgYWxnb3JpdGhtXG5mdW5jdGlvbiBhYUluc2VydExhc3ROb2RlSW5Db21tb25BbmNlc3RvcihwLCBjb21tb25BbmNlc3RvciwgbGFzdEVsZW1lbnQpIHtcbiAgICBjb25zdCB0biA9IHAudHJlZUFkYXB0ZXIuZ2V0VGFnTmFtZShjb21tb25BbmNlc3Rvcik7XG4gICAgY29uc3QgdGlkID0gKDAsIGh0bWxfanNfMS5nZXRUYWdJRCkodG4pO1xuICAgIGlmIChwLl9pc0VsZW1lbnRDYXVzZXNGb3N0ZXJQYXJlbnRpbmcodGlkKSkge1xuICAgICAgICBwLl9mb3N0ZXJQYXJlbnRFbGVtZW50KGxhc3RFbGVtZW50KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGNvbnN0IG5zID0gcC50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkoY29tbW9uQW5jZXN0b3IpO1xuICAgICAgICBpZiAodGlkID09PSBodG1sX2pzXzEuVEFHX0lELlRFTVBMQVRFICYmIG5zID09PSBodG1sX2pzXzEuTlMuSFRNTCkge1xuICAgICAgICAgICAgY29tbW9uQW5jZXN0b3IgPSBwLnRyZWVBZGFwdGVyLmdldFRlbXBsYXRlQ29udGVudChjb21tb25BbmNlc3Rvcik7XG4gICAgICAgIH1cbiAgICAgICAgcC50cmVlQWRhcHRlci5hcHBlbmRDaGlsZChjb21tb25BbmNlc3RvciwgbGFzdEVsZW1lbnQpO1xuICAgIH1cbn1cbi8vU3RlcHMgMTUtMTkgb2YgdGhlIGFsZ29yaXRobVxuZnVuY3Rpb24gYWFSZXBsYWNlRm9ybWF0dGluZ0VsZW1lbnQocCwgZnVydGhlc3RCbG9jaywgZm9ybWF0dGluZ0VsZW1lbnRFbnRyeSkge1xuICAgIGNvbnN0IG5zID0gcC50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkoZm9ybWF0dGluZ0VsZW1lbnRFbnRyeS5lbGVtZW50KTtcbiAgICBjb25zdCB7IHRva2VuIH0gPSBmb3JtYXR0aW5nRWxlbWVudEVudHJ5O1xuICAgIGNvbnN0IG5ld0VsZW1lbnQgPSBwLnRyZWVBZGFwdGVyLmNyZWF0ZUVsZW1lbnQodG9rZW4udGFnTmFtZSwgbnMsIHRva2VuLmF0dHJzKTtcbiAgICBwLl9hZG9wdE5vZGVzKGZ1cnRoZXN0QmxvY2ssIG5ld0VsZW1lbnQpO1xuICAgIHAudHJlZUFkYXB0ZXIuYXBwZW5kQ2hpbGQoZnVydGhlc3RCbG9jaywgbmV3RWxlbWVudCk7XG4gICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuaW5zZXJ0RWxlbWVudEFmdGVyQm9va21hcmsobmV3RWxlbWVudCwgdG9rZW4pO1xuICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLnJlbW92ZUVudHJ5KGZvcm1hdHRpbmdFbGVtZW50RW50cnkpO1xuICAgIHAub3BlbkVsZW1lbnRzLnJlbW92ZShmb3JtYXR0aW5nRWxlbWVudEVudHJ5LmVsZW1lbnQpO1xuICAgIHAub3BlbkVsZW1lbnRzLmluc2VydEFmdGVyKGZ1cnRoZXN0QmxvY2ssIG5ld0VsZW1lbnQsIHRva2VuLnRhZ0lEKTtcbn1cbi8vQWxnb3JpdGhtIGVudHJ5IHBvaW50XG5mdW5jdGlvbiBjYWxsQWRvcHRpb25BZ2VuY3kocCwgdG9rZW4pIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IEFBX09VVEVSX0xPT1BfSVRFUjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRpbmdFbGVtZW50RW50cnkgPSBhYU9idGFpbkZvcm1hdHRpbmdFbGVtZW50RW50cnkocCwgdG9rZW4pO1xuICAgICAgICBpZiAoIWZvcm1hdHRpbmdFbGVtZW50RW50cnkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZ1cnRoZXN0QmxvY2sgPSBhYU9idGFpbkZ1cnRoZXN0QmxvY2socCwgZm9ybWF0dGluZ0VsZW1lbnRFbnRyeSk7XG4gICAgICAgIGlmICghZnVydGhlc3RCbG9jaykge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuYm9va21hcmsgPSBmb3JtYXR0aW5nRWxlbWVudEVudHJ5O1xuICAgICAgICBjb25zdCBsYXN0RWxlbWVudCA9IGFhSW5uZXJMb29wKHAsIGZ1cnRoZXN0QmxvY2ssIGZvcm1hdHRpbmdFbGVtZW50RW50cnkuZWxlbWVudCk7XG4gICAgICAgIGNvbnN0IGNvbW1vbkFuY2VzdG9yID0gcC5vcGVuRWxlbWVudHMuZ2V0Q29tbW9uQW5jZXN0b3IoZm9ybWF0dGluZ0VsZW1lbnRFbnRyeS5lbGVtZW50KTtcbiAgICAgICAgcC50cmVlQWRhcHRlci5kZXRhY2hOb2RlKGxhc3RFbGVtZW50KTtcbiAgICAgICAgaWYgKGNvbW1vbkFuY2VzdG9yKVxuICAgICAgICAgICAgYWFJbnNlcnRMYXN0Tm9kZUluQ29tbW9uQW5jZXN0b3IocCwgY29tbW9uQW5jZXN0b3IsIGxhc3RFbGVtZW50KTtcbiAgICAgICAgYWFSZXBsYWNlRm9ybWF0dGluZ0VsZW1lbnQocCwgZnVydGhlc3RCbG9jaywgZm9ybWF0dGluZ0VsZW1lbnRFbnRyeSk7XG4gICAgfVxufVxuLy9HZW5lcmljIHRva2VuIGhhbmRsZXJzXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gYXBwZW5kQ29tbWVudChwLCB0b2tlbikge1xuICAgIHAuX2FwcGVuZENvbW1lbnROb2RlKHRva2VuLCBwLm9wZW5FbGVtZW50cy5jdXJyZW50VG1wbENvbnRlbnRPck5vZGUpO1xufVxuZnVuY3Rpb24gYXBwZW5kQ29tbWVudFRvUm9vdEh0bWxFbGVtZW50KHAsIHRva2VuKSB7XG4gICAgcC5fYXBwZW5kQ29tbWVudE5vZGUodG9rZW4sIHAub3BlbkVsZW1lbnRzLml0ZW1zWzBdKTtcbn1cbmZ1bmN0aW9uIGFwcGVuZENvbW1lbnRUb0RvY3VtZW50KHAsIHRva2VuKSB7XG4gICAgcC5fYXBwZW5kQ29tbWVudE5vZGUodG9rZW4sIHAuZG9jdW1lbnQpO1xufVxuZnVuY3Rpb24gc3RvcFBhcnNpbmcocCwgdG9rZW4pIHtcbiAgICBwLnN0b3BwZWQgPSB0cnVlO1xuICAgIC8vIE5PVEU6IFNldCBlbmQgbG9jYXRpb25zIGZvciBlbGVtZW50cyB0aGF0IHJlbWFpbiBvbiB0aGUgb3BlbiBlbGVtZW50IHN0YWNrLlxuICAgIGlmICh0b2tlbi5sb2NhdGlvbikge1xuICAgICAgICAvLyBOT1RFOiBJZiB3ZSBhcmUgbm90IGluIGEgZnJhZ21lbnQsIGBodG1sYCBhbmQgYGJvZHlgIHdpbGwgc3RheSBvbiB0aGUgc3RhY2suXG4gICAgICAgIC8vIFRoaXMgaXMgYSBwcm9ibGVtLCBhcyB3ZSBtaWdodCBvdmVyd3JpdGUgdGhlaXIgZW5kIHBvc2l0aW9uIGhlcmUuXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IHAuZnJhZ21lbnRDb250ZXh0ID8gMCA6IDI7XG4gICAgICAgIGZvciAobGV0IGkgPSBwLm9wZW5FbGVtZW50cy5zdGFja1RvcDsgaSA+PSB0YXJnZXQ7IGktLSkge1xuICAgICAgICAgICAgcC5fc2V0RW5kTG9jYXRpb24ocC5vcGVuRWxlbWVudHMuaXRlbXNbaV0sIHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBIYW5kbGUgYGh0bWxgIGFuZCBgYm9keWBcbiAgICAgICAgaWYgKCFwLmZyYWdtZW50Q29udGV4dCAmJiBwLm9wZW5FbGVtZW50cy5zdGFja1RvcCA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBodG1sRWxlbWVudCA9IHAub3BlbkVsZW1lbnRzLml0ZW1zWzBdO1xuICAgICAgICAgICAgY29uc3QgaHRtbExvY2F0aW9uID0gcC50cmVlQWRhcHRlci5nZXROb2RlU291cmNlQ29kZUxvY2F0aW9uKGh0bWxFbGVtZW50KTtcbiAgICAgICAgICAgIGlmIChodG1sTG9jYXRpb24gJiYgIWh0bWxMb2NhdGlvbi5lbmRUYWcpIHtcbiAgICAgICAgICAgICAgICBwLl9zZXRFbmRMb2NhdGlvbihodG1sRWxlbWVudCwgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5zdGFja1RvcCA+PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHlFbGVtZW50ID0gcC5vcGVuRWxlbWVudHMuaXRlbXNbMV07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHlMb2NhdGlvbiA9IHAudHJlZUFkYXB0ZXIuZ2V0Tm9kZVNvdXJjZUNvZGVMb2NhdGlvbihib2R5RWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib2R5TG9jYXRpb24gJiYgIWJvZHlMb2NhdGlvbi5lbmRUYWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHAuX3NldEVuZExvY2F0aW9uKGJvZHlFbGVtZW50LCB0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyBUaGUgXCJpbml0aWFsXCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBkb2N0eXBlSW5Jbml0aWFsTW9kZShwLCB0b2tlbikge1xuICAgIHAuX3NldERvY3VtZW50VHlwZSh0b2tlbik7XG4gICAgY29uc3QgbW9kZSA9IHRva2VuLmZvcmNlUXVpcmtzID8gaHRtbF9qc18xLkRPQ1VNRU5UX01PREUuUVVJUktTIDogZG9jdHlwZS5nZXREb2N1bWVudE1vZGUodG9rZW4pO1xuICAgIGlmICghZG9jdHlwZS5pc0NvbmZvcm1pbmcodG9rZW4pKSB7XG4gICAgICAgIHAuX2Vycih0b2tlbiwgZXJyb3JfY29kZXNfanNfMS5FUlIubm9uQ29uZm9ybWluZ0RvY3R5cGUpO1xuICAgIH1cbiAgICBwLnRyZWVBZGFwdGVyLnNldERvY3VtZW50TW9kZShwLmRvY3VtZW50LCBtb2RlKTtcbiAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLkJFRk9SRV9IVE1MO1xufVxuZnVuY3Rpb24gdG9rZW5JbkluaXRpYWxNb2RlKHAsIHRva2VuKSB7XG4gICAgcC5fZXJyKHRva2VuLCBlcnJvcl9jb2Rlc19qc18xLkVSUi5taXNzaW5nRG9jdHlwZSwgdHJ1ZSk7XG4gICAgcC50cmVlQWRhcHRlci5zZXREb2N1bWVudE1vZGUocC5kb2N1bWVudCwgaHRtbF9qc18xLkRPQ1VNRU5UX01PREUuUVVJUktTKTtcbiAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLkJFRk9SRV9IVE1MO1xuICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG59XG4vLyBUaGUgXCJiZWZvcmUgaHRtbFwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gc3RhcnRUYWdCZWZvcmVIdG1sKHAsIHRva2VuKSB7XG4gICAgaWYgKHRva2VuLnRhZ0lEID09PSBodG1sX2pzXzEuVEFHX0lELkhUTUwpIHtcbiAgICAgICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLkhUTUwpO1xuICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLkJFRk9SRV9IRUFEO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdG9rZW5CZWZvcmVIdG1sKHAsIHRva2VuKTtcbiAgICB9XG59XG5mdW5jdGlvbiBlbmRUYWdCZWZvcmVIdG1sKHAsIHRva2VuKSB7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdJRDtcbiAgICBpZiAodG4gPT09IGh0bWxfanNfMS5UQUdfSUQuSFRNTCB8fCB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5IRUFEIHx8IHRuID09PSBodG1sX2pzXzEuVEFHX0lELkJPRFkgfHwgdG4gPT09IGh0bWxfanNfMS5UQUdfSUQuQlIpIHtcbiAgICAgICAgdG9rZW5CZWZvcmVIdG1sKHAsIHRva2VuKTtcbiAgICB9XG59XG5mdW5jdGlvbiB0b2tlbkJlZm9yZUh0bWwocCwgdG9rZW4pIHtcbiAgICBwLl9pbnNlcnRGYWtlUm9vdEVsZW1lbnQoKTtcbiAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLkJFRk9SRV9IRUFEO1xuICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG59XG4vLyBUaGUgXCJiZWZvcmUgaGVhZFwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gc3RhcnRUYWdCZWZvcmVIZWFkKHAsIHRva2VuKSB7XG4gICAgc3dpdGNoICh0b2tlbi50YWdJRCkge1xuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSFRNTDoge1xuICAgICAgICAgICAgc3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkhFQUQ6IHtcbiAgICAgICAgICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIGh0bWxfanNfMS5OUy5IVE1MKTtcbiAgICAgICAgICAgIHAuaGVhZEVsZW1lbnQgPSBwLm9wZW5FbGVtZW50cy5jdXJyZW50O1xuICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9IRUFEO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgdG9rZW5CZWZvcmVIZWFkKHAsIHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmZ1bmN0aW9uIGVuZFRhZ0JlZm9yZUhlYWQocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ0lEO1xuICAgIGlmICh0biA9PT0gaHRtbF9qc18xLlRBR19JRC5IRUFEIHx8IHRuID09PSBodG1sX2pzXzEuVEFHX0lELkJPRFkgfHwgdG4gPT09IGh0bWxfanNfMS5UQUdfSUQuSFRNTCB8fCB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5CUikge1xuICAgICAgICB0b2tlbkJlZm9yZUhlYWQocCwgdG9rZW4pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcC5fZXJyKHRva2VuLCBlcnJvcl9jb2Rlc19qc18xLkVSUi5lbmRUYWdXaXRob3V0TWF0Y2hpbmdPcGVuRWxlbWVudCk7XG4gICAgfVxufVxuZnVuY3Rpb24gdG9rZW5CZWZvcmVIZWFkKHAsIHRva2VuKSB7XG4gICAgcC5faW5zZXJ0RmFrZUVsZW1lbnQoaHRtbF9qc18xLlRBR19OQU1FUy5IRUFELCBodG1sX2pzXzEuVEFHX0lELkhFQUQpO1xuICAgIHAuaGVhZEVsZW1lbnQgPSBwLm9wZW5FbGVtZW50cy5jdXJyZW50O1xuICAgIHAuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuSU5fSEVBRDtcbiAgICBwLl9wcm9jZXNzVG9rZW4odG9rZW4pO1xufVxuLy8gVGhlIFwiaW4gaGVhZFwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gc3RhcnRUYWdJbkhlYWQocCwgdG9rZW4pIHtcbiAgICBzd2l0Y2ggKHRva2VuLnRhZ0lEKSB7XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5IVE1MOiB7XG4gICAgICAgICAgICBzdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQkFTRTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkJBU0VGT05UOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQkdTT1VORDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkxJTks6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5NRVRBOiB7XG4gICAgICAgICAgICBwLl9hcHBlbmRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgICAgICAgICB0b2tlbi5hY2tTZWxmQ2xvc2luZyA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVElUTEU6IHtcbiAgICAgICAgICAgIHAuX3N3aXRjaFRvVGV4dFBhcnNpbmcodG9rZW4sIGluZGV4X2pzXzEuVG9rZW5pemVyTW9kZS5SQ0RBVEEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELk5PU0NSSVBUOiB7XG4gICAgICAgICAgICBpZiAocC5vcHRpb25zLnNjcmlwdGluZ0VuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICBwLl9zd2l0Y2hUb1RleHRQYXJzaW5nKHRva2VuLCBpbmRleF9qc18xLlRva2VuaXplck1vZGUuUkFXVEVYVCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9IRUFEX05PX1NDUklQVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5OT0ZSQU1FUzpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlNUWUxFOiB7XG4gICAgICAgICAgICBwLl9zd2l0Y2hUb1RleHRQYXJzaW5nKHRva2VuLCBpbmRleF9qc18xLlRva2VuaXplck1vZGUuUkFXVEVYVCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuU0NSSVBUOiB7XG4gICAgICAgICAgICBwLl9zd2l0Y2hUb1RleHRQYXJzaW5nKHRva2VuLCBpbmRleF9qc18xLlRva2VuaXplck1vZGUuU0NSSVBUX0RBVEEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRFTVBMQVRFOiB7XG4gICAgICAgICAgICBwLl9pbnNlcnRUZW1wbGF0ZSh0b2tlbik7XG4gICAgICAgICAgICBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5pbnNlcnRNYXJrZXIoKTtcbiAgICAgICAgICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xuICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9URU1QTEFURTtcbiAgICAgICAgICAgIHAudG1wbEluc2VydGlvbk1vZGVTdGFjay51bnNoaWZ0KEluc2VydGlvbk1vZGUuSU5fVEVNUExBVEUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkhFQUQ6IHtcbiAgICAgICAgICAgIHAuX2Vycih0b2tlbiwgZXJyb3JfY29kZXNfanNfMS5FUlIubWlzcGxhY2VkU3RhcnRUYWdGb3JIZWFkRWxlbWVudCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICB0b2tlbkluSGVhZChwLCB0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBlbmRUYWdJbkhlYWQocCwgdG9rZW4pIHtcbiAgICBzd2l0Y2ggKHRva2VuLnRhZ0lEKSB7XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5IRUFEOiB7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICAgICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuQUZURVJfSEVBRDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5CT0RZOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQlI6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5IVE1MOiB7XG4gICAgICAgICAgICB0b2tlbkluSGVhZChwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEVNUExBVEU6IHtcbiAgICAgICAgICAgIHRlbXBsYXRlRW5kVGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgIHAuX2Vycih0b2tlbiwgZXJyb3JfY29kZXNfanNfMS5FUlIuZW5kVGFnV2l0aG91dE1hdGNoaW5nT3BlbkVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgfVxufVxuZnVuY3Rpb24gdGVtcGxhdGVFbmRUYWdJbkhlYWQocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMudG1wbENvdW50ID4gMCkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzVGhvcm91Z2hseSgpO1xuICAgICAgICBpZiAocC5vcGVuRWxlbWVudHMuY3VycmVudFRhZ0lkICE9PSBodG1sX2pzXzEuVEFHX0lELlRFTVBMQVRFKSB7XG4gICAgICAgICAgICBwLl9lcnIodG9rZW4sIGVycm9yX2NvZGVzX2pzXzEuRVJSLmNsb3NpbmdPZkVsZW1lbnRXaXRoT3BlbkNoaWxkRWxlbWVudHMpO1xuICAgICAgICB9XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsVGFnTmFtZVBvcHBlZChodG1sX2pzXzEuVEFHX0lELlRFTVBMQVRFKTtcbiAgICAgICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuY2xlYXJUb0xhc3RNYXJrZXIoKTtcbiAgICAgICAgcC50bXBsSW5zZXJ0aW9uTW9kZVN0YWNrLnNoaWZ0KCk7XG4gICAgICAgIHAuX3Jlc2V0SW5zZXJ0aW9uTW9kZSgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcC5fZXJyKHRva2VuLCBlcnJvcl9jb2Rlc19qc18xLkVSUi5lbmRUYWdXaXRob3V0TWF0Y2hpbmdPcGVuRWxlbWVudCk7XG4gICAgfVxufVxuZnVuY3Rpb24gdG9rZW5JbkhlYWQocCwgdG9rZW4pIHtcbiAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLkFGVEVSX0hFQUQ7XG4gICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbn1cbi8vIFRoZSBcImluIGhlYWQgbm8gc2NyaXB0XCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzdGFydFRhZ0luSGVhZE5vU2NyaXB0KHAsIHRva2VuKSB7XG4gICAgc3dpdGNoICh0b2tlbi50YWdJRCkge1xuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSFRNTDoge1xuICAgICAgICAgICAgc3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkJBU0VGT05UOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQkdTT1VORDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkhFQUQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5MSU5LOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuTUVUQTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELk5PRlJBTUVTOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuU1RZTEU6IHtcbiAgICAgICAgICAgIHN0YXJ0VGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5OT1NDUklQVDoge1xuICAgICAgICAgICAgcC5fZXJyKHRva2VuLCBlcnJvcl9jb2Rlc19qc18xLkVSUi5uZXN0ZWROb3NjcmlwdEluSGVhZCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICB0b2tlbkluSGVhZE5vU2NyaXB0KHAsIHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmZ1bmN0aW9uIGVuZFRhZ0luSGVhZE5vU2NyaXB0KHAsIHRva2VuKSB7XG4gICAgc3dpdGNoICh0b2tlbi50YWdJRCkge1xuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuTk9TQ1JJUFQ6IHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9IRUFEO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkJSOiB7XG4gICAgICAgICAgICB0b2tlbkluSGVhZE5vU2NyaXB0KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgIHAuX2Vycih0b2tlbiwgZXJyb3JfY29kZXNfanNfMS5FUlIuZW5kVGFnV2l0aG91dE1hdGNoaW5nT3BlbkVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgfVxufVxuZnVuY3Rpb24gdG9rZW5JbkhlYWROb1NjcmlwdChwLCB0b2tlbikge1xuICAgIGNvbnN0IGVyckNvZGUgPSB0b2tlbi50eXBlID09PSB0b2tlbl9qc18xLlRva2VuVHlwZS5FT0YgPyBlcnJvcl9jb2Rlc19qc18xLkVSUi5vcGVuRWxlbWVudHNMZWZ0QWZ0ZXJFb2YgOiBlcnJvcl9jb2Rlc19qc18xLkVSUi5kaXNhbGxvd2VkQ29udGVudEluTm9zY3JpcHRJbkhlYWQ7XG4gICAgcC5fZXJyKHRva2VuLCBlcnJDb2RlKTtcbiAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX0hFQUQ7XG4gICAgcC5fcHJvY2Vzc1Rva2VuKHRva2VuKTtcbn1cbi8vIFRoZSBcImFmdGVyIGhlYWRcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHN0YXJ0VGFnQWZ0ZXJIZWFkKHAsIHRva2VuKSB7XG4gICAgc3dpdGNoICh0b2tlbi50YWdJRCkge1xuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSFRNTDoge1xuICAgICAgICAgICAgc3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkJPRFk6IHtcbiAgICAgICAgICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIGh0bWxfanNfMS5OUy5IVE1MKTtcbiAgICAgICAgICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xuICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9CT0RZO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkZSQU1FU0VUOiB7XG4gICAgICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX0ZSQU1FU0VUO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkJBU0U6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5CQVNFRk9OVDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkJHU09VTkQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5MSU5LOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuTUVUQTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELk5PRlJBTUVTOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuU0NSSVBUOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuU1RZTEU6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5URU1QTEFURTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRJVExFOiB7XG4gICAgICAgICAgICBwLl9lcnIodG9rZW4sIGVycm9yX2NvZGVzX2pzXzEuRVJSLmFiYW5kb25lZEhlYWRFbGVtZW50Q2hpbGQpO1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucHVzaChwLmhlYWRFbGVtZW50LCBodG1sX2pzXzEuVEFHX0lELkhFQUQpO1xuICAgICAgICAgICAgc3RhcnRUYWdJbkhlYWQocCwgdG9rZW4pO1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucmVtb3ZlKHAuaGVhZEVsZW1lbnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkhFQUQ6IHtcbiAgICAgICAgICAgIHAuX2Vycih0b2tlbiwgZXJyb3JfY29kZXNfanNfMS5FUlIubWlzcGxhY2VkU3RhcnRUYWdGb3JIZWFkRWxlbWVudCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICB0b2tlbkFmdGVySGVhZChwLCB0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBlbmRUYWdBZnRlckhlYWQocCwgdG9rZW4pIHtcbiAgICBzd2l0Y2ggKHRva2VuLnRhZ0lEKSB7XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5CT0RZOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSFRNTDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkJSOiB7XG4gICAgICAgICAgICB0b2tlbkFmdGVySGVhZChwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEVNUExBVEU6IHtcbiAgICAgICAgICAgIHRlbXBsYXRlRW5kVGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgIHAuX2Vycih0b2tlbiwgZXJyb3JfY29kZXNfanNfMS5FUlIuZW5kVGFnV2l0aG91dE1hdGNoaW5nT3BlbkVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgfVxufVxuZnVuY3Rpb24gdG9rZW5BZnRlckhlYWQocCwgdG9rZW4pIHtcbiAgICBwLl9pbnNlcnRGYWtlRWxlbWVudChodG1sX2pzXzEuVEFHX05BTUVTLkJPRFksIGh0bWxfanNfMS5UQUdfSUQuQk9EWSk7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9CT0RZO1xuICAgIG1vZGVJbkJvZHkocCwgdG9rZW4pO1xufVxuLy8gVGhlIFwiaW4gYm9keVwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gbW9kZUluQm9keShwLCB0b2tlbikge1xuICAgIHN3aXRjaCAodG9rZW4udHlwZSkge1xuICAgICAgICBjYXNlIHRva2VuX2pzXzEuVG9rZW5UeXBlLkNIQVJBQ1RFUjoge1xuICAgICAgICAgICAgY2hhcmFjdGVySW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgdG9rZW5fanNfMS5Ub2tlblR5cGUuV0hJVEVTUEFDRV9DSEFSQUNURVI6IHtcbiAgICAgICAgICAgIHdoaXRlc3BhY2VDaGFyYWN0ZXJJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSB0b2tlbl9qc18xLlRva2VuVHlwZS5DT01NRU5UOiB7XG4gICAgICAgICAgICBhcHBlbmRDb21tZW50KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgdG9rZW5fanNfMS5Ub2tlblR5cGUuU1RBUlRfVEFHOiB7XG4gICAgICAgICAgICBzdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIHRva2VuX2pzXzEuVG9rZW5UeXBlLkVORF9UQUc6IHtcbiAgICAgICAgICAgIGVuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIHRva2VuX2pzXzEuVG9rZW5UeXBlLkVPRjoge1xuICAgICAgICAgICAgZW9mSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgIC8vIERvIG5vdGhpbmdcbiAgICB9XG59XG5mdW5jdGlvbiB3aGl0ZXNwYWNlQ2hhcmFjdGVySW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgcC5fcmVjb25zdHJ1Y3RBY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMoKTtcbiAgICBwLl9pbnNlcnRDaGFyYWN0ZXJzKHRva2VuKTtcbn1cbmZ1bmN0aW9uIGNoYXJhY3RlckluQm9keShwLCB0b2tlbikge1xuICAgIHAuX3JlY29uc3RydWN0QWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzKCk7XG4gICAgcC5faW5zZXJ0Q2hhcmFjdGVycyh0b2tlbik7XG4gICAgcC5mcmFtZXNldE9rID0gZmFsc2U7XG59XG5mdW5jdGlvbiBodG1sU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMudG1wbENvdW50ID09PSAwKSB7XG4gICAgICAgIHAudHJlZUFkYXB0ZXIuYWRvcHRBdHRyaWJ1dGVzKHAub3BlbkVsZW1lbnRzLml0ZW1zWzBdLCB0b2tlbi5hdHRycyk7XG4gICAgfVxufVxuZnVuY3Rpb24gYm9keVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgY29uc3QgYm9keUVsZW1lbnQgPSBwLm9wZW5FbGVtZW50cy50cnlQZWVrUHJvcGVybHlOZXN0ZWRCb2R5RWxlbWVudCgpO1xuICAgIGlmIChib2R5RWxlbWVudCAmJiBwLm9wZW5FbGVtZW50cy50bXBsQ291bnQgPT09IDApIHtcbiAgICAgICAgcC5mcmFtZXNldE9rID0gZmFsc2U7XG4gICAgICAgIHAudHJlZUFkYXB0ZXIuYWRvcHRBdHRyaWJ1dGVzKGJvZHlFbGVtZW50LCB0b2tlbi5hdHRycyk7XG4gICAgfVxufVxuZnVuY3Rpb24gZnJhbWVzZXRTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIGNvbnN0IGJvZHlFbGVtZW50ID0gcC5vcGVuRWxlbWVudHMudHJ5UGVla1Byb3Blcmx5TmVzdGVkQm9keUVsZW1lbnQoKTtcbiAgICBpZiAocC5mcmFtZXNldE9rICYmIGJvZHlFbGVtZW50KSB7XG4gICAgICAgIHAudHJlZUFkYXB0ZXIuZGV0YWNoTm9kZShib2R5RWxlbWVudCk7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcEFsbFVwVG9IdG1sRWxlbWVudCgpO1xuICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuSU5fRlJBTUVTRVQ7XG4gICAgfVxufVxuZnVuY3Rpb24gYWRkcmVzc1N0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luQnV0dG9uU2NvcGUoaHRtbF9qc18xLlRBR19JRC5QKSkge1xuICAgICAgICBwLl9jbG9zZVBFbGVtZW50KCk7XG4gICAgfVxuICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIGh0bWxfanNfMS5OUy5IVE1MKTtcbn1cbmZ1bmN0aW9uIG51bWJlcmVkSGVhZGVyU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5CdXR0b25TY29wZShodG1sX2pzXzEuVEFHX0lELlApKSB7XG4gICAgICAgIHAuX2Nsb3NlUEVsZW1lbnQoKTtcbiAgICB9XG4gICAgaWYgKCgwLCBodG1sX2pzXzEuaXNOdW1iZXJlZEhlYWRlcikocC5vcGVuRWxlbWVudHMuY3VycmVudFRhZ0lkKSkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICB9XG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLkhUTUwpO1xufVxuZnVuY3Rpb24gcHJlU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5CdXR0b25TY29wZShodG1sX2pzXzEuVEFHX0lELlApKSB7XG4gICAgICAgIHAuX2Nsb3NlUEVsZW1lbnQoKTtcbiAgICB9XG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLkhUTUwpO1xuICAgIC8vTk9URTogSWYgdGhlIG5leHQgdG9rZW4gaXMgYSBVKzAwMEEgTElORSBGRUVEIChMRikgY2hhcmFjdGVyIHRva2VuLCB0aGVuIGlnbm9yZSB0aGF0IHRva2VuIGFuZCBtb3ZlXG4gICAgLy9vbiB0byB0aGUgbmV4dCBvbmUuIChOZXdsaW5lcyBhdCB0aGUgc3RhcnQgb2YgcHJlIGJsb2NrcyBhcmUgaWdub3JlZCBhcyBhbiBhdXRob3JpbmcgY29udmVuaWVuY2UuKVxuICAgIHAuc2tpcE5leHROZXdMaW5lID0gdHJ1ZTtcbiAgICBwLmZyYW1lc2V0T2sgPSBmYWxzZTtcbn1cbmZ1bmN0aW9uIGZvcm1TdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIGNvbnN0IGluVGVtcGxhdGUgPSBwLm9wZW5FbGVtZW50cy50bXBsQ291bnQgPiAwO1xuICAgIGlmICghcC5mb3JtRWxlbWVudCB8fCBpblRlbXBsYXRlKSB7XG4gICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJbkJ1dHRvblNjb3BlKGh0bWxfanNfMS5UQUdfSUQuUCkpIHtcbiAgICAgICAgICAgIHAuX2Nsb3NlUEVsZW1lbnQoKTtcbiAgICAgICAgfVxuICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgICAgIGlmICghaW5UZW1wbGF0ZSkge1xuICAgICAgICAgICAgcC5mb3JtRWxlbWVudCA9IHAub3BlbkVsZW1lbnRzLmN1cnJlbnQ7XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBsaXN0SXRlbVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgcC5mcmFtZXNldE9rID0gZmFsc2U7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdJRDtcbiAgICBmb3IgKGxldCBpID0gcC5vcGVuRWxlbWVudHMuc3RhY2tUb3A7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnRJZCA9IHAub3BlbkVsZW1lbnRzLnRhZ0lEc1tpXTtcbiAgICAgICAgaWYgKCh0biA9PT0gaHRtbF9qc18xLlRBR19JRC5MSSAmJiBlbGVtZW50SWQgPT09IGh0bWxfanNfMS5UQUdfSUQuTEkpIHx8XG4gICAgICAgICAgICAoKHRuID09PSBodG1sX2pzXzEuVEFHX0lELkREIHx8IHRuID09PSBodG1sX2pzXzEuVEFHX0lELkRUKSAmJiAoZWxlbWVudElkID09PSBodG1sX2pzXzEuVEFHX0lELkREIHx8IGVsZW1lbnRJZCA9PT0gaHRtbF9qc18xLlRBR19JRC5EVCkpKSB7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzV2l0aEV4Y2x1c2lvbihlbGVtZW50SWQpO1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKGVsZW1lbnRJZCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWxlbWVudElkICE9PSBodG1sX2pzXzEuVEFHX0lELkFERFJFU1MgJiZcbiAgICAgICAgICAgIGVsZW1lbnRJZCAhPT0gaHRtbF9qc18xLlRBR19JRC5ESVYgJiZcbiAgICAgICAgICAgIGVsZW1lbnRJZCAhPT0gaHRtbF9qc18xLlRBR19JRC5QICYmXG4gICAgICAgICAgICBwLl9pc1NwZWNpYWxFbGVtZW50KHAub3BlbkVsZW1lbnRzLml0ZW1zW2ldLCBlbGVtZW50SWQpKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5CdXR0b25TY29wZShodG1sX2pzXzEuVEFHX0lELlApKSB7XG4gICAgICAgIHAuX2Nsb3NlUEVsZW1lbnQoKTtcbiAgICB9XG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLkhUTUwpO1xufVxuZnVuY3Rpb24gcGxhaW50ZXh0U3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5CdXR0b25TY29wZShodG1sX2pzXzEuVEFHX0lELlApKSB7XG4gICAgICAgIHAuX2Nsb3NlUEVsZW1lbnQoKTtcbiAgICB9XG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLkhUTUwpO1xuICAgIHAudG9rZW5pemVyLnN0YXRlID0gaW5kZXhfanNfMS5Ub2tlbml6ZXJNb2RlLlBMQUlOVEVYVDtcbn1cbmZ1bmN0aW9uIGJ1dHRvblN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luU2NvcGUoaHRtbF9qc18xLlRBR19JRC5CVVRUT04pKSB7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLmdlbmVyYXRlSW1wbGllZEVuZFRhZ3MoKTtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKGh0bWxfanNfMS5UQUdfSUQuQlVUVE9OKTtcbiAgICB9XG4gICAgcC5fcmVjb25zdHJ1Y3RBY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMoKTtcbiAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgcC5mcmFtZXNldE9rID0gZmFsc2U7XG59XG5mdW5jdGlvbiBhU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBjb25zdCBhY3RpdmVFbGVtZW50RW50cnkgPSBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5nZXRFbGVtZW50RW50cnlJblNjb3BlV2l0aFRhZ05hbWUoaHRtbF9qc18xLlRBR19OQU1FUy5BKTtcbiAgICBpZiAoYWN0aXZlRWxlbWVudEVudHJ5KSB7XG4gICAgICAgIGNhbGxBZG9wdGlvbkFnZW5jeShwLCB0b2tlbik7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnJlbW92ZShhY3RpdmVFbGVtZW50RW50cnkuZWxlbWVudCk7XG4gICAgICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLnJlbW92ZUVudHJ5KGFjdGl2ZUVsZW1lbnRFbnRyeSk7XG4gICAgfVxuICAgIHAuX3JlY29uc3RydWN0QWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzKCk7XG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLkhUTUwpO1xuICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLnB1c2hFbGVtZW50KHAub3BlbkVsZW1lbnRzLmN1cnJlbnQsIHRva2VuKTtcbn1cbmZ1bmN0aW9uIGJTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIHAuX3JlY29uc3RydWN0QWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzKCk7XG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLkhUTUwpO1xuICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLnB1c2hFbGVtZW50KHAub3BlbkVsZW1lbnRzLmN1cnJlbnQsIHRva2VuKTtcbn1cbmZ1bmN0aW9uIG5vYnJTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIHAuX3JlY29uc3RydWN0QWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzKCk7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luU2NvcGUoaHRtbF9qc18xLlRBR19JRC5OT0JSKSkge1xuICAgICAgICBjYWxsQWRvcHRpb25BZ2VuY3kocCwgdG9rZW4pO1xuICAgICAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIH1cbiAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMucHVzaEVsZW1lbnQocC5vcGVuRWxlbWVudHMuY3VycmVudCwgdG9rZW4pO1xufVxuZnVuY3Rpb24gYXBwbGV0U3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIGh0bWxfanNfMS5OUy5IVE1MKTtcbiAgICBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5pbnNlcnRNYXJrZXIoKTtcbiAgICBwLmZyYW1lc2V0T2sgPSBmYWxzZTtcbn1cbmZ1bmN0aW9uIHRhYmxlU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBpZiAocC50cmVlQWRhcHRlci5nZXREb2N1bWVudE1vZGUocC5kb2N1bWVudCkgIT09IGh0bWxfanNfMS5ET0NVTUVOVF9NT0RFLlFVSVJLUyAmJiBwLm9wZW5FbGVtZW50cy5oYXNJbkJ1dHRvblNjb3BlKGh0bWxfanNfMS5UQUdfSUQuUCkpIHtcbiAgICAgICAgcC5fY2xvc2VQRWxlbWVudCgpO1xuICAgIH1cbiAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgcC5mcmFtZXNldE9rID0gZmFsc2U7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRTtcbn1cbmZ1bmN0aW9uIGFyZWFTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIHAuX3JlY29uc3RydWN0QWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzKCk7XG4gICAgcC5fYXBwZW5kRWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLkhUTUwpO1xuICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xuICAgIHRva2VuLmFja1NlbGZDbG9zaW5nID0gdHJ1ZTtcbn1cbmZ1bmN0aW9uIGlzSGlkZGVuSW5wdXQodG9rZW4pIHtcbiAgICBjb25zdCBpbnB1dFR5cGUgPSAoMCwgdG9rZW5fanNfMS5nZXRUb2tlbkF0dHIpKHRva2VuLCBodG1sX2pzXzEuQVRUUlMuVFlQRSk7XG4gICAgcmV0dXJuIGlucHV0VHlwZSAhPSBudWxsICYmIGlucHV0VHlwZS50b0xvd2VyQ2FzZSgpID09PSBISURERU5fSU5QVVRfVFlQRTtcbn1cbmZ1bmN0aW9uIGlucHV0U3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIHAuX2FwcGVuZEVsZW1lbnQodG9rZW4sIGh0bWxfanNfMS5OUy5IVE1MKTtcbiAgICBpZiAoIWlzSGlkZGVuSW5wdXQodG9rZW4pKSB7XG4gICAgICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xuICAgIH1cbiAgICB0b2tlbi5hY2tTZWxmQ2xvc2luZyA9IHRydWU7XG59XG5mdW5jdGlvbiBwYXJhbVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgcC5fYXBwZW5kRWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLkhUTUwpO1xuICAgIHRva2VuLmFja1NlbGZDbG9zaW5nID0gdHJ1ZTtcbn1cbmZ1bmN0aW9uIGhyU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5CdXR0b25TY29wZShodG1sX2pzXzEuVEFHX0lELlApKSB7XG4gICAgICAgIHAuX2Nsb3NlUEVsZW1lbnQoKTtcbiAgICB9XG4gICAgcC5fYXBwZW5kRWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLkhUTUwpO1xuICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xuICAgIHRva2VuLmFja1NlbGZDbG9zaW5nID0gdHJ1ZTtcbn1cbmZ1bmN0aW9uIGltYWdlU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICB0b2tlbi50YWdOYW1lID0gaHRtbF9qc18xLlRBR19OQU1FUy5JTUc7XG4gICAgdG9rZW4udGFnSUQgPSBodG1sX2pzXzEuVEFHX0lELklNRztcbiAgICBhcmVhU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xufVxuZnVuY3Rpb24gdGV4dGFyZWFTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIGh0bWxfanNfMS5OUy5IVE1MKTtcbiAgICAvL05PVEU6IElmIHRoZSBuZXh0IHRva2VuIGlzIGEgVSswMDBBIExJTkUgRkVFRCAoTEYpIGNoYXJhY3RlciB0b2tlbiwgdGhlbiBpZ25vcmUgdGhhdCB0b2tlbiBhbmQgbW92ZVxuICAgIC8vb24gdG8gdGhlIG5leHQgb25lLiAoTmV3bGluZXMgYXQgdGhlIHN0YXJ0IG9mIHRleHRhcmVhIGVsZW1lbnRzIGFyZSBpZ25vcmVkIGFzIGFuIGF1dGhvcmluZyBjb252ZW5pZW5jZS4pXG4gICAgcC5za2lwTmV4dE5ld0xpbmUgPSB0cnVlO1xuICAgIHAudG9rZW5pemVyLnN0YXRlID0gaW5kZXhfanNfMS5Ub2tlbml6ZXJNb2RlLlJDREFUQTtcbiAgICBwLm9yaWdpbmFsSW5zZXJ0aW9uTW9kZSA9IHAuaW5zZXJ0aW9uTW9kZTtcbiAgICBwLmZyYW1lc2V0T2sgPSBmYWxzZTtcbiAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLlRFWFQ7XG59XG5mdW5jdGlvbiB4bXBTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJbkJ1dHRvblNjb3BlKGh0bWxfanNfMS5UQUdfSUQuUCkpIHtcbiAgICAgICAgcC5fY2xvc2VQRWxlbWVudCgpO1xuICAgIH1cbiAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xuICAgIHAuX3N3aXRjaFRvVGV4dFBhcnNpbmcodG9rZW4sIGluZGV4X2pzXzEuVG9rZW5pemVyTW9kZS5SQVdURVhUKTtcbn1cbmZ1bmN0aW9uIGlmcmFtZVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgcC5mcmFtZXNldE9rID0gZmFsc2U7XG4gICAgcC5fc3dpdGNoVG9UZXh0UGFyc2luZyh0b2tlbiwgaW5kZXhfanNfMS5Ub2tlbml6ZXJNb2RlLlJBV1RFWFQpO1xufVxuLy9OT1RFOiBoZXJlIHdlIGFzc3VtZSB0aGF0IHdlIGFsd2F5cyBhY3QgYXMgYW4gdXNlciBhZ2VudCB3aXRoIGVuYWJsZWQgcGx1Z2lucywgc28gd2UgcGFyc2Vcbi8vPG5vZW1iZWQ+IGFzIHJhd3RleHQuXG5mdW5jdGlvbiBub2VtYmVkU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBwLl9zd2l0Y2hUb1RleHRQYXJzaW5nKHRva2VuLCBpbmRleF9qc18xLlRva2VuaXplck1vZGUuUkFXVEVYVCk7XG59XG5mdW5jdGlvbiBzZWxlY3RTdGFydFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIHAuX3JlY29uc3RydWN0QWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzKCk7XG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLkhUTUwpO1xuICAgIHAuZnJhbWVzZXRPayA9IGZhbHNlO1xuICAgIHAuaW5zZXJ0aW9uTW9kZSA9XG4gICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9PT0gSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRSB8fFxuICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID09PSBJbnNlcnRpb25Nb2RlLklOX0NBUFRJT04gfHxcbiAgICAgICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9PT0gSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRV9CT0RZIHx8XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPT09IEluc2VydGlvbk1vZGUuSU5fUk9XIHx8XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPT09IEluc2VydGlvbk1vZGUuSU5fQ0VMTFxuICAgICAgICAgICAgPyBJbnNlcnRpb25Nb2RlLklOX1NFTEVDVF9JTl9UQUJMRVxuICAgICAgICAgICAgOiBJbnNlcnRpb25Nb2RlLklOX1NFTEVDVDtcbn1cbmZ1bmN0aW9uIG9wdGdyb3VwU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMuY3VycmVudFRhZ0lkID09PSBodG1sX2pzXzEuVEFHX0lELk9QVElPTikge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICB9XG4gICAgcC5fcmVjb25zdHJ1Y3RBY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMoKTtcbiAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG59XG5mdW5jdGlvbiByYlN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luU2NvcGUoaHRtbF9qc18xLlRBR19JRC5SVUJZKSkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzKCk7XG4gICAgfVxuICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIGh0bWxfanNfMS5OUy5IVE1MKTtcbn1cbmZ1bmN0aW9uIHJ0U3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5TY29wZShodG1sX2pzXzEuVEFHX0lELlJVQlkpKSB7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLmdlbmVyYXRlSW1wbGllZEVuZFRhZ3NXaXRoRXhjbHVzaW9uKGh0bWxfanNfMS5UQUdfSUQuUlRDKTtcbiAgICB9XG4gICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLkhUTUwpO1xufVxuZnVuY3Rpb24gbWF0aFN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgcC5fcmVjb25zdHJ1Y3RBY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMoKTtcbiAgICBmb3JlaWduQ29udGVudC5hZGp1c3RUb2tlbk1hdGhNTEF0dHJzKHRva2VuKTtcbiAgICBmb3JlaWduQ29udGVudC5hZGp1c3RUb2tlblhNTEF0dHJzKHRva2VuKTtcbiAgICBpZiAodG9rZW4uc2VsZkNsb3NpbmcpIHtcbiAgICAgICAgcC5fYXBwZW5kRWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLk1BVEhNTCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuTUFUSE1MKTtcbiAgICB9XG4gICAgdG9rZW4uYWNrU2VsZkNsb3NpbmcgPSB0cnVlO1xufVxuZnVuY3Rpb24gc3ZnU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIGZvcmVpZ25Db250ZW50LmFkanVzdFRva2VuU1ZHQXR0cnModG9rZW4pO1xuICAgIGZvcmVpZ25Db250ZW50LmFkanVzdFRva2VuWE1MQXR0cnModG9rZW4pO1xuICAgIGlmICh0b2tlbi5zZWxmQ2xvc2luZykge1xuICAgICAgICBwLl9hcHBlbmRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuU1ZHKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIGh0bWxfanNfMS5OUy5TVkcpO1xuICAgIH1cbiAgICB0b2tlbi5hY2tTZWxmQ2xvc2luZyA9IHRydWU7XG59XG5mdW5jdGlvbiBnZW5lcmljU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBwLl9yZWNvbnN0cnVjdEFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cygpO1xuICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIGh0bWxfanNfMS5OUy5IVE1MKTtcbn1cbmZ1bmN0aW9uIHN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgc3dpdGNoICh0b2tlbi50YWdJRCkge1xuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlM6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5COlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkVNOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVFQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5CSUc6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5DT0RFOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRk9OVDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlNNQUxMOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuU1RSSUtFOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuU1RST05HOiB7XG4gICAgICAgICAgICBiU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkE6IHtcbiAgICAgICAgICAgIGFTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSDE6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5IMjpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkgzOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSDQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5INTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkg2OiB7XG4gICAgICAgICAgICBudW1iZXJlZEhlYWRlclN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5QOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuREw6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5PTDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlVMOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRElWOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRElSOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuTkFWOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuTUFJTjpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELk1FTlU6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5BU0lERTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNFTlRFUjpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkZJR1VSRTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkZPT1RFUjpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkhFQURFUjpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkhHUk9VUDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkRJQUxPRzpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkRFVEFJTFM6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5BRERSRVNTOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQVJUSUNMRTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlNFQ1RJT046XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5TVU1NQVJZOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRklFTERTRVQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5CTE9DS1FVT1RFOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRklHQ0FQVElPTjoge1xuICAgICAgICAgICAgYWRkcmVzc1N0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5MSTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkREOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRFQ6IHtcbiAgICAgICAgICAgIGxpc3RJdGVtU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkJSOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSU1HOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuV0JSOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQVJFQTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkVNQkVEOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuS0VZR0VOOiB7XG4gICAgICAgICAgICBhcmVhU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkhSOiB7XG4gICAgICAgICAgICBoclN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5SQjpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlJUQzoge1xuICAgICAgICAgICAgcmJTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuUlQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5SUDoge1xuICAgICAgICAgICAgcnRTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuUFJFOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuTElTVElORzoge1xuICAgICAgICAgICAgcHJlU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlhNUDoge1xuICAgICAgICAgICAgeG1wU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlNWRzoge1xuICAgICAgICAgICAgc3ZnU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkhUTUw6IHtcbiAgICAgICAgICAgIGh0bWxTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQkFTRTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkxJTks6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5NRVRBOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuU1RZTEU6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5USVRMRTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlNDUklQVDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkJHU09VTkQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5CQVNFRk9OVDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRFTVBMQVRFOiB7XG4gICAgICAgICAgICBzdGFydFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQk9EWToge1xuICAgICAgICAgICAgYm9keVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5GT1JNOiB7XG4gICAgICAgICAgICBmb3JtU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELk5PQlI6IHtcbiAgICAgICAgICAgIG5vYnJTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuTUFUSDoge1xuICAgICAgICAgICAgbWF0aFN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UQUJMRToge1xuICAgICAgICAgICAgdGFibGVTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSU5QVVQ6IHtcbiAgICAgICAgICAgIGlucHV0U3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlBBUkFNOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVFJBQ0s6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5TT1VSQ0U6IHtcbiAgICAgICAgICAgIHBhcmFtU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELklNQUdFOiB7XG4gICAgICAgICAgICBpbWFnZVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5CVVRUT046IHtcbiAgICAgICAgICAgIGJ1dHRvblN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5BUFBMRVQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5PQkpFQ1Q6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5NQVJRVUVFOiB7XG4gICAgICAgICAgICBhcHBsZXRTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSUZSQU1FOiB7XG4gICAgICAgICAgICBpZnJhbWVTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuU0VMRUNUOiB7XG4gICAgICAgICAgICBzZWxlY3RTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuT1BUSU9OOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuT1BUR1JPVVA6IHtcbiAgICAgICAgICAgIG9wdGdyb3VwU3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELk5PRU1CRUQ6IHtcbiAgICAgICAgICAgIG5vZW1iZWRTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRlJBTUVTRVQ6IHtcbiAgICAgICAgICAgIGZyYW1lc2V0U3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRFWFRBUkVBOiB7XG4gICAgICAgICAgICB0ZXh0YXJlYVN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5OT1NDUklQVDoge1xuICAgICAgICAgICAgaWYgKHAub3B0aW9ucy5zY3JpcHRpbmdFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgbm9lbWJlZFN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGdlbmVyaWNTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuUExBSU5URVhUOiB7XG4gICAgICAgICAgICBwbGFpbnRleHRTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ09MOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEg6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5URDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRSOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSEVBRDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkZSQU1FOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEJPRFk6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5URk9PVDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRIRUFEOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ0FQVElPTjpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNPTEdST1VQOiB7XG4gICAgICAgICAgICAvLyBJZ25vcmUgdG9rZW5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgIGdlbmVyaWNTdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBib2R5RW5kVGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luU2NvcGUoaHRtbF9qc18xLlRBR19JRC5CT0RZKSkge1xuICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLkFGVEVSX0JPRFk7XG4gICAgICAgIC8vTk9URTogPGJvZHk+IGlzIG5ldmVyIHBvcHBlZCBmcm9tIHRoZSBzdGFjaywgc28gd2UgbmVlZCB0byB1cGRhdGVkXG4gICAgICAgIC8vdGhlIGVuZCBsb2NhdGlvbiBleHBsaWNpdGx5LlxuICAgICAgICBpZiAocC5vcHRpb25zLnNvdXJjZUNvZGVMb2NhdGlvbkluZm8pIHtcbiAgICAgICAgICAgIGNvbnN0IGJvZHlFbGVtZW50ID0gcC5vcGVuRWxlbWVudHMudHJ5UGVla1Byb3Blcmx5TmVzdGVkQm9keUVsZW1lbnQoKTtcbiAgICAgICAgICAgIGlmIChib2R5RWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHAuX3NldEVuZExvY2F0aW9uKGJvZHlFbGVtZW50LCB0b2tlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBodG1sRW5kVGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luU2NvcGUoaHRtbF9qc18xLlRBR19JRC5CT0RZKSkge1xuICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLkFGVEVSX0JPRFk7XG4gICAgICAgIGVuZFRhZ0FmdGVyQm9keShwLCB0b2tlbik7XG4gICAgfVxufVxuZnVuY3Rpb24gYWRkcmVzc0VuZFRhZ0luQm9keShwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnSUQ7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luU2NvcGUodG4pKSB7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLmdlbmVyYXRlSW1wbGllZEVuZFRhZ3MoKTtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKHRuKTtcbiAgICB9XG59XG5mdW5jdGlvbiBmb3JtRW5kVGFnSW5Cb2R5KHApIHtcbiAgICBjb25zdCBpblRlbXBsYXRlID0gcC5vcGVuRWxlbWVudHMudG1wbENvdW50ID4gMDtcbiAgICBjb25zdCB7IGZvcm1FbGVtZW50IH0gPSBwO1xuICAgIGlmICghaW5UZW1wbGF0ZSkge1xuICAgICAgICBwLmZvcm1FbGVtZW50ID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKChmb3JtRWxlbWVudCB8fCBpblRlbXBsYXRlKSAmJiBwLm9wZW5FbGVtZW50cy5oYXNJblNjb3BlKGh0bWxfanNfMS5UQUdfSUQuRk9STSkpIHtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMuZ2VuZXJhdGVJbXBsaWVkRW5kVGFncygpO1xuICAgICAgICBpZiAoaW5UZW1wbGF0ZSkge1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKGh0bWxfanNfMS5UQUdfSUQuRk9STSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZm9ybUVsZW1lbnQpIHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnJlbW92ZShmb3JtRWxlbWVudCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBwRW5kVGFnSW5Cb2R5KHApIHtcbiAgICBpZiAoIXAub3BlbkVsZW1lbnRzLmhhc0luQnV0dG9uU2NvcGUoaHRtbF9qc18xLlRBR19JRC5QKSkge1xuICAgICAgICBwLl9pbnNlcnRGYWtlRWxlbWVudChodG1sX2pzXzEuVEFHX05BTUVTLlAsIGh0bWxfanNfMS5UQUdfSUQuUCk7XG4gICAgfVxuICAgIHAuX2Nsb3NlUEVsZW1lbnQoKTtcbn1cbmZ1bmN0aW9uIGxpRW5kVGFnSW5Cb2R5KHApIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5MaXN0SXRlbVNjb3BlKGh0bWxfanNfMS5UQUdfSUQuTEkpKSB7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLmdlbmVyYXRlSW1wbGllZEVuZFRhZ3NXaXRoRXhjbHVzaW9uKGh0bWxfanNfMS5UQUdfSUQuTEkpO1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3BVbnRpbFRhZ05hbWVQb3BwZWQoaHRtbF9qc18xLlRBR19JRC5MSSk7XG4gICAgfVxufVxuZnVuY3Rpb24gZGRFbmRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ0lEO1xuICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblNjb3BlKHRuKSkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzV2l0aEV4Y2x1c2lvbih0bik7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsVGFnTmFtZVBvcHBlZCh0bik7XG4gICAgfVxufVxuZnVuY3Rpb24gbnVtYmVyZWRIZWFkZXJFbmRUYWdJbkJvZHkocCkge1xuICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNOdW1iZXJlZEhlYWRlckluU2NvcGUoKSkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzKCk7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsTnVtYmVyZWRIZWFkZXJQb3BwZWQoKTtcbiAgICB9XG59XG5mdW5jdGlvbiBhcHBsZXRFbmRUYWdJbkJvZHkocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ0lEO1xuICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblNjb3BlKHRuKSkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzKCk7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsVGFnTmFtZVBvcHBlZCh0bik7XG4gICAgICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLmNsZWFyVG9MYXN0TWFya2VyKCk7XG4gICAgfVxufVxuZnVuY3Rpb24gYnJFbmRUYWdJbkJvZHkocCkge1xuICAgIHAuX3JlY29uc3RydWN0QWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzKCk7XG4gICAgcC5faW5zZXJ0RmFrZUVsZW1lbnQoaHRtbF9qc18xLlRBR19OQU1FUy5CUiwgaHRtbF9qc18xLlRBR19JRC5CUik7XG4gICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgcC5mcmFtZXNldE9rID0gZmFsc2U7XG59XG5mdW5jdGlvbiBnZW5lcmljRW5kVGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdOYW1lO1xuICAgIGNvbnN0IHRpZCA9IHRva2VuLnRhZ0lEO1xuICAgIGZvciAobGV0IGkgPSBwLm9wZW5FbGVtZW50cy5zdGFja1RvcDsgaSA+IDA7IGktLSkge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gcC5vcGVuRWxlbWVudHMuaXRlbXNbaV07XG4gICAgICAgIGNvbnN0IGVsZW1lbnRJZCA9IHAub3BlbkVsZW1lbnRzLnRhZ0lEc1tpXTtcbiAgICAgICAgLy8gQ29tcGFyZSB0aGUgdGFnIG5hbWUgaGVyZSwgYXMgdGhlIHRhZyBtaWdodCBub3QgYmUgYSBrbm93biB0YWcgd2l0aCBhbiBJRC5cbiAgICAgICAgaWYgKHRpZCA9PT0gZWxlbWVudElkICYmICh0aWQgIT09IGh0bWxfanNfMS5UQUdfSUQuVU5LTk9XTiB8fCBwLnRyZWVBZGFwdGVyLmdldFRhZ05hbWUoZWxlbWVudCkgPT09IHRuKSkge1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMuZ2VuZXJhdGVJbXBsaWVkRW5kVGFnc1dpdGhFeGNsdXNpb24odGlkKTtcbiAgICAgICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5zdGFja1RvcCA+PSBpKVxuICAgICAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnNob3J0ZW5Ub0xlbmd0aChpKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwLl9pc1NwZWNpYWxFbGVtZW50KGVsZW1lbnQsIGVsZW1lbnRJZCkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxufVxuZnVuY3Rpb24gZW5kVGFnSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgc3dpdGNoICh0b2tlbi50YWdJRCkge1xuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkI6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5JOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuUzpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlU6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5FTTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRUOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQklHOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ09ERTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkZPTlQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5OT0JSOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuU01BTEw6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5TVFJJS0U6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5TVFJPTkc6IHtcbiAgICAgICAgICAgIGNhbGxBZG9wdGlvbkFnZW5jeShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuUDoge1xuICAgICAgICAgICAgcEVuZFRhZ0luQm9keShwKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5ETDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlVMOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuT0w6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5ESVI6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5ESVY6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5OQVY6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5QUkU6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5NQUlOOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuTUVOVTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkFTSURFOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQlVUVE9OOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ0VOVEVSOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRklHVVJFOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRk9PVEVSOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSEVBREVSOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSEdST1VQOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRElBTE9HOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQUREUkVTUzpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkFSVElDTEU6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5ERVRBSUxTOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuU0VDVElPTjpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlNVTU1BUlk6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5MSVNUSU5HOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRklFTERTRVQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5CTE9DS1FVT1RFOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRklHQ0FQVElPTjoge1xuICAgICAgICAgICAgYWRkcmVzc0VuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuTEk6IHtcbiAgICAgICAgICAgIGxpRW5kVGFnSW5Cb2R5KHApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkREOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRFQ6IHtcbiAgICAgICAgICAgIGRkRW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5IMTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkgyOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSDM6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5INDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkg1OlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSDY6IHtcbiAgICAgICAgICAgIG51bWJlcmVkSGVhZGVyRW5kVGFnSW5Cb2R5KHApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkJSOiB7XG4gICAgICAgICAgICBickVuZFRhZ0luQm9keShwKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5CT0RZOiB7XG4gICAgICAgICAgICBib2R5RW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5IVE1MOiB7XG4gICAgICAgICAgICBodG1sRW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5GT1JNOiB7XG4gICAgICAgICAgICBmb3JtRW5kVGFnSW5Cb2R5KHApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkFQUExFVDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELk9CSkVDVDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELk1BUlFVRUU6IHtcbiAgICAgICAgICAgIGFwcGxldEVuZFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEVNUExBVEU6IHtcbiAgICAgICAgICAgIHRlbXBsYXRlRW5kVGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgIGdlbmVyaWNFbmRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxufVxuZnVuY3Rpb24gZW9mSW5Cb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHAudG1wbEluc2VydGlvbk1vZGVTdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgIGVvZkluVGVtcGxhdGUocCwgdG9rZW4pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc3RvcFBhcnNpbmcocCwgdG9rZW4pO1xuICAgIH1cbn1cbi8vIFRoZSBcInRleHRcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIGVuZFRhZ0luVGV4dChwLCB0b2tlbikge1xuICAgIHZhciBfYTtcbiAgICBpZiAodG9rZW4udGFnSUQgPT09IGh0bWxfanNfMS5UQUdfSUQuU0NSSVBUKSB7XG4gICAgICAgIChfYSA9IHAuc2NyaXB0SGFuZGxlcikgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmNhbGwocCwgcC5vcGVuRWxlbWVudHMuY3VycmVudCk7XG4gICAgfVxuICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgIHAuaW5zZXJ0aW9uTW9kZSA9IHAub3JpZ2luYWxJbnNlcnRpb25Nb2RlO1xufVxuZnVuY3Rpb24gZW9mSW5UZXh0KHAsIHRva2VuKSB7XG4gICAgcC5fZXJyKHRva2VuLCBlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJbkVsZW1lbnRUaGF0Q2FuQ29udGFpbk9ubHlUZXh0KTtcbiAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICBwLmluc2VydGlvbk1vZGUgPSBwLm9yaWdpbmFsSW5zZXJ0aW9uTW9kZTtcbiAgICBwLm9uRW9mKHRva2VuKTtcbn1cbi8vIFRoZSBcImluIHRhYmxlXCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBjaGFyYWN0ZXJJblRhYmxlKHAsIHRva2VuKSB7XG4gICAgaWYgKFRBQkxFX1NUUlVDVFVSRV9UQUdTLmhhcyhwLm9wZW5FbGVtZW50cy5jdXJyZW50VGFnSWQpKSB7XG4gICAgICAgIHAucGVuZGluZ0NoYXJhY3RlclRva2Vucy5sZW5ndGggPSAwO1xuICAgICAgICBwLmhhc05vbldoaXRlc3BhY2VQZW5kaW5nQ2hhcmFjdGVyVG9rZW4gPSBmYWxzZTtcbiAgICAgICAgcC5vcmlnaW5hbEluc2VydGlvbk1vZGUgPSBwLmluc2VydGlvbk1vZGU7XG4gICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuSU5fVEFCTEVfVEVYVDtcbiAgICAgICAgc3dpdGNoICh0b2tlbi50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIHRva2VuX2pzXzEuVG9rZW5UeXBlLkNIQVJBQ1RFUjoge1xuICAgICAgICAgICAgICAgIGNoYXJhY3RlckluVGFibGVUZXh0KHAsIHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdG9rZW5fanNfMS5Ub2tlblR5cGUuV0hJVEVTUEFDRV9DSEFSQUNURVI6IHtcbiAgICAgICAgICAgICAgICB3aGl0ZXNwYWNlQ2hhcmFjdGVySW5UYWJsZVRleHQocCwgdG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWdub3JlIG51bGxcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdG9rZW5JblRhYmxlKHAsIHRva2VuKTtcbiAgICB9XG59XG5mdW5jdGlvbiBjYXB0aW9uU3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKSB7XG4gICAgcC5vcGVuRWxlbWVudHMuY2xlYXJCYWNrVG9UYWJsZUNvbnRleHQoKTtcbiAgICBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5pbnNlcnRNYXJrZXIoKTtcbiAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9DQVBUSU9OO1xufVxuZnVuY3Rpb24gY29sZ3JvdXBTdGFydFRhZ0luVGFibGUocCwgdG9rZW4pIHtcbiAgICBwLm9wZW5FbGVtZW50cy5jbGVhckJhY2tUb1RhYmxlQ29udGV4dCgpO1xuICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIGh0bWxfanNfMS5OUy5IVE1MKTtcbiAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX0NPTFVNTl9HUk9VUDtcbn1cbmZ1bmN0aW9uIGNvbFN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbikge1xuICAgIHAub3BlbkVsZW1lbnRzLmNsZWFyQmFja1RvVGFibGVDb250ZXh0KCk7XG4gICAgcC5faW5zZXJ0RmFrZUVsZW1lbnQoaHRtbF9qc18xLlRBR19OQU1FUy5DT0xHUk9VUCwgaHRtbF9qc18xLlRBR19JRC5DT0xHUk9VUCk7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9DT0xVTU5fR1JPVVA7XG4gICAgc3RhcnRUYWdJbkNvbHVtbkdyb3VwKHAsIHRva2VuKTtcbn1cbmZ1bmN0aW9uIHRib2R5U3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKSB7XG4gICAgcC5vcGVuRWxlbWVudHMuY2xlYXJCYWNrVG9UYWJsZUNvbnRleHQoKTtcbiAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRV9CT0RZO1xufVxuZnVuY3Rpb24gdGRTdGFydFRhZ0luVGFibGUocCwgdG9rZW4pIHtcbiAgICBwLm9wZW5FbGVtZW50cy5jbGVhckJhY2tUb1RhYmxlQ29udGV4dCgpO1xuICAgIHAuX2luc2VydEZha2VFbGVtZW50KGh0bWxfanNfMS5UQUdfTkFNRVMuVEJPRFksIGh0bWxfanNfMS5UQUdfSUQuVEJPRFkpO1xuICAgIHAuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuSU5fVEFCTEVfQk9EWTtcbiAgICBzdGFydFRhZ0luVGFibGVCb2R5KHAsIHRva2VuKTtcbn1cbmZ1bmN0aW9uIHRhYmxlU3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luVGFibGVTY29wZShodG1sX2pzXzEuVEFHX0lELlRBQkxFKSkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3BVbnRpbFRhZ05hbWVQb3BwZWQoaHRtbF9qc18xLlRBR19JRC5UQUJMRSk7XG4gICAgICAgIHAuX3Jlc2V0SW5zZXJ0aW9uTW9kZSgpO1xuICAgICAgICBwLl9wcm9jZXNzU3RhcnRUYWcodG9rZW4pO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGlucHV0U3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKSB7XG4gICAgaWYgKGlzSGlkZGVuSW5wdXQodG9rZW4pKSB7XG4gICAgICAgIHAuX2FwcGVuZEVsZW1lbnQodG9rZW4sIGh0bWxfanNfMS5OUy5IVE1MKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRva2VuSW5UYWJsZShwLCB0b2tlbik7XG4gICAgfVxuICAgIHRva2VuLmFja1NlbGZDbG9zaW5nID0gdHJ1ZTtcbn1cbmZ1bmN0aW9uIGZvcm1TdGFydFRhZ0luVGFibGUocCwgdG9rZW4pIHtcbiAgICBpZiAoIXAuZm9ybUVsZW1lbnQgJiYgcC5vcGVuRWxlbWVudHMudG1wbENvdW50ID09PSAwKSB7XG4gICAgICAgIHAuX2luc2VydEVsZW1lbnQodG9rZW4sIGh0bWxfanNfMS5OUy5IVE1MKTtcbiAgICAgICAgcC5mb3JtRWxlbWVudCA9IHAub3BlbkVsZW1lbnRzLmN1cnJlbnQ7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbikge1xuICAgIHN3aXRjaCAodG9rZW4udGFnSUQpIHtcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlREOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEg6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UUjoge1xuICAgICAgICAgICAgdGRTdGFydFRhZ0luVGFibGUocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlNUWUxFOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuU0NSSVBUOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEVNUExBVEU6IHtcbiAgICAgICAgICAgIHN0YXJ0VGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5DT0w6IHtcbiAgICAgICAgICAgIGNvbFN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuRk9STToge1xuICAgICAgICAgICAgZm9ybVN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEFCTEU6IHtcbiAgICAgICAgICAgIHRhYmxlU3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UQk9EWTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRGT09UOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEhFQUQ6IHtcbiAgICAgICAgICAgIHRib2R5U3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5JTlBVVDoge1xuICAgICAgICAgICAgaW5wdXRTdGFydFRhZ0luVGFibGUocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNBUFRJT046IHtcbiAgICAgICAgICAgIGNhcHRpb25TdGFydFRhZ0luVGFibGUocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNPTEdST1VQOiB7XG4gICAgICAgICAgICBjb2xncm91cFN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICB0b2tlbkluVGFibGUocCwgdG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxufVxuZnVuY3Rpb24gZW5kVGFnSW5UYWJsZShwLCB0b2tlbikge1xuICAgIHN3aXRjaCAodG9rZW4udGFnSUQpIHtcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRBQkxFOiB7XG4gICAgICAgICAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5UYWJsZVNjb3BlKGh0bWxfanNfMS5UQUdfSUQuVEFCTEUpKSB7XG4gICAgICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKGh0bWxfanNfMS5UQUdfSUQuVEFCTEUpO1xuICAgICAgICAgICAgICAgIHAuX3Jlc2V0SW5zZXJ0aW9uTW9kZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRFTVBMQVRFOiB7XG4gICAgICAgICAgICB0ZW1wbGF0ZUVuZFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQk9EWTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNBUFRJT046XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5DT0w6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5DT0xHUk9VUDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkhUTUw6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UQk9EWTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlREOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEZPT1Q6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5USDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRIRUFEOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVFI6IHtcbiAgICAgICAgICAgIC8vIElnbm9yZSB0b2tlblxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgdG9rZW5JblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmZ1bmN0aW9uIHRva2VuSW5UYWJsZShwLCB0b2tlbikge1xuICAgIGNvbnN0IHNhdmVkRm9zdGVyUGFyZW50aW5nU3RhdGUgPSBwLmZvc3RlclBhcmVudGluZ0VuYWJsZWQ7XG4gICAgcC5mb3N0ZXJQYXJlbnRpbmdFbmFibGVkID0gdHJ1ZTtcbiAgICAvLyBQcm9jZXNzIHRva2VuIGluIGBJbiBCb2R5YCBtb2RlXG4gICAgbW9kZUluQm9keShwLCB0b2tlbik7XG4gICAgcC5mb3N0ZXJQYXJlbnRpbmdFbmFibGVkID0gc2F2ZWRGb3N0ZXJQYXJlbnRpbmdTdGF0ZTtcbn1cbi8vIFRoZSBcImluIHRhYmxlIHRleHRcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHdoaXRlc3BhY2VDaGFyYWN0ZXJJblRhYmxlVGV4dChwLCB0b2tlbikge1xuICAgIHAucGVuZGluZ0NoYXJhY3RlclRva2Vucy5wdXNoKHRva2VuKTtcbn1cbmZ1bmN0aW9uIGNoYXJhY3RlckluVGFibGVUZXh0KHAsIHRva2VuKSB7XG4gICAgcC5wZW5kaW5nQ2hhcmFjdGVyVG9rZW5zLnB1c2godG9rZW4pO1xuICAgIHAuaGFzTm9uV2hpdGVzcGFjZVBlbmRpbmdDaGFyYWN0ZXJUb2tlbiA9IHRydWU7XG59XG5mdW5jdGlvbiB0b2tlbkluVGFibGVUZXh0KHAsIHRva2VuKSB7XG4gICAgbGV0IGkgPSAwO1xuICAgIGlmIChwLmhhc05vbldoaXRlc3BhY2VQZW5kaW5nQ2hhcmFjdGVyVG9rZW4pIHtcbiAgICAgICAgZm9yICg7IGkgPCBwLnBlbmRpbmdDaGFyYWN0ZXJUb2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRva2VuSW5UYWJsZShwLCBwLnBlbmRpbmdDaGFyYWN0ZXJUb2tlbnNbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBmb3IgKDsgaSA8IHAucGVuZGluZ0NoYXJhY3RlclRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcC5faW5zZXJ0Q2hhcmFjdGVycyhwLnBlbmRpbmdDaGFyYWN0ZXJUb2tlbnNbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHAuaW5zZXJ0aW9uTW9kZSA9IHAub3JpZ2luYWxJbnNlcnRpb25Nb2RlO1xuICAgIHAuX3Byb2Nlc3NUb2tlbih0b2tlbik7XG59XG4vLyBUaGUgXCJpbiBjYXB0aW9uXCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5jb25zdCBUQUJMRV9WT0lEX0VMRU1FTlRTID0gbmV3IFNldChbaHRtbF9qc18xLlRBR19JRC5DQVBUSU9OLCBodG1sX2pzXzEuVEFHX0lELkNPTCwgaHRtbF9qc18xLlRBR19JRC5DT0xHUk9VUCwgaHRtbF9qc18xLlRBR19JRC5UQk9EWSwgaHRtbF9qc18xLlRBR19JRC5URCwgaHRtbF9qc18xLlRBR19JRC5URk9PVCwgaHRtbF9qc18xLlRBR19JRC5USCwgaHRtbF9qc18xLlRBR19JRC5USEVBRCwgaHRtbF9qc18xLlRBR19JRC5UUl0pO1xuZnVuY3Rpb24gc3RhcnRUYWdJbkNhcHRpb24ocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ0lEO1xuICAgIGlmIChUQUJMRV9WT0lEX0VMRU1FTlRTLmhhcyh0bikpIHtcbiAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luVGFibGVTY29wZShodG1sX2pzXzEuVEFHX0lELkNBUFRJT04pKSB7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzKCk7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3BVbnRpbFRhZ05hbWVQb3BwZWQoaHRtbF9qc18xLlRBR19JRC5DQVBUSU9OKTtcbiAgICAgICAgICAgIHAuYWN0aXZlRm9ybWF0dGluZ0VsZW1lbnRzLmNsZWFyVG9MYXN0TWFya2VyKCk7XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX1RBQkxFO1xuICAgICAgICAgICAgc3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGVuZFRhZ0luQ2FwdGlvbihwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnSUQ7XG4gICAgc3dpdGNoICh0bikge1xuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ0FQVElPTjpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRBQkxFOiB7XG4gICAgICAgICAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzSW5UYWJsZVNjb3BlKGh0bWxfanNfMS5UQUdfSUQuQ0FQVElPTikpIHtcbiAgICAgICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzKCk7XG4gICAgICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKGh0bWxfanNfMS5UQUdfSUQuQ0FQVElPTik7XG4gICAgICAgICAgICAgICAgcC5hY3RpdmVGb3JtYXR0aW5nRWxlbWVudHMuY2xlYXJUb0xhc3RNYXJrZXIoKTtcbiAgICAgICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX1RBQkxFO1xuICAgICAgICAgICAgICAgIGlmICh0biA9PT0gaHRtbF9qc18xLlRBR19JRC5UQUJMRSkge1xuICAgICAgICAgICAgICAgICAgICBlbmRUYWdJblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQk9EWTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNPTDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNPTEdST1VQOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSFRNTDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRCT0RZOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5URk9PVDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRIOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEhFQUQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UUjoge1xuICAgICAgICAgICAgLy8gSWdub3JlIHRva2VuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICBlbmRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxufVxuLy8gVGhlIFwiaW4gY29sdW1uIGdyb3VwXCIgaW5zZXJ0aW9uIG1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzdGFydFRhZ0luQ29sdW1uR3JvdXAocCwgdG9rZW4pIHtcbiAgICBzd2l0Y2ggKHRva2VuLnRhZ0lEKSB7XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5IVE1MOiB7XG4gICAgICAgICAgICBzdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ09MOiB7XG4gICAgICAgICAgICBwLl9hcHBlbmRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgICAgICAgICB0b2tlbi5hY2tTZWxmQ2xvc2luZyA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEVNUExBVEU6IHtcbiAgICAgICAgICAgIHN0YXJ0VGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgIHRva2VuSW5Db2x1bW5Hcm91cChwLCB0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBlbmRUYWdJbkNvbHVtbkdyb3VwKHAsIHRva2VuKSB7XG4gICAgc3dpdGNoICh0b2tlbi50YWdJRCkge1xuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ09MR1JPVVA6IHtcbiAgICAgICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5jdXJyZW50VGFnSWQgPT09IGh0bWxfanNfMS5UQUdfSUQuQ09MR1JPVVApIHtcbiAgICAgICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICAgICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX1RBQkxFO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRFTVBMQVRFOiB7XG4gICAgICAgICAgICB0ZW1wbGF0ZUVuZFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ09MOiB7XG4gICAgICAgICAgICAvLyBJZ25vcmUgdG9rZW5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgIHRva2VuSW5Db2x1bW5Hcm91cChwLCB0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiB0b2tlbkluQ29sdW1uR3JvdXAocCwgdG9rZW4pIHtcbiAgICBpZiAocC5vcGVuRWxlbWVudHMuY3VycmVudFRhZ0lkID09PSBodG1sX2pzXzEuVEFHX0lELkNPTEdST1VQKSB7XG4gICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX1RBQkxFO1xuICAgICAgICBwLl9wcm9jZXNzVG9rZW4odG9rZW4pO1xuICAgIH1cbn1cbi8vIFRoZSBcImluIHRhYmxlIGJvZHlcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHN0YXJ0VGFnSW5UYWJsZUJvZHkocCwgdG9rZW4pIHtcbiAgICBzd2l0Y2ggKHRva2VuLnRhZ0lEKSB7XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UUjoge1xuICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMuY2xlYXJCYWNrVG9UYWJsZUJvZHlDb250ZXh0KCk7XG4gICAgICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX1JPVztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5USDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlREOiB7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5jbGVhckJhY2tUb1RhYmxlQm9keUNvbnRleHQoKTtcbiAgICAgICAgICAgIHAuX2luc2VydEZha2VFbGVtZW50KGh0bWxfanNfMS5UQUdfTkFNRVMuVFIsIGh0bWxfanNfMS5UQUdfSUQuVFIpO1xuICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9ST1c7XG4gICAgICAgICAgICBzdGFydFRhZ0luUm93KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5DQVBUSU9OOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ09MOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ09MR1JPVVA6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UQk9EWTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRGT09UOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEhFQUQ6IHtcbiAgICAgICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNUYWJsZUJvZHlDb250ZXh0SW5UYWJsZVNjb3BlKCkpIHtcbiAgICAgICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5jbGVhckJhY2tUb1RhYmxlQm9keUNvbnRleHQoKTtcbiAgICAgICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICAgICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX1RBQkxFO1xuICAgICAgICAgICAgICAgIHN0YXJ0VGFnSW5UYWJsZShwLCB0b2tlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICBzdGFydFRhZ0luVGFibGUocCwgdG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxufVxuZnVuY3Rpb24gZW5kVGFnSW5UYWJsZUJvZHkocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ0lEO1xuICAgIHN3aXRjaCAodG9rZW4udGFnSUQpIHtcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRCT0RZOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEZPT1Q6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5USEVBRDoge1xuICAgICAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luVGFibGVTY29wZSh0bikpIHtcbiAgICAgICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5jbGVhckJhY2tUb1RhYmxlQm9keUNvbnRleHQoKTtcbiAgICAgICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICAgICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX1RBQkxFO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRBQkxFOiB7XG4gICAgICAgICAgICBpZiAocC5vcGVuRWxlbWVudHMuaGFzVGFibGVCb2R5Q29udGV4dEluVGFibGVTY29wZSgpKSB7XG4gICAgICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMuY2xlYXJCYWNrVG9UYWJsZUJvZHlDb250ZXh0KCk7XG4gICAgICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRTtcbiAgICAgICAgICAgICAgICBlbmRUYWdJblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5CT0RZOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ0FQVElPTjpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNPTDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNPTEdST1VQOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSFRNTDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlREOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEg6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UUjoge1xuICAgICAgICAgICAgLy8gSWdub3JlIHRva2VuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICBlbmRUYWdJblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIFRoZSBcImluIHJvd1wiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gc3RhcnRUYWdJblJvdyhwLCB0b2tlbikge1xuICAgIHN3aXRjaCAodG9rZW4udGFnSUQpIHtcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRIOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEQ6IHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLmNsZWFyQmFja1RvVGFibGVSb3dDb250ZXh0KCk7XG4gICAgICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX0NFTEw7XG4gICAgICAgICAgICBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5pbnNlcnRNYXJrZXIoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5DQVBUSU9OOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ09MOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ09MR1JPVVA6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UQk9EWTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRGT09UOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEhFQUQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UUjoge1xuICAgICAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luVGFibGVTY29wZShodG1sX2pzXzEuVEFHX0lELlRSKSkge1xuICAgICAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLmNsZWFyQmFja1RvVGFibGVSb3dDb250ZXh0KCk7XG4gICAgICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRV9CT0RZO1xuICAgICAgICAgICAgICAgIHN0YXJ0VGFnSW5UYWJsZUJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgc3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmZ1bmN0aW9uIGVuZFRhZ0luUm93KHAsIHRva2VuKSB7XG4gICAgc3dpdGNoICh0b2tlbi50YWdJRCkge1xuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVFI6IHtcbiAgICAgICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblRhYmxlU2NvcGUoaHRtbF9qc18xLlRBR19JRC5UUikpIHtcbiAgICAgICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5jbGVhckJhY2tUb1RhYmxlUm93Q29udGV4dCgpO1xuICAgICAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgICAgICAgICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuSU5fVEFCTEVfQk9EWTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UQUJMRToge1xuICAgICAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luVGFibGVTY29wZShodG1sX2pzXzEuVEFHX0lELlRSKSkge1xuICAgICAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLmNsZWFyQmFja1RvVGFibGVSb3dDb250ZXh0KCk7XG4gICAgICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRV9CT0RZO1xuICAgICAgICAgICAgICAgIGVuZFRhZ0luVGFibGVCb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5UQk9EWTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRGT09UOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEhFQUQ6IHtcbiAgICAgICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblRhYmxlU2NvcGUodG9rZW4udGFnSUQpIHx8IHAub3BlbkVsZW1lbnRzLmhhc0luVGFibGVTY29wZShodG1sX2pzXzEuVEFHX0lELlRSKSkge1xuICAgICAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLmNsZWFyQmFja1RvVGFibGVSb3dDb250ZXh0KCk7XG4gICAgICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRV9CT0RZO1xuICAgICAgICAgICAgICAgIGVuZFRhZ0luVGFibGVCb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5CT0RZOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ0FQVElPTjpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNPTDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNPTEdST1VQOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSFRNTDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlREOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEg6IHtcbiAgICAgICAgICAgIC8vIElnbm9yZSBlbmQgdGFnXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgZW5kVGFnSW5UYWJsZShwLCB0b2tlbik7XG4gICAgfVxufVxuLy8gVGhlIFwiaW4gY2VsbFwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gc3RhcnRUYWdJbkNlbGwocCwgdG9rZW4pIHtcbiAgICBjb25zdCB0biA9IHRva2VuLnRhZ0lEO1xuICAgIGlmIChUQUJMRV9WT0lEX0VMRU1FTlRTLmhhcyh0bikpIHtcbiAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luVGFibGVTY29wZShodG1sX2pzXzEuVEFHX0lELlREKSB8fCBwLm9wZW5FbGVtZW50cy5oYXNJblRhYmxlU2NvcGUoaHRtbF9qc18xLlRBR19JRC5USCkpIHtcbiAgICAgICAgICAgIHAuX2Nsb3NlVGFibGVDZWxsKCk7XG4gICAgICAgICAgICBzdGFydFRhZ0luUm93KHAsIHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGVuZFRhZ0luQ2VsbChwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnSUQ7XG4gICAgc3dpdGNoICh0bikge1xuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5USDoge1xuICAgICAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luVGFibGVTY29wZSh0bikpIHtcbiAgICAgICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5nZW5lcmF0ZUltcGxpZWRFbmRUYWdzKCk7XG4gICAgICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKHRuKTtcbiAgICAgICAgICAgICAgICBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5jbGVhclRvTGFzdE1hcmtlcigpO1xuICAgICAgICAgICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuSU5fUk9XO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRBQkxFOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEJPRFk6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5URk9PVDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRIRUFEOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVFI6IHtcbiAgICAgICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblRhYmxlU2NvcGUodG4pKSB7XG4gICAgICAgICAgICAgICAgcC5fY2xvc2VUYWJsZUNlbGwoKTtcbiAgICAgICAgICAgICAgICBlbmRUYWdJblJvdyhwLCB0b2tlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQk9EWTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNBUFRJT046XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5DT0w6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5DT0xHUk9VUDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkhUTUw6IHtcbiAgICAgICAgICAgIC8vIElnbm9yZSB0b2tlblxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgZW5kVGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIFRoZSBcImluIHNlbGVjdFwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gc3RhcnRUYWdJblNlbGVjdChwLCB0b2tlbikge1xuICAgIHN3aXRjaCAodG9rZW4udGFnSUQpIHtcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkhUTUw6IHtcbiAgICAgICAgICAgIHN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5PUFRJT046IHtcbiAgICAgICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5jdXJyZW50VGFnSWQgPT09IGh0bWxfanNfMS5UQUdfSUQuT1BUSU9OKSB7XG4gICAgICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuT1BUR1JPVVA6IHtcbiAgICAgICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5jdXJyZW50VGFnSWQgPT09IGh0bWxfanNfMS5UQUdfSUQuT1BUSU9OKSB7XG4gICAgICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocC5vcGVuRWxlbWVudHMuY3VycmVudFRhZ0lkID09PSBodG1sX2pzXzEuVEFHX0lELk9QVEdST1VQKSB7XG4gICAgICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSU5QVVQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5LRVlHRU46XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5URVhUQVJFQTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlNFTEVDVDoge1xuICAgICAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luU2VsZWN0U2NvcGUoaHRtbF9qc18xLlRBR19JRC5TRUxFQ1QpKSB7XG4gICAgICAgICAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKGh0bWxfanNfMS5UQUdfSUQuU0VMRUNUKTtcbiAgICAgICAgICAgICAgICBwLl9yZXNldEluc2VydGlvbk1vZGUoKTtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4udGFnSUQgIT09IGh0bWxfanNfMS5UQUdfSUQuU0VMRUNUKSB7XG4gICAgICAgICAgICAgICAgICAgIHAuX3Byb2Nlc3NTdGFydFRhZyh0b2tlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlNDUklQVDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRFTVBMQVRFOiB7XG4gICAgICAgICAgICBzdGFydFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAvLyBEbyBub3RoaW5nXG4gICAgfVxufVxuZnVuY3Rpb24gZW5kVGFnSW5TZWxlY3QocCwgdG9rZW4pIHtcbiAgICBzd2l0Y2ggKHRva2VuLnRhZ0lEKSB7XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5PUFRHUk9VUDoge1xuICAgICAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLnN0YWNrVG9wID4gMCAmJlxuICAgICAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLmN1cnJlbnRUYWdJZCA9PT0gaHRtbF9qc18xLlRBR19JRC5PUFRJT04gJiZcbiAgICAgICAgICAgICAgICBwLm9wZW5FbGVtZW50cy50YWdJRHNbcC5vcGVuRWxlbWVudHMuc3RhY2tUb3AgLSAxXSA9PT0gaHRtbF9qc18xLlRBR19JRC5PUFRHUk9VUCkge1xuICAgICAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmN1cnJlbnRUYWdJZCA9PT0gaHRtbF9qc18xLlRBR19JRC5PUFRHUk9VUCkge1xuICAgICAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELk9QVElPTjoge1xuICAgICAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmN1cnJlbnRUYWdJZCA9PT0gaHRtbF9qc18xLlRBR19JRC5PUFRJT04pIHtcbiAgICAgICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5TRUxFQ1Q6IHtcbiAgICAgICAgICAgIGlmIChwLm9wZW5FbGVtZW50cy5oYXNJblNlbGVjdFNjb3BlKGh0bWxfanNfMS5UQUdfSUQuU0VMRUNUKSkge1xuICAgICAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsVGFnTmFtZVBvcHBlZChodG1sX2pzXzEuVEFHX0lELlNFTEVDVCk7XG4gICAgICAgICAgICAgICAgcC5fcmVzZXRJbnNlcnRpb25Nb2RlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEVNUExBVEU6IHtcbiAgICAgICAgICAgIHRlbXBsYXRlRW5kVGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgIC8vIERvIG5vdGhpbmdcbiAgICB9XG59XG4vLyBUaGUgXCJpbiBzZWxlY3QgaW4gdGFibGVcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHN0YXJ0VGFnSW5TZWxlY3RJblRhYmxlKHAsIHRva2VuKSB7XG4gICAgY29uc3QgdG4gPSB0b2tlbi50YWdJRDtcbiAgICBpZiAodG4gPT09IGh0bWxfanNfMS5UQUdfSUQuQ0FQVElPTiB8fFxuICAgICAgICB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5UQUJMRSB8fFxuICAgICAgICB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5UQk9EWSB8fFxuICAgICAgICB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5URk9PVCB8fFxuICAgICAgICB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5USEVBRCB8fFxuICAgICAgICB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5UUiB8fFxuICAgICAgICB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5URCB8fFxuICAgICAgICB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5USCkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3BVbnRpbFRhZ05hbWVQb3BwZWQoaHRtbF9qc18xLlRBR19JRC5TRUxFQ1QpO1xuICAgICAgICBwLl9yZXNldEluc2VydGlvbk1vZGUoKTtcbiAgICAgICAgcC5fcHJvY2Vzc1N0YXJ0VGFnKHRva2VuKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHN0YXJ0VGFnSW5TZWxlY3QocCwgdG9rZW4pO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGVuZFRhZ0luU2VsZWN0SW5UYWJsZShwLCB0b2tlbikge1xuICAgIGNvbnN0IHRuID0gdG9rZW4udGFnSUQ7XG4gICAgaWYgKHRuID09PSBodG1sX2pzXzEuVEFHX0lELkNBUFRJT04gfHxcbiAgICAgICAgdG4gPT09IGh0bWxfanNfMS5UQUdfSUQuVEFCTEUgfHxcbiAgICAgICAgdG4gPT09IGh0bWxfanNfMS5UQUdfSUQuVEJPRFkgfHxcbiAgICAgICAgdG4gPT09IGh0bWxfanNfMS5UQUdfSUQuVEZPT1QgfHxcbiAgICAgICAgdG4gPT09IGh0bWxfanNfMS5UQUdfSUQuVEhFQUQgfHxcbiAgICAgICAgdG4gPT09IGh0bWxfanNfMS5UQUdfSUQuVFIgfHxcbiAgICAgICAgdG4gPT09IGh0bWxfanNfMS5UQUdfSUQuVEQgfHxcbiAgICAgICAgdG4gPT09IGh0bWxfanNfMS5UQUdfSUQuVEgpIHtcbiAgICAgICAgaWYgKHAub3BlbkVsZW1lbnRzLmhhc0luVGFibGVTY29wZSh0bikpIHtcbiAgICAgICAgICAgIHAub3BlbkVsZW1lbnRzLnBvcFVudGlsVGFnTmFtZVBvcHBlZChodG1sX2pzXzEuVEFHX0lELlNFTEVDVCk7XG4gICAgICAgICAgICBwLl9yZXNldEluc2VydGlvbk1vZGUoKTtcbiAgICAgICAgICAgIHAub25FbmRUYWcodG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBlbmRUYWdJblNlbGVjdChwLCB0b2tlbik7XG4gICAgfVxufVxuLy8gVGhlIFwiaW4gdGVtcGxhdGVcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHN0YXJ0VGFnSW5UZW1wbGF0ZShwLCB0b2tlbikge1xuICAgIHN3aXRjaCAodG9rZW4udGFnSUQpIHtcbiAgICAgICAgLy8gRmlyc3QsIGhhbmRsZSB0YWdzIHRoYXQgY2FuIHN0YXJ0IHdpdGhvdXQgYSBtb2RlIGNoYW5nZVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQkFTRTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkJBU0VGT05UOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQkdTT1VORDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkxJTks6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5NRVRBOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuTk9GUkFNRVM6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5TQ1JJUFQ6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5TVFlMRTpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRFTVBMQVRFOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVElUTEU6XG4gICAgICAgICAgICBzdGFydFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gUmUtcHJvY2VzcyB0aGUgdG9rZW4gaW4gdGhlIGFwcHJvcHJpYXRlIG1vZGVcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkNBUFRJT046XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5DT0xHUk9VUDpcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRCT0RZOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEZPT1Q6XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5USEVBRDpcbiAgICAgICAgICAgIHAudG1wbEluc2VydGlvbk1vZGVTdGFja1swXSA9IEluc2VydGlvbk1vZGUuSU5fVEFCTEU7XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX1RBQkxFO1xuICAgICAgICAgICAgc3RhcnRUYWdJblRhYmxlKHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuQ09MOlxuICAgICAgICAgICAgcC50bXBsSW5zZXJ0aW9uTW9kZVN0YWNrWzBdID0gSW5zZXJ0aW9uTW9kZS5JTl9DT0xVTU5fR1JPVVA7XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX0NPTFVNTl9HUk9VUDtcbiAgICAgICAgICAgIHN0YXJ0VGFnSW5Db2x1bW5Hcm91cChwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlRSOlxuICAgICAgICAgICAgcC50bXBsSW5zZXJ0aW9uTW9kZVN0YWNrWzBdID0gSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRV9CT0RZO1xuICAgICAgICAgICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9UQUJMRV9CT0RZO1xuICAgICAgICAgICAgc3RhcnRUYWdJblRhYmxlQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELlREOlxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuVEg6XG4gICAgICAgICAgICBwLnRtcGxJbnNlcnRpb25Nb2RlU3RhY2tbMF0gPSBJbnNlcnRpb25Nb2RlLklOX1JPVztcbiAgICAgICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuSU5fUk9XO1xuICAgICAgICAgICAgc3RhcnRUYWdJblJvdyhwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHAudG1wbEluc2VydGlvbk1vZGVTdGFja1swXSA9IEluc2VydGlvbk1vZGUuSU5fQk9EWTtcbiAgICAgICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuSU5fQk9EWTtcbiAgICAgICAgICAgIHN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICB9XG59XG5mdW5jdGlvbiBlbmRUYWdJblRlbXBsYXRlKHAsIHRva2VuKSB7XG4gICAgaWYgKHRva2VuLnRhZ0lEID09PSBodG1sX2pzXzEuVEFHX0lELlRFTVBMQVRFKSB7XG4gICAgICAgIHRlbXBsYXRlRW5kVGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICB9XG59XG5mdW5jdGlvbiBlb2ZJblRlbXBsYXRlKHAsIHRva2VuKSB7XG4gICAgaWYgKHAub3BlbkVsZW1lbnRzLnRtcGxDb3VudCA+IDApIHtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wVW50aWxUYWdOYW1lUG9wcGVkKGh0bWxfanNfMS5UQUdfSUQuVEVNUExBVEUpO1xuICAgICAgICBwLmFjdGl2ZUZvcm1hdHRpbmdFbGVtZW50cy5jbGVhclRvTGFzdE1hcmtlcigpO1xuICAgICAgICBwLnRtcGxJbnNlcnRpb25Nb2RlU3RhY2suc2hpZnQoKTtcbiAgICAgICAgcC5fcmVzZXRJbnNlcnRpb25Nb2RlKCk7XG4gICAgICAgIHAub25Fb2YodG9rZW4pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc3RvcFBhcnNpbmcocCwgdG9rZW4pO1xuICAgIH1cbn1cbi8vIFRoZSBcImFmdGVyIGJvZHlcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHN0YXJ0VGFnQWZ0ZXJCb2R5KHAsIHRva2VuKSB7XG4gICAgaWYgKHRva2VuLnRhZ0lEID09PSBodG1sX2pzXzEuVEFHX0lELkhUTUwpIHtcbiAgICAgICAgc3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdG9rZW5BZnRlckJvZHkocCwgdG9rZW4pO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGVuZFRhZ0FmdGVyQm9keShwLCB0b2tlbikge1xuICAgIHZhciBfYTtcbiAgICBpZiAodG9rZW4udGFnSUQgPT09IGh0bWxfanNfMS5UQUdfSUQuSFRNTCkge1xuICAgICAgICBpZiAoIXAuZnJhZ21lbnRDb250ZXh0KSB7XG4gICAgICAgICAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLkFGVEVSX0FGVEVSX0JPRFk7XG4gICAgICAgIH1cbiAgICAgICAgLy9OT1RFOiA8aHRtbD4gaXMgbmV2ZXIgcG9wcGVkIGZyb20gdGhlIHN0YWNrLCBzbyB3ZSBuZWVkIHRvIHVwZGF0ZWRcbiAgICAgICAgLy90aGUgZW5kIGxvY2F0aW9uIGV4cGxpY2l0bHkuXG4gICAgICAgIGlmIChwLm9wdGlvbnMuc291cmNlQ29kZUxvY2F0aW9uSW5mbyAmJiBwLm9wZW5FbGVtZW50cy50YWdJRHNbMF0gPT09IGh0bWxfanNfMS5UQUdfSUQuSFRNTCkge1xuICAgICAgICAgICAgcC5fc2V0RW5kTG9jYXRpb24ocC5vcGVuRWxlbWVudHMuaXRlbXNbMF0sIHRva2VuKTtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgYm9keSBlbGVtZW50LCBpZiBpdCBkb2Vzbid0IGhhdmUgYW4gZW5kIHRhZ1xuICAgICAgICAgICAgY29uc3QgYm9keUVsZW1lbnQgPSBwLm9wZW5FbGVtZW50cy5pdGVtc1sxXTtcbiAgICAgICAgICAgIGlmIChib2R5RWxlbWVudCAmJiAhKChfYSA9IHAudHJlZUFkYXB0ZXIuZ2V0Tm9kZVNvdXJjZUNvZGVMb2NhdGlvbihib2R5RWxlbWVudCkpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5lbmRUYWcpKSB7XG4gICAgICAgICAgICAgICAgcC5fc2V0RW5kTG9jYXRpb24oYm9keUVsZW1lbnQsIHRva2VuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdG9rZW5BZnRlckJvZHkocCwgdG9rZW4pO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHRva2VuQWZ0ZXJCb2R5KHAsIHRva2VuKSB7XG4gICAgcC5pbnNlcnRpb25Nb2RlID0gSW5zZXJ0aW9uTW9kZS5JTl9CT0RZO1xuICAgIG1vZGVJbkJvZHkocCwgdG9rZW4pO1xufVxuLy8gVGhlIFwiaW4gZnJhbWVzZXRcIiBpbnNlcnRpb24gbW9kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHN0YXJ0VGFnSW5GcmFtZXNldChwLCB0b2tlbikge1xuICAgIHN3aXRjaCAodG9rZW4udGFnSUQpIHtcbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkhUTUw6IHtcbiAgICAgICAgICAgIHN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5GUkFNRVNFVDoge1xuICAgICAgICAgICAgcC5faW5zZXJ0RWxlbWVudCh0b2tlbiwgaHRtbF9qc18xLk5TLkhUTUwpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELkZSQU1FOiB7XG4gICAgICAgICAgICBwLl9hcHBlbmRFbGVtZW50KHRva2VuLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgICAgICAgICB0b2tlbi5hY2tTZWxmQ2xvc2luZyA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuTk9GUkFNRVM6IHtcbiAgICAgICAgICAgIHN0YXJ0VGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgIC8vIERvIG5vdGhpbmdcbiAgICB9XG59XG5mdW5jdGlvbiBlbmRUYWdJbkZyYW1lc2V0KHAsIHRva2VuKSB7XG4gICAgaWYgKHRva2VuLnRhZ0lEID09PSBodG1sX2pzXzEuVEFHX0lELkZSQU1FU0VUICYmICFwLm9wZW5FbGVtZW50cy5pc1Jvb3RIdG1sRWxlbWVudEN1cnJlbnQoKSkge1xuICAgICAgICBwLm9wZW5FbGVtZW50cy5wb3AoKTtcbiAgICAgICAgaWYgKCFwLmZyYWdtZW50Q29udGV4dCAmJiBwLm9wZW5FbGVtZW50cy5jdXJyZW50VGFnSWQgIT09IGh0bWxfanNfMS5UQUdfSUQuRlJBTUVTRVQpIHtcbiAgICAgICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuQUZURVJfRlJBTUVTRVQ7XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyBUaGUgXCJhZnRlciBmcmFtZXNldFwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gc3RhcnRUYWdBZnRlckZyYW1lc2V0KHAsIHRva2VuKSB7XG4gICAgc3dpdGNoICh0b2tlbi50YWdJRCkge1xuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuSFRNTDoge1xuICAgICAgICAgICAgc3RhcnRUYWdJbkJvZHkocCwgdG9rZW4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBodG1sX2pzXzEuVEFHX0lELk5PRlJBTUVTOiB7XG4gICAgICAgICAgICBzdGFydFRhZ0luSGVhZChwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAvLyBEbyBub3RoaW5nXG4gICAgfVxufVxuZnVuY3Rpb24gZW5kVGFnQWZ0ZXJGcmFtZXNldChwLCB0b2tlbikge1xuICAgIGlmICh0b2tlbi50YWdJRCA9PT0gaHRtbF9qc18xLlRBR19JRC5IVE1MKSB7XG4gICAgICAgIHAuaW5zZXJ0aW9uTW9kZSA9IEluc2VydGlvbk1vZGUuQUZURVJfQUZURVJfRlJBTUVTRVQ7XG4gICAgfVxufVxuLy8gVGhlIFwiYWZ0ZXIgYWZ0ZXIgYm9keVwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gc3RhcnRUYWdBZnRlckFmdGVyQm9keShwLCB0b2tlbikge1xuICAgIGlmICh0b2tlbi50YWdJRCA9PT0gaHRtbF9qc18xLlRBR19JRC5IVE1MKSB7XG4gICAgICAgIHN0YXJ0VGFnSW5Cb2R5KHAsIHRva2VuKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRva2VuQWZ0ZXJBZnRlckJvZHkocCwgdG9rZW4pO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHRva2VuQWZ0ZXJBZnRlckJvZHkocCwgdG9rZW4pIHtcbiAgICBwLmluc2VydGlvbk1vZGUgPSBJbnNlcnRpb25Nb2RlLklOX0JPRFk7XG4gICAgbW9kZUluQm9keShwLCB0b2tlbik7XG59XG4vLyBUaGUgXCJhZnRlciBhZnRlciBmcmFtZXNldFwiIGluc2VydGlvbiBtb2RlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gc3RhcnRUYWdBZnRlckFmdGVyRnJhbWVzZXQocCwgdG9rZW4pIHtcbiAgICBzd2l0Y2ggKHRva2VuLnRhZ0lEKSB7XG4gICAgICAgIGNhc2UgaHRtbF9qc18xLlRBR19JRC5IVE1MOiB7XG4gICAgICAgICAgICBzdGFydFRhZ0luQm9keShwLCB0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIGh0bWxfanNfMS5UQUdfSUQuTk9GUkFNRVM6IHtcbiAgICAgICAgICAgIHN0YXJ0VGFnSW5IZWFkKHAsIHRva2VuKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgIC8vIERvIG5vdGhpbmdcbiAgICB9XG59XG4vLyBUaGUgcnVsZXMgZm9yIHBhcnNpbmcgdG9rZW5zIGluIGZvcmVpZ24gY29udGVudFxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIG51bGxDaGFyYWN0ZXJJbkZvcmVpZ25Db250ZW50KHAsIHRva2VuKSB7XG4gICAgdG9rZW4uY2hhcnMgPSB1bmljb2RlLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUjtcbiAgICBwLl9pbnNlcnRDaGFyYWN0ZXJzKHRva2VuKTtcbn1cbmZ1bmN0aW9uIGNoYXJhY3RlckluRm9yZWlnbkNvbnRlbnQocCwgdG9rZW4pIHtcbiAgICBwLl9pbnNlcnRDaGFyYWN0ZXJzKHRva2VuKTtcbiAgICBwLmZyYW1lc2V0T2sgPSBmYWxzZTtcbn1cbmZ1bmN0aW9uIHBvcFVudGlsSHRtbE9ySW50ZWdyYXRpb25Qb2ludChwKSB7XG4gICAgd2hpbGUgKHAudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKHAub3BlbkVsZW1lbnRzLmN1cnJlbnQpICE9PSBodG1sX2pzXzEuTlMuSFRNTCAmJlxuICAgICAgICAhcC5faXNJbnRlZ3JhdGlvblBvaW50KHAub3BlbkVsZW1lbnRzLmN1cnJlbnRUYWdJZCwgcC5vcGVuRWxlbWVudHMuY3VycmVudCkpIHtcbiAgICAgICAgcC5vcGVuRWxlbWVudHMucG9wKCk7XG4gICAgfVxufVxuZnVuY3Rpb24gc3RhcnRUYWdJbkZvcmVpZ25Db250ZW50KHAsIHRva2VuKSB7XG4gICAgaWYgKGZvcmVpZ25Db250ZW50LmNhdXNlc0V4aXQodG9rZW4pKSB7XG4gICAgICAgIHBvcFVudGlsSHRtbE9ySW50ZWdyYXRpb25Qb2ludChwKTtcbiAgICAgICAgcC5fc3RhcnRUYWdPdXRzaWRlRm9yZWlnbkNvbnRlbnQodG9rZW4pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY29uc3QgY3VycmVudCA9IHAuX2dldEFkanVzdGVkQ3VycmVudEVsZW1lbnQoKTtcbiAgICAgICAgY29uc3QgY3VycmVudE5zID0gcC50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkoY3VycmVudCk7XG4gICAgICAgIGlmIChjdXJyZW50TnMgPT09IGh0bWxfanNfMS5OUy5NQVRITUwpIHtcbiAgICAgICAgICAgIGZvcmVpZ25Db250ZW50LmFkanVzdFRva2VuTWF0aE1MQXR0cnModG9rZW4pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnJlbnROcyA9PT0gaHRtbF9qc18xLk5TLlNWRykge1xuICAgICAgICAgICAgZm9yZWlnbkNvbnRlbnQuYWRqdXN0VG9rZW5TVkdUYWdOYW1lKHRva2VuKTtcbiAgICAgICAgICAgIGZvcmVpZ25Db250ZW50LmFkanVzdFRva2VuU1ZHQXR0cnModG9rZW4pO1xuICAgICAgICB9XG4gICAgICAgIGZvcmVpZ25Db250ZW50LmFkanVzdFRva2VuWE1MQXR0cnModG9rZW4pO1xuICAgICAgICBpZiAodG9rZW4uc2VsZkNsb3NpbmcpIHtcbiAgICAgICAgICAgIHAuX2FwcGVuZEVsZW1lbnQodG9rZW4sIGN1cnJlbnROcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwLl9pbnNlcnRFbGVtZW50KHRva2VuLCBjdXJyZW50TnMpO1xuICAgICAgICB9XG4gICAgICAgIHRva2VuLmFja1NlbGZDbG9zaW5nID0gdHJ1ZTtcbiAgICB9XG59XG5mdW5jdGlvbiBlbmRUYWdJbkZvcmVpZ25Db250ZW50KHAsIHRva2VuKSB7XG4gICAgaWYgKHRva2VuLnRhZ0lEID09PSBodG1sX2pzXzEuVEFHX0lELlAgfHwgdG9rZW4udGFnSUQgPT09IGh0bWxfanNfMS5UQUdfSUQuQlIpIHtcbiAgICAgICAgcG9wVW50aWxIdG1sT3JJbnRlZ3JhdGlvblBvaW50KHApO1xuICAgICAgICBwLl9lbmRUYWdPdXRzaWRlRm9yZWlnbkNvbnRlbnQodG9rZW4pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSBwLm9wZW5FbGVtZW50cy5zdGFja1RvcDsgaSA+IDA7IGktLSkge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gcC5vcGVuRWxlbWVudHMuaXRlbXNbaV07XG4gICAgICAgIGlmIChwLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSShlbGVtZW50KSA9PT0gaHRtbF9qc18xLk5TLkhUTUwpIHtcbiAgICAgICAgICAgIHAuX2VuZFRhZ091dHNpZGVGb3JlaWduQ29udGVudCh0b2tlbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0YWdOYW1lID0gcC50cmVlQWRhcHRlci5nZXRUYWdOYW1lKGVsZW1lbnQpO1xuICAgICAgICBpZiAodGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSB0b2tlbi50YWdOYW1lKSB7XG4gICAgICAgICAgICAvL05PVEU6IHVwZGF0ZSB0aGUgdG9rZW4gdGFnIG5hbWUgZm9yIGBfc2V0RW5kTG9jYXRpb25gLlxuICAgICAgICAgICAgdG9rZW4udGFnTmFtZSA9IHRhZ05hbWU7XG4gICAgICAgICAgICBwLm9wZW5FbGVtZW50cy5zaG9ydGVuVG9MZW5ndGgoaSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5PcGVuRWxlbWVudFN0YWNrID0gdm9pZCAwO1xuY29uc3QgaHRtbF9qc18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi9odG1sLmpzXCIpO1xuLy9FbGVtZW50IHV0aWxzXG5jb25zdCBJTVBMSUNJVF9FTkRfVEFHX1JFUVVJUkVEID0gbmV3IFNldChbaHRtbF9qc18xLlRBR19JRC5ERCwgaHRtbF9qc18xLlRBR19JRC5EVCwgaHRtbF9qc18xLlRBR19JRC5MSSwgaHRtbF9qc18xLlRBR19JRC5PUFRHUk9VUCwgaHRtbF9qc18xLlRBR19JRC5PUFRJT04sIGh0bWxfanNfMS5UQUdfSUQuUCwgaHRtbF9qc18xLlRBR19JRC5SQiwgaHRtbF9qc18xLlRBR19JRC5SUCwgaHRtbF9qc18xLlRBR19JRC5SVCwgaHRtbF9qc18xLlRBR19JRC5SVENdKTtcbmNvbnN0IElNUExJQ0lUX0VORF9UQUdfUkVRVUlSRURfVEhPUk9VR0hMWSA9IG5ldyBTZXQoW1xuICAgIC4uLklNUExJQ0lUX0VORF9UQUdfUkVRVUlSRUQsXG4gICAgaHRtbF9qc18xLlRBR19JRC5DQVBUSU9OLFxuICAgIGh0bWxfanNfMS5UQUdfSUQuQ09MR1JPVVAsXG4gICAgaHRtbF9qc18xLlRBR19JRC5UQk9EWSxcbiAgICBodG1sX2pzXzEuVEFHX0lELlRELFxuICAgIGh0bWxfanNfMS5UQUdfSUQuVEZPT1QsXG4gICAgaHRtbF9qc18xLlRBR19JRC5USCxcbiAgICBodG1sX2pzXzEuVEFHX0lELlRIRUFELFxuICAgIGh0bWxfanNfMS5UQUdfSUQuVFIsXG5dKTtcbmNvbnN0IFNDT1BJTkdfRUxFTUVOVF9OUyA9IG5ldyBNYXAoW1xuICAgIFtodG1sX2pzXzEuVEFHX0lELkFQUExFVCwgaHRtbF9qc18xLk5TLkhUTUxdLFxuICAgIFtodG1sX2pzXzEuVEFHX0lELkNBUFRJT04sIGh0bWxfanNfMS5OUy5IVE1MXSxcbiAgICBbaHRtbF9qc18xLlRBR19JRC5IVE1MLCBodG1sX2pzXzEuTlMuSFRNTF0sXG4gICAgW2h0bWxfanNfMS5UQUdfSUQuTUFSUVVFRSwgaHRtbF9qc18xLk5TLkhUTUxdLFxuICAgIFtodG1sX2pzXzEuVEFHX0lELk9CSkVDVCwgaHRtbF9qc18xLk5TLkhUTUxdLFxuICAgIFtodG1sX2pzXzEuVEFHX0lELlRBQkxFLCBodG1sX2pzXzEuTlMuSFRNTF0sXG4gICAgW2h0bWxfanNfMS5UQUdfSUQuVEQsIGh0bWxfanNfMS5OUy5IVE1MXSxcbiAgICBbaHRtbF9qc18xLlRBR19JRC5URU1QTEFURSwgaHRtbF9qc18xLk5TLkhUTUxdLFxuICAgIFtodG1sX2pzXzEuVEFHX0lELlRILCBodG1sX2pzXzEuTlMuSFRNTF0sXG4gICAgW2h0bWxfanNfMS5UQUdfSUQuQU5OT1RBVElPTl9YTUwsIGh0bWxfanNfMS5OUy5NQVRITUxdLFxuICAgIFtodG1sX2pzXzEuVEFHX0lELk1JLCBodG1sX2pzXzEuTlMuTUFUSE1MXSxcbiAgICBbaHRtbF9qc18xLlRBR19JRC5NTiwgaHRtbF9qc18xLk5TLk1BVEhNTF0sXG4gICAgW2h0bWxfanNfMS5UQUdfSUQuTU8sIGh0bWxfanNfMS5OUy5NQVRITUxdLFxuICAgIFtodG1sX2pzXzEuVEFHX0lELk1TLCBodG1sX2pzXzEuTlMuTUFUSE1MXSxcbiAgICBbaHRtbF9qc18xLlRBR19JRC5NVEVYVCwgaHRtbF9qc18xLk5TLk1BVEhNTF0sXG4gICAgW2h0bWxfanNfMS5UQUdfSUQuREVTQywgaHRtbF9qc18xLk5TLlNWR10sXG4gICAgW2h0bWxfanNfMS5UQUdfSUQuRk9SRUlHTl9PQkpFQ1QsIGh0bWxfanNfMS5OUy5TVkddLFxuICAgIFtodG1sX2pzXzEuVEFHX0lELlRJVExFLCBodG1sX2pzXzEuTlMuU1ZHXSxcbl0pO1xuY29uc3QgTkFNRURfSEVBREVSUyA9IFtodG1sX2pzXzEuVEFHX0lELkgxLCBodG1sX2pzXzEuVEFHX0lELkgyLCBodG1sX2pzXzEuVEFHX0lELkgzLCBodG1sX2pzXzEuVEFHX0lELkg0LCBodG1sX2pzXzEuVEFHX0lELkg1LCBodG1sX2pzXzEuVEFHX0lELkg2XTtcbmNvbnN0IFRBQkxFX1JPV19DT05URVhUID0gW2h0bWxfanNfMS5UQUdfSUQuVFIsIGh0bWxfanNfMS5UQUdfSUQuVEVNUExBVEUsIGh0bWxfanNfMS5UQUdfSUQuSFRNTF07XG5jb25zdCBUQUJMRV9CT0RZX0NPTlRFWFQgPSBbaHRtbF9qc18xLlRBR19JRC5UQk9EWSwgaHRtbF9qc18xLlRBR19JRC5URk9PVCwgaHRtbF9qc18xLlRBR19JRC5USEVBRCwgaHRtbF9qc18xLlRBR19JRC5URU1QTEFURSwgaHRtbF9qc18xLlRBR19JRC5IVE1MXTtcbmNvbnN0IFRBQkxFX0NPTlRFWFQgPSBbaHRtbF9qc18xLlRBR19JRC5UQUJMRSwgaHRtbF9qc18xLlRBR19JRC5URU1QTEFURSwgaHRtbF9qc18xLlRBR19JRC5IVE1MXTtcbmNvbnN0IFRBQkxFX0NFTExTID0gW2h0bWxfanNfMS5UQUdfSUQuVEQsIGh0bWxfanNfMS5UQUdfSUQuVEhdO1xuLy9TdGFjayBvZiBvcGVuIGVsZW1lbnRzXG5jbGFzcyBPcGVuRWxlbWVudFN0YWNrIHtcbiAgICBjb25zdHJ1Y3Rvcihkb2N1bWVudCwgdHJlZUFkYXB0ZXIsIGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy50cmVlQWRhcHRlciA9IHRyZWVBZGFwdGVyO1xuICAgICAgICB0aGlzLmhhbmRsZXIgPSBoYW5kbGVyO1xuICAgICAgICB0aGlzLml0ZW1zID0gW107XG4gICAgICAgIHRoaXMudGFnSURzID0gW107XG4gICAgICAgIHRoaXMuc3RhY2tUb3AgPSAtMTtcbiAgICAgICAgdGhpcy50bXBsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLmN1cnJlbnRUYWdJZCA9IGh0bWxfanNfMS5UQUdfSUQuVU5LTk9XTjtcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gZG9jdW1lbnQ7XG4gICAgfVxuICAgIGdldCBjdXJyZW50VG1wbENvbnRlbnRPck5vZGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pc0luVGVtcGxhdGUoKSA/IHRoaXMudHJlZUFkYXB0ZXIuZ2V0VGVtcGxhdGVDb250ZW50KHRoaXMuY3VycmVudCkgOiB0aGlzLmN1cnJlbnQ7XG4gICAgfVxuICAgIC8vSW5kZXggb2YgZWxlbWVudFxuICAgIF9pbmRleE9mKGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXRlbXMubGFzdEluZGV4T2YoZWxlbWVudCwgdGhpcy5zdGFja1RvcCk7XG4gICAgfVxuICAgIC8vVXBkYXRlIGN1cnJlbnQgZWxlbWVudFxuICAgIF9pc0luVGVtcGxhdGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRUYWdJZCA9PT0gaHRtbF9qc18xLlRBR19JRC5URU1QTEFURSAmJiB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSSh0aGlzLmN1cnJlbnQpID09PSBodG1sX2pzXzEuTlMuSFRNTDtcbiAgICB9XG4gICAgX3VwZGF0ZUN1cnJlbnRFbGVtZW50KCkge1xuICAgICAgICB0aGlzLmN1cnJlbnQgPSB0aGlzLml0ZW1zW3RoaXMuc3RhY2tUb3BdO1xuICAgICAgICB0aGlzLmN1cnJlbnRUYWdJZCA9IHRoaXMudGFnSURzW3RoaXMuc3RhY2tUb3BdO1xuICAgIH1cbiAgICAvL011dGF0aW9uc1xuICAgIHB1c2goZWxlbWVudCwgdGFnSUQpIHtcbiAgICAgICAgdGhpcy5zdGFja1RvcCsrO1xuICAgICAgICB0aGlzLml0ZW1zW3RoaXMuc3RhY2tUb3BdID0gZWxlbWVudDtcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gZWxlbWVudDtcbiAgICAgICAgdGhpcy50YWdJRHNbdGhpcy5zdGFja1RvcF0gPSB0YWdJRDtcbiAgICAgICAgdGhpcy5jdXJyZW50VGFnSWQgPSB0YWdJRDtcbiAgICAgICAgaWYgKHRoaXMuX2lzSW5UZW1wbGF0ZSgpKSB7XG4gICAgICAgICAgICB0aGlzLnRtcGxDb3VudCsrO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaGFuZGxlci5vbkl0ZW1QdXNoKGVsZW1lbnQsIHRhZ0lELCB0cnVlKTtcbiAgICB9XG4gICAgcG9wKCkge1xuICAgICAgICBjb25zdCBwb3BwZWQgPSB0aGlzLmN1cnJlbnQ7XG4gICAgICAgIGlmICh0aGlzLnRtcGxDb3VudCA+IDAgJiYgdGhpcy5faXNJblRlbXBsYXRlKCkpIHtcbiAgICAgICAgICAgIHRoaXMudG1wbENvdW50LS07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdGFja1RvcC0tO1xuICAgICAgICB0aGlzLl91cGRhdGVDdXJyZW50RWxlbWVudCgpO1xuICAgICAgICB0aGlzLmhhbmRsZXIub25JdGVtUG9wKHBvcHBlZCwgdHJ1ZSk7XG4gICAgfVxuICAgIHJlcGxhY2Uob2xkRWxlbWVudCwgbmV3RWxlbWVudCkge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLl9pbmRleE9mKG9sZEVsZW1lbnQpO1xuICAgICAgICB0aGlzLml0ZW1zW2lkeF0gPSBuZXdFbGVtZW50O1xuICAgICAgICBpZiAoaWR4ID09PSB0aGlzLnN0YWNrVG9wKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnQgPSBuZXdFbGVtZW50O1xuICAgICAgICB9XG4gICAgfVxuICAgIGluc2VydEFmdGVyKHJlZmVyZW5jZUVsZW1lbnQsIG5ld0VsZW1lbnQsIG5ld0VsZW1lbnRJRCkge1xuICAgICAgICBjb25zdCBpbnNlcnRpb25JZHggPSB0aGlzLl9pbmRleE9mKHJlZmVyZW5jZUVsZW1lbnQpICsgMTtcbiAgICAgICAgdGhpcy5pdGVtcy5zcGxpY2UoaW5zZXJ0aW9uSWR4LCAwLCBuZXdFbGVtZW50KTtcbiAgICAgICAgdGhpcy50YWdJRHMuc3BsaWNlKGluc2VydGlvbklkeCwgMCwgbmV3RWxlbWVudElEKTtcbiAgICAgICAgdGhpcy5zdGFja1RvcCsrO1xuICAgICAgICBpZiAoaW5zZXJ0aW9uSWR4ID09PSB0aGlzLnN0YWNrVG9wKSB7XG4gICAgICAgICAgICB0aGlzLl91cGRhdGVDdXJyZW50RWxlbWVudCgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaGFuZGxlci5vbkl0ZW1QdXNoKHRoaXMuY3VycmVudCwgdGhpcy5jdXJyZW50VGFnSWQsIGluc2VydGlvbklkeCA9PT0gdGhpcy5zdGFja1RvcCk7XG4gICAgfVxuICAgIHBvcFVudGlsVGFnTmFtZVBvcHBlZCh0YWdOYW1lKSB7XG4gICAgICAgIGxldCB0YXJnZXRJZHggPSB0aGlzLnN0YWNrVG9wICsgMTtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgdGFyZ2V0SWR4ID0gdGhpcy50YWdJRHMubGFzdEluZGV4T2YodGFnTmFtZSwgdGFyZ2V0SWR4IC0gMSk7XG4gICAgICAgIH0gd2hpbGUgKHRhcmdldElkeCA+IDAgJiYgdGhpcy50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkodGhpcy5pdGVtc1t0YXJnZXRJZHhdKSAhPT0gaHRtbF9qc18xLk5TLkhUTUwpO1xuICAgICAgICB0aGlzLnNob3J0ZW5Ub0xlbmd0aCh0YXJnZXRJZHggPCAwID8gMCA6IHRhcmdldElkeCk7XG4gICAgfVxuICAgIHNob3J0ZW5Ub0xlbmd0aChpZHgpIHtcbiAgICAgICAgd2hpbGUgKHRoaXMuc3RhY2tUb3AgPj0gaWR4KSB7XG4gICAgICAgICAgICBjb25zdCBwb3BwZWQgPSB0aGlzLmN1cnJlbnQ7XG4gICAgICAgICAgICBpZiAodGhpcy50bXBsQ291bnQgPiAwICYmIHRoaXMuX2lzSW5UZW1wbGF0ZSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50bXBsQ291bnQgLT0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3RhY2tUb3AtLTtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUN1cnJlbnRFbGVtZW50KCk7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZXIub25JdGVtUG9wKHBvcHBlZCwgdGhpcy5zdGFja1RvcCA8IGlkeCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcG9wVW50aWxFbGVtZW50UG9wcGVkKGVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5faW5kZXhPZihlbGVtZW50KTtcbiAgICAgICAgdGhpcy5zaG9ydGVuVG9MZW5ndGgoaWR4IDwgMCA/IDAgOiBpZHgpO1xuICAgIH1cbiAgICBwb3BVbnRpbFBvcHBlZCh0YWdOYW1lcywgdGFyZ2V0TlMpIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5faW5kZXhPZlRhZ05hbWVzKHRhZ05hbWVzLCB0YXJnZXROUyk7XG4gICAgICAgIHRoaXMuc2hvcnRlblRvTGVuZ3RoKGlkeCA8IDAgPyAwIDogaWR4KTtcbiAgICB9XG4gICAgcG9wVW50aWxOdW1iZXJlZEhlYWRlclBvcHBlZCgpIHtcbiAgICAgICAgdGhpcy5wb3BVbnRpbFBvcHBlZChOQU1FRF9IRUFERVJTLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgfVxuICAgIHBvcFVudGlsVGFibGVDZWxsUG9wcGVkKCkge1xuICAgICAgICB0aGlzLnBvcFVudGlsUG9wcGVkKFRBQkxFX0NFTExTLCBodG1sX2pzXzEuTlMuSFRNTCk7XG4gICAgfVxuICAgIHBvcEFsbFVwVG9IdG1sRWxlbWVudCgpIHtcbiAgICAgICAgLy9OT1RFOiBoZXJlIHdlIGFzc3VtZSB0aGF0IHRoZSByb290IDxodG1sPiBlbGVtZW50IGlzIGFsd2F5cyBmaXJzdCBpbiB0aGUgb3BlbiBlbGVtZW50IHN0YWNrLCBzb1xuICAgICAgICAvL3dlIHBlcmZvcm0gdGhpcyBmYXN0IHN0YWNrIGNsZWFuIHVwLlxuICAgICAgICB0aGlzLnRtcGxDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuc2hvcnRlblRvTGVuZ3RoKDEpO1xuICAgIH1cbiAgICBfaW5kZXhPZlRhZ05hbWVzKHRhZ05hbWVzLCBuYW1lc3BhY2UpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuc3RhY2tUb3A7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICBpZiAodGFnTmFtZXMuaW5jbHVkZXModGhpcy50YWdJRHNbaV0pICYmIHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKHRoaXMuaXRlbXNbaV0pID09PSBuYW1lc3BhY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuICAgIGNsZWFyQmFja1RvKHRhZ05hbWVzLCB0YXJnZXROUykge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLl9pbmRleE9mVGFnTmFtZXModGFnTmFtZXMsIHRhcmdldE5TKTtcbiAgICAgICAgdGhpcy5zaG9ydGVuVG9MZW5ndGgoaWR4ICsgMSk7XG4gICAgfVxuICAgIGNsZWFyQmFja1RvVGFibGVDb250ZXh0KCkge1xuICAgICAgICB0aGlzLmNsZWFyQmFja1RvKFRBQkxFX0NPTlRFWFQsIGh0bWxfanNfMS5OUy5IVE1MKTtcbiAgICB9XG4gICAgY2xlYXJCYWNrVG9UYWJsZUJvZHlDb250ZXh0KCkge1xuICAgICAgICB0aGlzLmNsZWFyQmFja1RvKFRBQkxFX0JPRFlfQ09OVEVYVCwgaHRtbF9qc18xLk5TLkhUTUwpO1xuICAgIH1cbiAgICBjbGVhckJhY2tUb1RhYmxlUm93Q29udGV4dCgpIHtcbiAgICAgICAgdGhpcy5jbGVhckJhY2tUbyhUQUJMRV9ST1dfQ09OVEVYVCwgaHRtbF9qc18xLk5TLkhUTUwpO1xuICAgIH1cbiAgICByZW1vdmUoZWxlbWVudCkge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLl9pbmRleE9mKGVsZW1lbnQpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICAgIGlmIChpZHggPT09IHRoaXMuc3RhY2tUb3ApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRhZ0lEcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YWNrVG9wLS07XG4gICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlQ3VycmVudEVsZW1lbnQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZXIub25JdGVtUG9wKGVsZW1lbnQsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvL1NlYXJjaFxuICAgIHRyeVBlZWtQcm9wZXJseU5lc3RlZEJvZHlFbGVtZW50KCkge1xuICAgICAgICAvL1Byb3Blcmx5IG5lc3RlZCA8Ym9keT4gZWxlbWVudCAoc2hvdWxkIGJlIHNlY29uZCBlbGVtZW50IGluIHN0YWNrKS5cbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhY2tUb3AgPj0gMSAmJiB0aGlzLnRhZ0lEc1sxXSA9PT0gaHRtbF9qc18xLlRBR19JRC5CT0RZID8gdGhpcy5pdGVtc1sxXSA6IG51bGw7XG4gICAgfVxuICAgIGNvbnRhaW5zKGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4T2YoZWxlbWVudCkgPiAtMTtcbiAgICB9XG4gICAgZ2V0Q29tbW9uQW5jZXN0b3IoZWxlbWVudCkge1xuICAgICAgICBjb25zdCBlbGVtZW50SWR4ID0gdGhpcy5faW5kZXhPZihlbGVtZW50KSAtIDE7XG4gICAgICAgIHJldHVybiBlbGVtZW50SWR4ID49IDAgPyB0aGlzLml0ZW1zW2VsZW1lbnRJZHhdIDogbnVsbDtcbiAgICB9XG4gICAgaXNSb290SHRtbEVsZW1lbnRDdXJyZW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zdGFja1RvcCA9PT0gMCAmJiB0aGlzLnRhZ0lEc1swXSA9PT0gaHRtbF9qc18xLlRBR19JRC5IVE1MO1xuICAgIH1cbiAgICAvL0VsZW1lbnQgaW4gc2NvcGVcbiAgICBoYXNJblNjb3BlKHRhZ05hbWUpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuc3RhY2tUb3A7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICBjb25zdCB0biA9IHRoaXMudGFnSURzW2ldO1xuICAgICAgICAgICAgY29uc3QgbnMgPSB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSSh0aGlzLml0ZW1zW2ldKTtcbiAgICAgICAgICAgIGlmICh0biA9PT0gdGFnTmFtZSAmJiBucyA9PT0gaHRtbF9qc18xLk5TLkhUTUwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChTQ09QSU5HX0VMRU1FTlRfTlMuZ2V0KHRuKSA9PT0gbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGhhc051bWJlcmVkSGVhZGVySW5TY29wZSgpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuc3RhY2tUb3A7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICBjb25zdCB0biA9IHRoaXMudGFnSURzW2ldO1xuICAgICAgICAgICAgY29uc3QgbnMgPSB0aGlzLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSSh0aGlzLml0ZW1zW2ldKTtcbiAgICAgICAgICAgIGlmICgoMCwgaHRtbF9qc18xLmlzTnVtYmVyZWRIZWFkZXIpKHRuKSAmJiBucyA9PT0gaHRtbF9qc18xLk5TLkhUTUwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChTQ09QSU5HX0VMRU1FTlRfTlMuZ2V0KHRuKSA9PT0gbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGhhc0luTGlzdEl0ZW1TY29wZSh0YWdOYW1lKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLnN0YWNrVG9wOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgY29uc3QgdG4gPSB0aGlzLnRhZ0lEc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IG5zID0gdGhpcy50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkodGhpcy5pdGVtc1tpXSk7XG4gICAgICAgICAgICBpZiAodG4gPT09IHRhZ05hbWUgJiYgbnMgPT09IGh0bWxfanNfMS5OUy5IVE1MKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoKCh0biA9PT0gaHRtbF9qc18xLlRBR19JRC5VTCB8fCB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5PTCkgJiYgbnMgPT09IGh0bWxfanNfMS5OUy5IVE1MKSB8fCBTQ09QSU5HX0VMRU1FTlRfTlMuZ2V0KHRuKSA9PT0gbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGhhc0luQnV0dG9uU2NvcGUodGFnTmFtZSkge1xuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5zdGFja1RvcDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbnN0IHRuID0gdGhpcy50YWdJRHNbaV07XG4gICAgICAgICAgICBjb25zdCBucyA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKHRoaXMuaXRlbXNbaV0pO1xuICAgICAgICAgICAgaWYgKHRuID09PSB0YWdOYW1lICYmIG5zID09PSBodG1sX2pzXzEuTlMuSFRNTCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCh0biA9PT0gaHRtbF9qc18xLlRBR19JRC5CVVRUT04gJiYgbnMgPT09IGh0bWxfanNfMS5OUy5IVE1MKSB8fCBTQ09QSU5HX0VMRU1FTlRfTlMuZ2V0KHRuKSA9PT0gbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGhhc0luVGFibGVTY29wZSh0YWdOYW1lKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLnN0YWNrVG9wOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgY29uc3QgdG4gPSB0aGlzLnRhZ0lEc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IG5zID0gdGhpcy50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkodGhpcy5pdGVtc1tpXSk7XG4gICAgICAgICAgICBpZiAobnMgIT09IGh0bWxfanNfMS5OUy5IVE1MKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG4gPT09IHRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0biA9PT0gaHRtbF9qc18xLlRBR19JRC5UQUJMRSB8fCB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5URU1QTEFURSB8fCB0biA9PT0gaHRtbF9qc18xLlRBR19JRC5IVE1MKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBoYXNUYWJsZUJvZHlDb250ZXh0SW5UYWJsZVNjb3BlKCkge1xuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5zdGFja1RvcDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbnN0IHRuID0gdGhpcy50YWdJRHNbaV07XG4gICAgICAgICAgICBjb25zdCBucyA9IHRoaXMudHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKHRoaXMuaXRlbXNbaV0pO1xuICAgICAgICAgICAgaWYgKG5zICE9PSBodG1sX2pzXzEuTlMuSFRNTCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRuID09PSBodG1sX2pzXzEuVEFHX0lELlRCT0RZIHx8IHRuID09PSBodG1sX2pzXzEuVEFHX0lELlRIRUFEIHx8IHRuID09PSBodG1sX2pzXzEuVEFHX0lELlRGT09UKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG4gPT09IGh0bWxfanNfMS5UQUdfSUQuVEFCTEUgfHwgdG4gPT09IGh0bWxfanNfMS5UQUdfSUQuSFRNTCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaGFzSW5TZWxlY3RTY29wZSh0YWdOYW1lKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLnN0YWNrVG9wOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgY29uc3QgdG4gPSB0aGlzLnRhZ0lEc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IG5zID0gdGhpcy50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkodGhpcy5pdGVtc1tpXSk7XG4gICAgICAgICAgICBpZiAobnMgIT09IGh0bWxfanNfMS5OUy5IVE1MKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG4gPT09IHRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0biAhPT0gaHRtbF9qc18xLlRBR19JRC5PUFRJT04gJiYgdG4gIT09IGh0bWxfanNfMS5UQUdfSUQuT1BUR1JPVVApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vSW1wbGllZCBlbmQgdGFnc1xuICAgIGdlbmVyYXRlSW1wbGllZEVuZFRhZ3MoKSB7XG4gICAgICAgIHdoaWxlIChJTVBMSUNJVF9FTkRfVEFHX1JFUVVJUkVELmhhcyh0aGlzLmN1cnJlbnRUYWdJZCkpIHtcbiAgICAgICAgICAgIHRoaXMucG9wKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ2VuZXJhdGVJbXBsaWVkRW5kVGFnc1Rob3JvdWdobHkoKSB7XG4gICAgICAgIHdoaWxlIChJTVBMSUNJVF9FTkRfVEFHX1JFUVVJUkVEX1RIT1JPVUdITFkuaGFzKHRoaXMuY3VycmVudFRhZ0lkKSkge1xuICAgICAgICAgICAgdGhpcy5wb3AoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBnZW5lcmF0ZUltcGxpZWRFbmRUYWdzV2l0aEV4Y2x1c2lvbihleGNsdXNpb25JZCkge1xuICAgICAgICB3aGlsZSAodGhpcy5jdXJyZW50VGFnSWQgIT09IGV4Y2x1c2lvbklkICYmIElNUExJQ0lUX0VORF9UQUdfUkVRVUlSRURfVEhPUk9VR0hMWS5oYXModGhpcy5jdXJyZW50VGFnSWQpKSB7XG4gICAgICAgICAgICB0aGlzLnBvcCgpO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5PcGVuRWxlbWVudFN0YWNrID0gT3BlbkVsZW1lbnRTdGFjaztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW9wZW4tZWxlbWVudC1zdGFjay5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuc2VyaWFsaXplT3V0ZXIgPSBleHBvcnRzLnNlcmlhbGl6ZSA9IHZvaWQgMDtcbmNvbnN0IGh0bWxfanNfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vaHRtbC5qc1wiKTtcbmNvbnN0IGVzY2FwZV9qc18xID0gcmVxdWlyZShcImVudGl0aWVzL2xpYi9lc2NhcGUuanNcIik7XG5jb25zdCBkZWZhdWx0X2pzXzEgPSByZXF1aXJlKFwiLi4vdHJlZS1hZGFwdGVycy9kZWZhdWx0LmpzXCIpO1xuLy8gU2V0c1xuY29uc3QgVk9JRF9FTEVNRU5UUyA9IG5ldyBTZXQoW1xuICAgIGh0bWxfanNfMS5UQUdfTkFNRVMuQVJFQSxcbiAgICBodG1sX2pzXzEuVEFHX05BTUVTLkJBU0UsXG4gICAgaHRtbF9qc18xLlRBR19OQU1FUy5CQVNFRk9OVCxcbiAgICBodG1sX2pzXzEuVEFHX05BTUVTLkJHU09VTkQsXG4gICAgaHRtbF9qc18xLlRBR19OQU1FUy5CUixcbiAgICBodG1sX2pzXzEuVEFHX05BTUVTLkNPTCxcbiAgICBodG1sX2pzXzEuVEFHX05BTUVTLkVNQkVELFxuICAgIGh0bWxfanNfMS5UQUdfTkFNRVMuRlJBTUUsXG4gICAgaHRtbF9qc18xLlRBR19OQU1FUy5IUixcbiAgICBodG1sX2pzXzEuVEFHX05BTUVTLklNRyxcbiAgICBodG1sX2pzXzEuVEFHX05BTUVTLklOUFVULFxuICAgIGh0bWxfanNfMS5UQUdfTkFNRVMuS0VZR0VOLFxuICAgIGh0bWxfanNfMS5UQUdfTkFNRVMuTElOSyxcbiAgICBodG1sX2pzXzEuVEFHX05BTUVTLk1FVEEsXG4gICAgaHRtbF9qc18xLlRBR19OQU1FUy5QQVJBTSxcbiAgICBodG1sX2pzXzEuVEFHX05BTUVTLlNPVVJDRSxcbiAgICBodG1sX2pzXzEuVEFHX05BTUVTLlRSQUNLLFxuICAgIGh0bWxfanNfMS5UQUdfTkFNRVMuV0JSLFxuXSk7XG5mdW5jdGlvbiBpc1ZvaWRFbGVtZW50KG5vZGUsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMudHJlZUFkYXB0ZXIuaXNFbGVtZW50Tm9kZShub2RlKSAmJlxuICAgICAgICBvcHRpb25zLnRyZWVBZGFwdGVyLmdldE5hbWVzcGFjZVVSSShub2RlKSA9PT0gaHRtbF9qc18xLk5TLkhUTUwgJiZcbiAgICAgICAgVk9JRF9FTEVNRU5UUy5oYXMob3B0aW9ucy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKG5vZGUpKSk7XG59XG5jb25zdCBkZWZhdWx0T3B0cyA9IHsgdHJlZUFkYXB0ZXI6IGRlZmF1bHRfanNfMS5kZWZhdWx0VHJlZUFkYXB0ZXIsIHNjcmlwdGluZ0VuYWJsZWQ6IHRydWUgfTtcbi8qKlxuICogU2VyaWFsaXplcyBhbiBBU1Qgbm9kZSB0byBhbiBIVE1MIHN0cmluZy5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBwYXJzZTUgPSByZXF1aXJlKCdwYXJzZTUnKTtcbiAqXG4gKiBjb25zdCBkb2N1bWVudCA9IHBhcnNlNS5wYXJzZSgnPCFET0NUWVBFIGh0bWw+PGh0bWw+PGhlYWQ+PC9oZWFkPjxib2R5PkhpIHRoZXJlITwvYm9keT48L2h0bWw+Jyk7XG4gKlxuICogLy8gU2VyaWFsaXplcyBhIGRvY3VtZW50LlxuICogY29uc3QgaHRtbCA9IHBhcnNlNS5zZXJpYWxpemUoZG9jdW1lbnQpO1xuICpcbiAqIC8vIFNlcmlhbGl6ZXMgdGhlIDxodG1sPiBlbGVtZW50IGNvbnRlbnQuXG4gKiBjb25zdCBzdHIgPSBwYXJzZTUuc2VyaWFsaXplKGRvY3VtZW50LmNoaWxkTm9kZXNbMV0pO1xuICpcbiAqIGNvbnNvbGUubG9nKHN0cik7IC8vPiAnPGhlYWQ+PC9oZWFkPjxib2R5PkhpIHRoZXJlITwvYm9keT4nXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gbm9kZSBOb2RlIHRvIHNlcmlhbGl6ZS5cbiAqIEBwYXJhbSBvcHRpb25zIFNlcmlhbGl6YXRpb24gb3B0aW9ucy5cbiAqL1xuZnVuY3Rpb24gc2VyaWFsaXplKG5vZGUsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0cyksIG9wdGlvbnMpO1xuICAgIGlmIChpc1ZvaWRFbGVtZW50KG5vZGUsIG9wdHMpKSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgcmV0dXJuIHNlcmlhbGl6ZUNoaWxkTm9kZXMobm9kZSwgb3B0cyk7XG59XG5leHBvcnRzLnNlcmlhbGl6ZSA9IHNlcmlhbGl6ZTtcbi8qKlxuICogU2VyaWFsaXplcyBhbiBBU1QgZWxlbWVudCBub2RlIHRvIGFuIEhUTUwgc3RyaW5nLCBpbmNsdWRpbmcgdGhlIGVsZW1lbnQgbm9kZS5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBwYXJzZTUgPSByZXF1aXJlKCdwYXJzZTUnKTtcbiAqXG4gKiBjb25zdCBkb2N1bWVudCA9IHBhcnNlNS5wYXJzZUZyYWdtZW50KCc8ZGl2PkhlbGxvLCA8Yj53b3JsZDwvYj4hPC9kaXY+Jyk7XG4gKlxuICogLy8gU2VyaWFsaXplcyB0aGUgPGRpdj4gZWxlbWVudC5cbiAqIGNvbnN0IGh0bWwgPSBwYXJzZTUuc2VyaWFsaXplT3V0ZXIoZG9jdW1lbnQuY2hpbGROb2Rlc1swXSk7XG4gKlxuICogY29uc29sZS5sb2coc3RyKTsgLy8+ICc8ZGl2PkhlbGxvLCA8Yj53b3JsZDwvYj4hPC9kaXY+J1xuICogYGBgXG4gKlxuICogQHBhcmFtIG5vZGUgTm9kZSB0byBzZXJpYWxpemUuXG4gKiBAcGFyYW0gb3B0aW9ucyBTZXJpYWxpemF0aW9uIG9wdGlvbnMuXG4gKi9cbmZ1bmN0aW9uIHNlcmlhbGl6ZU91dGVyKG5vZGUsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0cyksIG9wdGlvbnMpO1xuICAgIHJldHVybiBzZXJpYWxpemVOb2RlKG5vZGUsIG9wdHMpO1xufVxuZXhwb3J0cy5zZXJpYWxpemVPdXRlciA9IHNlcmlhbGl6ZU91dGVyO1xuZnVuY3Rpb24gc2VyaWFsaXplQ2hpbGROb2RlcyhwYXJlbnROb2RlLCBvcHRpb25zKSB7XG4gICAgbGV0IGh0bWwgPSAnJztcbiAgICAvLyBHZXQgY29udGFpbmVyIG9mIHRoZSBjaGlsZCBub2Rlc1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IG9wdGlvbnMudHJlZUFkYXB0ZXIuaXNFbGVtZW50Tm9kZShwYXJlbnROb2RlKSAmJlxuICAgICAgICBvcHRpb25zLnRyZWVBZGFwdGVyLmdldFRhZ05hbWUocGFyZW50Tm9kZSkgPT09IGh0bWxfanNfMS5UQUdfTkFNRVMuVEVNUExBVEUgJiZcbiAgICAgICAgb3B0aW9ucy50cmVlQWRhcHRlci5nZXROYW1lc3BhY2VVUkkocGFyZW50Tm9kZSkgPT09IGh0bWxfanNfMS5OUy5IVE1MXG4gICAgICAgID8gb3B0aW9ucy50cmVlQWRhcHRlci5nZXRUZW1wbGF0ZUNvbnRlbnQocGFyZW50Tm9kZSlcbiAgICAgICAgOiBwYXJlbnROb2RlO1xuICAgIGNvbnN0IGNoaWxkTm9kZXMgPSBvcHRpb25zLnRyZWVBZGFwdGVyLmdldENoaWxkTm9kZXMoY29udGFpbmVyKTtcbiAgICBpZiAoY2hpbGROb2Rlcykge1xuICAgICAgICBmb3IgKGNvbnN0IGN1cnJlbnROb2RlIG9mIGNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gc2VyaWFsaXplTm9kZShjdXJyZW50Tm9kZSwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGh0bWw7XG59XG5mdW5jdGlvbiBzZXJpYWxpemVOb2RlKG5vZGUsIG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy50cmVlQWRhcHRlci5pc0VsZW1lbnROb2RlKG5vZGUpKSB7XG4gICAgICAgIHJldHVybiBzZXJpYWxpemVFbGVtZW50KG5vZGUsIG9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50cmVlQWRhcHRlci5pc1RleHROb2RlKG5vZGUpKSB7XG4gICAgICAgIHJldHVybiBzZXJpYWxpemVUZXh0Tm9kZShub2RlLCBvcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHJlZUFkYXB0ZXIuaXNDb21tZW50Tm9kZShub2RlKSkge1xuICAgICAgICByZXR1cm4gc2VyaWFsaXplQ29tbWVudE5vZGUobm9kZSwgb3B0aW9ucyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRyZWVBZGFwdGVyLmlzRG9jdW1lbnRUeXBlTm9kZShub2RlKSkge1xuICAgICAgICByZXR1cm4gc2VyaWFsaXplRG9jdW1lbnRUeXBlTm9kZShub2RlLCBvcHRpb25zKTtcbiAgICB9XG4gICAgLy8gUmV0dXJuIGFuIGVtcHR5IHN0cmluZyBmb3IgdW5rbm93biBub2Rlc1xuICAgIHJldHVybiAnJztcbn1cbmZ1bmN0aW9uIHNlcmlhbGl6ZUVsZW1lbnQobm9kZSwgb3B0aW9ucykge1xuICAgIGNvbnN0IHRuID0gb3B0aW9ucy50cmVlQWRhcHRlci5nZXRUYWdOYW1lKG5vZGUpO1xuICAgIHJldHVybiBgPCR7dG59JHtzZXJpYWxpemVBdHRyaWJ1dGVzKG5vZGUsIG9wdGlvbnMpfT4ke2lzVm9pZEVsZW1lbnQobm9kZSwgb3B0aW9ucykgPyAnJyA6IGAke3NlcmlhbGl6ZUNoaWxkTm9kZXMobm9kZSwgb3B0aW9ucyl9PC8ke3RufT5gfWA7XG59XG5mdW5jdGlvbiBzZXJpYWxpemVBdHRyaWJ1dGVzKG5vZGUsIHsgdHJlZUFkYXB0ZXIgfSkge1xuICAgIGxldCBodG1sID0gJyc7XG4gICAgZm9yIChjb25zdCBhdHRyIG9mIHRyZWVBZGFwdGVyLmdldEF0dHJMaXN0KG5vZGUpKSB7XG4gICAgICAgIGh0bWwgKz0gJyAnO1xuICAgICAgICBpZiAoIWF0dHIubmFtZXNwYWNlKSB7XG4gICAgICAgICAgICBodG1sICs9IGF0dHIubmFtZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBzd2l0Y2ggKGF0dHIubmFtZXNwYWNlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBodG1sX2pzXzEuTlMuWE1MOiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYHhtbDoke2F0dHIubmFtZX1gO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSBodG1sX2pzXzEuTlMuWE1MTlM6IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHIubmFtZSAhPT0gJ3htbG5zJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAneG1sbnM6JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGF0dHIubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgaHRtbF9qc18xLk5TLlhMSU5LOiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYHhsaW5rOiR7YXR0ci5uYW1lfWA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYCR7YXR0ci5wcmVmaXh9OiR7YXR0ci5uYW1lfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBodG1sICs9IGA9XCIkeygwLCBlc2NhcGVfanNfMS5lc2NhcGVBdHRyaWJ1dGUpKGF0dHIudmFsdWUpfVwiYDtcbiAgICB9XG4gICAgcmV0dXJuIGh0bWw7XG59XG5mdW5jdGlvbiBzZXJpYWxpemVUZXh0Tm9kZShub2RlLCBvcHRpb25zKSB7XG4gICAgY29uc3QgeyB0cmVlQWRhcHRlciB9ID0gb3B0aW9ucztcbiAgICBjb25zdCBjb250ZW50ID0gdHJlZUFkYXB0ZXIuZ2V0VGV4dE5vZGVDb250ZW50KG5vZGUpO1xuICAgIGNvbnN0IHBhcmVudCA9IHRyZWVBZGFwdGVyLmdldFBhcmVudE5vZGUobm9kZSk7XG4gICAgY29uc3QgcGFyZW50VG4gPSBwYXJlbnQgJiYgdHJlZUFkYXB0ZXIuaXNFbGVtZW50Tm9kZShwYXJlbnQpICYmIHRyZWVBZGFwdGVyLmdldFRhZ05hbWUocGFyZW50KTtcbiAgICByZXR1cm4gcGFyZW50VG4gJiZcbiAgICAgICAgdHJlZUFkYXB0ZXIuZ2V0TmFtZXNwYWNlVVJJKHBhcmVudCkgPT09IGh0bWxfanNfMS5OUy5IVE1MICYmXG4gICAgICAgICgwLCBodG1sX2pzXzEuaGFzVW5lc2NhcGVkVGV4dCkocGFyZW50VG4sIG9wdGlvbnMuc2NyaXB0aW5nRW5hYmxlZClcbiAgICAgICAgPyBjb250ZW50XG4gICAgICAgIDogKDAsIGVzY2FwZV9qc18xLmVzY2FwZVRleHQpKGNvbnRlbnQpO1xufVxuZnVuY3Rpb24gc2VyaWFsaXplQ29tbWVudE5vZGUobm9kZSwgeyB0cmVlQWRhcHRlciB9KSB7XG4gICAgcmV0dXJuIGA8IS0tJHt0cmVlQWRhcHRlci5nZXRDb21tZW50Tm9kZUNvbnRlbnQobm9kZSl9LS0+YDtcbn1cbmZ1bmN0aW9uIHNlcmlhbGl6ZURvY3VtZW50VHlwZU5vZGUobm9kZSwgeyB0cmVlQWRhcHRlciB9KSB7XG4gICAgcmV0dXJuIGA8IURPQ1RZUEUgJHt0cmVlQWRhcHRlci5nZXREb2N1bWVudFR5cGVOb2RlTmFtZShub2RlKX0+YDtcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5Ub2tlbml6ZXIgPSBleHBvcnRzLlRva2VuaXplck1vZGUgPSB2b2lkIDA7XG5jb25zdCBwcmVwcm9jZXNzb3JfanNfMSA9IHJlcXVpcmUoXCIuL3ByZXByb2Nlc3Nvci5qc1wiKTtcbmNvbnN0IHVuaWNvZGVfanNfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vdW5pY29kZS5qc1wiKTtcbmNvbnN0IHRva2VuX2pzXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL3Rva2VuLmpzXCIpO1xuY29uc3QgZGVjb2RlX2pzXzEgPSByZXF1aXJlKFwiZW50aXRpZXMvbGliL2RlY29kZS5qc1wiKTtcbmNvbnN0IGVycm9yX2NvZGVzX2pzXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL2Vycm9yLWNvZGVzLmpzXCIpO1xuY29uc3QgaHRtbF9qc18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi9odG1sLmpzXCIpO1xuLy9DMSBVbmljb2RlIGNvbnRyb2wgY2hhcmFjdGVyIHJlZmVyZW5jZSByZXBsYWNlbWVudHNcbmNvbnN0IEMxX0NPTlRST0xTX1JFRkVSRU5DRV9SRVBMQUNFTUVOVFMgPSBuZXcgTWFwKFtcbiAgICBbMHg4MCwgODM2NF0sXG4gICAgWzB4ODIsIDgyMThdLFxuICAgIFsweDgzLCA0MDJdLFxuICAgIFsweDg0LCA4MjIyXSxcbiAgICBbMHg4NSwgODIzMF0sXG4gICAgWzB4ODYsIDgyMjRdLFxuICAgIFsweDg3LCA4MjI1XSxcbiAgICBbMHg4OCwgNzEwXSxcbiAgICBbMHg4OSwgODI0MF0sXG4gICAgWzB4OGEsIDM1Ml0sXG4gICAgWzB4OGIsIDgyNDldLFxuICAgIFsweDhjLCAzMzhdLFxuICAgIFsweDhlLCAzODFdLFxuICAgIFsweDkxLCA4MjE2XSxcbiAgICBbMHg5MiwgODIxN10sXG4gICAgWzB4OTMsIDgyMjBdLFxuICAgIFsweDk0LCA4MjIxXSxcbiAgICBbMHg5NSwgODIyNl0sXG4gICAgWzB4OTYsIDgyMTFdLFxuICAgIFsweDk3LCA4MjEyXSxcbiAgICBbMHg5OCwgNzMyXSxcbiAgICBbMHg5OSwgODQ4Ml0sXG4gICAgWzB4OWEsIDM1M10sXG4gICAgWzB4OWIsIDgyNTBdLFxuICAgIFsweDljLCAzMzldLFxuICAgIFsweDllLCAzODJdLFxuICAgIFsweDlmLCAzNzZdLFxuXSk7XG4vL1N0YXRlc1xudmFyIFN0YXRlO1xuKGZ1bmN0aW9uIChTdGF0ZSkge1xuICAgIFN0YXRlW1N0YXRlW1wiREFUQVwiXSA9IDBdID0gXCJEQVRBXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJSQ0RBVEFcIl0gPSAxXSA9IFwiUkNEQVRBXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJSQVdURVhUXCJdID0gMl0gPSBcIlJBV1RFWFRcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIlNDUklQVF9EQVRBXCJdID0gM10gPSBcIlNDUklQVF9EQVRBXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJQTEFJTlRFWFRcIl0gPSA0XSA9IFwiUExBSU5URVhUXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJUQUdfT1BFTlwiXSA9IDVdID0gXCJUQUdfT1BFTlwiO1xuICAgIFN0YXRlW1N0YXRlW1wiRU5EX1RBR19PUEVOXCJdID0gNl0gPSBcIkVORF9UQUdfT1BFTlwiO1xuICAgIFN0YXRlW1N0YXRlW1wiVEFHX05BTUVcIl0gPSA3XSA9IFwiVEFHX05BTUVcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIlJDREFUQV9MRVNTX1RIQU5fU0lHTlwiXSA9IDhdID0gXCJSQ0RBVEFfTEVTU19USEFOX1NJR05cIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIlJDREFUQV9FTkRfVEFHX09QRU5cIl0gPSA5XSA9IFwiUkNEQVRBX0VORF9UQUdfT1BFTlwiO1xuICAgIFN0YXRlW1N0YXRlW1wiUkNEQVRBX0VORF9UQUdfTkFNRVwiXSA9IDEwXSA9IFwiUkNEQVRBX0VORF9UQUdfTkFNRVwiO1xuICAgIFN0YXRlW1N0YXRlW1wiUkFXVEVYVF9MRVNTX1RIQU5fU0lHTlwiXSA9IDExXSA9IFwiUkFXVEVYVF9MRVNTX1RIQU5fU0lHTlwiO1xuICAgIFN0YXRlW1N0YXRlW1wiUkFXVEVYVF9FTkRfVEFHX09QRU5cIl0gPSAxMl0gPSBcIlJBV1RFWFRfRU5EX1RBR19PUEVOXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJSQVdURVhUX0VORF9UQUdfTkFNRVwiXSA9IDEzXSA9IFwiUkFXVEVYVF9FTkRfVEFHX05BTUVcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIlNDUklQVF9EQVRBX0xFU1NfVEhBTl9TSUdOXCJdID0gMTRdID0gXCJTQ1JJUFRfREFUQV9MRVNTX1RIQU5fU0lHTlwiO1xuICAgIFN0YXRlW1N0YXRlW1wiU0NSSVBUX0RBVEFfRU5EX1RBR19PUEVOXCJdID0gMTVdID0gXCJTQ1JJUFRfREFUQV9FTkRfVEFHX09QRU5cIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIlNDUklQVF9EQVRBX0VORF9UQUdfTkFNRVwiXSA9IDE2XSA9IFwiU0NSSVBUX0RBVEFfRU5EX1RBR19OQU1FXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJTQ1JJUFRfREFUQV9FU0NBUEVfU1RBUlRcIl0gPSAxN10gPSBcIlNDUklQVF9EQVRBX0VTQ0FQRV9TVEFSVFwiO1xuICAgIFN0YXRlW1N0YXRlW1wiU0NSSVBUX0RBVEFfRVNDQVBFX1NUQVJUX0RBU0hcIl0gPSAxOF0gPSBcIlNDUklQVF9EQVRBX0VTQ0FQRV9TVEFSVF9EQVNIXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJTQ1JJUFRfREFUQV9FU0NBUEVEXCJdID0gMTldID0gXCJTQ1JJUFRfREFUQV9FU0NBUEVEXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJTQ1JJUFRfREFUQV9FU0NBUEVEX0RBU0hcIl0gPSAyMF0gPSBcIlNDUklQVF9EQVRBX0VTQ0FQRURfREFTSFwiO1xuICAgIFN0YXRlW1N0YXRlW1wiU0NSSVBUX0RBVEFfRVNDQVBFRF9EQVNIX0RBU0hcIl0gPSAyMV0gPSBcIlNDUklQVF9EQVRBX0VTQ0FQRURfREFTSF9EQVNIXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJTQ1JJUFRfREFUQV9FU0NBUEVEX0xFU1NfVEhBTl9TSUdOXCJdID0gMjJdID0gXCJTQ1JJUFRfREFUQV9FU0NBUEVEX0xFU1NfVEhBTl9TSUdOXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJTQ1JJUFRfREFUQV9FU0NBUEVEX0VORF9UQUdfT1BFTlwiXSA9IDIzXSA9IFwiU0NSSVBUX0RBVEFfRVNDQVBFRF9FTkRfVEFHX09QRU5cIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIlNDUklQVF9EQVRBX0VTQ0FQRURfRU5EX1RBR19OQU1FXCJdID0gMjRdID0gXCJTQ1JJUFRfREFUQV9FU0NBUEVEX0VORF9UQUdfTkFNRVwiO1xuICAgIFN0YXRlW1N0YXRlW1wiU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRV9TVEFSVFwiXSA9IDI1XSA9IFwiU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRV9TVEFSVFwiO1xuICAgIFN0YXRlW1N0YXRlW1wiU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURcIl0gPSAyNl0gPSBcIlNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJTQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFRF9EQVNIXCJdID0gMjddID0gXCJTQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFRF9EQVNIXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJTQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFRF9EQVNIX0RBU0hcIl0gPSAyOF0gPSBcIlNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX0RBU0hfREFTSFwiO1xuICAgIFN0YXRlW1N0YXRlW1wiU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfTEVTU19USEFOX1NJR05cIl0gPSAyOV0gPSBcIlNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX0xFU1NfVEhBTl9TSUdOXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJTQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFX0VORFwiXSA9IDMwXSA9IFwiU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRV9FTkRcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkJFRk9SRV9BVFRSSUJVVEVfTkFNRVwiXSA9IDMxXSA9IFwiQkVGT1JFX0FUVFJJQlVURV9OQU1FXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJBVFRSSUJVVEVfTkFNRVwiXSA9IDMyXSA9IFwiQVRUUklCVVRFX05BTUVcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkFGVEVSX0FUVFJJQlVURV9OQU1FXCJdID0gMzNdID0gXCJBRlRFUl9BVFRSSUJVVEVfTkFNRVwiO1xuICAgIFN0YXRlW1N0YXRlW1wiQkVGT1JFX0FUVFJJQlVURV9WQUxVRVwiXSA9IDM0XSA9IFwiQkVGT1JFX0FUVFJJQlVURV9WQUxVRVwiO1xuICAgIFN0YXRlW1N0YXRlW1wiQVRUUklCVVRFX1ZBTFVFX0RPVUJMRV9RVU9URURcIl0gPSAzNV0gPSBcIkFUVFJJQlVURV9WQUxVRV9ET1VCTEVfUVVPVEVEXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJBVFRSSUJVVEVfVkFMVUVfU0lOR0xFX1FVT1RFRFwiXSA9IDM2XSA9IFwiQVRUUklCVVRFX1ZBTFVFX1NJTkdMRV9RVU9URURcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkFUVFJJQlVURV9WQUxVRV9VTlFVT1RFRFwiXSA9IDM3XSA9IFwiQVRUUklCVVRFX1ZBTFVFX1VOUVVPVEVEXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJBRlRFUl9BVFRSSUJVVEVfVkFMVUVfUVVPVEVEXCJdID0gMzhdID0gXCJBRlRFUl9BVFRSSUJVVEVfVkFMVUVfUVVPVEVEXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJTRUxGX0NMT1NJTkdfU1RBUlRfVEFHXCJdID0gMzldID0gXCJTRUxGX0NMT1NJTkdfU1RBUlRfVEFHXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJCT0dVU19DT01NRU5UXCJdID0gNDBdID0gXCJCT0dVU19DT01NRU5UXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJNQVJLVVBfREVDTEFSQVRJT05fT1BFTlwiXSA9IDQxXSA9IFwiTUFSS1VQX0RFQ0xBUkFUSU9OX09QRU5cIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkNPTU1FTlRfU1RBUlRcIl0gPSA0Ml0gPSBcIkNPTU1FTlRfU1RBUlRcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkNPTU1FTlRfU1RBUlRfREFTSFwiXSA9IDQzXSA9IFwiQ09NTUVOVF9TVEFSVF9EQVNIXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJDT01NRU5UXCJdID0gNDRdID0gXCJDT01NRU5UXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJDT01NRU5UX0xFU1NfVEhBTl9TSUdOXCJdID0gNDVdID0gXCJDT01NRU5UX0xFU1NfVEhBTl9TSUdOXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJDT01NRU5UX0xFU1NfVEhBTl9TSUdOX0JBTkdcIl0gPSA0Nl0gPSBcIkNPTU1FTlRfTEVTU19USEFOX1NJR05fQkFOR1wiO1xuICAgIFN0YXRlW1N0YXRlW1wiQ09NTUVOVF9MRVNTX1RIQU5fU0lHTl9CQU5HX0RBU0hcIl0gPSA0N10gPSBcIkNPTU1FTlRfTEVTU19USEFOX1NJR05fQkFOR19EQVNIXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJDT01NRU5UX0xFU1NfVEhBTl9TSUdOX0JBTkdfREFTSF9EQVNIXCJdID0gNDhdID0gXCJDT01NRU5UX0xFU1NfVEhBTl9TSUdOX0JBTkdfREFTSF9EQVNIXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJDT01NRU5UX0VORF9EQVNIXCJdID0gNDldID0gXCJDT01NRU5UX0VORF9EQVNIXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJDT01NRU5UX0VORFwiXSA9IDUwXSA9IFwiQ09NTUVOVF9FTkRcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkNPTU1FTlRfRU5EX0JBTkdcIl0gPSA1MV0gPSBcIkNPTU1FTlRfRU5EX0JBTkdcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkRPQ1RZUEVcIl0gPSA1Ml0gPSBcIkRPQ1RZUEVcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkJFRk9SRV9ET0NUWVBFX05BTUVcIl0gPSA1M10gPSBcIkJFRk9SRV9ET0NUWVBFX05BTUVcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkRPQ1RZUEVfTkFNRVwiXSA9IDU0XSA9IFwiRE9DVFlQRV9OQU1FXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJBRlRFUl9ET0NUWVBFX05BTUVcIl0gPSA1NV0gPSBcIkFGVEVSX0RPQ1RZUEVfTkFNRVwiO1xuICAgIFN0YXRlW1N0YXRlW1wiQUZURVJfRE9DVFlQRV9QVUJMSUNfS0VZV09SRFwiXSA9IDU2XSA9IFwiQUZURVJfRE9DVFlQRV9QVUJMSUNfS0VZV09SRFwiO1xuICAgIFN0YXRlW1N0YXRlW1wiQkVGT1JFX0RPQ1RZUEVfUFVCTElDX0lERU5USUZJRVJcIl0gPSA1N10gPSBcIkJFRk9SRV9ET0NUWVBFX1BVQkxJQ19JREVOVElGSUVSXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJET0NUWVBFX1BVQkxJQ19JREVOVElGSUVSX0RPVUJMRV9RVU9URURcIl0gPSA1OF0gPSBcIkRPQ1RZUEVfUFVCTElDX0lERU5USUZJRVJfRE9VQkxFX1FVT1RFRFwiO1xuICAgIFN0YXRlW1N0YXRlW1wiRE9DVFlQRV9QVUJMSUNfSURFTlRJRklFUl9TSU5HTEVfUVVPVEVEXCJdID0gNTldID0gXCJET0NUWVBFX1BVQkxJQ19JREVOVElGSUVSX1NJTkdMRV9RVU9URURcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkFGVEVSX0RPQ1RZUEVfUFVCTElDX0lERU5USUZJRVJcIl0gPSA2MF0gPSBcIkFGVEVSX0RPQ1RZUEVfUFVCTElDX0lERU5USUZJRVJcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkJFVFdFRU5fRE9DVFlQRV9QVUJMSUNfQU5EX1NZU1RFTV9JREVOVElGSUVSU1wiXSA9IDYxXSA9IFwiQkVUV0VFTl9ET0NUWVBFX1BVQkxJQ19BTkRfU1lTVEVNX0lERU5USUZJRVJTXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJBRlRFUl9ET0NUWVBFX1NZU1RFTV9LRVlXT1JEXCJdID0gNjJdID0gXCJBRlRFUl9ET0NUWVBFX1NZU1RFTV9LRVlXT1JEXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJCRUZPUkVfRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUlwiXSA9IDYzXSA9IFwiQkVGT1JFX0RPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVJcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkRPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVJfRE9VQkxFX1FVT1RFRFwiXSA9IDY0XSA9IFwiRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUl9ET1VCTEVfUVVPVEVEXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSX1NJTkdMRV9RVU9URURcIl0gPSA2NV0gPSBcIkRPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVJfU0lOR0xFX1FVT1RFRFwiO1xuICAgIFN0YXRlW1N0YXRlW1wiQUZURVJfRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUlwiXSA9IDY2XSA9IFwiQUZURVJfRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUlwiO1xuICAgIFN0YXRlW1N0YXRlW1wiQk9HVVNfRE9DVFlQRVwiXSA9IDY3XSA9IFwiQk9HVVNfRE9DVFlQRVwiO1xuICAgIFN0YXRlW1N0YXRlW1wiQ0RBVEFfU0VDVElPTlwiXSA9IDY4XSA9IFwiQ0RBVEFfU0VDVElPTlwiO1xuICAgIFN0YXRlW1N0YXRlW1wiQ0RBVEFfU0VDVElPTl9CUkFDS0VUXCJdID0gNjldID0gXCJDREFUQV9TRUNUSU9OX0JSQUNLRVRcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkNEQVRBX1NFQ1RJT05fRU5EXCJdID0gNzBdID0gXCJDREFUQV9TRUNUSU9OX0VORFwiO1xuICAgIFN0YXRlW1N0YXRlW1wiQ0hBUkFDVEVSX1JFRkVSRU5DRVwiXSA9IDcxXSA9IFwiQ0hBUkFDVEVSX1JFRkVSRU5DRVwiO1xuICAgIFN0YXRlW1N0YXRlW1wiTkFNRURfQ0hBUkFDVEVSX1JFRkVSRU5DRVwiXSA9IDcyXSA9IFwiTkFNRURfQ0hBUkFDVEVSX1JFRkVSRU5DRVwiO1xuICAgIFN0YXRlW1N0YXRlW1wiQU1CSUdVT1VTX0FNUEVSU0FORFwiXSA9IDczXSA9IFwiQU1CSUdVT1VTX0FNUEVSU0FORFwiO1xuICAgIFN0YXRlW1N0YXRlW1wiTlVNRVJJQ19DSEFSQUNURVJfUkVGRVJFTkNFXCJdID0gNzRdID0gXCJOVU1FUklDX0NIQVJBQ1RFUl9SRUZFUkVOQ0VcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkhFWEFERU1JQ0FMX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBUlRcIl0gPSA3NV0gPSBcIkhFWEFERU1JQ0FMX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfU1RBUlRcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkhFWEFERU1JQ0FMX0NIQVJBQ1RFUl9SRUZFUkVOQ0VcIl0gPSA3Nl0gPSBcIkhFWEFERU1JQ0FMX0NIQVJBQ1RFUl9SRUZFUkVOQ0VcIjtcbiAgICBTdGF0ZVtTdGF0ZVtcIkRFQ0lNQUxfQ0hBUkFDVEVSX1JFRkVSRU5DRVwiXSA9IDc3XSA9IFwiREVDSU1BTF9DSEFSQUNURVJfUkVGRVJFTkNFXCI7XG4gICAgU3RhdGVbU3RhdGVbXCJOVU1FUklDX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfRU5EXCJdID0gNzhdID0gXCJOVU1FUklDX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfRU5EXCI7XG59KShTdGF0ZSB8fCAoU3RhdGUgPSB7fSkpO1xuLy9Ub2tlbml6ZXIgaW5pdGlhbCBzdGF0ZXMgZm9yIGRpZmZlcmVudCBtb2Rlc1xuZXhwb3J0cy5Ub2tlbml6ZXJNb2RlID0ge1xuICAgIERBVEE6IFN0YXRlLkRBVEEsXG4gICAgUkNEQVRBOiBTdGF0ZS5SQ0RBVEEsXG4gICAgUkFXVEVYVDogU3RhdGUuUkFXVEVYVCxcbiAgICBTQ1JJUFRfREFUQTogU3RhdGUuU0NSSVBUX0RBVEEsXG4gICAgUExBSU5URVhUOiBTdGF0ZS5QTEFJTlRFWFQsXG4gICAgQ0RBVEFfU0VDVElPTjogU3RhdGUuQ0RBVEFfU0VDVElPTixcbn07XG4vL1V0aWxzXG4vL09QVElNSVpBVElPTjogdGhlc2UgdXRpbGl0eSBmdW5jdGlvbnMgc2hvdWxkIG5vdCBiZSBtb3ZlZCBvdXQgb2YgdGhpcyBtb2R1bGUuIFY4IENyYW5rc2hhZnQgd2lsbCBub3QgaW5saW5lXG4vL3RoaXMgZnVuY3Rpb25zIGlmIHRoZXkgd2lsbCBiZSBzaXR1YXRlZCBpbiBhbm90aGVyIG1vZHVsZSBkdWUgdG8gY29udGV4dCBzd2l0Y2guXG4vL0Fsd2F5cyBwZXJmb3JtIGlubGluaW5nIGNoZWNrIGJlZm9yZSBtb2RpZnlpbmcgdGhpcyBmdW5jdGlvbnMgKCdub2RlIC0tdHJhY2UtaW5saW5pbmcnKS5cbmZ1bmN0aW9uIGlzQXNjaWlEaWdpdChjcCkge1xuICAgIHJldHVybiBjcCA+PSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRElHSVRfMCAmJiBjcCA8PSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRElHSVRfOTtcbn1cbmZ1bmN0aW9uIGlzQXNjaWlVcHBlcihjcCkge1xuICAgIHJldHVybiBjcCA+PSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTEFUSU5fQ0FQSVRBTF9BICYmIGNwIDw9IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MQVRJTl9DQVBJVEFMX1o7XG59XG5mdW5jdGlvbiBpc0FzY2lpTG93ZXIoY3ApIHtcbiAgICByZXR1cm4gY3AgPj0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxBVElOX1NNQUxMX0EgJiYgY3AgPD0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxBVElOX1NNQUxMX1o7XG59XG5mdW5jdGlvbiBpc0FzY2lpTGV0dGVyKGNwKSB7XG4gICAgcmV0dXJuIGlzQXNjaWlMb3dlcihjcCkgfHwgaXNBc2NpaVVwcGVyKGNwKTtcbn1cbmZ1bmN0aW9uIGlzQXNjaWlBbHBoYU51bWVyaWMoY3ApIHtcbiAgICByZXR1cm4gaXNBc2NpaUxldHRlcihjcCkgfHwgaXNBc2NpaURpZ2l0KGNwKTtcbn1cbmZ1bmN0aW9uIGlzQXNjaWlVcHBlckhleERpZ2l0KGNwKSB7XG4gICAgcmV0dXJuIGNwID49IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MQVRJTl9DQVBJVEFMX0EgJiYgY3AgPD0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxBVElOX0NBUElUQUxfRjtcbn1cbmZ1bmN0aW9uIGlzQXNjaWlMb3dlckhleERpZ2l0KGNwKSB7XG4gICAgcmV0dXJuIGNwID49IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MQVRJTl9TTUFMTF9BICYmIGNwIDw9IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MQVRJTl9TTUFMTF9GO1xufVxuZnVuY3Rpb24gaXNBc2NpaUhleERpZ2l0KGNwKSB7XG4gICAgcmV0dXJuIGlzQXNjaWlEaWdpdChjcCkgfHwgaXNBc2NpaVVwcGVySGV4RGlnaXQoY3ApIHx8IGlzQXNjaWlMb3dlckhleERpZ2l0KGNwKTtcbn1cbmZ1bmN0aW9uIHRvQXNjaWlMb3dlcihjcCkge1xuICAgIHJldHVybiBjcCArIDMyO1xufVxuZnVuY3Rpb24gaXNXaGl0ZXNwYWNlKGNwKSB7XG4gICAgcmV0dXJuIGNwID09PSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuU1BBQ0UgfHwgY3AgPT09IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MSU5FX0ZFRUQgfHwgY3AgPT09IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5UQUJVTEFUSU9OIHx8IGNwID09PSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRk9STV9GRUVEO1xufVxuZnVuY3Rpb24gaXNFbnRpdHlJbkF0dHJpYnV0ZUludmFsaWRFbmQobmV4dENwKSB7XG4gICAgcmV0dXJuIG5leHRDcCA9PT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVRVUFMU19TSUdOIHx8IGlzQXNjaWlBbHBoYU51bWVyaWMobmV4dENwKTtcbn1cbmZ1bmN0aW9uIGlzU2NyaXB0RGF0YURvdWJsZUVzY2FwZVNlcXVlbmNlRW5kKGNwKSB7XG4gICAgcmV0dXJuIGlzV2hpdGVzcGFjZShjcCkgfHwgY3AgPT09IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5TT0xJRFVTIHx8IGNwID09PSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR047XG59XG4vL1Rva2VuaXplclxuY2xhc3MgVG9rZW5pemVyIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zLCBoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgIHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG4gICAgICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG4gICAgICAgIC8qKiBFbnN1cmVzIHRoYXQgdGhlIHBhcnNpbmcgbG9vcCBpc24ndCBydW4gbXVsdGlwbGUgdGltZXMgYXQgb25jZS4gKi9cbiAgICAgICAgdGhpcy5pbkxvb3AgPSBmYWxzZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluZGljYXRlcyB0aGF0IHRoZSBjdXJyZW50IGFkanVzdGVkIG5vZGUgZXhpc3RzLCBpcyBub3QgYW4gZWxlbWVudCBpbiB0aGUgSFRNTCBuYW1lc3BhY2UsXG4gICAgICAgICAqIGFuZCB0aGF0IGl0IGlzIG5vdCBhbiBpbnRlZ3JhdGlvbiBwb2ludCBmb3IgZWl0aGVyIE1hdGhNTCBvciBIVE1MLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAc2VlIHtAbGluayBodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS9wYXJzaW5nLmh0bWwjdHJlZS1jb25zdHJ1Y3Rpb259XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmluRm9yZWlnbk5vZGUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5sYXN0U3RhcnRUYWdOYW1lID0gJyc7XG4gICAgICAgIHRoaXMuYWN0aXZlID0gZmFsc2U7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5EQVRBO1xuICAgICAgICB0aGlzLnJldHVyblN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgdGhpcy5jaGFyUmVmQ29kZSA9IC0xO1xuICAgICAgICB0aGlzLmNvbnN1bWVkQWZ0ZXJTbmFwc2hvdCA9IC0xO1xuICAgICAgICB0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbiA9IG51bGw7XG4gICAgICAgIHRoaXMuY3VycmVudFRva2VuID0gbnVsbDtcbiAgICAgICAgdGhpcy5jdXJyZW50QXR0ciA9IHsgbmFtZTogJycsIHZhbHVlOiAnJyB9O1xuICAgICAgICB0aGlzLnByZXByb2Nlc3NvciA9IG5ldyBwcmVwcm9jZXNzb3JfanNfMS5QcmVwcm9jZXNzb3IoaGFuZGxlcik7XG4gICAgICAgIHRoaXMuY3VycmVudExvY2F0aW9uID0gdGhpcy5nZXRDdXJyZW50TG9jYXRpb24oLTEpO1xuICAgIH1cbiAgICAvL0Vycm9yc1xuICAgIF9lcnIoY29kZSkge1xuICAgICAgICB2YXIgX2EsIF9iO1xuICAgICAgICAoX2IgPSAoX2EgPSB0aGlzLmhhbmRsZXIpLm9uUGFyc2VFcnJvcikgPT09IG51bGwgfHwgX2IgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9iLmNhbGwoX2EsIHRoaXMucHJlcHJvY2Vzc29yLmdldEVycm9yKGNvZGUpKTtcbiAgICB9XG4gICAgLy8gTk9URTogYG9mZnNldGAgbWF5IG5ldmVyIHJ1biBhY3Jvc3MgbGluZSBib3VuZGFyaWVzLlxuICAgIGdldEN1cnJlbnRMb2NhdGlvbihvZmZzZXQpIHtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuc291cmNlQ29kZUxvY2F0aW9uSW5mbykge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXJ0TGluZTogdGhpcy5wcmVwcm9jZXNzb3IubGluZSxcbiAgICAgICAgICAgIHN0YXJ0Q29sOiB0aGlzLnByZXByb2Nlc3Nvci5jb2wgLSBvZmZzZXQsXG4gICAgICAgICAgICBzdGFydE9mZnNldDogdGhpcy5wcmVwcm9jZXNzb3Iub2Zmc2V0IC0gb2Zmc2V0LFxuICAgICAgICAgICAgZW5kTGluZTogLTEsXG4gICAgICAgICAgICBlbmRDb2w6IC0xLFxuICAgICAgICAgICAgZW5kT2Zmc2V0OiAtMSxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgX3J1blBhcnNpbmdMb29wKCkge1xuICAgICAgICBpZiAodGhpcy5pbkxvb3ApXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRoaXMuaW5Mb29wID0gdHJ1ZTtcbiAgICAgICAgd2hpbGUgKHRoaXMuYWN0aXZlICYmICF0aGlzLnBhdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5jb25zdW1lZEFmdGVyU25hcHNob3QgPSAwO1xuICAgICAgICAgICAgY29uc3QgY3AgPSB0aGlzLl9jb25zdW1lKCk7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX2Vuc3VyZUhpYmVybmF0aW9uKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jYWxsU3RhdGUoY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW5Mb29wID0gZmFsc2U7XG4gICAgfVxuICAgIC8vQVBJXG4gICAgcGF1c2UoKSB7XG4gICAgICAgIHRoaXMucGF1c2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmVzdW1lKHdyaXRlQ2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0aGlzLnBhdXNlZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXJzZXIgd2FzIGFscmVhZHkgcmVzdW1lZCcpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG4gICAgICAgIC8vIE5lY2Vzc2FyeSBmb3Igc3luY2hyb25vdXMgcmVzdW1lLlxuICAgICAgICBpZiAodGhpcy5pbkxvb3ApXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRoaXMuX3J1blBhcnNpbmdMb29wKCk7XG4gICAgICAgIGlmICghdGhpcy5wYXVzZWQpIHtcbiAgICAgICAgICAgIHdyaXRlQ2FsbGJhY2sgPT09IG51bGwgfHwgd3JpdGVDYWxsYmFjayA9PT0gdm9pZCAwID8gdm9pZCAwIDogd3JpdGVDYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHdyaXRlKGNodW5rLCBpc0xhc3RDaHVuaywgd3JpdGVDYWxsYmFjaykge1xuICAgICAgICB0aGlzLmFjdGl2ZSA9IHRydWU7XG4gICAgICAgIHRoaXMucHJlcHJvY2Vzc29yLndyaXRlKGNodW5rLCBpc0xhc3RDaHVuayk7XG4gICAgICAgIHRoaXMuX3J1blBhcnNpbmdMb29wKCk7XG4gICAgICAgIGlmICghdGhpcy5wYXVzZWQpIHtcbiAgICAgICAgICAgIHdyaXRlQ2FsbGJhY2sgPT09IG51bGwgfHwgd3JpdGVDYWxsYmFjayA9PT0gdm9pZCAwID8gdm9pZCAwIDogd3JpdGVDYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGluc2VydEh0bWxBdEN1cnJlbnRQb3MoY2h1bmspIHtcbiAgICAgICAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuICAgICAgICB0aGlzLnByZXByb2Nlc3Nvci5pbnNlcnRIdG1sQXRDdXJyZW50UG9zKGNodW5rKTtcbiAgICAgICAgdGhpcy5fcnVuUGFyc2luZ0xvb3AoKTtcbiAgICB9XG4gICAgLy9IaWJlcm5hdGlvblxuICAgIF9lbnN1cmVIaWJlcm5hdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMucHJlcHJvY2Vzc29yLmVuZE9mQ2h1bmtIaXQpIHtcbiAgICAgICAgICAgIHRoaXMuX3VuY29uc3VtZSh0aGlzLmNvbnN1bWVkQWZ0ZXJTbmFwc2hvdCk7XG4gICAgICAgICAgICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvL0NvbnN1bXB0aW9uXG4gICAgX2NvbnN1bWUoKSB7XG4gICAgICAgIHRoaXMuY29uc3VtZWRBZnRlclNuYXBzaG90Kys7XG4gICAgICAgIHJldHVybiB0aGlzLnByZXByb2Nlc3Nvci5hZHZhbmNlKCk7XG4gICAgfVxuICAgIF91bmNvbnN1bWUoY291bnQpIHtcbiAgICAgICAgdGhpcy5jb25zdW1lZEFmdGVyU25hcHNob3QgLT0gY291bnQ7XG4gICAgICAgIHRoaXMucHJlcHJvY2Vzc29yLnJldHJlYXQoY291bnQpO1xuICAgIH1cbiAgICBfcmVjb25zdW1lSW5TdGF0ZShzdGF0ZSwgY3ApIHtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICAgICAgICB0aGlzLl9jYWxsU3RhdGUoY3ApO1xuICAgIH1cbiAgICBfYWR2YW5jZUJ5KGNvdW50KSB7XG4gICAgICAgIHRoaXMuY29uc3VtZWRBZnRlclNuYXBzaG90ICs9IGNvdW50O1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMucHJlcHJvY2Vzc29yLmFkdmFuY2UoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfY29uc3VtZVNlcXVlbmNlSWZNYXRjaChwYXR0ZXJuLCBjYXNlU2Vuc2l0aXZlKSB7XG4gICAgICAgIGlmICh0aGlzLnByZXByb2Nlc3Nvci5zdGFydHNXaXRoKHBhdHRlcm4sIGNhc2VTZW5zaXRpdmUpKSB7XG4gICAgICAgICAgICAvLyBXZSB3aWxsIGFscmVhZHkgaGF2ZSBjb25zdW1lZCBvbmUgY2hhcmFjdGVyIGJlZm9yZSBjYWxsaW5nIHRoaXMgbWV0aG9kLlxuICAgICAgICAgICAgdGhpcy5fYWR2YW5jZUJ5KHBhdHRlcm4ubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vVG9rZW4gY3JlYXRpb25cbiAgICBfY3JlYXRlU3RhcnRUYWdUb2tlbigpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4gPSB7XG4gICAgICAgICAgICB0eXBlOiB0b2tlbl9qc18xLlRva2VuVHlwZS5TVEFSVF9UQUcsXG4gICAgICAgICAgICB0YWdOYW1lOiAnJyxcbiAgICAgICAgICAgIHRhZ0lEOiBodG1sX2pzXzEuVEFHX0lELlVOS05PV04sXG4gICAgICAgICAgICBzZWxmQ2xvc2luZzogZmFsc2UsXG4gICAgICAgICAgICBhY2tTZWxmQ2xvc2luZzogZmFsc2UsXG4gICAgICAgICAgICBhdHRyczogW10sXG4gICAgICAgICAgICBsb2NhdGlvbjogdGhpcy5nZXRDdXJyZW50TG9jYXRpb24oMSksXG4gICAgICAgIH07XG4gICAgfVxuICAgIF9jcmVhdGVFbmRUYWdUb2tlbigpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50VG9rZW4gPSB7XG4gICAgICAgICAgICB0eXBlOiB0b2tlbl9qc18xLlRva2VuVHlwZS5FTkRfVEFHLFxuICAgICAgICAgICAgdGFnTmFtZTogJycsXG4gICAgICAgICAgICB0YWdJRDogaHRtbF9qc18xLlRBR19JRC5VTktOT1dOLFxuICAgICAgICAgICAgc2VsZkNsb3Npbmc6IGZhbHNlLFxuICAgICAgICAgICAgYWNrU2VsZkNsb3Npbmc6IGZhbHNlLFxuICAgICAgICAgICAgYXR0cnM6IFtdLFxuICAgICAgICAgICAgbG9jYXRpb246IHRoaXMuZ2V0Q3VycmVudExvY2F0aW9uKDIpLFxuICAgICAgICB9O1xuICAgIH1cbiAgICBfY3JlYXRlQ29tbWVudFRva2VuKG9mZnNldCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbiA9IHtcbiAgICAgICAgICAgIHR5cGU6IHRva2VuX2pzXzEuVG9rZW5UeXBlLkNPTU1FTlQsXG4gICAgICAgICAgICBkYXRhOiAnJyxcbiAgICAgICAgICAgIGxvY2F0aW9uOiB0aGlzLmdldEN1cnJlbnRMb2NhdGlvbihvZmZzZXQpLFxuICAgICAgICB9O1xuICAgIH1cbiAgICBfY3JlYXRlRG9jdHlwZVRva2VuKGluaXRpYWxOYW1lKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFRva2VuID0ge1xuICAgICAgICAgICAgdHlwZTogdG9rZW5fanNfMS5Ub2tlblR5cGUuRE9DVFlQRSxcbiAgICAgICAgICAgIG5hbWU6IGluaXRpYWxOYW1lLFxuICAgICAgICAgICAgZm9yY2VRdWlya3M6IGZhbHNlLFxuICAgICAgICAgICAgcHVibGljSWQ6IG51bGwsXG4gICAgICAgICAgICBzeXN0ZW1JZDogbnVsbCxcbiAgICAgICAgICAgIGxvY2F0aW9uOiB0aGlzLmN1cnJlbnRMb2NhdGlvbixcbiAgICAgICAgfTtcbiAgICB9XG4gICAgX2NyZWF0ZUNoYXJhY3RlclRva2VuKHR5cGUsIGNoYXJzKSB7XG4gICAgICAgIHRoaXMuY3VycmVudENoYXJhY3RlclRva2VuID0ge1xuICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgIGNoYXJzLFxuICAgICAgICAgICAgbG9jYXRpb246IHRoaXMuY3VycmVudExvY2F0aW9uLFxuICAgICAgICB9O1xuICAgIH1cbiAgICAvL1RhZyBhdHRyaWJ1dGVzXG4gICAgX2NyZWF0ZUF0dHIoYXR0ck5hbWVGaXJzdENoKSB7XG4gICAgICAgIHRoaXMuY3VycmVudEF0dHIgPSB7XG4gICAgICAgICAgICBuYW1lOiBhdHRyTmFtZUZpcnN0Q2gsXG4gICAgICAgICAgICB2YWx1ZTogJycsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuY3VycmVudExvY2F0aW9uID0gdGhpcy5nZXRDdXJyZW50TG9jYXRpb24oMCk7XG4gICAgfVxuICAgIF9sZWF2ZUF0dHJOYW1lKCkge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIHZhciBfYjtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0aGlzLmN1cnJlbnRUb2tlbjtcbiAgICAgICAgaWYgKCgwLCB0b2tlbl9qc18xLmdldFRva2VuQXR0cikodG9rZW4sIHRoaXMuY3VycmVudEF0dHIubmFtZSkgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHRva2VuLmF0dHJzLnB1c2godGhpcy5jdXJyZW50QXR0cik7XG4gICAgICAgICAgICBpZiAodG9rZW4ubG9jYXRpb24gJiYgdGhpcy5jdXJyZW50TG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhdHRyTG9jYXRpb25zID0gKChfYSA9IChfYiA9IHRva2VuLmxvY2F0aW9uKS5hdHRycykgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDogKF9iLmF0dHJzID0gT2JqZWN0LmNyZWF0ZShudWxsKSkpO1xuICAgICAgICAgICAgICAgIGF0dHJMb2NhdGlvbnNbdGhpcy5jdXJyZW50QXR0ci5uYW1lXSA9IHRoaXMuY3VycmVudExvY2F0aW9uO1xuICAgICAgICAgICAgICAgIC8vIFNldCBlbmQgbG9jYXRpb25cbiAgICAgICAgICAgICAgICB0aGlzLl9sZWF2ZUF0dHJWYWx1ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmR1cGxpY2F0ZUF0dHJpYnV0ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2xlYXZlQXR0clZhbHVlKCkge1xuICAgICAgICBpZiAodGhpcy5jdXJyZW50TG9jYXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudExvY2F0aW9uLmVuZExpbmUgPSB0aGlzLnByZXByb2Nlc3Nvci5saW5lO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50TG9jYXRpb24uZW5kQ29sID0gdGhpcy5wcmVwcm9jZXNzb3IuY29sO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50TG9jYXRpb24uZW5kT2Zmc2V0ID0gdGhpcy5wcmVwcm9jZXNzb3Iub2Zmc2V0O1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vVG9rZW4gZW1pc3Npb25cbiAgICBwcmVwYXJlVG9rZW4oY3QpIHtcbiAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRDaGFyYWN0ZXJUb2tlbihjdC5sb2NhdGlvbik7XG4gICAgICAgIHRoaXMuY3VycmVudFRva2VuID0gbnVsbDtcbiAgICAgICAgaWYgKGN0LmxvY2F0aW9uKSB7XG4gICAgICAgICAgICBjdC5sb2NhdGlvbi5lbmRMaW5lID0gdGhpcy5wcmVwcm9jZXNzb3IubGluZTtcbiAgICAgICAgICAgIGN0LmxvY2F0aW9uLmVuZENvbCA9IHRoaXMucHJlcHJvY2Vzc29yLmNvbCArIDE7XG4gICAgICAgICAgICBjdC5sb2NhdGlvbi5lbmRPZmZzZXQgPSB0aGlzLnByZXByb2Nlc3Nvci5vZmZzZXQgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY3VycmVudExvY2F0aW9uID0gdGhpcy5nZXRDdXJyZW50TG9jYXRpb24oLTEpO1xuICAgIH1cbiAgICBlbWl0Q3VycmVudFRhZ1Rva2VuKCkge1xuICAgICAgICBjb25zdCBjdCA9IHRoaXMuY3VycmVudFRva2VuO1xuICAgICAgICB0aGlzLnByZXBhcmVUb2tlbihjdCk7XG4gICAgICAgIGN0LnRhZ0lEID0gKDAsIGh0bWxfanNfMS5nZXRUYWdJRCkoY3QudGFnTmFtZSk7XG4gICAgICAgIGlmIChjdC50eXBlID09PSB0b2tlbl9qc18xLlRva2VuVHlwZS5TVEFSVF9UQUcpIHtcbiAgICAgICAgICAgIHRoaXMubGFzdFN0YXJ0VGFnTmFtZSA9IGN0LnRhZ05hbWU7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZXIub25TdGFydFRhZyhjdCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoY3QuYXR0cnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lbmRUYWdXaXRoQXR0cmlidXRlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY3Quc2VsZkNsb3NpbmcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuZW5kVGFnV2l0aFRyYWlsaW5nU29saWR1cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmhhbmRsZXIub25FbmRUYWcoY3QpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJlcHJvY2Vzc29yLmRyb3BQYXJzZWRDaHVuaygpO1xuICAgIH1cbiAgICBlbWl0Q3VycmVudENvbW1lbnQoY3QpIHtcbiAgICAgICAgdGhpcy5wcmVwYXJlVG9rZW4oY3QpO1xuICAgICAgICB0aGlzLmhhbmRsZXIub25Db21tZW50KGN0KTtcbiAgICAgICAgdGhpcy5wcmVwcm9jZXNzb3IuZHJvcFBhcnNlZENodW5rKCk7XG4gICAgfVxuICAgIGVtaXRDdXJyZW50RG9jdHlwZShjdCkge1xuICAgICAgICB0aGlzLnByZXBhcmVUb2tlbihjdCk7XG4gICAgICAgIHRoaXMuaGFuZGxlci5vbkRvY3R5cGUoY3QpO1xuICAgICAgICB0aGlzLnByZXByb2Nlc3Nvci5kcm9wUGFyc2VkQ2h1bmsoKTtcbiAgICB9XG4gICAgX2VtaXRDdXJyZW50Q2hhcmFjdGVyVG9rZW4obmV4dExvY2F0aW9uKSB7XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbikge1xuICAgICAgICAgICAgLy9OT1RFOiBpZiB3ZSBoYXZlIGEgcGVuZGluZyBjaGFyYWN0ZXIgdG9rZW4sIG1ha2UgaXQncyBlbmQgbG9jYXRpb24gZXF1YWwgdG8gdGhlXG4gICAgICAgICAgICAvL2N1cnJlbnQgdG9rZW4ncyBzdGFydCBsb2NhdGlvbi5cbiAgICAgICAgICAgIGlmIChuZXh0TG9jYXRpb24gJiYgdGhpcy5jdXJyZW50Q2hhcmFjdGVyVG9rZW4ubG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbi5sb2NhdGlvbi5lbmRMaW5lID0gbmV4dExvY2F0aW9uLnN0YXJ0TGluZTtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbi5sb2NhdGlvbi5lbmRDb2wgPSBuZXh0TG9jYXRpb24uc3RhcnRDb2w7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q2hhcmFjdGVyVG9rZW4ubG9jYXRpb24uZW5kT2Zmc2V0ID0gbmV4dExvY2F0aW9uLnN0YXJ0T2Zmc2V0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbi50eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSB0b2tlbl9qc18xLlRva2VuVHlwZS5DSEFSQUNURVI6IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVyLm9uQ2hhcmFjdGVyKHRoaXMuY3VycmVudENoYXJhY3RlclRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgdG9rZW5fanNfMS5Ub2tlblR5cGUuTlVMTF9DSEFSQUNURVI6IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVyLm9uTnVsbENoYXJhY3Rlcih0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlIHRva2VuX2pzXzEuVG9rZW5UeXBlLldISVRFU1BBQ0VfQ0hBUkFDVEVSOiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlci5vbldoaXRlc3BhY2VDaGFyYWN0ZXIodGhpcy5jdXJyZW50Q2hhcmFjdGVyVG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbiA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2VtaXRFT0ZUb2tlbigpIHtcbiAgICAgICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLmdldEN1cnJlbnRMb2NhdGlvbigwKTtcbiAgICAgICAgaWYgKGxvY2F0aW9uKSB7XG4gICAgICAgICAgICBsb2NhdGlvbi5lbmRMaW5lID0gbG9jYXRpb24uc3RhcnRMaW5lO1xuICAgICAgICAgICAgbG9jYXRpb24uZW5kQ29sID0gbG9jYXRpb24uc3RhcnRDb2w7XG4gICAgICAgICAgICBsb2NhdGlvbi5lbmRPZmZzZXQgPSBsb2NhdGlvbi5zdGFydE9mZnNldDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9lbWl0Q3VycmVudENoYXJhY3RlclRva2VuKGxvY2F0aW9uKTtcbiAgICAgICAgdGhpcy5oYW5kbGVyLm9uRW9mKHsgdHlwZTogdG9rZW5fanNfMS5Ub2tlblR5cGUuRU9GLCBsb2NhdGlvbiB9KTtcbiAgICAgICAgdGhpcy5hY3RpdmUgPSBmYWxzZTtcbiAgICB9XG4gICAgLy9DaGFyYWN0ZXJzIGVtaXNzaW9uXG4gICAgLy9PUFRJTUlaQVRJT046IHNwZWNpZmljYXRpb24gdXNlcyBvbmx5IG9uZSB0eXBlIG9mIGNoYXJhY3RlciB0b2tlbnMgKG9uZSB0b2tlbiBwZXIgY2hhcmFjdGVyKS5cbiAgICAvL1RoaXMgY2F1c2VzIGEgaHVnZSBtZW1vcnkgb3ZlcmhlYWQgYW5kIGEgbG90IG9mIHVubmVjZXNzYXJ5IHBhcnNlciBsb29wcy4gcGFyc2U1IHVzZXMgMyBncm91cHMgb2YgY2hhcmFjdGVycy5cbiAgICAvL0lmIHdlIGhhdmUgYSBzZXF1ZW5jZSBvZiBjaGFyYWN0ZXJzIHRoYXQgYmVsb25nIHRvIHRoZSBzYW1lIGdyb3VwLCB0aGUgcGFyc2VyIGNhbiBwcm9jZXNzIGl0XG4gICAgLy9hcyBhIHNpbmdsZSBzb2xpZCBjaGFyYWN0ZXIgdG9rZW4uXG4gICAgLy9TbywgdGhlcmUgYXJlIDMgdHlwZXMgb2YgY2hhcmFjdGVyIHRva2VucyBpbiBwYXJzZTU6XG4gICAgLy8xKVRva2VuVHlwZS5OVUxMX0NIQVJBQ1RFUiAtIFxcdTAwMDAtY2hhcmFjdGVyIHNlcXVlbmNlcyAoZS5nLiAnXFx1MDAwMFxcdTAwMDBcXHUwMDAwJylcbiAgICAvLzIpVG9rZW5UeXBlLldISVRFU1BBQ0VfQ0hBUkFDVEVSIC0gYW55IHdoaXRlc3BhY2UvbmV3LWxpbmUgY2hhcmFjdGVyIHNlcXVlbmNlcyAoZS5nLiAnXFxuICBcXHJcXHQgICBcXGYnKVxuICAgIC8vMylUb2tlblR5cGUuQ0hBUkFDVEVSIC0gYW55IGNoYXJhY3RlciBzZXF1ZW5jZSB3aGljaCBkb24ndCBiZWxvbmcgdG8gZ3JvdXBzIDEgYW5kIDIgKGUuZy4gJ2FiY2RlZjEyMzRAQCMkJV4nKVxuICAgIF9hcHBlbmRDaGFyVG9DdXJyZW50Q2hhcmFjdGVyVG9rZW4odHlwZSwgY2gpIHtcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudENoYXJhY3RlclRva2VuKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50Q2hhcmFjdGVyVG9rZW4udHlwZSAhPT0gdHlwZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudExvY2F0aW9uID0gdGhpcy5nZXRDdXJyZW50TG9jYXRpb24oMCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEN1cnJlbnRDaGFyYWN0ZXJUb2tlbih0aGlzLmN1cnJlbnRMb2NhdGlvbik7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmVwcm9jZXNzb3IuZHJvcFBhcnNlZENodW5rKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDaGFyYWN0ZXJUb2tlbi5jaGFycyArPSBjaDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY3JlYXRlQ2hhcmFjdGVyVG9rZW4odHlwZSwgY2gpO1xuICAgIH1cbiAgICBfZW1pdENvZGVQb2ludChjcCkge1xuICAgICAgICBjb25zdCB0eXBlID0gaXNXaGl0ZXNwYWNlKGNwKVxuICAgICAgICAgICAgPyB0b2tlbl9qc18xLlRva2VuVHlwZS5XSElURVNQQUNFX0NIQVJBQ1RFUlxuICAgICAgICAgICAgOiBjcCA9PT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLk5VTExcbiAgICAgICAgICAgICAgICA/IHRva2VuX2pzXzEuVG9rZW5UeXBlLk5VTExfQ0hBUkFDVEVSXG4gICAgICAgICAgICAgICAgOiB0b2tlbl9qc18xLlRva2VuVHlwZS5DSEFSQUNURVI7XG4gICAgICAgIHRoaXMuX2FwcGVuZENoYXJUb0N1cnJlbnRDaGFyYWN0ZXJUb2tlbih0eXBlLCBTdHJpbmcuZnJvbUNvZGVQb2ludChjcCkpO1xuICAgIH1cbiAgICAvL05PVEU6IHVzZWQgd2hlbiB3ZSBlbWl0IGNoYXJhY3RlcnMgZXhwbGljaXRseS5cbiAgICAvL1RoaXMgaXMgYWx3YXlzIGZvciBub24td2hpdGVzcGFjZSBhbmQgbm9uLW51bGwgY2hhcmFjdGVycywgd2hpY2ggYWxsb3dzIHVzIHRvIGF2b2lkIGFkZGl0aW9uYWwgY2hlY2tzLlxuICAgIF9lbWl0Q2hhcnMoY2gpIHtcbiAgICAgICAgdGhpcy5fYXBwZW5kQ2hhclRvQ3VycmVudENoYXJhY3RlclRva2VuKHRva2VuX2pzXzEuVG9rZW5UeXBlLkNIQVJBQ1RFUiwgY2gpO1xuICAgIH1cbiAgICAvLyBDaGFyYWN0ZXIgcmVmZXJlbmNlIGhlbHBlcnNcbiAgICBfbWF0Y2hOYW1lZENoYXJhY3RlclJlZmVyZW5jZShjcCkge1xuICAgICAgICBsZXQgcmVzdWx0ID0gbnVsbDtcbiAgICAgICAgbGV0IGV4Y2VzcyA9IDA7XG4gICAgICAgIGxldCB3aXRob3V0U2VtaWNvbG9uID0gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBjdXJyZW50ID0gZGVjb2RlX2pzXzEuaHRtbERlY29kZVRyZWVbMF07IGkgPj0gMDsgY3AgPSB0aGlzLl9jb25zdW1lKCkpIHtcbiAgICAgICAgICAgIGkgPSAoMCwgZGVjb2RlX2pzXzEuZGV0ZXJtaW5lQnJhbmNoKShkZWNvZGVfanNfMS5odG1sRGVjb2RlVHJlZSwgY3VycmVudCwgaSArIDEsIGNwKTtcbiAgICAgICAgICAgIGlmIChpIDwgMClcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGV4Y2VzcyArPSAxO1xuICAgICAgICAgICAgY3VycmVudCA9IGRlY29kZV9qc18xLmh0bWxEZWNvZGVUcmVlW2ldO1xuICAgICAgICAgICAgY29uc3QgbWFza2VkID0gY3VycmVudCAmIGRlY29kZV9qc18xLkJpblRyaWVGbGFncy5WQUxVRV9MRU5HVEg7XG4gICAgICAgICAgICAvLyBJZiB0aGUgYnJhbmNoIGlzIGEgdmFsdWUsIHN0b3JlIGl0IGFuZCBjb250aW51ZVxuICAgICAgICAgICAgaWYgKG1hc2tlZCkge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBtYXNrIGlzIHRoZSBudW1iZXIgb2YgYnl0ZXMgb2YgdGhlIHZhbHVlLCBpbmNsdWRpbmcgdGhlIGN1cnJlbnQgYnl0ZS5cbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZUxlbmd0aCA9IChtYXNrZWQgPj4gMTQpIC0gMTtcbiAgICAgICAgICAgICAgICAvLyBBdHRyaWJ1dGUgdmFsdWVzIHRoYXQgYXJlbid0IHRlcm1pbmF0ZWQgcHJvcGVybHkgYXJlbid0IHBhcnNlZCwgYW5kIHNob3VsZG4ndCBsZWFkIHRvIGEgcGFyc2VyIGVycm9yLlxuICAgICAgICAgICAgICAgIC8vIFNlZSB0aGUgZXhhbXBsZSBpbiBodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS9wYXJzaW5nLmh0bWwjbmFtZWQtY2hhcmFjdGVyLXJlZmVyZW5jZS1zdGF0ZVxuICAgICAgICAgICAgICAgIGlmIChjcCAhPT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNFTUlDT0xPTiAmJlxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9pc0NoYXJhY3RlclJlZmVyZW5jZUluQXR0cmlidXRlKCkgJiZcbiAgICAgICAgICAgICAgICAgICAgaXNFbnRpdHlJbkF0dHJpYnV0ZUludmFsaWRFbmQodGhpcy5wcmVwcm9jZXNzb3IucGVlaygxKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9OT1RFOiB3ZSBkb24ndCBmbHVzaCBhbGwgY29uc3VtZWQgY29kZSBwb2ludHMgaGVyZSwgYW5kIGluc3RlYWQgc3dpdGNoIGJhY2sgdG8gdGhlIG9yaWdpbmFsIHN0YXRlIGFmdGVyXG4gICAgICAgICAgICAgICAgICAgIC8vZW1pdHRpbmcgYW4gYW1wZXJzYW5kLiBUaGlzIGlzIGZpbmUsIGFzIGFscGhhbnVtZXJpYyBjaGFyYWN0ZXJzIHdvbid0IGJlIHBhcnNlZCBkaWZmZXJlbnRseSBpbiBhdHRyaWJ1dGVzLlxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBbdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkFNUEVSU0FORF07XG4gICAgICAgICAgICAgICAgICAgIC8vIFNraXAgb3ZlciB0aGUgdmFsdWUuXG4gICAgICAgICAgICAgICAgICAgIGkgKz0gdmFsdWVMZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgc3Vycm9nYXRlIHBhaXIsIGNvbnN1bWUgdGhlIG5leHQgdHdvIGJ5dGVzLlxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVMZW5ndGggPT09IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IFtkZWNvZGVfanNfMS5odG1sRGVjb2RlVHJlZVtpXSAmIH5kZWNvZGVfanNfMS5CaW5UcmllRmxhZ3MuVkFMVUVfTEVOR1RIXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogdmFsdWVMZW5ndGggPT09IDFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBbZGVjb2RlX2pzXzEuaHRtbERlY29kZVRyZWVbKytpXV1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbZGVjb2RlX2pzXzEuaHRtbERlY29kZVRyZWVbKytpXSwgZGVjb2RlX2pzXzEuaHRtbERlY29kZVRyZWVbKytpXV07XG4gICAgICAgICAgICAgICAgICAgIGV4Y2VzcyA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHdpdGhvdXRTZW1pY29sb24gPSBjcCAhPT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNFTUlDT0xPTjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlTGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSB2YWx1ZSBpcyB6ZXJvLWxlbmd0aCwgd2UncmUgZG9uZS5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29uc3VtZSgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fdW5jb25zdW1lKGV4Y2Vzcyk7XG4gICAgICAgIGlmICh3aXRob3V0U2VtaWNvbG9uICYmICF0aGlzLnByZXByb2Nlc3Nvci5lbmRPZkNodW5rSGl0KSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIubWlzc2luZ1NlbWljb2xvbkFmdGVyQ2hhcmFjdGVyUmVmZXJlbmNlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBXZSB3YW50IHRvIGVtaXQgdGhlIGVycm9yIGFib3ZlIG9uIHRoZSBjb2RlIHBvaW50IGFmdGVyIHRoZSBlbnRpdHkuXG4gICAgICAgIC8vIFdlIGFsd2F5cyBjb25zdW1lIG9uZSBjb2RlIHBvaW50IHRvbyBtYW55IGluIHRoZSBsb29wLCBhbmQgd2Ugd2FpdCB0b1xuICAgICAgICAvLyB1bmNvbnN1bWUgaXQgdW50aWwgYWZ0ZXIgdGhlIGVycm9yIGlzIGVtaXR0ZWQuXG4gICAgICAgIHRoaXMuX3VuY29uc3VtZSgxKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgX2lzQ2hhcmFjdGVyUmVmZXJlbmNlSW5BdHRyaWJ1dGUoKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5yZXR1cm5TdGF0ZSA9PT0gU3RhdGUuQVRUUklCVVRFX1ZBTFVFX0RPVUJMRV9RVU9URUQgfHxcbiAgICAgICAgICAgIHRoaXMucmV0dXJuU3RhdGUgPT09IFN0YXRlLkFUVFJJQlVURV9WQUxVRV9TSU5HTEVfUVVPVEVEIHx8XG4gICAgICAgICAgICB0aGlzLnJldHVyblN0YXRlID09PSBTdGF0ZS5BVFRSSUJVVEVfVkFMVUVfVU5RVU9URUQpO1xuICAgIH1cbiAgICBfZmx1c2hDb2RlUG9pbnRDb25zdW1lZEFzQ2hhcmFjdGVyUmVmZXJlbmNlKGNwKSB7XG4gICAgICAgIGlmICh0aGlzLl9pc0NoYXJhY3RlclJlZmVyZW5jZUluQXR0cmlidXRlKCkpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dHIudmFsdWUgKz0gU3RyaW5nLmZyb21Db2RlUG9pbnQoY3ApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENvZGVQb2ludChjcCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQ2FsbGluZyBzdGF0ZXMgdGhpcyB3YXkgdHVybnMgb3V0IHRvIGJlIG11Y2ggZmFzdGVyIHRoYW4gYW55IG90aGVyIGFwcHJvYWNoLlxuICAgIF9jYWxsU3RhdGUoY3ApIHtcbiAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkRBVEE6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZURhdGEoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5SQ0RBVEE6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZVJjZGF0YShjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLlJBV1RFWFQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZVJhd3RleHQoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5TQ1JJUFRfREFUQToge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlU2NyaXB0RGF0YShjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLlBMQUlOVEVYVDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlUGxhaW50ZXh0KGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuVEFHX09QRU46IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZVRhZ09wZW4oY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5FTkRfVEFHX09QRU46IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUVuZFRhZ09wZW4oY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5UQUdfTkFNRToge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlVGFnTmFtZShjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLlJDREFUQV9MRVNTX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlUmNkYXRhTGVzc1RoYW5TaWduKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuUkNEQVRBX0VORF9UQUdfT1BFTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlUmNkYXRhRW5kVGFnT3BlbihjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLlJDREFUQV9FTkRfVEFHX05BTUU6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZVJjZGF0YUVuZFRhZ05hbWUoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5SQVdURVhUX0xFU1NfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVSYXd0ZXh0TGVzc1RoYW5TaWduKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuUkFXVEVYVF9FTkRfVEFHX09QRU46IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZVJhd3RleHRFbmRUYWdPcGVuKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuUkFXVEVYVF9FTkRfVEFHX05BTUU6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZVJhd3RleHRFbmRUYWdOYW1lKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuU0NSSVBUX0RBVEFfTEVTU19USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZVNjcmlwdERhdGFMZXNzVGhhblNpZ24oY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5TQ1JJUFRfREFUQV9FTkRfVEFHX09QRU46IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZVNjcmlwdERhdGFFbmRUYWdPcGVuKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuU0NSSVBUX0RBVEFfRU5EX1RBR19OQU1FOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVTY3JpcHREYXRhRW5kVGFnTmFtZShjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLlNDUklQVF9EQVRBX0VTQ0FQRV9TVEFSVDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlU2NyaXB0RGF0YUVzY2FwZVN0YXJ0KGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuU0NSSVBUX0RBVEFfRVNDQVBFX1NUQVJUX0RBU0g6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZVNjcmlwdERhdGFFc2NhcGVTdGFydERhc2goY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5TQ1JJUFRfREFUQV9FU0NBUEVEOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVTY3JpcHREYXRhRXNjYXBlZChjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLlNDUklQVF9EQVRBX0VTQ0FQRURfREFTSDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlU2NyaXB0RGF0YUVzY2FwZWREYXNoKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuU0NSSVBUX0RBVEFfRVNDQVBFRF9EQVNIX0RBU0g6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZVNjcmlwdERhdGFFc2NhcGVkRGFzaERhc2goY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5TQ1JJUFRfREFUQV9FU0NBUEVEX0xFU1NfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVTY3JpcHREYXRhRXNjYXBlZExlc3NUaGFuU2lnbihjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLlNDUklQVF9EQVRBX0VTQ0FQRURfRU5EX1RBR19PUEVOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVTY3JpcHREYXRhRXNjYXBlZEVuZFRhZ09wZW4oY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5TQ1JJUFRfREFUQV9FU0NBUEVEX0VORF9UQUdfTkFNRToge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlU2NyaXB0RGF0YUVzY2FwZWRFbmRUYWdOYW1lKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRV9TVEFSVDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlU2NyaXB0RGF0YURvdWJsZUVzY2FwZVN0YXJ0KGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRUQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZVNjcmlwdERhdGFEb3VibGVFc2NhcGVkKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfREFTSDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlU2NyaXB0RGF0YURvdWJsZUVzY2FwZWREYXNoKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfREFTSF9EQVNIOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVTY3JpcHREYXRhRG91YmxlRXNjYXBlZERhc2hEYXNoKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfTEVTU19USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZVNjcmlwdERhdGFEb3VibGVFc2NhcGVkTGVzc1RoYW5TaWduKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRV9FTkQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZVNjcmlwdERhdGFEb3VibGVFc2NhcGVFbmQoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5CRUZPUkVfQVRUUklCVVRFX05BTUU6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUJlZm9yZUF0dHJpYnV0ZU5hbWUoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5BVFRSSUJVVEVfTkFNRToge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQXR0cmlidXRlTmFtZShjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkFGVEVSX0FUVFJJQlVURV9OQU1FOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVBZnRlckF0dHJpYnV0ZU5hbWUoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5CRUZPUkVfQVRUUklCVVRFX1ZBTFVFOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVCZWZvcmVBdHRyaWJ1dGVWYWx1ZShjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkFUVFJJQlVURV9WQUxVRV9ET1VCTEVfUVVPVEVEOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVBdHRyaWJ1dGVWYWx1ZURvdWJsZVF1b3RlZChjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkFUVFJJQlVURV9WQUxVRV9TSU5HTEVfUVVPVEVEOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVBdHRyaWJ1dGVWYWx1ZVNpbmdsZVF1b3RlZChjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkFUVFJJQlVURV9WQUxVRV9VTlFVT1RFRDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQXR0cmlidXRlVmFsdWVVbnF1b3RlZChjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkFGVEVSX0FUVFJJQlVURV9WQUxVRV9RVU9URUQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUFmdGVyQXR0cmlidXRlVmFsdWVRdW90ZWQoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5TRUxGX0NMT1NJTkdfU1RBUlRfVEFHOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVTZWxmQ2xvc2luZ1N0YXJ0VGFnKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuQk9HVVNfQ09NTUVOVDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQm9ndXNDb21tZW50KGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuTUFSS1VQX0RFQ0xBUkFUSU9OX09QRU46IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZU1hcmt1cERlY2xhcmF0aW9uT3BlbihjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkNPTU1FTlRfU1RBUlQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUNvbW1lbnRTdGFydChjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkNPTU1FTlRfU1RBUlRfREFTSDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQ29tbWVudFN0YXJ0RGFzaChjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkNPTU1FTlQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUNvbW1lbnQoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5DT01NRU5UX0xFU1NfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVDb21tZW50TGVzc1RoYW5TaWduKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuQ09NTUVOVF9MRVNTX1RIQU5fU0lHTl9CQU5HOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVDb21tZW50TGVzc1RoYW5TaWduQmFuZyhjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkNPTU1FTlRfTEVTU19USEFOX1NJR05fQkFOR19EQVNIOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVDb21tZW50TGVzc1RoYW5TaWduQmFuZ0Rhc2goY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5DT01NRU5UX0xFU1NfVEhBTl9TSUdOX0JBTkdfREFTSF9EQVNIOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVDb21tZW50TGVzc1RoYW5TaWduQmFuZ0Rhc2hEYXNoKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuQ09NTUVOVF9FTkRfREFTSDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQ29tbWVudEVuZERhc2goY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5DT01NRU5UX0VORDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQ29tbWVudEVuZChjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkNPTU1FTlRfRU5EX0JBTkc6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUNvbW1lbnRFbmRCYW5nKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuRE9DVFlQRToge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlRG9jdHlwZShjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkJFRk9SRV9ET0NUWVBFX05BTUU6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUJlZm9yZURvY3R5cGVOYW1lKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuRE9DVFlQRV9OQU1FOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVEb2N0eXBlTmFtZShjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkFGVEVSX0RPQ1RZUEVfTkFNRToge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQWZ0ZXJEb2N0eXBlTmFtZShjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkFGVEVSX0RPQ1RZUEVfUFVCTElDX0tFWVdPUkQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUFmdGVyRG9jdHlwZVB1YmxpY0tleXdvcmQoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5CRUZPUkVfRE9DVFlQRV9QVUJMSUNfSURFTlRJRklFUjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQmVmb3JlRG9jdHlwZVB1YmxpY0lkZW50aWZpZXIoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5ET0NUWVBFX1BVQkxJQ19JREVOVElGSUVSX0RPVUJMRV9RVU9URUQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZURvY3R5cGVQdWJsaWNJZGVudGlmaWVyRG91YmxlUXVvdGVkKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuRE9DVFlQRV9QVUJMSUNfSURFTlRJRklFUl9TSU5HTEVfUVVPVEVEOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVEb2N0eXBlUHVibGljSWRlbnRpZmllclNpbmdsZVF1b3RlZChjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkFGVEVSX0RPQ1RZUEVfUFVCTElDX0lERU5USUZJRVI6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUFmdGVyRG9jdHlwZVB1YmxpY0lkZW50aWZpZXIoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5CRVRXRUVOX0RPQ1RZUEVfUFVCTElDX0FORF9TWVNURU1fSURFTlRJRklFUlM6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUJldHdlZW5Eb2N0eXBlUHVibGljQW5kU3lzdGVtSWRlbnRpZmllcnMoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5BRlRFUl9ET0NUWVBFX1NZU1RFTV9LRVlXT1JEOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVBZnRlckRvY3R5cGVTeXN0ZW1LZXl3b3JkKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuQkVGT1JFX0RPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVI6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUJlZm9yZURvY3R5cGVTeXN0ZW1JZGVudGlmaWVyKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUl9ET1VCTEVfUVVPVEVEOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVEb2N0eXBlU3lzdGVtSWRlbnRpZmllckRvdWJsZVF1b3RlZChjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkRPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVJfU0lOR0xFX1FVT1RFRDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlRG9jdHlwZVN5c3RlbUlkZW50aWZpZXJTaW5nbGVRdW90ZWQoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5BRlRFUl9ET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVBZnRlckRvY3R5cGVTeXN0ZW1JZGVudGlmaWVyKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuQk9HVVNfRE9DVFlQRToge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQm9ndXNEb2N0eXBlKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuQ0RBVEFfU0VDVElPTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQ2RhdGFTZWN0aW9uKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuQ0RBVEFfU0VDVElPTl9CUkFDS0VUOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVDZGF0YVNlY3Rpb25CcmFja2V0KGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuQ0RBVEFfU0VDVElPTl9FTkQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUNkYXRhU2VjdGlvbkVuZChjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkNIQVJBQ1RFUl9SRUZFUkVOQ0U6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUNoYXJhY3RlclJlZmVyZW5jZShjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLk5BTUVEX0NIQVJBQ1RFUl9SRUZFUkVOQ0U6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZU5hbWVkQ2hhcmFjdGVyUmVmZXJlbmNlKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuQU1CSUdVT1VTX0FNUEVSU0FORDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQW1iaWd1b3VzQW1wZXJzYW5kKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuTlVNRVJJQ19DSEFSQUNURVJfUkVGRVJFTkNFOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVOdW1lcmljQ2hhcmFjdGVyUmVmZXJlbmNlKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuSEVYQURFTUlDQUxfQ0hBUkFDVEVSX1JFRkVSRU5DRV9TVEFSVDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlSGV4YWRlbWljYWxDaGFyYWN0ZXJSZWZlcmVuY2VTdGFydChjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFN0YXRlLkhFWEFERU1JQ0FMX0NIQVJBQ1RFUl9SRUZFUkVOQ0U6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUhleGFkZW1pY2FsQ2hhcmFjdGVyUmVmZXJlbmNlKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuREVDSU1BTF9DSEFSQUNURVJfUkVGRVJFTkNFOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVEZWNpbWFsQ2hhcmFjdGVyUmVmZXJlbmNlKGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgU3RhdGUuTlVNRVJJQ19DSEFSQUNURVJfUkVGRVJFTkNFX0VORDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlTnVtZXJpY0NoYXJhY3RlclJlZmVyZW5jZUVuZChjcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHN0YXRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gU3RhdGUgbWFjaGluZVxuICAgIC8vIERhdGEgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZURhdGEoY3ApIHtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTEVTU19USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuVEFHX09QRU47XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5BTVBFUlNBTkQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnJldHVyblN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQ0hBUkFDVEVSX1JFRkVSRU5DRTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLk5VTEw6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDb2RlUG9pbnQoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRU9GOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdENvZGVQb2ludChjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gIFJDREFUQSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlUmNkYXRhKGNwKSB7XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkFNUEVSU0FORDoge1xuICAgICAgICAgICAgICAgIHRoaXMucmV0dXJuU3RhdGUgPSBTdGF0ZS5SQ0RBVEE7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkNIQVJBQ1RFUl9SRUZFUkVOQ0U7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MRVNTX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5SQ0RBVEFfTEVTU19USEFOX1NJR047XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5OVUxMOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnModW5pY29kZV9qc18xLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBSQVdURVhUIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVSYXd0ZXh0KGNwKSB7XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxFU1NfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlJBV1RFWFRfTEVTU19USEFOX1NJR047XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5OVUxMOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnModW5pY29kZV9qc18xLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBTY3JpcHQgZGF0YSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlU2NyaXB0RGF0YShjcCkge1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MRVNTX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9MRVNTX1RIQU5fU0lHTjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLk5VTEw6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycyh1bmljb2RlX2pzXzEuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDb2RlUG9pbnQoY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIFBMQUlOVEVYVCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlUGxhaW50ZXh0KGNwKSB7XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLk5VTEw6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycyh1bmljb2RlX2pzXzEuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDb2RlUG9pbnQoY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIFRhZyBvcGVuIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVUYWdPcGVuKGNwKSB7XG4gICAgICAgIGlmIChpc0FzY2lpTGV0dGVyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlU3RhcnRUYWdUb2tlbigpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlRBR19OQU1FO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVUYWdOYW1lKGNwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRVhDTEFNQVRJT05fTUFSSzoge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuTUFSS1VQX0RFQ0xBUkFUSU9OX09QRU47XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5TT0xJRFVTOiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5FTkRfVEFHX09QRU47XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5RVUVTVElPTl9NQVJLOiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi51bmV4cGVjdGVkUXVlc3Rpb25NYXJrSW5zdGVhZE9mVGFnTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2NyZWF0ZUNvbW1lbnRUb2tlbigxKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJPR1VTX0NPTU1FTlQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQm9ndXNDb21tZW50KGNwKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuZW9mQmVmb3JlVGFnTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPCcpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmludmFsaWRGaXJzdENoYXJhY3Rlck9mVGFnTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPCcpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVEYXRhKGNwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgfVxuICAgIC8vIEVuZCB0YWcgb3BlbiBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlRW5kVGFnT3BlbihjcCkge1xuICAgICAgICBpZiAoaXNBc2NpaUxldHRlcihjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZUVuZFRhZ1Rva2VuKCk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuVEFHX05BTUU7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZVRhZ05hbWUoY3ApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIubWlzc2luZ0VuZFRhZ05hbWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuZW9mQmVmb3JlVGFnTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPC8nKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5pbnZhbGlkRmlyc3RDaGFyYWN0ZXJPZlRhZ05hbWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jcmVhdGVDb21tZW50VG9rZW4oMik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5CT0dVU19DT01NRU5UO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUJvZ3VzQ29tbWVudChjcCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgIH1cbiAgICAvLyBUYWcgbmFtZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlVGFnTmFtZShjcCkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuY3VycmVudFRva2VuO1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5TUEFDRTpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxJTkVfRkVFRDpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlRBQlVMQVRJT046XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5GT1JNX0ZFRUQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQkVGT1JFX0FUVFJJQlVURV9OQU1FO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuU09MSURVUzoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TRUxGX0NMT1NJTkdfU1RBUlRfVEFHO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50VGFnVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLk5VTEw6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgICAgIHRva2VuLnRhZ05hbWUgKz0gdW5pY29kZV9qc18xLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJblRhZyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdG9rZW4udGFnTmFtZSArPSBTdHJpbmcuZnJvbUNvZGVQb2ludChpc0FzY2lpVXBwZXIoY3ApID8gdG9Bc2NpaUxvd2VyKGNwKSA6IGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBSQ0RBVEEgbGVzcy10aGFuIHNpZ24gc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZVJjZGF0YUxlc3NUaGFuU2lnbihjcCkge1xuICAgICAgICBpZiAoY3AgPT09IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5TT0xJRFVTKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuUkNEQVRBX0VORF9UQUdfT1BFTjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPCcpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlJDREFUQTtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlUmNkYXRhKGNwKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBSQ0RBVEEgZW5kIHRhZyBvcGVuIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVSY2RhdGFFbmRUYWdPcGVuKGNwKSB7XG4gICAgICAgIGlmIChpc0FzY2lpTGV0dGVyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlJDREFUQV9FTkRfVEFHX05BTUU7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZVJjZGF0YUVuZFRhZ05hbWUoY3ApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCc8LycpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlJDREFUQTtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlUmNkYXRhKGNwKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBoYW5kbGVTcGVjaWFsRW5kVGFnKF9jcCkge1xuICAgICAgICBpZiAoIXRoaXMucHJlcHJvY2Vzc29yLnN0YXJ0c1dpdGgodGhpcy5sYXN0U3RhcnRUYWdOYW1lLCBmYWxzZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAhdGhpcy5fZW5zdXJlSGliZXJuYXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jcmVhdGVFbmRUYWdUb2tlbigpO1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuY3VycmVudFRva2VuO1xuICAgICAgICB0b2tlbi50YWdOYW1lID0gdGhpcy5sYXN0U3RhcnRUYWdOYW1lO1xuICAgICAgICBjb25zdCBjcCA9IHRoaXMucHJlcHJvY2Vzc29yLnBlZWsodGhpcy5sYXN0U3RhcnRUYWdOYW1lLmxlbmd0aCk7XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNQQUNFOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTElORV9GRUVEOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuVEFCVUxBVElPTjpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkZPUk1fRkVFRDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2FkdmFuY2VCeSh0aGlzLmxhc3RTdGFydFRhZ05hbWUubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQkVGT1JFX0FUVFJJQlVURV9OQU1FO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNPTElEVVM6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hZHZhbmNlQnkodGhpcy5sYXN0U3RhcnRUYWdOYW1lLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNFTEZfQ0xPU0lOR19TVEFSVF9UQUc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hZHZhbmNlQnkodGhpcy5sYXN0U3RhcnRUYWdOYW1lLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudFRhZ1Rva2VuKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkRBVEE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHJldHVybiAhdGhpcy5fZW5zdXJlSGliZXJuYXRpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBSQ0RBVEEgZW5kIHRhZyBuYW1lIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVSY2RhdGFFbmRUYWdOYW1lKGNwKSB7XG4gICAgICAgIGlmICh0aGlzLmhhbmRsZVNwZWNpYWxFbmRUYWcoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJzwvJyk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuUkNEQVRBO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVSY2RhdGEoY3ApO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIFJBV1RFWFQgbGVzcy10aGFuIHNpZ24gc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZVJhd3RleHRMZXNzVGhhblNpZ24oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuU09MSURVUykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlJBV1RFWFRfRU5EX1RBR19PUEVOO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCc8Jyk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuUkFXVEVYVDtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlUmF3dGV4dChjcCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gUkFXVEVYVCBlbmQgdGFnIG9wZW4gc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZVJhd3RleHRFbmRUYWdPcGVuKGNwKSB7XG4gICAgICAgIGlmIChpc0FzY2lpTGV0dGVyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlJBV1RFWFRfRU5EX1RBR19OQU1FO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVSYXd0ZXh0RW5kVGFnTmFtZShjcCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJzwvJyk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuUkFXVEVYVDtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlUmF3dGV4dChjcCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gUkFXVEVYVCBlbmQgdGFnIG5hbWUgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZVJhd3RleHRFbmRUYWdOYW1lKGNwKSB7XG4gICAgICAgIGlmICh0aGlzLmhhbmRsZVNwZWNpYWxFbmRUYWcoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJzwvJyk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuUkFXVEVYVDtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlUmF3dGV4dChjcCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gU2NyaXB0IGRhdGEgbGVzcy10aGFuIHNpZ24gc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZVNjcmlwdERhdGFMZXNzVGhhblNpZ24oY3ApIHtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuU09MSURVUzoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9FTkRfVEFHX09QRU47XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FWENMQU1BVElPTl9NQVJLOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBX0VTQ0FQRV9TVEFSVDtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJzwhJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCc8Jyk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlU2NyaXB0RGF0YShjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gU2NyaXB0IGRhdGEgZW5kIHRhZyBvcGVuIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVTY3JpcHREYXRhRW5kVGFnT3BlbihjcCkge1xuICAgICAgICBpZiAoaXNBc2NpaUxldHRlcihjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9FTkRfVEFHX05BTUU7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZVNjcmlwdERhdGFFbmRUYWdOYW1lKGNwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPC8nKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQTtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlU2NyaXB0RGF0YShjcCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gU2NyaXB0IGRhdGEgZW5kIHRhZyBuYW1lIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVTY3JpcHREYXRhRW5kVGFnTmFtZShjcCkge1xuICAgICAgICBpZiAodGhpcy5oYW5kbGVTcGVjaWFsRW5kVGFnKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCc8LycpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVTY3JpcHREYXRhKGNwKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBTY3JpcHQgZGF0YSBlc2NhcGUgc3RhcnQgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZVNjcmlwdERhdGFFc2NhcGVTdGFydChjcCkge1xuICAgICAgICBpZiAoY3AgPT09IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5IWVBIRU5fTUlOVVMpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9FU0NBUEVfU1RBUlRfREFTSDtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnLScpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVTY3JpcHREYXRhKGNwKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBTY3JpcHQgZGF0YSBlc2NhcGUgc3RhcnQgZGFzaCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlU2NyaXB0RGF0YUVzY2FwZVN0YXJ0RGFzaChjcCkge1xuICAgICAgICBpZiAoY3AgPT09IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5IWVBIRU5fTUlOVVMpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9FU0NBUEVEX0RBU0hfREFTSDtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnLScpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVTY3JpcHREYXRhKGNwKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBTY3JpcHQgZGF0YSBlc2NhcGVkIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVTY3JpcHREYXRhRXNjYXBlZChjcCkge1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5IWVBIRU5fTUlOVVM6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuU0NSSVBUX0RBVEFfRVNDQVBFRF9EQVNIO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnLScpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTEVTU19USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuU0NSSVBUX0RBVEFfRVNDQVBFRF9MRVNTX1RIQU5fU0lHTjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLk5VTEw6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycyh1bmljb2RlX2pzXzEuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJblNjcmlwdEh0bWxDb21tZW50TGlrZVRleHQpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDb2RlUG9pbnQoY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIFNjcmlwdCBkYXRhIGVzY2FwZWQgZGFzaCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlU2NyaXB0RGF0YUVzY2FwZWREYXNoKGNwKSB7XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkhZUEhFTl9NSU5VUzoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9FU0NBUEVEX0RBU0hfREFTSDtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJy0nKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxFU1NfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBX0VTQ0FQRURfTEVTU19USEFOX1NJR047XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5OVUxMOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuU0NSSVBUX0RBVEFfRVNDQVBFRDtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnModW5pY29kZV9qc18xLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuZW9mSW5TY3JpcHRIdG1sQ29tbWVudExpa2VUZXh0KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuU0NSSVBUX0RBVEFfRVNDQVBFRDtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBTY3JpcHQgZGF0YSBlc2NhcGVkIGRhc2ggZGFzaCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlU2NyaXB0RGF0YUVzY2FwZWREYXNoRGFzaChjcCkge1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5IWVBIRU5fTUlOVVM6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJy0nKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxFU1NfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBX0VTQ0FQRURfTEVTU19USEFOX1NJR047XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJz4nKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLk5VTEw6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9FU0NBUEVEO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycyh1bmljb2RlX2pzXzEuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJblNjcmlwdEh0bWxDb21tZW50TGlrZVRleHQpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9FU0NBUEVEO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDb2RlUG9pbnQoY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIFNjcmlwdCBkYXRhIGVzY2FwZWQgbGVzcy10aGFuIHNpZ24gc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZVNjcmlwdERhdGFFc2NhcGVkTGVzc1RoYW5TaWduKGNwKSB7XG4gICAgICAgIGlmIChjcCA9PT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNPTElEVVMpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9FU0NBUEVEX0VORF9UQUdfT1BFTjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpc0FzY2lpTGV0dGVyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCc8Jyk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRV9TVEFSVDtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlU2NyaXB0RGF0YURvdWJsZUVzY2FwZVN0YXJ0KGNwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPCcpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBX0VTQ0FQRUQ7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZVNjcmlwdERhdGFFc2NhcGVkKGNwKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBTY3JpcHQgZGF0YSBlc2NhcGVkIGVuZCB0YWcgb3BlbiBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlU2NyaXB0RGF0YUVzY2FwZWRFbmRUYWdPcGVuKGNwKSB7XG4gICAgICAgIGlmIChpc0FzY2lpTGV0dGVyKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBX0VTQ0FQRURfRU5EX1RBR19OQU1FO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVTY3JpcHREYXRhRXNjYXBlZEVuZFRhZ05hbWUoY3ApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCc8LycpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBX0VTQ0FQRUQ7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZVNjcmlwdERhdGFFc2NhcGVkKGNwKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBTY3JpcHQgZGF0YSBlc2NhcGVkIGVuZCB0YWcgbmFtZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlU2NyaXB0RGF0YUVzY2FwZWRFbmRUYWdOYW1lKGNwKSB7XG4gICAgICAgIGlmICh0aGlzLmhhbmRsZVNwZWNpYWxFbmRUYWcoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJzwvJyk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuU0NSSVBUX0RBVEFfRVNDQVBFRDtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlU2NyaXB0RGF0YUVzY2FwZWQoY3ApO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIFNjcmlwdCBkYXRhIGRvdWJsZSBlc2NhcGUgc3RhcnQgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZVNjcmlwdERhdGFEb3VibGVFc2NhcGVTdGFydChjcCkge1xuICAgICAgICBpZiAodGhpcy5wcmVwcm9jZXNzb3Iuc3RhcnRzV2l0aCh1bmljb2RlX2pzXzEuU0VRVUVOQ0VTLlNDUklQVCwgZmFsc2UpICYmXG4gICAgICAgICAgICBpc1NjcmlwdERhdGFEb3VibGVFc2NhcGVTZXF1ZW5jZUVuZCh0aGlzLnByZXByb2Nlc3Nvci5wZWVrKHVuaWNvZGVfanNfMS5TRVFVRU5DRVMuU0NSSVBULmxlbmd0aCkpKSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdW5pY29kZV9qc18xLlNFUVVFTkNFUy5TQ1JJUFQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KHRoaXMuX2NvbnN1bWUoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRUQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIXRoaXMuX2Vuc3VyZUhpYmVybmF0aW9uKCkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9FU0NBUEVEO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVTY3JpcHREYXRhRXNjYXBlZChjcCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gU2NyaXB0IGRhdGEgZG91YmxlIGVzY2FwZWQgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZVNjcmlwdERhdGFEb3VibGVFc2NhcGVkKGNwKSB7XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkhZUEhFTl9NSU5VUzoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFRF9EQVNIO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnLScpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTEVTU19USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRURfTEVTU19USEFOX1NJR047XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCc8Jyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5OVUxMOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnModW5pY29kZV9qc18xLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuZW9mSW5TY3JpcHRIdG1sQ29tbWVudExpa2VUZXh0KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBTY3JpcHQgZGF0YSBkb3VibGUgZXNjYXBlZCBkYXNoIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVTY3JpcHREYXRhRG91YmxlRXNjYXBlZERhc2goY3ApIHtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuSFlQSEVOX01JTlVTOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX0RBU0hfREFTSDtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJy0nKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxFU1NfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEX0xFU1NfVEhBTl9TSUdOO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPCcpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTlVMTDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi51bmV4cGVjdGVkTnVsbENoYXJhY3Rlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycyh1bmljb2RlX2pzXzEuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJblNjcmlwdEh0bWxDb21tZW50TGlrZVRleHQpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFRDtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBTY3JpcHQgZGF0YSBkb3VibGUgZXNjYXBlZCBkYXNoIGRhc2ggc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZVNjcmlwdERhdGFEb3VibGVFc2NhcGVkRGFzaERhc2goY3ApIHtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuSFlQSEVOX01JTlVTOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCctJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MRVNTX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFRF9MRVNTX1RIQU5fU0lHTjtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJzwnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkdSRUFURVJfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycygnPicpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTlVMTDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi51bmV4cGVjdGVkTnVsbENoYXJhY3Rlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRDaGFycyh1bmljb2RlX2pzXzEuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJblNjcmlwdEh0bWxDb21tZW50TGlrZVRleHQpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TQ1JJUFRfREFUQV9ET1VCTEVfRVNDQVBFRDtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBTY3JpcHQgZGF0YSBkb3VibGUgZXNjYXBlZCBsZXNzLXRoYW4gc2lnbiBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlU2NyaXB0RGF0YURvdWJsZUVzY2FwZWRMZXNzVGhhblNpZ24oY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuU09MSURVUykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVfRU5EO1xuICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCcvJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuU0NSSVBUX0RBVEFfRE9VQkxFX0VTQ0FQRUQ7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZVNjcmlwdERhdGFEb3VibGVFc2NhcGVkKGNwKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBTY3JpcHQgZGF0YSBkb3VibGUgZXNjYXBlIGVuZCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlU2NyaXB0RGF0YURvdWJsZUVzY2FwZUVuZChjcCkge1xuICAgICAgICBpZiAodGhpcy5wcmVwcm9jZXNzb3Iuc3RhcnRzV2l0aCh1bmljb2RlX2pzXzEuU0VRVUVOQ0VTLlNDUklQVCwgZmFsc2UpICYmXG4gICAgICAgICAgICBpc1NjcmlwdERhdGFEb3VibGVFc2NhcGVTZXF1ZW5jZUVuZCh0aGlzLnByZXByb2Nlc3Nvci5wZWVrKHVuaWNvZGVfanNfMS5TRVFVRU5DRVMuU0NSSVBULmxlbmd0aCkpKSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KGNwKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdW5pY29kZV9qc18xLlNFUVVFTkNFUy5TQ1JJUFQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0Q29kZVBvaW50KHRoaXMuX2NvbnN1bWUoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuU0NSSVBUX0RBVEFfRVNDQVBFRDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghdGhpcy5fZW5zdXJlSGliZXJuYXRpb24oKSkge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNDUklQVF9EQVRBX0RPVUJMRV9FU0NBUEVEO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVTY3JpcHREYXRhRG91YmxlRXNjYXBlZChjcCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQmVmb3JlIGF0dHJpYnV0ZSBuYW1lIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVCZWZvcmVBdHRyaWJ1dGVOYW1lKGNwKSB7XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNQQUNFOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTElORV9GRUVEOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuVEFCVUxBVElPTjpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkZPUk1fRkVFRDoge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSB3aGl0ZXNwYWNlXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5TT0xJRFVTOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQUZURVJfQVRUUklCVVRFX05BTUU7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVBZnRlckF0dHJpYnV0ZU5hbWUoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRVFVQUxTX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIudW5leHBlY3RlZEVxdWFsc1NpZ25CZWZvcmVBdHRyaWJ1dGVOYW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9jcmVhdGVBdHRyKCc9Jyk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkFUVFJJQlVURV9OQU1FO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NyZWF0ZUF0dHIoJycpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5BVFRSSUJVVEVfTkFNRTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUF0dHJpYnV0ZU5hbWUoY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIEF0dHJpYnV0ZSBuYW1lIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVBdHRyaWJ1dGVOYW1lKGNwKSB7XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNQQUNFOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTElORV9GRUVEOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuVEFCVUxBVElPTjpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkZPUk1fRkVFRDpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNPTElEVVM6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTjpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2xlYXZlQXR0ck5hbWUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQUZURVJfQVRUUklCVVRFX05BTUU7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVBZnRlckF0dHJpYnV0ZU5hbWUoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRVFVQUxTX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9sZWF2ZUF0dHJOYW1lKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJFRk9SRV9BVFRSSUJVVEVfVkFMVUU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5RVU9UQVRJT05fTUFSSzpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkFQT1NUUk9QSEU6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MRVNTX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi51bmV4cGVjdGVkQ2hhcmFjdGVySW5BdHRyaWJ1dGVOYW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRyLm5hbWUgKz0gU3RyaW5nLmZyb21Db2RlUG9pbnQoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTlVMTDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi51bmV4cGVjdGVkTnVsbENoYXJhY3Rlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0ci5uYW1lICs9IHVuaWNvZGVfanNfMS5SRVBMQUNFTUVOVF9DSEFSQUNURVI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0ci5uYW1lICs9IFN0cmluZy5mcm9tQ29kZVBvaW50KGlzQXNjaWlVcHBlcihjcCkgPyB0b0FzY2lpTG93ZXIoY3ApIDogY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIEFmdGVyIGF0dHJpYnV0ZSBuYW1lIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVBZnRlckF0dHJpYnV0ZU5hbWUoY3ApIHtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuU1BBQ0U6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MSU5FX0ZFRUQ6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5UQUJVTEFUSU9OOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRk9STV9GRUVEOiB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIHdoaXRlc3BhY2VcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNPTElEVVM6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuU0VMRl9DTE9TSU5HX1NUQVJUX1RBRztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVRVUFMU19TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJFRk9SRV9BVFRSSUJVVEVfVkFMVUU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5EQVRBO1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnRUYWdUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRU9GOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmVvZkluVGFnKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jcmVhdGVBdHRyKCcnKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQVRUUklCVVRFX05BTUU7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVBdHRyaWJ1dGVOYW1lKGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBCZWZvcmUgYXR0cmlidXRlIHZhbHVlIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVCZWZvcmVBdHRyaWJ1dGVWYWx1ZShjcCkge1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5TUEFDRTpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxJTkVfRkVFRDpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlRBQlVMQVRJT046XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5GT1JNX0ZFRUQ6IHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgd2hpdGVzcGFjZVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuUVVPVEFUSU9OX01BUks6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQVRUUklCVVRFX1ZBTFVFX0RPVUJMRV9RVU9URUQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5BUE9TVFJPUEhFOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkFUVFJJQlVURV9WQUxVRV9TSU5HTEVfUVVPVEVEO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIubWlzc2luZ0F0dHJpYnV0ZVZhbHVlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50VGFnVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQVRUUklCVVRFX1ZBTFVFX1VOUVVPVEVEO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQXR0cmlidXRlVmFsdWVVbnF1b3RlZChjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQXR0cmlidXRlIHZhbHVlIChkb3VibGUtcXVvdGVkKSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlQXR0cmlidXRlVmFsdWVEb3VibGVRdW90ZWQoY3ApIHtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuUVVPVEFUSU9OX01BUks6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQUZURVJfQVRUUklCVVRFX1ZBTFVFX1FVT1RFRDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkFNUEVSU0FORDoge1xuICAgICAgICAgICAgICAgIHRoaXMucmV0dXJuU3RhdGUgPSBTdGF0ZS5BVFRSSUJVVEVfVkFMVUVfRE9VQkxFX1FVT1RFRDtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQ0hBUkFDVEVSX1JFRkVSRU5DRTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLk5VTEw6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dHIudmFsdWUgKz0gdW5pY29kZV9qc18xLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJblRhZyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0ci52YWx1ZSArPSBTdHJpbmcuZnJvbUNvZGVQb2ludChjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQXR0cmlidXRlIHZhbHVlIChzaW5nbGUtcXVvdGVkKSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlQXR0cmlidXRlVmFsdWVTaW5nbGVRdW90ZWQoY3ApIHtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuQVBPU1RST1BIRToge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5BRlRFUl9BVFRSSUJVVEVfVkFMVUVfUVVPVEVEO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuQU1QRVJTQU5EOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXR1cm5TdGF0ZSA9IFN0YXRlLkFUVFJJQlVURV9WQUxVRV9TSU5HTEVfUVVPVEVEO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DSEFSQUNURVJfUkVGRVJFTkNFO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTlVMTDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi51bmV4cGVjdGVkTnVsbENoYXJhY3Rlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0ci52YWx1ZSArPSB1bmljb2RlX2pzXzEuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRU9GOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmVvZkluVGFnKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRyLnZhbHVlICs9IFN0cmluZy5mcm9tQ29kZVBvaW50KGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBBdHRyaWJ1dGUgdmFsdWUgKHVucXVvdGVkKSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlQXR0cmlidXRlVmFsdWVVbnF1b3RlZChjcCkge1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5TUEFDRTpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxJTkVfRkVFRDpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlRBQlVMQVRJT046XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5GT1JNX0ZFRUQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9sZWF2ZUF0dHJWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5CRUZPUkVfQVRUUklCVVRFX05BTUU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5BTVBFUlNBTkQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnJldHVyblN0YXRlID0gU3RhdGUuQVRUUklCVVRFX1ZBTFVFX1VOUVVPVEVEO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DSEFSQUNURVJfUkVGRVJFTkNFO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9sZWF2ZUF0dHJWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5EQVRBO1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnRUYWdUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTlVMTDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi51bmV4cGVjdGVkTnVsbENoYXJhY3Rlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0ci52YWx1ZSArPSB1bmljb2RlX2pzXzEuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuUVVPVEFUSU9OX01BUks6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5BUE9TVFJPUEhFOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTEVTU19USEFOX1NJR046XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FUVVBTFNfU0lHTjpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkdSQVZFX0FDQ0VOVDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi51bmV4cGVjdGVkQ2hhcmFjdGVySW5VbnF1b3RlZEF0dHJpYnV0ZVZhbHVlKTtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRyLnZhbHVlICs9IFN0cmluZy5mcm9tQ29kZVBvaW50KGNwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJblRhZyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0ci52YWx1ZSArPSBTdHJpbmcuZnJvbUNvZGVQb2ludChjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQWZ0ZXIgYXR0cmlidXRlIHZhbHVlIChxdW90ZWQpIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVBZnRlckF0dHJpYnV0ZVZhbHVlUXVvdGVkKGNwKSB7XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNQQUNFOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTElORV9GRUVEOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuVEFCVUxBVElPTjpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkZPUk1fRkVFRDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2xlYXZlQXR0clZhbHVlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJFRk9SRV9BVFRSSUJVVEVfTkFNRTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNPTElEVVM6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9sZWF2ZUF0dHJWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5TRUxGX0NMT1NJTkdfU1RBUlRfVEFHO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9sZWF2ZUF0dHJWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5EQVRBO1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnRUYWdUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRU9GOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmVvZkluVGFnKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIubWlzc2luZ1doaXRlc3BhY2VCZXR3ZWVuQXR0cmlidXRlcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJFRk9SRV9BVFRSSUJVVEVfTkFNRTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUJlZm9yZUF0dHJpYnV0ZU5hbWUoY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIFNlbGYtY2xvc2luZyBzdGFydCB0YWcgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZVNlbGZDbG9zaW5nU3RhcnRUYWcoY3ApIHtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuY3VycmVudFRva2VuO1xuICAgICAgICAgICAgICAgIHRva2VuLnNlbGZDbG9zaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50VGFnVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJblRhZyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLnVuZXhwZWN0ZWRTb2xpZHVzSW5UYWcpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5CRUZPUkVfQVRUUklCVVRFX05BTUU7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVCZWZvcmVBdHRyaWJ1dGVOYW1lKGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBCb2d1cyBjb21tZW50IHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVCb2d1c0NvbW1lbnQoY3ApIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0aGlzLmN1cnJlbnRUb2tlbjtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50Q29tbWVudCh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50Q29tbWVudCh0b2tlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5OVUxMOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5kYXRhICs9IHVuaWNvZGVfanNfMS5SRVBMQUNFTUVOVF9DSEFSQUNURVI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdG9rZW4uZGF0YSArPSBTdHJpbmcuZnJvbUNvZGVQb2ludChjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gTWFya3VwIGRlY2xhcmF0aW9uIG9wZW4gc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZU1hcmt1cERlY2xhcmF0aW9uT3BlbihjcCkge1xuICAgICAgICBpZiAodGhpcy5fY29uc3VtZVNlcXVlbmNlSWZNYXRjaCh1bmljb2RlX2pzXzEuU0VRVUVOQ0VTLkRBU0hfREFTSCwgdHJ1ZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZUNvbW1lbnRUb2tlbih1bmljb2RlX2pzXzEuU0VRVUVOQ0VTLkRBU0hfREFTSC5sZW5ndGggKyAxKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DT01NRU5UX1NUQVJUO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuX2NvbnN1bWVTZXF1ZW5jZUlmTWF0Y2godW5pY29kZV9qc18xLlNFUVVFTkNFUy5ET0NUWVBFLCBmYWxzZSkpIHtcbiAgICAgICAgICAgIC8vIE5PVEU6IERvY3R5cGVzIHRva2VucyBhcmUgY3JlYXRlZCB3aXRob3V0IGZpeGVkIG9mZnNldHMuIFdlIGtlZXAgdHJhY2sgb2YgdGhlIG1vbWVudCBhIGRvY3R5cGUgKm1pZ2h0KiBzdGFydCBoZXJlLlxuICAgICAgICAgICAgdGhpcy5jdXJyZW50TG9jYXRpb24gPSB0aGlzLmdldEN1cnJlbnRMb2NhdGlvbih1bmljb2RlX2pzXzEuU0VRVUVOQ0VTLkRPQ1RZUEUubGVuZ3RoICsgMSk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuRE9DVFlQRTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLl9jb25zdW1lU2VxdWVuY2VJZk1hdGNoKHVuaWNvZGVfanNfMS5TRVFVRU5DRVMuQ0RBVEFfU1RBUlQsIHRydWUpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pbkZvcmVpZ25Ob2RlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkNEQVRBX1NFQ1RJT047XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuY2RhdGFJbkh0bWxDb250ZW50KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9jcmVhdGVDb21tZW50VG9rZW4odW5pY29kZV9qc18xLlNFUVVFTkNFUy5DREFUQV9TVEFSVC5sZW5ndGggKyAxKTtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2tlbi5kYXRhID0gJ1tDREFUQVsnO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5CT0dVU19DT01NRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vTk9URTogU2VxdWVuY2UgbG9va3VwcyBjYW4gYmUgYWJydXB0ZWQgYnkgaGliZXJuYXRpb24uIEluIHRoYXQgY2FzZSwgbG9va3VwXG4gICAgICAgIC8vcmVzdWx0cyBhcmUgbm8gbG9uZ2VyIHZhbGlkIGFuZCB3ZSB3aWxsIG5lZWQgdG8gc3RhcnQgb3Zlci5cbiAgICAgICAgZWxzZSBpZiAoIXRoaXMuX2Vuc3VyZUhpYmVybmF0aW9uKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5pbmNvcnJlY3RseU9wZW5lZENvbW1lbnQpO1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlQ29tbWVudFRva2VuKDIpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJPR1VTX0NPTU1FTlQ7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZUJvZ3VzQ29tbWVudChjcCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQ29tbWVudCBzdGFydCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlQ29tbWVudFN0YXJ0KGNwKSB7XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkhZUEhFTl9NSU5VUzoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DT01NRU5UX1NUQVJUX0RBU0g7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5hYnJ1cHRDbG9zaW5nT2ZFbXB0eUNvbW1lbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5EQVRBO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRva2VuID0gdGhpcy5jdXJyZW50VG9rZW47XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudENvbW1lbnQodG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DT01NRU5UO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQ29tbWVudChjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQ29tbWVudCBzdGFydCBkYXNoIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVDb21tZW50U3RhcnREYXNoKGNwKSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdGhpcy5jdXJyZW50VG9rZW47XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkhZUEhFTl9NSU5VUzoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DT01NRU5UX0VORDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkdSRUFURVJfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmFicnVwdENsb3NpbmdPZkVtcHR5Q29tbWVudCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkRBVEE7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudENvbW1lbnQodG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRU9GOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmVvZkluQ29tbWVudCk7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudENvbW1lbnQodG9rZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHRva2VuLmRhdGEgKz0gJy0nO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DT01NRU5UO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQ29tbWVudChjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQ29tbWVudCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlQ29tbWVudChjcCkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuY3VycmVudFRva2VuO1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5IWVBIRU5fTUlOVVM6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQ09NTUVOVF9FTkRfREFTSDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxFU1NfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdG9rZW4uZGF0YSArPSAnPCc7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkNPTU1FTlRfTEVTU19USEFOX1NJR047XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5OVUxMOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5kYXRhICs9IHVuaWNvZGVfanNfMS5SRVBMQUNFTUVOVF9DSEFSQUNURVI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuZW9mSW5Db21tZW50KTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50Q29tbWVudCh0b2tlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdG9rZW4uZGF0YSArPSBTdHJpbmcuZnJvbUNvZGVQb2ludChjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQ29tbWVudCBsZXNzLXRoYW4gc2lnbiBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlQ29tbWVudExlc3NUaGFuU2lnbihjcCkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuY3VycmVudFRva2VuO1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FWENMQU1BVElPTl9NQVJLOiB7XG4gICAgICAgICAgICAgICAgdG9rZW4uZGF0YSArPSAnISc7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkNPTU1FTlRfTEVTU19USEFOX1NJR05fQkFORztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxFU1NfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdG9rZW4uZGF0YSArPSAnPCc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkNPTU1FTlQ7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVDb21tZW50KGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBDb21tZW50IGxlc3MtdGhhbiBzaWduIGJhbmcgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZUNvbW1lbnRMZXNzVGhhblNpZ25CYW5nKGNwKSB7XG4gICAgICAgIGlmIChjcCA9PT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkhZUEhFTl9NSU5VUykge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkNPTU1FTlRfTEVTU19USEFOX1NJR05fQkFOR19EQVNIO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkNPTU1FTlQ7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZUNvbW1lbnQoY3ApO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIENvbW1lbnQgbGVzcy10aGFuIHNpZ24gYmFuZyBkYXNoIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVDb21tZW50TGVzc1RoYW5TaWduQmFuZ0Rhc2goY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuSFlQSEVOX01JTlVTKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQ09NTUVOVF9MRVNTX1RIQU5fU0lHTl9CQU5HX0RBU0hfREFTSDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DT01NRU5UX0VORF9EQVNIO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVDb21tZW50RW5kRGFzaChjcCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQ29tbWVudCBsZXNzLXRoYW4gc2lnbiBiYW5nIGRhc2ggZGFzaCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlQ29tbWVudExlc3NUaGFuU2lnbkJhbmdEYXNoRGFzaChjcCkge1xuICAgICAgICBpZiAoY3AgIT09IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTiAmJiBjcCAhPT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRikge1xuICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLm5lc3RlZENvbW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DT01NRU5UX0VORDtcbiAgICAgICAgdGhpcy5fc3RhdGVDb21tZW50RW5kKGNwKTtcbiAgICB9XG4gICAgLy8gQ29tbWVudCBlbmQgZGFzaCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlQ29tbWVudEVuZERhc2goY3ApIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0aGlzLmN1cnJlbnRUb2tlbjtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuSFlQSEVOX01JTlVTOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkNPTU1FTlRfRU5EO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRU9GOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmVvZkluQ29tbWVudCk7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudENvbW1lbnQodG9rZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHRva2VuLmRhdGEgKz0gJy0nO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DT01NRU5UO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQ29tbWVudChjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQ29tbWVudCBlbmQgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZUNvbW1lbnRFbmQoY3ApIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0aGlzLmN1cnJlbnRUb2tlbjtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50Q29tbWVudCh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FWENMQU1BVElPTl9NQVJLOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkNPTU1FTlRfRU5EX0JBTkc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5IWVBIRU5fTUlOVVM6IHtcbiAgICAgICAgICAgICAgICB0b2tlbi5kYXRhICs9ICctJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJbkNvbW1lbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnRDb21tZW50KHRva2VuKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0b2tlbi5kYXRhICs9ICctLSc7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkNPTU1FTlQ7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVDb21tZW50KGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBDb21tZW50IGVuZCBiYW5nIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVDb21tZW50RW5kQmFuZyhjcCkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuY3VycmVudFRva2VuO1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5IWVBIRU5fTUlOVVM6IHtcbiAgICAgICAgICAgICAgICB0b2tlbi5kYXRhICs9ICctLSEnO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DT01NRU5UX0VORF9EQVNIO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuaW5jb3JyZWN0bHlDbG9zZWRDb21tZW50KTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50Q29tbWVudCh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuZW9mSW5Db21tZW50KTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50Q29tbWVudCh0b2tlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdG9rZW4uZGF0YSArPSAnLS0hJztcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQ09NTUVOVDtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUNvbW1lbnQoY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIERPQ1RZUEUgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZURvY3R5cGUoY3ApIHtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuU1BBQ0U6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MSU5FX0ZFRUQ6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5UQUJVTEFUSU9OOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRk9STV9GRUVEOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJFRk9SRV9ET0NUWVBFX05BTUU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5CRUZPUkVfRE9DVFlQRV9OQU1FO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQmVmb3JlRG9jdHlwZU5hbWUoY3ApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRU9GOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmVvZkluRG9jdHlwZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3JlYXRlRG9jdHlwZVRva2VuKG51bGwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRva2VuID0gdGhpcy5jdXJyZW50VG9rZW47XG4gICAgICAgICAgICAgICAgdG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnREb2N0eXBlKHRva2VuKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIubWlzc2luZ1doaXRlc3BhY2VCZWZvcmVEb2N0eXBlTmFtZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJFRk9SRV9ET0NUWVBFX05BTUU7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVCZWZvcmVEb2N0eXBlTmFtZShjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQmVmb3JlIERPQ1RZUEUgbmFtZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlQmVmb3JlRG9jdHlwZU5hbWUoY3ApIHtcbiAgICAgICAgaWYgKGlzQXNjaWlVcHBlcihjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZURvY3R5cGVUb2tlbihTdHJpbmcuZnJvbUNoYXJDb2RlKHRvQXNjaWlMb3dlcihjcCkpKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5ET0NUWVBFX05BTUU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNQQUNFOlxuICAgICAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxJTkVfRkVFRDpcbiAgICAgICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5UQUJVTEFUSU9OOlxuICAgICAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkZPUk1fRkVFRDoge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZ25vcmUgd2hpdGVzcGFjZVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTlVMTDoge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jcmVhdGVEb2N0eXBlVG9rZW4odW5pY29kZV9qc18xLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5ET0NUWVBFX05BTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIubWlzc2luZ0RvY3R5cGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY3JlYXRlRG9jdHlwZVRva2VuKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuY3VycmVudFRva2VuO1xuICAgICAgICAgICAgICAgICAgICB0b2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnREb2N0eXBlKHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkRBVEE7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmVvZkluRG9jdHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2NyZWF0ZURvY3R5cGVUb2tlbihudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW4gPSB0aGlzLmN1cnJlbnRUb2tlbjtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50RG9jdHlwZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jcmVhdGVEb2N0eXBlVG9rZW4oU3RyaW5nLmZyb21Db2RlUG9pbnQoY3ApKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkRPQ1RZUEVfTkFNRTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgfVxuICAgIC8vIERPQ1RZUEUgbmFtZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlRG9jdHlwZU5hbWUoY3ApIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0aGlzLmN1cnJlbnRUb2tlbjtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuU1BBQ0U6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MSU5FX0ZFRUQ6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5UQUJVTEFUSU9OOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRk9STV9GRUVEOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkFGVEVSX0RPQ1RZUEVfTkFNRTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkdSRUFURVJfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkRBVEE7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudERvY3R5cGUodG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTlVMTDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi51bmV4cGVjdGVkTnVsbENoYXJhY3Rlcik7XG4gICAgICAgICAgICAgICAgdG9rZW4ubmFtZSArPSB1bmljb2RlX2pzXzEuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRU9GOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmVvZkluRG9jdHlwZSk7XG4gICAgICAgICAgICAgICAgdG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnREb2N0eXBlKHRva2VuKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0b2tlbi5uYW1lICs9IFN0cmluZy5mcm9tQ29kZVBvaW50KGlzQXNjaWlVcHBlcihjcCkgPyB0b0FzY2lpTG93ZXIoY3ApIDogY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIEFmdGVyIERPQ1RZUEUgbmFtZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlQWZ0ZXJEb2N0eXBlTmFtZShjcCkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuY3VycmVudFRva2VuO1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5TUEFDRTpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxJTkVfRkVFRDpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlRBQlVMQVRJT046XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5GT1JNX0ZFRUQ6IHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgd2hpdGVzcGFjZVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50RG9jdHlwZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuZW9mSW5Eb2N0eXBlKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudERvY3R5cGUodG9rZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fY29uc3VtZVNlcXVlbmNlSWZNYXRjaCh1bmljb2RlX2pzXzEuU0VRVUVOQ0VTLlBVQkxJQywgZmFsc2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5BRlRFUl9ET0NUWVBFX1BVQkxJQ19LRVlXT1JEO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0aGlzLl9jb25zdW1lU2VxdWVuY2VJZk1hdGNoKHVuaWNvZGVfanNfMS5TRVFVRU5DRVMuU1lTVEVNLCBmYWxzZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkFGVEVSX0RPQ1RZUEVfU1lTVEVNX0tFWVdPUkQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vTk9URTogc2VxdWVuY2UgbG9va3VwIGNhbiBiZSBhYnJ1cHRlZCBieSBoaWJlcm5hdGlvbi4gSW4gdGhhdCBjYXNlIGxvb2t1cFxuICAgICAgICAgICAgICAgIC8vcmVzdWx0cyBhcmUgbm8gbG9uZ2VyIHZhbGlkIGFuZCB3ZSB3aWxsIG5lZWQgdG8gc3RhcnQgb3Zlci5cbiAgICAgICAgICAgICAgICBlbHNlIGlmICghdGhpcy5fZW5zdXJlSGliZXJuYXRpb24oKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuaW52YWxpZENoYXJhY3RlclNlcXVlbmNlQWZ0ZXJEb2N0eXBlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJPR1VTX0RPQ1RZUEU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQm9ndXNEb2N0eXBlKGNwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQWZ0ZXIgRE9DVFlQRSBwdWJsaWMga2V5d29yZCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlQWZ0ZXJEb2N0eXBlUHVibGljS2V5d29yZChjcCkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuY3VycmVudFRva2VuO1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5TUEFDRTpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxJTkVfRkVFRDpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlRBQlVMQVRJT046XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5GT1JNX0ZFRUQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQkVGT1JFX0RPQ1RZUEVfUFVCTElDX0lERU5USUZJRVI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5RVU9UQVRJT05fTUFSSzoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5taXNzaW5nV2hpdGVzcGFjZUFmdGVyRG9jdHlwZVB1YmxpY0tleXdvcmQpO1xuICAgICAgICAgICAgICAgIHRva2VuLnB1YmxpY0lkID0gJyc7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkRPQ1RZUEVfUFVCTElDX0lERU5USUZJRVJfRE9VQkxFX1FVT1RFRDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkFQT1NUUk9QSEU6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIubWlzc2luZ1doaXRlc3BhY2VBZnRlckRvY3R5cGVQdWJsaWNLZXl3b3JkKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5wdWJsaWNJZCA9ICcnO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5ET0NUWVBFX1BVQkxJQ19JREVOVElGSUVSX1NJTkdMRV9RVU9URUQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5taXNzaW5nRG9jdHlwZVB1YmxpY0lkZW50aWZpZXIpO1xuICAgICAgICAgICAgICAgIHRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50RG9jdHlwZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuZW9mSW5Eb2N0eXBlKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudERvY3R5cGUodG9rZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5taXNzaW5nUXVvdGVCZWZvcmVEb2N0eXBlUHVibGljSWRlbnRpZmllcik7XG4gICAgICAgICAgICAgICAgdG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5CT0dVU19ET0NUWVBFO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQm9ndXNEb2N0eXBlKGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBCZWZvcmUgRE9DVFlQRSBwdWJsaWMgaWRlbnRpZmllciBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlQmVmb3JlRG9jdHlwZVB1YmxpY0lkZW50aWZpZXIoY3ApIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0aGlzLmN1cnJlbnRUb2tlbjtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuU1BBQ0U6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MSU5FX0ZFRUQ6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5UQUJVTEFUSU9OOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRk9STV9GRUVEOiB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIHdoaXRlc3BhY2VcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlFVT1RBVElPTl9NQVJLOiB7XG4gICAgICAgICAgICAgICAgdG9rZW4ucHVibGljSWQgPSAnJztcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuRE9DVFlQRV9QVUJMSUNfSURFTlRJRklFUl9ET1VCTEVfUVVPVEVEO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuQVBPU1RST1BIRToge1xuICAgICAgICAgICAgICAgIHRva2VuLnB1YmxpY0lkID0gJyc7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkRPQ1RZUEVfUFVCTElDX0lERU5USUZJRVJfU0lOR0xFX1FVT1RFRDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkdSRUFURVJfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLm1pc3NpbmdEb2N0eXBlUHVibGljSWRlbnRpZmllcik7XG4gICAgICAgICAgICAgICAgdG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5EQVRBO1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnREb2N0eXBlKHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJbkRvY3R5cGUpO1xuICAgICAgICAgICAgICAgIHRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50RG9jdHlwZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLm1pc3NpbmdRdW90ZUJlZm9yZURvY3R5cGVQdWJsaWNJZGVudGlmaWVyKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJPR1VTX0RPQ1RZUEU7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVCb2d1c0RvY3R5cGUoY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIERPQ1RZUEUgcHVibGljIGlkZW50aWZpZXIgKGRvdWJsZS1xdW90ZWQpIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVEb2N0eXBlUHVibGljSWRlbnRpZmllckRvdWJsZVF1b3RlZChjcCkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuY3VycmVudFRva2VuO1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5RVU9UQVRJT05fTUFSSzoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5BRlRFUl9ET0NUWVBFX1BVQkxJQ19JREVOVElGSUVSO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTlVMTDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi51bmV4cGVjdGVkTnVsbENoYXJhY3Rlcik7XG4gICAgICAgICAgICAgICAgdG9rZW4ucHVibGljSWQgKz0gdW5pY29kZV9qc18xLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkdSRUFURVJfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmFicnVwdERvY3R5cGVQdWJsaWNJZGVudGlmaWVyKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudERvY3R5cGUodG9rZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5EQVRBO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRU9GOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmVvZkluRG9jdHlwZSk7XG4gICAgICAgICAgICAgICAgdG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnREb2N0eXBlKHRva2VuKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0b2tlbi5wdWJsaWNJZCArPSBTdHJpbmcuZnJvbUNvZGVQb2ludChjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gRE9DVFlQRSBwdWJsaWMgaWRlbnRpZmllciAoc2luZ2xlLXF1b3RlZCkgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZURvY3R5cGVQdWJsaWNJZGVudGlmaWVyU2luZ2xlUXVvdGVkKGNwKSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdGhpcy5jdXJyZW50VG9rZW47XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkFQT1NUUk9QSEU6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQUZURVJfRE9DVFlQRV9QVUJMSUNfSURFTlRJRklFUjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLk5VTEw6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgICAgIHRva2VuLnB1YmxpY0lkICs9IHVuaWNvZGVfanNfMS5SRVBMQUNFTUVOVF9DSEFSQUNURVI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5hYnJ1cHREb2N0eXBlUHVibGljSWRlbnRpZmllcik7XG4gICAgICAgICAgICAgICAgdG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnREb2N0eXBlKHRva2VuKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJbkRvY3R5cGUpO1xuICAgICAgICAgICAgICAgIHRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50RG9jdHlwZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdG9rZW4ucHVibGljSWQgKz0gU3RyaW5nLmZyb21Db2RlUG9pbnQoY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIEFmdGVyIERPQ1RZUEUgcHVibGljIGlkZW50aWZpZXIgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZUFmdGVyRG9jdHlwZVB1YmxpY0lkZW50aWZpZXIoY3ApIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0aGlzLmN1cnJlbnRUb2tlbjtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuU1BBQ0U6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MSU5FX0ZFRUQ6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5UQUJVTEFUSU9OOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRk9STV9GRUVEOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJFVFdFRU5fRE9DVFlQRV9QVUJMSUNfQU5EX1NZU1RFTV9JREVOVElGSUVSUztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkdSRUFURVJfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkRBVEE7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudERvY3R5cGUodG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuUVVPVEFUSU9OX01BUks6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIubWlzc2luZ1doaXRlc3BhY2VCZXR3ZWVuRG9jdHlwZVB1YmxpY0FuZFN5c3RlbUlkZW50aWZpZXJzKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5zeXN0ZW1JZCA9ICcnO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5ET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSX0RPVUJMRV9RVU9URUQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5BUE9TVFJPUEhFOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLm1pc3NpbmdXaGl0ZXNwYWNlQmV0d2VlbkRvY3R5cGVQdWJsaWNBbmRTeXN0ZW1JZGVudGlmaWVycyk7XG4gICAgICAgICAgICAgICAgdG9rZW4uc3lzdGVtSWQgPSAnJztcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUl9TSU5HTEVfUVVPVEVEO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRU9GOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmVvZkluRG9jdHlwZSk7XG4gICAgICAgICAgICAgICAgdG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnREb2N0eXBlKHRva2VuKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIubWlzc2luZ1F1b3RlQmVmb3JlRG9jdHlwZVN5c3RlbUlkZW50aWZpZXIpO1xuICAgICAgICAgICAgICAgIHRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQk9HVVNfRE9DVFlQRTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUJvZ3VzRG9jdHlwZShjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQmV0d2VlbiBET0NUWVBFIHB1YmxpYyBhbmQgc3lzdGVtIGlkZW50aWZpZXJzIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVCZXR3ZWVuRG9jdHlwZVB1YmxpY0FuZFN5c3RlbUlkZW50aWZpZXJzKGNwKSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdGhpcy5jdXJyZW50VG9rZW47XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNQQUNFOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTElORV9GRUVEOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuVEFCVUxBVElPTjpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkZPUk1fRkVFRDoge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSB3aGl0ZXNwYWNlXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnREb2N0eXBlKHRva2VuKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlFVT1RBVElPTl9NQVJLOiB7XG4gICAgICAgICAgICAgICAgdG9rZW4uc3lzdGVtSWQgPSAnJztcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUl9ET1VCTEVfUVVPVEVEO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuQVBPU1RST1BIRToge1xuICAgICAgICAgICAgICAgIHRva2VuLnN5c3RlbUlkID0gJyc7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkRPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVJfU0lOR0xFX1FVT1RFRDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJbkRvY3R5cGUpO1xuICAgICAgICAgICAgICAgIHRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50RG9jdHlwZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLm1pc3NpbmdRdW90ZUJlZm9yZURvY3R5cGVTeXN0ZW1JZGVudGlmaWVyKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJPR1VTX0RPQ1RZUEU7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGVCb2d1c0RvY3R5cGUoY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIEFmdGVyIERPQ1RZUEUgc3lzdGVtIGtleXdvcmQgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZUFmdGVyRG9jdHlwZVN5c3RlbUtleXdvcmQoY3ApIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0aGlzLmN1cnJlbnRUb2tlbjtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuU1BBQ0U6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MSU5FX0ZFRUQ6XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5UQUJVTEFUSU9OOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRk9STV9GRUVEOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJFRk9SRV9ET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuUVVPVEFUSU9OX01BUks6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIubWlzc2luZ1doaXRlc3BhY2VBZnRlckRvY3R5cGVTeXN0ZW1LZXl3b3JkKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5zeXN0ZW1JZCA9ICcnO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5ET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSX0RPVUJMRV9RVU9URUQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5BUE9TVFJPUEhFOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLm1pc3NpbmdXaGl0ZXNwYWNlQWZ0ZXJEb2N0eXBlU3lzdGVtS2V5d29yZCk7XG4gICAgICAgICAgICAgICAgdG9rZW4uc3lzdGVtSWQgPSAnJztcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUl9TSU5HTEVfUVVPVEVEO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIubWlzc2luZ0RvY3R5cGVTeXN0ZW1JZGVudGlmaWVyKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkRBVEE7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudERvY3R5cGUodG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuRU9GOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmVvZkluRG9jdHlwZSk7XG4gICAgICAgICAgICAgICAgdG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnREb2N0eXBlKHRva2VuKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0RU9GVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIubWlzc2luZ1F1b3RlQmVmb3JlRG9jdHlwZVN5c3RlbUlkZW50aWZpZXIpO1xuICAgICAgICAgICAgICAgIHRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQk9HVVNfRE9DVFlQRTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUJvZ3VzRG9jdHlwZShjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQmVmb3JlIERPQ1RZUEUgc3lzdGVtIGlkZW50aWZpZXIgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZUJlZm9yZURvY3R5cGVTeXN0ZW1JZGVudGlmaWVyKGNwKSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdGhpcy5jdXJyZW50VG9rZW47XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNQQUNFOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTElORV9GRUVEOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuVEFCVUxBVElPTjpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkZPUk1fRkVFRDoge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSB3aGl0ZXNwYWNlXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5RVU9UQVRJT05fTUFSSzoge1xuICAgICAgICAgICAgICAgIHRva2VuLnN5c3RlbUlkID0gJyc7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkRPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVJfRE9VQkxFX1FVT1RFRDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkFQT1NUUk9QSEU6IHtcbiAgICAgICAgICAgICAgICB0b2tlbi5zeXN0ZW1JZCA9ICcnO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5ET0NUWVBFX1NZU1RFTV9JREVOVElGSUVSX1NJTkdMRV9RVU9URUQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5taXNzaW5nRG9jdHlwZVN5c3RlbUlkZW50aWZpZXIpO1xuICAgICAgICAgICAgICAgIHRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50RG9jdHlwZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuZW9mSW5Eb2N0eXBlKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudERvY3R5cGUodG9rZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5taXNzaW5nUXVvdGVCZWZvcmVEb2N0eXBlU3lzdGVtSWRlbnRpZmllcik7XG4gICAgICAgICAgICAgICAgdG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5CT0dVU19ET0NUWVBFO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQm9ndXNEb2N0eXBlKGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBET0NUWVBFIHN5c3RlbSBpZGVudGlmaWVyIChkb3VibGUtcXVvdGVkKSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlRG9jdHlwZVN5c3RlbUlkZW50aWZpZXJEb3VibGVRdW90ZWQoY3ApIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0aGlzLmN1cnJlbnRUb2tlbjtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuUVVPVEFUSU9OX01BUks6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQUZURVJfRE9DVFlQRV9TWVNURU1fSURFTlRJRklFUjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLk5VTEw6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIudW5leHBlY3RlZE51bGxDaGFyYWN0ZXIpO1xuICAgICAgICAgICAgICAgIHRva2VuLnN5c3RlbUlkICs9IHVuaWNvZGVfanNfMS5SRVBMQUNFTUVOVF9DSEFSQUNURVI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5hYnJ1cHREb2N0eXBlU3lzdGVtSWRlbnRpZmllcik7XG4gICAgICAgICAgICAgICAgdG9rZW4uZm9yY2VRdWlya3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnREb2N0eXBlKHRva2VuKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJbkRvY3R5cGUpO1xuICAgICAgICAgICAgICAgIHRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50RG9jdHlwZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdG9rZW4uc3lzdGVtSWQgKz0gU3RyaW5nLmZyb21Db2RlUG9pbnQoY3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIERPQ1RZUEUgc3lzdGVtIGlkZW50aWZpZXIgKHNpbmdsZS1xdW90ZWQpIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVEb2N0eXBlU3lzdGVtSWRlbnRpZmllclNpbmdsZVF1b3RlZChjcCkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuY3VycmVudFRva2VuO1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5BUE9TVFJPUEhFOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkFGVEVSX0RPQ1RZUEVfU1lTVEVNX0lERU5USUZJRVI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5OVUxMOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLnVuZXhwZWN0ZWROdWxsQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5zeXN0ZW1JZCArPSB1bmljb2RlX2pzXzEuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuYWJydXB0RG9jdHlwZVN5c3RlbUlkZW50aWZpZXIpO1xuICAgICAgICAgICAgICAgIHRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50RG9jdHlwZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkRBVEE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuZW9mSW5Eb2N0eXBlKTtcbiAgICAgICAgICAgICAgICB0b2tlbi5mb3JjZVF1aXJrcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudERvY3R5cGUodG9rZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRFT0ZUb2tlbigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIHRva2VuLnN5c3RlbUlkICs9IFN0cmluZy5mcm9tQ29kZVBvaW50KGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBBZnRlciBET0NUWVBFIHN5c3RlbSBpZGVudGlmaWVyIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVBZnRlckRvY3R5cGVTeXN0ZW1JZGVudGlmaWVyKGNwKSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdGhpcy5jdXJyZW50VG9rZW47XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNQQUNFOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTElORV9GRUVEOlxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuVEFCVUxBVElPTjpcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkZPUk1fRkVFRDoge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSB3aGl0ZXNwYWNlXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5HUkVBVEVSX1RIQU5fU0lHTjoge1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdEN1cnJlbnREb2N0eXBlKHRva2VuKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5lb2ZJbkRvY3R5cGUpO1xuICAgICAgICAgICAgICAgIHRva2VuLmZvcmNlUXVpcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50RG9jdHlwZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLnVuZXhwZWN0ZWRDaGFyYWN0ZXJBZnRlckRvY3R5cGVTeXN0ZW1JZGVudGlmaWVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQk9HVVNfRE9DVFlQRTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0ZUJvZ3VzRG9jdHlwZShjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQm9ndXMgRE9DVFlQRSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlQm9ndXNEb2N0eXBlKGNwKSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdGhpcy5jdXJyZW50VG9rZW47XG4gICAgICAgIHN3aXRjaCAoY3ApIHtcbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkdSRUFURVJfVEhBTl9TSUdOOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0Q3VycmVudERvY3R5cGUodG9rZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5EQVRBO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTlVMTDoge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi51bmV4cGVjdGVkTnVsbENoYXJhY3Rlcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRDdXJyZW50RG9jdHlwZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gRG8gbm90aGluZ1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIENEQVRBIHNlY3Rpb24gc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZUNkYXRhU2VjdGlvbihjcCkge1xuICAgICAgICBzd2l0Y2ggKGNwKSB7XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5SSUdIVF9TUVVBUkVfQlJBQ0tFVDoge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DREFUQV9TRUNUSU9OX0JSQUNLRVQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5FT0Y6IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuZW9mSW5DZGF0YSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdEVPRlRva2VuKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdENvZGVQb2ludChjcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQ0RBVEEgc2VjdGlvbiBicmFja2V0IHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVDZGF0YVNlY3Rpb25CcmFja2V0KGNwKSB7XG4gICAgICAgIGlmIChjcCA9PT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlJJR0hUX1NRVUFSRV9CUkFDS0VUKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQ0RBVEFfU0VDVElPTl9FTkQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0Q2hhcnMoJ10nKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DREFUQV9TRUNUSU9OO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVDZGF0YVNlY3Rpb24oY3ApO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIENEQVRBIHNlY3Rpb24gZW5kIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVDZGF0YVNlY3Rpb25FbmQoY3ApIHtcbiAgICAgICAgc3dpdGNoIChjcCkge1xuICAgICAgICAgICAgY2FzZSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuR1JFQVRFUl9USEFOX1NJR046IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuREFUQTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlJJR0hUX1NRVUFSRV9CUkFDS0VUOiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCddJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdENoYXJzKCddXScpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5DREFUQV9TRUNUSU9OO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlQ2RhdGFTZWN0aW9uKGNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBDaGFyYWN0ZXIgcmVmZXJlbmNlIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVDaGFyYWN0ZXJSZWZlcmVuY2UoY3ApIHtcbiAgICAgICAgaWYgKGNwID09PSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTlVNQkVSX1NJR04pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5OVU1FUklDX0NIQVJBQ1RFUl9SRUZFUkVOQ0U7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXNBc2NpaUFscGhhTnVtZXJpYyhjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5OQU1FRF9DSEFSQUNURVJfUkVGRVJFTkNFO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVOYW1lZENoYXJhY3RlclJlZmVyZW5jZShjcCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9mbHVzaENvZGVQb2ludENvbnN1bWVkQXNDaGFyYWN0ZXJSZWZlcmVuY2UodW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkFNUEVSU0FORCk7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKHRoaXMucmV0dXJuU3RhdGUsIGNwKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBOYW1lZCBjaGFyYWN0ZXIgcmVmZXJlbmNlIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVOYW1lZENoYXJhY3RlclJlZmVyZW5jZShjcCkge1xuICAgICAgICBjb25zdCBtYXRjaFJlc3VsdCA9IHRoaXMuX21hdGNoTmFtZWRDaGFyYWN0ZXJSZWZlcmVuY2UoY3ApO1xuICAgICAgICAvL05PVEU6IE1hdGNoaW5nIGNhbiBiZSBhYnJ1cHRlZCBieSBoaWJlcm5hdGlvbi4gSW4gdGhhdCBjYXNlLCBtYXRjaFxuICAgICAgICAvL3Jlc3VsdHMgYXJlIG5vIGxvbmdlciB2YWxpZCBhbmQgd2Ugd2lsbCBuZWVkIHRvIHN0YXJ0IG92ZXIuXG4gICAgICAgIGlmICh0aGlzLl9lbnN1cmVIaWJlcm5hdGlvbigpKSB7XG4gICAgICAgICAgICAvLyBTdGF5IGluIHRoZSBzdGF0ZSwgdHJ5IGFnYWluLlxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG1hdGNoUmVzdWx0KSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1hdGNoUmVzdWx0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZmx1c2hDb2RlUG9pbnRDb25zdW1lZEFzQ2hhcmFjdGVyUmVmZXJlbmNlKG1hdGNoUmVzdWx0W2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLnJldHVyblN0YXRlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZmx1c2hDb2RlUG9pbnRDb25zdW1lZEFzQ2hhcmFjdGVyUmVmZXJlbmNlKHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5BTVBFUlNBTkQpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkFNQklHVU9VU19BTVBFUlNBTkQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gQW1iaWd1b3MgYW1wZXJzYW5kIHN0YXRlXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfc3RhdGVBbWJpZ3VvdXNBbXBlcnNhbmQoY3ApIHtcbiAgICAgICAgaWYgKGlzQXNjaWlBbHBoYU51bWVyaWMoY3ApKSB7XG4gICAgICAgICAgICB0aGlzLl9mbHVzaENvZGVQb2ludENvbnN1bWVkQXNDaGFyYWN0ZXJSZWZlcmVuY2UoY3ApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKGNwID09PSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuU0VNSUNPTE9OKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLnVua25vd25OYW1lZENoYXJhY3RlclJlZmVyZW5jZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9yZWNvbnN1bWVJblN0YXRlKHRoaXMucmV0dXJuU3RhdGUsIGNwKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBOdW1lcmljIGNoYXJhY3RlciByZWZlcmVuY2Ugc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZU51bWVyaWNDaGFyYWN0ZXJSZWZlcmVuY2UoY3ApIHtcbiAgICAgICAgdGhpcy5jaGFyUmVmQ29kZSA9IDA7XG4gICAgICAgIGlmIChjcCA9PT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxBVElOX1NNQUxMX1ggfHwgY3AgPT09IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5MQVRJTl9DQVBJVEFMX1gpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5IRVhBREVNSUNBTF9DSEFSQUNURVJfUkVGRVJFTkNFX1NUQVJUO1xuICAgICAgICB9XG4gICAgICAgIC8vIElubGluZWQgZGVjaW1hbCBjaGFyYWN0ZXIgcmVmZXJlbmNlIHN0YXJ0IHN0YXRlXG4gICAgICAgIGVsc2UgaWYgKGlzQXNjaWlEaWdpdChjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5ERUNJTUFMX0NIQVJBQ1RFUl9SRUZFUkVOQ0U7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZURlY2ltYWxDaGFyYWN0ZXJSZWZlcmVuY2UoY3ApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmFic2VuY2VPZkRpZ2l0c0luTnVtZXJpY0NoYXJhY3RlclJlZmVyZW5jZSk7XG4gICAgICAgICAgICB0aGlzLl9mbHVzaENvZGVQb2ludENvbnN1bWVkQXNDaGFyYWN0ZXJSZWZlcmVuY2UodW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkFNUEVSU0FORCk7XG4gICAgICAgICAgICB0aGlzLl9mbHVzaENvZGVQb2ludENvbnN1bWVkQXNDaGFyYWN0ZXJSZWZlcmVuY2UodW5pY29kZV9qc18xLkNPREVfUE9JTlRTLk5VTUJFUl9TSUdOKTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUodGhpcy5yZXR1cm5TdGF0ZSwgY3ApO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIEhleGFkZW1pY2FsIGNoYXJhY3RlciByZWZlcmVuY2Ugc3RhcnQgc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZUhleGFkZW1pY2FsQ2hhcmFjdGVyUmVmZXJlbmNlU3RhcnQoY3ApIHtcbiAgICAgICAgaWYgKGlzQXNjaWlIZXhEaWdpdChjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5IRVhBREVNSUNBTF9DSEFSQUNURVJfUkVGRVJFTkNFO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVIZXhhZGVtaWNhbENoYXJhY3RlclJlZmVyZW5jZShjcCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuYWJzZW5jZU9mRGlnaXRzSW5OdW1lcmljQ2hhcmFjdGVyUmVmZXJlbmNlKTtcbiAgICAgICAgICAgIHRoaXMuX2ZsdXNoQ29kZVBvaW50Q29uc3VtZWRBc0NoYXJhY3RlclJlZmVyZW5jZSh1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuQU1QRVJTQU5EKTtcbiAgICAgICAgICAgIHRoaXMuX2ZsdXNoQ29kZVBvaW50Q29uc3VtZWRBc0NoYXJhY3RlclJlZmVyZW5jZSh1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTlVNQkVSX1NJR04pO1xuICAgICAgICAgICAgdGhpcy5fdW5jb25zdW1lKDIpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMucmV0dXJuU3RhdGU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gSGV4YWRlbWljYWwgY2hhcmFjdGVyIHJlZmVyZW5jZSBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlSGV4YWRlbWljYWxDaGFyYWN0ZXJSZWZlcmVuY2UoY3ApIHtcbiAgICAgICAgaWYgKGlzQXNjaWlVcHBlckhleERpZ2l0KGNwKSkge1xuICAgICAgICAgICAgdGhpcy5jaGFyUmVmQ29kZSA9IHRoaXMuY2hhclJlZkNvZGUgKiAxNiArIGNwIC0gMHgzNztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpc0FzY2lpTG93ZXJIZXhEaWdpdChjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhclJlZkNvZGUgPSB0aGlzLmNoYXJSZWZDb2RlICogMTYgKyBjcCAtIDB4NTc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXNBc2NpaURpZ2l0KGNwKSkge1xuICAgICAgICAgICAgdGhpcy5jaGFyUmVmQ29kZSA9IHRoaXMuY2hhclJlZkNvZGUgKiAxNiArIGNwIC0gMHgzMDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjcCA9PT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlNFTUlDT0xPTikge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLk5VTUVSSUNfQ0hBUkFDVEVSX1JFRkVSRU5DRV9FTkQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIubWlzc2luZ1NlbWljb2xvbkFmdGVyQ2hhcmFjdGVyUmVmZXJlbmNlKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5OVU1FUklDX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfRU5EO1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVOdW1lcmljQ2hhcmFjdGVyUmVmZXJlbmNlRW5kKGNwKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBEZWNpbWFsIGNoYXJhY3RlciByZWZlcmVuY2Ugc3RhdGVcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9zdGF0ZURlY2ltYWxDaGFyYWN0ZXJSZWZlcmVuY2UoY3ApIHtcbiAgICAgICAgaWYgKGlzQXNjaWlEaWdpdChjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhclJlZkNvZGUgPSB0aGlzLmNoYXJSZWZDb2RlICogMTAgKyBjcCAtIDB4MzA7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3AgPT09IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5TRU1JQ09MT04pIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5OVU1FUklDX0NIQVJBQ1RFUl9SRUZFUkVOQ0VfRU5EO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLm1pc3NpbmdTZW1pY29sb25BZnRlckNoYXJhY3RlclJlZmVyZW5jZSk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuTlVNRVJJQ19DSEFSQUNURVJfUkVGRVJFTkNFX0VORDtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlTnVtZXJpY0NoYXJhY3RlclJlZmVyZW5jZUVuZChjcCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gTnVtZXJpYyBjaGFyYWN0ZXIgcmVmZXJlbmNlIGVuZCBzdGF0ZVxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3N0YXRlTnVtZXJpY0NoYXJhY3RlclJlZmVyZW5jZUVuZChjcCkge1xuICAgICAgICBpZiAodGhpcy5jaGFyUmVmQ29kZSA9PT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLk5VTEwpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5udWxsQ2hhcmFjdGVyUmVmZXJlbmNlKTtcbiAgICAgICAgICAgIHRoaXMuY2hhclJlZkNvZGUgPSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuUkVQTEFDRU1FTlRfQ0hBUkFDVEVSO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuY2hhclJlZkNvZGUgPiAxMTE0MTExKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuY2hhcmFjdGVyUmVmZXJlbmNlT3V0c2lkZVVuaWNvZGVSYW5nZSk7XG4gICAgICAgICAgICB0aGlzLmNoYXJSZWZDb2RlID0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICgoMCwgdW5pY29kZV9qc18xLmlzU3Vycm9nYXRlKSh0aGlzLmNoYXJSZWZDb2RlKSkge1xuICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLnN1cnJvZ2F0ZUNoYXJhY3RlclJlZmVyZW5jZSk7XG4gICAgICAgICAgICB0aGlzLmNoYXJSZWZDb2RlID0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLlJFUExBQ0VNRU5UX0NIQVJBQ1RFUjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICgoMCwgdW5pY29kZV9qc18xLmlzVW5kZWZpbmVkQ29kZVBvaW50KSh0aGlzLmNoYXJSZWZDb2RlKSkge1xuICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLm5vbmNoYXJhY3RlckNoYXJhY3RlclJlZmVyZW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoKDAsIHVuaWNvZGVfanNfMS5pc0NvbnRyb2xDb2RlUG9pbnQpKHRoaXMuY2hhclJlZkNvZGUpIHx8IHRoaXMuY2hhclJlZkNvZGUgPT09IHVuaWNvZGVfanNfMS5DT0RFX1BPSU5UUy5DQVJSSUFHRV9SRVRVUk4pIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5jb250cm9sQ2hhcmFjdGVyUmVmZXJlbmNlKTtcbiAgICAgICAgICAgIGNvbnN0IHJlcGxhY2VtZW50ID0gQzFfQ09OVFJPTFNfUkVGRVJFTkNFX1JFUExBQ0VNRU5UUy5nZXQodGhpcy5jaGFyUmVmQ29kZSk7XG4gICAgICAgICAgICBpZiAocmVwbGFjZW1lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2hhclJlZkNvZGUgPSByZXBsYWNlbWVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9mbHVzaENvZGVQb2ludENvbnN1bWVkQXNDaGFyYWN0ZXJSZWZlcmVuY2UodGhpcy5jaGFyUmVmQ29kZSk7XG4gICAgICAgIHRoaXMuX3JlY29uc3VtZUluU3RhdGUodGhpcy5yZXR1cm5TdGF0ZSwgY3ApO1xuICAgIH1cbn1cbmV4cG9ydHMuVG9rZW5pemVyID0gVG9rZW5pemVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLlByZXByb2Nlc3NvciA9IHZvaWQgMDtcbmNvbnN0IHVuaWNvZGVfanNfMSA9IHJlcXVpcmUoXCIuLi9jb21tb24vdW5pY29kZS5qc1wiKTtcbmNvbnN0IGVycm9yX2NvZGVzX2pzXzEgPSByZXF1aXJlKFwiLi4vY29tbW9uL2Vycm9yLWNvZGVzLmpzXCIpO1xuLy9Db25zdFxuY29uc3QgREVGQVVMVF9CVUZGRVJfV0FURVJMSU5FID0gMSA8PCAxNjtcbi8vUHJlcHJvY2Vzc29yXG4vL05PVEU6IEhUTUwgaW5wdXQgcHJlcHJvY2Vzc2luZ1xuLy8oc2VlOiBodHRwOi8vd3d3LndoYXR3Zy5vcmcvc3BlY3Mvd2ViLWFwcHMvY3VycmVudC13b3JrL211bHRpcGFnZS9wYXJzaW5nLmh0bWwjcHJlcHJvY2Vzc2luZy10aGUtaW5wdXQtc3RyZWFtKVxuY2xhc3MgUHJlcHJvY2Vzc29yIHtcbiAgICBjb25zdHJ1Y3RvcihoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG4gICAgICAgIHRoaXMuaHRtbCA9ICcnO1xuICAgICAgICB0aGlzLnBvcyA9IC0xO1xuICAgICAgICAvLyBOT1RFOiBJbml0aWFsIGBsYXN0R2FwUG9zYCBpcyAtMiwgdG8gZW5zdXJlIGBjb2xgIG9uIGluaXRpYWxpc2F0aW9uIGlzIDBcbiAgICAgICAgdGhpcy5sYXN0R2FwUG9zID0gLTI7XG4gICAgICAgIHRoaXMuZ2FwU3RhY2sgPSBbXTtcbiAgICAgICAgdGhpcy5za2lwTmV4dE5ld0xpbmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5sYXN0Q2h1bmtXcml0dGVuID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZW5kT2ZDaHVua0hpdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmJ1ZmZlcldhdGVybGluZSA9IERFRkFVTFRfQlVGRkVSX1dBVEVSTElORTtcbiAgICAgICAgdGhpcy5pc0VvbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmxpbmVTdGFydFBvcyA9IDA7XG4gICAgICAgIHRoaXMuZHJvcHBlZEJ1ZmZlclNpemUgPSAwO1xuICAgICAgICB0aGlzLmxpbmUgPSAxO1xuICAgICAgICAvL05PVEU6IGF2b2lkIHJlcG9ydGluZyBlcnJvcnMgdHdpY2Ugb24gYWR2YW5jZS9yZXRyZWF0XG4gICAgICAgIHRoaXMubGFzdEVyck9mZnNldCA9IC0xO1xuICAgIH1cbiAgICAvKiogVGhlIGNvbHVtbiBvbiB0aGUgY3VycmVudCBsaW5lLiBJZiB3ZSBqdXN0IHNhdyBhIGdhcCAoZWcuIGEgc3Vycm9nYXRlIHBhaXIpLCByZXR1cm4gdGhlIGluZGV4IGJlZm9yZS4gKi9cbiAgICBnZXQgY29sKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wb3MgLSB0aGlzLmxpbmVTdGFydFBvcyArIE51bWJlcih0aGlzLmxhc3RHYXBQb3MgIT09IHRoaXMucG9zKTtcbiAgICB9XG4gICAgZ2V0IG9mZnNldCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZHJvcHBlZEJ1ZmZlclNpemUgKyB0aGlzLnBvcztcbiAgICB9XG4gICAgZ2V0RXJyb3IoY29kZSkge1xuICAgICAgICBjb25zdCB7IGxpbmUsIGNvbCwgb2Zmc2V0IH0gPSB0aGlzO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY29kZSxcbiAgICAgICAgICAgIHN0YXJ0TGluZTogbGluZSxcbiAgICAgICAgICAgIGVuZExpbmU6IGxpbmUsXG4gICAgICAgICAgICBzdGFydENvbDogY29sLFxuICAgICAgICAgICAgZW5kQ29sOiBjb2wsXG4gICAgICAgICAgICBzdGFydE9mZnNldDogb2Zmc2V0LFxuICAgICAgICAgICAgZW5kT2Zmc2V0OiBvZmZzZXQsXG4gICAgICAgIH07XG4gICAgfVxuICAgIF9lcnIoY29kZSkge1xuICAgICAgICBpZiAodGhpcy5oYW5kbGVyLm9uUGFyc2VFcnJvciAmJiB0aGlzLmxhc3RFcnJPZmZzZXQgIT09IHRoaXMub2Zmc2V0KSB7XG4gICAgICAgICAgICB0aGlzLmxhc3RFcnJPZmZzZXQgPSB0aGlzLm9mZnNldDtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlci5vblBhcnNlRXJyb3IodGhpcy5nZXRFcnJvcihjb2RlKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2FkZEdhcCgpIHtcbiAgICAgICAgdGhpcy5nYXBTdGFjay5wdXNoKHRoaXMubGFzdEdhcFBvcyk7XG4gICAgICAgIHRoaXMubGFzdEdhcFBvcyA9IHRoaXMucG9zO1xuICAgIH1cbiAgICBfcHJvY2Vzc1N1cnJvZ2F0ZShjcCkge1xuICAgICAgICAvL05PVEU6IHRyeSB0byBwZWVrIGEgc3Vycm9nYXRlIHBhaXJcbiAgICAgICAgaWYgKHRoaXMucG9zICE9PSB0aGlzLmh0bWwubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgY29uc3QgbmV4dENwID0gdGhpcy5odG1sLmNoYXJDb2RlQXQodGhpcy5wb3MgKyAxKTtcbiAgICAgICAgICAgIGlmICgoMCwgdW5pY29kZV9qc18xLmlzU3Vycm9nYXRlUGFpcikobmV4dENwKSkge1xuICAgICAgICAgICAgICAgIC8vTk9URTogd2UgaGF2ZSBhIHN1cnJvZ2F0ZSBwYWlyLiBQZWVrIHBhaXIgY2hhcmFjdGVyIGFuZCByZWNhbGN1bGF0ZSBjb2RlIHBvaW50LlxuICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XG4gICAgICAgICAgICAgICAgLy9OT1RFOiBhZGQgYSBnYXAgdGhhdCBzaG91bGQgYmUgYXZvaWRlZCBkdXJpbmcgcmV0cmVhdFxuICAgICAgICAgICAgICAgIHRoaXMuX2FkZEdhcCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoMCwgdW5pY29kZV9qc18xLmdldFN1cnJvZ2F0ZVBhaXJDb2RlUG9pbnQpKGNwLCBuZXh0Q3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vTk9URTogd2UgYXJlIGF0IHRoZSBlbmQgb2YgYSBjaHVuaywgdGhlcmVmb3JlIHdlIGNhbid0IGluZmVyIHRoZSBzdXJyb2dhdGUgcGFpciB5ZXQuXG4gICAgICAgIGVsc2UgaWYgKCF0aGlzLmxhc3RDaHVua1dyaXR0ZW4pIHtcbiAgICAgICAgICAgIHRoaXMuZW5kT2ZDaHVua0hpdCA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm4gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjtcbiAgICAgICAgfVxuICAgICAgICAvL05PVEU6IGlzb2xhdGVkIHN1cnJvZ2F0ZVxuICAgICAgICB0aGlzLl9lcnIoZXJyb3JfY29kZXNfanNfMS5FUlIuc3Vycm9nYXRlSW5JbnB1dFN0cmVhbSk7XG4gICAgICAgIHJldHVybiBjcDtcbiAgICB9XG4gICAgd2lsbERyb3BQYXJzZWRDaHVuaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zID4gdGhpcy5idWZmZXJXYXRlcmxpbmU7XG4gICAgfVxuICAgIGRyb3BQYXJzZWRDaHVuaygpIHtcbiAgICAgICAgaWYgKHRoaXMud2lsbERyb3BQYXJzZWRDaHVuaygpKSB7XG4gICAgICAgICAgICB0aGlzLmh0bWwgPSB0aGlzLmh0bWwuc3Vic3RyaW5nKHRoaXMucG9zKTtcbiAgICAgICAgICAgIHRoaXMubGluZVN0YXJ0UG9zIC09IHRoaXMucG9zO1xuICAgICAgICAgICAgdGhpcy5kcm9wcGVkQnVmZmVyU2l6ZSArPSB0aGlzLnBvcztcbiAgICAgICAgICAgIHRoaXMucG9zID0gMDtcbiAgICAgICAgICAgIHRoaXMubGFzdEdhcFBvcyA9IC0yO1xuICAgICAgICAgICAgdGhpcy5nYXBTdGFjay5sZW5ndGggPSAwO1xuICAgICAgICB9XG4gICAgfVxuICAgIHdyaXRlKGNodW5rLCBpc0xhc3RDaHVuaykge1xuICAgICAgICBpZiAodGhpcy5odG1sLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbCArPSBjaHVuaztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbCA9IGNodW5rO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZW5kT2ZDaHVua0hpdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmxhc3RDaHVua1dyaXR0ZW4gPSBpc0xhc3RDaHVuaztcbiAgICB9XG4gICAgaW5zZXJ0SHRtbEF0Q3VycmVudFBvcyhjaHVuaykge1xuICAgICAgICB0aGlzLmh0bWwgPSB0aGlzLmh0bWwuc3Vic3RyaW5nKDAsIHRoaXMucG9zICsgMSkgKyBjaHVuayArIHRoaXMuaHRtbC5zdWJzdHJpbmcodGhpcy5wb3MgKyAxKTtcbiAgICAgICAgdGhpcy5lbmRPZkNodW5rSGl0ID0gZmFsc2U7XG4gICAgfVxuICAgIHN0YXJ0c1dpdGgocGF0dGVybiwgY2FzZVNlbnNpdGl2ZSkge1xuICAgICAgICAvLyBDaGVjayBpZiBvdXIgYnVmZmVyIGhhcyBlbm91Z2ggY2hhcmFjdGVyc1xuICAgICAgICBpZiAodGhpcy5wb3MgKyBwYXR0ZXJuLmxlbmd0aCA+IHRoaXMuaHRtbC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuZW5kT2ZDaHVua0hpdCA9ICF0aGlzLmxhc3RDaHVua1dyaXR0ZW47XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNhc2VTZW5zaXRpdmUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmh0bWwuc3RhcnRzV2l0aChwYXR0ZXJuLCB0aGlzLnBvcyk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXR0ZXJuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBjcCA9IHRoaXMuaHRtbC5jaGFyQ29kZUF0KHRoaXMucG9zICsgaSkgfCAweDIwO1xuICAgICAgICAgICAgaWYgKGNwICE9PSBwYXR0ZXJuLmNoYXJDb2RlQXQoaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHBlZWsob2Zmc2V0KSB7XG4gICAgICAgIGNvbnN0IHBvcyA9IHRoaXMucG9zICsgb2Zmc2V0O1xuICAgICAgICBpZiAocG9zID49IHRoaXMuaHRtbC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuZW5kT2ZDaHVua0hpdCA9ICF0aGlzLmxhc3RDaHVua1dyaXR0ZW47XG4gICAgICAgICAgICByZXR1cm4gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5odG1sLmNoYXJDb2RlQXQocG9zKTtcbiAgICB9XG4gICAgYWR2YW5jZSgpIHtcbiAgICAgICAgdGhpcy5wb3MrKztcbiAgICAgICAgLy9OT1RFOiBMRiBzaG91bGQgYmUgaW4gdGhlIGxhc3QgY29sdW1uIG9mIHRoZSBsaW5lXG4gICAgICAgIGlmICh0aGlzLmlzRW9sKSB7XG4gICAgICAgICAgICB0aGlzLmlzRW9sID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmxpbmUrKztcbiAgICAgICAgICAgIHRoaXMubGluZVN0YXJ0UG9zID0gdGhpcy5wb3M7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucG9zID49IHRoaXMuaHRtbC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuZW5kT2ZDaHVua0hpdCA9ICF0aGlzLmxhc3RDaHVua1dyaXR0ZW47XG4gICAgICAgICAgICByZXR1cm4gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkVPRjtcbiAgICAgICAgfVxuICAgICAgICBsZXQgY3AgPSB0aGlzLmh0bWwuY2hhckNvZGVBdCh0aGlzLnBvcyk7XG4gICAgICAgIC8vTk9URTogYWxsIFUrMDAwRCBDQVJSSUFHRSBSRVRVUk4gKENSKSBjaGFyYWN0ZXJzIG11c3QgYmUgY29udmVydGVkIHRvIFUrMDAwQSBMSU5FIEZFRUQgKExGKSBjaGFyYWN0ZXJzXG4gICAgICAgIGlmIChjcCA9PT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkNBUlJJQUdFX1JFVFVSTikge1xuICAgICAgICAgICAgdGhpcy5pc0VvbCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnNraXBOZXh0TmV3TGluZSA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm4gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxJTkVfRkVFRDtcbiAgICAgICAgfVxuICAgICAgICAvL05PVEU6IGFueSBVKzAwMEEgTElORSBGRUVEIChMRikgY2hhcmFjdGVycyB0aGF0IGltbWVkaWF0ZWx5IGZvbGxvdyBhIFUrMDAwRCBDQVJSSUFHRSBSRVRVUk4gKENSKSBjaGFyYWN0ZXJcbiAgICAgICAgLy9tdXN0IGJlIGlnbm9yZWQuXG4gICAgICAgIGlmIChjcCA9PT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkxJTkVfRkVFRCkge1xuICAgICAgICAgICAgdGhpcy5pc0VvbCA9IHRydWU7XG4gICAgICAgICAgICBpZiAodGhpcy5za2lwTmV4dE5ld0xpbmUpIHtcbiAgICAgICAgICAgICAgICAvLyBgbGluZWAgd2lsbCBiZSBidW1wZWQgYWdhaW4gaW4gdGhlIHJlY3Vyc2l2ZSBjYWxsLlxuICAgICAgICAgICAgICAgIHRoaXMubGluZS0tO1xuICAgICAgICAgICAgICAgIHRoaXMuc2tpcE5leHROZXdMaW5lID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkR2FwKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2tpcE5leHROZXdMaW5lID0gZmFsc2U7XG4gICAgICAgIGlmICgoMCwgdW5pY29kZV9qc18xLmlzU3Vycm9nYXRlKShjcCkpIHtcbiAgICAgICAgICAgIGNwID0gdGhpcy5fcHJvY2Vzc1N1cnJvZ2F0ZShjcCk7XG4gICAgICAgIH1cbiAgICAgICAgLy9PUFRJTUlaQVRJT046IGZpcnN0IGNoZWNrIGlmIGNvZGUgcG9pbnQgaXMgaW4gdGhlIGNvbW1vbiBhbGxvd2VkXG4gICAgICAgIC8vcmFuZ2UgKEFTQ0lJIGFscGhhbnVtZXJpYywgd2hpdGVzcGFjZXMsIGJpZyBjaHVuayBvZiBCTVApXG4gICAgICAgIC8vYmVmb3JlIGdvaW5nIGludG8gZGV0YWlsZWQgcGVyZm9ybWFuY2UgY29zdCB2YWxpZGF0aW9uLlxuICAgICAgICBjb25zdCBpc0NvbW1vblZhbGlkUmFuZ2UgPSB0aGlzLmhhbmRsZXIub25QYXJzZUVycm9yID09PSBudWxsIHx8XG4gICAgICAgICAgICAoY3AgPiAweDFmICYmIGNwIDwgMHg3ZikgfHxcbiAgICAgICAgICAgIGNwID09PSB1bmljb2RlX2pzXzEuQ09ERV9QT0lOVFMuTElORV9GRUVEIHx8XG4gICAgICAgICAgICBjcCA9PT0gdW5pY29kZV9qc18xLkNPREVfUE9JTlRTLkNBUlJJQUdFX1JFVFVSTiB8fFxuICAgICAgICAgICAgKGNwID4gMHg5ZiAmJiBjcCA8IDY0OTc2KTtcbiAgICAgICAgaWYgKCFpc0NvbW1vblZhbGlkUmFuZ2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2NoZWNrRm9yUHJvYmxlbWF0aWNDaGFyYWN0ZXJzKGNwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3A7XG4gICAgfVxuICAgIF9jaGVja0ZvclByb2JsZW1hdGljQ2hhcmFjdGVycyhjcCkge1xuICAgICAgICBpZiAoKDAsIHVuaWNvZGVfanNfMS5pc0NvbnRyb2xDb2RlUG9pbnQpKGNwKSkge1xuICAgICAgICAgICAgdGhpcy5fZXJyKGVycm9yX2NvZGVzX2pzXzEuRVJSLmNvbnRyb2xDaGFyYWN0ZXJJbklucHV0U3RyZWFtKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICgoMCwgdW5pY29kZV9qc18xLmlzVW5kZWZpbmVkQ29kZVBvaW50KShjcCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2VycihlcnJvcl9jb2Rlc19qc18xLkVSUi5ub25jaGFyYWN0ZXJJbklucHV0U3RyZWFtKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXRyZWF0KGNvdW50KSB7XG4gICAgICAgIHRoaXMucG9zIC09IGNvdW50O1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCB0aGlzLmxhc3RHYXBQb3MpIHtcbiAgICAgICAgICAgIHRoaXMubGFzdEdhcFBvcyA9IHRoaXMuZ2FwU3RhY2sucG9wKCk7XG4gICAgICAgICAgICB0aGlzLnBvcy0tO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNFb2wgPSBmYWxzZTtcbiAgICB9XG59XG5leHBvcnRzLlByZXByb2Nlc3NvciA9IFByZXByb2Nlc3Nvcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXByZXByb2Nlc3Nvci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuZGVmYXVsdFRyZWVBZGFwdGVyID0gdm9pZCAwO1xuY29uc3QgaHRtbF9qc18xID0gcmVxdWlyZShcIi4uL2NvbW1vbi9odG1sLmpzXCIpO1xuZnVuY3Rpb24gY3JlYXRlVGV4dE5vZGUodmFsdWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBub2RlTmFtZTogJyN0ZXh0JyxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIHBhcmVudE5vZGU6IG51bGwsXG4gICAgfTtcbn1cbmV4cG9ydHMuZGVmYXVsdFRyZWVBZGFwdGVyID0ge1xuICAgIC8vTm9kZSBjb25zdHJ1Y3Rpb25cbiAgICBjcmVhdGVEb2N1bWVudCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5vZGVOYW1lOiAnI2RvY3VtZW50JyxcbiAgICAgICAgICAgIG1vZGU6IGh0bWxfanNfMS5ET0NVTUVOVF9NT0RFLk5PX1FVSVJLUyxcbiAgICAgICAgICAgIGNoaWxkTm9kZXM6IFtdLFxuICAgICAgICB9O1xuICAgIH0sXG4gICAgY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5vZGVOYW1lOiAnI2RvY3VtZW50LWZyYWdtZW50JyxcbiAgICAgICAgICAgIGNoaWxkTm9kZXM6IFtdLFxuICAgICAgICB9O1xuICAgIH0sXG4gICAgY3JlYXRlRWxlbWVudCh0YWdOYW1lLCBuYW1lc3BhY2VVUkksIGF0dHJzKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBub2RlTmFtZTogdGFnTmFtZSxcbiAgICAgICAgICAgIHRhZ05hbWUsXG4gICAgICAgICAgICBhdHRycyxcbiAgICAgICAgICAgIG5hbWVzcGFjZVVSSSxcbiAgICAgICAgICAgIGNoaWxkTm9kZXM6IFtdLFxuICAgICAgICAgICAgcGFyZW50Tm9kZTogbnVsbCxcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIGNyZWF0ZUNvbW1lbnROb2RlKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5vZGVOYW1lOiAnI2NvbW1lbnQnLFxuICAgICAgICAgICAgZGF0YSxcbiAgICAgICAgICAgIHBhcmVudE5vZGU6IG51bGwsXG4gICAgICAgIH07XG4gICAgfSxcbiAgICAvL1RyZWUgbXV0YXRpb25cbiAgICBhcHBlbmRDaGlsZChwYXJlbnROb2RlLCBuZXdOb2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUuY2hpbGROb2Rlcy5wdXNoKG5ld05vZGUpO1xuICAgICAgICBuZXdOb2RlLnBhcmVudE5vZGUgPSBwYXJlbnROb2RlO1xuICAgIH0sXG4gICAgaW5zZXJ0QmVmb3JlKHBhcmVudE5vZGUsIG5ld05vZGUsIHJlZmVyZW5jZU5vZGUpIHtcbiAgICAgICAgY29uc3QgaW5zZXJ0aW9uSWR4ID0gcGFyZW50Tm9kZS5jaGlsZE5vZGVzLmluZGV4T2YocmVmZXJlbmNlTm9kZSk7XG4gICAgICAgIHBhcmVudE5vZGUuY2hpbGROb2Rlcy5zcGxpY2UoaW5zZXJ0aW9uSWR4LCAwLCBuZXdOb2RlKTtcbiAgICAgICAgbmV3Tm9kZS5wYXJlbnROb2RlID0gcGFyZW50Tm9kZTtcbiAgICB9LFxuICAgIHNldFRlbXBsYXRlQ29udGVudCh0ZW1wbGF0ZUVsZW1lbnQsIGNvbnRlbnRFbGVtZW50KSB7XG4gICAgICAgIHRlbXBsYXRlRWxlbWVudC5jb250ZW50ID0gY29udGVudEVsZW1lbnQ7XG4gICAgfSxcbiAgICBnZXRUZW1wbGF0ZUNvbnRlbnQodGVtcGxhdGVFbGVtZW50KSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZUVsZW1lbnQuY29udGVudDtcbiAgICB9LFxuICAgIHNldERvY3VtZW50VHlwZShkb2N1bWVudCwgbmFtZSwgcHVibGljSWQsIHN5c3RlbUlkKSB7XG4gICAgICAgIGNvbnN0IGRvY3R5cGVOb2RlID0gZG9jdW1lbnQuY2hpbGROb2Rlcy5maW5kKChub2RlKSA9PiBub2RlLm5vZGVOYW1lID09PSAnI2RvY3VtZW50VHlwZScpO1xuICAgICAgICBpZiAoZG9jdHlwZU5vZGUpIHtcbiAgICAgICAgICAgIGRvY3R5cGVOb2RlLm5hbWUgPSBuYW1lO1xuICAgICAgICAgICAgZG9jdHlwZU5vZGUucHVibGljSWQgPSBwdWJsaWNJZDtcbiAgICAgICAgICAgIGRvY3R5cGVOb2RlLnN5c3RlbUlkID0gc3lzdGVtSWQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBub2RlID0ge1xuICAgICAgICAgICAgICAgIG5vZGVOYW1lOiAnI2RvY3VtZW50VHlwZScsXG4gICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICBwdWJsaWNJZCxcbiAgICAgICAgICAgICAgICBzeXN0ZW1JZCxcbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlOiBudWxsLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGV4cG9ydHMuZGVmYXVsdFRyZWVBZGFwdGVyLmFwcGVuZENoaWxkKGRvY3VtZW50LCBub2RlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2V0RG9jdW1lbnRNb2RlKGRvY3VtZW50LCBtb2RlKSB7XG4gICAgICAgIGRvY3VtZW50Lm1vZGUgPSBtb2RlO1xuICAgIH0sXG4gICAgZ2V0RG9jdW1lbnRNb2RlKGRvY3VtZW50KSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5tb2RlO1xuICAgIH0sXG4gICAgZGV0YWNoTm9kZShub2RlKSB7XG4gICAgICAgIGlmIChub2RlLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IG5vZGUucGFyZW50Tm9kZS5jaGlsZE5vZGVzLmluZGV4T2Yobm9kZSk7XG4gICAgICAgICAgICBub2RlLnBhcmVudE5vZGUuY2hpbGROb2Rlcy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgIG5vZGUucGFyZW50Tm9kZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGluc2VydFRleHQocGFyZW50Tm9kZSwgdGV4dCkge1xuICAgICAgICBpZiAocGFyZW50Tm9kZS5jaGlsZE5vZGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHByZXZOb2RlID0gcGFyZW50Tm9kZS5jaGlsZE5vZGVzW3BhcmVudE5vZGUuY2hpbGROb2Rlcy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIGlmIChleHBvcnRzLmRlZmF1bHRUcmVlQWRhcHRlci5pc1RleHROb2RlKHByZXZOb2RlKSkge1xuICAgICAgICAgICAgICAgIHByZXZOb2RlLnZhbHVlICs9IHRleHQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGV4cG9ydHMuZGVmYXVsdFRyZWVBZGFwdGVyLmFwcGVuZENoaWxkKHBhcmVudE5vZGUsIGNyZWF0ZVRleHROb2RlKHRleHQpKTtcbiAgICB9LFxuICAgIGluc2VydFRleHRCZWZvcmUocGFyZW50Tm9kZSwgdGV4dCwgcmVmZXJlbmNlTm9kZSkge1xuICAgICAgICBjb25zdCBwcmV2Tm9kZSA9IHBhcmVudE5vZGUuY2hpbGROb2Rlc1twYXJlbnROb2RlLmNoaWxkTm9kZXMuaW5kZXhPZihyZWZlcmVuY2VOb2RlKSAtIDFdO1xuICAgICAgICBpZiAocHJldk5vZGUgJiYgZXhwb3J0cy5kZWZhdWx0VHJlZUFkYXB0ZXIuaXNUZXh0Tm9kZShwcmV2Tm9kZSkpIHtcbiAgICAgICAgICAgIHByZXZOb2RlLnZhbHVlICs9IHRleHQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBleHBvcnRzLmRlZmF1bHRUcmVlQWRhcHRlci5pbnNlcnRCZWZvcmUocGFyZW50Tm9kZSwgY3JlYXRlVGV4dE5vZGUodGV4dCksIHJlZmVyZW5jZU5vZGUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBhZG9wdEF0dHJpYnV0ZXMocmVjaXBpZW50LCBhdHRycykge1xuICAgICAgICBjb25zdCByZWNpcGllbnRBdHRyc01hcCA9IG5ldyBTZXQocmVjaXBpZW50LmF0dHJzLm1hcCgoYXR0cikgPT4gYXR0ci5uYW1lKSk7XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYXR0cnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGlmICghcmVjaXBpZW50QXR0cnNNYXAuaGFzKGF0dHJzW2pdLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmVjaXBpZW50LmF0dHJzLnB1c2goYXR0cnNbal0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICAvL1RyZWUgdHJhdmVyc2luZ1xuICAgIGdldEZpcnN0Q2hpbGQobm9kZSkge1xuICAgICAgICByZXR1cm4gbm9kZS5jaGlsZE5vZGVzWzBdO1xuICAgIH0sXG4gICAgZ2V0Q2hpbGROb2Rlcyhub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlLmNoaWxkTm9kZXM7XG4gICAgfSxcbiAgICBnZXRQYXJlbnROb2RlKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUucGFyZW50Tm9kZTtcbiAgICB9LFxuICAgIGdldEF0dHJMaXN0KGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQuYXR0cnM7XG4gICAgfSxcbiAgICAvL05vZGUgZGF0YVxuICAgIGdldFRhZ05hbWUoZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gZWxlbWVudC50YWdOYW1lO1xuICAgIH0sXG4gICAgZ2V0TmFtZXNwYWNlVVJJKGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQubmFtZXNwYWNlVVJJO1xuICAgIH0sXG4gICAgZ2V0VGV4dE5vZGVDb250ZW50KHRleHROb2RlKSB7XG4gICAgICAgIHJldHVybiB0ZXh0Tm9kZS52YWx1ZTtcbiAgICB9LFxuICAgIGdldENvbW1lbnROb2RlQ29udGVudChjb21tZW50Tm9kZSkge1xuICAgICAgICByZXR1cm4gY29tbWVudE5vZGUuZGF0YTtcbiAgICB9LFxuICAgIGdldERvY3VtZW50VHlwZU5vZGVOYW1lKGRvY3R5cGVOb2RlKSB7XG4gICAgICAgIHJldHVybiBkb2N0eXBlTm9kZS5uYW1lO1xuICAgIH0sXG4gICAgZ2V0RG9jdW1lbnRUeXBlTm9kZVB1YmxpY0lkKGRvY3R5cGVOb2RlKSB7XG4gICAgICAgIHJldHVybiBkb2N0eXBlTm9kZS5wdWJsaWNJZDtcbiAgICB9LFxuICAgIGdldERvY3VtZW50VHlwZU5vZGVTeXN0ZW1JZChkb2N0eXBlTm9kZSkge1xuICAgICAgICByZXR1cm4gZG9jdHlwZU5vZGUuc3lzdGVtSWQ7XG4gICAgfSxcbiAgICAvL05vZGUgdHlwZXNcbiAgICBpc1RleHROb2RlKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUubm9kZU5hbWUgPT09ICcjdGV4dCc7XG4gICAgfSxcbiAgICBpc0NvbW1lbnROb2RlKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUubm9kZU5hbWUgPT09ICcjY29tbWVudCc7XG4gICAgfSxcbiAgICBpc0RvY3VtZW50VHlwZU5vZGUobm9kZSkge1xuICAgICAgICByZXR1cm4gbm9kZS5ub2RlTmFtZSA9PT0gJyNkb2N1bWVudFR5cGUnO1xuICAgIH0sXG4gICAgaXNFbGVtZW50Tm9kZShub2RlKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobm9kZSwgJ3RhZ05hbWUnKTtcbiAgICB9LFxuICAgIC8vIFNvdXJjZSBjb2RlIGxvY2F0aW9uXG4gICAgc2V0Tm9kZVNvdXJjZUNvZGVMb2NhdGlvbihub2RlLCBsb2NhdGlvbikge1xuICAgICAgICBub2RlLnNvdXJjZUNvZGVMb2NhdGlvbiA9IGxvY2F0aW9uO1xuICAgIH0sXG4gICAgZ2V0Tm9kZVNvdXJjZUNvZGVMb2NhdGlvbihub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlLnNvdXJjZUNvZGVMb2NhdGlvbjtcbiAgICB9LFxuICAgIHVwZGF0ZU5vZGVTb3VyY2VDb2RlTG9jYXRpb24obm9kZSwgZW5kTG9jYXRpb24pIHtcbiAgICAgICAgbm9kZS5zb3VyY2VDb2RlTG9jYXRpb24gPSBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIG5vZGUuc291cmNlQ29kZUxvY2F0aW9uKSwgZW5kTG9jYXRpb24pO1xuICAgIH0sXG59O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGVmYXVsdC5qcy5tYXAiXX0=
