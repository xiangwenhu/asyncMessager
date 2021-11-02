import * as util from "./util";
import PEventMessager, { IPEventMessager } from "./PEventMessager";
import { BaseReqData, BaseResData, MessageType, ReqInfo } from "./types";

const DEFAULT_G_OPTIONS: GlobalReqOptions = {
    timeout: 5000,
    clearTimeoutReq: true,
    // autoSubscribe: false,
    enableLog: true,
    logUnhandledEvent: true,
};

export interface GlobalReqOptions<R = any, S = any> {
    timeout?: number;
    autoSubscribe?: boolean;
    clearTimeoutReq?: boolean;
    enableLog?: boolean;
    /**
     * 订阅
     */
    subscribe?(onMessage?: Function): Unsubscribe;
    /**
     * 获得请求的key
     * @param data 
     */
    getReqkey?<R>(data: BaseReqData<R>): string;
    /**
     * 获取请求的Category
     * @param data 
     */
    getReqCategory?(data: BaseReqData<R>): MessageType;
    /**
     * 获得响应的Key
     * @param data 
     */
    getResKey?(data: BaseResData<S>): string
    /**
     * 打开多个被请求方， 比如多个webview
     */
    getResSope?: (data: BaseResData<S>) => string | string[];
    /**
     * 提供返回后，再处理数据的能力
     */
    onResponse?: (data: BaseResData<S>) => BaseResData<S>;
    /**
     * 获取响应的Category
     * @param data 
     */
    getResCategory?(data: BaseResData<S>): MessageType;
    /**
     * 真正的请求
     * @param data 
     * @param key 
     */
    request?(data: BaseResData<S>, key: string): any;
    /**
     * 获取hashCode
     * @param data 
     */
    getHashCode?(data: BaseReqData<R>): string | number;
    /**
     * 输出未处理的事件回调
     */
    logUnhandledEvent?: boolean;
}

export interface ReqOptions {
    timeout?: number;
    defaultRes?: any;
}

type Unsubscribe = () => void;

type extensibleMethod = "subscribe" | "getReqkey" | "getReqCategory" | "getResKey" | "getResCategory" | "request" | "getResScope" | "onResponse" | "getHashCode";

export default class BaseAsyncMessager<R = any, S = any> {

    private useOptions: boolean = false;
    /**
     * 请求的次数
     */
    private _reqCount = 0;
    /**
     * 响应的次数
     */
    private _resCount = 0;
    /**
     * 超时的数量
     */
    private _timeOutCount = 0;

    private _options: GlobalReqOptions;

    private cbMap = new Map<MessageType, ReqInfo<R>[]>();

    protected unsubscribe?: Unsubscribe;

    constructor(options: GlobalReqOptions = DEFAULT_G_OPTIONS,
        private passiveEventMessager: IPEventMessager = new PEventMessager()) {
        this._options = { ...DEFAULT_G_OPTIONS, ...options };

        if (util.isFunction(this._options.subscribe)) {
            this.unsubscribe = this._options.subscribe!(this.onMessage)
        }
        this.useOptions = true;
    }

    subscribe(onMessage?: Function): Unsubscribe {
        throw new Error("not implemented")
    }

    protected getReqkey<R>(data: BaseReqData<R>) {
        const method = this.getMethod("getHashCode");
        return method!(data);
    }

    protected getReqCategory(data: BaseReqData<R>): MessageType {
        return data.method || data.type;
    }

    protected getResCategory(data: BaseResData<S>): MessageType {
        return data.method || data.type;
    }

    protected request(_data: BaseReqData<R>, _key: string): any {
        throw new Error("not implemented")
    }

    protected getResKey(data: BaseResData<S>): MessageType {
        return data._key_!;
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
        return util.hashcode(JSON.stringify(data))
    }

    protected onResponse(_category: MessageType, data: BaseResData<S>) {
        return data;
    }

    private getMethod = (name: extensibleMethod) => {
        const optMethod = this._options[name as keyof GlobalReqOptions];
        const classMethod = this[name as keyof this];

        const method = this.useOptions ? optMethod || classMethod : classMethod || optMethod;
        if (!method) {
            console.error(`${method} 查找失败，请确保在Class或者options上已定义`);
        }
        return method as Function;
    }

