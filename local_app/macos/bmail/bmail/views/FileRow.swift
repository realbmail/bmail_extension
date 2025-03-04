//
//  FileRow.swift
//  BMailApp
//
//  Created by wesley on 2025/2/11.
//
import SwiftUI
import CryptoKit
let BmailFileSuffix = "_bmail"
enum FileRowError: Error, LocalizedError {
        case invalidFileName(String)
        case fileNotFound(String)
        case readingFileFailed(String)
        
        var errorDescription: String? {
                switch self {
                case .invalidFileName(let message):
                        return "no file id found：\(message)"
                case .fileNotFound(let path):
                        return "file not found：\(path)"
                case .readingFileFailed(let message):
                        return "read file failed：\(message)"
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
                if fileExtension.hasSuffix(BmailFileSuffix) {
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
                                .frame(width: 32, height: 32)
                        
                        
                        Text(fileURL.lastPathComponent)
                                .lineLimit(1)
                                .truncationMode(.tail)
                                .font(.system(size: 14))
                                .foregroundColor(.black)
                        Spacer()
                }
                .frame(height: 64)
                .padding(.horizontal, 12)
                .background(
                        ZStack {
                                if isSelected {
                                        RoundedRectangle(cornerRadius: 8)
                                                .fill(Color(red: 255/255, green: 239/255, blue: 231/255))
                                } else {
                                        RoundedRectangle(cornerRadius: 8)
                                                .fill(Color.white)
                                                .overlay(
                                                        RoundedRectangle(cornerRadius: 8)
                                                                .stroke(Color(red: 238/255, green: 240/255, blue: 241/255), lineWidth: 1)
                                                )
                                }
                        }
                )
                .contentShape(Rectangle())
                .onTapGesture(count: 2) { openOrDecryptFile()}
                .contextMenu {
                        
                        Button(action: {
                                showInFinder()
                        }) {
                                Label("Show In Finder", systemImage: "folder")
                        }
                        
                        let fileExtension = fileURL.pathExtension.lowercased()
                        if fileExtension.hasSuffix(BmailFileSuffix) {
                                Button(action: {
                                        decryptBmailFile()
                                }) {
                                        Label("Decrypt", systemImage: "doc.text")
                                }
                        }else{
                                Button(action: {
                                        NSWorkspace.shared .open(fileURL)
                                }) {
                                        Label("Open", systemImage: "doc.text")
                                }
                        }
                        
                        Button(action: {
                                do {
                                        try FileManager.default.removeItem(at: fileURL)
                                        //                                        NSLog("------>>> 删除成功：\(fileURL.path)")
                                        NotificationCenter.default.post(name: Notification.Name("RefreshFileList"), object: nil)
                                } catch {
                                        NSLog("------>>> 删除失败：\(error.localizedDescription)")
                                }
                        }) {
                                Label("Delete", systemImage: "trash")
                        }
                }
                .alert(isPresented: $showAlert) {
                        Alert(title: Text("Error"), message: Text(alertMessage), dismissButton: .default(Text("OK")))
                }
        }
        
        private func decryptBmailFile() {
                
                guard let priKey = walletStore.walletData?.curvePriKey else {
                        alertMessage = "Decrypt wallet please"
                        showAlert = true
                        return;
                }
                
                do {
                        guard let extractedID = try extractIDFromFileName(fileURL: fileURL) else{
                                alertMessage = "This is not a Bmail file"
                                showAlert = true
                                return;
                        }
                        
                        let fileContent = try readFileContent(extractedID: extractedID)
                        let bmailKey = try parseKey(from: fileContent,priKey:priKey)
                        
                        let bmailFileData = try Data(contentsOf: fileURL)
                        let decryptFileUrl = convertURLIfNeeded(originalURL: fileURL)
                        let uniqueURL = uniqueFileURL(for: decryptFileUrl)
                        
                        let decryptBmailKey = try decryptWithTweetNacl(cipherData: bmailFileData,
                                                                       nonce: bmailKey.nonce, key: bmailKey.key)
                        
                        try Data(decryptBmailKey).write(to: uniqueURL)
                        
                        DistributedNotificationCenter.default().post(name: Notification.Name("FileMovedNotification"),
                                                                     object: nil,
                                                                     userInfo: ["path": decryptFileUrl.path])
                        
                } catch {
                        alertMessage = "Decrypt Error：\(error.localizedDescription)"
                        showAlert = true
                }
        }
        
        func openOrDecryptFile(){
                let fileExtension = fileURL.pathExtension.lowercased()
                if fileExtension.hasSuffix(BmailFileSuffix) {
                        decryptBmailFile()
                }else{
                        NSWorkspace.shared .open(fileURL)
                }
        }
        
        func showInFinder(){
                NSLog("------>>> 需要打开的文件: \(fileURL.path)")
                
                if !FileManager.default.fileExists(atPath: fileURL.path) {
                        NSLog("文件不存在: \(fileURL.path)")
                        return
                }
                
                DispatchQueue.main.async {
                        NSWorkspace.shared.activateFileViewerSelecting([fileURL])
                }
        }
}


func extractIDFromFileName(fileURL: URL) throws -> String? {
        let fileName = fileURL.lastPathComponent
        let pattern = #"(\d+)_bmail"#
        
        let regex = try NSRegularExpression(pattern: pattern)
        let range = NSRange(fileName.startIndex..<fileName.endIndex, in: fileName)
        if let match = regex.firstMatch(in: fileName, options: [], range: range),
           let numberRange = Range(match.range(at: 1), in: fileName) {
                return String(fileName[numberRange])
        }
        
        return nil
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
                throw FileRowError.readingFileFailed("Read file Content Error：\(error.localizedDescription)")
        }
}

