
export type MessageType = Symbol | string | number | undefined;

export interface BaseReqData<R = any> {
    /**
     * 请求的唯一标记
     */
    _key_?: string;
    /**
     * scope，区分多个渠道
     */
    scope?: string;
    /**
     * 区分类型的字段，默认是type|method 
     */
    type?: MessageType;
    /**
     * 区分类型的字段，默认是type|method 
     */
    method?: MessageType;
    /**
     * 数据部分
     */
    data?: R;
}


export type BaseResData<S = any> = BaseReqData<S>

export interface ReqInfo<R = any> {
    key: string | undefined;
    cb: Function;
    reqData?: R;
    reqTime?: number;
    scope: string | undefined;
}