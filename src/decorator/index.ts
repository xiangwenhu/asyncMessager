import { isAsyncFunction, isNormalFunction } from "../utils/function";

export function methodDecorator(config: any) {
    return function (
        target: Function,
        context: ClassMethodDecoratorContext<any>
    ) {
        if (!(isNormalFunction(target) && isAsyncFunction(target))) {

        }

        if (context.kind !== "method") {
            throw new Error("methodDecorator 只能用于装饰class的method");
        }
        if (context.private) {
            throw new Error(`methodDecorator 不能用于装饰class的private method: ${String(context.name)}`);
        }
    };
};