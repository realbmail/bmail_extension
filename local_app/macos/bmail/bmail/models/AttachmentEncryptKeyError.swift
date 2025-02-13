//
//  AttachmentEncryptKeyError.swift
//  BMailApp
//
//  Created by wesley on 2025/2/13.
//


import Foundation

enum AttachmentEncryptKeyError: Error, LocalizedError {
        case invalidFormat(String)
        case insufficientData(required: Int, actual: Int)
        
        var errorDescription: String? {
                switch self {
                case .invalidFormat(let message):
                        return message
                case .insufficientData(let required, let actual):
                        return "Insufficient data: required \(required) bytes but got \(actual)."
                }
        }
}

struct AttachmentEncryptKey {
        let id: String
        let key: [UInt8]
        let nonce: [UInt8]
        
        /// 从 JSON 格式字符串构造 AttachmentEncryptKey 对象
        /// - Parameter aekStr: 格式为 "id_hexData"，其中 hexData 是经过 hex 编码后的二进制数据
        /// - Throws: 如果输入格式无效或数据不足，则抛出错误
        static func fromJson(_ aekStr: String) throws -> AttachmentEncryptKey {
                // 查找下划线的位置
                guard let underscoreIndex = aekStr.firstIndex(of: "_") else {
                        throw AttachmentEncryptKeyError.invalidFormat("Invalid input string format.")
                }
                
                // id 为下划线前的部分，hexData 为下划线后面的部分
                let id = String(aekStr[..<underscoreIndex])
                let hexData = String(aekStr[aekStr.index(after: underscoreIndex)...])
                
                // 解析 hex 编码后的数据
                let combined = try decodeHex(hexData)
                
                // 根据 tweetnacl 的常量，keyLength 与 nonceLength 分别为：
                let keyLength = 32  // nacl.box.secretKeyLength
                let nonceLength = 24 // nacl.secretbox.nonceLength
                
                guard combined.count >= keyLength + nonceLength else {
                        throw AttachmentEncryptKeyError.insufficientData(required: keyLength + nonceLength, actual: combined.count)
                }
                
                // 分割 combined 数组
                let key = Array(combined[0..<keyLength])
                let nonce = Array(combined[keyLength..<(keyLength + nonceLength)])
                
                return AttachmentEncryptKey(id: id, key: key, nonce: nonce)
        }
}
