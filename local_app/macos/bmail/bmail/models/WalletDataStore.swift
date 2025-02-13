//
//  WalletDataStore.swift
//  BMailApp
//
//  Created by wesley on 2025/2/12.
//


import SwiftUI
import Combine
import CryptoSwift

enum WalletError: LocalizedError {
        case walletNotLoaded
        case decryptionFailed(error: Error)
        
        var errorDescription: String? {
                switch self {
                case .walletNotLoaded:
                        return "钱包数据尚未加载。"
                case .decryptionFailed(let error):
                        return "解锁钱包时出错：\(error.localizedDescription)"
                }
        }
}

class WalletDataStore: ObservableObject {
        @Published var walletData: WalletData?
        
        /// 异步加载钱包数据
        func loadWalletData() {
                DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                        do {
                                let data = try loadBmailWallet()
                                // 切换回主线程更新 UI
                                DispatchQueue.main.async {
                                        self?.walletData = data
                                }
                        } catch {
                                // 这里可以添加更完善的错误处理逻辑
                                NSLog("----->>> 加载钱包数据失败: \(error)")
                        }
                }
        }
        
        func unlockWallet(with password: String) throws {
                // 确保钱包数据已加载
                guard var currentWallet = walletData else {
                        throw WalletError.walletNotLoaded
                }
                
                do {
                        // 调用解密函数，解密得到私钥字节数组
                        let decryptedKey = try Decrypt(pwd: password, cipherData: currentWallet.cipherData)
                        currentWallet.priKey = decryptedKey
                        // 更新 Published 属性，通知界面刷新
                        DispatchQueue.main.async {
                                self.walletData = currentWallet
                        }
                } catch {
                        throw WalletError.decryptionFailed(error: error)
                }
        }
        
}


func decodeHex(_ hex: String) throws -> [UInt8] {
        guard hex.count % 2 == 0 else {
                throw NSError(domain: "HexError", code: 0, userInfo: [NSLocalizedDescriptionKey: "Hex string must have an even length"])
        }
        var bytes = [UInt8]()
        var index = hex.startIndex
        while index < hex.endIndex {
                let nextIndex = hex.index(index, offsetBy: 2)
                let byteString = hex[index..<nextIndex]
                guard let byte = UInt8(byteString, radix: 16) else {
                        throw NSError(domain: "HexError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid hex string"])
                }
                bytes.append(byte)
                index = nextIndex
        }
        return bytes
}

func Decrypt(pwd: String, cipherData: CipherData) throws -> [UInt8]  {
        
        // 将 salt、iv、cipher_txt 转换为字节数组
        let saltBytes = try decodeHex(cipherData.salt)
        let ivBytes = try decodeHex(cipherData.iv)
        let cipherBytes = try decodeHex(cipherData.cipherTxt)
        
        let passwordBytes = Array(pwd.utf8)
        
        let derivedKey = try CryptoSwift.PKCS5.PBKDF2(
                password: passwordBytes,
                salt: saltBytes,
                iterations: cipherData.iterations,
                keyLength: cipherData.keySize * 4, // 将 keySize 从“字”转换为字节
                variant: CryptoSwift.HMAC.Variant.sha2(.sha256)
        ).calculate()
        
        // 使用 AES 解密，采用 CFB 模式，无填充（使用 CryptoSwift.Padding.noPadding）
        let aes = try AES(key: derivedKey, blockMode: CFB(iv: ivBytes), padding: .pkcs7)
        let decryptedBytes = try aes.decrypt(cipherBytes)
        // 将解密后的数据转换为 UTF-8 字符串，假设结果为一个十六进制字符串
        guard let decryptedHexString = String(data: Data(decryptedBytes), encoding: .utf8) else {
                throw NSError(domain: "DecryptError", code: 0, userInfo: [NSLocalizedDescriptionKey: "Unable to decode decrypted data as UTF-8"])
        }
        
        // 将解密后的十六进制字符串转换为字节数组（这一步是模仿 TS 代码中 decodeHex 的调用）
        let privateKeyBytes = try decodeHex(decryptedHexString)
        
        return privateKeyBytes
}
