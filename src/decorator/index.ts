import { IPEventMessenger } from "src/PEventMessenger";
import { isAsyncFunction, isNormalFunction } from "../utils/function";


interface Options {
    type?: string;
}

export function listener(options: Options = {}) {
    return function (
        target: Function,
        context: ClassMethodDecoratorContext<any>
    ) {

        // target: method
        // context: demo {"kind":"method","name":"eat","static":false,"private":false,"access":{}}

        if (!(isNormalFunction(target) && isAsyncFunction(target))) {
            throw new Error("listener Decorator 只能用于装饰class的方法");
        }

        if (context.kind !== "method" || !!context.static) {
            throw new Error("listener Decorator 只能用于装饰class的实例方法");
        }
        if (context.private) {
            throw new Error(`listener Decorator 不能用于装饰class的private 方法: ${String(context.name)}`);
        }


        let classInstance: IPEventMessenger;
        context.addInitializer(function () {
            const { type = target.name } = options;
            // this: class instance
            classInstance = this;
            classInstance.on(type, target as any)
        });

    };
};