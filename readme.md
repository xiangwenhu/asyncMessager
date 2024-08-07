
## 摘要
传统基于事件通信转Promise通用方案。支持
* EventEmitter 类别
* MQTT, socket.io,
* iframe
* webview
* 等等场景。


## 依赖
其依赖了ES6的Map, 如果项目已经使用了[core-js](https://www.npmjs.com/package/core-js)，直接引用其map就行。

如果仅仅单独引入Map, 建议[es6-map](https://github.com/medikoo/es6-map)


## 流程和原理图
![流程和原理图](./docs/images/process.png)

## 源码结构说明
```
    src
        BaseAsyncMessager.ts    核心，基础异步消息处理类，包含：流程控制，主动的Promise类型的通讯
        index.ts                入口文件
        PEventMessager.ts       消息中心，BaseAsyncMessager继承于他，处理被动的消息。
        types.ts                类型定义
        util.ts                 辅助方法
```


## 示例代码
[示例代码源码地址](./demos)


### EventEmitter


events.js
```js
import EventEmitter from "events";
import { BaseReqData } from "async-messager"

const emitter = new EventEmitter();

setInterval(() => {
    emitter.emit('message', {
        method: 'continuous-event',
        data: new Date().toLocaleTimeString()
    })
}, 3000)


emitter.on("message-request", (data: BaseReqData) => {

    // 单向的，不回发消息
    if (data.method === "oneway") {
        return;
    }

    setTimeout(() => {
        emitter.emit("message", {
            method: data.method,
            data: `${data.method}--- data`
        })
    }, 3000)

})


export default emitter;
```

messager.js
```js
import { BaseAsyncMessager, BaseReqData, GlobalReqOptions } from "async-messager";
import emitter from "./events";

type RequestData  = BaseReqData;
type ResponseData = RequestData;

class EmitterAsyncMessager extends BaseAsyncMessager {
    constructor(options: GlobalReqOptions = {}) {
        super(options);
    }

    override subscribe() {
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

export default new EmitterAsyncMessager();
```

index.js
```js
import messager from "./messager";

messager.subscribe();

// 有发有回
messager.invoke({
    method: "cccc",
    data: 111
}).then(res => console.log("res:", res))

// 只发不回
messager.invoke({
    method: "oneway",
    data: 111
}, {
    sendOnly: true,
}).then(res => console.log("oneway request res:", res))

// 被动通知
messager.on("continuous-event", function onEvent(data) {
    console.log("continuous-event:", data);
})
```

### iframe

```html
    <iframe src="./iframe1.html" id="ifr"></iframe>
    <script src="../../dist/asyncMessager.js"></script>
    <script>

        function sendMessage(msg) {
            iframe1.contentWindow.postMessage(msg)
        }
        const iframe1 = document.getElementById("ifr");

        const asyncMessager = new AsyncMessager.BaseAsyncMessager({
            // logUnhandledEvent: false,
            subscribe(onMessage) {
                function onIframeMessage(msg) {
                    onMessage(msg.data);
                }
                window.addEventListener("message", onIframeMessage);
                return () => {
                    window.removeEventListener("message", onIframeMessage);
                }
            },
            request(data, key) {
                sendMessage(data);
            }
        });

        iframe1.contentWindow.onload = () => {
            // 异步Promise调用
            asyncMessager.invoke({
                method: "init",
                data: {
                    user: 123456,
                    token: "blabla......"
                }
            }).then(res => console.log("index.html:", res, res))
        }
        // 传统的回调调用
        asyncMessager.on("timeInfo", function(data){
            console.log("index.html:timeInfo", data);
        })


    </script>
```

## socket.io

不到20行代码，就实现了异步编程。

```js
const socket = io("http://localhost:3000");

function sendMessage(msg) {
    socket.emit("message", msg)
}

const asyncMessager = new AsyncMessager.BaseAsyncMessager({
    // logUnhandledEvent: false,
    subscribe(onMessage) {
        function onSocketMessage(msg) {
            onMessage(msg);
        }
        socket.on("message", onSocketMessage);
        return () => {
            socket.off("message", onSocketMessage);
        }
    },    
    request(data, key) {
        sendMessage(data);
    }
});

socket.on("connect", () => {
    console.log("connect")
    asyncMessager.invoke({
        method: "getUsers",
        data: {
            user: 123456,
            token: "blabla......"
        }
    }).then(res => console.log("index.html:", res, res))
});

asyncMessager.on("timeInfo", function (data) {
    console.log("index.html:timeInfo", data);
});

```
