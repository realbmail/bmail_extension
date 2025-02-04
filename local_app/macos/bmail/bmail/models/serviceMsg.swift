import Foundation

let socketPath = "/tmp/msgservice.socket"

func sendMessageToService(_ message: String) {
        let clientSocket = socket(AF_UNIX, SOCK_STREAM, 0)
        guard clientSocket >= 0 else {
                print("无法创建 socket 连接")
                return
        }
        
        var addr = sockaddr_un()
        addr.sun_family = sa_family_t(AF_UNIX)
        strncpy(&addr.sun_path.0, socketPath, Int(strlen(socketPath)))
        
        let connectResult = withUnsafePointer(to: &addr) {
                $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                        connect(clientSocket, $0, socklen_t(MemoryLayout<sockaddr_un>.size))
                }
        }
        
        guard connectResult >= 0 else {
                print("无法连接到 msgService")
                close(clientSocket)
                return
        }
        
        let data = message.data(using: .utf8)!
        write(clientSocket, [UInt8](data), data.count)
        
        var buffer = [UInt8](repeating: 0, count: 1024)
        let bytesRead = read(clientSocket, &buffer, buffer.count)
        
        if bytesRead > 0, let response = String(bytes: buffer, encoding: .utf8) {
                print("收到 msgService 响应: \(response)")
        }
        
        close(clientSocket)
}
//
//// 查询邮件附件列表
//sendMessageToService("{\"command\": \"list\"}")
//
//// 删除附件
//sendMessageToService("{\"command\": \"delete\", \"filename\": \"test.pdf\"}")
