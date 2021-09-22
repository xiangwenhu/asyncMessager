/* eslint-disable no-bitwise */
/* eslint-disable no-shadow */
export function hashcode(str = "") {
    let hash = 0; let i; let chr; let
        len;
    if (str.length === 0) return hash;
    for (i = 0, len = str.length; i < len; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export function isFunction(fn: Function): boolean {
    return typeof fn === 'function'
}

/**
 * 延时执行函数
 * @param fn 
 * @param delay 
 * @param context 
 * @returns 
 */
 export function delay(fn: Function = () => { }, delay: number = 5000, context: unknown = null): {
    run: (...args: any[]) => Promise<any>,
    cancel: () => void
} {
    if (!isFunction(fn)) {
        return {
            run: () => Promise.resolve(),
            cancel: () => { }
        }
    }
    let ticket: any;
    let runned = false;
    return {
        run(...args: any[]) {
            return new Promise((resolve, reject) => {
                if (runned === true) {
                    return;
                }
                runned = true;
                ticket = setTimeout(async () => {
                    try {
                        const res = await fn.apply(context, args);
                        resolve(res);
                    } catch (err) {
                        reject(err)
                    }
                }, delay)
            })
        },
        cancel: () => {
            clearTimeout(ticket);
        }
    }
}

export const noop = function noop() { };
