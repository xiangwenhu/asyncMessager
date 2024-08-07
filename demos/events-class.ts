import { BaseAsyncMessager, BaseReqData, GlobalReqOptions } from "../lib/index";
import EventEmitter from "events";

const emitter = new EventEmitter();

type RequestData  = BaseReqData;
type ResponseData = RequestData;

class EmitterAsyncMessager extends BaseAsyncMessager {
    constructor(options: GlobalReqOptions = {}) {
        super(options);
    }

    subscribe() {
        console.log("WebViewBridge: subscribe");
        emitter.on("message", this.onMessage);
        return () => {
            emitter.off("message", this.onMessage);
        }
    }

    protected request(data: RequestData) {
        emitter.emit("message-request", data);
    }
}

const emitterAsyncMessager = new EmitterAsyncMessager();
emitterAsyncMessager.subscribe();



setInterval(() => {
    emitter.emit('message', {
        method: 'continuous-event',
        data: new Date().toLocaleTimeString()
    })
}, 3000)


emitter.on("message-request", (data: RequestData) => {

    // 单向的，不回发消息
    if(data.method === "oneway"){
        return;
    }

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


emitterAsyncMessager.invoke({
    method: "oneway",
    data: 111
}, {
    sendOnly: true,
}).then(res => console.log("oneway request res:", res))


emitterAsyncMessager.on("continuous-event", function onEvent(data) {
    console.log("continuous-event:", data);
})


