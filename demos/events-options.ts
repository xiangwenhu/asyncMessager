import { BaseAsyncMessager, BaseReqData, GlobalReqOptions } from "../src/index";
import EventEmitter from "events";

const emitter = new EventEmitter();

interface RequestData extends BaseReqData {
    method: string;
    data?: any;
}
type ResponseData = RequestData;

const emitterAsyncMessager = new BaseAsyncMessager<RequestData>({
    subscribe(onMessage) {
        console.log("WebViewBridge: subscribe");
        emitter.on("message", onMessage as any);
        return () => {
            emitter.off("message", onMessage  as any);
        }
    },
    getReqCategory(data: RequestData) {
        console.log("WebViewBridge getReqCategory: method", data.method);
        return data.method;
    },
    getResCategory(data: ResponseData) {
        return data.method;
    },
    request(data: RequestData, key?: string) {
        emitter.emit("message-request", data);
    }
});
// emitterAsyncMessager.subscribe();



setInterval(() => {
    emitter.emit('message', {
        method: 'continuous-event',
        data: new Date().toLocaleTimeString()
    })
}, 3000)


emitter.on("message-request", (data: RequestData) => {

    setTimeout(() => {
        emitter.emit("message", {
            method: data.method,
            data: `${data.method}--- data`
        })
    }, 3000)

})


emitterAsyncMessager.invoke({
    method: "cccc",
    data: 111
}).then(res => console.log("res:", res))


emitterAsyncMessager.addHandler("continuous-event", function onEvent(data) {
    console.log("continuous-event:", data);
})


