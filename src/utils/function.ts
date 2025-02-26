import { isType } from ".";

export function isFunction(obj: any) {
    return typeof obj === "function" || isType(obj, "Function");
}


export const AsyncFunctionConstructor: FunctionConstructor = (async function fn() { }).constructor as any;

export const GeneratorFunctionConstructor: FunctionConstructor = (function* () { }).constructor as any;

export const AsyncGeneratorFunctionConstructor: FunctionConstructor = (async function* () { }).constructor as any


export function isGeneratorFunction(fn: any): boolean {
    if (!isFunction(fn)) return false;
    return fn.constructor === GeneratorFunctionConstructor
}


export function isAsyncGeneratorFunction(fn: any): boolean {
    if (!isFunction(fn)) return false;
    return fn.constructor === AsyncGeneratorFunctionConstructor
}


export function isAsyncFunction(fn: any): boolean {
    if (!isFunction(fn)) return false;
    return fn.constructor === AsyncFunctionConstructor
}

export function isArrowFunction(fn: Function): boolean {
    if (!isFunction(fn)) return false;
    // 箭头函数没有 prototype 属性，或者它不是对象类型
    if (fn.hasOwnProperty('prototype') && typeof fn.prototype === 'object') {
        return false;
    }

    // 检查函数定义字符串是否以括号开始，这是箭头函数的特点之一
    const fnString = fn.toString().trim();
    // 检查是否为箭头函数定义（以括号开始，但不是 function 关键字）
    return /^[(]/.test(fnString) && !/^function/.test(fnString);
}

export function isNormalFunction(fn: Function): boolean {
    if (!isFunction(fn)) return false;

    // 如果函数的构造器是普通的 Function 构造器，则继续检查
    if (fn.constructor === Function) {

        // 不是箭头函数
        if (isArrowFunction(fn)) {
            return false;
        }

        // 如果到达这里，则认为是普通函数
        return true;
    }

    // 对于其他已知的特殊类型的构造器，默认认为不是普通函数
    return false;
}