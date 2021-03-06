(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.AsyncMessager = {}));
})(this, (function (exports) { 'use strict';

    /*! *****************************************************************************
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
    ***************************************************************************** */

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    const { hasOwnProperty: hasOwn } = Object.prototype;
    /* eslint-disable no-bitwise */
    /* eslint-disable no-shadow */
    function hashcode(str = "") {
        let hash = 0;
        let i;
        let chr;
        let len;
        if (str.length === 0)
            return hash;
        for (i = 0, len = str.length; i < len; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
    function isFunction(fn) {
        return typeof fn === 'function';
    }
    const noop = function noop() { };
    /**
     * ??????????????????
     * @param fn
     * @param delay
     * @param context
     * @returns
     */
    function delay(fn = () => { }, delay = 5000, context = null) {
        if (!isFunction(fn)) {
            return {
                run: () => Promise.resolve(),
                cancel: noop
            };
        }
        let ticket;
        let executed = false;
        return {
            run(...args) {
                return new Promise((resolve, reject) => {
                    if (executed === true) {
                        return;
                    }
                    executed = true;
                    ticket = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const res = yield fn.apply(context, args);
                            resolve(res);
                        }
                        catch (err) {
                            reject(err);
                        }
                    }), delay);
                });
            },
            cancel: () => {
                clearTimeout(ticket);
            }
        };
    }
    function hasOwnProperty(obj, property) {
        return hasOwn.call(obj, property);
    }
    function isSameScope(scope1, scope2) {
        // TODO:
        return scope1 == scope2;
    }

    /* eslint-disable @typescript-eslint/interface-name-prefix */
    class PEventMessager {
        constructor() {
            this._map = new Map();
            /**
             * ?????????????????????????????????
             * @param category
             * @returns
             */
            this.addHandler = (category, listener, context = null) => {
                const cates = Array.isArray(category) ? category : [category];
                const map = this._map;
                if (typeof listener !== "function") {
                    return console.error(`PassiveEventMessager::addHandler: fn ?????????????????????`);
                }
                cates.forEach(cate => {
                    let handlers = map.get(cate);
                    if (handlers == undefined) {
                        handlers = [];
                        map.set(cate, handlers);
                    }
                    handlers.push({
                        methodName: listener.name || "anonymous",
                        target: context,
                        listener
                    });
                });
            };
            this.removeHandler = (category, listener) => {
                console.log("removeHander:", category);
                const cates = Array.isArray(category) ? category : [category];
                const map = this._map;
                if (typeof listener !== "function") {
                    return console.error(`PassiveEventMessager::removeHandler: fn ?????????????????????`);
                }
                let cate;
                for (let i = 0; i < cates.length; i++) {
                    cate = cates[i];
                    const handlers = map.get(cate);
                    if (handlers == undefined || !Array.isArray(handlers)) {
                        continue;
                    }
                    let index;
                    for (let i = handlers.length; i >= 0; i--) {
                        index = handlers.findIndex(h => h.listener === listener);
                        if (index >= 0) {
                            handlers.splice(index, 1);
                            break;
                        }
                    }
                    // handlers ?????????0???????????????
                    if (handlers.length == 0) {
                        map.delete(cate);
                    }
                }
            };
            this.emit = (category, data, ...args) => {
                // console.log("PassiveEventMessager::onMessage", category, data);
                const handlers = this._map.get(category);
                if (handlers == undefined) {
                    return;
                }
                // console.log("handlers", handlers.length, handlers);
                handlers.forEach(handler => {
                    const { listener: fun } = handler;
                    if (!fun) {
                        console.error(`PassiveEventMessager:????????????category???${category}?????????${handler.methodName}??????????????????`);
                    }
                    else {
                        fun.apply(handler.target, [data].concat(args));
                    }
                });
            };
        }
        has(category) {
            const handlers = this._map.get(category);
            return !!handlers && handlers.length > 0;
        }
    }

    const DEFAULT_G_OPTIONS = {
        timeout: 5000,
        clearTimeoutReq: true,
        // autoSubscribe: false,
        enableLog: true,
        logUnhandledEvent: true,
    };
    class BaseAsyncMessager {
        constructor(options = DEFAULT_G_OPTIONS, passiveEventMessager = new PEventMessager()) {
            this.passiveEventMessager = passiveEventMessager;
            this.useOptions = false;
            /**
             * ???????????????
             */
            this._reqCount = 0;
            /**
             * ???????????????
             */
            this._resCount = 0;
            /**
             * ???????????????
             */
            this._timeOutCount = 0;
            this.cbMap = new Map();
            this.getMethod = (name) => {
                const optMethod = this._options[name];
                const classMethod = this[name];
                const method = this.useOptions ? optMethod || classMethod : classMethod || optMethod;
                if (!method) {
                    console.error(`${method} ???????????????????????????Class??????options????????????`);
                }
                return method;
            };
            this.onMessage = (data) => {
                const category = this.getMethod("getResCategory")(data);
                const key = this.getMethod("getResKey")(data);
                const scope = this.getMethod("getResScope")(data);
                // ????????????????????????????????????
                data = this.getMethod("onResponse")(category, data);
                const isInHanlders = this.passiveEventMessager.has(category);
                // ?????????????????????
                this.onBuiltInResponse(category, data);
                const callback = this.getCallback(category, scope, key);
                //  AsyncMessager????????????PEventMessager????????????, ?????????????????????????????????
                if (!callback && !isInHanlders && this._options.logUnhandledEvent) {
                    this.onError();
                    console.warn(`?????????category???${category},key???${key}???????????????`);
                    return;
                }
                this.onSuccess(category, data);
                if (callback) {
                    callback(data);
                }
            };
            this.onTimeout = () => {
                this._timeOutCount++;
            };
            this.onError = () => { };
            this.onSuccess = (category, data) => {
                this._resCount++;
            };
            this._options = Object.assign(Object.assign({}, DEFAULT_G_OPTIONS), options);
            if (isFunction(this._options.subscribe)) {
                this.unsubscribe = this._options.subscribe(this.onMessage);
            }
            this.useOptions = true;
        }
        subscribe(onMessage) {
            throw new Error("not implemented");
        }
        getReqkey(data) {
            const method = this.getMethod("getHashCode");
            return method(data);
        }
        getReqCategory(data) {
            return data.method || data.type;
        }
        getResCategory(data) {
            return data.method || data.type;
        }
        request(_data, _key) {
            throw new Error("not implemented");
        }
        getResKey(data) {
            return data._key_;
        }
        getResScope(data) {
            return data.scope;
        }
        /**
         * ??????hashCode
         * @param data
         * @returns
         */
        getHashCode(data) {
            return hashcode(JSON.stringify(data));
        }
        onResponse(_category, data) {
            return data;
        }
        addCallback(category, reqInfo) {
            const cbs = this.cbMap.get(category);
            if (!cbs) {
                this.cbMap.set(category, []);
            }
            this.cbMap.get(category).push({
                key: reqInfo.key,
                reqTime: Date.now(),
                cb: reqInfo.cb,
                scope: reqInfo.scope
            });
        }
        getCallback(category, scope, key) {
            const reqInfo = this.removeReqInfo(category, scope, key);
            if (!reqInfo) {
                return undefined;
            }
            return reqInfo.cb;
        }
        invoke(data, reqOptions, ...args) {
            this._reqCount++;
            const { timeout = 5000, defaultRes = {
                message: "????????????"
            } } = reqOptions || {};
            // ??????key???
            if (!hasOwnProperty(data, "_key_")) {
                data._key_ = this.getMethod("getReqkey").apply(this, [data]);
            }
            const hashKey = data._key_;
            const tout = timeout || this._options.timeout;
            const category = this.getMethod("getReqCategory")(data);
            return new Promise((resolve, reject) => {
                const { run, cancel } = delay(undefined, tout);
                // ??????
                run().then(() => {
                    console.log("????????????:", category, data, hashKey);
                    this.onTimeout();
                    if (this._options.clearTimeoutReq) {
                        this.removeReqInfo(category, data === null || data === void 0 ? void 0 : data.scope, hashKey);
                    }
                    reject(Object.assign({ message: "????????????" }, (defaultRes || {})));
                });
                this.addCallback(category, {
                    key: hashKey,
                    cb: (msg) => {
                        // ??????????????????
                        cancel();
                        resolve(msg);
                    },
                    scope: data.scope
                });
                // ??????
                this.getMethod("request")(data, hashKey, ...args);
            });
        }
        removeReqInfo(category, scope, key) {
            const cbs = this.cbMap.get(category);
            if (!cbs || cbs.length === 0) {
                return undefined;
            }
            const hasKey = typeof key === "string";
            const hasScope = typeof scope === "string";
            if (hasKey || hasScope) {
                let index = -1;
                // key???????????????
                if (hasKey) {
                    index = cbs.findIndex(c => c.key === key);
                }
                else if (hasScope) { // ?????????scope
                    index = cbs.findIndex(c => isSameScope(c === null || c === void 0 ? void 0 : c.scope, scope));
                }
                if (index >= 0) {
                    const reqInfo = cbs[index];
                    cbs.splice(index, 1);
                    return reqInfo;
                }
                return undefined;
            }
            // ???????????????
            return cbs.shift();
        }
        onBuiltInResponse(category, data) {
            if (this.passiveEventMessager) {
                this.passiveEventMessager.emit(category, data);
            }
            return data;
        }
        getStatistics() {
            return {
                total: this._reqCount,
                success: this._resCount,
                timeout: this._timeOutCount
            };
        }
        get addHandler() {
            return this.passiveEventMessager.addHandler || noop;
        }
        get removeHandler() {
            return this.passiveEventMessager.removeHandler || noop;
        }
        destroy() {
            if (this.unsubscribe) {
                this.unsubscribe();
                this.cbMap.clear();
            }
        }
    }

    exports.BaseAsyncMessager = BaseAsyncMessager;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
