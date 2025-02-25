(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.AsyncMessenger = {}));
})(this, (function (exports) { 'use strict';

    class PEventMessenger {
        constructor() {
            this._map = new Map();
            /**
             * 可以处理多种类型的事件
             * @param messageType
             * @returns
             */
            this.on = (messageType, listener, context = null) => {
                const cates = Array.isArray(messageType) ? messageType : [messageType];
                const map = this._map;
                if (typeof listener !== "function") {
                    return console.error(`PassiveEventMessenger::addHandler: fn 必须是一个函数`);
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
            this.off = (messageType, listener) => {
                console.log("removeHander:", messageType);
                const cates = Array.isArray(messageType) ? messageType : [messageType];
                const map = this._map;
                if (typeof listener !== "function") {
                    return console.error(`PassiveEventMessenger::removeHandler: fn 必须是一个函数`);
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
                    // handlers 长度为0，删除分类
                    if (handlers.length == 0) {
                        map.delete(cate);
                    }
                }
            };
            this.emit = (messageType, data, ...args) => {
                const handlers = this._map.get(messageType);
                if (handlers == undefined) {
                    return;
                }
                // console.log("handlers", handlers.length, handlers);
                handlers.forEach(handler => {
                    const { listener: fun } = handler;
                    if (!fun) {
                        console.error(`PassiveEventMessenger:不能找到category为${messageType}对应的${handler.methodName}事件处理函数`);
                    }
                    else {
                        fun.apply(handler.target, [data].concat(args));
                    }
                });
            };
        }
        has(messageType) {
            const handlers = this._map.get(messageType);
            return !!handlers && handlers.length > 0;
        }
    }

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
    function isFunction(fn) {
        return typeof fn === 'function';
    }
    const noop = function noop() { };
    /**
     * 延时执行函数
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
    function uuid() {
        var d = new Date().getTime();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            d += performance.now(); //use high-precision timer if available
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    const DEFAULT_GLOBAL_OPTIONS = {
        timeout: 5000,
        clearTimeoutReq: true,
        enableLog: true,
        logUnhandledEvent: true,
    };
    class BaseAsyncMessenger extends PEventMessenger {
        constructor(options = DEFAULT_GLOBAL_OPTIONS) {
            super();
            this.useOptions = false;
            this.statistics = {
                reqCount: 0,
                resCount: 0,
                timeOutCount: 0
            };
            this.cbMap = new Map();
            this.getMethod = (name) => {
                const optMethod = this.options[name];
                const classMethod = this[name];
                const method = this.useOptions ? optMethod || classMethod : classMethod || optMethod;
                if (!method) {
                    console.error(`${method} 查找失败，请确保在Class或者options上已定义`);
                }
                return method;
            };
            this.onMessage = (data = {}) => {
                const messageType = this.getMethod("getResMsgType")(data);
                const responseId = this.getMethod("getResponseId")(data);
                // 提供自定义助力数据的能力
                data = this.onResponse(messageType, data);
                // 内置的成功处理
                this.onBuiltInResponse(messageType, data);
                const scope = this.getMethod("getResScope")(data);
                const callback = this.getCallback(messageType, scope, responseId);
                const isInHandlers = this.has(messageType);
                //  AsyncMessenger中没有，PEventMessenger中也没有, 并且开启相关的日志输出
                if (!callback && !isInHandlers && this.options.logUnhandledEvent) {
                    this.onError();
                    console.warn(`未找到category为${messageType},key为${responseId}的回调信息`);
                    return;
                }
                this.onSuccess(messageType, data);
                if (callback) {
                    callback(data);
                }
            };
            this.onTimeout = () => {
                this.statistics.timeOutCount++;
            };
            this.onError = () => { };
            this.onSuccess = (_messageType, data) => {
                this.statistics.resCount++;
            };
            this.options = Object.assign(Object.assign({}, DEFAULT_GLOBAL_OPTIONS), options);
            if (isFunction(this.options.subscribe)) {
                this.unsubscribe = this.options.subscribe(this.onMessage);
            }
            this.useOptions = true;
        }
        subscribe(onMessage) {
            throw new Error("not implemented");
        }
        /**
         * 获取请求的key
         * @param data
         * @returns
         */
        getRequestId(_data) {
            return uuid();
        }
        getReqMsgType(data) {
            return data.method || data.type;
        }
        getResMsgType(data) {
            return data.method || data.type;
        }
        request(_data, _key) {
            throw new Error("not implemented");
        }
        getResponseId(data) {
            return data.requestId;
        }
        getResScope(data) {
            return data.scope;
        }
        onResponse(_messageType, data) {
            return data;
        }
        addCallback(messageType, reqInfo) {
            const cbs = this.cbMap.get(messageType);
            if (!cbs) {
                this.cbMap.set(messageType, []);
            }
            this.cbMap.get(messageType).push({
                requestId: reqInfo.requestId,
                reqTime: Date.now(),
                cb: reqInfo.cb,
                scope: reqInfo.scope
            });
        }
        getCallback(messageType, scope, requestId) {
            if (messageType == undefined)
                return undefined;
            const reqInfo = this.removeRequest(messageType, scope, requestId);
            if (!reqInfo) {
                return undefined;
            }
            return reqInfo.cb;
        }
        invoke(data, reqOptions, ...args) {
            this.statistics.reqCount++;
            const { timeout = 5000, sendOnly = false, defaultRes = {
                message: "请求超时"
            } } = reqOptions || {};
            // 获得请求唯一ID
            if (!hasOwnProperty(data, "requestId")) {
                data.requestId = this.getMethod("getRequestId").apply(this, [data]);
            }
            const requestId = data.requestId;
            const tout = timeout || this.options.timeout;
            const messageType = this.getMethod("getReqMsgType")(data);
            // 只发不收
            if (sendOnly) {
                this.getMethod("request")(data, requestId, ...args);
                return Promise.resolve(undefined);
            }
            if (messageType == undefined) {
                return Promise.reject(new Error(`messageType is undefined`));
            }
            return new Promise((resolve, reject) => {
                const { run, cancel } = delay(undefined, tout);
                // 超时
                run().then(() => {
                    console.log("请求超时:", messageType, data, requestId);
                    this.onTimeout();
                    if (this.options.clearTimeoutReq) {
                        this.removeRequest(messageType, data === null || data === void 0 ? void 0 : data.scope, requestId);
                    }
                    reject(Object.assign({ message: "请求超时" }, (defaultRes || {})));
                });
                this.addCallback(messageType, {
                    requestId: requestId,
                    cb: (msg) => {
                        // 取消超时回调
                        cancel();
                        resolve(msg);
                    },
                    scope: data.scope
                });
                // 调用
                this.getMethod("request")(data, requestId, ...args);
            });
        }
        removeRequest(messageType, scope, requestId) {
            const cbs = this.cbMap.get(messageType);
            if (!cbs || cbs.length === 0) {
                return undefined;
            }
            const hasKey = typeof requestId === "string";
            const hasScope = typeof scope === "string";
            if (hasKey || hasScope) {
                let index = -1;
                // key优先级最高
                if (hasKey) {
                    index = cbs.findIndex(c => c.requestId === requestId);
                }
                else if (hasScope) { // 其次是scope
                    index = cbs.findIndex(c => isSameScope(c === null || c === void 0 ? void 0 : c.scope, scope));
                }
                if (index >= 0) {
                    const reqInfo = cbs[index];
                    cbs.splice(index, 1);
                    return reqInfo;
                }
                return undefined;
            }
            // 删除第一个
            return cbs.shift();
        }
        onBuiltInResponse(messageType, data) {
            if (messageType == undefined) {
                return data;
            }
            // TODO:: 这里可能被串改数据
            this.emit(messageType, data);
            return data;
        }
        getStatistics() {
            return {
                total: this.statistics.reqCount,
                success: this.statistics.resCount,
                timeout: this.statistics.timeOutCount
            };
        }
        destroy() {
            if (this.unsubscribe) {
                this.unsubscribe();
                this.cbMap.clear();
            }
        }
    }

    exports.BaseAsyncMessenger = BaseAsyncMessenger;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
