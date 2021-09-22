/* eslint-disable @typescript-eslint/interface-name-prefix */
/* eslint-disable @typescript-eslint/no-empty-interface */
interface HandlerInfo {
    target: any;
    methodName: string;
    fun: Function;
}

export interface IPEventMessager<S = any> {
    addHandler(category: string | string[], fun: (data: S) => any, context?: any): any;
    removeHandler?(category: string | string[], fun: (data: S) => any): any;
    emit(category: string, data: S, ...args: any[]): any;
}

export default class PEventMessager<S> implements IPEventMessager<S> {
    private _map = new Map<string, HandlerInfo[]>();

    /**
     * 可以处理多种类型的事件
     * @param category
     * @returns
     */
    addHandler = (category: string | string[], fun: (data: S) => any, context: any = null) => {
        const cates = Array.isArray(category) ? category : [category];
        const map = this._map;

        if (typeof fun !== "function") {
            return console.error(`PassiveEventMessager::addHandler: fn 必须是一个函数`);
        }

        cates.forEach(cate => {
            let handlers = map.get(cate);
            if (handlers == undefined) {
                handlers = [];
                map.set(cate, handlers);
            }

            handlers.push({
                methodName: fun.name,
                target: context,
                fun
            });
        });
    }

    removeHandler = (category: string | string[], fun: Function) => {
        console.log("removeHander:", category);

        const cates = Array.isArray(category) ? category : [category];
        const map = this._map;

        if (typeof fun !== "function") {
            return console.error(`PassiveEventMessager::removeHandler: fn 必须是一个函数`);
        }

        let cate: string;
        for (let i = 0; i < cates.length; i++) {
            cate = cates[i];
            const handlers = map.get(cate);

            if (handlers == undefined || !Array.isArray(handlers) || handlers.length == 0) {
                continue;
            }

            let index;
            for (let i = handlers.length; i >= 0; i--) {
                index = handlers.findIndex(h => h.fun === fun);
                if (index >= 0) {
                    handlers.splice(index, 1);
                }
            }
        }
    }

    emit = (category: string, data: S, ...args: any[]) => {
        console.log("PassiveEventMessager::onMessage", category, data);

        if (typeof category !== "string") {
            return console.error(`category 必须是有效的字符串`, category);
        }

        const handlers = this._map.get(category);
        if (handlers == undefined) {
            return;
        }

        console.log("handlers", handlers.length, handlers);
        handlers.forEach(handler => {
            const { fun } = handler;
            if (!fun) {
                console.error(`PassiveEventMessager:不能找到category为${category}对应的${handler.methodName}事件处理函数`);
            } else {
                fun.apply(handler.target, [data].concat(args));
            }
        });
    }
}