    protected onMessage = (data: BaseResData<S>) => {
        const category = this.getMethod("getResCategory")(data);
        const key = this.getMethod("getResKey")(data);

        const scope = this.getMethod("getResScope")(data);
        // 提供自定义助力数据的能力
        data = this.getMethod("onResponse")(category, data);

        const isInHanlders = this.passiveEventMessager.has(category);
        // 内置的成功处理
        this.onBuiltInResponse(category, data);

        const callback = this.getCallback(category, scope, key);

        //  AsyncMessager中没有，PEventMessager中也没有, 并且开启相关的日志输出
        if (!callback && !isInHanlders && this._options.logUnhandledEvent) {
            this.onError();
            console.warn(`未找到category为${category},key为${key}的回调信息`);
            return;
        }
        this.onSuccess(category, data);
        if (callback) {
            callback(data);
        }
    }

    private addCallback(category: MessageType, reqInfo: ReqInfo) {
        const cbs = this.cbMap.get(category);
        if (!cbs) {
            this.cbMap.set(category, []);
        }

        this.cbMap.get(category)!.push({
            key: reqInfo.key,
            reqTime: Date.now(),
            cb: reqInfo.cb,
            scope: reqInfo.scope
        });
    }

    private getCallback(category: MessageType, scope: string, key: string) {
        const cbs = this.cbMap.get(category);
        if (!cbs) {
            return undefined;
        }

        if (typeof key === "string") {
            const reqInfo = this.removeReqInfo(category, scope, key);
            if (!reqInfo) {
                return undefined;
            }
            return reqInfo.cb;
        }

        // TODO:: scope
        if (!cbs || cbs.length == 0) {
            return undefined;
        }

        // 返回第一个
        return (cbs as Array<any>).shift().cb;
    }

    invoke(data: BaseResData, reqOptions?: ReqOptions): Promise<BaseResData<S>> {
        this._reqCount++;
        const {
            timeout = 5000,
            defaultRes = {
                message: "请求超时"
            }
        } = reqOptions || {};

        // 获得key值
        if (!util.hasOwnProperty(data, "_key_")) {
            data._key_ = this.getMethod("getReqkey").apply(this, [data]);
        }
        const hashKey = data._key_;
        const tout = timeout || this._options.timeout;
        const category = this.getMethod("getReqCategory")(data);

        return new Promise((resolve, reject) => {
            const { run, cancel } = util.delay(undefined, tout);
            // 超时
            run().then(() => {
                console.log("请求超时:", category, data, hashKey);
                this.onTimeout();
                if (this._options.clearTimeoutReq) {
                    this.removeReqInfo(category, data?.scope as string, hashKey);
                }
                reject({
                    message: "请求超时",
                    ...(defaultRes || {})
                });
            });

            this.addCallback(category, {
                key: hashKey,
                cb: (msg: any) => {
                    // 取消超时回调
                    cancel();
                    resolve(msg);
                },
                scope: data.scope
            });
            // 调用
            this.getMethod("request")(data, hashKey);
        });
    }

    private removeReqInfo(category: MessageType, scope: string, key: string | undefined) {
        const cbs = this.cbMap.get(category);
        if (!cbs) {
            return undefined;
        }
 
        const index = cbs.findIndex(c => c.key === key && c?.scope == scope);
        if (index < 0) {
            return undefined;
        }
        const reqInfo = cbs[index];
        cbs.splice(index, 1);
        return reqInfo;
    }

    private onTimeout = () => {
        this._timeOutCount++;
    }

    private onError = () => {}

    private onSuccess = (category: MessageType, data: BaseResData<S>) => {
        this._resCount++;
    }

    protected onBuiltInResponse(category: MessageType, data: BaseResData<S>) {
        if (this.passiveEventMessager) {
            this.passiveEventMessager.emit(category, data);
        }

        return data;
    }

    public getStatistics() {
        return {
            total: this._reqCount,
            success: this._resCount,
            timeout: this._timeOutCount
        };
    }


    get addHandler() {
        return this.passiveEventMessager.addHandler || util.noop
    }

    get removeHandler() {
        return this.passiveEventMessager.removeHandler || util.noop;
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.cbMap.clear();
        }
    }
}
