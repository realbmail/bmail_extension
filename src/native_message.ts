// 在扩展中新增消息发送逻辑

// 定义消息接口
import {sessionGet} from "./session_storage";
import browser from "webextension-polyfill";

interface NativeMessage {
    action: string;
    data?: any;
}

// 发送存储数据到本地应用
export async function sendStorageToApp() {
    try {
        // 从存储中读取数据（示例：读取 key 为 "userData" 的数据）
        const userData = await sessionGet("userData");

        // 连接本地应用
        const port = browser.runtime.connectNative("com.yushian.bmail");

        // 发送消息
        const message: NativeMessage = {
            action: "syncStorage",
            data: userData
        };
        port.postMessage(message);

        // 监听响应
        port.onMessage.addListener((response) => {
            if (response.status === "success") {
                console.log("数据同步成功");
            }
        });

    } catch (error) {
        console.error("数据发送失败:", error);
    }
}