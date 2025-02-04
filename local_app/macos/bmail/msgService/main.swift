import Foundation
import Dispatch

let socketPath = "/tmp/msgservice.socket"

// 删除旧的 socket（如果存在）
unlink(socketPath)

// 创建 socket
let serverSocket = socket(AF_UNIX, SOCK_STREAM, 0)
guard serverSocket >= 0 else {
        fatalError("无法创建 socket")
}

// 绑定 socket
var addr = sockaddr_un()
addr.sun_family = sa_family_t(AF_UNIX)
strncpy(&addr.sun_path.0, socketPath, Int(strlen(socketPath)))

let bindResult = withUnsafePointer(to: &addr) {
        $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                bind(serverSocket, $0, socklen_t(MemoryLayout<sockaddr_un>.size))
        }
}

guard bindResult >= 0 else {
        fatalError("无法绑定 socket")
}

// 监听 socket 连接
listen(serverSocket, 5)
print("msgService 启动，监听 Unix Socket: \(socketPath)")

// 处理 UI 应用的请求
DispatchQueue.global().async {
        while true {
                let clientSocket = accept(serverSocket, nil, nil)
                guard clientSocket >= 0 else {
                        print("接受连接失败")
                        continue
                }
                
                var buffer = [UInt8](repeating: 0, count: 1024)
                let bytesRead = read(clientSocket, &buffer, buffer.count)
                if bytesRead > 0, let message = String(bytes: buffer, encoding: .utf8) {
                        print("收到 UI 请求: \(message)")
                        let response = processUIRequest(message)
                        write(clientSocket, response, response.count)
                }
                
                close(clientSocket)
        }
}

// 维护邮件附件数据
var attachments: [String: String] = [:]

func processUIRequest(_ message: String) -> String {
        if let data = message.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: String],
           let command = json["command"] {
                
                switch command {
                case "list":
                        let jsonData = try! JSONSerialization.data(withJSONObject: attachments, options: .prettyPrinted)
                        return String(data: jsonData, encoding: .utf8) ?? "{}"
                case "delete":
                        if let filename = json["filename"], attachments.removeValue(forKey: filename) != nil {
                                return "{ \"status\": \"success\", \"message\": \"Deleted \(filename)\" }"
                        } else {
                                return "{ \"status\": \"error\", \"message\": \"File not found\" }"
                        }
                default:
                        return "{ \"status\": \"error\", \"message\": \"Unknown command\" }"
                }
        }
        return "{ \"status\": \"error\", \"message\": \"Invalid JSON\" }"
}

// 让进程保持运行
RunLoop.main.run()
