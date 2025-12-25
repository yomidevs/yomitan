// @ts-nocheck
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/hangul-js/hangul.js
var require_hangul = __commonJS({
  "node_modules/hangul-js/hangul.js"(exports, module) {
    (function() {
      "use strict";
      var CHO = [
        "\u3131",
        "\u3132",
        "\u3134",
        "\u3137",
        "\u3138",
        "\u3139",
        "\u3141",
        "\u3142",
        "\u3143",
        "\u3145",
        "\u3146",
        "\u3147",
        "\u3148",
        "\u3149",
        "\u314A",
        "\u314B",
        "\u314C",
        "\u314D",
        "\u314E"
      ], JUNG = [
        "\u314F",
        "\u3150",
        "\u3151",
        "\u3152",
        "\u3153",
        "\u3154",
        "\u3155",
        "\u3156",
        "\u3157",
        ["\u3157", "\u314F"],
        ["\u3157", "\u3150"],
        ["\u3157", "\u3163"],
        "\u315B",
        "\u315C",
        ["\u315C", "\u3153"],
        ["\u315C", "\u3154"],
        ["\u315C", "\u3163"],
        "\u3160",
        "\u3161",
        ["\u3161", "\u3163"],
        "\u3163"
      ], JONG = [
        "",
        "\u3131",
        "\u3132",
        ["\u3131", "\u3145"],
        "\u3134",
        ["\u3134", "\u3148"],
        ["\u3134", "\u314E"],
        "\u3137",
        "\u3139",
        ["\u3139", "\u3131"],
        ["\u3139", "\u3141"],
        ["\u3139", "\u3142"],
        ["\u3139", "\u3145"],
        ["\u3139", "\u314C"],
        ["\u3139", "\u314D"],
        ["\u3139", "\u314E"],
        "\u3141",
        "\u3142",
        ["\u3142", "\u3145"],
        "\u3145",
        "\u3146",
        "\u3147",
        "\u3148",
        "\u314A",
        "\u314B",
        "\u314C",
        "\u314D",
        "\u314E"
      ], HANGUL_OFFSET = 44032, CONSONANTS = [
        "\u3131",
        "\u3132",
        "\u3133",
        "\u3134",
        "\u3135",
        "\u3136",
        "\u3137",
        "\u3138",
        "\u3139",
        "\u313A",
        "\u313B",
        "\u313C",
        "\u313D",
        "\u313E",
        "\u313F",
        "\u3140",
        "\u3141",
        "\u3142",
        "\u3143",
        "\u3144",
        "\u3145",
        "\u3146",
        "\u3147",
        "\u3148",
        "\u3149",
        "\u314A",
        "\u314B",
        "\u314C",
        "\u314D",
        "\u314E"
      ], COMPLETE_CHO = [
        "\u3131",
        "\u3132",
        "\u3134",
        "\u3137",
        "\u3138",
        "\u3139",
        "\u3141",
        "\u3142",
        "\u3143",
        "\u3145",
        "\u3146",
        "\u3147",
        "\u3148",
        "\u3149",
        "\u314A",
        "\u314B",
        "\u314C",
        "\u314D",
        "\u314E"
      ], COMPLETE_JUNG = [
        "\u314F",
        "\u3150",
        "\u3151",
        "\u3152",
        "\u3153",
        "\u3154",
        "\u3155",
        "\u3156",
        "\u3157",
        "\u3158",
        "\u3159",
        "\u315A",
        "\u315B",
        "\u315C",
        "\u315D",
        "\u315E",
        "\u315F",
        "\u3160",
        "\u3161",
        "\u3162",
        "\u3163"
      ], COMPLETE_JONG = [
        "",
        "\u3131",
        "\u3132",
        "\u3133",
        "\u3134",
        "\u3135",
        "\u3136",
        "\u3137",
        "\u3139",
        "\u313A",
        "\u313B",
        "\u313C",
        "\u313D",
        "\u313E",
        "\u313F",
        "\u3140",
        "\u3141",
        "\u3142",
        "\u3144",
        "\u3145",
        "\u3146",
        "\u3147",
        "\u3148",
        "\u314A",
        "\u314B",
        "\u314C",
        "\u314D",
        "\u314E"
      ], COMPLEX_CONSONANTS = [
        ["\u3131", "\u3145", "\u3133"],
        ["\u3134", "\u3148", "\u3135"],
        ["\u3134", "\u314E", "\u3136"],
        ["\u3139", "\u3131", "\u313A"],
        ["\u3139", "\u3141", "\u313B"],
        ["\u3139", "\u3142", "\u313C"],
        ["\u3139", "\u3145", "\u313D"],
        ["\u3139", "\u314C", "\u313E"],
        ["\u3139", "\u314D", "\u313F"],
        ["\u3139", "\u314E", "\u3140"],
        ["\u3142", "\u3145", "\u3144"]
      ], COMPLEX_VOWELS = [
        ["\u3157", "\u314F", "\u3158"],
        ["\u3157", "\u3150", "\u3159"],
        ["\u3157", "\u3163", "\u315A"],
        ["\u315C", "\u3153", "\u315D"],
        ["\u315C", "\u3154", "\u315E"],
        ["\u315C", "\u3163", "\u315F"],
        ["\u3161", "\u3163", "\u3162"]
      ], CONSONANTS_HASH, CHO_HASH, JUNG_HASH, JONG_HASH, COMPLEX_CONSONANTS_HASH, COMPLEX_VOWELS_HASH;
      function _makeHash(array) {
        var length = array.length, hash = { 0: 0 };
        for (var i = 0; i < length; i++) {
          if (array[i])
            hash[array[i].charCodeAt(0)] = i;
        }
        return hash;
      }
      CONSONANTS_HASH = _makeHash(CONSONANTS);
      CHO_HASH = _makeHash(COMPLETE_CHO);
      JUNG_HASH = _makeHash(COMPLETE_JUNG);
      JONG_HASH = _makeHash(COMPLETE_JONG);
      function _makeComplexHash(array) {
        var length = array.length, hash = {}, code1, code2;
        for (var i = 0; i < length; i++) {
          code1 = array[i][0].charCodeAt(0);
          code2 = array[i][1].charCodeAt(0);
          if (typeof hash[code1] === "undefined") {
            hash[code1] = {};
          }
          hash[code1][code2] = array[i][2].charCodeAt(0);
        }
        return hash;
      }
      COMPLEX_CONSONANTS_HASH = _makeComplexHash(COMPLEX_CONSONANTS);
      COMPLEX_VOWELS_HASH = _makeComplexHash(COMPLEX_VOWELS);
      function _isConsonant(c) {
        return typeof CONSONANTS_HASH[c] !== "undefined";
      }
      function _isCho(c) {
        return typeof CHO_HASH[c] !== "undefined";
      }
      function _isJung(c) {
        return typeof JUNG_HASH[c] !== "undefined";
      }
      function _isJong(c) {
        return typeof JONG_HASH[c] !== "undefined";
      }
      function _isHangul(c) {
        return 44032 <= c && c <= 55203;
      }
      function _isJungJoinable(a, b) {
        return COMPLEX_VOWELS_HASH[a] && COMPLEX_VOWELS_HASH[a][b] ? COMPLEX_VOWELS_HASH[a][b] : false;
      }
      function _isJongJoinable(a, b) {
        return COMPLEX_CONSONANTS_HASH[a] && COMPLEX_CONSONANTS_HASH[a][b] ? COMPLEX_CONSONANTS_HASH[a][b] : false;
      }
      var disassemble = function(string, grouped) {
        if (string === null) {
          throw new Error("Arguments cannot be null");
        }
        if (typeof string === "object") {
          string = string.join("");
        }
        var result = [], length = string.length, cho, jung, jong, code, r;
        for (var i = 0; i < length; i++) {
          var temp = [];
          code = string.charCodeAt(i);
          if (_isHangul(code)) {
            code -= HANGUL_OFFSET;
            jong = code % 28;
            jung = (code - jong) / 28 % 21;
            cho = parseInt((code - jong) / 28 / 21);
            temp.push(CHO[cho]);
            if (typeof JUNG[jung] === "object") {
              temp = temp.concat(JUNG[jung]);
            } else {
              temp.push(JUNG[jung]);
            }
            if (jong > 0) {
              if (typeof JONG[jong] === "object") {
                temp = temp.concat(JONG[jong]);
              } else {
                temp.push(JONG[jong]);
              }
            }
          } else if (_isConsonant(code)) {
            if (_isCho(code)) {
              r = CHO[CHO_HASH[code]];
            } else {
              r = JONG[JONG_HASH[code]];
            }
            if (typeof r === "string") {
              temp.push(r);
            } else {
              temp = temp.concat(r);
            }
          } else if (_isJung(code)) {
            r = JUNG[JUNG_HASH[code]];
            if (typeof r === "string") {
              temp.push(r);
            } else {
              temp = temp.concat(r);
            }
          } else {
            temp.push(string.charAt(i));
          }
          if (grouped) result.push(temp);
          else result = result.concat(temp);
        }
        return result;
      };
      var disassembleToString = function(str) {
        if (typeof str !== "string") {
          return "";
        }
        str = disassemble(str);
        return str.join("");
      };
      var assemble = function(array) {
        if (typeof array === "string") {
          array = disassemble(array);
        }
        var result = [], length = array.length, code, stage = 0, complete_index = -1, previous_code, jong_joined = false;
        function _makeHangul(index) {
          var code2, cho, jung1, jung2, jong1 = 0, jong2, hangul2 = "";
          jong_joined = false;
          if (complete_index + 1 > index) {
            return;
          }
          for (var step = 1; ; step++) {
            if (step === 1) {
              cho = array[complete_index + step].charCodeAt(0);
              if (_isJung(cho)) {
                if (complete_index + step + 1 <= index && _isJung(jung1 = array[complete_index + step + 1].charCodeAt(0))) {
                  result.push(String.fromCharCode(_isJungJoinable(cho, jung1)));
                  complete_index = index;
                  return;
                } else {
                  result.push(array[complete_index + step]);
                  complete_index = index;
                  return;
                }
              } else if (!_isCho(cho)) {
                result.push(array[complete_index + step]);
                complete_index = index;
                return;
              }
              hangul2 = array[complete_index + step];
            } else if (step === 2) {
              jung1 = array[complete_index + step].charCodeAt(0);
              if (_isCho(jung1)) {
                cho = _isJongJoinable(cho, jung1);
                hangul2 = String.fromCharCode(cho);
                result.push(hangul2);
                complete_index = index;
                return;
              } else {
                hangul2 = String.fromCharCode((CHO_HASH[cho] * 21 + JUNG_HASH[jung1]) * 28 + HANGUL_OFFSET);
              }
            } else if (step === 3) {
              jung2 = array[complete_index + step].charCodeAt(0);
              if (_isJungJoinable(jung1, jung2)) {
                jung1 = _isJungJoinable(jung1, jung2);
              } else {
                jong1 = jung2;
              }
              hangul2 = String.fromCharCode((CHO_HASH[cho] * 21 + JUNG_HASH[jung1]) * 28 + JONG_HASH[jong1] + HANGUL_OFFSET);
            } else if (step === 4) {
              jong2 = array[complete_index + step].charCodeAt(0);
              if (_isJongJoinable(jong1, jong2)) {
                jong1 = _isJongJoinable(jong1, jong2);
              } else {
                jong1 = jong2;
              }
              hangul2 = String.fromCharCode((CHO_HASH[cho] * 21 + JUNG_HASH[jung1]) * 28 + JONG_HASH[jong1] + HANGUL_OFFSET);
            } else if (step === 5) {
              jong2 = array[complete_index + step].charCodeAt(0);
              jong1 = _isJongJoinable(jong1, jong2);
              hangul2 = String.fromCharCode((CHO_HASH[cho] * 21 + JUNG_HASH[jung1]) * 28 + JONG_HASH[jong1] + HANGUL_OFFSET);
            }
            if (complete_index + step >= index) {
              result.push(hangul2);
              complete_index = index;
              return;
            }
          }
        }
        for (var i = 0; i < length; i++) {
          code = array[i].charCodeAt(0);
          if (!_isCho(code) && !_isJung(code) && !_isJong(code)) {
            _makeHangul(i - 1);
            _makeHangul(i);
            stage = 0;
            continue;
          }
          if (stage === 0) {
            if (_isCho(code)) {
              stage = 1;
            } else if (_isJung(code)) {
              stage = 4;
            }
          } else if (stage == 1) {
            if (_isJung(code)) {
              stage = 2;
            } else {
              if (_isJongJoinable(previous_code, code)) {
                stage = 5;
              } else {
                _makeHangul(i - 1);
              }
            }
          } else if (stage == 2) {
            if (_isJong(code)) {
              stage = 3;
            } else if (_isJung(code)) {
              if (_isJungJoinable(previous_code, code)) {
              } else {
                _makeHangul(i - 1);
                stage = 4;
              }
            } else {
              _makeHangul(i - 1);
              stage = 1;
            }
          } else if (stage == 3) {
            if (_isJong(code)) {
              if (!jong_joined && _isJongJoinable(previous_code, code)) {
                jong_joined = true;
              } else {
                _makeHangul(i - 1);
                stage = 1;
              }
            } else if (_isCho(code)) {
              _makeHangul(i - 1);
              stage = 1;
            } else if (_isJung(code)) {
              _makeHangul(i - 2);
              stage = 2;
            }
          } else if (stage == 4) {
            if (_isJung(code)) {
              if (_isJungJoinable(previous_code, code)) {
                _makeHangul(i);
                stage = 0;
              } else {
                _makeHangul(i - 1);
              }
            } else {
              _makeHangul(i - 1);
              stage = 1;
            }
          } else if (stage == 5) {
            if (_isJung(code)) {
              _makeHangul(i - 2);
              stage = 2;
            } else {
              _makeHangul(i - 1);
              stage = 1;
            }
          }
          previous_code = code;
        }
        _makeHangul(i - 1);
        return result.join("");
      };
      var search = function(a, b) {
        var ad = disassemble(a).join(""), bd = disassemble(b).join("");
        return ad.indexOf(bd);
      };
      var rangeSearch = function(haystack, needle) {
        var hex = disassemble(haystack).join(""), nex = disassemble(needle).join(""), grouped = disassemble(haystack, true), re = new RegExp(nex, "gi"), indices = [], result;
        if (!needle.length) return [];
        while (result = re.exec(hex)) {
          indices.push(result.index);
        }
        function findStart(index) {
          for (var i = 0, length = 0; i < grouped.length; ++i) {
            length += grouped[i].length;
            if (index < length) return i;
          }
        }
        function findEnd(index) {
          for (var i = 0, length = 0; i < grouped.length; ++i) {
            length += grouped[i].length;
            if (index + nex.length <= length) return i;
          }
        }
        return indices.map(function(i) {
          return [findStart(i), findEnd(i)];
        });
      };
      function Searcher(string) {
        this.string = string;
        this.disassembled = disassemble(string).join("");
      }
      Searcher.prototype.search = function(string) {
        return disassemble(string).join("").indexOf(this.disassembled);
      };
      var endsWithConsonant = function(string) {
        if (typeof string === "object") {
          string = string.join("");
        }
        var code = string.charCodeAt(string.length - 1);
        if (_isHangul(code)) {
          code -= HANGUL_OFFSET;
          var jong = code % 28;
          if (jong > 0) {
            return true;
          }
        } else if (_isConsonant(code)) {
          return true;
        }
        return false;
      };
      var endsWith = function(string, target) {
        return disassemble(string).pop() === target;
      };
      var hangul = {
        disassemble,
        d: disassemble,
        // alias for disassemble
        disassembleToString,
        ds: disassembleToString,
        // alias for disassembleToString
        assemble,
        a: assemble,
        // alias for assemble
        search,
        rangeSearch,
        Searcher,
        endsWithConsonant,
        endsWith,
        isHangul: function(c) {
          if (typeof c === "string")
            c = c.charCodeAt(0);
          return _isHangul(c);
        },
        isComplete: function(c) {
          if (typeof c === "string")
            c = c.charCodeAt(0);
          return _isHangul(c);
        },
        isConsonant: function(c) {
          if (typeof c === "string")
            c = c.charCodeAt(0);
          return _isConsonant(c);
        },
        isVowel: function(c) {
          if (typeof c === "string")
            c = c.charCodeAt(0);
          return _isJung(c);
        },
        isCho: function(c) {
          if (typeof c === "string")
            c = c.charCodeAt(0);
          return _isCho(c);
        },
        isJong: function(c) {
          if (typeof c === "string")
            c = c.charCodeAt(0);
          return _isJong(c);
        },
        isHangulAll: function(str) {
          if (typeof str !== "string") return false;
          for (var i = 0; i < str.length; i++) {
            if (!_isHangul(str.charCodeAt(i))) return false;
          }
          return true;
        },
        isCompleteAll: function(str) {
          if (typeof str !== "string") return false;
          for (var i = 0; i < str.length; i++) {
            if (!_isHangul(str.charCodeAt(i))) return false;
          }
          return true;
        },
        isConsonantAll: function(str) {
          if (typeof str !== "string") return false;
          for (var i = 0; i < str.length; i++) {
            if (!_isConsonant(str.charCodeAt(i))) return false;
          }
          return true;
        },
        isVowelAll: function(str) {
          if (typeof str !== "string") return false;
          for (var i = 0; i < str.length; i++) {
            if (!_isJung(str.charCodeAt(i))) return false;
          }
          return true;
        },
        isChoAll: function(str) {
          if (typeof str !== "string") return false;
          for (var i = 0; i < str.length; i++) {
            if (!_isCho(str.charCodeAt(i))) return false;
          }
          return true;
        },
        isJongAll: function(str) {
          if (typeof str !== "string") return false;
          for (var i = 0; i < str.length; i++) {
            if (!_isJong(str.charCodeAt(i))) return false;
          }
          return true;
        }
      };
      if (typeof define == "function" && define.amd) {
        define(function() {
          return hangul;
        });
      } else if (typeof module !== "undefined") {
        module.exports = hangul;
      } else {
        window.Hangul = hangul;
      }
    })();
  }
});

// dev/lib/hangul-js.js
var Hangul = __toESM(require_hangul(), 1);
export {
  Hangul
};
//# sourceMappingURL=hangul-js.js.map
