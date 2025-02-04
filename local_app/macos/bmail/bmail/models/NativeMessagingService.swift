//
//  NativeMessagingService.swift
//  bmail
//
//  Created by wesley on 2025/2/4.
//

import Foundation
import Combine

class NativeMessagingService: ObservableObject {
        // 发布属性，用于更新 UI
        @Published var receivedMessage: String = ""
        
        func startListening() {
                DispatchQueue.global().async {
                        let stdin = FileHandle.standardInput
                        let stdout = FileHandle.standardOutput
                        
                        while true {
                                // 读取消息长度（4字节大端序）
                                let headerData = stdin.readData(ofLength: 4)
                                guard headerData.count == 4 else { break }
                                
                                let length = headerData.withUnsafeBytes {
                                        $0.load(as: UInt32.self).bigEndian
                                }
                                
                                // 读取消息体
                                let messageData = stdin.readData(ofLength: Int(length))
                                self.processMessage(data: messageData, stdout: stdout)
                        }
                }
        }
        
        private func processMessage(data: Data, stdout: FileHandle) {
                guard let message = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let action = message["action"] as? String else {
                        sendResponse(["status": "error"], stdout: stdout)
                        return
                }
                
                // 处理消息
                let response: [String: Any]
                switch action {
                case "process":
                        response = ["status": "success", "message": "文件已处理"]
                default:
                        response = ["status": "error", "message": "未知操作"]
                }
                
                // 更新 UI
                DispatchQueue.main.async {
                        self.receivedMessage = "收到消息：\(action)"
                }
                
                sendResponse(response, stdout: stdout)
        }
        
        private func sendResponse(_ response: [String: Any], stdout: FileHandle) {
                guard let jsonData = try? JSONSerialization.data(withJSONObject: response) else { return }
                
                var header = UInt32(jsonData.count).bigEndian
                let headerData = Data(bytes: &header, count: 4)
                
                stdout.write(headerData)
                stdout.write(jsonData)
        }
}
