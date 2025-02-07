import Foundation
import AppKit

/// 根据 Native Messaging 协议，从标准输入读取一条消息
func readMessage() -> [String: Any]? {
        let stdin = FileHandle.standardInput
        // 读取前 4 个字节，表示消息长度（小端存储的 UInt32）
        guard let lengthData = try? stdin.read(upToCount: 4), lengthData.count == 4 else {
                return nil
        }
        let messageLength: UInt32 = lengthData.withUnsafeBytes { $0.load(as: UInt32.self) }
        let length = Int(UInt32(littleEndian: messageLength))
        // 读取指定长度的消息数据
        guard let messageData = try? stdin.read(upToCount: length), messageData.count == length else {
                return nil
        }
        do {
                let jsonObject = try JSONSerialization.jsonObject(with: messageData, options: [])
                if let messageDict = jsonObject as? [String: Any] {
                        return messageDict
                }
        } catch {
                print("JSON 解析错误：\(error)")
        }
        return nil
}

/// 按照 Native Messaging 协议格式，将消息写入标准输出
func sendMessage(_ message: [String: Any]) {
        do {
                let jsonData = try JSONSerialization.data(withJSONObject: message, options: [])
                var length = UInt32(jsonData.count).littleEndian
                let lengthData = Data(bytes: &length, count: 4)
                FileHandle.standardOutput.write(lengthData)
                FileHandle.standardOutput.write(jsonData)
        } catch {
                print("消息发送错误：\(error)")
        }
}

/// 尝试打开 UI 应用，返回 true 表示成功，false 表示失败
func openUIApp() -> Bool {
        // 假设 UI 应用的 Bundle Identifier 为 "com.yushian.bmail"
        let appBundleIdentifier = "com.yushian.bmail"
        
        guard let appURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: appBundleIdentifier) else {
                print("未找到 Bundle Identifier 为 \(appBundleIdentifier) 的应用")
                return false
        }
        
        let configuration = NSWorkspace.OpenConfiguration()
        // 使用信号量同步等待异步回调完成
        let semaphore = DispatchSemaphore(value: 0)
        var openSuccess = false
        
        NSWorkspace.shared.openApplication(at: appURL, configuration: configuration) { (app, error) in
                if let error = error {
                        print("打开 UI 应用失败：\(error.localizedDescription)")
                } else {
                        openSuccess = true
                }
                semaphore.signal()
        }
        
        semaphore.wait()
        return openSuccess
}

func main() {
        NSLog("------>>>系统启动完成")
        guard let message = readMessage() else {
                NSLog("------>>>未收到消息或读取消息失败")
                return
        }
        
        NSLog("------>>>收到消息：\(message)")
        
        // 根据命令处理消息
        if let command = message["command"] as? String {
                if command == "openApp" {
                        let success = openUIApp()
                        if success {
                                sendMessage(["status": "success", "info": "UI 应用已打开"])
                        } else {
                                sendMessage(["status": "error", "error": "打开 UI 应用失败"])
                        }
                } else {
                        sendMessage(["status": "error", "error": "未知的命令"])
                }
        } else {
                sendMessage(["status": "error", "error": "消息格式无效"])
        }
        NSLog("------>>>处理完成")
        // 程序处理完消息后退出
}

main()
