//
//  FileRow.swift
//  BMailApp
//
//  Created by wesley on 2025/2/11.
//
import SwiftUI

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
        
        private func decryptBmailFile(){
                
                guard let extractedID = extractIDFromFileName(fileURL: fileURL) else {
                        alertMessage = "无法提取文件 ID。"
                        showAlert = true
                        return
                }
                
                
                do{
                        NSLog("------>>> 提取到的ID：\(extractedID)")
                        let appDataDir = try createAppDataDirectory()
                        let fileUrl = appDataDir.appendingPathComponent("." + extractedID)
                        
                        let fileManager = FileManager.default
                        if !fileManager.fileExists(atPath: fileUrl.path){
                                alertMessage = "文件不存在：\(fileUrl.path)"
                                showAlert = true
                                return
                        }
                        
                        let fileContent = try String(contentsOf: fileUrl, encoding: .utf8)
                        NSLog("------>>> 文件内容：\(fileContent)")
                        
                }catch{
                        alertMessage = "解密过程中出现错误：\(error.localizedDescription)"
                        showAlert = true
                }
        }
}


func extractIDFromFileName(fileURL: URL) -> String? {
        // 获取文件名，例如 "bitcoin.pdf.1732846845512_bmail"
        let fileName = fileURL.lastPathComponent
        // 定义正则表达式，匹配以数字结尾并紧跟 "_bmail" 的部分
        let pattern = #"(\d+)_bmail"#
        
        do {
                let regex = try NSRegularExpression(pattern: pattern, options: [])
                let range = NSRange(fileName.startIndex..<fileName.endIndex, in: fileName)
                if let match = regex.firstMatch(in: fileName, options: [], range: range),
                   let numberRange = Range(match.range(at: 1), in: fileName) {
                        let numberString = String(fileName[numberRange])
                        return numberString
                }
        } catch {
                NSLog("------>>> 正则表达式错误：\(error)")
        }
        return nil
}
