import * as util from "./util";
import PEventMessager, { IPEventMessager } from "./PEventMessager";

const { hasOwnProperty } = Object.prototype;

export interface BaseReqData<R = any, S = any> {
    _key_?: string;
    scope?: string;
    decoratorMapKey?: string;
}

interface ReqInfo<R = any> {
    key: string;
    cb: Function;
    reqData?: R;
    reqTime?: number;
}

const DEFAULT_G_OPTIONS: GlobalReqOptions = {
    timeout: 5000,
    clearTimeoutReq: true,
    // autoSubscribe: false,
    enableLog: true,
};

export interface GlobalReqOptions<R = any, S = any> {
    timeout?: number;
    autoSubscribe?: boolean;
    clearTimeoutReq?: boolean;
    enableLog?: boolean;
    subscribe?(): Unsubscribe;
    getReqkey?<R>(data: R): string;
    getReqCategory?(data: R): string;
    getResKey?(data: S): string
    /**
     * 打开多个被请求方， 比如多个webview
     */
    getResSope?: (data: S) => string | string[];
    /**
     * 提供返回后，再处理数据的能力
     */
    onReponse?: (data: S) => S;
    getResCategory?(data: S): string;
    request?(data: R, key: string): any;
}

export interface ReqOptions {
    timeout?: number;
    defaultRes?: any;
}

type Unsubscribe = () => void;

type extensibleMethod = "subscribe" | "getReqkey" | "getReqCategory" | "getResKey" | "getResCategory" | "request" | "getResScope" | "onResponse";

export default abstract class BaseAsyncMessager<R extends BaseReqData, S = any> {
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

    private cbMap = new Map<string, ReqInfo<R>[]>();

    protected unsubscribe?: Unsubscribe;

    constructor(options: GlobalReqOptions = DEFAULT_G_OPTIONS,
        private passiveEventMessager: IPEventMessager = new PEventMessager()) {
        this._options = { ...DEFAULT_G_OPTIONS, ...options };

        // if (this._options.autoSubscribe) {
        //     // 订阅
        //     this.unsubscribe = this.getMethod("subscribe")();
        // }
    }

    abstract subscribe(): Unsubscribe;

    protected getReqkey<R>(data: R) {
        const hashKey = `${util.hashcode(JSON.stringify({ data }))}`;
        return hashKey;
    }

    protected abstract getReqCategory(data: R): string;

    protected abstract getResCategory(data: S): string;

    protected abstract request(data: R, key: string): any;

    protected getResKey(data: S): string {
        return (data as any)._key_;
    }

    protected getResScope(data: S) {
        return (data as any).scope;
    }

    protected onResponse(category:string, data: S) {
        return data;
    }

    private getMethod = (name: extensibleMethod) => {
        const method = this[name as keyof this] || this._options[name as keyof GlobalReqOptions];
        if (!method) {
            console.error(`${method} 查找失败，请确保在Class或者options上已定义`);
        }
        return method as Function;
    }

    protected onMessage = (data: S) => {
        // console.log("BaseAsyncMessager::onMessage:", data);
        const category = this.getMethod("getResCategory")(data);
        const key = this.getMethod("getResKey")(data);

        const scope = this.getMethod("getResScope")(data);
        // 提供自定义助力数据的能力
        data = this.getMethod("onResponse")(category, data);
        // 内置的成功处理
        this.onBuiltInResponse(category, data);

        const callback = this.getCallback(category, scope, key);
        if (!callback) {
            this.onError();
            console.log(`未找到category为${category},key为${key}的回调信息`);
            return;
        }
        this.onSuccess(category, data);
        callback(data);
    }

    private addCallback(category: string, reqInfo: ReqInfo) {
        const cbs = this.cbMap.get(category);
        if (!cbs) {
            this.cbMap.set(category, []);
        }

        this.cbMap.get(category)!.push({
            key: reqInfo.key,
            reqTime: Date.now(),
            cb: reqInfo.cb
        });
    }

    private getCallback(category: string, scope: string, key: string) {
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

        // ToDO:: scope
        if (!cbs || cbs.length == 0) {
            return undefined;
        }

        // 返回第一个
        return (cbs as Array<any>).shift().cb;
    }

    invoke<SS = S>(data: R, reqOptions?: ReqOptions): Promise<SS> {
        this._reqCount++;
        const {
            timeout = 5000,
            defaultRes = {
                message: "请求超时"
            }
        } = reqOptions || {};

        // 获得key值
        if (!hasOwnProperty.call(data, "_key_")) {
            data._key_ = this.getMethod("getReqkey")(data);
        }
        const hashKey = data._key_!;

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
                    resolve(msg as SS);
                }
            });
            // 调用
            this.getMethod("request")(data, hashKey);
        });
    }

    private removeReqInfo(category: string, scope: string, key: string) {
        const cbs = this.cbMap.get(category);
        if (!cbs) {
            return undefined;
        }

        const index = cbs.findIndex(c => c.key === key && c?.reqData?.scope == scope);
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

    private onError = () => {

    }

    private onSuccess = (category: string, data: S) => {
        this._resCount++;
    }

    protected onBuiltInResponse(category: string, data: S) {
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


    addHandler() {
        return this.passiveEventMessager.addHandler || util.noop
    }

    removeHandler() {
        return this.passiveEventMessager.removeHandler || util.noop;
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.cbMap.clear();
            // this.cbMap = null;
        }
    }
}
