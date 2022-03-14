import { IPEventMessager } from "./PEventMessager";
import { BaseReqData, BaseResData, GlobalReqOptions, MessageType, ReqOptions, Unsubscribe } from "./types";
export default class BaseAsyncMessager<R = any, S = any> {
    private passiveEventMessager;
    private useOptions;
    /**
     * 请求的次数
     */
    private _reqCount;
    /**
     * 响应的次数
     */
    private _resCount;
    /**
     * 超时的数量
     */
    private _timeOutCount;
    private _options;
    private cbMap;
    protected unsubscribe?: Unsubscribe;
    constructor(options?: GlobalReqOptions, passiveEventMessager?: IPEventMessager);
    subscribe(onMessage?: Function): Unsubscribe;
    protected getReqkey<R>(data: BaseReqData<R>): any;
    protected getReqCategory(data: BaseReqData<R>): MessageType;
    protected getResCategory(data: BaseResData<S>): MessageType;
    protected request(_data: BaseReqData<R>, _key: string): any;
    protected getResKey(data: BaseResData<S>): MessageType;
    protected getResScope(data: BaseResData<S>): string | undefined;
    /**
     * 计算hashCode
     * @param data
     * @returns
     */
    protected getHashCode(data: BaseReqData<R>): number;
    protected onResponse(_category: MessageType, data: BaseResData<S>): BaseResData<S>;
    private getMethod;
    protected onMessage: (data: BaseResData<S>) => void;
    private addCallback;
    private getCallback;
    invoke(data: BaseResData, reqOptions?: ReqOptions, ...args: any[]): Promise<BaseResData<S>>;
    private removeReqInfo;
    private onTimeout;
    private onError;
    private onSuccess;
    protected onBuiltInResponse(category: MessageType, data: BaseResData<S>): BaseResData<S>;
    getStatistics(): {
        total: number;
        success: number;
        timeout: number;
    };
    get addHandler(): (category: any, fun: (data: any) => any, context?: any) => any;
    get removeHandler(): (category: any, fun: (data: any) => any) => any;
    destroy(): void;
}
