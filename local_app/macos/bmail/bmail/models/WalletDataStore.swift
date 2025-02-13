//
//  WalletDataStore.swift
//  BMailApp
//
//  Created by wesley on 2025/2/12.
//


import SwiftUI
import Combine
import CryptoKit
import CryptoSwift
import TweetNacl

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
                        currentWallet.curvePriKey = ed2CurvePri(privateKey: decryptedKey)
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
        let priRaw = try decodeHex(decryptedHexString)
        
        let keyPair = try ed25519KeyPair(from: priRaw)
        
        return keyPair.privateKey
}


func ed2CurvePri(privateKey: [UInt8]) -> [UInt8] {
        // 取私钥的前32字节
        let input = Data(privateKey.prefix(32))
        // 计算 SHA-512 哈希，结果为 64 字节
        let hash = SHA512.hash(data: input)
        var digest = Array(hash) // 转换为 [UInt8]
        
        // 按照 TS 代码中的逻辑，对第 0 和第 31 字节进行 bit-level clamping
        digest[0] &= 0b11111000         // 等同于 digest[0] &= 248
        digest[31] &= 0b01111111        // 等同于 digest[31] &= 127
        digest[31] |= 0b01000000        // 等同于 digest[31] |= 64
        
        // 返回前32字节作为 Curve25519 私钥
        return Array(digest.prefix(32))
}

func ed25519KeyPair(from seed: [UInt8]) throws -> (privateKey: [UInt8], publicKey: [UInt8]) {
        let seedData = Data(seed)
        
        // 使用 CryptoKit 生成 Ed25519 密钥对。
        // 注意：CryptoKit 中生成 Ed25519 密钥对目前需要使用 `Curve25519.Signing.PrivateKey`，
        // 其 rawRepresentation 对应的是 64 字节私钥（前32字节为种子，后32字节为派生的公钥）。
        let privateKey = try Curve25519.Signing.PrivateKey(rawRepresentation: seedData)
        let publicKey = privateKey.publicKey
        
        return (privateKey: [UInt8](privateKey.rawRepresentation),
                publicKey: [UInt8](publicKey.rawRepresentation))
}

func encryptWithTweetNacl(messageBytes: [UInt8], nonce: [UInt8], key: [UInt8]) throws -> [UInt8] {
        // 将 [UInt8] 转换为 Data
        let messageData = Data(messageBytes)
        let nonceData = Data(nonce)
        let keyData = Data(key)
        
        // 这里使用 try 调用可能抛出错误的 API
        let encryptedData = try NaclSecretBox.secretBox(message: messageData, nonce: nonceData, key: keyData)
        
        // 返回加密后的数据转换为 [UInt8]
        return [UInt8](encryptedData)
}

func decryptWithTweetNacl(cipherData: Data, nonce: [UInt8], key: [UInt8]) throws -> [UInt8] {
        // 将 [UInt8] 转换为 Data
//        let cipherData = Data(cipherBytes)
        let nonceData = Data(nonce)
        let keyData = Data(key)
        
        // 使用 try 调用解密 API，若认证失败或其它错误将会抛出异常
        let decryptedData = try NaclSecretBox.open(box: cipherData, nonce: nonceData, key: keyData)
        
        // 返回解密后的数据转换为 [UInt8]
        return [UInt8](decryptedData)
}
