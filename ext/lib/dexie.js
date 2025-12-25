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

// node_modules/dexie/dist/dexie.js
var require_dexie = __commonJS({
  "node_modules/dexie/dist/dexie.js"(exports, module) {
    (function(global2, factory) {
      typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global2 = typeof globalThis !== "undefined" ? globalThis : global2 || self, global2.Dexie = factory());
    })(exports, function() {
      "use strict";
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      }
      var __assign2 = function() {
        __assign2 = Object.assign || function __assign3(t) {
          for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
          }
          return t;
        };
        return __assign2.apply(this, arguments);
      };
      function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
          if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
          }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
      }
      var _global2 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
      var keys = Object.keys;
      var isArray = Array.isArray;
      if (typeof Promise !== "undefined" && !_global2.Promise) {
        _global2.Promise = Promise;
      }
      function extend(obj, extension) {
        if (typeof extension !== "object")
          return obj;
        keys(extension).forEach(function(key) {
          obj[key] = extension[key];
        });
        return obj;
      }
      var getProto = Object.getPrototypeOf;
      var _hasOwn = {}.hasOwnProperty;
      function hasOwn(obj, prop) {
        return _hasOwn.call(obj, prop);
      }
      function props(proto, extension) {
        if (typeof extension === "function")
          extension = extension(getProto(proto));
        (typeof Reflect === "undefined" ? keys : Reflect.ownKeys)(extension).forEach(function(key) {
          setProp(proto, key, extension[key]);
        });
      }
      var defineProperty = Object.defineProperty;
      function setProp(obj, prop, functionOrGetSet, options) {
        defineProperty(obj, prop, extend(functionOrGetSet && hasOwn(functionOrGetSet, "get") && typeof functionOrGetSet.get === "function" ? { get: functionOrGetSet.get, set: functionOrGetSet.set, configurable: true } : { value: functionOrGetSet, configurable: true, writable: true }, options));
      }
      function derive(Child) {
        return {
          from: function(Parent) {
            Child.prototype = Object.create(Parent.prototype);
            setProp(Child.prototype, "constructor", Child);
            return {
              extend: props.bind(null, Child.prototype)
            };
          }
        };
      }
      var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
      function getPropertyDescriptor(obj, prop) {
        var pd = getOwnPropertyDescriptor(obj, prop);
        var proto;
        return pd || (proto = getProto(obj)) && getPropertyDescriptor(proto, prop);
      }
      var _slice = [].slice;
      function slice(args, start, end) {
        return _slice.call(args, start, end);
      }
      function override(origFunc, overridedFactory) {
        return overridedFactory(origFunc);
      }
      function assert(b) {
        if (!b)
          throw new Error("Assertion Failed");
      }
      function asap$1(fn) {
        if (_global2.setImmediate)
          setImmediate(fn);
        else
          setTimeout(fn, 0);
      }
      function arrayToObject(array, extractor) {
        return array.reduce(function(result, item, i) {
          var nameAndValue = extractor(item, i);
          if (nameAndValue)
            result[nameAndValue[0]] = nameAndValue[1];
          return result;
        }, {});
      }
      function getByKeyPath(obj, keyPath) {
        if (typeof keyPath === "string" && hasOwn(obj, keyPath))
          return obj[keyPath];
        if (!keyPath)
          return obj;
        if (typeof keyPath !== "string") {
          var rv = [];
          for (var i = 0, l = keyPath.length; i < l; ++i) {
            var val = getByKeyPath(obj, keyPath[i]);
            rv.push(val);
          }
          return rv;
        }
        var period = keyPath.indexOf(".");
        if (period !== -1) {
          var innerObj = obj[keyPath.substr(0, period)];
          return innerObj == null ? void 0 : getByKeyPath(innerObj, keyPath.substr(period + 1));
        }
        return void 0;
      }
      function setByKeyPath(obj, keyPath, value) {
        if (!obj || keyPath === void 0)
          return;
        if ("isFrozen" in Object && Object.isFrozen(obj))
          return;
        if (typeof keyPath !== "string" && "length" in keyPath) {
          assert(typeof value !== "string" && "length" in value);
          for (var i = 0, l = keyPath.length; i < l; ++i) {
            setByKeyPath(obj, keyPath[i], value[i]);
          }
        } else {
          var period = keyPath.indexOf(".");
          if (period !== -1) {
            var currentKeyPath = keyPath.substr(0, period);
            var remainingKeyPath = keyPath.substr(period + 1);
            if (remainingKeyPath === "")
              if (value === void 0) {
                if (isArray(obj) && !isNaN(parseInt(currentKeyPath)))
                  obj.splice(currentKeyPath, 1);
                else
                  delete obj[currentKeyPath];
              } else
                obj[currentKeyPath] = value;
            else {
              var innerObj = obj[currentKeyPath];
              if (!innerObj || !hasOwn(obj, currentKeyPath))
                innerObj = obj[currentKeyPath] = {};
              setByKeyPath(innerObj, remainingKeyPath, value);
            }
          } else {
            if (value === void 0) {
              if (isArray(obj) && !isNaN(parseInt(keyPath)))
                obj.splice(keyPath, 1);
              else
                delete obj[keyPath];
            } else
              obj[keyPath] = value;
          }
        }
      }
      function delByKeyPath(obj, keyPath) {
        if (typeof keyPath === "string")
          setByKeyPath(obj, keyPath, void 0);
        else if ("length" in keyPath)
          [].map.call(keyPath, function(kp) {
            setByKeyPath(obj, kp, void 0);
          });
      }
      function shallowClone(obj) {
        var rv = {};
        for (var m in obj) {
          if (hasOwn(obj, m))
            rv[m] = obj[m];
        }
        return rv;
      }
      var concat = [].concat;
      function flatten(a) {
        return concat.apply([], a);
      }
      var intrinsicTypeNames = "BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey".split(",").concat(flatten([8, 16, 32, 64].map(function(num) {
        return ["Int", "Uint", "Float"].map(function(t) {
          return t + num + "Array";
        });
      }))).filter(function(t) {
        return _global2[t];
      });
      var intrinsicTypes = new Set(intrinsicTypeNames.map(function(t) {
        return _global2[t];
      }));
      function cloneSimpleObjectTree(o) {
        var rv = {};
        for (var k in o)
          if (hasOwn(o, k)) {
            var v = o[k];
            rv[k] = !v || typeof v !== "object" || intrinsicTypes.has(v.constructor) ? v : cloneSimpleObjectTree(v);
          }
        return rv;
      }
      function objectIsEmpty(o) {
        for (var k in o)
          if (hasOwn(o, k))
            return false;
        return true;
      }
      var circularRefs = null;
      function deepClone(any) {
        circularRefs = /* @__PURE__ */ new WeakMap();
        var rv = innerDeepClone(any);
        circularRefs = null;
        return rv;
      }
      function innerDeepClone(x) {
        if (!x || typeof x !== "object")
          return x;
        var rv = circularRefs.get(x);
        if (rv)
          return rv;
        if (isArray(x)) {
          rv = [];
          circularRefs.set(x, rv);
          for (var i = 0, l = x.length; i < l; ++i) {
            rv.push(innerDeepClone(x[i]));
          }
        } else if (intrinsicTypes.has(x.constructor)) {
          rv = x;
        } else {
          var proto = getProto(x);
          rv = proto === Object.prototype ? {} : Object.create(proto);
          circularRefs.set(x, rv);
          for (var prop in x) {
            if (hasOwn(x, prop)) {
              rv[prop] = innerDeepClone(x[prop]);
            }
          }
        }
        return rv;
      }
      var toString = {}.toString;
      function toStringTag(o) {
        return toString.call(o).slice(8, -1);
      }
      var iteratorSymbol = typeof Symbol !== "undefined" ? Symbol.iterator : "@@iterator";
      var getIteratorOf = typeof iteratorSymbol === "symbol" ? function(x) {
        var i;
        return x != null && (i = x[iteratorSymbol]) && i.apply(x);
      } : function() {
        return null;
      };
      function delArrayItem(a, x) {
        var i = a.indexOf(x);
        if (i >= 0)
          a.splice(i, 1);
        return i >= 0;
      }
      var NO_CHAR_ARRAY = {};
      function getArrayOf(arrayLike) {
        var i, a, x, it;
        if (arguments.length === 1) {
          if (isArray(arrayLike))
            return arrayLike.slice();
          if (this === NO_CHAR_ARRAY && typeof arrayLike === "string")
            return [arrayLike];
          if (it = getIteratorOf(arrayLike)) {
            a = [];
            while (x = it.next(), !x.done)
              a.push(x.value);
            return a;
          }
          if (arrayLike == null)
            return [arrayLike];
          i = arrayLike.length;
          if (typeof i === "number") {
            a = new Array(i);
            while (i--)
              a[i] = arrayLike[i];
            return a;
          }
          return [arrayLike];
        }
        i = arguments.length;
        a = new Array(i);
        while (i--)
          a[i] = arguments[i];
        return a;
      }
      var isAsyncFunction = typeof Symbol !== "undefined" ? function(fn) {
        return fn[Symbol.toStringTag] === "AsyncFunction";
      } : function() {
        return false;
      };
      var dexieErrorNames = [
        "Modify",
        "Bulk",
        "OpenFailed",
        "VersionChange",
        "Schema",
        "Upgrade",
        "InvalidTable",
        "MissingAPI",
        "NoSuchDatabase",
        "InvalidArgument",
        "SubTransaction",
        "Unsupported",
        "Internal",
        "DatabaseClosed",
        "PrematureCommit",
        "ForeignAwait"
      ];
      var idbDomErrorNames = [
        "Unknown",
        "Constraint",
        "Data",
        "TransactionInactive",
        "ReadOnly",
        "Version",
        "NotFound",
        "InvalidState",
        "InvalidAccess",
        "Abort",
        "Timeout",
        "QuotaExceeded",
        "Syntax",
        "DataClone"
      ];
      var errorList = dexieErrorNames.concat(idbDomErrorNames);
      var defaultTexts = {
        VersionChanged: "Database version changed by other database connection",
        DatabaseClosed: "Database has been closed",
        Abort: "Transaction aborted",
        TransactionInactive: "Transaction has already completed or failed",
        MissingAPI: "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb"
      };
      function DexieError(name, msg) {
        this.name = name;
        this.message = msg;
      }
      derive(DexieError).from(Error).extend({
        toString: function() {
          return this.name + ": " + this.message;
        }
      });
      function getMultiErrorMessage(msg, failures) {
        return msg + ". Errors: " + Object.keys(failures).map(function(key) {
          return failures[key].toString();
        }).filter(function(v, i, s) {
          return s.indexOf(v) === i;
        }).join("\n");
      }
      function ModifyError(msg, failures, successCount, failedKeys) {
        this.failures = failures;
        this.failedKeys = failedKeys;
        this.successCount = successCount;
        this.message = getMultiErrorMessage(msg, failures);
      }
      derive(ModifyError).from(DexieError);
      function BulkError(msg, failures) {
        this.name = "BulkError";
        this.failures = Object.keys(failures).map(function(pos) {
          return failures[pos];
        });
        this.failuresByPos = failures;
        this.message = getMultiErrorMessage(msg, this.failures);
      }
      derive(BulkError).from(DexieError);
      var errnames = errorList.reduce(function(obj, name) {
        return obj[name] = name + "Error", obj;
      }, {});
      var BaseException = DexieError;
      var exceptions = errorList.reduce(function(obj, name) {
        var fullName = name + "Error";
        function DexieError2(msgOrInner, inner) {
          this.name = fullName;
          if (!msgOrInner) {
            this.message = defaultTexts[name] || fullName;
            this.inner = null;
          } else if (typeof msgOrInner === "string") {
            this.message = "".concat(msgOrInner).concat(!inner ? "" : "\n " + inner);
            this.inner = inner || null;
          } else if (typeof msgOrInner === "object") {
            this.message = "".concat(msgOrInner.name, " ").concat(msgOrInner.message);
            this.inner = msgOrInner;
          }
        }
        derive(DexieError2).from(BaseException);
        obj[name] = DexieError2;
        return obj;
      }, {});
      exceptions.Syntax = SyntaxError;
      exceptions.Type = TypeError;
      exceptions.Range = RangeError;
      var exceptionMap = idbDomErrorNames.reduce(function(obj, name) {
        obj[name + "Error"] = exceptions[name];
        return obj;
      }, {});
      function mapError(domError, message) {
        if (!domError || domError instanceof DexieError || domError instanceof TypeError || domError instanceof SyntaxError || !domError.name || !exceptionMap[domError.name])
          return domError;
        var rv = new exceptionMap[domError.name](message || domError.message, domError);
        if ("stack" in domError) {
          setProp(rv, "stack", { get: function() {
            return this.inner.stack;
          } });
        }
        return rv;
      }
      var fullNameExceptions = errorList.reduce(function(obj, name) {
        if (["Syntax", "Type", "Range"].indexOf(name) === -1)
          obj[name + "Error"] = exceptions[name];
        return obj;
      }, {});
      fullNameExceptions.ModifyError = ModifyError;
      fullNameExceptions.DexieError = DexieError;
      fullNameExceptions.BulkError = BulkError;
      function nop() {
      }
      function mirror(val) {
        return val;
      }
      function pureFunctionChain(f1, f2) {
        if (f1 == null || f1 === mirror)
          return f2;
        return function(val) {
          return f2(f1(val));
        };
      }
      function callBoth(on1, on2) {
        return function() {
          on1.apply(this, arguments);
          on2.apply(this, arguments);
        };
      }
      function hookCreatingChain(f1, f2) {
        if (f1 === nop)
          return f2;
        return function() {
          var res = f1.apply(this, arguments);
          if (res !== void 0)
            arguments[0] = res;
          var onsuccess = this.onsuccess, onerror = this.onerror;
          this.onsuccess = null;
          this.onerror = null;
          var res2 = f2.apply(this, arguments);
          if (onsuccess)
            this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
          if (onerror)
            this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
          return res2 !== void 0 ? res2 : res;
        };
      }
      function hookDeletingChain(f1, f2) {
        if (f1 === nop)
          return f2;
        return function() {
          f1.apply(this, arguments);
          var onsuccess = this.onsuccess, onerror = this.onerror;
          this.onsuccess = this.onerror = null;
          f2.apply(this, arguments);
          if (onsuccess)
            this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
          if (onerror)
            this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
        };
      }
      function hookUpdatingChain(f1, f2) {
        if (f1 === nop)
          return f2;
        return function(modifications) {
          var res = f1.apply(this, arguments);
          extend(modifications, res);
          var onsuccess = this.onsuccess, onerror = this.onerror;
          this.onsuccess = null;
          this.onerror = null;
          var res2 = f2.apply(this, arguments);
          if (onsuccess)
            this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
          if (onerror)
            this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
          return res === void 0 ? res2 === void 0 ? void 0 : res2 : extend(res, res2);
        };
      }
      function reverseStoppableEventChain(f1, f2) {
        if (f1 === nop)
          return f2;
        return function() {
          if (f2.apply(this, arguments) === false)
            return false;
          return f1.apply(this, arguments);
        };
      }
      function promisableChain(f1, f2) {
        if (f1 === nop)
          return f2;
        return function() {
          var res = f1.apply(this, arguments);
          if (res && typeof res.then === "function") {
            var thiz = this, i = arguments.length, args = new Array(i);
            while (i--)
              args[i] = arguments[i];
            return res.then(function() {
              return f2.apply(thiz, args);
            });
          }
          return f2.apply(this, arguments);
        };
      }
      var debug = typeof location !== "undefined" && /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
      function setDebug(value, filter) {
        debug = value;
      }
      var INTERNAL = {};
      var ZONE_ECHO_LIMIT = 100, _a$1 = typeof Promise === "undefined" ? [] : function() {
        var globalP = Promise.resolve();
        if (typeof crypto === "undefined" || !crypto.subtle)
          return [globalP, getProto(globalP), globalP];
        var nativeP = crypto.subtle.digest("SHA-512", new Uint8Array([0]));
        return [
          nativeP,
          getProto(nativeP),
          globalP
        ];
      }(), resolvedNativePromise = _a$1[0], nativePromiseProto = _a$1[1], resolvedGlobalPromise = _a$1[2], nativePromiseThen = nativePromiseProto && nativePromiseProto.then;
      var NativePromise = resolvedNativePromise && resolvedNativePromise.constructor;
      var patchGlobalPromise = !!resolvedGlobalPromise;
      function schedulePhysicalTick() {
        queueMicrotask(physicalTick);
      }
      var asap = function(callback, args) {
        microtickQueue.push([callback, args]);
        if (needsNewPhysicalTick) {
          schedulePhysicalTick();
          needsNewPhysicalTick = false;
        }
      };
      var isOutsideMicroTick = true, needsNewPhysicalTick = true, unhandledErrors = [], rejectingErrors = [], rejectionMapper = mirror;
      var globalPSD = {
        id: "global",
        global: true,
        ref: 0,
        unhandleds: [],
        onunhandled: nop,
        pgp: false,
        env: {},
        finalize: nop
      };
      var PSD = globalPSD;
      var microtickQueue = [];
      var numScheduledCalls = 0;
      var tickFinalizers = [];
      function DexiePromise(fn) {
        if (typeof this !== "object")
          throw new TypeError("Promises must be constructed via new");
        this._listeners = [];
        this._lib = false;
        var psd = this._PSD = PSD;
        if (typeof fn !== "function") {
          if (fn !== INTERNAL)
            throw new TypeError("Not a function");
          this._state = arguments[1];
          this._value = arguments[2];
          if (this._state === false)
            handleRejection(this, this._value);
          return;
        }
        this._state = null;
        this._value = null;
        ++psd.ref;
        executePromiseTask(this, fn);
      }
      var thenProp = {
        get: function() {
          var psd = PSD, microTaskId = totalEchoes;
          function then(onFulfilled, onRejected) {
            var _this = this;
            var possibleAwait = !psd.global && (psd !== PSD || microTaskId !== totalEchoes);
            var cleanup = possibleAwait && !decrementExpectedAwaits();
            var rv = new DexiePromise(function(resolve, reject) {
              propagateToListener(_this, new Listener(nativeAwaitCompatibleWrap(onFulfilled, psd, possibleAwait, cleanup), nativeAwaitCompatibleWrap(onRejected, psd, possibleAwait, cleanup), resolve, reject, psd));
            });
            if (this._consoleTask)
              rv._consoleTask = this._consoleTask;
            return rv;
          }
          then.prototype = INTERNAL;
          return then;
        },
        set: function(value) {
          setProp(this, "then", value && value.prototype === INTERNAL ? thenProp : {
            get: function() {
              return value;
            },
            set: thenProp.set
          });
        }
      };
      props(DexiePromise.prototype, {
        then: thenProp,
        _then: function(onFulfilled, onRejected) {
          propagateToListener(this, new Listener(null, null, onFulfilled, onRejected, PSD));
        },
        catch: function(onRejected) {
          if (arguments.length === 1)
            return this.then(null, onRejected);
          var type2 = arguments[0], handler = arguments[1];
          return typeof type2 === "function" ? this.then(null, function(err) {
            return err instanceof type2 ? handler(err) : PromiseReject(err);
          }) : this.then(null, function(err) {
            return err && err.name === type2 ? handler(err) : PromiseReject(err);
          });
        },
        finally: function(onFinally) {
          return this.then(function(value) {
            return DexiePromise.resolve(onFinally()).then(function() {
              return value;
            });
          }, function(err) {
            return DexiePromise.resolve(onFinally()).then(function() {
              return PromiseReject(err);
            });
          });
        },
        timeout: function(ms, msg) {
          var _this = this;
          return ms < Infinity ? new DexiePromise(function(resolve, reject) {
            var handle = setTimeout(function() {
              return reject(new exceptions.Timeout(msg));
            }, ms);
            _this.then(resolve, reject).finally(clearTimeout.bind(null, handle));
          }) : this;
        }
      });
      if (typeof Symbol !== "undefined" && Symbol.toStringTag)
        setProp(DexiePromise.prototype, Symbol.toStringTag, "Dexie.Promise");
      globalPSD.env = snapShot();
      function Listener(onFulfilled, onRejected, resolve, reject, zone) {
        this.onFulfilled = typeof onFulfilled === "function" ? onFulfilled : null;
        this.onRejected = typeof onRejected === "function" ? onRejected : null;
        this.resolve = resolve;
        this.reject = reject;
        this.psd = zone;
      }
      props(DexiePromise, {
        all: function() {
          var values = getArrayOf.apply(null, arguments).map(onPossibleParallellAsync);
          return new DexiePromise(function(resolve, reject) {
            if (values.length === 0)
              resolve([]);
            var remaining = values.length;
            values.forEach(function(a, i) {
              return DexiePromise.resolve(a).then(function(x) {
                values[i] = x;
                if (!--remaining)
                  resolve(values);
              }, reject);
            });
          });
        },
        resolve: function(value) {
          if (value instanceof DexiePromise)
            return value;
          if (value && typeof value.then === "function")
            return new DexiePromise(function(resolve, reject) {
              value.then(resolve, reject);
            });
          var rv = new DexiePromise(INTERNAL, true, value);
          return rv;
        },
        reject: PromiseReject,
        race: function() {
          var values = getArrayOf.apply(null, arguments).map(onPossibleParallellAsync);
          return new DexiePromise(function(resolve, reject) {
            values.map(function(value) {
              return DexiePromise.resolve(value).then(resolve, reject);
            });
          });
        },
        PSD: {
          get: function() {
            return PSD;
          },
          set: function(value) {
            return PSD = value;
          }
        },
        totalEchoes: { get: function() {
          return totalEchoes;
        } },
        newPSD: newScope,
        usePSD,
        scheduler: {
          get: function() {
            return asap;
          },
          set: function(value) {
            asap = value;
          }
        },
        rejectionMapper: {
          get: function() {
            return rejectionMapper;
          },
          set: function(value) {
            rejectionMapper = value;
          }
        },
        follow: function(fn, zoneProps) {
          return new DexiePromise(function(resolve, reject) {
            return newScope(function(resolve2, reject2) {
              var psd = PSD;
              psd.unhandleds = [];
              psd.onunhandled = reject2;
              psd.finalize = callBoth(function() {
                var _this = this;
                run_at_end_of_this_or_next_physical_tick(function() {
                  _this.unhandleds.length === 0 ? resolve2() : reject2(_this.unhandleds[0]);
                });
              }, psd.finalize);
              fn();
            }, zoneProps, resolve, reject);
          });
        }
      });
      if (NativePromise) {
        if (NativePromise.allSettled)
          setProp(DexiePromise, "allSettled", function() {
            var possiblePromises = getArrayOf.apply(null, arguments).map(onPossibleParallellAsync);
            return new DexiePromise(function(resolve) {
              if (possiblePromises.length === 0)
                resolve([]);
              var remaining = possiblePromises.length;
              var results = new Array(remaining);
              possiblePromises.forEach(function(p, i) {
                return DexiePromise.resolve(p).then(function(value) {
                  return results[i] = { status: "fulfilled", value };
                }, function(reason) {
                  return results[i] = { status: "rejected", reason };
                }).then(function() {
                  return --remaining || resolve(results);
                });
              });
            });
          });
        if (NativePromise.any && typeof AggregateError !== "undefined")
          setProp(DexiePromise, "any", function() {
            var possiblePromises = getArrayOf.apply(null, arguments).map(onPossibleParallellAsync);
            return new DexiePromise(function(resolve, reject) {
              if (possiblePromises.length === 0)
                reject(new AggregateError([]));
              var remaining = possiblePromises.length;
              var failures = new Array(remaining);
              possiblePromises.forEach(function(p, i) {
                return DexiePromise.resolve(p).then(function(value) {
                  return resolve(value);
                }, function(failure) {
                  failures[i] = failure;
                  if (!--remaining)
                    reject(new AggregateError(failures));
                });
              });
            });
          });
        if (NativePromise.withResolvers)
          DexiePromise.withResolvers = NativePromise.withResolvers;
      }
      function executePromiseTask(promise, fn) {
        try {
          fn(function(value) {
            if (promise._state !== null)
              return;
            if (value === promise)
              throw new TypeError("A promise cannot be resolved with itself.");
            var shouldExecuteTick = promise._lib && beginMicroTickScope();
            if (value && typeof value.then === "function") {
              executePromiseTask(promise, function(resolve, reject) {
                value instanceof DexiePromise ? value._then(resolve, reject) : value.then(resolve, reject);
              });
            } else {
              promise._state = true;
              promise._value = value;
              propagateAllListeners(promise);
            }
            if (shouldExecuteTick)
              endMicroTickScope();
          }, handleRejection.bind(null, promise));
        } catch (ex) {
          handleRejection(promise, ex);
        }
      }
      function handleRejection(promise, reason) {
        rejectingErrors.push(reason);
        if (promise._state !== null)
          return;
        var shouldExecuteTick = promise._lib && beginMicroTickScope();
        reason = rejectionMapper(reason);
        promise._state = false;
        promise._value = reason;
        addPossiblyUnhandledError(promise);
        propagateAllListeners(promise);
        if (shouldExecuteTick)
          endMicroTickScope();
      }
      function propagateAllListeners(promise) {
        var listeners = promise._listeners;
        promise._listeners = [];
        for (var i = 0, len = listeners.length; i < len; ++i) {
          propagateToListener(promise, listeners[i]);
        }
        var psd = promise._PSD;
        --psd.ref || psd.finalize();
        if (numScheduledCalls === 0) {
          ++numScheduledCalls;
          asap(function() {
            if (--numScheduledCalls === 0)
              finalizePhysicalTick();
          }, []);
        }
      }
      function propagateToListener(promise, listener) {
        if (promise._state === null) {
          promise._listeners.push(listener);
          return;
        }
        var cb = promise._state ? listener.onFulfilled : listener.onRejected;
        if (cb === null) {
          return (promise._state ? listener.resolve : listener.reject)(promise._value);
        }
        ++listener.psd.ref;
        ++numScheduledCalls;
        asap(callListener, [cb, promise, listener]);
      }
      function callListener(cb, promise, listener) {
        try {
          var ret, value = promise._value;
          if (!promise._state && rejectingErrors.length)
            rejectingErrors = [];
          ret = debug && promise._consoleTask ? promise._consoleTask.run(function() {
            return cb(value);
          }) : cb(value);
          if (!promise._state && rejectingErrors.indexOf(value) === -1) {
            markErrorAsHandled(promise);
          }
          listener.resolve(ret);
        } catch (e) {
          listener.reject(e);
        } finally {
          if (--numScheduledCalls === 0)
            finalizePhysicalTick();
          --listener.psd.ref || listener.psd.finalize();
        }
      }
      function physicalTick() {
        usePSD(globalPSD, function() {
          beginMicroTickScope() && endMicroTickScope();
        });
      }
      function beginMicroTickScope() {
        var wasRootExec = isOutsideMicroTick;
        isOutsideMicroTick = false;
        needsNewPhysicalTick = false;
        return wasRootExec;
      }
      function endMicroTickScope() {
        var callbacks, i, l;
        do {
          while (microtickQueue.length > 0) {
            callbacks = microtickQueue;
            microtickQueue = [];
            l = callbacks.length;
            for (i = 0; i < l; ++i) {
              var item = callbacks[i];
              item[0].apply(null, item[1]);
            }
          }
        } while (microtickQueue.length > 0);
        isOutsideMicroTick = true;
        needsNewPhysicalTick = true;
      }
      function finalizePhysicalTick() {
        var unhandledErrs = unhandledErrors;
        unhandledErrors = [];
        unhandledErrs.forEach(function(p) {
          p._PSD.onunhandled.call(null, p._value, p);
        });
        var finalizers = tickFinalizers.slice(0);
        var i = finalizers.length;
        while (i)
          finalizers[--i]();
      }
      function run_at_end_of_this_or_next_physical_tick(fn) {
        function finalizer() {
          fn();
          tickFinalizers.splice(tickFinalizers.indexOf(finalizer), 1);
        }
        tickFinalizers.push(finalizer);
        ++numScheduledCalls;
        asap(function() {
          if (--numScheduledCalls === 0)
            finalizePhysicalTick();
        }, []);
      }
      function addPossiblyUnhandledError(promise) {
        if (!unhandledErrors.some(function(p) {
          return p._value === promise._value;
        }))
          unhandledErrors.push(promise);
      }
      function markErrorAsHandled(promise) {
        var i = unhandledErrors.length;
        while (i)
          if (unhandledErrors[--i]._value === promise._value) {
            unhandledErrors.splice(i, 1);
            return;
          }
      }
      function PromiseReject(reason) {
        return new DexiePromise(INTERNAL, false, reason);
      }
      function wrap(fn, errorCatcher) {
        var psd = PSD;
        return function() {
          var wasRootExec = beginMicroTickScope(), outerScope = PSD;
          try {
            switchToZone(psd, true);
            return fn.apply(this, arguments);
          } catch (e) {
            errorCatcher && errorCatcher(e);
          } finally {
            switchToZone(outerScope, false);
            if (wasRootExec)
              endMicroTickScope();
          }
        };
      }
      var task = { awaits: 0, echoes: 0, id: 0 };
      var taskCounter = 0;
      var zoneStack = [];
      var zoneEchoes = 0;
      var totalEchoes = 0;
      var zone_id_counter = 0;
      function newScope(fn, props2, a1, a2) {
        var parent = PSD, psd = Object.create(parent);
        psd.parent = parent;
        psd.ref = 0;
        psd.global = false;
        psd.id = ++zone_id_counter;
        globalPSD.env;
        psd.env = patchGlobalPromise ? {
          Promise: DexiePromise,
          PromiseProp: { value: DexiePromise, configurable: true, writable: true },
          all: DexiePromise.all,
          race: DexiePromise.race,
          allSettled: DexiePromise.allSettled,
          any: DexiePromise.any,
          resolve: DexiePromise.resolve,
          reject: DexiePromise.reject
        } : {};
        if (props2)
          extend(psd, props2);
        ++parent.ref;
        psd.finalize = function() {
          --this.parent.ref || this.parent.finalize();
        };
        var rv = usePSD(psd, fn, a1, a2);
        if (psd.ref === 0)
          psd.finalize();
        return rv;
      }
      function incrementExpectedAwaits() {
        if (!task.id)
          task.id = ++taskCounter;
        ++task.awaits;
        task.echoes += ZONE_ECHO_LIMIT;
        return task.id;
      }
      function decrementExpectedAwaits() {
        if (!task.awaits)
          return false;
        if (--task.awaits === 0)
          task.id = 0;
        task.echoes = task.awaits * ZONE_ECHO_LIMIT;
        return true;
      }
      if (("" + nativePromiseThen).indexOf("[native code]") === -1) {
        incrementExpectedAwaits = decrementExpectedAwaits = nop;
      }
      function onPossibleParallellAsync(possiblePromise) {
        if (task.echoes && possiblePromise && possiblePromise.constructor === NativePromise) {
          incrementExpectedAwaits();
          return possiblePromise.then(function(x) {
            decrementExpectedAwaits();
            return x;
          }, function(e) {
            decrementExpectedAwaits();
            return rejection(e);
          });
        }
        return possiblePromise;
      }
      function zoneEnterEcho(targetZone) {
        ++totalEchoes;
        if (!task.echoes || --task.echoes === 0) {
          task.echoes = task.awaits = task.id = 0;
        }
        zoneStack.push(PSD);
        switchToZone(targetZone, true);
      }
      function zoneLeaveEcho() {
        var zone = zoneStack[zoneStack.length - 1];
        zoneStack.pop();
        switchToZone(zone, false);
      }
      function switchToZone(targetZone, bEnteringZone) {
        var currentZone = PSD;
        if (bEnteringZone ? task.echoes && (!zoneEchoes++ || targetZone !== PSD) : zoneEchoes && (!--zoneEchoes || targetZone !== PSD)) {
          queueMicrotask(bEnteringZone ? zoneEnterEcho.bind(null, targetZone) : zoneLeaveEcho);
        }
        if (targetZone === PSD)
          return;
        PSD = targetZone;
        if (currentZone === globalPSD)
          globalPSD.env = snapShot();
        if (patchGlobalPromise) {
          var GlobalPromise = globalPSD.env.Promise;
          var targetEnv = targetZone.env;
          if (currentZone.global || targetZone.global) {
            Object.defineProperty(_global2, "Promise", targetEnv.PromiseProp);
            GlobalPromise.all = targetEnv.all;
            GlobalPromise.race = targetEnv.race;
            GlobalPromise.resolve = targetEnv.resolve;
            GlobalPromise.reject = targetEnv.reject;
            if (targetEnv.allSettled)
              GlobalPromise.allSettled = targetEnv.allSettled;
            if (targetEnv.any)
              GlobalPromise.any = targetEnv.any;
          }
        }
      }
      function snapShot() {
        var GlobalPromise = _global2.Promise;
        return patchGlobalPromise ? {
          Promise: GlobalPromise,
          PromiseProp: Object.getOwnPropertyDescriptor(_global2, "Promise"),
          all: GlobalPromise.all,
          race: GlobalPromise.race,
          allSettled: GlobalPromise.allSettled,
          any: GlobalPromise.any,
          resolve: GlobalPromise.resolve,
          reject: GlobalPromise.reject
        } : {};
      }
      function usePSD(psd, fn, a1, a2, a3) {
        var outerScope = PSD;
        try {
          switchToZone(psd, true);
          return fn(a1, a2, a3);
        } finally {
          switchToZone(outerScope, false);
        }
      }
      function nativeAwaitCompatibleWrap(fn, zone, possibleAwait, cleanup) {
        return typeof fn !== "function" ? fn : function() {
          var outerZone = PSD;
          if (possibleAwait)
            incrementExpectedAwaits();
          switchToZone(zone, true);
          try {
            return fn.apply(this, arguments);
          } finally {
            switchToZone(outerZone, false);
            if (cleanup)
              queueMicrotask(decrementExpectedAwaits);
          }
        };
      }
      function execInGlobalContext(cb) {
        if (Promise === NativePromise && task.echoes === 0) {
          if (zoneEchoes === 0) {
            cb();
          } else {
            enqueueNativeMicroTask(cb);
          }
        } else {
          setTimeout(cb, 0);
        }
      }
      var rejection = DexiePromise.reject;
      function tempTransaction(db, mode, storeNames, fn) {
        if (!db.idbdb || !db._state.openComplete && (!PSD.letThrough && !db._vip)) {
          if (db._state.openComplete) {
            return rejection(new exceptions.DatabaseClosed(db._state.dbOpenError));
          }
          if (!db._state.isBeingOpened) {
            if (!db._state.autoOpen)
              return rejection(new exceptions.DatabaseClosed());
            db.open().catch(nop);
          }
          return db._state.dbReadyPromise.then(function() {
            return tempTransaction(db, mode, storeNames, fn);
          });
        } else {
          var trans = db._createTransaction(mode, storeNames, db._dbSchema);
          try {
            trans.create();
            db._state.PR1398_maxLoop = 3;
          } catch (ex) {
            if (ex.name === errnames.InvalidState && db.isOpen() && --db._state.PR1398_maxLoop > 0) {
              console.warn("Dexie: Need to reopen db");
              db.close({ disableAutoOpen: false });
              return db.open().then(function() {
                return tempTransaction(db, mode, storeNames, fn);
              });
            }
            return rejection(ex);
          }
          return trans._promise(mode, function(resolve, reject) {
            return newScope(function() {
              PSD.trans = trans;
              return fn(resolve, reject, trans);
            });
          }).then(function(result) {
            if (mode === "readwrite")
              try {
                trans.idbtrans.commit();
              } catch (_a2) {
              }
            return mode === "readonly" ? result : trans._completion.then(function() {
              return result;
            });
          });
        }
      }
      var DEXIE_VERSION = "4.0.11";
      var maxString = String.fromCharCode(65535);
      var minKey = -Infinity;
      var INVALID_KEY_ARGUMENT = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.";
      var STRING_EXPECTED = "String expected.";
      var connections = [];
      var DBNAMES_DB = "__dbnames";
      var READONLY = "readonly";
      var READWRITE = "readwrite";
      function combine(filter1, filter2) {
        return filter1 ? filter2 ? function() {
          return filter1.apply(this, arguments) && filter2.apply(this, arguments);
        } : filter1 : filter2;
      }
      var AnyRange = {
        type: 3,
        lower: -Infinity,
        lowerOpen: false,
        upper: [[]],
        upperOpen: false
      };
      function workaroundForUndefinedPrimKey(keyPath) {
        return typeof keyPath === "string" && !/\./.test(keyPath) ? function(obj) {
          if (obj[keyPath] === void 0 && keyPath in obj) {
            obj = deepClone(obj);
            delete obj[keyPath];
          }
          return obj;
        } : function(obj) {
          return obj;
        };
      }
      function Entity2() {
        throw exceptions.Type();
      }
      function cmp2(a, b) {
        try {
          var ta = type(a);
          var tb = type(b);
          if (ta !== tb) {
            if (ta === "Array")
              return 1;
            if (tb === "Array")
              return -1;
            if (ta === "binary")
              return 1;
            if (tb === "binary")
              return -1;
            if (ta === "string")
              return 1;
            if (tb === "string")
              return -1;
            if (ta === "Date")
              return 1;
            if (tb !== "Date")
              return NaN;
            return -1;
          }
          switch (ta) {
            case "number":
            case "Date":
            case "string":
              return a > b ? 1 : a < b ? -1 : 0;
            case "binary": {
              return compareUint8Arrays(getUint8Array(a), getUint8Array(b));
            }
            case "Array":
              return compareArrays(a, b);
          }
        } catch (_a2) {
        }
        return NaN;
      }
      function compareArrays(a, b) {
        var al = a.length;
        var bl = b.length;
        var l = al < bl ? al : bl;
        for (var i = 0; i < l; ++i) {
          var res = cmp2(a[i], b[i]);
          if (res !== 0)
            return res;
        }
        return al === bl ? 0 : al < bl ? -1 : 1;
      }
      function compareUint8Arrays(a, b) {
        var al = a.length;
        var bl = b.length;
        var l = al < bl ? al : bl;
        for (var i = 0; i < l; ++i) {
          if (a[i] !== b[i])
            return a[i] < b[i] ? -1 : 1;
        }
        return al === bl ? 0 : al < bl ? -1 : 1;
      }
      function type(x) {
        var t = typeof x;
        if (t !== "object")
          return t;
        if (ArrayBuffer.isView(x))
          return "binary";
        var tsTag = toStringTag(x);
        return tsTag === "ArrayBuffer" ? "binary" : tsTag;
      }
      function getUint8Array(a) {
        if (a instanceof Uint8Array)
          return a;
        if (ArrayBuffer.isView(a))
          return new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
        return new Uint8Array(a);
      }
      var Table = function() {
        function Table2() {
        }
        Table2.prototype._trans = function(mode, fn, writeLocked) {
          var trans = this._tx || PSD.trans;
          var tableName = this.name;
          var task2 = debug && typeof console !== "undefined" && console.createTask && console.createTask("Dexie: ".concat(mode === "readonly" ? "read" : "write", " ").concat(this.name));
          function checkTableInTransaction(resolve, reject, trans2) {
            if (!trans2.schema[tableName])
              throw new exceptions.NotFound("Table " + tableName + " not part of transaction");
            return fn(trans2.idbtrans, trans2);
          }
          var wasRootExec = beginMicroTickScope();
          try {
            var p = trans && trans.db._novip === this.db._novip ? trans === PSD.trans ? trans._promise(mode, checkTableInTransaction, writeLocked) : newScope(function() {
              return trans._promise(mode, checkTableInTransaction, writeLocked);
            }, { trans, transless: PSD.transless || PSD }) : tempTransaction(this.db, mode, [this.name], checkTableInTransaction);
            if (task2) {
              p._consoleTask = task2;
              p = p.catch(function(err) {
                console.trace(err);
                return rejection(err);
              });
            }
            return p;
          } finally {
            if (wasRootExec)
              endMicroTickScope();
          }
        };
        Table2.prototype.get = function(keyOrCrit, cb) {
          var _this = this;
          if (keyOrCrit && keyOrCrit.constructor === Object)
            return this.where(keyOrCrit).first(cb);
          if (keyOrCrit == null)
            return rejection(new exceptions.Type("Invalid argument to Table.get()"));
          return this._trans("readonly", function(trans) {
            return _this.core.get({ trans, key: keyOrCrit }).then(function(res) {
              return _this.hook.reading.fire(res);
            });
          }).then(cb);
        };
        Table2.prototype.where = function(indexOrCrit) {
          if (typeof indexOrCrit === "string")
            return new this.db.WhereClause(this, indexOrCrit);
          if (isArray(indexOrCrit))
            return new this.db.WhereClause(this, "[".concat(indexOrCrit.join("+"), "]"));
          var keyPaths = keys(indexOrCrit);
          if (keyPaths.length === 1)
            return this.where(keyPaths[0]).equals(indexOrCrit[keyPaths[0]]);
          var compoundIndex = this.schema.indexes.concat(this.schema.primKey).filter(function(ix) {
            if (ix.compound && keyPaths.every(function(keyPath) {
              return ix.keyPath.indexOf(keyPath) >= 0;
            })) {
              for (var i = 0; i < keyPaths.length; ++i) {
                if (keyPaths.indexOf(ix.keyPath[i]) === -1)
                  return false;
              }
              return true;
            }
            return false;
          }).sort(function(a, b) {
            return a.keyPath.length - b.keyPath.length;
          })[0];
          if (compoundIndex && this.db._maxKey !== maxString) {
            var keyPathsInValidOrder = compoundIndex.keyPath.slice(0, keyPaths.length);
            return this.where(keyPathsInValidOrder).equals(keyPathsInValidOrder.map(function(kp) {
              return indexOrCrit[kp];
            }));
          }
          if (!compoundIndex && debug)
            console.warn("The query ".concat(JSON.stringify(indexOrCrit), " on ").concat(this.name, " would benefit from a ") + "compound index [".concat(keyPaths.join("+"), "]"));
          var idxByName = this.schema.idxByName;
          function equals(a, b) {
            return cmp2(a, b) === 0;
          }
          var _a2 = keyPaths.reduce(function(_a3, keyPath) {
            var prevIndex = _a3[0], prevFilterFn = _a3[1];
            var index = idxByName[keyPath];
            var value = indexOrCrit[keyPath];
            return [
              prevIndex || index,
              prevIndex || !index ? combine(prevFilterFn, index && index.multi ? function(x) {
                var prop = getByKeyPath(x, keyPath);
                return isArray(prop) && prop.some(function(item) {
                  return equals(value, item);
                });
              } : function(x) {
                return equals(value, getByKeyPath(x, keyPath));
              }) : prevFilterFn
            ];
          }, [null, null]), idx = _a2[0], filterFunction = _a2[1];
          return idx ? this.where(idx.name).equals(indexOrCrit[idx.keyPath]).filter(filterFunction) : compoundIndex ? this.filter(filterFunction) : this.where(keyPaths).equals("");
        };
        Table2.prototype.filter = function(filterFunction) {
          return this.toCollection().and(filterFunction);
        };
        Table2.prototype.count = function(thenShortcut) {
          return this.toCollection().count(thenShortcut);
        };
        Table2.prototype.offset = function(offset) {
          return this.toCollection().offset(offset);
        };
        Table2.prototype.limit = function(numRows) {
          return this.toCollection().limit(numRows);
        };
        Table2.prototype.each = function(callback) {
          return this.toCollection().each(callback);
        };
        Table2.prototype.toArray = function(thenShortcut) {
          return this.toCollection().toArray(thenShortcut);
        };
        Table2.prototype.toCollection = function() {
          return new this.db.Collection(new this.db.WhereClause(this));
        };
        Table2.prototype.orderBy = function(index) {
          return new this.db.Collection(new this.db.WhereClause(this, isArray(index) ? "[".concat(index.join("+"), "]") : index));
        };
        Table2.prototype.reverse = function() {
          return this.toCollection().reverse();
        };
        Table2.prototype.mapToClass = function(constructor) {
          var _a2 = this, db = _a2.db, tableName = _a2.name;
          this.schema.mappedClass = constructor;
          if (constructor.prototype instanceof Entity2) {
            constructor = function(_super) {
              __extends(class_1, _super);
              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1.prototype, "db", {
                get: function() {
                  return db;
                },
                enumerable: false,
                configurable: true
              });
              class_1.prototype.table = function() {
                return tableName;
              };
              return class_1;
            }(constructor);
          }
          var inheritedProps = /* @__PURE__ */ new Set();
          for (var proto = constructor.prototype; proto; proto = getProto(proto)) {
            Object.getOwnPropertyNames(proto).forEach(function(propName) {
              return inheritedProps.add(propName);
            });
          }
          var readHook = function(obj) {
            if (!obj)
              return obj;
            var res = Object.create(constructor.prototype);
            for (var m in obj)
              if (!inheritedProps.has(m))
                try {
                  res[m] = obj[m];
                } catch (_) {
                }
            return res;
          };
          if (this.schema.readHook) {
            this.hook.reading.unsubscribe(this.schema.readHook);
          }
          this.schema.readHook = readHook;
          this.hook("reading", readHook);
          return constructor;
        };
        Table2.prototype.defineClass = function() {
          function Class(content) {
            extend(this, content);
          }
          return this.mapToClass(Class);
        };
        Table2.prototype.add = function(obj, key) {
          var _this = this;
          var _a2 = this.schema.primKey, auto = _a2.auto, keyPath = _a2.keyPath;
          var objToAdd = obj;
          if (keyPath && auto) {
            objToAdd = workaroundForUndefinedPrimKey(keyPath)(obj);
          }
          return this._trans("readwrite", function(trans) {
            return _this.core.mutate({ trans, type: "add", keys: key != null ? [key] : null, values: [objToAdd] });
          }).then(function(res) {
            return res.numFailures ? DexiePromise.reject(res.failures[0]) : res.lastResult;
          }).then(function(lastResult) {
            if (keyPath) {
              try {
                setByKeyPath(obj, keyPath, lastResult);
              } catch (_) {
              }
            }
            return lastResult;
          });
        };
        Table2.prototype.update = function(keyOrObject, modifications) {
          if (typeof keyOrObject === "object" && !isArray(keyOrObject)) {
            var key = getByKeyPath(keyOrObject, this.schema.primKey.keyPath);
            if (key === void 0)
              return rejection(new exceptions.InvalidArgument("Given object does not contain its primary key"));
            return this.where(":id").equals(key).modify(modifications);
          } else {
            return this.where(":id").equals(keyOrObject).modify(modifications);
          }
        };
        Table2.prototype.put = function(obj, key) {
          var _this = this;
          var _a2 = this.schema.primKey, auto = _a2.auto, keyPath = _a2.keyPath;
          var objToAdd = obj;
          if (keyPath && auto) {
            objToAdd = workaroundForUndefinedPrimKey(keyPath)(obj);
          }
          return this._trans("readwrite", function(trans) {
            return _this.core.mutate({ trans, type: "put", values: [objToAdd], keys: key != null ? [key] : null });
          }).then(function(res) {
            return res.numFailures ? DexiePromise.reject(res.failures[0]) : res.lastResult;
          }).then(function(lastResult) {
            if (keyPath) {
              try {
                setByKeyPath(obj, keyPath, lastResult);
              } catch (_) {
              }
            }
            return lastResult;
          });
        };
        Table2.prototype.delete = function(key) {
          var _this = this;
          return this._trans("readwrite", function(trans) {
            return _this.core.mutate({ trans, type: "delete", keys: [key] });
          }).then(function(res) {
            return res.numFailures ? DexiePromise.reject(res.failures[0]) : void 0;
          });
        };
        Table2.prototype.clear = function() {
          var _this = this;
          return this._trans("readwrite", function(trans) {
            return _this.core.mutate({ trans, type: "deleteRange", range: AnyRange });
          }).then(function(res) {
            return res.numFailures ? DexiePromise.reject(res.failures[0]) : void 0;
          });
        };
        Table2.prototype.bulkGet = function(keys2) {
          var _this = this;
          return this._trans("readonly", function(trans) {
            return _this.core.getMany({
              keys: keys2,
              trans
            }).then(function(result) {
              return result.map(function(res) {
                return _this.hook.reading.fire(res);
              });
            });
          });
        };
        Table2.prototype.bulkAdd = function(objects, keysOrOptions, options) {
          var _this = this;
          var keys2 = Array.isArray(keysOrOptions) ? keysOrOptions : void 0;
          options = options || (keys2 ? void 0 : keysOrOptions);
          var wantResults = options ? options.allKeys : void 0;
          return this._trans("readwrite", function(trans) {
            var _a2 = _this.schema.primKey, auto = _a2.auto, keyPath = _a2.keyPath;
            if (keyPath && keys2)
              throw new exceptions.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
            if (keys2 && keys2.length !== objects.length)
              throw new exceptions.InvalidArgument("Arguments objects and keys must have the same length");
            var numObjects = objects.length;
            var objectsToAdd = keyPath && auto ? objects.map(workaroundForUndefinedPrimKey(keyPath)) : objects;
            return _this.core.mutate({ trans, type: "add", keys: keys2, values: objectsToAdd, wantResults }).then(function(_a3) {
              var numFailures = _a3.numFailures, results = _a3.results, lastResult = _a3.lastResult, failures = _a3.failures;
              var result = wantResults ? results : lastResult;
              if (numFailures === 0)
                return result;
              throw new BulkError("".concat(_this.name, ".bulkAdd(): ").concat(numFailures, " of ").concat(numObjects, " operations failed"), failures);
            });
          });
        };
        Table2.prototype.bulkPut = function(objects, keysOrOptions, options) {
          var _this = this;
          var keys2 = Array.isArray(keysOrOptions) ? keysOrOptions : void 0;
          options = options || (keys2 ? void 0 : keysOrOptions);
          var wantResults = options ? options.allKeys : void 0;
          return this._trans("readwrite", function(trans) {
            var _a2 = _this.schema.primKey, auto = _a2.auto, keyPath = _a2.keyPath;
            if (keyPath && keys2)
              throw new exceptions.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
            if (keys2 && keys2.length !== objects.length)
              throw new exceptions.InvalidArgument("Arguments objects and keys must have the same length");
            var numObjects = objects.length;
            var objectsToPut = keyPath && auto ? objects.map(workaroundForUndefinedPrimKey(keyPath)) : objects;
            return _this.core.mutate({ trans, type: "put", keys: keys2, values: objectsToPut, wantResults }).then(function(_a3) {
              var numFailures = _a3.numFailures, results = _a3.results, lastResult = _a3.lastResult, failures = _a3.failures;
              var result = wantResults ? results : lastResult;
              if (numFailures === 0)
                return result;
              throw new BulkError("".concat(_this.name, ".bulkPut(): ").concat(numFailures, " of ").concat(numObjects, " operations failed"), failures);
            });
          });
        };
        Table2.prototype.bulkUpdate = function(keysAndChanges) {
          var _this = this;
          var coreTable = this.core;
          var keys2 = keysAndChanges.map(function(entry) {
            return entry.key;
          });
          var changeSpecs = keysAndChanges.map(function(entry) {
            return entry.changes;
          });
          var offsetMap = [];
          return this._trans("readwrite", function(trans) {
            return coreTable.getMany({ trans, keys: keys2, cache: "clone" }).then(function(objs) {
              var resultKeys = [];
              var resultObjs = [];
              keysAndChanges.forEach(function(_a2, idx) {
                var key = _a2.key, changes = _a2.changes;
                var obj = objs[idx];
                if (obj) {
                  for (var _i = 0, _b = Object.keys(changes); _i < _b.length; _i++) {
                    var keyPath = _b[_i];
                    var value = changes[keyPath];
                    if (keyPath === _this.schema.primKey.keyPath) {
                      if (cmp2(value, key) !== 0) {
                        throw new exceptions.Constraint("Cannot update primary key in bulkUpdate()");
                      }
                    } else {
                      setByKeyPath(obj, keyPath, value);
                    }
                  }
                  offsetMap.push(idx);
                  resultKeys.push(key);
                  resultObjs.push(obj);
                }
              });
              var numEntries = resultKeys.length;
              return coreTable.mutate({
                trans,
                type: "put",
                keys: resultKeys,
                values: resultObjs,
                updates: {
                  keys: keys2,
                  changeSpecs
                }
              }).then(function(_a2) {
                var numFailures = _a2.numFailures, failures = _a2.failures;
                if (numFailures === 0)
                  return numEntries;
                for (var _i = 0, _b = Object.keys(failures); _i < _b.length; _i++) {
                  var offset = _b[_i];
                  var mappedOffset = offsetMap[Number(offset)];
                  if (mappedOffset != null) {
                    var failure = failures[offset];
                    delete failures[offset];
                    failures[mappedOffset] = failure;
                  }
                }
                throw new BulkError("".concat(_this.name, ".bulkUpdate(): ").concat(numFailures, " of ").concat(numEntries, " operations failed"), failures);
              });
            });
          });
        };
        Table2.prototype.bulkDelete = function(keys2) {
          var _this = this;
          var numKeys = keys2.length;
          return this._trans("readwrite", function(trans) {
            return _this.core.mutate({ trans, type: "delete", keys: keys2 });
          }).then(function(_a2) {
            var numFailures = _a2.numFailures, lastResult = _a2.lastResult, failures = _a2.failures;
            if (numFailures === 0)
              return lastResult;
            throw new BulkError("".concat(_this.name, ".bulkDelete(): ").concat(numFailures, " of ").concat(numKeys, " operations failed"), failures);
          });
        };
        return Table2;
      }();
      function Events(ctx) {
        var evs = {};
        var rv = function(eventName, subscriber) {
          if (subscriber) {
            var i2 = arguments.length, args = new Array(i2 - 1);
            while (--i2)
              args[i2 - 1] = arguments[i2];
            evs[eventName].subscribe.apply(null, args);
            return ctx;
          } else if (typeof eventName === "string") {
            return evs[eventName];
          }
        };
        rv.addEventType = add3;
        for (var i = 1, l = arguments.length; i < l; ++i) {
          add3(arguments[i]);
        }
        return rv;
        function add3(eventName, chainFunction, defaultFunction) {
          if (typeof eventName === "object")
            return addConfiguredEvents(eventName);
          if (!chainFunction)
            chainFunction = reverseStoppableEventChain;
          if (!defaultFunction)
            defaultFunction = nop;
          var context = {
            subscribers: [],
            fire: defaultFunction,
            subscribe: function(cb) {
              if (context.subscribers.indexOf(cb) === -1) {
                context.subscribers.push(cb);
                context.fire = chainFunction(context.fire, cb);
              }
            },
            unsubscribe: function(cb) {
              context.subscribers = context.subscribers.filter(function(fn) {
                return fn !== cb;
              });
              context.fire = context.subscribers.reduce(chainFunction, defaultFunction);
            }
          };
          evs[eventName] = rv[eventName] = context;
          return context;
        }
        function addConfiguredEvents(cfg) {
          keys(cfg).forEach(function(eventName) {
            var args = cfg[eventName];
            if (isArray(args)) {
              add3(eventName, cfg[eventName][0], cfg[eventName][1]);
            } else if (args === "asap") {
              var context = add3(eventName, mirror, function fire() {
                var i2 = arguments.length, args2 = new Array(i2);
                while (i2--)
                  args2[i2] = arguments[i2];
                context.subscribers.forEach(function(fn) {
                  asap$1(function fireEvent() {
                    fn.apply(null, args2);
                  });
                });
              });
            } else
              throw new exceptions.InvalidArgument("Invalid event config");
          });
        }
      }
      function makeClassConstructor(prototype, constructor) {
        derive(constructor).from({ prototype });
        return constructor;
      }
      function createTableConstructor(db) {
        return makeClassConstructor(Table.prototype, function Table2(name, tableSchema, trans) {
          this.db = db;
          this._tx = trans;
          this.name = name;
          this.schema = tableSchema;
          this.hook = db._allTables[name] ? db._allTables[name].hook : Events(null, {
            "creating": [hookCreatingChain, nop],
            "reading": [pureFunctionChain, mirror],
            "updating": [hookUpdatingChain, nop],
            "deleting": [hookDeletingChain, nop]
          });
        });
      }
      function isPlainKeyRange(ctx, ignoreLimitFilter) {
        return !(ctx.filter || ctx.algorithm || ctx.or) && (ignoreLimitFilter ? ctx.justLimit : !ctx.replayFilter);
      }
      function addFilter(ctx, fn) {
        ctx.filter = combine(ctx.filter, fn);
      }
      function addReplayFilter(ctx, factory, isLimitFilter) {
        var curr = ctx.replayFilter;
        ctx.replayFilter = curr ? function() {
          return combine(curr(), factory());
        } : factory;
        ctx.justLimit = isLimitFilter && !curr;
      }
      function addMatchFilter(ctx, fn) {
        ctx.isMatch = combine(ctx.isMatch, fn);
      }
      function getIndexOrStore(ctx, coreSchema) {
        if (ctx.isPrimKey)
          return coreSchema.primaryKey;
        var index = coreSchema.getIndexByKeyPath(ctx.index);
        if (!index)
          throw new exceptions.Schema("KeyPath " + ctx.index + " on object store " + coreSchema.name + " is not indexed");
        return index;
      }
      function openCursor(ctx, coreTable, trans) {
        var index = getIndexOrStore(ctx, coreTable.schema);
        return coreTable.openCursor({
          trans,
          values: !ctx.keysOnly,
          reverse: ctx.dir === "prev",
          unique: !!ctx.unique,
          query: {
            index,
            range: ctx.range
          }
        });
      }
      function iter(ctx, fn, coreTrans, coreTable) {
        var filter = ctx.replayFilter ? combine(ctx.filter, ctx.replayFilter()) : ctx.filter;
        if (!ctx.or) {
          return iterate(openCursor(ctx, coreTable, coreTrans), combine(ctx.algorithm, filter), fn, !ctx.keysOnly && ctx.valueMapper);
        } else {
          var set_1 = {};
          var union = function(item, cursor, advance) {
            if (!filter || filter(cursor, advance, function(result) {
              return cursor.stop(result);
            }, function(err) {
              return cursor.fail(err);
            })) {
              var primaryKey = cursor.primaryKey;
              var key = "" + primaryKey;
              if (key === "[object ArrayBuffer]")
                key = "" + new Uint8Array(primaryKey);
              if (!hasOwn(set_1, key)) {
                set_1[key] = true;
                fn(item, cursor, advance);
              }
            }
          };
          return Promise.all([
            ctx.or._iterate(union, coreTrans),
            iterate(openCursor(ctx, coreTable, coreTrans), ctx.algorithm, union, !ctx.keysOnly && ctx.valueMapper)
          ]);
        }
      }
      function iterate(cursorPromise, filter, fn, valueMapper) {
        var mappedFn = valueMapper ? function(x, c, a) {
          return fn(valueMapper(x), c, a);
        } : fn;
        var wrappedFn = wrap(mappedFn);
        return cursorPromise.then(function(cursor) {
          if (cursor) {
            return cursor.start(function() {
              var c = function() {
                return cursor.continue();
              };
              if (!filter || filter(cursor, function(advancer) {
                return c = advancer;
              }, function(val) {
                cursor.stop(val);
                c = nop;
              }, function(e) {
                cursor.fail(e);
                c = nop;
              }))
                wrappedFn(cursor.value, cursor, function(advancer) {
                  return c = advancer;
                });
              c();
            });
          }
        });
      }
      var PropModification2 = function() {
        function PropModification3(spec) {
          this["@@propmod"] = spec;
        }
        PropModification3.prototype.execute = function(value) {
          var _a2;
          var spec = this["@@propmod"];
          if (spec.add !== void 0) {
            var term = spec.add;
            if (isArray(term)) {
              return __spreadArray(__spreadArray([], isArray(value) ? value : [], true), term, true).sort();
            }
            if (typeof term === "number")
              return (Number(value) || 0) + term;
            if (typeof term === "bigint") {
              try {
                return BigInt(value) + term;
              } catch (_b) {
                return BigInt(0) + term;
              }
            }
            throw new TypeError("Invalid term ".concat(term));
          }
          if (spec.remove !== void 0) {
            var subtrahend_1 = spec.remove;
            if (isArray(subtrahend_1)) {
              return isArray(value) ? value.filter(function(item) {
                return !subtrahend_1.includes(item);
              }).sort() : [];
            }
            if (typeof subtrahend_1 === "number")
              return Number(value) - subtrahend_1;
            if (typeof subtrahend_1 === "bigint") {
              try {
                return BigInt(value) - subtrahend_1;
              } catch (_c) {
                return BigInt(0) - subtrahend_1;
              }
            }
            throw new TypeError("Invalid subtrahend ".concat(subtrahend_1));
          }
          var prefixToReplace = (_a2 = spec.replacePrefix) === null || _a2 === void 0 ? void 0 : _a2[0];
          if (prefixToReplace && typeof value === "string" && value.startsWith(prefixToReplace)) {
            return spec.replacePrefix[1] + value.substring(prefixToReplace.length);
          }
          return value;
        };
        return PropModification3;
      }();
      var Collection = function() {
        function Collection2() {
        }
        Collection2.prototype._read = function(fn, cb) {
          var ctx = this._ctx;
          return ctx.error ? ctx.table._trans(null, rejection.bind(null, ctx.error)) : ctx.table._trans("readonly", fn).then(cb);
        };
        Collection2.prototype._write = function(fn) {
          var ctx = this._ctx;
          return ctx.error ? ctx.table._trans(null, rejection.bind(null, ctx.error)) : ctx.table._trans("readwrite", fn, "locked");
        };
        Collection2.prototype._addAlgorithm = function(fn) {
          var ctx = this._ctx;
          ctx.algorithm = combine(ctx.algorithm, fn);
        };
        Collection2.prototype._iterate = function(fn, coreTrans) {
          return iter(this._ctx, fn, coreTrans, this._ctx.table.core);
        };
        Collection2.prototype.clone = function(props2) {
          var rv = Object.create(this.constructor.prototype), ctx = Object.create(this._ctx);
          if (props2)
            extend(ctx, props2);
          rv._ctx = ctx;
          return rv;
        };
        Collection2.prototype.raw = function() {
          this._ctx.valueMapper = null;
          return this;
        };
        Collection2.prototype.each = function(fn) {
          var ctx = this._ctx;
          return this._read(function(trans) {
            return iter(ctx, fn, trans, ctx.table.core);
          });
        };
        Collection2.prototype.count = function(cb) {
          var _this = this;
          return this._read(function(trans) {
            var ctx = _this._ctx;
            var coreTable = ctx.table.core;
            if (isPlainKeyRange(ctx, true)) {
              return coreTable.count({
                trans,
                query: {
                  index: getIndexOrStore(ctx, coreTable.schema),
                  range: ctx.range
                }
              }).then(function(count2) {
                return Math.min(count2, ctx.limit);
              });
            } else {
              var count = 0;
              return iter(ctx, function() {
                ++count;
                return false;
              }, trans, coreTable).then(function() {
                return count;
              });
            }
          }).then(cb);
        };
        Collection2.prototype.sortBy = function(keyPath, cb) {
          var parts = keyPath.split(".").reverse(), lastPart = parts[0], lastIndex = parts.length - 1;
          function getval(obj, i) {
            if (i)
              return getval(obj[parts[i]], i - 1);
            return obj[lastPart];
          }
          var order = this._ctx.dir === "next" ? 1 : -1;
          function sorter(a, b) {
            var aVal = getval(a, lastIndex), bVal = getval(b, lastIndex);
            return cmp2(aVal, bVal) * order;
          }
          return this.toArray(function(a) {
            return a.sort(sorter);
          }).then(cb);
        };
        Collection2.prototype.toArray = function(cb) {
          var _this = this;
          return this._read(function(trans) {
            var ctx = _this._ctx;
            if (ctx.dir === "next" && isPlainKeyRange(ctx, true) && ctx.limit > 0) {
              var valueMapper_1 = ctx.valueMapper;
              var index = getIndexOrStore(ctx, ctx.table.core.schema);
              return ctx.table.core.query({
                trans,
                limit: ctx.limit,
                values: true,
                query: {
                  index,
                  range: ctx.range
                }
              }).then(function(_a2) {
                var result = _a2.result;
                return valueMapper_1 ? result.map(valueMapper_1) : result;
              });
            } else {
              var a_1 = [];
              return iter(ctx, function(item) {
                return a_1.push(item);
              }, trans, ctx.table.core).then(function() {
                return a_1;
              });
            }
          }, cb);
        };
        Collection2.prototype.offset = function(offset) {
          var ctx = this._ctx;
          if (offset <= 0)
            return this;
          ctx.offset += offset;
          if (isPlainKeyRange(ctx)) {
            addReplayFilter(ctx, function() {
              var offsetLeft = offset;
              return function(cursor, advance) {
                if (offsetLeft === 0)
                  return true;
                if (offsetLeft === 1) {
                  --offsetLeft;
                  return false;
                }
                advance(function() {
                  cursor.advance(offsetLeft);
                  offsetLeft = 0;
                });
                return false;
              };
            });
          } else {
            addReplayFilter(ctx, function() {
              var offsetLeft = offset;
              return function() {
                return --offsetLeft < 0;
              };
            });
          }
          return this;
        };
        Collection2.prototype.limit = function(numRows) {
          this._ctx.limit = Math.min(this._ctx.limit, numRows);
          addReplayFilter(this._ctx, function() {
            var rowsLeft = numRows;
            return function(cursor, advance, resolve) {
              if (--rowsLeft <= 0)
                advance(resolve);
              return rowsLeft >= 0;
            };
          }, true);
          return this;
        };
        Collection2.prototype.until = function(filterFunction, bIncludeStopEntry) {
          addFilter(this._ctx, function(cursor, advance, resolve) {
            if (filterFunction(cursor.value)) {
              advance(resolve);
              return bIncludeStopEntry;
            } else {
              return true;
            }
          });
          return this;
        };
        Collection2.prototype.first = function(cb) {
          return this.limit(1).toArray(function(a) {
            return a[0];
          }).then(cb);
        };
        Collection2.prototype.last = function(cb) {
          return this.reverse().first(cb);
        };
        Collection2.prototype.filter = function(filterFunction) {
          addFilter(this._ctx, function(cursor) {
            return filterFunction(cursor.value);
          });
          addMatchFilter(this._ctx, filterFunction);
          return this;
        };
        Collection2.prototype.and = function(filter) {
          return this.filter(filter);
        };
        Collection2.prototype.or = function(indexName) {
          return new this.db.WhereClause(this._ctx.table, indexName, this);
        };
        Collection2.prototype.reverse = function() {
          this._ctx.dir = this._ctx.dir === "prev" ? "next" : "prev";
          if (this._ondirectionchange)
            this._ondirectionchange(this._ctx.dir);
          return this;
        };
        Collection2.prototype.desc = function() {
          return this.reverse();
        };
        Collection2.prototype.eachKey = function(cb) {
          var ctx = this._ctx;
          ctx.keysOnly = !ctx.isMatch;
          return this.each(function(val, cursor) {
            cb(cursor.key, cursor);
          });
        };
        Collection2.prototype.eachUniqueKey = function(cb) {
          this._ctx.unique = "unique";
          return this.eachKey(cb);
        };
        Collection2.prototype.eachPrimaryKey = function(cb) {
          var ctx = this._ctx;
          ctx.keysOnly = !ctx.isMatch;
          return this.each(function(val, cursor) {
            cb(cursor.primaryKey, cursor);
          });
        };
        Collection2.prototype.keys = function(cb) {
          var ctx = this._ctx;
          ctx.keysOnly = !ctx.isMatch;
          var a = [];
          return this.each(function(item, cursor) {
            a.push(cursor.key);
          }).then(function() {
            return a;
          }).then(cb);
        };
        Collection2.prototype.primaryKeys = function(cb) {
          var ctx = this._ctx;
          if (ctx.dir === "next" && isPlainKeyRange(ctx, true) && ctx.limit > 0) {
            return this._read(function(trans) {
              var index = getIndexOrStore(ctx, ctx.table.core.schema);
              return ctx.table.core.query({
                trans,
                values: false,
                limit: ctx.limit,
                query: {
                  index,
                  range: ctx.range
                }
              });
            }).then(function(_a2) {
              var result = _a2.result;
              return result;
            }).then(cb);
          }
          ctx.keysOnly = !ctx.isMatch;
          var a = [];
          return this.each(function(item, cursor) {
            a.push(cursor.primaryKey);
          }).then(function() {
            return a;
          }).then(cb);
        };
        Collection2.prototype.uniqueKeys = function(cb) {
          this._ctx.unique = "unique";
          return this.keys(cb);
        };
        Collection2.prototype.firstKey = function(cb) {
          return this.limit(1).keys(function(a) {
            return a[0];
          }).then(cb);
        };
        Collection2.prototype.lastKey = function(cb) {
          return this.reverse().firstKey(cb);
        };
        Collection2.prototype.distinct = function() {
          var ctx = this._ctx, idx = ctx.index && ctx.table.schema.idxByName[ctx.index];
          if (!idx || !idx.multi)
            return this;
          var set = {};
          addFilter(this._ctx, function(cursor) {
            var strKey = cursor.primaryKey.toString();
            var found = hasOwn(set, strKey);
            set[strKey] = true;
            return !found;
          });
          return this;
        };
        Collection2.prototype.modify = function(changes) {
          var _this = this;
          var ctx = this._ctx;
          return this._write(function(trans) {
            var modifyer;
            if (typeof changes === "function") {
              modifyer = changes;
            } else {
              var keyPaths = keys(changes);
              var numKeys = keyPaths.length;
              modifyer = function(item) {
                var anythingModified = false;
                for (var i = 0; i < numKeys; ++i) {
                  var keyPath = keyPaths[i];
                  var val = changes[keyPath];
                  var origVal = getByKeyPath(item, keyPath);
                  if (val instanceof PropModification2) {
                    setByKeyPath(item, keyPath, val.execute(origVal));
                    anythingModified = true;
                  } else if (origVal !== val) {
                    setByKeyPath(item, keyPath, val);
                    anythingModified = true;
                  }
                }
                return anythingModified;
              };
            }
            var coreTable = ctx.table.core;
            var _a2 = coreTable.schema.primaryKey, outbound = _a2.outbound, extractKey = _a2.extractKey;
            var limit = 200;
            var modifyChunkSize = _this.db._options.modifyChunkSize;
            if (modifyChunkSize) {
              if (typeof modifyChunkSize == "object") {
                limit = modifyChunkSize[coreTable.name] || modifyChunkSize["*"] || 200;
              } else {
                limit = modifyChunkSize;
              }
            }
            var totalFailures = [];
            var successCount = 0;
            var failedKeys = [];
            var applyMutateResult = function(expectedCount, res) {
              var failures = res.failures, numFailures = res.numFailures;
              successCount += expectedCount - numFailures;
              for (var _i = 0, _a3 = keys(failures); _i < _a3.length; _i++) {
                var pos = _a3[_i];
                totalFailures.push(failures[pos]);
              }
            };
            return _this.clone().primaryKeys().then(function(keys2) {
              var criteria = isPlainKeyRange(ctx) && ctx.limit === Infinity && (typeof changes !== "function" || changes === deleteCallback) && {
                index: ctx.index,
                range: ctx.range
              };
              var nextChunk = function(offset) {
                var count = Math.min(limit, keys2.length - offset);
                return coreTable.getMany({
                  trans,
                  keys: keys2.slice(offset, offset + count),
                  cache: "immutable"
                }).then(function(values) {
                  var addValues = [];
                  var putValues = [];
                  var putKeys = outbound ? [] : null;
                  var deleteKeys = [];
                  for (var i = 0; i < count; ++i) {
                    var origValue = values[i];
                    var ctx_1 = {
                      value: deepClone(origValue),
                      primKey: keys2[offset + i]
                    };
                    if (modifyer.call(ctx_1, ctx_1.value, ctx_1) !== false) {
                      if (ctx_1.value == null) {
                        deleteKeys.push(keys2[offset + i]);
                      } else if (!outbound && cmp2(extractKey(origValue), extractKey(ctx_1.value)) !== 0) {
                        deleteKeys.push(keys2[offset + i]);
                        addValues.push(ctx_1.value);
                      } else {
                        putValues.push(ctx_1.value);
                        if (outbound)
                          putKeys.push(keys2[offset + i]);
                      }
                    }
                  }
                  return Promise.resolve(addValues.length > 0 && coreTable.mutate({ trans, type: "add", values: addValues }).then(function(res) {
                    for (var pos in res.failures) {
                      deleteKeys.splice(parseInt(pos), 1);
                    }
                    applyMutateResult(addValues.length, res);
                  })).then(function() {
                    return (putValues.length > 0 || criteria && typeof changes === "object") && coreTable.mutate({
                      trans,
                      type: "put",
                      keys: putKeys,
                      values: putValues,
                      criteria,
                      changeSpec: typeof changes !== "function" && changes,
                      isAdditionalChunk: offset > 0
                    }).then(function(res) {
                      return applyMutateResult(putValues.length, res);
                    });
                  }).then(function() {
                    return (deleteKeys.length > 0 || criteria && changes === deleteCallback) && coreTable.mutate({
                      trans,
                      type: "delete",
                      keys: deleteKeys,
                      criteria,
                      isAdditionalChunk: offset > 0
                    }).then(function(res) {
                      return applyMutateResult(deleteKeys.length, res);
                    });
                  }).then(function() {
                    return keys2.length > offset + count && nextChunk(offset + limit);
                  });
                });
              };
              return nextChunk(0).then(function() {
                if (totalFailures.length > 0)
                  throw new ModifyError("Error modifying one or more objects", totalFailures, successCount, failedKeys);
                return keys2.length;
              });
            });
          });
        };
        Collection2.prototype.delete = function() {
          var ctx = this._ctx, range = ctx.range;
          if (isPlainKeyRange(ctx) && (ctx.isPrimKey || range.type === 3)) {
            return this._write(function(trans) {
              var primaryKey = ctx.table.core.schema.primaryKey;
              var coreRange = range;
              return ctx.table.core.count({ trans, query: { index: primaryKey, range: coreRange } }).then(function(count) {
                return ctx.table.core.mutate({ trans, type: "deleteRange", range: coreRange }).then(function(_a2) {
                  var failures = _a2.failures;
                  _a2.lastResult;
                  _a2.results;
                  var numFailures = _a2.numFailures;
                  if (numFailures)
                    throw new ModifyError("Could not delete some values", Object.keys(failures).map(function(pos) {
                      return failures[pos];
                    }), count - numFailures);
                  return count - numFailures;
                });
              });
            });
          }
          return this.modify(deleteCallback);
        };
        return Collection2;
      }();
      var deleteCallback = function(value, ctx) {
        return ctx.value = null;
      };
      function createCollectionConstructor(db) {
        return makeClassConstructor(Collection.prototype, function Collection2(whereClause, keyRangeGenerator) {
          this.db = db;
          var keyRange = AnyRange, error = null;
          if (keyRangeGenerator)
            try {
              keyRange = keyRangeGenerator();
            } catch (ex) {
              error = ex;
            }
          var whereCtx = whereClause._ctx;
          var table = whereCtx.table;
          var readingHook = table.hook.reading.fire;
          this._ctx = {
            table,
            index: whereCtx.index,
            isPrimKey: !whereCtx.index || table.schema.primKey.keyPath && whereCtx.index === table.schema.primKey.name,
            range: keyRange,
            keysOnly: false,
            dir: "next",
            unique: "",
            algorithm: null,
            filter: null,
            replayFilter: null,
            justLimit: true,
            isMatch: null,
            offset: 0,
            limit: Infinity,
            error,
            or: whereCtx.or,
            valueMapper: readingHook !== mirror ? readingHook : null
          };
        });
      }
      function simpleCompare(a, b) {
        return a < b ? -1 : a === b ? 0 : 1;
      }
      function simpleCompareReverse(a, b) {
        return a > b ? -1 : a === b ? 0 : 1;
      }
      function fail(collectionOrWhereClause, err, T) {
        var collection = collectionOrWhereClause instanceof WhereClause ? new collectionOrWhereClause.Collection(collectionOrWhereClause) : collectionOrWhereClause;
        collection._ctx.error = T ? new T(err) : new TypeError(err);
        return collection;
      }
      function emptyCollection(whereClause) {
        return new whereClause.Collection(whereClause, function() {
          return rangeEqual("");
        }).limit(0);
      }
      function upperFactory(dir) {
        return dir === "next" ? function(s) {
          return s.toUpperCase();
        } : function(s) {
          return s.toLowerCase();
        };
      }
      function lowerFactory(dir) {
        return dir === "next" ? function(s) {
          return s.toLowerCase();
        } : function(s) {
          return s.toUpperCase();
        };
      }
      function nextCasing(key, lowerKey, upperNeedle, lowerNeedle, cmp3, dir) {
        var length = Math.min(key.length, lowerNeedle.length);
        var llp = -1;
        for (var i = 0; i < length; ++i) {
          var lwrKeyChar = lowerKey[i];
          if (lwrKeyChar !== lowerNeedle[i]) {
            if (cmp3(key[i], upperNeedle[i]) < 0)
              return key.substr(0, i) + upperNeedle[i] + upperNeedle.substr(i + 1);
            if (cmp3(key[i], lowerNeedle[i]) < 0)
              return key.substr(0, i) + lowerNeedle[i] + upperNeedle.substr(i + 1);
            if (llp >= 0)
              return key.substr(0, llp) + lowerKey[llp] + upperNeedle.substr(llp + 1);
            return null;
          }
          if (cmp3(key[i], lwrKeyChar) < 0)
            llp = i;
        }
        if (length < lowerNeedle.length && dir === "next")
          return key + upperNeedle.substr(key.length);
        if (length < key.length && dir === "prev")
          return key.substr(0, upperNeedle.length);
        return llp < 0 ? null : key.substr(0, llp) + lowerNeedle[llp] + upperNeedle.substr(llp + 1);
      }
      function addIgnoreCaseAlgorithm(whereClause, match, needles, suffix) {
        var upper, lower, compare, upperNeedles, lowerNeedles, direction, nextKeySuffix, needlesLen = needles.length;
        if (!needles.every(function(s) {
          return typeof s === "string";
        })) {
          return fail(whereClause, STRING_EXPECTED);
        }
        function initDirection(dir) {
          upper = upperFactory(dir);
          lower = lowerFactory(dir);
          compare = dir === "next" ? simpleCompare : simpleCompareReverse;
          var needleBounds = needles.map(function(needle) {
            return { lower: lower(needle), upper: upper(needle) };
          }).sort(function(a, b) {
            return compare(a.lower, b.lower);
          });
          upperNeedles = needleBounds.map(function(nb) {
            return nb.upper;
          });
          lowerNeedles = needleBounds.map(function(nb) {
            return nb.lower;
          });
          direction = dir;
          nextKeySuffix = dir === "next" ? "" : suffix;
        }
        initDirection("next");
        var c = new whereClause.Collection(whereClause, function() {
          return createRange(upperNeedles[0], lowerNeedles[needlesLen - 1] + suffix);
        });
        c._ondirectionchange = function(direction2) {
          initDirection(direction2);
        };
        var firstPossibleNeedle = 0;
        c._addAlgorithm(function(cursor, advance, resolve) {
          var key = cursor.key;
          if (typeof key !== "string")
            return false;
          var lowerKey = lower(key);
          if (match(lowerKey, lowerNeedles, firstPossibleNeedle)) {
            return true;
          } else {
            var lowestPossibleCasing = null;
            for (var i = firstPossibleNeedle; i < needlesLen; ++i) {
              var casing = nextCasing(key, lowerKey, upperNeedles[i], lowerNeedles[i], compare, direction);
              if (casing === null && lowestPossibleCasing === null)
                firstPossibleNeedle = i + 1;
              else if (lowestPossibleCasing === null || compare(lowestPossibleCasing, casing) > 0) {
                lowestPossibleCasing = casing;
              }
            }
            if (lowestPossibleCasing !== null) {
              advance(function() {
                cursor.continue(lowestPossibleCasing + nextKeySuffix);
              });
            } else {
              advance(resolve);
            }
            return false;
          }
        });
        return c;
      }
      function createRange(lower, upper, lowerOpen, upperOpen) {
        return {
          type: 2,
          lower,
          upper,
          lowerOpen,
          upperOpen
        };
      }
      function rangeEqual(value) {
        return {
          type: 1,
          lower: value,
          upper: value
        };
      }
      var WhereClause = function() {
        function WhereClause2() {
        }
        Object.defineProperty(WhereClause2.prototype, "Collection", {
          get: function() {
            return this._ctx.table.db.Collection;
          },
          enumerable: false,
          configurable: true
        });
        WhereClause2.prototype.between = function(lower, upper, includeLower, includeUpper) {
          includeLower = includeLower !== false;
          includeUpper = includeUpper === true;
          try {
            if (this._cmp(lower, upper) > 0 || this._cmp(lower, upper) === 0 && (includeLower || includeUpper) && !(includeLower && includeUpper))
              return emptyCollection(this);
            return new this.Collection(this, function() {
              return createRange(lower, upper, !includeLower, !includeUpper);
            });
          } catch (e) {
            return fail(this, INVALID_KEY_ARGUMENT);
          }
        };
        WhereClause2.prototype.equals = function(value) {
          if (value == null)
            return fail(this, INVALID_KEY_ARGUMENT);
          return new this.Collection(this, function() {
            return rangeEqual(value);
          });
        };
        WhereClause2.prototype.above = function(value) {
          if (value == null)
            return fail(this, INVALID_KEY_ARGUMENT);
          return new this.Collection(this, function() {
            return createRange(value, void 0, true);
          });
        };
        WhereClause2.prototype.aboveOrEqual = function(value) {
          if (value == null)
            return fail(this, INVALID_KEY_ARGUMENT);
          return new this.Collection(this, function() {
            return createRange(value, void 0, false);
          });
        };
        WhereClause2.prototype.below = function(value) {
          if (value == null)
            return fail(this, INVALID_KEY_ARGUMENT);
          return new this.Collection(this, function() {
            return createRange(void 0, value, false, true);
          });
        };
        WhereClause2.prototype.belowOrEqual = function(value) {
          if (value == null)
            return fail(this, INVALID_KEY_ARGUMENT);
          return new this.Collection(this, function() {
            return createRange(void 0, value);
          });
        };
        WhereClause2.prototype.startsWith = function(str) {
          if (typeof str !== "string")
            return fail(this, STRING_EXPECTED);
          return this.between(str, str + maxString, true, true);
        };
        WhereClause2.prototype.startsWithIgnoreCase = function(str) {
          if (str === "")
            return this.startsWith(str);
          return addIgnoreCaseAlgorithm(this, function(x, a) {
            return x.indexOf(a[0]) === 0;
          }, [str], maxString);
        };
        WhereClause2.prototype.equalsIgnoreCase = function(str) {
          return addIgnoreCaseAlgorithm(this, function(x, a) {
            return x === a[0];
          }, [str], "");
        };
        WhereClause2.prototype.anyOfIgnoreCase = function() {
          var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
          if (set.length === 0)
            return emptyCollection(this);
          return addIgnoreCaseAlgorithm(this, function(x, a) {
            return a.indexOf(x) !== -1;
          }, set, "");
        };
        WhereClause2.prototype.startsWithAnyOfIgnoreCase = function() {
          var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
          if (set.length === 0)
            return emptyCollection(this);
          return addIgnoreCaseAlgorithm(this, function(x, a) {
            return a.some(function(n) {
              return x.indexOf(n) === 0;
            });
          }, set, maxString);
        };
        WhereClause2.prototype.anyOf = function() {
          var _this = this;
          var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
          var compare = this._cmp;
          try {
            set.sort(compare);
          } catch (e) {
            return fail(this, INVALID_KEY_ARGUMENT);
          }
          if (set.length === 0)
            return emptyCollection(this);
          var c = new this.Collection(this, function() {
            return createRange(set[0], set[set.length - 1]);
          });
          c._ondirectionchange = function(direction) {
            compare = direction === "next" ? _this._ascending : _this._descending;
            set.sort(compare);
          };
          var i = 0;
          c._addAlgorithm(function(cursor, advance, resolve) {
            var key = cursor.key;
            while (compare(key, set[i]) > 0) {
              ++i;
              if (i === set.length) {
                advance(resolve);
                return false;
              }
            }
            if (compare(key, set[i]) === 0) {
              return true;
            } else {
              advance(function() {
                cursor.continue(set[i]);
              });
              return false;
            }
          });
          return c;
        };
        WhereClause2.prototype.notEqual = function(value) {
          return this.inAnyRange([[minKey, value], [value, this.db._maxKey]], { includeLowers: false, includeUppers: false });
        };
        WhereClause2.prototype.noneOf = function() {
          var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
          if (set.length === 0)
            return new this.Collection(this);
          try {
            set.sort(this._ascending);
          } catch (e) {
            return fail(this, INVALID_KEY_ARGUMENT);
          }
          var ranges = set.reduce(function(res, val) {
            return res ? res.concat([[res[res.length - 1][1], val]]) : [[minKey, val]];
          }, null);
          ranges.push([set[set.length - 1], this.db._maxKey]);
          return this.inAnyRange(ranges, { includeLowers: false, includeUppers: false });
        };
        WhereClause2.prototype.inAnyRange = function(ranges, options) {
          var _this = this;
          var cmp3 = this._cmp, ascending = this._ascending, descending = this._descending, min = this._min, max = this._max;
          if (ranges.length === 0)
            return emptyCollection(this);
          if (!ranges.every(function(range) {
            return range[0] !== void 0 && range[1] !== void 0 && ascending(range[0], range[1]) <= 0;
          })) {
            return fail(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", exceptions.InvalidArgument);
          }
          var includeLowers = !options || options.includeLowers !== false;
          var includeUppers = options && options.includeUppers === true;
          function addRange2(ranges2, newRange) {
            var i = 0, l = ranges2.length;
            for (; i < l; ++i) {
              var range = ranges2[i];
              if (cmp3(newRange[0], range[1]) < 0 && cmp3(newRange[1], range[0]) > 0) {
                range[0] = min(range[0], newRange[0]);
                range[1] = max(range[1], newRange[1]);
                break;
              }
            }
            if (i === l)
              ranges2.push(newRange);
            return ranges2;
          }
          var sortDirection = ascending;
          function rangeSorter(a, b) {
            return sortDirection(a[0], b[0]);
          }
          var set;
          try {
            set = ranges.reduce(addRange2, []);
            set.sort(rangeSorter);
          } catch (ex) {
            return fail(this, INVALID_KEY_ARGUMENT);
          }
          var rangePos = 0;
          var keyIsBeyondCurrentEntry = includeUppers ? function(key) {
            return ascending(key, set[rangePos][1]) > 0;
          } : function(key) {
            return ascending(key, set[rangePos][1]) >= 0;
          };
          var keyIsBeforeCurrentEntry = includeLowers ? function(key) {
            return descending(key, set[rangePos][0]) > 0;
          } : function(key) {
            return descending(key, set[rangePos][0]) >= 0;
          };
          function keyWithinCurrentRange(key) {
            return !keyIsBeyondCurrentEntry(key) && !keyIsBeforeCurrentEntry(key);
          }
          var checkKey = keyIsBeyondCurrentEntry;
          var c = new this.Collection(this, function() {
            return createRange(set[0][0], set[set.length - 1][1], !includeLowers, !includeUppers);
          });
          c._ondirectionchange = function(direction) {
            if (direction === "next") {
              checkKey = keyIsBeyondCurrentEntry;
              sortDirection = ascending;
            } else {
              checkKey = keyIsBeforeCurrentEntry;
              sortDirection = descending;
            }
            set.sort(rangeSorter);
          };
          c._addAlgorithm(function(cursor, advance, resolve) {
            var key = cursor.key;
            while (checkKey(key)) {
              ++rangePos;
              if (rangePos === set.length) {
                advance(resolve);
                return false;
              }
            }
            if (keyWithinCurrentRange(key)) {
              return true;
            } else if (_this._cmp(key, set[rangePos][1]) === 0 || _this._cmp(key, set[rangePos][0]) === 0) {
              return false;
            } else {
              advance(function() {
                if (sortDirection === ascending)
                  cursor.continue(set[rangePos][0]);
                else
                  cursor.continue(set[rangePos][1]);
              });
              return false;
            }
          });
          return c;
        };
        WhereClause2.prototype.startsWithAnyOf = function() {
          var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
          if (!set.every(function(s) {
            return typeof s === "string";
          })) {
            return fail(this, "startsWithAnyOf() only works with strings");
          }
          if (set.length === 0)
            return emptyCollection(this);
          return this.inAnyRange(set.map(function(str) {
            return [str, str + maxString];
          }));
        };
        return WhereClause2;
      }();
      function createWhereClauseConstructor(db) {
        return makeClassConstructor(WhereClause.prototype, function WhereClause2(table, index, orCollection) {
          this.db = db;
          this._ctx = {
            table,
            index: index === ":id" ? null : index,
            or: orCollection
          };
          this._cmp = this._ascending = cmp2;
          this._descending = function(a, b) {
            return cmp2(b, a);
          };
          this._max = function(a, b) {
            return cmp2(a, b) > 0 ? a : b;
          };
          this._min = function(a, b) {
            return cmp2(a, b) < 0 ? a : b;
          };
          this._IDBKeyRange = db._deps.IDBKeyRange;
          if (!this._IDBKeyRange)
            throw new exceptions.MissingAPI();
        });
      }
      function eventRejectHandler(reject) {
        return wrap(function(event) {
          preventDefault(event);
          reject(event.target.error);
          return false;
        });
      }
      function preventDefault(event) {
        if (event.stopPropagation)
          event.stopPropagation();
        if (event.preventDefault)
          event.preventDefault();
      }
      var DEXIE_STORAGE_MUTATED_EVENT_NAME = "storagemutated";
      var STORAGE_MUTATED_DOM_EVENT_NAME = "x-storagemutated-1";
      var globalEvents = Events(null, DEXIE_STORAGE_MUTATED_EVENT_NAME);
      var Transaction = function() {
        function Transaction2() {
        }
        Transaction2.prototype._lock = function() {
          assert(!PSD.global);
          ++this._reculock;
          if (this._reculock === 1 && !PSD.global)
            PSD.lockOwnerFor = this;
          return this;
        };
        Transaction2.prototype._unlock = function() {
          assert(!PSD.global);
          if (--this._reculock === 0) {
            if (!PSD.global)
              PSD.lockOwnerFor = null;
            while (this._blockedFuncs.length > 0 && !this._locked()) {
              var fnAndPSD = this._blockedFuncs.shift();
              try {
                usePSD(fnAndPSD[1], fnAndPSD[0]);
              } catch (e) {
              }
            }
          }
          return this;
        };
        Transaction2.prototype._locked = function() {
          return this._reculock && PSD.lockOwnerFor !== this;
        };
        Transaction2.prototype.create = function(idbtrans) {
          var _this = this;
          if (!this.mode)
            return this;
          var idbdb = this.db.idbdb;
          var dbOpenError = this.db._state.dbOpenError;
          assert(!this.idbtrans);
          if (!idbtrans && !idbdb) {
            switch (dbOpenError && dbOpenError.name) {
              case "DatabaseClosedError":
                throw new exceptions.DatabaseClosed(dbOpenError);
              case "MissingAPIError":
                throw new exceptions.MissingAPI(dbOpenError.message, dbOpenError);
              default:
                throw new exceptions.OpenFailed(dbOpenError);
            }
          }
          if (!this.active)
            throw new exceptions.TransactionInactive();
          assert(this._completion._state === null);
          idbtrans = this.idbtrans = idbtrans || (this.db.core ? this.db.core.transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability }) : idbdb.transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability }));
          idbtrans.onerror = wrap(function(ev) {
            preventDefault(ev);
            _this._reject(idbtrans.error);
          });
          idbtrans.onabort = wrap(function(ev) {
            preventDefault(ev);
            _this.active && _this._reject(new exceptions.Abort(idbtrans.error));
            _this.active = false;
            _this.on("abort").fire(ev);
          });
          idbtrans.oncomplete = wrap(function() {
            _this.active = false;
            _this._resolve();
            if ("mutatedParts" in idbtrans) {
              globalEvents.storagemutated.fire(idbtrans["mutatedParts"]);
            }
          });
          return this;
        };
        Transaction2.prototype._promise = function(mode, fn, bWriteLock) {
          var _this = this;
          if (mode === "readwrite" && this.mode !== "readwrite")
            return rejection(new exceptions.ReadOnly("Transaction is readonly"));
          if (!this.active)
            return rejection(new exceptions.TransactionInactive());
          if (this._locked()) {
            return new DexiePromise(function(resolve, reject) {
              _this._blockedFuncs.push([function() {
                _this._promise(mode, fn, bWriteLock).then(resolve, reject);
              }, PSD]);
            });
          } else if (bWriteLock) {
            return newScope(function() {
              var p2 = new DexiePromise(function(resolve, reject) {
                _this._lock();
                var rv = fn(resolve, reject, _this);
                if (rv && rv.then)
                  rv.then(resolve, reject);
              });
              p2.finally(function() {
                return _this._unlock();
              });
              p2._lib = true;
              return p2;
            });
          } else {
            var p = new DexiePromise(function(resolve, reject) {
              var rv = fn(resolve, reject, _this);
              if (rv && rv.then)
                rv.then(resolve, reject);
            });
            p._lib = true;
            return p;
          }
        };
        Transaction2.prototype._root = function() {
          return this.parent ? this.parent._root() : this;
        };
        Transaction2.prototype.waitFor = function(promiseLike) {
          var root = this._root();
          var promise = DexiePromise.resolve(promiseLike);
          if (root._waitingFor) {
            root._waitingFor = root._waitingFor.then(function() {
              return promise;
            });
          } else {
            root._waitingFor = promise;
            root._waitingQueue = [];
            var store = root.idbtrans.objectStore(root.storeNames[0]);
            (function spin() {
              ++root._spinCount;
              while (root._waitingQueue.length)
                root._waitingQueue.shift()();
              if (root._waitingFor)
                store.get(-Infinity).onsuccess = spin;
            })();
          }
          var currentWaitPromise = root._waitingFor;
          return new DexiePromise(function(resolve, reject) {
            promise.then(function(res) {
              return root._waitingQueue.push(wrap(resolve.bind(null, res)));
            }, function(err) {
              return root._waitingQueue.push(wrap(reject.bind(null, err)));
            }).finally(function() {
              if (root._waitingFor === currentWaitPromise) {
                root._waitingFor = null;
              }
            });
          });
        };
        Transaction2.prototype.abort = function() {
          if (this.active) {
            this.active = false;
            if (this.idbtrans)
              this.idbtrans.abort();
            this._reject(new exceptions.Abort());
          }
        };
        Transaction2.prototype.table = function(tableName) {
          var memoizedTables = this._memoizedTables || (this._memoizedTables = {});
          if (hasOwn(memoizedTables, tableName))
            return memoizedTables[tableName];
          var tableSchema = this.schema[tableName];
          if (!tableSchema) {
            throw new exceptions.NotFound("Table " + tableName + " not part of transaction");
          }
          var transactionBoundTable = new this.db.Table(tableName, tableSchema, this);
          transactionBoundTable.core = this.db.core.table(tableName);
          memoizedTables[tableName] = transactionBoundTable;
          return transactionBoundTable;
        };
        return Transaction2;
      }();
      function createTransactionConstructor(db) {
        return makeClassConstructor(Transaction.prototype, function Transaction2(mode, storeNames, dbschema, chromeTransactionDurability, parent) {
          var _this = this;
          this.db = db;
          this.mode = mode;
          this.storeNames = storeNames;
          this.schema = dbschema;
          this.chromeTransactionDurability = chromeTransactionDurability;
          this.idbtrans = null;
          this.on = Events(this, "complete", "error", "abort");
          this.parent = parent || null;
          this.active = true;
          this._reculock = 0;
          this._blockedFuncs = [];
          this._resolve = null;
          this._reject = null;
          this._waitingFor = null;
          this._waitingQueue = null;
          this._spinCount = 0;
          this._completion = new DexiePromise(function(resolve, reject) {
            _this._resolve = resolve;
            _this._reject = reject;
          });
          this._completion.then(function() {
            _this.active = false;
            _this.on.complete.fire();
          }, function(e) {
            var wasActive = _this.active;
            _this.active = false;
            _this.on.error.fire(e);
            _this.parent ? _this.parent._reject(e) : wasActive && _this.idbtrans && _this.idbtrans.abort();
            return rejection(e);
          });
        });
      }
      function createIndexSpec(name, keyPath, unique, multi, auto, compound, isPrimKey) {
        return {
          name,
          keyPath,
          unique,
          multi,
          auto,
          compound,
          src: (unique && !isPrimKey ? "&" : "") + (multi ? "*" : "") + (auto ? "++" : "") + nameFromKeyPath(keyPath)
        };
      }
      function nameFromKeyPath(keyPath) {
        return typeof keyPath === "string" ? keyPath : keyPath ? "[" + [].join.call(keyPath, "+") + "]" : "";
      }
      function createTableSchema(name, primKey, indexes) {
        return {
          name,
          primKey,
          indexes,
          mappedClass: null,
          idxByName: arrayToObject(indexes, function(index) {
            return [index.name, index];
          })
        };
      }
      function safariMultiStoreFix(storeNames) {
        return storeNames.length === 1 ? storeNames[0] : storeNames;
      }
      var getMaxKey = function(IdbKeyRange) {
        try {
          IdbKeyRange.only([[]]);
          getMaxKey = function() {
            return [[]];
          };
          return [[]];
        } catch (e) {
          getMaxKey = function() {
            return maxString;
          };
          return maxString;
        }
      };
      function getKeyExtractor(keyPath) {
        if (keyPath == null) {
          return function() {
            return void 0;
          };
        } else if (typeof keyPath === "string") {
          return getSinglePathKeyExtractor(keyPath);
        } else {
          return function(obj) {
            return getByKeyPath(obj, keyPath);
          };
        }
      }
      function getSinglePathKeyExtractor(keyPath) {
        var split = keyPath.split(".");
        if (split.length === 1) {
          return function(obj) {
            return obj[keyPath];
          };
        } else {
          return function(obj) {
            return getByKeyPath(obj, keyPath);
          };
        }
      }
      function arrayify(arrayLike) {
        return [].slice.call(arrayLike);
      }
      var _id_counter = 0;
      function getKeyPathAlias(keyPath) {
        return keyPath == null ? ":id" : typeof keyPath === "string" ? keyPath : "[".concat(keyPath.join("+"), "]");
      }
      function createDBCore(db, IdbKeyRange, tmpTrans) {
        function extractSchema(db2, trans) {
          var tables2 = arrayify(db2.objectStoreNames);
          return {
            schema: {
              name: db2.name,
              tables: tables2.map(function(table) {
                return trans.objectStore(table);
              }).map(function(store) {
                var keyPath = store.keyPath, autoIncrement = store.autoIncrement;
                var compound = isArray(keyPath);
                var outbound = keyPath == null;
                var indexByKeyPath = {};
                var result = {
                  name: store.name,
                  primaryKey: {
                    name: null,
                    isPrimaryKey: true,
                    outbound,
                    compound,
                    keyPath,
                    autoIncrement,
                    unique: true,
                    extractKey: getKeyExtractor(keyPath)
                  },
                  indexes: arrayify(store.indexNames).map(function(indexName) {
                    return store.index(indexName);
                  }).map(function(index) {
                    var name = index.name, unique = index.unique, multiEntry = index.multiEntry, keyPath2 = index.keyPath;
                    var compound2 = isArray(keyPath2);
                    var result2 = {
                      name,
                      compound: compound2,
                      keyPath: keyPath2,
                      unique,
                      multiEntry,
                      extractKey: getKeyExtractor(keyPath2)
                    };
                    indexByKeyPath[getKeyPathAlias(keyPath2)] = result2;
                    return result2;
                  }),
                  getIndexByKeyPath: function(keyPath2) {
                    return indexByKeyPath[getKeyPathAlias(keyPath2)];
                  }
                };
                indexByKeyPath[":id"] = result.primaryKey;
                if (keyPath != null) {
                  indexByKeyPath[getKeyPathAlias(keyPath)] = result.primaryKey;
                }
                return result;
              })
            },
            hasGetAll: tables2.length > 0 && "getAll" in trans.objectStore(tables2[0]) && !(typeof navigator !== "undefined" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604)
          };
        }
        function makeIDBKeyRange(range) {
          if (range.type === 3)
            return null;
          if (range.type === 4)
            throw new Error("Cannot convert never type to IDBKeyRange");
          var lower = range.lower, upper = range.upper, lowerOpen = range.lowerOpen, upperOpen = range.upperOpen;
          var idbRange = lower === void 0 ? upper === void 0 ? null : IdbKeyRange.upperBound(upper, !!upperOpen) : upper === void 0 ? IdbKeyRange.lowerBound(lower, !!lowerOpen) : IdbKeyRange.bound(lower, upper, !!lowerOpen, !!upperOpen);
          return idbRange;
        }
        function createDbCoreTable(tableSchema) {
          var tableName = tableSchema.name;
          function mutate(_a3) {
            var trans = _a3.trans, type2 = _a3.type, keys2 = _a3.keys, values = _a3.values, range = _a3.range;
            return new Promise(function(resolve, reject) {
              resolve = wrap(resolve);
              var store = trans.objectStore(tableName);
              var outbound = store.keyPath == null;
              var isAddOrPut = type2 === "put" || type2 === "add";
              if (!isAddOrPut && type2 !== "delete" && type2 !== "deleteRange")
                throw new Error("Invalid operation type: " + type2);
              var length = (keys2 || values || { length: 1 }).length;
              if (keys2 && values && keys2.length !== values.length) {
                throw new Error("Given keys array must have same length as given values array.");
              }
              if (length === 0)
                return resolve({ numFailures: 0, failures: {}, results: [], lastResult: void 0 });
              var req;
              var reqs = [];
              var failures = [];
              var numFailures = 0;
              var errorHandler = function(event) {
                ++numFailures;
                preventDefault(event);
              };
              if (type2 === "deleteRange") {
                if (range.type === 4)
                  return resolve({ numFailures, failures, results: [], lastResult: void 0 });
                if (range.type === 3)
                  reqs.push(req = store.clear());
                else
                  reqs.push(req = store.delete(makeIDBKeyRange(range)));
              } else {
                var _a4 = isAddOrPut ? outbound ? [values, keys2] : [values, null] : [keys2, null], args1 = _a4[0], args2 = _a4[1];
                if (isAddOrPut) {
                  for (var i = 0; i < length; ++i) {
                    reqs.push(req = args2 && args2[i] !== void 0 ? store[type2](args1[i], args2[i]) : store[type2](args1[i]));
                    req.onerror = errorHandler;
                  }
                } else {
                  for (var i = 0; i < length; ++i) {
                    reqs.push(req = store[type2](args1[i]));
                    req.onerror = errorHandler;
                  }
                }
              }
              var done = function(event) {
                var lastResult = event.target.result;
                reqs.forEach(function(req2, i2) {
                  return req2.error != null && (failures[i2] = req2.error);
                });
                resolve({
                  numFailures,
                  failures,
                  results: type2 === "delete" ? keys2 : reqs.map(function(req2) {
                    return req2.result;
                  }),
                  lastResult
                });
              };
              req.onerror = function(event) {
                errorHandler(event);
                done(event);
              };
              req.onsuccess = done;
            });
          }
          function openCursor2(_a3) {
            var trans = _a3.trans, values = _a3.values, query2 = _a3.query, reverse = _a3.reverse, unique = _a3.unique;
            return new Promise(function(resolve, reject) {
              resolve = wrap(resolve);
              var index = query2.index, range = query2.range;
              var store = trans.objectStore(tableName);
              var source = index.isPrimaryKey ? store : store.index(index.name);
              var direction = reverse ? unique ? "prevunique" : "prev" : unique ? "nextunique" : "next";
              var req = values || !("openKeyCursor" in source) ? source.openCursor(makeIDBKeyRange(range), direction) : source.openKeyCursor(makeIDBKeyRange(range), direction);
              req.onerror = eventRejectHandler(reject);
              req.onsuccess = wrap(function(ev) {
                var cursor = req.result;
                if (!cursor) {
                  resolve(null);
                  return;
                }
                cursor.___id = ++_id_counter;
                cursor.done = false;
                var _cursorContinue = cursor.continue.bind(cursor);
                var _cursorContinuePrimaryKey = cursor.continuePrimaryKey;
                if (_cursorContinuePrimaryKey)
                  _cursorContinuePrimaryKey = _cursorContinuePrimaryKey.bind(cursor);
                var _cursorAdvance = cursor.advance.bind(cursor);
                var doThrowCursorIsNotStarted = function() {
                  throw new Error("Cursor not started");
                };
                var doThrowCursorIsStopped = function() {
                  throw new Error("Cursor not stopped");
                };
                cursor.trans = trans;
                cursor.stop = cursor.continue = cursor.continuePrimaryKey = cursor.advance = doThrowCursorIsNotStarted;
                cursor.fail = wrap(reject);
                cursor.next = function() {
                  var _this = this;
                  var gotOne = 1;
                  return this.start(function() {
                    return gotOne-- ? _this.continue() : _this.stop();
                  }).then(function() {
                    return _this;
                  });
                };
                cursor.start = function(callback) {
                  var iterationPromise = new Promise(function(resolveIteration, rejectIteration) {
                    resolveIteration = wrap(resolveIteration);
                    req.onerror = eventRejectHandler(rejectIteration);
                    cursor.fail = rejectIteration;
                    cursor.stop = function(value) {
                      cursor.stop = cursor.continue = cursor.continuePrimaryKey = cursor.advance = doThrowCursorIsStopped;
                      resolveIteration(value);
                    };
                  });
                  var guardedCallback = function() {
                    if (req.result) {
                      try {
                        callback();
                      } catch (err) {
                        cursor.fail(err);
                      }
                    } else {
                      cursor.done = true;
                      cursor.start = function() {
                        throw new Error("Cursor behind last entry");
                      };
                      cursor.stop();
                    }
                  };
                  req.onsuccess = wrap(function(ev2) {
                    req.onsuccess = guardedCallback;
                    guardedCallback();
                  });
                  cursor.continue = _cursorContinue;
                  cursor.continuePrimaryKey = _cursorContinuePrimaryKey;
                  cursor.advance = _cursorAdvance;
                  guardedCallback();
                  return iterationPromise;
                };
                resolve(cursor);
              }, reject);
            });
          }
          function query(hasGetAll2) {
            return function(request) {
              return new Promise(function(resolve, reject) {
                resolve = wrap(resolve);
                var trans = request.trans, values = request.values, limit = request.limit, query2 = request.query;
                var nonInfinitLimit = limit === Infinity ? void 0 : limit;
                var index = query2.index, range = query2.range;
                var store = trans.objectStore(tableName);
                var source = index.isPrimaryKey ? store : store.index(index.name);
                var idbKeyRange = makeIDBKeyRange(range);
                if (limit === 0)
                  return resolve({ result: [] });
                if (hasGetAll2) {
                  var req = values ? source.getAll(idbKeyRange, nonInfinitLimit) : source.getAllKeys(idbKeyRange, nonInfinitLimit);
                  req.onsuccess = function(event) {
                    return resolve({ result: event.target.result });
                  };
                  req.onerror = eventRejectHandler(reject);
                } else {
                  var count_1 = 0;
                  var req_1 = values || !("openKeyCursor" in source) ? source.openCursor(idbKeyRange) : source.openKeyCursor(idbKeyRange);
                  var result_1 = [];
                  req_1.onsuccess = function(event) {
                    var cursor = req_1.result;
                    if (!cursor)
                      return resolve({ result: result_1 });
                    result_1.push(values ? cursor.value : cursor.primaryKey);
                    if (++count_1 === limit)
                      return resolve({ result: result_1 });
                    cursor.continue();
                  };
                  req_1.onerror = eventRejectHandler(reject);
                }
              });
            };
          }
          return {
            name: tableName,
            schema: tableSchema,
            mutate,
            getMany: function(_a3) {
              var trans = _a3.trans, keys2 = _a3.keys;
              return new Promise(function(resolve, reject) {
                resolve = wrap(resolve);
                var store = trans.objectStore(tableName);
                var length = keys2.length;
                var result = new Array(length);
                var keyCount = 0;
                var callbackCount = 0;
                var req;
                var successHandler = function(event) {
                  var req2 = event.target;
                  if ((result[req2._pos] = req2.result) != null)
                    ;
                  if (++callbackCount === keyCount)
                    resolve(result);
                };
                var errorHandler = eventRejectHandler(reject);
                for (var i = 0; i < length; ++i) {
                  var key = keys2[i];
                  if (key != null) {
                    req = store.get(keys2[i]);
                    req._pos = i;
                    req.onsuccess = successHandler;
                    req.onerror = errorHandler;
                    ++keyCount;
                  }
                }
                if (keyCount === 0)
                  resolve(result);
              });
            },
            get: function(_a3) {
              var trans = _a3.trans, key = _a3.key;
              return new Promise(function(resolve, reject) {
                resolve = wrap(resolve);
                var store = trans.objectStore(tableName);
                var req = store.get(key);
                req.onsuccess = function(event) {
                  return resolve(event.target.result);
                };
                req.onerror = eventRejectHandler(reject);
              });
            },
            query: query(hasGetAll),
            openCursor: openCursor2,
            count: function(_a3) {
              var query2 = _a3.query, trans = _a3.trans;
              var index = query2.index, range = query2.range;
              return new Promise(function(resolve, reject) {
                var store = trans.objectStore(tableName);
                var source = index.isPrimaryKey ? store : store.index(index.name);
                var idbKeyRange = makeIDBKeyRange(range);
                var req = idbKeyRange ? source.count(idbKeyRange) : source.count();
                req.onsuccess = wrap(function(ev) {
                  return resolve(ev.target.result);
                });
                req.onerror = eventRejectHandler(reject);
              });
            }
          };
        }
        var _a2 = extractSchema(db, tmpTrans), schema = _a2.schema, hasGetAll = _a2.hasGetAll;
        var tables = schema.tables.map(function(tableSchema) {
          return createDbCoreTable(tableSchema);
        });
        var tableMap = {};
        tables.forEach(function(table) {
          return tableMap[table.name] = table;
        });
        return {
          stack: "dbcore",
          transaction: db.transaction.bind(db),
          table: function(name) {
            var result = tableMap[name];
            if (!result)
              throw new Error("Table '".concat(name, "' not found"));
            return tableMap[name];
          },
          MIN_KEY: -Infinity,
          MAX_KEY: getMaxKey(IdbKeyRange),
          schema
        };
      }
      function createMiddlewareStack(stackImpl, middlewares) {
        return middlewares.reduce(function(down, _a2) {
          var create = _a2.create;
          return __assign2(__assign2({}, down), create(down));
        }, stackImpl);
      }
      function createMiddlewareStacks(middlewares, idbdb, _a2, tmpTrans) {
        var IDBKeyRange = _a2.IDBKeyRange;
        _a2.indexedDB;
        var dbcore = createMiddlewareStack(createDBCore(idbdb, IDBKeyRange, tmpTrans), middlewares.dbcore);
        return {
          dbcore
        };
      }
      function generateMiddlewareStacks(db, tmpTrans) {
        var idbdb = tmpTrans.db;
        var stacks = createMiddlewareStacks(db._middlewares, idbdb, db._deps, tmpTrans);
        db.core = stacks.dbcore;
        db.tables.forEach(function(table) {
          var tableName = table.name;
          if (db.core.schema.tables.some(function(tbl) {
            return tbl.name === tableName;
          })) {
            table.core = db.core.table(tableName);
            if (db[tableName] instanceof db.Table) {
              db[tableName].core = table.core;
            }
          }
        });
      }
      function setApiOnPlace(db, objs, tableNames, dbschema) {
        tableNames.forEach(function(tableName) {
          var schema = dbschema[tableName];
          objs.forEach(function(obj) {
            var propDesc = getPropertyDescriptor(obj, tableName);
            if (!propDesc || "value" in propDesc && propDesc.value === void 0) {
              if (obj === db.Transaction.prototype || obj instanceof db.Transaction) {
                setProp(obj, tableName, {
                  get: function() {
                    return this.table(tableName);
                  },
                  set: function(value) {
                    defineProperty(this, tableName, { value, writable: true, configurable: true, enumerable: true });
                  }
                });
              } else {
                obj[tableName] = new db.Table(tableName, schema);
              }
            }
          });
        });
      }
      function removeTablesApi(db, objs) {
        objs.forEach(function(obj) {
          for (var key in obj) {
            if (obj[key] instanceof db.Table)
              delete obj[key];
          }
        });
      }
      function lowerVersionFirst(a, b) {
        return a._cfg.version - b._cfg.version;
      }
      function runUpgraders(db, oldVersion, idbUpgradeTrans, reject) {
        var globalSchema = db._dbSchema;
        if (idbUpgradeTrans.objectStoreNames.contains("$meta") && !globalSchema.$meta) {
          globalSchema.$meta = createTableSchema("$meta", parseIndexSyntax("")[0], []);
          db._storeNames.push("$meta");
        }
        var trans = db._createTransaction("readwrite", db._storeNames, globalSchema);
        trans.create(idbUpgradeTrans);
        trans._completion.catch(reject);
        var rejectTransaction = trans._reject.bind(trans);
        var transless = PSD.transless || PSD;
        newScope(function() {
          PSD.trans = trans;
          PSD.transless = transless;
          if (oldVersion === 0) {
            keys(globalSchema).forEach(function(tableName) {
              createTable(idbUpgradeTrans, tableName, globalSchema[tableName].primKey, globalSchema[tableName].indexes);
            });
            generateMiddlewareStacks(db, idbUpgradeTrans);
            DexiePromise.follow(function() {
              return db.on.populate.fire(trans);
            }).catch(rejectTransaction);
          } else {
            generateMiddlewareStacks(db, idbUpgradeTrans);
            return getExistingVersion(db, trans, oldVersion).then(function(oldVersion2) {
              return updateTablesAndIndexes(db, oldVersion2, trans, idbUpgradeTrans);
            }).catch(rejectTransaction);
          }
        });
      }
      function patchCurrentVersion(db, idbUpgradeTrans) {
        createMissingTables(db._dbSchema, idbUpgradeTrans);
        if (idbUpgradeTrans.db.version % 10 === 0 && !idbUpgradeTrans.objectStoreNames.contains("$meta")) {
          idbUpgradeTrans.db.createObjectStore("$meta").add(Math.ceil(idbUpgradeTrans.db.version / 10 - 1), "version");
        }
        var globalSchema = buildGlobalSchema(db, db.idbdb, idbUpgradeTrans);
        adjustToExistingIndexNames(db, db._dbSchema, idbUpgradeTrans);
        var diff = getSchemaDiff(globalSchema, db._dbSchema);
        var _loop_1 = function(tableChange2) {
          if (tableChange2.change.length || tableChange2.recreate) {
            console.warn("Unable to patch indexes of table ".concat(tableChange2.name, " because it has changes on the type of index or primary key."));
            return { value: void 0 };
          }
          var store = idbUpgradeTrans.objectStore(tableChange2.name);
          tableChange2.add.forEach(function(idx) {
            if (debug)
              console.debug("Dexie upgrade patch: Creating missing index ".concat(tableChange2.name, ".").concat(idx.src));
            addIndex(store, idx);
          });
        };
        for (var _i = 0, _a2 = diff.change; _i < _a2.length; _i++) {
          var tableChange = _a2[_i];
          var state_1 = _loop_1(tableChange);
          if (typeof state_1 === "object")
            return state_1.value;
        }
      }
      function getExistingVersion(db, trans, oldVersion) {
        if (trans.storeNames.includes("$meta")) {
          return trans.table("$meta").get("version").then(function(metaVersion) {
            return metaVersion != null ? metaVersion : oldVersion;
          });
        } else {
          return DexiePromise.resolve(oldVersion);
        }
      }
      function updateTablesAndIndexes(db, oldVersion, trans, idbUpgradeTrans) {
        var queue = [];
        var versions = db._versions;
        var globalSchema = db._dbSchema = buildGlobalSchema(db, db.idbdb, idbUpgradeTrans);
        var versToRun = versions.filter(function(v) {
          return v._cfg.version >= oldVersion;
        });
        if (versToRun.length === 0) {
          return DexiePromise.resolve();
        }
        versToRun.forEach(function(version) {
          queue.push(function() {
            var oldSchema = globalSchema;
            var newSchema = version._cfg.dbschema;
            adjustToExistingIndexNames(db, oldSchema, idbUpgradeTrans);
            adjustToExistingIndexNames(db, newSchema, idbUpgradeTrans);
            globalSchema = db._dbSchema = newSchema;
            var diff = getSchemaDiff(oldSchema, newSchema);
            diff.add.forEach(function(tuple) {
              createTable(idbUpgradeTrans, tuple[0], tuple[1].primKey, tuple[1].indexes);
            });
            diff.change.forEach(function(change) {
              if (change.recreate) {
                throw new exceptions.Upgrade("Not yet support for changing primary key");
              } else {
                var store_1 = idbUpgradeTrans.objectStore(change.name);
                change.add.forEach(function(idx) {
                  return addIndex(store_1, idx);
                });
                change.change.forEach(function(idx) {
                  store_1.deleteIndex(idx.name);
                  addIndex(store_1, idx);
                });
                change.del.forEach(function(idxName) {
                  return store_1.deleteIndex(idxName);
                });
              }
            });
            var contentUpgrade = version._cfg.contentUpgrade;
            if (contentUpgrade && version._cfg.version > oldVersion) {
              generateMiddlewareStacks(db, idbUpgradeTrans);
              trans._memoizedTables = {};
              var upgradeSchema_1 = shallowClone(newSchema);
              diff.del.forEach(function(table) {
                upgradeSchema_1[table] = oldSchema[table];
              });
              removeTablesApi(db, [db.Transaction.prototype]);
              setApiOnPlace(db, [db.Transaction.prototype], keys(upgradeSchema_1), upgradeSchema_1);
              trans.schema = upgradeSchema_1;
              var contentUpgradeIsAsync_1 = isAsyncFunction(contentUpgrade);
              if (contentUpgradeIsAsync_1) {
                incrementExpectedAwaits();
              }
              var returnValue_1;
              var promiseFollowed = DexiePromise.follow(function() {
                returnValue_1 = contentUpgrade(trans);
                if (returnValue_1) {
                  if (contentUpgradeIsAsync_1) {
                    var decrementor = decrementExpectedAwaits.bind(null, null);
                    returnValue_1.then(decrementor, decrementor);
                  }
                }
              });
              return returnValue_1 && typeof returnValue_1.then === "function" ? DexiePromise.resolve(returnValue_1) : promiseFollowed.then(function() {
                return returnValue_1;
              });
            }
          });
          queue.push(function(idbtrans) {
            var newSchema = version._cfg.dbschema;
            deleteRemovedTables(newSchema, idbtrans);
            removeTablesApi(db, [db.Transaction.prototype]);
            setApiOnPlace(db, [db.Transaction.prototype], db._storeNames, db._dbSchema);
            trans.schema = db._dbSchema;
          });
          queue.push(function(idbtrans) {
            if (db.idbdb.objectStoreNames.contains("$meta")) {
              if (Math.ceil(db.idbdb.version / 10) === version._cfg.version) {
                db.idbdb.deleteObjectStore("$meta");
                delete db._dbSchema.$meta;
                db._storeNames = db._storeNames.filter(function(name) {
                  return name !== "$meta";
                });
              } else {
                idbtrans.objectStore("$meta").put(version._cfg.version, "version");
              }
            }
          });
        });
        function runQueue() {
          return queue.length ? DexiePromise.resolve(queue.shift()(trans.idbtrans)).then(runQueue) : DexiePromise.resolve();
        }
        return runQueue().then(function() {
          createMissingTables(globalSchema, idbUpgradeTrans);
        });
      }
      function getSchemaDiff(oldSchema, newSchema) {
        var diff = {
          del: [],
          add: [],
          change: []
        };
        var table;
        for (table in oldSchema) {
          if (!newSchema[table])
            diff.del.push(table);
        }
        for (table in newSchema) {
          var oldDef = oldSchema[table], newDef = newSchema[table];
          if (!oldDef) {
            diff.add.push([table, newDef]);
          } else {
            var change = {
              name: table,
              def: newDef,
              recreate: false,
              del: [],
              add: [],
              change: []
            };
            if ("" + (oldDef.primKey.keyPath || "") !== "" + (newDef.primKey.keyPath || "") || oldDef.primKey.auto !== newDef.primKey.auto) {
              change.recreate = true;
              diff.change.push(change);
            } else {
              var oldIndexes = oldDef.idxByName;
              var newIndexes = newDef.idxByName;
              var idxName = void 0;
              for (idxName in oldIndexes) {
                if (!newIndexes[idxName])
                  change.del.push(idxName);
              }
              for (idxName in newIndexes) {
                var oldIdx = oldIndexes[idxName], newIdx = newIndexes[idxName];
                if (!oldIdx)
                  change.add.push(newIdx);
                else if (oldIdx.src !== newIdx.src)
                  change.change.push(newIdx);
              }
              if (change.del.length > 0 || change.add.length > 0 || change.change.length > 0) {
                diff.change.push(change);
              }
            }
          }
        }
        return diff;
      }
      function createTable(idbtrans, tableName, primKey, indexes) {
        var store = idbtrans.db.createObjectStore(tableName, primKey.keyPath ? { keyPath: primKey.keyPath, autoIncrement: primKey.auto } : { autoIncrement: primKey.auto });
        indexes.forEach(function(idx) {
          return addIndex(store, idx);
        });
        return store;
      }
      function createMissingTables(newSchema, idbtrans) {
        keys(newSchema).forEach(function(tableName) {
          if (!idbtrans.db.objectStoreNames.contains(tableName)) {
            if (debug)
              console.debug("Dexie: Creating missing table", tableName);
            createTable(idbtrans, tableName, newSchema[tableName].primKey, newSchema[tableName].indexes);
          }
        });
      }
      function deleteRemovedTables(newSchema, idbtrans) {
        [].slice.call(idbtrans.db.objectStoreNames).forEach(function(storeName) {
          return newSchema[storeName] == null && idbtrans.db.deleteObjectStore(storeName);
        });
      }
      function addIndex(store, idx) {
        store.createIndex(idx.name, idx.keyPath, { unique: idx.unique, multiEntry: idx.multi });
      }
      function buildGlobalSchema(db, idbdb, tmpTrans) {
        var globalSchema = {};
        var dbStoreNames = slice(idbdb.objectStoreNames, 0);
        dbStoreNames.forEach(function(storeName) {
          var store = tmpTrans.objectStore(storeName);
          var keyPath = store.keyPath;
          var primKey = createIndexSpec(nameFromKeyPath(keyPath), keyPath || "", true, false, !!store.autoIncrement, keyPath && typeof keyPath !== "string", true);
          var indexes = [];
          for (var j = 0; j < store.indexNames.length; ++j) {
            var idbindex = store.index(store.indexNames[j]);
            keyPath = idbindex.keyPath;
            var index = createIndexSpec(idbindex.name, keyPath, !!idbindex.unique, !!idbindex.multiEntry, false, keyPath && typeof keyPath !== "string", false);
            indexes.push(index);
          }
          globalSchema[storeName] = createTableSchema(storeName, primKey, indexes);
        });
        return globalSchema;
      }
      function readGlobalSchema(db, idbdb, tmpTrans) {
        db.verno = idbdb.version / 10;
        var globalSchema = db._dbSchema = buildGlobalSchema(db, idbdb, tmpTrans);
        db._storeNames = slice(idbdb.objectStoreNames, 0);
        setApiOnPlace(db, [db._allTables], keys(globalSchema), globalSchema);
      }
      function verifyInstalledSchema(db, tmpTrans) {
        var installedSchema = buildGlobalSchema(db, db.idbdb, tmpTrans);
        var diff = getSchemaDiff(installedSchema, db._dbSchema);
        return !(diff.add.length || diff.change.some(function(ch) {
          return ch.add.length || ch.change.length;
        }));
      }
      function adjustToExistingIndexNames(db, schema, idbtrans) {
        var storeNames = idbtrans.db.objectStoreNames;
        for (var i = 0; i < storeNames.length; ++i) {
          var storeName = storeNames[i];
          var store = idbtrans.objectStore(storeName);
          db._hasGetAll = "getAll" in store;
          for (var j = 0; j < store.indexNames.length; ++j) {
            var indexName = store.indexNames[j];
            var keyPath = store.index(indexName).keyPath;
            var dexieName = typeof keyPath === "string" ? keyPath : "[" + slice(keyPath).join("+") + "]";
            if (schema[storeName]) {
              var indexSpec = schema[storeName].idxByName[dexieName];
              if (indexSpec) {
                indexSpec.name = indexName;
                delete schema[storeName].idxByName[dexieName];
                schema[storeName].idxByName[indexName] = indexSpec;
              }
            }
          }
        }
        if (typeof navigator !== "undefined" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && _global2.WorkerGlobalScope && _global2 instanceof _global2.WorkerGlobalScope && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604) {
          db._hasGetAll = false;
        }
      }
      function parseIndexSyntax(primKeyAndIndexes) {
        return primKeyAndIndexes.split(",").map(function(index, indexNum) {
          index = index.trim();
          var name = index.replace(/([&*]|\+\+)/g, "");
          var keyPath = /^\[/.test(name) ? name.match(/^\[(.*)\]$/)[1].split("+") : name;
          return createIndexSpec(name, keyPath || null, /\&/.test(index), /\*/.test(index), /\+\+/.test(index), isArray(keyPath), indexNum === 0);
        });
      }
      var Version = function() {
        function Version2() {
        }
        Version2.prototype._parseStoresSpec = function(stores, outSchema) {
          keys(stores).forEach(function(tableName) {
            if (stores[tableName] !== null) {
              var indexes = parseIndexSyntax(stores[tableName]);
              var primKey = indexes.shift();
              primKey.unique = true;
              if (primKey.multi)
                throw new exceptions.Schema("Primary key cannot be multi-valued");
              indexes.forEach(function(idx) {
                if (idx.auto)
                  throw new exceptions.Schema("Only primary key can be marked as autoIncrement (++)");
                if (!idx.keyPath)
                  throw new exceptions.Schema("Index must have a name and cannot be an empty string");
              });
              outSchema[tableName] = createTableSchema(tableName, primKey, indexes);
            }
          });
        };
        Version2.prototype.stores = function(stores) {
          var db = this.db;
          this._cfg.storesSource = this._cfg.storesSource ? extend(this._cfg.storesSource, stores) : stores;
          var versions = db._versions;
          var storesSpec = {};
          var dbschema = {};
          versions.forEach(function(version) {
            extend(storesSpec, version._cfg.storesSource);
            dbschema = version._cfg.dbschema = {};
            version._parseStoresSpec(storesSpec, dbschema);
          });
          db._dbSchema = dbschema;
          removeTablesApi(db, [db._allTables, db, db.Transaction.prototype]);
          setApiOnPlace(db, [db._allTables, db, db.Transaction.prototype, this._cfg.tables], keys(dbschema), dbschema);
          db._storeNames = keys(dbschema);
          return this;
        };
        Version2.prototype.upgrade = function(upgradeFunction) {
          this._cfg.contentUpgrade = promisableChain(this._cfg.contentUpgrade || nop, upgradeFunction);
          return this;
        };
        return Version2;
      }();
      function createVersionConstructor(db) {
        return makeClassConstructor(Version.prototype, function Version2(versionNumber) {
          this.db = db;
          this._cfg = {
            version: versionNumber,
            storesSource: null,
            dbschema: {},
            tables: {},
            contentUpgrade: null
          };
        });
      }
      function getDbNamesTable(indexedDB2, IDBKeyRange) {
        var dbNamesDB = indexedDB2["_dbNamesDB"];
        if (!dbNamesDB) {
          dbNamesDB = indexedDB2["_dbNamesDB"] = new Dexie$1(DBNAMES_DB, {
            addons: [],
            indexedDB: indexedDB2,
            IDBKeyRange
          });
          dbNamesDB.version(1).stores({ dbnames: "name" });
        }
        return dbNamesDB.table("dbnames");
      }
      function hasDatabasesNative(indexedDB2) {
        return indexedDB2 && typeof indexedDB2.databases === "function";
      }
      function getDatabaseNames(_a2) {
        var indexedDB2 = _a2.indexedDB, IDBKeyRange = _a2.IDBKeyRange;
        return hasDatabasesNative(indexedDB2) ? Promise.resolve(indexedDB2.databases()).then(function(infos) {
          return infos.map(function(info) {
            return info.name;
          }).filter(function(name) {
            return name !== DBNAMES_DB;
          });
        }) : getDbNamesTable(indexedDB2, IDBKeyRange).toCollection().primaryKeys();
      }
      function _onDatabaseCreated(_a2, name) {
        var indexedDB2 = _a2.indexedDB, IDBKeyRange = _a2.IDBKeyRange;
        !hasDatabasesNative(indexedDB2) && name !== DBNAMES_DB && getDbNamesTable(indexedDB2, IDBKeyRange).put({ name }).catch(nop);
      }
      function _onDatabaseDeleted(_a2, name) {
        var indexedDB2 = _a2.indexedDB, IDBKeyRange = _a2.IDBKeyRange;
        !hasDatabasesNative(indexedDB2) && name !== DBNAMES_DB && getDbNamesTable(indexedDB2, IDBKeyRange).delete(name).catch(nop);
      }
      function vip(fn) {
        return newScope(function() {
          PSD.letThrough = true;
          return fn();
        });
      }
      function idbReady() {
        var isSafari = !navigator.userAgentData && /Safari\//.test(navigator.userAgent) && !/Chrom(e|ium)\//.test(navigator.userAgent);
        if (!isSafari || !indexedDB.databases)
          return Promise.resolve();
        var intervalId;
        return new Promise(function(resolve) {
          var tryIdb = function() {
            return indexedDB.databases().finally(resolve);
          };
          intervalId = setInterval(tryIdb, 100);
          tryIdb();
        }).finally(function() {
          return clearInterval(intervalId);
        });
      }
      var _a;
      function isEmptyRange(node) {
        return !("from" in node);
      }
      var RangeSet2 = function(fromOrTree, to) {
        if (this) {
          extend(this, arguments.length ? { d: 1, from: fromOrTree, to: arguments.length > 1 ? to : fromOrTree } : { d: 0 });
        } else {
          var rv = new RangeSet2();
          if (fromOrTree && "d" in fromOrTree) {
            extend(rv, fromOrTree);
          }
          return rv;
        }
      };
      props(RangeSet2.prototype, (_a = {
        add: function(rangeSet) {
          mergeRanges2(this, rangeSet);
          return this;
        },
        addKey: function(key) {
          addRange(this, key, key);
          return this;
        },
        addKeys: function(keys2) {
          var _this = this;
          keys2.forEach(function(key) {
            return addRange(_this, key, key);
          });
          return this;
        },
        hasKey: function(key) {
          var node = getRangeSetIterator(this).next(key).value;
          return node && cmp2(node.from, key) <= 0 && cmp2(node.to, key) >= 0;
        }
      }, _a[iteratorSymbol] = function() {
        return getRangeSetIterator(this);
      }, _a));
      function addRange(target, from, to) {
        var diff = cmp2(from, to);
        if (isNaN(diff))
          return;
        if (diff > 0)
          throw RangeError();
        if (isEmptyRange(target))
          return extend(target, { from, to, d: 1 });
        var left = target.l;
        var right = target.r;
        if (cmp2(to, target.from) < 0) {
          left ? addRange(left, from, to) : target.l = { from, to, d: 1, l: null, r: null };
          return rebalance(target);
        }
        if (cmp2(from, target.to) > 0) {
          right ? addRange(right, from, to) : target.r = { from, to, d: 1, l: null, r: null };
          return rebalance(target);
        }
        if (cmp2(from, target.from) < 0) {
          target.from = from;
          target.l = null;
          target.d = right ? right.d + 1 : 1;
        }
        if (cmp2(to, target.to) > 0) {
          target.to = to;
          target.r = null;
          target.d = target.l ? target.l.d + 1 : 1;
        }
        var rightWasCutOff = !target.r;
        if (left && !target.l) {
          mergeRanges2(target, left);
        }
        if (right && rightWasCutOff) {
          mergeRanges2(target, right);
        }
      }
      function mergeRanges2(target, newSet) {
        function _addRangeSet(target2, _a2) {
          var from = _a2.from, to = _a2.to, l = _a2.l, r = _a2.r;
          addRange(target2, from, to);
          if (l)
            _addRangeSet(target2, l);
          if (r)
            _addRangeSet(target2, r);
        }
        if (!isEmptyRange(newSet))
          _addRangeSet(target, newSet);
      }
      function rangesOverlap2(rangeSet1, rangeSet2) {
        var i1 = getRangeSetIterator(rangeSet2);
        var nextResult1 = i1.next();
        if (nextResult1.done)
          return false;
        var a = nextResult1.value;
        var i2 = getRangeSetIterator(rangeSet1);
        var nextResult2 = i2.next(a.from);
        var b = nextResult2.value;
        while (!nextResult1.done && !nextResult2.done) {
          if (cmp2(b.from, a.to) <= 0 && cmp2(b.to, a.from) >= 0)
            return true;
          cmp2(a.from, b.from) < 0 ? a = (nextResult1 = i1.next(b.from)).value : b = (nextResult2 = i2.next(a.from)).value;
        }
        return false;
      }
      function getRangeSetIterator(node) {
        var state = isEmptyRange(node) ? null : { s: 0, n: node };
        return {
          next: function(key) {
            var keyProvided = arguments.length > 0;
            while (state) {
              switch (state.s) {
                case 0:
                  state.s = 1;
                  if (keyProvided) {
                    while (state.n.l && cmp2(key, state.n.from) < 0)
                      state = { up: state, n: state.n.l, s: 1 };
                  } else {
                    while (state.n.l)
                      state = { up: state, n: state.n.l, s: 1 };
                  }
                case 1:
                  state.s = 2;
                  if (!keyProvided || cmp2(key, state.n.to) <= 0)
                    return { value: state.n, done: false };
                case 2:
                  if (state.n.r) {
                    state.s = 3;
                    state = { up: state, n: state.n.r, s: 0 };
                    continue;
                  }
                case 3:
                  state = state.up;
              }
            }
            return { done: true };
          }
        };
      }
      function rebalance(target) {
        var _a2, _b;
        var diff = (((_a2 = target.r) === null || _a2 === void 0 ? void 0 : _a2.d) || 0) - (((_b = target.l) === null || _b === void 0 ? void 0 : _b.d) || 0);
        var r = diff > 1 ? "r" : diff < -1 ? "l" : "";
        if (r) {
          var l = r === "r" ? "l" : "r";
          var rootClone = __assign2({}, target);
          var oldRootRight = target[r];
          target.from = oldRootRight.from;
          target.to = oldRootRight.to;
          target[r] = oldRootRight[r];
          rootClone[r] = oldRootRight[l];
          target[l] = rootClone;
          rootClone.d = computeDepth(rootClone);
        }
        target.d = computeDepth(target);
      }
      function computeDepth(_a2) {
        var r = _a2.r, l = _a2.l;
        return (r ? l ? Math.max(r.d, l.d) : r.d : l ? l.d : 0) + 1;
      }
      function extendObservabilitySet(target, newSet) {
        keys(newSet).forEach(function(part) {
          if (target[part])
            mergeRanges2(target[part], newSet[part]);
          else
            target[part] = cloneSimpleObjectTree(newSet[part]);
        });
        return target;
      }
      function obsSetsOverlap(os1, os2) {
        return os1.all || os2.all || Object.keys(os1).some(function(key) {
          return os2[key] && rangesOverlap2(os2[key], os1[key]);
        });
      }
      var cache = {};
      var unsignaledParts = {};
      var isTaskEnqueued = false;
      function signalSubscribersLazily(part, optimistic) {
        extendObservabilitySet(unsignaledParts, part);
        if (!isTaskEnqueued) {
          isTaskEnqueued = true;
          setTimeout(function() {
            isTaskEnqueued = false;
            var parts = unsignaledParts;
            unsignaledParts = {};
            signalSubscribersNow(parts, false);
          }, 0);
        }
      }
      function signalSubscribersNow(updatedParts, deleteAffectedCacheEntries) {
        if (deleteAffectedCacheEntries === void 0) {
          deleteAffectedCacheEntries = false;
        }
        var queriesToSignal = /* @__PURE__ */ new Set();
        if (updatedParts.all) {
          for (var _i = 0, _a2 = Object.values(cache); _i < _a2.length; _i++) {
            var tblCache = _a2[_i];
            collectTableSubscribers(tblCache, updatedParts, queriesToSignal, deleteAffectedCacheEntries);
          }
        } else {
          for (var key in updatedParts) {
            var parts = /^idb\:\/\/(.*)\/(.*)\//.exec(key);
            if (parts) {
              var dbName = parts[1], tableName = parts[2];
              var tblCache = cache["idb://".concat(dbName, "/").concat(tableName)];
              if (tblCache)
                collectTableSubscribers(tblCache, updatedParts, queriesToSignal, deleteAffectedCacheEntries);
            }
          }
        }
        queriesToSignal.forEach(function(requery) {
          return requery();
        });
      }
      function collectTableSubscribers(tblCache, updatedParts, outQueriesToSignal, deleteAffectedCacheEntries) {
        var updatedEntryLists = [];
        for (var _i = 0, _a2 = Object.entries(tblCache.queries.query); _i < _a2.length; _i++) {
          var _b = _a2[_i], indexName = _b[0], entries = _b[1];
          var filteredEntries = [];
          for (var _c = 0, entries_1 = entries; _c < entries_1.length; _c++) {
            var entry = entries_1[_c];
            if (obsSetsOverlap(updatedParts, entry.obsSet)) {
              entry.subscribers.forEach(function(requery) {
                return outQueriesToSignal.add(requery);
              });
            } else if (deleteAffectedCacheEntries) {
              filteredEntries.push(entry);
            }
          }
          if (deleteAffectedCacheEntries)
            updatedEntryLists.push([indexName, filteredEntries]);
        }
        if (deleteAffectedCacheEntries) {
          for (var _d = 0, updatedEntryLists_1 = updatedEntryLists; _d < updatedEntryLists_1.length; _d++) {
            var _e = updatedEntryLists_1[_d], indexName = _e[0], filteredEntries = _e[1];
            tblCache.queries.query[indexName] = filteredEntries;
          }
        }
      }
      function dexieOpen(db) {
        var state = db._state;
        var indexedDB2 = db._deps.indexedDB;
        if (state.isBeingOpened || db.idbdb)
          return state.dbReadyPromise.then(function() {
            return state.dbOpenError ? rejection(state.dbOpenError) : db;
          });
        state.isBeingOpened = true;
        state.dbOpenError = null;
        state.openComplete = false;
        var openCanceller = state.openCanceller;
        var nativeVerToOpen = Math.round(db.verno * 10);
        var schemaPatchMode = false;
        function throwIfCancelled() {
          if (state.openCanceller !== openCanceller)
            throw new exceptions.DatabaseClosed("db.open() was cancelled");
        }
        var resolveDbReady = state.dbReadyResolve, upgradeTransaction = null, wasCreated = false;
        var tryOpenDB = function() {
          return new DexiePromise(function(resolve, reject) {
            throwIfCancelled();
            if (!indexedDB2)
              throw new exceptions.MissingAPI();
            var dbName = db.name;
            var req = state.autoSchema || !nativeVerToOpen ? indexedDB2.open(dbName) : indexedDB2.open(dbName, nativeVerToOpen);
            if (!req)
              throw new exceptions.MissingAPI();
            req.onerror = eventRejectHandler(reject);
            req.onblocked = wrap(db._fireOnBlocked);
            req.onupgradeneeded = wrap(function(e) {
              upgradeTransaction = req.transaction;
              if (state.autoSchema && !db._options.allowEmptyDB) {
                req.onerror = preventDefault;
                upgradeTransaction.abort();
                req.result.close();
                var delreq = indexedDB2.deleteDatabase(dbName);
                delreq.onsuccess = delreq.onerror = wrap(function() {
                  reject(new exceptions.NoSuchDatabase("Database ".concat(dbName, " doesnt exist")));
                });
              } else {
                upgradeTransaction.onerror = eventRejectHandler(reject);
                var oldVer = e.oldVersion > Math.pow(2, 62) ? 0 : e.oldVersion;
                wasCreated = oldVer < 1;
                db.idbdb = req.result;
                if (schemaPatchMode) {
                  patchCurrentVersion(db, upgradeTransaction);
                }
                runUpgraders(db, oldVer / 10, upgradeTransaction, reject);
              }
            }, reject);
            req.onsuccess = wrap(function() {
              upgradeTransaction = null;
              var idbdb = db.idbdb = req.result;
              var objectStoreNames = slice(idbdb.objectStoreNames);
              if (objectStoreNames.length > 0)
                try {
                  var tmpTrans = idbdb.transaction(safariMultiStoreFix(objectStoreNames), "readonly");
                  if (state.autoSchema)
                    readGlobalSchema(db, idbdb, tmpTrans);
                  else {
                    adjustToExistingIndexNames(db, db._dbSchema, tmpTrans);
                    if (!verifyInstalledSchema(db, tmpTrans) && !schemaPatchMode) {
                      console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this.");
                      idbdb.close();
                      nativeVerToOpen = idbdb.version + 1;
                      schemaPatchMode = true;
                      return resolve(tryOpenDB());
                    }
                  }
                  generateMiddlewareStacks(db, tmpTrans);
                } catch (e) {
                }
              connections.push(db);
              idbdb.onversionchange = wrap(function(ev) {
                state.vcFired = true;
                db.on("versionchange").fire(ev);
              });
              idbdb.onclose = wrap(function(ev) {
                db.on("close").fire(ev);
              });
              if (wasCreated)
                _onDatabaseCreated(db._deps, dbName);
              resolve();
            }, reject);
          }).catch(function(err) {
            switch (err === null || err === void 0 ? void 0 : err.name) {
              case "UnknownError":
                if (state.PR1398_maxLoop > 0) {
                  state.PR1398_maxLoop--;
                  console.warn("Dexie: Workaround for Chrome UnknownError on open()");
                  return tryOpenDB();
                }
                break;
              case "VersionError":
                if (nativeVerToOpen > 0) {
                  nativeVerToOpen = 0;
                  return tryOpenDB();
                }
                break;
            }
            return DexiePromise.reject(err);
          });
        };
        return DexiePromise.race([
          openCanceller,
          (typeof navigator === "undefined" ? DexiePromise.resolve() : idbReady()).then(tryOpenDB)
        ]).then(function() {
          throwIfCancelled();
          state.onReadyBeingFired = [];
          return DexiePromise.resolve(vip(function() {
            return db.on.ready.fire(db.vip);
          })).then(function fireRemainders() {
            if (state.onReadyBeingFired.length > 0) {
              var remainders_1 = state.onReadyBeingFired.reduce(promisableChain, nop);
              state.onReadyBeingFired = [];
              return DexiePromise.resolve(vip(function() {
                return remainders_1(db.vip);
              })).then(fireRemainders);
            }
          });
        }).finally(function() {
          if (state.openCanceller === openCanceller) {
            state.onReadyBeingFired = null;
            state.isBeingOpened = false;
          }
        }).catch(function(err) {
          state.dbOpenError = err;
          try {
            upgradeTransaction && upgradeTransaction.abort();
          } catch (_a2) {
          }
          if (openCanceller === state.openCanceller) {
            db._close();
          }
          return rejection(err);
        }).finally(function() {
          state.openComplete = true;
          resolveDbReady();
        }).then(function() {
          if (wasCreated) {
            var everything_1 = {};
            db.tables.forEach(function(table) {
              table.schema.indexes.forEach(function(idx) {
                if (idx.name)
                  everything_1["idb://".concat(db.name, "/").concat(table.name, "/").concat(idx.name)] = new RangeSet2(-Infinity, [[[]]]);
              });
              everything_1["idb://".concat(db.name, "/").concat(table.name, "/")] = everything_1["idb://".concat(db.name, "/").concat(table.name, "/:dels")] = new RangeSet2(-Infinity, [[[]]]);
            });
            globalEvents(DEXIE_STORAGE_MUTATED_EVENT_NAME).fire(everything_1);
            signalSubscribersNow(everything_1, true);
          }
          return db;
        });
      }
      function awaitIterator(iterator) {
        var callNext = function(result) {
          return iterator.next(result);
        }, doThrow = function(error) {
          return iterator.throw(error);
        }, onSuccess = step(callNext), onError = step(doThrow);
        function step(getNext) {
          return function(val) {
            var next = getNext(val), value = next.value;
            return next.done ? value : !value || typeof value.then !== "function" ? isArray(value) ? Promise.all(value).then(onSuccess, onError) : onSuccess(value) : value.then(onSuccess, onError);
          };
        }
        return step(callNext)();
      }
      function extractTransactionArgs(mode, _tableArgs_, scopeFunc) {
        var i = arguments.length;
        if (i < 2)
          throw new exceptions.InvalidArgument("Too few arguments");
        var args = new Array(i - 1);
        while (--i)
          args[i - 1] = arguments[i];
        scopeFunc = args.pop();
        var tables = flatten(args);
        return [mode, tables, scopeFunc];
      }
      function enterTransactionScope(db, mode, storeNames, parentTransaction, scopeFunc) {
        return DexiePromise.resolve().then(function() {
          var transless = PSD.transless || PSD;
          var trans = db._createTransaction(mode, storeNames, db._dbSchema, parentTransaction);
          trans.explicit = true;
          var zoneProps = {
            trans,
            transless
          };
          if (parentTransaction) {
            trans.idbtrans = parentTransaction.idbtrans;
          } else {
            try {
              trans.create();
              trans.idbtrans._explicit = true;
              db._state.PR1398_maxLoop = 3;
            } catch (ex) {
              if (ex.name === errnames.InvalidState && db.isOpen() && --db._state.PR1398_maxLoop > 0) {
                console.warn("Dexie: Need to reopen db");
                db.close({ disableAutoOpen: false });
                return db.open().then(function() {
                  return enterTransactionScope(db, mode, storeNames, null, scopeFunc);
                });
              }
              return rejection(ex);
            }
          }
          var scopeFuncIsAsync = isAsyncFunction(scopeFunc);
          if (scopeFuncIsAsync) {
            incrementExpectedAwaits();
          }
          var returnValue;
          var promiseFollowed = DexiePromise.follow(function() {
            returnValue = scopeFunc.call(trans, trans);
            if (returnValue) {
              if (scopeFuncIsAsync) {
                var decrementor = decrementExpectedAwaits.bind(null, null);
                returnValue.then(decrementor, decrementor);
              } else if (typeof returnValue.next === "function" && typeof returnValue.throw === "function") {
                returnValue = awaitIterator(returnValue);
              }
            }
          }, zoneProps);
          return (returnValue && typeof returnValue.then === "function" ? DexiePromise.resolve(returnValue).then(function(x) {
            return trans.active ? x : rejection(new exceptions.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn"));
          }) : promiseFollowed.then(function() {
            return returnValue;
          })).then(function(x) {
            if (parentTransaction)
              trans._resolve();
            return trans._completion.then(function() {
              return x;
            });
          }).catch(function(e) {
            trans._reject(e);
            return rejection(e);
          });
        });
      }
      function pad(a, value, count) {
        var result = isArray(a) ? a.slice() : [a];
        for (var i = 0; i < count; ++i)
          result.push(value);
        return result;
      }
      function createVirtualIndexMiddleware(down) {
        return __assign2(__assign2({}, down), { table: function(tableName) {
          var table = down.table(tableName);
          var schema = table.schema;
          var indexLookup = {};
          var allVirtualIndexes = [];
          function addVirtualIndexes(keyPath, keyTail, lowLevelIndex) {
            var keyPathAlias = getKeyPathAlias(keyPath);
            var indexList = indexLookup[keyPathAlias] = indexLookup[keyPathAlias] || [];
            var keyLength = keyPath == null ? 0 : typeof keyPath === "string" ? 1 : keyPath.length;
            var isVirtual = keyTail > 0;
            var virtualIndex = __assign2(__assign2({}, lowLevelIndex), { name: isVirtual ? "".concat(keyPathAlias, "(virtual-from:").concat(lowLevelIndex.name, ")") : lowLevelIndex.name, lowLevelIndex, isVirtual, keyTail, keyLength, extractKey: getKeyExtractor(keyPath), unique: !isVirtual && lowLevelIndex.unique });
            indexList.push(virtualIndex);
            if (!virtualIndex.isPrimaryKey) {
              allVirtualIndexes.push(virtualIndex);
            }
            if (keyLength > 1) {
              var virtualKeyPath = keyLength === 2 ? keyPath[0] : keyPath.slice(0, keyLength - 1);
              addVirtualIndexes(virtualKeyPath, keyTail + 1, lowLevelIndex);
            }
            indexList.sort(function(a, b) {
              return a.keyTail - b.keyTail;
            });
            return virtualIndex;
          }
          var primaryKey = addVirtualIndexes(schema.primaryKey.keyPath, 0, schema.primaryKey);
          indexLookup[":id"] = [primaryKey];
          for (var _i = 0, _a2 = schema.indexes; _i < _a2.length; _i++) {
            var index = _a2[_i];
            addVirtualIndexes(index.keyPath, 0, index);
          }
          function findBestIndex(keyPath) {
            var result2 = indexLookup[getKeyPathAlias(keyPath)];
            return result2 && result2[0];
          }
          function translateRange(range, keyTail) {
            return {
              type: range.type === 1 ? 2 : range.type,
              lower: pad(range.lower, range.lowerOpen ? down.MAX_KEY : down.MIN_KEY, keyTail),
              lowerOpen: true,
              upper: pad(range.upper, range.upperOpen ? down.MIN_KEY : down.MAX_KEY, keyTail),
              upperOpen: true
            };
          }
          function translateRequest(req) {
            var index2 = req.query.index;
            return index2.isVirtual ? __assign2(__assign2({}, req), { query: {
              index: index2.lowLevelIndex,
              range: translateRange(req.query.range, index2.keyTail)
            } }) : req;
          }
          var result = __assign2(__assign2({}, table), { schema: __assign2(__assign2({}, schema), { primaryKey, indexes: allVirtualIndexes, getIndexByKeyPath: findBestIndex }), count: function(req) {
            return table.count(translateRequest(req));
          }, query: function(req) {
            return table.query(translateRequest(req));
          }, openCursor: function(req) {
            var _a3 = req.query.index, keyTail = _a3.keyTail, isVirtual = _a3.isVirtual, keyLength = _a3.keyLength;
            if (!isVirtual)
              return table.openCursor(req);
            function createVirtualCursor(cursor) {
              function _continue(key) {
                key != null ? cursor.continue(pad(key, req.reverse ? down.MAX_KEY : down.MIN_KEY, keyTail)) : req.unique ? cursor.continue(cursor.key.slice(0, keyLength).concat(req.reverse ? down.MIN_KEY : down.MAX_KEY, keyTail)) : cursor.continue();
              }
              var virtualCursor = Object.create(cursor, {
                continue: { value: _continue },
                continuePrimaryKey: {
                  value: function(key, primaryKey2) {
                    cursor.continuePrimaryKey(pad(key, down.MAX_KEY, keyTail), primaryKey2);
                  }
                },
                primaryKey: {
                  get: function() {
                    return cursor.primaryKey;
                  }
                },
                key: {
                  get: function() {
                    var key = cursor.key;
                    return keyLength === 1 ? key[0] : key.slice(0, keyLength);
                  }
                },
                value: {
                  get: function() {
                    return cursor.value;
                  }
                }
              });
              return virtualCursor;
            }
            return table.openCursor(translateRequest(req)).then(function(cursor) {
              return cursor && createVirtualCursor(cursor);
            });
          } });
          return result;
        } });
      }
      var virtualIndexMiddleware = {
        stack: "dbcore",
        name: "VirtualIndexMiddleware",
        level: 1,
        create: createVirtualIndexMiddleware
      };
      function getObjectDiff(a, b, rv, prfx) {
        rv = rv || {};
        prfx = prfx || "";
        keys(a).forEach(function(prop) {
          if (!hasOwn(b, prop)) {
            rv[prfx + prop] = void 0;
          } else {
            var ap = a[prop], bp = b[prop];
            if (typeof ap === "object" && typeof bp === "object" && ap && bp) {
              var apTypeName = toStringTag(ap);
              var bpTypeName = toStringTag(bp);
              if (apTypeName !== bpTypeName) {
                rv[prfx + prop] = b[prop];
              } else if (apTypeName === "Object") {
                getObjectDiff(ap, bp, rv, prfx + prop + ".");
              } else if (ap !== bp) {
                rv[prfx + prop] = b[prop];
              }
            } else if (ap !== bp)
              rv[prfx + prop] = b[prop];
          }
        });
        keys(b).forEach(function(prop) {
          if (!hasOwn(a, prop)) {
            rv[prfx + prop] = b[prop];
          }
        });
        return rv;
      }
      function getEffectiveKeys(primaryKey, req) {
        if (req.type === "delete")
          return req.keys;
        return req.keys || req.values.map(primaryKey.extractKey);
      }
      var hooksMiddleware = {
        stack: "dbcore",
        name: "HooksMiddleware",
        level: 2,
        create: function(downCore) {
          return __assign2(__assign2({}, downCore), { table: function(tableName) {
            var downTable = downCore.table(tableName);
            var primaryKey = downTable.schema.primaryKey;
            var tableMiddleware = __assign2(__assign2({}, downTable), { mutate: function(req) {
              var dxTrans = PSD.trans;
              var _a2 = dxTrans.table(tableName).hook, deleting = _a2.deleting, creating = _a2.creating, updating = _a2.updating;
              switch (req.type) {
                case "add":
                  if (creating.fire === nop)
                    break;
                  return dxTrans._promise("readwrite", function() {
                    return addPutOrDelete(req);
                  }, true);
                case "put":
                  if (creating.fire === nop && updating.fire === nop)
                    break;
                  return dxTrans._promise("readwrite", function() {
                    return addPutOrDelete(req);
                  }, true);
                case "delete":
                  if (deleting.fire === nop)
                    break;
                  return dxTrans._promise("readwrite", function() {
                    return addPutOrDelete(req);
                  }, true);
                case "deleteRange":
                  if (deleting.fire === nop)
                    break;
                  return dxTrans._promise("readwrite", function() {
                    return deleteRange(req);
                  }, true);
              }
              return downTable.mutate(req);
              function addPutOrDelete(req2) {
                var dxTrans2 = PSD.trans;
                var keys2 = req2.keys || getEffectiveKeys(primaryKey, req2);
                if (!keys2)
                  throw new Error("Keys missing");
                req2 = req2.type === "add" || req2.type === "put" ? __assign2(__assign2({}, req2), { keys: keys2 }) : __assign2({}, req2);
                if (req2.type !== "delete")
                  req2.values = __spreadArray([], req2.values, true);
                if (req2.keys)
                  req2.keys = __spreadArray([], req2.keys, true);
                return getExistingValues(downTable, req2, keys2).then(function(existingValues) {
                  var contexts = keys2.map(function(key, i) {
                    var existingValue = existingValues[i];
                    var ctx = { onerror: null, onsuccess: null };
                    if (req2.type === "delete") {
                      deleting.fire.call(ctx, key, existingValue, dxTrans2);
                    } else if (req2.type === "add" || existingValue === void 0) {
                      var generatedPrimaryKey = creating.fire.call(ctx, key, req2.values[i], dxTrans2);
                      if (key == null && generatedPrimaryKey != null) {
                        key = generatedPrimaryKey;
                        req2.keys[i] = key;
                        if (!primaryKey.outbound) {
                          setByKeyPath(req2.values[i], primaryKey.keyPath, key);
                        }
                      }
                    } else {
                      var objectDiff = getObjectDiff(existingValue, req2.values[i]);
                      var additionalChanges_1 = updating.fire.call(ctx, objectDiff, key, existingValue, dxTrans2);
                      if (additionalChanges_1) {
                        var requestedValue_1 = req2.values[i];
                        Object.keys(additionalChanges_1).forEach(function(keyPath) {
                          if (hasOwn(requestedValue_1, keyPath)) {
                            requestedValue_1[keyPath] = additionalChanges_1[keyPath];
                          } else {
                            setByKeyPath(requestedValue_1, keyPath, additionalChanges_1[keyPath]);
                          }
                        });
                      }
                    }
                    return ctx;
                  });
                  return downTable.mutate(req2).then(function(_a3) {
                    var failures = _a3.failures, results = _a3.results, numFailures = _a3.numFailures, lastResult = _a3.lastResult;
                    for (var i = 0; i < keys2.length; ++i) {
                      var primKey = results ? results[i] : keys2[i];
                      var ctx = contexts[i];
                      if (primKey == null) {
                        ctx.onerror && ctx.onerror(failures[i]);
                      } else {
                        ctx.onsuccess && ctx.onsuccess(
                          req2.type === "put" && existingValues[i] ? req2.values[i] : primKey
                        );
                      }
                    }
                    return { failures, results, numFailures, lastResult };
                  }).catch(function(error) {
                    contexts.forEach(function(ctx) {
                      return ctx.onerror && ctx.onerror(error);
                    });
                    return Promise.reject(error);
                  });
                });
              }
              function deleteRange(req2) {
                return deleteNextChunk(req2.trans, req2.range, 1e4);
              }
              function deleteNextChunk(trans, range, limit) {
                return downTable.query({ trans, values: false, query: { index: primaryKey, range }, limit }).then(function(_a3) {
                  var result = _a3.result;
                  return addPutOrDelete({ type: "delete", keys: result, trans }).then(function(res) {
                    if (res.numFailures > 0)
                      return Promise.reject(res.failures[0]);
                    if (result.length < limit) {
                      return { failures: [], numFailures: 0, lastResult: void 0 };
                    } else {
                      return deleteNextChunk(trans, __assign2(__assign2({}, range), { lower: result[result.length - 1], lowerOpen: true }), limit);
                    }
                  });
                });
              }
            } });
            return tableMiddleware;
          } });
        }
      };
      function getExistingValues(table, req, effectiveKeys) {
        return req.type === "add" ? Promise.resolve([]) : table.getMany({ trans: req.trans, keys: effectiveKeys, cache: "immutable" });
      }
      function getFromTransactionCache(keys2, cache2, clone) {
        try {
          if (!cache2)
            return null;
          if (cache2.keys.length < keys2.length)
            return null;
          var result = [];
          for (var i = 0, j = 0; i < cache2.keys.length && j < keys2.length; ++i) {
            if (cmp2(cache2.keys[i], keys2[j]) !== 0)
              continue;
            result.push(clone ? deepClone(cache2.values[i]) : cache2.values[i]);
            ++j;
          }
          return result.length === keys2.length ? result : null;
        } catch (_a2) {
          return null;
        }
      }
      var cacheExistingValuesMiddleware = {
        stack: "dbcore",
        level: -1,
        create: function(core) {
          return {
            table: function(tableName) {
              var table = core.table(tableName);
              return __assign2(__assign2({}, table), { getMany: function(req) {
                if (!req.cache) {
                  return table.getMany(req);
                }
                var cachedResult = getFromTransactionCache(req.keys, req.trans["_cache"], req.cache === "clone");
                if (cachedResult) {
                  return DexiePromise.resolve(cachedResult);
                }
                return table.getMany(req).then(function(res) {
                  req.trans["_cache"] = {
                    keys: req.keys,
                    values: req.cache === "clone" ? deepClone(res) : res
                  };
                  return res;
                });
              }, mutate: function(req) {
                if (req.type !== "add")
                  req.trans["_cache"] = null;
                return table.mutate(req);
              } });
            }
          };
        }
      };
      function isCachableContext(ctx, table) {
        return ctx.trans.mode === "readonly" && !!ctx.subscr && !ctx.trans.explicit && ctx.trans.db._options.cache !== "disabled" && !table.schema.primaryKey.outbound;
      }
      function isCachableRequest(type2, req) {
        switch (type2) {
          case "query":
            return req.values && !req.unique;
          case "get":
            return false;
          case "getMany":
            return false;
          case "count":
            return false;
          case "openCursor":
            return false;
        }
      }
      var observabilityMiddleware = {
        stack: "dbcore",
        level: 0,
        name: "Observability",
        create: function(core) {
          var dbName = core.schema.name;
          var FULL_RANGE = new RangeSet2(core.MIN_KEY, core.MAX_KEY);
          return __assign2(__assign2({}, core), { transaction: function(stores, mode, options) {
            if (PSD.subscr && mode !== "readonly") {
              throw new exceptions.ReadOnly("Readwrite transaction in liveQuery context. Querier source: ".concat(PSD.querier));
            }
            return core.transaction(stores, mode, options);
          }, table: function(tableName) {
            var table = core.table(tableName);
            var schema = table.schema;
            var primaryKey = schema.primaryKey, indexes = schema.indexes;
            var extractKey = primaryKey.extractKey, outbound = primaryKey.outbound;
            var indexesWithAutoIncPK = primaryKey.autoIncrement && indexes.filter(function(index) {
              return index.compound && index.keyPath.includes(primaryKey.keyPath);
            });
            var tableClone = __assign2(__assign2({}, table), { mutate: function(req) {
              var _a2, _b;
              var trans = req.trans;
              var mutatedParts = req.mutatedParts || (req.mutatedParts = {});
              var getRangeSet = function(indexName) {
                var part = "idb://".concat(dbName, "/").concat(tableName, "/").concat(indexName);
                return mutatedParts[part] || (mutatedParts[part] = new RangeSet2());
              };
              var pkRangeSet = getRangeSet("");
              var delsRangeSet = getRangeSet(":dels");
              var type2 = req.type;
              var _c = req.type === "deleteRange" ? [req.range] : req.type === "delete" ? [req.keys] : req.values.length < 50 ? [getEffectiveKeys(primaryKey, req).filter(function(id) {
                return id;
              }), req.values] : [], keys2 = _c[0], newObjs = _c[1];
              var oldCache = req.trans["_cache"];
              if (isArray(keys2)) {
                pkRangeSet.addKeys(keys2);
                var oldObjs = type2 === "delete" || keys2.length === newObjs.length ? getFromTransactionCache(keys2, oldCache) : null;
                if (!oldObjs) {
                  delsRangeSet.addKeys(keys2);
                }
                if (oldObjs || newObjs) {
                  trackAffectedIndexes(getRangeSet, schema, oldObjs, newObjs);
                }
              } else if (keys2) {
                var range = {
                  from: (_a2 = keys2.lower) !== null && _a2 !== void 0 ? _a2 : core.MIN_KEY,
                  to: (_b = keys2.upper) !== null && _b !== void 0 ? _b : core.MAX_KEY
                };
                delsRangeSet.add(range);
                pkRangeSet.add(range);
              } else {
                pkRangeSet.add(FULL_RANGE);
                delsRangeSet.add(FULL_RANGE);
                schema.indexes.forEach(function(idx) {
                  return getRangeSet(idx.name).add(FULL_RANGE);
                });
              }
              return table.mutate(req).then(function(res) {
                if (keys2 && (req.type === "add" || req.type === "put")) {
                  pkRangeSet.addKeys(res.results);
                  if (indexesWithAutoIncPK) {
                    indexesWithAutoIncPK.forEach(function(idx) {
                      var idxVals = req.values.map(function(v) {
                        return idx.extractKey(v);
                      });
                      var pkPos = idx.keyPath.findIndex(function(prop) {
                        return prop === primaryKey.keyPath;
                      });
                      for (var i = 0, len = res.results.length; i < len; ++i) {
                        idxVals[i][pkPos] = res.results[i];
                      }
                      getRangeSet(idx.name).addKeys(idxVals);
                    });
                  }
                }
                trans.mutatedParts = extendObservabilitySet(trans.mutatedParts || {}, mutatedParts);
                return res;
              });
            } });
            var getRange = function(_a2) {
              var _b, _c;
              var _d = _a2.query, index = _d.index, range = _d.range;
              return [
                index,
                new RangeSet2((_b = range.lower) !== null && _b !== void 0 ? _b : core.MIN_KEY, (_c = range.upper) !== null && _c !== void 0 ? _c : core.MAX_KEY)
              ];
            };
            var readSubscribers = {
              get: function(req) {
                return [primaryKey, new RangeSet2(req.key)];
              },
              getMany: function(req) {
                return [primaryKey, new RangeSet2().addKeys(req.keys)];
              },
              count: getRange,
              query: getRange,
              openCursor: getRange
            };
            keys(readSubscribers).forEach(function(method) {
              tableClone[method] = function(req) {
                var subscr = PSD.subscr;
                var isLiveQuery = !!subscr;
                var cachable = isCachableContext(PSD, table) && isCachableRequest(method, req);
                var obsSet = cachable ? req.obsSet = {} : subscr;
                if (isLiveQuery) {
                  var getRangeSet = function(indexName) {
                    var part = "idb://".concat(dbName, "/").concat(tableName, "/").concat(indexName);
                    return obsSet[part] || (obsSet[part] = new RangeSet2());
                  };
                  var pkRangeSet_1 = getRangeSet("");
                  var delsRangeSet_1 = getRangeSet(":dels");
                  var _a2 = readSubscribers[method](req), queriedIndex = _a2[0], queriedRanges = _a2[1];
                  if (method === "query" && queriedIndex.isPrimaryKey && !req.values) {
                    delsRangeSet_1.add(queriedRanges);
                  } else {
                    getRangeSet(queriedIndex.name || "").add(queriedRanges);
                  }
                  if (!queriedIndex.isPrimaryKey) {
                    if (method === "count") {
                      delsRangeSet_1.add(FULL_RANGE);
                    } else {
                      var keysPromise_1 = method === "query" && outbound && req.values && table.query(__assign2(__assign2({}, req), { values: false }));
                      return table[method].apply(this, arguments).then(function(res) {
                        if (method === "query") {
                          if (outbound && req.values) {
                            return keysPromise_1.then(function(_a3) {
                              var resultingKeys = _a3.result;
                              pkRangeSet_1.addKeys(resultingKeys);
                              return res;
                            });
                          }
                          var pKeys = req.values ? res.result.map(extractKey) : res.result;
                          if (req.values) {
                            pkRangeSet_1.addKeys(pKeys);
                          } else {
                            delsRangeSet_1.addKeys(pKeys);
                          }
                        } else if (method === "openCursor") {
                          var cursor_1 = res;
                          var wantValues_1 = req.values;
                          return cursor_1 && Object.create(cursor_1, {
                            key: {
                              get: function() {
                                delsRangeSet_1.addKey(cursor_1.primaryKey);
                                return cursor_1.key;
                              }
                            },
                            primaryKey: {
                              get: function() {
                                var pkey = cursor_1.primaryKey;
                                delsRangeSet_1.addKey(pkey);
                                return pkey;
                              }
                            },
                            value: {
                              get: function() {
                                wantValues_1 && pkRangeSet_1.addKey(cursor_1.primaryKey);
                                return cursor_1.value;
                              }
                            }
                          });
                        }
                        return res;
                      });
                    }
                  }
                }
                return table[method].apply(this, arguments);
              };
            });
            return tableClone;
          } });
        }
      };
      function trackAffectedIndexes(getRangeSet, schema, oldObjs, newObjs) {
        function addAffectedIndex(ix) {
          var rangeSet = getRangeSet(ix.name || "");
          function extractKey(obj) {
            return obj != null ? ix.extractKey(obj) : null;
          }
          var addKeyOrKeys = function(key) {
            return ix.multiEntry && isArray(key) ? key.forEach(function(key2) {
              return rangeSet.addKey(key2);
            }) : rangeSet.addKey(key);
          };
          (oldObjs || newObjs).forEach(function(_, i) {
            var oldKey = oldObjs && extractKey(oldObjs[i]);
            var newKey = newObjs && extractKey(newObjs[i]);
            if (cmp2(oldKey, newKey) !== 0) {
              if (oldKey != null)
                addKeyOrKeys(oldKey);
              if (newKey != null)
                addKeyOrKeys(newKey);
            }
          });
        }
        schema.indexes.forEach(addAffectedIndex);
      }
      function adjustOptimisticFromFailures(tblCache, req, res) {
        if (res.numFailures === 0)
          return req;
        if (req.type === "deleteRange") {
          return null;
        }
        var numBulkOps = req.keys ? req.keys.length : "values" in req && req.values ? req.values.length : 1;
        if (res.numFailures === numBulkOps) {
          return null;
        }
        var clone = __assign2({}, req);
        if (isArray(clone.keys)) {
          clone.keys = clone.keys.filter(function(_, i) {
            return !(i in res.failures);
          });
        }
        if ("values" in clone && isArray(clone.values)) {
          clone.values = clone.values.filter(function(_, i) {
            return !(i in res.failures);
          });
        }
        return clone;
      }
      function isAboveLower(key, range) {
        return range.lower === void 0 ? true : range.lowerOpen ? cmp2(key, range.lower) > 0 : cmp2(key, range.lower) >= 0;
      }
      function isBelowUpper(key, range) {
        return range.upper === void 0 ? true : range.upperOpen ? cmp2(key, range.upper) < 0 : cmp2(key, range.upper) <= 0;
      }
      function isWithinRange(key, range) {
        return isAboveLower(key, range) && isBelowUpper(key, range);
      }
      function applyOptimisticOps(result, req, ops, table, cacheEntry, immutable) {
        if (!ops || ops.length === 0)
          return result;
        var index = req.query.index;
        var multiEntry = index.multiEntry;
        var queryRange = req.query.range;
        var primaryKey = table.schema.primaryKey;
        var extractPrimKey = primaryKey.extractKey;
        var extractIndex = index.extractKey;
        var extractLowLevelIndex = (index.lowLevelIndex || index).extractKey;
        var finalResult = ops.reduce(function(result2, op) {
          var modifedResult = result2;
          var includedValues = [];
          if (op.type === "add" || op.type === "put") {
            var includedPKs = new RangeSet2();
            for (var i = op.values.length - 1; i >= 0; --i) {
              var value = op.values[i];
              var pk = extractPrimKey(value);
              if (includedPKs.hasKey(pk))
                continue;
              var key = extractIndex(value);
              if (multiEntry && isArray(key) ? key.some(function(k) {
                return isWithinRange(k, queryRange);
              }) : isWithinRange(key, queryRange)) {
                includedPKs.addKey(pk);
                includedValues.push(value);
              }
            }
          }
          switch (op.type) {
            case "add": {
              var existingKeys_1 = new RangeSet2().addKeys(req.values ? result2.map(function(v) {
                return extractPrimKey(v);
              }) : result2);
              modifedResult = result2.concat(req.values ? includedValues.filter(function(v) {
                var key2 = extractPrimKey(v);
                if (existingKeys_1.hasKey(key2))
                  return false;
                existingKeys_1.addKey(key2);
                return true;
              }) : includedValues.map(function(v) {
                return extractPrimKey(v);
              }).filter(function(k) {
                if (existingKeys_1.hasKey(k))
                  return false;
                existingKeys_1.addKey(k);
                return true;
              }));
              break;
            }
            case "put": {
              var keySet_1 = new RangeSet2().addKeys(op.values.map(function(v) {
                return extractPrimKey(v);
              }));
              modifedResult = result2.filter(
                function(item) {
                  return !keySet_1.hasKey(req.values ? extractPrimKey(item) : item);
                }
              ).concat(
                req.values ? includedValues : includedValues.map(function(v) {
                  return extractPrimKey(v);
                })
              );
              break;
            }
            case "delete":
              var keysToDelete_1 = new RangeSet2().addKeys(op.keys);
              modifedResult = result2.filter(function(item) {
                return !keysToDelete_1.hasKey(req.values ? extractPrimKey(item) : item);
              });
              break;
            case "deleteRange":
              var range_1 = op.range;
              modifedResult = result2.filter(function(item) {
                return !isWithinRange(extractPrimKey(item), range_1);
              });
              break;
          }
          return modifedResult;
        }, result);
        if (finalResult === result)
          return result;
        finalResult.sort(function(a, b) {
          return cmp2(extractLowLevelIndex(a), extractLowLevelIndex(b)) || cmp2(extractPrimKey(a), extractPrimKey(b));
        });
        if (req.limit && req.limit < Infinity) {
          if (finalResult.length > req.limit) {
            finalResult.length = req.limit;
          } else if (result.length === req.limit && finalResult.length < req.limit) {
            cacheEntry.dirty = true;
          }
        }
        return immutable ? Object.freeze(finalResult) : finalResult;
      }
      function areRangesEqual(r1, r2) {
        return cmp2(r1.lower, r2.lower) === 0 && cmp2(r1.upper, r2.upper) === 0 && !!r1.lowerOpen === !!r2.lowerOpen && !!r1.upperOpen === !!r2.upperOpen;
      }
      function compareLowers(lower1, lower2, lowerOpen1, lowerOpen2) {
        if (lower1 === void 0)
          return lower2 !== void 0 ? -1 : 0;
        if (lower2 === void 0)
          return 1;
        var c = cmp2(lower1, lower2);
        if (c === 0) {
          if (lowerOpen1 && lowerOpen2)
            return 0;
          if (lowerOpen1)
            return 1;
          if (lowerOpen2)
            return -1;
        }
        return c;
      }
      function compareUppers(upper1, upper2, upperOpen1, upperOpen2) {
        if (upper1 === void 0)
          return upper2 !== void 0 ? 1 : 0;
        if (upper2 === void 0)
          return -1;
        var c = cmp2(upper1, upper2);
        if (c === 0) {
          if (upperOpen1 && upperOpen2)
            return 0;
          if (upperOpen1)
            return -1;
          if (upperOpen2)
            return 1;
        }
        return c;
      }
      function isSuperRange(r1, r2) {
        return compareLowers(r1.lower, r2.lower, r1.lowerOpen, r2.lowerOpen) <= 0 && compareUppers(r1.upper, r2.upper, r1.upperOpen, r2.upperOpen) >= 0;
      }
      function findCompatibleQuery(dbName, tableName, type2, req) {
        var tblCache = cache["idb://".concat(dbName, "/").concat(tableName)];
        if (!tblCache)
          return [];
        var queries = tblCache.queries[type2];
        if (!queries)
          return [null, false, tblCache, null];
        var indexName = req.query ? req.query.index.name : null;
        var entries = queries[indexName || ""];
        if (!entries)
          return [null, false, tblCache, null];
        switch (type2) {
          case "query":
            var equalEntry = entries.find(function(entry) {
              return entry.req.limit === req.limit && entry.req.values === req.values && areRangesEqual(entry.req.query.range, req.query.range);
            });
            if (equalEntry)
              return [
                equalEntry,
                true,
                tblCache,
                entries
              ];
            var superEntry = entries.find(function(entry) {
              var limit = "limit" in entry.req ? entry.req.limit : Infinity;
              return limit >= req.limit && (req.values ? entry.req.values : true) && isSuperRange(entry.req.query.range, req.query.range);
            });
            return [superEntry, false, tblCache, entries];
          case "count":
            var countQuery = entries.find(function(entry) {
              return areRangesEqual(entry.req.query.range, req.query.range);
            });
            return [countQuery, !!countQuery, tblCache, entries];
        }
      }
      function subscribeToCacheEntry(cacheEntry, container, requery, signal) {
        cacheEntry.subscribers.add(requery);
        signal.addEventListener("abort", function() {
          cacheEntry.subscribers.delete(requery);
          if (cacheEntry.subscribers.size === 0) {
            enqueForDeletion(cacheEntry, container);
          }
        });
      }
      function enqueForDeletion(cacheEntry, container) {
        setTimeout(function() {
          if (cacheEntry.subscribers.size === 0) {
            delArrayItem(container, cacheEntry);
          }
        }, 3e3);
      }
      var cacheMiddleware = {
        stack: "dbcore",
        level: 0,
        name: "Cache",
        create: function(core) {
          var dbName = core.schema.name;
          var coreMW = __assign2(__assign2({}, core), { transaction: function(stores, mode, options) {
            var idbtrans = core.transaction(stores, mode, options);
            if (mode === "readwrite") {
              var ac_1 = new AbortController();
              var signal = ac_1.signal;
              var endTransaction = function(wasCommitted) {
                return function() {
                  ac_1.abort();
                  if (mode === "readwrite") {
                    var affectedSubscribers_1 = /* @__PURE__ */ new Set();
                    for (var _i = 0, stores_1 = stores; _i < stores_1.length; _i++) {
                      var storeName = stores_1[_i];
                      var tblCache = cache["idb://".concat(dbName, "/").concat(storeName)];
                      if (tblCache) {
                        var table = core.table(storeName);
                        var ops = tblCache.optimisticOps.filter(function(op) {
                          return op.trans === idbtrans;
                        });
                        if (idbtrans._explicit && wasCommitted && idbtrans.mutatedParts) {
                          for (var _a2 = 0, _b = Object.values(tblCache.queries.query); _a2 < _b.length; _a2++) {
                            var entries = _b[_a2];
                            for (var _c = 0, _d = entries.slice(); _c < _d.length; _c++) {
                              var entry = _d[_c];
                              if (obsSetsOverlap(entry.obsSet, idbtrans.mutatedParts)) {
                                delArrayItem(entries, entry);
                                entry.subscribers.forEach(function(requery) {
                                  return affectedSubscribers_1.add(requery);
                                });
                              }
                            }
                          }
                        } else if (ops.length > 0) {
                          tblCache.optimisticOps = tblCache.optimisticOps.filter(function(op) {
                            return op.trans !== idbtrans;
                          });
                          for (var _e = 0, _f = Object.values(tblCache.queries.query); _e < _f.length; _e++) {
                            var entries = _f[_e];
                            for (var _g = 0, _h = entries.slice(); _g < _h.length; _g++) {
                              var entry = _h[_g];
                              if (entry.res != null && idbtrans.mutatedParts) {
                                if (wasCommitted && !entry.dirty) {
                                  var freezeResults = Object.isFrozen(entry.res);
                                  var modRes = applyOptimisticOps(entry.res, entry.req, ops, table, entry, freezeResults);
                                  if (entry.dirty) {
                                    delArrayItem(entries, entry);
                                    entry.subscribers.forEach(function(requery) {
                                      return affectedSubscribers_1.add(requery);
                                    });
                                  } else if (modRes !== entry.res) {
                                    entry.res = modRes;
                                    entry.promise = DexiePromise.resolve({ result: modRes });
                                  }
                                } else {
                                  if (entry.dirty) {
                                    delArrayItem(entries, entry);
                                  }
                                  entry.subscribers.forEach(function(requery) {
                                    return affectedSubscribers_1.add(requery);
                                  });
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                    affectedSubscribers_1.forEach(function(requery) {
                      return requery();
                    });
                  }
                };
              };
              idbtrans.addEventListener("abort", endTransaction(false), {
                signal
              });
              idbtrans.addEventListener("error", endTransaction(false), {
                signal
              });
              idbtrans.addEventListener("complete", endTransaction(true), {
                signal
              });
            }
            return idbtrans;
          }, table: function(tableName) {
            var downTable = core.table(tableName);
            var primKey = downTable.schema.primaryKey;
            var tableMW = __assign2(__assign2({}, downTable), { mutate: function(req) {
              var trans = PSD.trans;
              if (primKey.outbound || trans.db._options.cache === "disabled" || trans.explicit || trans.idbtrans.mode !== "readwrite") {
                return downTable.mutate(req);
              }
              var tblCache = cache["idb://".concat(dbName, "/").concat(tableName)];
              if (!tblCache)
                return downTable.mutate(req);
              var promise = downTable.mutate(req);
              if ((req.type === "add" || req.type === "put") && (req.values.length >= 50 || getEffectiveKeys(primKey, req).some(function(key) {
                return key == null;
              }))) {
                promise.then(function(res) {
                  var reqWithResolvedKeys = __assign2(__assign2({}, req), { values: req.values.map(function(value, i) {
                    var _a2;
                    if (res.failures[i])
                      return value;
                    var valueWithKey = ((_a2 = primKey.keyPath) === null || _a2 === void 0 ? void 0 : _a2.includes(".")) ? deepClone(value) : __assign2({}, value);
                    setByKeyPath(valueWithKey, primKey.keyPath, res.results[i]);
                    return valueWithKey;
                  }) });
                  var adjustedReq = adjustOptimisticFromFailures(tblCache, reqWithResolvedKeys, res);
                  tblCache.optimisticOps.push(adjustedReq);
                  queueMicrotask(function() {
                    return req.mutatedParts && signalSubscribersLazily(req.mutatedParts);
                  });
                });
              } else {
                tblCache.optimisticOps.push(req);
                req.mutatedParts && signalSubscribersLazily(req.mutatedParts);
                promise.then(function(res) {
                  if (res.numFailures > 0) {
                    delArrayItem(tblCache.optimisticOps, req);
                    var adjustedReq = adjustOptimisticFromFailures(tblCache, req, res);
                    if (adjustedReq) {
                      tblCache.optimisticOps.push(adjustedReq);
                    }
                    req.mutatedParts && signalSubscribersLazily(req.mutatedParts);
                  }
                });
                promise.catch(function() {
                  delArrayItem(tblCache.optimisticOps, req);
                  req.mutatedParts && signalSubscribersLazily(req.mutatedParts);
                });
              }
              return promise;
            }, query: function(req) {
              var _a2;
              if (!isCachableContext(PSD, downTable) || !isCachableRequest("query", req))
                return downTable.query(req);
              var freezeResults = ((_a2 = PSD.trans) === null || _a2 === void 0 ? void 0 : _a2.db._options.cache) === "immutable";
              var _b = PSD, requery = _b.requery, signal = _b.signal;
              var _c = findCompatibleQuery(dbName, tableName, "query", req), cacheEntry = _c[0], exactMatch = _c[1], tblCache = _c[2], container = _c[3];
              if (cacheEntry && exactMatch) {
                cacheEntry.obsSet = req.obsSet;
              } else {
                var promise = downTable.query(req).then(function(res) {
                  var result = res.result;
                  if (cacheEntry)
                    cacheEntry.res = result;
                  if (freezeResults) {
                    for (var i = 0, l = result.length; i < l; ++i) {
                      Object.freeze(result[i]);
                    }
                    Object.freeze(result);
                  } else {
                    res.result = deepClone(result);
                  }
                  return res;
                }).catch(function(error) {
                  if (container && cacheEntry)
                    delArrayItem(container, cacheEntry);
                  return Promise.reject(error);
                });
                cacheEntry = {
                  obsSet: req.obsSet,
                  promise,
                  subscribers: /* @__PURE__ */ new Set(),
                  type: "query",
                  req,
                  dirty: false
                };
                if (container) {
                  container.push(cacheEntry);
                } else {
                  container = [cacheEntry];
                  if (!tblCache) {
                    tblCache = cache["idb://".concat(dbName, "/").concat(tableName)] = {
                      queries: {
                        query: {},
                        count: {}
                      },
                      objs: /* @__PURE__ */ new Map(),
                      optimisticOps: [],
                      unsignaledParts: {}
                    };
                  }
                  tblCache.queries.query[req.query.index.name || ""] = container;
                }
              }
              subscribeToCacheEntry(cacheEntry, container, requery, signal);
              return cacheEntry.promise.then(function(res) {
                return {
                  result: applyOptimisticOps(res.result, req, tblCache === null || tblCache === void 0 ? void 0 : tblCache.optimisticOps, downTable, cacheEntry, freezeResults)
                };
              });
            } });
            return tableMW;
          } });
          return coreMW;
        }
      };
      function vipify(target, vipDb) {
        return new Proxy(target, {
          get: function(target2, prop, receiver) {
            if (prop === "db")
              return vipDb;
            return Reflect.get(target2, prop, receiver);
          }
        });
      }
      var Dexie$1 = function() {
        function Dexie3(name, options) {
          var _this = this;
          this._middlewares = {};
          this.verno = 0;
          var deps = Dexie3.dependencies;
          this._options = options = __assign2({
            addons: Dexie3.addons,
            autoOpen: true,
            indexedDB: deps.indexedDB,
            IDBKeyRange: deps.IDBKeyRange,
            cache: "cloned"
          }, options);
          this._deps = {
            indexedDB: options.indexedDB,
            IDBKeyRange: options.IDBKeyRange
          };
          var addons = options.addons;
          this._dbSchema = {};
          this._versions = [];
          this._storeNames = [];
          this._allTables = {};
          this.idbdb = null;
          this._novip = this;
          var state = {
            dbOpenError: null,
            isBeingOpened: false,
            onReadyBeingFired: null,
            openComplete: false,
            dbReadyResolve: nop,
            dbReadyPromise: null,
            cancelOpen: nop,
            openCanceller: null,
            autoSchema: true,
            PR1398_maxLoop: 3,
            autoOpen: options.autoOpen
          };
          state.dbReadyPromise = new DexiePromise(function(resolve) {
            state.dbReadyResolve = resolve;
          });
          state.openCanceller = new DexiePromise(function(_, reject) {
            state.cancelOpen = reject;
          });
          this._state = state;
          this.name = name;
          this.on = Events(this, "populate", "blocked", "versionchange", "close", { ready: [promisableChain, nop] });
          this.on.ready.subscribe = override(this.on.ready.subscribe, function(subscribe) {
            return function(subscriber, bSticky) {
              Dexie3.vip(function() {
                var state2 = _this._state;
                if (state2.openComplete) {
                  if (!state2.dbOpenError)
                    DexiePromise.resolve().then(subscriber);
                  if (bSticky)
                    subscribe(subscriber);
                } else if (state2.onReadyBeingFired) {
                  state2.onReadyBeingFired.push(subscriber);
                  if (bSticky)
                    subscribe(subscriber);
                } else {
                  subscribe(subscriber);
                  var db_1 = _this;
                  if (!bSticky)
                    subscribe(function unsubscribe() {
                      db_1.on.ready.unsubscribe(subscriber);
                      db_1.on.ready.unsubscribe(unsubscribe);
                    });
                }
              });
            };
          });
          this.Collection = createCollectionConstructor(this);
          this.Table = createTableConstructor(this);
          this.Transaction = createTransactionConstructor(this);
          this.Version = createVersionConstructor(this);
          this.WhereClause = createWhereClauseConstructor(this);
          this.on("versionchange", function(ev) {
            if (ev.newVersion > 0)
              console.warn("Another connection wants to upgrade database '".concat(_this.name, "'. Closing db now to resume the upgrade."));
            else
              console.warn("Another connection wants to delete database '".concat(_this.name, "'. Closing db now to resume the delete request."));
            _this.close({ disableAutoOpen: false });
          });
          this.on("blocked", function(ev) {
            if (!ev.newVersion || ev.newVersion < ev.oldVersion)
              console.warn("Dexie.delete('".concat(_this.name, "') was blocked"));
            else
              console.warn("Upgrade '".concat(_this.name, "' blocked by other connection holding version ").concat(ev.oldVersion / 10));
          });
          this._maxKey = getMaxKey(options.IDBKeyRange);
          this._createTransaction = function(mode, storeNames, dbschema, parentTransaction) {
            return new _this.Transaction(mode, storeNames, dbschema, _this._options.chromeTransactionDurability, parentTransaction);
          };
          this._fireOnBlocked = function(ev) {
            _this.on("blocked").fire(ev);
            connections.filter(function(c) {
              return c.name === _this.name && c !== _this && !c._state.vcFired;
            }).map(function(c) {
              return c.on("versionchange").fire(ev);
            });
          };
          this.use(cacheExistingValuesMiddleware);
          this.use(cacheMiddleware);
          this.use(observabilityMiddleware);
          this.use(virtualIndexMiddleware);
          this.use(hooksMiddleware);
          var vipDB = new Proxy(this, {
            get: function(_, prop, receiver) {
              if (prop === "_vip")
                return true;
              if (prop === "table")
                return function(tableName) {
                  return vipify(_this.table(tableName), vipDB);
                };
              var rv = Reflect.get(_, prop, receiver);
              if (rv instanceof Table)
                return vipify(rv, vipDB);
              if (prop === "tables")
                return rv.map(function(t) {
                  return vipify(t, vipDB);
                });
              if (prop === "_createTransaction")
                return function() {
                  var tx = rv.apply(this, arguments);
                  return vipify(tx, vipDB);
                };
              return rv;
            }
          });
          this.vip = vipDB;
          addons.forEach(function(addon) {
            return addon(_this);
          });
        }
        Dexie3.prototype.version = function(versionNumber) {
          if (isNaN(versionNumber) || versionNumber < 0.1)
            throw new exceptions.Type("Given version is not a positive number");
          versionNumber = Math.round(versionNumber * 10) / 10;
          if (this.idbdb || this._state.isBeingOpened)
            throw new exceptions.Schema("Cannot add version when database is open");
          this.verno = Math.max(this.verno, versionNumber);
          var versions = this._versions;
          var versionInstance = versions.filter(function(v) {
            return v._cfg.version === versionNumber;
          })[0];
          if (versionInstance)
            return versionInstance;
          versionInstance = new this.Version(versionNumber);
          versions.push(versionInstance);
          versions.sort(lowerVersionFirst);
          versionInstance.stores({});
          this._state.autoSchema = false;
          return versionInstance;
        };
        Dexie3.prototype._whenReady = function(fn) {
          var _this = this;
          return this.idbdb && (this._state.openComplete || PSD.letThrough || this._vip) ? fn() : new DexiePromise(function(resolve, reject) {
            if (_this._state.openComplete) {
              return reject(new exceptions.DatabaseClosed(_this._state.dbOpenError));
            }
            if (!_this._state.isBeingOpened) {
              if (!_this._state.autoOpen) {
                reject(new exceptions.DatabaseClosed());
                return;
              }
              _this.open().catch(nop);
            }
            _this._state.dbReadyPromise.then(resolve, reject);
          }).then(fn);
        };
        Dexie3.prototype.use = function(_a2) {
          var stack = _a2.stack, create = _a2.create, level = _a2.level, name = _a2.name;
          if (name)
            this.unuse({ stack, name });
          var middlewares = this._middlewares[stack] || (this._middlewares[stack] = []);
          middlewares.push({ stack, create, level: level == null ? 10 : level, name });
          middlewares.sort(function(a, b) {
            return a.level - b.level;
          });
          return this;
        };
        Dexie3.prototype.unuse = function(_a2) {
          var stack = _a2.stack, name = _a2.name, create = _a2.create;
          if (stack && this._middlewares[stack]) {
            this._middlewares[stack] = this._middlewares[stack].filter(function(mw) {
              return create ? mw.create !== create : name ? mw.name !== name : false;
            });
          }
          return this;
        };
        Dexie3.prototype.open = function() {
          var _this = this;
          return usePSD(
            globalPSD,
            function() {
              return dexieOpen(_this);
            }
          );
        };
        Dexie3.prototype._close = function() {
          var state = this._state;
          var idx = connections.indexOf(this);
          if (idx >= 0)
            connections.splice(idx, 1);
          if (this.idbdb) {
            try {
              this.idbdb.close();
            } catch (e) {
            }
            this.idbdb = null;
          }
          if (!state.isBeingOpened) {
            state.dbReadyPromise = new DexiePromise(function(resolve) {
              state.dbReadyResolve = resolve;
            });
            state.openCanceller = new DexiePromise(function(_, reject) {
              state.cancelOpen = reject;
            });
          }
        };
        Dexie3.prototype.close = function(_a2) {
          var _b = _a2 === void 0 ? { disableAutoOpen: true } : _a2, disableAutoOpen = _b.disableAutoOpen;
          var state = this._state;
          if (disableAutoOpen) {
            if (state.isBeingOpened) {
              state.cancelOpen(new exceptions.DatabaseClosed());
            }
            this._close();
            state.autoOpen = false;
            state.dbOpenError = new exceptions.DatabaseClosed();
          } else {
            this._close();
            state.autoOpen = this._options.autoOpen || state.isBeingOpened;
            state.openComplete = false;
            state.dbOpenError = null;
          }
        };
        Dexie3.prototype.delete = function(closeOptions) {
          var _this = this;
          if (closeOptions === void 0) {
            closeOptions = { disableAutoOpen: true };
          }
          var hasInvalidArguments = arguments.length > 0 && typeof arguments[0] !== "object";
          var state = this._state;
          return new DexiePromise(function(resolve, reject) {
            var doDelete = function() {
              _this.close(closeOptions);
              var req = _this._deps.indexedDB.deleteDatabase(_this.name);
              req.onsuccess = wrap(function() {
                _onDatabaseDeleted(_this._deps, _this.name);
                resolve();
              });
              req.onerror = eventRejectHandler(reject);
              req.onblocked = _this._fireOnBlocked;
            };
            if (hasInvalidArguments)
              throw new exceptions.InvalidArgument("Invalid closeOptions argument to db.delete()");
            if (state.isBeingOpened) {
              state.dbReadyPromise.then(doDelete);
            } else {
              doDelete();
            }
          });
        };
        Dexie3.prototype.backendDB = function() {
          return this.idbdb;
        };
        Dexie3.prototype.isOpen = function() {
          return this.idbdb !== null;
        };
        Dexie3.prototype.hasBeenClosed = function() {
          var dbOpenError = this._state.dbOpenError;
          return dbOpenError && dbOpenError.name === "DatabaseClosed";
        };
        Dexie3.prototype.hasFailed = function() {
          return this._state.dbOpenError !== null;
        };
        Dexie3.prototype.dynamicallyOpened = function() {
          return this._state.autoSchema;
        };
        Object.defineProperty(Dexie3.prototype, "tables", {
          get: function() {
            var _this = this;
            return keys(this._allTables).map(function(name) {
              return _this._allTables[name];
            });
          },
          enumerable: false,
          configurable: true
        });
        Dexie3.prototype.transaction = function() {
          var args = extractTransactionArgs.apply(this, arguments);
          return this._transaction.apply(this, args);
        };
        Dexie3.prototype._transaction = function(mode, tables, scopeFunc) {
          var _this = this;
          var parentTransaction = PSD.trans;
          if (!parentTransaction || parentTransaction.db !== this || mode.indexOf("!") !== -1)
            parentTransaction = null;
          var onlyIfCompatible = mode.indexOf("?") !== -1;
          mode = mode.replace("!", "").replace("?", "");
          var idbMode, storeNames;
          try {
            storeNames = tables.map(function(table) {
              var storeName = table instanceof _this.Table ? table.name : table;
              if (typeof storeName !== "string")
                throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
              return storeName;
            });
            if (mode == "r" || mode === READONLY)
              idbMode = READONLY;
            else if (mode == "rw" || mode == READWRITE)
              idbMode = READWRITE;
            else
              throw new exceptions.InvalidArgument("Invalid transaction mode: " + mode);
            if (parentTransaction) {
              if (parentTransaction.mode === READONLY && idbMode === READWRITE) {
                if (onlyIfCompatible) {
                  parentTransaction = null;
                } else
                  throw new exceptions.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
              }
              if (parentTransaction) {
                storeNames.forEach(function(storeName) {
                  if (parentTransaction && parentTransaction.storeNames.indexOf(storeName) === -1) {
                    if (onlyIfCompatible) {
                      parentTransaction = null;
                    } else
                      throw new exceptions.SubTransaction("Table " + storeName + " not included in parent transaction.");
                  }
                });
              }
              if (onlyIfCompatible && parentTransaction && !parentTransaction.active) {
                parentTransaction = null;
              }
            }
          } catch (e) {
            return parentTransaction ? parentTransaction._promise(null, function(_, reject) {
              reject(e);
            }) : rejection(e);
          }
          var enterTransaction = enterTransactionScope.bind(null, this, idbMode, storeNames, parentTransaction, scopeFunc);
          return parentTransaction ? parentTransaction._promise(idbMode, enterTransaction, "lock") : PSD.trans ? usePSD(PSD.transless, function() {
            return _this._whenReady(enterTransaction);
          }) : this._whenReady(enterTransaction);
        };
        Dexie3.prototype.table = function(tableName) {
          if (!hasOwn(this._allTables, tableName)) {
            throw new exceptions.InvalidTable("Table ".concat(tableName, " does not exist"));
          }
          return this._allTables[tableName];
        };
        return Dexie3;
      }();
      var symbolObservable = typeof Symbol !== "undefined" && "observable" in Symbol ? Symbol.observable : "@@observable";
      var Observable = function() {
        function Observable2(subscribe) {
          this._subscribe = subscribe;
        }
        Observable2.prototype.subscribe = function(x, error, complete) {
          return this._subscribe(!x || typeof x === "function" ? { next: x, error, complete } : x);
        };
        Observable2.prototype[symbolObservable] = function() {
          return this;
        };
        return Observable2;
      }();
      var domDeps;
      try {
        domDeps = {
          indexedDB: _global2.indexedDB || _global2.mozIndexedDB || _global2.webkitIndexedDB || _global2.msIndexedDB,
          IDBKeyRange: _global2.IDBKeyRange || _global2.webkitIDBKeyRange
        };
      } catch (e) {
        domDeps = { indexedDB: null, IDBKeyRange: null };
      }
      function liveQuery2(querier) {
        var hasValue = false;
        var currentValue;
        var observable = new Observable(function(observer) {
          var scopeFuncIsAsync = isAsyncFunction(querier);
          function execute(ctx) {
            var wasRootExec = beginMicroTickScope();
            try {
              if (scopeFuncIsAsync) {
                incrementExpectedAwaits();
              }
              var rv = newScope(querier, ctx);
              if (scopeFuncIsAsync) {
                rv = rv.finally(decrementExpectedAwaits);
              }
              return rv;
            } finally {
              wasRootExec && endMicroTickScope();
            }
          }
          var closed = false;
          var abortController;
          var accumMuts = {};
          var currentObs = {};
          var subscription = {
            get closed() {
              return closed;
            },
            unsubscribe: function() {
              if (closed)
                return;
              closed = true;
              if (abortController)
                abortController.abort();
              if (startedListening)
                globalEvents.storagemutated.unsubscribe(mutationListener);
            }
          };
          observer.start && observer.start(subscription);
          var startedListening = false;
          var doQuery = function() {
            return execInGlobalContext(_doQuery);
          };
          function shouldNotify() {
            return obsSetsOverlap(currentObs, accumMuts);
          }
          var mutationListener = function(parts) {
            extendObservabilitySet(accumMuts, parts);
            if (shouldNotify()) {
              doQuery();
            }
          };
          var _doQuery = function() {
            if (closed || !domDeps.indexedDB) {
              return;
            }
            accumMuts = {};
            var subscr = {};
            if (abortController)
              abortController.abort();
            abortController = new AbortController();
            var ctx = {
              subscr,
              signal: abortController.signal,
              requery: doQuery,
              querier,
              trans: null
            };
            var ret = execute(ctx);
            Promise.resolve(ret).then(function(result) {
              hasValue = true;
              currentValue = result;
              if (closed || ctx.signal.aborted) {
                return;
              }
              accumMuts = {};
              currentObs = subscr;
              if (!objectIsEmpty(currentObs) && !startedListening) {
                globalEvents(DEXIE_STORAGE_MUTATED_EVENT_NAME, mutationListener);
                startedListening = true;
              }
              execInGlobalContext(function() {
                return !closed && observer.next && observer.next(result);
              });
            }, function(err) {
              hasValue = false;
              if (!["DatabaseClosedError", "AbortError"].includes(err === null || err === void 0 ? void 0 : err.name)) {
                if (!closed)
                  execInGlobalContext(function() {
                    if (closed)
                      return;
                    observer.error && observer.error(err);
                  });
              }
            });
          };
          setTimeout(doQuery, 0);
          return subscription;
        });
        observable.hasValue = function() {
          return hasValue;
        };
        observable.getValue = function() {
          return currentValue;
        };
        return observable;
      }
      var Dexie2 = Dexie$1;
      props(Dexie2, __assign2(__assign2({}, fullNameExceptions), {
        delete: function(databaseName) {
          var db = new Dexie2(databaseName, { addons: [] });
          return db.delete();
        },
        exists: function(name) {
          return new Dexie2(name, { addons: [] }).open().then(function(db) {
            db.close();
            return true;
          }).catch("NoSuchDatabaseError", function() {
            return false;
          });
        },
        getDatabaseNames: function(cb) {
          try {
            return getDatabaseNames(Dexie2.dependencies).then(cb);
          } catch (_a2) {
            return rejection(new exceptions.MissingAPI());
          }
        },
        defineClass: function() {
          function Class(content) {
            extend(this, content);
          }
          return Class;
        },
        ignoreTransaction: function(scopeFunc) {
          return PSD.trans ? usePSD(PSD.transless, scopeFunc) : scopeFunc();
        },
        vip,
        async: function(generatorFn) {
          return function() {
            try {
              var rv = awaitIterator(generatorFn.apply(this, arguments));
              if (!rv || typeof rv.then !== "function")
                return DexiePromise.resolve(rv);
              return rv;
            } catch (e) {
              return rejection(e);
            }
          };
        },
        spawn: function(generatorFn, args, thiz) {
          try {
            var rv = awaitIterator(generatorFn.apply(thiz, args || []));
            if (!rv || typeof rv.then !== "function")
              return DexiePromise.resolve(rv);
            return rv;
          } catch (e) {
            return rejection(e);
          }
        },
        currentTransaction: {
          get: function() {
            return PSD.trans || null;
          }
        },
        waitFor: function(promiseOrFunction, optionalTimeout) {
          var promise = DexiePromise.resolve(typeof promiseOrFunction === "function" ? Dexie2.ignoreTransaction(promiseOrFunction) : promiseOrFunction).timeout(optionalTimeout || 6e4);
          return PSD.trans ? PSD.trans.waitFor(promise) : promise;
        },
        Promise: DexiePromise,
        debug: {
          get: function() {
            return debug;
          },
          set: function(value) {
            setDebug(value);
          }
        },
        derive,
        extend,
        props,
        override,
        Events,
        on: globalEvents,
        liveQuery: liveQuery2,
        extendObservabilitySet,
        getByKeyPath,
        setByKeyPath,
        delByKeyPath,
        shallowClone,
        deepClone,
        getObjectDiff,
        cmp: cmp2,
        asap: asap$1,
        minKey,
        addons: [],
        connections,
        errnames,
        dependencies: domDeps,
        cache,
        semVer: DEXIE_VERSION,
        version: DEXIE_VERSION.split(".").map(function(n) {
          return parseInt(n);
        }).reduce(function(p, c, i) {
          return p + c / Math.pow(10, i * 2);
        })
      }));
      Dexie2.maxKey = getMaxKey(Dexie2.dependencies.IDBKeyRange);
      if (typeof dispatchEvent !== "undefined" && typeof addEventListener !== "undefined") {
        globalEvents(DEXIE_STORAGE_MUTATED_EVENT_NAME, function(updatedParts) {
          if (!propagatingLocally) {
            var event_1;
            event_1 = new CustomEvent(STORAGE_MUTATED_DOM_EVENT_NAME, {
              detail: updatedParts
            });
            propagatingLocally = true;
            dispatchEvent(event_1);
            propagatingLocally = false;
          }
        });
        addEventListener(STORAGE_MUTATED_DOM_EVENT_NAME, function(_a2) {
          var detail = _a2.detail;
          if (!propagatingLocally) {
            propagateLocally(detail);
          }
        });
      }
      function propagateLocally(updateParts) {
        var wasMe = propagatingLocally;
        try {
          propagatingLocally = true;
          globalEvents.storagemutated.fire(updateParts);
          signalSubscribersNow(updateParts, true);
        } finally {
          propagatingLocally = wasMe;
        }
      }
      var propagatingLocally = false;
      var bc;
      var createBC = function() {
      };
      if (typeof BroadcastChannel !== "undefined") {
        createBC = function() {
          bc = new BroadcastChannel(STORAGE_MUTATED_DOM_EVENT_NAME);
          bc.onmessage = function(ev) {
            return ev.data && propagateLocally(ev.data);
          };
        };
        createBC();
        if (typeof bc.unref === "function") {
          bc.unref();
        }
        globalEvents(DEXIE_STORAGE_MUTATED_EVENT_NAME, function(changedParts) {
          if (!propagatingLocally) {
            bc.postMessage(changedParts);
          }
        });
      }
      if (typeof addEventListener !== "undefined") {
        addEventListener("pagehide", function(event) {
          if (!Dexie$1.disableBfCache && event.persisted) {
            if (debug)
              console.debug("Dexie: handling persisted pagehide");
            bc === null || bc === void 0 ? void 0 : bc.close();
            for (var _i = 0, connections_1 = connections; _i < connections_1.length; _i++) {
              var db = connections_1[_i];
              db.close({ disableAutoOpen: false });
            }
          }
        });
        addEventListener("pageshow", function(event) {
          if (!Dexie$1.disableBfCache && event.persisted) {
            if (debug)
              console.debug("Dexie: handling persisted pageshow");
            createBC();
            propagateLocally({ all: new RangeSet2(-Infinity, [[]]) });
          }
        });
      }
      function add2(value) {
        return new PropModification2({ add: value });
      }
      function remove2(value) {
        return new PropModification2({ remove: value });
      }
      function replacePrefix2(a, b) {
        return new PropModification2({ replacePrefix: [a, b] });
      }
      DexiePromise.rejectionMapper = mapError;
      setDebug(debug);
      var namedExports = /* @__PURE__ */ Object.freeze({
        __proto__: null,
        Dexie: Dexie$1,
        liveQuery: liveQuery2,
        Entity: Entity2,
        cmp: cmp2,
        PropModification: PropModification2,
        replacePrefix: replacePrefix2,
        add: add2,
        remove: remove2,
        "default": Dexie$1,
        RangeSet: RangeSet2,
        mergeRanges: mergeRanges2,
        rangesOverlap: rangesOverlap2
      });
      __assign2(Dexie$1, namedExports, { default: Dexie$1 });
      return Dexie$1;
    });
  }
});

// node_modules/dexie/import-wrapper.mjs
var import_dexie = __toESM(require_dexie(), 1);
var DexieSymbol = Symbol.for("Dexie");
var Dexie = globalThis[DexieSymbol] || (globalThis[DexieSymbol] = import_dexie.default);
if (import_dexie.default.semVer !== Dexie.semVer) {
  throw new Error(`Two different versions of Dexie loaded in the same app: ${import_dexie.default.semVer} and ${Dexie.semVer}`);
}
var {
  liveQuery,
  mergeRanges,
  rangesOverlap,
  RangeSet,
  cmp,
  Entity,
  PropModification,
  replacePrefix,
  add,
  remove
} = Dexie;
var import_wrapper_default = Dexie;

// node_modules/dexie-export-import/dist/dexie-export-import.mjs
var __assign = function() {
  __assign = Object.assign || function __assign2(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1) throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (_) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0:
        case 1:
          t = op;
          break;
        case 4:
          _.label++;
          return { value: op[1], done: false };
        case 5:
          _.label++;
          y = op[1];
          op = [0];
          continue;
        case 7:
          op = _.ops.pop();
          _.trys.pop();
          continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _ = 0;
            continue;
          }
          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _.label = op[1];
            break;
          }
          if (op[0] === 6 && _.label < t[1]) {
            _.label = t[1];
            t = op;
            break;
          }
          if (t && _.label < t[2]) {
            _.label = t[2];
            _.ops.push(op);
            break;
          }
          if (t[2]) _.ops.pop();
          _.trys.pop();
          continue;
      }
      op = body.call(thisArg, _);
    } catch (e) {
      op = [6, e];
      y = 0;
    } finally {
      f = t = 0;
    }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
}
function getSchemaString(table) {
  var primKeyAndIndexes = [table.schema.primKey].concat(table.schema.indexes);
  return primKeyAndIndexes.map(function(index) {
    return index.src;
  }).join(",");
}
function extractDbSchema(exportedDb) {
  var schema = {};
  for (var _i = 0, _a = exportedDb.tables; _i < _a.length; _i++) {
    var table = _a[_i];
    schema[table.name] = table.schema;
  }
  return schema;
}
function readBlobAsync(blob, type) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onabort = function(ev) {
      return reject(new Error("file read aborted"));
    };
    reader.onerror = function(ev) {
      return reject(ev.target.error);
    };
    reader.onload = function(ev) {
      return resolve(ev.target.result);
    };
    if (type === "binary")
      reader.readAsArrayBuffer(blob);
    else
      reader.readAsText(blob);
  });
}
function readBlobSync(blob, type) {
  if (typeof FileReaderSync === "undefined") {
    throw new Error("FileReaderSync missing. Reading blobs synchronously requires code to run from within a web worker. Use TSON.encapsulateAsync() to do it from the main thread.");
  }
  var reader = new FileReaderSync();
  var data = type === "binary" ? reader.readAsArrayBuffer(blob) : reader.readAsText(blob);
  return data;
}
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function createCommonjsModule(fn, module) {
  return module = { exports: {} }, fn(module, module.exports), module.exports;
}
var typeson = createCommonjsModule(function(module, exports) {
  (function(global2, factory) {
    module.exports = factory();
  })(commonjsGlobal, function() {
    function _typeof(obj) {
      if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
        _typeof = function(obj2) {
          return typeof obj2;
        };
      } else {
        _typeof = function(obj2) {
          return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
        };
      }
      return _typeof(obj);
    }
    function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg);
        var value = info.value;
      } catch (error) {
        reject(error);
        return;
      }
      if (info.done) {
        resolve(value);
      } else {
        Promise.resolve(value).then(_next, _throw);
      }
    }
    function _asyncToGenerator(fn) {
      return function() {
        var self2 = this, args = arguments;
        return new Promise(function(resolve, reject) {
          var gen = fn.apply(self2, args);
          function _next(value) {
            asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
          }
          function _throw(err) {
            asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
          }
          _next(void 0);
        });
      };
    }
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }
    function _defineProperty(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }
      return obj;
    }
    function ownKeys(object, enumerableOnly) {
      var keys2 = Object.keys(object);
      if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object);
        if (enumerableOnly) symbols = symbols.filter(function(sym) {
          return Object.getOwnPropertyDescriptor(object, sym).enumerable;
        });
        keys2.push.apply(keys2, symbols);
      }
      return keys2;
    }
    function _objectSpread2(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i] != null ? arguments[i] : {};
        if (i % 2) {
          ownKeys(Object(source), true).forEach(function(key) {
            _defineProperty(target, key, source[key]);
          });
        } else if (Object.getOwnPropertyDescriptors) {
          Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
        } else {
          ownKeys(Object(source)).forEach(function(key) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
          });
        }
      }
      return target;
    }
    function _slicedToArray(arr, i) {
      return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
    }
    function _toConsumableArray(arr) {
      return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
    }
    function _arrayWithoutHoles(arr) {
      if (Array.isArray(arr)) {
        for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];
        return arr2;
      }
    }
    function _arrayWithHoles(arr) {
      if (Array.isArray(arr)) return arr;
    }
    function _iterableToArray(iter) {
      if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
    }
    function _iterableToArrayLimit(arr, i) {
      if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) {
        return;
      }
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = void 0;
      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);
          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }
      return _arr;
    }
    function _nonIterableSpread() {
      throw new TypeError("Invalid attempt to spread non-iterable instance");
    }
    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
    var TypesonPromise = function TypesonPromise2(f) {
      _classCallCheck(this, TypesonPromise2);
      this.p = new Promise(f);
    };
    TypesonPromise.__typeson__type__ = "TypesonPromise";
    if (typeof Symbol !== "undefined") {
      TypesonPromise.prototype[Symbol.toStringTag] = "TypesonPromise";
    }
    TypesonPromise.prototype.then = function(onFulfilled, onRejected) {
      var _this = this;
      return new TypesonPromise(function(typesonResolve, typesonReject) {
        _this.p.then(function(res) {
          typesonResolve(onFulfilled ? onFulfilled(res) : res);
        })["catch"](function(res) {
          return onRejected ? onRejected(res) : Promise.reject(res);
        }).then(typesonResolve, typesonReject);
      });
    };
    TypesonPromise.prototype["catch"] = function(onRejected) {
      return this.then(null, onRejected);
    };
    TypesonPromise.resolve = function(v) {
      return new TypesonPromise(function(typesonResolve) {
        typesonResolve(v);
      });
    };
    TypesonPromise.reject = function(v) {
      return new TypesonPromise(function(typesonResolve, typesonReject) {
        typesonReject(v);
      });
    };
    ["all", "race"].forEach(function(meth) {
      TypesonPromise[meth] = function(promArr) {
        return new TypesonPromise(function(typesonResolve, typesonReject) {
          Promise[meth](promArr.map(function(prom) {
            return prom && prom.constructor && prom.constructor.__typeson__type__ === "TypesonPromise" ? prom.p : prom;
          })).then(typesonResolve, typesonReject);
        });
      };
    });
    var _ref = {}, toStr = _ref.toString, hasOwn = {}.hasOwnProperty, getProto = Object.getPrototypeOf, fnToString = hasOwn.toString;
    function isThenable(v, catchCheck) {
      return isObject(v) && typeof v.then === "function" && (!catchCheck || typeof v["catch"] === "function");
    }
    function toStringTag(val) {
      return toStr.call(val).slice(8, -1);
    }
    function hasConstructorOf(a, b) {
      if (!a || _typeof(a) !== "object") {
        return false;
      }
      var proto = getProto(a);
      if (!proto) {
        return b === null;
      }
      var Ctor = hasOwn.call(proto, "constructor") && proto.constructor;
      if (typeof Ctor !== "function") {
        return b === null;
      }
      if (b === Ctor) {
        return true;
      }
      if (b !== null && fnToString.call(Ctor) === fnToString.call(b)) {
        return true;
      }
      if (typeof b === "function" && typeof Ctor.__typeson__type__ === "string" && Ctor.__typeson__type__ === b.__typeson__type__) {
        return true;
      }
      return false;
    }
    function isPlainObject(val) {
      if (!val || toStringTag(val) !== "Object") {
        return false;
      }
      var proto = getProto(val);
      if (!proto) {
        return true;
      }
      return hasConstructorOf(val, Object);
    }
    function isUserObject(val) {
      if (!val || toStringTag(val) !== "Object") {
        return false;
      }
      var proto = getProto(val);
      if (!proto) {
        return true;
      }
      return hasConstructorOf(val, Object) || isUserObject(proto);
    }
    function isObject(v) {
      return v && _typeof(v) === "object";
    }
    function escapeKeyPathComponent(keyPathComponent) {
      return keyPathComponent.replace(/~/g, "~0").replace(/\./g, "~1");
    }
    function unescapeKeyPathComponent(keyPathComponent) {
      return keyPathComponent.replace(/~1/g, ".").replace(/~0/g, "~");
    }
    function getByKeyPath(obj, keyPath) {
      if (keyPath === "") {
        return obj;
      }
      var period = keyPath.indexOf(".");
      if (period > -1) {
        var innerObj = obj[unescapeKeyPathComponent(keyPath.slice(0, period))];
        return innerObj === void 0 ? void 0 : getByKeyPath(innerObj, keyPath.slice(period + 1));
      }
      return obj[unescapeKeyPathComponent(keyPath)];
    }
    function setAtKeyPath(obj, keyPath, value) {
      if (keyPath === "") {
        return value;
      }
      var period = keyPath.indexOf(".");
      if (period > -1) {
        var innerObj = obj[unescapeKeyPathComponent(keyPath.slice(0, period))];
        return setAtKeyPath(innerObj, keyPath.slice(period + 1), value);
      }
      obj[unescapeKeyPathComponent(keyPath)] = value;
      return obj;
    }
    function getJSONType(value) {
      return value === null ? "null" : Array.isArray(value) ? "array" : _typeof(value);
    }
    var keys = Object.keys, isArray = Array.isArray, hasOwn$1 = {}.hasOwnProperty, internalStateObjPropsToIgnore = ["type", "replaced", "iterateIn", "iterateUnsetNumeric"];
    function nestedPathsFirst(a, b) {
      if (a.keypath === "") {
        return -1;
      }
      var as = a.keypath.match(/\./g) || 0;
      var bs = b.keypath.match(/\./g) || 0;
      if (as) {
        as = as.length;
      }
      if (bs) {
        bs = bs.length;
      }
      return as > bs ? -1 : as < bs ? 1 : a.keypath < b.keypath ? -1 : a.keypath > b.keypath;
    }
    var Typeson = /* @__PURE__ */ function() {
      function Typeson2(options) {
        _classCallCheck(this, Typeson2);
        this.options = options;
        this.plainObjectReplacers = [];
        this.nonplainObjectReplacers = [];
        this.revivers = {};
        this.types = {};
      }
      _createClass(Typeson2, [{
        key: "stringify",
        value: function stringify(obj, replacer, space, opts) {
          opts = _objectSpread2({}, this.options, {}, opts, {
            stringification: true
          });
          var encapsulated = this.encapsulate(obj, null, opts);
          if (isArray(encapsulated)) {
            return JSON.stringify(encapsulated[0], replacer, space);
          }
          return encapsulated.then(function(res) {
            return JSON.stringify(res, replacer, space);
          });
        }
        /**
         * Also sync but throws on non-sync result.
         * @param {Any} obj
         * @param {JSONReplacer|string[]} replacer
         * @param {number|string} space
         * @param {object} opts
         * @returns {string}
         */
      }, {
        key: "stringifySync",
        value: function stringifySync(obj, replacer, space, opts) {
          return this.stringify(obj, replacer, space, _objectSpread2({
            throwOnBadSyncType: true
          }, opts, {
            sync: true
          }));
        }
        /**
         *
         * @param {Any} obj
         * @param {JSONReplacer|string[]} replacer
         * @param {number|string} space
         * @param {object} opts
         * @returns {Promise<string>}
         */
      }, {
        key: "stringifyAsync",
        value: function stringifyAsync(obj, replacer, space, opts) {
          return this.stringify(obj, replacer, space, _objectSpread2({
            throwOnBadSyncType: true
          }, opts, {
            sync: false
          }));
        }
        /**
         * Parse Typeson back into an obejct.
         * Initial arguments works identical to those of `JSON.parse()`.
         * @param {string} text
         * @param {function} reviver This JSON reviver has nothing to do with
         *   our revivers.
         * @param {object} opts
         * @returns {external:JSON}
         */
      }, {
        key: "parse",
        value: function parse(text, reviver, opts) {
          opts = _objectSpread2({}, this.options, {}, opts, {
            parse: true
          });
          return this.revive(JSON.parse(text, reviver), opts);
        }
        /**
        * Also sync but throws on non-sync result.
        * @param {string} text
        * @param {function} reviver This JSON reviver has nothing to do with
        *   our revivers.
        * @param {object} opts
        * @returns {external:JSON}
        */
      }, {
        key: "parseSync",
        value: function parseSync(text, reviver, opts) {
          return this.parse(text, reviver, _objectSpread2({
            throwOnBadSyncType: true
          }, opts, {
            sync: true
          }));
        }
        /**
        * @param {string} text
        * @param {function} reviver This JSON reviver has nothing to do with
        *   our revivers.
        * @param {object} opts
        * @returns {Promise} Resolves to `external:JSON`
        */
      }, {
        key: "parseAsync",
        value: function parseAsync(text, reviver, opts) {
          return this.parse(text, reviver, _objectSpread2({
            throwOnBadSyncType: true
          }, opts, {
            sync: false
          }));
        }
        /**
         *
         * @param {Any} obj
         * @param {object} stateObj
         * @param {object} [opts={}]
         * @returns {string[]|false}
         */
      }, {
        key: "specialTypeNames",
        value: function specialTypeNames(obj, stateObj) {
          var opts = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
          opts.returnTypeNames = true;
          return this.encapsulate(obj, stateObj, opts);
        }
        /**
         *
         * @param {Any} obj
         * @param {PlainObject} stateObj
         * @param {PlainObject} [opts={}]
         * @returns {Promise|GenericArray|PlainObject|string|false}
         */
      }, {
        key: "rootTypeName",
        value: function rootTypeName(obj, stateObj) {
          var opts = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
          opts.iterateNone = true;
          return this.encapsulate(obj, stateObj, opts);
        }
        /**
         * Encapsulate a complex object into a plain Object by replacing
         * registered types with plain objects representing the types data.
         *
         * This method is used internally by `Typeson.stringify()`.
         * @param {Any} obj - Object to encapsulate.
         * @param {PlainObject} stateObj
         * @param {PlainObject} opts
         * @returns {Promise|GenericArray|PlainObject|string|false}
         */
      }, {
        key: "encapsulate",
        value: function encapsulate(obj, stateObj, opts) {
          opts = _objectSpread2({
            sync: true
          }, this.options, {}, opts);
          var _opts = opts, sync = _opts.sync;
          var that = this, types = {}, refObjs = [], refKeys = [], promisesDataRoot = [];
          var cyclic = "cyclic" in opts ? opts.cyclic : true;
          var _opts2 = opts, encapsulateObserver = _opts2.encapsulateObserver;
          var ret = _encapsulate("", obj, cyclic, stateObj || {}, promisesDataRoot);
          function finish(ret2) {
            var typeNames = Object.values(types);
            if (opts.iterateNone) {
              if (typeNames.length) {
                return typeNames[0];
              }
              return Typeson2.getJSONType(ret2);
            }
            if (typeNames.length) {
              if (opts.returnTypeNames) {
                return _toConsumableArray(new Set(typeNames));
              }
              if (!ret2 || !isPlainObject(ret2) || // Also need to handle if this is an object with its
              //   own `$types` property (to avoid ambiguity)
              hasOwn$1.call(ret2, "$types")) {
                ret2 = {
                  $: ret2,
                  $types: {
                    $: types
                  }
                };
              } else {
                ret2.$types = types;
              }
            } else if (isObject(ret2) && hasOwn$1.call(ret2, "$types")) {
              ret2 = {
                $: ret2,
                $types: true
              };
            }
            if (opts.returnTypeNames) {
              return false;
            }
            return ret2;
          }
          function checkPromises(_x, _x2) {
            return _checkPromises.apply(this, arguments);
          }
          function _checkPromises() {
            _checkPromises = _asyncToGenerator(
              /* @__PURE__ */ regeneratorRuntime.mark(function _callee2(ret2, promisesData) {
                var promResults;
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        _context2.next = 2;
                        return Promise.all(promisesData.map(function(pd) {
                          return pd[1].p;
                        }));
                      case 2:
                        promResults = _context2.sent;
                        _context2.next = 5;
                        return Promise.all(promResults.map(
                          /* @__PURE__ */ function() {
                            var _ref2 = _asyncToGenerator(
                              /* @__PURE__ */ regeneratorRuntime.mark(function _callee(promResult) {
                                var newPromisesData, _promisesData$splice, _promisesData$splice2, prData, _prData, keyPath, cyclic2, stateObj2, parentObj, key, detectedType, encaps, isTypesonPromise, encaps2;
                                return regeneratorRuntime.wrap(function _callee$(_context) {
                                  while (1) {
                                    switch (_context.prev = _context.next) {
                                      case 0:
                                        newPromisesData = [];
                                        _promisesData$splice = promisesData.splice(0, 1), _promisesData$splice2 = _slicedToArray(_promisesData$splice, 1), prData = _promisesData$splice2[0];
                                        _prData = _slicedToArray(prData, 7), keyPath = _prData[0], cyclic2 = _prData[2], stateObj2 = _prData[3], parentObj = _prData[4], key = _prData[5], detectedType = _prData[6];
                                        encaps = _encapsulate(keyPath, promResult, cyclic2, stateObj2, newPromisesData, true, detectedType);
                                        isTypesonPromise = hasConstructorOf(encaps, TypesonPromise);
                                        if (!(keyPath && isTypesonPromise)) {
                                          _context.next = 11;
                                          break;
                                        }
                                        _context.next = 8;
                                        return encaps.p;
                                      case 8:
                                        encaps2 = _context.sent;
                                        parentObj[key] = encaps2;
                                        return _context.abrupt("return", checkPromises(ret2, newPromisesData));
                                      case 11:
                                        if (keyPath) {
                                          parentObj[key] = encaps;
                                        } else if (isTypesonPromise) {
                                          ret2 = encaps.p;
                                        } else {
                                          ret2 = encaps;
                                        }
                                        return _context.abrupt("return", checkPromises(ret2, newPromisesData));
                                      case 13:
                                      case "end":
                                        return _context.stop();
                                    }
                                  }
                                }, _callee);
                              })
                            );
                            return function(_x3) {
                              return _ref2.apply(this, arguments);
                            };
                          }()
                        ));
                      case 5:
                        return _context2.abrupt("return", ret2);
                      case 6:
                      case "end":
                        return _context2.stop();
                    }
                  }
                }, _callee2);
              })
            );
            return _checkPromises.apply(this, arguments);
          }
          function _adaptBuiltinStateObjectProperties(stateObj2, ownKeysObj, cb) {
            Object.assign(stateObj2, ownKeysObj);
            var vals = internalStateObjPropsToIgnore.map(function(prop) {
              var tmp = stateObj2[prop];
              delete stateObj2[prop];
              return tmp;
            });
            cb();
            internalStateObjPropsToIgnore.forEach(function(prop, i) {
              stateObj2[prop] = vals[i];
            });
          }
          function _encapsulate(keypath, value, cyclic2, stateObj2, promisesData, resolvingTypesonPromise, detectedType) {
            var ret2;
            var observerData = {};
            var $typeof = _typeof(value);
            var runObserver = encapsulateObserver ? function(obj2) {
              var type = detectedType || stateObj2.type || Typeson2.getJSONType(value);
              encapsulateObserver(Object.assign(obj2 || observerData, {
                keypath,
                value,
                cyclic: cyclic2,
                stateObj: stateObj2,
                promisesData,
                resolvingTypesonPromise,
                awaitingTypesonPromise: hasConstructorOf(value, TypesonPromise)
              }, {
                type
              }));
            } : null;
            if (["string", "boolean", "number", "undefined"].includes($typeof)) {
              if (value === void 0 || $typeof === "number" && (isNaN(value) || value === -Infinity || value === Infinity)) {
                if (stateObj2.replaced) {
                  ret2 = value;
                } else {
                  ret2 = replace(keypath, value, stateObj2, promisesData, false, resolvingTypesonPromise, runObserver);
                }
                if (ret2 !== value) {
                  observerData = {
                    replaced: ret2
                  };
                }
              } else {
                ret2 = value;
              }
              if (runObserver) {
                runObserver();
              }
              return ret2;
            }
            if (value === null) {
              if (runObserver) {
                runObserver();
              }
              return value;
            }
            if (cyclic2 && !stateObj2.iterateIn && !stateObj2.iterateUnsetNumeric && value && _typeof(value) === "object") {
              var refIndex = refObjs.indexOf(value);
              if (refIndex < 0) {
                if (cyclic2 === true) {
                  refObjs.push(value);
                  refKeys.push(keypath);
                }
              } else {
                types[keypath] = "#";
                if (runObserver) {
                  runObserver({
                    cyclicKeypath: refKeys[refIndex]
                  });
                }
                return "#" + refKeys[refIndex];
              }
            }
            var isPlainObj = isPlainObject(value);
            var isArr = isArray(value);
            var replaced = (
              // Running replace will cause infinite loop as will test
              //   positive again
              (isPlainObj || isArr) && (!that.plainObjectReplacers.length || stateObj2.replaced) || stateObj2.iterateIn ? (
                // Optimization: if plain object and no plain-object
                //   replacers, don't try finding a replacer
                value
              ) : replace(keypath, value, stateObj2, promisesData, isPlainObj || isArr, null, runObserver)
            );
            var clone;
            if (replaced !== value) {
              ret2 = replaced;
              observerData = {
                replaced
              };
            } else {
              if (keypath === "" && hasConstructorOf(value, TypesonPromise)) {
                promisesData.push([keypath, value, cyclic2, stateObj2, void 0, void 0, stateObj2.type]);
                ret2 = value;
              } else if (isArr && stateObj2.iterateIn !== "object" || stateObj2.iterateIn === "array") {
                clone = new Array(value.length);
                observerData = {
                  clone
                };
              } else if (!["function", "symbol"].includes(_typeof(value)) && !("toJSON" in value) && !hasConstructorOf(value, TypesonPromise) && !hasConstructorOf(value, Promise) && !hasConstructorOf(value, ArrayBuffer) || isPlainObj || stateObj2.iterateIn === "object") {
                clone = {};
                if (stateObj2.addLength) {
                  clone.length = value.length;
                }
                observerData = {
                  clone
                };
              } else {
                ret2 = value;
              }
            }
            if (runObserver) {
              runObserver();
            }
            if (opts.iterateNone) {
              return clone || ret2;
            }
            if (!clone) {
              return ret2;
            }
            if (stateObj2.iterateIn) {
              var _loop = function _loop3(key2) {
                var ownKeysObj = {
                  ownKeys: hasOwn$1.call(value, key2)
                };
                _adaptBuiltinStateObjectProperties(stateObj2, ownKeysObj, function() {
                  var kp = keypath + (keypath ? "." : "") + escapeKeyPathComponent(key2);
                  var val = _encapsulate(kp, value[key2], Boolean(cyclic2), stateObj2, promisesData, resolvingTypesonPromise);
                  if (hasConstructorOf(val, TypesonPromise)) {
                    promisesData.push([kp, val, Boolean(cyclic2), stateObj2, clone, key2, stateObj2.type]);
                  } else if (val !== void 0) {
                    clone[key2] = val;
                  }
                });
              };
              for (var key in value) {
                _loop(key);
              }
              if (runObserver) {
                runObserver({
                  endIterateIn: true,
                  end: true
                });
              }
            } else {
              keys(value).forEach(function(key2) {
                var kp = keypath + (keypath ? "." : "") + escapeKeyPathComponent(key2);
                var ownKeysObj = {
                  ownKeys: true
                };
                _adaptBuiltinStateObjectProperties(stateObj2, ownKeysObj, function() {
                  var val = _encapsulate(kp, value[key2], Boolean(cyclic2), stateObj2, promisesData, resolvingTypesonPromise);
                  if (hasConstructorOf(val, TypesonPromise)) {
                    promisesData.push([kp, val, Boolean(cyclic2), stateObj2, clone, key2, stateObj2.type]);
                  } else if (val !== void 0) {
                    clone[key2] = val;
                  }
                });
              });
              if (runObserver) {
                runObserver({
                  endIterateOwn: true,
                  end: true
                });
              }
            }
            if (stateObj2.iterateUnsetNumeric) {
              var vl = value.length;
              var _loop2 = function _loop22(i2) {
                if (!(i2 in value)) {
                  var kp = keypath + (keypath ? "." : "") + i2;
                  var ownKeysObj = {
                    ownKeys: false
                  };
                  _adaptBuiltinStateObjectProperties(stateObj2, ownKeysObj, function() {
                    var val = _encapsulate(kp, void 0, Boolean(cyclic2), stateObj2, promisesData, resolvingTypesonPromise);
                    if (hasConstructorOf(val, TypesonPromise)) {
                      promisesData.push([kp, val, Boolean(cyclic2), stateObj2, clone, i2, stateObj2.type]);
                    } else if (val !== void 0) {
                      clone[i2] = val;
                    }
                  });
                }
              };
              for (var i = 0; i < vl; i++) {
                _loop2(i);
              }
              if (runObserver) {
                runObserver({
                  endIterateUnsetNumeric: true,
                  end: true
                });
              }
            }
            return clone;
          }
          function replace(keypath, value, stateObj2, promisesData, plainObject, resolvingTypesonPromise, runObserver) {
            var replacers = plainObject ? that.plainObjectReplacers : that.nonplainObjectReplacers;
            var i = replacers.length;
            while (i--) {
              var replacer = replacers[i];
              if (replacer.test(value, stateObj2)) {
                var type = replacer.type;
                if (that.revivers[type]) {
                  var existing = types[keypath];
                  types[keypath] = existing ? [type].concat(existing) : type;
                }
                Object.assign(stateObj2, {
                  type,
                  replaced: true
                });
                if ((sync || !replacer.replaceAsync) && !replacer.replace) {
                  if (runObserver) {
                    runObserver({
                      typeDetected: true
                    });
                  }
                  return _encapsulate(keypath, value, cyclic && "readonly", stateObj2, promisesData, resolvingTypesonPromise, type);
                }
                if (runObserver) {
                  runObserver({
                    replacing: true
                  });
                }
                var replaceMethod = sync || !replacer.replaceAsync ? "replace" : "replaceAsync";
                return _encapsulate(keypath, replacer[replaceMethod](value, stateObj2), cyclic && "readonly", stateObj2, promisesData, resolvingTypesonPromise, type);
              }
            }
            return value;
          }
          return promisesDataRoot.length ? sync && opts.throwOnBadSyncType ? function() {
            throw new TypeError("Sync method requested but async result obtained");
          }() : Promise.resolve(checkPromises(ret, promisesDataRoot)).then(finish) : !sync && opts.throwOnBadSyncType ? function() {
            throw new TypeError("Async method requested but sync result obtained");
          }() : opts.stringification && sync ? [finish(ret)] : sync ? finish(ret) : Promise.resolve(finish(ret));
        }
        /**
         * Also sync but throws on non-sync result.
         * @param {*} obj
         * @param {object} stateObj
         * @param {object} opts
         * @returns {*}
         */
      }, {
        key: "encapsulateSync",
        value: function encapsulateSync(obj, stateObj, opts) {
          return this.encapsulate(obj, stateObj, _objectSpread2({
            throwOnBadSyncType: true
          }, opts, {
            sync: true
          }));
        }
        /**
         * @param {*} obj
         * @param {object} stateObj
         * @param {object} opts
         * @returns {*}
         */
      }, {
        key: "encapsulateAsync",
        value: function encapsulateAsync(obj, stateObj, opts) {
          return this.encapsulate(obj, stateObj, _objectSpread2({
            throwOnBadSyncType: true
          }, opts, {
            sync: false
          }));
        }
        /**
         * Revive an encapsulated object.
         * This method is used internally by `Typeson.parse()`.
         * @param {object} obj - Object to revive. If it has `$types` member, the
         *   properties that are listed there will be replaced with its true type
         *   instead of just plain objects.
         * @param {object} opts
         * @throws TypeError If mismatch between sync/async type and result
         * @returns {Promise|*} If async, returns a Promise that resolves to `*`
         */
      }, {
        key: "revive",
        value: function revive(obj, opts) {
          var types = obj && obj.$types;
          if (!types) {
            return obj;
          }
          if (types === true) {
            return obj.$;
          }
          opts = _objectSpread2({
            sync: true
          }, this.options, {}, opts);
          var _opts3 = opts, sync = _opts3.sync;
          var keyPathResolutions = [];
          var stateObj = {};
          var ignore$Types = true;
          if (types.$ && isPlainObject(types.$)) {
            obj = obj.$;
            types = types.$;
            ignore$Types = false;
          }
          var that = this;
          function executeReviver(type, val) {
            var _ref2 = that.revivers[type] || [], _ref3 = _slicedToArray(_ref2, 1), reviver = _ref3[0];
            if (!reviver) {
              throw new Error("Unregistered type: " + type);
            }
            if (sync && !("revive" in reviver)) {
              return val;
            }
            return reviver[sync && reviver.revive ? "revive" : !sync && reviver.reviveAsync ? "reviveAsync" : "revive"](val, stateObj);
          }
          function revivePlainObjects() {
            var plainObjectTypes = [];
            Object.entries(types).forEach(function(_ref4) {
              var _ref5 = _slicedToArray(_ref4, 2), keypath = _ref5[0], type = _ref5[1];
              if (type === "#") {
                return;
              }
              [].concat(type).forEach(function(type2) {
                var _ref6 = that.revivers[type2] || [null, {}], _ref7 = _slicedToArray(_ref6, 2), plain = _ref7[1].plain;
                if (!plain) {
                  return;
                }
                plainObjectTypes.push({
                  keypath,
                  type: type2
                });
                delete types[keypath];
              });
            });
            if (!plainObjectTypes.length) {
              return void 0;
            }
            return plainObjectTypes.sort(nestedPathsFirst).reduce(
              function reducer(possibleTypesonPromise2, _ref8) {
                var keypath = _ref8.keypath, type = _ref8.type;
                if (isThenable(possibleTypesonPromise2)) {
                  return possibleTypesonPromise2.then(function(val2) {
                    return reducer(val2, {
                      keypath,
                      type
                    });
                  });
                }
                var val = getByKeyPath(obj, keypath);
                val = executeReviver(type, val);
                if (hasConstructorOf(val, TypesonPromise)) {
                  return val.then(function(v) {
                    var newVal2 = setAtKeyPath(obj, keypath, v);
                    if (newVal2 === v) {
                      obj = newVal2;
                    }
                    return void 0;
                  });
                }
                var newVal = setAtKeyPath(obj, keypath, val);
                if (newVal === val) {
                  obj = newVal;
                }
                return void 0;
              },
              void 0
              // This argument must be explicit
            );
          }
          var revivalPromises = [];
          function _revive(keypath, value, target, clone, key) {
            if (ignore$Types && keypath === "$types") {
              return void 0;
            }
            var type = types[keypath];
            var isArr = isArray(value);
            if (isArr || isPlainObject(value)) {
              var _clone = isArr ? new Array(value.length) : {};
              keys(value).forEach(function(k2) {
                var val2 = _revive(keypath + (keypath ? "." : "") + escapeKeyPathComponent(k2), value[k2], target || _clone, _clone, k2);
                var set = function set2(v) {
                  if (hasConstructorOf(v, Undefined)) {
                    _clone[k2] = void 0;
                  } else if (v !== void 0) {
                    _clone[k2] = v;
                  }
                  return v;
                };
                if (hasConstructorOf(val2, TypesonPromise)) {
                  revivalPromises.push(val2.then(function(ret2) {
                    return set(ret2);
                  }));
                } else {
                  set(val2);
                }
              });
              value = _clone;
              while (keyPathResolutions.length) {
                var _keyPathResolutions$ = _slicedToArray(keyPathResolutions[0], 4), _target = _keyPathResolutions$[0], keyPath = _keyPathResolutions$[1], _clone2 = _keyPathResolutions$[2], k = _keyPathResolutions$[3];
                var val = getByKeyPath(_target, keyPath);
                if (val !== void 0) {
                  _clone2[k] = val;
                } else {
                  break;
                }
                keyPathResolutions.splice(0, 1);
              }
            }
            if (!type) {
              return value;
            }
            if (type === "#") {
              var _ret = getByKeyPath(target, value.slice(1));
              if (_ret === void 0) {
                keyPathResolutions.push([target, value.slice(1), clone, key]);
              }
              return _ret;
            }
            return [].concat(type).reduce(function reducer(val2, typ) {
              if (hasConstructorOf(val2, TypesonPromise)) {
                return val2.then(function(v) {
                  return reducer(v, typ);
                });
              }
              return executeReviver(typ, val2);
            }, value);
          }
          function checkUndefined(retrn) {
            return hasConstructorOf(retrn, Undefined) ? void 0 : retrn;
          }
          var possibleTypesonPromise = revivePlainObjects();
          var ret;
          if (hasConstructorOf(possibleTypesonPromise, TypesonPromise)) {
            ret = possibleTypesonPromise.then(function() {
              return obj;
            });
          } else {
            ret = _revive("", obj, null);
            if (revivalPromises.length) {
              ret = TypesonPromise.resolve(ret).then(function(r) {
                return TypesonPromise.all([
                  // May be a TypesonPromise or not
                  r
                ].concat(revivalPromises));
              }).then(function(_ref9) {
                var _ref10 = _slicedToArray(_ref9, 1), r = _ref10[0];
                return r;
              });
            }
          }
          return isThenable(ret) ? sync && opts.throwOnBadSyncType ? function() {
            throw new TypeError("Sync method requested but async result obtained");
          }() : hasConstructorOf(ret, TypesonPromise) ? ret.p.then(checkUndefined) : ret : !sync && opts.throwOnBadSyncType ? function() {
            throw new TypeError("Async method requested but sync result obtained");
          }() : sync ? checkUndefined(ret) : Promise.resolve(checkUndefined(ret));
        }
        /**
         * Also sync but throws on non-sync result.
         * @param {Any} obj
         * @param {object} opts
         * @returns {Any}
         */
      }, {
        key: "reviveSync",
        value: function reviveSync(obj, opts) {
          return this.revive(obj, _objectSpread2({
            throwOnBadSyncType: true
          }, opts, {
            sync: true
          }));
        }
        /**
        * @param {Any} obj
        * @param {object} opts
        * @returns {Promise} Resolves to `*`
        */
      }, {
        key: "reviveAsync",
        value: function reviveAsync(obj, opts) {
          return this.revive(obj, _objectSpread2({
            throwOnBadSyncType: true
          }, opts, {
            sync: false
          }));
        }
        /**
         * Register types.
         * For examples on how to use this method, see
         *   {@link https://github.com/dfahlander/typeson-registry/tree/master/types}.
         * @param {object.<string,Function[]>[]} typeSpecSets - Types and
         *   their functions [test, encapsulate, revive];
         * @param {object} opts
         * @returns {Typeson}
         */
      }, {
        key: "register",
        value: function register(typeSpecSets, opts) {
          opts = opts || {};
          [].concat(typeSpecSets).forEach(function R(typeSpec) {
            var _this = this;
            if (isArray(typeSpec)) {
              return typeSpec.map(function(typSpec) {
                return R.call(_this, typSpec);
              });
            }
            typeSpec && keys(typeSpec).forEach(function(typeId) {
              if (typeId === "#") {
                throw new TypeError("# cannot be used as a type name as it is reserved for cyclic objects");
              } else if (Typeson2.JSON_TYPES.includes(typeId)) {
                throw new TypeError("Plain JSON object types are reserved as type names");
              }
              var spec = typeSpec[typeId];
              var replacers = spec && spec.testPlainObjects ? this.plainObjectReplacers : this.nonplainObjectReplacers;
              var existingReplacer = replacers.filter(function(r) {
                return r.type === typeId;
              });
              if (existingReplacer.length) {
                replacers.splice(replacers.indexOf(existingReplacer[0]), 1);
                delete this.revivers[typeId];
                delete this.types[typeId];
              }
              if (typeof spec === "function") {
                var Class = spec;
                spec = {
                  test: function test2(x) {
                    return x && x.constructor === Class;
                  },
                  replace: function replace2(x) {
                    return _objectSpread2({}, x);
                  },
                  revive: function revive2(x) {
                    return Object.assign(Object.create(Class.prototype), x);
                  }
                };
              } else if (isArray(spec)) {
                var _spec = spec, _spec2 = _slicedToArray(_spec, 3), test = _spec2[0], replace = _spec2[1], revive = _spec2[2];
                spec = {
                  test,
                  replace,
                  revive
                };
              }
              if (!spec || !spec.test) {
                return;
              }
              var replacerObj = {
                type: typeId,
                test: spec.test.bind(spec)
              };
              if (spec.replace) {
                replacerObj.replace = spec.replace.bind(spec);
              }
              if (spec.replaceAsync) {
                replacerObj.replaceAsync = spec.replaceAsync.bind(spec);
              }
              var start = typeof opts.fallback === "number" ? opts.fallback : opts.fallback ? 0 : Infinity;
              if (spec.testPlainObjects) {
                this.plainObjectReplacers.splice(start, 0, replacerObj);
              } else {
                this.nonplainObjectReplacers.splice(start, 0, replacerObj);
              }
              if (spec.revive || spec.reviveAsync) {
                var reviverObj = {};
                if (spec.revive) {
                  reviverObj.revive = spec.revive.bind(spec);
                }
                if (spec.reviveAsync) {
                  reviverObj.reviveAsync = spec.reviveAsync.bind(spec);
                }
                this.revivers[typeId] = [reviverObj, {
                  plain: spec.testPlainObjects
                }];
              }
              this.types[typeId] = spec;
            }, this);
          }, this);
          return this;
        }
      }]);
      return Typeson2;
    }();
    var Undefined = function Undefined2() {
      _classCallCheck(this, Undefined2);
    };
    Undefined.__typeson__type__ = "TypesonUndefined";
    Typeson.Undefined = Undefined;
    Typeson.Promise = TypesonPromise;
    Typeson.isThenable = isThenable;
    Typeson.toStringTag = toStringTag;
    Typeson.hasConstructorOf = hasConstructorOf;
    Typeson.isObject = isObject;
    Typeson.isPlainObject = isPlainObject;
    Typeson.isUserObject = isUserObject;
    Typeson.escapeKeyPathComponent = escapeKeyPathComponent;
    Typeson.unescapeKeyPathComponent = unescapeKeyPathComponent;
    Typeson.getByKeyPath = getByKeyPath;
    Typeson.getJSONType = getJSONType;
    Typeson.JSON_TYPES = ["null", "boolean", "number", "string", "array", "object"];
    return Typeson;
  });
});
var structuredCloning = createCommonjsModule(function(module, exports) {
  !function(e, t) {
    module.exports = t();
  }(commonjsGlobal, function() {
    function _typeof$1(e2) {
      return (_typeof$1 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e3) {
        return typeof e3;
      } : function(e3) {
        return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
      })(e2);
    }
    function _classCallCheck$1(e2, t2) {
      if (!(e2 instanceof t2)) throw new TypeError("Cannot call a class as a function");
    }
    function _defineProperties$1(e2, t2) {
      for (var r2 = 0; r2 < t2.length; r2++) {
        var n2 = t2[r2];
        n2.enumerable = n2.enumerable || false, n2.configurable = true, "value" in n2 && (n2.writable = true), Object.defineProperty(e2, n2.key, n2);
      }
    }
    function _defineProperty$1(e2, t2, r2) {
      return t2 in e2 ? Object.defineProperty(e2, t2, { value: r2, enumerable: true, configurable: true, writable: true }) : e2[t2] = r2, e2;
    }
    function ownKeys$1(e2, t2) {
      var r2 = Object.keys(e2);
      if (Object.getOwnPropertySymbols) {
        var n2 = Object.getOwnPropertySymbols(e2);
        t2 && (n2 = n2.filter(function(t3) {
          return Object.getOwnPropertyDescriptor(e2, t3).enumerable;
        })), r2.push.apply(r2, n2);
      }
      return r2;
    }
    function _toConsumableArray$1(e2) {
      return function _arrayWithoutHoles$1(e3) {
        if (Array.isArray(e3)) return _arrayLikeToArray$1(e3);
      }(e2) || function _iterableToArray$1(e3) {
        if ("undefined" != typeof Symbol && Symbol.iterator in Object(e3)) return Array.from(e3);
      }(e2) || function _unsupportedIterableToArray$1(e3, t2) {
        if (!e3) return;
        if ("string" == typeof e3) return _arrayLikeToArray$1(e3, t2);
        var r2 = Object.prototype.toString.call(e3).slice(8, -1);
        "Object" === r2 && e3.constructor && (r2 = e3.constructor.name);
        if ("Map" === r2 || "Set" === r2) return Array.from(e3);
        if ("Arguments" === r2 || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r2)) return _arrayLikeToArray$1(e3, t2);
      }(e2) || function _nonIterableSpread$1() {
        throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }();
    }
    function _arrayLikeToArray$1(e2, t2) {
      (null == t2 || t2 > e2.length) && (t2 = e2.length);
      for (var r2 = 0, n2 = new Array(t2); r2 < t2; r2++) n2[r2] = e2[r2];
      return n2;
    }
    function _typeof(e2) {
      return (_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function _typeof2(e3) {
        return typeof e3;
      } : function _typeof2(e3) {
        return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
      })(e2);
    }
    function _classCallCheck(e2, t2) {
      if (!(e2 instanceof t2)) throw new TypeError("Cannot call a class as a function");
    }
    function _defineProperties(e2, t2) {
      for (var r2 = 0; r2 < t2.length; r2++) {
        var n2 = t2[r2];
        n2.enumerable = n2.enumerable || false, n2.configurable = true, "value" in n2 && (n2.writable = true), Object.defineProperty(e2, n2.key, n2);
      }
    }
    function _defineProperty(e2, t2, r2) {
      return t2 in e2 ? Object.defineProperty(e2, t2, { value: r2, enumerable: true, configurable: true, writable: true }) : e2[t2] = r2, e2;
    }
    function ownKeys(e2, t2) {
      var r2 = Object.keys(e2);
      if (Object.getOwnPropertySymbols) {
        var n2 = Object.getOwnPropertySymbols(e2);
        t2 && (n2 = n2.filter(function(t3) {
          return Object.getOwnPropertyDescriptor(e2, t3).enumerable;
        })), r2.push.apply(r2, n2);
      }
      return r2;
    }
    function _objectSpread2(e2) {
      for (var t2 = 1; t2 < arguments.length; t2++) {
        var r2 = null != arguments[t2] ? arguments[t2] : {};
        t2 % 2 ? ownKeys(Object(r2), true).forEach(function(t3) {
          _defineProperty(e2, t3, r2[t3]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e2, Object.getOwnPropertyDescriptors(r2)) : ownKeys(Object(r2)).forEach(function(t3) {
          Object.defineProperty(e2, t3, Object.getOwnPropertyDescriptor(r2, t3));
        });
      }
      return e2;
    }
    function _slicedToArray(e2, t2) {
      return function _arrayWithHoles(e3) {
        if (Array.isArray(e3)) return e3;
      }(e2) || function _iterableToArrayLimit(e3, t3) {
        if ("undefined" == typeof Symbol || !(Symbol.iterator in Object(e3))) return;
        var r2 = [], n2 = true, i2 = false, o2 = void 0;
        try {
          for (var a2, c2 = e3[Symbol.iterator](); !(n2 = (a2 = c2.next()).done) && (r2.push(a2.value), !t3 || r2.length !== t3); n2 = true) ;
        } catch (e4) {
          i2 = true, o2 = e4;
        } finally {
          try {
            n2 || null == c2.return || c2.return();
          } finally {
            if (i2) throw o2;
          }
        }
        return r2;
      }(e2, t2) || _unsupportedIterableToArray(e2, t2) || function _nonIterableRest() {
        throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }();
    }
    function _toConsumableArray(e2) {
      return function _arrayWithoutHoles(e3) {
        if (Array.isArray(e3)) return _arrayLikeToArray(e3);
      }(e2) || function _iterableToArray(e3) {
        if ("undefined" != typeof Symbol && Symbol.iterator in Object(e3)) return Array.from(e3);
      }(e2) || _unsupportedIterableToArray(e2) || function _nonIterableSpread() {
        throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }();
    }
    function _unsupportedIterableToArray(e2, t2) {
      if (e2) {
        if ("string" == typeof e2) return _arrayLikeToArray(e2, t2);
        var r2 = Object.prototype.toString.call(e2).slice(8, -1);
        return "Object" === r2 && e2.constructor && (r2 = e2.constructor.name), "Map" === r2 || "Set" === r2 ? Array.from(e2) : "Arguments" === r2 || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r2) ? _arrayLikeToArray(e2, t2) : void 0;
      }
    }
    function _arrayLikeToArray(e2, t2) {
      (null == t2 || t2 > e2.length) && (t2 = e2.length);
      for (var r2 = 0, n2 = new Array(t2); r2 < t2; r2++) n2[r2] = e2[r2];
      return n2;
    }
    var e = function TypesonPromise(e2) {
      _classCallCheck(this, TypesonPromise), this.p = new Promise(e2);
    };
    e.__typeson__type__ = "TypesonPromise", "undefined" != typeof Symbol && (e.prototype[Symbol.toStringTag] = "TypesonPromise"), e.prototype.then = function(t2, r2) {
      var n2 = this;
      return new e(function(e2, i2) {
        n2.p.then(function(r3) {
          e2(t2 ? t2(r3) : r3);
        }).catch(function(e3) {
          return r2 ? r2(e3) : Promise.reject(e3);
        }).then(e2, i2);
      });
    }, e.prototype.catch = function(e2) {
      return this.then(null, e2);
    }, e.resolve = function(t2) {
      return new e(function(e2) {
        e2(t2);
      });
    }, e.reject = function(t2) {
      return new e(function(e2, r2) {
        r2(t2);
      });
    }, ["all", "race"].forEach(function(t2) {
      e[t2] = function(r2) {
        return new e(function(e2, n2) {
          Promise[t2](r2.map(function(e3) {
            return e3 && e3.constructor && "TypesonPromise" === e3.constructor.__typeson__type__ ? e3.p : e3;
          })).then(e2, n2);
        });
      };
    });
    var t = {}.toString, r = {}.hasOwnProperty, n = Object.getPrototypeOf, i = r.toString;
    function isThenable(e2, t2) {
      return isObject(e2) && "function" == typeof e2.then && (!t2 || "function" == typeof e2.catch);
    }
    function toStringTag(e2) {
      return t.call(e2).slice(8, -1);
    }
    function hasConstructorOf(e2, t2) {
      if (!e2 || "object" !== _typeof(e2)) return false;
      var o2 = n(e2);
      if (!o2) return null === t2;
      var a2 = r.call(o2, "constructor") && o2.constructor;
      return "function" != typeof a2 ? null === t2 : t2 === a2 || (null !== t2 && i.call(a2) === i.call(t2) || "function" == typeof t2 && "string" == typeof a2.__typeson__type__ && a2.__typeson__type__ === t2.__typeson__type__);
    }
    function isPlainObject(e2) {
      return !(!e2 || "Object" !== toStringTag(e2)) && (!n(e2) || hasConstructorOf(e2, Object));
    }
    function isObject(e2) {
      return e2 && "object" === _typeof(e2);
    }
    function escapeKeyPathComponent(e2) {
      return e2.replace(/~/g, "~0").replace(/\./g, "~1");
    }
    function unescapeKeyPathComponent(e2) {
      return e2.replace(/~1/g, ".").replace(/~0/g, "~");
    }
    function getByKeyPath(e2, t2) {
      if ("" === t2) return e2;
      var r2 = t2.indexOf(".");
      if (r2 > -1) {
        var n2 = e2[unescapeKeyPathComponent(t2.slice(0, r2))];
        return void 0 === n2 ? void 0 : getByKeyPath(n2, t2.slice(r2 + 1));
      }
      return e2[unescapeKeyPathComponent(t2)];
    }
    function setAtKeyPath(e2, t2, r2) {
      if ("" === t2) return r2;
      var n2 = t2.indexOf(".");
      return n2 > -1 ? setAtKeyPath(e2[unescapeKeyPathComponent(t2.slice(0, n2))], t2.slice(n2 + 1), r2) : (e2[unescapeKeyPathComponent(t2)] = r2, e2);
    }
    function _await(e2, t2, r2) {
      return r2 ? t2 ? t2(e2) : e2 : (e2 && e2.then || (e2 = Promise.resolve(e2)), t2 ? e2.then(t2) : e2);
    }
    var o = Object.keys, a = Array.isArray, c = {}.hasOwnProperty, u = ["type", "replaced", "iterateIn", "iterateUnsetNumeric"];
    function _async(e2) {
      return function() {
        for (var t2 = [], r2 = 0; r2 < arguments.length; r2++) t2[r2] = arguments[r2];
        try {
          return Promise.resolve(e2.apply(this, t2));
        } catch (e3) {
          return Promise.reject(e3);
        }
      };
    }
    function nestedPathsFirst(e2, t2) {
      if ("" === e2.keypath) return -1;
      var r2 = e2.keypath.match(/\./g) || 0, n2 = t2.keypath.match(/\./g) || 0;
      return r2 && (r2 = r2.length), n2 && (n2 = n2.length), r2 > n2 ? -1 : r2 < n2 ? 1 : e2.keypath < t2.keypath ? -1 : e2.keypath > t2.keypath;
    }
    var s = function() {
      function Typeson(e2) {
        _classCallCheck(this, Typeson), this.options = e2, this.plainObjectReplacers = [], this.nonplainObjectReplacers = [], this.revivers = {}, this.types = {};
      }
      return function _createClass(e2, t2, r2) {
        return t2 && _defineProperties(e2.prototype, t2), r2 && _defineProperties(e2, r2), e2;
      }(Typeson, [{ key: "stringify", value: function stringify(e2, t2, r2, n2) {
        n2 = _objectSpread2(_objectSpread2(_objectSpread2({}, this.options), n2), {}, { stringification: true });
        var i2 = this.encapsulate(e2, null, n2);
        return a(i2) ? JSON.stringify(i2[0], t2, r2) : i2.then(function(e3) {
          return JSON.stringify(e3, t2, r2);
        });
      } }, { key: "stringifySync", value: function stringifySync(e2, t2, r2, n2) {
        return this.stringify(e2, t2, r2, _objectSpread2(_objectSpread2({ throwOnBadSyncType: true }, n2), {}, { sync: true }));
      } }, { key: "stringifyAsync", value: function stringifyAsync(e2, t2, r2, n2) {
        return this.stringify(e2, t2, r2, _objectSpread2(_objectSpread2({ throwOnBadSyncType: true }, n2), {}, { sync: false }));
      } }, { key: "parse", value: function parse(e2, t2, r2) {
        return r2 = _objectSpread2(_objectSpread2(_objectSpread2({}, this.options), r2), {}, { parse: true }), this.revive(JSON.parse(e2, t2), r2);
      } }, { key: "parseSync", value: function parseSync(e2, t2, r2) {
        return this.parse(e2, t2, _objectSpread2(_objectSpread2({ throwOnBadSyncType: true }, r2), {}, { sync: true }));
      } }, { key: "parseAsync", value: function parseAsync(e2, t2, r2) {
        return this.parse(e2, t2, _objectSpread2(_objectSpread2({ throwOnBadSyncType: true }, r2), {}, { sync: false }));
      } }, { key: "specialTypeNames", value: function specialTypeNames(e2, t2) {
        var r2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
        return r2.returnTypeNames = true, this.encapsulate(e2, t2, r2);
      } }, { key: "rootTypeName", value: function rootTypeName(e2, t2) {
        var r2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
        return r2.iterateNone = true, this.encapsulate(e2, t2, r2);
      } }, { key: "encapsulate", value: function encapsulate(t2, r2, n2) {
        var i2 = _async(function(t3, r3) {
          return _await(Promise.all(r3.map(function(e2) {
            return e2[1].p;
          })), function(n3) {
            return _await(Promise.all(n3.map(_async(function(n4) {
              var o2 = false, a2 = [], c2 = _slicedToArray(r3.splice(0, 1), 1), u2 = _slicedToArray(c2[0], 7), s3 = u2[0], f3 = u2[2], l3 = u2[3], p3 = u2[4], y3 = u2[5], v3 = u2[6], b3 = _encapsulate(s3, n4, f3, l3, a2, true, v3), d3 = hasConstructorOf(b3, e);
              return function _invoke(e2, t4) {
                var r4 = e2();
                return r4 && r4.then ? r4.then(t4) : t4(r4);
              }(function() {
                if (s3 && d3) return _await(b3.p, function(e2) {
                  return p3[y3] = e2, o2 = true, i2(t3, a2);
                });
              }, function(e2) {
                return o2 ? e2 : (s3 ? p3[y3] = b3 : t3 = d3 ? b3.p : b3, i2(t3, a2));
              });
            }))), function() {
              return t3;
            });
          });
        }), s2 = (n2 = _objectSpread2(_objectSpread2({ sync: true }, this.options), n2)).sync, f2 = this, l2 = {}, p2 = [], y2 = [], v2 = [], b2 = !("cyclic" in n2) || n2.cyclic, d2 = n2.encapsulateObserver, h2 = _encapsulate("", t2, b2, r2 || {}, v2);
        function finish(e2) {
          var t3 = Object.values(l2);
          if (n2.iterateNone) return t3.length ? t3[0] : Typeson.getJSONType(e2);
          if (t3.length) {
            if (n2.returnTypeNames) return _toConsumableArray(new Set(t3));
            e2 && isPlainObject(e2) && !c.call(e2, "$types") ? e2.$types = l2 : e2 = { $: e2, $types: { $: l2 } };
          } else isObject(e2) && c.call(e2, "$types") && (e2 = { $: e2, $types: true });
          return !n2.returnTypeNames && e2;
        }
        function _adaptBuiltinStateObjectProperties(e2, t3, r3) {
          Object.assign(e2, t3);
          var n3 = u.map(function(t4) {
            var r4 = e2[t4];
            return delete e2[t4], r4;
          });
          r3(), u.forEach(function(t4, r4) {
            e2[t4] = n3[r4];
          });
        }
        function _encapsulate(t3, r3, i3, u2, s3, v3, b3) {
          var h3, g2 = {}, m2 = _typeof(r3), O2 = d2 ? function(n3) {
            var o2 = b3 || u2.type || Typeson.getJSONType(r3);
            d2(Object.assign(n3 || g2, { keypath: t3, value: r3, cyclic: i3, stateObj: u2, promisesData: s3, resolvingTypesonPromise: v3, awaitingTypesonPromise: hasConstructorOf(r3, e) }, { type: o2 }));
          } : null;
          if (["string", "boolean", "number", "undefined"].includes(m2)) return void 0 === r3 || Number.isNaN(r3) || r3 === Number.NEGATIVE_INFINITY || r3 === Number.POSITIVE_INFINITY ? (h3 = u2.replaced ? r3 : replace(t3, r3, u2, s3, false, v3, O2)) !== r3 && (g2 = { replaced: h3 }) : h3 = r3, O2 && O2(), h3;
          if (null === r3) return O2 && O2(), r3;
          if (i3 && !u2.iterateIn && !u2.iterateUnsetNumeric && r3 && "object" === _typeof(r3)) {
            var _2 = p2.indexOf(r3);
            if (!(_2 < 0)) return l2[t3] = "#", O2 && O2({ cyclicKeypath: y2[_2] }), "#" + y2[_2];
            true === i3 && (p2.push(r3), y2.push(t3));
          }
          var j2, S2 = isPlainObject(r3), T2 = a(r3), w2 = (S2 || T2) && (!f2.plainObjectReplacers.length || u2.replaced) || u2.iterateIn ? r3 : replace(t3, r3, u2, s3, S2 || T2, null, O2);
          if (w2 !== r3 ? (h3 = w2, g2 = { replaced: w2 }) : "" === t3 && hasConstructorOf(r3, e) ? (s3.push([t3, r3, i3, u2, void 0, void 0, u2.type]), h3 = r3) : T2 && "object" !== u2.iterateIn || "array" === u2.iterateIn ? (j2 = new Array(r3.length), g2 = { clone: j2 }) : (["function", "symbol"].includes(_typeof(r3)) || "toJSON" in r3 || hasConstructorOf(r3, e) || hasConstructorOf(r3, Promise) || hasConstructorOf(r3, ArrayBuffer)) && !S2 && "object" !== u2.iterateIn ? h3 = r3 : (j2 = {}, u2.addLength && (j2.length = r3.length), g2 = { clone: j2 }), O2 && O2(), n2.iterateNone) return j2 || h3;
          if (!j2) return h3;
          if (u2.iterateIn) {
            var A2 = function _loop(n3) {
              var o2 = { ownKeys: c.call(r3, n3) };
              _adaptBuiltinStateObjectProperties(u2, o2, function() {
                var o3 = t3 + (t3 ? "." : "") + escapeKeyPathComponent(n3), a2 = _encapsulate(o3, r3[n3], Boolean(i3), u2, s3, v3);
                hasConstructorOf(a2, e) ? s3.push([o3, a2, Boolean(i3), u2, j2, n3, u2.type]) : void 0 !== a2 && (j2[n3] = a2);
              });
            };
            for (var P2 in r3) A2(P2);
            O2 && O2({ endIterateIn: true, end: true });
          } else o(r3).forEach(function(n3) {
            var o2 = t3 + (t3 ? "." : "") + escapeKeyPathComponent(n3);
            _adaptBuiltinStateObjectProperties(u2, { ownKeys: true }, function() {
              var t4 = _encapsulate(o2, r3[n3], Boolean(i3), u2, s3, v3);
              hasConstructorOf(t4, e) ? s3.push([o2, t4, Boolean(i3), u2, j2, n3, u2.type]) : void 0 !== t4 && (j2[n3] = t4);
            });
          }), O2 && O2({ endIterateOwn: true, end: true });
          if (u2.iterateUnsetNumeric) {
            for (var I2 = r3.length, C2 = function _loop2(n3) {
              if (!(n3 in r3)) {
                var o2 = t3 + (t3 ? "." : "") + n3;
                _adaptBuiltinStateObjectProperties(u2, { ownKeys: false }, function() {
                  var t4 = _encapsulate(o2, void 0, Boolean(i3), u2, s3, v3);
                  hasConstructorOf(t4, e) ? s3.push([o2, t4, Boolean(i3), u2, j2, n3, u2.type]) : void 0 !== t4 && (j2[n3] = t4);
                });
              }
            }, N2 = 0; N2 < I2; N2++) C2(N2);
            O2 && O2({ endIterateUnsetNumeric: true, end: true });
          }
          return j2;
        }
        function replace(e2, t3, r3, n3, i3, o2, a2) {
          for (var c2 = i3 ? f2.plainObjectReplacers : f2.nonplainObjectReplacers, u2 = c2.length; u2--; ) {
            var p3 = c2[u2];
            if (p3.test(t3, r3)) {
              var y3 = p3.type;
              if (f2.revivers[y3]) {
                var v3 = l2[e2];
                l2[e2] = v3 ? [y3].concat(v3) : y3;
              }
              return Object.assign(r3, { type: y3, replaced: true }), !s2 && p3.replaceAsync || p3.replace ? (a2 && a2({ replacing: true }), _encapsulate(e2, p3[s2 || !p3.replaceAsync ? "replace" : "replaceAsync"](t3, r3), b2 && "readonly", r3, n3, o2, y3)) : (a2 && a2({ typeDetected: true }), _encapsulate(e2, t3, b2 && "readonly", r3, n3, o2, y3));
            }
          }
          return t3;
        }
        return v2.length ? s2 && n2.throwOnBadSyncType ? function() {
          throw new TypeError("Sync method requested but async result obtained");
        }() : Promise.resolve(i2(h2, v2)).then(finish) : !s2 && n2.throwOnBadSyncType ? function() {
          throw new TypeError("Async method requested but sync result obtained");
        }() : n2.stringification && s2 ? [finish(h2)] : s2 ? finish(h2) : Promise.resolve(finish(h2));
      } }, { key: "encapsulateSync", value: function encapsulateSync(e2, t2, r2) {
        return this.encapsulate(e2, t2, _objectSpread2(_objectSpread2({ throwOnBadSyncType: true }, r2), {}, { sync: true }));
      } }, { key: "encapsulateAsync", value: function encapsulateAsync(e2, t2, r2) {
        return this.encapsulate(e2, t2, _objectSpread2(_objectSpread2({ throwOnBadSyncType: true }, r2), {}, { sync: false }));
      } }, { key: "revive", value: function revive(t2, r2) {
        var n2 = t2 && t2.$types;
        if (!n2) return t2;
        if (true === n2) return t2.$;
        var i2 = (r2 = _objectSpread2(_objectSpread2({ sync: true }, this.options), r2)).sync, c2 = [], u2 = {}, s2 = true;
        n2.$ && isPlainObject(n2.$) && (t2 = t2.$, n2 = n2.$, s2 = false);
        var l2 = this;
        function executeReviver(e2, t3) {
          var r3 = _slicedToArray(l2.revivers[e2] || [], 1)[0];
          if (!r3) throw new Error("Unregistered type: " + e2);
          return i2 && !("revive" in r3) ? t3 : r3[i2 && r3.revive ? "revive" : !i2 && r3.reviveAsync ? "reviveAsync" : "revive"](t3, u2);
        }
        var p2 = [];
        function checkUndefined(e2) {
          return hasConstructorOf(e2, f) ? void 0 : e2;
        }
        var y2, v2 = function revivePlainObjects() {
          var r3 = [];
          if (Object.entries(n2).forEach(function(e2) {
            var t3 = _slicedToArray(e2, 2), i3 = t3[0], o2 = t3[1];
            "#" !== o2 && [].concat(o2).forEach(function(e3) {
              _slicedToArray(l2.revivers[e3] || [null, {}], 2)[1].plain && (r3.push({ keypath: i3, type: e3 }), delete n2[i3]);
            });
          }), r3.length) return r3.sort(nestedPathsFirst).reduce(function reducer(r4, n3) {
            var i3 = n3.keypath, o2 = n3.type;
            if (isThenable(r4)) return r4.then(function(e2) {
              return reducer(e2, { keypath: i3, type: o2 });
            });
            var a2 = getByKeyPath(t2, i3);
            if (hasConstructorOf(a2 = executeReviver(o2, a2), e)) return a2.then(function(e2) {
              var r5 = setAtKeyPath(t2, i3, e2);
              r5 === e2 && (t2 = r5);
            });
            var c3 = setAtKeyPath(t2, i3, a2);
            c3 === a2 && (t2 = c3);
          }, void 0);
        }();
        return hasConstructorOf(v2, e) ? y2 = v2.then(function() {
          return t2;
        }) : (y2 = function _revive(t3, r3, i3, u3, l3) {
          if (!s2 || "$types" !== t3) {
            var y3 = n2[t3], v3 = a(r3);
            if (v3 || isPlainObject(r3)) {
              var b2 = v3 ? new Array(r3.length) : {};
              for (o(r3).forEach(function(n3) {
                var o2 = _revive(t3 + (t3 ? "." : "") + escapeKeyPathComponent(n3), r3[n3], i3 || b2, b2, n3), a2 = function set(e2) {
                  return hasConstructorOf(e2, f) ? b2[n3] = void 0 : void 0 !== e2 && (b2[n3] = e2), e2;
                };
                hasConstructorOf(o2, e) ? p2.push(o2.then(function(e2) {
                  return a2(e2);
                })) : a2(o2);
              }), r3 = b2; c2.length; ) {
                var d2 = _slicedToArray(c2[0], 4), h2 = d2[0], g2 = d2[1], m2 = d2[2], O2 = d2[3], _2 = getByKeyPath(h2, g2);
                if (void 0 === _2) break;
                m2[O2] = _2, c2.splice(0, 1);
              }
            }
            if (!y3) return r3;
            if ("#" === y3) {
              var j2 = getByKeyPath(i3, r3.slice(1));
              return void 0 === j2 && c2.push([i3, r3.slice(1), u3, l3]), j2;
            }
            return [].concat(y3).reduce(function reducer(t4, r4) {
              return hasConstructorOf(t4, e) ? t4.then(function(e2) {
                return reducer(e2, r4);
              }) : executeReviver(r4, t4);
            }, r3);
          }
        }("", t2, null), p2.length && (y2 = e.resolve(y2).then(function(t3) {
          return e.all([t3].concat(p2));
        }).then(function(e2) {
          return _slicedToArray(e2, 1)[0];
        }))), isThenable(y2) ? i2 && r2.throwOnBadSyncType ? function() {
          throw new TypeError("Sync method requested but async result obtained");
        }() : hasConstructorOf(y2, e) ? y2.p.then(checkUndefined) : y2 : !i2 && r2.throwOnBadSyncType ? function() {
          throw new TypeError("Async method requested but sync result obtained");
        }() : i2 ? checkUndefined(y2) : Promise.resolve(checkUndefined(y2));
      } }, { key: "reviveSync", value: function reviveSync(e2, t2) {
        return this.revive(e2, _objectSpread2(_objectSpread2({ throwOnBadSyncType: true }, t2), {}, { sync: true }));
      } }, { key: "reviveAsync", value: function reviveAsync(e2, t2) {
        return this.revive(e2, _objectSpread2(_objectSpread2({ throwOnBadSyncType: true }, t2), {}, { sync: false }));
      } }, { key: "register", value: function register(e2, t2) {
        return t2 = t2 || {}, [].concat(e2).forEach(function R(e3) {
          var r2 = this;
          if (a(e3)) return e3.map(function(e4) {
            return R.call(r2, e4);
          });
          e3 && o(e3).forEach(function(r3) {
            if ("#" === r3) throw new TypeError("# cannot be used as a type name as it is reserved for cyclic objects");
            if (Typeson.JSON_TYPES.includes(r3)) throw new TypeError("Plain JSON object types are reserved as type names");
            var n2 = e3[r3], i2 = n2 && n2.testPlainObjects ? this.plainObjectReplacers : this.nonplainObjectReplacers, o2 = i2.filter(function(e4) {
              return e4.type === r3;
            });
            if (o2.length && (i2.splice(i2.indexOf(o2[0]), 1), delete this.revivers[r3], delete this.types[r3]), "function" == typeof n2) {
              var c2 = n2;
              n2 = { test: function test(e4) {
                return e4 && e4.constructor === c2;
              }, replace: function replace(e4) {
                return _objectSpread2({}, e4);
              }, revive: function revive(e4) {
                return Object.assign(Object.create(c2.prototype), e4);
              } };
            } else if (a(n2)) {
              var u2 = _slicedToArray(n2, 3);
              n2 = { test: u2[0], replace: u2[1], revive: u2[2] };
            }
            if (n2 && n2.test) {
              var s2 = { type: r3, test: n2.test.bind(n2) };
              n2.replace && (s2.replace = n2.replace.bind(n2)), n2.replaceAsync && (s2.replaceAsync = n2.replaceAsync.bind(n2));
              var f2 = "number" == typeof t2.fallback ? t2.fallback : t2.fallback ? 0 : Number.POSITIVE_INFINITY;
              if (n2.testPlainObjects ? this.plainObjectReplacers.splice(f2, 0, s2) : this.nonplainObjectReplacers.splice(f2, 0, s2), n2.revive || n2.reviveAsync) {
                var l2 = {};
                n2.revive && (l2.revive = n2.revive.bind(n2)), n2.reviveAsync && (l2.reviveAsync = n2.reviveAsync.bind(n2)), this.revivers[r3] = [l2, { plain: n2.testPlainObjects }];
              }
              this.types[r3] = n2;
            }
          }, this);
        }, this), this;
      } }]), Typeson;
    }(), f = function Undefined() {
      _classCallCheck(this, Undefined);
    };
    f.__typeson__type__ = "TypesonUndefined", s.Undefined = f, s.Promise = e, s.isThenable = isThenable, s.toStringTag = toStringTag, s.hasConstructorOf = hasConstructorOf, s.isObject = isObject, s.isPlainObject = isPlainObject, s.isUserObject = function isUserObject(e2) {
      if (!e2 || "Object" !== toStringTag(e2)) return false;
      var t2 = n(e2);
      return !t2 || (hasConstructorOf(e2, Object) || isUserObject(t2));
    }, s.escapeKeyPathComponent = escapeKeyPathComponent, s.unescapeKeyPathComponent = unescapeKeyPathComponent, s.getByKeyPath = getByKeyPath, s.getJSONType = function getJSONType(e2) {
      return null === e2 ? "null" : Array.isArray(e2) ? "array" : _typeof(e2);
    }, s.JSON_TYPES = ["null", "boolean", "number", "string", "array", "object"];
    for (var l = { userObject: { test: function test(e2, t2) {
      return s.isUserObject(e2);
    }, replace: function replace(e2) {
      return function _objectSpread2$1(e3) {
        for (var t2 = 1; t2 < arguments.length; t2++) {
          var r2 = null != arguments[t2] ? arguments[t2] : {};
          t2 % 2 ? ownKeys$1(Object(r2), true).forEach(function(t3) {
            _defineProperty$1(e3, t3, r2[t3]);
          }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e3, Object.getOwnPropertyDescriptors(r2)) : ownKeys$1(Object(r2)).forEach(function(t3) {
            Object.defineProperty(e3, t3, Object.getOwnPropertyDescriptor(r2, t3));
          });
        }
        return e3;
      }({}, e2);
    }, revive: function revive(e2) {
      return e2;
    } } }, p = [{ arrayNonindexKeys: { testPlainObjects: true, test: function test(e2, t2) {
      return !!Array.isArray(e2) && (Object.keys(e2).some(function(e3) {
        return String(Number.parseInt(e3)) !== e3;
      }) && (t2.iterateIn = "object", t2.addLength = true), true);
    }, replace: function replace(e2, t2) {
      return t2.iterateUnsetNumeric = true, e2;
    }, revive: function revive(e2) {
      if (Array.isArray(e2)) return e2;
      var t2 = [];
      return Object.keys(e2).forEach(function(r2) {
        var n2 = e2[r2];
        t2[r2] = n2;
      }), t2;
    } } }, { sparseUndefined: { test: function test(e2, t2) {
      return void 0 === e2 && false === t2.ownKeys;
    }, replace: function replace(e2) {
      return 0;
    }, revive: function revive(e2) {
    } } }], y = { undef: { test: function test(e2, t2) {
      return void 0 === e2 && (t2.ownKeys || !("ownKeys" in t2));
    }, replace: function replace(e2) {
      return 0;
    }, revive: function revive(e2) {
      return new s.Undefined();
    } } }, v = { StringObject: { test: function test(e2) {
      return "String" === s.toStringTag(e2) && "object" === _typeof$1(e2);
    }, replace: function replace(e2) {
      return String(e2);
    }, revive: function revive(e2) {
      return new String(e2);
    } }, BooleanObject: { test: function test(e2) {
      return "Boolean" === s.toStringTag(e2) && "object" === _typeof$1(e2);
    }, replace: function replace(e2) {
      return Boolean(e2);
    }, revive: function revive(e2) {
      return new Boolean(e2);
    } }, NumberObject: { test: function test(e2) {
      return "Number" === s.toStringTag(e2) && "object" === _typeof$1(e2);
    }, replace: function replace(e2) {
      return Number(e2);
    }, revive: function revive(e2) {
      return new Number(e2);
    } } }, b = [{ nan: { test: function test(e2) {
      return Number.isNaN(e2);
    }, replace: function replace(e2) {
      return "NaN";
    }, revive: function revive(e2) {
      return Number.NaN;
    } } }, { infinity: { test: function test(e2) {
      return e2 === Number.POSITIVE_INFINITY;
    }, replace: function replace(e2) {
      return "Infinity";
    }, revive: function revive(e2) {
      return Number.POSITIVE_INFINITY;
    } } }, { negativeInfinity: { test: function test(e2) {
      return e2 === Number.NEGATIVE_INFINITY;
    }, replace: function replace(e2) {
      return "-Infinity";
    }, revive: function revive(e2) {
      return Number.NEGATIVE_INFINITY;
    } } }], d = { date: { test: function test(e2) {
      return "Date" === s.toStringTag(e2);
    }, replace: function replace(e2) {
      var t2 = e2.getTime();
      return Number.isNaN(t2) ? "NaN" : t2;
    }, revive: function revive(e2) {
      return "NaN" === e2 ? new Date(Number.NaN) : new Date(e2);
    } } }, h = { regexp: { test: function test(e2) {
      return "RegExp" === s.toStringTag(e2);
    }, replace: function replace(e2) {
      return { source: e2.source, flags: (e2.global ? "g" : "") + (e2.ignoreCase ? "i" : "") + (e2.multiline ? "m" : "") + (e2.sticky ? "y" : "") + (e2.unicode ? "u" : "") };
    }, revive: function revive(e2) {
      var t2 = e2.source, r2 = e2.flags;
      return new RegExp(t2, r2);
    } } }, g = { map: { test: function test(e2) {
      return "Map" === s.toStringTag(e2);
    }, replace: function replace(e2) {
      return _toConsumableArray$1(e2.entries());
    }, revive: function revive(e2) {
      return new Map(e2);
    } } }, m = { set: { test: function test(e2) {
      return "Set" === s.toStringTag(e2);
    }, replace: function replace(e2) {
      return _toConsumableArray$1(e2.values());
    }, revive: function revive(e2) {
      return new Set(e2);
    } } }, O = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", _ = new Uint8Array(256), j = 0; j < O.length; j++) _[O.charCodeAt(j)] = j;
    var S = function encode3(e2, t2, r2) {
      null == r2 && (r2 = e2.byteLength);
      for (var n2 = new Uint8Array(e2, t2 || 0, r2), i2 = n2.length, o2 = "", a2 = 0; a2 < i2; a2 += 3) o2 += O[n2[a2] >> 2], o2 += O[(3 & n2[a2]) << 4 | n2[a2 + 1] >> 4], o2 += O[(15 & n2[a2 + 1]) << 2 | n2[a2 + 2] >> 6], o2 += O[63 & n2[a2 + 2]];
      return i2 % 3 == 2 ? o2 = o2.slice(0, -1) + "=" : i2 % 3 == 1 && (o2 = o2.slice(0, -2) + "=="), o2;
    }, T = function decode3(e2) {
      var t2, r2, n2, i2, o2 = e2.length, a2 = 0.75 * e2.length, c2 = 0;
      "=" === e2[e2.length - 1] && (a2--, "=" === e2[e2.length - 2] && a2--);
      for (var u2 = new ArrayBuffer(a2), s2 = new Uint8Array(u2), f2 = 0; f2 < o2; f2 += 4) t2 = _[e2.charCodeAt(f2)], r2 = _[e2.charCodeAt(f2 + 1)], n2 = _[e2.charCodeAt(f2 + 2)], i2 = _[e2.charCodeAt(f2 + 3)], s2[c2++] = t2 << 2 | r2 >> 4, s2[c2++] = (15 & r2) << 4 | n2 >> 2, s2[c2++] = (3 & n2) << 6 | 63 & i2;
      return u2;
    }, w = { arraybuffer: { test: function test(e2) {
      return "ArrayBuffer" === s.toStringTag(e2);
    }, replace: function replace(e2, t2) {
      t2.buffers || (t2.buffers = []);
      var r2 = t2.buffers.indexOf(e2);
      return r2 > -1 ? { index: r2 } : (t2.buffers.push(e2), S(e2));
    }, revive: function revive(e2, t2) {
      if (t2.buffers || (t2.buffers = []), "object" === _typeof$1(e2)) return t2.buffers[e2.index];
      var r2 = T(e2);
      return t2.buffers.push(r2), r2;
    } } }, A = "undefined" == typeof self ? commonjsGlobal : self, P = {};
    ["Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "Float32Array", "Float64Array"].forEach(function(e2) {
      var t2 = e2, r2 = A[t2];
      r2 && (P[e2.toLowerCase()] = { test: function test(e3) {
        return s.toStringTag(e3) === t2;
      }, replace: function replace(e3, t3) {
        var r3 = e3.buffer, n2 = e3.byteOffset, i2 = e3.length;
        t3.buffers || (t3.buffers = []);
        var o2 = t3.buffers.indexOf(r3);
        return o2 > -1 ? { index: o2, byteOffset: n2, length: i2 } : (t3.buffers.push(r3), { encoded: S(r3), byteOffset: n2, length: i2 });
      }, revive: function revive(e3, t3) {
        t3.buffers || (t3.buffers = []);
        var n2, i2 = e3.byteOffset, o2 = e3.length, a2 = e3.encoded, c2 = e3.index;
        return "index" in e3 ? n2 = t3.buffers[c2] : (n2 = T(a2), t3.buffers.push(n2)), new r2(n2, i2, o2);
      } });
    });
    var I = { dataview: { test: function test(e2) {
      return "DataView" === s.toStringTag(e2);
    }, replace: function replace(e2, t2) {
      var r2 = e2.buffer, n2 = e2.byteOffset, i2 = e2.byteLength;
      t2.buffers || (t2.buffers = []);
      var o2 = t2.buffers.indexOf(r2);
      return o2 > -1 ? { index: o2, byteOffset: n2, byteLength: i2 } : (t2.buffers.push(r2), { encoded: S(r2), byteOffset: n2, byteLength: i2 });
    }, revive: function revive(e2, t2) {
      t2.buffers || (t2.buffers = []);
      var r2, n2 = e2.byteOffset, i2 = e2.byteLength, o2 = e2.encoded, a2 = e2.index;
      return "index" in e2 ? r2 = t2.buffers[a2] : (r2 = T(o2), t2.buffers.push(r2)), new DataView(r2, n2, i2);
    } } }, C = { IntlCollator: { test: function test(e2) {
      return s.hasConstructorOf(e2, Intl.Collator);
    }, replace: function replace(e2) {
      return e2.resolvedOptions();
    }, revive: function revive(e2) {
      return new Intl.Collator(e2.locale, e2);
    } }, IntlDateTimeFormat: { test: function test(e2) {
      return s.hasConstructorOf(e2, Intl.DateTimeFormat);
    }, replace: function replace(e2) {
      return e2.resolvedOptions();
    }, revive: function revive(e2) {
      return new Intl.DateTimeFormat(e2.locale, e2);
    } }, IntlNumberFormat: { test: function test(e2) {
      return s.hasConstructorOf(e2, Intl.NumberFormat);
    }, replace: function replace(e2) {
      return e2.resolvedOptions();
    }, revive: function revive(e2) {
      return new Intl.NumberFormat(e2.locale, e2);
    } } };
    function string2arraybuffer(e2) {
      for (var t2 = new Uint8Array(e2.length), r2 = 0; r2 < e2.length; r2++) t2[r2] = e2.charCodeAt(r2);
      return t2.buffer;
    }
    var N = { file: { test: function test(e2) {
      return "File" === s.toStringTag(e2);
    }, replace: function replace(e2) {
      var t2 = new XMLHttpRequest();
      if (t2.overrideMimeType("text/plain; charset=x-user-defined"), t2.open("GET", URL.createObjectURL(e2), false), t2.send(), 200 !== t2.status && 0 !== t2.status) throw new Error("Bad File access: " + t2.status);
      return { type: e2.type, stringContents: t2.responseText, name: e2.name, lastModified: e2.lastModified };
    }, revive: function revive(e2) {
      var t2 = e2.name, r2 = e2.type, n2 = e2.stringContents, i2 = e2.lastModified;
      return new File([string2arraybuffer(n2)], t2, { type: r2, lastModified: i2 });
    }, replaceAsync: function replaceAsync(e2) {
      return new s.Promise(function(t2, r2) {
        var n2 = new FileReader();
        n2.addEventListener("load", function() {
          t2({ type: e2.type, stringContents: n2.result, name: e2.name, lastModified: e2.lastModified });
        }), n2.addEventListener("error", function() {
          r2(n2.error);
        }), n2.readAsBinaryString(e2);
      });
    } } }, k = { bigint: { test: function test(e2) {
      return "bigint" == typeof e2;
    }, replace: function replace(e2) {
      return String(e2);
    }, revive: function revive(e2) {
      return BigInt(e2);
    } } }, E = { bigintObject: { test: function test(e2) {
      return "object" === _typeof$1(e2) && s.hasConstructorOf(e2, BigInt);
    }, replace: function replace(e2) {
      return String(e2);
    }, revive: function revive(e2) {
      return new Object(BigInt(e2));
    } } }, B = { cryptokey: { test: function test(e2) {
      return "CryptoKey" === s.toStringTag(e2) && e2.extractable;
    }, replaceAsync: function replaceAsync(e2) {
      return new s.Promise(function(t2, r2) {
        crypto.subtle.exportKey("jwk", e2).catch(function(e3) {
          r2(e3);
        }).then(function(r3) {
          t2({ jwk: r3, algorithm: e2.algorithm, usages: e2.usages });
        });
      });
    }, revive: function revive(e2) {
      var t2 = e2.jwk, r2 = e2.algorithm, n2 = e2.usages;
      return crypto.subtle.importKey("jwk", t2, r2, true, n2);
    } } };
    return [l, y, p, v, b, d, h, { imagedata: { test: function test(e2) {
      return "ImageData" === s.toStringTag(e2);
    }, replace: function replace(e2) {
      return { array: _toConsumableArray$1(e2.data), width: e2.width, height: e2.height };
    }, revive: function revive(e2) {
      return new ImageData(new Uint8ClampedArray(e2.array), e2.width, e2.height);
    } } }, { imagebitmap: { test: function test(e2) {
      return "ImageBitmap" === s.toStringTag(e2) || e2 && e2.dataset && "ImageBitmap" === e2.dataset.toStringTag;
    }, replace: function replace(e2) {
      var t2 = document.createElement("canvas");
      return t2.getContext("2d").drawImage(e2, 0, 0), t2.toDataURL();
    }, revive: function revive(e2) {
      var t2 = document.createElement("canvas"), r2 = t2.getContext("2d"), n2 = document.createElement("img");
      return n2.addEventListener("load", function() {
        r2.drawImage(n2, 0, 0);
      }), n2.src = e2, t2;
    }, reviveAsync: function reviveAsync(e2) {
      var t2 = document.createElement("canvas"), r2 = t2.getContext("2d"), n2 = document.createElement("img");
      return n2.addEventListener("load", function() {
        r2.drawImage(n2, 0, 0);
      }), n2.src = e2, createImageBitmap(t2);
    } } }, N, { file: N.file, filelist: { test: function test(e2) {
      return "FileList" === s.toStringTag(e2);
    }, replace: function replace(e2) {
      for (var t2 = [], r2 = 0; r2 < e2.length; r2++) t2[r2] = e2.item(r2);
      return t2;
    }, revive: function revive(e2) {
      return new (function() {
        function FileList() {
          _classCallCheck$1(this, FileList), this._files = arguments[0], this.length = this._files.length;
        }
        return function _createClass$1(e3, t2, r2) {
          return t2 && _defineProperties$1(e3.prototype, t2), r2 && _defineProperties$1(e3, r2), e3;
        }(FileList, [{ key: "item", value: function item(e3) {
          return this._files[e3];
        } }, { key: Symbol.toStringTag, get: function get() {
          return "FileList";
        } }]), FileList;
      }())(e2);
    } } }, { blob: { test: function test(e2) {
      return "Blob" === s.toStringTag(e2);
    }, replace: function replace(e2) {
      var t2 = new XMLHttpRequest();
      if (t2.overrideMimeType("text/plain; charset=x-user-defined"), t2.open("GET", URL.createObjectURL(e2), false), t2.send(), 200 !== t2.status && 0 !== t2.status) throw new Error("Bad Blob access: " + t2.status);
      return { type: e2.type, stringContents: t2.responseText };
    }, revive: function revive(e2) {
      var t2 = e2.type, r2 = e2.stringContents;
      return new Blob([string2arraybuffer(r2)], { type: t2 });
    }, replaceAsync: function replaceAsync(e2) {
      return new s.Promise(function(t2, r2) {
        var n2 = new FileReader();
        n2.addEventListener("load", function() {
          t2({ type: e2.type, stringContents: n2.result });
        }), n2.addEventListener("error", function() {
          r2(n2.error);
        }), n2.readAsBinaryString(e2);
      });
    } } }].concat("function" == typeof Map ? g : [], "function" == typeof Set ? m : [], "function" == typeof ArrayBuffer ? w : [], "function" == typeof Uint8Array ? P : [], "function" == typeof DataView ? I : [], "undefined" != typeof Intl ? C : [], "undefined" != typeof crypto ? B : [], "undefined" != typeof BigInt ? [k, E] : []);
  });
});
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var lookup = new Uint8Array(256);
for (i = 0; i < chars.length; i++) {
  lookup[chars.codePointAt(i)] = i;
}
var i;
var encode = function encode2(arraybuffer, byteOffset, lngth) {
  if (lngth === null || lngth === void 0) {
    lngth = arraybuffer.byteLength;
  }
  var bytes = new Uint8Array(
    arraybuffer,
    byteOffset || 0,
    // Default needed for Safari
    lngth
  );
  var len = bytes.length;
  var base64 = "";
  for (var _i = 0; _i < len; _i += 3) {
    base64 += chars[bytes[_i] >> 2];
    base64 += chars[(bytes[_i] & 3) << 4 | bytes[_i + 1] >> 4];
    base64 += chars[(bytes[_i + 1] & 15) << 2 | bytes[_i + 2] >> 6];
    base64 += chars[bytes[_i + 2] & 63];
  }
  if (len % 3 === 2) {
    base64 = base64.slice(0, -1) + "=";
  } else if (len % 3 === 1) {
    base64 = base64.slice(0, -2) + "==";
  }
  return base64;
};
var decode = function decode2(base64) {
  var len = base64.length;
  var bufferLength = base64.length * 0.75;
  var p = 0;
  var encoded1, encoded2, encoded3, encoded4;
  if (base64[base64.length - 1] === "=") {
    bufferLength--;
    if (base64[base64.length - 2] === "=") {
      bufferLength--;
    }
  }
  var arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
  for (var _i2 = 0; _i2 < len; _i2 += 4) {
    encoded1 = lookup[base64.codePointAt(_i2)];
    encoded2 = lookup[base64.codePointAt(_i2 + 1)];
    encoded3 = lookup[base64.codePointAt(_i2 + 2)];
    encoded4 = lookup[base64.codePointAt(_i2 + 3)];
    bytes[p++] = encoded1 << 2 | encoded2 >> 4;
    bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
    bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
  }
  return arraybuffer;
};
var _global = typeof self === "undefined" ? global : self;
var exportObj = {};
[
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Uint16Array",
  "Int32Array",
  "Uint32Array",
  "Float32Array",
  "Float64Array"
].forEach(function(typeName) {
  var arrType = typeName;
  var TypedArray = _global[arrType];
  if (TypedArray) {
    exportObj[typeName.toLowerCase() + "2"] = {
      test: function(x) {
        return typeson.toStringTag(x) === arrType;
      },
      replace: function(_a) {
        var buffer = _a.buffer, byteOffset = _a.byteOffset, length = _a.length;
        return {
          buffer,
          byteOffset,
          length
        };
      },
      revive: function(b64Obj) {
        var buffer = b64Obj.buffer, byteOffset = b64Obj.byteOffset, length = b64Obj.length;
        return new TypedArray(buffer, byteOffset, length);
      }
    };
  }
});
var arrayBuffer = {
  arraybuffer: {
    test: function(x) {
      return typeson.toStringTag(x) === "ArrayBuffer";
    },
    replace: function(b) {
      return encode(b, 0, b.byteLength);
    },
    revive: function(b64) {
      var buffer = decode(b64);
      return buffer;
    }
  }
};
var TSON = new typeson().register(structuredCloning);
var readBlobsSynchronously = "FileReaderSync" in self;
var blobsToAwait = [];
var blobsToAwaitPos = 0;
TSON.register([
  arrayBuffer,
  exportObj,
  {
    blob2: {
      test: function(x) {
        return typeson.toStringTag(x) === "Blob";
      },
      replace: function(b) {
        if (b.isClosed) {
          throw new Error("The Blob is closed");
        }
        if (readBlobsSynchronously) {
          var data = readBlobSync(b, "binary");
          var base64 = encode(data, 0, data.byteLength);
          return {
            type: b.type,
            data: base64
          };
        } else {
          blobsToAwait.push(b);
          var result = {
            type: b.type,
            data: { start: blobsToAwaitPos, end: blobsToAwaitPos + b.size }
          };
          blobsToAwaitPos += b.size;
          return result;
        }
      },
      finalize: function(b, ba) {
        b.data = encode(ba, 0, ba.byteLength);
      },
      revive: function(_a) {
        var type = _a.type, data = _a.data;
        return new Blob([decode(data)], { type });
      }
    }
  }
]);
TSON.mustFinalize = function() {
  return blobsToAwait.length > 0;
};
TSON.finalize = function(items) {
  return __awaiter(void 0, void 0, void 0, function() {
    var allChunks, _i, items_1, item, types, arrayType, keyPath, typeName, typeSpec, b;
    var _a, _b;
    return __generator(this, function(_c) {
      switch (_c.label) {
        case 0:
          return [4, readBlobAsync(new Blob(blobsToAwait), "binary")];
        case 1:
          allChunks = _c.sent();
          if (items) {
            for (_i = 0, items_1 = items; _i < items_1.length; _i++) {
              item = items_1[_i];
              if (item.$types) {
                types = item.$types;
                arrayType = types.$;
                if (arrayType)
                  types = types.$;
                for (keyPath in types) {
                  typeName = types[keyPath];
                  typeSpec = TSON.types[typeName];
                  if (typeSpec && typeSpec.finalize) {
                    b = import_wrapper_default.getByKeyPath(item, arrayType ? "$." + keyPath : keyPath);
                    typeSpec.finalize(b, allChunks.slice((_a = b.data) === null || _a === void 0 ? void 0 : _a.start, (_b = b.data) === null || _b === void 0 ? void 0 : _b.end));
                  }
                }
              }
            }
          }
          blobsToAwait = [];
          blobsToAwaitPos = 0;
          return [
            2
            /*return*/
          ];
      }
    });
  });
};
var DEFAULT_ROWS_PER_CHUNK = 2e3;
function exportDB(db, options) {
  return __awaiter(this, void 0, void 0, function() {
    function exportAll() {
      return __awaiter(this, void 0, void 0, function() {
        var tablesRowCounts, emptyExportJson, posEndDataArray, firstJsonSlice, filter, transform, _loop_1, _i, tables_1, tableName;
        return __generator(this, function(_a) {
          switch (_a.label) {
            case 0:
              return [4, Promise.all(targetTables.map(function(table) {
                return table.count();
              }))];
            case 1:
              tablesRowCounts = _a.sent();
              tablesRowCounts.forEach(function(rowCount, i) {
                return tables[i].rowCount = rowCount;
              });
              progress.totalRows = tablesRowCounts.reduce(function(p, c) {
                return p + c;
              });
              emptyExportJson = JSON.stringify(emptyExport, void 0, prettyJson ? 2 : void 0);
              posEndDataArray = emptyExportJson.lastIndexOf("]");
              firstJsonSlice = emptyExportJson.substring(0, posEndDataArray);
              slices.push(firstJsonSlice);
              filter = options.filter;
              transform = options.transform;
              _loop_1 = function(tableName2) {
                var table, primKey, inbound, LIMIT, emptyTableExport, emptyTableExportJson, posEndRowsArray, lastKey, lastNumRows, mayHaveMoreRows, _loop_2, state_1;
                return __generator(this, function(_b) {
                  switch (_b.label) {
                    case 0:
                      table = db.table(tableName2);
                      primKey = table.schema.primKey;
                      inbound = !!primKey.keyPath;
                      LIMIT = options.numRowsPerChunk || DEFAULT_ROWS_PER_CHUNK;
                      emptyTableExport = inbound ? {
                        tableName: table.name,
                        inbound: true,
                        rows: []
                      } : {
                        tableName: table.name,
                        inbound: false,
                        rows: []
                      };
                      emptyTableExportJson = JSON.stringify(emptyTableExport, void 0, prettyJson ? 2 : void 0);
                      if (prettyJson) {
                        emptyTableExportJson = emptyTableExportJson.split("\n").join("\n    ");
                      }
                      posEndRowsArray = emptyTableExportJson.lastIndexOf("]");
                      slices.push(emptyTableExportJson.substring(0, posEndRowsArray));
                      lastKey = null;
                      lastNumRows = 0;
                      mayHaveMoreRows = true;
                      _loop_2 = function() {
                        var chunkedCollection, values, filteredValues, transformedValues, tsonValues, json, keys, keyvals, tsonTuples, json;
                        return __generator(this, function(_c) {
                          switch (_c.label) {
                            case 0:
                              if (progressCallback) {
                                import_wrapper_default.ignoreTransaction(function() {
                                  return progressCallback(progress);
                                });
                              }
                              chunkedCollection = lastKey == null ? table.limit(LIMIT) : table.where(":id").above(lastKey).limit(LIMIT);
                              return [4, chunkedCollection.toArray()];
                            case 1:
                              values = _c.sent();
                              if (values.length === 0)
                                return [2, "break"];
                              if (lastKey != null && lastNumRows > 0) {
                                slices.push(",");
                                if (prettyJson) {
                                  slices.push("\n      ");
                                }
                              }
                              mayHaveMoreRows = values.length === LIMIT;
                              if (!inbound) return [3, 4];
                              filteredValues = filter ? values.filter(function(value) {
                                return filter(tableName2, value);
                              }) : values;
                              transformedValues = transform ? filteredValues.map(function(value) {
                                return transform(tableName2, value).value;
                              }) : filteredValues;
                              tsonValues = transformedValues.map(function(value) {
                                return TSON.encapsulate(value);
                              });
                              if (!TSON.mustFinalize()) return [3, 3];
                              return [4, import_wrapper_default.waitFor(TSON.finalize(tsonValues))];
                            case 2:
                              _c.sent();
                              _c.label = 3;
                            case 3:
                              json = JSON.stringify(tsonValues, void 0, prettyJson ? 2 : void 0);
                              if (prettyJson)
                                json = json.split("\n").join("\n      ");
                              slices.push(new Blob([json.substring(1, json.length - 1)]));
                              lastNumRows = transformedValues.length;
                              lastKey = values.length > 0 ? import_wrapper_default.getByKeyPath(values[values.length - 1], primKey.keyPath) : null;
                              return [3, 8];
                            case 4:
                              return [4, chunkedCollection.primaryKeys()];
                            case 5:
                              keys = _c.sent();
                              keyvals = keys.map(function(key, i) {
                                return [key, values[i]];
                              });
                              if (filter)
                                keyvals = keyvals.filter(function(_a2) {
                                  var key = _a2[0], value = _a2[1];
                                  return filter(tableName2, value, key);
                                });
                              if (transform)
                                keyvals = keyvals.map(function(_a2) {
                                  var key = _a2[0], value = _a2[1];
                                  var transformResult = transform(tableName2, value, key);
                                  return [transformResult.key, transformResult.value];
                                });
                              tsonTuples = keyvals.map(function(tuple) {
                                return TSON.encapsulate(tuple);
                              });
                              if (!TSON.mustFinalize()) return [3, 7];
                              return [4, import_wrapper_default.waitFor(TSON.finalize(tsonTuples))];
                            case 6:
                              _c.sent();
                              _c.label = 7;
                            case 7:
                              json = JSON.stringify(tsonTuples, void 0, prettyJson ? 2 : void 0);
                              if (prettyJson)
                                json = json.split("\n").join("\n      ");
                              slices.push(new Blob([json.substring(1, json.length - 1)]));
                              lastNumRows = keyvals.length;
                              lastKey = keys.length > 0 ? keys[keys.length - 1] : null;
                              _c.label = 8;
                            case 8:
                              progress.completedRows += values.length;
                              return [
                                2
                                /*return*/
                              ];
                          }
                        });
                      };
                      _b.label = 1;
                    case 1:
                      if (!mayHaveMoreRows) return [3, 3];
                      return [5, _loop_2()];
                    case 2:
                      state_1 = _b.sent();
                      if (state_1 === "break")
                        return [3, 3];
                      return [3, 1];
                    case 3:
                      slices.push(emptyTableExportJson.substr(posEndRowsArray));
                      progress.completedTables += 1;
                      if (progress.completedTables < progress.totalTables) {
                        slices.push(",");
                      }
                      return [
                        2
                        /*return*/
                      ];
                  }
                });
              };
              _i = 0, tables_1 = tables;
              _a.label = 2;
            case 2:
              if (!(_i < tables_1.length)) return [3, 5];
              tableName = tables_1[_i].name;
              return [5, _loop_1(tableName)];
            case 3:
              _a.sent();
              _a.label = 4;
            case 4:
              _i++;
              return [3, 2];
            case 5:
              slices.push(emptyExportJson.substr(posEndDataArray));
              progress.done = true;
              if (progressCallback) {
                import_wrapper_default.ignoreTransaction(function() {
                  return progressCallback(progress);
                });
              }
              return [
                2
                /*return*/
              ];
          }
        });
      });
    }
    var skipTables, targetTables, slices, tables, prettyJson, emptyExport, progressCallback, progress;
    return __generator(this, function(_a) {
      switch (_a.label) {
        case 0:
          options = options || {};
          skipTables = options.skipTables ? options.skipTables : [];
          targetTables = db.tables.filter(function(x) {
            return !skipTables.includes(x.name);
          });
          slices = [];
          tables = targetTables.map(function(table) {
            return {
              name: table.name,
              schema: getSchemaString(table),
              rowCount: 0
            };
          });
          prettyJson = options.prettyJson;
          emptyExport = {
            formatName: "dexie",
            formatVersion: 1,
            data: {
              databaseName: db.name,
              databaseVersion: db.verno,
              tables,
              data: []
            }
          };
          progressCallback = options.progressCallback;
          progress = {
            done: false,
            completedRows: 0,
            completedTables: 0,
            totalRows: NaN,
            totalTables: tables.length
          };
          _a.label = 1;
        case 1:
          _a.trys.push([1, , 6, 7]);
          if (!options.noTransaction) return [3, 3];
          return [4, exportAll()];
        case 2:
          _a.sent();
          return [3, 5];
        case 3:
          return [4, db.transaction("r", db.tables, exportAll)];
        case 4:
          _a.sent();
          _a.label = 5;
        case 5:
          return [3, 7];
        case 6:
          TSON.finalize();
          return [
            7
            /*endfinally*/
          ];
        case 7:
          return [2, new Blob(slices, { type: "text/json" })];
      }
    });
  });
}
var VERSION = 1;
var fakeStream = { Stream: function() {
} };
var clarinet_1 = createCommonjsModule(function(module, exports) {
  (function(clarinet) {
    var env = typeof process === "object" && process.env ? process.env : self;
    clarinet.parser = function(opt) {
      return new CParser(opt);
    };
    clarinet.CParser = CParser;
    clarinet.CStream = CStream;
    clarinet.createStream = createStream;
    clarinet.MAX_BUFFER_LENGTH = 10 * 1024 * 1024;
    clarinet.DEBUG = env.CDEBUG === "debug";
    clarinet.INFO = env.CDEBUG === "debug" || env.CDEBUG === "info";
    clarinet.EVENTS = [
      "value",
      "string",
      "key",
      "openobject",
      "closeobject",
      "openarray",
      "closearray",
      "error",
      "end",
      "ready"
    ];
    var buffers = {
      textNode: void 0,
      numberNode: ""
    }, streamWraps = clarinet.EVENTS.filter(function(ev) {
      return ev !== "error" && ev !== "end";
    }), S = 0, Stream;
    clarinet.STATE = {
      BEGIN: S++,
      VALUE: S++,
      OPEN_OBJECT: S++,
      CLOSE_OBJECT: S++,
      OPEN_ARRAY: S++,
      CLOSE_ARRAY: S++,
      TEXT_ESCAPE: S++,
      STRING: S++,
      BACKSLASH: S++,
      END: S++,
      OPEN_KEY: S++,
      CLOSE_KEY: S++,
      TRUE: S++,
      TRUE2: S++,
      TRUE3: S++,
      FALSE: S++,
      FALSE2: S++,
      FALSE3: S++,
      FALSE4: S++,
      NULL: S++,
      NULL2: S++,
      NULL3: S++,
      NUMBER_DECIMAL_POINT: S++,
      NUMBER_DIGIT: S++
      // [0-9]
    };
    for (var s_ in clarinet.STATE) clarinet.STATE[clarinet.STATE[s_]] = s_;
    S = clarinet.STATE;
    const Char = {
      tab: 9,
      // \t
      lineFeed: 10,
      // \n
      carriageReturn: 13,
      // \r
      space: 32,
      // " "
      doubleQuote: 34,
      // "
      plus: 43,
      // +
      comma: 44,
      // ,
      minus: 45,
      // -
      period: 46,
      // .
      _0: 48,
      // 0
      _9: 57,
      // 9
      colon: 58,
      // :
      E: 69,
      // E
      openBracket: 91,
      // [
      backslash: 92,
      // \
      closeBracket: 93,
      // ]
      a: 97,
      // a
      b: 98,
      // b
      e: 101,
      // e 
      f: 102,
      // f
      l: 108,
      // l
      n: 110,
      // n
      r: 114,
      // r
      s: 115,
      // s
      t: 116,
      // t
      u: 117,
      // u
      openBrace: 123,
      // {
      closeBrace: 125
      // }
    };
    if (!Object.create) {
      Object.create = function(o) {
        function f() {
          this["__proto__"] = o;
        }
        f.prototype = o;
        return new f();
      };
    }
    if (!Object.getPrototypeOf) {
      Object.getPrototypeOf = function(o) {
        return o["__proto__"];
      };
    }
    if (!Object.keys) {
      Object.keys = function(o) {
        var a = [];
        for (var i in o) if (o.hasOwnProperty(i)) a.push(i);
        return a;
      };
    }
    function checkBufferLength(parser) {
      var maxAllowed = Math.max(clarinet.MAX_BUFFER_LENGTH, 10), maxActual = 0;
      for (var buffer in buffers) {
        var len = parser[buffer] === void 0 ? 0 : parser[buffer].length;
        if (len > maxAllowed) {
          switch (buffer) {
            case "text":
              closeText(parser);
              break;
            default:
              error(parser, "Max buffer length exceeded: " + buffer);
          }
        }
        maxActual = Math.max(maxActual, len);
      }
      parser.bufferCheckPosition = clarinet.MAX_BUFFER_LENGTH - maxActual + parser.position;
    }
    function clearBuffers(parser) {
      for (var buffer in buffers) {
        parser[buffer] = buffers[buffer];
      }
    }
    var stringTokenPattern = /[\\"\n]/g;
    function CParser(opt) {
      if (!(this instanceof CParser)) return new CParser(opt);
      var parser = this;
      clearBuffers(parser);
      parser.bufferCheckPosition = clarinet.MAX_BUFFER_LENGTH;
      parser.q = parser.c = parser.p = "";
      parser.opt = opt || {};
      parser.closed = parser.closedRoot = parser.sawRoot = false;
      parser.tag = parser.error = null;
      parser.state = S.BEGIN;
      parser.stack = new Array();
      parser.position = parser.column = 0;
      parser.line = 1;
      parser.slashed = false;
      parser.unicodeI = 0;
      parser.unicodeS = null;
      parser.depth = 0;
      emit(parser, "onready");
    }
    CParser.prototype = {
      end: function() {
        end(this);
      },
      write,
      resume: function() {
        this.error = null;
        return this;
      },
      close: function() {
        return this.write(null);
      }
    };
    try {
      Stream = fakeStream.Stream;
    } catch (ex) {
      Stream = function() {
      };
    }
    function createStream(opt) {
      return new CStream(opt);
    }
    function CStream(opt) {
      if (!(this instanceof CStream)) return new CStream(opt);
      this._parser = new CParser(opt);
      this.writable = true;
      this.readable = true;
      this.bytes_remaining = 0;
      this.bytes_in_sequence = 0;
      this.temp_buffs = { "2": new Buffer(2), "3": new Buffer(3), "4": new Buffer(4) };
      this.string = "";
      var me = this;
      Stream.apply(me);
      this._parser.onend = function() {
        me.emit("end");
      };
      this._parser.onerror = function(er) {
        me.emit("error", er);
        me._parser.error = null;
      };
      streamWraps.forEach(function(ev) {
        Object.defineProperty(
          me,
          "on" + ev,
          {
            get: function() {
              return me._parser["on" + ev];
            },
            set: function(h) {
              if (!h) {
                me.removeAllListeners(ev);
                me._parser["on" + ev] = h;
                return h;
              }
              me.on(ev, h);
            },
            enumerable: true,
            configurable: false
          }
        );
      });
    }
    CStream.prototype = Object.create(
      Stream.prototype,
      { constructor: { value: CStream } }
    );
    CStream.prototype.write = function(data) {
      data = new Buffer(data);
      for (var i = 0; i < data.length; i++) {
        var n = data[i];
        if (this.bytes_remaining > 0) {
          for (var j = 0; j < this.bytes_remaining; j++) {
            this.temp_buffs[this.bytes_in_sequence][this.bytes_in_sequence - this.bytes_remaining + j] = data[j];
          }
          this.string = this.temp_buffs[this.bytes_in_sequence].toString();
          this.bytes_in_sequence = this.bytes_remaining = 0;
          i = i + j - 1;
          this._parser.write(this.string);
          this.emit("data", this.string);
          continue;
        }
        if (this.bytes_remaining === 0 && n >= 128) {
          if (n >= 194 && n <= 223) this.bytes_in_sequence = 2;
          if (n >= 224 && n <= 239) this.bytes_in_sequence = 3;
          if (n >= 240 && n <= 244) this.bytes_in_sequence = 4;
          if (this.bytes_in_sequence + i > data.length) {
            for (var k = 0; k <= data.length - 1 - i; k++) {
              this.temp_buffs[this.bytes_in_sequence][k] = data[i + k];
            }
            this.bytes_remaining = i + this.bytes_in_sequence - data.length;
            return true;
          } else {
            this.string = data.slice(i, i + this.bytes_in_sequence).toString();
            i = i + this.bytes_in_sequence - 1;
            this._parser.write(this.string);
            this.emit("data", this.string);
            continue;
          }
        }
        for (var p = i; p < data.length; p++) {
          if (data[p] >= 128) break;
        }
        this.string = data.slice(i, p).toString();
        this._parser.write(this.string);
        this.emit("data", this.string);
        i = p - 1;
        continue;
      }
    };
    CStream.prototype.end = function(chunk) {
      if (chunk && chunk.length) this._parser.write(chunk.toString());
      this._parser.end();
      return true;
    };
    CStream.prototype.on = function(ev, handler) {
      var me = this;
      if (!me._parser["on" + ev] && streamWraps.indexOf(ev) !== -1) {
        me._parser["on" + ev] = function() {
          var args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
          args.splice(0, 0, ev);
          me.emit.apply(me, args);
        };
      }
      return Stream.prototype.on.call(me, ev, handler);
    };
    CStream.prototype.destroy = function() {
      clearBuffers(this._parser);
      this.emit("close");
    };
    function emit(parser, event, data) {
      if (clarinet.INFO) console.log("-- emit", event, data);
      if (parser[event]) parser[event](data);
    }
    function emitNode(parser, event, data) {
      closeValue(parser);
      emit(parser, event, data);
    }
    function closeValue(parser, event) {
      parser.textNode = textopts(parser.opt, parser.textNode);
      if (parser.textNode !== void 0) {
        emit(parser, event ? event : "onvalue", parser.textNode);
      }
      parser.textNode = void 0;
    }
    function closeNumber(parser) {
      if (parser.numberNode)
        emit(parser, "onvalue", parseFloat(parser.numberNode));
      parser.numberNode = "";
    }
    function textopts(opt, text) {
      if (text === void 0) {
        return text;
      }
      if (opt.trim) text = text.trim();
      if (opt.normalize) text = text.replace(/\s+/g, " ");
      return text;
    }
    function error(parser, er) {
      closeValue(parser);
      er += "\nLine: " + parser.line + "\nColumn: " + parser.column + "\nChar: " + parser.c;
      er = new Error(er);
      parser.error = er;
      emit(parser, "onerror", er);
      return parser;
    }
    function end(parser) {
      if (parser.state !== S.VALUE || parser.depth !== 0)
        error(parser, "Unexpected end");
      closeValue(parser);
      parser.c = "";
      parser.closed = true;
      emit(parser, "onend");
      CParser.call(parser, parser.opt);
      return parser;
    }
    function isWhitespace(c) {
      return c === Char.carriageReturn || c === Char.lineFeed || c === Char.space || c === Char.tab;
    }
    function write(chunk) {
      var parser = this;
      if (this.error) throw this.error;
      if (parser.closed) return error(
        parser,
        "Cannot write after close. Assign an onready handler."
      );
      if (chunk === null) return end(parser);
      var i = 0, c = chunk.charCodeAt(0), p = parser.p;
      if (clarinet.DEBUG) console.log("write -> [" + chunk + "]");
      while (c) {
        p = c;
        parser.c = c = chunk.charCodeAt(i++);
        if (p !== c) parser.p = p;
        else p = parser.p;
        if (!c) break;
        if (clarinet.DEBUG) console.log(i, c, clarinet.STATE[parser.state]);
        parser.position++;
        if (c === Char.lineFeed) {
          parser.line++;
          parser.column = 0;
        } else parser.column++;
        switch (parser.state) {
          case S.BEGIN:
            if (c === Char.openBrace) parser.state = S.OPEN_OBJECT;
            else if (c === Char.openBracket) parser.state = S.OPEN_ARRAY;
            else if (!isWhitespace(c))
              error(parser, "Non-whitespace before {[.");
            continue;
          case S.OPEN_KEY:
          case S.OPEN_OBJECT:
            if (isWhitespace(c)) continue;
            if (parser.state === S.OPEN_KEY) parser.stack.push(S.CLOSE_KEY);
            else {
              if (c === Char.closeBrace) {
                emit(parser, "onopenobject");
                this.depth++;
                emit(parser, "oncloseobject");
                this.depth--;
                parser.state = parser.stack.pop() || S.VALUE;
                continue;
              } else parser.stack.push(S.CLOSE_OBJECT);
            }
            if (c === Char.doubleQuote) parser.state = S.STRING;
            else error(parser, 'Malformed object key should start with "');
            continue;
          case S.CLOSE_KEY:
          case S.CLOSE_OBJECT:
            if (isWhitespace(c)) continue;
            parser.state === S.CLOSE_KEY ? "key" : "object";
            if (c === Char.colon) {
              if (parser.state === S.CLOSE_OBJECT) {
                parser.stack.push(S.CLOSE_OBJECT);
                closeValue(parser, "onopenobject");
                this.depth++;
              } else closeValue(parser, "onkey");
              parser.state = S.VALUE;
            } else if (c === Char.closeBrace) {
              emitNode(parser, "oncloseobject");
              this.depth--;
              parser.state = parser.stack.pop() || S.VALUE;
            } else if (c === Char.comma) {
              if (parser.state === S.CLOSE_OBJECT)
                parser.stack.push(S.CLOSE_OBJECT);
              closeValue(parser);
              parser.state = S.OPEN_KEY;
            } else error(parser, "Bad object");
            continue;
          case S.OPEN_ARRAY:
          // after an array there always a value
          case S.VALUE:
            if (isWhitespace(c)) continue;
            if (parser.state === S.OPEN_ARRAY) {
              emit(parser, "onopenarray");
              this.depth++;
              parser.state = S.VALUE;
              if (c === Char.closeBracket) {
                emit(parser, "onclosearray");
                this.depth--;
                parser.state = parser.stack.pop() || S.VALUE;
                continue;
              } else {
                parser.stack.push(S.CLOSE_ARRAY);
              }
            }
            if (c === Char.doubleQuote) parser.state = S.STRING;
            else if (c === Char.openBrace) parser.state = S.OPEN_OBJECT;
            else if (c === Char.openBracket) parser.state = S.OPEN_ARRAY;
            else if (c === Char.t) parser.state = S.TRUE;
            else if (c === Char.f) parser.state = S.FALSE;
            else if (c === Char.n) parser.state = S.NULL;
            else if (c === Char.minus) {
              parser.numberNode += "-";
            } else if (Char._0 <= c && c <= Char._9) {
              parser.numberNode += String.fromCharCode(c);
              parser.state = S.NUMBER_DIGIT;
            } else error(parser, "Bad value");
            continue;
          case S.CLOSE_ARRAY:
            if (c === Char.comma) {
              parser.stack.push(S.CLOSE_ARRAY);
              closeValue(parser, "onvalue");
              parser.state = S.VALUE;
            } else if (c === Char.closeBracket) {
              emitNode(parser, "onclosearray");
              this.depth--;
              parser.state = parser.stack.pop() || S.VALUE;
            } else if (isWhitespace(c))
              continue;
            else error(parser, "Bad array");
            continue;
          case S.STRING:
            if (parser.textNode === void 0) {
              parser.textNode = "";
            }
            var starti = i - 1, slashed = parser.slashed, unicodeI = parser.unicodeI;
            STRING_BIGLOOP: while (true) {
              if (clarinet.DEBUG)
                console.log(
                  i,
                  c,
                  clarinet.STATE[parser.state],
                  slashed
                );
              while (unicodeI > 0) {
                parser.unicodeS += String.fromCharCode(c);
                c = chunk.charCodeAt(i++);
                parser.position++;
                if (unicodeI === 4) {
                  parser.textNode += String.fromCharCode(parseInt(parser.unicodeS, 16));
                  unicodeI = 0;
                  starti = i - 1;
                } else {
                  unicodeI++;
                }
                if (!c) break STRING_BIGLOOP;
              }
              if (c === Char.doubleQuote && !slashed) {
                parser.state = parser.stack.pop() || S.VALUE;
                parser.textNode += chunk.substring(starti, i - 1);
                parser.position += i - 1 - starti;
                break;
              }
              if (c === Char.backslash && !slashed) {
                slashed = true;
                parser.textNode += chunk.substring(starti, i - 1);
                parser.position += i - 1 - starti;
                c = chunk.charCodeAt(i++);
                parser.position++;
                if (!c) break;
              }
              if (slashed) {
                slashed = false;
                if (c === Char.n) {
                  parser.textNode += "\n";
                } else if (c === Char.r) {
                  parser.textNode += "\r";
                } else if (c === Char.t) {
                  parser.textNode += "	";
                } else if (c === Char.f) {
                  parser.textNode += "\f";
                } else if (c === Char.b) {
                  parser.textNode += "\b";
                } else if (c === Char.u) {
                  unicodeI = 1;
                  parser.unicodeS = "";
                } else {
                  parser.textNode += String.fromCharCode(c);
                }
                c = chunk.charCodeAt(i++);
                parser.position++;
                starti = i - 1;
                if (!c) break;
                else continue;
              }
              stringTokenPattern.lastIndex = i;
              var reResult = stringTokenPattern.exec(chunk);
              if (reResult === null) {
                i = chunk.length + 1;
                parser.textNode += chunk.substring(starti, i - 1);
                parser.position += i - 1 - starti;
                break;
              }
              i = reResult.index + 1;
              c = chunk.charCodeAt(reResult.index);
              if (!c) {
                parser.textNode += chunk.substring(starti, i - 1);
                parser.position += i - 1 - starti;
                break;
              }
            }
            parser.slashed = slashed;
            parser.unicodeI = unicodeI;
            continue;
          case S.TRUE:
            if (c === Char.r) parser.state = S.TRUE2;
            else error(parser, "Invalid true started with t" + c);
            continue;
          case S.TRUE2:
            if (c === Char.u) parser.state = S.TRUE3;
            else error(parser, "Invalid true started with tr" + c);
            continue;
          case S.TRUE3:
            if (c === Char.e) {
              emit(parser, "onvalue", true);
              parser.state = parser.stack.pop() || S.VALUE;
            } else error(parser, "Invalid true started with tru" + c);
            continue;
          case S.FALSE:
            if (c === Char.a) parser.state = S.FALSE2;
            else error(parser, "Invalid false started with f" + c);
            continue;
          case S.FALSE2:
            if (c === Char.l) parser.state = S.FALSE3;
            else error(parser, "Invalid false started with fa" + c);
            continue;
          case S.FALSE3:
            if (c === Char.s) parser.state = S.FALSE4;
            else error(parser, "Invalid false started with fal" + c);
            continue;
          case S.FALSE4:
            if (c === Char.e) {
              emit(parser, "onvalue", false);
              parser.state = parser.stack.pop() || S.VALUE;
            } else error(parser, "Invalid false started with fals" + c);
            continue;
          case S.NULL:
            if (c === Char.u) parser.state = S.NULL2;
            else error(parser, "Invalid null started with n" + c);
            continue;
          case S.NULL2:
            if (c === Char.l) parser.state = S.NULL3;
            else error(parser, "Invalid null started with nu" + c);
            continue;
          case S.NULL3:
            if (c === Char.l) {
              emit(parser, "onvalue", null);
              parser.state = parser.stack.pop() || S.VALUE;
            } else error(parser, "Invalid null started with nul" + c);
            continue;
          case S.NUMBER_DECIMAL_POINT:
            if (c === Char.period) {
              parser.numberNode += ".";
              parser.state = S.NUMBER_DIGIT;
            } else error(parser, "Leading zero not followed by .");
            continue;
          case S.NUMBER_DIGIT:
            if (Char._0 <= c && c <= Char._9) parser.numberNode += String.fromCharCode(c);
            else if (c === Char.period) {
              if (parser.numberNode.indexOf(".") !== -1)
                error(parser, "Invalid number has two dots");
              parser.numberNode += ".";
            } else if (c === Char.e || c === Char.E) {
              if (parser.numberNode.indexOf("e") !== -1 || parser.numberNode.indexOf("E") !== -1)
                error(parser, "Invalid number has two exponential");
              parser.numberNode += "e";
            } else if (c === Char.plus || c === Char.minus) {
              if (!(p === Char.e || p === Char.E))
                error(parser, "Invalid symbol in number");
              parser.numberNode += String.fromCharCode(c);
            } else {
              closeNumber(parser);
              i--;
              parser.state = parser.stack.pop() || S.VALUE;
            }
            continue;
          default:
            error(parser, "Unknown state: " + parser.state);
        }
      }
      if (parser.position >= parser.bufferCheckPosition)
        checkBufferLength(parser);
      return parser;
    }
  })(exports);
});
function JsonStream(blob) {
  var pos = 0;
  var parser = JsonParser(true);
  var rv = {
    pullAsync: function(numBytes) {
      return __awaiter(this, void 0, void 0, function() {
        var slize, jsonPart, result;
        return __generator(this, function(_a) {
          switch (_a.label) {
            case 0:
              slize = blob.slice(pos, pos + numBytes);
              pos += numBytes;
              return [4, readBlobAsync(slize, "text")];
            case 1:
              jsonPart = _a.sent();
              result = parser.write(jsonPart);
              rv.result = result || {};
              return [2, result];
          }
        });
      });
    },
    pullSync: function(numBytes) {
      var slize = blob.slice(pos, pos + numBytes);
      pos += numBytes;
      var jsonPart = readBlobSync(slize, "text");
      var result = parser.write(jsonPart);
      rv.result = result || {};
      return result;
    },
    done: function() {
      return parser.done();
    },
    eof: function() {
      return pos >= blob.size;
    },
    result: {}
  };
  return rv;
}
function JsonParser(allowPartial) {
  var parser = clarinet_1.parser();
  var level = 0;
  var result;
  var stack = [];
  var obj;
  var key;
  var done = false;
  var array = false;
  parser.onopenobject = function(newKey) {
    var newObj = {};
    newObj.incomplete = true;
    if (!result)
      result = newObj;
    if (obj) {
      stack.push([key, obj, array]);
      if (allowPartial) {
        if (array) {
          obj.push(newObj);
        } else {
          obj[key] = newObj;
        }
      }
    }
    obj = newObj;
    key = newKey;
    array = false;
    ++level;
  };
  parser.onkey = function(newKey) {
    return key = newKey;
  };
  parser.onvalue = function(value) {
    return array ? obj.push(value) : obj[key] = value;
  };
  parser.oncloseobject = function() {
    var _a;
    delete obj.incomplete;
    key = null;
    if (--level === 0) {
      done = true;
    } else {
      var completedObj = obj;
      _a = stack.pop(), key = _a[0], obj = _a[1], array = _a[2];
      if (!allowPartial) {
        if (array) {
          obj.push(completedObj);
        } else {
          obj[key] = completedObj;
        }
      }
    }
  };
  parser.onopenarray = function() {
    var newObj = [];
    newObj.incomplete = true;
    if (!result)
      result = newObj;
    if (obj) {
      stack.push([key, obj, array]);
      if (allowPartial) {
        if (array) {
          obj.push(newObj);
        } else {
          obj[key] = newObj;
        }
      }
    }
    obj = newObj;
    array = true;
    key = null;
    ++level;
  };
  parser.onclosearray = function() {
    var _a;
    delete obj.incomplete;
    key = null;
    if (--level === 0) {
      done = true;
    } else {
      var completedObj = obj;
      _a = stack.pop(), key = _a[0], obj = _a[1], array = _a[2];
      if (!allowPartial) {
        if (array) {
          obj.push(completedObj);
        } else {
          obj[key] = completedObj;
        }
      }
    }
  };
  return {
    write: function(jsonPart) {
      parser.write(jsonPart);
      return result;
    },
    done: function() {
      return done;
    }
  };
}
var DEFAULT_KILOBYTES_PER_CHUNK = 1024;
function importDB(exportedData, options) {
  return __awaiter(this, void 0, void 0, function() {
    var CHUNK_SIZE, stream, dbExport, db;
    return __generator(this, function(_a) {
      switch (_a.label) {
        case 0:
          options = options || {};
          CHUNK_SIZE = options.chunkSizeBytes || DEFAULT_KILOBYTES_PER_CHUNK * 1024;
          return [4, loadUntilWeGotEnoughData(exportedData, CHUNK_SIZE)];
        case 1:
          stream = _a.sent();
          dbExport = stream.result.data;
          db = new import_wrapper_default(options.name !== void 0 ? options.name : dbExport.databaseName);
          db.version(dbExport.databaseVersion).stores(extractDbSchema(dbExport));
          return [4, importInto(db, stream, options.name !== void 0 ? __assign(__assign({}, options), { acceptNameDiff: true }) : options)];
        case 2:
          _a.sent();
          return [2, db];
      }
    });
  });
}
function importInto(db, exportedData, options) {
  return __awaiter(this, void 0, void 0, function() {
    function importAll() {
      return __awaiter(this, void 0, void 0, function() {
        var _loop_1, _i2, _a2, tableExport, state_1;
        return __generator(this, function(_b) {
          switch (_b.label) {
            case 0:
              _loop_1 = function(tableExport2) {
                var tableName, table2, tableSchemaStr, sourceRows, rows, i, obj, filter, transform, filteredRows, _c, keys, values;
                return __generator(this, function(_d) {
                  switch (_d.label) {
                    case 0:
                      if (skipTables.includes(tableExport2.tableName))
                        return [2, "continue"];
                      if (!tableExport2.rows)
                        return [2, "break"];
                      if (!tableExport2.rows.incomplete && tableExport2.rows.length === 0)
                        return [2, "continue"];
                      if (progressCallback) {
                        import_wrapper_default.ignoreTransaction(function() {
                          return progressCallback(progress);
                        });
                      }
                      tableName = tableExport2.tableName;
                      table2 = db.table(tableName);
                      tableSchemaStr = dbExport.tables.filter(function(t) {
                        return t.name === tableName;
                      })[0].schema;
                      if (!table2) {
                        if (!options.acceptMissingTables)
                          throw new Error("Exported table ".concat(tableExport2.tableName, " is missing in installed database"));
                        else
                          return [2, "continue"];
                      }
                      if (!options.acceptChangedPrimaryKey && tableSchemaStr.split(",")[0] != table2.schema.primKey.src) {
                        throw new Error("Primary key differs for table ".concat(tableExport2.tableName, ". "));
                      }
                      sourceRows = tableExport2.rows;
                      rows = [];
                      for (i = 0; i < sourceRows.length; i++) {
                        obj = sourceRows[i];
                        if (!obj.incomplete) {
                          rows.push(TSON.revive(obj));
                        } else {
                          break;
                        }
                      }
                      filter = options.filter;
                      transform = options.transform;
                      filteredRows = filter ? tableExport2.inbound ? rows.filter(function(value) {
                        return filter(tableName, value);
                      }) : rows.filter(function(_a3) {
                        var key = _a3[0], value = _a3[1];
                        return filter(tableName, value, key);
                      }) : rows;
                      if (transform) {
                        filteredRows = filteredRows.map(tableExport2.inbound ? function(value) {
                          return transform(tableName, value).value;
                        } : function(_a3) {
                          var key = _a3[0], value = _a3[1];
                          var res = transform(tableName, value, key);
                          return [res.key, res.value];
                        });
                      }
                      _c = tableExport2.inbound ? [void 0, filteredRows] : [filteredRows.map(function(row) {
                        return row[0];
                      }), rows.map(function(row) {
                        return row[1];
                      })], keys = _c[0], values = _c[1];
                      if (!options.overwriteValues) return [3, 2];
                      return [4, table2.bulkPut(values, keys)];
                    case 1:
                      _d.sent();
                      return [3, 4];
                    case 2:
                      return [4, table2.bulkAdd(values, keys)];
                    case 3:
                      _d.sent();
                      _d.label = 4;
                    case 4:
                      progress.completedRows += rows.length;
                      if (!rows.incomplete) {
                        progress.completedTables += 1;
                      }
                      sourceRows.splice(0, rows.length);
                      return [
                        2
                        /*return*/
                      ];
                  }
                });
              };
              _i2 = 0, _a2 = dbExport.data;
              _b.label = 1;
            case 1:
              if (!(_i2 < _a2.length)) return [3, 4];
              tableExport = _a2[_i2];
              return [5, _loop_1(tableExport)];
            case 2:
              state_1 = _b.sent();
              if (state_1 === "break")
                return [3, 4];
              _b.label = 3;
            case 3:
              _i2++;
              return [3, 1];
            case 4:
              while (dbExport.data.length > 0 && dbExport.data[0].rows && !dbExport.data[0].rows.incomplete) {
                dbExport.data.splice(0, 1);
              }
              if (!(!jsonStream.done() && !jsonStream.eof())) return [3, 8];
              if (!readBlobsSynchronously2) return [3, 5];
              jsonStream.pullSync(CHUNK_SIZE);
              return [3, 7];
            case 5:
              return [4, import_wrapper_default.waitFor(jsonStream.pullAsync(CHUNK_SIZE))];
            case 6:
              _b.sent();
              _b.label = 7;
            case 7:
              return [3, 9];
            case 8:
              return [3, 10];
            case 9:
              return [3, 0];
            case 10:
              return [
                2
                /*return*/
              ];
          }
        });
      });
    }
    var CHUNK_SIZE, jsonStream, dbExportFile, readBlobsSynchronously2, dbExport, skipTables, progressCallback, progress, _i, _a, table;
    return __generator(this, function(_b) {
      switch (_b.label) {
        case 0:
          options = options || {};
          CHUNK_SIZE = options.chunkSizeBytes || DEFAULT_KILOBYTES_PER_CHUNK * 1024;
          return [4, loadUntilWeGotEnoughData(exportedData, CHUNK_SIZE)];
        case 1:
          jsonStream = _b.sent();
          dbExportFile = jsonStream.result;
          readBlobsSynchronously2 = "FileReaderSync" in self;
          dbExport = dbExportFile.data;
          skipTables = options.skipTables ? options.skipTables : [];
          if (!options.acceptNameDiff && db.name !== dbExport.databaseName)
            throw new Error("Name differs. Current database name is ".concat(db.name, " but export is ").concat(dbExport.databaseName));
          if (!options.acceptVersionDiff && db.verno !== dbExport.databaseVersion) {
            throw new Error("Database version differs. Current database is in version ".concat(db.verno, " but export is ").concat(dbExport.databaseVersion));
          }
          progressCallback = options.progressCallback;
          progress = {
            done: false,
            completedRows: 0,
            completedTables: 0,
            totalRows: dbExport.tables.reduce(function(p, c) {
              return p + c.rowCount;
            }, 0),
            totalTables: dbExport.tables.length
          };
          if (progressCallback) {
            import_wrapper_default.ignoreTransaction(function() {
              return progressCallback(progress);
            });
          }
          if (!options.clearTablesBeforeImport) return [3, 5];
          _i = 0, _a = db.tables;
          _b.label = 2;
        case 2:
          if (!(_i < _a.length)) return [3, 5];
          table = _a[_i];
          if (skipTables.includes(table.name))
            return [3, 4];
          return [4, table.clear()];
        case 3:
          _b.sent();
          _b.label = 4;
        case 4:
          _i++;
          return [3, 2];
        case 5:
          if (!options.noTransaction) return [3, 7];
          return [4, importAll()];
        case 6:
          _b.sent();
          return [3, 9];
        case 7:
          return [4, db.transaction("rw", db.tables, importAll)];
        case 8:
          _b.sent();
          _b.label = 9;
        case 9:
          progress.done = true;
          if (progressCallback) {
            import_wrapper_default.ignoreTransaction(function() {
              return progressCallback(progress);
            });
          }
          return [
            2
            /*return*/
          ];
      }
    });
  });
}
function loadUntilWeGotEnoughData(exportedData, CHUNK_SIZE) {
  return __awaiter(this, void 0, void 0, function() {
    var stream, dbExportFile;
    return __generator(this, function(_a) {
      switch (_a.label) {
        case 0:
          stream = "slice" in exportedData ? JsonStream(exportedData) : exportedData;
          _a.label = 1;
        case 1:
          if (!!stream.eof()) return [3, 3];
          return [4, stream.pullAsync(CHUNK_SIZE)];
        case 2:
          _a.sent();
          if (stream.result.data && stream.result.data.data)
            return [3, 3];
          return [3, 1];
        case 3:
          dbExportFile = stream.result;
          if (!dbExportFile || dbExportFile.formatName != "dexie")
            throw new Error("Given file is not a dexie export");
          if (dbExportFile.formatVersion > VERSION) {
            throw new Error("Format version ".concat(dbExportFile.formatVersion, " not supported"));
          }
          if (!dbExportFile.data) {
            throw new Error("No data in export file");
          }
          if (!dbExportFile.data.databaseName) {
            throw new Error("Missing databaseName in export file");
          }
          if (!dbExportFile.data.databaseVersion) {
            throw new Error("Missing databaseVersion in export file");
          }
          if (!dbExportFile.data.tables) {
            throw new Error("Missing tables in export file");
          }
          return [2, stream];
      }
    });
  });
}
import_wrapper_default.prototype.export = function(options) {
  return exportDB(this, options);
};
import_wrapper_default.prototype.import = function(blob, options) {
  return importInto(this, blob, options);
};
import_wrapper_default.import = function(blob, options) {
  return importDB(blob, options);
};
export {
  import_wrapper_default as Dexie
};
/*! Bundled license information:

dexie/dist/dexie.js:
  (*! *****************************************************************************
  Copyright (c) Microsoft Corporation.
  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.
  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** *)

dexie-export-import/dist/dexie-export-import.mjs:
  (*! *****************************************************************************
  Copyright (c) Microsoft Corporation.
  
  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.
  
  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** *)
*/
//# sourceMappingURL=dexie.js.map