struct KeyAddress: Codable {
        let key: String
        let address: String
}

func scalarMult(priKey: [UInt8], curvePub: [UInt8]) throws -> [UInt8] {
        
        let privateKey = try Curve25519.KeyAgreement.PrivateKey(rawRepresentation: Data(priKey))
        let publicKey = try Curve25519.KeyAgreement.PublicKey(rawRepresentation: Data(curvePub))
        
        let sharedSecret = try privateKey.sharedSecretFromKeyAgreement(with: publicKey)
        
        return Array(sharedSecret.withUnsafeBytes { Data($0) })
}

private let LocalAppNonce = "40981a5dc01567a287e10214c4b17f428bdb308b4dc3a968"

func parseKey(from json: String, priKey:[UInt8]) throws ->AttachmentEncryptKey{
        guard let data = json.data(using: .utf8) else {
                throw NSError(domain: "parseKey", code: 0, userInfo: [NSLocalizedDescriptionKey: "无法将字符串转换为 Data"])
        }
        
        let decoder = JSONDecoder()
        let keyAddress = try decoder.decode(KeyAddress.self, from: data)
        
        let noce = try decodeHex(LocalAppNonce)
        let curvePub = try decodeHex(keyAddress.address)
        let cipherData = try decodeHex(keyAddress.key)
        
        let sharedKey = try scalarMult(priKey: priKey, curvePub: curvePub)
        
        let decryptBmailKey = try decryptWithTweetNacl(cipherData: Data(cipherData), nonce: noce, key: sharedKey)
        let bmailKeyStr = logDecryptedKey(from: decryptBmailKey)
        
        let bmailKey = try AttachmentEncryptKey.fromJson(bmailKeyStr)
        return bmailKey
}

func logDecryptedKey(from keyBytes: [UInt8]) -> String {
        let keyData = Data(keyBytes)
        
        if let keyString = String(data: keyData, encoding: .utf8) {
                return keyString
        } else {
                let hexString = keyBytes.map { String(format: "%02x", $0) }.joined()
                return hexString
        }
}

func convertURLIfNeeded(originalURL: URL) -> URL {
        let fileExtension = originalURL.pathExtension
        if fileExtension.hasSuffix(BmailFileSuffix) {
                return originalURL.deletingPathExtension()
        } else {
                return originalURL
        }
}

func uniqueFileURL(for originalURL: URL) -> URL {
        let fileManager = FileManager.default
        var fileURL = originalURL
        var count = 1
        
        let directory = originalURL.deletingLastPathComponent()
        let baseName = originalURL.deletingPathExtension().lastPathComponent
        let ext = originalURL.pathExtension
        
        while fileManager.fileExists(atPath: fileURL.path) {
                let newName = "\(baseName)(\(count))"
                fileURL = directory.appendingPathComponent(newName).appendingPathExtension(ext)
                count += 1
        }
        return fileURL
}
