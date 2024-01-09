import { MessageType } from "./types";

interface HandlerInfo {
    target: any;
    methodName: string;
    listener: Function;
}

export interface IPEventMessager<T = any, D = any> {
    on(category: T | T[], fun: (data: D) => any, context?: any): any;
    off?(category: T | T[], fun: (data: D) => any): any;
    emit(category: T, data: D, ...args: any[]): any;
    has(category: T):boolean;
}

export default class PEventMessager<DataType = any> implements IPEventMessager<MessageType, DataType> {
    private _map = new Map<MessageType, HandlerInfo[]>();
    /**
     * 可以处理多种类型的事件
     * @param messageType
     * @returns
     */
    on = (messageType: MessageType | MessageType[], listener: (data: any) => any, context: any = null) => {
        const cates = Array.isArray(messageType) ? messageType : [messageType];
        const map = this._map;

        if (typeof listener !== "function") {
            return console.error(`PassiveEventMessager::addHandler: fn 必须是一个函数`);
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
    }

    off = (messageType:  MessageType | MessageType[], listener: Function) => {
        console.log("removeHander:", messageType);

        const cates = Array.isArray(messageType) ? messageType : [messageType];
        const map = this._map;

        if (typeof listener !== "function") {
            return console.error(`PassiveEventMessager::removeHandler: fn 必须是一个函数`);
        }

        let cate: MessageType;
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
    }


    has(messageType: MessageType) {
        const handlers = this._map.get(messageType);
        return !!handlers && handlers.length > 0;
    }

    emit = (messageType: MessageType, data: any, ...args: any[]) => {
        const handlers = this._map.get(messageType);
        if (handlers == undefined) {
            return;
        }

        // console.log("handlers", handlers.length, handlers);
        handlers.forEach(handler => {
            const { listener: fun } = handler;
            if (!fun) {
                console.error(`PassiveEventMessager:不能找到category为${messageType}对应的${handler.methodName}事件处理函数`);
            } else {
                fun.apply(handler.target, [data].concat(args));
            }
        });
    }
}
