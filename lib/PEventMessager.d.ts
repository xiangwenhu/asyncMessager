import { MessageType } from "./types";
export interface IPEventMessager<T = any, S = any> {
    addHandler(category: T | T[], fun: (data: S) => any, context?: any): any;
    removeHandler?(category: T | T[], fun: (data: S) => any): any;
    emit(category: T, data: S, ...args: any[]): any;
    has(category: T): boolean;
}
export default class PEventMessager implements IPEventMessager<MessageType> {
    private _map;
    /**
     * 可以处理多种类型的事件
     * @param category
     * @returns
     */
    addHandler: (category: MessageType | MessageType[], listener: (data: any) => any, context?: any) => void;
    removeHandler: (category: MessageType | MessageType[], listener: Function) => void;
    has(category: MessageType): boolean;
    emit: (category: MessageType, data: any, ...args: any[]) => void;
}
