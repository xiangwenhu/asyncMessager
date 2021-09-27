import { BaseAsyncMessager, BaseReqData, GlobalReqOptions } from "../src/index";
import EventEmitter from "events";

const emitter = new EventEmitter();

interface RequestData extends BaseReqData {
    method: number | string | Symbol;
    data?: any;
}
type ResponseData = RequestData;


// 初始化异步Messager
const emitterAsyncMessager = new BaseAsyncMessager<RequestData>({
    subscribe(onMessage) {
        console.log("emitterAsyncMessager: subscribe");
        emitter.on("message", onMessage as any);
        return () => {
            emitter.off("message", onMessage  as any);
        }
    },
    getReqCategory(data: RequestData) {
        console.log("emitterAsyncMessager： getReqCategory: method", data.method);
        return data.method;
    },
    getResCategory(data: ResponseData) {
        return data.method;
    },
    request(data: RequestData, key?: string) {
        emitter.emit("message-request", data);
    }
});



const symbolCccc = Symbol.for("cccc");

/* 模拟emitter另外一端 */ 

// 传统的事件通知
setInterval(() => {
    emitter.emit('message', {
        method: 'continuous-event',
        data: new Date().toLocaleTimeString()
    })
}, 3000)

// 监听 message-request 事件，然后回发事件
emitter.on("message-request", (data: RequestData) => {
    setTimeout(() => {
        emitter.emit("message", {
            method: data.method,
            data: `${data.method.toString()}--- data`
        })
    }, 3000)
})



/*使用方 */

// 调用
emitterAsyncMessager.invoke({
    method: symbolCccc,
    data: 111
}).then(res => console.log("res:", res))

// 传统的监听事件
emitterAsyncMessager.addHandler("continuous-event", function onEvent(data) {
    console.log("continuous-event:", data);
})


