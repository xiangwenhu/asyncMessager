export declare function hashcode(str?: string): number;
export declare function isFunction(fn: unknown): boolean;
export declare const noop: () => void;
/**
 * 延时执行函数
 * @param fn
 * @param delay
 * @param context
 * @returns
 */
export declare function delay(fn?: Function, delay?: number, context?: unknown): {
    run: (...args: any[]) => Promise<any>;
    cancel: () => void;
};
export declare function hasOwnProperty(obj: any, property: PropertyKey): boolean;
export declare function isSameScope(scope1: string | undefined, scope2: string | undefined): boolean;
