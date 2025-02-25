import { BaseAsyncMessenger, BaseReqData, GlobalReqOptions } from "../src/index";
import EventEmitter from "events";

const emitter = new EventEmitter();

type RequestData  = BaseReqData;
type ResponseData = RequestData;

class EmitterAsyncMessenger extends BaseAsyncMessenger {
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

const emitterAsyncMessenger = new EmitterAsyncMessenger();
emitterAsyncMessenger.subscribe();



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


emitterAsyncMessenger.invoke({
    method: "cccc",
    data: 111
}).then(res => console.log("res:", res))


emitterAsyncMessenger.invoke({
    method: "oneway",
    data: 111
}, {
    sendOnly: true,
}).then(res => console.log("oneway request res:", res))


emitterAsyncMessenger.on("continuous-event", function onEvent(data) {
    console.log("continuous-event:", data);
})


