const toString = Object.prototype.toString;

export function isType(obj: any, type: string) {
    return toString.call(obj) === `[object ${type}]`;
}

