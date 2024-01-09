import * as util from "./util";
import PEventMessager, { IPEventMessager } from "./PEventMessager";
import { BaseReqData, BaseResData, GlobalReqOptions, MessageType, RequestInfo, RequestOptions, Unsubscribe } from "./types";
import { isSameScope } from "./util";

const DEFAULT_GLOBAL_OPTIONS: GlobalReqOptions = {
    timeout: 5000,
    clearTimeoutReq: true,
    // autoSubscribe: false,
    enableLog: true,
    logUnhandledEvent: true,
};

type ExtensibleMethod = "subscribe" | "getRequestId" | "getReqMessageType" | "getResponseId" | "getResMessageType" | "request" | "getResScope" | "onResponse";

export default class BaseAsyncMessager<R = any, S = any> {

    private useOptions: boolean = false;
    /**
     * 请求的次数
     */
    private reqCount = 0;
    /**
     * 响应的次数
     */
    private resCount = 0;
    /**
     * 超时的数量
     */
    private timeOutCount = 0;

    private options: GlobalReqOptions;

    private cbMap = new Map<MessageType, RequestInfo<R>[]>();

    protected unsubscribe?: Unsubscribe;

    constructor(options: GlobalReqOptions = DEFAULT_GLOBAL_OPTIONS,
        private passiveEventMessager: IPEventMessager = new PEventMessager()) {
        this.options = { ...DEFAULT_GLOBAL_OPTIONS, ...options };

        if (util.isFunction(this.options.subscribe)) {
            this.unsubscribe = this.options.subscribe!(this.onMessage)
        }
        this.useOptions = true;
    }

    subscribe(onMessage?: Function): Unsubscribe {
        throw new Error("not implemented")
    }

    /**
     * 获取请求的key
     * @param data 
     * @returns 
     */
    protected getRequestId<R>(_data: BaseReqData<R>): string {
        return util.uuid()
    }

    protected getReqMessageType(data: BaseReqData<R>): MessageType | undefined {
        return data.method || data.type;
    }

    protected getResMessageType(data: BaseResData<S>): MessageType | undefined {
        return data.method || data.type;
    }

    protected request(_data: BaseReqData<R>, _key: string): any {
        throw new Error("not implemented")
    }

    protected getResponseId(data: BaseResData<S>): string | undefined {
        return data.requestId;
    }

    protected getResScope(data: BaseResData<S>) {
        return data.scope;
    }

    /**
     * 计算hashCode
     * @param data 
     * @returns 
     */
    protected getHashCode(data: BaseReqData<R>) {
        return util.hash(JSON.stringify(data))
    }

    protected onResponse(_messageType: MessageType, data: BaseResData<S>) {
        return data;
    }

    private getMethod = <R = any>(name: ExtensibleMethod) => {
        const optMethod = this.options[name as keyof GlobalReqOptions];
        const classMethod = this[name as keyof this];

        const method = this.useOptions ? optMethod || classMethod : classMethod || optMethod;
        if (!method) {
            console.error(`${method} 查找失败，请确保在Class或者options上已定义`);
        }
        return method as ((...args: any[]) => R);
    }

    protected onMessage = (data: BaseResData<S>) => {
        const messageType = this.getMethod("getResMessageType")(data);
        const responseId = this.getMethod("getResponseId")(data);

        if (!messageType) {
            if (this.options.logUnhandledEvent) {
                console.error(`${messageType} 的响应请求未定义`);
            }
            return
        }

        const scope = this.getMethod("getResScope")(data);
        // 提供自定义助力数据的能力
        data = this.onResponse(messageType, data);

        const isInHandlers = this.passiveEventMessager.has(messageType);
        // 内置的成功处理
        this.onBuiltInResponse(messageType, data);

        const callback = this.getCallback(messageType, scope, responseId);

        //  AsyncMessager中没有，PEventMessager中也没有, 并且开启相关的日志输出
        if (!callback && !isInHandlers && this.options.logUnhandledEvent) {
            this.onError();
            console.warn(`未找到category为${messageType},key为${responseId}的回调信息`);
            return;
        }
        this.onSuccess(messageType, data);
        if (callback) {
            callback(data);
        }
    }

    private addCallback(category: MessageType, reqInfo: RequestInfo) {
        const cbs = this.cbMap.get(category);
        if (!cbs) {
            this.cbMap.set(category, []);
        }

        this.cbMap.get(category)!.push({
            requestId: reqInfo.requestId,
            reqTime: Date.now(),
            cb: reqInfo.cb,
            scope: reqInfo.scope
        });
    }

    private getCallback(category: MessageType, scope: string, requestId: string) {
        const reqInfo = this.removeRequest(category, scope, requestId);
        if (!reqInfo) {
            return undefined;
        }
        return reqInfo.cb;
    }

    invoke(data: BaseResData, reqOptions?: RequestOptions, ...args: any[]): Promise<BaseResData<S> | undefined> {
        this.reqCount++;
        const {
            timeout = 5000,
            sendOnly = false,
            defaultRes = {
                message: "请求超时"
            }
        } = reqOptions || {};

        // 获得请求唯一ID
        if (!util.hasOwnProperty(data, "requestId")) {
            data.requestId = this.getMethod("getRequestId").apply(this, [data]);
        }
        const requestId = data.requestId;
        const tout = timeout || this.options.timeout;
        const messageType = this.getMethod("getReqMessageType")(data);

        // 只发不收
        if (sendOnly) {
            this.getMethod("request")(data, requestId, ...args);
            return Promise.resolve(undefined)
        }

        return new Promise((resolve, reject) => {
            const { run, cancel } = util.delay(undefined, tout);
            // 超时
            run().then(() => {
                console.log("请求超时:", messageType, data, requestId);
                this.onTimeout();
                if (this.options.clearTimeoutReq) {
                    this.removeRequest(messageType, data?.scope as string, requestId);
                }
                reject({
                    message: "请求超时",
                    ...(defaultRes || {})
                });
            });

            this.addCallback(messageType, {
                requestId: requestId,
                cb: (msg: any) => {
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

    private removeRequest(messageType: MessageType, scope: string | undefined, requestId: string | undefined) {
        const cbs = this.cbMap.get(messageType);
        if (!cbs || cbs.length === 0) {
            return undefined;
        }
        const hasKey = typeof requestId === "string";
        const hasScope = typeof scope === "string"
        if (hasKey || hasScope) {
            let index = -1;
            // key优先级最高
            if (hasKey) {
                index = cbs.findIndex(c => c.requestId === requestId)
            } else if (hasScope) { // 其次是scope
                index = cbs.findIndex(c => isSameScope(c?.scope, scope))
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

    private onTimeout = () => {
        this.timeOutCount++;
    }

    private onError = () => { }

    private onSuccess = (category: MessageType, data: BaseResData<S>) => {
        this.resCount++;
    }

    protected onBuiltInResponse(category: MessageType, data: BaseResData<S>) {
        if (this.passiveEventMessager) {
            this.passiveEventMessager.emit(category, data);
        }

        return data;
    }

    public getStatistics() {
        return {
            total: this.reqCount,
            success: this.resCount,
            timeout: this.timeOutCount
        };
    }


    get addHandler() {
        return this.passiveEventMessager.on || util.noop
    }

    get removeHandler() {
        return this.passiveEventMessager.off || util.noop;
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.cbMap.clear();
        }
    }
}
