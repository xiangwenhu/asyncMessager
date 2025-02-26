
## 现存在的问题
- [x] 区分addHandler和异步invoke的回调函数
- [x] 属性键支持 number 和 Symbol
- [ ] 装饰器，支持class
```typescript
// 初始化异步Messenger
const Messenger = new BaseAsyncMessenger({
    // logUnhandledEvent: false,
    subscribe(onMessage) {
        emitter.on("message", onMessage as any);
        return () => {
            emitter.off("message", onMessage as any);
        }
    },

    request(data: BaseReqData, key?: string) {
        emitter.emit("message-request", data);
    }

    /**
     * 监听被动的消息, type默认取方法名
     */
    @listener({type: "GetInit"})
    onGetInit(data: BaseResData){
        this.invoke({
            type: GetInit,
            data: {

            }
        })
    }
});
``` 
- [x] 支持once
  无需实现，实现本身就是每次调用添加回调。
- [x] 支持scope，仅仅支持一个callback响应
- [ ] 支持scope的多个响应
- [ ] 重写统计，独立出来
- [ ] 分离callbacks的存储，支持ES5
