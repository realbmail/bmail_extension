//
//  FileRow.swift
//  BMailApp
//
//  Created by wesley on 2025/2/11.
//
import SwiftUI

enum FileRowError: Error, LocalizedError {
        case invalidFileName(String)
        case fileNotFound(String)
        case readingFileFailed(String)
        
        var errorDescription: String? {
                switch self {
                case .invalidFileName(let message):
                        return "无法提取文件ID：\(message)"
                case .fileNotFound(let path):
                        return "文件不存在：\(path)"
                case .readingFileFailed(let message):
                        return "读取文件内容失败：\(message)"
                }
        }
}

struct FileRow: View {
        @State private var showAlert = false
        @State private var alertMessage = ""
        @EnvironmentObject var walletStore: WalletDataStore
        
        let fileURL: URL
        var isSelected: Bool
        
        var iconImage: Image {
                let fileExtension = fileURL.pathExtension.lowercased()
                if fileExtension.hasSuffix("_bmail") {
                        // 使用 "logo" 作为图标
                        return Image("logo")
                }
                switch fileExtension {
                case "pdf":
                        return Image(systemName: "doc.richtext")
                case "jpg", "jpeg", "png":
                        return Image(systemName: "photo")
                default:
                        return Image(systemName: "doc")
                }
        }
        
        var body: some View {
                HStack {
                        iconImage
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 16, height: 16)
                        Text(fileURL.lastPathComponent)
                                .lineLimit(1)
                                .truncationMode(.tail)
                        Spacer()
                }
                .padding(4)
                .background(isSelected ? Color.blue.opacity(0.3) : Color.clear)
                .contentShape(Rectangle())
                .contextMenu {
                        Button(action: {
                                decryptBmailFile()
                        }) {
                                Label("解密文件", systemImage: "doc.text")
                        }
                        
                        Button(action: {
                                do {
                                        try FileManager.default.removeItem(at: fileURL)
                                        print("删除成功：\(fileURL.path)")
                                        NotificationCenter.default.post(name: Notification.Name("RefreshFileList"), object: nil)
                                } catch {
                                        print("删除失败：\(error.localizedDescription)")
                                }
                        }) {
                                Label("删除", systemImage: "trash")
                        }
                }
                .alert(isPresented: $showAlert) {
                        Alert(title: Text("错误"), message: Text(alertMessage), dismissButton: .default(Text("确定")))
                }
        }
        
        private func decryptBmailFile() {
                do {
                        let extractedID = try extractIDFromFileName(fileURL: fileURL)
                        NSLog("------>>> 提取到的ID：\(extractedID)")
                        
                        // 调用新的封装函数读取文件内容
                        let fileContent = try readFileContent(extractedID: extractedID)
                        NSLog("------>>> 文件内容：\(fileContent)")
                        
                        // 后续可以对 fileContent 进行处理
                        
                } catch {
                        alertMessage = "解密过程中出现错误：\(error.localizedDescription)"
                        showAlert = true
                }
        }
}


func extractIDFromFileName(fileURL: URL) throws -> String {
        let fileName = fileURL.lastPathComponent
        // 正则表达式匹配形如 "bitcoin.pdf.1732846845512_bmail" 中的 "1732846845512"
        let pattern = #"(\d+)_bmail"#
        
        do {
                let regex = try NSRegularExpression(pattern: pattern)
                let range = NSRange(fileName.startIndex..<fileName.endIndex, in: fileName)
                if let match = regex.firstMatch(in: fileName, options: [], range: range),
                   let numberRange = Range(match.range(at: 1), in: fileName) {
                        let numberString = String(fileName[numberRange])
                        return numberString
                } else {
                        throw FileRowError.invalidFileName("文件名格式不符合预期：\(fileName)")
                }
        } catch {
                throw FileRowError.invalidFileName("正则表达式错误：\(error.localizedDescription)")
        }
}

func readFileContent(extractedID: String) throws -> String {
        let appDataDir = try createAppDataDirectory()
        let targetFileURL = appDataDir.appendingPathComponent("." + extractedID)
        
        let fileManager = FileManager.default
        if !fileManager.fileExists(atPath: targetFileURL.path) {
                throw FileRowError.fileNotFound(targetFileURL.path)
        }
        
        do {
                return try String(contentsOf: targetFileURL, encoding: .utf8)
        } catch {
                throw FileRowError.readingFileFailed("无法读取文件内容：\(error.localizedDescription)")
        }
}

struct KeyAddress: Codable {
        let key: String
        let address: String
}

private let LocalAppNonce = "40981a5dc01567a287e10214c4b17f428bdb308b4dc3a968"

func parseKey(from json: String) throws {
        guard let data = json.data(using: .utf8) else {
                throw NSError(domain: "parseKey", code: 0, userInfo: [NSLocalizedDescriptionKey: "无法将字符串转换为 Data"])
        }
        
        let decoder = JSONDecoder()
        let keyAddress = try decoder.decode(KeyAddress.self, from: data)
        
        // 示例：记录解析结果，后续可在这里增加更多逻辑
        NSLog("------>>> 解析到的 key: \(keyAddress.key)")
        NSLog("------>>> 解析到的 address: \(keyAddress.address)")
        let noce = try decodeHex(LocalAppNonce)
        NSLog("------>>> 解析到的 noce: \(noce)")
        
        // 在此处继续增加其他逻辑...
}
