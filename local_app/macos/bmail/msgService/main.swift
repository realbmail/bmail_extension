import Foundation
import AppKit

/// 从标准输入读取指定长度的数据
func readData(ofLength length: Int) -> Data? {
        var data = Data()
        while data.count < length {
                // availableData 会阻塞等待输入
                let chunk = FileHandle.standardInput.availableData
                if chunk.count == 0 {
                        // 标准输入已结束
                        return nil
                }
                data.append(chunk)
        }
        return data
}

/// 按 Native Messaging 协议格式读取一条消息
func readMessage() -> [String: Any]? {
        // 读取前 4 字节：消息体的长度（UInt32，小端序）
        guard let lengthData = readData(ofLength: 4), lengthData.count == 4 else {
                return nil
        }
        let length: UInt32 = lengthData.withUnsafeBytes { pointer in
                return pointer.load(as: UInt32.self)
        }
        let messageLength = Int(UInt32(littleEndian: length))
        guard messageLength > 0, let messageData = readData(ofLength: messageLength) else {
                return nil
        }
        
        do {
                let jsonObject = try JSONSerialization.jsonObject(with: messageData, options: [])
                if let messageDict = jsonObject as? [String: Any] {
                        return messageDict
                }
        } catch {
                // JSON 解析失败
                return nil
        }
        
        return nil
}

/// 按 Native Messaging 协议格式发送消息（先写入 4 字节消息长度，再写入 JSON 数据）
func sendMessage(message: [String: Any]) {
        do {
                let data = try JSONSerialization.data(withJSONObject: message, options: [])
                var length = UInt32(data.count).littleEndian
                let lengthData = Data(bytes: &length, count: 4)
                FileHandle.standardOutput.write(lengthData)
                FileHandle.standardOutput.write(data)
        } catch {
                // 序列化错误，不做处理
        }
}

/// 处理收到的消息，根据消息内容执行相应操作
func processMessage(_ message: [String: Any]) {
        // 假设消息格式为 { "message": "start" }
        if let command = message["message"] as? String {
                switch command {
                case "start":
                        // 目标 UI 应用的 Bundle Identifier，请替换为实际值
                        let appBundleIdentifier = "com.yushian.bmail"
                        
                        // 通过 NSWorkspace 获取应用的 URL
                        if let appURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: appBundleIdentifier) {
                                let configuration = NSWorkspace.OpenConfiguration()
                                let semaphore = DispatchSemaphore(value: 0)
                                
                                // 使用推荐 API 启动应用
                                NSWorkspace.shared.openApplication(at: appURL, configuration: configuration) { (app, error) in
                                        if let error = error {
                                                sendMessage(message: ["status": "error",
                                                                      "error": "Failed to launch application: \(error.localizedDescription)"])
                                        } else {
                                                sendMessage(message: ["status": "success",
                                                                      "info": "Application launched"])
                                        }
                                        semaphore.signal()
                                }
                                
                                // 等待异步启动完成
                                semaphore.wait()
                        } else {
                                sendMessage(message: ["status": "error",
                                                      "error": "Could not locate application with bundle id \(appBundleIdentifier)"])
                        }
                        
                default:
                        sendMessage(message: ["status": "error",
                                              "error": "Unknown command"])
                }
        } else {
                sendMessage(message: ["status": "error",
                                      "error": "Invalid message format"])
        }
}

// 主循环：不断读取消息，直到标准输入结束
while true {
        if let message = readMessage() {
                processMessage(message)
        } else {
                break
        }
}
